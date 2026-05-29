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
    if (callback) callback(payload)
  })
}