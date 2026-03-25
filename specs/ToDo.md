# Wobbly Anvil — TODO

---

## DONE

- [x] **Spec FTUE system** — `FTUESpecs.md`, `FairyCharacter.md`, `LLMIntegration.md` all complete.
- [x] **How to Play (DES-3 Feature 1)** — `howToPlayData.js` + `HowToPlay.js` shipped. Section nav, card pagination, localStorage progress, visual slots.
- [x] **Fairy animation proto** — `FairyAnim.js` built. Spritesheet, portal rendering, 3-layer poof FX, speech bubbles, tap interaction, 5-tier irritation, dodge-poof, peek variance, tap audio.
- [x] **Fairy personality data file** — `fairyPersonality.js` created. 211 dialogue lines, 25 triggers, 3 fairy events, system prompt, template tokens.
- [x] **Fairy character bible** — `specs/FairyCharacter.md` created. Full identity, abilities, pacing, LLM architecture.
- [x] **LLM integration spec** — `specs/LLMIntegration.md` created. Cloudflare Worker, API client, voice input, environment config, full setup guide.

---

## IN PROGRESS

- [ ] **Build QTE System (DES-2)** — Decouple QTEs into a plugin system so any game system can request one and get a result back. RhythmQTE already exists as self-contained module — needs `onComplete` interface to conform to plugin contract.
- [ ] **Extract QTE constants** — Move tier tables, color ramp, and speed tuning from constants.js into `qteConstants.js`. Spec written in SystemSpecs.
- [ ] **Fairy Helper System (DES-3 Feature 2)** — Proto animation built. Remaining: state machine (`fairyHelper.js`), renderer split (`fairyRenderer.js`), bus integration, laser FX, persistence, options toggle. See FTUESpecs.md milestones M-2 through M-9.

---

## TODO

### DES-2 — QTE System
- [ ] **Build QTE Runner** — Single component replacing direct QTEPanel mount. Receives config, mounts plugin, emits QTE_RESULT on bus.
- [ ] **Extract barSweepQTE plugin** — Move needle animation, click-to-tier lookup, and rendering out of forgeComponents.js into barSweepQTE.js.
- [ ] **Adapt RhythmQTE to plugin contract** — Add `onComplete(result)` callback interface to existing rhythmQTE.js.
- [ ] **Add a new QTE type** — Prove the plugin pattern works by building a fresh QTE from scratch.

### DES-3 — Fairy Helper System
- [ ] **DES-3 M-1: Data files** — `fairyTriggers.js` (trigger definitions, data only). `fairyPersonality.js` exists but triggers are inline — extract to dedicated file.
- [ ] **DES-3 M-2: State machine** — `fairyHelper.js` core. idle → pointing → escalating → flustered → exiting → dismissed → off.
- [ ] **DES-3 M-3: Renderer split** — Extract PoofFX, SpeechBubble, playPop from FairyAnim.js into `fairyRenderer.js`. FairyAnim.js drops from 860 → ~370 lines.
- [ ] **DES-3 M-4: Bus integration** — Fairy watches gameplay tags, fires at trigger conditions from fairyPersonality.js.
- [ ] **DES-3 M-5: Laser FX** — Beam from fairy to target UI element/screen region.
- [ ] **DES-3 M-6: Persistence + toggle** — localStorage for taught topics. On/off toggle in options menu.
- [ ] **DES-3 M-7: Escalation behavior** — Ignored → bigger laser → flustered → dramatic exit. 3 exits = permanently drop topic.
- [ ] **DES-3 M-8: First encounter** — Main menu cameo on first launch.
- [ ] **DES-3 M-9: Ambient commentary** — Post-tutorial reactions to gameplay moments.
- [ ] **DES-3 M-10: Gibberish speech audio** — Procedural via Web Audio, synced to speech bubbles. Can defer.

### DES-3 — QTE Pause (blocked by DES-2 + Fairy M-4)
- [ ] **Pause/resume contract** — Freeze needle/notes at exact position in QTE Runner.
- [ ] **Pause overlay** — Dim + "TAP TO RESUME" + auto-resume timeout.
- [ ] **Fairy pause triggers** — First-time QTE encounter → fairy pauses and explains.

### LLM Integration (separate workstream)
- [ ] **Cloudflare Worker setup** — Create account, deploy proxy worker with API key.
- [ ] **fairyAPI.js** — Fetch wrapper with timeout, validation, gibberlese fallback.
- [ ] **fairyConfig.js** — Environment switching (local dev vs production worker URL).
- [ ] **Wire into fairyHelper.js** — Tier 2 dialogue calls for complex state combos.
- [ ] **fairyMic.js** — Voice input via Web Speech API (future).
- [ ] **FTUE via LLM** — Fairy as primary onboarding via voice/text conversation (future).

### Gameplay
- [ ] **Add fishing sub-gamemode with unique QTE** — New activity mode with its own QTE type, economy loop, and scene.
- [ ] **Improve customer and NPC system** — More robust lifecycle, personality, and a "player opinion" stat.
- [ ] **Audit progression system** — Review XP curve, rank thresholds, upgrade costs, difficulty scaling.

### Cleanup
- [ ] **Verify UX multi-function buttons** — Stamina-use buttons should call wait/rest inline.
- [ ] **Fix shelf images** — Remove visible background border on weapon shelf display sprites.
- [ ] **Remove FTUE_TOASTS from constants.js** — Replaced by howToPlayData.js. Confirm cleanup.
- [ ] **Update FeatureSpecs.md** — How to Play status should be ✅ DONE, not 🔵 PLANNED.
- [ ] **FairyAnim audio cleanup** — `new Audio()` direct usage should wire through main audio system for volume/mute consistency.
- [ ] **Resolve FTUESpecs open questions** — Q1 (sprites: answered yes), Q5 (FTUE_TOASTS: replaced). Mark resolved.