import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type Verdict } from '../api'
import { fmtCap, fmtNum, fmtPct, scoreColor } from '../format'
import { Card, Chip, PageHeader, ScoreBar, ScoreRing, Skeleton, VerdictBadge } from '../components/ui'

export interface MultibaggerRow {
  ticker: string
  name: string
  sector: string
  market: string
  currency: string | null
  price: number | null
  market_cap: number | null
  bucket: 'small' | 'mid' | 'large' | null
  rev_growth_ttm: number | null
  earnings_growth: number | null
  rev_cagr: number | null
  peg: number | null
  roe: number | null
  insider_holding: number | null
  pos_52w: number | null
  mb_score: number | null
  pillars: { size: number | null; growth: number | null; garp: number | null; quality: number | null; momentum: number | null }
  signals: string[]
  verdict: Verdict
  completeness: number
}

const BUCKET_LABEL: Record<string, string> = { small: 'Small cap', mid: 'Mid cap', large: 'Large cap' }
const BUCKET_COLOR: Record<string, string> = {
  small: 'var(--color-s2)', mid: 'var(--color-s1)', large: 'var(--color-muted)',
}

const METHOD = [
  { who: 'Peter Lynch', what: 'Fast growers (20%+), small companies — "big companies, small moves"', w: 'Size 20% + Growth 25%' },
  { who: 'Jim Slater (Zulu)', what: 'PEG < 0.75 outstanding, < 1 good; low debt', w: 'GARP 20%' },
  { who: 'Raamdeo Agrawal (QGLP)', what: 'Quality (ROE ≥ 15–20%), Growth, Longevity, fair Price', w: 'Quality 20%' },
  { who: "William O'Neil (CANSLIM)", what: 'Earnings acceleration + leaders near 52-week highs', w: 'Momentum 15%' },
  { who: 'Rakesh Jhunjhunwala', what: 'Promoter skin in the game, long runway', w: 'inside Momentum' },
]

type SortKey = 'mb_score' | 'name' | 'rev_growth_ttm' | 'earnings_growth' | 'peg' | 'roe' | 'pos_52w' | 'insider_holding'

