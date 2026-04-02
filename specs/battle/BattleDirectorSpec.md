# Battle Director Spec

**Status:** DRAFT — Pending approval
**Date:** 2026-04-01
**File:** `src/battle/managers/battleDirector.js`
**Depends on:** battleEngagement.js, battleAI.js, battleState.js, battleSkills.js, battlePlaybackManager.js, battleSFX.js, defenseTiming.js, battleConstants.js

---

## 1. Problem

BattleView is currently the GameMode, PlayerController, and HUD in one 1700-line file. It decides what happens next, manages the cam lifecycle, runs AI, handles turns, AND renders everything. The result:

- Stale AP refs — enemies see 0 AP and never act
- TURN_END echo loops — advance() emits TURN_END, the loop hears it, calls advance() again
- No breathing room — cam-out hasn't finished before the next cam-in starts
- Wave 2 fires during the banner — reroll triggers the first turn instantly
- Running flag race conditions — React setState hasn't rendered before timeout callbacks check the ref

Root cause: three independent systems (turn loop hook, phase machine, cam lifecycle) communicate through bus events and setTimeout chains with no single authority enforcing "X must finish before Y starts."

---

## 2. Solution

Extract the brain into **BattleDirector** — a plain JS object that owns a private step-queue (sequencer) and all "what happens next" decisions.

| Role | UE Analogy | File | Owns |
|------|-----------|------|------|
| **BattleDirector** | GameMode | `managers/battleDirector.js` | Sequencer, turn order, AP state, flow decisions, AI calls, win/loss checks |
| **BattleView** | HUD + thin PlayerController | `BattleView.js` | Rendering, user input forwarding, visual completion reporting |
| **BattleCharacter** | Pawn | `components/BattleCharacter.js` | Sprite, choreography, brackets (unchanged) |
| **PlaybackManager** | Ability System | `managers/battlePlaybackManager.js` | Beat-by-beat choreography + defense (unchanged, but called by Director instead of BattleView) |

---

## 3. The Sequencer (Private)

Lives inside `battleDirector.js`. Not exported. ~15 lines.

A queue of step functions. Each step receives a `done` callback. Nothing advances until the current step calls `done()`. That's the entire contract.

The sequencer knows nothing about battles, AP, phases, or anything else. It just runs functions in order.

---

## 4. The Bridge

The Director needs to poke React (set phases, trigger QTE, etc.) but doesn't import React. It receives a **bridge object** on creation — a bag of callbacks that BattleView provides.

### Bridge Shape

| Callback | What it does | Who calls done() |
|----------|-------------|-----------------|
| `setPhase(phase)` | Sets the current battle phase for rendering | — (instant, no done needed) |
| `setTargetId(id)` | Sets the selected target | — (instant) |
| `setTurnOwnerId(id)` | Sets whose turn it is for UI indicators | — (instant) |
| `activateQTE(config, onComplete)` | Mounts the QTE component. `onComplete(resultsArray)` fires when the player finishes. | Director calls `done()` inside `onComplete` |
| `runPlaybackOffense(ctx, onComplete)` | Delegates to PlaybackManager.runOffense. `onComplete` fires when all beats finish. | Director calls `done()` inside `onComplete` |
| `runPlaybackDefense(ctx, onComplete)` | Delegates to PlaybackManager.runDefense. `onComplete` fires when all beats finish. | Director calls `done()` inside `onComplete` |
| `showCounterPrompt(responderId, cost, onDecision)` | Shows counter YES/NO UI. `onDecision(accepted)` fires on player tap. | Director calls `done()` inside `onDecision` |
| `spawnDamageNumber(combatantId, value, color)` | Floating damage text | — (fire and forget) |
| `spawnSkillName(name, combatantId, color)` | Floating skill label | — (fire and forget) |
| `setAnimState(combatantId, animName)` | Sets choreography class on a pawn | — (instant) |
| `clearAnimState(combatantId)` | Removes choreography class | — (instant) |
| `triggerShake(level)` | Screen shake | — (fire and forget) |
| `bumpState()` | Force React re-render for bState changes | — (instant) |

