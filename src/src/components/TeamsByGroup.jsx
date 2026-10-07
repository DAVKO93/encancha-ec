import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import TeamBadge from './TeamBadge'
import { usesGroups } from '../utils/sports'

function TeamRow({ team, count, to }) {
  const content = (
    <>
      <TeamBadge item={team} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-tight">{team.name}</p>
        <p className="text-[12px] text-mute">
          {count} {count === 1 ? 'jugador' : 'jugadores'}
          {team.coach ? ` · DT ${team.coach}` : ''}
        </p>
      </div>
      {to && <ChevronRight className="h-4 w-4 shrink-0 text-mute" />}
    </>
  )
  const cls = 'flex items-center gap-4 px-4 py-3.5'
  return to ? (
    <Link to={to} className={`${cls} transition hover:bg-neutral-50`}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  )
}

function Block({ title, subtitle, teams, counts, linkFor }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="eyebrow">{title}</h3>
        {subtitle && <span className="text-[12px] text-mute">{subtitle}</span>}
      </div>
      {teams.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-mute">
          Todavía no hay equipos aquí.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {teams.map((t) => (
            <li key={t.id}>
              <TeamRow team={t} count={counts[t.id] || 0} to={linkFor?.(t)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Lista de equipos agrupada según el formato del campeonato.
// linkFor: si se entrega, cada equipo es un enlace.
export default function TeamsByGroup({ tournament, groups, teams, players, linkFor }) {
  const counts = {}
  players.forEach((p) => {
    counts[p.teamId] = (counts[p.teamId] || 0) + 1
  })

  if (!usesGroups(tournament.format.type)) {
    return <Block title="Equipos" subtitle={`${teams.length}`} teams={teams} counts={counts} linkFor={linkFor} />
  }

  const groupIds = new Set(groups.map((g) => g.id))
  const loose = teams.filter((t) => !t.groupId || !groupIds.has(t.groupId))

  return (
    <div className="space-y-8">
      {groups.map((g) => {
        const list = teams.filter((t) => t.groupId === g.id)
        return (
          <Block
            key={g.id}
            title={g.name}
            subtitle={`${list.length} ${list.length === 1 ? 'equipo' : 'equipos'}`}
            teams={list}
            counts={counts}
            linkFor={linkFor}
          />
        )
      })}
      {loose.length > 0 && (
        <Block title="Sin grupo" subtitle={`${loose.length}`} teams={loose} counts={counts} linkFor={linkFor} />
      )}
    </div>
  )
}
