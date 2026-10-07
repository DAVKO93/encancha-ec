// Deportes disponibles y sus valores iniciales. Todo es editable por campeonato:
// al elegir un deporte solo se "rellenan" estos valores, que luego se pueden cambiar.

export const SPORTS = {
  futbol: {
    id: 'futbol',
    label: 'Fútbol',
    description: '2 tiempos de 45 minutos. Goles, tarjetas amarillas y rojas, sustituciones.',
    scoreNoun: 'goles',
    scoreUnit: 'gol'
  },
  basquet: {
    id: 'basquet',
    label: 'Básquet',
    description: '4 cuartos de 10 minutos. Tiros de 1, 2 y 3 puntos, faltas y tiempos muertos.',
    scoreNoun: 'puntos',
    scoreUnit: 'punto'
  }
}

export const SPORT_LIST = Object.values(SPORTS)

export const FORMATS = {
  groups_playoffs: {
    label: 'Grupos y eliminación directa',
    description: 'Fase de grupos y luego llaves de eliminación directa entre los clasificados.'
  },
  groups: {
    label: 'Solo fase de grupos',
    description: 'Cada grupo tiene su tabla y los equipos juegan entre sí dentro del grupo.'
  },
  league: {
    label: 'Todos contra todos',
    description: 'Una sola tabla: todos los equipos juegan contra todos.'
  },
  knockout: {
    label: 'Eliminación directa',
    description: 'Llaves: quien pierde queda fuera del campeonato.'
  }
}

export const FORMAT_LIST = Object.entries(FORMATS).map(([id, f]) => ({ id, ...f }))

export const usesGroups = (type) => type === 'groups' || type === 'groups_playoffs'
export const usesPlayoffs = (type) => type === 'groups_playoffs' || type === 'knockout'

export const DEFAULT_FORMAT = {
  type: 'groups_playoffs',
  groupsCount: 2,
  qualifiersPerGroup: 2,
  homeAway: false,
  thirdPlace: true,
  knockoutTwoLegs: false
}

export const PERIOD_NAMES = ['Tiempo', 'Cuarto', 'Set', 'Periodo']

export const TIEBREAKER_IDS = ['dif', 'favor', 'directo', 'ganados', 'contra', 'fairplay']

export function tiebreakerLabel(id, sport) {
  const noun = SPORTS[sport]?.scoreNoun || 'puntos'
  const cap = noun.charAt(0).toUpperCase() + noun.slice(1)
  switch (id) {
    case 'dif':
      return `Diferencia de ${noun}`
    case 'favor':
      return `${cap} a favor`
    case 'contra':
      return `Menos ${noun} en contra`
    case 'directo':
      return 'Resultado entre los equipos empatados'
    case 'ganados':
      return 'Más partidos ganados'
    case 'fairplay':
      return 'Juego limpio (menos sanciones)'
    default:
      return id
  }
}

export function defaultRules(sport) {
  if (sport === 'basquet') {
    return {
      timing: {
        periods: 4,
        periodName: 'Cuarto',
        periodMinutes: 10,
        breakMinutes: 2,
        clock: 'down',
        extraEnabled: true,
        extraMinutes: 5,
        extraPeriods: 1
      },
      scoring: {
        actions: [
          { id: 'libre', name: 'Tiro libre', points: 1 },
          { id: 'doble', name: 'Doble', points: 2 },
          { id: 'triple', name: 'Triple', points: 3 }
        ]
      },
      standings: {
        pointsWin: 2,
        pointsDraw: 0,
        pointsLoss: 1,
        allowDraws: false,
        tiebreakers: [
          { id: 'directo', enabled: true },
          { id: 'dif', enabled: true },
          { id: 'favor', enabled: true },
          { id: 'ganados', enabled: false },
          { id: 'contra', enabled: false },
          { id: 'fairplay', enabled: false }
        ]
      },
      discipline: {
        cardsEnabled: false,
        yellowForSuspension: 3,
        foulsEnabled: true,
        playerFoulLimit: 5,
        teamFoulLimit: 5
      },
      substitutions: { enabled: true, max: 0 },
      timeouts: { enabled: true, perTeam: 5, seconds: 60 },
      roster: {
        onField: 5,
        minPlayers: 5,
        maxPlayers: 15,
        positions: ['Base', 'Escolta', 'Alero', 'Ala-pívot', 'Pívot']
      }
    }
  }
  return {
    timing: {
      periods: 2,
      periodName: 'Tiempo',
      periodMinutes: 45,
      breakMinutes: 15,
      clock: 'up',
      extraEnabled: false,
      extraMinutes: 15,
      extraPeriods: 2
    },
    scoring: { actions: [{ id: 'gol', name: 'Gol', points: 1 }] },
    standings: {
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      allowDraws: true,
      tiebreakers: [
        { id: 'dif', enabled: true },
        { id: 'favor', enabled: true },
        { id: 'directo', enabled: true },
        { id: 'ganados', enabled: false },
        { id: 'contra', enabled: false },
        { id: 'fairplay', enabled: false }
      ]
    },
    discipline: {
      cardsEnabled: true,
      yellowForSuspension: 3,
      foulsEnabled: false,
      playerFoulLimit: 5,
      teamFoulLimit: 5
    },
    substitutions: { enabled: true, max: 5 },
    timeouts: { enabled: false, perTeam: 0, seconds: 60 },
    roster: {
      onField: 11,
      minPlayers: 7,
      maxPlayers: 25,
      positions: ['Portero', 'Defensa', 'Mediocampista', 'Delantero']
    }
  }
}

