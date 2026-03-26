## Feature 2: Fairy System (Three-Layer Architecture)

**Blocked by:** Nothing (M-14 audio can be deferred)
**Risk:** MEDIUM — pawn is new orchestration layer, anim refactor touches working proto

Three-layer puppet architecture following UE conventions. Controller decides intent. Pawn translates intent into stage directions. AnimInstance executes the visual. Bus-listener architecture — read-only on game state. Day-gated pacing from FairyCharacter.md.

### Architecture

| Layer | UE Analogy | File | Job |
|-------|-----------|------|-----|
| FairyController | AIController | `src/modules/fairyController.js` | The brain. Decides WHEN to act and WHAT to say. FSM, rules evaluation, line picking, LLM routing, day-gating, pacing. |
| FairyPawn | Pawn / Character | `src/modules/fairyPawn.js` | The thing in the world. Decides WHERE to go and HOW. Position registry, target resolver, cue playback, action queue. |
| FairyAnimInstance | AnimInstance | `src/components/FairyAnimInstance.js` | Pure animation player. Receives commands, plays sprite/FX/bubble. Zero decision-making. |

Communication flows one direction: **Controller → Pawn → AnimInstance**. Controller possesses the Pawn. Pawn owns the AnimInstance. Each layer only talks to the one below it.

### What gets built

**New files:**

| File | Action |
|------|--------|
| `src/modules/fairyController.js` | Rename + expand from `fairyHelper.js` — keeps FSM/triggers/LLM, gains day-gating, pacing clock, pawn bridge |
| `src/modules/fairyPawn.js` | New — position registry, target resolver, cue player, action queue, staging logic |
| `src/components/FairyAnimInstance.js` | Refactor from `FairyAnim.js` — strip scheduling, position logic, quip decks. Keep sprite, FX, bubble, tap reaction. |
| `src/config/fairyCues.js` | New — named cue sequences (timelines of pawn commands) |
| `src/config/fairyPositions.js` | New — named position registry (static coords + dynamic target defs + roam zones + edge peeks) |

**Existing files (edit):**

| File | Action |
|------|--------|
| `src/config/fairyRulesTree.js` | Rename from `fairyTriggers.js` + edit — add `minDay` field per rule for day-gating |
| `src/App.js` | Edit — rename imports, wire pawn between controller and anim |
| `src/modules/desktopLayout.js` | Edit — add `data-fairy-target` attributes to key panels |
| `src/modules/mobileLayout.js` | Edit — same |
| Options menu (both layouts) | Edit — add fairy on/off toggle |

**Unchanged files:**

| File | Status |
|------|--------|
| `src/config/fairyPersonality.js` | No changes — 211 lines, 25 categories, 3 events |
| `src/logic/fairyAPI.js` | No changes — LLM fetch wrapper |
| `src/config/fairyConfig.js` | No changes — environment config |

**Deleted files:**

| File | Reason |
|------|--------|
| `src/modules/fairyHelper.js` | Renamed to `fairyController.js` |
| `src/components/FairyAnim.js` | Replaced by `FairyAnimInstance.js` |
| `src/config/fairyTriggers.js` | Renamed to `fairyRulesTree.js` |

---

### Layer Detail: FairyController (`fairyController.js`)

Renamed from `fairyHelper.js`. Pure JS singleton. The brain — possesses the pawn, never touches visuals.

**Keeps (from fairyHelper.js):**
- FSM: `off → idle → pointing → escalating → flustered → exiting → dismissed`
- Trigger evaluation against rules tree (bus events + ambient tick)
- Line picking from personality data (shuffle deck)
- LLM routing when no static line matches
- Cooldowns, once-flags, escalation counts
- Bus subscriptions + gameplay tracking (`_tracked` state)

**Gains:**
- Day-gating — checks current day against rule `minDay` + pacing table
- Pacing clock — scales ambient tick interval by day tier (rare early, frequent late)
- Pawn bridge — sends structured commands instead of raw lines

**Day-Gating Pacing Table** (from FairyCharacter.md):

| Day | Tier | Allowed Behavior | Ambient Interval | Max Appearances/Day |
|-----|------|-----------------|------------------|---------------------|
| 1–2 | `ftue` | Full FTUE, teaching triggers, constant presence | 8s | Unlimited |
| 3–5 | `quiet` | Rare peeks, occasional silent poof, NO dialogue triggers | 45s | 3 |
| 6–9 | `reactive` | Gameplay reactions (shatters, sales, copper, quality) | 20s | 8 |
| 10–14 | `active` | All reactions + fairy events (blessing, rescue, insight) | 15s | 12 |
| 15+ | `full` | Full commentary, chase events, rummaging, laser, head gag | 10s | Unlimited |

