// Tabla de posiciones: puntos, desempates configurables y juego limpio.

const FAIR_YELLOW = 1
const FAIR_RED = 3

function emptyRow(team) {
  return { team, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dif: 0, pts: 0, amarillas: 0, rojas: 0, fair: 0 }
}

function applyResult(row, forGoals, againstGoals, standings) {
  row.pj += 1
  row.gf += forGoals
  row.gc += againstGoals
  if (forGoals > againstGoals) {
    row.g += 1
    row.pts += standings.pointsWin
  } else if (forGoals < againstGoals) {
    row.p += 1
    row.pts += standings.pointsLoss
  } else {
    row.e += 1
    row.pts += standings.pointsDraw
  }
  row.dif = row.gf - row.gc
}

// Partidos de la fase de grupos / liga ya jugados, entre los equipos dados.
function playedBetween(matches, ids) {
  return matches.filter(
    (m) => m.stage !== 'knockout' && m.status === 'finished' && ids.has(m.homeId) && ids.has(m.awayId)
  )
}

function buildRows(teamsInScope, played, standings) {
  const rows = new Map(teamsInScope.map((t) => [t.id, emptyRow(t)]))
  played.forEach((m) => {
    const hs = Number(m.homeScore) || 0
    const as = Number(m.awayScore) || 0
    applyResult(rows.get(m.homeId), hs, as, standings)
    applyResult(rows.get(m.awayId), as, hs, standings)
    ;(m.events || []).forEach((e) => {
      const row = rows.get(e.teamId)
      if (!row) return
      if (e.type === 'yellow') row.amarillas += 1
      if (e.type === 'red') row.rojas += 1
    })
  })
  rows.forEach((r) => {
    r.fair = r.amarillas * FAIR_YELLOW + r.rojas * FAIR_RED
  })
  return [...rows.values()]
}

const groupBy = (rows, keyFn) => {
  const map = new Map()
  rows.forEach((r) => {
    const k = keyFn(r)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  })
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([, list]) => list)
}

// Desempata un grupo de equipos con los mismos puntos, aplicando los criterios en orden.
function rankTied(rows, criteria, played, standings) {
  if (rows.length <= 1) return rows
  if (criteria.length === 0) return [...rows].sort((a, b) => (a.team.name || '').localeCompare(b.team.name || '', 'es'))
  const [c, ...rest] = criteria
  let keyFn
  if (c === 'dif') keyFn = (r) => r.dif
  else if (c === 'favor') keyFn = (r) => r.gf
  else if (c === 'ganados') keyFn = (r) => r.g
  else if (c === 'contra') keyFn = (r) => -r.gc
  else if (c === 'fairplay') keyFn = (r) => -r.fair
  else if (c === 'directo') {
    const ids = new Set(rows.map((r) => r.team.id))
    const mini = buildRows(
      rows.map((r) => r.team),
      playedBetween(played, ids),
      standings
    )
    const byId = new Map(mini.map((r) => [r.team.id, r]))
    keyFn = (r) => {
      const m = byId.get(r.team.id)
      return m.pts * 1000 + m.dif
    }
  } else keyFn = () => 0
  return groupBy(rows, keyFn).flatMap((group) => (group.length > 1 ? rankTied(group, rest, played, standings) : group))
}

/**
 * Calcula la tabla de un grupo (o de todos los equipos, si groupId es null).
 * Devuelve filas ordenadas con su posición.
 */
export function computeStandings({ teams, matches, rules, groupId = null }) {
  const scope = groupId === null ? teams : teams.filter((t) => t.groupId === groupId)
  const ids = new Set(scope.map((t) => t.id))
  const played = playedBetween(matches, ids).filter((m) => groupId === null || !m.groupId || m.groupId === groupId)
  const standings = rules.standings
  const rows = buildRows(scope, played, standings)
  const criteria = standings.tiebreakers.filter((t) => t.enabled).map((t) => t.id)
  const ordered = groupBy(rows, (r) => r.pts).flatMap((group) => rankTied(group, criteria, played, standings))
  return ordered.map((r, i) => ({ ...r, pos: i + 1 }))
}

// Tablas de todo el campeonato: una por grupo, o una sola.
export function computeAllStandings({ tournament, groups, teams, matches }) {
  const type = tournament.format.type
  const usesGroups = type === 'groups' || type === 'groups_playoffs'
  if (type === 'knockout') return []
  if (usesGroups) {
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      rows: computeStandings({ teams, matches, rules: tournament.rules, groupId: g.id })
    }))
  }
  return [{ id: 'all', name: 'Tabla general', rows: computeStandings({ teams, matches, rules: tournament.rules }) }]
}
