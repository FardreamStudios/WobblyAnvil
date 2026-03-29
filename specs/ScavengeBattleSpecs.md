# Scavenge Battle System — Feature Spec

**Codename:** Dumpster Diving RPG  
**Status:** 🟡 IN PROGRESS — Four-zone layout + action camera prototype built. ATB tick, exchange sequencer, dev controls live. Layout tuning + real QTE wiring next.  
**Dependencies:** DES-2 QTE System (plugin contract)  
**Tone:** Opt-in, comedic, absurd. You are a blacksmith beating up sentient garbage for profit.

---

## Overview

The Scavenge Battle System is a **standalone, portable game mode**. It takes a config object in, runs an ATB combat encounter, and returns a result object with deltas. It never reads host game state directly. It never writes to host game state directly. It is a black box.

The host game (Wobbly Anvil) maps its smith stats, inventory, and economy into the battle config format before entry, and applies the battle's output deltas to its own state after exit.

Could ship as its own game with a different host wrapper.

---

## Portability Contract

### Input: Battle Config

The host provides everything the battle needs to run. The battle system imports nothing from the host.

```
BattleConfig = {
    // --- Party ---
    party: [
        {
            id: "player",
            name: "Smith",
            sprite: "...",
            maxHP: 80,
            currentHP: 80,
            atbSpeed: 1.0,
            attackPower: 12,
            defensePower: 8,
            qteZoneBonus: 0.15,
            actions: ["attack", "defend", "item", "flee"],
            items: [
                { id: "moldy_sandwich", name: "Moldy Sandwich", icon: "...", effect: { type: "heal", value: 20 }, qty: 2 },
                { id: "duct_tape",     name: "Duct Tape",      icon: "...", effect: { type: "buff", stat: "defensePower", value: 5, turns: 2 }, qty: 1 },
            ],
        },
        // Future: fairy as second party member
        // {
        //     id: "fairy",
        //     name: "Zinnia",
        //     aiControlled: true,
        //     onActionNeeded: async function(battleState) { ... },
        //     ...same stat fields...
        // },
    ],

    // --- Encounter ---
    zone: {
        id: "dumpster_row",
        name: "Dumpster Row",
        background: "...",
        music: "...",
    },
    waves: [
        {
            enemies: [
                {
                    id: "angry_raccoon",
                    name: "Angry Raccoon",
                    sprite: "...",
                    maxHP: 40,
                    atbSpeed: 0.8,
                    attackPower: 8,
                    defensePower: 3,
                    attackPattern: "erratic",
                    deathAnim: "poof",
                    loot: [
                        { id: "scrap_iron", qty: 2, chance: 0.8 },
                        { id: "gold", qty: 15, chance: 1.0 },
                    ],
                    dialogue: {
                        intro: "A raccoon hisses at you from behind a dumpster.",
                        attack: "*scratches wildly*",
                        defeat: "The raccoon retreats, leaving behind some shiny scraps.",
                    },
                },
            ],
        },
        {
            enemies: [
                { id: "feral_trash_bag", name: "Feral Trash Bag", /* ... */ },
                { id: "rusty_can",       name: "Rusty Can",       /* ... */ },
            ],
        },
        {
            boss: true,
            enemies: [
                { id: "dumpster_king", name: "The Dumpster King", /* ... */ },
            ],
        },
    ],

    // --- Settings ---
    handedness: "right",

    // --- Observer (optional) ---
    onBattleEvent: function(event) { },
}
```

### Output: Battle Result

The battle returns deltas only. The host decides what to do with them.

```
BattleResult = {
    outcome: "victory" | "fled" | "ko",

    loot: [
        { id: "scrap_iron", qty: 4 },
        { id: "gold", qty: 35 },
        { id: "raccoon_pelt", qty: 1 },
    ],

    partyDeltas: [
        {
            id: "player",
            hpLost: 25,
            itemsUsed: [
                { id: "moldy_sandwich", qty: 1 },
            ],
        },
    ],

    stats: {
        wavesCompleted: 3,
        totalDamageDealt: 120,
        totalDamageTaken: 25,
        perfectQTEs: 7,
        totalQTEs: 12,
        enemiesDefeated: 4,
        bossDefeated: true,
        fleeWave: null,
    },
}
```

