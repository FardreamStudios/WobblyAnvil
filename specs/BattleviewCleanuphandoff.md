# Handoff: BattleView Action Flow Cleanup

**Date:** 2026-03-31
**Status:** READY TO START
**Risk:** MEDIUM
**Prereq:** Upload `BattleView.js` and `battleState.js` at session start

---

## Context

BattleView has no unified "end turn" concept. Every action (attack, defend, item, flee, pass, relent) handles its own pip deduction, side-swapping, and ATB resumption independently. This causes drift between code paths and makes adding new actions error-prone. Adventure mode will add new action types (field forge, extraction, etc.) — this needs fixing first.

---

## Completed (This Session)

- Full audit of BattleView data scatter
- Mapped all 6 identity variables, 4+ turn-ending paths, 4 swap-sides duplications
- Identified 7 refs acting as shadow state
- Designed target architecture (exchange object, endAction gate, swapSides consolidation)
- Adventure mode spec written and approved (AdventureModeSpec.md)
- Adventure mode action plan written (AdventureModeActionPlan.md)

---

## Next Task: Three-Part Cleanup (Do In Order)

### Part 1 — Gate Functions (LOW risk, highest value)

Extract three functions that every action funnels through:

**`deductPip(combatantId)`** — already exists as a helper but attack and flee have their own inline versions. Kill the inline versions, use the helper everywhere.

**`endAction(combatantId, context)`** — new function. Called after every action resolves. Handles:
- If `context === "in-cam"`: try `swapSides()`, fall back to `camOut()`
- If `context === "formation"`: check remaining pips, if 0 call `endFormationTurn()`, else stay in ACTION_SELECT

**`endFormationTurn()`** — new function. Clears `turnOwnerId`, sets phase to `ATB_RUNNING`, sets `atbRunning` to true. Currently this 3-line pattern is copy-pasted in item use, defend, and flee-fail.

**Where to wire:**
- `handleItemUse` (formation branch) → replace inline pip check + ATB resume with `endAction(userId, "formation")`
- `handleItemUse` (in-cam branch) → replace inline swap + camOut with `endAction(userId, "in-cam")`
- Defend (formation) → `endAction(userId, "formation")`
- Defend (in-cam) → `endAction(userId, "in-cam")`
- Flee (fail path) → `endFormationTurn()`
- `advanceOrCamOut` after attack → already calls `camOut`, just verify it matches the gate pattern

### Part 2 — swapSides() Consolidation (LOW risk)

Extract one `swapSides()` function:

```
function swapSides() {
    var cam = camExchangeRef.current;
    var nextSwinger = cam.currentReceiverId;
    var nextReceiver = cam.currentSwingerId;
    cam.currentSwingerId = nextSwinger;
    cam.currentReceiverId = nextReceiver;

    var nextState = bState.get(nextSwinger);
    if (nextState && nextState.ko) { camOut(); return; }

    var nextPips = atbValuesRef.current[nextSwinger];
    if (!nextPips || nextPips.filledPips <= 0) { camOut(); return; }

    setSwapTrigger(function(v) { return v + 1; });
    setPhase(PHASES.CAM_WAIT_ACTION);
}
```

Replace duplicated swap logic in:
- `advanceOrCamOut` (after attack)
- `handleItemUse` (in-cam branch)
- `handleCamPass`
- Defend (in-cam)

### Part 3 — Exchange Object (MEDIUM risk, do after Parts 1-2)

Replace scattered identity tracking with one exchange state object. This is the bigger refactor — scope it after Parts 1-2 land and the dust settles. Key change: `camExchangeRef` already exists as the closest thing to this. Promote it to a richer object with helper methods instead of raw field access.

Target shape:
```
{
    initiator: { id, ... },
    responder: { id, ... },
    swinger: "initiator" | "responder",
    round: number,
    skill: current skill object,
    getCurrentSwinger() → combatant,
    getCurrentReceiver() → combatant,
    swap() → flips swinger,
}
```

This replaces: `attackerId` (partially), `turnOwnerId` (in-cam), `camExchangeRef.currentSwingerId`, `camExchangeRef.currentReceiverId`, `qteContextRef.swingerId`.

---

## Files Involved

| File | Parts affected |
|------|---------------|
| `BattleView.js` | All three parts — this is where the scattered logic lives |
| `battleState.js` | Part 3 only — if exchange object reads combatant data |

No other files touched. Battle system stays self-contained.

---

## Verification

After each part, test these flows:
- Player attack → QTE → damage → swap → enemy auto-swing → cam out → ATB resumes
- Player defend (formation) → pip deducted → if 0 pips, turn ends
- Player defend (in-cam) → pip deducted → sides swap → continue or cam out
- Player item (formation) → effect applied → pip deducted → turn check
- Player item (in-cam) → effect applied → pip deducted → sides swap
- Player flee (fail) → pips drained → ATB resumes
- Player flee (success) → battle ends
- Enemy KO mid-exchange → cam out → wave check
- Party KO → battle ends with KO result
- Wave transition → new enemies → ATB fresh → correct targeting