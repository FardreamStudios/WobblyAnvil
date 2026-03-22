// ============================================================
// ParticleEditor.js — Dev Tool: Pixel Particle System Editor
// Access at localhost:3000/dev/particle-editor
//
// Phase 1: Core engine, single emitter, real-time preview
// Phase 2: Template system — save, load, delete, duplicate
// Phase 3: Multi-emitter scene — add/remove/select/drag
// Phase 4: Polish — burst mode, 3-color over lifetime,
//          size over lifetime, velocity damping
// Phase 5: Grid/handle toggles, system timeline with
//          duration, loop, per-emitter start time & loop
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================
// CONSTANTS
// ============================================
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 500;
var PANEL_WIDTH = 320;
var LIBRARY_WIDTH = 210;
var MAX_PARTICLES = 3000;
var EMITTER_HANDLE_SIZE = 14;
var GRID_SIZE = 20;
var GRID_COLOR = "rgba(255,255,255,0.04)";
var EMITTER_COLORS = ["#00ffaa", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a29bfe", "#fd79a8", "#00cec9", "#fab1a0"];
var DEFAULT_SYSTEM_DURATION = 2.0;
var TIMELINE_HEIGHT = 40;

// ============================================
// DEFAULT EMITTER CONFIG
// ============================================
var DEFAULT_CONFIG = {
    name: "untitled",
    size: { min: 2, max: 4 },
    sizeOverLifetime: { start: 1.0, end: 1.0 },
    speed: { min: 30, max: 80 },
    lifetime: { min: 0.4, max: 1.2 },
    colorStart: "#ff6600",
    colorMid: "#ff4400",
    colorEnd: "#ff2200",
    colorMidPoint: 0.5,
    fadeOut: true,
    gravity: -40,
    spread: 60,
    spawnRate: 15,
    direction: 270,
    shape: "square",
    damping: 0,
    burstMode: false,
    burstCount: 10,
};

// ============================================
// STARTER TEMPLATES
// ============================================
var STARTER_TEMPLATES = [
    {
        name: "campfire_sparks",
        size: { min: 1, max: 3 },
        sizeOverLifetime: { start: 1.0, end: 0.3 },
        speed: { min: 40, max: 100 },
        lifetime: { min: 0.3, max: 0.9 },
        colorStart: "#ffee88",
        colorMid: "#ffaa00",
        colorEnd: "#ff2200",
        colorMidPoint: 0.3,
        fadeOut: true,
        gravity: -60,
        spread: 30,
        spawnRate: 25,
        direction: 270,
        shape: "square",
        damping: 0.5,
        burstMode: false,
        burstCount: 10,
    },
    {
        name: "smoke_puff",
        size: { min: 3, max: 8 },
        sizeOverLifetime: { start: 0.5, end: 1.5 },
        speed: { min: 10, max: 30 },
        lifetime: { min: 1.0, max: 2.5 },
        colorStart: "#999999",
        colorMid: "#666666",
        colorEnd: "#333333",
        colorMidPoint: 0.5,
        fadeOut: true,
        gravity: -15,
        spread: 40,
        spawnRate: 8,
        direction: 270,
        shape: "circle",
        damping: 1.0,
        burstMode: false,
        burstCount: 10,
    },
    {
        name: "forge_embers",
        size: { min: 1, max: 2 },
        sizeOverLifetime: { start: 1.0, end: 0.0 },
        speed: { min: 60, max: 150 },
        lifetime: { min: 0.2, max: 0.6 },
        colorStart: "#ffffff",
        colorMid: "#ffaa00",
        colorEnd: "#ff4400",
        colorMidPoint: 0.4,
        fadeOut: true,
        gravity: -20,
        spread: 90,
        spawnRate: 40,
        direction: 270,
        shape: "square",
        damping: 0.3,
        burstMode: false,
        burstCount: 10,
    },
    {
        name: "anvil_strike",
        size: { min: 1, max: 3 },
        sizeOverLifetime: { start: 1.0, end: 0.2 },
        speed: { min: 80, max: 200 },
        lifetime: { min: 0.15, max: 0.5 },
        colorStart: "#ffffff",
        colorMid: "#ffdd44",
        colorEnd: "#ff6600",
        colorMidPoint: 0.25,
        fadeOut: true,
        gravity: 50,
        spread: 180,
        spawnRate: 0,
        direction: 270,
        shape: "square",
        damping: 2.0,
        burstMode: true,
        burstCount: 30,
    },
];

// ============================================
// PARAM DEFINITIONS TABLE
// ============================================
var PARAM_DEFS = [
    { key: "name", label: "Name", type: "text", group: "identity" },
    { key: "burstMode", label: "Burst Mode", type: "toggle", group: "emission" },
    { key: "burstCount", label: "Burst Count", type: "slider", min: 1, max: 200, step: 1, group: "emission", showIf: "burstMode" },
    { key: "spawnRate", label: "Spawn Rate", type: "slider", min: 0, max: 100, step: 1, group: "emission", hideIf: "burstMode" },
    { key: "size.min", label: "Size Min", type: "slider", min: 1, max: 20, step: 1, group: "size" },
    { key: "size.max", label: "Size Max", type: "slider", min: 1, max: 20, step: 1, group: "size" },
    { key: "sizeOverLifetime.start", label: "Size Start \u00D7", type: "slider", min: 0, max: 3, step: 0.1, group: "size" },
    { key: "sizeOverLifetime.end", label: "Size End \u00D7", type: "slider", min: 0, max: 3, step: 0.1, group: "size" },
    { key: "speed.min", label: "Speed Min", type: "slider", min: 0, max: 300, step: 5, group: "motion" },
    { key: "speed.max", label: "Speed Max", type: "slider", min: 0, max: 300, step: 5, group: "motion" },
    { key: "lifetime.min", label: "Life Min (s)", type: "slider", min: 0.1, max: 5, step: 0.1, group: "motion" },
    { key: "lifetime.max", label: "Life Max (s)", type: "slider", min: 0.1, max: 5, step: 0.1, group: "motion" },
    { key: "direction", label: "Direction (\u00B0)", type: "slider", min: 0, max: 360, step: 1, group: "motion" },
    { key: "spread", label: "Spread (\u00B0)", type: "slider", min: 0, max: 180, step: 1, group: "motion" },
    { key: "gravity", label: "Gravity", type: "slider", min: -200, max: 200, step: 5, group: "motion" },
    { key: "damping", label: "Damping", type: "slider", min: 0, max: 5, step: 0.1, group: "motion" },
    { key: "colorStart", label: "Color Start", type: "color", group: "appearance" },
    { key: "colorMid", label: "Color Mid", type: "color", group: "appearance" },
    { key: "colorEnd", label: "Color End", type: "color", group: "appearance" },
    { key: "colorMidPoint", label: "Mid Point", type: "slider", min: 0.05, max: 0.95, step: 0.05, group: "appearance" },
    { key: "fadeOut", label: "Fade Out", type: "toggle", group: "appearance" },
    { key: "shape", label: "Shape", type: "select", options: ["square", "circle"], group: "appearance" },
];

// ============================================
// HELPERS
// ============================================
function lerp(a, b, t) {
    return a + (b - a) * t;
}

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function degToRad(deg) {
    return (deg * Math.PI) / 180;
}

function hexToRgb(hex) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return { r: r, g: g, b: b };
}

