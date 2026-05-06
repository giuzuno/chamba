import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const DOCUMENTOS = [
  { key: 'ine_url', icon: '🪪', label: 'INE vigente', desc: 'Identificación oficial por ambos lados', requerido: true },
  { key: 'licencia_url', icon: '🚗', label: 'Licencia de conducir', desc: 'Vigente y del tipo correcto para tu vehículo', requerido: true },
  { key: 'circulacion_url', icon: '📋', label: 'Tarjeta de circulación', desc: 'Del vehículo que usarás', requerido: true },
  { key: 'foto_vehiculo_url', icon: '📸', label: 'Foto del vehículo', desc: 'Foto clara del frente mostrando placas', requerido: true },
  { key: 'seguro_url', icon: '🛡️', label: 'Seguro del vehículo', desc: 'Opcional — mejora la confianza del cliente', requerido: false },
]

const TIPOS_VEHICULO = [
  { id: 'auto', icon: '🚕', label: 'Auto' },
  { id: 'moto', icon: '🏍️', label: 'Motocicleta' },
  { id: 'pickup', icon: '🛻', label: 'Pickup / Camioneta' },
  { id: 'camion', icon: '🚛', label: 'Camión / Flete' },
]

export default function VerificacionChofer({ userId, onVolver, onCompletado }) {
  const [paso, setPaso] = useState(1)
  const [verificacion, setVerificacion] = useState(null)
  const [tipoVehiculo, setTipoVehiculo] = useState('')
  const [tieneSegugo, setTieneSeguro] = useState(false)
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
      tipo: tipoVehiculo,
      status: 'pendiente',
      tiene_seguro: tieneSegugo,
      ine_url: archivos.ine_url || null,
      licencia_url: archivos.licencia_url || null,
      circulacion_url: archivos.circulacion_url || null,
      foto_vehiculo_url: archivos.foto_vehiculo_url || null,
      seguro_url: archivos.seguro_url || null,
    }

    const { error } = await supabase.from('verificaciones').upsert(datosVerificacion)

    if (!error) {
      await supabase.from('usuarios').update({
        tipo_vehiculo: tipoVehiculo,
        tiene_seguro: tieneSegugo,
      }).eq('id', userId)
    }

    setGuardando(false)
    onCompletado()
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
      aprobado: { color: '#1D9E75', bg: 'rgba(29,158,117,0.1)', border: 'rgba(29,158,117,0.3)', icon: '✅', texto: 'Verificado' },
      rechazado: { color: '#F09595', bg: 'rgba(240,149,149,0.1)', border: 'rgba(240,149,149,0.3)', icon: '❌', texto: 'Rechazado' },
    }
    const s = statusConfig[verificacion.status] || statusConfig.pendiente

    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Verificación de chofer</h2>
        </div>

        <div style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px' }}>{s.icon}</div>
          <div style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: '16px', padding: '20px 24px'
          }}>
            <p style={{ fontSize: '20px', fontWeight: '700', color: s.color, marginBottom: '8px' }}>
              {s.texto}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
              {verificacion.status === 'pendiente' && 'Tus documentos están siendo revisados. Te notificaremos cuando estén aprobados — puede tomar hasta 24 horas.'}
              {verificacion.status === 'aprobado' && '¡Ya puedes ofrecer servicios de chofer en Chamba! Aparecerás como verificado en tu perfil.'}
              {verificacion.status === 'rechazado' && `Tus documentos fueron rechazados. ${verificacion.notas_admin || 'Por favor revisa que los documentos sean legibles y estén vigentes.'}`}
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
            Volver al perfil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={paso === 1 ? onVolver : () => setPaso(p => p - 1)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
            {paso === 1 ? '🚗 Verificación de chofer' :
             paso === 2 ? '📄 Sube tus documentos' :
             '📋 Términos y condiciones'}
          </h2>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            Paso {paso} de 3
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ width: '8px', height: '8px', borderRadius: '50%', background: n <= paso ? '#1D9E75' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
      </div>

      {/* ── Paso 1: Tipo de vehículo ── */}
      {paso === 1 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)',
            borderRadius: '14px', padding: '14px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6'
          }}>
            🔐 Para ofrecer servicios de taxi, mototaxi, repartidor o flete necesitas verificar tu identidad y vehículo. El proceso toma menos de 5 minutos.
          </div>

          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
            ¿Con qué vehículo trabajarás?
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {TIPOS_VEHICULO.map(v => (
              <button key={v.id} type="button" onClick={() => setTipoVehiculo(v.id)} style={{
                padding: '20px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif',
                background: tipoVehiculo === v.id ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                outline: tipoVehiculo === v.id ? '2px solid #1D9E75' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ fontSize: '32px' }}>{v.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: tipoVehiculo === v.id ? '#1D9E75' : 'white' }}>
                  {v.label}
                </span>
              </button>
            ))}
          </div>

          {/* Seguro */}
          <button type="button" onClick={() => setTieneSeguro(!tieneSegugo)} style={{
            padding: '14px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'sans-serif',
            background: tieneSegugo ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.04)',
            outline: tieneSegugo ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left'
          }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: tieneSegugo ? '#1D9E75' : 'white', marginBottom: '2px' }}>
                Mi vehículo tiene seguro
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                Opcional — genera más confianza con los clientes
              </p>
            </div>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
              background: tieneSegugo ? '#1D9E75' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', color: 'white'
            }}>
              {tieneSegugo ? '✓' : ''}
            </div>
          </button>

          {!tieneSegugo && (
            <div style={{
              background: 'rgba(240,149,149,0.06)', border: '0.5px solid rgba(240,149,149,0.2)',
              borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5'
            }}>
              ⚠️ Sin seguro — los clientes verán este aviso antes de contratarte. El servicio se presta bajo responsabilidad del chofer y cliente.
            </div>
          )}

          <button type="button" onClick={() => setPaso(2)} disabled={!tipoVehiculo} style={{
            width: '100%', padding: '15px', marginTop: '8px',
            background: tipoVehiculo ? '#1D9E75' : 'rgba(255,255,255,0.08)',
            color: tipoVehiculo ? 'white' : 'rgba(255,255,255,0.3)',
            border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '600',
            cursor: tipoVehiculo ? 'pointer' : 'not-allowed', fontFamily: 'sans-serif'
          }}>
            Continuar →
          </button>
        </div>
      )}

      {/* ── Paso 2: Documentos ── */}
      {paso === 2 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
            Sube fotos claras de tus documentos. Deben ser legibles y estar vigentes.
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
                      <p style={{ fontSize: '14px', fontWeight: '600', color: subido ? '#1D9E75' : 'white' }}>
                        {doc.label}
                      </p>
                      {!doc.requerido && (
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
                          Opcional
                        </span>
                      )}
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
            {todosSubidos ? 'Continuar →' : `Faltan documentos requeridos (${documentosRequeridos.filter(d => !archivos[d.key]).length})`}
          </button>
        </div>
      )}

      {/* ── Paso 3: Términos ── */}
      {paso === 3 && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '20px', maxHeight: '340px', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: '#1D9E75' }}>
              Términos y Condiciones — Choferes Chamba
            </h3>

            {[
              { titulo: '1. Naturaleza del servicio', texto: 'Chamba es una plataforma tecnológica de intermediación. No es una empresa de transporte ni de mensajería. Chamba conecta a usuarios que necesitan servicios con personas que los ofrecen, sin ser parte de la relación contractual entre ellos.' },
              { titulo: '2. Responsabilidad del chofer', texto: 'El chofer es responsable de operar con todos los documentos en regla exigidos por la ley mexicana, incluyendo licencia de conducir vigente y tarjeta de circulación actualizada. El incumplimiento de leyes de tránsito o normativas locales es responsabilidad exclusiva del chofer.' },
              { titulo: '3. Seguro del vehículo', texto: 'El seguro del vehículo es responsabilidad exclusiva del chofer. Chamba no cubre daños a terceros, al vehículo, ni al cliente en caso de accidente. Si el chofer no cuenta con seguro, el cliente será notificado antes de contratar el servicio.' },
              { titulo: '4. Responsabilidad del cliente', texto: 'El cliente acepta contratar el servicio bajo su propio riesgo. Al confirmar un viaje o servicio, el cliente declara haber leído y aceptado estos términos, incluyendo los avisos sobre la ausencia de seguro cuando aplique.' },
              { titulo: '5. Limitación de responsabilidad de Chamba', texto: 'Chamba no se hace responsable por accidentes, daños materiales, pérdidas, retrasos, lesiones o cualquier perjuicio derivado de la prestación del servicio entre chofer y cliente. La plataforma actúa únicamente como intermediario tecnológico.' },
              { titulo: '6. Veracidad de documentos', texto: 'El chofer declara que todos los documentos subidos son auténticos y vigentes. Subir documentos falsos o alterados resultará en la cancelación permanente de la cuenta y podrá ser reportado a las autoridades.' },
              { titulo: '7. Comisión de Chamba', texto: 'Chamba cobra una comisión del 12% sobre el precio acordado de cada servicio completado. Esta comisión cubre el uso de la plataforma, el sistema de pagos y el soporte.' },
            ].map(item => (
              <div key={item.titulo} style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>{item.titulo}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.7' }}>{item.texto}</p>
              </div>
            ))}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', paddingTop: '16px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ color: 'rgba(255,255,255,0.08)', letterSpacing: '4px', fontSize: '10px' }}>∴ 👁 ∴</div>
            </div>
          </div>

          {/* Checkbox aceptar */}
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
              He leído y acepto los Términos y Condiciones de Chamba para choferes
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
            La verificación puede tomar hasta 24 horas. Te notificaremos cuando esté lista.
          </p>
        </div>
      )}

    </div>
  )
}