import { useEffect, useState } from 'react'

export default function SplashScreen({ onTerminado }) {
  const [opacidad, setOpacidad] = useState(0)
  const [progreso, setProgreso] = useState(0)

  useEffect(() => {
    setTimeout(() => setOpacidad(1), 100)
    setTimeout(() => setProgreso(100), 200)
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
      {/* Círculos decorativos */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', borderRadius: '50%', border: '0.5px solid rgba(29,158,117,0.12)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '220px', height: '220px', borderRadius: '50%', border: '0.5px solid rgba(29,158,117,0.18)' }} />

      {/* Logo */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        {/* Pin SVG grande */}
        <svg width="90" height="108" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 0 C22.4 0 0 22.4 0 50 C0 87.5 50 120 50 120 C50 120 100 87.5 100 50 C100 22.4 77.6 0 50 0Z" fill="#1D9E75"/>
          <circle cx="50" cy="46" r="26" fill="#0A2E20"/>
          <text x="50" y="57" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34">C</text>
        </svg>

        {/* Nombre */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '42px', fontWeight: '800', color: '#1D9E75', letterSpacing: '-2px', lineHeight: 1, margin: 0 }}>Chamba</p>
          <div style={{ width: '140px', height: '0.5px', background: 'rgba(29,158,117,0.3)', margin: '12px auto' }} />
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', margin: 0 }}>Lo que necesitas, cerca de ti</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={{ position: 'absolute', bottom: '80px', width: '120px', height: '2px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px' }}>
        <div style={{ height: '2px', background: '#1D9E75', borderRadius: '1px', width: `${progreso}%`, transition: 'width 2s ease' }} />
      </div>
    </div>
  )
}
