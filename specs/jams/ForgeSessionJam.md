# Wobbly Anvil — Forge Session Design Jam (Block 2)

## Purpose of this doc

Companion to `AdventureModeJam.md` and `WorldBuildingJam.md`. Adventure Mode defined the *structure* of the run. Worldbuilding defined the *soul* of the smith and their world. This doc defines the *forge session itself* — what a cozy time window feels like, what shape it takes, and what the player is actually doing inside it.

This doc covers **Block 2: The Forge Session**. It does not cover the full atomic action list (specific craft verbs), the weapon schema (named parts/slots), or the specific math of the Hammer QTE. Those are flagged at the bottom for future jams.

Read `AdventureModeJam.md` and `WorldBuildingJam.md` first. This doc assumes their decisions are locked.

---

## The Headspace Thesis

The forge session is **time-limited theorycraft**. The player has a fixed number of hours until a known decree is due. They know the map and the objective. They do not know exactly what they'll face. They spend hours preparing the weapon(s) they'll take, deciding when they're ready to commit. Nothing is rushing them in real time. The clock is an in-game hour budget they spend deliberately.

The player should feel like a strategist in a quiet room, wondering how best to prepare — not a performer racing a timer.

---

## Cozy Time — The Governing Frame

**Cozy time** is the window between decrees. It is the player's "own time" within a run that is otherwise hostile and time-pressured.

### The Core Principle: Permanent Pressure, Voluntary Relief

> The pressure never lifts. Reputation is bleeding, the decree is coming, the weapon matters. What the cozy window provides is relief the player administers to themselves on their own terms. Every cozy time activity must reward presence without punishing absence. The game respects the player's right to set it down.

Cozy time is never actually calm. The stakes are always present. What changes is that the *demand on the player's attention* drops, and only when the player chooses to lower it. The player can lean into the forge. They can drift. They can talk to the fairy. They can check achievements. They can close the laptop. The game does not provide breaks — it *permits* them.

This is the single most important design principle in Block 2. Every downstream decision must serve it.

### The Cozy Time Rule

> Non-forge activities exist to enrich the window, not to gate the forge. Any activity that becomes required is a design failure and should be absorbed into the forge itself. Every cozy time activity must survive the player setting the game down in the middle of it. Nothing can be time-critical. Nothing can penalize inattention.

### The Pacing Contrast

The cozy window and the adventure are designed as tonal opposites. Adventure is where focus and attention live. Cozy time is where the player is allowed to defocus. The contrast between them is the point. Adding session-level pressure to cozy time would collapse this contrast and flatten the emotional range of the game.

---

## The Run Context — How Cozy Time Sits in the Larger Loop

- **Decrees are back-to-back.** Finish one, the next arrives. There is no dead time between decrees. Cozy time always has a target.
- **The player cannot decline a decree.** The king commands. The player always goes.
- **The player has one adventure attempt per decree.** No retries.
- **Finishing the cozy window early is rewarded.** Hours remaining at commit convert to a wider selection of decree rewards on return (3 normal → 4–5 when efficient). The reward is *choice width*, not power. Power comes from picking the right option from a bigger menu.
- **Failure is survivable.** Failed decrees cost reputation. Reputation is finite. Reputation zero ends the run. The run philosophy is "how far can you get" — every decree is attritional.
- **Reputation does not regenerate.** Every hit is permanent. This is the flex in the system: the player decides how much rep to spend on hard decrees vs. easy ones, knowing the floor is death.

---

## The Weapon — What the Forge Is For

- **The weapon is a long-lived reign-spanning object.** Forged once early, grown across every subsequent decree. Tempering, enchanting, re-combining, breaking-and-rebuilding — all of these advance the same weapon through the reign.
- **A forge session is not "build a weapon."** It is "advance your weapon in preparation for the next decree."
- **Multiple weapons are supported.** A player may build backups or specialists for specific decrees. The main weapon remains the through-line.
- **The weapon has a structural schema** with named parts/slots that craft verbs target. Complexity comparable to or deeper than Path of Exile equipment — late-reign weapons become monstrous alchemical workings that bear no resemblance to their starting shape.
- **Weapon identity emerges from accumulated decisions, not initial design.** A player does not decide "I'm making a fire sword." They forge a base weapon, and across ten decrees of rewards and combines, it becomes whatever its history made it. The weapon teaches the player what it wants to be.

---

## The Session Arc — Five Phases

Cozy time has five phases. Three are bookends (once per window). Two are re-enterable (the player cycles between them freely).

### Phase 1 — Intake *(mandatory, once, zero hours)*

The decree arrives. The player sees the map, the objective, and the due date. In the same beat, they orient: they see their current weapon(s), their material stock, their known techniques, their hour budget, and the decree at a glance. Everything needed to plan is visible without committing to anything.

The clock begins, but the clock only charges for *committed actions*. Looking costs nothing. Thinking costs nothing. Only doing costs hours.

