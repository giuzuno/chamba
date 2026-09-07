import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { sanitizarCampo, tieneInyeccionSQL } from './sanitize'

const CATEGORIAS_PRODUCTO = ['Platillos', 'Bebidas', 'Antojitos', 'Postres', 'Abarrotes', 'Otro']

export default function PanelNegocio({ userId, onVolver }) {
  const [negocio, setNegocio] = useState(null)
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [nombreProd, setNombreProd] = useState('')
  const [precioProd, setPrecioProd] = useState('')
  const [categoriaProd, setCategoriaProd] = useState('')
  const [fotoProdUrl, setFotoProdUrl] = useState(null)
  const [subiendoFotoProd, setSubiendoFotoProd] = useState(false)
  const [guardandoProd, setGuardandoProd] = useState(false)
  const [erroresProd, setErroresProd] = useState({})

  useEffect(() => { cargarNegocio() }, [])

  async function cargarNegocio() {
    const { data } = await supabase.from('negocios').select('*').eq('usuario_id', userId).maybeSingle()
    setNegocio(data)
    if (data) await cargarProductos(data.id)
    setLoading(false)
  }

  async function cargarProductos(negocioId) {
    const { data } = await supabase.from('productos_menu').select('*').eq('negocio_id', negocioId).order('creado_en', { ascending: false })
    if (data) setProductos(data)
  }

  async function toggleAbierto() {
    setCambiandoEstado(true)
    const nuevoEstado = !negocio.abierto_ahora
    await supabase.from('negocios').update({ abierto_ahora: nuevoEstado }).eq('id', negocio.id)
    setNegocio(prev => ({ ...prev, abierto_ahora: nuevoEstado }))
    setCambiandoEstado(false)
  }

  async function toggleDisponible(producto) {
    const nuevo = !producto.disponible
    setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, disponible: nuevo } : p))
    await supabase.from('productos_menu').update({ disponible: nuevo }).eq('id', producto.id)
  }

  async function subirFotoProducto(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendoFotoProd(true)
    const ext = file.name.split('.').pop()
    const path = `negocios/${negocio.id}/productos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('avatares').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      setFotoProdUrl(data.publicUrl)
      setErroresProd(p => ({ ...p, foto: null }))
    }
    setSubiendoFotoProd(false)
  }

  function validarProducto() {
    const e = {}
    if (!nombreProd.trim()) e.nombre = 'El nombre es obligatorio'
    if (!precioProd || parseFloat(precioProd) <= 0) e.precio = 'Pon un precio válido'
    if (!fotoProdUrl) e.foto = 'La foto es obligatoria'
    setErroresProd(e)
    return Object.keys(e).length === 0
  }

  async function agregarProducto() {
    if (!validarProducto()) return
    if (tieneInyeccionSQL(nombreProd)) { setErroresProd(p => ({ ...p, nombre: 'Contenido no válido detectado' })); return }
    setGuardandoProd(true)
    const { error } = await supabase.from('productos_menu').insert({
      negocio_id: negocio.id,
      nombre: sanitizarCampo(nombreProd, 60),
      precio: parseFloat(precioProd),
      foto_url: fotoProdUrl,
      categoria: categoriaProd || null,
      disponible: true,
    })
    setGuardandoProd(false)
    if (!error) {
      setNombreProd(''); setPrecioProd(''); setCategoriaProd(''); setFotoProdUrl(null); setErroresProd({})
      setMostrarForm(false)
      await cargarProductos(negocio.id)
    } else {
      setErroresProd(p => ({ ...p, general: 'No se pudo guardar el producto. Intenta de nuevo.' }))
    }
  }

  const inputStyle = (error) => ({
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: `0.5px solid ${error ? '#F09595' : 'rgba(255,255,255,0.15)'}`,
    borderRadius: '12px', padding: '14px 16px',
    color: 'white', fontSize: '15px', fontFamily: 'sans-serif', outline: 'none',
  })

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'sans-serif' }}>Cargando...</div>
  }

  if (!negocio) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: 'white', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏪</div>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>Todavía no has registrado tu negocio.</p>
        <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>Volver</button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>Mi negocio</h2>
      </div>

      {/* Encabezado del negocio */}
      <div style={{ padding: '20px', display: 'flex', gap: '14px', alignItems: 'center', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <img src={negocio.foto_portada_url} alt={negocio.nombre} style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(29,158,117,0.4)' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>{negocio.nombre}</p>
          {negocio.es_casa && (
            <span style={{ fontSize: '10px', color: '#E8A030', background: 'rgba(232,160,48,0.1)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '100px', padding: '2px 8px', display: 'inline-block', marginTop: '4px' }}>🏠 Negocio en casa</span>
          )}
        </div>
        <button type="button" onClick={toggleAbierto} disabled={cambiandoEstado} style={{
          background: negocio.abierto_ahora ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.06)',
          color: negocio.abierto_ahora ? '#1D9E75' : 'rgba(255,255,255,0.5)',
          border: `1px solid ${negocio.abierto_ahora ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: '100px', padding: '10px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0,
        }}>
          {negocio.abierto_ahora ? '🟢 Abierto' : '⚪ Cerrado'}
        </button>
      </div>

      {/* Lista de productos */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tu menú ({productos.length})
          </p>
          <button type="button" onClick={() => setMostrarForm(true)} style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            + Agregar producto
          </button>
        </div>

        {productos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍽️</div>
            <p>Aún no tienes productos. Agrega el primero para que los clientes puedan verlo.</p>
          </div>
        )}

        {productos.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '12px 14px', opacity: p.disponible ? 1 : 0.5 }}>
            <img src={p.foto_url} alt={p.nombre} style={{ width: '54px', height: '54px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{p.nombre}</p>
              <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: '700' }}>${p.precio} MXN</p>
              {p.categoria && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{p.categoria}</p>}
            </div>
            <button type="button" onClick={() => toggleDisponible(p)} style={{
              flexShrink: 0, background: p.disponible ? 'rgba(29,158,117,0.15)' : 'rgba(240,149,149,0.1)',
              color: p.disponible ? '#1D9E75' : '#F09595',
              border: `1px solid ${p.disponible ? 'rgba(29,158,117,0.3)' : 'rgba(240,149,149,0.3)'}`,
              borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif',
            }}>
              {p.disponible ? '✅ Hay' : '❌ Se acabó'}
            </button>
          </div>
        ))}
      </div>

      {/* Modal para agregar producto */}
      {mostrarForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#161616', borderRadius: '20px 20px 0 0', padding: '24px 20px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'white' }}>Nuevo producto</h3>
              <button type="button" onClick={() => { setMostrarForm(false); setErroresProd({}) }} style={{ background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', fontSize: '22px', cursor: 'pointer' }}>✕</button>
            </div>

            {erroresProd.general && (
              <div style={{ background: 'rgba(240,149,149,0.08)', border: '0.5px solid rgba(240,149,149,0.3)', borderRadius: '12px', padding: '10px 14px', fontSize: '12px', color: '#F09595', marginBottom: '14px' }}>
                {erroresProd.general}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Foto del producto *</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {fotoProdUrl ? (
                  <img src={fotoProdUrl} alt="producto" style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover', border: '2px solid rgba(29,158,117,0.4)' }} />
                ) : (
                  <div style={{ width: '70px', height: '70px', borderRadius: '12px', background: erroresProd.foto ? 'rgba(240,149,149,0.08)' : 'rgba(255,255,255,0.06)', border: `1px dashed ${erroresProd.foto ? '#F09595' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🍽️</div>
                )}
                <label style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.4)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  {subiendoFotoProd ? '⏳ Subiendo...' : fotoProdUrl ? '✅ Cambiar' : '📷 Subir foto'}
                  <input type="file" accept="image/*" capture="environment" onChange={subirFotoProducto} style={{ display: 'none' }} disabled={subiendoFotoProd} />
                </label>
              </div>
              {erroresProd.foto && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '6px' }}>{erroresProd.foto}</p>}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre *</p>
              <input type="text" placeholder="Ej: Torta de milanesa" value={nombreProd}
                onChange={e => { setNombreProd(e.target.value); setErroresProd(p => ({ ...p, nombre: null })) }}
                style={inputStyle(erroresProd.nombre)}
              />
              {erroresProd.nombre && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '4px' }}>{erroresProd.nombre}</p>}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Precio (MXN) *</p>
              <input type="number" inputMode="decimal" placeholder="Ej: 45" value={precioProd}
                onChange={e => { setPrecioProd(e.target.value); setErroresProd(p => ({ ...p, precio: null })) }}
                style={inputStyle(erroresProd.precio)}
              />
              {erroresProd.precio && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '4px' }}>{erroresProd.precio}</p>}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría (opcional)</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {CATEGORIAS_PRODUCTO.map(cat => (
                  <button key={cat} type="button" onClick={() => setCategoriaProd(categoriaProd === cat ? '' : cat)} style={{
                    padding: '7px 12px', borderRadius: '100px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif',
                    background: categoriaProd === cat ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                    border: categoriaProd === cat ? '1px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
                    color: categoriaProd === cat ? '#1D9E75' : 'rgba(255,255,255,0.6)',
                  }}>{cat}</button>
                ))}
              </div>
            </div>

            <button type="button" onClick={agregarProducto} disabled={guardandoProd}
              style={{ width: '100%', padding: '16px', background: guardandoProd ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              {guardandoProd ? 'Guardando...' : '💾 Guardar producto'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
