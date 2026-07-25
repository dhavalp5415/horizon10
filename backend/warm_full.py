"""Resumable, self-throttling fetch of the FULL universe.

Yahoo rate-limits aggressively (HTTP 429 / "Invalid Crumb"), and once limited
it stays limited for a while. So this script:

  * makes exactly ONE fundamentals fetch per stock (info + income statement),
  * skips anything already cached (so it is safe to re-run / run in waves),
  * adapts its pace: speeds up while healthy, backs off exponentially and
    waits out a cooloff whenever Yahoo pushes back,
  * writes universe_auto.json incrementally, so progress is never lost.

Run:  venv\\Scripts\\python.exe warm_full.py [limit]
"""
import json
import logging
import sys
import time
from collections import deque
from pathlib import Path

import yfinance as yf

from fetcher import cache_load, fetch_fundamentals, FUNDAMENTALS_TTL
from build_universe import OUT as CAND_FILE

# yfinance logs HTTP errors instead of raising them; quiet the noise, we
# detect blocking behaviourally via the probe below.
logging.getLogger("yfinance").setLevel(logging.CRITICAL)

HERE = Path(__file__).parent
AUTO = HERE / "universe_auto.json"
STATE = HERE / "warm_full_state.json"

# ---- pacing ---------------------------------------------------------------
MIN_DELAY = 0.5           # fastest we ever go (seconds between stocks)
MAX_DELAY = 10.0
START_DELAY = 1.5
COOLOFF = [60, 120, 300, 600, 900, 900]  # escalating waits while blocked
MAX_TICKER_ATTEMPTS = 6   # then leave the stock for the next wave

RATE_HINTS = ("too many requests", "rate limit", "invalid crumb", "401", "429")
PROBE_TICKERS = ["RELIANCE.NS", "TCS.NS", "AAPL"]
FAIL_STREAK_PROBE = 6   # consecutive misses before we suspect a block


def is_rate_limited(err: str | None) -> bool:
    return bool(err) and any(h in err.lower() for h in RATE_HINTS)


def yahoo_alive() -> bool:
    """Is Yahoo serving us at all? Distinguishes 'blocked' from 'no data'.

    yfinance swallows HTTP errors and just returns an empty dict, so a failed
    fetch alone can't tell us which it was — we ask about a mega-cap that
    definitely has data.
    """
    for sym in PROBE_TICKERS:
        try:
            info = yf.Ticker(sym).info or {}
            if info.get("currentPrice") or info.get("marketCap"):
                return True
        except Exception:
            pass
        time.sleep(2)
    return False


