# Scavenge Battle Specs — Revision Addendum

**Date:** 2026-03-30
**Status:** 📝 DRAFT — Review before merging into main spec
**Affects sections:** §4 (ATB & Pip Economy), §5 (Formation Turn), §6 (Action Cam & Exchanges), §11 (HP, KO & Items — Block replacing Defend), §18 (Open Questions). New systems: Poise & Stagger, Weapon-to-Combo, Forge-to-Combat.

---

## Summary

Pips are no longer "spent and lost at end of turn." Pips ARE the ATB bar. You spend them on actions and your bar refills from wherever you left it. This turns every pip spend into a deliberate tempo trade: present impact vs future turn speed.

Exchanges are restructured as fixed 3-round sequences with a built-in cost asymmetry between initiator and responder. The initiator pays per round; the responder gets free basic counters. This creates natural risk/reward tension and makes RELENT a tempo strategy rather than an escape hatch.

---

## Revision: §4 — ATB & Pip Economy

### What changes

**Pips persist across turns.** When a formation turn ends, unspent pips stay on the bar. ATB only needs to refill the spent pips, not reset to zero. A combatant who spends 1 pip is back in action much sooner than one who spends all 3.

### Old rule (replace)

> Pips do not carry across formation turns — when your turn ends, remaining pips are lost and bar resets.

### New rule

Pips are a persistent resource. Your formation turn triggers when all 3 pips are full. Any pips you spend during your turn (formation actions, exchange rounds, in-cam upgrades) are deducted from the bar. When your turn ends, ATB resumes refilling from whatever count remains. Unspent pips are never lost.

### Tempo implications

- Spend 1 pip (quick exchange, RELENT after round 1) → refill 1 pip → next turn comes fast.
- Spend all 3 pips (full 3-round exchange) → bar is empty → long wait before next turn.
- This makes speed stat more meaningful: fast characters can afford aggressive spending because their refill penalty is shorter. Slow characters benefit from conservative play — hit once, RELENT, conserve.

---

## Revision: §5 — Formation Turn

### What changes

Formation turn still triggers at 3 pips full. Actions still cost pips (DEF = 1, ITEM = 1, FLEE = 3). The change is that attacking enters an exchange which has its own pip-spending rules (see §6 revision below), and leftover pips persist after the turn ends.

### Old rule (replace)

> Maximum one attack per formation turn. Attack opens the action cam. When the exchange resolves, the turn is over regardless of remaining pips. Remaining pips are lost.

### New rule

Attack opens the action cam and begins an exchange (see §6). Each round the initiator attacks costs 1 pip. When the exchange ends (via RELENT or 3 rounds completed), the formation turn ends and ATB resumes refilling from remaining pip count. Unspent pips are never forfeited.

### Pre-exchange spending still works

You can still chain non-attack actions before entering an exchange: DEF (1 pip) → ATK (opens exchange with 2 pips remaining). You'd have 2 rounds of budget in the exchange instead of 3. This is a real trade — the DEF buff might be worth a shorter exchange.

---

## Revision: §6 — Action Cam & Exchanges

### What changes

Exchanges are restructured from variable-length to fixed 3-round maximum. The cost model is asymmetric: initiator pays per round, responder gets free basics but can optionally spend pips to upgrade.

### Exchange structure

Each exchange has up to **3 rounds**. Each round:

1. **Initiator acts** — chooses a combo tier (see Action Tiers). Minimum 1 pip (basic attack). Can spend 2-3 pips for heavier combos. Can RELENT instead (free, ends exchange immediately).
2. **Responder reacts** — free basic counter (single weak swing, chip damage). Can optionally spend pips to upgrade their counter to a combo tier.

The number of rounds is driven by how the initiator spends pips. Spending all 3 pips on a single devastating combo = 1 round, 1 free counter taken. Spreading 1 pip across 3 rounds = 3 rounds, 3 free counters taken. The initiator is choosing between **damage concentration vs exposure**.

