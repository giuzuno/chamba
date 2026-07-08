import { messaging, getToken, onMessage } from './firebase'

const VAPID_KEY = 'BFSrWuj73mpnXeWuwypp5QWqwdoDX4CTmuu2cZmdQ9xSygerEoCtUyt-w2aY3R1-fZQdUPN1toWcaeDQwFX0uY8'

export async function solicitarPermiso() {
  try {
    const permiso = await Notification.requestPermission()
    if (permiso === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY })
      console.log('Token FCM:', token)
      return token
    }
  } catch (error) {
    console.error('Error al solicitar permiso:', error)
  }
  return null
}

export function escucharNotificaciones(callback) {
  return onMessage(messaging, (payload) => {
    console.log('Notificación recibida:', payload)
    reproducirSonidoNotificacion()
    if (callback) callback(payload)
  })
}

function reproducirSonidoNotificacion() {
  try {
    const audio = new Audio('/sounds/chamba-notif.wav')
    audio.volume = 0.85
    audio.play().catch(() => {
      // Algunos navegadores bloquean audio si el usuario no ha interactuado
      // con la página todavía — no es un error crítico, se ignora en silencio.
    })
  } catch {
    // Silencioso: el sonido es un "nice to have", nunca debe romper la notificación
  }
}