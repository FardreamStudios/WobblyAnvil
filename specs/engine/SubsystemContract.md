# Subsystem Contract & Engine Architecture

**Status:** Draft v1
**Scope:** Formalizes the "Shape A" subsystem pattern used by `abilitySubSystem.js` and specs the new `CueManager`, `AudioEngine`, and `VFXEngine` that Adventure Mode will wire into.
**Non-destructive:** Existing `audio.js`, `fxCueSubSystem.js`, `useVFXState.js` stay untouched. Forge/shop continues to run on them. New systems live alongside under `src/engine/`.

---

## 1. Why This Doc Exists

The project has two subsystem shapes coexisting today:

- **Shape A — Pure JS Singleton Subsystem.** Used by `abilitySubSystem.js`, `fxCueSubSystem.js`, `gameplayEventBus.js`. Module-level state, `init(bus, deps)` / `destroy()` lifecycle, registry-driven, zero React, fully portable.
- **Shape B — React Hook with Embedded State.** Used by `audio.js` (via `useAudio`), `useVFXState.js`. Mixes framework lifecycle with engine state, harder to reason about, not portable.

**Shape A wins.** Ability is the gold standard — registry, instance lifecycle, bus-native, pure JS. This doc formalizes Shape A as **the Subsystem Contract** so every new subsystem follows the same rules, and makes `AbilityManager`'s implicit pattern explicit.

---

## 2. The Subsystem Contract

Every subsystem built against this contract MUST follow these rules:

### 2.1 Pure JS
- No React imports. No `useState`, `useEffect`, `useRef`, no JSX.
- No DOM access beyond what the engine layer requires (e.g. `window.AudioContext` is fine, `document.getElementById` is not).
- Exportable and usable in a Node script or a different framework with zero changes.

### 2.2 Singleton with Explicit Lifecycle
Every subsystem exposes the same lifecycle surface:

```
Subsystem.init(bus, deps)   — wire up, subscribe to bus, ready to serve
Subsystem.destroy()         — unsubscribe, clear state, safe to re-init
Subsystem.reset()           — (optional) soft reset without full teardown
```

Module-level `_` vars hold state. A `_initialized` flag guards double-init. `init` accepts a `deps` object for anything the subsystem needs from outside (other subsystems, refs, state providers).

### 2.3 Bus-Only Communication
Subsystems talk to the outside world **only** through the `GameplayEventBus`. They:
- Listen to tags (`bus.on(tag, handler)`)
- Emit tags (`bus.emit(tag, payload)`)
- Never reach into other subsystems' state directly
- Never call React setters or hooks

The single exception is the Modifier system (see §4), which exposes a synchronous `resolveValue()` API for read-on-demand gameplay queries.

### 2.4 Registry-Driven
Content (cues, abilities, patches) is registered as **data definitions**, not hardcoded logic. Adding a new cue is adding a row to an array. Adding a new ability is writing a definition object. The subsystem is dumb plumbing — definitions own the behavior.

### 2.5 Escape-Hatch Philosophy
Data definitions cover 80% of cases. For the weird 20%, definitions can include `execute` / `onActivate` / `onEnd` functions that receive a context object and do whatever they need. This matches UE's `BlueprintNativeEvent` pattern — data first, code when necessary.

### 2.6 React Seam
React touches a subsystem at exactly one place: a thin adapter hook (e.g. `useEngineAudio`) that calls `init` on mount and `destroy` on unmount. That hook is five lines. Everywhere else, the subsystem is framework-agnostic.

---

## 3. Vocabulary

To avoid confusion with React's `useEffect` and to keep mental mapping to UE clean, the project uses this vocabulary:

| Term | Meaning | UE Equivalent | React Conflict? |
|---|---|---|---|
| **Cue** | Presentation unit. Audio + VFX bundled. Fires on a bus tag. | GameplayCue | None |
| **Modifier** | Timed/conditional stat change applied by an ability. | GameplayEffect | Avoids "effect" |
| **Ability** | Logic container that spawns cues and modifiers. | GameplayAbility | None |
| **Patch** | Voice recipe — defines how a single sound is produced (synth or sample). | USoundCue asset | None |
| **Sound Class** | Node in a gain hierarchy for mixing and ducking. | USoundClass | None |
| **Voice** | One oscillator or sample player within a patch. Multiple voices stack to form chiptune-style sounds. | Single audio component | None |

**Rule: never use the word "effect" for gameplay modifiers in code or docs.** Use "Modifier." This keeps React's `useEffect` in its own lane and prevents mental collisions.

---

