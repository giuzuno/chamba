import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Notificaciones({ userId, onVolver, onIrATrabajo }) {
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarNotificaciones()
  }, [])

  async function cargarNotificaciones() {
    setCargando(true)
    const { data } = await supabase
      .from('notificaciones').select('*').eq('usuario_id', userId)
      .order('creado_en', { ascending: false }).limit(50)
    if (data) setNotificaciones(data)
    setCargando(false)
  }

  async function tocarNotificacion(n) {
    // Marcar como leída si no lo estaba
    if (!n.leida) {
      await supabase.from('notificaciones').update({ leida: true }).eq('id', n.id)
      setNotificaciones(prev => prev.map(x => x.id === n.id ? { ...x, leida: true } : x))
    }
    // Navegar al trabajo si tiene trabajo_id
    if (n.trabajo_id && onIrATrabajo) {
      onIrATrabajo(n.trabajo_id, n.tipo)
    }
  }

  async function marcarTodasLeidas() {
    await supabase.from('notificaciones').update({ leida: true })
      .eq('usuario_id', userId).eq('leida', false)
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'ahora'
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    const dias = Math.floor(hrs / 24)
    if (dias === 1) return 'ayer'
    return `hace ${dias} días`
  }

  function iconoPorTipo(tipo) {
    const iconos = {
      'trabajo_aceptado': '✅', 'contraoferta': '💬', 'trabajo_completado': '🔧',
      'pago_liberado': '💰', 'disputa': '⚠️', 'calificacion': '⭐',
      'mensaje': '💬', 'llegada': '🏠', 'en_camino': '🚗',
      'recordatorio': '📅', 'general': '🔔',
    }
    return iconos[tipo] || '🔔'
  }

  function colorPorTipo(tipo) {
    const colores = {
      'trabajo_aceptado': '#1D9E75', 'pago_liberado': '#1D9E75',
      'calificacion': '#F5A623', 'disputa': '#F09595',
      'contraoferta': '#E8A030', 'mensaje': '#378ADD',
      'llegada': '#1D9E75', 'en_camino': '#378ADD',
      'recordatorio': '#E8A030', 'general': 'rgba(255,255,255,0.5)',
      'trabajo_completado': '#378ADD',
    }
    return colores[tipo] || 'rgba(255,255,255,0.5)'
  }

  const nuevas = notificaciones.filter(n => !n.leida)
  const anteriores = notificaciones.filter(n => n.leida)
  const tieneTrabajo = (n) => !!n.trabajo_id

  const CardNotificacion = ({ n }) => {
    const color = colorPorTipo(n.tipo)
    const esNueva = !n.leida
    const navegable = tieneTrabajo(n)

    return (
      <div
        onClick={() => tocarNotificacion(n)}
        style={{
          background: esNueva ? 'rgba(29,158,117,0.06)' : 'rgba(255,255,255,0.03)',
          border: `0.5px solid ${esNueva ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', gap: '12px', alignItems: 'flex-start',
          cursor: navegable ? 'pointer' : 'default',
          transition: 'background 0.15s',
        }}
      >
        {/* Ícono */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
          background: `${color}20`, border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
        }}>
          {iconoPorTipo(n.tipo)}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
            <p style={{ fontSize: '14px', fontWeight: esNueva ? '700' : '400', color: esNueva ? 'white' : 'rgba(255,255,255,0.7)', lineHeight: '1.3' }}>
              {n.titulo}
            </p>
            {esNueva && (
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75', flexShrink: 0, marginTop: '5px' }} />
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4', marginBottom: '6px' }}>
            {n.cuerpo}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              {tiempoTranscurrido(n.creado_en)}
            </p>
            {navegable && (
              <span style={{ fontSize: '11px', color: esNueva ? '#1D9E75' : 'rgba(255,255,255,0.2)', fontWeight: '500' }}>
                · Ver trabajo →
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Notificaciones</h2>
        {nuevas.length > 0 && (
          <button type="button" onClick={marcarTodasLeidas} style={{ background: 'transparent', color: '#1D9E75', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: '500' }}>
            Marcar todas leídas
          </button>
        )}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>
        )}

        {!cargando && notificaciones.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <p style={{ fontSize: '15px', marginBottom: '8px' }}>Sin notificaciones</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>
              Aquí aparecerán tus alertas de trabajos, pagos y mensajes.
            </p>
          </div>
        )}

        {/* Nuevas */}
        {nuevas.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Nuevas
              </span>
              <span style={{ background: '#1D9E75', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 7px' }}>
                {nuevas.length}
              </span>
            </div>
            {nuevas.map(n => <CardNotificacion key={n.id} n={n} />)}
            {anteriores.length > 0 && <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />}
          </>
        )}

        {/* Anteriores */}
        {anteriores.length > 0 && (
          <>
            {nuevas.length > 0 && (
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', display: 'block' }}>
                Anteriores
              </span>
            )}
            {anteriores.map(n => <CardNotificacion key={n.id} n={n} />)}
          </>
        )}

      </div>
    </div>
  )
}
