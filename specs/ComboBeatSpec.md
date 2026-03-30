# Combo Beat System — Spec

**Parent:** `ScavengeBattleSpecs.md`, `BattleChoreographySpec.md`  
**Status:** 🔵 PLANNED  
**Depends on:** DES-2 QTE Runner (✅ done), CircleTimingQTE plugin (✅ done), Per-ring callback (✅ done)

---

## Overview

Every attack in battle is a **combo** — a sequence of beats, each with its own damage, visual choreography, and timing. The QTE ring sequence maps 1:1 to the beat array. Each ring IS a beat. Each beat IS an attack.

The system unifies offensive and defensive QTEs under one data structure. A skill definition describes everything: how many hits, how fast, what each hit looks like, how much each hit is worth, and what input the defender needs to survive each one.

---

## Core Concept: One Ring = One Beat = One Attack

```
Skill: "triple_slash"
  Beat 0: Quick horizontal cut    → ring shrinks fast  → 8 dmg
  Beat 1: Backhand sweep           → ring shrinks fast  → 8 dmg  
  Beat 2: Overhead slam            → ring shrinks slow  → 20 dmg (finisher)
```

If the player is attacking and misses beat 2, they lose the 20 dmg finisher — it plays as a weak whiff instead. The first two hits still landed. Damage is per-beat, not pooled.

If the player is defending and fails to dodge the overhead slam, they eat 20 dmg. The other two might have been blocked for reduced damage.

---

## Skill Definition

```js
var SKILL = {
    id:          "triple_slash",
    name:        "Triple Slash",

    // --- QTE ring config (passed to CircleTimingQTE) ---
    rings:              3,
    speeds:             [1.2, 1.2, 0.7],
    delays:             [0, 300, 600],
    shrinkDurationMs:   800,
    zoneBonus:          0.15,
    targetRadius:       36,
    ringStartRadius:    130,

    // --- Per-beat choreography + damage ---
    beats: [
        {
            damage:     8,
            atkAnim:    "strike",       // attacker visual on this beat
            tgtReact:   "hit",          // target visual if beat lands
            shake:      "light",        // screen shake if beat lands
            sfx:        "hit",          // SFX key if beat lands
            blockable:  true,           // can be blocked (tap)
            dodgeable:  true,           // can be dodged (swipe)
        },
        {
            damage:     8,
            atkAnim:    "strike",
            tgtReact:   "hit",
            shake:      "light",
            sfx:        "hit",
            blockable:  true,
            dodgeable:  true,
        },
        {
            damage:     20,
            atkAnim:    "strike",
            tgtReact:   "hit",
            shake:      "heavy",
            sfx:        "impact",
            blockable:  true,
            dodgeable:  true,
            finisher:   true,           // visual emphasis flag (optional)
        },
    ],
};
```

### Beat Fields

| Field | Type | Description |
|-------|------|-------------|
| `damage` | number | Base damage this beat deals if it lands |
| `atkAnim` | string | Attacker anim state for this beat (`"strike"`, `"wind_up"`, custom) |
| `tgtReact` | string | Target reaction if beat lands (`"hit"`, `"flinch"`, `"ko"`) |
| `shake` | string or null | Screen shake level (`"light"`, `"medium"`, `"heavy"`, `"ko"`, `null`) |
| `sfx` | string | SFX key to play (`"hit"`, `"impact"`, `"block"`) |
| `blockable` | boolean | Can be blocked via tap. Default `true` |
| `dodgeable` | boolean | Can be dodged via swipe. Default `true` |
| `unblockable` | boolean | Cannot be blocked — MUST dodge. Tap = guaranteed hit. Default `false` |
| `blockMult` | number | Damage multiplier when blocked. Default `0.3`. Overridden by defender stats/gear. |
| `finisher` | boolean | Visual emphasis — bigger lunge, camera flash, etc. Optional |

### Unblockable Beats

```js
{
    damage:      35,
    atkAnim:     "strike",
    tgtReact:    "hit",
    shake:       "ko",
    sfx:         "impact",
    blockable:   false,         // tap does NOT work
    dodgeable:   true,          // MUST swipe
    unblockable: true,          // visual tell flag
}
```

