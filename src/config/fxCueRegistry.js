// ============================================================
// fxCueRegistry.js — Wobbly Anvil FX Cue Definitions
// Each cue is a self-contained object that owns its
// presentation logic. Receives sfx + fxRef + payload,
// decides what to play and how.
//
// PATTERN (UE Gameplay Cue style):
//   { tag: FX_TAG, execute: function(sfx, fxRef, payload) { ... } }
//
// The cue owns ALL presentation — SFX calls, particle
// triggers, timing, conditional logic based on payload.
// The emitter has zero knowledge of what happens visually.
//
// ADDING A NEW CUE: Drop an object into FX_CUES array. Done.
// If file exceeds 500 lines, split into domain files
// (forgeCues.js, economyCues.js) and re-export from here.
// ============================================================

import EVENT_TAGS from "./eventTags.js";

var FX_CUES = [

    // ========== FORGE ==========

    {
        tag: EVENT_TAGS.FX_HEAT_RESULT,
        execute: function(sfx, fxRef, payload) {
            // payload: { quality: "perfect"|"good"|"fair"|"poor"|"over" }
            sfx.heat(payload.quality);
        },
    },

    {
        tag: EVENT_TAGS.FX_HAMMER_HIT,
        execute: function(sfx, fxRef, payload) {
            // payload: { quality: "perfect"|"great"|"good"|"miss" }
            sfx.hammer(payload.quality);
        },
    },

    {
        tag: EVENT_TAGS.FX_QUENCH_SUCCESS,
        execute: function(sfx, fxRef, payload) {
            sfx.click();
            sfx.quench();
        },
    },

    {
        tag: EVENT_TAGS.FX_QUENCH_FAIL,
        execute: function(sfx, fxRef, payload) {
            sfx.click();
            sfx.quenchFail();
        },
    },

    {
        tag: EVENT_TAGS.FX_SHATTER,
        execute: function(sfx, fxRef, payload) {
            sfx.shatter();
        },
    },

    {
        tag: EVENT_TAGS.FX_ANVIL_SPARK,
        execute: function(sfx, fxRef, payload, sceneFxRef) {
            // Cosmetic spark burst synced to smith animation impact frame
            // payload: { x, y } — screen-relative position within scene stage
            var ref = sceneFxRef || fxRef;
            if (ref && ref.current && ref.current.trigger) {
                ref.current.trigger("sparks", {
                    x: payload.x,
                    y: payload.y,
                    count: 14,
                    color: "#fbbf24",
                });
            }
        },
    },

    {
        tag: EVENT_TAGS.FX_FINISH_WEAPON,
        execute: function(sfx, fxRef, payload) {
            // Reserved — add finish SFX here when ready
        },
    },

    // ========== QUEST ==========

    {
        tag: EVENT_TAGS.FX_ROYAL_DECREE,
        execute: function(sfx, fxRef, payload) {
            sfx.royal();
        },
    },

    // ========== ECONOMY ==========

    {
        tag: EVENT_TAGS.FX_DOORBELL,
        execute: function(sfx, fxRef, payload) {
            sfx.doorbell();
        },
    },

    {
        tag: EVENT_TAGS.FX_COIN_EARN,
        execute: function(sfx, fxRef, payload) {
            sfx.coin();
        },
    },

    {
        tag: EVENT_TAGS.FX_COIN_LOSS,
        execute: function(sfx, fxRef, payload) {
            sfx.coinLoss();
        },
    },

    // ========== UI ==========

    {
        tag: EVENT_TAGS.FX_TOAST,
        execute: function(sfx, fxRef, payload) {
            sfx.toast();
        },
    },

    {
        tag: EVENT_TAGS.FX_FANFARE,
        execute: function(sfx, fxRef, payload) {
            sfx.fanfare();
        },
    },

    // ========== PLAYER ==========

    {
        tag: EVENT_TAGS.FX_LEVEL_UP,
        execute: function(sfx, fxRef, payload) {
            sfx.levelup();
        },
    },

    {
        tag: EVENT_TAGS.FX_GAME_OVER,
        execute: function(sfx, fxRef, payload) {
            sfx.gameover();
        },
    },

    // ========== MYSTERY ==========

    {
        tag: EVENT_TAGS.FX_MYSTERY_GOOD,
        execute: function(sfx, fxRef, payload) {
            sfx.mysteryGood();
        },
    },

    {
        tag: EVENT_TAGS.FX_MYSTERY_BAD,
        execute: function(sfx, fxRef, payload) {
            // Sequenced — fire tornado + dragon flyby together
            sfx.fireTornado();
            sfx.dragonFlyby();
        },
    },

];

export default FX_CUES;