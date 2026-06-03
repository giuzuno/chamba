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
  useEffect(() => { if (center) map.setView(center, map.getZoom()) }, [center])
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

export default function PerfilTrabajador({ userId, userEmail, onVolver }) {
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
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
  const [gananciaTotal, setGananciaTotal] = useState(0)
  const [trabajosCompletados, setTrabajosCompletados] = useState(0)
  const [mejorMes, setMejorMes] = useState(null)
  const [rachaMeses, setRachaMeses] = useState(0)
  // Vehículo
  const [vehiculoMarca, setVehiculoMarca] = useState('')
  const [vehiculoModelo, setVehiculoModelo] = useState('')
  const [vehiculoColor, setVehiculoColor] = useState('')
  const [vehiculoPlacas, setVehiculoPlacas] = useState('')
  const [vehiculoFotoUrl, setVehiculoFotoUrl] = useState(null)
  const [subiendoFotoVehiculo, setSubiendoFotoVehiculo] = useState(false)

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
    const { data } = await supabase.from('usuarios').select('*').eq('id', userId).maybeSingle()
    if (data) {
      setNombre(data.nombre || '')
      setBio(data.bio || '')
      setCategoriasServicio(data.categorias_servicio || [])
      setRadioAlertas(data.radio_alertas || 5000)
      setFotoUrl(data.foto_url || null)
      if (data.lat && data.lng) setUbicacion([data.lat, data.lng])
      setVehiculoMarca(data.vehiculo_marca || '')
      setVehiculoModelo(data.vehiculo_modelo || '')
      setVehiculoColor(data.vehiculo_color || '')
      setVehiculoPlacas(data.vehiculo_placas || '')
      setVehiculoFotoUrl(data.vehiculo_foto_url || null)
    } else {
      setEditando(true)
    }
    setLoading(false)
  }

  async function cargarStats() {
    // Calificaciones
    const { data: cals } = await supabase.from('calificaciones')
      .select('estrellas, comentario, creado_en')
      .eq('calificado_id', userId)
      .order('creado_en', { ascending: false })
    if (cals && cals.length > 0) {
      const promedio = cals.reduce((acc, c) => acc + c.estrellas, 0) / cals.length
      setRatingReal(parseFloat(promedio.toFixed(1)))
      setTotalTrabajos(cals.length)
      setResenas(cals.filter(c => c.comentario))
    }

    // Trabajos completados y ganancias
    const { data: trabajos } = await supabase.from('trabajos')
      .select('precio_acordado, presupuesto, creado_en')
      .eq('trabajador_id', userId)
      .eq('status', 'completado')
    if (trabajos && trabajos.length > 0) {
      setTrabajosCompletados(trabajos.length)
      const total = trabajos.reduce((acc, t) => acc + (t.precio_acordado || t.presupuesto || 0), 0)
      setGananciaTotal(total)

      // Mejor mes
      const porMes = {}
      trabajos.forEach(t => {
        const mes = new Date(t.creado_en).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
        if (!porMes[mes]) porMes[mes] = { count: 0, ganancias: 0 }
        porMes[mes].count++
        porMes[mes].ganancias += (t.precio_acordado || t.presupuesto || 0)
      })
      const mejor = Object.entries(porMes).sort((a, b) => b[1].ganancias - a[1].ganancias)[0]
      if (mejor) setMejorMes({ mes: mejor[0], ...mejor[1] })

      // Racha: meses consecutivos con al menos 1 trabajo
      const mesesConTrabajo = new Set(trabajos.map(t => {
        const d = new Date(t.creado_en)
        return `${d.getFullYear()}-${d.getMonth()}`
      }))
      let racha = 0
      const ahora = new Date()
      for (let i = 0; i < 12; i++) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
        if (mesesConTrabajo.has(`${d.getFullYear()}-${d.getMonth()}`)) racha++
        else break
      }
      setRachaMeses(racha)
    }
  }

  async function cargarVerificacion() {
    const { data } = await supabase.from('verificaciones').select('*').eq('usuario_id', userId).maybeSingle()
    if (data) setVerificacion(data)
  }

  async function subirFoto(e) {
    if (!editando) return
    const file = e.target.files[0]
    if (!file) return
    setSubiendoFoto(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatares').upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      setFotoUrl(data.publicUrl)
      setErrores(p => ({ ...p, foto: null }))
      await supabase.from('usuarios').upsert({ id: userId, foto_url: data.publicUrl })
    }
    setSubiendoFoto(false)
  }

  async function subirFotoVehiculo(e) {
    if (!editando) return
    const file = e.target.files[0]
    if (!file) return
    setSubiendoFotoVehiculo(true)
    const ext = file.name.split('.').pop()
    const path = `vehiculo_${userId}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatares').upload(path, file, { upsert: true })
    if (!uploadError) {
      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      setVehiculoFotoUrl(data.publicUrl)
      await supabase.from('usuarios').upsert({ id: userId, vehiculo_foto_url: data.publicUrl })
    }
    setSubiendoFotoVehiculo(false)
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
    if (!fotoUrl) e.foto = 'La foto de perfil es obligatoria'
    if (categoriasServicio.length === 0) e.categorias = 'Selecciona al menos un servicio'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardarPerfil() {
    if (!validar()) return
    setGuardando(true)
    const datos = {
      id: userId, email: userEmail, nombre, bio,
      es_trabajador: true,
      categorias_servicio: categoriasServicio,
      radio_alertas: radioAlertas,
      vehiculo_marca: vehiculoMarca,
      vehiculo_modelo: vehiculoModelo,
      vehiculo_color: vehiculoColor,
      vehiculo_placas: vehiculoPlacas,
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

  const necesitaVerificacion = categoriasServicio.some(c => CATEGORIAS_CHOFER.includes(c))
  const radioActual = RADIOS.find(r => r.valor === radioAlertas)

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

  if (verificandoChofer) {
    return (
      <VerificacionChofer userId={userId}
        onVolver={() => setVerificandoChofer(false)}
        onCompletado={() => { setVerificandoChofer(false); cargarVerificacion() }}
      />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Perfil trabajador</h2>
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
                <img src={fotoUrl} alt="avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${errores.foto ? '#F09595' : 'rgba(29,158,117,0.4)'}` }} />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: errores.foto ? 'linear-gradient(135deg,#F09595,#c06060)' : 'linear-gradient(135deg,#1D9E75,#0d6b50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: 'white', border: `3px solid ${errores.foto ? '#F09595' : 'rgba(29,158,117,0.4)'}` }}>
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
            {errores.foto && <p style={{ color: '#F09595', fontSize: '12px', textAlign: 'center' }}>📷 {errores.foto}</p>}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: '600' }}>{nombre || 'Sin nombre'}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{userEmail?.replace(/(.{2}).*(@.*)/, '$1***$2')}</p>
            </div>
            <div style={{ background: 'rgba(55,138,221,0.1)', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '100px', padding: '4px 14px', fontSize: '12px', color: '#378ADD', fontWeight: '600' }}>
              🔧 Modo trabajador
            </div>
          </div>

          {/* Pestañas */}
          <div style={{ display: 'flex', gap: '4px', padding: '16px 20px 0' }}>
            {[['info', 'Mi info'], ['servicios', 'Servicios'], ...(necesitaVerificacion ? [['vehiculo', '🚗 Vehículo']] : []), ['stats', '📊 Stats'], ['resenas', `Reseñas${totalTrabajos > 0 ? ` (${totalTrabajos})` : ''}`]].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setPestana(key)} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '10px', background: pestana === key ? '#1D9E75' : 'rgba(255,255,255,0.06)', color: pestana === key ? 'white' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: pestana === key ? '600' : '400', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

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
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción</p>
                  <textarea placeholder="Cuéntanos sobre tu experiencia..."
                    value={bio} onChange={e => setBio(e.target.value)}
                    rows={3} disabled={!editando} style={{ ...inputStyle(false), resize: 'none' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                    {ratingReal ? <EstrellaRating rating={ratingReal} /> : <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)' }}>Sin calificar</p>}
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>Calificación</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#1D9E75' }}>{totalTrabajos}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Trabajos</p>
                  </div>
                </div>
              </>
            )}

            {pestana === 'servicios' && (
              <>
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ¿Qué servicios ofreces? * ({categoriasServicio.length} seleccionados)
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
                        <span style={{ fontSize: '9px', color: categoriasServicio.includes(cat.nombre) ? '#1D9E75' : 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: '1.2' }}>{cat.nombre}</span>
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
                    <div style={{ height: '200px', borderRadius: '14px', overflow: 'hidden', border: '0.5px solid rgba(29,158,117,0.3)' }}>
                      <MapContainer center={ubicacion} zoom={radioAlertas >= 10000 ? 12 : radioAlertas >= 5000 ? 13 : 14} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <CentrarMapa center={ubicacion} />
                        {radioAlertas < 999000 && (
                          <Circle center={ubicacion} radius={radioAlertas} pathOptions={{ color: '#1D9E75', fillColor: '#1D9E75', fillOpacity: 0.15, weight: 2, dashArray: '6 4' }} />
                        )}
                      </MapContainer>
                    </div>
                  )}
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '8px', textAlign: 'center' }}>
                    El área verde muestra la zona donde recibirás alertas
                  </p>
                </div>

                <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
                  🔔 Recibirás alertas de <strong style={{ color: '#1D9E75' }}>
                    {categoriasServicio.length > 0 ? categoriasServicio.slice(0, 3).join(', ') + (categoriasServicio.length > 3 ? '...' : '') : 'tus categorías'}
                  </strong> dentro de <strong style={{ color: '#1D9E75' }}>
                    {radioAlertas === 999000 ? 'cualquier distancia' : `${radioAlertas / 1000} km`}
                  </strong>.
                </div>
              </>
            )}

            {pestana === 'vehiculo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
                  Los clientes verán esta información cuando aceptes un viaje. Mantén los datos actualizados.
                </p>

                {/* Foto del vehículo */}
                <div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Foto del vehículo</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {vehiculoFotoUrl ? (
                      <img src={vehiculoFotoUrl} alt="vehiculo" style={{ width: '80px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '2px solid rgba(29,158,117,0.4)' }} />
                    ) : (
                      <div style={{ width: '80px', height: '60px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🚗</div>
                    )}
                    {editando && (
                      <label style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                        {subiendoFotoVehiculo ? '⏳ Subiendo...' : '📷 Subir foto'}
                        <input type="file" accept="image/*" onChange={subirFotoVehiculo} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Datos del vehículo */}
                {[
                  { label: 'Marca', value: vehiculoMarca, set: setVehiculoMarca, placeholder: 'Ej: Nissan, Toyota, Honda' },
                  { label: 'Modelo', value: vehiculoModelo, set: setVehiculoModelo, placeholder: 'Ej: Sentra, Tsuru, Beat' },
                  { label: 'Color', value: vehiculoColor, set: setVehiculoColor, placeholder: 'Ej: Blanco, Rojo, Gris' },
                  { label: 'Placas', value: vehiculoPlacas, set: setVehiculoPlacas, placeholder: 'Ej: ABC-123-D' },
                ].map(campo => (
                  <div key={campo.label}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{campo.label}</p>
                    <input type="text" placeholder={campo.placeholder} value={campo.value}
                      onChange={e => editando && campo.set(e.target.value)}
                      disabled={!editando}
                      style={{ width: '100%', background: editando ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${editando ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '14px 16px', color: editando ? 'white' : 'rgba(255,255,255,0.7)', fontSize: '15px', fontFamily: 'sans-serif', outline: 'none' }}
                    />
                  </div>
                ))}

                {!editando && vehiculoMarca && (
                  <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '16px' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vista del cliente</p>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      {vehiculoFotoUrl && <img src={vehiculoFotoUrl} alt="vehiculo" style={{ width: '60px', height: '45px', borderRadius: '8px', objectFit: 'cover' }} />}
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{vehiculoMarca} {vehiculoModelo}</p>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Color: {vehiculoColor} · Placas: {vehiculoPlacas}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {pestana === 'stats' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Ganancias totales */}
                <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '16px', padding: '20px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Desglose de ganancias</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Ganancia bruta</span>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: 'rgba(255,255,255,0.7)' }}>${gananciaTotal.toLocaleString('es-MX')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#F09595' }}>➖ Comisión Chamba (12%)</span>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#F09595' }}>-${Math.round(gananciaTotal * 0.12).toLocaleString('es-MX')}</span>
                  </div>
                  <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)', marginBottom: '10px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1D9E75' }}>✅ Tu ganancia neta</span>
                    <span style={{ fontSize: '28px', fontWeight: '800', color: '#1D9E75' }}>${Math.round(gananciaTotal * 0.88).toLocaleString('es-MX')}</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '6px', textAlign: 'center' }}>MXN acumulados en Chamba</p>
                </div>

                {/* Grid de stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: '#378ADD' }}>{trabajosCompletados}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Trabajos completados</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: '#F5A623' }}>{ratingReal || '—'}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Rating promedio ⭐</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: '#E8A030' }}>{rachaMeses}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                      {rachaMeses === 1 ? 'Mes activo' : 'Meses seguidos'} 🔥
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '28px', fontWeight: '800', color: '#1D9E75' }}>
                      {trabajosCompletados > 0 ? `$${Math.round((gananciaTotal * 0.88) / trabajosCompletados).toLocaleString('es-MX')}` : '—'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Promedio neto/trabajo</p>
                  </div>
                </div>

                {/* Mejor mes */}
                {mejorMes && (
                  <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.2)', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏆 Mejor mes</p>
                      <p style={{ fontSize: '15px', fontWeight: '700', color: '#E8A030', textTransform: 'capitalize' }}>{mejorMes.mes}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{mejorMes.count} trabajo{mejorMes.count > 1 ? 's' : ''}</p>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: '800', color: '#E8A030' }}>${mejorMes.ganancias.toLocaleString('es-MX')}</p>
                  </div>
                )}

                {trabajosCompletados === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📊</div>
                    <p>Completa trabajos para ver tus estadísticas.</p>
                  </div>
                )}
              </div>
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
                        {totalTrabajos} {totalTrabajos === 1 ? 'calificación' : 'calificaciones'}
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
              <a href="/privacidad" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textDecoration: 'none' }}>Política de privacidad</a>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
