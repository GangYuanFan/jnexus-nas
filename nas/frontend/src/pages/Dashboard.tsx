import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useApp } from '../App'
import type { SysInfo, DiskInfo } from '../lib/types'
import AnimatedCountUp from '../components/react-bits/AnimatedCountUp'

export default function Dashboard() {
  const { state } = useApp()
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null)
  const [disks, setDisks] = useState<DiskInfo[]>([])
  const [stats, setStats] = useState<{ total_files: number; total_dirs: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [info, diskData, statData] = await Promise.all([
          api.getSysInfo(),
          api.getDisks(),
          api.getStats(),
        ])
        setSysInfo(info)
        setDisks(diskData)
        setStats(statData)
      } catch (err) {
        console.error('Failed to load dashboard', err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
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
              🖥️ CPU <AnimatedCountUp value={sysInfo.cpu_percent} suffix="%" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              💾 RAM {formatBytes(sysInfo.memory_used)} / {formatBytes(sysInfo.memory_total)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              📦 {formatBytes(sysInfo.disk_used)} / {formatBytes(sysInfo.disk_total)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              ⏱️ {sysInfo.uptime}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {[
          { label: '總儲存空間', value: sysInfo ? formatBytes(sysInfo.disk_total) : '—', sub: '總容量', color: '#00f2ff' },
          { label: '已使用', value: sysInfo ? formatBytes(sysInfo.disk_used) : '—', sub: `${sysInfo?.disk_percent.toFixed(1)}%`, color: '#4ade80' },
          { label: '檔案總數', value: stats ? stats.total_files.toLocaleString() : '—', sub: '個檔案', color: '#fbbf24' },
          { label: '目錄總數', value: stats ? stats.total_dirs.toLocaleString() : '—', sub: '個目錄', color: '#a78bfa' },
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
              {formatBytes(sysInfo.disk_used)} / {formatBytes(sysInfo.disk_total)}
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
              width: `${sysInfo.disk_percent}%`,
              background: sysInfo.disk_percent > 90
                ? 'linear-gradient(90deg, #ff5252, #ff7843)'
                : 'linear-gradient(90deg, #4ade80, #00f2ff)',
              transition: 'width 1s ease',
            }} />
          </div>
          <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12, color: sysInfo.disk_percent > 90 ? '#ff5252' : 'rgba(255,255,255,0.4)' }}>
            {sysInfo.disk_percent.toFixed(1)}%
          </div>
        </div>
      )}

      {/* Storage Pool */}
      {disks.length > 0 && (
        <>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'rgba(255,255,255,0.6)' }}>
            🖴 儲存池
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '1rem',
          }}>
            {disks.map((disk, i) => (
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
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'block' }}>
                  {disk.name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {formatBytes(disk.used)} / {formatBytes(disk.total)}
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
              Server
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {state.config.server_name}
            </div>
          </div>
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
              垃圾桶
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
              {state.config.trash_enabled ? '✅ 啟用' : '❌ 停用'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
