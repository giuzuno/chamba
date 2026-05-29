export default function Privacidad() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0D0D0D',
      fontFamily: 'sans-serif', color: 'white',
      padding: '40px 24px', maxWidth: '680px', margin: '0 auto'
    }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ color: '#1D9E75', fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>
          chamba
        </h1>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
          Política de Privacidad
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
          Última actualización: Mayo 2026
        </p>
      </div>

      {[
        { titulo: '1. ¿Quién es responsable de tus datos?', contenido: 'Chamba es una plataforma digital operada en Salina Cruz, Oaxaca, México. Para cualquier consulta relacionada con tu privacidad contáctanos en: chambaapp.soporte@gmail.com' },
        { titulo: '2. ¿Qué información recopilamos?', contenido: 'Recopilamos: nombre completo, correo electrónico, foto de perfil, descripción personal, categorías de trabajo, ubicación GPS (solo cuando usas la app activamente), historial de trabajos, calificaciones, mensajes del chat e información del dispositivo. Para choferes: INE, licencia, tarjeta de circulación y seguro vehicular. Chamba no almacena datos de tarjetas de crédito — los pagos son procesados por Conekta.' },
        { titulo: '3. ¿Para qué usamos tu información?', contenido: 'Usamos tu información para: crear y gestionar tu cuenta, conectarte con clientes o trabajadores cercanos, mostrarte en el mapa según tu ubicación, enviarte notificaciones de trabajos, procesar pagos de forma segura, verificar tu identidad como chofer, mejorar la plataforma y cumplir con obligaciones legales.' },
        { titulo: '4. ¿Con quién compartimos tu información?', contenido: 'Chamba nunca vende tu información personal. Solo compartimos datos con: otros usuarios (nombre, foto y calificación), Conekta para procesar pagos, autoridades cuando la ley lo requiera, y proveedores de servicio como Supabase y Vercel bajo acuerdos de confidencialidad. Tu correo electrónico nunca es visible para otros usuarios.' },
        { titulo: '5. Ubicación GPS', contenido: 'Usamos tu ubicación para mostrarte en el mapa, encontrar trabajadores cercanos y hacer seguimiento en tiempo real. Puedes desactivar el GPS desde la configuración de tu celular. Tu ubicación nunca se comparte sin tu consentimiento y solo se activa cuando usas la app activamente.' },
        { titulo: '6. ¿Cómo protegemos tu información?', contenido: 'Todos los datos se transmiten con cifrado HTTPS. Las contraseñas se almacenan encriptadas. Usamos Row Level Security — cada usuario solo ve sus propios datos. Los servidores cumplen con estándares SOC 2 Type 2. Las sesiones expiran automáticamente por seguridad.' },
        { titulo: '7. ¿Cuánto tiempo guardamos tu información?', contenido: 'Tu información se conserva mientras tengas una cuenta activa. Si eliminas tu cuenta, tus datos personales se borran en máximo 30 días. Los registros de transacciones se conservan por 5 años por obligaciones fiscales. Los mensajes de chat se conservan por 1 año para resolver disputas.' },
        { titulo: '8. Tus derechos sobre tu información', contenido: 'Tienes derecho a: acceder a tu información, corregir datos incorrectos, solicitar que eliminemos tus datos, oponerte al uso de tus datos y recibir tus datos en formato descargable. Escríbenos a chambaapp.soporte@gmail.com — respondemos en máximo 20 días hábiles.' },
        { titulo: '9. Menores de edad', contenido: 'Chamba no está dirigida a menores de 18 años. Si descubrimos que un menor ha creado una cuenta sin autorización, la eliminaremos de inmediato. Contáctanos en chambaapp.soporte@gmail.com' },
        { titulo: '10. Chamba como intermediario', contenido: 'Chamba es una plataforma de intermediación — conectamos clientes con trabajadores independientes. Los trabajadores no son empleados de Chamba. Sin embargo, ponemos a disposición un sistema de calificaciones, verificación de identidad y resolución de disputas para proteger a todos.' },
        { titulo: '11. Cambios a esta política', contenido: 'Podemos actualizar esta política en cualquier momento. Te notificaremos por correo y publicaremos la nueva versión en la app. Si los cambios son significativos te pediremos que los aceptes antes de continuar.' },
        { titulo: '12. Ley aplicable', contenido: 'Esta política se rige por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) de los Estados Unidos Mexicanos. Para cualquier disputa las partes se someten a los tribunales de Salina Cruz, Oaxaca, México.' },
        { titulo: '13. Contacto', contenido: 'Preguntas, dudas o quejas: chambaapp.soporte@gmail.com' },
      ].map((seccion, i) => (
        <div key={i} style={{
          marginBottom: '28px', paddingBottom: '28px',
          borderBottom: '0.5px solid rgba(255,255,255,0.08)'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1D9E75', marginBottom: '10px' }}>
            {seccion.titulo}
          </h3>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.7', margin: 0 }}>
            {seccion.contenido}
          </p>
        </div>
      ))}

      <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px' }}>
        <p style={{ color: '#1D9E75', fontSize: '20px', fontWeight: '800' }}>chamba</p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Lo que necesitas, cerca de ti</p>
      </div>
    </div>
  )
}