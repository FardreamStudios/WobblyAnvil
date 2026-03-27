// ============================================================
// FairyAnimInstance.js — Pure Animation Renderer (M-8)
//
// UE ANALOGY: AnimInstance / AnimBlueprint.
// Receives commands via ref, renders sprite/FX/bubble.
// Zero decision-making — pawn (fairyPawn.js) drives everything.
//
// COMMAND API (via ref):
//   setPos({x, y, scale, rot, transition, transformOrigin})
//   hide()              — clear fairy + speech + tappable
//   poofFX(x, y)        — trigger particle burst at location
//   showSpeech(text)     — show speech bubble
//   hideSpeech()         — dismiss speech bubble
//   setTappable(bool)    — enable/disable tap interaction
//   setAnim(name)        — switch sprite anim state (future)
//   resetIrritation()    — reset tap tier to 0
//   getState()           — {pos, tappable, irritation}
//   playPop()            — poof sound
//   playTapPop()         — lighter tap sound
//   showChoice(text, options) — show speech bubble with tappable options
//   hideChoice()         — dismiss choice bubble
//   setLaserTarget(x,y)  — bubble dodges away from this viewport % position
//   clearLaserTarget()   — remove dodge constraint
//
// CALLBACKS (via props):
//   onTapExit()          — fired after nuclear exit (tier 4)
//   onTapDodge(x,y,tier) — fired when dodge starts (tier 2-3)
//   getDodgeSpot(cx,cy)  — pawn provides dodge destination
//   onChoiceSelect(answer) — fired when player taps a choice option
//
// POSITIONING: Outer div uses left/top in % + transform.
// Pawn controls transformOrigin per layer:
//   scene  = "50% 100%" (feet pinned, shrinks upward)
//   overlay = "50% 50%" (center, floating)
//
// TEMPORARY RESIDENTS (move to pawn at M-7):
//   PoofFX, SpeechBubble — React sub-components that render
//   FX and dialogue. Will become sibling components or pawn-
//   managed overlays once the pawn exists.
// ============================================================

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import THEME from "../config/theme.js";

var PUB = process.env.PUBLIC_URL || "";
var FAIRY_POP_SRC = PUB + "/audio/sFairyPop.mp3";
var FAIRY_POP_VOL = 0.35;
var FAIRY_POP_RATE_MIN = 0.55;
var FAIRY_POP_RATE_MAX = 1.05;

// ============================================================
// Sprite Params
// ============================================================
var SPRITE_CFG = {
    sheet:    PUB + "/images/anim/waFairyIdleSS.png",
    frames:   5,
    frameW:   380,
    frameH:   380,
    fps:      1.0,
    sizePct:  12,
};

// ============================================================
// Poof Visual Params (used by tap dodge + beginExit)
// ============================================================
var POOF_SCALE_START = 0.1;
var POOF_SCALE_END = 1;
var POOF_SNAP_IN_MS = 250;
var POOF_SNAP_OUT_MS = 200;
var POOF_FX_LEAD_MS = 100;

// ============================================================
// Speech Bubble Config
// ============================================================
var BUBBLE_GAP_VW = 1;             // vw padding above fairy head
var BUBBLE_EDGE_THRESHOLD = 20;   // fairy x% where edge shift kicks in
var BUBBLE_EDGE_SHIFT = 15;       // vw shift toward center at edges
var BUBBLE_LASER_DODGE = 20;      // vw shift away from laser target x
var BUBBLE_MAX_W_VW = 42;         // max bubble width in vw (matches CSS)
var BUBBLE_LINE_H_VW = 2.4;       // estimated line height in vw
var BUBBLE_PAD_VW = 3.5;          // vertical padding + border + tail in vw
var BUBBLE_CHARS_PER_LINE = 22;   // rough chars per line at max width
var BUBBLE_SAFE_MARGIN = 5;       // % margin from viewport edge

// ============================================================
// Tap Interaction Config
// ============================================================
var TAP_COOLDOWN_MS = 1200;      // min ms between accepted taps
var TAP_HOLD_MS = 5000;          // how long she stays after a tap
var DODGE_PAUSE_MS = 300;        // gap between vanish and reappear
var MIN_READ_MS = 2500;          // minimum time speech stays up
var MS_PER_CHAR = 80;            // extra read time per character

// Scale options for dodge — tier 3+ can go tiny
var DODGE_SCALES_NORMAL = [0.8, 1.0, 1.0, 0.9];
var DODGE_SCALES_TINY = [0.35, 0.4, 0.45];