### Phase 2 — Work *(re-enterable, variable hours, the spine)*

The forge. The centerpiece of cozy time. Where the weapon advances. Atomic actions live here (see Block 2 scope section below). The player enters and leaves Work freely throughout the window.

Work has three layers inside it, each serving a distinct purpose. See "The Three Layers of Work" below.

### Phase 3 — Drift *(re-enterable, mostly zero hours, optional)*

The defocus phase. Contains all the non-forge activities: market visits, equipment review, looking over the weapon's adventure skills, fairy conversation, browsing achievements, browsing stats. Drift exists to give the player permission to step back from the forge and inhabit the world.

- Market visits cost minimal hours (a fraction of the budget). Everything else is zero-hour.
- Drift activities are short. No drift activity may grow into a forge competitor.
- Drift is the designated window for LLM fairy conversation. The fairy is available during drift, not during committed forge actions.
- Drift is entirely optional. A player may spend the whole window in Work and never drift. That is a valid playstyle.

### Phase 4 — Readiness Assessment *(re-enterable, zero hours)*

A specific kind of drift beat that deserves its own name. The player stops, studies their weapon against the decree, and asks *am I ready yet?* This is the heartbeat of cozy time — the player bounces between Work and Readiness Assessment many times across a window.

Re-checking readiness is always free. The player should never feel punished for building confidence before committing.

### Phase 5 — Commit *(mandatory, once, terminal, zero hours)*

The player declares themselves ready and enters the adventure. The cozy time window ends. Remaining hours convert to the finish-early bonus. The player cannot return to the forge until the adventure resolves.

Commit is a weighty decision, not a button click. It should feel like crossing a threshold. The fairy has something to say. The prodigy takes a breath. Then it happens.

### Day and Night

Cozy time windows may span multiple in-game days (12 work hours per day). Days and nights exist as narrative framing — the HUD reflects them, the fairy has end-of-day beats, the world feels real. Sleep is not a mechanic. It costs nothing beyond the hours on the clock. The player does not manage stamina. Sleep is the transition between days, and the player's hour budget continues across them.

---

## The Three Layers of Work

Work is not one kind of activity. It is three layered activities, each with a distinct purpose. Atomic actions inside Work belong to one of these layers.

### Layer 1 — The Craft Layer

Where the weapon's identity lives. Craft verbs are deterministic choices the player makes about how to advance the weapon.

- **Deterministic:** the inputs determine the outputs. No RNG, no skill check.
- **Choice-driven:** the interesting part is deciding *what* to do, not executing it.
- **Hour-costing:** every craft action spends hours from the budget.
- **Safe:** earned rewards (materials, enchantments, techniques) are never at risk when used. Choosing to put dragonbone in the haft puts dragonbone in the haft.
- **Schema-targeting:** craft verbs target specific parts of the weapon per the structural schema.

The signature verbs of the prodigy — **Combine** and **Break-and-Rebuild** — live at the Craft Layer. They are the soul of forging and they are protected from skill noise. A player experiments boldly at the Craft Layer because the craft layer does not punish them for experimenting.

#### The Craft Determinism Rule

> Craft decisions are deterministic and safe. The player's earned materials, enchantments, and techniques produce known, predictable results when used. Skill expression affects multipliers on core numbers, never the identity, success, or survival of craft choices. The player never loses an earned reward to a QTE flub.

This rule is load-bearing. Break it and the signature verb collapses, because no player will combine-what-shouldn't-combine if a bad QTE can destroy their rare materials.

### Layer 2 — The Hammer Layer

Where skill expression lives. A single dedicated verb: the player works the anvil, the player's hands execute a short QTE (roughly 5 seconds, a few timed taps), and the weapon receives a quality multiplier bump on its core combat numbers.

- **QTE-driven:** the outcome is graded by execution quality. Better hands, better multiplier.
- **Isolated:** the Hammer QTE does not affect craft identity, does not risk materials, does not interact with enchantments. It affects numbers only.
- **Opt-in:** the player chooses when to hammer. They can hammer a lot, hammer a little, or skip it entirely. Skipping produces a weaker weapon numerically but a valid one.
- **Hour-costing:** hammering spends hours like any other action.
- **Standalone:** Hammer is its own verb, not embedded inside craft actions.

This layer exists because Wobbly Anvil is a QTE-centric game and forging without QTE expression would waste the genre. It also exists because the prodigy is a prodigy *at the hands*, and hands need a mechanical home.

The Hammer QTE also functions as low-stakes practice for the Clair Obscur–style adventure combat QTEs. Players who hammer regularly are warming up their reflexes for the adventure without noticing.

### Layer 3 — The Flavor Layer

Where embodiment lives. Short tactile inputs that exist purely to make the player feel like a smith in the world. Sharpening with a whetstone (a few swipe gestures) is the canonical example.

