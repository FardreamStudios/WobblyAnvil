# Special Skill System Spec

**Status:** 🔵 DRAFT  
**Extends:** `EngagementSystemSpec.md` §6 (Delayed Skills)  
**Date:** 2026-04-02

---

## 1. Overview

A special skill is a skill complex enough that it needs to script its own sequence — custom anim states, multi-phase QTEs, continuous damage, staged cameras, or anything that doesn't fit the standard "enter cam → QTE → playback → exit cam" loop.

The system is a **takeover protocol** — four signals and a bridge. The director remains the authority. The skill borrows control, does its work through the bridge, and hands control back. The director handles all cleanup and turn flow resumption.

**UE Analogy:** Gameplay Ability System. The GAS framework owns activation, cancellation, and the attribute interface. Each ability is its own class that scripts freely through that interface.

---

## 2. Takeover Protocol — Four Signals

| Signal | Direction | What Happens |
|--------|-----------|-------------|
| **ACTIVATE** | Director → Skill | Director calls `skill.activate(bridge)`. Skill receives the bridge handle and begins its sequence. Normal turn flow pauses. |
| **RESUME** | Skill → Director | Skill calls `bridge.release()`. Skill is done. Director resumes normal turn flow and handles all post-turn cleanup. |
| **ABORT** | Director → Skill | Director calls `skill.abort(reason)`. Reason is one of: `casterKO`, `waveEnd`, `flee`. Skill must stop immediately and clean up its own visual state (VFX, choreo, anim overrides). Director handles everything else — KO anims, turn flow, wave transitions. |
| **TICK** | Director → Skill | Director calls `skill.onTick(event, payload)` to forward relevant game events while the skill has control. Events include: `casterDamaged`, `targetKO`, `turnOrderAdvanced`. Skill decides how to react. |

### Ownership Rules

The director **always** owns:
- Turn order and turn advancement
- KO detection and KO anim/removal
- Wave end detection and wave transitions
- Action cam enter/exit lifecycle
- HP/AP mutation (skill requests via bridge, director executes)
- Post-turn cleanup (clear buffs, advance initiative, etc.)
- Resuming normal flow after RESUME or ABORT

The skill **temporarily** owns:
- What happens between ACTIVATE and RESUME/ABORT
- Its own internal sequencing (what order things happen, timing)
- Visual state it explicitly set (responsible for clearing on abort)

**The skill never directly mutates game state.** It requests through the bridge. The director validates and executes. This keeps all game rules enforced in one place.

---

## 3. Bridge API

The bridge is an object the director passes to the skill on ACTIVATE. It exposes controlled access to shared systems.

### Combat State

```
bridge.getTarget(targetId)              → combatant snapshot
bridge.isAlive(combatantId)             → bool
bridge.dealDamage(targetId, amount)     → applies damage, returns { newHP, isKO }
bridge.spawnDamageNumber(targetId, value, color)
bridge.setFlag(combatantId, flag, val)  → canDefend, canAct, chargingSkill, etc.
bridge.getFlag(combatantId, flag)       → read a flag back
bridge.bumpState()                      → trigger React re-render
```

### Turn Order

```
bridge.pushTurnBack(combatantId, slots) → reposition combatant in initiative
bridge.getCurrentTurnId()               → who the director thinks is acting
bridge.getNextTarget(side)              → next alive enemy (for retargeting)
```

### Action Cam

```
bridge.enterCam(attackerId, targetId, opts)  → opts: { slot: "ranged" | "melee" }
bridge.exitCam()
bridge.showSkillName(text)              → skill name banner
```

### Sprite & Anim

```
bridge.setSpriteKey(combatantId, key)   → swap spritesheet
bridge.setSpriteFrame(combatantId, f)   → manual frame control
bridge.setChoreo(combatantId, cls)      → apply CSS choreo class
bridge.clearChoreo(combatantId)         → remove choreo class
```

### QTE

```
bridge.runQTE(config)                   → returns Promise<result>
  // config: { type: "circle" | "sustain_tap", ...params }
  // result: { accuracy, succeeded, total, etc. }
```

### VFX

```
bridge.startVFX(id, opts)              → activate a named VFX (beam, glow, etc.)
bridge.stopVFX(id)                     → deactivate
```

### Lifecycle

```
bridge.release()                       → RESUME signal. Skill is done. Director takes over.
```

### Rules the Bridge Enforces

- `dealDamage` goes through the director's damage pipeline — defense buffs, intercept redirects, KO checks all still apply.
- `enterCam` / `exitCam` go through the director's cam lifecycle — the skill doesn't manage cam state directly.
- `setFlag` only accepts whitelisted flags. The skill can't set arbitrary state.
- If the skill calls bridge methods after ABORT has fired, they no-op silently.

