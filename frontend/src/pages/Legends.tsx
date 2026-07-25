import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Expectations, type Verdict } from '../api'
import { fmtPct, fmtPrice, toneColor } from '../format'
import { Card, Chip, PageHeader, Skeleton, VerdictBadge } from '../components/ui'

interface Gauge {
  market: string
  label: string
  value: number
  as_of: string
  mcap: string
  gdp: string
  hi_10y: number
  lo_10y: number
  zone: string
  zone_tone: string
  bands: { upto: number; label: string; tone: string }[]
  note: string
}

interface LegendRow {
  ticker: string
  name: string
  sector: string
  market: string
  currency: string | null
  price: number | null
  fair_value: number | null
  upside: number | null
  valuation_class: Verdict
  models_used: number
  graham_upside: number | null
  lynch_upside: number | null
  buffett: { passed: number; known: number; verdict: Verdict }
  rj: { passed: number; known: number; verdict: Verdict }
  factors: { value: number | null; quality: number | null; momentum: number | null }
  expectations: Expectations
}

function GaugeCard({ g }: { g: Gauge }) {
  // position of needle across the band scale (min..max of visible range)
  const min = Math.min(g.lo_10y, g.bands[0].upto) * 0.6
  const max = Math.max(g.hi_10y, g.value) * 1.08
  const pos = Math.max(0, Math.min(1, (g.value - min) / (max - min)))
  let acc = min
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="font-semibold">{g.label}</div>
        <span className="text-xs px-2.5 py-1 rounded-full border font-medium"
          style={{ color: toneColor[g.zone_tone], borderColor: toneColor[g.zone_tone] + '55', background: toneColor[g.zone_tone] + '14' }}>
          {g.zone}
        </span>
      </div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className="text-4xl font-semibold tabular-nums">{g.value}%</div>
        <div className="text-xs text-muted">market cap ÷ GDP · as of {g.as_of}</div>
      </div>
      <div className="relative mt-4 mb-1">
        <div className="flex h-2.5 rounded-full overflow-hidden">
          {g.bands.map((b) => {
            const start = acc
            const end = Math.min(b.upto, max)
            acc = end
            const w = Math.max(0, ((end - start) / (max - min)) * 100)
            return <div key={b.label} style={{ width: `${w}%`, background: toneColor[b.tone], opacity: 0.65 }} />
          })}
        </div>
        <div className="absolute -top-1.5 w-1 h-5 rounded bg-ink shadow" style={{ left: `calc(${pos * 100}% - 2px)` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted mb-3">
        <span>{Math.round(min)}%</span>
        <span>10y low {g.lo_10y}% · 10y high {g.hi_10y}%</span>
        <span>{Math.round(max)}%</span>
      </div>
      <div className="text-xs text-ink2">{g.mcap} ÷ {g.gdp}</div>
      <p className="text-xs text-muted mt-2 leading-relaxed">{g.note}</p>
    </Card>
  )
}

function MiniFactor({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="flex items-center gap-1" title={`${label} factor percentile within this market`}>
      <span className="text-[10px] text-muted w-3">{label[0]}</span>
      <div className="h-1 w-9 rounded-full bg-grid overflow-hidden">
        <div className="h-full bg-s4" style={{ width: `${v ?? 0}%` }} />
      </div>
    </div>
  )
}

type SortKey = 'upside' | 'name' | 'graham_upside' | 'lynch_upside' | 'buffett' | 'rj' | 'gap'

export default function Legends() {
  const [market, setMarket] = useState<'india' | 'global'>('india')
  const [gauges, setGauges] = useState<Gauge[] | null>(null)
  const [rows, setRows] = useState<LegendRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cls, setCls] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('upside')
  const [sortDesc, setSortDesc] = useState(true)
  const [limit, setLimit] = useState(150)
  const nav = useNavigate()

  useEffect(() => {
    api<{ gauges: Gauge[] }>('/api/market-gauge').then((d) => setGauges(d.gauges)).catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    setRows(null)
    api<{ rows: LegendRow[] }>(`/api/legends?market=${market}`)
      .then((d) => setRows(d.rows))
      .catch((e) => setError(String(e)))
  }, [market])

  const classes = ['all', 'Undervalued', 'Fairly Valued', 'Expensive', 'Very Expensive']

  const filtered = useMemo(() => {
    let out = rows ?? []
    if (cls !== 'all') out = out.filter((r) => r.valuation_class.label === cls)
    const val = (r: LegendRow): number | string => {
      if (sortKey === 'name') return r.name
      if (sortKey === 'buffett') return r.buffett.known ? r.buffett.passed / r.buffett.known : -1
      if (sortKey === 'rj') return r.rj.known ? r.rj.passed / r.rj.known : -1
      if (sortKey === 'gap') return r.expectations.gap ?? -99
      return (r[sortKey] as number | null) ?? -99
    }
    return [...out].sort((a, b) => {
      const va = val(a), vb = val(b)
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sortDesc ? -cmp : cmp
    })
  }, [rows, cls, sortKey, sortDesc])

  useEffect(() => { setLimit(150) }, [market, cls, sortKey, sortDesc])
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])

  const setSort = (k: SortKey) => {
    if (k === sortKey) setSortDesc(!sortDesc)
    else { setSortKey(k); setSortDesc(k !== 'name') }
  }

  if (error) return <div className="text-crit p-8">Failed to load: {error}</div>

  const HEADERS: { key: SortKey; label: string; hint?: string }[] = [
    { key: 'name', label: 'Company' },
    { key: 'upside', label: 'Fair value / Upside', hint: 'Median of Graham Number, Graham formula and Lynch PEG=1 estimates' },
    { key: 'graham_upside', label: 'Graham', hint: 'Upside vs Graham Number √(22.5 × EPS × BVPS)' },
    { key: 'lynch_upside', label: 'Lynch', hint: 'Upside vs Lynch fair value (fair PE = growth rate)' },
    { key: 'buffett', label: 'Buffett', hint: 'Quality checklist: ROE, moat margins, debt, FCF, consistency' },
    { key: 'rj', label: 'Jhunjhunwala', hint: 'GARP + ROE + runway + promoter holding + low leverage' },
    { key: 'gap', label: 'Exp. Gap', hint: 'Delivered growth minus growth priced in (reverse-Graham). Positive = cushion, negative = hope premium' },
  ]

  return (
    <div>
      <PageHeader
        title="Legend Lens"
        subtitle="The market through the frameworks of legendary investors — Buffett's market gauge and company checklist, Graham's formulas, Lynch's PEG rule, Jhunjhunwala's style, BlackRock's factors."
        right={
          <div className="flex gap-2">
            <Chip active={market === 'india'} onClick={() => setMarket('india')}>🇮🇳 India</Chip>
            <Chip active={market === 'global'} onClick={() => setMarket('global')}>🌍 Global</Chip>
          </div>
        }
      />

      {/* Buffett indicator gauges */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {gauges === null
          ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-52" />)
          : gauges.map((g) => <GaugeCard key={g.market} g={g} />)}
      </div>

      {/* Classification filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {classes.map((c) => (
          <Chip key={c} active={cls === c} onClick={() => setCls(c)}>
            {c === 'all' ? `All (${rows?.length ?? '…'})` : `${c} (${rows?.filter((r) => r.valuation_class.label === c).length ?? '…'})`}
          </Chip>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-white/10">
              {HEADERS.map((h) => (
                <th key={h.key} title={h.hint}
                  className="px-3 py-2.5 font-medium cursor-pointer select-none hover:text-ink whitespace-nowrap"
                  onClick={() => setSort(h.key)}>
                  {h.label}{sortKey === h.key ? (sortDesc ? ' ↓' : ' ↑') : ''}
                </th>
              ))}
              <th className="px-3 py-2.5 font-medium" title="BlackRock-style factor percentiles: Value / Quality / Momentum">Factors V·Q·M</th>
              <th className="px-3 py-2.5 font-medium">Classification</th>
            </tr>
          </thead>
          <tbody>
            {rows === null
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-3 py-2"><Skeleton className="h-6" /></td></tr>
                ))
              : visible.map((r) => (
                  <tr key={r.ticker} className="border-b border-white/5 hover:bg-raised cursor-pointer"
                    onClick={() => nav(`/stock/${r.ticker}`)}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[11px] text-muted">{r.sector} · {fmtPrice(r.price, r.currency)}</div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                      {r.fair_value !== null ? (
                        <>
                          <div>{fmtPrice(r.fair_value, r.currency)}
                            <span className="text-[10px] text-muted ml-1">({r.models_used} models)</span></div>
                          <div className="text-xs font-semibold"
                            style={{ color: (r.upside ?? 0) >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                            {(r.upside ?? 0) >= 0 ? '+' : ''}{fmtPct(r.upside)}
                          </div>
                        </>
                      ) : <span className="text-muted">no model</span>}
                    </td>
                    {[r.graham_upside, r.lynch_upside].map((u, i) => (
                      <td key={i} className="px-3 py-2.5 tabular-nums">
                        {u === null ? <span className="text-muted">—</span> : (
                          <span style={{ color: u >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                            {u >= 0 ? '+' : ''}{fmtPct(u, 0)}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="tabular-nums text-xs" style={{ color: toneColor[r.buffett.verdict.tone] }}>
                        {r.buffett.passed}/{r.buffett.known} ✓
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="tabular-nums text-xs" style={{ color: toneColor[r.rj.verdict.tone] }}>
                        {r.rj.passed}/{r.rj.known} ✓
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap" title={r.expectations.verdict.label}>
                      {r.expectations.gap !== null ? (
                        <span className="tabular-nums text-xs font-semibold"
                          style={{ color: toneColor[r.expectations.verdict.tone] }}>
                          {r.expectations.gap >= 0 ? '+' : ''}{(r.expectations.gap * 100).toFixed(0)}pp
                        </span>
                      ) : <span className="text-muted text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <MiniFactor label="Value" v={r.factors.value} />
                        <MiniFactor label="Quality" v={r.factors.quality} />
                        <MiniFactor label="Momentum" v={r.factors.momentum} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><VerdictBadge verdict={r.valuation_class} small /></td>
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
      </Card>
      <p className="text-[11px] text-muted mt-3 leading-relaxed max-w-4xl">
        Fair value = median of Graham Number, Graham growth formula and Lynch PEG=1 — value-oriented formulas from
        the legends themselves. They are deliberately conservative: great growth franchises will often read
        "Expensive" here even while scoring high on the 10Y screener — that tension (quality vs price) is exactly
        what Buffett's "wonderful company at a fair price" is about. Models needing positive earnings show "no model"
        for loss-makers. Estimates, not guarantees.
      </p>
    </div>
  )
}
