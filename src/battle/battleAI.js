// ============================================================
// battleAI.js — Enemy Decision Module
//
// Pure function, no React, no state. Portable.
// Input: combatant data, battle state reference.
// Output: { targetId, skillId }
//
// BattleView calls pickAction() when an enemy's ATB fills
// or when it's the enemy's turn in-cam. The AI picks a
// random living party target and a random skill from the
// combatant's skill list.
//
// Future: personality-driven decisions, HP-aware targeting,
// threat assessment, poise exploitation.
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
//
// Returns: { targetId: string, skillId: string } or null
// ============================================================
function pickAction(combatantData, bState) {
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

    // Pick random skill from combatant's skill list
    var skills = combatantData.skills;
    var skillId = pickRandom(skills);
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