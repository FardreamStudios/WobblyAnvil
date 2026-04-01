// ============================================================
// battleBus.js — Battle-Internal Event Bus Factory
//
// Creates a new event bus instance per battle. Same emit/on/off
// API as GameplayEventBus, but scoped to one battle lifetime.
// Created on battle mount, destroyed on unmount. Zero leakage
// to host systems.
//
// Usage:
//   var bus = createBattleBus();
//   bus.on("BATTLE:SWING_COMPLETE", handler);
//   bus.emit("BATTLE:SWING_COMPLETE", payload);
//   bus.destroy(); // removes all listeners
//
// No React imports. No singletons. Portable.
// ============================================================

function createBattleBus() {
    var listeners = {};

    function on(tag, fn) {
        if (!listeners[tag]) listeners[tag] = [];
        listeners[tag].push(fn);
    }

    function off(tag, fn) {
        if (!listeners[tag]) return;
        listeners[tag] = listeners[tag].filter(function(f) { return f !== fn; });
    }

    function emit(tag, payload) {
        var fns = listeners[tag];
        if (!fns) return;
        for (var i = 0; i < fns.length; i++) {
            fns[i](payload);
        }
    }

    function destroy() {
        listeners = {};
    }

    return {
        on:      on,
        off:     off,
        emit:    emit,
        destroy: destroy,
    };
}

// ============================================================
// Export
// ============================================================
var BattleBus = {
    createBattleBus: createBattleBus,
};

export default BattleBus;