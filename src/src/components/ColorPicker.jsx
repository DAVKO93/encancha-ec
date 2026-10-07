import { Check } from 'lucide-react'
import { EXCEL_COLORS, excelColor, textOn } from '../utils/excelColors'

// Selector con los 56 colores de índice de Excel.
export default function ColorPicker({ value, onChange }) {
  const current = excelColor(value)
  return (
    <div>
      <div role="radiogroup" aria-label="Color" className="grid grid-cols-8 gap-2">
        {EXCEL_COLORS.map((c) => {
          const selected = c.index === current.index
          return (
            <button
              key={c.index}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${c.name} (índice ${c.index})`}
              title={`${c.name} · ${c.index}`}
              onClick={() => onChange(c.index)}
              style={{ background: c.hex, color: textOn(c.hex) }}
              className={`relative grid aspect-square place-items-center rounded-full border transition ${
                selected ? 'border-ink ring-2 ring-ink ring-offset-2' : 'border-black/15 hover:scale-110'
              }`}
            >
              {selected && <Check className="h-4 w-4" strokeWidth={3} />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[13px] text-mute">
        {current.name} <span className="text-neutral-400">· índice {current.index} · {current.hex}</span>
      </p>
    </div>
  )
}
