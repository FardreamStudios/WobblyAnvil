# Wobbly Anvil — Feature Specs

Each spec below covers a gameplay or UX feature. Format: what it does, how it works, personality/feel, technical notes.

    For architecture and system-level specs, see `SystemSpecs.md`.

---

## SPEC: Fairy Helper System

**Status:** ⚠️ IN PROGRESS — DES-3

**Full spec:** See `FairyFeatureSpecs.md` for the three-layer architecture (Controller → Pawn → AnimInstance), file locations, milestones, and build order.

**Current state:** Controller (`src/fairy/fairyController.js`), rules tree, personality data, animation proto, and LLM client all built. Remaining work is the pawn layer, anim refactor, controller upgrade with day-gating, and end-to-end wiring.

**Character bible:** See `FairyCharacter.md` for identity, voice rules, pacing, abilities, and LLM integration design.

---

## SPEC: How to Play (Static Tutorial)

**Files:** `src/config/howToPlayData.js`, `src/components/HowToPlay.js`  
**Status:** ✅ DONE — DES-3 Feature 1

Sectioned reference guide accessible from main menu and in-game options. Section nav, card pagination, localStorage progress tracking, visual slots with game iconography. Content lives in a data file — add a section by adding data, not code.

---

## SPEC: QTE Pause Feature

**Status:** 🔵 PLANNED — DES-3 (dependency for Fairy during QTEs)

### What it does

Allows QTEs to be paused mid-action. Needle/notes freeze in place. Overlay dims slightly. Fairy can explain things during the pause. Player taps to resume.

### Why we need it

Fairy needs to be able to teach during QTEs without the player missing their window. Without pause, she either can't appear during the most important part of the game, or she causes the player to fail.

### Rules

- Pause does not affect scoring — needle resumes from exact frozen position
- Visual: slight dim overlay, needle/bar frozen, "TAP TO RESUME" prompt
- Only Fairy can trigger a pause (not player-initiated — this isn't a general pause menu)
- Fairy pause only happens during FTUE triggers (first time seeing a QTE type). After that, she stays out of the way during QTEs.
- Pause auto-resumes after a timeout if player doesn't tap (prevents softlock)

---

*End of feature specs. Add new gameplay and UX feature specs here.*