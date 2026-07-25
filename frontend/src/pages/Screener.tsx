import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type ScreenerRow } from '../api'
import { fmtCap, fmtNum, fmtPct } from '../format'
import { Card, Chip, PageHeader, ScoreBar, ScoreRing, Skeleton, VerdictBadge } from '../components/ui'

type SortKey = keyof Pick<ScreenerRow,
  'name' | 'pe' | 'forward_pe' | 'peg' | 'rev_growth_ttm' | 'rev_cagr' | 'roe' | 'debt_to_equity' | 'market_cap' | 'upside'
> | 'composite' | 'consistency'

const sortVal = (r: ScreenerRow, k: SortKey): number | string => {
  if (k === 'composite') return r.scores.composite ?? -1
  if (k === 'consistency') return r.scores.consistency ?? -1
  if (k === 'name') return r.name
  if (k === 'upside') return r.upside ?? -99
  return (r[k] as number | null) ?? (k === 'pe' || k === 'peg' || k === 'forward_pe' || k === 'debt_to_equity' ? 1e9 : -1e9)
}

const COLUMNS: { key: SortKey; label: string; hint?: string }[] = [
  { key: 'name', label: 'Company' },
  { key: 'market_cap', label: 'M.Cap' },
  { key: 'pe', label: 'PE', hint: 'Trailing price-to-earnings' },
  { key: 'forward_pe', label: 'Fwd PE', hint: 'Price vs next-year expected earnings' },
  { key: 'peg', label: 'PEG', hint: 'PE ÷ expected earnings growth. Under ~1.5 = growth priced fairly' },
  { key: 'rev_growth_ttm', label: 'Rev TTM', hint: 'Revenue growth, trailing 12 months' },
  { key: 'rev_cagr', label: 'Rev CAGR', hint: 'Revenue CAGR over last ~4 reported years' },
  { key: 'roe', label: 'ROE', hint: 'Return on equity' },
  { key: 'debt_to_equity', label: 'D/E', hint: 'Debt-to-equity, %. Lower is safer (ignored for financials)' },
  { key: 'consistency', label: 'Consistency', hint: 'Steadiness of revenue growth across reported years' },
  { key: 'upside', label: 'Fair Value', hint: 'Median of Graham/Lynch model estimates vs price — see Legend Lens page' },
  { key: 'composite', label: '10Y Score', hint: 'Valuation 30% + Growth 30% + Consistency 20% + Quality 20%' },
]

