import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import MapaChamba from './MapaChamba'
import VistaTrabajador from './VistaTrabajador'
import SplashScreen from './SplashScreen'
import Privacidad from './Privacidad'
import Notificaciones from './Notificaciones'
import PerfilTrabajador from './PerfilTrabajador'
import PerfilCliente from './PerfilCliente'
import { solicitarPermiso, escucharNotificaciones } from './useNotificaciones'

function Toast({ toast, onClick }) {
  if (!toast) return null
  const iconos = {
    'trabajo_aceptado': '✅', 'trabajo_completado': '🔧', 'pago_liberado': '💰',
    'contraoferta': '💬', 'disputa': '⚠️', 'calificacion': '⭐',
    'mensaje': '💬', 'llegada': '🏠', 'en_camino': '🚗',
    'recordatorio': '📅', 'general': '🔔',
  }
  const icono = iconos[toast.tipo] || '🔔'
  return (
    <div onClick={onClick} style={{
      position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
      background: '#1A1A1A', border: '1px solid rgba(29,158,117,0.4)',
      borderRadius: '16px', padding: '12px 16px',
      zIndex: 99999, maxWidth: '340px', width: 'calc(100% - 32px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      cursor: 'pointer', fontFamily: 'sans-serif',
      display: 'flex', alignItems: 'center', gap: '12px',
      animation: 'slideDown 0.3s ease',
    }}>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{icono}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '2px', lineHeight: '1.3' }}>{toast.titulo}</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toast.cuerpo}</p>
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(29,158,117,0.7)', flexShrink: 0 }}>Ver →</div>
    </div>
  )
}

