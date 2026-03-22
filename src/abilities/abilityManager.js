// ============================================================
// abilityManager.js — Wobbly Anvil Ability Manager
// Reactive gameplay ability system (GAS pattern).
// Pure JS — no React, no DOM, no side effects beyond bus.
//
// LIFECYCLE:
//   REGISTERED → WATCHING → ACTIVE → ENDING → DEAD
//
// MODIFIER RESOLUTION ORDER:
//   Override → Multiply → Add → Clamp (set_min, set_max)
//
// COMMUNICATION: Bus only. Abilities affect state by emitting
// bus tags, never by mutating state directly. Modifiers are
// the one exception — registered here, resolved on-demand by
// consuming systems.
//
// UE ANALOGY: Gameplay Ability System (GAS) — Abilities +
// Gameplay Effects + Modifier system.
//
// USAGE:
//   import AbilityManager from "./abilityManager.js";
//   import ALL_ABILITIES from "./index.js";
//   AbilityManager.init(bus, stateProvider);
//   AbilityManager.registerAll(ALL_ABILITIES);
//   AbilityManager.startWatching();
//
// PORTABLE: Drop into any JS project with a pub/sub bus.
// ============================================================

// --- Internal State ---
var _bus = null;                    // GameplayEventBus reference
var _stateProvider = null;          // function() → live game state
var _registry = {};                 // id → ability definition
var _active = [];                   // active ability instances
var _modifiers = [];                // active modifier entries
var _watchers = [];                 // { tag, handler } for cleanup
var _instanceCounter = 0;           // unique instance IDs
var _initialized = false;

// --- Diagnostics ---
var ACTIVE_WARNING_THRESHOLD = 10;

// ============================================================
// INTERNAL: Build context object for lifecycle functions
// ============================================================

function buildContext(instance, payload) {
    return {
        bus:      _bus,
        payload:  payload || {},
        manager:  AbilityManager,
        instanceId: instance.instanceId,
        endSelf:  function() { endAbility(instance.instanceId); },
        state:    _stateProvider ? _stateProvider() : {},
    };
}

// ============================================================
// INTERNAL: Create an instance from a definition
// ============================================================

function createInstance(def, payload) {
    _instanceCounter++;
    return {
        instanceId:  def.id + "_" + _instanceCounter,
        id:          def.id,
        tags:        def.tags || [],
        scope:       def.scope || "day",
        def:         def,
        payload:     payload || {},
        endWatcher:  null,       // bus handler for endWhen
        durationTimer: null,     // setTimeout id for duration
    };
}

// ============================================================
// INTERNAL: Activate an instance
// ============================================================

function activateInstance(def, payload) {
    // Stackable check
    if (!def.stackable && isActive(def.id)) {
        return null;
    }

    var instance = createInstance(def, payload);
    _active.push(instance);

    // Diagnostics
    if (_active.length > ACTIVE_WARNING_THRESHOLD) {
        var names = _active.map(function(a) { return a.id; }).join(", ");
        console.warn(
            "[AbilityManager] WARNING: " + _active.length +
            " active abilities — possible design sprawl\nActive: " + names
        );
    }

    // Build context and fire onActivate
    var ctx = buildContext(instance, payload);
    if (def.onActivate) {
        try {
            def.onActivate(ctx);
        } catch (e) {
            console.error("[AbilityManager] onActivate error for " + def.id + ":", e);
        }
    }

    // Set up endWhen watcher (bus tag + condition)
    if (def.endWhen && def.endWhen.tag) {
        var endHandler = function(endPayload) {
            // Check condition if provided, otherwise any emission ends it
            var shouldEnd = true;
            if (def.endWhen.condition) {
                var endCtx = buildContext(instance, endPayload);
                try {
                    shouldEnd = def.endWhen.condition(endCtx);
                } catch (e) {
                    console.error("[AbilityManager] endWhen condition error for " + def.id + ":", e);
                    shouldEnd = false;
                }
            }
            if (shouldEnd) {
                endAbility(instance.instanceId);
            }
        };
        instance.endWatcher = { tag: def.endWhen.tag, handler: endHandler };
        _bus.on(def.endWhen.tag, endHandler);
    }

    // Set up duration timer
    if (def.duration && def.duration > 0) {
        instance.durationTimer = setTimeout(function() {
            endAbility(instance.instanceId);
        }, def.duration);
    }

    return instance;
}

