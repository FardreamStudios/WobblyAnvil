// ============================================================
// FairyAnim.js — Reusable Fairy Animation Component
//
// POSITIONING: Everything lives inside a full-screen container
// div (position:fixed, inset:0). All x/y values are PERCENTAGES
// of that container. 50/50 = dead center on every screen size.
//
// Outer div = position/scale/rotation (timeline target)
// Inner div = spritesheet window (never touched by animations)
// PoofFX = absolute inside container, not affected by fairy scale
// Shuffle-deck loop: plays all 6 actions, reshuffles, repeats.
//
// TAP INTERACTION: During center poofs, fairy is tappable.
// Taps escalate irritation (5 tiers), trigger dodges at higher
// tiers, and culminate in a nuclear exit at max. Spam-guarded.
// ============================================================

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";

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
// Edge Peek Params — all values in container %
// ============================================================
var PEEK_SCALE = 4;
var PEEK_SLIDE_IN_MS = 1200;
var PEEK_HOLD_MS = 2500;
var PEEK_SLIDE_OUT_MS = 1000;

var PEEK_INSET_TB = 7;
var PEEK_INSET_LR = 16;
var PEEK_MARGIN = 30;

// Peek position variance — randomizes along the edge
var PEEK_VARIANCE_TB = 15;   // top/bottom: horizontal offset range (+/- %)
var PEEK_VARIANCE_LR = 12;   // left/right: vertical offset range (+/- %)

var PEEK_SPRITE_PCT = SPRITE_CFG.sizePct * PEEK_SCALE;
var PEEK_HALF = PEEK_SPRITE_PCT / 2;

var EDGE_PEEKS = [
    {
        name: "bottom", type: "peek", rot: 0,
        offX: 50, offY: 100 + PEEK_HALF + PEEK_MARGIN,
        peekX: 50, peekY: 100 + PEEK_HALF - PEEK_INSET_TB,
    },
    {
        name: "top", type: "peek", rot: 180,
        offX: 50, offY: 0 - PEEK_HALF - PEEK_MARGIN,
        peekX: 50, peekY: 0 - PEEK_HALF + PEEK_INSET_TB,
    },
    {
        name: "left", type: "peek", rot: 90,
        offX: 0 - PEEK_HALF - PEEK_MARGIN, offY: 50,
        peekX: 0 - PEEK_HALF + PEEK_INSET_LR, peekY: 50,
    },
    {
        name: "right", type: "peek", rot: -90,
        offX: 100 + PEEK_HALF + PEEK_MARGIN, offY: 50,
        peekX: 100 + PEEK_HALF - PEEK_INSET_LR, peekY: 50,
    },
];

// ============================================================
// Center Poof Params — all values in container %
// ============================================================
var POOF_SCALE_START = 0.1;
var POOF_SCALE_END = 1;
var POOF_SNAP_IN_MS = 250;
var POOF_HOLD_MS_MIN = 4000;
var POOF_HOLD_MS_MAX = 6000;
var POOF_SNAP_OUT_MS = 200;
var POOF_FX_LEAD_MS = 100;

var CENTER_POOFS = [
    { name: "poofLeft",  type: "poof", x: 25, y: 50 },
    { name: "poofRight", type: "poof", x: 75, y: 50 },
];

// Loop timing
var INITIAL_DELAY_MIN = 1000;
var INITIAL_DELAY_MAX = 4000;
var BETWEEN_DELAY_MIN = 1500;
var BETWEEN_DELAY_MAX = 4000;

// ============================================================
// Speech Bubble Config
// ============================================================
var BUBBLE_SHOW_DELAY = 600;
var BUBBLE_HIDE_BEFORE = 800;
var BUBBLE_OFFSET_Y = -8;

// ============================================================
// Tap Interaction Config
// ============================================================
var TAP_COOLDOWN_MS = 1200;      // min ms between accepted taps
var TAP_HOLD_MS = 5000;          // how long she stays after a tap
var DODGE_PAUSE_MS = 300;        // gap between vanish and reappear
var MIN_READ_MS = 2500;          // minimum time speech stays up
var MS_PER_CHAR = 80;            // extra read time per character

// Dodge positions — avoid center, spread around screen
var DODGE_SPOTS = [
    { x: 20, y: 25 }, { x: 80, y: 25 },
    { x: 15, y: 70 }, { x: 85, y: 70 },
    { x: 25, y: 80 }, { x: 75, y: 20 },
    { x: 15, y: 40 }, { x: 85, y: 60 },
];

