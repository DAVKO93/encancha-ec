import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Trophy, Users } from 'lucide-react'
import { useTournaments } from '../../context/TournamentContext'
import { norm } from '../../utils/format'
import { SPORTS } from '../../utils/sports'
import TeamBadge from '../../components/TeamBadge'
import TeamFormModal from '../../components/TeamFormModal'
import TeamsByGroup from '../../components/TeamsByGroup'
import { Spinner } from '../../components/Loader'
import { EmptyState } from '../../components/ui'
import { useNavigate } from 'react-router-dom'

// Sección "Equipos" de la barra inferior: equipos del campeonato activo.
export default function TeamsList() {
  const navigate = useNavigate()
  const { tournamentsReady, active, groups, teams, players, dataReady } = useTournaments()
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)

  const filtered = useMemo(() => {
    const q = norm(search)
    if (!q) return teams
    const byTeam = new Map()
    players.forEach((p) => {
      if (norm(p.name).includes(q)) byTeam.set(p.teamId, true)
    })
    return teams.filter((t) => norm(t.name).includes(q) || byTeam.has(t.id))
  }, [search, teams, players])

  if (!tournamentsReady || (active && !dataReady)) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  if (!active) {
    return (
      <>
        <p className="eyebrow">Plantillas</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Lista de equipos</h1>
        <div className="mt-10">
          <EmptyState icon={Trophy} title="Primero crea un campeonato" text="Los equipos se registran dentro de un campeonato.">
            <Link to="/admin/crear/nuevo" className="btn-solid">
              <Plus className="h-4 w-4" />
              Crear campeonato
            </Link>
          </EmptyState>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="eyebrow">Plantillas</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Lista de equipos</h1>

      <Link
        to={`/admin/crear/${active.id}`}
        className="mt-5 flex items-center gap-3 rounded-2xl border border-line p-3 transition hover:border-ink"
      >
        <TeamBadge item={active} size={36} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{active.name}</span>
          <span className="block text-[12px] text-mute">{SPORTS[active.sport]?.label} · Cambiar de campeonato</span>
        </span>
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input
            className="input pl-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipo o jugador"
            aria-label="Buscar equipo o jugador"
          />
        </div>
        <button onClick={() => setAdding(true)} className="btn-solid shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar equipo</span>
          <span className="sm:hidden">Equipo</span>
        </button>
      </div>

      <div className="mt-8">
        {teams.length === 0 ? (
          <EmptyState icon={Users} title="Aún no hay equipos" text="Agrega los equipos de este campeonato y luego sus jugadores.">
            <button onClick={() => setAdding(true)} className="btn-solid">
              <Plus className="h-4 w-4" />
              Agregar equipo
            </button>
          </EmptyState>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-mute">
            No hay resultados para “{search}”.
          </p>
        ) : (
          <TeamsByGroup
            tournament={active}
            groups={groups}
            teams={filtered}
            players={players}
            linkFor={(team) => `/admin/equipos/${team.id}`}
          />
        )}
      </div>

      <TeamFormModal
        open={adding}
        onClose={() => setAdding(false)}
        tournament={active}
        groups={groups}
        teams={teams}
        onSaved={(teamId) => navigate(`/admin/equipos/${teamId}`)}
      />
    </>
  )
}
