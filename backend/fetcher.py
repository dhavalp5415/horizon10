"""Yahoo Finance data fetching with a simple on-disk JSON cache."""
import json
import logging
import math
import re
import threading
import time
from collections import deque
from pathlib import Path

import yfinance as yf

from universe import all_stocks, COMMODITIES

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
FUNDAMENTALS_TTL = 24 * 3600
PRICES_TTL = 12 * 3600

# progress state for the refresh endpoint
REFRESH_STATE = {"running": False, "done": 0, "total": 0, "errors": [],
                 "finished_at": None, "blocked": False}

# yfinance logs HTTP failures rather than raising; we detect blocking by probe.
logging.getLogger("yfinance").setLevel(logging.CRITICAL)
_refresh_lock = threading.Lock()


def _safe_name(key: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", key)


def _cache_path(key: str) -> Path:
    return CACHE_DIR / f"{_safe_name(key)}.json"


def cache_load(key: str, ttl: int):
    p = _cache_path(key)
    if not p.exists():
        return None
    try:
        blob = json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    if ttl and time.time() - blob.get("_ts", 0) > ttl:
        return None
    return blob.get("data")


def cache_save(key: str, data):
    p = _cache_path(key)
    p.write_text(json.dumps({"_ts": time.time(), "data": data}), encoding="utf-8")


def _num(v):
    """Coerce to a JSON-safe float or None."""
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


INFO_FIELDS = {
    "trailingPE": "pe",
    "forwardPE": "forward_pe",
    "trailingPegRatio": "peg",
    "priceToSalesTrailing12Months": "ps",
    "priceToBook": "pb",
    "revenueGrowth": "rev_growth_ttm",
    "earningsGrowth": "earnings_growth",
    "returnOnEquity": "roe",
    "profitMargins": "net_margin",
    "operatingMargins": "op_margin",
    "debtToEquity": "debt_to_equity",
    "freeCashflow": "fcf",
    "totalRevenue": "total_revenue",
    "marketCap": "market_cap",
    "currentPrice": "price",
    "fiftyTwoWeekHigh": "high_52w",
    "fiftyTwoWeekLow": "low_52w",
    "dividendYield": "dividend_yield",
    "trailingEps": "eps",
    "forwardEps": "forward_eps",
    "bookValue": "book_value",
    "heldPercentInsiders": "insider_holding",
    "beta": "beta",
    "currency": None,  # handled separately (string)
}


def _annual_series(df, row_names):
    """Extract {year: value} from a yfinance statement DataFrame."""
    if df is None or getattr(df, "empty", True):
        return {}
    for row in row_names:
        if row in df.index:
            out = {}
            for col, val in df.loc[row].items():
                v = _num(val)
                if v is not None:
                    out[str(col.year)] = v
            return dict(sorted(out.items()))
    return {}


def fetch_fundamentals(ticker: str, force: bool = False):
    """Fetch info + annual income statement for one ticker. Cached 24h."""
    key = f"fund_{ticker}"
    if not force:
        cached = cache_load(key, FUNDAMENTALS_TTL)
        if cached is not None:
            return cached

    t = yf.Ticker(ticker)
    err = None
    try:
        info = t.info or {}
    except Exception as e:
        info = {}
        err = str(e)

    data = {"ticker": ticker}
    for src, dst in INFO_FIELDS.items():
        if dst:
            data[dst] = _num(info.get(src))
    data["currency"] = info.get("currency")
    data["yahoo_sector"] = info.get("sector")
    data["yahoo_industry"] = info.get("industry")
    data["long_name"] = info.get("longName") or info.get("shortName")

    try:
        inc = t.income_stmt
    except Exception as e:
        inc = None
        err = err or str(e)
    data["revenue_by_year"] = _annual_series(inc, ["Total Revenue", "Operating Revenue"])
    data["net_income_by_year"] = _annual_series(
        inc, ["Net Income", "Net Income Common Stockholders"]
    )

    # a stock is considered "fetched ok" if we got at least a price or revenue
    data["ok"] = data.get("price") is not None or bool(data["revenue_by_year"])
    data["err"] = err
    if data["ok"]:
        cache_save(key, data)
    return data


def fetch_history(ticker: str, period: str, interval: str, force: bool = False):
    """Price history as [{date, close}]. Cached 12h."""
    key = f"hist_{ticker}_{period}_{interval}"
    if not force:
        cached = cache_load(key, PRICES_TTL)
        if cached is not None:
            return cached
    try:
        df = yf.Ticker(ticker).history(period=period, interval=interval, auto_adjust=True)
    except Exception:
        return []
    if df is None or df.empty or "Close" not in df:
        return []
    out = []
    for idx, val in df["Close"].items():
        v = _num(val)
        if v is not None:
            out.append({"date": idx.strftime("%Y-%m-%d"), "close": round(v, 4)})
    cache_save(key, out)
    return out


def refresh_all(force: bool = True):
    """Refresh the whole universe, politely.

    Yahoo rate-limits hard and then stays limited, so this walks the universe
    sequentially with an adaptive delay instead of a thread pool. When it
    detects a block it waits it out and re-queues the affected stocks — a
    refresh may take a while over a full market, but it never loses stocks
    and never leaves the cache half-poisoned. The app stays usable throughout
    thanks to the stale-cache fallback.
    """
    with _refresh_lock:
        if REFRESH_STATE["running"]:
            return
        stocks = all_stocks()
        REFRESH_STATE.update(running=True, done=0, total=len(stocks), errors=[],
                             finished_at=None, blocked=False)

    queue = deque(row[0] for row in stocks)
    delay = 0.6
    consec_fail = 0
    pending = []
    block_rounds = 0

    while queue:
        ticker = queue.popleft()
        try:
            d = fetch_fundamentals(ticker, force=force)
        except Exception:
            d = {}

        if d.get("ok"):
            consec_fail = 0
            block_rounds = 0
            REFRESH_STATE["errors"] = [e for e in REFRESH_STATE["errors"]
                                       if e != ticker]
            for t in pending:
                REFRESH_STATE["errors"].append(t)
            pending.clear()
            delay = max(0.4, delay * 0.99)
            REFRESH_STATE["blocked"] = False
        else:
            pending.append(ticker)
            consec_fail += 1
            if consec_fail >= 6:
                if _yahoo_alive():
                    REFRESH_STATE["errors"].extend(pending)
                    pending.clear()
                    consec_fail = 0
                else:
                    block_rounds += 1
                    wait = min(900, 60 * (2 ** (block_rounds - 1)))
                    delay = min(8.0, max(delay * 1.5, 1.5))
                    REFRESH_STATE["blocked"] = True
                    for t in reversed(pending):
                        queue.appendleft(t)          # nothing is dropped
                    REFRESH_STATE["done"] = max(0, REFRESH_STATE["done"] - len(pending))
                    pending.clear()
                    consec_fail = 0
                    time.sleep(wait)
                    continue

        REFRESH_STATE["done"] += 1
        time.sleep(delay)

    REFRESH_STATE["errors"].extend(pending)

    # warm commodity histories too
    for ticker, _, _ in COMMODITIES:
        try:
            fetch_history(ticker, "10y", "1mo", force=force)
        except Exception:
            pass
        time.sleep(delay)

    REFRESH_STATE["running"] = False
    REFRESH_STATE["blocked"] = False
    REFRESH_STATE["finished_at"] = time.time()


def _yahoo_alive() -> bool:
    """Distinguish 'Yahoo is blocking us' from 'this stock has no data'."""
    for sym in ("RELIANCE.NS", "AAPL"):
        try:
            info = yf.Ticker(sym).info or {}
            if info.get("currentPrice") or info.get("marketCap"):
                return True
        except Exception:
            pass
        time.sleep(2)
    return False


def cache_coverage():
    """How many universe tickers have fresh fundamentals cached."""
    stocks = all_stocks()
    have = sum(1 for t, *_ in stocks if cache_load(f"fund_{t}", FUNDAMENTALS_TTL) is not None)
    return {"cached": have, "total": len(stocks)}
