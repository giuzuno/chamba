import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import RegistrarNegocio from './RegistrarNegocio'
import PanelNegocio from './PanelNegocio'

export default function NegocioRouter({ userId, onVolver }) {
  const [tieneNegocio, setTieneNegocio] = useState(null) // null = todavía cargando

  useEffect(() => {
    supabase.from('negocios').select('id').eq('usuario_id', userId).maybeSingle()
      .then(({ data }) => setTieneNegocio(!!data))
  }, [userId])

  if (tieneNegocio === null) return (
    <div style={{ color: 'white', background: '#0D0D0D', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      Cargando...
    </div>
  )

  if (tieneNegocio) return <PanelNegocio userId={userId} onVolver={onVolver} />

  return <RegistrarNegocio userId={userId} onVolver={onVolver} onCompletado={() => window.location.reload()} />
}
