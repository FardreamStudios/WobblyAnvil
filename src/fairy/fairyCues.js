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
// CUE REGISTRY
// Pawn looks up cues by id from this map.
// ============================================================

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