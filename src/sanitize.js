// Sanitización de inputs para prevenir XSS e inyección de código
export function sanitizarTexto(texto) {
  if (!texto || typeof texto !== 'string') return ''
  return texto
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\\/g, '&#x5C;')
    .replace(/`/g, '&#96;')
    .trim()
}

export function sanitizarCampo(texto, maxLen = 100) {
  if (!texto) return ''
  return sanitizarTexto(texto).slice(0, maxLen)
}

export function sanitizarDescripcion(texto, maxLen = 500) {
  if (!texto) return ''
  return sanitizarTexto(texto)
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, maxLen)
}

export function sanitizarMensaje(texto, maxLen = 1000) {
  if (!texto) return ''
  return sanitizarTexto(texto)
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, maxLen)
}

export function sanitizarNumero(valor, min = 0, max = 999999) {
  const num = parseFloat(valor)
  if (isNaN(num)) return min
  return Math.min(Math.max(num, min), max)
}

export function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function tieneInyeccionSQL(texto) {
  if (!texto) return false
  const patrones = [
    /(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bSELECT\b)/i,
    /(-{2}|\/\*|\*\/)/,
    /(UNION\s+SELECT)/i,
    /(\bOR\b\s+\d+=\d+)/i,
  ]
  return patrones.some(p => p.test(texto))
}

export function sanitizarParaBD(objeto) {
  const resultado = {}
  for (const [key, value] of Object.entries(objeto)) {
    if (typeof value === 'string') {
      if (tieneInyeccionSQL(value)) {
        console.warn(`Posible inyección SQL detectada en campo: ${key}`)
        resultado[key] = ''
      } else {
        resultado[key] = sanitizarTexto(value)
      }
    } else {
      resultado[key] = value
    }
  }
  return resultado
}
