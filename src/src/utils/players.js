import { norm } from './format'

// Convierte texto pegado en una lista de jugadores. Formatos aceptados, uno por línea:
//   10 Juan Pérez
//   10. Juan Pérez
//   10 - Juan Pérez - Delantero
//   Juan Pérez 10
//   Juan Pérez, 10, Delantero
//   10, Juan Pérez, Delantero
//   columnas copiadas de Excel (separadas por tabulación), en cualquier orden
// "positions" es la lista de posiciones del campeonato: sirve para reconocer cuál de las
// partes de la línea es la posición y no confundirla con el nombre.
export function parsePlayerLines(text, positions = []) {
  const known = new Set(positions.map((p) => norm(p)))
  const isPosition = (s) => known.has(norm(s))
  const rows = []
  const errors = []
  const lines = (text || '').split(/\r?\n/)

  // Separa "nombre" y "posición" a partir de las partes que no son el número.
  const namePosition = (parts) => {
    if (!known.size) return { name: parts[0] || '', position: parts[1] || '' }
    const pos = parts.slice(1).find(isPosition)
    const nameParts = parts.filter((s) => s !== pos)
    return { name: nameParts.join(' ').trim(), position: pos || '' }
  }

  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const add = (number, name, position = '') =>
      rows.push({ line: i + 1, number: Number(number), name: name.trim(), position: position.trim() })

    // 1. Con separadores (coma, punto y coma o tabulación): el número es la parte que solo tiene dígitos.
    if (/[,;\t]/.test(line)) {
      const parts = line.split(/\s*[,;\t]\s*/).map((s) => s.trim()).filter(Boolean)
      const number = parts.find((s) => /^\d{1,2}$/.test(s))
      if (number !== undefined && parts.length >= 2) {
        const rest = parts.filter((s, idx) => !(s === number && idx === parts.indexOf(number)))
        const { name, position } = namePosition(rest)
        add(number, name, position)
        return
      }
    }

    // 2. Número al inicio: "10 Juan Pérez", "10. Juan Pérez", "10 - Juan Pérez - Delantero".
    let m = line.match(/^(\d{1,2})\s*[-.):]?\s+(.+)$/)
    if (m) {
      const { name, position } = namePosition(m[2].split(/\s+[-–]\s+/).map((s) => s.trim()).filter(Boolean))
      add(m[1], name, position)
      return
    }

    // 3. Número al final: "Juan Pérez 10".
    m = line.match(/^(.+?)\s+(\d{1,2})$/)
    if (m) {
      add(m[2], m[1])
      return
    }

    errors.push({ line: i + 1, text: line, reason: 'No se encontró el número de camiseta.' })
  })
  return { rows, errors }
}

// Revisa duplicados contra los jugadores existentes y entre las propias filas.
export function checkPlayerRows(rows, existing, maxPlayers) {
  const takenNumbers = new Set(existing.map((p) => Number(p.number)))
  const seenNames = new Set(existing.map((p) => norm(p.name)))
  const ok = []
  const errors = []

  rows.forEach((r) => {
    if (!r.name || r.name.length < 2) {
      errors.push({ line: r.line, text: `${r.number}`, reason: 'Falta el nombre.' })
    } else if (takenNumbers.has(r.number)) {
      errors.push({ line: r.line, text: `${r.number} ${r.name}`, reason: `El número ${r.number} ya está en uso.` })
    } else if (seenNames.has(norm(r.name))) {
      errors.push({ line: r.line, text: `${r.number} ${r.name}`, reason: 'Ese jugador ya está en el equipo.' })
    } else if (maxPlayers && existing.length + ok.length >= maxPlayers) {
      errors.push({ line: r.line, text: `${r.number} ${r.name}`, reason: `Se alcanzó el máximo de ${maxPlayers} jugadores.` })
    } else {
      ok.push(r)
      takenNumbers.add(r.number)
      seenNames.add(norm(r.name))
    }
  })
  return { ok, errors }
}
