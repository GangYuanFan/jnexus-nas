import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { useApp } from '../App'
import type { FileEntry } from '../lib/types'
import MediaPlayer from './MediaPlayer'
import DocViewer from './DocViewer'
import CodeEditor from './CodeEditor'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(ts: string): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ts
  }
}

const mediaExts = new Set(['jpg','jpeg','png','gif','webp','svg','bmp','mp4','webm','mkv','mov','avi','mp3','wav','ogg','flac','m4a'])

export default function FileManager() {
  const { state: { currentPath }, setPath } = useApp()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'gallery'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FileEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null)
  const [mediaFile, setMediaFile] = useState<FileEntry | null>(null)
  const [docFile, setDocFile] = useState<FileEntry | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [sharePath, setSharePath] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [editFile, setEditFile] = useState<FileEntry | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const loadFiles = useCallback(async (path: string) => {
    setLoading(true)
    try {
      const res = await api.listFiles(path)
      setEntries(res.entries)
      setBreadcrumbs(res.path.split('/').filter(Boolean))
      setSelected(new Set())
    } catch (err) {
      console.error('Failed to load files', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles(currentPath)
  }, [currentPath, loadFiles])

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await api.searchFiles(searchQuery)
        setSearchResults(res.entries)
      } catch {
        setSearchResults([])
      }
    }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery])

  const navigateTo = (path: string) => {
    setPath(path)
    setSearchQuery('')
    setSearchResults([])
  }

  const handleFileClick = (entry: FileEntry) => {
    if (selected.size > 0) {
      toggleSelect(entry.path)
      return
    }
    if (entry.type === 'dir') {
      navigateTo(entry.path)
    } else if (entry.is_image || entry.is_video || entry.is_audio) {
      setMediaFile(entry)
    } else if (entry.is_doc) {
      setDocFile(entry)
    } else if (['txt', 'md', 'py', 'js', 'ts', 'jsx', 'tsx', 'json', 'yml', 'yaml', 'xml', 'css', 'scss', 'html', 'sh', 'bash', 'conf', 'ini', 'cfg', 'log', 'env', 'gitignore'].includes(entry.ext)) {
      setEditFile(entry)
    }
  }

  const toggleSelect = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, entry })
  }

  const handleDelete = async () => {
    if (selected.size === 0) return
    try {
      await api.deleteFiles(Array.from(selected))
      loadFiles(currentPath)
    } catch (err) {
      console.error('Delete failed', err)
    }
    setShowDeleteConfirm(false)
  }

  const handleRename = async (oldPath: string) => {
    const name = prompt('新名稱:', oldPath.split('/').pop())
    if (!name) return
    try {
      await api.renameFile(oldPath, name)
      loadFiles(currentPath)
    } catch (err) {
      console.error('Rename failed', err)
    }
    setCtxMenu(null)
  }

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await api.createFolder(`${currentPath}/${newFolderName}`)
      loadFiles(currentPath)
    } catch (err) {
      console.error('Create folder failed', err)
    }
    setShowNewFolder(false)
    setNewFolderName('')
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const formData = new FormData()
    for (const file of Array.from(files)) {
      formData.append('files', file)
    }
    formData.append('path', currentPath)
    try {
      await fetch(api.uploadUrl(), { method: 'POST', body: formData })
      loadFiles(currentPath)
    } catch (err) {
      console.error('Upload failed', err)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleShare = async (path: string) => {
    try {
      const res = await api.createShare(path)
      setSharePath(path)
      setShareUrl(res.url)
      setShowShare(true)
    } catch (err) {
      console.error('Share failed', err)
    }
    setCtxMenu(null)
  }

  const handleDownload = (path: string) => {
    window.open(api.downloadUrl(path), '_blank')
    setCtxMenu(null)
  }

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setCtxMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const extIcon = (ext: string) => {
    const iconMap: Record<string, string> = {
      pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
      ppt: '📽️', pptx: '📽️', txt: '📃', md: '📃',
      zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
      py: '🐍', js: '🟨', ts: '🔷', jsx: '⚛️', tsx: '⚛️',
      json: '📋', yml: '📋', yaml: '📋', xml: '📋',
      css: '🎨', scss: '🎨', html: '🌐',
      sh: '💻', bash: '💻',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
      mp4: '🎬', webm: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬',
      mp3: '🎵', wav: '🎵', ogg: '🎵', flac: '🎵', m4a: '🎵',
    }
    return iconMap[ext.toLowerCase()] || '📄'
  }

  const displayedEntries = searchQuery.trim() ? searchResults : entries
  const isSearching = searchQuery.trim().length > 0

  const renderFileRow = (entry: FileEntry) => {
    const isSelected = selected.has(entry.path)
    return (
      <div
        key={entry.path}
        className="file-entry"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          borderRadius: 10,
          cursor: 'pointer',
          gap: 10,
          fontSize: 13,
          background: isSelected ? 'rgba(0,242,255,0.06)' : 'transparent',
          border: isSelected ? '1px solid rgba(0,242,255,0.12)' : '1px solid transparent',
          transition: 'all 0.15s',
        }}
        onClick={() => handleFileClick(entry)}
        onContextMenu={e => handleContextMenu(e, entry)}
      >
        <span style={{ fontSize: 22 }}>{extIcon(entry.ext)}</span>
        <span style={{ flex: 1, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>
          {entry.name}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          {entry.type === 'file' ? formatSize(entry.size) : '—'}
        </span>
        <span
          className="actions"
          style={{
            display: 'flex',
            gap: 6,
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
        >
          {entry.type === 'dir' && (
            <button
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontSize: 14 }}
              onClick={e => { e.stopPropagation(); handleShare(entry.path) }}
            >
              🔗
            </button>
          )}
          <button
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontSize: 14 }}
            onClick={e => { e.stopPropagation(); handleDownload(entry.path) }}
          >
            ⬇️
          </button>
        </span>
      </div>
    )
  }

  const renderGridItem = (entry: FileEntry) => (
    <div
      key={entry.path}
      className="glass glass-hover"
      style={{
        padding: '1.2rem 0.8rem',
        borderRadius: 12,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onClick={() => handleFileClick(entry)}
      onContextMenu={e => handleContextMenu(e, entry)}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>{extIcon(entry.ext)}</div>
      <div style={{
        fontSize: 12,
        fontWeight: 500,
        color: 'rgba(255,255,255,0.85)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {entry.name}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
        {entry.type === 'file' ? formatSize(entry.size) : '目錄'}
      </div>
      <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
        {entry.type === 'dir' && (
          <button
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12, padding: 2 }}
            onClick={e => { e.stopPropagation(); handleShare(entry.path) }}
          >
            🔗
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ animation: 'fadeIn 0.3s ease forwards', position: 'relative' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
          📁 檔案管理
        </h2>
        {/* Breadcrumb */}
        <div style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
        }}>
          <span
            className="bc-item"
            style={{ cursor: 'pointer', transition: 'color 0.2s' }}
            onClick={() => navigateTo('/')}
          >
            🏠 {currentPath.split('/')[1] || 'home'}
          </span>
          {breadcrumbs.slice(1).map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
              <span
                className="bc-item"
                style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                onClick={() => navigateTo('/' + breadcrumbs.slice(0, i + 2).join('/'))}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar" style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: '1rem',
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="搜尋檔案..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            padding: '0.4rem 0.8rem',
            borderRadius: 10,
            fontSize: 13,
            outline: 'none',
            minWidth: 180,
          }}
        />

        <div style={{ flex: 1 }} />

        <button onClick={() => setShowNewFolder(true)}>📁 新增資料夾</button>
        <label style={{ cursor: 'pointer' }}>
          📤 上傳
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </label>

        {selected.size > 0 && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              background: 'rgba(255,50,50,0.1)',
              border: '1px solid rgba(255,50,50,0.15)',
              color: '#ff5252',
            }}
          >
            🗑️ 刪除 ({selected.size})
          </button>
        )}

        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {(['list', 'grid', 'gallery'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                background: viewMode === mode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${viewMode === mode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                color: viewMode === mode ? '#fff' : '#ccc',
                padding: '0.4rem 0.6rem',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {mode === 'list' ? '📋' : mode === 'grid' ? '🔲' : '🖼️'}
            </button>
          ))}
        </div>
      </div>

      {/* File List */}
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
      ) : isSearching && searchResults.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
          找不到「{searchQuery}」
        </div>
      ) : displayedEntries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
          此目錄是空的
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayedEntries.map(renderFileRow)}
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 12,
        }}>
          {displayedEntries.map(renderGridItem)}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 8,
        }}>
          {displayedEntries.filter(e => e.is_image || e.is_video).map(entry => (
            <div
              key={entry.path}
              style={{
                position: 'relative',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                aspectRatio: '1',
                background: 'rgba(255,255,255,0.02)',
                transition: 'transform 0.15s',
              }}
              onClick={() => setMediaFile(entry)}
            >
              <img
                src={api.viewUrl(entry.path)}
                alt={entry.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 8,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                fontSize: 11,
                color: 'rgba(255,255,255,0.8)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                opacity: 0,
                transition: 'opacity 0.2s',
              }}
              className="gallery-caption"
              >
                {entry.name}
              </div>
              {entry.is_video && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 48,
                  height: 48,
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#fff',
                  border: '2px solid rgba(255,255,255,0.3)',
                  pointerEvents: 'none',
                }}>
                  ▶️
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Folder Dialog */}
      {showNewFolder && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowNewFolder(false)}
        >
          <div
            className="glass"
            style={{
              padding: '2rem',
              borderRadius: 16,
              maxWidth: 360,
              width: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>📁 新增資料夾</h3>
            <input
              type="text"
              placeholder="資料夾名稱"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNewFolder()}
              autoFocus
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewFolder(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#ccc',
                  padding: '6px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                取消
              </button>
              <button
                onClick={handleNewFolder}
                style={{
                  background: '#fff',
                  border: 'none',
                  color: '#000',
                  padding: '6px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                建立
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="glass"
            style={{
              padding: '2rem',
              borderRadius: 16,
              maxWidth: 360,
              width: '90%',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ marginBottom: '1.5rem', fontSize: 14 }}>
              確定刪除 {selected.size} 個項目？
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#ccc',
                  padding: '6px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                style={{
                  background: 'rgba(255,50,50,0.15)',
                  border: '1px solid rgba(255,50,50,0.2)',
                  color: '#ff5252',
                  padding: '6px 16px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      {showShare && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 5000,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowShare(false)}
        >
          <div
            className="glass"
            style={{
              padding: '1.5rem',
              borderRadius: 16,
              maxWidth: 440,
              width: '90%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>
              🔗 分享連結
            </h3>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
              {sharePath}
            </p>
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: 'rgba(0,242,255,0.05)',
              border: '1px solid rgba(0,242,255,0.1)',
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <input
                type="text"
                value={shareUrl}
                readOnly
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#00f2ff',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                style={{
                  background: 'rgba(0,242,255,0.1)',
                  border: '1px solid rgba(0,242,255,0.15)',
                  color: '#00f2ff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                📋 複製
              </button>
            </div>
            <button
              onClick={() => setShowShare(false)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#ccc',
                padding: '6px 16px',
                borderRadius: 10,
                cursor: 'pointer',
                fontSize: 13,
                marginTop: 12,
              }}
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu && (
        <div
          id="ctx-menu"
          style={{
            position: 'fixed',
            zIndex: 200,
            background: 'rgba(18,18,30,0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            width: 160,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            left: ctxMenu.x,
            top: ctxMenu.y,
          }}
        >
          <div
            className="ctx-item"
            style={{
              padding: '0.65rem 1rem',
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={() => handleDownload(ctxMenu.entry.path)}
          >
            ⬇️ 下載
          </div>
          <div
            className="ctx-item"
            style={{
              padding: '0.65rem 1rem',
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={() => handleRename(ctxMenu.entry.path)}
          >
            ✏️ 重新命名
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '4px 0' }} />
          <div
            className="ctx-item danger"
            style={{
              padding: '0.65rem 1rem',
              fontSize: 13,
              color: 'rgba(255,80,80,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onClick={() => {
              setSelected(new Set([ctxMenu.entry.path]))
              setShowDeleteConfirm(true)
              setCtxMenu(null)
            }}
          >
            🗑️ 刪除
          </div>
        </div>
      )}

      {/* Media Player */}
      {mediaFile && (
        <MediaPlayer
          entry={mediaFile}
          onClose={() => setMediaFile(null)}
        />
      )}

      {/* Doc Viewer */}
      {docFile && (
        <DocViewer
          entry={docFile}
          onClose={() => setDocFile(null)}
        />
      )}

      {/* Code Editor */}
      {editFile && (
        <CodeEditor
          path={editFile.path}
          name={editFile.name}
          onClose={() => setEditFile(null)}
        />
      )}

      {/* Hover styles */}
      <style>{`
        .file-entry:hover .actions { opacity: 1 !important; }
        .file-entry:hover { background: rgba(255,255,255,0.05); }
        .bc-item:hover { color: #fff !important; }
        .ctx-item:hover { background: rgba(255,255,255,0.06); color: #fff !important; }
        .ctx-item.danger:hover { background: rgba(255,80,80,0.08); color: #ff5050 !important; }
        .gallery-item:hover .gallery-caption { opacity: 1 !important; }
        .gallery-item:hover { transform: scale(1.02); }
        .toolbar button {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #ccc;
          padding: 0.4rem 0.8rem;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .toolbar button:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          color: #fff;
        }
        .toolbar input[type="text"]:focus {
          border-color: rgba(255,255,255,0.2) !important;
        }
      `}</style>
    </div>
  )
}
