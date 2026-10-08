// Lógica del partido en vivo. Todo el estado "derivado" (marcador, quién está en cancha,
// faltas, tarjetas...) se calcula repasando la lista de eventos. Así, deshacer o borrar un
// evento siempre deja el partido consistente.
import { compareMatches } from './schedule'

// ---------- Reloj ----------

export const periodMinutes = (rules, p) =>
  p <= rules.timing.periods ? rules.timing.periodMinutes : rules.timing.extraMinutes

export const isExtraPeriod = (rules, p) => p > rules.timing.periods

export function periodLabel(rules, p) {
  return isExtraPeriod(rules, p) ? `Tiempo extra ${p - rules.timing.periods}` : `${rules.timing.periodName} ${p}`
}

// Con cronómetro que sube, el reloj sigue corriendo entre tiempos (el 2.º tiempo empieza en 45:00).
// Con cronómetro regresivo, cada tiempo empieza de cero.
export function periodStartMs(rules, p) {
  if (rules.timing.clock !== 'up') return 0
  let ms = 0
  for (let i = 1; i < p; i++) ms += periodMinutes(rules, i) * 60000
  return ms
}

export const periodEndMs = (rules, p) => periodStartMs(rules, p) + periodMinutes(rules, p) * 60000

export function elapsedMs(live, now) {
  if (!live) return 0
  return (live.elapsedMs || 0) + (live.runningSince ? Math.max(0, now - live.runningSince) : 0)
}

const pad = (n) => String(n).padStart(2, '0')

export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

// Lo que se ve en el cronómetro.
export function displayClock(rules, live, now) {
  const el = elapsedMs(live, now)
  if (rules.timing.clock === 'down') {
    return formatClock(periodMinutes(rules, live.period) * 60000 - el)
  }
  return formatClock(el)
}

export function periodFinished(rules, live, now) {
  const el = elapsedMs(live, now)
  return rules.timing.clock === 'down'
    ? el >= periodMinutes(rules, live.period) * 60000
    : el >= periodEndMs(rules, live.period)
}

// Texto del momento de un evento: "23'", "45+2'" o "Cuarto 2 · 05:32".
export function eventLabel(rules, live, now) {
  const el = elapsedMs(live, now)
  if (rules.timing.clock === 'down') {
    return `${periodLabel(rules, live.period)} · ${displayClock(rules, live, now)}`
  }
  const end = periodEndMs(rules, live.period)
  if (el < end) return `${Math.floor(el / 60000) + 1}'`
  return `${Math.round(end / 60000)}+${Math.floor((el - end) / 60000) + 1}'`
}

// ¿Hay que jugar otro tiempo sin preguntar? (descanso) o toca decidir (fin / extra / penales).
export function nextPeriodIsMandatory(rules, p) {
  const { periods, extraPeriods } = rules.timing
  if (p < periods) return true
  return p > periods && p - periods < extraPeriods
}

export const needsWinner = (match, rules) => match.stage === 'knockout' || !rules.standings.allowDraws

export function canPlayExtra(rules, p) {
  const t = rules.timing
  if (!t.extraEnabled) return false
  const idx = Math.max(0, p - t.periods)
  return idx < t.extraPeriods || !rules.standings.allowDraws
}

// ---------- Estado derivado de los eventos ----------

export function deriveMatch(match, rules) {
  const events = match.events || []
  const homeId = match.homeId
  const awayId = match.awayId
  const other = (teamId) => (teamId === homeId ? awayId : homeId)

  const start = match.live?.startLineup || { home: [], away: [] }
  const onField = { [homeId]: new Set(start.home || []), [awayId]: new Set(start.away || []) }
  const score = { [homeId]: 0, [awayId]: 0 }
  const fouls = {}
  const teamFouls = { [homeId]: {}, [awayId]: {} }
  const yellows = {}
  const reds = new Set()
  const fouledOut = new Set()
  const subs = { [homeId]: 0, [awayId]: 0 }
  const timeouts = { [homeId]: 0, [awayId]: 0 }
  const limit = rules.discipline

  const remove = (teamId, pid) => onField[teamId]?.delete(pid)

  for (const ev of events) {
    const team = ev.teamId
    if (ev.type === 'score') {
      const credited = ev.own ? other(team) : team
      score[credited] = (score[credited] || 0) + (ev.points || 0)
    } else if (ev.type === 'foul') {
      if (ev.playerId) {
        fouls[ev.playerId] = (fouls[ev.playerId] || 0) + 1
        if (limit.foulsEnabled && fouls[ev.playerId] >= limit.playerFoulLimit) {
          fouledOut.add(ev.playerId)
          remove(team, ev.playerId)
        }
      }
      teamFouls[team][ev.period] = (teamFouls[team][ev.period] || 0) + 1
    } else if (ev.type === 'yellow') {
      if (ev.playerId) {
        yellows[ev.playerId] = (yellows[ev.playerId] || 0) + 1
        if (yellows[ev.playerId] >= 2) {
          reds.add(ev.playerId)
          remove(team, ev.playerId)
        }
      }
    } else if (ev.type === 'red') {
      if (ev.playerId) {
        reds.add(ev.playerId)
        remove(team, ev.playerId)
      }
    } else if (ev.type === 'sub') {
      remove(team, ev.playerOutId)
      if (ev.playerId) onField[team]?.add(ev.playerId)
      subs[team] = (subs[team] || 0) + 1
    } else if (ev.type === 'timeout') {
      timeouts[team] = (timeouts[team] || 0) + 1
    }
  }

  return {
    homeScore: score[homeId],
    awayScore: score[awayId],
    onField: { [homeId]: [...onField[homeId]], [awayId]: [...onField[awayId]] },
    fouls,
    teamFouls,
    yellows,
    reds,
    fouledOut,
    subs,
    timeouts
  }
}

// ---------- Suspensiones ----------

// Jugadores de un equipo que no deberían jugar este partido: expulsados en su último partido
// o que acumularon las amarillas necesarias.
export function suspendedPlayers(teamId, match, allMatches, rules) {
  const result = new Map()
  const prior = allMatches
    .filter(
      (m) =>
        m.status === 'finished' &&
        m.id !== match.id &&
        (m.homeId === teamId || m.awayId === teamId) &&
        compareMatches(m, match) < 0
    )
    .sort(compareMatches)
  if (prior.length === 0) return result

  const last = prior[prior.length - 1]
  const before = {}
  prior.slice(0, -1).forEach((m) => {
    ;(m.events || []).forEach((e) => {
      if (e.type === 'yellow' && e.teamId === teamId && e.playerId) before[e.playerId] = (before[e.playerId] || 0) + 1
    })
  })

  const inLast = {}
  const redLast = new Set()
  ;(last.events || []).forEach((e) => {
    if (e.teamId !== teamId || !e.playerId) return
    if (e.type === 'yellow') {
      inLast[e.playerId] = (inLast[e.playerId] || 0) + 1
      if (inLast[e.playerId] >= 2) redLast.add(e.playerId)
    }
    if (e.type === 'red') redLast.add(e.playerId)
  })

  redLast.forEach((pid) => result.set(pid, 'Expulsado en su último partido'))

  if (rules.discipline.cardsEnabled) {
    const n = rules.discipline.yellowForSuspension
    Object.entries(inLast).forEach(([pid, count]) => {
      if (result.has(pid)) return
      const b = before[pid] || 0
      if (Math.floor((b + count) / n) > Math.floor(b / n)) result.set(pid, `Acumuló ${n} amarillas`)
    })
  }
  return result
}

export const newEventId = () => `ev${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