// ── Onboarding ──
function Onboarding({ userId, userEmail, onCompletado }) {
  const [paso, setPaso] = useState(1) // 1=bienvenida, 2=nombre, 3=rol
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  async function guardarNombreYRol(rol) {
    if (!nombre.trim()) { setError('Escribe tu nombre'); return }
    setGuardando(true)
    await supabase.from('usuarios').upsert({
      id: userId, email: userEmail, nombre: nombre.trim()
    })
    setGuardando(false)
    onCompletado(rol, nombre.trim())
  }

  if (paso === 1) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: '24px' }}>👋</div>
        <h1 style={{ color: '#1D9E75', fontSize: '36px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-1px' }}>Bienvenido a Chamba</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '8px', maxWidth: '300px', lineHeight: '1.6' }}>
          La plataforma de servicios locales de Salina Cruz, Oaxaca.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '48px' }}>
          En 2 pasos estarás listo para empezar
        </p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '40px' }}>
          {['⚡ Electricistas', '🔧 Plomeros', '🚕 Taxis', '🍳 Cocineras'].map(s => (
            <span key={s} style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '100px', background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.3)' }}>{s}</span>
          ))}
        </div>
        <button type="button" onClick={() => setPaso(2)} style={{ width: '100%', maxWidth: '320px', padding: '16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Comenzar →
        </button>
      </div>
    )
  }

  if (paso === 2) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        {/* Indicador de pasos */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
          {[1, 2].map(n => (
            <div key={n} style={{ width: n === 1 ? '24px' : '8px', height: '8px', borderRadius: '4px', background: n === 1 ? '#1D9E75' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <div style={{ width: '100%', maxWidth: '340px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>¿Cómo te llamas?</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '28px' }}>
            Los clientes y trabajadores verán tu nombre en la app.
          </p>
          <input
            type="text" placeholder="Tu nombre completo"
            value={nombre} onChange={e => { setNombre(e.target.value); setError('') }}
            autoFocus
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${error ? '#F09595' : nombre ? '#1D9E75' : 'rgba(255,255,255,0.15)'}`, borderRadius: '14px', padding: '16px 18px', color: 'white', fontSize: '16px', fontFamily: 'sans-serif', outline: 'none', marginBottom: '8px' }}
          />
          {error && <p style={{ color: '#F09595', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
          <button type="button" onClick={() => {
            if (!nombre.trim()) { setError('Escribe tu nombre'); return }
            setPaso(3)
          }} style={{ width: '100%', padding: '16px', background: nombre.trim() ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: nombre.trim() ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: nombre.trim() ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif', marginTop: '8px' }}>
            Continuar →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      {/* Indicador de pasos */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        {[1, 2].map(n => (
          <div key={n} style={{ width: n === 2 ? '24px' : '8px', height: '8px', borderRadius: '4px', background: n === 2 ? '#1D9E75' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s' }} />
        ))}
      </div>
      <div style={{ width: '100%', maxWidth: '340px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Hola, {nombre.split(' ')[0]} 👋</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '28px' }}>¿Qué quieres hacer en Chamba?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button type="button" onClick={() => guardarNombreYRol('cliente')} disabled={guardando} style={{
            background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)',
            borderRadius: '18px', padding: '24px', cursor: 'pointer', fontFamily: 'sans-serif',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0, background: 'rgba(29,158,117,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🛍️</div>
            <div>
              <p style={{ fontSize: '17px', fontWeight: '700', color: '#1D9E75', marginBottom: '4px' }}>Contratar servicios</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>Busco electricistas, plomeros, taxis y más</p>
            </div>
          </button>
          <button type="button" onClick={() => guardarNombreYRol('trabajador')} disabled={guardando} style={{
            background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)',
            borderRadius: '18px', padding: '24px', cursor: 'pointer', fontFamily: 'sans-serif',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0, background: 'rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔧</div>
            <div>
              <p style={{ fontSize: '17px', fontWeight: '700', color: '#378ADD', marginBottom: '4px' }}>Ofrecer mis servicios</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>Quiero trabajar y ganar dinero con mi oficio</p>
            </div>
          </button>
          <button type="button" onClick={() => guardarNombreYRol('ambos')} disabled={guardando} style={{
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '18px', padding: '20px', cursor: 'pointer', fontFamily: 'sans-serif',
            textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔄</div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>Ambas cosas</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.4' }}>Puedo contratar y también ofrecer mis servicios</p>
            </div>
          </button>
        </div>
        {guardando && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '16px' }}>Configurando tu cuenta...</p>}
      </div>
    </div>
  )
}

function SeleccionModo({ onCliente, onTrabajador, onLogout, nombre, noLeidas, onNotificaciones }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '16px', right: '20px' }}>
        <button type="button" onClick={onNotificaciones} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', fontSize: '18px' }}>
          🔔
          {noLeidas > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#F09595', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>{noLeidas > 99 ? '99+' : noLeidas}</span>}
        </button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#1D9E75', fontSize: '40px', fontWeight: '800', marginBottom: '4px', letterSpacing: '-1px' }}>chamba</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Salina Cruz, Oaxaca</p>
        {nombre && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', marginTop: '12px', fontWeight: '500' }}>Hola, {nombre.split(' ')[0]} 👋</p>}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginBottom: '24px', textAlign: 'center' }}>¿Qué deseas hacer hoy?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '360px' }}>
        <button type="button" onClick={onCliente} style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '20px', padding: '28px 24px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', flexShrink: 0, background: 'rgba(29,158,117,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🛍️</div>
          <div>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75', marginBottom: '6px' }}>Solicitar un servicio</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>Busca y contrata trabajadores cerca de ti</p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
              {['⚡', '🔧', '🍳', '🧹', '🚕', '🛵'].map(e => <span key={e} style={{ fontSize: '16px' }}>{e}</span>)}
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>+26 más</span>
            </div>
          </div>
        </button>
        <button type="button" onClick={onTrabajador} style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '20px', padding: '28px 24px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', flexShrink: 0, background: 'rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🔧</div>
          <div>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#378ADD', marginBottom: '6px' }}>Quiero trabajar</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>Ve los trabajos disponibles y acepta los que te convengan</p>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              {['💰', '📍', '⭐'].map(e => <span key={e} style={{ fontSize: '16px' }}>{e}</span>)}
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>Pago seguro con escrow</span>
            </div>
          </div>
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '360px', margin: '24px 0 16px' }}>
        <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
        <span style={{ color: 'rgba(255,255,255,0.08)', letterSpacing: '4px', fontSize: '10px' }}>∴</span>
        <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <button type="button" onClick={onLogout} style={{ background: 'transparent', color: 'rgba(255,255,255,0.25)', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>Cerrar sesión</button>
    </div>
  )
}

function AppContenido() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [modo, setModo] = useState(null)
  const [mostrarSplash, setMostrarSplash] = useState(true)
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [noLeidas, setNoLeidas] = useState(0)
  const [verNotificaciones, setVerNotificaciones] = useState(false)
  const [toastActivo, setToastActivo] = useState(null)
  const [esNuevo, setEsNuevo] = useState(false) // onboarding
  const [onboardingCompletado, setOnboardingCompletado] = useState(false)
  const [navegarAMisPublicaciones, setNavegarAMisPublicaciones] = useState(false)
  const [navegarAActivos, setNavegarAActivos] = useState(false)
  const [trabajoIdInicial, setTrabajoIdInicial] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session) })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) { setModo(null); setEsNuevo(false) }
    })
  }, [])

  useEffect(() => {
    if (session) {
      supabase.from('usuarios').select('nombre').eq('id', session.user.id).maybeSingle()
        .then(({ data }) => {
          if (data?.nombre) {
            setNombreUsuario(data.nombre)
            setEsNuevo(false)
          } else {
            setEsNuevo(true) // No tiene nombre → es nuevo
          }
        })
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    cargarNoLeidas()
    const channel = supabase.channel('notificaciones-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${session.user.id}` }, (payload) => {
        cargarNoLeidas()
        if (payload.new) mostrarToast({ titulo: payload.new.titulo, cuerpo: payload.new.cuerpo, tipo: payload.new.tipo, trabajoId: payload.new.trabajo_id })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  async function cargarNoLeidas() {
    if (!session) return
    const { count } = await supabase.from('notificaciones').select('*', { count: 'exact', head: true }).eq('usuario_id', session.user.id).eq('leida', false)
    setNoLeidas(count || 0)
  }

  useEffect(() => {
    if (session) {
      solicitarPermiso().then(async token => { if (token) await supabase.from('usuarios').update({ fcm_token: token }).eq('id', session.user.id) })
      const unsubscribe = escucharNotificaciones((payload) => {
        cargarNoLeidas()
        mostrarToast({ titulo: payload.notification?.title || '', cuerpo: payload.notification?.body || '', tipo: payload.data?.tipo || 'general', trabajoId: payload.data?.trabajo_id || null })
      })
      return () => unsubscribe()
    }
  }, [session])

  function mostrarToast(datos) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastActivo(datos)
    toastTimer.current = setTimeout(() => setToastActivo(null), 5000)
  }

  function alTocarToast() {
    const toast = toastActivo
    setToastActivo(null)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    if (!toast) return
    const tiposCliente = ['trabajo_completado', 'llegada', 'en_camino', 'recordatorio', 'contraoferta', 'disputa', 'general']
    const tiposTrabajador = ['pago_liberado', 'trabajo_aceptado']
    if (tiposCliente.includes(toast.tipo)) { setModo('cliente'); setNavegarAMisPublicaciones(true); if (toast.trabajoId) setTrabajoIdInicial(toast.trabajoId) }
    else if (tiposTrabajador.includes(toast.tipo)) { setModo('trabajador'); setNavegarAActivos(true); if (toast.trabajoId) setTrabajoIdInicial(toast.trabajoId) }
    else setVerNotificaciones(true)
  }

  function onboardingTerminado(rol, nombre) {
    setNombreUsuario(nombre)
    setEsNuevo(false)
    setOnboardingCompletado(true)
    // Llevar al modo correcto según su elección
    if (rol === 'trabajador') setModo('trabajador')
    else setModo('cliente')
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setModo(null); setNombreUsuario(''); setNoLeidas(0); setEsNuevo(false)
    setNavegarAMisPublicaciones(false); setNavegarAActivos(false); setTrabajoIdInicial(null)
  }

  if (mostrarSplash) return <SplashScreen onTerminado={() => setMostrarSplash(false)} />

  if (session) {
    // Onboarding para usuarios nuevos
    if (esNuevo) {
      return <Onboarding userId={session.user.id} userEmail={session.user.email} onCompletado={onboardingTerminado} />
    }

    if (verNotificaciones) {
      return <Notificaciones
        userId={session.user.id}
        onVolver={() => { setVerNotificaciones(false); cargarNoLeidas() }}
        onIrATrabajo={(trabajoId, tipo) => {
          setVerNotificaciones(false); cargarNoLeidas()
          const tiposCliente = ['trabajo_completado', 'llegada', 'en_camino', 'recordatorio', 'contraoferta', 'disputa', 'general']
          const tiposTrabajador = ['pago_liberado', 'trabajo_aceptado']
          setTrabajoIdInicial(trabajoId)
          if (tiposCliente.includes(tipo)) { setModo('cliente'); setNavegarAMisPublicaciones(true) }
          else if (tiposTrabajador.includes(tipo)) { setModo('trabajador'); setNavegarAActivos(true) }
        }}
      />
    }

    if (!modo) {
      return (
        <>
          <Toast toast={toastActivo} onClick={alTocarToast} />
          <SeleccionModo nombre={nombreUsuario} noLeidas={noLeidas}
            onCliente={() => setModo('cliente')} onTrabajador={() => setModo('trabajador')}
            onLogout={handleLogout} onNotificaciones={() => setVerNotificaciones(true)}
          />
        </>
      )
    }

    if (modo === 'trabajador') {
      return (
        <>
          <Toast toast={toastActivo} onClick={alTocarToast} />
          <VistaTrabajador
            onLogout={handleLogout} userId={session.user.id} userEmail={session.user.email}
            onCambiarModo={() => setModo(null)} noLeidas={noLeidas}
            onNotificaciones={() => setVerNotificaciones(true)}
            irAActivos={navegarAActivos} trabajoIdInicial={trabajoIdInicial}
            onNavegacionCompletada={() => { setNavegarAActivos(false); setTrabajoIdInicial(null) }}
            // Si viene del onboarding como trabajador → abrir perfil directo
            irAPerfil={onboardingCompletado && modo === 'trabajador'}
            onPerfilAbierto={() => setOnboardingCompletado(false)}
          />
        </>
      )
    }

    return (
      <>
        <Toast toast={toastActivo} onClick={alTocarToast} />
        <MapaChamba
          onLogout={handleLogout} userId={session.user.id} userEmail={session.user.email}
          onCambiarModo={() => setModo(null)} noLeidas={noLeidas}
          onNotificaciones={() => setVerNotificaciones(true)}
          irAMisPublicaciones={navegarAMisPublicaciones} trabajoIdInicial={trabajoIdInicial}
          onNavegacionCompletada={() => { setNavegarAMisPublicaciones(false); setTrabajoIdInicial(null) }}
        />
      </>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px' }}>
      <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px 32px', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ color: '#1D9E75', fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>chamba</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px' }}>Salina Cruz, Oaxaca</p>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input id="email" name="email" type="email" placeholder="Tu correo" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }} />
          <input id="password" name="password" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }} />
          {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginTop: '4px' }}>{loading ? 'Cargando...' : 'Entrar'}</button>
          <button type="button" onClick={handleRegister} disabled={loading} style={{ background: 'transparent', color: '#1D9E75', border: '1px solid #1D9E75', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>Crear cuenta</button>
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <a href="/privacidad" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textDecoration: 'none' }}>Política de privacidad</a>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/*" element={<AppContenido />} />
      </Routes>
    </BrowserRouter>
  )
}
