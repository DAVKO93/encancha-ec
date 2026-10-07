// Traduce los códigos de error de Firebase a mensajes claros en español.
const MESSAGES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'permission-denied': 'No tienes permiso para realizar esta acción.'
}

export function friendlyError(error) {
  const code = error?.code || ''
  return MESSAGES[code] || 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}
