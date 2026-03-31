// ============================================================
// Chalkboard.js — Offense QTE System (CombatFeelSpec §3)
//
// The Chalkboard renders all offensive checks in sequence.
// Supports ring (tap), swipe (directional release), and circle (trace release).
//
// PLUGIN CONTRACT:
//   Props:
//     config     — ring timing config (rings, speeds, delays, etc.)
//     beats      — array of beat objects with { check, swipeDir, ... }
//     difficulty — resolved difficulty object { hitZone, perfectZone, damageMap }
//     onComplete(resultsArray)                — all checks done
//     onCheckResult(index, tier, checkType)   — optional per-check
//     onCheckStart(index, checkType)          — optional per-check
//
//   Result shape per check:
//     Ring:   { tier, checkType: "ring",   inputType: "tap"|"auto_miss" }
//     Swipe:  { tier, checkType: "swipe",  inputType: "swipe"|"auto_miss", direction: "right"|... }
//     Circle: { tier, checkType: "circle", inputType: "circle"|"auto_miss" }
//
// PURE LOGIC (no React):
//   createCheckSequence(config)         — builds check timeline
//   getCheckProgress(check, elapsedMs)  — returns -1..1 progress
//   getCheckRadius(check, progress, config) — current visual radius
//   scoreTier(progress, difficulty)     — returns "perfect"|"good"|"miss"
//   resolveDifficulty(key, overrides)   — resolve preset + overrides
//
// ZONE MATH:
//   Progress 0→1 over the check window.
//   hitZone is fraction of travel where result ≥ good (absolute).
//   perfectZone is fraction of travel where result = perfect (absolute, subset).
//   goodStart = 1.0 - hitZone
//   perfectStart = 1.0 - perfectZone
//   Same math for ring (radius) and swipe/circle (fill progress).
//
// Lives in src/battle/. Config in, results out.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import BattleConstants from "./battleConstants.js";
import GestureRecognition from "./gestureRecognition.js";

var QTE_DIFFICULTY = BattleConstants.QTE_DIFFICULTY;

// ============================================================
// Constants — Visual Tuning
// ============================================================

var FLASH_MS = 350;
var RESULT_HOLD_MS = 600;
var START_DELAY_MS = 500;
var RING_STROKE = 3;
var TARGET_STROKE = 2.5;
var SWIPE_MIN_PX = 30;
var TAP_MAX_PX = 15;

// --- Colors ---
var COLOR_PERFECT   = "#fbbf24";
var COLOR_GOOD      = "#4ade80";
var COLOR_MISS      = "#f87171";
var COLOR_ACTIVE    = "#60a5fa";
var COLOR_TARGET    = "rgba(255,255,255,0.35)";
var COLOR_ZONE_GOOD = "rgba(74, 222, 128, 0.12)";
var COLOR_ZONE_PERF = "rgba(251, 191, 36, 0.18)";
var COLOR_GLOW_GOOD = "rgba(74, 222, 128, 0.35)";
var COLOR_GLOW_PERF = "rgba(251, 191, 36, 0.50)";
var COLOR_SWIPE_PATH = "rgba(255,255,255,0.10)";
var COLOR_SWIPE_ARROW = "rgba(255,255,255,0.45)";
var COLOR_PARTICLE_TRAIL = "rgba(96, 165, 250, 0.25)";

// --- Swipe direction → unit vector (SVG coords: +x right, +y down) ---
var SWIPE_VECTORS = {
    right: { x: 1,  y: 0  },
    left:  { x: -1, y: 0  },
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1  },
};

var SWIPE_PATH_FRACTION = 0.55;

// ============================================================
// Pure Logic
// ============================================================

function createCheckSequence(config) {
    var checks = [];
    var cumulativeDelay = 0;
    var count = config.rings || 0;
    for (var i = 0; i < count; i++) {
        cumulativeDelay += (config.delays[i] || 0);
        var speed = config.speeds[i] || 1.0;
        var duration = config.shrinkDurationMs / speed;
        checks.push({
            index: i,
            delayMs: cumulativeDelay,
            durationMs: duration,
            speed: speed,
            result: null,
        });
        cumulativeDelay += duration;
    }
    return checks;
}

function getCheckProgress(check, elapsedMs) {
    var start = check.delayMs;
    var end = check.delayMs + check.durationMs;
    if (elapsedMs < start) return -1;
    if (elapsedMs >= end) return 1;
    return (elapsedMs - start) / check.durationMs;
}

