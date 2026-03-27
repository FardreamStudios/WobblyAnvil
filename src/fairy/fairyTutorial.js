// ============================================================
// fairyTutorial.js — Fairy Tutorial Step Sequencer
//
// Drives multi-step tutorial sequences through the fairy pipeline.
// Each sequence is an array of steps. Steps execute in order,
// advancing on events from the pawn (cue_complete, prompt_response).
//
// STEP TYPES:
//   play_cue  — send a cue command to pawn, wait for cue_complete
//   branch    — pick next cue based on stored prompt answer
//   set_flag  — write to localStorage
//   callback  — fire the onComplete callback with result data
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
// ============================================================

var SEQUENCES = {
    intro: {
        id: "intro",
        steps: [
            { type: "play_cue", cue: "intro_rise" },
            { type: "play_cue", cue: "intro_prompt" },
            { type: "branch",   key: "promptAnswer", map: { "sure": "intro_respond_yes", "no thanks": "intro_respond_no" } },
            { type: "set_flag", key: "wa_fairy_intro_done", value: "true" },
            { type: "callback", result: "intro_complete" },
        ],
    },
};

// ============================================================
// INTERNAL STATE
// ============================================================

var _initialized = false;
var _sendCommand = null;     // fn(cmd) — routes to pawn via controller
var _onComplete = null;      // fn(result) — tells controller sequence is done

var _activeSeq = null;       // current sequence object
var _stepIndex = -1;         // current step index
var _waiting = false;        // true when waiting for an event to advance
var _stored = {};            // key-value store for branch decisions

// ============================================================
// LIFECYCLE
// ============================================================

/**
 * Initialize the tutorial sequencer.
 * @param {Object} config
 *   config.sendCommand  — fn(cmd) sends structured command to pawn
 *   config.onComplete   — fn(result) called when sequence finishes
 */
function init(config) {
    if (_initialized) {
        console.warn("[FairyTutorial] Already initialized.");
        return;
    }

    _sendCommand = config.sendCommand || null;
    _onComplete  = config.onComplete  || null;
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

        // play_cue steps that use show_choice: prompt_response arrives
        // before cue_complete. Store the answer so branch can use it.
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
    _activeSeq = null;
    _stepIndex = -1;
    _waiting = false;
    _stored = {};
}

/**
 * Full teardown.
 */
function destroy() {
    cancel();
    _sendCommand = null;
    _onComplete = null;
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
            try {
                localStorage.setItem(step.key, step.value);
            } catch (e) {
                console.warn("[FairyTutorial] Failed to set flag:", e.message);
            }
            // set_flag is instant, advance immediately
            _advance();
            break;

        case "callback":
            if (_onComplete) {
                _onComplete(step.result);
            }
            // callback is instant, advance immediately
            _advance();
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
    start:    start,
    cancel:   cancel,
    onEvent:  onEvent,

    // Query
    isRunning:         isRunning,
    getActiveSequence: getActiveSequence,

    // Expose for testing / future sequences
    SEQUENCES: SEQUENCES,
};

export default FairyTutorial;