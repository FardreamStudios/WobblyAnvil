// ============================================================
// constants.js — Wobbly Anvil Game Constants Module
// Single source of truth for all game data tables.
// Zero logic. Zero side effects. Data only.
//
// QTE data (tier tables, color ramp, layout, speeds) lives in
// qteConstants.js and is re-exported here for backward compat.
// ============================================================

import QTEConstants from "../config/qteConstants.js";

// --- Re-export QTE constants for backward compatibility ---
var QTE_COLS = QTEConstants.QTE_COLS;
var QTE_FLASH_MS = QTEConstants.QTE_FLASH_MS;
var QTE_W = QTEConstants.QTE_W;
var QTE_COLOR_RAMP = QTEConstants.QTE_COLOR_RAMP;
var HEAT_TIERS = QTEConstants.HEAT_TIERS;
var HAMMER_TIERS = QTEConstants.HAMMER_TIERS;
var QUENCH_TIERS = QTEConstants.QUENCH_TIERS;
var QTE_SPEED = QTEConstants.QTE_SPEED;

// --- Layout ---
var COL_W = 170;
var STRESS_MAX = 3;

// --- Pressure System ---
var PRESSURE_PER_DAY = 0.7;
var MAX_PRESSURE = 15;
var PRESSURE_SPIKE_CHANCE = 0.25;
var PRESSURE_SPIKE_MAX = 2;

// --- Day & Economy ---
var WAKE_HOUR = 8;
var BASE_DAILY_CUSTOMERS = 2;
var STARTING_GOLD = 250;
var BASE_STAMINA = 5;
var MAT_DESTROY_RECOVERY = 0.5;
var MAT_SCRAP_RECOVERY = 0.25;
var REST_HOUR_LIMIT = 99;
var MAX_HOUR = 30;

// (QTE tier tables + color ramp extracted to src/config/qteConstants.js)

// --- Game Phases ---
var PHASES = {
    IDLE: "idle",
    SELECT: "select",
    SELECT_MAT: "select_mat",
    HEAT: "heat",
    HAMMER: "hammer",
    SESS_RESULT: "sess_result",
    QUENCH: "quench",
};

// --- Smith Ranks ---
var SMITH_RANKS = [
    { name: "Apprentice Smith",    threshold: 0 },
    { name: "Journeyman Smith",   threshold: 150 },
    { name: "Skilled Smith",       threshold: 400 },
    { name: "Artisan Smith",       threshold: 900 },
    { name: "Expert Smith",        threshold: 2000 },
    { name: "Master Smith",        threshold: 4000 },
    { name: "Grand Master Smith",  threshold: 8000 },
    { name: "Legendary Smith I",   threshold: 15000 },
    { name: "Legendary Smith II",  threshold: 25000 },
    { name: "Legendary Smith III", threshold: 40000 },
    { name: "Legendary Smith IV",  threshold: 60000 },
    { name: "Legendary Smith V",   threshold: 90000 },
];

