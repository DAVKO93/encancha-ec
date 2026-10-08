import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteDoc, doc } from 'firebase/firestore'
import { ArrowLeft, ListPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { db } from '../../firebase'
import { useTournaments } from '../../context/TournamentContext'
import { friendlyError } from '../../utils/authErrors'
import { inChunks, saveFast } from '../../utils/db'
import { usesGroups } from '../../utils/sports'
import { ConfirmDialog } from '../../components/Modal'
import { BulkPlayersModal, PlayerFormModal } from '../../components/PlayerModals'
import TeamBadge from '../../components/TeamBadge'
import TeamFormModal from '../../components/TeamFormModal'
import { Spinner } from '../../components/Loader'
import { EmptyState } from '../../components/ui'

// Detalle de un equipo: sus datos y su lista de jugadores.
export default function TeamDetail() {
  const { teamId } = useParams()
  const navigate = useNavigate()
  const { tournamentsReady, active, groups, teams, players, dataReady, matches } = useTournaments()

  const [editingTeam, setEditingTeam] = useState(false)
  const [playerModal, setPlayerModal] = useState(null) // null | { player? }
  const [bulk, setBulk] = useState(false)
  const [deletingTeam, setDeletingTeam] = useState(false)
  const [deletingPlayer, setDeletingPlayer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [grace, setGrace] = useState(true)

  const team = teams.find((t) => t.id === teamId)
  const roster = useMemo(() => players.filter((p) => p.teamId === teamId), [players, teamId])

  // Un equipo recién creado puede tardar un instante en aparecer: damos un margen antes de decir "no existe".
  useEffect(() => {
    const timer = setTimeout(() => setGrace(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (!tournamentsReady || !active || !dataReady || (!team && grace)) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  if (!team) {
    return (
      <EmptyState title="No encontramos ese equipo" text="Puede que se haya eliminado o que pertenezca a otro campeonato.">
        <Link to="/admin/equipos" className="btn-solid">
          Volver a los equipos
        </Link>
      </EmptyState>
    )
  }

  const { roster: rosterRules } = active.rules
  const group = groups.find((g) => g.id === team.groupId)
  const full = roster.length >= rosterRules.maxPlayers

  const removePlayer = async () => {
    setBusy(true)
    setError('')
    try {
      await saveFast(deleteDoc(doc(db, 'tournaments', active.id, 'players', deletingPlayer.id)))
      setDeletingPlayer(null)
    } catch (err) {
      console.error(err)
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const removeTeam = async () => {
    setBusy(true)
    setError('')
    try {
      if (matches.some((m) => m.homeId === team.id || m.awayId === team.id)) {
        setError('Este equipo tiene partidos en el calendario. Elimina esos partidos o haz un nuevo sorteo antes de borrarlo.')
        setDeletingTeam(false)
        setBusy(false)
        return
      }
      await inChunks(roster, (p) => saveFast(deleteDoc(doc(db, 'tournaments', active.id, 'players', p.id)), 4000))
      await saveFast(deleteDoc(doc(db, 'tournaments', active.id, 'teams', team.id)))
      navigate('/admin/equipos', { replace: true })
    } catch (err) {
      console.error(err)
      setError(friendlyError(err))
      setBusy(false)
    }
  }

  return (
    <>
      <Link to="/admin/equipos" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Lista de equipos
      </Link>

      <div className="flex items-start gap-4">
        <TeamBadge item={team} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">{team.name}</h1>
          <p className="mt-1 text-[13px] text-mute">
            {usesGroups(active.format.type) ? (group ? group.name : 'Sin grupo') : active.name}
            {team.coach ? ` · DT ${team.coach}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => setEditingTeam(true)} className="btn-outline btn-sm">
              <Pencil className="h-3.5 w-3.5" />
              Editar equipo
            </button>
            <button onClick={() => setDeletingTeam(true)} className="btn-ghost btn-sm">
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 border-l-2 border-ink pl-3 text-sm">
          {error}
        </p>
      )}

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Jugadores</h2>
            <p className="mt-1 text-[13px] text-mute">
              {roster.length} de {rosterRules.maxPlayers} inscritos · mínimo {rosterRules.minPlayers} para jugar
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setBulk(true)} disabled={full} className="btn-outline btn-sm">
              <ListPlus className="h-4 w-4" />
              Varios
            </button>
            <button onClick={() => setPlayerModal({})} disabled={full} className="btn-solid btn-sm">
              <Plus className="h-4 w-4" />
              Jugador
            </button>
          </div>
        </div>

        {roster.length < rosterRules.minPlayers && roster.length > 0 && (
          <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-mute">
            Faltan {rosterRules.minPlayers - roster.length} jugadores para llegar al mínimo.
          </p>
        )}
        {full && (
          <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-mute">
            El equipo alcanzó el máximo. Puedes cambiarlo en las reglas del campeonato.
          </p>
        )}

        <div className="mt-5">
          {roster.length === 0 ? (
            <EmptyState title="Sin jugadores todavía" text="Agrégalos uno por uno o pega la lista completa del equipo.">
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => setPlayerModal({})} className="btn-solid">
                  <Plus className="h-4 w-4" />
                  Agregar jugador
                </button>
                <button onClick={() => setBulk(true)} className="btn-outline">
                  <ListPlus className="h-4 w-4" />
                  Pegar lista
                </button>
              </div>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {roster.map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink text-[15px] font-semibold tabular-nums"
                    aria-label={`Número ${p.number}`}
                  >
                    {p.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{p.name}</p>
                    {p.position && <p className="text-[12px] text-mute">{p.position}</p>}
                  </div>
                  <button
                    onClick={() => setPlayerModal({ player: p })}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100"
                    aria-label={`Editar a ${p.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingPlayer(p)}
                    className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100"
                    aria-label={`Eliminar a ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <TeamFormModal
        open={editingTeam}
        onClose={() => setEditingTeam(false)}
        tournament={active}
        groups={groups}
        teams={teams}
        team={team}
      />
      <PlayerFormModal
        open={Boolean(playerModal)}
        onClose={() => setPlayerModal(null)}
        tournamentId={active.id}
        teamId={team.id}
        players={roster}
        positions={rosterRules.positions}
        maxPlayers={rosterRules.maxPlayers}
        player={playerModal?.player}
      />
      <BulkPlayersModal
        open={bulk}
        onClose={() => setBulk(false)}
        tournamentId={active.id}
        teamId={team.id}
        players={roster}
        maxPlayers={rosterRules.maxPlayers}
        positions={rosterRules.positions}
      />
      <ConfirmDialog
        open={Boolean(deletingPlayer)}
        onClose={() => setDeletingPlayer(null)}
        onConfirm={removePlayer}
        busy={busy}
        title="Eliminar jugador"
        confirmLabel="Eliminar"
        message={`Se quitará a ${deletingPlayer?.name} (n.º ${deletingPlayer?.number}) del equipo.`}
      />
      <ConfirmDialog
        open={deletingTeam}
        onClose={() => setDeletingTeam(false)}
        onConfirm={removeTeam}
        busy={busy}
        title="Eliminar equipo"
        confirmLabel="Eliminar equipo"
        message={`Se eliminará ${team.name} junto con sus ${roster.length} jugadores. Esta acción no se puede deshacer.`}
      />
    </>
  )
}
