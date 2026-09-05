import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import NegociacionTrabajo from './NegociacionTrabajo'
import TrackingTrabajador from './TrackingTrabajador'
import Calificacion from './Calificacion'
import PerfilPublico from './PerfilPublico'
import ChatTrabajo from './ChatTrabajo'
import PerfilTrabajador from './PerfilTrabajador'
import { enviarNotificacionCompleta } from './guardarNotificacion'
import LogoChamba from './LogoChamba'
import ReportarCobro from './ReportarCobro'

const CATEGORIAS_ICONS = {
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
}

const CATEGORIAS_VIAJE = ['Taxi', 'Moto taxi', 'Repartidor', 'Repartidor moto', 'Flete', 'Taxi / Chofer', 'Mandados']

async function obtenerZona(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`, { headers: { 'Accept-Language': 'es' } })
    const data = await res.json()
    const colonia = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter || ''
    const ciudad = data.address?.city || data.address?.town || data.address?.village || ''
    return colonia ? `${colonia}, ${ciudad}` : ciudad || 'Zona desconocida'
  } catch { return 'Zona no disponible' }
}

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function calcularETAViaje(distanciaKm, categoria) {
  const vel = categoria?.includes('Flete') ? 18 : categoria?.includes('Moto') ? 30 : 25
  const min = Math.round((distanciaKm / vel) * 60)
  if (min < 5) return 'menos de 5 min'
  if (min < 60) return `aprox. ${min} min`
  return `aprox. ${Math.floor(min/60)}h ${min%60}min`
}

function puedeIrAlTrabajo(trabajo) {
  if (!trabajo.fecha_cita || !trabajo.hora_cita) return true
  const horaStr = trabajo.hora_cita.slice(0, 5)
  // Offset fijo -06:00 (Istmo de Tehuantepec / Ciudad de México, sin horario de
  // verano desde 2022): así el cálculo NO depende de la zona horaria que tenga
  // configurada el dispositivo del usuario, aunque esté mal puesta.
  const fechaHoraStr = `${trabajo.fecha_cita}T${horaStr}:00-06:00`
  const cita = new Date(fechaHoraStr)
  const ahora = new Date()
  const diffHoras = (cita - ahora) / (1000 * 60 * 60)
  return diffHoras <= 2 && diffHoras > -4
}

function horasParaCita(trabajo) {
  if (!trabajo.fecha_cita || !trabajo.hora_cita) return null
  const horaStr = trabajo.hora_cita.slice(0, 5)
  const fechaHoraStr = `${trabajo.fecha_cita}T${horaStr}:00-06:00`
  const cita = new Date(fechaHoraStr)
  const ahora = new Date()
  const diffHoras = (cita - ahora) / (1000 * 60 * 60)
  if (diffHoras <= 0) return null
  if (diffHoras < 1) return `${Math.round(diffHoras * 60)} min`
  return `${Math.round(diffHoras)} hrs`
}

function ClienteInfoViaje({ clienteId, notaCliente }) {
  const [cliente, setCliente] = useState(null)
  useEffect(() => {
    supabase.from('usuarios').select('nombre, apellido, foto_url').eq('id', clienteId).maybeSingle()
      .then(({ data }) => { if (data) setCliente(data) })
  }, [clienteId])

  if (!cliente) return null

  return (
    <div style={{ background: 'rgba(55,138,221,0.06)', border: '1px solid rgba(55,138,221,0.25)', borderRadius: '16px', padding: '16px' }}>
      <p style={{ fontSize: '11px', color: '#378ADD', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>👤 Tu pasajero</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: notaCliente ? '12px' : '0' }}>
        {cliente.foto_url ? (
          <img src={cliente.foto_url} alt="cliente" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(55,138,221,0.4)' }} />
        ) : (
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👤</div>
        )}
        <div>
          <p style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>{cliente.nombre} {cliente.apellido || ''}</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Cliente verificado</p>
        </div>
      </div>
      {notaCliente && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>📝 NOTA DEL CLIENTE</p>
          <p style={{ fontSize: '13px', color: 'white', lineHeight: '1.5' }}>{notaCliente}</p>
        </div>
      )}
    </div>
  )
}

export default function VistaTrabajador({ onLogout, userEmail, userId, onCambiarModo, noLeidas = 0, onNotificaciones, irAActivos, irAHistorial, trabajoIdInicial, onNavegacionCompletada, irAPerfil, onPerfilAbierto }) {
  const [trabajos, setTrabajos] = useState([])
  const [misTrabajos, setMisTrabajos] = useState([])
  const [historial, setHistorial] = useState([])
  const [perfilUsuario, setPerfilUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState(null)
  const [exitoAceptar, setExitoAceptar] = useState(false)
  const [negociando, setNegociando] = useState(null)
  const [pestana, setPestana] = useState('disponibles')
  const [loadingCompletar, setLoadingCompletar] = useState(null)
  const [loadingIniciar, setLoadingIniciar] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [calificando, setCalificando] = useState(null)
  const [verPerfilCliente, setVerPerfilCliente] = useState(null)
  const [chatAbierto, setChatAbierto] = useState(null)
  const [mensajeNoPuedoLlegar, setMensajeNoPuedoLlegar] = useState(null)
  const [modalOpciones, setModalOpciones] = useState(false)
  const [verPerfil, setVerPerfil] = useState(false)
  const [pestanaPerfilInicial, setPestanaPerfilInicial] = useState('info')
  const [perfilIncompleto, setPerfilIncompleto] = useState(false)
  const [reportando, setReportando] = useState(null)
  const [camposFaltantes, setCamposFaltantes] = useState([])
  const [infoViaje, setInfoViaje] = useState(null)
  const [modalRechazo, setModalRechazo] = useState(false)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [modalFotoTrabajo, setModalFotoTrabajo] = useState(null)
  const [fotosTrabajoUrls, setFotosTrabajoUrls] = useState([])
  const [subiendoFotoTrabajo, setSubiendoFotoTrabajo] = useState(false)
  const [identidadVerificada, setIdentidadVerificada] = useState(null) // null = aún no se sabe
  const [promptVerificacionCerrado, setPromptVerificacionCerrado] = useState(false)

  useEffect(() => {
    cargarPerfilUsuario()
    cargarMisTrabajos()
    cargarHistorial()
    cargarEstadoVerificacion()
    actualizarUbicacionEnVivo()

    const channel = supabase.channel('trabajos-disponibles')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trabajos' }, (payload) => {
        if (payload.new.status !== 'publicado') {
          setTrabajos(prev => prev.filter(t => t.id !== payload.new.id))
        }
        if (payload.new.trabajador_id === userId) {
          cargarMisTrabajos()
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (irAActivos) { setPestana('mis'); onNavegacionCompletada?.() }
  }, [irAActivos])

  useEffect(() => {
    if (irAHistorial) { setPestana('historial'); onNavegacionCompletada?.() }
  }, [irAHistorial])

  useEffect(() => {
    if (irAPerfil) { setVerPerfil(true); onPerfilAbierto?.() }
  }, [irAPerfil])

  useEffect(() => {
    if (!trabajoIdInicial) return
    const t = misTrabajos.find(t => t.id === trabajoIdInicial)
    if (t) {
      setPestana('mis')
      setTrabajoSeleccionado(t)
    } else {
      supabase.from('trabajos').select('*').eq('id', trabajoIdInicial).maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.status === 'publicado') { setPestana('disponibles'); setTrabajoSeleccionado(data) }
            else { setPestana('mis'); setTrabajoSeleccionado(data) }
          }
        })
    }
  }, [trabajoIdInicial, misTrabajos])

  // Se checa una vez al abrir la pantalla si la identidad ya está aprobada —
  // usado solo para mostrar el banner de aviso, no bloquea nada aquí (el
  // bloqueo real ya vive en NegociacionTrabajo.jsx al momento de aceptar).
  async function cargarEstadoVerificacion() {
    const { data } = await supabase.from('verificaciones')
      .select('status').eq('usuario_id', userId).maybeSingle()
    setIdentidadVerificada(data?.status === 'aprobado')
  }

  function validarPerfilCompleto(perfil, trabajo) {
    const faltantes = []
    if (!perfil?.nombre) faltantes.push('Nombre completo')
    if (!perfil?.foto_url) faltantes.push('Foto de perfil')
    if (!perfil?.categorias_servicio || perfil.categorias_servicio.length === 0) faltantes.push('Categorías de servicio')

    const CATS_CHOFER = ['Taxi / Chofer', 'Moto taxi', 'Repartidor moto', 'Fletes', 'Mandados', 'Repartidor']
    const esViajeTrabajo = trabajo?.es_viaje || CATS_CHOFER.includes(trabajo?.categoria)

    if (esViajeTrabajo) {
      if (!perfil?.vehiculo_placas) faltantes.push('Placas del vehículo')
      if (!perfil?.vehiculo_marca) faltantes.push('Marca del vehículo')
      if (!perfil?.vehiculo_color) faltantes.push('Color del vehículo')
      if (!perfil?.vehiculo_foto_url) faltantes.push('Foto del vehículo')
    }

    return faltantes
  }

  async function intentarVerTrabajo(trabajo) {
    const faltantes = validarPerfilCompleto(perfilUsuario, trabajo)
    if (faltantes.length > 0) { setCamposFaltantes(faltantes); setPerfilIncompleto(true); return }
    setInfoViaje(null)
    setTrabajoSeleccionado(trabajo)

    if (trabajo.es_viaje && trabajo.origen_lat && trabajo.destino_lat) {
      const distancia = trabajo.distancia_km || calcularDistanciaKm(trabajo.origen_lat, trabajo.origen_lng, trabajo.destino_lat, trabajo.destino_lng)
      const eta = calcularETAViaje(distancia, trabajo.categoria)
      const [zonaOrigen, zonaDestino] = await Promise.all([
        obtenerZona(trabajo.origen_lat, trabajo.origen_lng),
        obtenerZona(trabajo.destino_lat, trabajo.destino_lng),
      ])
      setInfoViaje({ zonaOrigen, zonaDestino, distancia: distancia.toFixed(1), eta })
    }
  }

  // Cada vez que el trabajador abre esta pantalla, se actualiza su ubicación
  // en la base de datos con el GPS real del dispositivo. Así el radio de
  // alertas (radio_alertas) siempre se calcula desde donde está de verdad,
  // no desde un punto fijo que haya guardado alguna vez en su perfil.
  function actualizarUbicacionEnVivo() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        await supabase.from('usuarios').update({ lat: latitude, lng: longitude }).eq('id', userId)
        setPerfilUsuario(prev => prev ? { ...prev, lat: latitude, lng: longitude } : prev)
      },
      (err) => console.log('No se pudo actualizar la ubicación en vivo:', err.message),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

  async function cargarPerfilUsuario() {
    const { data } = await supabase.from('usuarios')
      .select('categorias_servicio, radio_alertas, lat, lng, nombre, foto_url, vehiculo_marca, vehiculo_color, vehiculo_placas, vehiculo_foto_url, mp_account_id')
      .eq('id', userId).maybeSingle()
    if (data) setPerfilUsuario(data)
    cargarTrabajos(data)
  }

  async function cargarTrabajos(perfil) {
    setCargando(true)
    const categorias = perfil?.categorias_servicio || []
    let query = supabase.from('trabajos').select('*').eq('status', 'publicado').order('creado_en', { ascending: false })
    if (categorias.length > 0) query = query.in('categoria', categorias)
    const { data } = await query
    if (data) setTrabajos(data)
    setCargando(false)
  }

  async function cargarMisTrabajos() {
    const { data, error } = await supabase.from('trabajos').select('*')
      .eq('trabajador_id', userId)
      .neq('status', 'completado')
      .neq('status', 'cancelado')
      .neq('status', 'publicado')
      .order('creado_en', { ascending: false })
    if (error) console.log('Error cargarMisTrabajos:', error)
    if (data) {
      setMisTrabajos(data)
      console.log('Mis trabajos cargados:', data.length, data.map(t => t.status))
    }
    return data
  }

  async function cargarHistorial() {
    const { data } = await supabase.from('trabajos').select('*')
      .in('status', ['completado', 'cancelado']).eq('trabajador_id', userId)
      .order('creado_en', { ascending: false })
    if (data) setHistorial(data)
  }

  async function iniciarTrabajo(trabajo) {
    setLoadingIniciar(trabajo.id)
    await supabase.from('trabajos').update({ trabajo_iniciado: true }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🔨 ¡El trabajador comenzó!',
      cuerpo: `Tu ${trabajo.categoria} ya está en progreso.`,
      tipo: 'general',
      trabajoId: trabajo.id,
    })
    await cargarMisTrabajos()
    setLoadingIniciar(null)
  }

  async function marcarCompletado(trabajo) {
    setFotosTrabajoUrls([])
    setModalFotoTrabajo(trabajo)
  }

  async function confirmarCompletadoConFoto(trabajo) {
    setLoadingCompletar(trabajo.id)
    await supabase.from('trabajos').update({
      status: 'en_revision',
      en_revision_desde: new Date().toISOString(),
      foto_trabajo_url: fotosTrabajoUrls[0] || null,
      fotos_trabajo_urls: fotosTrabajoUrls,
    }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.cliente_id,
      titulo: '🔧 El trabajador terminó',
      cuerpo: `Tu ${trabajo.categoria} está listo. ¡Confírmalo para liberar el pago!`,
      tipo: 'trabajo_completado',
      trabajoId: trabajo.id,
    })
    await cargarMisTrabajos()
    await cargarHistorial()
    setLoadingCompletar(null)
    setModalFotoTrabajo(null)
    setFotosTrabajoUrls([])
    setCalificando(trabajo)
  }

  async function subirFotoTrabajo(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    if (fotosTrabajoUrls.length + files.length > 10) return
    setSubiendoFotoTrabajo(true)
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `trabajos/${modalFotoTrabajo.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('avatares').upload(path, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('avatares').getPublicUrl(path)
        setFotosTrabajoUrls(prev => [...prev, data.publicUrl])
      }
    }
    setSubiendoFotoTrabajo(false)
  }

  async function noPuedoLlegar(trabajo) {
    await supabase.from('mensajes').insert({
      trabajo_id: trabajo.id, emisor_id: userId,
      contenido: '⚠️ Hola, no puedo llegar exactamente al punto marcado en el mapa. ¿Podemos acordar un punto de encuentro cercano?',
    })
    setMensajeNoPuedoLlegar(null)
    setChatAbierto(trabajo)
  }

  function BotonNavegacion({ lat, lng, label = 'Cómo llegar' }) {
    const [mostrarOpciones, setMostrarOpciones] = useState(false)
    const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    return (
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <button type="button" onClick={() => setMostrarOpciones(!mostrarOpciones)}
          style={{ width: '100%', padding: '10px', background: 'rgba(55,138,221,0.15)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.4)', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          🗺️ {label}
        </button>
        {mostrarOpciones && (
          <div onClick={() => setMostrarOpciones(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }}>
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 'auto', left: '16px', right: '16px', background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: '16px', overflow: 'hidden', zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              <p style={{ padding: '12px 16px 8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Abrir con</p>
              <a href={wazeUrl} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', color: 'white', textDecoration: 'none', borderBottom: '0.5px solid rgba(255,255,255,0.08)', fontSize: '15px', fontWeight: '600' }}>
                <span style={{ fontSize: '24px' }}>🟣</span>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '600' }}>Waze</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Navegación con tráfico en tiempo real</p>
                </div>
              </a>
              <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', color: 'white', textDecoration: 'none', fontSize: '15px', fontWeight: '600' }}>
                <span style={{ fontSize: '24px' }}>🗺️</span>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '600' }}>Google Maps</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Ruta detallada y alternativas</p>
                </div>
              </a>
              <button type="button" onClick={() => setMostrarOpciones(false)} style={{ width: '100%', padding: '14px', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    return `hace ${Math.floor(hrs / 24)} días`
  }

  function formatearFecha(f) {
    if (!f) return ''
    const d = new Date(f + 'T12:00:00')
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const esViaje = (trabajo) => trabajo.es_viaje || CATEGORIAS_VIAJE.includes(trabajo.categoria)

  function abrirPerfilEn(pestanaDestino) {
    setPestanaPerfilInicial(pestanaDestino)
    setVerPerfil(true)
  }

  const HeaderBotones = () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button type="button" onClick={onNotificaciones} style={{
        background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: '50%', width: '38px', height: '38px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative', fontSize: '16px'
      }}>
        🔔
        {noLeidas > 0 && (
          <span style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#F09595', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 5px', minWidth: '16px', textAlign: 'center' }}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>
      <button type="button" onClick={() => setModalOpciones(true)} style={{
        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
        border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '8px',
        padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: '500'
      }}>
        ⚙️ Opciones
      </button>
    </div>
  )

  const ModalOpciones = () => (
    <div onClick={() => setModalOpciones(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1A1A1A', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', border: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 20px' }} />
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Opciones</p>
        <button type="button" onClick={() => { setModalOpciones(false); onCambiarModo() }} style={{ width: '100%', padding: '16px', marginBottom: '10px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          🗺️ Cambiar a modo cliente
        </button>
        <button type="button" onClick={() => { setModalOpciones(false); onLogout() }} style={{ width: '100%', padding: '14px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  // Banner persistente: se ve en TODAS las pestañas (no solo cuando intenta
  // aceptar un trabajo) para que nadie deje pasar sin darse cuenta que le
  // falta verificarse o conectar Mercado Pago.
  const BannerPendientes = () => {
    if (!perfilUsuario) return null
    const faltaMP = !perfilUsuario.mp_account_id
    const faltaVerificacion = identidadVerificada === false
    if (!faltaMP && !faltaVerificacion) return null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {faltaVerificacion && (
          <div style={{ background: 'rgba(55,138,221,0.08)', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🪪</span>
            <p style={{ flex: 1, fontSize: '12px', color: '#378ADD', lineHeight: '1.4' }}>Verifica tu identidad para poder seguir aceptando trabajos.</p>
            <button type="button" onClick={() => abrirPerfilEn('info')} style={{ flexShrink: 0, padding: '7px 12px', background: '#378ADD', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Verificarme
            </button>
          </div>
        )}
        {faltaMP && (
          <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🏦</span>
            <p style={{ flex: 1, fontSize: '12px', color: '#E8A030', lineHeight: '1.4' }}>Conecta tu Mercado Pago o no podrás recibir el pago de tus trabajos.</p>
            <button type="button" onClick={() => abrirPerfilEn('pagos')} style={{ flexShrink: 0, padding: '7px 12px', background: '#E8A030', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Conectar
            </button>
          </div>
        )}
      </div>
    )
  }

  // Ventana emergente que aparece EN MEDIO de la pantalla al abrir la app,
  // solo si ya sabemos que la identidad NO está verificada. Se puede cerrar
  // ("Más tarde") o ir directo a verificarse. Una vez cerrada, no vuelve a
  // salir hasta que se abra la app de nuevo (se resetea al recargar/entrar).
  const ModalVerificacion = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#161616', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '20px', padding: '28px 24px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '14px' }}>🪪</div>
        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '10px', color: 'white' }}>Verifica tu identidad</h3>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6', marginBottom: '22px' }}>
          Los clientes confían más en trabajadores verificados, y algunos trabajos lo requieren para poder aceptarlos. Solo toma unos minutos.
        </p>
        <button type="button" onClick={() => { setPromptVerificacionCerrado(true); abrirPerfilEn('servicios') }} style={{ width: '100%', padding: '14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '10px' }}>
          Verificar ahora
        </button>
        <button type="button" onClick={() => setPromptVerificacionCerrado(true)} style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Más tarde
        </button>
      </div>
    </div>
  )

  if (perfilIncompleto) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', maxWidth: '340px', width: '100%' }}>
          <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>Completa tu perfil primero</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '20px', lineHeight: '1.5' }}>
            Los clientes necesitan ver tu información antes de contratarte.
          </p>
          <div style={{ background: 'rgba(240,149,149,0.08)', border: '0.5px solid rgba(240,149,149,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#F09595', fontWeight: '600', marginBottom: '8px' }}>Te falta completar:</p>
            {camposFaltantes.map(c => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '14px' }}>❌</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{c}</p>
              </div>
            ))}
          </div>
          {camposFaltantes.some(c => c.includes('vehículo') || c.includes('Placas')) && (
            <div style={{ background: 'rgba(55,138,221,0.08)', border: '0.5px solid rgba(55,138,221,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
              🚗 Para aceptar viajes necesitas tener los datos de tu vehículo completos en la pestaña <strong style={{ color: '#378ADD' }}>Vehículo</strong> de tu perfil.
            </div>
          )}
          <button type="button" onClick={() => { setPerfilIncompleto(false); abrirPerfilEn('info') }} style={{ width: '100%', padding: '14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '10px' }}>
            ✏️ Completar mi perfil
          </button>
          <button type="button" onClick={() => setPerfilIncompleto(false)} style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  if (reportando) return <ReportarCobro trabajo={reportando} userId={userId} rolReportador="trabajador" onVolver={() => setReportando(null)} />
  if (verPerfil) return <PerfilTrabajador userId={userId} userEmail={userEmail} pestanaInicial={pestanaPerfilInicial} onVolver={() => { setVerPerfil(false); setPestanaPerfilInicial('info'); cargarPerfilUsuario(); cargarEstadoVerificacion() }} />
  if (chatAbierto) return <ChatTrabajo trabajo={chatAbierto} userId={userId} onVolver={() => setChatAbierto(null)} />
  if (verPerfilCliente) return <PerfilPublico usuarioId={verPerfilCliente} rolVisto="cliente" onVolver={() => setVerPerfilCliente(null)} />
  if (calificando) return <Calificacion trabajo={calificando} userId={userId} rolCalificador="trabajador" onCompletado={() => { setCalificando(null); cargarMisTrabajos(); cargarHistorial() }} />
  if (tracking) return <TrackingTrabajador trabajo={tracking} userId={userId} perfilUsuario={perfilUsuario} onVolver={() => { setTracking(null); cargarMisTrabajos() }} />
  if (negociando) return (
    <NegociacionTrabajo trabajo={negociando} userId={userId} onVolver={() => setNegociando(null)}
      onAceptado={async () => {
        setNegociando(null)
        setTrabajoSeleccionado(null)
        await cargarMisTrabajos()
        await cargarTrabajos(perfilUsuario)
        setPestana('mis')
      }}
    />
  )

  if (mensajeNoPuedoLlegar) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', maxWidth: '340px', width: '100%' }}>
          <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '12px' }}>¿No puedes llegar al punto?</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.6', marginBottom: '20px' }}>Se enviará este mensaje al cliente automáticamente:</p>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', marginBottom: '20px', fontStyle: 'italic' }}>
            "⚠️ Hola, no puedo llegar exactamente al punto marcado. ¿Podemos acordar un punto de encuentro cercano?"
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="button" onClick={() => noPuedoLlegar(mensajeNoPuedoLlegar)} style={{ width: '100%', padding: '14px', background: '#E8A030', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              ✉️ Enviar mensaje y abrir chat
            </button>
            <button type="button" onClick={() => setMensajeNoPuedoLlegar(null)} style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (modalFotoTrabajo) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={() => { setModalFotoTrabajo(null); setFotosTrabajoUrls([]) }} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>📸 Foto del trabajo terminado</h2>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#1D9E75', marginBottom: '6px' }}>¿Por qué pedimos una foto?</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
              La foto protege a ambas partes. Si el cliente abre una disputa, esta imagen es la prueba de que el trabajo quedó bien. Sin foto no puedes marcar como terminado.
            </p>
          </div>
          {fotosTrabajoUrls.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
              {fotosTrabajoUrls.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={url} alt={`foto ${i+1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(29,158,117,0.4)' }} />
                  <button type="button" onClick={() => setFotosTrabajoUrls(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {fotosTrabajoUrls.length < 10 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.15)', borderRadius: '16px', cursor: 'pointer' }}>
              <span style={{ fontSize: '36px' }}>{subiendoFotoTrabajo ? '⏳' : '📷'}</span>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>
                  {subiendoFotoTrabajo ? 'Subiendo...' : 'Agregar fotos'}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{fotosTrabajoUrls.length}/10 fotos del trabajo terminado</p>
              </div>
              <input type="file" accept="image/*" capture="environment" multiple onChange={subirFotoTrabajo} style={{ display: 'none' }} disabled={subiendoFotoTrabajo} />
            </label>
          )}
          <button type="button" onClick={() => confirmarCompletadoConFoto(modalFotoTrabajo)}
            disabled={fotosTrabajoUrls.length === 0 || loadingCompletar === modalFotoTrabajo.id}
            style={{ width: '100%', padding: '16px', background: fotosTrabajoUrls.length > 0 ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: fotosTrabajoUrls.length > 0 ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: fotosTrabajoUrls.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif' }}>
            {loadingCompletar === modalFotoTrabajo.id ? 'Enviando...' : fotosTrabajoUrls.length > 0 ? `✅ Confirmar trabajo terminado (${fotosTrabajoUrls.length} foto${fotosTrabajoUrls.length > 1 ? 's' : ''})` : 'Sube al menos una foto'}
          </button>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: '1.6' }}>
            La foto será visible para el cliente y el equipo de Chamba en caso de disputa.
          </p>
        </div>
      </div>
    )
  }

  if (modalRechazo) {
    const MOTIVOS_RECHAZO = [
      { id: 'peso', icon: '⚖️', label: 'Capacidad de peso del vehículo' },
      { id: 'no_disponible', icon: '🛵', label: 'Mi vehículo no está disponible' },
      { id: 'lejos', icon: '📍', label: 'Estoy muy lejos del punto' },
      { id: 'clima', icon: '🌧️', label: 'Condiciones del clima' },
      { id: 'falla', icon: '🔧', label: 'Falla mecánica' },
      { id: 'otro', icon: '📝', label: 'Otro motivo' },
    ]
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={() => setModalRechazo(false)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>¿Por qué no puedes aceptar?</h2>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
            ✅ No habrá penalización. El trabajo quedará disponible para otro conductor.
          </div>
          {MOTIVOS_RECHAZO.map(m => (
            <button key={m.id} type="button" onClick={() => setMotivoRechazo(m.id)}
              style={{ padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', background: motivoRechazo === m.id ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.04)', outline: motivoRechazo === m.id ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '24px' }}>{m.icon}</span>
              <span style={{ fontSize: '14px', color: motivoRechazo === m.id ? '#1D9E75' : 'rgba(255,255,255,0.8)', fontWeight: motivoRechazo === m.id ? '600' : '400' }}>{m.label}</span>
              {motivoRechazo === m.id && <span style={{ marginLeft: 'auto', color: '#1D9E75' }}>✓</span>}
            </button>
          ))}
          <button type="button" onClick={() => { setModalRechazo(false); setMotivoRechazo(''); setTrabajoSeleccionado(null) }}
            disabled={!motivoRechazo}
            style={{ width: '100%', padding: '16px', background: motivoRechazo ? 'rgba(240,149,149,0.15)' : 'rgba(255,255,255,0.06)', color: motivoRechazo ? '#F09595' : 'rgba(255,255,255,0.3)', border: `1px solid ${motivoRechazo ? 'rgba(240,149,149,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: motivoRechazo ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif', marginTop: '8px' }}>
            {motivoRechazo ? '✅ Confirmar — no aceptar este viaje' : 'Selecciona un motivo'}
          </button>
          <button type="button" onClick={() => setModalRechazo(false)}
            style={{ width: '100%', padding: '13px', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            Cancelar — volver al trabajo
          </button>
        </div>
      </div>
    )
  }

  if (trabajoSeleccionado) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        {modalOpciones && <ModalOpciones />}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={() => { setTrabajoSeleccionado(null); setExitoAceptar(false) }} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Detalle del trabajo</h2>
          <HeaderBotones />
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {exitoAceptar ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '60px' }}>🎉</div>
              <h3 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '700' }}>¡Trabajo aceptado!</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '280px' }}>El cliente fue notificado.</p>
            </div>
          ) : (
            <>
              <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '48px' }}>{CATEGORIAS_ICONS[trabajoSeleccionado.categoria] || '✳️'}</span>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{trabajoSeleccionado.categoria}</h3>
                  <span style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75' }}>${trabajoSeleccionado.ultima_oferta || trabajoSeleccionado.presupuesto} MXN</span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>DESCRIPCIÓN</p>
  <p style={{ fontSize: '15px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)' }}>{trabajoSeleccionado.descripcion}</p>
  {trabajoSeleccionado.fotos_problema && trabajoSeleccionado.fotos_problema.length > 0 && (
    <div style={{ marginTop: '12px' }}>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>📷 FOTOS DEL PROBLEMA ({trabajoSeleccionado.fotos_problema.length})</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {trabajoSeleccionado.fotos_problema.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={`problema ${i+1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
          </a>
        ))}
      </div>
    </div>
  )}
</div>
                {trabajoSeleccionado.fecha_cita && (
                  <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(29,158,117,0.05)' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>CUÁNDO LO NECESITAN</p>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75', textTransform: 'capitalize' }}>📅 {formatearFecha(trabajoSeleccionado.fecha_cita)}</p>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>🕐 {trabajoSeleccionado.hora_cita?.slice(0, 5)} hrs</p>
                  </div>
                )}
                {trabajoSeleccionado.materiales && (
                  <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: trabajoSeleccionado.materiales === 'trabajador' ? 'rgba(232,160,48,0.06)' : 'transparent' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>🔩 MATERIALES</p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: trabajoSeleccionado.materiales === 'trabajador' ? '#E8A030' : 'rgba(255,255,255,0.8)' }}>
                      {trabajoSeleccionado.materiales === 'cliente' ? '✅ El cliente los pone — solo llegas a trabajar' :
                       trabajoSeleccionado.materiales === 'trabajador' ? '🛒 Tú consigues los materiales — agrega el costo al precio' :
                       '🤝 A acordar en el chat antes de empezar'}
                    </p>
                  </div>
                )}
                <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>UBICACIÓN</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>📍 {trabajoSeleccionado.lat?.toFixed(4)}, {trabajoSeleccionado.lng?.toFixed(4)}</p>
                </div>
                <div style={{ padding: '16px 18px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>PUBLICADO</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>🕐 {tiempoTranscurrido(trabajoSeleccionado.creado_en)}</p>
                </div>
              </div>

              {trabajoSeleccionado.es_viaje && (
                <div style={{ background: 'rgba(55,138,221,0.06)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '16px', padding: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#378ADD', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🗺️ Resumen del viaje</p>
                  {infoViaje ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '16px', marginTop: '2px' }}>📍</span>
                          <div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>ORIGEN (ZONA APROXIMADA)</p>
                            <p style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{infoViaje.zonaOrigen}</p>
                          </div>
                        </div>
                        <div style={{ marginLeft: '13px', width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', marginTop: '-4px', marginBottom: '-4px' }} />
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '16px', marginTop: '2px' }}>🏁</span>
                          <div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>DESTINO (ZONA APROXIMADA)</p>
                            <p style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{infoViaje.zonaDestino}</p>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ flex: 1, padding: '12px', textAlign: 'center', borderRight: '0.5px solid rgba(255,255,255,0.08)' }}>
                          <p style={{ fontSize: '18px', fontWeight: '800', color: '#378ADD' }}>{infoViaje.distancia} km</p>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Distancia</p>
                        </div>
                        <div style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontSize: '16px', fontWeight: '800', color: '#378ADD' }}>{infoViaje.eta}</p>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Duración est.</p>
                        </div>
                      </div>
                      {trabajoSeleccionado.tipo_viaje === 'redondo' && (
                        <div style={{ background: 'rgba(232,160,48,0.1)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '10px', padding: '10px 14px', marginTop: '10px' }}>
                          <p style={{ fontSize: '13px', color: '#E8A030', fontWeight: '600' }}>🔄 Viaje redondo</p>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>El cliente espera que lo regreses. Tiempo de espera: <strong style={{ color: '#E8A030' }}>{trabajoSeleccionado.tiempo_espera_min} min</strong></p>
                        </div>
                      )}
                      {trabajoSeleccionado.tipo_viaje === 'paradas' && trabajoSeleccionado.paradas && JSON.parse(trabajoSeleccionado.paradas || '[]').length > 0 && (
                        <div style={{ background: 'rgba(232,160,48,0.1)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '10px', padding: '10px 14px', marginTop: '10px' }}>
                          <p style={{ fontSize: '13px', color: '#E8A030', fontWeight: '600', marginBottom: '6px' }}>🔶 Paradas en la ruta</p>
                          {JSON.parse(trabajoSeleccionado.paradas || '[]').map((p, i) => (
                            <p key={i} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '3px' }}>#{i+1} {p.nombre}</p>
                          ))}
                        </div>
                      )}
                      {trabajoSeleccionado.personas > 0 && (
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>👥</span>
                          <div>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>PERSONAS</p>
                            <p style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{trabajoSeleccionado.personas} persona{trabajoSeleccionado.personas > 1 ? 's' : ''}</p>
                          </div>
                          {trabajoSeleccionado.personas >= 4 && (
                            <p style={{ fontSize: '11px', color: '#E8A030', marginLeft: 'auto' }}>⚠️ Verifica capacidad</p>
                          )}
                        </div>
                      )}
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '10px' }}>
                        La dirección exacta se revela al aceptar el viaje
                      </p>
                    </>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Cargando información del viaje...</p>
                  )}
                </div>
              )}

              {trabajoSeleccionado.es_viaje && trabajoSeleccionado.cliente_id && (
                <ClienteInfoViaje clienteId={trabajoSeleccionado.cliente_id} notaCliente={trabajoSeleccionado.nota_cliente} />
              )}

              {trabajoSeleccionado.cliente_id && (
                <button type="button" onClick={() => setVerPerfilCliente(trabajoSeleccionado.cliente_id)} style={{ width: '100%', padding: '13px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  👤 Ver perfil del cliente
                </button>
              )}
              <button type="button" onClick={() => setChatAbierto(trabajoSeleccionado)} style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ❓ Pedir más detalles al cliente
              </button>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
                🔒 Al aceptar, el pago del cliente queda retenido y protegido hasta que confirme que el trabajo quedó bien.
              </div>
              <button type="button" onClick={() => setNegociando(trabajoSeleccionado)} style={{ width: '100%', padding: '16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                💰 Ver y negociar precio
              </button>
              <button type="button" onClick={() => setModalRechazo(true)} style={{ width: '100%', padding: '13px', background: 'transparent', color: 'rgba(240,149,149,0.6)', border: '0.5px solid rgba(240,149,149,0.2)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ❌ No puedo aceptar este {esViaje(trabajoSeleccionado) ? 'viaje' : 'trabajo'}
              </button>
              <button type="button" onClick={() => setTrabajoSeleccionado(null)} style={{ width: '100%', padding: '13px', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Ver otros trabajos
              </button>
            </>
          )}
        </div>
      </div>
    )
  }


  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      {modalOpciones && <ModalOpciones />}
      {identidadVerificada === false && !promptVerificacionCerrado && <ModalVerificacion />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div><LogoChamba size='sm' /></div>
        <HeaderBotones />
      </div>

      <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        {[
          ['disponibles', '🔍', 'Disponibles', trabajos.length],
          ['mis', '✅', 'Activos', misTrabajos.length],
          ['historial', '🏁', 'Historial', historial.length],
          ['perfil', '👤', 'Perfil', 0],
        ].map(([key, icon, label, count]) => (
          <button key={key} type="button" onClick={() => {
            if (key === 'perfil') { abrirPerfilEn('info'); return }
            setPestana(key)
          }} style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: '10px', background: pestana === key ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: pestana === key ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: pestana === key ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {icon} {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        <BannerPendientes />

        {pestana === 'disponibles' && (
          <>
            {perfilUsuario && (!perfilUsuario.categorias_servicio || perfilUsuario.categorias_servicio.length === 0) && (
              <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#E8A030', textAlign: 'center' }}>
                ⚠️ Configura tus servicios en la pestaña <strong>Perfil</strong> para ver trabajos de tu especialidad.
              </div>
            )}
            {cargando && <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>Buscando trabajos cerca...</div>}
            {!cargando && trabajos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p>No hay trabajos disponibles para tus categorías ahorita.</p>
              </div>
            )}
            {trabajos.map(trabajo => (
              <button key={trabajo.id} type="button" onClick={() => intentarVerTrabajo(trabajo)}
                style={{ background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${esViaje(trabajo) ? 'rgba(55,138,221,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '16px 18px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '36px' }}>{CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{trabajo.categoria}</span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75' }}>${trabajo.ultima_oferta || trabajo.presupuesto}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trabajo.descripcion}</p>
                    {trabajo.fecha_cita && (
                      <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '600', background: 'rgba(29,158,117,0.1)', padding: '2px 8px', borderRadius: '6px', border: '0.5px solid rgba(29,158,117,0.3)' }}>📅 {trabajo.fecha_cita}</span>
                        <span style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '600', background: 'rgba(29,158,117,0.1)', padding: '2px 8px', borderRadius: '6px', border: '0.5px solid rgba(29,158,117,0.3)' }}>🕐 {trabajo.hora_cita?.slice(0, 5)} hrs</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Publicado {tiempoTranscurrido(trabajo.creado_en)}</p>
                      {esViaje(trabajo) && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(55,138,221,0.15)', color: '#378ADD', border: '0.5px solid rgba(55,138,221,0.3)' }}>
                          🚗 Viaje · {trabajo.distancia_km?.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}

        {pestana === 'mis' && (
          <>
            {misTrabajos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
                <p>No tienes trabajos activos.</p>
              </div>
            )}
            {misTrabajos.map(trabajo => (
              <div key={trabajo.id} style={{ background: trabajo.status === 'en_revision' ? 'rgba(232,160,48,0.08)' : trabajo.trabajo_iniciado ? 'rgba(55,138,221,0.06)' : 'rgba(29,158,117,0.06)', border: `0.5px solid ${trabajo.status === 'en_revision' ? 'rgba(232,160,48,0.3)' : trabajo.trabajo_iniciado ? 'rgba(55,138,221,0.2)' : 'rgba(29,158,117,0.2)'}`, borderRadius: '16px', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '36px' }}>{CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{trabajo.categoria}</span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75' }}>${trabajo.precio_acordado || trabajo.presupuesto}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trabajo.descripcion}</p>
                    {trabajo.fecha_cita && (
                      <p style={{ fontSize: '12px', color: '#1D9E75', marginTop: '4px', fontWeight: '600' }}>
                        📅 {trabajo.fecha_cita} · 🕐 {trabajo.hora_cita?.slice(0, 5)} hrs
                      </p>
                    )}
                    <div style={{ marginTop: '6px' }}>
                      {trabajo.status === 'en_revision'
                        ? <span style={{ fontSize: '11px', color: '#E8A030', fontWeight: '500' }}>⏳ Esperando confirmación del cliente</span>
                        : trabajo.trabajo_iniciado
                          ? <span style={{ fontSize: '11px', color: '#378ADD', fontWeight: '500' }}>🔨 Trabajo en progreso</span>
                          : trabajo.pago_status !== 'pagado'
                            ? <span style={{ fontSize: '11px', color: '#E8A030', fontWeight: '500' }}>⏳ Esperando que el cliente pague</span>
                            : <span style={{ fontSize: '11px', color: '#1D9E75', fontWeight: '500' }}>🔒 Pago protegido — puedes ir al trabajo</span>
                      }
                    </div>
                  </div>
                </div>

                <button type="button" onClick={() => setChatAbierto(trabajo)} style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  💬 Chat con el cliente
                </button>

                {(trabajo.origen_lat || trabajo.lat) && (
                  <BotonNavegacion
                    lat={trabajo.origen_lat || trabajo.lat}
                    lng={trabajo.origen_lng || trabajo.lng}
                    label={esViaje(trabajo) ? '🚗 Ir al punto de origen' : '📍 Cómo llegar al trabajo'}
                  />
                )}
                {esViaje(trabajo) && trabajo.destino_lat && trabajo.status !== 'en_revision' && (
                  <BotonNavegacion lat={trabajo.destino_lat} lng={trabajo.destino_lng} label="🏁 Ver destino del viaje" />
                )}

                <button type="button" onClick={() => setReportando(trabajo)} style={{ width: '100%', padding: '7px', marginBottom: '8px', background: 'transparent', color: 'rgba(240,149,149,0.5)', border: '0.5px solid rgba(240,149,149,0.15)', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  🚨 El cliente me pidió cobrar fuera de la app
                </button>

                {esViaje(trabajo) && trabajo.status === 'aceptado' && (
                  <button type="button" onClick={() => setMensajeNoPuedoLlegar(trabajo)} style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'rgba(232,160,48,0.08)', color: '#E8A030', border: '0.5px solid rgba(232,160,48,0.25)', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    ⚠️ No puedo llegar al punto — coordinar con cliente
                  </button>
                )}

                {trabajo.cliente_id && (
                  <button type="button" onClick={() => setVerPerfilCliente(trabajo.cliente_id)} style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'rgba(55,138,221,0.08)', color: '#378ADD', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    👤 Ver perfil del cliente
                  </button>
                )}

                {/* Candado de tiempo para tracking */}
                {trabajo.status === 'aceptado' && !trabajo.trabajador_en_camino && !trabajo.trabajador_llego && (
                  puedeIrAlTrabajo(trabajo) ? (
                    <button type="button" onClick={() => setTracking(trabajo)} style={{ width: '100%', padding: '10px', background: 'rgba(55,138,221,0.2)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.4)', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '8px' }}>
                      🚗 Ir al trabajo — iniciar tracking
                    </button>
                  ) : (
                    <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: '8px' }}>
                      ⏰ El tracking se activa 2 hrs antes · cita a las {trabajo.hora_cita?.slice(0, 5)}
                      {horasParaCita(trabajo) && <span style={{ display: 'block', marginTop: '2px', color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>Faltan aprox. {horasParaCita(trabajo)}</span>}
                    </div>
                  )
                )}

                {trabajo.trabajador_en_camino && !trabajo.trabajador_llego && (
                  <button type="button" onClick={() => setTracking(trabajo)} style={{ width: '100%', padding: '10px', background: 'rgba(29,158,117,0.2)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '8px' }}>
                    🟢 En camino — ver mapa
                  </button>
                )}

                {/* ✅ NUEVO — Llegó pero esperando que cliente confirme */}
                {trabajo.status === 'aceptado' && trabajo.trabajador_llego && !trabajo.cliente_confirmo_llegada && !trabajo.trabajo_iniciado && (
                  <div style={{ padding: '10px 14px', background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '10px', fontSize: '12px', color: '#E8A030', textAlign: 'center', marginBottom: '8px' }}>
                    ⏳ Marcaste que llegaste — esperando que el cliente confirme tu llegada...
                  </div>
                )}

                {/* ✅ Llegó Y cliente confirmó — puede iniciar */}
                {trabajo.status === 'aceptado' && trabajo.trabajador_llego && trabajo.cliente_confirmo_llegada && !trabajo.trabajo_iniciado && (
                  <button type="button" onClick={() => iniciarTrabajo(trabajo)} disabled={loadingIniciar === trabajo.id}
                    style={{ width: '100%', padding: '10px', background: loadingIniciar === trabajo.id ? 'rgba(55,138,221,0.3)' : 'rgba(55,138,221,0.8)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '8px' }}>
                    {loadingIniciar === trabajo.id ? 'Registrando...' : '🔨 Empecé el trabajo'}
                  </button>
                )}

                {/* Inició — puede marcar terminado */}
                {trabajo.status === 'aceptado' && trabajo.trabajo_iniciado && (
                  <button type="button" onClick={() => marcarCompletado(trabajo)} disabled={loadingCompletar === trabajo.id}
                    style={{ width: '100%', padding: '10px', background: loadingCompletar === trabajo.id ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                    {loadingCompletar === trabajo.id ? 'Procesando...' : '🔧 Terminé — avisar al cliente'}
                  </button>
                )}

                {trabajo.status === 'en_revision' && (
                  <div style={{ padding: '10px 14px', background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '10px', fontSize: '12px', color: '#E8A030', textAlign: 'center' }}>
                    ⏳ Avisaste que terminaste — esperando que el cliente confirme
                  </div>
                )}

                {trabajo.status === 'aceptado' && !trabajo.trabajador_llego && (
                  <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '6px' }}>
                    ⏳ Confirma tu llegada antes de marcar como terminado
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {pestana === 'historial' && (
          <>
            {historial.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏁</div>
                <p>Aún no tienes trabajos completados.</p>
              </div>
            )}
            {historial.map(trabajo => (
              <div key={trabajo.id} style={{ background: trabajo.status === 'completado' ? 'rgba(29,158,117,0.06)' : 'rgba(240,149,149,0.05)', border: `0.5px solid ${trabajo.status === 'completado' ? 'rgba(29,158,117,0.2)' : 'rgba(240,149,149,0.2)'}`, borderRadius: '16px', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '36px' }}>{CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{trabajo.categoria}</span>
                      <span style={{ fontSize: '15px', fontWeight: '700', color: trabajo.status === 'completado' ? '#1D9E75' : '#F09595' }}>${trabajo.precio_acordado || trabajo.presupuesto}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{trabajo.descripcion}</p>
                    {trabajo.fecha_cita && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>📅 {trabajo.fecha_cita} · 🕐 {trabajo.hora_cita?.slice(0, 5)} hrs</p>}
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', display: 'inline-block', background: trabajo.status === 'completado' ? 'rgba(29,158,117,0.2)' : 'rgba(240,149,149,0.1)', color: trabajo.status === 'completado' ? '#1D9E75' : '#F09595', border: `0.5px solid ${trabajo.status === 'completado' ? 'rgba(29,158,117,0.4)' : 'rgba(240,149,149,0.3)'}`, fontWeight: '500' }}>
                      {trabajo.status === 'completado' ? '🏁 Completado' : '❌ Cancelado'}
                    </span>
                    {trabajo.status === 'completado' && trabajo.pago_status === 'liberado' && (
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', display: 'inline-block', marginLeft: '6px', background: 'rgba(232,160,48,0.15)', color: '#E8A030', border: '0.5px solid rgba(232,160,48,0.4)', fontWeight: '600' }}>
                        💰 Depositado
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '8px' }}>{tiempoTranscurrido(trabajo.creado_en)}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
