// ============================================================
// fairyTutorial.js — Fairy Tutorial Step Sequencer
//
// Two concerns:
//   1. OPT-IN GATE — one-time "want help?" prompt (intro sequence)
//   2. TUTORIAL SEGMENTS — individual mini-lessons fired by controller
//      when relevant (e.g. tut_rep, tut_forge, tut_customer)
//
// Each sequence is an array of steps. Steps execute in order,
// advancing on events from the pawn (cue_complete, prompt_response).
//
// STEP TYPES:
//   play_cue  — send a cue command to pawn, wait for cue_complete
//   branch    — pick next cue based on stored prompt answer
//   set_flag  — write to localStorage (respects devSkipPersist)
//   callback  — fire the onComplete callback with result + stored data
//
// SEQUENCE FIELDS:
//   id      — unique sequence identifier
//   doneKey — localStorage key to mark completion (used by controller
//             for skip-on-tap to mark segment done without running set_flag)
//   steps   — array of step objects
//
// OWNERSHIP:
//   Knows: step definitions, sequencing, localStorage flags.
//   Does NOT know: pawn, AnimInstance, rendering, bus.
//   Talks to pawn ONLY through sendCommand (injected by controller).
//   Receives events ONLY through onEvent (called by controller).
//
// LIFECYCLE:
//   init(config)    — store sendCommand + onComplete callbacks
//   start(seqId)    — begin a named sequence
//   onEvent(type, data) — receive pawn events routed by controller
//   cancel()        — abort current sequence
//   destroy()       — full teardown
//
// PORTABLE: Pure JS. No React. No DOM. No imports.
// ============================================================

// ============================================================
// SEQUENCE DEFINITIONS
// Data-driven. Add new sequences here.
//
// INTRO — opt-in gate. Branches on player choice.
//   "show me"            → respond_yes → callback("intro_complete")
//   "i'll figure it out" → respond_no  → callback("intro_complete")
//   Controller reads stored.promptAnswer to fork.
//
// TUT_REP — first tutorial segment. Laser at rep bar.
//   Controller starts this after player opts in.
//   doneKey lets controller mark it done on tap-skip.
// ============================================================

var SEQUENCES = {

    intro: {
        id: "intro",
        doneKey: null, // managed by controller via tutorial_on/off flags
        steps: [
            { type: "play_cue", cue: "intro_rise" },
            { type: "play_cue", cue: "intro_prompt" },
            { type: "branch",   key: "promptAnswer", map: {
                    "show me":            "intro_respond_yes",
                    "i'll figure it out": "intro_respond_no",
                }},
            { type: "callback", result: "intro_complete" },
        ],
    },

    tut_rep: {
        id: "tut_rep",
        doneKey: "wa_tut_rep_done",
        steps: [
            { type: "play_cue", cue: "tut_rep_laser", target: "rep" },
            { type: "set_flag", key: "wa_tut_rep_done", value: "true" },
            { type: "callback", result: "segment_complete" },
        ],
    },

    tut_buttons: {
        id: "tut_buttons",
        doneKey: "wa_tut_buttons_done",
        steps: [
            { type: "play_cue", cue: "tut_buttons" },
            { type: "set_flag", key: "wa_tut_buttons_done", value: "true" },
            { type: "callback", result: "segment_complete" },
        ],
    },

};

// ============================================================
// INTERNAL STATE
// ============================================================

var _initialized = false;
var _sendCommand = null;     // fn(cmd) — routes to pawn via controller
var _onComplete = null;      // fn(result, stored) — tells controller sequence is done
var _gameAction = null;      // fn(name, params) — fires game mutations via bridge

var _activeSeq = null;       // current sequence object
var _stepIndex = -1;         // current step index
var _waiting = false;        // true when waiting for an event to advance
var _stored = {};            // key-value store for branch decisions
var _devSkipPersist = false; // when true, set_flag skips localStorage (testing)
var _flagMemory = {};        // runtime flag map — survives devSkipPersist
var _delayTimer = null;      // setTimeout id for delay steps

// ============================================================
// LIFECYCLE
// ============================================================

/**
 * Initialize the tutorial sequencer.
 * @param {Object} config
 *   config.sendCommand    — fn(cmd) sends structured command to pawn
 *   config.onComplete     — fn(result, stored) called when sequence finishes
 *   config.devSkipPersist — skip localStorage writes (testing)
 */
function init(config) {
    if (_initialized) {
        console.warn("[FairyTutorial] Already initialized.");
        return;
    }

    _sendCommand      = config.sendCommand    || null;
    _onComplete       = config.onComplete     || null;
    _gameAction       = config.gameAction     || null;
    _devSkipPersist   = config.devSkipPersist || false;
    _initialized = true;
}

/**
 * Start a named sequence.
 * @param {string} seqId — key in SEQUENCES
 */
function start(seqId) {
    var seq = SEQUENCES[seqId];
    if (!seq) {
        console.warn("[FairyTutorial] Unknown sequence: " + seqId);
        return;
    }

    _activeSeq = seq;
    _stepIndex = -1;
    _waiting = false;
    _stored = {};

    _advance();
}

