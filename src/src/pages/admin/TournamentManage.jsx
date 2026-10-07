import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { db } from '../../firebase'
import { useTournaments } from '../../context/TournamentContext'
import { friendlyError } from '../../utils/authErrors'
import { inChunks, saveFast } from '../../utils/db'
import { formatRange } from '../../utils/format'
import { FORMATS, SPORTS, usesGroups } from '../../utils/sports'
import GroupModal from '../../components/GroupModal'
import { ConfirmDialog } from '../../components/Modal'
import TeamBadge from '../../components/TeamBadge'
import TeamFormModal from '../../components/TeamFormModal'
import TeamsByGroup from '../../components/TeamsByGroup'
import FullScreenLoader from '../../components/Loader'
import { EmptyState } from '../../components/ui'

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-label text-mute">{label}</p>
    </div>
  )
}

// Panel de un campeonato: resumen, grupos y equipos.
export default function TournamentManage() {
  const { id } = useParams()
  const { tournaments, tournamentsReady, active, setActiveId, groups, teams, players, dataReady } = useTournaments()

  const [groupModal, setGroupModal] = useState(null) // null | { group? }
  const [teamModal, setTeamModal] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (id) setActiveId(id)
  }, [id, setActiveId])

  if (!tournamentsReady) return <FullScreenLoader />
  if (!tournaments.some((t) => t.id === id)) {
    return (
      <EmptyState title="No encontramos ese campeonato" text="Puede que se haya eliminado.">
        <Link to="/admin/crear" className="btn-solid">
          Volver a mis campeonatos
        </Link>
      </EmptyState>
    )
  }
  if (!active || active.id !== id || !dataReady) return <FullScreenLoader />

  const t = active
  const hasGroups = usesGroups(t.format.type)
  const range = formatRange(t.startDate, t.endDate)

  const removeGroup = async () => {
    setBusy(true)
    setError('')
    try {
      const members = teams.filter((tm) => tm.groupId === deletingGroup.id)
      await inChunks(members, (tm) => saveFast(updateDoc(doc(db, 'tournaments', t.id, 'teams', tm.id), { groupId: '' }), 4000))
      await saveFast(deleteDoc(doc(db, 'tournaments', t.id, 'groups', deletingGroup.id)))
      setDeletingGroup(null)
    } catch (err) {
      console.error(err)
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Link to="/admin/crear" className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Mis campeonatos
      </Link>

      <div className="flex items-start gap-4">
        <TeamBadge item={t} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">{t.name}</h1>
          <p className="mt-1 text-[13px] text-mute">
            {SPORTS[t.sport]?.label} · {FORMATS[t.format.type]?.label}
          </p>
          {(t.venue || range) && <p className="mt-0.5 text-[12px] text-mute">{[t.venue, range].filter(Boolean).join(' · ')}</p>}
        </div>
        <Link to={`/admin/crear/${t.id}/editar`} className="btn-outline btn-sm shrink-0">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
      </div>

      {t.description && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mute">{t.description}</p>}

      <div className={`mt-8 grid gap-3 ${hasGroups ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {hasGroups && <Stat value={groups.length} label="Grupos" />}
        <Stat value={teams.length} label="Equipos" />
        <Stat value={players.length} label="Jugadores" />
      </div>

      {error && (
        <p role="alert" className="mt-6 border-l-2 border-ink pl-3 text-sm">
          {error}
        </p>
      )}

      {hasGroups && (
        <section className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Grupos</h2>
            <button onClick={() => setGroupModal({})} className="btn-outline btn-sm">
              <Plus className="h-4 w-4" />
              Agregar grupo
            </button>
          </div>
          {groups.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-mute">
              Todavía no hay grupos. Agrega el primero para poder asignar equipos.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {groups.map((g) => {
                const count = teams.filter((tm) => tm.groupId === g.id).length
                return (
                  <li key={g.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold tracking-tight">{g.name}</p>
                      <p className="text-[12px] text-mute">
                        {count} {count === 1 ? 'equipo' : 'equipos'}
                      </p>
                    </div>
                    <button
                      onClick={() => setGroupModal({ group: g })}
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100"
                      aria-label={`Renombrar ${g.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingGroup(g)}
                      className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100"
                      aria-label={`Eliminar ${g.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Equipos</h2>
          <button onClick={() => setTeamModal(true)} className="btn-solid btn-sm">
            <UserPlus className="h-4 w-4" />
            Agregar equipo
          </button>
        </div>
        {teams.length === 0 ? (
          <EmptyState
            title="Aún no hay equipos"
            text="Agrega los equipos y luego registra a sus jugadores."
          >
            <button onClick={() => setTeamModal(true)} className="btn-solid">
              <Plus className="h-4 w-4" />
              Agregar equipo
            </button>
          </EmptyState>
        ) : (
          <TeamsByGroup
            tournament={t}
            groups={groups}
            teams={teams}
            players={players}
            linkFor={(team) => `/admin/equipos/${team.id}`}
          />
        )}
      </section>

      <GroupModal
        open={Boolean(groupModal)}
        onClose={() => setGroupModal(null)}
        tournamentId={t.id}
        groups={groups}
        group={groupModal?.group}
      />
      <TeamFormModal
        open={teamModal}
        onClose={() => setTeamModal(false)}
        tournament={t}
        groups={groups}
        teams={teams}
      />
      <ConfirmDialog
        open={Boolean(deletingGroup)}
        onClose={() => setDeletingGroup(null)}
        onConfirm={removeGroup}
        busy={busy}
        title="Eliminar grupo"
        confirmLabel="Eliminar grupo"
        message={`Se eliminará ${deletingGroup?.name}. Sus equipos no se borran: quedarán "sin grupo" para que los asignes a otro.`}
      />
    </>
  )
}
