# Scavenge Battle System — Feature Spec

**Codename:** Dumpster Diving RPG
**Status:** 🟡 IN PROGRESS
**Dependencies:** DES-2 QTE System (plugin contract)
**Terminology:** See `BattleTerminology.md`
**Engagement rules:** See `EngagementSystemSpec.md` (initiative, AP, turn order, action cam, combos)
**Tone:** Opt-in, comedic, absurd. You are a blacksmith beating up sentient garbage for profit.

---

## Table of Contents

1. Overview & Portability
2. Battle Config & Result
3. Phases & Transitions
4. ~~ATB & Pip Economy~~ → See `EngagementSystemSpec.md` §3
5. ~~Formation Turn~~ → See `EngagementSystemSpec.md` §4
6. ~~Action Cam & Exchanges~~ → See `EngagementSystemSpec.md` §5
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
17. Roadmap
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

**Party:** Array of combatant objects — id, name, sprite, maxHP, currentHP, speed (used for initiative roll + AP earn rate), attackPower, defensePower, qteZoneBonus, skills array, items array. Future: `aiControlled` flag + `onActionNeeded` callback for fairy/AI party members.

**Encounter:** Zone info (id, name, background, music). Waves array — each wave has an enemies array. Each enemy has stats, attack pattern, death anim, loot table with drop chances, and dialogue strings.

**Settings:** Handedness (left/right action menu placement). AP max (shared cap for all combatants).

**Observer:** Optional `onBattleEvent` callback for external listeners (fairy, analytics).

### Result (Output)

Battle returns deltas only. Host decides what to do with them.

**Fields:** Outcome (victory/fled/ko). Loot array (item id + qty). Party deltas (HP lost, items used per member). Stats summary (waves completed, damage dealt/taken, QTE accuracy, enemies defeated, boss status, flee wave).

**Host responsibility:** Apply loot to inventory via bus, subtract used items, apply stamina/time costs, handle KO state. Mapping is one-way — battle never calls back into host during combat.

---

## 3. Phases & Transitions

See `EngagementSystemSpec.md` for the authoritative turn order, AP, and action cam flow.

See `CombatFeelSpec.md` §8 for the QTE/playback phase split within the action cam.

### Phase List

Current implementation: `ATB_RUNNING`, `ACTION_SELECT`, `ACTION_CAM_IN`, `CAM_TURN_START`, `CAM_WAIT_ACTION`, `CAM_TELEGRAPH`, `CAM_SWING`, `CAM_RESOLVE`, `ACTION_CAM_OUT`.

These phases predate the engagement system redesign and will be reworked during implementation. The target phase model combines the initiative-driven turn flow from EngagementSystemSpec with the QTE/playback split from CombatFeelSpec.

Future phases: `INTRO`, `WAVE_TRANSITION`, `FLEE_ATTEMPT`, `RESULTS`, `EXIT`.

---

## 4–6. Turn Order, AP & Action Cam

**Moved to `EngagementSystemSpec.md`.** That document is the single source of truth for:

- Initiative rolls & turn order strip (§2)
- Action Points — earn rate, carry-over, cap, visibility (§3)
- Formation turn — action menu, AP costs, turn end conditions (§4)
- Action cam — one-trade model, counter decision, defensive QTE (§5)
- Delayed skills & combo triggers (§6)
- Protection skills — Intercept & Taunt (§7)
- AP bar UI & turn order strip UI (§8)

---

## 7. Combo Beat System

### Intent

Every attack is a combo — a sequence of swings. The QTE ring sequence maps 1:1 to the beat array. Each ring IS a swing. Each swing IS a beat. Damage is per-beat, not pooled. This unifies offensive and defensive QTEs under one data structure.

### Skill Definition (Structure)

A skill defines: id, name, AP cost, QTE ring config (count, speeds, delays, shrink duration, zone sizing), and a beats array. Each beat specifies: damage, check type (ring/swipe/circle), attacker anim, target reaction, shake level, SFX key, blockable flag, dodgeable flag, optional unblockable flag, optional finisher flag.

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