// Completa con valores iniciales lo que falte (por si un campeonato viejo no tiene algún campo).
export function mergeRules(rules, sport) {
  const base = defaultRules(sport)
  const r = rules || {}
  const out = {}
  for (const key of Object.keys(base)) {
    out[key] = { ...base[key], ...(r[key] || {}) }
  }
  const saved = out.standings.tiebreakers || []
  const known = new Set(saved.map((t) => t.id))
  out.standings.tiebreakers = [
    ...saved.filter((t) => TIEBREAKER_IDS.includes(t.id)),
    ...TIEBREAKER_IDS.filter((id) => !known.has(id)).map((id) => ({ id, enabled: false }))
  ]
  if (!out.scoring.actions?.length) out.scoring.actions = base.scoring.actions
  return out
}

export function withDefaults(tournament) {
  if (!tournament) return tournament
  return {
    ...tournament,
    format: { ...DEFAULT_FORMAT, ...(tournament.format || {}) },
    rules: mergeRules(tournament.rules, tournament.sport)
  }
}

const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max

export function validateRules(rules) {
  const errs = []
  const t = rules.timing
  if (!isInt(t.periods, 1, 8)) errs.push('La cantidad de tiempos debe estar entre 1 y 8.')
  if (!isInt(t.periodMinutes, 1, 120)) errs.push('La duración de cada tiempo debe estar entre 1 y 120 minutos.')
  if (!isInt(t.breakMinutes, 0, 60)) errs.push('El descanso debe estar entre 0 y 60 minutos.')
  if (t.extraEnabled && !isInt(t.extraMinutes, 1, 60)) errs.push('La duración del tiempo extra debe estar entre 1 y 60 minutos.')

  const actions = rules.scoring.actions
  if (!actions.length) errs.push('Agrega al menos un tipo de anotación.')
  if (actions.some((a) => !a.name.trim())) errs.push('Todos los tipos de anotación necesitan un nombre.')
  if (actions.some((a) => !isInt(a.points, 1, 99))) errs.push('Cada anotación debe valer entre 1 y 99 puntos.')

  const s = rules.standings
  if (![s.pointsWin, s.pointsLoss].every((v) => isInt(v, 0, 20)) || (s.allowDraws && !isInt(s.pointsDraw, 0, 20))) {
    errs.push('Los puntos de la clasificación deben estar entre 0 y 20.')
  }

  const p = rules.roster
  if (!isInt(p.onField, 1, 30)) errs.push('Los jugadores en cancha deben estar entre 1 y 30.')
  if (!isInt(p.minPlayers, 1, 60) || !isInt(p.maxPlayers, 1, 60)) errs.push('Revisa el mínimo y el máximo de jugadores por equipo.')
  else if (p.minPlayers > p.maxPlayers) errs.push('El mínimo de jugadores no puede ser mayor que el máximo.')
  else if (p.maxPlayers < p.onField) errs.push('El máximo de jugadores por equipo no puede ser menor que los jugadores en cancha.')
  return errs
}

export function newActionId() {
  return `a${Math.random().toString(36).slice(2, 8)}`
}
