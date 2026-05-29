import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyD_-qlmwC4oGqBsj9TGg1PdJKsYiATmizk",
  authDomain: "chamba-72295.firebaseapp.com",
  projectId: "chamba-72295",
  storageBucket: "chamba-72295.firebasestorage.app",
  messagingSenderId: "955716618416",
  appId: "1:955716618416:web:dd99bef3daf5900557d375"
}

const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

export { messaging, getToken, onMessage }