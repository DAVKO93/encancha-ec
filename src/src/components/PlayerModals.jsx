import { useEffect, useMemo, useState } from 'react'
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { friendlyError } from '../utils/authErrors'
import { inChunks, saveFast } from '../utils/db'
import { norm } from '../utils/format'
import { checkPlayerRows, parsePlayerLines } from '../utils/players'
import Modal from './Modal'
import { Spinner } from './Loader'
import { ErrorList, Field, Select } from './ui'

// Agregar o editar un jugador.
export function PlayerFormModal({ open, onClose, tournamentId, teamId, players, positions, maxPlayers, player }) {
  const [form, setForm] = useState({ name: '', number: '', position: '' })
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors([])
    setBusy(false)
    if (player) {
      setForm({ name: player.name || '', number: String(player.number ?? ''), position: player.position || '' })
    } else {
      // Sugerir el primer número libre.
      const taken = new Set(players.map((p) => Number(p.number)))
      let n = 1
      while (taken.has(n) && n < 99) n += 1
      setForm({ name: '', number: String(n), position: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, player?.id])

  const save = async (e) => {
    e?.preventDefault()
    const name = form.name.trim().replace(/\s+/g, ' ')
    const number = Number(form.number)
    const errs = []
    if (name.length < 2) errs.push('Escribe el nombre del jugador.')
    if (form.number === '' || !Number.isInteger(number) || number < 0 || number > 99) {
      errs.push('El número de camiseta debe estar entre 0 y 99.')
    } else if (players.some((p) => p.id !== player?.id && Number(p.number) === number)) {
      errs.push(`El número ${number} ya lo tiene otro jugador de este equipo.`)
    }
    if (players.some((p) => p.id !== player?.id && norm(p.name) === norm(name))) {
      errs.push('Ese jugador ya está en el equipo.')
    }
    if (!player && maxPlayers && players.length >= maxPlayers) {
      errs.push(`El equipo ya tiene el máximo de ${maxPlayers} jugadores. Puedes cambiar el límite en las reglas del campeonato.`)
    }
    setErrors(errs)
    if (errs.length) return

    const data = { name, number, position: form.position }
    setBusy(true)
    try {
      if (player) {
        await saveFast(updateDoc(doc(db, 'tournaments', tournamentId, 'players', player.id), data))
      } else {
        const ref = doc(collection(db, 'tournaments', tournamentId, 'players'))
        await saveFast(setDoc(ref, { ...data, teamId, createdAt: serverTimestamp() }))
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
      title={player ? 'Editar jugador' : 'Nuevo jugador'}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-outline btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={busy} className="btn-solid btn-sm">
            {busy ? <Spinner className="h-4 w-4" /> : player ? 'Guardar cambios' : 'Agregar jugador'}
          </button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-5">
        <Field label="Nombre completo" htmlFor="player-name">
          <input
            id="player-name"
            className="input"
            value={form.name}
            maxLength={50}
            placeholder="Nombre y apellido"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número" htmlFor="player-number">
            <input
              id="player-number"
              className="input"
              inputMode="numeric"
              value={form.number}
              maxLength={2}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value.replace(/[^\d]/g, '') }))}
            />
          </Field>
          <Field label="Posición" htmlFor="player-position">
            <Select id="player-position" value={form.position} onChange={(v) => setForm((f) => ({ ...f, position: v }))}>
              <option value="">Sin posición</option>
              {positions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              {form.position && !positions.includes(form.position) && <option value={form.position}>{form.position}</option>}
            </Select>
          </Field>
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        <ErrorList errors={errors} />
      </form>
    </Modal>
  )
}

// Agregar varios jugadores pegando una lista.
export function BulkPlayersModal({ open, onClose, tournamentId, teamId, players, maxPlayers, positions }) {
  const [text, setText] = useState('')
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setText('')
      setErrors([])
      setBusy(false)
    }
  }, [open])

  const preview = useMemo(() => {
    const parsed = parsePlayerLines(text, positions)
    const checked = checkPlayerRows(parsed.rows, players, maxPlayers)
    return { ok: checked.ok, problems: [...parsed.errors, ...checked.errors].sort((a, b) => a.line - b.line) }
  }, [text, players, maxPlayers, positions])

  const save = async () => {
    if (preview.ok.length === 0) {
      setErrors(['No hay jugadores válidos para agregar.'])
      return
    }
    setBusy(true)
    setErrors([])
    try {
      await inChunks(preview.ok, (r) => {
        const ref = doc(collection(db, 'tournaments', tournamentId, 'players'))
        const position = positions.find((p) => norm(p) === norm(r.position)) || ''
        return saveFast(
          setDoc(ref, { name: r.name, number: r.number, position, teamId, createdAt: serverTimestamp() }),
          4000
        )
      })
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
      title="Agregar varios jugadores"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-outline btn-sm">
            Cancelar
          </button>
          <button type="button" onClick={save} disabled={busy || preview.ok.length === 0} className="btn-solid btn-sm">
            {busy ? <Spinner className="h-4 w-4" /> : `Agregar ${preview.ok.length || ''}`.trim()}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-mute">
          Escribe o pega un jugador por línea, con su número. También puedes copiar las columnas desde Excel
          (número, nombre y posición). Por ejemplo:
        </p>
        <pre className="rounded-xl bg-neutral-100 px-4 py-3 text-[13px] leading-relaxed">
          {`10 Juan Pérez\n7. Luis Mena\n9, Carlos Ruiz, Delantero`}
        </pre>
        <textarea
          className="input min-h-[160px] font-mono text-[13px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Una línea por jugador"
          aria-label="Lista de jugadores"
        />
        {text.trim() && (
          <p className="text-sm">
            <span className="font-semibold">{preview.ok.length}</span> {preview.ok.length === 1 ? 'jugador listo' : 'jugadores listos'} para agregar
            {preview.problems.length > 0 && (
              <span className="text-mute"> · {preview.problems.length} con problemas</span>
            )}
          </p>
        )}
        {preview.problems.length > 0 && (
          <ul className="max-h-40 space-y-1 overflow-y-auto border-l-2 border-ink pl-3 text-[13px]">
            {preview.problems.map((p) => (
              <li key={`${p.line}-${p.reason}`}>
                Línea {p.line}: {p.reason} <span className="text-mute">({p.text})</span>
              </li>
            ))}
          </ul>
        )}
        <ErrorList errors={errors} />
      </div>
    </Modal>
  )
}
