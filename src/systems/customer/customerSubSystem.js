// ============================================================
// customerSubSystem.js — Wobbly Anvil Customer Lifecycle Manager
// Pure JS singleton. Zero React. Communicates via bus only.
//
// OWNS:
//   Spawn decisions (hour checks, visit caps, chance rolls)
//   Customer type matching against finished weapons
//   Daily visit counter, guaranteed-customer flag
//   Post-sale re-spawn attempts
//   Cleanup on day end
//
// DOES NOT OWN:
//   Customer display (CustomerPanel in gamePanels.js)
//   Active customer React state (useQuestState listens for
//     CUSTOMER_SPAWN / CUSTOMER_CLEAR)
//   Sell/refuse gold flow (useEconomyVM handles that)
//
// COMMUNICATION:
//   Listens: DAY_ADVANCE_HOUR, DAY_CYCLE_START, DAY_CYCLE_END,
//            ECONOMY_WEAPON_SOLD, CUSTOMER_REFUSE,
//            CUSTOMER_WALKOUT, CUSTOMER_PROMOTE, GAME_SESSION_NEW
//   Emits:   CUSTOMER_SPAWN, CUSTOMER_CLEAR, FX_DOORBELL
//
// INIT:
//   CustomerSubSystem.init(bus, stateProvider, abilityManager);
//   Called from App.js or useGameMode after bus is ready.
//
// STATE PROVIDER CONTRACT:
//   stateProvider() → {
//     finished: [],       // array of finished weapons
//     phase: "idle",      // current forge phase
//     hour: 8,            // current hour
//     activeCustomer: null // current customer or null
//   }
//
// UE ANALOGY: NPC Spawn Manager subsystem listening to
//   GameMode phase broadcasts.
//
// PORTABLE: Could run in Node with a bus stub.
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";
import GameConstants from "../../modules/constants.js";

var CUST_TYPES = GameConstants.CUST_TYPES;
var PHASES = GameConstants.PHASES;
var BASE_DAILY_CUSTOMERS = GameConstants.BASE_DAILY_CUSTOMERS;

// --- Utilities (inlined to avoid cross-dependency) ---
function getQualityTierScoreMin(score) {
    // Mirrors the tier thresholds from utilities.js
    // Only need scoreMin for customer matching
    if (score >= 85) return 85;
    if (score >= 65) return 65;
    if (score >= 40) return 40;
    if (score >= 20) return 20;
    return 0;
}

// ============================================================
// INTERNAL STATE
// ============================================================

var _bus = null;
var _stateProvider = null;
var _abilityManager = null;
var _initialized = false;

// --- Daily tracking ---
var _custVisitsToday = 0;
var _maxCustToday = BASE_DAILY_CUSTOMERS;
var _guaranteedCustomers = false;
var _hasActiveCustomer = false;

// --- Config ---
var _config = {
    minSpawnHour:   9,
    maxSpawnHour:   21,
    baseChance:     0.42,
    postSaleDelay:  500,   // ms before re-spawn attempt after sale
    postHourDelay:  200,   // ms before spawn attempt after hour advance
};

// ============================================================
// SETUP
// ============================================================

