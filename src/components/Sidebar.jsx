import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, BookOpen, Settings, Database, 
  FileText, ClipboardList, GraduationCap 
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tutoria', label: 'Tutoria IA', icon: GraduationCap },
  { to: '/materias', label: 'Matérias', icon: BookOpen },
  { to: '/materias/gerenciar', label: 'Gerenciar Matérias', icon: Settings },
  { to: '/questoes', label: 'Banco de Questões', icon: Database },
  { to: '/simulados', label: 'Simulados', icon: ClipboardList },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <GraduationCap size={22} color="white" />
        </div>
        <h1>StudyPro</h1>
      </div>
      <nav className="sidebar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          StudyPro v1.0
        </div>
      </div>
    </aside>
  )
}
