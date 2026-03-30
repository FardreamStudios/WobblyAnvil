# Scavenge Battle System — Feature Spec

**Codename:** Dumpster Diving RPG
**Status:** 🟡 IN PROGRESS
**Dependencies:** DES-2 QTE System (plugin contract)
**Terminology:** See `BattleTerminology.md`
**Tone:** Opt-in, comedic, absurd. You are a blacksmith beating up sentient garbage for profit.

---

## Table of Contents

1. Overview & Portability
2. Battle Config & Result
3. Phases & Transitions
4. ATB & Pip Economy
5. Formation Turn
6. Action Cam & Exchanges
7. Combo Beat System
8. Defensive Input (Tap / Swipe)
9. Choreography
10. Enemy System
11. HP, KO & Items
12. Layout
13. Fairy Integration
14. Loot & Results Screen
15. Architecture & Ownership
16. Implementation Status
17. V1 / V2 / V3 Roadmap
18. Open Questions

---

## 1. Overview & Portability

The battle system is a standalone, portable game mode. Config in, result out. It never reads or writes host game state. It is a black box.

The host maps its domain (smith stats, inventory, economy) into the battle config before entry and applies the result's deltas after exit. Could ship as its own game with a different host wrapper.

**Rules:**
- Battle imports nothing from the host. No `constants.js`, no `eventTags.js`, no `GameplayEventBus`.
- Internal communication is React state + callbacks. No bus, no singletons.
- If a battle-internal bus is ever needed, it's a separate instance created on battle start and destroyed on battle end.
- Observer callback (`onBattleEvent`) is fire-and-forget. Battle never waits for or reads a response.

---

## 2. Battle Config & Result

### Config (Input)

The host provides everything the battle needs. Fields organized into sections:

**Party:** Array of combatant objects — id, name, sprite, maxHP, currentHP, atbSpeed, attackPower, defensePower, qteZoneBonus, actions array, items array. Future: `aiControlled` flag + `onActionNeeded` callback for fairy/AI party members.

**Encounter:** Zone info (id, name, background, music). Waves array — each wave has an enemies array. Each enemy has stats, attack pattern, death anim, loot table with drop chances, and dialogue strings.

**Settings:** Handedness (left/right action menu placement).

**Observer:** Optional `onBattleEvent` callback for external listeners (fairy, analytics).

### Result (Output)

Battle returns deltas only. Host decides what to do with them.

**Fields:** Outcome (victory/fled/ko). Loot array (item id + qty). Party deltas (HP lost, items used per member). Stats summary (waves completed, damage dealt/taken, QTE accuracy, enemies defeated, boss status, flee wave).

**Host responsibility:** Apply loot to inventory via bus, subtract used items, apply stamina/time costs, handle KO state. Mapping is one-way — battle never calls back into host during combat.

---

## 3. Phases & Transitions

### Phase List

Implemented: `ATB_RUNNING`, `ACTION_SELECT`, `ACTION_CAM_IN`, `CAM_TURN_START`, `CAM_WAIT_ACTION`, `CAM_TELEGRAPH`, `CAM_SWING`, `CAM_RESOLVE`, `ACTION_CAM_OUT`.

Future: `INTRO`, `WAVE_TRANSITION`, `FLEE_ATTEMPT`, `RESULTS`, `EXIT`.

### Legal Transitions

```
INTRO             → ATB_RUNNING
ATB_RUNNING       → ACTION_SELECT | ENEMY_TELEGRAPH
ACTION_SELECT     → ACTION_CAM_IN | RESOLVING (instant) | ATB_RUNNING (cancel) | FLEE_ATTEMPT
FLEE_ATTEMPT      → EXIT (success) | ACTION_CAM_OUT (fail)
ACTION_CAM_IN     → CAM_WAIT_ACTION
CAM_WAIT_ACTION   → CAM_SWING (ATK chosen) | ACTION_CAM_OUT (RELENT / no pips)
CAM_SWING         → CAM_RESOLVE
CAM_RESOLVE       → CAM_WAIT_ACTION (swap sides) | ACTION_CAM_OUT (exchange done)
ACTION_CAM_OUT    → ATB_RUNNING
WAVE_TRANSITION   → ATB_RUNNING | RESULTS
RESULTS           → EXIT
any               → EXIT (KO)
```