When an unblockable ring appears, a distinct visual tell shows (red ring, "!" flash, different ring color). Player MUST swipe. Tapping on an unblockable beat = guaranteed hit, full damage.

---

## Defensive Input: Tap vs Swipe

The player reads each incoming beat and chooses:

| Input | Action | On Success | On Fail |
|-------|--------|------------|---------|
| **Tap** | Brace/block | Reduced damage (×0.3), brace anim, block SFX | — |
| **Swipe** | Dodge/sidestep | Zero damage, fast shift-out + shift-back anim | — |
| **Nothing** | Fail | Full damage, hit anim, knockback | — |
| **Tap on unblockable** | Fail | Full damage — brace doesn't work against this | — |

### Swipe Detection

**Concern:** Mobile browsers use swipe for navigation (back/forward, scroll). Need to be careful.

**Solution:**
- Swipe detection ONLY active during `DEFENSE_QTE` phase
- Only inside the QTE zone element (not full screen)
- `touch-action: none` on the QTE zone during defense
- Minimum swipe distance: ~30px (prevents accidental triggers)
- Any direction counts (left, right, up, down)
- `preventDefault` on `touchmove` within the QTE zone during defense

**Implementation:**
- Track `touchstart` position
- On `touchmove`, if distance > threshold → register as swipe
- Once swiped for a ring, consume it (no double-trigger)
- Tap = `touchstart` + `touchend` with minimal movement (< 15px)

### Player Choice Per Beat

The player decides tap or swipe per beat based on reading the attack:

- **Normal beat** (blockable + dodgeable): Either works. Tap is safer timing-wise (just hit the ring). Swipe avoids all damage but requires reading the dodge window.
- **Unblockable beat**: Visual tell warns player. Must swipe. Tap = full damage.
- **Future: undodgeable beat**: Must block. Can't sidestep. (Not in V1 but the data supports it.)

---

## Offensive QTE — Player Attacking

Each beat = one hit in the player's combo. Per-beat damage.

| Ring Result | What Happens |
|-------------|-------------|
| **Hit** | Full beat plays: attacker anim + target reaction + beat damage + shake + SFX |
| **Miss** | Weak whiff: attacker lunges but no impact. Zero damage for this beat. Visually weaker (shorter lunge, no target reaction, no shake) |

Enemies do NOT block or dodge player attacks (V1). Every landed ring = full beat damage.

**Future:** Boss enemies could have dodge/block on specific beats — the data structure supports it already via `blockable`/`dodgeable` on the beat, just from the enemy's perspective.

### Failed Beat Visual (Offensive)

A missed offensive beat shouldn't look like nothing happened. The attacker still moves — just weakly:

- Shorter lunge (half distance)
- No target reaction
- No shake
- No SFX (or a quiet "whiff" sound)
- Attacker returns to wind-up slightly slower (sells the miss)

---

## Defensive QTE — Player Defending

