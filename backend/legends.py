"""Legendary-investor valuation lenses.

Graham left formulas; Buffett left a market gauge + company principles;
Lynch left the PEG=1 rule; Jhunjhunwala and BlackRock left styles. Each lens
below implements the public record faithfully and returns None/"na" rather
than inventing numbers where a model doesn't apply.
"""
import bisect
import math
import statistics

from scoring import FINANCIAL_SECTORS

# ---------------------------------------------------------------- market gauge
# Published Buffett Indicator readings (total listed market cap / GDP).
# Sources: dshort/Advisor Perspectives, currentmarketvaluation.com,
# GuruFocus country pages. Update these when they drift.
BUFFETT_GAUGE = [
    {
        "market": "india",
        "label": "India — Buffett Indicator",
        "value": 121.4,
        "as_of": "June 2026",
        "mcap": "≈ $5.2T total listed market cap",
        "gdp": "≈ $4.3T GDP",
        "hi_10y": 158.1,
        "lo_10y": 59.3,
        "zone": "Modestly overvalued",
        "zone_tone": "warn",
        "bands": [
            {"upto": 70, "label": "Deeply undervalued", "tone": "great"},
            {"upto": 90, "label": "Undervalued", "tone": "good"},
            {"upto": 110, "label": "Fair", "tone": "neutral"},
            {"upto": 135, "label": "Modestly overvalued", "tone": "warn"},
            {"upto": 999, "label": "Expensive", "tone": "bad"},
        ],
        "note": "10-year range 59–158%. High-growth economies sustain higher readings than Buffett's original 75–90% US comfort zone.",
    },
    {
        "market": "us",
        "label": "United States — Buffett Indicator",
        "value": 237.2,
        "as_of": "July 6, 2026",
        "mcap": "≈ $75.8T total listed market cap",
        "gdp": "≈ $31.9T GDP",
        "hi_10y": 237.4,
        "lo_10y": 120.0,
        "zone": "Strongly overvalued (near all-time high)",
        "zone_tone": "bad",
        "bands": [
            {"upto": 75, "label": "Undervalued", "tone": "great"},
            {"upto": 90, "label": "Fair (Buffett's comfort zone)", "tone": "good"},
            {"upto": 120, "label": "Modestly overvalued", "tone": "neutral"},
            {"upto": 150, "label": "Overvalued", "tone": "warn"},
            {"upto": 999, "label": "Strongly overvalued", "tone": "bad"},
        ],
        "note": "Buffett called 75–90% reasonable and >120% 'playing with fire'. The May-2026 record was 237.4% — stock selection matters more than ever at these levels.",
    },
]


def _pos(v):
    return v is not None and v > 0


def sustainable_growth(d, rev_cagr=None):
    """Growth rate for valuation formulas, as a fraction.

    Earnings can spike far above revenue growth for a year (margin cycles,
    base effects) but can't outgrow revenue forever — so earnings growth is
    capped at the best revenue measure + 8pp. Returns (growth, capped_flag).
    """
    eg = d.get("earnings_growth")
    rev = [x for x in (rev_cagr, d.get("rev_growth_ttm")) if x is not None]
    if eg is None:
        return (max(rev) if rev else None), False
    if rev:
        cap = max(rev) + 0.08
        if eg > cap:
            return max(cap, 0.0), True
    return eg, False


# ---------------------------------------------------------------- Graham
def graham_lens(d, rev_cagr=None):
    """Graham Number √(22.5·EPS·BVPS) + growth formula EPS·(8.5+2g)."""
    eps, bv, price = d.get("eps"), d.get("book_value"), d.get("price")
    out = {
        "name": "Benjamin Graham",
        "applicable": False,
        "graham_number": None,
        "formula_value": None,
        "number_upside": None,
        "formula_upside": None,
        "note": None,
    }
    if not _pos(eps):
        out["note"] = "Not applicable: Graham refused to value companies without positive earnings."
        return out
    if _pos(bv):
        out["graham_number"] = round(math.sqrt(22.5 * eps * bv), 2)
    g, capped = sustainable_growth(d, rev_cagr)
    g_pct = max(0.0, min(20.0, (g or 0) * 100))
    out["formula_value"] = round(eps * (8.5 + 2 * g_pct), 2)
    out["applicable"] = True
    if _pos(price):
        if out["graham_number"]:
            out["number_upside"] = round(out["graham_number"] / price - 1, 3)
        out["formula_upside"] = round(out["formula_value"] / price - 1, 3)
    out["note"] = f"Growth used in formula: {g_pct:.1f}% (max 20%)." + (
        " Earnings growth was reined in to revenue growth + 8pp — the recent spike looks cyclical." if capped else ""
    )
    return out


