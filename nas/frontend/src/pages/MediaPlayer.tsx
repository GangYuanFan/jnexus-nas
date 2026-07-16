import { useState, useRef, useEffect } from 'react'
import { api } from '../lib/api'
import type { FileEntry } from '../lib/types'

interface Props {
  entry: FileEntry
  onClose: () => void
}

export default function MediaPlayer({ entry, onClose }: Props) {
  const [zoom, setZoom] = useState<'fit' | 'fill'>('fit')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const src = api.viewUrl(entry.path)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div
      id="media-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="media-container"
        style={{
          width: '85%', height: '85%', maxWidth: 1200, maxHeight: '90vh',
          background: '#1a1a25',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          id="close-media"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            border: '2px solid rgba(255,255,255,0.3)',
            color: '#fff',
            width: 44,
            height: 44,
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          ✕
        </button>

        {entry.is_image ? (
          <img
            src={src}
            alt={entry.name}
            className="media-content"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: zoom === 'fit' ? 'contain' : 'cover',
              width: zoom === 'fill' ? '100%' : undefined,
              height: zoom === 'fill' ? '100%' : undefined,
              transition: 'all 0.3s',
            }}
            onClick={() => setZoom(z => z === 'fit' ? 'fill' : 'fit')}
          />
        ) : entry.is_video ? (
          <video
            ref={videoRef}
            src={src}
            style={{ maxWidth: '100%', maxHeight: 'calc(100% - 80px)' }}
            controls
            autoPlay
          />
        ) : entry.is_audio ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: 64, marginBottom: '1rem' }}>🎵</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
              {entry.name}
            </p>
            <audio src={src} controls autoPlay style={{ width: 300 }} />
          </div>
        ) : null}

        {/* Controls for image */}
        {entry.is_image && (
          <div
            className="media-controls"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              padding: '2.5rem 1.5rem 1.5rem',
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              opacity: 0,
              transition: 'opacity 0.3s',
            }}
          >
            <button
              onClick={() => setZoom('fit')}
              style={{
                background: zoom === 'fit' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '6px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              🔲 適中
            </button>
            <button
              onClick={() => setZoom('fill')}
              style={{
                background: zoom === 'fill' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                padding: '6px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              🖼️ 填滿
            </button>
          </div>
        )}
      </div>

      <style>{`
        .media-container:hover .media-controls { opacity: 1 !important; }
        #close-media:hover { background: rgba(255,255,255,0.15) !important; }
      `}</style>
    </div>
  )
}
