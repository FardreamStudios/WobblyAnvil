# Wobbly Anvil — TODO

---

## DONE

- [x] **Spec FTUE system** — `FTUESpecs.md` (deleted — content merged into `FairyFeatureSpecs.md` and `FeatureSpecs.md`), `FairyCharacter.md`, `LLMIntegration.md` (deleted — content lives in `FairyCharacter.md`).
- [x] **How to Play (DES-3 Feature 1)** — `howToPlayData.js` + `HowToPlay.js` shipped. Section nav, card pagination, localStorage progress, visual slots.
- [x] **Fairy animation proto** — `FairyAnim.js` built. Spritesheet, portal rendering, 3-layer poof FX, speech bubbles, tap interaction, 5-tier irritation, dodge-poof, peek variance, tap audio.
- [x] **Fairy personality data file** — `src/fairy/fairyPersonality.js` created. 211 dialogue lines, 25 triggers, 3 fairy events, system prompt, template tokens.
- [x] **Fairy controller** — `src/fairy/fairyController.js` built. FSM, bus integration, rules evaluation, line picking, LLM routing, cooldowns, gameplay tracking.
- [x] **Fairy rules tree** — `src/fairy/fairyRulesTree.js` created. Trigger definitions with busTag, conditions, priority, cooldowns.
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

### DES-3 — Fairy Helper System (Three-Layer Build)
See `FairyFeatureSpecs.md` for full architecture and milestone details. Current state: controller, rules tree, personality data, animation proto, LLM client all built. Remaining work is the pawn layer, anim refactor, and wiring.

- [ ] **M-5: Position registry + target resolver** — `src/fairy/fairyPositions.js` + target resolver in pawn. `data-fairy-target` attributes on layouts.
- [ ] **M-6: Cue data file** — `src/fairy/fairyCues.js`. Named cue timelines as pure data.
- [ ] **M-7: FairyPawn core** — `src/fairy/fairyPawn.js`. Action queue, cue player, staging logic.
- [ ] **M-8: FairyAnimInstance refactor** — Strip `FairyAnim.js` → `FairyAnimInstance.js`. Kill autonomous loop, expose command interface via ref.
- [ ] **M-9: FairyController upgrade** — Add day-gating pacing table. Wire `onCommand` to pawn. Scale ambient tick by tier.
- [ ] **M-10: App.js rewire** — Wire controller → pawn → animInstance chain. Test end-to-end.
- [ ] **M-11: Laser FX** — Beam from fairy to target UI element via cue step.
- [ ] **M-12: Persistence + toggle** — localStorage for taught topics. On/off toggle in options menu.
- [ ] **M-13: Special cues** — `super_saiyan`, `chase_event`, `running_head`, `fairy_insight`. Day-gated.
- [ ] **M-14: Gibberish speech audio** — Procedural via Web Audio, synced to speech bubbles. Can defer.

### DES-3 — QTE Pause (blocked by DES-2 + Fairy M-7)
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
- [ ] **Verify UX multi-function buttons** — Stamina-use buttons should call wait/rest inline.
- [ ] **Fix shelf images** — Remove visible background border on weapon shelf display sprites.
- [ ] **FairyAnim audio cleanup** — `new Audio()` direct usage should wire through main audio system for volume/mute consistency. Blocked until M-8 (AnimInstance refactor).