import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { Check, UserCheck, X } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { friendlyError } from '../utils/authErrors'
import TopBar from '../components/TopBar'
import { Spinner } from '../components/Loader'

const FILTERS = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'rejected', label: 'Rechazados' }
]

const EMPTY = {
  pending: 'No hay solicitudes pendientes.',
  approved: 'Todavía no has aprobado administradores.',
  rejected: 'No hay solicitudes rechazadas.'
}

function formatDate(ts) {
  const d = ts?.toDate?.()
  return d ? d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
}

export default function SuperAdmin() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'admin'))
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setAdmins(list)
      },
      (err) => {
        console.error(err)
        setError(friendlyError(err))
        setAdmins([])
      }
    )
  }, [])

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 }
    admins?.forEach((a) => {
      if (c[a.status] !== undefined) c[a.status] += 1
    })
    return c
  }, [admins])

  const visible = useMemo(() => (admins || []).filter((a) => a.status === filter), [admins, filter])

  const setStatus = async (id, status) => {
    setBusyId(id)
    setError('')
    try {
      await updateDoc(doc(db, 'users', id), {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid
      })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-dvh">
      <TopBar subtitle="Super administrador" />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="eyebrow">Panel de control</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Administradores</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">
          Aprueba o rechaza a quienes quieren crear torneos en Encancha.ec.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`rounded-2xl border p-4 text-left transition ${
                filter === f.id ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
              }`}
            >
              <span className="block text-3xl font-semibold tracking-tight">{counts[f.id]}</span>
              <span
                className={`mt-1 block text-[11px] font-semibold uppercase tracking-label ${
                  filter === f.id ? 'text-neutral-400' : 'text-mute'
                }`}
              >
                {f.label}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-6 border-l-2 border-ink pl-3 text-sm">
            {error}
          </p>
        )}

        <div className="mt-6">
          {admins === null ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : visible.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-14 text-center">
              <UserCheck className="h-6 w-6 text-mute" strokeWidth={1.5} />
              <p className="mt-4 text-sm text-mute">{EMPTY[filter]}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((a) => (
                <li key={a.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold tracking-tight">{a.name || 'Sin nombre'}</p>
                    <p className="truncate text-sm text-mute">{a.email}</p>
                    {a.createdAt && (
                      <p className="mt-1 text-[11px] uppercase tracking-label text-mute">
                        Solicitó el {formatDate(a.createdAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {busyId === a.id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <>
                        {a.status !== 'approved' && (
                          <button onClick={() => setStatus(a.id, 'approved')} className="btn-solid btn-sm">
                            <Check className="h-4 w-4" />
                            Aprobar
                          </button>
                        )}
                        {a.status === 'pending' && (
                          <button onClick={() => setStatus(a.id, 'rejected')} className="btn-outline btn-sm">
                            <X className="h-4 w-4" />
                            Rechazar
                          </button>
                        )}
                        {a.status === 'approved' && (
                          <button onClick={() => setStatus(a.id, 'rejected')} className="btn-outline btn-sm">
                            Revocar acceso
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
