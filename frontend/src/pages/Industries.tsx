import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type SectorSummary } from '../api'
import { scoreColor } from '../format'
import { Card, Chip, PageHeader, ScoreBar, Skeleton, VerdictBadge } from '../components/ui'

export default function Industries() {
  const [market, setMarket] = useState<'india' | 'global'>('india')
  const [sectors, setSectors] = useState<SectorSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSectors(null)
    api<{ sectors: SectorSummary[] }>(`/api/industries?market=${market}`)
      .then((d) => setSectors(d.sectors))
      .catch((e) => setError(String(e)))
  }, [market])

  if (error) return <div className="text-crit p-8">Failed to load: {error}</div>

  const maxScore = Math.max(...(sectors ?? []).map((s) => s.avg_score), 1)

  return (
    <div>
      <PageHeader
        title="Industry Rankings"
        subtitle="Sectors ranked by the average 10-year potential score of their stocks — where structural growth, quality and reasonable valuations line up for a decade-long hold."
        right={
          <div className="flex gap-2">
            <Chip active={market === 'india'} onClick={() => setMarket('india')}>🇮🇳 India</Chip>
            <Chip active={market === 'global'} onClick={() => setMarket('global')}>🌍 Global</Chip>
          </div>
        }
      />

      <div className="flex flex-col gap-3">
        {sectors === null
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : sectors.map((s, rank) => (
              <Card key={s.sector} className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-8 text-lg font-bold text-muted tabular-nums">#{rank + 1}</div>
                  <div className="w-52 min-w-0">
                    <div className="font-semibold truncate">{s.sector}</div>
                    <div className="text-xs text-muted">
                      {s.scored_count ?? s.count} scored of {s.count} tracked
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="h-5 rounded-md bg-grid overflow-hidden">
                      <div className="h-full rounded-md flex items-center justify-end pr-2 text-[11px] font-semibold text-page min-w-fit"
                        style={{ width: `${(s.avg_score / maxScore) * 100}%`, background: scoreColor(s.avg_score) }}>
                        {s.avg_score}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-x-5 text-xs text-ink2 w-[340px]">
                    <div>Growth<ScoreBar value={s.avg_growth} /></div>
                    <div>Value<ScoreBar value={s.avg_valuation} /></div>
                    <div>Quality<ScoreBar value={s.avg_quality} /></div>
                    <div>Steady<ScoreBar value={s.avg_consistency} /></div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 ml-12">
                  {s.top_stocks.map((t) => (
                    <Link key={t.ticker} to={`/stock/${t.ticker}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-raised border border-white/10 hover:border-s1/50 text-sm">
                      <span className="font-medium">{t.name}</span>
                      <span className="tabular-nums text-xs font-semibold" style={{ color: scoreColor(t.score) }}>
                        {Math.round(t.score)}
                      </span>
                      <VerdictBadge verdict={t.verdict} small />
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
      </div>
    </div>
  )
}
