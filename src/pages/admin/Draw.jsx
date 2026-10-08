import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Shuffle, Trash2 } from 'lucide-react'
import { useTournaments } from '../../context/TournamentContext'
import { friendlyError } from '../../utils/authErrors'
import { assignTeamGroups, replaceMatches } from '../../utils/db'
import { FORMATS, usesGroups } from '../../utils/sports'
import { DEFAULT_SCHEDULE, assignToGroups, bucketsFromOrder, buildFixtures, knockoutRoundName, scheduleMatches } from '../../utils/schedule'
import { ConfirmDialog } from '../../components/Modal'
import RouletteDraw from '../../components/RouletteDraw'
import ScheduleList from '../../components/ScheduleList'
import ScheduleSettings, { initialSchedule } from '../../components/ScheduleSettings'
import TeamBadge from '../../components/TeamBadge'
import FullScreenLoader, { Spinner } from '../../components/Loader'
import { EmptyState, ErrorList, Segmented, Switch } from '../../components/ui'
import Calendar from './Calendar'

function TeamLine({ team, n }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      {n !== undefined && <span className="w-5 text-right text-[13px] font-semibold tabular-nums text-mute">{n}</span>}
      <TeamBadge item={team} size={30} />
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere] text-[14px] font-medium">{team.name}</span>
    </li>
  )
}

function Bucket({ title, items, teamsById, numbered }) {
  return (
    <section>
      <h3 className="eyebrow mb-2">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-mute">Todavía sin equipos.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {items.map((id, i) => (
            <TeamLine key={id} team={teamsById.get(id)} n={numbered ? i + 1 : undefined} />
          ))}
        </ul>
      )}
    </section>
  )
}

function InfoCard({ title, text, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-mute">{text}</p>
      {children && <div className="mt-5 flex flex-wrap gap-3">{children}</div>}
    </section>
  )
}

