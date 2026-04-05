# Wobbly Anvil — Game Design Doc

*A working name. The game deserves better and will get one.*

---

## What This Doc Is

This is the game, as it stands. Not a spec. Not implementation. The game.

Six design jams came before this doc. They are the reasoning, the alternatives considered, the dead ends. This doc is the living thing on the other side of that work — the world, the systems, the principles, the tone. A new collaborator should be able to read this and know what the game is and what it is not.

The jams are kept as reference material for *why* any decision was made. This doc is *what* was decided.

---

## The Game, in a Paragraph

You are a young prodigy blacksmith who should not be at the king's court yet. Someone saw something in you. Now the king issues decrees, and you forge weapons, and you go fight for your life, and you come home to your grubby mean roommate who lives at the forge and calls you names while you work. You are extraordinary at your craft and ordinary at everything else. Your weapon is what makes you capable. Your weapon is also what might get you killed. Every reign is brutal, every ending is earned, and the game is quietly, constantly trying to make you laugh.

---

## The Core Pillars

Six principles that the whole game rests on. Everything else serves these.

1. **Pressure fantasy, voluntary relief.** The stakes never lift. But the player decides when to breathe.
2. **The weapon is the protagonist.** The smith barely changes. The weapon is where growth lives.
3. **Craft is deterministic, skill is multiplicative.** Earned rewards are safe. Hands affect numbers, not identity.
4. **Everything worth having is earned through doing.** No currency, no grinding. Discovery is the unlock mechanism.
5. **Brutal stakes, light voice.** The game kills you. The game also tells jokes while doing it. The tonal whiplash is the point.
6. **The world remembers.** Across reigns, the game accumulates things that persist — faces, places, finds. You are not replaying. You are continuing.

---

## The World

### The Prodigy — You

You are young, gifted, untested. You are not a master, not a journeyman, not a disgraced veteran. You are a *prodigy*, which is different from all three. Someone picked you before you were ready, and you don't fully know why.

**The key constraint:** you are a prodigy *only at the forge*. You are not secretly a warrior, not a prophesied hero, not a hidden bloodline. Your gift is narrow and specific. You are extraordinarily good at craft, and ordinary at everything else. This matters because the weapon has to be the protagonist — if you were also special, the weapon would get crowded out.

**Your arc across a reign:** you begin as a craftsman forced into the field. Fragile, weapon-dependent, not a fighter. But across a reign, you grow into a warrior — *not because you trained, but because the weapon you built taught you how to fight*. Early reign is survival. Mid reign is learning the weapon's language. Late reign, you and the weapon are one thing.

If the weapon breaks late-reign, you don't just lose a tool. You lose the thing that made you capable. You revert to the fragile craftsman you started as. That is devastating in a way "I lost my sword" never could be.

### The Fairy — She Is Hephaestus

She lives at the forge. She has always lived at the forge. You can't remember when she arrived. She eats your food, uses your tools, complains about your work, and occasionally grunts a suggestion that turns out to be suspiciously good. You think of her the way you'd think of a feral cat that adopted you when you were small.

She does not look like a fairy. She is short, grubby, and mean-tempered. A rough little gremlin of a woman. "Fairy" is a mechanical category in this world, not a visual one — the word means something older and weirder than the fantasy genre expects, and the mystery of why is itself part of the game.

**She is secretly Hephaestus, the god of unreasonable synthesis.** She never says this. The player may go the entire game without learning it explicitly. The reveal lives in gameplay, not cutscenes — she reacts to your combines with suspiciously specific opinions, her healing looks like smithing magic, she has been to the dangerous places before with other prodigies. Players recontextualize hundreds of interactions when they finally figure it out. No twist cutscene required.

**She is why the prodigy was chosen.** The prodigy's signature verb — combining what shouldn't combine — is *her* signature verb. She watches mortals forge across generations, waiting for one who does her verb. When she finds one, she arranges for them to be summoned. The prodigy thinks they were discovered. They were *delivered*.

She is your permanent companion. She is in every reign. She comes with you on adventures as mage/healer. When you die, she grieves briefly and meanly, and then starts again with someone else. This is not her first prodigy. It will not be her last.

**Her voice is the comedy engine of the game.** She is mean, specific, funny, and rarely tender. Every time she is tender it hits ten times harder because she is mean the rest of the time. She can swear at a god and nobody blinks, because she *is* one, and the player reads it as grumpy roommate stuff. That joke plays forever.

### The King — Your Examiner

You serve a king. The king issues decrees. The king doesn't trust you yet — the early decrees are an audition. As you prove yourself, the decrees escalate, because you've *earned* harder ones. Failure doesn't just mean "you lost," it means "the king was right to doubt you."

The king is not a quest-giver. He is a character with a temper, watching. Every decree is him deciding whether to keep investing in you. His voice is the UI of decrees — the way he speaks to you is how the game delivers its missions.

**Different reigns have different kings.** This is how the game varies its pacing and pressure without new systems (see Kings, below). But across all of them, the king's function is the same: he asks, you deliver or fail, he watches.

### The Mystical Merchant — Your Equipment Ghost

A second permanent figure in the world. She appears sometimes. You never summon her. She carries equipment, trinkets, and utility items you have previously discovered — a merchant of your memory. Running into her is a small event. Over time, as your discovery pool grows, she visits more often and carries more things.

She is not a party member. She is not unlocked. She has always existed. What she is remains a quiet worldbuilding question.

