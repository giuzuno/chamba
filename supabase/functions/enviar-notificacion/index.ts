import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PROJECT_ID = 'chamba-72295'

const ALLOWED_ORIGINS = [
  'https://chamba-delta.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
})

// Rate limiting — máximo 30 notificaciones por usuario por minuto
const rateLimitMap = new Map<string, { count: number, reset: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(userId)
  if (!limit || now > limit.reset) {
    rateLimitMap.set(userId, { count: 1, reset: now + 60000 })
    return true
  }
  if (limit.count >= 30) return false
  limit.count++
  return true
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
  const encode = (obj: any) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const headerB64 = encode(header)
  const claimB64 = encode(claim)
  const signingInput = `${headerB64}.${claimB64}`
  const pemContents = serviceAccount.private_key.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey('pkcs8', binaryKey.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const signatureBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput))
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const jwt = `${signingInput}.${signatureB64}`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

serve(async (req) => {
  const origin = req.headers.get('origin') || ''
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })

  try {
    // Verificar autenticación
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      })
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ ok: false, error: 'Rate limit excedido — intenta en 1 minuto' }), {
        status: 429, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
      })
    }

    const { token: fcmToken, titulo, cuerpo } = await req.json()
    if (!fcmToken) throw new Error('Token FCM requerido')

    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!)
    const accessToken = await getAccessToken(serviceAccount)

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title: titulo, body: cuerpo },
          webpush: {
            notification: { icon: 'https://chamba-delta.vercel.app/icons/icon-192x192.png' },
            fcm_options: { link: 'https://chamba-delta.vercel.app' }
          }
        }
      })
    })

    const data = await response.json()
    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' }
    })
  }
})
