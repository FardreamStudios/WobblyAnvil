// ============================================================
// fairyHelper.js — Wobbly Anvil Fairy Brain
//
// State machine + trigger evaluator + line picker + bus wiring.
// Decides WHAT the fairy says and WHEN. Does not render
// anything — hands finished lines to an onSpeak callback.
//
// LIFECYCLE:
//   init(config)             — setup with bus, stateProvider, callbacks
//   reset()                  — clear cooldowns/decks, stay initialized
//   destroy()                — full teardown, unsub bus
//
// CORE:
//   processEvent(tag, pay)   — evaluate triggers for a bus event
//   tick()                   — periodic ambient/idle check (auto-managed)
//
// PLAYER:
//   dismiss() / enable()     — toggle fairy on/off
//
// QUERY:
//   getState() / isActive()
//
// BUS PATTERN: Subscribes to gameplay tags from fairyTriggers.
// Read-only on game state — never emits gameplay tags.
// Talks to renderer only through onSpeak callback.
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import FairyPersonality from "../config/fairyPersonality.js";
import FairyTriggers    from "../config/fairyTriggers.js";
import FairyAPI         from "../logic/fairyAPI.js";
import EVENT_TAGS       from "../config/eventTags.js";

// ============================================================
// CONSTANTS
// ============================================================

var STATES = {
    IDLE:       "idle",
    POINTING:   "pointing",
    ESCALATING: "escalating",
    FLUSTERED:  "flustered",
    EXITING:    "exiting",
    DISMISSED:  "dismissed",
    OFF:        "off",
};

// How long each state persists before auto-transitioning (ms)
// null = no auto-transition, requires explicit trigger
var STATE_DURATIONS = {
    idle:       null,
    pointing:   6000,
    escalating: 8000,
    flustered:  5000,
    exiting:    3000,
    dismissed:  null,
    off:        null,
};

// Escalation: how many times a trigger can be ignored before
// the fairy escalates through pointing → escalating → flustered → exit
var IGNORE_THRESHOLD_ESCALATE  = 2;
var IGNORE_THRESHOLD_FLUSTERED = 4;
var IGNORE_THRESHOLD_EXIT      = 6;

// Ambient tick interval (ms) — how often we poll for idle triggers
var TICK_INTERVAL_MS = 10000;

// Tier 2 signal — returned when no static line matches
var LLM_NEEDED = "__LLM_NEEDED__";

// ============================================================
// INTERNAL STATE
// ============================================================

var _initialized = false;
var _bus = null;                 // GameplayEventBus reference
var _stateProvider = null;       // fn() → live game state snapshot
var _onSpeak = null;             // fn(line, category) — bridge to speech bubble
var _onStateChange = null;       // fn(newState, oldState) — optional

var _fsmState = STATES.OFF;
var _stateTimer = null;          // setTimeout id for auto-transitions
var _tickTimer = null;           // setInterval id for ambient checks

// Cooldown tracking: { triggerId: lastFiredTimestamp }
var _cooldowns = {};

// Once-flags: { triggerId: true } — triggers with once:true
var _onceFired = {};

// Ignore counts: { triggerId: count } — for escalation (M-7)
var _ignoreCounts = {};

// Shuffle-deck pools: { category: { lines: [...], index: int } }
var _decks = {};

// Sorted triggers cache (by priority descending)
var _sortedTriggers = null;

// Bus handler references for cleanup
var _busHandlers = [];

// --- Internal gameplay tracking ---
// Enriched from bus payloads. Merged with stateProvider snapshot
// so trigger conditions see the full picture.
var _tracked = {
    lastWeaponQuality:       0,
    lastQuenchResult:        null,    // "perfect" | "destroyed" | null
    recentShatters:          0,
    consecutiveGoodWeapons:  0,
    lastSaleRatio:           0,
    morningEventId:          null,
    justCompletedDecree:     false,
    lastActivityTime:        0,       // timestamp — for idle detection
};

// ============================================================
// SETUP
// ============================================================

function init(config) {
    if (_initialized) {
        console.warn("[FairyHelper] Already initialized. Call destroy() first.");
        return;
    }

    _bus            = config.bus            || null;
    _stateProvider  = config.stateProvider  || function() { return {}; };
    _onSpeak        = config.onSpeak        || function() {};
    _onStateChange  = config.onStateChange  || null;

    // Pre-sort triggers by priority descending (highest first)
    // Resolve busTag keys (e.g. "CUSTOMER_SPAWN") to actual tag strings
    // (e.g. "event.customer.spawn") so bus subscriptions match emissions.
    _sortedTriggers = FairyTriggers.TRIGGERS.slice().map(function(t) {
        if (t.busTag && EVENT_TAGS[t.busTag]) {
            var copy = {};
            var keys = Object.keys(t);
            for (var k = 0; k < keys.length; k++) { copy[keys[k]] = t[keys[k]]; }
            copy.busTag = EVENT_TAGS[t.busTag];
            return copy;
        }
        return t;
    }).sort(function(a, b) {
        return b.priority - a.priority;
    });

    _fsmState = STATES.IDLE;
    _initialized = true;

    // Wire up bus subscriptions + ambient tick
    _startWatching();
    _startTicking();
}