// Scale options for dodge — tier 3+ can go tiny
var DODGE_SCALES_NORMAL = [0.8, 1.0, 1.0, 0.9];
var DODGE_SCALES_TINY = [0.35, 0.4, 0.45];

// ============================================================
// Fairy Quips — ambient poof commentary
// ============================================================
var FAIRY_QUIPS = [
    "you call that a sword?",
    "i've seen better steel in a spoon",
    "the anvil deserves an apology",
    "...is it supposed to bend like that",
    "i'm not mad. just disappointed.",
    "that customer is lying to you btw",
    "do you even know what quenching means",
    "i used to work with real blacksmiths",
    "this is fine. everything is fine.",
    "the forge god weeps",
    "hey. hey. look at me. do better.",
    "i could fix that but i choose not to",
    "you're being watched. by me. right now.",
    "plot twist: the anvil was the hero all along",
    "are you speedrunning failure",
    "bold strategy. let's see if it pays off.",
    "i'm going to pretend i didn't see that",
    "your grandma could hammer better. mine could too.",
    "wait... do you actually not have a plan",
    "i can never turn left because im always right",
    "when chuck norris gets grounded his parents arent allowed to leave his room",
    "when chuck norris cooks, he makes the onion cry",
    "chuck norris counted to infinity twice",
    "florpna gleek shunta mivvel ek",
    "weh briska tohn fleemu gratzig nok",
    "skibba rontu fehh plunka dvessa rii",
    "gahtu mep skweela bornf tchikka luu",
];

// ============================================================
// Peek Quips — only for bottom peek (she's poking her head up)
// ============================================================
var PEEK_QUIPS = [
    "psst. down here.",
    "you didn't see me.",
    "just checking if you're still bad at this",
    "boo.",
    "i live here now",
    "don't mind me just vibing",
    "the view from down here is... concerning",
    "shhh i'm hiding from the customers",
];

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
// Fairy Dust Poof FX — 3-layer: core flash + spark ring + dust motes
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

    // Scale-compensated offset — bubble stays near her head at any size
    var fairyScale = props.scale || 1;
    var offsetY = BUBBLE_OFFSET_Y * fairyScale;

    return (
        <div style={{
            position: "absolute",
            left: props.x + "%",
            top: "calc(" + props.y + "% + " + offsetY + "vw)",
            transform: "translate(-50%, -100%) scale(" + (show ? 1 : 0) + ")",
            transformOrigin: "bottom center",
            transition: show
                ? "transform " + BUBBLE_ANIM_IN_MS + "ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                : "transform " + BUBBLE_ANIM_OUT_MS + "ms ease-in",
            pointerEvents: "none",
            zIndex: 5,
        }}>
            <div style={{
                background: "#1a1220",
                border: "3px solid #c89aff",
                borderRadius: 8,
                padding: "6px 12px",
                maxWidth: "42vw",
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
                    whiteSpace: "nowrap",
                    imageRendering: "pixelated",
                }}>
                    {props.text}
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
// Pop Sound
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
                console.warn("[FairyAnim] pop audio blocked:", e.message);
            });
        }
    } catch (e) {
        console.warn("[FairyAnim] pop audio error:", e.message);
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
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
    return min + Math.random() * (max - min);
}

function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function readTimeMs(text) {
    if (!text) return MIN_READ_MS;
    return Math.max(MIN_READ_MS, text.length * MS_PER_CHAR + 1000);
}

