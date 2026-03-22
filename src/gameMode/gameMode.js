// ============================================================
// gameMode.js — Wobbly Anvil GameMode Core
// Pure JS — no React, no DOM. Talks only through the bus.
//
// OWNS:
//   Day lifecycle (wake → morning → open → late → sleep → end)
//   Sub-mode registration and switching (forge, shop, etc.)
//   Game over / win conditions
//   Game-level bus emissions
//
// DOES NOT OWN:
//   State mutations (state hooks own that)
//   UI rendering (views own that)
//   Ability activation (AbilityManager owns that)
//
// COMMUNICATION: Bus only. GameMode emits lifecycle tags.
// AbilityManager, state hooks, and views subscribe.
//
// UE ANALOGY: AGameMode (C++ base class). The React hook
// wrapper (useGameMode.js) is the Blueprint counterpart.
//
// USAGE:
//   import GameMode from "./gameMode.js";
//   GameMode.init(bus, stateProvider, abilityManager);
//   GameMode.registerSubMode(forgeMode);
//   GameMode.startGame();
//
// PORTABLE: Could run in a Node terminal with a bus stub.
// ============================================================

// ============================================================
// GAME LIFECYCLE TAGS
// These are the bus tags GameMode emits. Kept here as the
// single source of truth for the game loop vocabulary.
// Will be merged into eventTags.js when wired (M-7).
// ============================================================

var GAME_TAGS = {
    // --- Day Lifecycle ---
    DAY_START:          "game.day.start",
    DAY_MORNING_PHASE:  "game.day.morning_phase",
    DAY_OPEN:           "game.day.open",
    DAY_LATE:           "game.day.late",
    DAY_SLEEP:          "game.day.sleep",
    DAY_END:            "game.day.end",

    // --- Sub-Mode ---
    MODE_ENTER:         "game.mode.enter",
    MODE_EXIT:          "game.mode.exit",

    // --- Game State ---
    GAME_OVER:          "game.over",
    GAME_NEW:           "game.new",
};

// ============================================================
// INTERNAL STATE
// ============================================================

var _bus = null;                    // GameplayEventBus reference
var _stateProvider = null;          // function() → live game state
var _abilityManager = null;         // AbilityManager reference (for endAll on day end)
var _initialized = false;

// --- Day ---
var _day = 0;
var _dayPhase = "idle";             // "idle", "morning", "open", "late", "sleeping"

// --- Sub-Modes ---
var _subModes = {};                 // id → sub-mode definition
var _activeMode = null;             // currently active sub-mode id (null = idle)

// --- Game State ---
var _gameOver = false;
var _gameOverReason = null;

// --- Config (tunable) ---
var _config = {
    wakeHour:       8,
    openHour:       9,
    lateHour:       22,
    gameOverTag:    null,           // optional: bus tag to listen for external game over
};

// ============================================================
// SETUP
// ============================================================

function init(bus, stateProvider, abilityManager, config) {
    _bus = bus;
    _stateProvider = stateProvider || function() { return {}; };
    _abilityManager = abilityManager || null;

    if (config) {
        var keys = Object.keys(config);
        for (var i = 0; i < keys.length; i++) {
            _config[keys[i]] = config[keys[i]];
        }
    }

    _initialized = true;
}

// ============================================================
// SUB-MODE REGISTRATION
// Contract: { id, canEnter(state), onEnter(bus), onExit(bus),
//             getPhase(), getView() }
// ============================================================

function registerSubMode(modeDef) {
    if (!modeDef || !modeDef.id) {
        console.error("[GameMode] Cannot register sub-mode without id");
        return;
    }
    _subModes[modeDef.id] = modeDef;
}

function registerSubModes(modeDefsArray) {
    if (!Array.isArray(modeDefsArray)) return;
    for (var i = 0; i < modeDefsArray.length; i++) {
        registerSubMode(modeDefsArray[i]);
    }
}

// ============================================================
// SUB-MODE SWITCHING
// ============================================================

function enterMode(modeId) {
    if (_gameOver) return false;

    var mode = _subModes[modeId];
    if (!mode) {
        console.warn("[GameMode] No registered sub-mode: " + modeId);
        return false;
    }

    // Check canEnter guard
    var state = _stateProvider ? _stateProvider() : {};
    if (mode.canEnter && !mode.canEnter(state)) {
        return false;
    }

    // Exit current mode first
    if (_activeMode) {
        exitMode();
    }

    _activeMode = modeId;

    // Fire onEnter
    if (mode.onEnter) {
        try {
            mode.onEnter(_bus);
        } catch (e) {
            console.error("[GameMode] onEnter error for " + modeId + ":", e);
        }
    }

    _bus.emit(GAME_TAGS.MODE_ENTER, { mode: modeId, subMode: true });
    return true;
}

function exitMode() {
    if (!_activeMode) return;

    var mode = _subModes[_activeMode];
    var exitedId = _activeMode;
    _activeMode = null;

    if (mode && mode.onExit) {
        try {
            mode.onExit(_bus);
        } catch (e) {
            console.error("[GameMode] onExit error for " + exitedId + ":", e);
        }
    }

    _bus.emit(GAME_TAGS.MODE_EXIT, { mode: exitedId });
}

function getActiveMode() {
    return _activeMode;
}