Each beat = one incoming enemy attack. Enemy ALWAYS lands their anim (they don't miss). The question is whether the player mitigates it.

| Ring Result | Input | What Happens |
|-------------|-------|-------------|
| **Hit** | Tap | Brace: party squats, reduced damage (×0.3), block SFX |
| **Hit** | Swipe | Dodge: party shifts out + back, zero damage |
| **Hit (tap on unblockable)** | Tap | FAIL: full damage, treated as miss |
| **Miss** | — | Full hit: enemy strike lands, full damage, hit anim + knockback + shake |

The enemy's attack anim plays regardless — strike, lunge, slam, whatever the beat defines. The player's reaction determines the outcome.

---

## Example Skills

### Player Skills

```js
PLAYER_SKILLS = {
    basic_attack: {
        id: "basic_attack",
        name: "Slash",
        rings: 3,
        speeds: [1.0, 1.0, 1.0],
        delays: [0, 400, 400],
        shrinkDurationMs: 800,
        zoneBonus: 0.15,
        targetRadius: 36,
        ringStartRadius: 130,
        label: "ATTACK!",
        beats: [
            { damage: 8,  atkAnim: "strike", tgtReact: "hit", shake: "light", sfx: "hit" },
            { damage: 8,  atkAnim: "strike", tgtReact: "hit", shake: "light", sfx: "hit" },
            { damage: 12, atkAnim: "strike", tgtReact: "hit", shake: "medium", sfx: "impact" },
        ],
    },

    power_strike: {
        id: "power_strike",
        name: "Forge Blow",
        rings: 4,
        speeds: [0.8, 1.0, 1.0, 0.6],
        delays: [0, 500, 400, 800],
        shrinkDurationMs: 800,
        zoneBonus: 0.10,
        targetRadius: 36,
        ringStartRadius: 130,
        label: "FORGE BLOW!",
        beats: [
            { damage: 5,  atkAnim: "strike", tgtReact: "flinch", shake: null,    sfx: "hit" },
            { damage: 5,  atkAnim: "strike", tgtReact: "flinch", shake: null,    sfx: "hit" },
            { damage: 5,  atkAnim: "strike", tgtReact: "hit",    shake: "light", sfx: "hit" },
            { damage: 25, atkAnim: "strike", tgtReact: "hit",    shake: "heavy", sfx: "impact", finisher: true },
        ],
    },
};
```

### Enemy Skills

```js
ENEMY_SKILLS = {
    rat_bite: {
        id: "rat_bite",
        name: "Bite",
        rings: 2,
        speeds: [1.0, 1.2],
        delays: [0, 300],
        shrinkDurationMs: 800,
        zoneBonus: 0.15,
        targetRadius: 36,
        ringStartRadius: 130,
        label: "DEFEND!",
        beats: [
            { damage: 5, atkAnim: "strike", tgtReact: "hit", shake: "light", sfx: "hit",
              blockable: true, dodgeable: true },
            { damage: 8, atkAnim: "strike", tgtReact: "hit", shake: "medium", sfx: "hit",
              blockable: true, dodgeable: true },
        ],
    },

    trash_golem_slam: {
        id: "trash_golem_slam",
        name: "Trash Slam",
        rings: 5,
        speeds: [0.8, 1.0, 1.2, 0.5, 2.0],
        delays: [0, 300, 300, 1500, 100],
        shrinkDurationMs: 800,
        zoneBonus: 0.10,
        targetRadius: 36,
        ringStartRadius: 130,
        label: "INCOMING!",
        beats: [
            { damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
              blockable: true, dodgeable: true },
            { damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
              blockable: true, dodgeable: true },
            { damage: 8,  atkAnim: "strike", tgtReact: "hit",    shake: "medium", sfx: "hit",
              blockable: true, dodgeable: true },
            { damage: 0,  atkAnim: "wind_up", tgtReact: null,    shake: null,     sfx: null,
              blockable: true, dodgeable: true },
            { damage: 30, atkAnim: "strike", tgtReact: "hit",    shake: "ko",     sfx: "impact",
              blockable: false, dodgeable: true, unblockable: true, finisher: true },
        ],
    },
};
```

The trash golem slam tells a story: three quick hits, a long wind-up pause (ring 4 at 0.5 speed with 1500ms delay — you see it coming), then a lightning-fast unblockable slam you MUST dodge.

---

## Visual Tells

Players need to read what's coming. Visual cues per beat:

| Beat Property | Visual Tell |
|---------------|------------|
| Normal | Default ring color (blue/gold) |
| `unblockable: true` | Red ring + "!" icon at center + distinct ring glow |
| `finisher: true` | Larger ring start radius, brighter stroke, slight pulse |
| `damage` high vs low | Could scale ring thickness or add inner glow (future polish) |

---

## Data Flow

```
1. Sequencer picks a skill (from combatant's skill list)
2. Skill config feeds into CircleTimingQTE as ring config
3. Skill's beats array is stored in qteContextRef
4. Each onRingResult(index, hit) reads beats[index]
5. Beat choreography plays based on hit/miss + beat definition
6. onComplete fires → summary damage number + advance phase
```

### What Changes in Existing Code

| File | Change |
|------|--------|
| `circleTimingQTE.js` | Add swipe detection alongside tap. Report input type in `onRingResult(index, hit, inputType)`. Add per-ring visual config (ring color, unblockable indicator). |
| `QTERunner.js` | No change — already generic |
| `BattleView.js` | `handleQTERingResult` reads `beats[index]` from context. `resolveAttack`/`resolveDefense` become thin summary functions (damage number only, no choreography). Skill configs replace `QTE_ATTACK_CONFIG`/`QTE_DEFENSE_CONFIG`. |
| `battleConstants.js` | Add skill definitions (player + enemy). Add to combatant data. |
| `BattleView.css` | Add dodge/shift anim class. Unblockable ring styling (future — lives in QTE component). |

### New Anim State: Dodge

```css
.normal-cam-char__choreo--dodge {
    transform: translateX(calc(5vw * var(--choreo-dir, 1)));
    transition: transform 0.08s ease-out;
}
```

Fast shift away from enemy, then return. Quicker than knockback — sells the "I chose to move" vs "I got hit."

---

## CircleTimingQTE Changes for Swipe

### Input Detection

```
During defense QTE:
  - touchstart → record position
  - touchmove → if distance > 30px from start → SWIPE (consume ring)
  - touchend → if distance < 15px → TAP (consume ring)
  - click (desktop) → TAP
```

### onRingResult Signature Change

```
// Before:
onRingResult(index, hit)

// After:
onRingResult(index, hit, inputType)
//   inputType: "tap" | "swipe" | "auto_miss"
```

The host (BattleView) decides what tap vs swipe means for each beat. The QTE plugin just reports what happened.

### Per-Ring Visual Config (Future)

The QTE plugin could accept per-ring styling overrides:

```js
ringStyles: [
    null,                           // default ring
    null,                           // default ring  
    { color: "#ef4444", icon: "!" } // unblockable — red ring
]
```

Not required for V1 — can start with uniform rings and add visual tells later.

---

## Resolve Flow (Updated)

### Offensive (Player Attacking)

```
Per ring hit:
  → play beats[index] choreography (strike + target react + shake + SFX)
  → accumulate beat.damage into totalDamage

Per ring miss:
  → play whiff (weak lunge, no target react)
  → accumulate 0

On complete:
  → spawn single summary damage number (totalDamage)
  → advance to telegraph/defense
```

No separate "haymaker" resolve. The beats ARE the attack. If the skill has a finisher beat and the player lands it, that IS the big moment.

### Defensive (Player Defending)

```
Per ring:
  → enemy ALWAYS plays beats[index].atkAnim (they don't miss)

  If player taps in window:
    → if beat.blockable: brace anim, accumulate damage × 0.3
    → if beat.unblockable: fail — full damage, hit anim

  If player swipes in window:
    → if beat.dodgeable: dodge anim, accumulate 0
    → if beat not dodgeable (future): fail — full damage

  If player misses:
    → full damage, hit anim + knockback

On complete:
  → spawn single summary damage number (totalDamage)
  → advance to cam out
```

---

## Implementation Order

| Step | What | Risk |
|------|------|------|
| 1 | Write skill definitions in `battleConstants.js` | LOW |
| 2 | Update `handleQTERingResult` to read beats from context | LOW |
| 3 | Strip big-hit from `resolveAttack`/`resolveDefense`, replace with summary damage number | LOW |
| 4 | Add swipe detection to `circleTimingQTE.js` | MEDIUM |
| 5 | Update `onRingResult` signature to include `inputType` | LOW |
| 6 | Wire tap vs swipe defense logic into `handleQTERingResult` | MEDIUM |
| 7 | Add dodge CSS class | LOW |
| 8 | Unblockable visual tells in QTE | LOW (polish) |

Steps 1-3 can ship first — beats-driven choreography with tap-only. Steps 4-8 add swipe.

---

## Resolved Questions

1. **Block damage reduction** — Per-beat `blockMult` parameter, default `0.3`. Driven by effects/armor/defense stats. A high-defense character might have `blockMult: 0.15` on all beats. A boss's unblockable finisher has no blockMult (can't block it). This lets gear/buffs modify blocking effectiveness naturally.

