// ============================================================
// runStats.js — Wobbly Anvil Run Statistics Tracker
// Pure JS singleton. Listens to bus events, accumulates
// per-run statistics for the leaderboard and score payload.
//
// TRACKS:
//   weaponsForged    — count of finished weapons (sold or shelved)
//   weaponsSold      — count of weapons sold to customers
//   bestQuality      — highest quality score achieved
//   totalGoldSpent   — cumulative gold spent (materials, upgrades)
//   forgeSessions    — total forge sessions completed
//   questsCompleted  — royal quests fulfilled
//
// LIFECYCLE:
//   init(bus)        — subscribe to bus events
//   reset()          — zero all counters (called on new game)
//   freeze()         — stop counting (called on game over)
//   getStats()       — snapshot of current values
//   destroy()        — unsubscribe (cleanup)
//
// DOES NOT OWN: day, gold, reputation, level — those live
// in their respective state hooks. RunStats only tracks
// things that aren't already tracked elsewhere.
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import EVENT_TAGS from "../config/eventTags.js";

// --- Internal State ---
var _bus = null;
var _initialized = false;
var _frozen = false;
var _handlers = [];

var _stats = {
    weaponsForged:    0,
    weaponsSold:      0,
    bestQuality:      0,
    totalGoldSpent:   0,
    forgeSessions:    0,
    questsCompleted:  0,
};

// ============================================================
// INTERNAL: Event handlers
// ============================================================

function onForgeComplete(payload) {
    if (_frozen) return;
    _stats.forgeSessions++;
    var quality = payload && payload.quality || 0;
    if (quality > _stats.bestQuality) {
        _stats.bestQuality = quality;
    }
    // A completed forge session that produces a weapon counts as forged
    // (the weapon gets added to finished array by forgeVM)
    _stats.weaponsForged++;
}

function onWeaponSold(payload) {
    if (_frozen) return;
    _stats.weaponsSold++;
}

function onGoldSpent(payload) {
    if (_frozen) return;
    var amount = payload && payload.amount || 0;
    if (amount > 0) {
        _stats.totalGoldSpent += amount;
    }
}

function onQuestFulfilled(payload) {
    if (_frozen) return;
    // Royal decree FX fires when a quest delivery happens.
    // We count quest completions, not individual deliveries.
    // The quest system emits this when the final delivery completes.
    _stats.questsCompleted++;
}

function onNewGame() {
    resetStats();
}

function onGameOver() {
    _frozen = true;
}

// ============================================================
// SETUP
// ============================================================

function init(bus) {
    if (_initialized) {
        console.warn("[RunStats] Already initialized. Call destroy() first.");
        return;
    }
    _bus = bus;
    _initialized = true;
    _frozen = false;

    // Subscribe to bus events
    var subs = [
        [EVENT_TAGS.FORGE_SESSION_COMPLETE, onForgeComplete],
        [EVENT_TAGS.ECONOMY_WEAPON_SOLD,    onWeaponSold],
        [EVENT_TAGS.ECONOMY_SPEND_GOLD,     onGoldSpent],
        [EVENT_TAGS.FX_ROYAL_DECREE,        onQuestFulfilled],
        [EVENT_TAGS.GAME_SESSION_NEW,       onNewGame],
        [EVENT_TAGS.GAME_SESSION_OVER,      onGameOver],
    ];

    for (var i = 0; i < subs.length; i++) {
        _bus.on(subs[i][0], subs[i][1]);
        _handlers.push(subs[i]);
    }
}

function resetStats() {
    _frozen = false;
    _stats.weaponsForged   = 0;
    _stats.weaponsSold     = 0;
    _stats.bestQuality     = 0;
    _stats.totalGoldSpent  = 0;
    _stats.forgeSessions   = 0;
    _stats.questsCompleted = 0;
}

function getStats() {
    return {
        weaponsForged:    _stats.weaponsForged,
        weaponsSold:      _stats.weaponsSold,
        bestQuality:      _stats.bestQuality,
        totalGoldSpent:   _stats.totalGoldSpent,
        forgeSessions:    _stats.forgeSessions,
        questsCompleted:  _stats.questsCompleted,
    };
}

function destroy() {
    if (!_initialized) return;
    for (var i = 0; i < _handlers.length; i++) {
        _bus.off(_handlers[i][0], _handlers[i][1]);
    }
    _handlers = [];
    _initialized = false;
    _bus = null;
    resetStats();
}

// ============================================================
// PUBLIC API
// ============================================================

var RunStats = {
    init:      init,
    reset:     resetStats,
    getStats:  getStats,
    destroy:   destroy,
};

export default RunStats;