BattleView creates these callbacks as closures in its own scope — they already have access to `useState` setters, refs, and everything else. The Director never imports BattleView. BattleView never imports the Director's internals.

---

## 5. State Ownership Transfer

### Moves FROM BattleView TO Director

| State | Why |
|-------|-----|
| AP state (apState map) | Director earns/spends AP as part of the step chain. No stale ref problem because it reads its own local variable, not a React ref. |
| Turn order + turn index | Director owns initiative rolls, advancement, dead-skip. |
| Current turn combatant ID | Director tracks whose turn it is. Tells BattleView via `bridge.setTurnOwnerId`. |
| Exchange state (camExchangeRef) | Director builds the exchange object and tracks initiator/responder/counter. |
| Wave index | Director handles wave transitions. |

### Stays IN BattleView

| State | Why |
|-------|-----|
| phase | React rendering concern — Director sets it via bridge, View owns the useState. |
| animState | Visual — driven by bus events from PlaybackManager (unchanged). |
| damageNumbers | Visual — spawned by bridge callbacks. |
| shakeLevel, flashId | Visual feedback. |
| menuOpen flags (skill, item) | UI state — player input, stays in View. |
| targetId | UI selection state — Director reads it when needed via a getter, but View owns the display. |
| stageScale | Pure layout. |

### Stays in BattleState (bState)

HP, items, KO, buffs, damage application, result building. Unchanged. Director holds the reference and passes it to PlaybackManager and AI.

---

## 6. Director API

### Creation

`createBattleDirector(bridge, config)` → director object

Config contains: party data, enemy waves, battleConstants (ENGAGEMENT, ACTION_CAM, EXCHANGE, CHOREOGRAPHY, etc.), BattleSkills, BattleAI, BattleEngagement, BattleSFX, DefenseTiming, PlaybackManager, bState.

### Public Methods (called by BattleView)

| Method | When BattleView calls it | What the Director does |
|--------|------------------------|----------------------|
| `start()` | Player presses "Start Battle" | Roll initiative, seed AP at 0, enqueue first turn, run |
| `onPlayerAction(actionId, skillId, targetId)` | Player confirms a formation action (attack, defend, item, flee, wait) | Validates AP, enqueues appropriate step chain, runs |
| `onPlayerCounterDecision(accepted)` | Player taps YES/NO on counter prompt | Feeds the decision to the waiting step's callback |
| `onCamInComplete()` | CSS cam-in transition finishes | Calls `done()` on the current cam-in step |
| `onCamOutComplete()` | CSS cam-out transition finishes | Calls `done()` on the current cam-out step |
| `getApState()` | BattleView needs AP values for rendering bars | Returns the director's current AP map |
| `getTurnOrder()` | BattleView needs portrait order for turn strip | Returns current initiative order array |
| `getCurrentTurnId()` | BattleView needs to highlight whose turn | Returns combatant ID or null |
| `fillAllAP()` | Dev control | Sets all AP to max |
| `reset()` | Dev control | Clears sequencer, resets all state |
| `destroy()` | BattleView unmounts | Clears sequencer, nulls references |

### Private Methods (internal)

| Method | What it does |
|--------|-------------|
| `enqueueTurn(combatantId)` | Builds the full step chain for one combatant's turn and loads it into the sequencer |
| `enqueuePlayerTurn(combatantId)` | Earn AP → set phase TURN_ACTIVE → **wait** (player acts via onPlayerAction) |
| `enqueueEnemyTurn(combatantId)` | Earn AP → AI decision → enqueueExchange → advance |
| `enqueueExchange(initiatorId, targetId, skill)` | Cam in → QTE (if player) → Playback → counter check → (counter swing) → cam out → breathing pause |
| `enqueueWaveTransition()` | Show banner → wait for duration → swap enemies → reroll initiative → enqueue first turn |
| `enqueueBattleEnd(outcome)` | Freeze → hold → build result → notify BattleView |
| `advanceToNextTurn()` | Skip dead, wrap at round boundary, enqueue next combatant's turn |
| `checkWipeAfterSwing()` | After any swing resolves: party wiped? Enemy wiped? Last wave? → branch to end or wave transition or continue |

