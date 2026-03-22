// ============================================================
// useShopVM.js — Wobbly Anvil Shop ViewModel Hook
// Owns: onBuy (materials), onUpgrade (equipment), onBuyBP
//       (blueprints), onSellMaterial (material selling).
// Consumes: useEconomyState (inv, setInv), usePlayerState
//           (upgrades, setUpgrades, unlockedBP, setUnlockedBP),
//           useEconomyVM (earnGold, spendGold), sfx.
// Returns: Action handlers for all shop transactions.
// ============================================================

import GameConstants from "../modules/constants.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

var MATS = GameConstants.MATS;
var UPGRADES = GameConstants.UPGRADES;

function useShopVM(deps) {
    // --- Unpack dependencies from App.js ---
    var economy = deps.economy;
    var player = deps.player;
    var sfx = deps.sfx;
    var earnGold = deps.earnGold;
    var spendGold = deps.spendGold;

    // --- State accessors ---
    var gold = economy.gold;
    var setInv = economy.setInv;
    var upgrades = player.upgrades;
    var setUpgrades = player.setUpgrades;
    var setUnlockedBP = player.setUnlockedBP;

    // --- Buy Materials ---
    // mat: material key, qty: number, price: unit price (already adjusted for discounts)
    function onBuy(mat, qty, price) {
        sfx.click();
        var cost = price * qty;
        if (gold < cost) return;
        GameplayEventBus.emit(EVENT_TAGS.FX_COIN_EARN, {});
        spendGold(cost);
        setInv(function(i) {
            var n = Object.assign({}, i);
            n[mat] = (n[mat] || 0) + qty;
            return n;
        });
    }

    // --- Buy Equipment Upgrade ---
    // cat: upgrade category key (forge, anvil, hammer, quench, furnace)
    function onUpgrade(cat) {
        sfx.click();
        var nextLevel = upgrades[cat] + 1;
        var upgradeData = UPGRADES[cat][nextLevel];
        if (!upgradeData || gold < upgradeData.cost) return;
        spendGold(upgradeData.cost);
        setUpgrades(function(u) {
            var n = Object.assign({}, u);
            n[cat] = nextLevel;
            return n;
        });
    }

    // --- Buy Blueprint ---
    // key: weapon key, cost: blueprint price
    function onBuyBP(key, cost) {
        sfx.click();
        if (gold < cost) return;
        spendGold(cost);
        setUnlockedBP(function(u) { return u.concat([key]); });
    }

    // --- Sell Material ---
    // mat: material key, qty: number to sell
    function onSellMaterial(mat, qty) {
        GameplayEventBus.emit(EVENT_TAGS.FX_COIN_EARN, {});
        var price = Math.floor(MATS[mat].price / 2) * qty;
        setInv(function(i) {
            var n = Object.assign({}, i);
            n[mat] = Math.max(0, (n[mat] || 0) - qty);
            return n;
        });
        earnGold(price);
    }

    return {
        onBuy: onBuy,
        onUpgrade: onUpgrade,
        onBuyBP: onBuyBP,
        onSellMaterial: onSellMaterial,
    };
}

export default useShopVM;