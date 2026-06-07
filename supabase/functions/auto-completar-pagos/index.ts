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

async function notificar(supabase: any, usuarioId: string, titulo: string, cuerpo: string, tipo: string, trabajoId: string, fcmToken: string | null, accessToken: string) {
  await supabase.from('notificaciones').insert({ usuario_id: usuarioId, titulo, cuerpo, tipo, trabajo_id: trabajoId })
  if (fcmToken) await enviarPush(fcmToken, titulo, cuerpo, accessToken)
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

    let completados = 0
    let cancelados = 0

    // ── 1. AUTO-COMPLETAR pagos en revision > 24 hrs ──
    // Si el cliente no confirma ni disputa en 24hrs → pago se libera automáticamente
    const limite24hrs = new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const limite20hrs = new Date(ahora.getTime() - 20 * 60 * 60 * 1000).toISOString()

    // Avisar al cliente a las 20hrs que le quedan 4hrs para disputar
    const { data: porVencer } = await supabase
      .from('trabajos')
      .select('id, categoria, cliente_id, trabajador_id, aviso_24hrs_enviado')
      .eq('status', 'en_revision')
      .not('en_revision_desde', 'is', null)
      .lt('en_revision_desde', limite20hrs)
      .gt('en_revision_desde', limite24hrs)

    for (const trabajo of (porVencer || [])) {
      if (!trabajo.aviso_24hrs_enviado) {
        await notificar(supabase, trabajo.cliente_id,
          '⏰ Tienes 4 horas para revisar el trabajo',
          `Si no confirmas ni disputas tu ${trabajo.categoria} en 4 hrs, el pago se liberará automáticamente.`,
          'general', trabajo.id, null, accessToken)
        await supabase.from('trabajos').update({ aviso_24hrs_enviado: true }).eq('id', trabajo.id)
      }
    }

    const { data: enRevision } = await supabase
      .from('trabajos')
      .select('id, categoria, precio_acordado, presupuesto, cliente_id, trabajador_id')
      .eq('status', 'en_revision')
      .not('en_revision_desde', 'is', null)
      .lt('en_revision_desde', limite24hrs)

    for (const trabajo of (enRevision || [])) {
      await supabase.from('trabajos').update({ status: 'completado' }).eq('id', trabajo.id)
      const precio = trabajo.precio_acordado || trabajo.presupuesto

      const { data: usuarios } = await supabase.from('usuarios').select('id, fcm_token')
        .in('id', [trabajo.cliente_id, trabajo.trabajador_id].filter(Boolean))
      const cliente = usuarios?.find((u: any) => u.id === trabajo.cliente_id)
      const trabajador = usuarios?.find((u: any) => u.id === trabajo.trabajador_id)

      if (trabajo.trabajador_id) {
        await notificar(supabase, trabajo.trabajador_id,
          'Pago liberado automaticamente',
          `Se confirmo automaticamente tu ${trabajo.categoria}. $${precio} MXN liberados.`,
          'pago_liberado', trabajo.id, trabajador?.fcm_token || null, accessToken)
      }
      if (trabajo.cliente_id) {
        await notificar(supabase, trabajo.cliente_id,
          'Pago confirmado automaticamente',
          `Tu ${trabajo.categoria} fue confirmado automaticamente despues de 30 min. $${precio} MXN liberados al trabajador.`,
          'general', trabajo.id, cliente?.fcm_token || null, accessToken)
      }
      completados++
    }

    // ── 2. AUTO-CANCELAR trabajos vencidos ──
    // Si pasaron 2 horas de la cita y el trabajador NO marco en camino → cancelar
    const limite2hrs = new Date(ahora.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const hoy = ahora.toISOString().split('T')[0]

    // Solo cancelar trabajos PUBLICADOS (sin trabajador) que ya vencieron
    // Los trabajos ACEPTADOS nunca se cancelan automáticamente
    // Cancelar trabajos publicados hace más de 4 horas sin ser aceptados
    // Usamos creado_en en UTC para evitar problemas de zona horaria
    const hace4hrs = new Date(ahora.getTime() - 4 * 60 * 60 * 1000).toISOString()

    const { data: vencidos } = await supabase
      .from('trabajos')
      .select('id, categoria, precio_acordado, presupuesto, cliente_id, trabajador_id, fecha_cita, hora_cita, es_viaje, trabajador_en_camino, trabajador_llego, trabajo_iniciado, pasajero_subio')
      .eq('status', 'publicado')
      .is('trabajador_id', null)
      .lte('creado_en', hace4hrs)

    for (const trabajo of (vencidos || [])) {
      // NUNCA cancelar si el trabajador ya tomó acción
      if (trabajo.trabajador_en_camino) continue
      if (trabajo.trabajador_llego) continue
      if (trabajo.trabajo_iniciado) continue
      if (trabajo.pasajero_subio) continue

      // Calcular si la cita pasó hace más de X horas
      const citaDateTime = new Date(`${trabajo.fecha_cita}T${trabajo.hora_cita}:00`)
      const diffMs = ahora.getTime() - citaDateTime.getTime()
      const diffHoras = diffMs / (1000 * 60 * 60)

      // Viajes tienen 4 hrs de margen, trabajos normales 2 hrs
      const margen = trabajo.es_viaje ? 4 : 2
      if (diffHoras < margen) continue

      await supabase.from('trabajos').update({ status: 'cancelado' }).eq('id', trabajo.id)

      const { data: usuarios } = await supabase.from('usuarios').select('id, fcm_token, amonestaciones')
        .in('id', [trabajo.cliente_id, trabajo.trabajador_id].filter(Boolean))
      const cliente = usuarios?.find((u: any) => u.id === trabajo.cliente_id)
      const trabajador = usuarios?.find((u: any) => u.id === trabajo.trabajador_id)

      // Amonestar al trabajador por inasistencia
      if (trabajo.trabajador_id && trabajador) {
        const nuevas = (trabajador.amonestaciones || 0) + 1
        const baneado = nuevas >= 3
        await supabase.from('usuarios').update({
          amonestaciones: nuevas,
          ...(baneado ? { baneado: true } : {})
        }).eq('id', trabajo.trabajador_id)
        console.log(`Trabajador ${trabajo.trabajador_id} amonestado por inasistencia (${nuevas}/3)${baneado ? ' — BANEADO' : ''}`)
      }

      if (trabajo.cliente_id) {
        await notificar(supabase, trabajo.cliente_id,
          'Trabajo cancelado automaticamente',
          `Tu ${trabajo.categoria} fue cancelado porque el trabajador no se presento a tiempo.`,
          'general', trabajo.id, cliente?.fcm_token || null, accessToken)
      }
      if (trabajo.trabajador_id) {
        await notificar(supabase, trabajo.trabajador_id,
          'Trabajo cancelado por inasistencia',
          `El trabajo de ${trabajo.categoria} fue cancelado por no presentarte. Amonestacion registrada.`,
          'general', trabajo.id, trabajador?.fcm_token || null, accessToken)
      }
      cancelados++
      console.log(`Auto-cancelado trabajo ${trabajo.id} — cita vencida hace ${diffHoras.toFixed(1)} hrs`)
    }

    // ── 3. ALERTAR trabajos donde el chofer lleva mucho tiempo "en camino" ──
    // Si trabajador_en_camino = true por más de 2 hrs sin llegar → cancelar con amonestación
    const hace2hrs = new Date(ahora.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const hace30min = new Date(ahora.getTime() - 30 * 60 * 1000).toISOString()

    const { data: tardanzas } = await supabase
      .from('trabajos')
      .select('id, categoria, cliente_id, trabajador_id, trabajador_en_camino, trabajador_llego, trabajo_iniciado, trabajador_lat, trabajador_lng, updated_at')
      .eq('status', 'aceptado')
      .eq('trabajador_en_camino', true)
      .eq('trabajador_llego', false)
      .lt('updated_at', hace2hrs)

    for (const trabajo of (tardanzas || [])) {
      // Si lleva más de 2 hrs en camino sin llegar → cancelar y amonestar
      const { data: usuarios } = await supabase.from('usuarios').select('id, fcm_token, amonestaciones')
        .in('id', [trabajo.cliente_id, trabajo.trabajador_id].filter(Boolean))
      const cliente = usuarios?.find((u: any) => u.id === trabajo.cliente_id)
      const trabajador = usuarios?.find((u: any) => u.id === trabajo.trabajador_id)

      await supabase.from('trabajos').update({ status: 'cancelado' }).eq('id', trabajo.id)

      // Amonestar al trabajador
      if (trabajo.trabajador_id && trabajador) {
        const nuevas = (trabajador.amonestaciones || 0) + 1
        const baneado = nuevas >= 3
        await supabase.from('usuarios').update({
          amonestaciones: nuevas,
          ...(baneado ? { baneado: true } : {})
        }).eq('id', trabajo.trabajador_id)
      }

      // Notificar al cliente
      if (trabajo.cliente_id) {
        await notificar(supabase, trabajo.cliente_id,
          '⚠️ Tu conductor tardó demasiado',
          `Tu ${trabajo.categoria} fue cancelado porque el conductor no llegó en 2 horas. No se te cobrará nada.`,
          'general', trabajo.id, cliente?.fcm_token || null, accessToken)
      }
      // Notificar al trabajador
      if (trabajo.trabajador_id) {
        await notificar(supabase, trabajo.trabajador_id,
          '❌ Trabajo cancelado por tardanza',
          `El trabajo de ${trabajo.categoria} fue cancelado por no llegar a tiempo. Amonestación registrada.`,
          'general', trabajo.id, trabajador?.fcm_token || null, accessToken)
      }
      cancelados++
      console.log(`Auto-cancelado por tardanza excesiva: ${trabajo.id}`)
    }

    // ── 4. ALERTAR al cliente si el chofer no se ha movido en 30 min ──
    const { data: sinMovimiento } = await supabase
      .from('trabajos')
      .select('id, categoria, cliente_id, trabajador_id')
      .eq('status', 'aceptado')
      .eq('trabajador_en_camino', true)
      .eq('trabajador_llego', false)
      .lt('updated_at', hace30min)

    for (const trabajo of (sinMovimiento || [])) {
      const { data: clienteData } = await supabase.from('usuarios')
        .select('fcm_token').eq('id', trabajo.cliente_id).maybeSingle()
      await notificar(supabase, trabajo.cliente_id,
        '⚠️ Tu conductor no se ha movido',
        `Tu ${trabajo.categoria} lleva 30 min sin actualizar ubicación. Si hay un problema, puedes cancelar o abrir un chat.`,
        'general', trabajo.id, clienteData?.fcm_token || null, accessToken)
    }

    // ── 5. RECORDATORIOS de cita — 24hrs y 1hr antes ──
    const en24hrs = new Date(ahora.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const en1hr = new Date(ahora.getTime() + 60 * 60 * 1000)
    const en1hrFecha = en1hr.toISOString().split('T')[0]
    const en1hrHora = `${String(en1hr.getHours()).padStart(2,'0')}:${String(en1hr.getMinutes()).padStart(2,'0')}`

    // Recordatorio 24hrs antes
    const { data: citas24hrs } = await supabase
      .from('trabajos')
      .select('id, categoria, cliente_id, trabajador_id, fecha_cita, hora_cita, recordatorio_24h_enviado')
      .eq('status', 'aceptado')
      .eq('fecha_cita', en24hrs)
      .eq('recordatorio_24h_enviado', false)

    for (const trabajo of (citas24hrs || [])) {
      const { data: usuarios } = await supabase.from('usuarios').select('id, fcm_token')
        .in('id', [trabajo.cliente_id, trabajo.trabajador_id].filter(Boolean))
      
      for (const u of (usuarios || [])) {
        await notificar(supabase, u.id,
          '📅 Recordatorio — cita mañana',
          `Tu ${trabajo.categoria} está agendado para mañana a las ${trabajo.hora_cita?.slice(0,5)} hrs`,
          'recordatorio', trabajo.id, u.fcm_token, accessToken)
      }
      await supabase.from('trabajos').update({ recordatorio_24h_enviado: true }).eq('id', trabajo.id)
    }

    // Recordatorio 1hr antes
    const { data: citas1hr } = await supabase
      .from('trabajos')
      .select('id, categoria, cliente_id, trabajador_id, fecha_cita, hora_cita, recordatorio_1h_enviado')
      .eq('status', 'aceptado')
      .eq('fecha_cita', en1hrFecha)
      .eq('recordatorio_1h_enviado', false)

    for (const trabajo of (citas1hr || [])) {
      if (trabajo.hora_cita?.slice(0,5) !== en1hrHora) continue
      const { data: usuarios } = await supabase.from('usuarios').select('id, fcm_token')
        .in('id', [trabajo.cliente_id, trabajo.trabajador_id].filter(Boolean))
      
      for (const u of (usuarios || [])) {
        await notificar(supabase, u.id,
          '⏰ Tu cita es en 1 hora',
          `${trabajo.categoria} a las ${trabajo.hora_cita?.slice(0,5)} hrs — ¡prepárate!`,
          'recordatorio', trabajo.id, u.fcm_token, accessToken)
      }
      await supabase.from('trabajos').update({ recordatorio_1h_enviado: true }).eq('id', trabajo.id)
    }

    return new Response(JSON.stringify({ ok: true, completados, cancelados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
