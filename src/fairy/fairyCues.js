// ============================================================
// fairyCues.js — Fairy Cue Timelines
//
// Named sequences of pawn commands. Each cue is a choreographed
// micro-scene the pawn plays back step by step.
//
// Pure data — no React, no imports, no logic.
// The pawn (fairyPawn.js) is the sole consumer.
//
// STEP FORMAT:
//   at    — ms from cue start (when this step fires)
//   cmd   — command type (see CMD_TYPES below)
//   ...   — command-specific fields
//
// NULL CONVENTION:
//   null values are placeholders resolved by the pawn at playback:
//     text: null     → filled from controller's line
//     target: null   → filled from controller's target
//     spot: null     → pawn picks based on context
//     duration: null → calculated from text length
//     busTag: null   → skipped (no FX emitted)
//
// LAYER:
//   Each cue declares its rendering layer:
//     "scene"   — fairy rendered inside GameCenter, z-ordered with props
//     "overlay" — fairy rendered via portal, viewport coords, always on top
//     "either"  — pawn picks based on whether a scene or UI target is set
//
// TIMING:
//   Pawn uses setTimeout chain, not a scheduler. Keep step counts
//   reasonable (< 20 per cue). Complex choreography = multiple cues
//   chained by the controller, not one mega-cue.
// ============================================================

// ============================================================
// COMMAND TYPES (reference — not enforced here, pawn validates)
//
//   poof_in      — FX burst + scale-in at position
//   poof_out     — scale-out + FX burst, fairy hidden after
//   move         — transition to new position (with duration)
//   speak        — show speech bubble with text
//   hide_speech  — dismiss speech bubble
//   emote        — trigger a named emote animation
//   set_anim     — switch sprite animation state
//   set_tappable — enable/disable tap interaction
//   play_audio   — play a named audio cue
//   play_fx      — emit a bus tag for fxCueSubSystem
//   laser_on     — beam from fairy to target element
//   laser_off    — remove beam
//   wait         — do nothing (used for timing gaps)
//   show_choice  — speech bubble with tappable options (waits for input)
// ============================================================

// ============================================================
// SILENT PEEK
// Fairy pokes head in from a random edge, holds, retreats.
// No speech. Used during "quiet" day tier.
// Layer: overlay (edge peeks are viewport-relative).
// ============================================================

var SILENT_PEEK = {
    id: "silent_peek",
    description: "Peek from screen edge, no speech, retreat",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "poof_in",     peek: null, scale: 4.0, duration: 1200 },
        { at: 1200, cmd: "wait" },
        { at: 3700, cmd: "poof_out",    duration: 1000 },
    ],
};

// ============================================================
// SILENT POOF
// Fairy poofs in at a scene spot, looks around, poofs out.
// No speech. Used during "quiet" day tier.
// Layer: scene (she appears inside the forge).
// ============================================================

var SILENT_POOF = {
    id: "silent_poof",
    description: "Poof into scene, idle briefly, poof out",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "poof_in",     spot: null, duration: 250 },
        { at: 300,  cmd: "set_tappable", value: true },
        { at: 4000, cmd: "set_tappable", value: false },
        { at: 4000, cmd: "poof_out",    duration: 200 },
    ],
};

// ============================================================
// SPEAK AT TARGET
// Fairy poofs into overlay near a UI element, speaks, exits.
// The bread-and-butter teaching/reaction cue.
// Layer: overlay (pointing at UI panels).
// ============================================================

var SPEAK_AT_TARGET = {
    id: "speak_at_target",
    description: "Poof near UI target, deliver line, exit",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "poof_in",      target: null, duration: 250 },
        { at: 350,  cmd: "set_tappable",  value: true },
        { at: 600,  cmd: "speak",         text: null, duration: null },
        { at: null, cmd: "hide_speech" },
        { at: null, cmd: "set_tappable",  value: false },
        { at: null, cmd: "poof_out",      duration: 200 },
    ],
};

// ============================================================
// SPEAK IN SCENE
// Same as speak_at_target but fairy appears at a scene spot.
// Used for gameplay reactions (shatters, quality, etc).
// Layer: scene.
// ============================================================

