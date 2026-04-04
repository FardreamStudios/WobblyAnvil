# Wobbly Anvil — ToDo

**Last updated:** 2026-04-01
**Last session:** Engagement System Design + Spec Cleanup

---
bugs
1. starfall render stops after cam out of other people
2. starfall sfx needed
3. chiptune forge needs keyboard functionality to write a new track. add different 16 bit instruments. and properly logging input
4. still have random moments of characters dissapearing on anim state change

## 🔲 Battle System — Remaining V1

### Engagement System Rework (see `EngagementSystemSpec.md`)
- Replace ATB tick loop with initiative roll + fixed turn order
- Replace pip tracking with AP pools (earn per turn, carry over, cap)
- Replace exchange flow (swap sides, RELENT, PASS) with one-trade model + optional counter
- Remove in-cam item/defend buttons (formation-only now)
- Replace ATB gauge strip UI with turn order strip
- Replace pip display in info panels with AP bar
- Update formation action menu for new action list (immediate skill, delayed skill, item, defend, flee, wait)
- Adapt enemy auto-swing to initiative-driven turns

### CombatFeel Step 7 (see `CombatFeelSpec.md`)
- Wire Chalkboard.js into QTERunner.js
- Update BattleView.js phase flow (CAM_SWING_QTE → CAM_SWING_PLAYBACK)

### Other V1
- Loot drops from enemies (loot tables exist in spec, not wired)
- INTRO phase
- Enemy variety (3–4 types specced, currently 2 wired + wave 2 test data)
- Battle music integration
- Player skill choice (currently always `skills[0]`)

---

## 🎯 Next Priority — "Find the Fun" Polish

- **Ring QTE intuitiveness** — shrinking circle mechanic may need UX rework for mobile (clearer hit zone, better timing feedback, "tap here" indicator, or rethink interaction model)
- **AP tuning** — earn rates per speed tier, skill costs, counter cost. "Eat the hit vs counter" needs to feel like a real choice
- **Initiative feel** — turn order strip readability, speed variance range, does the fixed sequence feel fair or frustrating?
- **One-trade cam pacing** — does a single exchange feel satisfying or too short? Counter decision timing
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
- Delayed skills + combo triggers (see `EngagementSystemSpec.md` §6)
- Intercept & Taunt protection skills (see `EngagementSystemSpec.md` §7)
- Boss waves
- Fairy commentary via observer
- Fairy as party member (`aiControlled` + `onActionNeeded` callback)
- Enemy AI personality — AP spending behavior (saving, baiting, aggression profiles)

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