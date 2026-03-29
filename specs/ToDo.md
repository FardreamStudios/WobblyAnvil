# Wobbly Anvil — TODO

---

## IN PROGRESS

- [ ] **Build QTE System (DES-2)** — Decouple QTEs into a plugin system so any game system can request one and get a result back. RhythmQTE already exists as self-contained module — needs `onComplete` interface to conform to plugin contract.
- [ ] **Extract QTE constants** — Move tier tables, color ramp, and speed tuning from constants.js into `qteConstants.js`. Spec written in SystemSpecs.
- [ ] **Scavenge Battle System** — Shell wired (menu, battle view, circle timing QTE). Next: music transition fix, then ATB gauge or battle state machine. See `ScavengeBattleSpecs.md`.

---

## KNOWN BUGS

- [ ] **Battle music transition** — Main game music keeps playing when entering battle view. Need to mute ambient on battle enter, restore on exit. Check `useAmbientAudio` hook and `sfx.setMode("forge")` pattern in `useForgeVM` for reference.

---

## TODO

### DES-2 — QTE System
- [ ] **Build QTE Runner** — Single component replacing direct QTEPanel mount. Receives config, mounts plugin, emits QTE_RESULT on bus.
- [ ] **Extract barSweepQTE plugin** — Move needle animation, click-to-tier lookup, and rendering out of forgeComponents.js into barSweepQTE.js.
- [ ] **Adapt RhythmQTE to plugin contract** — Add `onComplete(result)` callback interface to existing rhythmQTE.js.
- [ ] **Add a new QTE type** — Prove the plugin pattern works by building a fresh QTE from scratch.

### UI / Screens
- [ ] **Extract SpeechBubble into reusable system** — `SpeechBubble` + `ChoiceBubble` in `FairyAnimInstance.js` are big and reusable. Extract into `src/systems/speechBubble/` as a standalone component/plugin usable by any character or NPC system.
- [ ] **Desktop weapon/material select polish** — Match mobile info-on-buttons pattern (diff badges, remove separate info/diff panels).
- [ ] **Fix shelf images** — Remove visible background border on weapon shelf display sprites.
- [ ] **DiamondMarker `gapUnit` ratio** — May drift ~1-2px at narrow widths. Test on smallest phones.

### DES-3 — Fairy Helper System (Three-Layer Build)
See `FairyFeatureSpecs.md` for full architecture and milestone details. Core three-layer pipeline (Controller → Pawn → AnimInstance) is live with day-gating, laser FX, persistence, and player toggle. System is shippable. Remaining work is tutorial, special cues, and polish.

- [ ] **Tutorial lockout mode** — Controller uses `_setTutorialHighlight` to block buttons during tutorial, but does NOT emit `UI_SET_LOCK` on bus (full input lock). Decide if full lock is needed or if highlight-only blocking is sufficient. Files: `fairyController.js`.
- [ ] **M-13: Special cues** — `super_saiyan`, `chase_event`, `running_head`, `fairy_insight`. Day-gated. LOW PRIORITY.
- [ ] **M-14: Gibberish speech audio** — Procedural via Web Audio, synced to speech bubbles. Can defer.

### DES-3 — QTE Pause (nice-to-have, not blocking)
Forge tutorial shipped using sandbox auto-freeze instead. QTE Pause is only needed if we want fairy to interrupt a *real* (non-sandbox) QTE mid-play.
- [ ] **Pause/resume contract** — Freeze needle/notes at exact position in QTE Runner.
- [ ] **Pause overlay** — Dim + "TAP TO RESUME" + auto-resume timeout.
- [ ] **Fairy pause triggers** — First-time QTE encounter → fairy pauses and explains.

### LLM Integration (separate workstream)
- [ ] **Tune LLM fairy setup** — System prompt refinement (voice consistency, response constraints), max_tokens tuning, game state snapshot shape optimization, response quality/length testing, conversation safety guardrails. Files: `fairyPersonality.js` (SYSTEM_PROMPT), `fairy-worker.js` (MAX_TOKENS), `fairyChatSystem.js` (state builder).
- [ ] **FTUE via LLM** — Fairy as primary onboarding via voice/text conversation (future).

### Gameplay
- [ ] **Add fishing sub-gamemode with unique QTE** — New activity mode with its own QTE type, economy loop, and scene.
- [ ] **Improve customer and NPC system** — More robust lifecycle, personality, and a "player opinion" stat.
- [ ] **Audit progression system** — Review XP curve, rank thresholds, upgrade costs, difficulty scaling.

