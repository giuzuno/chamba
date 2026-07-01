import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { code, trabajadorId } = await req.json()
    if (!code || !trabajadorId) return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), { status: 400, headers: corsHeaders })

    const clientId = Deno.env.get('MP_CLIENT_ID')!
    const clientSecret = Deno.env.get('MP_CLIENT_SECRET')!
    const redirectUri = 'https://chamba-delta.vercel.app/mp-callback'

    // 1. Intercambiar code por access_token del trabajador
    const res = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await res.json()

    if (!tokenData.access_token) {
      return new Response(JSON.stringify({ error: 'No se pudo obtener el token de MP', detalle: tokenData }), { status: 400, headers: corsHeaders })
    }

    // 2. Guardar el access_token del trabajador en la BD
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase.from('usuarios').update({
      mp_account_id: tokenData.access_token,
      mp_public_key: tokenData.public_key || null,
    }).eq('id', trabajadorId)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})