// ============================================================
// SETUP
// ============================================================

function init(bus, stateProvider) {
    _bus = bus;
    _stateProvider = stateProvider || function() { return {}; };
    _initialized = true;
}

function register(abilityDef) {
    if (!abilityDef || !abilityDef.id) {
        console.error("[AbilityManager] Cannot register ability without id");
        return;
    }
    _registry[abilityDef.id] = abilityDef;
}

function registerAll(abilityDefsArray) {
    if (!Array.isArray(abilityDefsArray)) return;
    for (var i = 0; i < abilityDefsArray.length; i++) {
        register(abilityDefsArray[i]);
    }
}

// ============================================================
// WATCHING — Subscribe trigger tags to bus
// ============================================================

function startWatching() {
    if (!_initialized) {
        console.error("[AbilityManager] Must call init() before startWatching()");
        return;
    }

    // Clean up any existing watchers
    stopWatching();

    var ids = Object.keys(_registry);
    for (var i = 0; i < ids.length; i++) {
        var def = _registry[ids[i]];
        if (!def.trigger) continue; // manual activation only

        // Use IIFE to capture def in closure
        (function(d) {
            var handler = function(payload) {
                // Guard: canActivate check with live state
                if (d.canActivate) {
                    var state = _stateProvider ? _stateProvider() : {};
                    var canFire = false;
                    try {
                        canFire = d.canActivate(payload, AbilityManager, state);
                    } catch (e) {
                        console.error("[AbilityManager] canActivate error for " + d.id + ":", e);
                    }
                    if (!canFire) return;
                }
                activateInstance(d, payload);
            };
            _bus.on(d.trigger, handler);
            _watchers.push({ tag: d.trigger, handler: handler });
        })(def);
    }
}

function stopWatching() {
    for (var i = 0; i < _watchers.length; i++) {
        _bus.off(_watchers[i].tag, _watchers[i].handler);
    }
    _watchers = [];
}

// ============================================================
// LIFECYCLE
// ============================================================

function activate(id, payload) {
    var def = _registry[id];
    if (!def) {
        console.warn("[AbilityManager] No registered ability with id: " + id);
        return null;
    }
    return activateInstance(def, payload);
}

function endAbility(instanceId) {
    var idx = -1;
    for (var i = 0; i < _active.length; i++) {
        if (_active[i].instanceId === instanceId) {
            idx = i;
            break;
        }
    }
    if (idx === -1) return;

    var instance = _active[idx];

    // Remove endWhen bus subscription
    if (instance.endWatcher) {
        _bus.off(instance.endWatcher.tag, instance.endWatcher.handler);
        instance.endWatcher = null;
    }

    // Clear duration timer
    if (instance.durationTimer) {
        clearTimeout(instance.durationTimer);
        instance.durationTimer = null;
    }

    // Fire onEnd
    var ctx = buildContext(instance, instance.payload);
    if (instance.def.onEnd) {
        try {
            instance.def.onEnd(ctx);
        } catch (e) {
            console.error("[AbilityManager] onEnd error for " + instance.id + ":", e);
        }
    }

    // Remove modifiers owned by this instance
    removeModifiersBySource(instance.instanceId);

    // Remove from active list
    _active.splice(idx, 1);
}

