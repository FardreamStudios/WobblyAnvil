# Combat Feel Rework Spec

**Status:** DRAFT — Pending approval  
**Scope:** Chalkboard QTE system (3 check types), front-loaded offense, animation-read defense, difficulty presets, three-tier scoring  
**Depends on:** Existing combo beat system (§7), choreography steps 1–12 (all ✅), QTERunner, battleSkills.js

---

## 1. Problem Statement

The current system interleaves QTE rings with choreography for every beat on both offense and defense. The player stares at shrinking circles the entire fight. All the choreography work — lunges, telegraphs, combat-sync animations — goes unnoticed because eyes are glued to the ring. Additionally, offense uses only one input type (tap), which creates monotony across multi-beat combos.

### Goals

- **Offense:** Front-load the QTE. Player performs all checks upfront on the Chalkboard, then watches the results play out cinematically.
- **Chalkboard variety:** Three QTE check types — ring (tap), swipe (directional release), circle (trace release) — mixed per-skill to create unique combo rhythms.
- **Defense:** Remove rings entirely. Player reads enemy choreography (telegraph → strike lunge) and reacts with tap (brace) or swipe (dodge) at the right moment.
- **Scoring:** Three-tier results (perfect / good / miss) on offense checks and defensive braces. Dodge stays pass/fail.
- **Difficulty:** Skill definitions control QTE difficulty via preset + optional per-skill overrides.

---

## 2. Terminology

Extends `BattleTerminology.md`. New or redefined terms:

| Term | Meaning |
|------|---------|
| **Chalkboard** | The QTE zone where all offensive checks render. Ring checks show circles. Swipe checks show directional fill lines. Circle checks show circular trace paths. One zone, multiple input types. |
| **Check** | A single QTE input within a combo. Replaces "ring" as the generic term. Each beat maps 1:1 to a check. |
| **Check Type** | One of three input modes: `ring`, `swipe`, `circle`. Defined per-beat in the skill config. |
| **QTE Phase** | The front-loaded input phase where the player performs all checks before choreography begins. |
| **Playback Phase** | The cinematic phase after QTE completes. Beat choreography plays out driven by the recorded results. No player input (offense). |
| **Strike Anchor** | The exact moment the enemy's strike lunge snaps forward. Frame-zero for defensive timing windows. |
| **Defense Window** | The time range around the strike anchor where player input is checked. |
| **Input Cooldown** | After a defensive input registers (or the window closes), input is locked until the next beat's defense window opens. Prevents mashing. |
| **Difficulty Preset** | A named entry in the `QTE_DIFFICULTY` table that defines hit zone, perfect zone, and damage multipliers. |

---

## 3. The Chalkboard — Offense QTE System

### Overview

The Chalkboard is the QTE zone where all offensive input happens. It renders in the same screen area as the current QTE circle. All checks play in sequence — one completes, next begins. The full combo's checks are front-loaded: player performs them all, results are recorded, then choreography plays back driven by those results.

### Three Check Types

All three types share the same visual language: an indicator progresses toward a sweet spot. The sweet spot **glows** as the indicator enters the good zone, then **flashes** at the perfect zone. Same three-tier scoring (perfect / good / miss). Same speed philosophy — everything is quick (sub-second windows), never labored.