export default function Draw() {
  const { tournamentsReady, active: t, groups, teams, matches, dataReady } = useTournaments()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'calendario' ? 'calendario' : 'sorteo'
  const setTab = (v) => setParams(v === 'calendario' ? { tab: 'calendario' } : {}, { replace: true })

  // mode: home | groups | fixtures | schedule
  const [mode, setMode] = useState('home')
  const [groupScope, setGroupScope] = useState('unassigned')
  const [order, setOrder] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SCHEDULE)
  const [withDates, setWithDates] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])
  const [clearing, setClearing] = useState(false)

  const teamsById = useMemo(() => new Map(teams.map((tm) => [tm.id, tm])), [teams])
  const groupsById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])

  const hasGroups = t ? usesGroups(t.format.type) : false
  const validGroup = (tm) => Boolean(tm.groupId && groupsById.has(tm.groupId))
  const unassigned = teams.filter((tm) => !validGroup(tm))
  const played = matches.filter((m) => m.status !== 'scheduled')

  const fixtures = useMemo(() => {
    if (mode !== 'schedule' || !t) return null
    return buildFixtures({ tournament: t, groups, teams, orderIds: order })
  }, [mode, t, groups, teams, order])

  const scheduled = useMemo(() => {
    if (!fixtures) return []
    return withDates && settings.startDate ? scheduleMatches(fixtures.matches, settings) : fixtures.matches
  }, [fixtures, settings, withDates])

  if (!tournamentsReady) return <FullScreenLoader />
  if (!t) {
    return (
      <>
        <p className="eyebrow">Sorteo</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Sorteo de encuentros</h1>
        <div className="mt-10">
          <EmptyState title="Primero crea un campeonato" text="El sorteo se hace sobre los equipos de un campeonato.">
            <Link to="/admin/crear/nuevo" className="btn-solid">
              Crear campeonato
            </Link>
          </EmptyState>
        </div>
      </>
    )
  }
  if (!dataReady) return <FullScreenLoader />

  const header = (
    <>
      <p className="eyebrow">{t.name}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{tab === 'sorteo' ? 'Sorteo de encuentros' : 'Calendario'}</h1>
      <div className="mt-6">
        <Segmented
          ariaLabel="Sección"
          value={tab}
          onChange={(v) => {
            setMode('home')
            setTab(v)
          }}
          options={[
            { value: 'sorteo', label: 'Sorteo' },
            { value: 'calendario', label: `Calendario${matches.length ? ` (${matches.length})` : ''}` }
          ]}
        />
      </div>
    </>
  )

  if (tab === 'calendario') {
    return (
      <>
        {header}
        <div className="mt-8">
          <Calendar onGoDraw={() => setTab('sorteo')} />
        </div>
      </>
    )
  }

  const back = (
    <button
      type="button"
      onClick={() => {
        setMode('home')
        setErrors([])
      }}
      className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
      Volver al sorteo
    </button>
  )

  // ---------- Sorteo de grupos ----------
  if (mode === 'groups') {
    const pool = groupScope === 'all' ? teams : unassigned
    const base = {}
    if (groupScope === 'unassigned') {
      teams.filter(validGroup).forEach((tm) => {
        base[tm.groupId] = (base[tm.groupId] || 0) + 1
      })
    }
    const confirm = async (ids) => {
      setBusy(true)
      setErrors([])
      try {
        await assignTeamGroups(t.id, assignToGroups(ids, groups, base))
        setMode('home')
      } catch (err) {
        console.error(err)
        setErrors([friendlyError(err)])
      } finally {
        setBusy(false)
      }
    }
    return (
      <>
        {back}
        <h2 className="text-2xl font-semibold tracking-tight">Sorteo de grupos</h2>
        <p className="mb-6 mt-1 text-sm text-mute">
          Cada giro elige un equipo y lo manda al grupo que tenga menos equipos.
        </p>
        <RouletteDraw
          teams={pool}
          busy={busy}
          confirmLabel="Confirmar grupos"
          onConfirm={confirm}
          preview={(picked) => {
            const ids = picked.map((p) => p.id)
            const assignment = assignToGroups(ids, groups, base)
            return (
              <div className="space-y-6">
                {groups.map((g) => {
                  const existing = groupScope === 'unassigned' ? teams.filter((tm) => tm.groupId === g.id).map((tm) => tm.id) : []
                  const added = ids.filter((id) => assignment.get(id) === g.id)
                  return <Bucket key={g.id} title={g.name} items={[...existing, ...added]} teamsById={teamsById} />
                })}
              </div>
            )
          }}
        />
        <div className="mt-4">
          <ErrorList errors={errors} />
        </div>
      </>
    )
  }

  // ---------- Sorteo de enfrentamientos ----------
  if (mode === 'fixtures') {
    const pool = hasGroups ? teams.filter(validGroup) : teams
    return (
      <>
        {back}
        <h2 className="text-2xl font-semibold tracking-tight">Sorteo de enfrentamientos</h2>
        <p className="mb-6 mt-1 text-sm text-mute">
          El orden en que salen los equipos define quién juega contra quién
          {t.format.type === 'knockout' ? ' en las llaves.' : ' en cada jornada.'}
        </p>
        <RouletteDraw
          teams={pool}
          confirmLabel="Confirmar sorteo"
          onConfirm={(ids) => {
            setOrder(ids)
            setSettings(initialSchedule(t))
            setMode('schedule')
          }}
          preview={(picked) => {
            const ids = picked.map((p) => p.id)
            return (
              <div className="space-y-6">
                {bucketsFromOrder(ids, t, groups, teams).map((b) => (
                  <Bucket key={b.id} title={b.name} items={b.teamIds} teamsById={teamsById} numbered />
                ))}
              </div>
            )
          }}
        />
      </>
    )
  }

  // ---------- Fechas y confirmación ----------
  if (mode === 'schedule' && fixtures) {
    const confirm = async () => {
      if (withDates && !settings.startDate) return setErrors(['Elige el primer día o desactiva la programación de fechas.'])
      if (scheduled.length === 0) return setErrors(['El sorteo no generó ningún partido.'])
      setBusy(true)
      setErrors([])
      try {
        await replaceMatches(t.id, matches, scheduled)
        setMode('home')
        setTab('calendario')
      } catch (err) {
        console.error(err)
        setErrors([friendlyError(err)])
      } finally {
        setBusy(false)
      }
    }
    const preview = scheduled.map((m, i) => ({ ...m, id: `p${i}` }))
    const shownDays = []
    for (const m of preview) {
      if (!shownDays.includes(m.date) && shownDays.length < 3) shownDays.push(m.date)
    }
    const shown = preview.filter((m) => shownDays.includes(m.date))

    return (
      <>
        <button
          type="button"
          onClick={() => {
            setMode('fixtures')
            setErrors([])
          }}
          className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la ruleta
        </button>
        <h2 className="text-2xl font-semibold tracking-tight">Calendario del campeonato</h2>
        <p className="mt-1 text-sm text-mute">
          {scheduled.length} {scheduled.length === 1 ? 'partido' : 'partidos'} generados. Revisa cuándo se juegan y confirma.
        </p>

        {fixtures.byes.length > 0 && (
          <p className="mt-5 border-l-2 border-ink pl-3 text-sm">
            Pasan directo a la siguiente ronda ({knockoutRoundName(fixtures.byes.length * 2)} en adelante):{' '}
            {fixtures.byes.map((id) => teamsById.get(id)?.name).join(', ')}.
          </p>
        )}
        {fixtures.warnings.map((w) => (
          <p key={w} className="mt-5 border-l-2 border-ink pl-3 text-sm">
            {w}
          </p>
        ))}
        {usesGroupsAndPlayoffs(t) && (
          <p className="mt-5 text-[13px] text-mute">
            Las llaves de eliminación directa se generan cuando termine la fase de grupos.
          </p>
        )}
        {t.format.type === 'knockout' && (
          <p className="mt-5 text-[13px] text-mute">
            Las siguientes rondas se generan cuando se jueguen estos partidos.
          </p>
        )}

        <div className="card mt-8 p-5 sm:p-6">
          <Switch
            checked={withDates}
            onChange={setWithDates}
            label="Asignar fechas y horas ahora"
            hint="Si lo apagas, los partidos quedan sin fecha y los programas después."
          />
          {withDates && (
            <div className="mt-5">
              <ScheduleSettings value={settings} onChange={setSettings} />
            </div>
          )}
        </div>

        <h3 className="eyebrow mb-3 mt-10">Vista previa</h3>
        <ScheduleList matches={shown} teams={teams} groups={groups} />
        {shownDays.length < new Set(preview.map((m) => m.date)).size && (
          <p className="mt-3 text-[13px] text-mute">Se muestran los primeros días. El resto se ve en el calendario.</p>
        )}

        {matches.length > 0 && (
          <p className="mt-8 border-l-2 border-ink pl-3 text-sm">
            Este sorteo reemplaza los {matches.length} partidos que hay ahora en el calendario.
          </p>
        )}

        <div className="mt-6">
          <ErrorList errors={errors} />
        </div>
        <button type="button" onClick={confirm} disabled={busy} className="btn-solid mt-6">
          {busy ? <Spinner className="h-4 w-4" /> : 'Confirmar y crear calendario'}
        </button>
      </>
    )
  }

  // ---------- Inicio del sorteo ----------
  const clearCalendar = async () => {
    setBusy(true)
    setErrors([])
    try {
      await replaceMatches(t.id, matches, [])
      setClearing(false)
    } catch (err) {
      console.error(err)
      setErrors([friendlyError(err)])
    } finally {
      setBusy(false)
    }
  }

  const needsGroups = hasGroups && unassigned.length > 0
  const enoughTeams = teams.length >= 2

  return (
    <>
      {header}
      <p className="mt-6 max-w-md text-[15px] leading-relaxed text-mute">
        {FORMATS[t.format.type]?.label}. Gira la ruleta para definir los grupos y los enfrentamientos de forma aleatoria.
      </p>

      <div className="mt-8 space-y-4">
        {hasGroups && (
          <InfoCard
            title="1. Sorteo de grupos"
            text={
              groups.length === 0
                ? 'Primero crea los grupos desde la pantalla del campeonato.'
                : matches.length > 0
                  ? 'Ya hay un calendario. Para volver a sortear los grupos, primero elimina el calendario.'
                  : unassigned.length > 0
                    ? `${unassigned.length} ${unassigned.length === 1 ? 'equipo está' : 'equipos están'} sin grupo. ${teams.length - unassigned.length} ya tienen uno.`
                    : 'Todos los equipos ya tienen grupo. Puedes sortearlos de nuevo si quieres.'
            }
          >
            {groups.length > 0 && matches.length === 0 && (
              <>
                {unassigned.length > 0 && (
                  <button
                    onClick={() => {
                      setGroupScope('unassigned')
                      setMode('groups')
                    }}
                    className="btn-solid btn-sm"
                  >
                    <Shuffle className="h-4 w-4" />
                    Sortear los que faltan
                  </button>
                )}
                {teams.length > 0 && (
                  <button
                    onClick={() => {
                      setGroupScope('all')
                      setMode('groups')
                    }}
                    className={`${unassigned.length > 0 ? 'btn-outline' : 'btn-solid'} btn-sm`}
                  >
                    <Shuffle className="h-4 w-4" />
                    Sortear todos
                  </button>
                )}
              </>
            )}
          </InfoCard>
        )}

        <InfoCard
          title={hasGroups ? '2. Sorteo de enfrentamientos' : 'Sorteo de enfrentamientos'}
          text={
            !enoughTeams
              ? 'Necesitas al menos 2 equipos para hacer el sorteo.'
              : needsGroups
                ? 'Antes asigna grupo a todos los equipos con el sorteo de grupos.'
                : played.length > 0
                  ? 'Ya se jugaron partidos, así que el sorteo no se puede repetir.'
                  : matches.length > 0
                    ? `Ya hay ${matches.length} partidos en el calendario. Un nuevo sorteo los reemplaza.`
                    : 'Define el orden de los equipos y se genera el calendario completo.'
          }
        >
          {enoughTeams && !needsGroups && played.length === 0 && (
            <button onClick={() => setMode('fixtures')} className="btn-solid btn-sm">
              <Shuffle className="h-4 w-4" />
              {matches.length > 0 ? 'Hacer un nuevo sorteo' : 'Sortear enfrentamientos'}
            </button>
          )}
        </InfoCard>

        {matches.length > 0 && (
          <InfoCard title="Calendario actual" text={`${matches.length} partidos programados. ${played.length} ya empezaron o terminaron.`}>
            <button onClick={() => setTab('calendario')} className="btn-outline btn-sm">
              Ver calendario
            </button>
            {played.length === 0 && (
              <button onClick={() => setClearing(true)} className="btn-ghost btn-sm">
                <Trash2 className="h-4 w-4" />
                Eliminar calendario
              </button>
            )}
          </InfoCard>
        )}
      </div>

      <div className="mt-4">
        <ErrorList errors={errors} />
      </div>

      <ConfirmDialog
        open={clearing}
        onClose={() => setClearing(false)}
        onConfirm={clearCalendar}
        busy={busy}
        title="Eliminar calendario"
        confirmLabel="Eliminar"
        message={`Se borrarán los ${matches.length} partidos del calendario. Los equipos y jugadores no se tocan.`}
      />
    </>
  )
}

function usesGroupsAndPlayoffs(t) {
  return t.format.type === 'groups_playoffs'
}
