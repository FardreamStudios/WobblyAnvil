// ============================================================
// fairyReactions.js — LLM Reaction Triggers
//
// Defines which gameplay events can trigger the fairy to
// appear and deliver an LLM-generated line. Each reaction
// has a roll chance, cooldown, day gate, and a context hint
// builder that gives the LLM specific info about what happened.
//
// Controller calls evaluate() from _enrichFromPayload.
// If it returns a hit, controller fires the LLM call and
// opens a linger-chat session.
//
// PORTABLE: Pure JS. No React. No state mutation.
// ============================================================

import EVENT_TAGS from "../config/eventTags.js";

// ============================================================
// REACTION TABLE
// ============================================================

var REACTIONS = [
    {
        id: "react_shatter",
        busTag: EVENT_TAGS.FX_SHATTER,
        chance: 0.4,
        cooldownMs: 30000,
        minDay: 2,
        hint: function(payload, tracked) {
            var streak = (tracked.recentShatters || 0);
            if (streak >= 3) return "player just shattered a weapon (" + streak + " in a row — terrible streak, they might be frustrated)";
            if (streak === 2) return "player just shattered a weapon (2nd in a row)";
            return "player just shattered a weapon";
        },
    },
    {
        id: "react_shatter_hint",
        busTag: EVENT_TAGS.FX_SHATTER,
        chance: 0.15,
        cooldownMs: 120000,
        minDay: 2,
        hint: function(payload, tracked) {
            return "player just shattered a weapon. hint that you MIGHT be able to fix broken weapons if they asked nicely. be coy about it. don't promise anything.";
        },
    },
    {
        id: "react_masterwork",
        busTag: EVENT_TAGS.FORGE_SESSION_COMPLETE,
        chance: 0.6,
        cooldownMs: 60000,
        minDay: 2,
        condition: function(payload) {
            return (payload && payload.quality || 0) >= 85;
        },
        hint: function(payload, tracked) {
            var q = payload && payload.quality || 0;
            var name = (payload && payload.weaponName) || "weapon";
            var shattersBefore = tracked.recentShatters || 0;
            if (shattersBefore >= 2) return "player just forged a masterwork " + name + " (quality " + q + ") after " + shattersBefore + " shatters — this is a comeback moment";
            return "player just forged a masterwork " + name + " (quality " + q + ") — this is impressive";
        },
    },
    {
        id: "react_bad_weapon",
        busTag: EVENT_TAGS.FORGE_SESSION_COMPLETE,
        chance: 0.25,
        cooldownMs: 45000,
        minDay: 2,
        condition: function(payload) {
            return (payload && payload.quality || 0) < 40;
        },
        hint: function(payload, tracked) {
            var q = payload && payload.quality || 0;
            var name = (payload && payload.weaponName) || "weapon";
            return "player just forged a terrible " + name + " (quality " + q + ") — this is embarrassing work";
        },
    },
    {
        id: "react_sale_overcharge",
        busTag: EVENT_TAGS.ECONOMY_WEAPON_SOLD,
        chance: 0.3,
        cooldownMs: 45000,
        minDay: 2,
        condition: function(payload) {
            return (payload && payload.saleRatio || 0) >= 1.3;
        },
        hint: function(payload, tracked) {
            var gold = (payload && payload.goldEarned) || "?";
            return "player just overcharged a customer and sold a weapon for " + gold + "g — they ripped them off and got away with it";
        },
    },
    {
        id: "react_sale_ripped_off",
        busTag: EVENT_TAGS.ECONOMY_WEAPON_SOLD,
        chance: 0.35,
        cooldownMs: 30000,
        minDay: 2,
        condition: function(payload) {
            return (payload && payload.saleRatio || 0) < 0.7;
        },
        hint: function(payload, tracked) {
            var gold = (payload && payload.goldEarned) || "?";
            return "player just got lowballed on a sale — only " + gold + "g, way below value. the customer robbed them";
        },
    },
    {
        id: "react_decree_failed",
        busTag: EVENT_TAGS.QUEST_FAILED,
        chance: 0.8,
        cooldownMs: 0,
        minDay: 2,
        hint: function(payload, tracked) {
            return "player just FAILED a royal decree — this is serious, the crown is not happy. be concerned but don't be too nice about it";
        },
    },
    {
        id: "react_perfect_quench",
        busTag: EVENT_TAGS.FX_QUENCH_SUCCESS,
        chance: 0.3,
        cooldownMs: 60000,
        minDay: 2,
        hint: function(payload, tracked) {
            return "player just landed a perfect quench — the hardest part of forging, nailed it";
        },
    },
];

// ============================================================
// COOLDOWN TRACKING
// ============================================================

var _cooldowns = {};

// ============================================================
// EVALUATE
// ============================================================

/**
 * Check if a bus event should trigger an LLM reaction.
 * Returns { id, hint, spotId } or null.
 *
 * Evaluates ALL matching reactions for this busTag, rolls dice
 * for each. First hit wins (table is ordered by priority —
 * specific reactions like shatter_hint before generic shatter).
 *
 * @param {string} busTag   — the event tag that fired
 * @param {Object} payload  — bus event payload
 * @param {Object} tracked  — controller's _tracked state
 * @param {number} day      — current game day
 */
function evaluate(busTag, payload, tracked, day) {
    var now = Date.now();

    for (var i = 0; i < REACTIONS.length; i++) {
        var r = REACTIONS[i];

        // Must match this bus event
        if (r.busTag !== busTag) continue;

        // Day gate
        if (day < r.minDay) continue;

        // Cooldown check
        if (r.cooldownMs > 0 && _cooldowns[r.id]) {
            if (now - _cooldowns[r.id] < r.cooldownMs) continue;
        }

        // Condition check (payload-based)
        if (r.condition && !r.condition(payload)) continue;

        // Roll the dice
        if (Math.random() > r.chance) continue;

        // Hit! Record cooldown and return
        _cooldowns[r.id] = now;

        return {
            id: r.id,
            hint: r.hint(payload, tracked),
            spotId: "react_back_left",
        };
    }

    return null;
}

/**
 * Clear all cooldowns. Called by controller on reset/destroy.
 */
function clearCooldowns() {
    _cooldowns = {};
}

// ============================================================
// EXPORT
// ============================================================

var FairyReactions = {
    REACTIONS: REACTIONS,
    evaluate: evaluate,
    clearCooldowns: clearCooldowns,
};

export default FairyReactions;