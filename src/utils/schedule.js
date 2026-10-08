// Lógica del sorteo y del calendario: enfrentamientos, jornadas, fechas y horas.
// No usa Firebase: son funciones puras, fáciles de probar.

// ---------- Azar ----------

// Número aleatorio de 0 a n-1 (usa el generador seguro del navegador cuando existe).
export function randomInt(n) {
  if (n <= 1) return 0
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (c?.getRandomValues) {
    const limit = Math.floor(0x100000000 / n) * n
    const buf = new Uint32Array(1)
    do {
      c.getRandomValues(buf)
    } while (buf[0] >= limit)
    return buf[0] % n
  }
  return Math.floor(Math.random() * n)
}

export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------- Fechas ----------

const pad = (n) => String(n).padStart(2, '0')

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayStr() {
  return toDateStr(new Date())
}

export function parseDateStr(s) {
  const [y, m, d] = (s || '').split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function addDays(dateStr, n) {
  const d = parseDateStr(dateStr)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

// "sábado 12 de octubre"
export function formatDay(dateStr) {
  const d = parseDateStr(dateStr)
  if (!d) return 'Sin fecha'
  return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatDayShort(dateStr) {
  const d = parseDateStr(dateStr)
  if (!d) return ''
  return d.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const WEEKDAYS = [
  { id: 1, label: 'Lun' },
  { id: 2, label: 'Mar' },
  { id: 3, label: 'Mié' },
  { id: 4, label: 'Jue' },
  { id: 5, label: 'Vie' },
  { id: 6, label: 'Sáb' },
  { id: 0, label: 'Dom' }
]

export function timeToMinutes(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '')
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export function minutesToTime(total) {
  const t = ((total % 1440) + 1440) % 1440
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
}

// Tiempo entre un partido y el siguiente: lo que dura el partido más 15 minutos, redondeado a 5.
export function defaultInterval(rules) {
  const { periods, periodMinutes, breakMinutes } = rules.timing
  const total = periods * periodMinutes + Math.max(0, periods - 1) * breakMinutes + 15
  return Math.ceil(total / 5) * 5
}

// ---------- Enfrentamientos ----------

// Todos contra todos por el método del círculo. Devuelve jornadas: [[ [local, visita], ... ], ...]
export function roundRobin(ids, double = false) {
  const list = [...ids]
  if (list.length < 2) return []
  if (list.length % 2 === 1) list.push(null)
  const n = list.length
  const rounds = []
  let arr = list
  for (let r = 0; r < n - 1; r++) {
    const pairs = []
    for (let i = 0; i < n / 2; i++) {
      let a = arr[i]
      let b = arr[n - 1 - i]
      if (a === null || b === null) continue
      // Se alternan local y visita para repartir bien.
      if ((r + i) % 2 === 1) [a, b] = [b, a]
      pairs.push([a, b])
    }
    rounds.push(pairs)
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)]
  }
  if (!double) return rounds
  const back = rounds.map((pairs) => pairs.map(([a, b]) => [b, a]))
  return [...rounds, ...back]
}

// Reparte los equipos sorteados entre los grupos, siempre al grupo con menos equipos.
// "base" son los equipos que ya están en cada grupo (cuando solo se sortean los que faltan).
export function assignToGroups(pickedIds, groups, base = {}) {
  const counts = {}
  groups.forEach((g) => {
    counts[g.id] = base[g.id] || 0
  })
  const assignment = new Map()
  pickedIds.forEach((id) => {
    let best = groups[0]
    groups.forEach((g) => {
      if (counts[g.id] < counts[best.id]) best = g
    })
    assignment.set(id, best.id)
    counts[best.id] += 1
  })
  return assignment
}

// Agrupa el orden del sorteo en "bolsas": los grupos, o una sola si es todos contra todos.
export function bucketsFromOrder(orderIds, tournament, groups, teams) {
  const type = tournament.format.type
  if (type === 'groups' || type === 'groups_playoffs') {
    return groups.map((g) => {
      const members = new Set(teams.filter((t) => t.groupId === g.id).map((t) => t.id))
      return { id: g.id, name: g.name, teamIds: orderIds.filter((id) => members.has(id)) }
    })
  }
  return [{ id: 'all', name: type === 'knockout' ? 'Llaves' : 'Todos contra todos', teamIds: [...orderIds] }]
}

export function knockoutRoundName(size) {
  if (size === 2) return 'Final'
  if (size === 4) return 'Semifinal'
  if (size === 8) return 'Cuartos de final'
  if (size === 16) return 'Octavos de final'
  return `Ronda de ${size}`
}

// Primera ronda de eliminación directa. Si no hay una cantidad "exacta" de equipos,
// los primeros del sorteo pasan directo a la siguiente ronda.
export function knockoutFirstRound(orderIds) {
  const n = orderIds.length
  if (n < 2) return { matches: [], byes: [], size: 0 }
  let size = 2
  while (size < n) size *= 2
  const byeCount = size - n
  const byes = orderIds.slice(0, byeCount)
  const rest = orderIds.slice(byeCount)
  const label = knockoutRoundName(size)
  const matches = []
  for (let i = 0; i + 1 < rest.length; i += 2) {
    matches.push({
      stage: 'knockout',
      groupId: '',
      round: 1,
      roundLabel: label,
      homeId: rest[i],
      awayId: rest[i + 1]
    })
  }
  return { matches, byes, size }
}

const blankMatch = {
  date: '',
  time: '',
  court: '',
  status: 'scheduled',
  homeScore: null,
  awayScore: null
}

// Arma todos los partidos a partir del orden del sorteo. Todavía sin fecha ni hora.
export function buildFixtures({ tournament, groups, teams, orderIds }) {
  const { type, homeAway } = tournament.format
  const warnings = []
  let byes = []
  let matches = []

  if (type === 'knockout') {
    const res = knockoutFirstRound(orderIds)
    matches = res.matches
    byes = res.byes
  } else {
    const buckets = bucketsFromOrder(orderIds, tournament, groups, teams)
    const perBucket = buckets.map((b) => {
      if (b.teamIds.length < 2) {
        if (type !== 'league') warnings.push(`${b.name} tiene menos de 2 equipos y no tendrá partidos.`)
        return []
      }
      return roundRobin(b.teamIds, homeAway).map((pairs, r) =>
        pairs.map(([homeId, awayId]) => ({
          stage: 'group',
          groupId: b.id === 'all' ? '' : b.id,
          round: r + 1,
          roundLabel: `Jornada ${r + 1}`,
          homeId,
          awayId
        }))
      )
    })
    const maxRounds = Math.max(0, ...perBucket.map((r) => r.length))
    for (let r = 0; r < maxRounds; r++) {
      perBucket.forEach((rounds) => {
        if (rounds[r]) matches.push(...rounds[r])
      })
    }
  }

  return { matches: matches.map((m) => ({ ...blankMatch, ...m })), byes, warnings }
}

// ---------- Programación de fechas, horas y canchas ----------

export const DEFAULT_SCHEDULE = {
  startDate: '',
  time: '15:00',
  perDay: 4,
  interval: 90,
  weekdays: [6, 0],
  courts: []
}

// Reparte los partidos (en el orden dado) por los días permitidos.
// Con varias canchas, los partidos de una misma hora se juegan en canchas distintas.
export function scheduleMatches(matches, opts) {
  const o = { ...DEFAULT_SCHEDULE, ...opts }
  const start = parseDateStr(o.startDate)
  const startMin = timeToMinutes(o.time)
  if (!start || startMin === null || matches.length === 0) return matches.map((m) => ({ ...m }))

  const allowed = new Set(o.weekdays?.length ? o.weekdays : [0, 1, 2, 3, 4, 5, 6])
  const courts = (o.courts || []).filter(Boolean)
  const courtCount = Math.max(1, courts.length)
  const perDay = Math.max(1, o.perDay)

  const out = []
  let day = new Date(start)
  let used = 0
  let guard = 0
  for (const m of matches) {
    while (used === 0 && !allowed.has(day.getDay()) && guard < 800) {
      day.setDate(day.getDate() + 1)
      guard++
    }
    const slot = Math.floor(used / courtCount)
    out.push({
      ...m,
      date: toDateStr(day),
      time: minutesToTime(startMin + slot * o.interval),
      court: courts.length ? courts[used % courtCount] : m.court || ''
    })
    used++
    if (used >= perDay) {
      used = 0
      day = new Date(day)
      day.setDate(day.getDate() + 1)
    }
  }
  return out
}

// ---------- Orden y agrupación para mostrar ----------

export function compareMatches(a, b) {
  const da = a.date || '9999-99-99'
  const db = b.date || '9999-99-99'
  if (da !== db) return da < db ? -1 : 1
  const ta = a.time || '99:99'
  const tb = b.time || '99:99'
  if (ta !== tb) return ta < tb ? -1 : 1
  return (a.round ?? 0) - (b.round ?? 0)
}

export function groupByDay(matches) {
  const sorted = [...matches].sort(compareMatches)
  const days = []
  sorted.forEach((m) => {
    const key = m.date || ''
    const last = days[days.length - 1]
    if (last && last.date === key) last.matches.push(m)
    else days.push({ date: key, matches: [m] })
  })
  return days
}

export const STATUS_LABEL = {
  scheduled: 'Programado',
  live: 'En juego',
  finished: 'Finalizado'
}
