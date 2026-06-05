import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PerfilPublico from './PerfilPublico'

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
  { icon: '🐕', nombre: 'Veterinario' },
  { icon: '🖥️', nombre: 'Téc. computadoras' },
  { icon: '🏊', nombre: 'Limpieza albercas' },
  { icon: '🎵', nombre: 'Músico' },
  { icon: '❄️', nombre: 'Téc. refrigeración' },
  { icon: '🎪', nombre: 'Barra de eventos' },
  { icon: '📐', nombre: 'Topógrafo' },
  { icon: '🧱', nombre: 'Albañil' },
  { icon: '🚕', nombre: 'Taxi / Chofer' },
  { icon: '🏍️', nombre: 'Moto taxi' },
  { icon: '🛵', nombre: 'Repartidor moto' },
  { icon: '🛍️', nombre: 'Mandados' },
]

function Estrellas({ rating }) {
  if (!rating) return <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Sin calificar</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: '11px', color: i <= Math.round(rating) ? '#F5A623' : 'rgba(255,255,255,0.2)' }}>★</span>
      ))}
      <span style={{ fontSize: '11px', color: '#F5A623', marginLeft: '3px', fontWeight: '600' }}>{rating}</span>
    </div>
  )
}

export default function BuscarTrabajadores({ userId, onVolver }) {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState(null)
  const [trabajadores, setTrabajadores] = useState([])
  const [cargando, setCargando] = useState(false)
  const [verPerfil, setVerPerfil] = useState(null)
  const [ordenar, setOrdenar] = useState('rating') // rating, trabajos

  useEffect(() => { buscar() }, [categoriaFiltro])

  async function buscar() {
    setCargando(true)
    let query = supabase.from('usuarios')
      .select('id, nombre, apellido, foto_url, categorias_servicio, rating_promedio, total_trabajos, bio, vehiculo_marca, vehiculo_modelo, amonestaciones')
      .eq('es_trabajador', true)
      .eq('baneado', false)
      .not('categorias_servicio', 'is', null)
      .neq('id', userId)

    if (categoriaFiltro) {
      query = query.contains('categorias_servicio', [categoriaFiltro])
    }

    const { data } = await query.limit(100)
    if (data) setTrabajadores(data)
    setCargando(false)
  }

  const trabajadoresFiltrados = trabajadores
    .filter(t => {
      if (!busqueda.trim()) return true
      const b = busqueda.toLowerCase()
      return (
        t.nombre?.toLowerCase().includes(b) ||
        t.apellido?.toLowerCase().includes(b) ||
        t.categorias_servicio?.some(c => c.toLowerCase().includes(b)) ||
        t.bio?.toLowerCase().includes(b)
      )
    })
    .sort((a, b) => {
      if (ordenar === 'rating') return (b.rating_promedio || 0) - (a.rating_promedio || 0)
      return (b.total_trabajos || 0) - (a.total_trabajos || 0)
    })

  if (verPerfil) {
    return <PerfilPublico usuarioId={verPerfil} rolVisto="trabajador" onVolver={() => setVerPerfil(null)} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Buscar trabajadores</h2>
        {categoriaFiltro && (
          <button type="button" onClick={() => setCategoriaFiltro(null)} style={{ background: 'rgba(240,149,149,0.1)', color: '#F09595', border: '0.5px solid rgba(240,149,149,0.3)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Buscador de texto */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
          <input type="text" placeholder="Buscar por nombre, servicio o descripción..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: busqueda ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 14px 12px 40px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '16px', cursor: 'pointer' }}>✕</button>
          )}
        </div>
      </div>

      {/* Filtros de categoría */}
      <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content' }}>
          <button type="button" onClick={() => setCategoriaFiltro(null)}
            style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', background: !categoriaFiltro ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: !categoriaFiltro ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: !categoriaFiltro ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
            Todos
          </button>
          {CATEGORIAS.map(cat => (
            <button key={cat.nombre} type="button" onClick={() => setCategoriaFiltro(cat.nombre)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', background: categoriaFiltro === cat.nombre ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: categoriaFiltro === cat.nombre ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: categoriaFiltro === cat.nombre ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
              {cat.icon} {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Ordenar y conteo */}
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          {cargando ? 'Buscando...' : `${trabajadoresFiltrados.length} trabajador${trabajadoresFiltrados.length !== 1 ? 'es' : ''}`}
          {categoriaFiltro && <span style={{ color: '#1D9E75' }}> de {categoriaFiltro}</span>}
        </p>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[['rating', '⭐ Rating'], ['trabajos', '🔧 Trabajos']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setOrdenar(key)}
              style={{ padding: '5px 10px', borderRadius: '8px', border: 'none', background: ordenar === key ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', color: ordenar === key ? '#1D9E75' : 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: ordenar === key ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de trabajadores */}
      <div style={{ padding: '0 16px 80px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
            Buscando trabajadores...
          </div>
        )}

        {!cargando && trabajadoresFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <p>No encontramos trabajadores{categoriaFiltro ? ` de ${categoriaFiltro}` : ''}.</p>
            {categoriaFiltro && (
              <button type="button" onClick={() => setCategoriaFiltro(null)} style={{ marginTop: '12px', background: 'transparent', color: '#1D9E75', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Ver todos los trabajadores →
              </button>
            )}
          </div>
        )}

        {trabajadoresFiltrados.map(t => (
          <button key={t.id} type="button" onClick={() => setVerPerfil(t.id)}
            style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>

            {/* Foto */}
            {t.foto_url ? (
              <img src={t.foto_url} alt={t.nombre} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(29,158,117,0.3)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#0d6b50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: 'white', flexShrink: 0 }}>
                {t.nombre?.[0]?.toUpperCase() || '?'}
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <p style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
                  {t.nombre} {t.apellido || ''}
                </p>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0, marginLeft: '8px' }}>
                  {t.total_trabajos || 0} trabajos
                </span>
              </div>

              <Estrellas rating={t.rating_promedio} />

              {t.bio && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.bio}
                </p>
              )}

              {/* Categorías */}
              <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                {t.categorias_servicio?.slice(0, 4).map(cat => {
                  const c = CATEGORIAS.find(x => x.nombre === cat)
                  return (
                    <span key={cat} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: categoriaFiltro === cat ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', color: categoriaFiltro === cat ? '#1D9E75' : 'rgba(255,255,255,0.5)', border: categoriaFiltro === cat ? '0.5px solid rgba(29,158,117,0.3)' : 'none' }}>
                      {c?.icon} {cat}
                    </span>
                  )
                })}
                {t.categorias_servicio?.length > 4 && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>+{t.categorias_servicio.length - 4} más</span>
                )}
              </div>

              {/* Vehículo si es chofer */}
              {t.vehiculo_marca && (
                <p style={{ fontSize: '11px', color: 'rgba(55,138,221,0.7)', marginTop: '5px' }}>
                  🚗 {t.vehiculo_marca} {t.vehiculo_modelo}
                </p>
              )}
            </div>

            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px', flexShrink: 0, alignSelf: 'center' }}>›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
