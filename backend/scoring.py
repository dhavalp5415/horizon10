"""10-Year Potential Score: valuation 30% + growth 30% + consistency 20% + quality 20%.

Every component maps a raw metric onto 0-100 via a clamped linear ramp.
Missing metrics are excluded (pillar = mean of available components) and
tracked in `completeness` so thin data is visible, never silently scored.
"""
import statistics

FINANCIAL_SECTORS = {
    "Banks", "NBFC & Fin Services", "Insurance", "Capital Markets",
    "Banks & Asset Mgmt", "Payments & Fintech",
}

WEIGHTS = {"valuation": 0.30, "growth": 0.30, "consistency": 0.20, "quality": 0.20}


def ramp(x, worst, best):
    """Linear 0-100 between worst and best (works for inverted ranges)."""
    if x is None:
        return None
    if worst == best:
        return None
    t = (x - worst) / (best - worst)
    return round(max(0.0, min(1.0, t)) * 100, 1)


def yoy_growths(series_by_year: dict):
    """YoY growth fractions from {year: value}, skipping non-positive bases."""
    years = sorted(series_by_year)
    vals = [series_by_year[y] for y in years]
    out = []
    for prev, cur in zip(vals, vals[1:]):
        if prev and prev > 0:
            out.append((cur - prev) / prev)
    return out


def revenue_cagr(series_by_year: dict):
    years = sorted(series_by_year)
    if len(years) < 2:
        return None
    first, last = series_by_year[years[0]], series_by_year[years[-1]]
    n = int(years[-1]) - int(years[0])
    if not first or first <= 0 or not last or last <= 0 or n <= 0:
        return None
    return (last / first) ** (1 / n) - 1


def compute_peg(d):
    """Prefer Yahoo's PEG; else PE / (earnings growth % )."""
    peg = d.get("peg")
    if peg is not None and 0 < peg < 50:
        return peg
    pe, g = d.get("pe"), d.get("earnings_growth")
    if pe and pe > 0 and g and g > 0.02:
        return pe / (g * 100)
    return None


def _mean(vals):
    vals = [v for v in vals if v is not None]
    return round(sum(vals) / len(vals), 1) if vals else None


