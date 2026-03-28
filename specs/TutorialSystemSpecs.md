# Interactive Tutorial System — Spec

**Status:** 🔵 PLANNED
**Blocked by:** Nothing — all fairy infrastructure is live
**Risk:** MEDIUM — touches forge state, QTE bar, new file pattern

---

## What It Does

Scriptable interactive tutorials that puppeteer game systems while using a presenter (currently the fairy) to explain what's happening. The player watches — buttons look normal but can't be tapped. The presenter points at things, speaks, triggers actions, and walks the player through a full gameplay loop.

First implementation: **Forge Tutorial** — fairy walks the player through selecting a weapon, selecting a material, forging, and quenching. No resources consumed.

---

## Architecture

Three roles, fully decoupled:

| Role | Who | Job |
|------|-----|-----|
| **Tutorial Script** | `src/tutorials/forgeTutorial.js` | Sequence of steps. Says "point here, say this, do that." Knows forge vocabulary (phases, weapons) but not how pointing or speaking works. |
| **Presenter** | Fairy (via controller) | Receives generic commands: `say`, `pointAt`, `interact`. Translates to fairy-specific actions (speech bubble, laser, flare). Could be swapped for any other presenter. |
| **Game Bridge** | App.js action handler | Receives generic game actions: `selectWeapon`, `beginForge`, `resolveQTE`. Translates to actual state mutations. Owns the sandbox flag. |

Communication is callback-based. The tutorial script receives three functions at init and calls them. It never imports anything from the fairy or forge systems.

```
forgeTutorial.init({
    presenter: {
        say:       fn(text, duration),
        pointAt:   fn(targetId),
        interact:  fn(targetId, text),
        clearAll:  fn(),
    },
    gameAction:    fn(action, params),
    onComplete:    fn(result),
});
```

---

## Presenter Interface

Generic — any character or system can implement these.

| Method | What it does |
|--------|-------------|
| `say(text, duration)` | Show speech with no pointing. Returns nothing. Presenter calls back via `onEvent("say_done")` when finished. |
| `pointAt(targetId)` | Aim laser/pointer at a `data-fairy-target` element. Holds until `clearAll`. |
| `interact(targetId, text)` | Point at target → flare endpoint → speak text. The "fairy pushes button" combo. Calls back `onEvent("interact_done")` when speech finishes. |
| `clearAll()` | Retract laser, hide speech. |

The controller wires these to fairy pawn commands. If we ever swap presenter, just reimplement these four methods.

---

## Game Bridge (gameAction)

Each tutorial defines its own action vocabulary. The bridge is a lookup provided by the controller or App.js that maps action names to real game mutations.

### Forge Tutorial Actions

| Action | Params | What it does |
|--------|--------|-------------|
| `enter_sandbox` | none | Sets forge sandbox flag. Zeroes stamina/hour/material costs for the session. |
| `select_weapon` | `{ key: "dagger" }` | Calls `setWKey`. |
| `select_material` | `{ key: "bronze" }` | Calls `setMatKey`. |
| `begin_forge` | none | Triggers `setPhase(PHASES.SELECT)` → confirm → forge start. |
| `confirm_select` | none | Triggers confirm selection (same as player pressing Confirm). |
| `resolve_qte` | none | Auto-resolves the frozen QTE bar at its current position. |
| `quench` | none | Triggers quench phase. |
| `exit_sandbox` | none | Clears sandbox flag. Discards any WIP/finished weapon from the tutorial. |

Future tutorials add their own action sets — fishing, rhythm, etc. Same pattern, different vocabulary.

---

## Sandbox Mode

A flag on forge state: `isSandbox: true`. When active:

- **No stamina cost** — forging doesn't drain stamina
- **No hour cost** — forging doesn't advance the clock
- **No material cost** — weapon creation doesn't consume inventory
- **No weapon output** — finished weapon is discarded on `exit_sandbox`, never enters the shelf
- **QTE auto-freeze** — bar sweep needle stops at a predetermined "good" position after a set sweep duration

Sandbox is set by `enter_sandbox` game action, cleared by `exit_sandbox`. If the player somehow exits the tutorial mid-flow, `exit_sandbox` fires as cleanup.

