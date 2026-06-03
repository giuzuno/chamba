import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { enviarNotificacionCompleta } from './guardarNotificacion'

delete L.Icon.Default.prototype._getIconUrl

const iconoChofer = L.divIcon({
  html: `<div style="background:#1D9E75;border:3px solid white;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🚗</div>`,
  className: '', iconSize: [44,44], iconAnchor: [22,22], popupAnchor: [0,-26],
})
const iconoOrigen = L.divIcon({
  html: `<div style="background:#1D9E75;border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">📍</div>`,
  className: '', iconSize: [38,38], iconAnchor: [19,19],
})
const iconoDestino = L.divIcon({
  html: `<div style="background:#378ADD;border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏁</div>`,
  className: '', iconSize: [38,38], iconAnchor: [19,19],
})
const iconoCliente = L.divIcon({
  html: `<div style="background:#378ADD;border:3px solid white;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏠</div>`,
  className: '', iconSize: [42,42], iconAnchor: [21,21], popupAnchor: [0,-24],
})

const CATEGORIAS_VIAJE = ['Taxi / Chofer', 'Moto taxi', 'Repartidor moto', 'Fletes', 'Taxi', 'Moto Raite', 'Raite', 'Flete', 'Moto Mandados']

export default function TrackingTrabajador({ trabajo, onVolver }) {
  const [enCamino, setEnCamino] = useState(trabajo.trabajador_en_camino || false)
  const [llego, setLlego] = useState(trabajo.trabajador_llego || false)
  const [viajeIniciado, setViajeIniciado] = useState(trabajo.trabajo_iniciado || false)
  const [posicion, setPosicion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [watchId, setWatchId] = useState(null)
  const [compartirUrl, setCompartirUrl] = useState(null)

  const esViaje = trabajo.es_viaje || CATEGORIAS_VIAJE.includes(trabajo.categoria)

  useEffect(() => {
    // Iniciar tracking GPS inmediatamente si ya está en camino
    if (enCamino && !llego) iniciarTracking()
    // Si es viaje — iniciar GPS desde que abre el tracking (aunque no haya marcado en camino)
    else if (esViaje && !llego) iniciarTracking()
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId) }
  }, [])

  function iniciarTracking() {
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setPosicion([latitude, longitude])
        await supabase.from('trabajos').update({
          trabajador_lat: latitude,
          trabajador_lng: longitude,
        }).eq('id', trabajo.id)
      },
      err => console.log('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
    setWatchId(id)
  }

  async function activarEnCamino() {
    setLoading(true)
    await supabase.from('trabajos').update({ trabajador_en_camino: true }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🚗 Tu conductor está en camino',
      cuerpo: `Tu ${trabajo.categoria} está en camino. Puedes ver su ubicación en tiempo real.`,
      tipo: 'en_camino',
      trabajoId: trabajo.id,
    })
    setEnCamino(true)
    if (!watchId) iniciarTracking()
    setLoading(false)
  }

  async function confirmarLlegadaOrigen() {
    setLoading(true)
    if (watchId) navigator.geolocation.clearWatch(watchId)
    await supabase.from('trabajos').update({
      trabajador_llego: true,
      trabajador_en_camino: false,
    }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '📍 ¡Tu conductor llegó!',
      cuerpo: `Tu ${trabajo.categoria} llegó al punto de recogida. ¡Sal a buscarlo!`,
      tipo: 'llegada',
      trabajoId: trabajo.id,
    })
    setLlego(true)
    setLoading(false)
  }

  async function iniciarViaje() {
    setLoading(true)
    await supabase.from('trabajos').update({ trabajo_iniciado: true }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🚀 ¡Viaje iniciado!',
      cuerpo: `Tu ${trabajo.categoria} ha iniciado. Tracking activo durante todo el trayecto.`,
      tipo: 'general',
      trabajoId: trabajo.id,
    })
    setViajeIniciado(true)
    // Reiniciar tracking durante el viaje
    iniciarTracking()
    setLoading(false)
  }

  async function confirmarLlegadaDestino() {
    setLoading(true)
    if (watchId) navigator.geolocation.clearWatch(watchId)
    await supabase.from('trabajos').update({
      status: 'en_revision',
      en_revision_desde: new Date().toISOString(),
    }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🏁 ¡Llegaron al destino!',
      cuerpo: `Tu ${trabajo.categoria} llegó al destino. Confirma para liberar el pago.`,
      tipo: 'trabajo_completado',
      trabajoId: trabajo.id,
    })
    setLoading(false)
    onVolver()
  }

  // Para trabajos normales (no viaje)
  async function confirmarLlegadaNormal() {
    setLoading(true)
    if (watchId) navigator.geolocation.clearWatch(watchId)
    await supabase.from('trabajos').update({
      trabajador_llego: true,
      trabajador_en_camino: false,
    }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🏠 ¡El trabajador llegó!',
      cuerpo: `Tu ${trabajo.categoria} llegó a tu domicilio.`,
      tipo: 'llegada',
      trabajoId: trabajo.id,
    })
    setLlego(true)
    setLoading(false)
  }

  function compartirViajePorWhatsApp() {
    const url = `https://chamba-delta.vercel.app`
    const texto = `🚗 Estoy en un ${trabajo.categoria} via Chamba.\n📍 Puedes ver mi ubicación en tiempo real.\n\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const origenPunto = trabajo.origen_lat && trabajo.origen_lng ? [trabajo.origen_lat, trabajo.origen_lng] : (trabajo.lat && trabajo.lng ? [trabajo.lat, trabajo.lng] : null)
  const destinoPunto = trabajo.destino_lat && trabajo.destino_lng ? [trabajo.destino_lat, trabajo.destino_lng] : null
  const clientePunto = !esViaje && trabajo.lat && trabajo.lng ? [trabajo.lat, trabajo.lng] : null
  const centro = posicion || origenPunto || [16.1833, -95.2000]

  // Estado actual del viaje
  const estadoLabel = () => {
    if (!esViaje) {
      if (llego) return '✅ Llegaste'
      if (enCamino) return '🚗 En camino...'
      return '📍 Ir al trabajo'
    }
    if (viajeIniciado) return '🚀 Viaje en curso'
    if (llego) return '📍 Pasajero recogido — en camino al destino'
    if (enCamino) return '🚗 Yendo al pasajero...'
    return '📍 Listo para salir'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '16px', fontWeight: '700', flex: 1 }}>{estadoLabel()}</h2>
        {esViaje && (
          <button type="button" onClick={compartirViajePorWhatsApp} style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '10px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            📲 Compartir
          </button>
        )}
      </div>

      {/* Info trabajo */}
      <div style={{ padding: '12px 20px', background: 'rgba(29,158,117,0.08)', borderBottom: '0.5px solid rgba(29,158,117,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: '600' }}>{trabajo.categoria}</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            {trabajo.distancia_km ? `📏 ${trabajo.distancia_km} km` : ''} 
            {trabajo.fecha_cita ? ` · 📅 ${trabajo.fecha_cita} ${trabajo.hora_cita?.slice(0,5)}` : ''}
          </p>
        </div>
        <span style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75' }}>
          ${trabajo.precio_acordado || trabajo.presupuesto} MXN
        </span>
      </div>

      {/* Mapa */}
      <div style={{ height: '340px', position: 'relative' }}>
        <MapContainer center={centro} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Posición actual del conductor */}
          {posicion && (
            <Marker position={posicion} icon={iconoChofer}>
              <Popup>🚗 Tu ubicación</Popup>
            </Marker>
          )}

          {/* Para viajes */}
          {esViaje && origenPunto && !viajeIniciado && (
            <Marker position={origenPunto} icon={iconoOrigen}>
              <Popup>📍 Punto de recogida</Popup>
            </Marker>
          )}
          {esViaje && destinoPunto && viajeIniciado && (
            <Marker position={destinoPunto} icon={iconoDestino}>
              <Popup>🏁 Destino</Popup>
            </Marker>
          )}
          {esViaje && posicion && viajeIniciado && destinoPunto && (
            <Polyline positions={[posicion, destinoPunto]} color="#378ADD" weight={3} dashArray="8,6" opacity={0.7} />
          )}
          {esViaje && posicion && !viajeIniciado && origenPunto && (
            <Polyline positions={[posicion, origenPunto]} color="#1D9E75" weight={3} dashArray="8,6" opacity={0.7} />
          )}

          {/* Para trabajos normales */}
          {!esViaje && clientePunto && (
            <Marker position={clientePunto} icon={iconoCliente}>
              <Popup>🏠 Domicilio del cliente</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Badge de GPS activo */}
        {(enCamino || esViaje) && !llego && (
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', animation: 'pulse 1.5s infinite' }} />
            GPS activo — compartiendo ubicación
          </div>
        )}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      </div>

      {/* Controles */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* ── FLUJO VIAJE ── */}
        {esViaje && (
          <>
            {!enCamino && !llego && !viajeIniciado && (
              <>
                <div style={{ background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
                  📍 Al tocar "Voy en camino" el pasajero verá tu ubicación en tiempo real.
                  {origenPunto && <span style={{ color: '#1D9E75', fontWeight: '600', display: 'block', marginTop: '4px' }}>Punto de recogida marcado en el mapa ↑</span>}
                </div>
                <button type="button" onClick={activarEnCamino} disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Activando...' : '🚗 Voy en camino al pasajero'}
                </button>
              </>
            )}

            {enCamino && !llego && !viajeIniciado && (
              <>
                <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#1D9E75', textAlign: 'center', fontWeight: '500' }}>
                  El pasajero te está esperando y ve tu ubicación en tiempo real 👀
                </div>
                <button type="button" onClick={confirmarLlegadaOrigen} disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? 'rgba(55,138,221,0.5)' : '#378ADD', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Confirmando...' : '📍 Llegué al punto de recogida'}
                </button>
              </>
            )}

            {llego && !viajeIniciado && (
              <>
                <div style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '28px', marginBottom: '8px' }}>👋</p>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#378ADD', marginBottom: '4px' }}>¡Llegaste al punto de recogida!</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Espera al pasajero e inicia el viaje cuando suba.</p>
                </div>
                <button type="button" onClick={iniciarViaje} disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Iniciando...' : '🚀 Iniciar viaje — pasajero a bordo'}
                </button>
              </>
            )}

            {viajeIniciado && (
              <>
                <div style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '28px', marginBottom: '8px' }}>🚀</p>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#1D9E75', marginBottom: '4px' }}>Viaje en curso</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>GPS activo durante todo el trayecto. El destino está marcado en el mapa.</p>
                </div>
                <button type="button" onClick={confirmarLlegadaDestino} disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Procesando...' : '🏁 Llegamos al destino'}
                </button>
              </>
            )}
          </>
        )}

        {/* ── FLUJO TRABAJO NORMAL ── */}
        {!esViaje && (
          <>
            {!enCamino && !llego && (
              <>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
                  📍 Al tocar "Estoy en camino" el cliente verá tu ubicación en tiempo real.
                </div>
                <button type="button" onClick={activarEnCamino} disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Activando...' : '🚗 Estoy en camino'}
                </button>
              </>
            )}

            {enCamino && !llego && (
              <>
                <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: '#1D9E75', textAlign: 'center' }}>
                  El cliente puede ver tu ubicación en tiempo real 👀
                </div>
                <button type="button" onClick={confirmarLlegadaNormal} disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Confirmando...' : '✅ Llegué al domicilio'}
                </button>
              </>
            )}

            {llego && (
              <div style={{ background: 'rgba(29,158,117,0.12)', border: '0.5px solid rgba(29,158,117,0.4)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏠</div>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#1D9E75', marginBottom: '6px' }}>¡Llegaste al domicilio!</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Realiza el trabajo y marca como completado cuando termines.</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
