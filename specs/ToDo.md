# Wobbly Anvil — ToDo

**Last updated:** 2026-03-30
**Last session:** Wave Transitions + Enemy AI + Flurry Combo + Cleanup

---
battle bugs
1. select box is offset from characters, no select sound, clicking/tapping away from any target should deselect. select should be removed on action cam.
2. crossed swords icon shows up at end of fight. this is not needed at all.
3. action cam buttons need to be bottom right similar in position to the formation menu buttons. these should be pretty much identical in area to each other.
4. item/skill menus are semi transparent they should be solid
5. cannot dodge, new action cam setup may have the "chalkboard not in the action cam screen area.

## ✅ Recently Completed

### Dead Code Cleanup
- Deleted `QTEZone.js` — dead placeholder component, QTE renders via `QTERunner` directly
- Removed `spriteOverride` prop from `BattleCharacter.js` — nothing passed it
- Removed dead `QTEZone` import from `BattleView.js`

### Choreography Step 12 — Confirmed Complete
- `combatSyncMove` keyframe already handles full pull-back → snap → return per ring
- `--telegraph-duration` CSS var matches ring shrink time
- `onRingStart` restarts anim via reflow trick for multi-ring combos

### Wave Transitions
- `WAVE_TRANSITION` phase added to `BATTLE_PHASES`
- `TEST_WAVES` — 2-wave test data in `battleConstants.js`
- `replaceEnemies(newEnemyArray)` method on `battleState.js`
- `advanceOrCamOut` wave-aware: enemy wipe + more waves → `startWaveTransition()`, last wave → victory
- Wave banner overlay with fade-in/hold/fade-out animation
- Party HP/buffs/items carry across waves, enemy ATB fresh per wave
- `waveLabel` derived from `waveIndex` state (no longer a static prop)
- Dev Reset resets wave tracking back to wave 1

### Enemy AI System
- New file: `battleAI.js` — `pickAction(combatantData, bState)` returns `{ targetId, skillId }`
- Random living party target + random skill from combatant's skill list
- Wired into both ATB tick enemy turn and `camOut` alreadyReady path
- `startExchange` accepts optional `skillId`, stored on cam exchange ref
- `handleCamATK` uses AI-selected skill for enemies, picks fresh skill for next swing

### Enemy Auto-Swing
- `useEffect` on `CAM_WAIT_ACTION` — auto-fires `handleCamATK` after 300ms when swinger is enemy
- No more manual enemy ATK button pressing needed

### New Skill: Flurry Combo
- 7 rings: 3 fast jabs (speed 1.6, 150ms delays, 4 dmg) → heavy (speed 0.6, 500ms delay, 10 dmg) → 2 fast jabs → heavy
- Shorter shrink duration (700ms), no combo multipliers
- Wave 2 Raccoon Alpha has both `scavenger_combo` + `flurry_combo`

### Battle Auto-Start
- `atbRunning` initializes to `true` — battle begins immediately

### Selection Brackets Hidden in Action Cam
- CSS `display: none` on `::before` pseudo for attacker/target/dimmed states

### Prior Session (Combo Beat Steps 1–8)
- Full combo beat system, swipe detection, defense matrix, dodge class, unblockable visual tells
- Dev controls slimmed (12 → 4 buttons), ATB KO bug fixed

---

## 🔲 Battle System — Remaining V1

- Loot drops from enemies (loot tables exist in spec, not wired)
- INTRO phase
- Enemy variety (3–4 types specced, currently 2 wired + wave 2 test data)
- Battle music integration

---

## 🎯 Next Priority — "Find the Fun" Polish

- **Ring QTE intuitiveness** — shrinking circle mechanic may need UX rework for mobile (clearer hit zone, better timing feedback, "tap here" indicator, or rethink interaction model)
- **Player choice** — skill selection during player's turn (currently always `skills[0]`), meaningful pre-exchange decisions
- **Pacing/feel** — tune ATB speeds, exchange tempo, delay between waves
- **Juice** — hit feel, screen shake tuning, SFX variety, damage number polish

---

## 🐛 Known Bugs

- **Music transition on battle enter/exit** — `useAmbientAudio` hook doesn't cleanly hand off. Related: `sfx.setMode("forge")` pattern in `useForgeVM`.
- **Desktop has no swipe input** — click = tap only. Mobile emulation in DevTools works. May want keyboard shortcut as swipe stand-in.

---

## 🧹 Cleanup / Tech Debt

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