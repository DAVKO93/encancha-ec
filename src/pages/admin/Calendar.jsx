import { useState } from 'react'
import { CalendarClock, Plus } from 'lucide-react'
import { useTournaments } from '../../context/TournamentContext'
import { friendlyError } from '../../utils/authErrors'
import { inChunks, saveFast, updateMatch } from '../../utils/db'
import { compareMatches, scheduleMatches } from '../../utils/schedule'
import MatchModal from '../../components/MatchModal'
import Modal from '../../components/Modal'
import ScheduleList from '../../components/ScheduleList'
import ScheduleSettings, { useSchedule } from '../../components/ScheduleSettings'
import { Spinner } from '../../components/Loader'
import { EmptyState, ErrorList } from '../../components/ui'

// Calendario del campeonato activo: ver, editar y reprogramar partidos.
export default function Calendar({ onGoDraw }) {
  const { active: t, teams, groups, matches } = useTournaments()
  const [modal, setModal] = useState(null) // null | { match? }
  const [rescheduling, setRescheduling] = useState(false)
  const [settings, setSettings] = useSchedule(t)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState([])

  const pending = matches.filter((m) => m.status === 'scheduled')

  const reschedule = async () => {
    if (!settings.startDate) return setErrors(['Elige el primer día.'])
    setBusy(true)
    setErrors([])
    try {
      const ordered = [...pending].sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || compareMatches(a, b))
      const result = scheduleMatches(ordered, settings)
      await inChunks(result, (m) =>
        saveFast(updateMatch(t.id, m.id, { date: m.date, time: m.time, court: m.court }), 4000)
      )
      setRescheduling(false)
    } catch (err) {
      console.error(err)
      setErrors([friendlyError(err)])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setModal({})} disabled={teams.length < 2} className="btn-solid btn-sm">
          <Plus className="h-4 w-4" />
          Agregar partido
        </button>
        {pending.length > 0 && (
          <button onClick={() => setRescheduling(true)} className="btn-outline btn-sm">
            <CalendarClock className="h-4 w-4" />
            Reprogramar fechas
          </button>
        )}
      </div>

      <div className="mt-8">
        {matches.length === 0 ? (
          <EmptyState title="Aún no hay partidos" text="Haz el sorteo para generar el calendario, o agrega partidos a mano.">
            <button onClick={onGoDraw} className="btn-solid">
              Ir al sorteo
            </button>
          </EmptyState>
        ) : (
          <ScheduleList matches={matches} teams={teams} groups={groups} onEdit={(match) => setModal({ match })} />
        )}
      </div>

      <MatchModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        tournament={t}
        teams={teams}
        groups={groups}
        matches={matches}
        match={modal?.match}
      />

      <Modal
        open={rescheduling}
        onClose={busy ? () => {} : () => setRescheduling(false)}
        title="Reprogramar fechas"
        footer={
          <>
            <button onClick={() => setRescheduling(false)} disabled={busy} className="btn-outline btn-sm">
              Cancelar
            </button>
            <button onClick={reschedule} disabled={busy} className="btn-solid btn-sm">
              {busy ? <Spinner className="h-4 w-4" /> : 'Reprogramar'}
            </button>
          </>
        }
      >
        <p className="mb-5 text-sm leading-relaxed text-mute">
          Se vuelven a repartir las fechas, horas y canchas de los {pending.length} partidos que aún no se juegan. Los
          partidos ya jugados no cambian.
        </p>
        <ScheduleSettings value={settings} onChange={setSettings} />
        <div className="mt-4">
          <ErrorList errors={errors} />
        </div>
      </Modal>
    </>
  )
}