// --- Quality Tiers ---
var TIERS = [
    { label: "Scrap",      scoreMin: 0,   scoreMax: 10,  color: "#a0a0a0", weaponColor: "#a0a0a0", valueMultiplier: 0.1,  qualityGainRate: 1.0,  reputationReward: 1, reputationPenalty: 1, xpMultiplier: 0.5 },
    { label: "Rubbish",    scoreMin: 11,  scoreMax: 20,  color: "#4ade80", weaponColor: "#a0a0a0", valueMultiplier: 0.5,  qualityGainRate: 0.95, reputationReward: 1, reputationPenalty: 1, xpMultiplier: 0.8 },
    { label: "Poor",       scoreMin: 21,  scoreMax: 35,  color: "#60a5fa", weaponColor: "#a0a0a0", valueMultiplier: 1.0,  qualityGainRate: 0.90, reputationReward: 1, reputationPenalty: 1, xpMultiplier: 1.0 },
    { label: "Common",     scoreMin: 40,  scoreMax: 55,  color: "#d8b4fe", weaponColor: "#4ade80", valueMultiplier: 1.5,  qualityGainRate: 0.80, reputationReward: 1, reputationPenalty: 1, xpMultiplier: 1.5 },
    { label: "Fine",       scoreMin: 60,  scoreMax: 70,  color: "#7c3aed", weaponColor: "#60a5fa", valueMultiplier: 2.2,  qualityGainRate: 0.60, reputationReward: 2, reputationPenalty: 2, xpMultiplier: 2.0 },
    { label: "Refined",    scoreMin: 74,  scoreMax: 82,  color: "#facc15", weaponColor: "#7c3aed", valueMultiplier: 3.0,  qualityGainRate: 0.35, reputationReward: 2, reputationPenalty: 2, xpMultiplier: 2.5 },
    { label: "Masterwork", scoreMin: 83,  scoreMax: 92,  color: "#f97316", weaponColor: "#facc15", valueMultiplier: 3.8,  qualityGainRate: 0.18, reputationReward: 3, reputationPenalty: 3, xpMultiplier: 3.5 },
    { label: "Legendary",  scoreMin: 93,  scoreMax: 98,  color: "#ef4444", weaponColor: "#ef4444", valueMultiplier: 4.5,  qualityGainRate: 0.12, reputationReward: 3, reputationPenalty: 3, xpMultiplier: 4.5 },
    { label: "Mythic",     scoreMin: 99,  scoreMax: 100, color: "#00ffe5", weaponColor: "#00ffe5", valueMultiplier: 5.0,  qualityGainRate: 0.08, reputationReward: 4, reputationPenalty: 4, xpMultiplier: 6.0 },
];

// --- Weapons ---
var WEAPONS = {
    dagger:     { name: "Dagger",     difficulty: 1, materialCost: 2, baseValue: 15,  tier: 1, blueprintCost: 30,   priceBonus: 0 },
    shortsword: { name: "Shortsword", difficulty: 2, materialCost: 3, baseValue: 20,  tier: 1, blueprintCost: 30,   priceBonus: 0 },
    axe:        { name: "Axe",        difficulty: 2, materialCost: 3, baseValue: 22,  tier: 1, blueprintCost: 30,   priceBonus: 5 },
    mace:       { name: "Mace",       difficulty: 3, materialCost: 3, baseValue: 28,  tier: 1, blueprintCost: 30,   priceBonus: 10 },
    sword:      { name: "Sword",      difficulty: 3, materialCost: 4, baseValue: 30,  tier: 2, blueprintCost: 120,  priceBonus: 5 },
    cutlass:    { name: "Cutlass",    difficulty: 3, materialCost: 4, baseValue: 32,  tier: 2, blueprintCost: 120,  priceBonus: 10 },
    rapier:     { name: "Rapier",     difficulty: 4, materialCost: 4, baseValue: 40,  tier: 2, blueprintCost: 120,  priceBonus: 15 },
    scimitar:   { name: "Scimitar",   difficulty: 4, materialCost: 4, baseValue: 38,  tier: 2, blueprintCost: 120,  priceBonus: 20 },
    broadsword: { name: "Broadsword", difficulty: 5, materialCost: 5, baseValue: 48,  tier: 3, blueprintCost: 300,  priceBonus: 15 },
    battleaxe:  { name: "Battle Axe", difficulty: 5, materialCost: 5, baseValue: 45,  tier: 3, blueprintCost: 300,  priceBonus: 20 },
    warhammer:  { name: "War Hammer", difficulty: 6, materialCost: 5, baseValue: 55,  tier: 3, blueprintCost: 300,  priceBonus: 25 },
    longsword:  { name: "Longsword",  difficulty: 6, materialCost: 6, baseValue: 58,  tier: 3, blueprintCost: 300,  priceBonus: 20 },
    halberd:    { name: "Halberd",    difficulty: 7, materialCost: 7, baseValue: 68,  tier: 4, blueprintCost: 1000, priceBonus: 15 },
    greatsword: { name: "Greatsword", difficulty: 7, materialCost: 8, baseValue: 72,  tier: 4, blueprintCost: 1000, priceBonus: 10 },
    greataxe:   { name: "Great Axe",  difficulty: 8, materialCost: 8, baseValue: 85,  tier: 4, blueprintCost: 1000, priceBonus: 15 },
    katana:     { name: "Katana",     difficulty: 9, materialCost: 6, baseValue: 100, tier: 4, blueprintCost: 1000, priceBonus: 40 },
};

