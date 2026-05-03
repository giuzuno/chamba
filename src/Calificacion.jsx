import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Calificacion({ trabajo, userId, rolCalificador, onCompletado }) {
  const [estrellas, setEstrellas] = useState(0)
  const [hover, setHover] = useState(0)
  const [comentario, setComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const calificadoId = rolCalificador === 'cliente'
    ? trabajo.trabajador_id
    : trabajo.cliente_id

  async function enviarCalificacion() {
    if (estrellas === 0) return
    setLoading(true)

    await supabase.from('calificaciones').insert({
      trabajo_id: trabajo.id,
      calificador_id: userId,
      calificado_id: calificadoId,
      rol_calificador: rolCalificador,
      estrellas,
      comentario: comentario.trim() || null,
    })

    // Actualizar rating promedio del calificado
    const { data: cals } = await supabase
      .from('calificaciones')
      .select('estrellas')
      .eq('calificado_id', calificadoId)

    if (cals && cals.length > 0) {
      const promedio = cals.reduce((sum, c) => sum + c.estrellas, 0) / cals.length
      await supabase.from('usuarios').update({
        rating_promedio: Math.round(promedio * 10) / 10,
        total_trabajos: cals.length,
      }).eq('id', calificadoId)
    }

    setEnviado(true)
    setLoading(false)
    setTimeout(() => onCompletado(), 2000)
  }

  if (enviado) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0D0D0D',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '16px' }}>⭐</div>
        <h2 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
          ¡Gracias por calificar!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Tu calificación ayuda a construir confianza en Chamba.
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Calificar</h2>
      </div>

      <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>

        {/* Info del trabajo */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
            {rolCalificador === 'cliente' ? '¿Cómo fue el trabajo de tu trabajador?' : '¿Cómo fue tu cliente?'}
          </p>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>{trabajo.categoria}</h3>
          <p style={{ fontSize: '14px', color: '#1D9E75', marginTop: '4px' }}>
            ${trabajo.precio_acordado || trabajo.presupuesto} MXN
          </p>
        </div>

        {/* Estrellas */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setEstrellas(n)}
                style={{
                  background: 'transparent', border: 'none',
                  fontSize: '44px', cursor: 'pointer',
                  filter: (hover || estrellas) >= n ? 'none' : 'grayscale(1) opacity(0.3)',
                  transform: hover === n ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.15s'
                }}
              >
                ⭐
              </button>
            ))}
          </div>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#1D9E75', minHeight: '24px' }}>
            {estrellas === 0 && ''}
            {estrellas === 1 && 'Muy malo 😞'}
            {estrellas === 2 && 'Malo 😕'}
            {estrellas === 3 && 'Regular 😐'}
            {estrellas === 4 && 'Bueno 😊'}
            {estrellas === 5 && '¡Excelente! 🤩'}
          </p>
        </div>

        {/* Comentario */}
        <div style={{ width: '100%' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Comentario (opcional)
          </p>
          <textarea
            placeholder="Cuéntanos tu experiencia..."
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            rows={3}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', padding: '14px 16px',
              color: 'white', fontSize: '14px',
              fontFamily: 'sans-serif', resize: 'none', outline: 'none'
            }}
          />
        </div>

        {/* Separador masónico */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'rgba(255,255,255,0.1)', letterSpacing: '4px', fontSize: '10px' }}>∴</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <button type="button"
          onClick={enviarCalificacion}
          disabled={loading || estrellas === 0}
          style={{
            width: '100%', padding: '16px',
            background: estrellas === 0 ? 'rgba(255,255,255,0.08)' : loading ? 'rgba(29,158,117,0.5)' : '#1D9E75',
            color: estrellas === 0 ? 'rgba(255,255,255,0.3)' : 'white',
            border: 'none', borderRadius: '14px',
            fontSize: '16px', fontWeight: '600',
            cursor: estrellas === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'sans-serif'
          }}
        >
          {loading ? 'Enviando...' : estrellas === 0 ? 'Selecciona una calificación' : `Enviar ${estrellas} ⭐`}
        </button>

        <button type="button" onClick={onCompletado} style={{
          background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.3)', fontSize: '13px',
          cursor: 'pointer', fontFamily: 'sans-serif'
        }}>
          Omitir por ahora
        </button>

      </div>
    </div>
  )
}