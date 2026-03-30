# Scavenge Battle Specs — Revision Addendum

**Date:** 2026-03-30
**Status:** 📝 DRAFT — Review before merging into main spec
**Affects sections:** §4 (ATB & Pip Economy), §5 (Formation Turn), §6 (Action Cam & Exchanges), §18 (Open Questions)

---

## Summary

Pips are no longer "spent and lost at end of turn." Pips ARE the ATB bar. You spend them on actions and your bar refills from wherever you left it. This turns every pip spend into a deliberate tempo trade: present impact vs future turn speed.

Exchanges are restructured as fixed 3-round sequences with a built-in cost asymmetry between initiator and responder. The initiator pays per round; the responder gets free basic counters. This creates natural risk/reward tension and makes RELENT a tempo strategy rather than an escape hatch.

---

## Revision: §4 — ATB & Pip Economy

### What changes

**Pips persist across turns.** When a formation turn ends, unspent pips stay on the bar. ATB only needs to refill the spent pips, not reset to zero. A combatant who spends 1 pip is back in action much sooner than one who spends all 3.

### Old rule (replace)

> Pips do not carry across formation turns — when your turn ends, remaining pips are lost and bar resets.

### New rule

Pips are a persistent resource. Your formation turn triggers when all 3 pips are full. Any pips you spend during your turn (formation actions, exchange rounds, in-cam upgrades) are deducted from the bar. When your turn ends, ATB resumes refilling from whatever count remains. Unspent pips are never lost.

### Tempo implications

- Spend 1 pip (quick exchange, RELENT after round 1) → refill 1 pip → next turn comes fast.
- Spend all 3 pips (full 3-round exchange) → bar is empty → long wait before next turn.
- This makes speed stat more meaningful: fast characters can afford aggressive spending because their refill penalty is shorter. Slow characters benefit from conservative play — hit once, RELENT, conserve.

---

## Revision: §5 — Formation Turn

### What changes

Formation turn still triggers at 3 pips full. Actions still cost pips (DEF = 1, ITEM = 1, FLEE = 3). The change is that attacking enters an exchange which has its own pip-spending rules (see §6 revision below), and leftover pips persist after the turn ends.

### Old rule (replace)

> Maximum one attack per formation turn. Attack opens the action cam. When the exchange resolves, the turn is over regardless of remaining pips. Remaining pips are lost.

### New rule

Attack opens the action cam and begins an exchange (see §6). Each round the initiator attacks costs 1 pip. When the exchange ends (via RELENT or 3 rounds completed), the formation turn ends and ATB resumes refilling from remaining pip count. Unspent pips are never forfeited.

### Pre-exchange spending still works

You can still chain non-attack actions before entering an exchange: DEF (1 pip) → ATK (opens exchange with 2 pips remaining). You'd have 2 rounds of budget in the exchange instead of 3. This is a real trade — the DEF buff might be worth a shorter exchange.

---

## Revision: §6 — Action Cam & Exchanges

### What changes

Exchanges are restructured from variable-length to fixed 3-round maximum. The cost model is asymmetric: initiator pays per round, responder gets free basics but can optionally spend pips to upgrade.

### Exchange structure

Each exchange has up to **3 rounds**. Each round:

1. **Initiator acts** — costs 1 pip. Executes an attack combo (pip-tier determines combo strength, see Action Tiers below). Can RELENT instead (free, ends exchange immediately).
2. **Responder reacts** — free basic counter (weak, chip damage). Can optionally spend 1+ pip to upgrade their counter into a stronger combo.

Exchange ends when: initiator RELENTs, initiator has 0 pips, or 3 rounds complete.

### Action tiers (NEW)

Pip spending determines combo quality, not action count. This applies to both initiator attacks and responder upgrades:

| Pip cost | Tier | What you get |
|----------|------|-------------|
| 0 (free) | Basic | Weak single swing. Chip damage. Responder-only — this is the free counter. |
| 1 | Standard | Solid multi-hit combo. Bread and butter damage. |
| 2 | Heavy | Powerful combo. More hits, higher damage, possible bonus effects. |
| 3 | Finisher | Full-budget devastation. Only possible if you enter the exchange with all 3 pips and dump everything into round 1. Leaves you completely empty. |

**Note:** The initiator always spends at least 1 pip per round (standard tier minimum). They do not get a free basic. The cost of initiative is paying to attack. The responder's advantage is free chip damage every round they're in the exchange — the natural tax on the initiator's aggression.

