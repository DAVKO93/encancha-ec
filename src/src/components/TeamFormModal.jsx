import { useEffect, useState } from 'react'
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { friendlyError } from '../utils/authErrors'
import { saveFast } from '../utils/db'
import { excelColor, nextTeamColor } from '../utils/excelColors'
import { norm } from '../utils/format'
import { usesGroups } from '../utils/sports'
import ColorPicker from './ColorPicker'
import LogoPicker from './LogoPicker'
import Modal from './Modal'
import { Spinner } from './Loader'
import { ErrorList, Field, Select } from './ui'

// Crear o editar un equipo. Si recibe "team", edita; si no, crea uno nuevo.
export default function TeamFormModal({ open, onClose, tournament, groups, teams, team, defaultGroupId = '', onSaved }) {
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors([])
    setBusy(false)
    if (team) {
      setForm({
        name: team.name || '',
        shortName: team.shortName || '',
        coach: team.coach || '',
        logo: team.logo || '',
        colorIndex: team.colorIndex || 1,
        groupId: team.groupId || ''
      })
    } else {
      setForm({
        name: '',
        shortName: '',
        coach: '',
        logo: '',
        colorIndex: nextTeamColor(teams.map((t) => t.colorIndex)),
        groupId: defaultGroupId || (usesGroups(tournament.format.type) ? groups[0]?.id || '' : '')
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, team?.id])

  if (!form) return null
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const hasGroups = usesGroups(tournament.format.type)

  const save = async () => {
    const name = form.name.trim()
    const errs = []
    if (name.length < 2) errs.push('Escribe el nombre del equipo.')
    if (teams.some((t) => t.id !== team?.id && norm(t.name) === norm(name))) {
      errs.push('Ya existe un equipo con ese nombre en este campeonato.')
    }
    setErrors(errs)
    if (errs.length) return

    const color = excelColor(form.colorIndex)
    const data = {
      name,
      shortName: form.shortName.trim().toUpperCase().slice(0, 3),
      coach: form.coach.trim(),
      logo: form.logo,
      colorIndex: color.index,
      color: color.hex,
      groupId: hasGroups ? form.groupId : ''
    }

    setBusy(true)
    try {
      if (team) {
        await saveFast(updateDoc(doc(db, 'tournaments', tournament.id, 'teams', team.id), data))
        onSaved?.(team.id)
      } else {
        const ref = doc(collection(db, 'tournaments', tournament.id, 'teams'))
        await saveFast(setDoc(ref, { ...data, createdAt: serverTimestamp() }))
        onSaved?.(ref.id)
      }
      onClose()
    } catch (err) {
      console.error(err)
      setErrors([friendlyError(err)])
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={team ? 'Editar equipo' : 'Nuevo equipo'}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-outline btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={busy} className="btn-solid btn-sm">
            {busy ? <Spinner className="h-4 w-4" /> : team ? 'Guardar cambios' : 'Crear equipo'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <Field label="Nombre del equipo" htmlFor="team-name">
          <input
            id="team-name"
            className="input"
            value={form.name}
            maxLength={40}
            placeholder="Ej. Deportivo Quito"
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Sigla (3 letras)" htmlFor="team-short" hint="Opcional. Se usa en tablas y PDFs.">
            <input
              id="team-short"
              className="input uppercase"
              value={form.shortName}
              maxLength={3}
              placeholder="DQU"
              onChange={(e) => set({ shortName: e.target.value })}
            />
          </Field>
          {hasGroups && (
            <Field label="Grupo" htmlFor="team-group">
              <Select id="team-group" value={form.groupId} onChange={(v) => set({ groupId: v })}>
                <option value="">Sin grupo</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <Field label="Director técnico" htmlFor="team-coach">
          <input
            id="team-coach"
            className="input"
            value={form.coach}
            maxLength={40}
            placeholder="Opcional"
            onChange={(e) => set({ coach: e.target.value })}
          />
        </Field>

        <Field label="Logo">
          <LogoPicker
            value={form.logo}
            onChange={(logo) => set({ logo })}
            size={160}
            preview={{ name: form.name, shortName: form.shortName, color: excelColor(form.colorIndex).hex }}
          />
        </Field>

        <Field label="Color del equipo">
          <ColorPicker value={form.colorIndex} onChange={(colorIndex) => set({ colorIndex })} />
        </Field>

        <ErrorList errors={errors} />
      </div>
    </Modal>
  )
}
