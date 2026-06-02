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

  useEffect(() => { buscar() }, [categoriaFiltro])

  async function buscar() {
    setCargando(true)
    let query = supabase.from('usuarios')
      .select('id, nombre, foto_url, categorias_servicio, rating_promedio, total_trabajos, bio')
      .eq('es_trabajador', true)
      .not('categorias_servicio', 'is', null)
      .neq('id', userId)
      .order('rating_promedio', { ascending: false })

    if (categoriaFiltro) {
      query = query.contains('categorias_servicio', [categoriaFiltro])
    }

    const { data } = await query.limit(50)
    if (data) setTrabajadores(data)
    setCargando(false)
  }

  const trabajadoresFiltrados = busqueda.trim()
    ? trabajadores.filter(t =>
        t.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.categorias_servicio?.some(c => c.toLowerCase().includes(busqueda.toLowerCase())) ||
        t.bio?.toLowerCase().includes(busqueda.toLowerCase())
      )
    : trabajadores

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
          <button type="button" onClick={() => setCategoriaFiltro(null)} style={{ background: 'rgba(240,149,149,0.1)', color: '#F09595', border: '0.5px solid rgba(240,149,149,0.3)', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
          <input
            type="text" placeholder="Buscar por nombre, oficio o descripción..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px 14px 12px 42px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '16px', cursor: 'pointer' }}>✕</button>
          )}
        </div>
      </div>

      {/* Filtros por categoría */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        {CATEGORIAS.map(cat => (
          <button key={cat.nombre} type="button" onClick={() => setCategoriaFiltro(categoriaFiltro === cat.nombre ? null : cat.nombre)}
            style={{
              background: categoriaFiltro === cat.nombre ? '#1D9E75' : 'rgba(255,255,255,0.05)',
              border: categoriaFiltro === cat.nombre ? 'none' : '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '6px 12px', cursor: 'pointer', fontFamily: 'sans-serif',
              display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
              color: categoriaFiltro === cat.nombre ? 'white' : 'rgba(255,255,255,0.6)',
              fontSize: '12px', fontWeight: categoriaFiltro === cat.nombre ? '600' : '400',
            }}>
            <span>{cat.icon}</span>
            <span>{cat.nombre}</span>
          </button>
        ))}
      </div>

      {/* Resultados */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Contador */}
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
          {cargando ? 'Buscando...' : `${trabajadoresFiltrados.length} trabajador${trabajadoresFiltrados.length !== 1 ? 'es' : ''} encontrado${trabajadoresFiltrados.length !== 1 ? 's' : ''}${categoriaFiltro ? ` · ${categoriaFiltro}` : ''}`}
        </p>

        {!cargando && trabajadoresFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p style={{ fontSize: '15px', marginBottom: '8px' }}>Sin resultados</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>
              Prueba con otra categoría o término de búsqueda
            </p>
          </div>
        )}

        {trabajadoresFiltrados.map(t => {
          const iniciales = t.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
          const cats = t.categorias_servicio?.slice(0, 3) || []
          const masCategs = (t.categorias_servicio?.length || 0) - 3

          return (
            <button key={t.id} type="button" onClick={() => setVerPerfil(t.id)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', width: '100%', display: 'flex', gap: '14px', alignItems: 'center' }}>

              {/* Avatar */}
              {t.foto_url ? (
                <img src={t.foto_url} alt={t.nombre} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(29,158,117,0.4)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#0d6b50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: 'white', flexShrink: 0, border: '2px solid rgba(29,158,117,0.4)' }}>
                  {iniciales}
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{t.nombre}</p>
                  {t.total_trabajos > 0 && (
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                      {t.total_trabajos} trabajo{t.total_trabajos > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <Estrellas rating={t.rating_promedio} />

                {t.bio && (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.bio}
                  </p>
                )}

                {/* Categorías */}
                <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {cats.map(c => {
                    const cat = CATEGORIAS.find(x => x.nombre === c)
                    return (
                      <span key={c} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: categoriaFiltro === c ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', color: categoriaFiltro === c ? '#1D9E75' : 'rgba(255,255,255,0.5)', border: `0.5px solid ${categoriaFiltro === c ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.1)'}` }}>
                        {cat?.icon} {c}
                      </span>
                    )
                  })}
                  {masCategs > 0 && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
                      +{masCategs} más
                    </span>
                  )}
                </div>
              </div>

              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', flexShrink: 0 }}>›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
