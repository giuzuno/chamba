import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { enviarNotificacionCompleta } from './guardarNotificacion'

export default function PanelRepartidor({ userId, onVolver }) {
  const [pestana, setPestana] = useState('disponibles')
  const [disponibles, setDisponibles] = useState([])
  const [misEntregas, setMisEntregas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tomandoId, setTomandoId] = useState(null)
  const [avanzando, setAvanzando] = useState(null)
  const [detalleViaje, setDetalleViaje] = useState(null)
  const [pedidosDelViaje, setPedidosDelViaje] = useState([])

  useEffect(() => {
    cargarTodo()
    const channel = supabase.channel('viajes-entrega-repartidor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viajes_entrega' }, () => cargarTodo())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (!detalleViaje) return
    cargarPedidosDelViaje(detalleViaje.id)
    if (detalleViaje.repartidor_en_camino) iniciarSeguimientoGPS()
  }, [detalleViaje?.id])

  async function cargarTodo() {
    const { data: disp } = await supabase.from('viajes_entrega').select('*').eq('status', 'buscando_repartidor').order('creado_en', { ascending: true })
    if (disp) setDisponibles(disp)

    const { data: mios } = await supabase.from('viajes_entrega').select('*').eq('repartidor_id', userId).not('status', 'in', '(entregado,cancelado)').order('asignado_en', { ascending: false })
    if (mios) setMisEntregas(mios)

    setLoading(false)
  }

  async function cargarPedidosDelViaje(viajeId) {
    const { data: pedidos } = await supabase.from('pedidos').select('*').eq('viaje_entrega_id', viajeId)
    if (!pedidos) { setPedidosDelViaje([]); return }
    const negocioIds = [...new Set(pedidos.map(p => p.negocio_id))]
    const { data: negocios } = await supabase.from('negocios_publico').select('*').in('id', negocioIds)
    const pedidosConNegocio = pedidos.map(p => ({ ...p, negocios: negocios?.find(n => n.id === p.negocio_id) }))
    setPedidosDelViaje(pedidosConNegocio)
  }

  async function tomarEntrega(viaje) {
    setTomandoId(viaje.id)
    const { error } = await supabase.from('viajes_entrega')
      .update({ repartidor_id: userId, status: 'asignado', asignado_en: new Date().toISOString() })
      .eq('id', viaje.id).eq('status', 'buscando_repartidor') // evita que 2 repartidores lo tomen a la vez
    setTomandoId(null)
    if (!error) {
      await enviarNotificacionCompleta({ usuarioId: viaje.cliente_id, titulo: '🛵 ¡Ya tienes repartidor!', cuerpo: 'Un repartidor ya va en camino a recoger tu pedido.', tipo: 'en_camino' })
      await cargarTodo()
      setPestana('mias')
    }
  }

  function iniciarSeguimientoGPS() {
    if (!navigator.geolocation || !detalleViaje) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await supabase.from('viajes_entrega').update({ repartidor_lat: pos.coords.latitude, repartidor_lng: pos.coords.longitude }).eq('id', detalleViaje.id)
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 })
  }

  async function avanzarViaje(viaje, nuevoStatus, extra, notifTitulo, notifCuerpo) {
    setAvanzando(viaje.id)
    const updateData = { status: nuevoStatus, ...extra }
    await supabase.from('viajes_entrega').update(updateData).eq('id', viaje.id)

    // Sincroniza el status de los pedidos de este viaje según el paso del repartidor
    if (nuevoStatus === 'en_camino') {
      await supabase.from('pedidos').update({ status: 'recogido' }).eq('viaje_entrega_id', viaje.id)
    }
    if (nuevoStatus === 'entregado') {
      await supabase.from('pedidos').update({ status: 'entregado' }).eq('viaje_entrega_id', viaje.id)
    }

    await enviarNotificacionCompleta({ usuarioId: viaje.cliente_id, titulo: notifTitulo, cuerpo: notifCuerpo, tipo: nuevoStatus === 'entregado' ? 'llegada' : 'en_camino' })

    setAvanzando(null)
    setDetalleViaje(null)
    await cargarTodo()
  }

  function abrirWaze(lat, lng) {
    window.open(`waze://?ll=${lat},${lng}&navigate=yes`, '_blank')
  }

  // ── Detalle de una entrega tomada ──
  if (detalleViaje) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={() => setDetalleViaje(null)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Entrega en curso</h2>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(29,158,117,0.06)', border: '1px solid rgba(29,158,117,0.25)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: '#1D9E75', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📦 Recoger en</p>
            {pedidosDelViaje.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <img src={p.negocios?.foto_portada_url} alt={p.negocios?.nombre} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{p.negocios?.nombre}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{p.negocios?.direccion}</p>
                </div>
                <button type="button" onClick={() => abrirWaze(p.negocios?.lat, p.negocios?.lng)} style={{ background: 'rgba(55,138,221,0.15)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.4)', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  🗺️ Ir
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(55,138,221,0.06)', border: '1px solid rgba(55,138,221,0.25)', borderRadius: '16px', padding: '16px' }}>
            <p style={{ fontSize: '11px', color: '#378ADD', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏁 Entregar en</p>
            <p style={{ fontSize: '13px', color: 'white', marginBottom: '4px' }}>{detalleViaje.direccion_entrega || 'Sin referencia adicional'}</p>
            <button type="button" onClick={() => abrirWaze(detalleViaje.lat, detalleViaje.lng)} style={{ marginTop: '8px', background: 'rgba(55,138,221,0.15)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.4)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              🗺️ Cómo llegar
            </button>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Tu pago por esta entrega</span>
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1D9E75' }}>${detalleViaje.costo_envio} MXN</span>
          </div>

          {detalleViaje.status === 'asignado' && (
            <button type="button" disabled={avanzando === detalleViaje.id}
              onClick={() => avanzarViaje(detalleViaje, 'recolectando', {}, '🛵 En camino a recoger', 'Tu repartidor va en camino a recoger tu pedido.')}
              style={{ width: '100%', padding: '16px', background: '#378ADD', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              🛵 Voy en camino a recoger
            </button>
          )}
          {detalleViaje.status === 'recolectando' && (
            <button type="button" disabled={avanzando === detalleViaje.id}
              onClick={() => avanzarViaje(detalleViaje, 'en_camino', { repartidor_en_camino: true }, '📦 ¡Ya recogieron tu pedido!', 'Tu pedido va en camino a tu dirección.')}
              style={{ width: '100%', padding: '16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              📦 Ya recogí — voy para allá
            </button>
          )}
          {detalleViaje.status === 'en_camino' && (
            <button type="button" disabled={avanzando === detalleViaje.id}
              onClick={() => avanzarViaje(detalleViaje, 'entregado', { entregado_en: new Date().toISOString(), repartidor_en_camino: false }, '🎉 ¡Pedido entregado!', 'Esperamos que lo disfrutes.')}
              style={{ width: '100%', padding: '16px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              ✅ Ya lo entregué
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Entregas</h2>
      </div>

      <div style={{ display: 'flex', gap: '6px', padding: '14px 20px 0' }}>
        {[['disponibles', '🔍', 'Disponibles', disponibles.length], ['mias', '🛵', 'Mis entregas', misEntregas.length]].map(([key, icon, label, count]) => (
          <button key={key} type="button" onClick={() => setPestana(key)} style={{
            flex: 1, padding: '10px 4px', border: 'none', borderRadius: '10px',
            background: pestana === key ? '#1D9E75' : 'rgba(255,255,255,0.06)',
            color: pestana === key ? 'white' : 'rgba(255,255,255,0.5)',
            fontSize: '12px', fontWeight: pestana === key ? '700' : '400', cursor: 'pointer', fontFamily: 'sans-serif',
          }}>
            {icon} {label} {count > 0 && `(${count})`}
          </button>
        ))}
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>Cargando...</p>}

        {!loading && pestana === 'disponibles' && disponibles.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛵</div>
            <p>No hay entregas disponibles ahorita.</p>
          </div>
        )}

        {!loading && pestana === 'disponibles' && disponibles.map(v => (
          <div key={v.id} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>🛵 Entrega a domicilio</span>
              <span style={{ fontSize: '16px', fontWeight: '800', color: '#1D9E75' }}>${v.costo_envio} MXN</span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>{v.direccion_entrega || 'Entrega dentro del Istmo'}</p>
            <button type="button" disabled={tomandoId === v.id} onClick={() => tomarEntrega(v)}
              style={{ width: '100%', padding: '12px', background: tomandoId === v.id ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              {tomandoId === v.id ? 'Tomando...' : '🛵 Tomar esta entrega'}
            </button>
          </div>
        ))}

        {!loading && pestana === 'mias' && misEntregas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p>No tienes entregas activas.</p>
          </div>
        )}

        {!loading && pestana === 'mias' && misEntregas.map(v => {
          const etiquetas = { asignado: '🟡 Ir a recoger', recolectando: '🛵 Recolectando', en_camino: '🟢 En camino al cliente' }
          return (
            <button key={v.id} type="button" onClick={() => setDetalleViaje(v)} style={{
              textAlign: 'left', width: '100%', background: 'rgba(29,158,117,0.06)', border: '1px solid rgba(29,158,117,0.25)',
              borderRadius: '16px', padding: '16px', cursor: 'pointer', fontFamily: 'sans-serif',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1D9E75' }}>{etiquetas[v.status] || v.status}</span>
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'white' }}>${v.costo_envio} MXN</span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{v.direccion_entrega || 'Ver detalle'}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
