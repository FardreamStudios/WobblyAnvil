# Wobbly Anvil — In-Run Design Jam

## Purpose of this doc

Companion to `AdventureModeJam.md`, `WorldBuildingJam.md`, `ForgeSessionJam.md`, and `MetaProgressionJam.md`. The earlier docs defined the shape of a reign, the soul of the smith, the cozy time forge session, and the meta progression layer. This doc defines **what a reign feels like moment-to-moment** — the randomization layers, the in-run economy, the equipment system, and the factors that shape decisions during a reign.

No code. No spec. Jam transcript style. Reasoning preserved alongside decisions.

Read the four preceding docs first. This doc assumes their decisions are locked.

---

## The Framing Problem We Were Solving

Previous jams defined the *structure* of a reign (decrees, adventures, cozy time, meta unlocks) but left the *texture* undefined. When a player sits down to play a reign, what varies? What do they spend? What do they earn? What presses on them? How does role identity work in combat?

This jam answers those questions. It also adds systems the earlier docs hinted at but never locked: equipment as a role-defining layer, gold as in-run currency, a second permanent world figure (the mystical merchant), and the full randomization picture across three layers.

---

## Context — What Was Already Built

The director confirmed during the jam that two major systems already exist in prototype form:

- **The adventure map.** Slay the Spire–style node graphs. Each location generates a random node map per visit. Nodes carry location-specific content — enemies, events, rewards. Players choose their route from entry to the decree objective. Extract points exist — places to bail out of an adventure without completing the decree. Extraction is less punishing than dying but still costs the gains of the run you abandoned.
- **Combat.** Turn-based, QTE-driven (Clair Obscur style). Players can attack, use attack skills, use buff/debuff skills, and use consumables. Party members are archetypal and constant (excluding meta-unlocked NPCs and the fairy). Dying in an adventure fails the decree and loses items gained during that adventure — extraction-game style.

These systems are the baseline this jam builds on. They are not re-litigated here.

---

## Adventure-Side Identity — Weapon vs. Equipment

This was the most important clarification of the jam. The weapon and equipment define *two different things*:

> **Weapon defines playstyle (how you fight). Equipment defines role (what job you do in the party).**

A smith with a Dagger and heavy armor is a durable frontline fighter who strikes fast. A smith with the same Dagger and light armor is a glass cannon assassin. Same weapon. Completely different role.

**Why this separation matters:**

- The weapon is long-lived across the reign (per `ForgeSessionJam.md`). It has a slow, accumulating identity.
- Equipment is transient and swappable between decrees. It lets the smith flex into whatever the current decree and party composition need.
- The party has fixed archetypal roles. The smith needs to fit into the party's gaps. Equipment is how that fitting happens.
- Weapon identity comes from *investment*. Role identity comes from *context*.
- It answers a problem the earlier docs didn't name: if the party is fixed-role and the smith just carries a weapon, the smith was going to feel like a weapon-shaped hole in the party. Now the smith has a role too, picked per decree.

Equipment is the per-decree tactical layer. Weapon is the per-reign strategic layer. Both matter. Neither replaces the other.

---

## The Equipment System

### The Four Equipment Categories

| Category | What It Is | What It Does |
|---|---|---|
| **Armor** | Body protection (heavy, medium, light) | Defines combat role via HP and armor skill |
| **Trinkets** | Small worn items | Build-specific twists and synergies |
| **Utility Items** | Tactical consumables | Situational clever tools |
| **Heals** | Recovery consumables | The panic button |

All four are **transient per run** — lost when the reign ends, lost when an adventure death occurs (extraction rules). None are upgradable. They are what they are when found.

### Armor — Two-Layer Design

Every armor piece has two layers of effect:

| Layer | What It Is | Purpose |
|---|---|---|
| **HP Bonus** | A flat HP increase scaled to armor class | The survivability math |
| **Armor Skill** | A class-defined active combat ability usable during combat | The tactical identity |

The HP bonus provides the legible survivability difference between classes. The armor skill is the load-bearing part — it adds a tactical choice to every combat turn. The player's turn becomes: attack, attack skill, item, **or armor skill**. Four choices per turn, one of them tied to the role they equipped this decree.

