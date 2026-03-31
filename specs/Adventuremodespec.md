# Adventure Mode — Feature Spec

**Codename:** The Anvil & The Road
**Status:** 📝 DESIGN DRAFT
**Date:** 2026-03-31
**Depends on:** Battle system (ScavengeBattleSpecs), Forge QTE (DES-2), Day Cycle (DES-1), Fairy system

---

## Table of Contents

1. Core Concept
2. The Loop
3. Decrees
4. Node Maps
5. Node Types
6. Extraction & Stakes
7. Flee & Retreat
8. Forge Connection
9. Equipment (Found/Bought)
10. Gold Economy
11. Title System
12. Progression Tracks
13. Location Definitions
14. V1 Scope
15. Deferred (V2+)
16. Open Questions

---

## 1. Core Concept

Adventure mode is an extraction-style gameplay loop built on top of the existing forge/battle/day-cycle engine. The king assigns decrees. Decrees point to locations. Locations are small node maps the player navigates for materials, loot, and decree objectives. The forge is home base — every run starts and ends at the anvil.

**One sentence:** King gives you a job → you forge a weapon → you enter a map → you navigate to an exit or die trying → whatever you brought home feeds the next forge → repeat.

---

## 2. The Loop

```
Decree arrives (king assigns blind)
       ↓
Forge prep — craft or select weapon, buy consumables, choose equipment + title
       ↓
Enter location — see full node map, plan route
       ↓
Navigate nodes — battle, mine, trade, rest, field-forge, mystery
       ↓
  ┌─── Extract (reach exit node) ──→ Keep weapon + all loot
  │
  ├─── Flee (retreat from battle) ──→ Pushed to last fork, reroute to exit
  │
  └─── KO ──→ Weapon destroyed (salvage returned), loot lost (except safe pocket)
       ↓
Back at forge — loot feeds next craft, gold buys shortcuts, decree deadline ticks
```

Three resources the player manages across this loop:

- **Time** — decree deadlines + day/stamina budget. Can't do everything.
- **Materials** — found on maps, bought from shops. Fed into the forge.
- **Gold** — earned from decrees, spent on shortcuts. Time you already earned.

---

## 3. Decrees

Decrees are the reason to leave the forge. The king assigns them. The player reacts.

**Rules:**
- Assigned blind — no preview, no choice. React to what you get.
- One active decree at a time.
- Each decree specifies: target location, difficulty tier, objective (boss kill / item retrieval / zone clear), deadline in days, reward (gold + progression unlock).
- Decree target is a specific node at the deepest point of the map.
- Deadline creates time pressure — forge prep days vs adventure days vs farming days all compete.

**Decree examples:**
- "Clear the Junkyard (Normal). Deadline: Day 3. Reward: 60 gold + Goblin Mines unlock."
- "Retrieve Enchanted Ore from Goblin Mines (Hard). Deadline: Day 5. Reward: 100 gold + Staff recipe."
- "Defeat the Cursed Blacksmith in the Haunted Armory (Perilous). Deadline: Day 7. Reward: 200 gold + Ghost Iron recipe."

**Player can also enter locations without a decree** — farming runs, scouting runs, elite hunting. The decree just adds a target and a deadline.

---

## 4. Node Maps

Each location generates a small node map. Inspired by Slay the Spire's structure with extraction-game stakes.

### Layout Rules

- 3–5 rows depending on difficulty tier. 2–3 branching paths per row.
- Fully visible before entry — player sees all node types and exit locations upfront. Strategy comes from route planning with current loadout state.
- Paths branch and merge (diamond shape). Some branches are dead ends with high-value rewards but no exit.
- No backtracking. Once you pass a node, it's behind you. Commit to your route.

### Extraction Nodes

Exits are **specific nodes** on the map, not available after every row. The player must route to them.

**Placement rules:**
- At least one exit within the first 2 rows (mercy lane — quick farming route).
- Deeper exits placed near the best loot and the decree target.
- Dead-end branches have no exit — high reward, but you must have a route planned to reach an exit elsewhere.
- Exit count scales with map size: small maps get 2, large maps get 2–3.

**Example map:**

```
[ENTRANCE]
      |
   ┌──┼──────────┐
   ↓  ↓          ↓
 [⛏Mine] [⚔Battle] [❓Mystery]
   |        |           |
   ↓     ┌──┼──┐        ↓
 [⚔Bat] [🚪EXIT] [⛏Mine]  ← dead end branch
   |        |
   ↓        ↓
 [🏪Merch] [🔥Forge Site]
   |           |
   ↓           ↓
 [🚪EXIT]  [★ BOSS ★ → 🚪EXIT]
```

