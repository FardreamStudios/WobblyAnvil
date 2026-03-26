// ============================================================
// fxCueSubSystem.js — Wobbly Anvil Gameplay Cue System
// Pure JS singleton. Routes bus tags to self-contained cue
// objects that own all presentation (SFX, particles, FX).
//
// Merges the old fxCueRegistry (data) and useFXCues (router)
// into a single subsystem with init/destroy lifecycle.
//
// UE ANALOGY: GameplayCueManager — dumb plumbing that routes
// tags to GameplayCue actors. Knows nothing about what any
// cue actually does.
//
// LIFECYCLE:
//   init(bus, deps)  — subscribe to all cue tags
//   destroy()        — unsubscribe and clean up
//
// DEPS CONTRACT:
//   deps.sfx        — audio API object (from useAudio)
//   deps.fxRef      — React ref to FX layer
//   deps.sceneFxRef — React ref to scene-level FX layer
//
// ADDING CUES: Drop an object into CUES array below. Done.
// If file exceeds 500 lines, split cues into domain files
// (forgeCues.js, economyCues.js) and import here.
//
// PORTABLE: Pure JS. No React imports.
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";

// ============================================================
// INTERNAL STATE
// ============================================================

var _bus = null;
var _initialized = false;
var _handlers = [];

// Deps stored at init — accessed by cue execute functions
var _sfx = null;
var _fxRef = null;
var _sceneFxRef = null;

// ============================================================
// CUE DEFINITIONS
// Each cue: { tag, execute(sfx, fxRef, payload, sceneFxRef) }
// The cue owns ALL presentation — SFX calls, particle
// triggers, timing, conditional logic based on payload.
// The emitter has zero knowledge of what happens visually.
// ============================================================

var CUES = [

    // ========== FORGE ==========

    {
        tag: EVENT_TAGS.FX_HEAT_RESULT,
        execute: function(sfx, fxRef, payload) {
            sfx.heat(payload.quality);
        },
    },

    {
        tag: EVENT_TAGS.FX_HAMMER_HIT,
        execute: function(sfx, fxRef, payload) {
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
            sfx.fireTornado();
            sfx.dragonFlyby();
        },
    },

];

// ============================================================
// SETUP
// ============================================================

function init(bus, deps) {
    if (_initialized) {
        console.warn("[FXCueSubSystem] Already initialized. Call destroy() first.");
        return;
    }

    _bus = bus;
    _sfx = deps.sfx;
    _fxRef = deps.fxRef;
    _sceneFxRef = deps.sceneFxRef || null;
    _initialized = true;

    // Subscribe to each cue's tag
    for (var i = 0; i < CUES.length; i++) {
        var cue = CUES[i];
        var handler = _buildHandler(cue);
        _bus.on(cue.tag, handler);
        _handlers.push({ tag: cue.tag, handler: handler });
    }
}

function _buildHandler(cue) {
    return function(payload) {
        cue.execute(_sfx, _fxRef, payload || {}, _sceneFxRef);
    };
}

function destroy() {
    if (!_initialized) return;
    for (var i = 0; i < _handlers.length; i++) {
        _bus.off(_handlers[i].tag, _handlers[i].handler);
    }
    _handlers = [];
    _sfx = null;
    _fxRef = null;
    _sceneFxRef = null;
    _initialized = false;
    _bus = null;
}

// ============================================================
// PUBLIC API
// ============================================================

var FXCueSubSystem = {
    init:    init,
    destroy: destroy,
};

export default FXCueSubSystem;