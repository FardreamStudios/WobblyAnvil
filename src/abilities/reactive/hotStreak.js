// ============================================================
// hotStreak.js — Wobbly Anvil Reactive Ability
// Trigger: 3 consecutive FORGE_SESSION_COMPLETE with quality > 50
// Effect:  +15% quality gain rate while active
// End:     Any forge session completes with quality < 30
//
// Uses a closure counter to track consecutive good forges.
// Counter increments on quality > 50, resets on quality <= 50.
// When counter hits 3, canActivate returns true and counter resets.
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";

// --- Closure state (persists across canActivate calls) ---
var _consecutiveGood = 0;

var HotStreakAbility = {

    // --- Identity ---
    id:       "hot_streak",
    tags:     ["reactive", "buff", "forge"],
    scope:    "manual",          // lives until end condition fires
    stackable: false,

    // --- Activation ---
    trigger:  EVENT_TAGS.FORGE_SESSION_COMPLETE,

    canActivate: function(payload, manager, state) {
        // Don't stack
        if (manager.isActive("hot_streak")) return false;

        var quality = payload && payload.quality || 0;
        if (quality > 50) {
            _consecutiveGood++;
        } else {
            _consecutiveGood = 0;
            return false;
        }

        if (_consecutiveGood >= 3) {
            _consecutiveGood = 0;  // reset for next streak
            return true;
        }
        return false;
    },

    // --- Behavior ---
    onActivate: function(ctx) {
        ctx.manager.addModifier({
            source:    ctx.instanceId,
            attribute: "qualityGainRate",
            operation: "multiply",
            value:     1.15,
        });

        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "HOT STREAK\nYou're on fire! +15% quality gain.",
            icon:     "\uD83D\uDD25",
            color:    "#f59e0b",
            duration: 4000,
        });
    },

    // --- End Condition ---
    endWhen: {
        tag: EVENT_TAGS.FORGE_SESSION_COMPLETE,
        condition: function(ctx) {
            var quality = ctx.payload && ctx.payload.quality || 0;
            return quality < 30;
        },
    },

    // --- Cleanup ---
    onEnd: function(ctx) {
        // Modifier auto-removed by manager
        _consecutiveGood = 0;  // reset counter on end

        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "STREAK BROKEN\nThe fire fades.",
            icon:     "\u2744\uFE0F",
            color:    "#8a7a64",
            duration: 3000,
        });
    },
};

export default HotStreakAbility;