---

## 7. Step Chains

Every action the Director takes is broken into discrete steps. Each step does one thing and calls `done()` when finished. Listed below in execution order.

### 7a. Battle Start

1. Roll initiative → store turn order
2. Init AP state (all at 0)
3. Set phase INTRO (if applicable) or go straight to first turn
4. `enqueueTurn(turnOrder[0])`

### 7b. Player Turn

1. **Earn AP** for this combatant. Instant. `done()`.
2. **Clear defend buffs** from last round. Instant. `done()`.
3. **Set phase** → `TURN_ACTIVE`. Tell bridge `setTurnOwnerId`. `done()`.
4. **Wait.** The sequencer pauses here. No `done()` is called until the player acts. When BattleView calls `director.onPlayerAction()`, the director validates the action, then:
    - **Wait action** → `done()` immediately. Fall through to advance.
    - **Defend** → spend AP, apply buff via bState, spawn feedback, `done()`. If AP remains and player hasn't committed to a skill, re-enqueue another wait step (player can chain formation actions).
    - **Item** → spend AP, apply effect via bState, spawn feedback, `done()`. Same re-enqueue logic.
    - **Flee** → spend AP, roll chance. Success → `enqueueBattleEnd("fled")`. Fail → `done()`, turn over.
    - **Attack (skill)** → spend AP, `enqueueExchange(...)`, those steps run, then advance.

### 7c. Enemy Turn

1. **Earn AP** for this combatant. Instant. `done()`.
2. **Clear defend buffs**. Instant. `done()`.
3. **AI decision** — call `BattleAI.pickAction` with the Director's own AP state (no stale ref). If null (can't afford anything), skip to advance. `done()`.
4. **Set target** via bridge. `done()`.
5. → `enqueueExchange(enemyId, targetId, skill)` (steps below run).
6. → `advanceToNextTurn()`.

### 7d. Exchange (One Trade)

This is the core cam sequence. Same steps whether initiator is player or enemy — the only difference is who gets the QTE and who gets the defense playback.

1. **Cam In** — `bridge.setPhase(ACTION_CAM_IN)`. Step waits. BattleView calls `director.onCamInComplete()` when CSS transition finishes. `done()`.
2. **Skill Name** — `bridge.spawnSkillName(...)`. Short hold (configurable ms). `done()` after hold.
3. **Initiator Swing:**
    - If initiator is player → **QTE step**: `bridge.activateQTE(config, onComplete)`. Waits for player. `done()` on complete.
    - If initiator is enemy → no QTE step (skip).
4. **Playback** — `bridge.runPlaybackOffense` or `bridge.runPlaybackDefense` depending on who's swinging. Step waits for playback to call `onComplete`. `done()`.
5. **Wipe Check** — party wiped? → `enqueueBattleEnd("ko")`, return. Enemies wiped? → check if last wave → `enqueueBattleEnd("victory")` or `enqueueWaveTransition()`, return. Otherwise continue. Instant. `done()`.
6. **Counter Check:**
    - Is responder alive? Can they afford counter cost? If no → skip to cam out.
    - If responder is player → **Counter Prompt step**: `bridge.showCounterPrompt(...)`. Waits for player decision. If declined → skip to cam out. If accepted → spend AP, enqueue counter swing (steps 3–5 again with swapped roles), then cam out.
    - If responder is enemy → AI always counters if affordable (V1). Spend AP, enqueue counter swing, then cam out.
7. **Cam Out** — `bridge.setPhase(ACTION_CAM_OUT)`. Step waits. BattleView calls `director.onCamOutComplete()` when CSS transition finishes. `done()`.
8. **Breathing Pause** — short hold (200–400ms, tunable in constants). Lets the player's eyes settle before the next turn. `done()` after timeout.

### 7e. Wave Transition

