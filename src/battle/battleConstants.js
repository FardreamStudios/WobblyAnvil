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

// --- ATB / Pip Config ---
var ATB = {
    pipsPerCombatant:   3,          // everyone gets 3 pips
    pipFillMs:          350,       // base ms to fill one pip at speed 1.0 (actual = pipFillMs / atbSpeed)
    resumeEaseMs:       400,        // soft ease-in on ATB resume after action cam
    freezeGlobal:       true,       // all ATB freezes when anyone is acting (cam or out-of-cam)
};

// --- Action Camera Config ---
var ACTION_CAM = {
    transitionInMs:     350,        // zoom-in duration
    transitionOutMs:    350,        // zoom-out duration
    dimOpacity:         0.12,       // opacity of inactive combatants
    activeScale:        2.0,        // scale of active combatants in center stage
    sparkHoldMs:        300,        // how long clash spark shows on resolve
};

// --- Exchange Config ---
var EXCHANGE = {
    resolveHoldMs:      500,        // pause on resolve before next beat
    counterDelayMs:     300,        // delay before enemy counter starts
};

// --- Pip Costs ---
// All actions cost 1 pip. Attack entering action cam = turn ends when cam resolves.
var PIP_COSTS = {
    attack:     1,          // enters action cam, 1 attack per out-of-cam turn max
    defend:     1,          // out-of-cam: defense buff for next exchange
    item:       1,          // out-of-cam: instant, no action cam
    pass:       1,          // yields initiative, costs a pip (not free)
    flee:       1,          // out-of-cam: roll flee chance
};

// --- Formation-View Action Buttons ---
var ACTIONS = [
    { id: "attack",  label: "ATK",  color: "#60a5fa", bg: "#1a1428" },
    { id: "defend",  label: "DEF",  color: "#4ade80", bg: "#0a1a14" },
    { id: "item",    label: "ITEM", color: "#f59e0b", bg: "#1a1408" },
    { id: "flee",    label: "FLEE", color: "#8a7a64", bg: "#141009" },
];

// --- In-Cam Action Buttons (defender response) ---
// Separate from formation-view to preserve muscle memory.
// No flee option in-cam. Defend = buff for remaining beats this exchange.
var IN_CAM_ACTIONS = [
    { id: "attack",  label: "ATK",  color: "#60a5fa", bg: "#1a1428" },
    { id: "defend",  label: "DEF",  color: "#4ade80", bg: "#0a1a14" },
    { id: "item",    label: "ITEM", color: "#f59e0b", bg: "#1a1408" },
    { id: "pass",    label: "PASS", color: "#8a7a64", bg: "#141009" },
];

// --- Layout Config (bottom zone widths, scene/bottom flex) ---
// All vw values — change here, CSS picks them up via custom properties.
var LAYOUT = {
    openW:          "16vw",         // open real estate zone width
    actionsW:       "18vw",         // action menu zone width
    sceneFlex:      1.8,            // scene zone flex weight
    bottomFlex:     1,              // bottom zone flex weight
    cardMinW:       "14vw",         // combatant card min-width
    hpBarW:         "8vw",          // HP bar width inside card
    atbBarH:        "0.9vh",        // ATB gauge bar height
    atbLabelW:      "7vw",          // ATB label min-width
    spriteSize:     "clamp(32px, 7vw, 52px)",  // combatant sprite display size
};

// --- Sprite Configs for Battle ---
var PUB = "";  // process.env.PUBLIC_URL resolved at runtime by React
var BATTLE_SPRITES = {
    fairyIdle: {
        sheet:    "/images/anim/waFairyIdleSS.png",
        frames:   5,
        frameW:   380,
        frameH:   380,
        fps:      1.0,
        cols:     5,
    },
    enemyBag: {
        sheet:    "/images/enemy/EnemyBag.png",
        frames:   1,
        frameW:   0,    // 0 = use natural image size (static)
        frameH:   0,
        fps:      0,
        cols:     1,
    },
    fairyCombatIdle: {
        sheet:    "/images/anim/battle/npc/waFairyCombatIdleSS.png",
        frames:   5,
        frameW:   380,
        frameH:   380,
        fps:      1.0,
        cols:     5,
    },
    fairyCombatKnockdown: {
        sheet:    "/images/anim/battle/npc/waFairyKnockdownSS.png",
        frames:   5,
        frameW:   380,
        frameH:   380,
        fps:      1.0,
        cols:     5,
    },
};

// --- Combat Test Data (dev/prototype only) ---
var TEST_PARTY = [
    {
        id: "smith",
        name: "Smith",
        spriteKey: "fairyIdle",
        maxHP: 80,
        currentHP: 72,
        atbSpeed: 0.4,
        attackPower: 12,
        defensePower: 8,
        skills: ["basic_attack", "power_strike"],
        items: [
            { id: "health_potion",  name: "Health Potion",  icon: "\u2764\uFE0F",       description: "Restores 25 HP",        effect: { type: "heal", value: 25 }, qty: 2 },
            { id: "atk_brew",       name: "Atk Brew",       icon: "\u2694\uFE0F",       description: "+4 attack for 2 turns",  effect: { type: "buff", stat: "attackPower", value: 4, turns: 2 }, qty: 1 },
            { id: "throwing_knife", name: "Throwing Knife", icon: "\uD83D\uDDE1\uFE0F", description: "Deals 15 damage",        effect: { type: "damage", value: 15 }, qty: 1 },
        ],
    },
    {
        id: "fairy",
        name: "Fairy",
        spriteKey: "fairyCombatIdle",
        maxHP: 50,
        currentHP: 50,
        atbSpeed: 0.3,
        attackPower: 6,
        defensePower: 5,
        skills: ["basic_attack"],
        items: [
            { id: "health_potion", name: "Health Potion", icon: "\u2764\uFE0F", description: "Restores 25 HP",              effect: { type: "heal", value: 25 }, qty: 1 },
            { id: "smoke_bomb",    name: "Smoke Bomb",    icon: "\uD83D\uDCA8", description: "-3 attack on enemy, 2 turns", effect: { type: "debuff_enemy", stat: "attackPower", value: 3, turns: 2 }, qty: 1 },
        ],
    },
];

