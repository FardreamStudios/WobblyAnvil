// ============================================================
// ParticleEditor.js — Dev Tool: Pixel Particle System Editor
// Access at localhost:3000/dev/particle-editor
//
// Phase 1: Core engine, single emitter, real-time preview
// Phase 2: Template system — save, load, delete, duplicate
// Phase 3: Multi-emitter scene — add/remove/select/drag
//          emitters, each assigned a template
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

// ============================================
// DEFAULT EMITTER CONFIG
// ============================================
var DEFAULT_CONFIG = {
    name: "untitled",
    size: { min: 2, max: 4 },
    speed: { min: 30, max: 80 },
    lifetime: { min: 0.4, max: 1.2 },
    colorStart: "#ff6600",
    colorEnd: "#ff2200",
    fadeOut: true,
    gravity: -40,
    spread: 60,
    spawnRate: 15,
    direction: 270,
    shape: "square",
};

// ============================================
// STARTER TEMPLATES
// ============================================
var STARTER_TEMPLATES = [
    {
        name: "campfire_sparks",
        size: { min: 1, max: 3 },
        speed: { min: 40, max: 100 },
        lifetime: { min: 0.3, max: 0.9 },
        colorStart: "#ffaa00",
        colorEnd: "#ff2200",
        fadeOut: true,
        gravity: -60,
        spread: 30,
        spawnRate: 25,
        direction: 270,
        shape: "square",
    },
    {
        name: "smoke_puff",
        size: { min: 3, max: 8 },
        speed: { min: 10, max: 30 },
        lifetime: { min: 1.0, max: 2.5 },
        colorStart: "#888888",
        colorEnd: "#333333",
        fadeOut: true,
        gravity: -15,
        spread: 40,
        spawnRate: 8,
        direction: 270,
        shape: "circle",
    },
    {
        name: "forge_embers",
        size: { min: 1, max: 2 },
        speed: { min: 60, max: 150 },
        lifetime: { min: 0.2, max: 0.6 },
        colorStart: "#ffffff",
        colorEnd: "#ff4400",
        fadeOut: true,
        gravity: -20,
        spread: 90,
        spawnRate: 40,
        direction: 270,
        shape: "square",
    },
];

// ============================================
// PARAM DEFINITIONS TABLE
// ============================================
var PARAM_DEFS = [
    { key: "name", label: "Name", type: "text" },
    { key: "spawnRate", label: "Spawn Rate", type: "slider", min: 1, max: 100, step: 1 },
    { key: "size.min", label: "Size Min", type: "slider", min: 1, max: 20, step: 1 },
    { key: "size.max", label: "Size Max", type: "slider", min: 1, max: 20, step: 1 },
    { key: "speed.min", label: "Speed Min", type: "slider", min: 0, max: 300, step: 5 },
    { key: "speed.max", label: "Speed Max", type: "slider", min: 0, max: 300, step: 5 },
    { key: "lifetime.min", label: "Life Min (s)", type: "slider", min: 0.1, max: 5, step: 0.1 },
    { key: "lifetime.max", label: "Life Max (s)", type: "slider", min: 0.1, max: 5, step: 0.1 },
    { key: "direction", label: "Direction (\u00B0)", type: "slider", min: 0, max: 360, step: 1 },
    { key: "spread", label: "Spread (\u00B0)", type: "slider", min: 0, max: 180, step: 1 },
    { key: "gravity", label: "Gravity", type: "slider", min: -200, max: 200, step: 5 },
    { key: "colorStart", label: "Color Start", type: "color" },
    { key: "colorEnd", label: "Color End", type: "color" },
    { key: "fadeOut", label: "Fade Out", type: "toggle" },
    { key: "shape", label: "Shape", type: "select", options: ["square", "circle"] },
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
        size: size,
        alive: true,
    };
}

function updateParticle(p, dt, gravity) {
    p.vy -= gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.lifetime -= dt;
    if (p.lifetime <= 0) {
        p.alive = false;
    }
}

