# Wobbly Anvil — Adventure Mode Design Jam

## Purpose of this doc

This is a design brief, not a spec. It captures where we landed after a brainstorm on Adventure Mode and flags the open questions for the next conversation. No code, no implementation. Pure design.

---

## Core Fantasy

**Pressure fantasy + roguelite.**

You are a smith serving a king. The king issues decrees. You forge, you adventure, you return. The pressure never lets up. You survive as long as you can — there is no "winning" a reign, only going further.

The emotional pitch: *I'm forging the thing that will either save me or get me exiled, and every swing of the hammer has weight.*

---

## The Run Structure — A Reign

- **A run = a reign under one king.**
- A reign is a sequence of decrees. You survive as long as possible.
- No fixed length. The reign ends when you fail too many decrees, die in adventure, or lose the king's favor.
- On death: the reign is over. You keep some things, lose others (see progression tracks below).

**Why a reign?** A single decree is too short to carry roguelite systems. A full smith's career is too long and unfocused. A reign is the sweet spot — long enough to build something meaningful, short enough to lose it.

---

## Two Progression Tracks

The meta-game has two distinct layers with different rules:

| Track | What It Is | Persistence | Purpose |
|---|---|---|---|
| **Forge Upgrades** | Permanent workshop improvements | Stay between runs | Long-term meta-progression |
| **Decree Rewards** | Materials, enchantments, techniques | Run-only (lost on reign end) | Per-run variety and discovery |

This split mirrors Slay the Spire (permanent card pool unlocks vs. run-only relics/cards).

---

## Forge Upgrades — The Meta Layer

**The problem we were solving:** if every forge upgrade you unlock just stacks onto every future run, the game becomes monotonically easier and pressure fantasy dies.

**The solution: Loadout system.**

- You own many forge upgrades over time (unlocked by playing)
- Before each reign you **equip a limited number** (probably 5–6)
- Equipped upgrades define what your workshop can do that run
- Loadout is **locked** once the reign starts
- Unlocking more upgrades = more *choice*, not more *power*

**Why loadout works:**
- Every reign you become a different smith
- No power creep
- Real decisions between runs ("reliable build or experiment?")
- Scales well — a 100-upgrade veteran still only has 6 slots

**Design bar for upgrades:** every upgrade must have a distinct *role*, not just a power level. No "+10% damage" upgrades. Things like "Second Anvil — work on two weapons at once" or "Master's Eye — see decree rewards before accepting." Each one changes *how* or *what* you forge.

---

## Decree Rewards — The Run Layer

On completing a decree, you pick **1 of 3** rewards. Rewards come from three categories:

| Type | What It Does | When Used |
|---|---|---|
| **Materials** | Physical components for your weapon | Consumed when forging |
| **Enchantments** | Magical properties added to weapon | Consumed when applied |
| **Techniques** | New forging methods for this run | Reusable all reign |

Techniques are the interesting one — they're like temporary card additions. They expand what you can *do* at the forge for the rest of the reign, not what you *put into* the weapon.

**Three decision types from one reward system:**
- Materials = scarcity decisions
- Enchantments = identity decisions
- Techniques = capability decisions

---

## Weapon Identity — You Are Your Weapon

**The core insight:** the party is static. You are the variable. Your weapon choice defines your role in adventure mode.

- Party has fixed roles (e.g. mage, cleric, tank)
- You fill whatever gap they have
- Your weapon choice *rearranges the party's strategy*

### Weapon types (starting shape — 6 archetypes)

| Weapon | Role |
|---|---|
| **Sword** | Balanced, combo-focused, high skill ceiling |
| **Axe** | Heavy single hits, armor-breaking |
| **Hammer** | Crowd control, stagger |
| **Spear** | Reach, defensive, counter-attacks |
| **Bow** | Ranged, positioning |
| **Dagger** | Fast, crit-based, fragile |

Weapon type gives immediate mental model. Modifications (components, enchantments, techniques) give depth over time.

**Enemies also test weapon choices** — armored enemies punish swords, flying enemies punish hammers, fast enemies punish slow weapons. Learning each reign's enemy mix is part of the strategic layer.

---

## The Four Weapon Engagement Loops

A weapon isn't a one-time output. It's a living thing you engage with across the whole reign. Four loops that all feed back into the weapon:

| Loop | What It Does | Where |
|---|---|---|
| **Initial Forge** | Create base weapon | Workshop, core QTE |
| **Tempering** | Repair + improve after battle | Workshop, short QTE |
| **Enchanting** | Apply decree rewards to weapon | Workshop, separate minigame |
| **Legendary Actions** | Traits earned from heroic deeds | Adventure, triggered events |

