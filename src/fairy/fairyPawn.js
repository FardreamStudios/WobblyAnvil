// ============================================================
// fairyPawn.js — Fairy World Presence (M-7)
//
// UE ANALOGY: Pawn / Character. The fairy's physical presence
// in the world. Decides WHERE to go and HOW to get there.
//
// Pure JS singleton. No React.
// Drives AnimInstance through ref API.
// Owns laser beam DOM element (M-11) — raw SVG, no React.
//
// LIFECYCLE:
//   init(config)   — store animRef, callbacks, scene id
//   destroy()      — cancel pending cues, clear state
//
// COMMAND INTAKE:
//   handleCommand(cmd)  — from controller (M-9 wire-up)
//   handleSpeak(line, category) — legacy bridge (current App.js)
//
// CUE PLAYBACK:
//   playCue(cueId, context) — resolve nulls, schedule steps
//   cancelCue()             — abort in-progress cue
//
// POSITION:
//   Wraps FairyPositions resolvers. Scene spots get depth-
//   resolved scale + transformOrigin "50% 100%" (feet pinned).
//   Overlay targets get viewport coords + "50% 50%" (center).
//
// FEEDBACK:
//   onPawnEvent(type, data) — callback to controller
//   Types: "cue_complete", "tap_exit", "tap_dodge", "prompt_response", "tutorial_tap"
//
// PORTABLE: Pure JS. No React imports.
// ============================================================

import FairyPositions from "./fairyPositions.js";
import FairyCues from "./fairyCues.js";

// ============================================================
// CONSTANTS
// ============================================================

// Speech timing (matches AnimInstance for consistency)
var MIN_READ_MS = 2500;
var MS_PER_CHAR = 99;            // read time per character (tuned for mobile reading speed)

// Poof timing (matches AnimInstance visual timing)
var POOF_SNAP_IN_MS = 250;
var POOF_FX_LEAD_MS = 100;

// Default gap between auto-resolved null-at steps
var NULL_STEP_GAP_MS = 100;

// Edge peek defaults (overlay layer)
var PEEK_SCALE = 4.0;

// Debug tracing — flip to false when done
var _PAWN_DEBUG = true;

// Fallback scene when none set
var DEFAULT_SCENE = "forge";

// Laser beam (M-11)
var LASER_GROW_MS = 200;
var LASER_COLOR = "rgba(180, 120, 255, 0.8)";
var LASER_GLOW_COLOR = "rgba(160, 80, 240, 0.4)";
var LASER_WIDTH = 2;
var LASER_DASH = "6 4";
var LASER_DOT_RADIUS = 5;

// ============================================================
// INTERNAL STATE
// ============================================================

var _initialized = false;
var _animRef = null;             // React ref to FairyAnimInstance
var _onPawnEvent = null;         // fn(type, data) → controller feedback
var _currentScene = DEFAULT_SCENE;

// Cue playback state
var _activeCue = null;           // { id, steps, timerIds }
var _cueTimerIds = [];           // setTimeout ids for cleanup
var _lastCueId = null;           // stashed cue id for replay after warning
var _lastCueContext = null;      // stashed context for replay after warning
var _warningTimerId = null;      // setTimeout id for warning auto-complete

// General-purpose timers (non-cue scheduling)
var _timerIds = [];

// Current fairy state (mirrors what we've sent to AnimInstance)
var _currentPos = null;          // last setPos sent
var _visible = false;            // fairy currently on screen
var _laserEl = null;             // SVG overlay element for laser beam (M-11)

// ============================================================
// LIFECYCLE
// ============================================================

/**
 * Initialize the pawn.
 * @param {Object} config
 *   config.animRef       — React ref to FairyAnimInstance
 *   config.onPawnEvent   — fn(type, data) feedback to controller
 *   config.scene         — initial scene id (default: "forge")
 */
function init(config) {
    if (_initialized) {
        console.warn("[FairyPawn] Already initialized. Call destroy() first.");
        return;
    }

    _animRef = config.animRef || null;
    _onPawnEvent = config.onPawnEvent || null;
    _currentScene = config.scene || DEFAULT_SCENE;
    _initialized = true;
}

function destroy() {
    cancelCue();
    _clearTimers();
    _destroyLaser();

    _animRef = null;
    _onPawnEvent = null;
    _currentScene = DEFAULT_SCENE;
    _activeCue = null;
    _currentPos = null;
    _visible = false;
    _initialized = false;
}

// ============================================================
// SCENE MANAGEMENT
// ============================================================

function setScene(sceneId) {
    _currentScene = sceneId || DEFAULT_SCENE;
}

function getScene() {
    return _currentScene;
}

// ============================================================
// COMMAND INTAKE
// ============================================================

