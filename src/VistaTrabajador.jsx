import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import NegociacionTrabajo from './NegociacionTrabajo'
import TrackingTrabajador from './TrackingTrabajador'
import Calificacion from './Calificacion'
import PerfilPublico from './PerfilPublico'
import ChatTrabajo from './ChatTrabajo'
import { enviarNotificacionCompleta } from './guardarNotificacion'

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

export default function VistaTrabajador({ onLogout, userEmail, userId, onCambiarModo, noLeidas = 0, onNotificaciones }) {
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
  const [tracking, setTracking] = useState(null)
  const [calificando, setCalificando] = useState(null)
  const [verPerfilCliente, setVerPerfilCliente] = useState(null)
  const [chatAbierto, setChatAbierto] = useState(null)
  const [mensajeNoPuedoLlegar, setMensajeNoPuedoLlegar] = useState(null)
  const [modalOpciones, setModalOpciones] = useState(false)

  useEffect(() => {
    cargarPerfilUsuario()
    cargarMisTrabajos()
    cargarHistorial()
  }, [])

  async function cargarPerfilUsuario() {
    const { data } = await supabase
      .from('usuarios')
      .select('categorias_servicio, radio_alertas, lat, lng')
      .eq('id', userId)
      .maybeSingle()
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
    const { data } = await supabase.from('trabajos').select('*')
      .in('status', ['aceptado', 'en_revision']).eq('trabajador_id', userId)
      .order('creado_en', { ascending: false })
    if (data) setMisTrabajos(data)
  }

  async function cargarHistorial() {
    const { data } = await supabase.from('trabajos').select('*')
      .in('status', ['completado', 'cancelado']).eq('trabajador_id', userId)
      .order('creado_en', { ascending: false })
    if (data) setHistorial(data)
  }

  async function marcarCompletado(trabajo) {
    setLoadingCompletar(trabajo.id)
    await supabase.from('trabajos').update({ status: 'en_revision' }).eq('id', trabajo.id)
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
    setCalificando(trabajo)
  }

  async function noPuedoLlegar(trabajo) {
    await supabase.from('mensajes').insert({
      trabajo_id: trabajo.id, emisor_id: userId,
      contenido: '⚠️ Hola, no puedo llegar exactamente al punto marcado en el mapa. ¿Podemos acordar un punto de encuentro cercano?',
    })
    setMensajeNoPuedoLlegar(null)
    setChatAbierto(trabajo)
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    return `hace ${Math.floor(hrs / 24)} días`
  }

  const esViaje = (trabajo) => trabajo.es_viaje || CATEGORIAS_VIAJE.includes(trabajo.categoria)

  // Botones del header reutilizables
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
          <span style={{
            position: 'absolute', top: '-3px', right: '-3px',
            background: '#F09595', color: 'white',
            borderRadius: '100px', fontSize: '10px', fontWeight: '700',
            padding: '1px 5px', minWidth: '16px', textAlign: 'center'
          }}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>
      <button type="button" onClick={() => setModalOpciones(true)} style={{
        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)',
        border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '8px',
        padding: '6px 12px', fontSize: '12px', cursor: 'pointer',
        fontFamily: 'sans-serif', fontWeight: '500'
      }}>
        ⚙️ Opciones
      </button>
    </div>
  )

  const ModalOpciones = () => (
    <div onClick={() => setModalOpciones(false)} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1A1A1A', borderRadius: '20px 20px 0 0',
        padding: '24px', width: '100%', maxWidth: '480px',
        border: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 20px' }} />
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Opciones</p>
        <button type="button" onClick={() => { setModalOpciones(false); onCambiarModo() }} style={{
          width: '100%', padding: '16px', marginBottom: '10px',
          background: 'rgba(55,138,221,0.1)', color: '#378ADD',
          border: '1px solid rgba(55,138,221,0.3)', borderRadius: '14px',
          fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
        }}>
          🗺️ Cambiar a modo cliente
        </button>
        <button type="button" onClick={() => { setModalOpciones(false); onLogout() }} style={{
          width: '100%', padding: '14px', background: 'transparent',
          color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)',
          borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif'
        }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  if (chatAbierto) return <ChatTrabajo trabajo={chatAbierto} userId={userId} onVolver={() => setChatAbierto(null)} />
  if (verPerfilCliente) return <PerfilPublico usuarioId={verPerfilCliente} rolVisto="cliente" onVolver={() => setVerPerfilCliente(null)} />

  if (calificando) {
    return (
      <Calificacion trabajo={calificando} userId={userId} rolCalificador="trabajador"
        onCompletado={() => { setCalificando(null); cargarMisTrabajos(); cargarHistorial() }}
      />
    )
  }

  if (tracking) {
    return <TrackingTrabajador trabajo={tracking} onVolver={() => { setTracking(null); cargarMisTrabajos() }} />
  }

  if (negociando) {
    return (
      <NegociacionTrabajo trabajo={negociando} userId={userId} onVolver={() => setNegociando(null)}
        onAceptado={() => {
          setNegociando(null); setTrabajoSeleccionado(null)
          cargarTrabajos(perfilUsuario); cargarMisTrabajos(); setPestana('mis')
        }}
      />
    )
  }

  if (mensajeNoPuedoLlegar) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', maxWidth: '340px', width: '100%' }}>
          <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '12px' }}>¿No puedes llegar al punto?</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.6', marginBottom: '20px' }}>
            Se enviará este mensaje al cliente automáticamente y se abrirá el chat para coordinar:
          </p>
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
                </div>
                {esViaje(trabajoSeleccionado) && trabajoSeleccionado.origen_lat && (
                  <>
                    <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px' }}>📍</span>
                      <div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>ORIGEN</p>
                        <p style={{ fontSize: '13px', color: 'white' }}>{trabajoSeleccionado.origen_lat.toFixed(4)}, {trabajoSeleccionado.origen_lng.toFixed(4)}</p>
                      </div>
                    </div>
                    <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px' }}>🏁</span>
                      <div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>DESTINO</p>
                        <p style={{ fontSize: '13px', color: 'white' }}>{trabajoSeleccionado.destino_lat.toFixed(4)}, {trabajoSeleccionado.destino_lng.toFixed(4)}</p>
                      </div>
                    </div>
                    <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>DISTANCIA</p>
                      <p style={{ fontSize: '14px', color: 'white' }}>{trabajoSeleccionado.distancia_km?.toFixed(1)} km</p>
                    </div>
                  </>
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
              {trabajoSeleccionado.cliente_id && (
                <button type="button" onClick={() => setVerPerfilCliente(trabajoSeleccionado.cliente_id)} style={{ width: '100%', padding: '13px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  👤 Ver perfil del cliente
                </button>
              )}
              <button type="button" onClick={() => setChatAbierto(trabajoSeleccionado)} style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                ❓ Pedir más detalles al cliente
              </button>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
                🔒 Al aceptar, el pago queda protegido en escrow.
              </div>
              <button type="button" onClick={() => setNegociando(trabajoSeleccionado)} style={{ width: '100%', padding: '16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                💰 Ver y negociar precio
              </button>
              <button type="button" onClick={() => setTrabajoSeleccionado(null)} style={{ width: '100%', padding: '14px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '14px', fontSize: '15px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div>
          <h1 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '800' }}>chamba</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            {pestana === 'disponibles' ? 'Modo trabajador' : pestana === 'mis' ? 'Mis trabajos activos' : 'Historial'}
          </p>
        </div>
        <HeaderBotones />
      </div>

      <div style={{ display: 'flex', gap: '6px', padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        {[
          ['disponibles', '🔍', 'Disponibles', trabajos.length],
          ['mis', '✅', 'Activos', misTrabajos.length],
          ['historial', '🏁', 'Historial', historial.length],
        ].map(([key, icon, label, count]) => (
          <button key={key} type="button" onClick={() => setPestana(key)} style={{ flex: 1, padding: '9px 4px', border: 'none', borderRadius: '10px', background: pestana === key ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: pestana === key ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: pestana === key ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {icon} {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {pestana === 'disponibles' && (
          <>
            {perfilUsuario && (!perfilUsuario.categorias_servicio || perfilUsuario.categorias_servicio.length === 0) && (
              <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#E8A030', textAlign: 'center' }}>
                ⚠️ Configura tus servicios en tu perfil para ver solo los trabajos de tu especialidad.
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
              <button key={trabajo.id} type="button" onClick={() => setTrabajoSeleccionado(trabajo)} style={{ background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${esViaje(trabajo) ? 'rgba(55,138,221,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '16px 18px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '36px' }}>{CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{trabajo.categoria}</span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75' }}>${trabajo.ultima_oferta || trabajo.presupuesto}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trabajo.descripcion}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>🕐 {tiempoTranscurrido(trabajo.creado_en)}</p>
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
              <div key={trabajo.id} style={{ background: trabajo.status === 'en_revision' ? 'rgba(232,160,48,0.08)' : 'rgba(29,158,117,0.06)', border: `0.5px solid ${trabajo.status === 'en_revision' ? 'rgba(232,160,48,0.3)' : 'rgba(29,158,117,0.2)'}`, borderRadius: '16px', padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '36px' }}>{CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{trabajo.categoria}</span>
                      <span style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75' }}>${trabajo.precio_acordado || trabajo.presupuesto}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trabajo.descripcion}</p>
                    {esViaje(trabajo) && trabajo.origen_lat && (
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        <span>📍 Origen</span><span>→</span><span>🏁 Destino</span><span>· {trabajo.distancia_km?.toFixed(1)} km</span>
                      </div>
                    )}
                    {trabajo.fecha_cita && (
                      <p style={{ fontSize: '11px', color: '#1D9E75', marginTop: '4px' }}>📅 {trabajo.fecha_cita} a las {trabajo.hora_cita?.slice(0, 5)} hrs</p>
                    )}
                    <div style={{ marginTop: '6px' }}>
                      {trabajo.status === 'en_revision'
                        ? <span style={{ fontSize: '11px', color: '#E8A030', fontWeight: '500' }}>⏳ Esperando confirmación del cliente</span>
                        : <span style={{ fontSize: '11px', color: '#1D9E75', fontWeight: '500' }}>✅ Aceptado · Pago en escrow</span>
                      }
                    </div>
                  </div>
                </div>

                <button type="button" onClick={() => setChatAbierto(trabajo)} style={{ width: '100%', padding: '8px', marginBottom: '8px', background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  💬 Chat con el cliente
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
                {trabajo.status === 'aceptado' && trabajo.fecha_cita && !trabajo.trabajador_en_camino && !trabajo.trabajador_llego && (
                  <button type="button" onClick={() => setTracking(trabajo)} style={{ width: '100%', padding: '10px', background: 'rgba(55,138,221,0.2)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.4)', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '8px' }}>
                    🚗 Ir al trabajo — compartir ubicación
                  </button>
                )}
                {trabajo.trabajador_en_camino && !trabajo.trabajador_llego && (
                  <button type="button" onClick={() => setTracking(trabajo)} style={{ width: '100%', padding: '10px', background: 'rgba(29,158,117,0.2)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '8px' }}>
                    🟢 En camino — ver mapa
                  </button>
                )}
                {trabajo.status === 'aceptado' && trabajo.trabajador_llego && (
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
                  <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
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
                      <span style={{ fontSize: '15px', fontWeight: '700', color: trabajo.status === 'completado' ? '#1D9E75' : '#F09595' }}>
                        ${trabajo.precio_acordado || trabajo.presupuesto}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{trabajo.descripcion}</p>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', display: 'inline-block', background: trabajo.status === 'completado' ? 'rgba(29,158,117,0.2)' : 'rgba(240,149,149,0.1)', color: trabajo.status === 'completado' ? '#1D9E75' : '#F09595', border: `0.5px solid ${trabajo.status === 'completado' ? 'rgba(29,158,117,0.4)' : 'rgba(240,149,149,0.3)'}`, fontWeight: '500' }}>
                      {trabajo.status === 'completado' ? '🏁 Completado' : '❌ Cancelado'}
                    </span>
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