---

## 4. ATB & Pip Economy

### Intent

ATB creates natural pacing — combatants take turns based on speed, not menu mashing. Pips create tactical budgets — you choose how to spend your turn, not just what to do.

### Rules

- Every combatant has **3 pips** (fixed). Speed stat controls fill rate, not pip count.
- Pips fill sequentially left-to-right. Visually reads as one continuous bar with section dividers.
- Fill rate per pip: `pipFillMs / atbSpeed`. Base ~2000ms at speed 1.0.
- When all 3 pips fill, that combatant's formation turn starts. ATB freezes globally.
- Pips do not carry across formation turns — when your turn ends, remaining pips are lost and bar resets.
- **Global freeze** when anyone is acting. Simple, predictable, no edge cases.
- ATB resumes on action cam out with a soft ease-in ramp (tunable).

### Pip Visual States

Empty (dark), filling (progress bar within segment), full (solid bright), all-3-full (glow pulse — ready to act).

---

## 5. Formation Turn

### Intent

The formation turn is the strategic layer. You decide how to spend your pip budget before committing to combat.

### Rules

- Each action costs 1 pip (attack, defend, item) except flee which costs all 3 pips.
- **Maximum one attack per formation turn.** Attack opens the action cam. When the exchange resolves, the turn is over regardless of remaining pips. Remaining pips are lost.
- Non-attack actions chain freely: item → defend → attack (3 pips). Or item → item → defend (3 pips, no attack).
- **Defend** and **Item** are available both in formation view and in-cam (1 pip each, instant, swaps sides in-cam).
- **Flee** is formation-only. Costs all 3 pips (entire turn). Roll chance. Success = exit with loot. Fail = turn over (all pips spent).
- Actions: ATK (opens cam), Defend (buff, no cam), Item (instant, no cam), Flee (all pips, roll chance).
- Action list is an array on each combatant — host can inject special moves, fairy actions, weapon-specific actions with zero menu changes.

---

## 6. Action Cam & Exchanges

### Intent

The action cam is the spectacle layer. Two combatants fill the screen. The back-and-forth exchange gives both sides agency. It should feel like a 2D fighting game cutscene — punchy, readable, satisfying.

### Roles

**Initiator** — the combatant whose ATB filled and triggered the exchange. Goes first. Only they can end the exchange via RELENT.

**Responder** — pulled into the exchange. Can PASS to yield their action cam turn.

### Exchange Flow

1. Initiator's ATB fills → exchange begins → cam zooms in
2. Initiator's action cam turn: ATK (costs 1 pip), DEF (1 pip, instant buff), ITEM (1 pip, instant), or RELENT (free, ends exchange)
3. If ATK → combo plays (offensive QTE) → damage resolves → responder's action cam turn
4. Responder's action cam turn: ATK (costs 1 pip), DEF (1 pip), ITEM (1 pip), or PASS (cost TBD, yields turn back)
5. If ATK → combo plays → damage resolves → back to initiator
6. Repeat until: initiator RELENTs, or initiator has 0 pips (auto-ends)
7. Cam zooms out → ATB resumes

### Rules

- Defending against an incoming combo is free (the defensive QTE costs no pip).
- Counter-attacking costs a pip.
- DEF and ITEM cost 1 pip in-cam, resolve instantly, then swap sides.
- Initiator has initiative — only they can end the exchange.
- If responder has no pips, they can't counter. Initiator gets free swings.
- Responder can only target the initiator.
- In-cam menu is separate from formation-view menu. Flee is never in-cam.

### Working Patterns

- Exchange state tracked in a mutable ref (`camExchangeRef`) — holds initiator/responder IDs, current swinger/receiver, swing count.
- `combatantMap` provides O(1) keyed lookup for all combatant data, replacing scattered `.find()` calls.
- Sides swap after each swing resolves. If next swinger has no pips, exchange auto-ends.
- On cam out, initiator's ATB resets. If another combatant already has full pips, their turn starts immediately.

---

## 7. Combo Beat System

