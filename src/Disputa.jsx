import { useState } from 'react'
import { supabase } from './supabaseClient'

const MOTIVOS = [
  { id: 'no_llego', icon: '🚫', label: 'El trabajador no llegó' },
  { id: 'trabajo_incompleto', icon: '⚠️', label: 'El trabajo quedó incompleto' },
  { id: 'trabajo_mal_hecho', icon: '❌', label: 'El trabajo quedó mal hecho' },
  { id: 'dano_propiedad', icon: '🏚️', label: 'Dañó mi propiedad' },
  { id: 'cobro_extra', icon: '💸', label: 'Cobró más de lo acordado' },
  { id: 'otro', icon: '📝', label: 'Otro motivo' },
]

export default function Disputa({ trabajo, userId, onVolver, onDisputaAbierta }) {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [evidenciaUrl, setEvidenciaUrl] = useState(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function subirEvidencia(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendoFoto(true)
    const ext = file.name.split('.').pop()
    const path = `disputas/${trabajo.id}/${userId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatares')
      .upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      setEvidenciaUrl(data.publicUrl)
    }
    setSubiendoFoto(false)
  }

  async function abrirDisputa() {
    if (!motivoSeleccionado) { setError('Selecciona un motivo'); return }
    if (!descripcion.trim()) { setError('Describe qué pasó'); return }
    setLoading(true)
    setError('')

    // Crear disputa
    await supabase.from('disputas').insert({
      trabajo_id: trabajo.id,
      cliente_id: userId,
      trabajador_id: trabajo.trabajador_id,
      motivo: motivoSeleccionado,
      descripcion: descripcion.trim(),
      evidencia_url: evidenciaUrl,
      status: 'abierta',
    })

    // Marcar trabajo en disputa
    await supabase.from('trabajos').update({
      en_disputa: true,
      status: 'en_disputa',
    }).eq('id', trabajo.id)

    // Notificar al trabajador
    if (trabajo.trabajador_id) {
      const { data: trabajadorData } = await supabase
        .from('usuarios').select('fcm_token')
        .eq('id', trabajo.trabajador_id).maybeSingle()

      if (trabajadorData?.fcm_token) {
        await supabase.functions.invoke('enviar-notificacion', {
          body: {
            token: trabajadorData.fcm_token,
            titulo: '⚠️ El cliente abrió una disputa',
            cuerpo: `El cliente reportó un problema con tu ${trabajo.categoria}. Chamba revisará el caso.`,
          }
        })
      }
    }

    setLoading(false)
    onDisputaAbierta()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Reportar problema</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Info del trabajo */}
        <div style={{ background: 'rgba(240,149,149,0.08)', border: '0.5px solid rgba(240,149,149,0.2)', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '600' }}>{trabajo.categoria}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{trabajo.descripcion}</p>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#F09595' }}>
            ${trabajo.precio_acordado || trabajo.presupuesto} MXN
          </span>
        </div>

        {/* Aviso */}
        <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#E8A030', lineHeight: '1.6' }}>
          ⚠️ Al abrir una disputa, el pago quedará retenido hasta que Chamba resuelva el caso. Esto puede tomar hasta 48 horas.
        </div>

        {/* Motivo */}
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ¿Qué pasó?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {MOTIVOS.map(m => (
              <button key={m.id} type="button" onClick={() => { setMotivoSeleccionado(m.id); setError('') }} style={{
                padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                fontFamily: 'sans-serif', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px',
                background: motivoSeleccionado === m.id ? 'rgba(240,149,149,0.15)' : 'rgba(255,255,255,0.05)',
                outline: motivoSeleccionado === m.id ? '1.5px solid #F09595' : '0.5px solid rgba(255,255,255,0.1)',
              }}>
                <span style={{ fontSize: '20px' }}>{m.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: motivoSeleccionado === m.id ? '600' : '400', color: motivoSeleccionado === m.id ? '#F09595' : 'rgba(255,255,255,0.8)' }}>
                  {m.label}
                </span>
                {motivoSeleccionado === m.id && (
                  <span style={{ marginLeft: 'auto', color: '#F09595', fontSize: '16px' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Descripción */}
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Describe qué pasó *
          </p>
          <textarea
            placeholder="Explica con detalle qué salió mal. Cuanta más información, mejor podemos ayudarte..."
            value={descripcion}
            onChange={e => { setDescripcion(e.target.value); setError('') }}
            rows={4}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              borderRadius: '12px', padding: '14px 16px',
              color: 'white', fontSize: '14px',
              fontFamily: 'sans-serif', resize: 'none', outline: 'none'
            }}
          />
        </div>

        {/* Foto de evidencia */}
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Foto de evidencia (opcional)
          </p>
          {evidenciaUrl ? (
            <div style={{ position: 'relative' }}>
              <img src={evidenciaUrl} alt="evidencia" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px', border: '0.5px solid rgba(29,158,117,0.3)' }} />
              <button type="button" onClick={() => setEvidenciaUrl(null)} style={{
                position: 'absolute', top: '8px', right: '8px',
                background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none',
                borderRadius: '50%', width: '28px', height: '28px',
                cursor: 'pointer', fontSize: '14px', fontFamily: 'sans-serif'
              }}>✕</button>
            </div>
          ) : (
            <label style={{
              display: 'block', padding: '20px', background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px',
              textAlign: 'center', cursor: 'pointer',
              fontSize: '13px', color: 'rgba(255,255,255,0.4)'
            }}>
              {subiendoFoto ? '⏳ Subiendo...' : '📷 Toca para subir foto del problema'}
              <input type="file" accept="image/*" onChange={subirEvidencia} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {error && (
          <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>
        )}

        {/* Separador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'rgba(255,255,255,0.1)', letterSpacing: '4px', fontSize: '10px' }}>∴</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <button type="button" onClick={abrirDisputa} disabled={loading} style={{
          width: '100%', padding: '16px',
          background: loading ? 'rgba(240,149,149,0.4)' : '#F09595',
          color: 'white', border: 'none', borderRadius: '14px',
          fontSize: '16px', fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'sans-serif'
        }}>
          {loading ? 'Enviando reporte...' : '⚠️ Abrir disputa'}
        </button>

        <button type="button" onClick={onVolver} style={{
          width: '100%', padding: '14px', background: 'transparent',
          color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)',
          borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif'
        }}>
          Cancelar
        </button>

      </div>
    </div>
  )
}