// ============================================================
// usePlayerVM.js — Wobbly Anvil Player ViewModel Hook
// Owns: XP gain/loss, level-up logic, stat allocation,
//       reputation changes, and derived display values
//       (xpNeeded, smithRank, nextRank).
// Bus: subscribes to player.change.reputation, player.gain.xp,
//      player.lose.xp.
// Consumes: usePlayerState + cross-domain deps passed in.
// Returns: Action handlers + display-ready props.
// ============================================================

import { useRef, useCallback, useEffect } from "react";
import GameUtils from "../modules/utilities.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

// --- Utilities ---
var xpForLevel = GameUtils.xpForLevel;
var getSmithRank = GameUtils.getSmithRank;
var getNextRank = GameUtils.getNextRank;

// ============================================================
// Hook
// ============================================================

function usePlayerVM(deps) {
    // --- Unpack dependencies from App.js ---
    var player = deps.player;
    var sfx = deps.sfx;
    var setStamina = deps.setStamina;
    var setGameOver = deps.setGameOver;
    var gameOver = deps.gameOver;

    // --- Player state (from usePlayerState) ---
    var level = player.level, setLevel = player.setLevel;
    var xp = player.xp, setXp = player.setXp;
    var statPoints = player.statPoints, setStatPoints = player.setStatPoints;
    var stats = player.stats, setStats = player.setStats;

    // --- Refs ---
    var levelRef = useRef(level);
    levelRef.current = level;

    // --- Stat Cost ---
    function statCost(currentLevel) { return currentLevel < 3 ? 1 : currentLevel < 6 ? 2 : 3; }

    // --- Stat Allocation ---
    function allocateStat(k) {
        var cost = statCost(stats[k]); if (statPoints < cost) return;
        setStats(function(s) { var n = Object.assign({}, s); n[k] = s[k] + 1; return n; });
        setStatPoints(function(p) { return p - cost; });
        if (k === "brawn") setStamina(function(s) { return s + 1; });
    }

    // --- XP ---
    var gainXp = useCallback(function(amount) {
        setXp(function(prev) {
            return prev + amount;
        });
    }, []);

    useEffect(function() {
        var cur = xp, lv = level, pts = 0;
        while (cur >= xpForLevel(lv)) { cur -= xpForLevel(lv); lv++; pts++; }
        if (pts > 0) { setXp(cur); setLevel(lv); setStatPoints(function(p) { return p + pts; }); sfx.levelup(); }
    }, [xp]);

    function loseXp(amount) { setXp(function(prev) { return Math.max(0, prev - amount); }); }

    // --- Reputation ---
    var changeRep = useCallback(function(delta, delay) {
        if (gameOver) return;
        player.setReputation(function(r) {
            var nr = Math.max(0, Math.min(10, r + delta));
            if (nr <= 0) { setTimeout(function() { sfx.gameover(); setTimeout(function() { setGameOver(true); }, 2600); }, (delay || 0)); }
            return nr;
        });
    }, [sfx, gameOver]);

    // --- Derived Display Values ---
    var xpNeeded = xpForLevel(level);

    // --- Bus: Player Subscriptions ---
    var busChangeRep = useCallback(function(payload) {
        changeRep(payload.delta, payload.delay);
    }, [changeRep]);

    var busGainXp = useCallback(function(payload) {
        if (payload.percent) {
            setXp(function(prev) { return prev + Math.round(prev * payload.percent); });
        } else if (payload.amount) {
            gainXp(payload.amount);
        }
    }, [gainXp]);

    var busLoseXp = useCallback(function(payload) {
        if (payload.percent) {
            setXp(function(prev) { return Math.max(0, prev - Math.round(prev * payload.percent)); });
        } else if (payload.amount) {
            loseXp(payload.amount);
        }
    }, []);

    useEffect(function() {
        GameplayEventBus.on(EVENT_TAGS.PLAYER_CHANGE_REP, busChangeRep);
        GameplayEventBus.on(EVENT_TAGS.PLAYER_GAIN_XP, busGainXp);
        GameplayEventBus.on(EVENT_TAGS.PLAYER_LOSE_XP, busLoseXp);
        return function() {
            GameplayEventBus.off(EVENT_TAGS.PLAYER_CHANGE_REP, busChangeRep);
            GameplayEventBus.off(EVENT_TAGS.PLAYER_GAIN_XP, busGainXp);
            GameplayEventBus.off(EVENT_TAGS.PLAYER_LOSE_XP, busLoseXp);
        };
    }, [busChangeRep, busGainXp, busLoseXp]);

    // ============================================================
    // Return — actions + display props
    // ============================================================

    return {
        // --- Actions ---
        allocateStat: allocateStat,
        statCost: statCost,
        gainXp: gainXp,
        loseXp: loseXp,
        changeRep: changeRep,

        // --- Display Props ---
        xpNeeded: xpNeeded,
    };
}

export default usePlayerVM;