## 4. Modifier System (Already Built)

**`AbilityManager` already implements what UE calls GameplayEffects.** It's called Modifiers. This section documents what exists — no new build.

### 4.1 What a Modifier Is
A modifier is a stat override applied by an ability while that ability is active. When the ability ends, its modifiers are removed.

```
{
  source:    "poison_aura_42",   // instanceId or ability id
  attribute: "playerSpeed",
  operation: "multiply",         // override | multiply | add | set_min | set_max
  value:     0.5,
}
```

### 4.2 Resolution Order
`AbilityManager.resolveValue(attribute, baseValue)` applies modifiers in fixed order:

1. **Override** — last override wins, short-circuits below
2. **Multiply** — all stack multiplicatively
3. **Add** — all stack additively
4. **Clamp** — `set_min` raises, `set_max` caps

### 4.3 How Consumers Use It
Any system that needs a modifiable stat asks for it on-demand:

```
var speed = AbilityManager.resolveValue("playerSpeed", BASE_SPEED);
```

No caching, no dirty flags — read at the moment of use. Simple and correct.

### 4.4 Lifecycle Binding
Modifiers are added by abilities in `onActivate` and auto-removed on `onEnd` via `removeModifiersBySource(instanceId)`. Abilities never leak modifiers.

**This is already working in production. Documented here so the contract is complete — not re-built.**

---

## 5. The Cue System (New Build)

### 5.1 What a Cue Is
A cue is a presentation unit — one tag fires, audio plays, visuals trigger. Audio and VFX live in the **same cue definition**, matching UE's GameplayCue model. A cue can be audio-only, vfx-only, or both.

### 5.2 Cue Definition Schema

```
{
  id:        "Combat.Hit.Critical",       // globally unique
  tag:       "cue.combat.hit.critical",   // bus tag that fires this cue
  type:      "oneshot",                   // "oneshot" | "loop"

  audio: {
    patch:     "crit_hit",                // id from patch library
    class:     "SFX.Combat.Impacts",      // sound class path
    volume:    1.0,                       // optional override
    pitch:     1.0,                       // optional override
    priority:  "normal",                  // "low" | "normal" | "high"
  },

  vfx: {
    shake:     "medium",                  // preset id
    particle:  "spark_burst",             // particle id
    vignette:  null,                      // color or null
  },

  // Optional escape hatch — runs after data dispatch
  execute: function(ctx) {
    // ctx = { audio, vfx, payload, bus, cueId }
    // Custom logic: conditional voices, chained cues, etc.
  },
}
```

### 5.3 Oneshot vs Loop

**Oneshot** — fire and forget. Play once, clean up when done. 90% of cues.

**Loop** — lifecycle-managed. Starts on one tag, plays until another tag stops it. Music beds, ambient loops, sustained channeled abilities.

Loop cues use a tag pair convention:

```
{
  id:   "Music.Campaign",
  tag:  "cue.loop.music.campaign.start",
  type: "loop",
  stopTag: "cue.loop.music.campaign.stop",
  audio: { patch: "campaign_theme", class: "Music.Ambient" },
}
```

Or the generic stop tag `cue.loop.stop.all` clears everything — useful for scene transitions.

### 5.4 CueManager Responsibilities

- Hold the cue registry (`register`, `registerAll`)
- Subscribe to all cue tags on `init`
- On tag emission, look up cue, dispatch to AudioEngine and/or VFXEngine
- Track active loop cues, stop them on stopTag or destroy
- Run optional `execute` function with context after data dispatch
- Unsubscribe cleanly on `destroy`

**CueManager knows nothing about Web Audio or particle systems.** It's a router. It tells the engines what to play; the engines decide how.

### 5.5 Relationship to Existing `fxCueSubSystem`

`fxCueSubSystem` stays as-is. Forge/shop still uses it. The new `CueManager` is a parallel system Adventure Mode wires into. Both can run simultaneously — they subscribe to different tag prefixes (`fx.*` vs `cue.*`). When Adventure is stable, we migrate forge/shop cue-by-cue at our leisure.

---

## 6. AudioEngine (New Build)

### 6.1 Role
The lowest layer — actually produces sound. Owns Web Audio nodes, sound class tree, patch library, voice limiting, sample loading and caching. Knows nothing about the bus or cues.

**API surface (what CueManager calls):**

