import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { sanitizarCampo, sanitizarDescripcion, tieneInyeccionSQL } from './sanitize'
import CambiarContrasena from './CambiarContrasena'

function EstrellaRating({ rating }) {
  if (!rating) return <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)' }}>Sin calificaciones</span>
  const llenas = Math.floor(rating)
  const media = rating % 1 >= 0.5
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: '16px', color: i <= llenas ? '#F5A623' : (i === llenas + 1 && media) ? '#F5A623' : 'rgba(255,255,255,0.2)' }}>
          {i <= llenas ? '★' : (i === llenas + 1 && media) ? '⭐' : '☆'}
        </span>
      ))}
      <span style={{ fontSize: '14px', fontWeight: '700', color: '#F5A623', marginLeft: '4px' }}>{rating}</span>
    </div>
  )
}

export default function PerfilCliente({ userId, userEmail, onVolver }) {
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [fotoUrl, setFotoUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [exito, setExito] = useState(false)
  const [errores, setErrores] = useState({})
  const [editando, setEditando] = useState(false)
  const [pestana, setPestana] = useState('info')
  const [ratingReal, setRatingReal] = useState(null)
  const [totalCalificaciones, setTotalCalificaciones] = useState(0)
  const [resenas, setResenas] = useState([])
  const [totalTrabajos, setTotalTrabajos] = useState(0)
  const [historialPagos, setHistorialPagos] = useState([])
  const [gastoTotal, setGastoTotal] = useState(0)
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState('')
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  useEffect(() => {
    cargarPerfil()
    cargarStats()
  }, [])

  async function cargarPerfil() {
    const { data } = await supabase.from('usuarios').select('*').eq('id', userId).maybeSingle()
    if (data) {
      setNombre(data.nombre || '')
      setBio(data.bio || '')
      setFotoUrl(data.foto_url || null)
      setContactoEmergenciaNombre(data.contacto_emergencia_nombre || '')
      setContactoEmergenciaTelefono(data.contacto_emergencia_telefono || '')
    } else {
      setEditando(true)
    }
    setLoading(false)
  }

  async function cargarStats() {
    // Calificaciones como cliente
    const { data: cals } = await supabase.from('calificaciones')
      .select('estrellas, comentario, creado_en')
      .eq('calificado_id', userId)
      .eq('rol_calificador', 'trabajador')
      .order('creado_en', { ascending: false })
    if (cals && cals.length > 0) {
      const promedio = cals.reduce((acc, c) => acc + c.estrellas, 0) / cals.length
      setRatingReal(parseFloat(promedio.toFixed(1)))
      setTotalCalificaciones(cals.length)
      setResenas(cals.filter(c => c.comentario))
    }
    // Todos los trabajos del cliente para estado de cuenta completo
    const { data: pagos } = await supabase.from('trabajos')
      .select('id, categoria, descripcion, precio_acordado, presupuesto, creado_en, trabajador_id, status')
      .eq('cliente_id', userId)
      .order('creado_en', { ascending: false })
    if (pagos) {
      const completados = pagos.filter(t => t.status === 'completado')
      setTotalTrabajos(completados.length)
      setHistorialPagos(pagos)
      const total = completados.reduce((acc, t) => acc + (t.precio_acordado || t.presupuesto || 0), 0)
      setGastoTotal(total)
    }
  }

  async function subirFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendoFoto(true)
    const path = `${userId}/perfil.jpg`
    const { error: uploadError } = await supabase.storage.from('avatares').upload(path, file, { upsert: true, contentType: file.type })
    if (!uploadError) {
      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      const urlConCache = `${data.publicUrl}?t=${Date.now()}`
      setFotoUrl(urlConCache)
      setErrores(p => ({ ...p, foto: null }))
      await supabase.from('usuarios').upsert({ id: userId, foto_url: urlConCache })
    }
    setSubiendoFoto(false)
  }

  function validar() {
    const e = {}
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!fotoUrl) e.foto = 'La foto de perfil es obligatoria'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardarPerfil() {
    if (!validar()) return
    if (tieneInyeccionSQL(nombre) || tieneInyeccionSQL(bio)) {
      setErrores(p => ({ ...p, nombre: 'Contenido no válido detectado' }))
      return
    }
    setGuardando(true)
    await supabase.from('usuarios').upsert({
      id: userId, email: userEmail, 
      nombre: sanitizarCampo(nombre), 
      bio: sanitizarDescripcion(bio),
      contacto_emergencia_nombre: contactoEmergenciaNombre,
      contacto_emergencia_telefono: contactoEmergenciaTelefono,
    })
    setExito(true)
    setTimeout(() => setExito(false), 3000)
    setGuardando(false)
    setEditando(false)
  }

  function cancelarEdicion() {
    setEditando(false)
    setErrores({})
    cargarPerfil()
  }

  const iniciales = nombre
    ? nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() || '?'

  const inputStyle = (error) => ({
    width: '100%',
    background: editando ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
    border: `0.5px solid ${error ? '#F09595' : editando ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: '12px', padding: '14px 16px',
    color: editando ? 'white' : 'rgba(255,255,255,0.7)',
    fontSize: '15px', fontFamily: 'sans-serif', outline: 'none',
    cursor: editando ? 'text' : 'default',
  })

  if (cambiandoPassword) {
    return (
      <CambiarContrasena
        onVolver={() => setCambiandoPassword(false)}
        onCompletado={() => setCambiandoPassword(false)}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Perfil cliente</h2>
        {!editando && !loading && (
          <button type="button" onClick={() => setEditando(true)} style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '10px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            ✏️ Editar
          </button>
        )}
        {editando && <span style={{ fontSize: '12px', color: '#E8A030', fontWeight: '500' }}>Editando</span>}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>
      ) : (
        <>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '24px 20px 0' }}>
            <div style={{ position: 'relative' }}>
              {fotoUrl ? (
                <img src={fotoUrl} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${errores.foto ? '#F09595' : 'rgba(55,138,221,0.4)'}` }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: errores.foto ? 'linear-gradient(135deg,#F09595,#c06060)' : 'linear-gradient(135deg, #378ADD, #1a5fa8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: 'white', border: `3px solid ${errores.foto ? '#F09595' : 'rgba(55,138,221,0.4)'}` }}>
                  {iniciales}
                </div>
              )}
              {editando && (
                <label style={{ position: 'absolute', bottom: 0, right: 0, background: errores.foto ? '#F09595' : '#378ADD', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', border: '2px solid #0D0D0D' }}>
                  {subiendoFoto ? '⏳' : '📷'}
                  <input type="file" accept="image/*" onChange={subirFoto} style={{ display: 'none' }} />
                </label>
              )}
            </div>
            {errores.foto && editando && (
              <p style={{ color: '#F09595', fontSize: '12px', textAlign: 'center' }}>📷 {errores.foto}</p>
            )}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: '600' }}>{nombre || 'Sin nombre'}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{userEmail?.replace(/(.{2}).*(@.*)/, '$1***$2')}</p>
            </div>
            <div style={{ background: 'rgba(29,158,117,0.1)', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '100px', padding: '4px 14px', fontSize: '12px', color: '#1D9E75', fontWeight: '600' }}>
              🛍️ Modo cliente
            </div>
          </div>

          {/* Pestañas */}
          <div style={{ display: 'flex', gap: '4px', padding: '16px 20px 0' }}>
            {[['info', 'Mi info'], ['pagos', `💳 Pagos${totalTrabajos > 0 ? ` (${totalTrabajos})` : ''}`], ['resenas', `Reseñas${totalCalificaciones > 0 ? ` (${totalCalificaciones})` : ''}`]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setPestana(key)} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '10px', background: pestana === key ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: pestana === key ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: pestana === key ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {!fotoUrl && !editando && (
            <div style={{ background: 'rgba(232,160,48,0.08)', border: '1px solid rgba(232,160,48,0.3)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📷</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', color: '#E8A030', fontWeight: '600', marginBottom: '2px' }}>Agrega una foto de perfil</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Los trabajadores confían más en clientes con foto</p>
              </div>
              <button type="button" onClick={() => setEditando(true)} style={{ background: '#E8A030', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Agregar
              </button>
            </div>
          )}

          {exito && (
              <div style={{ background: 'rgba(29,158,117,0.12)', border: '0.5px solid rgba(29,158,117,0.4)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#5DCAA5', textAlign: 'center' }}>
                ✅ Perfil guardado
              </div>
            )}

            {pestana === 'info' && (
              <>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre completo *</p>
                  <input type="text" placeholder="Tu nombre completo" value={nombre}
                    onChange={e => { setNombre(e.target.value); setErrores(p => ({ ...p, nombre: null })) }}
                    disabled={!editando} style={inputStyle(errores.nombre)}
                  />
                  {errores.nombre && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '4px' }}>{errores.nombre}</p>}
                </div>

                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sobre mí</p>
                  <textarea placeholder="Cuéntanos algo sobre ti..."
                    value={bio} onChange={e => setBio(e.target.value)}
                    rows={3} disabled={!editando} style={{ ...inputStyle(false), resize: 'none' }}
                  />
                </div>
                
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🆘 Contacto de emergencia</p>
                  <input type="text" placeholder="Nombre del contacto" value={contactoEmergenciaNombre}
                    onChange={e => setContactoEmergenciaNombre(e.target.value)}
                    disabled={!editando} style={{ ...inputStyle(false), marginBottom: '8px' }}
                  />
                  <input type="tel" placeholder="Teléfono (10 dígitos)" value={contactoEmergenciaTelefono}
                    onChange={e => setContactoEmergenciaTelefono(e.target.value)}
                    disabled={!editando} style={inputStyle(false)}
                  />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>Se usará solo si activas el botón de pánico durante un viaje.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                    {ratingReal ? <EstrellaRating rating={ratingReal} /> : <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Sin calificar</p>}
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>Como cliente</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#1D9E75' }}>{totalTrabajos}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Completados</p>
                  </div>
                </div>
              </>
            )}

            {pestana === 'pagos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Resumen 4 tarjetas */}
                {(() => {
                  const completados = historialPagos.filter(t => t.status === 'completado')
                  const enProceso = historialPagos.filter(t => ['aceptado','en_revision','publicado'].includes(t.status))
                  const cancelados = historialPagos.filter(t => t.status === 'cancelado')
                  const enDisputa = historialPagos.filter(t => t.status === 'en_disputa')
                  const totalCompletado = completados.reduce((a, t) => a + (t.precio_acordado || t.presupuesto || 0), 0)
                  const totalProceso = enProceso.reduce((a, t) => a + (t.precio_acordado || t.presupuesto || 0), 0)
                  const totalCancelado = cancelados.reduce((a, t) => a + (t.precio_acordado || t.presupuesto || 0), 0)
                  const totalDisputa = enDisputa.reduce((a, t) => a + (t.precio_acordado || t.presupuesto || 0), 0)

                  return (
                    <>
                      {/* Banner principal */}
                      <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '16px', padding: '20px' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estado de cuenta</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <p style={{ fontSize: '36px', fontWeight: '800', color: '#1D9E75', lineHeight: 1 }}>${totalCompletado.toLocaleString('es-MX')}</p>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>pagado y liberado</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Promedio por trabajo</p>
                            <p style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75' }}>${completados.length > 0 ? Math.round(totalCompletado / completados.length).toLocaleString('es-MX') : 0}</p>
                          </div>
                        </div>
                      </div>

                      {/* Grid de estados */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {[
                          { label: '✅ Completados', count: completados.length, total: totalCompletado, color: '#1D9E75', bg: 'rgba(29,158,117,0.08)', border: 'rgba(29,158,117,0.2)' },
                          { label: '🔄 En escrow', count: enProceso.length, total: totalProceso, color: '#378ADD', bg: 'rgba(55,138,221,0.08)', border: 'rgba(55,138,221,0.2)' },
                          { label: '❌ Cancelados', count: cancelados.length, total: totalCancelado, color: '#F09595', bg: 'rgba(240,149,149,0.06)', border: 'rgba(240,149,149,0.15)' },
                          { label: '⚠️ En disputa', count: enDisputa.length, total: totalDisputa, color: '#E8A030', bg: 'rgba(232,160,48,0.06)', border: 'rgba(232,160,48,0.15)' },
                        ].map(s => (
                          <div key={s.label} style={{ background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: '14px', padding: '14px' }}>
                            <p style={{ fontSize: '12px', color: s.color, fontWeight: '600', marginBottom: '6px' }}>{s.label}</p>
                            <p style={{ fontSize: '22px', fontWeight: '800', color: 'white', lineHeight: 1 }}>{s.count}</p>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>${s.total.toLocaleString('es-MX')} MXN</p>
                          </div>
                        ))}
                      </div>

                      {/* Nota cancelados */}
                      {cancelados.length > 0 && (
                        <div style={{ background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
                          🔐 Los trabajos cancelados antes de iniciar son devueltos automáticamente. Si ganaste una disputa, el reembolso puede tardar 3-5 días hábiles.
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* Lista detallada por estado */}
                {[
                  { status: 'completado', label: '✅ Pagados', color: '#1D9E75' },
                  { status: 'en_revision', label: '🔧 Pendiente de confirmar', color: '#378ADD' },
                  { status: 'aceptado', label: '🔄 En escrow', color: '#378ADD' },
                  { status: 'en_disputa', label: '⚠️ En disputa', color: '#E8A030' },
                  { status: 'cancelado', label: '❌ Cancelados / Devueltos', color: '#F09595' },
                ].map(grupo => {
                  const items = historialPagos.filter(t => t.status === grupo.status)
                  if (items.length === 0) return null
                  return (
                    <div key={grupo.status}>
                      <p style={{ fontSize: '12px', color: grupo.color, fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{grupo.label} ({items.length})</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {items.map(pago => (
                          <div key={pago.id} style={{ background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${grupo.color}20`, borderRadius: '12px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: '13px', fontWeight: '600', color: 'white', marginBottom: '2px' }}>{pago.categoria}</p>
                              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{pago.descripcion}</p>
                              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{new Date(pago.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                              <p style={{ fontSize: '16px', fontWeight: '800', color: grupo.color }}>${(pago.precio_acordado || pago.presupuesto || 0).toLocaleString('es-MX')}</p>
                              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>MXN</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {historialPagos.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>💳</div>
                    <p>Aún no tienes servicios contratados.</p>
                  </div>
                )}
              </div>
            )}

            {pestana === 'resenas' && (
              <>
                {totalCalificaciones === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
                    <p>Aún no tienes calificaciones como cliente.</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>Los trabajadores te calificarán al completar trabajos.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                      <p style={{ fontSize: '48px', fontWeight: '800', color: '#F5A623', marginBottom: '8px' }}>{ratingReal}</p>
                      <EstrellaRating rating={ratingReal} />
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                        {totalCalificaciones} {totalCalificaciones === 1 ? 'calificación' : 'calificaciones'} de trabajadores
                      </p>
                    </div>
                    {resenas.map((r, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                          {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '12px', color: s <= r.estrellas ? '#F5A623' : 'rgba(255,255,255,0.2)' }}>★</span>)}
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>
                            {new Date(r.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', fontStyle: 'italic' }}>"{r.comentario}"</p>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {editando && (
              <>
                <button type="button" onClick={guardarPerfil} disabled={guardando} style={{ width: '100%', padding: '16px', background: guardando ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {guardando ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
                <button type="button" onClick={cancelarEdicion} style={{ width: '100%', padding: '14px', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  Cancelar
                </button>
              </>
            )}

            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => setCambiandoPassword(true)} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              🔒 Cambiar contraseña
            </button>

            <a href="/privacidad" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textDecoration: 'none' }}>Política de privacidad</a>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
