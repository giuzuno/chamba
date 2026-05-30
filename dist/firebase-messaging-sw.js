importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyD_-qlmwC4oGqBsj9TGg1PdJKsYiATmizk",
  authDomain: "chamba-72295.firebaseapp.com",
  projectId: "chamba-72295",
  storageBucket: "chamba-72295.firebasestorage.app",
  messagingSenderId: "955716618416",
  appId: "1:955716618416:web:dd99bef3daf5900557d375"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification
  self.registration.showNotification(title, {
    body,
    icon: '/icon.png'
  })
})