Exchange ends when: initiator RELENTs, initiator has 0 pips, or 3 rounds complete.

### Action tiers (NEW)

Pip spending determines combo quality. The initiator pays at least 1 pip per round. The responder gets a free basic but can spend pips to upgrade.

| Pip cost | Tier | Initiator | Responder |
|----------|------|-----------|-----------|
| 0 (free) | Basic counter | — (not available) | Single weak swing. Chip damage. The freebie. |
| 1 | Basic attack | Single attack. Minimum cost to stay in the exchange. | Upgraded counter — matches initiator basic. |
| 2 | Combo | Multi-hit combo. Real damage, multiple QTE rings. | Strong counter-combo. Costs 2 pips from their ATB. |
| 3 | Finisher | Full-budget devastation. Most hits, highest damage. Bar empty after. | All-in counter. Huge commitment — bar nearly empty for their own turn. |

**The key trade-off for initiators: concentration vs exposure.**

| Strategy | Pips spent | Rounds | Free counters taken | Tempo cost |
|----------|-----------|--------|---------------------|------------|
| 3 × basic attack | 3 (1+1+1) | 3 | 3 | Bar empty, 3 hits absorbed |
| 1 × combo + RELENT | 2 | 1 | 1 | 1 pip saved, 1 hit absorbed |
| 1 × finisher | 3 | 1 | 1 | Bar empty, but only 1 hit absorbed |
| 1 × basic + RELENT | 1 | 1 | 1 | 2 pips saved, fastest ATB refill |

The finisher vs 3× basic choice is the core decision: same pip cost, but the finisher concentrates damage into 1 round and only eats 1 free counter, while 3× basic spreads damage across 3 rounds and eats 3 free counters. Finisher is almost always better for damage efficiency — but the multi-round approach gives you RELENT exit points if things go wrong.

### RELENT (revised role)

RELENT is no longer just "end the exchange." It's a **tempo strategy.** The initiator can RELENT at the start of any round (before spending that round's pip). Reasons to RELENT:

- QTE went poorly last round — cut losses instead of paying another pip for bad damage.
- You've done enough damage — save remaining pips for faster ATB refill.
- Responder is about to die to chip damage anyway — no need to spend more.
- You entered the exchange with only 1-2 pips after formation spending — you've run your budget.

### Cost asymmetry — why it balances

The initiator/responder dynamic is inherently asymmetric and that's the point:

**Initiator advantages:**
- Chooses WHEN to engage (controls battlefield tempo).
- Chooses WHO to target.
- Chooses WHEN to leave (RELENT).
- Gets first strike every round.

**Responder advantages:**
- Free basic counter every round (chip damage at no cost).
- Every round the initiator stays = another free hit on them.
- Pip spending is optional — can save entire budget for their own formation turn.
- Didn't choose to be here, but isn't helpless.

**The longer the initiator stays, the more the responder benefits.** This is the core tension. But the initiator controls how long they stay AND how they distribute pips. A 3-pip finisher in round 1 gives the responder only 1 free counter. Three 1-pip basics across 3 rounds gives them 3. The initiator's pip distribution IS the balance lever.

### Responder pip spending — when is it worth it?

The responder's decision every round: "Is upgrading my counter worth delaying my next formation turn?"

Worth it when:
- Initiator is low HP — spend pips to finish them NOW instead of waiting for your own turn.
- You have a type advantage or buff that makes your counter extra effective this moment.
- The initiator is about to RELENT and this is your last chance to hit them in-cam.
- The initiator committed a finisher — you're only getting 1 round, make it count.

Not worth it when:
- You're healthy and the initiator is spreading basics across 3 rounds — let them feed you 3 free counters while you chip away for nothing.
- Your formation turn is more valuable (need to FLEE, need to ITEM, need to target someone else).
- You're saving pips for a combo or finisher on YOUR initiative.

---

## Revision: §18 — Open Questions (updates)

### Resolved by this addendum