export default function Screener() {
  const [rows, setRows] = useState<ScreenerRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [market, setMarket] = useState<'india' | 'global'>('india')
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('all')
  const [maxPeg, setMaxPeg] = useState('')
  const [minCagr, setMinCagr] = useState('')
  const [minScore, setMinScore] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('composite')
  const [sortDesc, setSortDesc] = useState(true)
  const [reliableOnly, setReliableOnly] = useState(true)
  const [limit, setLimit] = useState(150)
  const nav = useNavigate()

  // fetch per market — the full-universe payload is far too large to ship both
  useEffect(() => {
    setRows(null)
    api<{ rows: ScreenerRow[] }>(`/api/screener?market=${market}`)
      .then((d) => setRows(d.rows))
      .catch((e) => setError(String(e)))
  }, [market])

  const marketRows = useMemo(() => rows ?? [], [rows])
  const sectors = useMemo(() => [...new Set(marketRows.map((r) => r.sector))].sort(), [marketRows])

  const filtered = useMemo(() => {
    let out = marketRows
    if (reliableOnly) out = out.filter((r) => r.completeness >= 0.6)
    if (search) {
      const q = search.toLowerCase()
      out = out.filter((r) => r.name.toLowerCase().includes(q) || r.ticker.toLowerCase().includes(q))
    }
    if (sector !== 'all') out = out.filter((r) => r.sector === sector)
    if (maxPeg) out = out.filter((r) => r.peg !== null && r.peg <= +maxPeg)
    if (minCagr) out = out.filter((r) => r.rev_cagr !== null && r.rev_cagr * 100 >= +minCagr)
    if (minScore) out = out.filter((r) => (r.scores.composite ?? -1) >= +minScore)
    return [...out].sort((a, b) => {
      const va = sortVal(a, sortKey), vb = sortVal(b, sortKey)
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sortDesc ? -cmp : cmp
    })
  }, [marketRows, reliableOnly, search, sector, maxPeg, minCagr, minScore, sortKey, sortDesc])

  // large universe: render in pages so the table stays responsive
  useEffect(() => { setLimit(150) },
    [market, reliableOnly, search, sector, maxPeg, minCagr, minScore, sortKey, sortDesc])
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])

  const top = useMemo(
    () => marketRows.filter((r) => r.completeness >= 0.6).slice(0, 6),
    [marketRows],
  )

  const setSort = (k: SortKey) => {
    if (k === sortKey) setSortDesc(!sortDesc)
    else { setSortKey(k); setSortDesc(k !== 'name') }
  }

  if (error) return <div className="text-crit p-8">Failed to load: {error}. Is the backend running?</div>

  return (
    <div>
      <PageHeader
        title="Stock Screener"
        subtitle="Every stock scored 0–100 for a 10-year horizon: valuation (PE vs sector, PEG), growth, revenue consistency and business quality. Click any row for the full picture."
        right={
          <div className="flex gap-2">
            <Chip active={market === 'india'} onClick={() => setMarket('india')}>🇮🇳 India</Chip>
            <Chip active={market === 'global'} onClick={() => setMarket('global')}>🌍 Global</Chip>
          </div>
        }
      />

      {/* Top opportunities */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {rows === null
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : top.map((r) => (
              <Link key={r.ticker} to={`/stock/${r.ticker}`}>
                <Card className="p-4 hover:border-s1/50 transition-colors h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      <div className="text-xs text-muted">{r.sector}</div>
                      <div className="mt-2"><VerdictBadge verdict={r.verdict} small /></div>
                    </div>
                    <ScoreRing value={r.scores.composite} size={52} />
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-ink2 tabular-nums">
                    <span>PE <b className="text-ink">{fmtNum(r.pe)}</b></span>
                    <span>PEG <b className="text-ink">{fmtNum(r.peg, 2)}</b></span>
                    <span>CAGR <b className="text-ink">{fmtPct(r.rev_cagr)}</b></span>
                  </div>
                </Card>
              </Link>
            ))}
      </div>

      {/* Filters */}
      <Card className="p-3 mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or ticker…"
          className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm w-56 outline-none focus:border-s1/60 placeholder:text-muted"
        />
        <select value={sector} onChange={(e) => setSector(e.target.value)}
          className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none">
          <option value="all">All sectors</option>
          {sectors.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={maxPeg} onChange={(e) => setMaxPeg(e.target.value)} placeholder="Max PEG"
          type="number" step="0.1"
          className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm w-24 outline-none focus:border-s1/60 placeholder:text-muted" />
        <input value={minCagr} onChange={(e) => setMinCagr(e.target.value)} placeholder="Min CAGR %"
          type="number"
          className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm w-28 outline-none focus:border-s1/60 placeholder:text-muted" />
        <input value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="Min score"
          type="number"
          className="bg-raised border border-white/10 rounded-lg px-3 py-1.5 text-sm w-24 outline-none focus:border-s1/60 placeholder:text-muted" />
        <button onClick={() => setReliableOnly(!reliableOnly)}
          title="Full-market coverage includes micro-caps where Yahoo publishes very few fundamentals. Reliable = at least 60% of the scoring metrics available, i.e. nothing flagged 'thin data'."
          className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border ${
            reliableOnly ? 'bg-s2/15 text-s2 border-s2/40' : 'bg-raised text-ink2 border-white/10 hover:text-ink'
          }`}>
          {reliableOnly ? '✓ Reliable data only' : 'All stocks (incl. thin data)'}
        </button>
        <span className="text-xs text-muted ml-auto">
          {filtered.length} of {marketRows.length} stocks
        </span>
      </Card>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-white/10">
              {COLUMNS.map((c) => (
                <th key={c.key} title={c.hint}
                  className="px-3 py-2.5 font-medium cursor-pointer select-none hover:text-ink whitespace-nowrap"
                  onClick={() => setSort(c.key)}>
                  {c.label}{sortKey === c.key ? (sortDesc ? ' ↓' : ' ↑') : ''}
                </th>
              ))}
              <th className="px-3 py-2.5 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows === null
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}><td colSpan={12} className="px-3 py-2"><Skeleton className="h-6" /></td></tr>
                ))
              : visible.map((r) => (
                  <tr key={r.ticker}
                    className="border-b border-white/5 hover:bg-raised cursor-pointer"
                    onClick={() => nav(`/stock/${r.ticker}`)}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[11px] text-muted">{r.ticker} · {r.sector}
                        {r.completeness < 0.6 && <span className="text-warn"> · thin data</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">{fmtCap(r.market_cap, r.currency)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtNum(r.pe)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtNum(r.forward_pe)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtNum(r.peg, 2)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(r.rev_growth_ttm)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(r.rev_cagr)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(r.roe)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtNum(r.debt_to_equity, 0)}</td>
                    <td className="px-3 py-2.5"><ScoreBar value={r.scores.consistency} /></td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                      {r.fair_value !== null ? (
                        <>
                          <div className="text-xs">{fmtNum(r.fair_value, 0)}</div>
                          <div className="text-xs font-semibold"
                            style={{ color: (r.upside ?? 0) >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                            {(r.upside ?? 0) >= 0 ? '+' : ''}{fmtPct(r.upside, 0)}
                          </div>
                        </>
                      ) : <span className="text-muted text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5"><ScoreBar value={r.scores.composite} /></td>
                    <td className="px-3 py-2.5"><VerdictBadge verdict={r.verdict} small /></td>
                  </tr>
                ))}
          </tbody>
        </table>
        {rows !== null && filtered.length > visible.length && (
          <div className="p-3 text-center border-t border-white/5">
            <button onClick={() => setLimit(limit + 250)}
              className="px-4 py-1.5 rounded-lg bg-raised border border-white/10 text-ink2 hover:text-ink hover:border-white/25 text-sm font-medium cursor-pointer">
              Show 250 more ({filtered.length - visible.length} remaining)
            </button>
          </div>
        )}
        {rows !== null && filtered.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">
            No stocks match these filters — relax one of them.
            {marketRows.length === 0 && ' (No data cached yet — click "Refresh data" in the sidebar.)'}
          </div>
        )}
      </Card>
      <p className="text-[11px] text-muted mt-3">
        Hover any column header for the metric definition. The 10Y Score weighs valuation 30%, growth 30%,
        consistency 20%, quality 20% — valuation is judged against sector medians within{' '}
        {market === 'india' ? 'India' : 'the global set'}, so a bank is compared to banks, not to software.
      </p>
    </div>
  )
}
