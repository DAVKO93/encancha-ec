import { initials } from '../utils/format'
import { textOn } from '../utils/excelColors'

// Escudo de un equipo o campeonato: su logo, o sus iniciales sobre su color.
export default function TeamBadge({ item, size = 44, rounded = 'rounded-full' }) {
  const style = { width: size, height: size, minWidth: size }
  if (item?.logo) {
    return (
      <img
        src={item.logo}
        alt=""
        style={style}
        className={`${rounded} border border-line bg-white object-contain`}
        draggable="false"
      />
    )
  }
  const bg = item?.color || '#070605'
  return (
    <span
      aria-hidden="true"
      style={{ ...style, background: bg, color: textOn(bg), fontSize: Math.max(10, size * 0.3) }}
      className={`${rounded} grid place-items-center border border-black/10 font-semibold tracking-tight`}
    >
      {initials(item?.name, item?.shortName)}
    </span>
  )
}
