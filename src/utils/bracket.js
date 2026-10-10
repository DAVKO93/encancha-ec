// Llaves de eliminación directa: quiénes clasifican y cómo se arma cada ronda.
import { computeStandings } from './standings'
import { knockoutRoundName } from './schedule'

const blank = { date: '', time: '', court: '', status: 'scheduled', homeScore: null, awayScore: null, groupId: '' }

export const isKnockout = (m) => m.stage === 'knockout'

// ¿Terminó la fase de grupos? (hay partidos y todos están finalizados)
export function groupStageFinished(matches) {
  const gm = matches.filter((m) => !isKnockout(m))
  return gm.length > 0 && gm.every((m) => m.status === 'finished')
}

// Clasificados de los grupos en orden de siembra: los primeros de cada grupo, luego los segundos...
export function qualifierSeeds({ tournament, groups, teams, matches }) {
  const q = tournament.format.qualifiersPerGroup || 2
  const tables = groups.map((g) =>
    computeStandings({ teams, matches, rules: tournament.rules, groupId: g.id }).slice(0, q)
  )
  const seeds = []
  for (let r = 0; r < q; r++) tables.forEach((rows) => rows[r] && seeds.push(rows[r].team.id))
  return seeds
}

// Mejor contra peor, evitando (si se puede) que se enfrenten equipos del mismo grupo.
export function pairSeeds(seeds, groupOf) {
  const n = seeds.length
  const pairs = []
  for (let i = 0; i < Math.floor(n / 2); i++) pairs.push([seeds[i], seeds[n - 1 - i]])
  for (let i = 0; i < pairs.length; i++) {
    const [a, b] = pairs[i]
    if (groupOf(a) && groupOf(a) === groupOf(b)) {
      for (let j = 0; j < pairs.length; j++) {
        if (j === i) continue
        const [c, d] = pairs[j]
        if (groupOf(a) !== groupOf(d) && groupOf(c) !== groupOf(b)) {
          pairs[i] = [a, d]
          pairs[j] = [c, b]
          break
        }
      }
    }
  }
  return pairs
}

const pow2AtLeast = (n) => {
  let s = 2
  while (s < n) s *= 2
  return s
}

const loserOf = (m) => (m.winnerId === m.homeId ? m.awayId : m.homeId)

/**
 * Qué falta por generar en la fase final.
 * Devuelve { state, ... }:
 *  - 'not-ready'   : aún no termina la fase de grupos (o no hay partidos)
 *  - 'pending'     : hay una ronda en juego
 *  - 'ready'       : se puede generar la siguiente ronda -> { matches, roundLabel }
 *  - 'champion'    : terminó -> { championId }
 *  - 'none'        : el formato no tiene eliminación directa
 */
export function nextKnockoutStep({ tournament, groups, teams, matches }) {
  const type = tournament.format.type
  if (type !== 'knockout' && type !== 'groups_playoffs') return { state: 'none' }

  const groupOf = (id) => teams.find((t) => t.id === id)?.groupId || ''
  const ko = matches.filter(isKnockout)
  const thirdPlace = tournament.format.thirdPlace

  let entrants
  if (type === 'knockout') {
    if (ko.length === 0) return { state: 'not-ready' }
    entrants = teams.map((t) => t.id)
  } else {
    if (ko.length === 0) {
      if (!groupStageFinished(matches)) return { state: 'not-ready' }
      entrants = qualifierSeeds({ tournament, groups, teams, matches })
      if (entrants.length < 2) return { state: 'not-ready' }
    } else {
      entrants = qualifierSeeds({ tournament, groups, teams, matches })
    }
  }

  // Primera ronda de eliminación a partir de los clasificados.
  if (ko.length === 0) {
    const n = entrants.length
    const size = pow2AtLeast(n)
    const byes = entrants.slice(0, size - n)
    const pairs = pairSeeds(entrants.slice(size - n), groupOf)
    return {
      state: 'ready',
      roundLabel: knockoutRoundName(size),
      byes,
      matches: pairs.map(([homeId, awayId]) => ({
        ...blank,
        stage: 'knockout',
        round: 1,
        roundLabel: knockoutRoundName(size),
        homeId,
        awayId
      }))
    }
  }

  const lastRound = Math.max(...ko.map((m) => m.round || 1))
  let current = entrants
  for (let r = 1; r <= lastRound; r++) {
    const ms = ko.filter((m) => (m.round || 1) === r && !m.third)
    const all = ko.filter((m) => (m.round || 1) === r)
    if (all.some((m) => m.status !== 'finished' || !m.winnerId)) return { state: 'pending', round: r }
    const played = new Set(ms.flatMap((m) => [m.homeId, m.awayId]))
    const byes = current.filter((id) => !played.has(id))
    const winners = ms.map((m) => m.winnerId)
    if (r < lastRound) {
      current = [...byes, ...winners]
      continue
    }
    // r === lastRound: todo terminado. ¿Hay campeón o toca otra ronda?
    const next = [...byes, ...winners]
    if (next.length === 1) return { state: 'champion', championId: next[0] }

    const pairs = []
    const b = [...byes]
    const w = [...winners]
    while (b.length && w.length) pairs.push([b.shift(), w.shift()])
    const rest = [...b, ...w]
    for (let i = 0; i + 1 < rest.length; i += 2) pairs.push([rest[i], rest[i + 1]])

    const label = knockoutRoundName(next.length === 2 ? 2 : pow2AtLeast(next.length))
    const out = pairs.map(([homeId, awayId]) => ({
      ...blank,
      stage: 'knockout',
      round: r + 1,
      roundLabel: label,
      homeId,
      awayId
    }))
    if (next.length === 2 && thirdPlace && ms.length === 2) {
      out.push({
        ...blank,
        stage: 'knockout',
        round: r + 1,
        roundLabel: 'Tercer puesto',
        third: true,
        homeId: loserOf(ms[0]),
        awayId: loserOf(ms[1])
      })
    }
    return { state: 'ready', roundLabel: label, matches: out }
  }
  return { state: 'pending' }
}