// ============================================================
// Irritation Lines — 5 tiers x 5 lines
// Tier 0: amused  |  1: annoyed  |  2: angry (dodges)
// 3: furious (dodges, sometimes tiny)  |  4: nuclear (leaves)
// ============================================================
var IRRITATION_LINES = [
    [
        "hey! personal space!",
        "rude.",
        "do you poke everyone you meet",
        "that tickled. don't do it again.",
        "i was trying to look mysterious",
    ],
    [
        "okay seriously stop that",
        "i will remember this",
        "you're testing divine patience here",
        "my hair is NOT a toy",
        "i have a laser. don't test me.",
    ],
    [
        "TOO SLOW",
        "over here, genius",
        "you'll never catch me",
        "i am LITERALLY a god",
        "pathetic mortal reflexes",
    ],
    [
        "can't catch me at ANY size",
        "down here, dummy",
        "getting tired yet?",
        "i could do this forever. can you?",
        "this is beneath me. and yet.",
    ],
    [
        "ENOUGH. i'm leaving.",
        "you've lost fairy privileges.",
        "i hope your next sword shatters.",
        "the forge god has LEFT.",
        "don't come crying when you need help.",
    ],
];

// ============================================================
// Default dodge spots — fallback when pawn doesn't provide any
// ============================================================
var DEFAULT_DODGE_SPOTS = [
    { x: 20, y: 25 }, { x: 80, y: 25 },
    { x: 15, y: 70 }, { x: 85, y: 70 },
    { x: 25, y: 80 }, { x: 75, y: 20 },
    { x: 15, y: 40 }, { x: 85, y: 60 },
];

// ============================================================
// Fairy Dust Poof FX — 3-layer: core flash + spark ring + dust motes
// TEMPORARY: Moves to pawn-managed overlay at M-7
// ============================================================
var POOF_FX_SIZE_VW = 18;
var POOF_FX_DURATION_MS = 1400;

function makeSparkOffsets() {
    var count = 8;
    var arr = [];
    for (var i = 0; i < count; i++) {
        var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        var dist = 3.5 + Math.random() * 3;
        arr.push({
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            size: 0.4 + Math.random() * 0.6,
            delay: Math.random() * 120,
        });
    }
    return arr;
}

function PoofFX(props) {
    var [phase, setPhase] = useState("flash");
    var sparksRef = useRef(makeSparkOffsets());

    useEffect(function() {
        var t1 = setTimeout(function() { setPhase("burst"); }, 60);
        var t2 = setTimeout(function() { setPhase("fade"); }, 400);
        return function() { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    var isFlash = phase === "flash";
    var isFade = phase === "fade";
    var sparks = sparksRef.current;

    var coreScale = isFlash ? 0.3 : (isFade ? 1.6 : 1.0);
    var coreOpacity = isFade ? 0 : 1;
    var coreStyle = {
        position: "absolute",
        left: props.x + "%",
        top: props.y + "%",
        width: POOF_FX_SIZE_VW + "vw",
        height: POOF_FX_SIZE_VW + "vw",
        transform: "translate(-50%, -50%) scale(" + coreScale + ")",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255, 240, 255, 1) 0%, rgba(210, 160, 255, 0.95) 25%, rgba(160, 80, 240, 0.9) 50%, rgba(120, 40, 200, 0.4) 75%, rgba(80, 20, 160, 0) 100%)",
        boxShadow: "0 0 40px 15px rgba(200, 140, 255, 0.7), 0 0 80px 30px rgba(140, 60, 220, 0.3)",
        opacity: coreOpacity,
        transition: isFlash
            ? "transform 150ms ease-out, opacity 150ms ease-out"
            : "transform " + (POOF_FX_DURATION_MS - 400) + "ms ease-out, opacity " + (POOF_FX_DURATION_MS - 400) + "ms ease-out",
        pointerEvents: "none",
        zIndex: 3,
    };

    var sparkElements = sparks.map(function(s, i) {
        var sx = isFade ? s.x * 1.8 : (isFlash ? 0 : s.x);
        var sy = isFade ? s.y * 1.8 : (isFlash ? 0 : s.y);
        var sparkOpacity = isFade ? 0 : (isFlash ? 0.5 : 1);
        return (
            <div key={i} style={{
                position: "absolute",
                left: "calc(50% + " + sx + "vw)",
                top: "calc(50% + " + sy + "vw)",
                width: s.size + "vw",
                height: s.size + "vw",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255, 230, 255, 1) 0%, rgba(200, 140, 255, 0.8) 50%, rgba(160, 80, 240, 0) 100%)",
                boxShadow: "0 0 " + (s.size * 6) + "px " + (s.size * 2) + "px rgba(180, 120, 255, 0.6)",
                opacity: sparkOpacity,
                transform: "translate(-50%, -50%)",
                transition: isFlash
                    ? "none"
                    : "left " + (POOF_FX_DURATION_MS - 200) + "ms ease-out " + s.delay + "ms, "
                    + "top " + (POOF_FX_DURATION_MS - 200) + "ms ease-out " + s.delay + "ms, "
                    + "opacity " + (POOF_FX_DURATION_MS - 200) + "ms ease-out " + s.delay + "ms",
                pointerEvents: "none",
            }} />
        );
    });

    var ringScale = isFlash ? 0.4 : (isFade ? 2.0 : 1.2);
    var ringOpacity = isFade ? 0 : (isFlash ? 0.3 : 0.6);
    var ringStyle = {
        position: "absolute",
        left: props.x + "%",
        top: props.y + "%",
        width: (POOF_FX_SIZE_VW * 1.4) + "vw",
        height: (POOF_FX_SIZE_VW * 1.4) + "vw",
        transform: "translate(-50%, -50%) scale(" + ringScale + ")",
        borderRadius: "50%",
        border: "2px solid rgba(200, 150, 255, 0.5)",
        background: "transparent",
        boxShadow: "inset 0 0 20px 8px rgba(180, 120, 255, 0.15), 0 0 30px 10px rgba(160, 80, 240, 0.1)",
        opacity: ringOpacity,
        transition: isFlash
            ? "transform 100ms ease-out"
            : "transform " + POOF_FX_DURATION_MS + "ms ease-out, opacity " + POOF_FX_DURATION_MS + "ms ease-out",
        pointerEvents: "none",
        zIndex: 2,
    };

    return (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
            <div style={coreStyle} />
            <div style={ringStyle} />
            <div style={{ position: "absolute", left: props.x + "%", top: props.y + "%", width: 0, height: 0, pointerEvents: "none", zIndex: 4 }}>
                {sparkElements}
            </div>
        </div>
    );
}