// ============================================================
// BUS INTEGRATION
// ============================================================

/**
 * Subscribe to all unique busTags found in trigger definitions,
 * plus extra tags needed for gameplay tracking (quench results).
 */
function _startWatching() {
    if (!_bus) return;

    // Collect unique busTags from triggers
    var seen = {};
    for (var i = 0; i < _sortedTriggers.length; i++) {
        var tag = _sortedTriggers[i].busTag;
        if (tag && !seen[tag]) {
            seen[tag] = true;
            _subscribeTo(tag);
        }
    }

    // Extra subscriptions for gameplay tracking (no trigger uses these as busTag,
    // but we need payload data to set tracked state for condition-only triggers)
    var extras = [
        EVENT_TAGS.FX_QUENCH_SUCCESS,
        EVENT_TAGS.FX_QUENCH_FAIL,
        EVENT_TAGS.FX_ROYAL_DECREE,
    ];
    for (var e = 0; e < extras.length; e++) {
        if (!seen[extras[e]]) {
            seen[extras[e]] = true;
            _subscribeTo(extras[e]);
        }
    }

    _tracked.lastActivityTime = Date.now();
}

/**
 * Extract gameplay data from bus payloads into _tracked.
 * Called before trigger evaluation so conditions see fresh data.
 */
function _enrichFromPayload(tag, payload) {
    _tracked.lastActivityTime = Date.now();

    if (tag === EVENT_TAGS.FX_SHATTER) {
        _tracked.recentShatters++;
        _tracked.consecutiveGoodWeapons = 0;
        _tracked.lastQuenchResult = null;
    }

    if (tag === EVENT_TAGS.FORGE_SESSION_COMPLETE) {
        var q = payload && payload.quality || 0;
        _tracked.lastWeaponQuality = q;
        _tracked.recentShatters = 0;
        _tracked.lastQuenchResult = null;
        if (q >= 65) {
            _tracked.consecutiveGoodWeapons++;
        } else {
            _tracked.consecutiveGoodWeapons = 0;
        }
        // justCompletedDecree is set by App.js stateProvider
    }

    if (tag === EVENT_TAGS.ECONOMY_WEAPON_SOLD) {
        var ratio = payload && payload.saleRatio;
        if (ratio != null) {
            _tracked.lastSaleRatio = ratio;
        }
    }

    if (tag === EVENT_TAGS.FX_QUENCH_SUCCESS) {
        _tracked.lastQuenchResult = "perfect";
    }

    if (tag === EVENT_TAGS.FX_QUENCH_FAIL) {
        _tracked.lastQuenchResult = "destroyed";
    }

    if (tag === EVENT_TAGS.DAY_MORNING_EVENT_DISPLAY) {
        _tracked.morningEventId = payload && payload.id || null;
    }

    if (tag === EVENT_TAGS.FX_ROYAL_DECREE) {
        _tracked.justCompletedDecree = true;
        // Auto-clear after 3s — only relevant during the forge-complete window
        setTimeout(function() { _tracked.justCompletedDecree = false; }, 3000);
    }
}

function _subscribeTo(tag) {
    var handler = function(payload) {
        _enrichFromPayload(tag, payload);
        processEvent(tag, payload);
    };
    _bus.on(tag, handler);
    _busHandlers.push({ tag: tag, handler: handler });
}

function _stopWatching() {
    if (!_bus) return;
    for (var i = 0; i < _busHandlers.length; i++) {
        _bus.off(_busHandlers[i].tag, _busHandlers[i].handler);
    }
    _busHandlers = [];
}

// ============================================================
// AMBIENT TICK
// ============================================================

function _startTicking() {
    if (_tickTimer) return;
    _tickTimer = setInterval(function() {
        tick();
    }, TICK_INTERVAL_MS);
}

function _stopTicking() {
    if (_tickTimer) {
        clearInterval(_tickTimer);
        _tickTimer = null;
    }
}

// ============================================================
// STATE MACHINE
// ============================================================

function _setState(newState) {
    if (newState === _fsmState) return;

    var oldState = _fsmState;
    _fsmState = newState;

    // Clear any pending auto-transition
    if (_stateTimer) {
        clearTimeout(_stateTimer);
        _stateTimer = null;
    }

    // Schedule auto-transition if this state has a duration
    var dur = STATE_DURATIONS[newState];
    if (dur) {
        _stateTimer = setTimeout(function() {
            _onStateDurationExpired();
        }, dur);
    }

    if (_onStateChange) {
        _onStateChange(newState, oldState);
    }
}

