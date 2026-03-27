# Wobbly Anvil — TODO

---

## DONE

- [x] **Spec FTUE system** — `FTUESpecs.md` (deleted — content merged into `FairyFeatureSpecs.md` and `FeatureSpecs.md`), `FairyCharacter.md`, `LLMIntegration.md` (deleted — content lives in `FairyCharacter.md`).
- [x] **How to Play (DES-3 Feature 1)** — `howToPlayData.js` + `HowToPlay.js` shipped. Section nav, card pagination, localStorage progress, visual slots.
- [x] **Fairy animation proto** — `FairyAnim.js` built. Spritesheet, portal rendering, 3-layer poof FX, speech bubbles, tap interaction, 5-tier irritation, dodge-poof, peek variance, tap audio.
- [x] **Fairy personality data file** — `src/fairy/fairyPersonality.js` created. 211 dialogue lines, 25 triggers, 3 fairy events, system prompt, template tokens.
- [x] **Fairy controller** — `src/fairy/fairyController.js` built. FSM, bus integration, rules evaluation, line picking, LLM routing, cooldowns, gameplay tracking.
- [x] **Fairy rules tree** — `src/fairy/fairyRulesTree.js` created. Trigger definitions with busTag, conditions, priority, cooldowns, minDay day-gating.
- [x] **Fairy data files** — `src/fairy/fairyAPI.js` (LLM fetch wrapper), `src/fairy/fairyConfig.js` (environment config).
- [x] **Fairy character bible** — `specs/FairyCharacter.md` created. Full identity, abilities, pacing, LLM architecture.
- [x] **DES-1 GameMode + Ability System** — Both live. GameMode owns day lifecycle, sub-mode switching. AbilityManager owns morning/reactive abilities with modifier system.
- [x] **DES-1.1 Customer Manager** — `src/systems/customer/customerSubSystem.js` live. Full customer lifecycle via bus.
- [x] **DES-1.1 Economy setter cleanup** — `useEconomyVM` bus handlers are the sole writer for inv/finished/gold/market modifiers.
- [x] **Batch renames — Fairy system** — 5 files moved from scattered locations into `src/fairy/`. Imports flattened.
- [x] **Batch renames — Ability system** — Entire `src/abilities/` moved to `src/systems/ability/`. Definition files gained `Ability` suffix.
- [x] **Batch renames — Customer** — `src/logic/customerManager.js` → `src/systems/customer/customerSubSystem.js`.
- [x] **Batch renames — Analytics** — `src/logic/runStats.js` replaced by config-driven `src/systems/analytics/gameplayAnalyticsSubSystem.js` + `src/config/analyticsConfig.js`.
- [x] **Batch renames — FX Cues** — `src/config/fxCueRegistry.js` + `src/hooks/useFXCues.js` merged into `src/systems/fxCue/fxCueSubSystem.js`. Converted from React hook to pure JS singleton.
- [x] **Spec audit** — Deleted redundant specs (`FTUESpecs.md`, `LLMIntegration.md`, `gameModeAbilitySystem.md`). Updated all paths and statuses across remaining specs.
- [x] **M-5: Position registry + target resolver** — `src/fairy/fairyPositions.js`. Per-scene nav mesh with depth formula, UI targets, edge peeks, dodge paths, roam zones. `data-fairy-target` attributes on layouts.
- [x] **M-6: Cue data file** — `src/fairy/fairyCues.js`. 13 named cue timelines with layer declarations and null-resolution convention.
- [x] **M-8: FairyAnimInstance refactor** — `FairyAnim.js` → `src/fairy/FairyAnimInstance.js`. Stripped autonomous loop, quip decks, position data. Command API via ref. Pawn callbacks (onTapExit, onTapDodge, getDodgeSpot).
- [x] **M-7: FairyPawn core** — `src/fairy/fairyPawn.js`. Cue player, position resolution (scene depth + overlay viewport), staging logic, dodge provider, feedback routing.
- [x] **M-10: App.js rewire** — Controller → Pawn → AnimInstance chain wired. Pawn props on both mobile + desktop mounts.
- [x] **M-9: FairyController upgrade** — Day-gating pacing table (5 tiers), `onCommand` structured commands replacing `onSpeak`, tier-scaled tick interval, daily appearance caps, minDay filter on triggers.
- [x] **M-11: Laser FX** — `fairyPawn.js`. Raw DOM SVG beam from fairy to target UI element. rAF grow animation, purple glow + dashed line, pulsing target dot. Pawn owns full lifecycle (create/destroy).
- [x] **M-12: Persistence + toggle** — `fairyController.js` localStorage for taught topics (`wa_fairy_taught`) and enabled pref (`wa_fairy_enabled`). Fairy on/off checkbox in mobile + desktop options menus. Taught topics persist across new games.
- [x] **useDayVM bug fix** — Removed dead `setCustVisitsToday`/`setMaxCustToday` calls left over from DES-1.1 customer manager migration. Cleaned up unused constant imports.
- [x] **M-15a: Fairy Tutorial intro** — `fairyTutorial.js` step sequencer (data-driven, supports adding new sequences as data). Intro cues added. Controller checks localStorage on init, delegates to tutorial if intro not done. Pawn handles `show_choice` cmd + `waitForInput` cues. AnimInstance has ChoiceBubble with tappable options. App.js wires `onPawnEvent` through to controller and passes `onChoiceSelect` prop.
- [x] **M-15b: Tutorial flow control** — Opt-in gate (yes/no prompt) separated from per-segment tutorial architecture. `talk_close` edge peek for close-range dialogue. `instant` poof support on peek positions. `intro_respond_no` includes options menu hint. Tap-to-skip with one-time warning flag (`wa_fairy_tap_warn_done`). `devSkipPersist` config flag prevents localStorage writes during testing. `FairyPawn.isReady()` query + `_waitForPawn` polling in controller.
- [x] **M-15c: DAY_READY lifecycle tag** — `eventTags.js` + `gameMode.js` `markReady()` method. GameMode gains `"ready"` day phase (after toasts drain). App.js useEffect bridges toast drain → `gm.core.markReady()`. Controller subscribes to `DAY_READY`, waits 3s settle, then fires intro or pending tutorial segments. Tutorial no longer fires on init. **Race fix**: `toastsQueuedRef` guard prevents markReady from firing before toasts are queued (App.js + useDayVM.js).
- [x] **M-15d: Tutorial flow bugs** — Fairy cue chaining fix: `_cancelTimers()` in pawn now clears both `_cueTimerIds` and `_timerIds` (stale poof-out hide timer was killing new poof_in). Removed forced `_visible = false` from cue_complete callback. Added `playPop()` audio on choice select. `data-fairy-target="rep"` added to `RepFloat.js`.
- [x] **Z-index normalization** — `theme.js` z scale expanded with named tokens: `eventBanner(15)`, `repFloat(20)`, `decreeFloat(25)`, `fairy(30)`, `fairyLaser(35)`. Normalized `options(300)`, `toast(400)`, `portrait(500)`. Applied across 7 files: theme.js, RepFloat.js, EventBanner.js, mobileLayout.js, FairyAnimInstance.js, fairyPawn.js, App.js. No more hardcoded 9999/10000/10001 values.
- [x] **Speech bubble rewrite** — `FairyAnimInstance.js` SpeechBubble + ChoiceBubble fully reworked. Removed flipBelow logic (no more below-fairy placement). Bubble anchors to sprite top edge, extends toward screen center based on fairy X position (left/center/right zones). Viewport edge clamping with tail tracking. `width: max-content` fix for overflow-hidden parent. Removed laser dodge (by-design: fairy offset from target, no overlap). Tail always points toward fairy. Both bubbles share same positioning logic.
- [x] **Fairy position mirroring** — `fairyPositions.js` `resolveUITarget()` now auto-mirrors X offset when element is on right half of viewport (handedness support). Rep bar offset tuned to `{ x: 80, y: 160 }`.
- [x] **Button tutorial text update** — Sleep button text rewritten with more personality. Timings shifted +1000ms across tut_buttons cue.
- [x] **Mystery toast bug** — `mysteryVisitorAbility.js` + `mysteryShadowAbility.js` foreshadow `UI_ADD_TOAST` replaced with `DAY_MORNING_EVENT_DISPLAY` emit (event bar, not toast).
- [x] **Merge splash + menu screens** — `SplashScreen` deleted. `MainMenu` gains `audioReady` + `onAudioWarmup` props. `useUIState` default `"splash"` → `"menu"`. One component, one visual.
- [x] **Tutorial tap behavior** — `tutorialMode` flag on AnimInstance. First tap: cancel/stash/replay warning. Second tap: skip section, dismiss at current pos, continue to next. Pawn `showWarning` + `_dismissFairy` position fix. Controller `_persistFlag` writes runtime `_flagMemory`. Sequencer gains `setFlag()` API.

