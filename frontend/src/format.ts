const SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', JPY: '¥', GBP: '£', GBp: '£',
}

export const curSym = (c: string | null | undefined) => SYMBOLS[c ?? ''] ?? (c ? c + ' ' : '')

export function fmtNum(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

/** fraction (0.12) -> "12.0%" */
export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return '—'
  return (v * 100).toFixed(digits) + '%'
}

export function fmtPrice(v: number | null | undefined, currency?: string | null): string {
  if (v === null || v === undefined) return '—'
  return curSym(currency) + v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

/** Market cap: INR in Cr / L Cr, others in B / T */
export function fmtCap(v: number | null | undefined, currency?: string | null): string {
  if (v === null || v === undefined) return '—'
  if (currency === 'INR') {
    if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)} L Cr`
    return `₹${Math.round(v / 1e7).toLocaleString('en-IN')} Cr`
  }
  const sym = curSym(currency)
  if (v >= 1e12) return `${sym}${(v / 1e12).toFixed(2)} T`
  if (v >= 1e9) return `${sym}${(v / 1e9).toFixed(1)} B`
  return `${sym}${(v / 1e6).toFixed(0)} M`
}

/** Compact revenue/income values for chart axes */
export function fmtCompact(v: number, currency?: string | null): string {
  const sym = curSym(currency)
  if (currency === 'INR') {
    if (Math.abs(v) >= 1e12) return `${sym}${(v / 1e12).toFixed(1)}L Cr`
    return `${sym}${(v / 1e7).toFixed(0)} Cr`
  }
  if (Math.abs(v) >= 1e12) return `${sym}${(v / 1e12).toFixed(1)}T`
  if (Math.abs(v) >= 1e9) return `${sym}${(v / 1e9).toFixed(1)}B`
  if (Math.abs(v) >= 1e6) return `${sym}${(v / 1e6).toFixed(0)}M`
  return `${sym}${v.toFixed(0)}`
}

export function scoreColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'var(--color-muted)'
  if (v >= 70) return 'var(--color-good)'
  if (v >= 55) return 'var(--color-s1)'
  if (v >= 40) return 'var(--color-warn)'
  return 'var(--color-crit)'
}

export const toneColor: Record<string, string> = {
  great: 'var(--color-good)',
  good: 'var(--color-s1)',
  warn: 'var(--color-warn)',
  bad: 'var(--color-crit)',
  neutral: 'var(--color-muted)',
}
