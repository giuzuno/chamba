export default function Terminos({ onAceptar, onVolver }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        {onVolver && <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>}
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Términos y condiciones</h2>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '16px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
            Al usar <strong style={{ color: '#1D9E75' }}>Chamba</strong>, aceptas los siguientes términos. Léelos con atención antes de continuar.
          </p>
        </div>

        {[
          {
            titulo: '1. Qué es Chamba',
            texto: 'Chamba es una plataforma digital de intermediación de servicios locales que conecta a clientes con trabajadores en Salina Cruz, Oaxaca. Chamba no es empleador de ningún trabajador registrado en la plataforma.'
          },
          {
            titulo: '2. Pagos y comisión',
            texto: 'Chamba retiene el 12% de cada transacción completada como comisión por el uso de la plataforma. Los pagos se procesan de forma segura mediante escrow — el dinero se libera al trabajador solo cuando el cliente confirma que el trabajo fue completado satisfactoriamente.'
          },
          {
            titulo: '3. Responsabilidad del trabajador',
            texto: 'El trabajador es responsable de la calidad y puntualidad del servicio ofrecido. La inasistencia sin aviso puede resultar en cancelación automática del trabajo. Chamba se reserva el derecho de suspender cuentas con comportamiento inadecuado.'
          },
          {
            titulo: '4. Responsabilidad del cliente',
            texto: 'El cliente es responsable de proporcionar información veraz sobre el trabajo requerido y de confirmar la finalización del trabajo en tiempo y forma. La falta de confirmación resultará en liberación automática del pago a los 30 minutos.'
          },
          {
            titulo: '5. Disputas',
            texto: 'En caso de conflicto entre cliente y trabajador, Chamba actuará como mediador. La decisión del equipo de Chamba será definitiva. Chamba se reserva el derecho de reembolsar o redirigir fondos según su criterio.'
          },
          {
            titulo: '6. Privacidad',
            texto: 'Tus datos personales son tratados conforme a nuestra Política de Privacidad. No vendemos ni compartimos tu información con terceros. La ubicación solo se usa durante el servicio activo.'
          },
          {
            titulo: '7. Modificaciones',
            texto: 'Chamba puede modificar estos términos en cualquier momento. Los cambios serán notificados dentro de la app. El uso continuo de la plataforma implica la aceptación de los términos actualizados.'
          },
        ].map(s => (
          <div key={s.titulo}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#1D9E75', marginBottom: '6px' }}>{s.titulo}</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7' }}>{s.texto}</p>
          </div>
        ))}

        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Última actualización: Junio 2026 · Chamba, Salina Cruz, Oaxaca
        </p>
      </div>

      {onAceptar && (
        <div style={{ padding: '20px', borderTop: '0.5px solid rgba(255,255,255,0.08)', background: '#0D0D0D' }}>
          <button type="button" onClick={onAceptar} style={{ width: '100%', padding: '16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            ✅ Acepto los términos y condiciones
          </button>
        </div>
      )}
    </div>
  )
}
