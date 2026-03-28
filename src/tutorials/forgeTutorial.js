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
// Full forge tutorial with fairy speech + laser pointing.
// ============================================================

var FORGE_STEPS = [
    // --- Sandbox on ---
    { type: "action",   name: "enter_sandbox" },
    { type: "delay",    ms: 1200 },

    // --- Fairy introduces the forge ---
    { type: "say",      text: "let me show you how the forge works!" },
    { type: "delay",    ms: 1000 },

    // --- Enter forge select ---
    { type: "action",   name: "begin_forge" },
    { type: "delay",    ms: 2000 },

    // --- Weapon select ---
    { type: "interact", target: "weapon_select_panel", text: "first you pick what to make. each weapon has a difficulty and sell value." },
    { type: "delay",    ms: 3000 },
    { type: "say",      text: "harder weapons are worth more but the QTE is tougher. start simple." },
    { type: "delay",    ms: 1500 },
    { type: "action",   name: "select_weapon", params: { key: "dagger" } },
    { type: "delay",    ms: 2500 },

    // --- Material select ---
    { type: "interact", target: "mat_select_panel", text: "now pick your metal. each material has a value multiplier and difficulty modifier." },
    { type: "delay",    ms: 3000 },
    { type: "say",      text: "rarer metals make weapons worth more, but they're harder to work with." },
    { type: "delay",    ms: 1500 },
    { type: "action",   name: "select_material", params: { key: "bronze" } },
    { type: "delay",    ms: 2000 },
    { type: "clear" },
    { type: "action",   name: "confirm_select" },
    { type: "delay",    ms: 1500 },

    // --- Heat QTE ---
    { type: "wait_event", event: "QTE_SANDBOX_FROZEN" },
    { type: "say",      text: "this is the heat phase. you only get one shot at this." },
    { type: "delay",    ms: 1000 },
    { type: "interact", target: "qte", text: "tap when the needle is in the bright zone. a better heat gives you more hammer strikes." },
    { type: "delay",    ms: 3000 },
    { type: "say",      text: "think of it like heating metal — hotter means it stays workable longer." },
    { type: "delay",    ms: 1500 },
    { type: "action",   name: "resolve_qte" },
    { type: "delay",    ms: 2000 },

    // --- Hammer QTE ---
    { type: "wait_event", event: "QTE_SANDBOX_FROZEN" },
    { type: "say",      text: "now the hammer phase. this is where your weapon takes shape." },
    { type: "delay",    ms: 1000 },
    { type: "interact", target: "qte", text: "each strike builds quality. better hits mean a better weapon." },
    { type: "delay",    ms: 3000 },
    { type: "say",      text: "the number of strikes you get depends on how well you heated." },
    { type: "delay",    ms: 1500 },
    { type: "action",   name: "resolve_qte" },
    { type: "delay",    ms: 2000 },

    // --- Session result — button tour ---
    { type: "clear" },
    { type: "delay",    ms: 1500 },

    // Weapon stats panel
    { type: "interact", target: "forge_info", text: "over here you can see your weapon's quality and stress level." },
    { type: "delay",    ms: 3000 },
    { type: "say",      text: "quality is what makes your weapon worth more. stress is what breaks it." },
    { type: "delay",    ms: 1500 },

    // Buttons
    { type: "interact", target: "btn_forge_again", text: "forge again to raise quality. each session adds stress though." },
    { type: "delay",    ms: 3000 },
    { type: "interact", target: "btn_normalize", text: "normalize reduces stress but costs some quality. use it when stress is high." },
    { type: "delay",    ms: 3000 },
    { type: "interact", target: "btn_scrap", text: "scrap if things go wrong. you get the metal back." },
    { type: "delay",    ms: 3000 },
    { type: "interact", target: "btn_quench", text: "quench to finish the weapon and lock in your work." },
    { type: "delay",    ms: 3000 },

    // Leave button
    { type: "interact", target: "btn_leave", text: "you can also leave and come back later. the weapon stays on the anvil." },
    { type: "delay",    ms: 3000 },

    // --- Quench ---
    { type: "interact", target: "btn_quench", text: "let's quench this one and see how it turns out!" },
    { type: "delay",    ms: 1500 },
    { type: "clear" },
    { type: "action",   name: "quench" },
    { type: "delay",    ms: 1000 },

    // --- Quench QTE ---
    { type: "wait_event", event: "QTE_SANDBOX_FROZEN" },
    { type: "interact", target: "qte", text: "one last bar — cool it down nice and even!" },
    { type: "delay",    ms: 2000 },
    { type: "action",   name: "resolve_qte" },
    { type: "delay",    ms: 1500 },

    // --- Wrap up ---
    { type: "say",      text: "and that's a finished blade! the better your QTE, the higher the quality." },
    { type: "delay",    ms: 300 },

    // --- Exit sandbox + cleanup ---
    { type: "clear" },
    { type: "action",   name: "exit_sandbox" },
    { type: "delay",    ms: 200 },

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