import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { trabajoId, token, issuerId, paymentMethodId, installments, email, guardarTarjeta } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Obtener trabajo
    const { data: trabajo } = await supabase
      .from('trabajos').select('*').eq('id', trabajoId).maybeSingle()
    if (!trabajo) return new Response(JSON.stringify({ error: 'Trabajo no encontrado' }), { status: 404, headers: corsHeaders })
    if (trabajo.pago_status === 'pagado') return new Response(JSON.stringify({ error: 'Ya fue pagado' }), { status: 400, headers: corsHeaders })

    // 2. Obtener access token OAuth del trabajador (vendedor)
    const { data: trabajador } = await supabase
      .from('usuarios').select('mp_account_id').eq('id', trabajo.trabajador_id).maybeSingle()
    if (!trabajador?.mp_account_id) return new Response(JSON.stringify({ error: 'El trabajador no tiene cuenta MP conectada' }), { status: 400, headers: corsHeaders })

    const tokenVendedor = trabajador.mp_account_id

    // 3. Obtener cliente — el mp_customer_id debe pertenecer a la cuenta del vendedor.
    // Como cada vendedor es una cuenta MP distinta, NO reutilizamos mp_customer_id entre vendedores.
    const { data: clienteData } = await supabase
      .from('usuarios').select('email').eq('id', trabajo.cliente_id).maybeSingle()

   const emailCliente = clienteData?.email || email

    // Crear customer SIEMPRE usando el token del vendedor que va a cobrar
    let mpCustomerId = null
    const resCustomer = await fetch('https://api.mercadopago.com/v1/customers', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenVendedor}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailCliente }),
    })
    const customer = await resCustomer.json()
    console.log('Respuesta crear customer:', JSON.stringify(customer))

    if (customer.id) {
      mpCustomerId = customer.id
    } else if (customer.cause?.[0]?.code === 'customer_already_exists' || customer.message?.includes('already exists')) {
      // Si ya existe un customer con ese email en la cuenta del vendedor, lo buscamos
      const resSearch = await fetch(`https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(emailCliente)}`, {
        headers: { 'Authorization': `Bearer ${tokenVendedor}` },
      })
      const searchData = await resSearch.json()
      mpCustomerId = searchData?.results?.[0]?.id || null
    }

    const monto = Number(trabajo.precio_acordado || trabajo.presupuesto)
    const comisionChamba = Math.round(monto * 0.12 * 100) / 100

    // 4. Crear el pago en MP con capture: false (retención)
    const pagoBody: Record<string, unknown> = {
      transaction_amount: monto,
      token,
      description: `Chamba: ${trabajo.categoria}`,
      installments: Number(installments) || 1,
      payment_method_id: paymentMethodId,
      issuer_id: issuerId ? Number(issuerId) : undefined,
      application_fee: comisionChamba,
      capture: true,
      payer: {
        email: emailCliente,
        ...(mpCustomerId ? { id: mpCustomerId } : {}),
      },
    }

    const resPago = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenVendedor}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `chamba-${trabajoId}-${Date.now()}`,
      },
      body: JSON.stringify(pagoBody),
    })

    const pago = await resPago.json()
    console.log('Respuesta completa de MP:', JSON.stringify(pago))

    if (pago.status === 'rejected' || pago.error) {
      return new Response(JSON.stringify({
        error: pago.status_detail || pago.message || 'Pago rechazado',
        debug: pago,
      }), { status: 400, headers: corsHeaders })
    }

    // 5. Guardar mp_payment_id en la BD
    await supabase.from('trabajos').update({
      mp_payment_id: String(pago.id),
      pago_status: 'pagado',
    }).eq('id', trabajoId)

    // 6. Si quiere guardar tarjeta, asociarla al customer (con el token del vendedor)
    if (guardarTarjeta && mpCustomerId) {
      await fetch(`https://api.mercadopago.com/v1/customers/${mpCustomerId}/cards`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenVendedor}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    }

    return new Response(JSON.stringify({ ok: true, pagoId: pago.id, status: pago.status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})