This is what makes armor an *active participant* in combat instead of a passive stat block.

### The Three Armor Classes

| Class | HP Bonus | Skill Flavor | Combat Feel |
|---|---|---|---|
| **Heavy** | High | Protective / disruptive | "Nothing gets past me." |
| **Medium** | Moderate | Versatile / bridging | "I can do a bit of everything." |
| **Light** | Low | Evasive / opportunistic | "They can't hit what's not there." |

**Example armor skills (illustrative only, not committed):**

- Heavy: "Bulwark" — intercept next hit against an ally. "Stagger Slam" — push an enemy's next action later in the turn order.
- Medium: "Rally" — small party buff. "Brace" — reduce incoming damage this turn, counterattack on block.
- Light: "Slip" — dodge the next incoming attack. "Flicker" — take an extra action this turn.

The common shape: every armor skill is *tactical* (positioning, control, defense, action economy), not offensive damage. Weapon skills handle offense. Armor skills handle everything else.

### Individual Armor Pieces Vary Within a Class

A class defines the role. Individual armor pieces within that class carry specific skills that live within the class's skill flavor. So all heavy armor feels heavy — but *this* breastplate gives Bulwark while *that* one gives Stagger Slam. Same role, different tool.

This gives armor variety without breaking role legibility.

### The Weapon Skills vs. Armor Skills Separation Rule

> Weapon skills are offensive. They do damage, combo, crit, apply damage-over-time, exploit weaknesses.
>
> Armor skills are tactical. They control position, protect allies, disrupt enemy turns, manipulate action economy.

This rule keeps the two equipment layers from competing. A player who optimizes their weapon is building damage. A player who optimizes their armor is building tactics. Neither dominates the other.

### Trinkets — The Synergy Layer

Trinkets are the weird, build-specific, interaction-heavy layer of equipment. They do things armor and weapons can't.

- **Build synergies.** "Whenever you deal fire damage, +X." "Marked enemies take bonus crit from daggers."
- **Out-of-combat effects.** "More gold from chests." "Chance to find an extra material."
- **Meta-weird stuff.** "Trade a consumable for an extra skill charge." "Your lowest-HP ally deals bonus damage."
- **Rare one-off effects** the game hides as discoveries.

Trinkets are where equipment earns its reputation for strangeness. They do not define role — armor does. They warp the role into something specific.

**Rule:** trinkets should never substitute for the weapon's Spirit layer. Spirit is the weapon's synergy home. Trinkets are *external* synergy — they interact with the weapon from outside. This keeps the weapon's identity intact.

### Utility Items and Heals

Two categories of consumables:

| Type | Purpose | Example (illustrative) |
|---|---|---|
| **Heals** | The panic button — recover HP, cleanse conditions | Healing potion, antidote, revive |
| **Utility** | The clever button — tactical options that interact with the build | Mark potion, skill-charge restore, damage-type shift for one turn |

Heals are about survival. Utility is about optimization. Both are spent on use, lost on death.

### Enemy Resistances, Not Player Resistances

Player-side damage-type resistances were deliberately skipped. Enemies, however, have resistances.

**Why:**

- Enemy resistances are *information* — a puzzle the player reads and solves through tactics.
- Player resistances are *inventory management* — "swap to fire armor for this decree." That's the micromanagement the earlier docs wanted to avoid.
- Committing to a build should require solving problems through skill and tactics, not through swapping gear.
- Enemy resistances give locations mechanical identity. Swamp enemies resist poison. Ice enemies resist cold. Players learn a location vocabulary the same way they learn the forging vocabulary.

If damage-type resistance needs to exist player-side at all, it lives on specific trinkets as a specialist choice — never on armor, never baseline.

---

## The Mystical Merchant

A second permanent figure in the world, joining the fairy.

### Who She Is

- A recurring rare visitor who carries equipment, trinkets, and utility items the player has previously discovered
- She is not a party member
- She is not an NPC meta unlock — she exists in the world from the beginning
- Her inventory depth grows with the player's equipment discovery pool
- Running into her is itself a small event — players come to look forward to her visits