```
AudioEngine.init(deps)
AudioEngine.destroy()

AudioEngine.playPatch(patchId, params)   // params: { class, volume, pitch, priority }
AudioEngine.startLoop(loopId, patchId, params)
AudioEngine.stopLoop(loopId, fadeMs)
AudioEngine.stopAllLoops(fadeMs)

AudioEngine.setClassVolume(classPath, volume, fadeMs)
AudioEngine.getClassVolume(classPath)
AudioEngine.muteClass(classPath)
AudioEngine.unmuteClass(classPath)

AudioEngine.loadSample(url)              // returns Promise, caches result
AudioEngine.preloadSamples(urlArray)     // batch preload

AudioEngine.resume()                     // call on first user interaction
```

### 6.2 Sound Class Tree (Starter)

```
Master (1.0)
├── Music (0.45)
│   ├── Ambient
│   └── Combat
└── SFX (0.8)
    ├── UI
    ├── Forge
    ├── Combat
    │   ├── Weapons
    │   └── Impacts
    └── Ambient
```

- Each node is a Web Audio `GainNode`
- Children feed into parent; parent feeds into grandparent; root feeds into destination
- Volume at any node multiplies down the tree
- `setClassVolume("Music", 0.3, 500)` ducks all music over 500ms — enables ducking for boss voices, etc.
- Tree is defined in `soundClasses.js` as data; can be extended later

### 6.3 Patch Schema

A patch is a voice recipe. Two types:

**Synth patch:**
```
{
  id:    "hammer_hit",
  type:  "synth",
  voices: [
    {
      wave:     "square",             // sine | square | triangle | sawtooth | noise
      freq:     880,                  // base frequency Hz
      envelope: {
        attack:  0.01,
        decay:   0.1,
        sustain: 0.3,
        release: 0.2,
      },
      detune:   0,                    // cents
      volume:   1.0,                  // relative within patch
    },
    // ...additional voices stack to form chord/timbre
  ],
  maxConcurrent: 4,                   // voice limit for this patch
}
```

**Sample patch:**
```
{
  id:    "hammer_ping_1",
  type:  "sample",
  url:   "/audio/sHammerPing1.mp3",
  volume: 1.0,
  pitch:  1.0,
  maxConcurrent: 8,
}
```

Both types are called identically by CueManager: `AudioEngine.playPatch("hammer_hit", params)`. The engine dispatches internally based on `type`.

### 6.4 Voice Limiting (Concurrency)

Each patch declares `maxConcurrent`. When a new play request arrives and the limit is hit, the oldest voice is stopped and the new one takes its slot. This prevents "hammer spam" from stacking into distortion.

Priority hook: higher-priority requests can preempt lower-priority voices regardless of patch limit (reserved for V2, scaffold only in V1).

### 6.5 Sample Loading

- `AudioEngine.loadSample(url)` fetches, decodes, caches in a Map keyed by url
- Returns a Promise resolving to the `AudioBuffer`
- `playPatch` on a sample patch auto-loads if not cached (with one-frame delay the first time)
- `preloadSamples(urls)` warms the cache at boot time for critical sounds
- Files live at `public/audio/*.mp3` (already exists in project)

### 6.6 The Old `audio.js` is the Reference
`audio.js` has working Web Audio primitives — `tone()`, `noise()`, gain nodes, music playback. AudioEngine's guts will mirror that working code, just restructured around patches and sound classes instead of hardcoded methods. **Nothing is being invented that doesn't already work somewhere in the codebase.**

---

## 7. VFXEngine (New Build, Lightweight)

### 7.1 Role
Thin wrapper over the existing VFX layer. Owns the shake/vignette state, forwards particle requests to the `sceneFxRef` or `fxRef`. Knows nothing about the bus or cues.

**API surface:**

```
VFXEngine.init(deps)                 // deps: { fxRef, sceneFxRef }
VFXEngine.destroy()

VFXEngine.shake(preset, duration)    // preset: "light" | "medium" | "heavy"
VFXEngine.vignette(color, opacity, fadeMs)
VFXEngine.clearVignette(fadeMs)
VFXEngine.particle(id, params)       // params: { x, y, count, color }
```

### 7.2 Why Lightweight
The project already has working particles and shake. We're not rebuilding any of that — we're giving CueManager a stable API to call, and centralizing where shake state lives so bus emissions stop going to `useVFXState` directly when running on the new system.

### 7.3 Shake Presets

```
{
  light:  { amplitude: 2,  duration: 150 },
  medium: { amplitude: 5,  duration: 300 },
  heavy:  { amplitude: 10, duration: 500 },
}
```

Defined in `shakePresets.js` as data. Extensible.

