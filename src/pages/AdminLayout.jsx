import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { TournamentProvider } from '../context/TournamentContext'
import TopBar from '../components/TopBar'
import PillNav from '../components/PillNav'
import Championships from './admin/Championships'
import TournamentForm from './admin/TournamentForm'
import TournamentManage from './admin/TournamentManage'
import TeamsList from './admin/TeamsList'
import TeamDetail from './admin/TeamDetail'
import Today from './admin/Today'
import Draw from './admin/Draw'
import MatchLive from './admin/MatchLive'
import Standings from './admin/Standings'
import Results from './admin/Results'

function Shell() {
  return (
    <div className="min-h-dvh">
      <TopBar subtitle="Administrador" />
      <main className="mx-auto max-w-3xl px-5 py-10 pb-nav">
        <Outlet />
      </main>
      <PillNav />
    </div>
  )
}

export default function AdminLayout() {
  return (
    <TournamentProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="crear" replace />} />
          <Route path="crear" element={<Championships />} />
          <Route path="crear/nuevo" element={<TournamentForm />} />
          <Route path="crear/:id" element={<TournamentManage />} />
          <Route path="crear/:id/editar" element={<TournamentForm />} />
          <Route path="equipos" element={<TeamsList />} />
          <Route path="equipos/:teamId" element={<TeamDetail />} />
          <Route path="hoy" element={<Today />} />
          <Route path="hoy/:matchId" element={<MatchLive />} />
          <Route path="sorteo" element={<Draw />} />
          <Route path="clasificacion" element={<Standings />} />
          <Route path="resultados" element={<Results />} />
          <Route path="*" element={<Navigate to="crear" replace />} />
        </Route>
      </Routes>
    </TournamentProvider>
  )
}
