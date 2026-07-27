import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { enviarNotificacionCompleta } from './guardarNotificacion'
import { banearDispositivo } from './useFingerprint'

export default function PanelAdmin({ onLogout, nombreAdmin }) {
  const [pestana, setPestana] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [trabajos, setTrabajos] = useState([])
  const [disputas, setDisputas] = useState([])
  const [verificaciones, setVerificaciones] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [busquedaUsuario, setBusquedaUsuario] = useState('')
  const [dispositivosBaneados, setDispositivosBaneados] = useState([])
  const [trabajosEnVivo, setTrabajosEnVivo] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [usuarioExpandido, setUsuarioExpandido] = useState(null)
  const [loadingAccion, setLoadingAccion] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    await Promise.all([
      cargarStats(), cargarTrabajos(), cargarDisputas(), cargarUsuarios(),
      cargarDispositivosBaneados(), cargarTrabajosEnVivo(), cargarVerificaciones()
    ])
    setCargando(false)
  }

  async function cargarDispositivosBaneados() {
    const { data } = await supabase.from('dispositivos_baneados').select('*').order('creado_en', { ascending: false }).limit(50)
    if (data) setDispositivosBaneados(data)
  }

  async function cargarTrabajosEnVivo() {
    const { data } = await supabase.from('trabajos')
      .select('id, categoria, status, cliente_id, trabajador_id, precio_acordado, presupuesto, creado_en')
      .in('status', ['publicado', 'aceptado', 'en_revision', 'en_disputa'])
      .order('creado_en', { ascending: false })
    if (data) setTrabajosEnVivo(data)
  }

  async function cargarVerificaciones() {
    const { data } = await supabase.from('verificaciones')
      .select('*, usuarios(nombre, email, foto_url)')
      .order('creado_en', { ascending: false })
    if (data) setVerificaciones(data)
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

    // Comisión real de Mercado Pago: 3.49% + $4 MXN fijo por transacción, + 16% IVA sobre ese subtotal
    const numCompletados = completados?.length || 0
    const subtotalMP = (gananciaTotal * 0.0349) + (numCompletados * 4)
    const costoMP = Math.round(subtotalMP * 1.16)
    const gananciaNetaChamba = comision - costoMP

    setStats({ totalUsuarios, totalTrabajos, trabajosActivos, disputasAbiertas, gananciaTotal, comision, costoMP, gananciaNetaChamba, completados: numCompletados })
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
      .select(`
        id, nombre, email, es_trabajador, es_admin, rating_promedio, total_trabajos,
        creado_en, baneado, amonestaciones, foto_url, bio, categorias_servicio,
        lat, lng, tipo_vehiculo, vehiculo_marca, vehiculo_color, vehiculo_placas,
        contacto_emergencia_nombre, contacto_emergencia_telefono, mp_account_id,
        device_fingerprint
      `)
      .order('creado_en', { ascending: false })
    if (data) setUsuarios(data)
  }

  async function resolverVerificacion(verificacionId, usuarioId, aprobar, notasRechazo) {
    setLoadingAccion(verificacionId)
    const nuevoStatus = aprobar ? 'aprobado' : 'rechazado'

    await supabase.from('verificaciones').update({
      status: nuevoStatus,
      ...(notasRechazo ? { notas_admin: notasRechazo } : {}),
    }).eq('id', verificacionId)

    await enviarNotificacionCompleta({
      usuarioId,
      titulo: aprobar ? '✅ Identidad verificada' : '❌ Verificación rechazada',
      cuerpo: aprobar
        ? 'Tu identidad fue verificada. Ya tienes la insignia en tu perfil.'
        : `Tu verificación fue rechazada. ${notasRechazo || 'Revisa que tus documentos sean legibles y estén vigentes, y vuelve a intentarlo.'}`,
      tipo: 'general',
    })

    await cargarVerificaciones()
    setLoadingAccion(null)
  }

  async function resolverDisputa(disputaId, trabajoId, ganador) {
    setLoadingAccion(disputaId)

    // Ejecutar la acción real en Mercado Pago según quién ganó la disputa
    const nombreFuncion = ganador === 'cliente' ? 'cancelar-pago' : 'liberar-pago'
    const { data, error: fnError } = await supabase.functions.invoke(nombreFuncion, {
      body: { trabajoId }
    })

    if (fnError || !data?.ok) {
      alert(`No se pudo procesar el pago en Mercado Pago: ${data?.error || fnError?.message || 'error desconocido'}. La disputa NO se marcó como resuelta — intenta de nuevo.`)
      setLoadingAccion(null)
      return
    }

    await supabase.from('trabajos').update({ en_disputa: false }).eq('id', trabajoId)
    await supabase.from('disputas').update({ status: 'resuelta', resolucion: ganador }).eq('id', disputaId)

    // Amonestar al perdedor y banear si llega a 3
    const { data: trabajo } = await supabase.from('trabajos').select('cliente_id, trabajador_id').eq('id', trabajoId).maybeSingle()
    if (trabajo) {
      const perdedorId = ganador === 'cliente' ? trabajo.trabajador_id : trabajo.cliente_id
      if (perdedorId) {
        const { data: usuario } = await supabase.from('usuarios').select('amonestaciones').eq('id', perdedorId).maybeSingle()
        const nuevas = (usuario?.amonestaciones || 0) + 1
        const baneado = nuevas >= 3
        await supabase.from('usuarios').update({ amonestaciones: nuevas, ...(baneado ? { baneado: true } : {}) }).eq('id', perdedorId)
        if (baneado) await banearDispositivo(perdedorId, 'Baneado tras 3 amonestaciones (disputa)')
      }
    }

    await cargarDisputas()
    await cargarStats()
    setLoadingAccion(null)
  }

  async function amonestacionManual(usuarioId, actuales) {
    setLoadingAccion(usuarioId)
    const nuevas = actuales + 1
    const baneado = nuevas >= 3
    await supabase.from('usuarios').update({ amonestaciones: nuevas, ...(baneado ? { baneado: true } : {}) }).eq('id', usuarioId)
    if (baneado) await banearDispositivo(usuarioId, 'Baneado tras 3 amonestaciones')
    await cargarUsuarios()
    if (baneado) await cargarDispositivosBaneados()
    setLoadingAccion(null)
  }

  async function banearUsuario(usuarioId, baneado) {
    setLoadingAccion(usuarioId)
    // Si se está baneando (no desbaneando) → banear también el dispositivo
    if (!baneado) {
      await banearDispositivo(usuarioId, 'Baneado por administrador')
    }
    await supabase.from('usuarios').update({ baneado: !baneado }).eq('id', usuarioId)
    await cargarUsuarios()
    await cargarDispositivosBaneados()
    setLoadingAccion(null)
  }

  async function desbanearDispositivo(dispositivoId) {
    setLoadingAccion(dispositivoId)
    await supabase.from('dispositivos_baneados').delete().eq('id', dispositivoId)
    await cargarDispositivosBaneados()
    setLoadingAccion(null)
  }

  async function recordarMercadoPago() {
    const trabajadoresSinMP = usuarios.filter(u => u.es_trabajador && !u.mp_account_id && !u.baneado)
    if (trabajadoresSinMP.length === 0) return
    if (!confirm(`Se enviará un recordatorio push a ${trabajadoresSinMP.length} trabajador(es) sin Mercado Pago conectado. ¿Continuar?`)) return

    setLoadingAccion('recordatorio_mp')
    for (const u of trabajadoresSinMP) {
      await enviarNotificacionCompleta({
        usuarioId: u.id,
        titulo: '🏦 Conecta tu Mercado Pago',
        cuerpo: 'Sin tu cuenta de Mercado Pago conectada no puedes recibir el pago de tus trabajos. Ve a tu perfil → Pagos para conectarla — toma menos de 2 minutos.',
        tipo: 'general',
      })
    }
    setLoadingAccion(null)
    alert(`Recordatorio enviado a ${trabajadoresSinMP.length} trabajador(es).`)
  }

  async function recordarVerificacion() {
    const idsAprobados = new Set(verificaciones.filter(v => v.status === 'aprobado').map(v => v.usuario_id))
    const trabajadoresSinVerificar = usuarios.filter(u => u.es_trabajador && !u.baneado && !idsAprobados.has(u.id))
    if (trabajadoresSinVerificar.length === 0) return
    if (!confirm(`Se enviará un recordatorio push a ${trabajadoresSinVerificar.length} trabajador(es) sin identidad verificada. ¿Continuar?`)) return

    setLoadingAccion('recordatorio_verificacion')
    for (const u of trabajadoresSinVerificar) {
      await enviarNotificacionCompleta({
        usuarioId: u.id,
        titulo: '🪪 Verifica tu identidad',
        cuerpo: 'A partir del 30 de julio necesitas tu identidad verificada para poder seguir aceptando trabajos en Chamba. Ve a tu perfil → Mi info para completarla — solo toma unos minutos.',
        tipo: 'general',
      })
    }
    setLoadingAccion(null)
    alert(`Recordatorio enviado a ${trabajadoresSinVerificar.length} trabajador(es).`)
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

  const verificacionesPendientes = verificaciones.filter(v => v.status === 'pendiente')

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
      <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#111', overflowX: 'auto' }}>
        {[
          ['dashboard', '📊 Dashboard'],
          ['trabajos', `🏁 Trabajos${trabajos.length > 0 ? ` (${trabajos.length})` : ''}`],
          ['disputas', `⚠️ Disputas${stats.disputasAbiertas > 0 ? ` (${stats.disputasAbiertas})` : ''}`],
          ['verificaciones', `🪪 Verificaciones${verificacionesPendientes.length > 0 ? ` (${verificacionesPendientes.length})` : ''}`],
          ['usuarios', `👥 Usuarios${usuarios.length > 0 ? ` (${usuarios.length})` : ''}`],
          ['en_vivo', `🔴 En vivo${trabajosEnVivo.length > 0 ? ` (${trabajosEnVivo.length})` : ''}`],
          ['baneados', `🚫 Baneados${dispositivosBaneados.length > 0 ? ` (${dispositivosBaneados.length})` : ''}`],
        ].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setPestana(key)} style={{
            flex: '1 0 auto', minWidth: '90px', padding: '12px 4px', border: 'none', background: 'transparent',
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
              <p style={{ fontSize: '44px', fontWeight: '800', color: '#1D9E75', lineHeight: 1 }}>${(stats.comision || 0).toLocaleString('es-MX')}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>de ${(stats.gananciaTotal || 0).toLocaleString('es-MX')} MXN en trabajos completados</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '14px', paddingTop: '14px', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
                <div>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Costo MP</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#F09595' }}>-${(stats.costoMP || 0).toLocaleString('es-MX')}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Neto Chamba</p>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75' }}>${(stats.gananciaNetaChamba || 0).toLocaleString('es-MX')}</p>
                </div>
              </div>
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

            {/* Verificaciones pendientes alert */}
            {verificacionesPendientes.length > 0 && (
              <div style={{ background: 'rgba(55,138,221,0.08)', border: '1px solid rgba(55,138,221,0.3)', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#378ADD', marginBottom: '4px' }}>🪪 {verificacionesPendientes.length} verificación{verificacionesPendientes.length > 1 ? 'es' : ''} pendiente{verificacionesPendientes.length > 1 ? 's' : ''}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Identidad o vehículo por revisar</p>
                </div>
                <button type="button" onClick={() => setPestana('verificaciones')} style={{ background: '#378ADD', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                  Revisar
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

        {/* ── VERIFICACIONES ── */}
        {!cargando && pestana === 'verificaciones' && (
          <>
            {verificaciones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🪪</div>
                <p>Sin verificaciones enviadas todavía</p>
              </div>
            ) : verificaciones.map(v => (
              <div key={v.id} style={{ background: v.status === 'pendiente' ? 'rgba(55,138,221,0.06)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${v.status === 'pendiente' ? 'rgba(55,138,221,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {v.usuarios?.foto_url && <img src={v.usuarios.foto_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />}
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600' }}>{v.usuarios?.nombre || 'Sin nombre'}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{v.tipo && v.tipo !== 'identidad' ? `🚗 Chofer (${v.tipo})` : '🪪 Identidad general'}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', fontWeight: '600',
                    background: v.status === 'pendiente' ? 'rgba(55,138,221,0.15)' : v.status === 'aprobado' ? 'rgba(29,158,117,0.15)' : 'rgba(240,149,149,0.15)',
                    color: v.status === 'pendiente' ? '#378ADD' : v.status === 'aprobado' ? '#1D9E75' : '#F09595' }}>
                    {v.status}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '12px', paddingBottom: '4px' }}>
                  {[
                    { url: v.ine_url, label: 'INE' },
                    { url: v.selfie_url, label: 'Selfie' },
                    { url: v.licencia_url, label: 'Licencia' },
                    { url: v.circulacion_url, label: 'Circulación' },
                    { url: v.foto_vehiculo_url, label: 'Vehículo' },
                    { url: v.seguro_url, label: 'Seguro' },
                  ].filter(d => d.url).map(d => (
                    <a key={d.label} href={d.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0, textDecoration: 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <img src={d.url} alt={d.label} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)' }} />
                        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>{d.label}</span>
                      </div>
                    </a>
                  ))}
                </div>

                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>{tiempoTranscurrido(v.creado_en)}</p>

                {v.status === 'pendiente' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => resolverVerificacion(v.id, v.usuario_id, true)} disabled={loadingAccion === v.id}
                      style={{ flex: 1, padding: '10px', background: 'rgba(29,158,117,0.15)', color: '#1D9E75', border: '1px solid rgba(29,158,117,0.3)', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                      ✅ Aprobar
                    </button>
                    <button type="button" onClick={() => {
                      const motivo = prompt('¿Motivo del rechazo? (se le muestra al usuario)')
                      if (motivo === null) return
                      resolverVerificacion(v.id, v.usuario_id, false, motivo)
                    }} disabled={loadingAccion === v.id}
                      style={{ flex: 1, padding: '10px', background: 'rgba(240,149,149,0.15)', color: '#F09595', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                      ❌ Rechazar
                    </button>
                  </div>
                )}
                {v.status !== 'pendiente' && v.notas_admin && (
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Nota: {v.notas_admin}</p>
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

            {usuarios.filter(u => u.es_trabajador && !u.mp_account_id && !u.baneado).length > 0 && (
              <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#E8A030' }}>🏦 {usuarios.filter(u => u.es_trabajador && !u.mp_account_id && !u.baneado).length} trabajador(es) sin Mercado Pago conectado</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>No pueden recibir pagos hasta que lo conecten</p>
                </div>
                <button type="button" onClick={recordarMercadoPago} disabled={loadingAccion === 'recordatorio_mp'}
                  style={{ padding: '8px 14px', background: '#E8A030', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {loadingAccion === 'recordatorio_mp' ? 'Enviando...' : '📣 Recordar'}
                </button>
              </div>
            )}

            {usuarios.filter(u => u.es_trabajador && !u.baneado && !verificaciones.some(v => v.usuario_id === u.id && v.status === 'aprobado')).length > 0 && (
              <div style={{ background: 'rgba(55,138,221,0.08)', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#378ADD' }}>🪪 {usuarios.filter(u => u.es_trabajador && !u.baneado && !verificaciones.some(v => v.usuario_id === u.id && v.status === 'aprobado')).length} trabajador(es) sin identidad verificada</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>No podrán aceptar trabajos después del 30 de julio</p>
                </div>
                <button type="button" onClick={recordarVerificacion} disabled={loadingAccion === 'recordatorio_verificacion'}
                  style={{ padding: '8px 14px', background: '#378ADD', color: 'white', border: 'none', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {loadingAccion === 'recordatorio_verificacion' ? 'Enviando...' : '📣 Recordar'}
                </button>
              </div>
            )}

            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? 's' : ''}</p>

            {usuariosFiltrados.map(u => {
              const expandido = usuarioExpandido === u.id
              return (
                <div key={u.id} style={{ background: u.baneado ? 'rgba(240,149,149,0.05)' : 'rgba(255,255,255,0.04)', border: `0.5px solid ${u.baneado ? 'rgba(240,149,149,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div onClick={() => setUsuarioExpandido(expandido ? null : u.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {u.foto_url ? (
                        <img src={u.foto_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, color: 'rgba(255,255,255,0.4)' }}>
                          {(u.nombre || u.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '14px', fontWeight: '600' }}>{u.nombre || 'Sin nombre'}</p>
                          {u.es_admin && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(232,160,48,0.2)', color: '#E8A030', fontWeight: '700' }}>ADMIN</span>}
                          {u.es_trabajador && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(55,138,221,0.2)', color: '#378ADD', fontWeight: '600' }}>trabajador</span>}
                          {u.baneado && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(240,149,149,0.2)', color: '#F09595', fontWeight: '700' }}>BANEADO</span>}
                          {u.es_trabajador && !u.mp_account_id && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(232,160,48,0.2)', color: '#E8A030', fontWeight: '600' }}>🏦 sin MP</span>}
                          {u.es_trabajador && !verificaciones.some(v => v.usuario_id === u.id && v.status === 'aprobado') && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(55,138,221,0.2)', color: '#378ADD', fontWeight: '600' }}>🪪 sin verificar</span>}
                          {!u.nombre && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '100px', background: 'rgba(232,160,48,0.15)', color: '#E8A030', fontWeight: '600' }}>onboarding incompleto</span>}
                        </div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {u.rating_promedio && <span style={{ fontSize: '10px', color: '#F5A623' }}>⭐ {u.rating_promedio}</span>}
                          {u.total_trabajos > 0 && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{u.total_trabajos} trabajos</span>}
                          {u.amonestaciones > 0 && <span style={{ fontSize: '10px', color: '#F09595', fontWeight: '700' }}>⚠️ {u.amonestaciones}/3 amonestaciones</span>}
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{tiempoTranscurrido(u.creado_en)}</span>
                        </div>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', flexShrink: 0 }}>{expandido ? '▲' : '▼'}</span>
                    </div>
                    {!u.es_admin && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
                        <button type="button" onClick={() => banearUsuario(u.id, u.baneado)} disabled={loadingAccion === u.id}
                          style={{ padding: '5px 10px', background: u.baneado ? 'rgba(29,158,117,0.1)' : 'rgba(240,149,149,0.1)', color: u.baneado ? '#1D9E75' : '#F09595', border: `0.5px solid ${u.baneado ? 'rgba(29,158,117,0.3)' : 'rgba(240,149,149,0.3)'}`, borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                          {u.baneado ? '✅ Desbanear' : '🚫 Banear'}
                        </button>
                        {!u.baneado && (
                          <button type="button" onClick={() => amonestacionManual(u.id, u.amonestaciones || 0)} disabled={loadingAccion === u.id}
                            style={{ padding: '5px 10px', background: 'rgba(232,160,48,0.1)', color: '#E8A030', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                            ⚠️ Amonestar
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {expandido && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {u.bio && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>{u.bio}</p>}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                        <div><span style={{ color: 'rgba(255,255,255,0.3)' }}>ID: </span><span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>{u.id.slice(0, 8)}...</span></div>
                        <div><span style={{ color: 'rgba(255,255,255,0.3)' }}>Ubicación: </span><span style={{ color: 'rgba(255,255,255,0.5)' }}>{u.lat && u.lng ? `${u.lat.toFixed(3)}, ${u.lng.toFixed(3)}` : 'Sin ubicación'}</span></div>
                        {u.es_trabajador && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>Categorías: </span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{u.categorias_servicio?.join(', ') || 'Ninguna'}</span>
                          </div>
                        )}
                        {u.tipo_vehiculo && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>Vehículo: </span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{u.vehiculo_marca} {u.vehiculo_color} · placas {u.vehiculo_placas || 'N/A'}</span>
                          </div>
                        )}
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>Mercado Pago: </span>
                          <span style={{ color: u.mp_account_id ? '#1D9E75' : '#E8A030' }}>{u.mp_account_id ? '✅ conectada' : '⚠️ no conectada'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>Contacto emergencia: </span>
                          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{u.contacto_emergencia_nombre ? `${u.contacto_emergencia_nombre} (${u.contacto_emergencia_telefono || 'sin tel'})` : 'No registrado'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ── EN VIVO ── */}
        {!cargando && pestana === 'en_vivo' && (
          <>
            {trabajosEnVivo.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌙</div>
                <p>Sin trabajos activos ahorita</p>
              </div>
            ) : trabajosEnVivo.map(t => (
              <div key={t.id} style={{ background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${statusColor[t.status]}30`, borderRadius: '14px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>{t.categoria}</p>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '100px', background: `${statusColor[t.status]}20`, color: statusColor[t.status], border: `0.5px solid ${statusColor[t.status]}40`, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor[t.status], display: 'inline-block' }} />
                    {t.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{tiempoTranscurrido(t.creado_en)}</p>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: '#1D9E75' }}>${t.precio_acordado || t.presupuesto || 0} MXN</p>
                </div>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', marginTop: '6px' }}>#{t.id.slice(0, 8)}</p>
              </div>
            ))}
          </>
        )}

        {/* ── BANEADOS ── */}
        {!cargando && pestana === 'baneados' && (
          <>
            {dispositivosBaneados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <p>Sin dispositivos baneados</p>
              </div>
            ) : dispositivosBaneados.map(d => (
              <div key={d.id} style={{ background: 'rgba(240,149,149,0.05)', border: '0.5px solid rgba(240,149,149,0.2)', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#F09595' }}>{d.email || 'Sin correo'}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{d.razon || 'Sin razón especificada'}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '4px', fontFamily: 'monospace' }}>fingerprint: {d.fingerprint}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>{tiempoTranscurrido(d.creado_en)}</p>
                </div>
                <button type="button" onClick={() => desbanearDispositivo(d.id)} disabled={loadingAccion === d.id}
                  style={{ padding: '6px 12px', background: 'rgba(29,158,117,0.1)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif', flexShrink: 0, marginLeft: '10px' }}>
                  ✅ Desbanear dispositivo
                </button>
              </div>
            ))}
          </>
        )}

      </div>
    </div>
  )
}
