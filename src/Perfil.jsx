import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import VerificacionChofer from './VerificacionChofer'

const CATEGORIAS_DISPONIBLES = [
  { icon: '⚡', nombre: 'Electricista' },
  { icon: '🔧', nombre: 'Plomero' },
  { icon: '🍳', nombre: 'Cocinera' },
  { icon: '🧹', nombre: 'Limpieza' },
  { icon: '👔', nombre: 'Planchado' },
  { icon: '🖌️', nombre: 'Pintor' },
  { icon: '🔑', nombre: 'Cerrajero' },
  { icon: '🔩', nombre: 'Mecánico' },
  { icon: '📱', nombre: 'Téc. celulares' },
  { icon: '🚛', nombre: 'Fletes' },
  { icon: '✂️', nombre: 'Costurera' },
  { icon: '📚', nombre: 'Clases' },
  { icon: '🌿', nombre: 'Jardinero' },
  { icon: '🚗', nombre: 'Lavado autos' },
  { icon: '🪵', nombre: 'Carpintero' },
  { icon: '🛵', nombre: 'Repartidor' },
  { icon: '⚓', nombre: 'Soldador' },
  { icon: '🎨', nombre: 'Diseñador gráfico' },
  { icon: '📸', nombre: 'Fotógrafo' },
  { icon: '🐕', nombre: 'Veterinario' },
  { icon: '🖥️', nombre: 'Téc. computadoras' },
  { icon: '🏊', nombre: 'Limpieza albercas' },
  { icon: '🎵', nombre: 'Músico' },
  { icon: '❄️', nombre: 'Téc. refrigeración' },
  { icon: '🎪', nombre: 'Barra de eventos' },
  { icon: '📐', nombre: 'Topógrafo' },
  { icon: '🧱', nombre: 'Albañil' },
  { icon: '🚕', nombre: 'Taxi / Chofer' },
  { icon: '🏍️', nombre: 'Moto taxi' },
  { icon: '🛵', nombre: 'Repartidor moto' },
  { icon: '🛍️', nombre: 'Mandados' },
]

const CATEGORIAS_CHOFER = ['Taxi / Chofer', 'Moto taxi', 'Repartidor moto', 'Repartidor', 'Fletes', 'Mandados']

const RADIOS = [
  { valor: 1000, label: '1 km', desc: 'Solo mi colonia' },
  { valor: 3000, label: '3 km', desc: 'Mi zona' },
  { valor: 5000, label: '5 km', desc: 'Media ciudad' },
  { valor: 10000, label: '10 km', desc: 'Toda Salina Cruz' },
  { valor: 999000, label: 'Sin límite', desc: 'Todo el Istmo' },
]

function CentrarMapa({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, map.getZoom())
  }, [center])
  return null
}