1. **Set phase** → `WAVE_TRANSITION`. `done()`.
2. **Show banner** — wait for banner duration (from constants). `done()` after timeout.
3. **Swap enemies** — update bState, merge AP state (party keeps AP, new enemies at 0), clear visual state. Instant. `done()`.
4. **Reroll initiative** — new turn order for all living combatants. Instant. `done()`.
5. **Breathing pause** — short hold for the player to read the new field. `done()`.
6. → `enqueueTurn(newTurnOrder[0])`.

### 7f. Battle End

1. **Set phase** → `BATTLE_ENDING`. Clear sequencer (no more steps after this). `done()`.
2. **KO hold** — dramatic pause (from constants). `done()` after timeout.
3. **Build result** — `bState.buildResult(outcome)`. Tell BattleView to show results screen. `done()`.

---

## 8. What BattleView Becomes

After extraction, BattleView drops from ~1700 lines to roughly ~800. It becomes a pure responder:

### Keeps
- All `useState` / `useRef` for visual state (phase, animState, damageNumbers, shakeLevel, etc.)
- Render function (JSX) — unchanged
- Playback bus subscribers (ANIM_SET, SHAKE, SPAWN_DAMAGE, etc.) — unchanged
- Stage scale hook — unchanged
- Scene touch/click handlers for defense input — unchanged
- Menu open/close UI logic — unchanged
- Dev controls — rewired to call `director.fillAllAP()`, `director.reset()`

### Loses
- `useBattleTurnLoop` hook — **deleted entirely**. Director owns turns.
- `startExchange`, `doCamSwing`, `handlePostSwing`, `camOut` — **deleted**. Director enqueues these as steps.
- `endFormationTurn`, `endFormationTurnFor` — **deleted**. Director advances turns.
- `handleAction` router (attack/defend/item/flee/wait) — **replaced** with thin pass-through to `director.onPlayerAction()`.
- `handleCounterAccept`, `handleCounterDecline` — **replaced** with `director.onPlayerCounterDecision()`.
- Auto-end effect (`useEffect` watching phase + AP) — **deleted**. Director handles this.
- TURN_START bus subscriber — **deleted**. Director drives turns directly.
- AP state (`apState`, `apStateRef`) — **deleted from View**. Director owns it. View reads via `director.getApState()` for rendering.
- Turn order state — **deleted from View**. View reads via `director.getTurnOrder()`.
- All setTimeout chains for flow control — **deleted**. Sequencer handles all timing.

### New (thin wiring)
- Create director in `useRef` on mount, pass bridge callbacks.
- `onTransitionEnd` handler on cam-in/cam-out CSS → calls `director.onCamInComplete()` / `director.onCamOutComplete()`.
- `handleAction` becomes a 5-line function that calls `director.onPlayerAction(actionId, skillId, targetId)`.

---

## 9. What Gets Deleted

| File | Status |
|------|--------|
| `hooks/useBattleTurnLoop.js` | **Delete** — Director owns turns |
| `systems/battleEngagement.js` | **Keep** — Director imports it for AP math. Pure functions, still useful. |
| `systems/battleAI.js` | **Keep** — Director calls `pickAction`. Unchanged. |
| `systems/battleATB.js` | **Delete if still present** — fully replaced by engagement system |

---

## 10. What Doesn't Change

- **BattleCharacter** — still a pawn. Props in, renders, reports clicks.
- **PlaybackManager** — still runs beat-by-beat choreography. Called by Director via bridge instead of directly by BattleView. Internal logic unchanged.
- **BattleSFX** — still stateless sound triggers.
- **DefenseTiming** — still manages defense windows. Scene touch handlers in BattleView still feed into it.
- **battleState (bState)** — still owns HP, items, KO, buffs, damage. Director holds the reference.
- **battleSkills** — still defines skills and beats. Director passes them to exchange steps.
- **battleConstants** — still single source of truth for tuning values.
- **battleTags + battleBus** — bus stays for fire-and-forget visual events (ANIM_SET, SHAKE, FLASH, SPAWN_DAMAGE). Flow control events (TURN_START, TURN_END, AP_EARNED, etc.) become internal Director operations — no longer need bus tags.
- **All CSS** — unchanged.
- **All choreography** — unchanged.
- **Chalkboard / QTERunner** — unchanged. Mounted by View, completion callback wired to Director step.