### What the Host Does With This

1. **Before battle:** Read smith stats, stamina, inventory → compute `BattleConfig` values (maxHP from stamina, atbSpeed from precision, etc.)
2. **After battle:** Read `BattleResult` → apply loot to inventory via bus, subtract used items, apply stamina/time costs, handle KO state
3. **Mapping is one-way:** Battle never calls back into the host during combat

### What the Battle System Does NOT Do

- Import `constants.js`, `eventTags.js`, or `GameplayEventBus`
- Read or write any React state outside its own scope
- Know about smith ranks, forge quality, customer reputation, or any host domain concept
- Emit host bus tags (the host wrapper emits tags based on the result after battle exits)

### Internal Communication

React state + callbacks within the battle's own component tree. No bus, no singletons, no side channels. The battle is a self-contained React subtree.

If a battle-internal bus is ever needed for complex subsystem communication, it is a **separate instance** created on battle start and destroyed on battle end.

### Observer Hooks (For Fairy / External Listeners)

`config.onBattleEvent` fires on meaningful state changes. Fire-and-forget — the battle never waits for or reads a response.

Observer events:

```
{ type: "wave_start",      wave: 1, enemies: [...] }
{ type: "wave_complete",   wave: 1, loot: [...] }
{ type: "turn_start",      memberId: "player" }
{ type: "action_chosen",   memberId: "player", action: "attack", targetId: "angry_raccoon" }
{ type: "action_cam_in",   attackerId: "player", targetId: "angry_raccoon" }
{ type: "qte_result",      memberId: "player", hits: 3, total: 4 }
{ type: "damage_dealt",    memberId: "player", targetId: "angry_raccoon", amount: 15 }
{ type: "enemy_counter",   enemyId: "angry_raccoon", targetId: "player" }
{ type: "defense_qte",     memberId: "player", hits: 2, total: 3 }
{ type: "damage_taken",    memberId: "player", amount: 8 }
{ type: "exchange_extend", reason: "perfect_qte", beat: 2 }
{ type: "action_cam_out",  attackerId: "player", targetId: "angry_raccoon" }
{ type: "enemy_defeated",  enemyId: "angry_raccoon" }
{ type: "item_used",       memberId: "player", itemId: "moldy_sandwich" }
{ type: "member_ko",       memberId: "player" }
{ type: "flee_attempt",    success: true }
{ type: "battle_end",      outcome: "victory" }
```

The host wires this to fairy bus, analytics, replay — whatever it wants. Zero coupling.

---

## Encounter Structure — Multi-Wave Runs

### Wave Flow

```
BATTLE_INTRO
  → WAVE_1 (ATB combat loop)
  → WAVE_TRANSITION (brief pause, HP carries forward)
  → WAVE_2 (ATB combat loop, harder)
  → WAVE_TRANSITION
  → BOSS_WAVE (if zone has one)
  → LOOT_SCREEN (all accumulated loot)
BATTLE_EXIT (returns BattleResult)
```

### State Persistence Across Waves

| State | Persists? | Notes |
|-------|-----------|-------|
| Party HP | Yes | No free healing between waves |
| Items | Yes | Used items gone for the run |
| Buffs/debuffs | No | Clear on wave transition |
| ATB gauge | No | Resets to 0 each wave |
| Loot pool | Yes | Accumulates across all waves |

### Exit Conditions

| Condition | Loot Kept | Additional Cost |
|-----------|-----------|----------------|
| All waves cleared | All loot | None |
| Flee between waves | Completed wave loot | None |
| Flee mid-wave | Prior wave loot only | None |
| KO | None — all loot lost | Host decides penalty |