function getCheckRadius(check, progress, config) {
    if (progress < 0) return config.ringStartRadius;
    if (progress >= 1) return config.targetRadius;
    return config.ringStartRadius + (config.targetRadius - config.ringStartRadius) * progress;
}

function scoreTier(progress, difficulty) {
    var goodStart = 1.0 - difficulty.hitZone;
    var perfectStart = 1.0 - difficulty.perfectZone;
    if (progress >= perfectStart && progress <= 1.0) return "perfect";
    if (progress >= goodStart && progress <= 1.0) return "good";
    return "miss";
}

function resolveDifficulty(difficultyKey, skillOverrides) {
    var preset = QTE_DIFFICULTY[difficultyKey] || QTE_DIFFICULTY["normal"];
    var resolved = {
        hitZone:     preset.hitZone,
        perfectZone: preset.perfectZone,
        damageMap:   Object.assign({}, preset.damageMap),
    };
    if (skillOverrides) {
        if (skillOverrides.hitZone != null) resolved.hitZone = skillOverrides.hitZone;
        if (skillOverrides.perfectZone != null) resolved.perfectZone = skillOverrides.perfectZone;
        if (skillOverrides.damageMap != null) {
            resolved.damageMap = Object.assign({}, resolved.damageMap, skillOverrides.damageMap);
        }
    }
    return resolved;
}

function getCheckType(beats, index) {
    if (beats && beats[index] && beats[index].check) return beats[index].check;
    return "ring";
}

function getSwipeDir(beats, index) {
    if (beats && beats[index] && beats[index].swipeDir) return beats[index].swipeDir;
    return "right";
}

// --- SVG arc path helper ---
// Draws an arc from startAngle to endAngle (degrees) at given center + radius.
// 0° = 3 o'clock, -90° = 12 o'clock. Angles increase clockwise.
function describeArc(cx, cy, r, startAngle, endAngle) {
    var startRad = startAngle * Math.PI / 180;
    var endRad = endAngle * Math.PI / 180;
    var x1 = cx + r * Math.cos(startRad);
    var y1 = cy + r * Math.sin(startRad);
    var x2 = cx + r * Math.cos(endRad);
    var y2 = cy + r * Math.sin(endRad);

    var sweep = endAngle - startAngle;
    if (sweep < 0) sweep += 360;
    var largeArc = sweep > 180 ? 1 : 0;

    return "M " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + largeArc + " 1 " + x2 + " " + y2;
}

// ============================================================
// Chalkboard — React Component
// ============================================================