---

## 5. Node Types

Each node type serves a distinct role. Themed to the location where possible.

### Battle
Standard fight using the existing battle system. 1–2 enemies. Costs HP. Drops loot. Enemy types themed to location (trash bags in Junkyard, goblins in Mines).

### Elite
Hard fight. Unique enemy per location. Better loot, chance to drop rare equipment. The "is it worth it" node.

### Mine / Scavenge
No combat. Player picks from 2–3 material bundles, themed to location. Possible ambush trap (surprise battle at reduced enemy strength). The safe farming node.

### Rest
Heal HP. Universal — not themed. The pressure-release valve on a long run.

### Merchant
Buy/sell mid-run. Stock influenced by location. Consumables, basic materials, occasionally equipment. Gold spent here is gold you can't spend at home.

### Forge Site
Field anvil — do a QTE mid-run. Repair weapon (restore from worn state, V2) or apply a temporary combat buff (sharpen). QTE may be harder than home forge (crappy field anvil). Themed: Haunted Armory has a cursed anvil with bonus quality but random negative effect.

### Mystery
Random event. Could be positive (free loot, fairy bonus), negative (ambush, trap), or weird (NPC encounter, gamble). Fairy reacts to these. Themed to location. Examples: Junkyard has Magnetic Crane (gamble: pull random loot or junk), Goblin Mines has Minecart Ride (skill check: succeed = shortcut, fail = damage).

### Boss / Decree Target
Deepest node. Decree objective lives here. Hardest fight on the map. Best loot. Extraction node adjacent — beat the boss, walk out.

### Extraction (Exit)
Leave the map. Keep your weapon and all gathered loot. Run complete.

---

## 6. Extraction & Stakes

The player brings a forged weapon into every run. That weapon is their risk.

### Outcome Table

| Outcome | Weapon | Loot | Details |
|---------|--------|------|---------|
| **Extract** | Keep | Keep all | Reach an exit node. Full success. |
| **Flee** | Keep | Lose unpocketed | Retreat to last fork (see §7). Must reroute to an exit. |
| **KO** | Destroyed → salvage | Lose unpocketed | Weapon returns as ~50% of recipe materials. Run ends. |

### Safe Pocket

1–2 protected inventory slots (upgradeable via progression). During scavenge/loot nodes, player can pocket items — these survive KO and flee. Pocketed items show a lock icon.

The pocket creates a running decision: "Do I pocket this rare ore now, or gamble that I'll extract with everything?"

### Fairy Insurance (Progression Unlock — Fairy Loyalty Tier 4)

On KO, fairy preserves the weapon but drops it one quality tier: perfect → good → decent → sloppy → breaks into salvage. Gives 2–3 KO buffer before full weapon loss. Makes the fairy feel mechanically valuable.

### Salvage Rules

Weapon destroyed on KO returns as partial materials:
- ~50% of the original recipe cost (rounded down, minimum 1 item).
- Salvage appears in inventory on return home.
- Player is never more than 1 day of recovery from a KO — scavenge or buy the missing materials, reforge, go again.

---

## 7. Flee & Retreat

Fleeing a battle node doesn't exit the map — it pushes the player backward.

### Rules

- Flee returns the player to the **last decision fork** (the node where they chose a branch).
- The failed path is blocked — can't retry it.
- Player picks a different branch from that fork.
- If all paths from a fork are blocked, pushed to the previous fork.
- If flee on row 1 (no earlier fork), **forced extraction** — leave the map with only pocketed items.

### Why This Works

Fleeing has real map consequences. You're rerouted, possibly onto a worse path. Maybe the only remaining branch goes through an elite you were avoiding. The map becomes a navigation problem after a flee, not just a health problem.

---

## 8. Forge Connection

The forge is home base. Adventure feeds it, it feeds adventure.

### Before the Run
- Forge a weapon suited to the location's enemies (weapon type vs enemy poise types).
- Weapon type determines combat style: dagger (fast/many hits), hammer (slow/heavy), sword (balanced), staff (debuffs).
- Forge quality affects combat stats — higher quality = more attackPower + bonus combo beats.

### During the Run
- Forge Site nodes allow mid-run QTE for temporary weapon buff.

### After the Run
- Loot materials feed the next forge session.
- KO salvage means reforging is cheaper than starting from scratch.

### Quality-to-Combat Mapping