### QTE Auto-Freeze (Sandbox)

When the bar sweep QTE runs in sandbox mode:

1. Needle sweeps normally — player sees the mechanic
2. After a set duration (e.g. 1500ms), needle freezes at a predetermined position in the "great" tier zone
3. QTE emits `QTE_SANDBOX_FROZEN` on bus (new tag)
4. Tutorial hears it, fairy explains what the player is seeing
5. On explanation complete, tutorial calls `resolve_qte` game action
6. QTE resolves at the frozen position as if the player clicked
7. Forge continues to next phase

This avoids auto-play timing complexity. The needle just stops, fairy talks, then we trigger the result.

---

## Step Types

Each tutorial is an array of step objects executed in order.

| Type | Fields | Behavior |
|------|--------|----------|
| `say` | `text`, `duration` | Presenter speaks. Waits for `say_done` event. |
| `point` | `target` | Presenter points laser at target. Instant — advances immediately. |
| `interact` | `target`, `text` | Point + flare + speak combo. Waits for `interact_done`. |
| `action` | `name`, `params` | Fires a game action via bridge. Instant — advances immediately. |
| `wait_event` | `event` | Pauses until a specific bus event arrives (e.g. `QTE_SANDBOX_FROZEN`, `PHASE_FORGE_TRANSITION`). |
| `delay` | `ms` | Simple timer. Advances after delay. |
| `clear` | none | Calls `presenter.clearAll()`. Instant. |
| `callback` | `result` | Fires `onComplete(result)`. Sequence ends. |

---

## Forge Tutorial Sequence

One heat → one hammer → explain buttons → quench → done.

```
// Phase 1: Setup
{ type: "action",    name: "enter_sandbox" }
{ type: "interact",  target: "btn_forge_start", text: "let me show you how the forge works!" }
{ type: "action",    name: "begin_forge" }
{ type: "delay",     ms: 500 }

// Phase 2: Weapon Select
{ type: "interact",  target: "weapon_dagger", text: "first you pick what to make." }
{ type: "action",    name: "select_weapon", params: { key: "dagger" } }
{ type: "delay",     ms: 300 }

// Phase 3: Material Select
{ type: "interact",  target: "mat_bronze", text: "then pick your metal." }
{ type: "action",    name: "select_material", params: { key: "bronze" } }
{ type: "action",    name: "confirm_select" }
{ type: "delay",     ms: 500 }

// Phase 4: Heat QTE
{ type: "say",       text: "watch the bar — you want to tap in the bright zone!" }
{ type: "wait_event", event: "QTE_SANDBOX_FROZEN" }
{ type: "interact",  target: "qte_bar", text: "see? right in the sweet spot. tap!" }
{ type: "action",    name: "resolve_qte" }
{ type: "delay",     ms: 800 }

// Phase 5: Hammer QTE
{ type: "say",       text: "now hammer it into shape!" }
{ type: "wait_event", event: "QTE_SANDBOX_FROZEN" }
{ type: "interact",  target: "qte_bar", text: "perfect hit!" }
{ type: "action",    name: "resolve_qte" }
{ type: "delay",     ms: 800 }

// Phase 6: Button Tour
{ type: "interact",  target: "btn_forge_again", text: "forge again to raise quality." }
{ type: "delay",     ms: 1500 }
{ type: "interact",  target: "btn_normalize", text: "normalize reduces stress but costs quality." }
{ type: "delay",     ms: 1500 }
{ type: "interact",  target: "btn_scrap", text: "scrap if things go wrong. you get the metal back." }
{ type: "delay",     ms: 1500 }

// Phase 7: Quench & Finish
{ type: "interact",  target: "btn_quench", text: "quench to finish the weapon!" }
{ type: "action",    name: "quench" }
{ type: "delay",     ms: 1000 }
{ type: "say",       text: "and that's a finished blade! the better your QTE, the higher the quality." }
{ type: "delay",     ms: 2000 }

// Cleanup
{ type: "action",    name: "exit_sandbox" }
{ type: "callback",  result: "segment_complete" }
```

This is example data — actual dialogue comes from the fairy personality file or is tuned during implementation. The structure is what matters.

---

## Event Flow

