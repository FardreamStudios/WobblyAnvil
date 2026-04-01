// ============================================================
// battleEngagement.js — Initiative + AP Engine (Pure JS, No React)
//
// Replaces battleATB.js. Owns all engagement math:
//   - Initiative rolls → fixed turn order
//   - AP pools: earn, spend, check affordability
//   - Turn order management: advance, skip dead, wave reroll
//
// No React imports, no hooks, no side effects. Portable and testable.
//
// Usage:
//   var order = BattleEngagement.rollInitiative(combatants, variance);
//   var apState = BattleEngagement.initAPState(combatants, apMax);
//   var next = BattleEngagement.earnAP(apState, id, speed, config);
//   var next = BattleEngagement.spendAP(apState, id, cost);
//   var ok = BattleEngagement.canAfford(apState, id, cost);
//   var nextIdx = BattleEngagement.advanceTurn(order, currentIdx, isAlive);
//
// ============================================================

// ============================================================
// Initiative — speed-weighted random roll, produces fixed order
//
// Roll = speed + random(0, variance)
// Higher roll = earlier in sequence.
// Returns array of combatant ids sorted by roll (descending).
// ============================================================

function rollInitiative(combatants, variance) {
    var rolls = [];
    for (var i = 0; i < combatants.length; i++) {
        var c = combatants[i];
        var speed = c.speed || 1;
        var roll = speed + Math.random() * (variance || 20);
        rolls.push({ id: c.id, roll: roll });
    }
    // Sort descending — highest roll goes first
    rolls.sort(function(a, b) { return b.roll - a.roll; });
    var order = [];
    for (var j = 0; j < rolls.length; j++) {
        order.push(rolls[j].id);
    }
    return order;
}

// ============================================================
// AP State — init, earn, spend, check
//
// State shape: { [combatantId]: { current: number, max: number } }
// ============================================================

function initAPState(combatants, apMax) {
    var state = {};
    var max = apMax || 100;
    for (var i = 0; i < combatants.length; i++) {
        var c = combatants[i];
        state[c.id] = { current: 0, max: max };
    }
    return state;
}

// Earn AP for a combatant based on their speed.
// Formula: earnBase + floor(speed * earnSpeedScale)
// Caps at max. Returns new state (immutable).
function earnAP(apState, combatantId, speed, config) {
    var earnBase = (config && config.AP_EARN_BASE != null) ? config.AP_EARN_BASE : 15;
    var earnScale = (config && config.AP_EARN_SPEED_SCALE != null) ? config.AP_EARN_SPEED_SCALE : 0.35;
    var amount = earnBase + Math.floor((speed || 1) * earnScale);

    var entry = apState[combatantId];
    if (!entry) return apState;

    var newCurrent = Math.min(entry.current + amount, entry.max);

    var next = {};
    for (var key in apState) {
        if (apState.hasOwnProperty(key)) {
            next[key] = key === combatantId
                ? { current: newCurrent, max: entry.max }
                : apState[key];
        }
    }
    return next;
}

// Spend AP. Returns new state. Does NOT check affordability — caller should check first.
function spendAP(apState, combatantId, cost) {
    var entry = apState[combatantId];
    if (!entry) return apState;

    var newCurrent = Math.max(0, entry.current - cost);

    var next = {};
    for (var key in apState) {
        if (apState.hasOwnProperty(key)) {
            next[key] = key === combatantId
                ? { current: newCurrent, max: entry.max }
                : apState[key];
        }
    }
    return next;
}

// Check if combatant can afford an action.
function canAfford(apState, combatantId, cost) {
    var entry = apState[combatantId];
    if (!entry) return false;
    return entry.current >= cost;
}

// Get current AP for a combatant.
function getAP(apState, combatantId) {
    var entry = apState[combatantId];
    return entry ? entry.current : 0;
}

// Get max AP for a combatant.
function getMaxAP(apState, combatantId) {
    var entry = apState[combatantId];
    return entry ? entry.max : 0;
}

// ============================================================
// Turn Order Management
// ============================================================

// Advance to next living combatant in turn order.
// isAlive: fn(id) → boolean
// Returns next index (wraps around). Returns -1 if nobody alive.
function advanceTurn(order, currentIdx, isAlive) {
    if (!order || order.length === 0) return -1;
    var len = order.length;
    for (var i = 1; i <= len; i++) {
        var idx = (currentIdx + i) % len;
        if (isAlive(order[idx])) {
            return idx;
        }
    }
    return -1; // nobody alive
}

// Remove a combatant from turn order (e.g. on death).
// Returns new order array (immutable).
function removeFromOrder(order, combatantId) {
    var next = [];
    for (var i = 0; i < order.length; i++) {
        if (order[i] !== combatantId) {
            next.push(order[i]);
        }
    }
    return next;
}

// Add AP entry for new combatants (wave transition).
// Merges new entries into existing state, preserving party AP.
function mergeAPState(existingState, newCombatants, apMax, partyIds) {
    var max = apMax || 100;
    var merged = {};

    // Preserve party AP
    for (var key in existingState) {
        if (existingState.hasOwnProperty(key)) {
            var isParty = false;
            for (var p = 0; p < partyIds.length; p++) {
                if (partyIds[p] === key) { isParty = true; break; }
            }
            if (isParty) {
                merged[key] = existingState[key];
            }
        }
    }

    // Fresh AP for new combatants (enemies)
    for (var i = 0; i < newCombatants.length; i++) {
        var c = newCombatants[i];
        merged[c.id] = { current: 0, max: max };
    }

    return merged;
}

// ============================================================
// Export
// ============================================================
var BattleEngagement = {
    rollInitiative: rollInitiative,
    initAPState: initAPState,
    earnAP: earnAP,
    spendAP: spendAP,
    canAfford: canAfford,
    getAP: getAP,
    getMaxAP: getMaxAP,
    advanceTurn: advanceTurn,
    removeFromOrder: removeFromOrder,
    mergeAPState: mergeAPState,
};

export default BattleEngagement;