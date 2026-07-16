import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { api } from './lib/api'
import type { ServerConfig } from './lib/types'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import FileManager from './pages/FileManager'
import Trash from './pages/Trash'
import Terminal from './pages/Terminal'
import Settings from './pages/Settings'
import WebDAV from './pages/WebDAV'

type Page = 'dashboard' | 'files' | 'trash' | 'terminal' | 'settings' | 'webdav'

interface AppState {
  authenticated: boolean
  page: Page
  config: ServerConfig | null
  currentPath: string
}

export const AppContext = createContext<{
  state: AppState
  setPage: (p: Page) => void
  setPath: (p: string) => void
  logout: () => void
  refreshConfig: () => Promise<void>
} | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export default function App() {
  const [state, setState] = useState<AppState>({
    authenticated: false,
    page: 'dashboard',
    config: null,
    currentPath: '/',
  })

  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await api.getConfig()
      setState(s => ({ ...s, config: cfg }))
    } catch {}
  }, [])

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('nas_password')
    if (stored) {
      api.setPassword(stored)
      // Try loading config to verify password works
      refreshConfig().then(() => {
        // If config loaded successfully, password is still valid
        setState(s => ({ ...s, authenticated: true }))
      }).catch(() => {
        // Password expired or wrong — clear it
        localStorage.removeItem('nas_password')
        api.clearPassword()
      })
    }
  }, [refreshConfig])

  const setPage = useCallback((page: Page) => {
    setState(s => ({ ...s, page }))
  }, [])

  const setPath = useCallback((path: string) => {
    setState(s => ({ ...s, currentPath: path }))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('nas_password')
    api.clearPassword()
    setState(s => ({ ...s, authenticated: false }))
  }, [])

  const handleLogin = useCallback((password: string) => {
    localStorage.setItem('nas_password', password)
    api.setPassword(password)
    setState(s => ({ ...s, authenticated: true }))
    refreshConfig()
  }, [refreshConfig])

  if (!state.authenticated) {
    return <AuthGate onLogin={handleLogin} />
  }

  const renderPage = () => {
    switch (state.page) {
      case 'dashboard': return <Dashboard />
      case 'files': return <FileManager />
      case 'trash': return <Trash />
      case 'terminal': return <Terminal />
      case 'settings': return <Settings />
      case 'webdav': return <WebDAV />
    }
  }

  return (
    <AppContext.Provider value={{ state, setPage, setPath, logout, refreshConfig }}>
      <Layout>
        {renderPage()}
      </Layout>
    </AppContext.Provider>
  )
}