**States:** idle, ready (turn indicator glow), wind_up (lean back), strike (lunge forward), return (ease back), brace (defensive squat + blue flash), hit (knockback + white flash), flinch (minor recoil), telegraph (shake + red glow buildup), ko (pop + spin + dissolve), dodge (fast shift away, quicker than knockback), channeling (charge glow, delayed skill).

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

**Cam in (~350ms):** Combatants slide to center, inactives dim, menu fade out, comic panel fades in.

**Combo plays (variable):** QTE zone appears. Per-ring: swinger wind-up → strike → target reacts (hit/brace/dodge/flinch) → shake + flash + damage number → swinger returns. Intensity scales with QTE accuracy.

**Counter (optional):** If responder counters, their combo plays the same way. If not, cam exits.

**Cam out (~350ms):** Comic panel fades, combatants slide back to formation, all restore opacity, turn order strip visible, next combatant's turn begins.

### Damage Intensity Scaling

Perfect QTE (100%): big knockback, double flash, heavy shake, gold damage. Good (50-99%): standard knockback, medium shake, white damage. Poor (1-49%): flinch only, light shake, gray damage. Miss (0%): no reaction, no shake, red "MISS" text.

---

## 10. Enemy System

### V1 Behavior

No decision-making. Turn comes up in initiative order → execute attack against random party member. Timing variation in the pattern IS the difficulty — not AI.

### Attack Flow

Turn arrives → telegraph anim (shake, glow, wind-up) → action cam opens → offensive combo plays → player defends → result determines damage mitigation → damage applied → cam out.

### Visual Tells

Slow shake = slow ring incoming. Fast vibrate = fast ring. Holds still = delay before next ring (fake-out). Flash/glow = ring about to start.

### AI AP Spending (V1)

