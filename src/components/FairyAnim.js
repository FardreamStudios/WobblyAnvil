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
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

var PUB = process.env.PUBLIC_URL || "";
var FAIRY_POP_SRC = PUB + "/audio/sFairyPop.mp3";
var FAIRY_POP_VOL = 0.35;
var FAIRY_POP_RATE_MIN = 0.55;   // pitch range — biased low (deeper)
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
    sizePct:  12,         // base display width as % of container
};

// ============================================================
// Edge Peek Params — all values in container %
// ============================================================
var PEEK_SCALE = 4;
var PEEK_SLIDE_IN_MS = 1200;
var PEEK_HOLD_MS = 2500;
var PEEK_SLIDE_OUT_MS = 1000;

// How far she peeks in from the edge (%)
var PEEK_INSET_TB = 7;   // top/bottom peek depth (%)
var PEEK_INSET_LR = 16;  // left/right peek depth (%)
// How far past the edge for off-screen start (%)
var PEEK_MARGIN = 30;

// Sprite size at peek scale as % of container
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
// Fairy Dust Poof FX — 3-layer: core flash + spark ring + dust motes
// ============================================================
var POOF_FX_SIZE_VW = 18;        // base size in vw
var POOF_FX_DURATION_MS = 1400;

// Spark mote positions — 8 points around a circle, randomised per mount
function makeSparkOffsets() {
    var count = 8;
    var arr = [];
    for (var i = 0; i < count; i++) {
        var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        var dist = 3.5 + Math.random() * 3;   // vw from center
        arr.push({
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            size: 0.4 + Math.random() * 0.6,  // vw
            delay: Math.random() * 120,        // ms stagger
        });
    }
    return arr;
}

function PoofFX(props) {
    var [phase, setPhase] = useState("flash");
    var sparksRef = useRef(makeSparkOffsets());

    useEffect(function() {
        // flash → burst (core expands, sparks fly out)
        var t1 = setTimeout(function() { setPhase("burst"); }, 60);
        // burst → fade (everything dissolves)
        var t2 = setTimeout(function() { setPhase("fade"); }, 400);
        return function() { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    var isFlash = phase === "flash";
    var isFade = phase === "fade";
    var sparks = sparksRef.current;

    // --- Layer 1: Core flash — bright opaque blob that hides the sprite ---
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

    // --- Layer 2: Spark ring — small bright dots that fly outward ---
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

    // --- Layer 3: Soft outer glow ring that expands ---
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
// Pop Sound — with random pitch (biased lower/deeper)
// ============================================================
function playPop() {
    try {
        var audio = new Audio(FAIRY_POP_SRC);
        audio.volume = FAIRY_POP_VOL;
        // Random playbackRate biased toward lower pitch
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

// ============================================================
// Helpers
// ============================================================
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

// ============================================================
// Component
// ============================================================
function FairyAnim() {
    var frameRef = useRef(0);
    var [frame, setFrame] = useState(0);
    var [pos, setPos] = useState(null);
    var [poofAt, setPoofAt] = useState(null);
    var deckRef = useRef([]);
    var deckIndexRef = useRef(0);
    var timeoutsRef = useRef([]);
    var mountedRef = useRef(true);

    // --- Safe timeout that auto-cleans on unmount ---
    var schedule = useCallback(function(fn, ms) {
        var id = setTimeout(function() {
            if (mountedRef.current) fn();
        }, ms);
        timeoutsRef.current.push(id);
        return id;
    }, []);

    // --- Spritesheet tick (always runs) ---
    useEffect(function() {
        var ms = Math.round(1000 / (SPRITE_CFG.fps || 8));
        var id = setInterval(function() {
            frameRef.current = (frameRef.current + 1) % SPRITE_CFG.frames;
            setFrame(frameRef.current);
        }, ms);
        return function() { clearInterval(id); };
    }, []);

    // --- Get next action from shuffled deck ---
    function nextAction() {
        if (deckRef.current.length === 0 || deckIndexRef.current >= deckRef.current.length) {
            deckRef.current = shuffle(EDGE_PEEKS.concat(CENTER_POOFS));
            deckIndexRef.current = 0;
        }
        var action = deckRef.current[deckIndexRef.current];
        deckIndexRef.current++;
        return action;
    }

    // --- Run an edge peek action ---
    function runPeek(edge, onDone) {
        setPos({ x: edge.offX, y: edge.offY, scale: PEEK_SCALE, rot: edge.rot, transition: 0 });

        schedule(function() {
            setPos({ x: edge.peekX, y: edge.peekY, scale: PEEK_SCALE, rot: edge.rot, transition: PEEK_SLIDE_IN_MS });
        }, 50);

        schedule(function() {
            setPos({ x: edge.offX, y: edge.offY, scale: PEEK_SCALE, rot: edge.rot, transition: PEEK_SLIDE_OUT_MS });
        }, 50 + PEEK_SLIDE_IN_MS + PEEK_HOLD_MS);

        schedule(function() {
            setPos(null);
            if (onDone) onDone();
        }, 50 + PEEK_SLIDE_IN_MS + PEEK_HOLD_MS + PEEK_SLIDE_OUT_MS);
    }

    // --- Run a center poof action ---
    function runPoof(spot, onDone) {
        var holdMs = randInt(POOF_HOLD_MS_MIN, POOF_HOLD_MS_MAX);

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

        // Exit sequence
        var exitStart = POOF_FX_LEAD_MS + POOF_SNAP_IN_MS + holdMs;

        schedule(function() {
            setPoofAt({ x: spot.x, y: spot.y });
            playPop();
        }, exitStart);

        schedule(function() {
            setPos({ x: spot.x, y: spot.y, scale: POOF_SCALE_START, rot: 0, transition: POOF_SNAP_OUT_MS });
        }, exitStart + POOF_FX_LEAD_MS);

        schedule(function() {
            setPoofAt(null);
            setPos(null);
            if (onDone) onDone();
        }, exitStart + POOF_FX_LEAD_MS + POOF_SNAP_OUT_MS + 150);
    }

    // --- Run next action from deck ---
    function runNext() {
        var action = nextAction();
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
        };
    }, []);

    // --- Sprite sizing (% of container) ---
    var spriteW = SPRITE_CFG.sizePct + "vw";

    // --- Don't render when nothing is active ---
    var showFairy = pos !== null;
    var showFX = poofAt !== null;
    if (!showFairy && !showFX) return null;

    var transMs = showFairy ? (pos.transition || 0) : 0;

    // --- Full-screen container — all children positioned as % of this ---
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
                <div style={{
                    position: "absolute",
                    left: pos.x + "%",
                    top: pos.y + "%",
                    transform: "translate(-50%, -50%) scale(" + pos.scale + ") rotate(" + pos.rot + "deg)",
                    transition: transMs > 0
                        ? "left " + transMs + "ms ease-in-out, top " + transMs + "ms ease-in-out, transform " + transMs + "ms ease-in-out"
                        : "none",
                    pointerEvents: "none",
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
        </div>,
        document.body
    );
}

export default FairyAnim;