### Intent

Every attack is a combo — a sequence of swings. The QTE ring sequence maps 1:1 to the beat array. Each ring IS a swing. Each swing IS a beat. Damage is per-beat, not pooled. This unifies offensive and defensive QTEs under one data structure.

### Skill Definition (Structure)

A skill defines: id, name, QTE ring config (count, speeds, delays, shrink duration, zone sizing), and a beats array. Each beat specifies: damage, attacker anim, target reaction, shake level, SFX key, blockable flag, dodgeable flag, optional unblockable flag, optional finisher flag.

### Offensive Resolution (Player Attacking)

Per ring: hit → play full beat choreography (swing + target reaction + shake + SFX) + accumulate beat damage. Miss → play weak whiff (short lunge, no target reaction, zero damage). On complete → spawn single summary damage number.

Enemies do NOT block or dodge player attacks in V1. Every landed ring = full beat damage. Future: boss enemies could dodge/block specific beats — the data structure already supports it.

### Defensive Resolution (Player Defending)

Per ring: enemy ALWAYS plays their swing anim. Player input determines outcome:

- **Tap in window + blockable beat:** Brace anim, reduced damage (×0.25).
- **Tap in window + unblockable beat:** Fail — full damage, hit anim.
- **Swipe in window + dodgeable beat:** Dodge anim, zero damage.
- **Miss:** Full damage, hit anim + knockback.

On complete → spawn single summary damage number.

### Ring-Synced Choreography

Attack anims sync to QTE rings. When a ring starts shrinking, the swinger begins pull-back. Snap-forward peaks as the ring reaches the sweet spot. One ring = one full pull-back → strike cycle. Duration matched via CSS variable.

### Working Patterns

- `onRingStart` callback fires from QTE plugin through QTERunner to BattleView when each ring begins shrinking. Drives the choreography sync.
- Glow color indicates who is swinging: blue (party) / red (enemy), via separate CSS keyframes.
- `scavenger_combo` enemy skill demonstrates multi-ring combos (2 quick + 1 heavy finisher).

---

## 8. Defensive Input (Tap / Swipe)

### Intent

The player reads each incoming swing and chooses how to react. Tap = safe block (reduced damage). Swipe = risky dodge (zero damage). Unblockable swings force the dodge decision.

### Rules

- Swipe detection ONLY active during defensive QTE phases.
- Only inside the QTE zone element (not full screen).
- `touch-action: none` on QTE zone during defense to prevent browser nav.
- Minimum swipe distance ~30px. Any direction counts.
- Tap = touchstart + touchend with minimal movement (<15px).
- Once swiped for a ring, consumed (no double-trigger).
- Desktop fallback: click = tap.

### QTE Plugin Responsibility

The QTE plugin reports what happened: `onRingResult(index, hit, inputType)` where inputType is `"tap"`, `"swipe"`, or `"auto_miss"`. The host (BattleView) decides what tap vs swipe means for each beat based on the beat's blockable/dodgeable flags.

### Visual Tells

Normal beat = default ring color. Unblockable = red ring + "!" icon. Finisher = larger start radius, brighter stroke. Per-ring visual config is a future polish layer — V1 can start with uniform rings.

---

## 9. Choreography

### Intent

Every phase of the exchange has a clear visual beat so the player always knows what happened and what's coming next. All choreography is CSS-driven (transforms, keyframe anims, class toggles). No new spritesheets required for V1 — idle sheets + CSS tricks carry everything.

### Anim State System

Each combatant has an entry in a keyed map (`animState`). BattleView applies it as a CSS class on the choreography wrapper. Multiple combatants animate simultaneously.

**States:** idle, ready (ATB full glow), wind_up (lean back), strike (lunge forward), return (ease back), brace (defensive squat + blue flash), hit (knockback + white flash), flinch (minor recoil), telegraph (shake + red glow buildup), ko (pop + spin + dissolve), dodge (fast shift away, quicker than knockback).

### Working Patterns

