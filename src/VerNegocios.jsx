import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { esZonaIstmo } from './zonaIstmo'
import { enviarNotificacionCompleta } from './guardarNotificacion'

const ICONOS_CATEGORIA = {
  tiendita: '🏪', restaurante: '🍽️', antojitos: '🌮', panaderia: '🥖', otro: '✨',
}

const COSTO_ENVIO_FIJO = 25 // MXN — fijo por ahora, se puede afinar por distancia más adelante

function MarcarEnMapa({ posicion, onMover }) {
  useMapEvents({
    click(e) { onMover([e.latlng.lat, e.latlng.lng]) },
  })
  return posicion ? <Marker position={posicion} /> : null
}

export default function VerNegocios({ userId, onVolver }) {
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null)
  const [productos, setProductos] = useState([])
  const [cargandoProductos, setCargandoProductos] = useState(false)

  const [carrito, setCarrito] = useState([]) // [{ producto, cantidad }]
  const [mostrarCheckout, setMostrarCheckout] = useState(false)
  const [tipoEntrega, setTipoEntrega] = useState('domicilio')
  const [ubicacionEntrega, setUbicacionEntrega] = useState(null)
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [fueraDeZona, setFueraDeZona] = useState(false)
  const [enviandoPedido, setEnviandoPedido] = useState(false)
  const [errorPedido, setErrorPedido] = useState('')
  const [pedidoExitoso, setPedidoExitoso] = useState(false)

  useEffect(() => { cargarNegocios() }, [])

  useEffect(() => {
    if (mostrarCheckout && tipoEntrega === 'domicilio' && !ubicacionEntrega) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUbicacionEntrega([pos.coords.latitude, pos.coords.longitude]),
        () => setUbicacionEntrega([16.1833, -95.2000])
      )
    }
  }, [mostrarCheckout, tipoEntrega])

  async function cargarNegocios() {
    const { data } = await supabase.from('negocios_publico').select('*').order('abierto_ahora', { ascending: false })
    if (data) setNegocios(data)
    setLoading(false)
  }

  async function verMenu(negocio) {
    setNegocioSeleccionado(negocio)
    setCarrito([]) // el carrito es por negocio — cambiar de negocio limpia el carrito actual
    setCargandoProductos(true)
    const { data } = await supabase.from('productos_menu').select('*').eq('negocio_id', negocio.id).eq('disponible', true).order('creado_en', { ascending: false })
    if (data) setProductos(data)
    setCargandoProductos(false)
  }

  function agregarAlCarrito(producto) {
    setCarrito(prev => {
      const existe = prev.find(c => c.producto.id === producto.id)
      if (existe) return prev.map(c => c.producto.id === producto.id ? { ...c, cantidad: c.cantidad + 1 } : c)
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  function quitarDelCarrito(productoId) {
    setCarrito(prev => {
      const existe = prev.find(c => c.producto.id === productoId)
      if (existe?.cantidad === 1) return prev.filter(c => c.producto.id !== productoId)
      return prev.map(c => c.producto.id === productoId ? { ...c, cantidad: c.cantidad - 1 } : c)
    })
  }

  function cantidadEnCarrito(productoId) {
    return carrito.find(c => c.producto.id === productoId)?.cantidad || 0
  }

  const subtotal = carrito.reduce((sum, c) => sum + c.producto.precio * c.cantidad, 0)
  const costoEnvio = tipoEntrega === 'domicilio' ? COSTO_ENVIO_FIJO : 0
  const total = subtotal + costoEnvio

  function moverPin(nuevaPos) {
    const [lat, lng] = nuevaPos
    if (!esZonaIstmo(lat, lng)) { setFueraDeZona(true); return }
    setFueraDeZona(false)
    setUbicacionEntrega(nuevaPos)
  }

  async function confirmarPedido() {
    setErrorPedido('')
    if (carrito.length === 0) { setErrorPedido('Tu carrito está vacío'); return }
    if (tipoEntrega === 'domicilio' && (!ubicacionEntrega || fueraDeZona)) {
      setErrorPedido('Marca en el mapa dónde quieres que te lo lleven'); return
    }

    setEnviandoPedido(true)

    let viajeEntregaId = null
    if (tipoEntrega === 'domicilio') {
      const { data: viaje, error: errorViaje } = await supabase.from('viajes_entrega').insert({
        cliente_id: userId,
        direccion_entrega: direccionEntrega || null,
        lat: ubicacionEntrega[0],
        lng: ubicacionEntrega[1],
        status: 'buscando_repartidor',
        costo_envio: costoEnvio,
        subtotal_productos: subtotal,
        total,
      }).select().single()
      if (errorViaje) { setErrorPedido('No se pudo crear el viaje de entrega. Intenta de nuevo.'); setEnviandoPedido(false); return }
      viajeEntregaId = viaje.id
    }

    const items = carrito.map(c => ({ producto_id: c.producto.id, nombre: c.producto.nombre, precio: c.producto.precio, cantidad: c.cantidad }))

    const { error: errorPedidoInsert } = await supabase.from('pedidos').insert({
      negocio_id: negocioSeleccionado.id,
      cliente_id: userId,
      viaje_entrega_id: viajeEntregaId,
      items,
      subtotal,
      tipo_entrega: tipoEntrega,
      status: 'pendiente',
    })

    if (errorPedidoInsert) {
      setErrorPedido('No se pudo enviar tu pedido. Intenta de nuevo.')
      setEnviandoPedido(false)
      return
    }

    // Avisarle al negocio que le llegó un pedido nuevo
    await enviarNotificacionCompleta({
      usuarioId: negocioSeleccionado.usuario_id,
      titulo: '🍽️ ¡Nuevo pedido!',
      cuerpo: `Te llegó un pedido de $${subtotal} MXN — ${tipoEntrega === 'domicilio' ? 'a domicilio' : 'el cliente pasa a recogerlo'}.`,
      tipo: 'general',
    })

    setEnviandoPedido(false)
    setPedidoExitoso(true)
  }

  function reiniciarTodo() {
    setPedidoExitoso(false)
    setMostrarCheckout(false)
    setCarrito([])
    setNegocioSeleccionado(null)
    setTipoEntrega('domicilio')
    setUbicacionEntrega(null)
    setDireccionEntrega('')
  }

  // ── Pantalla de éxito ──
  if (pedidoExitoso) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: 'white', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1D9E75', marginBottom: '10px' }}>¡Pedido enviado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '280px', marginBottom: '28px' }}>
          {tipoEntrega === 'domicilio' ? 'El negocio ya lo recibió. En cuanto empiece a prepararlo, te avisamos.' : 'El negocio ya lo recibió. Te avisamos cuando esté listo para que pases por él.'}
        </p>
        <button type="button" onClick={reiniciarTodo} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Ver más negocios
        </button>
      </div>
    )
  }

  // ── Checkout ──
  if (mostrarCheckout) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={() => setMostrarCheckout(false)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>Confirmar pedido</h2>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {errorPedido && (
            <div style={{ background: 'rgba(240,149,149,0.08)', border: '0.5px solid rgba(240,149,149,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#F09595', textAlign: 'center' }}>
              {errorPedido}
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
            {carrito.map(c => (
              <div key={c.producto.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{c.cantidad}x {c.producto.nombre}</span>
                <span style={{ color: 'white', fontWeight: '600' }}>${c.producto.precio * c.cantidad}</span>
              </div>
            ))}
          </div>

          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Cómo lo quieres?</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setTipoEntrega('domicilio')} style={{
                flex: 1, padding: '14px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'sans-serif',
                background: tipoEntrega === 'domicilio' ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                border: tipoEntrega === 'domicilio' ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
                color: tipoEntrega === 'domicilio' ? '#1D9E75' : 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '13px',
              }}>
                🛵 A domicilio<br /><span style={{ fontSize: '11px', fontWeight: '400' }}>+${COSTO_ENVIO_FIJO} envío</span>
              </button>
              <button type="button" onClick={() => setTipoEntrega('recoge_cliente')} style={{
                flex: 1, padding: '14px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'sans-serif',
                background: tipoEntrega === 'recoge_cliente' ? 'rgba(29,158,117,0.2)' : 'rgba(255,255,255,0.05)',
                border: tipoEntrega === 'recoge_cliente' ? '1.5px solid #1D9E75' : '0.5px solid rgba(255,255,255,0.1)',
                color: tipoEntrega === 'recoge_cliente' ? '#1D9E75' : 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: '13px',
              }}>
                🚶 Yo lo recojo<br /><span style={{ fontSize: '11px', fontWeight: '400' }}>Sin costo extra</span>
              </button>
            </div>
          </div>

          {tipoEntrega === 'domicilio' && (
            <div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Referencia de tu dirección</p>
              <input type="text" placeholder="Ej: Casa azul, portón negro" value={direccionEntrega}
                onChange={e => setDireccionEntrega(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px 16px', color: 'white', fontSize: '15px', fontFamily: 'sans-serif', outline: 'none', marginBottom: '14px' }}
              />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Toca el mapa para marcar dónde entregarlo</p>
              {ubicacionEntrega && (
                <div style={{ height: '200px', borderRadius: '14px', overflow: 'hidden', border: `0.5px solid ${fueraDeZona ? '#F09595' : 'rgba(29,158,117,0.3)'}` }}>
                  <MapContainer center={ubicacionEntrega} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MarcarEnMapa posicion={ubicacionEntrega} onMover={moverPin} />
                  </MapContainer>
                </div>
              )}
              {fueraDeZona && <p style={{ color: '#F09595', fontSize: '12px', marginTop: '6px' }}>⚠️ Ese punto queda fuera del Istmo de Tehuantepec.</p>}
            </div>
          )}

          {tipoEntrega === 'recoge_cliente' && negocioSeleccionado?.direccion && (
            <div style={{ background: 'rgba(55,138,221,0.06)', border: '0.5px solid rgba(55,138,221,0.25)', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              📍 Pasas a recogerlo en: <strong style={{ color: 'white' }}>{negocioSeleccionado.direccion}</strong>
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              <span>Subtotal</span><span>${subtotal}</span>
            </div>
            {costoEnvio > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                <span>Envío</span><span>${costoEnvio}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: '800', color: '#1D9E75', marginTop: '6px', paddingTop: '10px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
              <span>Total</span><span>${total} MXN</span>
            </div>
          </div>

          <button type="button" onClick={confirmarPedido} disabled={enviandoPedido}
            style={{ width: '100%', padding: '16px', background: enviandoPedido ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            {enviandoPedido ? 'Enviando...' : `✅ Confirmar pedido — $${total} MXN`}
          </button>
        </div>
      </div>
    )
  }

  // ── Detalle de un negocio (menú) ──
  if (negocioSeleccionado) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', paddingBottom: carrito.length > 0 ? '90px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={() => setNegocioSeleccionado(null)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>{negocioSeleccionado.nombre}</h2>
        </div>

        <div style={{ padding: '20px', display: 'flex', gap: '14px', alignItems: 'center', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <img src={negocioSeleccionado.foto_portada_url} alt={negocioSeleccionado.nombre} style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{negocioSeleccionado.descripcion}</p>
            {negocioSeleccionado.direccion && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>📍 {negocioSeleccionado.direccion}</p>}
          </div>
          <span style={{
            flexShrink: 0, fontSize: '12px', fontWeight: '700', padding: '6px 12px', borderRadius: '100px',
            background: negocioSeleccionado.abierto_ahora ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.06)',
            color: negocioSeleccionado.abierto_ahora ? '#1D9E75' : 'rgba(255,255,255,0.4)',
            border: `1px solid ${negocioSeleccionado.abierto_ahora ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.15)'}`,
          }}>
            {negocioSeleccionado.abierto_ahora ? '🟢 Abierto' : '⚪ Cerrado'}
          </span>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Menú</p>

          {cargandoProductos && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '30px' }}>Cargando...</p>}

          {!cargandoProductos && productos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🍽️</div>
              <p>Este negocio todavía no tiene productos.</p>
            </div>
          )}

          {productos.map(p => {
            const cantidad = cantidadEnCarrito(p.id)
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '12px 14px' }}>
                <img src={p.foto_url} alt={p.nombre} style={{ width: '54px', height: '54px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{p.nombre}</p>
                  <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: '700' }}>${p.precio} MXN</p>
                </div>
                {negocioSeleccionado.abierto_ahora && (
                  cantidad === 0 ? (
                    <button type="button" onClick={() => agregarAlCarrito(p)} style={{ flexShrink: 0, background: '#1D9E75', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                      + Agregar
                    </button>
                  ) : (
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button type="button" onClick={() => quitarDelCarrito(p.id)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', fontSize: '16px', cursor: 'pointer' }}>−</button>
                      <span style={{ fontSize: '14px', fontWeight: '700', minWidth: '16px', textAlign: 'center' }}>{cantidad}</span>
                      <button type="button" onClick={() => agregarAlCarrito(p)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#1D9E75', color: 'white', border: 'none', fontSize: '16px', cursor: 'pointer' }}>+</button>
                    </div>
                  )
                )}
              </div>
            )
          })}

          {!negocioSeleccionado.abierto_ahora && productos.length > 0 && (
            <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: '#E8A030', textAlign: 'center', marginTop: '8px' }}>
              ⏰ Este negocio está cerrado ahorita — no se pueden hacer pedidos hasta que abra.
            </div>
          )}
        </div>

        {carrito.length > 0 && (
          <button type="button" onClick={() => setMostrarCheckout(true)} style={{
            position: 'fixed', bottom: '20px', left: '20px', right: '20px',
            background: '#1D9E75', color: 'white', border: 'none', borderRadius: '16px',
            padding: '16px 20px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <span>🛒 Ver pedido ({carrito.reduce((s, c) => s + c.cantidad, 0)})</span>
            <span>${subtotal} MXN</span>
          </button>
        )}
      </div>
    )
  }

  // ── Lista de negocios ──
  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>Negocios cerca de ti</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>Cargando negocios...</p>}

        {!loading && negocios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏪</div>
            <p>Todavía no hay negocios registrados en tu zona.</p>
          </div>
        )}

        {negocios.map(n => (
          <button key={n.id} type="button" onClick={() => verMenu(n)} disabled={!n.abierto_ahora}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left', width: '100%',
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px',
              padding: '14px 16px', cursor: n.abierto_ahora ? 'pointer' : 'default', fontFamily: 'sans-serif',
              opacity: n.abierto_ahora ? 1 : 0.55,
            }}>
            <img src={n.foto_portada_url} alt={n.nombre} style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{ICONOS_CATEGORIA[n.categoria] || '🍽️'}</span>
                <p style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{n.nombre}</p>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.descripcion}</p>
              {n.es_casa && (
                <span style={{ fontSize: '10px', color: '#E8A030', marginTop: '4px', display: 'inline-block' }}>🏠 Negocio en casa</span>
              )}
            </div>
            <span style={{
              flexShrink: 0, fontSize: '11px', fontWeight: '700', padding: '5px 10px', borderRadius: '100px',
              background: n.abierto_ahora ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.06)',
              color: n.abierto_ahora ? '#1D9E75' : 'rgba(255,255,255,0.4)',
            }}>
              {n.abierto_ahora ? '🟢 Abierto' : '⚪ Cerrado'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
