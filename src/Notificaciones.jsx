import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Notificaciones({ userId, onVolver }) {
  const [notificaciones, setNotificaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarNotificaciones()
    marcarTodasLeidas()
  }, [])

  async function cargarNotificaciones() {
    setCargando(true)
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', userId)
      .order('creado_en', { ascending: false })
      .limit(50)
    if (data) setNotificaciones(data)
    setCargando(false)
  }

  async function marcarTodasLeidas() {
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', userId)
      .eq('leida', false)
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'ahora'
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    return `hace ${Math.floor(hrs / 24)} días`
  }

  function iconoPorTipo(tipo) {
    const iconos = {
      'trabajo_aceptado': '✅',
      'contraoferta': '💬',
      'trabajo_completado': '🔧',
      'pago_liberado': '💰',
      'disputa': '⚠️',
      'calificacion': '⭐',
      'mensaje': '💬',
      'llegada': '🏠',
      'en_camino': '🚗',
      'recordatorio': '📅',
      'general': '🔔',
    }
    return iconos[tipo] || '🔔'
  }

  function colorPorTipo(tipo) {
    const colores = {
      'trabajo_aceptado': '#1D9E75',
      'pago_liberado': '#1D9E75',
      'calificacion': '#F5A623',
      'disputa': '#F09595',
      'contraoferta': '#E8A030',
      'mensaje': '#378ADD',
      'llegada': '#1D9E75',
      'en_camino': '#378ADD',
      'recordatorio': '#E8A030',
      'general': 'rgba(255,255,255,0.5)',
    }
    return colores[tipo] || 'rgba(255,255,255,0.5)'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Notificaciones</h2>
        {notificaciones.length > 0 && (
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            {notificaciones.length} total
          </span>
        )}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
            Cargando notificaciones...
          </div>
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

        {notificaciones.map(n => (
          <div key={n.id} style={{
            background: n.leida ? 'rgba(255,255,255,0.03)' : 'rgba(29,158,117,0.06)',
            border: `0.5px solid ${n.leida ? 'rgba(255,255,255,0.06)' : 'rgba(29,158,117,0.2)'}`,
            borderRadius: '14px', padding: '14px 16px',
            display: 'flex', gap: '12px', alignItems: 'flex-start'
          }}>
            {/* Icono */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: `${colorPorTipo(n.tipo)}20`,
              border: `1px solid ${colorPorTipo(n.tipo)}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px'
            }}>
              {iconoPorTipo(n.tipo)}
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                <p style={{ fontSize: '14px', fontWeight: n.leida ? '400' : '600', color: n.leida ? 'rgba(255,255,255,0.7)' : 'white', lineHeight: '1.3' }}>
                  {n.titulo}
                </p>
                {!n.leida && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75', flexShrink: 0, marginTop: '4px' }} />
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4', marginBottom: '6px' }}>
                {n.cuerpo}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                {tiempoTranscurrido(n.creado_en)}
              </p>
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
