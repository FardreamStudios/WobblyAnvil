# Wobbly Anvil — Meta Progression & Weapon Jam

## Purpose of this doc

Companion to `AdventureModeJam.md`, `WorldBuildingJam.md`, and `ForgeSessionJam.md`. Adventure Mode defined the *structure* of a reign. Worldbuilding defined the *soul* of the smith and their world. Forge Session defined the *cozy time window* and the shape of a forge session. This doc defines **what a weapon is** and **how meta progression works across reigns** — what you earn in a run, what persists, and what choices you make at the start of the next reign.

No code. No spec. Jam transcript style, so the reasoning survives alongside the decisions.

Read the three preceding docs first. This doc assumes their decisions are locked.

---

## The Framing Problem We Were Solving

The earlier docs committed to big-picture ideas — loadouts, decree rewards, the signature verb, cozy time — but left two foundational questions open:

1. **What is a weapon structurally?** The Forge Session doc kept referring to a "weapon schema" with "named parts" but never defined it. Without this, craft verbs like Combine have nothing to target.
2. **What does meta progression actually look like?** Forge Upgrades were named in Adventure Mode but never detailed. What do they do? How are they earned? What else persists between reigns besides them?

This doc answers both, shallowly enough to prototype against. The goal of this jam was not to design the systems perfectly. It was to **map how the pieces fit together** so prototyping can find the fun inside the frame.

---

## The Weapon — Locked Schema

### Weapons Are One-Reign Only

This was the first decision, and it simplifies everything downstream. **A weapon does not persist between reigns.** No "pattern" carries forward. No reduced-power legacy version. When the reign ends, the weapon is gone.

This resolves Open Question #1 from `AdventureModeJam.md`. The earlier doc's lean was toward legacy patterns; we reversed it. Clean slate every reign.

**Why clean slate:**

- It preserves the pressure fantasy at full strength. Losing the weapon means losing *the thing that made you capable*, as described in the Worldbuilding doc.
- It forces meta progression to live entirely in other tracks, which gave us the room to design those tracks properly.
- It keeps the weapon as the centerpiece of the reign's arc, not a collectible.
- It simplifies prototyping — no persistence system to build.

### The Three Zones

A weapon has three structural zones. Every craft verb, every material, every enchantment, every spirit acts on one of them.

| Zone | What It Is | What It Contributes |
|---|---|---|
| **Core** | The materials the weapon is built from | Persistent stat bumps, per-hit effects, base properties. Multiple materials can be combined. |
| **Form** | The archetype and its current refinement tier | Playstyle, attack skills, the weapon's identity shape. Forms refine *within* their archetype — rough to realized. |
| **Spirit** | The big-ticket synergy layer | Extra attack skills, combat functionality, the slot where interesting builds emerge. Can do almost anything. |

### Top-Level Weapon Properties

Independent of zones, every weapon has these combat properties:

| Property | What It Is | Source |
|---|---|---|
| **Damage** | Base hit value | Form + Core |
| **Damage Type** | Physical, fire, etc. | Core, Spirit |
| **Keen-ness** | Critical hit aspect | Core, Spirit |
| **Quality** | Performance multiplier | Hammer QTE (forging) |
| **Condition / Sharpness** | Upkeep multiplier | Hammer QTE (tempering) |

**Quality and Condition are multipliers, never identity.** They come from the Hammer Layer described in `ForgeSessionJam.md`. They affect how well the weapon performs, never what it *is*. This keeps the Craft Determinism Rule intact — skill expression lives in multipliers, craft decisions stay safe.

### How the Zones Work

**Core — stackable materials.**

- Multiple core materials can be combined into one weapon
- Each material contributes something specific (a stat bump, a damage type, a per-hit effect, a property)
- This is where most of the Combine verb's action lives early-to-mid reign
- Core capacity can be raised by forge upgrades (hold 3 materials instead of 2)