2. **Dodge/swipe timing** — Same window as tap. Consistency first. Future possibility: i-frames during dodge animation where overlapping beats can't hit you (reward skilled dodging of multi-hit combos).

3. **Enemy dodge/brace** — Enemies can brace and dodge just like the player. Same anim states, same data structure. Boss "huddle up" = pre-fight state that buffs their defensive beats (lower blockMult, dodgeable on more beats). Creates readable strategic moments — you see the boss brace, you know your attacks will be harder to land. Offensive beats on enemies gain `blockable`/`dodgeable` fields, same as defensive beats for players.

4. **Combo counter UI** — Yes. "HIT 1!" "HIT 2!" "HIT 3!" counter during combos. Builds hype, gives feedback. Resets on miss. Perfect combo (all hits) gets a bonus flash/SFX. Implementation: small counter element in QTE zone, increments per successful ring.

---
---

# ATB & Action Economy — Design Notes

**Status:** 🟣 DISCUSSION — Jam on this next session. Not implemented yet.

This section redefines how ATB, turn order, action cam entry/exit, and the back-and-forth exchange work. The combo beat system (above) defines what happens INSIDE an attack. This section defines WHEN and WHY attacks happen, who gets to act, and how the action cam round plays out.

---

## ATB as Initiative Pips