function lerpColor(c1, c2, t) {
    return {
        r: Math.round(lerp(c1.r, c2.r, t)),
        g: Math.round(lerp(c1.g, c2.g, t)),
        b: Math.round(lerp(c1.b, c2.b, t)),
    };
}

function getColorAtLifetime(t, config) {
    var cStart = hexToRgb(config.colorStart);
    var cMid = hexToRgb(config.colorMid);
    var cEnd = hexToRgb(config.colorEnd);
    var mid = config.colorMidPoint;

    if (t <= mid) {
        var localT = mid > 0 ? t / mid : 0;
        return lerpColor(cStart, cMid, localT);
    } else {
        var localT2 = mid < 1 ? (t - mid) / (1 - mid) : 1;
        return lerpColor(cMid, cEnd, localT2);
    }
}

function getNestedValue(obj, path) {
    var parts = path.split(".");
    var val = obj;
    for (var i = 0; i < parts.length; i++) {
        val = val[parts[i]];
    }
    return val;
}

function setNestedValue(obj, path, value) {
    var parts = path.split(".");
    var clone = JSON.parse(JSON.stringify(obj));
    var target = clone;
    for (var i = 0; i < parts.length - 1; i++) {
        target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = value;
    return clone;
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

var nextEmitterId = 1;
function makeEmitterId() {
    return "emitter_" + (nextEmitterId++);
}

// ============================================
// PARTICLE ENGINE
// ============================================
function createParticle(emitterX, emitterY, config) {
    var dirRad = degToRad(config.direction);
    var spreadRad = degToRad(config.spread);
    var angle = dirRad + randRange(-spreadRad / 2, spreadRad / 2);
    var speed = randRange(config.speed.min, config.speed.max);
    var lifetime = randRange(config.lifetime.min, config.lifetime.max);
    var size = Math.round(randRange(config.size.min, config.size.max));

    return {
        x: emitterX,
        y: emitterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime: lifetime,
        maxLifetime: lifetime,
        baseSize: size,
        alive: true,
    };
}

function updateParticle(p, dt, config) {
    if (config.damping > 0) {
        var dampFactor = Math.max(0, 1 - config.damping * dt);
        p.vx *= dampFactor;
        p.vy *= dampFactor;
    }

    p.vy -= config.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.lifetime -= dt;
    if (p.lifetime <= 0) {
        p.alive = false;
    }
}

function drawParticle(ctx, p, config) {
    var t = 1 - p.lifetime / p.maxLifetime;
    var col = getColorAtLifetime(t, config);
    var alpha = config.fadeOut ? p.lifetime / p.maxLifetime : 1;
    var sizeScale = lerp(config.sizeOverLifetime.start, config.sizeOverLifetime.end, t);
    var size = Math.max(1, Math.round(p.baseSize * sizeScale));

    ctx.fillStyle = "rgba(" + col.r + "," + col.g + "," + col.b + "," + alpha.toFixed(2) + ")";

    if (config.shape === "circle") {
        ctx.beginPath();
        ctx.arc(Math.round(p.x), Math.round(p.y), size / 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        var half = Math.floor(size / 2);
        ctx.fillRect(Math.round(p.x) - half, Math.round(p.y) - half, size, size);
    }
}

function drawGrid(ctx, w, h) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (var x = 0; x < w; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
    }
    for (var y = 0; y < h; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
    }
}

function drawEmitterHandle(ctx, x, y, handleColor, selected, label) {
    var s = EMITTER_HANDLE_SIZE;

    if (selected) {
        ctx.shadowColor = handleColor;
        ctx.shadowBlur = 10;
    }

    ctx.strokeStyle = handleColor;
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(x - s / 2, y - s / 2, s, s);
    ctx.fillStyle = selected ? handleColor + "55" : handleColor + "22";
    ctx.fillRect(x - s / 2, y - s / 2, s, s);

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    ctx.strokeStyle = handleColor + (selected ? "cc" : "66");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.stroke();

    if (label) {
        ctx.font = "9px monospace";
        ctx.fillStyle = handleColor;
        ctx.textAlign = "center";
        ctx.fillText(label, x, y - s - 4);
    }
}

// ============================================
// STYLES
// ============================================
var styles = {
    container: {
        display: "flex",
        width: "100%",
        height: "100vh",
        background: "#0d0d0d",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        color: "#cccccc",
        fontSize: "12px",
        overflow: "hidden",
    },
    leftPanel: {
        width: LIBRARY_WIDTH,
        background: "#0a0a0a",
        borderRight: "1px solid #1a1a1a",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
    },
    libraryHeader: {
        padding: "12px 12px",
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "2px",
        color: "#f59e0b",
        borderBottom: "1px solid #1a1a1a",
        background: "#0d0d0d",
        position: "sticky",
        top: 0,
        zIndex: 2,
    },
    templateItem: {
        padding: "8px 12px",
        borderBottom: "1px solid #141414",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "background 0.1s",
    },
    templateName: {
        fontSize: "11px",
        letterSpacing: "0.5px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        flex: 1,
    },
    templateActions: {
        display: "flex",
        gap: 4,
        flexShrink: 0,
        marginLeft: 6,
    },
    templateBtn: {
        background: "none",
        border: "none",
        color: "#555",
        cursor: "pointer",
        fontSize: "11px",
        padding: "2px 4px",
        borderRadius: 3,
        lineHeight: 1,
    },
    addBtn: {
        margin: "8px 12px",
        padding: "8px",
        background: "#1a1a1a",
        color: "#00ffaa",
        border: "1px dashed #333",
        fontSize: "10px",
        fontFamily: "inherit",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "1px",
        cursor: "pointer",
        borderRadius: 4,
        textAlign: "center",
    },
    emitterItem: {
        padding: "6px 12px",
        borderBottom: "1px solid #141414",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        transition: "background 0.1s",
    },
    emitterDot: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        marginRight: 8,
        flexShrink: 0,
    },
    emitterLabel: {
        fontSize: "10px",
        letterSpacing: "0.5px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        flex: 1,
    },
    emitterPos: {
        fontSize: "9px",
        color: "#555",
        marginLeft: 4,
        flexShrink: 0,
    },
    canvasWrap: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "#0a0a0a",
    },
    canvas: {
        border: "1px solid #1a1a1a",
        cursor: "crosshair",
        imageRendering: "pixelated",
    },
    statusBar: {
        position: "absolute",
        bottom: 8,
        left: 8,
        color: "#555",
        fontSize: "10px",
        userSelect: "none",
    },
    posLabel: {
        color: "#555",
        fontSize: "10px",
        textAlign: "center",
        marginTop: 4,
    },
    panel: {
        width: PANEL_WIDTH,
        background: "#111111",
        borderLeft: "1px solid #1a1a1a",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
    },
    panelHeader: {
        padding: "12px 14px",
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "2px",
        color: "#00ffaa",
        borderBottom: "1px solid #1a1a1a",
        background: "#0d0d0d",
        position: "sticky",
        top: 0,
        zIndex: 2,
    },
    section: {
        padding: "10px 14px",
        borderBottom: "1px solid #1a1a1a",
    },
    sectionTitle: {
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "1.5px",
        color: "#666",
        marginBottom: 8,
    },
    paramRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
        gap: 8,
    },
    paramLabel: {
        color: "#888",
        fontSize: "11px",
        whiteSpace: "nowrap",
        minWidth: 90,
    },
    paramValue: {
        color: "#00ffaa",
        fontSize: "11px",
        fontWeight: 600,
        minWidth: 36,
        textAlign: "right",
    },
    slider: {
        flex: 1,
        height: 4,
        appearance: "none",
        WebkitAppearance: "none",
        background: "#222",
        borderRadius: 2,
        outline: "none",
        cursor: "pointer",
        accentColor: "#00ffaa",
    },
    textInput: {
        background: "#1a1a1a",
        border: "1px solid #333",
        color: "#fff",
        padding: "4px 8px",
        fontSize: "11px",
        fontFamily: "inherit",
        borderRadius: 3,
        flex: 1,
        outline: "none",
    },
    colorInput: {
        width: 32,
        height: 22,
        border: "1px solid #333",
        background: "none",
        cursor: "pointer",
        padding: 0,
        borderRadius: 3,
    },
    toggle: {
        width: 36,
        height: 18,
        borderRadius: 9,
        cursor: "pointer",
        border: "none",
        transition: "background 0.15s",
        position: "relative",
    },
    toggleKnob: {
        width: 14,
        height: 14,
        borderRadius: 7,
        background: "#fff",
        position: "absolute",
        top: 2,
        transition: "left 0.15s",
    },
    select: {
        background: "#1a1a1a",
        border: "1px solid #333",
        color: "#fff",
        padding: "4px 8px",
        fontSize: "11px",
        fontFamily: "inherit",
        borderRadius: 3,
        cursor: "pointer",
        outline: "none",
    },
    exportBtn: {
        width: "100%",
        padding: "10px",
        background: "#00ffaa",
        color: "#0d0d0d",
        border: "none",
        fontWeight: 700,
        fontSize: "11px",
        fontFamily: "inherit",
        textTransform: "uppercase",
        letterSpacing: "1.5px",
        cursor: "pointer",
        borderRadius: 3,
        marginTop: 4,
    },
    burstBtn: {
        width: "100%",
        padding: "10px",
        background: "#ff6b6b",
        color: "#fff",
        border: "none",
        fontWeight: 700,
        fontSize: "11px",
        fontFamily: "inherit",
        textTransform: "uppercase",
        letterSpacing: "1.5px",
        cursor: "pointer",
        borderRadius: 3,
        marginTop: 4,
    },
    resetBtn: {
        width: "100%",
        padding: "8px",
        background: "transparent",
        color: "#666",
        border: "1px solid #333",
        fontWeight: 600,
        fontSize: "10px",
        fontFamily: "inherit",
        textTransform: "uppercase",
        letterSpacing: "1px",
        cursor: "pointer",
        borderRadius: 3,
        marginTop: 4,
    },
    exportArea: {
        width: "100%",
        background: "#0a0a0a",
        border: "1px solid #333",
        color: "#00ffaa",
        fontFamily: "inherit",
        fontSize: "10px",
        padding: 8,
        borderRadius: 3,
        resize: "vertical",
        minHeight: 80,
        marginTop: 8,
        outline: "none",
        boxSizing: "border-box",
    },
    noSelection: {
        padding: "30px 14px",
        textAlign: "center",
        color: "#444",
        fontSize: "11px",
        letterSpacing: "1px",
    },
    templateSelect: {
        background: "#1a1a1a",
        border: "1px solid #333",
        color: "#fff",
        padding: "4px 8px",
        fontSize: "11px",
        fontFamily: "inherit",
        borderRadius: 3,
        cursor: "pointer",
        outline: "none",
        width: "100%",
    },
    colorGradientBar: {
        height: 12,
        borderRadius: 3,
        border: "1px solid #333",
        marginBottom: 8,
    },
    checkbox: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontSize: "11px",
        color: "#888",
        marginBottom: 4,
        userSelect: "none",
    },
    checkboxInput: {
        accentColor: "#00ffaa",
        width: 14,
        height: 14,
        cursor: "pointer",
    },
    timelineBar: {
        width: "100%",
        height: TIMELINE_HEIGHT,
        background: "#0a0a0a",
        border: "1px solid #1a1a1a",
        borderRadius: 4,
        position: "relative",
        overflow: "hidden",
        marginTop: 6,
        cursor: "pointer",
    },
    timelinePlayhead: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 2,
        background: "#00ffaa",
        zIndex: 3,
        pointerEvents: "none",
    },
    timelineEmitterMark: {
        position: "absolute",
        top: 2,
        height: TIMELINE_HEIGHT - 4,
        borderRadius: 2,
        opacity: 0.5,
        pointerEvents: "none",
    },
};

