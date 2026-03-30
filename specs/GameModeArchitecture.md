# Game Mode Architecture — Simulator vs Adventure

**Date:** 2026-03-30
**Status:** 📝 DESIGN DRAFT
**Depends on:** GameMode system (DES-1), Battle system (ScavengeBattleSpecs), Decree/Quest system

---

## Core Idea

Two game modes selectable from the main menu. Both share the same engine — forge QTE, inventory, economy, day cycle, fairy, ability system. The mode determines what the game is *about*: crafting for customers vs adventuring for loot.

---

## Mode Definitions

### Simulator Mode ("The Forge")

You're a blacksmith running a shop. Decrees ask you to craft things. Customers visit. You buy materials, forge weapons, sell them, build reputation. Scavenging exists as a **side activity** — quick runs to grab materials when the market is short or expensive. Battles are low-stakes: short encounters, 1 wave, easier enemies, no boss.

**Core loop:** Wake → Decree (craft X) → Buy/Scavenge materials → Forge → Sell → Reputation → Sleep

**What drives progression:** Smith rank, reputation, unlocked blueprints, forge skill mastery.

### Adventure Mode ("The Anvil & The Road")

You're a blacksmith who goes on missions. Decrees send you to zones. You prep at the forge — craft weapons and gear for yourself using materials from previous runs. Battles are the **main event**: multi-wave, bosses, real stakes, full pip economy. KO = lose loot.

**Core loop:** Wake → Decree (go to X zone) → Prep at forge → Adventure → Loot materials → Forge gear for self → Equip → Harder Decree

**What drives progression:** Zone access, material tiers, weapon/gear quality, combat skill mastery, smith rank unlocking new recipes.

---

## Shared Systems (Mode-Agnostic)

These systems already exist and work identically in both modes. No changes needed.

| System | Why it's shared |
|--------|----------------|
| Forge QTE | Same minigame. Simulator: forge to sell. Adventure: forge to equip. |
| Inventory / Economy | Same items, materials, gold. Source of income differs by mode. |
| Day Cycle / GameMode | Same wake → morning → open → late → sleep. Activities differ. |
| Ability Manager | Same morning events, reactive abilities. Mode can filter which abilities are in the pool. |
| Fairy | Same companion. Commentary adapts to context (forge vs battle). |
| Audio / SFX | Same system. Battle SFX only active when battle is running. |
| Constants / Theme | Same data tables. Mode-specific tuning layered on top (see below). |
| Bus / Event Tags | Same communication backbone. Mode-specific tags added as needed. |

---

## Mode-Specific Layers

### Decree System

The decree system is the primary divergence point. Same architecture, different data pools.

**Simulator decrees:** "Forge a Gold Shortsword of Good+ quality by Day 5." Same as current royal quest system.

**Adventure decrees:** "Clear the Junkyard (Zone 1, 2 waves)." or "Retrieve Enchanted Ore from the Goblin Mines (Zone 3, 3 waves + boss)."

**Implementation:** `questLogic.js` already generates decrees. Add a `type` field to decree definitions:

```
{ type: "craft", ... }     // Simulator: forge and deliver
{ type: "adventure", ... }  // Adventure: enter zone, survive, return with loot
```

The decree generator pulls from the correct pool based on mode. The quest state hook doesn't care — it tracks deadline, fulfilled, reward the same way.

### Battle Config Scaling

Same battle black box, different config weight passed in.

| Config field | Simulator | Adventure |
|-------------|-----------|-----------|
| Waves | 1 | 2-4 (zone dependent) |
| Enemy difficulty | Low, flat | Scaled per zone tier |
| Boss | Never | Zone-final wave |
| Loot quality | Basic materials | Tiered materials + rare drops |
| KO penalty | Lose gathered materials | Lose all loot (high stakes) |
| Available between | Any day, optional | Decree-driven, prep required |

**Implementation:** The host already builds `BattleConfig` before entering battle. The mode flag determines which config template to use. Battle system doesn't know or care.

### Forge Purpose

| Aspect | Simulator | Adventure |
|--------|-----------|-----------|
| Primary output | Weapons to sell | Weapons/gear to equip |
| Quality matters for | Sale price, decree fulfillment | Combat stats, combo quality |
| Customer system | Active (customers visit) | Inactive or minimal (gold from decree rewards) |
| Market/shop | Buy materials to forge | Buy supplies you can't find in the field |

**Implementation:** The forge QTE and forgeVM are identical. What happens to the finished weapon differs:
- Simulator: goes to `finished` array → sold to customers/decree
- Adventure: goes to `equipment` slot → affects BattleConfig stats

This means adventure mode needs an **equipment system** that simulator mode doesn't. But the forge itself is unchanged.

### Gold Economy

