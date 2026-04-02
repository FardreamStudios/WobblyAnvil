// ============================================================
// battleAI.js — Enemy Decision Module
//
// Pure functions, no React, no state. Portable.
//
// Enemies do NOT use AP. They get a fixed number of actions
// per turn (actionsPerTurn on enemy config) and pick skills
// via weighted random (skillWeights on enemy config).
//
// If a picked skill's apCost >= superThreshold, it ends the
// enemy's turn immediately regardless of remaining actions.
//
// planTurn() — returns an array of { targetId, skillId }.
// pickAction() — returns a single { targetId, skillId } (compat).
// ============================================================

// Pick a random element from an array
function pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// pickTarget — random living party member
// ============================================================
function pickTarget(bState) {
    var partyIds = bState.getPartyIds();
    var living = [];
    for (var i = 0; i < partyIds.length; i++) {
        var c = bState.get(partyIds[i]);
        if (c && !c.ko) living.push(partyIds[i]);
    }
    return pickRandom(living);
}

// ============================================================
// pickWeightedSkill — weighted random from skillWeights config
//
// skillWeights: { "enemy_basic": 80, "rat_bite": 20 }
// skills:       ["enemy_basic", "rat_bite"]
//
// Falls back to uniform random if no weights or mismatch.
// ============================================================
function pickWeightedSkill(skills, skillWeights) {
    if (!skills || skills.length === 0) return null;
    if (!skillWeights) return pickRandom(skills);

    // Build parallel arrays of eligible skills and their weights
    var eligible = [];
    var weights = [];
    var totalWeight = 0;
    for (var i = 0; i < skills.length; i++) {
        var w = skillWeights[skills[i]];
        if (w != null && w > 0) {
            eligible.push(skills[i]);
            weights.push(w);
            totalWeight += w;
        }
    }

    // Fallback — no valid weights found
    if (eligible.length === 0) return pickRandom(skills);

    // Roll
    var roll = Math.random() * totalWeight;
    var running = 0;
    for (var j = 0; j < eligible.length; j++) {
        running += weights[j];
        if (roll < running) return eligible[j];
    }

    // Safety — floating point edge case
    return eligible[eligible.length - 1];
}

// ============================================================
// planTurn — multi-action enemy turn planner
//
// combatantData: enemy runtime data (needs .skills[], .actionsPerTurn, .skillWeights)
// bState:        battleState instance
// getSkill:      skill lookup fn (reads apCost for super check)
// superThreshold: apCost at or above this ends the turn early
//
// Returns: [{ targetId, skillId }, ...] or empty array
// ============================================================
function planTurn(combatantData, bState, getSkill, superThreshold) {
    if (!combatantData || !bState) return [];

    var targetId = pickTarget(bState);
    if (!targetId) return [];

    var skills = combatantData.skills;
    if (!skills || skills.length === 0) return [];

    var maxActions = combatantData.actionsPerTurn || 1;
    var weights = combatantData.skillWeights || null;
    var actions = [];

    for (var i = 0; i < maxActions; i++) {
        var skillId = pickWeightedSkill(skills, weights);
        if (!skillId) break;

        actions.push({ targetId: targetId, skillId: skillId });

        // Super-threshold check — this big move ends the turn
        if (superThreshold && getSkill) {
            var skill = getSkill(skillId);
            var cost = skill ? (skill.apCost || 0) : 0;
            if (cost >= superThreshold) break;
        }
    }

    return actions;
}

// ============================================================
// pickAction — single action (backward compat)
//
// Still works for any callsite that just needs one decision.
// Uses weighted selection if skillWeights exist on combatant.
// Ignores AP — enemies don't pay.
// ============================================================
function pickAction(combatantData, bState, apState, getSkill) {
    if (!combatantData || !bState) return null;

    var targetId = pickTarget(bState);
    if (!targetId) return null;

    var skills = combatantData.skills;
    if (!skills || skills.length === 0) return null;

    var skillId = pickWeightedSkill(skills, combatantData.skillWeights);
    if (!skillId) return null;

    return { targetId: targetId, skillId: skillId };
}

// ============================================================
// Export
// ============================================================
var BattleAI = {
    pickAction:       pickAction,
    planTurn:         planTurn,
    pickTarget:       pickTarget,
    pickWeightedSkill: pickWeightedSkill,
};

export default BattleAI;