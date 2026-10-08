import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { ArrowLeft, CalendarDays, ChevronDown, MapPin } from 'lucide-react'
import { db } from '../firebase'
import { formatRange } from '../utils/format'
import { FORMATS, SPORTS, usesGroups, withDefaults } from '../utils/sports'
import Logo from '../components/Logo'
import TeamBadge from '../components/TeamBadge'
import ScheduleList from '../components/ScheduleList'
import { Spinner } from '../components/Loader'
import { EmptyState } from '../components/ui'

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'es')

function TeamCard({ team, roster }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition hover:bg-neutral-50"
      >
        <TeamBadge item={team} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-tight">{team.name}</span>
          <span className="block text-[12px] text-mute">
            {roster.length} {roster.length === 1 ? 'jugador' : 'jugadores'}
            {team.coach ? ` · DT ${team.coach}` : ''}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-mute transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-line bg-neutral-50 px-4 py-3">
          {roster.length === 0 ? (
            <p className="text-sm text-mute">Este equipo aún no tiene jugadores registrados.</p>
          ) : (
            <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {roster.map((p) => (
                <li key={p.id} className="flex items-center gap-3 text-[14px]">
                  <span className="w-6 text-right font-semibold tabular-nums">{p.number}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.position && <span className="text-[11px] text-mute">{p.position}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

// Vista pública de un campeonato: equipos y jugadores. El calendario y los resultados llegan en las próximas etapas.
export default function VisitorTournament() {
  const { id } = useParams()
  const [tournament, setTournament] = useState(undefined)
  const [groups, setGroups] = useState([])
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])

  useEffect(() => {
    setTournament(undefined)
    const mapDocs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    const unsubs = [
      onSnapshot(
        doc(db, 'tournaments', id),
        (snap) => setTournament(snap.exists() ? withDefaults({ id: snap.id, ...snap.data() }) : null),
        () => setTournament(null)
      ),
      onSnapshot(collection(db, 'tournaments', id, 'groups'), (s) => setGroups(mapDocs(s)), () => {}),
      onSnapshot(collection(db, 'tournaments', id, 'teams'), (s) => setTeams(mapDocs(s)), () => {}),
      onSnapshot(collection(db, 'tournaments', id, 'players'), (s) => setPlayers(mapDocs(s)), () => {}),
      onSnapshot(collection(db, 'tournaments', id, 'matches'), (s) => setMatches(mapDocs(s)), () => {})
    ]
    return () => unsubs.forEach((u) => u())
  }, [id])

  const sortedGroups = useMemo(() => [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || byName(a, b)), [groups])
  const sortedTeams = useMemo(() => [...teams].sort(byName), [teams])
  const rosterOf = (teamId) =>
    players.filter((p) => p.teamId === teamId).sort((a, b) => (a.number ?? 0) - (b.number ?? 0))

  const header = (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-9 w-auto" />
          <span className="text-[15px] font-semibold tracking-tight">Encancha.ec</span>
        </Link>
        <Link to="/visitante" className="btn-ghost btn-sm">
          <ArrowLeft className="h-4 w-4" />
          Torneos
        </Link>
      </div>
    </header>
  )

  if (tournament === undefined) {
    return (
      <div className="min-h-dvh">
        {header}
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      </div>
    )
  }

  if (tournament === null) {
    return (
      <div className="min-h-dvh">
        {header}
        <main className="mx-auto max-w-3xl px-5 py-10">
          <EmptyState title="No encontramos ese torneo" text="Puede que el administrador lo haya eliminado.">
            <Link to="/visitante" className="btn-solid">
              Ver todos los torneos
            </Link>
          </EmptyState>
        </main>
      </div>
    )
  }

  const t = tournament
  const range = formatRange(t.startDate, t.endDate)
  const groupIds = new Set(sortedGroups.map((g) => g.id))
  const loose = sortedTeams.filter((tm) => !tm.groupId || !groupIds.has(tm.groupId))

  const block = (title, list) => (
    <section key={title}>
      <h3 className="eyebrow mb-2">{title}</h3>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-mute">Sin equipos todavía.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {list.map((tm) => (
            <TeamCard key={tm.id} team={tm} roster={rosterOf(tm.id)} />
          ))}
        </ul>
      )}
    </section>
  )

  return (
    <div className="min-h-dvh">
      {header}
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="flex items-start gap-4">
          <TeamBadge item={t} size={72} />
          <div className="min-w-0">
            <p className="eyebrow">{SPORTS[t.sport]?.label}</p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight">{t.name}</h1>
            <p className="mt-1 text-[13px] text-mute">{FORMATS[t.format.type]?.label}</p>
          </div>
        </div>

        {(t.venue || range) && (
          <ul className="mt-5 space-y-1.5 text-[14px] text-mute">
            {t.venue && (
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t.venue}
              </li>
            )}
            {range && (
              <li className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {range}
              </li>
            )}
          </ul>
        )}
        {t.description && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mute">{t.description}</p>}

        <h2 className="mt-12 text-2xl font-semibold tracking-tight">Cronograma y resultados</h2>
        <div className="mt-5">
          {matches.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-mute">
              Estarán disponibles aquí cuando el administrador programe los partidos.
            </p>
          ) : (
            <ScheduleList matches={matches} teams={sortedTeams} groups={sortedGroups} />
          )}
        </div>

        <h2 className="mt-12 text-2xl font-semibold tracking-tight">Equipos</h2>
        <div className="mt-5 space-y-8">
          {sortedTeams.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-mute">
              Aún no hay equipos registrados.
            </p>
          ) : usesGroups(t.format.type) ? (
            <>
              {sortedGroups.map((g) =>
                block(
                  g.name,
                  sortedTeams.filter((tm) => tm.groupId === g.id)
                )
              )}
              {loose.length > 0 && block('Sin grupo', loose)}
            </>
          ) : (
            block('Equipos', sortedTeams)
          )}
        </div>
      </main>
    </div>
  )
}