Each rule in `fairyRulesTree.js` gains a `minDay` field. Controller skips rules where `day < minDay`. Tier also gates entire categories — during `quiet` tier, controller only sends `silent_peek` and `silent_poof` cues (no speech).

**Controller → Pawn command format:**

```js
{
    intent: "react",              // "react" | "ambient" | "cue" | "dismiss"
    target: "forge",              // named position or null
    line: "...is it supposed to bend like that",
    category: "on_bad_quality",   // trigger category (for escalation tracking)
    cue: null,                    // named cue id or null (overrides target/line)
}
```

When the controller picks a cue (like `"crash_entrance"` or `"fairy_rescue"`), it sends `intent: "cue"` and the pawn handles the full sequence. When it just has a line and a context, the pawn picks the best staging.

---

### Layer Detail: FairyPawn (`fairyPawn.js`)

New file. Pure JS singleton (no React). The fairy's physical presence in the world — handles all spatial logic, cue playback, and staging.

**Owns:**
- Position registry — all named positions, static and dynamic
- Target resolver — `data-fairy-target` → viewport % via `getBoundingClientRect`
- Action queue — sequential commands with timing
- Cue playback — reads cue definitions from `fairyCues.js`, steps through timeline
- Staging logic — picks approach direction, peek edge, hover offset based on target location

**Does NOT own:**
- When to act (controller decides)
- What to say (controller decides)
- How animations render (AnimInstance does)

**Position Registry** (`fairyPositions.js`):

Two types of positions plus roam zones and edge peeks:

```js
// STATIC — hardcoded viewport %, never change
var STATIC = {
    center:       { x: 50, y: 50 },
    top_left:     { x: 15, y: 15 },
    top_right:    { x: 85, y: 15 },
    bottom_left:  { x: 15, y: 85 },
    bottom_right: { x: 85, y: 85 },
};

// DYNAMIC — resolved at runtime from data-fairy-target elements
var DYNAMIC = {
    forge:        { selector: "[data-fairy-target='forge']",    offset: { x: -8, y: -5 } },
    customer:     { selector: "[data-fairy-target='customer']", offset: { x: 5, y: 0 } },
    sell_btn:     { selector: "[data-fairy-target='sell-btn']", offset: { x: 0, y: -6 } },
    shelf:        { selector: "[data-fairy-target='shelf']",    offset: { x: -5, y: 0 } },
    gold:         { selector: "[data-fairy-target='gold']",     offset: { x: 4, y: 3 } },
    rep:          { selector: "[data-fairy-target='rep']",      offset: { x: 4, y: 3 } },
    time:         { selector: "[data-fairy-target='time']",     offset: { x: 0, y: 5 } },
    shop:         { selector: "[data-fairy-target='shop']",     offset: { x: 5, y: 0 } },
    decree:       { selector: "[data-fairy-target='decree']",   offset: { x: 0, y: 5 } },
};

// ROAM ZONES — rectangular areas the fairy can wander within
var ROAM_ZONES = {
    center_stage: { xMin: 30, xMax: 70, yMin: 35, yMax: 65 },
    left_margin:  { xMin: 5,  xMax: 20, yMin: 20, yMax: 80 },
    right_margin: { xMin: 80, xMax: 95, yMin: 20, yMax: 80 },
    top_shelf:    { xMin: 20, xMax: 80, yMin: 5,  yMax: 20 },
};

// EDGE PEEKS — from/to coordinate pairs for peek animations
var PEEKS = {
    bottom: { from: { x: 50, y: 115, rot: 0 },   to: { x: 50, y: 95, rot: 0 },   variance: { axis: "x", range: 15 } },
    top:    { from: { x: 50, y: -15, rot: 180 },  to: { x: 50, y: 5, rot: 180 },  variance: { axis: "x", range: 15 } },
    left:   { from: { x: -15, y: 50, rot: 90 },   to: { x: 5, y: 50, rot: 90 },   variance: { axis: "y", range: 12 } },
    right:  { from: { x: 115, y: 50, rot: -90 },  to: { x: 95, y: 50, rot: -90 }, variance: { axis: "y", range: 12 } },
};
```

