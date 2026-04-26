import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PublicarTrabajo from './PublicarTrabajo'

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

export default function MapaChamba({ onLogout, userEmail, userId }) {
  const [trabajadores, setTrabajadores] = useState(TRABAJADORES_PRUEBA)
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')
  const [cargando, setCargando] = useState(false)
  const [pantalla, setPantalla] = useState('mapa')

  const CATEGORIAS = ['Todos', 'Electricista', 'Plomero', 'Cocinera', 'Limpieza', 'Pintor', 'Cerrajero', 'Mecánico']

  useEffect(() => {
    cargarTrabajadores()
  }, [])

  async function cargarTrabajadores() {
    setCargando(true)
    const { data } = await supabase
      .from('trabajadores')
      .select(`
        id,
        categorias,
        rating_promedio,
        disponible,
        usuarios (
          nombre,
          lat,
          lng
        )
      `)
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

  if (pantalla === 'publicar') {
    return (
      <PublicarTrabajo
        onVolver={() => setPantalla('mapa')}
        userId={userId}
      />
    )
  }

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#0D0D0D' }}>

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

      <div style={{
        display: 'flex', gap: '8px', padding: '10px 16px',
        overflowX: 'auto', background: '#0D0D0D',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)'
      }}>
        {CATEGORIAS.map(cat => (
          <button key={cat} type="button"
            onClick={() => setCategoriaFiltro(cat)}
            style={{
              background: categoriaFiltro === cat ? '#1D9E75' : 'rgba(255,255,255,0.06)',
              color: categoriaFiltro === cat ? 'white' : 'rgba(255,255,255,0.5)',
              border: 'none', borderRadius: '20px',
              padding: '6px 14px', fontSize: '12px',
              cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'sans-serif'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={SALINA_CRUZ} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {trabajadoresFiltrados.map(t => (
            <Marker key={t.id} position={[t.lat, t.lng]}>
              <Popup>
                <div style={{ minWidth: '160px' }}>
                  <strong style={{ fontSize: '14px' }}>{t.nombre}</strong><br />
                  <span style={{ color: '#555', fontSize: '13px' }}>{t.oficio}</span><br />
                  <span style={{ color: '#BA7517' }}>★ {t.rating}</span><br />
                  <button style={{
                    marginTop: '8px', width: '100%', padding: '7px',
                    background: '#1D9E75', color: 'white', border: 'none',
                    borderRadius: '6px', cursor: 'pointer', fontSize: '13px'
                  }}>
                    Contactar
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          background: 'rgba(0,0,0,0.7)', color: 'white',
          padding: '6px 12px', borderRadius: '20px',
          fontSize: '12px', zIndex: 1000
        }}>
          {trabajadoresFiltrados.length} trabajadores cerca
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-around',
        padding: '12px 0', background: '#0D0D0D',
        borderTop: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        {[['🗺️', 'Mapa'], ['➕', 'Publicar'], ['💬', 'Chats'], ['👤', 'Perfil']].map(([icon, label]) => (
          <button key={label} type="button"
            onClick={() => label === 'Publicar' && setPantalla('publicar')}
            style={{
              background: 'transparent', border: 'none',
              color: pantalla === 'publicar' && label === 'Publicar' ? '#1D9E75' :
                     label === 'Mapa' && pantalla === 'mapa' ? '#1D9E75' :
                     'rgba(255,255,255,0.5)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px',
              cursor: 'pointer', fontSize: '20px',
              fontFamily: 'sans-serif'
            }}
          >
            {icon}
            <span style={{ fontSize: '11px' }}>{label}</span>
          </button>
        ))}
      </div>

    </div>
  )
}