export default function Multibaggers() {
  const [market, setMarket] = useState<'india' | 'global'>('india')
  const [rows, setRows] = useState<MultibaggerRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bucket, setBucket] = useState<'all' | 'small' | 'mid' | 'large'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('mb_score')
  const [sortDesc, setSortDesc] = useState(true)
  const [showMethod, setShowMethod] = useState(false)
  const [reliableOnly, setReliableOnly] = useState(true)
  const [limit, setLimit] = useState(150)
  const nav = useNavigate()

  useEffect(() => {
    setRows(null)
    api<{ rows: MultibaggerRow[] }>(`/api/multibaggers?market=${market}`)
      .then((d) => setRows(d.rows))
      .catch((e) => setError(String(e)))
  }, [market])

  const filtered = useMemo(() => {
    let out = rows ?? []
    if (reliableOnly) out = out.filter((r) => r.completeness >= 0.6)
    if (bucket !== 'all') out = out.filter((r) => r.bucket === bucket)
    return [...out].sort((a, b) => {
      const va = sortKey === 'name' ? a.name : (a[sortKey] as number | null) ?? (sortKey === 'peg' ? 1e9 : -99)
      const vb = sortKey === 'name' ? b.name : (b[sortKey] as number | null) ?? (sortKey === 'peg' ? 1e9 : -99)
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sortDesc ? -cmp : cmp
    })
  }, [rows, reliableOnly, bucket, sortKey, sortDesc])

  useEffect(() => { setLimit(150) }, [market, reliableOnly, bucket, sortKey, sortDesc])
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit])

  const top = useMemo(
    () => (rows ?? []).filter((r) => r.completeness >= 0.5 && r.bucket !== 'large').slice(0, 6),
    [rows],
  )

  const setSort = (k: SortKey) => {
    if (k === sortKey) setSortDesc(!sortDesc)
    else { setSortKey(k); setSortDesc(k !== 'name') }
  }

  if (error) return <div className="text-crit p-8">Failed to load: {error}</div>

  const HEADERS: { key: SortKey; label: string; hint?: string }[] = [
    { key: 'name', label: 'Company' },
    { key: 'rev_growth_ttm', label: 'Rev TTM', hint: 'Revenue growth, trailing 12 months' },
    { key: 'earnings_growth', label: 'EPS Gr.', hint: "Earnings growth (O'Neil's C — current acceleration)" },
    { key: 'peg', label: 'PEG', hint: 'Slater Zulu rule: < 0.75 outstanding, < 1 good' },
    { key: 'roe', label: 'ROE', hint: 'QGLP quality gate: ≥ 15–20%' },
    { key: 'insider_holding', label: 'Promoter', hint: 'Insider/promoter holding — RJ skin in the game' },
    { key: 'pos_52w', label: '52w Pos', hint: "Position in 52-week range — O'Neil relative strength" },
    { key: 'mb_score', label: 'MB Score', hint: 'Size 20% + Growth 25% + GARP 20% + Quality 20% + Momentum 15%' },
  ]

  return (
    <div>
      <PageHeader
        title="Multibagger Radar"
        subtitle="Small & mid caps ranked by a blended formula from investors famous for multibaggers — Lynch, Slater, Agrawal (QGLP), O'Neil and Jhunjhunwala. High risk, high reward: position sizing matters."
        right={
          <div className="flex gap-2">
            <Chip active={market === 'india'} onClick={() => setMarket('india')}>🇮🇳 India</Chip>
            <Chip active={market === 'global'} onClick={() => setMarket('global')}>🌍 Global</Chip>
          </div>
        }
      />

      {/* Formula provenance */}
      <Card className="p-4 mb-5">
        <button className="flex items-center justify-between w-full cursor-pointer" onClick={() => setShowMethod(!showMethod)}>
          <span className="font-semibold text-sm">The formula — whose rules are blended here {showMethod ? '▾' : '▸'}</span>
          <span className="text-xs text-muted">Size 20% · Growth 25% · GARP 20% · Quality 20% · Momentum 15%</span>
        </button>
        {showMethod && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {METHOD.map((m) => (
              <div key={m.who} className="rounded-lg bg-raised border border-white/10 p-3">
                <div className="text-sm font-semibold">{m.who}</div>
                <div className="text-xs text-ink2 mt-1 leading-relaxed">{m.what}</div>
                <div className="text-[11px] text-s1 mt-1.5">{m.w}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top candidates */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {rows === null
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36" />)
          : top.map((r) => (
              <Link key={r.ticker} to={`/stock/${r.ticker}`}>
                <Card className="p-4 hover:border-s2/60 transition-colors h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      <div className="text-xs text-muted">{r.sector}</div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {r.bucket && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border"
                            style={{ color: BUCKET_COLOR[r.bucket], borderColor: BUCKET_COLOR[r.bucket] + '55' }}>
                            {BUCKET_LABEL[r.bucket]}
                          </span>
                        )}
                        <span className="text-[11px] text-muted">{fmtCap(r.market_cap, r.currency)}</span>
                      </div>
                    </div>
                    <ScoreRing value={r.mb_score} size={52} />
                  </div>
                  <div className="mt-2.5 space-y-1">
                    {r.signals.slice(0, 3).map((s) => (
                      <div key={s} className="text-[11px] text-ink2 flex gap-1.5">
                        <span className="text-s2">◆</span>{s}
                      </div>
                    ))}
                  </div>
                </Card>
              </Link>
            ))}
      </div>

      {/* Bucket filter */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {(['all', 'small', 'mid', 'large'] as const).map((b) => (
          <Chip key={b} active={bucket === b} onClick={() => setBucket(b)}>
            {b === 'all' ? `All (${rows?.length ?? '…'})` : `${BUCKET_LABEL[b]} (${rows?.filter((r) => r.bucket === b).length ?? '…'})`}
          </Chip>
        ))}
        <button onClick={() => setReliableOnly(!reliableOnly)}
          title="Micro-caps often have very few published fundamentals. Reliable = at least half the scoring metrics available."
          className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border ${
            reliableOnly ? 'bg-s2/15 text-s2 border-s2/40' : 'bg-raised text-ink2 border-white/10 hover:text-ink'
          }`}>
          {reliableOnly ? '✓ Reliable data only' : 'All stocks (incl. thin data)'}
        </button>
        <span className="text-xs text-muted ml-auto">{filtered.length} shown</span>
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
              <th className="px-3 py-2.5 font-medium">Signals</th>
              <th className="px-3 py-2.5 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows === null
              ? Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i}><td colSpan={10} className="px-3 py-2"><Skeleton className="h-6" /></td></tr>
                ))
              : visible.map((r) => (
                  <tr key={r.ticker} className="border-b border-white/5 hover:bg-raised cursor-pointer"
                    onClick={() => nav(`/stock/${r.ticker}`)}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[11px] text-muted">
                        {r.bucket && <span style={{ color: BUCKET_COLOR[r.bucket] }}>{BUCKET_LABEL[r.bucket]}</span>}
                        {' · '}{fmtCap(r.market_cap, r.currency)} · {r.sector}
                        {r.completeness < 0.6 && <span className="text-warn"> · thin data</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(r.rev_growth_ttm)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(r.earnings_growth)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtNum(r.peg, 2)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(r.roe)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{fmtPct(r.insider_holding, 0)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{r.pos_52w !== null ? `${Math.round(r.pos_52w * 100)}%` : '—'}</td>
                    <td className="px-3 py-2.5"><ScoreBar value={r.mb_score} /></td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs tabular-nums font-semibold" style={{ color: scoreColor(r.mb_score) }}
                        title={r.signals.join('\n') || 'No standout signals'}>
                        {r.signals.length} ◆
                      </span>
                    </td>
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
      </Card>
      <p className="text-[11px] text-muted mt-3 leading-relaxed max-w-4xl">
        Hover the ◆ count to see which legendary rules a stock triggers. "Prime Multibagger Setup" requires a
        score ≥ 72 <b>and</b> small/mid size — a large cap can compound, but ten-baggers overwhelmingly start small
        (Lynch, and Motilal Oswal's Wealth Creation Studies). Small caps carry real drawdown and liquidity risk;
        this is a research shortlist, not a buy list.
      </p>
    </div>
  )
}
