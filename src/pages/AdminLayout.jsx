import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ClipboardList, ListOrdered } from 'lucide-react'
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

// Secciones que se activan en las siguientes etapas.
function Upcoming({ icon: Icon, eyebrow, title, description, stage }) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-mute">{description}</p>

      <div className="card mt-10 flex flex-col items-center px-6 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full border border-ink">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <p className="mt-5 text-lg font-semibold tracking-tight">Esta sección se activa en la {stage}</p>
        <p className="mt-2 max-w-xs text-sm text-mute">
          La estructura y la navegación ya están listas para recibirla.
        </p>
      </div>
    </>
  )
}

const UPCOMING = [
  {
    path: 'clasificacion',
    icon: ListOrdered,
    eyebrow: 'Posiciones',
    title: 'Clasificación',
    description: 'Tabla de posiciones por grupo, calculada automáticamente con cada resultado.',
    stage: 'Etapa 5'
  },
  {
    path: 'resultados',
    icon: ClipboardList,
    eyebrow: 'Historial',
    title: 'Lista de resultados',
    description: 'Todos los partidos jugados, con opción de exportar cada informe en PDF.',
    stage: 'Etapa 5'
  }
]

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
          <Route path="sorteo" element={<Draw />} />
          {UPCOMING.map(({ path, ...rest }) => (
            <Route key={path} path={path} element={<Upcoming {...rest} />} />
          ))}
          <Route path="*" element={<Navigate to="crear" replace />} />
        </Route>
      </Routes>
    </TournamentProvider>
  )
}
