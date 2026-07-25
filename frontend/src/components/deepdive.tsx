import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  api, type ReturnDna, type RoundTableSummary, type RoundTableVote,
  type StockDetailData, type TwinRow,
} from '../api'
import { fmtNum, fmtPct, fmtPrice, toneColor } from '../format'
import { Card } from './ui'

const VOTE_META = {
  1: { icon: '▲', color: 'var(--color-good)', label: 'buy-lean' },
  0: { icon: '●', color: 'var(--color-muted)', label: 'hold' },
  [-1]: { icon: '▼', color: 'var(--color-crit)', label: 'avoid' },
} as const

export function RoundTableCard({ rt }: { rt: RoundTableSummary & { votes: RoundTableVote[] } }) {
  return (
    <Card className="p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="font-semibold text-sm">Legends' Round Table</div>
        <div className="flex items-center gap-3">
          {rt.disagreement !== null && rt.battleground && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-warn/50 text-warn">
              ⚔ high disagreement {rt.disagreement}
            </span>
          )}
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{
              color: toneColor[rt.verdict.tone],
              borderColor: toneColor[rt.verdict.tone] + '55',
              background: toneColor[rt.verdict.tone] + '14',
            }}>
            {rt.verdict.label} · {rt.counts.buy}▲ {rt.counts.hold}● {rt.counts.avoid}▼
          </span>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {rt.votes.map((v) => {
          const m = VOTE_META[v.vote]
          return (
            <div key={v.who} className="flex items-baseline gap-2 text-xs">
              <span style={{ color: m.color }} className="w-3">{m.icon}</span>
              <span className="font-semibold w-24 shrink-0">{v.who}</span>
              <span className="text-ink2">{v.reason}</span>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-muted mt-2.5">
        When the great frameworks agree, act on conviction; when they split, that's a battleground — study
        WHY they disagree before touching it. Disagreement itself is information no single score can carry.
      </p>
    </Card>
  )
}

export function ReturnDnaCard({ dna }: { dna: ReturnDna }) {
  const rows = [
    { label: 'Total price return', v: dna.price_cagr, color: 'var(--color-s1)' },
    { label: 'from business growth', v: dna.business_cagr, color: 'var(--color-s2)' },
    { label: 'from rerating (multiple)', v: dna.rerating_cagr, color: 'var(--color-s3)' },
  ]
  const maxAbs = Math.max(0.12, ...rows.map((r) => Math.abs(r.v ?? 0)))
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="font-semibold text-sm">Return DNA — last ~{dna.years}y</div>
        <span className="text-xs font-medium" style={{ color: toneColor[dna.verdict.tone] }}>
          {dna.verdict.label}
        </span>
      </div>
      <div className="space-y-2 mt-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 text-xs">
            <span className="w-40 text-ink2">{r.label}</span>
            <div className="flex-1 h-3 relative">
              <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
              {r.v !== null && (
                <div className="absolute inset-y-0 rounded-sm"
                  style={{
                    background: r.color,
                    left: r.v >= 0 ? '50%' : `${50 - (Math.abs(r.v) / maxAbs) * 50}%`,
                    width: `${(Math.abs(r.v) / maxAbs) * 50}%`,
                  }} />
              )}
            </div>
            <span className="w-16 text-right tabular-nums font-semibold">
              {r.v !== null ? `${r.v >= 0 ? '+' : ''}${fmtPct(r.v)}/yr` : '—'}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-2.5 leading-relaxed">{dna.note}</p>
    </Card>
  )
}

export function TwinsCard({ ticker }: { ticker: string }) {
  const [twins, setTwins] = useState<TwinRow[] | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    setTwins(null)
    api<{ twins: TwinRow[]; note: string | null }>(`/api/twins/${ticker}`)
      .then((d) => { setTwins(d.twins); setNote(d.note) })
      .catch(() => setNote('Twin search unavailable.'))
  }, [ticker])

  return (
    <Card className="p-4">
      <div className="font-semibold text-sm mb-1">Fundamental twins</div>
      <div className="text-[11px] text-muted mb-2">
        Closest quality/growth profiles across the whole universe — any sector, any market. Green = same character, cheaper price.
      </div>
      {twins === null && !note && <div className="text-xs text-muted py-4">Searching 380+ stocks…</div>}
      {note && <div className="text-xs text-muted py-2">{note}</div>}
      {twins && twins.map((t) => (
        <Link key={t.ticker} to={`/stock/${t.ticker}`}
          className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0 hover:bg-raised rounded px-1 text-xs">
          <span className="w-8 tabular-nums text-s4 font-semibold">{Math.round(t.similarity)}%</span>
          <span className="min-w-0 flex-1">
            <span className="font-medium text-sm">{t.name}</span>
            <span className="text-muted ml-2">{t.market === 'india' ? '🇮🇳' : '🌍'} {t.sector}</span>
          </span>
          <span className="tabular-nums text-ink2">PE {fmtNum(t.pe)}</span>
          {t.cheaper && (
            <span className="px-2 py-0.5 rounded-full border border-good/50 text-good text-[11px]">cheaper</span>
          )}
        </Link>
      ))}
    </Card>
  )
}