**Form — archetype with refinement tiers.**

- Form is an archetype (sword, hammer, dagger, etc.) plus a refinement state
- The starting form is the **rough version** — basic playstyle, basic attack skills, recognizable but plain
- As the weapon is worked, form **refines within its archetype** — same archetype, new parts unlock, identity sharpens
- Late-reign form is where the weapon's identity **really comes out** — still technically the same archetype, but it has become a specific named thing
- Form carries the attack skills of the weapon. Refinement adds new ones.

**Spirit — the synergy layer.**

- Big-ticket additions only, not small buffs
- Can add new attack skills
- Can add new combat functionality we invent during prototyping
- This is where builds *click* — where two things combine to create something neither could do alone
- Intentionally open-ended — Spirit is the "anything interesting" slot

### Example Schema (Illustrative Only, Not Committed Content)

**Three example forms, showing refinement tiers:**

| Archetype | Rough | Refined | Realized |
|---|---|---|---|
| **Sword** | Iron Sword (Slash, Thrust) | Duelist's Blade (+Riposte) | Singing Edge (+Dance of Cuts) |
| **Hammer** | Smith's Hammer (Crush, Overhead) | War Maul (+Ground Slam) | Earthshaker (+Quake) |
| **Dagger** | Belt Knife (Stab, Slice) | Shadow Fang (+Backstab) | Whisperblade (+Killing Breath) |

**Example core materials:**

| Material | Contribution |
|---|---|
| Iron | +Damage, +Durability — the reliable baseline |
| Dragonbone | +Keen-ness, fire damage type |
| Moonsilver | +Damage vs. magical enemies, holds enchantments longer |
| Bone Marrow | Slow bleed per hit |

**Example spirits:**

| Spirit | Effect |
|---|---|
| Ember Ghost | New attack skill: Flame Lash. Every 3rd hit burns. |
| Hunter's Echo | New attack skill: Mark. Marked enemies take bonus crit. |
| Whisper of the Unmade | Attacks ignore armor, attack skills cost nothing |

These are sketches, not content. They exist to show the shape of the schema. The real content will emerge from prototyping.

### What's Intentionally Left Fuzzy

- Exact list of damage types
- Default core capacity (how many materials a weapon holds without upgrades)
- Exact triggers for form refinement (milestones? player choice? specific inputs?)
- The full behavior space of Spirit
- Quality and Condition multiplier math
- Named sub-parts inside zones (edge, haft, guard, etc.) — not needed yet

All of this is prototype-discoverable. We did not design it because we did not need to yet.

---

## Meta Progression — The Five Tracks

Meta progression has five tracks. Three are loadout picks made before a reign starts. Two are emergent — unlocked through play and surfacing in the world without the player equipping them.

### Track 1 — Forms (Loadout Pick)

- **What it is:** Which weapon archetypes you can forge this reign.
- **How it's earned:** In-run mastery — completing decrees with specific weapons, reaching a form's Realized tier, or other weapon-focused achievements.
- **How it's picked:** The player selects 1–2 forms at the loadout screen before the reign begins.
- **What it feels like:** "What am I building this reign?"
- **Starting state:** Players begin with a small starting pool (likely 2 forms). The rest are earned.

Forms are meta currency for *identity*. Unlocking a new form opens a whole new playstyle — not a stat increase, an entire way to play.

### Track 2 — Forge Upgrades (Loadout Pick)

- **What it is:** Workshop capabilities that change what you can do at the forge.
- **How it's earned:** Reign milestones — surviving a number of decrees, hitting king-trust thresholds, achieving specific forge accomplishments, dying in meaningful ways.
- **How it's picked:** The player selects 3–5 upgrades at the loadout screen from their unlocked pool.
- **What it feels like:** "How am I building this reign?"
- **Governing rule:** Upgrades change *what is possible*, not *how hard you hit*. Ceiling raises are acceptable. Flat power bonuses are not.