### Zone Difficulty — Dark Souls Model

Fixed per zone. Not scaled to player. Harder zones = better loot + higher risk.

---

## ATB System

### Core Loop

1. Battle starts. All ATB gauges begin at 0.
2. Gauges fill in real-time (`requestAnimationFrame` delta-time).
3. Party member gauge fills → action menu appears. Enemy ATB pauses while menu is open (FF4 "wait" mode).
4. Player picks action → QTE runs (if action has one) → result applied.
5. Gauge resets to 0, resumes filling.
6. Enemy gauge fills → telegraph animation → defensive QTE for player → damage applied.
7. Loop until enemies dead, player flees, or party KO.

### ATB Details

- Gauge range: 0 → 100
- Delta-time: `gauge += speed × dt × 100`
- Multiple party members can queue turns (fill order)
- Enemy gauges are independent per enemy
- ATB pauses during: action menu, **action camera sequences**, QTE active, wave transitions, loot screen

### Stat Mapping (Host Computes, Battle Consumes)

| Host Stat | Battle Field | Effect |
|-----------|-------------|--------|
| Precision | `atbSpeed` | ATB fill rate |
| Brawn | `attackPower` | Damage output |
| Technique | `qteZoneBonus` | Widens QTE hit windows |
| Technique | `defensePower` | Damage reduction |
| Stamina | `maxHP` | Survivability |

### Damage Formula

```
baseDamage  = attacker.attackPower × (0.8 + 0.4 × qteSuccessRatio)
defense     = target.defensePower × (0.5 + 0.5 × defenseQTESuccessRatio)
finalDamage = max(1, baseDamage - defense)
```

- `qteSuccessRatio` = hits / totalRings (0.0 to 1.0)
- Miss everything = 80% base (you always do something)
- Nail all defensive rings = half damage taken

---

## Circle Timing QTE — New Plugin

### Core Mechanic (Clair Obscur Style)

Each action triggers a **sequence of timing rings**, not just one.

1. Fixed target circle in the center of the QTE zone.
2. Larger ring **shrinks** toward the target.
3. Player taps when the ring aligns.
4. **Pass/fail per ring** — hit the window or miss.
5. Next ring starts after a variable delay (or immediately).
6. Total hits / total rings = success ratio → fed into damage formula.

### Ring Sequences

| Action Type | Rings | Timing | Feel |
|-------------|-------|--------|------|
| Basic attack | 3 | Steady rhythm | Reliable, learnable |
| Heavy attack (future) | 5 | Starts slow, last 2 fast | Escalating pressure |
| Enemy basic (defense) | 2–3 | Variable delays | Reactive |
| Enemy special (defense) | 4+ | Fake-outs, speed changes | Chaotic |
| Boss attack (defense) | 5+ | Mixed speeds, long pauses, sudden bursts | Punishing |

### Timing Variation — Core Difficulty Lever

Attack patterns define ring sequences:

```
ATTACK_PATTERNS = {
    basic:   { rings: 3, speeds: [1.0, 1.0, 1.0],            delays: [0, 400, 400]       },
    erratic: { rings: 3, speeds: [0.8, 1.4, 1.0],            delays: [0, 200, 800]       },
    punish:  { rings: 4, speeds: [1.0, 1.0, 0.6, 1.8],       delays: [0, 400, 1200, 200] },
    boss_1:  { rings: 5, speeds: [0.8, 1.0, 1.2, 0.5, 2.0],  delays: [0, 300, 300, 1500, 100] },
}
```

- Long delay → short delay = fake-out (enemy winds up slowly, then snaps)
- Enemy shakes/flashes during delays — visual tells match timing

### QTE Zone Sizing

```
hitWindowPx = baseWindow × (1 + qteZoneBonus)
```

Higher technique → more forgiving windows.

### Plugin Contract (DES-2 Compatible)

