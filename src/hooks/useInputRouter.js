// ============================================================
// useInputRouter.js — Wobbly Anvil Input Router
// Single source of truth for every button's disabled state
// and stamina-redirect ("needRest") flag.
//
// Pattern: consumes raw state from all domain hooks,
// returns a flat object of named action gates.
// Views read these — zero inline logic in the render tree.
// ============================================================

import GameConstants from "../modules/constants.js";
import GameUtils from "../modules/utilities.js";

var BALANCE = GameConstants.BALANCE;
var REST_HOUR_LIMIT = GameConstants.REST_HOUR_LIMIT;

var canAffordTime = GameUtils.canAffordTime;

// ------------------------------------------------------------
// Helper: build an action gate with disabled + redirectToRest
// ------------------------------------------------------------
function gate(disabled, redirectToRest) {
    return { disabled: disabled, redirectToRest: !!redirectToRest };
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
    var activeToast     = deps.activeToast;
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

    // --- Stamina helpers ---
    var exhausted       = stamina <= 0;
    var canRest         = canAffordTime(hour, 2);
    var canAffordSess   = canAffordTime(hour, sessCost);

    // Redirect pattern: exhausted but CAN rest → swap action to waitHour
    var staminaRedirect = exhausted && canRest;
    // Hard block: exhausted and CAN'T even rest
    var staminaBlock    = exhausted && !canRest;

    // ============================================================
    // Action Gates
    // ============================================================

    // --- Idle phase actions ---

    var beginForge = gate(
        isLocked || (!canAffordSess && !staminaRedirect),
        staminaRedirect
    );

    var resumeWip = gate(
        isLocked || !canAffordSess,
        false
    );

    var sleep = gate(isLocked, false);

    var rest = gate(
        isLocked || hour >= REST_HOUR_LIMIT || !canRest,
        false
    );

    var promote = gate(
        isLocked
        || hour >= 24
        || finished.length === 0
        || promoteUses >= BALANCE.maxPromoteUses
        || !canAffordTime(hour, 1),
        staminaRedirect
    );

    var scavenge = gate(
        isLocked
        || hour >= 24
        || !canAffordTime(hour, 1)
        || staminaBlock,
        staminaRedirect
    );

    var shop = gate(isLocked, false);
    var mats = gate(isLocked, false);
    var statAlloc = gate(isLocked || isForging, false);

    // --- Forging phase actions ---

    var forge = gate(
        isLocked || staminaBlock || !canAffordSess,
        staminaRedirect
    );

    var normalize = gate(
        stress <= 0 || !canAffordTime(hour, 2),
        false
    );

    var quench = gate(
        (exhausted && !canRest) || (!canAffordSess && !exhausted),
        staminaRedirect
    );

    // --- Weapon select ---

    var confirmSelect = gate(
        ((inv[matKey] || 0) < (weapon ? weapon.materialCost : 0)
            && gold < (buyPrice || 0))
        || exhausted
        || !canAffordSess,
        false
    );

    // ============================================================
    // Return
    // ============================================================

    return {
        isLocked: isLocked,

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