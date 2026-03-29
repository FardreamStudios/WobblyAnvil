// ============================================================
// battleConstants.js — Battle System Constants
//
// All tuning values for the battle system live here.
// Imported by battle components and App.js transition wiring.
// Separate from main constants.js to keep battle portable.
// ============================================================

// --- Battle Transition Config ---
var BATTLE_TRANSITION = {
    gridW:          160,                        // pixel grid columns (lower = chunkier)
    gridH:          90,                         // pixel grid rows
    dissolveMs:     400,                        // wipe-in duration (pixels cover screen)
    holdMs:         400,                        // solid color hold with flash text
    resolveMs:      400,                        // wipe-out duration (pixels clear)
    flashText:      "BATTLE!",                  // text during hold (null = skip)
    flashFontSize:  "clamp(18px, 5vw, 32px)",   // responsive flash text size
    flashColor:     "#f59e0b",                  // flash text color
    pixelColor:     "#0a0704",                  // dissolve pixel color (matches battle bg)
    fanfareDelayMs: 100,                        // delay before battle fanfare plays
};

// --- ATB Config ---
var ATB = {
    gaugeMax:           100,        // full gauge value
    resumeEaseMs:       400,        // soft ease-in on ATB resume after action cam
    pauseDuringMenu:    true,       // FF4 "wait" mode — freeze while action menu open
};

// --- Action Camera Config ---
var ACTION_CAM = {
    transitionInMs:     350,        // zoom-in duration
    transitionOutMs:    350,        // zoom-out duration
    dimOpacity:         0.12,       // opacity of inactive combatants
    activeScale:        1.2,        // scale of active combatants in center stage
    sparkHoldMs:        300,        // how long clash spark shows on resolve
};

// --- Exchange Config ---
var EXCHANGE = {
    resolveHoldMs:      500,        // pause on resolve before next beat
    counterDelayMs:     300,        // delay before enemy counter starts
    maxBeats:           2,          // max attack+defense pairs per exchange (V1 = 1)
};

// --- Combat Test Data (dev/prototype only) ---
var TEST_PARTY = [
    {
        id: "smith",
        name: "Smith",
        sprite: "\u2692\uFE0F",
        maxHP: 80,
        currentHP: 72,
        atbSpeed: 0.4,
        attackPower: 12,
        defensePower: 8,
    },
    {
        id: "fairy",
        name: "Fairy",
        sprite: "\uD83E\uDDDA",
        maxHP: 50,
        currentHP: 50,
        atbSpeed: 0.3,
        attackPower: 6,
        defensePower: 5,
    },
];

var TEST_ENEMIES = [
    {
        id: "raccoon",
        name: "Raccoon",
        sprite: "\uD83E\uDD9D",
        maxHP: 40,
        currentHP: 40,
        atbSpeed: 0.28,
        attackPower: 8,
        defensePower: 3,
    },
    {
        id: "trashbag",
        name: "Trash Bag",
        sprite: "\uD83D\uDDD1\uFE0F",
        maxHP: 30,
        currentHP: 21,
        atbSpeed: 0.22,
        attackPower: 6,
        defensePower: 2,
    },
];

// --- Action Button Definitions ---
var ACTIONS = [
    { id: "attack",  label: "ATK",  color: "#60a5fa", bg: "#1a1428" },
    { id: "defend",  label: "DEF",  color: "#4ade80", bg: "#0a1a14" },
    { id: "item",    label: "ITEM", color: "#f59e0b", bg: "#1a1408" },
    { id: "flee",    label: "FLEE", color: "#8a7a64", bg: "#141009" },
];

// --- Battle Phases ---
var BATTLE_PHASES = {
    ATB_RUNNING:      "atb_running",
    ACTION_SELECT:    "action_select",
    ACTION_CAM_IN:    "action_cam_in",
    QTE_ACTIVE:       "qte_active",
    RESOLVING:        "resolving",
    ENEMY_TELEGRAPH:  "enemy_telegraph",
    DEFENSE_QTE:      "defense_qte",
    ACTION_CAM_OUT:   "action_cam_out",
};

// ============================================================
// Export
// ============================================================
var BattleConstants = {
    BATTLE_TRANSITION: BATTLE_TRANSITION,
    ATB: ATB,
    ACTION_CAM: ACTION_CAM,
    EXCHANGE: EXCHANGE,
    TEST_PARTY: TEST_PARTY,
    TEST_ENEMIES: TEST_ENEMIES,
    ACTIONS: ACTIONS,
    BATTLE_PHASES: BATTLE_PHASES,
};

export default BattleConstants;