- **Low or zero mechanical weight.** These QTEs do not meaningfully gate outcomes.
- **Low or zero hour cost.**
- **No fail state.** The player is meant to enjoy the gesture, not worry about it.
- **Purely atmospheric.** They exist to put the player's hands on iconic smithing motions that would otherwise be invisible.

Flavor Layer actions are the smallest layer in terms of mechanical impact and the largest in terms of world presence. They are why the forge feels inhabited.

---

## What Gets Protected — The Design Principles Going Forward

Every future decision in this area must honor these principles. They are the things we protect.

1. **Permanent Pressure, Voluntary Relief.** The player administers their own breaks. The game does not provide them. Nothing in cozy time punishes absence.
2. **The Cozy Time Rule.** Non-forge activities are texture, never gates. The instant something becomes required, it has failed.
3. **The Craft Determinism Rule.** Earned rewards are safe. Skill affects multipliers, never identity or survival.
4. **The Three-Layer Separation.** Craft decisions, Hammer skill, and Flavor presence are distinct. Mixing them collapses the design.
5. **Walkaway-safe between actions.** The player can set the game down at any decision state. The only "committed" windows are the brief QTEs themselves, which are short enough that committing to one does not commit to a session.
6. **Pacing Contrast.** Cozy time and adventure are tonal opposites. Do not add adventure-style pressure to cozy time. Do not add cozy-time looseness to adventure.
7. **Time is hours, legible, unambiguous.** No fictional fuzziness on the clock. The player always knows what they have left.
8. **Finish early rewards choice width, not power.** The game does not give the efficient player a bigger hammer. It gives them more options to consider.
9. **The weapon is long-lived.** Forge sessions advance the same weapon across the reign. They do not build fresh weapons each decree (except Session 1 and optional backups).

---

## The Fairy's Role in Cozy Time

The fairy is the through-line of drift. She lives at the forge. She comes along on adventures. She has opinions about decrees, materials, and the prodigy's decisions.

Her specific function in cozy time:

- **She is the cozy time companion for players who opt in.** The LLM conversation is the window into her character. Players who engage with her get a permanent presence who remembers, reacts, and grumbles. Players who do not engage with her still get a complete game.
- **She appears during drift, not during committed forge actions.** Interrupting a Hammer QTE to chat would break both the QTE and the character. She is available when the player is between things.
- **Her heals in adventure feel like repairs, not blessings.** This is a worldbuilding note but it affects cozy time: players who watch her heal will eventually notice she is using craft language and smithing gestures. The reveal of her identity pays off across hundreds of drift conversations and combat heals, not through any single scripted moment.
- **End-of-day is her moment.** Players who engage with her during the day-to-night transition get her most reflective voice. This is a pacing beat the arc naturally provides.

---

## What Block 2 Does Not Cover

Flagged for future jams. Do not treat any of these as open questions to resolve *in* Block 2 — they are the next blocks of work.

- **The Craft Layer atomic actions (verbs).** Combine, graft, strip, rework, unmake, enchant, apply-technique, and whatever else turns out to belong at the Craft Layer. Each verb needs a purpose, an hour cost, a relationship to the weapon schema, and a place in the player's decision space. Combine is the signature verb and should be defined first, then used as a model for the others.
- **The Weapon Schema (Block 3 foundation).** Named parts, slots, or regions the craft verbs target. Complexity comparable to or deeper than Path of Exile equipment. Craft verbs cannot be fully defined until this exists, even in sketch form.
- **The Break-and-Rebuild granularity.** Full unmake vs. partial rework vs. stripping a single enchantment are three different player actions and should not be one verb. Each needs its own scope, cost, and consequence.
- **The Hammer Layer specifics.** What the quality multiplier math looks like. Whether it has diminishing returns, per-session caps, or reign-long caps. How the QTE scales from early reign to late reign. Specific input pattern.
- **The Flavor Layer inventory.** What flavor actions exist beyond sharpening. How to keep the layer fresh without it becoming work.
- **The Market and other drift activities.** What the market looks like. What other drift activities exist. How they stay texture rather than mechanics.
- **Decree intel depth.** Exactly what the player knows about a decree at Intake (map and objective are confirmed; anything beyond that is open).
- **Finish-early tuning.** The exact curve between hours remaining and reward slots gained. 3→4→5 is the rough shape but the thresholds are not set.
- **Session 1 first-weapon flow.** The special case of building from nothing instead of advancing an existing weapon. The five-phase arc still applies; the Work phase just has an implicit "start a weapon" first action.
- **Backup weapon workflow.** How the forge UI handles parallel weapons. How the player switches focus between them within a Work phase.
- **Tempering as a mechanic.** Flagged in `AdventureModeJam.md` as unresolved. Likely lives somewhere between Craft and Hammer layers. Needs its own design pass once Craft verbs are locked.
- **Accessibility modes for QTE skill expression.** Real concern, not a Block 2 question.
