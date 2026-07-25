"""Investment Research Dashboard API — India + Global + Commodities."""
import json
import math
import threading
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from universe import all_stocks, stock_meta, universe_stats, COMMODITIES
from fetcher import (
    fetch_fundamentals, fetch_history, refresh_all,
    cache_load, cache_coverage, REFRESH_STATE, FUNDAMENTALS_TTL,
)
from scoring import score_stock, sector_medians
from legends import (
    BUFFETT_GAUGE, graham_lens, lynch_lens, buffett_lens, rj_lens,
    factor_scores, fair_value,
)
from multibagger import multibagger_score, cap_bucket
from expectations import expectations_gap
import ledger
import portfolio as pf
import roundtable as rt
from twins import build_maps, find_twins
from scoring import revenue_cagr
from pydantic import BaseModel

app = FastAPI(title="Investment Research Dashboard")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

META = stock_meta()


# ---------------------------------------------------------------- memo cache
# With a full-market universe (~3.5k stocks) every endpoint would otherwise
# re-read thousands of JSON files and re-score them on each request. Results
# only change when the data cache is refreshed, so memoize per generation.
_MEMO: dict[str, tuple[int, float, object]] = {}
_MEMO_GEN = {"n": 0}
_MEMO_TTL = 900  # seconds
_memo_lock = threading.Lock()


def _memo(key: str, fn):
    gen = _MEMO_GEN["n"]
    hit = _MEMO.get(key)
    if hit and hit[0] == gen and (time.time() - hit[1]) < _MEMO_TTL:
        return hit[2]
    val = fn()
    with _memo_lock:
        _MEMO[key] = (gen, time.time(), val)
    return val


def _invalidate_memo():
    with _memo_lock:
        _MEMO_GEN["n"] += 1
        _MEMO.clear()


