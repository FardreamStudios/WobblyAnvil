// ============================================================
// qteConstants.js — Wobbly Anvil QTE Data Tables
// Single source of truth for all QTE tuning data.
// Tier tables, color ramp, layout values, needle speeds.
// Zero logic. Zero side effects. Data only.
//
// Imported directly by QTE plugins and QTE Runner.
// Re-exported through GameConstants for backward compatibility.
//
// UE Analogy: Dedicated Data Table asset for the QTE subsystem.
// ============================================================

// --- QTE Layout ---
var QTE_COLS = 42;
var QTE_FLASH_MS = 700;
var QTE_W = 480;

// ============================================================
// Universal QTE Tier Tables
// All QTEs share the same 5-tier shape (PERFECT → GREAT → GOOD → POOR → BAD).
// Each tier defines its scoring zone width. Bar colors come from QTE_COLOR_RAMP
// by index (0=PERFECT, 1=GREAT, ...). A tier can override with its own
// hueStart/hueEnd/sat/lit if it needs a custom color.
//
// TIER FIELDS:
//   id        — String key used by scoring, SFX, and bus payloads
//   label     — Flash text shown to player on hit
//   color     — Accent color for UI (bubbles, flash border)
//   left      — Zone width in absolute position % (0–100), left of peak
//   right     — Zone width in absolute position % (0–100), right of peak
//   (optional) hueStart, hueEnd, sat, lit — override QTE_COLOR_RAMP for this tier
//
// RAMP FIELDS (QTE_COLOR_RAMP):
//   hueStart  — HSL hue degree at zone inner edge (closest to peak)
//   hueEnd    — HSL hue degree at zone outer edge (farthest from peak)
//   sat       — Saturation % for this zone's color ramp
//   lit       — Lightness % for this zone's color ramp
//
// RULES:
//   - 0 width = zone skipped (no columns rendered)
//   - 1 column = median color (midpoint of hueStart↔hueEnd)
//   - 2+ columns = gradient ramp from hueStart → hueEnd
//   - Boundary columns belong to the ENTERING (worse) zone
//   - peak is absolute position on the 0–100 scale
// ============================================================

// --- Shared QTE Bar Color Ramp (indexed by tier position: 0=PERFECT … 4=BAD) ---
var QTE_COLOR_RAMP = [
    { hueStart: 180, hueEnd: 180, sat: 70, lit: 55 },  // PERFECT — cyan
    { hueStart: 140, hueEnd: 100, sat: 65, lit: 55 },  // GREAT   — green
    { hueStart: 80,  hueEnd: 40,  sat: 60, lit: 55 },  // GOOD    — yellow
    { hueStart: 45,  hueEnd: 20,  sat: 65, lit: 50 },  // POOR    — orange
    { hueStart: 10,  hueEnd: 0,   sat: 70, lit: 50 },  // BAD     — red
];

// --- Heat QTE Tiers ---
// Needle sweeps left→right, sweet spot near the end.
// peak: 84 — center of the old heatWinLo(75)–heatWinHi(93) zone.
var HEAT_TIERS = {
    peak: 84,                                       // absolute position (0–100)
    tiers: [
        { id: "perfect", label: "PERFECT HEAT", color: "#fbbf24", left: 1.5,  right: 1.5  },
        { id: "great",   label: "GREAT HEAT",   color: "#4ade80", left: 4.5,  right: 1.5  },
        { id: "good",    label: "GOOD HEAT",    color: "#60a5fa", left: 9,    right: 0    },
        { id: "poor",    label: "POOR HEAT",    color: "#f87171", left: 14,   right: 0    },
        { id: "bad",     label: "BAD HEAT",     color: "#fb923c", left: 999,  right: 999  },
    ],
};

// --- Hammer QTE Tiers ---
// Needle bounces left↔right, sweet spot at center.
// POOR is 0/0 (skipped) — goes straight from GOOD to BAD.
var HAMMER_TIERS = {
    peak: 50,                                       // center of bar
    tiers: [
        { id: "perfect", label: "PERFECT!", color: "#fbbf24", left: 1.5,  right: 1.5  },
        { id: "great",   label: "GREAT",    color: "#4ade80", left: 4.5,  right: 4.5  },
        { id: "good",    label: "GOOD",     color: "#60a5fa", left: 10,   right: 10   },
        { id: "poor",    label: "POOR",     color: "#f87171", left: 0,    right: 0    },
        { id: "bad",     label: "MISS",     color: "#f87171", left: 999,  right: 999  },
    ],
};

// --- Quench QTE Tiers ---
// Needle bounces left↔right, sweet spot at center.
// POOR is 0/0 (skipped) — goes straight from GOOD to BAD.
var QUENCH_TIERS = {
    peak: 50,                                       // center of bar
    tiers: [
        { id: "perfect", label: "PERFECT! +5",  color: "#fbbf24", left: 1.5,  right: 1.5  },
        { id: "great",   label: "SOLID",         color: "#4ade80", left: 4.5,  right: 4.5  },
        { id: "good",    label: "GOOD",          color: "#60a5fa", left: 10,   right: 10   },
        { id: "poor",    label: "ROUGH",         color: "#f87171", left: 0,    right: 0    },
        { id: "bad",     label: "DESTROYED",     color: "#fb923c", left: 999,  right: 999  },
    ],
};

// --- QTE Needle Speed Tuning ---
// Base speed + random range for each phase's needle.
// heatAccelExponent controls heat needle acceleration curve.
var QTE_SPEED = {
    heatSpeedBase: 60,
    heatSpeedRange: 15,
    heatAccelExponent: 1.8,
    hammerSpeedBase: 210,
    hammerSpeedRange: 50,
    quenchSpeedBase: 175,
    quenchSpeedRange: 30,
};

// ============================================================
// Plugin-style API
// ============================================================
var QTEConstants = {
    QTE_COLS: QTE_COLS,
    QTE_FLASH_MS: QTE_FLASH_MS,
    QTE_W: QTE_W,
    QTE_COLOR_RAMP: QTE_COLOR_RAMP,
    HEAT_TIERS: HEAT_TIERS,
    HAMMER_TIERS: HAMMER_TIERS,
    QUENCH_TIERS: QUENCH_TIERS,
    QTE_SPEED: QTE_SPEED,
};

export default QTEConstants;