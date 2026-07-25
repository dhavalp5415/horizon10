import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, setWatch, type CheckRow, type StockDetailData } from '../api'
import { fmtCap, fmtCompact, fmtNum, fmtPct, fmtPrice, scoreColor, toneColor } from '../format'
import { Card, Chip, ScoreRing, Skeleton, StatTile, VerdictBadge, tooltipStyle } from '../components/ui'
import { DecadeSimulator, ReturnDnaCard, RoundTableCard, TwinsCard } from '../components/deepdive'

function Checklist({ title, verdictLabel, tone, checks, note }: {
  title: string; verdictLabel: string; tone: string; checks: CheckRow[]; note?: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-semibold text-sm">{title}</div>
        <span className="text-xs font-medium" style={{ color: toneColor[tone] }}>{verdictLabel}</span>
      </div>
      <div className="space-y-1.5">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center justify-between text-xs gap-2">
            <span className="flex items-center gap-2 text-ink2">
              <span className="w-4 text-center font-bold"
                style={{ color: c.ok === null ? 'var(--color-muted)' : c.ok ? 'var(--color-good)' : 'var(--color-crit)' }}>
                {c.ok === null ? '·' : c.ok ? '✓' : '✗'}
              </span>
              {c.label}
            </span>
            <span className="tabular-nums text-ink whitespace-nowrap">{c.value}</span>
          </div>
        ))}
      </div>
      {note && <p className="text-[11px] text-muted mt-2">{note}</p>}
    </Card>
  )
}