**Example upgrades (illustrative only):**

| Upgrade | What It Lets You Do | Why It's Not Flat Power |
|---|---|---|
| **Second Anvil** | Work on two weapons in parallel | Trades hours for options. Doesn't strengthen any single weapon. |
| **Master's Eye** | See decree rewards before accepting the decree | Information, not damage. |
| **Deep Crucible** | Combine 3 core materials at once instead of 2 | Raises a ceiling. Doesn't auto-strengthen weapons. |
| **Patience of Stone** | Break-and-Rebuild refunds 50% of materials | Changes the risk profile of experimentation. |
| **Fairy's Whispers** | She gives you one material interaction hint per reign | Accelerates vocabulary learning. Pure information. |

Every upgrade must have a *role*, not a power level. If the upgrade can be written as a percentage, it is a bad upgrade.

### Track 3 — Spirit Themes (Loadout Pick)

- **What it is:** A thematic weighting of which spirits show up more often in this reign's decree rewards and encounters.
- **How it's earned:** Binding a new category of spirit during a reign unlocks that theme for future reigns.
- **How it's picked:** The player selects 1–2 themes at the loadout screen.
- **What it feels like:** "What will I find this reign?"
- **How it works:** Themes *weight* the pool, they do not guarantee specific spirits. Discovery is preserved. A Fire Path theme means fire spirits appear more often — it does not tell you which ones.

**Why pool themes instead of seeded spirits:** Seeding specific spirits would flatten discovery. Weighting the pool keeps every reign different while letting the player lean toward a flavor.

**The circular unlock problem:** You unlock themes by encountering spirits, but themes make those encounters more likely. Solution: baseline random encounters always exist. Themes amplify. Your first-ever fire spirit encounter is random luck; after that, the theme makes it reliable.

### Track 4 — NPCs (Emergent)

- **What it is:** Recurring characters who may appear in future reigns after you first meet them.
- **How it's earned:** Specific actions during encounters — helping them, sparing them, completing their requests, choosing them over a reward.
- **How it's surfaced:** Not a loadout pick. Once unlocked, they enter a pool of NPCs who *may* appear in future reigns, weighted by context.
- **What it feels like:** "Who will I meet this reign?"

**Why non-slotted:** The magic of NPC unlocks is that they are not a choice. They are a face showing up unannounced mid-adventure. That is a more powerful feeling than any loadout pick can produce — you cannot farm it, cannot predict it, cannot buy it. The world remembers you, and the evidence is a person.

**Rules:**

- Recurring is not permanent. Only the fairy is always there. NPCs appear sometimes, not always.
- Some NPCs can fill party roles when they appear. Others might be forge visitors, merchants, quest-givers. The exact scope is a later design problem.
- Start small. 3–5 NPCs for v1 prototyping.

### Track 5 — Locations (Emergent)

- **What it is:** New places the king may send you to for decrees and adventures.
- **How it's earned:** In-run discovery — a dying enemy's homeland, a rescued NPC's origin, a map fragment, a rumor, a hint from another NPC.
- **How it's surfaced:** Not a loadout pick. Unlocked locations enter a pool; the king decides where to send you each decree. The player does not pick destinations.
- **What it feels like:** "Where will I go this reign?"

**Locations are the difficulty scaling lane.** This is a load-bearing decision and deserves its own section.

---

## Locations as the Difficulty Scaling Lane

Every meta track scales by *variety* — more forms, more upgrades, more themes, more NPCs. **Locations scale by *stakes*.** This is a deliberate asymmetry and it replaces traditional difficulty scaling entirely.

### The Scaling Shape