Simple: always attack if AP is sufficient. No saving, no baiting. Future: personality-driven AP spending (see `EngagementSystemSpec.md` §10, question #10).

---

## 11. HP, KO & Items

### HP

Host computes maxHP from smith stats (stamina, brawn). Creates tension: spend stamina forging (fewer HP) or save it for scavenging. V1 test data: all combatants 20 HP.

### KO

0 HP = KO'd. Removed from initiative sequence. Can't act. All party KO'd → battle ends with `outcome: "ko"`. V1 solo = instant game over. Future: multi-member, others keep fighting, items could revive.

### Defend (Strategic Action)

Formation-only. Costs AP (see `EngagementSystemSpec.md` §4). Grants defensive buff. Cleared on next formation turn start via `battleState.clearDefendBuffs()`.

### Brace (Tactical Reaction)

The defensive action during an incoming attack. Player taps during the defense window to brace. Successfully bracing reduces incoming damage (perfect brace = full negate, good brace = ×0.25). Costs nothing — bracing is a free skill check. Brace is distinct from Defend: Defend is a strategic AP-spending choice, Brace is a reflexive QTE reaction. See `CombatFeelSpec.md` §7 for timing constants.

### Items

Passed in config per combatant with id, name, icon, description, effect (type + value), quantity. Effect types V1: heal, buff, debuff_enemy, damage. No QTE for items — safe, reliable option. Formation-only — costs AP (see `EngagementSystemSpec.md` §4). Used items tracked in result deltas via `battleState.useItem()`.

### Flee

Formation-only. Costs AP (high — see `EngagementSystemSpec.md` §4). 50% flat chance V1 (tunable via `FLEE.baseChance`). Success = exit battle with loot collected so far. Fail = AP spent, turn over. Future: wave-based chance scaling, flee as QTE sequence.

---

## 12. Layout

### Intent

Landscape four-zone split. Top half = scene (the fight). Bottom half = player tools. Handedness-flippable.

### Zones

**Scene (top):** Enemy formation left, party formation right. Sprites, names, HP bars, AP bars. Tap-to-target on enemies. Action cam overlays here (pixel frame vignette, info panels, damage numbers).

**Bottom left:** Open real estate (buffs, status, placeholder).

**Bottom center:** Turn order strip (combatant portraits in initiative sequence). QTE zone overlays here during active QTE.

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

Fairy joins party array with `aiControlled: true`. Battle calls `onActionNeeded(battleState)` when her turn comes up in initiative order. Host routes to LLM or scripted logic. Battle awaits action and continues. Doesn't know an LLM was involved.

---

## 14. Loot & Results Screen

### Loot

End-of-encounter rewards overlay after final wave. Shows accumulated loot from all waves. Full overlay, not action cam.

### Results Screen

Covers all exit conditions (not just victory). Shows: outcome badge (Victory/Fled/KO), loot collected (KO = "All loot lost"), battle stats summary, continue button → exits to host with BattleResult.

---

## 15. Architecture & Ownership

### File Structure

`src/battle/` — `battleConstants.js`, `battleState.js`, `battleSkills.js`, `battleSFX.js`, `battleAI.js`, `BattleView.js`, `BattleView.css`, `BattleTransition.js`, `gestureRecognition.js`, `Chalkboard.js`. Future: `battleMode.js`, `battleResolver.js`, `LootScreen.js`.

External: `QTERunner.js` (QTE mounting, `src/battle/`), `ScavengeMenu.js` (host UI, `src/modules/`).

### Ownership

| File | Owns |
|------|------|
| `battleConstants.js` | All tuning values (initiative, AP, action cam, choreography, transition, test data, item definitions, defend/flee config, QTE difficulty tables, defense timing tables) |
| `battleState.js` | Mutable combat runtime — HP, AP, items, KO, buffs, damage tracking, used-item tracking, result builder. Plain object factory via `createBattleState()`. |
| `battleSkills.js` | Skill & beat definitions (player + enemy), AP costs, check types per beat, beat defaults, validation |
| `battleSFX.js` | Procedural combat SFX (hit, block, impact, ko) via Web Audio API |
| `battleAI.js` | Enemy AI — `pickAction(combatantData, bState)` returns `{ targetId, skillId }` |
| `BattleView.js` | Layout, phase state, initiative/turn management, action cam transitions, choreography, all inline sub-components |
| `BattleView.css` | All battle styles, transitions, pseudo-elements, keyframe anims |
| `BattleTransition.js` | Pixel dissolve screen transition (entry/exit) |
| `Chalkboard.js` | Offensive QTE — three check types (ring/swipe/circle), scoring, results array output |
| `gestureRecognition.js` | Swipe/circle gesture classification (pure JS utility) |

### Component Tree

BattleView root contains: Scene zone (BattleCharacter ×N per side with choreo wrapper + BattleSprite + info, clash spark, action cam pixel frame, ActionCamInfoPanel, DamageNumber ×N), Bottom zone (open real estate, TurnOrderStrip, ActionMenu, ItemSubmenu, QTEZone, ComicPanel), In-cam counter button, DevControls.

### CSS Naming Convention

`normal-cam-char*` = formation view. `action-cam-char*` = action camera states. `action-cam-info*` = info panels. `action-cam-dmg*` = damage numbers. `normal-cam-char__choreo` = choreography transform layer.

### Sub-Mode Contract (Future)

Same pattern as `forgeMode.js`: `canEnter`, `onEnter`, `onExit` (returns BattleResult), `getPhase`, `getView`.

---

## 16. Implementation Status

### What's Built (Pre-Engagement Rework)

The following systems are implemented and functional under the **old pip/ATB model**. They will need rework to wire into the engagement system (initiative, AP, one-trade cam):

- Full choreography pipeline (all 15 steps complete)
- Procedural SFX system (`battleSFX.js`)
- Action cam zoom, pixel frame, info panels
- `combatantMap` keyed lookup
- `battleState.js` — HP, items, KO, buffs, result builder
- `battleSkills.js` — skill & beat definitions with defaults + validation
- `battleAI.js` — random target + skill selection
- Wave transitions (party HP/buffs carry, enemy ATB fresh)
- Results screen overlay (outcome badge, stats, continue)
- QTERunner standalone component
- Chalkboard QTE component (ring/swipe/circle checks, three-tier scoring)
- `gestureRecognition.js` utility
- Defense timing constants (`DEFENSE_TIMING` table)
- QTE difficulty presets (`QTE_DIFFICULTY` table)

### What Needs Rework for Engagement System

- ATB tick loop → replace with initiative roll + fixed turn order
- Pip tracking → replace with AP pools (earn per turn, carry over, cap)
- Exchange flow (swap sides, RELENT, PASS) → replace with one-trade model + optional counter
- In-cam item/defend buttons → remove (formation-only now)
- ATB gauge strip UI → replace with turn order strip
- Pip display in info panels → replace with AP bar
- Formation action menu → update for new action list (immediate skill, delayed skill, item, defend, intercept, taunt, flee, wait)
- Enemy auto-swing timing → adapt to initiative-driven turns

### Combo Beat Steps (From CombatFeelSpec)

| Step | What | Status |
|------|------|--------|
| 1–6 | QTE_DIFFICULTY + DEFENSE_TIMING tables, phase constants, difficulty/check fields on skills, gestureRecognition.js, Chalkboard.js | ✅ |
| 7 | Wire Chalkboard into QTERunner + update BattleView phase flow | 🔲 Next |

---

## 17. Roadmap

### V1 — Core Loop

Config/result contract, solo party, initiative-driven turn order, AP economy, Chalkboard QTE (ring/swipe/circle), formation action menu (skill/item/defend/flee/wait), one-trade action cam with counter, 1 zone / 2 waves / no boss, 3-4 enemy types / 2-3 item types, loot screen, landscape four-zone layout with handedness, observer callback, fairy comic panel zone (static).

### V2 — Depth

Delayed skills + combo triggers, Intercept & Taunt protection skills, boss waves, more zones/enemies/items, enemy visual tells, fairy commentary via observer, battle music, enemy AI personality (AP spending behavior).

### V3 — Party + AI

Multi-member party, fairy as party member, LLM action selection, combo recipes (content authoring), special moves (smith rank gated).

### V4+ — Expansion

Portrait layout variant, equipment effects on combat stats, adventure mode stat bridge (forge quality → combat), enemy AI with conditions, scavenge-only progression track.

---

## 18. Open Questions

Active questions live in `EngagementSystemSpec.md` §10. The following are battle-system-specific questions not covered there:

| Question | Status | Candidates |
|----------|--------|------------|
| Defend buff stacking | TBD — playtest | Cap at 1? Diminishing returns? Or stack freely? |
| Multi-member turn ordering display | TBD — design | How does the turn order strip handle 4+ party members visually on mobile? |
| Loot drop system | TBD — design | Loot tables exist in spec, not wired. Per-enemy vs per-wave vs per-encounter? |
| Battle music integration | TBD — implementation | `useAmbientAudio` handoff issue on battle enter/exit |
| Desktop swipe input | TBD — implementation | Click = tap only currently. Keyboard shortcut as swipe stand-in? |

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Portability | Config in, deltas out | Standalone black box |
| Stat mapping | Host computes all combat values | Battle imports nothing |
| Difficulty | Fixed per zone | Dark Souls progression |
| QTE | Chalkboard with ring/swipe/circle checks | Three input types, three-tier scoring, front-loaded offense |
| Action cam | Transform-only zoom on existing tree | GPU-composited, no reflow |
| Engagement model | Initiative + AP + one-trade cam | See `EngagementSystemSpec.md` |
| Party | Built for N, ships with 1 | Fairy slots in later, zero arch changes |
| AI members | `onActionNeeded` callback | Battle agnostic to LLM vs scripted |
| Comms | Observer out, React state + callbacks in | Zero coupling |
| Layout | Landscape four-zone + handedness | Clean zone separation |
| Choreography | CSS-driven, no extra spritesheets | Portable, performant |
| Wave state | HP/items persist, AP resets per wave | Risk/reward tension |
| KO | Lose all loot | Stakes make flee meaningful |
| Defend vs Brace | Two separate systems | Defend = strategic (AP spend), Brace = tactical (free QTE reaction) |
| Brace scoring | Three-tier (perfect/good/fail) | See `CombatFeelSpec.md` §7 |
| Battle state | Plain object factory, not singleton | Cleaner for testing, no init/destroy ceremony, ref-held in BattleView |
| Items/Defend | Formation-only | Action cam is pure combat — see `EngagementSystemSpec.md` §4 |