// Pick a dodge spot far from current position
function pickDodgeSpot(currentX, currentY) {
    var best = DODGE_SPOTS[0];
    var bestDist = 0;
    for (var i = 0; i < 3; i++) {
        var spot = pickRandom(DODGE_SPOTS);
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
var FairyAnim = forwardRef(function FairyAnimInner(props, ref) {
    var frameRef = useRef(0);
    var [frame, setFrame] = useState(0);
    var [pos, setPos] = useState(null);
    var [poofAt, setPoofAt] = useState(null);
    var [speechText, setSpeechText] = useState(null);
    var [tappable, setTappable] = useState(false);

    // Deck refs (action + quip shufflers)
    var deckRef = useRef([]);
    var deckIndexRef = useRef(0);
    var quipDeckRef = useRef([]);
    var quipIndexRef = useRef(0);

    // Timeout tracking
    var timeoutsRef = useRef([]);        // all timeouts (unmount cleanup)
    var exitTimeoutsRef = useRef([]);    // cancellable exit group

    var mountedRef = useRef(true);

    // Tap interaction state (refs to avoid re-render churn)
    var irritationRef = useRef(0);       // 0-4 tier
    var lastTapRef = useRef(0);          // timestamp for cooldown
    var ignoreTapsRef = useRef(false);   // true at max irritation
    var onDoneRef = useRef(null);        // stored callback for rescheduling

    // --- FairyHelper command queue (triggered lines override ambient quips) ---
    var commandQueueRef = useRef([]);

    // --- Expose speak() to parent via ref ---
    useImperativeHandle(ref, function() {
        return {
            speak: function(line) {
                if (!mountedRef.current) return;
                commandQueueRef.current.push(line);
            }
        };
    });

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

    // --- Shuffled deck pickers ---
    function nextAction() {
        if (deckRef.current.length === 0 || deckIndexRef.current >= deckRef.current.length) {
            deckRef.current = shuffle(EDGE_PEEKS.concat(CENTER_POOFS));
            deckIndexRef.current = 0;
        }
        var action = deckRef.current[deckIndexRef.current];
        deckIndexRef.current++;
        return action;
    }

    function nextQuip() {
        if (quipDeckRef.current.length === 0 || quipIndexRef.current >= quipDeckRef.current.length) {
            quipDeckRef.current = shuffle(FAIRY_QUIPS);
            quipIndexRef.current = 0;
        }
        var quip = quipDeckRef.current[quipIndexRef.current];
        quipIndexRef.current++;
        return quip;
    }

    // ============================================================
    // EXIT SEQUENCE — reusable, called from poof + tap handler
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
            setPos({ x: x, y: y, scale: POOF_SCALE_START, rot: 0, transition: POOF_SNAP_OUT_MS });
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
        var spot = pickDodgeSpot(currentX, currentY);
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
                setPos({ x: spot.x, y: spot.y, scale: POOF_SCALE_START * newScale, rot: 0, transition: 0 });
                schedule(function() {
                    setPos({ x: spot.x, y: spot.y, scale: newScale, rot: 0, transition: POOF_SNAP_IN_MS });
                }, 50);
            }, POOF_FX_LEAD_MS);

            // Clear FX, show taunt, re-enable taps
            schedule(function() {
                setPoofAt(null);
                setTappable(true);

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
        var onDone = onDoneRef.current;

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
                    if (onDone) onDone();
                });
            }, nuclearReadMs);
            return;
        }

        // --- Tier 2-3: Dodge to new position ---
        if (tier >= 2) {
            irritationRef.current = Math.min(tier + 1, 4);
            doDodge(cx, cy, tier, onDone);
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
            beginExit(cx, cy, currentScale, onDone);
        }, reactionReadMs + TAP_HOLD_MS);
    }

    // ============================================================
    // RUN PEEK — with position variance
    // ============================================================
    function runPeek(edge, onDone) {
        var varPeekX = edge.peekX;
        var varPeekY = edge.peekY;
        var varOffX = edge.offX;
        var varOffY = edge.offY;

        if (edge.name === "top" || edge.name === "bottom") {
            var offsetH = randFloat(-PEEK_VARIANCE_TB, PEEK_VARIANCE_TB);
            varPeekX = edge.peekX + offsetH;
            varOffX = edge.offX + offsetH;
        } else {
            var offsetV = randFloat(-PEEK_VARIANCE_LR, PEEK_VARIANCE_LR);
            varPeekY = edge.peekY + offsetV;
            varOffY = edge.offY + offsetV;
        }

        // Bottom peek can show a quip — extend hold to ensure read time
        var isBottom = edge.name === "bottom";
        var peekQuip = isBottom ? pickRandom(PEEK_QUIPS) : null;
        var holdMs = isBottom && peekQuip
            ? Math.max(PEEK_HOLD_MS, readTimeMs(peekQuip) + 600)
            : PEEK_HOLD_MS;

        setPos({ x: varOffX, y: varOffY, scale: PEEK_SCALE, rot: edge.rot, transition: 0 });

        schedule(function() {
            setPos({ x: varPeekX, y: varPeekY, scale: PEEK_SCALE, rot: edge.rot, transition: PEEK_SLIDE_IN_MS });
        }, 50);

        // Show quip after slide-in completes
        if (peekQuip) {
            schedule(function() {
                setSpeechText(peekQuip);
            }, 50 + PEEK_SLIDE_IN_MS + 300);

            // Hide quip before slide-out
            schedule(function() {
                setSpeechText(null);
            }, 50 + PEEK_SLIDE_IN_MS + holdMs - 500);
        }

        schedule(function() {
            setPos({ x: varOffX, y: varOffY, scale: PEEK_SCALE, rot: edge.rot, transition: PEEK_SLIDE_OUT_MS });
        }, 50 + PEEK_SLIDE_IN_MS + holdMs);

        schedule(function() {
            setSpeechText(null);
            setPos(null);
            if (onDone) onDone();
        }, 50 + PEEK_SLIDE_IN_MS + holdMs + PEEK_SLIDE_OUT_MS);
    }

    // ============================================================
    // RUN POOF — with interruptible exit
    // ============================================================
    function runPoof(spot, onDone) {
        var holdMs = randInt(POOF_HOLD_MS_MIN, POOF_HOLD_MS_MAX);
        var quip = commandQueueRef.current.length > 0
            ? commandQueueRef.current.shift()
            : nextQuip();

        // Store onDone so tap handler can reschedule
        onDoneRef.current = onDone;

        // T+0: FX fires, sound plays
        setPoofAt({ x: spot.x, y: spot.y });
        playPop();

        // T+LEAD: fairy starts scaling in
        schedule(function() {
            setPos({ x: spot.x, y: spot.y, scale: POOF_SCALE_START, rot: 0, transition: 0 });
            schedule(function() {
                setPos({ x: spot.x, y: spot.y, scale: POOF_SCALE_END, rot: 0, transition: POOF_SNAP_IN_MS });
            }, 50);
        }, POOF_FX_LEAD_MS);

        // Clear appear FX
        schedule(function() {
            setPoofAt(null);
        }, POOF_FX_LEAD_MS + POOF_SNAP_IN_MS + 150);

        // Show quip + enable taps after fully in
        var idleStart = POOF_FX_LEAD_MS + POOF_SNAP_IN_MS + BUBBLE_SHOW_DELAY;
        schedule(function() {
            setSpeechText(quip);
            setTappable(true);
        }, idleStart);

        // === EXIT GROUP (cancellable on tap) ===
        var exitStart = POOF_FX_LEAD_MS + POOF_SNAP_IN_MS + holdMs;

        scheduleExit(function() {
            setSpeechText(null);
        }, exitStart - BUBBLE_HIDE_BEFORE);

        scheduleExit(function() {
            beginExit(spot.x, spot.y, POOF_SCALE_END, onDone);
        }, exitStart);
    }

    // --- Run next action from deck ---
    function runNext() {
        // If FairyHelper queued a line, force a center poof to display it
        var hasCommand = commandQueueRef.current.length > 0;
        var action = hasCommand ? pickRandom(CENTER_POOFS) : nextAction();
        var onDone = function() {
            var delay = randInt(BETWEEN_DELAY_MIN, BETWEEN_DELAY_MAX);
            schedule(runNext, delay);
        };
        if (action.type === "peek") {
            runPeek(action, onDone);
        } else {
            runPoof(action, onDone);
        }
    }

    // --- Start loop on mount ---
    useEffect(function() {
        mountedRef.current = true;
        var delay = randInt(INITIAL_DELAY_MIN, INITIAL_DELAY_MAX);
        schedule(runNext, delay);

        return function() {
            mountedRef.current = false;
            timeoutsRef.current.forEach(function(id) { clearTimeout(id); });
            timeoutsRef.current = [];
            exitTimeoutsRef.current = [];
        };
    }, []);

    // --- Sprite sizing ---
    var spriteW = SPRITE_CFG.sizePct + "vw";

    // --- Don't render when nothing is active ---
    var showFairy = pos !== null;
    var showFX = poofAt !== null;
    if (!showFairy && !showFX) return null;

    var transMs = showFairy ? (pos.transition || 0) : 0;

    return createPortal(
        <div style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
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
                        transform: "translate(-50%, -50%) scale(" + pos.scale + ") rotate(" + pos.rot + "deg)",
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
                <SpeechBubble x={pos.x} y={pos.y} text={speechText} visible={speechText !== null} scale={pos.scale} />
            )}
        </div>,
        document.body
    );
});

export default FairyAnim;