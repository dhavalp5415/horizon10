import type { ReactNode } from 'react'
import type { Verdict } from '../api'
import { scoreColor, toneColor } from '../format'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-surface border border-white/10 ${className}`}>
      {children}
    </div>
  )
}

export function ScoreRing({ value, size = 56 }: { value: number | null; size?: number }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-grid)" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={scoreColor(value)} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-semibold"
        style={{ fontSize: size / 3.4 }}>
        {value === null ? '—' : Math.round(value)}
      </div>
    </div>
  )
}

export function ScoreBar({ value, label }: { value: number | null; label?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="h-1.5 flex-1 rounded-full bg-grid overflow-hidden">
        <div className="h-full rounded-full"
          style={{ width: `${value ?? 0}%`, background: scoreColor(value) }} />
      </div>
      <span className="text-xs tabular-nums w-7 text-right" style={{ color: scoreColor(value) }}>
        {value === null ? '—' : Math.round(value)}
      </span>
      {label && <span className="text-xs text-muted">{label}</span>}
    </div>
  )
}

export function VerdictBadge({ verdict, small = false }: { verdict: Verdict; small?: boolean }) {
  const color = toneColor[verdict.tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap ${small ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'}`}
      style={{ color, borderColor: color + '55', background: color + '14' }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} />
      {verdict.label}
    </span>
  )
}

export function Chip({ children, active = false, onClick }: {
  children: ReactNode; active?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${
        active
          ? 'bg-s1/15 text-s1 border-s1/40'
          : 'bg-raised text-ink2 border-white/10 hover:text-ink hover:border-white/25'
      }`}
    >
      {children}
    </button>
  )
}

export function StatTile({ label, value, sub, hint }: {
  label: string; value: ReactNode; sub?: ReactNode; hint?: string
}) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted uppercase tracking-wide" title={hint}>{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-ink2 mt-0.5">{sub}</div>}
    </Card>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-raised ${className}`} />
}

export function PageHeader({ title, subtitle, right }: {
  title: string; subtitle?: string; right?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-raised)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    fontSize: 12,
    color: 'var(--color-ink)',
  },
  labelStyle: { color: 'var(--color-ink2)' },
  itemStyle: { color: 'var(--color-ink)' },
}
