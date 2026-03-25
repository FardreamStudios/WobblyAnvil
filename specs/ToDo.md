# Wobbly Anvil — TODO

---

- [ ] **Build QTE System (DES-2)** — Decouple QTEs into a plugin system so any game system can request one and get a result back.
- [ ] **Extract QTE constants** — Move tier tables, color ramp, and speed tuning into their own config file.
- [ ] **Add a new QTE type using the new system** — Prove the plugin pattern works by building a fresh QTE from scratch.
- [ ] **Extract RhythmQTE and adapt to new system** — Wire the existing rhythm minigame into the QTE plugin contract.
- [ ] **Spec FTUE system** — Design the first-time user experience: tutorials, guided first forge, tooltip walkthroughs.
- [ ] **Verify UX multi-function buttons** — Stamina-use buttons should call wait/rest inline so the player doesn't have to menu-jump.
- [ ] **Add fishing sub-gamemode with unique QTE** — New activity mode with its own QTE type, economy loop, and scene.
- [ ] **Improve customer and NPC system** — More robust lifecycle, personality, and a "player opinion" stat that tracks how NPCs feel about you.
- [ ] **Audit progression system** — Review XP curve, rank thresholds, upgrade costs, and difficulty scaling for pacing issues.
- [ ] **Fix shelf images** — Remove visible background border on weapon shelf display sprites.