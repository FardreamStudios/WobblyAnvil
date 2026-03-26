// ============================================================
// shameDebuff.js — Wobbly Anvil Reactive Ability
// Trigger: QUEST_FAILED
// Effect:  Customer spawn chance -50% (multiply 0.5)
// End:     Next successful weapon sale (ECONOMY_WEAPON_SOLD)
//
// Straightforward reactive: any quest failure activates,
// first sale after that clears the debuff.
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import EVENT_TAGS from "../../../config/eventTags.js";

var ShameDebuffAbility = {

    // --- Identity ---
    id:       "shame_debuff",
    tags:     ["reactive", "debuff", "customers"],
    scope:    "manual",          // lives until end condition fires
    stackable: false,

    // --- Activation ---
    trigger:  EVENT_TAGS.QUEST_FAILED,

    canActivate: function(payload, manager, state) {
        // Don't stack — one shame at a time
        return !manager.isActive("shame_debuff");
    },

    // --- Behavior ---
    onActivate: function(ctx) {
        ctx.manager.addModifier({
            source:    ctx.instanceId,
            attribute: "customerChance",
            operation: "multiply",
            value:     0.5,
        });

        ctx.manager.queueToast({
            msg:      "SHAME\nWord spreads of your failure. Fewer customers.",
            icon:     "\uD83D\uDE14",
            color:    "#ef4444",
            duration: 5000,
        });
    },

    // --- End Condition ---
    endWhen: {
        tag: EVENT_TAGS.ECONOMY_WEAPON_SOLD,
    },

    // --- Cleanup ---
    onEnd: function(ctx) {
        // Modifier auto-removed by manager
        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "REDEEMED\nA sale restores your reputation.",
            icon:     "\u2728",
            color:    "#4ade80",
            duration: 3000,
        });
    },
};

export default ShameDebuffAbility;