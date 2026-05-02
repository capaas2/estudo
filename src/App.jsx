import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Sidebar from './components/Sidebar'
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

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
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
      </ToastProvider>
    </BrowserRouter>
  )
}
