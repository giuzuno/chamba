import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PublicarTrabajo from './PublicarTrabajo'
import MisPublicaciones from './MisPublicaciones'
import Perfil from './Perfil'
import PublicarViaje from './PublicarViaje'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SALINA_CRUZ = [16.1833, -95.2000]

const TRABAJADORES_PRUEBA = [
  { id: 1, nombre: 'Carlos Mendoza', oficio: 'Electricista', rating: 4.9, lat: 16.1850, lng: -95.1980 },
  { id: 2, nombre: 'Ana García', oficio: 'Cocinera', rating: 4.8, lat: 16.1820, lng: -95.2020 },
  { id: 3, nombre: 'Pedro Ruiz', oficio: 'Plomero', rating: 4.7, lat: 16.1800, lng: -95.1960 },
  { id: 4, nombre: 'Rosa Vega', oficio: 'Limpieza', rating: 5.0, lat: 16.1860, lng: -95.2040 },
  { id: 5, nombre: 'Luis Torres', oficio: 'Pintor', rating: 4.6, lat: 16.1810, lng: -95.1990 },
]

function SeleccionarTipoPublicacion({ onServicio, onViaje, onVolver }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>¿Qué necesitas?</h2>
      </div>
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '8px' }}>
          Selecciona el tipo de servicio que quieres publicar
        </p>
        <button type="button" onClick={onServicio} style={{
          background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)',
          borderRadius: '20px', padding: '24px', cursor: 'pointer', fontFamily: 'sans-serif',
          textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px'
        }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', flexShrink: 0, background: 'rgba(29,158,117,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔧</div>
          <div>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75', marginBottom: '6px' }}>Contratar un servicio</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>Electricista, Plomero, Pintor, Limpieza y más de 30 oficios disponibles</p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              {['⚡', '🔧', '🍳', '🧹', '🖌️', '🔑'].map(e => <span key={e} style={{ fontSize: '18px' }}>{e}</span>)}
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>+26 más</span>
            </div>
          </div>
        </button>
        <button type="button" onClick={onViaje} style={{
          background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)',
          borderRadius: '20px', padding: '24px', cursor: 'pointer', fontFamily: 'sans-serif',
          textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px'
        }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', flexShrink: 0, background: 'rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🚕</div>
          <div>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#378ADD', marginBottom: '6px' }}>Solicitar un viaje</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>Taxi, repartidor o flete — elige origen y destino en el mapa</p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              {[['🚕', 'Taxi'], ['🛵', 'Repartidor'], ['🚛', 'Flete']].map(([icon, label]) => (
                <span key={label} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', background: 'rgba(55,138,221,0.15)', color: '#378ADD', border: '0.5px solid rgba(55,138,221,0.3)' }}>
                  {icon} {label}
                </span>
              ))}
            </div>
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ color: 'rgba(255,255,255,0.06)', letterSpacing: '4px', fontSize: '10px' }}>∴</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>Todo dentro de Chamba — seguro y con escrow</p>
      </div>
    </div>
  )
}

// Componente que detecta drag del mapa
function MapaDragListener({ onDragStart, onDragEnd }) {
  useMapEvents({
    dragstart: () => onDragStart(),
    dragend: () => onDragEnd(),
    movestart: () => onDragStart(),
    moveend: () => onDragEnd(),
  })
  return null
}

