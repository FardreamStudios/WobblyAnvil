// ============================================================
// battleLayout.js — Battle Layout Constants
//
// Single source of truth for all spatial values in battle:
//   STAGE          — fixed-ratio arena dimensions
//   BATTLE_SLOTS   — formation positions (stage-space pixels)
//   ACTION_CAM_SLOTS — engagement positions (stage-space pixels)
//   OVERLAY        — UI overlay sizing (viewport units)
//   SELECTION      — corner bracket indicator sizing
//   CHOREO_DISTANCES — spatial distances for choreography anims
//
// Imported by battleConstants.js (re-exported for compat)
// and directly by components that only need layout.
// ============================================================

// --- Stage Config (fixed-ratio character arena) ---
// Characters live on a fixed 960×540 stage that scales uniformly.
// Wider/taller devices see more BG bleed — character spacing is constant.
var STAGE = {
    designW:    960,            // stage width in design pixels
    designH:    540,            // stage height in design pixels (16:9)
    spriteSize: 104,            // character sprite size in stage pixels
    hpBarW:     64,             // HP bar width in stage pixels
};

// --- Formation Slot Positions (stage-space pixels) ---
// Origin = top-left of stage. Each slot = { x, y } center point.
// Front row closer to center, back row further out.
// Enemy on left side, party on right side.
var BATTLE_SLOTS = {
    enemy: {
        front: [
            { x: 250, y: 200 },
            { x: 180, y: 330 },
        ],
        back: [
            { x: 120, y: 180 },
            { x: 70,  y: 310 },
        ],
    },
    party: {
        front: [
            { x: 710, y: 200 },
            { x: 780, y: 330 },
        ],
        back: [
            { x: 840, y: 180 },
            { x: 890, y: 310 },
        ],
    },
};

// --- Action Cam Slot Positions (stage-space pixels) ---
// Where attacker and target slide to during engagement.
// centerY is the vertical anchor. gap is half-distance between them.
var ACTION_CAM_SLOTS = {
    centerX:    480,            // horizontal center of stage (960/2)
    centerY:    310,            // slightly below vertical center for visual weight
    gap:        80,             // half-distance between attacker and target (melee)
    rangedGap:  180,            // half-distance for ranged skills (attacker further back)
};

// --- Overlay Sizing (viewport units for UI anchored to screen edges) ---
var OVERLAY = {
    actionsW:       "18vw",         // action menu overlay width
    atbBarH:        "0.9vh",        // ATB gauge bar height
    atbLabelW:      "7vw",          // ATB label min-width
    spriteSize:     STAGE.spriteSize + "px",    // px string for CSS vars
    hpBarW:         STAGE.hpBarW + "px",        // px string for CSS vars
};

// --- Selection Indicator Config (corner brackets on selected/turn-owner) ---
var SELECTION = {
    cornerSize:     "10px",         // length of each corner line
    thickness:      "2px",          // line thickness
    selectedColor:  "#4ade80",      // green — selected target
    turnOwnerColor: "#f0e6c8",      // warm parchment — whose turn it is
    offset:         "-4px",         // inset from card edge (negative = outside)
};

// --- Choreography Distances (stage-space pixels) ---
// Spatial component of choreography — how far things move.
// Timing lives in battleConstants.js CHOREOGRAPHY.
var CHOREO_DISTANCES = {
    lungePx:            90,         // strike lunge toward opponent
    knockbackPx:        20,         // hit knockback away from opponent
    dodgePx:            35,         // dodge lateral shift
    flinchPx:           15,         // minor recoil on attacker (brace feedback)
    windUpPx:           20,         // lean back before striking
    dmgFloatPx:         30,         // damage number drift distance
    dmgScaleOvershoot:  1.3,        // pop scale peak
};

// ============================================================
// Export
// ============================================================
var BattleLayout = {
    STAGE: STAGE,
    BATTLE_SLOTS: BATTLE_SLOTS,
    ACTION_CAM_SLOTS: ACTION_CAM_SLOTS,
    OVERLAY: OVERLAY,
    SELECTION: SELECTION,
    CHOREO_DISTANCES: CHOREO_DISTANCES,
};

export default BattleLayout;