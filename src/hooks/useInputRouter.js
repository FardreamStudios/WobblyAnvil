// ============================================================
// useInputRouter.js — Wobbly Anvil Input Router
// Single source of truth for every button's disabled state.
//
// Stamina + time are both resources. Gates check whether the
// player can afford the action. Views read gates — zero inline
// logic in the render tree.
//
// noStamina flag: returned so views can morph buttons (e.g.
// forge → rest) when stamina is depleted mid-forge.
// ============================================================

import GameConstants from "../modules/constants.js";
import GameUtils from "../modules/utilities.js";

var BALANCE = GameConstants.BALANCE;
var REST_HOUR_LIMIT = GameConstants.REST_HOUR_LIMIT;

var canAffordTime = GameUtils.canAffordTime;

// ------------------------------------------------------------
// Helper: build an action gate object.
// ------------------------------------------------------------
function gate(disabled) {
    return { disabled: disabled };
}

// ============================================================
// Hook
// ============================================================

function useInputRouter(deps) {
    // --- Unpack dependencies ---
    var hour            = deps.hour;
    var stamina         = deps.stamina;
    var stress          = deps.stress;
    var sessCost        = deps.sessCost;
    var isQTEActive     = deps.isQTEActive;
    var isForging       = deps.isForging;
    var activeCustomer  = deps.activeCustomer;
    var toastQueue      = deps.toastQueue;
    var mysteryPending  = deps.mysteryPending;
    var finished        = deps.finished;
    var promoteUses     = deps.promoteUses;
    var gold            = deps.gold;
    var inv             = deps.inv;
    var matKey          = deps.matKey;
    var weapon          = deps.weapon;
    var buyPrice        = deps.buyPrice;

    // --- Master lock ---
    var isLocked = isQTEActive
        || !!activeCustomer
        || toastQueue.length > 0
        || mysteryPending;

    // DEBUG — remove after identifying stuck flag
    if (isLocked) console.log("[InputRouter] LOCKED:", { isQTEActive: isQTEActive, activeCustomer: !!activeCustomer, toastQueue: toastQueue.length, mysteryPending: mysteryPending });

    // --- Stamina helpers ---
    var noStamina       = stamina <= 0;
    var canRest         = canAffordTime(hour, 2);
    var canAffordSess   = canAffordTime(hour, sessCost);

    // ============================================================
    // Action Gates
    // ============================================================

    // --- Idle phase actions ---

    var beginForge = gate(
        isLocked || noStamina || !canAffordSess
    );

    var resumeWip = gate(
        isLocked || noStamina || !canAffordSess
    );

    var sleep = gate(isLocked);

    var rest = gate(
        isLocked || hour >= REST_HOUR_LIMIT || !canRest
    );

    var promote = gate(
        isLocked
        || hour >= 24
        || finished.length === 0
        || promoteUses >= BALANCE.maxPromoteUses
        || !canAffordTime(hour, 1)
    );

    var scavenge = gate(
        isLocked
        || hour >= 24
        || !canAffordTime(hour, 1)
        || noStamina
    );

    var shop = gate(isLocked);
    var mats = gate(isLocked);
    var statAlloc = gate(isLocked || isForging);

    // --- Forging phase actions ---

    var forge = gate(
        isLocked || noStamina || !canAffordSess
    );

    var normalize = gate(
        stress <= 0 || !canAffordTime(hour, 2)
    );

    var quench = gate(
        noStamina || !canAffordSess
    );

    // --- Weapon select ---

    var confirmSelect = gate(
        ((inv[matKey] || 0) < (weapon ? weapon.materialCost : 0)
            && gold < (buyPrice || 0))
        || noStamina
        || !canAffordSess
    );

    // ============================================================
    // Return
    // ============================================================

    return {
        isLocked: isLocked,
        noStamina: noStamina,

        // Idle
        beginForge: beginForge,
        resumeWip: resumeWip,
        sleep: sleep,
        rest: rest,
        promote: promote,
        scavenge: scavenge,
        shop: shop,
        mats: mats,
        statAlloc: statAlloc,

        // Forging
        forge: forge,
        normalize: normalize,
        quench: quench,

        // Select
        confirmSelect: confirmSelect,
    };
}

export default useInputRouter;