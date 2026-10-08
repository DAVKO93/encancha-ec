import { useEffect, useState } from 'react'
import Modal, { ConfirmDialog } from './Modal'
import { ErrorList, Field, Select } from './ui'
import { Spinner } from './Loader'
import { addMatch, deleteMatch, updateMatch } from '../utils/db'
import { friendlyError } from '../utils/authErrors'
import { usesGroups } from '../utils/sports'

// Crear o editar un partido a mano: fecha, hora, cancha y, si es nuevo, los equipos.
export default function MatchModal({ open, onClose, tournament, teams, groups, matches, match }) {
  const editing = Boolean(match)
  const locked = editing && match.status !== 'scheduled'
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors([])
    setConfirmDelete(false)
    setForm(
      match
        ? {
            homeId: match.homeId,
            awayId: match.awayId,
            date: match.date || '',
            time: match.time || '',
            court: match.court || '',
            roundLabel: match.roundLabel || ''
          }
        : { homeId: '', awayId: '', date: '', time: '', court: '', roundLabel: '' }
    )
  }, [open, match])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const courts = Array.isArray(tournament.courts) ? tournament.courts : []

  const submit = async (e) => {
    e.preventDefault()
    const errs = []
    if (!editing) {
      if (!form.homeId || !form.awayId) errs.push('Elige los dos equipos.')
      else if (form.homeId === form.awayId) errs.push('Un equipo no puede jugar contra sí mismo.')
    }
    if (errs.length) return setErrors(errs)

    setBusy(true)
    setErrors([])
    try {
      const common = {
        date: form.date,
        time: form.time,
        court: form.court.trim(),
        roundLabel: form.roundLabel.trim()
      }
      if (editing) {
        await updateMatch(tournament.id, match.id, common)
      } else {
        const home = teams.find((t) => t.id === form.homeId)
        const away = teams.find((t) => t.id === form.awayId)
        const sameGroup = home?.groupId && home.groupId === away?.groupId
        const nextRound = Math.max(0, ...matches.map((m) => m.round || 0)) + 1
        await addMatch(tournament.id, {
          stage: tournament.format.type === 'knockout' ? 'knockout' : 'group',
          groupId: usesGroups(tournament.format.type) && sameGroup ? home.groupId : '',
          round: nextRound,
          roundLabel: common.roundLabel || `Jornada ${nextRound}`,
          homeId: form.homeId,
          awayId: form.awayId,
          status: 'scheduled',
          homeScore: null,
          awayScore: null,
          ...common
        })
      }
      onClose()
    } catch (err) {
      console.error(err)
      setErrors([friendlyError(err)])
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deleteMatch(tournament.id, match.id)
      onClose()
    } catch (err) {
      console.error(err)
      setErrors([friendlyError(err)])
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  const teamOptions = (
    <>
      <option value="">Elegir equipo</option>
      {teams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </>
  )

  return (
    <>
      <Modal
        open={open && !confirmDelete}
        onClose={busy ? () => {} : onClose}
        title={editing ? 'Editar partido' : 'Agregar partido'}
        footer={
          <>
            {editing && !locked && (
              <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy} className="btn-ghost btn-sm mr-auto">
                Eliminar
              </button>
            )}
            <button type="button" onClick={onClose} disabled={busy} className="btn-outline btn-sm">
              Cancelar
            </button>
            <button type="submit" form="match-form" disabled={busy} className="btn-solid btn-sm">
              {busy ? <Spinner className="h-4 w-4" /> : editing ? 'Guardar' : 'Agregar'}
            </button>
          </>
        }
      >
        <form id="match-form" onSubmit={submit} className="space-y-5">
          {editing ? (
            <p className="text-[15px] font-semibold tracking-tight">
              {teams.find((t) => t.id === match.homeId)?.name || 'Equipo eliminado'} vs{' '}
              {teams.find((t) => t.id === match.awayId)?.name || 'Equipo eliminado'}
            </p>
          ) : (
            <>
              <Field label="Local" htmlFor="m-home">
                <Select id="m-home" value={form.homeId || ''} onChange={(v) => set({ homeId: v })}>
                  {teamOptions}
                </Select>
              </Field>
              <Field label="Visitante" htmlFor="m-away">
                <Select id="m-away" value={form.awayId || ''} onChange={(v) => set({ awayId: v })}>
                  {teamOptions}
                </Select>
              </Field>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha" htmlFor="m-date">
              <input id="m-date" type="date" className="input" value={form.date || ''} onChange={(e) => set({ date: e.target.value })} />
            </Field>
            <Field label="Hora" htmlFor="m-time">
              <input id="m-time" type="time" className="input" value={form.time || ''} onChange={(e) => set({ time: e.target.value })} />
            </Field>
          </div>
          <Field label="Cancha" htmlFor="m-court">
            <input
              id="m-court"
              className="input"
              list="m-courts"
              maxLength={40}
              placeholder="Opcional"
              value={form.court || ''}
              onChange={(e) => set({ court: e.target.value })}
            />
            <datalist id="m-courts">
              {courts.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Jornada o fase" htmlFor="m-round">
            <input
              id="m-round"
              className="input"
              maxLength={40}
              placeholder="Ej. Jornada 3, Semifinal"
              value={form.roundLabel || ''}
              onChange={(e) => set({ roundLabel: e.target.value })}
            />
          </Field>
          {locked && <p className="text-[12px] text-mute">Este partido ya empezó: solo puedes cambiar sus datos de programación.</p>}
          <ErrorList errors={errors} />
        </form>
      </Modal>
      <ConfirmDialog
        open={open && confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        title="Eliminar partido"
        confirmLabel="Eliminar partido"
        message="Se quitará este partido del calendario."
      />
    </>
  )
}