| Question | Old status | Resolution |
|----------|-----------|------------|
| Responder pip retention after exchange | TBD — playtest | **Resolved.** All unspent pips persist for everyone. No arbitrary pip loss. ATB refills from remaining count. |
| PASS action | TBD — playtest | **Removed.** PASS no longer exists. The responder always gets a free basic counter — there's no "yielding" because the exchange structure is fixed rounds, not alternating turns. |
| Initiator multi-pip rounds | TBD — design | **Resolved.** Yes. Initiator can spend 1, 2, or 3 pips in a single round. This is the core strategic choice — concentration vs exposure. |
| Can responder spend 2+ pips in a single round? | TBD — design | **Resolved.** Yes. Same tier table as initiator (minus the free basic). Responder can go all-in on a counter if they choose. |

### New open questions from this addendum

| Question | Status | Candidates |
|----------|--------|------------|
| Tier-to-beat mapping | TBD — design | How do tiers translate to beat arrays? 1 pip = 1 swing, 2 pip = 3 swings, 3 pip = 5? Skill definitions per tier? |
| Responder free basic — how weak? | TBD — playtest | Needs to be worth animating but not so strong that initiating feels punished. Single swing, flat low damage ignoring attack stat? Percentage of normal damage? |
| DEF/ITEM in-cam under new model | TBD — design | Block is available as a pip-spend option in-cam (same as formation). Item still available in-cam. Responder menu: free basic counter, or spend pip(s) on upgraded counter / Block / Item. |
| Defend buff stacking | — | **Resolved.** Replaced by Block system. See §11 revision. No stacking problem — Block is a single depletable value. |
| Finisher balance | TBD — playtest | 3-pip finisher in 1 round vs 3× basic across 3 rounds: same pip cost, very different risk profiles. Does finisher need to be proportionally stronger to justify no RELENT exit points? |
| Poise bar tuning | TBD — playtest | Per-enemy poise values, stagger duration, damage multiplier. See Poise & Stagger section. |
| Weapon combat profiles | TBD — design | Swing counts per tier per weapon type. See Weapon Type → Combo Template section. |
| Forge quality combat impact | TBD — playtest | attackPower multiplier and beat count modifier per quality tier. See Forge Quality → Combat Output section. |

---

## Revision: §11 — Block (Replacing Defend)

### What changes

The current Defend action grants a flat +3 defensePower buff that stacks and persists until ATB refill. This is replaced with a **Block** system inspired by Slay the Spire: flat damage absorption that depletes as you take hits.

### Old rule (replace)

> Defend: Costs 1 pip. Grants +3 defensePower buff until this combatant's ATB fills again. Stacks with itself.

### New rule

**Block** — Costs 1 pip. Grants a flat Block value (tunable, e.g. 8). Incoming damage is subtracted from Block first. When Block reaches 0, remaining damage hits HP. Block clears at the start of this combatant's next formation turn — you can't turtle forever.

### Why this is better

- **Readable on mobile.** Just a number on the character: "Block: 8". Player instantly knows how many hits they can absorb.
- **Creates real decisions.** "Do I Block before a heavy exchange or save that pip for a counter-attack?"
- **No stacking problem.** Block is a single value, not a cumulative buff. Refreshing Block replaces the old value (or adds to it — TBD playtest). Either way, there's a natural ceiling.
- **Works in both formation and in-cam.** Spend 1 pip on Block before entering an exchange, or spend 1 pip on Block mid-exchange as responder. Same mechanic, different contexts.

### Open questions

| Question | Status | Candidates |
|----------|--------|------------|
| Block value per pip | TBD — playtest | Flat 8? Scaled by defensePower stat? Weapon-dependent? |
| Block stacking | TBD — playtest | Does a second Block add to existing value, or replace it? |
| Block vs Brace interaction | TBD — design | Does Brace reduce damage before or after Block absorbs? Or does Brace apply to the portion that gets through Block? |

---

## New System: Poise & Stagger

### Intent

