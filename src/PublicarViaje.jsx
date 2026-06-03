import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { enviarNotificacionCompleta } from './guardarNotificacion'
import ReglasChambaModal from './ReglasChambaModal'

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
  { id: 'raite', icon: '🚕', label: 'Raite', desc: 'Traslado en auto — taxistas y particulares', precioPorKm: 15, minimo: 50, categoria: 'Taxi / Chofer' },
  { id: 'moto_raite', icon: '🏍️', label: 'Moto Raite', desc: 'Rápido y económico en moto', precioPorKm: 8, minimo: 30, categoria: 'Moto taxi' },
  { id: 'moto_mandados', icon: '🛵', label: 'Moto Mandados', desc: 'Entregas, paquetes y compras', precioPorKm: 10, minimo: 35, categoria: 'Repartidor moto' },
  { id: 'flete', icon: '🚛', label: 'Flete', desc: 'Mudanza, carga pesada o camioneta', precioPorKm: 25, minimo: 150, categoria: 'Fletes' },
]

function SeleccionarPunto({ onSeleccionar }) {
  useMapEvents({ click(e) { onSeleccionar([e.latlng.lat, e.latlng.lng]) } })
  return null
}

function calcularDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function calcularETA(distanciaKm, tipo) {
  const velocidades = { raite: 25, moto_raite: 30, moto_mandados: 25, flete: 18 }
  const vel = velocidades[tipo] || 25
  const minutos = Math.round((distanciaKm / vel) * 60)
  if (minutos < 5) return 'menos de 5 min'
  if (minutos < 60) return `aprox. ${minutos} min`
  return `aprox. ${Math.floor(minutos/60)}h ${minutos%60}min`
}

function obtenerFechaHoraMinMax() {
  const ahora = new Date()
  const minFecha = ahora.toISOString().split('T')[0]
  const max = new Date(ahora.getTime() + 48 * 60 * 60 * 1000)
  const maxFecha = max.toISOString().split('T')[0]
  const horaMin = ahora.toTimeString().slice(0,5)
  return { minFecha, maxFecha, horaMin }
}