```
Player taps "Begin Forging" (first time, tutorial enabled)
  → Controller intercepts, starts tut_forge segment
  → fairyTutorial.js delegates to forgeTutorial.js
  → forgeTutorial calls gameAction("enter_sandbox")
  → App.js sets sandbox flag on forge state
  → forgeTutorial calls presenter.interact("btn_forge_start", ...)
  → Fairy lasers the button, speaks, flares
  → forgeTutorial calls gameAction("begin_forge")
  → Forge enters weapon select (no cost)
  → ... sequence continues ...
  → QTE runs in sandbox → auto-freezes → fairy explains → auto-resolves
  → ... forge buttons explained ...
  → Quench → weapon finished → discarded
  → forgeTutorial calls gameAction("exit_sandbox")
  → Forge state cleaned up
  → forgeTutorial fires callback("segment_complete")
  → Controller marks wa_tut_forge_done
```

---

## File Map

| File | Location | Action |
|------|----------|--------|
| `forgeTutorial.js` | `src/tutorials/` | **New** — sequence data + step executor |
| `fairyController.js` | `src/fairy/` | **Edit** — delegate `tut_forge` to forgeTutorial, wire presenter + gameAction |
| `fairyTutorial.js` | `src/fairy/` | **Edit** — add `tut_forge` sequence with delegate step |
| `App.js` | `src/` | **Edit** — provide gameAction bridge for forge mutations, intercept first forge tap |
| `useForgeState.js` | `src/hooks/` | **Edit** — add `isSandbox` flag, skip costs when true |
| `forgeComponents.js` or QTE file | `src/` | **Edit** — add auto-freeze + external resolve in sandbox mode |
| `eventTags.js` | `src/config/` | **Edit** — add `QTE_SANDBOX_FROZEN` tag |
| `fairyPositions.js` | `src/fairy/` | **Edit** — add forge UI targets (weapon select, material select, forge buttons) |
| `mobileLayout.js` + `desktopLayout.js` | `src/modules/` | **Edit** — add `data-fairy-target` attributes to forge phase elements |

---

## Trigger Condition

The forge tutorial fires when ALL of these are true:

- Player opted into tutorial (`wa_tut_tutorial_on` flag set)
- `wa_tut_forge_done` flag is NOT set
- Player taps "Begin Forging" for the first time
- Tutorial is enabled in options

Controller intercepts the forge start, runs the tutorial instead, then on completion the player can forge normally.

---

## Future Tutorials — Same Pattern

| Tutorial | File | Teaches |
|----------|------|---------|
| `forgeTutorial.js` | `src/tutorials/` | Bar sweep QTE, forge flow, weapon quality |
| `fishingTutorial.js` | `src/tutorials/` | Fishing QTE, catch/release, bait selection |
| `rhythmTutorial.js` | `src/tutorials/` | Rhythm QTE, timing, combo chains |
| `customerTutorial.js` | `src/tutorials/` | Customer interaction, pricing, reputation |

Each file follows the same contract: `init({ presenter, gameAction, onComplete })`, runs its sequence, calls `onComplete` when done. The presenter interface and step types are shared. Only the game actions and sequence data differ.

---

## Open Questions

1. **Dialogue source** — Should tutorial dialogue live in the sequence data (as shown above) or pull from `fairyPersonality.js`? Inline is simpler for now, personality file gives more character consistency.
2. **Forge intercept** — Should the controller intercept "Begin Forging" via bus (`MODE_FORGE_ENTER`) or should App.js check the flag before calling `setPhase`? Bus intercept is cleaner.
3. **Multiple QTE types** — When DES-2 ships (QTE plugin system), the sandbox auto-freeze needs to work with any QTE type, not just bar sweep. Design the freeze contract generically: `{ autoFreeze: true, freezeAfterMs: 1500, freezePosition: 0.75 }` as config passed to any QTE plugin.
4. **Skip behavior** — If the player taps fairy twice during forge tutorial (existing skip pattern), what happens? Probably: cancel sequence → `exit_sandbox` cleanup → mark done → return to idle. Same as current tutorial skip but with sandbox cleanup added.

---

*Add new tutorial specs to this file as new game systems are built.*