function Chalkboard(props) {
    var config = props.config;
    var beats = props.beats || [];
    var difficultyProp = props.difficulty || null;
    var onComplete = props.onComplete;
    var onCheckResult = props.onCheckResult;
    var onCheckStart = props.onCheckStart;

    var difficulty = difficultyProp || resolveDifficulty(
        config.difficulty || "normal",
        { hitZone: config.hitZone, perfectZone: config.perfectZone, damageMap: config.damageMap }
    );

    // --- State ---
    var [phase, setPhase] = useState("ready");
    var [elapsed, setElapsed] = useState(0);
    var [checkSequence, setCheckSequence] = useState(function() { return createCheckSequence(config); });
    var [currentCheck, setCurrentCheck] = useState(0);
    var [results, setResults] = useState(function() { return new Array(config.rings).fill(null); });
    var [flash, setFlash] = useState(null);

    // --- Refs ---
    var startTimeRef = useRef(null);
    var rafRef = useRef(null);
    var resultsRef = useRef(results);
    var currentCheckRef = useRef(0);
    var sequenceRef = useRef(checkSequence);
    var phaseRef = useRef("ready");
    var flashTimerRef = useRef(null);
    var checkStartedRef = useRef({});
    var touchStartRef = useRef(null);
    var touchPointsRef = useRef([]);
    var mouseDownRef = useRef(false);

    resultsRef.current = results;
    currentCheckRef.current = currentCheck;
    sequenceRef.current = checkSequence;
    phaseRef.current = phase;

    // --- Start ---
    useEffect(function() {
        var timer = setTimeout(function() {
            setPhase("playing");
            phaseRef.current = "playing";
            startTimeRef.current = performance.now();
        }, START_DELAY_MS);
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

            var ci = currentCheckRef.current;
            var seq = sequenceRef.current;
            if (ci < seq.length) {
                var chk = seq[ci];
                var prog = getCheckProgress(chk, el);

                if (prog >= 0 && !checkStartedRef.current[ci]) {
                    checkStartedRef.current[ci] = true;
                    if (onCheckStart) onCheckStart(ci, getCheckType(beats, ci));
                }

                if (prog >= 1 && chk.result === null) {
                    var ct = getCheckType(beats, ci);
                    chk.result = "miss";
                    var nr = resultsRef.current.slice();
                    nr[ci] = { tier: "miss", checkType: ct, inputType: "auto_miss" };
                    resultsRef.current = nr;
                    setResults(nr);
                    showFlash("MISS", "miss");
                    if (onCheckResult) onCheckResult(ci, "miss", ct);

                    var next = ci + 1;
                    currentCheckRef.current = next;
                    setCurrentCheck(next);

                    if (next >= seq.length) { finishSequence(nr); return; }
                }
            }

            rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);
        return function() { cancelAnimationFrame(rafRef.current); };
    }, [phase]);

    // --- Helpers ---
    function showFlash(text, tier) {
        setFlash({ text: text, tier: tier });
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(function() { setFlash(null); }, FLASH_MS);
    }

    function finishSequence(finalResults) {
        cancelAnimationFrame(rafRef.current);
        phaseRef.current = "done";
        setTimeout(function() {
            setPhase("done");
            if (onComplete) onComplete(finalResults);
        }, RESULT_HOLD_MS);
    }

    function recordResult(ci, tier, checkType, inputType, extra) {
        var seq = sequenceRef.current;
        seq[ci].result = tier;
        var nr = resultsRef.current.slice();
        var entry = { tier: tier, checkType: checkType, inputType: inputType };
        if (extra) { Object.keys(extra).forEach(function(k) { entry[k] = extra[k]; }); }
        nr[ci] = entry;
        resultsRef.current = nr;
        setResults(nr);

        var flashText = tier === "perfect" ? "PERFECT!" : tier === "good" ? "GOOD" : "MISS";
        showFlash(flashText, tier);
        if (onCheckResult) onCheckResult(ci, tier, checkType);

        var next = ci + 1;
        currentCheckRef.current = next;
        setCurrentCheck(next);
        if (next >= seq.length) { finishSequence(nr); }
    }

    // --- Ring tap ---
    var resolveRingTap = useCallback(function() {
        if (phaseRef.current !== "playing") return;
        var el = performance.now() - startTimeRef.current;
        var ci = currentCheckRef.current;
        var seq = sequenceRef.current;
        if (ci >= seq.length || seq[ci].result !== null) return;
        var prog = getCheckProgress(seq[ci], el);
        if (prog < 0) return;
        recordResult(ci, scoreTier(prog, difficulty), "ring", "tap");
    }, [difficulty]);

    // --- Swipe release ---
    var resolveSwipeRelease = useCallback(function(endPt) {
        if (phaseRef.current !== "playing") return;
        var ci = currentCheckRef.current;
        var seq = sequenceRef.current;
        if (ci >= seq.length || seq[ci].result !== null) return;

        var el = performance.now() - startTimeRef.current;
        var prog = getCheckProgress(seq[ci], el);
        if (prog < 0) return;

        var start = touchStartRef.current;
        if (!start) {
            recordResult(ci, "miss", "swipe", "swipe", { direction: null });
            return;
        }

        var dx = endPt.x - start.x;
        var dy = endPt.y - start.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        var classified = null;
        if (dist >= SWIPE_MIN_PX) {
            classified = GestureRecognition.classifySwipeDirection(dx, dy);
        }

        var expectedDir = getSwipeDir(beats, ci);
        var dirMatch = GestureRecognition.isDirectionMatch(classified, expectedDir);

        var tier = dirMatch ? scoreTier(prog, difficulty) : "miss";
        recordResult(ci, tier, "swipe", "swipe", { direction: classified });
    }, [difficulty, beats]);

    // --- Circle release ---
    var resolveCircleRelease = useCallback(function() {
        if (phaseRef.current !== "playing") return;
        var ci = currentCheckRef.current;
        var seq = sequenceRef.current;
        if (ci >= seq.length || seq[ci].result !== null) return;

        var el = performance.now() - startTimeRef.current;
        var prog = getCheckProgress(seq[ci], el);
        if (prog < 0) return;

        // Check if gesture was circular enough
        var points = touchPointsRef.current;
        var isCircle = GestureRecognition.isCircleGesture(points);

        var tier = isCircle ? scoreTier(prog, difficulty) : "miss";
        recordResult(ci, tier, "circle", "circle");
    }, [difficulty]);

    // ============================================================
    // Input Handlers — check-type-aware
    // ============================================================

    var handleTouchStart = useCallback(function(e) {
        e.preventDefault();
        var ci = currentCheckRef.current;
        var ct = getCheckType(beats, ci);
        var touch = e.touches[0];
        var pt = { x: touch.clientX, y: touch.clientY };

        if (ct === "ring") {
            resolveRingTap();
        } else if (ct === "swipe" || ct === "circle") {
            touchStartRef.current = pt;
            touchPointsRef.current = [pt];
        }
    }, [beats, resolveRingTap]);

    var handleTouchMove = useCallback(function(e) {
        var ci = currentCheckRef.current;
        var ct = getCheckType(beats, ci);
        if (ct !== "swipe" && ct !== "circle") return;
        if (e.touches.length > 0) {
            var t = e.touches[0];
            touchPointsRef.current.push({ x: t.clientX, y: t.clientY });
        }
    }, [beats]);

    var handleTouchEnd = useCallback(function(e) {
        var ci = currentCheckRef.current;
        var ct = getCheckType(beats, ci);
        if (ct === "swipe") {
            var t = e.changedTouches[0];
            resolveSwipeRelease({ x: t.clientX, y: t.clientY });
            touchStartRef.current = null;
            touchPointsRef.current = [];
        } else if (ct === "circle") {
            resolveCircleRelease();
            touchStartRef.current = null;
            touchPointsRef.current = [];
        }
    }, [beats, resolveSwipeRelease, resolveCircleRelease]);

    var handleMouseDown = useCallback(function(e) {
        var ci = currentCheckRef.current;
        var ct = getCheckType(beats, ci);
        var pt = { x: e.clientX, y: e.clientY };
        if (ct === "ring") {
            resolveRingTap();
        } else if (ct === "swipe" || ct === "circle") {
            mouseDownRef.current = true;
            touchStartRef.current = pt;
            touchPointsRef.current = [pt];
        }
    }, [beats, resolveRingTap]);

    var handleMouseMove = useCallback(function(e) {
        if (!mouseDownRef.current) return;
        touchPointsRef.current.push({ x: e.clientX, y: e.clientY });
    }, []);

    var handleMouseUp = useCallback(function(e) {
        if (!mouseDownRef.current) return;
        mouseDownRef.current = false;
        var ci = currentCheckRef.current;
        var ct = getCheckType(beats, ci);
        if (ct === "swipe") {
            resolveSwipeRelease({ x: e.clientX, y: e.clientY });
            touchStartRef.current = null;
            touchPointsRef.current = [];
        } else if (ct === "circle") {
            resolveCircleRelease();
            touchStartRef.current = null;
            touchPointsRef.current = [];
        }
    }, [beats, resolveSwipeRelease, resolveCircleRelease]);

    // ============================================================
    // RENDER
    // ============================================================

    var svgSize = (config.ringStartRadius + 20) * 2;
    var center = svgSize / 2;
    var radiusRange = config.ringStartRadius - config.targetRadius;
    var goodZoneOuterR = config.targetRadius + radiusRange * difficulty.hitZone;
    var perfectZoneOuterR = config.targetRadius + radiusRange * difficulty.perfectZone;

    var activeCheckType = getCheckType(beats, currentCheck);
    var activeProgress = -1;
    var indicatorInGoodZone = false;
    var indicatorInPerfectZone = false;

    if (phase === "playing" && currentCheck < checkSequence.length) {
        var aco = checkSequence[currentCheck];
        activeProgress = getCheckProgress(aco, elapsed);
        if (activeProgress >= 0) {
            if (activeCheckType === "ring") {
                var ar = getCheckRadius(aco, activeProgress, config);
                indicatorInGoodZone = ar <= goodZoneOuterR;
                indicatorInPerfectZone = ar <= perfectZoneOuterR;
            } else {
                indicatorInGoodZone = activeProgress >= (1.0 - difficulty.hitZone);
                indicatorInPerfectZone = activeProgress >= (1.0 - difficulty.perfectZone);
            }
        }
    }

    // --- Build check visuals ---
    var checkVisuals = [];

    for (var i = 0; i < checkSequence.length; i++) {
        var chk = checkSequence[i];
        var ct = getCheckType(beats, i);
        var prog = phase === "playing" ? getCheckProgress(chk, elapsed) : -1;

        if (ct === "ring") {
            // === RING VISUAL ===
            var rad = getCheckRadius(chk, prog, config);
            var rs = "waiting";
            var op = 1;

            if (chk.result === "perfect") {
                rs = "perfect"; rad = config.targetRadius;
                op = Math.max(0, 1 - (elapsed - chk.delayMs - chk.durationMs) / 400);
            } else if (chk.result === "good") {
                rs = "good"; rad = config.targetRadius;
                op = Math.max(0, 1 - (elapsed - chk.delayMs - chk.durationMs) / 400);
            } else if (chk.result === "miss") {
                rs = "miss";
                op = Math.max(0, 1 - (elapsed - chk.delayMs - chk.durationMs) / 400);
            } else if (i === currentCheck && prog >= 0) {
                var tac = scoreTier(prog, difficulty);
                rs = tac === "perfect" ? "in_perfect" : tac === "good" ? "in_good" : "active";
            } else if (i > currentCheck && prog < 0) {
                op = 0.3;
            }

            if (op > 0.01) {
                var stk = COLOR_ACTIVE, sw = RING_STROKE, da = "none";
                if (rs === "in_perfect") { stk = COLOR_PERFECT; sw = 4; }
                else if (rs === "in_good") { stk = COLOR_GOOD; sw = 3.5; }
                else if (rs === "perfect") { stk = COLOR_PERFECT; sw = 4; }
                else if (rs === "good") { stk = COLOR_GOOD; sw = 4; }
                else if (rs === "miss") { stk = COLOR_MISS; sw = 2; da = "8 6"; }
                else if (rs === "waiting") { stk = "rgba(255,255,255,0.15)"; sw = 1; }

                checkVisuals.push(
                    <circle key={"ring-" + i} cx={center} cy={center} r={rad}
                            fill="none" stroke={stk} strokeWidth={sw}
                            strokeDasharray={da} opacity={op} />
                );
            }

        } else if (ct === "swipe") {
            // === SWIPE VISUAL ===
            var sDir = getSwipeDir(beats, i);
            var vec = SWIPE_VECTORS[sDir] || SWIPE_VECTORS["right"];
            var pathLen = svgSize * SWIPE_PATH_FRACTION;
            var half = pathLen / 2;
            var sx = center - vec.x * half;
            var sy = center - vec.y * half;
            var ex = center + vec.x * half;
            var ey = center + vec.y * half;
            var perpX = -vec.y;
            var perpY = vec.x;

            var ss = "waiting";
            var sOp = 1;

            if (chk.result !== null) {
                ss = chk.result;
                sOp = Math.max(0, 1 - (elapsed - chk.delayMs - chk.durationMs) / 400);
            } else if (i === currentCheck && prog >= 0) {
                ss = "active";
            } else if (i > currentCheck) {
                sOp = 0.3;
            }

            if (sOp > 0.01) {
                // Ghost path
                checkVisuals.push(
                    <line key={"sp-" + i} x1={sx} y1={sy} x2={ex} y2={ey}
                          stroke={COLOR_SWIPE_PATH} strokeWidth={2}
                          strokeDasharray="6 4" opacity={sOp} />
                );

                // Direction arrow at endpoint
                var asz = 8;
                var aColor = COLOR_SWIPE_ARROW;
                if (ss === "perfect") aColor = COLOR_PERFECT;
                else if (ss === "good") aColor = COLOR_GOOD;
                else if (ss === "miss") aColor = COLOR_MISS;

                checkVisuals.push(
                    <polygon key={"sa-" + i}
                             points={
                                 ex + "," + ey + " " +
                                 (ex - vec.x * asz + perpX * asz * 0.5) + "," + (ey - vec.y * asz + perpY * asz * 0.5) + " " +
                                 (ex - vec.x * asz - perpX * asz * 0.5) + "," + (ey - vec.y * asz - perpY * asz * 0.5)
                             }
                             fill={aColor} opacity={sOp} />
                );

                // Zone markers (perpendicular ticks along path)
                if (ss === "active" || ss === "waiting") {
                    var gFrac = difficulty.hitZone;
                    var pFrac = difficulty.perfectZone;
                    var zbHalf = 10;

                    // Good zone tick
                    var gPos = 1.0 - gFrac;
                    var gx = sx + (ex - sx) * gPos;
                    var gy = sy + (ey - sy) * gPos;
                    checkVisuals.push(
                        <line key={"sgz-" + i}
                              x1={gx + perpX * zbHalf} y1={gy + perpY * zbHalf}
                              x2={gx - perpX * zbHalf} y2={gy - perpY * zbHalf}
                              stroke={COLOR_GOOD} strokeWidth={2} opacity={sOp * 0.4} />
                    );

                    // Perfect zone tick
                    var pPos = 1.0 - pFrac;
                    var px = sx + (ex - sx) * pPos;
                    var py = sy + (ey - sy) * pPos;
                    checkVisuals.push(
                        <line key={"spz-" + i}
                              x1={px + perpX * zbHalf} y1={py + perpY * zbHalf}
                              x2={px - perpX * zbHalf} y2={py - perpY * zbHalf}
                              stroke={COLOR_PERFECT} strokeWidth={2} opacity={sOp * 0.5} />
                    );
                }

                // Particle head + trail (active only)
                if (ss === "active" && prog >= 0 && prog <= 1) {
                    var ptX = sx + (ex - sx) * prog;
                    var ptY = sy + (ey - sy) * prog;
                    var tierNow = scoreTier(prog, difficulty);

                    var trailC = COLOR_PARTICLE_TRAIL;
                    if (tierNow === "perfect") trailC = COLOR_GLOW_PERF;
                    else if (tierNow === "good") trailC = COLOR_GLOW_GOOD;

                    // Trail line
                    checkVisuals.push(
                        <line key={"st-" + i} x1={sx} y1={sy} x2={ptX} y2={ptY}
                              stroke={trailC} strokeWidth={4}
                              strokeLinecap="round" opacity={0.6} />
                    );

                    // Particle dot
                    var ptC = COLOR_ACTIVE;
                    var ptR = 6;
                    if (tierNow === "perfect") { ptC = COLOR_PERFECT; ptR = 9; }
                    else if (tierNow === "good") { ptC = COLOR_GOOD; ptR = 8; }

                    checkVisuals.push(
                        <circle key={"sd-" + i} cx={ptX} cy={ptY} r={ptR}
                                fill={ptC} opacity={0.9} />
                    );
                    // Glow halo
                    checkVisuals.push(
                        <circle key={"sg-" + i} cx={ptX} cy={ptY} r={ptR + 6}
                                fill="none" stroke={ptC} strokeWidth={2} opacity={0.3} />
                    );
                }

                // Result flash line (hit swipe)
                if (ss === "perfect" || ss === "good") {
                    var rc = ss === "perfect" ? COLOR_PERFECT : COLOR_GOOD;
                    checkVisuals.push(
                        <line key={"sr-" + i} x1={sx} y1={sy} x2={ex} y2={ey}
                              stroke={rc} strokeWidth={4}
                              strokeLinecap="round" opacity={sOp * 0.7} />
                    );
                }
            }
            // === CIRCLE VISUAL ===
        } else if (ct === "circle") {
            var cRadius = config.targetRadius * 1.8;  // orbit path radius
            var cs = "waiting";
            var cOp = 1;

            if (chk.result !== null) {
                cs = chk.result;
                cOp = Math.max(0, 1 - (elapsed - chk.delayMs - chk.durationMs) / 400);
            } else if (i === currentCheck && prog >= 0) {
                cs = "active";
            } else if (i > currentCheck) {
                cOp = 0.3;
            }

            if (cOp > 0.01) {
                // Orbit path outline (subtle dashed guide)
                var cpathColor = "rgba(255,255,255,0.08)";
                if (cs === "perfect") cpathColor = COLOR_PERFECT;
                else if (cs === "good") cpathColor = COLOR_GOOD;
                else if (cs === "miss") cpathColor = COLOR_MISS;

                checkVisuals.push(
                    <circle key={"co-" + i} cx={center} cy={center} r={cRadius}
                            fill="none" stroke={cpathColor}
                            strokeWidth={cs === "active" || cs === "waiting" ? 1.5 : 3}
                            strokeDasharray={cs === "active" || cs === "waiting" ? "4 6" : "none"}
                            opacity={cOp} />
                );

                // Zone arcs + completion point (active/waiting only)
                if (cs === "active" || cs === "waiting") {
                    var cgFrac = difficulty.hitZone;
                    var cpFrac = difficulty.perfectZone;
                    var gStartDeg = (1.0 - cgFrac) * 360 - 90;
                    var pStartDeg = (1.0 - cpFrac) * 360 - 90;
                    var endDeg = 270; // 12 o'clock = -90 = 270 in our arc helper

                    // Good zone arc
                    checkVisuals.push(
                        <path key={"cgz-" + i}
                              d={describeArc(center, center, cRadius, gStartDeg, endDeg)}
                              fill="none" stroke={COLOR_GOOD} strokeWidth={3}
                              opacity={cOp * 0.3} />
                    );

                    // Perfect zone arc
                    checkVisuals.push(
                        <path key={"cpz-" + i}
                              d={describeArc(center, center, cRadius, pStartDeg, endDeg)}
                              fill="none" stroke={COLOR_PERFECT} strokeWidth={3}
                              opacity={cOp * 0.4} />
                    );

                    // Completion point dot (12 o'clock)
                    var compX = center;
                    var compY = center - cRadius;
                    checkVisuals.push(
                        <circle key={"ccp-" + i} cx={compX} cy={compY} r={4}
                                fill={COLOR_TARGET} opacity={cOp * 0.6} />
                    );
                }

                // Orbiting particle head (active only)
                if (cs === "active" && prog >= 0 && prog <= 1) {
                    var cAngle = -Math.PI / 2 + prog * Math.PI * 2;
                    var cpX = center + cRadius * Math.cos(cAngle);
                    var cpY = center + cRadius * Math.sin(cAngle);
                    var cTierNow = scoreTier(prog, difficulty);

                    // Trail arc from start to current
                    var trailStart = -90;
                    var trailEnd = -90 + prog * 360;
                    var cTrailC = COLOR_PARTICLE_TRAIL;
                    if (cTierNow === "perfect") cTrailC = COLOR_GLOW_PERF;
                    else if (cTierNow === "good") cTrailC = COLOR_GLOW_GOOD;

                    if (prog > 0.01) {
                        checkVisuals.push(
                            <path key={"ctr-" + i}
                                  d={describeArc(center, center, cRadius, trailStart, trailEnd)}
                                  fill="none" stroke={cTrailC} strokeWidth={4}
                                  strokeLinecap="round" opacity={0.5} />
                        );
                    }

                    // Particle dot
                    var cPtC = COLOR_ACTIVE;
                    var cPtR = 7;
                    if (cTierNow === "perfect") { cPtC = COLOR_PERFECT; cPtR = 10; }
                    else if (cTierNow === "good") { cPtC = COLOR_GOOD; cPtR = 9; }

                    checkVisuals.push(
                        <circle key={"cd-" + i} cx={cpX} cy={cpY} r={cPtR}
                                fill={cPtC} opacity={0.9} />
                    );
                    // Glow halo
                    checkVisuals.push(
                        <circle key={"cgh-" + i} cx={cpX} cy={cpY} r={cPtR + 7}
                                fill="none" stroke={cPtC} strokeWidth={2} opacity={0.25} />
                    );
                }

                // Result: full orbit ring flash
                if (cs === "perfect" || cs === "good") {
                    var crc = cs === "perfect" ? COLOR_PERFECT : COLOR_GOOD;
                    checkVisuals.push(
                        <circle key={"crf-" + i} cx={center} cy={center} r={cRadius}
                                fill="none" stroke={crc} strokeWidth={4}
                                opacity={cOp * 0.6} />
                    );
                }
            }
        }
    }

