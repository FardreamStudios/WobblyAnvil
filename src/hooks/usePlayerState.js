// ============================================================
// usePlayerState.js — Wobbly Anvil Player State Hook
// Owns: reputation, level, xp, stat points, stats, upgrades,
//       unlocked blueprints.
// ============================================================

import { useState } from "react";
import GameConstants from "../modules/constants.js";

var STATS_DEF = GameConstants.STATS_DEF;

function usePlayerState() {
    var [reputation, setReputation] = useState(4);
    var [level, setLevel] = useState(1);
    var [xp, setXp] = useState(0);
    var [statPoints, setStatPoints] = useState(0);
    var [stats, setStats] = useState(Object.assign({}, STATS_DEF));
    var [upgrades, setUpgrades] = useState({ anvil: 0, hammer: 0, forge: 0, quench: 0, furnace: 0 });
    var [unlockedBP, setUnlockedBP] = useState(["dagger", "shortsword", "axe"]);

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