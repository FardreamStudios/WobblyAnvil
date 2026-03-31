// ============================================================
// fairyDigest.js — Fairy Event Diary
//
// Rolling plain-English log of recent gameplay events.
// Sent alongside game state in every LLM call so the fairy
// knows the STORY, not just the scoreboard.
//
// Bus-driven: subscribes to key gameplay tags, writes short
// sentences into a ring buffer. Controller/ChatSystem call
// getDigest() before each API request.
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import EVENT_TAGS from "../config/eventTags.js";

// ============================================================
// CONSTANTS
// ============================================================

var MAX_ENTRIES = 10;

// ============================================================
// INTERNAL STATE
// ============================================================

var _initialized = false;
var _bus = null;
var _stateProvider = null;
var _entries = [];           // ring buffer of { text, ts }
var _busHandlers = [];

// Streak tracking (local to digest, not duplicating controller)
var _shatterStreak = 0;
var _goodWeaponStreak = 0;

// ============================================================
// HELPERS
// ============================================================

function _push(text) {
    _entries.push({ text: text, ts: Date.now() });
    if (_entries.length > MAX_ENTRIES) {
        _entries.shift();
    }
}

function _ago(ts) {
    var sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return "just now";
    var min = Math.floor(sec / 60);
    if (min === 1) return "1 min ago";
    return min + " min ago";
}

// ============================================================
// EVENT HANDLERS
// Each writes one short plain-English sentence.
// ============================================================

function _onShatter(payload) {
    _shatterStreak++;
    _goodWeaponStreak = 0;
    var mat = (payload && payload.materialName) || "a weapon";
    if (_shatterStreak >= 3) {
        _push("shattered " + mat + " (" + _shatterStreak + " in a row — bad streak)");
    } else if (_shatterStreak === 2) {
        _push("shattered " + mat + " (2nd in a row)");
    } else {
        _push("shattered " + mat);
    }
}

function _onForgeComplete(payload) {
    var q = (payload && payload.quality) || 0;
    var name = (payload && payload.weaponName) || "weapon";
    var mat = (payload && payload.materialName) || "";
    var desc = mat ? mat + " " + name : name;

    if (q >= 85) {
        _goodWeaponStreak++;
        var suffix = _goodWeaponStreak >= 2 ? " (" + _goodWeaponStreak + " great in a row)" : "";
        if (_shatterStreak >= 2) {
            _push("forged masterwork " + desc + " (q:" + q + ") after " + _shatterStreak + " shatters — comeback");
        } else {
            _push("forged masterwork " + desc + " (q:" + q + ")" + suffix);
        }
    } else if (q >= 65) {
        _goodWeaponStreak++;
        _push("forged good " + desc + " (q:" + q + ")");
    } else if (q >= 40) {
        _goodWeaponStreak = 0;
        _push("forged mediocre " + desc + " (q:" + q + ")");
    } else {
        _goodWeaponStreak = 0;
        _push("forged poor " + desc + " (q:" + q + ")");
    }
    _shatterStreak = 0;
}

function _onWeaponSold(payload) {
    var ratio = payload && payload.saleRatio;
    var gold = payload && payload.goldEarned;
    var name = (payload && payload.weaponName) || "weapon";

    if (ratio != null && gold != null) {
        if (ratio >= 1.3) {
            _push("sold " + name + " for " + gold + "g (great deal, " + Math.round(ratio * 100) + "% of value)");
        } else if (ratio >= 1.0) {
            _push("sold " + name + " for " + gold + "g (fair price)");
        } else if (ratio >= 0.7) {
            _push("sold " + name + " for " + gold + "g (undervalued)");
        } else {
            _push("sold " + name + " for " + gold + "g (ripped off)");
        }
    } else if (gold != null) {
        _push("sold " + name + " for " + gold + "g");
    } else {
        _push("sold a weapon");
    }
}

function _onCustomerSpawn(payload) {
    var type = (payload && payload.type) || "unknown";
    var name = (payload && payload.name) || "a customer";
    _push(name + " arrived (" + type + ")");
}

function _onCustomerWalkout() {
    _push("customer left — no sale");
}