function init(bus, stateProvider, abilityManager, config) {
    if (_initialized) {
        console.warn("[CustomerSubSystem] Already initialized. Call reset() first.");
        return;
    }

    _bus = bus;
    _stateProvider = stateProvider || function() { return {}; };
    _abilityManager = abilityManager || null;

    if (config) {
        var keys = Object.keys(config);
        for (var i = 0; i < keys.length; i++) {
            _config[keys[i]] = config[keys[i]];
        }
    }

    // --- Subscribe to bus ---
    _bus.on(EVENT_TAGS.DAY_ADVANCE_HOUR, _onHourAdvance);
    _bus.on(EVENT_TAGS.ECONOMY_WEAPON_SOLD, _onWeaponSold);
    _bus.on(EVENT_TAGS.CUSTOMER_REFUSE, _onCustomerRefuse);
    _bus.on(EVENT_TAGS.CUSTOMER_WALKOUT, _onCustomerWalkout);
    _bus.on(EVENT_TAGS.DAY_CYCLE_START, _onDayStart);
    _bus.on(EVENT_TAGS.DAY_CYCLE_END, _onDayEnd);
    _bus.on(EVENT_TAGS.GAME_SESSION_NEW, _onNewGame);

    // Bus-driven modifiers for daily caps
    _bus.on(EVENT_TAGS.ECONOMY_EARN_GOLD, _onEarnGold);

    // Promote — guaranteed spawn request from player action
    _bus.on(EVENT_TAGS.CUSTOMER_PROMOTE, _onPromote);

    _initialized = true;
}

// ============================================================
// BUS HANDLERS
// ============================================================

function _onHourAdvance(payload) {
    var newHour = payload && payload.hour;
    if (newHour == null) return;

    // Delay slightly so React state settles before we read it
    setTimeout(function() {
        _attemptSpawn(newHour);
    }, _config.postHourDelay);
}

function _onWeaponSold(payload) {
    // Customer just bought — clear them, then try to spawn another
    _clearCustomer();

    setTimeout(function() {
        var state = _stateProvider ? _stateProvider() : {};
        _attemptSpawn(state.hour || 0, state.finished);
    }, _config.postSaleDelay);
}

function _onCustomerRefuse() {
    _bus.emit(EVENT_TAGS.CUSTOMER_CLEAR, {});
    _hasActiveCustomer = false;
}

function _onCustomerWalkout() {
    _bus.emit(EVENT_TAGS.CUSTOMER_CLEAR, {});
    _hasActiveCustomer = false;
}

function _onDayStart() {
    _custVisitsToday = 0;
    _maxCustToday = BASE_DAILY_CUSTOMERS;
    _guaranteedCustomers = false;
    _hasActiveCustomer = false;
}

function _onDayEnd() {
    // Force-clear any lingering customer
    if (_hasActiveCustomer) {
        _bus.emit(EVENT_TAGS.CUSTOMER_CLEAR, {});
        _hasActiveCustomer = false;
    }
}

function _onNewGame() {
    _custVisitsToday = 0;
    _maxCustToday = BASE_DAILY_CUSTOMERS;
    _guaranteedCustomers = false;
    _hasActiveCustomer = false;
}

function _onEarnGold(payload) {
    // Abilities can set guaranteedCustomers and extraCustomers
    // via the overloaded ECONOMY_EARN_GOLD payload
    if (payload && payload.guaranteedCustomers) {
        _guaranteedCustomers = true;
    }
    if (payload && payload.extraCustomers) {
        _maxCustToday = _maxCustToday + payload.extraCustomers;
    }
}

function _onPromote() {
    // Promote = guaranteed spawn, skip chance roll and hour guards.
    // Still respect: no active customer, need finished weapons.
    if (!_initialized) return;
    if (_hasActiveCustomer) return;

    var state = _stateProvider ? _stateProvider() : {};
    if (state.activeCustomer) return;

    var items = state.finished || [];
    if (!items.length) return;

    var shuffled = CUST_TYPES.slice().sort(function() { return Math.random() - 0.5; });

    shuffled.some(function(ct) {
        var match = items.find(function(w) {
            return getQualityTierScoreMin(w.score) >= ct.minQuality || ct.minQuality === 0;
        });
        if (match) {
            _hasActiveCustomer = true;
            _custVisitsToday = _custVisitsToday + 1;

            _bus.emit(EVENT_TAGS.CUSTOMER_SPAWN, {
                type: ct,
                weapon: match,
            });
            _bus.emit(EVENT_TAGS.FX_DOORBELL, {});
            return true;
        }
        return false;
    });
}

