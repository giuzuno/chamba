import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

const PATRONES_PROHIBIDOS = [
  /\b\d{10}\b/,
  /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
  /\b\d{2,4}[-.\s]\d{2,4}[-.\s]\d{2,4}\b/,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /https?:\/\//,
  /www\.[a-zA-Z]/,
  /\.[a-z]{2,3}\/\S/,
  /whatsapp|telegram|facebook|instagram|tiktok|snapchat/i,
]

function contieneDatosProhibidos(texto) {
  return PATRONES_PROHIBIDOS.some(p => p.test(texto))
}

export default function ChatTrabajo({ trabajo, userId, onVolver }) {
  const [mensajes, setMensajes] = useState([])
  const [perfiles, setPerfiles] = useState({})
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    cargarMensajes()

    const channel = supabase
      .channel(`chat-${trabajo.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `trabajo_id=eq.${trabajo.id}`
      }, (payload) => {
        setMensajes(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev
          const nuevos = [...prev, payload.new]
          cargarPerfilesIds([payload.new.emisor_id])
          return nuevos
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [trabajo.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function cargarMensajes() {
    const { data, error } = await supabase
      .from('mensajes')
      .select('*')
      .eq('trabajo_id', trabajo.id)
      .order('creado_en', { ascending: true })
    if (data) {
      setMensajes(data)
      const ids = [...new Set(data.map(m => m.emisor_id))]
      cargarPerfilesIds(ids)
    }
    if (error) console.log('Error cargando mensajes:', error)
  }

  async function cargarPerfilesIds(ids) {
    if (!ids || ids.length === 0) return
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, foto_url')
      .in('id', ids)
    if (data) {
      setPerfiles(prev => {
        const nuevo = { ...prev }
        data.forEach(u => { nuevo[u.id] = u })
        return nuevo
      })
    }
  }

  async function enviarMensaje() {
    const contenido = texto.trim()
    if (!contenido || enviando) return

    if (contieneDatosProhibidos(contenido)) {
      setError('⚠️ No puedes compartir datos de contacto fuera de Chamba.')
      setTimeout(() => setError(''), 4000)
      return
    }

    setEnviando(true)
    setError('')

    const { error } = await supabase.from('mensajes').insert({
      trabajo_id: trabajo.id,
      emisor_id: userId,
      contenido,
    })

    if (error) console.log('Error enviando mensaje:', error)
    setTexto('')
    setEnviando(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviarMensaje()
    }
  }

  function formatHora(fecha) {
    return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  function formatFecha(fecha) {
    const d = new Date(fecha)
    const hoy = new Date()
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)
    if (d.toDateString() === hoy.toDateString()) return 'Hoy'
    if (d.toDateString() === ayer.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }

  function mensajesConFecha() {
    const grupos = []
    let fechaActual = null
    mensajes.forEach(m => {
      const fecha = formatFecha(m.creado_en)
      if (fecha !== fechaActual) {
        grupos.push({ tipo: 'fecha', valor: fecha, key: `fecha-${m.id}` })
        fechaActual = fecha
      }
      grupos.push({ tipo: 'mensaje', ...m })
    })
    return grupos
  }

  // Agrupar mensajes consecutivos del mismo emisor
  function getMensajesAgrupados() {
    const items = mensajesConFecha()
    return items.map((item, i) => {
      if (item.tipo !== 'mensaje') return item
      const prev = items[i - 1]
      const next = items[i + 1]
      const esPrimero = !prev || prev.tipo === 'fecha' || prev.emisor_id !== item.emisor_id
      const esUltimo = !next || next.tipo === 'fecha' || next.emisor_id !== item.emisor_id
      return { ...item, esPrimero, esUltimo }
    })
  }

  const esMio = (emisorId) => emisorId === userId
  const esPrevio = trabajo.status === 'publicado'

  const getNombre = (emisorId) => {
    const perfil = perfiles[emisorId]
    if (!perfil?.nombre) return '...'
    return perfil.nombre.split(' ')[0] // Solo primer nombre
  }

  const getFoto = (emisorId) => perfiles[emisorId]?.foto_url || null

  const getIniciales = (emisorId) => {
    const nombre = perfiles[emisorId]?.nombre
    if (!nombre) return '?'
    return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div style={{ height: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.1)', background: '#0D0D0D', flexShrink: 0 }}>
        <button type="button" onClick={onVolver} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '15px', fontWeight: '700' }}>
            {esPrevio ? '❓ Consulta previa' : '💬 Chat'} — {trabajo.categoria}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            ${trabajo.precio_acordado || trabajo.presupuesto} MXN · Solo dentro de Chamba
          </p>
        </div>
        <span style={{ fontSize: '14px', opacity: 0.08 }}>👁</span>
      </div>

      {/* Aviso */}
      {esPrevio ? (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(55,138,221,0.06)', borderBottom: '0.5px solid rgba(55,138,221,0.15)', fontSize: '11px', color: '#378ADD', textAlign: 'center' }}>
          💡 Pregunta lo que necesitas saber antes de aceptar este trabajo
        </div>
      ) : (
        <div style={{ padding: '8px 16px', flexShrink: 0, background: 'rgba(29,158,117,0.06)', borderBottom: '0.5px solid rgba(29,158,117,0.15)', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
          🔒 Mensajes privados. No compartas datos de contacto.
        </div>
      )}

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>

        {mensajes.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px' }}>{esPrevio ? '❓' : '💬'}</div>
            <p style={{ fontSize: '14px' }}>
              {esPrevio ? 'Pregunta al cliente sobre el trabajo.' : 'Aún no hay mensajes.'}
            </p>
            <p style={{ fontSize: '12px' }}>
              {esPrevio ? 'Puedes preguntar antes de comprometerte.' : 'Coordina los detalles del trabajo aquí.'}
            </p>
          </div>
        )}

        {getMensajesAgrupados().map((item) => {
          if (item.tipo === 'fecha') {
            return (
              <div key={item.key} style={{ textAlign: 'center', margin: '16px 0 8px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 12px', borderRadius: '100px' }}>
                  {item.valor}
                </span>
              </div>
            )
          }

          const mio = esMio(item.emisor_id)

          return (
            <div key={item.id} style={{
              display: 'flex',
              flexDirection: mio ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: '8px',
              marginBottom: item.esUltimo ? '8px' : '2px',
              paddingLeft: mio ? '48px' : '0',
              paddingRight: mio ? '0' : '48px',
            }}>
              {/* Avatar — solo en el último mensaje del grupo */}
              {!mio && (
                <div style={{ width: '28px', flexShrink: 0, marginBottom: '2px' }}>
                  {item.esUltimo && (
                    getFoto(item.emisor_id) ? (
                      <img src={getFoto(item.emisor_id)} alt="avatar"
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #378ADD, #1a5fa8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: '700', color: 'white'
                      }}>
                        {getIniciales(item.emisor_id)}
                      </div>
                    )
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: mio ? 'flex-end' : 'flex-start', gap: '2px', flex: 1 }}>
                {/* Nombre — solo en el primer mensaje del grupo y si no es mío */}
                {!mio && item.esPrimero && (
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: '4px', marginBottom: '2px' }}>
                    {getNombre(item.emisor_id)}
                  </p>
                )}

                <div style={{
                  maxWidth: '80%',
                  background: mio ? '#1D9E75' : 'rgba(255,255,255,0.1)',
                  borderRadius: mio
                    ? (item.esPrimero ? '18px 18px 4px 18px' : '18px 4px 4px 18px')
                    : (item.esPrimero ? '18px 18px 18px 4px' : '4px 18px 18px 4px'),
                  padding: '9px 13px',
                }}>
                  <p style={{ fontSize: '14px', lineHeight: '1.5', color: mio ? 'white' : 'rgba(255,255,255,0.9)', wordBreak: 'break-word', margin: 0 }}>
                    {item.contenido}
                  </p>
                  {item.esUltimo && (
                    <p style={{ fontSize: '10px', marginTop: '3px', textAlign: mio ? 'right' : 'left', color: mio ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)', margin: 0, marginTop: '3px' }}>
                      {formatHora(item.creado_en)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '0 16px 8px', padding: '10px 14px', background: 'rgba(240,149,149,0.1)', border: '0.5px solid rgba(240,149,149,0.4)', borderRadius: '10px', fontSize: '12px', color: '#F09595', flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.08)', background: '#0D0D0D', flexShrink: 0, display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea
          placeholder={esPrevio ? 'Pregunta sobre el trabajo...' : 'Escribe un mensaje...'}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.07)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: '20px', padding: '10px 16px',
            color: 'white', fontSize: '14px',
            fontFamily: 'sans-serif', resize: 'none', outline: 'none',
            maxHeight: '100px', overflowY: 'auto', lineHeight: '1.4'
          }}
        />
        <button type="button" onClick={enviarMensaje} disabled={enviando || !texto.trim()} style={{
          width: '42px', height: '42px', borderRadius: '50%', border: 'none',
          background: texto.trim() ? '#1D9E75' : 'rgba(255,255,255,0.08)',
          color: texto.trim() ? 'white' : 'rgba(255,255,255,0.3)',
          fontSize: '18px', cursor: texto.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.2s'
        }}>
          {enviando ? '⏳' : '➤'}
        </button>
      </div>

    </div>
  )
}