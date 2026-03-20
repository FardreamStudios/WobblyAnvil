// ============================================================
// events.js — Wobbly Anvil Events Module
// Event definitions, daily event roller, royal quest generator.
// NOTE: Merchant event variants call randMatKey() at load time.
//       This is a known side effect — flagged for future refactor
//       into a factory pattern that generates on demand.
// ============================================================

import GameConstants from "./constants.js";
import GameUtils from "./utilities.js";

var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var TIERS = GameConstants.TIERS;
var ROYAL_NAMES = GameConstants.ROYAL_NAMES;
var STARTING_GOLD = GameConstants.STARTING_GOLD;
var BASE_STAMINA = GameConstants.BASE_STAMINA;
var WAKE_HOUR = GameConstants.WAKE_HOUR;
var PRESSURE_PER_DAY = GameConstants.PRESSURE_PER_DAY;
var MAX_PRESSURE = GameConstants.MAX_PRESSURE;
var PRESSURE_SPIKE_CHANCE = GameConstants.PRESSURE_SPIKE_CHANCE;
var PRESSURE_SPIKE_MAX = GameConstants.PRESSURE_SPIKE_MAX;

var rand = GameUtils.rand;
var randInt = GameUtils.randInt;
var clamp = GameUtils.clamp;
var weightedPick = GameUtils.weightedPick;
var randMatKey = GameUtils.randMatKey;
var qualityValue = GameUtils.qualityValue;

// --- Helper: find owned material keys ---

function ownedMatKeys(inventory) {
    return Object.keys(MATS).filter(function(key) {
        return (inventory[key] || 0) > 0;
    });
}

// --- Helper: pick a random owned material ---

function randomOwnedMat(inventory) {
    var owned = ownedMatKeys(inventory);
    if (!owned.length) return null;
    return owned[Math.floor(Math.random() * owned.length)];
}

// --- Event Definitions ---
// WARNING: Merchant variants execute randMatKey() at load time (side effect).