// --- Ring zone bands (only when current check is ring type) ---
    var ringZoneBands = null;
    if (activeCheckType === "ring") {
        var gbOp = indicatorInGoodZone ? (indicatorInPerfectZone ? 0.08 : 0.25) : 0.12;
        var pbOp = indicatorInPerfectZone ? 0.40 : 0.18;
        ringZoneBands = (
            <>
                <circle cx={center} cy={center}
                        r={(config.targetRadius + goodZoneOuterR) / 2}
                        fill="none"
                        stroke={indicatorInGoodZone ? COLOR_GLOW_GOOD : COLOR_ZONE_GOOD}
                        strokeWidth={goodZoneOuterR - config.targetRadius}
                        opacity={gbOp}
                        style={{ transition: "opacity 120ms, stroke 120ms" }} />
                <circle cx={center} cy={center}
                        r={(config.targetRadius + perfectZoneOuterR) / 2}
                        fill="none"
                        stroke={indicatorInPerfectZone ? COLOR_GLOW_PERF : COLOR_ZONE_PERF}
                        strokeWidth={perfectZoneOuterR - config.targetRadius}
                        opacity={pbOp}
                        style={{ transition: "opacity 120ms, stroke 120ms" }} />
                <circle cx={center} cy={center}
                        r={config.targetRadius} fill="none"
                        stroke={COLOR_TARGET} strokeWidth={TARGET_STROKE} />
            </>
        );
    }