```
Props: { config, onComplete }

config = {
    type: "circle_timing",
    rings: 3,
    speeds: [1.0, 1.0, 1.0],
    delays: [0, 400, 400],
    zoneBonus: 0.15,
    targetRadius: 40,
    ringStartRadius: 120,
    label: "ATTACK!",
}

onComplete({ hits: 2, total: 3, details: [true, false, true], successRatio: 0.667 })
```

Same plugin used for offensive and defensive QTEs — battle interprets the result differently.

---

## Action Menu

### V1 Actions

```
DEFAULT_ACTIONS = [
    { id: "attack",  label: "Attack",  hasQTE: true,  qteType: "offensive" },
    { id: "defend",  label: "Defend",  hasQTE: false, instant: true },
    { id: "item",    label: "Item",    hasQTE: false, opensSubmenu: true },
    { id: "flee",    label: "Flee",    hasQTE: false, instant: true },
]
```

| Action | Resolution |
|--------|-----------|
| **Attack** | Offensive QTE → damage from success ratio |
| **Defend** | Instant. Defense buff + 25% ATB refill |
| **Item** | Submenu → pick item → apply effect |
| **Flee** | Roll flee chance (easier on early waves). Fail = lose turn |

### Expandability

Action list is an array on each party member. Host injects additional entries for special moves, fairy actions, weapon-specific actions. Zero menu system changes.

---

## Party System

### V1: Solo (1 Member)

Config has `party: [{ ... }]` with one entry.

### Future: Multi-Member

Built for N members from day one:

- Each member has own ATB, HP, actions, items
- When any member's ATB fills, action menu shows for that member
- AI-controlled members use `onActionNeeded` callback instead of menu:

```
{
    id: "fairy",
    aiControlled: true,
    onActionNeeded: async function(battleState) {
        // Host routes to LLM or scripted logic
        return { action: "fairy_zap", targetId: "angry_raccoon" };
    },
}
```

Battle doesn't know if the action came from a menu or an LLM.

---

## Enemy System

### Enemy Behavior (V1)

No decision-making. ATB fills → execute `attackPattern` against random party member. Timing variation in the attack pattern IS the difficulty — not AI.

### Enemy Attack Flow

1. ATB fills → telegraph animation (shake, glow, wind-up)
2. Telegraph duration = first delay in attack pattern
3. Defensive QTE runs
4. Result determines damage mitigation
5. Damage applied

### Visual Tells

| Enemy Behavior | Meaning |
|---------------|---------|
| Slow shake | Slow ring incoming |
| Fast vibrate | Fast ring incoming |
| Holds still | Delay before next ring (fake-out) |
| Flash/glow | Ring about to start |

---

## HP and KO

### HP (Host Computes maxHP, Battle Tracks Changes)

Recommended host formula: `maxHP = BASE_HP + (stamina × HP_PER_STAM) + (brawn × HP_PER_BRAWN)`

Creates tension: spend stamina forging (fewer HP) or save it for a stronger run.

### KO

- 0 HP = KO'd. ATB stops. Can't act.
- All party members KO → battle ends, `outcome: "ko"`.
- V1 solo = instant game over on KO.
- Future: multi-member, KO one and others keep fighting. Items could revive.

---

## Items

### Item Format (Passed in Config)

```
{ id: "moldy_sandwich", name: "Moldy Sandwich", icon: "...", description: "Heals 20 HP.", effect: { type: "heal", value: 20 }, qty: 2 }
```

### Effect Types (V1)

| Type | Fields | What It Does |
|------|--------|-------------|
| `heal` | `value` | Restore HP |
| `buff` | `stat`, `value`, `turns` | Temporarily boost a combat stat |
| `debuff_enemy` | `stat`, `value`, `turns` | Temporarily reduce enemy stat |
| `damage` | `value` | Direct damage to enemy |

No QTE for items — safe, reliable option. Used items tracked in `BattleResult.partyDeltas[].itemsUsed`.

