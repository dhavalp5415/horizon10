"""Warm the data cache for the full universe. Run: python warm.py"""
import time

from fetcher import refresh_all, cache_coverage, REFRESH_STATE

if __name__ == "__main__":
    start = time.time()
    print("Warming cache for full universe...")
    refresh_all(force=False)
    cov = cache_coverage()
    print(f"Done in {time.time() - start:.0f}s — {cov['cached']}/{cov['total']} cached, "
          f"{len(REFRESH_STATE['errors'])} errors: {REFRESH_STATE['errors']}")
