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
var positionToColumn = GameUtils.positionToColumn;

// --- QTE Speed Constants (tune these to adjust feel) ---
var HEAT_SPEED_BASE = 65;
var HEAT_SPEED_RANGE = 15;
var HAMMER_SPEED_BASE = 230;
var HAMMER_SPEED_RANGE = 50;
var QUENCH_SPEED_BASE = 190;
var QUENCH_SPEED_RANGE = 30;

// --- Sprite Paths ---
var PUB = process.env.PUBLIC_URL || "";
var SPRITE_EMPTY = PUB + "/images/ui/waPixelBarTinyEmpty.png";
var SPRITE_FULL = PUB + "/images/ui/waPixelBarTinyFull.png";

// --- Sprite Bar Constants ---
var BAR_COLS = 30;
var SPRITE_W = 10;   // native sprite width px
var SPRITE_H = 32;   // native sprite height px
var SCALE = 4;        // CSS upscale factor
var COL_DISPLAY_W = SPRITE_W * SCALE;  // 40px displayed
var COL_DISPLAY_H = SPRITE_H * SCALE;  // 128px displayed
var HEIGHT_EXPONENT = 2.4;  // power curve for column heights

// --- Hue Rotation Map ---
// Base sprite is green (#4ade80-ish). These CSS hue-rotate values
// shift it into each target color. Tuned by eye for pixel art.
var HUE_VARIANTS = {
    cyan:   { hue: -40,  label: "cyan" },
    green:  { hue: 0,    label: "green" },
    lime:   { hue: 30,   label: "lime" },
    yellow: { hue: 60,   label: "yellow" },
    orange: { hue: 90,   label: "orange" },
    red:    { hue: 140,  label: "red" },
};

// --- Color Picker: maps column position to a hue variant key ---

function pickBarColor(index, sweetLow, sweetHigh, totalCols) {
    if (index >= sweetLow && index <= sweetHigh) return "green";
    var distance = index < sweetLow ? sweetLow - index : index - sweetHigh;
    var maxDist = Math.max(sweetLow, totalCols - 1 - sweetHigh) || 1;
    var ratio = Math.min(1, distance / maxDist);
    if (ratio < 0.18) return "lime";
    if (ratio < 0.38) return "yellow";
    if (ratio < 0.62) return "orange";
    return "red";
}

// --- Height Curve: power curve peaking at center ---

function colHeight(index, totalCols) {
    var center = (totalCols - 1) / 2;
    var dist = Math.abs(index - center) / center; // 0 at center, 1 at edges
    var t = 1 - dist; // 1 at center, 0 at edges
    var normalized = Math.pow(t, HEIGHT_EXPONENT);
    // Scale between 30% and 100% of full display height
    return Math.round(COL_DISPLAY_H * (0.3 + 0.7 * normalized));
}

// --- SpriteBar Component ---
// Renders BAR_COLS sprite divs. Each column is either full (with hue filter)
// or empty. Needle column rendered as a bright white/gold overlay.
// hitCols = Set of column indices that have been "hit" (show empty sprite).

function SpriteBar({ pos, sweetLow, sweetHigh, frozen, hitCols, needleColor }) {
    var needleCol = positionToColumn(pos);
    // Map QTE_COLS range to BAR_COLS range
    var mappedNeedle = Math.round(needleCol / (QTE_COLS - 1) * (BAR_COLS - 1));
    var mappedSweetLow = Math.round(sweetLow / (QTE_COLS - 1) * (BAR_COLS - 1));
    var mappedSweetHigh = Math.round(sweetHigh / (QTE_COLS - 1) * (BAR_COLS - 1));

    var cols = [];
    for (var i = 0; i < BAR_COLS; i++) {
        var isNeedle = i === mappedNeedle;
        var isHit = hitCols && hitCols.has(i);
        var height = colHeight(i, BAR_COLS);
        var colorKey = pickBarColor(i, mappedSweetLow, mappedSweetHigh, BAR_COLS);
        var hueVal = HUE_VARIANTS[colorKey].hue;

        // Determine which sprite to show
        var showEmpty = isHit && !isNeedle;
        var spriteUrl = showEmpty ? SPRITE_EMPTY : SPRITE_FULL;

        // Needle styling
        var filter = isNeedle
            ? "brightness(3) saturate(0)"
            : showEmpty
                ? "brightness(0.5)"
                : "hue-rotate(" + hueVal + "deg)";

        if (isNeedle && frozen) {
            filter = "brightness(2) sepia(1) saturate(3) hue-rotate(10deg)";
        }

        cols.push(
            <div key={i} style={{
                width: COL_DISPLAY_W,
                height: height,
                backgroundImage: "url(" + spriteUrl + ")",
                backgroundSize: COL_DISPLAY_W + "px " + height + "px",
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated",
                filter: filter,
                transition: isHit ? "filter 0.15s" : "none",
                flexShrink: 0,
            }} />
        );
    }

    return (
        <div style={{
            userSelect: "none",
            display: "flex",
            gap: 1,
            alignItems: "flex-end",
            height: COL_DISPLAY_H,
            width: "100%",
            overflow: "hidden",
            justifyContent: "center",
        }}>
            {cols}
        </div>
    );
}

// --- Diamond Marker (positioned below the bar at needle location) ---

function DiamondMarker({ pos }) {
    var mappedPos = positionToColumn(pos) / (QTE_COLS - 1);
    var totalBarWidth = BAR_COLS * (COL_DISPLAY_W + 1) - 1; // cols * (width + gap) - last gap
    var leftPx = Math.round(mappedPos * totalBarWidth);

    return (
        <div style={{
            position: "relative",
            width: totalBarWidth,
            height: 12,
            margin: "0 auto",
        }}>
            <div style={{
                position: "absolute",
                left: leftPx - 6,
                top: 0,
                width: 0,
                height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderBottom: "10px solid #fbbf24",
                filter: "drop-shadow(0 0 4px #f59e0b88)",
                transition: "left 0.03s linear",
            }} />
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

    // Record hit column when flash fires (player clicked)
    useEffect(function() {
        if (!flash) return;
        var currentPos = posRef.current;
        var needleCol = positionToColumn(currentPos);
        var mappedCol = Math.round(needleCol / (QTE_COLS - 1) * (BAR_COLS - 1));
        setHitCols(function(prev) {
            var next = new Set(prev);
            next.add(mappedCol);
            return next;
        });
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
                    n.pos = Math.min(100, n.pos + n.speed * Math.pow(1 + n.pos / 100, 1.8) * dt);
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
                if (n.pos >= 100 || n.pos <= 0) n.dir *= -1;
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
                if (n.pos >= 100 || n.pos <= 0) n.dir *= -1;
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
                <DiamondMarker pos={barPos} />
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