function endAll(scope) {
    // Build list of instanceIds to end (iterate copy to avoid mutation issues)
    var toEnd = [];
    for (var i = 0; i < _active.length; i++) {
        if (scope === "all" || _active[i].scope === scope) {
            toEnd.push(_active[i].instanceId);
        }
    }
    for (var j = 0; j < toEnd.length; j++) {
        endAbility(toEnd[j]);
    }
}

// ============================================================
// QUERY
// ============================================================

function isActive(id) {
    for (var i = 0; i < _active.length; i++) {
        if (_active[i].id === id) return true;
    }
    return false;
}

function getActive() {
    return _active.map(function(inst) {
        return {
            instanceId: inst.instanceId,
            id:         inst.id,
            tags:       inst.tags,
            scope:      inst.scope,
        };
    });
}

function hasTag(tag) {
    for (var i = 0; i < _active.length; i++) {
        var tags = _active[i].tags;
        if (tags && tags.indexOf(tag) !== -1) return true;
    }
    return false;
}

// ============================================================
// MODIFIER SYSTEM
// Resolution order: Override → Multiply → Add → Clamp
// ============================================================

function addModifier(mod) {
    if (!mod || !mod.source || !mod.attribute || !mod.operation) {
        console.error("[AbilityManager] Invalid modifier:", mod);
        return;
    }
    _modifiers.push({
        source:    mod.source,     // instanceId or ability id
        attribute: mod.attribute,
        operation: mod.operation,  // "override", "multiply", "add", "set_min", "set_max"
        value:     mod.value,
    });
}

function removeModifiersBySource(source) {
    _modifiers = _modifiers.filter(function(m) {
        return m.source !== source;
    });
}

function getModifiers(attribute) {
    return _modifiers.filter(function(m) {
        return m.attribute === attribute;
    });
}

function resolveValue(attribute, baseValue) {
    var mods = getModifiers(attribute);
    if (mods.length === 0) return baseValue;

    var result = baseValue;

    // 1. Override (last override wins)
    var hasOverride = false;
    for (var i = mods.length - 1; i >= 0; i--) {
        if (mods[i].operation === "override") {
            result = mods[i].value;
            hasOverride = true;
            break;
        }
    }

    // 2. Multiply (all stack multiplicatively)
    for (var j = 0; j < mods.length; j++) {
        if (mods[j].operation === "multiply") {
            result = result * mods[j].value;
        }
    }

    // 3. Add (all stack additively)
    for (var k = 0; k < mods.length; k++) {
        if (mods[k].operation === "add") {
            result = result + mods[k].value;
        }
    }

    // 4. Clamp (set_min and set_max)
    for (var l = 0; l < mods.length; l++) {
        if (mods[l].operation === "set_min") {
            if (result < mods[l].value) result = mods[l].value;
        }
    }
    for (var m = 0; m < mods.length; m++) {
        if (mods[m].operation === "set_max") {
            if (result > mods[m].value) result = mods[m].value;
        }
    }

    return result;
}

// ============================================================
// RESET — Full teardown (new game)
// ============================================================

function reset() {
    // End all active abilities (fires onEnd for each)
    endAll("all");

    // Stop watching bus
    stopWatching();

    // Clear everything
    _registry = {};
    _active = [];
    _modifiers = [];
    _watchers = [];
    _instanceCounter = 0;
}

// ============================================================
// PUBLIC API
// ============================================================

var AbilityManager = {
    // --- Setup ---
    init:           init,
    register:       register,
    registerAll:    registerAll,
    startWatching:  startWatching,
    stopWatching:   stopWatching,

    // --- Lifecycle ---
    activate:       activate,
    endAbility:     endAbility,
    endAll:         endAll,

    // --- Query ---
    isActive:       isActive,
    getActive:      getActive,
    hasTag:         hasTag,

    // --- Modifiers ---
    addModifier:    addModifier,
    getModifiers:   getModifiers,
    resolveValue:   resolveValue,

    // --- Cleanup ---
    reset:          reset,
};

export default AbilityManager;