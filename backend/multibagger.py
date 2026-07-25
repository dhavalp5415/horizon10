"""Multibagger Score — a blend of the documented methods of investors famous
for finding multibaggers:

- Peter Lynch ("One Up on Wall Street"): fast growers 20-25%+, small companies
  ("big companies, small moves"), PEG near 1, strong balance sheet.
- Jim Slater ("The Zulu Principle"): PEG < 0.75 outstanding / < 1 good,
  small caps, low debt.
- Raamdeo Agrawal (Motilal Oswal QGLP, Wealth Creation Studies): Quality
  (ROE >= 15-20%), Growth (20%+ earnings), Longevity, reasonable Price.
- William O'Neil (CANSLIM): earnings acceleration + relative price strength
  (leaders trade near 52-week highs).
- Rakesh Jhunjhunwala: promoter skin in the game, long runway.

Weights: size runway 20% + growth engine 25% + GARP price 20% +
quality/balance-sheet 20% + momentum/conviction 15%.
"""
from scoring import FINANCIAL_SECTORS, ramp, _mean

# SEBI-style buckets for INR; analogous cuts for global listings.
def cap_bucket(mcap, currency):
    if mcap is None:
        return None
    if currency == "INR":
        if mcap >= 1.2e12:   # ≥ ₹1.2 lakh crore ≈ top-100 territory
            return "large"
        if mcap >= 3.3e11:   # ₹33,000 Cr — SEBI midcap floor neighbourhood
            return "mid"
        return "small"
    if mcap >= 1.0e11:       # ≥ $100B
        return "large"
    if mcap >= 1.5e10:       # $15B–100B
        return "mid"
    return "small"


SIZE_SCORE = {"small": 100.0, "mid": 65.0, "large": 20.0}
WEIGHTS = {"size": 0.20, "growth": 0.25, "garp": 0.20, "quality": 0.20, "momentum": 0.15}


def multibagger_score(d, peg_effective, rev_cagr, consistency):
    """d = cached fundamentals dict with `_sector`. Returns full breakdown."""
    is_fin = d.get("_sector") in FINANCIAL_SECTORS
    bucket = cap_bucket(d.get("market_cap"), d.get("currency"))
    signals = []

    # ---- size runway (Lynch: small companies make the big moves) ----
    size = SIZE_SCORE.get(bucket)
    if bucket == "small":
        signals.append("Small cap — Lynch's ten-bagger hunting ground")
    elif bucket == "mid":
        signals.append("Mid cap — room to re-rate into a large cap")

    # ---- growth engine (Lynch fast grower / QGLP Growth) ----
    rg, eg = d.get("rev_growth_ttm"), d.get("earnings_growth")
    growth = _mean([
        ramp(rg, worst=0.08, best=0.35),
        ramp(rev_cagr, worst=0.08, best=0.30),
        ramp(eg, worst=0.10, best=0.40),
    ])
    if rg is not None and rg >= 0.20:
        signals.append(f"Lynch fast grower: revenue +{rg*100:.0f}% TTM")
    if eg is not None and eg >= 0.25:
        signals.append(f"Earnings accelerating +{eg*100:.0f}% (O'Neil 'C')")

    # ---- GARP price (Slater's Zulu PEG) ----
    garp = ramp(peg_effective, worst=2.5, best=0.5)
    if peg_effective is not None:
        if peg_effective < 0.75:
            signals.append(f"Slater outstanding PEG {peg_effective:.2f} (< 0.75)")
        elif peg_effective < 1.2:
            signals.append(f"PEG {peg_effective:.2f} — growth not yet fully priced")

    # ---- quality & balance sheet (QGLP Quality, Slater low debt) ----
    roe, nm, de, fcf = d.get("roe"), d.get("net_margin"), d.get("debt_to_equity"), d.get("fcf")
    q_parts = [
        ramp(roe, worst=0.10, best=0.25),
        ramp(nm, worst=0.04, best=0.20),
        ramp(consistency, worst=30.0, best=80.0),
    ]
    if not is_fin:
        q_parts.append(ramp(de, worst=150.0, best=15.0))
        q_parts.append(100.0 if (fcf is not None and fcf > 0) else (None if fcf is None else 0.0))
    quality = _mean(q_parts)
    if roe is not None and roe >= 0.20:
        signals.append(f"QGLP quality: ROE {roe*100:.0f}%")
    if not is_fin and de is not None and de < 30:
        signals.append("Near debt-free balance sheet")

    # ---- momentum & conviction (O'Neil strength + RJ promoter holding) ----
    p, hi, lo, ins = d.get("price"), d.get("high_52w"), d.get("low_52w"), d.get("insider_holding")
    pos52 = None
    if p and hi and lo and hi > lo:
        pos52 = (p - lo) / (hi - lo)
    momentum = _mean([
        ramp(pos52, worst=0.20, best=0.95),
        ramp(ins, worst=0.25, best=0.65),
    ])
    if pos52 is not None and pos52 >= 0.80:
        signals.append(f"O'Neil leader: {pos52*100:.0f}% of 52-week range")
    if ins is not None and ins >= 0.50:
        signals.append(f"Promoter skin in the game: {ins*100:.0f}% holding (RJ)")

    pillars = {"size": size, "growth": growth, "garp": garp,
               "quality": quality, "momentum": momentum}
    avail = {k: v for k, v in pillars.items() if v is not None}
    score = None
    if avail:
        wsum = sum(WEIGHTS[k] for k in avail)
        score = round(sum(WEIGHTS[k] * v for k, v in avail.items()) / wsum, 1)

    if score is None:
        verdict = {"label": "Insufficient data", "tone": "neutral"}
    elif score >= 72 and bucket != "large":
        verdict = {"label": "Prime Multibagger Setup", "tone": "great"}
    elif score >= 60:
        verdict = {"label": "Strong Candidate", "tone": "good"}
    elif score >= 45:
        verdict = {"label": "Watchlist", "tone": "warn"}
    else:
        verdict = {"label": "Weak Setup", "tone": "bad"}

    return {
        "score": score,
        "bucket": bucket,
        "pillars": pillars,
        "signals": signals,
        "verdict": verdict,
        "pos_52w": round(pos52, 3) if pos52 is not None else None,
    }
