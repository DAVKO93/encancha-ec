import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { db } from '../../firebase'
import { useAuth } from '../../context/AuthContext'
import { useTournaments } from '../../context/TournamentContext'
import { friendlyError } from '../../utils/authErrors'
import { inChunks, saveFast } from '../../utils/db'
import { excelColor } from '../../utils/excelColors'
import {
  DEFAULT_FORMAT,
  FORMAT_LIST,
  SPORT_LIST,
  SPORTS,
  defaultRules,
  usesGroups,
  usesPlayoffs,
  validateRules
} from '../../utils/sports'
import ColorPicker from '../../components/ColorPicker'
import LogoPicker from '../../components/LogoPicker'
import RulesEditor from '../../components/RulesEditor'
import FullScreenLoader, { Spinner } from '../../components/Loader'
import { ChipsInput, EmptyState, ErrorList, Field, NumberField, RadioCards, SectionCard, Switch, Row } from '../../components/ui'

const STEPS = ['General', 'Formato', 'Reglas']
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function initialForm() {
  return {
    name: '',
    sport: 'futbol',
    description: '',
    logo: '',
    colorIndex: 1,
    venue: '',
    courts: [],
    startDate: '',
    endDate: '',
    format: { ...DEFAULT_FORMAT },
    rules: defaultRules('futbol')
  }
}

function fromTournament(t) {
  return {
    name: t.name || '',
    sport: t.sport || 'futbol',
    description: t.description || '',
    logo: t.logo || '',
    colorIndex: t.colorIndex || 1,
    venue: t.venue || '',
    courts: t.courts || [],
    startDate: t.startDate || '',
    endDate: t.endDate || '',
    format: t.format,
    rules: t.rules
  }
}

function validateStep(step, form, editing) {
  const errs = []
  if (step === 0) {
    if (form.name.trim().length < 3) errs.push('Escribe el nombre del campeonato (mínimo 3 letras).')
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.push('La fecha de fin no puede ser anterior a la de inicio.')
    }
  }
  if (step === 1) {
    const f = form.format
    if (usesGroups(f.type)) {
      if (!editing && !(f.groupsCount >= 1 && f.groupsCount <= 12)) errs.push('La cantidad de grupos debe estar entre 1 y 12.')
      if (!(f.qualifiersPerGroup >= 1 && f.qualifiersPerGroup <= 16)) errs.push('Los clasificados por grupo deben estar entre 1 y 16.')
    }
  }
  if (step === 2) errs.push(...validateRules(form.rules))
  return errs
}

