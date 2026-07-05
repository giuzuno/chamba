import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PerfilPublico from './PerfilPublico'
import { enviarNotificacionCompleta } from './guardarNotificacion'
import ReglasChambaModal from './ReglasChambaModal'

const CATEGORIAS_ICONS = {
  'Electricista': '⚡', 'Plomero': '🔧', 'Cocinera': '🍳',
  'Limpieza': '🧹', 'Planchado': '👔', 'Pintor': '🖌️',
  'Cerrajero': '🔑', 'Mecánico': '🔩', 'Téc. celulares': '📱',
  'Fletes': '🚛', 'Costurera': '✂️', 'Clases': '📚',
  'Jardinero': '🌿', 'Lavado autos': '🚗', 'Carpintero': '🪵',
  'Repartidor': '🛵', 'Soldador': '⚓', 'Diseñador gráfico': '🎨',
  'Fotógrafo': '📸', 'Masajista': '💆', 'Veterinario': '🐕',
  'Téc. computadoras': '🖥️', 'Limpieza albercas': '🏊', 'Niñera': '👶',
  'Músico': '🎵', 'Téc. refrigeración': '❄️', 'Enfermera': '💉',
  'Barra de eventos': '🎪', 'Topógrafo': '📐', 'Albañil': '🧱',
}

