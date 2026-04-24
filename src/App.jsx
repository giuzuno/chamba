import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)

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
  }

  // ── Pantalla principal si hay sesión ──
  if (session) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0D0D0D',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: 'white'
      }}>
        <h1 style={{ color: '#1D9E75', fontSize: '32px', fontWeight: '800', marginBottom: '8px' }}>
          chamba
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
          Bienvenido 👋
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '32px' }}>
          {session.user.email}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: 'transparent',
            color: '#F09595',
            border: '1px solid #F09595',
            borderRadius: '12px',
            padding: '10px 24px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  // ── Pantalla de login ──
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0D0D',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: '24px'
    }}>
      <div style={{
        background: '#1A1A1A',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ color: '#1D9E75', fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>
          chamba
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px' }}>
          Salina Cruz, Oaxaca
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Tu correo"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: 'white',
              fontSize: '15px',
              outline: 'none'
            }}
          />
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: 'white',
              fontSize: '15px',
              outline: 'none'
            }}
          />

          {error && (
            <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#1D9E75',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            {loading ? 'Cargando...' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading}
            style={{
              background: 'transparent',
              color: '#1D9E75',
              border: '1px solid #1D9E75',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Crear cuenta
          </button>
        </form>
      </div>
    </div>
  )
}