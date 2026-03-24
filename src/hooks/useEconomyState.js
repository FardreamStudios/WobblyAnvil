// ============================================================
// useEconomyState.js — Wobbly Anvil Economy State Hook
// Owns: gold, inventory, finished weapons, market modifiers.
// Customer tracking (visits, caps, guaranteed) moved to CustomerManager.
// ============================================================

import { useState, useEffect } from "react";
import GameConstants from "../modules/constants.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

var STARTING_GOLD = GameConstants.STARTING_GOLD;

var DEFAULT_INV = { bronze: 10, iron: 4, steel: 0, damascus: 0, titanium: 0, iridium: 0, tungsten: 0, mithril: 0, orichalcum: 0 };

function useEconomyState() {
    // --- Core Economy ---
    var [gold, setGold] = useState(STARTING_GOLD);
    var [totalGoldEarned, setTotalGoldEarned] = useState(0);
    var [goldPops, setGoldPops] = useState([]);
    var [inv, setInv] = useState({ bronze: 10, iron: 4, steel: 0, damascus: 0, titanium: 0, iridium: 0, tungsten: 0, mithril: 0, orichalcum: 0 });
    var [finished, setFinished] = useState([]);

    // --- Market Modifiers ---
    var [priceBonus, setPriceBonus] = useState(1.0);
    var [priceDebuff, setPriceDebuff] = useState(1.0);
    var [matDiscount, setMatDiscount] = useState(null);
    var [globalMatMult, setGlobalMatMult] = useState(1.0);


    // --- Bus: Reset on New Game ---
    useEffect(function() {
        function onNewGame() {
            setGold(STARTING_GOLD); setTotalGoldEarned(0); setGoldPops([]);
            setInv(Object.assign({}, DEFAULT_INV)); setFinished([]);
            setPriceBonus(1.0); setPriceDebuff(1.0); setMatDiscount(null); setGlobalMatMult(1.0);

        }
        GameplayEventBus.on(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
        return function() { GameplayEventBus.off(EVENT_TAGS.GAME_SESSION_NEW, onNewGame); };
    }, []);

    return {
        // Core Economy
        gold: gold,
        setGold: setGold,
        totalGoldEarned: totalGoldEarned,
        setTotalGoldEarned: setTotalGoldEarned,
        goldPops: goldPops,
        setGoldPops: setGoldPops,
        inv: inv,
        setInv: setInv,
        finished: finished,
        setFinished: setFinished,

        // Market Modifiers
        priceBonus: priceBonus,
        setPriceBonus: setPriceBonus,
        priceDebuff: priceDebuff,
        setPriceDebuff: setPriceDebuff,
        matDiscount: matDiscount,
        setMatDiscount: setMatDiscount,
        globalMatMult: globalMatMult,
        setGlobalMatMult: setGlobalMatMult,

    };
}

export default useEconomyState;