// Zona permitida: Istmo de Tehuantepec, Oaxaca
const CENTRO_ISTMO = { lat: 16.42, lng: -95.10 }
const RADIO_KM = 85

const CIUDADES_ISTMO = [
  'Salina Cruz', 'Santo Domingo Tehuantepec', 'Juchitán de Zaragoza',
  'Ciudad Ixtepec', 'Matías Romero', 'Unión Hidalgo', 'El Espinal',
  'San Blas Atempa', 'Asunción Ixtaltepec', 'Santa María Xadani',
  'Chahuites', 'Niltepec', 'Zanatepec', 'San Pedro Tapanatepec',
]

function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function esZonaIstmo(lat, lng) {
  return distanciaKm(lat, lng, CENTRO_ISTMO.lat, CENTRO_ISTMO.lng) <= RADIO_KM
}

export { CIUDADES_ISTMO }
