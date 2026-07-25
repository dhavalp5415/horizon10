export interface Scores {
  valuation: number | null
  growth: number | null
  consistency: number | null
  quality: number | null
  composite: number | null
}

export interface Verdict {
  label: string
  tone: 'great' | 'good' | 'warn' | 'bad' | 'neutral'
}

export interface ScreenerRow {
  ticker: string
  name: string
  sector: string
  market: 'india' | 'global'
  currency: string | null
  price: number | null
  market_cap: number | null
  pe: number | null
  forward_pe: number | null
  peg: number | null
  ps: number | null
  rev_growth_ttm: number | null
  rev_cagr: number | null
  earnings_growth: number | null
  roe: number | null
  net_margin: number | null
  debt_to_equity: number | null
  dividend_yield: number | null
  scores: Scores
  verdict: Verdict
  completeness: number
  fair_value: number | null
  upside: number | null
  valuation_class: Verdict
  models_used: number
  mb_score: number | null
  bucket: 'small' | 'mid' | 'large' | null
  expectations: Expectations
  stale: boolean
}

export interface Expectations {
  implied_growth: number | null
  delivered_growth: number | null
  gap: number | null
  peg1_reading: number | null
  verdict: Verdict
  note: string | null
}

export interface PulseData {
  latest: string | null
  previous: string | null
  week_ref?: string | null
  message: string | null
  events: { type: string; ticker: string; name: string; market: string; text: string; attribution: string[] }[]
  movers: { ticker: string; name: string; market: string; sector: string; old: number; new: number; delta: number; attribution: string[] }[]
}

export interface XrayHolding {
  ticker: string
  qty: number
  buy_price: number
  name: string
  sector: string | null
  currency: string | null
  price: number | null
  value: number | null
  inr_value: number | null
  pnl_pct: number | null
  composite: number | null
  mb_score: number | null
  upside: number | null
  valuation_class: Verdict | null
  expectations: Expectations | null
  flags: string[]
}

export interface TickerRow {
  ticker: string
  name: string
  sector: string
  market: 'india' | 'global'
}

export interface RoundTableVote { who: string; vote: -1 | 0 | 1; reason: string }

export interface RoundTableSummary {
  consensus: number | null
  disagreement: number | null
  battleground: boolean
  verdict: Verdict
  counts: { buy: number; hold: number; avoid: number }
}

export interface RoundTableRow extends RoundTableSummary {
  ticker: string
  name: string
  sector: string
  market: string
  currency: string | null
  price: number | null
  votes: RoundTableVote[]
  composite: number | null
}

export interface TwinRow {
  ticker: string
  name: string
  sector: string
  market: string
  currency: string | null
  price: number | null
  similarity: number
  pe: number | null
  valuation_score: number | null
  composite: number | null
  cheaper: boolean
}

export interface ReturnDna {
  years: number
  price_cagr: number
  business_cagr: number | null
  rerating_cagr: number | null
  dividend_yield: number | null
  verdict: Verdict
  note: string
}

export interface XrayData {
  holdings: XrayHolding[]
  total_inr: number
  usdinr: number
  weighted: { composite: number | null; mb: number | null; gap: number | null }
  sectors: { sector: string; share: number }[]
  watchlist: ScreenerRow[]
}

export interface CheckRow { label: string; value: string; ok: boolean | null }

export interface LegendsBreakdown {
  graham: {
    name: string; applicable: boolean; graham_number: number | null
    formula_value: number | null; number_upside: number | null
    formula_upside: number | null; note: string | null
  }
  lynch: { name: string; applicable: boolean; fair_value: number | null; upside: number | null; note: string | null }
  buffett: { name: string; checks: CheckRow[]; passed: number; known: number; verdict: Verdict }
  rj: { name: string; checks: CheckRow[]; passed: number; known: number; verdict: Verdict }
  factors: { value: number | null; quality: number | null; momentum: number | null }
  fair_value: {
    fair_value: number | null; upside: number | null; models_used: number
    range: { low: number; high: number } | null; classification: Verdict
    models: { name: string; value: number }[]
  }
}

export interface SectorSummary {
  sector: string
  count: number
  scored_count?: number
  avg_score: number
  avg_growth: number | null
  avg_valuation: number | null
  avg_quality: number | null
  avg_consistency: number | null
  top_stocks: { ticker: string; name: string; score: number; verdict: Verdict }[]
}

export interface PricePoint { date: string; close: number }

export interface StockDetailData {
  ticker: string
  name: string
  sector: string
  market: string
  currency: string | null
  price: number | null
  market_cap: number | null
  high_52w: number | null
  low_52w: number | null
  metrics: Record<string, number | null>
  scores: Scores
  verdict: Verdict
  completeness: number
  financials: { year: string; revenue: number | null; net_income: number | null; rev_growth: number | null }[]
  history: { '1y': PricePoint[]; '5y': PricePoint[]; max: PricePoint[] }
  legends: LegendsBreakdown
  multibagger: {
    score: number | null
    bucket: 'small' | 'mid' | 'large' | null
    pillars: Record<string, number | null>
    signals: string[]
    verdict: Verdict
    pos_52w: number | null
  }
  expectations: Expectations
  roundtable: RoundTableSummary & { votes: RoundTableVote[] }
  return_dna: ReturnDna | null
  watched: boolean
}

export interface CompareStock {
  ticker: string
  name: string
  sector: string
  market: string
  summary: Partial<ScreenerRow>
  normalized: { date: string; value: number }[]
}

export interface Commodity {
  ticker: string
  name: string
  group: string
  history: PricePoint[]
  change_10y_pct: number | null
  signal: { last: number; dma200: number; above_dma200: boolean; pct_vs_dma200: number } | null
}

export interface StatusData {
  refresh: { running: boolean; done: number; total: number; errors: string[]; blocked?: boolean }
  coverage: { cached: number; total: number }
  stale: number
  universe?: { total: number; india: number; global: number; curated: number; auto_added: number }
}

export async function api<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json()
}

export const postRefresh = () => fetch('/api/refresh', { method: 'POST' })

export const addHolding = (ticker: string, qty: number, buy_price: number) =>
  fetch('/api/portfolio/holding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, qty, buy_price }),
  })

export const removeHolding = (ticker: string) =>
  fetch(`/api/portfolio/holding/${ticker}`, { method: 'DELETE' })

export const setWatch = (ticker: string, on: boolean) =>
  fetch(`/api/portfolio/watch/${ticker}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ on }),
  })