# ---------------------------------------------------------------- Lynch
def lynch_lens(d, rev_cagr=None):
    """Peter Lynch GARP: fair PE = earnings growth rate (clamped 10–25)."""
    eps, price = d.get("eps"), d.get("price")
    g, capped = sustainable_growth(d, rev_cagr)
    out = {"name": "Peter Lynch", "applicable": False, "fair_value": None, "upside": None, "note": None}
    if not _pos(eps):
        out["note"] = "Not applicable: needs positive earnings."
        return out
    if g is None or g <= 0:
        out["note"] = "Not applicable: no positive sustainable-growth estimate — Lynch's GARP needs growers."
        return out
    g_pct = max(10.0, min(25.0, g * 100))
    out["fair_value"] = round(eps * g_pct, 2)
    out["applicable"] = True
    if _pos(price):
        out["upside"] = round(out["fair_value"] / price - 1, 3)
    out["note"] = f"Fair PE set to sustainable growth: {g_pct:.0f}× (Lynch clamp 10–25)." + (
        " Earnings spike capped to revenue growth + 8pp." if capped else ""
    )
    return out


# ---------------------------------------------------------------- Buffett (company)
def buffett_lens(d, consistency_score, valuation_score):
    """Buffett's company principles as a pass/fail checklist."""
    is_fin = d.get("_sector") in FINANCIAL_SECTORS

    def chk(label, value_str, ok):
        return {"label": label, "value": value_str, "ok": ok}

    roe, nm, de, fcf = d.get("roe"), d.get("net_margin"), d.get("debt_to_equity"), d.get("fcf")
    rows = [
        chk("Return on equity ≥ 15%", f"{roe*100:.1f}%" if roe is not None else "—",
            None if roe is None else roe >= 0.15),
        chk("Net margin ≥ 10% (moat proxy)", f"{nm*100:.1f}%" if nm is not None else "—",
            None if nm is None else nm >= 0.10),
        chk("Consistent revenue growth", f"{consistency_score:.0f}/100" if consistency_score is not None else "—",
            None if consistency_score is None else consistency_score >= 55),
    ]
    if not is_fin:
        rows.append(chk("Conservative debt (D/E < 100%)", f"{de:.0f}%" if de is not None else "—",
                        None if de is None else de < 100))
        rows.append(chk("Generates free cash flow", "yes" if _pos(fcf) else ("—" if fcf is None else "no"),
                        None if fcf is None else fcf > 0))
    passed = sum(1 for r in rows if r["ok"] is True)
    known = sum(1 for r in rows if r["ok"] is not None)
    quality_ok = known >= 3 and passed / known >= 0.75
    price_ok = valuation_score is not None and valuation_score >= 55
    if quality_ok and price_ok:
        verdict = {"label": "Wonderful company at a fair price", "tone": "great"}
    elif quality_ok:
        verdict = {"label": "Wonderful company, rich price", "tone": "warn"}
    elif price_ok:
        verdict = {"label": "Fair price, ordinary business", "tone": "neutral"}
    else:
        verdict = {"label": "Fails Buffett's filters", "tone": "bad"}
    return {"name": "Warren Buffett", "checks": rows, "passed": passed, "known": known, "verdict": verdict}


# ---------------------------------------------------------------- Jhunjhunwala
def rj_lens(d, rev_cagr):
    """Rakesh Jhunjhunwala's stated style as a checklist (India-first)."""
    def chk(label, value_str, ok):
        return {"label": label, "value": value_str, "ok": ok}

    is_fin = d.get("_sector") in FINANCIAL_SECTORS
    peg, roe, de, ins = d.get("_peg_effective"), d.get("roe"), d.get("debt_to_equity"), d.get("insider_holding")
    rows = [
        chk("Growth at reasonable price (PEG < 2)", f"{peg:.2f}" if peg is not None else "—",
            None if peg is None else peg < 2),
        chk("Return on equity > 15%", f"{roe*100:.1f}%" if roe is not None else "—",
            None if roe is None else roe > 0.15),
        chk("Long growth runway (rev CAGR > 10%)", f"{rev_cagr*100:.1f}%" if rev_cagr is not None else "—",
            None if rev_cagr is None else rev_cagr > 0.10),
        chk("Skin in the game (promoter/insider > 40%)", f"{ins*100:.0f}%" if ins is not None else "—",
            None if ins is None else ins > 0.40),
    ]
    if not is_fin:
        rows.append(chk("Low leverage (D/E < 80%)", f"{de:.0f}%" if de is not None else "—",
                        None if de is None else de < 80))
    passed = sum(1 for r in rows if r["ok"] is True)
    known = sum(1 for r in rows if r["ok"] is not None)
    if known == 0:
        verdict = {"label": "Insufficient data", "tone": "neutral"}
    elif passed / known >= 0.8:
        verdict = {"label": "Classic RJ pick", "tone": "great"}
    elif passed / known >= 0.6:
        verdict = {"label": "Mostly fits RJ style", "tone": "good"}
    elif passed / known >= 0.4:
        verdict = {"label": "Partial fit", "tone": "warn"}
    else:
        verdict = {"label": "Not an RJ-style stock", "tone": "bad"}
    return {"name": "Rakesh Jhunjhunwala", "checks": rows, "passed": passed, "known": known, "verdict": verdict}