**Target Resolver:**

One function. Converts `data-fairy-target` elements to viewport %. Caches results. Invalidates on window resize.

```js
// Returns { x, y } in viewport % or null if element not found
function resolveTarget(name) {
    var def = DYNAMIC[name];
    if (!def) return STATIC[name] || null;

    var el = document.querySelector(def.selector);
    if (!el) return null;

    var rect = el.getBoundingClientRect();
    var x = ((rect.left + rect.width / 2) / window.innerWidth) * 100 + (def.offset.x || 0);
    var y = ((rect.top + rect.height / 2) / window.innerHeight) * 100 + (def.offset.y || 0);

    return { x: x, y: y };
}
```

**Pawn → AnimInstance command format:**

```js
// Core movement
{ cmd: "move",   x: 42, y: 55, scale: 1.0, rot: 0, duration: 300, easing: "ease-out" }

// Appear / vanish
{ cmd: "poof_in",  x: 50, y: 50, scale: 1.0 }
{ cmd: "poof_out" }
{ cmd: "peek",     from: {...}, to: {...}, holdMs: 2500 }

// Speech
{ cmd: "speak",  text: "your forge is crying", duration: 3000 }
{ cmd: "hide_speech" }

// FX & Audio
{ cmd: "play_fx",    fx: "rubble", x: 50, y: 30 }
{ cmd: "play_audio", audio: "crash" }

// Animation state
{ cmd: "set_anim",   anim: "idle" }       // spritesheet swap
{ cmd: "freeze" }                          // pause all animation
{ cmd: "resume" }                          // unpause
{ cmd: "set_tappable", tappable: true }    // enable/disable tap interaction

// Special
{ cmd: "emote",  emote: "flinch" }                      // one-shot reaction animation
{ cmd: "follow", target: "forge", duration: 5000 }      // track a UI element for N ms
```

**Staging Logic:**

When the controller sends a simple `{ intent: "react", target: "forge", line: "..." }`, the pawn decides HOW to present it:

1. Is fairy currently visible? → move to target, then speak
2. Is fairy hidden? → poof_in near target, speak, schedule poof_out
3. Is target off-screen or on an edge? → peek from nearest edge, speak from there
4. No target specified? → pick random spot from roam zone, poof in

This logic lives entirely in the pawn. Controller doesn't care about staging.

---

### Layer Detail: FairyAnimInstance (`FairyAnimInstance.js`)

Refactored from `FairyAnim.js`. React component (forwardRef). Stripped of all scheduling, position logic, quip decks, and action selection.

**Keeps (from current FairyAnim.js):**
- Full-screen portal container (`createPortal` to `document.body`, `position: fixed; inset: 0`)
- Spritesheet rendering + frame ticker
- PoofFX component (3-layer: core flash + spark ring + dust motes)
- SpeechBubble component (scale-in/out, anchored to fairy position)
- Tap interaction system (5-tier irritation, dodge, nuclear exit) — self-contained reaction behavior
- Audio playback (pop sounds for poof/tap)