| Forge Quality | attackPower Multiplier | Beat Modifier | Notes |
|--------------|----------------------|---------------|-------|
| Sloppy | ×0.7 | −1 swing (min 1) | Functional but weak |
| Decent | ×0.85 | Base count | Standard |
| Good | ×1.0 | Base count | Full potential |
| Perfect | ×1.15 | +1 bonus swing | Rewards mastery |

---

## 9. Equipment (Found / Bought)

Weapons are forged. Everything else is found on maps or bought from merchants.

### Slots (V1)

| Slot | Source | Persistence |
|------|--------|-------------|
| **Weapon** | Forged at anvil | Lost on KO (salvaged) |
| **Armor** | Found on maps, bought from merchants | Permanent — kept on KO |
| **Accessory** | Found in mystery/elite nodes, rare merchants | Permanent — kept on KO |

### Design Principles

- Equipment has **no quality tiers from forging.** You either have it or you don't. Quality is exclusively the forge's domain (weapons only). Keeps systems clean.
- Equipment gives **flat passive bonuses** — +HP, +block chance, +dodge, +loot bonus, etc.
- Each location drops location-themed equipment. Gives maps replay value beyond materials.
- Merchants at home and on maps sell equipment for gold — gives gold a clear spending target.

### Equipment Examples

| Item | Slot | Found where | Bonus |
|------|------|-------------|-------|
| Scrap Vest | Armor | Junkyard drops | +10% max HP |
| Goblin Mail | Armor | Goblin Mines elite | +15% block chance |
| Ghost Shroud | Armor | Haunted Armory mystery | +10% dodge, −5% max HP |
| Lucky Charm | Accessory | Mystery nodes (rare) | +10% rare material drop chance |
| Whetstone Ring | Accessory | Merchant (expensive) | Field forge QTE slightly easier |
| Sprint Boots | Accessory | Junkyard elite | Flee always succeeds (still reroutes) |

---

## 10. Gold Economy

Gold is time you already earned. It buys shortcuts when decree deadlines are tight.

### Earn Gold From
- **Decree completion** — primary income. Scales with difficulty tier (Normal ×1, Hard ×1.5, Perilous ×2).
- **Selling excess materials/loot** — clean out inventory for quick cash.
- **Mid-run merchant nodes** — occasionally buy items from you.

### Spend Gold On
- **Shop materials** — basics only. Common tier. Restocks slowly.
- **Consumables** — healing items, buff items for runs.
- **Equipment** — merchants sell armor/accessories for gold.
- **Mid-run merchants** — emergency supplies deep in a map.

### Key Constraint
**Rare materials are map-exclusive.** The shop never stocks them. If you need enchanted steel, you go to the Haunted Armory. Gold can't buy everything — it just smooths the common stuff.

---

## 11. Title System

Titles are earned through specific accomplishments. Equip one at a time. The equipped title gives a passive modifier.

### How It Works
- Accomplish something notable → unlock a title permanently.
- Equip one title at a time from a list.
- Equipped title shows under player name, provides a passive gameplay modifier.
- Swap freely before runs. The right title depends on what you're doing today.

### Title List (V1)

| Title | How to Earn | Equipped Modifier |
|-------|-------------|-------------------|
| **the Scrapper** | Extract from 5 runs | +1 material from mine nodes |
| **the Reckless** | Complete a decree on final deadline day | First battle per run: enemy −20% HP |
| **the Perfectionist** | Forge 5 perfect quality weapons | Perfect weapons get +1 bonus beat in combat |
| **the Survivor** | Get KO'd 3 times then complete next decree each time | Salvage returns 75% materials instead of 50% |
| **the Scavenger** | Extract with full safe pocket 10 times | Safe pocket holds 3 items instead of 2 |
| **the Merchant** | Earn 500 total gold from selling | Shop prices reduced 15% |
| **the Daggermaster** | Complete 3 decrees using only daggers | Dagger combo +1 swing at all tiers |
| **the Hammerlord** | Complete 3 decrees using only hammers | Hammer poise damage +25% |
| **the Blade Dancer** | Complete 3 decrees using only swords | Sword QTE timing window slightly wider |
| **the Explorer** | Visit every location at least once | Mystery nodes always give positive outcomes |
| **the Iron Will** | Complete a Perilous run without consumables | Start each run with +15% max HP |
| **the Fairy Friend** | Reach Fairy Loyalty Tier 4 | Fairy hints reveal 2 nodes instead of 1 |
| **the Ruined** | Lose 10 weapons to KO | Broken weapons return salvage +1 random bonus material |
| **the Untouchable** | Complete a run taking 0 damage | First hit each run is absorbed (free shield) |

