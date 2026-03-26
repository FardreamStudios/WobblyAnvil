// ============================================================
// fairyRulesTree.js — Trigger Conditions for Fairy Controller
//
// Maps game state patterns to dialogue categories.
// fairyController.js evaluates these each tick / bus event.
// Priority: higher number = checked first. First match wins.
//
// minDay: earliest day this trigger can fire. Controller skips
// triggers where day < minDay. See DAY_TIERS in fairyController.
//   1  = ftue tier (days 1-2, teaching + critical)
//   6  = reactive tier (days 6-9, gameplay reactions)
//   10 = active tier (days 10-14, events + streaks)
//   15 = full tier (days 15+, ambient commentary)
//
// PORTABLE: Pure data. No React. No imports. No side effects.
// ============================================================

var TRIGGERS = [

    // --- Critical / urgent (checked first) ---
    {
        id: "dire_straits",
        priority: 100,
        category: "on_dire_straits",
        minDay: 1,
        condition: function(s) {
            return s.rep < 15 && s.gold < 10 && s.activeDecree && s.daysLeft <= 2;
        },
        cooldownMs: 60000,
    },
    {
        id: "decree_urgent",
        priority: 90,
        category: "on_decree_urgent",
        minDay: 1,
        condition: function(s) {
            return s.activeDecree && s.daysLeft === 1;
        },
        cooldownMs: 30000,
    },
    {
        id: "decree_failed",
        priority: 85,
        category: "on_decree_failed",
        minDay: 1,
        busTag: "QUEST_FAILED",
        cooldownMs: 0,
    },
    {
        id: "decree_complete",
        priority: 85,
        category: "on_decree_complete",
        minDay: 1,
        busTag: "FORGE_SESSION_COMPLETE",
        condition: function(s) { return s.justCompletedDecree; },
        cooldownMs: 0,
    },

    // --- Forge reactions ---
    {
        id: "shatter",
        priority: 80,
        category: "on_shatter",
        minDay: 6,
        busTag: "FX_SHATTER",
        cooldownMs: 0,
    },
    {
        id: "shatter_streak",
        priority: 82,
        category: "on_shatter_streak",
        minDay: 6,
        condition: function(s) { return s.recentShatters >= 2; },
        cooldownMs: 0,
    },
    {
        id: "masterwork",
        priority: 75,
        category: "on_masterwork",
        minDay: 6,
        busTag: "FORGE_SESSION_COMPLETE",
        condition: function(s) { return s.lastWeaponQuality >= 90; },
        cooldownMs: 0,
    },
    {
        id: "bad_quality",
        priority: 60,
        category: "on_bad_quality",
        minDay: 6,
        busTag: "FORGE_SESSION_COMPLETE",
        condition: function(s) { return s.lastWeaponQuality < 30; },
        cooldownMs: 15000,
    },
    {
        id: "perfect_quench",
        priority: 70,
        category: "on_perfect_quench",
        minDay: 6,
        condition: function(s) { return s.lastQuenchResult === "perfect"; },
        cooldownMs: 0,
    },
    {
        id: "failed_quench",
        priority: 70,
        category: "on_failed_quench",
        minDay: 6,
        condition: function(s) { return s.lastQuenchResult === "destroyed"; },
        cooldownMs: 0,
    },
    {
        id: "hot_streak",
        priority: 50,
        category: "on_hot_streak",
        minDay: 10,
        condition: function(s) { return s.consecutiveGoodWeapons >= 3; },
        cooldownMs: 30000,
    },

    // --- Material reactions ---
    {
        id: "using_copper",
        priority: 65,
        category: "on_copper",
        minDay: 6,
        condition: function(s) { return s.selectedMaterial === "copper"; },
        cooldownMs: 20000,
    },

    // --- Economy reactions ---
    {
        id: "customer_arrives",
        priority: 40,
        category: "on_customer",
        minDay: 6,
        busTag: "CUSTOMER_SPAWN",
        cooldownMs: 30000,
    },
    {
        id: "customer_walkout",
        priority: 45,
        category: "on_walkout",
        minDay: 6,
        busTag: "CUSTOMER_WALKOUT",
        cooldownMs: 10000,
    },
    {
        id: "undersell",
        priority: 42,
        category: "on_undersell",
        minDay: 6,
        busTag: "ECONOMY_WEAPON_SOLD",
        condition: function(s) { return s.lastSaleRatio < 0.7; },
        cooldownMs: 20000,
    },
    {
        id: "good_sale",
        priority: 38,
        category: "on_good_sale",
        minDay: 6,
        busTag: "ECONOMY_WEAPON_SOLD",
        condition: function(s) { return s.lastSaleRatio >= 1.0; },
        cooldownMs: 20000,
    },

    // --- Reputation ---
    {
        id: "low_rep",
        priority: 55,
        category: "on_low_rep",
        minDay: 10,
        condition: function(s) { return s.rep < 20 && s.rep > 5; },
        cooldownMs: 45000,
    },

    // --- Day cycle ---
    {
        id: "late_night",
        priority: 30,
        category: "on_late_night",
        minDay: 15,
        condition: function(s) { return s.hour >= 22; },
        cooldownMs: 60000,
    },
    {
        id: "idle_too_long",
        priority: 20,
        category: "on_idle_too_long",
        minDay: 15,
        condition: function(s) { return s.idleMinutes > 3; },
        cooldownMs: 120000,
    },
    {
        id: "first_forge",
        priority: 35,
        category: "on_first_forge",
        minDay: 1,
        condition: function(s) { return s.totalForges === 0 && s.phase === "heat"; },
        cooldownMs: 0,
        once: true,
    },

    // --- Morning events ---
    {
        id: "morning_quiet",
        priority: 10,
        category: "on_quiet_morning",
        minDay: 10,
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "slow_morning"; },
        cooldownMs: 0,
    },
    {
        id: "morning_festival",
        priority: 10,
        category: "on_festival",
        minDay: 10,
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "festival"; },
        cooldownMs: 0,
    },
    {
        id: "morning_blessing",
        priority: 10,
        category: "on_blessing",
        minDay: 10,
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "blessing_of_flame"; },
        cooldownMs: 0,
    },
    {
        id: "morning_rival",
        priority: 10,
        category: "on_rival_smith",
        minDay: 10,
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "traveling_smith"; },
        cooldownMs: 0,
    },
    {
        id: "morning_rats",
        priority: 10,
        category: "on_rats",
        minDay: 10,
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "rat_infestation"; },
        cooldownMs: 0,
    },
];

// ============================================================
// TEMPLATE TOKENS
// Lines can contain {tokens} that resolve against game state.
// fairyController.js runs these before display.
//
// {weaponName}     — name of current WIP weapon
// {materialName}   — name of selected material
// {gold}           — current gold
// {rep}            — current reputation
// {day}            — current day number
// {daysLeft}       — days remaining on active decree
// {trueValue}      — real value of weapon (used by fairy_insight)
// {customerName}   — name of current customer
// {quality}        — quality of last finished weapon
// ============================================================

// ============================================================
// EXPORT
// ============================================================
var FairyRulesTree = {
    TRIGGERS: TRIGGERS,
};

export default FairyRulesTree;