**Why these four:**
- **Forge** — create
- **Temper** — reason to return from adventures (weapon takes damage, must be maintained)
- **Enchant** — ties decree rewards directly to weapon identity
- **Legendary** — rare, earned, high emotional weight (killing a boss might name your weapon)

Every core activity loops back to the weapon.

---

## The Forging Vocabulary

For roguelite Wobbly to have depth, players need to learn a **language**. Slay the Spire players learn Exhaust, Block, Strength. Wobbly players need to learn:

- Which materials produce which effects
- Which techniques pair with which weapon types
- Which enchantments suit their party's gaps
- Which tempering strategies preserve weapon quality over time

This vocabulary IS the depth. Without it, the roguelite is shallow. With it, every forge session is a meaningful decision in a language players have internalized.

---

## Open Questions

Things we touched on but didn't commit to. These need to be resolved in the next conversation.

### 1. Does the weapon carry forward as a "pattern" on death?

- **Option A:** Fully lost. Clean slate every reign. Maximum stakes.
- **Option B:** Weapon becomes a "pattern" you can start future reigns with at reduced power. Legacy feel.

*Current lean: Option B — gives death emotional weight without erasing the player's investment.*

### 2. One weapon per reign, or an arsenal?

- **Option A:** One weapon per reign. Deep emotional investment. Simpler to design. Big stakes if it breaks.
- **Option B:** Primary weapon + secondary tools. Safety net, dilutes identity.
- **Option C:** Small arsenal. Variety per adventure, weakens "my weapon is me."

*Current lean: Option A — maximizes pressure fantasy and emotional investment.*

### 3. Ascension-style difficulty tiers?

Once loadout is implemented, should surviving a reign unlock harder modes? (Slay the Spire Ascension style.)

*Likely yes, but can be added later.*

### 4. How many loadout slots?

- Too few (3–4) = frustrating
- Too many (8–10) = no constraint
- Sweet spot probably 5–6, needs playtesting

### 5. Early-game ramp

A player with only 6 upgrades unlocked has no loadout decision. How do we make early runs feel meaningful before the loadout pool is deep?

### 6. How does tempering differ mechanically from forging?

If tempering is the same QTE as forging, it's repetitive. It needs a different input pattern, different stakes. This is unresolved.

### 7. Do party members have any variability?

We said the party is static. But should party members have small unlockable options tied to your forging? Otherwise they might feel like passengers.

---

## Scope Concerns

These are the real risks. Naming them so we go in clear-eyed.

- **Content math is heavy.** Roguelites usually need 40–60+ forge upgrades minimum. Plus materials, enchantments, techniques, legendary traits, weapon types. This is a year-plus of design work.
- **6 weapon types with distinct forging feels is a LOT.** Could prototype with 2–3 weapon types first.
- **Tempering must feel different from forging.** New minigame = new design problem.
- **Vocabulary takes time to teach.** Early runs need to be forgiving while players learn.
- **Synergy design is hard.** The magic of loadout games is when two upgrades combine unexpectedly. That takes iteration.
- **Party reaction must be visible.** If the party doesn't *visibly* adapt to your weapon, weapon identity feels flat.

---

## The Loop, End to End

Putting it all together:

1. **Pre-reign:** Equip forge upgrade loadout (5–6 from your unlocked pool)
2. **Reign starts:** Receive first decree
3. **Prep:** Forge initial weapon using starting materials
4. **Adventure:** Complete the decree. Weapon takes damage, may earn legendary trait
5. **Return:** Pick 1 of 3 decree rewards (material, enchantment, or technique)
6. **Workshop:** Temper weapon (repair + improve), apply enchantments, experiment with techniques
7. **Repeat** with next decree. Weapon grows in power and history.
8. **Reign ends:** Failure → lose weapon → keep forge upgrades → (maybe keep weapon pattern)
9. **Between reigns:** New upgrades may unlock. Equip a new loadout. Try again.

---

## What This Gives Us

- **Per-run tension** — each decree's deadline, each adventure's risk
- **Per-reign arc** — building a smith and a weapon across many decrees
- **Meta-progression** — forge upgrades carry forward, loadout choices deepen
- **Replayability** — different loadouts, different decree rewards, different kings, different weapons
- **Discovery** — new upgrades, new materials, new techniques, new legendary traits
- **Emotional stakes** — your weapon has history, and losing it hurts

---

## Next Conversation Starting Point

Pick up by resolving the open questions above, especially:

1. Weapon persistence on death (legacy pattern or clean slate?)
2. One weapon vs. arsenal
3. Tempering mechanic — how does it feel different from forging?
4. Early-game ramp — how do first runs feel meaningful?

Once those are nailed, we can start thinking about concrete upgrade categories and the forging vocabulary in more detail.