export default function TournamentForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { tournaments, tournamentsReady, setActiveId } = useTournaments()

  const [form, setForm] = useState(null)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState([])
  const [busy, setBusy] = useState(false)

  const source = editing ? tournaments.find((t) => t.id === id) : null
  const notFound = editing && tournamentsReady && !source

  useEffect(() => {
    if (form) return
    if (!editing) setForm(initialForm())
    else if (source) setForm(fromTournament(source))
  }, [form, editing, source])

  if (editing && !tournamentsReady) return <FullScreenLoader />
  if (notFound) {
    return (
      <EmptyState title="No encontramos ese campeonato" text="Puede que se haya eliminado.">
        <Link to="/admin/crear" className="btn-solid">
          Volver a mis campeonatos
        </Link>
      </EmptyState>
    )
  }
  if (!form) return <FullScreenLoader />

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setFormat = (patch) => setForm((f) => ({ ...f, format: { ...f.format, ...patch } }))
  const type = form.format.type

  const goTo = (next) => {
    setErrors([])
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = () => {
    const errs = validateStep(step, form, editing)
    if (errs.length) return setErrors(errs)
    goTo(step + 1)
  }

  const save = async () => {
    for (let s = 0; s < STEPS.length; s += 1) {
      const errs = validateStep(s, form, editing)
      if (errs.length) {
        setStep(s)
        setErrors(errs)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    const color = excelColor(form.colorIndex)
    const data = {
      name: form.name.trim(),
      sport: form.sport,
      description: form.description.trim(),
      logo: form.logo,
      colorIndex: color.index,
      color: color.hex,
      venue: form.venue.trim(),
      courts: form.courts,
      startDate: form.startDate,
      endDate: form.endDate,
      format: form.format,
      rules: form.rules,
      updatedAt: serverTimestamp()
    }

    setBusy(true)
    setErrors([])
    try {
      if (editing) {
        await saveFast(updateDoc(doc(db, 'tournaments', id), data))
        navigate(`/admin/crear/${id}`)
      } else {
        const ref = doc(collection(db, 'tournaments'))
        await saveFast(
          setDoc(ref, {
            ...data,
            ownerId: user.uid,
            ownerName: profile?.name || user.displayName || '',
            createdAt: serverTimestamp()
          }),
          10000
        )
        // Los grupos se crean después, cuando el campeonato ya existe.
        if (usesGroups(form.format.type)) {
          const count = Math.min(12, Math.max(1, form.format.groupsCount))
          const groups = Array.from({ length: count }, (_, i) => ({ name: `Grupo ${LETTERS[i]}`, order: i }))
          await inChunks(groups, (g) => saveFast(setDoc(doc(collection(db, 'tournaments', ref.id, 'groups')), g), 4000))
        }
        setActiveId(ref.id)
        navigate(`/admin/crear/${ref.id}`)
      }
    } catch (err) {
      console.error(err)
      setErrors([friendlyError(err)])
      setBusy(false)
    }
  }

  const changeSport = (sport) => {
    if (sport === form.sport) return
    set({ sport, rules: defaultRules(sport) })
  }

  const isLast = step === STEPS.length - 1

  return (
    <>
      <Link
        to={editing ? `/admin/crear/${id}` : '/admin/crear'}
        className="mb-6 inline-flex items-center gap-2 text-sm text-mute hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        {editing ? 'Volver al campeonato' : 'Mis campeonatos'}
      </Link>

      <p className="eyebrow">{editing ? 'Editar campeonato' : 'Nuevo campeonato'}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{STEPS[step]}</h1>

      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Pasos">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => {
                if (i <= step || editing) goTo(i)
              }}
              aria-current={i === step ? 'step' : undefined}
              className={`w-full rounded-full border px-3 py-2 text-[12px] font-semibold transition ${
                i === step
                  ? 'border-ink bg-ink text-paper'
                  : i < step
                    ? 'border-ink text-ink'
                    : 'border-line text-mute'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span>{i + 1}</span>}
                {label}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 space-y-4">
        {step === 0 && (
          <>
            <SectionCard title="Deporte">
              {editing ? (
                <div className="flex items-start gap-3 rounded-2xl border border-line p-4">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-mute" />
                  <p className="text-sm leading-relaxed text-mute">
                    <strong className="text-ink">{SPORTS[form.sport]?.label}</strong>. El deporte no se puede cambiar
                    después de crear el campeonato. Si necesitas otro, crea un campeonato nuevo.
                  </p>
                </div>
              ) : (
                <RadioCards
                  ariaLabel="Deporte"
                  value={form.sport}
                  onChange={changeSport}
                  options={SPORT_LIST.map((s) => ({ id: s.id, label: s.label, description: s.description }))}
                />
              )}
            </SectionCard>

            <SectionCard title="Datos del campeonato">
              <div className="space-y-6">
                <Field label="Nombre" htmlFor="t-name">
                  <input
                    id="t-name"
                    className="input"
                    value={form.name}
                    maxLength={60}
                    placeholder="Ej. Copa Interbarrial 2026"
                    onChange={(e) => set({ name: e.target.value })}
                  />
                </Field>
                <Field label="Descripción" htmlFor="t-desc" hint="Opcional. Se muestra a los visitantes.">
                  <textarea
                    id="t-desc"
                    className="input min-h-[96px]"
                    value={form.description}
                    maxLength={300}
                    onChange={(e) => set({ description: e.target.value })}
                  />
                </Field>
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Fecha de inicio" htmlFor="t-start">
                    <input id="t-start" type="date" className="input" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                  </Field>
                  <Field label="Fecha de fin" htmlFor="t-end">
                    <input id="t-end" type="date" className="input" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
                  </Field>
                </div>
                <Field label="Sede" htmlFor="t-venue">
                  <input
                    id="t-venue"
                    className="input"
                    value={form.venue}
                    maxLength={60}
                    placeholder="Ej. Complejo Deportivo La Carolina"
                    onChange={(e) => set({ venue: e.target.value })}
                  />
                </Field>
                <Field label="Canchas" hint="Opcional. Escribe cada cancha y pulsa Enter. Se usarán al armar el calendario.">
                  <ChipsInput values={form.courts} onChange={(courts) => set({ courts })} placeholder="Ej. Cancha 1" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Imagen y color">
              <div className="space-y-6">
                <Field label="Logo">
                  <LogoPicker
                    value={form.logo}
                    onChange={(logo) => set({ logo })}
                    preview={{ name: form.name, color: excelColor(form.colorIndex).hex }}
                  />
                </Field>
                <Field label="Color del campeonato">
                  <ColorPicker value={form.colorIndex} onChange={(colorIndex) => set({ colorIndex })} />
                </Field>
              </div>
            </SectionCard>
          </>
        )}

        {step === 1 && (
          <>
            <SectionCard title="Formato del campeonato" description="Cómo se enfrentan los equipos.">
              <RadioCards
                ariaLabel="Formato"
                value={type}
                onChange={(t) => setFormat({ type: t })}
                options={FORMAT_LIST}
              />
            </SectionCard>

            <SectionCard title="Detalles del formato">
              {usesGroups(type) && (
                <>
                  {!editing && (
                    <Row label="Cantidad de grupos" hint="Se crean al guardar. Después puedes renombrarlos, agregar o quitar.">
                      <NumberField
                        value={form.format.groupsCount}
                        min={1}
                        max={12}
                        onChange={(v) => setFormat({ groupsCount: v })}
                        ariaLabel="Cantidad de grupos"
                      />
                    </Row>
                  )}
                  <Row label="Clasifican por grupo" hint="Equipos que avanzan a la siguiente fase.">
                    <NumberField
                      value={form.format.qualifiersPerGroup}
                      min={1}
                      max={16}
                      onChange={(v) => setFormat({ qualifiersPerGroup: v })}
                      ariaLabel="Clasificados por grupo"
                    />
                  </Row>
                </>
              )}
              {type !== 'knockout' && (
                <Switch
                  checked={form.format.homeAway}
                  onChange={(v) => setFormat({ homeAway: v })}
                  label="Ida y vuelta"
                  hint="Cada pareja se enfrenta dos veces en la fase regular."
                />
              )}
              {usesPlayoffs(type) && (
                <>
                  <Switch
                    checked={form.format.knockoutTwoLegs}
                    onChange={(v) => setFormat({ knockoutTwoLegs: v })}
                    label="Llaves a ida y vuelta"
                    hint="Si lo desactivas, cada llave se define en un solo partido."
                  />
                  <Switch
                    checked={form.format.thirdPlace}
                    onChange={(v) => setFormat({ thirdPlace: v })}
                    label="Partido por el tercer puesto"
                  />
                </>
              )}
              {type === 'league' && (
                <p className="mt-4 text-sm text-mute">No hace falta crear grupos: todos los equipos van en una sola tabla.</p>
              )}
            </SectionCard>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[15px] leading-relaxed text-mute">
              Estos valores vienen preparados para <strong className="text-ink">{SPORTS[form.sport]?.label}</strong>, pero
              puedes cambiar cualquiera de ellos.
            </p>
            <RulesEditor rules={form.rules} onChange={(rules) => set({ rules })} sport={form.sport} />
          </>
        )}

        <ErrorList errors={errors} />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <button type="button" onClick={() => goTo(step - 1)} disabled={busy} className="btn-outline">
              Atrás
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {editing && !isLast && (
              <button type="button" onClick={save} disabled={busy} className="btn-outline">
                {busy ? <Spinner className="h-4 w-4" /> : 'Guardar'}
              </button>
            )}
            {isLast ? (
              <button type="button" onClick={save} disabled={busy} className="btn-solid">
                {busy ? <Spinner className="h-4 w-4" /> : editing ? 'Guardar cambios' : 'Crear campeonato'}
              </button>
            ) : (
              <button type="button" onClick={next} disabled={busy} className="btn-solid">
                Continuar
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
