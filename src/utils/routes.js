// Decide a qué pantalla debe ir una persona según su rol y estado.
export function homeFor(profile) {
  if (!profile) return '/'
  if (profile.role === 'superadmin') return '/super'
  if (profile.role === 'admin' && profile.status === 'approved') return '/admin'
  return '/pendiente'
}