The fairy and the merchant are the two permanent figures who outlive every reign. One is your forge companion. The other is your rare treasured visit.

### The Party — Your Adventuring Crew

When you go on adventures, you go with a party. The fairy is always with you. The other party members are archetypal — fixed roles like tank, damage, support — and rotate across reigns from a pool of NPCs you have met and unlocked.

The party members are intentionally simple. No micromanagement, no deep personalization. They are flavor and function. The player's decisions are about the smith and the weapon — the party is the context.

---

## The Reign — The Macro Loop

A **reign** is a run. It is your time serving a single king. It is as long as you can survive.

### The Shape of a Reign

Four phases, not rigidly, but as a feel:

**Phase 1 — Audition.** The king is testing you. Decrees are small. Failure is survivable but shameful. The weapon is fragile. You are fragile.

**Phase 2 — Trust.** The king starts giving you real work. The weapon is growing. This is the sweet spot — you have tools, decrees are interesting, failure is possible but not ruinous. Players live the fantasy here.

**Phase 3 — Strain.** The king pushes harder. Decrees outpace your ability. You are leaning on everything you have. The walls are closing in. You can feel it.

**Phase 4 — End.** The king has run out of easier smiths. He sends *you*, knowing what he is asking. Most reigns end here. Either you push through your ceiling into legendary territory, or you fail with dignity.

**Phase numbers are not fixed.** A bad reign ends in Audition. A great reign lasts past Phase 4 into territory no one has seen. The phases are *shapes*, not lengths.

### The Escalation Principle — Pull, Not Push

The king pulls you forward. He does not push you. The difference matters.

- **Push:** "You survived long enough, so the game gets harder."
- **Pull:** "You have proven yourself, so I ask for more."

Every decree the king issues in late reign should sound like trust, not punishment. *"You handled the raiders at Hollowmere. I need someone I can send into the Edge."* That is a compliment disguised as a death sentence. That is what makes the arc emotional instead of mechanical.

### Failure Is Inevitable

The escalation curve always outpaces your growth. This is by design. The whole reign shape is "how far can I get before the curve wins?"

But **where you fail matters emotionally**. Failing in Phase 1 feels like you didn't belong. Failing in Phase 3 feels like you climbed. Failing in Phase 4 feels legendary, even though it's the same outcome. The reign celebrates *how far you got*, not how you lost.

### The Loop, in Full

Zoomed out, every reign follows this loop:

1. **Loadout.** You pick your king, your forms, your forge upgrades, your spirit themes. (More on each below.)
2. **The king issues a decree.** You see the map, the objective, the hours, the stakes.
3. **Cozy time.** You prepare. You forge. You browse the market. You argue with the fairy. You drift.
4. **You commit.** The cozy window ends. You go.
5. **The adventure.** You fight, you route, you extract or push or die.
6. **You return.** (Or not.) Reward pick. Decree resolves. The king reacts.
7. **The next decree arrives.** Back to cozy time.
8. **Eventually, the reign ends.** Through failure, or death, or — rarely — something like victory.
9. **The ending scene plays.** Not a game over screen. A scene. (More below.)
10. **Meta unlocks bank.** The unlocked pool grows. You begin again.

---

## Cozy Time — The Forge Session

Between decrees is the **cozy time window**. It is the player's own time inside a run that is otherwise hostile.

### The Governing Principle

> The pressure never lifts. The stakes are always present. What changes is that the *demand on the player's attention* drops — and only when the player chooses to lower it.

Cozy time is never actually calm. Reputation is bleeding, the decree is coming, the weapon matters. But cozy time gives the player *permission to set it down*. To forge slowly. To browse the market. To talk to the fairy. To check achievements. To close the laptop.

**The game does not provide breaks. It permits them.**

This is the single most important principle of cozy time. The player administers their own relief.

### The Cozy Time Rule

> Non-forge activities exist to enrich the window, not to gate the forge. Any activity that becomes required is a design failure and should be absorbed into the forge itself.

Market visits are optional. Fairy conversations are optional. The forge is the only required thing, and it is only required because it is the point.

### The Five Phases of a Session

Every cozy time window has a shape. Three beats happen once. Two are re-enterable.

1. **Intake** *(once, zero hours)*. The decree arrives. You see everything at a glance — map, objective, hours, weapon, materials, techniques. Looking costs nothing. Only doing costs hours.
2. **Work** *(re-enterable, the spine)*. The forge. Where the weapon advances. This is the centerpiece of cozy time.
3. **Drift** *(re-enterable, mostly zero hours, optional)*. The defocus phase. Market visits, fairy talk, achievements, stats. Drift is the designated window for LLM fairy conversation.
4. **Readiness Assessment** *(re-enterable, zero hours)*. You stop. You study your weapon against the decree. *Am I ready yet?* Re-checking is always free.
5. **Commit** *(once, terminal, zero hours)*. You declare yourself ready. The cozy window ends. Remaining hours convert to a finish-early bonus (reward choice width, not power). Then the adventure begins.

### The Three Layers of Work

Work is not one kind of activity. It is three layered activities, each with a distinct purpose.

**The Craft Layer — where identity lives.** Deterministic choices about what to do with the weapon. Safe. Choice-driven. Earned rewards always produce predictable results. This is where Combine and Break-and-Rebuild live. The craft layer is protected from skill noise so players experiment boldly.

