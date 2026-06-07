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
import LogoChamba from './LogoChamba'
import { verificarDispositivoBaneado, guardarFingerprint } from './useFingerprint'
import PanelAdmin from './PanelAdmin'
import Terminos from './Terminos'
import NotFound from './NotFound'

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

// ── Recuperar contraseña ──
function RecuperarPassword({ onVolver }) {
  const [emailRec, setEmailRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function enviarCorreo(e) {
    e.preventDefault()
    if (!emailRec.trim()) { setError('Escribe tu correo'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(emailRec.trim(), {
      redirectTo: 'https://chamba-delta.vercel.app'
    })
    if (error) setError(error.message)
    else setEnviado(true)
    setLoading(false)
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>📬</div>
        <h2 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>¡Correo enviado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', lineHeight: '1.6', marginBottom: '8px' }}>
          Revisa tu bandeja de entrada en <strong style={{ color: 'white' }}>{emailRec}</strong>
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '32px' }}>
          El enlace expira en 1 hora. Revisa también spam.
        </p>
        <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px' }}>
      <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px 32px', width: '100%', maxWidth: '400px' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '20px', cursor: 'pointer', marginBottom: '20px' }}>←</button>
        <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>¿Olvidaste tu contraseña?</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5' }}>
          Te enviaremos un enlace para crear una nueva contraseña.
        </p>
        <form onSubmit={enviarCorreo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="email" placeholder="Tu correo registrado"
            value={emailRec} onChange={e => { setEmailRec(e.target.value); setError('') }}
            style={{ background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${error ? '#F09595' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }}
          />
          {error && <p style={{ color: '#F09595', fontSize: '13px' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '4px' }}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Onboarding ──
function Onboarding({ userId, userEmail, onCompletado }) {
  const [paso, setPaso] = useState(1)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [pendienteRol, setPendienteRol] = useState(null)

  const [apellido, setApellido] = useState('')

  function generarUsername(nombre, apellido) {
    const base = `${nombre.trim().split(' ')[0]}_${apellido.trim().split(' ')[0]}`
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9_]/g, '')
    return base
  }

  async function usernameDisponible(username) {
    const { data } = await supabase.from('usuarios').select('id').eq('username', username).maybeSingle()
    return !data
  }

  async function guardarNombreYRol(rol) {
    if (!nombre.trim()) { setError('Escribe tu nombre'); return }
    if (!apellido.trim()) { setError('Escribe tu apellido'); return }
    setGuardando(true)

    // Generar username único
    let username = generarUsername(nombre, apellido)
    let disponible = await usernameDisponible(username)
    if (!disponible) {
      let i = 2
      while (!disponible) {
        username = `${generarUsername(nombre, apellido)}_${i}`
        disponible = await usernameDisponible(username)
        i++
      }
    }

    await supabase.from('usuarios').upsert({
      id: userId, email: userEmail,
      nombre: nombre.trim(), apellido: apellido.trim(), username
    })
    setGuardando(false)
    setPendienteRol(rol)
    setPaso(4)
  }

  if (paso === 1) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: '24px' }}>👋</div>
        <LogoChamba size='lg' />
        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Bienvenido a Chamba</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px', marginBottom: '8px', maxWidth: '300px', lineHeight: '1.6' }}>La plataforma de servicios locales de Salina Cruz, Oaxaca.</p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '48px' }}>En 2 pasos estarás listo para empezar</p>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
        <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
          {[1,2].map(n => <div key={n} style={{ width: n===1?'24px':'8px', height:'8px', borderRadius:'4px', background: n===1?'#1D9E75':'rgba(255,255,255,0.15)', transition:'all 0.3s' }} />)}
        </div>
        <div style={{ width: '100%', maxWidth: '340px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '8px' }}>¿Cómo te llamas?</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '28px' }}>Tu nombre real — así te verán clientes y trabajadores.</p>
          <input type="text" placeholder="Nombre(s)" value={nombre}
            onChange={e => { setNombre(e.target.value); setError('') }} autoFocus
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${error && !nombre ? '#F09595' : nombre ? '#1D9E75' : 'rgba(255,255,255,0.15)'}`, borderRadius: '14px', padding: '16px 18px', color: 'white', fontSize: '16px', fontFamily: 'sans-serif', outline: 'none', marginBottom: '10px' }}
          />
          <input type="text" placeholder="Apellido(s)" value={apellido}
            onChange={e => { setApellido(e.target.value); setError('') }}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${error && !apellido ? '#F09595' : apellido ? '#1D9E75' : 'rgba(255,255,255,0.15)'}`, borderRadius: '14px', padding: '16px 18px', color: 'white', fontSize: '16px', fontFamily: 'sans-serif', outline: 'none', marginBottom: '8px' }}
          />
          {nombre && apellido && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
              Tu usuario será: <span style={{ color: '#1D9E75' }}>@{nombre.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')}_{apellido.trim().split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')}</span>
            </p>
          )}
          {error && <p style={{ color: '#F09595', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
          <button type="button" onClick={() => { if (!nombre.trim()) { setError('Escribe tu nombre'); return } if (!apellido.trim()) { setError('Escribe tu apellido'); return } setPaso(3) }}
            style={{ width: '100%', padding: '16px', background: nombre.trim() && apellido.trim() ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: nombre.trim() && apellido.trim() ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: nombre.trim() && apellido.trim() ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif', marginTop: '8px' }}>
            Continuar →
          </button>
        </div>
      </div>
    )
  }

  if (paso === 4) {
    return <Terminos onAceptar={() => onCompletado(pendienteRol, nombre.trim())} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        {[1,2].map(n => <div key={n} style={{ width: n===2?'24px':'8px', height:'8px', borderRadius:'4px', background: n===2?'#1D9E75':'rgba(255,255,255,0.4)', transition:'all 0.3s' }} />)}
      </div>
      <div style={{ width: '100%', maxWidth: '340px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Hola, {nombre.split(' ')[0]} 👋</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '28px' }}>¿Qué quieres hacer en Chamba?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button type="button" onClick={() => guardarNombreYRol('cliente')} disabled={guardando} style={{ background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '18px', padding: '24px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0, background: 'rgba(29,158,117,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🛍️</div>
            <div>
              <p style={{ fontSize: '17px', fontWeight: '700', color: '#1D9E75', marginBottom: '4px' }}>Contratar servicios</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>Busco electricistas, plomeros, taxis y más</p>
            </div>
          </button>
          <button type="button" onClick={() => guardarNombreYRol('trabajador')} disabled={guardando} style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '18px', padding: '24px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0, background: 'rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🔧</div>
            <div>
              <p style={{ fontSize: '17px', fontWeight: '700', color: '#378ADD', marginBottom: '4px' }}>Ofrecer mis servicios</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.4' }}>Quiero trabajar y ganar dinero con mi oficio</p>
            </div>
          </button>
          <button type="button" onClick={() => guardarNombreYRol('ambos')} disabled={guardando} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '18px', padding: '20px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '16px' }}>
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

function SeleccionModo({ onCliente, onTrabajador, onLogout, nombre, noLeidas, onNotificaciones, horaActual }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '16px', right: '20px' }}>
        <button type="button" onClick={onNotificaciones} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', fontSize: '18px' }}>
          🔔
          {noLeidas > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#F09595', color: 'white', borderRadius: '100px', fontSize: '10px', fontWeight: '700', padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>{noLeidas > 99 ? '99+' : noLeidas}</span>}
        </button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <LogoChamba size='lg' />
        {nombre && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', marginTop: '12px', fontWeight: '500' }}>
            {horaActual < 12 ? '🌅 Buenos días' : horaActual < 19 ? '☀️ Buenas tardes' : '🌙 Buenas noches'}, {nombre.split(' ')[0]}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginTop: '4px' }}>
            ¿Qué quieres hacer hoy?
          </p>
        </div>
      )}
      </div>
      <div style={{ height: '8px' }} />
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
  const [esNuevo, setEsNuevo] = useState(false)
  const [esAdmin, setEsAdmin] = useState(false)
  const [estaBaneado, setEstaBaneado] = useState(false)
  const [dispositivoBaneado, setDispositivoBaneado] = useState(false)
  const [onboardingCompletado, setOnboardingCompletado] = useState(false)
  const [navegarAMisPublicaciones, setNavegarAMisPublicaciones] = useState(false)
  const [navegarAActivos, setNavegarAActivos] = useState(false)
  const [navegarAHistorial, setNavegarAHistorial] = useState(false)
  const [trabajoIdInicial, setTrabajoIdInicial] = useState(null)
  const [navegando, setNavegando] = useState(false)
  const [verRecuperar, setVerRecuperar] = useState(false) // ← NUEVO
  const toastTimer = useRef(null)
  const [sinInternet, setSinInternet] = useState(!navigator.onLine)

  useEffect(() => {
    const online = () => setSinInternet(false)
    const offline = () => setSinInternet(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session) })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) { setModo(null); setEsNuevo(false) }
    })
  }, [])

  useEffect(() => {
    if (session) {
      // Verificar fingerprint del dispositivo primero
      verificarDispositivoBaneado().then(({ baneado }) => {
        if (baneado) { setDispositivoBaneado(true); return }
      })

      // Guardar fingerprint y cargar perfil
      guardarFingerprint(session.user.id)

      supabase.from('usuarios').select('nombre, es_admin, baneado').eq('id', session.user.id).maybeSingle()
        .then(({ data }) => {
          if (data?.baneado) { setEstaBaneado(true); return }
          if (data?.es_admin) { setEsAdmin(true); setEsNuevo(false) }
          else if (data?.nombre) { setNombreUsuario(data.nombre); setEsNuevo(false) }
          else setEsNuevo(true)
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

    if (toast.trabajoId) setTrabajoIdInicial(toast.trabajoId)

    const tiposCliente = ['trabajo_aceptado', 'trabajo_completado', 'llegada', 'en_camino', 'recordatorio', 'contraoferta', 'disputa']
    const tiposTrabajador = ['pago_liberado', 'nuevo_trabajo']

    // Mostrar pantalla de carga brevemente
    setNavegando(true)
    setTimeout(() => {
      setNavegando(false)
      if (tiposCliente.includes(toast.tipo)) {
        setModo('cliente')
        setNavegarAMisPublicaciones(true)
      } else if (tiposTrabajador.includes(toast.tipo)) {
        setModo('trabajador')
        setNavegarAActivos(true)
      } else {
        setVerNotificaciones(true)
      }
    }, 600)
  }

  function onboardingTerminado(rol, nombre) {
    setNombreUsuario(nombre); setEsNuevo(false); setOnboardingCompletado(true)
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
    setModo(null); setNombreUsuario(''); setNoLeidas(0); setEsNuevo(false); setEsAdmin(false); setEstaBaneado(false); setDispositivoBaneado(false)
    setNavegarAMisPublicaciones(false); setNavegarAActivos(false); setTrabajoIdInicial(null)
  }

  if (dispositivoBaneado) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px', color: '#F09595' }}>Dispositivo bloqueado</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', lineHeight: '1.7', marginBottom: '24px' }}>
        Este dispositivo ha sido bloqueado por violar los términos y condiciones de Chamba.
      </p>
      <a href="mailto:chambaapp.soporte@gmail.com" style={{ background: 'rgba(240,149,149,0.1)', color: '#F09595', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>
        📧 Contactar soporte
      </a>
    </div>
  )

  if (navegando) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(29,158,117,0.2)', borderTop: '3px solid #1D9E75', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (sinInternet) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: 'white', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>📡</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px', color: 'white' }}>Sin conexión</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', maxWidth: '280px', lineHeight: '1.6', marginBottom: '32px' }}>
        Chamba necesita internet para funcionar. Revisa tu conexión y vuelve a intentarlo.
      </p>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(29,158,117,0.3)', borderTop: '3px solid #1D9E75', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '20px' }}>Reconectando automáticamente...</p>
    </div>
  )

  if (mostrarSplash) return <SplashScreen onTerminado={() => setMostrarSplash(false)} />

  // ── Recuperar contraseña ──
  if (verRecuperar) return <RecuperarPassword onVolver={() => setVerRecuperar(false)} />

  if (session) {
    if (estaBaneado) return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px', color: '#F09595' }}>Cuenta suspendida</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', lineHeight: '1.7', marginBottom: '8px' }}>
          Tu cuenta ha sido suspendida por violar los términos y condiciones de Chamba.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '32px', maxWidth: '280px', lineHeight: '1.6' }}>
          Si crees que esto es un error, contacta a nuestro equipo de soporte.
        </p>
        <a href="mailto:chambaapp.soporte@gmail.com" style={{ background: 'rgba(240,149,149,0.1)', color: '#F09595', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', marginBottom: '16px' }}>
          📧 Contactar soporte
        </a>
        <button type="button" onClick={handleLogout} style={{ background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif', marginTop: '8px' }}>
          Cerrar sesión
        </button>
      </div>
    )

    if (esAdmin) return <PanelAdmin onLogout={handleLogout} nombreAdmin={nombreUsuario || 'Admin'} />
    if (esNuevo) return <Onboarding userId={session.user.id} userEmail={session.user.email} onCompletado={onboardingTerminado} />

    if (verNotificaciones) {
      return <Notificaciones
        userId={session.user.id}
        onVolver={() => { setVerNotificaciones(false); cargarNoLeidas() }}
        onIrATrabajo={(trabajoId, tipo) => {
          setVerNotificaciones(false); cargarNoLeidas()
          setTrabajoIdInicial(trabajoId)
          const tiposCliente = ['trabajo_aceptado', 'trabajo_completado', 'llegada', 'en_camino', 'recordatorio', 'contraoferta', 'disputa']
          const tiposTrabajador = ['pago_liberado', 'nuevo_trabajo']
          if (tiposCliente.includes(tipo)) { setModo('cliente'); setNavegarAMisPublicaciones(true) }
          else if (tiposTrabajador.includes(tipo)) { setModo('trabajador'); setNavegarAActivos(true) }
          else setVerNotificaciones(false)
        }}
      />
    }

    if (!modo) {
      return (
        <>
          <Toast toast={toastActivo} onClick={alTocarToast} />
          <SeleccionModo nombre={nombreUsuario} noLeidas={noLeidas} horaActual={new Date().getHours()}
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
            irAActivos={navegarAActivos} irAHistorial={navegarAHistorial} trabajoIdInicial={trabajoIdInicial}
            onNavegacionCompletada={() => { setNavegarAActivos(false); setNavegarAHistorial(false); setTrabajoIdInicial(null) }}
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
        <div style={{ marginBottom: '32px' }}><LogoChamba size='md' /></div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input id="email" name="email" type="email" placeholder="Tu correo" value={email} onChange={e => setEmail(e.target.value)} required style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }} />
          <input id="password" name="password" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }} />
          {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginTop: '4px' }}>{loading ? 'Cargando...' : 'Entrar'}</button>
          <button type="button" onClick={handleRegister} disabled={loading} style={{ background: 'transparent', color: '#1D9E75', border: '1px solid #1D9E75', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>Crear cuenta</button>
          {/* ← NUEVO: Link recuperar contraseña */}
          <button type="button" onClick={() => setVerRecuperar(true)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif', textAlign: 'center', padding: '4px' }}>
            ¿Olvidaste tu contraseña?
          </button>
          <div style={{ textAlign: 'center' }}>
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
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/*" element={<AppContenido />} />
        <Route path="/404" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
