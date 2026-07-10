// Chamba opera exclusivamente en el Istmo de Tehuantepec, Oaxaca — zona horaria
// fija America/Mexico_City (UTC-6), sin horario de verano desde la reforma de 2022.
// getTimezoneOffset() regresa minutos, POSITIVO si el dispositivo está detrás de UTC.
// Para UTC-6 el valor esperado es +360.
const OFFSET_ESPERADO_MINUTOS = 360
const TOLERANCIA_MINUTOS = 90 // margen para casos legítimos (viajes cortos, etc.)

export function verificarHoraDispositivo() {
  const offsetActual = new Date().getTimezoneOffset()
  const diferencia = Math.abs(offsetActual - OFFSET_ESPERADO_MINUTOS)
  const horaOk = diferencia <= TOLERANCIA_MINUTOS

  return {
    ok: horaOk,
    offsetActual,
    horaDispositivo: new Date().toString(),
  }
}