**The Hammer Layer — where skill lives.** A short QTE at the anvil. A few timed taps. The weapon gets a quality multiplier bump on its combat numbers. Opt-in, isolated, does not risk materials. The hammer layer is the genre's QTE home, and it doubles as low-stakes warmup for adventure combat.

**The Flavor Layer — where embodiment lives.** Short tactile inputs that exist purely to make the player feel like a smith. Sharpening with a whetstone is the canonical example. No fail states, low or zero mechanical weight, purely atmospheric. They exist to put the player's hands on iconic smithing motions that would otherwise be invisible.

### The Craft Determinism Rule

> Craft decisions are deterministic and safe. Earned materials, enchantments, and techniques produce known, predictable results when used. Skill expression affects multipliers on core numbers, never the identity, success, or survival of craft choices. The player never loses an earned reward to a QTE flub.

This rule is load-bearing. Break it and the signature verb collapses, because no player will combine-what-shouldn't-combine if a bad QTE can destroy their rare materials.

### Time, Days, and Nights

Cozy time windows may span multiple in-game days (twelve work hours per day). Days and nights exist as narrative framing — the HUD reflects them, the fairy has end-of-day beats, the world feels real. Sleep is not a mechanic. It costs nothing beyond the hours on the clock. There is no stamina. The player does not manage fatigue.

Finishing early rewards reward **choice width, not power**. Hours remaining at commit convert to extra reward options on return. The efficient player does not get a bigger hammer. They get more options to consider.

### The Signature Verb — Combine and Break-and-Rebuild

This is the gameplay hook that defines what this prodigy does that no other smith does.

**Combine.** The prodigy puts together things that shouldn't go together. Other smiths follow recipes. This prodigy synthesizes. Iron with bone. Moonsilver with fire-resin. Salt with edge-work. Somehow it works. Combine solves the "forging vocabulary" problem in one stroke — players don't learn recipes, they learn *ingredient interactions*. That's a language, not a manual.

**Break and Rebuild.** When a combine doesn't work, the prodigy can shatter their half-finished weapon and start over with the wreckage. Not a clean refund — they lose materials, they lose time, but they *keep the lesson*. The broken weapon teaches them what doesn't work.

Break-and-Rebuild is a **personality trait expressed as a game mechanic.** Other smiths value their work too much. The prodigy is young and reckless enough to shatter a half-finished weapon. That is characterization through system.

The pairing is also a fractal of the roguelite loop itself. Each forge session is a small reign — you experiment, you fail, you break it down, you learn, you try again. Each reign is a long forge session.

---

## The Weapon

The weapon is the protagonist of every reign. It is forged early, grown across decrees, and lost when the reign ends. No weapon persists between reigns. Every reign, you build a new one.

### The Three Zones

A weapon has three structural zones. Every craft action targets one.

**Core — what it's made of.** Stackable materials. Iron, dragonbone, moonsilver, bone marrow, fire-resin. Each material contributes something — stats, damage types, per-hit effects, properties. You can combine multiple materials into one weapon. Core is where most of the Combine verb's action lives.

**Form — what shape it takes.** The archetype (sword, hammer, dagger, etc.) plus a refinement tier. Forms start *rough* — the basic version, plain attack skills, recognizable but unremarkable. Across the reign they refine — *refined* adds new parts and sharper identity, *realized* is when the weapon's specific identity really comes out. Same archetype, but now it's a named thing. A rough Iron Sword becomes a Realized Singing Edge — still technically a sword, but nothing like what it started as.

**Spirit — what's bound into it.** The big-ticket synergy layer. Extra attack skills, combat functionality, weird effects we invent during prototyping. Spirit is the slot where builds *click*, where two things combine to create something neither could do alone. It's the intentionally open-ended slot where the interesting stuff lives.

### Top-Level Properties

Independent of zones, every weapon has:

- **Damage** and **Damage Type**
- **Keen-ness** (the critical hit stat)
- **Quality** (multiplier from forging QTE)
- **Condition / Sharpness** (multiplier from upkeep QTE)

**Quality and Condition are multipliers, never identity.** They come from the Hammer Layer. They affect how well the weapon performs, never what it is. This keeps the Craft Determinism Rule intact.

### Growth Across a Reign

The weapon doesn't get bigger across a reign. It gets **denser**. Early reign, it has one core material, a rough form, empty spirit. Mid reign, multiple materials stacked, form refining, spirit filling. Late reign, it's alchemical — a dense working that would not be recognized as a weapon by an ordinary smith. Same three zones, packed tighter every reign.

### Weapon Identity Is Emergent

The player does not decide "I'm making a fire sword." They forge a base weapon, and across ten decrees of rewards and combines, it becomes whatever its history made it. **The weapon teaches the player what it wants to be.** A great weapon is one whose identity emerged from the reign, not from a plan.

### The Forging Vocabulary

Players learn a language across many reigns. Not recipes — *interactions*. Dragonbone reacts with moonsilver. Salt poisons fire magic. Bone marrow holds enchantments longer than steel does. The fairy comments on combinations in suspiciously specific ways. The vocabulary *is* the depth. Without it, the roguelite is shallow. With it, every forge session is a meaningful decision in a language the player has internalized.

---

## The Adventure

When you commit, the cozy window ends and you enter the adventure. Adventures are where weapons are tested and reputations are made or lost.

### The Map

