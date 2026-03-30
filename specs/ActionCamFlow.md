# Action Cam Flow

**Parent:** `ScavengeBattleSpecs.md`
**Status:** 🟢 V1 WORKING

---

## What It Is

The action cam is a zoomed-in exchange between two combatants. ATB fills → someone acts → camera zooms in → they trade blows → camera zooms out → ATB resumes.

---

## Roles

**Initiator** — the combatant whose ATB filled and triggered the exchange. They go first. They can end the exchange early by choosing RELENT.

**Responder** — the other combatant. They get a turn after the initiator swings. They can give up their turn by choosing PASS.

---

## Turn Flow

1. Initiator's ATB fills → exchange begins → cam zooms in
2. Initiator's turn: **ATK** (costs 1 pip) or **RELENT** (free, ends exchange)
3. If ATK → QTE plays → damage resolves → responder's turn
4. Responder's turn: **ATK** (costs 1 pip) or **PASS** (free, gives turn back)
5. If ATK → QTE plays → damage resolves → back to initiator
6. Repeat until:
    - Initiator chooses RELENT
    - Initiator has no pips left
7. Cam zooms out → ATB resumes

---

## Pip Spending

Every ATK costs 1 pip. RELENT and PASS are free. When it becomes Initiator turn and they have 0 pips, the exchange ends automatically.

---

## Attack Animation Direction

The current turn's attacker always moves **toward** the combatant they are attacking. Both sides use the same motion:

1. **Pull back** — away from opponent (wind-up)
2. **Snap forward** — toward opponent (strike)
3. **Hold** — brief pause at full extension
4. **Ease back** — return to neutral position

Direction is determined by which side of the screen the attacker is on. Party attacks leftward (toward enemy side). Enemy attacks rightward (toward party side). This is handled by a single CSS variable (`--choreo-dir`) that flips the animation direction per faction.

---

## Visual Sync

Attack animations are synced to the QTE ring. When a ring starts shrinking, the attacker begins their pull-back. The snap-forward peaks as the ring reaches the sweet spot. One ring = one full pull-back → strike cycle.

**Glow color** indicates who is swinging:
- Blue glow = party attacking
- Red glow = enemy attacking

---

## Exchange Exit

When the exchange ends (RELENT, no pips, or both sides have acted):

1. Cam zooms out
2. ATB resumes for all combatants
3. If someone else already has full pips, their turn starts immediately