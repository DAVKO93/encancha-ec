import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListOrdered, Trophy } from 'lucide-react'
import { useTournaments } from '../../context/TournamentContext'
import { friendlyError } from '../../utils/authErrors'
import { createMatches } from '../../utils/db'
import { nextKnockoutStep } from '../../utils/bracket'
import { computeAllStandings } from '../../utils/standings'
import { MatchRow } from '../../components/ScheduleList'
import PdfButton from '../../components/PdfButton'
import StandingsTable from '../../components/StandingsTable'
import TeamBadge from '../../components/TeamBadge'
import FullScreenLoader, { Spinner } from '../../components/Loader'
import { EmptyState, ErrorList } from '../../components/ui'

// Fase final: llaves de eliminación directa, ronda por ronda.
export function KnockoutSection({ t, groups, teams, matches, editable }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const step = useMemo(() => nextKnockoutStep({ tournament: t, groups, teams, matches }), [t, groups, teams, matches])
  if (step.state === 'none') return null

  const teamsById = new Map(teams.map((tm) => [tm.id, tm]))
  const groupsById = new Map(groups.map((g) => [g.id, g]))
  const ko = matches.filter((m) => m.stage === 'knockout')
  const rounds = [...new Set(ko.map((m) => `${m.round || 1}|${m.roundLabel || ''}`))].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10) || (a.includes('Tercer') ? 1 : 0) - (b.includes('Tercer') ? 1 : 0)
  )

  const generate = async () => {
    setBusy(true)
    setError('')
    try {
      await createMatches(t.id, step.matches)
    } catch (err) {
      console.error(err)
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const champion = step.state === 'champion' ? teamsById.get(step.championId) : null
  if (!editable && ko.length === 0) return null

  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold tracking-tight">Fase final</h2>

      {champion && (
        <div className="card mt-5 flex items-center gap-4 p-5">
          <TeamBadge item={champion} size={56} />
          <div className="min-w-0">
            <p className="eyebrow flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              Campeón
            </p>
            <p className="mt-1 text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">{champion.name}</p>
          </div>
        </div>
      )}

      {step.state === 'not-ready' && (
        <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-mute">
          {t.format.type === 'knockout'
            ? 'Haz el sorteo de enfrentamientos para generar la primera ronda.'
            : 'Cuando terminen todos los partidos de la fase de grupos podrás generar las llaves.'}
        </p>
      )}
      {step.state === 'pending' && editable && (
        <p className="mt-4 text-sm text-mute">Termina todos los partidos de la ronda actual para generar la siguiente.</p>
      )}

      {step.state === 'ready' && editable && (
        <div className="card mt-5 p-5">
          <p className="text-[15px] font-semibold tracking-tight">Todo listo para la siguiente ronda: {step.roundLabel}</p>
          <ul className="mt-3 space-y-1 text-[14px] text-mute">
            {step.matches.map((m, i) => (
              <li key={i}>
                {teamsById.get(m.homeId)?.name} vs {teamsById.get(m.awayId)?.name}
                {m.third ? ' (tercer puesto)' : ''}
              </li>
            ))}
            {step.byes?.length > 0 && <li>Pasan directo: {step.byes.map((id) => teamsById.get(id)?.name).join(', ')}</li>}
          </ul>
          <button onClick={generate} disabled={busy} className="btn-solid mt-5">
            {busy ? <Spinner className="h-4 w-4" /> : `Generar ${step.roundLabel}`}
          </button>
          <p className="mt-3 text-[12px] text-mute">Los partidos se crean sin fecha: asígnales día y hora desde el calendario.</p>
        </div>
      )}
      <div className="mt-3">
        <ErrorList errors={error ? [error] : []} />
      </div>

      {rounds.map((key) => {
        const list = ko.filter((m) => `${m.round || 1}|${m.roundLabel || ''}` === key)
        return (
          <div key={key} className="mt-8">
            <h3 className="eyebrow mb-2">{list[0]?.roundLabel || `Ronda ${parseInt(key, 10)}`}</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {list.map((m) => (
                <MatchRow key={m.id} match={m} teamsById={teamsById} groupsById={groupsById} />
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

export default function Standings() {
  const { tournamentsReady, active: t, groups, teams, matches, dataReady } = useTournaments()

  const tables = useMemo(
    () => (t && dataReady ? computeAllStandings({ tournament: t, groups, teams, matches }) : []),
    [t, groups, teams, matches, dataReady]
  )

  if (!tournamentsReady) return <FullScreenLoader />
  const head = (
    <>
      <p className="eyebrow">{t ? t.name : 'Posiciones'}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Clasificación</h1>
    </>
  )
  if (!t) {
    return (
      <>
        {head}
        <div className="mt-10">
          <EmptyState icon={ListOrdered} title="Primero crea un campeonato" text="La tabla se calcula con los resultados de sus partidos.">
            <Link to="/admin/crear/nuevo" className="btn-solid">
              Crear campeonato
            </Link>
          </EmptyState>
        </div>
      </>
    )
  }
  if (!dataReady) return <FullScreenLoader />

  const q = t.format.type === 'groups_playoffs' ? t.format.qualifiersPerGroup : 0
  const played = matches.filter((m) => m.status === 'finished').length

  return (
    <>
      {head}
      <p className="mt-3 text-[15px] text-mute">
        {played} {played === 1 ? 'partido jugado' : 'partidos jugados'} de {matches.length}.
      </p>
      <div className="mt-5">
        <PdfButton label="Exportar PDF" make={(pdf) => pdf.exportStandings({ tournament: t, groups, teams, matches })} />
      </div>

      <div className="mt-8 space-y-8">
        {tables.length === 0 && t.format.type !== 'knockout' && (
          <EmptyState title="Sin equipos todavía" text="Agrega equipos y juega partidos para ver la tabla." />
        )}
        {tables.map((tb) => (
          <StandingsTable key={tb.id} title={tb.name} rows={tb.rows} rules={t.rules} qualifiers={q} />
        ))}
      </div>

      <KnockoutSection t={t} groups={groups} teams={teams} matches={matches} editable />
    </>
  )
}
