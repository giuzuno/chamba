import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import NegociacionTrabajo from './NegociacionTrabajo'

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

export default function VistaTrabajador({ onLogout, userEmail, userId }) {
  const [trabajos, setTrabajos] = useState([])
  const [misTrabajos, setMisTrabajos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState(null)
  const [exitoAceptar, setExitoAceptar] = useState(false)
  const [negociando, setNegociando] = useState(null)
  const [pestana, setPestana] = useState('disponibles')

  useEffect(() => {
    cargarTrabajos()
    cargarMisTrabajos()
  }, [])

  async function cargarTrabajos() {
    setCargando(true)
    const { data } = await supabase
      .from('trabajos')
      .select('*')
      .eq('status', 'publicado')
      .order('creado_en', { ascending: false })
    if (data) setTrabajos(data)
    setCargando(false)
  }

  async function cargarMisTrabajos() {
    const { data } = await supabase
      .from('trabajos')
      .select('*')
      .eq('status', 'aceptado')
      .order('creado_en', { ascending: false })
    if (data) setMisTrabajos(data)
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    return `hace ${Math.floor(hrs / 24)} días`
  }

  // ── Negociación — siempre va primero ──
  if (negociando) {
    return (
      <NegociacionTrabajo
        trabajo={negociando}
        userId={userId}
        onVolver={() => setNegociando(null)}
        onAceptado={() => {
          setNegociando(null)
          setTrabajoSeleccionado(null)
          cargarTrabajos()
          cargarMisTrabajos()
          setPestana('mis')
        }}
      />
    )
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
                    ${trabajoSeleccionado.ultima_oferta || trabajoSeleccionado.presupuesto} MXN
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

              {/* Nota escrow */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', padding: '12px 16px',
                fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5'
              }}>
                🔒 Al aceptar, el pago queda protegido en escrow. Lo recibes cuando el cliente confirme que el trabajo quedó bien.
              </div>

              <button type="button"
                onClick={() => setNegociando(trabajoSeleccionado)}
                style={{
                  width: '100%', padding: '16px',
                  background: '#1D9E75', color: 'white', border: 'none',
                  borderRadius: '14px', fontSize: '16px', fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'sans-serif'
                }}>
                💬 Ver y negociar precio
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

  // ── Lista principal ──
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
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            {pestana === 'disponibles' ? 'Trabajos disponibles cerca' : 'Mis trabajos aceptados'}
          </p>
        </div>
        <button type="button" onClick={onLogout} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '8px',
          padding: '6px 12px', fontSize: '12px', cursor: 'pointer'
        }}>
          Salir
        </button>
      </div>

      {/* Pestañas */}
      <div style={{
        display: 'flex', gap: '8px', padding: '10px 16px',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        background: '#0D0D0D'
      }}>
        <button type="button" onClick={() => setPestana('disponibles')} style={{
          flex: 1, padding: '9px',
          background: pestana === 'disponibles' ? '#1D9E75' : 'rgba(255,255,255,0.06)',
          color: pestana === 'disponibles' ? 'white' : 'rgba(255,255,255,0.5)',
          border: 'none', borderRadius: '10px',
          fontSize: '13px', fontWeight: pestana === 'disponibles' ? '600' : '400',
          cursor: 'pointer', fontFamily: 'sans-serif'
        }}>
          🔍 Disponibles {trabajos.length > 0 && `(${trabajos.length})`}
        </button>
        <button type="button" onClick={() => setPestana('mis')} style={{
          flex: 1, padding: '9px',
          background: pestana === 'mis' ? '#1D9E75' : 'rgba(255,255,255,0.06)',
          color: pestana === 'mis' ? 'white' : 'rgba(255,255,255,0.5)',
          border: 'none', borderRadius: '10px',
          fontSize: '13px', fontWeight: pestana === 'mis' ? '600' : '400',
          cursor: 'pointer', fontFamily: 'sans-serif'
        }}>
          ✅ Mis trabajos {misTrabajos.length > 0 && `(${misTrabajos.length})`}
        </button>
      </div>

      {/* Contenido */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* ── Pestaña disponibles ── */}
        {pestana === 'disponibles' && (
          <>
            {cargando && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
                Buscando trabajos cerca...
              </div>
            )}
            {!cargando && trabajos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p>No hay trabajos publicados ahorita.</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>Regresa más tarde.</p>
              </div>
            )}
            {trabajos.map(trabajo => (
              <button key={trabajo.id} type="button"
                onClick={() => setTrabajoSeleccionado(trabajo)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px', padding: '16px 18px',
                  cursor: 'pointer', fontFamily: 'sans-serif',
                  textAlign: 'left', width: '100%'
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
                        ${trabajo.ultima_oferta || trabajo.presupuesto}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {trabajo.descripcion}
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>
                      🕐 {tiempoTranscurrido(trabajo.creado_en)} · 📍 Salina Cruz
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}

        {/* ── Pestaña mis trabajos ── */}
        {pestana === 'mis' && (
          <>
            {misTrabajos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
                <p>No has aceptado trabajos todavía.</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>Busca trabajos disponibles y acepta uno.</p>
              </div>
            )}
            {misTrabajos.map(trabajo => (
              <div key={trabajo.id} style={{
                background: 'rgba(29,158,117,0.06)',
                border: '0.5px solid rgba(29,158,117,0.2)',
                borderRadius: '16px', padding: '16px 18px'
              }}>
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
                        ${trabajo.precio_acordado || trabajo.presupuesto}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {trabajo.descripcion}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#1D9E75', fontWeight: '500' }}>
                        ✅ Aceptado
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>·</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                        Pago en escrow al confirmar
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  )
}