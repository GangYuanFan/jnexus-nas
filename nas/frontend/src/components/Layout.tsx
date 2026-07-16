import { useApp } from '../App'
import { useState } from 'react'

interface Props {
  children: React.ReactNode
}

const navItems = [
  { id: 'dashboard' as const, icon: '📊', label: '儀表板' },
  { id: 'files' as const, icon: '📁', label: '檔案' },
  { id: 'trash' as const, icon: '🗑️', label: '垃圾桶' },
  { id: 'terminal' as const, icon: '💻', label: '終端' },
  { id: 'settings' as const, icon: '⚙️', label: '設定' },
  { id: 'webdav' as const, icon: '🔗', label: 'WebDAV' },
]

export default function Layout({ children }: Props) {
  const { state, setPage, logout } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Sidebar */}
      <nav
        className={sidebarOpen ? 'open' : ''}
        style={{
          width: 80,
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '1.5rem 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 50,
          transition: 'transform 0.3s ease',
        } as React.CSSProperties}
      >
        <div
          style={{
            padding: '0 0 1.5rem',
            fontSize: '1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '1rem',
            width: '100%',
            textAlign: 'center',
          }}
        >
          🗄️
        </div>

        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${state.page === item.id ? 'active' : ''}`}
            onClick={() => {
              setPage(item.id)
              setSidebarOpen(false)
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{
              fontSize: 9,
              marginTop: 4,
              whiteSpace: 'nowrap',
            }}>
              {item.label}
            </span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Logout */}
        <div
          className="nav-item"
          onClick={() => setShowLogout(true)}
          style={{ marginBottom: '1rem' }}
        >
          <span style={{ fontSize: 18 }}>🚪</span>
          <span style={{ fontSize: 9, marginTop: 4 }}>登出</span>
        </div>
      </nav>

      {/* Main */}
      <main
        style={{
          flex: 1,
          marginLeft: 80,
          padding: '1.5rem 2rem',
          maxWidth: '100%',
          overflow: 'auto',
          height: '100vh',
        }}
      >
        {children}
      </main>

      {/* Mobile sidebar toggle */}
      <button
        id="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 60,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
          width: 40,
          height: 40,
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 18,
        } as React.CSSProperties}
      >
        ☰
      </button>

      {/* Logout confirm modal */}
      {showLogout && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowLogout(false)}
        >
          <div
            className="glass"
            style={{
              padding: '2rem',
              borderRadius: 16,
              maxWidth: 320,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ marginBottom: '1.5rem', fontSize: 14 }}>
              確定要登出嗎？
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowLogout(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#ccc',
                  padding: '0.5rem 1.5rem',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                取消
              </button>
              <button
                onClick={logout}
                style={{
                  background: 'rgba(255,50,50,0.15)',
                  border: '1px solid rgba(255,50,50,0.2)',
                  color: '#ff5252',
                  padding: '0.5rem 1.5rem',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                登出
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          nav { transform: translateX(-100%); }
          nav.open { transform: translateX(0); }
          main { margin-left: 0; padding: 1rem; padding-top: 3.5rem; }
          #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