---

## Layout — Landscape Four-Zone

The battle screen is a landscape layout with four zones stacked in a top/bottom split.

### Top Half — Scene

Enemy formation on the left, party formation on the right. Sprites, names, HP bars. Tap-to-target on enemies. Zone background fills behind both formations. Speech lane lives here too — fairy and party speech bubbles appear near their speaker's sprite.

### Bottom Center — ATB Gauges

Fill bars for all combatants (party + enemies). This is the visual heartbeat of the battle — the player watches these to anticipate who acts next. Fades out during action camera sequences and resumes on zoom-out.

### Bottom Action Side (Handedness-Dependent) — Action Menu

Four buttons: Attack, Defend, Item, Flee. Appears when a party member's ATB fills. Disappears after selection. `config.handedness` controls which side. Right-handed = actions on the right. Left-handed = mirrored. Uses existing `isLeftHanded` pattern from mobile layout.

### Bottom Opposite Side — Open Real Estate

Fairy chat, status effects, buff timers, or whatever we need. This space is always available and doesn't compete with inputs.

### Responsive

| Context | Adaptation |
|---------|-----------|
| Mobile landscape | Default layout. Touch input on action side. |
| Desktop | Same layout, larger. Click replaces tap. |
| Mobile portrait | V1: show "rotate device" prompt. Future: stacked variant. |

---

## Action Camera — The Zoom

When a party member selects an action and target, the battle enters **Action Camera mode**. The two active combatants (attacker + target) translate from their formation positions to center stage via CSS `transform: translate()`. Nothing unmounts, nothing rebuilds. Inactive combatants dim in place.

### Transition In (300-400ms ease)

1. Active combatants slide to center stage via computed translate offsets (based on `getBoundingClientRect` delta from formation position to scene center)
2. Active combatants scale up slightly (`ACTION_CAM.activeScale`)
3. Non-active enemies and party members dim to ~12% opacity
4. ATB gauges fade out
5. Action menu fades out
6. QTE zone appears in the bottom center (where ATB was)
7. Fairy comic panel appears in bottom-right (where action menu was)

### What the Player Sees During Action Cam

**Center stage — The two fighters.** Translated from their formations to center of the scene zone, scaled up slightly. Attack and defense anims play here.

**Center/bottom — QTE Zone.** Circle timing rings for both attack and defense QTEs. Large, easy to tap. This is where the player's hands are.

**Bottom-right — Comic panel.** Fairy portrait + speech bubble. Commentary, party member callouts, or enemy dialogue. Quick, punchy, disposable. Replaces the action menu zone during action cam. Must never overlap the QTE zone touch area.

**Top strip (optional) — Turn indicator.** Shows whose turn it is and the current exchange beat.

### Transition Out (300-400ms ease)

1. Comic panel fades out
2. QTE zone fades
3. Combatants translate back to formation positions, scale resets
4. Dimmed elements restore to full opacity
5. ATB gauges fade back in with a soft ease-in on resume (avoids the "everything moves at once" snap)

### Multi-Target Actions

For AoE or multi-target actions, the camera frames the primary attacker+target pair. Secondary targets remain visible in frame and receive damage splashes, but the camera doesn't try to frame everyone. No special camera logic needed — the primary pair drives the zoom math.

### Why Transform-Only

Active combatants move via `transform: translate() scale()` — no layout reflow, no flexbox recalculation, no unmounting. Inactive combatants change `opacity` only. All transitions are GPU-composited. The player never loses spatial continuity because the formations stay in place — only the active pair slides to center stage and back.

---

## Action Camera — The Exchange

The action camera is not a single hit. It's a **sustained exchange** — a mini-fight between the two combatants that resolves multiple beats before returning to the ATB loop. This is the intended feel of combat: each ATB cycle is a focused burst of activity, not a single tap.

### Why

