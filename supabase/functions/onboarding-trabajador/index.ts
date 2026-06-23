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
    const { trabajadorId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Obtener datos del trabajador
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('stripe_account_id, email, nombre')
      .eq('id', trabajadorId)
      .single()

    let stripeAccountId = usuario?.stripe_account_id

    // Si no tiene cuenta Stripe, crearla
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'MX',
        email: usuario?.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { trabajador_id: trabajadorId },
      })

      stripeAccountId = account.id

      // Guardar en BD
      await supabase.from('usuarios')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', trabajadorId)
    }

    // Generar link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: 'https://chamba-delta.vercel.app',
      return_url: 'https://chamba-delta.vercel.app',
      type: 'account_onboarding',
    })

    return new Response(JSON.stringify({
      url: accountLink.url,
      stripeAccountId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Error onboarding-trabajador:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})