// ============================================================
// forgeTutorial.js — Forge Tutorial (Standalone Delegate)
//
// Owns: Forge tutorial step sequence + executor loop.
// Contract: init({ presenter, gameAction, onComplete })
//
// The controller delegates to this file when tut_forge fires.
// This file does NOT import anything from fairy or forge systems.
// It talks to the game only through gameAction callbacks and
// to the fairy only through the presenter interface.
//
// STEP TYPES (shared with fairyTutorial.js):
//   action    — fire a gameAction, instant advance
//   delay     — wait N ms, then advance
//   say       — presenter.say(text), wait for say_done
//   interact  — presenter.interact(target, text), wait for interact_done
//   point     — presenter.pointAt(target), instant advance
//   clear     — presenter.clearAll(), instant advance
//   wait_event — pause until bus event arrives
//   callback  — fire onComplete(result), sequence ends
//
// PORTABLE: Pure JS. No React. No DOM. No imports.
// ============================================================

// ============================================================
// SEQUENCE DATA
// Minimal select-only sequence for Phase B proof.
// QTE steps, button tour, and fairy speech get layered on later.
// ============================================================

var FORGE_STEPS = [
    // --- Sandbox on ---
    { type: "action",   name: "enter_sandbox" },
    { type: "delay",    ms: 800 },

    // --- Enter forge select ---
    { type: "action",   name: "begin_forge" },
    { type: "delay",    ms: 1500 },

    // --- Pick weapon (also transitions to SELECT_MAT) ---
    { type: "action",   name: "select_weapon", params: { key: "dagger" } },
    { type: "delay",    ms: 1500 },

    // --- Pick material ---
    { type: "action",   name: "select_material", params: { key: "bronze" } },
    { type: "delay",    ms: 1500 },

    // --- Confirm selection (enters HEAT phase) ---
    { type: "action",   name: "confirm_select" },

    // --- Heat QTE: wait for sandbox freeze, then resolve ---
    { type: "wait_event", event: "QTE_SANDBOX_FROZEN" },
    { type: "delay",    ms: 2000 },
    { type: "action",   name: "resolve_qte" },
    { type: "delay",    ms: 1500 },

    // --- Hammer QTE: wait for sandbox freeze, then resolve ---
    { type: "wait_event", event: "QTE_SANDBOX_FROZEN" },
    { type: "delay",    ms: 2000 },
    { type: "action",   name: "resolve_qte" },
    { type: "delay",    ms: 1500 },

    // --- Session result screen (buttons visible) ---
    // TODO: fairy points at forge-again, normalize, scrap, quench buttons here
    { type: "delay",    ms: 3000 },

    // --- Quench ---
    { type: "action",   name: "quench" },

    // --- Quench QTE: wait for sandbox freeze, then resolve ---
    { type: "wait_event", event: "QTE_SANDBOX_FROZEN" },
    { type: "delay",    ms: 2000 },
    { type: "action",   name: "resolve_qte" },
    { type: "delay",    ms: 2000 },

    // --- Exit sandbox + cleanup ---
    { type: "action",   name: "exit_sandbox" },
    { type: "delay",    ms: 500 },

    // --- Done ---
    { type: "callback", result: "segment_complete" },
];

// ============================================================
// INTERNAL STATE
// ============================================================

var _presenter = null;      // { say, pointAt, interact, clearAll }
var _gameAction = null;     // fn(name, params)
var _onComplete = null;     // fn(result)
var _onEvent = null;        // fn injected by controller to receive bus events

var _steps = null;          // current step array
var _stepIndex = -1;
var _waiting = false;
var _delayTimer = null;
var _running = false;

// ============================================================
// LIFECYCLE
// ============================================================

/**
 * Initialize the forge tutorial delegate.
 * @param {Object} config
 *   config.presenter   — { say, pointAt, interact, clearAll }
 *   config.gameAction  — fn(name, params)
 *   config.onComplete  — fn(result)
 */
function init(config) {
    _presenter  = config.presenter  || null;
    _gameAction = config.gameAction || null;
    _onComplete = config.onComplete || null;
    _steps = FORGE_STEPS;
    _stepIndex = -1;
    _waiting = false;
    _running = true;

    console.log("[ForgeTutorial] init — starting sequence (" + _steps.length + " steps)");
    _advance();
}

/**
 * Receive events routed by controller (say_done, interact_done, bus events).
 */
function onEvent(type, data) {
    if (!_running || !_waiting) return;

    var step = _steps[_stepIndex];
    if (!step) return;

    switch (step.type) {
        case "say":
            if (type === "say_done" || type === "cue_complete") {
                _waiting = false;
                _advance();
            }
            break;
        case "interact":
            if (type === "interact_done" || type === "cue_complete") {
                _waiting = false;
                _advance();
            }
            break;
        case "wait_event":
            console.log("[ForgeTutorial] onEvent wait_event check: got '" + type + "', waiting for '" + step.event + "', waiting=" + _waiting);
            if (type === step.event) {
                _waiting = false;
                _advance();
            }
            break;
        default:
            break;
    }
}

/**
 * Cancel the tutorial mid-sequence. Fires exit_sandbox for safety.
 */
function cancel() {
    if (_delayTimer) { clearTimeout(_delayTimer); _delayTimer = null; }
    if (_running && _gameAction) {
        // Safety cleanup — always exit sandbox on cancel
        _gameAction("exit_sandbox");
    }
    _running = false;
    _waiting = false;
    _steps = null;
    _stepIndex = -1;
}

/**
 * Query: is the forge tutorial currently running?
 */
function isRunning() {
    return _running;
}

// ============================================================
// STEP EXECUTOR
// ============================================================

function _advance() {
    _stepIndex++;

    if (!_steps || _stepIndex >= _steps.length) {
        _running = false;
        return;
    }

    var step = _steps[_stepIndex];
    console.log("[ForgeTutorial] step " + _stepIndex + ": " + step.type + (step.name ? " → " + step.name : ""));
    _executeStep(step);
}

function _executeStep(step) {
    switch (step.type) {

        case "action":
            if (_gameAction) {
                _gameAction(step.name, step.params || null);
            }
            // Instant — advance immediately
            _advance();
            break;

        case "delay":
            _waiting = true;
            _delayTimer = setTimeout(function() {
                _delayTimer = null;
                _waiting = false;
                _advance();
            }, step.ms || 500);
            break;

        case "say":
            _waiting = true;
            if (_presenter && _presenter.say) {
                _presenter.say(step.text, step.duration || null);
            }
            break;

        case "interact":
            _waiting = true;
            if (_presenter && _presenter.interact) {
                _presenter.interact(step.target, step.text);
            }
            break;

        case "point":
            if (_presenter && _presenter.pointAt) {
                _presenter.pointAt(step.target);
            }
            _advance();
            break;

        case "clear":
            if (_presenter && _presenter.clearAll) {
                _presenter.clearAll();
            }
            _advance();
            break;

        case "wait_event":
            _waiting = true;
            // Just wait — onEvent will advance when the right event arrives
            break;

        case "callback":
            _running = false;
            if (_onComplete) {
                _onComplete(step.result);
            }
            break;

        default:
            console.warn("[ForgeTutorial] Unknown step type: " + step.type);
            _advance();
            break;
    }
}

// ============================================================
// PUBLIC API
// ============================================================

var ForgeTutorial = {
    init:      init,
    onEvent:   onEvent,
    cancel:    cancel,
    isRunning: isRunning,
    STEPS:     FORGE_STEPS,
};

export default ForgeTutorial;