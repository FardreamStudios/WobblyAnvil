// ============================================================
// useEconomyVM.js — Wobbly Anvil Economy ViewModel Hook
// Owns: earnGold, spendGold, popGold, removeGoldPop,
//       handleSell, handleRefuse.
// Consumes: useEconomyState + cross-domain deps passed in.
// Returns: Action handlers for gold flow and selling.
// ============================================================

import GameUtils from "../modules/utilities.js";

var getSmithRank = GameUtils.getSmithRank;

function useEconomyVM(deps) {
    // --- Unpack dependencies from App.js ---
    var economy = deps.economy;
    var quest = deps.quest;
    var sfx = deps.sfx;
    var addToast = deps.addToast;
    var trySpawnCustomer = deps.trySpawnCustomer;
    var hour = deps.hour;

    // --- Economy state ---
    var setGold = economy.setGold;
    var setTotalGoldEarned = economy.setTotalGoldEarned;
    var setGoldPops = economy.setGoldPops;
    var setFinished = economy.setFinished;

    // --- Quest state ---
    var setActiveCustomer = quest.setActiveCustomer;
    var setHasSoldWeapon = quest.setHasSoldWeapon;

    // --- Gold Pop Helpers ---
    function popGold(amount) {
        setGoldPops(function(p) { return p.concat([{ id: Date.now() + Math.random(), amount: amount }]); });
    }

    function removeGoldPop(id) {
        setGoldPops(function(p) { return p.filter(function(x) { return x.id !== id; }); });
    }

    // --- Gold Flow ---
    function earnGold(amount) {
        if (amount === 0) return;
        popGold(amount); sfx.coin();
        setGold(function(g) { return g + amount; });
        setTotalGoldEarned(function(t) {
            var nt = t + amount, or = getSmithRank(t), nr = getSmithRank(nt);
            if (nr.name !== or.name) { sfx.levelup(); setTimeout(function() { addToast("RANK UP!\n" + nr.name, "", "#fbbf24"); }, 100); }
            return nt;
        });
    }

    function spendGold(amount) {
        if (amount === 0) return;
        popGold(-amount); sfx.coinLoss();
        setGold(function(g) { return g - amount; });
    }

    // --- Sell / Refuse ---
    function handleSell(price, weaponId) {
        earnGold(price);
        setFinished(function(f) { var nf = f.filter(function(w) { return w.id !== weaponId; }); setTimeout(function() { trySpawnCustomer(hour, nf); }, 500); return nf; });
        setHasSoldWeapon(true); setActiveCustomer(null);
        setTimeout(function() { addToast("SOLD!\n+" + price + "g", "", "#4ade80"); sfx.toast(); }, 100);
    }

    function handleRefuse() { setActiveCustomer(null); }

    return {
        earnGold: earnGold,
        spendGold: spendGold,
        popGold: popGold,
        removeGoldPop: removeGoldPop,
        handleSell: handleSell,
        handleRefuse: handleRefuse,
    };
}

export default useEconomyVM;