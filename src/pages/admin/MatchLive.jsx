import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Flag, Pause, Play, RotateCcw, Trash2, Undo2 } from 'lucide-react'
import { useTournaments } from '../../context/TournamentContext'
import { friendlyError } from '../../utils/authErrors'
import { updateMatch } from '../../utils/db'
import {
  canPlayExtra,
  deriveMatch,
  displayClock,
  elapsedMs,
  eventLabel,
  isExtraPeriod,
  needsWinner,
  newEventId,
  nextPeriodIsMandatory,
  periodFinished,
  periodLabel,
  periodMinutes,
  periodStartMs,
  suspendedPlayers
} from '../../utils/matchState'
import { formatDay } from '../../utils/schedule'
import { SPORTS } from '../../utils/sports'
import EventPicker from '../../components/EventPicker'
import { ConfirmDialog } from '../../components/Modal'
import TeamBadge from '../../components/TeamBadge'
import FullScreenLoader from '../../components/Loader'
import { EmptyState, ErrorList, NumberField } from '../../components/ui'

const EVENT_TEXT = { score: 'Anotación', foul: 'Falta', yellow: 'Amarilla', red: 'Roja', sub: 'Cambio', timeout: 'Tiempo muerto' }

// ---------- Alineaciones antes de empezar ----------

