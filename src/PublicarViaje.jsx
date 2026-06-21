import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { enviarNotificacionCompleta } from './guardarNotificacion'
import ReglasChambaModal from './ReglasChambaModal'
import MetodoPago from './MetodoPago'

delete L.Icon.Default.prototype._getIconUrl

const iconoOrigen = L.divIcon({
  html: `<div style="background:#1D9E75;border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">📍</div>`,
  className: '', iconSize: [38,38], iconAnchor: [19,19],
})
const iconoDestino = L.divIcon({
  html: `<div style="background:#378ADD;border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏁</div>`,
  className: '', iconSize: [38,38], iconAnchor: [19,19],
})
const iconoParada = L.divIcon({
  html: `<div style="background:#E8A030;border:3px solid white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🔶</div>`,
  className: '', iconSize: [34,34], iconAnchor: [17,17],
})

const TIPOS_VIAJE = [
  { id: 'raite', icon: '🚕', label: 'Raite', desc: 'Traslado en auto', precioPorKm: 15, minimo: 50, categoria: 'Taxi / Chofer' },
  { id: 'moto_raite', icon: '🏍️', label: 'Moto Raite', desc: 'Rápido y económico en moto', precioPorKm: 8, minimo: 30, categoria: 'Moto taxi' },
  { id: 'moto_mandados', icon: '🛵', label: 'Moto Mandados', desc: 'Entregas y paquetes', precioPorKm: 10, minimo: 35, categoria: 'Repartidor moto' },
  { id: 'flete', icon: '🚛', label: 'Flete', desc: 'Mudanza o carga pesada', precioPorKm: 25, minimo: 150, categoria: 'Fletes' },
]

const OPCIONES_ESPERA = [15, 30, 45, 60, 90, 120]
const COSTO_ESPERA_POR_MIN = 3

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

function getAhoraHora() {
  const hoy = new Date()
  return `${String(hoy.getHours()).padStart(2,'0')}:${String(hoy.getMinutes()).padStart(2,'0')}`
}

