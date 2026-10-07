import { NavLink } from 'react-router-dom'
import { CalendarCheck, ClipboardList, ListOrdered, Shuffle, Trophy, Users } from 'lucide-react'

export const ADMIN_SECTIONS = [
  { to: '/admin/crear', label: 'Campeonato', icon: Trophy },
  { to: '/admin/hoy', label: 'Hoy', icon: CalendarCheck },
  { to: '/admin/equipos', label: 'Equipos', icon: Users },
  { to: '/admin/clasificacion', label: 'Posiciones', icon: ListOrdered },
  { to: '/admin/resultados', label: 'Resultados', icon: ClipboardList },
  { to: '/admin/sorteo', label: 'Sorteo', icon: Shuffle }
]

// Barra tipo píldora inferior: la sección activa se expande y muestra su nombre.
export default function PillNav() {
  return (
    <nav
      aria-label="Secciones del administrador"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pointer-events-none"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <ul className="pointer-events-auto flex items-center gap-0.5 sm:gap-1 rounded-full bg-ink p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        {ADMIN_SECTIONS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                [
                  'flex h-10 sm:h-11 items-center justify-center gap-2 rounded-full transition-all duration-200',
                  isActive
                    ? 'bg-paper text-ink px-3.5 sm:px-4 max-[340px]:px-3'
                    : 'w-10 sm:w-11 max-[340px]:w-8 text-neutral-400 hover:text-paper'
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.4 : 1.8} />
                  {isActive && (
                    <span className="text-[12px] max-[340px]:text-[11px] font-semibold tracking-wide whitespace-nowrap">
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
