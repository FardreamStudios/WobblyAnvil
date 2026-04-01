# Engagement System Spec

**Status:** ✅ LAW — This is the authoritative spec for turn order, action economy, action cam, and combo systems.  
**Supersedes:** ATB & Pip Economy (§4), Formation Turn (§5), Action Cam & Exchanges (§6) in `ScavengeBattleSpecs.md`. Those sections are now outdated and should reference this document.  
**Date:** 2026-04-01

---

## 1. Overview

The engagement system governs how combatants take turns, spend resources, and interact during combat. It replaces the pip-based ATB system with a simpler initiative + action point model.

Three pillars:

- **Initiative** — who goes when. Rolled once per fight, fixed sequence.
- **Action Points (AP)** — what you can afford. Earned each turn, carries over, visible on all combatants.
- **Action Cam** — one trade. Initiator swings, responder can counter or eat it. Cam out.

---

## 2. Initiative

### Roll

At the start of each fight (and each new wave), every combatant rolls for position in the turn order.

**Roll = Speed + random(0, variance)**

Higher speed = consistently near the front, but not guaranteed. Two combatants with similar speed will sometimes trade positions fight to fight. A significantly faster combatant will always outroll a slow one.

### Sequence

The roll produces a fixed turn order for the entire fight. It repeats as a cycle — when everyone has acted once, a new round begins with the same sequence.

The sequence only changes mid-fight when:

- **An enemy dies** — removed from the sequence, remaining order unchanged.
- **A delayed skill is committed** — the caster's portrait temporarily repositions (see §6).

### Visibility

The turn order is displayed as a strip of portraits. Current turn highlighted. Upcoming turns visible. The player can always see who's next and plan accordingly.

### Wave Reroll

When a new wave begins, initiative is rerolled for all living combatants plus the new enemies. Fresh sequence for the new wave.

---

## 3. Action Points (AP)

### Concept

AP is the universal resource for all actions. It replaces the pip system entirely. There are no pips.

### Rules

- Every combatant has an **AP pool** with a shared maximum (tunable, starting value TBD — likely 100).
- Each turn, the combatant **earns AP** based on their speed stat. Faster characters earn more AP per turn.
- AP **carries over** between turns. Unspent AP is never lost.
- AP **caps at the maximum**. If you're already full, earned AP is wasted — incentive to spend rather than hoard indefinitely.
- AP is **visible** on all combatants (party and enemies) as a thin white bar under the HP bar.

### Earn Rate

Base earn per turn is scaled by speed. Exact formula TBD (playtest), but the principle: a fast character might earn 50 AP per turn, a slow character 30 AP. Same turn frequency, different purchasing power.

### Why Not Pips

Pips were confusing — "3 pips, everything costs 1 pip" meant no real decision. AP creates granular budgets where skills have meaningfully different costs, saving up is a real strategy, and spending everything leaves you visibly vulnerable.

---

## 4. Formation Turn

### Trigger

When a combatant's position comes up in the initiative sequence, their formation turn begins.

### Actions

All actions cost AP. The combatant can chain multiple actions in any order until they run out of AP or choose to end their turn.

| Action | AP Cost | Effect | Enters Cam? |
|--------|---------|--------|-------------|
| Immediate Skill | Varies by skill | Opens action cam, one trade | Yes |
| Delayed Skill | Varies by skill | Ends turn, places marker on turn order strip (see §6) | No |
| Item | Low (TBD) | Use consumable. Immediate effect. | No |
| Defend | Low (TBD) | Grants defensive buff. Immediate. | No |
| Intercept | Low (TBD) | Buff on target ally — next attack aimed at them redirects to the caster. Caster gets the defensive QTE. One-shot. | No |
| Taunt | Low (TBD) | Debuff on target enemy — that enemy's next attack must target the caster. Caster gets the defensive QTE. One-shot. | No |
| Flee | High (TBD) | Roll chance. Success = exit battle. Fail = AP spent, turn over. | No |
| Wait | 0 | End turn. Keep all AP. Earn AP again next turn. Used to bank AP for a bigger future turn. | No |

