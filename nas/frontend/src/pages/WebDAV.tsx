import { api } from '../lib/api'

export default function WebDAV() {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease forwards', textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontSize: 48, marginBottom: '1rem' }}>🔗</div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>
        WebDAV
      </h2>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem', maxWidth: 400, margin: '0 auto 1.5rem' }}>
        使用 WebDAV 客戶端（如 RaiDrive、Cyberduck）連接到 NAS，享受如同本機檔案總管的體驗。
      </p>

      <div
        className="glass"
        style={{
          display: 'inline-block',
          padding: '1.5rem 2rem',
          borderRadius: 16,
          textAlign: 'left',
          minWidth: 320,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>連線資訊</h3>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>連線網址</div>
          <div style={{
            background: 'rgba(0,242,255,0.05)',
            border: '1px solid rgba(0,242,255,0.1)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: '#00f2ff',
            wordBreak: 'break-all',
          }}>
            {window.location.origin}{api.webdavUrl()}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>使用者名稱</div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
          }}>
            admin
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>密碼</div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
          }}>
            （使用 NAS 密碼）
          </div>
        </div>
      </div>
    </div>
  )
}
