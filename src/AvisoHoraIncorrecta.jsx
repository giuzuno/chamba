import { useState } from 'react'

export default function AvisoHoraIncorrecta({ onCerrar }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99998,
      background: '#3D2A0A', borderBottom: '1px solid rgba(232,160,48,0.4)',
      padding: '12px 16px', fontFamily: 'sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>⏰</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: '700', color: '#E8A030', marginBottom: '2px' }}>
            La hora de tu celular parece estar mal configurada
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>
            Esto puede afectar tus citas y el tracking de trabajos.
            {!expandido && (
              <button type="button" onClick={() => setExpandido(true)} style={{ background: 'transparent', border: 'none', color: '#E8A030', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0, marginLeft: '6px', textDecoration: 'underline' }}>
                ¿Cómo lo arreglo?
              </button>
            )}
          </p>
          {expandido && (
            <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                1. Ve a <strong>Ajustes</strong> de tu celular<br/>
                2. Busca <strong>"Fecha y hora"</strong><br/>
                3. Activa <strong>"Fecha y hora automáticas"</strong> y <strong>"Zona horaria automática"</strong><br/>
                Si no puedes activarlo automático, selecciona manualmente: <strong>Ciudad de México (GMT-6)</strong>
              </p>
            </div>
          )}
        </div>
        <button type="button" onClick={onCerrar} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '18px', cursor: 'pointer', flexShrink: 0, padding: '2px' }}>
          ✕
        </button>
      </div>
    </div>
  )
}
