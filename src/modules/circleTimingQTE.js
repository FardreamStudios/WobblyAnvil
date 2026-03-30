// ============================================================
// circleTimingQTE.js — Circle Timing QTE Plugin
//
// Clair Obscur-style shrinking ring sequences.
// Config in, result out. Portable — knows nothing about
// battles, forges, or any host system.
//
// PLUGIN CONTRACT (DES-2):
//   Props: { config, onComplete, onRingResult? }
//   config — ring count, speeds, delays, zone sizing
//   onComplete({ hits, total, details, successRatio })
//   onRingResult(index, hit) — optional per-ring callback for
//     real-time visual sync (e.g. battle jab/flinch per tap)
//
// PURE LOGIC (no React):
//   createRingSequence(config) — builds ring timeline
//   getRingProgress(ring, elapsedMs) — returns 0..1 progress
//   getRingRadius(ring, progress, config) — current visual radius
//   isInHitWindow(ring, progress, config) — pass/fail check
//
// UE ANALOGY: A Gameplay Ability with its own montage.
//   The system provides activation + result contract.
//   The ability owns its own animation and input.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// Constants
// ============================================================

var BASE_HIT_WINDOW = 0.12;     // fraction of radius range that counts as pass
var FLASH_MS = 300;              // feedback flash duration
var RESULT_HOLD_MS = 800;        // pause before calling onComplete
var RING_STROKE = 3;
var TARGET_STROKE = 2.5;
var HIT_COLOR = "#4ade80";
var MISS_COLOR = "#f87171";
var RING_COLOR_ACTIVE = "#60a5fa";
var RING_COLOR_APPROACHING = "#fbbf24";
var TARGET_COLOR = "rgba(255,255,255,0.35)";

// ============================================================
// Pure Logic — No React, No State, No Side Effects
// ============================================================

function createRingSequence(config) {
    var rings = [];
    var cumulativeDelay = 0;
    for (var i = 0; i < config.rings; i++) {
        cumulativeDelay += (config.delays[i] || 0);
        var speed = config.speeds[i] || 1.0;
        var duration = config.shrinkDurationMs / speed;
        rings.push({
            index: i,
            delayMs: cumulativeDelay,
            durationMs: duration,
            speed: speed,
            result: null,
        });
        cumulativeDelay += duration;
    }
    return rings;
}

function getRingProgress(ring, elapsedMs) {
    var ringStart = ring.delayMs;
    var ringEnd = ring.delayMs + ring.durationMs;
    if (elapsedMs < ringStart) return -1;
    if (elapsedMs >= ringEnd) return 1;
    return (elapsedMs - ringStart) / ring.durationMs;
}

function getRingRadius(ring, progress, config) {
    if (progress < 0) return config.ringStartRadius;
    if (progress >= 1) return config.targetRadius;
    return config.ringStartRadius + (config.targetRadius - config.ringStartRadius) * progress;
}

function isInHitWindow(ring, progress, config) {
    var hitWindow = BASE_HIT_WINDOW * (1 + (config.zoneBonus || 0));
    var hitStart = 1.0 - hitWindow;
    return progress >= hitStart && progress <= 1.0;
}

// ============================================================
// CircleTimingQTE — React Component (DES-2 Plugin)
// ============================================================
//
// Props:
//   config = {
//       rings: 3,
//       speeds: [1.0, 1.0, 1.0],
//       delays: [0, 400, 400],
//       zoneBonus: 0.15,
//       targetRadius: 36,
//       ringStartRadius: 130,
//       shrinkDurationMs: 800,
//       label: "ATTACK!",
//   }
//   onComplete = function({ hits, total, details, successRatio }) { }
//
// ============================================================

