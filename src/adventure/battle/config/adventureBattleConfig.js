// ============================================================
// Block E — Adventure Battle Config (BATTLE-CONFIG)
// adventureBattleConfig.js
//
// Builds the props passed to BattleView for adventure battles.
//
// V1 SCOPE NOTE:
//   BattleView currently reads TEST_PARTY and TEST_WAVES
//   directly from battleConstants — it does NOT accept party
//   or waves props. So V1 only controls zoneName/waveLabel
//   via this config. The boss flag is cosmetic (label only).
//
//   TODO V2: when BattleView accepts injected party/waves,
//   this config will return those fields and route boss
//   encounters to their own wave tables.
// ============================================================

import BattleConstants from "../../../battle/config/battleConstants.js";

// Pulled for V2 use (currently unused but kept as a reminder
// that the data lives here, so the V2 migration is obvious).
var TEST_PARTY = BattleConstants.TEST_PARTY;
var TEST_WAVES = BattleConstants.TEST_WAVES;

// ============================================================
// Public builder
// ============================================================
// Returns an object of props that battleSubMode spreads onto
// <BattleView ... />. V1 only contains zoneName + waveLabel
// because those are the only adventure-controllable props
// BattleView accepts today.
//
// Args:
//   opts = { isBoss: bool }
//
function buildBattleConfig(opts) {
    var isBoss = !!(opts && opts.isBoss);

    return {
        zoneName:  isBoss ? "Rust Golem's Lair" : "Junkyard",
        waveLabel: isBoss ? "BOSS"              : "Wave 1/2",
        isBoss:    isBoss
        // TODO V2: party, waves, bossWaves, zoneBackground, musicCue
    };
}

// ============================================================
// Export
// ============================================================

var AdventureBattleConfig = {
    buildBattleConfig: buildBattleConfig,
    // Exposed for V2 migration visibility — unused in V1.
    TEST_PARTY: TEST_PARTY,
    TEST_WAVES: TEST_WAVES
};

export default AdventureBattleConfig;