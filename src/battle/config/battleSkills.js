// ============================================================
// battleSkills.js — Skill & Beat Definitions
//
// Game data catalog: what attacks exist, their QTE configs,
// and per-beat choreography/damage. System rules stay in
// battleConstants.js — this file is pure data tables.
//
// Each skill = QTE ring config + beats array (1 ring = 1 beat).
// Special skills (skillType "special") use the takeover protocol
// instead — see SpecialSkillSystemSpec.md.
// ============================================================

import StarfallBeam from "../skills/starfallBeam.js";

// --- Player Skills ---
var PLAYER_SKILLS = {
    basic_attack: {
        id:               "basic_attack",
        name:             "Slash",
        type:             "circle_timing",
        difficulty:       "normal",
        apCost:           20,
        rings:            2,
        speeds:           [1.0, 1.0],
        delays:           [0, 400],
        shrinkDurationMs: 800,
        zoneBonus:        0.15,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "ATTACK!",
        beats: [
            { check: "ring", damage: 3,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit"    },
            { check: "ring", damage: 5,  atkAnim: "strike", tgtReact: "hit",    shake: "medium", sfx: "impact" },
        ],
    },

    power_strike: {
        id:               "power_strike",
        name:             "Forge Blow",
        type:             "circle_timing",
        difficulty:       "normal",
        apCost:           30,
        rings:            4,
        speeds:           [0.8, 1.0, 1.0, 0.6],
        delays:           [0, 500, 400, 800],
        shrinkDurationMs: 800,
        zoneBonus:        0.10,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "FORGE BLOW!",
        beats: [
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: null,     sfx: "hit"    },
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: null,     sfx: "hit"    },
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit"    },
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact", finisher: true },
        ],
    },

    anvils_verdict: {
        id:               "anvils_verdict",
        name:             "Anvil's Verdict",
        type:             "circle_timing",
        difficulty:       "hard",
        apCost:           40,
        rings:            5,
        speeds:           [1.4, 1.4, 0.8, 1.4, 0.5],
        delays:           [0, 200, 600, 200, 800],
        shrinkDurationMs: 750,
        zoneBonus:        0.08,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "VERDICT!",
        beats: [
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit"    },
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit"    },
            { check: "ring", damage: 8,  atkAnim: "strike", tgtReact: "hit",    shake: "medium", sfx: "impact" },
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit"    },
            { check: "ring", damage: 16, atkAnim: "strike", tgtReact: "hit",    shake: "ko",     sfx: "impact", finisher: true },
        ],
    },

    fairy_barrage: {
        id:               "fairy_barrage",
        name:             "Spark Flurry",
        type:             "circle_timing",
        difficulty:       "normal",
        apCost:           30,
        rings:            4,
        speeds:           [1.8, 1.8, 1.8, 0.5],
        delays:           [0, 150, 150, 600],
        shrinkDurationMs: 700,
        zoneBonus:        0.12,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "SPARK!",
        beats: [
            { check: "ring", damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit"    },
            { check: "ring", damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit"    },
            { check: "ring", damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit"    },
            { check: "ring", damage: 10, atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact", finisher: true },
        ],
    },

    starfall_beam: StarfallBeam,
};

// --- Enemy Skills ---
var ENEMY_SKILLS = {
    enemy_basic: {
        id:               "enemy_basic",
        name:             "Strike",
        type:             "circle_timing",
        difficulty:       "easy",
        apCost:           20,
        rings:            2,
        speeds:           [1.0, 1.0],
        delays:           [0, 400],
        shrinkDurationMs: 800,
        zoneBonus:        0.15,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "DEFEND!",
        beats: [
            { check: "ring", damage: 5, atkAnim: "strike", tgtReact: "hit", shake: "light",  sfx: "hit",
                blockable: true, dodgeable: true },
            { check: "ring", damage: 5, atkAnim: "strike", tgtReact: "hit", shake: "medium", sfx: "hit",
                blockable: true, dodgeable: true },
        ],
    },

    rat_bite: {
        id:               "rat_bite",
        name:             "Bite",
        type:             "circle_timing",
        difficulty:       "easy",
        apCost:           20,
        rings:            2,
        speeds:           [1.0, 1.2],
        delays:           [0, 300],
        shrinkDurationMs: 800,
        zoneBonus:        0.15,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "DEFEND!",
        beats: [
            { check: "ring", damage: 6, atkAnim: "strike", tgtReact: "hit", shake: "light",  sfx: "hit",
                blockable: true, dodgeable: true },
            { check: "ring", damage: 6, atkAnim: "strike", tgtReact: "hit", shake: "medium", sfx: "hit",
                blockable: true, dodgeable: true },
        ],
    },

    scavenger_combo: {
        id:               "scavenger_combo",
        name:             "Scavenger Combo",
        type:             "circle_timing",
        difficulty:       "normal",
        apCost:           30,
        rings:            3,
        speeds:           [1.0, 1.2, 0.6],
        delays:           [0, 300, 800],
        shrinkDurationMs: 800,
        zoneBonus:        0.15,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "DEFEND!",
        beats: [
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring", damage: 6,  atkAnim: "strike", tgtReact: "hit",    shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring", damage: 10, atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact",
                blockable: true,  dodgeable: true, finisher: true, comboMultiplier: 0.5 },
        ],
    },

    trash_golem_slam: {
        id:               "trash_golem_slam",
        name:             "Trash Slam",
        type:             "circle_timing",
        difficulty:       "hard",
        apCost:           40,
        rings:            5,
        speeds:           [0.8, 1.0, 1.2, 0.5, 2.0],
        delays:           [0, 300, 300, 1500, 100],
        shrinkDurationMs: 800,
        zoneBonus:        0.10,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "INCOMING!",
        beats: [
            { check: "ring",  damage: 6,  atkAnim: "strike",  tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring",  damage: 6,  atkAnim: "strike",  tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring",  damage: 6,  atkAnim: "strike",  tgtReact: "hit",    shake: "medium", sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring",  damage: 6,  atkAnim: "wind_up", tgtReact: "flinch", shake: null,     sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring",  damage: 10, atkAnim: "strike",  tgtReact: "hit",    shake: "ko",     sfx: "impact",
                blockable: false, dodgeable: true, unblockable: true, finisher: true, comboMultiplier: 0.75 },
        ],
    },

    flurry_combo: {
        id:               "flurry_combo",
        name:             "Flurry Combo",
        type:             "circle_timing",
        difficulty:       "hard",
        apCost:           40,
        rings:            7,
        speeds:           [1.6, 1.6, 1.6, 0.6, 1.6, 1.6, 0.6],
        delays:           [0, 150, 150, 500, 150, 150, 500],
        shrinkDurationMs: 700,
        zoneBonus:        0.12,
        targetRadius:     28,
        ringStartRadius:  70,
        label:            "FLURRY!",
        beats: [
            { check: "ring", damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring", damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring", damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring", damage: 10, atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact",
                blockable: true,  dodgeable: true, finisher: true },
            { check: "ring", damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring", damage: 4,  atkAnim: "strike", tgtReact: "flinch", shake: "light",  sfx: "hit",
                blockable: true,  dodgeable: true },
            { check: "ring", damage: 10, atkAnim: "strike", tgtReact: "hit",    shake: "heavy",  sfx: "impact",
                blockable: true,  dodgeable: true, finisher: true },
        ],
    },
};

// --- Beat Field Defaults ---
// Applied at runtime when a beat omits optional fields.
var BEAT_DEFAULTS = {
    check:          "ring",     // default check type (ring/swipe/circle)
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
    // Special skills use takeover protocol — no rings/beats to validate
    if (skill.skillType === "special") return { valid: true, warnings: [] };

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