Adventures run on a **Slay-the-Spire-style node map**. Each location generates a node map per visit — the same location plays differently every time you return. Nodes carry location-specific content: enemies, events, rewards, hidden things, narrative moments. You choose your route from entry to the decree objective.

**Extract points** exist on most maps. Places you can bail out of the adventure without completing the decree. Extraction is less brutal than dying, but it still costs.

### Combat

Combat is **turn-based, QTE skill-driven.** Clair Obscur-style. You attack, use attack skills, use buff/debuff skills, use consumables, use your armor skill. The party contributes in fixed archetypal roles. The fairy heals, sort of, in her scrappy unorthodox way that looks suspiciously like smithing magic dressed up as medicine.

Combat lives or dies on the QTE hands. Players who hammer during cozy time are quietly warming up their reflexes for combat without noticing. The hammer layer and combat use the same muscle.

### Enemy Resistances — The Location Vocabulary

**Enemies have damage-type resistances. Players do not.** This is an asymmetric design choice. Player-side resistances would be inventory chore — "swap to fire armor for this fight." Enemy resistances are *information*, a puzzle the player reads and solves tactically. Swamp enemies resist poison. Ice-realm enemies resist cold. Players learn each location's vocabulary the same way they learn the forging vocabulary.

### Extraction — The Controlled Failure

When you extract, you are **choosing to fail the decree on purpose**, because dying is worse. The king sees the same outcome as any other failure. The reputation hit is the same. What extraction saves is what you gathered during the adventure itself — materials, equipment, gold.

### The Failure Hierarchy

| Outcome | King Sees | Reputation | Adventure Gains | Feel |
|---|---|---|---|---|
| **Success** | Pass | Safe | Kept | *"I delivered."* |
| **Extract** | Fail | Burned (full hit) | **Kept** | *"I ate it. But I got something."* |
| **Death** | Fail | Burned (full hit) | **Lost** | *"I have nothing. And I'm afraid."* |

**The key principle:** every adventure has the potential to be productive, even a failed one — *unless you die*. Death is the only outcome that truly wastes the player's time. That asymmetry is load-bearing. It is what makes players afraid to die specifically, rather than just afraid to fail.

### Fight-For-Your-Life Moments

Locations, decree types, and events can all **remove extraction availability**. When extract points are absent, the player is in a fight they cannot walk away from.

- A Survive decree where extraction *is* the objective
- A node trap that seals the extract routes
- A boss-shaped Slay decree where the boss blocks the only path back
- Late-tier locations where extract points are rare, fake, or hidden
- Event-modified decrees that remove extraction for narrative reasons

The player does not always know when extraction is about to be removed. Sometimes they do (Survive is telegraphed). Sometimes they don't (a trap is a surprise). **The unpredictability is what makes every adventure carry quiet tension — *am I still able to leave?***

---

## Equipment and Role

This is the important clarification that makes the adventure half of the game work:

> **The weapon defines your playstyle. Equipment defines your role.**

The weapon is long-lived, accumulating, strategic. Equipment is transient, swappable, tactical. A Dagger with heavy armor is a durable frontline striker. The same Dagger with light armor is a glass cannon assassin. Same weapon, same reign, completely different job in the party.

This separation is what lets the weapon be *yours* (a reign-long identity) while still letting you flex into whatever the current decree and party needs.

### The Four Equipment Categories

**Armor.** Body protection. Heavy, Medium, or Light class. Defines combat role through two layers: an HP bonus and an *armor skill*. The armor skill is an active combat ability the player can use on their turn — every turn becomes a four-choice decision: attack, weapon skill, item, or armor skill. Heavy skills are protective and disruptive. Medium skills are versatile. Light skills are evasive and opportunistic. Weapon skills are offensive; armor skills are tactical. Separate lanes.

**Trinkets.** The synergy layer of equipment. Build-specific twists. Things like *"whenever you deal fire damage, +X"* or *"marked enemies take bonus crit from daggers"* or *"your lowest-HP ally deals bonus damage."* Trinkets don't define role — armor does. Trinkets *warp* the role into something specific. Trinkets should never substitute for the weapon's Spirit layer; they're external synergy, not weapon synergy.

**Utility Items.** Tactical consumables. The clever button. Things that interact with your build — a Mark potion, a skill-charge restore, a damage-type shift for one turn.

**Heals.** Recovery consumables. The panic button. HP restore, condition cleanse, emergency measures.

All four categories are **transient per run**, not upgradable, found through adventures and the mystical merchant. They are what they are when you find them. The character of equipment is that *you work with what you got*.

### The Armor Skill / Weapon Skill Separation Rule

- Weapon skills are **offensive** — damage, combos, crits, damage-over-time, exploits.
- Armor skills are **tactical** — positioning, control, defense, ally protection, action economy.

This rule keeps the two equipment layers from competing. A player who optimizes their weapon is building damage. A player who optimizes their armor is building tactics. Neither dominates the other.

---

## Decrees

A decree is the tactical unit of a reign. It is what the king commands. It is what you prepare for during cozy time. It is what you resolve through an adventure.

### What a Decree Contains

Every decree has: an objective, a location, a difficulty tier, an hour budget, stakes, a reward pool, the king's voice, and any active event modifiers. All of this is visible at intake. There is no hidden difficulty. The player assesses, then chooses how much cozy time to spend preparing.

### The Six Decree Types

Decree types are dual-purpose. They tell the player what they're doing, and they instruct the map and combat systems to generate different adventure shapes.

