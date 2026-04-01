// ============================================================
// questLogic.js — Wobbly Anvil Royal Quest Generator
// Pure function — no React, no state, no side effects.
// Extracted from events.js (legacy) during M-10 cleanup.
//
// UE ANALOGY: Quest generation function library.
// ============================================================

import GameConstants from "../modules/constants.js";
import GameUtils from "../modules/utilities.js";

var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var TIERS = GameConstants.TIERS;
var ROYAL_NAMES = GameConstants.ROYAL_NAMES;
var PRESSURE_PER_DAY = GameConstants.PRESSURE_PER_DAY;
var MAX_PRESSURE = GameConstants.MAX_PRESSURE;
var PRESSURE_SPIKE_CHANCE = GameConstants.PRESSURE_SPIKE_CHANCE;
var PRESSURE_SPIKE_MAX = GameConstants.PRESSURE_SPIKE_MAX;

var rand = GameUtils.rand;
var randInt = GameUtils.randInt;
var clamp = GameUtils.clamp;
var qualityValue = GameUtils.qualityValue;

// ============================================================
// generateRoyalQuest — Builds a royal quest definition
// Pressure-scaled difficulty, material, quality, and quantity.
// ============================================================

function generateRoyalQuest(questNumber, unlockedBlueprints, currentDay, reputation) {
    currentDay = currentDay || 1;
    reputation = reputation || 4;
    var blueprints = unlockedBlueprints || ["dagger", "shortsword", "axe"];
    var noUpgrades = { anvil: 0, hammer: 0, forge: 0, quench: 0, furnace: 0 };

    // Day 1: simple tier-1 quest
    if (currentDay === 1) {
        var tier1 = Object.entries(WEAPONS).filter(function(e) { return e[1].tier === 1 && blueprints.includes(e[0]); });
        if (!tier1.length) tier1 = Object.entries(WEAPONS).filter(function(e) { return e[1].tier === 1; });
        var pick = tier1[Math.floor(Math.random() * tier1.length)];
        var commonTier = TIERS.find(function(t) { return t.label === "Common"; });
        return {
            id: Date.now(), num: questNumber,
            name: ROYAL_NAMES[questNumber % ROYAL_NAMES.length],
            weaponKey: pick[0], weaponName: pick[1].name,
            minQuality: commonTier.scoreMin, minQualityLabel: commonTier.label,
            materialRequired: "bronze",
            reward: qualityValue(pick[0], "bronze", commonTier.scoreMin, noUpgrades),
            reputationGain: commonTier.reputationReward, reputationLoss: commonTier.reputationPenalty,
            deadline: currentDay + 1, fulfilled: false, fulfilledQty: 0, qty: 1, blueprintLocked: false,
        };
    }

    // Pressure scaling
    var spike = Math.random() < PRESSURE_SPIKE_CHANCE ? rand(1, PRESSURE_SPIKE_MAX) : 0;
    var pressure = clamp(currentDay * PRESSURE_PER_DAY + spike + rand(-0.5, 0.5), 0, MAX_PRESSURE);
    var normalizedPressure = clamp(pressure / MAX_PRESSURE, 0, 1);
    var curvedPressure = Math.sqrt(normalizedPressure);

    // Material selection
    var matKeys = Object.keys(MATS);
    var matIndex = clamp(Math.floor(curvedPressure * matKeys.length + rand(-2, 1.5)), 0, matKeys.length - 1);
    var materialRequired = matKeys[matIndex];

    // Difficulty targeting
    var targetDifficulty = clamp(Math.round(curvedPressure * 8 + rand(-1.5, 1)) + 1, 1, 9);
    targetDifficulty = Math.min(targetDifficulty, Math.floor(currentDay / 2) + 2);
    var repDiffBonus = reputation >= 9 ? 2 : reputation >= 7 ? 1 : reputation >= 5 ? (Math.random() < 0.5 ? 1 : 0) : 0;
    var repQualityBonus = reputation >= 9 ? 1 : reputation >= 7 ? (Math.random() < 0.5 ? 1 : 0) : 0;
    targetDifficulty = clamp(targetDifficulty + repDiffBonus, 1, 9);

    // Weapon selection
    var eligible = Object.entries(WEAPONS).filter(function(e) { return Math.abs(e[1].difficulty - targetDifficulty) <= 1; });
    if (!eligible.length) {
        eligible = Object.entries(WEAPONS).sort(function(a, b) {
            return Math.abs(a[1].difficulty - targetDifficulty) - Math.abs(b[1].difficulty - targetDifficulty);
        }).slice(0, 3);
    }
    var weaponPick = eligible[Math.floor(Math.random() * eligible.length)];
    var weaponKey = weaponPick[0];
    var weapon = weaponPick[1];

    // Quality tier selection
    var questTiers = TIERS.filter(function(t) { return t.scoreMin > 0; });
    var commonIndex = questTiers.findIndex(function(t) { return t.label === "Common"; });
    var qualityIndex = clamp(Math.floor(curvedPressure * questTiers.length + rand(-2, 1)) + repQualityBonus, commonIndex, questTiers.length - 1);
    var questTier = questTiers[qualityIndex];

    // Quantity scaling
    var qtyRoll = Math.random();
    var qty = currentDay >= 16 ? (qtyRoll < 0.4 ? 1 : qtyRoll < 0.8 ? 2 : 3) :
        currentDay >= 9  ? (qtyRoll < 0.7 ? 1 : 2) : 1;

    var reward = qualityValue(weaponKey, materialRequired, questTier.scoreMin, noUpgrades);

    return {
        id: Date.now(), num: questNumber,
        name: ROYAL_NAMES[questNumber % ROYAL_NAMES.length],
        weaponKey: weaponKey, weaponName: weapon.name,
        minQuality: questTier.scoreMin, minQualityLabel: questTier.label,
        materialRequired: materialRequired,
        reward: Math.round(reward * rand(0.7, 0.9)),
        reputationGain: questTier.reputationReward,
        reputationLoss: qty > 1 ? questTier.reputationPenalty + 1 : questTier.reputationPenalty,
        deadline: currentDay + randInt(1, 2) + (qty - 1),
        fulfilled: false, fulfilledQty: 0, qty: qty,
        blueprintLocked: !blueprints.includes(weaponKey),
    };
}

// ============================================================
// Plugin-style API
// ============================================================
var QuestLogic = {
    generateRoyalQuest: generateRoyalQuest,
};

export default QuestLogic;