/**
 * Full command from controller (M-9 wire-up).
 * Format: { intent, target, line, category, cue }
 *   intent:   "react" | "ambient" | "cue" | "dismiss"
 *   target:   named position id or null
 *   line:     dialogue text or null
 *   category: trigger category for tracking
 *   cue:      named cue id or null (overrides target/line)
 */
function handleCommand(cmd) {
    if (_PAWN_DEBUG) console.log("[PAWN] handleCommand", cmd.intent, cmd.cue, "target:", cmd.target);
    if (!_initialized || !_animRef) return;

    // Lightweight intents that don't need cue teardown
    if (cmd.intent === "set_tutorial_mode") {
        if (_animRef && _animRef.current && _animRef.current.setTutorialMode) {
            _animRef.current.setTutorialMode(cmd.value);
        }
        return;
    }

    if (cmd.intent === "show_warning") {
        showWarning(cmd.line);
        return;
    }

    // Clear intent — hide speech + retract laser, keep fairy visible
    if (cmd.intent === "clear") {
        _cancelTimers();
        if (_animRef && _animRef.current) {
            _animRef.current.hideSpeech();
        }
        _destroyLaser();
        return;
    }

    // Cancel timers but keep fairy visible for cue chaining
    // Full hide only on explicit dismiss
    // Laser cleanup handled by cancelCue / dismiss paths
    _cancelTimers();

    if (cmd.intent === "dismiss") {
        _dismissFairy();
        return;
    }

    // Named cue — play it with context
    if (cmd.cue) {
        var context = {
            line: cmd.line || null,
            target: cmd.target || null,
            category: cmd.category || null,
        };
        playCue(cmd.cue, context);
        return;
    }

    // No named cue — pick staging based on intent + target
    _stageAdHoc(cmd);
}

/**
 * Legacy speak bridge (current App.js wiring).
 * Wraps a line into a default cue based on context.
 */
function handleSpeak(line, category) {
    // DEBUG TRACE: legacy speak path — who called this?
    console.warn("[PAWN] TRACE handleSpeak — line:", line && line.substring(0, 40), "cat:", category);
    console.trace();
    handleCommand({
        intent: "react",
        target: null,
        line: line,
        category: category || null,
        cue: null,
    });
}

// ============================================================
// AD-HOC STAGING
// When controller sends intent + line without a named cue,
// pawn picks the right cue template and fills in context.
// ============================================================

function _stageAdHoc(cmd) {
    // DEBUG TRACE: ad-hoc staging picks speak_in_scene — who sent this?
    console.warn("[PAWN] TRACE _stageAdHoc — intent:", cmd.intent, "target:", cmd.target, "line:", cmd.line && cmd.line.substring(0, 40));
    console.trace();
    var cueId;

    // If a UI target is specified, use overlay cue
    if (cmd.target && _isUITarget(cmd.target)) {
        cueId = "speak_at_target";
    } else {
        cueId = "speak_in_scene";
    }

    var context = {
        line: cmd.line || null,
        target: cmd.target || null,
        category: cmd.category || null,
    };

    playCue(cueId, context);
}

/**
 * Check if a target id refers to a UI element (overlay) vs scene spot.
 */
function _isUITarget(targetId) {
    var resolved = FairyPositions.resolveUITarget(targetId);
    return resolved !== null;
}

// ============================================================
// CUE PLAYBACK
// Reads cue definition from fairyCues.js, resolves null
// placeholders, schedules steps via setTimeout chain.
// ============================================================

/**
 * Play a named cue with context for null resolution.
 * @param {string} cueId — id from fairyCues registry
 * @param {Object} context — { line, target, category }
 */
function playCue(cueId, context) {
    // DEBUG TRACE: who is triggering speak_in_scene during tutorial?
    if (cueId === "speak_in_scene" || cueId === "speak_at_target") {
        console.warn("[PAWN] TRACE playCue '" + cueId + "' — caller stack:");
        console.trace();
    }
    var cueDef = FairyCues.getCue(cueId);
    if (!cueDef) {
        console.warn("[FairyPawn] Unknown cue: " + cueId);
        return;
    }

    // Stash for potential replay after warning interrupt
    _lastCueId = cueId;
    _lastCueContext = context || null;

    // Deep-copy steps so we can mutate during resolution
    var steps = _copySteps(cueDef.steps);
    var layer = cueDef.layer;

    // Resolve null placeholders
    _resolveNulls(steps, context || {}, layer);

    // Schedule all steps
    _activeCue = { id: cueId, layer: layer, waitForInput: !!cueDef.waitForInput };
    _cueTimerIds = [];

    for (var i = 0; i < steps.length; i++) {
        _scheduleStep(steps[i]);
    }

    // Schedule cue-complete callback after last step
    // Skip if waitForInput — completion is driven by onChoiceSelect instead
    if (!cueDef.waitForInput) {
        var lastAt = 0;
        var lastDuration = 0;
        for (var j = steps.length - 1; j >= 0; j--) {
            if (steps[j].at !== null && steps[j].at !== undefined) {
                lastAt = steps[j].at;
                lastDuration = steps[j].duration || 0;
                break;
            }
        }
        var completionMs = lastAt + lastDuration + 200;
        _scheduleCueTimer(function() {
            var cueId = _activeCue ? _activeCue.id : null;
            if (_PAWN_DEBUG) console.log("[PAWN] cue_complete:", cueId);
            _activeCue = null;
            if (_onPawnEvent) _onPawnEvent("cue_complete", { cue: cueId });
        }, completionMs);
    }
}

