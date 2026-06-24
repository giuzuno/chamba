import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from './supabaseClient'

function CheckoutForm({ trabajo, onPagoExitoso, onCancelar, totalCliente, clientSecret }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePagar() {
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    const cardElement = elements.getElement(CardElement)

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    })

    if (stripeError) {
      setError(stripeError.message || 'Error al procesar el pago')
      setLoading(false)
      return
    }

    if (paymentIntent.status === 'succeeded') {
      await supabase.from('trabajos').update({ pago_status: 'pagado' }).eq('id', trabajo.id)
      setLoading(false)
      onPagoExitoso()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', border: '0.5px solid rgba(255,255,255,0.15)' }}>
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#ffffff',
              fontFamily: 'sans-serif',
              '::placeholder': { color: 'rgba(255,255,255,0.3)' },
            },
            invalid: { color: '#F09595' },
          },
          hidePostalCode: true,
        }} />
      </div>
      {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
      <button type="button" onClick={handlePagar} disabled={!stripe || loading}
        style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
        {loading ? 'Procesando...' : `💳 Pagar $${totalCliente} MXN`}
      </button>
      <button type="button" onClick={onCancelar}
        style={{ width: '100%', padding: '13px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        Cancelar
      </button>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
        Encriptado por Stripe 🔒
      </p>
    </div>
  )
}

export default function MetodoPago({ trabajo, onPagoExitoso, onCancelar }) {
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  const [clientSecret, setClientSecret] = useState(null)
  const [totalCliente, setTotalCliente] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { crearPaymentIntent() }, [])

  async function crearPaymentIntent() {
    setCargando(true)
    setError('')
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
      setTotalCliente(data.totalCliente)
    } catch {
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

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

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

        {!cargando && !error && clientSecret && totalCliente && (
          <>
            <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', fontWeight: '600' }}>{trabajo.categoria}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>🔐 Retenido en escrow hasta confirmar</p>
              </div>
              <p style={{ fontSize: '28px', fontWeight: '800', color: '#1D9E75' }}>${totalCliente} MXN</p>
            </div>

            <Elements stripe={stripePromise} options={{ appearance, locale: 'es' }}>
              <CheckoutForm
                trabajo={trabajo}
                onPagoExitoso={onPagoExitoso}
                onCancelar={onCancelar}
                totalCliente={totalCliente}
                clientSecret={clientSecret}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  )
}