var TEST_ENEMIES = [
    {
        id: "raccoon",
        name: "Raccoon",
        spriteKey: "enemyBag",
        maxHP: 40,
        currentHP: 40,
        atbSpeed: 0.28,
        attackPower: 8,
        defensePower: 3,
        skills: ["scavenger_combo"],
    },
    {
        id: "trashbag",
        name: "Trash Bag",
        spriteKey: "enemyBag",
        maxHP: 30,
        currentHP: 21,
        atbSpeed: 0.22,
        attackPower: 6,
        defensePower: 2,
        skills: ["scavenger_combo"],
    },
];

// --- Battle Phases ---
var BATTLE_PHASES = {
    ATB_RUNNING:      "atb_running",
    ACTION_SELECT:    "action_select",       // formation-view: party member picks action
    ACTION_CAM_IN:    "action_cam_in",       // sliding combatants to center stage
    CAM_TURN_START:   "cam_turn_start",      // determine whose swing, check pips
    CAM_WAIT_ACTION:  "cam_wait_action",     // player: show in-cam menu. enemy: auto-pick
    CAM_TELEGRAPH:    "cam_telegraph",       // enemy wind-up glow before their swing
    CAM_SWING:        "cam_swing",           // QTE active — active swinger hits other side
    CAM_RESOLVE:      "cam_resolve",         // brief pause after swing before next turn
    ACTION_CAM_OUT:   "action_cam_out",      // sliding back to formation
};

// --- Choreography Config (anim states, hit reactions, screen FX) ---
var CHOREOGRAPHY = {
    // Anim state durations (ms)
    windUpMs:           200,
    strikeMs:           150,
    returnMs:           250,
    hitMs:              300,
    flinchMs:           200,
    braceMs:            200,
    telegraphMs:        300,    // should match EXCHANGE.counterDelayMs
    koMs:               600,

    // Lunge distances (vw)
    lungeVw:            3,
    knockbackVw:        4,

    // Damage numbers
    dmgPopMs:           800,    // total lifetime
    dmgFloatVh:         3,      // drift distance
    dmgScaleOvershoot:  1.3,    // pop scale peak

    // Hit flash
    flashMs:            80,

    // Screen shake presets
    shakeLight:         { px: 2,  ms: 100 },
    shakeMedium:        { px: 4,  ms: 200 },
    shakeHeavy:         { px: 6,  ms: 300 },
    shakeKO:            { px: 10, ms: 400 },
};

// --- Battle Items — definition table ---
// Effect types V1: heal, buff, debuff_enemy, damage.
// Host maps inventory into this shape for BattleConfig.
var BATTLE_ITEMS = [
    { id: "health_potion",  name: "Health Potion",  icon: "\u2764\uFE0F",       description: "Restores 25 HP",              effect: { type: "heal", value: 25 } },
    { id: "atk_brew",       name: "Atk Brew",       icon: "\u2694\uFE0F",       description: "+4 attack for 2 turns",       effect: { type: "buff", stat: "attackPower", value: 4, turns: 2 } },
    { id: "def_salve",      name: "Def Salve",      icon: "\uD83D\uDEE1\uFE0F", description: "+3 defense for 2 turns",      effect: { type: "buff", stat: "defensePower", value: 3, turns: 2 } },
    { id: "smoke_bomb",     name: "Smoke Bomb",     icon: "\uD83D\uDCA8",       description: "-3 attack on enemy, 2 turns", effect: { type: "debuff_enemy", stat: "attackPower", value: 3, turns: 2 } },
    { id: "throwing_knife", name: "Throwing Knife", icon: "\uD83D\uDDE1\uFE0F", description: "Deals 15 damage",             effect: { type: "damage", value: 15 } },
];

// ============================================================
// Export
// ============================================================
var BattleConstants = {
    BATTLE_TRANSITION: BATTLE_TRANSITION,
    ATB: ATB,
    ACTION_CAM: ACTION_CAM,
    EXCHANGE: EXCHANGE,
    PIP_COSTS: PIP_COSTS,
    LAYOUT: LAYOUT,
    BATTLE_SPRITES: BATTLE_SPRITES,
    CHOREOGRAPHY: CHOREOGRAPHY,
    TEST_PARTY: TEST_PARTY,
    TEST_ENEMIES: TEST_ENEMIES,
    ACTIONS: ACTIONS,
    IN_CAM_ACTIONS: IN_CAM_ACTIONS,
    BATTLE_PHASES: BATTLE_PHASES,
    BATTLE_ITEMS: BATTLE_ITEMS,
};

export default BattleConstants;