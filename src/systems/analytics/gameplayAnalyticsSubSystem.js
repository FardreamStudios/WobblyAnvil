// ============================================================
// gameplayAnalyticsSubSystem.js — Generic Gameplay Analytics
// Pure JS singleton. Config-driven stat tracker.
//
// Takes a config table of stat definitions at init. Each stat
// specifies a bus tag to listen to and an accumulation mode
// (count, sum, max). The subsystem subscribes, accumulates,
// and exposes a snapshot via getStats().
//
// Zero game-specific logic. All game knowledge lives in the
// config table passed at init.
//
// LIFECYCLE:
//   init(bus, config)  — subscribe to configured bus tags
//   getStats()         — snapshot of current values
//   reset()            — zero all counters
//   destroy()          — unsubscribe and clean up
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

var _bus = null;
var _initialized = false;
var _frozen = false;
var _handlers = [];
var _stats = {};
var _statDefs = [];

// ============================================================
// ACCUMULATION MODES
// ============================================================

var MODES = {
    count: function(_current, _payload, _field) {
        return _current + 1;
    },
    sum: function(_current, _payload, _field) {
        var value = _payload && _payload[_field] || 0;
        if (value > 0) return _current + value;
        return _current;
    },
    max: function(_current, _payload, _field) {
        var value = _payload && _payload[_field] || 0;
        if (value > _current) return value;
        return _current;
    },
};

// ============================================================
// INTERNAL
// ============================================================

function _buildHandler(tag) {
    return function(payload) {
        if (_frozen) return;
        for (var i = 0; i < _statDefs.length; i++) {
            var def = _statDefs[i];
            if (def.tag === tag) {
                var fn = MODES[def.mode];
                if (fn) {
                    _stats[def.key] = fn(_stats[def.key], payload, def.field);
                }
            }
        }
    };
}

function _onReset() {
    resetStats();
}

function _onFreeze() {
    _frozen = true;
}

// ============================================================
// SETUP
// ============================================================

function init(bus, config) {
    if (_initialized) {
        console.warn("[GameplayAnalyticsSubSystem] Already initialized. Call destroy() first.");
        return;
    }
    if (!config || !config.stats) {
        console.warn("[GameplayAnalyticsSubSystem] No config.stats provided.");
        return;
    }

    _bus = bus;
    _statDefs = config.stats;
    _initialized = true;
    _frozen = false;

    // Initialize all stat values to 0
    for (var i = 0; i < _statDefs.length; i++) {
        _stats[_statDefs[i].key] = 0;
    }

    // Collect unique tags and subscribe once per tag
    var seen = {};
    for (var j = 0; j < _statDefs.length; j++) {
        var tag = _statDefs[j].tag;
        if (tag && !seen[tag]) {
            seen[tag] = true;
            var handler = _buildHandler(tag);
            _bus.on(tag, handler);
            _handlers.push([tag, handler]);
        }
    }

    // Lifecycle subscriptions
    if (config.resetTag) {
        _bus.on(config.resetTag, _onReset);
        _handlers.push([config.resetTag, _onReset]);
    }
    if (config.freezeTag) {
        _bus.on(config.freezeTag, _onFreeze);
        _handlers.push([config.freezeTag, _onFreeze]);
    }
}

function resetStats() {
    _frozen = false;
    for (var i = 0; i < _statDefs.length; i++) {
        _stats[_statDefs[i].key] = 0;
    }
}

function getStats() {
    var snapshot = {};
    for (var i = 0; i < _statDefs.length; i++) {
        var key = _statDefs[i].key;
        snapshot[key] = _stats[key];
    }
    return snapshot;
}

function destroy() {
    if (!_initialized) return;
    for (var i = 0; i < _handlers.length; i++) {
        _bus.off(_handlers[i][0], _handlers[i][1]);
    }
    _handlers = [];
    _statDefs = [];
    _stats = {};
    _initialized = false;
    _frozen = false;
    _bus = null;
}

// ============================================================
// PUBLIC API
// ============================================================

var GameplayAnalyticsSubSystem = {
    init:      init,
    reset:     resetStats,
    getStats:  getStats,
    destroy:   destroy,
};

export default GameplayAnalyticsSubSystem;