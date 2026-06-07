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
            texto: 'Chamba es una plataforma digital de intermediación de servicios locales que conecta a clientes con trabajadores en Salina Cruz, Oaxaca. Chamba no es empleador de ningún trabajador registrado en la plataforma. Chamba actúa únicamente como intermediario tecnológico.'
          },
          {
            titulo: '2. Comisión de la plataforma',
            texto: 'Chamba retiene el 12% de cada transacción completada como comisión por el uso de la plataforma. Este porcentaje es descontado automáticamente del monto acordado entre cliente y trabajador. El trabajador recibe el 88% restante. La comisión es visible para ambas partes antes de confirmar cualquier trabajo.'
          },
          {
            titulo: '3. Sistema de pagos y escrow',
            texto: 'Los pagos se retienen de forma segura en escrow hasta que el cliente confirme que el trabajo fue completado satisfactoriamente. El dinero se libera al trabajador únicamente tras dicha confirmación. Si el cliente no confirma ni disputa dentro de las 24 horas siguientes a que el trabajador reporte el trabajo como terminado, el pago se libera automáticamente.'
          },
          {
            titulo: '4. Materiales y costos adicionales',
            texto: 'Al publicar un trabajo, el cliente debe indicar quién proveerá los materiales necesarios. Si el trabajador debe conseguirlos, el costo se incluye en la negociación del precio. Durante el trabajo, si surgen imprevistos que requieren materiales o trabajo adicional, el trabajador puede solicitar un costo extra a través de la app. El cliente debe aceptarlo explícitamente antes de que el trabajador proceda.'
          },
          {
            titulo: '5. Responsabilidad del trabajador',
            texto: 'El trabajador es responsable de la calidad, puntualidad y cumplimiento del servicio ofrecido. Al terminar, debe subir una foto del trabajo realizado como evidencia. La inasistencia sin aviso, el abandono del trabajo o el cobro fuera de la plataforma pueden resultar en amonestaciones. Tres amonestaciones resultan en suspensión automática de la cuenta.'
          },
          {
            titulo: '6. Responsabilidad del cliente',
            texto: 'El cliente es responsable de proporcionar información veraz sobre el trabajo requerido y de confirmar su finalización en tiempo y forma. La cancelación de un trabajo ya aceptado por un trabajador genera una amonestación. Tres amonestaciones resultan en suspensión automática de la cuenta.'
          },
          {
            titulo: '7. Garantía post-servicio',
            texto: 'El cliente tiene hasta 72 horas después de confirmar un trabajo para dejar un comentario adicional si algo falló. Esto no reabre una disputa formal pero queda visible en el historial del trabajador para informar a futuros clientes.'
          },
          {
            titulo: '8. Disputas',
            texto: 'Para abrir una disputa, el cliente debe primero intentar resolver el problema directamente con el trabajador a través del chat de la app. Si no hay acuerdo en 2 horas, puede abrir una disputa formal con evidencia fotográfica. El equipo de Chamba revisará ambas versiones y su decisión será definitiva. Las disputas deben abrirse dentro de las 24 horas siguientes a que el trabajador reporte el trabajo como terminado.'
          },
          {
            titulo: '9. Comportamiento en la plataforma',
            texto: 'Queda estrictamente prohibido: compartir datos de contacto fuera de la plataforma, acordar pagos fuera de Chamba, usar lenguaje ofensivo o discriminatorio, crear cuentas falsas o múltiples cuentas. Las violaciones pueden resultar en suspensión permanente del dispositivo y la cuenta.'
          },
          {
            titulo: '10. Privacidad y datos',
            texto: 'Tus datos personales son tratados conforme a nuestra Política de Privacidad. No vendemos ni compartimos tu información con terceros sin tu consentimiento. La ubicación GPS solo se activa durante el servicio activo y se usa exclusivamente para el tracking del trabajo. Guardamos un fingerprint de tu dispositivo por razones de seguridad.'
          },
          {
            titulo: '11. Modificaciones',
            texto: 'Chamba puede modificar estos términos en cualquier momento. Los cambios serán notificados dentro de la app con al menos 7 días de anticipación. El uso continuo de la plataforma después de dicho plazo implica la aceptación de los términos actualizados.'
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