| Tier | Feel | When Unlocked | What They Carry |
|---|---|---|---|
| **Heartland** | Safe, familiar, the king's trust zone | Starting pool | Common materials, teaching enemies, legible terrain |
| **Frontier** | Variety, real threats | Early unlocks | Uncommon materials, harder enemies, new hazards |
| **Edge** | Strange, cursed, dangerous | Mid-to-late unlocks | Rare materials, strange enemies, location-specific spirits |
| **Beyond** | Places the king shouldn't know about | Deep late-game | Alchemical territory. Iron is no longer enough here. |

### What This Replaces

- **No Ascension tiers.** This answers `AdventureModeJam.md`'s Open Question #3. We do not need Slay the Spire-style difficulty modes. The world itself escalates.
- **No stat inflation.** Harder locations are not "same enemies with more HP." They are different places with different rules, different creatures, different materials.
- **No New Game+.** A veteran is not replaying the game harder — they are playing in a world a new player has not seen yet.
- **No difficulty toggles.** Access to harder content is earned, not selected.

### Why This Works

- **Difficulty has a face.** The king sending you somewhere new is a narrative beat. The player feels the stakes rising because the *place* feels different, not because a number went up.
- **Alchemical smithing gets a home.** Strange materials come from strange places. Late-reign weapons can only exist because late-reign locations exist. The two unlock systems align invisibly.
- **Endless content lane.** New locations can be added forever without touching any other system. Six months from now, three new locations ship and the game has more late-game content. No retooling.
- **The fairy has something to say.** She has been to the Edge before with other prodigies. Most of them did not come back. That commentary lands *because* the location is genuinely dangerous, not because a difficulty slider moved.

### The Important Rule

**When the king sends you to a harder location for the first time, it must be a narrative beat, not a silent one.** The player should feel: *the king has never sent you there before*. This is the moment the reign changes shape. A silent tier transition wastes the system.

---

## The Full Meta Progression Picture

Pulling all five tracks together:

| Track | Type | Unlock Source | Per-Reign Role | Scales By |
|---|---|---|---|---|
| **Forms** | Loadout pick | In-run mastery | What you can forge | Adding more archetypes |
| **Forge Upgrades** | Loadout pick | Reign milestones | How you forge | Adding more capabilities |
| **Spirit Themes** | Loadout pick | Spirit encounters | What you'll find | Adding more themes |
| **NPCs** | Emergent | Encounter actions | Who joins you | Adding more characters |
| **Locations** | Emergent | In-run discovery | Where you go | **Adding harder tiers** |

Five tracks. Three are loadout picks at the start of a reign. Two are emergent and surface in the world without player input. Each one answers a different question. None overlap in what they do.

---

## Why No Meta Currency

This was an explicit decision and deserves its own section, because most roguelites *do* have meta currency and the choice to skip it shapes the whole game.

### What Currency Would Have Given Us

- Guaranteed progress on every run
- Player-directed unlock order
- A pity system for bad runs
- Decoupling of unlocks from skill

Those are real benefits. The decision to skip currency was made with full awareness of what we were giving up.

### Why We Skipped It Anyway

- **Discovery-driven unlocks die when currency exists.** If players can buy the Fire Theme, then encountering a fire spirit and earning it through the experience becomes the slow dumb path. Currency flattens "I earned this" into "I bought this."
- **Currency turns the fairy into a shopkeeper.** The worldbuilding of her collected upgrades — patient work across generations — cannot survive a price tag. She is not selling. She is *lending*.
- **Currency grind is the worst failure mode.** Players stop playing to play and start playing to farm. This kills the pressure fantasy. A reign you are grinding is not a reign you are inhabiting.
- **We already have a pity system.** The king audition framing means early reigns are *supposed* to be small. A rough first reign is not a failure the player needs compensated for — it is the intended opening act.
- **The whole game is about earning things through doing.** Currency is the opposite of that. Every other system in this game rewards presence and action. Currency would contradict the tone we built.

### The Safeguards That Replace Currency

For "no currency" to work, a few rules must hold:

