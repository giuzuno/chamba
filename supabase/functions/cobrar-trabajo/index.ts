import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { trabajoId } = await req.json()
    if (!trabajoId) return new Response(JSON.stringify({ error: 'trabajoId requerido' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Obtener el trabajo
    const { data: trabajo, error: trabajoError } = await supabase
      .from('trabajos').select('*').eq('id', trabajoId).maybeSingle()
    if (trabajoError || !trabajo) return new Response(JSON.stringify({ error: 'Trabajo no encontrado' }), { status: 404, headers: corsHeaders })
    if (trabajo.pago_status === 'pagado') return new Response(JSON.stringify({ error: 'Este trabajo ya fue pagado' }), { status: 400, headers: corsHeaders })

    // 2. Obtener el trabajador y su mp_account_id (access token OAuth) y mp_public_key
    const { data: trabajador } = await supabase
      .from('usuarios').select('mp_account_id, mp_public_key').eq('id', trabajo.trabajador_id).maybeSingle()
    if (!trabajador?.mp_account_id) return new Response(JSON.stringify({ error: 'El trabajador no tiene cuenta de Mercado Pago conectada' }), { status: 400, headers: corsHeaders })

    // 3. Obtener el cliente y su mp_customer_id
    const { data: cliente } = await supabase
      .from('usuarios').select('mp_customer_id, email').eq('id', trabajo.cliente_id).maybeSingle()

    const monto = Number(trabajo.precio_acordado || trabajo.presupuesto)
    const comisionChamba = Math.round(monto * 0.12)

    return new Response(JSON.stringify({
      ok: true,
      monto,
      comisionChamba,
      totalCliente: monto,
      trabajadorToken: trabajador.mp_account_id,
      trabajadorPublicKey: trabajador.mp_public_key,
      mpCustomerId: cliente?.mp_customer_id || null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})