import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import LogoChamba from './LogoChamba'

const URL_ANDROID = 'https://play.google.com/store/apps/details?id=mx.com.chamba'
const URL_IOS = 'https://apps.apple.com/mx/app/chamba-servicios-y-viajes/id6803342450'

function detectarPlataforma() {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  return 'desktop'
}

export default function Descargar() {
  const [plataforma, setPlataforma] = useState('desktop')
  const [utm, setUtm] = useState({})

  useEffect(() => {
    document.title = 'Descarga Chamba | Servicios, trabajadores y viajes'
    setPlataforma(detectarPlataforma())

    const params = new URLSearchParams(window.location.search)
    setUtm({
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
    })
  }, [])

  function registrarClic(destino) {
    // No bloquea la navegación — se dispara en paralelo mientras el link abre
    supabase.from('descargar_clicks').insert({
      plataforma: destino,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    }).then(() => {}, () => {})
  }

  const esAndroid = plataforma === 'android'
  const esIOS = plataforma === 'ios'

  const btnBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    width: '100%', padding: '18px', borderRadius: '16px',
    fontSize: '17px', fontWeight: '700', fontFamily: 'sans-serif',
    textDecoration: 'none', cursor: 'pointer', border: 'none',
    transition: 'transform 0.1s',
  }

  function BotonAndroid({ destacado }) {
    return (
      <a
        href={URL_ANDROID}
        onClick={() => registrarClic('android')}
        style={{
          ...btnBase,
          background: destacado ? '#1D9E75' : 'rgba(255,255,255,0.06)',
          color: destacado ? 'white' : 'rgba(255,255,255,0.85)',
          border: destacado ? 'none' : '0.5px solid rgba(255,255,255,0.15)',
        }}
      >
        <span style={{ fontSize: '22px' }}>🤖</span>
        Descargar para Android
      </a>
    )
  }

  function BotonIOS({ destacado }) {
    return (
      <a
        href={URL_IOS}
        onClick={() => registrarClic('ios')}
        style={{
          ...btnBase,
          background: destacado ? '#1D9E75' : 'rgba(255,255,255,0.06)',
          color: destacado ? 'white' : 'rgba(255,255,255,0.85)',
          border: destacado ? 'none' : '0.5px solid rgba(255,255,255,0.15)',
        }}
      >
        <span style={{ fontSize: '22px' }}>🍎</span>
        Descargar para iPhone
      </a>
    )
  }

  function ParDeBotones({ contexto }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '420px', margin: '0 auto' }}>
        {esAndroid && (<><BotonAndroid destacado /><BotonIOS destacado={false} /></>)}
        {esIOS && (<><BotonIOS destacado /><BotonAndroid destacado={false} /></>)}
        {!esAndroid && !esIOS && (<><BotonAndroid destacado /><BotonIOS destacado /></>)}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: 'sans-serif', color: 'white' }}>

      {/* HERO */}
      <div style={{
        padding: '56px 24px 40px', textAlign: 'center',
        background: 'radial-gradient(circle at 30% 20%, rgba(29,158,117,0.15), transparent 60%)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <LogoChamba size="lg" />
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.25', marginBottom: '14px', color: 'white' }}>
          Lo que necesitas,<br />cerca de ti.
        </h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
          Servicios, trabajadores y viajes en una sola app.
        </p>
        <p style={{ fontSize: '14px', color: '#1D9E75', fontWeight: '600', marginBottom: '32px' }}>
          Hecho en el Istmo 💚
        </p>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.08em', marginBottom: '14px', textTransform: 'uppercase' }}>
          Descarga Chamba gratis
        </p>

        <ParDeBotones contexto="hero" />
      </div>

      {/* QUÉ PUEDES HACER */}
      <div style={{ padding: '48px 24px', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', textAlign: 'center', marginBottom: '32px', color: 'white' }}>
          ¿Qué puedes hacer con Chamba?
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px', margin: '0 auto' }}>
          {[
            { icon: '🔧', titulo: 'Contratar servicios', texto: 'Encuentra trabajadores de diferentes oficios cerca de ti.' },
            { icon: '👷', titulo: 'Encontrar chamba', texto: 'Ofrece tus servicios, encuentra oportunidades y construye tu reputación.' },
            { icon: '🚗', titulo: 'Solicitar viajes', texto: 'Publica el viaje que necesitas y conecta con conductores de tu región.' },
          ].map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '16px',
              background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
              borderRadius: '16px', padding: '18px 20px',
            }}>
              <span style={{ fontSize: '28px', flexShrink: 0 }}>{b.icon}</span>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{b.titulo}</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>{b.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PARA TRABAJADORES */}
      <div style={{ padding: '48px 24px', background: 'rgba(55,138,221,0.05)', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', textAlign: 'center', marginBottom: '10px', color: 'white' }}>
          ¿Quieres trabajar con Chamba?
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: '420px', margin: '0 auto 24px', lineHeight: '1.6' }}>
          Si tienes un oficio, manejas un automóvil, motocicleta, mototaxi o realizas entregas, también puedes registrarte como trabajador.
        </p>

        <div style={{ maxWidth: '380px', margin: '0 auto 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Registro gratuito',
            'Tú decides qué oportunidades aceptar',
            'Encuentra solicitudes cerca de ti',
            'Construye tu reputación',
            'Identidad verificada',
            'Pagos protegidos dentro de la plataforma',
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#1D9E75', fontSize: '16px', fontWeight: '800' }}>✓</span>
              <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)' }}>{b}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: '0.08em', textAlign: 'center', marginBottom: '14px', textTransform: 'uppercase' }}>
          Descargar y comenzar
        </p>
        <ParDeBotones contexto="trabajador" />
      </div>

      {/* CONFIANZA */}
      <div style={{ padding: '40px 24px', textAlign: 'center', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', fontStyle: 'italic' }}>
          Una plataforma hecha para nuestra gente.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', flexWrap: 'wrap' }}>
          {[
            { icon: '🛡️', texto: 'Identidad verificada' },
            { icon: '⭐', texto: 'Sistema de reputación' },
            { icon: '🔐', texto: 'Pagos protegidos' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '110px' }}>
              <span style={{ fontSize: '26px' }}>{b.icon}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>{b.texto}</span>
            </div>
          ))}
        </div>
      </div>

      {/* REGIÓN */}
      <div style={{ padding: '32px 24px', textAlign: 'center', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '8px' }}>
          Disponible inicialmente en el Istmo de Tehuantepec, Oaxaca.
        </p>
        <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: '600' }}>
          Salina Cruz • Tehuantepec • Juchitán
        </p>
      </div>

      {/* CIERRE */}
      <div style={{ padding: '48px 24px 56px', textAlign: 'center', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
          Del Istmo para su gente.
        </p>
        <p style={{ fontSize: '17px', fontWeight: '700', color: 'white', marginBottom: '28px' }}>
          Chamba — Lo que necesitas, cerca de ti.
        </p>
        <ParDeBotones contexto="cierre" />
      </div>

    </div>
  )
}