/**
 * Cancel any in-progress cue. Hides fairy immediately.
 */
function _cancelTimers() {
    if (_PAWN_DEBUG && (_cueTimerIds.length || _timerIds.length)) console.log("[PAWN] _cancelTimers cue:" + (_activeCue ? _activeCue.id : "none") + " cueTimers:" + _cueTimerIds.length + " timers:" + _timerIds.length, new Error().stack.split("\n")[2]);
    for (var i = 0; i < _cueTimerIds.length; i++) {
        clearTimeout(_cueTimerIds[i]);
    }
    _cueTimerIds = [];
    for (var j = 0; j < _timerIds.length; j++) {
        clearTimeout(_timerIds[j]);
    }
    _timerIds = [];
    _activeCue = null;
}

function cancelCue() {
    _cancelTimers();

    // Kill warning replay timer if active
    if (_warningTimerId) { clearTimeout(_warningTimerId); _warningTimerId = null; }

    // Kill laser if active
    _destroyLaser();

    // Tell AnimInstance to hide
    if (_animRef && _animRef.current) {
        _animRef.current.hide();
    }
    _visible = false;
    _currentPos = null;
}

// ============================================================
// NULL RESOLUTION
// Fills placeholder values in cue steps before scheduling.
//
// Convention from fairyCues.js:
//   text: null     → filled from context.line
//   target: null   → filled from context.target
//   spot: null     → pawn picks based on scene
//   peek: null     → pawn picks random edge
//   duration: null → calculated from text length
//   at: null       → chained after previous step + its duration
// ============================================================

function _resolveNulls(steps, context, layer) {
    var lastResolvedAt = 0;
    var lastDuration = 0;

    for (var i = 0; i < steps.length; i++) {
        var step = steps[i];

        // --- Resolve text ---
        if (step.text === null && context.line) {
            step.text = context.line;
        }

        // --- Resolve target ---
        if (step.target === null && context.target) {
            step.target = context.target;
        }

        // --- Resolve spot ---
        if (step.spot === null) {
            step.spot = _pickSceneSpot();
        }

        // --- Resolve peek ---
        if (step.peek === null) {
            step.peek = _pickRandomEdge();
        }

        // --- Resolve duration from text ---
        if (step.duration === null && step.text) {
            step.duration = _readTimeMs(step.text);
        }
        if (step.duration === null) {
            step.duration = 0;
        }

        // --- Resolve at (null = chain after previous) ---
        if (step.at === null || step.at === undefined) {
            step.at = lastResolvedAt + lastDuration + NULL_STEP_GAP_MS;
        }

        lastResolvedAt = step.at;
        lastDuration = step.duration;
    }
}

// ============================================================
// STEP EXECUTOR
// Routes each step.cmd to the correct AnimInstance ref call.
// ============================================================

function _scheduleStep(step) {
    var ms = step.at || 0;
    _scheduleCueTimer(function() {
        _executeStep(step);
    }, ms);
}

function _executeStep(step) {
    if (!_animRef || !_animRef.current) return;
    var anim = _animRef.current;

    switch (step.cmd) {

        case "poof_in":
            _executePoof(step);
            break;

        case "poof_out":
            _executePoofOut(step);
            break;

        case "move":
            _executeMove(step);
            break;

        case "speak":
            if (step.text) {
                anim.showSpeech(step.text);
            }
            break;

        case "hide_speech":
            anim.hideSpeech();
            break;

        case "emote":
            // Future: trigger emote animation
            break;

        case "set_anim":
            anim.setAnim(step.anim || "idle");
            break;

        case "set_tappable":
            anim.setTappable(step.value !== undefined ? step.value : false);
            break;

        case "play_audio":
            // Route through AnimInstance pop for now
            // Future: wire through main audio system
            anim.playPop();
            break;

        case "play_fx":
            // Future: emit bus tag for fxCueSubSystem
            // if (step.busTag && _bus) _bus.emit(step.busTag, {});
            break;

        case "laser_on":
            _laserOn(step);
            break;

        case "laser_off":
            _destroyLaser();
            break;

        case "dodge_dash":
            _executeDodgeDash(step);
            break;

        case "wait":
            // No-op — timing handled by step.at
            break;

        case "show_choice":
            anim.showChoice(step.text, step.options);
            break;

        default:
            console.warn("[FairyPawn] Unknown cue cmd: " + step.cmd);
            break;
    }
}

