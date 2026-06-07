import LogoChamba from './LogoChamba'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
      
      <LogoChamba size='md' />
      
      <div style={{ fontSize: '80px', margin: '24px 0 8px' }}>🔍</div>
      
      <h1 style={{ fontSize: '72px', fontWeight: '900', color: 'rgba(255,255,255,0.08)', letterSpacing: '-4px', marginBottom: '0' }}>404</h1>
      
      <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'white', marginBottom: '10px', marginTop: '8px' }}>
        Esta chamba no existe
      </h2>
      
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '280px', lineHeight: '1.6', marginBottom: '32px' }}>
        La página que buscas no existe o fue removida. Regresa al inicio y sigue chambeando.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
        {['⚡ Electricistas', '🔧 Plomeros', '🚕 Taxis', '🍳 Cocineras'].map(s => (
          <span key={s} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '100px', background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.2)' }}>{s}</span>
        ))}
      </div>

      <button type="button" onClick={() => window.location.href = '/'} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
        🏠 Volver al inicio
      </button>

      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', marginTop: '40px' }}>
        Chamba · Salina Cruz, Oaxaca
      </p>
    </div>
  )
}
