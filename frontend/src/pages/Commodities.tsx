import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, type Commodity } from '../api'
import { fmtNum } from '../format'
import { Card, PageHeader, Skeleton, tooltipStyle } from '../components/ui'

interface CommoditiesData {
  commodities: Commodity[]
  gold_silver_ratio: { date: string; value: number }[]
}

function MiniChart({ data, color, unit }: {
  data: { date: string; close: number }[]; color: string; unit: string
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
        <CartesianGrid stroke="var(--color-grid)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
          tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} minTickGap={70} />
        <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--color-muted)', fontSize: 10 }}
          tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => fmtNum(v, 0)} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${fmtNum(v as number, 2)} ${unit}`, 'Close']} />
        <Line type="monotone" dataKey="close" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function Commodities() {
  const [d, setD] = useState<CommoditiesData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<CommoditiesData>('/api/commodities').then(setD).catch((e) => setError(String(e)))
  }, [])

  const ratioAvg = useMemo(() => {
    const vals = d?.gold_silver_ratio.map((r) => r.value) ?? []
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }, [d])

  if (error) return <div className="text-crit p-8">Failed to load: {error}</div>

  const COLORS: Record<string, string> = {
    'GC=F': 'var(--color-s3)', 'SI=F': 'var(--color-s1)',
    'GOLDBEES.NS': 'var(--color-s3)', 'SILVERBEES.NS': 'var(--color-s1)',
    'HG=F': 'var(--color-s5)', 'CL=F': 'var(--color-s2)',
  }
  const UNITS: Record<string, string> = {
    'GC=F': 'USD/oz', 'SI=F': 'USD/oz', 'GOLDBEES.NS': '₹/unit',
    'SILVERBEES.NS': '₹/unit', 'HG=F': 'USD/lb', 'CL=F': 'USD/bbl',
  }

  const latestRatio = d?.gold_silver_ratio.at(-1)?.value

  return (
    <div>
      <PageHeader
        title="Commodities — Gold, Silver & More"
        subtitle="Precious metals as the portfolio stabilizer: 10-year trends in USD and INR, the gold/silver ratio as a relative-value signal, and 200-day momentum."
      />

      {d === null ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Signal tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {d.commodities.map((c) => (
              <Card key={c.ticker} className="p-4">
                <div className="text-xs text-muted">{c.name}</div>
                <div className="text-xl font-semibold mt-1 tabular-nums">
                  {c.signal ? fmtNum(c.signal.last, 2) : '—'}
                  <span className="text-xs text-muted font-normal ml-1">{UNITS[c.ticker]}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs">
                  {c.change_10y_pct !== null && (
                    <span className="tabular-nums"
                      style={{ color: c.change_10y_pct >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                      {c.change_10y_pct >= 0 ? '+' : ''}{c.change_10y_pct}% / 10y
                    </span>
                  )}
                  {c.signal && (
                    <span className="px-2 py-0.5 rounded-full border text-[11px]"
                      style={{
                        color: c.signal.above_dma200 ? 'var(--color-good)' : 'var(--color-serious)',
                        borderColor: (c.signal.above_dma200 ? 'var(--color-good)' : 'var(--color-serious)') + '55',
                      }}>
                      {c.signal.above_dma200 ? '▲' : '▼'} {Math.abs(c.signal.pct_vs_dma200)}% vs 200-DMA
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Price charts — small multiples, one axis each */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            {d.commodities.map((c) => (
              <Card key={c.ticker} className="p-4">
                <div className="font-semibold text-sm mb-1">{c.name} — 10 years</div>
                <MiniChart data={c.history} color={COLORS[c.ticker]} unit={UNITS[c.ticker]} />
              </Card>
            ))}
          </div>

          {/* Gold/Silver ratio */}
          <Card className="p-4 mb-4">
            <div className="font-semibold">Gold / Silver ratio</div>
            <div className="text-xs text-muted mb-2">
              How many ounces of silver buy one ounce of gold. Far <b className="text-ink2">above</b> its 10-year
              average ({fmtNum(ratioAvg, 0)}) → silver historically cheap vs gold; far below → gold relatively cheap.
              Currently <b className="text-ink2">{fmtNum(latestRatio, 1)}</b>.
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.gold_silver_ratio} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                <CartesianGrid stroke="var(--color-grid)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                  tickLine={false} axisLine={{ stroke: 'var(--color-line)' }} minTickGap={70} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                  tickLine={false} axisLine={false} width={40} />
                <Tooltip {...tooltipStyle} formatter={(v) => [fmtNum(v as number, 1), 'Ratio']} />
                {ratioAvg && (
                  <ReferenceLine y={ratioAvg} stroke="var(--color-muted)" strokeDasharray="4 4"
                    label={{ value: '10y avg', fill: 'var(--color-muted)', fontSize: 11, position: 'insideTopRight' }} />
                )}
                <Line type="monotone" dataKey="value" stroke="var(--color-s4)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4 text-sm text-ink2 leading-relaxed">
            <div className="font-semibold text-ink mb-1">How gold & silver fit a 10-year equity portfolio</div>
            Gold is not a growth asset — it has no revenue or earnings — but it hedges equity drawdowns, currency
            depreciation and inflation; for INR investors it has the extra tailwind of USD/INR. A common long-term
            allocation is <b className="text-ink">5–10% in gold</b> (SGBs or Gold BeES) with silver as a smaller,
            more volatile satellite that also carries industrial (solar, EV, electronics) demand. Use the ratio above
            for rebalancing between the two rather than timing outright entries.
          </Card>
        </>
      )}
    </div>
  )
}
