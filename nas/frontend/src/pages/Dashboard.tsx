import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useApp } from '../App'
import type { SysInfo } from '../lib/types'
import AnimatedCountUp from '../components/react-bits/AnimatedCountUp'

export default function Dashboard() {
  const { state } = useApp()
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const info = await api.getSysInfo()
      setSysInfo(info)
    } catch (err) {
      console.error('Failed to load dashboard', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  const formatBytes = (gb: number) => {
    if (gb === 0) return '0 B'
    const bytes = gb * 1024 * 1024 * 1024
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div style={{
          width: 24, height: 24,
          border: '3px solid rgba(255,255,255,0.06)',
          borderTopColor: 'rgba(255,255,255,0.5)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  const totalDisksGB = sysInfo ? sysInfo.disks.reduce((s, d) => s + d.total_gb, 0) : 0
  const usedDisksGB = sysInfo ? sysInfo.disks.reduce((s, d) => s + d.used_gb, 0) : 0
  const diskPercent = totalDisksGB > 0 ? (usedDisksGB / totalDisksGB) * 100 : 0

  return (
    <div style={{ animation: 'fadeIn 0.3s ease forwards' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          📊 儀表板
          {sysInfo && (
            <span style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 400,
            }}>
              {sysInfo.hostname} · {sysInfo.platform}
            </span>
          )}
        </h2>
      </div>

      {/* Status Bar */}
      {sysInfo && (
        <div
          className="glass"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.5rem',
            borderRadius: 16,
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ width: 8, height: 8, background: '#4f8', borderRadius: '50%', boxShadow: '0 0 8px #4f8' }} />
            Server Online
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              🖥️ CPU <AnimatedCountUp value={sysInfo.cpu_percent} suffix="%" decimals={1} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              💾 RAM {formatBytes(sysInfo.memory.used_gb)} / {formatBytes(sysInfo.memory.total_gb)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              📦 {formatBytes(usedDisksGB)} / {formatBytes(totalDisksGB)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              ⏱️ {sysInfo.uptime_human}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {[
          { label: '總儲存空間', value: formatBytes(totalDisksGB), sub: '總容量', color: '#00f2ff' },
          { label: '已使用', value: formatBytes(usedDisksGB), sub: `${diskPercent.toFixed(1)}%`, color: '#4ade80' },
          ...(sysInfo ? [
            { label: '記憶體', value: formatBytes(sysInfo.memory.used_gb), sub: `${sysInfo.memory.percent.toFixed(0)}% 已使用`, color: '#fbbf24' },
            { label: 'CPU', value: `${sysInfo.cpu_percent.toFixed(1)}%`, sub: `${sysInfo.cpu_count} 核心`, color: '#a78bfa' },
          ] : []),
        ].map((card, i) => (
          <div
            key={i}
            className="card glass"
            style={{
              padding: '1.5rem',
              borderRadius: 16,
              transition: 'all 0.3s',
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Disk Usage Bar */}
      {sysInfo && (
        <div
          className="glass"
          style={{
            padding: '1.5rem',
            borderRadius: 16,
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>磁碟使用量</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>
              {formatBytes(usedDisksGB)} / {formatBytes(totalDisksGB)}
            </span>
          </div>
          <div style={{
            height: 8,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              borderRadius: 4,
              width: `${diskPercent}%`,
              background: diskPercent > 90
                ? 'linear-gradient(90deg, #ff5252, #ff7843)'
                : 'linear-gradient(90deg, #4ade80, #00f2ff)',
              transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12, color: diskPercent > 90 ? '#ff5252' : 'rgba(255,255,255,0.4)' }}>
            {diskPercent.toFixed(1)}%
          </div>
        </div>
      )}

      {/* Storage Pool */}
      {sysInfo && sysInfo.disks.length > 0 && (
        <>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'rgba(255,255,255,0.6)' }}>
            🖴 儲存池
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '1rem',
          }}>
            {sysInfo.disks.map((disk, i) => (
              <div
                key={i}
                className="glass glass-hover"
                style={{
                  padding: '1rem',
                  borderRadius: 16,
                  textAlign: 'center',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: 4,
                  height: '100%',
                  background: disk.percent > 90 ? '#ff5252' : disk.percent > 70 ? '#fbbf24' : '#4ade80',
                }} />
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
                  {disk.label}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {formatBytes(disk.used_gb)} / {formatBytes(disk.total_gb)}
                </div>
                <div style={{
                  height: 6,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 3,
                  marginTop: 10,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    borderRadius: 3,
                    width: `${disk.percent}%`,
                    background: disk.percent > 90
                      ? 'linear-gradient(90deg, #ff5252, #ff7843)'
                      : disk.percent > 70
                        ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                        : 'linear-gradient(90deg, #4ade80, #00f2ff)',
                    transition: 'width 1s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Server Info */}
      {state.config && (
        <div
          className="glass"
          style={{
            padding: '1.5rem',
            borderRadius: 16,
            marginTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>
              根目錄
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {state.config.root}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>
              版本
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {state.config.version}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>
              發布日期
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {state.config.release_date}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
