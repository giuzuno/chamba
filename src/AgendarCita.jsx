import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function AgendarCita({ trabajo, onConfirmado, onVolver }) {
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hoy = new Date().toISOString().split('T')[0]

  const HORARIOS = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00'
  ]

  async function confirmarCita() {
    if (!fecha) { setError('Selecciona una fecha'); return }
    if (!hora) { setError('Selecciona una hora'); return }
    setLoading(true)
    setError('')

    await supabase.from('trabajos').update({
      fecha_cita: fecha,
      hora_cita: hora,
      direccion_compartida: true,
    }).eq('id', trabajo.id)

    setLoading(false)
    onConfirmado({ fecha, hora })
  }

  function formatearFecha(f) {
    if (!f) return ''
    const d = new Date(f + 'T12:00:00')
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
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
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Agendar cita</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Info del trabajo */}
        <div style={{
          background: 'rgba(29,158,117,0.08)',
          border: '0.5px solid rgba(29,158,117,0.2)',
          borderRadius: '14px', padding: '14px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>{trabajo.categoria}</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{trabajo.descripcion}</p>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75' }}>
            ${trabajo.precio_acordado || trabajo.presupuesto} MXN
          </span>
        </div>

        {/* Fecha */}
        <div>
          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px',
            fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>¿Qué día?</p>
          <input
            type="date"
            min={hoy}
            value={fecha}
            onChange={e => { setFecha(e.target.value); setError('') }}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: fecha ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', padding: '14px 16px',
              color: 'white', fontSize: '15px',
              fontFamily: 'sans-serif', outline: 'none',
              colorScheme: 'dark'
            }}
          />
          {fecha && (
            <p style={{ fontSize: '13px', color: '#1D9E75', marginTop: '8px', textTransform: 'capitalize' }}>
              📅 {formatearFecha(fecha)}
            </p>
          )}
        </div>

        {/* Hora */}
        <div>
          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px',
            fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>¿A qué hora?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {HORARIOS.map(h => (
              <button key={h} type="button"
                onClick={() => { setHora(h); setError('') }}
                style={{
                  background: hora === h ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                  border: hora === h ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', padding: '10px 6px',
                  color: hora === h ? '#1D9E75' : 'rgba(255,255,255,0.6)',
                  fontSize: '13px', fontWeight: hora === h ? '600' : '400',
                  cursor: 'pointer', fontFamily: 'sans-serif'
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen */}
        {fecha && hora && (
          <div style={{
            background: 'rgba(29,158,117,0.08)',
            border: '0.5px solid rgba(29,158,117,0.3)',
            borderRadius: '14px', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Resumen de la cita:</p>
            <p style={{ fontSize: '16px', fontWeight: '600', textTransform: 'capitalize' }}>
              📅 {formatearFecha(fecha)}
            </p>
            <p style={{ fontSize: '16px', fontWeight: '600' }}>
              🕐 {hora} hrs
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              📍 Al confirmar, el trabajador recibirá tu dirección exacta
            </p>
          </div>
        )}

        {error && (
          <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>
        )}

        <button type="button" onClick={confirmarCita} disabled={loading || !fecha || !hora} style={{
          width: '100%', padding: '16px',
          background: !fecha || !hora ? 'rgba(29,158,117,0.3)' : loading ? 'rgba(29,158,117,0.5)' : '#1D9E75',
          color: 'white', border: 'none', borderRadius: '14px',
          fontSize: '16px', fontWeight: '600', cursor: !fecha || !hora ? 'not-allowed' : 'pointer',
          fontFamily: 'sans-serif'
        }}>
          {loading ? 'Confirmando...' : '✅ Confirmar cita'}
        </button>

      </div>
    </div>
  )
}