var SPEAK_IN_SCENE = {
    id: "speak_in_scene",
    description: "Poof into scene spot, deliver line, exit",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "poof_in",      spot: null, duration: 250 },
        { at: 350,  cmd: "set_tappable",  value: true },
        { at: 600,  cmd: "speak",         text: null, duration: null },
        { at: null, cmd: "hide_speech" },
        { at: null, cmd: "set_tappable",  value: false },
        { at: null, cmd: "poof_out",      duration: 200 },
    ],
};

// ============================================================
// CRASH ENTRANCE
// Dramatic arrival — FX burst, screen shake, speech.
// Used for fairy events and first appearances.
// Layer: scene (big dramatic moment in the forge).
// ============================================================

var CRASH_ENTRANCE = {
    id: "crash_entrance",
    description: "Dramatic poof with FX burst, screen shake, then speak",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "play_fx",      busTag: "FX_FAIRY_CRASH" },
        { at: 0,    cmd: "play_audio",   sound: "fairy_crash" },
        { at: 100,  cmd: "poof_in",      spot: "center_floor", duration: 150, scale: 1.2 },
        { at: 400,  cmd: "set_anim",     anim: "point" },
        { at: 500,  cmd: "set_tappable", value: true },
        { at: 600,  cmd: "speak",        text: null, duration: null },
        { at: null, cmd: "hide_speech" },
        { at: null, cmd: "set_anim",     anim: "idle" },
        { at: null, cmd: "set_tappable", value: false },
        { at: null, cmd: "poof_out",     duration: 200 },
    ],
};

// ============================================================
// FAIRY RESCUE
// Catches a weapon mid-shatter. Flies to anvil, flash, restore.
// Once per run. Controller gates availability.
// Layer: scene (interacting with forge props).
// ============================================================

var FAIRY_RESCUE = {
    id: "fairy_rescue",
    description: "Intercept shatter — fly to anvil, flash, restore weapon",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "play_audio",   sound: "fairy_alert" },
        { at: 0,    cmd: "poof_in",      spot: "far_right", duration: 100 },
        { at: 150,  cmd: "set_anim",     anim: "point" },
        { at: 200,  cmd: "move",         spot: "near_anvil", duration: 400 },
        { at: 650,  cmd: "play_fx",      busTag: "FX_FAIRY_RESCUE" },
        { at: 650,  cmd: "play_audio",   sound: "fairy_magic" },
        { at: 900,  cmd: "speak",        text: "NOT ON MY WATCH.", duration: 2500 },
        { at: 3500, cmd: "hide_speech" },
        { at: 3600, cmd: "speak",        text: null, duration: null },
        { at: null, cmd: "hide_speech" },
        { at: null, cmd: "set_anim",     anim: "idle" },
        { at: null, cmd: "poof_out",     duration: 200 },
    ],
};

// ============================================================
// FAIRY BLESSING
// Morning event — fairy buffs hammer zones for the day.
// Layer: scene (she's in the forge doing magic).
// ============================================================

var FAIRY_BLESSING = {
    id: "fairy_blessing",
    description: "Morning buff — widen hammer zones, sparkle FX",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "poof_in",      spot: "forge_mouth", duration: 250 },
        { at: 350,  cmd: "set_anim",     anim: "point" },
        { at: 400,  cmd: "play_fx",      busTag: "FX_FAIRY_BLESSING" },
        { at: 400,  cmd: "play_audio",   sound: "fairy_magic" },
        { at: 600,  cmd: "speak",        text: "fine. i'll help. but only because watching you miss is exhausting.", duration: 4000 },
        { at: 4700, cmd: "hide_speech" },
        { at: 4800, cmd: "set_anim",     anim: "idle" },
        { at: 5000, cmd: "set_tappable", value: true },
        { at: 8000, cmd: "set_tappable", value: false },
        { at: 8000, cmd: "poof_out",     duration: 200 },
    ],
};

// ============================================================
// RUNNING HEAD
// Just her head slides across the bottom of the screen.
// Very Monty Python. She acts like this is normal.
// Layer: overlay (viewport-relative horizontal slide).
// ============================================================

var RUNNING_HEAD = {
    id: "running_head",
    description: "Head slides across bottom of screen, speaks mid-slide",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "set_anim",    anim: "head_only" },
        { at: 0,    cmd: "move",        from: { x: -10, y: 92 }, to: { x: 110, y: 92 }, duration: 4000 },
        { at: 800,  cmd: "speak",       text: null, duration: 2500 },
        { at: 3400, cmd: "hide_speech" },
    ],
};

