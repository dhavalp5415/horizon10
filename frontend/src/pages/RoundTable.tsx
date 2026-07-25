import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, type RoundTableRow } from '../api'
import { fmtPrice } from '../format'
import { Card, Chip, PageHeader, Skeleton, VerdictBadge } from '../components/ui'

function ConsensusMeter({ value }: { value: number }) {
  // value in [-1, 1] -> needle position
  const pct = ((value + 1) / 2) * 100
  return (
    <div className="relative h-2 w-28 rounded-full overflow-hidden bg-grid" title={`Consensus ${value}`}>
      <div className="absolute inset-y-0 left-0 w-1/3 bg-crit/40" />
      <div className="absolute inset-y-0 left-1/3 w-1/3 bg-muted/30" />
      <div className="absolute inset-y-0 left-2/3 w-1/3 bg-good/40" />
      <div className="absolute -top-0 w-1 h-full bg-ink rounded" style={{ left: `calc(${pct}% - 2px)` }} />
    </div>
  )
}

export default function RoundTable() {
  const [market, setMarket] = useState<'india' | 'global'>('india')
  const [rows, setRows] = useState<RoundTableRow[] | null>(null)
  const [battlegrounds, setBattlegrounds] = useState<RoundTableRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'consensus' | 'battleground'>('consensus')
  const [limit, setLimit] = useState(150)
  const nav = useNavigate()

  useEffect(() => {
    setRows(null)
    api<{ rows: RoundTableRow[]; battlegrounds: RoundTableRow[] }>(`/api/roundtable?market=${market}`)
      .then((d) => { setRows(d.rows); setBattlegrounds(d.battlegrounds) })
      .catch((e) => setError(String(e)))
  }, [market])

  const shown = useMemo(() => {
    if (!rows) return []
    if (view === 'battleground') {
      return [...rows].sort((a, b) => (b.disagreement ?? 0) - (a.disagreement ?? 0))
    }
    return rows
  }, [rows, view])

  useEffect(() => { setLimit(150) }, [market, view])
  const visible = useMemo(() => shown.slice(0, limit), [shown, limit])

  if (error) return <div className="text-crit p-8">Failed to load: {error}</div>

  return (
    <div>
      <PageHeader
        title="Round Table"
        subtitle="Eight frameworks — Graham, Lynch, Buffett, Jhunjhunwala, factors, expectations, multibagger, 10Y — each vote on every stock. Consensus is conviction; DISAGREEMENT is where mispricing hides."
        right={
          <div className="flex gap-2">
            <Chip active={market === 'india'} onClick={() => setMarket('india')}>🇮🇳 India</Chip>
            <Chip active={market === 'global'} onClick={() => setMarket('global')}>🌍 Global</Chip>
          </div>
        }
      />

      {/* Battleground cards */}
      {battlegrounds.length > 0 && (
        <>
          <h2 className="font-semibold mb-2">⚔ Battlegrounds — the legends can't agree</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {battlegrounds.slice(0, 6).map((r) => (
              <Link key={r.ticker} to={`/stock/${r.ticker}`}>
                <Card className="p-4 hover:border-warn/60 transition-colors h-full">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                      <div className="text-xs text-muted">{r.sector}</div>
                    </div>
                    <span className="text-xs text-warn tabular-nums whitespace-nowrap">σ {r.disagreement}</span>
                  </div>
                  <div className="text-xs mt-2 tabular-nums">
                    <span className="text-good">{r.counts.buy}▲</span>{' '}
                    <span className="text-muted">{r.counts.hold}●</span>{' '}
                    <span className="text-crit">{r.counts.avoid}▼</span>
                  </div>
                  <div className="mt-1.5 space-y-0.5">
                    {r.votes.filter((v) => v.vote !== 0).slice(0, 3).map((v) => (
                      <div key={v.who} className="text-[11px] text-ink2 truncate">
                        <span style={{ color: v.vote > 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                          {v.vote > 0 ? '▲' : '▼'}
                        </span>{' '}
                        <b>{v.who}:</b> {v.reason}
                      </div>
                    ))}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-2 mb-4">
        <Chip active={view === 'consensus'} onClick={() => setView('consensus')}>By consensus</Chip>
        <Chip active={view === 'battleground'} onClick={() => setView('battleground')}>By disagreement</Chip>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted border-b border-white/10">
              {['Company', 'Votes', 'Consensus', 'Disagreement', 'Verdict'].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows === null
              ? Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-3 py-2"><Skeleton className="h-6" /></td></tr>
                ))
              : visible.map((r) => (
                  <tr key={r.ticker} className="border-b border-white/5 hover:bg-raised cursor-pointer"
                    onClick={() => nav(`/stock/${r.ticker}`)}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[11px] text-muted">{r.sector} · {fmtPrice(r.price, r.currency)}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-xs">
                      <span className="text-good">{r.counts.buy}▲</span>{' '}
                      <span className="text-muted">{r.counts.hold}●</span>{' '}
                      <span className="text-crit">{r.counts.avoid}▼</span>
                    </td>
                    <td className="px-3 py-2.5"><ConsensusMeter value={r.consensus ?? 0} /></td>
                    <td className="px-3 py-2.5 tabular-nums text-xs"
                      style={{ color: r.battleground ? 'var(--color-warn)' : 'var(--color-ink2)' }}>
                      {r.disagreement}{r.battleground && ' ⚔'}
                    </td>
                    <td className="px-3 py-2.5"><VerdictBadge verdict={r.verdict} small /></td>
                  </tr>
                ))}
          </tbody>
        </table>
        {rows !== null && shown.length > visible.length && (
          <div className="p-3 text-center border-t border-white/5">
            <button onClick={() => setLimit(limit + 250)}
              className="px-4 py-1.5 rounded-lg bg-raised border border-white/10 text-ink2 hover:text-ink hover:border-white/25 text-sm font-medium cursor-pointer">
              Show 250 more ({shown.length - visible.length} remaining)
            </button>
          </div>
        )}
      </Card>
      <p className="text-[11px] text-muted mt-3 max-w-4xl leading-relaxed">
        Every rating service collapses a stock to one number. The Round Table deliberately doesn't: eight
        philosophies vote independently, and the spread of their votes (σ) is shown as its own signal. High
        consensus + cheap = conviction ideas; high disagreement = do your homework, the frameworks are fighting
        over exactly the thing that will decide the outcome.
      </p>
    </div>
  )
}