**Strips out:**
- Autonomous `runNext` loop (killed — pawn drives scheduling)
- Action deck shuffler (`nextAction`, `deckRef`)
- Quip deck shuffler (`nextQuip`, `quipDeckRef`)
- `EDGE_PEEKS` position data (moves to `fairyPositions.js`)
- `CENTER_POOFS` position data (moves to `fairyPositions.js`)
- `DODGE_SPOTS` position data (moves to `fairyPositions.js`)
- `FAIRY_QUIPS` / `PEEK_QUIPS` lines (already covered by `fairyPersonality.js`)
- `BETWEEN_DELAY_*` / `INITIAL_DELAY_*` timing (pawn owns scheduling)
- `commandQueueRef` (replaced by pawn's action queue)

**Command Interface via ref:**

```js
useImperativeHandle(ref, function() {
    return {
        // Core movement
        moveTo:      function(x, y, scale, rot, durationMs, easing) { ... },
        poofIn:      function(x, y, scale) { ... },
        poofOut:     function(onDone) { ... },
        peek:        function(from, to, holdMs, onDone) { ... },

        // Speech
        speak:       function(text, durationMs) { ... },
        hideSpeech:  function() { ... },

        // FX & Audio
        playFX:      function(fxId, x, y) { ... },
        playAudio:   function(audioId) { ... },

        // Animation state
        setAnim:     function(animId) { ... },
        freeze:      function() { ... },
        resume:      function() { ... },

        // Interaction
        setTappable: function(enabled) { ... },

        // Special
        emote:       function(emoteId, onDone) { ... },

        // Query
        isVisible:   function() { ... },
        getPos:      function() { return { x, y, scale, rot }; },
    };
});
```

**Root Transform:**

Single div. Four CSS properties. Fully puppeted by the pawn.

```
position: absolute
left: {x}%
top: {y}%
transform: translate(-50%, -50%) scale({scale}) rotate({rot}deg)
transition: {duration}ms {easing}
```

Everything the pawn sends maps directly to these four values. No offset math, no edge calculations, no inset adjustments inside the anim file.

**Tap Interaction (unchanged):**

Tap behavior stays self-contained inside AnimInstance. When fairy is tappable and gets tapped, the irritation tier system handles dodge/nuclear/exit internally. On exit, it fires an `onTapExit` callback so the pawn knows the fairy left and can report back to the controller.

---

### Cue System (`fairyCues.js`)

Named timelines of pawn commands. Each cue is an array of steps with timing. Pure data — no logic, no imports.

```js
var CUES = {

    // --- Entrances ---
    crash_entrance: {
        id: "crash_entrance",
        description: "Falls through ceiling with rubble FX",
        steps: [
            { at: 0,    cmd: "play_audio", audio: "crash" },
            { at: 0,    cmd: "play_fx",    fx: "rubble", x: 50, y: 20 },
            { at: 200,  cmd: "poof_in",    x: 50, y: 50, scale: 0.8 },
            { at: 300,  cmd: "emote",      emote: "dizzy" },
            { at: 1200, cmd: "speak",      text: "...ow.", duration: 2000 },
            { at: 3500, cmd: "poof_out" },
        ],
    },

    // --- Fairy Rescue (shatter intervention) ---
    fairy_rescue: {
        id: "fairy_rescue",
        description: "Catches weapon mid-shatter, restores at 35%",
        steps: [
            { at: 0,    cmd: "play_audio", audio: "fairy_swoosh" },
            { at: 0,    cmd: "poof_in",    x: 50, y: 50, scale: 1.2 },
            { at: 100,  cmd: "play_fx",    fx: "divine_catch" },
            { at: 400,  cmd: "emote",      emote: "strain" },
            { at: 800,  cmd: "speak",      text: null, duration: 3000 },
            { at: 4000, cmd: "emote",      emote: "embarrassed" },
            { at: 5000, cmd: "poof_out" },
        ],
    },

    // --- Fairy Blessing (morning buff) ---
    fairy_blessing: {
        id: "fairy_blessing",
        description: "Appears with divine glow, grants hammer zone buff",
        steps: [
            { at: 0,    cmd: "play_fx",    fx: "divine_flare" },
            { at: 200,  cmd: "poof_in",    x: 50, y: 40, scale: 1.0 },
            { at: 400,  cmd: "set_anim",   anim: "glow" },
            { at: 600,  cmd: "speak",      text: null, duration: 3000 },
            { at: 4000, cmd: "set_anim",   anim: "idle" },
            { at: 4200, cmd: "poof_out" },
        ],
    },

    // --- Fairy Insight (customer haggle whisper) ---
    fairy_insight: {
        id: "fairy_insight",
        description: "Whispers weapon's true value during customer haggle",
        steps: [
            { at: 0,    cmd: "poof_in",    x: null, y: null, scale: 0.7 },
            { at: 400,  cmd: "move",       target: "customer", duration: 300 },
            { at: 800,  cmd: "speak",      text: null, duration: 3000 },
            { at: 4000, cmd: "poof_out" },
        ],
    },

    // --- Silent peek (quiet days 3-5) ---
    silent_peek: {
        id: "silent_peek",
        description: "Just peeks from an edge, no speech",
        steps: [
            { at: 0, cmd: "peek", edge: "random", holdMs: 2500 },
        ],
    },

    // --- Silent poof (quiet days 3-5) ---
    silent_poof: {
        id: "silent_poof",
        description: "Poofs in briefly, looks around, poofs out. No speech.",
        steps: [
            { at: 0,    cmd: "poof_in",  x: null, y: null, scale: 1.0 },
            { at: 3000, cmd: "poof_out" },
        ],
    },

    // --- Standard speak (most common - used for most triggers) ---
    speak_at_target: {
        id: "speak_at_target",
        description: "Poof in near target, say line, poof out",
        steps: [
            { at: 0,    cmd: "poof_in",  x: null, y: null, scale: 1.0 },
            { at: 600,  cmd: "speak",    text: null, duration: null },
            { at: null, cmd: "poof_out" },
        ],
    },

    // --- Running head gag (Day 15+) ---
    running_head: {
        id: "running_head",
        description: "Her head slides across the bottom of the screen. Monty Python.",
        steps: [
            { at: 0,    cmd: "set_anim",  anim: "head_only" },
            { at: 0,    cmd: "move",      x: -10, y: 95, scale: 3.0, rot: 0, duration: 0 },
            { at: 100,  cmd: "move",      x: 110, y: 95, scale: 3.0, rot: 0, duration: 4000, easing: "linear" },
            { at: 2000, cmd: "speak",     text: null, duration: 1500 },
            { at: 4200, cmd: "set_anim",  anim: "idle" },
        ],
    },

    // --- Super Saiyan (once per playthrough, extreme provocation) ---
    super_saiyan: {
        id: "super_saiyan",
        description: "Divine tantrum. Hair blazes. UI cracks. She is horrified at herself.",
        steps: [
            { at: 0,    cmd: "play_audio", audio: "divine_crack" },
            { at: 0,    cmd: "play_fx",    fx: "divine_flare" },
            { at: 0,    cmd: "set_anim",   anim: "saiyan" },
            { at: 200,  cmd: "play_fx",    fx: "screen_crack" },
            { at: 200,  cmd: "play_fx",    fx: "ui_shake" },
            { at: 1500, cmd: "play_fx",    fx: "screen_uncrack" },
            { at: 2000, cmd: "set_anim",   anim: "idle" },
            { at: 2200, cmd: "speak",      text: "i... that wasn't me. the wind did that.", duration: 3000 },
            { at: 5500, cmd: "emote",      emote: "embarrassed" },
            { at: 6500, cmd: "poof_out" },
        ],
    },

    // --- Chase event (something chasing her) ---
    chase_event: {
        id: "chase_event",
        description: "She is panicking. Bounces between positions. Player must tap to save.",
        steps: [
            { at: 0,    cmd: "play_audio", audio: "fairy_panic" },
            { at: 0,    cmd: "poof_in",    x: 80, y: 30, scale: 0.8 },
            { at: 200,  cmd: "speak",      text: "HELP HELP HELP", duration: 1000 },
            { at: 800,  cmd: "move",       x: 20, y: 60, scale: 0.6, duration: 400 },
            { at: 1400, cmd: "move",       x: 70, y: 40, scale: 0.7, duration: 400 },
            { at: 2000, cmd: "set_tappable", tappable: true },
            { at: 2000, cmd: "speak",      text: "TAP ME TAP ME", duration: 2000 },
        ],
    },
};
```

**Null values** in cues are placeholders resolved by the pawn at playback time:
- `text: null` → pawn fills from controller's line
- `x: null, y: null` → pawn resolves from controller's target or picks a roam zone
- `at: null` → pawn calculates based on previous step's end time
- `duration: null` → pawn calculates read time from text length
- `edge: "random"` → pawn picks a random edge
- `target: "customer"` → pawn resolves via target resolver

This keeps cues reusable. The same `speak_at_target` cue works for any trigger — the controller provides the content, the pawn provides the coordinates.

---

### LLM Integration (enhanced by pawn)

The pawn enables a new LLM capability: **spatial intent**. The controller already routes to LLM for complex state combos. With the pawn, the LLM can also express where it wants to be.

**System prompt addition for LLM:**

```
Available positions: forge, customer, shelf, gold, rep, time, shop, decree, center
Available cues: crash_entrance, silent_peek, speak_at_target, running_head
You may include a target in your response using [target:forge] syntax.
You may include a cue using [cue:crash_entrance] syntax.
If you don't specify, the pawn picks staging for you.
```

**LLM response parsing in fairyAPI.js:**

```js
// Input:  "your forge is literally crying [target:forge]"
// Output: { text: "your forge is literally crying", target: "forge", cue: null }
```

The LLM doesn't choreograph animations. It just says "I'd stand near the forge for this one" and the pawn does the rest. If the LLM doesn't include a target, the controller picks based on trigger context (shatter → forge, sale → customer, etc.).

---

### Wiring in App.js

```js
// Init order matters: controller first, then pawn
FairyController.init({
    bus: GameplayEventBus,
    stateProvider: function() { return { ... }; },
    onCommand: function(command) {
        FairyPawn.receive(command);
    },
});

FairyPawn.init({
    animRef: fairyAnimRef,
    onTapExit: function() {
        FairyController.onPawnEvent("tap_exit");
    },
    onCueComplete: function(cueId) {
        FairyController.onPawnEvent("cue_complete", cueId);
    },
});
```

Controller → Pawn via `onCommand` callback. Pawn → AnimInstance via ref methods. Pawn → Controller feedback via `onPawnEvent` (tap exits, cue completions). No circular dependencies.

---

### Milestones (revised)

**Already complete (from prior sessions):**
- M-1: Data files — `fairyRulesTree.js` + `fairyPersonality.js`
- M-2: State machine core — `fairyHelper.js` (becomes `fairyController.js`)
- M-4: Bus integration — fairy watches gameplay tags, fires at trigger conditions
- M-LLM: LLM client — `fairyAPI.js` + `fairyConfig.js` (mock mode active)
- Animation proto — `FairyAnim.js` (becomes `FairyAnimInstance.js`)

**New milestones:**

- **M-5: Position registry + target resolver** — `fairyPositions.js` created. Target resolver built into `fairyPawn.js`. `data-fairy-target` attributes added to both layouts. Resize cache invalidation.
- **M-6: Cue data file** — `fairyCues.js` created. All cue timelines defined as pure data. Start with: `silent_peek`, `silent_poof`, `speak_at_target`, `crash_entrance`, `fairy_rescue`, `fairy_blessing`.
- **M-7: FairyPawn core** — `fairyPawn.js` built. Action queue, cue player, staging logic. Receives commands from controller, dispatches to AnimInstance ref.
- **M-8: FairyAnimInstance refactor** — Strip `FairyAnim.js` down to pure renderer. Kill autonomous loop. Expose full command interface via ref. Move position data out. Keep sprite, FX, bubble, tap.
- **M-9: FairyController upgrade** — Rename `fairyHelper.js`. Add day-gating pacing table. Add `minDay` to rules in `fairyRulesTree.js`. Wire `onCommand` to pawn. Scale ambient tick by tier.
- **M-10: App.js rewire** — Update imports. Wire controller → pawn → animInstance chain. Test end-to-end.
- **M-11: Laser FX** — Beam from fairy to target UI element. Built as a cue step (`cmd: "laser"`). Uses resolved target positions from pawn.
- **M-12: Persistence + toggle** — localStorage for taught topics, fairy on/off. Options menu in both layouts.
- **M-13: Special cues** — `super_saiyan`, `chase_event`, `running_head`, `fairy_insight`. Day-gated to appropriate tiers.
- **M-14: Gibberish speech audio** — Procedural via Web Audio, synced to speech bubbles. Can defer.

### Build Order

| Order | Milestone | Risk | Dependencies |
|-------|-----------|------|-------------|
| 1 | M-5: Position registry | LOW | None |
| 2 | M-6: Cue data file | LOW | None |
| 3 | M-8: AnimInstance refactor | MEDIUM | None (can test standalone) |
| 4 | M-7: Pawn core | MEDIUM | M-5, M-6, M-8 |
| 5 | M-9: Controller upgrade | MEDIUM | M-7 |
| 6 | M-10: App.js rewire | LOW | M-7, M-8, M-9 |
| 7 | M-11: Laser FX | MEDIUM | M-7 |
| 8 | M-12: Persistence | LOW | M-9 |
| 9 | M-13: Special cues | LOW | M-7 |
| 10 | M-14: Audio | LOW | M-8 (defer) |

### Concerns

- **AnimInstance refactor scope.** FairyAnim.js is ~860 lines. Stripping the loop, decks, and position data should drop it to ~400. The tap interaction system is self-contained and stays, but its dodge positions need to come from pawn instead of hardcoded arrays.
- **Pawn complexity.** The cue player is essentially a timeline sequencer. Keep it simple — `setTimeout` chain, not a full animation engine. Each step fires at its `at` time relative to cue start.
- **Target resolver on mobile.** `getBoundingClientRect` works differently when the game shell is scaled (desktop) vs full-viewport (mobile). Pawn needs to handle both. Test early.
- **Tap exit flow.** When AnimInstance handles a tap-to-nuclear-exit, it needs to tell the pawn "I'm gone now" so the pawn can clean up and tell the controller. The `onTapExit` callback handles this but the timing needs to be clean — no orphaned state.