// --- Result pips ---
    var pips = [];
    for (var p = 0; p < config.rings; p++) {
        var r = results[p];
        var pc = "rgba(255,255,255,0.2)";
        if (r !== null) {
            if (r.tier === "perfect") pc = COLOR_PERFECT;
            else if (r.tier === "good") pc = COLOR_GOOD;
            else pc = COLOR_MISS;
        }
        pips.push(
            <div key={p} style={{
                width: 10, height: 10, borderRadius: "50%", background: pc,
                transition: "all 200ms",
                transform: r !== null ? "scale(1.3)" : "scale(1)",
            }} />
        );
    }

// --- Flash text ---
    var flashEl = null;
    if (flash) {
        var fc = flash.tier === "perfect" ? COLOR_PERFECT
            : flash.tier === "good" ? COLOR_GOOD : COLOR_MISS;
        flashEl = (
            <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "clamp(18px, 4vw, 28px)", fontWeight: 700,
                fontFamily: "monospace", color: fc,
                textShadow: "0 0 20px " + fc + ", 0 2px 8px rgba(0,0,0,0.5)",
                pointerEvents: "none", zIndex: 10,
            }}>
                {flash.text}
            </div>
        );
    }

// --- Summary ---
    var done = phase === "done";
    var perfects = 0, goods = 0;
    for (var s = 0; s < results.length; s++) {
        if (results[s] !== null) {
            if (results[s].tier === "perfect") perfects++;
            else if (results[s].tier === "good") goods++;
        }
    }
    var totalHits = perfects + goods;
    var ratio = done ? (totalHits / config.rings) : 0;
    var summaryLabel = "";
    if (done) {
        if (perfects === config.rings) summaryLabel = "FLAWLESS!";
        else if (ratio >= 0.8) summaryLabel = "EXCELLENT!";
        else if (ratio >= 0.5) summaryLabel = "DECENT";
        else summaryLabel = "POOR";
    }

    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 12, userSelect: "none", WebkitUserSelect: "none",
            touchAction: "manipulation",
        }}>
            <div style={{
                fontFamily: "monospace", fontSize: "clamp(14px, 3vw, 20px)",
                fontWeight: 700, letterSpacing: 3,
                color: done
                    ? (ratio >= 0.8 ? COLOR_GOOD : ratio >= 0.5 ? COLOR_PERFECT : COLOR_MISS)
                    : "rgba(255,255,255,0.7)",
                transition: "color 300ms",
            }}>
                {done ? summaryLabel : (config.label || "TAP!")}
            </div>

            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{
                    position: "relative", width: svgSize, height: svgSize,
                    maxWidth: "80vw", maxHeight: "80vw",
                    cursor: "pointer", touchAction: "none",
                }}
            >
                <svg width="100%" height="100%"
                     viewBox={"0 0 " + svgSize + " " + svgSize}
                     style={{ display: "block" }}>
                    {ringZoneBands}
                    {checkVisuals}
                </svg>
                {flashEl}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {pips}
            </div>

            {done && (
                <div style={{
                    fontFamily: "monospace", fontSize: 14,
                    color: "rgba(255,255,255,0.5)", textAlign: "center",
                }}>
                    {perfects > 0 && (perfects + " perfect" + (perfects > 1 ? "s" : ""))}
                    {perfects > 0 && goods > 0 && " · "}
                    {goods > 0 && (goods + " good")}
                    {totalHits === 0 && "no hits"}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var ChalkboardModule = {
    Chalkboard:           Chalkboard,
    createCheckSequence:  createCheckSequence,
    getCheckProgress:     getCheckProgress,
    getCheckRadius:       getCheckRadius,
    scoreTier:            scoreTier,
    resolveDifficulty:    resolveDifficulty,
};

export default ChalkboardModule;