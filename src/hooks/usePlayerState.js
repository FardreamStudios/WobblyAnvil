// ============================================================
// usePlayerState.js — Wobbly Anvil Player State Hook
// Owns: reputation, level, xp, stat points, stats, upgrades,
//       unlocked blueprints.
// ============================================================

import { useState, useEffect } from "react";
import GameConstants from "../modules/constants.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

var STATS_DEF = GameConstants.STATS_DEF;
var DEFAULT_UPGRADES = { anvil: 0, hammer: 0, forge: 0, quench: 0, furnace: 0 };
var DEFAULT_BP = ["dagger", "shortsword", "axe"];

function usePlayerState() {
    var [reputation, setReputation] = useState(4);
    var [level, setLevel] = useState(1);
    var [xp, setXp] = useState(0);
    var [statPoints, setStatPoints] = useState(0);
    var [stats, setStats] = useState(Object.assign({}, STATS_DEF));
    var [upgrades, setUpgrades] = useState(Object.assign({}, DEFAULT_UPGRADES));
    var [unlockedBP, setUnlockedBP] = useState(DEFAULT_BP.slice());

    // --- Bus: Reset on New Game ---
    useEffect(function() {
        function onNewGame() {
            setReputation(4); setLevel(1); setXp(0); setStatPoints(0);
            setStats(Object.assign({}, STATS_DEF));
            setUpgrades(Object.assign({}, DEFAULT_UPGRADES));
            setUnlockedBP(DEFAULT_BP.slice());
        }
        GameplayEventBus.on(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
        return function() { GameplayEventBus.off(EVENT_TAGS.GAME_SESSION_NEW, onNewGame); };
    }, []);

    return {
        reputation: reputation,
        setReputation: setReputation,
        level: level,
        setLevel: setLevel,
        xp: xp,
        setXp: setXp,
        statPoints: statPoints,
        setStatPoints: setStatPoints,
        stats: stats,
        setStats: setStats,
        upgrades: upgrades,
        setUpgrades: setUpgrades,
        unlockedBP: unlockedBP,
        setUnlockedBP: setUnlockedBP,
    };
}

export default usePlayerState;