---

## IN PROGRESS

- [ ] **Build QTE System (DES-2)** — Decouple QTEs into a plugin system so any game system can request one and get a result back. RhythmQTE already exists as self-contained module — needs `onComplete` interface to conform to plugin contract.
- [ ] **Extract QTE constants** — Move tier tables, color ramp, and speed tuning from constants.js into `qteConstants.js`. Spec written in SystemSpecs.

---

## TODO

### DES-2 — QTE System
- [ ] **Build QTE Runner** — Single component replacing direct QTEPanel mount. Receives config, mounts plugin, emits QTE_RESULT on bus.
- [ ] **Extract barSweepQTE plugin** — Move needle animation, click-to-tier lookup, and rendering out of forgeComponents.js into barSweepQTE.js.
- [ ] **Adapt RhythmQTE to plugin contract** — Add `onComplete(result)` callback interface to existing rhythmQTE.js.
- [ ] **Add a new QTE type** — Prove the plugin pattern works by building a fresh QTE from scratch.

### UI / Screens
- [ ] **Extract SpeechBubble into reusable system** — `SpeechBubble` + `ChoiceBubble` in `FairyAnimInstance.js` are big and reusable. Extract into `src/systems/speechBubble/` as a standalone component/plugin usable by any character or NPC system. Tail direction, screen-center extension, viewport clamping, scale-aware anchoring all portable.

