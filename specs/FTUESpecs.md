# DES-3 — FTUE Build Plan

Three features, ordered by dependency. Specs live in `FeatureSpecs.md`.

---

## Feature 1: How to Play (Static Tutorial)

**Blocked by:** Nothing
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

**Blocked by:** Nothing (M-10 audio can be deferred)
**Risk:** MEDIUM — state machine complexity, laser targeting, mobile tap space

Core live FTUE system. Four new files. Bus-listener architecture — read-only on game state. State machine + trigger registry + persistence.

### What gets built

| File | Action |
|------|--------|
| `src/config/fairyTriggers.js` | New — trigger definitions (data only) |
| `src/config/fairyPersonality.js` | New — dialogue, reactions, commentary (data only) |
| `src/modules/fairyHelper.js` | New — state machine, trigger eval, persistence, bus integration |
| `src/modules/fairyRenderer.js` | New — sprite, speech bubbles, laser FX, animations |
| `src/modules/desktopLayout.js` | Edit — mount fairy overlay layer (above game UI, below modals) |
| `src/modules/mobileLayout.js` | Edit — same |
| Options menu (both layouts) | Edit — add fairy on/off toggle |

### Milestones

- **M-1:** Data files — triggers + personality tables. No logic yet, just content.
- **M-2:** State machine core — idle → pointing → escalating → flustered → exiting → dismissed → off
- **M-3:** Renderer — sprite + speech bubble + positioning (no laser yet)
- **M-4:** Bus integration — fairy watches gameplay tags, fires at trigger conditions
- **M-5:** Laser FX — beam from fairy to target UI element/screen region
- **M-6:** Persistence (localStorage) + options toggle
- **M-7:** Escalation behavior — ignored → bigger laser → flustered → dramatic exit. 3 exits = permanently drop topic.
- **M-8:** First encounter — main menu cameo on first launch
- **M-9:** Ambient commentary mode — post-tutorial reactions to gameplay moments (shatters, big sales, masterwork, bad streaks)
- **M-10:** Gibberish speech audio — procedural via Web Audio, synced to speech bubbles. Can defer.

### Concerns

- **Sprite assets.** Do we have fairy pixel art sprites? If not, build with placeholder (colored circle or emoji) and swap later. Renderer is designed for asset-agnostic mounting.
- **Laser targeting.** Needs UI element IDs or screen region coordinates. May need to add `data-fairy-target` attributes to key UI elements. Could be invasive if many elements need tagging.
- **Mobile tap conflicts.** Fairy must not eat taps during active QTE gameplay. Tap-to-dismiss behavior handles this, but needs careful z-index and hit-area testing.

---

## Feature 3: QTE Pause

**Blocked by:** DES-2 (QTE plugin system) + Feature 2 M-4 (fairy bus integration)
**Risk:** MEDIUM — timing-sensitive, depends on two other systems

Only Fairy can trigger pauses. Hooks into the QTE plugin animation loop.

### What gets built

| File | Action |
|------|--------|
| QTE Runner (from DES-2) | Edit — add pause/resume contract |
| QTE plugins (barSweep, rhythm) | Edit — implement freeze at exact position |
| `src/modules/fairyHelper.js` | Edit — wire first-time QTE triggers to pause request |
| Overlay component | New or inline — dim + "TAP TO RESUME" prompt |

### Milestones

- **M-1:** Pause/resume contract in QTE Runner — freeze needle/notes at exact position, resume from same spot
- **M-2:** Visual overlay — dim, "TAP TO RESUME", auto-resume timeout (prevents softlock)
- **M-3:** Fairy integration — first-time QTE encounter triggers pause → fairy explains → player taps → resume

---

## Build Order

| Order | Feature | Blocked by | Est. scope |
|-------|---------|------------|------------|
| 1 | How to Play | Nothing | Small — 3 milestones |
| 2 | Fairy Helper (M-1 → M-9) | Nothing | Large — 9 milestones |
| 3 | QTE Pause | DES-2 + Fairy M-4 | Small — 3 milestones |

---

## Open Questions

1. **Fairy sprite assets** — Do we have pixel art for the fairy (idle, point, flustered, exit, peek, yelp, laser)? Or are we building with placeholders first?
2. **Laser target system** — Are we comfortable adding `data-fairy-target` attributes to existing UI elements? This touches layout files and panels. Alternative: use screen-region coordinates (less precise but zero existing-file edits).
3. **How to Play access in-game** — Options menu button, or a separate HUD icon? Options menu is lower friction to build but less discoverable.
4. **Fairy audio priority** — M-10 (gibberish speech) can ship later. Confirm we defer it or want it in the first pass.
5. **Feature 1 scope** — The current FTUE_TOASTS are text-heavy walls. Rewrite the content to match the spec's "not verbose, no numbers, no deep mechanics" rule? Or keep existing text as placeholder?