import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { TrashEntry } from '../lib/types'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function Trash() {
  const [entries, setEntries] = useState<TrashEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadTrash = async () => {
    setLoading(true)
    try {
      const data = await api.listTrash()
      setEntries(data)
    } catch (err) {
      console.error('Failed to load trash', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTrash() }, [])

  const handleRestore = async (path: string) => {
    try {
      await api.restoreTrash(path)
      loadTrash()
    } catch (err) {
      console.error('Restore failed', err)
    }
  }

  const handleDelete = async (path: string) => {
    if (!confirm('確定永久刪除此項目？')) return
    try {
      await api.deleteTrash(path)
      loadTrash()
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const handleEmptyTrash = async () => {
    if (!confirm('確定清空垃圾桶？此操作無法復原。')) return
    try {
      await api.emptyTrash()
      loadTrash()
    } catch (err) {
      console.error('Empty trash failed', err)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease forwards' }}>
      <div className="page-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          🗑️ 垃圾桶
        </h2>
        {entries.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            style={{
              background: 'rgba(255,50,50,0.1)',
              border: '1px solid rgba(255,50,50,0.15)',
              color: '#ff5252',
              padding: '0.4rem 0.8rem',
              borderRadius: 10,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🗑️ 清空垃圾桶
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div style={{
            width: 24, height: 24,
            border: '3px solid rgba(255,255,255,0.06)',
            borderTopColor: 'rgba(255,255,255,0.5)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      ) : entries.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1rem',
          color: 'rgba(255,255,255,0.25)',
          fontSize: 14,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
          垃圾桶是空的
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}>
          {entries.map((entry, i) => (
            <div
              key={i}
              className="trash-entry"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                gap: 12,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ fontSize: 22, width: 36, textAlign: 'center', flexShrink: 0 }}>
                {entry.type === 'dir' ? '📁' : '📄'}
              </div>
              <div className="info" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e0e0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.name}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {entry.original_path}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                  {formatSize(entry.size)} · 刪除於 {new Date(entry.deleted_at).toLocaleString('zh-TW')}
                </div>
              </div>
              <div className="actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleRestore(entry.path)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(0,242,255,0.15)',
                    fontSize: 12,
                    cursor: 'pointer',
                    background: 'rgba(0,242,255,0.1)',
                    color: '#00f2ff',
                  }}
                >
                  ↩️ 還原
                </button>
                <button
                  onClick={() => handleDelete(entry.path)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,50,50,0.15)',
                    fontSize: 12,
                    cursor: 'pointer',
                    background: 'rgba(255,50,50,0.1)',
                    color: '#ff5252',
                  }}
                >
                  🗑️ 刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .trash-entry:hover { background: rgba(255,255,255,0.04) !important; }
        .trash-entry button:hover { filter: brightness(1.3); }
      `}</style>
    </div>
  )
}
