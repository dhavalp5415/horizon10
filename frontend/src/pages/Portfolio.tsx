import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addHolding, api, removeHolding, setWatch, type TickerRow, type XrayData } from '../api'
import { fmtNum, fmtPct, fmtPrice, scoreColor, toneColor } from '../format'
import { Card, PageHeader, ScoreBar, Skeleton, StatTile, VerdictBadge } from '../components/ui'

export default function Portfolio() {
  const [x, setX] = useState<XrayData | null>(null)
  const [all, setAll] = useState<TickerRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [pick, setPick] = useState<TickerRow | null>(null)
  const [qty, setQty] = useState('')
  const [buy, setBuy] = useState('')
  const nav = useNavigate()

  const reload = useCallback(() => {
    api<XrayData>('/api/portfolio/xray').then(setX).catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    reload()
    api<{ rows: TickerRow[] }>('/api/tickers').then((d) => setAll(d.rows)).catch(() => {})
  }, [reload])

  const suggestions = useMemo(() => {
    if (!query || pick) return []
    const q = query.toLowerCase()
    return all.filter((r) => r.name.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q)).slice(0, 8)
  }, [query, all, pick])

  const submit = async () => {
    if (!pick || !qty || !buy) return
    await addHolding(pick.ticker, +qty, +buy)
    setPick(null); setQuery(''); setQty(''); setBuy('')
    reload()
  }

  if (error) return <div className="text-crit p-8">Failed to load: {error}</div>

  return (
    <div>
      <PageHeader
        title="Portfolio X-Ray"
        subtitle="Your holdings and watchlist seen through every lens in the app — weighted scores, expectations gaps, sector concentration and red flags from the Pulse ledger."
      />

      {/* Add holding */}
      <Card className="p-3 mb-5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <input
            value={pick ? pick.name : query}
            onChange={(e) => { setPick(null); setQuery(e.target.value) }}
            placeholder="Search stock to add…"
            className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm w-64 outline-none focus:border-s1/60 placeholder:text-muted"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-72 rounded-lg bg-raised border border-white/15 shadow-xl overflow-hidden">
              {suggestions.map((s) => (
                <button key={s.ticker} className="w-full text-left px-3 py-2 text-sm hover:bg-surface cursor-pointer"
                  onClick={() => { setPick(s); setQuery('') }}>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted ml-2">{s.ticker}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Qty" type="number"
          className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm w-24 outline-none focus:border-s1/60 placeholder:text-muted" />
        <input value={buy} onChange={(e) => setBuy(e.target.value)} placeholder="Avg buy price" type="number"
          className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm w-32 outline-none focus:border-s1/60 placeholder:text-muted" />
        <button onClick={submit} disabled={!pick || !qty || !buy}
          className="px-4 py-1.5 rounded-lg bg-s1/15 text-s1 border border-s1/40 text-sm font-medium cursor-pointer disabled:opacity-40">
          Add holding
        </button>
        {x && <span className="text-xs text-muted ml-auto">USD→INR @ {x.usdinr} (live)</span>}
      </Card>

      {x === null ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          <Skeleton className="h-60" />
        </div>
      ) : (
        <>
          {/* Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatTile label="Total value (₹)" value={`₹${Math.round(x.total_inr).toLocaleString('en-IN')}`}
              sub="non-INR converted at live USDINR" />
            <StatTile label="Weighted 10Y score" value={
              <span style={{ color: scoreColor(x.weighted.composite) }}>{x.weighted.composite ?? '—'}</span>
            } sub="value-weighted across holdings" />
            <StatTile label="Weighted MB score" value={
              <span style={{ color: scoreColor(x.weighted.mb) }}>{x.weighted.mb ?? '—'}</span>
            } sub="multibagger exposure" />
            <StatTile label="Weighted expectations gap" value={
              x.weighted.gap === null ? '—' : (
                <span style={{ color: x.weighted.gap >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                  {x.weighted.gap >= 0 ? '+' : ''}{fmtNum(x.weighted.gap, 1)}pp
                </span>
              )
            } sub="+ = delivering more than priced" />
          </div>

          {/* Holdings */}
          {x.holdings.length === 0 ? (
            <Card className="p-10 text-center text-muted text-sm mb-5">
              No holdings yet — add your first one above to x-ray your real portfolio.
            </Card>
          ) : (
            <Card className="overflow-x-auto mb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-white/10">
                    {['Holding', 'Qty', 'Buy', 'Now', 'P&L', '10Y', 'MB', 'Expectations', 'Valuation', 'Flags', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {x.holdings.map((h) => (
                    <tr key={h.ticker} className="border-b border-white/5 hover:bg-raised cursor-pointer"
                      onClick={() => nav(`/stock/${h.ticker}`)}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{h.name}</div>
                        <div className="text-[11px] text-muted">{h.sector}</div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{h.qty}</td>
                      <td className="px-3 py-2.5 tabular-nums">{fmtPrice(h.buy_price, h.currency)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{fmtPrice(h.price, h.currency)}</td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold"
                        style={{ color: (h.pnl_pct ?? 0) >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                        {h.pnl_pct !== null ? `${h.pnl_pct >= 0 ? '+' : ''}${fmtPct(h.pnl_pct)}` : '—'}
                      </td>
                      <td className="px-3 py-2.5"><ScoreBar value={h.composite} /></td>
                      <td className="px-3 py-2.5"><ScoreBar value={h.mb_score} /></td>
                      <td className="px-3 py-2.5">
                        {h.expectations && <span className="text-xs" style={{ color: toneColor[h.expectations.verdict.tone] }}>
                          {h.expectations.verdict.label}
                        </span>}
                      </td>
                      <td className="px-3 py-2.5">{h.valuation_class && <VerdictBadge verdict={h.valuation_class} small />}</td>
                      <td className="px-3 py-2.5">
                        {h.flags.length > 0
                          ? <span className="text-xs text-crit" title={h.flags.join('\n')}>⚑ {h.flags.length}</span>
                          : <span className="text-xs text-good">✓</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <button className="text-muted hover:text-crit cursor-pointer text-xs"
                          onClick={async (e) => { e.stopPropagation(); await removeHolding(h.ticker); reload() }}>
                          remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Sector concentration */}
          {x.sectors.length > 0 && (
            <Card className="p-4 mb-5">
              <div className="font-semibold text-sm mb-3">Sector concentration</div>
              <div className="space-y-2">
                {x.sectors.map((s) => (
                  <div key={s.sector} className="flex items-center gap-3 text-xs">
                    <span className="w-48 text-ink2 truncate">{s.sector}</span>
                    <div className="h-2.5 flex-1 rounded-full bg-grid overflow-hidden">
                      <div className="h-full rounded-full bg-s1" style={{ width: `${s.share * 100}%` }} />
                    </div>
                    <span className="w-12 text-right tabular-nums">{fmtPct(s.share, 1)}</span>
                  </div>
                ))}
              </div>
              {x.sectors[0] && x.sectors[0].share > 0.4 && (
                <p className="text-[11px] text-warn mt-2">
                  ⚠ Over 40% in one sector — concentration cuts both ways over 10 years.
                </p>
              )}
            </Card>
          )}

          {/* Watchlist */}
          <h2 className="font-semibold mb-2">Watchlist</h2>
          {x.watchlist.length === 0 ? (
            <Card className="p-8 text-center text-muted text-sm">
              Empty — hit the ☆ on any stock page to track it here.
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-white/10">
                    {['Company', 'Price', 'PE', 'PEG', 'Rev CAGR', '10Y Score', 'Expectations', 'Valuation', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {x.watchlist.map((r) => (
                    <tr key={r.ticker} className="border-b border-white/5 hover:bg-raised cursor-pointer"
                      onClick={() => nav(`/stock/${r.ticker}`)}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-[11px] text-muted">{r.sector}</div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{fmtPrice(r.price, r.currency)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{fmtNum(r.pe)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{fmtNum(r.peg, 2)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{fmtPct(r.rev_cagr)}</td>
                      <td className="px-3 py-2.5"><ScoreBar value={r.scores.composite} /></td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs" style={{ color: toneColor[r.expectations.verdict.tone] }}>
                          {r.expectations.verdict.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5"><VerdictBadge verdict={r.valuation_class} small /></td>
                      <td className="px-3 py-2.5">
                        <button className="text-muted hover:text-crit cursor-pointer text-xs"
                          onClick={async (e) => { e.stopPropagation(); await setWatch(r.ticker, false); reload() }}>
                          unwatch
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
