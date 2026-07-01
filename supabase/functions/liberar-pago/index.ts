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

    // 1. Obtener el trabajo y su mp_payment_id
    const { data: trabajo } = await supabase
      .from('trabajos').select('*').eq('id', trabajoId).maybeSingle()
    if (!trabajo) return new Response(JSON.stringify({ error: 'Trabajo no encontrado' }), { status: 404, headers: corsHeaders })
    if (!trabajo.mp_payment_id) return new Response(JSON.stringify({ error: 'No hay pago registrado para este trabajo' }), { status: 400, headers: corsHeaders })
    if (trabajo.pago_status === 'liberado') return new Response(JSON.stringify({ error: 'El pago ya fue liberado' }), { status: 400, headers: corsHeaders })

    // 2. Obtener el access token OAuth del trabajador
    const { data: trabajador } = await supabase
      .from('usuarios').select('mp_account_id').eq('id', trabajo.trabajador_id).maybeSingle()
    if (!trabajador?.mp_account_id) return new Response(JSON.stringify({ error: 'Trabajador sin cuenta MP' }), { status: 400, headers: corsHeaders })

    const monto = Number(trabajo.precio_acordado || trabajo.presupuesto)

    // 3. Capturar el pago retenido en MP (liberar al trabajador)
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${trabajo.mp_payment_id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${trabajador.mp_account_id}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        capture: true,
        transaction_amount: monto,
      }),
    })

    const mpData = await mpRes.json()

    if (!mpRes.ok || mpData.status === 'rejected') {
      return new Response(JSON.stringify({ error: 'MP rechazó la liberación', detalle: mpData }), { status: 400, headers: corsHeaders })
    }

    // 4. Actualizar BD
    await supabase.from('trabajos').update({
      pago_status: 'liberado',
      status: 'completado',
    }).eq('id', trabajoId)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders })
  }
})