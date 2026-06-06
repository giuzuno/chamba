import { supabase } from './supabaseClient'

// Generar fingerprint del dispositivo basado en características del navegador
export async function generarFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform || '',
  ]

  // Agregar canvas fingerprint
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Chamba 🚀', 2, 2)
    components.push(canvas.toDataURL().slice(-50))
  } catch (e) {}

  // Hash simple de los componentes
  const str = components.join('|||')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// Verificar si el dispositivo está baneado
export async function verificarDispositivoBaneado() {
  try {
    const fingerprint = await generarFingerprint()
    const { data } = await supabase
      .from('dispositivos_baneados')
      .select('id, razon')
      .eq('fingerprint', fingerprint)
      .maybeSingle()
    return { baneado: !!data, razon: data?.razon || null, fingerprint }
  } catch (e) {
    return { baneado: false, razon: null, fingerprint: null }
  }
}

// Guardar fingerprint del usuario al registrarse o iniciar sesión
export async function guardarFingerprint(userId) {
  try {
    const fingerprint = await generarFingerprint()
    await supabase.from('usuarios').update({ 
      device_fingerprint: fingerprint 
    }).eq('id', userId)
    return fingerprint
  } catch (e) {
    return null
  }
}

// Banear dispositivo cuando se banea al usuario
export async function banearDispositivo(userId, razon = 'Violación de términos') {
  try {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('device_fingerprint, email')
      .eq('id', userId)
      .maybeSingle()

    if (usuario?.device_fingerprint) {
      await supabase.from('dispositivos_baneados').insert({
        fingerprint: usuario.device_fingerprint,
        email: usuario.email,
        razon,
      })
    }
  } catch (e) {
    console.log('Error baneando dispositivo:', e)
  }
}
