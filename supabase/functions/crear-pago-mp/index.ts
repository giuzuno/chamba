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
 
    // 3. Obtener datos completos del cliente para el payer
    const { data: clienteData } = await supabase
      .from('usuarios').select('email, nombre, apellido').eq('id', trabajo.cliente_id).maybeSingle()
 
    const emailCliente = clienteData?.email || email
    const nombreCliente = clienteData?.nombre || 'Cliente'
    const apellidoCliente = clienteData?.apellido || 'Chamba'
 
    // Crear customer usando el token del vendedor
    let mpCustomerId = null
    const resCustomer = await fetch('https://api.mercadopago.com/v1/customers', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenVendedor}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailCliente,
        first_name: nombreCliente,
        last_name: apellidoCliente,
      }),
    })
    const customer = await resCustomer.json()
 
    if (customer.id) {
      mpCustomerId = customer.id
    } else if (customer.cause?.[0]?.code === 'customer_already_exists' || customer.message?.includes('already exists')) {
      const resSearch = await fetch(`https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(emailCliente)}`, {
        headers: { 'Authorization': `Bearer ${tokenVendedor}` },
      })
      const searchData = await resSearch.json()
      mpCustomerId = searchData?.results?.[0]?.id || null
    }
 
    const monto = Number(trabajo.precio_acordado || trabajo.presupuesto)
    const comisionChamba = Math.round(monto * 0.12 * 100) / 100
 
    // 4. Armar el cuerpo del pago (sin `capture` todavía — se decide en intentarPago)
    const pagoBodyBase: Record<string, unknown> = {
      transaction_amount: monto,
      token,
      description: `Chamba: ${trabajo.categoria}`,
      installments: Number(installments) || 1,
      payment_method_id: paymentMethodId,
      issuer_id: issuerId ? Number(issuerId) : undefined,
      application_fee: comisionChamba,
      statement_descriptor: 'CHAMBA',
      payer: {
        email: emailCliente,
        first_name: nombreCliente,
        last_name: apellidoCliente,
        ...(mpCustomerId ? { id: mpCustomerId } : {}),
      },
      additional_info: {
        payer: {
          first_name: nombreCliente,
          last_name: apellidoCliente,
        },
        items: [{
          id: trabajoId,
          title: `Chamba: ${trabajo.categoria}`,
          description: (trabajo.descripcion || '').slice(0, 200),
          category_id: 'services',
          quantity: 1,
          unit_price: monto,
        }],
        shipments: {
          receiver_address: {
            zip_code: '70600',
            state_name: 'Oaxaca',
            city_name: 'Salina Cruz',
          }
        }
      },
      metadata: {
        trabajo_id: trabajoId,
        plataforma: 'chamba',
      },
    }
 
    async function intentarPago(capture: boolean) {
      const resPago = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenVendedor}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `chamba-${trabajoId}-${capture ? 'inmediato' : 'diferido'}-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({ ...pagoBodyBase, capture }),
      })
      return await resPago.json()
    }
 
    function esErrorCapturaDiferida(p: Record<string, unknown>) {
      const cause = (p?.cause as Array<Record<string, unknown>>) || []
      const texto = `${p?.message || ''} ${cause.map(c => c?.description || c?.code || '').join(' ')}`.toLowerCase()
      return texto.includes('deferred capture')
    }
 
    // Primer intento: captura diferida — el flujo normal ("retenido hasta confirmar el trabajo")
    let pago = await intentarPago(false)
    let capturaInmediata = false
 
    // Si el emisor de la tarjeta no soporta retención (pasa seguido con tarjetas de
    // bancos digitales/fintech, ej. Openbank), reintentar cobrando de inmediato.
    if (esErrorCapturaDiferida(pago)) {
      pago = await intentarPago(true)
      capturaInmediata = true
    }
 
    if (pago.status === 'rejected' || pago.error) {
      const detalle = pago.status_detail || pago.message || ''
      const esTextoIngles = typeof detalle === 'string' && /[a-zA-Z]{4,}/.test(detalle) && !/^[a-z_]+$/i.test(detalle)
      const mensajeAmigable = esErrorCapturaDiferida(pago)
        ? 'Esta tarjeta no es compatible con el método de pago de Chamba. Intenta con otra tarjeta (de preferencia crédito de un banco tradicional).'
        : esTextoIngles
          ? 'El pago fue rechazado. Verifica tu tarjeta o intenta con otra.'
          : (detalle || 'Pago rechazado')
      return new Response(JSON.stringify({
        error: mensajeAmigable,
        debug: pago,
      }), { status: 400, headers: corsHeaders })
    }
 
    // 5. Guardar mp_payment_id y el modo de captura usado en la BD
    await supabase.from('trabajos').update({
      mp_payment_id: String(pago.id),
      pago_status: 'pagado',
      captura_diferida: !capturaInmediata,
    }).eq('id', trabajoId)
 
    // 6. Si quiere guardar tarjeta, asociarla al customer
    if (guardarTarjeta && mpCustomerId) {
      await fetch(`https://api.mercadopago.com/v1/customers/${mpCustomerId}/cards`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenVendedor}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    }
 
    return new Response(JSON.stringify({ ok: true, pagoId: pago.id, status: pago.status, capturaInmediata }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
 
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})
 