### 7.4 VFX State Bridge
During Adventure Mode, `useVFXState` is not the owner of shake flags — VFXEngine is. VFXEngine emits internal bus tags that `useVFXState` can subscribe to **or** we provide a getter (`VFXEngine.getShakeState()`) the React layer polls via a small hook. **Design decision deferred to implementation turn** — both work, pick whichever is simpler when we build it.

---

## 8. useEngineAudio — The React Seam

The five-line adapter. This is the **only** React code in the entire engine layer.

```
function useEngineAudio(deps) {
    useEffect(function() {
        AudioEngine.init({});
        VFXEngine.init({ fxRef: deps.fxRef, sceneFxRef: deps.sceneFxRef });
        CueManager.init(GameplayEventBus, { audioEngine: AudioEngine, vfxEngine: VFXEngine });
        CueManager.registerAll(ALL_CUES);
        return function() {
            CueManager.destroy();
            VFXEngine.destroy();
            AudioEngine.destroy();
        };
    }, []);
}
```

Called once inside `AdventureGameMode`. That's it. No other React touches the engine.

---

## 9. File Tree

```
src/engine/
├── audioEngine/
│   ├── AudioEngine.js              # the engine itself
│   ├── soundClasses.js             # starter sound class tree data
│   ├── patches/
│   │   ├── index.js                # ALL_PATCHES export
│   │   ├── synthPatches.js         # chiptune voice definitions
│   │   └── samplePatches.js        # sample file references
│   └── voiceLimiter.js             # concurrency tracker
│
├── vfxEngine/
│   ├── VFXEngine.js                # the engine itself
│   └── shakePresets.js             # shake preset data
│
├── cueManager/
│   ├── CueManager.js               # tag router + loop lifecycle
│   └── cues/
│       ├── index.js                # ALL_CUES export
│       ├── adventureCues.js        # adventure mode cues (MVP target)
│       └── (forgeCues/battleCues added later during migration)
│
└── useEngineAudio.js               # the React seam
```

**Everything under `src/engine/` follows the Subsystem Contract.** This folder is the "portable engine" — could be lifted into another project with zero edits outside replacing the bus import.

---

## 10. Worked Examples

### 10.1 Audio-Only Oneshot (UI Click)

```
{
  id:   "UI.Click.Button",
  tag:  "cue.ui.click.button",
  type: "oneshot",
  audio: {
    patch: "ui_click",
    class: "SFX.UI",
  },
}
```

**Patch:**
```
{
  id:    "ui_click",
  type:  "synth",
  voices: [{
    wave: "square",
    freq: 900,
    envelope: { attack: 0.005, decay: 0.03, sustain: 0, release: 0.02 },
  }],
  maxConcurrent: 3,
}
```

**Firing:** `bus.emit("cue.ui.click.button")`

### 10.2 Audio + VFX Oneshot (Critical Hit)

```
{
  id:   "Combat.Hit.Critical",
  tag:  "cue.combat.hit.critical",
  type: "oneshot",
  audio: {
    patch: "crit_hit_synth",
    class: "SFX.Combat.Impacts",
  },
  vfx: {
    shake:    "medium",
    particle: "spark_burst",
  },
}
```

**Firing:** `bus.emit("cue.combat.hit.critical", { x: 400, y: 300 })`

The particle x/y come from payload; CueManager passes payload through to VFXEngine.particle call.

### 10.3 Looping Cue (Campaign Map Music)

```
{
  id:      "Music.Campaign.Map",
  tag:     "cue.loop.music.campaign.start",
  stopTag: "cue.loop.music.campaign.stop",
  type:    "loop",
  audio: {
    patch: "campaign_theme",
    class: "Music.Ambient",
  },
}
```

**Starting:** `bus.emit("cue.loop.music.campaign.start")`
**Stopping:** `bus.emit("cue.loop.music.campaign.stop")`
**Or global stop:** `bus.emit("cue.loop.stop.all")` — CueManager stops every active loop

### 10.4 Sample-Backed Oneshot (Hammer Ping)

```
{
  id:   "Forge.Hammer.Ping",
  tag:  "cue.forge.hammer.ping",
  type: "oneshot",
  audio: {
    patch: "hammer_ping_1",
    class: "SFX.Forge",
  },
}
```

**Patch:**
```
{
  id:    "hammer_ping_1",
  type:  "sample",
  url:   "/audio/sHammerPing1.mp3",
  maxConcurrent: 6,
}
```

Same firing syntax as synth cues. CueManager doesn't care; AudioEngine dispatches internally.

### 10.5 Escape-Hatch Execute (Conditional Voices)

