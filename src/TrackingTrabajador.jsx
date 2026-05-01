import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export default function TrackingTrabajador({ trabajo, onVolver }) {
  const [enCamino, setEnCamino] = useState(trabajo.trabajador_en_camino || false)
  const [llego, setLlego] = useState(trabajo.trabajador_llego || false)
  const [posicion, setPosicion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [watchId, setWatchId] = useState(null)

  useEffect(() => {
    // Si ya estaba en camino, reanudar tracking
    if (enCamino && !llego) {
      iniciarTracking()
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  function iniciarTracking() {
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setPosicion([latitude, longitude])

        // Actualizar posición en Supabase cada vez que se mueve
        await supabase.from('trabajos').update({
          trabajador_lat: latitude,
          trabajador_lng: longitude,
        }).eq('id', trabajo.id)
      },
      (err) => console.log('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    setWatchId(id)
  }

  async function activarEnCamino() {
    setLoading(true)
    await supabase.from('trabajos').update({
      trabajador_en_camino: true,
    }).eq('id', trabajo.id)
    setEnCamino(true)
    iniciarTracking()
    setLoading(false)
  }

  async function confirmarLlegada() {
    setLoading(true)
    if (watchId) navigator.geolocation.clearWatch(watchId)
    await supabase.from('trabajos').update({
      trabajador_llego: true,
      trabajador_en_camino: false,
    }).eq('id', trabajo.id)
    setLlego(true)
    setLoading(false)
  }

  const destino = trabajo.lat && trabajo.lng ? [trabajo.lat, trabajo.lng] : null
  const centro = posicion || destino || [16.1833, -95.2000]

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px 20px',
        borderBottom: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        <button type="button" onClick={onVolver} style={{
          background: 'transparent', color: 'rgba(255,255,255,0.6)',
          border: 'none', fontSize: '20px', cursor: 'pointer'
        }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
          {llego ? '✅ Llegaste' : enCamino ? '🚗 En camino...' : '📍 Ir al trabajo'}
        </h2>
      </div>

      {/* Info del trabajo */}
      <div style={{
        padding: '14px 20px',
        background: 'rgba(29,158,117,0.08)',
        borderBottom: '0.5px solid rgba(29,158,117,0.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <p style={{ fontSize: '15px', fontWeight: '600' }}>{trabajo.categoria}</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            📅 {trabajo.fecha_cita} · 🕐 {trabajo.hora_cita?.slice(0, 5)} hrs
          </p>
        </div>
        <span style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75' }}>
          ${trabajo.precio_acordado || trabajo.presupuesto} MXN
        </span>
      </div>

      {/* Mapa */}
      <div style={{ height: '350px', position: 'relative' }}>
        <MapContainer center={centro} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Tu posición */}
          {posicion && (
            <Marker position={posicion}>
              <Popup>📍 Tu ubicación</Popup>
            </Marker>
          )}

          {/* Destino del cliente */}
          {destino && (
            <Marker position={destino}>
              <Popup>🏠 Destino del cliente</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Badge en camino */}
        {enCamino && !llego && (
          <div style={{
            position: 'absolute', top: '10px', left: '50%',
            transform: 'translateX(-50%)',
            background: '#1D9E75', color: 'white',
            padding: '6px 16px', borderRadius: '20px',
            fontSize: '12px', fontWeight: '600', zIndex: 1000
          }}>
            🟢 Compartiendo ubicación en tiempo real
          </div>
        )}
      </div>

      {/* Acciones */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {!enCamino && !llego && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '14px 16px',
              fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6'
            }}>
              📍 Al tocar "Estoy en camino" el cliente verá tu ubicación en tiempo real en su mapa y recibirá una notificación.
            </div>
            <button type="button" onClick={activarEnCamino} disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75',
              color: 'white', border: 'none', borderRadius: '14px',
              fontSize: '16px', fontWeight: '600', cursor: 'pointer',
              fontFamily: 'sans-serif'
            }}>
              {loading ? 'Activando...' : '🚗 Estoy en camino'}
            </button>
          </>
        )}

        {enCamino && !llego && (
          <>
            <div style={{
              background: 'rgba(29,158,117,0.08)',
              border: '0.5px solid rgba(29,158,117,0.3)',
              borderRadius: '12px', padding: '14px 16px',
              fontSize: '13px', color: '#1D9E75', textAlign: 'center'
            }}>
              El cliente puede ver tu ubicación en tiempo real 👀
            </div>
            <button type="button" onClick={confirmarLlegada} disabled={loading} style={{
              width: '100%', padding: '16px',
              background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75',
              color: 'white', border: 'none', borderRadius: '14px',
              fontSize: '16px', fontWeight: '600', cursor: 'pointer',
              fontFamily: 'sans-serif'
            }}>
              {loading ? 'Confirmando...' : '✅ Llegué al domicilio'}
            </button>
          </>
        )}

        {llego && (
          <div style={{
            background: 'rgba(29,158,117,0.12)',
            border: '0.5px solid rgba(29,158,117,0.4)',
            borderRadius: '14px', padding: '20px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏠</div>
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#1D9E75', marginBottom: '6px' }}>
              ¡Llegaste al domicilio!
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              El cliente fue notificado. Realiza el trabajo y marca como completado cuando termines.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}