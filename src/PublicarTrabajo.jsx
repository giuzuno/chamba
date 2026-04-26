import { useState } from 'react'
import { supabase } from './supabaseClient'

const CATEGORIAS = [
  { icon: '⚡', nombre: 'Electricista' },
  { icon: '🔧', nombre: 'Plomero' },
  { icon: '🍳', nombre: 'Cocinera' },
  { icon: '🧹', nombre: 'Limpieza' },
  { icon: '👔', nombre: 'Planchado' },
  { icon: '🖌️', nombre: 'Pintor' },
  { icon: '🔑', nombre: 'Cerrajero' },
  { icon: '🔩', nombre: 'Mecánico' },
  { icon: '📱', nombre: 'Téc. celulares' },
  { icon: '🚛', nombre: 'Fletes' },
  { icon: '✂️', nombre: 'Costurera' },
  { icon: '📚', nombre: 'Clases' },
  { icon: '🌿', nombre: 'Jardinero' },
  { icon: '🚗', nombre: 'Lavado autos' },
  { icon: '🪵', nombre: 'Carpintero' },
  { icon: '🛵', nombre: 'Repartidor' },
  { icon: '⚓', nombre: 'Soldador' },
  { icon: '🎨', nombre: 'Diseñador gráfico' },
  { icon: '📸', nombre: 'Fotógrafo' },
  { icon: '💆', nombre: 'Masajista' },
  { icon: '🐕', nombre: 'Veterinario' },
  { icon: '🖥️', nombre: 'Téc. computadoras' },
  { icon: '🏊', nombre: 'Limpieza albercas' },
  { icon: '👶', nombre: 'Niñera' },
  { icon: '🎵', nombre: 'Músico' },
  { icon: '❄️', nombre: 'Téc. refrigeración' },
  { icon: '💉', nombre: 'Enfermera' },
  { icon: '🎪', nombre: 'Barra de eventos' },
  { icon: '📐', nombre: 'Topógrafo' },
  { icon: '🧱', nombre: 'Albañil' },
  { icon: '✳️', nombre: 'Otros' },
]