function EstrellaRating({ rating }) {
  if (!rating) return <span style={{ fontSize: '22px', fontWeight: '700', color: 'rgba(255,255,255,0.3)' }}>—</span>
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

export default function Perfil({ userId, userEmail, onVolver }) {
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [esTrabajador, setEsTrabajador] = useState(false)
  const [categoriasServicio, setCategoriasServicio] = useState([])
  const [radioAlertas, setRadioAlertas] = useState(5000)
  const [fotoUrl, setFotoUrl] = useState(null)
  const [ubicacion, setUbicacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [exito, setExito] = useState(false)
  const [errores, setErrores] = useState({})
  const [pestana, setPestana] = useState('info')
  const [editando, setEditando] = useState(false)
  const [verificandoChofer, setVerificandoChofer] = useState(false)
  const [verificacion, setVerificacion] = useState(null)
  const [ratingReal, setRatingReal] = useState(null)
  const [totalTrabajos, setTotalTrabajos] = useState(0)
  const [resenas, setResenas] = useState([])

  useEffect(() => {
    cargarPerfil()
    obtenerUbicacion()
    cargarVerificacion()
    cargarStats()
  }, [])

  function obtenerUbicacion() {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUbicacion([pos.coords.latitude, pos.coords.longitude]),
      () => setUbicacion([16.1833, -95.2000])
    )
  }

  async function cargarPerfil() {
    const { data } = await supabase
      .from('usuarios').select('*').eq('id', userId).maybeSingle()
    if (data) {
      setNombre(data.nombre || '')
      setBio(data.bio || '')
      setEsTrabajador(data.es_trabajador || false)
      setCategoriasServicio(data.categorias_servicio || [])
      setRadioAlertas(data.radio_alertas || 5000)
      setFotoUrl(data.foto_url || null)
      if (data.lat && data.lng) setUbicacion([data.lat, data.lng])
    } else {
      setEditando(true)
    }
    setLoading(false)
  }

  async function cargarStats() {
    const { data } = await supabase
      .from('calificaciones')
      .select('estrellas, comentario, creado_en, calificador_id')
      .eq('calificado_id', userId)
      .order('creado_en', { ascending: false })
    if (data && data.length > 0) {
      const promedio = data.reduce((acc, c) => acc + c.estrellas, 0) / data.length
      setRatingReal(parseFloat(promedio.toFixed(1)))
      setTotalTrabajos(data.length)
      setResenas(data.filter(c => c.comentario))
    }
  }

  async function cargarVerificacion() {
    const { data } = await supabase
      .from('verificaciones').select('*').eq('usuario_id', userId).maybeSingle()
    if (data) setVerificacion(data)
  }

  async function subirFoto(e) {
    if (!editando) return
    const file = e.target.files[0]
    if (!file) return
    setSubiendoFoto(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatares').upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      setFotoUrl(data.publicUrl)
      setErrores(p => ({ ...p, foto: null }))
      await supabase.from('usuarios').upsert({ id: userId, foto_url: data.publicUrl })
    }
    setSubiendoFoto(false)
  }

  function toggleCategoria(cat) {
    if (!editando) return
    setCategoriasServicio(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
    setErrores(p => ({ ...p, categorias: null }))
  }

  function validar() {
    const e = {}
    if (!nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!bio.trim()) e.bio = 'La descripción es obligatoria'
    if (esTrabajador && !fotoUrl) e.foto = 'La foto de perfil es obligatoria para trabajadores'
    if (esTrabajador && categoriasServicio.length === 0) e.categorias = 'Selecciona al menos un servicio'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardarPerfil() {
    if (!validar()) return
    setGuardando(true)
    const datos = {
      id: userId, email: userEmail, nombre, bio,
      es_trabajador: esTrabajador,
      categorias_servicio: categoriasServicio,
      radio_alertas: radioAlertas,
      rating_promedio: ratingReal,
      total_trabajos: totalTrabajos,
    }
    if (ubicacion) { datos.lat = ubicacion[0]; datos.lng = ubicacion[1] }
    await supabase.from('usuarios').upsert(datos)
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

  const necesitaVerificacion = esTrabajador &&
    categoriasServicio.some(c => CATEGORIAS_CHOFER.includes(c))

  const statusVerificacion = () => {
    if (!verificacion) return null
    if (verificacion.status === 'aprobado') return { icon: '✅', texto: 'Chofer verificado', color: '#1D9E75', bg: 'rgba(29,158,117,0.1)', border: 'rgba(29,158,117,0.3)' }
    if (verificacion.status === 'pendiente') return { icon: '⏳', texto: 'Verificación en revisión', color: '#E8A030', bg: 'rgba(186,117,23,0.1)', border: 'rgba(186,117,23,0.3)' }
    if (verificacion.status === 'rechazado') return { icon: '❌', texto: 'Verificación rechazada', color: '#F09595', bg: 'rgba(240,149,149,0.1)', border: 'rgba(240,149,149,0.3)' }
    return null
  }

  const iniciales = nombre
    ? nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() || '?'

  const radioActual = RADIOS.find(r => r.valor === radioAlertas)

  const inputStyle = (error) => ({
    width: '100%', background: editando ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
    border: `0.5px solid ${error ? '#F09595' : editando ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
    borderRadius: '12px', padding: '14px 16px',
    color: editando ? 'white' : 'rgba(255,255,255,0.7)',
    fontSize: '15px', fontFamily: 'sans-serif', outline: 'none',
    cursor: editando ? 'text' : 'default',
  })

  if (verificandoChofer) {
    return (
      <VerificacionChofer
        userId={userId}
        onVolver={() => setVerificandoChofer(false)}
        onCompletado={() => { setVerificandoChofer(false); cargarVerificacion() }}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Mi perfil</h2>
        {!editando && !loading && (
          <button type="button" onClick={() => setEditando(true)} style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '10px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            ✏️ Editar
          </button>
        )}
        {editando && <span style={{ fontSize: '12px', color: '#E8A030', fontWeight: '500' }}>Modo edición</span>}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Cargando perfil...</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 20px 0' }}>
            <div style={{ position: 'relative' }}>
              {fotoUrl ? (
                <img src={fotoUrl} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${errores.foto ? '#F09595' : 'rgba(29,158,117,0.4)'}` }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: errores.foto ? 'linear-gradient(135deg, #F09595, #c06060)' : 'linear-gradient(135deg, #1D9E75, #0d6b50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: 'white', border: `3px solid ${errores.foto ? '#F09595' : 'rgba(29,158,117,0.4)'}` }}>
                  {iniciales}
                </div>
              )}
              {editando && (
                <label style={{ position: 'absolute', bottom: 0, right: 0, background: errores.foto ? '#F09595' : '#1D9E75', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', border: '2px solid #0D0D0D' }}>
                  {subiendoFoto ? '⏳' : '📷'}
                  <input type="file" accept="image/*" onChange={subirFoto} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {errores.foto && <p style={{ color: '#F09595', fontSize: '12px', textAlign: 'center', maxWidth: '240px' }}>📷 {errores.foto}</p>}
            {editando && esTrabajador && !fotoUrl && !errores.foto && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '280px' }}>
                📷 Los clientes necesitan ver tu foto. Toca el ícono de cámara.
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: '600' }}>{nombre || 'Sin nombre'}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                {userEmail?.replace(/(.{2}).*(@.*)/, '$1***$2')}
              </p>
            </div>

            {statusVerificacion() && (
              <div style={{ background: statusVerificacion().bg, border: `0.5px solid ${statusVerificacion().border}`, borderRadius: '100px', padding: '5px 14px', fontSize: '12px', color: statusVerificacion().color, fontWeight: '600' }}>
                {statusVerificacion().icon} {statusVerificacion().texto}
              </div>
            )}

            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px', opacity: editando ? 1 : 0.6 }}>
              <button type="button" onClick={() => editando && setEsTrabajador(false)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: !esTrabajador ? '#1D9E75' : 'transparent', color: !esTrabajador ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: '500', cursor: editando ? 'pointer' : 'default', fontFamily: 'sans-serif' }}>
                🛍️ Cliente
              </button>
              <button type="button" onClick={() => editando && setEsTrabajador(true)} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: esTrabajador ? '#1D9E75' : 'transparent', color: esTrabajador ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: '500', cursor: editando ? 'pointer' : 'default', fontFamily: 'sans-serif' }}>
                🔧 Trabajador
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px', padding: '16px 20px 0' }}>
            {[['info', 'Información'], ['servicios', 'Mis servicios'], ['resenas', 'Reseñas']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setPestana(key)} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '10px', background: pestana === key ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: pestana === key ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: pestana === key ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                {label} {key === 'resenas' && totalTrabajos > 0 && `(${totalTrabajos})`}
              </button>
            ))}
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {exito && (
              <div style={{ background: 'rgba(29,158,117,0.12)', border: '0.5px solid rgba(29,158,117,0.4)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#5DCAA5', textAlign: 'center' }}>
                ✅ Perfil guardado correctamente
              </div>
            )}

            {pestana === 'info' && (
              <>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Nombre completo {editando && '*'}
                  </p>
                  <input type="text" placeholder="Tu nombre completo" value={nombre}
                    onChange={e => { setNombre(e.target.value); setErrores(p => ({ ...p, nombre: null })) }}
                    disabled={!editando} style={inputStyle(errores.nombre)}
                  />
                  {errores.nombre && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '4px' }}>{errores.nombre}</p>}
                </div>

                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Descripción {editando && '*'}
                  </p>
                  <textarea placeholder="Cuéntanos sobre ti o tu servicio..."
                    value={bio} onChange={e => { setBio(e.target.value); setErrores(p => ({ ...p, bio: null })) }}
                    rows={3} disabled={!editando} style={{ ...inputStyle(errores.bio), resize: 'none' }}
                  />
                  {errores.bio && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '4px' }}>{errores.bio}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                    {ratingReal ? <EstrellaRating rating={ratingReal} /> : <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)' }}>Sin calificar</p>}
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>Calificación</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#1D9E75' }}>{totalTrabajos}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{totalTrabajos === 1 ? 'Trabajo' : 'Trabajos'}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ color: 'rgba(255,255,255,0.1)', letterSpacing: '4px', fontSize: '10px' }}>∴</span>
                  <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.08)' }} />
                </div>
              </>
            )}

            {pestana === 'resenas' && (
              <>
                {totalTrabajos === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>⭐</div>
                    <p>Aún no tienes calificaciones.</p>
                    <p style={{ fontSize: '12px', marginTop: '8px' }}>Completa trabajos para recibir reseñas.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                      <p style={{ fontSize: '48px', fontWeight: '800', color: '#F5A623', marginBottom: '8px' }}>{ratingReal}</p>
                      <EstrellaRating rating={ratingReal} />
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                        Basado en {totalTrabajos} {totalTrabajos === 1 ? 'calificación' : 'calificaciones'}
                      </p>
                    </div>
                    {resenas.length > 0 ? resenas.map((r, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #378ADD, #1a5fa8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: 'white' }}>👤</div>
                          <div>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[1,2,3,4,5].map(s => (
                                <span key={s} style={{ fontSize: '12px', color: s <= r.estrellas ? '#F5A623' : 'rgba(255,255,255,0.2)' }}>★</span>
                              ))}
                            </div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                              {new Date(r.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5', fontStyle: 'italic' }}>"{r.comentario}"</p>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                        Tienes {totalTrabajos} calificaciones pero sin comentarios escritos aún.
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {pestana === 'servicios' && (
              <>
                {!esTrabajador ? (
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '32px', marginBottom: '10px' }}>🛍️</p>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                      Activa el modo <strong style={{ color: 'white' }}>Trabajador</strong> {editando ? 'arriba' : '(toca Editar primero)'} para configurar tus servicios.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        ¿Qué servicios ofreces? {editando && '*'} ({categoriasServicio.length} seleccionados)
                      </p>
                      {errores.categorias && <p style={{ color: '#F09595', fontSize: '12px', marginBottom: '8px' }}>{errores.categorias}</p>}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {CATEGORIAS_DISPONIBLES.map(cat => (
                          <button key={cat.nombre} type="button" onClick={() => toggleCategoria(cat.nombre)} style={{
                            background: categoriasServicio.includes(cat.nombre) ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                            border: categoriasServicio.includes(cat.nombre) ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px', padding: '10px 6px',
                            cursor: editando ? 'pointer' : 'default', fontFamily: 'sans-serif',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                            opacity: editando ? 1 : 0.7
                          }}>
                            <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                            <span style={{ fontSize: '9px', color: categoriasServicio.includes(cat.nombre) ? '#1D9E75' : 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.2' }}>
                              {cat.nombre}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {necesitaVerificacion && (
                      <div>
                        {!verificacion ? (
                          <button type="button" onClick={() => setVerificandoChofer(true)} style={{ width: '100%', padding: '14px', background: 'rgba(55,138,221,0.1)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            🚗 Verificarme como chofer — requerido
                          </button>
                        ) : verificacion.status === 'rechazado' ? (
                          <button type="button" onClick={() => setVerificandoChofer(true)} style={{ width: '100%', padding: '14px', background: 'rgba(240,149,149,0.1)', color: '#F09595', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                            ❌ Verificación rechazada — volver a enviar
                          </button>
                        ) : (
                          <div style={{ padding: '12px 16px', borderRadius: '12px', textAlign: 'center', background: verificacion.status === 'aprobado' ? 'rgba(29,158,117,0.1)' : 'rgba(186,117,23,0.1)', border: `0.5px solid ${verificacion.status === 'aprobado' ? 'rgba(29,158,117,0.3)' : 'rgba(186,117,23,0.3)'}`, fontSize: '13px', color: verificacion.status === 'aprobado' ? '#1D9E75' : '#E8A030', fontWeight: '500' }}>
                            {verificacion.status === 'aprobado' ? '✅ Chofer verificado' : '⏳ Documentos en revisión — hasta 24 hrs'}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Radio de alertas — {radioActual?.label} · {radioActual?.desc}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        {RADIOS.map(r => (
                          <button key={r.valor} type="button" onClick={() => editando && setRadioAlertas(r.valor)} style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', background: radioAlertas === r.valor ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: radioAlertas === r.valor ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: radioAlertas === r.valor ? '600' : '400', cursor: editando ? 'pointer' : 'default', fontFamily: 'sans-serif', opacity: editando ? 1 : 0.7 }}>
                            {r.label}
                          </button>
                        ))}
                      </div>

                      {ubicacion && (
                        <div style={{ height: '220px', borderRadius: '14px', overflow: 'hidden', border: '0.5px solid rgba(29,158,117,0.3)' }}>
                          <MapContainer center={ubicacion} zoom={radioAlertas >= 10000 ? 12 : radioAlertas >= 5000 ? 13 : radioAlertas >= 3000 ? 14 : 15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <CentrarMapa center={ubicacion} />
                            {radioAlertas < 999000 && (
                              <Circle center={ubicacion} radius={radioAlertas} pathOptions={{ color: '#1D9E75', fillColor: '#1D9E75', fillOpacity: 0.15, weight: 2, dashArray: '6 4' }} />
                            )}
                          </MapContainer>
                        </div>
                      )}
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '8px', textAlign: 'center' }}>
                        El área verde muestra la zona donde recibirás alertas de trabajo
                      </p>
                    </div>

                    <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
                      🔔 Recibirás alertas de trabajos de <strong style={{ color: '#1D9E75' }}>
                        {categoriasServicio.length > 0 ? categoriasServicio.slice(0, 3).join(', ') + (categoriasServicio.length > 3 ? '...' : '') : 'tus categorías'}
                      </strong> dentro de <strong style={{ color: '#1D9E75' }}>
                        {radioAlertas === 999000 ? 'cualquier distancia' : `${radioAlertas / 1000} km`}
                      </strong>.
                    </div>
                  </>
                )}
              </>
            )}

            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.06)', fontSize: '16px', letterSpacing: '8px' }}>∴ 👁 ∴</div>

            <div style={{ textAlign: 'center' }}>
              <a href="/privacidad" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textDecoration: 'none' }}>
                Política de privacidad
              </a>
            </div>

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

          </div>
        </>
      )}
    </div>
  )
}