import { useEffect, useMemo, useState } from 'react'
import { Check, RotateCcw, Shuffle, Zap } from 'lucide-react'
import Roulette from './Roulette'
import { Spinner } from './Loader'
import { randomInt, shuffle } from '../utils/schedule'

/**
 * Sorteo con ruleta: cada giro saca un equipo al azar. El orden en que van saliendo
 * es el resultado. "preview(picked)" dibuja cómo va quedando.
 */
export default function RouletteDraw({ teams, preview, onConfirm, confirmLabel = 'Confirmar sorteo', busy = false }) {
  const poolKey = useMemo(() => teams.map((t) => t.id).join('|'), [teams])
  const [remaining, setRemaining] = useState(teams)
  const [picked, setPicked] = useState([])
  const [winnerId, setWinnerId] = useState(null)
  const [spinKey, setSpinKey] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [last, setLast] = useState(null)

  const reset = () => {
    setRemaining(teams)
    setPicked([])
    setWinnerId(null)
    setSpinning(false)
    setLast(null)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reset, [poolKey])

  const spin = () => {
    if (spinning || remaining.length === 0) return
    const choice = remaining[randomInt(remaining.length)]
    setWinnerId(choice.id)
    setSpinKey((k) => k + 1)
    setSpinning(true)
  }

  const onDone = () => {
    const team = remaining.find((t) => t.id === winnerId)
    if (!team) return
    setPicked((p) => [...p, team])
    setRemaining((r) => r.filter((t) => t.id !== winnerId))
    setLast(team)
    setSpinning(false)
  }

  const quick = () => {
    if (spinning) return
    const rest = shuffle(remaining)
    setPicked((p) => [...p, ...rest])
    setRemaining([])
    setLast(rest[rest.length - 1] || last)
  }

  const finished = remaining.length === 0 && picked.length > 0
  const items = remaining.map((t) => ({ id: t.id, label: t.name, short: t.shortName }))

  return (
    <div>
      {!finished && (
        <div className="card px-4 pb-6 pt-8">
          <Roulette items={items} winnerId={winnerId} spinKey={spinKey} onDone={onDone} />
          <p className="mt-6 text-center text-[13px] text-mute" aria-live="polite">
            {spinning
              ? 'Girando...'
              : `Quedan ${remaining.length} ${remaining.length === 1 ? 'equipo' : 'equipos'} por sortear`}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={spin} disabled={spinning} className="btn-solid">
              <Shuffle className="h-4 w-4" />
              Girar ruleta
            </button>
            <button type="button" onClick={quick} disabled={spinning} className="btn-outline">
              <Zap className="h-4 w-4" />
              Sorteo rápido
            </button>
          </div>
        </div>
      )}

      {last && !finished && (
        <p className="mt-4 text-center text-[15px]" role="status">
          Salió <span className="font-semibold">{last.name}</span>
        </p>
      )}

      {picked.length > 0 && <div className="mt-8">{preview(picked)}</div>}

      {picked.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {finished && (
            <button type="button" onClick={() => onConfirm(picked.map((t) => t.id))} disabled={busy} className="btn-solid">
              {busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {confirmLabel}
            </button>
          )}
          <button type="button" onClick={reset} disabled={busy || spinning} className="btn-ghost">
            <RotateCcw className="h-4 w-4" />
            Sortear de nuevo
          </button>
        </div>
      )}
    </div>
  )
}