- **Slay.** Kill a specific target. Boss-shaped final node. Tests raw combat.
- **Retrieve.** Recover an item. Item is hidden deep. Routing matters.
- **Defend.** Hold a point against waves. Map collapses to a defense zone. Tests endurance and positioning.
- **Escort.** Move an NPC to a destination. Two-phase map — find them, then backtrack with them. Escort AI is a new pressure type.
- **Investigate.** Find information or resolve a mystery. Map hides narrative talk-to-NPC nodes among combat nodes. Relies on the dialogue system.
- **Survive.** Reach the extract point against rising pressure. Timer-based map, scaling enemies. **Extract is inverted here — reaching it is the *win condition.***

Each type asks a different question. Same underlying systems, different mission feel.

### The King's Voice — How Decrees Are Delivered

A decree is not a quest card. It is the king speaking. The presentation has four beats:

- The king's opening — why this is being asked
- The objective — in the king's language, not system language
- The stakes — what the king says will happen on success or failure
- The king's mood beat — one line of character color

The king's temper (see Kings, below) modulates all four. A patient king frames with context. A cruel king gives orders with threats attached. A desperate king begs in disguise. A distracted king is inconsistent and erratic. **The king's temper is the UI of decrees**, not just flavor.

### Binary Outcomes

Decrees are **success or fail**. No partial credit on reputation. Decrees hit hard. You either delivered or you didn't. The king does not grade on effort.

This is intentional. Partial outcomes would create a floaty rep state where every decree becomes a math problem about acceptable loss. Binary decrees land. Failure is a definitive thing. Reputation is genuinely scary because every failure is a *full* chunk of mortality burned.

---

## Kings

Kings are a **pre-reign pick at the loadout screen**, not a random reign roll. Picking a king sets the reign's difficulty curve and personality. It is the game's primary difficulty lever, wrapped in character instead of menu.

### The Four Tempers

- **Patient.** Slow ramp. Generous. Long reigns with room to grow. The starting king.
- **Cruel.** Fast ramp. Compressed. Vicious late game. For players who want tension immediately.
- **Desperate.** Erratic. May throw Phase 3 decrees in Phase 1 because the kingdom is burning. Thematic chaos.
- **Distracted.** Uneven. Easy decrees mixed with sudden spikes. No rhythm.

Each king reigns differently on the same content. Same game, four moods.

### Kings as a Meta Track

Kings are unlocked by reign progression under other kings, forming a small branching tree. Starting players have Patient. Cruel unlocks by reaching certain phases under Patient. Desperate unlocks by reaching phases under Cruel. And so on. Unlocking the hardest kings requires climbing through the others. Veteran players have a long-tail chase — *"I've never unlocked the fifth king."*

The king tree is a meta puzzle of its own, and it replaces traditional Ascension-style difficulty unlocks with something narrative and character-driven.

---

## Events

Events are **the narrative and worldbuilding layer of the game.** They are the reason two reigns with the same decrees feel like different stories.

### What Events Are Not

Events are not multi-decree debuffs with flavor text. That is *weather*, and weather belongs somewhere else. Events are something bigger.

### What Events Are

> **Events are short stories the player lives inside of. They have narrative hooks, branching player choices, meaningful mechanical weight, and lasting consequences for the reign.**

Every event must:

- Give the player meaningful choices
- Reveal worldbuilding
- Leave the reign different from how it would have gone without it

If an event is just modifiers with no choices and no lore, it hasn't earned the name.

### The Core Rules

- **One event at a time.** Never more. Events are special. Overlapping them dilutes both.
- **Events are rare.** Maybe 40–60% of reigns have an event. Quiet reigns are the baseline. Eventful reigns are the ones players remember.
- **Events work through the existing dialogue system.** That system is already in prototype form. Events are the thing that makes it central.

### How Events Trigger

Sometimes events start from random rolls at phase entry. Sometimes from king-specific or phase-specific conditions. Sometimes from meta-unlocked rare triggers. And sometimes — most powerfully — **from player choices mid-adventure.**

You find a wounded stranger in a dungeon. The dialogue pauses. Your options branch. *Help them. Demand answers. Attack them. Ignore them and leave.* Attacking them starts a war event that reshapes the rest of the reign. The player had agency. The world responded massively. That is the kind of moment players never forget.

### Four Event Roles

- **Problem events** — a crisis the player can fight or endure (a plague, a famine, a cursed week)
- **Pressure events** — intensity stacked on top of reign escalation (a border war, a royal visit, an eclipse)
- **Gift events** — brief windows of abundance and texture (a traveling fair, a festival, a holiday)
- **Mystery events** — something to notice, nothing required (an omen, a stranger at the forge, a suspicious lull)

### What Events Enable

Events are where the game's voice fully lives. They are the chance to introduce new characters with personality, reveal worldbuilding organically, give the player branching agency, and create the memorable moments that define a playthrough.

> **Players don't remember reigns by their numbers. They remember them by their events.** "The reign the plague broke out in Phase 2." "The reign the fair came through and I finally saw the merchant." "The reign I attacked a stranger and started a war."

---

## Meta Progression

Meta progression has **seven tracks**. Four are picks at the loadout screen. Three are emergent — they live in the world, not in menus. All seven are earned through doing. **There is no meta currency.**

### The Seven Tracks

