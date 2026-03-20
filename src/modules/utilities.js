// ============================================================
// utilities.js — Wobbly Anvil Utilities Module
// Pure functions: math helpers, game calculations, lookups.
// Zero state. Zero side effects. Zero UI.
// ============================================================

import GameConstants from "./constants.js";

var TIERS = GameConstants.TIERS;
var SMITH_RANKS = GameConstants.SMITH_RANKS;
var WEAPONS = GameConstants.WEAPONS;
var MATS = GameConstants.MATS;
var HEAT_TIERS = GameConstants.HEAT_TIERS;
var HAMMER_TIERS = GameConstants.HAMMER_TIERS;
var QTE_COLS = GameConstants.QTE_COLS;
var HAMMER_WIN = GameConstants.HAMMER_WIN;
var MAX_HOUR = GameConstants.MAX_HOUR;
var SCRAP_TOASTS = GameConstants.SCRAP_TOASTS;

// --- Core Math ---

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// --- Random Selection ---

function weightedPick(items, weights) {
    var total = 0;
    for (var i = 0; i < weights.length; i++) total += weights[i];
    var roll = Math.random() * total;
    var cumulative = 0;
    for (var i = 0; i < items.length; i++) {
        cumulative += weights[i];
        if (roll < cumulative) return items[i];
    }
    return items[0];
}

function randMatKey() {
    var keys = Object.keys(MATS);
    return keys[Math.floor(Math.random() * keys.length)];
}

function randScrapToast() {
    return SCRAP_TOASTS[Math.floor(Math.random() * SCRAP_TOASTS.length)];
}

// --- Quality & Tier Lookups ---

function getQualityTier(score) {
    return TIERS.slice().reverse().find(function(t) {
        return score >= t.scoreMin;
    }) || TIERS[0];
}

function qualityGainMultiplier(score) {
    return getQualityTier(score).qualityGainRate;
}

// --- Value Calculations ---

function qualityValue(weaponKey, materialKey, score, upgrades) {
    var weapon = WEAPONS[weaponKey];
    var material = MATS[materialKey] || MATS.bronze;
    var upgradeBonus = (upgrades.anvil + upgrades.hammer + upgrades.forge + upgrades.quench) * 2;
    var base = weapon.materialCost * material.price + (weapon.priceBonus || 0);
    var calculated = Math.round(base * getQualityTier(score).valueMultiplier * (1 + upgradeBonus / 100));
    var materialFloor = weapon.materialCost * material.price;
    return Math.max(calculated, materialFloor);
}

function referenceValue(weaponKey) {
    var commonMin = TIERS.find(function(t) { return t.label === "Common"; }).scoreMin;
    return qualityValue(weaponKey, "iron", commonMin, { anvil: 0, hammer: 0, forge: 0, quench: 0, furnace: 0 });
}

// --- XP & Rank ---

function xpForLevel(level) {
    return Math.floor(40 * Math.pow(1.15, level - 1));
}

function getSmithRank(totalGold) {
    var rank = SMITH_RANKS[0];
    for (var i = 0; i < SMITH_RANKS.length; i++) {
        if (totalGold >= SMITH_RANKS[i].threshold) rank = SMITH_RANKS[i];
    }
    return rank;
}

function getNextRank(totalGold) {
    for (var i = 0; i < SMITH_RANKS.length; i++) {
        if (totalGold < SMITH_RANKS[i].threshold) return SMITH_RANKS[i];
    }
    return null;
}

// --- Stat Multipliers ---

function calcSpeedMultiplier(playerPrecision, effectiveDifficulty) {
    return clamp(1.0 - (playerPrecision - effectiveDifficulty) * 0.1, 0.7, 1.3);
}

function calcStrikeMultiplier(playerTechnique, effectiveDifficulty) {
    return clamp(1.0 + (playerTechnique - effectiveDifficulty) * 0.1, 0.7, 1.5);
}

// --- QTE Helpers ---

function positionToColumn(position) {
    return Math.round(clamp(position, 0, 100) / 100 * (QTE_COLS - 1));
}

function columnToPosition(column) {
    return column / (QTE_COLS - 1) * 100;
}

function calcHeatResult(position, winLow, winHigh) {
    var column = positionToColumn(position);
    var sweetLow = positionToColumn(winLow);
    var sweetHigh = positionToColumn(winHigh);
    var sweetPeak = Math.round((sweetLow + sweetHigh) / 2);
    if (column === sweetPeak) return HEAT_TIERS[0];
    if (column >= sweetLow && column <= sweetHigh) return HEAT_TIERS[1];
    if (column >= Math.round(sweetLow * 0.55)) return HEAT_TIERS[2];
    return HEAT_TIERS[3];
}

function calcHammerResult(position) {
    var distance = Math.abs(columnToPosition(positionToColumn(position)) - 50);
    for (var i = 0; i < HAMMER_TIERS.length; i++) {
        if (distance <= HAMMER_WIN * HAMMER_TIERS[i].percentOfHalf) return HAMMER_TIERS[i];
    }
    return HAMMER_TIERS[HAMMER_TIERS.length - 1];
}

// --- Time ---

function formatTime(hour) {
    var hh = Math.floor(hour) % 24;
    var mm = Math.round((hour % 1) * 60);
    return (hh % 12 || 12) + ":" + (mm < 10 ? "0" : "") + mm + (hh >= 12 ? "pm" : "am");
}

function canAffordTime(hour, cost) {
    return hour + cost <= MAX_HOUR;
}

// ============================================================
// Plugin-style API — single export, one entry point
// ============================================================
var GameUtils = {
    // Core Math
    rand: rand,
    randInt: randInt,
    clamp: clamp,

    // Random Selection
    weightedPick: weightedPick,
    randMatKey: randMatKey,
    randScrapToast: randScrapToast,

    // Quality & Tiers
    getQualityTier: getQualityTier,
    qualityGainMultiplier: qualityGainMultiplier,

    // Value Calculations
    qualityValue: qualityValue,
    referenceValue: referenceValue,

    // XP & Rank
    xpForLevel: xpForLevel,
    getSmithRank: getSmithRank,
    getNextRank: getNextRank,

    // Stat Multipliers
    calcSpeedMultiplier: calcSpeedMultiplier,
    calcStrikeMultiplier: calcStrikeMultiplier,

    // QTE Helpers
    positionToColumn: positionToColumn,
    columnToPosition: columnToPosition,
    calcHeatResult: calcHeatResult,
    calcHammerResult: calcHammerResult,

    // Time
    formatTime: formatTime,
    canAffordTime: canAffordTime,
};

export default GameUtils;