// ============================================================
// COMMAND EXECUTORS
// Complex commands that orchestrate multiple AnimInstance calls.
// ============================================================

/**
 * Poof-in: resolve position, FX burst, scale-in animation.
 * Handles scene spots, UI targets, and edge peeks.
 */
function _executePoof(step) {
    if (_PAWN_DEBUG) console.log("[PAWN] _executePoof peek:", step.peek, "target:", step.target, "spot:", step.spot);
    var anim = _animRef.current;
    if (!anim) return;

    var pos = null;
    var layer = _activeCue ? _activeCue.layer : "overlay";

    // --- Edge peek ---
    if (step.peek) {
        var peek = (typeof step.peek === "string")
            ? FairyPositions.getEdgePeek(step.peek)
            : step.peek;
        if (!peek) return;

        var peekScale = step.scale || PEEK_SCALE;

        // Instant: poof at destination, no slide
        if (step.instant) {
            _doPoof(anim, peek.to.x, peek.to.y, peekScale, "50% 50%", step.duration);
            return;
        }

        // Start off-screen
        anim.setPos({
            x: peek.from.x, y: peek.from.y,
            scale: peekScale, rot: peek.rot || 0,
            transition: 0,
            transformOrigin: "50% 50%",
        });
        // Slide in
        var slideMs = step.duration || 1200;
        _scheduleTimer(function() {
            anim.setPos({
                x: peek.to.x, y: peek.to.y,
                scale: peekScale, rot: peek.rot || 0,
                transition: slideMs,
                transformOrigin: "50% 50%",
            });
        }, 50);
        _currentPos = { x: peek.to.x, y: peek.to.y, scale: peekScale };
        _visible = true;
        return;
    }

    // --- Oppose: poof on opposite side of viewport from a target ---
    // Resolves target's raw DOM position, places fairy offset toward
    // the opposite half of screen — not a full mirror, just enough clearance.
    if (step.oppose) {
        var oppTarget = FairyPositions.resolveUITargetRaw(step.oppose);
        if (oppTarget) {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var targetXPct = (oppTarget.x / vw) * 100;
            var targetYPct = (oppTarget.y / vh) * 100;
            // Shift 25% away from target toward opposite side
            var oppX;
            if (targetXPct > 50) {
                oppX = Math.max(30, targetXPct - 25);
            } else {
                oppX = Math.min(70, targetXPct + 25);
            }
            // Y: push toward vertical center, biased lower for bottom targets
            var oppY = targetYPct < 50 ? 55 : 65;
            var oppScale = step.scale || 0.9;
            _doPoof(anim, oppX, oppY, oppScale, "50% 50%", step.duration);
            return;
        }
    }

    // --- UI target (overlay) ---
    if (step.target) {
        pos = _resolveTargetPos(step.target);
        if (pos) {
            _doPoof(anim, pos.x, pos.y, pos.scale || 1.0, "50% 50%", step.duration);
            return;
        }
    }

    // --- Scene spot ---
    if (step.spot) {
        pos = _resolveSceneSpot(step.spot);
        if (pos) {
            _doPoof(anim, pos.x, pos.y, pos.scale, "50% 100%", step.duration);
            return;
        }
    }

    // --- Direct coordinates ---
    if (step.x !== undefined && step.y !== undefined) {
        _doPoof(anim, step.x, step.y, step.scale || 1.0, "50% 50%", step.duration);
        return;
    }

    // --- Fallback: center of viewport ---
    _doPoof(anim, 50, 50, 1.0, "50% 50%", step.duration);
}

/**
 * Core poof-in animation sequence.
 */
function _doPoof(anim, x, y, scale, tOrigin, duration) {
    if (_PAWN_DEBUG) console.log("[PAWN] _doPoof x:" + x + " y:" + y + " scale:" + scale + " tOrigin:" + tOrigin);
    var snapMs = duration || POOF_SNAP_IN_MS;

    // FX burst
    anim.poofFX(x, y);
    anim.playPop();

    // Scale-in after FX lead
    _scheduleTimer(function() {
        anim.setPos({
            x: x, y: y, scale: 0.1,
            rot: 0, transition: 0,
            transformOrigin: tOrigin,
        });
        _scheduleTimer(function() {
            anim.setPos({
                x: x, y: y, scale: scale,
                rot: 0, transition: snapMs,
                transformOrigin: tOrigin,
            });
        }, 50);
    }, POOF_FX_LEAD_MS);

    _currentPos = { x: x, y: y, scale: scale };
    _visible = true;
}