Poise gives enemies a second bar to solve beyond HP. Each enemy type has a poise vulnerability — the player has to figure out WHAT moves the bar through experimentation. This creates a knowledge progression: first visit to a zone is guesswork, return visits are informed prep.

### Rules

- Every enemy has a **Poise bar** (visible, separate from HP).
- When Poise reaches 0, the enemy is **Staggered** for 1 round: their free basic counter is disabled and incoming damage gets a multiplier (e.g. ×1.5).
- Poise resets to full after the stagger resolves.
- Different enemies have different **Poise vulnerability types** — only certain kinds of attacks move the bar.
- Players are NOT told the vulnerability type up front. They discover it through combat.

### Poise vulnerability types

| Type | What moves the bar | What doesn't | Best weapon/approach |
|------|-------------------|-------------|---------------------|
| **Volume** | Number of individual hits, regardless of damage | Heavy single hits barely register | Daggers, multi-swing combos |
| **Impact** | Only hits from 2+ pip combos | Basics and free counters bounce off | Hammers, finishers |
| **Elemental** | DoTs, staff debuffs, magic effects | Physical attacks do nothing to poise | Staff, enchanted weapons |
| **Sustained** | Any damage, but bar slowly regenerates if a full round passes with no hits | Hit-and-run tactics (RELENT early) | Aggressive multi-round exchanges |
| **Threshold** | Only single hits that exceed a damage threshold | Chip damage, multi-hit combos with low per-hit values | Buffed power attacks, high attackPower builds |

### Why this works for the game

- **Makes weapon choice matter before battle.** You're picking the right tool for the zone, not just highest damage.
- **Makes the forge inventory meaningful.** You want a toolkit, not one perfect weapon. More forging, more material hunting, more runs.
- **Multi-wave variety.** Wave 1 enemies might be Volume-weak, wave 2 might need Impact. One weapon can't solve everything.
- **Knowledge = power.** Matches the Slay the Spire philosophy — player skill and knowledge drive progression, not stat grinding.
- **Fairy integration.** After encountering an enemy type, fairy can give hints on future runs: "Those bag enemies don't flinch unless you really wallop them." Ties fairy knowledge system into combat prep.

### Open questions

| Question | Status | Candidates |
|----------|--------|------------|
| Poise bar size per enemy | TBD — design | Flat per enemy type? Scaled by wave/zone? |
| Stagger duration | TBD — playtest | 1 round feels right. Longer for bosses? |
| Stagger damage multiplier | TBD — playtest | ×1.5 baseline. Higher for specific vulnerability exploits? |
| Player poise | TBD — design | Do players have poise too, or is stagger enemy-only? Enemy-only is simpler for V1. |
| Visual tells | TBD — design | Does the poise bar color/icon hint at vulnerability type? Or fully blind until fairy hints? |

---

## New System: Weapon Type → Combo Template

### Intent

The weapon you forged determines how you fight. Different weapon types have fundamentally different combo feel, swing count, and poise interaction. This is the character differentiation layer — gear-driven, not class-driven.

### Weapon combat profiles

| Weapon type | Combo feel | Tier 1 swings | Tier 2 swings | Tier 3 swings | Poise strength | Trade-off |
|------------|-----------|--------------|--------------|--------------|---------------|-----------|
| **Dagger** | Fast, many hits, low per-hit | 2 | 4 | 6 | High volume, low impact | Great vs Volume poise, weak vs Threshold |
| **Hammer** | Slow, few hits, heavy per-hit | 1 | 2 | 3 | High impact, low volume | Great vs Impact/Threshold poise, weak vs Volume |
| **Sword** | Balanced | 1 | 3 | 4 | Medium both | Jack of all trades |
| **Staff** | Hits apply debuffs/DoTs | 1 | 2 | 3 | Elemental/Sustained poise | Utility over raw damage |
| **Shield+Weapon** | Lower damage, higher Block value | 1 | 2 | 3 | Low poise damage | Defensive playstyle, Block bonus on DEF action |

### How this connects to forge