- **Transform layering:** Outer div handles slide-to-center (inline transform, pixel values). Inner `__choreo` div handles choreography (CSS class with `--choreo-dir` variable: 1 for party, -1 for enemy). No conflicts.
- **Faction direction:** Single CSS variable `--choreo-dir` flips all choreography per faction. Party lunges left (toward enemy), enemy lunges right (toward party).
- **Screen shake:** CSS keyframe on `.battle-scene`. Four levels (light/medium/heavy/ko) with stepped keyframes for pixel feel. Applied via class, auto-removed via `onAnimationEnd`.
- **Damage numbers:** React component, absolutely positioned in scene zone. Pops with scale overshoot, floats upward, fades out. Self-destructs after timer. Color coded by severity (gold=perfect, white=good, gray=poor, red=miss).
- **Hit flash:** `filter: brightness(3) saturate(0)` for ~80ms. Works on spritesheets and static images.
- **Enemy bob:** Stepped CSS translateY oscillation. Staggered per enemy via `--bob-delay`. Pauses during action cam for dimmed combatants.
- **Telegraph:** Uses `drop-shadow` on sprite (hugs image shape) instead of `box-shadow` on card. Escalating shake + red glow buildup.
- **KO:** Pop-up + spin + pixel dissolve. Removed from formation after anim.

### Exchange Choreography Timeline

**Cam in (~350ms):** Combatants slide to center, inactives dim, ATB/menu fade out, comic panel fades in.

**Combo plays (variable):** QTE zone appears. Per-ring: swinger wind-up → strike → target reacts (hit/brace/dodge/flinch) → shake + flash + damage number → swinger returns. Intensity scales with QTE accuracy.

**Cam out (~350ms):** Comic panel fades, combatants slide back to formation, all restore opacity, ATB/menu fade in, ATB resumes with ease-in.

### Damage Intensity Scaling

Perfect QTE (100%): big knockback, double flash, heavy shake, gold damage. Good (50-99%): standard knockback, medium shake, white damage. Poor (1-49%): flinch only, light shake, gray damage. Miss (0%): no reaction, no shake, red "MISS" text.

---

## 10. Enemy System

### V1 Behavior

No decision-making. ATB fills → execute attack pattern against random party member. Timing variation in the pattern IS the difficulty — not AI.

### Attack Flow

ATB fills → telegraph anim (shake, glow, wind-up) → telegraph duration = first delay in pattern → defensive QTE runs → result determines damage mitigation → damage applied.

### Visual Tells

Slow shake = slow ring incoming. Fast vibrate = fast ring. Holds still = delay before next ring (fake-out). Flash/glow = ring about to start.

---

## 11. HP, KO & Items

### HP

Host computes maxHP from smith stats (stamina, brawn). Creates tension: spend stamina forging (fewer HP) or save it for scavenging. V1 test data: all combatants 20 HP.

### KO

0 HP = KO'd. ATB stops. Can't act. All party KO'd → battle ends with `outcome: "ko"`. V1 solo = instant game over. Future: multi-member, others keep fighting, items could revive.

### Defend (Strategic Action)

Costs 1 pip. Available in both formation view and in-cam. Grants +3 defensePower buff that persists until this combatant's ATB fills again (next formation turn). Stacks with itself if used multiple times. In-cam: resolves instantly, swaps sides. Cleared on ATB fill via `battleState.clearDefendBuffs()`.

### Brace (Tactical Reaction)

The defensive action during an incoming QTE ring. Player taps the shrinking ring to brace. Successfully bracing reduces incoming damage to ×0.25 (75% reduction). Costs no pip — bracing is free, it's a skill check. Brace is distinct from Defend: Defend is a strategic pip-spending choice, Brace is a reflexive QTE reaction.

### Items

Passed in config per combatant with id, name, icon, description, effect (type + value), quantity. Effect types V1: heal, buff, debuff_enemy, damage. No QTE for items — safe, reliable option. Costs 1 pip. Available in both formation view and in-cam. In-cam: resolves instantly, swaps sides. Used items tracked in result deltas via `battleState.useItem()`.

### Flee

Formation-only. Costs all 3 pips (entire turn). 50% flat chance V1 (tunable via `FLEE.baseChance`). Success = exit battle with loot collected so far. Fail = turn over, all pips spent, ATB resumes. Future: wave-based chance scaling, flee as QTE sequence.

