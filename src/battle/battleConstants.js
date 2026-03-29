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

// ============================================================
// Export
// ============================================================
var BattleConstants = {
    BATTLE_TRANSITION: BATTLE_TRANSITION,
};

export default BattleConstants;