export default function MapaChamba({ onLogout, userEmail, userId, onCambiarModo }) {
  const [trabajadores, setTrabajadores] = useState(TRABAJADORES_PRUEBA)
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')
  const [cargando, setCargando] = useState(false)
  const [pantalla, setPantalla] = useState('mapa')
  const [barVisible, setBarVisible] = useState(true)

  const CATEGORIAS = ['Todos', 'Electricista', 'Plomero', 'Cocinera', 'Limpieza', 'Pintor', 'Cerrajero', 'Mecánico']

  useEffect(() => { cargarTrabajadores() }, [])

  async function cargarTrabajadores() {
    setCargando(true)
    const { data } = await supabase
      .from('trabajadores')
      .select(`id, categorias, rating_promedio, disponible, usuarios(nombre, lat, lng)`)
      .eq('disponible', true)
    if (data && data.length > 0) {
      const formateados = data
        .filter(t => t.usuarios?.lat && t.usuarios?.lng)
        .map(t => ({
          id: t.id,
          nombre: t.usuarios.nombre,
          oficio: t.categorias?.[0] || 'Servicio general',
          rating: t.rating_promedio || 5.0,
          lat: t.usuarios.lat,
          lng: t.usuarios.lng,
        }))
      setTrabajadores(formateados)
    }
    setCargando(false)
  }

  const trabajadoresFiltrados = categoriaFiltro === 'Todos'
    ? trabajadores
    : trabajadores.filter(t => t.oficio === categoriaFiltro)

  if (pantalla === 'seleccionar') {
    return <SeleccionarTipoPublicacion onVolver={() => setPantalla('mapa')} onServicio={() => setPantalla('publicar')} onViaje={() => setPantalla('viaje')} />
  }
  if (pantalla === 'publicar') {
    return <PublicarTrabajo onVolver={() => setPantalla('seleccionar')} userId={userId} />
  }
  if (pantalla === 'viaje') {
    return <PublicarViaje onVolver={() => setPantalla('seleccionar')} userId={userId} />
  }
  if (pantalla === 'publicaciones') {
    return <MisPublicaciones onVolver={() => setPantalla('mapa')} userId={userId} />
  }
  if (pantalla === 'perfil') {
    return <Perfil onVolver={() => setPantalla('mapa')} userId={userId} userEmail={userEmail} />
  }

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#0D0D0D' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', background: '#0D0D0D',
        borderBottom: '0.5px solid rgba(255,255,255,0.1)', zIndex: 1000
      }}>
        <h1 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '800' }}>chamba</h1>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Salina Cruz, Oax.</span>
        <button type="button" onClick={onLogout} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.4)',
          border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '8px',
          padding: '6px 12px', fontSize: '12px', cursor: 'pointer'
        }}>
          Salir
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: '8px', padding: '10px 16px',
        overflowX: 'auto', background: '#0D0D0D',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)'
      }}>
        {CATEGORIAS.map(cat => (
          <button key={cat} type="button" onClick={() => setCategoriaFiltro(cat)} style={{
            background: categoriaFiltro === cat ? '#1D9E75' : 'rgba(255,255,255,0.06)',
            color: categoriaFiltro === cat ? 'white' : 'rgba(255,255,255,0.5)',
            border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '12px',
            cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'sans-serif'
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={SALINA_CRUZ} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapaDragListener
            onDragStart={() => setBarVisible(false)}
            onDragEnd={() => setBarVisible(true)}
          />
          {trabajadoresFiltrados.map(t => (
            <Marker key={t.id} position={[t.lat, t.lng]}>
              <Popup>
                <div style={{ minWidth: '160px' }}>
                  <strong style={{ fontSize: '14px' }}>{t.nombre}</strong><br />
                  <span style={{ color: '#555', fontSize: '13px' }}>{t.oficio}</span><br />
                  <span style={{ color: '#BA7517' }}>★ {t.rating}</span><br />
                  <button style={{ marginTop: '8px', width: '100%', padding: '7px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    Contactar
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', zIndex: 1000 }}>
          {trabajadoresFiltrados.length} trabajadores cerca
        </div>
      </div>

      {/* Bottom bar con animación */}
      <div style={{
        display: 'flex', justifyContent: 'space-around',
        padding: '12px 0', background: '#0D0D0D',
        borderTop: '0.5px solid rgba(255,255,255,0.1)',
        transform: barVisible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
        position: 'relative', zIndex: 1000
      }}>
        {[
          ['🗺️', 'Mapa'],
          ['➕', 'Publicar'],
          ['📋', 'Mis trabajos'],
          ['🔧', 'Trabajador'],
          ['👤', 'Perfil'],
        ].map(([icon, label]) => (
          <button key={label} type="button"
            onClick={() => {
              if (label === 'Mapa') setPantalla('mapa')
              if (label === 'Publicar') setPantalla('seleccionar')
              if (label === 'Mis trabajos') setPantalla('publicaciones')
              if (label === 'Trabajador') onCambiarModo()
              if (label === 'Perfil') setPantalla('perfil')
            }}
            style={{
              background: 'transparent', border: 'none',
              color: (pantalla === 'mapa' && label === 'Mapa') ||
                     (['seleccionar','publicar','viaje'].includes(pantalla) && label === 'Publicar') ||
                     (pantalla === 'publicaciones' && label === 'Mis trabajos') ||
                     (pantalla === 'perfil' && label === 'Perfil')
                ? '#1D9E75' : 'rgba(255,255,255,0.5)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              cursor: 'pointer', fontSize: '18px', fontFamily: 'sans-serif', padding: '0 4px'
            }}
          >
            {icon}
            <span style={{ fontSize: '10px' }}>{label}</span>
          </button>
        ))}
      </div>

    </div>
  )
}