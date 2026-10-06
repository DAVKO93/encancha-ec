import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homeFor } from '../utils/routes'
import FullScreenLoader from './Loader'
import Logo from './Logo'

function ProfileMissing() {
  const { logout } = useAuth()
  return (
    <div className="min-h-dvh grid place-items-center px-6">
      <div className="max-w-sm text-center">
        <Logo className="h-14 w-auto mx-auto mb-6" />
        <h1 className="text-xl font-semibold tracking-tight">Cuenta sin perfil</h1>
        <p className="mt-3 text-sm text-mute leading-relaxed">
          Tu cuenta existe, pero todavía no tiene un perfil en la plataforma. Si eres el super
          admin, revisa que el documento de tu usuario esté creado en Firestore. Si solicitaste
          acceso como administrador, vuelve a intentarlo.
        </p>
        <button onClick={logout} className="btn-outline mt-6">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

/**
 * allow: lista de roles que pueden entrar ('superadmin' | 'admin').
 * Los administradores solo entran si fueron aprobados.
 */
export default function ProtectedRoute({ allow, children }) {
  const { user, profile, profileState, authReady } = useAuth()

  if (!authReady) return <FullScreenLoader />
  if (!user) return <Navigate to="/" replace />
  if (profileState === 'loading' || profileState === 'idle') return <FullScreenLoader />
  if (profileState === 'missing' || !profile) return <ProfileMissing />

  if (!allow.includes(profile.role)) return <Navigate to={homeFor(profile)} replace />
  if (profile.role === 'admin' && profile.status !== 'approved') {
    return <Navigate to="/pendiente" replace />
  }
  return children
}