// ============================================================
// SUPER SAIYAN
// Fairy powers up with escalating glow. Comedic buildup.
// Layer: scene (dramatic scene moment).
// ============================================================

var SUPER_SAIYAN = {
    id: "super_saiyan",
    description: "Power-up glow buildup, shake, then... nothing happens",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "poof_in",      spot: "center_floor", duration: 250 },
        { at: 400,  cmd: "set_anim",     anim: "power_up" },
        { at: 400,  cmd: "play_audio",   sound: "fairy_charge" },
        { at: 500,  cmd: "play_fx",      busTag: "FX_FAIRY_CHARGE" },
        { at: 2000, cmd: "play_fx",      busTag: "FX_FAIRY_CHARGE_PEAK" },
        { at: 2500, cmd: "set_anim",     anim: "idle" },
        { at: 2600, cmd: "speak",        text: "...huh. that usually works.", duration: 3000 },
        { at: 5700, cmd: "hide_speech" },
        { at: 5800, cmd: "poof_out",     duration: 200 },
    ],
};

// ============================================================
// CHASE EVENT
// Fairy chases a rat (or is chased by one) across the scene.
// Uses dodge paths for the dash.
// Layer: scene (running through forge).
// ============================================================

var CHASE_EVENT = {
    id: "chase_event",
    description: "Fairy chases/flees across scene via dodge path",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "play_audio",    sound: "fairy_yelp" },
        { at: 0,    cmd: "set_anim",      anim: "flustered" },
        { at: 0,    cmd: "dodge_dash",    path: "foreground_dash", duration: 1500 },
        { at: 200,  cmd: "speak",         text: "THAT IS NOT A PET. THAT IS A MENACE.", duration: 1200 },
        { at: 1500, cmd: "hide_speech" },
    ],
};

// ============================================================
// DOORWAY DASH
// Fairy runs past the background doorway. Occluded by wall z.
// Layer: scene (depth-based occlusion).
// ============================================================

var DOORWAY_DASH = {
    id: "doorway_dash",
    description: "Dash past doorway opening at mid depth",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "set_anim",     anim: "running" },
        { at: 0,    cmd: "dodge_dash",   path: "doorway_dash", duration: 2000 },
    ],
};

// ============================================================
// LASER POINT
// Fairy points laser beam at a UI target. Teaching cue.
// Layer: overlay (laser connects fairy to UI element).
// ============================================================

var LASER_POINT = {
    id: "laser_point",
    description: "Poof in, aim laser at UI target, speak, retract",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "poof_in",      target: null, duration: 250 },
        { at: 350,  cmd: "set_anim",     anim: "point" },
        { at: 400,  cmd: "laser_on",     target: null },
        { at: 500,  cmd: "set_tappable", value: true },
        { at: 600,  cmd: "speak",        text: null, duration: null },
        { at: null, cmd: "hide_speech" },
        { at: null, cmd: "laser_off" },
        { at: null, cmd: "set_anim",     anim: "idle" },
        { at: null, cmd: "set_tappable", value: false },
        { at: null, cmd: "poof_out",     duration: 200 },
    ],
};

// ============================================================
// RUMMAGE
// Fairy poofs in and digs through your stuff. Ignores you.
// Layer: scene.
// ============================================================

var RUMMAGE = {
    id: "rummage",
    description: "Poof in, rummage animation, maybe steal something",
    layer: "scene",
    steps: [
        { at: 0,    cmd: "poof_in",      spot: "back_shelf", duration: 250 },
        { at: 400,  cmd: "set_anim",     anim: "rummage" },
        { at: 400,  cmd: "set_tappable", value: false },
        { at: 3000, cmd: "speak",        text: "don't mind me.", duration: 2000 },
        { at: 5100, cmd: "hide_speech" },
        { at: 6000, cmd: "set_anim",     anim: "idle" },
        { at: 6200, cmd: "poof_out",     duration: 200 },
    ],
};

// ============================================================
// INTRO RISE
// First encounter — fairy rises from bottom, introduces herself.
// No poof_out — fairy stays visible for the prompt cue.
// Layer: overlay (viewport-relative rise).
// ============================================================

