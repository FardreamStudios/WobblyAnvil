// ============================================================
// battleATB.js — ATB Pip System (Pure JS, No React)
//
// Owns all ATB math: pip fill rates, sequential fill logic,
// turn-ready detection, pip reset, and freeze rules.
//
// BattleView owns the React state and rAF loop.
// This module owns the math — called once per tick.
//
// Usage:
//   var result = BattleATB.tick(dt, prevState, combatants, frozen);
//   // result.nextState  — updated pip map
//   // result.readyId    — first combatant who just hit max pips (or null)
//
//   BattleATB.reset(state, id) — wipe a combatant's pips to zero
//   BattleATB.initState(combatants) — build initial pip state map
//   BattleATB.isReady(state, id) — true if combatant has all pips filled
//   BattleATB.fillAll(state, id) — instantly fill all pips (dev/debug)
//
// ============================================================

import BattleConstants from "../config/battleConstants.js";

var ATB = BattleConstants.ATB;

// ============================================================
// Init — build pip state for all combatants
// Seeds starting currentFill from combatant's speed stat + jitter.
// speed 1–10 → base fill 0.08–0.80, jitter ±0.10, clamped 0–0.95
// ============================================================
function initState(combatants) {
    var state = {};
    for (var i = 0; i < combatants.length; i++) {
        var c = combatants[i];
        var speed = c.speed || 5;
        var baseFill = speed * 0.08;
        var jitter = (Math.random() * 0.2) - 0.1; // ±0.10
        var startFill = Math.max(0, Math.min(0.95, baseFill + jitter));
        state[c.id] = { filledPips: 0, currentFill: startFill };
    }
    return state;
}

// ============================================================
// Tick — advance all pip bars by dt seconds
//
// Params:
//   dt          — delta time in seconds (clamped by caller)
//   prevState   — current pip state map
//   combatants  — array of combatant objects (need .id, .atbSpeed)
//   frozen      — boolean, if true no advancement happens
//
// Returns: { nextState, readyId }
//   nextState — new pip state map (safe to set into React state)
//   readyId   — id of FIRST combatant who became ready this tick,
//               or null if nobody crossed the threshold
// ============================================================
function tick(dt, prevState, combatants, frozen) {
    if (frozen) {
        return { nextState: prevState, readyId: null };
    }

    var maxPips = ATB.pipsPerCombatant;
    var baseFillMs = ATB.pipFillMs;
    var nextState = {};
    var readyId = null;

    for (var i = 0; i < combatants.length; i++) {
        var c = combatants[i];
        var old = prevState[c.id] || { filledPips: 0, currentFill: 0 };

        // Already full — waiting for turn system to consume
        if (old.filledPips >= maxPips) {
            nextState[c.id] = old;
            continue;
        }

        // Fill rate: progress 0→1 over (baseFillMs / atbSpeed) ms
        // atbSpeed acts as a multiplier — higher = faster
        var fillPerSec = c.atbSpeed / (baseFillMs / 1000);
        var newFill = old.currentFill + fillPerSec * dt;
        var filled = old.filledPips;

        // Pip completes — roll over to next
        while (newFill >= 1 && filled < maxPips) {
            filled += 1;
            newFill -= 1;
        }

        // Clamp at max
        if (filled >= maxPips) {
            filled = maxPips;
            newFill = 0;
        }

        nextState[c.id] = { filledPips: filled, currentFill: newFill };

        // First combatant to cross threshold this tick wins initiative
        if (readyId === null && filled >= maxPips && old.filledPips < maxPips) {
            readyId = c.id;
        }
    }

    return { nextState: nextState, readyId: readyId };
}

// ============================================================
// Reset — wipe a combatant's pips back to zero
// Returns new state map (immutable — does not mutate input)
// ============================================================
function reset(state, id) {
    var next = {};
    for (var key in state) {
        if (state.hasOwnProperty(key)) {
            next[key] = key === id
                ? { filledPips: 0, currentFill: 0 }
                : state[key];
        }
    }
    return next;
}

// ============================================================
// isReady — check if a combatant has all pips filled
// ============================================================
function isReady(state, id) {
    var entry = state[id];
    return entry ? entry.filledPips >= ATB.pipsPerCombatant : false;
}

// ============================================================
// fillAll — instantly fill all pips for a combatant (dev/debug)
// Returns new state map
// ============================================================
function fillAll(state, id) {
    var next = {};
    for (var key in state) {
        if (state.hasOwnProperty(key)) {
            next[key] = key === id
                ? { filledPips: ATB.pipsPerCombatant, currentFill: 0 }
                : state[key];
        }
    }
    return next;
}

// ============================================================
// checkReady — scan state for first combatant already at max pips
// Used after ATB resumes to catch combatants who filled during freeze
// Returns id or null
// ============================================================
function checkReady(state, combatants) {
    var maxPips = ATB.pipsPerCombatant;
    for (var i = 0; i < combatants.length; i++) {
        var c = combatants[i];
        var entry = state[c.id];
        if (entry && entry.filledPips >= maxPips) {
            return c.id;
        }
    }
    return null;
}

// ============================================================
// Export
// ============================================================
var BattleATB = {
    initState: initState,
    tick: tick,
    reset: reset,
    isReady: isReady,
    fillAll: fillAll,
    checkReady: checkReady,
};

export default BattleATB;