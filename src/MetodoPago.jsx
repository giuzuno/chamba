import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

// Llave pública de Conekta — segura de exponer en el frontend.
// En modo pruebas usa la que generaste en el dashboard (key_...).
// Cuando tu cuenta de Conekta esté validada, cámbiala por la de producción.
const CONEKTA_PUBLIC_KEY = 'key_JN0NNZcX3StJriorgWxUN7F'

const EDGE_FUNCTION_URL = `${supabase.supabaseUrl}/functions/v1/cobrar-trabajo`

export default function MetodoPago({ userId, montoMXN, descripcion, onPagoExitoso, onCancelar }) {
  const [tarjetas, setTarjetas] = useState([])
  const [cargandoTarjetas, setCargandoTarjetas] = useState(true)
  const [seleccion, setSeleccion] = useState(null) // id de tarjeta guardada | 'nueva' | 'efectivo'
  const [guardarNueva, setGuardarNueva] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [resultadoEfectivo, setResultadoEfectivo] = useState(null)
  const [componentListo, setComponentListo] = useState(false)
  const tokenRef = useRef(null) // guarda el token_id generado por el Component

  useEffect(() => {
    cargarTarjetas()
    cargarConektaScript()
  }, [])

  async function cargarTarjetas() {
    const { data } = await supabase.from('tarjetas_guardadas').select('*').eq('usuario_id', userId).order('creado_en', { ascending: false })
    if (data) setTarjetas(data)
    setSeleccion(data && data.length > 0 ? data[0].id : 'efectivo')
    setCargandoTarjetas(false)
  }

  function cargarConektaScript() {
    console.log('[Conekta] Verificando si el script ya existe...')
    if (window.ConektaCheckoutComponents) {
      console.log('[Conekta] Ya estaba cargado')
      setComponentListo(true)
      return
    }
    console.log('[Conekta] Cargando script desde CDN...')
    const script = document.createElement('script')
    script.src = 'https://pay.conekta.com/v1.0/js/conekta-checkout.min.js'
    script.type = 'text/javascript'
    script.onload = () => {
      console.log('[Conekta] Script cargado, window.ConektaCheckoutComponents existe:', !!window.ConektaCheckoutComponents)
      setComponentListo(true)
    }
    script.onerror = (e) => console.error('[Conekta] Error cargando el script:', e)
    document.body.appendChild(script)
  }

  function montarFormularioTarjeta() {
    console.log('[Conekta] Intentando montar formulario...')
    if (!window.ConektaCheckoutComponents) {
      console.error('[Conekta] window.ConektaCheckoutComponents no existe todavía')
      return
    }
    const div = document.getElementById('conekta-iframe-tarjeta')
    console.log('[Conekta] Div destino encontrado:', !!div)

    const config = {
      publicKey: CONEKTA_PUBLIC_KEY,
      targetIFrame: '#conekta-iframe-tarjeta',
      locale: 'es',
      allowTokenization: true,
    }
    const callbacks = {
      onCreateTokenSucceeded: (token) => {
        console.log('[Conekta] Token creado con éxito:', token.id)
        tokenRef.current = token.id
        setError('')
      },
      onCreateTokenError: (err) => {
        console.error('[Conekta] Error al crear token:', err)
        setError(err.message_to_purchaser || 'No pudimos validar tu tarjeta, revisa los datos')
      },
      onGetInfoSuccess: (info) => {
        console.log('[Conekta] Formulario cargado correctamente:', info)
      },
    }
    console.log('[Conekta] Llamando a Card() con config:', config)
    window.ConektaCheckoutComponents.Card({ config, callbacks })
  }

  useEffect(() => {
    if (seleccion === 'nueva' && componentListo) {
      setTimeout(montarFormularioTarjeta, 300) // esperar a que el div del iframe exista en el DOM
    }
  }, [seleccion, componentListo])

  async function confirmarPago() {
    setError('')
    setProcesando(true)

    let body = { userId, montoMXN, descripcion }

    if (seleccion === 'efectivo') {
      body.metodo = 'efectivo'
    } else if (seleccion === 'nueva') {
      if (!tokenRef.current) {
        setError('Completa los datos de tu tarjeta')
        setProcesando(false)
        return
      }
      body.metodo = 'tarjeta_nueva'
      body.tokenId = tokenRef.current
      body.guardarTarjeta = guardarNueva
    } else {
      body.metodo = 'tarjeta_guardada'
      body.paymentSourceId = seleccion
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData?.session?.access_token || ''}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok || !data.exito) {
        setError(data.error || 'No se pudo procesar el pago')
        setProcesando(false)
        return
      }

      if (data.metodo === 'efectivo') {
        setResultadoEfectivo(data)
        setProcesando(false)
        return
      }

      // Pago con tarjeta exitoso
      onPagoExitoso({
        metodo: 'tarjeta',
        ordenId: data.ordenId,
        paymentSourceId: data.paymentSourceId,
      })

    } catch (e) {
      setError('Error de conexión, intenta de nuevo')
      setProcesando(false)
    }
  }

  function reintentarTarjeta() {
    setError('')
    setSeleccion(tarjetas.length > 0 ? tarjetas[0].id : 'nueva')
  }

  function cambiarAEfectivo() {
    setError('')
    setSeleccion('efectivo')
  }

  if (resultadoEfectivo) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🧾</div>
        <p style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>Código generado</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5', marginBottom: '16px' }}>
          Muestra este código en cualquier OXXO, 7-Eleven o tienda participante. Vence en 48 horas.
        </p>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
          <p style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '0.05em', color: '#1D9E75' }}>{resultadoEfectivo.referenciaEfectivo}</p>
        </div>
        <button type="button" onClick={() => onPagoExitoso({ metodo: 'efectivo', ordenId: resultadoEfectivo.ordenId, referenciaEfectivo: resultadoEfectivo.referenciaEfectivo, vigenciaEfectivo: resultadoEfectivo.vigenciaEfectivo })}
          style={{ width: '100%', padding: '14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Continuar
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px' }}>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vas a pagar</p>
      <p style={{ fontSize: '26px', fontWeight: '800', color: 'white', marginBottom: '16px' }}>${montoMXN} <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: '400' }}>MXN</span></p>

      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: '500' }}>Método de pago</p>

      {cargandoTarjetas ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Cargando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {tarjetas.map(t => (
            <button key={t.id} type="button" onClick={() => setSeleccion(t.conekta_payment_source_id)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left',
                background: seleccion === t.conekta_payment_source_id ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.04)',
                border: seleccion === t.conekta_payment_source_id ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '18px' }}>💳</span>
              <span style={{ fontSize: '14px', color: 'white', flex: 1 }}>{t.marca || 'Tarjeta'} terminación {t.ultimos_4}</span>
              {seleccion === t.conekta_payment_source_id && <span style={{ color: '#1D9E75' }}>✓</span>}
            </button>
          ))}

          <button type="button" onClick={() => setSeleccion('efectivo')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left',
              background: seleccion === 'efectivo' ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.04)',
              border: seleccion === 'efectivo' ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '18px' }}>🏪</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', color: 'white', margin: 0 }}>Pagar en efectivo</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>OXXO, 7-Eleven, Círculo K y más</p>
            </div>
            {seleccion === 'efectivo' && <span style={{ color: '#1D9E75' }}>✓</span>}
          </button>

          <button type="button" onClick={() => setSeleccion('nueva')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: '14px',
              background: seleccion === 'nueva' ? 'rgba(29,158,117,0.15)' : 'transparent',
              border: seleccion === 'nueva' ? '1.5px solid #1D9E75' : '0.5px dashed rgba(255,255,255,0.2)', color: seleccion === 'nueva' ? '#1D9E75' : 'rgba(255,255,255,0.6)' }}>
            + Agregar nueva tarjeta
          </button>
        </div>
      )}

      {seleccion === 'nueva' && (
        <div style={{ marginBottom: '12px' }}>
          <div id="conekta-iframe-tarjeta" style={{ minHeight: '380px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '10px' }}>
            <input type="checkbox" checked={guardarNueva} onChange={e => setGuardarNueva(e.target.checked)} />
            Guardar tarjeta para futuros trabajos
          </label>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '10px', padding: '12px 14px', marginBottom: '12px' }}>
          <p style={{ fontSize: '13px', color: '#E8A030', marginBottom: '8px' }}>⚠️ {error}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={reintentarTarjeta} style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Reintentar tarjeta</button>
            <button type="button" onClick={cambiarAEfectivo} style={{ flex: 1, padding: '8px', fontSize: '12px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Pagar en efectivo</button>
          </div>
        </div>
      )}

      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '14px' }}>
        🔒 El cargo solo se hace si tu trabajo se publica
      </p>

      <button type="button" onClick={confirmarPago} disabled={procesando}
        style={{ width: '100%', padding: '14px', background: procesando ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '8px' }}>
        {procesando ? 'Procesando...' : 'Confirmar pago'}
      </button>
      <button type="button" onClick={onCancelar} style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        Cancelar
      </button>
    </div>
  )
}
