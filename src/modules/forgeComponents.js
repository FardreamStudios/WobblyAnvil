// ============================================================
// forgeComponents.js — Wobbly Anvil Forge Components Module
// QTE visual bars using sprite-div rendering.
// Loads two tiny PNGs (empty + full), CSS hue-rotates full
// sprite into 6 color variants. 30 divs per bar, each showing
// either full (colored) or empty sprite. CSS scales 4x with
// image-rendering: pixelated.
// Handles needle animation, phase rendering, strike display.
// ============================================================

import { useState, useEffect, useRef } from "react";
import GameConstants from "./constants.js";
import GameUtils from "./utilities.js";

var QTE_COLS = GameConstants.QTE_COLS;
var QTE_W = GameConstants.QTE_W;
var HAMMER_WIN = GameConstants.HAMMER_WIN;
var QUENCH_WIN = GameConstants.QUENCH_WIN;
var PHASES = GameConstants.PHASES;
var BALANCE = GameConstants.BALANCE;
var positionToColumn = GameUtils.positionToColumn;

// --- QTE Speed Constants (sourced from BALANCE in constants.js) ---
var HEAT_SPEED_BASE = BALANCE.heatSpeedBase;
var HEAT_SPEED_RANGE = BALANCE.heatSpeedRange;
var HEAT_ACCEL_EXP = BALANCE.heatAccelExponent;
var HAMMER_SPEED_BASE = BALANCE.hammerSpeedBase;
var HAMMER_SPEED_RANGE = BALANCE.hammerSpeedRange;
var QUENCH_SPEED_BASE = BALANCE.quenchSpeedBase;
var QUENCH_SPEED_RANGE = BALANCE.quenchSpeedRange;

// --- Sprite Paths ---
var PUB = process.env.PUBLIC_URL || "";
var SPRITE_EMPTY = PUB + "/images/ui/waPixelBarTinyEmpty.png";
var SPRITE_FULL = PUB + "/images/ui/waPixelBarTinyFull.png";

// --- Sprite Bar Constants ---
var BAR_COLS = 30;
var BAR_MAX_W = 480;  // fits inside QTE_W
var BAR_HEIGHT = 52;  // matches old bar height
var HEIGHT_EXPONENT = 2.4;  // power curve for column heights

// --- Hue Rotation Map ---
// Base sprite is green (#4ade80-ish). These CSS hue-rotate values
// shift it into each target color. Tuned by eye for pixel art.
// Pre-built CSS filter strings per color variant.
// hue-rotate alone can't hit true red from a green source — red uses
// sepia + saturate + hue-rotate chain to force it.
var HUE_VARIANTS = {
    cyan:   { filter: "hue-rotate(60deg)" },
    green:  { filter: "hue-rotate(0deg)" },
    lime:   { filter: "hue-rotate(-30deg)" },
    yellow: { filter: "hue-rotate(-60deg)" },
    orange: { filter: "hue-rotate(-80deg) saturate(1.5)" },
    red:    { filter: "hue-rotate(-105deg) saturate(1.5)" },
};

// --- Color Picker: aligned to scoring zones ---
// Colors reflect actual game scoring. The sweet zone (sweetLow–sweetHigh)
// defines the "GOOD" zone. Within that, colors grade from cyan (perfect)
// outward. Outside it, colors continue to orange/red (miss territory).
// This matches the proportions in HAMMER_TIERS.percentOfHalf:
//   PERFECT = 15% of half-zone, GREAT = 45%, GOOD = 100%, MISS = beyond

function pickBarColor(index, sweetLow, sweetHigh, totalCols, peakCol) {
    var peak = peakCol !== undefined ? peakCol : (totalCols - 1) / 2;
    var halfZone = Math.max((sweetHigh - sweetLow) / 2, 1);
    var dist = Math.abs(index - peak);

    // Distance as ratio of the sweet zone half-width
    var ratio = dist / halfZone;

    // Match HAMMER_TIERS percentOfHalf thresholds
    if (ratio <= 0.15) return "cyan";      // PERFECT zone
    if (ratio <= 0.45) return "green";     // GREAT zone
    if (ratio <= 1.0)  return "lime";      // GOOD zone (within sweet)
    if (ratio <= 1.6)  return "yellow";    // near miss
    if (ratio <= 2.4)  return "orange";    // far miss
    return "red";                           // way off
}

// --- Height Curve: power curve peaking at given peak column ---