// --- Materials ---
var MATS = {
    bronze:     { name: "Bronze",     price: 5,   color: "#a0a0a0", valueMultiplier: 0.6, label: "Common",    difficultyModifier: -1 },
    iron:       { name: "Iron",       price: 10,  color: "#a0a0a0", valueMultiplier: 1.0, label: "Common",    difficultyModifier: 0 },
    steel:      { name: "Steel",      price: 20,  color: "#4ade80", valueMultiplier: 2.0, label: "Uncommon",  difficultyModifier: 1 },
    damascus:   { name: "Damascus",   price: 32,  color: "#60a5fa", valueMultiplier: 3.0, label: "Rare",      difficultyModifier: 2 },
    titanium:   { name: "Titanium",   price: 45,  color: "#60a5fa", valueMultiplier: 3.5, label: "Rare",      difficultyModifier: 3 },
    iridium:    { name: "Iridium",    price: 55,  color: "#818cf8", valueMultiplier: 4.5, label: "Very Rare", difficultyModifier: 4 },
    tungsten:   { name: "Tungsten",   price: 70,  color: "#818cf8", valueMultiplier: 5.5, label: "Very Rare", difficultyModifier: 5 },
    mithril:    { name: "Mithril",    price: 90,  color: "#fbbf24", valueMultiplier: 6.5, label: "Legendary", difficultyModifier: 6 },
    orichalcum: { name: "Orichalcum", price: 120, color: "#ef4444", valueMultiplier: 8.0, label: "Mythic",    difficultyModifier: 8 },
};

// --- Upgrade Colors (index = upgrade level) ---
var UPGRADE_COLORS = [
    "#a0a0a0", "#4ade80", "#60a5fa", "#818cf8",
    "#d8b4fe", "#facc15", "#f97316", "#ef4444", "#00ffe5",
];

// --- Player Stats ---
var STATS_DEF = { brawn: 0, precision: 0, technique: 0, silverTongue: 0 };

var STAT_META = {
    brawn:        { label: "Brawn",         desc: "Each point adds +1 max stamina." },
    precision:    { label: "Precision",     desc: "Slows needle in all QTEs. Stacks with forge/anvil/quench upgrade bonuses." },
    technique:    { label: "Technique",     desc: "Increases hammer strike points. Stacks with hammer upgrade bonus." },
    silverTongue: { label: "Silver Tongue", desc: "Each point raises the customer's maximum offer by 20%." },
};

// --- Upgrades ---
var UPGRADES = {
    anvil: [
        { name: "Basic Anvil",      cost: 0,    desc: "No hammering bar slowdown." },
        { name: "Reinforced Anvil", cost: 80,   desc: "+1 hammering bar slowdown." },
        { name: "Master's Anvil",   cost: 600,  desc: "+2 hammering bar slowdown." },
        { name: "Legendary Anvil",  cost: 3000, desc: "+3 hammering bar slowdown." },
    ],
    hammer: [
        { name: "Iron Hammer",     cost: 0,    desc: "No strike multiplier bonus." },
        { name: "Steel Hammer",    cost: 100,  desc: "+1 strike multiplier bonus." },
        { name: "Balanced Hammer", cost: 700,  desc: "+2 strike multiplier bonus." },
        { name: "Master's Hammer", cost: 3500, desc: "+3 strike multiplier bonus." },
    ],
    forge: [
        { name: "Clay Forge",   cost: 0,    desc: "No heating bar slowdown." },
        { name: "Stone Forge",  cost: 90,   desc: "+1 heating bar slowdown." },
        { name: "Brick Forge",  cost: 650,  desc: "+2 heating bar slowdown." },
        { name: "Dragon Forge", cost: 3200, desc: "+3 heating bar slowdown." },
    ],
    quench: [
        { name: "Water Bucket", cost: 0,    desc: "No quenching bar slowdown." },
        { name: "Oil Bath",     cost: 120,  desc: "+1 quenching bar slowdown." },
        { name: "Large Tank",   cost: 800,  desc: "+2 quenching bar slowdown." },
        { name: "Cryo Chamber", cost: 4000, desc: "+3 quenching bar slowdown." },
    ],
    furnace: [
        { name: "Clay Furnace",        cost: 0,      desc: "Normalize loss: 18-28%." },
        { name: "Stone Furnace",       cost: 80,     desc: "Normalize loss: 16-25%." },
        { name: "Brick Furnace",       cost: 600,    desc: "Normalize loss: 14-22%." },
        { name: "Iron Furnace",        cost: 3000,   desc: "Normalize loss: 12-19%." },
        { name: "Steel Furnace",       cost: 8000,   desc: "Normalize loss: 11-17%." },
        { name: "Obsidian Furnace",    cost: 18000,  desc: "Normalize loss: 10-15%." },
        { name: "Runic Furnace",       cost: 35000,  desc: "Normalize loss: 9-13%." },
        { name: "Dragonstone Furnace", cost: 65000,  desc: "Normalize loss: 8-11%." },
        { name: "Eternal Furnace",     cost: 110000, desc: "Normalize loss: 7-9%." },
    ],
};

