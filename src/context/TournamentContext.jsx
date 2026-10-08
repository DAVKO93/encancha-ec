import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from './AuthContext'
import { withDefaults } from '../utils/sports'
import { compareMatches } from '../utils/schedule'

export const TournamentContext = createContext(null)

const STORAGE_KEY = 'encancha.activeTournament'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

const byName = (a, b) => (a.name || '').localeCompare(b.name || '', 'es')

/**
 * Mantiene en vivo los campeonatos del administrador y, del campeonato activo,
 * sus grupos, equipos y jugadores.
 */
export function TournamentProvider({ children }) {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState(null)
  const [storedId, setStoredId] = useState(readStored)
  const [rawGroups, setGroups] = useState([])
  const [rawTeams, setTeams] = useState([])
  const [rawPlayers, setPlayers] = useState([])
  const [rawMatches, setMatches] = useState([])
  const [loaded, setLoaded] = useState({ groups: false, teams: false, players: false, matches: false })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return undefined
    const q = query(collection(db, 'tournaments'), where('ownerId', '==', user.uid))
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }))
        list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        setTournaments(list.map(withDefaults))
        setError('')
      },
      (err) => {
        console.error(err)
        setError('No se pudieron cargar tus campeonatos. Revisa tu conexión.')
        setTournaments([])
      }
    )
  }, [user])

  // El campeonato activo es el elegido; si no existe (o se eliminó), el más reciente.
  const active = useMemo(() => {
    if (!tournaments) return null
    return tournaments.find((t) => t.id === storedId) || tournaments[0] || null
  }, [tournaments, storedId])

  const activeId = active?.id || null

  useEffect(() => {
    setGroups([])
    setTeams([])
    setPlayers([])
    setMatches([])
    setLoaded({ groups: false, teams: false, players: false, matches: false })
    if (!activeId) return undefined

    const listen = (name, setter) =>
      onSnapshot(
        collection(db, 'tournaments', activeId, name),
        (snap) => {
          setter(snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })))
          setLoaded((l) => ({ ...l, [name]: true }))
        },
        (err) => {
          console.error(err)
          setLoaded((l) => ({ ...l, [name]: true }))
        }
      )

    const unsubs = [listen('groups', setGroups), listen('teams', setTeams), listen('players', setPlayers), listen('matches', setMatches)]
    return () => unsubs.forEach((u) => u())
  }, [activeId])

  const setActiveId = useCallback((id) => {
    setStoredId(id)
    writeStored(id)
  }, [])

  const groups = useMemo(
    () => [...rawGroups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || byName(a, b)),
    [rawGroups]
  )
  const teams = useMemo(() => [...rawTeams].sort(byName), [rawTeams])
  const players = useMemo(
    () => [...rawPlayers].sort((a, b) => (a.number ?? 0) - (b.number ?? 0) || byName(a, b)),
    [rawPlayers]
  )

  const matches = useMemo(() => [...rawMatches].sort(compareMatches), [rawMatches])

  const tournamentsReady = tournaments !== null
  const dataReady = tournamentsReady && (!activeId || (loaded.groups && loaded.teams && loaded.players && loaded.matches))

  const value = useMemo(
    () => ({
      tournaments: tournaments || [],
      tournamentsReady,
      active,
      activeId,
      setActiveId,
      groups,
      teams,
      players,
      matches,
      dataReady,
      error
    }),
    [tournaments, tournamentsReady, active, activeId, setActiveId, groups, teams, players, matches, dataReady, error]
  )

  return <TournamentContext.Provider value={value}>{children}</TournamentContext.Provider>
}

export function useTournaments() {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error('useTournaments debe usarse dentro de TournamentProvider')
  return ctx
}
