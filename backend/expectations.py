"""Expectations Gap Engine.

Research firms publish THEIR growth forecast. This inverts the question:
what growth is the market ALREADY pricing in at today's PE, and does the
company actually deliver it?

Implied growth comes from inverting Graham's growth formula
    V = EPS x (8.5 + 2g)  =>  at fair pricing PE = 8.5 + 2g  =>  g = (PE - 8.5) / 2
clamped to 0-30%/yr. Delivered growth is the company's demonstrated rate
(earnings growth capped by revenue growth via `sustainable_growth`, blended
with revenue CAGR). Gap = delivered - implied.
"""
from legends import sustainable_growth


def expectations_gap(d, rev_cagr=None):
    pe = d.get("pe")
    out = {
        "implied_growth": None,
        "delivered_growth": None,
        "gap": None,
        "peg1_reading": None,
        "verdict": {"label": "No read", "tone": "neutral"},
        "note": None,
    }

    if pe is None or pe <= 0:
        out["note"] = "No implied-growth read: negative or missing earnings."
        return out
    implied = max(0.0, min(0.30, (pe - 8.5) / 2 / 100))
    out["implied_growth"] = round(implied, 4)
    # a second, more aggressive inversion for context: at PEG=1, PE == growth%
    out["peg1_reading"] = round(min(0.60, pe / 100), 4)

    g, _capped = sustainable_growth(d, rev_cagr)
    parts = [x for x in (g, rev_cagr) if x is not None]
    if not parts:
        out["note"] = "No delivered-growth history to compare against."
        return out
    # same 0-30% band as the implied side: nobody compounds faster for a decade,
    # so an uncapped hypergrowth year would overstate the cushion
    delivered = min(0.30, max(-0.10, sum(parts) / len(parts)))
    out["delivered_growth"] = round(delivered, 4)

    gap = delivered - implied
    out["gap"] = round(gap, 4)
    if gap >= 0.05:
        out["verdict"] = {"label": "Expectations Cushion", "tone": "great"}
        out["note"] = "Delivering more growth than the price demands — rerating fuel if it continues."
    elif gap >= -0.05:
        out["verdict"] = {"label": "Fairly Set", "tone": "good"}
        out["note"] = "The price asks for roughly what the company already delivers."
    elif gap >= -0.15:
        out["verdict"] = {"label": "Hope Premium", "tone": "warn"}
        out["note"] = "The price needs faster growth than the delivered record — execution must improve."
    else:
        out["verdict"] = {"label": "Extreme Hope", "tone": "bad"}
        out["note"] = "The price assumes growth far beyond anything demonstrated — priced for perfection."
    return out
