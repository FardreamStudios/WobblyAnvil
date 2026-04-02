# Battle Terminology

**Single source of truth for naming across all battle specs and code.**  
**Last updated:** 2026-04-01  
**Authoritative engagement rules:** See `EngagementSystemSpec.md`

---

## Combatant Roles

| Term | Meaning |
|------|---------|
| **Initiator** | The combatant whose turn it is. They chose to attack and opened the action cam. They swing first. |
| **Responder** | The combatant being attacked. Pulled into the action cam. They can counter (costs AP) or eat the hit. |

---

## Action Hierarchy

Largest to smallest:

| Term | Meaning | Contains |
|------|---------|----------|
| **Exchange** | One trade inside the action cam. Initiator swings, responder optionally counters. Cam in → clash → cam out. | One initiator combo + one optional counter combo |
| **Combo** | The full sequence of swings that make up one attack. Defined by the skill. A 3-hit slash is a 3-swing combo. | Swings |
| **Swing** | A single attack within a combo. One lunge, one hit (or miss). The choreography unit — pull-back, snap-forward, impact, return. | One beat, one check |

---

## Data / Input / Visual — Three Lenses on the Same Moment

Each swing has three aspects. They are 1:1 but viewed from different angles:

| Term | Lens | Meaning |
|------|------|---------|
| **Beat** | Data | The stat block for one swing — damage, check type, swipe direction, blockable, dodgeable, SFX key, anim state. Lives in the skill definition. |
| **Check** | Input | A single QTE input within a combo. Generic term covering all input types. Each beat maps 1:1 to a check. Replaces "ring" as the generic term. |
| **Swing** | Visual | The choreographed motion — wind-up, strike, impact, return. What the player sees on screen. |

---

## Check Types (Offense)

Three input modes on the Chalkboard. Defined per-beat in the skill config.

| Check Type | Input | Scored On | Used For |
|------------|-------|-----------|----------|
| **Ring** | Tap | Tap timing against shrinking circle | Basic strikes, quick jabs, standard beats |
| **Swipe** | Directional swipe + release | Release timing against fill indicator | Slashes, directional attacks, combo transitions |
| **Circle** | Circular gesture + release | Release timing against orbital fill | Magic, AOE, charged attacks, finishers |

All three share three-tier scoring: **perfect**, **good**, **miss**.

---

## Initiative & Turn Order

| Term | Meaning |
|------|---------|
| **Initiative** | Speed-weighted random roll at fight start. Determines the fixed turn sequence for the entire fight. Rerolled on new wave or new fight. |
| **Turn order strip** | UI element showing combatant portraits in initiative sequence. Shows upcoming turns, delayed skill markers, and combo-ready indicators. Replaces the old ATB gauge strip. |
| **Round** | One full cycle through the initiative sequence. Every living combatant acts once per round. |

---

## Action Points (AP)

| Term | Meaning |
|------|---------|
| **AP (Action Points)** | Universal resource for all actions. Earned each turn (scaled by speed), carries over between turns, caps at a maximum. Visible on all combatants as a thin bar under HP. Replaces the old pip system. |
| **AP bar** | Thin white bar under HP bar. Visible on all combatants including enemies. Shows current AP as fill percentage of max. |
| **AP earn rate** | Amount of AP gained each turn. Scaled by speed stat — faster characters earn more per turn. |

---

## Turn Structure

| Term | Meaning |
|------|---------|
| **Formation turn** | Your turn in the initiative sequence. Spend AP on actions (skills, items, defend, etc.) until you choose to end the turn, commit to a skill, or run out of AP. |
| **Formation view** | The default zoomed-out view showing all combatants, turn order strip, AP/HP bars, and the action menu. Normal gameplay. |
| **Action cam** | The zoomed-in cinematic view during an exchange. Two combatants fill the screen. One trade only. |
| **Normal cam** | Synonym for formation view in CSS class naming (`normal-cam-*`). |

---

## Actions

| Term | Context | AP Cost | Meaning |
|------|---------|---------|---------|
| **Immediate Skill** | Formation turn | Varies by skill | Pick a skill, enter action cam, one trade. |
| **Delayed Skill** | Formation turn | Varies by skill | Ends turn. Caster repositions on turn order strip, enters channeling state. Fires later. |
| **Item** | Formation only | Low | Use a consumable. Immediate effect. |
| **Defend** | Formation only | Low | Grants defensive buff. Immediate. |
| **Intercept** | Formation only | Low | Buff on target ally. Next attack aimed at them redirects to the caster. One-shot. |
| **Taunt** | Formation only | Low | Debuff on target enemy. Their next attack must target the caster. One-shot. |
| **Flee** | Formation only | High | Roll chance. Success = exit battle. Fail = AP spent, turn over. |
| **Wait** | Formation only | 0 | End turn. Keep all AP. Earn AP again next turn. Used to bank AP. |
| **Counter** | Action cam (responder) | Varies | Responder's optional attack back at the initiator after taking a hit. Costs AP. Can choose not to counter. |

---

## Delayed Skills & Combos

