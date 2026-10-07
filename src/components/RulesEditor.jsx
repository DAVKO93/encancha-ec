import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { ChipsInput, NumberField, Row, SectionCard, Segmented, Switch } from './ui'
import { PERIOD_NAMES, SPORTS, newActionId, tiebreakerLabel } from '../utils/sports'

// Editor de todas las reglas del campeonato. Los valores iniciales dependen del deporte,
// pero todo se puede cambiar.
export default function RulesEditor({ rules, onChange, sport }) {
  const noun = SPORTS[sport]?.scoreNoun || 'puntos'
  const periodLower = rules.timing.periodName.toLowerCase()
  const patch = (section, values) => onChange({ ...rules, [section]: { ...rules[section], ...values } })

  const { timing, scoring, standings, discipline, substitutions, timeouts, roster } = rules

  const setAction = (id, values) =>
    patch('scoring', { actions: scoring.actions.map((a) => (a.id === id ? { ...a, ...values } : a)) })

  const moveTiebreaker = (index, delta) => {
    const list = [...standings.tiebreakers]
    const target = index + delta
    if (target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
    patch('standings', { tiebreakers: list })
  }

  const toggleTiebreaker = (index) =>
    patch('standings', {
      tiebreakers: standings.tiebreakers.map((t, i) => (i === index ? { ...t, enabled: !t.enabled } : t))
    })

  return (
    <div className="space-y-4">
      <SectionCard title="Tiempos de juego" description="Cuánto dura cada partido y cómo corre el cronómetro.">
        <Row label="Nombre de cada parte">
          <Segmented
            ariaLabel="Nombre de cada parte"
            value={timing.periodName}
            onChange={(v) => patch('timing', { periodName: v })}
            options={PERIOD_NAMES.map((p) => ({ value: p, label: p }))}
          />
        </Row>
        <Row label={`Cantidad de ${periodLower}s`}>
          <NumberField value={timing.periods} min={1} max={8} onChange={(v) => patch('timing', { periods: v })} ariaLabel="Cantidad de partes" />
        </Row>
        <Row label={`Duración de cada ${periodLower}`}>
          <NumberField value={timing.periodMinutes} min={1} max={120} suffix="min" onChange={(v) => patch('timing', { periodMinutes: v })} ariaLabel="Minutos por parte" />
        </Row>
        <Row label="Descanso entre partes" hint="0 si no hay descanso.">
          <NumberField value={timing.breakMinutes} min={0} max={60} suffix="min" onChange={(v) => patch('timing', { breakMinutes: v })} ariaLabel="Minutos de descanso" />
        </Row>
        <Row label="Cronómetro">
          <Segmented
            ariaLabel="Tipo de cronómetro"
            value={timing.clock}
            onChange={(v) => patch('timing', { clock: v })}
            options={[
              { value: 'up', label: 'Sube' },
              { value: 'down', label: 'Regresivo' }
            ]}
          />
        </Row>
        <Switch
          checked={timing.extraEnabled}
          onChange={(v) => patch('timing', { extraEnabled: v })}
          label="Tiempo extra"
          hint="Se juega cuando un partido de eliminación termina empatado."
        />
        {timing.extraEnabled && (
          <>
            <Row label="Duración del tiempo extra">
              <NumberField value={timing.extraMinutes} min={1} max={60} suffix="min" onChange={(v) => patch('timing', { extraMinutes: v })} ariaLabel="Minutos de tiempo extra" />
            </Row>
            <Row label="Cantidad de tiempos extra">
              <NumberField value={timing.extraPeriods} min={1} max={4} onChange={(v) => patch('timing', { extraPeriods: v })} ariaLabel="Cantidad de tiempos extra" />
            </Row>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Anotación"
        description={`Las acciones con las que se suman ${noun} durante el partido.`}
      >
        <ul className="space-y-3">
          {scoring.actions.map((a) => (
            <li key={a.id} className="flex items-center gap-3">
              <input
                className="input min-w-0 flex-1"
                value={a.name}
                maxLength={24}
                placeholder="Nombre (ej. Gol, Triple)"
                aria-label="Nombre de la anotación"
                onChange={(e) => setAction(a.id, { name: e.target.value })}
              />
              <NumberField value={a.points} min={1} max={99} suffix="pts" onChange={(v) => setAction(a.id, { points: v })} ariaLabel="Puntos que vale" />
              <button
                type="button"
                disabled={scoring.actions.length <= 1}
                onClick={() => patch('scoring', { actions: scoring.actions.filter((x) => x.id !== a.id) })}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-neutral-100 disabled:opacity-30"
                aria-label="Quitar anotación"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => patch('scoring', { actions: [...scoring.actions, { id: newActionId(), name: '', points: 1 }] })}
          className="btn-outline btn-sm mt-4"
        >
          <Plus className="h-4 w-4" />
          Agregar anotación
        </button>
      </SectionCard>

      <SectionCard title="Clasificación" description="Puntos de la tabla de posiciones y desempates.">
        <Switch
          checked={standings.allowDraws}
          onChange={(v) => patch('standings', { allowDraws: v })}
          label="Se permiten empates"
          hint="Si lo desactivas, un partido igualado se define con tiempo extra."
        />
        <Row label="Puntos por victoria">
          <NumberField value={standings.pointsWin} min={0} max={20} onChange={(v) => patch('standings', { pointsWin: v })} ariaLabel="Puntos por victoria" />
        </Row>
        {standings.allowDraws && (
          <Row label="Puntos por empate">
            <NumberField value={standings.pointsDraw} min={0} max={20} onChange={(v) => patch('standings', { pointsDraw: v })} ariaLabel="Puntos por empate" />
          </Row>
        )}
        <Row label="Puntos por derrota">
          <NumberField value={standings.pointsLoss} min={0} max={20} onChange={(v) => patch('standings', { pointsLoss: v })} ariaLabel="Puntos por derrota" />
        </Row>

        <p className="label mt-6">Criterios de desempate, en orden</p>
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {standings.tiebreakers.map((t, i) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={t.enabled}
                onChange={() => toggleTiebreaker(i)}
                className="h-4 w-4 accent-black"
                aria-label={`Usar: ${tiebreakerLabel(t.id, sport)}`}
              />
              <span className={`min-w-0 flex-1 text-[14px] ${t.enabled ? '' : 'text-mute'}`}>
                {tiebreakerLabel(t.id, sport)}
              </span>
              <button
                type="button"
                onClick={() => moveTiebreaker(i, -1)}
                disabled={i === 0}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-neutral-100 disabled:opacity-30"
                aria-label="Subir"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveTiebreaker(i, 1)}
                disabled={i === standings.tiebreakers.length - 1}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-neutral-100 disabled:opacity-30"
                aria-label="Bajar"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12px] text-mute">Si después de todo siguen empatados, se define por sorteo.</p>
      </SectionCard>

      <SectionCard title="Disciplina" description="Tarjetas y faltas durante el partido.">
        <Switch
          checked={discipline.cardsEnabled}
          onChange={(v) => patch('discipline', { cardsEnabled: v })}
          label="Tarjetas amarilla y roja"
        />
        {discipline.cardsEnabled && (
          <Row label="Amarillas para suspensión" hint="Acumuladas a lo largo del campeonato.">
            <NumberField value={discipline.yellowForSuspension} min={1} max={20} onChange={(v) => patch('discipline', { yellowForSuspension: v })} ariaLabel="Amarillas para suspensión" />
          </Row>
        )}
        <Switch
          checked={discipline.foulsEnabled}
          onChange={(v) => patch('discipline', { foulsEnabled: v })}
          label="Control de faltas"
        />
        {discipline.foulsEnabled && (
          <>
            <Row label="Faltas por jugador antes de salir">
              <NumberField value={discipline.playerFoulLimit} min={1} max={20} onChange={(v) => patch('discipline', { playerFoulLimit: v })} ariaLabel="Faltas por jugador" />
            </Row>
            <Row label={`Faltas de equipo por ${periodLower}`}>
              <NumberField value={discipline.teamFoulLimit} min={1} max={30} onChange={(v) => patch('discipline', { teamFoulLimit: v })} ariaLabel="Faltas de equipo" />
            </Row>
          </>
        )}
      </SectionCard>

      <SectionCard title="Sustituciones y tiempos muertos">
        <Switch
          checked={substitutions.enabled}
          onChange={(v) => patch('substitutions', { enabled: v })}
          label="Sustituciones"
        />
        {substitutions.enabled && (
          <Row label="Máximo por equipo" hint="0 significa sin límite.">
            <NumberField value={substitutions.max} min={0} max={30} onChange={(v) => patch('substitutions', { max: v })} ariaLabel="Máximo de sustituciones" />
          </Row>
        )}
        <Switch
          checked={timeouts.enabled}
          onChange={(v) => patch('timeouts', { enabled: v })}
          label="Tiempos muertos"
        />
        {timeouts.enabled && (
          <>
            <Row label="Por equipo en el partido">
              <NumberField value={timeouts.perTeam} min={1} max={20} onChange={(v) => patch('timeouts', { perTeam: v })} ariaLabel="Tiempos muertos por equipo" />
            </Row>
            <Row label="Duración de cada uno">
              <NumberField value={timeouts.seconds} min={10} max={300} suffix="seg" onChange={(v) => patch('timeouts', { seconds: v })} ariaLabel="Segundos de tiempo muerto" />
            </Row>
          </>
        )}
      </SectionCard>

      <SectionCard title="Jugadores por equipo">
        <Row label="Jugadores en cancha">
          <NumberField value={roster.onField} min={1} max={30} onChange={(v) => patch('roster', { onField: v })} ariaLabel="Jugadores en cancha" />
        </Row>
        <Row label="Mínimo para jugar un partido">
          <NumberField value={roster.minPlayers} min={1} max={60} onChange={(v) => patch('roster', { minPlayers: v })} ariaLabel="Mínimo de jugadores" />
        </Row>
        <Row label="Máximo inscritos por equipo">
          <NumberField value={roster.maxPlayers} min={1} max={60} onChange={(v) => patch('roster', { maxPlayers: v })} ariaLabel="Máximo de jugadores" />
        </Row>
        <p className="label mt-5">Posiciones disponibles</p>
        <ChipsInput
          values={roster.positions}
          onChange={(v) => patch('roster', { positions: v })}
          placeholder="Escribe una posición y pulsa Enter"
        />
      </SectionCard>
    </div>
  )
}
