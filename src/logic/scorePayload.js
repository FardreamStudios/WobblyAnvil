// ============================================================
// scorePayload.js — Wobbly Anvil Score Payload Utility
// Encodes run stats into a base64 payload with a lightweight
// checksum for clipboard copy. Also decodes and verifies
// payloads for the director's verify workflow.
//
// ANTI-CHEAT: Casual deterrent only. The salt is in the
// source — anyone reading code can forge a payload. That's
// fine for a dev/test leaderboard.
//
// PAYLOAD SHAPE (before base64):
// {
//   v: "0.5.0",          // game version
//   ts: 1711234567890,   // timestamp (run ID)
//   name: "PlayerName",
//   day: 14,
//   gold: 2340,
//   totalGoldEarned: 8900,
//   weaponsForged: 23,
//   weaponsSold: 18,
//   bestQuality: 87,
//   reputation: 9,
//   level: 6,
//   forgeSessions: 45,
//   questsCompleted: 3,
//   cs: "a1b2c3d4"       // checksum
// }
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

var SALT = "wobbly_anvil_2026_dev";
var GAME_VERSION = "0.5.0";

// ============================================================
// Simple hash — djb2 variant. NOT cryptographic.
// ============================================================

function simpleHash(str) {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit int
    }
    // Convert to positive hex string
    return (hash >>> 0).toString(16);
}

// ============================================================
// ENCODE — Build payload from game state + run stats
// ============================================================

function encode(name, gameState, runStats) {
    var payload = {
        v:               GAME_VERSION,
        ts:              Date.now(),
        name:            name || "Anonymous",
        day:             gameState.day || 0,
        gold:            gameState.gold || 0,
        totalGoldEarned: gameState.totalGoldEarned || 0,
        weaponsForged:   runStats.weaponsForged || 0,
        weaponsSold:     runStats.weaponsSold || 0,
        bestQuality:     runStats.bestQuality || 0,
        reputation:      gameState.reputation || 0,
        level:           gameState.level || 0,
        forgeSessions:   runStats.forgeSessions || 0,
        questsCompleted: runStats.questsCompleted || 0,
    };

    // Build checksum from concatenated stat values + salt
    var checksumInput = [
        payload.day, payload.gold, payload.totalGoldEarned,
        payload.weaponsForged, payload.bestQuality,
        payload.reputation, payload.level, payload.ts,
        SALT
    ].join("|");

    payload.cs = simpleHash(checksumInput);

    // Base64 encode
    var json = JSON.stringify(payload);
    try {
        return btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
        console.error("[ScorePayload] Encode failed:", e);
        return null;
    }
}

// ============================================================
// DECODE — Parse base64 payload back to object
// ============================================================

function decode(base64String) {
    try {
        var json = decodeURIComponent(escape(atob(base64String)));
        return JSON.parse(json);
    } catch (e) {
        console.error("[ScorePayload] Decode failed:", e);
        return null;
    }
}

// ============================================================
// VERIFY — Check that a decoded payload's checksum is valid
// ============================================================

function verify(payload) {
    if (!payload || !payload.cs) return false;

    var checksumInput = [
        payload.day, payload.gold, payload.totalGoldEarned,
        payload.weaponsForged, payload.bestQuality,
        payload.reputation, payload.level, payload.ts,
        SALT
    ].join("|");

    var expected = simpleHash(checksumInput);
    return payload.cs === expected;
}

// ============================================================
// LEADERBOARD ENTRY — Convert decoded payload to leaderboard shape
// ============================================================

function toLeaderboardEntry(payload) {
    return {
        name:           payload.name || "Anonymous",
        day:            payload.day || 0,
        gold:           payload.totalGoldEarned || 0,
        weaponsForged:  payload.weaponsForged || 0,
        bestQuality:    payload.bestQuality || 0,
        reputation:     payload.reputation || 0,
        level:          payload.level || 0,
        version:        payload.v || "unknown",
        date:           new Date(payload.ts || Date.now()).toISOString().split("T")[0],
    };
}

// ============================================================
// PUBLIC API
// ============================================================

var ScorePayload = {
    encode:             encode,
    decode:             decode,
    verify:             verify,
    toLeaderboardEntry: toLeaderboardEntry,
    GAME_VERSION:       GAME_VERSION,
};

export default ScorePayload;