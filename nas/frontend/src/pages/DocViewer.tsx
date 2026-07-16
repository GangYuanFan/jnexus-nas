import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import type { FileEntry } from '../lib/types'

interface Props {
  entry: FileEntry
  onClose: () => void
}

export default function DocViewer({ entry, onClose }: Props) {
  const ext = entry.ext.toLowerCase()
  const isPdf = ext === 'pdf'
  const isWord = ['doc', 'docx'].includes(ext)
  const isExcel = ['xls', 'xlsx'].includes(ext)
  const isPpt = ['ppt', 'pptx'].includes(ext)
  const src = api.viewUrl(entry.path)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const typeBadge = (() => {
    if (isPdf) return { text: 'PDF', className: 'pdf-badge', color: '#ff5252' }
    if (isWord) return { text: 'DOC', className: 'word-badge', color: '#4a8cff' }
    if (isExcel) return { text: 'XLS', className: 'excel-badge', color: '#3dd68c' }
    if (isPpt) return { text: 'PPT', className: 'ppt-badge', color: '#ff7843' }
    return { text: 'DOC', className: '', color: '#fff' }
  })()

  return (
    <div
      id="doc-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(5,5,10,0.9)',
        backdropFilter: 'blur(16px)',
        padding: 0,
      }}
    >
      <div
        className="doc-card"
        style={{
          width: '92%', height: '90%', maxWidth: 1300,
          margin: '2.5vh auto',
          background: '#13131e',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div
          className="doc-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            minHeight: 56,
            flexShrink: 0,
          }}
        >
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            overflow: 'hidden',
          }}>
            <span style={{
              padding: '2px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: `${typeBadge.color}20`,
              color: typeBadge.color,
            }}>
              {typeBadge.text}
            </span>
            <span style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 400,
            }}>
              {entry.name}
            </span>
          </div>
          <div className="doc-actions" style={{ display: 'flex', gap: 10 }}>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#ccc',
                padding: '6px 16px',
                borderRadius: 10,
                fontSize: 13,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              ↗️ 新分頁開啟
            </a>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,80,80,0.1)',
                border: '1px solid rgba(255,80,80,0.15)',
                color: '#ff7979',
                padding: '6px 16px',
                borderRadius: 10,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ✕ 關閉
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="doc-body" style={{ flex: 1, overflow: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}>
          {isPdf ? (
            <iframe
              src={src}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={entry.name}
            />
          ) : (
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + src)}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title={entry.name}
            />
          )}
        </div>
      </div>
    </div>
  )
}
