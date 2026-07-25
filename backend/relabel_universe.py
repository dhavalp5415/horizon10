"""Re-derive every auto entry's name + sector from the local cache.

No network calls — run this after changing the sector mapping in warm_full.py
so existing entries pick up the improved labels.

Run: venv\\Scripts\\python.exe relabel_universe.py
"""
import collections
import json

from warm_full import AUTO, entry_from_cache


def main():
    auto = json.loads(AUTO.read_text(encoding="utf-8"))
    changed = 0
    for market in ("india", "global"):
        out = []
        for entry in auto.get(market, []):
            ticker, old_name, old_sector = entry[0], entry[1], entry[2]
            fresh = entry_from_cache(ticker, old_name, market)
            if fresh is None:
                out.append(entry)          # keep what we had
                continue
            if fresh[2] != old_sector or fresh[1] != old_name:
                changed += 1
            out.append(fresh)
        auto[market] = out
    AUTO.write_text(json.dumps(auto, indent=1), encoding="utf-8")

    counts = collections.Counter(r[2] for r in auto["india"] + auto["global"])
    print(f"Relabelled {changed} entries. "
          f"{len(auto['india'])} India + {len(auto['global'])} global.")
    for sector, n in counts.most_common():
        print(f"  {sector:28} {n}")


if __name__ == "__main__":
    main()
