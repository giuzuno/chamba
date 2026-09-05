import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { esZonaIstmo } from './zonaIstmo'
import { sanitizarCampo, sanitizarDescripcion, tieneInyeccionSQL } from './sanitize'

const CATEGORIAS_NEGOCIO = [
  { id: 'tiendita', icon: '🏪', label: 'Tiendita' },
  { id: 'restaurante', icon: '🍽️', label: 'Restaurante' },
  { id: 'antojitos', icon: '🌮', label: 'Antojitos' },
  { id: 'panaderia', icon: '🥖', label: 'Panadería' },
  { id: 'otro', icon: '✨', label: 'Otro' },
]

function MarcarEnMapa({ posicion, onMover }) {
  useMapEvents({
    click(e) { onMover([e.latlng.lat, e.latlng.lng]) },
  })
  return posicion ? <Marker position={posicion} /> : null
}

export default function RegistrarNegocio({ userId, onVolver, onCompletado }) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [esCasa, setEsCasa] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [telefonoContacto, setTelefonoContacto] = useState('')
  const [direccion, setDireccion] = useState('')
  const [fotoPortadaUrl, setFotoPortadaUrl] = useState(null)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [ubicacion, setUbicacion] = useState(null)
  const [fueraDeZona, setFueraDeZona] = useState(false)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [aceptoReglas, setAceptoReglas] = useState(false)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUbicacion([pos.coords.latitude, pos.coords.longitude]),
      () => setUbicacion([16.1833, -95.2000])
    )
  }, [])

  function moverPin(nuevaPos) {
    const [lat, lng] = nuevaPos
    if (!esZonaIstmo(lat, lng)) {
      setFueraDeZona(true)
      return
    }
    setFueraDeZona(false)
    setUbicacion(nuevaPos)
    setErrores(p => ({ ...p, ubicacion: null }))
  }

  async function subirFotoPortada(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendoFoto(true)
    const ext = file.name.split('.').pop()
    const path = `negocios/${userId}/portada_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('avatares').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      setFotoPortadaUrl(data.publicUrl)
      setErrores(p => ({ ...p, foto: null }))
    }
    setSubiendoFoto(false)
  }

  function validar() {
    const e = {}
    if (!nombre.trim()) e.nombre = 'El nombre del negocio es obligatorio'
    if (!categoria) e.categoria = 'Selecciona una categoría'
    if (!descripcion.trim()) e.descripcion = 'Cuéntales a los clientes qué ofreces'
    if (!fotoPortadaUrl) e.foto = 'La foto de tu negocio es obligatoria'
    if (!ubicacion) e.ubicacion = 'Marca la ubicación de tu negocio en el mapa'
    if (!aceptoReglas) e.reglas = 'Debes confirmar esto para continuar'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function registrarNegocio() {
    if (!validar()) return
    if (tieneInyeccionSQL(nombre) || tieneInyeccionSQL(descripcion)) {
      setErrores(p => ({ ...p, nombre: 'Contenido no válido detectado' }))
      return
    }
    setGuardando(true)
    const { error } = await supabase.from('negocios').insert({
      usuario_id: userId,
      nombre: sanitizarCampo(nombre, 80),
      categoria,
      descripcion: sanitizarDescripcion(descripcion),
      foto_portada_url: fotoPortadaUrl,
      lat: ubicacion[0],
      lng: ubicacion[1],
      direccion: sanitizarCampo(direccion, 150),
      telefono_contacto: telefonoContacto.trim() || null,
      abierto_ahora: false,
      es_casa: esCasa,
    })
    setGuardando(false)
    if (!error) {
      setExito(true)
      setTimeout(() => onCompletado?.(), 1800)
    } else {
      setErrores(p => ({ ...p, general: 'No se pudo registrar tu negocio. Intenta de nuevo.' }))
    }
  }

  const inputStyle = (error) => ({
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: `0.5px solid ${error ? '#F09595' : 'rgba(255,255,255,0.15)'}`,
    borderRadius: '12px', padding: '14px 16px',
    color: 'white', fontSize: '15px', fontFamily: 'sans-serif', outline: 'none',
  })

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: 'white', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1D9E75', marginBottom: '10px' }}>¡Tu negocio ya está registrado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '280px' }}>Ahora agrega tus productos al menú antes de abrir.</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>Registrar mi negocio</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {errores.general && (
          <div style={{ background: 'rgba(240,149,149,0.08)', border: '0.5px solid rgba(240,149,149,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#F09595', textAlign: 'center' }}>
            {errores.general}
          </div>
        )}

        {/* Foto de portada */}
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Foto de tu negocio *</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {fotoPortadaUrl ? (
              <img src={fotoPortadaUrl} alt="portada" style={{ width: '90px', height: '70px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(29,158,117,0.4)' }} />
            ) : (
              <div style={{ width: '90px', height: '70px', borderRadius: '12px', background: errores.foto ? 'rgba(240,149,149,0.08)' : 'rgba(255,255,255,0.06)', border: `1px dashed ${errores.foto ? '#F09595' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🏪</div>
            )}
            <label style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              {subiendoFoto ? '⏳ Subiendo...' : fotoPortadaUrl ? '✅ Cambiar foto' : '📷 Subir foto'}
              <input type="file" accept="image/*" capture="environment" onChange={subirFotoPortada} style={{ display: 'none' }} disabled={subiendoFoto} />
            </label>
          </div>
          {errores.foto && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '6px' }}>{errores.foto}</p>}
        </div>

        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre del negocio *</p>
          <input type="text" placeholder="Ej: Tortas doña Lupe" value={nombre}
            onChange={e => { setNombre(e.target.value); setErrores(p => ({ ...p, nombre: null })) }}
            style={inputStyle(errores.nombre)}
          />
          {errores.nombre && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '4px' }}>{errores.nombre}</p>}
        </div>

        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría *</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {CATEGORIAS_NEGOCIO.map(cat => (
              <button key={cat.id} type="button" onClick={() => { setCategoria(cat.id); setErrores(p => ({ ...p, categoria: null })) }} style={{
                background: categoria === cat.id ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                border: categoria === cat.id ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '14px 6px', cursor: 'pointer', fontFamily: 'sans-serif',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}>
                <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                <span style={{ fontSize: '11px', color: categoria === cat.id ? '#1D9E75' : 'rgba(255,255,255,0.6)', fontWeight: categoria === cat.id ? '700' : '400' }}>{cat.label}</span>
              </button>
            ))}
          </div>
          {errores.categoria && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '6px' }}>{errores.categoria}</p>}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px' }}>
          <input type="checkbox" checked={esCasa} onChange={e => setEsCasa(e.target.checked)}
            style={{ width: '16px', height: '16px', flexShrink: 0 }}
          />
          <div>
            <p style={{ fontSize: '13px', color: 'white', fontWeight: '600' }}>🏠 Vendo desde mi casa (sin local comercial)</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Los clientes verán la insignia "Negocio en casa" en tu perfil.</p>
          </div>
        </label>

        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descripción *</p>
          <textarea placeholder="¿Qué vendes? ¿Qué te hace especial?" value={descripcion}
            onChange={e => { setDescripcion(e.target.value); setErrores(p => ({ ...p, descripcion: null })) }}
            rows={3} style={{ ...inputStyle(errores.descripcion), resize: 'none' }}
          />
          {errores.descripcion && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '4px' }}>{errores.descripcion}</p>}
        </div>

        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dirección (referencia)</p>
          <input type="text" placeholder="Ej: Frente al parque, Col. Centro" value={direccion}
            onChange={e => setDireccion(e.target.value)} style={inputStyle(false)}
          />
        </div>

        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Teléfono de contacto</p>
          <input type="tel" placeholder="10 dígitos (opcional)" value={telefonoContacto}
            onChange={e => setTelefonoContacto(e.target.value)} style={inputStyle(false)}
          />
        </div>

        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Ubicación de tu negocio * — toca el mapa para marcar el punto exacto
          </p>
          {ubicacion && (
            <div style={{ height: '220px', borderRadius: '14px', overflow: 'hidden', border: `0.5px solid ${errores.ubicacion ? '#F09595' : 'rgba(29,158,117,0.3)'}` }}>
              <MapContainer center={ubicacion} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MarcarEnMapa posicion={ubicacion} onMover={moverPin} />
              </MapContainer>
            </div>
          )}
          {fueraDeZona && (
            <p style={{ color: '#F09595', fontSize: '12px', marginTop: '6px' }}>⚠️ Ese punto queda fuera del Istmo de Tehuantepec — Chamba solo opera dentro de esa zona.</p>
          )}
          {errores.ubicacion && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '6px' }}>{errores.ubicacion}</p>}
        </div>

        <div style={{ background: 'rgba(240,149,149,0.06)', border: '0.5px solid rgba(240,149,149,0.25)', borderRadius: '12px', padding: '14px 16px' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={aceptoReglas}
              onChange={e => { setAceptoReglas(e.target.checked); setErrores(p => ({ ...p, reglas: null })) }}
              style={{ marginTop: '3px', flexShrink: 0, width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
              Confirmo que mi negocio no vende ni promueve productos ilegales, robados, bebidas alcohólicas sin permiso, sustancias controladas ni ningún artículo prohibido por la ley. Entiendo que Chamba reportará a las autoridades cualquier actividad ilícita detectada, y que mi cuenta será suspendida de inmediato.
            </span>
          </label>
          {errores.reglas && <p style={{ color: '#F09595', fontSize: '11px', marginTop: '6px', marginLeft: '26px' }}>{errores.reglas}</p>}
        </div>

        <button type="button" onClick={registrarNegocio} disabled={guardando}
          style={{ width: '100%', padding: '16px', background: guardando ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif', marginTop: '4px' }}>
          {guardando ? 'Registrando...' : '🏪 Registrar mi negocio'}
        </button>
      </div>
    </div>
  )
}
