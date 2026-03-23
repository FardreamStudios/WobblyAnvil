// ============================================================
// mysteryShadow.js — Wobbly Anvil Complex Morning Ability
// "The Shadow" — dark presence destroys materials, steals gold,
// removes a finished weapon, and may destroy WIP.
//
// DEFERRED-FIRE LIFECYCLE:
//   Morning roll → onActivate (silent foreshadow, no VFX)
//   Waits for:
//     - DAY_SLEEP_START (guaranteed fire at end of day)
//     - FORGE_SESSION_COMPLETE (25% chance to ambush mid-forge)
//   When triggered → full VFX + damage sequence (7s)
//   After VFX → endSelf()
//
// DAMAGE COMPUTATION (from live state at fire time):
//   1. Destroy highest-value material stack entirely
//   2. Lose 15-20% of current gold
//   3. Remove one finished weapon (if any)
//   4. -1 reputation
//   5. -15% XP
//   6. Destroy WIP if player was forging (checked via state.phase)
//
// VFX SEQUENCE (7s total):
//   0.0s — FX cue, lock UI, shake + red vignette
//   0.0s — Apply all damage, queue rep loss
//   0.0s — Toast with loss summary (7s, locked)
//   3.5s — Stop shake
//   7.0s — Clear vignette, unlock UI, endSelf
//
// SCOPE: "manual" — lives until the deferred trigger fires.
//
// Replaces: dynamicEvents.js → mysteryBad()
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";
import GameConstants from "../../modules/constants.js";
import GameUtils from "../../modules/utilities.js";

var MATS = GameConstants.MATS;
var rand = GameUtils.rand;
var FORGE_AMBUSH_CHANCE = 0.25;

// --- Find the most valuable owned material stack ---
function findMostValuableStack(inv) {
    var matKeys = Object.keys(MATS);
    var owned = matKeys.filter(function(k) { return (inv[k] || 0) > 0; });
    if (!owned.length) return null;
    return owned.reduce(function(a, b) {
        return (inv[a] || 0) * (MATS[a].price || 1) > (inv[b] || 0) * (MATS[b].price || 1) ? a : b;
    });
}

// ============================================================
// VFX + damage sequence — called by both triggers
// ============================================================

function fireShadowSequence(bus, stateProvider, endSelf) {
    // Read LIVE state at fire time (not morning snapshot)
    var state = typeof stateProvider === "function" ? stateProvider() : stateProvider;
    var inv = state.inv || {};
    var gold = state.gold || 0;
    var finished = state.finished || [];

    // --- Compute damage ---
    var worstKey = findMostValuableStack(inv);
    var newInv = Object.assign({}, inv);
    if (worstKey) newInv[worstKey] = 0;

    var goldLost = Math.floor(gold * rand(0.15, 0.20));
    var finishedLost = finished.length > 0;
    var newFinished = finishedLost ? finished.slice(0, -1) : finished;

    var phase = state.phase || "idle";
    var wasForging = phase !== "idle" && phase !== "select" && phase !== "select_mat";

    // --- FX cue ---
    bus.emit(EVENT_TAGS.FX_MYSTERY_BAD, {});
    bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: true });
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

    setTimeout(function() {
        bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: false });
    }, 3500);

    setTimeout(function() {
        bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: null, opacity: 0 });
        bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: false });
        endSelf();
    }, 7000);
}

// ============================================================
// Ability Definition
// ============================================================

var MysteryShadowAbility = {
    // --- Identity ---
    id:          "mystery_shadow",
    tags:        ["mystery", "event", "hazard"],
    scope:       "manual",
    stackable:   false,

    // --- Morning Roll ---
    morningPool: true,
    chance:      0.05,

    // --- Activation ---
    trigger:     null,

    canActivate: function(payload, manager, state) {
        if (manager.isActive("mystery_visitor") || manager.isActive("mystery_shadow")) return false;
        return true;
    },

    // --- Behavior: Silent foreshadow + deferred trigger wiring ---
    onActivate: function(ctx) {
        var bus = ctx.bus;
        var endSelf = ctx.endSelf;
        // Capture manager ref so we can read live state at fire time
        // ctx.state is a snapshot from activation — stale by sleep time
        var manager = ctx.manager;
        var getState = ctx.getState;
        var fired = false;

        // Foreshadow toast
        bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg: "SOMETHING STIRS\nA cold draft chills the forge...",
            icon: "\uD83C\uDF19",
            color: "#8a7a64",
            duration: 3000,
        });

        function onSleep() {
            if (fired) return;
            fired = true;
            cleanup();
            fireShadowSequence(bus, getState, endSelf);
        }

        function onForgeComplete() {
            if (fired) return;
            if (Math.random() > FORGE_AMBUSH_CHANCE) return;
            fired = true;
            cleanup();
            fireShadowSequence(bus, getState, endSelf);
        }

        bus.on(EVENT_TAGS.DAY_SLEEP_START, onSleep);
        bus.on(EVENT_TAGS.FORGE_SESSION_COMPLETE, onForgeComplete);

        function cleanup() {
            bus.off(EVENT_TAGS.DAY_SLEEP_START, onSleep);
            bus.off(EVENT_TAGS.FORGE_SESSION_COMPLETE, onForgeComplete);
        }

        ctx._mysteryCleanup = cleanup;
    },

    // --- End ---
    endWhen:  null,
    duration: null,

    onEnd: function(ctx) {
        if (ctx._mysteryCleanup) ctx._mysteryCleanup();
    },
};

export default MysteryShadowAbility;