### How She Works

| Element | Behavior |
|---|---|
| **Appearance** | Random chance per reign, weighted by the size of the player's discovered equipment pool. |
| **Inventory roll** | Rolls 3–5 items from the player's discovered pool each time she appears. Not everything is available every time. |
| **Location** | Sometimes visits the forge, sometimes appears at the market, sometimes appears as a hidden node in an adventure. |
| **Currency** | Gold. Priced to matter but not to be unaffordable. |
| **First discovery constraint** | She only sells things the player has already discovered in the wild. First finds always happen on real adventures, through real moments. |

### Why She Works Structurally

- She makes the equipment meta pool *feel like progression* without needing a UI track — her inventory literally reflects it.
- She preserves discovery as the source of unlocks. You can never buy something you haven't found. She is a memory merchant.
- She creates a reason to visit the market beyond forge business. Players start checking the market in case she's there.
- She replaces the drop-weighting loadout slot that was proposed earlier in the jam. The merchant fills the "I want specific things sometimes" use case more elegantly, so drop weighting was cut.
- She scales with player depth. A new player rarely sees her. A veteran with a deep equipment pool sees her more often and with a richer inventory. The long tail rewards itself.

### Relationship to the Fairy

Both the fairy and the merchant are permanent world figures. Both are mysterious. Both transcend individual reigns. They fill different roles:

- **The fairy** is your forge companion. Always at the forge, always in the party. Secretly Hephaestus.
- **The merchant** is a passing figure. Seen sometimes, never owned. What she is remains an open worldbuilding question.

The symmetry is nice — one figure is the constant intimate presence, the other is the rare treasured visit.

---

## In-Run Randomization — Three Layers

Randomization happens at three layers, each with a distinct purpose and different player visibility.

| Layer | When It Rolls | Purpose |
|---|---|---|
| **Reign Layer** | Once at reign start | Sets the flavor of the entire run |
| **Decree Layer** | Once per decree | Sets what this specific mission is |
| **Encounter Layer** | Inside an adventure | Sets what happens at individual nodes |

### Reign Layer Randomization

Rolled once when a reign begins. These define "what kind of reign is this?"

| Element | What Rolls |
|---|---|
| **The King** | Which king you serve, which temper they have |
| **Decree pool weighting** | What kinds of decrees this king tends to issue |
| **Loadout context** | Which of your unlocked forms, upgrades, and themes are available for the loadout screen |
| **Starting materials** | Small roll on what's in the forge at reign start |
| **NPC circulation** | Which unlocked NPCs are "active" this reign |
| **Merchant baseline odds** | Whether she's weighted to appear often or rarely this reign |

The reign layer is the lowest-visibility roll. The player doesn't see most of it directly — they experience it as flavor.

### Decree Layer Randomization

Rolled when a new decree is issued during a reign. These define the next tactical mission.

