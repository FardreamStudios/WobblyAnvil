# Battle Choreography — Visual Spec

**Parent:** `ScavengeBattleSpecs.md`  
**Status:** 🟢 IN PROGRESS — Steps 1-7 complete (inner wrapper, bob, shake, flash, strike/knockback, damage numbers, wind-up/return). Steps 8-15 remaining.  
**Scope:** What the player *sees* during each phase of the action camera exchange. Anim states, hit reactions, screen effects, damage numbers, and timing.

---

## Design Goal

The exchange should feel like a 2D fighting game cutscene — punchy, readable, satisfying. Every phase has a clear visual beat so the player always knows what just happened and what's coming next. All choreography is CSS-driven (transforms, keyframe anims, class toggles). No new spritesheets required for V1 — the existing idle sheets + CSS tricks carry the whole thing.

---

## Combatant Anim States

Each combatant carries an `animState` entry in a keyed map: `{ combatantId: stateString }`. BattleView applies it as a CSS class on the choreography wrapper: `normal-cam-char__choreo--{state}`. Multiple combatants can animate simultaneously (e.g. attacker strikes while target recoils).

**Naming convention:**
- `normal-cam-char*` — formation view (normal camera) classes
- `action-cam-char*` — action camera classes (dimmed, attacker, target)
- `action-cam-info*` — info panels pinned to scene edges during action cam
- `action-cam-dmg*` — floating damage numbers
- `normal-cam-char__choreo` — the inner div that receives choreography transforms (lunge, knockback, flash)

**Component names:**
- `BattleCharacter` — single fighter card (renders in both modes)
- `ActionCamInfoPanel` — name/HP panels pinned to left/right scene edges during action cam
- `DamageNumber` — floating pop text, CSS-animated, self-destructs after 800ms

### Party States

| State | CSS Effect | When | Duration |
|-------|-----------|------|----------|
| `idle` | Normal position, idle spritesheet loops | Default during ATB_RUNNING | Persistent |
| `ready` | Subtle glow pulse on border (gold) | ATB full, action menu visible | Until action chosen |
| `wind_up` | Lean back (translateX away from enemy, slight scaleX squeeze) | ACTION_CAM_IN, after slide completes | ~200ms hold |
| `strike` | Lunge forward (translateX toward enemy, scaleX stretch) | RESOLVING — player attack lands | ~150ms snap |
| `return` | Ease back to center-stage position | After strike, before enemy counter | ~250ms ease |
| `brace` | ScaleY squish + border flash (blue) | Successful defense QTE (good block) | ~200ms |
| `hit` | Knockback translateX + flash white + shake | Failed defense QTE (took damage) | ~300ms |
| `ko` | Tilt + shrink + fade to 0 opacity | 0 HP | ~500ms |

### Enemy States

| State | CSS Effect | When | Duration |
|-------|-----------|------|----------|
| `idle` | Static image, gentle CSS bob (translateY oscillation) | Default during ATB_RUNNING | Persistent |
| `telegraph` | Increasing shake intensity + red glow buildup on border | ENEMY_TELEGRAPH phase | Matches `counterDelayMs` (300ms) |
| `strike` | Lunge toward party side (translateX + scaleX stretch) | Enemy counter attack lands | ~150ms snap |
| `return` | Ease back to center-stage position | After enemy strike resolves | ~250ms ease |
| `hit` | Knockback + white flash + screen shake (intensity scales with damage) | Player attack resolves, damage dealt | ~300ms |
| `flinch` | Minimal recoil, no white flash | Player attack resolves but low damage (poor QTE) | ~200ms |
| `ko` | Shrink to 0 + spin + fade out | 0 HP, removed from formation | ~600ms |

---

## Exchange Choreography — Beat by Beat

This is the complete visual timeline for one exchange. Phases map directly to the existing `BATTLE_PHASES` state machine.

### Phase: ACTION_CAM_IN (~350ms)

| Time | What Happens |
|------|-------------|
| 0ms | Active combatants begin sliding to center stage (CSS transition on transform) |
| 0ms | Inactive combatants dim to 12% opacity |
| 0ms | ATB strip fades out, action menu fades out |
| 200ms | Comic panel fades in (fairy portrait + "Let's get 'em!") |
| 350ms | Slide complete. Attacker enters `wind_up` state |

### Phase: QTE_ACTIVE (variable — depends on ring count)

