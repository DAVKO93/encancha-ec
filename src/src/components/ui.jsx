import { useEffect, useId, useState } from 'react'
import { ChevronDown, Minus, Plus, X } from 'lucide-react'

export function Field({ label, hint, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="mt-2 text-[12px] leading-relaxed text-mute">{hint}</p>}
    </div>
  )
}

export function SectionCard({ title, description, children }) {
  return (
    <section className="card p-5 sm:p-6">
      <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
      {description && <p className="mt-1 text-sm leading-relaxed text-mute">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

// Fila "etiqueta a la izquierda, control a la derecha".
export function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-[14px] font-medium">{label}</p>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-mute">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function Switch({ checked, onChange, label, hint }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0 last:pb-0 first:pt-0">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[14px] font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] leading-snug text-mute">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-neutral-300'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow transition-all ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

export function NumberField({ value, onChange, min = 0, max = 999, suffix, id, ariaLabel }) {
  const [text, setText] = useState(String(value ?? ''))
  useEffect(() => setText(String(value ?? '')), [value])

  const clamp = (n) => Math.min(max, Math.max(min, n))
  const step = (delta) => onChange(clamp((Number(value) || 0) + delta))

  return (
    <div className="inline-flex items-center rounded-full border border-ink">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= min}
        className="grid h-10 w-10 place-items-center rounded-l-full hover:bg-neutral-100 disabled:opacity-30"
        aria-label="Disminuir"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        aria-label={ariaLabel}
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, '')
          setText(raw)
          if (raw !== '') onChange(clamp(parseInt(raw, 10)))
        }}
        onBlur={() => setText(String(value ?? ''))}
        className="h-10 w-12 bg-transparent text-center text-[15px] font-semibold tabular-nums focus:outline-none"
      />
      {suffix && <span className="-ml-1 mr-2 text-[12px] text-mute">{suffix}</span>}
      <button
        type="button"
        onClick={() => step(1)}
        disabled={value >= max}
        className="grid h-10 w-10 place-items-center rounded-r-full hover:bg-neutral-100 disabled:opacity-30"
        aria-label="Aumentar"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

export function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-ink p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${
            value === o.value ? 'bg-ink text-paper' : 'text-ink hover:bg-neutral-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Tarjetas de selección (una sola opción), con título y descripción.
export function RadioCards({ options, value, onChange, ariaLabel, disabled }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid gap-3">
      {options.map((o) => {
        const selected = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled && !selected}
            onClick={() => onChange(o.id)}
            className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition ${
              selected ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
            } ${disabled && !selected ? 'opacity-40' : ''}`}
          >
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                selected ? 'border-paper' : 'border-ink'
              }`}
            >
              {selected && <span className="h-2.5 w-2.5 rounded-full bg-paper" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold tracking-tight">{o.label}</span>
              {o.description && (
                <span className={`mt-1 block text-[13px] leading-relaxed ${selected ? 'text-neutral-300' : 'text-mute'}`}>
                  {o.description}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Select({ value, onChange, children, id, ariaLabel }) {
  return (
    <div className="relative">
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input appearance-none pr-11"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
    </div>
  )
}

// Lista de etiquetas editable: se escribe y se pulsa Enter o coma para agregar.
export function ChipsInput({ values, onChange, placeholder, max = 30 }) {
  const [text, setText] = useState('')

  const add = (raw) => {
    const clean = raw.trim().slice(0, 30)
    if (!clean) return
    if (values.some((v) => v.toLowerCase() === clean.toLowerCase())) {
      setText('')
      return
    }
    if (values.length >= max) return
    onChange([...values, clean])
    setText('')
  }

  return (
    <div>
      {values.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <li
              key={v}
              className="inline-flex items-center gap-1 rounded-full border border-ink py-1 pl-3 pr-1 text-[13px]"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="grid h-6 w-6 place-items-center rounded-full hover:bg-neutral-100"
                aria-label={`Quitar ${v}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          className="input"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(text)
            }
          }}
          onBlur={() => add(text)}
        />
        <button type="button" onClick={() => add(text)} className="btn-outline shrink-0" aria-label="Agregar">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function ErrorList({ errors }) {
  if (!errors || errors.length === 0) return null
  return (
    <ul role="alert" className="space-y-1 border-l-2 border-ink pl-3 text-sm">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  )
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="grid h-14 w-14 place-items-center rounded-full border border-ink">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}
      <p className="mt-5 text-lg font-semibold tracking-tight">{title}</p>
      {text && <p className="mt-2 max-w-xs text-sm leading-relaxed text-mute">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
