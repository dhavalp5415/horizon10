import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, type PulseData } from '../api'
import { scoreColor } from '../format'
import { Card, PageHeader, Skeleton } from '../components/ui'

export default function Pulse() {
  const [d, setD] = useState<PulseData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<PulseData>('/api/pulse').then(setD).catch((e) => setError(String(e)))
  }, [])

  if (error) return <div className="text-crit p-8">Failed to load: {error}</div>

  return (
    <div>
      <PageHeader
        title="Pulse — what changed"
        subtitle="Every refresh writes a dated snapshot of all 380+ scores to the ledger. Pulse diffs them: upgrades, downgrades and valuation flips — each explained by the metrics that moved. Your morning research note, computed."
      />

      {d === null ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <>
          <Card className="p-4 mb-5 text-sm text-ink2">
            {d.message ? (
              <span>📓 {d.message}</span>
            ) : (
              <span>
                Comparing <b className="text-ink">{d.latest}</b> against <b className="text-ink">{d.previous}</b>
                {d.week_ref && <> (week reference: {d.week_ref})</>} —{' '}
                {d.movers.length} score moves ≥ 2 pts, {d.events.length} events.
              </span>
            )}
          </Card>

          {d.events.length > 0 && (
            <>
              <h2 className="font-semibold mb-2">Valuation flips & universe changes</h2>
              <div className="flex flex-col gap-2 mb-6">
                {d.events.map((e, i) => (
                  <Link key={i} to={`/stock/${e.ticker}`}>
                    <Card className="p-3 hover:border-s1/50 transition-colors">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium">{e.name}</span>
                        <span className="text-xs text-muted">{e.market === 'india' ? '🇮🇳' : '🌍'}</span>
                        <span className="text-ink2">{e.text}</span>
                      </div>
                      {e.attribution.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {e.attribution.map((a) => (
                            <span key={a} className="text-[11px] px-2 py-0.5 rounded-md bg-raised text-ink2 tabular-nums">{a}</span>
                          ))}
                        </div>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}

          {d.movers.length > 0 && (
            <>
              <h2 className="font-semibold mb-2">Biggest score moves</h2>
              <div className="flex flex-col gap-2">
                {d.movers.map((m) => (
                  <Link key={m.ticker} to={`/stock/${m.ticker}`}>
                    <Card className="p-3 hover:border-s1/50 transition-colors">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="w-14 text-right font-bold tabular-nums"
                          style={{ color: m.delta >= 0 ? 'var(--color-good)' : 'var(--color-crit)' }}>
                          {m.delta >= 0 ? '+' : ''}{m.delta}
                        </span>
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-muted">{m.sector} · {m.market === 'india' ? '🇮🇳' : '🌍'}</span>
                        <span className="text-xs tabular-nums ml-auto">
                          <span style={{ color: scoreColor(m.old) }}>{m.old}</span>
                          <span className="text-muted"> → </span>
                          <span style={{ color: scoreColor(m.new) }}>{m.new}</span>
                        </span>
                      </div>
                      {m.attribution.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1.5 ml-16">
                          {m.attribution.map((a) => (
                            <span key={a} className="text-[11px] px-2 py-0.5 rounded-md bg-raised text-ink2 tabular-nums">{a}</span>
                          ))}
                        </div>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}

          {!d.message && d.events.length === 0 && d.movers.length === 0 && (
            <div className="text-center text-muted py-16">
              No meaningful changes between the last two snapshots — a quiet day.
            </div>
          )}
        </>
      )}
    </div>
  )
}