function _onStateDurationExpired() {
    _stateTimer = null;

    switch (_fsmState) {
        case STATES.POINTING:
            _setState(STATES.IDLE);
            break;
        case STATES.ESCALATING:
            _setState(STATES.FLUSTERED);
            break;
        case STATES.FLUSTERED:
            _setState(STATES.EXITING);
            break;
        case STATES.EXITING:
            _setState(STATES.DISMISSED);
            break;
        default:
            _setState(STATES.IDLE);
            break;
    }
}

// ============================================================
// TRIGGER EVALUATION
// ============================================================

/**
 * Evaluate all triggers against current game state.
 * Optional busTag filters to only triggers matching that tag.
 * Returns winning trigger object or null.
 */
function _evaluateTriggers(busTag) {
    var now = Date.now();
    var base = _stateProvider();

    // Merge tracked fields onto provider snapshot
    var state = {};
    var bKeys = Object.keys(base);
    for (var b = 0; b < bKeys.length; b++) { state[bKeys[b]] = base[bKeys[b]]; }
    var tKeys = Object.keys(_tracked);
    for (var t2 = 0; t2 < tKeys.length; t2++) { state[tKeys[t2]] = _tracked[tKeys[t2]]; }

    // Compute idleMinutes from lastActivityTime
    state.idleMinutes = _tracked.lastActivityTime
        ? Math.floor((now - _tracked.lastActivityTime) / 60000)
        : 0;

    for (var i = 0; i < _sortedTriggers.length; i++) {
        var t = _sortedTriggers[i];

        // If trigger requires a specific bus tag, skip unless it matches
        if (t.busTag && t.busTag !== busTag) continue;

        // If trigger has NO busTag and we're processing a specific event,
        // skip — ambient triggers only fire on tick()
        if (!t.busTag && busTag) continue;

        // Once-flag check
        if (t.once && _onceFired[t.id]) continue;

        // Cooldown check
        if (t.cooldownMs > 0 && _cooldowns[t.id]) {
            if (now - _cooldowns[t.id] < t.cooldownMs) continue;
        }

        // Condition check
        if (t.condition && !t.condition(state)) continue;

        // Winner found
        return t;
    }

    return null;
}

// ============================================================
// LINE PICKING — Shuffle Deck (no repeats until pool empty)
// ============================================================

function _pickLine(category) {
    var pool = FairyPersonality.DIALOGUE[category];
    if (!pool || pool.length === 0) return null;

    // Init or reset deck for this category
    if (!_decks[category] || _decks[category].index >= _decks[category].lines.length) {
        _decks[category] = {
            lines: _shuffle(pool.slice()),
            index: 0,
        };
    }

    var deck = _decks[category];
    var line = deck.lines[deck.index];
    deck.index++;
    return line;
}

function _shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

// ============================================================
// TEMPLATE TOKEN RESOLUTION
// ============================================================

function _resolveTokens(line, state) {
    if (!line || line.indexOf("{") === -1) return line;

    return line
        .replace(/\{weaponName\}/g,   state.weaponName   || "blade")
        .replace(/\{materialName\}/g, state.materialName  || "metal")
        .replace(/\{gold\}/g,         state.gold          != null ? state.gold : "?")
        .replace(/\{rep\}/g,          state.rep           != null ? state.rep : "?")
        .replace(/\{day\}/g,          state.day           != null ? state.day : "?")
        .replace(/\{daysLeft\}/g,     state.daysLeft      != null ? state.daysLeft : "?")
        .replace(/\{trueValue\}/g,    state.trueValue     != null ? state.trueValue : "?")
        .replace(/\{customerName\}/g, state.customerName  || "stranger")
        .replace(/\{quality\}/g,      state.quality       != null ? state.quality : "?");
}

// ============================================================
// CORE FLOW: Process an event or tick
// ============================================================

/**
 * Called by bus handler when a gameplay event fires.
 * Evaluates triggers filtered to that busTag.
 * Returns the line spoken, LLM_NEEDED, or null.
 */
function processEvent(busTag, payload) {
    if (!_initialized) return null;
    if (_fsmState === STATES.OFF || _fsmState === STATES.DISMISSED) return null;
    if (_fsmState === STATES.EXITING) return null;

    var trigger = _evaluateTriggers(busTag);
    if (!trigger) return null;

    return _executeTrigger(trigger);
}

/**
 * Called on ambient tick interval for idle triggers.
 * These are triggers with no busTag — they fire based on
 * polled game state (idle_too_long, late_night, low_rep, etc).
 */