var EVENTS = [
    { id: "slow", icon: "\uD83D\uDCA4", tag: "QUIET", variants: [
            { title: "Slow Morning", desc: "Nothing special today.", effect: null },
        ]},

    { id: "festival", icon: "\uD83C\uDF89", tag: "EVENT", variants: [
            { title: "Small Gathering",   desc: "A few extra visitors! +2 visits.",  effect: function(s) { return Object.assign({}, s, { extraCustomers: 2 }); }},
            { title: "Town Festival",     desc: "Extra customers today! +3 visits.", effect: function(s) { return Object.assign({}, s, { extraCustomers: 3 }); }},
            { title: "Grand Celebration", desc: "The whole town is out! +5 visits.", effect: function(s) { return Object.assign({}, s, { extraCustomers: 5 }); }},
        ]},

    { id: "merchant", icon: "\u2692", tag: "MERCHANT", variants: [
            (function() {
                var key = randMatKey();
                return { title: "Material Windfall", desc: "A merchant gifts you 2 " + MATS[key].name + ".", effect: function(s) {
                        var inv = Object.assign({}, s.inv); inv[key] = (inv[key] || 0) + 2; return Object.assign({}, s, { inv: inv });
                    }};
            }()),
            (function() {
                var key = randMatKey();
                return { title: "Material Discount", desc: MATS[key].name + " at half price today.", effect: function(s) {
                        return Object.assign({}, s, { matDiscount: { key: key, mult: 0.5 } });
                    }};
            }()),
            (function() {
                var key = randMatKey();
                return { title: "Generous Merchant", desc: "A merchant gifts you 5 " + MATS[key].name + "!", effect: function(s) {
                        var inv = Object.assign({}, s.inv); inv[key] = (inv[key] || 0) + 5; return Object.assign({}, s, { inv: inv });
                    }};
            }()),
        ]},

    { id: "rival", icon: "\uD83D\uDE20", tag: "MARKET", variants: [
            { title: "Rival Grumbles",  desc: "A rival smith undercuts you. Weapon sell prices -15% today.", effect: function(s) { return Object.assign({}, s, { priceDebuff: 0.85 }); }},
            { title: "Rival Undercuts", desc: "A rival smith undercuts you. Weapon sell prices -25% today.", effect: function(s) { return Object.assign({}, s, { priceDebuff: 0.75 }); }},
            { title: "Rival Price War", desc: "Market chaos. All weapon sell prices -40% today.",            effect: function(s) { return Object.assign({}, s, { priceDebuff: 0.60 }); }},
        ]},

    { id: "backpain", icon: "\uD83E\uDD15", tag: "HAZARD", variants: [
            { title: "Mild Ache",   desc: "Slight discomfort. Sessions cost 4hr.",     effect: function(s) { return Object.assign({}, s, { forcedExhaustion: true }); }},
            { title: "Bad Back",    desc: "All sessions cost 4hr today.",              effect: function(s) { return Object.assign({}, s, { forcedExhaustion: true }); }},
            { title: "Thrown Back",  desc: "Sessions cost 4hr and you lose 1 stamina.", effect: function(s) { return Object.assign({}, s, { forcedExhaustion: true, stamina: Math.max(1, s.stamina - 1) }); }},
        ]},

    { id: "rat", icon: "\uD83D\uDC00", tag: "HAZARD", variants: [
            { title: "Mouse in the Larder", desc: "DYNAMIC", effect: function(s) {
                    var key = randomOwnedMat(s.inv); if (!key) return s;
                    var inv = Object.assign({}, s.inv); inv[key] = Math.max(0, (inv[key] || 0) - 1);
                    return Object.assign({}, s, { inv: inv, _evDesc: "A mouse got in. Lost 1 " + MATS[key].name + "." });
                }},
            { title: "Rat in the Larder", desc: "DYNAMIC", effect: function(s) {
                    var key = randomOwnedMat(s.inv); if (!key) return s;
                    var inv = Object.assign({}, s.inv); inv[key] = Math.max(0, (inv[key] || 0) - 3);
                    return Object.assign({}, s, { inv: inv, _evDesc: "Lost 3 " + MATS[key].name + "." });
                }},
            { title: "Rat Infestation", desc: "DYNAMIC", effect: function(s) {
                    var key = randomOwnedMat(s.inv); if (!key) return s;
                    var inv = Object.assign({}, s.inv); inv[key] = Math.max(0, (inv[key] || 0) - 6);
                    return Object.assign({}, s, { inv: inv, _evDesc: "They got everywhere. Lost 6 " + MATS[key].name + "." });
                }},
        ]},

    { id: "fire", icon: "\uD83D\uDD25", tag: "HAZARD", variants: [
            { title: "Ember Scare",   desc: "Quick to put out. Lose 2 hours and 5% gold.",   effect: function(s) { return Object.assign({}, s, { hour: s.hour + 2, goldDelta: -Math.floor(s.gold * 0.05) }); }},
            { title: "Small Fire",    desc: "Lose 4 hours and 10% of your gold.",             effect: function(s) { return Object.assign({}, s, { hour: s.hour + 4, goldDelta: -Math.floor(s.gold * 0.10) }); }},
            { title: "Workshop Fire", desc: "Serious damage. Lose 8 hours and 20% of gold.", effect: function(s) { return Object.assign({}, s, { hour: s.hour + 8, goldDelta: -Math.floor(s.gold * 0.20) }); }},
        ]},

    { id: "mom", icon: "\uD83D\uDC69", tag: "EVENT", variants: [
            { title: "Mom Pops In",    desc: "Brief visit. -2hr.",                             effect: function(s) { return Object.assign({}, s, { hour: s.hour + 2 }); }},
            { title: "Mom Visits",     desc: "She reorganizes everything. -3hr -1 stam.",     effect: function(s) { return Object.assign({}, s, { hour: s.hour + 3, stamina: Math.max(1, s.stamina - 1) }); }},
            { title: "Mom Stays Over", desc: "She rearranges the whole forge. -4hr -2 stam.", effect: function(s) { return Object.assign({}, s, { hour: s.hour + 4, stamina: Math.max(1, s.stamina - 2) }); }},
        ]},

    { id: "taxman", icon: "\uD83D\uDCB0", tag: "HAZARD", variants: [
            { title: "Minor Tax",      desc: "A small levy. Lose 25% of your gold.",  effect: function(s) { return Object.assign({}, s, { goldDelta: -Math.floor(s.gold * 0.25) }); }},
            { title: "Tax Collector",  desc: "Royal tax takes 33% of your gold.",     effect: function(s) { return Object.assign({}, s, { goldDelta: -Math.floor(s.gold * 0.33) }); }},
            { title: "Heavy Taxation", desc: "The crown demands half your gold.",      effect: function(s) { return Object.assign({}, s, { goldDelta: -Math.floor(s.gold * 0.50) }); }},
        ]},

    { id: "apprentice", icon: "\uD83D\uDC66", tag: "EVENT", variants: [
            { title: "Helpful Lad",        desc: "+1 stamina today.", effect: function(s) { return Object.assign({}, s, { stamina: s.stamina + 1 }); }},
            { title: "Helpful Apprentice", desc: "+2 stamina today.", effect: function(s) { return Object.assign({}, s, { stamina: s.stamina + 2 }); }},
            { title: "Eager Apprentice",   desc: "+3 stamina today!", effect: function(s) { return Object.assign({}, s, { stamina: s.stamina + 3 }); }},
        ]},

    { id: "bonanza", icon: "\uD83D\uDC8E", tag: "MERCHANT", variants: [
            { title: "Good Market Day",  desc: "Weapons sell for 25% more today.",     effect: function(s) { return Object.assign({}, s, { priceBonus: 1.25 }); }},
            { title: "Merchant Bonanza", desc: "All weapons sell for 50% more today.", effect: function(s) { return Object.assign({}, s, { priceBonus: 1.5 }); }},
            { title: "Buying Frenzy",    desc: "Weapons sell for double today!",        effect: function(s) { return Object.assign({}, s, { priceBonus: 2.0 }); }},
        ]},

    { id: "flood", icon: "\uD83C\uDF0A", tag: "HAZARD", variants: [
            { title: "Flash Flood", desc: "Water seeps in everywhere. Lose 3 hours and 10% gold.",      effect: function(s) { return Object.assign({}, s, { hour: s.hour + 3, goldDelta: -Math.floor(s.gold * 0.10) }); }},
            { title: "Hurricane",   desc: "The street is a river. Lose 6 hours and 15% of your gold.",   effect: function(s) { return Object.assign({}, s, { hour: s.hour + 6, goldDelta: -Math.floor(s.gold * 0.15) }); }},
            { title: "Tsunami",     desc: "Catastrophic flooding. Lose 12 hours and 20% of your gold.", effect: function(s) { return Object.assign({}, s, { hour: s.hour + 12, goldDelta: -Math.floor(s.gold * 0.20) }); }},
        ]},

    { id: "drought", icon: "\u2600", tag: "MARKET", variantWeights: [40, 30, 20, 10], variants: [
            { title: "Material Shortage", tag: "HAZARD", desc: "Supplies are running low. All material prices up 10% today.",  effect: function(s) { return Object.assign({}, s, { globalMatMult: 1.10 }); }},
            { title: "Trade Disruption",  tag: "HAZARD", desc: "Trade routes are blocked. All material prices up 20% today.", effect: function(s) { return Object.assign({}, s, { globalMatMult: 1.20 }); }},
            { title: "Market Collapse",   tag: "HAZARD", desc: "The markets are in chaos. All material prices up 30% today.",  effect: function(s) { return Object.assign({}, s, { globalMatMult: 1.30 }); }},
            { title: "Great Famine",      tag: "HAZARD", desc: "All trade has ceased. All material prices up 50% today.",      effect: function(s) { return Object.assign({}, s, { globalMatMult: 1.50 }); }},
        ]},

    { id: "commission", icon: "\uD83C\uDFF0", tag: "EVENT", variants: [
            { title: "Small Commission",  desc: "A guard pre-pays 15g for a weapon.", effect: function(s) { return Object.assign({}, s, { goldDelta: 15 }); }},
            { title: "Guard Commission",  desc: "A guard pre-pays 30g for a weapon.", effect: function(s) { return Object.assign({}, s, { goldDelta: 30 }); }},
            { title: "Knight Commission", desc: "A knight pre-pays 50g for a blade!", effect: function(s) { return Object.assign({}, s, { goldDelta: 50 }); }},
        ]},

    { id: "curse", icon: "\uD83D\uDC80", tag: "HAZARD", variants: [
            { title: "Mild Rust", desc: "DYNAMIC", effect: function(s) {
                    var key = randomOwnedMat(s.inv); if (!key) return s;
                    var inv = Object.assign({}, s.inv); inv[key] = Math.floor((inv[key] || 0) * 0.75);
                    return Object.assign({}, s, { inv: inv, _evDesc: "Some " + MATS[key].name + " spoiled. Lost 25%." });
                }},
            { title: "Cursed Shipment", desc: "DYNAMIC", effect: function(s) {
                    var key = randomOwnedMat(s.inv); if (!key) return s;
                    var inv = Object.assign({}, s.inv); inv[key] = Math.floor((inv[key] || 0) / 2);
                    return Object.assign({}, s, { inv: inv, _evDesc: "Your " + MATS[key].name + " rusts. Lost half." });
                }},
            { title: "Heavy Curse", desc: "DYNAMIC", effect: function(s) {
                    var key = randomOwnedMat(s.inv); if (!key) return s;
                    var inv = Object.assign({}, s.inv); inv[key] = 0;
                    return Object.assign({}, s, { inv: inv, _evDesc: "All your " + MATS[key].name + " turns to dust!" });
                }},
        ]},

    { id: "viral", icon: "\uD83C\uDF1F", tag: "EVENT", variants: [
            { title: "You Went Viral", desc: "You went viral on the medieval internet. Customers flood in all day.", effect: function(s) { return Object.assign({}, s, { guaranteedCustomers: true }); }},
        ]},

    { id: "mystery", icon: "\uD83C\uDF11", tag: "EVENT", variantWeights: [60, 15, 25],
        flavorDescs: [
            "The forge feels watched today...",
            "It is eerily quiet this morning.",
            "Something unseen lingers in the air.",
            "The shadows seem deeper than usual.",
        ],
        variants: [
            { title: "The Quiet", severity: null, effect: null },
            { title: "The Visitor", severity: "good", effect: function(s) {
                    var matKey = Math.random() < 0.5 ? "mithril" : "orichalcum";
                    var qty = Math.floor(Math.random() * 2) + 5;
                    var inv = Object.assign({}, s.inv); inv[matKey] = (inv[matKey] || 0) + qty;
                    return Object.assign({}, s, { inv: inv, repDelta: 1, _mysteryMat: matKey, _mysteryMatQty: qty });
                }},
            { title: "The Shadow", severity: "bad", effect: function(s) {
                    var matKeys = Object.keys(MATS);
                    var owned = matKeys.filter(function(k) { return (s.inv[k] || 0) > 0; });
                    var worstKey = owned.length ? owned.reduce(function(a, b) {
                        return (s.inv[a] || 0) * (MATS[a].price || 1) > (s.inv[b] || 0) * (MATS[b].price || 1) ? a : b;
                    }) : null;
                    var inv = Object.assign({}, s.inv);
                    if (worstKey) inv[worstKey] = 0;
                    var goldLost = -Math.floor(s.gold * rand(0.15, 0.20));
                    var finishedLost = s.finished && s.finished.length > 0;
                    var newFinished = finishedLost ? s.finished.slice(1) : s.finished;
                    return Object.assign({}, s, {
                        inv: inv, goldDelta: goldLost, finished: newFinished, repDelta: -1,
                        _mysteryMat: worstKey, _mysteryWipDestroyed: true,
                        _mysteryGoldLost: -goldLost, _mysteryWeaponLost: finishedLost ? s.finished[0] : null,
                    });
                }},
        ],
    },
];

