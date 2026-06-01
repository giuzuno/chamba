import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import MapaChamba from './MapaChamba'
import VistaTrabajador from './VistaTrabajador'
import SplashScreen from './SplashScreen'
import Privacidad from './Privacidad'
import Notificaciones from './Notificaciones'
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
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
        {icono}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '2px', lineHeight: '1.3' }}>{toast.titulo}</p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toast.cuerpo}</p>
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(29,158,117,0.7)', flexShrink: 0 }}>Ver →</div>
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
  // Navegación desde toast
  const [navegarAMisPublicaciones, setNavegarAMisPublicaciones] = useState(false)
  const [navegarAActivos, setNavegarAActivos] = useState(false)
  const [trabajoIdInicial, setTrabajoIdInicial] = useState(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session) })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) setModo(null)
    })
  }, [])

  useEffect(() => {
    if (session) {
      supabase.from('usuarios').select('nombre').eq('id', session.user.id).maybeSingle()
        .then(({ data }) => { if (data?.nombre) setNombreUsuario(data.nombre) })
    }
  }, [session])

  useEffect(() => {
    if (!session) return
    cargarNoLeidas()
    const channel = supabase
      .channel('notificaciones-badge')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notificaciones',
        filter: `usuario_id=eq.${session.user.id}`
      }, (payload) => {
        cargarNoLeidas()
        if (payload.new) {
          mostrarToast({
            titulo: payload.new.titulo,
            cuerpo: payload.new.cuerpo,
            tipo: payload.new.tipo,
            trabajoId: payload.new.trabajo_id,
          })
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  async function cargarNoLeidas() {
    if (!session) return
    const { count } = await supabase.from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('usuario_id', session.user.id).eq('leida', false)
    setNoLeidas(count || 0)
  }

  useEffect(() => {
    if (session) {
      solicitarPermiso().then(async token => {
        if (token) await supabase.from('usuarios').update({ fcm_token: token }).eq('id', session.user.id)
      })
      const unsubscribe = escucharNotificaciones((payload) => {
        cargarNoLeidas()
        mostrarToast({
          titulo: payload.notification?.title || '',
          cuerpo: payload.notification?.body || '',
          tipo: payload.data?.tipo || 'general',
          trabajoId: payload.data?.trabajo_id || null,
        })
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

    // Tipos que llevan al cliente → MisPublicaciones con trabajo específico
    const tiposCliente = ['trabajo_completado', 'llegada', 'en_camino', 'recordatorio', 'contraoferta', 'disputa', 'general']
    // Tipos que llevan al trabajador → Activos con trabajo específico
    const tiposTrabajador = ['pago_liberado', 'trabajo_aceptado']

    if (tiposCliente.includes(toast.tipo)) {
      setModo('cliente')
      setNavegarAMisPublicaciones(true)
      if (toast.trabajoId) setTrabajoIdInicial(toast.trabajoId)
    } else if (tiposTrabajador.includes(toast.tipo)) {
      setModo('trabajador')
      setNavegarAActivos(true)
      if (toast.trabajoId) setTrabajoIdInicial(toast.trabajoId)
    } else if (toast.tipo === 'calificacion') {
      setVerNotificaciones(true)
    } else {
      setVerNotificaciones(true)
    }
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
    setModo(null); setNombreUsuario(''); setNoLeidas(0)
    setNavegarAMisPublicaciones(false); setNavegarAActivos(false); setTrabajoIdInicial(null)
  }

  if (mostrarSplash) return <SplashScreen onTerminado={() => setMostrarSplash(false)} />

  if (session) {
    if (verNotificaciones) {
      return <Notificaciones
        userId={session.user.id}
        onVolver={() => { setVerNotificaciones(false); cargarNoLeidas() }}
        onIrATrabajo={(trabajoId, tipo) => {
          setVerNotificaciones(false)
          cargarNoLeidas()
          const tiposCliente = ['trabajo_completado', 'llegada', 'en_camino', 'recordatorio', 'contraoferta', 'disputa', 'general']
          const tiposTrabajador = ['pago_liberado', 'trabajo_aceptado']
          setTrabajoIdInicial(trabajoId)
          if (tiposCliente.includes(tipo)) {
            setModo('cliente')
            setNavegarAMisPublicaciones(true)
          } else if (tiposTrabajador.includes(tipo)) {
            setModo('trabajador')
            setNavegarAActivos(true)
          }
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
            irAActivos={navegarAActivos}
            trabajoIdInicial={trabajoIdInicial}
            onNavegacionCompletada={() => { setNavegarAActivos(false); setTrabajoIdInicial(null) }}
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
          irAMisPublicaciones={navegarAMisPublicaciones}
          trabajoIdInicial={trabajoIdInicial}
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
