# Fairy System — Three-Layer Architecture Spec

**Status:** ⚠️ IN PROGRESS — core pipeline live (Controller → Pawn → AnimInstance), remaining: FX, persistence, special cues  
**Risk:** LOW — remaining milestones are additive, no refactors  
**Character bible:** See `FairyCharacter.md` for identity, voice, pacing, abilities, and LLM design.

Three-layer puppet architecture following UE conventions. Controller decides intent. Pawn translates intent into stage directions. AnimInstance executes the visual. Bus-listener architecture — read-only on game state. Day-gated pacing from FairyCharacter.md.

---

## Architecture

| Layer | UE Analogy | File | Job |
|-------|-----------|------|-----|
| FairyController | AIController | `src/fairy/fairyController.js` | The brain. Decides WHEN to act and WHAT to say. FSM, rules evaluation, line picking, LLM routing, day-gating, pacing. |
| FairyPawn | Pawn / Character | `src/fairy/fairyPawn.js` | The thing in the world. Decides WHERE to go and HOW. Position registry, target resolver, cue playback, action queue. |
| FairyAnimInstance | AnimInstance | `src/fairy/FairyAnimInstance.js` | Pure animation player. Receives commands, plays sprite/FX/bubble. Zero decision-making. |

Communication flows one direction: **Controller → Pawn → AnimInstance**. Controller possesses the Pawn. Pawn owns the AnimInstance. Each layer only talks to the one below it.

---

## File Map

**Built (in `src/fairy/`):**

| File | Status |
|------|--------|
| `fairyController.js` | ✅ Built — FSM, bus integration, rules eval, line picking, LLM routing. M-9: day-gating, pacing clock, structured `onCommand` pawn bridge |
| `fairyRulesTree.js` | ✅ Built — trigger definitions with busTag, conditions, priority, cooldowns, minDay day-gating |
| `fairyPersonality.js` | ✅ Built — 211 lines, 25 categories, 3 fairy events, system prompt, template tokens |
| `fairyAPI.js` | ✅ Built — LLM fetch wrapper with timeout, validation, gibberlese fallback |
| `fairyConfig.js` | ✅ Built — environment switching (local dev vs production worker URL) |
| `fairyPositions.js` | ✅ Built (M-5) — per-scene nav mesh, depth formula, UI targets, edge peeks, dodge paths, roam zones. `data-fairy-target` attributes on layouts |
| `fairyCues.js` | ✅ Built (M-6) — 13 named cue timelines with layer declarations and null-resolution convention |
| `fairyPawn.js` | ✅ Built (M-7) — cue player, position resolution (scene depth + overlay viewport), staging logic, dodge provider, feedback routing |
| `FairyAnimInstance.js` | ✅ Built (M-8) — command API via ref, pawn callbacks (onTapExit, onTapDodge, getDodgeSpot). Stripped autonomous loop, quip decks, position data |

**Replaced / delete candidates:**

| File | Status |
|------|--------|
| `src/components/FairyAnim.js` | ❌ Replaced by `src/fairy/FairyAnimInstance.js` — delete when confirmed |

---

## Layer Detail: FairyController

Pure JS singleton. The brain — possesses the pawn, never touches visuals.

**Current capabilities:** FSM (`off → idle → pointing → escalating → flustered → exiting → dismissed`), trigger evaluation against rules tree (bus events + ambient tick), line picking from personality data (shuffle deck), LLM routing when no static line matches, cooldowns, once-flags, escalation counts, bus subscriptions, gameplay tracking. Day-gating (checks current day against rule `minDay` + pacing table), pacing clock (scales ambient tick interval by day tier), pawn bridge (sends structured commands via `onCommand`).

**Day-Gating Pacing Table** (from FairyCharacter.md):

| Day | Tier | Allowed Behavior | Ambient Interval | Max Appearances/Day |
|-----|------|-----------------|------------------|---------------------|
| 1–2 | `ftue` | Full FTUE, teaching triggers, constant presence | 8s | Unlimited |
| 3–5 | `quiet` | Rare peeks, occasional silent poof, NO dialogue triggers | 45s | 3 |
| 6–9 | `reactive` | Gameplay reactions (shatters, sales, copper, quality) | 20s | 8 |
| 10–14 | `active` | All reactions + fairy events (blessing, rescue, insight) | 15s | 12 |
| 15+ | `full` | Full commentary, chase events, rummaging, laser, head gag | 10s | Unlimited |