function _onQuestFailed(payload) {
    var desc = (payload && payload.description) || "a decree";
    _push("FAILED decree: " + desc);
}

function _onQuenchSuccess() {
    _push("perfect quench");
}

function _onQuenchFail() {
    _push("quench destroyed the weapon");
    _shatterStreak++;
}

function _onDayReady(payload) {
    var day = (payload && payload.day) || "?";
    var state = _stateProvider ? _stateProvider() : {};
    var gold = state.gold != null ? state.gold : "?";
    var rep = state.rep != null ? state.rep : "?";
    _push("day " + day + " started (gold:" + gold + ", rep:" + rep + ")");
    // Reset streaks on new day
    _shatterStreak = 0;
    _goodWeaponStreak = 0;
}

function _onMorningEvent(payload) {
    var id = payload && payload.id;
    if (id) {
        _push("morning event: " + id);
    }
}

function _onRoyalDecree(payload) {
    _push("completed a royal decree");
}

function _onDecreeIssued(payload) {
    var desc = (payload && payload.description) || "new decree";
    var days = (payload && payload.daysLeft) || "?";
    _push("new decree: " + desc + " (" + days + " days to complete)");
}

// ============================================================
// BUS WIRING
// ============================================================

function _subscribe(tag, handler) {
    if (!_bus) return;
    _bus.on(tag, handler);
    _busHandlers.push({ tag: tag, handler: handler });
}

function _startWatching() {
    _subscribe(EVENT_TAGS.FX_SHATTER,              _onShatter);
    _subscribe(EVENT_TAGS.FORGE_SESSION_COMPLETE,   _onForgeComplete);
    _subscribe(EVENT_TAGS.ECONOMY_WEAPON_SOLD,      _onWeaponSold);
    _subscribe(EVENT_TAGS.CUSTOMER_SPAWN,           _onCustomerSpawn);
    _subscribe(EVENT_TAGS.CUSTOMER_WALKOUT,         _onCustomerWalkout);
    _subscribe(EVENT_TAGS.QUEST_FAILED,             _onQuestFailed);
    _subscribe(EVENT_TAGS.FX_QUENCH_SUCCESS,        _onQuenchSuccess);
    _subscribe(EVENT_TAGS.FX_QUENCH_FAIL,           _onQuenchFail);
    _subscribe(EVENT_TAGS.DAY_READY,                _onDayReady);
    _subscribe(EVENT_TAGS.DAY_MORNING_EVENT_DISPLAY, _onMorningEvent);
    _subscribe(EVENT_TAGS.FX_ROYAL_DECREE,          _onRoyalDecree);
}

function _stopWatching() {
    if (!_bus) return;
    for (var i = 0; i < _busHandlers.length; i++) {
        _bus.off(_busHandlers[i].tag, _busHandlers[i].handler);
    }
    _busHandlers = [];
}

// ============================================================
// LIFECYCLE
// ============================================================

function init(config) {
    if (_initialized) {
        console.warn("[FairyDigest] Already initialized.");
        return;
    }
    _bus = config.bus || null;
    _stateProvider = config.stateProvider || null;
    _initialized = true;
    _startWatching();
}

function destroy() {
    _stopWatching();
    _bus = null;
    _stateProvider = null;
    _entries = [];
    _busHandlers = [];
    _shatterStreak = 0;
    _goodWeaponStreak = 0;
    _initialized = false;
}

function reset() {
    _entries = [];
    _shatterStreak = 0;
    _goodWeaponStreak = 0;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Get the digest as a single string for LLM context.
 * Returns empty string if no events yet.
 * Format: "recent events (newest last): ..."
 */
function getDigest() {
    if (_entries.length === 0) return "";
    var lines = [];
    for (var i = 0; i < _entries.length; i++) {
        lines.push("- " + _entries[i].text);
    }
    return "recent events (newest last):\n" + lines.join("\n");
}

/**
 * Get entry count (for debug/testing).
 */
function getCount() {
    return _entries.length;
}

var FairyDigest = {
    init:      init,
    destroy:   destroy,
    reset:     reset,
    getDigest: getDigest,
    getCount:  getCount,
};

export default FairyDigest;