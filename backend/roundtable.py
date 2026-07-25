"""Legends' Round Table — every framework in the app casts a vote, and the
DISAGREEMENT between them is surfaced as a signal of its own.

A consensus-cheap stock everyone's models like is one kind of opportunity; a
"battleground" where Graham says cheap but the factor lens says broken (or
growth says wonderful but every value model says absurd) is where mispricing
— in either direction — actually lives.
"""
import statistics


def _vote(who, vote, reason):
    return {"who": who, "vote": vote, "reason": reason}


def build_votes(scores, legends, mb, exp):
    """Each framework votes +1 (buy-lean) / 0 (hold) / -1 (avoid).

    scores: pillar dict from score_stock()["scores"]
    legends: dict from _full_legends (graham, lynch, buffett, rj, factors)
    mb: multibagger_score() output; exp: expectations_gap() output
    Frameworks without enough data abstain (not counted).
    """
    votes = []

    g = legends["graham"]
    gu = g.get("number_upside") if g.get("number_upside") is not None else g.get("formula_upside")
    if gu is not None:
        v = 1 if gu > 0.15 else (-1 if gu < -0.30 else 0)
        votes.append(_vote("Graham", v,
                     f"Price {abs(gu)*100:.0f}% {'below' if gu > 0 else 'above'} my fair-value math"))

    lu = legends["lynch"].get("upside")
    if lu is not None:
        v = 1 if lu > 0.15 else (-1 if lu < -0.30 else 0)
        votes.append(_vote("Lynch", v,
                     f"{abs(lu)*100:.0f}% {'upside' if lu > 0 else 'downside'} at PEG = 1"))

    bt = legends["buffett"]["verdict"]
    if legends["buffett"]["known"] >= 3:
        v = 1 if bt["tone"] == "great" else (-1 if bt["tone"] == "bad" else 0)
        votes.append(_vote("Buffett", v, bt["label"]))

    rj = legends["rj"]["verdict"]
    if legends["rj"]["known"] >= 3:
        v = 1 if rj["tone"] in ("great", "good") else (-1 if rj["tone"] == "bad" else 0)
        votes.append(_vote("Jhunjhunwala", v, rj["label"]))

    f = legends.get("factors") or {}
    fvals = [x for x in (f.get("value"), f.get("quality"), f.get("momentum")) if x is not None]
    if len(fvals) >= 2:
        avg = sum(fvals) / len(fvals)
        v = 1 if avg >= 65 else (-1 if avg <= 35 else 0)
        votes.append(_vote("Factor lens", v, f"Avg factor percentile {avg:.0f} within its market"))

    ev = exp["verdict"]["label"]
    if exp.get("gap") is not None:
        v = 1 if ev == "Expectations Cushion" else (-1 if ev in ("Hope Premium", "Extreme Hope") else 0)
        votes.append(_vote("Expectations", v,
                     f"{ev}: {exp['gap']*100:+.0f}pp delivered vs priced-in growth"))

    if mb.get("score") is not None:
        v = 1 if (mb["score"] >= 72 and mb.get("bucket") in ("small", "mid")) else (-1 if mb["score"] < 45 else 0)
        votes.append(_vote("Multibagger", v, f"{mb['verdict']['label']} ({mb['score']:.0f}/100)"))

    comp = scores.get("composite")
    if comp is not None:
        v = 1 if comp >= 65 else (-1 if comp < 45 else 0)
        votes.append(_vote("10Y Score", v, f"Composite {comp:.0f}/100 for a decade hold"))

    return votes


def summarize(votes):
    if len(votes) < 3:
        return {
            "consensus": None, "disagreement": None, "battleground": False,
            "verdict": {"label": "Too little data for the table", "tone": "neutral"},
            "counts": {"buy": 0, "hold": 0, "avoid": 0},
        }
    vals = [v["vote"] for v in votes]
    consensus = round(sum(vals) / len(vals), 2)
    disagreement = round(statistics.pstdev(vals), 2)
    battleground = disagreement >= 0.75
    if battleground and -0.35 <= consensus <= 0.35:
        verdict = {"label": "Battleground — legends split", "tone": "warn"}
    elif consensus >= 0.5:
        verdict = {"label": "Consensus Buy-lean", "tone": "great"}
    elif consensus >= 0.2:
        verdict = {"label": "Lean Positive", "tone": "good"}
    elif consensus > -0.2:
        verdict = {"label": "Mixed / Hold", "tone": "neutral"}
    elif consensus > -0.5:
        verdict = {"label": "Lean Avoid", "tone": "warn"}
    else:
        verdict = {"label": "Consensus Avoid", "tone": "bad"}
    return {
        "consensus": consensus, "disagreement": disagreement,
        "battleground": battleground, "verdict": verdict,
        "counts": {
            "buy": sum(1 for v in vals if v == 1),
            "hold": sum(1 for v in vals if v == 0),
            "avoid": sum(1 for v in vals if v == -1),
        },
    }
