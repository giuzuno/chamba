import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { trabajoId } = await req.json()
    if (!trabajoId) return new Response(JSON.stringify({ error: 'Falta trabajoId' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: trabajo, error: trabajoError } = await supabase
      .from('trabajos').select('*').eq('id', trabajoId).single()

    if (trabajoError || !trabajo) {
      return new Response(JSON.stringify({ error: 'Trabajo no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: cliente } = await supabase
      .from('usuarios').select('email, nombre, stripe_customer_id')
      .eq('id', trabajo.cliente_id).single()

    let trabajadorStripeId = null
    if (trabajo.trabajador_id) {
      const { data: trabajador } = await supabase
        .from('usuarios').select('stripe_account_id')
        .eq('id', trabajo.trabajador_id).single()
      trabajadorStripeId = trabajador?.stripe_account_id || null
    }

    // ✅ El cliente paga exactamente el presupuesto — sin comisiones visibles
    const totalCliente = trabajo.precio_acordado || trabajo.presupuesto
    const totalCentavos = Math.round(totalCliente * 100)
    const comisionChamba = Math.round(totalCliente * 0.12)
    const pagoTrabajador = totalCliente - comisionChamba

    // Obtener o crear Customer de Stripe
    let stripeCustomerId = cliente?.stripe_customer_id

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: cliente?.email || undefined,
        name: cliente?.nombre || undefined,
        metadata: { supabase_user_id: trabajo.cliente_id },
      })
      stripeCustomerId = customer.id
      await supabase.from('usuarios')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', trabajo.cliente_id)
    }

    // Verificar tarjeta guardada
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    })
    const tarjetaGuardada = paymentMethods.data[0] || null

    const paymentIntentParams: any = {
      amount: totalCentavos,
      currency: 'mxn',
      customer: stripeCustomerId,
      description: `Chamba - ${trabajo.categoria} - ${trabajoId}`,
      metadata: {
        trabajo_id: trabajoId,
        total_cliente: String(totalCliente),
        comision_chamba: String(comisionChamba),
        pago_trabajador: String(pagoTrabajador),
      },
      setup_future_usage: 'off_session',
    }

    if (tarjetaGuardada) {
      paymentIntentParams.payment_method = tarjetaGuardada.id
    }

    // Split automático si el trabajador ya tiene cuenta Stripe
    if (trabajadorStripeId) {
      paymentIntentParams.transfer_data = {
        destination: trabajadorStripeId,
        amount: Math.round(pagoTrabajador * 100),
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    await supabase.from('trabajos').update({
      stripe_payment_intent_id: paymentIntent.id,
      pago_status: 'pendiente',
    }).eq('id', trabajoId)

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      totalCliente,
      tarjetaGuardada: tarjetaGuardada ? {
        id: tarjetaGuardada.id,
        marca: tarjetaGuardada.card?.brand,
        ultimos4: tarjetaGuardada.card?.last4,
        expMes: tarjetaGuardada.card?.exp_month,
        expAnio: tarjetaGuardada.card?.exp_year,
      } : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Error cobrar-trabajo:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})