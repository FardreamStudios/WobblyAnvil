// ============================================================
// FairyAnim.js — Reusable Fairy Animation Component
// Position: fixed (viewport-free, no layout impact)
// Outer div = position/scale/rotation (timeline target)
// Inner div = spritesheet window (never touched by animations)
// Shuffle-deck loop: plays all 6 actions, reshuffles, repeats.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

var PUB = process.env.PUBLIC_URL || "";

// ============================================================
// Sprite Params
// ============================================================
var SPRITE_CFG = {
    sheet:    PUB + "/images/anim/waFairyIdleSS.png",
    frames:   5,
    frameW:   380,
    frameH:   380,
    fps:      1.0,
    sizeVw:   18,         // base display width in vw
};

// ============================================================
// Timeline Definitions — tune positions here
// ============================================================

// Edge peeks: fairy at scale 4, slides from off-screen to peek position
var PEEK_SCALE = 4;
var PEEK_SLIDE_IN_MS = 1200;
var PEEK_HOLD_MS = 2500;
var PEEK_SLIDE_OUT_MS = 1000;

var EDGE_PEEKS = [
    { name: "bottom", type: "peek", offX: 50, offY: 165, peekX: 50, peekY: 125, rot: 0 },
    { name: "top",    type: "peek", offX: 50, offY: -60, peekX: 50, peekY: -25, rot: 180 },
    { name: "left",   type: "peek", offX: -35, offY: 50, peekX: -10, peekY: 50, rot: 90 },
    { name: "right",  type: "peek", offX: 155, offY: 50, peekX: 130, peekY: 50, rot: -90 },
];

// Center poof: fairy at normal scale, appears with purple FX
var POOF_SCALE_START = 0.1;
var POOF_SCALE_END = 1;
var POOF_SNAP_IN_MS = 250;
var POOF_HOLD_MS_MIN = 4000;
var POOF_HOLD_MS_MAX = 6000;
var POOF_SNAP_OUT_MS = 200;

var CENTER_POOFS = [
    { name: "poofLeft",  type: "poof", x: 25, y: 50 },
    { name: "poofRight", type: "poof", x: 90, y: 50 },
];

// Loop timing
var INITIAL_DELAY_MIN = 1000;
var INITIAL_DELAY_MAX = 4000;
var BETWEEN_DELAY_MIN = 1500;
var BETWEEN_DELAY_MAX = 4000;

// ============================================================
// Purple Bubble Pop FX — attached to wrapper, offset tunable
// ============================================================
var POOF_FX_SIZE_VW = 28;
var POOF_FX_DURATION_MS = 400;
var POOF_FX_OFFSET_X = "50%";   // horizontal offset within wrapper
var POOF_FX_OFFSET_Y = "50%";   // vertical offset within wrapper

function PoofFX() {
    var [phase, setPhase] = useState("grow");

    useEffect(function() {
        var t = setTimeout(function() { setPhase("fade"); }, 50);
        return function() { clearTimeout(t); };
    }, []);

    var size = POOF_FX_SIZE_VW + "vw";
    var style = {
        position: "absolute",
        left: POOF_FX_OFFSET_X,
        top: POOF_FX_OFFSET_Y,
        width: size,
        height: size,
        transform: "translate(-50%, -50%) scale(" + (phase === "grow" ? 0.2 : 1.2) + ")",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(180, 100, 255, 0.7) 0%, rgba(140, 60, 220, 0.4) 40%, rgba(100, 30, 180, 0) 70%)",
        boxShadow: "0 0 40px 15px rgba(160, 80, 240, 0.3)",
        opacity: phase === "grow" ? 0.9 : 0,
        transition: "transform " + POOF_FX_DURATION_MS + "ms ease-out, opacity " + POOF_FX_DURATION_MS + "ms ease-out",
        pointerEvents: "none",
    };

    return <div style={style} />;
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
    var [showPoof, setShowPoof] = useState(false);
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
        // Start off-screen
        setPos({ x: edge.offX, y: edge.offY, scale: PEEK_SCALE, rot: edge.rot, transition: 0 });

        // Slide to peek
        schedule(function() {
            setPos({ x: edge.peekX, y: edge.peekY, scale: PEEK_SCALE, rot: edge.rot, transition: PEEK_SLIDE_IN_MS });
        }, 50);

        // Slide back out
        schedule(function() {
            setPos({ x: edge.offX, y: edge.offY, scale: PEEK_SCALE, rot: edge.rot, transition: PEEK_SLIDE_OUT_MS });
        }, 50 + PEEK_SLIDE_IN_MS + PEEK_HOLD_MS);

        // Done — hide
        schedule(function() {
            setPos(null);
            if (onDone) onDone();
        }, 50 + PEEK_SLIDE_IN_MS + PEEK_HOLD_MS + PEEK_SLIDE_OUT_MS);
    }

    // --- Run a center poof action ---
    function runPoof(spot, onDone) {
        var holdMs = randInt(POOF_HOLD_MS_MIN, POOF_HOLD_MS_MAX);

        // Start tiny at position, show FX
        setPos({ x: spot.x, y: spot.y, scale: POOF_SCALE_START, rot: 0, transition: 0 });
        setShowPoof(true);

        // Snap to full size
        schedule(function() {
            setPos({ x: spot.x, y: spot.y, scale: POOF_SCALE_END, rot: 0, transition: POOF_SNAP_IN_MS });
        }, 50);

        // Clear appear FX
        schedule(function() {
            setShowPoof(false);
        }, POOF_SNAP_IN_MS + 100);

        // Start exit — show FX, shrink
        schedule(function() {
            setShowPoof(true);
            setPos({ x: spot.x, y: spot.y, scale: POOF_SCALE_START, rot: 0, transition: POOF_SNAP_OUT_MS });
        }, POOF_SNAP_IN_MS + holdMs);

        // Done — hide
        schedule(function() {
            setShowPoof(false);
            setPos(null);
            if (onDone) onDone();
        }, POOF_SNAP_IN_MS + holdMs + POOF_SNAP_OUT_MS + 100);
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

    // --- Don't render when off-screen ---
    if (!pos) return null;

    // --- Sizing (sprite window) ---
    var aspect = SPRITE_CFG.frameH / SPRITE_CFG.frameW;
    var spriteW = SPRITE_CFG.sizeVw + "vw";
    var spriteH = (SPRITE_CFG.sizeVw * aspect) + "vw";

    var transMs = pos.transition || 0;

    // --- Wrapper: position, scale, rotation ---
    var wrapperStyle = {
        position: "fixed",
        left: pos.x + "vw",
        top: pos.y + "vh",
        transform: "translate(-50%, -50%) scale(" + pos.scale + ") rotate(" + pos.rot + "deg)",
        transition: transMs > 0
            ? "left " + transMs + "ms ease-in-out, top " + transMs + "ms ease-in-out, transform " + transMs + "ms ease-in-out"
            : "none",
        pointerEvents: "none",
        zIndex: 10,
    };

    // --- Sprite: spritesheet window ---
    var spriteStyle = {
        width: spriteW,
        height: spriteH,
        backgroundImage: "url(" + SPRITE_CFG.sheet + ")",
        backgroundPosition: -(frame * SPRITE_CFG.sizeVw) + "vw 0",
        backgroundSize: (SPRITE_CFG.sizeVw * SPRITE_CFG.frames) + "vw " + spriteH,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
    };

    return (
        <div style={wrapperStyle}>
            {showPoof && <PoofFX />}
            <div style={spriteStyle} />
        </div>
    );
}

export default FairyAnim;