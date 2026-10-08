import { Link } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import { useTournaments } from '../../context/TournamentContext'
import { MatchRow } from '../../components/ScheduleList'
import FullScreenLoader from '../../components/Loader'
import { EmptyState } from '../../components/ui'
import { formatDay, formatDayShort, todayStr } from '../../utils/schedule'

// Partidos programados para hoy, los pendientes de días anteriores y los próximos.
export default function Today() {
  const { tournamentsReady, active: t, teams, groups, matches, dataReady } = useTournaments()

  if (!tournamentsReady) return <FullScreenLoader />

  const head = (
    <>
      <p className="eyebrow">{t ? t.name : 'Calendario'}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Encuentros de hoy</h1>
    </>
  )

  if (!t) {
    return (
      <>
        {head}
        <div className="mt-10">
          <EmptyState icon={CalendarCheck} title="Primero crea un campeonato" text="Aquí aparecerán los partidos que se juegan hoy.">
            <Link to="/admin/crear/nuevo" className="btn-solid">
              Crear campeonato
            </Link>
          </EmptyState>
        </div>
      </>
    )
  }
  if (!dataReady) return <FullScreenLoader />

  const today = todayStr()
  const teamsById = new Map(teams.map((tm) => [tm.id, tm]))
  const groupsById = new Map(groups.map((g) => [g.id, g]))
  const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')

  const todays = matches.filter((m) => m.date === today).sort(byTime)
  const late = matches.filter((m) => m.date && m.date < today && m.status === 'scheduled')
  const upcoming = matches.filter((m) => m.date > today && m.status === 'scheduled').slice(0, 5)

  const list = (items) => (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {items.map((m) => (
        <MatchRow
          key={m.id}
          match={m}
          teamsById={teamsById}
          groupsById={groupsById}
          action={
            m.status === 'finished' ? null : (
              <button type="button" disabled title="Se activa en la Etapa 4" className="btn-solid btn-sm">
                Pitar partido
              </button>
            )
          }
        />
      ))}
    </ul>
  )

  return (
    <>
      {head}
      <p className="mt-3 text-[15px] capitalize text-mute">{formatDay(today)}</p>

      <div className="mt-8">
        {matches.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Todavía no hay calendario" text="Haz el sorteo para generar los partidos del campeonato.">
            <Link to="/admin/sorteo" className="btn-solid">
              Ir al sorteo
            </Link>
          </EmptyState>
        ) : todays.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Hoy no hay partidos" text="Mira abajo cuándo juegan los próximos.">
            <Link to="/admin/sorteo?tab=calendario" className="btn-outline">
              Ver calendario
            </Link>
          </EmptyState>
        ) : (
          list(todays)
        )}
      </div>

      {late.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Pendientes de días anteriores</h2>
          {list(late)}
          <p className="mt-2 text-[12px] text-mute">Si ya no se jugarán ese día, cambia su fecha desde el calendario.</p>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow mb-3">Próximos partidos</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {upcoming.map((m) => (
              <li key={m.id}>
                <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-label text-mute">{formatDayShort(m.date)}</p>
                <ul>
                  <MatchRow match={m} teamsById={teamsById} groupsById={groupsById} />
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {todays.length > 0 && (
        <p className="mt-8 text-[13px] text-mute">El pitado en vivo (cronómetro, goles y tarjetas) llega en la Etapa 4.</p>
      )}
    </>
  )
}
