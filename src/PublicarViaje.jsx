import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl

const iconoOrigen = L.divIcon({
  html: `<div style="background:#1D9E75;border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">📍</div>`,
  className: '', iconSize: [38,38], iconAnchor: [19,19],
})

const iconoDestino = L.divIcon({
  html: `<div style="background:#378ADD;border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏁</div>`,
  className: '', iconSize: [38,38], iconAnchor: [19,19],
})

const TIPOS_VIAJE = [
  { id: 'taxi', icon: '🚕', label: 'Taxi', desc: 'Traslado en auto', precioPorKm: 15 },
  { id: 'mototaxi', icon: '🏍️', label: 'Moto taxi', desc: 'Rápido y económico', precioPorKm: 8 },
  { id: 'repartidor', icon: '🛵', label: 'Repartidor', desc: 'Entrega o mandado', precioPorKm: 10 },
  { id: 'flete', icon: '🚛', label: 'Flete', desc: 'Mudanza o carga', precioPorKm: 25 },
]

function SeleccionarPunto({ onSeleccionar }) {
  useMapEvents({
    click(e) { onSeleccionar([e.latlng.lat, e.latlng.lng]) }
  })
  return null
}

function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function PublicarViaje({ onVolver, userId }) {
  const [tipo, setTipo] = useState(null)
  const [paso, setPaso] = useState(1)
  const [ubicacionActual, setUbicacionActual] = useState(null)
  const [origen, setOrigen] = useState(null)
  const [destino, setDestino] = useState(null)
  const [origenEsActual, setOrigenEsActual] = useState(true)
  const [destinoEsActual, setDestinoEsActual] = useState(false)
  const [seleccionandoPunto, setSeleccionandoPunto] = useState(null)
  const [descripcion, setDescripcion] = useState('')
  const [publicando, setPublicando] = useState(false)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setUbicacionActual([pos.coords.latitude, pos.coords.longitude]),
      () => setUbicacionActual([16.1833, -95.2000])
    )
  }, [])

  useEffect(() => {
    if (origenEsActual && ubicacionActual) setOrigen(ubicacionActual)
  }, [origenEsActual, ubicacionActual])

  useEffect(() => {
    if (destinoEsActual && ubicacionActual) setDestino(ubicacionActual)
  }, [destinoEsActual, ubicacionActual])

  const tipoSeleccionado = TIPOS_VIAJE.find(t => t.id === tipo)
  const distancia = origen && destino ? calcularDistancia(origen[0], origen[1], destino[0], destino[1]) : 0
  const precioEstimado = tipoSeleccionado ? Math.round(distancia * tipoSeleccionado.precioPorKm) : 0
  const centro = ubicacionActual || [16.1833, -95.2000]

  async function publicarViaje() {
    if (!origen || !destino || !tipo) return
    setPublicando(true)
    await supabase.from('trabajos').insert({
      cliente_id: userId,
      categoria: tipoSeleccionado.label,
      descripcion: descripcion || `${tipoSeleccionado.label} — ${distancia.toFixed(1)} km`,
      presupuesto: precioEstimado,
      lat: origen[0],
      lng: origen[1],
      origen_lat: origen[0],
      origen_lng: origen[1],
      destino_lat: destino[0],
      destino_lng: destino[1],
      distancia_km: parseFloat(distancia.toFixed(2)),
      es_viaje: true,
      status: 'publicado',
    })
    setExito(true)
    setPublicando(false)
  }

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{tipoSeleccionado?.icon}</div>
        <h2 style={{ color: '#1D9E75', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>¡Viaje publicado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Los choferes cerca verán tu solicitud.</p>
        <p style={{ color: '#1D9E75', fontSize: '28px', fontWeight: '800', marginBottom: '32px' }}>${precioEstimado} MXN estimado</p>
        <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Volver al mapa
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={paso === 1 ? onVolver : () => setPaso(p => p - 1)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
            {paso === 1 ? '¿Qué tipo de servicio?' :
             paso === 2 ? '📍 ¿Desde dónde?' :
             paso === 3 ? '🏁 ¿Hacia dónde?' :
             '✅ Confirmar viaje'}
          </h2>
          {tipoSeleccionado && paso > 1 && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
              {tipoSeleccionado.icon} {tipoSeleccionado.label}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{ width: '8px', height: '8px', borderRadius: '50%', background: n <= paso ? '#1D9E75' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
      </div>

      {/* ── Paso 1: Tipo ── */}
      {paso === 1 && (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
            Selecciona el tipo de servicio que necesitas
          </p>
          {TIPOS_VIAJE.map(t => (
            <button key={t.id} type="button" onClick={() => { setTipo(t.id); setPaso(2) }} style={{
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '16px', padding: '20px', cursor: 'pointer', fontFamily: 'sans-serif',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px'
            }}>
              <span style={{ fontSize: '40px' }}>{t.icon}</span>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>{t.label}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{t.desc}</p>
                <p style={{ fontSize: '12px', color: '#1D9E75' }}>${t.precioPorKm} MXN/km estimado</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Paso 2: Origen ── */}
      {paso === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)' }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>¿Desde dónde saldrá el servicio?</p>

            <button type="button" onClick={() => { setOrigenEsActual(true); setSeleccionandoPunto(null) }} style={{
              padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif',
              background: origenEsActual ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px',
              borderLeft: `3px solid ${origenEsActual ? '#1D9E75' : 'transparent'}`
            }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: origenEsActual ? '#1D9E75' : 'white' }}>Mi ubicación actual</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Usar GPS automáticamente</p>
              </div>
              {origenEsActual && <span style={{ marginLeft: 'auto', color: '#1D9E75' }}>✓</span>}
            </button>

            <button type="button" onClick={() => { setOrigenEsActual(false); setSeleccionandoPunto('origen') }} style={{
              padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif',
              background: !origenEsActual ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px',
              borderLeft: `3px solid ${!origenEsActual ? '#1D9E75' : 'transparent'}`
            }}>
              <span style={{ fontSize: '20px' }}>🗺️</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: !origenEsActual ? '#1D9E75' : 'white' }}>Elegir en el mapa</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  {!origenEsActual && origen ? '✅ Punto marcado' : 'Toca el mapa para marcar el origen'}
                </p>
              </div>
              {!origenEsActual && origen && <span style={{ marginLeft: 'auto', color: '#1D9E75' }}>✓</span>}
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {ubicacionActual && (
              <MapContainer center={centro} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {seleccionandoPunto === 'origen' && (
                  <SeleccionarPunto onSeleccionar={pos => { setOrigen(pos); setSeleccionandoPunto(null) }} />
                )}
                {origen && <Marker position={origen} icon={iconoOrigen}><Popup>📍 Origen</Popup></Marker>}
              </MapContainer>
            )}
            {seleccionandoPunto === 'origen' && (
              <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', zIndex: 1000 }}>
                👆 Toca el mapa para marcar el origen
              </div>
            )}
          </div>

          <div style={{ padding: '16px', flexShrink: 0 }}>
            <button type="button" onClick={() => setPaso(3)} disabled={!origen} style={{
              width: '100%', padding: '15px',
              background: origen ? '#1D9E75' : 'rgba(255,255,255,0.08)',
              color: origen ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600',
              cursor: origen ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif'
            }}>
              {origen ? 'Continuar →' : 'Selecciona el origen primero'}
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 3: Destino ── */}
      {paso === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)' }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>¿A dónde va el servicio?</p>

            <button type="button" onClick={() => { setDestinoEsActual(true); setSeleccionandoPunto(null) }} style={{
              padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif',
              background: destinoEsActual ? 'rgba(55,138,221,0.2)' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px',
              borderLeft: `3px solid ${destinoEsActual ? '#378ADD' : 'transparent'}`
            }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: destinoEsActual ? '#378ADD' : 'white' }}>Mi ubicación actual</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Usar GPS automáticamente</p>
              </div>
              {destinoEsActual && <span style={{ marginLeft: 'auto', color: '#378ADD' }}>✓</span>}
            </button>

            <button type="button" onClick={() => { setDestinoEsActual(false); setSeleccionandoPunto('destino') }} style={{
              padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif',
              background: !destinoEsActual ? 'rgba(55,138,221,0.2)' : 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px',
              borderLeft: `3px solid ${!destinoEsActual ? '#378ADD' : 'transparent'}`
            }}>
              <span style={{ fontSize: '20px' }}>🗺️</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: !destinoEsActual ? '#378ADD' : 'white' }}>Elegir en el mapa</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  {!destinoEsActual && destino ? '✅ Punto marcado' : 'Toca el mapa para marcar el destino'}
                </p>
              </div>
              {!destinoEsActual && destino && <span style={{ marginLeft: 'auto', color: '#378ADD' }}>✓</span>}
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {ubicacionActual && (
              <MapContainer center={centro} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {seleccionandoPunto === 'destino' && (
                  <SeleccionarPunto onSeleccionar={pos => { setDestino(pos); setSeleccionandoPunto(null) }} />
                )}
                {origen && <Marker position={origen} icon={iconoOrigen}><Popup>📍 Origen</Popup></Marker>}
                {destino && <Marker position={destino} icon={iconoDestino}><Popup>🏁 Destino</Popup></Marker>}
              </MapContainer>
            )}
            {seleccionandoPunto === 'destino' && (
              <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: '#378ADD', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', zIndex: 1000 }}>
                👆 Toca el mapa para marcar el destino
              </div>
            )}
          </div>

          <div style={{ padding: '16px', flexShrink: 0 }}>
            <button type="button" onClick={() => setPaso(4)} disabled={!destino} style={{
              width: '100%', padding: '15px',
              background: destino ? '#1D9E75' : 'rgba(255,255,255,0.08)',
              color: destino ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600',
              cursor: destino ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif'
            }}>
              {destino ? 'Continuar →' : 'Selecciona el destino primero'}
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 4: Confirmar ── */}
      {paso === 4 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>

            {/* Tipo */}
            <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>{tipoSeleccionado?.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '16px', fontWeight: '700' }}>{tipoSeleccionado?.label}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{tipoSeleccionado?.desc}</p>
              </div>
              <button type="button" onClick={() => setPaso(1)} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ✏️
              </button>
            </div>

            {/* Origen con botón editar */}
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>ORIGEN</p>
                <p style={{ fontSize: '13px', color: 'white' }}>
                  {origenEsActual ? 'Mi ubicación actual' : `${origen?.[0].toFixed(4)}, ${origen?.[1].toFixed(4)}`}
                </p>
              </div>
              <button type="button" onClick={() => setPaso(2)} style={{ background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0 }}>
                ✏️ Cambiar
              </button>
            </div>

            {/* Destino con botón editar */}
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '20px' }}>🏁</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>DESTINO</p>
                <p style={{ fontSize: '13px', color: 'white' }}>
                  {destinoEsActual ? 'Mi ubicación actual' : `${destino?.[0].toFixed(4)}, ${destino?.[1].toFixed(4)}`}
                </p>
              </div>
              <button type="button" onClick={() => setPaso(3)} style={{ background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0 }}>
                ✏️ Cambiar
              </button>
            </div>

            {/* Distancia y precio */}
            <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>DISTANCIA</p>
                <p style={{ fontSize: '14px', color: 'white' }}>{distancia.toFixed(1)} km</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>PRECIO ESTIMADO</p>
                <p style={{ fontSize: '22px', fontWeight: '800', color: '#1D9E75' }}>${precioEstimado} MXN</p>
              </div>
            </div>
          </div>

          {/* Aviso acceso */}
          <div style={{ background: 'rgba(186,117,23,0.08)', border: '0.5px solid rgba(186,117,23,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
            ⚠️ Si el chofer no puede llegar exactamente al punto marcado, te contactará por el chat para acordar un punto de encuentro cercano.
          </div>

          {/* Nota adicional */}
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Nota adicional (opcional)
            </p>
            <textarea
              placeholder="Ej: Son 3 cajas medianas, llegar antes de las 3pm, acceso por calle lateral..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', resize: 'none', outline: 'none' }}
            />
          </div>

          <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
            💡 Precio estimado: {distancia.toFixed(1)} km × ${tipoSeleccionado?.precioPorKm} MXN/km. El chofer puede negociar antes de aceptar.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: 'rgba(255,255,255,0.08)', letterSpacing: '4px', fontSize: '10px' }}>∴</span>
            <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <button type="button" onClick={publicarViaje} disabled={publicando} style={{
            width: '100%', padding: '16px',
            background: publicando ? 'rgba(29,158,117,0.5)' : '#1D9E75',
            color: 'white', border: 'none', borderRadius: '14px',
            fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif'
          }}>
            {publicando ? 'Publicando...' : `${tipoSeleccionado?.icon} Publicar viaje — $${precioEstimado} MXN`}
          </button>

        </div>
      )}

    </div>
  )
}