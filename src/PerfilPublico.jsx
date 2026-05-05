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
  'Taxi / Chofer': '🚕', 'Mandados': '🛍️',
}

function Estrellas({ valor, size = 16 }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{
          fontSize: `${size}px`,
          filter: n <= Math.round(valor) ? 'none' : 'grayscale(1) opacity(0.3)'
        }}>⭐</span>
      ))}
    </div>
  )
}

export default function PerfilPublico({ usuarioId, rolVisto, onVolver, onContratar }) {
  // rolVisto: 'trabajador' o 'cliente'
  const [perfil, setPerfil] = useState(null)
  const [calificaciones, setCalificaciones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarPerfil()
    cargarCalificaciones()
  }, [])

  async function cargarPerfil() {
    const { data } = await supabase
      .from('usuarios').select('*').eq('id', usuarioId).maybeSingle()
    if (data) setPerfil(data)
    setLoading(false)
  }

  async function cargarCalificaciones() {
    // Si vemos a un trabajador, mostramos reseñas de clientes hacia él
    // Si vemos a un cliente, mostramos reseñas de trabajadores hacia él
    const rolCalificador = rolVisto === 'trabajador' ? 'cliente' : 'trabajador'
    const { data } = await supabase
      .from('calificaciones')
      .select('*')
      .eq('calificado_id', usuarioId)
      .eq('rol_calificador', rolCalificador)
      .order('creado_en', { ascending: false })
    if (data) setCalificaciones(data)
  }

  function tiempoTranscurrido(fecha) {
    const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
    if (dias === 0) return 'hoy'
    if (dias === 1) return 'ayer'
    if (dias < 30) return `hace ${dias} días`
    return `hace ${Math.floor(dias / 30)} meses`
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>
      Cargando perfil...
    </div>
  )

  if (!perfil) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>
      Perfil no encontrado
    </div>
  )

  const iniciales = perfil.nombre
    ? perfil.nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const rating = perfil.rating_promedio || 5.0
  const totalTrabajos = perfil.total_trabajos || 0
  const esTrabajador = rolVisto === 'trabajador'

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        <button type="button" onClick={onVolver} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.6)',
          border: 'none', fontSize: '20px', cursor: 'pointer'
        }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
          {esTrabajador ? 'Perfil del trabajador' : 'Perfil del cliente'}
        </h2>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Foto y datos principales */}
        <div style={{
          display: 'flex', gap: '16px', alignItems: 'center',
          background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '16px', padding: '20px'
        }}>
          {perfil.foto_url ? (
            <img src={perfil.foto_url} alt="foto" style={{
              width: '72px', height: '72px', borderRadius: '50%',
              objectFit: 'cover', border: '3px solid rgba(29,158,117,0.4)', flexShrink: 0
            }} />
          ) : (
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
              background: esTrabajador
                ? 'linear-gradient(135deg, #1D9E75, #0d6b50)'
                : 'linear-gradient(135deg, #378ADD, #1a5fa8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: '700', color: 'white',
              border: '3px solid rgba(29,158,117,0.4)'
            }}>
              {iniciales}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                {perfil.nombre || 'Sin nombre'}
              </h3>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '100px',
                background: esTrabajador ? 'rgba(29,158,117,0.2)' : 'rgba(55,138,221,0.2)',
                color: esTrabajador ? '#1D9E75' : '#378ADD',
                border: `0.5px solid ${esTrabajador ? 'rgba(29,158,117,0.4)' : 'rgba(55,138,221,0.4)'}`,
                fontWeight: '600'
              }}>
                {esTrabajador ? '🔧 Trabajador' : '🛍️ Cliente'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Estrellas valor={rating} size={15} />
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1D9E75' }}>
                {rating.toFixed(1)}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              {totalTrabajos} trabajo{totalTrabajos !== 1 ? 's' : ''} completado{totalTrabajos !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Bio */}
        {perfil.bio && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', padding: '16px'
          }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {esTrabajador ? 'Sobre el trabajador' : 'Sobre el cliente'}
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.6' }}>
              {perfil.bio}
            </p>
          </div>
        )}

        {/* Categorías — solo para trabajadores */}
        {esTrabajador && perfil.categorias_servicio?.length > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Servicios que ofrece
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {perfil.categorias_servicio.map(cat => (
                <div key={cat} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(29,158,117,0.1)', border: '0.5px solid rgba(29,158,117,0.3)',
                  borderRadius: '20px', padding: '6px 12px'
                }}>
                  <span style={{ fontSize: '14px' }}>{CATEGORIAS_ICONS[cat] || '✳️'}</span>
                  <span style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '500' }}>{cat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Separador masónico */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'rgba(255,255,255,0.08)', letterSpacing: '4px', fontSize: '10px' }}>∴</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Calificaciones */}
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {esTrabajador ? `Reseñas de clientes (${calificaciones.length})` : `Reseñas de trabajadores (${calificaciones.length})`}
          </p>

          {calificaciones.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '24px', textAlign: 'center',
              color: 'rgba(255,255,255,0.3)', fontSize: '13px'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                {esTrabajador ? '⭐' : '🤝'}
              </div>
              {esTrabajador
                ? 'Aún no tiene reseñas. ¡Sé el primero en contratarlo!'
                : 'Este cliente no tiene reseñas todavía.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {calificaciones.map(cal => (
                <div key={cal.id} style={{
                  background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: '14px', padding: '14px 16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Estrellas valor={cal.estrellas} size={14} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                      {tiempoTranscurrido(cal.creado_en)}
                    </span>
                  </div>
                  {cal.comentario ? (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
                      "{cal.comentario}"
                    </p>
                  ) : (
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                      Sin comentario
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón contratar — solo si se pasa la función */}
        {onContratar && esTrabajador && (
          <button type="button" onClick={onContratar} style={{
            width: '100%', padding: '16px', background: '#1D9E75',
            color: 'white', border: 'none', borderRadius: '14px',
            fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif'
          }}>
            🔧 Contratar este trabajador
          </button>
        )}

        {/* Footer masónico */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.04)', fontSize: '14px', letterSpacing: '8px' }}>
          ∴ 👁 ∴
        </div>

      </div>
    </div>
  )
}