import { useEffect, useState } from 'react'
import Modal from './Modal'

function PlayerButton({ player, onClick, disabled, note }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center gap-3 rounded-2xl border border-line px-3 py-3 text-left transition hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink text-[14px] font-semibold tabular-nums">
          {player.number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium [overflow-wrap:anywhere]">{player.name}</span>
          {(player.position || note) && (
            <span className="block text-[12px] text-mute">{[player.position, note].filter(Boolean).join(' · ')}</span>
          )}
        </span>
      </button>
    </li>
  )
}

const TITLES = {
  score: 'Quién anotó',
  foul: 'Quién cometió la falta',
  yellow: 'Tarjeta amarilla para',
  red: 'Tarjeta roja para',
  sub: 'Cambio'
}

/**
 * Ventana para elegir al jugador de un evento. Para un cambio se eligen dos: quién sale y quién entra.
 * spec: { kind, team, action? }.
 */
export default function EventPicker({ spec, roster, onField, unavailable, showOwnGoal, onClose, onConfirm }) {
  const open = Boolean(spec)
  const [own, setOwn] = useState(false)
  const [outId, setOutId] = useState(null)

  useEffect(() => {
    setOwn(false)
    setOutId(null)
  }, [spec])

  if (!spec) return <Modal open={false} onClose={onClose} title="" />

  const field = new Set(onField)
  const onList = roster.filter((p) => field.has(p.id))
  const benchList = roster.filter((p) => !field.has(p.id))
  const blocked = (p) => unavailable.has(p.id)
  const bench = (list) =>
    list.map((p) => <PlayerButton key={p.id} player={p} disabled={blocked(p)} note={blocked(p) ? 'No disponible' : ''} onClick={() => onConfirm({ playerId: p.id, own })} />)

  const section = (title, items) =>
    items.length > 0 && (
      <div className="mt-5 first:mt-0">
        <p className="label">{title}</p>
        <ul className="space-y-2">{items}</ul>
      </div>
    )

  let title = TITLES[spec.kind]
  let body

  if (spec.kind === 'sub') {
    if (!outId) {
      title = 'Cambio: quién sale'
      body = section(
        'En cancha',
        onList.map((p) => <PlayerButton key={p.id} player={p} onClick={() => setOutId(p.id)} />)
      )
    } else {
      const out = roster.find((p) => p.id === outId)
      title = 'Cambio: quién entra'
      body = (
        <>
          <p className="mb-4 text-sm text-mute">
            Sale <span className="font-semibold text-ink">#{out?.number} {out?.name}</span>
          </p>
          {benchList.filter((p) => !blocked(p)).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-mute">
              No quedan jugadores disponibles en la banca.
            </p>
          ) : (
            section(
              'Banca',
              benchList.map((p) => (
                <PlayerButton
                  key={p.id}
                  player={p}
                  disabled={blocked(p)}
                  note={blocked(p) ? 'No disponible' : ''}
                  onClick={() => onConfirm({ playerId: p.id, playerOutId: outId })}
                />
              ))
            )
          )}
        </>
      )
    }
  } else {
    const scoreOnly = spec.kind === 'score'
    body = (
      <>
        {scoreOnly && (
          <p className="mb-4 text-sm text-mute">
            {spec.action.name} · {spec.action.points} {spec.action.points === 1 ? 'punto' : 'puntos'} para {spec.team.name}
          </p>
        )}
        {scoreOnly && showOwnGoal && (
          <label className="mb-5 flex cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-3 text-[14px]">
            <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} className="h-4 w-4 accent-black" />
            Fue en contra (suma al rival)
          </label>
        )}
        {onList.length === 0 && benchList.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-mute">
            Este equipo no tiene jugadores registrados.
          </p>
        ) : (
          <>
            {section('En cancha', bench(onList))}
            {!scoreOnly && section('Banca', bench(benchList))}
          </>
        )}
        {(scoreOnly || spec.kind === 'foul') && (
          <button
            type="button"
            onClick={() => onConfirm({ playerId: null, own })}
            className="btn-ghost btn-sm mt-5 w-full"
          >
            Sin identificar al jugador
          </button>
        )}
      </>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={`${title} · ${spec.team.shortName || spec.team.name}`}>
      {body}
    </Modal>
  )
}