1. **Every reign must unlock at least one thing.** Baseline guarantee. Even a terrible reign gives you something small — a theme glimpse, a minor upgrade, a partial form. Dying to Decree 1 still moves you forward.
2. **Unlock triggers must be visible and varied.** Players need to see "I could unlock this by doing X" — with many X's, so there is always something reachable.
3. **Promotion is earned through the act, not repetition.** First time you bind a fire spirit unlocks the theme. Not "bind 10 fire spirits."
4. **No hidden unlocks for first-time players.** Mystery unlocks are great for second-playthrough depth. First playthrough needs transparency.

If those rules hold, currency is unnecessary.

### The Reversal Condition

If prototyping shows that unlock triggers fire too rarely, or that players feel runs are "wasted" when they miss specific milestones, a minimal currency system could be bolted on later. We are designing to avoid needing it, not forbidding it forever.

---

## The Loop, End to End

What this all gives us, as a flow:

1. **Loadout.** Before the reign, the player picks 1–2 Forms, 3–5 Forge Upgrades, 1–2 Spirit Themes from their unlocked pools. NPCs and Locations are not picked — they exist in the world now, waiting.
2. **Reign begins.** The king issues the first decree. The location is chosen from the unlocked pool. Early decrees are small (king audition phase).
3. **Forge session.** The player advances their weapon using the tools their loadout enabled. Forms they equipped are buildable. Upgrades they equipped are available. Spirit theme weights are active.
4. **Adventure.** The party includes the fairy (always) and rotates through the available NPC pool (some unlocked, some native to the reign). The location's enemies and terrain test the weapon. NPCs may be met and remembered.
5. **Return.** Decree reward chosen. Weapon tempered, enchanted, combined further. Next decree arrives.
6. **Meta promotion happens quietly during the reign.** New forms earned through mastery, new upgrades through milestones, new themes through encounters, new NPCs through actions, new locations through discovery. The player sees them unlock at reign-end.
7. **Reign ends.** Weapon lost. Materials, techniques, enchantments lost. **Everything promoted to meta is kept.** The unlocked pool grows.
8. **Next reign.** Loadout screen has more options. The world has more places and faces. The player picks differently. The fairy notices.

This is the entire machine.

---

## What This Unlocks for Future Design

Pulling back — here is what this doc gives us that we did not have before:

- **A weapon schema that is shallow enough to prototype and deep enough to grow.** Three zones, multipliers on top, room for content to accumulate without restructuring.
- **A complete meta progression picture that does not rely on currency.** Five tracks, each answering a different question, each earned through doing.
- **A difficulty scaling solution that is invisible to the player.** Locations grow the world; the world grows harder naturally. No number ever has to go up for the player to see.
- **A design lane for non-slotted meta progression.** NPCs and Locations proved the category exists. Future sessions can add more things that live in this lane (places that remember you, recurring enemies, shifting court politics) without breaking the loadout system.
- **Five separate unlock triggers feeding five separate meta tracks.** Players with different playstyles will naturally unlock different things first. That produces variety in *how players grow*, not just *what they have*.
- **A reason for every reign to matter.** Even a failed reign promotes something. Even a successful reign leaves the weapon behind. Every run is both a loss and a gain.

---

## Non-Slotted Meta as a Design Lane

One principle worth naming explicitly because it is new to the project:

**Some meta progression should live in the world, not the loadout screen.** NPCs and Locations are the first two things in this lane. The lane is valuable because it produces the kind of meta progression you cannot farm and cannot predict — the kind that *happens to you* rather than being selected.

Future sessions may find more things that belong here. The general shape of a non-slotted meta unlock is:

- It is earned through specific in-run actions
- Once earned, it exists in the world permanently
- It surfaces emergently in later reigns without player selection
- Its presence changes the texture of a reign rather than its numbers
- It is narratively coherent — there is a reason it returns

Candidates for later exploration (flagged, not designed): places that remember you, recurring enemies that got harder because you killed their kin, the king's court shifting across reigns, the fairy's long-term behavior patterns responding to prodigy behavior across generations.