| Track | Type | Unlock Source | Per-Reign Role |
|---|---|---|---|
| **Kings** | Loadout pick | Reign progression (branching tree) | Sets difficulty curve and personality |
| **Forms** | Loadout pick | In-run mastery | What you can forge |
| **Forge Upgrades** | Loadout pick | Reign milestones | How you forge |
| **Spirit Themes** | Loadout pick | Spirit encounters | What spirits you find |
| **NPCs** | Emergent | Encounter actions | Who joins you |
| **Locations** | Emergent | In-run discovery | Where you go |
| **Equipment Pool** | Emergent | First-time discovery | What items you find |

Four picks, three emergent. The asymmetry is the point.

### The Loadout Screen

Before every reign, you pick four things:

- **One king** from your unlocked pool.
- **One or two forms** from your unlocked pool.
- **Three to five forge upgrades** from your unlocked pool.
- **One or two spirit themes** from your unlocked pool.

The king is the first decision — it sets the frame the other three sit inside. A cruel king pushes you toward fast-ramp upgrades. A patient king lets you pick exploration-focused ones.

The loadout screen scales with the player. A new player sees a sparse board. A veteran sees a dense one. The picks are more meaningful as the pools deepen.

### Forge Upgrades — The Design Rule

Forge upgrades are the fairy's collected knowledge across generations. They are not *yours* — they are hers, and she grants access.

> **Forge upgrades change what is possible, not how hard you hit. Ceiling raises are acceptable. Flat power bonuses are not.**

An upgrade that gives you +10% damage is a bad upgrade. An upgrade that lets you combine three core materials instead of two is a good upgrade. An upgrade that lets you see decree rewards before committing is a good upgrade. An upgrade that lets you work on two weapons in parallel is a good upgrade. Every upgrade must have a *role*, not a power level.

### Non-Slotted Meta — NPCs, Locations, Equipment

Three meta tracks don't live at the loadout screen. They live in the world.

**NPCs.** Characters you meet during adventures who may return in future reigns. Unlocked by specific actions — helping them, sparing them, completing their requests, choosing them over a reward. Some join your party. Some are forge visitors, merchants, or quest-givers. **The fairy is the only NPC who is permanent.** Others are recurring, not guaranteed. You do not pick them. They appear when they appear.

**Locations.** New places the king may send you for decrees. Unlocked through in-run discovery — a dying enemy mentions their homeland, a rescued NPC points to their origin, a map fragment, a rumor from another NPC. Unlocked locations enter the decree pool. The king picks where to send you.

**Locations are the difficulty scaling lane.** This is the game's primary answer to long-term content scaling. Four tiers:

- **Heartland** — safe, familiar, starting pool
- **Frontier** — real threats, variety
- **Edge** — strange, cursed, dangerous
- **Beyond** — places the king shouldn't know about, where alchemical smithing begins to make sense

Same systems, escalating stakes. No stat inflation. No Ascension tiers. No New Game+. The *world* escalates. The player does not "play harder" — they play in a world new players have not seen yet.

