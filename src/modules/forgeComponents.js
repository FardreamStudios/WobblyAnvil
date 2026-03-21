// ============================================================
// forgeComponents.js — Wobbly Anvil Forge Components Module
// QTE visual bars and the QTE panel controller.
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
var HEAT_SPEED_BASE = 36;
var HEAT_SPEED_RANGE = 8;
var HAMMER_SPEED_BASE = 160;
var HAMMER_SPEED_RANGE = 40;
var QUENCH_SPEED_BASE = 120;
var QUENCH_SPEED_RANGE = 30;

// --- QTE Gradient Color Helper ---

function qteGradientColor(index, sweetLow, sweetHigh, totalCols) {
    if (index >= sweetLow && index <= sweetHigh) return "#4ade80";
    var distance = index < sweetLow ? sweetLow - index : index - sweetHigh;
    var maxDist = Math.max(sweetLow, totalCols - 1 - sweetHigh) || 1;
    var ratio = Math.min(1, distance / maxDist);
    if (ratio < 0.18) return "rgba(160,220,50,0.55)";
    if (ratio < 0.38) return "rgba(240,175,0,0.55)";
    if (ratio < 0.62) return "rgba(220,95,0,0.54)";
    return "rgba(185,35,35,0.5)";
}

// --- Heat Bar ---

function HeatBar({ pos, winLo, winHi, frozen }) {
    var cols = QTE_COLS;
    var needleCol = positionToColumn(pos);
    var sweetLow = positionToColumn(winLo);
    var sweetHigh = positionToColumn(winHi);
    var sweetPeak = Math.round((sweetLow + sweetHigh) / 2);
    var dangerStart = sweetHigh + 1;

    function cellBackground(i) {
        if (i >= dangerStart) return "rgba(" + (190 + Math.min(55, (i - dangerStart) * 8)) + "," + (Math.max(0, 35 - (i - dangerStart) * 4)) + ",30," + (0.5 + Math.min(0.4, (i - dangerStart) * 0.06)) + ")";
        if (i >= sweetLow) return i === sweetPeak ? "#88ffaa" : "#4ade80";
        var ratio = i / sweetLow;
        if (ratio < 0.3) return "rgba(130," + Math.round(ratio / 0.3 * 15) + ",0,0.5)";
        if (ratio < 0.58) return "rgba(200," + Math.round((ratio - 0.3) / 0.28 * 110) + ",0,0.55)";
        return "rgba(240," + Math.round(110 + (ratio - 0.58) / 0.42 * 145) + ",0,0.6)";
    }

    function cellHeight(i) {
        if (i >= dangerStart) return Math.max(10, 22 - Math.min(10, (i - dangerStart) * 2));
        if (i === sweetPeak) return 48;
        if (i >= sweetLow && i <= sweetHigh) return 36;
        return Math.max(10, Math.round(10 + 18 * (i / sweetLow)));
    }

    var cells = [];
    for (var i = 0; i < cols; i++) {
        var isNeedle = i === needleCol;
        var inSweet = i >= sweetLow && i <= sweetHigh;
        var inDanger = i >= dangerStart;
        cells.push(
            <div key={i} style={{
                flex: 1, minWidth: 0,
                height: isNeedle ? 52 : cellHeight(i),
                background: isNeedle ? (frozen ? "#fbbf24" : "#fff") : cellBackground(i),
                border: inSweet && !isNeedle ? "1px solid #4ade8099" : inDanger && !isNeedle ? "1px solid #ef444455" : "1px solid #1a1209",
            }} />
        );
    }
    return <div style={{ userSelect: "none", display: "flex", gap: "2px", alignItems: "flex-end", height: 52, width: "100%", overflow: "hidden" }}>{cells}</div>;
}

// --- Pixel Bar (Hammer / Quench) ---

function PixelBar({ pos, winHalf, frozen, lossZone }) {
    var cols = QTE_COLS;
    var needleCol = positionToColumn(pos);
    var sweetLow = positionToColumn(50 - winHalf);
    var sweetHigh = positionToColumn(50 + winHalf);
    var perfectLow = positionToColumn(50 - winHalf * 0.15);
    var perfectHigh = positionToColumn(50 + winHalf * 0.15);
    var greatLow = positionToColumn(50 - winHalf * 0.45);
    var greatHigh = positionToColumn(50 + winHalf * 0.45);
    var edgeLow = positionToColumn(50 - (winHalf + 1.2));
    var edgeHigh = positionToColumn(50 + (winHalf + 1.2));

    function cellHeight(i) {
        if (i >= perfectLow && i <= perfectHigh) return 52;
        if (i >= greatLow && i <= greatHigh) return 42;
        if (i >= sweetLow && i <= sweetHigh) return 32;
        var distance = i < sweetLow ? sweetLow - i : i - sweetHigh;
        var maxDist = Math.max(sweetLow, cols - 1 - sweetHigh) || 1;
        return Math.max(16, Math.round(28 * (1 - Math.min(1, distance / maxDist))));
    }

    var cells = [];
    for (var i = 0; i < cols; i++) {
        var isNeedle = i === needleCol;
        var inSweet = i >= sweetLow && i <= sweetHigh;
        var inLoss = lossZone && ((inSweet && (i < greatLow || i > greatHigh)) || (i >= edgeLow && i < sweetLow) || (i > sweetHigh && i <= edgeHigh));
        var inFail = lossZone && !inSweet && (i < edgeLow || i > edgeHigh);
        var bg = isNeedle ? (frozen ? "#fbbf24" : "#fff") : inLoss ? "#fb923c" : inFail ? "rgba(185,35,35,0.5)" : qteGradientColor(i, sweetLow, sweetHigh, cols);
        cells.push(
            <div key={i} style={{
                flex: 1, minWidth: 0,
                height: isNeedle ? 52 : cellHeight(i),
                background: bg,
                border: inSweet && !isNeedle ? "1px solid #4ade8077" : "1px solid #1a1209",
            }} />
        );
    }
    return <div style={{ userSelect: "none", display: "flex", gap: "2px", alignItems: "flex-end", height: 52, width: "100%", overflow: "hidden" }}>{cells}</div>;
}

// --- QTE Panel (manages needle animation and renders the active QTE) ---

function QTEPanel({ phase, heatWinLo, heatWinHi, flash, strikesLeft, strikesTotal, heatSpeedMult, hammerSpeedMult, quenchSpeedMult, posRef, processingRef, onAutoFire }) {
    var [heatPos, setHeatPos] = useState(0);
    var [needlePos, setNeedlePos] = useState(50);
    var [quenchPos, setQuenchPos] = useState(50);
    var heatNeedle = useRef({ pos: 0, speed: 12 });
    var hammerNeedle = useRef({ pos: 50, dir: 1, speed: 76 });
    var quenchNeedle = useRef({ pos: 50, dir: 1, speed: 52 });
    var animId = useRef(null);
    var lastFrameTime = useRef(0);

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
                {phase === PHASES.HEAT && <HeatBar pos={heatPos} winLo={heatWinLo} winHi={heatWinHi} frozen={frozen} />}
                {phase === PHASES.HAMMER && <PixelBar pos={needlePos} winHalf={HAMMER_WIN} frozen={frozen} />}
                {phase === PHASES.QUENCH && <PixelBar pos={quenchPos} winHalf={QUENCH_WIN} frozen={frozen} lossZone={true} />}
            </div>
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var ForgeComponents = {
    HeatBar: HeatBar,
    PixelBar: PixelBar,
    QTEPanel: QTEPanel,
};

export default ForgeComponents;