### Design Principles

- Earned by doing, not grinding. Every title should feel like it came from a story.
- Modifier matches the accomplishment. The Perfectionist gets forge bonuses, not combat bonuses.
- Real choices. Different titles suit different run types — swap based on plan for the day.
- Some titles are funny. The Ruined is a consolation prize that actually helps.

---

## 12. Progression Tracks

Five tracks, all feeding each other.

### Smith Rank (Backbone)

Earned through XP from forging + decree completion. Unlocks new content at each rank.

| Rank | Unlocks |
|------|---------|
| 1 | Starting recipes (dagger, sword). Junkyard location. |
| 2 | Hammer recipe. Shop restocks faster. |
| 3 | Hard difficulty tier (all locations). Goblin Mines location. |
| 4 | Staff recipe. Forge Site nodes appear on maps. Second consumable pouch (+3 slots). |
| 5 | Shield+Weapon recipe. Second safe pocket slot. |
| 6 | Perilous difficulty tier. Haunted Armory location. |
| 7 | Master forge bonus (QTE timing windows slightly wider). |
| 8+ | Cosmetic anvil upgrades, prestige recipes, rare material recipes. |

### Fairy Loyalty

Builds passively through runs together, forging, conversation. Six tiers.

| Tier | Name | Unlock |
|------|------|--------|
| 1 | Stranger | Basic commentary. No mechanical help. |
| 2 | Acquaintance | Map hints — fairy marks one hidden detail before entry. |
| 3 | Companion | Enemy intel — after first encounter with an enemy type, fairy remembers weakness on future runs. |
| 4 | Trusted | Fairy insurance — on KO, weapon drops one quality tier instead of breaking. |
| 5 | Bonded | Third safe pocket slot. |
| 6 | Soulbound | Second chance — once per run, fairy revives you at 30% HP instead of KO. Resets per run. |

### Location Knowledge

Per-location, builds through repeat visits.

| Visits | Benefit |
|--------|---------|
| 1st | Blind — no intel. |
| 2nd | Fairy remembers enemy types. Weakness hints before battle nodes. |
| 3rd | One random node type revealed before entry (beyond exits). |
| 5th | Mine nodes show drops before you commit to the path. |

### Difficulty Tiers

Per-location, unlocked by Smith Rank.

| Tier | Unlock | Map Rows | Exits | Enemies | Mine Drops | Decree Reward |
|------|--------|----------|-------|---------|------------|---------------|
| Normal | Default | 3 | 2 (one shallow) | Base | Common | ×1 |
| Hard | Rank 3 | 4 | 2 (none shallow) | ×1.5 HP/dmg | Common + uncommon | ×1.5 |
| Perilous | Rank 6 | 4–5 | 2 (all deep) | ×2.5 HP/dmg | Uncommon + rare | ×2 |

### Titles

See §11. Earned through accomplishments, equipped for passive modifiers.

---

## 13. Location Definitions

Each location is a themed place with unique enemies, materials, and flavor nodes.

### Junkyard

| Aspect | Details |
|--------|---------|
| Theme | Grimy, comedic. Sentient garbage. |
| Materials | Scrap iron, rusty gears, salvage wire |
| Enemies | Trash bags, feral rats, rust golem (elite) |
| Unique node | Magnetic Crane — gamble: pull random loot or junk |
| Equipment drops | Scrap Vest (armor), Sprint Boots (accessory) |
| Unlock | Smith Rank 1 (starting location) |

### Goblin Mines

| Aspect | Details |
|--------|---------|
| Theme | Dark, cramped. Underground. |
| Materials | Raw copper, gemstones, coal, tin ore |
| Enemies | Goblins, cave bats, mine cart golem (elite) |
| Unique node | Minecart Ride — skill check: succeed = shortcut, fail = damage |
| Equipment drops | Goblin Mail (armor), Lucky Charm (accessory) |
| Unlock | Smith Rank 3 |

### Haunted Armory

| Aspect | Details |
|--------|---------|
| Theme | Spooky, ironic. Your own profession turned against you. |
| Materials | Enchanted steel, ghost iron, weapon fragments |
| Enemies | Possessed armor, spectral smiths, cursed blade (elite) |
| Unique node | Cursed Anvil — field forge with bonus quality ceiling but random curse attached |
| Equipment drops | Ghost Shroud (armor), Whetstone Ring (accessory) |
| Unlock | Smith Rank 6 |

