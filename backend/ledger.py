"""Score Ledger — daily snapshots of every stock's scores, diffed into a
"what changed and why" Pulse feed with metric-level attribution."""
import json
import time
from pathlib import Path

LEDGER_DIR = Path(__file__).parent / "ledger"
LEDGER_DIR.mkdir(exist_ok=True)

# metrics stored per ticker and used for attribution of score changes
ATTR_FIELDS = [
    ("pe", "PE", 1),
    ("rev_growth_ttm", "Rev growth TTM", 100),   # stored as fraction, shown in %
    ("roe", "ROE", 100),
    ("upside", "Fair-value upside", 100),
    ("price", "Price", 1),
]


def today() -> str:
    return time.strftime("%Y-%m-%d")


def write_snapshot(per_ticker: dict):
    """per_ticker: {ticker: {name, market, sector, composite, mb, upside, cls,
    price, pe, rev_growth_ttm, roe}}. Overwrites today's file."""
    (LEDGER_DIR / f"{today()}.json").write_text(
        json.dumps({"date": today(), "stocks": per_ticker}), encoding="utf-8"
    )


def snapshot_dates():
    return sorted(p.stem for p in LEDGER_DIR.glob("*.json"))


def load_snapshot(date: str):
    p = LEDGER_DIR / f"{date}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _attribution(old: dict, new: dict):
    """Human-readable list of the metric moves behind a score change."""
    out = []
    for key, label, mult in ATTR_FIELDS:
        a, b = old.get(key), new.get(key)
        if a is None or b is None:
            continue
        if a == 0:
            continue
        rel = abs(b - a) / abs(a)
        if rel < 0.02:  # ignore sub-2% wiggles
            continue
        if mult == 100:
            out.append(f"{label} {a*100:.1f}% → {b*100:.1f}%")
        else:
            out.append(f"{label} {a:.1f} → {b:.1f}")
    return out


MIN_COMPLETENESS = 0.6   # ignore stocks whose scores rest on almost no data


def _covered(entry: dict) -> bool:
    """Thin-data micro-caps swing wildly on a single new field; keep them out
    of the feed so Pulse reports real changes, not data artefacts."""
    c = entry.get("comp")
    return c is None or c >= MIN_COMPLETENESS


def compute_pulse(min_delta: float = 2.0):
    """Diff the two most recent snapshots (plus a ~week-back reference)."""
    dates = snapshot_dates()
    if not dates:
        return {"latest": None, "previous": None, "events": [], "movers": [],
                "message": "No snapshots yet — refresh data once to seed the ledger."}
    latest = load_snapshot(dates[-1])
    if len(dates) == 1:
        return {"latest": dates[-1], "previous": None, "events": [], "movers": [],
                "message": "First snapshot recorded today. The Pulse feed starts "
                           "filling up from the next refresh on a later day."}
    previous = load_snapshot(dates[-2])
    week_ref = None
    for dstr in reversed(dates[:-1]):
        if (time.mktime(time.strptime(dates[-1], "%Y-%m-%d"))
                - time.mktime(time.strptime(dstr, "%Y-%m-%d"))) >= 6 * 86400:
            week_ref = dstr
            break

    events, movers, added = [], [], []
    new_stocks = latest["stocks"]
    old_stocks = previous["stocks"]
    for t, new in new_stocks.items():
        if not _covered(new):
            continue
        old = old_stocks.get(t)
        if old is None:
            added.append({"type": "new", "ticker": t, "name": new.get("name"),
                          "market": new.get("market"),
                          "text": "Added to the universe", "attribution": []})
            continue
        sc_old, sc_new = old.get("composite"), new.get("composite")
        if sc_old is not None and sc_new is not None:
            delta = round(sc_new - sc_old, 1)
            if abs(delta) >= min_delta:
                movers.append({
                    "ticker": t, "name": new.get("name"), "market": new.get("market"),
                    "sector": new.get("sector"),
                    "old": sc_old, "new": sc_new, "delta": delta,
                    "attribution": _attribution(old, new),
                })
        cls_old, cls_new = old.get("cls"), new.get("cls")
        if cls_old and cls_new and cls_old != cls_new:
            events.append({
                "type": "flip", "ticker": t, "name": new.get("name"),
                "market": new.get("market"),
                "text": f"Valuation class: {cls_old} → {cls_new}",
                "attribution": _attribution(old, new),
            })
    movers.sort(key=lambda m: abs(m["delta"]), reverse=True)
    # A universe expansion would otherwise bury the real news under thousands
    # of "added" rows — summarise instead of listing them.
    if len(added) > 25:
        events.insert(0, {
            "type": "universe", "ticker": "", "name": f"{len(added)} stocks added",
            "market": "", "attribution": [],
            "text": f"Universe expanded by {len(added)} stocks — now covering "
                    f"{len(new_stocks)} names.",
        })
    else:
        events = added + events
    return {
        "latest": dates[-1], "previous": dates[-2], "week_ref": week_ref,
        "events": events[:80], "movers": movers[:40],
        "message": None,
    }
