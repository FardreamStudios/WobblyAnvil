# Battle System — Layout & Action Camera

**Status:** 🟡 CONCEPT  
**Parent Spec:** ScavengeBattleSpecs.md

---

## Normal Battle Layout (Landscape)

The battle screen is a landscape split with four zones.

**Top half — Scene.** Enemy formation on the left, party formation on the right. Sprites, names, HP bars. Tap-to-target on enemies. Zone background fills behind both formations.

**Bottom center — ATB Gauges.** Fill bars for all combatants (party + enemies). This is the heartbeat of the battle — the player watches these to anticipate who acts next.

**Bottom action side (handedness-dependent) — Action Menu.** Four buttons: Attack, Defend, Item, Flee. Appears when a party member's ATB fills. Disappears after selection.

**Bottom opposite side — Open Real Estate.** Fairy chat, status effects, buff timers, or whatever we need. This space is always available and doesn't compete with inputs.

Handedness flips the action menu and open real estate sides. Right-handed = actions on the right.

---

## Action Camera — The Zoom

When a party member selects an action and target, the battle enters **Action Camera mode**. This is not a screen change — it's a CSS transform zoom on the existing scene. Nothing unmounts, nothing rebuilds.

### Transition In (300-400ms ease)

1. Scene panel scales up and translates to frame the two active combatants (attacker + target)
2. Non-active enemies and party members dim to ~20% opacity
3. ATB gauges fade out
4. Action menu fades out
5. QTE zone appears in the freed bottom/center space
6. Fairy comic panel slides in on the side

### What the Player Sees During Action Cam

**Center stage — The two fighters.** Zoomed in, framed like a close-up shot. Attack and defense anims play here.

**Center/bottom — QTE Zone.** Circle timing rings for both attack and defense QTEs. Large, easy to tap. This is where the player's hands are.

**Side panel — Comic book popups.** Fairy commentary, party member callouts, or enemy dialogue. These pop in and out like speech panels in a comic strip. They use the space freed up by hiding ATB and menus.

**Top strip (optional) — Turn indicator.** Shows whose turn it is and the current exchange beat.

### Transition Out (300-400ms ease)

1. Comic panels slide out
2. QTE zone fades
3. Scene eases back to full battle view
4. Dimmed elements restore to full opacity
5. ATB gauges fade back in and resume filling

### Why Transform-Only

Everything is `transform: scale() translate()` and `opacity` changes. No layout reflow, no flexbox recalculation, no unmounting. GPU-composited, butter smooth on mobile. The player never loses spatial continuity because nothing actually moved — it just got closer and then pulled back.

---

## Action Camera — The Exchange

The action camera is not a single hit. It's a **sustained exchange** — a mini-fight between the two combatants that resolves multiple beats before returning to the ATB loop.

### Why

The ATB wait-act-wait loop can feel sluggish on mobile. Picking an action, watching one hit, then waiting for gauges to refill is a lot of dead air on a phone. The exchange keeps the player engaged in one focused burst of activity.

### Flow

1. Party member ATB fills → player picks Attack + target
2. **Action cam zooms in**
3. **Player attack QTE** — circle timing rings
4. QTE resolves → attack anim plays → damage numbers pop
5. **Enemy immediately counters** — telegraph anim (shake/glow) → defense QTE
6. Defense QTE resolves → hit react or block anim plays → damage mitigated
7. *(Optional: bonus exchange beat based on design choice below)*
8. **Action cam zooms out** → back to normal layout, ATB resumes

### What This Changes

In the original ATB spec, each ATB fill = one action = one QTE = one hit. With the exchange model, each ATB fill = one action camera sequence = **at minimum an attack QTE + a defense QTE** back to back. The player is active for the entire zoom.

This means fewer total ATB cycles per fight, but each cycle is meatier and more engaging.

### Open Design Question — Exchange Length

How many beats happen per action camera sequence? Options:

**Option A — Fixed (1 attack + 1 counter).** Simple, predictable. Every exchange is the same length. Easy to balance.

**Option B — Stat-driven.** Speed stat determines bonus beats. Fast characters might get a follow-up hit. Slow enemies might not counter at all. Adds build variety but harder to balance.

**Option C — QTE-driven.** Perfect QTE timing earns a follow-up beat in the same sequence. Rewards skill with more action. Creates a "hot streak" feel when you're nailing the timing.

**Option D — Hybrid.** Base is 1+1, but perfect QTEs or speed advantages can extend it. Caps at 2+2 to keep sequences from dragging.

---

## Fairy During Action Cam

The fairy comic panel is the big win. During normal battle, fairy chat competes with ATB bars and action menus for attention. During the action cam zoom, the fairy has dedicated space to:

- React to the player's QTE performance in real time
- Taunt the enemy
- Warn about incoming attacks
- Celebrate or cringe at the result

These pop in as comic-style speech panels — quick, punchy, disposable. They don't block input and they don't persist after the zoom.

---

## Loot Screen

End-of-encounter rewards overlay. Appears after the final wave. Shows accumulated loot from all waves. Separate from the action camera system — this is a full overlay, not a zoom.

---

## Implementation Notes

- Action cam is pure CSS on the existing battle React tree — no new component hierarchy needed
- The zoom target (which two combatants to frame) comes from battle state (attacker ID + target ID)
- Phase transitions `ACTION_SELECT → QTE_ACTIVE` and `ENEMY_TELEGRAPH → DEFENSE_QTE` are the natural entry/exit hooks
- Comic panel popups wire through the existing `speechBubbles` prop pattern or the observer callback
- Hit FX (flash, shake, knockback) are all CSS — no sprite sheets needed for effects