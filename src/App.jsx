import { Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './firebase'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import SetupNeeded from './pages/SetupNeeded'
import Login from './pages/Login'
import Pending from './pages/Pending'
import VisitorHome from './pages/VisitorHome'
import SuperAdmin from './pages/SuperAdmin'
import AdminLayout from './pages/AdminLayout'

export default function App() {
  if (!isConfigured) return <SetupNeeded />

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/visitante" element={<VisitorHome />} />
        <Route path="/pendiente" element={<Pending />} />
        <Route
          path="/super"
          element={
            <ProtectedRoute allow={['superadmin']}>
              <SuperAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allow={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
