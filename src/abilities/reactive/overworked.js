// ============================================================
// overworked.js — Wobbly Anvil Reactive Ability
// Trigger: DAY_SET_STAMINA
// Effect:  -1 max stamina (add modifier on maxStamina)
// Activate: When stamina reaches 0 during a forge session
// End:      DAY_SLEEP_START (sleep clears exhaustion)
//
// Only fires once per day — not stackable. The stamina
// penalty persists until the player sleeps, meaning
// the NEXT day they wake with 1 fewer max stamina.
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";

var STAMINA_PENALTY = -1;

var OverworkedAbility = {

    // --- Identity ---
    id:       "overworked",
    tags:     ["reactive", "debuff", "stamina"],
    scope:    "manual",          // lives until sleep via endWhen
    stackable: false,

    // --- Activation ---
    trigger:  EVENT_TAGS.DAY_SET_STAMINA,

    canActivate: function(payload, manager, state) {
        // Don't stack — one overworked per day
        if (manager.isActive("overworked")) return false;

        // Only trigger when stamina hits 0 (exhaustion)
        // State provides current stamina BEFORE the delta is applied
        // by the bus handler, so we check: current + delta <= 0
        var currentStamina = state && state.stamina;
        if (currentStamina == null) return false;

        var delta = payload && payload.delta || 0;

        // Only care about stamina going DOWN to 0
        if (delta >= 0) return false;

        var afterDelta = currentStamina + delta;
        return afterDelta <= 0;
    },

    // --- Behavior ---
    onActivate: function(ctx) {
        ctx.manager.addModifier({
            source:    ctx.instanceId,
            attribute: "maxStamina",
            operation: "add",
            value:     STAMINA_PENALTY,
        });

        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "OVERWORKED\nYou pushed too hard. -1 max stamina.",
            icon:     "\uD83E\uDD75",
            color:    "#ef4444",
            duration: 5000,
        });
    },

    // --- End Condition ---
    endWhen: {
        tag: EVENT_TAGS.DAY_SLEEP_START,
    },

    // --- Cleanup ---
    onEnd: function(ctx) {
        // Modifier auto-removed by manager
        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "RESTED\nA good night's sleep restores your strength.",
            icon:     "\uD83D\uDCA4",
            color:    "#4ade80",
            duration: 3000,
        });
    },
};

export default OverworkedAbility;