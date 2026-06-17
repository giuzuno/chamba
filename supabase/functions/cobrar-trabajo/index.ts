// supabase/functions/cobrar-trabajo/index.ts
//
// Cobra al cliente cuando publica un trabajo.
// Soporta: tarjeta guardada, tarjeta nueva (con o sin guardar), y efectivo (OXXO/red alterna).
//
// Variables de entorno requeridas en Supabase (Edge Functions > Secrets):
//   CONEKTA_PRIVATE_KEY      -> tu llave privada (test o producción)
//   SUPABASE_URL             -> ya viene por default
//   SUPABASE_SERVICE_ROLE_KEY -> ya viene por default

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CONEKTA_API = 'https://api.conekta.io'
const CONEKTA_KEY = Deno.env.get('CONEKTA_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const conektaHeaders = {
  'Accept': 'application/vnd.conekta-v2.2.0+json',
  'Content-Type': 'application/json',
  'Authorization': 'Basic ' + btoa(CONEKTA_KEY + ':'),
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const body = await req.json()

    const {
      userId,            // uuid del cliente en Chamba
      trabajoId,         // uuid del trabajo (puede ser null si aún no existe, ver nota abajo)
      montoMXN,          // monto en pesos, ej. 350 (no centavos)
      metodo,            // 'tarjeta_guardada' | 'tarjeta_nueva' | 'efectivo'
      paymentSourceId,   // requerido si metodo = 'tarjeta_guardada'
      tokenId,           // requerido si metodo = 'tarjeta_nueva' (token generado en frontend con llave pública)
      guardarTarjeta,    // boolean, solo aplica si metodo = 'tarjeta_nueva'
      descripcion,       // texto corto, ej. "Electricista"
    } = body

    if (!userId || !montoMXN || !metodo) {
      return jsonResponse({ error: 'Faltan datos: userId, montoMXN y metodo son requeridos' }, 400)
    }

    // 1. Obtener datos del usuario (nombre, email, conekta_customer_id)
    const { data: usuario, error: errUsuario } = await supabase
      .from('usuarios')
      .select('id, nombre, email, conekta_customer_id')
      .eq('id', userId)
      .maybeSingle()

    if (errUsuario || !usuario) {
      return jsonResponse({ error: 'Usuario no encontrado' }, 404)
    }

    let customerId = usuario.conekta_customer_id

    // 2. Si no tiene customer de Conekta, crearlo (necesario para tarjeta guardada o nueva con guardado)
    if (!customerId && metodo !== 'efectivo') {
      const customerRes = await fetch(`${CONEKTA_API}/customers`, {
        method: 'POST',
        headers: conektaHeaders,
        body: JSON.stringify({
          name: usuario.nombre || 'Usuario Chamba',
          email: usuario.email || 'sin-correo@chamba.app',
        }),
      })
      const customerData = await customerRes.json()
      if (!customerRes.ok) {
        return jsonResponse({ error: 'Error creando cliente en Conekta', detalle: customerData }, 502)
      }
      customerId = customerData.id
      await supabase.from('usuarios').update({ conekta_customer_id: customerId }).eq('id', userId)
    }

    // 3. Si es tarjeta nueva, asociarla al customer para obtener payment_source_id
    let sourceIdFinal = paymentSourceId

    if (metodo === 'tarjeta_nueva') {
      if (!tokenId) return jsonResponse({ error: 'Falta tokenId para tarjeta nueva' }, 400)

      const sourceRes = await fetch(`${CONEKTA_API}/customers/${customerId}/payment_sources`, {
        method: 'POST',
        headers: conektaHeaders,
        body: JSON.stringify({ type: 'card', token_id: tokenId }),
      })
      const sourceData = await sourceRes.json()
      if (!sourceRes.ok) {
        return jsonResponse({ error: 'Tarjeta rechazada o inválida', detalle: sourceData }, 402)
      }
      sourceIdFinal = sourceData.id

      // Guardar referencia local si el cliente quiso guardarla
      if (guardarTarjeta) {
        await supabase.from('tarjetas_guardadas').insert({
          usuario_id: userId,
          conekta_payment_source_id: sourceIdFinal,
          marca: sourceData.brand || null,
          ultimos_4: sourceData.last4 || null,
          nombre_titular: usuario.nombre || null,
        })
      }
    }

    const montoCentavos = Math.round(montoMXN * 100)

    // 4. Armar el cuerpo de la orden según el método
    const ordenBody: any = {
      currency: 'MXN',
      line_items: [{ name: descripcion || 'Servicio Chamba', unit_price: montoCentavos, quantity: 1 }],
      metadata: { trabajo_id: trabajoId || 'pendiente', usuario_id: userId },
    }

    if (metodo === 'efectivo') {
      ordenBody.customer_info = {
        name: usuario.nombre || 'Cliente Chamba',
        email: usuario.email || 'sin-correo@chamba.app',
      }
      ordenBody.charges = [{ payment_method: { type: 'cash', expires_at: Math.floor(Date.now() / 1000) + 48 * 3600 } }]
    } else {
      ordenBody.customer_info = { customer_id: customerId }
      ordenBody.charges = [{ payment_method: { type: 'card', payment_source_id: sourceIdFinal } }]
    }

    // 5. Crear la orden (esto ejecuta el cargo o genera la referencia de efectivo)
    const ordenRes = await fetch(`${CONEKTA_API}/orders`, {
      method: 'POST',
      headers: conektaHeaders,
      body: JSON.stringify(ordenBody),
    })
    const orden = await ordenRes.json()

    if (!ordenRes.ok) {
      // Cargo fallido (fondos insuficientes, tarjeta inválida, etc.)
      if (trabajoId) {
        await supabase.from('movimientos_pago').insert({
          trabajo_id: trabajoId, tipo: 'cargo_inicial', monto: montoCentavos,
          status: 'fallido', detalle: JSON.stringify(orden),
        })
      }
      return jsonResponse({
        exito: false,
        error: orden.details?.[0]?.message || orden.message || 'El pago no pudo procesarse',
        codigoConekta: orden.details?.[0]?.code || null,
      }, 402)
    }

    // 6. Éxito — determinar el estado resultante
    const esEfectivo = metodo === 'efectivo'
    const pagoStatus = esEfectivo ? 'esperando_efectivo' : 'autorizado'
    const referenciaEfectivo = esEfectivo ? orden.charges?.data?.[0]?.payment_method?.reference : null
    const vigenciaEfectivo = esEfectivo
      ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
      : null

    if (trabajoId) {
      await supabase.from('trabajos').update({
        pago_status: pagoStatus,
        pago_metodo: esEfectivo ? 'efectivo' : 'tarjeta',
        conekta_order_id: orden.id,
        monto_retenido: montoCentavos,
        efectivo_referencia: referenciaEfectivo,
        efectivo_vence_en: vigenciaEfectivo,
      }).eq('id', trabajoId)

      await supabase.from('movimientos_pago').insert({
        trabajo_id: trabajoId, tipo: 'cargo_inicial', monto: montoCentavos,
        conekta_id: orden.id, status: 'exitoso',
        detalle: esEfectivo ? `Referencia: ${referenciaEfectivo}` : 'Cargo a tarjeta exitoso',
      })
    }

    return jsonResponse({
      exito: true,
      ordenId: orden.id,
      metodo: esEfectivo ? 'efectivo' : 'tarjeta',
      referenciaEfectivo,
      vigenciaEfectivo,
      paymentSourceId: sourceIdFinal || null,
    })

  } catch (e) {
    console.error('Error en cobrar-trabajo:', e)
    return jsonResponse({ error: 'Error interno', detalle: String(e) }, 500)
  }
})
