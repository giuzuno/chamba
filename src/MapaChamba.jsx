import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix icono default de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Coordenadas de Salina Cruz, Oaxaca
const SALINA_CRUZ = [16.1833, -95.2000]

// Trabajadores de prueba
const TRABAJADORES = [
  { id: 1, nombre: 'Carlos Mendoza', oficio: 'Electricista', rating: 4.9, lat: 16.1850, lng: -95.1980 },
  { id: 2, nombre: 'Ana García', oficio: 'Cocinera', rating: 4.8, lat: 16.1820, lng: -95.2020 },
  { id: 3, nombre: 'Pedro Ruiz', oficio: 'Plomero', rating: 4.7, lat: 16.1800, lng: -95.1960 },
  { id: 4, nombre: 'Rosa Vega', oficio: 'Limpieza', rating: 5.0, lat: 16.1860, lng: -95.2040 },
  { id: 5, nombre: 'Luis Torres', oficio: 'Pintor', rating: 4.6, lat: 16.1810, lng: -95.1990 },
]

export default function MapaChamba({ onLogout, userEmail }) {
  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', background: '#0D0D0D' }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        background: '#0D0D0D',
        borderBottom: '0.5px solid rgba(255,255,255,0.1)',
        zIndex: 1000
      }}>
        <h1 style={{ color: '#1D9E75', fontSize: '22px', fontWeight: '800' }}>chamba</h1>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Salina Cruz, Oax.</span>
        <button
          type="button"
          onClick={onLogout}
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.4)',
            border: '0.5px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Salir
        </button>
      </div>

      {/* Mapa */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={SALINA_CRUZ}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {TRABAJADORES.map(t => (
            <Marker key={t.id} position={[t.lat, t.lng]}>
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <strong>{t.nombre}</strong><br />
                  {t.oficio}<br />
                  ⭐ {t.rating}
                  <br />
                  <button
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      padding: '6px',
                      background: '#1D9E75',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Contactar
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0',
        background: '#0D0D0D',
        borderTop: '0.5px solid rgba(255,255,255,0.1)'
      }}>
        {[['🗺️', 'Mapa'], ['➕', 'Publicar'], ['💬', 'Chats'], ['👤', 'Perfil']].map(([icon, label]) => (
          <button
            key={label}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            {icon}
            <span style={{ fontSize: '11px' }}>{label}</span>
          </button>
        ))}
      </div>

    </div>
  )
}