def score_stock(d, sector_median_pe=None, sector_median_ps=None):
    """d = fundamentals dict from fetcher. Returns dict of scores + derived metrics."""
    is_financial = d.get("_sector") in FINANCIAL_SECTORS

    # ---- derived metrics ----
    peg = compute_peg(d)
    rev_years = d.get("revenue_by_year") or {}
    growths = yoy_growths(rev_years)
    cagr = revenue_cagr(rev_years)
    pos_frac = (sum(1 for g in growths if g > 0) / len(growths)) if growths else None
    growth_vol = statistics.pstdev(growths) if len(growths) >= 2 else None
    fcf_margin = None
    if not is_financial and d.get("fcf") and d.get("total_revenue"):
        fcf_margin = d["fcf"] / d["total_revenue"]

    # ---- valuation (relative PE/PS vs sector median, PEG absolute) ----
    pe = d.get("pe")
    pe_rel = None
    if pe and pe > 0 and sector_median_pe and sector_median_pe > 0:
        pe_rel = pe / sector_median_pe
    ps_rel = None
    if d.get("ps") and sector_median_ps and sector_median_ps > 0:
        ps_rel = d["ps"] / sector_median_ps
    valuation = _mean([
        ramp(pe_rel, worst=2.0, best=0.5),
        ramp(peg, worst=3.0, best=0.5),
        ramp(ps_rel, worst=2.5, best=0.5),
    ])

    # ---- growth ----
    growth = _mean([
        ramp(d.get("rev_growth_ttm"), worst=0.0, best=0.25),
        ramp(cagr, worst=0.0, best=0.20),
        ramp(d.get("earnings_growth"), worst=0.0, best=0.30),
    ])

    # ---- consistency ----
    consistency = _mean([
        ramp(pos_frac, worst=0.3, best=1.0),
        ramp(growth_vol, worst=0.40, best=0.05),  # lower volatility = better
    ])

    # ---- quality ----
    quality_parts = [
        ramp(d.get("roe"), worst=0.05, best=0.25),
        ramp(d.get("net_margin"), worst=0.03, best=0.25),
    ]
    if not is_financial:
        quality_parts.append(ramp(d.get("op_margin"), worst=0.05, best=0.30))
        quality_parts.append(ramp(d.get("debt_to_equity"), worst=200.0, best=20.0))
        quality_parts.append(ramp(fcf_margin, worst=0.0, best=0.20))
    quality = _mean(quality_parts)

    pillars = {
        "valuation": valuation, "growth": growth,
        "consistency": consistency, "quality": quality,
    }
    avail = {k: v for k, v in pillars.items() if v is not None}
    composite = None
    if avail:
        wsum = sum(WEIGHTS[k] for k in avail)
        composite = round(sum(WEIGHTS[k] * v for k, v in avail.items()) / wsum, 1)

    n_metrics = 3 + 3 + 2 + len(quality_parts)
    n_have = sum(x is not None for x in [
        pe_rel, peg, ps_rel,
        d.get("rev_growth_ttm"), cagr, d.get("earnings_growth"),
        pos_frac, growth_vol, *quality_parts,
    ])

    return {
        "scores": {**pillars, "composite": composite},
        "verdict": verdict(pillars, composite),
        "completeness": round(n_have / n_metrics, 2),
        "derived": {
            "peg_effective": round(peg, 2) if peg is not None else None,
            "rev_cagr": round(cagr, 4) if cagr is not None else None,
            "positive_growth_years": round(pos_frac, 2) if pos_frac is not None else None,
            "growth_volatility": round(growth_vol, 4) if growth_vol is not None else None,
            "fcf_margin": round(fcf_margin, 4) if fcf_margin is not None else None,
            "pe_vs_sector": round(pe_rel, 2) if pe_rel is not None else None,
        },
    }


def verdict(p, composite):
    v, g, c = p.get("valuation"), p.get("growth"), p.get("consistency")
    if composite is None:
        return {"label": "Insufficient Data", "tone": "neutral"}
    if c is not None and c < 35:
        return {"label": "Inconsistent Growth", "tone": "bad"}
    if v is not None and g is not None:
        if v >= 60 and g >= 55 and (c is None or c >= 55):
            return {"label": "Undervalued Compounder", "tone": "great"}
        if v >= 45 and g >= 65:
            return {"label": "Fair Price, High Growth", "tone": "good"}
        if g >= 65 and v < 35:
            return {"label": "Great Growth, Expensive", "tone": "warn"}
        if v >= 65 and g < 40:
            return {"label": "Cheap but Slow", "tone": "warn"}
    if composite >= 70:
        return {"label": "Strong All-Rounder", "tone": "great"}
    if composite >= 55:
        return {"label": "Solid Watchlist Pick", "tone": "good"}
    if composite >= 40:
        return {"label": "Average — Needs Catalyst", "tone": "neutral"}
    return {"label": "Weak Setup", "tone": "bad"}


def sector_medians(rows):
    """rows: list of fundamentals dicts with `_sector`. Returns {sector: {pe, ps}}."""
    by_sector = {}
    for d in rows:
        by_sector.setdefault(d.get("_sector"), []).append(d)
    out = {}
    for sec, ds in by_sector.items():
        pes = sorted(d["pe"] for d in ds if d.get("pe") and 0 < d["pe"] < 200)
        pss = sorted(d["ps"] for d in ds if d.get("ps") and 0 < d["ps"] < 100)
        out[sec] = {
            "pe": statistics.median(pes) if pes else None,
            "ps": statistics.median(pss) if pss else None,
        }
    return out
