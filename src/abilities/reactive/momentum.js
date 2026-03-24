// ============================================================
// momentum.js — Wobbly Anvil Reactive Ability
// Trigger: ECONOMY_WEAPON_SOLD
// Effect:  After 5 sales in one day, each subsequent sale
//          adds a stacking ×1.1 multiply on goldEarned.
// End:     DAY_CYCLE_END (day ends)
//
// Uses a closure counter to track sales this day.
// Sales 1-4 = no bonus, just counting.
// Sale 5 = activates + first ×1.1 modifier.
// Sale 6+ = each adds another ×1.1 modifier (stacks).
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";

// --- Closure state (persists across canActivate calls) ---
var _salesThisDay = 0;

var SALES_THRESHOLD = 5;
var GOLD_MULTIPLIER = 1.1;

var MomentumAbility = {

    // --- Identity ---
    id:       "momentum",
    tags:     ["reactive", "buff", "economy"],
    scope:    "manual",          // lives until day end via endWhen
    stackable: false,

    // --- Activation ---
    trigger:  EVENT_TAGS.ECONOMY_WEAPON_SOLD,

    canActivate: function(payload, manager, state) {
        _salesThisDay++;

        // Activate on the 5th sale
        if (_salesThisDay >= SALES_THRESHOLD && !manager.isActive("momentum")) {
            return true;
        }

        // Already active — stack another modifier via onStack below
        if (_salesThisDay > SALES_THRESHOLD && manager.isActive("momentum")) {
            // Manager won't call onActivate (stackable: false + already active).
            // We handle stacking via a bus listener set up in onActivate.
        }

        return false;
    },

    // --- Behavior ---
    onActivate: function(ctx) {
        // First modifier (sale 5)
        ctx.manager.addModifier({
            source:    ctx.instanceId,
            attribute: "goldEarned",
            operation: "multiply",
            value:     GOLD_MULTIPLIER,
        });

        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "MOMENTUM\nYou're on a roll! Gold earned +10%.",
            icon:     "\uD83D\uDCB0",
            color:    "#f59e0b",
            duration: 4000,
        });

        // Set up stacking listener for subsequent sales
        var stackHandler = function(stackPayload) {
            _salesThisDay++;
            ctx.manager.addModifier({
                source:    ctx.instanceId,
                attribute: "goldEarned",
                operation: "multiply",
                value:     GOLD_MULTIPLIER,
            });

            ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
                msg:      "MOMENTUM x" + (_salesThisDay - SALES_THRESHOLD + 1) + "\nGold bonus stacks!",
                icon:     "\uD83D\uDCB0",
                color:    "#f59e0b",
                duration: 3000,
            });
        };

        // Store handler ref for cleanup
        ctx._stackHandler = stackHandler;
        // Use a small property on the manager's instance to track
        // We store on the context's instanceId key in a module-level map
        _stackHandlers[ctx.instanceId] = stackHandler;
        ctx.bus.on(EVENT_TAGS.ECONOMY_WEAPON_SOLD, stackHandler);
    },

    // --- End Condition ---
    endWhen: {
        tag: EVENT_TAGS.DAY_CYCLE_END,
    },

    // --- Cleanup ---
    onEnd: function(ctx) {
        // Remove stacking listener
        var handler = _stackHandlers[ctx.instanceId];
        if (handler) {
            ctx.bus.off(EVENT_TAGS.ECONOMY_WEAPON_SOLD, handler);
            delete _stackHandlers[ctx.instanceId];
        }

        // Reset counter for next day
        _salesThisDay = 0;

        // Modifiers auto-removed by manager (matched by source)
        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg:      "MOMENTUM FADES\nA new day, a fresh start.",
            icon:     "\uD83C\uDF19",
            color:    "#8a7a64",
            duration: 3000,
        });
    },
};

// Module-level map for stacking handler cleanup
var _stackHandlers = {};

export default MomentumAbility;