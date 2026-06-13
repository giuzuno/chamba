import { useState } from 'react'
import { supabase } from './supabaseClient'
import { enviarNotificacionCompleta } from './guardarNotificacion'

const ADMIN_ID = '72dd9af7-1597-4175-b5ec-febde2306fd3'

export default function BotonPanico({ trabajo, userId, rol, contactoEmergenciaTelefono, contactoEmergenciaNombre }) {
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  function obtenerUbicacion() {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        pos => resolve([pos.coords.latitude, pos.coords.longitude]),
        () => resolve([trabajo.lat, trabajo.lng])
      )
    })
  }

  async function activarPanico() {
    setEnviando(true)
    const [lat, lng] = await obtenerUbicacion()

    // Guardar alerta en BD
    await supabase.from('alertas_panico').insert({
      trabajo_id: trabajo.id,
      usuario_id: userId,
      rol,
      lat, lng,
    })

    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`
    const tituloAdmin = `🆘 ALERTA SOS — ${rol === 'cliente' ? 'Cliente' : 'Trabajador'}`
    const cuerpoAdmin = `Trabajo #${trabajo.id} (${trabajo.categoria}). Ubicación: ${mapsLink}`

    // Notificar al admin
    try {
      await enviarNotificacionCompleta({
        usuarioId: ADMIN_ID,
        titulo: tituloAdmin,
        cuerpo: cuerpoAdmin,
        tipo: 'general',
        trabajoId: trabajo.id,
      })
    } catch (e) { console.log('Error notificando admin:', e) }

    // Notificar a la otra parte del trabajo (cliente <-> trabajador) por seguridad
    try {
      const otroId = rol === 'cliente' ? trabajo.trabajador_id : trabajo.cliente_id
      if (otroId) {
        await enviarNotificacionCompleta({
          usuarioId: otroId,
          titulo: '🆘 Alerta de seguridad activada',
          cuerpo: 'La otra persona activó el botón de pánico. El equipo de Chamba fue notificado.',
          tipo: 'general',
          trabajoId: trabajo.id,
        })
      }
    } catch (e) { console.log('Error notificando contraparte:', e) }

    // Abrir WhatsApp al contacto de emergencia
    if (contactoEmergenciaTelefono) {
      const tel = contactoEmergenciaTelefono.replace(/\D/g, '')
      const msg = encodeURIComponent(`🆘 EMERGENCIA — Activé el botón de pánico en Chamba. Mi ubicación: ${mapsLink}`)
      window.open(`https://wa.me/52${tel}?text=${msg}`, '_blank')
    }

    setEnviando(false)
    setEnviado(true)
    setTimeout(() => { setEnviado(false); setConfirmando(false) }, 4000)
  }

  return (
    <>
      <button type="button" onClick={() => setConfirmando(true)}
        style={{ width: '100%', padding: '12px', marginBottom: '8px', background: 'rgba(240,80,80,0.12)', color: '#FF5C5C', border: '1.5px solid rgba(240,80,80,0.4)', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        🆘 Botón de pánico / SOS
      </button>

      {confirmando && (
        <div onClick={() => !enviando && setConfirmando(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1A1A', border: '1.5px solid rgba(240,80,80,0.4)', borderRadius: '20px', padding: '24px', maxWidth: '340px', width: '100%', textAlign: 'center' }}>
            {enviado ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <h3 style={{ color: '#1D9E75', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Alerta enviada</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>El equipo de Chamba y la otra persona fueron notificados con tu ubicación.</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🆘</div>
                <h3 style={{ color: '#FF5C5C', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>¿Activar alerta SOS?</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
                  Se enviará tu ubicación actual al equipo de Chamba{contactoEmergenciaTelefono ? `, a la otra persona del viaje, y abriremos WhatsApp con ${contactoEmergenciaNombre || 'tu contacto de emergencia'}` : ' y a la otra persona del viaje'}.
                </p>
                <button type="button" onClick={activarPanico} disabled={enviando}
                  style={{ width: '100%', padding: '14px', background: '#FF5C5C', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif', marginBottom: '10px' }}>
                  {enviando ? 'Enviando...' : '🆘 Sí, activar SOS'}
                </button>
                <button type="button" onClick={() => setConfirmando(false)} disabled={enviando}
                  style={{ width: '100%', padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