# ---------------------------------------------------------------- BlackRock factors
def _percentile_map(pairs):
    """pairs: [(ticker, value)] -> {ticker: midrank percentile 0-100}.

    Uses bisect (O(n log n)); a linear scan per element would be O(n^2) and
    far too slow across a full-market universe.
    """
    vals = sorted(v for _, v in pairs)
    n = len(vals)
    if n < 3:
        return {}
    out = {}
    for t, v in pairs:
        lo = bisect.bisect_left(vals, v)
        hi = bisect.bisect_right(vals, v)
        out[t] = round((lo + (hi - lo) / 2) / n * 100, 1)
    return out


def factor_scores(rows):
    """BlackRock-style Value/Quality/Momentum percentiles within one market.

    rows: fundamentals dicts (need ticker, pe, ps, roe, net_margin,
    debt_to_equity, price, high_52w, low_52w, _sector).
    Returns {ticker: {value, quality, momentum}} with 0-100 percentiles.
    """
    def collect(fn):
        pairs = []
        for d in rows:
            v = fn(d)
            if v is not None and not math.isinf(v) and not math.isnan(v):
                pairs.append((d["ticker"], v))
        return _percentile_map(pairs)

    earn_yield = collect(lambda d: 1 / d["pe"] if _pos(d.get("pe")) else None)
    sales_yield = collect(lambda d: 1 / d["ps"] if _pos(d.get("ps")) else None)
    roe_p = collect(lambda d: d.get("roe"))
    margin_p = collect(lambda d: d.get("net_margin"))
    inv_de = collect(lambda d: -d["debt_to_equity"]
                     if d.get("debt_to_equity") is not None and d.get("_sector") not in FINANCIAL_SECTORS
                     else None)

    def mom(d):
        p, hi, lo = d.get("price"), d.get("high_52w"), d.get("low_52w")
        if _pos(p) and _pos(hi) and _pos(lo) and hi > lo:
            return (p - lo) / (hi - lo)
        return None
    mom_p = collect(mom)

    out = {}
    for d in rows:
        t = d["ticker"]
        def avg(*maps):
            vals = [m[t] for m in maps if t in m]
            return round(sum(vals) / len(vals), 1) if vals else None
        out[t] = {
            "value": avg(earn_yield, sales_yield),
            "quality": avg(roe_p, margin_p, inv_de),
            "momentum": avg(mom_p),
        }
    return out


# ---------------------------------------------------------------- composite fair value
def fair_value(d, graham, lynch):
    """Median of available model estimates -> upside -> classification."""
    price = d.get("price")
    models = []
    if graham.get("graham_number"):
        models.append(("Graham Number", graham["graham_number"]))
    if graham.get("formula_value"):
        models.append(("Graham formula", graham["formula_value"]))
    if lynch.get("fair_value"):
        models.append(("Lynch PEG=1", lynch["fair_value"]))
    if not models or not _pos(price):
        return {"fair_value": None, "upside": None, "models_used": len(models),
                "range": None, "classification": {"label": "No model applies", "tone": "neutral"},
                "models": models}
    vals = [v for _, v in models]
    fv = round(statistics.median(vals), 2)
    upside = round(fv / price - 1, 3)
    if upside > 0.20:
        cls = {"label": "Undervalued", "tone": "great"}
    elif upside >= -0.20:
        cls = {"label": "Fairly Valued", "tone": "good"}
    elif upside >= -0.45:
        cls = {"label": "Expensive", "tone": "warn"}
    else:
        cls = {"label": "Very Expensive", "tone": "bad"}
    return {
        "fair_value": fv, "upside": upside, "models_used": len(models),
        "range": {"low": round(min(vals), 2), "high": round(max(vals), 2)},
        "classification": cls,
        "models": [{"name": n, "value": v} for n, v in models],
    }
