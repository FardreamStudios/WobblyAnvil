# Wobbly Anvil — ToDo

**Last updated:** 2026-03-30
**Last session:** Combo Beat Steps 3–8 + Dev Cleanup + ATB Bug Fix

---

## ✅ Recently Completed

### Combo Beat Steps (all 8 done)
- **Step 1:** Skill definitions in `battleSkills.js` — `basic_attack`, `power_strike`, `rat_bite`, `scavenger_combo`, `trash_golem_slam`
- **Step 2:** `handleQTERingResult` reads beats from context
- **Step 3:** Summary damage number — one number per combo, not per-beat. `summaryDmgRef` accumulates, spawns on `isLastBeat`. OVERKILL still per-beat.
- **Step 4:** Swipe detection in `circleTimingQTE.js` — touchstart/touchend, ≥30px = swipe, ≤15px = tap, `touch-action: none` on QTE zone
- **Step 5:** `onRingResult(index, hit, inputType)` — `"tap"`, `"swipe"`, or `"auto_miss"`
- **Step 6:** Tap vs swipe defense logic — swipe+dodgeable → dodge (0 dmg), tap+blockable → brace (×0.25), tap+unblockable → full hit
- **Step 7:** Dodge CSS class — `.normal-cam-char__choreo--dodge`, 5vw lateral shift, slight hop, 60% opacity
- **Step 8:** Unblockable visual tells — `beatVisuals` array, red rings (`#ef4444`), red "!" indicator, finisher = thicker stroke

### Dev Controls Cleanup
- 12 buttons → 4: Fight/Pause, Fill Pips, Reset, Exit + phase badge
- New `handleDevReset()` — full battle state reinit
- Removed: `devSpriteOverride`, `devShowComic`, 6 dead handler functions
- BattleView.js -55 lines

### BattleView.js Extraction (prior session)
- 2080 → ~1530 lines. 11 files extracted to `src/battle/`
- `BattleCharacter.js`, `BattleResultsScreen.js`, `DevControls.js`, `ATBGaugeStrip.js`, `ActionMenu.js`, `ItemSubmenu.js`, `QTEZone.js`, `ComicPanel.js`, `ActionCamInfoPanel.js` + CSS files

### Bug Fixes
- **ATB KO fix** — dead combatants filtered out of `BattleATB.tick` input, gauges stop filling on death

### Choreography (steps 1–11, 13–15 complete)
- Full list in `ScavengeBattleSpecs.md` §16

### Addendum Deferred to V2
- Pip persistence, exchange restructure, Block replacing Defend, Poise & Stagger
- `ScavengeBattleSpecsRevisionAddendum.md` stays as sidecar doc

---

## 🔲 Battle System — Remaining V1

- Choreography step 12: per-ring QTE visual sync (polish)
- Wave transitions (WAVE_TRANSITION phase)
- Loot drops from enemies (loot tables exist in spec, not wired)
- INTRO phase
- Enemy variety (3–4 types specced, currently 2 wired)
- Battle music integration

---

## 🐛 Known Bugs

- **Music transition on battle enter/exit** — `useAmbientAudio` hook doesn't cleanly hand off. Related: `sfx.setMode("forge")` pattern in `useForgeVM`.
- **Desktop has no swipe input** — click = tap only. Mobile emulation in DevTools works. May want keyboard shortcut as swipe stand-in.

---

## 🧹 Cleanup / Tech Debt

- **`QTEZone.js` is dead code** — placeholder component, actual QTE renders via `QTERunner` directly in BattleView. Confirm and delete.
- **`BattleCharacter.js` still accepts `spriteOverride` prop** — nothing passes it anymore. Safe to remove.
- `devSkipPersist` removal — blocked on tutorial verification
- Debug `console.log`s in `forgeTutorial.js` — keep until forge tutorial build complete
- ESLint backlog: `no-mixed-operators` (18), `react-hooks/exhaustive-deps` (40), misc (5)
- `BattleCharacter.js` uses module export pattern (`.BattleCharacter`, `.DamageNumber`) — all other extracted components use default exports
- Extracted component CSS still lives in `BattleView.css` — optional split later
- `AnimInstance` audio cleanup — `new Audio()` should wire through main audio system

---

## 🔮 Horizon (V2+)

### Battle
- `battleMode.js` state machine (sub-mode contract: `canEnter`, `onEnter`, `onExit`)
- QTE-driven exchange extension (perfect timing → bonus beats, cap 2+2)
- Boss waves
- Fairy commentary via observer
- Fairy as party member (`aiControlled` + `onActionNeeded` callback)
- ATB resume tuning (ease-in ramp)
- Addendum systems: pip persistence, exchange restructure, Block replacing Defend, Poise & Stagger

### QTE
- DES-2 QTE plugin system — decoupled `QTERunner` with plugin contract
- QTE pause/resume for fairy tutorial moments
- Per-ring visual config expansion (custom colors, icons per beat)

### Fairy
- Fairy chat system testing on mobile (live Cloudflare Worker)
- Desktop fairy system testing (reactive + tutorial)
- `noPoof` flag on playCue
- Intent registry in handleCommand
- `data-*` pass-through on widgets
- Sticky/pinned mode
- Generic NPC controller base

### Game Modes
- Simulator vs Adventure mode split (see `GameModeArchitecture.md`)
- Equipment system (Adventure mode)
- Zone / encounter definitions