The ATB wait-act-wait loop can feel sluggish on mobile. Picking an action, watching one hit, then waiting for gauges to refill is a lot of dead air on a phone. The exchange keeps the player engaged in one focused burst of activity. Fewer total ATB cycles per fight, but each cycle is meatier and more engaging.

### Exchange Flow

1. Party member ATB fills → player picks Attack + target
2. **Action cam zooms in**
3. **Player attack QTE** — circle timing rings
4. QTE resolves → attack anim plays → damage numbers pop
5. **Enemy immediately counters** — telegraph anim (shake/glow) → defense QTE
6. Defense QTE resolves → hit react or block anim plays → damage mitigated
7. *(Optional: bonus exchange beats — see Exchange Length below)*
8. **Action cam zooms out** → back to normal layout, ATB resumes

### Exchange Length — Design Direction

The base exchange is **1 attack QTE + 1 defense QTE** (Option A). This ships first and works on its own. The architecture models each exchange as a sequence of "beats" so extending is just pushing more beats into the array.

The target model is **QTE-driven extension** (Option C → hybrid D). Perfect QTE timing earns a follow-up beat in the same sequence. This rewards skill with more action and creates a "hot streak" feel. Caps at 2+2 to keep sequences from dragging.

| Option | Rule | Ships When |
|--------|------|-----------|
| **A — Fixed 1+1** | Every exchange = 1 attack + 1 counter | V1 baseline |
| **C — QTE-driven** | Perfect timing earns follow-up beats | V2 layer |
| **D — Hybrid (target)** | Base 1+1, perfects extend, cap 2+2, speed stat can modify | V2-V3 |

Option B (pure stat-driven) is deferred — adds a balancing dimension without the player-skill payoff.

### ATB Freeze During Exchange

All ATB gauges **freeze** when the action camera is active. They resume filling on zoom-out. The resume uses a soft ease-in ramp so pacing feels natural, not jarring. Tunable via `ATB.resumeEaseMs` in `battleConstants.js`.

### Fairy During Action Cam

The fairy comic panel is the big win. During normal battle, fairy chat competes with ATB bars and action menus for attention. During the action cam, the comic panel replaces the action menu in the bottom-right zone — fairy portrait + speech bubble with dedicated space to:

- React to the player's QTE performance in real time
- Taunt the enemy
- Warn about incoming attacks
- Celebrate or cringe at the result

These pop in as comic-style speech panels — quick, punchy, disposable. They wire through the existing `speechBubbles` prop pattern or the `onBattleEvent` observer callback.

---

## Loot Screen

End-of-encounter rewards overlay. Appears after the final wave. Shows accumulated loot from all waves. Separate from the action camera system — this is a full overlay, not a zoom.

---

## Architecture — Files and Ownership

### Sub-Mode Contract

Same pattern as `forgeMode.js`:

```
scavengeBattleMode = {
    id: "scavenge_battle",
    canEnter: function(config) { ... },
    onEnter: function(config) { ... },
    onExit: function() { return BattleResult; },
    getPhase: function() { ... },
    getView: function() { ... },
}
```

### File Structure

```
src/battle/
├── battleConstants.js          # All tuning values (transition, ATB, action cam, exchange, test data)
├── BattleView.js               # Root React component — four-zone layout, all sub-components inline
├── BattleView.css              # All battle styles (separate file — needs pseudo-elements, transitions)
├── BattleTransition.js         # Pixel dissolve screen transition (entry/exit)
├── battleMode.js               # Sub-mode contract (pure JS) — future
├── battleState.js              # State machine, turn queue, wave progression (pure JS) — future
├── battleResolver.js           # Damage formulas, loot rolls, flee checks (pure functions) — future
└── LootScreen.js               # End-of-encounter loot display — future

src/modules/
├── ScavengeMenu.js             # Quick/Extended choice overlay (host UI, not battle)
└── circleTimingQTE.js          # QTE plugin (DES-2 contract, portable)
```

