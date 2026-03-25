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
var PEEK_INSET = 4;
// How far past the edge for off-screen start (%)
var PEEK_MARGIN = 30;

// Sprite size at peek scale as % of container
var PEEK_SPRITE_PCT = SPRITE_CFG.sizePct * PEEK_SCALE;
var PEEK_HALF = PEEK_SPRITE_PCT / 2;

var EDGE_PEEKS = [
    {
        name: "bottom", type: "peek", rot: 0,
        offX: 50, offY: 100 + PEEK_HALF + PEEK_MARGIN,
        peekX: 50, peekY: 100 + PEEK_HALF - PEEK_INSET,
    },
    {
        name: "top", type: "peek", rot: 180,
        offX: 50, offY: 0 - PEEK_HALF - PEEK_MARGIN,
        peekX: 50, peekY: 0 - PEEK_HALF + PEEK_INSET,
    },
    {
        name: "left", type: "peek", rot: 90,
        offX: 0 - PEEK_HALF - PEEK_MARGIN, offY: 50,
        peekX: 0 - PEEK_HALF + PEEK_INSET, peekY: 50,
    },
    {
        name: "right", type: "peek", rot: -90,
        offX: 100 + PEEK_HALF + PEEK_MARGIN, offY: 50,
        peekX: 100 + PEEK_HALF - PEEK_INSET, peekY: 50,
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
// Purple Bubble Pop FX
// ============================================================
var POOF_FX_SIZE_PCT = 20;       // % of container width
var POOF_FX_DURATION_MS = 1400;
var POOF_FX_OFFSET_X = 0;       // offset from fairy center (%)
var POOF_FX_OFFSET_Y = 0;

function PoofFX(props) {
    var [phase, setPhase] = useState("grow");

    useEffect(function() {
        var t = setTimeout(function() { setPhase("fade"); }, 50);
        return function() { clearTimeout(t); };
    }, []);

    var style = {
        position: "absolute",
        left: (props.x + POOF_FX_OFFSET_X) + "%",
        top: (props.y + POOF_FX_OFFSET_Y) + "%",
        width: POOF_FX_SIZE_PCT + "%",
        height: POOF_FX_SIZE_PCT + "%",
        transform: "translate(-50%, -50%) scale(" + (phase === "grow" ? 0.2 : 1.2) + ")",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180, 100, 255, 0.95) 0%, rgba(140, 60, 220, 0.7) 35%, rgba(100, 30, 180, 0.2) 60%, rgba(80, 20, 160, 0) 75%)",
        boxShadow: "0 0 50px 20px rgba(160, 80, 240, 0.5)",
        opacity: phase === "grow" ? 1 : 0,
        transition: "transform " + POOF_FX_DURATION_MS + "ms ease-out, opacity " + POOF_FX_DURATION_MS + "ms ease-out",
        pointerEvents: "none",
        zIndex: 2,
    };

    return <div style={style} />;
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
    var aspect = SPRITE_CFG.frameH / SPRITE_CFG.frameW;
    var spriteW = SPRITE_CFG.sizePct + "%";
    var spriteH = (SPRITE_CFG.sizePct * aspect) + "%";

    // --- Don't render when nothing is active ---
    var showFairy = pos !== null;
    var showFX = poofAt !== null;
    if (!showFairy && !showFX) return null;

    var transMs = showFairy ? (pos.transition || 0) : 0;

    // --- Full-screen container — all children positioned as % of this ---
    return (
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
                        height: spriteH,
                        backgroundImage: "url(" + SPRITE_CFG.sheet + ")",
                        backgroundPosition: -(frame * SPRITE_CFG.sizePct) + "% 0",
                        backgroundSize: (SPRITE_CFG.frames * 100) + "% 100%",
                        backgroundRepeat: "no-repeat",
                        imageRendering: "pixelated",
                    }} />
                </div>
            )}
        </div>
    );
}

export default FairyAnim;