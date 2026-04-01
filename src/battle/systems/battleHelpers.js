// ============================================================
// battleHelpers.js — Pure Battle Utility Functions
//
// Stateless helpers used by BattleView and managers.
// No React, no bus, no side effects. Pure logic only.
// ============================================================

/**
 * Return the ID of the first living enemy, or null.
 */
function pickFirstLivingEnemy(bState, enemies) {
    for (var i = 0; i < enemies.length; i++) {
        var s = bState.get(enemies[i].id);
        if (s && !s.ko) return enemies[i].id;
    }
    return null;
}

/**
 * Return the ID of the first living party member, or null.
 */
function pickFirstLivingAlly(bState, party) {
    for (var i = 0; i < party.length; i++) {
        var s = bState.get(party[i].id);
        if (s && !s.ko) return party[i].id;
    }
    return null;
}

/**
 * Return the ID of a random living party member, or null.
 */
function pickRandomLivingPartyMember(bState, party) {
    var living = [];
    for (var i = 0; i < party.length; i++) {
        var s = bState.get(party[i].id);
        if (s && !s.ko) living.push(party[i].id);
    }
    if (living.length === 0) return null;
    return living[Math.floor(Math.random() * living.length)];
}

// ============================================================
// Export
// ============================================================
var BattleHelpers = {
    pickFirstLivingEnemy: pickFirstLivingEnemy,
    pickFirstLivingAlly: pickFirstLivingAlly,
    pickRandomLivingPartyMember: pickRandomLivingPartyMember,
};

export default BattleHelpers;