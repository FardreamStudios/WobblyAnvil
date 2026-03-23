// ============================================================
// mysteryLogic.js — Wobbly Anvil Mystery Event Choreography
// Pure functions that receive the bus + state snapshot,
// compute results, and emit tagged payloads.
// Extracted from dynamicEvents.js (legacy) during M-10 cleanup.
//
// TIMING: setTimeout choreography lives here — these functions
// own the "feel" of the event. Bus listeners are instant.
//
// UE ANALOGY: Gameplay Cue choreography functions.
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
// Plugin-style API
// ============================================================
var MysteryLogic = {
    mysteryGood: mysteryGood,
    mysteryBad: mysteryBad,
};

export default MysteryLogic;