// --- Daily Event Roller ---

function rollDailyEvent(state) {
    var hasMats = ownedMatKeys(state.inv).length > 0;

    var pool = EVENTS.filter(function(ev) {
        if (!hasMats && (ev.id === "rat" || ev.id === "curse" || ev.id === "drought")) return false;
        return true;
    }).map(function(ev) {
        return {
            id: ev.id, icon: ev.icon, tag: ev.tag,
            variants: ev.variants, weight: ev.id === "mystery" ? 3 : ev.id === "slow" ? 3 : 1,
            variantWeights: ev.variantWeights || null, flavorDescs: ev.flavorDescs || null,
        };
    });

    if (state.hasSoldWeapon) {
        pool.push({ id: "returned", icon: "\uD83D\uDC09", tag: "EVENT", variants: [
                { title: "Returned Sword", desc: "Customer returned a sword. Lose 10% of your gold.", effect: function(s) { return Object.assign({}, s, { goldDelta: -Math.floor(s.gold * 0.10) }); }},
            ], weight: 1 });
    }

    if (state.finished && state.finished.length > 0) {
        pool.push({ id: "thief", icon: "\uD83E\uDDB9", tag: "HAZARD", variants: [
                { title: "Thief!", desc: "One weapon stolen!", effect: function(s) { if (!s.finished || !s.finished.length) return s; return Object.assign({}, s, { finished: s.finished.slice(1) }); }},
            ], weight: 1 });
    }

    if (state.lastSleepHour > 2) {
        pool.push({ id: "hangover", icon: "\uD83E\uDD74", tag: "HAZARD", variants: [
                { title: "Rough Morning", desc: "Stamina -2.", effect: function(s) { return Object.assign({}, s, { stamina: Math.max(1, s.stamina - 2) }); }},
            ], weight: 1 });
    }

    var event = weightedPick(pool, pool.map(function(e) { return e.weight; }));
    var vWeights = event.variantWeights || event.variants.map(function(_, i) {
        return i === 0 ? 50 : i === 1 ? 30 : 20;
    }).slice(0, event.variants.length);
    var variant = weightedPick(event.variants, vWeights);

    var snapshot = {
        gold: state.gold || STARTING_GOLD,
        inv: state.inv || { bronze: 10, iron: 4 },
        hour: WAKE_HOUR,
        stamina: state.stamina || BASE_STAMINA,
        finished: state.finished || [],
    };
    var result = variant.effect ? variant.effect(snapshot) : null;
    var desc = event.flavorDescs
        ? event.flavorDescs[Math.floor(Math.random() * event.flavorDescs.length)]
        : (result && result._evDesc ? result._evDesc : variant.desc);

    return {
        id: event.id, icon: event.icon, tag: event.tag,
        variantTag: variant.tag || null, title: variant.title,
        desc: desc, effect: variant.effect, severity: variant.severity || null,
    };
}

// --- Royal Quest Generator ---

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
    var matIndex = clamp(Math.floor(curvedPressure * matKeys.length + rand(-1, 1)), 0, matKeys.length - 1);
    var materialRequired = matKeys[matIndex];

    // Difficulty targeting
    var targetDifficulty = clamp(Math.round(curvedPressure * 8 + rand(-0.5, 0.5)) + 1, 1, 9);
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
    var qualityIndex = clamp(Math.floor(curvedPressure * questTiers.length + rand(-1, 0.8)) + repQualityBonus, commonIndex, questTiers.length - 1);
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
// Plugin-style API — single export, one entry point
// ============================================================
var GameEvents = {
    EVENTS: EVENTS,
    rollDailyEvent: rollDailyEvent,
    generateRoyalQuest: generateRoyalQuest,
};

export default GameEvents;