### DES-3 — Fairy Helper System (Three-Layer Build)
See `FairyFeatureSpecs.md` for full architecture and milestone details. Core three-layer pipeline (Controller → Pawn → AnimInstance) is live with day-gating, laser FX, persistence, and player toggle. System is shippable. Remaining work is tutorial, special cues, and polish.

- [x] **M-11: Laser FX** — Beam from fairy to target UI element via cue step.
- [x] **M-12: Persistence + toggle** — localStorage for taught topics. On/off toggle in options menu.
- [x] **M-15: Fairy Tutorial** — Step sequencer (`fairyTutorial.js`), opt-in gate, per-segment architecture, DAY_READY timing, tap-to-skip, `devSkipPersist`. First segment `tut_rep` (laser at rep bar). Needs end-to-end testing.
- [ ] **M-15 testing** — Intro flow working. tut_rep and tut_buttons both fire and complete. Tutorial tap warning + skip working (cancel/stash/replay pattern). Dismiss poof at correct position. `devSkipPersist: true` still set in App.js controller init — remove when done testing. Day 2+ fairy firing needs verification (useDayVM toastsQueuedRef fix deployed but untested). Debug logs: fairyTutorial.js still has `console.log` on `start()` call.
- [ ] **Tutorial lockout mode** — Controller emits `UI_SET_LOCK` on bus when tutorial starts, `UI_SET_LOCK {locked: false}` on complete/skip. Reuses existing lock mechanism (mystery events already use it). Files: `fairyController.js` — emit in `_onTutorialComplete` intro_complete→show me path, and in `_checkPendingSegments` before starting segments. Clear on `_skipTutorialSegment` and `segment_complete`.
- [ ] **Fairy forge tutorial (tut_forge)** — Fairy simulates a forge session during tutorial. Waves laser at QTE bar, bar flashes/freezes, fairy explains each phase. Requires QTE pause contract (DES-3 QTE Pause). New cue in `fairyCues.js`, new sequence in `fairyTutorial.js`. Blocked by: QTE pause/resume, tutorial lockout.
- [ ] **M-13: Special cues** — `super_saiyan`, `chase_event`, `running_head`, `fairy_insight`. Day-gated. LOW PRIORITY.
- [ ] **M-14: Gibberish speech audio** — Procedural via Web Audio, synced to speech bubbles. Can defer.

### DES-3 — QTE Pause (blocked by DES-2 + Fairy M-7 ✅)
- [ ] **Pause/resume contract** — Freeze needle/notes at exact position in QTE Runner.
- [ ] **Pause overlay** — Dim + "TAP TO RESUME" + auto-resume timeout.
- [ ] **Fairy pause triggers** — First-time QTE encounter → fairy pauses and explains.

### LLM Integration (separate workstream)
- [ ] **Cloudflare Worker setup** — Create account, deploy proxy worker with API key.
- [ ] **Wire into fairyController.js** — Tier 2 dialogue calls for complex state combos. `src/fairy/fairyAPI.js` and `src/fairy/fairyConfig.js` already exist.
- [ ] **fairyMic.js** — Voice input via Web Speech API (future).
- [ ] **FTUE via LLM** — Fairy as primary onboarding via voice/text conversation (future).

### Gameplay
- [ ] **Add fishing sub-gamemode with unique QTE** — New activity mode with its own QTE type, economy loop, and scene.
- [ ] **Improve customer and NPC system** — More robust lifecycle, personality, and a "player opinion" stat.
- [ ] **Audit progression system** — Review XP curve, rank thresholds, upgrade costs, difficulty scaling.

### Cleanup
- [ ] **Improve day-start and toast management** — Toast queue is currently React state in App.js with no bus integration. Day-start toasts built by useDayVM, drained by App.js useEffect. Needs a proper toast subsystem (pure JS singleton, bus-driven) so GameMode and other systems can queue/drain toasts without React wiring. `DAY_READY` currently bridges via App.js — should be self-contained.
- [ ] **Audit App.js responsibilities** — App.js still owns toast plumbing, customer display wiring, and some state that should live in subsystems. Target: ~100 lines of pure wiring (instantiate systems, connect, render). Identify what can be extracted into pure JS singletons or moved into existing hooks/VMs.
- [ ] **Verify UX multi-function buttons** — Stamina-use buttons should call wait/rest inline.
- [ ] **Fix shelf images** — Remove visible background border on weapon shelf display sprites.
- [ ] **FairyAnimInstance audio cleanup** — `new Audio()` direct usage in `src/fairy/FairyAnimInstance.js` should wire through main audio system for volume/mute consistency.
- [ ] **Delete old FairyAnim.js** — `src/components/FairyAnim.js` replaced by `src/fairy/FairyAnimInstance.js`. Remove if still on disk.