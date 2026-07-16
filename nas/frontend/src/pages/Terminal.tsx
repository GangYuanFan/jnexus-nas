import { useEffect } from 'react'
import { api } from '../lib/api'

export default function Terminal() {
  useEffect(() => {
    // Open terminal in new tab or iframe
    const termUrl = api.terminalUrl()
    window.open(termUrl, '_blank')
  }, [])

  return (
    <div style={{ animation: 'fadeIn 0.3s ease forwards', textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontSize: 48, marginBottom: '1rem' }}>💻</div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>
        終端機
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
        終端機已在新的分頁中開啟
      </p>
      <button
        onClick={() => window.open(api.terminalUrl(), '_blank')}
        style={{
          background: '#fff',
          border: 'none',
          color: '#000',
          padding: '0.6rem 1.5rem',
          borderRadius: 12,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        再次開啟終端機
      </button>
    </div>
  )
}
