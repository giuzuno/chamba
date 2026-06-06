import { useState } from 'react'
import { supabase } from './supabaseClient'
import { enviarNotificacionCompleta } from './guardarNotificacion'

// Admin ID se obtiene dinámicamente de la BD
async function obtenerAdminId() {
  const { data } = await supabase.from('usuarios').select('id').eq('es_admin', true).limit(1).maybeSingle()
  return data?.id || null
}

export default function ReportarCobro({ trabajo, userId, rolReportador, onVolver }) {
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviarReporte() {
    if (!descripcion.trim()) return
    setEnviando(true)

    // Guardar reporte en BD como disputa especial
    await supabase.from('disputas').insert({
      trabajo_id: trabajo.id,
      reportado_por: userId,
      tipo: 'cobro_fuera_app',
      descripcion: `[COBRO FUERA DE APP] ${descripcion}`,
      status: 'abierta',
    })

    // Notificar al admin
    await enviarNotificacionCompleta({
      usuarioId: await obtenerAdminId(),
      titulo: '🚨 Reporte: cobro fuera de app',
      cuerpo: `Trabajo ${trabajo.categoria} — ${descripcion.slice(0, 60)}`,
      tipo: 'disputa',
      trabajoId: trabajo.id,
    })

    setEnviado(true)
    setEnviando(false)
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '10px', color: '#1D9E75' }}>Reporte enviado</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '300px', lineHeight: '1.6', marginBottom: '8px' }}>
          El equipo de Chamba revisará tu reporte en menos de 24 horas.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginBottom: '32px', maxWidth: '280px', lineHeight: '1.6' }}>
          Recuerda: nunca pagues ni cobres fuera de la app. Tu dinero está protegido mientras uses los medios de pago de Chamba.
        </p>
        <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Volver
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Reportar cobro fuera de app</h2>
      </div>

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Alerta */}
        <div style={{ background: 'rgba(240,149,149,0.08)', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '16px', padding: '18px', display: 'flex', gap: '14px' }}>
          <span style={{ fontSize: '28px', flexShrink: 0 }}>🚨</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#F09595', marginBottom: '6px' }}>
              {rolReportador === 'cliente' ? '¿El trabajador te pidió pagar fuera de la app?' : '¿El cliente te pidió cobrar fuera de la app?'}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
              Esto viola los términos de Chamba. Repórtalo y lo investigaremos. El {rolReportador === 'cliente' ? 'trabajador' : 'cliente'} puede ser suspendido.
            </p>
          </div>
        </div>

        {/* Escrow explicación */}
        <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '16px', display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🔐</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1D9E75', marginBottom: '4px' }}>Usa siempre los pagos de Chamba</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
              {rolReportador === 'cliente'
                ? 'Tu dinero está protegido en escrow. Si pagas fuera de la app y el trabajo sale mal, no podremos recuperarlo. Dentro de Chamba, si hay un problema, te regresamos el dinero.'
                : 'Cobrar dentro de Chamba garantiza que recibirás tu pago. Si cobras fuera, pierdes la protección y el cliente puede disputar sin respaldo.'}
            </p>
          </div>
        </div>

        {/* Trabajo */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trabajo relacionado</p>
          <p style={{ fontSize: '15px', fontWeight: '600' }}>{trabajo.categoria}</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>${trabajo.precio_acordado || trabajo.presupuesto} MXN</p>
        </div>

        {/* Descripción */}
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Qué pasó exactamente? *</p>
          <textarea
            placeholder={rolReportador === 'cliente'
              ? 'Ej: El trabajador me pidió pagar en efectivo fuera de la app antes de iniciar el trabajo...'
              : 'Ej: El cliente me dijo que me pagaría por transferencia directa sin usar Chamba...'}
            value={descripcion} onChange={e => setDescripcion(e.target.value)}
            rows={4}
            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `0.5px solid ${descripcion ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', resize: 'none', outline: 'none', lineHeight: '1.5' }}
          />
        </div>

        <button type="button" onClick={enviarReporte} disabled={!descripcion.trim() || enviando}
          style={{ width: '100%', padding: '16px', background: descripcion.trim() && !enviando ? '#F09595' : 'rgba(255,255,255,0.08)', color: descripcion.trim() && !enviando ? 'white' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: descripcion.trim() ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif' }}>
          {enviando ? 'Enviando reporte...' : '🚨 Enviar reporte'}
        </button>

        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: '1.6' }}>
          Los reportes falsos también pueden resultar en suspensión de cuenta. Solo reporta si realmente ocurrió.
        </p>
      </div>
    </div>
  )
}