| Term | Meaning |
|------|---------|
| **Delayed skill** | A skill that doesn't fire immediately. AP spent on cast, turn ends, caster's portrait slides forward on the turn order strip by a fixed delay (2 positions, V1). Fires when the marker reaches the front. |
| **Channeling** | State while a delayed skill is cooking. The caster cannot perform defensive QTEs — all incoming attacks deal full damage. Can be killed (skill fizzles, AP lost). Visible as a charging glow/anim on sprite. |
| **Combo trigger** | When two friendly delayed skills resolve back-to-back with no enemy turn between them, a secret combo fires. Fused super effect replaces the two individual skills. |
| **Delay length** | How many positions forward the caster slides on the turn order strip. Flat 2 positions for V1. |

---

## Protection

| Term | Target | Meaning |
|------|--------|---------|
| **Intercept** | Cast on ally | Next attack aimed at that ally redirects to the caster. Caster gets the defensive QTE. One-shot buff. |
| **Taunt** | Cast on enemy | That enemy's next attack must target the caster. Caster gets the defensive QTE. One-shot debuff. |

---

## Offense QTE (Chalkboard)

| Term | Meaning |
|------|---------|
| **Chalkboard** | The QTE zone where all offensive checks render. Supports ring, swipe, and circle checks. One zone, multiple input types. |
| **QTE Phase** | The front-loaded input phase (`CAM_SWING_QTE`). Player performs all checks before choreography begins. |
| **Playback Phase** | The cinematic phase (`CAM_SWING_PLAYBACK`) after QTE completes. Beat choreography plays out driven by the recorded results. No player input on offense. |
| **Difficulty Preset** | A named entry in the `QTE_DIFFICULTY` table that defines hit zone, perfect zone, and damage multipliers for checks. |

---

## Defense (Animation-Read)

| Term | Meaning |
|------|---------|
| **Strike Anchor** | The exact moment the enemy's strike lunge snaps forward. Frame-zero for defensive timing windows. |
| **Defense Window** | The time range around the strike anchor where player input is checked. |
| **Input Cooldown** | After a defensive input registers (or the window closes), input is locked until the next beat's defense window opens. Prevents mashing. |
| **Brace** | Tap during the defense window. Tiered: perfect brace (full negate), good brace (reduced damage), fail (full damage). Free — no AP cost. Reactive skill check. |
| **Dodge** | Swipe during the defense window. Pass/fail only — either full negate or full damage. Free — no AP cost. Reactive skill check. |

---

## Strategic vs Tactical

| Term | Layer | When | Cost | What |
|------|-------|------|------|------|
| **Defend** | Strategic | Formation turn | AP | Choose to buff defense. Proactive. |
| **Item** | Strategic | Formation turn | AP | Choose to use a consumable. Proactive. |
| **Intercept** | Strategic | Formation turn | AP | Redirect next hit on an ally to yourself. Proactive. |
| **Taunt** | Strategic | Formation turn | AP | Force enemy to attack you next. Proactive. |
| **Flee** | Strategic | Formation turn | AP (high) | All-in escape attempt. |
| **Brace** | Tactical | During incoming attack | Free | React to a strike. Skill-based timing. |
| **Dodge** | Tactical | During incoming attack | Free | React to a strike with swipe. Skill-based timing. |

Strategic actions are choices you make on your formation turn. Tactical actions are reactions during the opponent's attack. The two layers are independent.

---

## Spatial / Camera

| Term | Meaning |
|------|---------|
| **Formation view** | The default zoomed-out view showing all combatants, turn order strip, and the action menu. |
| **Action cam** | The zoomed-in cinematic view during an exchange. Two combatants fill the screen. |
| **Normal cam** | Synonym for formation view in CSS class naming (`normal-cam-*`). |

---

## Scoring

| Tier | Offense (Chalkboard) | Defense (Brace) | Defense (Dodge) |
|------|---------------------|-----------------|-----------------|
| **Perfect** | Best damage multiplier. Gold text. Heavy choreography. | Full negate (×0.0). | — |
| **Good** | Standard damage multiplier. White text. Normal choreography. | Reduced damage (×0.25). | — |
| **Miss** | Worst/zero damage. Gray text. Whiff choreography. | — | — |
| **Pass** | — | — | Full negate (×0.0). |
| **Fail** | — | Full damage (×1.0). No input or outside window. | Full damage (×1.0). |

---

## Removed Terms

These terms existed in older specs and are no longer part of the system:

| Dead Term | Was | Replaced By |
|-----------|-----|-------------|
| **Pip** | ATB segment spent on actions | AP (Action Points) |
| **ATB bar** | Visual fill bar showing pip progress | Turn order strip (initiative sequence) |
| **RELENT** | Initiator ends exchange | Removed — exchange is always one trade |
| **PASS** | Responder yields turn | Removed — responder counters or doesn't |
| **Action cam turn** | One side's chance to act inside a multi-round exchange | Removed — exchange is one trade, not alternating turns |
| **Ring** (as generic term) | QTE input element | **Check** — ring is now one of three check types |