### Royal Hunting Grounds (V2 candidate)

| Aspect | Details |
|--------|---------|
| Theme | Noble, dangerous. Beasts and honor. |
| Materials | Leather, bone, feathers, beast pelts |
| Enemies | Dire wolves, boar knights, griffin (elite) |
| Unique node | Trapper's Cache — choose: take the loot or free trapped animal for fairy favor |
| Equipment drops | TBD |
| Unlock | TBD |

---

## 14. V1 Scope

### Include

- Core loop: decree → forge → map → extract/KO → repeat
- Node map system with full visibility and extraction nodes
- All node types (battle, mine, elite, rest, merchant, forge site, mystery, boss, exit)
- Extraction stakes: weapon loss on KO, salvage return, safe pocket (2 slots)
- Flee → retreat to last fork mechanic
- Equipment: 2 slots (armor + accessory), found/bought, permanent
- Title system with ~14 earnable titles
- Smith Rank progression (ranks 1–7)
- Fairy Loyalty tiers 1–4 (hints, intel, insurance)
- Location Knowledge (per-location, 1st–5th visit benefits)
- Difficulty tiers: Normal, Hard, Perilous
- 3 locations: Junkyard, Goblin Mines, Haunted Armory
- Gold economy: decrees as primary income, shop for basics, map-exclusive rares

### Architecture Notes

- Mode config flag (Option A from GameModeArchitecture.md). Adventure mode is a config passed to GameMode.
- Node map is a new system: `src/adventure/` folder. Map generator, node definitions, map state, map view.
- Battle system unchanged — host builds BattleConfig from equipped weapon + zone data + difficulty tier. Battle is still a black box.
- Equipment state: new hook `useEquipmentState.js`. Bus-driven. Reads equipped gear when building BattleConfig.
- Title state: new hook `useTitleState.js`. Tracks earned titles + equipped title. Modifiers applied by relevant systems reading the equipped title.
- Decree system: existing `questLogic.js` extended with `type: "adventure"` decrees. Quest state hook unchanged — tracks deadline, fulfilled, reward as before.

---

## 15. Deferred (V2+)

| Feature | Why deferred |
|---------|-------------|
| Weapon durability during runs | Great strategy layer, but prove base loop first |
| Fairy Loyalty tiers 5–6 (extra pocket, revive) | V1 tiers 1–4 are enough progression |
| Full location mastery (node preview at 5th visit) | Nice-to-have, not critical |
| Weapon coatings (element buffs) | Adds depth after weapon types are proven |
| Multiple simultaneous decrees | One at a time keeps pressure focused |
| Royal Hunting Grounds + more locations | Content expansion after 3 core locations proven |
| Backup weapons / multi-weapon loadout | One weapon per run is cleaner for V1 |
| Armor forging | Found/bought is simpler. Forge stays focused on weapons. |
| Zone overworld map | Decree tells you where to go. No map needed V1. |
| Trinket crafting | Titles replaced trinkets. Revisit if titles feel thin. |

---

## 16. Open Questions

| Question | Status | Candidates |
|----------|--------|------------|
| Map generation algorithm | TBD — design | Hand-authored templates with random node assignment? Pure procedural? Hybrid? |
| How many nodes per map row | TBD — design | 2–3 feels right. More = wider choice but harder to balance exits. |
| Ambush trap chance on mine nodes | TBD — playtest | 10–20% feels fair. Higher on Hard/Perilous? |
| Forge Site QTE difficulty | TBD — playtest | Slightly harder than home forge (crappy anvil). Or same difficulty, just limited options? |
| Mystery node outcome weights | TBD — playtest | 50% positive / 30% neutral / 20% negative for Normal? Shift negative on higher tiers? |
| Equipment stat values | TBD — playtest | Start conservative. Easier to buff than nerf. |
| Title modifier values | TBD — playtest | Same — start conservative. |
| Safe pocket UI | TBD — design | Inline during loot moment? Dedicated pocket screen? |
| Forced extraction on row 1 flee — keep weapon? | TBD — design | Leaning yes (you fled, you kept your gear, just lost the day). |
| Can player enter a location without a weapon? | TBD — design | Fists as zero-cost baseline for scouting? Or require forged weapon? |
| How does difficulty tier affect map layout template? | TBD — design | Same templates with scaled numbers? Or structurally different maps? |
| Decree failure penalty | TBD — design | Just miss the reward? Reputation loss? Harder next decree? |