/**
 * Poof-out: scale-down + FX burst, then hide.
 */
function _executePoofOut(step) {
    if (_PAWN_DEBUG) console.log("[PAWN] _executePoofOut dur:" + step.duration + " layer:" + (_activeCue ? _activeCue.layer : "none") + " pos:" + JSON.stringify(_currentPos));
    var anim = _animRef.current;
    if (!anim) return;

    var snapMs = step.duration || 200;
    var pos = _currentPos || { x: 50, y: 50, scale: 1.0 };

    // If this was a peek, slide out instead of poof
    if (_activeCue && _activeCue.layer === "overlay" && step.duration > 500) {
        // Peek slide-out — just hide after slide
        // The peek from pos is still stored; re-use reverse
        anim.setPos({
            x: pos.x, y: pos.y > 50 ? 115 : -15,
            scale: pos.scale, rot: 0,
            transition: snapMs,
            transformOrigin: "50% 50%",
        });
        _scheduleTimer(function() {
            anim.hide();
            _visible = false;
            _currentPos = null;
        }, snapMs + 100);
        return;
    }

    // Standard poof-out
    anim.hideSpeech();
    anim.setTappable(false);

    _scheduleTimer(function() {
        anim.poofFX(pos.x, pos.y);
        anim.playPop();
    }, 100);

    _scheduleTimer(function() {
        anim.setPos({
            x: pos.x, y: pos.y, scale: 0.1,
            rot: 0, transition: snapMs,
            transformOrigin: _currentPos ? "50% 100%" : "50% 50%",
        });
    }, 100 + POOF_FX_LEAD_MS);

    _scheduleTimer(function() {
        anim.hide();
        _visible = false;
        _currentPos = null;
    }, 100 + POOF_FX_LEAD_MS + snapMs + 150);
}

/**
 * Move: transition fairy to a new position.
 */
function _executeMove(step) {
    var anim = _animRef.current;
    if (!anim) return;

    var pos = null;
    var tOrigin = "50% 50%";

    if (step.target) {
        pos = _resolveTargetPos(step.target);
    } else if (step.spot) {
        pos = _resolveSceneSpot(step.spot);
        tOrigin = "50% 100%";
    } else if (step.x !== undefined && step.y !== undefined) {
        pos = { x: step.x, y: step.y, scale: step.scale || 1.0 };
    }

    if (!pos) return;

    anim.setPos({
        x: pos.x, y: pos.y,
        scale: pos.scale || 1.0,
        rot: step.rot || 0,
        transition: step.duration || 500,
        transformOrigin: tOrigin,
    });

    _currentPos = { x: pos.x, y: pos.y, scale: pos.scale || 1.0 };
}

/**
 * Dodge dash: animate along a dodge path entry → exit.
 */
function _executeDodgeDash(step) {
    var anim = _animRef.current;
    if (!anim) return;

    var path = FairyPositions.getDodgePath(_currentScene, step.path);
    if (!path) return;

    var dashMs = step.duration || 1500;

    // Start at entry
    anim.setPos({
        x: path.entry.x, y: path.y,
        scale: path.scale, rot: 0,
        transition: 0,
        transformOrigin: "50% 100%",
    });

    // Dash to exit
    _scheduleTimer(function() {
        anim.setPos({
            x: path.exit.x, y: path.y,
            scale: path.scale, rot: 0,
            transition: dashMs,
            transformOrigin: "50% 100%",
        });
    }, 50);

    // Hide after reaching exit
    _scheduleTimer(function() {
        anim.hide();
        _visible = false;
        _currentPos = null;
    }, dashMs + 100);

    _currentPos = { x: path.entry.x, y: path.y, scale: path.scale };
    _visible = true;
}

// ============================================================
// LASER BEAM (M-11)
// Raw DOM SVG — pawn owns lifecycle. No React involvement.
// Purple dashed teaching pointer from fairy to target element.
// ============================================================

/**
 * Resolve target and create laser beam from fairy → target.
 */
function _laserOn(step) {
    if (!_currentPos) return;

    var targetId = step.target;
    if (!targetId) return;

    // Resolve target to viewport px (raw — no fairy offset)
    var resolved = FairyPositions.resolveUITargetRaw(targetId);
    if (!resolved) {
        console.warn("[FairyPawn] Laser target not found: " + targetId);
        return;
    }

    // Convert fairy % pos to viewport px
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var fromX = (_currentPos.x / 100) * vw;
    var fromY = (_currentPos.y / 100) * vh;
    var toX = resolved.x;
    var toY = resolved.y;

    _createLaser(fromX, fromY, toX, toY);

    // Tell AnimInstance where laser is pointing so bubble dodges away
    var anim = _animRef ? _animRef.current : null;
    if (anim && anim.setLaserTarget) {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        anim.setLaserTarget((toX / vw) * 100, (toY / vh) * 100);
    }
}

