// ============================================================
// index.js — Wobbly Anvil Ability Registry
// Imports all ability definitions and exports a flat array
// for bulk registration with AbilityManager.
//
// ADDING A NEW ABILITY:
//   1. Create the ability file in the appropriate subfolder
//   2. Import it here
//   3. Add it to ALL_ABILITIES array
//   That's it. No other files need to change.
//
// SUBFOLDER CONVENTION:
//   morning/   — triggered by GAME.DAY.MORNING_PHASE
//   reactive/  — triggered by gameplay actions
// ============================================================

// --- Morning Abilities ---
// import FestivalAbility from "./morning/festival.js";
// import MerchantVisitAbility from "./morning/merchantVisit.js";
// import RatInfestationAbility from "./morning/ratInfestation.js";

// --- Reactive Abilities ---
// import HotStreakAbility from "./reactive/hotStreak.js";
// import ShameDebuffAbility from "./reactive/shameDebuff.js";

// ============================================================
// Flat array — passed to AbilityManager.registerAll()
// ============================================================

var ALL_ABILITIES = [
    // FestivalAbility,
    // MerchantVisitAbility,
    // RatInfestationAbility,
    // HotStreakAbility,
    // ShameDebuffAbility,
];

export default ALL_ABILITIES;