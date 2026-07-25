"""Build the FULL investable universe — candidate collection (no Yahoo calls).

India : every NSE main-board equity (official NSE EQUITY_L.csv, SERIES == EQ)
Global: S&P 500 + S&P 400 midcap + S&P 600 smallcap (Wikipedia constituents)
        plus the curated international/ADR names already in universe.py

Writes backend/universe_candidates.json. The actual data fetch + sector
mapping happens in warm_full.py, which is resumable and self-throttling
(Yahoo rate-limits hard, so we only ever make ONE fetch per stock).

Run: venv\\Scripts\\python.exe build_universe.py
"""
import csv
import io
import json
import re
import urllib.request
from pathlib import Path

OUT = Path(__file__).parent / "universe_candidates.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
NSE_CSV = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
WIKI = {
    "sp500": "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
    "sp400": "https://en.wikipedia.org/wiki/List_of_S%26P_400_companies",
    "sp600": "https://en.wikipedia.org/wiki/List_of_S%26P_600_companies",
}


def fetch(url):
    return urllib.request.urlopen(
        urllib.request.Request(url, headers=UA), timeout=45
    ).read().decode("utf-8", "ignore")


def nse_candidates():
    rows = list(csv.DictReader(io.StringIO(fetch(NSE_CSV))))
    out = []
    for r in rows:
        r = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in r.items()}
        if r.get("SERIES") != "EQ":
            continue
        sym, name = r.get("SYMBOL"), r.get("NAME OF COMPANY")
        if not sym or not name:
            continue
        out.append([f"{sym}.NS", name])
    return out


def wiki_symbols(url):
    html = fetch(url)
    syms = set()
    for m in re.finditer(r"nasdaq\.com/market-activity/stocks/([A-Za-z\.\-]{1,6})", html):
        syms.add(m.group(1).upper())
    for m in re.finditer(r"nyse\.com/quote/XNYS:([A-Za-z\.\-]{1,6})", html):
        syms.add(m.group(1).upper())
    return {s.replace(".", "-") for s in syms}


def global_candidates():
    syms = set()
    for name, url in WIKI.items():
        try:
            got = wiki_symbols(url)
            print(f"  {name}: {len(got)} symbols")
            syms |= got
        except Exception as e:
            print(f"  {name}: FAILED {str(e)[:60]}")
    return [[s, None] for s in sorted(syms)]


def main():
    india = nse_candidates()
    print(f"NSE main-board (EQ) equities: {len(india)}")
    glob = global_candidates()
    print(f"Global index constituents: {len(glob)}")
    OUT.write_text(json.dumps({"india": india, "global": glob}, indent=1), encoding="utf-8")
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