// ============================================================
// Speech Bubble — pixel-art cartoon style
// TEMPORARY: Moves to pawn-managed overlay at M-7
// ============================================================
var BUBBLE_ANIM_IN_MS = 200;
var BUBBLE_ANIM_OUT_MS = 150;

function SpeechBubble(props) {
    var [show, setShow] = useState(false);
    var [displaying, setDisplaying] = useState(false);

    useEffect(function() {
        if (props.visible) {
            setDisplaying(true);
            var t = setTimeout(function() { setShow(true); }, 30);
            return function() { clearTimeout(t); };
        } else {
            setShow(false);
            var t2 = setTimeout(function() { setDisplaying(false); }, BUBBLE_ANIM_OUT_MS);
            return function() { clearTimeout(t2); };
        }
    }, [props.visible]);

    if (!displaying || !props.text) return null;

    // --- Estimate bubble height as % of viewport height ---
    var textLen = props.text ? props.text.length : 0;
    var estLines = Math.max(1, Math.ceil(textLen / BUBBLE_CHARS_PER_LINE));
    var estHeightVw = estLines * BUBBLE_LINE_H_VW + BUBBLE_PAD_VW;
    var estHeightPx = estHeightVw * window.innerWidth / 100;
    var estHeightPct = (estHeightPx / window.innerHeight) * 100;

    // --- Horizontal: laser dodge > edge shift > centered ---
    var xShift = 0;
    var lt = props.laserTarget;

    if (lt) {
        if (lt.x > props.x) {
            xShift = -BUBBLE_LASER_DODGE;
        } else {
            xShift = BUBBLE_LASER_DODGE;
        }
    } else {
        if (props.x < BUBBLE_EDGE_THRESHOLD) {
            xShift = BUBBLE_EDGE_SHIFT;
        } else if (props.x > (100 - BUBBLE_EDGE_THRESHOLD)) {
            xShift = -BUBBLE_EDGE_SHIFT;
        }
    }

    // Clamp horizontal so bubble stays in viewport
    var halfBubbleVw = BUBBLE_MAX_W_VW / 2;
    var bubbleCenterPx = (props.x / 100) * window.innerWidth + (xShift / 100) * window.innerWidth;
    var minPx = halfBubbleVw * window.innerWidth / 100;
    var maxPx = window.innerWidth - minPx;
    if (bubbleCenterPx < minPx) {
        xShift += ((minPx - bubbleCenterPx) / window.innerWidth) * 100;
    } else if (bubbleCenterPx > maxPx) {
        xShift -= ((bubbleCenterPx - maxPx) / window.innerWidth) * 100;
    }

    // --- Vertical: above fairy head, slide down if clipped ---
    var fairyScale = props.scale || 1;
    var halfSpriteVw = (SPRITE_CFG.sizePct / 2) * fairyScale;
    var gapPx = (halfSpriteVw + BUBBLE_GAP_VW) * window.innerWidth / 100;
    var gapPct = (gapPx / window.innerHeight) * 100;

    // Ideal: bubble bottom at fairy Y - half sprite - gap
    // (transform -100% makes `top` = bubble bottom position)
    var idealBottom = props.y - gapPct;

    // Clamp: bubble top edge (bottom - height) must not go above safe margin
    var minBottom = BUBBLE_SAFE_MARGIN + estHeightPct;
    var finalBottomPct = Math.max(minBottom, idealBottom);

    var tailLeft = "calc(50% - " + xShift + "vw)";

    return (
        <div style={{
            position: "absolute",
            left: "calc(" + props.x + "% + " + xShift + "vw)",
            top: finalBottomPct + "%",
            transform: "translate(-50%, -100%) scale(" + (show ? 1 : 0) + ")",
            transformOrigin: "bottom center",
            transition: show
                ? "transform " + BUBBLE_ANIM_IN_MS + "ms cubic-bezier(0.34, 1.56, 0.64, 1), left 200ms ease-out, top 200ms ease-out"
                : "transform " + BUBBLE_ANIM_OUT_MS + "ms ease-in",
            pointerEvents: "none",
            zIndex: 5,
        }}>
            <div style={{
                background: "#1a1220",
                border: "3px solid #c89aff",
                borderRadius: 8,
                padding: "6px 12px",
                maxWidth: BUBBLE_MAX_W_VW + "vw",
                boxShadow: "0 0 12px 2px rgba(160, 80, 240, 0.25), inset 0 0 8px rgba(180, 120, 255, 0.1)",
                position: "relative",
            }}>
                <div style={{
                    fontFamily: "monospace",
                    fontSize: "clamp(10px, 1.8vw, 14px)",
                    color: "#e8d5ff",
                    lineHeight: 1.3,
                    textAlign: "center",
                    letterSpacing: 0.5,
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    overflowWrap: "break-word",
                    imageRendering: "pixelated",
                }}>
                    {props.text}
                </div>
            </div>
            {/* Tail arrow — always bottom, points toward fairy */}
            <div style={{
                position: "absolute",
                left: tailLeft,
                bottom: -9,
                transform: "translateX(-50%)",
                width: 0, height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "10px solid #c89aff",
            }} />
            <div style={{
                position: "absolute",
                left: tailLeft,
                bottom: -5,
                transform: "translateX(-50%)",
                width: 0, height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "8px solid #1a1220",
            }} />
        </div>
    );
}

