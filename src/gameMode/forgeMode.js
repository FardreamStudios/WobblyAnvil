// ============================================================
// forgeMode.js — Wobbly Anvil Forge Sub-Mode
// Pure JS — no React, no DOM. Implements sub-mode contract.
//
// OWNS:
//   Forge phase state machine (IDLE → SELECT → ... → QUENCH)
//   Phase transition validation
//   Bus emissions on phase change
//
// DOES NOT OWN:
//   QTE math (useForgeVM owns that)
//   Forge state mutations (useForgeState owns that)
//   Display props (useForgeVM derives those)
//
// COMMUNICATION:
//   Emits EVENT_TAGS.PHASE_FORGE_TRANSITION on every change.
//   Emits EVENT_TAGS.MODE_FORGE_ENTER / EXIT via GameMode.
//
// CONTRACT: { id, canEnter, onEnter, onExit, getPhase, getView }
//   Registered with GameMode.registerSubMode(forgeMode).
//
// UE ANALOGY: A sub-mode is like a UGameState scoped to an
// activity. ForgeMode = the forge activity's state machine.
//
// PORTABLE: Could run in Node with a bus stub.
// ============================================================

import EVENT_TAGS from "../config/eventTags.js";

// ============================================================
// PHASE DEFINITIONS
// Single source of truth for forge phase IDs.
// Matches GameConstants.PHASES — imported here as strings
// so forgeMode stays decoupled from constants.js.
// ============================================================

var FORGE_PHASES = {
    IDLE:        "idle",
    SELECT:      "select",
    SELECT_MAT:  "select_mat",
    HEAT:        "heat",
    HAMMER:      "hammer",
    SESS_RESULT: "sess_result",
    QUENCH:      "quench",
};

// ============================================================
// LEGAL TRANSITIONS
// Map of phase → array of phases it can move to.
// "idle" is always a legal target (reset / cancel / shatter).
// ============================================================

var LEGAL_TRANSITIONS = {};
LEGAL_TRANSITIONS[FORGE_PHASES.IDLE]        = [FORGE_PHASES.SELECT];
LEGAL_TRANSITIONS[FORGE_PHASES.SELECT]      = [FORGE_PHASES.SELECT_MAT, FORGE_PHASES.IDLE];
LEGAL_TRANSITIONS[FORGE_PHASES.SELECT_MAT]  = [FORGE_PHASES.SELECT, FORGE_PHASES.HEAT, FORGE_PHASES.IDLE];
LEGAL_TRANSITIONS[FORGE_PHASES.HEAT]        = [FORGE_PHASES.HAMMER, FORGE_PHASES.IDLE];
LEGAL_TRANSITIONS[FORGE_PHASES.HAMMER]      = [FORGE_PHASES.SESS_RESULT, FORGE_PHASES.IDLE];
LEGAL_TRANSITIONS[FORGE_PHASES.SESS_RESULT] = [FORGE_PHASES.HEAT, FORGE_PHASES.QUENCH, FORGE_PHASES.IDLE];
LEGAL_TRANSITIONS[FORGE_PHASES.QUENCH]      = [FORGE_PHASES.IDLE];

// ============================================================
// INTERNAL STATE
// ============================================================

var _bus = null;
var _phase = FORGE_PHASES.IDLE;

// ============================================================
// PHASE MACHINE
// ============================================================

function transitionTo(nextPhase, payload) {
    if (nextPhase === _phase) return false;

    // IDLE is always legal (reset, shatter, cancel, sleep)
    if (nextPhase !== FORGE_PHASES.IDLE) {
        var allowed = LEGAL_TRANSITIONS[_phase];
        if (!allowed || allowed.indexOf(nextPhase) === -1) {
            console.warn(
                "[ForgeMode] Illegal transition: " + _phase + " → " + nextPhase
            );
            return false;
        }
    }

    var prevPhase = _phase;
    _phase = nextPhase;

    if (_bus) {
        _bus.emit(EVENT_TAGS.PHASE_FORGE_TRANSITION, {
            from: prevPhase,
            to: nextPhase,
            payload: payload || null,
        });
    }

    return true;
}

function forcePhase(phase) {
    // Escape hatch for resets — no validation, no bus emission.
    // Used only by onExit and hard resets.
    _phase = phase;
}

// ============================================================
// SUB-MODE CONTRACT
// ============================================================

function canEnter(gameState) {
    // Can enter forge if game is in open/late phase
    // Additional guards (stamina, materials) are checked
    // by useForgeVM at the action level, not here.
    return true;
}

function onEnter(bus) {
    _bus = bus;
    _phase = FORGE_PHASES.IDLE;
}

function onExit(bus) {
    _phase = FORGE_PHASES.IDLE;
}

function getPhase() {
    return _phase;
}

function getView() {
    return "forge";
}

// ============================================================
// QUERY HELPERS
// ============================================================

function isQTEActive() {
    return _phase === FORGE_PHASES.HEAT
        || _phase === FORGE_PHASES.HAMMER
        || _phase === FORGE_PHASES.QUENCH;
}

function isForging() {
    return _phase !== FORGE_PHASES.IDLE
        && _phase !== FORGE_PHASES.SELECT
        && _phase !== FORGE_PHASES.SELECT_MAT;
}

// ============================================================
// RESET — Full teardown
// ============================================================

function reset() {
    _phase = FORGE_PHASES.IDLE;
    _bus = null;
}

// ============================================================
// PUBLIC API
// ============================================================

var ForgeMode = {
    // --- Sub-Mode Contract ---
    id:          "forge",
    canEnter:    canEnter,
    onEnter:     onEnter,
    onExit:      onExit,
    getPhase:    getPhase,
    getView:     getView,

    // --- Phase Machine ---
    transitionTo: transitionTo,
    forcePhase:   forcePhase,
    PHASES:       FORGE_PHASES,

    // --- Query ---
    isQTEActive:  isQTEActive,
    isForging:    isForging,

    // --- Cleanup ---
    reset:        reset,
};

export default ForgeMode;