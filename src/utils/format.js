// Fechas guardadas como "AAAA-MM-DD" (sin hora) para evitar problemas de zona horaria.
export function formatDate(value) {
  if (!value) return ''
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return ''
  return new Date(y, m - 1, d).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function formatRange(start, end) {
  if (start && end) return `${formatDate(start)} al ${formatDate(end)}`
  if (start) return `Desde el ${formatDate(start)}`
  if (end) return `Hasta el ${formatDate(end)}`
  return ''
}

// Iniciales para el escudo cuando el equipo no tiene logo.
export function initials(name, short) {
  if (short) return short.slice(0, 3).toUpperCase()
  const words = (name || '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return (words[0][0] + words[1][0] + (words[2]?.[0] || '')).toUpperCase()
}

export function norm(text) {
  return (text || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
