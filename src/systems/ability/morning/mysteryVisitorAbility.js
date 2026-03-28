// ============================================================
// mysteryVisitor.js — Wobbly Anvil Complex Morning Ability
// "The Visitor" — divine presence grants rare materials,
// reputation, and XP with a timed VFX sequence.
//
// DEFERRED-FIRE LIFECYCLE:
//   Morning roll → onActivate (silent foreshadow, no VFX)
//   Waits for:
//     - DAY_SLEEP_START (guaranteed fire at end of day)
//     - FORGE_SESSION_COMPLETE (20% chance to ambush mid-forge)
//   When triggered → full VFX sequence (7s)
//   After VFX → endSelf()
//
// VFX SEQUENCE (7s total):
//   0.0s — FX cue, lock UI, shake + golden vignette
//   0.0s — Grant materials, queue rep/XP gains
//   0.0s — Toast (7s duration, locked)
//   3.5s — Stop shake
//   7.0s — Clear vignette, unlock UI, endSelf
//
// SCOPE: "manual" — lives until the deferred trigger fires.
//
// Replaces: dynamicEvents.js → mysteryGood()
// ============================================================

import EVENT_TAGS from "../../../config/eventTags.js";
import GameConstants from "../../../modules/constants.js";

var MATS = GameConstants.MATS;
var FORGE_AMBUSH_CHANCE = 0.20;

// ============================================================
// VFX sequence — extracted so both triggers call the same code
// ============================================================

function fireVisitorSequence(bus, state, endSelf) {
    var matKey = Math.random() < 0.5 ? "mithril" : "orichalcum";
    var qty = Math.floor(Math.random() * 2) + 5;
    var matName = (MATS[matKey] && MATS[matKey].name) || matKey;

    bus.emit(EVENT_TAGS.FX_MYSTERY_GOOD, {});
    bus.emit(EVENT_TAGS.UI_SET_LOCK, { locked: true });
    bus.emit(EVENT_TAGS.VFX_SHAKE_MYSTERY, { active: true });
    bus.emit(EVENT_TAGS.VFX_SET_VIGNETTE, { color: "#fbbf24", opacity: 1 });

    bus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, { key: matKey, qty: qty });
    bus.emit(EVENT_TAGS.PLAYER_CHANGE_REP, { delta: 1, delay: 7000 });
    bus.emit(EVENT_TAGS.PLAYER_GAIN_XP, { percent: 0.10 });

    bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
        msg: "A DIVINE PRESENCE\nA luminous figure drifted through the forge and vanished. It left " + qty + " " + matName + ".",
        icon: "\uD83C\uDF1F",
        color: "#fbbf24",
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

var MysteryVisitorAbility = {
    // --- Identity ---
    id:          "mystery_visitor",
    tags:        ["mystery", "event", "buff"],
    scope:       "manual",
    stackable:   false,

    // --- Morning Roll ---
    morningPool: true,
    chance:      0.03,

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
        var fired = false;

        // Foreshadow — event banner, not toast (avoids interrupting morning toast queue)
        bus.emit(EVENT_TAGS.DAY_MORNING_EVENT_DISPLAY, {
            id: "mystery_visitor",
            title: "Something Stirs",
            desc: "A warm light flickers at the edge of your vision...",
            tag: "EVENT",
            icon: "\u2728",
            color: "#fbbf24",
        });

        function onSleep() {
            if (fired) return;
            fired = true;
            cleanup();
            fireVisitorSequence(bus, ctx.state, endSelf);
        }

        function onForgeComplete() {
            if (fired) return;
            if (Math.random() > FORGE_AMBUSH_CHANCE) return;
            fired = true;
            cleanup();
            fireVisitorSequence(bus, ctx.state, endSelf);
        }

        bus.on(EVENT_TAGS.DAY_SLEEP_START, onSleep);
        bus.on(EVENT_TAGS.FORGE_SESSION_COMPLETE, onForgeComplete);

        function cleanup() {
            bus.off(EVENT_TAGS.DAY_SLEEP_START, onSleep);
            bus.off(EVENT_TAGS.FORGE_SESSION_COMPLETE, onForgeComplete);
        }

        // Stash cleanup ref for external end
        ctx._mysteryCleanup = cleanup;
    },

    // --- End ---
    endWhen:  null,
    duration: null,

    onEnd: function(ctx) {
        if (ctx._mysteryCleanup) ctx._mysteryCleanup();
    },
};

export default MysteryVisitorAbility;