// --- Customer Types ---
// Derived tier thresholds for customer minQ requirements
var TIER_FINE_MIN = TIERS.find(function(t) { return t.label === "Fine"; }).scoreMin;
var TIER_POOR_MIN = TIERS.find(function(t) { return t.label === "Poor"; }).scoreMin;
var TIER_REFINED_MIN = TIERS.find(function(t) { return t.label === "Refined"; }).scoreMin;

var CUST_TYPES = [
    { id: "adventurer", name: "Nervous Adventurer", icon: "\u2694",      minQuality: 0,              budgetLow: 0.55, budgetHigh: 0.75, patience: 4, greet: ["First dungeon tomorrow.", "Something pointy please.", "Any payment plans?"] },
    { id: "wizard",     name: "Arcane Wizard",      icon: "\uD83E\uDDD9", minQuality: TIER_FINE_MIN,    budgetLow: 1.0,  budgetHigh: 1.30, patience: 3, greet: ["I require only the finest.", "Ordinary steel bores me.", "Impress me, smith."] },
    { id: "knight",     name: "Town Knight",        icon: "\uD83D\uDEE1", minQuality: 0,              budgetLow: 0.80, budgetHigh: 1.05, patience: 4, greet: ["Something befitting a knight.", "Polish matters as much as edge.", "Make it worthy."] },
    { id: "goblin",     name: "Goblin Merchant",    icon: "\uD83D\uDC7A", minQuality: 0,              budgetLow: 0.55, budgetHigh: 0.70, patience: 2, greet: ["Goblin pay fair. Maybe.", "Goblin not picky.", "You sell, goblin buy."] },
    { id: "guard",      name: "Town Guard",         icon: "\uD83C\uDFF0", minQuality: 0,              budgetLow: 0.65, budgetHigh: 0.85, patience: 3, greet: ["Won't break on me, right?", "Budget's tight this month.", "Just needs to be reliable."] },
    { id: "noble",      name: "Visiting Noble",     icon: "\uD83D\uDC51", minQuality: TIER_FINE_MIN,    budgetLow: 1.10, budgetHigh: 1.45, patience: 2, greet: ["I hear you supply the crown.", "Only the finest will do.", "Quality above all else."] },
    { id: "bounty",     name: "Bounty Hunter",      icon: "\uD83C\uDFF9", minQuality: 0,              budgetLow: 0.85, budgetHigh: 1.10, patience: 3, greet: ["Make it quick, I'm on a contract.", "Needs to hold up in a fight.", "No frills, just reliable."] },
    { id: "courier",    name: "Royal Courier",      icon: "\uD83D\uDCEF", minQuality: TIER_REFINED_MIN, budgetLow: 1.30, budgetHigh: 1.70, patience: 2, greet: ["The crown expects nothing but the best.", "I have coin. Do you have quality?", "Impress me or I ride on."] },
    { id: "merchant",   name: "Traveling Merchant",  icon: "\uD83E\uDDF3", minQuality: 0,              budgetLow: 0.70, budgetHigh: 0.90, patience: 4, greet: ["I've bought blades in a dozen cities.", "I can wait. I'm patient.", "Let's find a number we both like."] },
    { id: "dwarf",      name: "Dwarven Smith",      icon: "\u26CF\uFE0F", minQuality: TIER_POOR_MIN,    budgetLow: 0.90, budgetHigh: 1.15, patience: 4, greet: ["Decent work. For a human.", "I know my craft. Don't try to fool me.", "I'll pay fair for fair quality."] },
    { id: "pirate",     name: "Pirate",             icon: "\uD83C\uDFF4\u200D\u2620\uFE0F", minQuality: 0, budgetLow: 0.75, budgetHigh: 1.0, patience: 3, greet: ["Arrr, I need something fierce.", "Don't cross me on price, smith.", "Make it sharp and we'll get along."] },
    { id: "elf",        name: "Elven Ranger",       icon: "\uD83E\uDDDD", minQuality: TIER_FINE_MIN,    budgetLow: 0.95, budgetHigh: 1.25, patience: 3, greet: ["Craftsmanship matters more than price.", "I've carried the same blade for a century.", "This had better be worth the trip."] },
];

