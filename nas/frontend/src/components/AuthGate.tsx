import { useState } from 'react'
import { api } from '../lib/api'

interface Props {
  onLogin: (password: string) => void
}

export default function AuthGate({ onLogin }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(password)
      if (res.success) {
        onLogin(password)
      } else {
        setError('密碼錯誤')
      }
    } catch {
      setError('連線失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: '#0a0a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '2.5rem',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🗄️</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 6 }}>J.NAS</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
          輸入密碼以存取 NAS
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密碼"
            autoFocus
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff',
              padding: '0.7rem',
              borderRadius: 12,
              outline: 'none',
              textAlign: 'center',
              marginBottom: '1rem',
              fontSize: 14,
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'rgba(255,255,255,0.3)' : '#fff',
              color: '#000',
              border: 'none',
              padding: '0.7rem',
              borderRadius: 12,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              fontSize: 14,
            }}
          >
            {loading ? '驗證中...' : '登入'}
          </button>
        </form>
        {error && (
          <p style={{ color: '#ff5050', fontSize: 12, marginTop: '0.5rem' }}>{error}</p>
        )}
      </div>
    </div>
  )
}
