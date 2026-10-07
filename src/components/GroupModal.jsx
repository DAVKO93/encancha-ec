import { useEffect, useState } from 'react'
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { friendlyError } from '../utils/authErrors'
import { saveFast } from '../utils/db'
import { norm } from '../utils/format'
import Modal from './Modal'
import { Spinner } from './Loader'
import { ErrorList, Field } from './ui'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function suggestGroupName(groups) {
  for (const l of LETTERS) {
    const name = `Grupo ${l}`
    if (!groups.some((g) => norm(g.name) === norm(name))) return name
  }
  return `Grupo ${groups.length + 1}`
}

// Crear o renombrar un grupo.
export default function GroupModal({ open, onClose, tournamentId, groups, group }) {
  const [name, setName] = useState('')
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(group ? group.name : suggestGroupName(groups))
    setErrors([])
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id])

  const save = async (e) => {
    e?.preventDefault()
    const clean = name.trim()
    const errs = []
    if (clean.length < 1) errs.push('Escribe el nombre del grupo.')
    if (groups.some((g) => g.id !== group?.id && norm(g.name) === norm(clean))) errs.push('Ya existe un grupo con ese nombre.')
    setErrors(errs)
    if (errs.length) return

    setBusy(true)
    try {
      if (group) {
        await saveFast(updateDoc(doc(db, 'tournaments', tournamentId, 'groups', group.id), { name: clean }))
      } else {
        const order = groups.reduce((max, g) => Math.max(max, g.order ?? 0), -1) + 1
        const ref = doc(collection(db, 'tournaments', tournamentId, 'groups'))
        await saveFast(setDoc(ref, { name: clean, order }))
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
      title={group ? 'Renombrar grupo' : 'Nuevo grupo'}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-outline btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={busy} className="btn-solid btn-sm">
            {busy ? <Spinner className="h-4 w-4" /> : 'Guardar'}
          </button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-5">
        <Field label="Nombre del grupo" htmlFor="group-name">
          <input id="group-name" className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </Field>
        <ErrorList errors={errors} />
      </form>
    </Modal>
  )
}
