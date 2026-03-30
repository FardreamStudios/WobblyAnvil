# ATB & Action Economy — Design Notes

**Parent:** `ComboBeatSpec.md`  
**Status:** 🟡 DRAFT — Decisions from jam session baked in. Nothing set in stone — needs playtesting to validate feel.

This section defines WHEN and WHY attacks happen, who gets to act, and how the action cam round plays out. The combo beat system (in `ComboBeatSpec.md`) defines what happens INSIDE an attack.

---

## ATB as Pip Bars

ATB is a **3-pip segmented bar** for every combatant. Speed stat controls fill rate, not pip count.

- Every combatant has **3 pips** (fixed).
- Pips fill **sequentially left-to-right** — pip 1 fills completely, then pip 2 starts, then pip 3.
- Visually reads as **one continuous bar with section dividers**, not 3 separate dots.
- Fill rate per pip: `pipFillMs / atbSpeed` (base 2000ms at speed 1.0 — fast, not waiting around).
- When all 3 pips are full, that combatant's **turn starts**. ATB freezes globally.
- Pips do **not carry across turns** — when your turn ends (any reason), remaining pips are lost and bar resets to empty.

### Visual States

| Pip State | Visual |
|-----------|--------|
| Empty | Dark segment |
| Filling | Animated fill within the segment (like a progress bar inside a cell) |
| Full | Solid bright segment |
| All 3 full | Glow/pulse on the whole bar — "ready to act" |

### Freeze Rules

- **Global freeze when anyone is acting.** Action cam, out-of-cam turn, action select menu — everything pauses for everyone.
- Simple, predictable, no edge cases with half-ticking bars.

---

## Turn Flow (Out-of-Cam)

When a combatant's pips fill, they get a turn in formation view. They can chain actions until pips run out or they attack.

### Rules

- **Each action costs 1 pip** (attack, defend, item, pass, flee — all cost 1).
- **Maximum one attack per turn.** When you attack, action cam opens. When the exchange resolves, your turn is **over** regardless of remaining pips. Remaining pips are lost.
- **Non-attack actions can chain freely:** item → item → attack (3 pips). Or item → defend → pass (3 pips, no attack).
- **Pass costs 1 pip.** It's not free — burns a pip and ends your turn. Discourages stalling.
- **Turn ends when:** all pips spent, or attack's action cam resolves, or you pass.

### Pip Costs

| Action | Pip Cost | Enters Cam? | Notes |
|--------|----------|-------------|-------|
| Attack (melee) | 1 | YES | Picks skill → enters action cam. Turn over when cam resolves. |
| Defend (stance) | 1 | NO | Grants defense buff for next incoming exchange. |
| Item | 1 | NO | Instant. Stays in formation view. |
| Pass | 1 | NO | Ends turn. Burns a pip. |
| Flee | 1 | NO | Roll flee chance. Fail = pip spent, turn continues if pips remain. |

### Example Turn

```
Smith (3 pips full):
  → Use healing potion (1 pip, instant, 2 remain)
  → Attack raccoon with Slash (1 pip, action cam opens)
  → Exchange plays out (attack QTE → defense QTE → etc.)
  → Cam resolves → Smith's turn OVER. 1 remaining pip lost. Bar resets.
```

---

## Action Cam — Exchange Round

The action cam is a **back-and-forth exchange** where both sides spend pips. Not a scripted cutscene.

### Flow

```
1. ATTACKER spends pip on attack skill → action cam opens
2. Attacker's combo plays (offensive QTE) → defender reacts (defensive QTE, free)
3. After attack resolves:
   → Defender gets a response IF they have pips
   → In-cam action select: Attack / Defend / Item / Pass
   → If defender attacks: QTE roles flip — attacker now defends (free)
4. After defender's action resolves:
   → Attacker can spend another pip or relent
5. Repeat until:
   → Attacker relents (only attacker can choose to end)
   → Attacker out of pips
   → Both sides out of pips
6. Action cam closes → formation view → turn is OVER → ATB resumes
```

### Key Rules

