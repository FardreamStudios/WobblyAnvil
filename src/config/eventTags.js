// ============================================================
// eventTags.js — Wobbly Anvil Event Tag Vocabulary
// Single source of truth for all bus tags. No magic strings.
//
// FORMAT: event.<system>.<verb>.<target>
//   system — domain that owns the state (economy, player, etc.)
//   verb   — what happens (earn, spend, set, add, etc.)
//   target — what it acts on (gold, inventory, xp, etc.)
//
// USAGE:
//   import EVENT_TAGS from "../config/eventTags.js";
//   bus.emit(EVENT_TAGS.ECONOMY_EARN_GOLD, { amount: 500 });
//
// This list grows as we add events. Not every tag needs a
// listener on day one — wire what you need, add the rest later.
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
};

export default EVENT_TAGS;