function tick() {
    if (!_initialized) return null;
    if (_fsmState === STATES.OFF || _fsmState === STATES.DISMISSED) return null;
    if (_fsmState === STATES.EXITING) return null;

    // Only check ambient triggers when idle
    if (_fsmState !== STATES.IDLE) return null;

    var trigger = _evaluateTriggers(null);
    if (!trigger) return null;

    return _executeTrigger(trigger);
}

/**
 * Fire a winning trigger: pick line, resolve tokens, speak.
 * If no static line exists for the category, route to LLM.
 */
function _executeTrigger(trigger) {
    var now = Date.now();
    var base = _stateProvider();
    var state = {};
    var bKeys = Object.keys(base);
    for (var b = 0; b < bKeys.length; b++) { state[bKeys[b]] = base[bKeys[b]]; }
    var tKeys = Object.keys(_tracked);
    for (var t2 = 0; t2 < tKeys.length; t2++) { state[tKeys[t2]] = _tracked[tKeys[t2]]; }

    // Record cooldown
    _cooldowns[trigger.id] = now;

    // Record once-flag
    if (trigger.once) {
        _onceFired[trigger.id] = true;
    }

    // Pick a static line
    var line = _pickLine(trigger.category);

    // Static line found — resolve tokens, speak, done
    if (line) {
        line = _resolveTokens(line, state);
        _setState(STATES.POINTING);
        if (_onSpeak) _onSpeak(line, trigger.category);
        return line;
    }

    // No static line — route to LLM (async)
    _requestLLMLine(state, trigger.category);
    return LLM_NEEDED;
}

// ============================================================
// LLM INTEGRATION
// ============================================================

/**
 * Async path: request a contextual line from the API.
 * On success or fallback, delivers via onSpeak.
 * Fairy transitions to POINTING when the line arrives.
 */
function _requestLLMLine(state, category) {
    FairyAPI.requestLine(state).then(function(line) {
        // Validate we're still in a state that can speak
        if (_fsmState === STATES.OFF || _fsmState === STATES.DISMISSED) return;

        line = _resolveTokens(line, state);
        _setState(STATES.POINTING);
        if (_onSpeak) _onSpeak(line, category);
    });
}

// ============================================================
// PLAYER ACTIONS
// ============================================================

function dismiss() {
    _setState(STATES.DISMISSED);
}

function enable() {
    if (_fsmState === STATES.DISMISSED || _fsmState === STATES.OFF) {
        _setState(STATES.IDLE);
    }
}

// ============================================================
// QUERY
// ============================================================

function getState() {
    return _fsmState;
}

function isActive() {
    return _fsmState !== STATES.OFF && _fsmState !== STATES.DISMISSED;
}

// ============================================================
// RESET / DESTROY
// ============================================================

function reset() {
    if (_stateTimer) {
        clearTimeout(_stateTimer);
        _stateTimer = null;
    }

    _fsmState     = STATES.IDLE;
    _cooldowns    = {};
    _onceFired    = {};
    _ignoreCounts = {};
    _decks        = {};
    _tracked.lastWeaponQuality      = 0;
    _tracked.lastQuenchResult       = null;
    _tracked.recentShatters         = 0;
    _tracked.consecutiveGoodWeapons = 0;
    _tracked.lastSaleRatio          = 0;
    _tracked.morningEventId         = null;
    _tracked.justCompletedDecree    = false;
    _tracked.lastActivityTime       = Date.now();
}

function destroy() {
    _stopWatching();
    _stopTicking();

    if (_stateTimer) {
        clearTimeout(_stateTimer);
        _stateTimer = null;
    }

    _initialized    = false;
    _bus             = null;
    _stateProvider   = null;
    _onSpeak         = null;
    _onStateChange   = null;
    _fsmState        = STATES.OFF;
    _cooldowns       = {};
    _onceFired       = {};
    _ignoreCounts    = {};
    _decks           = {};
    _sortedTriggers  = null;
    _busHandlers     = [];
    _tracked.lastWeaponQuality      = 0;
    _tracked.lastQuenchResult       = null;
    _tracked.recentShatters         = 0;
    _tracked.consecutiveGoodWeapons = 0;
    _tracked.lastSaleRatio          = 0;
    _tracked.morningEventId         = null;
    _tracked.justCompletedDecree    = false;
    _tracked.lastActivityTime       = 0;
}

// ============================================================
// PUBLIC API
// ============================================================

var FairyHelper = {
    // --- Constants ---
    STATES:       STATES,
    LLM_NEEDED:   LLM_NEEDED,

    // --- Setup ---
    init:         init,
    reset:        reset,
    destroy:      destroy,

    // --- Core ---
    processEvent: processEvent,
    tick:         tick,

    // --- Player Actions ---
    dismiss:      dismiss,
    enable:       enable,

    // --- Query ---
    getState:     getState,
    isActive:     isActive,
};

export default FairyHelper;