def _finite(o):
    """Replace non-finite floats with None so the payload is valid JSON."""
    if isinstance(o, float):
        return o if math.isfinite(o) else None
    if isinstance(o, dict):
        return {k: _finite(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_finite(v) for v in o]
    return o


def _json_memo(key: str, build):
    """Serialize big list payloads once and hand back cached bytes.

    Re-encoding thousands of scored rows per request costs more than computing
    them; FastAPI's encoder is the bottleneck at full-market scale.
    """
    def make():
        payload = build()
        try:
            body = json.dumps(payload, allow_nan=False)
        except ValueError:
            body = json.dumps(_finite(payload), allow_nan=False)
        return body.encode("utf-8")

    return Response(content=_memo(f"json::{key}", make),
                    media_type="application/json")


def _cached_rows(market: str | None = None):
    """Memoized: all cached fundamentals joined with universe metadata."""
    return _memo(f"rows::{market}", lambda: _cached_rows_uncached(market))


def _medians(market: str):
    """Memoized sector medians — identical for every stock in a market."""
    return _memo(f"medians::{market}", lambda: sector_medians(_cached_rows(market)))


def _factors(market: str):
    """Memoized factor percentiles — a full-universe pass, so never per-request."""
    return _memo(f"factors::{market}", lambda: factor_scores(_cached_rows(market)))


def _cached_rows_uncached(market: str | None = None):
    """All cached fundamentals joined with universe metadata.

    Falls back to expired cache (marked `_stale`) rather than dropping a
    stock when today's fetch failed or hasn't happened yet.
    """
    rows = []
    for ticker, name, sector, mkt in all_stocks():
        if market and mkt != market:
            continue
        stale = False
        d = cache_load(f"fund_{ticker}", FUNDAMENTALS_TTL)
        if d is None:
            d = cache_load(f"fund_{ticker}", 0)  # ttl=0 -> ignore expiry
            if d is None:
                continue
            stale = True
        d = dict(d)
        d.update(_name=name, _sector=sector, _market=mkt, _stale=stale)
        rows.append(d)
    return rows


def _screener_rows(market: str | None = None):
    """Memoized full scoring pass over the universe."""
    return _memo(f"screener::{market}", lambda: _screener_rows_uncached(market))


def _screener_rows_uncached(market: str | None = None):
    rows = _cached_rows(market)
    # medians computed per market so India and Global are judged separately
    meds = {}
    for mkt in {"india", "global"}:
        meds[mkt] = sector_medians([r for r in rows if r["_market"] == mkt])
    out = []
    for d in rows:
        med = meds[d["_market"]].get(d["_sector"], {})
        s = score_stock(d, med.get("pe"), med.get("ps"))
        cagr = s["derived"]["rev_cagr"]
        g, l = graham_lens(d, cagr), lynch_lens(d, cagr)
        fv = fair_value(d, g, l)
        mb = multibagger_score(d, s["derived"]["peg_effective"], cagr, s["scores"]["consistency"])
        exp = expectations_gap(d, cagr)
        out.append({
            "ticker": d["ticker"],
            "name": d["_name"],
            "sector": d["_sector"],
            "market": d["_market"],
            "currency": d.get("currency"),
            "price": d.get("price"),
            "market_cap": d.get("market_cap"),
            "pe": d.get("pe"),
            "forward_pe": d.get("forward_pe"),
            "peg": s["derived"]["peg_effective"],
            "ps": d.get("ps"),
            "rev_growth_ttm": d.get("rev_growth_ttm"),
            "rev_cagr": s["derived"]["rev_cagr"],
            "earnings_growth": d.get("earnings_growth"),
            "roe": d.get("roe"),
            "net_margin": d.get("net_margin"),
            "debt_to_equity": d.get("debt_to_equity"),
            "dividend_yield": d.get("dividend_yield"),
            "scores": s["scores"],
            "verdict": s["verdict"],
            "completeness": s["completeness"],
            "derived": s["derived"],
            "fair_value": fv["fair_value"],
            "upside": fv["upside"],
            "valuation_class": fv["classification"],
            "models_used": fv["models_used"],
            "mb_score": mb["score"],
            "bucket": mb["bucket"],
            "expectations": exp,
            "stale": d.get("_stale", False),
        })
    out.sort(key=lambda r: (r["scores"]["composite"] or -1), reverse=True)
    return out


def _snapshot_data():
    """Compact per-ticker scores for the daily ledger."""
    rows = _cached_rows()
    meds = {mkt: sector_medians([r for r in rows if r["_market"] == mkt])
            for mkt in ("india", "global")}
    out = {}
    for d in rows:
        med = meds[d["_market"]].get(d["_sector"], {})
        s = score_stock(d, med.get("pe"), med.get("ps"))
        cagr = s["derived"]["rev_cagr"]
        g, l = graham_lens(d, cagr), lynch_lens(d, cagr)
        fv = fair_value(d, g, l)
        mb = multibagger_score(d, s["derived"]["peg_effective"], cagr, s["scores"]["consistency"])
        out[d["ticker"]] = {
            "name": d["_name"], "market": d["_market"], "sector": d["_sector"],
            "composite": s["scores"]["composite"], "mb": mb["score"],
            "upside": fv["upside"], "cls": fv["classification"]["label"],
            "price": d.get("price"), "pe": d.get("pe"),
            "rev_growth_ttm": d.get("rev_growth_ttm"), "roe": d.get("roe"),
            "comp": s["completeness"],
        }
    return out


def _write_today_snapshot():
    data = _snapshot_data()
    if data:
        ledger.write_snapshot(data)


@app.on_event("startup")
def _seed_ledger():
    if ledger.load_snapshot(ledger.today()) is None and cache_coverage()["cached"] > 0:
        _write_today_snapshot()


@app.get("/api/status")
def status():
    stale = sum(1 for r in _cached_rows() if r.get("_stale"))
    return {
        "refresh": REFRESH_STATE,
        "coverage": cache_coverage(),
        "stale": stale,
        "universe": universe_stats(),
    }


@app.post("/api/refresh")
def refresh(force: bool = True):
    if REFRESH_STATE["running"]:
        return {"started": False, "message": "Refresh already running"}

    def run():
        refresh_all(force=force)
        _invalidate_memo()
        _write_today_snapshot()

    threading.Thread(target=run, daemon=True).start()
    return {"started": True}


@app.get("/api/pulse")
def pulse():
    return ledger.compute_pulse()


@app.get("/api/roundtable")
def roundtable(market: str = Query(pattern="^(india|global)$")):
    return _json_memo(f"roundtable::{market}", lambda: _roundtable_uncached(market))


def _roundtable_uncached(market: str):
    rows = _cached_rows(market)
    meds = _medians(market)
    factors = _factors(market)
    out = []
    for d in rows:
        med = meds.get(d["_sector"], {})
        s = score_stock(d, med.get("pe"), med.get("ps"))
        cagr = s["derived"]["rev_cagr"]
        leg = _full_legends(d, s["scores"], cagr, s["derived"]["peg_effective"], factors)
        mb = multibagger_score(d, s["derived"]["peg_effective"], cagr, s["scores"]["consistency"])
        exp = expectations_gap(d, cagr)
        votes = rt.build_votes(s["scores"], leg, mb, exp)
        summary = rt.summarize(votes)
        if summary["consensus"] is None:
            continue
        out.append({
            "ticker": d["ticker"], "name": d["_name"], "sector": d["_sector"],
            "market": d["_market"], "currency": d.get("currency"), "price": d.get("price"),
            "votes": votes, **summary,
            "composite": s["scores"]["composite"],
        })
    out.sort(key=lambda r: r["consensus"], reverse=True)
    battlegrounds = sorted(
        (r for r in out if r["battleground"]),
        key=lambda r: r["disagreement"], reverse=True,
    )[:12]
    return {"rows": out, "battlegrounds": battlegrounds}


@app.get("/api/twins/{ticker}")
def twins(ticker: str):
    if ticker not in META:
        raise HTTPException(404, f"{ticker} is not in the universe")
    rows = _screener_rows()
    maps = _memo("twin_maps", lambda: build_maps(rows))
    return find_twins(rows, ticker, maps=maps)


def _return_dna(history_5y, ni_by_year, dividend_yield):
    """Decompose ~4-5y price return into business growth vs rerating."""
    if not history_5y or len(history_5y) < 24:
        return None
    first, last = history_5y[0], history_5y[-1]
    try:
        y0 = int(first["date"][:4]) + int(first["date"][5:7]) / 12
        y1 = int(last["date"][:4]) + int(last["date"][5:7]) / 12
    except (ValueError, KeyError):
        return None
    years = y1 - y0
    if years < 2 or not first["close"] or first["close"] <= 0:
        return None
    price_cagr = (last["close"] / first["close"]) ** (1 / years) - 1
    ni_cagr = revenue_cagr(ni_by_year or {})
    if ni_cagr is None:
        return {"years": round(years, 1), "price_cagr": round(price_cagr, 4),
                "business_cagr": None, "rerating_cagr": None,
                "dividend_yield": dividend_yield,
                "verdict": {"label": "No profit history to decompose", "tone": "neutral"},
                "note": "Profit series unavailable — cannot separate earnings from rerating."}
    rerating = (1 + price_cagr) / (1 + ni_cagr) - 1
    if price_cagr >= 0.08 and rerating > 0.6 * price_cagr:
        verdict = {"label": "Rerating-driven — hype risk", "tone": "warn"}
        note = "Most of the return came from the market paying a higher multiple, not from profits. Multiples mean-revert."
    elif price_cagr >= 0.08 and ni_cagr >= 0.6 * price_cagr:
        verdict = {"label": "Earnings-driven — durable", "tone": "great"}
        note = "The return is backed by actual profit growth — the durable kind."
    elif price_cagr < 0 and ni_cagr > 0.05:
        verdict = {"label": "Derated despite growth — coiled spring?", "tone": "good"}
        note = "Profits grew while the price fell: the multiple compressed. If growth holds, that compression is a source of future return."
    elif price_cagr < 0 and ni_cagr >= 0:
        verdict = {"label": "Derated on slow growth", "tone": "neutral"}
        note = "Profits inched up but the market paid a lower multiple — the price needs either faster growth or a rerating to recover."
    elif price_cagr < 0:
        verdict = {"label": "Falling with its profits", "tone": "bad"}
        note = "Price and profits declined together."
    else:
        verdict = {"label": "Mixed drivers", "tone": "neutral"}
        note = "Return roughly split between profit growth and multiple change."
    return {
        "years": round(years, 1),
        "price_cagr": round(price_cagr, 4),
        "business_cagr": round(ni_cagr, 4),
        "rerating_cagr": round(rerating, 4),
        "dividend_yield": dividend_yield,
        "verdict": verdict,
        "note": note + " (Net profit used as the business-growth proxy; windows are approximate.)",
    }


@app.get("/api/screener")
def screener(market: str | None = Query(default=None, pattern="^(india|global)$")):
    return _json_memo(f"screener::{market}", lambda: {"rows": _screener_rows(market)})


@app.get("/api/tickers")
def tickers():
    """Tiny list for search boxes — the full screener payload is megabytes
    once the universe is a whole market."""
    return _json_memo("tickers", lambda: {"rows": [
        {"ticker": t, "name": n, "sector": s, "market": m}
        for t, n, s, m in all_stocks()
    ]})


@app.get("/api/industries")
def industries(market: str = Query(pattern="^(india|global)$")):
    return _memo(f"industries::{market}", lambda: _industries_uncached(market))


def _industries_uncached(market: str):
    rows = _screener_rows(market)
    by_sector: dict[str, list] = {}
    for r in rows:
        by_sector.setdefault(r["sector"], []).append(r)
    out = []
    for sector, rs in by_sector.items():
        # Full-market coverage sweeps in micro-caps with almost no published
        # fundamentals; averaging those would distort a sector's ranking, so
        # only reasonably-covered stocks vote on the sector score.
        scored = [r for r in rs
                  if r["scores"]["composite"] is not None and r["completeness"] >= 0.6]
        if len(scored) < 3:
            continue
        avg = lambda key_fn: (  # noqa: E731
            round(sum(key_fn(r) for r in scored if key_fn(r) is not None)
                  / max(1, sum(1 for r in scored if key_fn(r) is not None)), 2)
        )
        top = sorted(scored, key=lambda r: r["scores"]["composite"], reverse=True)[:3]
        out.append({
            "sector": sector,
            "count": len(rs),
            "scored_count": len(scored),
            "avg_score": round(sum(r["scores"]["composite"] for r in scored) / len(scored), 1),
            "avg_growth": avg(lambda r: r["scores"]["growth"]),
            "avg_valuation": avg(lambda r: r["scores"]["valuation"]),
            "avg_quality": avg(lambda r: r["scores"]["quality"]),
            "avg_consistency": avg(lambda r: r["scores"]["consistency"]),
            "top_stocks": [
                {"ticker": r["ticker"], "name": r["name"],
                 "score": r["scores"]["composite"], "verdict": r["verdict"]}
                for r in top
            ],
        })
    out.sort(key=lambda s: s["avg_score"], reverse=True)
    return {"sectors": out}


def _full_legends(d, scores, rev_cagr, peg_effective, factors_for_market):
    """Complete per-stock legends breakdown."""
    d = dict(d)
    d["_peg_effective"] = peg_effective
    g, l = graham_lens(d, rev_cagr), lynch_lens(d, rev_cagr)
    return {
        "graham": g,
        "lynch": l,
        "buffett": buffett_lens(d, scores.get("consistency"), scores.get("valuation")),
        "rj": rj_lens(d, rev_cagr),
        "factors": factors_for_market.get(d["ticker"], {}),
        "fair_value": fair_value(d, g, l),
    }


@app.get("/api/market-gauge")
def market_gauge():
    return {"gauges": BUFFETT_GAUGE}


@app.get("/api/multibaggers")
def multibaggers(market: str = Query(pattern="^(india|global)$")):
    return _json_memo(f"multibaggers::{market}", lambda: _multibaggers_uncached(market))


def _multibaggers_uncached(market: str):
    rows = _cached_rows(market)
    meds = sector_medians(rows)
    out = []
    for d in rows:
        med = meds.get(d["_sector"], {})
        s = score_stock(d, med.get("pe"), med.get("ps"))
        mb = multibagger_score(d, s["derived"]["peg_effective"],
                               s["derived"]["rev_cagr"], s["scores"]["consistency"])
        out.append({
            "ticker": d["ticker"], "name": d["_name"], "sector": d["_sector"],
            "market": d["_market"], "currency": d.get("currency"),
            "price": d.get("price"), "market_cap": d.get("market_cap"),
            "bucket": mb["bucket"],
            "rev_growth_ttm": d.get("rev_growth_ttm"),
            "earnings_growth": d.get("earnings_growth"),
            "rev_cagr": s["derived"]["rev_cagr"],
            "peg": s["derived"]["peg_effective"],
            "roe": d.get("roe"),
            "insider_holding": d.get("insider_holding"),
            "pos_52w": mb["pos_52w"],
            "mb_score": mb["score"],
            "pillars": mb["pillars"],
            "signals": mb["signals"],
            "verdict": mb["verdict"],
            "completeness": s["completeness"],
        })
    out.sort(key=lambda r: (r["mb_score"] if r["mb_score"] is not None else -1), reverse=True)
    return {"rows": out}


@app.get("/api/legends")
def legends(market: str = Query(pattern="^(india|global)$")):
    return _json_memo(f"legends::{market}", lambda: _legends_uncached(market))


def _legends_uncached(market: str):
    rows = _cached_rows(market)
    meds = _medians(market)
    factors = _factors(market)
    out = []
    for d in rows:
        med = meds.get(d["_sector"], {})
        s = score_stock(d, med.get("pe"), med.get("ps"))
        leg = _full_legends(d, s["scores"], s["derived"]["rev_cagr"],
                            s["derived"]["peg_effective"], factors)
        fv = leg["fair_value"]
        out.append({
            "ticker": d["ticker"], "name": d["_name"], "sector": d["_sector"],
            "market": d["_market"], "currency": d.get("currency"),
            "price": d.get("price"),
            "fair_value": fv["fair_value"], "upside": fv["upside"],
            "valuation_class": fv["classification"], "models_used": fv["models_used"],
            "graham_upside": leg["graham"].get("number_upside"),
            "lynch_upside": leg["lynch"].get("upside"),
            "buffett": {"passed": leg["buffett"]["passed"], "known": leg["buffett"]["known"],
                        "verdict": leg["buffett"]["verdict"]},
            "rj": {"passed": leg["rj"]["passed"], "known": leg["rj"]["known"],
                   "verdict": leg["rj"]["verdict"]},
            "factors": leg["factors"],
            "expectations": expectations_gap(d, s["derived"]["rev_cagr"]),
        })
    out.sort(key=lambda r: (r["upside"] if r["upside"] is not None else -99), reverse=True)
    return {"rows": out}


class HoldingIn(BaseModel):
    ticker: str
    qty: float
    buy_price: float


class WatchIn(BaseModel):
    on: bool


@app.get("/api/portfolio")
def get_portfolio():
    return pf.load()


@app.post("/api/portfolio/holding")
def add_holding(h: HoldingIn):
    if h.ticker not in META:
        raise HTTPException(404, f"{h.ticker} is not in the universe")
    if h.qty <= 0 or h.buy_price <= 0:
        raise HTTPException(400, "qty and buy_price must be positive")
    return pf.upsert_holding(h.ticker, h.qty, h.buy_price)


@app.delete("/api/portfolio/holding/{ticker}")
def delete_holding(ticker: str):
    return pf.remove_holding(ticker)


@app.post("/api/portfolio/watch/{ticker}")
def watch(ticker: str, w: WatchIn):
    if ticker not in META:
        raise HTTPException(404, f"{ticker} is not in the universe")
    return pf.set_watch(ticker, w.on)


def _usdinr():
    hist = fetch_history("USDINR=X", "5d", "1d")
    return hist[-1]["close"] if hist else 88.0


@app.get("/api/portfolio/xray")
def portfolio_xray():
    store = pf.load()
    all_rows = {r["ticker"]: r for r in _screener_rows()}
    rate = _usdinr()
    downgrades = {}
    p = ledger.compute_pulse()
    for m in p.get("movers", []):
        if m["delta"] < 0:
            downgrades[m["ticker"]] = m["delta"]

    holdings = []
    for h in store["holdings"]:
        r = all_rows.get(h["ticker"])
        price = r.get("price") if r else None
        value = price * h["qty"] if price is not None else None
        is_inr = (r or {}).get("currency") == "INR"
        inr_value = value if value is None else (value if is_inr else value * rate)
        flags = []
        if r:
            if r["valuation_class"]["label"] in ("Very Expensive",):
                flags.append("Very Expensive vs legend fair value")
            ev = r["expectations"]["verdict"]["label"]
            if ev in ("Hope Premium", "Extreme Hope"):
                flags.append(f"Expectations: {ev}")
            if h["ticker"] in downgrades:
                flags.append(f"Score downgraded {downgrades[h['ticker']]} since last snapshot")
        holdings.append({
            **h,
            "name": META[h["ticker"]]["name"] if h["ticker"] in META else h["ticker"],
            "sector": META.get(h["ticker"], {}).get("sector"),
            "currency": (r or {}).get("currency"),
            "price": price,
            "value": value,
            "inr_value": inr_value,
            "pnl_pct": (price / h["buy_price"] - 1) if price and h["buy_price"] else None,
            "composite": (r or {}).get("scores", {}).get("composite"),
            "mb_score": (r or {}).get("mb_score"),
            "upside": (r or {}).get("upside"),
            "valuation_class": (r or {}).get("valuation_class"),
            "expectations": (r or {}).get("expectations"),
            "flags": flags,
        })

    total_inr = sum(h["inr_value"] for h in holdings if h["inr_value"] is not None)
    weighted = {"composite": None, "mb": None, "gap": None}
    if total_inr > 0:
        def wavg(get):
            num = den = 0.0
            for h in holdings:
                v, x = h["inr_value"], get(h)
                if v is not None and x is not None:
                    num += v * x
                    den += v
            return round(num / den, 1) if den > 0 else None
        def gap_pct(h):
            g = (h["expectations"] or {}).get("gap")
            return g * 100 if g is not None else None
        weighted = {
            "composite": wavg(lambda h: h["composite"]),
            "mb": wavg(lambda h: h["mb_score"]),
            "gap": wavg(gap_pct),
        }

    sectors: dict[str, float] = {}
    for h in holdings:
        if h["inr_value"] is not None and h["sector"]:
            sectors[h["sector"]] = sectors.get(h["sector"], 0) + h["inr_value"]
    sector_rows = sorted(
        ({"sector": k, "share": round(v / total_inr, 4)} for k, v in sectors.items()),
        key=lambda x: x["share"], reverse=True,
    ) if total_inr > 0 else []

    watchlist = []
    for t in store["watchlist"]:
        r = all_rows.get(t)
        if r:
            watchlist.append(r)

    return {
        "holdings": holdings, "total_inr": total_inr, "usdinr": round(rate, 2),
        "weighted": weighted, "sectors": sector_rows, "watchlist": watchlist,
    }


RANGE_MAP = {
    "1y": ("1y", "1d"),
    "5y": ("5y", "1wk"),
    "max": ("max", "1mo"),
}


@app.get("/api/stock/{ticker}")
def stock_detail(ticker: str):
    if ticker not in META:
        raise HTTPException(404, f"{ticker} is not in the universe")
    d = cache_load(f"fund_{ticker}", FUNDAMENTALS_TTL) or fetch_fundamentals(ticker)
    d = dict(d)
    meta = META[ticker]
    d.update(_name=meta["name"], _sector=meta["sector"], _market=meta["market"])

    # sector medians from same market for relative valuation
    med = _medians(meta["market"]).get(meta["sector"], {})
    s = score_stock(d, med.get("pe"), med.get("ps"))
    legends_full = _full_legends(d, s["scores"], s["derived"]["rev_cagr"],
                                 s["derived"]["peg_effective"], _factors(meta["market"]))
    mb = multibagger_score(d, s["derived"]["peg_effective"],
                           s["derived"]["rev_cagr"], s["scores"]["consistency"])
    exp_full = expectations_gap(d, s["derived"]["rev_cagr"])
    votes = rt.build_votes(s["scores"], legends_full, mb, exp_full)

    history = {rng: fetch_history(ticker, p, i) for rng, (p, i) in RANGE_MAP.items()}

    rev = d.get("revenue_by_year") or {}
    ni = d.get("net_income_by_year") or {}
    years = sorted(set(rev) | set(ni))
    financials = []
    prev_rev = None
    for y in years:
        r = rev.get(y)
        growth = None
        if r is not None and prev_rev and prev_rev > 0:
            growth = round((r - prev_rev) / prev_rev, 4)
        financials.append({
            "year": y, "revenue": r, "net_income": ni.get(y), "rev_growth": growth,
        })
        if r is not None:
            prev_rev = r

    return {
        "ticker": ticker, "name": meta["name"], "sector": meta["sector"],
        "market": meta["market"], "currency": d.get("currency"),
        "price": d.get("price"), "market_cap": d.get("market_cap"),
        "high_52w": d.get("high_52w"), "low_52w": d.get("low_52w"),
        "metrics": {
            "pe": d.get("pe"), "forward_pe": d.get("forward_pe"),
            "peg": s["derived"]["peg_effective"], "ps": d.get("ps"), "pb": d.get("pb"),
            "rev_growth_ttm": d.get("rev_growth_ttm"),
            "rev_cagr": s["derived"]["rev_cagr"],
            "earnings_growth": d.get("earnings_growth"),
            "roe": d.get("roe"), "net_margin": d.get("net_margin"),
            "op_margin": d.get("op_margin"), "debt_to_equity": d.get("debt_to_equity"),
            "fcf_margin": s["derived"]["fcf_margin"],
            "dividend_yield": d.get("dividend_yield"),
            "sector_median_pe": med.get("pe"),
            "pe_vs_sector": s["derived"]["pe_vs_sector"],
            "positive_growth_years": s["derived"]["positive_growth_years"],
            "growth_volatility": s["derived"]["growth_volatility"],
        },
        "scores": s["scores"], "verdict": s["verdict"],
        "completeness": s["completeness"],
        "financials": financials, "history": history,
        "legends": legends_full,
        "multibagger": mb,
        "expectations": exp_full,
        "roundtable": {"votes": votes, **rt.summarize(votes)},
        "return_dna": _return_dna(history.get("5y"), d.get("net_income_by_year"),
                                  d.get("dividend_yield")),
        "watched": ticker in pf.load()["watchlist"],
    }


@app.get("/api/compare")
def compare(tickers: str):
    wanted = [t.strip() for t in tickers.split(",") if t.strip()][:4]
    if len(wanted) < 2:
        raise HTTPException(400, "Provide 2-4 comma-separated tickers")
    all_rows = {r["ticker"]: r for r in _screener_rows()}
    result = []
    for t in wanted:
        if t not in META:
            raise HTTPException(404, f"{t} is not in the universe")
        hist = fetch_history(t, "5y", "1wk")
        base = next((p["close"] for p in hist if p["close"]), None)
        norm = (
            [{"date": p["date"], "value": round(p["close"] / base * 100, 2)} for p in hist]
            if base else []
        )
        row = all_rows.get(t) or {}
        result.append({
            "ticker": t, "name": META[t]["name"], "sector": META[t]["sector"],
            "market": META[t]["market"], "summary": row, "normalized": norm,
        })
    return {"stocks": result}


@app.get("/api/commodities")
def commodities():
    out = []
    for ticker, name, group in COMMODITIES:
        hist = fetch_history(ticker, "10y", "1mo")
        daily = fetch_history(ticker, "2y", "1d")
        signal = None
        if len(daily) >= 200:
            closes = [p["close"] for p in daily]
            dma200 = sum(closes[-200:]) / 200
            last = closes[-1]
            signal = {
                "last": round(last, 2), "dma200": round(dma200, 2),
                "above_dma200": last > dma200,
                "pct_vs_dma200": round((last / dma200 - 1) * 100, 2),
            }
        change_10y = None
        closes10 = [p["close"] for p in hist if p["close"]]
        if len(closes10) >= 2 and closes10[0] > 0:
            change_10y = round((closes10[-1] / closes10[0] - 1) * 100, 1)
        out.append({
            "ticker": ticker, "name": name, "group": group,
            "history": hist, "signal": signal, "change_10y_pct": change_10y,
        })

    # gold/silver ratio from monthly USD futures
    gold = {p["date"]: p["close"] for p in fetch_history("GC=F", "10y", "1mo")}
    silver = {p["date"]: p["close"] for p in fetch_history("SI=F", "10y", "1mo")}
    ratio = [
        {"date": dt, "value": round(gold[dt] / silver[dt], 2)}
        for dt in sorted(set(gold) & set(silver)) if silver[dt]
    ]
    return {"commodities": out, "gold_silver_ratio": ratio}


# ---------------------------------------------------------------- local hosting
# Serve the built frontend (frontend/dist) from this same server, so the whole
# app lives at one address with no Node process needed. `npm run build` in
# frontend/ regenerates the bundle. Registered last so /api/* wins.
DIST = Path(__file__).parent.parent / "frontend" / "dist"

# The plain-English guide (docs/index.html) — readable at /guide
GUIDE = Path(__file__).parent.parent / "docs"
if GUIDE.exists():
    app.mount("/guide", StaticFiles(directory=GUIDE, html=True), name="guide")

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    # index.html must never be cached: asset filenames are content-hashed, so a
    # stale index.html would keep pointing at an old bundle after a rebuild.
    NO_STORE = {"Cache-Control": "no-store, must-revalidate"}

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = DIST / full_path
        if full_path and ".." not in full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html", headers=NO_STORE)