/**
 * Build the SVG overlay and append to document.body.
 * Beam grows from fairy to target over LASER_GROW_MS.
 */
function _createLaser(fromX, fromY, toX, toY) {
    _destroyLaser();

    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "fairy-laser-svg");
    svg.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:96;overflow:visible;"; // above drawer(95), below fxCanvas(100)

    // --- Defs: glow filter ---
    var defs = document.createElementNS(ns, "defs");
    var filter = document.createElementNS(ns, "filter");
    filter.setAttribute("id", "fairy-laser-glow");
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");

    var blur = document.createElementNS(ns, "feGaussianBlur");
    blur.setAttribute("stdDeviation", "4");
    blur.setAttribute("result", "blur");
    filter.appendChild(blur);

    var merge = document.createElementNS(ns, "feMerge");
    var mn1 = document.createElementNS(ns, "feMergeNode");
    mn1.setAttribute("in", "blur");
    merge.appendChild(mn1);
    var mn2 = document.createElementNS(ns, "feMergeNode");
    mn2.setAttribute("in", "SourceGraphic");
    merge.appendChild(mn2);
    filter.appendChild(merge);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // --- Glow line (wide, blurred background) ---
    var glowLine = document.createElementNS(ns, "line");
    glowLine.setAttribute("x1", fromX);
    glowLine.setAttribute("y1", fromY);
    glowLine.setAttribute("x2", fromX);
    glowLine.setAttribute("y2", fromY);
    glowLine.setAttribute("stroke", LASER_GLOW_COLOR);
    glowLine.setAttribute("stroke-width", LASER_WIDTH * 4);
    glowLine.setAttribute("filter", "url(#fairy-laser-glow)");
    svg.appendChild(glowLine);

    // --- Main beam (dashed, crisp) ---
    var beam = document.createElementNS(ns, "line");
    beam.setAttribute("x1", fromX);
    beam.setAttribute("y1", fromY);
    beam.setAttribute("x2", fromX);
    beam.setAttribute("y2", fromY);
    beam.setAttribute("stroke", LASER_COLOR);
    beam.setAttribute("stroke-width", LASER_WIDTH);
    beam.setAttribute("stroke-dasharray", LASER_DASH);
    beam.setAttribute("stroke-linecap", "round");
    svg.appendChild(beam);

    // --- Target dot (pulsing circle at endpoint) ---
    var dot = document.createElementNS(ns, "circle");
    dot.setAttribute("cx", toX);
    dot.setAttribute("cy", toY);
    dot.setAttribute("r", 0);
    dot.setAttribute("fill", LASER_COLOR);
    dot.setAttribute("filter", "url(#fairy-laser-glow)");
    svg.appendChild(dot);

    // --- Inject CSS animations if not already present ---
    if (!document.getElementById("fairy-laser-style")) {
        var style = document.createElement("style");
        style.id = "fairy-laser-style";
        style.textContent =
            "@keyframes fairy-laser-pulse { from { opacity: 0.6; } to { opacity: 1; } } " +
            "@keyframes fairy-laser-dash { to { stroke-dashoffset: -20; } }";
        document.head.appendChild(style);
    }

    document.body.appendChild(svg);
    _laserEl = svg;

    // --- Grow animation: beam extends from fairy → target ---
    // rAF interpolation (SVG attribute transitions unreliable cross-browser)
    var startTime = null;

    function _growFrame(ts) {
        if (!_laserEl) return; // destroyed mid-animation
        if (!startTime) startTime = ts;
        var elapsed = ts - startTime;
        var t = Math.min(elapsed / LASER_GROW_MS, 1);
        // ease-out curve
        var e = 1 - Math.pow(1 - t, 2);

        var cx = fromX + (toX - fromX) * e;
        var cy = fromY + (toY - fromY) * e;

        glowLine.setAttribute("x2", cx);
        glowLine.setAttribute("y2", cy);
        beam.setAttribute("x2", cx);
        beam.setAttribute("y2", cy);
        dot.setAttribute("r", LASER_DOT_RADIUS * e);

        if (t < 1) {
            requestAnimationFrame(_growFrame);
        } else {
            // Start looping animations after grow completes
            beam.style.animation = "fairy-laser-dash 0.6s linear infinite";
            dot.style.animation = "fairy-laser-pulse 0.8s ease-in-out infinite alternate";
        }
    }

    requestAnimationFrame(_growFrame);
}

/**
 * Remove laser SVG from DOM. Safe to call when no laser exists.
 */