// --- Customer Moods ---
var MOODS = [
    { label: "Generous",  icon: "\uD83D\uDE0A", mult: 1.0 },
    { label: "Neutral",   icon: "\uD83D\uDE10", mult: 0.8 },
    { label: "Impatient", icon: "\uD83D\uDE24", mult: 0.6 },
    { label: "Impressed", icon: "\uD83E\uDD29", mult: 1.25 },
];

// --- Royal Quest Names ---
var ROYAL_NAMES = [
    "The King's Steward", "Lord Commander Aldric", "Royal Armourer",
    "Queen's Champion", "The High Marshal", "Crown Treasurer", "Grand Inquisitor",
];

// --- Event Tag Colors ---
var TAG_COLORS = {
    HAZARD: "#ef4444",
    EVENT: "#c084fc",
    MARKET: "#4ade80",
    MERCHANT: "#fbbf24",
    QUIET: "#8a7a64",
};

// --- Game Over Epitaphs ---
var EPITAPHS = [
    { threshold: 75000, text: "A legend for the ages. The king had him killed out of jealousy." },
    { threshold: 40000, text: "The finest blade in the kingdom. Shame about the politics." },
    { threshold: 20000, text: "Forged steel that outlasted kings. The king did not appreciate the irony." },
    { threshold: 10000, text: "A master smith. Died as he lived \u2014 owing the crown nothing." },
    { threshold: 4000,  text: "Good with a hammer. Less good with royalty." },
    { threshold: 1500,  text: "Showed real promise. The headsman showed up first." },
    { threshold: 500,   text: "Made a few decent blades. The rats got the rest." },
    { threshold: 100,   text: "Barely had time to light the forge." },
    { threshold: 0,     text: "The anvil was wobbly. So was the plan." },
];

// --- Leaderboard Fake Smiths ---
var FAKE_SMITHS = [
    { name: "Aldric the Undying",    gold: 91200 },
    { name: "Marta Ironforge",       gold: 63400 },
    { name: "The Silent Hammer",     gold: 41800 },
    { name: "Brother Caius",         gold: 27600 },
    { name: "Lady Vex of the North", gold: 16900 },
    { name: "Gorm Splitstone",       gold: 8800 },
    { name: "Thessaly Bright",       gold: 4300 },
    { name: "One-Arm Dunric",        gold: 2100 },
    { name: "Young Pip",             gold: 890 },
    { name: "The Nameless One",      gold: 380 },
];

// --- Late Night Toasts ---
var LATE_TOASTS = [
    { msg: "IT'S PAST MIDNIGHT\nYou can't take any more actions today. Get some sleep.", icon: "\uD83C\uDF19", color: "#fb923c" },
    { msg: "THE FORGE GROWS COLD\nMidnight has passed. Rest now, smith.",                icon: "\uD83C\uDF19", color: "#fb923c" },
];

// --- Scrap Toasts ---
var SCRAP_TOASTS = [
    "BACK TO THE PILE\nAt least the rats will be warm.",
    "INTO THE SCRAP BIN\nA noble end for a wobbly blade.",
    "ABANDONED\nThe metal will not miss you.",
    "SCRAPPED\nNot every blade was meant to be.",
];

