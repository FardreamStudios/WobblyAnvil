# DES-3 — FTUE Build Plan

Three features, ordered by dependency. Specs live in `FeatureSpecs.md`.

---

## Feature 1: How to Play (Static Tutorial)

**Status:** ✅ DONE
**Risk:** LOW

Redesign + expand the existing FTUE toast overlay in screens.js into a proper sectioned reference guide. FTUE_TOASTS data in constants.js gets replaced by a dedicated data file.

### What gets built

| File | Action |
|------|--------|
| `src/config/howToPlayData.js` | New — sectioned card data (array of sections, each with array of cards) |
| `src/modules/screens.js` | Edit — upgrade overlay to support section nav + card pagination |
| `src/modules/constants.js` | Edit — remove FTUE_TOASTS (moved to howToPlayData.js) |
| `src/modules/desktopLayout.js` | Edit — add in-game "How to Play" access point in options |
| `src/modules/mobileLayout.js` | Edit — same |

### Milestones

- **M-1:** Data file + section nav renderer
- **M-2:** Card content with game iconography (sprites, colors, UI elements)
- **M-3:** localStorage progress tracking + in-game access from options menu

---

## Feature 2: Fairy Helper System

**Blocked by:** Nothing
**Risk:** LOW — core pipeline complete, shippable

Core live FTUE system. Three-layer architecture (Controller → Pawn → AnimInstance). Bus-listener architecture — read-only on game state. Day-gated pacing. Full spec in `FairyFeatureSpecs.md`.

### Status

Core pipeline live: controller FSM + rules evaluation + day-gating, pawn cue playback + position resolution + laser FX, AnimInstance sprite/FX/bubble rendering. Persistence (localStorage taught topics + enabled pref) and player toggle in both options menus. 13 named cues. 9 scene spots with depth-resolved scale. 8 UI targets. Edge peeks, dodge paths, roam zones.

### Milestones

- **M-1 through M-12:** ✅ COMPLETE — see `FairyFeatureSpecs.md` for details
- **M-15: Fairy Tutorial** — IN PROGRESS. Step sequencer as controller helper. Controller owns mode switch (tutorial vs reactive). First slice: fairy intro + yes/no prompt on game start.
- **M-13: Special cues** — LOW PRIORITY. `super_saiyan`, `chase_event`, `running_head`, `fairy_insight`.
- **M-14: Gibberish speech audio** — DEFERRED.

### Concerns

- ~~**Sprite assets.**~~ ✅ Using placeholder spritesheet (`waFairyIdleSS.png`). Renderer is asset-agnostic — swap later.
- ~~**Laser targeting.**~~ ✅ `data-fairy-target` attributes on layouts. 8 UI targets wired. Laser FX live in pawn (M-11).
- **Mobile tap conflicts.** Fairy tap-to-dismiss works. Needs real-device testing during active QTE gameplay.
- **AnimInstance audio cleanup.** `new Audio()` direct usage should wire through main audio system. Tracked in ToDo cleanup.

---

## Feature 3: QTE Pause

**Blocked by:** DES-2 (QTE plugin system) — Fairy M-4/M-7 ✅ complete
**Risk:** MEDIUM — timing-sensitive, depends on DES-2

Only Fairy can trigger pauses. Hooks into the QTE plugin animation loop.

### What gets built

| File | Action |
|------|--------|
| QTE Runner (from DES-2) | Edit — add pause/resume contract |
| QTE plugins (barSweep, rhythm) | Edit — implement freeze at exact position |
| `src/fairy/fairyController.js` | Edit — wire first-time QTE triggers to pause request |
| Overlay component | New or inline — dim + "TAP TO RESUME" prompt |

### Milestones

- **M-1:** Pause/resume contract in QTE Runner — freeze needle/notes at exact position, resume from same spot
- **M-2:** Visual overlay — dim, "TAP TO RESUME", auto-resume timeout (prevents softlock)
- **M-3:** Fairy integration — first-time QTE encounter triggers pause → fairy explains → player taps → resume

---

## Feature 4: Fairy-Driven Tutorial (M-15)

**Blocked by:** Nothing — all fairy infrastructure is live
**Risk:** LOW — new helper file + small edits to controller and App.js

Scripted tutorial sequence driven by the fairy. Controller owns the mode switch — on init, checks localStorage for tutorial completion. If not done, enters "tutorial" mode and hands off to the step sequencer. Sequencer drives cues through the controller's `onCommand` pipe. Pawn doesn't know or care — same command format.

### Architecture

- **Controller** — gains `_mode` field: `"tutorial"` or `"reactive"`. In tutorial mode, suppresses reactive tick and delegates to sequencer. On tutorial complete/declined, switches to reactive.
- **fairyTutorial.js** — pure logic helper (not a singleton). Holds step data + current step pointer. Controller calls `getNextStep()`, `respond(choice)`. No lifecycle of its own.
- **Prompt UI** — small React component or inline in App.js. Controller's `onCommand` sends a `{ intent: "prompt", question, options }` command. App.js renders yes/no popup.

### Step format

```
{ type: "cue",    cue: "intro_rise", line: "oh! a new smith!" }
{ type: "prompt", question: "Want help getting started?", options: ["Yes", "No thanks"] }
{ type: "cue",    cue: "speak_in_scene", line: "wonderful! let me show you around." }
{ type: "done" }
```

### What gets built

| File | Action |
|------|--------|
| `src/fairy/fairyTutorial.js` | New — step data + sequencer logic |
| `src/fairy/fairyCues.js` | Edit — add `intro_rise` cue (fairy enters from bottom of overlay) |
| `src/fairy/fairyController.js` | Edit — tutorial mode check on init, mode switching |
| `App.js` | Edit — render prompt popup when controller requests, wire response back |

### Milestones

- **M-15a:** Tutorial sequencer + intro cue + yes/no prompt
- **M-15b:** Guided walkthrough steps (forge basics, economy, customers)
- **M-15c:** Laser-point steps teaching specific UI elements

---

## Build Order

| Order | Feature | Blocked by | Status |
|-------|---------|------------|--------|
| 1 | How to Play | Nothing | ✅ DONE |
| 2 | Fairy Helper (M-1 → M-12) | Nothing | ✅ DONE (shippable) |
| 3 | Fairy Tutorial (M-15) | Nothing | 🔵 NEXT |
| 4 | QTE Pause | DES-2 + Fairy M-7 ✅ | 🔵 PLANNED |

---

## Open Questions

1. ~~**Fairy sprite assets**~~ — Using placeholder spritesheet. Swap later.
2. ~~**Laser target system**~~ — `data-fairy-target` attributes live on layouts. 8 targets wired.
3. ~~**How to Play access in-game**~~ — Options menu button, shipped.
4. ~~**Fairy audio priority**~~ — M-14 deferred.
5. ~~**Feature 1 scope**~~ — Shipped with new content.
6. **Tutorial content** — How many steps in the guided walkthrough? Just forge basics, or also shop/customers/quests? Start minimal and expand.
7. **Tutorial re-entry** — If player said "no thanks" originally, can they trigger it later? Options menu "Restart Tutorial" button?