function _destroyLaser() {
    if (_laserEl) {
        if (_laserEl.parentNode) {
            _laserEl.parentNode.removeChild(_laserEl);
        }
        _laserEl = null;
    }
    // Clear bubble dodge constraint
    var anim = _animRef ? _animRef.current : null;
    if (anim && anim.clearLaserTarget) {
        anim.clearLaserTarget();
    }
}

// ============================================================
// DISMISS
// ============================================================

function _dismissFairy() {
    // Stash position before cancelCue clears it
    var pos = _currentPos || { x: 50, y: 50, scale: 1.0 };
    cancelCue();
    if (_animRef && _animRef.current) {
        // Re-set pos so beginExit has something to work with
        _animRef.current.setPos(pos);
        _animRef.current.beginExit(pos.x, pos.y, pos.scale, function() {
            if (_onPawnEvent) _onPawnEvent("dismissed", {});
        });
    }
    _visible = false;
    _currentPos = null;
}

// ============================================================
// POSITION RESOLUTION
// Wraps FairyPositions with layer-aware transformOrigin.
// ============================================================

/**
 * Resolve a scene spot by id. Returns { x, y, scale } or null.
 */
function _resolveSceneSpot(spotId) {
    var spot = FairyPositions.getSpot(_currentScene, spotId);
    if (!spot) return null;
    return { x: spot.x, y: spot.y, scale: spot.scale };
}

/**
 * Resolve a UI target by id. Returns { x, y, scale } in viewport %
 * or null if element not found.
 */
var UI_TARGET_EDGE_MIN = 12;
var UI_TARGET_EDGE_MAX = 88;

function _resolveTargetPos(targetId) {
    var resolved = FairyPositions.resolveUITarget(targetId);
    if (!resolved) return null;

    // Convert px to viewport %
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var xPct = (resolved.x / vw) * 100;
    var yPct = (resolved.y / vh) * 100;

    // Clamp to safe viewport region
    if (xPct < UI_TARGET_EDGE_MIN) xPct = UI_TARGET_EDGE_MIN;
    if (xPct > UI_TARGET_EDGE_MAX) xPct = UI_TARGET_EDGE_MAX;
    if (yPct < UI_TARGET_EDGE_MIN) yPct = UI_TARGET_EDGE_MIN;
    if (yPct > UI_TARGET_EDGE_MAX) yPct = UI_TARGET_EDGE_MAX;

    return { x: xPct, y: yPct, scale: 1.0 };
}

// ============================================================
// STAGING HELPERS
// Used when pawn needs to pick positions on its own.
// ============================================================

// Cycle index for scene spots — avoids repeats
var _spotCycleIndex = 0;
var _spotPool = ["center_floor", "near_anvil", "forge_mouth", "front_left", "front_right"];

function _pickSceneSpot() {
    var spotId = _spotPool[_spotCycleIndex % _spotPool.length];
    _spotCycleIndex++;
    return spotId;
}

var _edgePool = ["bottom", "top", "left", "right"];
var _edgeCycleIndex = 0;

function _pickRandomEdge() {
    var edgeId = _edgePool[_edgeCycleIndex % _edgePool.length];
    _edgeCycleIndex++;
    return edgeId;
}

/**
 * Provide a dodge destination for AnimInstance tap interaction.
 * Uses roam zone from current scene.
 */
function getDodgeSpot(currentX, currentY) {
    var point = FairyPositions.getRandomRoamPoint(_currentScene, "floor_open");
    if (point) {
        return { x: point.x, y: point.y };
    }
    // Fallback — pick far from current position
    var spots = [
        { x: 20, y: 25 }, { x: 80, y: 25 },
        { x: 15, y: 70 }, { x: 85, y: 70 },
    ];
    var best = spots[0];
    var bestDist = 0;
    for (var i = 0; i < spots.length; i++) {
        var dx = spots[i].x - currentX;
        var dy = spots[i].y - currentY;
        var dist = dx * dx + dy * dy;
        if (dist > bestDist) {
            bestDist = dist;
            best = spots[i];
        }
    }
    return best;
}

// ============================================================
// FEEDBACK HANDLERS
// Passed as props/callbacks to AnimInstance.
// Route tap events back to controller.
// ============================================================

function onTapExit() {
    _visible = false;
    _currentPos = null;
    cancelCue();
    if (_onPawnEvent) _onPawnEvent("tap_exit", {});
}

function onTapDodge(x, y, tier) {
    _currentPos = { x: x, y: y, scale: 1.0 };
    if (_onPawnEvent) _onPawnEvent("tap_dodge", { x: x, y: y, tier: tier });
}

/**
 * Player tapped fairy during tutorial mode.
 * AnimInstance skipped irritation — just forward to controller.
 */