// ============================================
// COMPONENT
// ============================================
function ParticleEditor() {
    var canvasRef = useRef(null);
    var lastTimeRef = useRef(null);
    var animFrameRef = useRef(null);
    var draggingIdRef = useRef(null);

    var [templates, setTemplates] = useState(STARTER_TEMPLATES.map(deepClone));
    var [activeTemplateIndex, setActiveTemplateIndex] = useState(null);
    var [unsavedChanges, setUnsavedChanges] = useState(false);

    var [emitters, setEmitters] = useState([]);
    var [selectedEmitterId, setSelectedEmitterId] = useState(null);
    var emittersRef = useRef(emitters);

    var [particleCount, setParticleCount] = useState(0);
    var [paused, setPaused] = useState(false);
    var [showExport, setShowExport] = useState(false);
    var [exportJSON, setExportJSON] = useState("");
    var [showHelp, setShowHelp] = useState(false);

    // -- DISPLAY TOGGLES --
    var [showGrid, setShowGrid] = useState(true);
    var [showHandles, setShowHandles] = useState(true);

    // -- TIMELINE STATE --
    var [useTimeline, setUseTimeline] = useState(false);
    var [systemDuration, setSystemDuration] = useState(DEFAULT_SYSTEM_DURATION);
    var [systemLoop, setSystemLoop] = useState(true);
    var [systemTime, setSystemTime] = useState(0);
    var systemTimeRef = useRef(0);
    var prevSystemTimeRef = useRef(0);

    var pausedRef = useRef(paused);
    var selectedEmitterIdRef = useRef(selectedEmitterId);
    var useTimelineRef = useRef(useTimeline);
    var systemDurationRef = useRef(systemDuration);
    var systemLoopRef = useRef(systemLoop);
    var showGridRef = useRef(showGrid);
    var showHandlesRef = useRef(showHandles);

    useEffect(function() { emittersRef.current = emitters; }, [emitters]);
    useEffect(function() { pausedRef.current = paused; }, [paused]);
    useEffect(function() { selectedEmitterIdRef.current = selectedEmitterId; }, [selectedEmitterId]);
    useEffect(function() { useTimelineRef.current = useTimeline; }, [useTimeline]);
    useEffect(function() { systemDurationRef.current = systemDuration; }, [systemDuration]);
    useEffect(function() { systemLoopRef.current = systemLoop; }, [systemLoop]);
    useEffect(function() { showGridRef.current = showGrid; }, [showGrid]);
    useEffect(function() { showHandlesRef.current = showHandles; }, [showHandles]);

    var selectedEmitter = null;
    for (var i = 0; i < emitters.length; i++) {
        if (emitters[i].id === selectedEmitterId) {
            selectedEmitter = emitters[i];
            break;
        }
    }

    // ---- TEMPLATE ACTIONS ----

    function handleLoadTemplate(index) {
        setActiveTemplateIndex(index);
    }

    function handleSaveTemplate() {
        if (activeTemplateIndex === null || !selectedEmitter) return;
        var newTemplate = deepClone(selectedEmitter.config);
        setTemplates(function(prev) {
            var next = prev.map(deepClone);
            next[activeTemplateIndex] = newTemplate;
            return next;
        });
        setUnsavedChanges(false);
    }

    function handleSaveAsNewTemplate() {
        if (!selectedEmitter) return;
        var newTemplate = deepClone(selectedEmitter.config);
        newTemplate.name = newTemplate.name + "_copy";
        setTemplates(function(prev) {
            return prev.map(deepClone).concat([newTemplate]);
        });
    }

    function handleDuplicateTemplate(index) {
        var dupe = deepClone(templates[index]);
        dupe.name = dupe.name + "_copy";
        setTemplates(function(prev) {
            return prev.map(deepClone).concat([dupe]);
        });
    }

    function handleDeleteTemplate(index) {
        setTemplates(function(prev) {
            return prev.filter(function(_, i) { return i !== index; });
        });
        if (activeTemplateIndex === index) setActiveTemplateIndex(null);
        else if (activeTemplateIndex !== null && activeTemplateIndex > index) setActiveTemplateIndex(activeTemplateIndex - 1);
    }

    function handleNewTemplate() {
        var tpl = deepClone(DEFAULT_CONFIG);
        tpl.name = "new_template";
        setTemplates(function(prev) {
            return prev.map(deepClone).concat([tpl]);
        });
    }

    // ---- EMITTER ACTIONS ----

    function handleAddEmitter() {
        var tplIndex = activeTemplateIndex !== null ? activeTemplateIndex : 0;
        if (templates.length === 0) return;
        var tpl = templates[tplIndex] || templates[0];
        var id = makeEmitterId();
        var color = EMITTER_COLORS[emitters.length % EMITTER_COLORS.length];
        var newEmitter = {
            id: id,
            x: CANVAS_WIDTH / 2 + (emitters.length * 40 - 80),
            y: CANVAS_HEIGHT / 2,
            config: deepClone(tpl),
            particles: [],
            spawnAcc: 0,
            handleColor: color,
            // Timeline per-emitter settings
            startTime: 0,
            emitterLoop: true,
            hasFiredBurst: false,
        };
        setEmitters(function(prev) { return prev.concat([newEmitter]); });
        setSelectedEmitterId(id);
    }

    function handleDeleteEmitter(id) {
        setEmitters(function(prev) {
            return prev.filter(function(e) { return e.id !== id; });
        });
        if (selectedEmitterId === id) setSelectedEmitterId(null);
    }

    function handleSelectEmitter(id) {
        setSelectedEmitterId(id);
    }

    function handleApplyTemplateToEmitter(templateIndex) {
        if (selectedEmitterId === null) return;
        var tpl = templates[templateIndex];
        if (!tpl) return;
        setEmitters(function(prev) {
            return prev.map(function(e) {
                if (e.id === selectedEmitterId) {
                    return Object.assign({}, e, { config: deepClone(tpl), particles: [], spawnAcc: 0, hasFiredBurst: false });
                }
                return e;
            });
        });
    }

    function handleBurst() {
        if (!selectedEmitter) return;
        var cfg = selectedEmitter.config;
        var count = cfg.burstCount || 10;
        setEmitters(function(prev) {
            return prev.map(function(e) {
                if (e.id === selectedEmitterId) {
                    var newParticles = e.particles.slice();
                    for (var b = 0; b < count; b++) {
                        if (newParticles.length < MAX_PARTICLES) {
                            newParticles.push(createParticle(e.x, e.y, cfg));
                        }
                    }
                    return Object.assign({}, e, { particles: newParticles });
                }
                return e;
            });
        });
    }

    // ---- EMITTER TIMELINE SETTINGS ----

    function handleEmitterStartTime(value) {
        if (selectedEmitterId === null) return;
        setEmitters(function(prev) {
            return prev.map(function(e) {
                if (e.id === selectedEmitterId) {
                    return Object.assign({}, e, { startTime: value });
                }
                return e;
            });
        });
    }

    function handleEmitterLoop(value) {
        if (selectedEmitterId === null) return;
        setEmitters(function(prev) {
            return prev.map(function(e) {
                if (e.id === selectedEmitterId) {
                    return Object.assign({}, e, { emitterLoop: value });
                }
                return e;
            });
        });
    }

    // ---- CONFIG CHANGE ----

    function handleParamChange(key, value) {
        if (selectedEmitterId === null) return;
        setEmitters(function(prev) {
            return prev.map(function(e) {
                if (e.id === selectedEmitterId) {
                    return Object.assign({}, e, { config: setNestedValue(e.config, key, value) });
                }
                return e;
            });
        });
        setUnsavedChanges(true);
    }

    // ---- TIMELINE RESTART ----

    function handleRestartTimeline() {
        systemTimeRef.current = 0;
        prevSystemTimeRef.current = 0;
        setSystemTime(0);
        // Reset burst tracking
        setEmitters(function(prev) {
            return prev.map(function(e) {
                return Object.assign({}, e, { particles: [], spawnAcc: 0, hasFiredBurst: false });
            });
        });
    }

    // ---- MAIN LOOP ----

    var tick = useCallback(function(timestamp) {
        var canvas = canvasRef.current;
        if (!canvas) return;
        var ctx = canvas.getContext("2d");

        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        var dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = timestamp;

        var allEmitters = emittersRef.current;
        var selId = selectedEmitterIdRef.current;
        var timelineActive = useTimelineRef.current;
        var sysDur = systemDurationRef.current;
        var sysLoop = systemLoopRef.current;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (showGridRef.current) {
            drawGrid(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        // Advance system time
        var sysTime = systemTimeRef.current;
        var prevSysTime = prevSystemTimeRef.current;

        if (!pausedRef.current && timelineActive) {
            sysTime += dt;

            // Check for loop/stop
            if (sysTime >= sysDur) {
                if (sysLoop) {
                    sysTime = sysTime % sysDur;
                    // Reset burst tracking on loop
                    for (var r = 0; r < allEmitters.length; r++) {
                        allEmitters[r].hasFiredBurst = false;
                    }
                } else {
                    sysTime = sysDur;
                }
            }

            prevSystemTimeRef.current = systemTimeRef.current;
            systemTimeRef.current = sysTime;
        }

        var totalParticles = 0;

        for (var i = 0; i < allEmitters.length; i++) {
            var em = allEmitters[i];
            var cfg = em.config;
            var particles = em.particles;

            // Determine if this emitter is active based on timeline
            var emitterActive = true;

            if (timelineActive) {
                var startT = em.startTime || 0;

                if (sysTime < startT) {
                    emitterActive = false;
                }

                // If not looping and system has passed duration, stop
                if (!sysLoop && sysTime >= sysDur) {
                    emitterActive = false;
                }

                // Per-emitter loop: if emitter doesn't loop and already completed one cycle
                if (emitterActive && !em.emitterLoop && cfg.burstMode && em.hasFiredBurst) {
                    emitterActive = false;
                }
            }

            if (!pausedRef.current && emitterActive) {
                if (cfg.burstMode) {
                    if (timelineActive) {
                        // Auto-fire burst when timeline crosses start time
                        if (!em.hasFiredBurst && sysTime >= (em.startTime || 0)) {
                            for (var b = 0; b < (cfg.burstCount || 10); b++) {
                                if (totalParticles + particles.length < MAX_PARTICLES) {
                                    particles.push(createParticle(em.x, em.y, cfg));
                                }
                            }
                            em.hasFiredBurst = true;
                        }
                    }
                    // Non-timeline burst is manual only (Fire Burst button)
                } else {
                    em.spawnAcc += cfg.spawnRate * dt;
                    var toSpawn = Math.floor(em.spawnAcc);
                    em.spawnAcc -= toSpawn;

                    for (var s = 0; s < toSpawn; s++) {
                        if (totalParticles + particles.length < MAX_PARTICLES) {
                            particles.push(createParticle(em.x, em.y, cfg));
                        }
                    }
                }
            }

            // Always update and draw existing particles even if emitter inactive
            if (!pausedRef.current) {
                for (var j = particles.length - 1; j >= 0; j--) {
                    updateParticle(particles[j], dt, cfg);
                    if (!particles[j].alive) {
                        particles.splice(j, 1);
                    }
                }
            }

            for (var k = 0; k < particles.length; k++) {
                drawParticle(ctx, particles[k], cfg);
            }

            totalParticles += particles.length;
        }

        // Draw handles on top
        if (showHandlesRef.current) {
            for (var h = 0; h < allEmitters.length; h++) {
                var e = allEmitters[h];
                drawEmitterHandle(ctx, e.x, e.y, e.handleColor, e.id === selId, e.config.name);
            }
        }

        setParticleCount(totalParticles);

        // Update React state for timeline display (throttled)
        if (timelineActive) {
            setSystemTime(sysTime);
        }

        animFrameRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(function() {
        animFrameRef.current = requestAnimationFrame(tick);
        return function() {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [tick]);

    // ---- MOUSE HANDLERS ----

    function handleMouseDown(e) {
        var rect = canvasRef.current.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;

        for (var i = emitters.length - 1; i >= 0; i--) {
            var em = emitters[i];
            if (Math.abs(mx - em.x) < EMITTER_HANDLE_SIZE && Math.abs(my - em.y) < EMITTER_HANDLE_SIZE) {
                draggingIdRef.current = em.id;
                setSelectedEmitterId(em.id);
                return;
            }
        }
        setSelectedEmitterId(null);
    }

    function handleMouseMove(e) {
        if (!draggingIdRef.current) return;
        var rect = canvasRef.current.getBoundingClientRect();
        var mx = Math.max(0, Math.min(CANVAS_WIDTH, e.clientX - rect.left));
        var my = Math.max(0, Math.min(CANVAS_HEIGHT, e.clientY - rect.top));

        setEmitters(function(prev) {
            return prev.map(function(em) {
                if (em.id === draggingIdRef.current) {
                    return Object.assign({}, em, { x: Math.round(mx), y: Math.round(my) });
                }
                return em;
            });
        });
    }

    function handleMouseUp() {
        draggingIdRef.current = null;
    }

    // ---- EXPORT ----

    function configToExport(cfg) {
        return {
            name: cfg.name,
            size: cfg.size,
            sizeOverLifetime: cfg.sizeOverLifetime,
            speed: cfg.speed,
            lifetime: cfg.lifetime,
            colorStart: cfg.colorStart,
            colorMid: cfg.colorMid,
            colorEnd: cfg.colorEnd,
            colorMidPoint: cfg.colorMidPoint,
            fadeOut: cfg.fadeOut,
            gravity: cfg.gravity,
            spread: cfg.spread,
            spawnRate: cfg.spawnRate,
            direction: cfg.direction,
            shape: cfg.shape,
            damping: cfg.damping,
            burstMode: cfg.burstMode,
            burstCount: cfg.burstCount,
        };
    }

    function handleExportScene() {
        var scene = {
            systemDuration: systemDuration,
            systemLoop: systemLoop,
            useTimeline: useTimeline,
            templates: templates.map(configToExport),
            emitters: emitters.map(function(em) {
                return {
                    id: em.id,
                    position: { x: em.x, y: em.y },
                    startTime: em.startTime,
                    emitterLoop: em.emitterLoop,
                    config: configToExport(em.config),
                };
            }),
        };
        setExportJSON(JSON.stringify(scene, null, 2));
        setShowExport(true);
    }

    function handleExportSelected() {
        if (!selectedEmitter) return;
        var output = configToExport(selectedEmitter.config);
        output.position = { x: selectedEmitter.x, y: selectedEmitter.y };
        output.startTime = selectedEmitter.startTime;
        output.emitterLoop = selectedEmitter.emitterLoop;
        setExportJSON(JSON.stringify(output, null, 2));
        setShowExport(true);
    }

    function handleClearScene() {
        setEmitters([]);
        setSelectedEmitterId(null);
        setShowExport(false);
    }

    function handleCopyExport() {
        navigator.clipboard.writeText(exportJSON);
    }

    // ---- RENDER PARAM ----

    function shouldShowParam(def, cfg) {
        if (def.showIf && !cfg[def.showIf]) return false;
        if (def.hideIf && cfg[def.hideIf]) return false;
        return true;
    }

    function renderParam(def) {
        if (!selectedEmitter) return null;
        if (!shouldShowParam(def, selectedEmitter.config)) return null;

        var val = getNestedValue(selectedEmitter.config, def.key);

        if (def.type === "text") {
            return (
                <div key={def.key} style={styles.paramRow}>
                    <span style={styles.paramLabel}>{def.label}</span>
                    <input
                        style={styles.textInput}
                        value={val}
                        onChange={function(e) { handleParamChange(def.key, e.target.value); }}
                    />
                </div>
            );
        }

        if (def.type === "slider") {
            return (
                <div key={def.key} style={styles.paramRow}>
                    <span style={styles.paramLabel}>{def.label}</span>
                    <input
                        type="range"
                        style={styles.slider}
                        min={def.min}
                        max={def.max}
                        step={def.step}
                        value={val}
                        onChange={function(e) {
                            var v = def.step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value);
                            handleParamChange(def.key, v);
                        }}
                    />
                    <span style={styles.paramValue}>{val}</span>
                </div>
            );
        }

        if (def.type === "color") {
            return (
                <div key={def.key} style={styles.paramRow}>
                    <span style={styles.paramLabel}>{def.label}</span>
                    <input
                        type="color"
                        style={styles.colorInput}
                        value={val}
                        onChange={function(e) { handleParamChange(def.key, e.target.value); }}
                    />
                    <span style={styles.paramValue}>{val}</span>
                </div>
            );
        }

        if (def.type === "toggle") {
            return (
                <div key={def.key} style={styles.paramRow}>
                    <span style={styles.paramLabel}>{def.label}</span>
                    <button
                        style={{ ...styles.toggle, background: val ? "#00ffaa" : "#333" }}
                        onClick={function() { handleParamChange(def.key, !val); }}
                    >
                        <div style={{ ...styles.toggleKnob, left: val ? 20 : 2 }} />
                    </button>
                </div>
            );
        }

        if (def.type === "select") {
            return (
                <div key={def.key} style={styles.paramRow}>
                    <span style={styles.paramLabel}>{def.label}</span>
                    <select
                        style={styles.select}
                        value={val}
                        onChange={function(e) { handleParamChange(def.key, e.target.value); }}
                    >
                        {def.options.map(function(opt) {
                            return <option key={opt} value={opt}>{opt}</option>;
                        })}
                    </select>
                </div>
            );
        }

        return null;
    }

    function renderParamGroup(groupName) {
        return PARAM_DEFS.filter(function(d) { return d.group === groupName; }).map(renderParam);
    }

    function renderColorPreview() {
        if (!selectedEmitter) return null;
        var cfg = selectedEmitter.config;
        var gradient = "linear-gradient(to right, " + cfg.colorStart + ", " + cfg.colorMid + " " + Math.round(cfg.colorMidPoint * 100) + "%, " + cfg.colorEnd + ")";
        return <div style={{ ...styles.colorGradientBar, background: gradient }} />;
    }

    // Timeline visual
    function renderTimeline() {
        var pct = systemDuration > 0 ? (systemTime / systemDuration) * 100 : 0;
        return (
            <div style={styles.timelineBar} onClick={function(e) {
                var rect = e.currentTarget.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var t = (x / rect.width) * systemDuration;
                systemTimeRef.current = Math.max(0, Math.min(systemDuration, t));
                prevSystemTimeRef.current = systemTimeRef.current;
                setSystemTime(systemTimeRef.current);
                // Reset burst tracking
                setEmitters(function(prev) {
                    return prev.map(function(em) {
                        return Object.assign({}, em, { hasFiredBurst: (em.startTime || 0) <= systemTimeRef.current ? false : false });
                    });
                });
            }}>
                {/* Emitter start marks */}
                {emitters.map(function(em) {
                    var startPct = systemDuration > 0 ? ((em.startTime || 0) / systemDuration) * 100 : 0;
                    return (
                        <div key={em.id} style={{
                            ...styles.timelineEmitterMark,
                            left: startPct + "%",
                            width: 4,
                            background: em.handleColor,
                        }} title={em.config.name + " starts at " + (em.startTime || 0).toFixed(2) + "s"} />
                    );
                })}
                {/* Playhead */}
                <div style={{ ...styles.timelinePlayhead, left: pct + "%" }} />
                {/* Time label */}
                <div style={{
                    position: "absolute", bottom: 2, right: 4,
                    fontSize: "9px", color: "#555", pointerEvents: "none",
                }}>
                    {systemTime.toFixed(2)}s / {systemDuration.toFixed(1)}s
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div style={styles.container}>

            {/* LEFT PANEL */}
            <div style={styles.leftPanel}>
                <div style={styles.libraryHeader}>
                    Templates ({templates.length})
                </div>

                {templates.map(function(tpl, index) {
                    var isActive = index === activeTemplateIndex;
                    return (
                        <div
                            key={"tpl-" + index}
                            style={{
                                ...styles.templateItem,
                                background: isActive ? "#1a1a1a" : "transparent",
                                borderLeft: isActive ? "3px solid #f59e0b" : "3px solid transparent",
                            }}
                            onClick={function() { handleLoadTemplate(index); }}
                        >
                            <div style={{
                                width: 10, height: 10, borderRadius: 2,
                                background: tpl.colorStart, marginRight: 8, flexShrink: 0,
                            }} />
                            <span style={{
                                ...styles.templateName,
                                color: isActive ? "#f59e0b" : "#aaa",
                            }}>
                                {tpl.name}
                            </span>
                            <div style={styles.templateActions}>
                                <button
                                    style={{ ...styles.templateBtn, color: "#888" }}
                                    onClick={function(e) { e.stopPropagation(); handleDuplicateTemplate(index); }}
                                    title="Duplicate"
                                >
                                    {"\u2398"}
                                </button>
                                <button
                                    style={{ ...styles.templateBtn, color: "#ff4444" }}
                                    onClick={function(e) { e.stopPropagation(); handleDeleteTemplate(index); }}
                                    title="Delete"
                                >
                                    {"\u2715"}
                                </button>
                            </div>
                        </div>
                    );
                })}

                <button style={styles.addBtn} onClick={handleNewTemplate}>
                    + New Template
                </button>

                <button
                    style={{ ...styles.addBtn, color: "#00ffaa", borderColor: "#00ffaa44", background: "#0d1a14" }}
                    onClick={function() { handleAddEmitter(); }}
                >
                    + Add Emitter to Scene
                </button>

                <div style={{ ...styles.libraryHeader, color: "#00ffaa" }}>
                    Scene ({emitters.length})
                </div>

                {emitters.map(function(em) {
                    var isSelected = em.id === selectedEmitterId;
                    return (
                        <div
                            key={em.id}
                            style={{
                                ...styles.emitterItem,
                                background: isSelected ? "#1a1a1a" : "transparent",
                                borderLeft: "3px solid " + (isSelected ? em.handleColor : "transparent"),
                            }}
                            onClick={function() { handleSelectEmitter(em.id); }}
                        >
                            <div style={{ ...styles.emitterDot, background: em.handleColor }} />
                            <span style={{
                                ...styles.emitterLabel,
                                color: isSelected ? em.handleColor : "#aaa",
                            }}>
                                {em.config.name}
                            </span>
                            <span style={styles.emitterPos}>({em.x},{em.y})</span>
                            <button
                                style={{ ...styles.templateBtn, color: "#ff4444", marginLeft: 4 }}
                                onClick={function(e) { e.stopPropagation(); handleDeleteEmitter(em.id); }}
                                title="Remove"
                            >
                                {"\u2715"}
                            </button>
                        </div>
                    );
                })}

                {emitters.length === 0 && (
                    <div style={{ padding: "12px", color: "#333", fontSize: "10px", textAlign: "center" }}>
                        No emitters yet. Select a template and add one.
                    </div>
                )}
            </div>

            {/* CENTER — CANVAS */}
            <div style={styles.canvasWrap}>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    style={styles.canvas}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
                <div style={styles.posLabel}>
                    {selectedEmitter
                        ? selectedEmitter.config.name + " (" + selectedEmitter.x + ", " + selectedEmitter.y + ")"
                        : "No emitter selected"
                    }
                </div>
                <div style={styles.statusBar}>
                    Particles: {particleCount} / {MAX_PARTICLES}
                    {" | Emitters: " + emitters.length}
                    {paused ? " | PAUSED" : ""}
                </div>

                {/* Display toggles */}
                <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 12 }}>
                    <label style={styles.checkbox}>
                        <input type="checkbox" checked={showGrid} onChange={function() { setShowGrid(!showGrid); }} style={styles.checkboxInput} />
                        Grid
                    </label>
                    <label style={styles.checkbox}>
                        <input type="checkbox" checked={showHandles} onChange={function() { setShowHandles(!showHandles); }} style={styles.checkboxInput} />
                        Handles
                    </label>
                </div>
            </div>

            {/* RIGHT — CONTROLS PANEL */}
            <div style={styles.panel}>
                <div style={styles.panelHeader}>
                    <span>
                        {selectedEmitter ? selectedEmitter.config.name : "Particle Editor"}
                        {unsavedChanges && selectedEmitter && (
                            <span style={{ color: "#f59e0b", marginLeft: 8, fontSize: "9px" }}>{"\u25CF"} EDITED</span>
                        )}
                    </span>
                    <span style={{ float: "right", display: "flex", gap: 12, alignItems: "center" }}>
                        <span
                            style={{ cursor: "pointer", color: "#555", fontSize: "12px", fontWeight: "bold" }}
                            onClick={function() { setShowHelp(true); }}
                            title="Instructions"
                        >
                            ?
                        </span>
                        <span
                            style={{ cursor: "pointer", color: paused ? "#ff4444" : "#00ffaa" }}
                            onClick={function() { setPaused(!paused); }}
                        >
                            {paused ? "\u25B6 PLAY" : "\u23F8 PAUSE"}
                        </span>
                    </span>
                </div>

                {/* TIMELINE SECTION */}
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>Timeline</div>
                    <div style={styles.paramRow}>
                        <span style={styles.paramLabel}>Enable Timeline</span>
                        <button
                            style={{ ...styles.toggle, background: useTimeline ? "#00ffaa" : "#333" }}
                            onClick={function() { setUseTimeline(!useTimeline); }}
                        >
                            <div style={{ ...styles.toggleKnob, left: useTimeline ? 20 : 2 }} />
                        </button>
                    </div>
                    {useTimeline && (
                        <>
                            <div style={styles.paramRow}>
                                <span style={styles.paramLabel}>Duration (s)</span>
                                <input
                                    type="range"
                                    style={styles.slider}
                                    min={0.5}
                                    max={10}
                                    step={0.1}
                                    value={systemDuration}
                                    onChange={function(e) { setSystemDuration(parseFloat(e.target.value)); }}
                                />
                                <span style={styles.paramValue}>{systemDuration.toFixed(1)}</span>
                            </div>
                            <div style={styles.paramRow}>
                                <span style={styles.paramLabel}>System Loop</span>
                                <button
                                    style={{ ...styles.toggle, background: systemLoop ? "#00ffaa" : "#333" }}
                                    onClick={function() { setSystemLoop(!systemLoop); }}
                                >
                                    <div style={{ ...styles.toggleKnob, left: systemLoop ? 20 : 2 }} />
                                </button>
                            </div>
                            {renderTimeline()}
                            <button
                                style={{ ...styles.resetBtn, marginTop: 6, color: "#00ffaa", borderColor: "#00ffaa44" }}
                                onClick={handleRestartTimeline}
                            >
                                Restart Timeline
                            </button>
                        </>
                    )}
                </div>

                {selectedEmitter ? (
                    <>
                        {/* Per-emitter timeline settings */}
                        {useTimeline && (
                            <div style={styles.section}>
                                <div style={styles.sectionTitle}>Emitter Timing</div>
                                <div style={styles.paramRow}>
                                    <span style={styles.paramLabel}>Start Time (s)</span>
                                    <input
                                        type="range"
                                        style={styles.slider}
                                        min={0}
                                        max={systemDuration}
                                        step={0.05}
                                        value={selectedEmitter.startTime || 0}
                                        onChange={function(e) { handleEmitterStartTime(parseFloat(e.target.value)); }}
                                    />
                                    <span style={styles.paramValue}>{(selectedEmitter.startTime || 0).toFixed(2)}</span>
                                </div>
                                <div style={styles.paramRow}>
                                    <span style={styles.paramLabel}>Emitter Loop</span>
                                    <button
                                        style={{ ...styles.toggle, background: selectedEmitter.emitterLoop ? "#00ffaa" : "#333" }}
                                        onClick={function() { handleEmitterLoop(!selectedEmitter.emitterLoop); }}
                                    >
                                        <div style={{ ...styles.toggleKnob, left: selectedEmitter.emitterLoop ? 20 : 2 }} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Apply template */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Apply Template</div>
                            <select
                                style={styles.templateSelect}
                                value=""
                                onChange={function(e) {
                                    var idx = parseInt(e.target.value);
                                    if (!isNaN(idx)) handleApplyTemplateToEmitter(idx);
                                }}
                            >
                                <option value="" disabled>Select a template...</option>
                                {templates.map(function(tpl, idx) {
                                    return <option key={idx} value={idx}>{tpl.name}</option>;
                                })}
                            </select>
                        </div>

                        {/* Identity */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Identity</div>
                            {renderParamGroup("identity")}
                        </div>

                        {/* Emission */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Emission</div>
                            {renderParamGroup("emission")}
                            {selectedEmitter.config.burstMode && !useTimeline && (
                                <button style={styles.burstBtn} onClick={handleBurst}>
                                    {"\u26A1"} Fire Burst
                                </button>
                            )}
                            {selectedEmitter.config.burstMode && useTimeline && (
                                <div style={{ fontSize: "10px", color: "#555", marginTop: 4 }}>
                                    Bursts fire automatically at start time when timeline is active.
                                </div>
                            )}
                        </div>

                        {/* Size */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Size</div>
                            {renderParamGroup("size")}
                        </div>

                        {/* Motion */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Motion</div>
                            {renderParamGroup("motion")}
                        </div>

                        {/* Appearance */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Appearance</div>
                            {renderColorPreview()}
                            {renderParamGroup("appearance")}
                        </div>

                        {/* Save */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Save</div>
                            {activeTemplateIndex !== null && (
                                <button style={styles.exportBtn} onClick={handleSaveTemplate}>
                                    Save to "{templates[activeTemplateIndex] ? templates[activeTemplateIndex].name : ""}"
                                </button>
                            )}
                            <button style={{ ...styles.resetBtn, color: "#00ffaa", borderColor: "#00ffaa44" }} onClick={handleSaveAsNewTemplate}>
                                Save as New Template
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={styles.noSelection}>
                        Select an emitter to edit its properties, or add one from the left panel.
                    </div>
                )}

                {/* Export */}
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>Export</div>
                    {selectedEmitter && (
                        <button style={styles.exportBtn} onClick={handleExportSelected}>
                            Export Selected
                        </button>
                    )}
                    <button
                        style={{ ...styles.exportBtn, background: "#f59e0b", marginTop: 4 }}
                        onClick={handleExportScene}
                    >
                        Export Full Scene
                    </button>
                    <button style={styles.resetBtn} onClick={handleClearScene}>
                        Clear Scene
                    </button>
                    {showExport && (
                        <div>
                            <textarea
                                style={styles.exportArea}
                                value={exportJSON}
                                readOnly
                                rows={10}
                            />
                            <button
                                style={{ ...styles.resetBtn, marginTop: 4, color: "#00ffaa", borderColor: "#00ffaa" }}
                                onClick={handleCopyExport}
                            >
                                Copy to Clipboard
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* HELP MODAL */}
            {showHelp && (
                <div
                    style={{
                        position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
                        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                    }}
                    onClick={function(e) { if (e.target === e.currentTarget) setShowHelp(false); }}
                >
                    <div style={{
                        background: "#111", border: "1px solid #333", borderRadius: 8,
                        padding: "24px 28px", maxWidth: 520, maxHeight: "80vh", overflowY: "auto",
                        color: "#ccc", fontSize: "12px", lineHeight: 1.7,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#00ffaa", letterSpacing: 2, textTransform: "uppercase" }}>
                                How To Use
                            </span>
                            <button
                                onClick={function() { setShowHelp(false); }}
                                style={{ background: "#222", border: "1px solid #333", color: "#888", padding: "4px 10px", cursor: "pointer", borderRadius: 4, fontFamily: "inherit", fontSize: "11px" }}
                            >
                                Close
                            </button>
                        </div>

                        <div style={{ color: "#f59e0b", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>TEMPLATES (left panel)</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>
                            Templates are reusable particle presets. Click one to highlight it, then press "+ Add Emitter to Scene" to place it on the canvas. You can duplicate or delete templates with the buttons on each row.
                        </div>

                        <div style={{ color: "#f59e0b", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>SCENE (left panel)</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>
                            Shows every emitter on the canvas. Click to select, then edit in the right panel. Red X removes it.
                        </div>

                        <div style={{ color: "#00ffaa", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>CANVAS (center)</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>
                            Click a handle to select, drag to reposition. Click empty space to deselect. Use the checkboxes (top right) to toggle the grid and emitter handles on/off.
                        </div>

                        <div style={{ color: "#00ffaa", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>CONTROLS (right panel)</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>
                            All changes are live. Use "Apply Template" to swap an emitter's config to any saved template.
                        </div>

                        <div style={{ color: "#ff6b6b", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>BURST MODE</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>
                            Switches from continuous to on-demand bursts. Without timeline: use the red "Fire Burst" button. With timeline: bursts fire automatically at the emitter's start time.
                        </div>

                        <div style={{ color: "#a29bfe", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>TIMELINE</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>
                            Enable timeline to choreograph a multi-emitter effect. Set a system duration and toggle loop. Each emitter gets a start time — it only activates when the playhead reaches that point. Click the timeline bar to scrub. Burst emitters auto-fire at their start time. "Emitter Loop" controls whether that emitter keeps firing each loop cycle or only fires once. Use "Restart Timeline" to reset everything.
                        </div>

                        <div style={{ color: "#a29bfe", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>KEY SETTINGS</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>
                            Size Start/End — particles grow or shrink over life. Color Start/Mid/End — 3-point color ramp. Damping — how fast particles slow down. Direction — angle particles fire (270° = up). Spread — cone width.
                        </div>

                        <div style={{ color: "#f59e0b", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>EXPORTING</div>
                        <div style={{ marginBottom: 4, color: "#999" }}>
                            "Export Selected" or "Export Full Scene" gives you JSON. Copy it and paste it to Claude to build into the game. Scene export includes timeline settings.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ParticleEditor;