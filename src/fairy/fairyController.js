// ============================================================
// fairyController.js — Wobbly Anvil Fairy Brain
//
// State machine + trigger evaluator + line picker + bus wiring.
// Decides WHAT the fairy says and WHEN. Does not render
// anything — sends structured commands to the pawn via onCommand.
//
// DAY-GATING (M-9): Each trigger has a minDay field. Controller
// checks current day against tier table. Quiet tier = silent cues
// only. Tick interval scales by tier. Daily appearance cap.
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
// BUS PATTERN: Subscribes to gameplay tags from fairyRulesTree.
// Read-only on game state — never emits gameplay tags.
// Talks to renderer only through onSpeak callback.
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import FairyPersonality from "./fairyPersonality.js";
import FairyRulesTree   from "./fairyRulesTree.js";
import FairyAPI         from "./fairyAPI.js";
import FairyTutorial    from "./fairyTutorial.js";
import ForgeTutorial    from "../tutorials/forgeTutorial.js";
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

// Tutorial segment → UI target to highlight during that segment
var SEGMENT_HIGHLIGHT = {
    tut_rep:     "rep",
    tut_buttons: "btn_area",
    tut_forge:   null,  // forge tutorial manages its own highlights
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

// Persistence keys (M-12)
var LS_KEY_ONCE_FLAGS    = "wa_fairy_taught";
var LS_KEY_ENABLED       = "wa_fairy_enabled";
var LS_KEY_TUTORIAL_ON   = "wa_fairy_tutorial_on";
var LS_KEY_TUTORIAL_OFF  = "wa_fairy_tutorial_off";
var LS_KEY_TAP_WARN_DONE = "wa_fairy_tap_warn_done";

// ============================================================
// DAY-GATING — Pacing Table (from FairyCharacter.md)
// Tier determines allowed behavior, tick speed, max appearances.
// ============================================================

var DAY_TIERS = [
    { name: "ftue",     minDay: 1,  maxDay: 2,  tickMs: 8000,   maxAppearances: 999 },
    { name: "quiet",    minDay: 3,  maxDay: 5,  tickMs: 45000,  maxAppearances: 3 },
    { name: "reactive", minDay: 6,  maxDay: 9,  tickMs: 20000,  maxAppearances: 8 },
    { name: "active",   minDay: 10, maxDay: 14, tickMs: 15000,  maxAppearances: 12 },
    { name: "full",     minDay: 15, maxDay: 999, tickMs: 10000, maxAppearances: 999 },
];

function _getDayTier(day) {
    for (var i = 0; i < DAY_TIERS.length; i++) {
        if (day >= DAY_TIERS[i].minDay && day <= DAY_TIERS[i].maxDay) {
            return DAY_TIERS[i];
        }
    }
    return DAY_TIERS[DAY_TIERS.length - 1];
}

// ============================================================
// INTERNAL STATE
// ============================================================

var _initialized = false;
var _bus = null;                 // GameplayEventBus reference
var _stateProvider = null;       // fn() → live game state snapshot
var _onSpeak = null;             // fn(line, category) — legacy bridge
var _onCommand = null;           // fn(cmd) — structured command to pawn (M-9)
var _onStateChange = null;       // fn(newState, oldState) — optional
var _gameAction = null;          // fn(name, params) — forge tutorial game bridge

var _fsmState = STATES.OFF;
var _stateTimer = null;          // setTimeout id for auto-transitions
var _tickTimer = null;           // setInterval id for ambient checks
var _currentTier = null;         // cached DAY_TIERS entry
var _appearancesToday = 0;       // daily appearance counter
var _devSkipPersist = false;     // skip localStorage writes (testing)
var _tutorialTapCount = 0;       // taps during current tutorial segment (resets per segment)

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
// PERSISTENCE (M-12)
// Taught topics survive across sessions and new games.
// Enabled pref survives across sessions.
// ============================================================

function _loadOnceFlags() {
    try {
        var raw = localStorage.getItem(LS_KEY_ONCE_FLAGS);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn("[FairyController] Failed to load once-flags:", e.message);
    }
    return {};
}

function _saveOnceFlags() {
    try {
        localStorage.setItem(LS_KEY_ONCE_FLAGS, JSON.stringify(_onceFired));
    } catch (e) {
        console.warn("[FairyController] Failed to save once-flags:", e.message);
    }
}

function _loadEnabledPref() {
    try {
        var raw = localStorage.getItem(LS_KEY_ENABLED);
        if (raw === "false") return false;
    } catch (e) {}
    return true; // enabled by default
}

function _saveEnabledPref(enabled) {
    try {
        localStorage.setItem(LS_KEY_ENABLED, enabled ? "true" : "false");
    } catch (e) {}
}

// --- Tutorial flag helpers ---

function _isFlagSet(key) {
    // Check runtime memory first (survives devSkipPersist), then localStorage
    if (FairyTutorial.isFlagSet(key)) return true;
    try { return localStorage.getItem(key) === "true"; } catch (e) { return false; }
}

function _persistFlag(key, value) {
    // Always write to runtime memory (survives devSkipPersist, checked by _isFlagSet)
    FairyTutorial.setFlag(key, value);
    if (_devSkipPersist) {
        console.log("[FairyController] DEV: skipped persist for " + key);
        return;
    }
    try { localStorage.setItem(key, value); } catch (e) {
        console.warn("[FairyController] Failed to persist:", key, e.message);
    }
}

function _clearFlag(key) {
    if (_devSkipPersist) return;
    try { localStorage.removeItem(key); } catch (e) {}
}

function _isTutorialDecided() {
    return _isFlagSet(LS_KEY_TUTORIAL_ON) || _isFlagSet(LS_KEY_TUTORIAL_OFF);
}

function _isTutorialEnabled() {
    return _isFlagSet(LS_KEY_TUTORIAL_ON);
}

function _setTutorialHighlight(target) {
    if (_bus) _bus.emit(EVENT_TAGS.UI_TUTORIAL_HIGHLIGHT, { target: target || null });
}

// ============================================================
// SETUP
// ============================================================

function init(config) {
    if (_initialized) {
        console.warn("[FairyController] Already initialized. Call destroy() first.");
        return;
    }

    _bus            = config.bus            || null;
    _stateProvider  = config.stateProvider  || function() { return {}; };
    _onSpeak        = config.onSpeak        || null;
    _onCommand      = config.onCommand      || null;
    _onStateChange  = config.onStateChange  || null;
    _gameAction     = config.gameAction     || null;
    _devSkipPersist = config.devSkipPersist || false;

    // Resolve initial day tier
    var initState = _stateProvider();
    _currentTier = _getDayTier(initState.day || 1);
    _appearancesToday = 0;

    // Pre-sort triggers by priority descending (highest first)
    // Resolve busTag keys (e.g. "CUSTOMER_SPAWN") to actual tag strings
    // (e.g. "event.customer.spawn") so bus subscriptions match emissions.
    _sortedTriggers = FairyRulesTree.TRIGGERS.slice().map(function(t) {
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

    // Load persisted taught topics (M-12)
    _onceFired = _loadOnceFlags();

    // Check enabled preference (M-12)
    if (!_loadEnabledPref()) {
        _fsmState = STATES.DISMISSED;
    }

    // Wire up bus subscriptions + ambient tick
    _startWatching();
    _startTicking();

    // --- Tutorial sequencer (M-15a) ---
    FairyTutorial.init({
        sendCommand: function(cmd) { _sendCommand(cmd); },
        onComplete: function(result, stored) { _onTutorialComplete(result, stored); },
        gameAction: _gameAction,
        devSkipPersist: _devSkipPersist,
    });

    // Tutorial fires on DAY_READY (after toasts drain + 3s settle)
    // Subscribed once here; handler checks tutorial state each day.
    if (_bus) {
        var _dayReadyHandler = function(payload) {
            _onDayReady(payload);
        };
        _bus.on(EVENT_TAGS.DAY_READY, _dayReadyHandler);
        _busHandlers.push({ tag: EVENT_TAGS.DAY_READY, handler: _dayReadyHandler });

        // Route QTE sandbox freeze events to forge tutorial delegate
        var _qteFrozenHandler = function(payload) {
            console.log("[FairyController] QTE_SANDBOX_FROZEN received", payload, "forgeTutRunning:", ForgeTutorial.isRunning());
            if (ForgeTutorial.isRunning()) {
                ForgeTutorial.onEvent("QTE_SANDBOX_FROZEN", payload);
            }
        };
        _bus.on(EVENT_TAGS.QTE_SANDBOX_FROZEN, _qteFrozenHandler);
        _busHandlers.push({ tag: EVENT_TAGS.QTE_SANDBOX_FROZEN, handler: _qteFrozenHandler });
    }
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
// AMBIENT TICK — interval scales by day tier
// ============================================================

function _startTicking() {
    if (_tickTimer) return;
    var ms = _currentTier ? _currentTier.tickMs : TICK_INTERVAL_MS;
    _tickTimer = setInterval(function() {
        _refreshTier();
        tick();
    }, ms);
}

function _stopTicking() {
    if (_tickTimer) {
        clearInterval(_tickTimer);
        _tickTimer = null;
    }
}

/**
 * Check if day tier has changed. If so, update cached tier
 * and restart tick at new interval. Called each tick.
 */
function _refreshTier() {
    if (!_stateProvider) return;
    var state = _stateProvider();
    var day = state.day || 1;
    var tier = _getDayTier(day);

    if (!_currentTier || tier.name !== _currentTier.name) {
        _currentTier = tier;
        _appearancesToday = 0;
        // Restart tick at new interval
        _stopTicking();
        _startTicking();
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

        // Day-gating: skip triggers the fairy hasn't unlocked yet
        if (t.minDay && state.day < t.minDay) continue;

        // Once-flag check
        if (t.once && _onceFired[t.id]) continue;

        // Cooldown check
        if (t.cooldownMs > 0 && _cooldowns[t.id]) {
            if (now - _cooldowns[t.id] < t.cooldownMs) continue;
        }

        // Appearance cap: respect tier max
        if (_currentTier && _appearancesToday >= _currentTier.maxAppearances) continue;

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
    // Suppress reactive triggers during tutorial (POINTING state)
    if (_fsmState === STATES.POINTING) return null;

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

    // Quiet tier: skip speech triggers, only emit silent cues
    if (_currentTier && _currentTier.name === "quiet") {
        _appearancesToday++;
        var silentCue = Math.random() < 0.5 ? "silent_peek" : "silent_poof";
        _sendCommand({
            intent: "ambient",
            target: null,
            line: null,
            category: null,
            cue: silentCue,
        });
        _setState(STATES.POINTING);
        return silentCue;
    }

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
        _saveOnceFlags();
    }

    // Count appearance
    _appearancesToday++;

    // Pick a static line
    var line = _pickLine(trigger.category);

    // Static line found — resolve tokens, send command, done
    if (line) {
        line = _resolveTokens(line, state);
        _setState(STATES.POINTING);
        _sendCommand({
            intent: "react",
            target: trigger.target || null,
            line: line,
            category: trigger.category,
            cue: trigger.cue || null,
        });
        return line;
    }

    // No static line — route to LLM (async)
    _requestLLMLine(state, trigger);
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
function _requestLLMLine(state, trigger) {
    var category = trigger.category;
    var target = trigger.target || null;
    var cue = trigger.cue || null;

    FairyAPI.requestLine(state).then(function(line) {
        // Validate we're still in a state that can speak
        if (_fsmState === STATES.OFF || _fsmState === STATES.DISMISSED) return;

        line = _resolveTokens(line, state);
        _setState(STATES.POINTING);
        _sendCommand({
            intent: "react",
            target: target,
            line: line,
            category: category,
            cue: cue,
        });
    });
}

// ============================================================
// COMMAND DISPATCH
// Sends structured commands to the pawn. Supports both
// onCommand (new) and onSpeak (legacy) callbacks.
// ============================================================

/**
 * Poll until pawn's animRef.current is available, then fire callback.
 * Gives React time to mount AnimInstance. Max 5s, 200ms interval.
 */
function _waitForPawn(callback) {
    var attempts = 0;
    var maxAttempts = 25;
    var interval = 200;

    function check() {
        attempts++;
        if (_onCommand) {
            // Ask pawn if it's ready — animRef.current exists
            // We test by checking if a dummy query works
            callback();
            return;
        }
        if (attempts >= maxAttempts) {
            console.warn("[FairyController] Pawn never became ready, starting anyway");
            callback();
            return;
        }
        setTimeout(check, interval);
    }

    setTimeout(check, interval);
}

function _sendCommand(cmd) {
    if (_onCommand) {
        _onCommand(cmd);
    } else if (_onSpeak) {
        // Legacy bridge: onSpeak(line, category)
        _onSpeak(cmd.line, cmd.category);
    }
}

// ============================================================
// TUTORIAL ROUTING (M-15a)
// ============================================================

// Settle delay after DAY_READY before fairy appears (ms)
var DAY_READY_DELAY_MS = 1500;

/**
 * DAY_READY handler — fires after day-start toasts drain.
 * Waits 3s settle time, then checks tutorial state.
 */
function _onDayReady(payload) {
    console.log("[TRACE-3] _onDayReady fired. fsmState:", _fsmState, "tutRunning:", FairyTutorial.isRunning(), "tutDecided:", _isTutorialDecided(), "tutEnabled:", _isTutorialEnabled());
    // Don't run tutorial if fairy is dismissed or off
    if (_fsmState === STATES.DISMISSED || _fsmState === STATES.OFF) return;

    // Don't interrupt if already running something
    if (FairyTutorial.isRunning() || _fsmState === STATES.POINTING) return;

    // Lock UI immediately if tutorial will fire after settle delay.
    // Prevents player hitting sleep/forge during the wait.
    var tutorialWillFire = !_isTutorialDecided() || (_isTutorialEnabled() && !_isFlagSet("wa_tut_buttons_done"));
    if (tutorialWillFire) {
        _setTutorialHighlight("pending");
    }

    setTimeout(function() {
        console.log("[TRACE-4] settle fired. fsmState:", _fsmState, "tutDecided:", _isTutorialDecided(), "tutEnabled:", _isTutorialEnabled());
        // Re-check state after delay (player may have acted)
        if (_fsmState === STATES.DISMISSED || _fsmState === STATES.OFF) {
            _setTutorialHighlight(null);
            return;
        }
        if (FairyTutorial.isRunning()) return;

        if (!_isTutorialDecided()) {
            _setState(STATES.POINTING);
            _waitForPawn(function() {
                FairyTutorial.start("intro");
            });
        } else if (_isTutorialEnabled()) {
            _checkPendingSegments();
        } else {
            // Tutorial off — clear the early lock
            _setTutorialHighlight(null);
        }
    }, DAY_READY_DELAY_MS);
}

/**
 * Handle tutorial sequence completion.
 * Routes based on result type and player's stored answers.
 */
function _onTutorialComplete(result, stored) {
    if (result === "intro_complete") {
        var answer = stored && stored.promptAnswer;
        if (answer === "show me") {
            // Player opted in — persist and start first segment
            _persistFlag(LS_KEY_TUTORIAL_ON, "true");
            _tutorialTapCount = 0;
            _setTutorialHighlight(SEGMENT_HIGHLIGHT["tut_rep"]);
            setTimeout(function() {
                if (_onCommand) _onCommand({ intent: "set_tutorial_mode", value: true });
                FairyTutorial.start("tut_rep");
            }, 500);
        } else {
            // Player declined — dismiss fairy, persist opt-out, unlock UI
            _persistFlag(LS_KEY_TUTORIAL_OFF, "true");
            _saveEnabledPref(false);
            _setTutorialHighlight(null);
            _setState(STATES.DISMISSED);
        }
        return;
    }

    if (result === "segment_complete") {
        // Segment done — don't clear highlight here.
        // _checkPendingSegments sets the next highlight or clears it
        // when all segments are done. This keeps buttons blocked
        // between tut_rep → tut_buttons.
        _setState(STATES.IDLE);
        _checkPendingSegments();
        return;
    }

    // Default fallback
    _setState(STATES.IDLE);
}

/**
 * Check for tutorial segments that haven't been completed yet.
 * Runs the first pending one. Called on init and after options re-enable.
 */
function _checkPendingSegments() {
    // Check each segment in order. Run first one not done.
    if (!_isFlagSet("wa_tut_rep_done")) {
        _tutorialTapCount = 0;
        _setState(STATES.POINTING);
        _setTutorialHighlight(SEGMENT_HIGHLIGHT["tut_rep"]);
        setTimeout(function() {
            if (_onCommand) _onCommand({ intent: "set_tutorial_mode", value: true });
            FairyTutorial.start("tut_rep");
        }, 1500);
        return;
    }
    if (!_isFlagSet("wa_tut_buttons_done")) {
        _tutorialTapCount = 0;
        _setState(STATES.POINTING);
        _setTutorialHighlight(SEGMENT_HIGHLIGHT["tut_buttons"]);
        setTimeout(function() {
            if (_onCommand) _onCommand({ intent: "set_tutorial_mode", value: true });
            FairyTutorial.start("tut_buttons");
        }, 500);
        return;
    }
    // Add future segment checks here:
    // if (!_isFlagSet("wa_tut_forge_done")) { ... }
    // Forge tutorial is NOT auto-fired here — it triggers when
    // the player taps "Begin Forging" for the first time.
    // See App.js onBeginForge intercept.

    // if (!_isFlagSet("wa_tut_customer_done")) { ... }

    // All segments complete — clear highlight, exit tutorial mode, enter reactive mode
    _setTutorialHighlight(null);
    if (_onCommand) _onCommand({ intent: "set_tutorial_mode", value: false });
}

// ============================================================
// FORGE TUTORIAL DELEGATE
// ============================================================

/**
 * Start the forge tutorial via ForgeTutorial delegate.
 * Controller provides presenter + gameAction + onComplete.
 * ForgeTutorial owns its own step sequence and executor.
 */
function _startForgeTutorial() {
    // Lock forge buttons during tutorial
    _setTutorialHighlight("forge_tutorial");

    // Tell AnimInstance we're in tutorial mode (tap → tutorial_tap, not tap_exit)
    if (_onCommand) _onCommand({ intent: "set_tutorial_mode", value: true });

    // Poof fairy in at talk_close position before starting sequence
    _sendCommand({ intent: "cue", cue: "tut_forge_enter", category: "tutorial" });

    ForgeTutorial.init({
        presenter: {
            say: function(text, duration) {
                _sendCommand({ intent: "cue", cue: "tut_forge_speak", line: text, target: null, category: "tutorial" });
            },
            pointAt: function(targetId) {
                _sendCommand({ intent: "cue", cue: "laser_point", line: null, target: targetId, category: "tutorial" });
            },
            interact: function(targetId, text) {
                _sendCommand({ intent: "cue", cue: "laser_speak", line: text, target: targetId, category: "tutorial" });
            },
            clearAll: function() {
                _sendCommand({ intent: "clear" });
            },
        },
        gameAction: _gameAction,
        onComplete: function(result) {
            _onForgeTutorialComplete(result);
        },
    });
}

/**
 * Handle forge tutorial completion.
 */
function _onForgeTutorialComplete(result) {
    if (result === "segment_complete") {
        // Poof fairy out before clearing state
        _sendCommand({ intent: "cue", cue: "tut_forge_exit", category: "tutorial" });
        _persistFlag("wa_tut_forge_done", "true");
        _setTutorialHighlight(null);
        if (_onCommand) _onCommand({ intent: "set_tutorial_mode", value: false });
        _setState(STATES.IDLE);
        _checkPendingSegments();
    }
}

/**
 * Player tapped twice — end current section, mark it done, continue to next.
 * Dismisses fairy cleanly at her current position.
 */
function _skipTutorialSegment() {
    var seqId = FairyTutorial.getActiveSequence();
    var seq = seqId ? FairyTutorial.SEQUENCES[seqId] : null;
    FairyTutorial.cancel();

    // Also cancel forge tutorial delegate if running
    if (ForgeTutorial.isRunning()) {
        ForgeTutorial.cancel(); // cancel() fires exit_sandbox internally
        _persistFlag("wa_tut_forge_done", "true");
    }

    // Clear tutorial mode on AnimInstance
    if (_onCommand) _onCommand({ intent: "set_tutorial_mode", value: false });

    // Mark this segment done (skipped)
    if (seq && seq.doneKey) {
        _persistFlag(seq.doneKey, "true");
    }

    // Only clear highlight if tut_buttons is done (both segments finished).
    // If tut_rep was skipped, highlight stays to block buttons until
    // _checkPendingSegments starts tut_buttons.
    if (_isFlagSet("wa_tut_buttons_done")) {
        _setTutorialHighlight(null);
    }

    // Set tap-warn flag — player now knows tapping skips
    _persistFlag(LS_KEY_TAP_WARN_DONE, "true");

    // Dismiss fairy at current position (poof out where she is)
    if (_onCommand) _onCommand({ intent: "dismiss" });

    // After a beat, check for next section
    _setState(STATES.IDLE);
    setTimeout(function() {
        _checkPendingSegments();
    }, 2000);
}

/**
 * Receive pawn events (cue_complete, prompt_response, tap_exit, etc).
 * Routes to tutorial sequencer when active, otherwise handles directly.
 */
function onPawnEvent(type, data) {
    // Tutorial gets first crack when it's running
    if (FairyTutorial.isRunning() || ForgeTutorial.isRunning()) {
        // Tutorial tap
        if (type === "tutorial_tap") {
            // Forge tutorial: single tap exits (too complex for interrupt/resume)
            if (ForgeTutorial.isRunning()) {
                _skipTutorialSegment();
                return;
            }
            // Other tutorials: two-tap pattern (first = warning, second = skip)
            _tutorialTapCount++;
            if (_tutorialTapCount >= 2) {
                _skipTutorialSegment();
            } else {
                if (_onCommand) {
                    _onCommand({ intent: "show_warning", line: "hey! tap again to skip this, or wait and i'll finish!" });
                }
            }
            return;
        }
        // Legacy tap_exit during tutorial (shouldn't fire with tutorialMode, but safety)
        if (type === "tap_exit") {
            _skipTutorialSegment();
            return;
        }
        // Other events route to the active tutorial
        if (type === "cue_complete") {
            _tutorialTapCount = 0;  // Reset after warning cue or any cue finishes
        }
        if (ForgeTutorial.isRunning()) {
            ForgeTutorial.onEvent(type, data);
        } else {
            FairyTutorial.onEvent(type, data);
        }
        return;
    }

    // Normal mode event handling
    switch (type) {
        case "cue_complete":
            // Cue finished — return to idle so tick can fire again
            if (_fsmState === STATES.POINTING) {
                _setState(STATES.IDLE);
            }
            break;
        case "tap_exit":
            _setState(STATES.DISMISSED);
            break;
        default:
            break;
    }
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

/**
 * Toggle fairy on/off with persistence (M-12).
 * Called from options menu toggle.
 * If tutorial was declined, re-enabling opts into tutorial.
 */
function setEnabled(val) {
    var enabled = !!val;
    _saveEnabledPref(enabled);
    if (enabled) {
        // If tutorial was declined, re-enabling opts into tutorial
        if (_isFlagSet(LS_KEY_TUTORIAL_OFF)) {
            _clearFlag(LS_KEY_TUTORIAL_OFF);
            _persistFlag(LS_KEY_TUTORIAL_ON, "true");
        }
        enable();
        // Check for pending tutorial segments
        if (_isTutorialEnabled()) {
            _checkPendingSegments();
        }
    } else {
        dismiss();
    }
}

function isEnabled() {
    return _fsmState !== STATES.OFF && _fsmState !== STATES.DISMISSED;
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

    FairyTutorial.cancel();
    _fsmState     = STATES.IDLE;
    _cooldowns    = {};
    _onceFired    = _loadOnceFlags();  // reload taught topics, don't clear
    _ignoreCounts = {};
    _decks        = {};
    _appearancesToday = 0;
    _tracked.lastWeaponQuality      = 0;
    _tracked.lastQuenchResult       = null;
    _tracked.recentShatters         = 0;
    _tracked.consecutiveGoodWeapons = 0;
    _tracked.lastSaleRatio          = 0;
    _tracked.morningEventId         = null;
    _tracked.justCompletedDecree    = false;
    _tracked.lastActivityTime       = Date.now();

    // Re-resolve tier (day may have reset)
    if (_stateProvider) {
        var state = _stateProvider();
        _currentTier = _getDayTier(state.day || 1);
    }

    // Restart tick at potentially new interval
    _stopTicking();
    _startTicking();
}

function destroy() {
    _stopWatching();
    _stopTicking();
    FairyTutorial.destroy();
    if (ForgeTutorial.isRunning()) ForgeTutorial.cancel();

    if (_stateTimer) {
        clearTimeout(_stateTimer);
        _stateTimer = null;
    }

    _initialized    = false;
    _bus             = null;
    _stateProvider   = null;
    _onSpeak         = null;
    _onCommand       = null;
    _onStateChange   = null;
    _gameAction      = null;
    _devSkipPersist  = false;
    _fsmState        = STATES.OFF;
    _cooldowns       = {};
    _onceFired       = {};
    _ignoreCounts    = {};
    _decks           = {};
    _sortedTriggers  = null;
    _busHandlers     = [];
    _currentTier     = null;
    _appearancesToday = 0;
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

var FairyController = {
    // --- Constants ---
    STATES:       STATES,
    LLM_NEEDED:   LLM_NEEDED,
    DAY_TIERS:    DAY_TIERS,

    // --- Setup ---
    init:         init,
    reset:        reset,
    destroy:      destroy,

    // --- Core ---
    processEvent: processEvent,
    tick:         tick,
    onPawnEvent:  onPawnEvent,

    // --- Player Actions ---
    dismiss:      dismiss,
    enable:       enable,
    setEnabled:   setEnabled,

    // --- Query ---
    getState:     getState,
    isActive:     isActive,
    isEnabled:    isEnabled,
    getDayTier:   function() { return _currentTier; },
    getAppearancesToday: function() { return _appearancesToday; },
    resetDailyAppearances: function() { _appearancesToday = 0; },

    // --- Forge Tutorial ---
    shouldStartForgeTutorial: function() {
        return _isTutorialEnabled() && !_isFlagSet("wa_tut_forge_done");
    },
    startForgeTutorial: function() {
        _tutorialTapCount = 0;
        _setState(STATES.POINTING);
        if (_onCommand) _onCommand({ intent: "set_tutorial_mode", value: true });
        _startForgeTutorial();
    },
};

export default FairyController;