---

## 12. Layout

### Intent

Landscape four-zone split. Top half = scene (the fight). Bottom half = player tools. Handedness-flippable.

### Zones

**Scene (top):** Enemy formation left, party formation right. Sprites, names, HP bars. Tap-to-target on enemies. Action cam overlays here (pixel frame vignette, info panels, damage numbers).

**Bottom left:** Open real estate (buffs, status, placeholder).

**Bottom center:** ATB gauge strip (all combatant gauges). QTE zone overlays here during active QTE.

**Bottom right:** Action menu (2×2 grid). Comic panel overlays here during action cam (fairy portrait + speech).

### Working Patterns

- Layout widths driven by CSS custom properties set from constants.
- Action cam info panels pinned to left/right scene edges (inside scene zone, outside shake container so they stay stable).
- Action cam strips card chrome (border, bg, padding removed) — sprites float clean.
- All sizing in vw/vh for mobile-first.

---

## 13. Fairy Integration

### Intent

Zero coupling. Battle doesn't know fairy exists.

### As Commentator (V1-Ready)

Host passes `onBattleEvent` observer. Host's fairy controller listens and generates speech. Host pipes fairy speech into battle's `speechBubbles` prop. Battle renders it in the comic panel.

During action cam, the comic panel replaces the action menu zone — dedicated space for fairy to react to QTE performance, taunt enemies, warn about incoming attacks.

### As Party Member (Future)

Fairy joins party array with `aiControlled: true`. Battle calls `onActionNeeded(battleState)` when her ATB fills. Host routes to LLM or scripted logic. Battle awaits action and continues. Doesn't know an LLM was involved.

---

## 14. Loot & Results Screen

### Loot

End-of-encounter rewards overlay after final wave. Shows accumulated loot from all waves. Full overlay, not action cam.

### Results Screen

Covers all exit conditions (not just victory). Shows: outcome badge (Victory/Fled/KO), loot collected (KO = "All loot lost"), battle stats summary, continue button → exits to host with BattleResult.

### Flee

Costs all 3 pips (entire formation turn). 50% flat chance V1. Success = exit with loot collected so far. Fail = turn over, ATB resumes. Future: wave-based chance scaling, flee as a QTE sequence (sprint animation, rhythm-timed dodge through obstacles).

---

## 15. Architecture & Ownership

### File Structure

`src/battle/` — `battleConstants.js`, `battleState.js`, `battleSkills.js`, `battleSFX.js`, `BattleView.js`, `BattleView.css`, `BattleTransition.js`. Future: `battleMode.js`, `battleResolver.js`, `LootScreen.js`.

External: `circleTimingQTE.js` (QTE plugin, `src/modules/`), `ScavengeMenu.js` (host UI, `src/modules/`).

### Ownership

| File | Owns |
|------|------|
| `battleConstants.js` | All tuning values (ATB, action cam, exchange, choreography, transition, test data, item definitions, defend/flee config) |
| `battleState.js` | Mutable combat runtime — HP, items, KO, buffs, damage tracking, used-item tracking, result builder. Plain object factory via `createBattleState()`. |
| `battleSkills.js` | Skill & beat definitions (player + enemy), beat defaults, validation |
| `battleSFX.js` | Procedural combat SFX (hit, block, impact, ko) via Web Audio API |
| `BattleView.js` | Layout, phase state, ATB tick, action cam transitions, choreography, all inline sub-components, item submenu |
| `BattleView.css` | All battle styles, transitions, pseudo-elements, keyframe anims |
| `BattleTransition.js` | Pixel dissolve screen transition (entry/exit) |

### Component Tree

BattleView root contains: Scene zone (BattleCharacter ×N per side with choreo wrapper + BattleSprite + info, clash spark, action cam pixel frame, ActionCamInfoPanel, DamageNumber ×N), Bottom zone (open real estate, ATBGaugeStrip, ActionMenu, ItemSubmenu, QTEZone, ComicPanel), In-cam buttons (ATK, RELENT/PASS, DEF, ITEM per side), DevControls.

### CSS Naming Convention

