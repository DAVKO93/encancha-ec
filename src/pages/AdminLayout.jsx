import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { CalendarCheck, ClipboardList, ListOrdered, Shuffle, Trophy, Users } from 'lucide-react'
import TopBar from '../components/TopBar'
import PillNav from '../components/PillNav'

function Section({ icon: Icon, eyebrow, title, description, stage }) {
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

const SECTIONS = [
  {
    path: 'crear',
    icon: Trophy,
    eyebrow: 'Campeonato',
    title: 'Crear campeonato',
    description:
      'Elige el deporte, configura tiempos y reglas, y registra grupos, equipos y jugadores con su logo y color.',
    stage: 'Etapa 2'
  },
  {
    path: 'hoy',
    icon: CalendarCheck,
    eyebrow: 'Calendario',
    title: 'Encuentros de hoy',
    description: 'Los partidos programados para hoy. Entra a uno para pitarlo en vivo.',
    stage: 'Etapa 3'
  },
  {
    path: 'equipos',
    icon: Users,
    eyebrow: 'Plantillas',
    title: 'Lista de equipos',
    description: 'Todos los equipos de tu campeonato con sus jugadores, grupos y colores.',
    stage: 'Etapa 2'
  },
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
  },
  {
    path: 'sorteo',
    icon: Shuffle,
    eyebrow: 'Sorteo',
    title: 'Sorteo de encuentros',
    description: 'Ruleta aleatoria para definir los enfrentamientos según grupo y equipo.',
    stage: 'Etapa 3'
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
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to="crear" replace />} />
        {SECTIONS.map(({ path, ...rest }) => (
          <Route key={path} path={path} element={<Section {...rest} />} />
        ))}
        <Route path="*" element={<Navigate to="crear" replace />} />
      </Route>
    </Routes>
  )
}
