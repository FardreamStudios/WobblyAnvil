// ============================================================
// eventTags.js — Wobbly Anvil Event Tag Vocabulary
// Single source of truth for all bus tags. No magic strings.
//
// FORMAT: event.<system>.<verb>.<target>
//   system — domain that owns the state (economy, player, etc.)
//   verb   — what happens (earn, spend, set, add, etc.)
//   target — what it acts on (gold, inventory, xp, etc.)
//
// FX CUES: fx.<domain>.<action>
//   Presentation-only tags. Listeners in useFXCues execute
//   SFX/VFX — no state mutations. Any object can emit these.
//
// USAGE:
//   import EVENT_TAGS from "../config/eventTags.js";
//   bus.emit(EVENT_TAGS.ECONOMY_EARN_GOLD, { amount: 500 });
//   bus.emit(EVENT_TAGS.FX_SHATTER, {});
// ============================================================

var EVENT_TAGS = {

    // --- Economy ---
    ECONOMY_EARN_GOLD:      "event.economy.earn.gold",
    ECONOMY_SPEND_GOLD:     "event.economy.spend.gold",
    ECONOMY_SET_INVENTORY:  "event.economy.set.inventory",
    ECONOMY_ADD_MATERIAL:   "event.economy.add.material",

    // --- Player ---
    PLAYER_CHANGE_REP:      "event.player.change.reputation",
    PLAYER_GAIN_XP:         "event.player.gain.xp",
    PLAYER_LOSE_XP:         "event.player.lose.xp",

    // --- Forge ---
    FORGE_DESTROY_WIP:      "event.forge.destroy.wip",
    FORGE_STOP_SESSION:     "event.forge.stop.session",

    // --- Day ---
    DAY_SET_STAMINA:        "event.day.set.stamina",
    DAY_ADVANCE_HOUR:       "event.day.advance.hour",
    DAY_FORCE_EXHAUSTION:   "event.day.force.exhaustion",

    // --- UI ---
    UI_ADD_TOAST:           "event.ui.add.toast",
    UI_SET_LOCK:            "event.ui.set.lock",

    // --- VFX ---
    VFX_SHAKE_MYSTERY:      "event.vfx.shake.mystery",
    VFX_SHAKE_WEAPON:       "event.vfx.shake.weapon",
    VFX_SET_VIGNETTE:       "event.vfx.set.vignette",

    // --- FX Cues (presentation only — no state mutations) ---
    FX_HEAT_RESULT:         "fx.forge.heat",
    FX_HAMMER_HIT:          "fx.forge.hammer",
    FX_QUENCH_SUCCESS:      "fx.forge.quench.success",
    FX_QUENCH_FAIL:         "fx.forge.quench.fail",
    FX_SHATTER:             "fx.forge.shatter",
    FX_FINISH_WEAPON:       "fx.forge.finish",
    FX_ROYAL_DECREE:        "fx.quest.royal",
    FX_DOORBELL:            "fx.economy.doorbell",
    FX_COIN_EARN:           "fx.economy.coin.earn",
    FX_COIN_LOSS:           "fx.economy.coin.loss",
    FX_TOAST:               "fx.ui.toast",
    FX_LEVEL_UP:            "fx.player.levelup",
    FX_GAME_OVER:           "fx.player.gameover",
    FX_MYSTERY_GOOD:        "fx.mystery.good",
    FX_MYSTERY_BAD:         "fx.mystery.bad",
    FX_FANFARE:             "fx.ui.fanfare",
};

export default EVENT_TAGS;