### RELENT (revised role)

RELENT is no longer just "end the exchange." It's a **tempo strategy.** The initiator can RELENT at the start of any round (before spending that round's pip). Reasons to RELENT:

- QTE went poorly last round — cut losses instead of paying another pip for bad damage.
- You've done enough damage — save remaining pips for faster ATB refill.
- Responder is about to die to chip damage anyway — no need to spend more.
- You entered the exchange with only 1-2 pips after formation spending — you've run your budget.

### Cost asymmetry — why it balances

The initiator/responder dynamic is inherently asymmetric and that's the point:

**Initiator advantages:**
- Chooses WHEN to engage (controls battlefield tempo).
- Chooses WHO to target.
- Chooses WHEN to leave (RELENT).
- Gets first strike every round.

**Responder advantages:**
- Free basic counter every round (chip damage at no cost).
- Every round the initiator stays = another free hit on them.
- Pip spending is optional — can save entire budget for their own formation turn.
- Didn't choose to be here, but isn't helpless.

**The longer the initiator stays, the more the responder benefits.** This is the core tension. Round 1 favors the initiator (first strike, they chose to be here). By round 3, the responder has landed 3 free counters and the initiator has spent 3 pips. Aggression has a built-in cost curve.

### Responder pip spending — when is it worth it?

The responder's decision every round: "Is upgrading my counter worth delaying my next formation turn?"

Worth it when:
- Initiator is low HP — spend a pip to finish them NOW instead of waiting for your own turn.
- You have a type advantage or buff that makes your counter extra effective this moment.
- The initiator is about to RELENT and this is your last chance to hit them in-cam.

Not worth it when:
- You're healthy and the initiator is wasting pips on bad QTE — let them burn resources while you chip for free.
- Your formation turn is more valuable (need to FLEE, need to ITEM, need to target someone else).
- You're saving pips for a heavy/finisher combo on YOUR initiative.

---

## Revision: §18 — Open Questions (updates)

### Resolved by this addendum

| Question | Old status | Resolution |
|----------|-----------|------------|
| Responder pip retention after exchange | TBD — playtest | **Resolved.** All unspent pips persist for everyone. No arbitrary pip loss. ATB refills from remaining count. |
| PASS action | TBD — playtest | **Removed.** PASS no longer exists. The responder always gets a free basic counter — there's no "yielding" because the exchange structure is fixed rounds, not alternating turns. |

### New open questions from this addendum

| Question | Status | Candidates |
|----------|--------|------------|
| Action tier stat scaling | TBD — design | How do tiers translate to beat arrays? 1 pip = 2 swings, 2 pip = 4 swings, 3 pip = 6? Or quality over quantity? |
| Responder free basic — how weak? | TBD — playtest | Needs to be worth animating but not so strong that initiating feels punished. Single swing, flat low damage ignoring attack stat? Percentage of normal damage? |
| Can responder spend 2+ pips in a single round? | TBD — design | Or is it capped at 1 pip upgrade per round? Allowing 2-3 creates blowout counter moments but might be too swingy. |
| Initiator multi-pip rounds | TBD — design | Can the initiator spend 2-3 pips in a single round for a heavy/finisher? Or strictly 1 pip per round across 3 rounds? |
| DEF/ITEM in-cam under new model | TBD — design | Does the responder still get DEF/ITEM as pip-spend options instead of counter-attacking? Or is the in-cam menu simplified to just "basic counter / upgraded counter"? |
| Defend buff stacking | TBD — playtest | Carried over — still unresolved. |

---

## Phase transition impact

The legal transition graph in §3 needs minor updates:

- `CAM_WAIT_ACTION` logic changes — initiator always has ATK or RELENT. Responder always counters (free or upgraded). No PASS state.
- `CAM_RESOLVE` → either next round's `CAM_WAIT_ACTION` (if rounds remain and initiator has pips) or `ACTION_CAM_OUT`.
- Exchange round counter (1-3) becomes part of cam exchange state.

---

## Constants impact

`battleConstants.js` changes when implemented:

- `PIP_COSTS.pass` — remove entirely.
- `IN_CAM_ACTIONS` — restructure. No PASS button. Responder menu becomes tier selection (basic free / spend to upgrade).
- Add `EXCHANGE.maxRounds: 3`.
- Add action tier definitions (pip cost → beat count / damage multiplier).
- ATB reset logic in `battleATB.js` changes from "reset to 0" to "reset to remaining pips."