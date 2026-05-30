import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const FCM_URL = 'https://fcm.googleapis.com/fcm/send'

serve(async (req) => {
  try {
    const { token, titulo, cuerpo } = await req.json()

    const SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

    const response = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: titulo,
          body: cuerpo,
          icon: '/icon.png',
          click_action: 'https://chamba-delta.vercel.app'
        }
      })
    })

    const data = await response.json()
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})