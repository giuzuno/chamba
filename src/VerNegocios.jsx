import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const ICONOS_CATEGORIA = {
  tiendita: '🏪', restaurante: '🍽️', antojitos: '🌮', panaderia: '🥖', otro: '✨',
}

export default function VerNegocios({ onVolver }) {
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null)
  const [productos, setProductos] = useState([])
  const [cargandoProductos, setCargandoProductos] = useState(false)

  useEffect(() => { cargarNegocios() }, [])

  async function cargarNegocios() {
    // Se consulta la VISTA pública, nunca la tabla negocios directo — así el
    // teléfono del dueño ni siquiera llega al navegador del cliente.
    const { data } = await supabase.from('negocios_publico').select('*').order('abierto_ahora', { ascending: false })
    if (data) setNegocios(data)
    setLoading(false)
  }

  async function verMenu(negocio) {
    setNegocioSeleccionado(negocio)
    setCargandoProductos(true)
    const { data } = await supabase.from('productos_menu').select('*').eq('negocio_id', negocio.id).eq('disponible', true).order('creado_en', { ascending: false })
    if (data) setProductos(data)
    setCargandoProductos(false)
  }

  // ── Detalle de un negocio (menú) ──
  if (negocioSeleccionado) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
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

          {productos.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '12px 14px' }}>
              <img src={p.foto_url} alt={p.nombre} style={{ width: '54px', height: '54px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{p.nombre}</p>
                {p.categoria && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{p.categoria}</p>}
              </div>
              <p style={{ fontSize: '15px', fontWeight: '700', color: '#1D9E75', flexShrink: 0 }}>${p.precio} MXN</p>
            </div>
          ))}

          {!negocioSeleccionado.abierto_ahora && productos.length > 0 && (
            <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: '#E8A030', textAlign: 'center', marginTop: '8px' }}>
              ⏰ Este negocio está cerrado ahorita — no se pueden hacer pedidos hasta que abra.
            </div>
          )}
        </div>
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