`normal-cam-char*` = formation view. `action-cam-char*` = action camera states. `action-cam-info*` = info panels. `action-cam-dmg*` = damage numbers. `normal-cam-char__choreo` = choreography transform layer.

### Sub-Mode Contract (Future)

Same pattern as `forgeMode.js`: `canEnter`, `onEnter`, `onExit` (returns BattleResult), `getPhase`, `getView`.

---

## 16. Implementation Status

### Choreography Steps

| Step | What | Status |
|------|------|--------|
| 1 | Inner choreo wrapper div | ✅ |
| 2 | Enemy idle bob (stepped, staggered) | ✅ |
| 3 | Screen shake (4 levels, stepped keyframes) | ✅ |
| 4 | Hit flash (brightness filter) | ✅ |
| 5 | Strike lunge + knockback (directional) | ✅ |
| 6 | Damage numbers (pop + float + fade) | ✅ |
| 7 | Wind-up + return states | ✅ |
| 8 | Telegraph (shake + red glow) | ✅ |
| 9 | Brace vs hit on defense | ✅ (resolveHitOnReceiver checks hit + beat.blockable, ×0.25 brace) |
| 10 | KO anim (pop + spin + dissolve) | ✅ |
| 11 | Timed exchange sequencer | ✅ (QTERunner + manual ATK buttons) |
| 12 | Per-ring QTE visual sync | 🔲 |
| 13 | Defend action (formation + in-cam) | ✅ |
| 14 | Flee action (3-pip, formation only) | ✅ |
| 15 | Results screen overlay | ✅ (outcome badge, stats grid, continue button) |

### Additional Completed Work

- Procedural SFX system (`battleSFX.js`)
- Fairy combat sprite configs wired
- Action cam pixel frame vignette
- ActionCamInfoPanel (two side-pinned panels)
- `animState` keyed map for simultaneous multi-combatant anims
- CSS class rename pass (normal-cam / action-cam)
- ActionCamInfoPanel outside shake container
- Card chrome stripped for clean action cam
- Enemy bob persists for target during action cam
- Telegraph drop-shadow on sprite shape
- Manual ATK buttons (PLAYER ATK / ENEMY ATK) replacing auto-sequencer
- `onRingStart` callback pipeline (QTE → Runner → BattleView)
- Ring-synced combat anims via CSS variable
- Faction glow (blue party / red enemy)
- `scavenger_combo` multi-ring enemy skill
- Initiator/Responder turn system with RELENT and PASS
- Pip spending (1 pip per ATK, deducted on press)
- Pip display in ActionCamInfoPanel
- `combatantMap` keyed lookup
- `battleState.js` — mutable combat runtime (HP, items, KO, buffs, result builder)
- `BATTLE_ITEMS` definition table + test items on party combatants
- Item submenu component (formation + in-cam, scrollable, qty tracking)
- Formation + in-cam item use with effect application and feedback numbers
- `applyFullHit` wired to `bState.applyDamage()` — HP bars reactive to combat
- Brace damage wired to `bState.applyDamage()` — braced hits also update HP
- Defend action (formation + in-cam, +3 def buff, cleared on ATB fill)
- Flee action (3-pip all-in, 50% flat chance, formation only)
- Synchronous pip deduction via `deductPip()` for correct post-action state reads
- Damage rebalance: all HP → 20, base swings → 6, enemy finishers → 10, brace → ×0.25
- Deferred KO system — KO react only on last beat of combo, `isLastBeat` threaded through all 3 damage paths
- Battle exit flow — `triggerBattleEnd` shows results screen overlay, continue button fires `onExit(result)`
- Flee success builds proper `"fled"` result via `triggerBattleEnd`
- Global targeting — tap any sprite (enemy or party) to set selection, action validation gate (invalid → auto-select, no fire)
- Turn owner indicator — white corner brackets (`battle-char--turn-owner`), selected target green (`battle-char--selected`)
- Formation data reads from live `combatantMap` instead of static TEST arrays (HP/items/buffs update in real time)
- Enemy AI random target — `pickRandomLivingPartyMember()` replaces sequential first-alive scan
- `QTERunner.js` — standalone component, receives config, mounts plugin, emits result
- `battleSkills.js` — skill & beat definitions with defaults + validation (`basic_attack`, `power_strike`, `rat_bite`, `scavenger_combo`, `trash_golem_slam`)