```
{
  id:   "Combat.Hit.Scaling",
  tag:  "cue.combat.hit.scaling",
  type: "oneshot",
  audio: {
    patch: "hit_base",
    class: "SFX.Combat.Impacts",
  },
  execute: function(ctx) {
    // payload.damage drives an extra voice on big hits
    if (ctx.payload.damage > 50) {
      ctx.audio.playPatch("hit_crunch_layer", { class: "SFX.Combat.Impacts" });
    }
  },
}
```

The `audio` data block always plays. The `execute` function runs after and can layer extras. Both data and code working together — UE's `BlueprintNativeEvent` in spirit.

---

## 11. Relationship to Existing Code

| Existing File | Status | Notes |
|---|---|---|
| `gameplayEventBus.js` | **Keep, unchanged.** | Already pure JS singleton. The bus for everything. |
| `abilitySubSystem.js` | **Keep, unchanged.** | Gold-standard Shape A. Documented here as the Modifier system. |
| `audio.js` | **Keep, unchanged.** | Forge/shop keeps using `useAudio()`. Eventually migrated. |
| `fxCueSubSystem.js` | **Keep, unchanged.** | Forge/shop keeps using it. Parallel to new CueManager. |
| `useVFXState.js` | **Keep, unchanged.** | React-side VFX state continues to work for non-Adventure flows. |
| `useInputRouter.js` | **Keep, unchanged.** | Unrelated. |

**New code is purely additive.** Nothing breaks. Nothing migrates in V1.

---

## 12. MVP Build Scope

**Turn 2 — AudioEngine Foundation**
- `AudioEngine.js` with playPatch, sound class tree wiring, sample loader, voice limiter stub
- `soundClasses.js` — starter tree data
- `synthPatches.js` — 2 example synth patches (ui_click, test_tone)
- `samplePatches.js` — 1 example sample patch using existing `sHammerPing1.mp3`
- `voiceLimiter.js` — simple FIFO voice tracker

**Turn 3 — CueManager + VFXEngine + React Seam**
- `CueManager.js` with registry, oneshot + loop lifecycle, execute dispatch
- `VFXEngine.js` — lightweight wrapper over fxRef + shake state
- `shakePresets.js` — preset data
- `adventureCues.js` — 3 example cues (ui click synth, hammer ping sample, campaign music loop)
- `useEngineAudio.js` — the React seam

**Turn 4 — Adventure Mode Smoke Test**
- Wire `useEngineAudio` into `AdventureGameMode`
- Fire one cue on campaign map enter (verify audio plays)
- Fire one looping cue, verify start/stop lifecycle
- Fire one sample cue, verify sample loads and plays
- Verify no conflicts with existing `audio.js` running in forge/shop

**Buffer Turn — Fixes and polish.**

---

## 13. Out of Scope for V1

These are called out so they don't get scope-crept into MVP:

- **Migration of forge/shop sfx.** Deferred. `audio.js` keeps running.
- **Priority-based voice preemption.** Scaffolded in patch schema, not implemented.
- **Sound class ducking automation** (e.g. auto-duck music when SFX.Combat plays). Can be done manually via `setClassVolume`, auto-ducking is V2.
- **Crossfading between loops.** V2. V1 stops abruptly or fades linearly.
- **Spatial audio / stereo panning.** V2.
- **VFX expansion beyond wrapping existing fxRef.** V2.
- **Effect chains** (reverb, filters). V2. Sound classes can host them later.
- **Editor / debug UI** for tweaking patches live. Nice-to-have, V2.

---

## 14. Open Questions Deferred to Implementation

These are flagged now so they don't block the doc approval:

1. **VFX state bridge mechanism** (§7.4) — bus subscription vs getter hook. Pick simpler during Turn 3.
2. **Sample auto-load vs required preload** (§6.5) — first-frame delay on uncached samples. Acceptable in MVP? Decide during Turn 2 based on Web Audio decode latency.
3. **Loop fade default duration.** Pick a sensible default (250ms?) during Turn 3.
4. **Patch pitch parameter semantics** — multiplier vs cents vs semitones. Pick during Turn 2.

None of these block the contract. All are small decisions made during build.

---

## 15. Approval Gate

This doc locks:
- The Subsystem Contract (Shape A rules)
- The vocabulary (Cue, Modifier, Patch, Sound Class, Voice)
- The three new subsystems (CueManager, AudioEngine, VFXEngine) and their roles
- Unified audio+vfx cue definitions (Option A from planning)
- The starter sound class tree
- The file tree under `src/engine/`
- The MVP build scope (Turns 2–4)

**On approval,** Turn 2 begins: AudioEngine foundation. No code is written before this doc is approved.