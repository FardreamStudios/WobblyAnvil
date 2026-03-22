// ============================================================
// mysteryShadow.js — Wobbly Anvil Complex Morning Ability
// "The Shadow" — dark presence destroys materials, steals gold,
// removes a finished weapon, and may destroy WIP.
//
// This is a COMPLEX ability — it owns choreographed timing,
// live state damage computation, and conditional WIP destruction.
// Cannot be expressed as a data table row.
//
// DAMAGE COMPUTATION (from live state at activation):
//   1. Destroy highest-value material stack entirely
//   2. Lose 15-20% of current gold
//   3. Remove one finished weapon (if any)
//   4. -1 reputation
//   5. -15% XP
//   6. Destroy WIP if player was forging
//
// VFX SEQUENCE (7s total):
//   0.0s — Lock UI, start shake + red vignette
//   0.0s — Apply all damage, queue rep loss
//   0.0s — Toast with loss summary (7s, locked)
//   3.5s — Stop shake
//   7.0s — Clear vignette, unlock UI
//
// SCOPE: "manual" — persists until triggered.
//
// Replaces: dynamicEvents.js → mysteryBad()
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";
import GameConstants from "../../modules/constants.js";
import GameUtils from "../../modules/utilities.js";

var MATS = GameConstants.MATS;
var rand = GameUtils.rand;

// --- Find the most valuable owned material stack ---
function findMostValuableStack(inv) {
    var matKeys = Object.keys(MATS);
    var owned = matKeys.filter(function(k) { return (inv[k] || 0) > 0; });
    if (!owned.length) return null;
    return owned.reduce(function(a, b) {
        return (inv[a] || 0) * (MATS[a].price || 1) > (inv[b] || 0) * (MATS[b].price || 1) ? a : b;
    });
}

var MysteryShadowAbility = {
    // --- Identity ---
    id:          "mystery_shadow",
    tags:        ["mystery", "event", "hazard"],
    scope:       "manual",
    stackable:   false,

    // --- Activation ---
    trigger:     "game.day.morning_phase",

    canActivate: function(payload, manager, state) {
        // ~5% chance for shadow specifically
        // (old system: mystery 3/total weight, then 25% shadow variant)
        if (manager.isActive("mystery_visitor") || manager.isActive("mystery_shadow")) return false;
        return Math.random() < 0.05;
    },

    // --- Behavior ---
    onActivate: function(ctx) {
        var state = ctx.state;
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

        // Check if player is currently forging (phase is not idle/select)
        var phase = state.phase || "idle";
        var wasForging = phase !== "idle" && phase !== "select" && phase !== "select_mat";

        // --- FX cue ---
        ctx.bus.emit(EVENT_TAGS.FX_MYSTERY_BAD, {});

        // --- Lock UI during sequence ---
        ctx.bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: true });

        // --- VFX: shake + red vignette ---
        ctx.bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: true });
        ctx.bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: "#ef4444", opacity: 1 });

        // --- State mutations ---
        if (goldLost > 0) {
            ctx.bus.emit(EVENT_TAGS.ECONOMY_SPEND_GOLD, { amount: goldLost });
        }
        ctx.bus.emit(EVENT_TAGS.ECONOMY_SET_INVENTORY, { inv: newInv });
        if (finishedLost) {
            ctx.bus.emit(EVENT_TAGS.ECONOMY_SET_INVENTORY, { finished: newFinished });
        }
        ctx.bus.emit(EVENT_TAGS.PLAYER_CHANGE_REP, { delta: -1, delay: 7000 });
        ctx.bus.emit(EVENT_TAGS.PLAYER_LOSE_XP, { percent: 0.15 });

        // --- Destroy WIP if forging ---
        if (wasForging) {
            ctx.bus.emit(EVENT_TAGS.FORGE_DESTROY_WIP, {});
        }

        // --- Toast ---
        var lostDesc = [];
        if (worstKey) lostDesc.push("all " + (MATS[worstKey] && MATS[worstKey].name || worstKey));
        if (goldLost > 0) lostDesc.push(goldLost + "g");
        if (finishedLost) lostDesc.push("a finished weapon");

        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg: "A DARK PRESENCE\nA shadow swept through the forge. Lost " + lostDesc.join(", ") + ".",
            icon: "\uD83C\uDF11",
            color: "#ef4444",
            duration: 7000,
            locked: true,
        });

        // --- Timed cleanup ---
        var endSelf = ctx.endSelf;

        setTimeout(function() {
            ctx.bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: false });
        }, 3500);

        setTimeout(function() {
            ctx.bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: null, opacity: 0 });
            ctx.bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: false });
            endSelf();
        }, 7000);
    },

    // --- End ---
    endWhen:  null,
    duration: null,
    onEnd:    null,
};

export default MysteryShadowAbility;