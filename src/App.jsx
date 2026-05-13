import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import MapaChamba from './MapaChamba'
import VistaTrabajador from './VistaTrabajador'
import MisPublicaciones from './MisPublicaciones'
import Perfil from './Perfil'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [pantalla, setPantalla] = useState('mapa')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setPantalla('mapa')
  }

  if (session) {
    const userId = session.user.id
    const userEmail = session.user.email

    if (pantalla === 'trabajador') {
      return (
        <VistaTrabajador
          onLogout={handleLogout}
          userId={userId}
          userEmail={userEmail}
          onCambiarModo={() => setPantalla('mapa')}
        />
      )
    }

    if (pantalla === 'publicaciones') {
      return (
        <MisPublicaciones
          userId={userId}
          userEmail={userEmail}
          onVolver={() => setPantalla('mapa')}
        />
      )
    }

    if (pantalla === 'perfil') {
      return (
        <Perfil
          userId={userId}
          userEmail={userEmail}
          onVolver={() => setPantalla('mapa')}
        />
      )
    }

    return (
      <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MapaChamba
            onLogout={handleLogout}
            userId={userId}
            userEmail={userEmail}
            onCambiarModo={() => setPantalla('trabajador')}
          />
        </div>

        {/* Bottom Bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#111', borderTop: '0.5px solid rgba(255,255,255,0.1)',
          display: 'flex', zIndex: 1000, paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
          {[
            { key: 'mapa', icon: '🗺️', label: 'Mapa' },
            { key: 'publicaciones', icon: '📋', label: 'Mis trabajos' },
            { key: 'trabajador', icon: '🔧', label: 'Trabajador' },
            { key: 'perfil', icon: '👤', label: 'Perfil' },
          ].map(tab => (
            <button key={tab.key} type="button" onClick={() => setPantalla(tab.key)} style={{
              flex: 1, padding: '10px 0', background: 'transparent', border: 'none',
              color: pantalla === tab.key ? '#1D9E75' : 'rgba(255,255,255,0.4)',
              fontSize: '20px', cursor: 'pointer', fontFamily: 'sans-serif',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px'
            }}>
              <span>{tab.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: pantalla === tab.key ? '600' : '400' }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Login ──
  return (
    <div style={{
      minHeight: '100vh', background: '#0D0D0D',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'sans-serif', padding: '24px'
    }}>
      <div style={{
        background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: '20px', padding: '40px 32px', width: '100%', maxWidth: '400px'
      }}>
        <h1 style={{ color: '#1D9E75', fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
          chamba
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px' }}>
          Salina Cruz, Oaxaca
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            id="email" name="email" type="email" placeholder="Tu correo"
            value={email} onChange={e => setEmail(e.target.value)} required
            style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }}
          />
          <input
            id="password" name="password" type="password" placeholder="Contraseña"
            value={password} onChange={e => setPassword(e.target.value)} required
            style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }}
          />

          {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px',
            padding: '14px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', marginTop: '4px'
          }}>
            {loading ? 'Cargando...' : 'Entrar'}
          </button>

          <button type="button" onClick={handleRegister} disabled={loading} style={{
            background: 'transparent', color: '#1D9E75', border: '1px solid #1D9E75',
            borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '500', cursor: 'pointer'
          }}>
            Crear cuenta
          </button>
        </form>
      </div>
    </div>
  )
}