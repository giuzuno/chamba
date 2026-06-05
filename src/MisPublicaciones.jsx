import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Calificacion from './Calificacion'
import ChatTrabajo from './ChatTrabajo'
import Disputa from './Disputa'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { enviarNotificacionCompleta } from './guardarNotificacion'
import ReportarCobro from './ReportarCobro'

delete L.Icon.Default.prototype._getIconUrl

const iconoTrabajador = L.divIcon({
  html: `<div style="background:#1D9E75;border:3px solid white;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">👷</div>`,
  className: '', iconSize: [42,42], iconAnchor: [21,21], popupAnchor: [0,-24],
})

const iconoCliente = L.divIcon({
  html: `<div style="background:#378ADD;border:3px solid white;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🏠</div>`,
  className: '', iconSize: [42,42], iconAnchor: [21,21], popupAnchor: [0,-24],
})

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
  'Taxi': '🚕', 'Moto taxi': '🏍️', 'Repartidor moto': '🛵', 'Flete': '🚛',
}

function formatearFecha(f) {
  if (!f) return ''
  const d = new Date(f + 'T12:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function MisPublicaciones({ onVolver, userId, trabajoIdInicial }) {
  const [trabajos, setTrabajos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [trabajoSeleccionado, setTrabajoSeleccionado] = useState(null)
  const [negociaciones, setNegociaciones] = useState([])
  const [loadingAccion, setLoadingAccion] = useState(false)
  const [exitoAccion, setExitoAccion] = useState('')
  const [calificando, setCalificando] = useState(null)
  const [chatAbierto, setChatAbierto] = useState(null)
  const [pestana, setPestana] = useState('activos')
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState({})
  const [abrirDisputa, setAbrirDisputa] = useState(null)
  const [menuAbierto, setMenuAbierto] = useState(null)
  const [reportando, setReportando] = useState(null)
  const [confirmarCancelar, setConfirmarCancelar] = useState(null) // trabajo a cancelar

  useEffect(() => { cargarMisTrabajos() }, [])

  // Abrir trabajo específico desde toast
  useEffect(() => {
    if (trabajoIdInicial && trabajos.length > 0) {
      const t = trabajos.find(t => t.id === trabajoIdInicial)
      if (t) seleccionarTrabajo(t)
    }
  }, [trabajoIdInicial, trabajos])

  useEffect(() => {
    const channel = supabase
      .channel('tracking-cliente')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trabajos' }, (payload) => {
        if (payload.new.cliente_id !== userId) return
        setTrabajos(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t))
        if (trabajoSeleccionado?.id === payload.new.id) {
          setTrabajoSeleccionado(prev => ({ ...prev, ...payload.new }))
          // No cerrar el detalle aunque cambie el status
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [trabajoSeleccionado, userId])

  useEffect(() => {
    const channel = supabase
      .channel('mensajes-cliente')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, (payload) => {
        if (payload.new.emisor_id !== userId) {
          const trabajoEsMio = trabajos.some(t => t.id === payload.new.trabajo_id)
          if (trabajoEsMio) {
            setMensajesNoLeidos(prev => ({
              ...prev,
              [payload.new.trabajo_id]: (prev[payload.new.trabajo_id] || 0) + 1
            }))
          }
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, trabajos])

  async function cargarMisTrabajos() {
    setCargando(true)
    const { data } = await supabase
      .from('trabajos').select('*').eq('cliente_id', userId)
      .order('creado_en', { ascending: false })
    if (data) { setTrabajos(data); cargarMensajesNoLeidos(data) }
    setCargando(false)
  }

  async function cargarMensajesNoLeidos(listaTrabajos) {
    if (!listaTrabajos || listaTrabajos.length === 0) return
    const ids = listaTrabajos.map(t => t.id)
    const { data } = await supabase.from('mensajes')
      .select('trabajo_id, emisor_id')
      .in('trabajo_id', ids).neq('emisor_id', userId).eq('leido', false)
    if (data) {
      const conteo = {}
      data.forEach(m => { conteo[m.trabajo_id] = (conteo[m.trabajo_id] || 0) + 1 })
      setMensajesNoLeidos(conteo)
    }
  }

  async function marcarMensajesLeidos(trabajoId) {
    await supabase.from('mensajes').update({ leido: true })
      .eq('trabajo_id', trabajoId).neq('emisor_id', userId)
    setMensajesNoLeidos(prev => ({ ...prev, [trabajoId]: 0 }))
  }

  const [datosChofer, setDatosChofer] = useState(null)

  async function cargarDatosChofer(trabajadorId) {
    if (!trabajadorId) return
    const { data } = await supabase.from('usuarios')
      .select('nombre, foto_url, vehiculo_marca, vehiculo_modelo, vehiculo_color, vehiculo_placas, vehiculo_foto_url, rating_promedio')
      .eq('id', trabajadorId).maybeSingle()
    if (data) setDatosChofer(data)
  }

  async function cargarNegociaciones(trabajoId) {
    const { data } = await supabase.from('negociaciones').select('*')
      .eq('trabajo_id', trabajoId).order('creado_en', { ascending: true })
    if (data) setNegociaciones(data)
  }

  async function seleccionarTrabajo(trabajo) {
    setExitoAccion('')
    setDatosChofer(null)
    setTrabajoSeleccionado(trabajo)
    await cargarNegociaciones(trabajo.id)
    if (trabajo.trabajador_id) await cargarDatosChofer(trabajo.trabajador_id)
  }

  async function aceptarContraoferta(trabajo) {
    setLoadingAccion(true)
    const precioFinal = trabajo.ultima_oferta || trabajo.presupuesto

    // Obtener el trabajador que hizo la contraoferta
    const { data: negs } = await supabase.from('negociaciones')
      .select('usuario_id')
      .eq('trabajo_id', trabajo.id)
      .eq('ofertado_por', 'trabajador')
      .order('creado_en', { ascending: false })
      .limit(1)

    const trabajadorId = negs?.[0]?.usuario_id || trabajo.trabajador_id

    await supabase.from('trabajos').update({
      status: 'aceptado',
      precio_acordado: precioFinal,
      ...(trabajadorId ? { trabajador_id: trabajadorId } : {})
    }).eq('id', trabajo.id)

    await enviarNotificacionCompleta({
      usuarioId: trabajadorId,
      titulo: '✅ ¡Tu contraoferta fue aceptada!',
      cuerpo: `El cliente aceptó tu precio de $${precioFinal} MXN para ${trabajo.categoria}`,
      tipo: 'trabajo_aceptado',
      trabajoId: trabajo.id,
    })

    setExitoAccion(`¡Aceptaste la contraoferta de $${precioFinal} MXN!`)
    await cargarMisTrabajos()
    setLoadingAccion(false)
  }

  async function rechazarContraoferta(trabajo) {
    setLoadingAccion(true)
    await supabase.from('trabajos').update({
      ultima_oferta: null, quien_oferto: null,
      rondas_negociacion: (trabajo.rondas_negociacion || 0) + 1,
    }).eq('id', trabajo.id)
    setExitoAccion('Contraoferta rechazada. El trabajador puede intentar de nuevo.')
    await cargarMisTrabajos()
    await cargarNegociaciones(trabajo.id)
    setTrabajoSeleccionado(prev => ({ ...prev, ultima_oferta: null, quien_oferto: null }))
    setLoadingAccion(false)
  }

  async function cancelarTrabajo(trabajo) {
    setLoadingAccion(true)
    await supabase.from('trabajos').update({ status: 'cancelado' }).eq('id', trabajo.id)

    // Si ya estaba aceptado → amonestar al cliente
    if (trabajo.status === 'aceptado') {
      const { data: usuario } = await supabase.from('usuarios').select('amonestaciones').eq('id', userId).maybeSingle()
      const nuevas = (usuario?.amonestaciones || 0) + 1
      const baneado = nuevas >= 3
      await supabase.from('usuarios').update({ amonestaciones: nuevas, ...(baneado ? { baneado: true } : {}) }).eq('id', userId)
    }

    setTrabajoSeleccionado(null)
    await cargarMisTrabajos()
    setLoadingAccion(false)
  }

  async function confirmarCompletado(trabajo) {
    setLoadingAccion(true)
    await supabase.from('trabajos').update({ status: 'completado' }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.trabajador_id,
      titulo: '💰 ¡Pago liberado!',
      cuerpo: `El cliente confirmó tu ${trabajo.categoria}. $${trabajo.precio_acordado || trabajo.presupuesto} MXN liberados.`,
      tipo: 'pago_liberado',
      trabajoId: trabajo.id,
    })
    await cargarMisTrabajos()
    setLoadingAccion(false)
    setCalificando(trabajo)
  }

  // Cliente rechaza el "terminé" — devuelve a en progreso
  async function noHaTerminado(trabajo) {
    setLoadingAccion(true)
    await supabase.from('trabajos').update({
      status: 'aceptado',
      trabajo_iniciado: true,
      en_revision_desde: null,
    }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({
      usuarioId: trabajo.trabajador_id,
      titulo: '❌ El cliente dice que no terminaste',
      cuerpo: `El cliente rechazó tu reporte de ${trabajo.categoria}. Por favor revisa y termina el trabajo.`,
      tipo: 'general',
      trabajoId: trabajo.id,
    })
    await cargarMisTrabajos()
    setLoadingAccion(false)
    setExitoAccion('Devuelto a en progreso — el trabajador fue notificado.')
  }

  async function cancelarDesdeMenu(trabajo) {
    setMenuAbierto(null)
    setLoadingAccion(true)
    await supabase.from('trabajos').update({ status: 'cancelado' }).eq('id', trabajo.id)

    // Si ya estaba aceptado → amonestar al cliente
    if (trabajo.status === 'aceptado') {
      const { data: usuario } = await supabase.from('usuarios').select('amonestaciones').eq('id', userId).maybeSingle()
      const nuevas = (usuario?.amonestaciones || 0) + 1
      const baneado = nuevas >= 3
      await supabase.from('usuarios').update({ amonestaciones: nuevas, ...(baneado ? { baneado: true } : {}) }).eq('id', userId)
    }

    await cargarMisTrabajos()
    setLoadingAccion(false)
  }

  function compartirWhatsApp(trabajo) {
    const precio = trabajo.precio_acordado || trabajo.ultima_oferta || trabajo.presupuesto
    const texto = `Necesito un ${trabajo.categoria} en Salina Cruz. Presupuesto: $${precio} MXN.\n\n${trabajo.descripcion}\n\n📲 Contáctame por Chamba: https://chamba-delta.vercel.app`
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    return `hace ${Math.floor(hrs / 24)} días`
  }

  function statusBadge(trabajo) {
    const s = trabajo.status
    if (s === 'en_disputa') return { texto: '⚠️ En disputa', bg: 'rgba(240,149,149,0.1)', color: '#F09595', border: 'rgba(240,149,149,0.3)' }
    if (s === 'publicado' && trabajo.quien_oferto === 'trabajador') return { texto: '💬 Contraoferta recibida', bg: 'rgba(186,117,23,0.15)', color: '#E8A030', border: 'rgba(186,117,23,0.4)' }
    if (s === 'publicado') return { texto: '⏳ Esperando trabajadores', bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' }
    if (s === 'aceptado' && trabajo.trabajo_iniciado) return { texto: '🔨 Trabajo en progreso', bg: 'rgba(55,138,221,0.15)', color: '#378ADD', border: 'rgba(55,138,221,0.3)' }
    if (s === 'aceptado') return { texto: '✅ Trabajo aceptado', bg: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: 'rgba(29,158,117,0.3)' }
    if (s === 'en_revision') return { texto: '🔧 Trabajador terminó — confirma tú', bg: 'rgba(55,138,221,0.15)', color: '#378ADD', border: 'rgba(55,138,221,0.4)' }
    if (s === 'completado') return { texto: '🏁 Completado', bg: 'rgba(29,158,117,0.2)', color: '#1D9E75', border: 'rgba(29,158,117,0.4)' }
    if (s === 'cancelado') return { texto: '❌ Cancelado', bg: 'rgba(240,149,149,0.1)', color: '#F09595', border: 'rgba(240,149,149,0.3)' }
    return { texto: s, bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' }
  }

  const trabajosActivos   = trabajos.filter(t => !['completado', 'cancelado', 'en_disputa'].includes(t.status))
  const trabajosHistorial = trabajos.filter(t =>  ['completado', 'cancelado'].includes(t.status))

  if (confirmarCancelar) {
    const estaAceptado = confirmarCancelar.status === 'aceptado'
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', maxWidth: '340px', width: '100%' }}>
          <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>{estaAceptado ? '⚠️' : '❌'}</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '10px' }}>
            {estaAceptado ? '¿Seguro que quieres cancelar?' : 'Cancelar publicación'}
          </h3>
          {estaAceptado ? (
            <>
              <div style={{ background: 'rgba(240,149,149,0.08)', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: '#F09595', fontWeight: '700', marginBottom: '6px' }}>🚨 Recibirás una amonestación</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
                  Este trabajo ya fue aceptado por un trabajador. Cancelarlo cuenta como una falta.
                  <strong style={{ color: '#F09595', display: 'block', marginTop: '6px' }}>3 amonestaciones = cuenta suspendida automáticamente.</strong>
                </p>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '16px', lineHeight: '1.5' }}>
                Si tienes un problema real, habla con el trabajador por chat antes de cancelar.
              </p>
            </>
          ) : (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '20px', lineHeight: '1.5' }}>
              Esta publicación aún no fue aceptada. Puedes cancelarla sin consecuencias.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button type="button" onClick={() => { const t = confirmarCancelar; setConfirmarCancelar(null); cancelarTrabajo(t) }}
              style={{ width: '100%', padding: '14px', background: estaAceptado ? 'rgba(240,149,149,0.15)' : 'rgba(240,149,149,0.1)', color: '#F09595', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              {estaAceptado ? '⚠️ Sí, cancelar y aceptar amonestación' : '❌ Sí, cancelar publicación'}
            </button>
            <button type="button" onClick={() => setConfirmarCancelar(null)}
              style={{ width: '100%', padding: '12px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              Volver — no cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (reportando) {
    return <ReportarCobro trabajo={reportando} userId={userId} rolReportador="cliente" onVolver={() => setReportando(null)} />
  }

  if (chatAbierto) {
    return <ChatTrabajo trabajo={chatAbierto} userId={userId} onVolver={() => {
      setChatAbierto(null); marcarMensajesLeidos(chatAbierto.id)
    }} />
  }

  if (abrirDisputa) {
    return (
      <Disputa trabajo={abrirDisputa} userId={userId}
        onVolver={() => setAbrirDisputa(null)}
        onDisputaAbierta={() => { setAbrirDisputa(null); setTrabajoSeleccionado(null); cargarMisTrabajos() }}
      />
    )
  }

  if (calificando) {
    return (
      <Calificacion trabajo={calificando} userId={userId} rolCalificador="cliente"
        onCompletado={() => { setCalificando(null); setTrabajoSeleccionado(null); cargarMisTrabajos() }}
      />
    )
  }

  if (trabajoSeleccionado) {
    const badge = statusBadge(trabajoSeleccionado)
    const tieneContraoferta = trabajoSeleccionado.quien_oferto === 'trabajador' && trabajoSeleccionado.ultima_oferta
    const noLeidos = mensajesNoLeidos[trabajoSeleccionado.id] || 0

    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={() => { setTrabajoSeleccionado(null); setExitoAccion('') }} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Mi publicación</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => compartirWhatsApp(trabajoSeleccionado)} style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', border: '1px solid rgba(37,211,102,0.3)', borderRadius: '10px', padding: '6px 12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              📲 WhatsApp
            </button>
            <button type="button" onClick={() => { setChatAbierto(trabajoSeleccionado); marcarMensajesLeidos(trabajoSeleccionado.id) }} style={{
              background: noLeidos > 0 ? 'rgba(240,149,149,0.15)' : 'rgba(29,158,117,0.15)',
              color: noLeidos > 0 ? '#F09595' : '#1D9E75',
              border: `1px solid ${noLeidos > 0 ? 'rgba(240,149,149,0.4)' : 'rgba(29,158,117,0.3)'}`,
              borderRadius: '10px', padding: '6px 12px', fontSize: '13px', fontWeight: '600',
              cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              💬 Chat
              {noLeidos > 0 && <span style={{ background: '#F09595', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>{noLeidos}</span>}
            </button>
          </div>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {exitoAccion && (
            <div style={{ background: 'rgba(29,158,117,0.12)', border: '0.5px solid rgba(29,158,117,0.4)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#5DCAA5', textAlign: 'center' }}>
              {exitoAccion}
            </div>
          )}

          {/* Card principal */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '44px' }}>{CATEGORIAS_ICONS[trabajoSeleccionado.categoria] || '✳️'}</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '19px', fontWeight: '700', marginBottom: '4px' }}>{trabajoSeleccionado.categoria}</h3>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>{trabajoSeleccionado.descripcion}</p>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '100px', background: badge.bg, color: badge.color, border: `0.5px solid ${badge.border}`, fontWeight: '500' }}>
                {badge.texto}
              </span>
            </div>
          </div>

          {/* Fecha */}
          {trabajoSeleccionado.fecha_cita && (
            <div style={{ background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>📅</span>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha acordada</p>
                <p style={{ fontSize: '15px', fontWeight: '600', color: '#1D9E75', textTransform: 'capitalize' }}>{formatearFecha(trabajoSeleccionado.fecha_cita)}</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>🕐 {trabajoSeleccionado.hora_cita?.slice(0, 5)} hrs</p>
              </div>
            </div>
          )}

          {/* Info del conductor — solo en viajes aceptados */}
          {trabajoSeleccionado.es_viaje && trabajoSeleccionado.trabajador_id && datosChofer && (
            <div style={{ background: 'rgba(55,138,221,0.06)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '16px', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: '#378ADD', fontWeight: '700', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🚗 Tu conductor</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                {datosChofer.foto_url ? (
                  <img src={datosChofer.foto_url} alt={datosChofer.nombre} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(55,138,221,0.4)' }} />
                ) : (
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👤</div>
                )}
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '2px' }}>{datosChofer.nombre}</p>
                  {datosChofer.rating_promedio && <p style={{ fontSize: '12px', color: '#F5A623' }}>⭐ {datosChofer.rating_promedio} · Conductor verificado</p>}
                </div>
              </div>
              {datosChofer.vehiculo_marca && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {datosChofer.vehiculo_foto_url && <img src={datosChofer.vehiculo_foto_url} alt="vehiculo" style={{ width: '60px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />}
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{datosChofer.vehiculo_marca} {datosChofer.vehiculo_modelo}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Color: {datosChofer.vehiculo_color}</p>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#378ADD', marginTop: '2px' }}>Placas: {datosChofer.vehiculo_placas}</p>
                  </div>
                </div>
              )}
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '10px', textAlign: 'center' }}>
                ⚠️ Verifica que los datos coincidan con la persona que te recoge
              </p>
            </div>
          )}

          {/* Disputa activa */}
          {trabajoSeleccionado.status === 'en_disputa' && (
            <div style={{ background: 'rgba(240,149,149,0.08)', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</p>
              <p style={{ fontSize: '15px', color: '#F09595', fontWeight: '700', marginBottom: '6px' }}>Disputa en proceso</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>El equipo de Chamba está revisando tu caso. Esto puede tomar hasta 48 horas.</p>
              <button type="button" onClick={() => { setChatAbierto(trabajoSeleccionado); marcarMensajesLeidos(trabajoSeleccionado.id) }} style={{ marginTop: '14px', width: '100%', padding: '12px', background: 'rgba(240,149,149,0.1)', color: '#F09595', border: '0.5px solid rgba(240,149,149,0.3)', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                💬 Chat con el trabajador
              </button>
            </div>
          )}

          {/* Publicado — mensajes */}
          {trabajoSeleccionado.status === 'publicado' && (
            <button type="button" onClick={() => { setChatAbierto(trabajoSeleccionado); marcarMensajesLeidos(trabajoSeleccionado.id) }} style={{
              width: '100%', padding: '13px',
              background: noLeidos > 0 ? 'rgba(240,149,149,0.08)' : 'rgba(55,138,221,0.08)',
              color: noLeidos > 0 ? '#F09595' : '#378ADD',
              border: `1px solid ${noLeidos > 0 ? 'rgba(240,149,149,0.3)' : 'rgba(55,138,221,0.3)'}`,
              borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              💬 {noLeidos > 0 ? `Ver mensajes del trabajador (${noLeidos} nuevo${noLeidos > 1 ? 's' : ''})` : 'Ver mensajes del trabajador'}
            </button>
          )}

          {/* Precios */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Tu presupuesto inicial</span>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>${trabajoSeleccionado.presupuesto} MXN</span>
            </div>
            {trabajoSeleccionado.ultima_oferta && (
              <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#E8A030' }}>Contraoferta del trabajador</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#E8A030' }}>${trabajoSeleccionado.ultima_oferta} MXN</span>
              </div>
            )}
            {trabajoSeleccionado.precio_acordado && (
              <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#1D9E75' }}>Precio acordado final</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#1D9E75' }}>${trabajoSeleccionado.precio_acordado} MXN</span>
              </div>
            )}
          </div>

          {/* Negociación */}
          {negociaciones.length > 0 && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial de negociación</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'rgba(55,138,221,0.15)', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '12px', padding: '10px 14px', maxWidth: '70%' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>Tú (oferta inicial)</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#378ADD' }}>${trabajoSeleccionado.presupuesto} MXN</p>
                  </div>
                </div>
                {negociaciones.map(n => (
                  <div key={n.id} style={{ display: 'flex', justifyContent: n.ofertado_por === 'trabajador' ? 'flex-start' : 'flex-end' }}>
                    <div style={{ background: n.ofertado_por === 'trabajador' ? 'rgba(186,117,23,0.15)' : 'rgba(55,138,221,0.15)', border: `0.5px solid ${n.ofertado_por === 'trabajador' ? 'rgba(186,117,23,0.3)' : 'rgba(55,138,221,0.3)'}`, borderRadius: '12px', padding: '10px 14px', maxWidth: '70%' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>
                        {n.ofertado_por === 'trabajador' ? 'Trabajador' : 'Tú'} · {tiempoTranscurrido(n.creado_en)}
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: n.ofertado_por === 'trabajador' ? '#E8A030' : '#378ADD' }}>${n.monto} MXN</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contraoferta */}
          {tieneContraoferta && trabajoSeleccionado.status === 'publicado' && !exitoAccion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                El trabajador pide <strong style={{ color: '#E8A030' }}>${trabajoSeleccionado.ultima_oferta} MXN</strong> — ¿qué decides?
              </p>
              <button type="button" onClick={() => aceptarContraoferta(trabajoSeleccionado)} disabled={loadingAccion} style={{ width: '100%', padding: '15px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ✅ Aceptar ${trabajoSeleccionado.ultima_oferta} MXN
              </button>
              <button type="button" onClick={() => rechazarContraoferta(trabajoSeleccionado)} disabled={loadingAccion} style={{ width: '100%', padding: '14px', background: 'transparent', color: '#E8A030', border: '1px solid rgba(186,117,23,0.4)', borderRadius: '14px', fontSize: '15px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ↩ Rechazar y pedir otro precio
              </button>
            </div>
          )}

          {/* Aceptado */}
          {trabajoSeleccionado.status === 'aceptado' && !exitoAccion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" onClick={() => { setChatAbierto(trabajoSeleccionado); marcarMensajesLeidos(trabajoSeleccionado.id) }} style={{
                width: '100%', padding: '13px',
                background: noLeidos > 0 ? 'rgba(240,149,149,0.08)' : 'rgba(29,158,117,0.1)',
                color: noLeidos > 0 ? '#F09595' : '#1D9E75',
                border: `1px solid ${noLeidos > 0 ? 'rgba(240,149,149,0.3)' : 'rgba(29,158,117,0.3)'}`,
                borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                💬 Chat con el trabajador
                {noLeidos > 0 && <span style={{ background: '#F09595', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 6px' }}>{noLeidos}</span>}
              </button>

              {/* Tracking */}
              {trabajoSeleccionado.trabajador_en_camino && !trabajoSeleccionado.trabajador_llego && (
                <div style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid #1D9E75', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75' }} />
                    <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: '600' }}>🚗 El trabajador está en camino — ubicación en tiempo real</p>
                  </div>
                  {trabajoSeleccionado.trabajador_lat && trabajoSeleccionado.trabajador_lng && (
                    <div style={{ height: '220px' }}>
                      <MapContainer center={[trabajoSeleccionado.trabajador_lat, trabajoSeleccionado.trabajador_lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[trabajoSeleccionado.trabajador_lat, trabajoSeleccionado.trabajador_lng]} icon={iconoTrabajador}><Popup>👷 Trabajador en camino</Popup></Marker>
                        {trabajoSeleccionado.lat && trabajoSeleccionado.lng && (
                          <Marker position={[trabajoSeleccionado.lat, trabajoSeleccionado.lng]} icon={iconoCliente}><Popup>🏠 Tu domicilio</Popup></Marker>
                        )}
                      </MapContainer>
                    </div>
                  )}
                </div>
              )}

              {trabajoSeleccionado.trabajador_llego && !trabajoSeleccionado.trabajo_iniciado && (
                <div style={{ background: 'rgba(29,158,117,0.12)', border: '0.5px solid rgba(29,158,117,0.4)', borderRadius: '12px', padding: '14px', textAlign: 'center', fontSize: '14px', color: '#1D9E75', fontWeight: '600' }}>
                  🏠 ¡El trabajador llegó! Esperando que inicie el trabajo...
                </div>
              )}

              {trabajoSeleccionado.trabajo_iniciado && (
                <div style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '12px', padding: '14px', textAlign: 'center', fontSize: '14px', color: '#378ADD', fontWeight: '600' }}>
                  🔨 ¡El trabajador ya comenzó! Trabajo en progreso...
                </div>
              )}

              {!trabajoSeleccionado.trabajo_iniciado && !trabajoSeleccionado.trabajador_en_camino && !trabajoSeleccionado.trabajador_llego && (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginBottom: '6px' }}>🤝 Trabajo aceptado</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                    El trabajador llegará el día acordado. Cuando empiece te avisaremos.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* En revisión */}
          {trabajoSeleccionado.status === 'en_revision' && !exitoAccion && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" onClick={() => { setChatAbierto(trabajoSeleccionado); marcarMensajesLeidos(trabajoSeleccionado.id) }} style={{
                width: '100%', padding: '13px',
                background: noLeidos > 0 ? 'rgba(240,149,149,0.08)' : 'rgba(29,158,117,0.1)',
                color: noLeidos > 0 ? '#F09595' : '#1D9E75',
                border: `1px solid ${noLeidos > 0 ? 'rgba(240,149,149,0.3)' : 'rgba(29,158,117,0.3)'}`,
                borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                💬 Chat con el trabajador
                {noLeidos > 0 && <span style={{ background: '#F09595', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 6px' }}>{noLeidos}</span>}
              </button>

              <div style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.4)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '32px', marginBottom: '10px' }}>🔧</p>
                <p style={{ fontSize: '15px', color: '#378ADD', fontWeight: '700', marginBottom: '6px' }}>¡El trabajador dice que terminó!</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
                  ¿Quedó bien? Confirma para liberar{' '}
                  <strong style={{ color: '#1D9E75' }}>${trabajoSeleccionado.precio_acordado || trabajoSeleccionado.presupuesto} MXN</strong>.
                </p>
                <button type="button" onClick={() => confirmarCompletado(trabajoSeleccionado)} disabled={loadingAccion}
                  style={{ width: '100%', padding: '14px', background: loadingAccion ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: loadingAccion ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif', marginBottom: '8px' }}>
                  {loadingAccion ? 'Procesando...' : '🏁 Confirmar y liberar pago'}
                </button>

                {/* NUEVO — No ha terminado */}
                <button type="button" onClick={() => noHaTerminado(trabajoSeleccionado)} disabled={loadingAccion}
                  style={{ width: '100%', padding: '12px', background: 'rgba(232,160,48,0.1)', color: '#E8A030', border: '1px solid rgba(232,160,48,0.3)', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: loadingAccion ? 'not-allowed' : 'pointer', fontFamily: 'sans-serif' }}>
                  ❌ No ha terminado — devolver al trabajador
                </button>
              </div>

              <button type="button" onClick={() => setAbrirDisputa(trabajoSeleccionado)} style={{ width: '100%', padding: '13px', background: 'transparent', color: 'rgba(240,149,149,0.6)', border: '0.5px solid rgba(240,149,149,0.2)', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ⚠️ Hay un problema grave — abrir disputa
              </button>
            </div>
          )}

          {['completado', 'cancelado'].includes(trabajoSeleccionado.status) && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              {trabajoSeleccionado.status === 'completado'
                ? `🏁 Trabajo completado · $${trabajoSeleccionado.precio_acordado || trabajoSeleccionado.presupuesto} MXN`
                : '❌ Trabajo cancelado'}
            </div>
          )}

          {trabajoSeleccionado.status === 'publicado' && !exitoAccion && (
            <button type="button" onClick={() => setConfirmarCancelar(trabajoSeleccionado)} disabled={loadingAccion} style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(240,149,149,0.6)', border: '0.5px solid rgba(240,149,149,0.2)', borderRadius: '14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              ❌ Cancelar publicación
            </button>
          )}

          {/* Botón "Ya subí" para viajes */}
          {trabajoSeleccionado.es_viaje && trabajoSeleccionado.trabajador_llego && !trabajoSeleccionado.pasajero_subio && trabajoSeleccionado.status === 'aceptado' && (
            <div style={{ background: 'rgba(55,138,221,0.1)', border: '1px solid rgba(55,138,221,0.4)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '28px', marginBottom: '8px' }}>🚗</p>
              <p style={{ fontSize: '15px', fontWeight: '700', color: '#378ADD', marginBottom: '6px' }}>¡Tu conductor llegó!</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '14px', lineHeight: '1.5' }}>
                Cuando subas al vehículo, toca el botón para que el chofer pueda iniciar el viaje.
              </p>
              <button type="button" onClick={async () => {
                setLoadingAccion(true)
                await supabase.from('trabajos').update({ pasajero_subio: true }).eq('id', trabajoSeleccionado.id)
                await enviarNotificacionCompleta({
                  usuarioId: trabajoSeleccionado.trabajador_id,
                  titulo: '✅ ¡El pasajero subió!',
                  cuerpo: 'Ya puedes iniciar el viaje.',
                  tipo: 'general',
                  trabajoId: trabajoSeleccionado.id,
                })
                await cargarMisTrabajos()
                setLoadingAccion(false)
              }} disabled={loadingAccion}
                style={{ width: '100%', padding: '14px', background: loadingAccion ? 'rgba(55,138,221,0.5)' : '#378ADD', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                {loadingAccion ? 'Confirmando...' : '🙋 Ya subí — iniciar viaje'}
              </button>
            </div>
          )}

          {/* Reporte cobro fuera de app */}
          {['aceptado', 'en_revision'].includes(trabajoSeleccionado.status) && (
            <button type="button" onClick={() => setReportando(trabajoSeleccionado)} style={{ width: '100%', padding: '11px', background: 'transparent', color: 'rgba(240,149,149,0.5)', border: '0.5px solid rgba(240,149,149,0.15)', borderRadius: '12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              🚨 El trabajador me pidió pagar fuera de la app
            </button>
          )}

        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Mis publicaciones</h2>
      </div>

      <div style={{ display: 'flex', gap: '4px', padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        {[['activos', '📋 Activos', trabajosActivos.length], ['historial', '🏁 Historial', trabajosHistorial.length]].map(([key, label, count]) => (
          <button key={key} type="button" onClick={() => setPestana(key)} style={{
            flex: 1, padding: '9px', border: 'none', borderRadius: '10px',
            background: pestana === key ? '#1D9E75' : 'rgba(255,255,255,0.06)',
            color: pestana === key ? 'white' : 'rgba(255,255,255,0.5)',
            fontSize: '13px', fontWeight: pestana === key ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif'
          }}>
            {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cargando && <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>Cargando tus publicaciones...</div>}

        {!cargando && pestana === 'activos' && trabajosActivos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p>No tienes publicaciones activas.</p>
          </div>
        )}

        {!cargando && pestana === 'historial' && trabajosHistorial.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏁</div>
            <p>Aún no tienes trabajos completados.</p>
          </div>
        )}

        {(pestana === 'activos' ? trabajosActivos : trabajosHistorial).map(trabajo => {
          const badge = statusBadge(trabajo)
          const noLeidos = mensajesNoLeidos[trabajo.id] || 0
          return (
            <div key={trabajo.id} style={{ position: 'relative' }}>
            {/* Menú ··· */}
            {menuAbierto === trabajo.id && (
              <div onClick={() => setMenuAbierto(null)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
            )}
            {menuAbierto === trabajo.id && (
              <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '6px', zIndex: 200, minWidth: '180px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                <button type="button" onClick={() => { setMenuAbierto(null); setConfirmarCancelar(trabajo) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', color: '#F09595', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ❌ Cancelar trabajo
                </button>
                <button type="button" onClick={() => { setMenuAbierto(null); compartirWhatsApp(trabajo) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', color: '#25D366', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📲 Compartir por WhatsApp
                </button>
              </div>
            )}
            <button key={trabajo.id} type="button" onClick={() => seleccionarTrabajo(trabajo)} style={{
              background: trabajo.status === 'en_disputa' ? 'rgba(240,149,149,0.08)'
                : trabajo.status === 'en_revision' ? 'rgba(55,138,221,0.08)'
                : trabajo.quien_oferto === 'trabajador' && trabajo.status === 'publicado' ? 'rgba(186,117,23,0.08)'
                : noLeidos > 0 ? 'rgba(240,149,149,0.05)' : 'rgba(255,255,255,0.04)',
              border: trabajo.status === 'en_disputa' ? '1px solid rgba(240,149,149,0.4)'
                : trabajo.status === 'en_revision' ? '1px solid rgba(55,138,221,0.4)'
                : trabajo.quien_oferto === 'trabajador' && trabajo.status === 'publicado' ? '1px solid rgba(186,117,23,0.4)'
                : noLeidos > 0 ? '1px solid rgba(240,149,149,0.3)' : '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '16px 18px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', width: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '36px' }}>{CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{trabajo.categoria}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {noLeidos > 0 && <span style={{ background: '#F09595', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 7px' }}>{noLeidos}</span>}
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75' }}>${trabajo.precio_acordado || trabajo.ultima_oferta || trabajo.presupuesto}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setMenuAbierto(menuAbierto === trabajo.id ? null : trabajo.id) }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '16px', cursor: 'pointer', padding: '2px 6px', lineHeight: 1 }}>
                        ···
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>{trabajo.descripcion}</p>
                  {trabajo.fecha_cita && <p style={{ fontSize: '11px', color: '#1D9E75', marginBottom: '4px', fontWeight: '500' }}>📅 {trabajo.fecha_cita} · 🕐 {trabajo.hora_cita?.slice(0, 5)} hrs</p>}
                  {trabajo.trabajador_en_camino && !trabajo.trabajador_llego && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(29,158,117,0.2)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.4)', fontWeight: '600', marginBottom: '4px', display: 'inline-block' }}>🚗 Trabajador en camino</span>
                  )}
                  {trabajo.trabajador_llego && trabajo.status === 'aceptado' && !trabajo.trabajo_iniciado && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(29,158,117,0.2)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.4)', fontWeight: '600', marginBottom: '4px', display: 'inline-block' }}>🏠 Trabajador llegó</span>
                  )}
                  {trabajo.trabajo_iniciado && trabajo.status === 'aceptado' && (
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: 'rgba(55,138,221,0.2)', color: '#378ADD', border: '0.5px solid rgba(55,138,221,0.4)', fontWeight: '600', marginBottom: '4px', display: 'inline-block' }}>🔨 En progreso</span>
                  )}
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: badge.bg, color: badge.color, border: `0.5px solid ${badge.border}`, fontWeight: '500', display: 'inline-block' }}>
                    {badge.texto}
                  </span>
                </div>
              </div>
            </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