function colHeight(index, totalCols, peakCol) {
    var peak = peakCol !== undefined ? peakCol : (totalCols - 1) / 2;
    var maxDist = Math.max(peak, totalCols - 1 - peak) || 1;
    var dist = Math.abs(index - peak) / maxDist; // 0 at peak, 1 at far edge
    var t = 1 - dist; // 1 at peak, 0 at far edge
    var normalized = Math.pow(t, HEIGHT_EXPONENT);
    // Scale between 25% and 100% of bar height
    return Math.round(BAR_HEIGHT * (0.25 + 0.75 * normalized));
}

// --- Computed strip dimensions ---
var STRIP_W = BAR_COLS * 10 + (BAR_COLS - 1) * 3; // 30*10 + 29*3 = 387px

// --- SpriteBar Component ---
// Renders BAR_COLS sprite divs. During freeze: hit column stays full,
// all others swap to empty. After freeze clears, all light back up.

function SpriteBar({ pos, sweetLow, sweetHigh, frozen, hitCols, needleColor }) {
    var needleCol = positionToColumn(pos);
    // Map QTE_COLS range to BAR_COLS range
    var mappedNeedle = Math.round(needleCol / (QTE_COLS - 1) * (BAR_COLS - 1));
    var mappedSweetLow = Math.round(sweetLow / (QTE_COLS - 1) * (BAR_COLS - 1));
    var mappedSweetHigh = Math.round(sweetHigh / (QTE_COLS - 1) * (BAR_COLS - 1));
    var peakCol = Math.round((mappedSweetLow + mappedSweetHigh) / 2);

    var cols = [];
    for (var i = 0; i < BAR_COLS; i++) {
        var isNeedle = i === mappedNeedle;
        var isHit = hitCols && hitCols.has(i);
        var height = colHeight(i, BAR_COLS, peakCol);
        var colorKey = pickBarColor(i, mappedSweetLow, mappedSweetHigh, BAR_COLS, peakCol);
        var variant = HUE_VARIANTS[colorKey];

        // During freeze: hit column stays full, everything else goes empty
        // When not frozen: all columns show full
        var showEmpty = frozen && !isHit;
        var spriteUrl = showEmpty ? SPRITE_EMPTY : SPRITE_FULL;

        // Build filter string from variant
        var filter;
        if (isNeedle && !frozen) {
            filter = "brightness(3) saturate(0)";
        } else if (isNeedle && frozen) {
            filter = variant.filter + " brightness(1.4)";
        } else if (showEmpty) {
            filter = "brightness(0.5)";
        } else {
            filter = variant.filter;
        }

        cols.push(
            <div key={i} style={{
                width: 10,
                flexShrink: 0,
                height: height,
                backgroundImage: "url(" + spriteUrl + ")",
                backgroundSize: "100% " + height + "px",
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated",
                filter: filter,
                transition: frozen ? "filter 0.15s" : "none",
            }} />
        );
    }

    return (
        <div style={{
            userSelect: "none",
            display: "flex",
            gap: 3,
            alignItems: "flex-end",
            height: BAR_HEIGHT,
            width: STRIP_W,
            margin: "0 auto",
        }}>
            {cols}
        </div>
    );
}

// --- Pointer (positioned below the bar, aligned to column strip) ---

var SPRITE_POINTER = PUB + "/images/ui/waPixelPointer.png";

function DiamondMarker({ pos, frozen, hitCols }) {
    // Map position to a pixel offset within the column strip
    var colIndex;
    if (frozen && hitCols && hitCols.size > 0) {
        colIndex = hitCols.values().next().value;
    } else {
        colIndex = positionToColumn(pos) / (QTE_COLS - 1) * (BAR_COLS - 1);
    }
    // Each column center = index * (colWidth + gap) + colWidth/2
    var leftPx = colIndex * 13 + 5; // 13 = 10px col + 3px gap, 5 = half col width

    return (
        <div style={{
            position: "relative",
            width: STRIP_W,
            height: 16,
            margin: "0 auto",
        }}>
            <img
                src={SPRITE_POINTER}
                alt=""
                style={{
                    position: "absolute",
                    left: leftPx - 8,
                    top: 0,
                    width: 16,
                    height: 16,
                    imageRendering: "pixelated",
                    pointerEvents: "none",
                    transform: "scaleY(-1)",
                }}
            />
        </div>
    );
}

// --- QTE Panel (manages needle animation and renders the active QTE) ---