function getHoyLocal() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`
}

export default function PublicarViaje({ onVolver, userId, fotoUrl }) {
  const [tipo, setTipo] = useState(null)
  const [paso, setPaso] = useState(1)
  const [ubicacionActual, setUbicacionActual] = useState(null)
  const [origen, setOrigen] = useState(null)
  const [destino, setDestino] = useState(null)
  const [origenEsActual, setOrigenEsActual] = useState(true)
  const [descripcion, setDescripcion] = useState('')
  const [notaCliente, setNotaCliente] = useState('')
  const [personas, setPersonas] = useState(1)
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
  const [tipoViaje, setTipoViaje] = useState('sencillo')
  const [tiempoEspera, setTiempoEspera] = useState(30)
  const [paradas, setParadas] = useState([])
  const [busquedaParada, setBusquedaParada] = useState('')
  const [resultadosParada, setResultadosParada] = useState([])
  const [buscandoParada, setBuscandoParada] = useState(false)
  const [mapaListo, setMapaListo] = useState(false)
  const [distanciaReal, setDistanciaReal] = useState(null)
  const [calculandoRuta, setCalculandoRuta] = useState(false)

  // ✅ NUEVO — estados de pago
  const [trabajoCreado, setTrabajoCreado] = useState(null)
  const [pagando, setPagando] = useState(false)

  const debounceDestino = useRef(null)
  const debounceOrigen = useRef(null)
  const debounceParada = useRef(null)

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
    setFechaCita(getHoyLocal())
    setHoraCita(getAhoraHora())
  }, [])

  useEffect(() => {
    if (origenEsActual && ubicacionActual) setOrigen(ubicacionActual)
  }, [origenEsActual, ubicacionActual])

  useEffect(() => {
    setMapaListo(false)
    const t = setTimeout(() => setMapaListo(true), 250)
    return () => clearTimeout(t)
  }, [paso])

  const tipoSeleccionado = TIPOS_VIAJE.find(t => t.id === tipo)

  // Calcular distancia real por calles con OSRM
  useEffect(() => {
    if (!origen || !destino) { setDistanciaReal(null); return }
    async function calcularRutaReal() {
      setCalculandoRuta(true)
      try {
        const puntos = [origen, ...paradas.map(p => [p.lat, p.lng]), destino]
        const coords = puntos.map(p => `${p[1]},${p[0]}`).join(';')
        const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`
        const res = await fetch(url)
        const data = await res.json()
        if (data.routes && data.routes[0]) {
          let distKm = data.routes[0].distance / 1000
          if (tipoViaje === 'redondo') distKm *= 2
          setDistanciaReal(distKm)
        }
      } catch (e) {
        console.log('OSRM error, usando línea recta:', e)
        setDistanciaReal(null)
      }
      setCalculandoRuta(false)
    }
    calcularRutaReal()
  }, [origen, destino, paradas, tipoViaje])

  function calcularDistanciaTotal() {
    if (!origen || !destino) return 0
    let puntos = [origen, ...paradas.map(p => [p.lat, p.lng]), destino]
    let total = 0
    for (let i = 0; i < puntos.length - 1; i++) {
      total += calcularDistancia(puntos[i][0], puntos[i][1], puntos[i+1][0], puntos[i+1][1])
    }
    if (tipoViaje === 'redondo') total *= 2
    return total
  }

  function calcularPrecioTotal() {
    if (!tipoSeleccionado) return 0
    const dist = calcularDistanciaTotal()
    let precio = Math.max(tipoSeleccionado.minimo, Math.round(dist * tipoSeleccionado.precioPorKm))
    if (tipoViaje === 'redondo') precio += tiempoEspera * COSTO_ESPERA_POR_MIN
    if (paradas.length > 0) precio += paradas.length * 20
    return precio
  }

  const distanciaTotal = distanciaReal !== null ? distanciaReal : calcularDistanciaTotal()
  const precioTotal = calcularPrecioTotal()
  const eta = tipoSeleccionado ? calcularETA(distanciaTotal, tipo) : ''
  const centro = ubicacionActual || [16.1833, -95.2000]
  const puntosRuta = origen && destino ? [origen, ...paradas.map(p => [p.lat, p.lng]), destino] : []

  function limpiarResultados(tipoBusqueda) {
    setTimeout(() => {
      if (tipoBusqueda === 'destino') setResultadosBusqueda([])
      else if (tipoBusqueda === 'origen') setResultadosOrigen([])
      else setResultadosParada([])
    }, 200)
  }

  async function ejecutarBusqueda(texto, tipoBusqueda) {
    try {
      const base = origen || ubicacionActual || [16.1833, -95.2000]
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}&lat=${base[0]}&lon=${base[1]}&limit=6&lang=es`
      )
      const json = await res.json()
      const data = (json.features || []).map(f => ({
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        display_name: [
          f.properties.name,
          f.properties.street,
          f.properties.city || f.properties.town || f.properties.village,
          f.properties.state,
        ].filter(Boolean).join(', '),
        nombre: f.properties.name || texto,
      }))
      if (tipoBusqueda === 'destino') setResultadosBusqueda(data)
      else if (tipoBusqueda === 'origen') setResultadosOrigen(data)
      else setResultadosParada(data)
    } catch (e) {
      console.log('Error búsqueda Photon:', e)
    } finally {
      if (tipoBusqueda === 'destino') setBuscando(false)
      else if (tipoBusqueda === 'origen') setBuscandoOrigen(false)
      else setBuscandoParada(false)
    }
  }

  function buscarDireccion(texto, tipoBusqueda) {
    // Limpiar resultados anteriores inmediatamente al cambiar texto
    if (tipoBusqueda === 'destino') setResultadosBusqueda([])
    else if (tipoBusqueda === 'origen') setResultadosOrigen([])
    else setResultadosParada([])

    if (texto.trim().length < 3) {
      if (tipoBusqueda === 'destino') setBuscando(false)
      else if (tipoBusqueda === 'origen') setBuscandoOrigen(false)
      else setBuscandoParada(false)
      return
    }
    if (tipoBusqueda === 'destino') setBuscando(true)
    else if (tipoBusqueda === 'origen') setBuscandoOrigen(true)
    else setBuscandoParada(true)
    const ref = tipoBusqueda === 'destino' ? debounceDestino : tipoBusqueda === 'origen' ? debounceOrigen : debounceParada
    if (ref.current) clearTimeout(ref.current)
    ref.current = setTimeout(() => { ejecutarBusqueda(texto, tipoBusqueda) }, 400)
  }

  function eliminarParada(idx) {
    setParadas(prev => prev.filter((_, i) => i !== idx))
  }

  function validarFecha() {
    if (esAhora) return true
    if (!fechaCita || !horaCita) { setErrorFecha('Selecciona fecha y hora'); return false }
    const [hh, mm] = horaCita.split(':').map(Number)
    const cita = new Date(fechaCita + 'T00:00:00')
    cita.setHours(hh, mm, 0, 0)
    const ahora = new Date()
    const limite = new Date(ahora.getTime() + 48 * 60 * 60 * 1000)
    if (cita < ahora) { setErrorFecha('La hora debe ser posterior a ahora'); return false }
    if (cita > limite) { setErrorFecha('Máximo 48 horas de anticipación'); return false }
    setErrorFecha('')
    return true
  }

  // ✅ PASO 1: Crear viaje en BD → abrir pago
  async function _publicar() {
    setPublicando(true)

    const fCita = esAhora ? getHoyLocal() : fechaCita
    function getHoraConMargen() {
      const ahora = new Date()
      ahora.setHours(ahora.getHours() + 2)
      return `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`
    }
    const hCita = esAhora ? getHoraConMargen() : horaCita
    const precioEspera = tipoViaje === 'redondo' ? tiempoEspera * COSTO_ESPERA_POR_MIN : 0

    const { data: trabajo, error: insertError } = await supabase.from('trabajos').insert({
      cliente_id: userId,
      categoria: tipoSeleccionado.categoria,
      descripcion: descripcion || `${tipoSeleccionado.label} — ${distanciaTotal.toFixed(1)} km${tipoViaje === 'redondo' ? ' (redondo)' : ''}${paradas.length > 0 ? ` · ${paradas.length} parada(s)` : ''}`,
      presupuesto: precioTotal,
      lat: origen[0], lng: origen[1],
      origen_lat: origen[0], origen_lng: origen[1],
      destino_lat: destino[0], destino_lng: destino[1],
      distancia_km: parseFloat(distanciaTotal.toFixed(2)),
      es_viaje: true,
      tipo_viaje: tipoViaje,
      tiempo_espera_min: tipoViaje === 'redondo' ? tiempoEspera : 0,
      precio_espera: precioEspera,
      paradas: paradas.length > 0 ? JSON.stringify(paradas) : '[]',
      nota_cliente: notaCliente || null,
      personas: personas,
      fecha_cita: fCita,
      hora_cita: hCita,
      status: 'publicado',
      pago_status: 'pendiente',
    }).select().single()

    if (insertError || !trabajo) {
      console.log('Error creando viaje:', insertError)
      setPublicando(false)
      return
    }

    setTrabajoCreado(trabajo)
    setPublicando(false)
    setPagando(true)
  }

  async function crearViajeYPagar() {
    if (!origen || !destino || !tipo) return
    if (!validarFecha()) return
    if (!reglasAceptadas) { setMostrarReglas(true); return }
    await _publicar()
  }

  // ✅ PASO 2: Pago exitoso → notificar conductores
  async function onPagoExitoso() {
    setPagando(false)
    try {
      const { data: choferes } = await supabase.from('usuarios').select('id')
        .contains('categorias_servicio', [tipoSeleccionado.categoria]).neq('id', userId)
      if (choferes && choferes.length > 0) {
        const tipoLabel = tipoViaje === 'redondo' ? '🔄 Redondo' : tipoViaje === 'paradas' ? '🔶 Con paradas' : '➡️ Sencillo'
        for (const chofer of choferes) {
          await enviarNotificacionCompleta({
            usuarioId: chofer.id,
            titulo: `${tipoSeleccionado.icon} ${tipoSeleccionado.label} — ${distanciaTotal.toFixed(1)} km`,
            cuerpo: `$${precioTotal} MXN · ${personas} persona(s) · ${tipoLabel}`,
            tipo: 'nuevo_trabajo',
            trabajoId: trabajoCreado.id,
          })
        }
      }
    } catch (e) { console.log('Error notificando:', e) }
    setExito(true)
  }

  // Pago cancelado → eliminar viaje pendiente
  async function onPagoCancelado() {
    if (trabajoCreado) {
      await supabase.from('trabajos').delete().eq('id', trabajoCreado.id)
      setTrabajoCreado(null)
    }
    setPagando(false)
  }

  if (fotoUrl !== 'cargando' && !fotoUrl) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>📷</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>Foto de perfil requerida</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', lineHeight: '1.6', marginBottom: '24px' }}>
        Los conductores necesitan ver tu foto antes de aceptar un viaje.
      </p>
      <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        ← Ir a mi perfil a subir foto
      </button>
    </div>
  )

  if (mostrarReglas) return (
    <ReglasChambaModal
      tipo="cliente"
      onAceptar={() => { setMostrarReglas(false); setReglasAceptadas(true); _publicar() }}
      onCerrar={() => setMostrarReglas(false)}
    />
  )

  // ✅ PANTALLA DE PAGO
  if (pagando && trabajoCreado) {
    return (
      <MetodoPago
        trabajo={trabajoCreado}
        onPagoExitoso={onPagoExitoso}
        onCancelar={onPagoCancelado}
      />
    )
  }

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{tipoSeleccionado?.icon}</div>
        <h2 style={{ color: '#1D9E75', fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>¡{tipoSeleccionado?.label} publicado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>Los conductores disponibles ya fueron notificados.</p>
        <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px', width: '100%', maxWidth: '300px' }}>
          <p style={{ fontSize: '32px', fontWeight: '800', color: '#1D9E75', marginBottom: '4px' }}>${precioTotal} MXN</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>{distanciaTotal.toFixed(1)} km · {eta}</p>
          {tipoViaje === 'redondo' && <p style={{ fontSize: '12px', color: '#E8A030' }}>🔄 Viaje redondo · {tiempoEspera} min de espera incluidos</p>}
          {paradas.length > 0 && <p style={{ fontSize: '12px', color: '#E8A030' }}>🔶 {paradas.length} parada(s) incluida(s)</p>}
        </div>
        <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Ver mis publicaciones
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={paso === 1 ? onVolver : () => setPaso(p => p - 1)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
            {paso === 1 ? '¿Qué necesitas?' : paso === 2 ? '📍 ¿Desde dónde?' : paso === 3 ? '🏁 ¿A dónde vas?' : paso === 4 ? '🔄 Tipo de viaje' : '✅ Confirmar'}
          </h2>
          {tipoSeleccionado && paso > 1 && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{tipoSeleccionado.icon} {tipoSeleccionado.label}</p>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1,2,3,4,5].map(n => <div key={n} style={{ width: n <= paso ? '20px' : '8px', height: '8px', borderRadius: '4px', background: n <= paso ? '#1D9E75' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />)}
        </div>
      </div>

      {paso === 1 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Selecciona el tipo de servicio</p>
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

      {paso === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <button type="button" onClick={() => { setOrigenEsActual(true); setOrigen(ubicacionActual) }} style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', background: origenEsActual ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `3px solid ${origenEsActual ? '#1D9E75' : 'transparent'}` }}>
              <span style={{ fontSize: '18px' }}>📍</span>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: origenEsActual ? '#1D9E75' : 'white' }}>Mi ubicación actual</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Usar GPS automáticamente</p>
              </div>
              {origenEsActual && <span style={{ color: '#1D9E75', fontWeight: '700' }}>✓</span>}
            </button>
            <button type="button" onClick={() => setOrigenEsActual(false)} style={{ padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', background: !origenEsActual ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `3px solid ${!origenEsActual ? '#1D9E75' : 'transparent'}` }}>
              <span style={{ fontSize: '18px' }}>🗺️</span>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: !origenEsActual ? '#1D9E75' : 'white' }}>Elegir en el mapa</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{!origenEsActual && origen ? '✅ Toca para cambiar' : 'Toca el mapa para marcar'}</p>
              </div>
              {!origenEsActual && origen && <span style={{ color: '#1D9E75', fontWeight: '700' }}>✓</span>}
            </button>
            {!origenEsActual && (
              <div>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="🔍 Buscar dirección de origen..." value={busquedaOrigen}
                    onChange={e => { setBusquedaOrigen(e.target.value); buscarDireccion(e.target.value, 'origen') }}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '11px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
                  />
                  {buscandoOrigen && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>⏳</span>}
                </div>
                {resultadosOrigen.length > 0 && (
                  <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '6px', overflow: 'hidden' }}>
                    {resultadosOrigen.map((r, i) => (
                      <button key={i} type="button" onClick={() => { setOrigen([r.lat, r.lon]); setBusquedaOrigen(r.nombre); setResultadosOrigen([]) }}
                        style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: i < resultadosOrigen.length-1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', color: 'white', fontFamily: 'sans-serif', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                        📍 {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {ubicacionActual && mapaListo ? (
              <MapContainer center={centro} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {!origenEsActual && <SeleccionarPunto onSeleccionar={pos => setOrigen(pos)} />}
                {origen && <Marker position={origen} icon={iconoOrigen}><Popup>📍 Origen</Popup></Marker>}
              </MapContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontFamily: 'sans-serif' }}>Cargando mapa...</div>
            )}
          </div>
          <div style={{ padding: '14px 16px', flexShrink: 0, background: '#0D0D0D', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
            <button type="button" onClick={() => setPaso(3)} disabled={!origen} style={{ width: '100%', padding: '15px', background: origen ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: origen ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: origen ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif' }}>
              {origen ? 'Continuar →' : 'Selecciona el origen'}
            </button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)' }}>
          <div style={{ padding: '14px 16px', flexShrink: 0 }}>
            {destino ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(55,138,221,0.1)', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '12px', padding: '10px 14px' }}>
                <p style={{ fontSize: '13px', color: '#378ADD', fontWeight: '600' }}>🏁 Destino marcado — toca para cambiar</p>
                <button type="button" onClick={() => setDestino(null)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>✕</button>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>👆 Toca el mapa para marcar el destino</p>
            )}
          </div>
          <div style={{ padding: '0 16px 8px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <input type="text" placeholder="🔍 Buscar dirección de destino..." value={busquedaDestino}
                onChange={e => { setBusquedaDestino(e.target.value); buscarDireccion(e.target.value, 'destino') }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '11px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
              />
              {buscando && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>⏳</span>}
              {busquedaDestino && !buscando && <button type="button" onClick={() => { setBusquedaDestino(''); setResultadosBusqueda([]) }} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '16px', cursor: 'pointer' }}>✕</button>}
            </div>
            {resultadosBusqueda.length > 0 && (
              <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '6px', overflow: 'hidden', zIndex: 100, position: 'relative' }}>
                {resultadosBusqueda.map((r, i) => (
                  <button key={i} type="button" onClick={() => { setDestino([r.lat, r.lon]); setBusquedaDestino(r.nombre); setResultadosBusqueda([]) }}
                    style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: i < resultadosBusqueda.length-1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', color: 'white', fontFamily: 'sans-serif', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                    🏁 {r.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {ubicacionActual && mapaListo ? (
              <MapContainer center={centro} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <SeleccionarPunto onSeleccionar={pos => setDestino(pos)} />
                {origen && <Marker position={origen} icon={iconoOrigen}><Popup>📍 Origen</Popup></Marker>}
                {destino && <Marker position={destino} icon={iconoDestino}><Popup>🏁 Destino</Popup></Marker>}
                {origen && destino && <Polyline positions={[origen, destino]} color="#1D9E75" weight={3} dashArray="8,6" opacity={0.8} />}
              </MapContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontFamily: 'sans-serif' }}>Cargando mapa...</div>
            )}
            {destino && distanciaTotal > 0 && (
              <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(13,13,13,0.95)', border: '0.5px solid rgba(29,158,117,0.4)', borderRadius: '14px', padding: '10px 18px', zIndex: 1000, display: 'flex', gap: '20px', whiteSpace: 'nowrap' }}>
                <div style={{ textAlign: 'center' }}><p style={{ fontSize: '16px', fontWeight: '800', color: '#1D9E75' }}>{calculandoRuta ? '...' : distanciaTotal.toFixed(1)} km</p><p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{calculandoRuta ? 'Calculando' : 'Por calles'}</p></div>
                <div style={{ width: '0.5px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}><p style={{ fontSize: '16px', fontWeight: '800', color: '#1D9E75' }}>${calcularPrecioTotal()}</p><p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Estimado</p></div>
                <div style={{ width: '0.5px', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ textAlign: 'center' }}><p style={{ fontSize: '16px', fontWeight: '800', color: '#1D9E75' }}>{eta}</p><p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Duración</p></div>
              </div>
            )}
          </div>
          <div style={{ padding: '14px 16px', flexShrink: 0, background: '#0D0D0D', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
            <button type="button" onClick={() => setPaso(4)} disabled={!destino} style={{ width: '100%', padding: '15px', background: destino ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: destino ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: destino ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif' }}>
              {destino ? 'Continuar →' : 'Marca el destino primero'}
            </button>
          </div>
        </div>
      )}

      {paso === 4 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>¿Cómo será tu viaje?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { id: 'sencillo', icon: '➡️', label: 'Sencillo', desc: 'Del origen al destino, sin regreso', extra: '' },
              { id: 'redondo', icon: '🔄', label: 'Redondo', desc: 'El chofer te espera y te regresa', extra: `+$${tiempoEspera * COSTO_ESPERA_POR_MIN} espera` },
              { id: 'paradas', icon: '🔶', label: 'Con paradas', desc: 'Agrega puntos intermedios en la ruta', extra: paradas.length > 0 ? `${paradas.length} parada(s)` : 'Sin paradas aún' },
            ].map(op => (
              <button key={op.id} type="button" onClick={() => setTipoViaje(op.id)}
                style={{ padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', background: tipoViaje === op.id ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.04)', outline: tipoViaje === op.id ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '28px' }}>{op.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: tipoViaje === op.id ? '#1D9E75' : 'white', marginBottom: '3px' }}>{op.label}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{op.desc}</p>
                  {op.extra && <p style={{ fontSize: '11px', color: '#E8A030', marginTop: '2px' }}>{op.extra}</p>}
                </div>
                {tipoViaje === op.id && <span style={{ color: '#1D9E75', fontSize: '18px', fontWeight: '700' }}>✓</span>}
              </button>
            ))}
          </div>

          {tipoViaje === 'redondo' && (
            <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.25)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#E8A030', marginBottom: '12px' }}>⏱️ ¿Cuánto tiempo esperará el chofer?</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {OPCIONES_ESPERA.map(min => (
                  <button key={min} type="button" onClick={() => setTiempoEspera(min)}
                    style={{ padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', background: tiempoEspera === min ? 'rgba(232,160,48,0.3)' : 'rgba(255,255,255,0.06)', color: tiempoEspera === min ? '#E8A030' : 'rgba(255,255,255,0.6)', fontWeight: tiempoEspera === min ? '700' : '400', fontSize: '13px' }}>
                    {min >= 60 ? `${min/60}h` : `${min} min`}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                <span>Costo de espera:</span>
                <span style={{ color: '#E8A030', fontWeight: '600' }}>+${tiempoEspera * COSTO_ESPERA_POR_MIN} MXN ({tiempoEspera} min × $3)</span>
              </div>
            </div>
          )}

          {tipoViaje === 'paradas' && (
            <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.25)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#E8A030', marginBottom: '10px' }}>🔶 Paradas en la ruta (+$20 por parada)</p>
              {paradas.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🔶</span>
                    <div>
                      <p style={{ fontSize: '13px', color: 'white', fontWeight: '500' }}>{p.nombre}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{p.lat.toFixed(4)}, {p.lng.toFixed(4)}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => eliminarParada(i)} style={{ background: 'transparent', color: '#F09595', border: 'none', fontSize: '16px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input type="text" placeholder="🔍 Buscar dirección de parada..."
                  value={busquedaParada}
                  onChange={e => { setBusquedaParada(e.target.value); buscarDireccion(e.target.value, 'parada') }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '13px', fontFamily: 'sans-serif', outline: 'none' }}
                />
                {buscandoParada && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>⏳</span>}
              </div>
              {resultadosParada.length > 0 && (
                <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '10px', marginBottom: '8px', overflow: 'hidden' }}>
                  {resultadosParada.map((r, i) => (
                    <button key={i} type="button" onClick={() => {
                      const nuevaParada = { lat: r.lat, lng: r.lon, nombre: r.nombre }
                      setParadas(prev => [...prev, nuevaParada])
                      setBusquedaParada('')
                      setResultadosParada([])
                    }}
                      style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: i < resultadosParada.length-1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', color: 'white', fontFamily: 'sans-serif', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                      🔶 {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', color: '#1D9E75' }}>
              <span>Total estimado</span>
              <span>${precioTotal} MXN</span>
            </div>
          </div>

          <button type="button" onClick={() => setPaso(5)} style={{ width: '100%', padding: '15px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            Continuar →
          </button>
        </div>
      )}

      {paso === 5 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {origen && destino && (
            <div style={{ height: '180px', borderRadius: '16px', overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.1)' }}>
              <MapContainer center={[(origen[0]+destino[0])/2, (origen[1]+destino[1])/2]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={origen} icon={iconoOrigen} />
                {paradas.map((p, i) => <Marker key={i} position={[p.lat, p.lng]} icon={iconoParada}><Popup>🔶 {p.nombre}</Popup></Marker>)}
                <Marker position={destino} icon={iconoDestino} />
                {puntosRuta.length >= 2 && <Polyline positions={puntosRuta} color="#1D9E75" weight={3} dashArray="8,6" opacity={0.9} />}
              </MapContainer>
            </div>
          )}

          <div style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '16px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '28px', fontWeight: '800', color: '#1D9E75' }}>${precioTotal} MXN</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{distanciaTotal.toFixed(1)} km · {tipoSeleccionado?.icon} {tipoSeleccionado?.label}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#378ADD' }}>⏱️ {eta}</p>
              {tipoViaje === 'redondo' && <p style={{ fontSize: '11px', color: '#E8A030', marginTop: '4px' }}>🔄 +{tiempoEspera} min espera</p>}
              {paradas.length > 0 && <p style={{ fontSize: '11px', color: '#E8A030', marginTop: '4px' }}>🔶 {paradas.length} parada(s)</p>}
            </div>
          </div>

          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Cuándo?</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button type="button" onClick={() => setEsAhora(true)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: esAhora ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: esAhora ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: esAhora ? '700' : '400', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: '14px' }}>⚡ Ahora mismo</button>
              <button type="button" onClick={() => setEsAhora(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: !esAhora ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: !esAhora ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: !esAhora ? '700' : '400', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: '14px' }}>📅 Agendar</button>
            </div>
            {!esAhora && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Fecha</p>
                  <input type="date" value={fechaCita} onChange={e => { setFechaCita(e.target.value); setErrorFecha('') }} min={getHoyLocal()}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${errorFecha ? '#F09595' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '12px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none', colorScheme: 'dark' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Hora (24 hrs)</p>
                  <input type="time" value={horaCita} onChange={e => { setHoraCita(e.target.value); setErrorFecha('') }}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${errorFecha ? '#F09595' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '12px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none', colorScheme: 'dark' }}
                  />
                </div>
              </div>
            )}
            {errorFecha && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '6px' }}>{errorFecha}</p>}
          </div>

          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>👥 ¿Cuántas personas van?</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1,2,3,4,5,6].map(n => (
                <button key={n} type="button" onClick={() => setPersonas(n)}
                  style={{ flex: 1, padding: '12px 6px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', background: personas === n ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: personas === n ? 'white' : 'rgba(255,255,255,0.5)', fontWeight: personas === n ? '700' : '400', fontSize: '15px' }}>
                  {n}
                </button>
              ))}
            </div>
            {personas >= 4 && <p style={{ fontSize: '11px', color: '#E8A030', marginTop: '6px' }}>⚠️ {personas} personas — verifica capacidad del vehículo.</p>}
          </div>

          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📝 ¿Cómo te identificas? (opcional)</p>
            <input type="text" placeholder='Ej: "Camisa roja en la entrada"...'
              value={notaCliente} onChange={e => setNotaCliente(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: notaCliente ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '13px', fontFamily: 'sans-serif', outline: 'none' }}
            />
          </div>

          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💬 Nota adicional (opcional)</p>
            <textarea placeholder="Ej: Voy con niños, son 3 cajas..."
              value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '13px', fontFamily: 'sans-serif', resize: 'none', outline: 'none' }}
            />
          </div>

          <button type="button" onClick={crearViajeYPagar} disabled={publicando}
            style={{ width: '100%', padding: '16px', background: publicando ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {publicando ? 'Preparando pago...' : `${tipoSeleccionado?.icon} Continuar al pago — $${precioTotal} MXN`}
          </button>
        </div>
      )}
    </div>
  )
}

