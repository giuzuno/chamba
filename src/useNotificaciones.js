import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { messaging, getToken, onMessage } from './firebase'

const VAPID_KEY = 'BFSrWuj73mpnXeWuwypp5QWqwdoDX4CTmuu2cZmdQ9xSygerEoCtUyt-w2aY3R1-fZQdUPN1toWcaeDQwFX0uY8'

const esNativo = Capacitor.isNativePlatform()

export async function solicitarPermiso() {
  if (esNativo) {
    return solicitarPermisoNativo()
  }
  return solicitarPermisoWeb()
}

// ── App instalada (Android/iOS nativo vía Capacitor) ──
function solicitarPermisoNativo() {
  return new Promise((resolve) => {
    PushNotifications.requestPermissions().then(async (resultado) => {
      if (resultado.receive !== 'granted') {
        resolve(null)
        return
      }

      // Escucha el token ANTES de registrar, para no perder el evento
      const listener = await PushNotifications.addListener('registration', (token) => {
        listener.remove()
        resolve(token.value)
      })

      const errorListener = await PushNotifications.addListener('registrationError', (error) => {
        console.error('Error al registrar notificaciones nativas:', error)
        errorListener.remove()
        resolve(null)
      })

      await PushNotifications.register()
    }).catch((error) => {
      console.error('Error al solicitar permiso nativo:', error)
      resolve(null)
    })
  })
}

// ── Navegador (web / iPhone en pantalla de inicio) ──
async function solicitarPermisoWeb() {
  try {
    const permiso = await Notification.requestPermission()
    if (permiso === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY })
      return token
    }
  } catch (error) {
    console.error('Error al solicitar permiso web:', error)
  }
  return null
}

export function escucharNotificaciones(callback) {
  if (esNativo) {
    return escucharNotificacionesNativo(callback)
  }
  return escucharNotificacionesWeb(callback)
}

function escucharNotificacionesNativo(callback) {
  let listenerRecibida, listenerAccion

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    reproducirSonidoNotificacion()
    if (callback) {
      callback({
        notification: { title: notification.title, body: notification.body },
        data: notification.data || {},
      })
    }
  }).then((l) => { listenerRecibida = l })

  PushNotifications.addListener('pushNotificationActionPerformed', (accion) => {
    const notification = accion.notification
    if (callback) {
      callback({
        notification: { title: notification.title, body: notification.body },
        data: notification.data || {},
      })
    }
  }).then((l) => { listenerAccion = l })

  return () => {
    listenerRecibida?.remove()
    listenerAccion?.remove()
  }
}

function escucharNotificacionesWeb(callback) {
  return onMessage(messaging, (payload) => {
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