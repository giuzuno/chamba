import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from './supabaseClient'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function CheckoutForm({ trabajo, onPagoExitoso, onCancelar, resumen }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePagar(e) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message || 'Error al procesar el pago')
      setLoading(false)
      return
    }

    // Pago exitoso — actualizar BD
    await supabase.from('trabajos').update({ pago_status: 'pagado' }).eq('id', trabajo.id)
    setLoading(false)
    onPagoExitoso()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Resumen del cobro */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Servicio ({trabajo.categoria})</span>
          <span style={{ fontSize: '14px', color: 'white' }}>${resumen.precioBase} MXN</span>
        </div>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Comisión de plataforma</span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>${resumen.comisionStripe} MXN</span>
        </div>
        <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Total a pagar</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#1D9E75' }}>${resumen.totalCliente} MXN</span>
        </div>
      </div>

      {/* Escrow info */}
      <div style={{ background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>🔐</span>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
          Tu pago queda <strong style={{ color: '#1D9E75' }}>retenido en escrow</strong>. Solo se libera al trabajador cuando tú confirmes que el trabajo quedó bien.
        </p>
      </div>

      {/* Stripe Payment Element */}
      <div style={{ background: 'white', borderRadius: '14px', padding: '16px' }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && (
        <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>
      )}

      <button type="button" onClick={handlePagar} disabled={!stripe || loading}
        style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
        {loading ? 'Procesando pago...' : `💳 Pagar $${resumen.totalCliente} MXN`}
      </button>

      <button type="button" onClick={onCancelar}
        style={{ width: '100%', padding: '13px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        Cancelar
      </button>

      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
        Pago seguro procesado por Stripe · Tu información está encriptada
      </p>
    </div>
  )
}

export default function MetodoPago({ trabajo, onPagoExitoso, onCancelar }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    crearPaymentIntent()
  }, [])

  async function crearPaymentIntent() {
    setCargando(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('cobrar-trabajo', {
        body: { trabajoId: trabajo.id }
      })

      if (fnError || !data?.clientSecret) {
        setError('No se pudo iniciar el pago. Intenta de nuevo.')
        setCargando(false)
        return
      }

      setClientSecret(data.clientSecret)
      setResumen({
        precioBase: data.precioBase,
        comisionStripe: data.comisionStripe,
        comisionChamba: data.comisionChamba,
        totalCliente: data.totalCliente,
      })
    } catch (e) {
      setError('Error de conexión. Intenta de nuevo.')
    }
    setCargando(false)
  }

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#1D9E75',
      colorBackground: '#1A1A1A',
      colorText: '#ffffff',
      colorDanger: '#F09595',
      fontFamily: 'sans-serif',
      borderRadius: '10px',
    },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onCancelar} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>💳 Pagar trabajo</h2>
      </div>

      <div style={{ padding: '20px' }}>
        {cargando && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p>Preparando tu pago seguro...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p style={{ color: '#F09595', marginBottom: '16px' }}>{error}</p>
            <button type="button" onClick={crearPaymentIntent}
              style={{ padding: '12px 24px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && clientSecret && resumen && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance, locale: 'es' }}>
            <CheckoutForm
              trabajo={trabajo}
              onPagoExitoso={onPagoExitoso}
              onCancelar={onCancelar}
              resumen={resumen}
            />
          </Elements>
        )}
      </div>
    </div>
  )
}