This lane exists. We have two things in it. More can be added.

---

## Open Questions

Things we touched on but did not fully lock. These can be resolved in future sessions.

1. **Loadout slot counts.** Forms (1–2), Upgrades (3–5), Themes (1–2) — the ranges are rough. Exact numbers need playtesting.
2. **Starting pool sizes.** How many Forms / Upgrades / Themes does a brand-new player have access to in their first reign? Likely small (2 forms, a handful of upgrades, 1 theme) but not set.
3. **Form refinement triggers.** Does a form refine automatically when conditions are met? Does the player choose when to refine? Is refinement expensive in hours or materials? Unclear.
4. **Core capacity defaults.** How many materials can a base weapon hold before Forge Upgrades raise the ceiling? Likely 2, but untested.
5. **NPC scope.** Are NPCs strictly party members, or can they also be forge visitors, merchants, and quest-givers? Bigger scope gives more texture but more content cost.
6. **NPC appearance weighting.** Once unlocked, how often does an NPC actually show up? Too rare and unlocks feel worthless. Too frequent and the world feels small.
7. **Location selection authority.** The king picks where to send you, but how does the game decide? Random from unlocked pool? Weighted by reign progression? Responding to player actions? Unclear.
8. **Reign-end unlock surfacing.** We landed on reign-end summary for meta unlocks. Exact format of the summary screen is undefined.
9. **Interaction between Core materials.** The "forging vocabulary" — which materials react with which others — is still a promise, not a design. This is prototype work.
10. **How Forge Upgrades escalate ceilings without stacking into power creep.** If Deep Crucible (3 cores) exists, does Deeper Crucible (4 cores) exist? Where does the ceiling stop? Unclear.

---

## What This Doc Does Not Cover

Flagged for future jams. These are not open questions within this block — they are the next blocks of work.

- **The loadout screen itself.** What the player touches before a reign, how it is laid out, how it scales from a near-empty early player view to a deep veteran view. This is the next piece.
- **The Craft Layer atomic verbs.** Combine and Break-and-Rebuild need full mechanical definitions. This was flagged in `ForgeSessionJam.md` and remains flagged.
- **The Tempering mechanic.** Still unresolved. Sits somewhere between Craft and Hammer layers. Needs its own pass.
- **The specific content catalogs.** Full lists of forms, cores, spirits, upgrades, themes, NPCs, and locations. All of this is prototype-driven.
- **The Hammer QTE specifics.** Multiplier math, input pattern, per-session caps.
- **The unlock trigger catalog.** The exact list of what unlocks what, across all five meta tracks.
- **Reign-end summary screen design.** The UI and pacing of the moment where unlocks are revealed.

---

## Summary of Locked Decisions

For quick reference:

- Weapons are one-reign only. No pattern. No persistence.
- A weapon has three zones: Core, Form, Spirit.
- Weapons have top-level properties: Damage, Damage Type, Keen-ness, Quality, Condition.
- Quality and Condition are QTE-driven multipliers, never identity.
- Core is stackable materials. Form is archetype plus refinement tier. Spirit is the big-ticket synergy layer.
- Form refinement goes rough → refined → realized, within the same archetype.
- Meta progression has five tracks: Forms, Forge Upgrades, Spirit Themes, NPCs, Locations.
- Forms, Upgrades, and Themes are loadout picks. NPCs and Locations are emergent.
- Forge Upgrades change what is possible, never flat power. Ceiling raises are acceptable.
- Spirit Themes weight the encounter pool. They do not guarantee specific spirits.
- NPCs and Locations live in a new non-slotted meta lane.
- Locations are the designated difficulty scaling lane. No Ascension, no stat inflation, no New Game+.
- There is no meta currency. Discovery-driven unlocks replace it, with baseline-unlock safeguards.
- Every reign must unlock at least one thing.