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
 
    // 1. Obtener el trabajo y su pago
    const { data: trabajo } = await supabase
      .from('trabajos').select('*').eq('id', trabajoId).maybeSingle()
    if (!trabajo) return new Response(JSON.stringify({ error: 'Trabajo no encontrado' }), { status: 404, headers: corsHeaders })
    if (!trabajo.mp_payment_id) return new Response(JSON.stringify({ error: 'Este trabajo no tiene un pago asociado' }), { status: 400, headers: corsHeaders })
    if (trabajo.pago_status === 'liberado') return new Response(JSON.stringify({ error: 'Este pago ya fue liberado al trabajador, no se puede cancelar' }), { status: 400, headers: corsHeaders })
    if (trabajo.pago_status === 'reembolsado' || trabajo.pago_status === 'cancelado') return new Response(JSON.stringify({ error: 'Este pago ya fue cancelado antes' }), { status: 400, headers: corsHeaders })
 
    // 2. Token OAuth del trabajador (el pago vive en su cuenta MP)
    const { data: trabajador } = await supabase
      .from('usuarios').select('mp_account_id').eq('id', trabajo.trabajador_id).maybeSingle()
    if (!trabajador?.mp_account_id) return new Response(JSON.stringify({ error: 'No se encontró la cuenta MP del trabajador' }), { status: 400, headers: corsHeaders })
 
    // 3. Si el pago se autorizó en modo retención (lo normal), se cancela la autorización
    //    y el dinero nunca sale de la cuenta del cliente. Si el pago se cobró de inmediato
    //    (la tarjeta del cliente no soportaba retención — ver crear-pago-mp), ya no es una
    //    autorización sino dinero real ya movido, así que hay que reembolsarlo.
    const esCapturaInmediata = trabajo.captura_diferida === false
 
    let resultado: Record<string, unknown>
 
    if (esCapturaInmediata) {
      const resReembolso = await fetch(`https://api.mercadopago.com/v1/payments/${trabajo.mp_payment_id}/refunds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${trabajador.mp_account_id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      resultado = await resReembolso.json()
      if (!resReembolso.ok || resultado.error) {
        return new Response(JSON.stringify({
          error: (resultado as any).message || 'No se pudo reembolsar el pago en Mercado Pago',
          debug: resultado,
        }), { status: 400, headers: corsHeaders })
      }
    } else {
      const resCancelar = await fetch(`https://api.mercadopago.com/v1/payments/${trabajo.mp_payment_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${trabajador.mp_account_id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      resultado = await resCancelar.json()
      if (!resCancelar.ok || (resultado as any).status !== 'cancelled') {
        return new Response(JSON.stringify({
          error: (resultado as any).message || 'No se pudo cancelar el pago en Mercado Pago',
          debug: resultado,
        }), { status: 400, headers: corsHeaders })
      }
    }
 
    // 4. Actualizar el trabajo en la base de datos
    await supabase.from('trabajos').update({
      pago_status: 'reembolsado',
    }).eq('id', trabajoId)
 
    return new Response(JSON.stringify({ ok: true, status: (resultado as any).status || 'reembolsado' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
 
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders })
  }
})