// ============================================================
// royalAttention.js — Wobbly Anvil Reactive Ability
// Trigger: PLAYER_CHANGE_REP (any reputation change)
// Effect:  Customer spawn chance +30% (multiply 1.3)
// Activate: When reputation reaches 7+ ("Royal Favour")
// End:      When reputation drops below 7
//
// Permanent scope — persists across days as long as rep holds.
// Not stackable.
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import EVENT_TAGS from "../../../config/eventTags.js";

var REP_THRESHOLD = 7;

var RoyalAttentionAbility = {

    // --- Identity ---
    id:       "royal_attention",
    tags:     ["reactive", "buff", "customers"],
    scope:    "permanent",       // persists across days
    stackable: false,

    // --- Activation ---
    trigger:  EVENT_TAGS.PLAYER_CHANGE_REP,

    canActivate: function(payload, manager, state) {
        // Don't stack
        if (manager.isActive("royal_attention")) return false;

        // Only activate when rep crosses 7+ threshold
        var rep = state && state.reputation;
        if (rep == null) return false;

        // payload.delta tells us the change — we want upward crosses
        var delta = payload && payload.delta || 0;
        return rep >= REP_THRESHOLD && delta > 0;
    },

    // --- Behavior ---
    onActivate: function(ctx) {
        ctx.manager.addModifier({
            source:    ctx.instanceId,
            attribute: "customerChance",
            operation: "multiply",
            value:     1.3,
        });

        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "ROYAL ATTENTION\nYour fame spreads! More customers seek you out.",
            icon:     "\uD83D\uDC51",
            color:    "#22c55e",
            duration: 4000,
        });
    },

    // --- End Condition ---
    endWhen: {
        tag: EVENT_TAGS.PLAYER_CHANGE_REP,
        condition: function(ctx) {
            var state = ctx.state || {};
            var rep = state.reputation;
            if (rep == null) return false;
            return rep < REP_THRESHOLD;
        },
    },

    // --- Cleanup ---
    onEnd: function(ctx) {
        // Modifier auto-removed by manager
        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "ATTENTION FADES\nYour reputation no longer commands crowds.",
            icon:     "\uD83D\uDC51",
            color:    "#8a7a64",
            duration: 3000,
        });
    },
};

export default RoyalAttentionAbility;