var INTRO_RISE = {
    id: "intro_rise",
    description: "Fairy rises from bottom of screen, introduces herself",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "poof_in",      peek: "talk_close", scale: 2.5, duration: 800 },
        { at: 1000, cmd: "speak",        text: "psst. hey. over here.", duration: 2500 },
        { at: 3600, cmd: "hide_speech" },
        { at: 3800, cmd: "speak",        text: "i live in your forge now. don't ask.", duration: 3000 },
        { at: 6900, cmd: "hide_speech" },
    ],
};

// ============================================================
// INTRO PROMPT
// Fairy asks yes/no — want help? Waits for player input.
// waitForInput: true — pawn does not auto-fire cue_complete.
// Completion driven by show_choice callback instead.
// Layer: overlay (fairy already visible from intro_rise).
// ============================================================

var INTRO_PROMPT = {
    id: "intro_prompt",
    description: "Fairy asks player if they want help — tappable yes/no",
    layer: "overlay",
    waitForInput: true,
    steps: [
        { at: 0, cmd: "show_choice", text: "wanna know what all the shiny buttons do, or are you more of a 'learn by failing' type?", options: ["show me", "i'll figure it out"] },
    ],
};

// ============================================================
// INTRO RESPOND YES
// Player accepted help. Fairy reacts, then exits.
// Layer: overlay (fairy still visible from intro_rise).
// ============================================================

var INTRO_RESPOND_YES = {
    id: "intro_respond_yes",
    description: "Fairy responds to player accepting help",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "speak",        text: "smart. you looked like you needed it.", duration: 3000 },
        { at: 3100, cmd: "hide_speech" },
        { at: 3300, cmd: "poof_out",     duration: 300 },
    ],
};

// ============================================================
// INTRO RESPOND NO
// Player declined help. Fairy reacts, then exits.
// Layer: overlay (fairy still visible from intro_rise).
// ============================================================

var INTRO_RESPOND_NO = {
    id: "intro_respond_no",
    description: "Fairy responds to player declining help, hints at options menu",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "speak",        text: "fine. i'll just be here. judging.", duration: 3000 },
        { at: 3100, cmd: "hide_speech" },
        { at: 3400, cmd: "speak",        text: "if you change your mind, i'm in the options menu.", duration: 3500 },
        { at: 7000, cmd: "hide_speech" },
        { at: 7200, cmd: "poof_out",     duration: 300 },
    ],
};

// ============================================================
// TUT REP LASER
// Tutorial: fairy points laser at reputation bar, explains it.
// Poof near rep target, laser on, speak, laser off, exit.
// Layer: overlay (pointing at UI element).
// ============================================================

var TUT_REP_LASER = {
    id: "tut_rep_laser",
    description: "Tutorial — laser at rep bar, explain reputation and decrees",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "poof_in",      target: null, duration: 250 },
        { at: 350,  cmd: "set_anim",     anim: "point" },
        { at: 400,  cmd: "laser_on",     target: null },
        { at: 500,  cmd: "set_tappable", value: true },
        { at: 800,  cmd: "speak",        text: "see that? the crown tracks every decree you fumble. forging is art, not slavery. but here we are.", duration: 6000 },
        { at: 6900, cmd: "hide_speech" },
        { at: 7100, cmd: "laser_off" },
        { at: 7200, cmd: "set_anim",     anim: "idle" },
        { at: 7300, cmd: "set_tappable", value: false },
        { at: 7400, cmd: "poof_out",     duration: 200 },
    ],
};