---

## 4. Skill File Contract

Every special skill is a standalone JS file that exports a single object:

```js
// starfallBeam.js

var StarfallBeam = {
    id: "starfall_beam",
    name: "Starfall Beam",
    apCost: 40,
    skillType: "special",       // tells director to use takeover protocol
    delaySlots: 1,              // push caster back N slots on declare

    activate: function(bridge) {
        // Skill scripts its entire sequence here.
        // Calls bridge methods to interact with game systems.
        // Calls bridge.release() when done.
    },

    abort: function(reason) {
        // Clean up visual state only (VFX, choreo, anim overrides).
        // Director handles game state cleanup.
    },

    onTick: function(event, payload) {
        // React to game events while skill has control.
        // e.g., "targetKO" → retarget or end early.
    }
};
```

### What Goes in the Skill File

- The full scripted sequence (anim transitions, QTE calls, damage loops, timing)
- Internal state tracking (which step am I on, stored result values)
- Visual cleanup logic for abort
- Any constants unique to this skill (tick interval, damage values, QTE configs)

### What Does NOT Go in the Skill File

- Game state mutation (goes through bridge)
- KO handling (director's job — skill just reads `dealDamage` return)
- Turn order advancement (director handles after release)
- Cam lifecycle management (bridge wraps director's cam)
- Wave transition logic (director aborts the skill, not the other way around)
- HP/AP math (bridge.dealDamage handles it)

---

## 5. Director Integration

### Detection

When a player selects a skill during formation turn, the director checks `skill.skillType`:

- `"immediate"` → existing action cam flow (one trade)
- `"special"` → takeover protocol

### Activation Flow

1. Player selects special skill + target during formation turn
2. Director spends AP
3. Director sets combatant flags: `chargingSkill: { skillId, targetId }`, `canDefend: false`
4. Director repositions combatant in turn order (`skill.delaySlots` back)
5. Director ends the caster's turn — next in line goes
6. Normal turn flow continues. Charging combatant is visible but skipped for actions.
7. When turn order reaches the charging combatant's new position: director calls `skill.activate(bridge)`
8. Director pauses normal turn advancement. Skill has control.

### During Takeover

- Director still runs its normal tick loop (damage detection, KO checks, wave-end checks)
- If a KO or wave-end is detected that affects the active skill, director calls `skill.abort(reason)` then handles the consequence normally
- If the skill's caster takes damage, director calls `skill.onTick("casterDamaged", { damage, newHP })`
- If the skill's target dies, director calls `skill.onTick("targetKO", { targetId })`

### After Release

1. Skill calls `bridge.release()`
2. Director clears all caster flags (`chargingSkill: null`, `canDefend: true`)
3. Director exits action cam if still active
4. Director runs normal post-turn cleanup (clear buffs, check wave end)
5. Director advances to next combatant in turn order
6. Normal flow resumes

### After Abort

1. Director calls `skill.abort(reason)`
2. Skill clears its own visual state (VFX, choreo, sprite overrides)
3. Director clears all caster flags
4. Director exits action cam if still active
5. Director handles the abort reason:
    - `casterKO` → normal KO anim + removal
    - `waveEnd` → normal wave transition
    - `flee` → normal flee flow
6. Normal flow resumes

---

## 6. Shared Utilities (Reusable Tech)

These are systems that any special skill would need. Built as shared infrastructure, not Starfall-specific.

| Utility | What | Where | Status |
|---------|------|-------|--------|
| `playMode` on BattleSprite | `loop`, `loopFrom`, `once`, `reverse`, `manual` + `onComplete` callback | `BattleCharacter.js` | New |
| `chargingSkill` flag | Combatant property for active special skill state | `battleState.js` | New |
| `canDefend` flag | Combatant property — when false, all incoming attacks deal full damage | `battleState.js` | New |
| Ranged cam slot | Attacker position further back from center | `battleLayout.js` | New |
| Sustain QTE | Rapid tap sequence QTE component | New component or Chalkboard extension | New |
| `charge_shake` choreo | CSS keyframe for continuous vertical oscillation | `BattleView.css` | New |
| Bridge object builder | Factory that wires bridge methods to director internals | `battleDirector.js` | New |
| Takeover lifecycle | ACTIVATE/RESUME/ABORT/TICK signal handling in director turn loop | `battleDirector.js` | New |

---

## 7. Starfall Beam — First Implementation

Fairy's signature charged attack. 4-frame spritesheet.

### Skill Registration

```
id:           "starfall_beam"
name:         "Starfall Beam"
apCost:       40
skillType:    "special"
delaySlots:   1
counterAllowed: false   (ranged attack — no counter at any point)
```

### Sprite Config (battleConstants.js)

```
fairyCombatCharge: {
    sheet:     "/images/anim/battle/npc/waFairyChargeSS.png",
    frames:    4,
    cols:      4,
    fps:       6,
    playMode:  "manual",
    flipX:     true
}
```

### Sequence (inside activate function)

The `activate` function scripts this sequence using bridge calls. Each step below is a function call or awaited operation, not a config entry.

**Step 1 — Hold charge pose (already set by director on declare)**
- Confirm sprite is on charge sheet, frame 1
- Confirm `charge_shake` choreo is active
- Confirm charge glow VFX is active

**Step 2 — Validate target**
- `bridge.isAlive(targetId)` → if dead, `bridge.getNextTarget("enemy")` → retarget
- If no valid targets → `bridge.release()` (shouldn't happen — wave-end would abort first)

**Step 3 — Enter action cam**
- `bridge.enterCam(casterId, targetId, { slot: "ranged" })`
- `bridge.showSkillName("STARFALL BEAM")`
- Wait ~1200ms for name display

**Step 4 — Aim QTE**
- `var aimResult = await bridge.runQTE({ type: "circle", ...params })`
- Store `aimResult.accuracy` as damage multiplier

**Step 5 — Beam ignition**
- Play sprite frames 1→2→3 (switch to `playMode: "once"` starting from frame 1)
- On frame 3 reached: start beam VFX via `bridge.startVFX("beam_connect", { from: casterId, to: targetId })`

**Step 6 — Beam active + sustain QTEs**
- Switch sprite to `loopFrom: 2` (loops frames 2→3 — sustained beam visual)
- Start damage tick loop: `bridge.dealDamage(targetId, 1 * multiplier)` every ~120ms
- Run sustain QTE round 1: `await bridge.runQTE({ type: "sustain_tap", count: 5, intervalMs: 280, failEnds: true })`
- If failed → skip to Step 7
- If all 5 succeed → run gate QTE: `await bridge.runQTE({ type: "circle", ...gateParams })`
    - If failed → skip to Step 7
    - If succeed → run sustain QTE round 2: `await bridge.runQTE({ type: "sustain_tap", count: 10, intervalMs: 240, failEnds: true })`
- (Any failure at any point falls through to Step 7)

**Step 7 — Beam wind-down**
- Stop damage tick loop
- `bridge.stopVFX("beam_connect")`
- Play sprite in reverse: current frame → frame 0 (`playMode: "reverse"`, fast ~200ms)
- `bridge.clearChoreo(casterId)` — remove charge shake
- Wait for reverse anim complete
- `bridge.setSpriteKey(casterId, "fairyCombatIdle")` — back to idle

**Step 8 — Release**
- `bridge.release()` — director takes over, exits cam, cleans up flags, resumes turn flow

### Abort Cleanup (inside abort function)

- Stop any active damage tick timer
- `bridge.stopVFX("beam_connect")` if active
- `bridge.clearChoreo(casterId)`
- `bridge.setSpriteKey(casterId, "fairyCombatIdle")`
- (Director handles everything else — cam exit, flag clearing, KO/wave flow)

---

## 8. What This Doesn't Cover

- **Beam VFX art direction** — visual style of the beam connector
- **Sound design** — charge SFX, beam loop SFX, sustain tap feedback
- **Damage tuning** — aim multiplier scaling, total expected damage vs regular skills
- **AP cost tuning** — relative to other fairy skills
- **Turn order edge cases** — fairy is last in order when she declares (wraps to front of next round)
- **Multi-charge stacking** — can two party members charge simultaneously? (Probably yes — each has their own `chargingSkill` flag and their own skill file instance)
- **Enemy special skills** — same protocol works for enemies. Director calls `skill.activate(bridge)` regardless of faction. Enemy special skills just don't have player QTEs — they script AI timing instead.

---

## 9. Build Order

1. **`playMode` system on BattleSprite** — standalone, no dependencies, unlocks anim control for all skills
2. **`chargingSkill` + `canDefend` flags** on combatant state
3. **`charge_shake` CSS** — visual only, testable in isolation
4. **Bridge object builder** — wire bridge methods to director internals
5. **Takeover lifecycle in director** — ACTIVATE/RESUME/ABORT/TICK signals, pause/resume turn flow
6. **`starfallBeam.js` skeleton** — declare + charge hold (formation-side only, no cam yet)
7. **Ranged cam slot** in layout
8. **Cam enter + aim QTE** — reuses existing circle gesture
9. **Beam VFX component**
10. **Sustain QTE component**
11. **Full beam sequence** — damage ticks + sustain rounds + wind-down
12. **Polish** — timing, juice, sound, tuning