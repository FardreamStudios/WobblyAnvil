// ============================================================
// eventTags.js — Wobbly Anvil Event Tag Vocabulary
// Single source of truth for all bus tags. No magic strings.
//
// FORMAT: event.<system>.<domain>.<verb>
//   system — domain that owns the state (economy, player, etc.)
//   domain — what it acts on (gold, inventory, xp, etc.)
//   verb   — what happens (earn, spend, set, add, etc.)
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
    ECONOMY_EARN_GOLD:      "event.economy.gold.earn",
    ECONOMY_SPEND_GOLD:     "event.economy.gold.spend",
    ECONOMY_SET_INVENTORY:  "event.economy.inventory.set",
    ECONOMY_ADD_MATERIAL:   "event.economy.material.add",
    ECONOMY_WEAPON_SOLD:    "event.economy.weapon.sold",

    // --- Player ---
    PLAYER_CHANGE_REP:      "event.player.reputation.change",
    PLAYER_GAIN_XP:         "event.player.xp.gain",
    PLAYER_LOSE_XP:         "event.player.xp.lose",

    // --- Forge ---
    FORGE_DESTROY_WIP:      "event.forge.wip.destroy",
    FORGE_STOP_SESSION:     "event.forge.session.stop",
    FORGE_SESSION_COMPLETE: "event.forge.session.complete",

    // --- Quest ---
    QUEST_FAILED:           "event.quest.failed",

    // --- Customer ---
    CUSTOMER_SPAWN:         "event.customer.spawn",
    CUSTOMER_CLEAR:         "event.customer.clear",
    CUSTOMER_WALKOUT:       "event.customer.walkout",
    CUSTOMER_REFUSE:        "event.customer.refuse",
    CUSTOMER_PROMOTE:       "event.customer.promote",

    // --- Day ---
    DAY_SET_STAMINA:        "event.day.stamina.set",
    DAY_ADVANCE_HOUR:       "event.day.hour.advance",

    // --- UI ---
    UI_ADD_TOAST:           "event.ui.toast.add",
    UI_SET_LOCK:            "event.ui.lock.set",
    UI_TUTORIAL_HIGHLIGHT:  "event.ui.tutorial.highlight",

    // --- VFX ---
    VFX_SHAKE_MYSTERY:      "event.vfx.mystery.shake",
    VFX_SHAKE_WEAPON:       "event.vfx.weapon.shake",
    VFX_SET_VIGNETTE:       "event.vfx.vignette.set",

    // --- Day Display ---
    DAY_MORNING_EVENT_DISPLAY: "event.day.morning.event.display",

    // --- Day Lifecycle (GameMode) ---
    DAY_CYCLE_START:        "event.day.cycle.start",
    DAY_MORNING_START:      "event.day.morning.start",
    DAY_SHOP_OPEN:          "event.day.shop.open",
    DAY_READY:              "event.day.ready",
    DAY_LATE_START:         "event.day.late.start",
    DAY_SLEEP_START:        "event.day.sleep.start",
    DAY_CYCLE_END:          "event.day.cycle.end",

    // --- Mode (GameMode sub-mode switching) ---
    MODE_FORGE_ENTER:       "event.mode.forge.enter",
    MODE_FORGE_EXIT:        "event.mode.forge.exit",
    MODE_SHOP_ENTER:        "event.mode.shop.enter",
    MODE_SHOP_EXIT:         "event.mode.shop.exit",

    // --- Phase (sub-mode internal transitions) ---
    PHASE_FORGE_TRANSITION: "event.phase.forge.transition",
    QTE_SANDBOX_FROZEN:     "event.phase.qte.sandbox.frozen",

    // --- Game Session ---
    GAME_SESSION_OVER:      "event.game.session.over",
    GAME_SESSION_NEW:       "event.game.session.new",

    // --- Fairy Chat (input from player) ---
    FAIRY_CHAT_TAP:         "event.fairy.chat.tap",
    FAIRY_CHAT_HOLD_START:  "event.fairy.chat.hold.start",
    FAIRY_CHAT_HOLD_END:    "event.fairy.chat.hold.end",
    FAIRY_CHAT_DISMISS:     "event.fairy.chat.dismiss",
    FAIRY_CHAT_SEND:        "event.fairy.chat.send",

    // --- Fairy Chat (UI state broadcasts) ---
    UI_FAIRY_CHAT_OPEN:     "event.ui.fairy.chat.open",
    UI_FAIRY_CHAT_CLOSE:    "event.ui.fairy.chat.close",
    UI_FAIRY_CHAT_SPEAK:    "event.ui.fairy.chat.speak",
    UI_FAIRY_CHAT_LISTENING:"event.ui.fairy.chat.listening",
    UI_FAIRY_CHAT_WAITING:  "event.ui.fairy.chat.waiting",
    UI_FAIRY_CHAT_TEXT_TOGGLE:"event.ui.fairy.chat.text.toggle",

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
    FX_ANVIL_SPARK:         "fx.forge.anvil.spark",

    // --- Fairy Rescue (shatter intervention) ---
    FAIRY_RESCUE_OFFER:     "event.fairy.rescue.offer",
    FAIRY_RESCUE_ACCEPT:    "event.fairy.rescue.accept",
    FAIRY_RESCUE_DECLINE:   "event.fairy.rescue.decline",
};

export default EVENT_TAGS;