function CircleTimingQTE(props) {
    var config = props.config;
    var onComplete = props.onComplete;
    var onRingResult = props.onRingResult;
    var onRingStart = props.onRingStart;

    // --- State ---
    var [phase, setPhase] = useState("ready");
    var [elapsed, setElapsed] = useState(0);
    var [ringSequence, setRingSequence] = useState(function() { return createRingSequence(config); });
    var [currentRing, setCurrentRing] = useState(0);
    var [results, setResults] = useState(function() { return new Array(config.rings).fill(null); });
    var [flash, setFlash] = useState(null);
    var [flashHit, setFlashHit] = useState(false);

    // --- Refs (stable across renders) ---
    var startTimeRef = useRef(null);
    var rafRef = useRef(null);
    var resultsRef = useRef(results);
    var currentRingRef = useRef(0);
    var sequenceRef = useRef(ringSequence);
    var phaseRef = useRef("ready");
    var flashTimerRef = useRef(null);
    var ringStartedRef = useRef({});  // tracks which ring indices have fired onRingStart

    resultsRef.current = results;
    currentRingRef.current = currentRing;
    sequenceRef.current = ringSequence;
    phaseRef.current = phase;

    // --- Start sequence after brief delay ---
    useEffect(function() {
        var timer = setTimeout(function() {
            setPhase("playing");
            phaseRef.current = "playing";
            startTimeRef.current = performance.now();
        }, 600);
        return function() {
            clearTimeout(timer);
            cancelAnimationFrame(rafRef.current);
            clearTimeout(flashTimerRef.current);
        };
    }, []);

    // --- Animation loop ---
    useEffect(function() {
        if (phase !== "playing") return;

        function tick() {
            if (phaseRef.current !== "playing") return;
            var now = performance.now();
            var el = now - startTimeRef.current;
            setElapsed(el);

            // Check if current ring just started shrinking (fire onRingStart once)
            var ci = currentRingRef.current;
            var seq = sequenceRef.current;
            if (ci < seq.length) {
                var ring = seq[ci];
                var progress = getRingProgress(ring, el);

                // Fire onRingStart when ring transitions from waiting to active
                if (progress >= 0 && !ringStartedRef.current[ci]) {
                    ringStartedRef.current[ci] = true;
                    if (onRingStart) onRingStart(ci, ring.durationMs);
                }

                if (progress >= 1 && ring.result === null) {
                    ring.result = "miss";
                    var newResults = resultsRef.current.slice();
                    newResults[ci] = false;
                    resultsRef.current = newResults;
                    setResults(newResults);
                    showFlash("MISS", false);
                    if (onRingResult) onRingResult(ci, false);

                    var next = ci + 1;
                    currentRingRef.current = next;
                    setCurrentRing(next);

                    if (next >= seq.length) {
                        finishSequence(newResults);
                        return;
                    }
                }
            }

            rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);
        return function() { cancelAnimationFrame(rafRef.current); };
    }, [phase]);

    // --- Flash helper ---
    function showFlash(text, isHit) {
        setFlash(text);
        setFlashHit(isHit);
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(function() { setFlash(null); }, FLASH_MS);
    }

    // --- Finish ---
    function finishSequence(finalResults) {
        cancelAnimationFrame(rafRef.current);
        phaseRef.current = "done";
        setTimeout(function() {
            setPhase("done");
            var hits = 0;
            for (var i = 0; i < finalResults.length; i++) {
                if (finalResults[i] === true) hits++;
            }
            if (onComplete) {
                onComplete({
                    hits: hits,
                    total: config.rings,
                    details: finalResults,
                    successRatio: hits / config.rings,
                });
            }
        }, RESULT_HOLD_MS);
    }

    // --- Handle tap ---
    var handleTap = useCallback(function() {
        if (phaseRef.current !== "playing") return;
        var el = performance.now() - startTimeRef.current;
        var ci = currentRingRef.current;
        var seq = sequenceRef.current;
        if (ci >= seq.length) return;

        var ring = seq[ci];
        if (ring.result !== null) return;

        var progress = getRingProgress(ring, el);

        // Can't tap before ring starts animating
        if (progress < 0) return;

        var hit = isInHitWindow(ring, progress, config);
        ring.result = hit ? "hit" : "miss";

        var newResults = resultsRef.current.slice();
        newResults[ci] = hit;
        resultsRef.current = newResults;
        setResults(newResults);

        showFlash(hit ? "HIT!" : "MISS", hit);
        if (onRingResult) onRingResult(ci, hit);

        var next = ci + 1;
        currentRingRef.current = next;
        setCurrentRing(next);

        if (next >= seq.length) {
            finishSequence(newResults);
        }
    }, [config]);

    // --- Compute ring visuals ---
    var ringVisuals = [];
    for (var i = 0; i < ringSequence.length; i++) {
        var ring = ringSequence[i];
        var progress = phase === "playing" ? getRingProgress(ring, elapsed) : -1;
        var radius = getRingRadius(ring, progress, config);
        var ringState = "waiting";
        var opacity = 1;

        if (ring.result === "hit") {
            ringState = "hit";
            radius = config.targetRadius;
            opacity = Math.max(0, 1 - (elapsed - ring.delayMs - ring.durationMs) / 400);
        } else if (ring.result === "miss") {
            ringState = "miss";
            opacity = Math.max(0, 1 - (elapsed - ring.delayMs - ring.durationMs) / 400);
        } else if (i === currentRing && progress >= 0) {
            ringState = isInHitWindow(ring, progress, config) ? "approaching" : "active";
        } else if (i > currentRing && progress < 0) {
            ringState = "waiting";
            opacity = 0.3;
        }

        if (opacity > 0.01) {
            var stroke = RING_COLOR_ACTIVE;
            var sw = RING_STROKE;
            var dasharray = "none";

            if (ringState === "approaching") {
                stroke = RING_COLOR_APPROACHING;
                sw = 2;
            } else if (ringState === "hit") {
                stroke = HIT_COLOR;
                sw = 4;
            } else if (ringState === "miss") {
                stroke = MISS_COLOR;
                sw = 2;
                dasharray = "8 6";
            } else if (ringState === "waiting") {
                stroke = "rgba(255,255,255,0.15)";
                sw = 1;
            }

            ringVisuals.push(
                <circle
                    key={i}
                    cx="50%"
                    cy="50%"
                    r={radius}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={sw}
                    strokeDasharray={dasharray}
                    opacity={opacity}
                />
            );
        }
    }

    // --- Hit zone indicator ---
    var hitWindow = BASE_HIT_WINDOW * (1 + (config.zoneBonus || 0));
    var hitZoneOuterRadius = config.targetRadius + (config.ringStartRadius - config.targetRadius) * hitWindow;

    // --- Result pips ---
    var pips = [];
    for (var p = 0; p < config.rings; p++) {
        var r = results[p];
        var pipColor = r === null ? "rgba(255,255,255,0.2)" : r ? HIT_COLOR : MISS_COLOR;
        pips.push(
            <div key={p} style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: pipColor,
                transition: "all 200ms",
                transform: r !== null ? "scale(1.3)" : "scale(1)",
            }} />
        );
    }

    // --- Flash text ---
    var flashEl = null;
    if (flash) {
        var flashColor = flashHit ? HIT_COLOR : MISS_COLOR;
        flashEl = (
            <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "clamp(18px, 4vw, 28px)",
                fontWeight: 700,
                fontFamily: "monospace",
                color: flashColor,
                textShadow: "0 0 20px " + flashColor + ", 0 2px 8px rgba(0,0,0,0.5)",
                pointerEvents: "none",
                zIndex: 10,
            }}>
                {flash}
            </div>
        );
    }

    // --- Done summary ---
    var hits = 0;
    for (var d = 0; d < results.length; d++) {
        if (results[d] === true) hits++;
    }
    var done = phase === "done";
    var ratio = done ? (hits / config.rings) : 0;
    var svgSize = (config.ringStartRadius + 20) * 2;

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "manipulation",
        }}>
            {/* Label */}
            <div style={{
                fontFamily: "monospace",
                fontSize: "clamp(14px, 3vw, 20px)",
                fontWeight: 700,
                letterSpacing: 3,
                color: done
                    ? (ratio >= 0.8 ? HIT_COLOR : ratio >= 0.5 ? RING_COLOR_APPROACHING : MISS_COLOR)
                    : "rgba(255,255,255,0.7)",
                transition: "color 300ms",
            }}>
                {done
                    ? (ratio >= 0.8 ? "EXCELLENT!" : ratio >= 0.5 ? "DECENT" : "POOR")
                    : (config.label || "TAP!")
                }
            </div>

            {/* QTE Zone — tap target */}
            <div
                onClick={handleTap}
                onTouchStart={function(e) { e.preventDefault(); handleTap(); }}
                style={{
                    position: "relative",
                    width: svgSize,
                    height: svgSize,
                    maxWidth: "80vw",
                    maxHeight: "80vw",
                    cursor: "pointer",
                }}
            >
                <svg
                    width="100%"
                    height="100%"
                    viewBox={"0 0 " + svgSize + " " + svgSize}
                    style={{ display: "block" }}
                >
                    {/* Hit zone indicator */}
                    <circle
                        cx="50%"
                        cy="50%"
                        r={(config.targetRadius + hitZoneOuterRadius) / 2}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth={hitZoneOuterRadius - config.targetRadius}
                    />

                    {/* Target circle */}
                    <circle
                        cx="50%"
                        cy="50%"
                        r={config.targetRadius}
                        fill="none"
                        stroke={TARGET_COLOR}
                        strokeWidth={TARGET_STROKE}
                    />

                    {/* Active rings */}
                    {ringVisuals}
                </svg>

                {/* Flash feedback */}
                {flashEl}
            </div>

            {/* Result pips */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {pips}
            </div>

            {/* Done summary */}
            {done && (
                <div style={{
                    fontFamily: "monospace",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.5)",
                    textAlign: "center",
                }}>
                    {hits}/{config.rings} hits
                </div>
            )}
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var CircleTimingQTEModule = {
    CircleTimingQTE: CircleTimingQTE,
    createRingSequence: createRingSequence,
    getRingProgress: getRingProgress,
    getRingRadius: getRingRadius,
    isInHitWindow: isInHitWindow,
    BASE_HIT_WINDOW: BASE_HIT_WINDOW,
};

export default CircleTimingQTEModule;