### Cleanup
- [ ] **Improve day-start and toast management** — Toast queue is currently React state in App.js with no bus integration. Day-start toasts built by useDayVM, drained by App.js useEffect. Needs a proper toast subsystem (pure JS singleton, bus-driven) so GameMode and other systems can queue/drain toasts without React wiring. `DAY_READY` currently bridges via App.js — should be self-contained.
- [ ] **Audit App.js responsibilities** — App.js still owns toast plumbing, customer display wiring, and some state that should live in subsystems. Target: ~100 lines of pure wiring (instantiate systems, connect, render). Identify what can be extracted into pure JS singletons or moved into existing hooks/VMs.
- [ ] **FairyAnimInstance audio cleanup (remaining)** — Speech beep done (routes through global SFX gain). Button sounds (`playPop`, `playAccept`, `playDecline`) in `FairyAnimInstance.js` still use `new Audio()` directly — wire through main audio system for volume/mute consistency when needed.
- [ ] **Delete old FairyAnim.js** — `src/components/FairyAnim.js` replaced by `src/fairy/FairyAnimInstance.js`. Remove if still on disk.
- [ ] **Remove `devSkipPersist: true`** — In App.js FairyController init. Remove once forge tutorial end-to-end is verified on both mobile + desktop.
- [ ] **Strip debug logs from forgeTutorial.js** — `console.log` calls on init, step advance, auto_delay, wait_event. Remove after forge tutorial build is complete.
- [ ] **ESLint cleanup** — `no-mixed-operators` (18 warnings, 8 files), `react-hooks/exhaustive-deps` (40 warnings, 12 files, requires judgment calls), misc (5 warnings, 5 files).
- [ ] **Desktop fairy testing** — Reactive/tutorial system still untested on desktop.
- [ ] **Worker `max_tokens` support** — Redeploy with updated support.

### ⚠️ Character/NPC System Improvements (HIGH PRIORITY — multiplies across all future characters)
See `FairyFeatureSpecs.md` "Character/NPC System Improvements" section for full details and learnings.

- [ ] **Add `noPoof` flag to pawn playCue** — Skip poof_in/poof_out steps when fairy is already visible. Eliminates persistent cue variants (`laser_speak`, `tut_forge_speak`). Any cue works in persistent mode.
- [ ] **Add intent registry to pawn handleCommand** — Explicit handlers for `clear`, `moveTo`, `setScale` before the cue path. Prevents unhandled intents falling through to ad-hoc staging.
- [ ] **Add `data-*` pass-through to widget components** — `W.Box`, `Panel`, `Btn` in `widgets.js`/`uiComponents.js` should forward `data-*` attributes to the DOM. Eliminates wrapper div workaround for fairy targets.
- [ ] **Add sticky/pinned mode to pawn** — `_pinned` flag that locks fairy position during scripted sequences. Cues still fire (speak, laser, emote) but position doesn't change. Cleared by explicit unpin.
- [ ] **Prototype generic NPC controller base** — Extract reusable patterns from FairyController (FSM, bus gating, processEvent state guards, presenter interface) into a base that customers/rivals/NPCs can extend.

---

## RECENTLY COMPLETED (this session)

- [x] **Rest-while-forging UX** — Forge button morphs into Rest button when `noStamina` during `sess_result` phase. Both mobile and desktop. No layout shift. Button morphs back after rest recovers stamina.
- [x] **Strip `redirectToRest` dead code** — Removed from `useInputRouter.js` gate helper, all desktop layout branches (begin-forge, forge-again, quench, footer idle buttons). `redirectToRest` field no longer exists on gate objects.
- [x] **Rename `exhausted` → `noStamina`** — `useInputRouter.js` variable renamed. No "exhausted" concept — just a resource check. `noStamina` flag returned from input router for view-layer morph logic.
- [x] **Main menu layout shift fix** — Button zone in `screens.js` wrapped in fixed-height container (`minHeight: 100`). Audio warmup toggle no longer shifts title/fairy position.
- [x] **Morning event effects bug fix** — `useDayState.js` `DAY_ADVANCE_HOUR` handler now supports `payload.hours` (delta) in addition to `payload.hour` (absolute). Fixes Mom, Fire, Flood, and all other time-loss morning events that were silently failing.
- [x] **Level-up toast** — `usePlayerVM.js` now emits `UI_ADD_TOAST` on level-up with green toast showing new level and stat points earned. `FX_LEVEL_UP` payload enriched with `{ level }`.
- [x] **Verify UX multi-function buttons** — Stamina-use buttons confirmed working: forge morphs to rest when out of stamina. Stat allocation audio confirmed on both mobile and desktop.