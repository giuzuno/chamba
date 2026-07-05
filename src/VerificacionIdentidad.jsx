import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const DOCUMENTOS = [
  { key: 'ine_url', icon: '🪪', label: 'INE vigente', desc: 'Identificación oficial, ambos lados en una sola foto o composición', requerido: true },
  { key: 'selfie_url', icon: '🤳', label: 'Selfie con tu INE', desc: 'Foto de tu rostro sosteniendo tu INE junto a tu cara', requerido: true },
]

export default function VerificacionIdentidad({ userId, onVolver, onCompletado }) {
  const [paso, setPaso] = useState(1)
  const [verificacion, setVerificacion] = useState(null)
  const [archivos, setArchivos] = useState({})
  const [subiendo, setSubiendo] = useState({})
  const [aceptoTerminos, setAceptoTerminos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarVerificacion()
  }, [])

  async function cargarVerificacion() {
    const { data } = await supabase
      .from('verificaciones')
      .select('*')
      .eq('usuario_id', userId)
      .maybeSingle()
    if (data) setVerificacion(data)
    setLoading(false)
  }

  async function subirDocumento(key, file) {
    setSubiendo(prev => ({ ...prev, [key]: true }))
    const ext = file.name.split('.').pop()
    const path = `verificaciones/${userId}/${key}.${ext}`
    const { error } = await supabase.storage
      .from('avatares')
      .upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      setArchivos(prev => ({ ...prev, [key]: data.publicUrl }))
    }
    setSubiendo(prev => ({ ...prev, [key]: false }))
  }

  async function enviarVerificacion() {
    if (!aceptoTerminos) return
    setGuardando(true)

    const datosVerificacion = {
      usuario_id: userId,
      tipo: 'identidad',
      status: 'pendiente',
      ine_url: archivos.ine_url || null,
      selfie_url: archivos.selfie_url || null,
    }

    const { error } = await supabase.from('verificaciones').upsert(datosVerificacion)

    setGuardando(false)
    if (!error) onCompletado()
  }

  const documentosRequeridos = DOCUMENTOS.filter(d => d.requerido)
  const todosSubidos = documentosRequeridos.every(d => archivos[d.key])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>
      Cargando...
    </div>
  )

  // Ya tiene verificación enviada
  if (verificacion) {
    const statusConfig = {
      pendiente: { color: '#E8A030', bg: 'rgba(186,117,23,0.1)', border: 'rgba(186,117,23,0.3)', icon: '⏳', texto: 'En revisión' },
      aprobado: { color: '#1D9E75', bg: 'rgba(29,158,117,0.1)', border: 'rgba(29,158,117,0.3)', icon: '✅', texto: 'Identidad verificada' },
      rechazado: { color: '#F09595', bg: 'rgba(240,149,149,0.1)', border: 'rgba(240,149,149,0.3)', icon: '❌', texto: 'Rechazado' },
    }
    const s = statusConfig[verificacion.status] || statusConfig.pendiente

    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Verificación de identidad</h2>
        </div>

        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px' }}>{s.icon}</div>
          <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '16px', padding: '20px 24px' }}>
            <p style={{ fontSize: '20px', fontWeight: '700', color: s.color, marginBottom: '8px' }}>{s.texto}</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
              {verificacion.status === 'pendiente' && 'Tus documentos están siendo revisados. Puede tomar hasta 24 horas.'}
              {verificacion.status === 'aprobado' && '¡Ya cuentas con la insignia de identidad verificada en tu perfil!'}
              {verificacion.status === 'rechazado' && `Tus documentos fueron rechazados. ${verificacion.notas_admin || 'Revisa que sean legibles y estén vigentes.'}`}
            </p>
          </div>

          {verificacion.status === 'rechazado' && (
            <button type="button" onClick={() => setVerificacion(null)} style={{
              background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px',
              padding: '14px 28px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif'
            }}>
              Volver a enviar documentos
            </button>
          )}

          <button type="button" onClick={onVolver} style={{
            background: 'transparent', color: 'rgba(255,255,255,0.4)',
            border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px',
            padding: '12px 24px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif'
          }}>
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Verificación de identidad</h2>
      </div>

      {/* Paso 1: Intro */}
      {paso === 1 && (
        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px' }}>🪪</div>
          <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Verifica tu identidad</h3>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
            Esto genera confianza con los clientes y te da la insignia de "Identidad verificada" en tu perfil.
            Necesitamos tu INE y una selfie sosteniéndola.
          </p>
          <button type="button" onClick={() => setPaso(2)} style={{
            width: '100%', padding: '15px', background: '#1D9E75', color: 'white',
            border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'sans-serif'
          }}>
            Comenzar →
          </button>
        </div>
      )}

      {/* Paso 2: Documentos */}
      {paso === 2 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
            Sube fotos claras. Deben ser legibles y estar vigentes.
          </p>

          {DOCUMENTOS.map(doc => {
            const subido = archivos[doc.key]
            const cargando = subiendo[doc.key]
            return (
              <div key={doc.key} style={{
                background: subido ? 'rgba(29,158,117,0.08)' : 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${subido ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '14px', padding: '14px 16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: subido ? '10px' : '0' }}>
                  <span style={{ fontSize: '24px' }}>{doc.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: subido ? '#1D9E75' : 'white' }}>{doc.label}</p>
                      {doc.requerido && !subido && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(240,149,149,0.1)', color: '#F09595' }}>
                          Requerido
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{doc.desc}</p>
                  </div>
                  {subido && <span style={{ color: '#1D9E75', fontSize: '18px', flexShrink: 0 }}>✅</span>}
                </div>

                {subido ? (
                  <img src={subido} alt={doc.label} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '4px' }} />
                ) : (
                  <label style={{
                    display: 'block', marginTop: '10px', padding: '10px',
                    background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
                    fontSize: '13px', color: 'rgba(255,255,255,0.4)'
                  }}>
                    {cargando ? '⏳ Subiendo...' : '📁 Toca para subir foto'}
                    <input
                      type="file" accept="image/*"
                      onChange={e => { if (e.target.files[0]) subirDocumento(doc.key, e.target.files[0]) }}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            )
          })}

          <button type="button" onClick={() => setPaso(3)} disabled={!todosSubidos} style={{
            width: '100%', padding: '15px', marginTop: '8px',
            background: todosSubidos ? '#1D9E75' : 'rgba(255,255,255,0.08)',
            color: todosSubidos ? 'white' : 'rgba(255,255,255,0.3)',
            border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600',
            cursor: todosSubidos ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif'
          }}>
            {todosSubidos ? 'Continuar →' : `Faltan documentos (${documentosRequeridos.filter(d => !archivos[d.key]).length})`}
          </button>
        </div>
      )}

      {/* Paso 3: Términos */}
      {paso === 3 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '20px'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: '#1D9E75' }}>
              Verificación de identidad — Chamba
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.7' }}>
              Declaro que la información y documentos proporcionados son auténticos y vigentes.
              Entiendo que subir documentos falsos o alterados resultará en la cancelación
              permanente de mi cuenta y podrá ser reportado a las autoridades correspondientes.
              Mis documentos serán usados únicamente para fines de verificación de identidad
              dentro de la plataforma Chamba.
            </p>
          </div>

          <button type="button" onClick={() => setAceptoTerminos(!aceptoTerminos)} style={{
            padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif',
            background: aceptoTerminos ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.04)',
            outline: aceptoTerminos ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left'
          }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
              background: aceptoTerminos ? '#1D9E75' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', color: 'white'
            }}>
              {aceptoTerminos ? '✓' : ''}
            </div>
            <p style={{ fontSize: '13px', color: aceptoTerminos ? '#1D9E75' : 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
              Acepto y declaro que mis documentos son auténticos
            </p>
          </button>

          <button type="button" onClick={enviarVerificacion} disabled={!aceptoTerminos || guardando} style={{
            width: '100%', padding: '15px',
            background: aceptoTerminos ? '#1D9E75' : 'rgba(255,255,255,0.08)',
            color: aceptoTerminos ? 'white' : 'rgba(255,255,255,0.3)',
            border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600',
            cursor: aceptoTerminos ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif'
          }}>
            {guardando ? 'Enviando...' : '✅ Enviar verificación'}
          </button>

          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: '1.5' }}>
            La verificación puede tomar hasta 24 horas.
          </p>
        </div>
      )}
    </div>
  )
}