function QTEPanel({ phase, heatWinLo, heatWinHi, flash, strikesLeft, strikesTotal, heatSpeedMult, hammerSpeedMult, quenchSpeedMult, posRef, processingRef, onAutoFire }) {
    var [heatPos, setHeatPos] = useState(0);
    var [needlePos, setNeedlePos] = useState(50);
    var [quenchPos, setQuenchPos] = useState(50);
    var [hitCols, setHitCols] = useState(new Set());
    var heatNeedle = useRef({ pos: 0, speed: 12 });
    var hammerNeedle = useRef({ pos: 50, dir: 1, speed: 76 });
    var quenchNeedle = useRef({ pos: 50, dir: 1, speed: 52 });
    var animId = useRef(null);
    var lastFrameTime = useRef(0);

    // Reset hit columns on phase change
    useEffect(function() {
        setHitCols(new Set());
    }, [phase]);

    // Record hit column when flash fires, clear when flash ends
    useEffect(function() {
        if (flash) {
            var currentPos = posRef.current;
            var needleCol = positionToColumn(currentPos);
            var mappedCol = Math.round(needleCol / (QTE_COLS - 1) * (BAR_COLS - 1));
            setHitCols(new Set([mappedCol]));
        } else {
            setHitCols(new Set());
        }
    }, [flash]);

    // Heat needle animation — delta-time based
    useEffect(function() {
        if (phase !== PHASES.HEAT) return;
        processingRef.current = false;
        heatNeedle.current = { pos: 0, speed: (HEAT_SPEED_BASE + Math.random() * HEAT_SPEED_RANGE) * heatSpeedMult };
        setHeatPos(0); posRef.current = 0;
        lastFrameTime.current = 0;
        var done = false;
        var timer = setTimeout(function() {
            function loop(timestamp) {
                if (done) return;
                if (lastFrameTime.current === 0) lastFrameTime.current = timestamp;
                var dt = (timestamp - lastFrameTime.current) / 1000;
                lastFrameTime.current = timestamp;
                // Clamp delta to avoid huge jumps on tab refocus
                if (dt > 0.1) dt = 0.1;
                if (!processingRef.current) {
                    var n = heatNeedle.current;
                    n.pos = Math.min(100, n.pos + n.speed * Math.pow(1 + n.pos / 100, HEAT_ACCEL_EXP) * dt);
                    posRef.current = n.pos;
                    setHeatPos(n.pos);
                    if (n.pos >= 100) { done = true; onAutoFire(n.pos); return; }
                }
                animId.current = requestAnimationFrame(loop);
            }
            animId.current = requestAnimationFrame(loop);
        }, 800);
        return function() { done = true; cancelAnimationFrame(animId.current); clearTimeout(timer); };
    }, [phase]);

    // Hammer needle animation — delta-time based
    useEffect(function() {
        if (phase !== PHASES.HAMMER) return;
        processingRef.current = false;
        hammerNeedle.current = { pos: 50, dir: 1, speed: (HAMMER_SPEED_BASE + Math.random() * HAMMER_SPEED_RANGE) * hammerSpeedMult };
        setNeedlePos(50); posRef.current = 50;
        lastFrameTime.current = 0;
        var done = false;
        function loop(timestamp) {
            if (done) return;
            if (lastFrameTime.current === 0) lastFrameTime.current = timestamp;
            var dt = (timestamp - lastFrameTime.current) / 1000;
            lastFrameTime.current = timestamp;
            if (dt > 0.1) dt = 0.1;
            if (!processingRef.current) {
                var n = hammerNeedle.current;
                n.pos += n.dir * n.speed * dt;
                if (n.pos >= 100) { n.pos = 100 - (n.pos - 100); n.dir = -1; }
                else if (n.pos <= 0) { n.pos = -n.pos; n.dir = 1; }
                posRef.current = n.pos;
                setNeedlePos(n.pos);
            }
            animId.current = requestAnimationFrame(loop);
        }
        animId.current = requestAnimationFrame(loop);
        return function() { done = true; cancelAnimationFrame(animId.current); };
    }, [phase]);

    // Quench needle animation — delta-time based
    useEffect(function() {
        if (phase !== PHASES.QUENCH) return;
        processingRef.current = false;
        quenchNeedle.current = { pos: 50, dir: 1, speed: (QUENCH_SPEED_BASE + Math.random() * QUENCH_SPEED_RANGE) * quenchSpeedMult };
        setQuenchPos(50); posRef.current = 50;
        lastFrameTime.current = 0;
        var done = false;
        function loop(timestamp) {
            if (done) return;
            if (lastFrameTime.current === 0) lastFrameTime.current = timestamp;
            var dt = (timestamp - lastFrameTime.current) / 1000;
            lastFrameTime.current = timestamp;
            if (dt > 0.1) dt = 0.1;
            if (!processingRef.current) {
                var n = quenchNeedle.current;
                n.pos += n.dir * n.speed * dt;
                if (n.pos >= 100) { n.pos = 100 - (n.pos - 100); n.dir = -1; }
                else if (n.pos <= 0) { n.pos = -n.pos; n.dir = 1; }
                posRef.current = n.pos;
                setQuenchPos(n.pos);
            }
            animId.current = requestAnimationFrame(loop);
        }
        animId.current = requestAnimationFrame(loop);
        return function() { done = true; cancelAnimationFrame(animId.current); };
    }, [phase]);

    var isQTE = phase === PHASES.HEAT || phase === PHASES.HAMMER || phase === PHASES.QUENCH;
    if (!isQTE) return null;

    var frozen = !!flash;
    var defaultLabel = phase === PHASES.HEAT ? "CLICK TO PULL FROM FORGE" : phase === PHASES.HAMMER ? "CLICK TO STRIKE" : "CLICK TO QUENCH";
    var flashColor = !flash ? "#78614a"
        : (flash.indexOf("PERFECT") >= 0 || flash === "SUCCESS!" || flash.indexOf("GREAT") >= 0 || flash.indexOf("GOOD") >= 0 || flash.indexOf("SOLID") >= 0) ? "#4ade80"
            : (flash.indexOf("MISS") >= 0 || flash.indexOf("DESTROY") >= 0 || flash.indexOf("ROUGH") >= 0) ? "#f87171"
                : "#fbbf24";

    // Compute sweet zone columns for each phase
    var barPos, barSweetLow, barSweetHigh;
    if (phase === PHASES.HEAT) {
        barPos = heatPos;
        barSweetLow = positionToColumn(heatWinLo);
        barSweetHigh = positionToColumn(heatWinHi);
    } else if (phase === PHASES.HAMMER) {
        barPos = needlePos;
        barSweetLow = positionToColumn(50 - HAMMER_WIN);
        barSweetHigh = positionToColumn(50 + HAMMER_WIN);
    } else {
        barPos = quenchPos;
        barSweetLow = positionToColumn(50 - QUENCH_WIN);
        barSweetHigh = positionToColumn(50 + QUENCH_WIN);
    }

    return (
        <div style={{ width: "100%", maxWidth: QTE_W, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ height: 22, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {phase === PHASES.HAMMER ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 2, fontWeight: "bold", marginRight: 6 }}>STRIKES</span>
                        {Array.from({ length: strikesTotal || 3 }).map(function(_, i) {
                            var used = i >= strikesLeft;
                            return <div key={i} style={{ width: 16, height: 16, borderRadius: 3, background: used ? "#2a1f0a" : "#f59e0b", border: "2px solid " + (used ? "#3d2e0f" : "#f59e0b"), transition: "background 0.15s" }} />;
                        })}
                    </div>
                ) : (
                    <span style={{ fontSize: 12, letterSpacing: 2, fontWeight: "bold", color: phase === PHASES.QUENCH ? "#60a5fa" : "#f59e0b", whiteSpace: "nowrap" }}>
                        {phase === PHASES.HEAT ? "HEATING \u2014 HIT THE GREEN" : "QUENCHING \u2014 AIM FOR CENTER"}
                    </span>
                )}
            </div>
            <div style={{ height: 18, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 13, letterSpacing: 2, fontWeight: "bold", color: flashColor, whiteSpace: "nowrap" }}>{flash || defaultLabel}</span>
            </div>
            <div style={{ width: "100%", overflow: "hidden" }}>
                <SpriteBar
                    pos={barPos}
                    sweetLow={barSweetLow}
                    sweetHigh={barSweetHigh}
                    frozen={frozen}
                    hitCols={hitCols}
                />
                <DiamondMarker pos={barPos} frozen={frozen} hitCols={hitCols} />
            </div>
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var ForgeComponents = {
    SpriteBar: SpriteBar,
    QTEPanel: QTEPanel,
};

export default ForgeComponents;