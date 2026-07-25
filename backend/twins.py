"""Twin Finder — cross-sector, cross-market fundamental nearest neighbours.

Every stock becomes a vector of universe-wide percentiles over quality,
growth, leverage and size. The closest vectors are its "twins" — companies
with the same fundamental character regardless of sector or country — and
twins that are meaningfully cheaper are the actionable ones.
"""
import bisect
import math


def _percentiles(pairs):
    """[(ticker, value)] -> {ticker: 0-100 midrank percentile}.

    bisect-based: O(n log n) instead of O(n^2), which matters a lot once the
    universe is thousands of stocks.
    """
    vals = sorted(v for _, v in pairs)
    n = len(vals)
    if n < 3:
        return {}
    out = {}
    for t, v in pairs:
        lo = bisect.bisect_left(vals, v)
        hi = bisect.bisect_right(vals, v)
        out[t] = (lo + (hi - lo) / 2) / n * 100
    return out


# feature extractors over screener rows (already contain derived metrics)
FEATURES = [
    ("roe", lambda r: r.get("roe")),
    ("net_margin", lambda r: r.get("net_margin")),
    ("rev_growth_ttm", lambda r: r.get("rev_growth_ttm")),
    ("rev_cagr", lambda r: r.get("rev_cagr")),
    ("earnings_growth", lambda r: r.get("earnings_growth")),
    ("leverage", lambda r: -r["debt_to_equity"] if r.get("debt_to_equity") is not None else None),
    ("size", lambda r: math.log10(r["market_cap"]) if r.get("market_cap") else None),
    ("consistency", lambda r: r["scores"].get("consistency")),
]

MIN_COMMON = 5


def build_maps(rows):
    """Feature percentile maps for the whole universe (cache me — this is the
    expensive part and it is identical for every stock)."""
    return {name: _percentiles([(r["ticker"], fn(r)) for r in rows if fn(r) is not None])
            for name, fn in FEATURES}


def find_twins(rows, ticker, top_n=5, maps=None):
    """rows: screener rows across the FULL universe. Returns top twins."""
    maps = maps if maps is not None else build_maps(rows)
    base = {name: m.get(ticker) for name, m in maps.items()}
    base = {k: v for k, v in base.items() if v is not None}
    if len(base) < MIN_COMMON:
        return {"twins": [], "note": "Too little data on this stock to compute fundamental twins."}

    by_ticker = {r["ticker"]: r for r in rows}
    me = by_ticker.get(ticker, {})
    my_val_score = (me.get("scores") or {}).get("valuation")
    my_pe = me.get("pe")

    scored = []
    for r in rows:
        t = r["ticker"]
        if t == ticker:
            continue
        common = [(name, maps[name][t]) for name in base if t in maps[name]]
        if len(common) < MIN_COMMON:
            continue
        dist = sum(abs(base[name] - val) for name, val in common) / len(common)
        similarity = max(0.0, 100.0 - dist)
        their_val = (r.get("scores") or {}).get("valuation")
        cheaper = False
        if my_val_score is not None and their_val is not None and their_val >= my_val_score + 10:
            cheaper = True
        elif my_pe and r.get("pe") and 0 < r["pe"] < my_pe * 0.75:
            cheaper = True
        scored.append({
            "ticker": t, "name": r["name"], "sector": r["sector"], "market": r["market"],
            "currency": r.get("currency"), "price": r.get("price"),
            "similarity": round(similarity, 1),
            "pe": r.get("pe"),
            "valuation_score": their_val,
            "composite": (r.get("scores") or {}).get("composite"),
            "cheaper": cheaper,
        })
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return {"twins": scored[:top_n], "note": None}
