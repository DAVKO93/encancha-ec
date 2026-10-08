import { useEffect, useRef, useState } from 'react'
import { initials } from '../utils/format'

const SIZE = 320
const R = 150
const SPIN_MS = 4200

const polar = (angleDeg, radius) => {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [SIZE / 2 + radius * Math.cos(a), SIZE / 2 + radius * Math.sin(a)]
}

function slicePath(i, step) {
  const [x1, y1] = polar(i * step, R)
  const [x2, y2] = polar((i + 1) * step, R)
  return `M ${SIZE / 2} ${SIZE / 2} L ${x1} ${y1} A ${R} ${R} 0 ${step > 180 ? 1 : 0} 1 ${x2} ${y2} Z`
}

const shortLabel = (item, count) => {
  const max = count > 14 ? 3 : count > 8 ? 9 : 13
  if (count > 14) return initials(item.label, item.short)
  const text = item.label || ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/**
 * Ruleta. Se le dice qué elemento debe salir (winnerId) y cada vez que cambia "spinKey"
 * gira y se detiene señalando a ese elemento. Al terminar llama a onDone.
 */
export default function Roulette({ items, winnerId, spinKey, onDone }) {
  const [rotation, setRotation] = useState(0)
  const [animating, setAnimating] = useState(false)
  const rotationRef = useRef(0)
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const lastKey = useRef(spinKey)

  const count = items.length
  const step = 360 / Math.max(count, 1)

  // Si cambian los elementos (porque ya salió uno), la rueda vuelve a empezar sin animación.
  useEffect(() => {
    rotationRef.current = 0
    setAnimating(false)
    setRotation(0)
  }, [count])

  useEffect(() => {
    if (spinKey === lastKey.current) return undefined
    lastKey.current = spinKey
    const index = items.findIndex((it) => it.id === winnerId)
    if (index < 0) return undefined

    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const jitter = (Math.random() - 0.5) * step * 0.6
    const center = (index + 0.5) * step + jitter
    const base = rotationRef.current
    const delta = (((-center - base) % 360) + 360) % 360
    const target = base + 360 * (reduce ? 1 : 5) + delta
    rotationRef.current = target
    setAnimating(true)
    setRotation(target)

    const timer = setTimeout(() => doneRef.current?.(), reduce ? 400 : SPIN_MS + 150)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey])

  if (count === 0) return null

  return (
    <div className="relative mx-auto" style={{ width: '100%', maxWidth: SIZE }}>
      {/* Flecha fija que señala al ganador */}
      <svg viewBox="0 0 24 24" className="absolute left-1/2 top-0 z-10 h-7 w-7 -translate-x-1/2 -translate-y-1" aria-hidden="true">
        <path d="M12 22 L3 4 L21 4 Z" fill="#6b7e8c" stroke="#070605" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Ruleta del sorteo"
        className="block w-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animating ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.6, 0.1, 1)` : 'none'
        }}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R + 6} fill="#070605" />
        {count === 1 ? (
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="#ffffff" />
        ) : (
          items.map((it, i) => {
            const dark = i % 2 === 0 && !(count % 2 === 1 && i === count - 1)
            const odd = count % 2 === 1 && i === count - 1
            const fill = odd ? '#6b7e8c' : dark ? '#070605' : '#ffffff'
            const text = odd ? '#ffffff' : dark ? '#ffffff' : '#070605'
            const mid = (i + 0.5) * step
            const [tx, ty] = polar(mid, R * 0.62)
            return (
              <g key={it.id}>
                <path d={slicePath(i, step)} fill={fill} stroke="#6b7e8c" strokeWidth="1" />
                <text
                  x={tx}
                  y={ty}
                  fill={text}
                  fontSize={count > 14 ? 13 : count > 8 ? 12 : 14}
                  fontWeight="600"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid > 180 ? mid + 90 : mid - 90} ${tx} ${ty})`}
                  style={{ fontFamily: 'inherit' }}
                >
                  {shortLabel(it, count)}
                </text>
              </g>
            )
          })
        )}
        <circle cx={SIZE / 2} cy={SIZE / 2} r="22" fill="#ffffff" stroke="#070605" strokeWidth="3" />
      </svg>
    </div>
  )
}