/**
 * Receive an event from the pawn (routed by controller).
 * @param {string} type — "cue_complete" or "prompt_response"
 * @param {Object} data — event payload
 */
function onEvent(type, data) {
    if (!_activeSeq || !_waiting) return;

    var step = _activeSeq.steps[_stepIndex];
    if (!step) return;

    switch (step.type) {

        case "play_cue":
            if (type === "cue_complete") {
                _waiting = false;
                _advance();
            }
            break;

        case "branch":
            // Branch waits for cue_complete from the branched cue
            if (type === "cue_complete") {
                _waiting = false;
                _advance();
            }
            break;

        case "wait_event":
            if (type === step.event) {
                _waiting = false;
                _advance();
            }
            break;

        default:
            break;
    }

    // Always store prompt answers regardless of current step type
    if (type === "prompt_response" && data && data.answer !== undefined) {
        _stored.promptAnswer = data.answer;
    }
}

/**
 * Cancel the current sequence.
 */
function cancel() {
    if (_delayTimer) { clearTimeout(_delayTimer); _delayTimer = null; }
    _activeSeq = null;
    _stepIndex = -1;
    _waiting = false;
    _stored = {};
}

/**
 * Rewind one step so the current (interrupted) step replays
 * after the next cue_complete. Used by tutorial tap warning.
 */
function rewindStep() {
    if (!_activeSeq || _stepIndex < 0) return;
    _stepIndex--;
    _waiting = false;
}

/**
 * Full teardown.
 */
function destroy() {
    cancel();
    _sendCommand = null;
    _onComplete = null;
    _gameAction = null;
    _initialized = false;
}

// ============================================================
// QUERY
// ============================================================

function isRunning() {
    return _activeSeq !== null;
}

function getActiveSequence() {
    return _activeSeq ? _activeSeq.id : null;
}

// ============================================================
// INTERNAL — STEP EXECUTION
// ============================================================

/**
 * Advance to and execute the next step.
 */
function _advance() {
    _stepIndex++;

    if (!_activeSeq || _stepIndex >= _activeSeq.steps.length) {
        // Sequence complete
        _activeSeq = null;
        _stepIndex = -1;
        return;
    }

    var step = _activeSeq.steps[_stepIndex];
    _executeStep(step);
}

/**
 * Execute a single step.
 */
function _executeStep(step) {
    switch (step.type) {

        case "play_cue":
            _waiting = true;
            if (_sendCommand) {
                _sendCommand({
                    intent: "cue",
                    cue: step.cue,
                    line: step.line || null,
                    target: step.target || null,
                    category: "tutorial",
                });
            }
            break;

        case "branch":
            var answer = _stored[step.key];
            var cueId = null;

            if (answer && step.map && step.map[answer]) {
                cueId = step.map[answer];
            } else {
                // Fallback: pick first option in map
                var keys = Object.keys(step.map || {});
                cueId = keys.length > 0 ? step.map[keys[0]] : null;
            }

            if (cueId && _sendCommand) {
                _waiting = true;
                _sendCommand({
                    intent: "cue",
                    cue: cueId,
                    line: null,
                    target: null,
                    category: "tutorial",
                });
            } else {
                // No cue to play, skip ahead
                _advance();
            }
            break;

        case "set_flag":
            // Always write to runtime memory (survives devSkipPersist)
            _flagMemory[step.key] = step.value;
            if (!_devSkipPersist) {
                try {
                    localStorage.setItem(step.key, step.value);
                } catch (e) {
                    console.warn("[FairyTutorial] Failed to set flag:", e.message);
                }
            } else {
                console.log("[FairyTutorial] DEV: skipped persist for " + step.key);
            }
            // set_flag is instant, advance immediately
            _advance();
            break;

        case "callback":
            if (_onComplete) {
                _onComplete(step.result, _stored);
            }
            // callback is instant, advance immediately
            _advance();
            break;

        case "action":
            if (_gameAction) {
                _gameAction(step.name, step.params || null);
            }
            // action is instant, advance immediately
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

        case "wait_event":
            _waiting = true;
            // Just wait — onEvent will advance when the right event arrives
            break;

        default:
            console.warn("[FairyTutorial] Unknown step type: " + step.type);
            _advance();
            break;
    }
}

// ============================================================
// PUBLIC API
// ============================================================

var FairyTutorial = {
    // Lifecycle
    init:     init,
    destroy:  destroy,

    // Control
    start:      start,
    cancel:     cancel,
    onEvent:    onEvent,
    rewindStep: rewindStep,

    // Query
    isRunning:         isRunning,
    getActiveSequence: getActiveSequence,
    isFlagSet:         function(key) { return !!_flagMemory[key]; },
    setFlag:           function(key, value) { _flagMemory[key] = value; },

    // Data (for controller to read doneKey on skip)
    SEQUENCES: SEQUENCES,
};

export default FairyTutorial;