// ============================================================
// useLeaderboard.js — Wobbly Anvil Leaderboard Hook
// Fetches leaderboard.json on mount, merges with FAKE_SMITHS
// when the real leaderboard has fewer than 10 entries.
// Exposes copyScore() for the game over screen.
//
// OWNS:
//   Leaderboard data (fetched + fake-filled)
//   Copy-to-clipboard action (base64 score payload)
//
// DOES NOT OWN:
//   Run stats (RunStats singleton owns those)
//   Game state (state hooks own those)
//
// USAGE:
//   var lb = useLeaderboard();
//   lb.entries       // sorted array of { name, gold, ... }
//   lb.copyScore(name, gameState, runStats)  // → clipboard
//   lb.copied        // true after successful copy
//   lb.loading       // true while fetching
// ============================================================

import { useState, useEffect, useCallback } from "react";
import GameConstants from "../modules/constants.js";
import ScorePayload from "../logic/scorePayload.js";

var FAKE_SMITHS = GameConstants.FAKE_SMITHS;
var LEADERBOARD_URL = "./data/leaderboard.json";
var TARGET_ENTRIES = 10;

function useLeaderboard() {
    var [realEntries, setRealEntries] = useState([]);
    var [loading, setLoading] = useState(true);
    var [copied, setCopied] = useState(false);

    // --- Fetch leaderboard on mount ---
    useEffect(function() {
        var cancelled = false;
        fetch(LEADERBOARD_URL)
            .then(function(res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function(data) {
                if (!cancelled && Array.isArray(data)) {
                    setRealEntries(data);
                }
            })
            .catch(function(err) {
                console.warn("[Leaderboard] Fetch failed, using fake entries:", err.message);
            })
            .finally(function() {
                if (!cancelled) setLoading(false);
            });
        return function() { cancelled = true; };
    }, []);

    // --- Build merged + sorted entries ---
    // Real entries take priority. Fill remaining slots with fakes.
    var entries = (function() {
        // Normalize real entries to the display shape
        var real = realEntries.map(function(e) {
            return {
                name:          e.name || "Anonymous",
                gold:          e.gold || 0,
                day:           e.day || 0,
                weaponsForged: e.weaponsForged || 0,
                bestQuality:   e.bestQuality || 0,
                reputation:    e.reputation || 0,
                level:         e.level || 0,
                isReal:        true,
            };
        });

        // Sort real entries by gold descending
        real.sort(function(a, b) { return b.gold - a.gold; });

        // If we have fewer than TARGET_ENTRIES real entries, fill with fakes
        var fakeCount = Math.max(0, TARGET_ENTRIES - real.length);
        var fakes = [];
        if (fakeCount > 0) {
            // Pick fakes that don't collide with real entry gold values
            var usedGolds = {};
            for (var i = 0; i < real.length; i++) {
                usedGolds[real[i].gold] = true;
            }
            for (var j = 0; j < FAKE_SMITHS.length && fakes.length < fakeCount; j++) {
                if (!usedGolds[FAKE_SMITHS[j].gold]) {
                    fakes.push({
                        name:   FAKE_SMITHS[j].name,
                        gold:   FAKE_SMITHS[j].gold,
                        isFake: true,
                    });
                }
            }
        }

        // Merge and sort
        var merged = real.concat(fakes);
        merged.sort(function(a, b) { return b.gold - a.gold; });
        return merged;
    })();

    // --- Copy score to clipboard ---
    var copyScore = useCallback(function(name, gameState, runStats) {
        var payload = ScorePayload.encode(name, gameState, runStats);
        if (!payload) {
            console.error("[Leaderboard] Failed to encode score payload");
            return false;
        }

        // Use clipboard API with fallback
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(payload).then(function() {
                setCopied(true);
                setTimeout(function() { setCopied(false); }, 3000);
            }).catch(function() {
                fallbackCopy(payload);
            });
        } else {
            fallbackCopy(payload);
        }
        return true;
    }, []);

    function fallbackCopy(text) {
        try {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(function() { setCopied(false); }, 3000);
        } catch (e) {
            console.error("[Leaderboard] Fallback copy failed:", e);
        }
    }

    return {
        entries:   entries,
        loading:   loading,
        copied:    copied,
        copyScore: copyScore,
    };
}

export default useLeaderboard;