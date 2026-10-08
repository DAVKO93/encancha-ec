import { useState } from 'react'
import { ChipsInput, Field, NumberField, Row } from './ui'
import { DEFAULT_SCHEDULE, WEEKDAYS, defaultInterval, todayStr } from '../utils/schedule'

// Estado inicial de la programación, tomando datos del campeonato.
export function initialSchedule(tournament) {
  return {
    ...DEFAULT_SCHEDULE,
    startDate: tournament.startDate || todayStr(),
    interval: defaultInterval(tournament.rules),
    courts: Array.isArray(tournament.courts) ? tournament.courts : []
  }
}

export function useSchedule(tournament) {
  return useState(() => initialSchedule(tournament))
}

// Formulario para repartir los partidos en fechas, horas y canchas.
export default function ScheduleSettings({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const toggleDay = (id) =>
    set({ weekdays: value.weekdays.includes(id) ? value.weekdays.filter((d) => d !== id) : [...value.weekdays, id] })

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Primer día" htmlFor="sch-date">
          <input
            id="sch-date"
            type="date"
            className="input"
            value={value.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
        </Field>
        <Field label="Hora del primer partido" htmlFor="sch-time">
          <input
            id="sch-time"
            type="time"
            className="input"
            value={value.time}
            onChange={(e) => set({ time: e.target.value })}
          />
        </Field>
      </div>

      <div>
        <p className="label">Días en que se juega</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Días en que se juega">
          {WEEKDAYS.map((d) => {
            const on = value.weekdays.includes(d.id)
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDay(d.id)}
                className={`rounded-full border border-ink px-4 py-2 text-[13px] font-semibold transition ${
                  on ? 'bg-ink text-paper' : 'hover:bg-neutral-100'
                }`}
              >
                {d.label}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[12px] text-mute">Si no marcas ninguno, se juega todos los días.</p>
      </div>

      <div>
        <Row label="Partidos por día" hint="En total, contando todas las canchas.">
          <NumberField value={value.perDay} min={1} max={40} onChange={(v) => set({ perDay: v })} ariaLabel="Partidos por día" />
        </Row>
        <Row label="Minutos entre partidos" hint="Duración del partido más un margen.">
          <NumberField value={value.interval} min={10} max={600} suffix="min" onChange={(v) => set({ interval: v })} ariaLabel="Minutos entre partidos" />
        </Row>
      </div>

      <div>
        <p className="label">Canchas (opcional)</p>
        <ChipsInput
          values={value.courts}
          onChange={(v) => set({ courts: v })}
          placeholder="Nombre de la cancha y Enter"
        />
        <p className="mt-2 text-[12px] text-mute">Con varias canchas, los partidos de una misma hora se reparten entre ellas.</p>
      </div>
    </div>
  )
}
