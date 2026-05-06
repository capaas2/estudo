import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  LayoutDashboard, BookOpen, Settings, Database, 
  FileText, ClipboardList, GraduationCap, LogOut, User, Users
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
  const { user, logout } = useAuth()
  const [userCount, setUserCount] = useState(null)

  const isGustavo = user?.email === 'gustavocapaz06@gmail.com'

  useEffect(() => {
    async function fetchUserCount() {
      if (isGustavo) {
        const { data, error } = await supabase.rpc('get_user_count')
        if (!error && data !== null) {
          setUserCount(data)
        }
      }
    }
    fetchUserCount()
  }, [isGustavo])

  const nomeUsuario = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="logo-icon">
            <GraduationCap size={22} color="white" />
          </div>
          <h1>StudyPro</h1>
        </div>
        {isGustavo && userCount !== null && (
          <div 
            title="Total de usuários cadastrados"
            style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto'
            }}
          >
            <Users size={14} color="var(--primary-color, #8b5cf6)" />
            {userCount}
          </div>
        )}
      </div>

      {/* Info do Usuário */}
      <div style={{
        padding: '12px 16px', margin: '0 8px 8px',
        background: 'rgba(255,255,255,0.04)', borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <User size={16} color="white" />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nomeUsuario}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </div>
        </div>
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
      <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '10px 14px', border: 'none', borderRadius: 8,
            background: 'rgba(239,68,68,0.08)', color: '#f87171',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.15)'}
          onMouseLeave={e => e.target.style.background = 'rgba(239,68,68,0.08)'}
        >
          <LogOut size={16} />
          Sair
        </button>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
          StudyPro v2.0
        </div>
      </div>
    </aside>
  )
}
