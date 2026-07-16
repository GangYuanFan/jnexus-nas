import { api } from '../lib/api'
import { useApp } from '../App'

export default function Settings() {
  const { state, refreshConfig, logout } = useApp()
  const config = state.config

  return (
    <div style={{ animation: 'fadeIn 0.3s ease forwards' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        ⚙️ 設定
      </h2>

      {/* Server Config */}
      {config && (
        <div
          className="glass"
          style={{
            padding: '1.5rem',
            borderRadius: 16,
            marginBottom: '1.5rem',
            maxWidth: 600,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>
            🖥️ 伺服器資訊
          </h3>
          {[
            { label: '版本', value: config.version },
            { label: '發布日期', value: config.release_date },
            { label: '根目錄', value: config.root },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.6rem 0',
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
              <span style={{ fontWeight: 500 }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div
        className="glass"
        style={{
          padding: '1.5rem',
          borderRadius: 16,
          maxWidth: 600,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>
          🔧 操作
        </h3>

        <button
          onClick={refreshConfig}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#ccc',
            padding: '0.5rem 1.2rem',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13,
            marginRight: 12,
            marginBottom: 12,
          }}
        >
          🔄 重新整理設定
        </button>

        <button
          onClick={logout}
          style={{
            background: 'rgba(255,50,50,0.1)',
            border: '1px solid rgba(255,50,50,0.15)',
            color: '#ff5252',
            padding: '0.5rem 1.2rem',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          🚪 登出
        </button>
      </div>
    </div>
  )
}