// --- FTUE (First Time User Experience) Toasts ---
var FTUE_TOASTS = [
    { title: "TIME & STAMINA",   msg: "Every action costs hours \u2014 forging, resting, promoting. Sleep ends the day and starts a new one.\n\nOnce the clock passes midnight you can no longer take any actions except Sleep. Plan your day accordingly.\n\nStamina limits how many forge sessions you can do. When you run out, you must Rest or Sleep before you can forge again." },
    { title: "THE FORGE",        msg: "Forging has three steps: Heat, Hammer, Quench. Each is a quick-time event where you click at the right moment.\n\nYour stats and equipment upgrades affect how fast the needle moves. Better gear = more forgiving timing." },
    { title: "HEATING",          msg: "Click when the needle is in the green zone. Hit the peak for bonus hammer strikes. Miss the zone entirely and you get fewer hits.\n\nThe bar moves faster for harder weapons and materials. Precision stat and Forge upgrade slow it down." },
    { title: "HAMMERING",        msg: "Click when the needle is near center. PERFECT gives the most quality, GOOD gives some, MISS loses quality.\n\nYou get 3-5 strikes depending on your heat result. Technique stat and Hammer upgrade increase your points per hit." },
    { title: "STRESS & SESSIONS", msg: "Each hammer session adds one stress pip. At max stress there is a chance the weapon shatters.\n\nUse Normalize to trade some quality for reduced stress, letting you keep forging. Or just Quench early with what you have." },
    { title: "QUENCHING",        msg: "The final step. Three tiers: center = +5 quality, middle band = no change, outer edge = quality loss. Miss entirely and the weapon is destroyed.\n\nA Furnace upgrade reduces normalize quality loss." },
    { title: "SELLING",          msg: "Customers visit daily and offer to buy whatever is on your shelf. You can counter their offer or accept.\n\nRoyal Decrees pay big bonuses but missing the deadline costs reputation. Hit zero reputation and it is game over." },
    { title: "THE MARKET",       msg: "The Shop button opens the Market where you can buy materials, unlock weapon blueprints, and upgrade your equipment.\n\nUpgrades to your Forge, Anvil, Hammer, Quench, and Furnace improve your forging capabilities." },
    { title: "OPTIONS & SOUND",  msg: "The Options button lets you toggle background music and adjust volume for SFX and music separately.\n\nIf the music is not your thing, turn it off in there." },
];

// --- Ambient Audio Config ---
var AMBIENT_AUDIO = {
    ambientFile:   "sAmbient1.mp3",
    fireBurstFile: "sFireStart.mp3",
    fireLoopFile:  "sAmbientFire.mp3",
    ambientVol:    0.12,
    fireBurstVol:  0.40,
    fireLoopVol:   0.08,
    fadeInSec:     0.8,
    fadeOutSec:    0.8,
    // Hammer ambient ping (loops during forge with timing deviation)
    hammerFiles:      ["sHammerPing1.mp3", "sHammerPing2.mp3"],
    hammerVol:        0.06,
    hammerIntervalMs: 1800,
    hammerDeviationMs: 400,
    hammerFadeInSec:  0.6,
};

// --- Fire VFX Config ---
var FIRE_FX = {
    // Canvas resolution (pixelated, scaled up by display size)
    canvasW: 80,
    canvasH: 60,
    // Display size (CSS pixels)
    displayW: 225,
    displayH: 150,
    // Position within scene container (CSS)
    posLeft: "5%",
    posTop: "21%",
    zIndex: 3,
    // Coal bed
    coalRX: 30,
    coalRY: 6,
    // Main oval (bottom)
    ovalMainRX: 15,
    ovalMainRY: 9,
    // Top oval (smaller, overlapping)
    ovalTopRX: 10,
    ovalTopRY: 6,
    // Spark emitter
    spawnRadius: 10,
    maxParticles: 100,
    // Flare-up startup (frames at ~60fps)
    flareRampFrames: 30,
    flareFlashFrames: 12,
    flareSettleFrames: 40,
};

// --- Fire VFX Config (Mobile) ---
var FIRE_FX_MOBILE = {
    canvasW: 80,
    canvasH: 60,
    displayW: 235,
    displayH: 155,
    posLeft: "6%",
    posTop: "22%",
    zIndex: 3,
    coalRX: 30,
    coalRY: 6,
    ovalMainRX: 15,
    ovalMainRY: 9,
    ovalTopRX: 10,
    ovalTopRY: 6,
    spawnRadius: 10,
    maxParticles: 100,
    flareRampFrames: 30,
    flareFlashFrames: 12,
    flareSettleFrames: 40,
};

