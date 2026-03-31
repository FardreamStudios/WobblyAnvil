// ============================================================
// battleSkills.js — Skill & Beat Definitions
//
// Game data catalog: what attacks exist, their QTE configs,
// and per-beat choreography/damage. System rules stay in
// battleConstants.js — this file is pure data tables.
//
// Each skill = QTE ring config + beats array (1 ring = 1 beat).
// ============================================================

// --- Player Skills ---
var PLAYER_SKILLS = {
    basic_attack: {
        id:               "basic_attack",
        name:             "Slash",
        type:             "circle_timing",
        rings:            3,
        speeds:           [1.0, 1.0, 1.0],
        delays:           [0, 400, 400],
        shrinkDurationMs: 800,
        zoneBonus:        0.15,
        targetRadius:     36,
        ringStartRadius:  130,
        label:            "ATTACK!",
        beats: [
            { damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit"    },
            { damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit"    },
            { damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "medium", sfx: "impact" },
        ],
    },

    power_strike: {
        id:               "power_strike",
        name:             "Forge Blow",
        type:             "circle_timing",
        rings:            4,
        speeds:           [0.8, 1.0, 1.0, 0.6],
        delays:           [0, 500, 400, 800],
        shrinkDurationMs: 800,
        zoneBonus:        0.10,
        targetRadius:     36,
        ringStartRadius:  130,
        label:            "FORGE BLOW!",
        beats: [
            { damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: null,     sfx: "hit"    },
            { damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: null,     sfx: "hit"    },
            { damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit"    },
            { damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact", finisher: true },
        ],
    },
};

// --- Enemy Skills ---
var ENEMY_SKILLS = {
    rat_bite: {
        id:               "rat_bite",
        name:             "Bite",
        type:             "circle_timing",
        rings:            2,
        speeds:           [1.0, 1.2],
        delays:           [0, 300],
        shrinkDurationMs: 800,
        zoneBonus:        0.15,
        targetRadius:     36,
        ringStartRadius:  130,
        label:            "DEFEND!",
        beats: [
            { damage: 6, atkAnim: "strike", tgtReact: "hit", shake: "light",  sfx: "hit",
                blockable: true, dodgeable: true },
            { damage: 6, atkAnim: "strike", tgtReact: "hit", shake: "medium", sfx: "hit",
                blockable: true, dodgeable: true },
        ],
    },

    scavenger_combo: {
        id:               "scavenger_combo",
        name:             "Scavenger Combo",
        type:             "circle_timing",
        rings:            3,
        speeds:           [1.0, 1.2, 0.6],
        delays:           [0, 300, 800],
        shrinkDurationMs: 800,
        zoneBonus:        0.15,
        targetRadius:     36,
        ringStartRadius:  130,
        label:            "DEFEND!",
        beats: [
            { damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 10, atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact",
                blockable: true,  dodgeable: true, finisher: true, comboMultiplier: 0.5 },
        ],
    },

    trash_golem_slam: {
        id:               "trash_golem_slam",
        name:             "Trash Slam",
        type:             "circle_timing",
        rings:            5,
        speeds:           [0.8, 1.0, 1.2, 0.5, 2.0],
        delays:           [0, 300, 300, 1500, 100],
        shrinkDurationMs: 800,
        zoneBonus:        0.10,
        targetRadius:     36,
        ringStartRadius:  130,
        label:            "INCOMING!",
        beats: [
            { damage: 6,  atkAnim: "strike",  tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 6,  atkAnim: "strike",  tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 6,  atkAnim: "strike",  tgtReact: "hit",    shake: "medium", sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 6,  atkAnim: "wind_up", tgtReact: "flinch", shake: null,     sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 10, atkAnim: "strike",  tgtReact: "hit",    shake: "ko",     sfx: "impact",
                blockable: false, dodgeable: true, unblockable: true, finisher: true, comboMultiplier: 0.75 },
        ],
    },

    flurry_combo: {
        id:               "flurry_combo",
        name:             "Flurry Combo",
        type:             "circle_timing",
        rings:            7,
        speeds:           [1.6, 1.6, 1.6, 0.6, 1.6, 1.6, 0.6],
        delays:           [0, 150, 150, 500, 150, 150, 500],
        shrinkDurationMs: 700,
        zoneBonus:        0.12,
        targetRadius:     36,
        ringStartRadius:  130,
        label:            "FLURRY!",
        beats: [
            { damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 10, atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact",
                blockable: true,  dodgeable: true, finisher: true },
            { damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { damage: 10, atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact",
                blockable: true,  dodgeable: true, finisher: true },
        ],
    },
};

// --- Beat Field Defaults ---
// Applied at runtime when a beat omits optional fields.
var BEAT_DEFAULTS = {
    blockable:      true,
    dodgeable:      true,
    unblockable:    false,
    blockMult:      0.25,
    finisher:       false,
    comboMultiplier: null,   // null = no scaling. Number = damage * (1 + mult * comboCount)
};

// --- Validation ---
// Call on each skill at load time. Returns { valid, warnings[] }.
// BattleView can render a warning badge if warnings exist.
function validateSkill(skill) {
    var warnings = [];
    if (!skill.id)   warnings.push("Skill missing 'id'");
    if (!skill.beats) warnings.push(skill.id + ": missing 'beats' array");
    if (!skill.rings) warnings.push(skill.id + ": missing 'rings'");

    if (skill.beats && skill.rings && skill.beats.length !== skill.rings) {
        warnings.push(
            skill.id + ": beats.length (" + skill.beats.length +
            ") !== rings (" + skill.rings + ") — data mismatch!"
        );
    }

    if (warnings.length > 0) {
        console.warn("[BattleSkills] Validation warnings:", warnings);
    }

    return { valid: warnings.length === 0, warnings: warnings };
}

// Run validation on all skills at import time
(function() {
    var all = [PLAYER_SKILLS, ENEMY_SKILLS];
    all.forEach(function(table) {
        Object.keys(table).forEach(function(key) {
            validateSkill(table[key]);
        });
    });
})();

// --- Helpers ---
// Resolve a beat with defaults applied
function resolveBeat(beat) {
    return Object.assign({}, BEAT_DEFAULTS, beat);
}

// Look up a skill by id across both tables
function getSkill(skillId) {
    return PLAYER_SKILLS[skillId] || ENEMY_SKILLS[skillId] || null;
}

// ============================================================
// Export
// ============================================================
var BattleSkills = {
    PLAYER_SKILLS:  PLAYER_SKILLS,
    ENEMY_SKILLS:   ENEMY_SKILLS,
    BEAT_DEFAULTS:  BEAT_DEFAULTS,
    validateSkill:  validateSkill,
    resolveBeat:    resolveBeat,
    getSkill:       getSkill,
};

export default BattleSkills;