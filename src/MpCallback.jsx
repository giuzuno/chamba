import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function MpCallback() {
  const [searchParams] = useSearchParams()
  const [estado, setEstado] = useState('cargando') // cargando | exito | error
  const [mensaje, setMensaje] = useState('')

  useEffect(() => { procesarCallback() }, [])

  async function procesarCallback() {
    const code = searchParams.get('code')
    const trabajadorId = searchParams.get('state')

    if (!code || !trabajadorId) {
      setMensaje('Parámetros inválidos. Intenta conectar tu cuenta de nuevo.')
      setEstado('error')
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('mp-oauth-callback', {
        body: { code, trabajadorId }
      })

      if (error || !data?.ok) {
        setMensaje(data?.error || 'No se pudo conectar tu cuenta. Intenta de nuevo.')
        setEstado('error')
        return
      }

      setEstado('exito')
    } catch {
      setMensaje('Error de conexión. Intenta de nuevo.')
      setEstado('error')
    }
  }

  if (estado === 'cargando') return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '3px solid rgba(29,158,117,0.3)', borderTop: '3px solid #1D9E75', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>Conectando tu cuenta de Mercado Pago...</p>
    </div>
  )

  if (estado === 'exito') return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '72px', marginBottom: '20px' }}>✅</div>
      <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1D9E75', marginBottom: '12px' }}>¡Cuenta conectada!</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: '1.6', maxWidth: '300px', marginBottom: '32px' }}>
        Tu cuenta de Mercado Pago está lista. Los pagos de tus trabajos llegarán automáticamente.
      </p>
      <button type="button" onClick={() => window.location.href = '/'}
        style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        Volver a Chamba
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '72px', marginBottom: '20px' }}>❌</div>
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#F09595', marginBottom: '12px' }}>Error al conectar</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.6', maxWidth: '300px', marginBottom: '32px' }}>{mensaje}</p>
      <button type="button" onClick={() => window.location.href = '/'}
        style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        Volver a Chamba
      </button>
    </div>
  )
}