var TUT_BUTTONS = {
    id: "tut_buttons",
    description: "Tutorial — sweep all idle action buttons with laser + speech",
    layer: "overlay",
    steps: [
        // Poof in opposite the button area — pawn mirrors across viewport center
        { at: 0,     cmd: "poof_in",      oppose: "btn_area", duration: 250 },
        { at: 350,   cmd: "set_tappable", value: true },

        // --- Sleep ---
        { at: 500,   cmd: "laser_on",     target: "btn_sleep" },
        { at: 1250,  cmd: "speak",        text: "that's your bed. don't be a hero — sleep before you drop. trust me, the forge doesn't care about your pride.", duration: 5000 },
        { at: 6350,  cmd: "hide_speech" },
        { at: 6500,  cmd: "laser_off" },

        // --- Rest ---
        { at: 6800,  cmd: "laser_on",     target: "btn_rest" },
        { at: 7550,  cmd: "speak",        text: "quick breather. one hour gone, bit of stamina back. boring but useful.", duration: 4000 },
        { at: 11650, cmd: "hide_speech" },
        { at: 11800, cmd: "laser_off" },

        // --- Scavenge ---
        { at: 12100, cmd: "laser_on",     target: "btn_scavenge" },
        { at: 12850, cmd: "speak",        text: "digging through garbage for free metal. very dignified. but hey, free is free.", duration: 4500 },
        { at: 17450, cmd: "hide_speech" },
        { at: 17600, cmd: "laser_off" },

        // --- Shop ---
        { at: 17900, cmd: "laser_on",     target: "btn_shop" },
        { at: 18650, cmd: "speak",        text: "the shop. materials, upgrades, the works. spend wisely — gold doesn't grow on anvils.", duration: 4500 },
        { at: 23250, cmd: "hide_speech" },
        { at: 23400, cmd: "laser_off" },

        // --- Mats ---
        { at: 23700, cmd: "laser_on",     target: "btn_mats" },
        { at: 24450, cmd: "speak",        text: "your stockpile. always check what you've got before committing to something ambitious.", duration: 4000 },
        { at: 28550, cmd: "hide_speech" },
        { at: 28700, cmd: "laser_off" },

        // Exit
        { at: 29000, cmd: "set_tappable", value: false },
        { at: 29100, cmd: "poof_out",     duration: 200 },
    ],
};

var TUT_FORGE_ENTER = {
    id: "tut_forge_enter",
    description: "Forge tutorial — fairy poofs in at talk_close position, smaller + shifted right",
    layer: "overlay",
    steps: [
        { at: 0, cmd: "poof_in", peek: { from: { x: 75, y: -15 }, to: { x: 75, y: 50 }, rot: 0, variance: { axis: "x", range: 3 } }, scale: 1.5, instant: true, duration: 250 },
        { at: 350, cmd: "set_tappable", value: true },
    ],
};

var TUT_FORGE_EXIT = {
    id: "tut_forge_exit",
    description: "Forge tutorial — fairy poofs out",
    layer: "overlay",
    steps: [
        { at: 0,   cmd: "hide_speech" },
        { at: 100, cmd: "poof_out", duration: 250 },
    ],
};

// ============================================================
// LASER SPEAK (persistent)
// Fairy is already visible. Laser on → speak → laser off.
// No poof in/out. Used by forge tutorial presenter.interact().
// Layer: overlay.
// ============================================================

var LASER_SPEAK = {
    id: "laser_speak",
    description: "Laser at target + speak, no poof (fairy already visible)",
    layer: "overlay",
    steps: [
        { at: 0,    cmd: "set_anim",     anim: "point" },
        { at: 50,   cmd: "laser_on",     target: null },
        { at: 200,  cmd: "speak",        text: null, duration: null },
        { at: null,  cmd: "hide_speech" },
        { at: null,  cmd: "laser_off" },
        { at: null,  cmd: "set_anim",     anim: "idle" },
    ],
};

// ============================================================
// TUT FORGE SPEAK (persistent)
// Fairy is already visible. Speak only, no laser, no poof.
// Used by forge tutorial presenter.say().
// Layer: overlay.
// ============================================================

var TUT_FORGE_SPEAK = {
    id: "tut_forge_speak",
    description: "Speak only, no poof (fairy already visible)",
    layer: "overlay",
    steps: [
        { at: 0,   cmd: "speak",        text: null, duration: null },
        { at: null, cmd: "hide_speech" },
    ],
};
// ============================================================
// CUE REGISTRY
// Pawn looks up cues by id from this map.
// ============================================================

// ============================================================
// TUT_CHAT
// Day 2 tutorial — fairy appears center screen, lasers at the
// chat button, explains it, poofs out.
// Layer: overlay (viewport-centered, above everything).
// ============================================================

// ============================================================
// CHAT IDLE
// Fairy poofs in and stays visible for chat interaction.
// No speech, no auto-exit. waitForInput prevents auto-complete.
// Dismissed via controller when chat closes.
// Layer: scene (appears inside the forge).
// ============================================================

