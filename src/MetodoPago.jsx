import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function MetodoPago({ trabajo, onPagoExitoso, onCancelar }) {
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState(null)
  const [mpListo, setMpListo] = useState(false)
  const [cardForm, setCardForm] = useState(null)
  const [tarjetaGuardada, setTarjetaGuardada] = useState(null)
  const [usarGuardada, setUsarGuardada] = useState(false)
  const [cvv, setCvv] = useState('')
  const [guardarTarjeta, setGuardarTarjeta] = useState(true)

  // 1. Cargar config desde edge function
  useEffect(() => { iniciarPago() }, [])

  async function iniciarPago() {
    setCargando(true)
    setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('cobrar-trabajo', {
        body: { trabajoId: trabajo.id }
      })
      if (fnError || !data?.ok) {
        setError(data?.error || 'No se pudo iniciar el pago.')
        setCargando(false)
        return
      }
      setConfig(data)

      // Si tiene tarjeta guardada
      if (data.mpCustomerId) {
        await cargarTarjetaGuardada(data.mpCustomerId, data.trabajadorToken)
      }

      // Cargar SDK de MP — pasamos data directo, NO dependemos del state config
      await cargarSDKMercadoPago(data)
      setCargando(false)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setCargando(false)
    }
  }

  async function cargarTarjetaGuardada(customerId, accessToken) {
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const cards = await res.json()
      if (cards && cards.length > 0) {
        setTarjetaGuardada(cards[0])
        setUsarGuardada(true)
      }
    } catch { /* sin tarjeta guardada */ }
  }

  function cargarSDKMercadoPago(data) {
    return new Promise((resolve) => {
      if (window.MercadoPago) { inicializarForm(data); resolve(); return }
      const script = document.createElement('script')
      script.src = 'https://sdk.mercadopago.com/js/v2'
      script.onload = () => { inicializarForm(data); resolve() }
      script.onerror = () => {
        setError('No se pudo cargar Mercado Pago. Verifica tu conexión.')
        resolve()
      }
      document.body.appendChild(script)
    })
  }

  function inicializarForm(data) {
    // Espera un tick para asegurar que los divs del DOM ya están montados
    setTimeout(() => {
      try {
        const mp = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'es-MX' })
        const form = mp.cardForm({
          amount: String(data?.monto || trabajo.precio_acordado || trabajo.presupuesto),
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número de tarjeta' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/YY' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Nombre en la tarjeta' },
            issuer: { id: 'form-checkout__issuer' },
            installments: { id: 'form-checkout__installments' },
          },
          callbacks: {
            onFormMounted: (err) => {
              if (err) {
                console.error('Error montando formulario MP:', err)
                setError('No se pudo cargar el formulario de pago. Reintenta.')
                return
              }
              setMpListo(true)
            },
            onSubmit: async (event) => {
              event.preventDefault()
              console.log('onSubmit disparado')
              await procesarPago(form.getCardFormData())
            },
            onFetching: (resource) => {
              if (resource === 'installments') setProcesando(false)
            }
          }
        })
        setCardForm(form)
      } catch (e) {
        console.error('Error inicializando MP cardForm:', e)
        setError('No se pudo iniciar el formulario de pago.')
      }
    }, 100)
  }

  async function procesarPago(formData) {
    setProcesando(true)
    setError('')
    try {
      const { token, issuerId, paymentMethodId, installments } = formData
      const { data: userData } = await supabase.auth.getUser()
      const email = userData?.user?.email || 'cliente@chamba.mx'

      // Crear el pago en MP vía nuestra edge function
      const { data, error: fnError } = await supabase.functions.invoke('crear-pago-mp', {
        body: {
          trabajoId: trabajo.id,
          token,
          issuerId,
          paymentMethodId,
          installments,
          email,
          guardarTarjeta,
        }
      })

      if (fnError || !data?.ok) {
        setError(data?.error || 'El pago fue rechazado. Verifica tu tarjeta.')
        setProcesando(false)
        return
      }

      onPagoExitoso()
    } catch {
      setError('Error al procesar el pago. Intenta de nuevo.')
      setProcesando(false)
    }
  }

  async function pagarConGuardada() {
    if (!cvv || cvv.length < 3) { setError('Ingresa el CVV de tu tarjeta.'); return }
    setProcesando(true)
    setError('')
    try {
      const mp = new window.MercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY, { locale: 'es-MX' })
      const { id: token } = await mp.createCardToken({
        cardId: tarjetaGuardada.id,
        securityCode: cvv,
      })

      const { data: userData } = await supabase.auth.getUser()

      const { data, error: fnError } = await supabase.functions.invoke('crear-pago-mp', {
        body: {
          trabajoId: trabajo.id,
          token,
          issuerId: tarjetaGuardada.issuer.id,
          paymentMethodId: tarjetaGuardada.payment_method.id,
          installments: 1,
          email: userData?.user?.email || 'cliente@chamba.mx',
          guardarTarjeta: false,
        }
      })

      if (fnError || !data?.ok) {
        setError(data?.error || 'El pago fue rechazado.')
        setProcesando(false)
        return
      }

      onPagoExitoso()
    } catch {
      setError('Error al procesar el pago. Intenta de nuevo.')
      setProcesando(false)
    }
  }

  const inputStyle = {
    width: '100%', height: '48px', background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px',
    padding: '0 14px', color: 'white', fontSize: '15px', fontFamily: 'sans-serif',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onCancelar} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>💳 Pagar trabajo</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Resumen del trabajo */}
        {config && (
          <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '4px', fontWeight: '600' }}>{trabajo.categoria}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>🔐 Retenido hasta confirmar el trabajo</p>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '800', color: '#1D9E75' }}>${config.totalCliente} MXN</p>
          </div>
        )}

        {cargando && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p>Preparando tu pago seguro...</p>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: '#F09595', fontSize: '13px', marginBottom: '16px' }}>{error}</p>
            <button type="button" onClick={iniciarPago}
              style={{ padding: '12px 24px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && (
          <>
            {/* Tarjeta guardada */}
            {tarjetaGuardada && (
              <div style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '14px', padding: '16px' }}>
                <p style={{ fontSize: '12px', color: '#378ADD', fontWeight: '700', marginBottom: '10px' }}>💳 TARJETA GUARDADA</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '600' }}>{tarjetaGuardada.payment_method?.name?.toUpperCase()} ···· {tarjetaGuardada.last_four_digits}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Vence {tarjetaGuardada.expiration_month}/{tarjetaGuardada.expiration_year}</p>
                  </div>
                  <button type="button" onClick={() => setUsarGuardada(!usarGuardada)}
                    style={{ fontSize: '12px', color: usarGuardada ? '#1D9E75' : 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    {usarGuardada ? '✅ Usar esta' : 'Usar otra'}
                  </button>
                </div>
                {usarGuardada && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      type="number" placeholder="CVV" value={cvv}
                      onChange={e => setCvv(e.target.value)} maxLength={4}
                      style={{ ...inputStyle, width: '120px' }}
                    />
                    <button type="button" onClick={pagarConGuardada} disabled={procesando}
                      style={{ width: '100%', padding: '16px', background: procesando ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: procesando ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
                      {procesando ? 'Procesando...' : `💳 Pagar $${config?.totalCliente} MXN`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Formulario nueva tarjeta */}
            {(!tarjetaGuardada || !usarGuardada) && (
              <div id="form-checkout" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div id="form-checkout__cardNumber" style={{ ...inputStyle, display: 'flex', alignItems: 'center' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div id="form-checkout__expirationDate" style={{ ...inputStyle, display: 'flex', alignItems: 'center' }} />
                  <div id="form-checkout__securityCode" style={{ ...inputStyle, display: 'flex', alignItems: 'center' }} />
                </div>
                <input id="form-checkout__cardholderName" type="text" placeholder="Nombre en la tarjeta" style={inputStyle} />
                <select id="form-checkout__issuer" style={{ ...inputStyle, display: 'none' }} />
                <select id="form-checkout__installments" style={{ ...inputStyle, background: '#1A1A1A' }} />

                {!mpListo && (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>⏳ Cargando formulario seguro de Mercado Pago...</p>
                )}

                {/* Opción guardar tarjeta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
                  <input type="checkbox" id="guardar" checked={guardarTarjeta} onChange={e => setGuardarTarjeta(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#1D9E75', cursor: 'pointer' }} />
                  <label htmlFor="guardar" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                    💾 Guardar tarjeta para futuros pagos
                  </label>
                </div>

                <button type="button" disabled={!mpListo || procesando}
                  onClick={() => {
                    console.log('Click en pagar, mpListo:', mpListo)
                    const formEl = document.getElementById('form-checkout')
                    if (formEl) formEl.requestSubmit ? formEl.requestSubmit() : formEl.submit()
                  }}
                  style={{ width: '100%', padding: '16px', background: (!mpListo || procesando) ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: (!mpListo || procesando) ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
                  {procesando ? 'Procesando...' : mpListo ? `💳 Pagar $${config?.totalCliente || trabajo.presupuesto} MXN` : 'Cargando...'}
                </button>
              </div>
            )}

            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
              Encriptado por Mercado Pago 🔒
            </p>
          </>
        )}
      </div>
    </div>
  )
}