export default function PublicarTrabajo({ onVolver, userId }) {
  const [categoria, setCategoria] = useState('')
  const [otroServicio, setOtroServicio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [presupuesto, setPresupuesto] = useState(300)
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [ubicacion, setUbicacion] = useState(null)

  const categoriaFinal = categoria === 'Otros' ? otroServicio : categoria
  const iconCategoria = CATEGORIAS.find(c => c.nombre === categoria)?.icon || '✳️'

  function verConfirmacion() {
    if (!categoria) { setError('Selecciona una categoría'); return }
    if (categoria === 'Otros' && !otroServicio) { setError('Describe qué servicio necesitas'); return }
    if (!descripcion) { setError('Describe el trabajo'); return }
    setError('')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude, texto: 'Tu ubicación actual (GPS)' })
        setConfirmando(true)
      },
      () => {
        setUbicacion({ lat: 16.1833, lng: -95.2000, texto: 'Centro de Salina Cruz (sin GPS)' })
        setConfirmando(true)
      }
    )
  }

  async function publicar() {
    setLoading(true)
    const { data, error } = await supabase.from('trabajos').insert({
      cliente_id: userId,
      categoria: categoriaFinal,
      descripcion,
      presupuesto,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      status: 'publicado'
    })
    console.log('data:', data)
    console.log('error:', error)
    if (error) { setError(error.message); setConfirmando(false) }
    else setExito(true)
    setLoading(false)
  }

  if (exito) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0D0D0D',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ color: '#1D9E75', fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>
          ¡Trabajo publicado!
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '32px', maxWidth: '300px' }}>
          Los trabajadores de <strong style={{ color: 'white' }}>{categoriaFinal}</strong> cerca de ti ya pueden ver tu trabajo.
        </p>
        <button type="button" onClick={onVolver} style={{
          background: '#1D9E75', color: 'white', border: 'none',
          borderRadius: '12px', padding: '14px 32px',
          fontSize: '15px', fontWeight: '500', cursor: 'pointer',
          fontFamily: 'sans-serif'
        }}>
          Ver mapa
        </button>
      </div>
    )
  }

  if (confirmando) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '16px 20px',
          borderBottom: '0.5px solid rgba(255,255,255,0.1)'
        }}>
          <button type="button" onClick={() => setConfirmando(false)} style={{
            background: 'transparent', color: 'rgba(255,255,255,0.6)',
            border: 'none', fontSize: '20px', cursor: 'pointer'
          }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Confirmar publicación</h2>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
            Revisa los detalles antes de publicar:
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '32px' }}>{iconCategoria}</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>CATEGORÍA</p>
                <p style={{ fontSize: '16px', fontWeight: '600' }}>{categoriaFinal}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '32px' }}>💰</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>PRESUPUESTO</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1D9E75' }}>${presupuesto} MXN</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '32px' }}>📝</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>DESCRIPCIÓN</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>{descripcion}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px' }}>
              <span style={{ fontSize: '32px' }}>📍</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>UBICACIÓN</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{ubicacion?.texto}</p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.3)',
            borderRadius: '12px', padding: '12px 16px',
            fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5'
          }}>
            ✓ Los trabajadores de <strong style={{ color: '#1D9E75' }}>{categoriaFinal}</strong> cerca de ti podrán ver y aceptar tu trabajo.
          </div>

          {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

          <button type="button" onClick={publicar} disabled={loading} style={{
            width: '100%', padding: '16px',
            background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75',
            color: 'white', border: 'none', borderRadius: '14px',
            fontSize: '16px', fontWeight: '600', cursor: 'pointer',
            fontFamily: 'sans-serif'
          }}>
            {loading ? 'Publicando...' : '✅ Confirmar y publicar'}
          </button>

          <button type="button" onClick={() => setConfirmando(false)} style={{
            width: '100%', padding: '14px', background: 'transparent',
            color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)',
            borderRadius: '14px', fontSize: '15px', cursor: 'pointer',
            fontFamily: 'sans-serif'
          }}>
            Editar trabajo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        <button type="button" onClick={onVolver} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.6)',
          border: 'none', fontSize: '20px', cursor: 'pointer'
        }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Publicar trabajo</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ¿Qué necesitas?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {CATEGORIAS.map(cat => (
              <button key={cat.nombre} type="button"
                onClick={() => { setCategoria(cat.nombre); setError('') }}
                style={{
                  background: categoria === cat.nombre ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                  border: categoria === cat.nombre ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '10px 6px',
                  cursor: 'pointer', fontFamily: 'sans-serif',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                }}>
                <span style={{ fontSize: '22px' }}>{cat.icon}</span>
                <span style={{ fontSize: '10px', color: categoria === cat.nombre ? '#1D9E75' : 'rgba(255,255,255,0.5)' }}>
                  {cat.nombre}
                </span>
              </button>
            ))}
          </div>
          {categoria === 'Otros' && (
            <input type="text" placeholder="¿Qué servicio necesitas?"
              value={otroServicio} onChange={e => setOtroServicio(e.target.value)}
              style={{
                width: '100%', marginTop: '12px',
                background: 'rgba(255,255,255,0.06)', border: '0.5px solid #1D9E75',
                borderRadius: '12px', padding: '12px 16px',
                color: 'white', fontSize: '14px',
                fontFamily: 'sans-serif', outline: 'none'
              }}
            />
          )}
        </div>

        <div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Describe el trabajo
          </p>
          <textarea
            placeholder="Ej. Cambiar 3 contactos y revisar el tablero eléctrico..."
            value={descripcion} onChange={e => setDescripcion(e.target.value)}
            rows={4}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', padding: '14px 16px',
              color: 'white', fontSize: '14px',
              fontFamily: 'sans-serif', resize: 'none', outline: 'none'
            }}
          />
        </div>

        <div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Cuánto pagas
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input type="range" min="100" max="3000" step="50"
              value={presupuesto} onChange={e => setPresupuesto(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#1D9E75' }}
            />
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#1D9E75', minWidth: '90px', textAlign: 'right' }}>
              ${presupuesto} MXN
            </span>
          </div>
        </div>

        {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

        <button type="button" onClick={verConfirmacion} style={{
          width: '100%', padding: '16px',
          background: '#1D9E75', color: 'white', border: 'none',
          borderRadius: '14px', fontSize: '16px', fontWeight: '600',
          cursor: 'pointer', fontFamily: 'sans-serif', marginTop: '8px'
        }}>
          Revisar y publicar →
        </button>

      </div>
    </div>
  )
}