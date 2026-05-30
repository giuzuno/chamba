import { supabase } from './supabaseClient'

export async function guardarNotificacion({ usuarioId, titulo, cuerpo, tipo = 'general', trabajoId = null }) {
  await supabase.from('notificaciones').insert({
    usuario_id: usuarioId,
    titulo,
    cuerpo,
    tipo,
    trabajo_id: trabajoId,
  })
}

export async function enviarNotificacionCompleta({ usuarioId, titulo, cuerpo, tipo = 'general', trabajoId = null }) {
  // Guardar en BD (historial)
  await guardarNotificacion({ usuarioId, titulo, cuerpo, tipo, trabajoId })

  // Enviar push (FCM)
  const { data } = await supabase
    .from('usuarios')
    .select('fcm_token')
    .eq('id', usuarioId)
    .maybeSingle()

  if (data?.fcm_token) {
    await supabase.functions.invoke('enviar-notificacion', {
      body: { token: data.fcm_token, titulo, cuerpo }
    })
  }
}