export default function NegociacionTrabajo({ trabajo, userId, onVolver, onAceptado }) {
  const [trabajoActual, setTrabajoActual] = useState(trabajo)
  const [ofertas, setOfertas] = useState([])
  const [nuevaOferta, setNuevaOferta] = useState(trabajo.presupuesto)
  const [loading, setLoading] = useState(false)
  const [costoMateriales, setCostoMateriales] = useState(0)
  const [notaMateriales, setNotaMateriales] = useState('')
  const [cargando, setCargando] = useState(true)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')
  const [verPerfilTrabajador, setVerPerfilTrabajador] = useState(false)
  const [mostrarReglas, setMostrarReglas] = useState(false)
  const [reglasAceptadas, setReglasAceptadas] = useState(false)
  const [yaNoDisponible, setYaNoDisponible] = useState(false)

  const MAX_RONDAS = 3
  const rondasUsadas = trabajoActual.rondas_negociacion || 0
  const rondasRestantes = MAX_RONDAS - rondasUsadas
  const precioActual = trabajoActual.ultima_oferta || trabajoActual.presupuesto

  useEffect(() => {
    cargarOfertas()

    // Suscripción en tiempo real: si el cliente acepta, manda otra contraoferta,
    // o el trabajo deja de estar disponible (otro trabajador lo tomó), esta pantalla
    // se actualiza sola sin que el usuario tenga que salir y volver a entrar.
    const canalTrabajo = supabase
      .channel(`negociacion-trabajo-${trabajo.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'trabajos',
        filter: `id=eq.${trabajo.id}`,
      }, (payload) => {
        const actualizado = payload.new
        setTrabajoActual(actualizado)

        if (actualizado.status === 'aceptado' && actualizado.trabajador_id === userId) {
          setExito(true)
        } else if (actualizado.status !== 'publicado') {
          // Otro trabajador lo aceptó primero, o el cliente lo canceló
          setYaNoDisponible(true)
        }
      })
      .subscribe()

    const canalNegociaciones = supabase
      .channel(`negociaciones-trabajo-${trabajo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'negociaciones',
        filter: `trabajo_id=eq.${trabajo.id}`,
      }, () => {
        cargarOfertas()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canalTrabajo)
      supabase.removeChannel(canalNegociaciones)
    }
  }, [trabajo.id])

  async function cargarOfertas() {
    setCargando(true)
    const { data } = await supabase.from('negociaciones').select('*')
      .eq('trabajo_id', trabajo.id).order('creado_en', { ascending: true })
    if (data) setOfertas(data)
    setCargando(false)
  }

  async function hacerContraoferta() {
    if (nuevaOferta === precioActual || rondasRestantes <= 0) return
    setLoading(true)
    await supabase.from('negociaciones').insert({ 
      trabajo_id: trabajo.id, 
      ofertado_por: 'trabajador', 
      monto: nuevaOferta, 
      usuario_id: userId,
      costo_materiales: costoMateriales || 0,
      nota_materiales: notaMateriales || null,
    })
    await supabase.from('trabajos').update({ ultima_oferta: nuevaOferta, quien_oferto: 'trabajador', rondas_negociacion: rondasUsadas + 1 }).eq('id', trabajo.id)
    await enviarNotificacionCompleta({ usuarioId: trabajo.cliente_id, titulo: '💬 Nueva contraoferta en Chamba', cuerpo: `Un trabajador ofrece $${nuevaOferta} MXN por tu ${trabajo.categoria}`, tipo: 'contraoferta', trabajoId: trabajo.id })
    await cargarOfertas()
    setLoading(false)
  }

  async function aceptarPrecio() {
    if (!reglasAceptadas) { setMostrarReglas(true); return }
    setLoading(true)

    // Verificar que el trabajo siga disponible antes de aceptar
    const { data: trabajoVerificado } = await supabase
      .from('trabajos').select('status, trabajador_id').eq('id', trabajo.id).maybeSingle()

    if (!trabajoVerificado || trabajoVerificado.status !== 'publicado') {
      setLoading(false)
      setError('Lo sentimos — este trabajo ya fue aceptado por otro trabajador. Busca otros disponibles.')
      return
    }

    // Aceptar el trabajo
    const { error: updateError } = await supabase.from('trabajos')
      .update({ status: 'aceptado', precio_acordado: precioActual, trabajador_id: userId })
      .eq('id', trabajo.id)

    if (updateError) {
      console.log('Error aceptando:', updateError)
      setLoading(false)
      setError('Error al aceptar el trabajo. Intenta de nuevo.')
      return
    }

    await enviarNotificacionCompleta({ usuarioId: trabajo.cliente_id, titulo: '✅ ¡Trabajo aceptado!', cuerpo: `Un trabajador aceptó tu ${trabajo.categoria} por $${precioActual} MXN`, tipo: 'trabajo_aceptado', trabajoId: trabajo.id })
    setExito(true)
    setLoading(false)
  }

  function tiempoTranscurrido(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return `hace ${min} min`
    return `hace ${Math.floor(min / 60)} hrs`
  }

  if (mostrarReglas) return (
    <ReglasChambaModal
      tipo="trabajador"
      onAceptar={() => { setMostrarReglas(false); setReglasAceptadas(true); aceptarPrecio() }}
      onCerrar={() => setMostrarReglas(false)}
    />
  )

  if (verPerfilTrabajador) return <PerfilPublico usuarioId={userId} rolVisto="trabajador" onVolver={() => setVerPerfilTrabajador(false)} />

  if (yaNoDisponible) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>😕</div>
        <h2 style={{ color: '#E8A030', fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>Este trabajo ya no está disponible</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px', maxWidth: '300px' }}>
          Otro trabajador lo aceptó, o el cliente lo canceló mientras negociabas.
        </p>
        <button type="button" onClick={onVolver} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Buscar otros trabajos
        </button>
      </div>
    )
  }

  if (exito) {
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🤝</div>
        <h2 style={{ color: '#1D9E75', fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>¡Trabajo aceptado!</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '8px', maxWidth: '300px' }}>Precio acordado:</p>
        <p style={{ color: '#1D9E75', fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>${precioActual} MXN</p>
        <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', maxWidth: '300px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
            🔐 El dinero del cliente queda retenido de forma protegida. Se libera a tu cuenta en cuanto confirme que el trabajo quedó bien.
          </p>
        </div>
        <div style={{ background: 'rgba(232,160,48,0.08)', border: '0.5px solid rgba(232,160,48,0.25)', borderRadius: '14px', padding: '14px 18px', marginBottom: '24px', maxWidth: '300px' }}>
          <p style={{ fontSize: '13px', color: '#E8A030', lineHeight: '1.5' }}>
            ⏳ Ahora el cliente tiene que completar su pago. En cuanto lo haga, te avisamos para que puedas empezar.
          </p>
        </div>
        <button type="button" onClick={onAceptado} style={{ background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px 32px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Ver mis trabajos
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Negociar trabajo</h2>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '16px', padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '40px' }}>{CATEGORIAS_ICONS[trabajo.categoria] || '✳️'}</span>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{trabajo.categoria}</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>{trabajo.descripcion}</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Presupuesto inicial: <span style={{ color: 'white' }}>${trabajo.presupuesto} MXN</span></p>
          </div>
        </div>

        {/* Banner protegido para trabajador */}
        <div style={{ background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '12px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>🔐</span>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5' }}>
            El dinero queda retenido en protegido. Cobra siempre dentro de la app para garantizar tu pago.
          </p>
        </div>

        <button type="button" onClick={() => setVerPerfilTrabajador(true)} style={{ width: '100%', padding: '11px', background: 'rgba(29,158,117,0.08)', color: '#1D9E75', border: '0.5px solid rgba(29,158,117,0.3)', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          ⭐ Ver cómo te ve el cliente — tu perfil público
        </button>

        {!cargando && ofertas.length > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial de negociación</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'rgba(55,138,221,0.15)', border: '0.5px solid rgba(55,138,221,0.3)', borderRadius: '12px', padding: '10px 14px', maxWidth: '70%' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>Cliente (oferta inicial)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#378ADD' }}>${trabajo.presupuesto} MXN</p>
                </div>
              </div>
              {ofertas.map(oferta => (
                <div key={oferta.id} style={{ display: 'flex', justifyContent: oferta.ofertado_por === 'trabajador' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ background: oferta.ofertado_por === 'trabajador' ? 'rgba(29,158,117,0.15)' : 'rgba(55,138,221,0.15)', border: `0.5px solid ${oferta.ofertado_por === 'trabajador' ? 'rgba(29,158,117,0.3)' : 'rgba(55,138,221,0.3)'}`, borderRadius: '12px', padding: '10px 14px', maxWidth: '70%' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>{oferta.ofertado_por === 'trabajador' ? 'Tu contraoferta' : 'Cliente'} · {tiempoTranscurrido(oferta.creado_en)}</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: oferta.ofertado_por === 'trabajador' ? '#1D9E75' : '#378ADD' }}>${oferta.monto} MXN</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Precio actual</p>
            <p style={{ fontSize: '24px', fontWeight: '800', color: '#1D9E75' }}>${precioActual} MXN</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Rondas restantes</p>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
              {Array.from({ length: MAX_RONDAS }).map((_, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: i < rondasRestantes ? '#1D9E75' : 'rgba(255,255,255,0.15)' }} />)}
            </div>
            <p style={{ fontSize: '11px', color: rondasRestantes === 0 ? '#F09595' : 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{rondasRestantes === 0 ? 'Sin más rondas' : `${rondasRestantes} de ${MAX_RONDAS}`}</p>
          </div>
        </div>

        {rondasRestantes > 0 && (
          <div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tu contraoferta</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <input type="range" min="100" max="5000" step="50" value={nuevaOferta} onChange={e => setNuevaOferta(Number(e.target.value))} style={{ flex: 1, accentColor: '#1D9E75' }} />
              <span style={{ fontSize: '22px', fontWeight: '800', color: '#1D9E75', minWidth: '100px', textAlign: 'right' }}>${nuevaOferta} MXN</span>
            </div>
            {nuevaOferta > precioActual && <div style={{ background: 'rgba(186,117,23,0.1)', border: '0.5px solid rgba(186,117,23,0.3)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#E8A030' }}>↑ Estás pidiendo ${nuevaOferta - precioActual} MXN más</div>}
            {nuevaOferta < precioActual && <div style={{ background: 'rgba(29,158,117,0.08)', border: '0.5px solid rgba(29,158,117,0.2)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#5DCAA5' }}>↓ Estás aceptando ${precioActual - nuevaOferta} MXN menos</div>}
          </div>
        )}

        {rondasRestantes === 0 && (
          <div style={{ background: 'rgba(240,149,149,0.1)', border: '0.5px solid rgba(240,149,149,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#F09595', textAlign: 'center' }}>
            Se agotaron las rondas de negociación. Solo puedes aceptar o rechazar el precio actual.
          </div>
        )}

        {error && <p style={{ color: '#F09595', fontSize: '13px', textAlign: 'center' }}>{error}</p>}

        <button type="button" onClick={aceptarPrecio} disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? 'rgba(29,158,117,0.5)' : '#1D9E75', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          {loading ? 'Procesando...' : `✅ Aceptar $${precioActual} MXN`}
        </button>
        
        {/* Desglose de comisión para el trabajador */}
        <div style={{ background: 'rgba(29,158,117,0.06)', border: '0.5px solid rgba(29,158,117,0.15)', borderRadius: '12px', padding: '12px 16px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>💰 Tu ganancia</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Precio acordado</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>${precioActual} MXN</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Comisión Chamba (12%)</span>
            <span style={{ fontSize: '12px', color: '#F09595' }}>-${Math.round(precioActual * 0.12)} MXN</span>
          </div>
          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1D9E75' }}>Tu ganancia neta</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#1D9E75' }}>${Math.round(precioActual * 0.88)} MXN</span>
          </div>
        </div>

        {/* Desglose de materiales — solo si el trabajo requiere que el trabajador los consiga */}
        {trabajo.materiales === 'trabajador' && (
          <div style={{ background: 'rgba(232,160,48,0.06)', border: '0.5px solid rgba(232,160,48,0.2)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#E8A030', marginBottom: '10px' }}>🛒 Desglose de materiales</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Costo estimado de materiales (MXN)</p>
                <input type="number" min="0" placeholder="Ej: 150"
                  value={costoMateriales || ''}
                  onChange={e => {
                    const mat = Number(e.target.value) || 0
                    setCostoMateriales(mat)
                    setNuevaOferta(Math.round((nuevaOferta - costoMateriales) + mat))
                  }}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(232,160,48,0.3)', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '15px', fontFamily: 'sans-serif', outline: 'none' }}
                />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Nota para el cliente (opcional)</p>
                <input type="text" placeholder="Ej: Cable especial + clavos + sellador"
                  value={notaMateriales}
                  onChange={e => setNotaMateriales(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: 'white', fontSize: '14px', fontFamily: 'sans-serif', outline: 'none' }}
                />
              </div>
              {costoMateriales > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Mano de obra</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>${nuevaOferta - costoMateriales} MXN</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Materiales</span>
                    <span style={{ fontSize: '12px', color: '#E8A030' }}>${costoMateriales} MXN</span>
                  </div>
                  <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', marginBottom: '6px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Total</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#1D9E75' }}>${nuevaOferta} MXN</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {rondasRestantes > 0 && nuevaOferta !== precioActual && (
          <button type="button" onClick={hacerContraoferta} disabled={loading} style={{ width: '100%', padding: '14px', background: 'transparent', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: '14px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', fontFamily: 'sans-serif' }}>
            💬 Enviar contraoferta de ${nuevaOferta} MXN
          </button>
        )}

        <button type="button" onClick={onVolver} style={{ width: '100%', padding: '14px', background: 'transparent', color: 'rgba(255,255,255,0.3)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', fontSize: '14px', cursor: 'pointer', fontFamily: 'sans-serif' }}>
          Rechazar trabajo
        </button>

      </div>
    </div>
  )
}
