import { useState, useRef, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { enviarNotificacionCompleta } from './guardarNotificacion'
import ReglasChambaModal from './ReglasChambaModal'
import { sanitizarDescripcion, sanitizarCampo, tieneInyeccionSQL } from './sanitize'
import { esZonaIstmo } from './zonaIstmo'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl

const iconoServicio = L.divIcon({
  html: `<div style="background:#1D9E75;border:3px solid white;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏠</div>`,
  className: '', iconSize: [38, 38], iconAnchor: [19, 19],
})

function SeleccionarPunto({ onSeleccionar }) {
  useMapEvents({ click(e) { onSeleccionar([e.latlng.lat, e.latlng.lng]) } })
  return null
}

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
  { icon: '🏍️', nombre: 'Mecánico motos' },
  { icon: '🚗', nombre: 'Mecánico autos' },
  { icon: '🔧', nombre: 'Ponchadura' },
  { icon: '⛽', nombre: 'Gasolina emergencia' },
  { icon: '☀️', nombre: 'Paneles fotovoltaicos' },
  { icon: '✳️', nombre: 'Otros' },
]

function getHoyLocal() {
  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

function getAhoraHora() {
  const hoy = new Date()
  const hrs = hoy.getHours()
  const min = hoy.getMinutes()
  return `${String(hrs).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function getMinHora(fechaSeleccionada) {
  const hoy = getHoyLocal()
  if (fechaSeleccionada === hoy) return getAhoraHora()
  return '00:00'
}

export default function PublicarTrabajo({ onVolver, userId, fotoUrl }) {
  const [categoria, setCategoria] = useState('')
  const [otroServicio, setOtroServicio] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [presupuesto, setPresupuesto] = useState(300)
  const [esAhora, setEsAhora] = useState(false)
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [ubicacion, setUbicacion] = useState(null)
  const [mostrarReglas, setMostrarReglas] = useState(false)
  const [reglasAceptadas, setReglasAceptadas] = useState(false)
  const [materiales, setMateriales] = useState('cliente')
  const [fotosProblema, setFotosProblema] = useState([])
  const [subiendoFotos, setSubiendoFotos] = useState(false)
  const [fueraDeZona, setFueraDeZona] = useState(false)

  // ── Selector de ubicación del servicio ──
  const [pasoUbicacion, setPasoUbicacion] = useState(false)
  const [ubicacionActualGPS, setUbicacionActualGPS] = useState(null)
  const [ubicacionEsActual, setUbicacionEsActual] = useState(true)
  const [puntoElegido, setPuntoElegido] = useState(null)
  const [busquedaDireccion, setBusquedaDireccion] = useState('')
  const [resultadosDireccion, setResultadosDireccion] = useState([])
  const [buscandoDireccion, setBuscandoDireccion] = useState(false)
  const [mapaListo, setMapaListo] = useState(false)
  const [errorUbicacion, setErrorUbicacion] = useState('')
  const debounceDireccion = useRef(null)

  useEffect(() => {
    if (!pasoUbicacion) return
    setMapaListo(false)
    const t = setTimeout(() => setMapaListo(true), 250)
    return () => clearTimeout(t)
  }, [pasoUbicacion])

  useEffect(() => {
    if (ubicacionEsActual && ubicacionActualGPS) setPuntoElegido(ubicacionActualGPS)
  }, [ubicacionEsActual, ubicacionActualGPS])

  const hoy = getHoyLocal()
  const categoriaFinal = categoria === 'Otros' ? otroServicio : categoria
  const iconCategoria = CATEGORIAS.find(c => c.nombre === categoria)?.icon || '✳️'
  const fechaFinal = esAhora ? hoy : fecha
  const horaFinal = esAhora ? getAhoraHora() : hora

  function formatearFecha(f) {
    if (!f) return ''
    const d = new Date(f + 'T12:00:00')
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  async function subirFotosProblema(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (fotosProblema.length + files.length > 10) {
      setError('Máximo 10 fotos permitidas')
      return
    }
    setSubiendoFotos(true)
    const nuevasFotos = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `problemas/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatares').upload(path, file, { upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('avatares').getPublicUrl(path)
        nuevasFotos.push(data.publicUrl)
      }
    }
    setFotosProblema(prev => [...prev, ...nuevasFotos])
    setSubiendoFotos(false)
  }

  function eliminarFotoProblema(idx) {
    setFotosProblema(prev => prev.filter((_, i) => i !== idx))
  }

  function verConfirmacion() {
    if (!categoria) { setError('Selecciona una categoría'); return }
    if (categoria === 'Otros' && !otroServicio) { setError('Describe qué servicio necesitas'); return }
    if (!descripcion) { setError('Describe el trabajo'); return }
    if (!esAhora && !fecha) { setError('Selecciona la fecha en que lo necesitas'); return }
    if (!esAhora && !hora) { setError('Selecciona la hora en que lo necesitas'); return }
    setError('')

    if (!reglasAceptadas) { setMostrarReglas(true); return }

    // Obtener el GPS del dispositivo solo como referencia inicial (centrar el mapa
    // y ofrecer "mi ubicación actual" como opción) — ya NO se usa directo como
    // la ubicación del trabajo, para dejar que el cliente elija dónde lo necesita.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps = [pos.coords.latitude, pos.coords.longitude]
        setUbicacionActualGPS(gps)
        setPuntoElegido(gps)
        setPasoUbicacion(true)
      },
      () => {
        const fallback = [16.1833, -95.2000]
        setUbicacionActualGPS(fallback)
        setPuntoElegido(fallback)
        setUbicacionEsActual(false)
        setPasoUbicacion(true)
      }
    )
  }

  async function buscarDireccion(texto) {
    setBusquedaDireccion(texto)
    setResultadosDireccion([])
    if (texto.trim().length < 3) { setBuscandoDireccion(false); return }
    setBuscandoDireccion(true)
    if (debounceDireccion.current) clearTimeout(debounceDireccion.current)
    debounceDireccion.current = setTimeout(async () => {
      try {
        const base = ubicacionActualGPS || [16.1833, -95.2000]
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}&lat=${base[0]}&lon=${base[1]}&limit=6`)
        const json = await res.json()
        const data = (json.features || []).map(f => ({
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          display_name: [
            f.properties.name, f.properties.street,
            f.properties.city || f.properties.town || f.properties.village,
            f.properties.state,
          ].filter(Boolean).join(', '),
        }))
        setResultadosDireccion(data)
      } catch (e) {
        console.log('Error búsqueda dirección:', e)
      } finally {
        setBuscandoDireccion(false)
      }
    }, 400)
  }

  function confirmarUbicacionElegida() {
    if (!puntoElegido) return
    const [lat, lng] = puntoElegido
    if (!esZonaIstmo(lat, lng)) {
      setFueraDeZona(true)
      return
    }
    setErrorUbicacion('')
    setUbicacion({
      lat, lng,
      texto: ubicacionEsActual ? 'Tu ubicación actual (GPS)' : (busquedaDireccion || 'Ubicación elegida en el mapa'),
    })
    setPasoUbicacion(false)
    setConfirmando(true)
  }

  async function publicarTrabajo() {
    setLoading(true)
    const descripcionSanitizada = sanitizarDescripcion(descripcion)
    const categoriaFinalSanitizada = sanitizarCampo(categoriaFinal)

    if (tieneInyeccionSQL(descripcion) || tieneInyeccionSQL(categoriaFinal)) {
      setError('Contenido no válido detectado')
      setLoading(false)
      return
    }

    const { data: trabajo, error: insertError } = await supabase.from('trabajos').insert({
      cliente_id: userId,
      categoria: categoriaFinalSanitizada,
      descripcion: descripcionSanitizada,
      presupuesto,
      fecha_cita: fechaFinal,
      hora_cita: horaFinal,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      materiales,
      fotos_problema: fotosProblema,
      status: 'publicado',
      pago_status: 'pendiente',
    }).select().single()

    if (insertError || !trabajo) {
      setError(insertError?.message || 'Error al publicar el trabajo')
      setLoading(false)
      return
    }

    try {
      const { data: trabajadores } = await supabase
        .from('usuarios')
        .select('id')
        .contains('categorias_servicio', [categoriaFinal])
        .neq('id', userId)

      if (trabajadores && trabajadores.length > 0) {
        const cuandoTexto = esAhora
          ? '¡Lo necesitan ahora mismo!'
          : `para el ${fechaFinal} a las ${horaFinal} hrs`

        for (const trabajador of trabajadores) {
          await enviarNotificacionCompleta({
            usuarioId: trabajador.id,
            titulo: `🔔 Nuevo trabajo de ${categoriaFinalSanitizada}`,
            cuerpo: `$${presupuesto} MXN — ${descripcionSanitizada.slice(0, 60)}${descripcionSanitizada.length > 60 ? '...' : ''} · ${cuandoTexto}`,
            tipo: 'trabajo_aceptado',
            trabajoId: trabajo.id,
          })
        }
      }
    } catch (e) {
      console.log('Error notificando trabajadores:', e)
    }

    setLoading(false)
    setExito(true)
  }

  if (fotoUrl !== 'cargando' && !fotoUrl) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>📷</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>Foto de perfil requerida</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', lineHeight: '1.6', marginBottom: '24px' }}>
        Los trabajadores necesitan ver tu foto para confiar en ti antes de aceptar un trabajo.
      </p>
      <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        ← Ir a mi perfil a subir foto
      </button>
    </div>
  )

  // ── PANTALLA FUERA DE ZONA ──
  if (fueraDeZona) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '72px', marginBottom: '20px' }}>📍</div>
      <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px', color: '#E8A030' }}>Aún no llegamos a tu zona</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '320px', lineHeight: '1.7', marginBottom: '16px', fontSize: '15px' }}>
        Chamba está en su <strong style={{ color: '#1D9E75' }}>primera etapa</strong> y por el momento solo está disponible en el <strong style={{ color: 'white' }}>Istmo de Tehuantepec</strong>, Oaxaca.
      </p>
      <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '16px 20px', maxWidth: '320px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ciudades disponibles</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
          {['Salina Cruz', 'Tehuantepec', 'Juchitán', 'Ixtepec', 'Matías Romero', 'Unión Hidalgo', 'El Espinal', 'San Blas Atempa'].map(c => (
            <span key={c} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '100px', background: 'rgba(29,158,117,0.12)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.25)' }}>{c}</span>
          ))}
          <span style={{ fontSize: '11px', padding: '4px 10px', color: 'rgba(255,255,255,0.3)' }}>y más...</span>
        </div>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', maxWidth: '280px', lineHeight: '1.6', marginBottom: '32px' }}>
        Estamos creciendo rápido. Pronto estaremos en tu ciudad. ¡Gracias por tu interés!
      </p>
      <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        ← Volver al inicio
      </button>
    </div>
  )

  if (mostrarReglas) return (
    <ReglasChambaModal
      tipo="cliente"
      onAceptar={() => { setMostrarReglas(false); setReglasAceptadas(true); verConfirmacion() }}
      onCerrar={() => setMostrarReglas(false)}
    />
  )

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ color: '#1D9E75', fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>¡Trabajo publicado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px', maxWidth: '300px' }}>
          Los trabajadores de <strong style={{ color: 'white' }}>{categoriaFinal}</strong> cerca de ti ya fueron notificados.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '8px', maxWidth: '300px', lineHeight: '1.5' }}>
          Cuando un trabajador acepte, te avisamos y podrás completar el pago.
        </p>
        <p style={{ color: '#1D9E75', fontSize: '14px', marginBottom: '32px' }}>
          {esAhora ? '⚡ Lo necesitas ahora mismo' : `📅 ${formatearFecha(fecha)} a las ${hora} hrs`}
        </p>
        <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Ver mapa
        </button>
      </div>
    )
  }

  if (pasoUbicacion) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
          <button type="button" onClick={() => setPasoUbicacion(false)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>¿Dónde necesitas el servicio?</h2>
        </div>

        <div style={{ padding: '14px 16px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button type="button" onClick={() => setUbicacionEsActual(true)}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', background: ubicacionEsActual ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `3px solid ${ubicacionEsActual ? '#1D9E75' : 'transparent'}` }}>
            <span style={{ fontSize: '18px' }}>📍</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: ubicacionEsActual ? '#1D9E75' : 'white' }}>Mi ubicación actual</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Donde estás parado ahorita</p>
            </div>
            {ubicacionEsActual && <span style={{ color: '#1D9E75', fontWeight: '700' }}>✓</span>}
          </button>

          <button type="button" onClick={() => setUbicacionEsActual(false)}
            style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', background: !ubicacionEsActual ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `3px solid ${!ubicacionEsActual ? '#1D9E75' : 'transparent'}` }}>
            <span style={{ fontSize: '18px' }}>🗺️</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: !ubicacionEsActual ? '#1D9E75' : 'white' }}>Otra ubicación</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{!ubicacionEsActual && puntoElegido !== ubicacionActualGPS ? '✅ Toca el mapa o busca una dirección' : 'Ej. tu casa, aunque estés en otro lado'}</p>
            </div>
          </button>

          {!ubicacionEsActual && (
            <div>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="🔍 Buscar dirección o colonia..." value={busquedaDireccion}
                  onChange={e => buscarDireccion(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '11px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
                />
                {buscandoDireccion && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>⏳</span>}
              </div>
              {resultadosDireccion.length > 0 && (
                <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '6px', overflow: 'hidden' }}>
                  {resultadosDireccion.map((r, i) => (
                    <button key={i} type="button" onClick={() => { setPuntoElegido([r.lat, r.lon]); setBusquedaDireccion(r.display_name); setResultadosDireccion([]) }}
                      style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: i < resultadosDireccion.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none', color: 'white', fontFamily: 'sans-serif', textAlign: 'left', cursor: 'pointer', fontSize: '13px' }}>
                      📍 {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          {ubicacionActualGPS && mapaListo ? (
            <MapContainer center={puntoElegido || ubicacionActualGPS} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {!ubicacionEsActual && <SeleccionarPunto onSeleccionar={pos => { setPuntoElegido(pos); setBusquedaDireccion('') }} />}
              {puntoElegido && <Marker position={puntoElegido} icon={iconoServicio}><Popup>🏠 Aquí necesito el servicio</Popup></Marker>}
            </MapContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontFamily: 'sans-serif' }}>Cargando mapa...</div>
          )}
        </div>

        <div style={{ padding: '14px 16px', flexShrink: 0, background: '#0D0D0D', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          {errorUbicacion && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center', marginBottom: '8px' }}>{errorUbicacion}</p>}
          <button type="button" onClick={confirmarUbicacionElegida} disabled={!puntoElegido}
            style={{ width: '100%', padding: '15px', background: puntoElegido ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: puntoElegido ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: puntoElegido ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif' }}>
            Continuar →
          </button>
        </div>
      </div>
    )
  }

  if (confirmando) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={() => setConfirmando(false)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Confirmar publicación</h2>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Revisa los detalles antes de publicar:</p>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '32px' }}>{iconCategoria}</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>CATEGORÍA</p>
                <p style={{ fontSize: '16px', fontWeight: '600' }}>{categoriaFinal}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '32px' }}>💰</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>PRESUPUESTO</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1D9E75' }}>${presupuesto} MXN</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '32px' }}>📝</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>DESCRIPCIÓN</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>{descripcion}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '32px' }}>{esAhora ? '⚡' : '📅'}</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>CUÁNDO</p>
                {esAhora
                  ? <p style={{ fontSize: '16px', fontWeight: '700', color: '#E8A030' }}>¡Ahora mismo!</p>
                  : <>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#1D9E75', textTransform: 'capitalize' }}>{formatearFecha(fecha)}</p>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>🕐 {hora} hrs</p>
                  </>
                }
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '32px' }}>🔩</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>MATERIALES</p>
                <p style={{ fontSize: '15px', fontWeight: '600' }}>
                  {materiales === 'cliente' ? '✅ Yo los pongo' : materiales === 'trabajador' ? '🛒 El trabajador los consigue' : '🤝 Lo acordamos en el chat'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px' }}>
              <span style={{ fontSize: '32px' }}>📍</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>UBICACIÓN</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>{ubicacion?.texto}</p>
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🔐</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#1D9E75', marginBottom: '4px' }}>Tu dinero está protegido</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>Pagarás cuando un trabajador acepte tu trabajo. El dinero queda retenido y solo se libera cuando confirmes que quedó bien.</p>
            </div>
          </div>

          <div style={{ background: 'rgba(232,160,48,0.06)', border: '0.5px solid rgba(232,160,48,0.25)', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#E8A030', marginBottom: '3px' }}>Importante</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
                Si cancelas un trabajo ya aceptado por un trabajador, recibirás una <strong style={{ color: '#E8A030' }}>amonestación</strong>. Con 3 amonestaciones tu cuenta será suspendida.
              </p>
            </div>
          </div>

          {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

          <button type="button" onClick={publicarTrabajo} disabled={loading}
            style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {loading ? 'Publicando...' : '🚀 Publicar trabajo →'}
          </button>
          <button type="button" onClick={() => setConfirmando(false)}
            style={{ width: '100%', padding: '14px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '14px', fontSize: '15px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            Editar trabajo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Publicar trabajo</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Lo necesito ahora */}
        <div style={{ background: esAhora ? 'rgba(232,160,48,0.12)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${esAhora ? '#E8A030' : 'rgba(255,255,255,0.1)'}`, borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => setEsAhora(!esAhora)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>⚡</span>
            <div>
              <p style={{ fontSize: '15px', fontWeight: '700', color: esAhora ? '#E8A030' : 'white' }}>Lo necesito ahora</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Los trabajadores disponibles verán tu solicitud urgente</p>
            </div>
          </div>
          <div style={{ width: '48px', height: '28px', borderRadius: '14px', background: esAhora ? '#E8A030' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '3px', left: esAhora ? '23px' : '3px', width: '22px', height: '22px', borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
          </div>
        </div>

        {/* Categoría */}
        <div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Qué necesitas? *</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {CATEGORIAS.map(cat => (
              <button key={cat.nombre} type="button"
                onClick={() => { setCategoria(cat.nombre); setError('') }}
                style={{
                  background: categoria === cat.nombre ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                  border: categoria === cat.nombre ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '10px 6px', cursor: 'pointer', fontFamily: 'sans-serif',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                }}>
                <span style={{ fontSize: '22px' }}>{cat.icon}</span>
                <span style={{ fontSize: '10px', color: categoria === cat.nombre ? '#1D9E75' : 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{cat.nombre}</span>
              </button>
            ))}
          </div>
          {categoria === 'Otros' && (
            <input type="text" placeholder="¿Qué servicio necesitas?"
              value={otroServicio} onChange={e => setOtroServicio(e.target.value)}
              style={{ width: '100%', marginTop: '12px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid #1D9E75', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
            />
          )}
        </div>

        {/* Descripción */}
        <div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Describe el trabajo *</p>
          <textarea
            placeholder="Ej. Cambiar 3 contactos y revisar el tablero eléctrico..."
            value={descripcion} onChange={e => setDescripcion(e.target.value)}
            rows={3}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', resize: 'none', outline: 'none' }}
          />
        </div>

        {/* Presupuesto */}
        <div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cuánto pagas</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <input type="range" min="100" max="3000" step="50"
              value={presupuesto} onChange={e => setPresupuesto(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#1D9E75' }}
            />
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#1D9E75', minWidth: '90px', textAlign: 'right' }}>${presupuesto} MXN</span>
          </div>
        </div>

        {/* Fecha y hora */}
        {!esAhora && (
          <>
            <div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Para cuándo lo necesitas? *</p>
              <input
                type="date" min={hoy} value={fecha}
                onChange={e => { setFecha(e.target.value); setError('') }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: fecha ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', fontFamily: 'sans-serif', outline: 'none', colorScheme: 'dark' }}
              />
              {fecha && (
                <p style={{ fontSize: '13px', color: '#1D9E75', marginTop: '8px', textTransform: 'capitalize' }}>
                  📅 {formatearFecha(fecha)}
                </p>
              )}
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿A qué hora? * (formato 24 hrs)</p>
              <input
                type="time" value={hora} min={getMinHora(fecha)}
                onChange={e => { setHora(e.target.value); setError('') }}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: hora ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '18px', fontFamily: 'sans-serif', outline: 'none', colorScheme: 'dark' }}
              />
              {hora && <p style={{ fontSize: '13px', color: '#1D9E75', marginTop: '8px' }}>🕐 {hora} hrs</p>}
            </div>
          </>
        )}

        {/* Fotos del problema */}
        <div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📷 Fotos del problema (opcional)</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '12px', lineHeight: '1.5' }}>Sube fotos para que el trabajador entienda mejor qué hay que hacer. Máximo 10 fotos.</p>
          {fotosProblema.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {fotosProblema.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} alt={`foto ${i+1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(29,158,117,0.3)' }} />
                  <button type="button" onClick={() => eliminarFotoProblema(i)} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', fontFamily: 'sans-serif' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {fotosProblema.length < 10 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.15)', borderRadius: '12px', cursor: 'pointer' }}>
              <span style={{ fontSize: '24px' }}>{subiendoFotos ? '⏳' : '📷'}</span>
              <div>
                <p style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{subiendoFotos ? 'Subiendo...' : 'Agregar fotos'}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{fotosProblema.length}/10 fotos · Toca para seleccionar</p>
              </div>
              <input type="file" accept="image/*" multiple onChange={subirFotosProblema} style={{ display: 'none' }} disabled={subiendoFotos} />
            </label>
          )}
        </div>

        {/* Materiales */}
        <div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🔩 ¿Quién pone los materiales?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'cliente', icon: '✅', label: 'Yo pongo los materiales', desc: 'Tengo todo listo para el trabajo' },
              { id: 'trabajador', icon: '🛒', label: 'El trabajador los consigue', desc: 'El costo se agrega al precio final' },
              { id: 'acordar', icon: '🤝', label: 'Lo acordamos en el chat', desc: 'Primero hablamos y luego decidimos' },
            ].map(op => (
              <button key={op.id} type="button" onClick={() => setMateriales(op.id)}
                style={{ padding: '14px 16px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', background: materiales === op.id ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.04)', outline: materiales === op.id ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '24px' }}>{op.icon}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: materiales === op.id ? '#1D9E75' : 'white', marginBottom: '2px' }}>{op.label}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{op.desc}</p>
                </div>
                {materiales === op.id && <span style={{ marginLeft: 'auto', color: '#1D9E75', fontSize: '18px' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {esAhora && (
          <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: '#E8A030', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚡</span>
            <div>
              <p style={{ fontWeight: '600', marginBottom: '2px' }}>Solicitud urgente</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Se publicará con la hora actual y los trabajadores recibirán una alerta inmediata.</p>
            </div>
          </div>
        )}

        {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

        <button type="button" onClick={verConfirmacion} style={{ width: '100%', padding: '16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', marginTop: '8px' }}>
          {esAhora ? '⚡ Publicar ahora →' : 'Revisar y publicar →'}
        </button>

      </div>
    </div>
  )
}