function FairValueStrip({ d }: { d: StockDetailData }) {
  const fv = d.legends.fair_value
  if (!fv.range || fv.fair_value === null || d.price === null) return null
  const lo = Math.min(fv.range.low, d.price) * 0.9
  const hi = Math.max(fv.range.high, d.price) * 1.1
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`
  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="font-semibold text-sm">Fair-value estimate vs price</div>
        <VerdictBadge verdict={fv.classification} small />
      </div>
      <div className="text-xs text-muted mb-5">
        Median of {fv.models_used} model{fv.models_used > 1 ? 's' : ''}:{' '}
        <b className="text-ink2">{fmtPrice(fv.fair_value, d.currency)}</b>
        {' '}→ upside{' '}
        <b style={{ color: (fv.upside ?? 0) >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
          {(fv.upside ?? 0) >= 0 ? '+' : ''}{fmtPct(fv.upside)}
        </b>
      </div>
      <div className="relative h-2 rounded-full bg-grid mx-2">
        <div className="absolute h-full rounded-full bg-s2/40"
          style={{ left: pos(fv.range.low), width: `calc(${pos(fv.range.high)} - ${pos(fv.range.low)})` }} />
        {fv.models.map((m) => (
          <div key={m.name} className="absolute -top-1 w-0.5 h-4 bg-s2" title={`${m.name}: ${fmtPrice(m.value, d.currency)}`}
            style={{ left: pos(m.value) }} />
        ))}
        <div className="absolute -top-2 w-1 h-6 rounded bg-ink" style={{ left: pos(d.price) }}
          title={`Current price ${fmtPrice(d.price, d.currency)}`} />
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-3 mx-2">
        <span>{fmtPrice(fv.range.low, d.currency)} (lowest model)</span>
        <span className="text-ink2">▮ current price {fmtPrice(d.price, d.currency)}</span>
        <span>{fmtPrice(fv.range.high, d.currency)} (highest model)</span>
      </div>
    </Card>
  )
}

type Range = '1y' | '5y' | 'max'

const PILLAR_HINTS: Record<string, string> = {
  valuation: 'PE vs sector median, PEG, P/S vs sector — is the price fair?',
  growth: 'TTM revenue growth, ~4yr revenue CAGR, earnings growth',
  consistency: 'How steadily revenue grew across reported years',
  quality: 'ROE, margins, debt, free-cash-flow generation',
}

export default function StockDetail() {
  const { ticker } = useParams()
  const [d, setD] = useState<StockDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<Range>('5y')
  const [watched, setWatched] = useState(false)

  useEffect(() => {
    setD(null)
    setError(null)
    api<StockDetailData>(`/api/stock/${ticker}`)
      .then((data) => { setD(data); setWatched(data.watched) })
      .catch((e) => setError(String(e)))
  }, [ticker])

  if (error) return <div className="text-crit p-8">Failed to load {ticker}: {error}</div>
  if (!d) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const m = d.metrics
  const hist = d.history[range] ?? []
  const perf = hist.length >= 2 && hist[0].close > 0
    ? (hist[hist.length - 1].close / hist[0].close - 1) : null
  const radarData = (['valuation', 'growth', 'consistency', 'quality'] as const).map((k) => ({
    pillar: k[0].toUpperCase() + k.slice(1),
    value: d.scores[k] ?? 0,
  }))
  const finData = d.financials.filter((f) => f.revenue !== null || f.net_income !== null)

  const metricRows: [string, string, string?][] = [
    ['PE (trailing)', fmtNum(m.pe), 'Price ÷ last-12-month earnings'],
    ['PE vs sector', m.pe_vs_sector != null ? `${fmtNum(m.pe_vs_sector as number, 2)}× median` : '—',
      `Sector median PE ≈ ${fmtNum(m.sector_median_pe)}. Below 1× = cheaper than peers`],
    ['Forward PE', fmtNum(m.forward_pe), 'Price ÷ next-year expected earnings'],
    ['PEG', fmtNum(m.peg, 2), 'PE ÷ expected growth. ~1 = fairly priced growth'],
    ['P/S', fmtNum(m.ps, 2)],
    ['P/B', fmtNum(m.pb, 2)],
    ['Revenue growth (TTM)', fmtPct(m.rev_growth_ttm)],
    ['Revenue CAGR (~4y)', fmtPct(m.rev_cagr)],
    ['Earnings growth', fmtPct(m.earnings_growth)],
    ['ROE', fmtPct(m.roe)],
    ['Net margin', fmtPct(m.net_margin)],
    ['Operating margin', fmtPct(m.op_margin)],
    ['Debt / Equity', m.debt_to_equity != null ? fmtNum(m.debt_to_equity, 0) + '%' : '—'],
    ['FCF margin', fmtPct(m.fcf_margin)],
    ['Dividend yield', m.dividend_yield != null ? fmtNum(m.dividend_yield, 2) + '%' : '—'],
    ['Positive growth years', fmtPct(m.positive_growth_years, 0), 'Share of reported years with revenue up'],
  ]

  return (
    <div>
      <Link to={d.market === 'india' ? '/' : '/'} className="text-xs text-muted hover:text-ink">← Back to screener</Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-5 mt-2 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{d.name}</h1>
          <div className="text-sm text-muted mt-0.5">
            {d.ticker} · {d.sector} · {d.market === 'india' ? '🇮🇳 India' : '🌍 Global'}
          </div>
        </div>
        <div className="text-3xl font-semibold tabular-nums">{fmtPrice(d.price, d.currency)}</div>
        <VerdictBadge verdict={d.verdict} />
        <button
          onClick={async () => { const next = !watched; setWatched(next); await setWatch(d.ticker, next) }}
          title={watched ? 'Remove from watchlist' : 'Add to watchlist'}
          className={`text-2xl cursor-pointer transition-colors ${watched ? 'text-warn' : 'text-muted hover:text-ink'}`}
        >
          {watched ? '★' : '☆'}
        </button>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right text-xs text-muted">10-Year<br />Potential</div>
          <ScoreRing value={d.scores.composite} size={64} />
        </div>
      </div>

      {d.completeness < 0.6 && (
        <div className="mb-4 px-4 py-2.5 rounded-lg border border-warn/40 bg-warn/10 text-warn text-sm">
          ⚠ Only {Math.round(d.completeness * 100)}% of scoring metrics are available for this stock — treat the score as indicative, not definitive.
        </div>
      )}

      {/* Expectations gap — what is the price assuming? */}
      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="font-semibold text-sm" title="Reverse-Graham: at fair pricing PE = 8.5 + 2g, so g = (PE − 8.5) / 2">
            What is the price assuming?
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{
              color: toneColor[d.expectations.verdict.tone],
              borderColor: toneColor[d.expectations.verdict.tone] + '55',
              background: toneColor[d.expectations.verdict.tone] + '14',
            }}>
            {d.expectations.verdict.label}
          </span>
        </div>
        {d.expectations.implied_growth !== null ? (
          <>
            <div className="space-y-2">
              {[
                { label: 'Growth PRICED IN', v: d.expectations.implied_growth, color: 'var(--color-s3)' },
                { label: 'Growth DELIVERED', v: d.expectations.delivered_growth, color: 'var(--color-s2)' },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-3 text-xs">
                  <span className="w-36 text-ink2">{b.label}</span>
                  <div className="h-3 flex-1 rounded-md bg-grid overflow-hidden">
                    <div className="h-full rounded-md" style={{
                      width: `${Math.min(100, ((b.v ?? 0) / 0.30) * 100)}%`, background: b.color,
                    }} />
                  </div>
                  <span className="w-14 text-right tabular-nums font-semibold">{fmtPct(b.v)}/yr</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-2.5 leading-relaxed">
              {d.expectations.note} Implied growth from inverting Graham's formula at PE {fmtNum(d.metrics.pe)}
              {d.expectations.peg1_reading !== null && <> (a stricter PEG=1 reading would demand {fmtPct(d.expectations.peg1_reading)})</>};
              delivered = the company's demonstrated rate, both capped at 30%/yr.
              {d.expectations.gap !== null && (
                <> Gap: <b style={{ color: d.expectations.gap >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                  {d.expectations.gap >= 0 ? '+' : ''}{fmtNum(d.expectations.gap * 100, 1)}pp
                </b>.</>
              )}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted">{d.expectations.note}</p>
        )}
      </Card>

      {/* Pillar scores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {(['valuation', 'growth', 'consistency', 'quality'] as const).map((k) => (
          <Card key={k} className="p-4" >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted uppercase tracking-wide" title={PILLAR_HINTS[k]}>{k}</div>
                <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: scoreColor(d.scores[k]) }}>
                  {d.scores[k] === null ? '—' : Math.round(d.scores[k]!)}
                </div>
              </div>
              <div className="h-1.5 w-20 rounded-full bg-grid overflow-hidden self-end mb-2">
                <div className="h-full" style={{ width: `${d.scores[k] ?? 0}%`, background: scoreColor(d.scores[k]) }} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Price chart */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold">Price</div>
              {perf !== null && (
                <div className="text-xs tabular-nums" style={{ color: perf >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                  {perf >= 0 ? '+' : ''}{fmtPct(perf)} over {range === 'max' ? 'all time' : range.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex gap-1.5">
              {(['1y', '5y', 'max'] as Range[]).map((r) => (
                <Chip key={r} active={range === r} onClick={() => setRange(r)}>{r.toUpperCase()}</Chip>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={hist} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
              <CartesianGrid stroke="var(--color-grid)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} minTickGap={60} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                tickLine={false} axisLine={false} width={62}
                tickFormatter={(v: number) => fmtNum(v, 0)} />
              <Tooltip {...tooltipStyle} formatter={(v) => [fmtPrice(v as number, d.currency), 'Close']} />
              <Line type="monotone" dataKey="close" stroke="var(--color-s1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Radar */}
        <Card className="p-4">
          <div className="font-semibold mb-1">Score profile</div>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="var(--color-grid)" />
              <PolarAngleAxis dataKey="pillar" tick={{ fill: 'var(--color-ink2)', fontSize: 12 }} />
              <Radar dataKey="value" stroke="var(--color-s1)" fill="var(--color-s1)" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip {...tooltipStyle} formatter={(v) => [`${Math.round(v as number)}/100`, 'Score']} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Revenue & profit */}
        <Card className="p-4">
          <div className="font-semibold">Revenue & net profit by year</div>
          <div className="text-xs text-muted mb-2">Annual reported figures ({d.currency})</div>
          {finData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted text-sm">No statement data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={finData} margin={{ top: 6, right: 6, bottom: 0, left: 6 }} barGap={2}>
                <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false}
                  axisLine={{ stroke: 'var(--color-line)' }} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                  width={70} tickFormatter={(v: number) => fmtCompact(v, d.currency)} />
                <Tooltip {...tooltipStyle}
                  formatter={(v, name) => [fmtCompact(v as number, d.currency), name === 'revenue' ? 'Revenue' : 'Net profit']} />
                <Bar dataKey="revenue" name="revenue" fill="var(--color-s1)" radius={[4, 4, 0, 0]} maxBarSize={34} />
                <Bar dataKey="net_income" name="net_income" fill="var(--color-s2)" radius={[4, 4, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-1 text-xs text-ink2">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-s1" />Revenue</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-s2" />Net profit</span>
          </div>
          {finData.some((f) => f.rev_growth !== null) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {finData.filter((f) => f.rev_growth !== null).map((f) => (
                <span key={f.year} className="text-[11px] px-2 py-1 rounded-md bg-raised tabular-nums"
                  style={{ color: (f.rev_growth ?? 0) >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                  {f.year}: {(f.rev_growth ?? 0) >= 0 ? '+' : ''}{fmtPct(f.rev_growth)}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Metrics table */}
        <Card className="p-4">
          <div className="font-semibold mb-2">All metrics</div>
          <div className="grid grid-cols-2 gap-x-6">
            {metricRows.map(([label, value, hint]) => (
              <div key={label} title={hint}
                className="flex justify-between items-baseline py-1.5 border-b border-white/5 text-sm">
                <span className="text-ink2">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* What the legends say */}
      <h2 className="text-lg font-semibold mt-6 mb-1">What the legends say</h2>
      <p className="text-xs text-muted mb-3 max-w-3xl">
        Classic value frameworks — deliberately conservative, so strong growth franchises often read expensive here.
        Models that need positive earnings show "not applicable" instead of a fake number.
      </p>
      <FairValueStrip d={d} />
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <div className="font-semibold text-sm mb-2">Benjamin Graham</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink2 text-xs" title="√(22.5 × EPS × book value) — Graham's maximum fair price">Graham Number</span>
              <span className="tabular-nums">
                {d.legends.graham.graham_number !== null ? fmtPrice(d.legends.graham.graham_number, d.currency) : '—'}
                {d.legends.graham.number_upside !== null && (
                  <span className="text-xs ml-1.5" style={{ color: d.legends.graham.number_upside >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                    {d.legends.graham.number_upside >= 0 ? '+' : ''}{fmtPct(d.legends.graham.number_upside, 0)}
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink2 text-xs" title="EPS × (8.5 + 2 × growth%) — Graham's growth-stock formula">Growth formula</span>
              <span className="tabular-nums">
                {d.legends.graham.formula_value !== null ? fmtPrice(d.legends.graham.formula_value, d.currency) : '—'}
                {d.legends.graham.formula_upside !== null && (
                  <span className="text-xs ml-1.5" style={{ color: d.legends.graham.formula_upside >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                    {d.legends.graham.formula_upside >= 0 ? '+' : ''}{fmtPct(d.legends.graham.formula_upside, 0)}
                  </span>
                )}
              </span>
            </div>
          </div>
          {d.legends.graham.note && <p className="text-[11px] text-muted mt-2">{d.legends.graham.note}</p>}
        </Card>

        <Card className="p-4">
          <div className="font-semibold text-sm mb-2">Peter Lynch (GARP)</div>
          <div className="flex justify-between text-sm">
            <span className="text-ink2 text-xs" title="Fair PE = earnings growth rate (PEG = 1)">Fair value</span>
            <span className="tabular-nums">
              {d.legends.lynch.fair_value !== null ? fmtPrice(d.legends.lynch.fair_value, d.currency) : '—'}
              {d.legends.lynch.upside !== null && (
                <span className="text-xs ml-1.5" style={{ color: d.legends.lynch.upside >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                  {d.legends.lynch.upside >= 0 ? '+' : ''}{fmtPct(d.legends.lynch.upside, 0)}
                </span>
              )}
            </span>
          </div>
          {d.legends.lynch.note && <p className="text-[11px] text-muted mt-2">{d.legends.lynch.note}</p>}
        </Card>

        <Card className="p-4">
          <div className="font-semibold text-sm mb-2" title="Value / Quality / Momentum percentiles within this market">
            BlackRock factor lens
          </div>
          {(['value', 'quality', 'momentum'] as const).map((f) => (
            <div key={f} className="flex items-center gap-2 mb-2">
              <span className="text-xs text-ink2 w-20 capitalize">{f}</span>
              <div className="h-1.5 flex-1 rounded-full bg-grid overflow-hidden">
                <div className="h-full bg-s4" style={{ width: `${d.legends.factors[f] ?? 0}%` }} />
              </div>
              <span className="text-xs tabular-nums w-8 text-right text-ink2">
                {d.legends.factors[f] !== null ? `${Math.round(d.legends.factors[f]!)}` : '—'}
              </span>
            </div>
          ))}
          <p className="text-[11px] text-muted mt-2">
            Percentile vs all {d.market === 'india' ? 'Indian' : 'global'} stocks tracked — factor-style analysis, not an official BlackRock product.
          </p>
        </Card>
      </div>
      {/* Multibagger radar */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <ScoreRing value={d.multibagger.score} size={56} />
          <div className="min-w-0">
            <div className="font-semibold text-sm">Multibagger Radar
              {d.multibagger.bucket && (
                <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full border border-white/15 text-ink2 capitalize">
                  {d.multibagger.bucket} cap
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: toneColor[d.multibagger.verdict.tone] }}>
              {d.multibagger.verdict.label}
            </div>
          </div>
          <div className="flex-1 min-w-[240px] flex flex-wrap gap-x-4 gap-y-1">
            {d.multibagger.signals.length > 0
              ? d.multibagger.signals.map((s) => (
                  <span key={s} className="text-[11px] text-ink2"><span className="text-s2">◆</span> {s}</span>
                ))
              : <span className="text-[11px] text-muted">No standout multibagger signals triggered.</span>}
          </div>
        </div>
        <p className="text-[11px] text-muted mt-2">
          Blend of Lynch (size + fast growth), Slater's Zulu PEG, Agrawal's QGLP quality, O'Neil momentum and RJ promoter
          conviction — see the Multibaggers page for the full ranking.
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Checklist title="Warren Buffett — company checklist"
          verdictLabel={d.legends.buffett.verdict.label} tone={d.legends.buffett.verdict.tone}
          checks={d.legends.buffett.checks}
          note='"Wonderful company at a fair price" needs both the quality checks and a decent valuation score.' />
        <Checklist title="Rakesh Jhunjhunwala — style checklist"
          verdictLabel={d.legends.rj.verdict.label} tone={d.legends.rj.verdict.tone}
          checks={d.legends.rj.checks}
          note="Reconstructed from his public interviews — growth at a reasonable price with promoter skin in the game." />
      </div>

      {/* Round table + deep-dive differentiators */}
      <RoundTableCard rt={d.roundtable} />
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <DecadeSimulator d={d} />
        <TwinsCard ticker={d.ticker} />
        {d.return_dna && <ReturnDnaCard dna={d.return_dna} />}
      </div>

      {/* Context tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Market cap" value={fmtCap(d.market_cap, d.currency)} />
        <StatTile label="52-week range" value={
          <span className="text-base tabular-nums">{fmtPrice(d.low_52w, d.currency)} – {fmtPrice(d.high_52w, d.currency)}</span>
        } />
        <StatTile label="Growth volatility" value={fmtPct(m.growth_volatility)}
          hint="Std-dev of yearly revenue growth — lower is steadier" sub="lower = steadier" />
        <StatTile label="Data completeness" value={fmtPct(d.completeness, 0)}
          sub="of scoring metrics available" />
      </div>
    </div>
  )
}