ATB is not a smooth bar. It's a **pip system** driven by a speed stat.

- Each combatant has a **speed** stat (e.g. 3). That gives them 3 ATB pips.
- Outside action cam, pips fill over time (like segments of a segmented bar).
- When all pips are full, that combatant's turn starts. ATB freezes globally.
- The combatant spends pips on actions. Different actions cost different amounts.

### Pip Costs

| Action | Pip Cost | Notes |
|--------|----------|-------|
| Basic attack | 1 | Enters action cam |
| Special/heavy skill | 2 | Enters action cam, bigger combo |
| Use item (potion, etc.) | 1 | NO action cam — instant, stays in formation view |
| Defend (stance) | 1 | NO action cam — grants defense bonus for next incoming exchange |
| Ranged attack | 1 | Enters action cam but NO counter-play (no defense QTE for target) |

### Spending Multiple Pips Per Turn

A combatant with 3 full pips doesn't have to spend them all on one action. They can **chain actions** within their turn:

```
Example: Smith has 3 pips full
  → Use healing potion (1 pip, instant, no cam)
  → Attack enemy (1 pip, enters action cam)
  → 1 pip remaining — can still act after exchange resolves
```

The turn doesn't end until the combatant **relents** (chooses to end turn) or **runs out of pips**. This creates tactical depth — do you blow all 3 pips on attacks, or save one for a defensive item?

### ATB Freeze Rules

- **During action select:** ATB frozen globally (player is choosing)
- **During action cam:** ATB frozen globally (exchange playing out)
- **Non-cam actions (item, defend):** ATB stays frozen for the acting combatant, other combatants' ATB can keep ticking (TBD — could also freeze globally for simplicity)

---

## Rows: Front and Back

Combatants are arranged in rows. This affects targeting and action cam grouping.

- **Front row:** Melee range. Can attack and be attacked by melee.
- **Back row:** Ranged only. Melee attacks can't reach unless front row is empty.

### Action Cam Row Pull

When a combatant attacks:
- **Attacker's entire row** gets pulled into the action cam (they're nearby, they're involved)
- **Target's entire row** gets pulled into the action cam
- AoE attacks hit the entire target row

This means the action cam can have multiple characters on each side, not just 1v1. The active attacker and target are the focus, but their row-mates are visible and can be hit by AoE.

---

## Action Cam as Exchange Round

The action cam is NOT a scripted cutscene anymore. It's a **back-and-forth round** where both sides spend pips.

### Flow

```
1. ATTACKER initiates (spends pip on attack skill)
2. Action cam opens — attacker's row vs target's row slide in
3. Brief pause for player orientation (camera settle)
4. Attack combo plays (offensive QTE for attacker / defensive QTE for target)
5. After attack resolves:
   → DEFENDER gets to react IF they have pips remaining
   → Defender can: attack back (spend pip), use item (spend pip), or pass
   → If defender attacks: defensive QTE flips — now original attacker defends
6. After defender's action resolves:
   → ATTACKER can spend another pip if they have one, or relent
   → If attacker acts again: another exchange beat
7. Repeat until:
   → Attacker RELENTS (chooses to end, only on attacker's initiative)
   → Attacker runs out of pips
   → Both sides out of pips
8. Action cam closes → back to formation view → ATB resumes
```

