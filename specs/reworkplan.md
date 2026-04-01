Implementation Plan — Engagement System Rework
Scope: Replace ATB/pip system with initiative + AP + one-trade cam. Touch 6+ files, create 2–3 new files.
Block 1: Constants & AP Config (LOW risk)
New constants in battleConstants.js:

Add ENGAGEMENT config object (AP_MAX, AP_EARN_BASE, AP_EARN_SPEED_SCALE, AP_COST_ITEM, AP_COST_DEFEND, AP_COST_FLEE, AP_COST_COUNTER, INITIATIVE_VARIANCE)
Update ACTIONS array — new formation menu: ATK, DEF, ITEM, FLEE, WAIT
Remove IN_CAM_ACTIONS (no in-cam buttons except counter prompt)
Remove PIP_COSTS (replaced by ENGAGEMENT)
Update BATTLE_PHASES — remove ATB_RUNNING, add INITIATIVE_ROLL, TURN_ACTIVE
Update test data: remove atbSpeed field, ensure speed is on 1–100 scale

Block 2: Initiative + AP Engine (LOW risk)
New file: battleEngagement.js (replaces battleATB.js)

rollInitiative(combatants, variance) → sorted turn order array
initAPState(combatants) → AP map (everyone starts at 0 or a seed value)
earnAP(apState, combatantId, speed) → updated AP map
spendAP(apState, combatantId, cost) → updated AP map
canAfford(apState, combatantId, cost) → boolean
Pure JS, no React, testable

Block 3: Turn Order Hook (MEDIUM risk)
Replace useBattleATBLoop.js with useBattleTurnLoop.js

No RAF tick. Instead: emits TURN_START for next combatant in sequence
On turn end → advance index, wrap at round boundary, earn AP for next combatant
Handles dead combatant skip, wave reroll
Bus-driven: emits BATTLE:TURN:START with combatantId

Block 4: BattleView Phase Machine Rework (HIGH risk)
Major edits to BattleView.js:

Replace atbValues state with apState + turnOrder + turnIndex
Replace ATB_READY subscriber with TURN_START subscriber
Remove swapSides(), deductPip(), RELENT, PASS handlers
Rework startExchange() → one-trade model (initiator swings, then counter prompt)
Rework advanceOrCamOut() → after initiator swing, show counter prompt to responder if they can afford it, then cam out
Rework camOut() → no ATB reset, just advance turn index
Rework handleAction() → AP cost checks, new action list (ATK opens skill picker in formation, WAIT ends turn free)
Rework handleDefend(), handleFlee(), handleItemUse() → AP costs instead of pip costs
Remove in-cam RELENT/PASS/DEF/ITEM buttons (formation-only now)
Add counter prompt UI (simple "Counter? [YES / NO]" after taking a hit)

Block 5: UI Replacements (MEDIUM risk)

Replace ATBGaugeStrip with TurnOrderStrip component (portrait queue)
Update ActionCamInfoPanel — AP bar replaces pip dots
Update ActionMenu — new action list, AP cost display, disable states based on AP
Update SkillSubmenu — show AP costs, disable if can't afford

Block 6: Cleanup & Wave Wiring (LOW risk)

Wire wave transitions to re-roll initiative
Remove battleATB.js import from BattleView
Update battleAI.js — decisions based on AP affordability
Update dev controls (fill AP, advance turn, etc.)