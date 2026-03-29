// ============================================================
// BattleTransition.js — Pixel Dissolve Battle Transition
//
// Self-contained transition overlay. Covers the screen with
// shuffled pixel tiles, holds on solid color with optional
// flash text, then reveals what's underneath.
//
// PHASES:
//   1. DISSOLVE_IN  — pixels rain in, covering the screen
//   2. HOLD         — solid color + flash text, onMidpoint fires
//   3. DISSOLVE_OUT — pixels clear, revealing content beneath
//   4. DONE         — onComplete fires, component can unmount
//
// CROSS-DEVICE:
//   - Tiny internal canvas (gridW x gridH) upscaled via CSS
//     image-rendering: pixelated. Proven pattern in this codebase.
//   - position: fixed; inset: 0 for viewport coverage.
//   - clamp() for responsive flash text.
//   - requestAnimationFrame + delta-time for consistent speed.
//   - No html2canvas, no getComputedStyle, no toDataURL.
//   - No fullscreen requests — rides existing state.
//   - Audio .play().catch() for autoplay policy safety.
//
// PROPS:
//   config      — object, overrides BATTLE_TRANSITION defaults
//   onMidpoint  — function, fires at hold phase start (mount battle view)
//   onComplete  — function, fires when resolve finishes
//   sfx         — audio system ref (for battleFanfare)
//   reverse     — boolean, if true plays resolve-first (for exit)
//
// PORTABILITY:
//   Imports nothing from host game. Config defaults passed in.
//   Could be used for any screen transition.
// ============================================================

import { useEffect, useRef, useState } from "react";

// ============================================================
// DEFAULT CONFIG — overridden by props.config
// ============================================================
var DEFAULTS = {
    gridW:          160,        // pixel grid columns
    gridH:          90,         // pixel grid rows
    dissolveMs:     400,        // wipe-in duration
    holdMs:         400,        // black hold with flash text
    resolveMs:      400,        // wipe-out duration
    flashText:      "BATTLE!",  // text during hold (null = skip)
    flashFontSize:  "clamp(18px, 5vw, 32px)",
    flashColor:     "#f59e0b",
    pixelColor:     "#0a0704",  // dissolve pixel color
    fanfareDelayMs: 100,        // delay before fanfare plays
};

// ============================================================
// PHASE ENUM
// ============================================================
var PHASE = {
    DISSOLVE_IN:  "dissolve_in",
    HOLD:         "hold",
    DISSOLVE_OUT: "dissolve_out",
    DONE:         "done",
};

// ============================================================
// HELPERS
// ============================================================

// Fisher-Yates shuffle (in place)
function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

// Build shuffled index array [0..n-1]
function buildShuffledIndices(count) {
    var arr = [];
    for (var i = 0; i < count; i++) arr.push(i);
    return shuffle(arr);
}

// Parse hex color to {r, g, b}
function hexToRGB(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
}

// ============================================================
// COMPONENT
// ============================================================

