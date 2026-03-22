// ============================================================
// dynamicEvents.js — Wobbly Anvil Dynamic Event Emitters
// Each event is a function that receives the bus + state
// snapshot, computes results, and emits tagged payloads.
// The event doesn't know who's listening.
//
// PATTERN:
//   function myEvent(bus, snapshot, options) {
//       // compute
//       bus.emit(TAG, payload);
//   }
//
// TIMING: setTimeout choreography lives here — these functions
// own the "feel" of the event. Bus listeners are instant.
//
// ADDING NEW EVENTS: Write a function, emit tags. Done.
// ============================================================

import EVENT_TAGS from "../config/eventTags.js";
import GameConstants from "../modules/constants.js";
import GameUtils from "../modules/utilities.js";

var MATS = GameConstants.MATS;
var rand = GameUtils.rand;

// ============================================================
// Mystery Good — "The Visitor"
// Grants rare materials, reputation, XP, plays VFX sequence.
// ============================================================

function mysteryGood(bus, snapshot) {
    var matKey = Math.random() < 0.5 ? "mithril" : "orichalcum";
    var qty = Math.floor(Math.random() * 2) + 5;
    var matName = (MATS[matKey] && MATS[matKey].name) || matKey;

    // --- Lock UI during sequence ---
    bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: true });

    // --- VFX: shake + golden vignette ---
    bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: true });
    bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: "#fbbf24", opacity: 1 });

    // --- State mutations (listeners apply these) ---
    bus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, { key: matKey, qty: qty });
    bus.emit(EVENT_TAGS.PLAYER_CHANGE_REP, { delta: 1, delay: 7000 });
    bus.emit(EVENT_TAGS.PLAYER_GAIN_XP, { percent: 0.10 });

    // --- Toast ---
    bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
        msg: "A DIVINE PRESENCE\nA luminous figure drifted through the forge and vanished. It left " + qty + " " + matName + ".",
        icon: "\uD83C\uDF1F",
        color: "#fbbf24",
        duration: 7000,
        locked: true,
    });

    // --- Timed cleanup ---
    setTimeout(function() {
        bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: false });
    }, 3500);

    setTimeout(function() {
        bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: null, opacity: 0 });
        bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: false });
    }, 7000);
}

// ============================================================
// Mystery Bad — "The Shadow"
// Destroys most valuable material stack, steals gold,
// may destroy WIP weapon. Plays dark VFX sequence.
// ============================================================

function mysteryBad(bus, snapshot, wasForging) {
    var inv = snapshot.inv || {};
    var gold = snapshot.gold || 0;
    var finished = snapshot.finished || [];

    // --- Compute damage ---
    var matKeys = Object.keys(MATS);
    var owned = matKeys.filter(function(k) { return (inv[k] || 0) > 0; });
    var worstKey = owned.length ? owned.reduce(function(a, b) {
        return (inv[a] || 0) * (MATS[a].price || 1) > (inv[b] || 0) * (MATS[b].price || 1) ? a : b;
    }) : null;

    var newInv = Object.assign({}, inv);
    if (worstKey) newInv[worstKey] = 0;

    var goldLost = Math.floor(gold * rand(0.15, 0.20));
    var finishedLost = finished.length > 0;
    var newFinished = finishedLost ? finished.slice(0, -1) : finished;

    // --- Lock UI during sequence ---
    bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: true });

    // --- VFX: shake + red vignette ---
    bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: true });
    bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: "#ef4444", opacity: 1 });

    // --- State mutations ---
    if (goldLost > 0) {
        bus.emit(EVENT_TAGS.ECONOMY_SPEND_GOLD, { amount: goldLost });
    }
    bus.emit(EVENT_TAGS.ECONOMY_SET_INVENTORY, { inv: newInv });
    if (finishedLost) {
        bus.emit(EVENT_TAGS.ECONOMY_SET_INVENTORY, { finished: newFinished });
    }
    bus.emit(EVENT_TAGS.PLAYER_CHANGE_REP, { delta: -1, delay: 7000 });
    bus.emit(EVENT_TAGS.PLAYER_LOSE_XP, { percent: 0.15 });

    // --- Destroy WIP if forging ---
    if (wasForging) {
        bus.emit(EVENT_TAGS.FORGE_DESTROY_WIP, {});
    }

    // --- Toast ---
    var lostDesc = [];
    if (worstKey) lostDesc.push("all " + (MATS[worstKey] && MATS[worstKey].name || worstKey));
    if (goldLost > 0) lostDesc.push(goldLost + "g");
    if (finishedLost) lostDesc.push("a finished weapon");

    bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
        msg: "A DARK PRESENCE\nA shadow swept through the forge. Lost " + lostDesc.join(", ") + ".",
        icon: "\uD83C\uDF11",
        color: "#ef4444",
        duration: 7000,
        locked: true,
    });

    // --- Timed cleanup ---
    setTimeout(function() {
        bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: false });
    }, 3500);

    setTimeout(function() {
        bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: null, opacity: 0 });
        bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: false });
    }, 7000);
}

// ============================================================
// applyEventResult — Generic daily event router
// Takes a rolled event result object and emits matching tags.
// Used by buildDayQueue (GEB-6) to replace the if-chain.
// ============================================================

function applyEventResult(bus, result) {
    if (!result) return;

    if (result.goldDelta !== undefined && result.goldDelta !== 0) {
        if (result.goldDelta > 0) {
            bus.emit(EVENT_TAGS.ECONOMY_EARN_GOLD, { amount: result.goldDelta });
        } else {
            bus.emit(EVENT_TAGS.ECONOMY_SPEND_GOLD, { amount: -result.goldDelta });
        }
    }
    if (result.inv !== undefined) {
        bus.emit(EVENT_TAGS.ECONOMY_SET_INVENTORY, { inv: result.inv });
    }
    if (result.hour !== undefined) {
        bus.emit(EVENT_TAGS.DAY_ADVANCE_HOUR, { hour: result.hour });
    }
    if (result.stamina !== undefined) {
        bus.emit(EVENT_TAGS.DAY_SET_STAMINA, { stamina: result.stamina });
    }
    if (result.finished !== undefined) {
        bus.emit(EVENT_TAGS.ECONOMY_SET_INVENTORY, { finished: result.finished });
    }
    if (result.forcedExhaustion) {
        bus.emit(EVENT_TAGS.DAY_FORCE_EXHAUSTION, {});
    }
    if (result.priceBonus) {
        bus.emit(EVENT_TAGS.ECONOMY_EARN_GOLD, { priceBonus: result.priceBonus });
    }
    if (result.priceDebuff) {
        bus.emit(EVENT_TAGS.ECONOMY_SPEND_GOLD, { priceDebuff: result.priceDebuff });
    }
    if (result.matDiscount) {
        bus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, { matDiscount: result.matDiscount });
    }
    if (result.globalMatMult) {
        bus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, { globalMatMult: result.globalMatMult });
    }
    if (result.guaranteedCustomers) {
        bus.emit(EVENT_TAGS.ECONOMY_EARN_GOLD, { guaranteedCustomers: true });
    }
    if (result.extraCustomers) {
        bus.emit(EVENT_TAGS.ECONOMY_EARN_GOLD, { extraCustomers: result.extraCustomers });
    }
}

// ============================================================
// Export
// ============================================================

var DynamicEvents = {
    mysteryGood: mysteryGood,
    mysteryBad: mysteryBad,
    applyEventResult: applyEventResult,
};

export default DynamicEvents;