- **Defending is free.** The defensive QTE (tap/swipe) costs no pip. Your free reaction.
- **Counter-attacking costs a pip.** Choosing "Attack" in the in-cam menu spends a defender pip.
- **Attacker initiative.** Only the attacker can relent (choose to stop). Defender can't force the cam closed.
- **If defender has no pips, they can't counter.** Attacker gets free actions until they run out or relent.
- **Defender can only target the attacker.** In-cam attacks are always directed at whoever initiated.
- **What happens to defender's unspent pips after exchange?** TBD — needs playtesting. Feels wrong to wipe them since defender didn't choose to enter. **Candidate rule:** defender keeps unspent pips, attacker loses theirs (they initiated).

### In-Cam Action Menu

Separate UI from formation-view actions. Preserves muscle memory — flee is never in-cam, pass replaces it.

| Button | What It Does |
|--------|-------------|
| **ATK** | Spend 1 pip. Pick skill (targets attacker only). QTE roles flip. |
| **DEF** | Spend 1 pip. Buff defense for remaining beats this exchange. |
| **ITEM** | Spend 1 pip. Use item (instant, no QTE). |
| **PASS** | Spend 1 pip. Give initiative back to attacker. |

### Example Exchange

```
Smith (3 pips) attacks Raccoon (3 pips):

  Smith spends 1 pip → Slash (3-beat offensive QTE)
  Raccoon defends (free defensive QTE)
  Raccoon's in-cam menu: chooses ATK, spends 1 pip → Bite (2-beat counter)
  Smith defends (free defensive QTE)

  Smith spends 1 pip → Slash again
  Raccoon defends (free)
  Raccoon spends 1 pip → Bite again
  Smith defends (free)

  Smith has 1 pip left. Relents.
  Action cam closes. Smith's turn over. 1 pip lost. Bar resets.
  Raccoon has 1 pip remaining — TBD: keep or lose?
```

---

## Rows: Front and Back (Future — Not V1)

Combatants in rows. Affects targeting and action cam grouping. **Noted for future, not building yet.**

- **Front row:** Melee range. Can attack and be attacked.
- **Back row:** Ranged only. Melee can't reach unless front row empty.
- Action cam pulls both rows in (attacker's row vs target's row).
- AoE hits entire target row.

---

## Ranged Attacks (Future — Not V1)

- Enter action cam but target gets **no defensive QTE**
- Attack just lands based on attacker's offensive QTE
- No counter-play by default

---

## Defend Stance

Spending a pip on Defend (out-of-cam or in-cam):

- Grants defense buff for next incoming exchange (or remaining beats if in-cam)
- Better `blockMult` on all defensive beats
- Visual: character enters brace pose, glows blue
- Buff consumed when character next defends

---

## AoE Attacks (Future — Not V1)

- Hit entire target row
- Offensive QTE plays as normal
- On defense: player's tap/swipe applies to all row members
- Different characters may have different defense stats → same input, different damage results

---

## Turn Order Display

- Show 3-segment bar per combatant
- Filled segments = ready. Filling segment = currently charging.
- Clear visual distinction between "filling" and "full"
- Could show predicted turn order (who fills next) — future polish

---

## Open Questions (Playtest to Resolve)

1. **Defender pip retention after exchange** — keep unspent pips or lose them? Leaning keep, but needs feel testing.
2. **Enemy AI pip spending** — do enemies always spend all pips attacking, or do they sometimes defend/item/pass? V1: enemies always attack. Future: personality-driven.
3. **Pip fill rate tuning** — 2000ms base feels right on paper. May need adjustment once real exchanges are flowing.
4. **Flee success formula** — flat chance? Based on speed diff? TBD.
5. **Multi-member party turn ordering** — when two party members fill at the same time, who goes first? Speed tiebreaker? Player choice?

---

## Summary: What This Changes from Original Spec

| Decision | Original Spec | Updated |
|----------|--------------|---------|
| Pip count | Speed stat = pip count (variable) | Fixed 3 pips for everyone |
| Speed stat | Determines pip count | Determines fill rate only |
| Pip retention | Unspent pips carry over | Pips lost when turn ends (attacker). Defender TBD. |
| Pass cost | Not specified | Costs 1 pip (not free) |
| Attacks per turn | Unlimited (spend pips) | Max 1 attack per out-of-cam turn. Cam resolves = turn over. |
| ATB freeze | Varied by action type | Always global freeze |
| Max exchange rounds | Unbounded | Unbounded (let it ride, bounded by pip count) |