Each rule in `fairyRulesTree.js` gains a `minDay` field. Controller skips rules where `day < minDay`. Tier also gates entire categories — during `quiet` tier, controller only sends `silent_peek` and `silent_poof` cues (no speech).

**Controller → Pawn command format:** An object with `intent` ("react", "ambient", "cue", "dismiss"), `target` (named position or null), `line` (dialogue text), `category` (trigger category for escalation tracking), and `cue` (named cue id or null — overrides target/line). When intent is "cue", the pawn handles the full sequence. When it's just a line and context, the pawn picks staging.

---

## Layer Detail: FairyPawn

`src/fairy/fairyPawn.js` (M-7). Pure JS singleton (no React). The fairy's physical presence in the world.

**Owns:** Position registry (all named positions, static and dynamic), target resolver (`data-fairy-target` → viewport % via `getBoundingClientRect`), action queue (sequential commands with timing), cue playback (reads cue definitions from `fairyCues.js`, steps through timeline), staging logic (picks approach direction, peek edge, hover offset based on target location).

**Does NOT own:** When to act (controller decides), what to say (controller decides), how animations render (AnimInstance does).

**Position Registry** (`fairyPositions.js`, M-5): Defines four types — static positions (hardcoded viewport %), dynamic positions (resolved at runtime from `data-fairy-target` elements with offsets), roam zones (rectangular areas for wandering), and edge peeks (from/to coordinate pairs for peek animations from screen edges). The pawn caches resolved positions and invalidates on window resize.

**Cue System** (`fairyCues.js`, M-6): Named timelines of pawn commands. Each cue is an object with an id, description, and steps array. Each step has an `at` time (ms from cue start) and a `cmd` (poof_in, poof_out, move, speak, emote, set_anim, play_audio, play_fx, laser_on, laser_off, set_tappable). Null values in cues are placeholders resolved by the pawn at playback time — `text: null` fills from controller's line, `x: null` resolves from target, `duration: null` calculates from text length. This keeps cues reusable across different triggers.

**Planned cues:** silent_peek, silent_poof, speak_at_target, crash_entrance, fairy_rescue, fairy_blessing, running_head, super_saiyan, chase_event.

**FX routing:** Fairy cue FX/audio steps emit bus tags (e.g. FX_FAIRY_RUBBLE), routed through the existing `fxCueSubSystem`. No separate FX pipeline for fairy.

---

## Layer Detail: FairyAnimInstance

`src/fairy/FairyAnimInstance.js` (refactored from `FairyAnim.js` at M-8). Pure renderer — receives commands via ref API, plays sprite/FX/bubble. Zero decision-making.

**Kept from FairyAnim.js:** Spritesheet rendering, poof FX (3-layer), speech bubbles, tap interaction (5-tier irritation system), dodge-poof.

**Stripped at M-8:** Autonomous scheduling loop (pawn drives timing), position logic (pawn owns positions), quip decks (controller owns line picking).

**Added at M-8:** Command API via ref, pawn callbacks (`onTapExit`, `onTapDodge`, `getDodgeSpot`).

**Positioning:** Four CSS properties fully puppeted by the pawn — position absolute, left/top in %, transform (translate, scale, rotate), transition (duration, easing). Everything the pawn sends maps directly to these values.

**Tap interaction stays self-contained.** On tap-to-nuclear-exit, fires an `onTapExit` callback so the pawn knows the fairy left.

**Audio cleanup needed:** Currently uses `new Audio()` directly for sFairyPop.mp3 — should wire through main audio system. Tracked in ToDo.md cleanup.

---

## LLM Integration (enhanced by pawn)

The pawn enables spatial intent for LLM responses. The controller already routes to LLM for complex state combos. With the pawn, the LLM response can include a target position and/or a named cue using bracket syntax. The LLM doesn't choreograph animations — it just expresses where it wants to be and the pawn handles staging. If no target is specified, the controller picks based on trigger context. Response parsing lives in `fairyAPI.js`.

