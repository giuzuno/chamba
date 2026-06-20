import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from './supabaseClient'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function CheckoutFormNueva({ trabajo, onPagoExitoso, onCancelar, totalCliente }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePagar() {
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

    await supabase.from('trabajos').update({ pago_status: 'pagado' }).eq('id', trabajo.id)
    setLoading(false)
    onPagoExitoso()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '4px' }}>
        <PaymentElement options={{
          layout: { type: 'tabs', defaultCollapsed: false },
          wallets: { applePay: 'never', googlePay: 'never' },
          terms: { card: 'never' },
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
        Tu tarjeta se guardará para futuros pagos · Encriptado por Stripe 🔒
      </p>
    </div>
  )
}

function CheckoutFormGuardada({ trabajo, onPagoExitoso, onCancelar, totalCliente, tarjeta, clientSecret, onUsarOtraTarjeta }) {
  const stripe = useStripe()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePagarGuardada() {
    if (!stripe) return
    setLoading(true)
    setError('')

    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: tarjeta.id,
    })

    if (stripeError) {
      setError(stripeError.message || 'Error al procesar el pago')
      setLoading(false)
      return
    }

    await supabase.from('trabajos').update({ pago_status: 'pagado' }).eq('id', trabajo.id)
    setLoading(false)
    onPagoExitoso()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'rgba(29,158,117,0.08)', border: '1.5px solid rgba(29,158,117,0.4)', borderRadius: '16px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '36px' }}>💳</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tarjeta guardada</p>
          <p style={{ fontSize: '16px', fontWeight: '700', color: 'white', textTransform: 'capitalize' }}>
            {tarjeta.marca} •••• {tarjeta.ultimos4}
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            Vence {String(tarjeta.expMes).padStart(2, '0')}/{String(tarjeta.expAnio).slice(-2)}
          </p>
        </div>
        <span style={{ fontSize: '20px', color: '#1D9E75' }}>✓</span>
      </div>

      {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

      <button type="button" onClick={handlePagarGuardada} disabled={!stripe || loading}
        style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
        {loading ? 'Procesando...' : `✅ Confirmar pago — $${totalCliente} MXN`}
      </button>

      <button type="button" onClick={onUsarOtraTarjeta}
        style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        Usar otra tarjeta
      </button>

      <button type="button" onClick={onCancelar}
        style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        Cancelar
      </button>
    </div>
  )
}

export default function MetodoPago({ trabajo, onPagoExitoso, onCancelar }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [totalCliente, setTotalCliente] = useState(null)
  const [tarjetaGuardada, setTarjetaGuardada] = useState(null)
  const [usarOtraTarjeta, setUsarOtraTarjeta] = useState(false)
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
      setTarjetaGuardada(data.tarjetaGuardada || null)
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

            {tarjetaGuardada && !usarOtraTarjeta ? (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance, locale: 'es' }}>
                <CheckoutFormGuardada
                  trabajo={trabajo}
                  onPagoExitoso={onPagoExitoso}
                  onCancelar={onCancelar}
                  totalCliente={totalCliente}
                  tarjeta={tarjetaGuardada}
                  clientSecret={clientSecret}
                  onUsarOtraTarjeta={() => setUsarOtraTarjeta(true)}
                />
              </Elements>
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance, locale: 'es' }}>
                <CheckoutFormNueva
                  trabajo={trabajo}
                  onPagoExitoso={onPagoExitoso}
                  onCancelar={onCancelar}
                  totalCliente={totalCliente}
                />
              </Elements>
            )}
          </>
        )}
      </div>
    </div>
  )
}
