import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, type CompareStock, type ScreenerRow, type TickerRow } from '../api'
import { fmtCap, fmtNum, fmtPct } from '../format'
import { Card, PageHeader, ScoreBar, Skeleton, VerdictBadge } from '../components/ui'

const SERIES = ['var(--color-s1)', 'var(--color-s2)', 'var(--color-s3)', 'var(--color-s4)']

export default function Compare() {
  const [all, setAll] = useState<TickerRow[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [data, setData] = useState<CompareStock[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api<{ rows: TickerRow[] }>('/api/tickers').then((d) => setAll(d.rows)).catch(() => {})
  }, [])

  useEffect(() => {
    if (picked.length < 2) { setData(null); return }
    setLoading(true)
    api<{ stocks: CompareStock[] }>(`/api/compare?tickers=${picked.join(',')}`)
      .then((d) => setData(d.stocks))
      .finally(() => setLoading(false))
  }, [picked])

  const suggestions = useMemo(() => {
    if (!query) return []
    const q = query.toLowerCase()
    return all
      .filter((r) => !picked.includes(r.ticker))
      .filter((r) => r.name.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, all, picked])

  // merge normalized series into one recharts dataset keyed by date
  const chartData = useMemo(() => {
    if (!data) return []
    const byDate: Record<string, Record<string, number | string>> = {}
    for (const s of data) {
      for (const p of s.normalized) {
        byDate[p.date] = byDate[p.date] ?? { date: p.date }
        byDate[p.date][s.ticker] = p.value
      }
    }
    return Object.values(byDate).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [data])

  const METRICS: { label: string; get: (r: Partial<ScreenerRow>) => string }[] = [
    { label: 'PE', get: (r) => fmtNum(r.pe) },
    { label: 'Forward PE', get: (r) => fmtNum(r.forward_pe) },
    { label: 'PEG', get: (r) => fmtNum(r.peg ?? null, 2) },
    { label: 'Rev growth TTM', get: (r) => fmtPct(r.rev_growth_ttm) },
    { label: 'Rev CAGR ~4y', get: (r) => fmtPct(r.rev_cagr) },
    { label: 'ROE', get: (r) => fmtPct(r.roe) },
    { label: 'Net margin', get: (r) => fmtPct(r.net_margin) },
    { label: 'Market cap', get: (r) => fmtCap(r.market_cap, r.currency) },
  ]

  return (
    <div>
      <PageHeader
        title="Compare Stocks"
        subtitle="Pick 2–4 stocks (mix India and Global freely) — 5-year performance indexed to 100, plus a head-to-head metric table."
      />

      {/* Picker */}
      <Card className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {picked.map((t, i) => {
            const r = all.find((x) => x.ticker === t)
            return (
              <span key={t} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: SERIES[i], color: SERIES[i], background: 'var(--color-raised)' }}>
                {r?.name ?? t}
                <button className="text-muted hover:text-ink cursor-pointer"
                  onClick={() => setPicked(picked.filter((x) => x !== t))}>✕</button>
              </span>
            )
          })}
          {picked.length < 4 && (
            <div className="relative">
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={picked.length === 0 ? 'Search a stock to add…' : 'Add another…'}
                className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm w-60 outline-none focus:border-s1/60 placeholder:text-muted"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-72 rounded-lg bg-raised border border-white/15 shadow-xl overflow-hidden">
                  {suggestions.map((s) => (
                    <button key={s.ticker}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-surface cursor-pointer"
                      onClick={() => { setPicked([...picked, s.ticker]); setQuery('') }}>
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted ml-2">{s.ticker} · {s.market === 'india' ? 'IN' : 'GL'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {picked.length < 2 && (
        <div className="text-center text-muted py-16">
          Add at least two stocks to compare — e.g. TCS vs Infosys, or HDFC Bank vs JPMorgan.
        </div>
      )}

      {loading && <Skeleton className="h-80" />}

      {data && !loading && (
        <>
          <Card className="p-4 mb-4">
            <div className="font-semibold mb-1">Performance — 5 years, indexed to 100</div>
            <div className="text-xs text-muted mb-2">
              Currency-neutral comparison: each stock starts at 100 in its own listing currency.
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                  tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} minTickGap={60} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-raised)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-ink2)' }}
                  formatter={(v, name) => [fmtNum(v as number, 0), data.find((s) => s.ticker === name)?.name ?? name]}
                />
                <Legend formatter={(t) => <span style={{ color: 'var(--color-ink2)', fontSize: 12 }}>{data.find((s) => s.ticker === t)?.name ?? t}</span>} />
                {data.map((s, i) => (
                  <Line key={s.ticker} type="monotone" dataKey={s.ticker} stroke={SERIES[i]}
                    strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-white/10">
                  <th className="px-4 py-2.5 font-medium">Metric</th>
                  {data.map((s, i) => (
                    <th key={s.ticker} className="px-4 py-2.5 font-medium" style={{ color: SERIES[i] }}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-2.5 text-ink2">10Y Score</td>
                  {data.map((s) => (
                    <td key={s.ticker} className="px-4 py-2.5"><ScoreBar value={s.summary.scores?.composite ?? null} /></td>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-2.5 text-ink2">Verdict</td>
                  {data.map((s) => (
                    <td key={s.ticker} className="px-4 py-2.5">
                      {s.summary.verdict ? <VerdictBadge verdict={s.summary.verdict} small /> : '—'}
                    </td>
                  ))}
                </tr>
                {METRICS.map((mrow) => (
                  <tr key={mrow.label} className="border-b border-white/5">
                    <td className="px-4 py-2.5 text-ink2">{mrow.label}</td>
                    {data.map((s) => (
                      <td key={s.ticker} className="px-4 py-2.5 tabular-nums font-medium">{mrow.get(s.summary)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
