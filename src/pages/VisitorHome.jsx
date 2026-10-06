import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { ArrowLeft, Trophy } from 'lucide-react'
import { db } from '../firebase'
import Logo from '../components/Logo'
import { Spinner } from '../components/Loader'

const SPORTS = { futbol: 'Fútbol', basquet: 'Básquet' }

// Vista pública: cualquier persona puede ver los torneos sin crear cuenta.
export default function VisitorHome() {
  const [tournaments, setTournaments] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    return onSnapshot(
      collection(db, 'tournaments'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'))
        setTournaments(list)
      },
      (err) => {
        console.error(err)
        setError('No se pudieron cargar los torneos. Revisa tu conexión.')
        setTournaments([])
      }
    )
  }, [])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
            <span className="text-[15px] font-semibold tracking-tight">Encancha.ec</span>
          </Link>
          <Link to="/" className="btn-ghost btn-sm">
            <ArrowLeft className="h-4 w-4" />
            Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="eyebrow">Modo visitante</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Torneos</h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">
          Elige un torneo para ver su cronograma, resultados y tabla de posiciones.
        </p>

        <div className="mt-10">
          {tournaments === null ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="card flex flex-col items-center px-6 py-16 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-ink">
                <Trophy className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <p className="mt-5 text-lg font-semibold tracking-tight">Aún no hay torneos publicados</p>
              <p className="mt-2 max-w-xs text-sm text-mute">
                {error || 'Cuando un administrador cree un campeonato, aparecerá aquí.'}
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {tournaments.map((t) => (
                <li key={t.id} className="card p-5">
                  <p className="eyebrow">{SPORTS[t.sport] || 'Deporte'}</p>
                  <p className="mt-2 text-lg font-semibold tracking-tight">{t.name || 'Torneo sin nombre'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