### Combo Beat Steps

| Step | What | Status |
|------|------|--------|
| 1 | Skill definitions in battleSkills.js | ✅ |
| 2 | handleQTERingResult reads beats from context | ✅ |
| 3 | Summary damage number replaces per-beat numbers | 🔲 |
| 4 | Swipe detection in circleTimingQTE | 🔲 |
| 5 | onRingResult signature adds inputType | 🔲 |
| 6 | Tap vs swipe defense logic | 🔲 |
| 7 | Dodge CSS class | 🔲 |
| 8 | Unblockable visual tells | 🔲 |

---

## 17. V1 / V2 / V3 Roadmap

### V1 — Proof of Concept

Config/result contract, solo party, ATB loop with freeze, circle timing QTE (multi-ring), 4-action formation menu, action cam with exchange system, 1 zone / 2 waves / no boss, 3-4 enemy types / 2-3 item types, loot screen, landscape four-zone layout with handedness, observer callback, fairy comic panel zone (static).

### V2 — Content + Polish

QTE-driven exchange extension (perfect timing → bonus beats, cap 2+2), boss waves, more zones/enemies/items, enemy visual tells, wave transitions, fairy commentary via observer, ATB resume tuning, SFX + battle music.

### V3 — Party + AI

Fairy as party member, LLM action selection, combo moves, special moves (smith rank gated).

### V4+ — Expansion

Portrait layout variant, swipe QTE variant, enemy AI with conditions, equipment effects, scavenge-only progression track.

---

## 18. Open Questions

| Question | Status | Candidates |
|----------|--------|------------|
| PASS pip cost | TBD — playtest | Free (current code) vs 1 pip (discourages stalling) |
| Responder pip retention after exchange | TBD — playtest | Responder keeps unspent pips, initiator loses theirs |
| Pip fill rate tuning | TBD — playtest | 2000ms base feels right on paper |
| Flee success formula | **Decided V1** | 50% flat chance. Future: wave-based scaling. |
| Flee pip cost | **Decided** | All 3 pips (entire turn). All-in commitment. |
| Multi-member turn ordering | TBD | Speed tiebreaker? Player choice? |
| Enemy AI pip spending | TBD | V1: always attack. Future: personality-driven |
| QTE-driven exchange extension rules | TBD — V2 | Perfect timing earns follow-up beats, cap 2+2 |
| Defend buff stacking | TBD — playtest | Currently stacks. Cap at 1? Diminishing returns? |

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Portability | Config in, deltas out | Standalone black box |
| Stat mapping | Host computes all combat values | Battle imports nothing |
| Difficulty | Fixed per zone | Dark Souls progression |
| QTE | Multi-ring shrinking circles | More engaging than single-tap |
| Action cam | Transform-only zoom on existing tree | GPU-composited, no reflow |
| Exchange model | Initiator/responder with pip spending | Both sides have agency |
| ATB freeze | Global freeze during any action | Simple, predictable |
| Party | Built for N, ships with 1 | Fairy slots in later, zero arch changes |
| AI members | `onActionNeeded` callback | Battle agnostic to LLM vs scripted |
| Comms | Observer out, React state + callbacks in | Zero coupling |
| Layout | Landscape four-zone + handedness | Clean zone separation |
| Choreography | CSS-driven, no extra spritesheets | Portable, performant |
| Wave state | HP/items persist, ATB/buffs reset | Risk/reward tension |
| KO | Lose all loot | Stakes make flee meaningful |
| Flee cost | All 3 pips | All-in commitment, no cheap escape attempts |
| Defend vs Brace | Two separate systems | Defend = strategic (pip spend), Brace = tactical (QTE reaction) |
| Brace multiplier | ×0.25 (75% reduction) | Rewards skill without negating damage entirely |
| Battle state | Plain object factory, not singleton | Cleaner for testing, no init/destroy ceremony, ref-held in BattleView |
| Item use in-cam | Same as formation, swaps sides | Tactical mid-exchange healing/buffing adds depth |