// ============================================================
// SPAWN LOGIC
// ============================================================

function _attemptSpawn(newHour, finishedOverride) {
    if (!_initialized) return;

    var state = _stateProvider ? _stateProvider() : {};
    var items = finishedOverride || state.finished || [];
    var phase = state.phase || PHASES.IDLE;

    // --- Guard checks ---
    if (!items.length) return;
    if (_custVisitsToday >= _maxCustToday) return;
    if (newHour < _config.minSpawnHour || newHour > _config.maxSpawnHour) return;
    if (phase !== PHASES.IDLE && phase !== PHASES.SESS_RESULT) return;
    if (_hasActiveCustomer) return;

    // Check state-level activeCustomer as safety net
    if (state.activeCustomer) return;

    // --- Chance roll (modified by abilities) ---
    var resolvedChance = _abilityManager
        ? _abilityManager.resolveValue("customerChance", _config.baseChance)
        : _config.baseChance;

    if (!_guaranteedCustomers && Math.random() > resolvedChance) return;

    // --- Pick customer type + match weapon ---
    var shuffled = CUST_TYPES.slice().sort(function() { return Math.random() - 0.5; });
    var matched = false;

    shuffled.some(function(ct) {
        var match = items.find(function(w) {
            return getQualityTierScoreMin(w.score) >= ct.minQuality || ct.minQuality === 0;
        });
        if (match) {
            _hasActiveCustomer = true;
            _custVisitsToday = _custVisitsToday + 1;

            _bus.emit(EVENT_TAGS.CUSTOMER_SPAWN, {
                type: ct,
                weapon: match,
            });
            _bus.emit(EVENT_TAGS.FX_DOORBELL, {});

            matched = true;
            return true;  // break .some()
        }
        return false;
    });
}

function _clearCustomer() {
    _bus.emit(EVENT_TAGS.CUSTOMER_CLEAR, {});
    _hasActiveCustomer = false;
}

// ============================================================
// QUERY
// ============================================================

function hasActiveCustomer() {
    return _hasActiveCustomer;
}

function getVisitsToday() {
    return _custVisitsToday;
}

function getMaxVisitsToday() {
    return _maxCustToday;
}

// ============================================================
// RESET — Full teardown (for hot reloads, testing)
// ============================================================

function reset() {
    if (_bus) {
        _bus.off(EVENT_TAGS.DAY_ADVANCE_HOUR, _onHourAdvance);
        _bus.off(EVENT_TAGS.ECONOMY_WEAPON_SOLD, _onWeaponSold);
        _bus.off(EVENT_TAGS.CUSTOMER_REFUSE, _onCustomerRefuse);
        _bus.off(EVENT_TAGS.CUSTOMER_WALKOUT, _onCustomerWalkout);
        _bus.off(EVENT_TAGS.DAY_CYCLE_START, _onDayStart);
        _bus.off(EVENT_TAGS.DAY_CYCLE_END, _onDayEnd);
        _bus.off(EVENT_TAGS.GAME_SESSION_NEW, _onNewGame);
        _bus.off(EVENT_TAGS.ECONOMY_EARN_GOLD, _onEarnGold);
        _bus.off(EVENT_TAGS.CUSTOMER_PROMOTE, _onPromote);
    }

    _bus = null;
    _stateProvider = null;
    _abilityManager = null;
    _initialized = false;

    _custVisitsToday = 0;
    _maxCustToday = BASE_DAILY_CUSTOMERS;
    _guaranteedCustomers = false;
    _hasActiveCustomer = false;
}

// ============================================================
// PUBLIC API
// ============================================================

var CustomerSubSystem = {
    // --- Setup ---
    init:               init,
    reset:              reset,

    // --- Query ---
    hasActiveCustomer:  hasActiveCustomer,
    getVisitsToday:     getVisitsToday,
    getMaxVisitsToday:  getMaxVisitsToday,
};

export default CustomerSubSystem;