export function DecadeSimulator({ d }: { d: StockDetailData }) {
  const pe = d.metrics.pe
  const price = d.price
  const eps0 = pe && pe > 0 && price ? price / pe : null
  const divYield = (d.metrics.dividend_yield ?? 0) / 100  // stored in %
  const delivered = (d.expectations.delivered_growth ?? 0.08) * 100
  const implied = (d.expectations.implied_growth ?? delivered / 100) * 100
  const sectorPe = d.metrics.sector_median_pe

  const [g, setG] = useState(Math.round(delivered))
  const [exitPe, setExitPe] = useState(Math.round(pe ?? 20))
  const [preset, setPreset] = useState<'bear' | 'base' | 'bull' | 'custom'>('base')

  useEffect(() => {
    // reseed when the stock changes
    setG(Math.round(delivered)); setExitPe(Math.round(sectorPe ?? pe ?? 20)); setPreset('base')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.ticker])

  const apply = (p: 'bear' | 'base' | 'bull') => {
    setPreset(p)
    if (p === 'bear') { setG(Math.max(0, Math.round(delivered / 2))); setExitPe(Math.round(Math.min(pe ?? 12, 12))) }
    if (p === 'base') { setG(Math.round(delivered)); setExitPe(Math.round(sectorPe ?? (pe ?? 20) * 0.8)) }
    if (p === 'bull') { setG(Math.round(Math.max(implied, delivered))); setExitPe(Math.round(pe ?? 25)) }
  }

  const result = useMemo(() => {
    if (!eps0 || !price) return null
    const price10 = eps0 * Math.pow(1 + g / 100, 10) * exitPe
    const priceCagr = Math.pow(price10 / price, 1 / 10) - 1
    const totalCagr = priceCagr + divYield
    const wealth = 100000 * Math.pow(1 + totalCagr, 10)
    return { price10, priceCagr, totalCagr, wealth }
  }, [eps0, price, g, exitPe, divYield])

  if (!eps0) {
    return (
      <Card className="p-4">
        <div className="font-semibold text-sm mb-1">Decade Simulator</div>
        <p className="text-xs text-muted">Needs positive earnings to project — this stock currently has none.</p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="font-semibold text-sm">Decade Simulator — what needs to be true</div>
        <div className="flex gap-1.5">
          {(['bear', 'base', 'bull'] as const).map((p) => (
            <button key={p} onClick={() => apply(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border capitalize ${
                preset === p ? 'bg-s1/15 text-s1 border-s1/40' : 'bg-raised text-ink2 border-white/10 hover:text-ink'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mb-3">
        <label className="text-xs text-ink2">
          EPS growth: <b className="text-ink tabular-nums">{g}%/yr</b>
          <input type="range" min={0} max={35} value={g}
            onChange={(e) => { setG(+e.target.value); setPreset('custom') }}
            className="w-full accent-[#3987e5]" />
          <span className="text-[10px] text-muted">delivered {delivered.toFixed(0)}% · priced-in {implied.toFixed(0)}%</span>
        </label>
        <label className="text-xs text-ink2">
          Exit PE in 2036: <b className="text-ink tabular-nums">{exitPe}×</b>
          <input type="range" min={5} max={60} value={exitPe}
            onChange={(e) => { setExitPe(+e.target.value); setPreset('custom') }}
            className="w-full accent-[#3987e5]" />
          <span className="text-[10px] text-muted">today {fmtNum(pe)}× · sector median {fmtNum(sectorPe)}×</span>
        </label>
      </div>
      {result && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg bg-raised border border-white/10 px-4 py-3">
          <div>
            <div className="text-[10px] text-muted uppercase">Implied CAGR (incl. div)</div>
            <div className="text-xl font-semibold tabular-nums"
              style={{ color: result.totalCagr >= 0.10 ? 'var(--color-good)' : result.totalCagr >= 0 ? 'var(--color-warn)' : 'var(--color-crit)' }}>
              {(result.totalCagr * 100).toFixed(1)}%/yr
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted uppercase">₹1,00,000 becomes</div>
            <div className="text-xl font-semibold tabular-nums">
              ₹{Math.round(result.wealth).toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted uppercase">Price in 10y</div>
            <div className="text-xl font-semibold tabular-nums">{fmtPrice(result.price10, d.currency)}</div>
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted mt-2">
        Simple model: EPS compounds at your rate, market pays your exit multiple, dividends at today's yield.
        No model predicts a decade — this shows which ASSUMPTIONS your return depends on.
      </p>
    </Card>
  )
}