var CHAT_IDLE = {
    id: "chat_idle",
    description: "Poof in and idle for chat — no auto-exit",
    layer: "scene",
    waitForInput: true,
    steps: [
        { at: 0,    cmd: "poof_in",      spot: null, duration: 250 },
        { at: 350,  cmd: "set_tappable",  value: true },
    ],
};

var TUT_CHAT = {
    id: "tut_chat",
    description: "Tutorial — introduce fairy chat button + tap/hold/text features on day 2",
    layer: "overlay",
    steps: [
        { at: 0,     cmd: "poof_in",      spot: { x: 50, y: 50 }, scale: 1.0, duration: 300 },
        { at: 400,   cmd: "set_tappable", value: true },
        { at: 600,   cmd: "laser_on",     target: "btn_fairy_chat" },

        // Step 1: Introduce the button
        { at: 1200,  cmd: "speak",        text: "see that little button? that's how you summon me. tap it once and i'll appear.", duration: 5000 },
        { at: 6300,  cmd: "hide_speech" },

        // Step 2: Hold for voice
        { at: 7300,  cmd: "speak",        text: "hold it down and you can talk to me with your voice. yes, really. i can hear you.", duration: 5500 },
        { at: 12900, cmd: "hide_speech" },

        // Step 3: Tap again for text
        { at: 13900, cmd: "speak",        text: "or tap it again while i'm out to type something instead. whatever works for you.", duration: 5000 },
        { at: 19000, cmd: "hide_speech" },

        // Step 4: Sign off
        { at: 20000, cmd: "speak",        text: "i'll be around. probably judging your material choices.", duration: 4000 },
        { at: 24100, cmd: "hide_speech" },

        // Exit
        { at: 24500, cmd: "laser_off" },
        { at: 24700, cmd: "set_tappable", value: false },
        { at: 24800, cmd: "poof_out",     duration: 200 },
    ],
};

var FAIRY_CUES = {
    silent_peek:     SILENT_PEEK,
    silent_poof:     SILENT_POOF,
    speak_at_target: SPEAK_AT_TARGET,
    speak_in_scene:  SPEAK_IN_SCENE,
    crash_entrance:  CRASH_ENTRANCE,
    fairy_rescue:    FAIRY_RESCUE,
    fairy_blessing:  FAIRY_BLESSING,
    running_head:    RUNNING_HEAD,
    super_saiyan:    SUPER_SAIYAN,
    chase_event:     CHASE_EVENT,
    doorway_dash:    DOORWAY_DASH,
    laser_point:     LASER_POINT,
    rummage:         RUMMAGE,
    intro_rise:      INTRO_RISE,
    intro_prompt:    INTRO_PROMPT,
    intro_respond_yes: INTRO_RESPOND_YES,
    intro_respond_no:  INTRO_RESPOND_NO,
    tut_rep_laser:     TUT_REP_LASER,
    tut_buttons:       TUT_BUTTONS,
    tut_forge_enter:   TUT_FORGE_ENTER,
    tut_forge_exit:    TUT_FORGE_EXIT,
    laser_speak:       LASER_SPEAK,
    tut_forge_speak:   TUT_FORGE_SPEAK,
    tut_chat:          TUT_CHAT,
    chat_idle:         CHAT_IDLE,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Get a cue definition by id. Returns the cue object or null.
 */
function getCue(cueId) {
    return FAIRY_CUES[cueId] || null;
}

/**
 * List all registered cue ids.
 */
function listCues() {
    return Object.keys(FAIRY_CUES);
}

/**
 * List cues filtered by layer.
 */
function listCuesByLayer(layer) {
    var result = [];
    var keys = Object.keys(FAIRY_CUES);
    for (var i = 0; i < keys.length; i++) {
        if (FAIRY_CUES[keys[i]].layer === layer) {
            result.push(keys[i]);
        }
    }
    return result;
}

// ============================================================
// EXPORTS
// ============================================================

var FairyCues = {
    FAIRY_CUES: FAIRY_CUES,
    getCue: getCue,
    listCues: listCues,
    listCuesByLayer: listCuesByLayer,
};

export default FairyCues;