export default function PublicarViaje({ onVolver, userId }) {
  const [tipo, setTipo] = useState(null)
  const [paso, setPaso] = useState(1)
  const [ubicacionActual, setUbicacionActual] = useState(null)
  const [origen, setOrigen] = useState(null)
  const [destino, setDestino] = useState(null)
  const [origenEsActual, setOrigenEsActual] = useState(true)
  const [seleccionandoPunto, setSeleccionandoPunto] = useState(null)
  const [descripcion, setDescripcion] = useState('')
  const [busquedaDestino, setBusquedaDestino] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [busquedaOrigen, setBusquedaOrigen] = useState('')
  const [resultadosOrigen, setResultadosOrigen] = useState([])
  const [buscandoOrigen, setBuscandoOrigen] = useState(false)
  const [esAhora, setEsAhora] = useState(true)
  const [fechaCita, setFechaCita] = useState('')
  const [horaCita, setHoraCita] = useState('')
  const [publicando, setPublicando] = useState(false)
  const [exito, setExito] = useState(false)
  const [mostrarReglas, setMostrarReglas] = useState(false)
  const [reglasAceptadas, setReglasAceptadas] = useState(false)
  const [errorFecha, setErrorFecha] = useState('')

  const { minFecha, maxFecha, horaMin } = obtenerFechaHoraMinMax()

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const pos2 = [pos.coords.latitude, pos.coords.longitude]
        setUbicacionActual(pos2)
        setOrigen(pos2)
      },
      () => {
        const fallback = [16.1833, -95.2000]
        setUbicacionActual(fallback)
        setOrigen(fallback)
      }
    )
    // Hora actual como default
    const ahora = new Date()
    setFechaCita(ahora.toISOString().split('T')[0])
    setHoraCita(ahora.toTimeString().slice(0,5))
  }, [])

  useEffect(() => {
    if (origenEsActual && ubicacionActual) setOrigen(ubicacionActual)
  }, [origenEsActual, ubicacionActual])

  const tipoSeleccionado = TIPOS_VIAJE.find(t => t.id === tipo)
  const distancia = origen && destino ? calcularDistancia(origen[0], origen[1], destino[0], destino[1]) : 0
  const precioBase = tipoSeleccionado ? Math.max(tipoSeleccionado.minimo, Math.round(distancia * tipoSeleccionado.precioPorKm)) : 0
  const eta = tipoSeleccionado ? calcularETA(distancia, tipo) : ''
  const centro = ubicacionActual || [16.1833, -95.2000]
  const rutaLinea = origen && destino ? [origen, destino] : []

  async function buscarDireccion(texto, tipo) {
    if (texto.trim().length < 3) {
      if (tipo === 'destino') setResultadosBusqueda([])
      else setResultadosOrigen([])
      return
    }
    if (tipo === 'destino') setBuscando(true)
    else setBuscandoOrigen(true)

    try {
      const query = `${texto}, Salina Cruz, Oaxaca, Mexico`
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=4&countrycodes=mx`, { headers: { 'Accept-Language': 'es' } })
      const data = await res.json()
      if (tipo === 'destino') setResultadosBusqueda(data)
      else setResultadosOrigen(data)
    } catch { }

    if (tipo === 'destino') setBuscando(false)
    else setBuscandoOrigen(false)
  }

  function validarFecha() {
    if (esAhora) return true
    if (!fechaCita || !horaCita) { setErrorFecha('Selecciona fecha y hora'); return false }
    const cita = new Date(`${fechaCita}T${horaCita}`)
    const ahora = new Date()
    const limite = new Date(ahora.getTime() + 48 * 60 * 60 * 1000)
    if (cita < ahora) { setErrorFecha('La hora debe ser posterior a ahora'); return false }
    if (cita > limite) { setErrorFecha('Máximo 48 horas de anticipación'); return false }
    setErrorFecha('')
    return true
  }

  async function publicarViaje() {
    if (!origen || !destino || !tipo) return
    if (!validarFecha()) return
    if (!reglasAceptadas) { setMostrarReglas(true); return }
    setPublicando(true)

    const ahora = new Date()
    const fCita = esAhora ? ahora.toISOString().split('T')[0] : fechaCita
    const hCita = esAhora ? ahora.toTimeString().slice(0,5) : horaCita

    const { data: trabajo } = await supabase.from('trabajos').insert({
      cliente_id: userId,
      categoria: tipoSeleccionado.categoria,
      descripcion: descripcion || `${tipoSeleccionado.label} — ${distancia.toFixed(1)} km`,
      presupuesto: precioBase,
      lat: origen[0], lng: origen[1],
      origen_lat: origen[0], origen_lng: origen[1],
      destino_lat: destino[0], destino_lng: destino[1],
      distancia_km: parseFloat(distancia.toFixed(2)),
      es_viaje: true,
      fecha_cita: fCita,
      hora_cita: hCita,
      status: 'publicado',
    }).select().single()

    if (trabajo) {
      try {
        const { data: choferes } = await supabase.from('usuarios').select('id')
          .contains('categorias_servicio', [tipoSeleccionado.categoria]).neq('id', userId)
        if (choferes && choferes.length > 0) {
          for (const chofer of choferes) {
            await enviarNotificacionCompleta({
              usuarioId: chofer.id,
              titulo: `${tipoSeleccionado.icon} Nuevo ${tipoSeleccionado.label} — ${distancia.toFixed(1)} km`,
              cuerpo: `$${precioBase} MXN · ${esAhora ? 'Ahora mismo' : `${fCita} ${hCita}`} · ${eta}`,
              tipo: 'trabajo_aceptado',
              trabajoId: trabajo.id,
            })
          }
        }
      } catch (e) { console.log('Error notificando:', e) }
    }

    setExito(true)
    setPublicando(false)
  }

  if (mostrarReglas) return (
    <ReglasChambaModal
      tipo="cliente"
      onAceptar={() => { setMostrarReglas(false); setReglasAceptadas(true); publicarViaje() }}
      onCerrar={() => setMostrarReglas(false)}
    />
  )

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{tipoSeleccionado?.icon}</div>
        <h2 style={{ color: '#1D9E75', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>¡{tipoSeleccionado?.label} publicado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Los conductores disponibles ya fueron notificados.</p>
        <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px', width: '100%', maxWidth: '300px' }}>
          <p style={{ fontSize: '32px', fontWeight: '800', color: '#1D9E75', marginBottom: '4px' }}>${precioBase} MXN</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{distancia.toFixed(1)} km · {eta}</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>El conductor puede negociar el precio</p>
        </div>
        <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Ver mis publicaciones
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
            {paso === 1 ? '¿Qué necesitas?' : paso === 2 ? '📍 ¿Desde dónde?' : paso === 3 ? '🏁 ¿A dónde vas?' : '✅ Confirmar'}
          </h2>
          {tipoSeleccionado && paso > 1 && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{tipoSeleccionado.icon} {tipoSeleccionado.label}</p>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1,2,3,4].map(n => <div key={n} style={{ width: n <= paso ? '20px' : '8px', height: '8px', borderRadius: '4px', background: n <= paso ? '#1D9E75' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />)}
        </div>
      </div>

      {/* Paso 1 — Tipo */}
      {paso === 1 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Selecciona el tipo de servicio — abierto a taxistas y particulares</p>
          {TIPOS_VIAJE.map(t => (
            <button key={t.id} type="button" onClick={() => { setTipo(t.id); setPaso(2) }} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '18px 20px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '36px' }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '3px' }}>{t.label}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{t.desc}</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#1D9E75' }}>${t.precioPorKm}/km</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Mínimo ${t.minimo}</span>
                </div>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px' }}>›</span>
            </button>
          ))}
        </div>
      )}

      {/* Paso 2 — Origen */}
      {paso === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)' }}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>¿Desde dónde?</p>
            <button type="button" onClick={() => { setOrigenEsActual(true); setOrigen(ubicacionActual); setSeleccionandoPunto(null) }} style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', background: origenEsActual ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `3px solid ${origenEsActual ? '#1D9E75' : 'transparent'}` }}>
              <span style={{ fontSize: '18px' }}>📍</span>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: origenEsActual ? '#1D9E75' : 'white' }}>Mi ubicación actual</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Usar GPS automáticamente</p>
              </div>
              {origenEsActual && <span style={{ color: '#1D9E75', fontWeight: '700' }}>✓</span>}
            </button>
            <button type="button" onClick={() => { setOrigenEsActual(false); setSeleccionandoPunto('origen') }} style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', background: !origenEsActual ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `3px solid ${!origenEsActual ? '#1D9E75' : 'transparent'}` }}>
              <span style={{ fontSize: '18px' }}>🗺️</span>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: !origenEsActual ? '#1D9E75' : 'white' }}>Elegir en el mapa</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{!origenEsActual && origen ? '✅ Punto marcado — toca de nuevo para cambiar' : 'Toca el mapa para marcar'}</p>
              </div>
              {!origenEsActual && origen && <span style={{ color: '#1D9E75', fontWeight: '700' }}>✓</span>}
            </button>
          {/* Buscador de origen por texto */}
          {!origenEsActual && (
            <div style={{ padding: '0 16px 8px' }}>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="🔍 Buscar dirección de origen..."
                  value={busquedaOrigen}
                  onChange={e => { setBusquedaOrigen(e.target.value); buscarDireccion(e.target.value, 'origen') }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '11px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
                />
                {buscandoOrigen && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>⏳</span>}
              </div>
              {resultadosOrigen.length > 0 && (
                <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '6px', overflow: 'hidden' }}>
                  {resultadosOrigen.map((r, i) => (
                    <button key={i} type="button" onClick={() => { setOrigen([parseFloat(r.lat), parseFloat(r.lon)]); setBusquedaOrigen(r.display_name.split(',')[0]); setResultadosOrigen([]) }}
                      style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: i < resultadosOrigen.length-1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', color: 'white', fontFamily: 'sans-serif', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                      📍 {r.display_name.split(',').slice(0,2).join(',')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {ubicacionActual && (
              <MapContainer center={centro} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {!origenEsActual && <SeleccionarPunto onSeleccionar={pos => { setOrigen(pos); setSeleccionandoPunto(null) }} />}
                {origen && <Marker position={origen} icon={iconoOrigen}><Popup>📍 Origen</Popup></Marker>}
              </MapContainer>
            )}
            {!origenEsActual && (
              <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', zIndex: 1000 }}>
                {origen ? '👆 Toca para cambiar el origen' : '👆 Toca el mapa para marcar el origen'}
              </div>
            )}
          </div>
          <div style={{ padding: '14px 16px', flexShrink: 0 }}>
            <button type="button" onClick={() => setPaso(3)} disabled={!origen} style={{ width: '100%', padding: '15px', background: origen ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: origen ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: origen ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif' }}>
              {origen ? 'Continuar — marcar destino →' : 'Selecciona el origen'}
            </button>
          </div>
        </div>
      )}

      {/* Paso 3 — Destino */}
      {paso === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)' }}>
          <div style={{ padding: '14px 16px', flexShrink: 0 }}>
            {destino ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(55,138,221,0.1)', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '12px', padding: '10px 14px' }}>
                <div>
                  <p style={{ fontSize: '13px', color: '#378ADD', fontWeight: '600' }}>🏁 Destino marcado</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Toca el mapa para cambiar</p>
                </div>
                <button type="button" onClick={() => setDestino(null)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>✕ Borrar</button>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>👆 Toca el mapa para marcar el destino</p>
            )}
          </div>
          {/* Buscador de destino por texto */}
          <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <input type="text" placeholder="🔍 Buscar dirección de destino..."
                value={busquedaDestino}
                onChange={e => { setBusquedaDestino(e.target.value); buscarDireccion(e.target.value, 'destino') }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '11px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
              />
              {buscando && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>⏳</span>}
            </div>
            {resultadosBusqueda.length > 0 && (
              <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '6px', overflow: 'hidden', zIndex: 100, position: 'relative' }}>
                {resultadosBusqueda.map((r, i) => (
                  <button key={i} type="button" onClick={() => { setDestino([parseFloat(r.lat), parseFloat(r.lon)]); setBusquedaDestino(r.display_name.split(',')[0]); setResultadosBusqueda([]) }}
                    style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: i < resultadosBusqueda.length-1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', color: 'white', fontFamily: 'sans-serif', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                    🏁 {r.display_name.split(',').slice(0,2).join(',')}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {ubicacionActual && (
              <MapContainer center={centro} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <SeleccionarPunto onSeleccionar={pos => setDestino(pos)} />
                {origen && <Marker position={origen} icon={iconoOrigen}><Popup>📍 Origen</Popup></Marker>}
                {destino && <Marker position={destino} icon={iconoDestino}><Popup>🏁 Destino</Popup></Marker>}
                {rutaLinea.length === 2 && <Polyline positions={rutaLinea} color="#1D9E75" weight={3} dashArray="8,6" opacity={0.8} />}
              </MapContainer>
            )}
            <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: destino ? '#378ADD' : 'rgba(0,0,0,0.7)', color: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', zIndex: 1000 }}>
              {destino ? '👆 Toca para cambiar el destino' : '👆 Toca el mapa para marcar el destino'}
            </div>
            {destino && distancia > 0 && (
              <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(13,13,13,0.95)', border: '0.5px solid rgba(29,158,117,0.4)', borderRadius: '14px', padding: '10px 18px', zIndex: 1000, display: 'flex', gap: '20px', whiteSpace: 'nowrap' }}>
                <div style={{ textAlign: 'center' }}><p style={{ fontSize: '16px', fontWeight: '800', color: '#1D9E75' }}>{distancia.toFixed(1)} km</p><p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Distancia</p></div>
                <div style={{ width: '0.5px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}><p style={{ fontSize: '16px', fontWeight: '800', color: '#1D9E75' }}>${precioBase}</p><p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Estimado</p></div>
                <div style={{ width: '0.5px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}><p style={{ fontSize: '16px', fontWeight: '800', color: '#1D9E75' }}>{eta}</p><p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Duración</p></div>
              </div>
            )}
          </div>
          <div style={{ padding: '14px 16px', flexShrink: 0 }}>
            <button type="button" onClick={() => setPaso(4)} disabled={!destino} style={{ width: '100%', padding: '15px', background: destino ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: destino ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: destino ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif' }}>
              {destino ? 'Confirmar ruta →' : 'Marca el destino primero'}
            </button>
          </div>
        </div>
      )}

      {/* Paso 4 — Confirmar */}
      {paso === 4 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Mapa */}
          {origen && destino && (
            <div style={{ height: '180px', borderRadius: '16px', overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.1)' }}>
              <MapContainer center={[(origen[0]+destino[0])/2, (origen[1]+destino[1])/2]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={origen} icon={iconoOrigen} />
                <Marker position={destino} icon={iconoDestino} />
                <Polyline positions={[origen, destino]} color="#1D9E75" weight={3} dashArray="8,6" opacity={0.9} />
              </MapContainer>
            </div>
          )}

          {/* Precio */}
          <div style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '16px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '28px', fontWeight: '800', color: '#1D9E75' }}>${precioBase} MXN</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{distancia.toFixed(1)} km · {tipoSeleccionado?.icon} {tipoSeleccionado?.label}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>El conductor puede negociar antes de aceptar</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#378ADD' }}>⏱️ {eta}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>duración estimada</p>
            </div>
          </div>

          {/* Origen y destino */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px' }}>📍</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>ORIGEN</p>
                <p style={{ fontSize: '13px', color: 'white' }}>{origenEsActual ? 'Mi ubicación actual' : `${origen?.[0].toFixed(4)}, ${origen?.[1].toFixed(4)}`}</p>
              </div>
              <button type="button" onClick={() => setPaso(2)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>✏️</button>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '16px' }}>🏁</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>DESTINO</p>
                <p style={{ fontSize: '13px', color: 'white' }}>{destino?.[0].toFixed(4)}, {destino?.[1].toFixed(4)}</p>
              </div>
              <button type="button" onClick={() => setPaso(3)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>✏️</button>
            </div>
          </div>

          {/* Cuándo */}
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Cuándo lo necesitas?</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button type="button" onClick={() => setEsAhora(true)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: esAhora ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: esAhora ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: esAhora ? '700' : '400', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: '14px' }}>
                ⚡ Ahora mismo
              </button>
              <button type="button" onClick={() => setEsAhora(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: !esAhora ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: !esAhora ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: !esAhora ? '700' : '400', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: '14px' }}>
                📅 Agendar
              </button>
            </div>

            {!esAhora && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Fecha</p>
                  <input type="date" value={fechaCita} onChange={e => { setFechaCita(e.target.value); setErrorFecha('') }}
                    min={minFecha} max={maxFecha}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${errorFecha ? '#F09595' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '12px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Hora (24 hrs)</p>
                  <input type="time" value={horaCita} onChange={e => { setHoraCita(e.target.value); setErrorFecha('') }}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${errorFecha ? '#F09595' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '12px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
                  />
                </div>
              </div>
            )}
            {errorFecha && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '6px' }}>{errorFecha}</p>}
            {!esAhora && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>Máximo 48 horas de anticipación · Formato 24 hrs</p>}
          </div>

          {/* Nota */}
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nota al conductor (opcional)</p>
            <textarea placeholder="Ej: Voy con niños, son 3 cajas medianas, necesito llegar antes de las 3pm..."
              value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '13px', fontFamily: 'sans-serif', resize: 'none', outline: 'none' }}
            />
          </div>

          <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.2)', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
            ⚠️ Si el conductor no puede llegar exactamente al punto, te contactará por chat.
          </div>

          <button type="button" onClick={publicarViaje} disabled={publicando} style={{ width: '100%', padding: '16px', background: publicando ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {publicando ? 'Publicando...' : `${tipoSeleccionado?.icon} Solicitar ${tipoSeleccionado?.label} — $${precioBase} MXN`}
          </button>
        </div>
      )}
    </div>
  )
}