// ============================================================
// Choice Bubble — speech bubble with tappable options (M-15a)
// Same visual style as SpeechBubble, adds clickable buttons.
// AnimInstance only knows: "show options, report which got tapped."
// ============================================================

function ChoiceBubble(props) {
    var [show, setShow] = useState(false);
    var [displaying, setDisplaying] = useState(false);

    useEffect(function() {
        if (props.visible) {
            setDisplaying(true);
            var t = setTimeout(function() { setShow(true); }, 30);
            return function() { clearTimeout(t); };
        } else {
            setShow(false);
            var t2 = setTimeout(function() { setDisplaying(false); }, BUBBLE_ANIM_OUT_MS);
            return function() { clearTimeout(t2); };
        }
    }, [props.visible]);

    if (!displaying || !props.data) return null;

    // --- Horizontal dodge (same logic as SpeechBubble) ---
    var xShift = 0;
    var lt = props.laserTarget;
    if (lt) {
        xShift = (lt.x > props.x) ? -BUBBLE_LASER_DODGE : BUBBLE_LASER_DODGE;
    } else {
        if (props.x < BUBBLE_EDGE_THRESHOLD) {
            xShift = BUBBLE_EDGE_SHIFT;
        } else if (props.x > (100 - BUBBLE_EDGE_THRESHOLD)) {
            xShift = -BUBBLE_EDGE_SHIFT;
        }
    }

    // --- Vertical: above fairy, slide down if clipped ---
    // Choice bubble is taller — rough estimate: text + buttons + padding
    var textLen = props.data.text ? props.data.text.length : 0;
    var estLines = Math.max(1, Math.ceil(textLen / BUBBLE_CHARS_PER_LINE));
    var estHeightVw = estLines * BUBBLE_LINE_H_VW + BUBBLE_PAD_VW + 4; // extra for buttons
    var estHeightPx = estHeightVw * window.innerWidth / 100;
    var estHeightPct = (estHeightPx / window.innerHeight) * 100;

    var fairyScale = props.scale || 1;
    var halfSpriteVw = (SPRITE_CFG.sizePct / 2) * fairyScale;
    var gapPx = (halfSpriteVw + BUBBLE_GAP_VW) * window.innerWidth / 100;
    var gapPct = (gapPx / window.innerHeight) * 100;
    var idealBottom = props.y - gapPct;
    var minBottom = BUBBLE_SAFE_MARGIN + estHeightPct;
    var finalBottomPct = Math.max(minBottom, idealBottom);

    function handleOptionTap(answer) {
        if (props.onChoiceSelect) {
            props.onChoiceSelect(answer);
        }
    }

    return (
        <div style={{
            position: "absolute",
            left: "calc(" + props.x + "% + " + xShift + "vw)",
            top: finalBottomPct + "%",
            transform: "translate(-50%, -100%) scale(" + (show ? 1 : 0) + ")",
            transformOrigin: "bottom center",
            transition: show
                ? "transform " + BUBBLE_ANIM_IN_MS + "ms cubic-bezier(0.34, 1.56, 0.64, 1), left 200ms ease-out, top 200ms ease-out"
                : "transform " + BUBBLE_ANIM_OUT_MS + "ms ease-in",
            pointerEvents: "auto",
            zIndex: 5,
        }}>
            <div style={{
                background: "#1a1220",
                border: "3px solid #c89aff",
                borderRadius: 8,
                padding: "6px 12px 10px 12px",
                maxWidth: "48vw",
                boxShadow: "0 0 12px 2px rgba(160, 80, 240, 0.25), inset 0 0 8px rgba(180, 120, 255, 0.1)",
                position: "relative",
            }}>
                <div style={{
                    fontFamily: "monospace",
                    fontSize: "clamp(10px, 1.8vw, 14px)",
                    color: "#e8d5ff",
                    lineHeight: 1.3,
                    textAlign: "center",
                    letterSpacing: 0.5,
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    imageRendering: "pixelated",
                    marginBottom: 8,
                }}>
                    {props.data.text}
                </div>
                <div style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "center",
                }}>
                    {props.data.options.map(function(opt, i) {
                        return (
                            <div
                                key={i}
                                onClick={function() { handleOptionTap(opt); }}
                                style={{
                                    fontFamily: "monospace",
                                    fontSize: "clamp(9px, 1.6vw, 13px)",
                                    color: "#1a1220",
                                    background: "#c89aff",
                                    border: "2px solid #a070d0",
                                    borderRadius: 5,
                                    padding: "4px 12px",
                                    cursor: "pointer",
                                    letterSpacing: 0.5,
                                    textShadow: "none",
                                    userSelect: "none",
                                    transition: "background 120ms ease, transform 80ms ease",
                                }}
                                onMouseEnter={function(e) { e.currentTarget.style.background = "#dab8ff"; }}
                                onMouseLeave={function(e) { e.currentTarget.style.background = "#c89aff"; }}
                                onMouseDown={function(e) { e.currentTarget.style.transform = "scale(0.95)"; }}
                                onMouseUp={function(e) { e.currentTarget.style.transform = "scale(1)"; }}
                            >
                                {opt}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div style={{
                position: "absolute",
                left: "50%",
                bottom: -9,
                transform: "translateX(-50%)",
                width: 0, height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "10px solid #c89aff",
            }} />
            <div style={{
                position: "absolute",
                left: "50%",
                bottom: -5,
                transform: "translateX(-50%)",
                width: 0, height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "8px solid #1a1220",
            }} />
        </div>
    );
}

// ============================================================
// Pop Sound — TEMPORARY: wire through main audio system at M-7
// ============================================================
function playPop() {
    try {
        var audio = new Audio(FAIRY_POP_SRC);
        audio.volume = FAIRY_POP_VOL;
        var range = FAIRY_POP_RATE_MAX - FAIRY_POP_RATE_MIN;
        audio.playbackRate = FAIRY_POP_RATE_MIN + Math.random() * range;
        var promise = audio.play();
        if (promise && promise.catch) {
            promise.catch(function(e) {
                console.warn("[FairyAnimInstance] pop audio blocked:", e.message);
            });
        }
    } catch (e) {
        console.warn("[FairyAnimInstance] pop audio error:", e.message);
    }
}

// Lighter pop for tap feedback — same sound, lower volume, higher pitch
function playTapPop() {
    try {
        var audio = new Audio(FAIRY_POP_SRC);
        audio.volume = 0.20;
        audio.playbackRate = 1.3 + Math.random() * 0.4;
        var promise = audio.play();
        if (promise && promise.catch) {
            promise.catch(function() {});
        }
    } catch (e) {}
}

// ============================================================
// Helpers
// ============================================================
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function readTimeMs(text) {
    if (!text) return MIN_READ_MS;
    return Math.max(MIN_READ_MS, text.length * MS_PER_CHAR + 1000);
}

// Default dodge spot picker — fallback when pawn doesn't provide one
function defaultDodgeSpot(currentX, currentY) {
    var best = DEFAULT_DODGE_SPOTS[0];
    var bestDist = 0;
    for (var i = 0; i < 3; i++) {
        var spot = pickRandom(DEFAULT_DODGE_SPOTS);
        var dx = spot.x - currentX;
        var dy = spot.y - currentY;
        var dist = dx * dx + dy * dy;
        if (dist > bestDist) {
            bestDist = dist;
            best = spot;
        }
    }
    return best;
}

// ============================================================
// Component
// ============================================================
var FairyAnimInstance = forwardRef(function FairyAnimInstanceInner(props, ref) {
    var frameRef = useRef(0);
    var [frame, setFrame] = useState(0);
    var [pos, setPos] = useState(null);
    var [poofAt, setPoofAt] = useState(null);
    var [speechText, setSpeechText] = useState(null);
    var [choiceData, setChoiceData] = useState(null);  // { text, options } for choice bubble
    var [tappable, setTappable] = useState(false);
    var [laserTarget, setLaserTargetState] = useState(null); // {x, y} viewport % — bubble dodges away

    // Timeout tracking
    var timeoutsRef = useRef([]);        // all timeouts (unmount cleanup)
    var exitTimeoutsRef = useRef([]);    // cancellable exit group

    var mountedRef = useRef(true);

    // Tap interaction state (refs to avoid re-render churn)
    var irritationRef = useRef(0);       // 0-4 tier
    var lastTapRef = useRef(0);          // timestamp for cooldown
    var ignoreTapsRef = useRef(false);   // true at max irritation

    // --- Safe timeout that auto-cleans on unmount ---
    var schedule = useCallback(function(fn, ms) {
        var id = setTimeout(function() {
            if (mountedRef.current) fn();
        }, ms);
        timeoutsRef.current.push(id);
        return id;
    }, []);

    // --- Exit-specific scheduling (cancellable on tap) ---
    function scheduleExit(fn, ms) {
        var id = schedule(fn, ms);
        exitTimeoutsRef.current.push(id);
        return id;
    }

    function clearExitTimeouts() {
        exitTimeoutsRef.current.forEach(function(id) { clearTimeout(id); });
        exitTimeoutsRef.current = [];
    }

    // --- Spritesheet tick (always runs) ---
    useEffect(function() {
        var ms = Math.round(1000 / (SPRITE_CFG.fps || 8));
        var id = setInterval(function() {
            frameRef.current = (frameRef.current + 1) % SPRITE_CFG.frames;
            setFrame(frameRef.current);
        }, ms);
        return function() { clearInterval(id); };
    }, []);

    // --- Unmount cleanup ---
    useEffect(function() {
        mountedRef.current = true;
        return function() {
            mountedRef.current = false;
            timeoutsRef.current.forEach(function(id) { clearTimeout(id); });
            timeoutsRef.current = [];
            exitTimeoutsRef.current = [];
        };
    }, []);

    // ============================================================
    // EXIT SEQUENCE — reusable, called from dodge + tap handler
    // ============================================================
    function beginExit(x, y, scale, onDone) {
        setTappable(false);

        scheduleExit(function() {
            setSpeechText(null);
        }, 0);

        scheduleExit(function() {
            setPoofAt({ x: x, y: y });
            playPop();
        }, 200);

        scheduleExit(function() {
            setPos(function(prev) {
                return prev ? { x: x, y: y, scale: POOF_SCALE_START, rot: 0, transition: POOF_SNAP_OUT_MS, transformOrigin: prev.transformOrigin } : null;
            });
        }, 200 + POOF_FX_LEAD_MS);

        scheduleExit(function() {
            setPoofAt(null);
            setPos(null);
            setSpeechText(null);
            setTappable(false);
            if (onDone) onDone();
        }, 200 + POOF_FX_LEAD_MS + POOF_SNAP_OUT_MS + 150);
    }

    // ============================================================
    // DODGE — vanish + reappear at new position with scale variance
    // ============================================================
    function doDodge(currentX, currentY, tier, onDone) {
        var getDodge = props.getDodgeSpot || defaultDodgeSpot;
        var spot = getDodge(currentX, currentY);
        var isTiny = tier >= 3 && Math.random() < 0.4;
        var newScale = isTiny
            ? pickRandom(DODGE_SCALES_TINY)
            : pickRandom(DODGE_SCALES_NORMAL);

        setTappable(false);
        setSpeechText(null);

        // Vanish from current spot
        setPoofAt({ x: currentX, y: currentY });
        playPop();
        setPos(null);

        // Reappear at new spot after pause
        schedule(function() {
            setPoofAt({ x: spot.x, y: spot.y });
            playPop();

            schedule(function() {
                setPos({ x: spot.x, y: spot.y, scale: POOF_SCALE_START * newScale, rot: 0, transition: 0, transformOrigin: "50% 50%" });
                schedule(function() {
                    setPos({ x: spot.x, y: spot.y, scale: newScale, rot: 0, transition: POOF_SNAP_IN_MS, transformOrigin: "50% 50%" });
                }, 50);
            }, POOF_FX_LEAD_MS);

            // Clear FX, show taunt, re-enable taps
            schedule(function() {
                setPoofAt(null);
                setTappable(true);

                if (props.onTapDodge) props.onTapDodge(spot.x, spot.y, tier);

                var line = isTiny
                    ? pickRandom(IRRITATION_LINES[3])
                    : pickRandom(IRRITATION_LINES[tier]);
                setSpeechText(line);

                var readMs = readTimeMs(line);

                // Hide text after reading, then schedule exit
                scheduleExit(function() {
                    setSpeechText(null);
                }, readMs);

                scheduleExit(function() {
                    beginExit(spot.x, spot.y, newScale, onDone);
                }, readMs + TAP_HOLD_MS);

            }, POOF_FX_LEAD_MS + POOF_SNAP_IN_MS + 200);

        }, DODGE_PAUSE_MS);
    }

    // ============================================================
    // TAP HANDLER
    // ============================================================
    function handleFairyTap() {
        var now = Date.now();
        if (now - lastTapRef.current < TAP_COOLDOWN_MS) return;
        if (ignoreTapsRef.current) return;
        if (!tappable) return;

        lastTapRef.current = now;
        playTapPop();

        var tier = irritationRef.current;
        var currentPos = pos;
        if (!currentPos) return;

        var cx = currentPos.x;
        var cy = currentPos.y;
        var currentScale = currentPos.scale || POOF_SCALE_END;

        // Cancel any pending exit
        clearExitTimeouts();
        setSpeechText(null);

        // --- Tier 4: Nuclear — final words, ignore taps, leave ---
        if (tier >= 4) {
            ignoreTapsRef.current = true;
            setTappable(false);
            var nuclearLine = pickRandom(IRRITATION_LINES[4]);
            setSpeechText(nuclearLine);
            var nuclearReadMs = readTimeMs(nuclearLine);

            scheduleExit(function() {
                beginExit(cx, cy, currentScale, function() {
                    irritationRef.current = 0;
                    ignoreTapsRef.current = false;
                    if (props.onTapExit) props.onTapExit();
                });
            }, nuclearReadMs);
            return;
        }

        // --- Tier 2-3: Dodge to new position ---
        if (tier >= 2) {
            irritationRef.current = Math.min(tier + 1, 4);
            doDodge(cx, cy, tier, null);
            return;
        }

        // --- Tier 0-1: Stay in place, show reaction ---
        var reactionLine = pickRandom(IRRITATION_LINES[tier]);
        setSpeechText(reactionLine);
        var reactionReadMs = readTimeMs(reactionLine);

        irritationRef.current = Math.min(tier + 1, 4);

        scheduleExit(function() {
            setSpeechText(null);
        }, reactionReadMs);

        scheduleExit(function() {
            beginExit(cx, cy, currentScale, null);
        }, reactionReadMs + TAP_HOLD_MS);
    }

    // ============================================================
    // COMMAND API — pawn drives everything through this ref
    // ============================================================
    useImperativeHandle(ref, function() {
        return {
            setPos: function(posObj) {
                if (!mountedRef.current) return;
                setPos(posObj);
            },
            hide: function() {
                if (!mountedRef.current) return;
                setPos(null);
                setSpeechText(null);
                setChoiceData(null);
                setTappable(false);
                setLaserTargetState(null);
            },
            poofFX: function(x, y) {
                if (!mountedRef.current) return;
                setPoofAt({ x: x, y: y });
                schedule(function() { setPoofAt(null); }, POOF_FX_DURATION_MS);
            },
            showSpeech: function(text) {
                if (!mountedRef.current) return;
                setSpeechText(text);
            },
            hideSpeech: function() {
                if (!mountedRef.current) return;
                setSpeechText(null);
            },
            setTappable: function(val) {
                if (!mountedRef.current) return;
                setTappable(val);
            },
            setAnim: function(name) {
                // Future: switch spritesheet based on anim name
                // For now only "idle" exists
            },
            resetIrritation: function() {
                irritationRef.current = 0;
                ignoreTapsRef.current = false;
            },
            getState: function() {
                return {
                    pos: pos,
                    tappable: tappable,
                    irritation: irritationRef.current,
                };
            },
            playPop: playPop,
            playTapPop: playTapPop,
            clearExitTimeouts: clearExitTimeouts,
            beginExit: beginExit,
            showChoice: function(text, options) {
                if (!mountedRef.current) return;
                setSpeechText(null);  // clear normal speech
                setChoiceData({ text: text, options: options || [] });
            },
            hideChoice: function() {
                if (!mountedRef.current) return;
                setChoiceData(null);
            },
            setLaserTarget: function(xPct, yPct) {
                if (!mountedRef.current) return;
                setLaserTargetState({ x: xPct, y: yPct });
            },
            clearLaserTarget: function() {
                if (!mountedRef.current) return;
                setLaserTargetState(null);
            },
        };
    });

    // --- Sprite sizing ---
    var spriteW = SPRITE_CFG.sizePct + "vw";

    // --- Don't render when nothing is active ---
    var showFairy = pos !== null;
    var showFX = poofAt !== null;
    if (!showFairy && !showFX) return null;

    var transMs = showFairy ? (pos.transition || 0) : 0;
    var tOrigin = (showFairy && pos.transformOrigin) ? pos.transformOrigin : "50% 50%";

    return createPortal(
        <div style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: THEME.z.fairy,
            overflow: "hidden",
        }}>
            {showFX && <PoofFX x={poofAt.x} y={poofAt.y} />}

            {showFairy && (
                <div
                    onClick={tappable ? handleFairyTap : undefined}
                    style={{
                        position: "absolute",
                        left: pos.x + "%",
                        top: pos.y + "%",
                        transform: "translate(-50%, -50%) scale(" + pos.scale + ") rotate(" + (pos.rot || 0) + "deg)",
                        transformOrigin: tOrigin,
                        transition: transMs > 0
                            ? "left " + transMs + "ms ease-in-out, top " + transMs + "ms ease-in-out, transform " + transMs + "ms ease-in-out"
                            : "none",
                        pointerEvents: tappable ? "auto" : "none",
                        cursor: tappable ? "pointer" : "default",
                        zIndex: 1,
                    }}>
                    <div style={{
                        width: spriteW,
                        aspectRatio: SPRITE_CFG.frameW + "/" + SPRITE_CFG.frameH,
                        backgroundImage: "url(" + SPRITE_CFG.sheet + ")",
                        backgroundPosition: (frame * (100 / (SPRITE_CFG.frames - 1))) + "% 0",
                        backgroundSize: (SPRITE_CFG.frames * 100) + "% 100%",
                        backgroundRepeat: "no-repeat",
                        imageRendering: "pixelated",
                    }} />
                </div>
            )}

            {showFairy && pos && (
                <SpeechBubble x={pos.x} y={pos.y} text={speechText} visible={speechText !== null} scale={pos.scale} laserTarget={laserTarget} />
            )}

            {showFairy && pos && (
                <ChoiceBubble
                    x={pos.x} y={pos.y}
                    data={choiceData}
                    visible={choiceData !== null}
                    scale={pos.scale}
                    laserTarget={laserTarget}
                    onChoiceSelect={function(answer) {
                        setChoiceData(null);
                        if (props.onChoiceSelect) props.onChoiceSelect(answer);
                    }}
                />
            )}
        </div>,
        document.body
    );
});

export default FairyAnimInstance;