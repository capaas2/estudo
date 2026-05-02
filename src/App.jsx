import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Home from './pages/Home'
import Tutoria from './pages/Tutoria'
import Materias from './pages/Materias'
import DetalheMateria from './pages/DetalheMateria'
import GerenciarMaterias from './pages/GerenciarMaterias'
import BancoQuestoes from './pages/BancoQuestoes'
import Simulados from './pages/Simulados'
import CriarSimulado from './pages/CriarSimulado'
import ExecutarSimulado from './pages/ExecutarSimulado'
import ResultadoSimulado from './pages/ResultadoSimulado'

function RotaProtegida({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando...</p></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return <div className="loading-container"><div className="loading-spinner" /><p>Carregando...</p></div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*" element={
        <RotaProtegida>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/tutoria" element={<Tutoria />} />
                <Route path="/materias" element={<Materias />} />
                <Route path="/materias/:id" element={<DetalheMateria />} />
                <Route path="/materias/gerenciar" element={<GerenciarMaterias />} />
                <Route path="/questoes" element={<BancoQuestoes />} />
                <Route path="/simulados" element={<Simulados />} />
                <Route path="/simulados/criar" element={<CriarSimulado />} />
                <Route path="/simulados/criar/:materiaId" element={<CriarSimulado />} />
                <Route path="/simulados/:id/executar" element={<ExecutarSimulado />} />
                <Route path="/simulados/:id/resultado" element={<ResultadoSimulado />} />
              </Routes>
            </main>
          </div>
        </RotaProtegida>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
