import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [profile, setProfile] = useState(null)
  // idle: sin sesión | loading: buscando perfil | ready: perfil listo | missing: no existe perfil
  const [profileState, setProfileState] = useState('idle')

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
      if (!u) {
        setProfile(null)
        setProfileState('idle')
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return undefined
    setProfileState('loading')
    let timer
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        clearTimeout(timer)
        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() })
          setProfileState('ready')
        } else {
          setProfile(null)
          // Al registrarse, el perfil se crea unos instantes después que la cuenta.
          timer = setTimeout(() => setProfileState('missing'), 2500)
        }
      },
      (err) => {
        console.error('No se pudo leer el perfil', err)
        setProfileState('missing')
      }
    )
    return () => {
      clearTimeout(timer)
      unsub()
    }
  }, [user])

  const value = useMemo(
    () => ({
      user,
      profile,
      profileState,
      authReady,
      login: (email, password) => signInWithEmailAndPassword(auth, email.trim(), password),
      logout: () => signOut(auth),
      resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
      // Solicitud de acceso: crea la cuenta y deja el perfil "pendiente" hasta que
      // el super admin lo apruebe.
      requestAdminAccess: async ({ name, email, password }) => {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(cred.user, { displayName: name.trim() })
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'admin',
          status: 'pending',
          createdAt: serverTimestamp()
        })
      }
    }),
    [user, profile, profileState, authReady]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
