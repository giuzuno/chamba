import { useState } from 'react'

const REGLAS_CLIENTE = [
  { icon: '💰', titulo: 'Tu dinero está protegido', desc: 'El pago se retiene de forma segura hasta que confirmes que el trabajo quedó bien. Si no quedó, puedes disputarlo y recuperar tu dinero.' },
  { icon: '✅', titulo: 'Confirma solo si quedó bien', desc: 'Al confirmar liberas el pago al trabajador. Si hay un problema, usa el botón de disputa antes de confirmar.' },
  { icon: '❌', titulo: 'No canceles sin avisar', desc: '3 cancelaciones de trabajos ya aceptados = cuenta suspendida automáticamente.' },
  { icon: '🚫', titulo: 'No pagues fuera de la app', desc: 'Pagar fuera de Chamba cancela tu protección. Si el trabajo sale mal, no podremos ayudarte. Usa siempre los medios de pago de la app.' },
  { icon: '⚠️', titulo: 'No hagas disputas maliciosas', desc: 'Reportar trabajos completados como incompletos sin razón válida puede resultar en suspensión de tu cuenta.' },
  { icon: '🔒', titulo: 'Tus datos están seguros', desc: 'Nunca compartimos tu información personal con terceros. Tu ubicación solo se usa durante el servicio activo.' },
]

const REGLAS_TRABAJADOR = [
  { icon: '💰', titulo: 'Cobra siempre dentro de la app', desc: 'Cobrar fuera de Chamba cancela la protección del cliente y puede resultar en suspensión inmediata de tu cuenta.' },
  { icon: '🚗', titulo: 'Llega a tiempo', desc: '3 inasistencias sin avisar = cuenta suspendida automáticamente. Si no puedes ir, avisa al cliente por chat.' },
  { icon: '⭐', titulo: 'Tu reputación importa', desc: 'Los clientes ven tu rating antes de contratarte. Un buen servicio = más trabajos y mejores ingresos.' },
  { icon: '📋', titulo: 'Completa lo acordado', desc: 'Acepta solo trabajos que puedas completar. Si surge un problema, comunícate con el cliente por chat.' },
  { icon: '🚫', titulo: 'Datos verídicos', desc: 'Para viajes: los datos de tu vehículo deben ser reales. Datos falsos = suspensión inmediata. 3 amonestaciones = ban permanente.' },
  { icon: '🔒', titulo: 'Tu pago está protegido', desc: 'El dinero queda retenido de forma segura desde que el cliente publica. Al completar el trabajo y ser confirmado, se libera a tu cuenta.' },
]

export default function ReglasChambaModal({ tipo, onAceptar, onCerrar }) {
  const [leido, setLeido] = useState(false)
  const reglas = tipo === 'cliente' ? REGLAS_CLIENTE : REGLAS_TRABAJADOR
  const titulo = tipo === 'cliente' ? '🛍️ Antes de publicar' : '🔧 Antes de aceptar'
  const subtitulo = tipo === 'cliente'
    ? 'Lee las reglas de Chamba para proteger tu dinero y tu experiencia.'
    : 'Lee las reglas de Chamba para proteger tu trabajo y tus ingresos.'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#111', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '480px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '0.5px solid rgba(255,255,255,0.1)' }}>

        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '14px auto 0' }} />

        {/* Header */}
        <div style={{ padding: '16px 20px 0', textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '6px' }}>{titulo}</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>{subtitulo}</p>
        </div>

        {/* protegido banner */}
        <div style={{ margin: '14px 16px 0', background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>🔐</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1D9E75', marginBottom: '4px' }}>Pago protegido con protegido</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
              {tipo === 'cliente'
                ? 'Tu dinero queda retenido de forma segura. Solo se libera al trabajador cuando tú confirmas que el trabajo quedó bien. Si hay un problema, lo recuperas.'
                : 'El dinero del cliente está retenido de forma segura. Se libera a tu cuenta cuando el cliente confirme que el trabajo quedó bien.'}
            </p>
          </div>
        </div>

        {/* Reglas — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
          onScroll={e => {
            const el = e.target
            if (el.scrollHeight - el.scrollTop <= el.clientHeight + 40) setLeido(true)
          }}>
          {reglas.map((r, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '22px', flexShrink: 0 }}>{r.icon}</span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>{r.titulo}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>{r.desc}</p>
              </div>
            </div>
          ))}
          <div style={{ height: '8px' }} />
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px 24px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          {!leido && (
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '10px' }}>
              ↓ Desplázate para leer todas las reglas
            </p>
          )}
          <button type="button" onClick={onAceptar}
            style={{ width: '100%', padding: '15px', background: leido ? '#1D9E75' : 'rgba(255,255,255,0.08)', color: leido ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: leido ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif', marginBottom: '8px' }}>
            {leido ? '✅ Entendido — Continuar' : 'Lee todas las reglas primero'}
          </button>
          <button type="button" onClick={onCerrar}
            style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
