// ============================================================
// SustainTapQTE.js — Rapid Tap QTE Plugin
//
// A sequence of timed tap prompts. Each prompt shows a shrinking
// ring — player taps before it closes. Hit/miss tracked per tap.
// If failEnds is true, first miss ends the sequence early.
//
// QTERunner plugin contract:
//   Props: config, onComplete
//   config: { type: "sustain_tap", count, intervalMs, failEnds }
//   onComplete([{ succeeded, total, hit }])
//
// Used by Starfall Beam (sustain phase) and any future skill
// that needs rapid input sustain.
// ============================================================

import { useState, useRef, useEffect } from "react";

// --- Defaults (overridden by config) ---
var SUSTAIN_DEFAULTS = {
    count:      5,
    intervalMs: 280,
    failEnds:   true,
    targetR:    22,     // inner target radius (SVG units)
    startR:     56,     // outer ring start radius
};

// --- Layout (SVG viewBox coordinates) ---
var CX = 150;
var CY = 90;
var DOT_Y = 155;
var DOT_R = 4;
var DOT_GAP = 14;

function SustainTapQTE(props) {
    var config     = props.config || {};
    var onComplete = props.onComplete;

    var count      = config.count      || SUSTAIN_DEFAULTS.count;
    var intervalMs = config.intervalMs  || SUSTAIN_DEFAULTS.intervalMs;
    var failEnds   = config.failEnds !== false;
    var targetR    = SUSTAIN_DEFAULTS.targetR;
    var startR     = SUSTAIN_DEFAULTS.startR;

    // --- State ---
    var [tapIndex, setTapIndex]     = useState(0);
    var [hits, setHits]             = useState(0);
    var [feedback, setFeedback]     = useState(null);  // "hit" | "miss" | null
    var [ringRadius, setRingRadius] = useState(startR);
    var [windowOpen, setWindowOpen] = useState(false);

    // --- Refs (for timer callbacks) ---
    var tapIndexRef     = useRef(0);
    var hitsRef         = useRef(0);
    var doneRef         = useRef(false);
    var rafRef          = useRef(null);
    var startTimeRef    = useRef(null);
    var windowTimerRef  = useRef(null);
    var feedbackTimerRef = useRef(null);

    // --- Mount: start first window ---
    useEffect(function() {
        openWindow();
        return function() {
            doneRef.current = true;
            cancelAnimationFrame(rafRef.current);
            clearTimeout(windowTimerRef.current);
            clearTimeout(feedbackTimerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ============================================================
    // WINDOW LIFECYCLE
    // ============================================================

    function openWindow() {
        if (doneRef.current) return;
        if (tapIndexRef.current >= count) {
            finish(true);
            return;
        }

        startTimeRef.current = performance.now();
        setWindowOpen(true);
        setFeedback(null);
        setRingRadius(startR);

        // Animate ring shrink via rAF
        function tick() {
            if (doneRef.current) return;
            var elapsed = performance.now() - startTimeRef.current;
            var progress = Math.min(elapsed / intervalMs, 1);
            var r = startR + (targetR - startR) * progress;
            setRingRadius(r);
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            }
        }
        rafRef.current = requestAnimationFrame(tick);

        // Miss if window expires
        windowTimerRef.current = setTimeout(function() {
            if (doneRef.current) return;
            onMiss();
        }, intervalMs);
    }

    function onMiss() {
        cancelAnimationFrame(rafRef.current);
        setWindowOpen(false);
        setFeedback("miss");

        if (failEnds) {
            feedbackTimerRef.current = setTimeout(function() {
                finish(false);
            }, 350);
        } else {
            tapIndexRef.current++;
            setTapIndex(tapIndexRef.current);
            feedbackTimerRef.current = setTimeout(function() {
                openWindow();
            }, 250);
        }
    }

    function onHit() {
        if (doneRef.current || !windowOpen) return;

        clearTimeout(windowTimerRef.current);
        cancelAnimationFrame(rafRef.current);

        hitsRef.current++;
        setHits(hitsRef.current);
        tapIndexRef.current++;
        setTapIndex(tapIndexRef.current);
        setWindowOpen(false);
        setFeedback("hit");

        if (tapIndexRef.current >= count) {
            feedbackTimerRef.current = setTimeout(function() {
                finish(true);
            }, 200);
        } else {
            feedbackTimerRef.current = setTimeout(function() {
                openWindow();
            }, 80);
        }
    }

    function finish(succeeded) {
        if (doneRef.current) return;
        doneRef.current = true;
        cancelAnimationFrame(rafRef.current);
        clearTimeout(windowTimerRef.current);
        clearTimeout(feedbackTimerRef.current);

        // Brief pause so final feedback is visible
        setTimeout(function() {
            if (onComplete) {
                onComplete([{
                    succeeded: succeeded,
                    total:     count,
                    hit:       hitsRef.current,
                    accuracy:  count > 0 ? hitsRef.current / count : 0,
                }]);
            }
        }, 200);
    }

    // --- Input handlers ---
    function handleTap() { onHit(); }
    function handleTouch(e) { e.preventDefault(); onHit(); }

    // ============================================================
    // RENDER
    // ============================================================

    // Ring color based on feedback
    var ringColor = feedback === "hit"  ? "#4ade80"
        : feedback === "miss" ? "#ef4444"
            : "#60a5fa";

    // Label text
    var label = windowOpen   ? "TAP!"
        : feedback === "hit"  ? "HIT!"
            : feedback === "miss" ? "MISS"
                : "";

    // Progress dots
    var dotsStartX = CX - ((count - 1) * DOT_GAP) / 2;
    var dots = [];
    for (var i = 0; i < count; i++) {
        var dotColor;
        if (i < hitsRef.current) {
            dotColor = "#4ade80";  // completed hit
        } else if (i < tapIndexRef.current) {
            dotColor = "#ef4444";  // completed miss
        } else {
            dotColor = "rgba(255,255,255,0.2)";  // pending
        }
        dots.push(
            <circle key={i}
                    cx={dotsStartX + i * DOT_GAP}
                    cy={DOT_Y}
                    r={DOT_R}
                    fill={dotColor}
            />
        );
    }

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 60,
                cursor: "pointer",
            }}
            onClick={handleTap}
            onTouchEnd={handleTouch}
        >
            <svg
                viewBox="0 0 300 180"
                style={{
                    width: "100%",
                    maxWidth: 280,
                    height: "auto",
                    pointerEvents: "none",
                    overflow: "visible",
                }}
            >
                <defs>
                    <filter id="sustain-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Target circle (static reference) */}
                <circle cx={CX} cy={CY} r={targetR}
                        fill="none"
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="2"
                />

                {/* Shrinking ring */}
                {windowOpen && (
                    <circle cx={CX} cy={CY} r={ringRadius}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="3"
                            opacity="0.9"
                            filter="url(#sustain-glow)"
                    />
                )}

                {/* Feedback flash ring (on hit/miss) */}
                {feedback && !windowOpen && (
                    <circle cx={CX} cy={CY} r={targetR + 4}
                            fill="none"
                            stroke={ringColor}
                            strokeWidth="4"
                            opacity="0.7"
                            filter="url(#sustain-glow)"
                    />
                )}

                {/* Center label */}
                <text x={CX} y={CY + 6}
                      textAnchor="middle"
                      fill={ringColor}
                      fontSize="18"
                      fontWeight="bold"
                      fontFamily="monospace"
                      style={{ userSelect: "none" }}
                >
                    {label}
                </text>

                {/* Progress dots */}
                {dots}

                {/* Counter */}
                <text x={CX} y={DOT_Y + 16}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.4)"
                      fontSize="11"
                      fontFamily="monospace"
                      style={{ userSelect: "none" }}
                >
                    {tapIndexRef.current + "/" + count}
                </text>
            </svg>
        </div>
    );
}

export default SustainTapQTE;