**Note:** BattleView.js contains all sub-components inline (Combatant, ATBGaugeStrip, ActionMenu, QTEZone, ComicPanel, DevControls). These may be extracted to separate files if they grow, but for now a single file keeps the prototype easy to iterate on.

### Ownership

| File | Owns | Does NOT Own |
|------|------|-------------|
| `battleConstants.js` | All tuning values (ATB, action cam, exchange, transition, test data) | Game logic, rendering |
| `BattleView.js` | Layout structure, phase state, ATB tick, action cam transitions, all inline sub-components | Host state, damage math |
| `BattleView.css` | All battle styles, transition animations, pseudo-elements | Logic, state |
| `BattleTransition.js` | Pixel dissolve screen transition | Battle internals |
| `battleMode.js` (future) | Phase state machine, lifecycle | Rendering, host state |
| `battleState.js` (future) | Turn queue, wave progression, HP, loot pool, exchange beat tracking | Display, input |
| `battleResolver.js` (future) | Damage math, loot rolls, flee chance | State mutation (returns deltas) |

**External dependencies (not in `src/battle/`):**
| File | Location | Role |
|------|----------|------|
| `circleTimingQTE.js` | `src/modules/` | QTE plugin — portable, used by battle but not owned by it |
| `ScavengeMenu.js` | `src/modules/` | Entry menu — host UI that gates battle entry |

### Component Tree

```
BattleView (root — four-zone layout, phase state, ATB tick)
  ├── Scene zone
  │   ├── Combatant × N (enemy formation, left)
  │   ├── Combatant × N (party formation, right)
  │   └── Clash spark (visible on resolve phases)
  ├── Bottom zone
  │   ├── Open real estate (left — buffs, status, placeholder)
  │   ├── ATBGaugeStrip (center — all combatant gauges, hides during action cam)
  │   ├── ActionMenu (right — 2x2 grid, hides during action cam)
  │   ├── QTEZone (overlay on center, visible during QTE phases)
  │   └── ComicPanel (overlay on right, visible during action cam — fairy portrait + speech)
  └── DevControls (bottom overlay — phase stepping, target picker, ATB toggle)
```

State down. Callbacks up. No bus, no singletons.

---

## Battle Phases

```
PHASES = {
    // --- Implemented in prototype ---
    ATB_RUNNING:      "atb_running",
    ACTION_SELECT:    "action_select",
    ACTION_CAM_IN:    "action_cam_in",
    QTE_ACTIVE:       "qte_active",
    RESOLVING:        "resolving",
    ENEMY_TELEGRAPH:  "enemy_telegraph",
    DEFENSE_QTE:      "defense_qte",
    ACTION_CAM_OUT:   "action_cam_out",

    // --- Future (not yet in battleConstants.js) ---
    INTRO:            "intro",
    WAVE_TRANSITION:  "wave_transition",
    LOOT:             "loot",
    EXIT:             "exit",
}
```

### Legal Transitions

```
INTRO           → ATB_RUNNING
ATB_RUNNING     → ACTION_SELECT | ENEMY_TELEGRAPH
ACTION_SELECT   → ACTION_CAM_IN | RESOLVING (instant actions) | ATB_RUNNING (cancel)
ACTION_CAM_IN   → QTE_ACTIVE
QTE_ACTIVE      → RESOLVING
RESOLVING       → ENEMY_TELEGRAPH (exchange counter) | ACTION_CAM_OUT (exchange complete) | WAVE_TRANSITION | LOOT (last enemy, last wave)
ENEMY_TELEGRAPH → DEFENSE_QTE
DEFENSE_QTE     → RESOLVING
ACTION_CAM_OUT  → ATB_RUNNING
WAVE_TRANSITION → ATB_RUNNING | LOOT (flee between waves)
LOOT            → EXIT
any             → EXIT (flee mid-wave, KO)
```

### Exchange Flow Through Phases