| Element | What Rolls |
|---|---|
| **Location assignment** | Which unlocked location the king sends you to |
| **Objective** | Kill, retrieve, escort, survive, etc. |
| **Decree stakes** | What failure costs, what success earns |
| **Hour budget** | How much cozy time before the decree is due |
| **Reward preview** | What the reward options could be (visible if Master's Eye equipped) |

The decree layer is the most player-visible roll — the player reads each decree and plans around it. Each decree is a mini-loop.

### Encounter Layer Randomization

Rolled inside an adventure as the player explores a location's node map. This is where moment-to-moment tension lives.

| Element | What Rolls |
|---|---|
| **Node map layout** | The graph from entry to goal |
| **Node types** | Combat, event, rest, shop, extract, mystery |
| **Node contents** | Specific enemies, specific events, specific drops |
| **Route choices** | Which paths are safer, riskier, or have extract points |
| **Extract point placement** | Where on the map you can bail |
| **Drops** | Materials, equipment, gold, consumables, rare finds |

The encounter layer is the extraction-game layer. Every drop is contingent — yours if you extract or complete, lost if you die. This is where push-or-bail decisions live.

### How Meta Unlocks Influence Randomization

Meta unlocks never *remove* randomness. They expand pools and weight outcomes.

| Meta Track | Effect on Randomization |
|---|---|
| **Forms** | Expands loadout-time choice; no adventure effect |
| **Forge Upgrades** | Some change what rolls or what you see (Master's Eye, etc.) |
| **Spirit Themes** | Weight spirit-related pool rolls toward the chosen theme |
| **NPCs** | Added to the reign-layer and encounter-layer pools |
| **Locations** | Added to the decree-layer pool |
| **Equipment** | Added to the encounter-layer drop pool and merchant inventory |

A veteran's dice come from a bigger bag. The dice still roll.

### The Governing Rule

> Randomization serves decision-making, not surprise. Every roll should produce a situation the player has to think about, not just react to.

A random enemy that's just "bigger numbers" is noise. A random decree that changes the player's whole forging plan is signal. Rolls should reshape decisions, not just vary textures.

---

## The In-Run Economy — Five Resources, Three Economies

The game has five in-run resources. They group into three economic types based on how they behave.

### The Five Resources

| Resource | What It Is | Where It's Spent | Contingent? |
|---|---|---|---|
| **Hours** | Cozy time budget | Forge actions, market visits | No — fixed per window |
| **Reputation** | The king's patience | Failed decrees | No — permanent loss |
| **Materials** | Weapon fuel | Forging into Core | **Yes** — contingent in adventures |
| **Equipment** | Armor, trinkets, utility, heals | Worn and used in adventures | **Yes** — contingent in adventures |
| **Gold** | Flexible currency | Market, merchant, shops | Mostly no — mostly banked as earned |

### The Three Economies

| Economy | What It Is | Resources | Shape |
|---|---|---|---|
| **Time economy** | What you can do in cozy time | Hours | Budget-based. Deliberate spending. |
| **Risk economy** | What you stand to lose | Reputation, Materials, Equipment | Extraction-based. Push or bail. |
| **Commerce economy** | What you can buy | Gold | Flexible. Fills gaps, bridges needs. |

Each economy has a different feel and a different decision pressure.

### Gold — The Load-Bearing New Resource

Gold is the new addition from this jam. It is the flexible currency the player accumulates during a reign and spends at markets, shops, and the mystical merchant.

**What gold is for:**

- Buying common materials the player needed but didn't find
- Buying heals and utility consumables
- Buying equipment from the mystical merchant when she visits
- Giving failed adventures a consolation — you still got *some* gold from enemies before you bailed
- Giving cozy time micro-decisions shape — do I spend hours hammering or shopping?

**The governing rule for gold:**

> Gold fills gaps and bridges needs. It prevents the player from having to farm when they're one material short of a plan. It does not provide power. It lets you buy breadth, not depth.

This rule protects gold from becoming The Point of the game. Gold should never be the thing the player is chasing. It should be the thing that lets them *avoid being stuck* on a small missing piece.

**Specifics:**

- Common materials: buyable with gold
- Rare materials: not buyable — must be found
- Basic heals and utility items: buyable
- Rare or unique consumables: not buyable
- Equipment at the merchant: buyable, but only from your discovered pool
- No forge upgrades or meta unlocks buyable with gold, ever

**Why gold is mostly non-contingent:**

Unlike materials and equipment, gold the player earns during an adventure is mostly kept when they extract, and partially kept even if they die. The exact fraction is tuning, but the principle is: gold is the resource that survives failure best. This gives gold its role as the gap-filler and consolation currency — you can fail and still have *something* to work with next decree.

### Concerns About the Economy

- **Five resources is a lot.** Legibility risk. The prototype should test whether players can read all five without HUD clutter.
- **Gold can drift into power.** The "breadth, not depth" rule is the whole ballgame. If it drifts, every other system suffers.
- **Material drops must stay valuable.** If gold buys common materials, material drops must feel rewarding enough that finding one still matters. Rares being drop-only helps — common material drops should feel like gold-plus-a-save.
- **Reputation is unusual.** It's a resource the player can't spend deliberately — only lose. That's intentional but needs to feel *heavy* every time it ticks down.

---

## In-Run Factors — What Shapes Decisions

The pressures that shape how a reign plays out.

### The Major Factors

| Factor | What It Does |
|---|---|
| **Reputation** | The mortality timer. Every failed decree hurts. Zero ends the run. |
| **King's temper** | Varies per reign. Patient kings forgive more. Cruel kings punish harder. Desperate kings escalate faster. |
| **Hour budget** | Per-decree cozy time limit. The forge preparation clock. |
| **Decree stakes** | What each specific decree costs to fail or earns to succeed. |
| **Weapon state** | Current Quality, Condition, Core content, Form tier, Spirit bindings. The player's current capability. |
| **Party composition** | What gaps the current party has. Influences armor / equipment role selection. |
| **Location tier** | Heartland vs. Frontier vs. Edge vs. Beyond. Escalation through location unlocks. |
| **Route choices** | Inside adventures, path selection shapes risk and reward. |
| **Extract decisions** | Push for more or bail now. The contingent-earnings tension. |

### The Pressure Arc of a Reign

A reign has an arc shape, not a flat plateau:

1. **Opening (audition).** King is testing you. Decrees are small. Reputation loss from failure is heavier *emotionally* because you're trying to prove yourself. Weapon is weak. Equipment pool is thin.
2. **Mid-reign (trust).** Decrees escalate. The weapon is becoming something. The player has tools. Reputation losses hurt but are survivable. This is the peak sweet spot.
3. **Late-reign (strain).** The king pushes harder. Locations get stranger. The player has a dense weapon and strong equipment but decrees are brutal. The pressure is now mechanical, not emotional. You're good but the demands are bigger than your ceiling.
4. **End (failure or survival).** Either you survive the king's final demands — which escalates into the next tier of location unlocks — or reputation hits zero and the reign ends.

This arc should emerge from the systems, not be scripted. Difficulty scales via locations. Reputation drains via failures. The king's temper modulates the curve. The weapon's growing power fights the decree's growing demands, and whichever wins decides the reign.

### How Factors Interact

The factors aren't independent. The decisions they force pull against each other:

- A cruel king means reputation losses cost more — play safer. But safer means weaker forging — weaker weapons mean more failures — more reputation losses.
- A tight hour budget means less forge time — pick upgrades that increase forge efficiency. But that means fewer slots for discovery-focused upgrades — less interesting reigns.
- A dangerous location offers rare drops — push deeper. But pushing deeper risks death — lose everything. Extract early and get less but keep it.
- A fragile light-armor build is tactical and powerful — but one mistake is dead. Heavy is safer but less damage.

The game is the interaction. No single factor dominates.

---

## The Full Updated Meta Picture

With equipment added, there are now six meta tracks:

| Track | Type | Unlock Source | Per-Reign Role |
|---|---|---|---|
| **Forms** | Loadout pick | In-run mastery | What you can forge |
| **Forge Upgrades** | Loadout pick | Reign milestones | How you forge |
| **Spirit Themes** | Loadout pick | Spirit encounters | What spirits you'll find |
| **NPCs** | Emergent | Encounter actions | Who joins you |
| **Locations** | Emergent | In-run discovery | Where you go |
| **Equipment Pool** | Emergent (via merchant + drops) | First-time discovery | What items you'll find |

Three loadout picks, three emergent tracks. Symmetrical.

And two permanent world figures:

- **The Fairy** — forge companion, party mage/healer, secretly Hephaestus
- **The Mystical Merchant** — equipment memory made flesh, appears sometimes with previously-discovered items

---

## What This Jam Adds to the Design

Pulling back — what this doc gives us that we didn't have before:

- **A clear separation between weapon and equipment.** Weapon = playstyle. Equipment = role. Two decisions, two layers, no overlap.
- **An active combat role for armor.** Armor skills make every turn a four-choice decision. Role identity is expressed every combat round, not just in loadout numbers.
- **A complete in-run economy.** Five resources across three economies (time, risk, commerce). Each has a distinct purpose.
- **Gold with a governing rule.** Bridges gaps, fills needs, never provides power. Prevents farming without trivializing decisions.
- **A second permanent figure.** The mystical merchant joins the fairy as a long-lived world presence. Equipment meta progression has a face.
- **The randomization engine, mapped.** Three layers, with clear separation of what rolls at reign / decree / encounter time.
- **Enemy resistances as location vocabulary.** Player-side resistances skipped to avoid inventory chore. Enemy resistances kept as tactical information.
- **The cut drop-weighting slot.** The mystical merchant makes it unnecessary. Simpler loadout, cleaner design.

---

## Open Questions

Things touched on but not fully locked.

1. **Specific armor skill list.** Only flavors were sketched. The actual skills per class and per piece need design.
2. **Gold drop rates and prices.** The gap-filler rule is set. The numbers aren't.
3. **Merchant appearance frequency.** "Rare but meaningful" is the rule. The exact rate needs playtesting.
4. **Reputation loss granularity.** Fixed per failure? Scaled by decree stakes? By king's temper? Unclear.
5. **Non-contingent gold fraction on death.** The principle says gold survives failure better than other resources. The exact percentage is open.
6. **Extract penalties.** Less punishing than death, more than completing — but what specifically is lost on extract? Open.
7. **Party role scaling with reign progression.** Party members are archetypal and constant, but the earlier docs flagged scaling as an open question. Still open.
8. **How armor skill tuning interacts with existing combat system.** Skill costs, cooldowns, charges, turn-economy rules depend on the combat system already built. Needs integration check.
9. **Rare utility items as discoveries.** Can rare consumables be in the equipment meta pool too, or are they separate? Lean: yes, same pool, but open.
10. **Merchant's narrative identity.** Who she is, why she has the player's memories, whether she's connected to the fairy in any way. Pure worldbuilding debt.

---

## What This Doc Does Not Cover

Flagged for future work.

- **The specific content catalogs.** Full lists of armor pieces, trinkets, utility items, heals, and their effects. Prototype-driven.
- **The exact node type inventory.** Which node types exist on maps and what they contain. Partially built already, partially open.
- **Extract point design.** Where they appear, how often, how visible, what they cost.
- **The king's temper as a system.** Named as a factor, not yet mechanized.
- **Party member scaling.** Acknowledged as open, not solved here.
- **Gold tuning.** Drop rates, prices, economy balance.
- **Combat rebalancing for armor skills.** The existing combat system predates this jam and needs an integration pass.
- **UI design.** Inventory, equipment slots, HUD layout, merchant interaction screens.

---

## Summary of Locked Decisions

For quick reference:

- Weapon defines playstyle. Equipment defines role.
- Equipment has four categories: armor, trinkets, utility items, heals.
- All equipment is transient per run. None upgradable.
- Armor has two layers: HP bonus and armor skill.
- Armor skills are tactical (positioning, control, defense, action economy) — never pure damage.
- Weapon skills remain offensive. Lanes are separate.
- Three armor classes: Heavy, Medium, Light.
- Individual armor pieces carry specific skills within their class flavor.
- Trinkets are the synergy layer — build-specific, weird, interaction-heavy.
- Trinkets never substitute for the weapon's Spirit layer.
- No player-side damage resistances. Enemies have resistances.
- Randomization has three layers: Reign, Decree, Encounter.
- Meta unlocks expand and weight randomization pools, never remove randomness.
- Five in-run resources: Hours, Reputation, Materials, Equipment, Gold.
- Three in-run economies: Time, Risk, Commerce.
- Gold fills gaps and bridges needs. Gold buys breadth, not depth.
- Common materials and basic consumables are gold-buyable. Rares are not.
- Gold is mostly non-contingent — survives failure better than other resources.
- The mystical merchant is a permanent world figure, not an NPC meta unlock.
- The merchant only sells items the player has previously discovered.
- The drop-weighting loadout slot is cut. The merchant replaces it.
- Equipment Pool is the sixth meta track (emergent, through discovery + merchant).
- Reign has an arc shape: audition → trust → strain → end.
- Factors interact: no single pressure dominates.