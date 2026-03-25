// ============================================================
// fairyTriggers.js — Trigger Conditions for Fairy Helper
//
// Maps game state patterns to dialogue categories.
// fairyHelper.js evaluates these each tick / bus event.
// Priority: higher number = checked first. First match wins.
//
// PORTABLE: Pure data. No React. No imports. No side effects.
// ============================================================

var TRIGGERS = [

    // --- Critical / urgent (checked first) ---
    {
        id: "dire_straits",
        priority: 100,
        category: "on_dire_straits",
        condition: function(s) {
            return s.rep < 15 && s.gold < 10 && s.activeDecree && s.daysLeft <= 2;
        },
        cooldownMs: 60000,   // don't repeat for 60s
    },
    {
        id: "decree_urgent",
        priority: 90,
        category: "on_decree_urgent",
        condition: function(s) {
            return s.activeDecree && s.daysLeft === 1;
        },
        cooldownMs: 30000,
    },
    {
        id: "decree_failed",
        priority: 85,
        category: "on_decree_failed",
        busTag: "QUEST_FAILED",
        cooldownMs: 0,       // always fire on this event
    },
    {
        id: "decree_complete",
        priority: 85,
        category: "on_decree_complete",
        busTag: "FORGE_SESSION_COMPLETE",
        condition: function(s) { return s.justCompletedDecree; },
        cooldownMs: 0,
    },

    // --- Forge reactions ---
    {
        id: "shatter",
        priority: 80,
        category: "on_shatter",
        busTag: "FX_SHATTER",
        cooldownMs: 0,
    },
    {
        id: "shatter_streak",
        priority: 82,
        category: "on_shatter_streak",
        condition: function(s) { return s.recentShatters >= 2; },
        cooldownMs: 0,
    },
    {
        id: "masterwork",
        priority: 75,
        category: "on_masterwork",
        busTag: "FORGE_SESSION_COMPLETE",
        condition: function(s) { return s.lastWeaponQuality >= 90; },
        cooldownMs: 0,
    },
    {
        id: "bad_quality",
        priority: 60,
        category: "on_bad_quality",
        busTag: "FORGE_SESSION_COMPLETE",
        condition: function(s) { return s.lastWeaponQuality < 30; },
        cooldownMs: 15000,
    },
    {
        id: "perfect_quench",
        priority: 70,
        category: "on_perfect_quench",
        condition: function(s) { return s.lastQuenchResult === "perfect"; },
        cooldownMs: 0,
    },
    {
        id: "failed_quench",
        priority: 70,
        category: "on_failed_quench",
        condition: function(s) { return s.lastQuenchResult === "destroyed"; },
        cooldownMs: 0,
    },
    {
        id: "hot_streak",
        priority: 50,
        category: "on_hot_streak",
        condition: function(s) { return s.consecutiveGoodWeapons >= 3; },
        cooldownMs: 30000,
    },

    // --- Material reactions ---
    {
        id: "using_copper",
        priority: 65,
        category: "on_copper",
        condition: function(s) { return s.selectedMaterial === "copper"; },
        cooldownMs: 20000,
    },

    // --- Economy reactions ---
    {
        id: "customer_arrives",
        priority: 40,
        category: "on_customer",
        busTag: "CUSTOMER_SPAWN",
        cooldownMs: 30000,
    },
    {
        id: "customer_walkout",
        priority: 45,
        category: "on_walkout",
        busTag: "CUSTOMER_WALKOUT",
        cooldownMs: 10000,
    },
    {
        id: "undersell",
        priority: 42,
        category: "on_undersell",
        busTag: "ECONOMY_WEAPON_SOLD",
        condition: function(s) { return s.lastSaleRatio < 0.7; },
        cooldownMs: 20000,
    },
    {
        id: "good_sale",
        priority: 38,
        category: "on_good_sale",
        busTag: "ECONOMY_WEAPON_SOLD",
        condition: function(s) { return s.lastSaleRatio >= 1.0; },
        cooldownMs: 20000,
    },

    // --- Reputation ---
    {
        id: "low_rep",
        priority: 55,
        category: "on_low_rep",
        condition: function(s) { return s.rep < 20 && s.rep > 5; },
        cooldownMs: 45000,
    },

    // --- Day cycle ---
    {
        id: "late_night",
        priority: 30,
        category: "on_late_night",
        condition: function(s) { return s.hour >= 22; },
        cooldownMs: 60000,
    },
    {
        id: "idle_too_long",
        priority: 20,
        category: "on_idle_too_long",
        condition: function(s) { return s.idleMinutes > 3; },
        cooldownMs: 120000,
    },
    {
        id: "first_forge",
        priority: 35,
        category: "on_first_forge",
        condition: function(s) { return s.totalForges === 0 && s.phase === "heat"; },
        cooldownMs: 0,
        once: true,          // never triggers again after first time
    },

    // --- Morning events ---
    {
        id: "morning_quiet",
        priority: 10,
        category: "on_quiet_morning",
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "slow_morning"; },
        cooldownMs: 0,
    },
    {
        id: "morning_festival",
        priority: 10,
        category: "on_festival",
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "festival"; },
        cooldownMs: 0,
    },
    {
        id: "morning_blessing",
        priority: 10,
        category: "on_blessing",
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "blessing_of_flame"; },
        cooldownMs: 0,
    },
    {
        id: "morning_rival",
        priority: 10,
        category: "on_rival_smith",
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "traveling_smith"; },
        cooldownMs: 0,
    },
    {
        id: "morning_rats",
        priority: 10,
        category: "on_rats",
        busTag: "DAY_MORNING_EVENT_DISPLAY",
        condition: function(s) { return s.morningEventId === "rat_infestation"; },
        cooldownMs: 0,
    },
];

// ============================================================
// TEMPLATE TOKENS
// Lines can contain {tokens} that resolve against game state.
// fairyHelper.js runs these before display.
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
var FairyTriggers = {
    TRIGGERS: TRIGGERS,
};

export default FairyTriggers;