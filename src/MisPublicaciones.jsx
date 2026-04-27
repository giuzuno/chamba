import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import AgendarCita from './AgendarCita'

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

export default function MisPublicaciones({ onVolver, userId }) {
  const [trabajos, setTrabajos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState(null)
  const [negociaciones, setNegociaciones] = useState([])
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [exitoAccion, setExitoAccion] = useState('')
  const [agendando, setAgendando] = useState(null)
  const [citaConfirmada, setCitaConfirmada] = useState(null)

  useEffect(() => {
    cargarMisTrabajos()
  }, [])

  async function cargarMisTrabajos() {
    setCargando(true)
    const { data } = await supabase
      .from('trabajos')
      .select('*')
      .order('creado_en', { ascending: false })
    if (data) setTrabajos(data)
    setCargando(false)
  }

  async function cargarNegociaciones(trabajoId) {
    const { data } = await supabase
      .from('negociaciones')
      .select('*')
      .eq('trabajo_id', trabajoId)
      .order('creado_en', { ascending: true })
    if (data) setNegociaciones(data)
  }

  async function seleccionarTrabajo(trabajo) {
    setExitoAccion('')
    setTrabajoSeleccionado(trabajo)
    await cargarNegociaciones(trabajo.id)
  }

  async function aceptarContraoferta(trabajo) {
    setLoadingAccion(true)
    const precioFinal = trabajo.ultima_oferta || trabajo.presupuesto
    await supabase.from('trabajos').update({
      status: 'aceptado',
      precio_acordado: precioFinal,
    }).eq('id', trabajo.id)
    setExitoAccion(`¡Aceptaste la contraoferta de $${precioFinal} MXN!`)
    await cargarMisTrabajos()
    setLoadingAccion(false)
  }

  async function rechazarContraoferta(trabajo) {
    setLoadingAccion(true)
    await supabase.from('trabajos').update({
      ultima_oferta: null,
      quien_oferto: null,
      rondas_negociacion: (trabajo.rondas_negociacion || 0) + 1,
    }).eq('id', trabajo.id)
    setExitoAccion('Contraoferta rechazada. El trabajador puede intentar de nuevo.')
    await cargarMisTrabajos()
    await cargarNegociaciones(trabajo.id)
    setTrabajoSeleccionado(prev => ({ ...prev, ultima_oferta: null, quien_oferto: null }))
    setLoadingAccion(false)
  }

  async function cancelarTrabajo(trabajo) {
    setLoadingAccion(true)
    await supabase.from('trabajos').update({ status: 'cancelado' }).eq('id', trabajo.id)
    setTrabajoSeleccionado(null)
    await cargarMisTrabajos()
    setLoadingAccion(false)
  }

  async function confirmarCompletado(trabajo) {
    setLoadingAccion(true)
    await supabase.from('trabajos').update({ status: 'completado' }).eq('id', trabajo.id)
    setExitoAccion(`✅ Pago de $${trabajo.precio_acordado || trabajo.presupuesto} MXN liberado al trabajador. ¡Gracias por usar Chamba!`)
    await cargarMisTrabajos()
    setLoadingAccion(false)
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    return `hace ${Math.floor(hrs / 24)} días`
  }

  function statusBadge(trabajo) {
    const s = trabajo.status
    if (s === 'publicado' && trabajo.quien_oferto === 'trabajador')
      return { texto: '💬 Contraoferta recibida', bg: 'rgba(186,117,23,0.15)', color: '#E8A030', border: 'rgba(186,117,23,0.4)' }
    if (s === 'publicado')
      return { texto: '⏳ Esperando trabajadores', bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' }
    if (s === 'aceptado')
      return { texto: '✅ Trabajo aceptado', bg: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: 'rgba(29,158,117,0.3)' }
    if (s === 'completado')
      return { texto: '🏁 Completado', bg: 'rgba(29,158,117,0.2)', color: '#1D9E75', border: 'rgba(29,158,117,0.4)' }
    if (s === 'cancelado')
      return { texto: '❌ Cancelado', bg: 'rgba(240,149,149,0.1)', color: '#F09595', border: 'rgba(240,149,149,0.3)' }
    return { texto: s, bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' }
  }

  // ── Agendar cita ── va primero
  if (agendando) {
    return (
      <AgendarCita
        trabajo={agendando}
        onVolver={() => setAgendando(null)}
        onConfirmado={(cita) => {
          setCitaConfirmada(cita)
          setAgendando(null)
          cargarMisTrabajos()
        }}
      />
    )
  }

  // ── Detalle del trabajo ──
  if (trabajoSeleccionado) {
    const badge = statusBadge(trabajoSeleccionado)
    const tieneContraoferta = trabajoSeleccionado.quien_oferto === 'trabajador' && trabajoSeleccionado.ultima_oferta

    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.1)'
        }}>
          <button type="button" onClick={() => { setTrabajoSeleccionado(null); setExitoAccion('') }} style={{
            background: 'transparent', color: 'rgba(255,255,255,0.6)',
            border: 'none', fontSize: '20px', cursor: 'pointer'
          }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Mi publicación</h2>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {exitoAccion && (
            <div style={{
              background: 'rgba(29,158,117,0.12)', border: '0.5px solid rgba(29,158,117,0.4)',
              borderRadius: '12px', padding: '12px 16px',
              fontSize: '13px', color: '#5DCAA5', textAlign: 'center'
            }}>
              {exitoAccion}
            </div>
          )}

          {/* Header */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '18px',
            display: 'flex', alignItems: 'center', gap: '14px'
          }}>
            <span style={{ fontSize: '44px' }}>
              {CATEGORIAS_ICONS[trabajoSeleccionado.categoria] || '✳️'}
            </span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '19px', fontWeight: '700', marginBottom: '4px' }}>
                {trabajoSeleccionado.categoria}
              </h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
                {trabajoSeleccionado.descripcion}
              </p>
              <span style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '100px',
                background: badge.bg, color: badge.color, border: `0.5px solid ${badge.border}`,
                fontWeight: '500'
              }}>
                {badge.texto}
              </span>
            </div>
          </div>

          {/* Precios */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Tu presupuesto inicial</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>${trabajoSeleccionado.presupuesto} MXN</span>
            </div>
            {trabajoSeleccionado.ultima_oferta && (
              <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#E8A030' }}>Contraoferta del trabajador</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#E8A030' }}>${trabajoSeleccionado.ultima_oferta} MXN</span>
              </div>
            )}
            {trabajoSeleccionado.precio_acordado && (
              <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#1D9E75' }}>Precio acordado final</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#1D9E75' }}>${trabajoSeleccionado.precio_acordado} MXN</span>
              </div>
            )}
          </div>

          {/* Historial negociación */}
          {negociaciones.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Historial de negociación
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{
                    background: 'rgba(55,138,221,0.15)', border: '0.5px solid rgba(55,138,221,0.3)',
                    borderRadius: '12px', padding: '10px 14px', maxWidth: '70%'
                  }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>Tú (oferta inicial)</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#378ADD' }}>${trabajoSeleccionado.presupuesto} MXN</p>
                  </div>
                </div>
                {negociaciones.map(n => (
                  <div key={n.id} style={{
                    display: 'flex',
                    justifyContent: n.ofertado_por === 'trabajador' ? 'flex-start' : 'flex-end'
                  }}>
                    <div style={{
                      background: n.ofertado_por === 'trabajador' ? 'rgba(186,117,23,0.15)' : 'rgba(55,138,221,0.15)',
                      border: `0.5px solid ${n.ofertado_por === 'trabajador' ? 'rgba(186,117,23,0.3)' : 'rgba(55,138,221,0.3)'}`,
                      borderRadius: '12px', padding: '10px 14px', maxWidth: '70%'
                    }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>
                        {n.ofertado_por === 'trabajador' ? 'Trabajador' : 'Tú'} · {tiempoTranscurrido(n.creado_en)}
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: n.ofertado_por === 'trabajador' ? '#E8A030' : '#378ADD' }}>
                        ${n.monto} MXN
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contraoferta pendiente */}
          {tieneContraoferta && trabajoSeleccionado.status === 'publicado' && !exitoAccion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                El trabajador pide <strong style={{ color: '#E8A030' }}>${trabajoSeleccionado.ultima_oferta} MXN</strong> — ¿qué decides?
              </p>
              <button type="button" onClick={() => aceptarContraoferta(trabajoSeleccionado)} disabled={loadingAccion} style={{
                width: '100%', padding: '15px',
                background: '#1D9E75', color: 'white', border: 'none',
                borderRadius: '14px', fontSize: '15px', fontWeight: '600',
                cursor: 'pointer', fontFamily: 'sans-serif'
              }}>
                ✅ Aceptar ${trabajoSeleccionado.ultima_oferta} MXN
              </button>
              <button type="button" onClick={() => rechazarContraoferta(trabajoSeleccionado)} disabled={loadingAccion} style={{
                width: '100%', padding: '14px',
                background: 'transparent', color: '#E8A030',
                border: '1px solid rgba(186,117,23,0.4)',
                borderRadius: '14px', fontSize: '15px',
                cursor: 'pointer', fontFamily: 'sans-serif'
              }}>
                ↩ Rechazar y pedir otro precio
              </button>
            </div>
          )}

          {/* Trabajo aceptado — agendar y confirmar */}
          {trabajoSeleccionado.status === 'aceptado' && !exitoAccion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Botón agendar o cita confirmada */}
              {!trabajoSeleccionado.fecha_cita ? (
                <button type="button"
                  onClick={() => setAgendando(trabajoSeleccionado)}
                  style={{
                    width: '100%', padding: '14px',
                    background: 'transparent', color: '#1D9E75',
                    border: '1.5px solid #1D9E75',
                    borderRadius: '12px', fontSize: '15px', fontWeight: '600',
                    cursor: 'pointer', fontFamily: 'sans-serif'
                  }}
                >
                  📅 Agendar fecha y hora
                </button>
              ) : (
                <div style={{
                  background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)',
                  borderRadius: '10px', padding: '12px 16px',
                  fontSize: '13px', color: '#1D9E75', textAlign: 'center'
                }}>
                  📅 Cita agendada: {trabajoSeleccionado.fecha_cita} a las {trabajoSeleccionado.hora_cita?.slice(0, 5)} hrs
                </div>
              )}

              {/* Trabajo en progreso */}
              <div style={{
                background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.3)',
                borderRadius: '14px', padding: '16px', textAlign: 'center'
              }}>
                <p style={{ fontSize: '14px', color: '#1D9E75', fontWeight: '600', marginBottom: '6px' }}>
                  🤝 Trabajo en progreso
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '14px' }}>
                  Cuando el trabajador termine, confirma aquí para liberar el pago de ${trabajoSeleccionado.precio_acordado || trabajoSeleccionado.presupuesto} MXN.
                </p>
                <button type="button"
  onClick={() => confirmarCompletado(trabajoSeleccionado)}
  disabled={loadingAccion || !trabajoSeleccionado.fecha_cita || trabajoSeleccionado.status !== 'aceptado'}
  style={{
    width: '100%', padding: '14px',
    background: !trabajoSeleccionado.fecha_cita
      ? 'rgba(255,255,255,0.08)'
      : loadingAccion ? 'rgba(29,158,117,0.5)' : '#1D9E75',
    color: !trabajoSeleccionado.fecha_cita ? 'rgba(255,255,255,0.3)' : 'white',
    border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600',
    cursor: !trabajoSeleccionado.fecha_cita ? 'not-allowed' : 'pointer',
    fontFamily: 'sans-serif'
  }}