| Aspect | Simulator | Adventure |
|--------|-----------|-----------|
| Primary income | Selling forged weapons | Decree completion rewards, selling excess loot |
| Primary expense | Buying materials | Buying consumables, repair materials |
| Market role | Core loop (buy mats → forge → sell) | Supplementary (fill gaps the field doesn't cover) |

**Implementation:** `useEconomyVM` bus handlers already work with generic gold add/subtract. The source doesn't matter to the system.

---

## Architecture: How Modes Plug In

### Main Menu

Add a mode selection screen between MainMenu and game start. Stored in a top-level state (or passed as config to GameMode).

```
SplashScreen → MainMenu → ModeSelect → Game
```

### GameMode Integration

`gameMode.js` already has a sub-mode contract (`canEnter`, `onEnter`, `onExit`, `getPhase`, `getView`). The game mode (simulator vs adventure) is a layer ABOVE sub-modes:

```
Game Mode (simulator | adventure)
  └── Sub-modes (forge, shop, idle, battle, adventure-prep)
```

**Implementation option A — Config flag:**
GameMode receives a `modeConfig` on init that sets:
- Which decree pool to use
- Which sub-modes are available
- Which day activities are enabled
- Battle config template
- Whether customer system is active

This is the lightest touch. No new architecture, just a config object that gates existing behavior.

**Implementation option B — Mode definition files:**
Like `forgeMode.js`, create `simulatorMode.js` and `adventureMode.js` that each define:
- Available sub-modes
- Decree pool
- Day structure overrides
- Systems to activate/deactivate

This is cleaner long-term but more work upfront.

**Recommendation:** Start with Option A (config flag). Refactor to Option B if the modes diverge enough to warrant separate files. The current system is flexible enough that a config flag handles the V1 split cleanly.

### Mode Config Shape (Draft)

```javascript
var MODE_CONFIGS = {
    simulator: {
        id: "simulator",
        label: "The Forge",
        decreePool: "craft",          // questLogic pulls from craft decrees
        customerSystem: true,         // CustomerSubSystem active
        battleAccess: "optional",     // scavenge button available but not required
        battleTemplate: "casual",     // 1 wave, easy enemies, no boss
        equipmentSystem: false,       // no self-equip, forge output → sell
        lootTarget: "inventory",      // battle loot → material inventory
        goldSource: "sales",          // primary income from selling weapons
    },
    adventure: {
        id: "adventure",
        label: "The Anvil & The Road",
        decreePool: "adventure",      // questLogic pulls from adventure decrees
        customerSystem: false,        // no customer visits
        battleAccess: "decree",       // battle zones unlocked by active decree
        battleTemplate: "scaled",     // multi-wave, zone-tiered, boss on final
        equipmentSystem: true,        // forge output → equip on self
        lootTarget: "inventory",      // battle loot → material inventory (same)
        goldSource: "decrees",        // primary income from decree completion
    },
};
```

Systems read this config to gate their behavior:
- `CustomerSubSystem.init()` checks `modeConfig.customerSystem`
- Quest generation checks `modeConfig.decreePool`
- Battle entry checks `modeConfig.battleAccess`
- Post-forge flow checks `modeConfig.equipmentSystem`

---

## New Systems Needed (Adventure Mode Only)

### Equipment System

Adventure mode needs a way to equip forged weapons on the player character. This feeds into BattleConfig.

**Scope:**
- Equipment slots (weapon, maybe armor later)
- Equipped weapon determines: attackPower, combo beat array, QTE ring count
- Forge quality affects combat stats (perfect forge → bonus beats)
- Weapon degradation (optional, TBD): weapons wear from combat, need repair/replacement

**Architecture:** New state hook `useEquipmentState.js` + equipment logic in `equipmentLogic.js`. Bus-driven like everything else. Battle config builder reads equipped weapon to populate combatant stats.

### Zone / Encounter Definitions

Adventure decrees reference zones. Zones define:
- Enemy pool, difficulty scaling, wave count
- Loot tables (which materials drop here)
- Background art, music
- Unlock conditions (smith rank, previous zone cleared)

**Architecture:** Data table in constants (or a new `zoneConstants.js`). Decree generator picks zones based on progression. Host builds BattleConfig from zone definition.

### Forge-to-Combat Stat Bridge

Maps forge output to battle stats. Lives in the host layer (not inside battle).

```
Weapon recipe     → base attackPower, combo template
Forge quality     → stat multiplier, bonus beat unlock
Material tier     → damage type, visual FX
```

**Architecture:** Pure function in a new `combatBridge.js` or inside `battleConfigBuilder.js`. Called when building BattleConfig before battle entry.

---

## What NOT to Build Yet

| Thing | Why not yet |
|-------|-------------|
| Armor / multi-slot equipment | Weapon-only is enough for V1 adventure. Add slots when content demands it. |
| Weapon degradation | Fun idea but adds complexity. Park it until core loop is proven. |
| Adventure-specific fairy dialogue | Fairy system already has context-aware commentary. Just needs new cue data, not new architecture. |
| Separate save files per mode | Same save, mode is just a config. Player can switch modes (future). |
| Zone map / overworld | Decree tells you where to go. No map needed V1. |

---

## Implementation Order (Suggested)

**Phase 1 — Shared foundation (no mode split yet)**
1. Add `modeConfig` to GameMode init
2. Gate CustomerSubSystem on `modeConfig.customerSystem`
3. Add `type` field to decree definitions
4. Split decree pool in questLogic by type

**Phase 2 — Adventure mode skeleton**
5. Adventure decree definitions (zone references)
6. Zone data table (enemies, waves, loot, difficulty)
7. Equipment state hook + equip UI
8. Forge-to-combat stat bridge (combatBridge.js)
9. Battle config builder reads equipped weapon + zone data

**Phase 3 — Mode select UI**
10. ModeSelect screen between MainMenu and game start
11. Pass selected mode config through to GameMode
12. Test both paths end-to-end

**Phase 4 — Polish & divergence**
13. Mode-specific morning ability pools (if needed)
14. Adventure-specific decree rewards (zone unlocks, rare recipes)
15. Forge quality → combat bonus beats connection
16. Playtest balance for both modes independently