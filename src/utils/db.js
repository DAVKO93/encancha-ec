import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Subcolecciones que viven dentro de un campeonato. Se borran junto con él.
// (En la Etapa 3 se agregarán "matches" y lo que haga falta.)
export const SUBCOLLECTIONS = ['groups', 'teams', 'players', 'matches']

// Si no hay conexión, Firebase deja el cambio en cola y la promesa tarda en resolverse.
// Esperamos un tiempo razonable y seguimos: el cambio se sincroniza solo al volver la señal.
// Si el servidor rechaza el cambio (por ejemplo, falta de permiso), el error sí se propaga.
export function saveFast(promise, ms = 6000) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve('queued'), ms))])
}

// Ejecuta tareas en tandas pequeñas en paralelo (cada una es una escritura independiente).
export async function inChunks(items, task, size = 15) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(task))
  }
}

export async function deleteTournamentCascade(tid) {
  for (const name of SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, 'tournaments', tid, name))
    await inChunks(snap.docs, (d) => saveFast(deleteDoc(d.ref), 4000))
  }
  await saveFast(deleteDoc(doc(db, 'tournaments', tid)), 8000)
}

export const DUPLICATE_LEVELS = [
  { id: 'estructura', label: 'Reglas, formato y grupos', hint: 'Sin equipos. Ideal para una nueva edición con equipos distintos.' },
  { id: 'equipos', label: 'Más los equipos', hint: 'Copia los equipos con su logo, color y grupo, sin jugadores.' },
  { id: 'todo', label: 'Todo, incluidos los jugadores', hint: 'Una copia completa del campeonato.' }
]

// Crea un campeonato nuevo a partir de otro. Las fechas se dejan en blanco.
export async function duplicateTournament({ source, name, level, ownerId, ownerName }) {
  const sourceId = source.id
  // eslint-disable-next-line no-unused-vars
  const { id, createdAt, updatedAt, copiedFrom, ...rest } = source
  const newRef = doc(collection(db, 'tournaments'))

  const read = async (sub) => (await getDocs(collection(db, 'tournaments', sourceId, sub))).docs

  const [groupDocs, teamDocs, playerDocs] = await Promise.all([
    read('groups'),
    level === 'estructura' ? [] : read('teams'),
    level === 'todo' ? read('players') : []
  ])

  // El campeonato debe existir antes que sus grupos, equipos y jugadores.
  await saveFast(
    setDoc(newRef, {
      ...rest,
      name,
      startDate: '',
      endDate: '',
      ownerId,
      ownerName,
      copiedFrom: sourceId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }),
    15000
  )

  const groupMap = new Map()
  await inChunks(groupDocs, (g) => {
    const ref = doc(collection(db, 'tournaments', newRef.id, 'groups'))
    groupMap.set(g.id, ref.id)
    return saveFast(setDoc(ref, { ...g.data() }), 4000)
  })

  const teamMap = new Map()
  await inChunks(teamDocs, (t) => {
    const ref = doc(collection(db, 'tournaments', newRef.id, 'teams'))
    teamMap.set(t.id, ref.id)
    const data = t.data()
    return saveFast(
      setDoc(ref, { ...data, groupId: groupMap.get(data.groupId) || '', createdAt: serverTimestamp() }),
      4000
    )
  })

  await inChunks(playerDocs, (p) => {
    const data = p.data()
    const teamId = teamMap.get(data.teamId)
    if (!teamId) return null
    const ref = doc(collection(db, 'tournaments', newRef.id, 'players'))
    return saveFast(setDoc(ref, { ...data, teamId, createdAt: serverTimestamp() }), 4000)
  })

  return newRef.id
}
