import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Copy, Pencil, Plus, Trash2, Trophy } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTournaments } from '../../context/TournamentContext'
import { friendlyError } from '../../utils/authErrors'
import { DUPLICATE_LEVELS, deleteTournamentCascade, duplicateTournament } from '../../utils/db'
import { formatRange } from '../../utils/format'
import { FORMATS, SPORTS } from '../../utils/sports'
import Modal, { ConfirmDialog } from '../../components/Modal'
import TeamBadge from '../../components/TeamBadge'
import { Spinner } from '../../components/Loader'
import { EmptyState, ErrorList, Field } from '../../components/ui'

function DuplicateModal({ source, onClose }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { setActiveId } = useTournaments()
  const [name, setName] = useState(`${source.name} (copia)`)
  const [level, setLevel] = useState('estructura')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])

  const run = async () => {
    if (name.trim().length < 3) {
      setErrors(['Escribe el nombre del nuevo campeonato (mínimo 3 letras).'])
      return
    }
    setBusy(true)
    setErrors([])
    try {
      const newId = await duplicateTournament({
        source,
        name: name.trim(),
        level,
        ownerId: user.uid,
        ownerName: profile?.name || user.displayName || ''
      })
      setActiveId(newId)
      navigate(`/admin/crear/${newId}`)
    } catch (err) {
      console.error(err)
      setErrors([friendlyError(err)])
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      title="Duplicar campeonato"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-outline btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={run} disabled={busy} className="btn-solid btn-sm">
            {busy ? <Spinner className="h-4 w-4" /> : 'Crear copia'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-mute">
          Crea un campeonato nuevo a partir de <strong className="text-ink">{source.name}</strong>. Los partidos y
          resultados no se copian, y las fechas quedan en blanco.
        </p>
        <Field label="Nombre del nuevo campeonato" htmlFor="dup-name">
          <input id="dup-name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </Field>
        <fieldset>
          <legend className="label">Qué copiar</legend>
          <div className="space-y-2">
            {DUPLICATE_LEVELS.map((l) => (
              <label
                key={l.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                  level === l.id ? 'border-ink bg-neutral-50' : 'border-line hover:border-ink'
                }`}
              >
                <input
                  type="radio"
                  name="dup-level"
                  checked={level === l.id}
                  onChange={() => setLevel(l.id)}
                  className="mt-1 h-4 w-4 accent-black"
                />
                <span>
                  <span className="block text-[14px] font-semibold">{l.label}</span>
                  <span className="mt-0.5 block text-[12px] text-mute">{l.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <ErrorList errors={errors} />
      </div>
    </Modal>
  )
}

export default function Championships() {
  const navigate = useNavigate()
  const { tournaments, tournamentsReady, activeId, setActiveId, error } = useTournaments()
  const [duplicating, setDuplicating] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const confirmDelete = async () => {
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await deleteTournamentCascade(deleting.id)
      setDeleting(null)
    } catch (err) {
      console.error(err)
      setDeleteError(friendlyError(err))
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Campeonatos</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Mis campeonatos</h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">
            Crea un campeonato, configura sus reglas y registra sus grupos, equipos y jugadores.
          </p>
        </div>
        <Link to="/admin/crear/nuevo" className="btn-solid">
          <Plus className="h-4 w-4" />
          Nuevo campeonato
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-6 border-l-2 border-ink pl-3 text-sm">
          {error}
        </p>
      )}

      <div className="mt-10">
        {!tournamentsReady ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : tournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Aún no tienes campeonatos"
            text="Crea el primero: elige el deporte, ajusta las reglas y registra tus equipos."
          >
            <Link to="/admin/crear/nuevo" className="btn-solid">
              <Plus className="h-4 w-4" />
              Crear campeonato
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {tournaments.map((t) => {
              const isActive = t.id === activeId
              const range = formatRange(t.startDate, t.endDate)
              return (
                <li key={t.id} className={`card p-5 ${isActive ? 'border-ink' : ''}`}>
                  <div className="flex items-start gap-4">
                    <TeamBadge item={t} size={56} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="[overflow-wrap:anywhere] text-[18px] font-semibold tracking-tight">{t.name}</p>
                        {isActive && (
                          <span className="rounded-full border border-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label text-accent">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-mute">
                        {SPORTS[t.sport]?.label || 'Deporte'} · {FORMATS[t.format.type]?.label}
                      </p>
                      {(t.venue || range) && (
                        <p className="mt-0.5 text-[12px] text-mute">{[t.venue, range].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveId(t.id)
                        navigate(`/admin/crear/${t.id}`)
                      }}
                      className="btn-solid btn-sm"
                    >
                      Abrir
                    </button>
                    <Link to={`/admin/crear/${t.id}/editar`} className="btn-outline btn-sm">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Link>
                    <button onClick={() => setDuplicating(t)} className="btn-outline btn-sm">
                      <Copy className="h-3.5 w-3.5" />
                      Duplicar
                    </button>
                    <button
                      onClick={() => {
                        setDeleteError('')
                        setDeleting(t)
                      }}
                      className="btn-ghost btn-sm ml-auto"
                      aria-label={`Eliminar ${t.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {duplicating && <DuplicateModal source={duplicating} onClose={() => setDuplicating(null)} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        busy={deleteBusy}
        title="Eliminar campeonato"
        confirmLabel="Eliminar definitivamente"
        message={
          <>
            Se eliminará <strong className="text-ink">{deleting?.name}</strong> con todos sus grupos, equipos,
            jugadores y partidos. Esta acción no se puede deshacer.
            {deleteError && <span className="mt-3 block border-l-2 border-ink pl-3 text-ink">{deleteError}</span>}
          </>
        }
      />
    </>
  )
}
