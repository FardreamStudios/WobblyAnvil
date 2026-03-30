# Wobbly Anvil — TODO

**Handoff tasks from the most recent session always supersede this list.**

---

## Battle System

- [ ] Terminology alignment — replace absorbed specs with `BattleTerminology.md` + merged `ScavengeBattleSpecs.md`, delete `ActionCamFlow.md`, `ATBActionEconomySpec.md`, `ComboBeatSpec.md`, `BattleChoreographySpec.md`
- [ ] Skill definitions in `battleConstants.js` (beat arrays for player + enemy skills)
- [ ] `handleQTERingResult` reads beats from context instead of flat damage
- [ ] Summary damage number replaces big-hit resolve
- [ ] Swipe detection in `circleTimingQTE.js`
- [ ] `onRingResult` signature adds `inputType` (tap/swipe/auto_miss)
- [ ] Tap vs swipe defense logic wired into `handleQTERingResult`
- [ ] Dodge CSS class
- [ ] Unblockable visual tells in QTE
- [ ] Defend action (brace + badge, no cam)
- [ ] Flee sequence
- [ ] Results screen overlay
- [ ] Per-ring QTE visual sync (choreography step 12)
- [ ] Battle music transition — mute ambient on enter, restore on exit

---

## QTE System (DES-2)

- [ ] Build QTE Runner — single component, receives config, mounts plugin, emits result
- [ ] Extract barSweepQTE plugin from `forgeComponents.js`
- [ ] Adapt RhythmQTE to plugin contract (`onComplete` callback)
- [ ] Add a new QTE type to prove plugin pattern
- [ ] Extract QTE constants into `qteConstants.js`

---

## Fairy System (DES-3)

- [ ] Tutorial lockout mode — decide full input lock vs highlight-only blocking
- [ ] Special cues (M-13) — `super_saiyan`, `chase_event`, `running_head`, `fairy_insight`
- [ ] Gibberish speech audio (M-14) — procedural via Web Audio
- [ ] QTE pause/resume contract (nice-to-have)
- [ ] Desktop fairy testing — reactive + tutorial untested on desktop
- [ ] Remove `devSkipPersist: true` from App.js after forge tutorial verified
- [ ] Strip debug logs from `forgeTutorial.js`

---

## LLM Integration

- [ ] Tune LLM fairy setup — system prompt, max_tokens, state snapshot, safety guardrails
- [ ] Worker `max_tokens` support — redeploy
- [ ] FTUE via LLM — fairy as primary onboarding (future)

---

## Character / NPC System

- [ ] Add `noPoof` flag to pawn `playCue`
- [ ] Add intent registry to pawn `handleCommand`
- [ ] Add `data-*` pass-through to widget components (`W.Box`, `Panel`, `Btn`)
- [ ] Add sticky/pinned mode to pawn
- [ ] Prototype generic NPC controller base from FairyController patterns
- [ ] Extract SpeechBubble into reusable system (`src/systems/speechBubble/`)

---

## Gameplay

- [ ] Fishing sub-gamemode with unique QTE
- [ ] Improve customer and NPC system — lifecycle, personality, player opinion stat
- [ ] Audit progression system — XP curve, rank thresholds, upgrade costs, difficulty scaling

---

## UI / Screens

- [ ] Desktop weapon/material select polish — match mobile info-on-buttons pattern
- [ ] Fix shelf images — remove visible background border
- [ ] DiamondMarker `gapUnit` ratio — test on smallest phones

---

## Cleanup

- [ ] Toast subsystem — extract from App.js into pure JS singleton, bus-driven
- [ ] Audit App.js responsibilities — target ~100 lines of pure wiring
- [ ] FairyAnimInstance audio cleanup — wire button sounds through main audio system
- [ ] Delete old `FairyAnim.js` if still on disk
- [ ] ESLint cleanup — `no-mixed-operators` (18), `react-hooks/exhaustive-deps` (40), misc (5)