// ============================================================
// mysteryVisitor.js — Wobbly Anvil Complex Morning Ability
// "The Visitor" — divine presence grants rare materials,
// reputation, and XP with a timed VFX sequence.
//
// This is a COMPLEX ability — it owns choreographed timing
// and cannot be expressed as a data table row.
//
// VFX SEQUENCE (7s total):
//   0.0s — Lock UI, start shake + golden vignette
//   0.0s — Grant materials, queue rep/XP gains
//   0.0s — Toast (7s duration, locked)
//   3.5s — Stop shake
//   7.0s — Clear vignette, unlock UI
//
// SCOPE: "manual" — persists until triggered by sleep or
// mid-forge check. endSelf() called after sequence completes.
//
// Replaces: dynamicEvents.js → mysteryGood()
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";
import GameConstants from "../../modules/constants.js";

var MATS = GameConstants.MATS;

var MysteryVisitorAbility = {
    // --- Identity ---
    id:          "mystery_visitor",
    tags:        ["mystery", "event", "buff"],
    scope:       "manual",
    stackable:   false,

    // --- Activation ---
    // Trigger: morning phase, but only activates as a pending
    // mystery — the actual VFX fires later via manual activation
    // or endWhen. For now, triggered by morning phase with low
    // chance. The "pending" deferral pattern will be wired in M-7.
    trigger:     "game.day.morning_phase",

    canActivate: function(payload, manager, state) {
        // Mystery pool: ~3% chance for visitor specifically
        // (old system: mystery 3/total weight, then 15% visitor variant)
        if (manager.isActive("mystery_visitor") || manager.isActive("mystery_shadow")) return false;
        return Math.random() < 0.03;
    },

    // --- Behavior ---
    onActivate: function(ctx) {
        // --- Compute rewards ---
        var matKey = Math.random() < 0.5 ? "mithril" : "orichalcum";
        var qty = Math.floor(Math.random() * 2) + 5; // 5-6
        var matName = (MATS[matKey] && MATS[matKey].name) || matKey;

        // --- FX cue ---
        ctx.bus.emit(EVENT_TAGS.FX_MYSTERY_GOOD, {});

        // --- Lock UI during sequence ---
        ctx.bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: true });

        // --- VFX: shake + golden vignette ---
        ctx.bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: true });
        ctx.bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: "#fbbf24", opacity: 1 });

        // --- State mutations ---
        ctx.bus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, { key: matKey, qty: qty });
        ctx.bus.emit(EVENT_TAGS.PLAYER_CHANGE_REP, { delta: 1, delay: 7000 });
        ctx.bus.emit(EVENT_TAGS.PLAYER_GAIN_XP, { percent: 0.10 });

        // --- Toast ---
        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg: "A DIVINE PRESENCE\nA luminous figure drifted through the forge and vanished. It left " + qty + " " + matName + ".",
            icon: "\uD83C\uDF1F",
            color: "#fbbf24",
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

export default MysteryVisitorAbility;