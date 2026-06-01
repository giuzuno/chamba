import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PROJECT_ID = 'chamba-72295'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }
  const encode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const headerB64 = encode(header)
  const claimB64 = encode(claim)
  const signingInput = `${headerB64}.${claimB64}`
  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const jwt = `${signingInput}.${signatureB64}`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  return (await tokenRes.json()).access_token
}

async function enviarPush(token: string, titulo: string, cuerpo: string, accessToken: string) {
  if (!token) return
  await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: titulo, body: cuerpo },
        webpush: { fcm_options: { link: 'https://chamba-delta.vercel.app' } }
      }
    })
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!)
    const accessToken = await getAccessToken(serviceAccount)

    const ahora = new Date()
    const limite = new Date(ahora.getTime() - 30 * 60 * 1000).toISOString()

    const { data: trabajos } = await supabase
      .from('trabajos')
      .select('id, categoria, precio_acordado, presupuesto, cliente_id, trabajador_id')
      .eq('status', 'en_revision')
      .not('en_revision_desde', 'is', null)
      .lt('en_revision_desde', limite)

    if (!trabajos || trabajos.length === 0) {
      return new Response(JSON.stringify({ ok: true, completados: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let completados = 0

    for (const trabajo of trabajos) {
      await supabase.from('trabajos').update({ status: 'completado' }).eq('id', trabajo.id)

      const precio = trabajo.precio_acordado || trabajo.presupuesto

      const { data: usuarios } = await supabase
        .from('usuarios').select('id, fcm_token')
        .in('id', [trabajo.cliente_id, trabajo.trabajador_id].filter(Boolean))

      const cliente = usuarios?.find((u: any) => u.id === trabajo.cliente_id)
      const trabajador = usuarios?.find((u: any) => u.id === trabajo.trabajador_id)

      const tituloTrabajador = '💰 ¡Pago liberado automáticamente!'
      const cuerpoTrabajador = `Se confirmó automáticamente tu ${trabajo.categoria}. $${precio} MXN liberados.`
      if (trabajador?.fcm_token) await enviarPush(trabajador.fcm_token, tituloTrabajador, cuerpoTrabajador, accessToken)
      if (trabajo.trabajador_id) {
        await supabase.from('notificaciones').insert({
          usuario_id: trabajo.trabajador_id, titulo: tituloTrabajador,
          cuerpo: cuerpoTrabajador, tipo: 'pago_liberado', trabajo_id: trabajo.id,
        })
      }

      const tituloCliente = '🏁 Pago confirmado automáticamente'
      const cuerpoCliente = `Tu ${trabajo.categoria} fue confirmado automáticamente después de 30 min. $${precio} MXN liberados al trabajador.`
      if (cliente?.fcm_token) await enviarPush(cliente.fcm_token, tituloCliente, cuerpoCliente, accessToken)
      if (trabajo.cliente_id) {
        await supabase.from('notificaciones').insert({
          usuario_id: trabajo.cliente_id, titulo: tituloCliente,
          cuerpo: cuerpoCliente, tipo: 'general', trabajo_id: trabajo.id,
        })
      }

      completados++
      console.log(`Auto-completado trabajo ${trabajo.id}`)
    }

    return new Response(JSON.stringify({ ok: true, completados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})