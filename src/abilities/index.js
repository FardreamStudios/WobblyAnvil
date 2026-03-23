// ============================================================
// index.js — Wobbly Anvil Ability Registry
// Imports all ability definitions and exports a flat array
// for bulk registration with AbilityManager.
//
// SIMPLE MORNING EVENTS: Defined as data rows in
// morningEventsTable.js, run through morningAbilityFactory.js.
// No individual files needed — just add a row to the table.
//
// COMPLEX ABILITIES (VFX sequences, custom state logic,
// reactive triggers): Individual files in morning/ or reactive/.
//
// ADDING A SIMPLE MORNING EVENT:
//   1. Add a row to morningEventsTable.js
//   That's it.
//
// ADDING A COMPLEX ABILITY:
//   1. Create the ability file in the appropriate subfolder
//   2. Import it below
//   3. Add it to COMPLEX_ABILITIES array
//
// SUBFOLDER CONVENTION:
//   morning/   — triggered by GAME.DAY.MORNING_PHASE
//   reactive/  — triggered by gameplay actions
// ============================================================

// --- Data-table morning events (factory-produced) ---
import createMorningAbility from "./morning/morningAbilityFactory.js";
import MORNING_EVENTS from "./morning/morningEventsTable.js";

var morningAbilities = MORNING_EVENTS.map(function(row) {
    return createMorningAbility(row);
});

// --- Complex abilities (individual files) ---
import MysteryVisitorAbility from "./morning/mysteryVisitor.js";
import MysteryShadowAbility from "./morning/mysteryShadow.js";

// --- Reactive abilities ---
import HotStreakAbility from "./reactive/hotStreak.js";
import ShameDebuffAbility from "./reactive/shameDebuff.js";
import RoyalAttentionAbility from "./reactive/royalAttention.js";

var COMPLEX_ABILITIES = [
    MysteryVisitorAbility,
    MysteryShadowAbility,
    HotStreakAbility,
    ShameDebuffAbility,
    RoyalAttentionAbility,
];

// ============================================================
// Flat array — passed to AbilityManager.registerAll()
// ============================================================

var ALL_ABILITIES = morningAbilities.concat(COMPLEX_ABILITIES);

export default ALL_ABILITIES;