function drawParticle(ctx, p, config) {
    var t = 1 - p.lifetime / p.maxLifetime;
    var cStart = hexToRgb(config.colorStart);
    var cEnd = hexToRgb(config.colorEnd);
    var r = Math.round(lerp(cStart.r, cEnd.r, t));
    var g = Math.round(lerp(cStart.g, cEnd.g, t));
    var b = Math.round(lerp(cStart.b, cEnd.b, t));
    var alpha = config.fadeOut ? p.lifetime / p.maxLifetime : 1;

    ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + alpha.toFixed(2) + ")";

    if (config.shape === "circle") {
        ctx.beginPath();
        ctx.arc(Math.round(p.x), Math.round(p.y), p.size / 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        var half = Math.floor(p.size / 2);
        ctx.fillRect(Math.round(p.x) - half, Math.round(p.y) - half, p.size, p.size);
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

    // Glow for selected
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

    // Crosshair
    ctx.strokeStyle = handleColor + (selected ? "cc" : "66");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.stroke();

    // Label
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
    // -- LEFT PANEL --
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
    // -- EMITTER LIST SECTION --
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
    // -- CENTER: CANVAS --
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
    // -- RIGHT: CONTROLS PANEL --
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
};

// ============================================
// COMPONENT
// ============================================
function ParticleEditor() {
    var canvasRef = useRef(null);
    var lastTimeRef = useRef(null);
    var animFrameRef = useRef(null);
    var draggingIdRef = useRef(null);

    // -- TEMPLATES --
    var [templates, setTemplates] = useState(STARTER_TEMPLATES.map(deepClone));
    var [activeTemplateIndex, setActiveTemplateIndex] = useState(null);
    var [unsavedChanges, setUnsavedChanges] = useState(false);

    // -- EMITTERS --
    // Each emitter: { id, x, y, config, particles, spawnAcc, handleColor }
    var [emitters, setEmitters] = useState([]);
    var [selectedEmitterId, setSelectedEmitterId] = useState(null);
    var emittersRef = useRef(emitters);

    var [particleCount, setParticleCount] = useState(0);
    var [paused, setPaused] = useState(false);
    var [showExport, setShowExport] = useState(false);
    var [exportJSON, setExportJSON] = useState("");

    var pausedRef = useRef(paused);

    useEffect(function() { emittersRef.current = emitters; }, [emitters]);
    useEffect(function() { pausedRef.current = paused; }, [paused]);

    // Get selected emitter object
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
            var next = prev.map(deepClone);
            next.push(newTemplate);
            return next;
        });
    }

    function handleDuplicateTemplate(index) {
        var source = templates[index];
        var dupe = deepClone(source);
        dupe.name = source.name + "_copy";
        setTemplates(function(prev) {
            var next = prev.map(deepClone);
            next.push(dupe);
            return next;
        });
    }

    function handleDeleteTemplate(index) {
        setTemplates(function(prev) {
            return prev.filter(function(_, i) { return i !== index; });
        });
        if (activeTemplateIndex === index) {
            setActiveTemplateIndex(null);
        } else if (activeTemplateIndex !== null && activeTemplateIndex > index) {
            setActiveTemplateIndex(activeTemplateIndex - 1);
        }
    }

    function handleNewTemplate() {
        var newTemplate = deepClone(DEFAULT_CONFIG);
        newTemplate.name = "new_template";
        setTemplates(function(prev) {
            var next = prev.map(deepClone);
            next.push(newTemplate);
            return next;
        });
    }

    // ---- EMITTER ACTIONS ----

    function handleAddEmitter(templateIndex) {
        var tplIndex = templateIndex !== undefined ? templateIndex : (activeTemplateIndex !== null ? activeTemplateIndex : 0);
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
        };
        setEmitters(function(prev) { return prev.concat([newEmitter]); });
        setSelectedEmitterId(id);
    }

    function handleDeleteEmitter(id) {
        setEmitters(function(prev) {
            return prev.filter(function(e) { return e.id !== id; });
        });
        if (selectedEmitterId === id) {
            setSelectedEmitterId(null);
        }
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
                    return Object.assign({}, e, { config: deepClone(tpl), particles: [], spawnAcc: 0 });
                }
                return e;
            });
        });
    }

    // ---- CONFIG CHANGE (for selected emitter) ----

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

    // ---- MAIN LOOP ----

    var tick = useCallback(function(timestamp) {
        var canvas = canvasRef.current;
        if (!canvas) return;
        var ctx = canvas.getContext("2d");

        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        var dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = timestamp;

        var allEmitters = emittersRef.current;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        drawGrid(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

        var totalParticles = 0;

        for (var i = 0; i < allEmitters.length; i++) {
            var em = allEmitters[i];
            var cfg = em.config;
            var particles = em.particles;

            if (!pausedRef.current) {
                em.spawnAcc += cfg.spawnRate * dt;
                var toSpawn = Math.floor(em.spawnAcc);
                em.spawnAcc -= toSpawn;

                for (var s = 0; s < toSpawn; s++) {
                    if (totalParticles + particles.length < MAX_PARTICLES) {
                        particles.push(createParticle(em.x, em.y, cfg));
                    }
                }

                for (var j = particles.length - 1; j >= 0; j--) {
                    updateParticle(particles[j], dt, cfg.gravity);
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
        for (var h = 0; h < allEmitters.length; h++) {
            var e = allEmitters[h];
            var sel = e.id === selectedEmitterId;
            drawEmitterHandle(ctx, e.x, e.y, e.handleColor, sel, cfg ? e.config.name : "");
        }

        setParticleCount(totalParticles);
        animFrameRef.current = requestAnimationFrame(tick);
    }, [selectedEmitterId]);

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

        // Check if clicking on any emitter handle (check in reverse for top-most)
        for (var i = emitters.length - 1; i >= 0; i--) {
            var em = emitters[i];
            var dx = mx - em.x;
            var dy = my - em.y;
            if (Math.abs(dx) < EMITTER_HANDLE_SIZE && Math.abs(dy) < EMITTER_HANDLE_SIZE) {
                draggingIdRef.current = em.id;
                setSelectedEmitterId(em.id);
                return;
            }
        }

        // Clicked empty space — deselect
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

    function handleExportScene() {
        var scene = {
            templates: templates.map(function(tpl) {
                return {
                    name: tpl.name,
                    size: tpl.size,
                    speed: tpl.speed,
                    lifetime: tpl.lifetime,
                    colorStart: tpl.colorStart,
                    colorEnd: tpl.colorEnd,
                    fadeOut: tpl.fadeOut,
                    gravity: tpl.gravity,
                    spread: tpl.spread,
                    spawnRate: tpl.spawnRate,
                    direction: tpl.direction,
                    shape: tpl.shape,
                };
            }),
            emitters: emitters.map(function(em) {
                return {
                    id: em.id,
                    position: { x: em.x, y: em.y },
                    config: {
                        name: em.config.name,
                        size: em.config.size,
                        speed: em.config.speed,
                        lifetime: em.config.lifetime,
                        colorStart: em.config.colorStart,
                        colorEnd: em.config.colorEnd,
                        fadeOut: em.config.fadeOut,
                        gravity: em.config.gravity,
                        spread: em.config.spread,
                        spawnRate: em.config.spawnRate,
                        direction: em.config.direction,
                        shape: em.config.shape,
                    },
                };
            }),
        };
        var json = JSON.stringify(scene, null, 2);
        setExportJSON(json);
        setShowExport(true);
    }

    function handleExportSelected() {
        if (!selectedEmitter) return;
        var output = {
            name: selectedEmitter.config.name,
            position: { x: selectedEmitter.x, y: selectedEmitter.y },
            size: selectedEmitter.config.size,
            speed: selectedEmitter.config.speed,
            lifetime: selectedEmitter.config.lifetime,
            colorStart: selectedEmitter.config.colorStart,
            colorEnd: selectedEmitter.config.colorEnd,
            fadeOut: selectedEmitter.config.fadeOut,
            gravity: selectedEmitter.config.gravity,
            spread: selectedEmitter.config.spread,
            spawnRate: selectedEmitter.config.spawnRate,
            direction: selectedEmitter.config.direction,
            shape: selectedEmitter.config.shape,
        };
        var json = JSON.stringify(output, null, 2);
        setExportJSON(json);
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

    function renderParam(def) {
        if (!selectedEmitter) return null;
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
                        style={{
                            ...styles.toggle,
                            background: val ? "#00ffaa" : "#333",
                        }}
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

    // ============================================
    // RENDER
    // ============================================
    return (
        <div style={styles.container}>

            {/* LEFT PANEL — TEMPLATES + EMITTER LIST */}
            <div style={styles.leftPanel}>

                {/* TEMPLATES */}
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
                                    \u2398
                                </button>
                                <button
                                    style={{ ...styles.templateBtn, color: "#ff4444" }}
                                    onClick={function(e) { e.stopPropagation(); handleDeleteTemplate(index); }}
                                    title="Delete"
                                >
                                    \u2715
                                </button>
                            </div>
                        </div>
                    );
                })}

                <button style={styles.addBtn} onClick={handleNewTemplate}>
                    + New Template
                </button>

                {/* Spawn emitter from selected template */}
                <button
                    style={{
                        ...styles.addBtn,
                        color: "#00ffaa",
                        borderColor: "#00ffaa44",
                        background: "#0d1a14",
                    }}
                    onClick={function() { handleAddEmitter(); }}
                >
                    + Add Emitter to Scene
                </button>

                {/* EMITTER LIST */}
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
                            <span style={styles.emitterPos}>
                                ({em.x},{em.y})
                            </span>
                            <button
                                style={{ ...styles.templateBtn, color: "#ff4444", marginLeft: 4 }}
                                onClick={function(e) { e.stopPropagation(); handleDeleteEmitter(em.id); }}
                                title="Remove"
                            >
                                \u2715
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
                    {paused ? " | \u23F8 PAUSED" : ""}
                </div>
            </div>

            {/* RIGHT — CONTROLS PANEL */}
            <div style={styles.panel}>
                <div style={styles.panelHeader}>
                    <span>
                        {selectedEmitter ? selectedEmitter.config.name : "Particle Editor"}
                        {unsavedChanges && selectedEmitter && (
                            <span style={{ color: "#f59e0b", marginLeft: 8, fontSize: "9px" }}>\u25CF EDITED</span>
                        )}
                    </span>
                    <span
                        style={{ float: "right", cursor: "pointer", color: paused ? "#ff4444" : "#00ffaa" }}
                        onClick={function() { setPaused(!paused); }}
                    >
                        {paused ? "\u25B6 PLAY" : "\u23F8 PAUSE"}
                    </span>
                </div>

                {selectedEmitter ? (
                    <>
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
                            {renderParam(PARAM_DEFS[0])}
                        </div>

                        {/* Emission */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Emission</div>
                            {PARAM_DEFS.slice(1, 2).map(renderParam)}
                        </div>

                        {/* Size */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Size</div>
                            {PARAM_DEFS.slice(2, 4).map(renderParam)}
                        </div>

                        {/* Motion */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Motion</div>
                            {PARAM_DEFS.slice(4, 11).map(renderParam)}
                        </div>

                        {/* Appearance */}
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>Appearance</div>
                            {PARAM_DEFS.slice(11).map(renderParam)}
                        </div>

                        {/* Save to template */}
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
        </div>
    );
}

export default ParticleEditor;