import { Link } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useTournaments } from '../../context/TournamentContext'
import { MatchRow } from '../../components/ScheduleList'
import PdfButton from '../../components/PdfButton'
import FullScreenLoader from '../../components/Loader'
import { EmptyState } from '../../components/ui'
import { compareMatches, formatDay } from '../../utils/schedule'

export default function Results() {
  const { tournamentsReady, active: t, groups, teams, players, matches, dataReady } = useTournaments()
  if (!tournamentsReady) return <FullScreenLoader />

  const head = (
    <>
      <p className="eyebrow">{t ? t.name : 'Historial'}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Lista de resultados</h1>
    </>
  )
  if (!t) {
    return (
      <>
        {head}
        <div className="mt-10">
          <EmptyState icon={ClipboardList} title="Primero crea un campeonato" text="Aquí verás todos los partidos jugados.">
            <Link to="/admin/crear/nuevo" className="btn-solid">
              Crear campeonato
            </Link>
          </EmptyState>
        </div>
      </>
    )
  }
  if (!dataReady) return <FullScreenLoader />

  const played = matches.filter((m) => m.status === 'finished' || m.status === 'live').sort((a, b) => compareMatches(b, a))
  const teamsById = new Map(teams.map((tm) => [tm.id, tm]))
  const groupsById = new Map(groups.map((g) => [g.id, g]))
  const ctx = { tournament: t, groups, teams, players, matches }

  return (
    <>
      {head}
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">
        Todos los partidos jugados, del más reciente al más antiguo. Cada uno se puede exportar como informe en PDF.
      </p>
      {played.length > 0 && (
        <div className="mt-5">
          <PdfButton label="Exportar todos los resultados" make={(pdf) => pdf.exportResults(ctx)} />
        </div>
      )}

      <div className="mt-8">
        {played.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Todavía no hay resultados" text="Aparecerán aquí cuando termines de pitar el primer partido.">
            <Link to="/admin/hoy" className="btn-outline">
              Ir a los encuentros
            </Link>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {played.map((m) => (
              <li key={m.id}>
                <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-label text-mute first-letter:uppercase">
                  {m.date ? formatDay(m.date) : 'Sin fecha'}
                </p>
                <ul>
                  <MatchRow
                    match={m}
                    teamsById={teamsById}
                    groupsById={groupsById}
                    action={
                      <>
                        <Link to={`/admin/hoy/${m.id}`} className="btn-ghost btn-sm">
                          Ver
                        </Link>
                        {m.status === 'finished' && (
                          <PdfButton label="Informe PDF" make={(pdf) => pdf.exportMatchReport({ ...ctx, match: m })} />
                        )}
                      </>
                    }
                  />
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