### Key Rules

- **If attacker spends a pip, defender ALWAYS gets to respond with a pip** (if they have one). You can't just dump 3 attacks without giving the other side a chance to react.
- **Relenting can only happen on attacker initiative.** The attacker chooses "done" instead of spending another pip. This prevents the attacker from cutting off the defender mid-response.
- **Defender's response can be ANY action** — attack back, use item, defend stance. Not just "block."
- **If defender has no pips, they can't respond.** Attacker gets free actions until they run out or relent.

### Example Exchange

```
Smith (3 pips) attacks Rat King (2 pips):

Round 1:
  Smith spends 1 pip → "Slash" (3-beat combo, offensive QTE)
  Rat King defends (defensive QTE, no pip cost to defend)
  Rat King spends 1 pip → "Bite" (2-beat counter, Rat King attacks)
  Smith defends (defensive QTE)

Round 2:
  Smith spends 1 pip → "Slash" again
  Rat King defends
  Rat King spends 1 pip → "Tail Whip" (different skill this time)
  Smith defends

Round 3:
  Smith has 1 pip left. Relents (saves it for later? or spends it)
  Action cam closes.
```

### Defending Is Free, Attacking Costs Pips

When you're the DEFENDER in an exchange, the defensive QTE (tap/swipe to block/dodge) does NOT cost a pip. That's your free reaction. What costs a pip is choosing to COUNTER-ATTACK after defending.

---

## Ranged Attacks

Ranged attacks enter the action cam but the target gets **no defensive QTE**. The attack just lands (offensive QTE for attacker, target takes the hits based on attacker's accuracy).

- No counter-play by default
- Target's row still gets pulled in visually
- Special bosses could have "ranged counter-play" as a unique ability

---

## Defend Stance

Spending a pip on "Defend" outside of action cam grants a **defense buff** for the next incoming exchange:

- Better `blockMult` on all defensive beats
- Maybe bonus: first beat auto-blocked
- Visual: character enters brace pose in formation view, glows blue
- Buff consumed when the character next defends in action cam

---

## AoE Attacks

Some skills are AoE — they hit the **entire target row**.

- Offensive QTE plays as normal (attacker does their combo)
- Damage applies to all row members
- On defense: player's swipe/tap applies to ALL their characters in the row
    - Different characters may have different defense stats → same input, different damage results
    - Visual: all party members in the row brace/dodge together

---

## Turn Order Display

With pips instead of a smooth bar, turn order becomes more readable:

- Show pip segments for each combatant
- Filled pips = ready to spend
- Filling pip = currently charging
- Could show predicted turn order (who fills next)

---

## Summary: What This Changes

| System | Before | After |
|--------|--------|-------|
| ATB bar | Smooth 0-100% fill | Segmented pips (speed stat = pip count) |
| Turn start | ATB hits 100% | All pips filled |
| Action cost | Entire turn consumed | Per-pip cost, can chain actions |
| Action cam | Scripted: attack → counter → done | Back-and-forth: spend pips, respond, repeat |
| Action cam exit | Fixed after one exchange | Attacker relents or out of pips |
| Targeting | 1v1 | Row-based, AoE hits row |
| Camera scope | 2 combatants | Attacker's row vs target's row |
| Defend | Automatic in QTE | Free reaction + optional stance (pip cost pre-fight) |
| Ranged | Same as melee | No counter-play, no defensive QTE |
| Counter-attack | Always happens | Costs defender a pip, optional |

---

## Next Session TODO

- Jam on edge cases (what if both sides have 5 pips? Timeout? Max rounds?)
- Decide pip fill rate formula (speed stat → fill time)
- Sketch the action select UI for pip-spending (current 2×2 grid needs rework for in-cam decisions)
- Discuss how rows display in formation view and action cam
- How does the action select work INSIDE action cam for the defender's response?
- Wire basic pip ATB into prototype (replace smooth bar)