>
  {!trabajoSeleccionado.fecha_cita
    ? '🔒 Agenda primero la cita'
    : loadingAccion ? 'Procesando...' : '🏁 Confirmar trabajo completado'}
</button>
              </div>
            </div>
          )}

          {/* Cancelar */}
          {trabajoSeleccionado.status === 'publicado' && !exitoAccion && (
            <button type="button" onClick={() => cancelarTrabajo(trabajoSeleccionado)} disabled={loadingAccion} style={{
              width: '100%', padding: '12px',
              background: 'transparent', color: 'rgba(240,149,149,0.6)',
              border: '0.5px solid rgba(240,149,149,0.2)',
              borderRadius: '14px', fontSize: '13px',
              cursor: 'pointer', fontFamily: 'sans-serif'
            }}>
              ❌ Cancelar publicación
            </button>
          )}

        </div>
      </div>
    )
  }

  // ── Lista de mis publicaciones ──
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 20px',
        borderBottom: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        <button type="button" onClick={onVolver} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.6)',
          border: 'none', fontSize: '20px', cursor: 'pointer'
        }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Mis publicaciones</h2>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
            Cargando tus publicaciones...
          </div>
        )}

        {!cargando && trabajos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p>No has publicado trabajos todavía.</p>
          </div>
        )}

        {trabajos.map(trabajo => {
          const badge = statusBadge(trabajo)
          return (
            <button key={trabajo.id} type="button"
              onClick={() => seleccionarTrabajo(trabajo)}
              style={{
                background: trabajo.quien_oferto === 'trabajador' && trabajo.status === 'publicado'
                  ? 'rgba(186,117,23,0.08)' : 'rgba(255,255,255,0.04)',
                border: trabajo.quien_oferto === 'trabajador' && trabajo.status === 'publicado'
                  ? '1px solid rgba(186,117,23,0.4)' : '0.5px solid rgba(255,255,255,0.08)',
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
                      ${trabajo.precio_acordado || trabajo.ultima_oferta || trabajo.presupuesto}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                    {trabajo.descripcion}
                  </p>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '100px',
                    background: badge.bg, color: badge.color, border: `0.5px solid ${badge.border}`,
                    fontWeight: '500'
                  }}>
                    {badge.texto}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}