function Lineup({ team, roster, selected, onToggle, suspended, rules }) {
  const { onField, minPlayers } = rules.roster
  const ok = selected.length >= minPlayers && selected.length <= onField
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <TeamBadge item={team} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-tight [overflow-wrap:anywhere]">{team.name}</p>
          <p className={`text-[12px] ${ok ? 'text-mute' : 'font-semibold text-ink'}`}>
            Titulares {selected.length} de {onField}
            {!ok && ` (mínimo ${minPlayers})`}
          </p>
        </div>
      </div>
      {roster.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-mute">
          Este equipo no tiene jugadores registrados.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {roster.map((p) => {
            const checked = selected.includes(p.id)
            const reason = suspended.get(p.id)
            return (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 py-2.5">
                  <input type="checkbox" checked={checked} onChange={() => onToggle(p.id)} className="h-4 w-4 accent-black" />
                  <span className="w-7 text-right text-[14px] font-semibold tabular-nums">{p.number}</span>
                  <span className="min-w-0 flex-1 text-[14px] [overflow-wrap:anywhere]">{p.name}</span>
                  {reason && (
                    <span className="shrink-0 rounded-full border border-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label">
                      Suspendido
                    </span>
                  )}
                </label>
                {reason && <p className="-mt-1 pb-2 pl-14 text-[12px] text-mute">{reason}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ---------- Pantalla principal ----------

export default function MatchLive() {
  const { matchId } = useParams()
  const { tournamentsReady, active: t, teams, players, matches, dataReady } = useTournaments()
  const [now, setNow] = useState(Date.now())
  const [picker, setPicker] = useState(null)
  const [lineup, setLineup] = useState(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null) // { title, message, label, run }
  const [pens, setPens] = useState({ home: 0, away: 0 })
  const [timeoutTimer, setTimeoutTimer] = useState(null) // { teamName, end }

  const match = matches.find((m) => m.id === matchId)
  const live = match?.live
  const running = live?.phase === 'running'
  const rules = t?.rules

  useEffect(() => {
    setNow(Date.now())
    if (!running && !timeoutTimer) return undefined
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running, timeoutTimer])

  useEffect(() => {
    if (timeoutTimer && now >= timeoutTimer.end) setTimeoutTimer(null)
  }, [now, timeoutTimer])

  const home = teams.find((tm) => tm.id === match?.homeId)
  const away = teams.find((tm) => tm.id === match?.awayId)
  const rosterOf = (teamId) => players.filter((p) => p.teamId === teamId)

  const derived = useMemo(() => (match && rules ? deriveMatch(match, rules) : null), [match, rules])
  const suspended = useMemo(
    () =>
      match && rules && match.status === 'scheduled'
        ? {
            [match.homeId]: suspendedPlayers(match.homeId, match, matches, rules),
            [match.awayId]: suspendedPlayers(match.awayId, match, matches, rules)
          }
        : {},
    [match, matches, rules]
  )

  const save = async (patch) => {
    setError('')
    try {
      await updateMatch(t.id, match.id, patch)
    } catch (err) {
      console.error(err)
      setError(friendlyError(err))
    }
  }

  // Si el cronómetro regresivo llega a cero, se detiene solo.
  useEffect(() => {
    if (!running || !rules || rules.timing.clock !== 'down') return
    if (periodFinished(rules, live, now)) {
      save({
        live: { ...live, elapsedMs: periodMinutes(rules, live.period) * 60000, runningSince: null, phase: 'paused' }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, running])

  if (!tournamentsReady || (t && !dataReady)) return <FullScreenLoader />
  if (!t || !match || !home || !away) {
    return (
      <EmptyState title="No encontramos ese partido" text="Puede que se haya eliminado o que pertenezca a otro campeonato.">
        <Link to="/admin/hoy" className="btn-solid">
          Volver a los encuentros
        </Link>
      </EmptyState>
    )
  }

  const unit = SPORTS[t.sport]
  const status = match.status
  const isLive = status === 'live'
  const finished = status === 'finished'
  const homeRoster = rosterOf(home.id)
  const awayRoster = rosterOf(away.id)

  // ----- Alineaciones (antes de empezar) -----
  const defaultLineup = (roster, teamId) => {
    const sus = suspended[teamId] || new Map()
    return roster.filter((p) => !sus.has(p.id)).slice(0, rules.roster.onField).map((p) => p.id)
  }
  const lineupNow = lineup || { home: defaultLineup(homeRoster, home.id), away: defaultLineup(awayRoster, away.id) }
  const toggle = (side, pid) => {
    const list = lineupNow[side]
    setLineup({ ...lineupNow, [side]: list.includes(pid) ? list.filter((x) => x !== pid) : [...list, pid] })
  }
  const lineupValid = (list) => list.length >= rules.roster.minPlayers && list.length <= rules.roster.onField

  const startMatch = () =>
    save({
      status: 'live',
      homeScore: 0,
      awayScore: 0,
      events: [],
      winnerId: null,
      penalties: null,
      live: {
        period: 1,
        phase: 'running',
        elapsedMs: periodStartMs(rules, 1),
        runningSince: Date.now(),
        startLineup: lineupNow,
        startedAt: Date.now()
      }
    })

  // ----- Reloj -----
  const elapsedNow = () => elapsedMs(live, Date.now())
  const pause = () => save({ live: { ...live, elapsedMs: elapsedNow(), runningSince: null, phase: 'paused' } })
  const resume = () => save({ live: { ...live, runningSince: Date.now(), phase: 'running' } })
  const endPeriod = (forceDecision = false) => {
    const mandatory = !forceDecision && nextPeriodIsMandatory(rules, live.period)
    save({ live: { ...live, elapsedMs: elapsedNow(), runningSince: null, phase: mandatory ? 'break' : 'decision' } })
  }
  const startPeriod = (p) =>
    save({ live: { ...live, period: p, elapsedMs: periodStartMs(rules, p), runningSince: Date.now(), phase: 'running' } })

  const finish = (penalties) => {
    const d = deriveMatch(match, rules)
    let winnerId = ''
    if (d.homeScore > d.awayScore) winnerId = home.id
    else if (d.awayScore > d.homeScore) winnerId = away.id
    else if (penalties) winnerId = penalties.home > penalties.away ? home.id : away.id
    save({
      status: 'finished',
      homeScore: d.homeScore,
      awayScore: d.awayScore,
      penalties: penalties || null,
      winnerId,
      finishedAt: Date.now(),
      live: { ...live, elapsedMs: elapsedNow(), runningSince: null, phase: 'ended' }
    })
  }

  const reopen = () =>
    save({
      status: 'live',
      winnerId: null,
      penalties: null,
      finishedAt: null,
      live: { ...live, runningSince: null, phase: 'paused' }
    })

  // ----- Eventos -----
  const addEvent = (ev, livePatch) => {
    const stamp = Date.now()
    const full = { id: newEventId(), period: live.period, label: eventLabel(rules, live, stamp), at: stamp, ...ev }
    const events = [...(match.events || []), full]
    const d = deriveMatch({ ...match, events }, rules)
    save({ events, homeScore: d.homeScore, awayScore: d.awayScore, ...(livePatch ? { live: { ...live, ...livePatch } } : {}) })
  }
  const removeEvent = (id) => {
    const events = (match.events || []).filter((e) => e.id !== id)
    const d = deriveMatch({ ...match, events }, rules)
    save({ events, homeScore: d.homeScore, awayScore: d.awayScore })
  }

  const confirmPick = ({ playerId, playerOutId, own }) => {
    const { kind, team, action } = picker
    const base = { type: kind, teamId: team.id, playerId: playerId || null }
    if (kind === 'score') addEvent({ ...base, actionId: action.id, actionName: action.name, points: action.points, own: Boolean(own) })
    else if (kind === 'sub') addEvent({ ...base, playerOutId })
    else addEvent(base)
    setPicker(null)
  }

  const callTimeout = (team) => {
    const livePatch = running ? { elapsedMs: elapsedNow(), runningSince: null, phase: 'paused' } : null
    addEvent({ type: 'timeout', teamId: team.id }, livePatch)
    setTimeoutTimer({ teamName: team.name, end: Date.now() + rules.timeouts.seconds * 1000 })
  }

  const playerName = (id) => {
    const p = players.find((x) => x.id === id)
    return p ? `#${p.number} ${p.name}` : 'Sin identificar'
  }
  const teamName = (id) => (id === home.id ? home.name : away.name)

  // ----- Panel de cada equipo -----
  const TeamPanel = ({ team }) => {
    const d = derived
    const tf = d.teamFouls[team.id]?.[live?.period] || 0
    const btn = 'btn-outline btn-sm justify-center'
    const stats = []
    if (rules.discipline.foulsEnabled) {
      stats.push(`Faltas ${tf}/${rules.discipline.teamFoulLimit}${tf >= rules.discipline.teamFoulLimit ? ' · Bonus' : ''}`)
    }
    if (rules.substitutions.enabled) {
      stats.push(`Cambios ${d.subs[team.id]}${rules.substitutions.max ? `/${rules.substitutions.max}` : ''}`)
    }
    if (rules.timeouts.enabled) stats.push(`T. muertos ${d.timeouts[team.id]}/${rules.timeouts.perTeam}`)
    const subsFull = rules.substitutions.max > 0 && d.subs[team.id] >= rules.substitutions.max
    const timeoutsFull = d.timeouts[team.id] >= rules.timeouts.perTeam

    return (
      <section className="card p-4">
        <p className="text-[15px] font-semibold tracking-tight [overflow-wrap:anywhere]">{team.name}</p>
        {stats.length > 0 && <p className="mt-0.5 text-[12px] text-mute">{stats.join(' · ')}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {rules.scoring.actions.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setPicker({ kind: 'score', team, action: a })}
              className="btn-solid btn-sm justify-center"
            >
              {a.name} +{a.points}
            </button>
          ))}
          {rules.discipline.foulsEnabled && (
            <button type="button" onClick={() => setPicker({ kind: 'foul', team })} className={btn}>
              Falta
            </button>
          )}
          {rules.discipline.cardsEnabled && (
            <>
              <button type="button" onClick={() => setPicker({ kind: 'yellow', team })} className={btn}>
                Amarilla
              </button>
              <button type="button" onClick={() => setPicker({ kind: 'red', team })} className={btn}>
                Roja
              </button>
            </>
          )}
          {rules.substitutions.enabled && (
            <button type="button" disabled={subsFull} onClick={() => setPicker({ kind: 'sub', team })} className={btn}>
              Cambio
            </button>
          )}
          {rules.timeouts.enabled && (
            <button type="button" disabled={timeoutsFull} onClick={() => callTimeout(team)} className={btn}>
              Tiempo muerto
            </button>
          )}
        </div>
      </section>
    )
  }

  // ----- Marcador -----
  const scoreHome = derived.homeScore
  const scoreAway = derived.awayScore
  const tied = scoreHome === scoreAway
  const hasStarted = isLive || finished
  const phase = live?.phase
  const extra = live ? isExtraPeriod(rules, live.period) : false

  const scoreboard = (
    <section className="card p-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 text-center">
        <div className="flex min-w-0 flex-col items-center gap-2">
          <TeamBadge item={home} size={52} />
          <p className="text-[14px] font-semibold leading-tight [overflow-wrap:anywhere]">{home.name}</p>
        </div>
        <p className="pt-2 text-6xl font-semibold tabular-nums tracking-tight" aria-live="polite">
          {hasStarted ? `${scoreHome} - ${scoreAway}` : 'vs'}
        </p>
        <div className="flex min-w-0 flex-col items-center gap-2">
          <TeamBadge item={away} size={52} />
          <p className="text-[14px] font-semibold leading-tight [overflow-wrap:anywhere]">{away.name}</p>
        </div>
      </div>
      {hasStarted && match.penalties && (
        <p className="mt-3 text-center text-[13px] text-mute">
          Penales: {match.penalties.home} - {match.penalties.away}
        </p>
      )}
      {isLive && (
        <div className="mt-5 border-t border-line pt-4 text-center">
          <p className="text-4xl font-semibold tabular-nums tracking-tight">{displayClock(rules, live, now)}</p>
          <p className="mt-1 text-[12px] font-semibold uppercase tracking-label text-mute">
            {periodLabel(rules, live.period)}
            {phase === 'paused' && ' · En pausa'}
            {phase === 'break' && ' · Descanso'}
            {phase === 'decision' && ' · Fin del tiempo'}
          </p>
          {phase !== 'break' && phase !== 'decision' && periodFinished(rules, live, now) && (
            <p className="mt-2 text-[12px] text-mute">Tiempo cumplido. Puedes terminar el tiempo cuando el árbitro lo indique.</p>
          )}
        </div>
      )}
      {finished && <p className="mt-4 text-center text-[12px] font-semibold uppercase tracking-label text-mute">Partido finalizado</p>}
    </section>
  )

  // ----- Controles del reloj -----
  const clockControls = () => {
    if (!isLive) return null
    if (phase === 'running' || phase === 'paused') {
      return (
        <div className="flex flex-wrap gap-3">
          {phase === 'running' ? (
            <button onClick={pause} className="btn-solid">
              <Pause className="h-4 w-4" />
              Pausar
            </button>
          ) : (
            <button onClick={resume} className="btn-solid">
              <Play className="h-4 w-4" />
              Reanudar
            </button>
          )}
          <button onClick={() => endPeriod(false)} className="btn-outline">
            <Flag className="h-4 w-4" />
            Terminar {periodLabel(rules, live.period).toLowerCase()}
          </button>
        </div>
      )
    }
    if (phase === 'break') {
      const next = live.period + 1
      return (
        <div className="card p-5">
          <p className="text-[15px] font-semibold tracking-tight">Descanso</p>
          {!extra && rules.timing.breakMinutes > 0 && (
            <p className="mt-1 text-sm text-mute">Dura {rules.timing.breakMinutes} min según las reglas.</p>
          )}
          <button onClick={() => startPeriod(next)} className="btn-solid mt-4">
            <Play className="h-4 w-4" />
            Iniciar {periodLabel(rules, next).toLowerCase()}
          </button>
        </div>
      )
    }
    if (phase === 'decision') {
      const mustWin = needsWinner(match, rules)
      const extraOk = tied && mustWin && canPlayExtra(rules, live.period)
      const pensNeeded = tied && mustWin && !extraOk
      return (
        <div className="card p-5">
          <p className="text-[15px] font-semibold tracking-tight">Terminó el tiempo reglamentario</p>
          <p className="mt-1 text-sm text-mute">
            {tied && mustWin ? 'El partido está empatado y necesita un ganador.' : 'Puedes finalizar el partido.'}
          </p>
          {pensNeeded && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="label">Penales {home.shortName || home.name}</p>
                <NumberField value={pens.home} min={0} max={30} onChange={(v) => setPens({ ...pens, home: v })} ariaLabel="Penales local" />
              </div>
              <div>
                <p className="label">Penales {away.shortName || away.name}</p>
                <NumberField value={pens.away} min={0} max={30} onChange={(v) => setPens({ ...pens, away: v })} ariaLabel="Penales visitante" />
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {extraOk && (
              <button onClick={() => startPeriod(live.period + 1)} className="btn-solid">
                <Play className="h-4 w-4" />
                {periodLabel(rules, live.period + 1)}
              </button>
            )}
            {pensNeeded ? (
              <button onClick={() => finish(pens)} disabled={pens.home === pens.away} className="btn-solid">
                Finalizar con penales
              </button>
            ) : (
              <button onClick={() => finish(null)} className={extraOk ? 'btn-outline' : 'btn-solid'}>
                Finalizar partido
              </button>
            )}
          </div>
          {pensNeeded && pens.home === pens.away && (
            <p className="mt-3 text-[12px] text-mute">Los penales no pueden quedar iguales.</p>
          )}
        </div>
      )
    }
    return null
  }

  // ----- Línea de tiempo -----
  const events = [...(match.events || [])].reverse()
  const describe = (ev) => {
    if (ev.type === 'score') {
      const who = ev.playerId ? playerName(ev.playerId) : 'Sin identificar'
      return `${ev.actionName}${ev.own ? ' en contra' : ''} · ${who} (${teamName(ev.teamId)})`
    }
    if (ev.type === 'sub') return `Entra ${playerName(ev.playerId)}, sale ${playerName(ev.playerOutId)} (${teamName(ev.teamId)})`
    if (ev.type === 'timeout') return `Tiempo muerto de ${teamName(ev.teamId)}`
    return `${EVENT_TEXT[ev.type]} · ${ev.playerId ? playerName(ev.playerId) : 'Sin identificar'} (${teamName(ev.teamId)})`
  }

  const timeline = (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="eyebrow">Cronología</h2>
        {isLive && events.length > 0 && (
          <button onClick={() => removeEvent(events[0].id)} className="btn-ghost btn-sm">
            <Undo2 className="h-4 w-4" />
            Deshacer último
          </button>
        )}
      </div>
      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-mute">
          Todavía no hay eventos en este partido.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3 px-4 py-3">
              <span className="w-20 shrink-0 text-[12px] font-semibold tabular-nums text-mute">{ev.label}</span>
              <span className="min-w-0 flex-1 text-[14px] [overflow-wrap:anywhere]">{describe(ev)}</span>
              {isLive && (
                <button
                  onClick={() =>
                    setConfirm({
                      title: 'Quitar evento',
                      message: `Se quitará: ${describe(ev)}. El marcador y las estadísticas se recalculan.`,
                      label: 'Quitar',
                      run: () => removeEvent(ev.id)
                    })
                  }
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-neutral-100"
                  aria-label="Quitar evento"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  // ----- Resumen de goleadores -----
  const scorers = (teamId) => {
    const map = new Map()
    ;(match.events || []).forEach((e) => {
      if (e.type !== 'score') return
      const credited = e.own ? (e.teamId === home.id ? away.id : home.id) : e.teamId
      if (credited !== teamId) return
      const key = e.playerId ? `${e.playerId}${e.own ? '-og' : ''}` : `anon${e.own ? '-og' : ''}`
      const prev = map.get(key) || { name: e.playerId ? playerName(e.playerId) : 'Sin identificar', own: e.own, marks: [] }
      prev.marks.push(`${e.label}${e.points > 1 ? ` (${e.points})` : ''}`)
      map.set(key, prev)
    })
    return [...map.values()]
  }

  const unavailable = (team) => {
    const s = new Set([...derived.reds, ...derived.fouledOut])
    return new Set(players.filter((p) => p.teamId === team.id && s.has(p.id)).map((p) => p.id))
  }

  const prepared = !isLive && !finished
  const canStart = lineupValid(lineupNow.home) && lineupValid(lineupNow.away)

  return (
    <>
      <Link to="/admin/hoy" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Encuentros
      </Link>
      <p className="eyebrow">
        {[t.name, match.roundLabel].filter(Boolean).join(' · ')}
      </p>
      <p className="mt-1 text-[13px] text-mute">
        {[match.date && formatDay(match.date), match.time, match.court].filter(Boolean).join(' · ')}
      </p>

      <div className="mt-6">{scoreboard}</div>

      {timeoutTimer && (
        <p className="mt-4 border-l-2 border-ink pl-3 text-sm" role="status">
          Tiempo muerto de {timeoutTimer.teamName}: {Math.max(0, Math.ceil((timeoutTimer.end - now) / 1000))} s
        </p>
      )}

      <div className="mt-4">
        <ErrorList errors={error ? [error] : []} />
      </div>

      {prepared && (
        <section className="mt-8">
          <h2 className="text-2xl font-semibold tracking-tight">Alineaciones</h2>
          <p className="mb-5 mt-1 text-sm text-mute">
            Marca los titulares de cada equipo. Los demás quedan en la banca y podrán entrar con un cambio.
          </p>
          <div className="space-y-4">
            <Lineup team={home} roster={homeRoster} selected={lineupNow.home} onToggle={(id) => toggle('home', id)} suspended={suspended[home.id] || new Map()} rules={rules} />
            <Lineup team={away} roster={awayRoster} selected={lineupNow.away} onToggle={(id) => toggle('away', id)} suspended={suspended[away.id] || new Map()} rules={rules} />
          </div>
          <button onClick={startMatch} disabled={!canStart} className="btn-solid mt-6">
            <Play className="h-4 w-4" />
            Iniciar partido
          </button>
          {!canStart && (
            <p className="mt-3 text-[12px] text-mute">
              Cada equipo necesita entre {rules.roster.minPlayers} y {rules.roster.onField} titulares.
            </p>
          )}
        </section>
      )}

      {isLive && (
        <>
          <div className="mt-6">{clockControls()}</div>
          <div className="mt-8 space-y-4">
            <TeamPanel team={home} />
            <TeamPanel team={away} />
          </div>
          {phase !== 'decision' && (
            <button onClick={() => endPeriod(true)} className="btn-ghost btn-sm mt-6">
              <Flag className="h-4 w-4" />
              Terminar el partido ahora
            </button>
          )}
        </>
      )}

      {finished && (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            {[home, away].map((tm) => (
              <div key={tm.id} className="card p-4">
                <p className="text-[15px] font-semibold tracking-tight [overflow-wrap:anywhere]">
                  {tm.name}
                  {match.winnerId === tm.id && <span className="ml-2 text-[11px] uppercase tracking-label text-accent">Ganador</span>}
                </p>
                {scorers(tm.id).length === 0 ? (
                  <p className="mt-2 text-sm text-mute">Sin anotaciones.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-[14px]">
                    {scorers(tm.id).map((s) => (
                      <li key={s.name + s.own}>
                        {s.name}
                        {s.own ? ' (en contra)' : ''} <span className="text-mute">{s.marks.join(', ')}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                setConfirm({
                  title: 'Reabrir partido',
                  message: 'El partido vuelve a estar en juego (en pausa) para corregir eventos. Al terminar, finalízalo de nuevo.',
                  label: 'Reabrir',
                  run: reopen
                })
              }
              className="btn-outline btn-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Reabrir partido
            </button>
            <span className="text-[12px] text-mute">La exportación del informe en PDF llega en la Etapa 5.</span>
          </div>
        </>
      )}

      {hasStarted && timeline}

      <EventPicker
        spec={picker}
        roster={picker ? rosterOf(picker.team.id) : []}
        onField={picker ? derived.onField[picker.team.id] : []}
        unavailable={picker ? unavailable(picker.team) : new Set()}
        showOwnGoal={t.sport === 'futbol'}
        onClose={() => setPicker(null)}
        onConfirm={confirmPick}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          confirm.run()
          setConfirm(null)
        }}
        title={confirm?.title || ''}
        confirmLabel={confirm?.label}
        message={confirm?.message || ''}
      />
    </>
  )
}
