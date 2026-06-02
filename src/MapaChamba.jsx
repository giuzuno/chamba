import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import PublicarTrabajo from './PublicarTrabajo'
import MisPublicaciones from './MisPublicaciones'
import PerfilCliente from './PerfilCliente'
import PublicarViaje from './PublicarViaje'
import BuscarTrabajadores from './BuscarTrabajadores'
import LogoChamba from './LogoChamba'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const SALINA_CRUZ = [16.1833, -95.2000]

const CATEGORIAS_ICONS_MAPA = {
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
  'Taxi / Chofer': '🚕', 'Moto taxi': '🏍️', 'Repartidor moto': '🛵', 'Mandados': '🛍️',
  'Taxi': '🚕', 'Flete': '🚛',
}

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
        <button type="button" onClick={onServicio} style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '20px', padding: '24px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px' }}>
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
        <button type="button" onClick={onViaje} style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '20px', padding: '24px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px' }}>
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

function MapaDragListener({ onDragStart, onDragEnd }) {
  useMapEvents({
    dragstart: () => onDragStart(),
    dragend: () => onDragEnd(),
    movestart: () => onDragStart(),
    moveend: () => onDragEnd(),
  })
  return null
}

export default function MapaChamba({ onLogout, userEmail, userId, onCambiarModo, noLeidas = 0, onNotificaciones, irAMisPublicaciones, trabajoIdInicial, onNavegacionCompletada }) {
  const [trabajosPublicados, setTrabajosPublicados] = useState([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos')
  const [cargando, setCargando] = useState(false)
  const [pantalla, setPantalla] = useState('mapa')
  const [barVisible, setBarVisible] = useState(true)
  const [ciudad, setCiudad] = useState('...')
  const [modalOpciones, setModalOpciones] = useState(false)

  const CATEGORIAS = ['Todos', 'Electricista', 'Plomero', 'Cocinera', 'Limpieza', 'Pintor', 'Cerrajero', 'Mecánico']

  // Navegar a Mis publicaciones desde toast
  useEffect(() => {
    if (irAMisPublicaciones) {
      setPantalla('publicaciones')
      onNavegacionCompletada?.()
    }
  }, [irAMisPublicaciones])

  useEffect(() => {
    cargarTrabajosPublicados()
    obtenerCiudad()
  }, [])

  async function obtenerCiudad() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'Accept-Language': 'es' } }
        )
        const data = await res.json()
        const ciudad = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || 'Tu ubicación'
        const estado = data.address?.state || ''
        setCiudad(estado ? `${ciudad}, ${estado}` : ciudad)
      } catch { setCiudad('Tu ubicación') }
    }, () => { setCiudad('Ubicación no disponible') })
  }

  async function cargarTrabajosPublicados() {
    setCargando(true)
    const { data } = await supabase
      .from('trabajos')
      .select('id, categoria, descripcion, presupuesto, ultima_oferta, lat, lng, creado_en')
      .eq('status', 'publicado')
      .not('lat', 'is', null)
      .not('lng', 'is', null)
      .order('creado_en', { ascending: false })
    if (data) setTrabajosPublicados(data)
    setCargando(false)
  }

  const trabajosFiltrados = categoriaFiltro === 'Todos'
    ? trabajosPublicados
    : trabajosPublicados.filter(t => t.categoria === categoriaFiltro)

  if (pantalla === 'seleccionar') return <SeleccionarTipoPublicacion onVolver={() => setPantalla('mapa')} onServicio={() => setPantalla('publicar')} onViaje={() => setPantalla('viaje')} />
  if (pantalla === 'publicar') return <PublicarTrabajo onVolver={() => setPantalla('seleccionar')} userId={userId} />
  if (pantalla === 'viaje') return <PublicarViaje onVolver={() => setPantalla('seleccionar')} userId={userId} />
  if (pantalla === 'publicaciones') return <MisPublicaciones onVolver={() => setPantalla('mapa')} userId={userId} trabajoIdInicial={trabajoIdInicial} onTrabajoAbierto={() => {}} />
  if (pantalla === 'perfil') return <PerfilCliente onVolver={() => setPantalla('mapa')} userId={userId} userEmail={userEmail} />
  if (pantalla === 'buscar') return <BuscarTrabajadores userId={userId} onVolver={() => setPantalla('mapa')} />

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#0D0D0D' }}>

      {/* Modal Opciones */}
      {modalOpciones && (
        <div onClick={() => setModalOpciones(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1A1A', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Opciones</p>
            <button type="button" onClick={() => { setModalOpciones(false); onCambiarModo() }} style={{ width: '100%', padding: '16px', marginBottom: '10px', background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              🔧 Cambiar a modo trabajador
            </button>
            <button type="button" onClick={() => { setModalOpciones(false); onLogout() }} style={{ width: '100%', padding: '14px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#0D0D0D', borderBottom: '0.5px solid rgba(255,255,255,0.1)', zIndex: 1000 }}>
        <LogoChamba size='sm' />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>📍 {ciudad}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" onClick={onNotificaciones} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', fontSize: '16px' }}>
            🔔
            {noLeidas > 0 && (
              <span style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#F09595', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 5px', minWidth: '16px', textAlign: 'center' }}>
                {noLeidas > 99 ? '99+' : noLeidas}
              </span>
            )}
          </button>
          <button type="button" onClick={() => setModalOpciones(true)} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: '500' }}>
            ⚙️ Opciones
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', background: '#0D0D0D', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        {CATEGORIAS.map(cat => (
          <button key={cat} type="button" onClick={() => setCategoriaFiltro(cat)} style={{ background: categoriaFiltro === cat ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: categoriaFiltro === cat ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'sans-serif' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={SALINA_CRUZ} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapaDragListener onDragStart={() => setBarVisible(false)} onDragEnd={() => setBarVisible(true)} />
          {trabajosFiltrados.map(t => {
            const icono = L.divIcon({
              html: `<div style="background:#1D9E75;border:3px solid white;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${CATEGORIAS_ICONS_MAPA[t.categoria] || '✳️'}</div>`,
              className: '', iconSize: [44,44], iconAnchor: [22,22], popupAnchor: [0,-26],
            })
            return (
              <Marker key={t.id} position={[t.lat, t.lng]} icon={icono}>
                <Popup>
                  <div style={{ minWidth: '180px', fontFamily: 'sans-serif' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '20px' }}>{CATEGORIAS_ICONS_MAPA[t.categoria] || '✳️'}</span>
                      <strong style={{ fontSize: '14px', color: '#111' }}>{t.categoria}</strong>
                    </div>
                    <p style={{ fontSize: '12px', color: '#555', marginBottom: '6px', lineHeight: '1.4' }}>
                      {t.descripcion?.substring(0, 60)}{t.descripcion?.length > 60 ? '...' : ''}
                    </p>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75', marginBottom: '8px' }}>
                      ${t.ultima_oferta || t.presupuesto} MXN
                    </p>
                    <button onClick={() => setPantalla('publicaciones')} style={{ width: '100%', padding: '7px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      Ver trabajo
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', zIndex: 1000 }}>
          {cargando ? '⏳ Cargando...' : `${trabajosFiltrados.length} trabajo${trabajosFiltrados.length !== 1 ? 's' : ''} cerca`}
        </div>
        {!cargando && trabajosFiltrados.length === 0 && (
          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(13,13,13,0.9)', border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', padding: '10px 20px', borderRadius: '20px', fontSize: '13px', zIndex: 1000, whiteSpace: 'nowrap' }}>
            📭 No hay trabajos publicados ahorita
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0', background: '#0D0D0D', borderTop: '0.5px solid rgba(255,255,255,0.1)', transform: barVisible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s ease', position: 'relative', zIndex: 1000 }}>
        {[['🗺️', 'Mapa'], ['➕', 'Publicar'], ['🔍', 'Buscar'], ['📋', 'Mis trabajos'], ['👤', 'Perfil']].map(([icon, label]) => (
          <button key={label} type="button"
            onClick={() => {
              if (label === 'Mapa') setPantalla('mapa')
              if (label === 'Publicar') setPantalla('seleccionar')
              if (label === 'Buscar') setPantalla('buscar')
              if (label === 'Mis trabajos') setPantalla('publicaciones')
              if (label === 'Perfil') setPantalla('perfil')
            }}
            style={{
              background: 'transparent', border: 'none',
              color: (pantalla === 'mapa' && label === 'Mapa') ||
                     (['seleccionar','publicar','viaje'].includes(pantalla) && label === 'Publicar') ||
                     (pantalla === 'buscar' && label === 'Buscar') ||
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