# ---- sector mapping (Yahoo industry -> our taxonomy) ----------------------
INDUSTRY_MAP = [
    ("information technology services", "IT Services"),
    ("software", "Software & Cloud"),
    ("semiconductor", "Semiconductors & AI"),
    ("computer hardware", "Semiconductors & AI"),
    ("electronic components", "Electronics Mfg (EMS)"),
    ("electronics & computer distribution", "Electronics Mfg (EMS)"),
    ("consumer electronics", "Electronics Mfg (EMS)"),
    ("scientific & technical instruments", "Electronics Mfg (EMS)"),
    ("communication equipment", "Telecom"),
    ("telecom services", "Telecom"),
    ("internet content", "Internet Platforms"),
    ("internet retail", "Internet Platforms"),
    ("electronic gaming", "Internet Platforms"),
    ("advertising agencies", "Internet Platforms"),
    ("bank", "Banks"),
    ("credit services", "NBFC & Fin Services"),
    ("mortgage finance", "NBFC & Fin Services"),
    ("financial conglomerates", "NBFC & Fin Services"),
    ("financial data", "Capital Markets"),
    ("capital markets", "Capital Markets"),
    ("asset management", "Capital Markets"),
    ("financial exchange", "Capital Markets"),
    ("shell companies", "Capital Markets"),
    ("insurance", "Insurance"),
    ("drug manufacturers", "Pharma"),
    ("biotechnology", "Pharma"),
    ("pharmaceutical retailers", "Pharma"),
    ("medical care facilities", "Healthcare Services"),
    ("diagnostics & research", "Healthcare Services"),
    ("medical devices", "Healthcare Services"),
    ("medical instruments", "Healthcare Services"),
    ("medical distribution", "Healthcare Services"),
    ("health information services", "Healthcare Services"),
    ("healthcare plans", "Healthcare Services"),
    ("oil & gas", "Oil Gas & Energy"),
    ("thermal coal", "Oil Gas & Energy"),
    ("uranium", "Oil Gas & Energy"),
    ("coking coal", "Metals & Mining"),
    ("solar", "Renewables & Solar"),
    ("renewable", "Renewables & Solar"),
    ("utilities", "Power & Utilities"),
    ("auto manufacturers", "Autos"),
    ("recreational vehicles", "Autos"),
    ("auto parts", "Auto Components"),
    ("auto & truck dealerships", "Retail & Discretionary"),
    ("railroads", "Railways & Infra"),
    ("aerospace & defense", "Defence & Aerospace"),
    ("airlines", "Transport & Logistics"),
    ("airports", "Transport & Logistics"),
    ("marine shipping", "Transport & Logistics"),
    ("trucking", "Transport & Logistics"),
    ("integrated freight", "Transport & Logistics"),
    ("steel", "Metals & Mining"),
    ("aluminum", "Metals & Mining"),
    ("copper", "Metals & Mining"),
    ("gold", "Metals & Mining"),
    ("silver", "Metals & Mining"),
    ("industrial metals", "Metals & Mining"),
    ("precious metals", "Metals & Mining"),
    ("building materials", "Paints & Building Mat."),
    ("building products", "Paints & Building Mat."),
    ("lumber", "Paints & Building Mat."),
    ("specialty chemicals", "Chemicals"),
    ("chemicals", "Chemicals"),
    ("agricultural inputs", "Chemicals"),
    ("paper", "Chemicals"),
    ("packaging & containers", "Chemicals"),
    ("engineering & construction", "Capital Goods & Infra"),
    ("infrastructure operations", "Capital Goods & Infra"),
    ("specialty industrial machinery", "Capital Goods & Infra"),
    ("industrial distribution", "Capital Goods & Infra"),
    ("farm & heavy construction", "Capital Goods & Infra"),
    ("metal fabrication", "Capital Goods & Infra"),
    ("tools & accessories", "Capital Goods & Infra"),
    ("pollution & treatment", "Capital Goods & Infra"),
    ("waste management", "Capital Goods & Infra"),
    ("business equipment", "Capital Goods & Infra"),
    ("conglomerates", "Conglomerates & Ports"),
    ("electrical equipment", "Electricals & Wires"),
    ("furnishings", "Retail & Discretionary"),
    ("apparel", "Retail & Discretionary"),
    ("footwear", "Retail & Discretionary"),
    ("textile", "Retail & Discretionary"),
    ("luxury goods", "Retail & Discretionary"),
    ("department stores", "Retail & Discretionary"),
    ("specialty retail", "Retail & Discretionary"),
    ("home improvement retail", "Retail & Discretionary"),
    ("discount stores", "Retail & Discretionary"),
    ("leisure", "Retail & Discretionary"),
    ("gambling", "Travel & Hotels"),
    ("resorts & casinos", "Travel & Hotels"),
    ("lodging", "Travel & Hotels"),
    ("travel services", "Travel & Hotels"),
    ("restaurants", "Travel & Hotels"),
    ("beverages", "FMCG"),
    ("tobacco", "FMCG"),
    ("confectioners", "FMCG"),
    ("packaged foods", "FMCG"),
    ("food distribution", "FMCG"),
    ("farm products", "FMCG"),
    ("household & personal products", "FMCG"),
    ("grocery stores", "FMCG"),
    ("real estate", "Real Estate"),
    ("reit", "Real Estate"),
    ("entertainment", "Media & Entertainment"),
    ("broadcasting", "Media & Entertainment"),
    ("publishing", "Media & Entertainment"),
    ("education", "Education"),
    ("staffing", "Business Services"),
    ("consulting services", "Business Services"),
    ("specialty business services", "Business Services"),
    ("security & protection", "Business Services"),
    ("rental & leasing", "Business Services"),
    ("personal services", "Business Services"),
]

SECTOR_FALLBACK = {
    "Technology": "IT Services",
    "Financial Services": "NBFC & Fin Services",
    "Healthcare": "Pharma",
    "Energy": "Oil Gas & Energy",
    "Utilities": "Power & Utilities",
    "Basic Materials": "Chemicals",
    "Industrials": "Capital Goods & Infra",
    "Consumer Cyclical": "Retail & Discretionary",
    "Consumer Defensive": "FMCG",
    "Communication Services": "Telecom",
    "Real Estate": "Real Estate",
}


def map_sector(y_sector, y_industry):
    ind = (y_industry or "").lower()
    for key, ours in INDUSTRY_MAP:
        if key in ind:
            return ours
    # No sector/industry published by Yahoo at all — typical of the smallest,
    # thinly-covered micro-caps. Say so plainly rather than guessing.
    return SECTOR_FALLBACK.get(y_sector or "", "Unclassified")


