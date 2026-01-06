import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import NovaMoto from '@/pages/NovaMoto'
import DetalhesMoto from '@/pages/DetalhesMoto'
import RegistrarTrilha from '@/pages/RegistrarTrilha'
import RegistrarManutencao from '@/pages/RegistrarManutencao'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/motos/nova"
        element={
          <PrivateRoute>
            <NovaMoto />
          </PrivateRoute>
        }
      />
      <Route
        path="/motos/:id"
        element={
          <PrivateRoute>
            <DetalhesMoto />
          </PrivateRoute>
        }
      />
      <Route
        path="/motos/:id/trilha"
        element={
          <PrivateRoute>
            <RegistrarTrilha />
          </PrivateRoute>
        }
      />
      <Route
        path="/motos/:id/manutencao/:manutencaoId"
        element={
          <PrivateRoute>
            <RegistrarManutencao />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
