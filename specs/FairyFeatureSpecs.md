# Fairy System — Three-Layer Architecture Spec

**Status:** ⚠️ IN PROGRESS  
**Risk:** MEDIUM — pawn is new orchestration layer, anim refactor touches working proto  
**Character bible:** See `FairyCharacter.md` for identity, voice, pacing, abilities, and LLM design.

Three-layer puppet architecture following UE conventions. Controller decides intent. Pawn translates intent into stage directions. AnimInstance executes the visual. Bus-listener architecture — read-only on game state. Day-gated pacing from FairyCharacter.md.

---

## Architecture

| Layer | UE Analogy | File | Job |
|-------|-----------|------|-----|
| FairyController | AIController | `src/fairy/fairyController.js` | The brain. Decides WHEN to act and WHAT to say. FSM, rules evaluation, line picking, LLM routing, day-gating, pacing. |
| FairyPawn | Pawn / Character | `src/fairy/fairyPawn.js` | The thing in the world. Decides WHERE to go and HOW. Position registry, target resolver, cue playback, action queue. |
| FairyAnimInstance | AnimInstance | `src/components/FairyAnimInstance.js` | Pure animation player. Receives commands, plays sprite/FX/bubble. Zero decision-making. |

Communication flows one direction: **Controller → Pawn → AnimInstance**. Controller possesses the Pawn. Pawn owns the AnimInstance. Each layer only talks to the one below it.

---

## File Map

**Built (in `src/fairy/`):**

| File | Status |
|------|--------|
| `fairyController.js` | ✅ Built — FSM, bus integration, rules eval, line picking, LLM routing |
| `fairyRulesTree.js` | ✅ Built — trigger definitions with busTag, conditions, priority, cooldowns |
| `fairyPersonality.js` | ✅ Built — 211 lines, 25 categories, 3 fairy events, system prompt, template tokens |
| `fairyAPI.js` | ✅ Built — LLM fetch wrapper with timeout, validation, gibberlese fallback |
| `fairyConfig.js` | ✅ Built — environment switching (local dev vs production worker URL) |

**Built (in `src/components/`):**

| File | Status |
|------|--------|
| `FairyAnim.js` | ✅ Proto — spritesheet, portal rendering, poof FX, speech bubbles, tap interaction. Becomes `FairyAnimInstance.js` at M-8. |

**Not yet built:**

| File | Location | Milestone |
|------|----------|-----------|
| `fairyPawn.js` | `src/fairy/` | M-7 |
| `fairyCues.js` | `src/fairy/` | M-6 |
| `fairyPositions.js` | `src/fairy/` | M-5 |

---

## Layer Detail: FairyController

Pure JS singleton. The brain — possesses the pawn, never touches visuals.

**Current capabilities:** FSM (`off → idle → pointing → escalating → flustered → exiting → dismissed`), trigger evaluation against rules tree (bus events + ambient tick), line picking from personality data (shuffle deck), LLM routing when no static line matches, cooldowns, once-flags, escalation counts, bus subscriptions, gameplay tracking.

**Gains at M-9:** Day-gating (checks current day against rule `minDay` + pacing table), pacing clock (scales ambient tick interval by day tier), pawn bridge (sends structured commands instead of raw lines).

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

New file (M-7). Pure JS singleton (no React). The fairy's physical presence in the world.

**Owns:** Position registry (all named positions, static and dynamic), target resolver (`data-fairy-target` → viewport % via `getBoundingClientRect`), action queue (sequential commands with timing), cue playback (reads cue definitions from `fairyCues.js`, steps through timeline), staging logic (picks approach direction, peek edge, hover offset based on target location).

**Does NOT own:** When to act (controller decides), what to say (controller decides), how animations render (AnimInstance does).

**Position Registry** (`fairyPositions.js`, M-5): Defines four types — static positions (hardcoded viewport %), dynamic positions (resolved at runtime from `data-fairy-target` elements with offsets), roam zones (rectangular areas for wandering), and edge peeks (from/to coordinate pairs for peek animations from screen edges). The pawn caches resolved positions and invalidates on window resize.

**Cue System** (`fairyCues.js`, M-6): Named timelines of pawn commands. Each cue is an object with an id, description, and steps array. Each step has an `at` time (ms from cue start) and a `cmd` (poof_in, poof_out, move, speak, emote, set_anim, play_audio, play_fx, laser_on, laser_off, set_tappable). Null values in cues are placeholders resolved by the pawn at playback time — `text: null` fills from controller's line, `x: null` resolves from target, `duration: null` calculates from text length. This keeps cues reusable across different triggers.

**Planned cues:** silent_peek, silent_poof, speak_at_target, crash_entrance, fairy_rescue, fairy_blessing, running_head, super_saiyan, chase_event.

**FX routing:** Fairy cue FX/audio steps emit bus tags (e.g. FX_FAIRY_RUBBLE), routed through the existing `fxCueSubSystem`. No separate FX pipeline for fairy.

---

## Layer Detail: FairyAnimInstance

Refactored from `FairyAnim.js` at M-8. Pure renderer — receives commands, plays sprite/FX/bubble. Zero decision-making.

**Keeps from FairyAnim.js:** Spritesheet rendering, poof FX (3-layer), speech bubbles, tap interaction (5-tier irritation system), dodge-poof.

**Strips:** Autonomous scheduling loop (pawn drives timing after refactor), position logic (pawn owns positions), quip decks (controller owns line picking).

**Positioning:** Four CSS properties fully puppeted by the pawn — position absolute, left/top in %, transform (translate, scale, rotate), transition (duration, easing). Everything the pawn sends maps directly to these values.

**Tap interaction stays self-contained.** On tap-to-nuclear-exit, fires an `onTapExit` callback so the pawn knows the fairy left.

**Audio cleanup needed:** Currently uses `new Audio()` directly for sFairyPop.mp3 — should wire through main audio system. Blocked until M-8.

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
| Proto | Animation prototype | `src/components/FairyAnim.js` |

**Remaining:**

| Order | ID | What | Risk | Dependencies |
|-------|----|------|------|-------------|
| 1 | M-5 | Position registry + target resolver | LOW | None |
| 2 | M-6 | Cue data file | LOW | None |
| 3 | M-8 | AnimInstance refactor | MEDIUM | None (can test standalone) |
| 4 | M-7 | Pawn core | MEDIUM | M-5, M-6, M-8 |
| 5 | M-9 | Controller upgrade (day-gating, pawn bridge) | MEDIUM | M-7 |
| 6 | M-10 | App.js rewire | LOW | M-7, M-8, M-9 |
| 7 | M-11 | Laser FX | MEDIUM | M-7 |
| 8 | M-12 | Persistence + toggle | LOW | M-9 |
| 9 | M-13 | Special cues | LOW | M-7 |
| 10 | M-14 | Gibberish speech audio (can defer) | LOW | M-8 |

---

## Concerns

- **AnimInstance refactor scope.** FairyAnim.js is ~860 lines. Stripping the loop, decks, and position data should drop it to ~400. Tap interaction stays but dodge positions need to come from pawn instead of hardcoded arrays.
- **Pawn complexity.** The cue player is a timeline sequencer. Keep it simple — `setTimeout` chain, not a full animation engine.
- **Target resolver on mobile.** `getBoundingClientRect` works differently when the game shell is scaled (desktop) vs full-viewport (mobile). Test early.
- **Tap exit flow.** AnimInstance → pawn → controller feedback needs clean timing — no orphaned state.