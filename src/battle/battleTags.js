// ============================================================
// battleTags.js — Battle Event Tag Constants
//
// Single source of truth for all battle-internal bus events.
// Imported by managers, hooks, and BattleView subscribers.
//
// Naming: BATTLE:<SYSTEM>:<ACTION>
//   System = ATB, EXCHANGE, PLAYBACK, COMBAT, ACTION, WAVE, UI
//   Action = past tense for "this happened", imperative for requests
//
// No React imports. No logic. Pure constants.
// ============================================================

var BATTLE_TAGS = {

    // --- ATB System ---
    ATB_READY:              "BATTLE:ATB:READY",             // { combatantId }
    ATB_TICK:               "BATTLE:ATB:TICK",              // { dt, nextState }

    // --- Exchange (Action Cam) ---
    EXCHANGE_START:         "BATTLE:EXCHANGE:START",         // { initiatorId, responderId, skillId }
    EXCHANGE_CAM_IN:        "BATTLE:EXCHANGE:CAM_IN",        // {}
    EXCHANGE_WAIT_ACTION:   "BATTLE:EXCHANGE:WAIT_ACTION",   // { swingerId }
    EXCHANGE_CAM_OUT:       "BATTLE:EXCHANGE:CAM_OUT",       // {}
    EXCHANGE_SWAP_SIDES:    "BATTLE:EXCHANGE:SWAP_SIDES",    // { nextSwingerId }

    // --- Swing / Playback ---
    SWING_START:            "BATTLE:SWING:START",            // { swingerId, receiverId, skill }
    SWING_COMPLETE:         "BATTLE:SWING:COMPLETE",         // { swingerId, receiverId }

    // --- Beat-level (within a swing) ---
    BEAT_WIND_UP:           "BATTLE:BEAT:WIND_UP",           // { swingerId, beatIndex }
    BEAT_STRIKE:            "BATTLE:BEAT:STRIKE",            // { swingerId, beatIndex }
    BEAT_RESOLVE:           "BATTLE:BEAT:RESOLVE",           // { tier, damage, receiverId, beatIndex, isLastBeat }
    BEAT_TELEGRAPH:         "BATTLE:BEAT:TELEGRAPH",         // { swingerId, beatIndex } (enemy offense)
    BEAT_DEFENSE_WINDOW:    "BATTLE:BEAT:DEFENSE_WINDOW",    // { receiverId, beatIndex } (defense open)

    // --- Combat Resolution ---
    HIT_RESOLVED:           "BATTLE:COMBAT:HIT_RESOLVED",    // { tier, mult, damage, receiverId, isLastBeat }
    KO_TRIGGERED:           "BATTLE:COMBAT:KO_TRIGGERED",    // { combatantId, isLastBeat }
    OVERKILL:               "BATTLE:COMBAT:OVERKILL",        // { combatantId, amount }
    DODGE:                  "BATTLE:COMBAT:DODGE",            // { combatantId }
    BRACE:                  "BATTLE:COMBAT:BRACE",            // { combatantId, tier, damage }

    // --- Formation Actions ---
    ACTION_ATTACK:          "BATTLE:ACTION:ATTACK",           // { userId, targetId }
    ACTION_DEFEND:          "BATTLE:ACTION:DEFEND",           // { userId }
    ACTION_FLEE:            "BATTLE:ACTION:FLEE",             // { userId, success }
    ACTION_ITEM:            "BATTLE:ACTION:ITEM",             // { userId, itemId, targetId, effect }
    ACTION_SKILL_SELECT:    "BATTLE:ACTION:SKILL_SELECT",     // { userId, skillId }
    TURN_END:               "BATTLE:ACTION:TURN_END",         // { combatantId }

    // --- Wave / Battle lifecycle ---
    WAVE_CLEAR:             "BATTLE:WAVE:CLEAR",              // { waveIndex }
    WAVE_TRANSITION_START:  "BATTLE:WAVE:TRANSITION_START",   // { nextWaveIndex }
    WAVE_TRANSITION_DONE:   "BATTLE:WAVE:TRANSITION_DONE",    // { waveIndex }
    BATTLE_END:             "BATTLE:LIFECYCLE:END",            // { outcome }
    BATTLE_RESULT_READY:    "BATTLE:LIFECYCLE:RESULT_READY",   // { result }

    // --- UI Feedback (visual layer listens) ---
    ANIM_SET:               "BATTLE:UI:ANIM_SET",             // { combatantId, animName }
    ANIM_CLEAR:             "BATTLE:UI:ANIM_CLEAR",           // { combatantId }
    FLASH:                  "BATTLE:UI:FLASH",                // { combatantId }
    SHAKE:                  "BATTLE:UI:SHAKE",                // { level }
    SPAWN_DAMAGE:           "BATTLE:UI:SPAWN_DAMAGE",         // { combatantId, value, color, yOffset }
    SPAWN_SKILL_NAME:       "BATTLE:UI:SPAWN_SKILL_NAME",     // { skillName, combatantId, color }
    PHASE_CHANGE:           "BATTLE:UI:PHASE_CHANGE",         // { phase }
    PIP_DEDUCTED:           "BATTLE:UI:PIP_DEDUCTED",         // { combatantId }
};

// ============================================================
// Export
// ============================================================
export default BATTLE_TAGS;