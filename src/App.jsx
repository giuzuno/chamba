import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import MapaChamba from './MapaChamba'
import VistaTrabajador from './VistaTrabajador'
import SplashScreen from './SplashScreen'
import Privacidad from './Privacidad'

function AppContenido() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [modoTrabajador, setModoTrabajador] = useState(false)
  const [mostrarSplash, setMostrarSplash] = useState(true)

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
    setModoTrabajador(false)
  }

  if (mostrarSplash) {
    return <SplashScreen onTerminado={() => setMostrarSplash(false)} />
  }

  if (session) {
    if (modoTrabajador) {
      return (
        <VistaTrabajador
          onLogout={handleLogout}
          userId={session.user.id}
          userEmail={session.user.email}
          onCambiarModo={() => setModoTrabajador(false)}
        />
      )
    }
    return (
      <MapaChamba
        onLogout={handleLogout}
        userId={session.user.id}
        userEmail={session.user.email}
        onCambiarModo={() => setModoTrabajador(true)}
      />
    )
  }

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
          <input id="email" name="email" type="email" placeholder="Tu correo"
            value={email} onChange={e => setEmail(e.target.value)} required
            style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }}
          />
          <input id="password" name="password" type="password" placeholder="Contraseña"
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

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <a href="/privacidad" style={{
              color: 'rgba(255,255,255,0.3)', fontSize: '12px',
              textDecoration: 'none'
            }}>
              Política de privacidad
            </a>
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