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
    iat: now,
    exp: now + 3600,
  }
  const encode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const headerB64 = encode(header)
  const claimB64 = encode(claim)
  const signingInput = `${headerB64}.${claimB64}`

  const pemKey = serviceAccount.private_key
  const pemContents = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const encoder = new TextEncoder()
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(signingInput)
  )
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const jwt = `${signingInput}.${signatureB64}`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

async function enviarPush(token: string, titulo: string, cuerpo: string, accessToken: string) {
  if (!token) return
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`
  await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: titulo, body: cuerpo },
        webpush: {
          notification: { icon: 'https://chamba-delta.vercel.app/icons/icon-192x192.png' },
          fcm_options: { link: 'https://chamba-delta.vercel.app' }
        }
      }
    })
  })
}

async function guardarNotificacion(
  supabase: any,
  usuarioId: string,
  titulo: string,
  cuerpo: string,
  trabajoId: string
) {
  await supabase.from('notificaciones').insert({
    usuario_id: usuarioId,
    titulo,
    cuerpo,
    tipo: 'recordatorio',
    trabajo_id: trabajoId,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!
    const serviceAccount = JSON.parse(serviceAccountStr)
    const accessToken = await getAccessToken(serviceAccount)

    const ahora = new Date()
    let enviados = 0

    // Buscar trabajos aceptados con cita, que NO hayan recibido ya los recordatorios
    const { data: trabajos } = await supabase
      .from('trabajos')
      .select('id, categoria, fecha_cita, hora_cita, cliente_id, trabajador_id, recordatorio_24h_enviado, recordatorio_1h_enviado')
      .eq('status', 'aceptado')
      .not('fecha_cita', 'is', null)
      .not('hora_cita', 'is', null)

    if (!trabajos || trabajos.length === 0) {
      return new Response(JSON.stringify({ ok: true, enviados: 0, mensaje: 'Sin trabajos con cita' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    for (const trabajo of trabajos) {
      const citaDateTime = new Date(`${trabajo.fecha_cita}T${trabajo.hora_cita}`)
      const diffMs = citaDateTime.getTime() - ahora.getTime()
      const diffHoras = diffMs / (1000 * 60 * 60)

      // Obtener tokens FCM
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, fcm_token')
        .in('id', [trabajo.cliente_id, trabajo.trabajador_id].filter(Boolean))

      const cliente = usuarios?.find((u: any) => u.id === trabajo.cliente_id)
      const trabajador = usuarios?.find((u: any) => u.id === trabajo.trabajador_id)

      // ── Recordatorio 24 hrs antes (ventana: 23-25 hrs) ──
      if (diffHoras >= 23 && diffHoras <= 25 && !trabajo.recordatorio_24h_enviado) {
        const titulo = `📅 Cita mañana — ${trabajo.categoria}`
        const cuerpoCliente = `Mañana a las ${trabajo.hora_cita?.slice(0,5)} hrs tienes tu ${trabajo.categoria}. ¡Asegúrate de estar en casa!`
        const cuerpoTrabajador = `Mañana a las ${trabajo.hora_cita?.slice(0,5)} hrs tienes el trabajo de ${trabajo.categoria}. ¡Prepárate!`

        if (cliente?.fcm_token) await enviarPush(cliente.fcm_token, titulo, cuerpoCliente, accessToken)
        if (trabajador?.fcm_token) await enviarPush(trabajador.fcm_token, titulo, cuerpoTrabajador, accessToken)
        if (trabajo.cliente_id) await guardarNotificacion(supabase, trabajo.cliente_id, titulo, cuerpoCliente, trabajo.id)
        if (trabajo.trabajador_id) await guardarNotificacion(supabase, trabajo.trabajador_id, titulo, cuerpoTrabajador, trabajo.id)

        // Marcar como enviado para no repetir
        await supabase.from('trabajos')
          .update({ recordatorio_24h_enviado: true })
          .eq('id', trabajo.id)

        enviados += 2
        console.log(`Recordatorio 24hrs enviado: trabajo ${trabajo.id}`)
      }

      // ── Recordatorio 1 hr antes (ventana: 50-70 min) ──
      if (diffHoras >= 0.83 && diffHoras <= 1.17 && !trabajo.recordatorio_1h_enviado) {
        const titulo = `⏰ En 1 hora — ${trabajo.categoria}`
        const cuerpoCliente = `En aprox. 1 hora llegará el trabajador para tu ${trabajo.categoria}. ¡Prepárate!`
        const cuerpoTrabajador = `En aprox. 1 hora es tu cita de ${trabajo.categoria}. ¡Ya es hora de salir!`

        if (cliente?.fcm_token) await enviarPush(cliente.fcm_token, titulo, cuerpoCliente, accessToken)
        if (trabajador?.fcm_token) await enviarPush(trabajador.fcm_token, titulo, cuerpoTrabajador, accessToken)
        if (trabajo.cliente_id) await guardarNotificacion(supabase, trabajo.cliente_id, titulo, cuerpoCliente, trabajo.id)
        if (trabajo.trabajador_id) await guardarNotificacion(supabase, trabajo.trabajador_id, titulo, cuerpoTrabajador, trabajo.id)

        // Marcar como enviado
        await supabase.from('trabajos')
          .update({ recordatorio_1h_enviado: true })
          .eq('id', trabajo.id)

        enviados += 2
        console.log(`Recordatorio 1hr enviado: trabajo ${trabajo.id}`)
      }
    }

    return new Response(JSON.stringify({ ok: true, enviados, trabajosRevisados: trabajos.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})