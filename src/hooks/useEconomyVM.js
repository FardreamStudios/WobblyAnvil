// ============================================================
// useEconomyVM.js — Wobbly Anvil Economy ViewModel Hook
// Owns: earnGold, spendGold, popGold, removeGoldPop,
//       handleSell, handleRefuse.
// Bus: subscribes to economy.earn.gold, economy.spend.gold,
//      economy.set.inventory, economy.add.material.
// Consumes: useEconomyState + cross-domain deps passed in.
// Returns: Action handlers for gold flow and selling.
//
// MODIFIER CONSUMER: goldEarned
//   earnGold resolves "goldEarned" through AbilityManager
//   before applying to state. Momentum ability stacks
//   multiply modifiers on this attribute.
// ============================================================

import { useEffect, useCallback } from "react";
import GameUtils from "../modules/utilities.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";
import AbilityManager from "../systems/ability/abilitySubSystem.js";

var getSmithRank = GameUtils.getSmithRank;

function useEconomyVM(deps) {
    // --- Unpack dependencies from App.js ---
    var economy = deps.economy;
    var quest = deps.quest;
    var sfx = deps.sfx;
    var addToast = deps.addToast;

    // --- Economy state ---
    var setGold = economy.setGold;
    var setTotalGoldEarned = economy.setTotalGoldEarned;
    var setGoldPops = economy.setGoldPops;

    // --- Quest state ---
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
        var resolved = Math.round(AbilityManager.resolveValue("goldEarned", amount));
        popGold(resolved); GameplayEventBus.emit(EVENT_TAGS.FX_COIN_EARN, {});
        setGold(function(g) { return g + resolved; });
        setTotalGoldEarned(function(t) {
            var nt = t + resolved, or = getSmithRank(t), nr = getSmithRank(nt);
            if (nr.name !== or.name) { GameplayEventBus.emit(EVENT_TAGS.FX_LEVEL_UP, {}); setTimeout(function() { addToast("RANK UP!\n" + nr.name, "", "#fbbf24"); }, 100); }
            return nt;
        });
    }

    function spendGold(amount) {
        if (amount === 0) return;
        popGold(-amount); GameplayEventBus.emit(EVENT_TAGS.FX_COIN_LOSS, {});
        setGold(function(g) { return g - amount; });
    }

    // --- Sell / Refuse ---
    // CustomerManager listens to ECONOMY_WEAPON_SOLD and emits
    // CUSTOMER_CLEAR + re-spawn attempt. No direct state calls needed.
    function handleSell(price, weaponId) {
        earnGold(price);
        GameplayEventBus.emit(EVENT_TAGS.ECONOMY_WEAPON_SOLD, { price: price, weaponId: weaponId });
        GameplayEventBus.emit(EVENT_TAGS.ECONOMY_SET_INVENTORY, { removeWeaponId: weaponId });
        setHasSoldWeapon(true);
        setTimeout(function() { addToast("SOLD!\n+" + price + "g", "", "#4ade80"); GameplayEventBus.emit(EVENT_TAGS.FX_TOAST, {}); }, 100);
    }

    function handleRefuse() {
        GameplayEventBus.emit(EVENT_TAGS.CUSTOMER_REFUSE, {});
    }

    // --- Bus: Economy Subscriptions ---
    // Note: applyEventResult overloads ECONOMY_EARN_GOLD with modifier
    // fields (priceBonus, guaranteedCustomers, extraCustomers) and
    // ECONOMY_SPEND_GOLD with priceDebuff. Handlers check for these.
    var busEarnGold = useCallback(function(payload) {
        if (payload.amount) earnGold(payload.amount);
        if (payload.priceBonus) economy.setPriceBonus(payload.priceBonus);
        // guaranteedCustomers + extraCustomers now handled by CustomerManager via bus
    }, []);

    var busSpendGold = useCallback(function(payload) {
        if (payload.amount) spendGold(payload.amount);
        if (payload.priceDebuff) economy.setPriceDebuff(payload.priceDebuff);
    }, []);

    var busSetInventory = useCallback(function(payload) {
        if (payload.inv !== undefined) economy.setInv(payload.inv);
        if (payload.finished !== undefined) economy.setFinished(payload.finished);
        if (payload.removeWeaponId) economy.setFinished(function(f) { return f.filter(function(w) { return w.id !== payload.removeWeaponId; }); });
        if (payload.addFinished) economy.setFinished(function(f) { return f.concat([payload.addFinished]); });
    }, []);

    var busAddMaterial = useCallback(function(payload) {
        if (payload.key && payload.qty) {
            economy.setInv(function(i) {
                var n = Object.assign({}, i);
                n[payload.key] = (n[payload.key] || 0) + payload.qty;
                return n;
            });
        }
        if (payload.matDiscount) economy.setMatDiscount(payload.matDiscount);
        if (payload.globalMatMult) economy.setGlobalMatMult(payload.globalMatMult);
    }, []);

    useEffect(function() {
        GameplayEventBus.on(EVENT_TAGS.ECONOMY_EARN_GOLD, busEarnGold);
        GameplayEventBus.on(EVENT_TAGS.ECONOMY_SPEND_GOLD, busSpendGold);
        GameplayEventBus.on(EVENT_TAGS.ECONOMY_SET_INVENTORY, busSetInventory);
        GameplayEventBus.on(EVENT_TAGS.ECONOMY_ADD_MATERIAL, busAddMaterial);
        return function() {
            GameplayEventBus.off(EVENT_TAGS.ECONOMY_EARN_GOLD, busEarnGold);
            GameplayEventBus.off(EVENT_TAGS.ECONOMY_SPEND_GOLD, busSpendGold);
            GameplayEventBus.off(EVENT_TAGS.ECONOMY_SET_INVENTORY, busSetInventory);
            GameplayEventBus.off(EVENT_TAGS.ECONOMY_ADD_MATERIAL, busAddMaterial);
        };
    }, []);

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