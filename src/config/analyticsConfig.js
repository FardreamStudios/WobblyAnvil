// ============================================================
// analyticsConfig.js — Wobbly Anvil Analytics Definitions
// Game-specific stat table consumed by GameplayAnalyticsSubSystem.
//
// Each entry defines one tracked stat:
//   key   — unique name, used in getStats() snapshot
//   tag   — bus event tag to listen for
//   mode  — "count" (increment), "sum" (add field), "max" (track highest)
//   field — payload field to read (required for sum/max, ignored for count)
//
// The subsystem is generic — this file is where all game
// knowledge lives. Add/remove rows to change what gets tracked.
// ============================================================

import EVENT_TAGS from "./eventTags.js";

var ANALYTICS_CONFIG = {
    resetTag:  EVENT_TAGS.GAME_SESSION_NEW,
    freezeTag: EVENT_TAGS.GAME_SESSION_OVER,

    stats: [
        { key: "weaponsForged",   tag: EVENT_TAGS.FORGE_SESSION_COMPLETE, mode: "count" },
        { key: "forgeSessions",   tag: EVENT_TAGS.FORGE_SESSION_COMPLETE, mode: "count" },
        { key: "bestQuality",     tag: EVENT_TAGS.FORGE_SESSION_COMPLETE, mode: "max",   field: "quality" },
        { key: "weaponsSold",     tag: EVENT_TAGS.ECONOMY_WEAPON_SOLD,    mode: "count" },
        { key: "totalGoldSpent",  tag: EVENT_TAGS.ECONOMY_SPEND_GOLD,     mode: "sum",   field: "amount" },
        { key: "questsCompleted", tag: EVENT_TAGS.FX_ROYAL_DECREE,        mode: "count" },
    ],
};

export default ANALYTICS_CONFIG;