function BattleTransition(props) {
    var cfg = Object.assign({}, DEFAULTS, props.config || {});
    var onMidpoint = props.onMidpoint;
    var onComplete = props.onComplete;
    var sfx = props.sfx;
    var reverse = props.reverse || false;

    var canvasRef = useRef(null);
    var phaseRef = useRef(reverse ? PHASE.DISSOLVE_OUT : PHASE.DISSOLVE_IN);
    var elapsedRef = useRef(0);
    var lastTimeRef = useRef(null);
    var indicesRef = useRef(null);
    var midpointFiredRef = useRef(false);
    var fanfareFiredRef = useRef(false);
    var fanfareElapsedRef = useRef(0);
    var bufferRef = useRef(null);        // ImageData pixel buffer
    var pixelColorRef = useRef(null);    // {r, g, b}
    var totalPixelsRef = useRef(0);

    var [showFlash, setShowFlash] = useState(false);

    // --- Init on mount ---
    useEffect(function() {
        var canvas = canvasRef.current;
        if (!canvas) return;

        var gw = cfg.gridW;
        var gh = cfg.gridH;
        var total = gw * gh;

        canvas.width = gw;
        canvas.height = gh;

        var ctx = canvas.getContext("2d");

        // Start state depends on direction
        if (reverse) {
            // Reverse: start fully covered, dissolve out
            var rgb = hexToRGB(cfg.pixelColor);
            ctx.fillStyle = cfg.pixelColor;
            ctx.fillRect(0, 0, gw, gh);
            var imgData = ctx.getImageData(0, 0, gw, gh);
            bufferRef.current = imgData;
            pixelColorRef.current = rgb;
        } else {
            // Forward: start transparent, dissolve in
            var imgData2 = ctx.createImageData(gw, gh);
            bufferRef.current = imgData2;
            pixelColorRef.current = hexToRGB(cfg.pixelColor);
        }

        totalPixelsRef.current = total;
        indicesRef.current = buildShuffledIndices(total);

        // --- Animation loop ---
        var rafId = null;

        function tick(timestamp) {
            if (phaseRef.current === PHASE.DONE) return;

            if (lastTimeRef.current === null) {
                lastTimeRef.current = timestamp;
                rafId = requestAnimationFrame(tick);
                return;
            }

            var dt = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            // Clamp delta to avoid huge jumps on tab-switch
            if (dt > 100) dt = 100;

            elapsedRef.current += dt;

            // --- Fanfare timing (independent of phase) ---
            if (!fanfareFiredRef.current && sfx && cfg.fanfareDelayMs >= 0) {
                fanfareElapsedRef.current += dt;
                if (fanfareElapsedRef.current >= cfg.fanfareDelayMs) {
                    fanfareFiredRef.current = true;
                    if (sfx.battleFanfare) {
                        sfx.battleFanfare();
                    }
                }
            }

            var phase = phaseRef.current;
            var elapsed = elapsedRef.current;
            var indices = indicesRef.current;
            var imgData3 = bufferRef.current;
            var data = imgData3.data;
            var rgb2 = pixelColorRef.current;
            var total2 = totalPixelsRef.current;

            if (phase === PHASE.DISSOLVE_IN) {
                var progress = Math.min(elapsed / cfg.dissolveMs, 1);
                var targetCount = Math.floor(progress * total2);

                // Fill pixels up to targetCount
                for (var i = 0; i < targetCount; i++) {
                    var idx = indices[i];
                    var off = idx * 4;
                    data[off]     = rgb2.r;
                    data[off + 1] = rgb2.g;
                    data[off + 2] = rgb2.b;
                    data[off + 3] = 255;
                }

                ctx.putImageData(imgData3, 0, 0);

                if (progress >= 1) {
                    phaseRef.current = PHASE.HOLD;
                    elapsedRef.current = 0;
                    setShowFlash(true);

                    // Fire midpoint
                    if (!midpointFiredRef.current && onMidpoint) {
                        midpointFiredRef.current = true;
                        onMidpoint();
                    }
                }

            } else if (phase === PHASE.HOLD) {
                if (elapsed >= cfg.holdMs) {
                    phaseRef.current = PHASE.DISSOLVE_OUT;
                    elapsedRef.current = 0;
                    setShowFlash(false);

                    // Re-shuffle for a different dissolve pattern
                    indicesRef.current = buildShuffledIndices(total2);
                }

            } else if (phase === PHASE.DISSOLVE_OUT) {
                var progress2 = Math.min(elapsed / cfg.resolveMs, 1);
                var clearCount = Math.floor(progress2 * total2);
                var indices2 = indicesRef.current;

                // Clear pixels up to clearCount
                for (var j = 0; j < clearCount; j++) {
                    var idx2 = indices2[j];
                    var off2 = idx2 * 4;
                    data[off2 + 3] = 0; // set alpha to 0
                }

                ctx.putImageData(imgData3, 0, 0);

                // For reverse mode, fire midpoint when dissolve-out starts clearing
                if (reverse && !midpointFiredRef.current && onMidpoint && progress2 > 0) {
                    midpointFiredRef.current = true;
                    onMidpoint();
                }

                if (progress2 >= 1) {
                    phaseRef.current = PHASE.DONE;
                    if (onComplete) onComplete();
                }
            }

            if (phaseRef.current !== PHASE.DONE) {
                rafId = requestAnimationFrame(tick);
            }
        }

        rafId = requestAnimationFrame(tick);

        return function() {
            if (rafId) cancelAnimationFrame(rafId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Styles ---
    var overlayStyle = {
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        overflow: "hidden",
    };

    var canvasStyle = {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
    };

    var flashStyle = {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "monospace",
        fontSize: cfg.flashFontSize,
        fontWeight: "bold",
        letterSpacing: 4,
        color: cfg.flashColor,
        textTransform: "uppercase",
        textShadow: "0 0 20px " + cfg.flashColor + ", 0 0 40px " + cfg.flashColor + "66",
        animation: "battleFlashPulse 0.3s ease-in-out infinite alternate",
    };

    return (
        <div style={overlayStyle}>
            <style>{"\n                @keyframes battleFlashPulse {\n                    0%   { opacity: 0.7; transform: scale(0.95); }\n                    100% { opacity: 1;   transform: scale(1.05); }\n                }\n            "}</style>
            <canvas ref={canvasRef} style={canvasStyle} />
            {showFlash && cfg.flashText && (
                <div style={flashStyle}>{cfg.flashText}</div>
            )}
        </div>
    );
}

// ============================================================
// MODULE EXPORT
// ============================================================

var BattleTransitionModule = {
    BattleTransition: BattleTransition,
    BATTLE_TRANSITION_DEFAULTS: DEFAULTS,
};

export default BattleTransitionModule;