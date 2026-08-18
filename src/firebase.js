import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { Capacitor } from '@capacitor/core'

const firebaseConfig = {
  apiKey: "AIzaSyD_-qlmwC4oGqBsj9TGg1PdJKsYiATmizk",
  authDomain: "chamba-72295.firebaseapp.com",
  projectId: "chamba-72295",
  storageBucket: "chamba-72295.firebasestorage.app",
  messagingSenderId: "955716618416",
  appId: "1:955716618416:web:dd99bef3daf5900557d375"
}

const app = initializeApp(firebaseConfig)

// getMessaging() depende de Service Workers, que no existen en el WebView nativo
// de Capacitor (sobre todo en iOS, donde WKWebView no los soporta en absoluto).
// Las apps nativas usan @capacitor/push-notifications en su lugar (ver
// useNotificaciones.js), así que aquí solo se inicializa Firebase Messaging
// cuando de verdad estamos corriendo en un navegador normal.
const messaging = Capacitor.isNativePlatform() ? null : getMessaging(app)

export { messaging, getToken, onMessage }