### No In-Cam Items or Buffs

Items, Defend, Intercept, and Taunt are formation-only actions. The action cam is pure combat — attack and defend. All support actions happen before you commit to the cam.

### Turn End

The formation turn ends when:

- The combatant chooses an immediate skill (enters action cam, resolves, cam out, turn over).
- The combatant chooses a delayed skill (turn ends immediately, portrait repositions).
- The combatant chooses Wait.
- The combatant runs out of AP.
- The combatant flees (success or fail).

After the turn ends, the next combatant in the initiative sequence acts.

---

## 5. Action Cam — One Trade

### Intent

The action cam is a focused cinematic burst. One exchange of violence. In, clash, out. No drawn-out back-and-forth.

### Flow

1. Initiator picks an immediate skill during their formation turn.
2. Action cam zooms in on initiator and target.
3. **Initiator attacks:** Chalkboard QTE (front-loaded offense) → results → cinematic playback.
4. **Responder reacts:** If the responder has enough AP, they can choose to counter (costs AP). If they counter, they perform their own Chalkboard QTE → results → cinematic playback. If they don't counter (or can't afford it), they eat the damage.
5. Cam zooms out. Both combatants return to the formation view. Turn over.

### One Trade Only

There is no back-and-forth. Initiator swings once, responder gets one chance to counter. That's the full exchange. No RELENT, no PASS, no multi-round exchanges.

### Counter Decision

The responder's counter costs AP. This is the key decision:

- **Counter:** Spend AP to hit back. You deal damage but your AP pool is lower for your next formation turn.
- **Eat it:** Take full damage but conserve AP. Come back stronger on your own turn.
- **Can't counter:** If AP is too low, you have no choice — you're exposed. The initiator gets a free swing.

Reading enemy AP matters. If you see an enemy sitting at low AP, you know you can swing into them for free. If they're loaded, expect a counter.

### Defensive QTE

When you're being attacked (whether as the responder or during a counter), the defense system from `CombatFeelSpec.md` applies: animation-read defense with brace (tap) and dodge (swipe) timing windows around the strike anchor. This costs nothing — defensive reactions are free skill checks, not AP spends.

### Channeling Combatants Cannot Defend

If the responder is currently channeling a delayed skill (see §6), they cannot perform defensive QTEs. They eat full damage from every beat. This is the risk of committing to a delayed skill.

---

## 6. Delayed Skills & Combos

### Delayed Skills

Some skills (typically big AOE or powerful effects) don't fire immediately. When a combatant picks a delayed skill during their formation turn:

1. AP is spent immediately.
2. The turn ends.
3. The combatant's portrait on the turn order strip slides forward by a fixed number of positions (2 positions for V1 — flat, all delayed skills use the same delay).
4. A skill icon/marker appears on their portrait showing what's cooking.
5. The combatant enters a **channeling state**.

### Preview

When selecting a delayed skill, the turn order strip previews where the caster will land. The player can see whether an enemy turn falls between their delayed marker and an ally's pending delayed marker. This is the combo planning moment.

### Channeling State

While channeling:

- The combatant's sprite shows a visible charging animation/glow.
- They **cannot defend** — no brace, no dodge. All incoming attacks deal full damage.
- They **can be killed**. If killed before the delayed skill fires, the skill fizzles. AP already spent is lost.
- Their team must protect them (via Intercept, Taunt, or killing threats).

### Firing

When the turn order reaches the delayed marker position, the skill fires automatically in formation view (no action cam). The channeling state ends. The combatant re-enters the normal initiative sequence at their original position.

### Combo Trigger

**If two delayed skills from the same side resolve back-to-back with no enemy turn between them, a secret combo triggers.**

The combo replaces the two individual skill effects with a fused super effect — unique animation, bonus damage, special properties. The combo is the payoff for coordinating timing and protecting your casters.

### Combo Setup Strategy

The player looks at the turn order and asks:

- "Are my two casters' delayed markers adjacent with no enemy between them?" → Combo is lined up.
- "There's an enemy between them." → Kill that enemy to remove them from the sequence, collapsing the gap.
- "The turn order doesn't work this fight." → Play normally, save combos for a better matchup.

Boss fights (one enemy) naturally have party members adjacent — bosses are where you flex your combos. Group fights require target prioritization to remove blockers. This creates organic difficulty scaling.

### Delay Length

All delayed skills delay by 2 positions in the turn order for V1. Flat, simple, predictable. The player always knows exactly where they'll land.

Future: possible short (2) and long (3) delay tiers if more variety is needed.

---

## 7. Protection Skills

Two formation-turn skills exist specifically to protect channeling allies (or any vulnerable combatant):

### Intercept

- **Target:** Cast on an ally.
- **Effect:** The next attack aimed at that ally is redirected to the caster instead. The caster receives the defensive QTE (brace/dodge).
- **Duration:** One-shot. Pops on the next relevant attack, then gone.
- **Cost:** AP (TBD).
- **Use case:** Cast on your channeling mage before they're attacked. The warrior takes the hit and gets to defend.

### Taunt

- **Target:** Cast on an enemy.
- **Effect:** That enemy's next attack must target the caster. The caster receives the defensive QTE.
- **Duration:** One-shot. Pops on the enemy's next attack, then gone.
- **Cost:** AP (TBD).
- **Use case:** Force a dangerous enemy to attack your tank instead of your channeling caster.

Both are formation-only actions. Both cost AP. Both are tactical tools for controlling who takes damage.

---

## 8. AP Visibility & UI

### Formation View

Each combatant displays:

- **HP bar** — colored (green for party, red for enemy), standard width.
- **AP bar** — thin white bar directly under HP bar. Same width, thinner height. Shows current AP as a fill percentage of the max.

Both bars visible on all combatants including enemies. Reading enemy AP is a core strategic skill.

### Turn Order Strip

Replaces the ATB gauge strip. Shows:

- Combatant portraits in initiative order for the current round.
- Current turn highlighted.
- Delayed skill markers on repositioned portraits (icon + glow).
- Combo-ready indicator when two friendly delayed markers are adjacent with no enemy between.
- Dead combatants removed from the strip.

### Action Cam Info Panels

The existing left/right info panels in action cam show:

- Name
- HP bar
- AP bar

Pip dots are removed entirely.

### AP Bar Visual States

| State | Visual |
|-------|--------|
| Partially filled | White fill against dark track |
| Full (capped) | Brighter white or subtle glow — signals "spend or waste" |
| Near empty | Dim, possible warning pulse — signals vulnerability |
| Spending | Quick drain animation on action commit |

---

## 9. What This Replaces

This spec supersedes the following sections in other documents:

| Old Spec Section | Status | What Changed |
|------------------|--------|-------------|
| ScavengeBattleSpecs §4 — ATB & Pip Economy | **Replaced** | Pips removed. AP replaces all resource management. ATB is now initiative-only. |
| ScavengeBattleSpecs §5 — Formation Turn | **Replaced** | New action list, AP costs, no in-cam items, Wait action, delayed skills. |
| ScavengeBattleSpecs §6 — Action Cam & Exchanges | **Replaced** | One trade only. No RELENT, no PASS, no multi-round exchanges. Counter costs AP. |
| ScavengeBattleSpecs Revision Addendum — Pip Persistence | **Superseded** | AP carry-over replaces pip persistence. Same intent, cleaner system. |
| ScavengeBattleSpecs Revision Addendum — Exchange Restructure | **Superseded** | One-trade model replaces 3-round exchange structure. |
| ScavengeBattleSpecs Revision Addendum — Action Tiers | **Superseded** | Skill AP costs replace tier system. Same granularity, simpler model. |
| BattleTerminology — Pip, Formation Turn, RELENT, PASS | **Updated** | Pip → AP. RELENT/PASS removed. Formation turn redefined. |

The following sections remain valid and unchanged:

- Combo Beat System (§7) — beats, rings, swings still 1:1:1.
- Defensive Input (§8) — brace/dodge still works as designed.
- Choreography (§9) — all CSS-driven choreography unchanged.
- CombatFeelSpec — Chalkboard offense + animation-read defense unchanged.
- HP, KO & Items (§11) — HP/KO rules unchanged. Item USE now formation-only.
- Enemy System (§10) — enemy data unchanged, AI decisions adapt to AP model.
- Battle Config & Result (§2) — config shape adds AP fields, result shape unchanged.

---

## 10. Open Questions

| # | Question | Status | Notes |
|---|----------|--------|-------|
| 1 | AP max value | TBD — playtest | 100 is a clean starting point. Affects all cost tuning. |
| 2 | AP earn rate per speed point | TBD — playtest | Needs to feel meaningful without making speed the god stat. |
| 3 | Skill AP costs — ranges | TBD — design | Quick jab ~20, combo ~40, finisher ~60, delayed ~50-70? Needs full skill cost pass. |
| 4 | Item / Defend / Intercept / Taunt AP costs | TBD — design | Low enough to always be affordable, high enough to feel like a spend. ~15-20? |
| 5 | Flee AP cost | TBD — design | High. Should feel like a major commitment. ~60-80? |
| 6 | Counter AP cost | TBD — design | Needs to be meaningful enough that "eat the hit" is sometimes correct. ~20-30? |
| 7 | Initiative variance range | TBD — playtest | Too low = deterministic. Too high = speed doesn't matter. |
| 8 | Combo recipes | TBD — content | Which delayed skill pairs produce which combos? Content authoring task, not system design. |
| 9 | AP bar visual polish | TBD — art | Exact colors, glow effects, drain animation style. |
| 10 | Enemy AI — AP spending behavior | TBD — design | V1: simple (always attack if affordable). Future: personality-driven spending, saving, baiting. |
| 11 | Wait — any limit? | TBD — playtest | Can you Wait forever? Probably fine — enemy keeps attacking you, you're just banking while taking damage. Natural pressure to act. |
| 12 | Delayed skill — can you cancel? | Decided: No | You committed the AP. It fires or you die. |
| 13 | Multiple delayed skills from same caster? | TBD — design | Probably no — one channel at a time. Keeps it simple. |

---

## 11. Terminology Updates

| Term | Old Meaning | New Meaning |
|------|-------------|-------------|
| **Pip** | ATB segment, spent on actions | **Removed.** Replaced by AP. |
| **ATB Bar** | Visual fill bar showing pip progress | **Removed.** Replaced by turn order strip. |
| **AP (Action Points)** | Did not exist | Universal action resource. Earned per turn, carries over, caps at max. |
| **Initiative** | Did not exist | Speed-weighted random roll at fight start. Determines fixed turn order. |
| **Formation Turn** | Triggered at 3 pips full | Triggered when your position comes up in initiative order. |
| **Wait** | Did not exist | Free action. End turn, keep AP, earn more next turn. |
| **RELENT** | Initiator ends exchange | **Removed.** Exchange is always one trade. |
| **PASS** | Responder yields turn | **Removed.** Responder counters or doesn't. |
| **Exchange** | Multi-round in-cam back-and-forth | One trade. Initiator swings, responder optionally counters. Done. |
| **Counter** | Free responder attack | Costs AP. Optional. The core in-cam decision. |
| **Delayed Skill** | Did not exist | Skill that repositions caster on turn order, fires later. Caster channels. |
| **Channeling** | Did not exist | State while waiting for delayed skill to fire. Can't defend. Vulnerable. |
| **Intercept** | Did not exist | Buff on ally. Redirects next attack on them to the caster. |
| **Taunt** | Did not exist | Debuff on enemy. Forces their next attack onto the caster. |
| **Combo Trigger** | Did not exist | Two friendly delayed skills resolve back-to-back with no enemy turn between. |
| **Turn Order Strip** | ATB gauge strip showing fill bars | Portrait queue showing initiative sequence + delayed markers. |