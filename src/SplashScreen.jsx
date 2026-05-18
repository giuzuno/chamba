import { useEffect, useState } from 'react'

export default function SplashScreen({ onTerminado }) {
  const [opacidad, setOpacidad] = useState(0)

  useEffect(() => {
    setTimeout(() => setOpacidad(1), 100)
    setTimeout(() => setOpacidad(0), 2500)
    setTimeout(() => onTerminado(), 3200)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0D0D0D',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, transition: 'opacity 0.7s ease',
      opacity: opacidad, fontFamily: 'sans-serif'
    }}>
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '280px', height: '280px', borderRadius: '50%',
          border: '0.5px solid rgba(29,158,117,0.2)'
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '220px', height: '220px', borderRadius: '50%',
          border: '0.5px solid rgba(29,158,117,0.15)'
        }} />

        <div style={{ position: 'relative' }}>
          <span style={{
            fontSize: '64px', fontWeight: '800',
            color: '#1D9E75', letterSpacing: '-2px'
          }}>chamba</span>
          <span style={{
            display: 'inline-block', width: '10px', height: '10px',
            borderRadius: '50%', background: '#1D9E75',
            marginLeft: '2px', marginBottom: '8px'
          }} />
        </div>

        <div style={{
          width: '160px', height: '0.5px',
          background: 'rgba(29,158,117,0.3)',
          margin: '12px auto'
        }} />

        <p style={{
          fontSize: '14px', color: 'rgba(255,255,255,0.35)',
          letterSpacing: '1px', margin: 0
        }}>
          Lo que necesitas, cerca de ti
        </p>
      </div>

      <div style={{
        position: 'absolute', bottom: '80px',
        width: '100px', height: '2px',
        background: 'rgba(255,255,255,0.1)', borderRadius: '1px'
      }}>
        <div style={{
          width: '60px', height: '2px',
          background: '#1D9E75', borderRadius: '1px'
        }} />
      </div>
    </div>
  )
}