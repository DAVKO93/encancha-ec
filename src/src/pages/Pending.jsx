import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Clock, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../utils/routes'
import FullScreenLoader from '../components/Loader'
import Logo from '../components/Logo'

// Pantalla para administradores cuya solicitud aún no fue aprobada (o fue rechazada).
export default function Pending() {
  const navigate = useNavigate()
  const { user, profile, profileState, authReady, logout } = useAuth()

  // Si el super admin aprueba mientras la persona espera, entra automáticamente.
  useEffect(() => {
    if (profile?.status === 'approved' || profile?.role === 'superadmin') {
      navigate(homeFor(profile), { replace: true })
    }
  }, [profile, navigate])

  if (!authReady) return <FullScreenLoader />
  if (!user) return <Navigate to="/" replace />
  if (profileState === 'loading' || profileState === 'idle') return <FullScreenLoader />

  const rejected = profile?.status === 'rejected'
  const Icon = rejected ? XCircle : Clock

  return (
    <div className="min-h-dvh grid place-items-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto h-14 w-auto" />
        <div className="mx-auto mt-10 grid h-14 w-14 place-items-center rounded-full border border-ink">
          <Icon className="h-6 w-6" strokeWidth={1.6} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          {rejected ? 'Solicitud no aprobada' : 'Solicitud en revisión'}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute">
          {rejected
            ? 'El super admin no aprobó tu acceso como administrador. Si crees que es un error, comunícate con él directamente.'
            : 'Tu cuenta fue creada. Cuando el super admin apruebe tu solicitud podrás crear y gestionar tus torneos. Esta pantalla se actualiza sola.'}
        </p>
        {profile?.email && (
          <p className="mt-6 text-[12px] uppercase tracking-label text-mute">{profile.email}</p>
        )}
        <button onClick={logout} className="btn-outline mt-8">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
