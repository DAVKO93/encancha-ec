import { Clock, MapPin, Pencil } from 'lucide-react'
import TeamBadge from './TeamBadge'
import { STATUS_LABEL, formatDay, groupByDay, todayStr } from '../utils/schedule'

function TeamSide({ team, align }) {
  const right = align === 'right'
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <TeamBadge item={team} size={34} />
      <span className="min-w-0 truncate text-[14px] font-semibold tracking-tight">{team?.name || 'Equipo eliminado'}</span>
    </div>
  )
}

// Una fila de partido: hora, equipos, marcador (si ya se jugó) y detalles.
export function MatchRow({ match, teamsById, groupsById, onEdit, action }) {
  const home = teamsById.get(match.homeId)
  const away = teamsById.get(match.awayId)
  const started = match.status === 'live' || match.status === 'finished'
  const group = match.groupId ? groupsById.get(match.groupId) : null
  const details = [match.roundLabel, group?.name].filter(Boolean).join(' · ')

  return (
    <li className="px-4 py-3.5">
      <div className="flex items-center gap-2 text-[12px] text-mute">
        {match.time && (
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Clock className="h-3.5 w-3.5" />
            {match.time}
          </span>
        )}
        {details && <span className="min-w-0 truncate">{details}</span>}
        <span className="ml-auto shrink-0">
          {match.status !== 'scheduled' && (
            <span className="rounded-full border border-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label text-ink">
              {STATUS_LABEL[match.status]}
            </span>
          )}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <TeamSide team={home} />
        <span className="shrink-0 px-1 text-center text-[15px] font-semibold tabular-nums">
          {started ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}` : 'vs'}
        </span>
        <TeamSide team={away} align="right" />
      </div>

      {(match.court || onEdit || action) && (
        <div className="mt-2.5 flex items-center gap-3">
          {match.court && (
            <span className="inline-flex items-center gap-1 text-[12px] text-mute">
              <MapPin className="h-3.5 w-3.5" />
              {match.court}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {action}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(match)}
                className="btn-outline btn-sm"
                aria-label="Editar partido"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </button>
            )}
          </span>
        </div>
      )}
    </li>
  )
}

// Lista de partidos agrupada por día.
export default function ScheduleList({ matches, teams, groups, onEdit }) {
  const teamsById = new Map(teams.map((t) => [t.id, t]))
  const groupsById = new Map(groups.map((g) => [g.id, g]))
  const today = todayStr()
  const days = groupByDay(matches)

  return (
    <div className="space-y-7">
      {days.map((d) => (
        <section key={d.date || 'sin-fecha'}>
          <h3 className="eyebrow mb-2 first-letter:uppercase">
            {d.date ? formatDay(d.date) : 'Sin fecha asignada'}
            {d.date === today && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-paper">Hoy</span>}
          </h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {d.matches.map((m) => (
              <MatchRow key={m.id} match={m} teamsById={teamsById} groupsById={groupsById} onEdit={onEdit} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
