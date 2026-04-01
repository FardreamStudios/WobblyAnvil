// ============================================================
// battleAI.js — Enemy Decision Module
//
// Pure function, no React, no state. Portable.
// Input: combatant data, battle state, AP state, skill lookup.
// Output: { targetId, skillId }
//
// BattleView calls pickAction() on the enemy's turn.
// The AI picks a random living party target and a random
// affordable skill from the combatant's skill list.
//
// Future: personality-driven decisions, HP-aware targeting,
// threat assessment, AP spending behavior.
// ============================================================

// Pick a random element from an array
function pickRandom(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// pickAction — main entry point
//
// combatantData: the enemy's runtime data from combatantMap
//   (needs .id, .skills[])
// bState: battleState instance (for querying living party)
// apState: AP state map (optional — if omitted, skips cost check)
// getSkill: skill lookup fn (optional — if omitted, skips cost check)
//
// Returns: { targetId: string, skillId: string } or null
// ============================================================
function pickAction(combatantData, bState, apState, getSkill) {
    if (!combatantData || !bState) return null;

    // Pick random living party target
    var partyIds = bState.getPartyIds();
    var livingTargets = [];
    for (var i = 0; i < partyIds.length; i++) {
        var c = bState.get(partyIds[i]);
        if (c && !c.ko) livingTargets.push(partyIds[i]);
    }
    var targetId = pickRandom(livingTargets);
    if (!targetId) return null;

    // Filter skills by AP affordability
    var skills = combatantData.skills;
    if (!skills || skills.length === 0) return null;

    var affordable = skills;
    if (apState && getSkill) {
        var currentAP = apState[combatantData.id]
            ? apState[combatantData.id].current
            : 0;
        affordable = [];
        for (var j = 0; j < skills.length; j++) {
            var skill = getSkill(skills[j]);
            var cost = skill ? (skill.apCost || 25) : 25;
            if (cost <= currentAP) {
                affordable.push(skills[j]);
            }
        }
    }

    var skillId = pickRandom(affordable);
    if (!skillId) return null;

    return {
        targetId: targetId,
        skillId:  skillId,
    };
}

// ============================================================
// Export
// ============================================================
var BattleAI = {
    pickAction: pickAction,
};

export default BattleAI;