// --- Centralized Balance Table ---
var BALANCE = {
    // Forge session time cost (hours)
    sessCostNormal: 2,

    // (heatWinLo / heatWinHi removed — peak + zone widths now in HEAT_TIERS)
    // (quenchPerfect / quenchGood / quenchPoorExtra removed — zone widths now in QUENCH_TIERS)
    // (QTE needle speeds extracted to QTE_SPEED in qteConstants.js)

    // Base hammer strikes per session (before heat bonus)
    baseStrikes: 3,

    // Finish weapon XP formula: (finishXpBase + weapon.difficulty * finishXpPerDiff) * tier.xpMultiplier
    finishXpBase: 15,
    finishXpPerDiff: 5,

    // (quench zone multipliers removed — zone widths now in QUENCH_TIERS)

    // Normalize quality loss per furnace level [index = upgrades.furnace]
    normalizeLossLo: [0.18, 0.16, 0.14, 0.12, 0.11, 0.10, 0.09, 0.08, 0.07],
    normalizeLossHi: [0.28, 0.25, 0.22, 0.19, 0.17, 0.15, 0.13, 0.11, 0.09],

    // Stress shatter chances
    shatterChanceMax: 0.50,
    shatterChanceHigh: 0.33,

    // Max promote actions per day
    maxPromoteUses: 3,
};

// ============================================================
// Plugin-style API — single export, one entry point
// ============================================================
var GameConstants = {
    // QTE & Layout
    QTE_COLS: QTE_COLS,
    QTE_FLASH_MS: QTE_FLASH_MS,
    QTE_W: QTE_W,
    COL_W: COL_W,
    STRESS_MAX: STRESS_MAX,
    // (HAMMER_WIN / QUENCH_WIN removed — zone widths in tier tables)

    // Pressure
    PRESSURE_PER_DAY: PRESSURE_PER_DAY,
    MAX_PRESSURE: MAX_PRESSURE,
    PRESSURE_SPIKE_CHANCE: PRESSURE_SPIKE_CHANCE,
    PRESSURE_SPIKE_MAX: PRESSURE_SPIKE_MAX,

    // Day & Economy
    WAKE_HOUR: WAKE_HOUR,
    BASE_DAILY_CUSTOMERS: BASE_DAILY_CUSTOMERS,
    STARTING_GOLD: STARTING_GOLD,
    BASE_STAMINA: BASE_STAMINA,
    MAT_DESTROY_RECOVERY: MAT_DESTROY_RECOVERY,
    MAT_SCRAP_RECOVERY: MAT_SCRAP_RECOVERY,
    REST_HOUR_LIMIT: REST_HOUR_LIMIT,
    MAX_HOUR: MAX_HOUR,

    // Data Tables
    HEAT_TIERS: HEAT_TIERS,
    HAMMER_TIERS: HAMMER_TIERS,
    QUENCH_TIERS: QUENCH_TIERS,
    QTE_COLOR_RAMP: QTE_COLOR_RAMP,
    QTE_SPEED: QTE_SPEED,
    PHASES: PHASES,
    SMITH_RANKS: SMITH_RANKS,
    TIERS: TIERS,
    WEAPONS: WEAPONS,
    MATS: MATS,
    UPGRADE_COLORS: UPGRADE_COLORS,
    STATS_DEF: STATS_DEF,
    STAT_META: STAT_META,
    UPGRADES: UPGRADES,
    CUST_TYPES: CUST_TYPES,
    MOODS: MOODS,
    ROYAL_NAMES: ROYAL_NAMES,
    TAG_COLORS: TAG_COLORS,
    EPITAPHS: EPITAPHS,
    FAKE_SMITHS: FAKE_SMITHS,
    LATE_TOASTS: LATE_TOASTS,
    SCRAP_TOASTS: SCRAP_TOASTS,
    FTUE_TOASTS: FTUE_TOASTS,

    // Derived Tier Thresholds
    TIER_FINE_MIN: TIER_FINE_MIN,
    TIER_POOR_MIN: TIER_POOR_MIN,
    TIER_REFINED_MIN: TIER_REFINED_MIN,

    // Balance
    BALANCE: BALANCE,

    // Ambient Audio
    AMBIENT_AUDIO: AMBIENT_AUDIO,

    // Fire VFX
    FIRE_FX: FIRE_FX,
    FIRE_FX_MOBILE: FIRE_FX_MOBILE,
};

export default GameConstants;