function onTutorialTap() {
    if (_onPawnEvent) _onPawnEvent("tutorial_tap", {});
}

/**
 * Tutorial tap warning — cancel current cue cleanly, show warning text
 * in place, then replay the interrupted cue from scratch when done.
 * Sequencer stays in _waiting state the whole time — it never knows
 * anything happened. The replayed cue fires cue_complete naturally.
 */
function showWarning(line) {
    // Clear any previous warning timer
    if (_warningTimerId) { clearTimeout(_warningTimerId); _warningTimerId = null; }

    // --- CANCEL: kill timers, laser, speech — fairy stays visible at current pos ---
    for (var i = 0; i < _cueTimerIds.length; i++) {
        clearTimeout(_cueTimerIds[i]);
    }
    _cueTimerIds = [];
    _activeCue = null;
    _destroyLaser();

    if (_animRef && _animRef.current) {
        _animRef.current.hideSpeech();
    }

    // --- UPDATE: show warning text on the fairy that's already there ---
    if (_animRef && _animRef.current) {
        _animRef.current.showSpeech(line);
    }

    // --- DO: when warning is done, replay the stashed cue from scratch ---
    var replayCueId = _lastCueId;
    var replayContext = _lastCueContext;
    var readMs = Math.max(2500, line.length * 55);

    _warningTimerId = setTimeout(function() {
        _warningTimerId = null;
        if (_animRef && _animRef.current) _animRef.current.hideSpeech();

        // Replay interrupted cue — poof in fresh, laser, speech, the works
        if (replayCueId) {
            playCue(replayCueId, replayContext);
        }
    }, readMs);
}

/**
 * Player tapped a choice option. AnimInstance already cleared the bubble.
 * Forward the answer upward, then complete the waitForInput cue.
 */
function onChoiceSelect(answer) {
    // Audio feedback — accept sound for choice selection
    if (_animRef && _animRef.current) _animRef.current.playAccept();

    // Tell controller/tutorial which option was picked
    if (_onPawnEvent) _onPawnEvent("prompt_response", { answer: answer });

    // If this was a waitForInput cue, mark it complete now
    if (_activeCue && _activeCue.waitForInput) {
        var cueId = _activeCue.id;
        _activeCue = null;
        if (_onPawnEvent) _onPawnEvent("cue_complete", { cue: cueId });
    }
}

// ============================================================
// TIMER UTILITIES
// ============================================================

function _scheduleCueTimer(fn, ms) {
    var id = setTimeout(fn, ms);
    _cueTimerIds.push(id);
    return id;
}

function _scheduleTimer(fn, ms) {
    var id = setTimeout(fn, ms);
    _timerIds.push(id);
    return id;
}

function _clearTimers() {
    for (var i = 0; i < _timerIds.length; i++) {
        clearTimeout(_timerIds[i]);
    }
    _timerIds = [];
}

// ============================================================
// HELPERS
// ============================================================

function _readTimeMs(text) {
    if (!text) return MIN_READ_MS;
    return Math.max(MIN_READ_MS, text.length * MS_PER_CHAR + 1000);
}

function _copySteps(steps) {
    var result = [];
    for (var i = 0; i < steps.length; i++) {
        var copy = {};
        var keys = Object.keys(steps[i]);
        for (var k = 0; k < keys.length; k++) {
            copy[keys[k]] = steps[i][keys[k]];
        }
        result.push(copy);
    }
    return result;
}

// ============================================================
// QUERY
// ============================================================

function isReady() {
    return _initialized && _animRef && !!_animRef.current;
}

function isVisible() {
    return _visible;
}

function isBusy() {
    return _activeCue !== null;
}

function getActiveCue() {
    return _activeCue ? _activeCue.id : null;
}

function getCurrentPos() {
    return _currentPos;
}

// ============================================================
// PUBLIC API
// ============================================================

var FairyPawn = {
    // Lifecycle
    init: init,
    destroy: destroy,

    // Scene
    setScene: setScene,
    getScene: getScene,

    // Command intake
    handleCommand: handleCommand,
    handleSpeak: handleSpeak,

    // Cue playback
    playCue: playCue,
    cancelCue: cancelCue,

    // Dodge provider (passed as prop to AnimInstance)
    getDodgeSpot: getDodgeSpot,

    // Feedback handlers (passed as props to AnimInstance)
    onTapExit: onTapExit,
    onTapDodge: onTapDodge,
    onTutorialTap: onTutorialTap,
    showWarning: showWarning,
    onChoiceSelect: onChoiceSelect,

    // Query
    isReady: isReady,
    isVisible: isVisible,
    isBusy: isBusy,
    getActiveCue: getActiveCue,
    getCurrentPos: getCurrentPos,
};

export default FairyPawn;