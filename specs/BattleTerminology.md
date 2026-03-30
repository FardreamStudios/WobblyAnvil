# Battle Terminology

**Single source of truth for naming across all battle specs and code.**

---

## Combatant Roles

| Term | Meaning |
|------|---------|
| **Initiator** | The combatant whose ATB filled and triggered the exchange. They go first. Only they can end the exchange via RELENT. |
| **Responder** | The other combatant pulled into the exchange. They didn't choose to be here. They can PASS to yield their action cam turn. |

---

## Action Hierarchy

Largest to smallest:

| Term | Meaning | Contains |
|------|---------|----------|
| **Exchange** | The full in-cam back-and-forth sequence between initiator and responder. Starts when the action cam zooms in, ends when it zooms out. | Action cam turns |
| **Action cam turn** | One side's chance to act during an exchange. Initiator and responder alternate. Each turn: pick an action (ATK, RELENT, PASS, etc). | A combo (if ATK chosen) |
| **Combo** | The full sequence of swings that make up one attack action. Defined by the skill. A 3-hit slash is a 3-swing combo. | Swings |
| **Swing** | A single attack within a combo. One lunge, one hit (or miss). The choreography unit — the pull-back, snap-forward, impact, return. | One beat, one ring |

---

## Data / Input / Visual — Three Lenses on the Same Moment

Each swing has three aspects. They are 1:1 but viewed from different angles:

| Term | Lens | Meaning |
|------|------|---------|
| **Beat** | Data | The stat block for one swing — damage, blockable, dodgeable, SFX key, anim state. Lives in the skill definition. |
| **Ring** | Input | The shrinking QTE circle the player interacts with. Hit or miss. Tap or swipe. One ring per beat. |
| **Swing** | Visual | The choreographed motion — wind-up, strike, impact, return. What the player sees on screen. |

---

## ATB & Economy

| Term | Meaning |
|------|---------|
| **Pip** | One segment of the ATB bar. Every combatant has 3 pips (fixed). Speed stat controls fill rate, not pip count. |
| **Formation turn** | The full out-of-cam turn when a combatant's 3 pips fill. They pick actions from the formation view menu. Ends when pips run out or an attack's exchange resolves. |
| **Action cam turn** | One side's chance to act inside an exchange. Distinct from formation turn — multiple action cam turns happen within one exchange. |

---

## Actions

| Term | Context | Meaning |
|------|---------|---------|
| **ATK** | Formation or in-cam | Spend 1 pip. Pick a skill. In formation view, this opens the action cam. In-cam, this starts a combo. |
| **RELENT** | In-cam, initiator only | End the exchange. Free. Only the initiator can choose this. |
| **PASS** | In-cam, responder only | Yield the action cam turn back to the initiator. Cost TBD (playtest-gated). |
| **Defend** | Formation or in-cam | Spend 1 pip. Grants +3 defensePower buff until this combatant's ATB fills again. In-cam: resolves instantly, swaps sides. |
| **Item** | Formation or in-cam | Spend 1 pip. Instant use, applies effect (heal/buff/debuff/damage). In-cam: resolves instantly, swaps sides. |
| **Flee** | Formation only | Costs all 3 pips (entire turn). Roll chance (50% V1). Success = exit battle. Fail = turn over. |
| **Brace** | During defensive QTE | Tap the shrinking ring to brace. Reduces incoming damage to ×0.25. Free — costs no pip. This is a reaction, not an action choice. |

---

## Spatial / Camera

| Term | Meaning |
|------|---------|
| **Formation view** | The default zoomed-out view showing all combatants, ATB bars, and the action menu. Normal gameplay. |
| **Action cam** | The zoomed-in cinematic view during an exchange. Two combatants fill the screen. |
| **Normal cam** | Synonym for formation view in CSS class naming (`normal-cam-*`). |

---

## Strategic vs Tactical

| Term | Layer | When | Cost | What |
|------|-------|------|------|------|
| **Defend** | Strategic | Your action turn (formation or in-cam) | 1 pip | Choose to buff defense. Proactive. |
| **Brace** | Tactical | During incoming attack QTE | Free | React to a ring. Skill-based. |
| **Item** | Strategic | Your action turn (formation or in-cam) | 1 pip | Choose to use a consumable. Proactive. |
| **Flee** | Strategic | Formation turn only | 3 pips (all) | All-in escape attempt. |

Strategic actions are choices you make on your turn. Tactical actions are reactions during the opponent's turn. The two systems are independent — you can Defend (strategic) AND Brace (tactical) in the same combat cycle.

---

## Open Questions

- **PASS cost:** Free or 1 pip? Current code: free. ATBActionEconomy spec: 1 pip. Deferred to playtesting.
- **Defender pip retention after exchange:** Do responder's unspent pips survive? Candidate rule: responder keeps unspent pips, initiator loses theirs. Deferred to playtesting.
- **Defend buff stacking:** Currently stacks. Cap at 1? Diminishing returns? Deferred to playtesting.