---

## 11. Defense Input — Special Case

Defense input (brace/dodge) during enemy attacks is interactive and happens *during* the playback step. This is the one place where BattleView talks to the Director mid-step.

The flow: PlaybackManager runs defense beats → emits BEAT_DEFENSE_WINDOW via bus → BattleView's scene touch handler feeds input to DefenseTiming → DefenseTiming resolves the outcome → PlaybackManager's `defenseInputResolveRef` gets the result and continues.

This pipeline stays exactly as-is. It doesn't go through the Director because it's a sub-step *within* the playback step. The Director just waits for the entire playback to call `onComplete`. The defense interaction is internal to the playback/BattleView handshake.

---

## 12. Migration Path

This is a full rewrite of BattleView's brain, but NOT a rewrite of any other file. The approach:

1. **Create `battleDirector.js`** with sequencer, bridge contract, all step chains. New file, additive.
2. **Modify `BattleView.js`** — create director in ref, wire bridge, delete all flow-control code, keep all rendering and visual state.
3. **Delete `useBattleTurnLoop.js`** — Director replaces it entirely.
4. **Verify** — same visual behavior, but now properly sequenced.

Risk: **HIGH** for the BattleView edit (gutting ~900 lines and replacing with ~100 lines of director wiring). LOW for the new Director file (additive, no existing code touched). LOW for the deletion (clean removal of fully replaced hook).

Recommendation: Build the Director first (additive, testable in isolation). Then do the BattleView surgery in one focused session with both files uploaded.

---

## 13. Bus Tag Cleanup (Post-Migration)

After the Director is wired, these bus tags become dead code — they were only used for flow control between the turn loop and BattleView:

| Tag | Status |
|-----|--------|
| `TURN_START` | **Remove** — Director calls turns directly |
| `TURN_END` | **Remove** — Director advances directly |
| `AP_EARNED` | **Remove** — Director updates AP internally |
| `AP_SPENT` | **Remove** — Director updates AP internally |
| `INITIATIVE_ROLLED` | **Remove** — Director stores order internally |
| `COUNTER_PROMPT` | **Remove** — Director uses bridge callback |
| `COUNTER_ACCEPTED` | **Remove** — Director handles internally |
| `COUNTER_DECLINED` | **Remove** — Director handles internally |

Tags that **stay** (visual / fire-and-forget):

| Tag | Why |
|-----|-----|
| `ANIM_SET` / `ANIM_CLEAR` | PlaybackManager → BattleView visual state |
| `FLASH` | PlaybackManager → BattleView flash effect |
| `SHAKE` | PlaybackManager → BattleView screen shake |
| `SPAWN_DAMAGE` | PlaybackManager → BattleView damage numbers |
| `SPAWN_SKILL_NAME` | PlaybackManager → BattleView skill label |
| `BEAT_RESOLVE` | PlaybackManager internal tracking |
| `BEAT_DEFENSE_WINDOW` | PlaybackManager → BattleView defense input |
| `PHASE_CHANGE` | Optional — Director can emit for debug/observer |

---

## 14. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should the Director expose AP state as a getter, or should it push AP changes to BattleView via a bridge callback (`onAPChanged`)? Getter is simpler but means View re-renders are driven by something else (phase changes). Push gives View control over when to re-render for AP bar updates. | TBD |
| 2 | Breathing pause duration between turns — flat constant or scaled by context (longer after wave transition, shorter between same-side turns)? | TBD — playtest |
| 3 | Should the Director own the `bState` reference, or should it receive a fresh reference each time BattleView re-renders? bState is a mutable object held in a ref — not a React state — so passing once on creation should be fine. | Leaning: pass once |
| 4 | PlaybackManager completion callback — it currently signals completion by emitting a SWING_COMPLETE bus event. Should this be refactored to accept an `onComplete` callback directly? Cleaner for the Director pattern. | Leaning: yes, add onComplete param |