**Art direction:** Swipe and circle checks use a **particle-driven** visual — a glowing particle head traveling a path with a fading trail — rather than a fill bar. This keeps the visuals organic and alive. Ring checks launch with the existing shrinking circle but may be upgraded to an inward-spiraling particle in a future art pass for full visual unity across all three types (deferred — see Open Questions #11).

---

### 3a. Ring Check (Tap Timing)

**What the player sees:** A shrinking circle approaches a target circle. The target has a visible **good zone band** that glows as the ring enters it, and a tighter **perfect zone band** that flashes at the sweet spot.

**What the player does:** Tap at the right moment. The tap itself (touchstart / click) is the scored input.

**Visual elements:**
- Target circle (static, always visible)
- Good zone band — colored ring segment outside target radius. Glows/pulses as shrinking ring approaches.
- Perfect zone band — brighter inner portion of good zone. Flashes at sweet spot.
- Shrinking ring — changes color as it enters zones (default → good color → perfect color).
- Result flash — immediate feedback text ("PERFECT!" / "GOOD" / "MISS") with color coding.

**Used for:** Basic strikes, quick jabs, standard beats. The "bread and butter" input.

---

### 3b. Swipe Check (Directional Release Timing)

**What the player sees:** A directional line appears (start point → end point, indicating swipe direction). The line has a **fill indicator** that travels from start to end over the check's window. The end point has the same good zone glow → perfect zone flash as the ring check.

**What the player does:** Swipe in the indicated direction. Can start the swipe **anytime** during the window — the gesture is preparation. The **release** (touchend / mouseup) is the scored input. Release timing relative to the fill reaching the sweet spot determines the tier.

**Direction matching:** Lenient. The swipe direction is checked against the configured direction with **±45° tolerance**. A swipe that's "generally correct" passes. Wrong direction = miss regardless of timing.

**Supported directions:** 4 cardinal (up, down, left, right). V1 skill designs use primarily left and right to avoid fatigue, but the system supports all four.

**Desktop input:** Click-drag + release. Same mechanics — mousedown starts, mousemove tracks direction, mouseup is the scored moment.

**Visual elements:**
- Directional path — subtle guide line or ghosted arrow from start to end point.
- **Particle head** — a glowing particle (or small cluster) that travels from start to end over the check's window. This IS the timing indicator. Leaves a fading trail behind it.
- As particle enters good zone near end point: glow intensifies, trail brightens.
- At perfect zone: **flash** at end point (same flash language as ring check).
- Direction cue — arrow icon or trail direction makes swipe direction obvious.
- Result flash on release.

**Used for:** Slashes, lunges, directional attacks. Creates rhythmic variety when mixed with ring checks.

---

### 3c. Circle Check (Trace Release Timing)

**What the player sees:** A circular path appears. A **fill indicator** travels around the path. The completion point (where the path closes) has the same good zone glow → perfect zone flash.

**What the player does:** Makes a roughly circular gesture (any direction — clockwise or counter, player's choice). Can start **anytime** during the window. The **release** (touchend / mouseup) at the right moment is the scored input.

**Shape matching:** Very lenient. The system checks that the gesture input had **sufficient angular coverage** (i.e., the touch points spanned enough of a circular arc — roughly 270°+ of travel). It does NOT require the player to follow the on-screen path precisely. Any roughly circular finger motion is accepted. The on-screen animation is the timing reference, not a tracing guide.

**Desktop input:** Click-drag in a circular motion + release.

**Visual elements:**
- Circular path outline (more theatrical/ornate than the simple ring check) — subtle guide, not a thick track.
- **Particle head** — a glowing particle that orbits the circular path over the check's window. Leaves a fading trail that builds up into a visible arc as it travels. More dramatic than the swipe particle — bigger glow, richer trail.
- As particle approaches completion point: glow intensifies, trail brightens, buildup energy.
- At perfect zone: **flash** at completion point.
- Result flash on release.

**Used for:** Magic, AoE, charged attacks, finishers. The flamboyant input. Naturally becomes the climax of a combo.

---

### 3d. Combo Rhythm — Mixing Check Types

Each skill's beat array specifies the check type per beat. The mix creates a unique rhythm per skill that becomes muscle memory.

**Example patterns:**

```
basic_attack:       ring, ring, ring
scavenger_combo:    ring, ring, swipe-R, ring, swipe-L
flurry_combo:       swipe-L, swipe-L, swipe-R, ring, swipe-L, swipe-R, ring
magic_blast:        ring, circle
fire_aoe:           ring, ring, circle
power_slam:         ring, swipe-R, swipe-L, circle
```

The Chalkboard transitions between check types seamlessly. One check completes → brief transition → next check appears. The overall tempo is driven by the skill's `delays` array (same as current ring delays).

---

### 3e. Front-Loaded Flow

```
Player picks ATK + skill
  → CAM_SWING_QTE phase begins
  → Chalkboard mounts with full check sequence
  → Player performs all checks (ring taps, swipe releases, circle releases)
  → All checks complete → results array returned
  → CAM_SWING_PLAYBACK phase begins
  → Per-beat choreography plays sequentially, driven by results
  → Exchange resolves
```

### QTE Results Array

The Chalkboard returns an array, one entry per check:

```
[
  { tier: "perfect", checkType: "ring",   inputType: "tap" },
  { tier: "good",    checkType: "ring",   inputType: "tap" },
  { tier: "perfect", checkType: "swipe",  inputType: "swipe", direction: "right" },
  { tier: "miss",    checkType: "ring",   inputType: null },
  { tier: "good",    checkType: "circle", inputType: "circle" },
]
```

`tier` is one of: `"perfect"`, `"good"`, `"miss"`.

### Playback Phase

After QTE completes, choreography plays beat-by-beat using the results array:

| Result Tier | Choreography | Damage | Shake | SFX |
|-------------|-------------|--------|-------|-----|
| Perfect | Full wind-up → strike → heavy knockback | `beat.damage × damageMap.perfect` | One level heavier than beat default | `"impact"` or beat SFX |
| Good | Standard wind-up → strike → normal knockback | `beat.damage × damageMap.good` | Beat default | Beat SFX |
| Miss | Short lunge → whiff | `beat.damage × damageMap.miss` | None | `"whiff"` |

Damage numbers color-coded: gold (perfect), white (good), gray (miss).

The playback is non-interactive for the attacking player. V1 defenders do not block/dodge player attacks (existing rule preserved).

---

## 4. Defense — Animation-Read System

### Overview

No QTE UI. No rings. No chalkboard. The player watches the enemy's choreography and reacts. The existing telegraph animations (glow ramp, lean back, combat-sync shake) and the strike lunge become the actual gameplay — the player must read them and time their input.

### Flow

```
Enemy's action cam turn → ATK selected (auto for enemies)
  → Enemy attack resolves as fixed "good" tier (no visible QTE)
  → CAM_SWING_PLAYBACK begins — enemy choreography plays beat-by-beat
  → Per beat:
      → Telegraph animation plays (glow ramp, lean back)
      → Strike lunge snaps forward (= STRIKE ANCHOR)
      → Defense window is centered on strike anchor
      → Player taps (brace) or swipes (dodge) — one input accepted
      → Result determined, choreography reacts
      → Input cooldown until next beat
  → All beats complete → damage summary → exchange continues
```

### Strike Anchor

The strike anchor is the moment the enemy's `__choreo` div receives the `--strike` transform class. BattleView already applies this during `strikeMs` in the choreography timeline. This moment is the center of the defense window.

Implementation: when the strike class is applied, record `performance.now()`. When player input arrives, compare against this timestamp.

### Defense Windows

Centered on the strike anchor. Values in `battleConstants.js`, tunable.

**Brace (tap):**

| Tier | Window | Damage Multiplier |
|------|--------|-------------------|
| Perfect | ±60ms from strike anchor | ×0.0 (full negate) |
| Good | ±175ms from strike anchor | ×0.25 (current brace multiplier) |
| Fail | Outside good window, or no input | ×1.0 (full damage) |

**Dodge (swipe):**

| Tier | Window | Damage Multiplier |
|------|--------|-------------------|
| Pass | ±250ms from strike anchor | ×0.0 (full negate) |
| Fail | Outside window, or no input | ×1.0 (full damage) |

### Input Rules

- **One input per beat.** After tap/swipe registers OR the defense window closes (whichever first), input is locked.
- **Input cooldown** lasts until the next beat's telegraph begins. No mashing between beats.
- **Swipe detection** reuses existing logic: `SWIPE_MIN_PX` (30px) threshold, `TAP_MAX_PX` (15px) for tap classification.
- **Touch target:** The full scene zone during defense, not a small QTE element. Player watches the sprites and taps/swipes anywhere on the battle scene.
- **Unblockable beats:** If `beat.unblockable === true`, brace always results in Fail (full damage). Only dodge works. Visual tell (red glow on the beat's telegraph) warns the player.

### Feedback Per Tier

| Result | Visual | Audio | Choreography |
|--------|--------|-------|-------------|
| Brace Perfect | Blue-white flash on defender + "PERFECT" text | Crisp parry/clang sound | Brace anim (squat + blue glow), attacker recoils slightly |
| Brace Good | Blue flash on defender + "BLOCK" text | Softer block sound | Brace anim (standard) |
| Dodge Pass | Defender slides laterally + afterimage fade + "DODGE" text | Whoosh sound | Dodge anim (existing CSS class) |
| Fail (hit) | Red flash + knockback + damage number | Hit/impact sound | Hit anim (existing) + screen shake per beat config |

### Enemy QTE Resolution

Enemies do not get a visible QTE. V1: enemy attacks always resolve as "good" tier — base damage, no scaling. Player defense is what creates variance. Future: enemy stats could weight their tier for variance.

---

## 5. Skill Config — Beat Schema Update

### New Per-Beat Fields

Each beat in a skill's `beats` array gains:

| Field | Type | Required | Default | Meaning |
|-------|------|----------|---------|---------|
| `check` | `"ring"` / `"swipe"` / `"circle"` | Yes (new) | `"ring"` | Which QTE check type for this beat |
| `swipeDir` | `"up"` / `"down"` / `"left"` / `"right"` | If check is `"swipe"` | `"right"` | Direction for swipe checks. Ignored for ring/circle. |
| `windowMs` | number | No | Inherited from skill-level `shrinkDurationMs` / `speeds` | Override the check window duration for this specific beat |

Existing beat fields (`damage`, `atkAnim`, `tgtReact`, `shake`, `sfx`, `blockable`, `dodgeable`, `unblockable`, `finisher`, `comboMultiplier`) are unchanged.

### Example Skill Definition

```
scavenger_combo: {
    id:               "scavenger_combo",
    name:             "Scavenger Combo",
    type:             "circle_timing",
    difficulty:       "normal",
    rings:            5,
    speeds:           [1.0, 1.0, 1.2, 0.6, 1.0],
    delays:           [0, 200, 200, 400, 200],
    shrinkDurationMs: 800,
    zoneBonus:        0.15,
    targetRadius:     36,
    ringStartRadius:  130,
    label:            "SCAVENGE!",
    beats: [
        { check: "ring",  damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
            blockable: true,  dodgeable: true },
        { check: "ring",  damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
            blockable: true,  dodgeable: true },
        { check: "swipe", swipeDir: "right", damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
            blockable: true,  dodgeable: true },
        { check: "ring",  damage: 6,  atkAnim: "wind_up", tgtReact: "flinch", shake: null,     sfx: "hit",
            blockable: true,  dodgeable: true },
        { check: "swipe", swipeDir: "left", damage: 10, atkAnim: "strike", tgtReact: "hit", shake: "ko", sfx: "impact",
            blockable: false, dodgeable: true, unblockable: true, finisher: true, comboMultiplier: 0.75 },
    ],
},
```

### Backward Compatibility

Beats without a `check` field default to `"ring"`. Existing skill definitions work without modification until intentionally updated.

---

## 6. Difficulty Presets

### QTE_DIFFICULTY Table

Lives in `battleConstants.js`. Single source of truth for offense QTE zone sizing and scoring.

```
QTE_DIFFICULTY = {
    easy:   { hitZone: 0.20, perfectZone: 0.06, damageMap: { perfect: 1.3, good: 1.0, miss: 0.5 } },
    normal: { hitZone: 0.15, perfectZone: 0.04, damageMap: { perfect: 1.5, good: 1.0, miss: 0.3 } },
    hard:   { hitZone: 0.10, perfectZone: 0.03, damageMap: { perfect: 1.8, good: 1.0, miss: 0.2 } },
    boss:   { hitZone: 0.08, perfectZone: 0.02, damageMap: { perfect: 2.0, good: 1.0, miss: 0.1 } },
};
```

- `hitZone` — fraction of the indicator's travel range that counts as "good" or better. Applies to all three check types: ring (radius range), swipe (fill range), circle (fill range).
- `perfectZone` — fraction of the hitZone that counts as "perfect". Always a subset of hitZone.
- `damageMap` — multipliers applied to `beat.damage` based on result tier.

### Skill-Level Overrides

| Field | Type | Default | Meaning |
|-------|------|---------|---------|
| `difficulty` | string | `"normal"` | Key into `QTE_DIFFICULTY` table |
| `hitZone` | number or null | null | Override preset hitZone for this skill |
| `perfectZone` | number or null | null | Override preset perfectZone |
| `damageMap` | object or null | null | Override preset damageMap (partial merge — specified keys win, rest from preset) |

Resolution order: skill field > preset value > hardcoded fallback (`normal` preset).

---

## 7. Defense Timing Constants

New section in `battleConstants.js`:

```
DEFENSE_TIMING = {
    bracePerfectMs:   60,       // ±ms from strike anchor for perfect brace
    braceGoodMs:      175,      // ±ms from strike anchor for good brace
    dodgePassMs:      250,      // ±ms from strike anchor for dodge
    inputCooldownMs:  150,      // lockout after input registers before next beat
    bracePerfectMult: 0.0,      // damage multiplier — perfect negates all
    braceGoodMult:    0.25,     // damage multiplier — existing brace value
    dodgePassMult:    0.0,      // damage multiplier — dodge negates all
    failMult:         1.0,      // full damage on miss
};
```

All values tunable. Playtest-gated.

---

## 8. Phase Flow Changes

### Current Phase Flow (Offense)

```
CAM_WAIT_ACTION → CAM_TELEGRAPH → CAM_SWING (QTE per ring interleaved with choreography) → CAM_RESOLVE
```

### New Phase Flow (Offense)

```
CAM_WAIT_ACTION → CAM_SWING_QTE (front-loaded Chalkboard, all checks) → CAM_SWING_PLAYBACK (choreography driven by results) → CAM_RESOLVE
```

- `CAM_SWING_QTE` — Chalkboard is mounted. Player performs all checks in sequence. No choreography yet.
- `CAM_SWING_PLAYBACK` — Chalkboard unmounts. Results array drives beat-by-beat choreography.

### New Phase Flow (Defense — Enemy Attacking)

```
CAM_WAIT_ACTION → CAM_SWING_PLAYBACK (beat-by-beat choreography with defense windows) → CAM_RESOLVE
```

No `CAM_SWING_QTE` phase for enemy turns. The playback phase itself contains the interactive defense windows.

### New BATTLE_PHASES Values

Add to `battleConstants.js`:

```
CAM_SWING_QTE:      "cam_swing_qte",
CAM_SWING_PLAYBACK: "cam_swing_playback",
```

`CAM_SWING` (old) can be kept temporarily for backward compat or removed outright.

### Telegraph Phase

`CAM_TELEGRAPH` folds into the playback phase. On offense, the choreography playback handles wind-up per beat. On defense, each beat's telegraph animation IS the gameplay cue. No need for a separate global telegraph phase.

### Cam Resolve Exit

Under the engagement system (`EngagementSystemSpec.md` §5), `CAM_RESOLVE` exits to one of:

- **Counter offered:** Responder has enough AP and chooses to counter → responder's `CAM_SWING_QTE` → `CAM_SWING_PLAYBACK` → `CAM_RESOLVE` → cam out.
- **No counter:** Responder can't afford it or declines → cam out immediately.

There is no swap-sides loop. One trade maximum (initiator swing + optional counter).

---

## 9. Ownership & Boundaries

| Component | Owns | Does NOT Own |
|-----------|------|-------------|
| **Chalkboard** (new component or refactor of circleTimingQTE) | All three check type renderers, input detection (tap/swipe/circle), zone visuals, three-tier scoring, results array output | Choreography, damage calc, phase management |
| **BattleView.js** | Phase flow, mounting Chalkboard or defense listener, driving playback from results | QTE internals, defense timing math, gesture recognition |
| **battleSkills.js** | Skill definitions, check types per beat, difficulty key, optional overrides | QTE rendering, choreography |
| **battleConstants.js** | `QTE_DIFFICULTY` table, `DEFENSE_TIMING` table, phase values | Skill data, phase logic |
| **Defense timing module** (new, pure JS) | Strike anchor tracking, window checks, input gating, tier resolution | Choreography, rendering, React |
| **Gesture recognition** (new, pure JS utility) | Swipe direction classification (±45° tolerance), circle gesture validation (angular coverage check) | Timing, scoring, rendering |

### Chalkboard Component

Refactor of `circleTimingQTE.js` or new component. Reads the skill's beat array and renders each check type in sequence. Same plugin contract shape: config in, results array out.

**Props (updated):**
```
{
    config: { ... existing ring config fields ... },
    beats: [ { check, swipeDir, windowMs, ... }, ... ],
    difficulty: { hitZone, perfectZone, damageMap },
    onComplete: function(resultsArray) {},
    onCheckResult: function(index, tier, checkType) {},  // optional per-check callback
    onCheckStart: function(index, checkType) {},          // optional per-check callback
}
```

### Defense Timing Module

New pure JS file. No React. No DOM. Portable.

```
init(config)                     — pass DEFENSE_TIMING constants
recordStrikeAnchor()             — call when strike class applied, records timestamp
checkInput(inputType, timestamp) — returns { tier, damageMultiplier } or null (cooldown active)
resetBeat()                      — clear state for next beat
destroy()                        — teardown
```

### Gesture Recognition Utility

New pure JS file. Stateless helper functions.

```
classifySwipeDirection(points)   — returns "up" | "down" | "left" | "right" | null
                                   points = [{ x, y }, ...] from touch/mouse events
                                   Uses atan2 on start→end vector. ±45° bins.

isDirectionMatch(actual, expected) — returns boolean
                                     Checks if classified direction matches config direction.

isCircleGesture(points)          — returns boolean
                                   Checks angular coverage of touch path (≥270° of arc).
                                   Does NOT check radius consistency or path shape.
                                   Any roughly circular motion passes.
```

---

## 10. Input Detection Details

### Ring Check Input

Same as current: `touchstart` / `click` fires `resolveInput("tap")`. Scored against ring progress at tap moment.

### Swipe Check Input

**Mobile:**
- `touchstart` — record start point, begin collecting points array.
- `touchmove` — append `{ x, y }` to points array (throttle to ~every 16ms / every frame).
- `touchend` — record end time. Run `classifySwipeDirection(points)`. Check `isDirectionMatch(classified, beat.swipeDir)`. If direction matches, score timing of release against fill progress. If direction wrong, result = miss.

**Desktop:**
- `mousedown` — same as touchstart.
- `mousemove` (while button held) — same as touchmove.
- `mouseup` — same as touchend.

### Circle Check Input

**Mobile:**
- `touchstart` — begin collecting points.
- `touchmove` — append points.
- `touchend` — record end time. Run `isCircleGesture(points)`. If circular enough, score timing of release against fill progress. If not circular, result = miss.

**Desktop:**
- Same via mouse events.

### Shared: Release Timing Scoring

For swipe and circle checks, the release moment (`touchend` / `mouseup`) is scored against the fill indicator's progress, using the same hitZone / perfectZone fractions as ring checks. The fill indicator's progress is 0→1 over the check's window. The good zone starts at `1.0 - hitZone`, perfect zone starts at `1.0 - perfectZone`. Release within perfect zone = perfect, within good zone = good, outside = miss.

---

## 11. Migration Path

### What Gets Removed

- Ring QTE mounting during enemy attack turns (defensive QTE)
- `onRingResult` / `onRingStart` callbacks during defense — replaced by defense timing module
- Interleaved QTE ↔ choreography on offense — replaced by front-loaded Chalkboard then sequential playback

### What Gets Modified

- `circleTimingQTE.js` → refactored into Chalkboard component with three check types, visible zone bands, three-tier scoring
- `QTERunner.js` → updated to mount Chalkboard instead of (or wrapping) circleTimingQTE
- `BattleView.js` — new phase flow (`CAM_SWING_QTE` / `CAM_SWING_PLAYBACK`), playback driver, defense input listener, strike anchor recording
- `battleSkills.js` — add `check` field to all beats, add `difficulty` to all skills, add `swipeDir` where needed
- `battleConstants.js` — add `QTE_DIFFICULTY` table, `DEFENSE_TIMING` table, new phase values
- `BattleView.css` — defense feedback classes (perfect brace flash, dodge afterimage, fail hit), Chalkboard swipe/circle visuals

### What Gets Added

- Chalkboard component (refactor of circleTimingQTE or new file)
- Defense timing module (new file, pure JS)
- Gesture recognition utility (new file, pure JS)
- Defense feedback visuals (CSS classes)
- Audio cues for defense tiers and offense check types (wire through `battleSFX.js`)

### What Stays Unchanged

- All existing choreography CSS (strike, hit, brace, dodge, telegraph, combat-sync)
- BattleCharacter component
- Wave transitions
- Battle state (HP, KO, buffs, result builder)
- Comic panel, info panels

### What Changes Independently (Engagement System)

The following systems are being reworked by the engagement system (`EngagementSystemSpec.md`), separate from this spec's QTE/defense work:

- ATB → initiative + turn order
- Pips → AP
- Exchange flow (RELENT/PASS, swap sides) → one-trade + counter
- In-cam items/defend → formation-only
- Action menu → new action list

---

## 12. Build Order

| Step | What | Risk | Depends On |
|------|------|------|-----------|
| 1 | `QTE_DIFFICULTY` table + `DEFENSE_TIMING` table + new phase values in battleConstants | LOW | Nothing |
| 2 | Add `difficulty` + `check` fields to all skills/beats in battleSkills | LOW | Step 1 |
| 3 | Gesture recognition utility (pure JS — swipe direction, circle detection) | LOW | Nothing |
| 4 | Chalkboard component — ring check with three-tier scoring + visible zone bands | MEDIUM | Steps 1, 2 |
| 5 | Chalkboard component — swipe check type | MEDIUM | Steps 3, 4 |
| 6 | Chalkboard component — circle check type | MEDIUM | Steps 3, 5 |
| 7 | Front-load offense: new phases in BattleView, Chalkboard → results array → playback driver | HIGH | Step 6 |
| 8 | Defense timing module (pure JS) | LOW | Step 1 |
| 9 | Wire defense into BattleView: strike anchor recording, touch input on scene zone, tier resolution | HIGH | Steps 7, 8 |
| 10 | Defense feedback: CSS classes, audio cues, damage number variants | MEDIUM | Step 9 |
| 11 | Tuning pass: timing windows, damage multipliers, zone sizes, combo rhythms | LOW | Step 10 |

---

## 13. Open Questions

| # | Question | Status | Notes |
|---|----------|--------|-------|
| 1 | Enemy QTE resolution | **Decided: Option A** | Enemy always "good" tier. Player defense creates variance. |
| 2 | Defense touch target | Leaning scene zone | Full screen could catch accidental taps on bottom UI. |
| 3 | Dodge afterimage visual | TBD | CSS opacity + transform probably sufficient. |
| 4 | Audio cue before strike (anticipation) | Nice-to-have | Rising tone during telegraph. Wire through battleSFX. |
| 5 | Summary vs per-beat damage numbers | TBD | Per-beat may feel better with the new playback-driven system. |
| 6 | Chalkboard transition timing between checks | TBD | Brief fade/slide between check types? Or instant swap? Playtest. |
| 7 | Circle check particle style | TBD | Ornate orbital glow? Spark with bright trail? Needs art direction. |
| 8 | Swipe check particle style | TBD | Sharp slash spark? Blade-edge glint? Match the directional feel. Needs art direction. |
| 9 | Can the player start a swipe/circle gesture BEFORE the check officially begins? | Leaning yes | Pre-input feels natural. Score only the release timing. |
| 10 | `CAM_TELEGRAPH` phase — keep or remove? | Remove | Fold into playback. Each beat's wind-up IS the telegraph on defense. |
| 11 | Ring check — particle art pass (future) | Deferred | Could replace shrinking geometric circle with inward-spiraling particle for visual unity across all 3 check types. Same scoring math. Pure art direction — no gameplay change. |