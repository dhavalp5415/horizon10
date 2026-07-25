import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api, postRefresh, type StatusData } from './api'

const NAV = [
  { to: '/', label: 'Screener', icon: 'M3 4h18M3 10h12M3 16h8' },
  { to: '/industries', label: 'Industries', icon: 'M4 20V10m6 10V4m6 16v-8m4 8H2' },
  { to: '/legends', label: 'Legend Lens', icon: 'M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z' },
  { to: '/multibaggers', label: 'Multibaggers', icon: 'M13 2L4.9 12.6h5.3L11 22l8.1-10.6h-5.3L13 2z' },
  { to: '/roundtable', label: 'Round Table', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 5v4l3 3' },
  { to: '/pulse', label: 'Pulse', icon: 'M2 12h4l3-8 4 16 3-8h6' },
  { to: '/portfolio', label: 'Portfolio', icon: 'M3 7h18v13H3V7zm5 0V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18' },
  { to: '/compare', label: 'Compare', icon: 'M4 18l5-6 4 3 7-9M4 6v12' },
  { to: '/commodities', label: 'Gold & Silver', icon: 'M12 3l3 5h-6l3-5zm-6 8h12l2 4H4l2-4zm-2 6h16v4H4v-4z' },
]

export default function App() {
  const [status, setStatus] = useState<StatusData | null>(null)

  const poll = async () => {
    try { setStatus(await api<StatusData>('/api/status')) } catch { /* backend starting */ }
  }

  useEffect(() => {
    poll()
    const id = setInterval(poll, 4000)
    return () => clearInterval(id)
  }, [])

  const refreshing = status?.refresh.running
  const cov = status?.coverage

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-white/10 bg-surface flex flex-col fixed inset-y-0">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-lg font-bold tracking-tight">
            Horizon<span className="text-s1">10</span>
          </div>
          <div className="text-[11px] text-muted mt-0.5">10-year investment research</div>
        </div>
        <nav className="p-3 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-s1/15 text-s1' : 'text-ink2 hover:text-ink hover:bg-raised'
                }`
              }
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-white/10 text-xs text-muted space-y-2">
          {cov && (
            <div>
              Data: <span className="text-ink2">{cov.cached}/{cov.total}</span> stocks cached
              {(status?.stale ?? 0) > 0 && <span className="text-warn"> · {status!.stale} stale</span>}
              {status?.universe && (
                <div className="mt-0.5 text-[10px]">
                  🇮🇳 {status.universe.india.toLocaleString('en-IN')} · 🌍 {status.universe.global.toLocaleString('en-IN')}
                </div>
              )}
              {refreshing && status && (
                <div className="mt-1.5 h-1 rounded-full bg-grid overflow-hidden">
                  <div className="h-full bg-s1 transition-all"
                    style={{ width: `${(status.refresh.done / Math.max(1, status.refresh.total)) * 100}%` }} />
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => { postRefresh(); poll() }}
            disabled={refreshing}
            title="Re-fetches every stock from Yahoo. Across a full market this takes a while — the app keeps working from cached data meanwhile."
            className="w-full px-3 py-1.5 rounded-lg bg-raised border border-white/10 text-ink2 hover:text-ink hover:border-white/25 disabled:opacity-50 cursor-pointer font-medium"
          >
            {refreshing ? `Refreshing ${status?.refresh.done}/${status?.refresh.total}…` : 'Refresh data'}
          </button>
          {status?.refresh.blocked && (
            <p className="text-warn leading-relaxed">
              ⏳ Yahoo is rate-limiting us — waiting it out and retrying. No stocks
              are lost; cached data stays available.
            </p>
          )}
          <p className="leading-relaxed">
            Research tool, not financial advice. Data: Yahoo Finance, cached 24h.
          </p>
        </div>
      </aside>
      <main className="flex-1 ml-56 p-6 max-w-[1400px]">
        <Outlet />
      </main>
    </div>
  )
}