The host maps weapon recipe → combo template before building BattleConfig. The battle system doesn't know "dagger" — it just sees a beat array with X swings at Y damage. The weapon type is a host-layer concept that the forge and the config builder understand.

### Open questions

| Question | Status | Candidates |
|----------|--------|------------|
| Swing counts per tier | TBD — playtest | Numbers above are starting points. Need to feel right with QTE ring pacing. |
| Weapon-specific QTE feel | TBD — design | Does a dagger QTE have faster rings? Hammer has slower but tighter timing windows? |
| Dual wielding / weapon switching | TBD — V2+ | One equipped weapon for V1. Switching mid-battle is future content. |

---

## New System: Forge Quality → Combat Output

### Intent

Your QTE skill at the anvil directly powers your combat. A better forge doesn't just sell for more gold — it fights better.

### Rules

- **Forge quality tier** (sloppy / decent / good / perfect) maps to a **bonus beat modifier** on the weapon's combo template.
- A sloppy-forged dagger might have 1 swing at tier 1. A perfect-forged dagger gets the full 2 swings. Same pip cost, different output.
- Quality also affects base attackPower delivered to BattleConfig — higher quality = higher damage per swing.

### Quality-to-combat mapping (draft)

| Forge quality | attackPower multiplier | Beat count modifier | Notes |
|--------------|----------------------|-------------------|-------|
| Sloppy | ×0.7 | -1 swing (min 1) | Functional but weak |
| Decent | ×0.85 | Base count | Standard output |
| Good | ×1.0 | Base count | Full designed potential |
| Perfect | ×1.15 | +1 bonus swing | Exceeds design — rewards mastery |

### Why this matters

- **Forge QTE has combat stakes.** You're not just chasing a sell price — you're building your loadout quality.
- **Skill progression feels real.** A player who masters the forge QTE literally hits harder and more often in battle.
- **Connects both halves of the game.** Adventure mode forge prep feels meaningful, not just a checkbox before the fun part.

### Open questions

| Question | Status | Candidates |
|----------|--------|------------|
| Quality → poise damage | TBD — design | Does a perfect weapon also do more poise damage? Or is poise purely weapon-type-driven? |
| Material tier interaction | TBD — design | Does bronze vs gold affect combo template, or just attackPower? Keeping it attackPower-only is simpler. |
| Visual feedback in battle | TBD — design | Does a perfect weapon glow or have different swing FX? Nice-to-have, not V1. |

---

## Phase transition impact

The legal transition graph in §3 needs minor updates:

- `CAM_WAIT_ACTION` logic changes — initiator always has ATK or RELENT. Responder always counters (free or upgraded). No PASS state.
- `CAM_RESOLVE` → either next round's `CAM_WAIT_ACTION` (if rounds remain and initiator has pips) or `ACTION_CAM_OUT`.
- Exchange round counter (1-3) becomes part of cam exchange state.

---

## Constants impact

`battleConstants.js` changes when implemented:

- `PIP_COSTS.pass` — remove entirely.
- `PIP_COSTS.defend` — rename or keep, but underlying mechanic is now Block grant, not buff.
- `DEFEND_BUFF` — replace with `BLOCK` config: `{ baseValue: 8, clearsOn: "formation_turn_start" }`.
- `IN_CAM_ACTIONS` — restructure. No PASS button. Responder menu becomes tier selection (basic free / spend to upgrade) + Block + Item.
- Add `EXCHANGE.maxRounds: 3`.
- Add action tier definitions (pip cost → beat count / damage multiplier).
- Add `POISE` config: `{ staggerDurationRounds: 1, staggerDamageMult: 1.5 }`.
- Add poise vulnerability type definitions per enemy.
- Add weapon combat profile table (weapon type → swing counts per tier, poise type strengths).
- Add forge quality → combat mapping table (quality tier → attackPower multiplier, beat modifier).
- ATB reset logic in `battleATB.js` changes from "reset to 0" to "reset to remaining pips."