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

export default function VistaTrabajador({ onLogout, userEmail }) {
  const [trabajos, setTrabajos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState(null)
  const [aceptando, setAceptando] = useState(false)
  const [exitoAceptar, setExitoAceptar] = useState(false)

  useEffect(() => {
    cargarTrabajos()
  }, [])

  async function cargarTrabajos() {
    setCargando(true)
    const { data, error } = await supabase
      .from('trabajos')
      .select('*')
      .eq('status', 'publicado')
      .order('creado_en', { ascending: false })

    if (data) setTrabajos(data)
    setCargando(false)
  }

  async function aceptarTrabajo(trabajo) {
    setAceptando(true)
    const { error } = await supabase
      .from('trabajos')
      .update({ status: 'aceptado' })
      .eq('id', trabajo.id)

    if (!error) {
      setExitoAceptar(true)
      setTimeout(() => {
        setExitoAceptar(false)
        setTrabajoSeleccionado(null)
        cargarTrabajos()
      }, 2000)
    }
    setAceptando(false)
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    return `hace ${Math.floor(hrs / 24)} días`
  }

  // ── Detalle del trabajo ──
  if (trabajoSeleccionado) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.1)'
        }}>
          <button type="button" onClick={() => { setTrabajoSeleccionado(null); setExitoAceptar(false) }} style={{
            background: 'transparent', color: 'rgba(255,255,255,0.6)',
            border: 'none', fontSize: '20px', cursor: 'pointer'
          }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Detalle del trabajo</h2>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {exitoAceptar ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
            }}>
              <div style={{ fontSize: '60px' }}>🎉</div>
              <h3 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '700' }}>¡Trabajo aceptado!</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '280px' }}>
                El cliente fue notificado. Prepárate para ir al trabajo.
              </p>
            </div>
          ) : (
            <>
              {/* Header del trabajo */}
              <div style={{
                background: 'rgba(29,158,117,0.08)',
                border: '0.5px solid rgba(29,158,117,0.2)',
                borderRadius: '16px', padding: '20px',
                display: 'flex', alignItems: 'center', gap: '16px'
              }}>
                <span style={{ fontSize: '48px' }}>
                  {CATEGORIAS_ICONS[trabajoSeleccionado.categoria] || '✳️'}
                </span>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
                    {trabajoSeleccionado.categoria}
                  </h3>
                  <span style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75' }}>
                    ${trabajoSeleccionado.presupuesto} MXN
                  </span>
                </div>
              </div>

              {/* Detalles */}
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', overflow: 'hidden'
              }}>
                <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>DESCRIPCIÓN</p>
                  <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)' }}>
                    {trabajoSeleccionado.descripcion}
                  </p>
                </div>
                <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>UBICACIÓN</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    📍 {trabajoSeleccionado.lat?.toFixed(4)}, {trabajoSeleccionado.lng?.toFixed(4)}
                  </p>
                </div>
                <div style={{ padding: '16px 18px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>PUBLICADO</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    🕐 {tiempoTranscurrido(trabajoSeleccionado.creado_en)}
                  </p>
                </div>
              </div>

              {/* Nota de seguridad */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '12px 16px',
                fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5'
              }}>
                🔒 Al aceptar, el pago queda protegido en escrow. Lo recibes cuando el cliente confirme que el trabajo quedó bien.
              </div>

              {/* Botón aceptar */}
              <button
                type="button"
                onClick={() => aceptarTrabajo(trabajoSeleccionado)}
                disabled={aceptando}
                style={{
                  width: '100%', padding: '16px',
                  background: aceptando ? 'rgba(29,158,117,0.5)' : '#1D9E75',
                  color: 'white', border: 'none', borderRadius: '14px',
                  fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: 'sans-serif'
                }}
              >
                {aceptando ? 'Aceptando...' : '✅ Aceptar este trabajo'}
              </button>

              <button type="button" onClick={() => setTrabajoSeleccionado(null)} style={{
                width: '100%', padding: '14px',
                background: 'transparent', color: 'rgba(255,255,255,0.4)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                borderRadius: '14px', fontSize: '15px',
                cursor: 'pointer', fontFamily: 'sans-serif'
              }}>
                Ver otros trabajos
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Lista de trabajos ──
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        <div>
          <h1 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '800' }}>chamba</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Trabajos disponibles cerca</p>
        </div>
        <button type="button" onClick={onLogout} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '8px',
          padding: '6px 12px', fontSize: '12px', cursor: 'pointer'
        }}>
          Salir
        </button>
      </div>

      {/* Lista */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
            Buscando trabajos cerca...
          </div>
        )}

        {!cargando && trabajos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p>No hay trabajos publicados ahorita.</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Regresa más tarde o activa notificaciones.</p>
          </div>
        )}

        {trabajos.map(trabajo => (
          <button
            key={trabajo.id}
            type="button"
            onClick={() => setTrabajoSeleccionado(trabajo)}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '16px 18px',
              cursor: 'pointer', fontFamily: 'sans-serif',
              textAlign: 'left', width: '100%',
              transition: 'border-color 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontSize: '36px' }}>
                {CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>
                    {trabajo.categoria}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75' }}>
                    ${trabajo.presupuesto}
                  </span>
                </div>
                <p style={{
                  fontSize: '13px', color: 'rgba(255,255,255,0.5)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {trabajo.descripcion}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>
                  🕐 {tiempoTranscurrido(trabajo.creado_en)} · 📍 Salina Cruz
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}