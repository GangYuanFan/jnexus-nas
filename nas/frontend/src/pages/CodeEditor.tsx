import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

interface Props {
  path: string
  name: string
  onClose: () => void
}

// Simple code editor using a textarea with syntax-aware styling
export default function CodeEditor({ path, name, onClose }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.readFile(path)
        setContent(res.content)
      } catch (err) {
        setMessage('載入檔案失敗')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [path])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dirty && !confirm('有未儲存的變更，確定關閉？')) return
        onClose()
      }
      // Ctrl+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, content])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.saveFile(path, content)
      setDirty(false)
      setMessage('已儲存')
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const ext = name.split('.').pop()?.toLowerCase() || 'txt'

  return (
    <div
      id="editor-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(5,5,10,0.92)',
        backdropFilter: 'blur(24px)',
        padding: '1.5rem',
      }}
    >
      <div className="editor-wrap" style={{
        maxWidth: 1100,
        margin: '0 auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
      }}>
        {/* Header */}
        <div className="editor-head" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          height: 50,
        }}>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>📝</span>
            <span style={{ fontFamily: 'monospace' }}>{name}</span>
            {dirty && <span style={{ color: '#fbbf24', fontSize: 11 }}>● 未儲存</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {message && (
              <span style={{
                fontSize: 12,
                color: message.includes('失敗') ? '#ff5252' : '#4ade80',
              }}>
                {message}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="save-btn"
              style={{
                background: dirty ? '#fff' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: dirty ? '#000' : '#ccc',
                padding: '0.4rem 1rem',
                borderRadius: 10,
                fontSize: 12,
                cursor: dirty ? 'pointer' : 'default',
                fontWeight: dirty ? 600 : 400,
              }}
            >
              {saving ? '儲存中...' : '💾 儲存'}
            </button>
            <button
              onClick={() => {
                if (dirty && !confirm('有未儲存的變更，確定關閉？')) return
                onClose()
              }}
              style={{
                background: 'rgba(255,80,80,0.1)',
                border: '1px solid rgba(255,80,80,0.15)',
                color: '#ff7979',
                padding: '0.4rem 1rem',
                borderRadius: 10,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ✕ 關閉
            </button>
          </div>
        </div>

        {/* Editor */}
        <div style={{
          flex: 1,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'rgba(255,255,255,0.2)',
              fontSize: 14,
            }}>
              載入中...
            </div>
          ) : (
            <textarea
              value={content}
              onChange={e => {
                setContent(e.target.value)
                setDirty(true)
              }}
              style={{
                width: '100%',
                height: '100%',
                background: '#0d0d1a',
                border: 'none',
                color: '#e0e0ff',
                padding: '1.2rem',
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                lineHeight: 1.7,
                resize: 'none',
                outline: 'none',
                tabSize: 2,
                whiteSpace: 'pre',
                overflowWrap: 'normal',
                overflowX: 'auto',
                overflowY: 'auto',
              }}
              spellCheck={false}
              autoFocus
            />
          )}
        </div>
      </div>
    </div>
  )
}
