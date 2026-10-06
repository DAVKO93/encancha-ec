import { LogOut } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

export default function TopBar({ subtitle }) {
  const { profile, user, logout } = useAuth()
  const name = profile?.name || user?.displayName || user?.email || ''
  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Logo className="h-9 w-auto shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-[15px] font-semibold tracking-tight">Encancha.ec</p>
            {subtitle && <p className="truncate text-[11px] text-mute">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {name && (
            <span className="hidden sm:block max-w-[160px] truncate text-[13px] text-mute">{name}</span>
          )}
          <button onClick={logout} className="btn-ghost btn-sm" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
