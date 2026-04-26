import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const CATEGORIAS_ICONS = {
  'Electricista': '⚡', 'Plomero': '🔧', 'Cocinera': '🍳',
  'Limpieza': '🧹', 'Planchado': '👔', 'Pintor': '🖌️',
  'Cerrajero': '🔑', 'Mecánico': '🔩', 'Téc. celulares': '📱',
  'Fletes': '🚛', 'Costurera': '✂️', 'Clases': '📚',
  'Jardinero': '🌿', 'Lavado autos': '🚗', 'Carpintero': '🪵',
  'Repartidor': '🛵', 'Soldador': '⚓', 'Diseñador gráfico': '🎨',
  'Fotógrafo': '📸', 'Masajista': '💆', 'Veterinario': '🐕',
  'Téc. computadoras': '🖥️', 'Limpieza albercas': '🏊', 'Niñera': '👶',
  'Músico': '🎵', 'Téc. refrigeración': '❄️', 'Enfermera': '💉',
  'Barra de eventos': '🎪', 'Topógrafo': '📐', 'Albañil': '🧱',
}

export default function NegociacionTrabajo({ trabajo, userId, onVolver, onAceptado }) {
  const [ofertas, setOfertas] = useState([])
  const [nuevaOferta, setNuevaOferta] = useState(trabajo.presupuesto)
  const [loading, setLoading] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [exito, setExito] = useState(false)

  const MAX_RONDAS = 3
  const rondasUsadas = trabajo.rondas_negociacion || 0
  const rondasRestantes = MAX_RONDAS - rondasUsadas
  const precioActual = trabajo.ultima_oferta || trabajo.presupuesto
  const esTrabajador = true // en esta vista siempre es el trabajador

  useEffect(() => {
    cargarOfertas()
  }, [])

  async function cargarOfertas() {
    setCargando(true)
    const { data } = await supabase
      .from('negociaciones')
      .select('*')
      .eq('trabajo_id', trabajo.id)
      .order('creado_en', { ascending: true })
    if (data) setOfertas(data)
    setCargando(false)
  }

  async function hacerContraoferta() {
    if (nuevaOferta === precioActual) return
    if (rondasRestantes <= 0) return

    setLoading(true)

    // Guardar la negociación
    await supabase.from('negociaciones').insert({
      trabajo_id: trabajo.id,
      ofertado_por: 'trabajador',
      monto: nuevaOferta,
    })

    // Actualizar el trabajo
    await supabase.from('trabajos').update({
      ultima_oferta: nuevaOferta,
      quien_oferto: 'trabajador',
      rondas_negociacion: rondasUsadas + 1,
    }).eq('id', trabajo.id)

    await cargarOfertas()
    setLoading(false)
  }

  async function aceptarPrecio() {
    setLoading(true)
    await supabase.from('trabajos').update({
      status: 'aceptado',
      precio_acordado: precioActual,
    }).eq('id', trabajo.id)
    setExito(true)
    setLoading(false)
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    return `hace ${Math.floor(min / 60)} hrs`
  }

  // ── Pantalla de éxito ──
  if (exito) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0D0D0D',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🤝</div>
        <h2 style={{ color: '#1D9E75', fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>
          ¡Trabajo aceptado!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px', maxWidth: '300px' }}>
          Precio acordado:
        </p>
        <p style={{ color: '#1D9E75', fontSize: '32px', fontWeight: '800', marginBottom: '24px' }}>
          ${precioActual} MXN
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '32px', maxWidth: '280px' }}>
          El cliente fue notificado. El pago quedará en escrow cuando confirme.
        </p>
        <button type="button" onClick={onAceptado} style={{
          background: '#1D9E75', color: 'white', border: 'none',
          borderRadius: '12px', padding: '14px 32px',
          fontSize: '15px', fontWeight: '500', cursor: 'pointer',
          fontFamily: 'sans-serif'
        }}>
          Ver mis trabajos
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 20px',
        borderBottom: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        <button type="button" onClick={onVolver} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.6)',
          border: 'none', fontSize: '20px', cursor: 'pointer'
        }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Negociar trabajo</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Info del trabajo */}
        <div style={{
          background: 'rgba(29,158,117,0.08)',
          border: '0.5px solid rgba(29,158,117,0.2)',
          borderRadius: '16px', padding: '18px',
          display: 'flex', alignItems: 'center', gap: '14px'
        }}>
          <span style={{ fontSize: '40px' }}>
            {CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}
          </span>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
              {trabajo.categoria}
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
              {trabajo.descripcion}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              Presupuesto inicial del cliente: <span style={{ color: 'white' }}>${trabajo.presupuesto} MXN</span>
            </p>
          </div>
        </div>

        {/* Historial de ofertas */}
        {!cargando && ofertas.length > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Historial de negociación
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

              {/* Oferta inicial del cliente */}
              <div style={{
                display: 'flex', justifyContent: 'flex-start'
              }}>
                <div style={{
                  background: 'rgba(55,138,221,0.15)',
                  border: '0.5px solid rgba(55,138,221,0.3)',
                  borderRadius: '12px', padding: '10px 14px',
                  maxWidth: '70%'
                }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>Cliente (oferta inicial)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#378ADD' }}>${trabajo.presupuesto} MXN</p>
                </div>
              </div>

              {ofertas.map((oferta, i) => (
                <div key={oferta.id} style={{
                  display: 'flex',
                  justifyContent: oferta.ofertado_por === 'trabajador' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    background: oferta.ofertado_por === 'trabajador'
                      ? 'rgba(29,158,117,0.15)' : 'rgba(55,138,221,0.15)',
                    border: `0.5px solid ${oferta.ofertado_por === 'trabajador'
                      ? 'rgba(29,158,117,0.3)' : 'rgba(55,138,221,0.3)'}`,
                    borderRadius: '12px', padding: '10px 14px',
                    maxWidth: '70%'
                  }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>
                      {oferta.ofertado_por === 'trabajador' ? 'Tu contraoferta' : 'Cliente'} · {tiempoTranscurrido(oferta.creado_en)}
                    </p>
                    <p style={{
                      fontSize: '18px', fontWeight: '700',
                      color: oferta.ofertado_por === 'trabajador' ? '#1D9E75' : '#378ADD'
                    }}>
                      ${oferta.monto} MXN
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Precio actual */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: '14px', padding: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Precio actual</p>
            <p style={{ fontSize: '24px', fontWeight: '800', color: '#1D9E75' }}>${precioActual} MXN</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Rondas restantes</p>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
              {Array.from({ length: MAX_RONDAS }).map((_, i) => (
                <div key={i} style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: i < rondasRestantes ? '#1D9E75' : 'rgba(255,255,255,0.15)'
                }} />
              ))}
            </div>
            <p style={{ fontSize: '11px', color: rondasRestantes === 0 ? '#F09595' : 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              {rondasRestantes === 0 ? 'Sin más rondas' : `${rondasRestantes} de ${MAX_RONDAS}`}
            </p>
          </div>
        </div>

        {/* Contraoferta */}
        {rondasRestantes > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tu contraoferta
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <input type="range" min="100" max="5000" step="50"
                value={nuevaOferta}
                onChange={e => setNuevaOferta(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#1D9E75' }}
              />
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#1D9E75', minWidth: '100px', textAlign: 'right' }}>
                ${nuevaOferta} MXN
              </span>
            </div>
            {nuevaOferta > precioActual && (
              <div style={{
                background: 'rgba(186,117,23,0.1)', border: '0.5px solid rgba(186,117,23,0.3)',
                borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#E8A030'
              }}>
                ↑ Estás pidiendo ${nuevaOferta - precioActual} MXN más que el precio actual
              </div>
            )}
            {nuevaOferta < precioActual && (
              <div style={{
                background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)',
                borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#5DCAA5'
              }}>
                ↓ Estás aceptando ${precioActual - nuevaOferta} MXN menos
              </div>
            )}
          </div>
        )}

        {rondasRestantes === 0 && (
          <div style={{
            background: 'rgba(240,149,149,0.1)', border: '0.5px solid rgba(240,149,149,0.3)',
            borderRadius: '12px', padding: '12px 16px',
            fontSize: '13px', color: '#F09595', textAlign: 'center'
          }}>
            Se agotaron las rondas de negociación. Solo puedes aceptar o rechazar el precio actual.
          </div>
        )}

        {/* Botones */}
        <button type="button" onClick={aceptarPrecio} disabled={loading} style={{
          width: '100%', padding: '16px',
          background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75',
          color: 'white', border: 'none', borderRadius: '14px',
          fontSize: '16px', fontWeight: '600', cursor: 'pointer',
          fontFamily: 'sans-serif'
        }}>
          {loading ? 'Procesando...' : `✅ Aceptar $${precioActual} MXN`}
        </button>

        {rondasRestantes > 0 && nuevaOferta !== precioActual && (
          <button type="button" onClick={hacerContraoferta} disabled={loading} style={{
            width: '100%', padding: '14px',
            background: 'transparent', color: '#1D9E75',
            border: '1.5px solid #1D9E75', borderRadius: '14px',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            fontFamily: 'sans-serif'
          }}>
            💬 Enviar contraoferta de ${nuevaOferta} MXN
          </button>
        )}

        <button type="button" onClick={onVolver} style={{
          width: '100%', padding: '14px',
          background: 'transparent', color: 'rgba(255,255,255,0.3)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: '14px', fontSize: '14px',
          cursor: 'pointer', fontFamily: 'sans-serif'
        }}>
          Rechazar trabajo
        </button>

      </div>
    </div>
  )
}