# ---- state ----------------------------------------------------------------
def load_json(p, default):
    if not p.exists():
        return default
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return default


def entry_from_cache(ticker, fallback_name, market):
    """Build a universe entry from an already-cached fundamentals blob."""
    d = cache_load(f"fund_{ticker}", 0)   # ttl 0 = accept any age
    if d is None:
        return None
    name = (d.get("long_name") or fallback_name or ticker).strip()[:60]
    sector = map_sector(d.get("yahoo_sector"), d.get("yahoo_industry"))
    return [ticker, name, sector, d.get("market_cap") or 0]


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10 ** 9
    cands = load_json(CAND_FILE, None)
    if not cands:
        print("No candidates file — run build_universe.py first.")
        return
    auto = load_json(AUTO, {"india": [], "global": []})
    state = load_json(STATE, {"dead": []})
    dead = set(state.get("dead", []))

    have = {m: {e[0] for e in auto.get(m, [])} for m in ("india", "global")}

    queue = deque()
    for market in ("india", "global"):
        for ticker, fallback in cands[market]:
            if ticker not in have[market] and ticker not in dead:
                queue.append((market, ticker, fallback))
    total = len(queue)
    print(f"Queue: {total} stocks to resolve "
          f"(already indexed: {len(have['india']) + len(have['global'])}, "
          f"known no-data: {len(dead)})", flush=True)

    delay = START_DELAY
    fetched = skipped = 0
    consec_fail = 0
    pending_fail = []      # failures not yet proven to be 'no data'
    block_rounds = 0
    t0 = time.time()

    def index(market, ticker, fallback):
        e = entry_from_cache(ticker, fallback, market)
        if e:
            auto[market].append(e)
            have[market].add(ticker)

    while queue and (fetched + skipped) < limit:
        market, ticker, fallback = queue.popleft()
        if ticker in have[market] or ticker in dead:
            continue

        # already cached from an earlier wave? index it without a request
        if cache_load(f"fund_{ticker}", FUNDAMENTALS_TTL) is not None:
            index(market, ticker, fallback)
            skipped += 1
            continue

        d = fetch_fundamentals(ticker)

        if d.get("ok"):
            index(market, ticker, fallback)
            fetched += 1
            consec_fail = 0
            block_rounds = 0
            # anything that failed just before a success really had no data
            for m, t, _f in pending_fail:
                dead.add(t)
            pending_fail.clear()
            delay = max(MIN_DELAY, delay * 0.99)
        else:
            pending_fail.append((market, ticker, fallback))
            consec_fail += 1
            if consec_fail >= FAIL_STREAK_PROBE:
                # Is this a wall of no-data microcaps, or are we blocked?
                if yahoo_alive():
                    for m, t, _f in pending_fail:
                        dead.add(t)
                    pending_fail.clear()
                    consec_fail = 0
                else:
                    block_rounds += 1
                    wait = COOLOFF[min(block_rounds - 1, len(COOLOFF) - 1)]
                    delay = min(MAX_DELAY, max(delay * 1.5, 1.5))
                    print(f"  ! Yahoo is blocking us (round {block_rounds}) — waiting "
                          f"{wait}s, pace now {delay:.2f}s/stock. Re-queued "
                          f"{len(pending_fail)} stocks.", flush=True)
                    for item in reversed(pending_fail):
                        queue.appendleft(item)   # nothing is lost
                    pending_fail.clear()
                    consec_fail = 0
                    _save(auto, dead)
                    time.sleep(wait)
                    continue

        done = fetched + skipped
        if done and done % 100 == 0:
            el = (time.time() - t0) / 60
            left = len(queue)
            rate = done / max(el, 0.01)
            print(f"  {done} indexed ({fetched} fetched, {skipped} cached), "
                  f"{len(dead)} no-data, {left} left, pace {delay:.2f}s, "
                  f"{el:.1f}m elapsed, ~{left/max(rate,0.1):.0f}m to go", flush=True)
            _save(auto, dead)

        time.sleep(delay)

    for m, t, _f in pending_fail:
        dead.add(t)
    _save(auto, dead)
    print(f"DONE: india={len(auto['india'])} global={len(auto['global'])} "
          f"(fetched {fetched}, from cache {skipped}, no-data {len(dead)}, "
          f"left in queue {len(queue)}) in {(time.time()-t0)/60:.1f} min")


def _save(auto, dead):
    AUTO.write_text(json.dumps(auto, indent=1), encoding="utf-8")
    STATE.write_text(json.dumps({"dead": sorted(dead)}, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