---

## Wiring in App.js

Controller inits first with bus, stateProvider, and an `onCommand` callback that sends commands to the pawn. Pawn inits with animRef, and feedback callbacks (`onTapExit`, `onCueComplete`) that route back to the controller via `onPawnEvent`. No circular dependencies.

---

## Milestones

**Already complete:**

| ID | What | File |
|----|------|------|
| M-1 | Data files — rules tree + personality | `src/fairy/fairyRulesTree.js`, `src/fairy/fairyPersonality.js` |
| M-2 | State machine core | `src/fairy/fairyController.js` |
| M-4 | Bus integration — gameplay tag watching | `src/fairy/fairyController.js` |
| M-LLM | LLM client (mock mode active) | `src/fairy/fairyAPI.js`, `src/fairy/fairyConfig.js` |
| Proto | Animation prototype | `src/components/FairyAnim.js` (replaced by FairyAnimInstance) |
| M-5 | Position registry + target resolver | `src/fairy/fairyPositions.js` |
| M-6 | Cue data file | `src/fairy/fairyCues.js` |
| M-8 | AnimInstance refactor | `src/fairy/FairyAnimInstance.js` |
| M-7 | Pawn core | `src/fairy/fairyPawn.js` |
| M-9 | Controller upgrade (day-gating, pawn bridge) | `src/fairy/fairyController.js` |
| M-10 | App.js rewire | `App.js` |

**Remaining:**

| Order | ID | What | Risk | Dependencies |
|-------|----|------|------|-------------|
| 1 | M-11 | Laser FX | MEDIUM | M-7 ✅ |
| 2 | M-12 | Persistence + toggle | LOW | M-9 ✅ |
| 3 | M-13 | Special cues | LOW | M-7 ✅ |
| 4 | M-14 | Gibberish speech audio (can defer) | LOW | M-8 ✅ |

---

## Concerns

- ~~**AnimInstance refactor scope.** FairyAnim.js is ~860 lines. Stripping the loop, decks, and position data should drop it to ~400.~~ ✅ Done (M-8). Command API via ref, pawn callbacks wired.
- ~~**Pawn complexity.** The cue player is a timeline sequencer.~~ ✅ Done (M-7). setTimeout chain, not a full animation engine.
- **Target resolver on mobile.** `getBoundingClientRect` works differently when the game shell is scaled (desktop) vs full-viewport (mobile). Positions built (M-5) — needs real-device testing during Laser FX (M-11).
- ~~**Tap exit flow.** AnimInstance → pawn → controller feedback needs clean timing.~~ ✅ Done. onTapExit callback wired through all three layers.
- **FairyAnimInstance audio cleanup.** `new Audio()` direct usage should wire through main audio system for volume/mute consistency. Tracked in ToDo.md cleanup section.

## ⚠️ PRIORITY: Character/NPC System Improvements

**Why this matters:** The fairy three-layer architecture (Controller → Pawn → AnimInstance) is the foundation for ALL future characters and NPCs. Every improvement here multiplies — customers, rival smiths, quest givers, fishing NPCs will all reuse this pipeline. High bang-for-buck.

---

### Problem 1: Persistent vs Poof Cue Variants (DUCT TAPE)

**Current state:** When the fairy is already on-screen (e.g. during forge tutorial), she needs "persistent" cue variants that skip poof in/out. We created `laser_speak` and `tut_forge_speak` as copies of `LASER_POINT` and `SPEAK_IN_SCENE` with poof steps stripped. This creates a variant explosion — every cue that poofs needs a no-poof twin.

**Fix:** Add a `noPoof` context flag to `playCue`. When set, the pawn skips any `poof_in` / `poof_out` steps in the cue's step array. The presenter can then use the same cue IDs (`speak_in_scene`, `laser_point`) regardless of whether the fairy is already visible.

```
// Controller sends:
_sendCommand({ intent: "cue", cue: "speak_in_scene", noPoof: true, ... });

// Pawn checks in _executeStep:
if ((step.cmd === "poof_in" || step.cmd === "poof_out") && _activeCue.noPoof) return;
```

