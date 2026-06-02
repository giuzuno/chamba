export default function LogoChamba({ size = 'md', showText = true }) {
  const sizes = {
    sm: { pin: 28, textSize: 22, gap: 8 },
    md: { pin: 44, textSize: 34, gap: 10 },
    lg: { pin: 64, textSize: 48, gap: 14 },
  }
  const s = sizes[size]
  const pinH = s.pin * 1.2

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      <svg width={s.pin} height={pinH} viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d="M50 0 C22.4 0 0 22.4 0 50 C0 87.5 50 120 50 120 C50 120 100 87.5 100 50 C100 22.4 77.6 0 50 0Z" fill="#1D9E75"/>
        <circle cx="50" cy="46" r="26" fill="#0A2E20"/>
        <text x="50" y="57" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="34">C</text>
      </svg>
      {showText && (
        <span style={{ color: '#1D9E75', fontSize: s.textSize, fontWeight: '800', letterSpacing: '-1px', fontFamily: 'sans-serif', lineHeight: 1 }}>
          Chamba
        </span>
      )}
    </div>
  )
}