| Time | What Happens |
|------|-------------|
| 0ms | QTE zone appears in bottom center |
| 0ms | Attacker holds `wind_up` pose |
| 0ms | Circle timing QTE starts — rings shrink toward target |
| ongoing | Comic panel updates per ring hit/miss ("Nice!" / "Oof...") |
| complete | QTE fires `onComplete` with hit ratio → transition to RESOLVING |

### Phase: RESOLVING — Player Attack (~500ms)

This is where the hit lands. The most important visual beat.

| Time | What Happens |
|------|-------------|
| 0ms | Attacker snaps to `strike` (lunge forward) |
| 80ms | Clash spark appears at midpoint between combatants |
| 80ms | Enemy enters `hit` (knockback + white flash) or `flinch` (low damage) |
| 80ms | Screen shake fires (intensity = damage / maxHP) |
| 80ms | Damage number pops above enemy (floats up + fades) |
| 100ms | Hit flash on enemy clears |
| 200ms | Clash spark fades |
| 250ms | Attacker eases to `return` (back to center-stage resting pos) |
| 300ms | Enemy recovers from knockback to center-stage position |
| 500ms | Phase complete → ENEMY_TELEGRAPH |

**Damage-dependent intensity:**

| QTE Result | Enemy Reaction | Screen Shake | Damage Number Color |
|-----------|---------------|-------------|-------------------|
| Perfect (100%) | Big knockback + double flash | Heavy (6px, 300ms) | Gold (#f59e0b) |
| Good (50-99%) | Standard knockback + flash | Medium (4px, 200ms) | White (#e0d8c8) |
| Poor (1-49%) | Flinch only, no flash | Light (2px, 100ms) | Gray (#8a7a64) |
| Miss (0%) | No reaction | None | Red "MISS" text |

### Phase: ENEMY_TELEGRAPH (~300ms)

| Time | What Happens |
|------|-------------|
| 0ms | Enemy enters `telegraph` — shake begins, border glows red |
| 0ms | Comic panel updates ("Watch out!") |
| 150ms | Shake intensifies |
| 300ms | Telegraph complete → DEFENSE_QTE |

### Phase: DEFENSE_QTE (variable)

| Time | What Happens |
|------|-------------|
| 0ms | QTE zone switches to defense mode (blue ring) |
| 0ms | Enemy holds end of `telegraph` pose (ready to strike) |
| ongoing | Rings shrink — player taps to block |
| complete | QTE fires `onComplete` → transition to RESOLVING (defense) |

### Phase: RESOLVING — Enemy Counter (~500ms)

| Time | What Happens |
|------|-------------|
| 0ms | Enemy snaps to `strike` (lunge toward party) |
| 80ms | Result depends on defense QTE: |
| | — **Good block:** Attacker enters `brace`, reduced damage number, small shake |
| | — **Poor block:** Attacker enters `hit`, full knockback + flash + shake |
| 80ms | Damage number pops above party member |
| 250ms | Enemy eases to `return` |
| 300ms | Party member recovers |
| 500ms | Phase complete → ACTION_CAM_OUT (or loop for bonus beats) |

### Phase: ACTION_CAM_OUT (~350ms)

| Time | What Happens |
|------|-------------|
| 0ms | Comic panel fades out |
| 0ms | QTE zone fades out |
| 50ms | Combatants begin sliding back to formation positions (transform resets) |
| 50ms | All combatants restore to full opacity |
| 200ms | ATB strip fades back in |
| 350ms | Action menu fades back in (if party member ATB is full) |
| 350ms | ATB resumes with ease-in ramp |

---

## Screen Shake

CSS keyframe animation on `.battle-scene`. Triggered by adding a class, removed after animation completes.

### Shake Config (in battleConstants.js)

```
SCREEN_SHAKE = {
    light:  { px: 2,  ms: 100, easing: "ease-out" },
    medium: { px: 4,  ms: 200, easing: "ease-out" },
    heavy:  { px: 6,  ms: 300, easing: "ease-out" },
    ko:     { px: 10, ms: 400, easing: "ease-out" },
}
```

Three CSS classes (`battle-scene--shake-light`, `--shake-medium`, `--shake-heavy`, `--shake-ko`) with stepped keyframes for pixel feel. Applied by BattleView via `shakeLevel` state, auto-removed via `onAnimationEnd`.

---

## Damage Numbers

Floating text that pops above the damaged combatant and drifts upward.

### Behavior

- Appears at the combatant's center-stage position (not formation position)
- Pops up with slight scale overshoot (1.0 → 1.3 → 1.0)
- Floats upward ~3vh over 800ms
- Fades out during last 300ms
- Color coded by severity (see table above)
- "MISS" replaces the number on 0% QTE
- "BLOCKED" shown on perfect defense QTE

### Implementation

React component: `DamageNumber`. Receives `value`, `position`, `color`. Renders absolutely positioned in the scene zone. Self-destructs after animation completes (800ms timer → parent removes from array).

State: `damageNumbers` array in BattleView, pushed during RESOLVING, cleaned up on timer.

---

## White Flash (Hit Flash)

When a combatant takes damage, they briefly flash white. Classic RPG hit indicator.

### CSS Approach

```css
.normal-cam-char__choreo--flash {
    filter: brightness(3) saturate(0);
}
```

Applied for ~80ms, then removed. The `filter` approach works on both spritesheet divs and static images without needing a separate white sprite.

---

## Enemy Bob (Idle Animation)

Static enemy images get life through a gentle CSS bob.

```css
@keyframes enemyBob {
    0%, 50%  { transform: translateY(0); }
    51%, 100% { transform: translateY(-2px); }
}

.normal-cam-char--enemy-idle .normal-cam-char__sprite {
    animation: enemyBob 2.4s steps(1) infinite;
    animation-delay: var(--bob-delay, 0s);
}
```

Stepped animation (not smooth) for pixel feel. Staggered per enemy via `--bob-delay` CSS variable. Pauses during action cam (animation: none on dimmed/attacker/target states).

---

## Lunge / Knockback Mechanics

All movement during the exchange is **relative to center-stage position**, not formation position. The combatants are already translated to center stage by the action cam. Lunge and knockback are additional CSS transforms layered on top.

### Transform Layering — Inner Wrapper

The slide-to-center uses inline `style.transform` with absolute pixel values (from `restingRectsRef`). Choreography transforms need to compose on top without fighting.

Solution: inner wrapper div (`normal-cam-char__choreo`) for choreography transforms.

```
<div class="normal-cam-char" style="transform: translate(Xpx, Ypx) scale(2.0)">  ← slide (inline)
    <div class="normal-cam-char__choreo normal-cam-char__choreo--strike">  ← choreography (CSS class)
        <BattleSprite ... />
        <div class="normal-cam-char__info"> ... </div>
    </div>
</div>
```

Slide = inline, pixel-precise. Choreography = CSS class with `--choreo-dir` variable (1 for party, -1 for enemy). No conflicts.

---

## Choreography Constants (battleConstants.js)

```
CHOREOGRAPHY = {
    // Anim state durations (ms)
    windUpMs:           200,
    strikeMs:           150,
    returnMs:           250,
    hitMs:              300,
    flinchMs:           200,
    braceMs:            200,
    telegraphMs:        300,    // should match EXCHANGE.counterDelayMs
    koMs:               600,

    // Lunge distances (vw)
    lungeVw:            3,
    knockbackVw:        4,

    // Damage numbers
    dmgPopMs:           800,    // total lifetime
    dmgFloatVh:         3,      // drift distance
    dmgScaleOvershoot:  1.3,    // pop scale peak

    // Hit flash
    flashMs:            80,

    // Screen shake presets
    shakeLight:         { px: 2,  ms: 100 },
    shakeMedium:        { px: 4,  ms: 200 },
    shakeHeavy:         { px: 6,  ms: 300 },
    shakeKO:            { px: 10, ms: 400 },
}
```

---

## Implementation Order

| Step | What | Depends On | Status |
|------|------|-----------|--------|
| 1 | Inner wrapper div (`normal-cam-char__choreo`) | Nothing | ✅ DONE |
| 2 | Enemy idle bob CSS (stepped, staggered via `--bob-delay`) | Step 1 | ✅ DONE |
| 3 | Screen shake classes + trigger (4 levels, stepped keyframes, `onAnimationEnd` cleanup) | Nothing | ✅ DONE |
| 4 | Hit flash (brightness filter on `__choreo`, 80ms auto-clear) | Step 1 | ✅ DONE |
| 5 | Strike lunge + knockback anims (`__choreo--strike`, `__choreo--hit`, directional via `--choreo-dir`) | Step 1 | ✅ DONE |
| 6 | Damage numbers (`DamageNumber` component, CSS `dmgPop` keyframe, auto-cleanup) | Nothing | ✅ DONE |
| 7 | Wind-up + return states (`__choreo--wind_up`, `__choreo--return`) | Step 1 | ✅ DONE |
| 8 | Telegraph (enemy shake + glow) | Step 1 | 🔲 NEXT |
| 9 | Brace vs hit on defense | Steps 5, 4 | 🔲 |
| 10 | KO anim | Step 1 | 🔲 |
| 11 | Timed sequencer (auto-advance through exchange) | Steps 5-9 | 🔲 |

Step 11 is the key milestone — replaces manual dev-button phase stepping with an automatic timed sequence that plays the full exchange choreography.

---

## What This Spec Does NOT Cover

- QTE plugin wiring (circle timing rings) — DES-2
- ~~SFX / audio — separate pass~~ **Partially implemented:** `battleSFX.js` provides procedural hit/block/impact/ko SFX via Web Audio API. Wired into hit combo (flash + knockback + shake + SFX + damage number fires together).
- Fairy comic panel content / LLM integration — separate system
- Damage math / HP mutation — `battleResolver.js`
- Wave transitions / loot screen — separate features
- New spritesheets or art assets — V1 uses CSS tricks on existing sprites

---

## Resolved Design Decisions

### 1. KO — Death FX + Pixel Dissolve

KO'd combatants don't just fade. They play a death FX (flash + particles), audio sting, then pixel-dissolve out using the same pixel dissolve pattern as `BattleTransition.js` but scoped to the combatant card. This sells the kill.

**Sequence:**
- 0ms: White flash (full brightness)
- 80ms: Flash clears, death particle burst (sparks/shards from center)
- 80ms: Audio sting plays
- 200ms: Pixel dissolve begins on the combatant card (pixels eat inward)
- 600ms: Card fully dissolved, removed from formation
- Screen shake (heavy) fires at 80ms alongside the particle burst

**Implementation note:** The pixel dissolve can reuse the canvas pattern from `BattleTransition.js` but rendered at card scale via a small offscreen canvas or CSS mask. Alternatively, a simpler CSS approach: `clip-path` animation that erases the card in chunks. Either way, the visual language should match the battle-entry dissolve so it feels cohesive.

### 2. QTE ↔ Combatant Visual Sync

Combatant visuals should directly reflect what's happening in the QTE in real time. When the player is doing an attack QTE, each ring hit/miss triggers an immediate visual response on the attacker — not batched at the end.

**Per-ring feedback (during QTE_ACTIVE):**
- **Ring hit:** Attacker plays a quick strike snap (fast lunge + return, ~200ms total). Enemy plays a small flinch. This gives the QTE a physical, impactful feel — each tap produces a visible hit.
- **Ring miss:** Attacker plays a whiff (lunge but no impact — no enemy reaction, no spark). Subtle visual cue that the timing was off.

**On QTE complete:** The final resolve phase (RESOLVING) plays the big hit — the accumulated result. Perfect QTE = massive final strike. Poor QTE = weak final hit. The per-ring hits are quick jabs; the resolve is the haymaker.

**For defense QTE (DEFENSE_QTE):**
- **Ring hit (successful block):** Party member flashes a brief shield/brace. Enemy's lunge gets deflected (small recoil on enemy).
- **Ring miss (failed block):** Party member takes a quick hit flash. Enemy's strike connects.

This means the QTE plugin needs to fire a callback per ring, not just on complete. The existing `onComplete` stays for the final result; add an `onRingResult(index, hit)` callback for per-ring visuals.

**V1 simplification:** If per-ring callbacks aren't ready yet, fall back to the batch approach (animate everything on `onComplete`). The architecture supports both — the choreography sequencer just needs to know whether it's getting per-ring or batch events.

### 3. Defend Action — Brace Anim + Status Badge

When the player picks Defend:
- No QTE, no action cam zoom
- Party member plays brace anim if available (scaleY squish + blue border flash)
- A small blinking badge appears near the character: "DEF ↑" or shield icon
- Badge persists until the buff expires (2 turns or next ATB cycle)
- ATB gets 25% refill as specced

This is an instant action — no exchange, no camera. Just the visual feedback at formation position.

### 4. Flee — Action Cam QTE Sequence

Flee is not instant. It's a mini action cam sequence with its own QTE.

**Flee sequence:**
1. Action cam zooms in on the party member (enemies dim but stay visible)
2. Party member turns away and begins running (slide toward screen edge)
3. Flee QTE runs — maybe a rapid-tap or rhythm QTE (not circle timing)
4. **Success:** Party member slides off screen → battle ends → results screen with "FLED" outcome, prior-wave loot kept
5. **Fail:** Party member stumbles (knockback toward center), enemies un-dim, action cam zooms out, turn is wasted

This means flee has real stakes and visual drama. It's not a free exit button — you're committing your turn and the QTE determines if you escape.

**New phase needed:** `FLEE_ATTEMPT` — sits between ACTION_SELECT and either EXIT or ACTION_CAM_OUT. Add to legal transitions:

```
ACTION_SELECT → FLEE_ATTEMPT (player picks flee)
FLEE_ATTEMPT  → EXIT (flee success) | ACTION_CAM_OUT (flee fail, turn wasted)
```

### 5. Battle Results Screen

The flee sequence implies we need a results screen for all exit conditions, not just victory loot. This was already specced as `LootScreen.js` (future) but flee makes it more urgent.

**Results screen shows:**
- Outcome badge: "VICTORY" / "FLED" / "KO"
- Loot collected (victory/fled = show loot, KO = "All loot lost")
- Battle stats summary (damage dealt, QTEs hit, waves cleared)
- Continue button → exits battle, returns BattleResult to host

This is a full overlay, not part of the action cam. Separate component, separate phase (`LOOT` or `RESULTS`).

---

## Updated Phase Transitions

With flee as a QTE sequence:

```
INTRO           → ATB_RUNNING
ATB_RUNNING     → ACTION_SELECT | ENEMY_TELEGRAPH
ACTION_SELECT   → ACTION_CAM_IN | RESOLVING (instant actions) | ATB_RUNNING (cancel) | FLEE_ATTEMPT
FLEE_ATTEMPT    → EXIT (success) | ACTION_CAM_OUT (fail, turn wasted)
ACTION_CAM_IN   → QTE_ACTIVE
QTE_ACTIVE      → RESOLVING
RESOLVING       → ENEMY_TELEGRAPH (exchange counter) | ACTION_CAM_OUT (exchange complete) | WAVE_TRANSITION | RESULTS
ENEMY_TELEGRAPH → DEFENSE_QTE
DEFENSE_QTE     → RESOLVING
ACTION_CAM_OUT  → ATB_RUNNING
WAVE_TRANSITION → ATB_RUNNING | RESULTS (flee between waves)
RESULTS         → EXIT
any             → EXIT (KO)
```

---

## Updated Implementation Order

| Step | What | Depends On | Status |
|------|------|-----------|--------|
| 1 | Inner wrapper div (`normal-cam-char__choreo`) | Nothing | ✅ DONE |
| 2 | Enemy idle bob CSS (stepped, staggered via `--bob-delay`) | Step 1 | ✅ DONE |
| 3 | Screen shake (4 levels, stepped keyframes, `onAnimationEnd`) | Nothing | ✅ DONE |
| 4 | Hit flash (brightness filter, 80ms) | Step 1 | ✅ DONE |
| 5 | Strike lunge + knockback (`--choreo-dir` directional) | Step 1 | ✅ DONE |
| 6 | Damage numbers (`DamageNumber`, CSS `dmgPop`, auto-cleanup) | Nothing | ✅ DONE |
| 7 | Wind-up + return states | Step 1 | ✅ DONE |
| 8 | Telegraph (enemy shake + glow) | Step 1 | 🔲 NEXT |
| 9 | Brace vs hit on defense | Steps 5, 4 | 🔲 |
| 10 | KO anim (flash + pixel dissolve + audio) | Steps 4, 3 | 🔲 |
| 11 | Timed sequencer (auto-advance exchange) | Steps 5-9 | 🔲 KEY MILESTONE |
| 12 | Per-ring QTE visual sync | Step 5, QTE plugin | 🔲 |
| 13 | Defend action (brace + badge, no cam) | Step 1 | 🔲 |
| 14 | Flee QTE sequence | Step 11, new QTE type | 🔲 |
| 15 | Results screen overlay | Nothing | 🔲 |

**Additional completed work not in original steps:**
- `battleSFX.js` — procedural hit/block/impact/ko SFX via Web Audio API
- `fairyCombatIdle` + `fairyCombatKnockdown` sprite configs wired
- Action cam pixel frame vignette overlay
- `ActionCamInfoPanel` — split into two side-pinned panels in scene zone (not bottom zone)
- Dev sequence buttons: "Atk→Tgt" / "Tgt→Atk" play full exchange combo
- `animState` upgraded to keyed map for simultaneous multi-combatant animations
- Class rename pass: `normal-cam-*` (formation) / `action-cam-*` (cinematic)