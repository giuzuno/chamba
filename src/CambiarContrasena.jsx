import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function CambiarContrasena({ modoRecuperacion = false, onCompletado, onVolver }) {
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setError('')
    if (nueva.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return }

    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password: nueva })
    setGuardando(false)

    if (error) { setError(error.message); return }
    setExito(true)
  }

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
        <h2 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>¡Contraseña actualizada!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', lineHeight: '1.6', marginBottom: '32px' }}>
          Ya puedes usar tu nueva contraseña la próxima vez que inicies sesión.
        </p>
        <button type="button" onClick={onCompletado} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Continuar
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px' }}>
      <div style={{ background: '#1A1A1A', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px 32px', width: '100%', maxWidth: '400px' }}>
        {onVolver && (
          <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '20px', cursor: 'pointer', marginBottom: '20px' }}>←</button>
        )}
        <h2 style={{ color: 'white', fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
          {modoRecuperacion ? 'Crea tu nueva contraseña' : '🔒 Cambiar contraseña'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '28px', lineHeight: '1.5' }}>
          {modoRecuperacion
            ? 'Escribe la contraseña que quieres usar de ahora en adelante.'
            : 'Escribe tu nueva contraseña dos veces para confirmar.'}
        </p>
        <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password" placeholder="Nueva contraseña" value={nueva}
            onChange={e => { setNueva(e.target.value); setError('') }}
            style={{ background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${error ? '#F09595' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }}
          />
          <input
            type="password" placeholder="Confirma tu nueva contraseña" value={confirmar}
            onChange={e => { setConfirmar(e.target.value); setError('') }}
            style={{ background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${error ? '#F09595' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', outline: 'none' }}
          />
          {error && <p style={{ color: '#F09595', fontSize: '13px' }}>{error}</p>}
          <button type="submit" disabled={guardando} style={{ background: guardando ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '4px', fontFamily: 'sans-serif' }}>
            {guardando ? 'Guardando...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