**Impact:** Eliminates all persistent cue variants. Any future NPC that stays on-screen for scripted sequences benefits automatically.

---

### Problem 2: Missing Intent Handlers in Pawn (DUCT TAPE)

**Current state:** The pawn's `handleCommand` is a funnel: named cue → play it, no cue → `_stageAdHoc` (which picks `speak_in_scene`). The `"clear"` intent had no handler and fell through to `_stageAdHoc`, triggering a rogue `speak_in_scene` cue that poofed the fairy away during the tutorial.

**Fix:** Add a **lightweight command layer** to `handleCommand` — an explicit intent registry that handles state commands (`clear`, `moveTo`, `setScale`, `hide`, `show`) BEFORE the cue path. These are not cues — they're direct pawn state mutations.

```
// Intent registry (checked before cue path):
// "clear"     → hide speech + retract laser, fairy stays visible
// "dismiss"   → full hide (already exists)
// "moveTo"    → reposition fairy without cue (future)
// "setScale"  → change fairy scale (future)
```

**Impact:** Future presenter methods just work. No more unhandled intents silently triggering ad-hoc staging.

---

### Problem 3: Reactive Triggers During Scripted Sequences

**Current state:** `processEvent` (bus-driven reactive triggers) had no state gate for POINTING state. During the forge tutorial, bus events from forge phase transitions fired reactive triggers that overrode the fairy's tutorial position.

**Fix applied:** Added `if (_fsmState === STATES.POINTING) return null` to `processEvent`. This is correct architecture — reactive triggers should never fire during scripted sequences.

**Consideration for NPCs:** Any future NPC controller with reactive + scripted modes needs the same pattern. Consider making this a base class behavior if we build a generic NPC controller.

---

### Problem 4: Custom Components Don't Pass data-* Attributes

**Current state:** `W.Box`, `Panel`, and other custom widget components render `<div>` but only pass `className`, `style`, and `onClick`. `data-fairy-target` attributes are silently dropped.

**Workaround:** Wrap the component in a plain `<div data-fairy-target="...">`.

**Proper fix:** Add `...rest` spread or explicit `data-*` pass-through to `Box`, `Panel`, and `Btn` components in `widgets.js` / `uiComponents.js`. This is a widget system decision — not fairy-specific.

---

### Problem 5: Step Ordering Around Async Events

**Learning:** `wait_event` must come BEFORE any `say`/`interact` that depends on the event. The QTE freeze event fires fast after `confirm_select` — if you place a `say` step before `wait_event`, the speech cue's `cue_complete` callback fires, advancing past the `wait_event` step before the actual bus event arrives. The event gets dropped.

**Rule:** In any tutorial sequence, the pattern for async events is always:
```
wait_event → interact/say (explain) → action (resolve) → delay
```
Never:
```
say (explain) → wait_event → action (resolve)
```

---

### Proposed Improvement: "Sticky" Fairy Mode

**Concept:** Controller tells pawn "fairy is pinned at position X — ignore position changes from cues." Any cue can run (speak, laser, emote) without displacing her. Only an explicit `unpin` or `moveTo` changes her position.

**Use case:** Long scripted sequences (tutorials, cutscenes, NPC conversations) where the fairy/NPC stays in one spot and just talks/points. Currently we achieve this with persistent cue variants — sticky mode would make it automatic.

**Implementation:** A `_pinned` flag on the pawn. When set, `_executePoof` and `_executeMove` become no-ops. `_doPoof` still fires the VFX burst but doesn't change position. Cleared by explicit command.

---

### Build Priority

| Order | Task | Impact | Effort |
|-------|------|--------|--------|
| 1 | `noPoof` flag on playCue | Eliminates variant cues, enables any cue in persistent mode | LOW |
| 2 | Intent registry in handleCommand | Future-proofs presenter methods, prevents rogue cues | LOW |
| 3 | `data-*` pass-through on widgets | Enables fairy targets without wrapper divs | LOW |
| 4 | Sticky/pinned mode | Simplifies all scripted sequences for any character | MEDIUM |
| 5 | Generic NPC controller base | Reusable for customers, rivals, quest NPCs | MEDIUM |