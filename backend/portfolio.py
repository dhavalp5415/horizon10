"""Local portfolio & watchlist persistence (single-user JSON store)."""
import json
import threading
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
FILE = DATA_DIR / "portfolio.json"
_lock = threading.Lock()

EMPTY = {"holdings": [], "watchlist": []}


def load():
    if not FILE.exists():
        return dict(EMPTY)
    try:
        d = json.loads(FILE.read_text(encoding="utf-8"))
        return {"holdings": d.get("holdings", []), "watchlist": d.get("watchlist", [])}
    except (json.JSONDecodeError, OSError):
        return dict(EMPTY)


def _save(d):
    FILE.write_text(json.dumps(d, indent=2), encoding="utf-8")


def upsert_holding(ticker: str, qty: float, buy_price: float):
    with _lock:
        d = load()
        d["holdings"] = [h for h in d["holdings"] if h["ticker"] != ticker]
        d["holdings"].append({"ticker": ticker, "qty": qty, "buy_price": buy_price})
        _save(d)
        return d


def remove_holding(ticker: str):
    with _lock:
        d = load()
        d["holdings"] = [h for h in d["holdings"] if h["ticker"] != ticker]
        _save(d)
        return d


def set_watch(ticker: str, on: bool):
    with _lock:
        d = load()
        wl = [t for t in d["watchlist"] if t != ticker]
        if on:
            wl.append(ticker)
        d["watchlist"] = wl
        _save(d)
        return d
