import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function PanelAdmin({ onLogout, nombreAdmin }) {
  const [pestana, setPestana] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [trabajos, setTrabajos] = useState([])
  const [disputas, setDisputas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busquedaUsuario, setBusquedaUsuario] = useState('')
  const [trabajoDetalle, setTrabajoDetalle] = useState(null)
  const [loadingAccion, setLoadingAccion] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    await Promise.all([cargarStats(), cargarTrabajos(), cargarDisputas(), cargarUsuarios()])
    setCargando(false)
  }

  async function cargarStats() {
    const [
      { count: totalUsuarios },
      { count: totalTrabajos },
      { count: trabajosActivos },
      { count: disputasAbiertas },
      { data: completados }
    ] = await Promise.all([
      supabase.from('usuarios').select('*', { count: 'exact', head: true }),
      supabase.from('trabajos').select('*', { count: 'exact', head: true }),
      supabase.from('trabajos').select('*', { count: 'exact', head: true }).in('status', ['publicado', 'aceptado', 'en_revision']),
      supabase.from('disputas').select('*', { count: 'exact', head: true }).eq('status', 'abierta'),
      supabase.from('trabajos').select('precio_acordado, presupuesto').eq('status', 'completado'),
    ])

    const gananciaTotal = (completados || []).reduce((acc, t) => acc + (t.precio_acordado || t.presupuesto || 0), 0)
    const comision = Math.round(gananciaTotal * 0.12)

    setStats({ totalUsuarios, totalTrabajos, trabajosActivos, disputasAbiertas, gananciaTotal, comision, completados: completados?.length || 0 })
  }

  async function cargarTrabajos() {
    const { data } = await supabase.from('trabajos')
      .select('id, categoria, descripcion, status, presupuesto, precio_acordado, creado_en, cliente_id, trabajador_id')
      .order('creado_en', { ascending: false })
      .limit(100)
    if (data) setTrabajos(data)
  }

  async function cargarDisputas() {
    const { data } = await supabase.from('disputas')
      .select('*, trabajos(categoria, presupuesto, precio_acordado, cliente_id, trabajador_id)')
      .order('creado_en', { ascending: false })
    if (data) setDisputas(data)
  }

  async function cargarUsuarios() {
    const { data } = await supabase.from('usuarios')
      .select('id, nombre, email, es_trabajador, es_admin, rating_promedio, total_trabajos, creado_en, baneado')
      .order('creado_en', { ascending: false })
    if (data) setUsuarios(data)
  }

  async function resolverDisputa(disputaId, trabajoId, ganador) {
    setLoadingAccion(disputaId)
    const nuevoStatus = ganador === 'cliente' ? 'cancelado' : 'completado'
    await supabase.from('trabajos').update({ status: nuevoStatus, en_disputa: false }).eq('id', trabajoId)
    await supabase.from('disputas').update({ status: 'resuelta', resolucion: ganador }).eq('id', disputaId)
    await cargarDisputas()
    await cargarStats()
    setLoadingAccion(null)
  }

  async function banearUsuario(usuarioId, baneado) {
    setLoadingAccion(usuarioId)
    await supabase.from('usuarios').update({ baneado: !baneado }).eq('id', usuarioId)
    await cargarUsuarios()
    setLoadingAccion(null)
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `hace ${hrs} hrs`
    return `hace ${Math.floor(hrs / 24)} días`
  }

  const statusColor = {
    publicado: '#E8A030', aceptado: '#1D9E75', en_revision: '#378ADD',
    completado: '#1D9E75', cancelado: '#F09595', en_disputa: '#F09595'
  }

  const trabajosFiltrados = filtroStatus === 'todos'
    ? trabajos
    : trabajos.filter(t => t.status === filtroStatus)

  const usuariosFiltrados = busquedaUsuario
    ? usuarios.filter(u => u.nombre?.toLowerCase().includes(busquedaUsuario.toLowerCase()) || u.email?.toLowerCase().includes(busquedaUsuario.toLowerCase()))
    : usuarios

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)', background: '#111' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#1D9E75', borderRadius: '8px', padding: '6px 10px', fontSize: '14px', fontWeight: '700' }}>C</div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#1D9E75' }}>Hola, {nombreAdmin} 👋</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Panel de administración · Chamba</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} style={{ background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Cerrar sesión
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#111' }}>
        {[
          ['dashboard', '📊 Dashboard'],
          ['trabajos', `🏁 Trabajos${trabajos.length > 0 ? ` (${trabajos.length})` : ''}`],
          ['disputas', `⚠️ Disputas${stats.disputasAbiertas > 0 ? ` (${stats.disputasAbiertas})` : ''}`],
          ['usuarios', `👥 Usuarios${usuarios.length > 0 ? ` (${usuarios.length})` : ''}`],
        ].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setPestana(key)} style={{
            flex: 1, padding: '12px 4px', border: 'none', background: 'transparent',
            color: pestana === key ? '#1D9E75' : 'rgba(255,255,255,0.4)',
            fontSize: '12px', fontWeight: pestana === key ? '700' : '400',
            cursor: 'pointer', fontFamily: 'sans-serif',
            borderBottom: pestana === key ? '2px solid #1D9E75' : '2px solid transparent',
          }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {cargando && <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>Cargando datos...</div>}

        {/* ── DASHBOARD ── */}
        {!cargando && pestana === 'dashboard' && (
          <>
            {/* Comisión destacada */}
            <div style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Comisión Chamba (12%)</p>
              <p style={{ fontSize: '44px', fontWeight: '800', color: '#1D9E75', lineHeight: 1 }}>${stats.comision?.toLocaleString('es-MX')}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>de ${stats.gananciaTotal?.toLocaleString('es-MX')} MXN en trabajos completados</p>
            </div>

            {/* Grid de stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Usuarios', valor: stats.totalUsuarios, color: '#378ADD', icon: '👥' },
                { label: 'Trabajos totales', valor: stats.totalTrabajos, color: '#E8A030', icon: '📋' },
                { label: 'Activos ahora', valor: stats.trabajosActivos, color: '#1D9E75', icon: '🔧' },
                { label: 'Completados', valor: stats.completados, color: '#1D9E75', icon: '🏁' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</p>
                  <p style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.valor || 0}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Disputas abiertas alert */}
            {stats.disputasAbiertas > 0 && (
              <div style={{ background: 'rgba(240,149,149,0.08)', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#F09595', marginBottom: '4px' }}>⚠️ {stats.disputasAbiertas} disputa{stats.disputasAbiertas > 1 ? 's' : ''} pendiente{stats.disputasAbiertas > 1 ? 's' : ''}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Requieren tu atención</p>
                </div>
                <button type="button" onClick={() => setPestana('disputas')} style={{ background: '#F09595', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  Resolver
                </button>
              </div>
            )}

            <button type="button" onClick={cargarDatos} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
              🔄 Actualizar datos
            </button>
          </>
        )}

        {/* ── TRABAJOS ── */}
        {!cargando && pestana === 'trabajos' && (
          <>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['todos', 'publicado', 'aceptado', 'en_revision', 'completado', 'cancelado', 'en_disputa'].map(s => (
                <button key={s} type="button" onClick={() => setFiltroStatus(s)} style={{
                  padding: '6px 12px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap',
                  background: filtroStatus === s ? '#1D9E75' : 'rgba(255,255,255,0.06)',
                  color: filtroStatus === s ? 'white' : 'rgba(255,255,255,0.5)',
                  fontSize: '11px', fontWeight: filtroStatus === s ? '600' : '400',
                  cursor: 'pointer', fontFamily: 'sans-serif'
                }}>
                  {s === 'todos' ? `Todos (${trabajos.length})` : `${s} (${trabajos.filter(t => t.status === s).length})`}
                </button>
              ))}
            </div>

            {trabajosFiltrados.map(t => (
              <div key={t.id} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>{t.categoria}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{t.descripcion?.slice(0, 50)}{t.descripcion?.length > 50 ? '...' : ''}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: `${statusColor[t.status]}20`, color: statusColor[t.status], border: `0.5px solid ${statusColor[t.status]}40`, fontWeight: '600' }}>
                      {t.status}
                    </span>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#1D9E75', marginTop: '4px' }}>${t.precio_acordado || t.presupuesto} MXN</p>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>{tiempoTranscurrido(t.creado_en)}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{t.id.slice(0, 8)}...</p>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── DISPUTAS ── */}
        {!cargando && pestana === 'disputas' && (
          <>
            {disputas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <p>Sin disputas pendientes</p>
              </div>
            ) : disputas.map(d => (
              <div key={d.id} style={{ background: d.status === 'abierta' ? 'rgba(240,149,149,0.06)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${d.status === 'abierta' ? 'rgba(240,149,149,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{d.trabajos?.categoria || 'Trabajo'}</p>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: d.status === 'abierta' ? 'rgba(240,149,149,0.15)' : 'rgba(29,158,117,0.15)', color: d.status === 'abierta' ? '#F09595' : '#1D9E75', fontWeight: '600' }}>
                    {d.status}
                  </span>
                </div>
                {d.descripcion && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', lineHeight: '1.4' }}>{d.descripcion}</p>}
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '12px' }}>{tiempoTranscurrido(d.creado_en)}</p>
                {d.status === 'abierta' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => resolverDisputa(d.id, d.trabajo_id, 'cliente')} disabled={loadingAccion === d.id}
                      style={{ flex: 1, padding: '10px', background: 'rgba(55,138,221,0.15)', color: '#378ADD', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                      👤 Dar razón al cliente
                    </button>
                    <button type="button" onClick={() => resolverDisputa(d.id, d.trabajo_id, 'trabajador')} disabled={loadingAccion === d.id}
                      style={{ flex: 1, padding: '10px', background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                      🔧 Dar razón al trabajador
                    </button>
                  </div>
                )}
                {d.status === 'resuelta' && (
                  <p style={{ fontSize: '12px', color: '#1D9E75' }}>✅ Resuelta a favor del {d.resolucion}</p>
                )}
              </div>
            ))}
          </>
        )}

        {/* ── USUARIOS ── */}
        {!cargando && pestana === 'usuarios' && (
          <>
            <input type="text" placeholder="🔍 Buscar por nombre o correo..."
              value={busquedaUsuario} onChange={e => setBusquedaUsuario(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
            />
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''}</p>

            {usuariosFiltrados.map(u => (
              <div key={u.id} style={{ background: u.baneado ? 'rgba(240,149,149,0.05)' : 'rgba(255,255,255,0.04)', border: `0.5px solid ${u.baneado ? 'rgba(240,149,149,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>{u.nombre || 'Sin nombre'}</p>
                    {u.es_admin && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(232,160,48,0.2)', color: '#E8A030', fontWeight: '700' }}>ADMIN</span>}
                    {u.es_trabajador && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(55,138,221,0.2)', color: '#378ADD', fontWeight: '600' }}>trabajador</span>}
                    {u.baneado && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(240,149,149,0.2)', color: '#F09595', fontWeight: '700' }}>BANEADO</span>}
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {u.rating_promedio && <span style={{ fontSize: '10px', color: '#F5A623' }}>⭐ {u.rating_promedio}</span>}
                    {u.total_trabajos > 0 && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{u.total_trabajos} trabajos</span>}
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{tiempoTranscurrido(u.creado_en)}</span>
                  </div>
                </div>
                {!u.es_admin && (
                  <button type="button" onClick={() => banearUsuario(u.id, u.baneado)} disabled={loadingAccion === u.id}
                    style={{ marginLeft: '12px', padding: '6px 12px', background: u.baneado ? 'rgba(29,158,117,0.1)' : 'rgba(240,149,149,0.1)', color: u.baneado ? '#1D9E75' : '#F09595', border: `0.5px solid ${u.baneado ? 'rgba(29,158,117,0.3)' : 'rgba(240,149,149,0.3)'}`, borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0 }}>
                    {u.baneado ? '✅ Desbanear' : '🚫 Banear'}
                  </button>
                )}
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  )
}