function getActiveModePhase() {
    if (!_activeMode) return null;
    var mode = _subModes[_activeMode];
    return mode && mode.getPhase ? mode.getPhase() : null;
}

function getActiveModeView() {
    if (!_activeMode) return null;
    var mode = _subModes[_activeMode];
    return mode && mode.getView ? mode.getView() : null;
}

function canEnterMode(modeId) {
    var mode = _subModes[modeId];
    if (!mode) return false;
    if (mode.canEnter) {
        var state = _stateProvider ? _stateProvider() : {};
        return mode.canEnter(state);
    }
    return true;
}

// ============================================================
// DAY LIFECYCLE
// Sequence: START → MORNING_PHASE → OPEN → (gameplay) → SLEEP → END
// GameMode emits tags at each transition. Systems subscribe
// to the ones they care about.
// ============================================================

function startDay(dayNumber) {
    if (_gameOver) return;

    _day = dayNumber;
    _dayPhase = "morning";

    // 1. DAY_START — state hooks reset, UI updates
    _bus.emit(GAME_TAGS.DAY_START, {
        day: _day,
        hour: _config.wakeHour,
    });

    // 2. MORNING_PHASE — abilities check activation (festival, merchant, etc.)
    _bus.emit(GAME_TAGS.DAY_MORNING_PHASE, {
        day: _day,
    });

    // 3. DAY_OPEN — customers can arrive, gameplay begins
    _dayPhase = "open";
    _bus.emit(GAME_TAGS.DAY_OPEN, {
        day: _day,
        hour: _config.openHour,
    });
}

function triggerLate() {
    if (_gameOver || _dayPhase === "sleeping") return;

    _dayPhase = "late";
    _bus.emit(GAME_TAGS.DAY_LATE, {
        day: _day,
        hour: _config.lateHour,
    });
}

function sleep(sleepHour) {
    if (_gameOver) return;

    _dayPhase = "sleeping";

    // Exit any active sub-mode
    if (_activeMode) {
        exitMode();
    }

    _bus.emit(GAME_TAGS.DAY_SLEEP, {
        day: _day,
        hour: sleepHour || _config.lateHour,
        sleepHour: sleepHour || _config.lateHour,
    });

    // End day — ability manager cleans up day-scoped abilities
    _bus.emit(GAME_TAGS.DAY_END, {
        day: _day,
    });

    if (_abilityManager) {
        _abilityManager.endAll("day");
    }

    _dayPhase = "idle";
}

// ============================================================
// GAME OVER / NEW GAME
// ============================================================

function triggerGameOver(reason) {
    if (_gameOver) return;

    _gameOver = true;
    _gameOverReason = reason || "unknown";

    // Exit any active sub-mode
    if (_activeMode) {
        exitMode();
    }

    _bus.emit(GAME_TAGS.GAME_OVER, {
        reason: _gameOverReason,
        day: _day,
    });

    // End all abilities
    if (_abilityManager) {
        _abilityManager.endAll("all");
    }
}

function newGame() {
    // Exit any active sub-mode
    if (_activeMode) {
        exitMode();
    }

    // Reset ability manager
    if (_abilityManager) {
        _abilityManager.reset();
    }

    // Reset internal state
    _day = 0;
    _dayPhase = "idle";
    _activeMode = null;
    _gameOver = false;
    _gameOverReason = null;

    _bus.emit(GAME_TAGS.GAME_NEW, {});
}

// ============================================================
// QUERY
// ============================================================

function getDay() {
    return _day;
}

function getDayPhase() {
    return _dayPhase;
}

function isGameOver() {
    return _gameOver;
}

function getGameOverReason() {
    return _gameOverReason;
}

function getRegisteredModes() {
    return Object.keys(_subModes);
}

// ============================================================
// RESET — Full teardown (for hot reloads, testing)
// ============================================================

function reset() {
    if (_activeMode) {
        exitMode();
    }
    _subModes = {};
    _activeMode = null;
    _day = 0;
    _dayPhase = "idle";
    _gameOver = false;
    _gameOverReason = null;
    _initialized = false;
    _bus = null;
    _stateProvider = null;
    _abilityManager = null;
}

// ============================================================
// PUBLIC API
// ============================================================

var GameMode = {
    // --- Tags (importable by other systems) ---
    TAGS: GAME_TAGS,

    // --- Setup ---
    init:               init,
    registerSubMode:    registerSubMode,
    registerSubModes:   registerSubModes,

    // --- Sub-Mode Switching ---
    enterMode:          enterMode,
    exitMode:           exitMode,
    getActiveMode:      getActiveMode,
    getActiveModePhase: getActiveModePhase,
    getActiveModeView:  getActiveModeView,
    canEnterMode:       canEnterMode,

    // --- Day Lifecycle ---
    startDay:           startDay,
    triggerLate:        triggerLate,
    sleep:              sleep,

    // --- Game State ---
    triggerGameOver:    triggerGameOver,
    newGame:            newGame,

    // --- Query ---
    getDay:             getDay,
    getDayPhase:        getDayPhase,
    isGameOver:         isGameOver,
    getGameOverReason:  getGameOverReason,
    getRegisteredModes: getRegisteredModes,

    // --- Cleanup ---
    reset:              reset,
};

export default GameMode;