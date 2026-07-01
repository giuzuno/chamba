import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { trabajadorId } = await req.json()
    if (!trabajadorId) return new Response(JSON.stringify({ error: 'trabajadorId requerido' }), { status: 400, headers: corsHeaders })

    const clientId = Deno.env.get('MP_CLIENT_ID')!
    const redirectUri = 'https://chamba-delta.vercel.app/mp-callback'

    const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${trabajadorId}&redirect_uri=${encodeURIComponent(redirectUri)}`

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})