**Equipment Pool.** Items you have discovered enter a personal pool that persists across reigns. The pool surfaces in two ways: items drop in adventures (weighted by what you've discovered and what locations you visit), and the **mystical merchant** carries items from your discovered pool when she visits. **First discoveries always happen in the wild, on real adventures, through real moments.** The merchant is a merchant of your memory — she cannot sell what you have never found.

### Why No Currency

This is an explicit decision and worth naming.

The case for meta currency in roguelites is real — it gives guaranteed progress, player-directed unlock order, a pity system for bad runs. Real benefits.

But currency would **flatten the game's whole soul**. The fairy is not a shopkeeper. The king is not buying your loyalty. The weapon is not bought. Everything in this game is earned through *doing*, and currency is the opposite of doing. Currency would turn the fairy's patient collected knowledge into a store, and it would turn players from people playing the game into people farming it.

Instead of currency, the game enforces:

- **Every reign unlocks at least one thing.** A terrible reign still banks something. A great reign banks more.
- **Unlock triggers are visible and varied.** Players see what they could earn and through what actions.
- **Promotion is earned through the act, not repetition.** First time you bind a fire spirit unlocks the theme. Not the tenth.
- **No hidden unlocks for first-time players.** Mystery unlocks are second-playthrough depth, not first-playthrough confusion.

The rule: **the rare things can't be bought. They can only be done.**

---

## In-Run Economy

A reign has **five resources** grouped into **three economies**. Each is touched at a different moment and for a different reason.

### The Five Resources

- **Hours** — the cozy time budget. Spent on forge actions and market visits. Fixed per window.
- **Reputation** — the king's patience. Finite. Drains on failure. Zero ends the reign. Does not regenerate.
- **Materials** — weapon fuel. Fed into the Core zone. Contingent in adventures — gained during adventures, lost if you die.
- **Equipment** — armor, trinkets, utility items, heals. Used in adventures. Contingent in adventures.
- **Gold** — flexible currency. Spent at markets, shops, and the mystical merchant. Mostly non-contingent — mostly survives failure.

### The Three Economies

- **Time economy** — Hours. Deliberate budget spending during cozy time.
- **Risk economy** — Reputation, Materials, Equipment. Extraction-based. Push or bail.
- **Commerce economy** — Gold. Fills gaps, bridges needs, never provides power.

### Gold — The Governing Rule

> **Gold fills gaps and bridges needs. Gold buys breadth, not depth.**

Gold prevents the player from getting stuck on a missing common material. It lets the player buy basic heals and utility items. It lets the player buy from the mystical merchant when she visits. It gives failed adventures a consolation — you still got *some* gold before you bailed.

Gold does **not** buy power. Common materials are buyable. Rare ones are not. Basic consumables are buyable. Rare or unique ones are not. No forge upgrades are buyable. No meta unlocks are buyable. Ever.

Gold is mostly non-contingent because the game needs a resource that survives failure — so even a death still leaves you with something to work with next time. That is gold's unique role.

---

## The Pressure Model

Five factors press on every decision the player makes. None of them dominate. The game is the interaction between them.

- **Reputation** — the mortality timer
- **The king's temper** — the difficulty personality
- **Hour budget** — the prep clock
- **Decree stakes** — per-mission cost and reward
- **Weapon state** — your current capability
- **Party composition** — what gaps the current party has
- **Location tier** — the world's escalation
- **Route choices** — inside adventures
- **Extract decisions** — push or bail

These pull against each other. A cruel king means rep costs more, so play safer — but safer means weaker forging, means more failures, means more rep loss. A dangerous location has rare drops — push deeper — but deeper risks death. A light armor build hits harder but one mistake ends you.

> **No single pressure dominates. The decisions the game forces are always trade-offs between competing pressures.**

---

## Reign Endings

A reign ends one of two ways, and the game treats them very differently.

### Reputation-Zero Endings — The Prodigy's Story

When the king's patience runs out, the reign ends with a **scene**. Not a game over screen. A piece of the prodigy's story. The scene is **outside the king's purview** — he is one factor in how it plays out, but the scene is about *the prodigy*, not his verdict.

Possible scene shapes (illustrative, not locked content):

- **Execution.** You failed terribly, late, under a cruel king. Grim. Rare.
- **Exile.** The king sends you away rather than killing you. Bittersweet.
- **Quiet Escape.** You and the fairy slip away before he can act.
- **Mercy.** A patient or distracted king lets you live. Melancholy.
- **Disappearance.** You and the fairy vanish. No one knows where.
- **Happily Ever After.** Friends help you escape to something quiet. Rare. Earned. Beautiful.

Which scene plays is determined by **what happened during the reign** — the king you served, the NPCs you befriended, the choices you made during events, how far you climbed, whether anyone survived to stand with you at the end.

Every reign gets its own ending. Meta progression during the reign *matters to the ending*. The prodigy's story has dignity even in failure.

### Death in Adventure — The Other Kind of End

Adventure death is different. It doesn't get a story-shaped scene. It gets a **punctuation scene**: fast, brutal, red and black.

| Aspect | Reign-End Scene | Death Scene |
|---|---|---|
| Length | Longer, scripted | Fast, brutal |
| Mood | Melancholic, earned, sometimes beautiful | Harsh, final |
| Palette | Depends on scene | Red and black |
| Fairy's role | Present, reactive, sometimes central | Silent or absent, grieving in private |
| What it conveys | "Here's what this reign was" | "You died. That's it." |

The asymmetry is intentional. Reign-end scenes honor the prodigy's journey. Death scenes honor the *loss* of it. Both are scenes. Only one is a story. Players learn to recognize the palette instantly — red and black means this reign didn't deserve a story, because the prodigy didn't live to tell it.

**This is how death feels different from reputation-zero endings without any new mechanics. Death is the only end-state without narrative consolation.**

---

## Tone

The game is brutal. The game is also light-hearted. **The tonal whiplash is not a flaw — it is the flavor.**

The pressure fantasy is real. Reigns end. Prodigies die. The king is a real threat. The weapon really can break at the worst moment. The stakes are not softened.

And the game is funny. The fairy is mean and specific and quotable. The king is ridiculous in his tempers. The mystical merchant has affectations. The NPCs are weirdos. The flavor layer exists so the player can swipe a whetstone back and forth for the dumb joy of it. The game writes comedy the way pressure games write doom.

This is not tonal confusion. It is deliberate. The brutality and the comedy serve each other:

- **The jokes make the brutality bearable.** A game this mean without humor would be oppressive. The fairy complaining about your hammer technique while the king threatens to exile you is the only way a reign this brutal stays playable.
- **The brutality makes the jokes land.** A game that is only funny is a comedy. A game that is funny *while the stakes are real* is a feeling. When the fairy says something tender after a hundred hours of being awful, it hits because the world is genuinely dangerous and she is genuinely grieving.
- **The player's emotional range gets to be wide.** They laugh, they stress, they grieve, they laugh again. A game that only does one emotional register flattens the player. Wobbly Anvil wants the full range.

> **When in doubt: brutal stakes, light voice. The game kills you, and it tells a joke while doing it.**

---

## What This Game Is Not

Important things to protect, because these are the failure modes the design is built to avoid.

- **Not a grinder.** No currency, no farming, no repetition-for-unlock. Every unlock comes from *doing*, and doing once is enough.
- **Not a spreadsheet.** The craft layer is deterministic, but craft *vocabulary* is discovered through play, not read in a wiki. Learning ingredient interactions is the game, not homework.
- **Not a power fantasy.** The prodigy is not special outside the forge. The weapon is the protagonist. Growth lives in the weapon, not in the smith.
- **Not a roguelite-by-numbers.** No Ascension tiers. No meta currency. No "unlock the next difficulty" grind. Meta progression is variety-focused and discovery-driven.
- **Not a loot game.** Equipment matters but it is transient, not upgradable, not the point. The weapon is the point.
- **Not a narrative game.** The story is embedded in the mechanics — the fairy's nature, the king's tempers, the events' choices. There are no cutscenes carrying the game. The gameplay carries the story.
- **Not a combat game.** Combat matters, but it is not the centerpiece. The forge is the centerpiece. Combat is where the forge's work is tested.
- **Not a cozy game, either.** It borrows the cozy time window from cozy games, but the pressure never lifts. The player is permitted to rest, not given rest.

---

## The Prototype Path

Not every system in this doc ships in the first prototype. The goal of v1 is to **stand up the minimum complete loop** — a playable reign that feels like the real game, with enough content to find the fun.

### What v1 Needs

- **One king** (Patient)
- **Two or three forms**, each with all three refinement tiers
- **A small core material pool**, enough to teach combine
- **A small spirit pool**, enough to show synergy
- **A handful of forge upgrades**, enough for one loadout
- **One spirit theme**, enough to demonstrate the mechanic
- **Two or three locations** across Heartland and Frontier
- **Three or four decree types** (Slay, Retrieve, Defend, plus one more)
- **A basic equipment pool** — a few pieces of each armor class, some trinkets, some consumables
- **One fully-realized event** — ideally character-focused, showcasing the dialogue system at its best (the Old Smith is a good candidate)
- **The core forge session loop** (Intake / Work / Drift / Readiness / Commit)
- **The three work layers** (Craft / Hammer / Flavor)
- **Combine and Break-and-Rebuild** as working verbs
- **The full failure hierarchy** (Success / Extract / Death)
- **One reign-end scene**, plus the death scene
- **The fairy's voice, present throughout**

### What v1 Can Skip

- Additional kings and the king unlock tree
- Most decree types (Escort, Investigate, Survive are later)
- The full event catalog (one is enough to prove the system)
- Most NPCs beyond the fairy and one or two recurring characters
- Edge and Beyond location tiers
- The mystical merchant (or a minimal version)
- Most reign-end scenes (one or two is enough)
- Cross-reign aftermath persistence
- Deep forge upgrade catalog
- Fairy LLM conversation system (can be scripted at first)

### Design Priorities During Prototyping

- **Find the fun in the forge first.** The forge is the centerpiece. If the forge doesn't feel good, nothing else matters.
- **Prove the signature verb.** Combine and Break-and-Rebuild need to feel distinct, satisfying, and load-bearing. If they are bland, the whole design falls apart.
- **Tune the pressure curve.** Find out what "Audition → Trust → Strain → End" actually feels like in play. Numbers are tuning work; the *shape* needs to feel right.
- **Make the fairy land.** She is the tonal heartbeat. If her voice works, the whole game works.
- **Make one event feel real.** Not five half-events. One event that is a *story*, with real branching and real consequences, becomes the template for everything else.

---

## Open Questions Carried Forward

Things the jams touched but did not fully lock. These are design work that will happen alongside or after prototyping.

- **Combine and Break-and-Rebuild mechanics.** The verbs are named and their purpose is clear. The specific player inputs are not yet designed.
- **The loadout screen UI.** How four pick categories are presented together.
- **Tempering mechanics.** How repair/maintenance feels different from forging.
- **The hammer QTE specifics.** Input pattern, multiplier math, scaling across a reign.
- **Craft layer atomic verbs beyond Combine and Break-and-Rebuild.** Likely more exist (graft, strip, rework, bind, etc.).
- **Content catalogs.** Full lists of materials, spirits, upgrades, trinkets, NPCs, locations, events.
- **Tuning curves.** Reign length, decree pacing, event frequency, gold economy, rep loss per failure.
- **Fairy conversation system scope.** How deep the LLM-powered drift conversations go.
- **Aftermath persistence.** Whether event consequences carry across reigns or only within the current reign.
- **The game's actual name.** "Wobbly Anvil" is a working title.
- **The fairy's name.** Open, and important.

---

## The Shape of the Game, in One View

To close, the whole thing in one compressed picture:

A young prodigy serves a king. The king commands. The prodigy forges. The prodigy fights. The weapon grows across the reign. The fairy complains. Events happen. NPCs are met. Locations are discovered. The world remembers. The king pushes harder. The curve outpaces the prodigy. The reign ends — in a scene outside the king's grasp — or in red and black if the prodigy died out there. Some things carry forward. The next prodigy arrives. The fairy does this again. And again. And again.

> **It is a brutal game about a kind craft, told through a mean character who loves you.**

That is Wobbly Anvil. That is the game.

---

## Reference — The Six Jam Docs

This design doc is a synthesis. The jams are the working material behind it, preserved for any future question about *why* a decision was made.

1. **AdventureModeJam.md** — the structure of a reign, loadouts, decree rewards, the engagement loops, the original scope
2. **WorldBuildingJam.md** — the prodigy, the fairy as Hephaestus, the king as examiner, the signature verb, the growth arc
3. **ForgeSessionJam.md** — cozy time, the five-phase session arc, the three work layers, the Craft Determinism Rule
4. **MetaProgressionJam.md** — the weapon schema, the five original meta tracks, the difficulty scaling lane, the no-currency decision
5. **InRunDesignJam.md** — equipment as role, armor design, the mystical merchant, gold, the in-run economy, randomization layers
6. **DecreesAndReignJam.md** — decrees as design objects, reign phases, kings as difficulty lever, reign-end scenes, events as narrative layer

All six should travel with this doc.