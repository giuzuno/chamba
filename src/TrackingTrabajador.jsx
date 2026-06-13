import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { enviarNotificacionCompleta } from './guardarNotificacion'
import BotonPanico from './BotonPanico'

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
  className: '', iconSize: [42,42], iconAnchor: [21,21],
})

const CATEGORIAS_VIAJE = ['Taxi / Chofer', 'Moto taxi', 'Repartidor moto', 'Fletes', 'Taxi', 'Moto Raite', 'Raite', 'Flete', 'Moto Mandados']
const RADIO_LLEGADA_METROS = 150 // distancia en metros para liberar botón de llegada

function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function abrirNavegacion(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank')
}
function abrirWaze(lat, lng) {
  window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank')
}

export default function TrackingTrabajador({ trabajo, onVolver, userId, perfilUsuario }) {
  const [enCamino, setEnCamino] = useState(trabajo.trabajador_en_camino || false)
  const [llego, setLlego] = useState(trabajo.trabajador_llego || false)
  const [pasajeroSubio, setPasajeroSubio] = useState(trabajo.pasajero_subio || false)
  const [viajeIniciado, setViajeIniciado] = useState(trabajo.trabajo_iniciado || false)
  const [posicion, setPosicion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [watchId, setWatchId] = useState(null)
  const [modalNavegacion, setModalNavegacion] = useState(null)
  const [cercaDestino, setCercaDestino] = useState(false)
  const [modalDestinoAlternativo, setModalDestinoAlternativo] = useState(false)

  const esViaje = trabajo.es_viaje || CATEGORIAS_VIAJE.includes(trabajo.categoria)
  const destinoLat = trabajo.destino_lat
  const destinoLng = trabajo.destino_lng
  const origenLat = trabajo.origen_lat || trabajo.lat
  const origenLng = trabajo.origen_lng || trabajo.lng

  // Suscribirse a cambios en tiempo real para detectar cuando el pasajero confirma que subió
  useEffect(() => {
    if (!esViaje) return
    const channel = supabase.channel(`trabajo-${trabajo.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trabajos', filter: `id=eq.${trabajo.id}` },
        (payload) => {
          if (payload.new.pasajero_subio && !pasajeroSubio) {
            setPasajeroSubio(true)
          }
        }
      ).subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (enCamino && !llego) iniciarTracking()
    else if (esViaje && !llego) iniciarTracking()
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId) }
  }, [])

  function iniciarTracking() {
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setPosicion([latitude, longitude])
        await supabase.from('trabajos').update({ trabajador_lat: latitude, trabajador_lng: longitude }).eq('id', trabajo.id)

        // Verificar si está cerca del destino durante el viaje
        if (viajeIniciado && destinoLat && destinoLng) {
          const dist = distanciaMetros(latitude, longitude, destinoLat, destinoLng)
          setCercaDestino(dist <= RADIO_LLEGADA_METROS)
        }
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
      cuerpo: `Tu ${trabajo.categoria} está en camino al punto de recogida.`,
      tipo: 'en_camino', trabajoId: trabajo.id,
    })
    setEnCamino(true)
    if (!watchId) iniciarTracking()
    setLoading(false)
    if (origenLat && origenLng) setModalNavegacion({ lat: origenLat, lng: origenLng, label: 'punto de recogida' })
  }

  async function confirmarLlegadaOrigen() {
    setLoading(true)
    if (watchId) navigator.geolocation.clearWatch(watchId)
    await supabase.from('trabajos').update({ trabajador_llego: true, trabajador_en_camino: false }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '📍 ¡Tu conductor llegó!',
      cuerpo: `Tu ${trabajo.categoria} llegó al punto de recogida. ¡Sal a buscarlo!`,
      tipo: 'llegada', trabajoId: trabajo.id,
    })
    setLlego(true)
    setLoading(false)
  }

  async function iniciarViaje() {
    if (!pasajeroSubio) return // No puede iniciar sin confirmación del pasajero
    setLoading(true)
    await supabase.from('trabajos').update({ trabajo_iniciado: true }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🚀 ¡Viaje iniciado!',
      cuerpo: `El viaje ha comenzado. Tracking activo.`,
      tipo: 'general', trabajoId: trabajo.id,
    })
    setViajeIniciado(true)
    iniciarTracking()
    setLoading(false)
    if (destinoLat && destinoLng) setModalNavegacion({ lat: destinoLat, lng: destinoLng, label: 'destino' })
  }

  async function confirmarLlegadaDestino() {
    if (!cercaDestino) return // GPS verifica que esté cerca
    setLoading(true)
    if (watchId) navigator.geolocation.clearWatch(watchId)
    await supabase.from('trabajos').update({ status: 'en_revision', en_revision_desde: new Date().toISOString() }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🏁 ¡Llegaron al destino!',
      cuerpo: `Tu ${trabajo.categoria} llegó al destino. Confirma para liberar el pago.`,
      tipo: 'trabajo_completado', trabajoId: trabajo.id,
    })
    setLoading(false)
    onVolver()
  }

  async function pasajeroSeBojoAntes() {
    setLoading(true)
    if (watchId) navigator.geolocation.clearWatch(watchId)
    // Guardar la posición actual como destino alternativo
    const lat = posicion?.[0] || destinoLat
    const lng = posicion?.[1] || destinoLng
    await supabase.from('trabajos').update({
      status: 'en_revision',
      en_revision_desde: new Date().toISOString(),
      destino_alternativo: true,
      destino_alt_lat: lat,
      destino_alt_lng: lng,
    }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '📍 Viaje finalizado',
      cuerpo: `Tu conductor indica que bajaste en un punto diferente al destino original. Confirma el pago si estás de acuerdo.`,
      tipo: 'trabajo_completado', trabajoId: trabajo.id,
    })
    setLoading(false)
    setModalDestinoAlternativo(false)
    onVolver()
  }

  // Para trabajos normales
  async function activarEnCaminoNormal() {
    setLoading(true)
    await supabase.from('trabajos').update({ trabajador_en_camino: true }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🚗 ¡El trabajador está en camino!',
      cuerpo: `Tu ${trabajo.categoria} va en camino a tu domicilio.`,
      tipo: 'en_camino', trabajoId: trabajo.id,
    })
    setEnCamino(true)
    if (!watchId) iniciarTracking()
    setLoading(false)
    if (origenLat && origenLng) setModalNavegacion({ lat: origenLat, lng: origenLng, label: 'domicilio del cliente' })
  }

  async function confirmarLlegadaNormal() {
    setLoading(true)
    if (watchId) navigator.geolocation.clearWatch(watchId)
    await supabase.from('trabajos').update({ trabajador_llego: true, trabajador_en_camino: false }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🏠 ¡El trabajador llegó!',
      cuerpo: `Tu ${trabajo.categoria} llegó a tu domicilio.`,
      tipo: 'llegada', trabajoId: trabajo.id,
    })
    setLlego(true)
    setLoading(false)
  }

  function compartirViajePorWhatsApp() {
    const texto = `🚗 Estoy en un ${trabajo.categoria} via Chamba.\nhttps://chamba-delta.vercel.app`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  }

  const origenPunto = origenLat && origenLng ? [origenLat, origenLng] : null
  const destinoPunto = destinoLat && destinoLng ? [destinoLat, destinoLng] : null
  const clientePunto = !esViaje && trabajo.lat && trabajo.lng ? [trabajo.lat, trabajo.lng] : null
  const centro = posicion || origenPunto || [16.1833, -95.2000]

  const estadoLabel = () => {
    if (!esViaje) {
      if (llego) return '✅ Llegaste'
      if (enCamino) return '🚗 En camino...'
      return '📍 Ir al trabajo'
    }
    if (viajeIniciado) return '🚀 Viaje en curso'
    if (pasajeroSubio) return '✅ Pasajero a bordo — listo para salir'
    if (llego) return '📍 Esperando que el pasajero suba'
    if (enCamino) return '🚗 Yendo al pasajero...'
    return '📍 Listo para salir'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Modal de navegación */}
      {modalNavegacion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ background: '#1A1A1A', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '480px', padding: '24px', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <p style={{ fontSize: '18px', fontWeight: '700', color: 'white', textAlign: 'center', marginBottom: '6px' }}>🗺️ ¿Abrir navegación?</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '20px' }}>Navegar al {modalNavegacion.label}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" onClick={() => { abrirNavegacion(modalNavegacion.lat, modalNavegacion.lng); setModalNavegacion(null) }}
                style={{ width: '100%', padding: '14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                🗺️ Abrir en Google Maps
              </button>
              <button type="button" onClick={() => { abrirWaze(modalNavegacion.lat, modalNavegacion.lng); setModalNavegacion(null) }}
                style={{ width: '100%', padding: '14px', background: 'rgba(0,174,239,0.15)', color: '#00AEEF', border: '1px solid rgba(0,174,239,0.3)', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                🔵 Abrir en Waze
              </button>
              <button type="button" onClick={() => setModalNavegacion(null)}
                style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Continuar sin navegación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal destino alternativo */}
      {modalDestinoAlternativo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'sans-serif' }}>
          <div style={{ background: '#1A1A1A', borderRadius: '20px', width: '100%', maxWidth: '340px', padding: '28px', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>📍</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '10px' }}>¿El pasajero bajó aquí?</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.6', marginBottom: '20px' }}>
              Se registrará tu ubicación actual como el destino final. El cliente tendrá que confirmar el pago.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" onClick={pasajeroSeBojoAntes} disabled={loading}
                style={{ width: '100%', padding: '14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ✅ Sí, el pasajero bajó aquí
              </button>
              <button type="button" onClick={() => setModalDestinoAlternativo(false)}
                style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Cancelar — seguir al destino
              </button>
            </div>
          </div>
        </div>
      )}

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
            {trabajo.tipo_viaje === 'redondo' ? ' · 🔄 Redondo' : ''}
            {trabajo.tipo_viaje === 'paradas' ? ' · 🔶 Con paradas' : ''}
          </p>
        </div>
        <span style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75' }}>${trabajo.precio_acordado || trabajo.presupuesto} MXN</span>
      </div>

      {/* Mapa */}
      <div style={{ height: '300px', position: 'relative' }}>
        <MapContainer center={centro} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {posicion && <Marker position={posicion} icon={iconoChofer}><Popup>🚗 Tu ubicación</Popup></Marker>}
          {esViaje && origenPunto && !viajeIniciado && <Marker position={origenPunto} icon={iconoOrigen}><Popup>📍 Punto de recogida</Popup></Marker>}
          {esViaje && destinoPunto && viajeIniciado && <Marker position={destinoPunto} icon={iconoDestino}><Popup>🏁 Destino</Popup></Marker>}
          {esViaje && posicion && viajeIniciado && destinoPunto && <Polyline positions={[posicion, destinoPunto]} color="#378ADD" weight={3} dashArray="8,6" opacity={0.7} />}
          {esViaje && posicion && !viajeIniciado && origenPunto && <Polyline positions={[posicion, origenPunto]} color="#1D9E75" weight={3} dashArray="8,6" opacity={0.7} />}
          {!esViaje && clientePunto && <Marker position={clientePunto} icon={iconoCliente}><Popup>🏠 Domicilio del cliente</Popup></Marker>}
        </MapContainer>

        {(enCamino || esViaje) && !llego && (
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', animation: 'pulse 1.5s infinite' }} />
            GPS activo
          </div>
        )}

        {/* Badge cerca del destino */}
        {viajeIniciado && cercaDestino && (
          <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: '#378ADD', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', zIndex: 1000 }}>
            🏁 ¡Llegaste al destino!
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
                </div>
                <button type="button" onClick={activarEnCamino} disabled={loading}
                  style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Activando...' : '🚗 Voy en camino al pasajero'}
                </button>
              </>
            )}

            {enCamino && !llego && (
              <>
                <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#1D9E75', textAlign: 'center', fontWeight: '500' }}>
                  El pasajero ve tu ubicación en tiempo real 👀
                </div>
                <button type="button" onClick={confirmarLlegadaOrigen} disabled={loading}
                  style={{ width: '100%', padding: '16px', background: loading ? 'rgba(55,138,221,0.5)' : '#378ADD', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Confirmando...' : '📍 Llegué al punto de recogida'}
                </button>
              </>
            )}

            {llego && !pasajeroSubio && !viajeIniciado && (
              <div style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>⏳</div>
                <p style={{ fontSize: '15px', fontWeight: '700', color: '#378ADD', marginBottom: '6px' }}>Esperando que el pasajero confirme</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
                  El pasajero debe tocar <strong style={{ color: 'white' }}>"Ya subí"</strong> en su pantalla para que puedas iniciar el viaje.
                </p>
              </div>
            )}

            {llego && pasajeroSubio && !viajeIniciado && (
              <>
                <div style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#1D9E75', marginBottom: '4px' }}>¡El pasajero confirmó que subió!</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Ya puedes iniciar el viaje.</p>
                </div>
                <button type="button" onClick={iniciarViaje} disabled={loading}
                  style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Iniciando...' : '🚀 Iniciar viaje'}
                </button>
              </>
            )}

            {viajeIniciado && (
              <>
                <div style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#1D9E75', marginBottom: '4px' }}>🚀 Viaje en curso</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    {cercaDestino ? '🏁 ¡Estás en el destino! Ya puedes finalizar.' : 'GPS activo. El botón se libera cuando llegues al destino.'}
                  </p>
                </div>

                {/* Botón llegar al destino — solo se activa si GPS confirma proximidad */}
                <button type="button" onClick={confirmarLlegadaDestino} disabled={loading || !cercaDestino}
                  style={{ width: '100%', padding: '16px', background: cercaDestino ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: cercaDestino ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: cercaDestino ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif' }}>
                  {loading ? 'Procesando...' : cercaDestino ? '🏁 Llegamos al destino' : '🏁 Llegamos al destino (activa al llegar)'}
                </button>

                {/* Botón destino alternativo */}
                <button type="button" onClick={() => setModalDestinoAlternativo(true)}
                  style={{ width: '100%', padding: '12px', background: 'transparent', color: '#E8A030', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '12px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  📍 El pasajero quiere bajarse antes
                </button>

                {/* Override manual si GPS no detecta llegada */}
                {!cercaDestino && (
                  <button type="button" onClick={() => setCercaDestino(true)}
                    style={{ width: '100%', padding: '10px', background: 'transparent', color: 'rgba(255,255,255,0.2)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    ¿Ya llegaste pero el GPS no lo detecta? Toca aquí
                  </button>
                )}
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
                <button type="button" onClick={activarEnCaminoNormal} disabled={loading}
                  style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {loading ? 'Activando...' : '🚗 Estoy en camino'}
                </button>
              </>
            )}
            {enCamino && !llego && (
              <>
                <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: '#1D9E75', textAlign: 'center' }}>
                  El cliente puede ver tu ubicación en tiempo real 👀
                </div>
                <button type="button" onClick={confirmarLlegadaNormal} disabled={loading}
                  style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
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

        {/* Botón de pánico — siempre visible para el trabajador durante tracking activo */}
        <BotonPanico
          trabajo={trabajo}
          userId={userId}
          rol="trabajador"
          contactoEmergenciaNombre={perfilUsuario?.contacto_emergencia_nombre}
          contactoEmergenciaTelefono={perfilUsuario?.contacto_emergencia_telefono}
        />
      </div>
    </div>
  )
}