A typical attack exchange walks through:
`ACTION_SELECT → ACTION_CAM_IN → QTE_ACTIVE → RESOLVING → ENEMY_TELEGRAPH → DEFENSE_QTE → RESOLVING → ACTION_CAM_OUT → ATB_RUNNING`

With QTE-driven extension (V2+), RESOLVING can loop back to QTE_ACTIVE for bonus beats before reaching ACTION_CAM_OUT. The exchange is a sub-loop within the action camera.

---

## Fairy Integration — Zero Coupling

### As Commentator (V1-Ready via Observer)

Host passes `onBattleEvent`. Host's fairy controller listens and generates speech. Host pipes fairy speech into the battle's `speechBubbles` prop. Battle doesn't know fairy exists.

### As Party Member (Future)

Fairy joins `party` array with `aiControlled: true`. Battle calls `onActionNeeded(battleState)` when her ATB fills. Host routes to LLM. Battle awaits action and continues. Doesn't know an LLM was involved.

---

## What's V1 vs Future

### V1 — Proof of Concept

- [ ] Input config / output deltas contract
- [ ] Solo party (1 member)
- [ ] ATB core loop (with freeze during action camera)
- [ ] Circle timing QTE (multi-ring, variable timing)
- [ ] 4-action menu (Attack, Defend, Item, Flee)
- [ ] Action camera zoom (transform-only, transition in/out)
- [ ] Exchange system — fixed 1+1 (attack QTE + defense QTE per action cam)
- [ ] 1 zone, 2 waves, no boss
- [ ] 3–4 enemy types, 2–3 item types
- [ ] Loot screen
- [ ] Landscape layout with four-zone split and handedness flip
- [ ] Observer callback (includes action cam events)
- [ ] Speech lane + fairy comic panel zone (static, no fairy wiring yet)

### V2 — Content + Polish

- [ ] QTE-driven exchange extension (perfect timing → bonus beats, cap 2+2)
- [ ] Boss waves + boss enemies
- [ ] More zones, enemies, items
- [ ] Enemy visual tells
- [ ] Wave transition animations
- [ ] Fairy commentary via observer → comic panel popups during action cam
- [ ] ATB resume ease-in tuning
- [ ] SFX + battle music

### V3 — Party + AI

- [ ] Fairy as party member
- [ ] LLM action selection
- [ ] Combo moves
- [ ] Special moves (smith rank gated)

### V4+ — Expansion

- [ ] Portrait layout variant
- [ ] Swipe QTE variant
- [ ] Enemy AI with conditions
- [ ] Equipment effects
- [ ] Scavenge-only progression track

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Portability | Config in, deltas out | Standalone. Host maps its domain. |
| Stat mapping | Host computes all combat values | Battle imports nothing from host |
| Difficulty | Fixed per zone | Dark Souls progression |
| QTE | Multi-ring shrinking circles | More engaging than single-tap |
| Action camera | Transform-only zoom on existing tree | GPU-composited, no reflow, spatial continuity preserved |
| Exchange model | Sustained 1+1 base, extensible to 2+2 | Eliminates dead air, keeps player active per ATB cycle |
| ATB during exchange | Freeze all gauges, ease-in on resume | Clean rule, tunable pacing |
| Multi-target camera | Frame primary pair, splash on others | Pragmatic — AoE is rare, no special camera math |
| Party | Built for N, ships with 1 | Fairy slots in later, zero architecture changes |
| AI members | `onActionNeeded` callback | Battle agnostic to LLM vs scripted |
| External comms | Observer (fire-and-forget) | Zero coupling to fairy, analytics, etc. |
| Internal comms | React state + callbacks | Self-contained, no bus dependency |
| Layout | Landscape four-zone + handedness | Clean separation: scene, ATB heartbeat, actions, open real estate |
| Wave state | HP/items persist, ATB/buffs reset | Risk/reward tension |
| KO | Lose all loot | Stakes make flee decisions meaningful |