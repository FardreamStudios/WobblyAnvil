// ============================================================
// ParticleEditor.js — Dev Tool: Pixel Particle System Editor
// localhost:3000/dev/particle-editor
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
var EMITTER_COLORS = ["#00ffaa","#ff6b6b","#4ecdc4","#ffe66d","#a29bfe","#fd79a8","#00cec9","#fab1a0"];
var DEFAULT_SYSTEM_DURATION = 2.0;
var TIMELINE_HEIGHT = 40;
var SHAPE_LIST = ["square","circle","triangle","wave","halfmoon"];

// ============================================
// CURVE SYSTEM
// ============================================
var CURVE_NAMES = ["linear","easeIn","easeOut","easeInOut","quickIn","quickOut","pulse","waveCurve"];
var CURVE_LABELS = {
    linear: "Linear", easeIn: "Ease In", easeOut: "Ease Out", easeInOut: "Ease In-Out",
    quickIn: "Quick In", quickOut: "Quick Out", pulse: "Pulse", waveCurve: "Wave",
};

function evaluateCurve(curveName, t) {
    var c = Math.max(0, Math.min(1, t));
    switch (curveName) {
        case "easeIn": return c * c;
        case "easeOut": return 1 - (1 - c) * (1 - c);
        case "easeInOut": return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
        case "quickIn": return c < 0.15 ? c / 0.15 : 1;
        case "quickOut": return c > 0.85 ? (1 - c) / 0.15 : 1;
        case "pulse": return Math.sin(c * Math.PI);
        case "waveCurve": return (Math.sin(c * Math.PI * 2) + 1) / 2;
        default: return c; // linear
    }
}

// Apply curve: given start/end values and a curve, returns interpolated value
function curvedLerp(start, end, t, curveName) {
    var ct = evaluateCurve(curveName || "linear", t);
    return start + (end - start) * ct;
}

// ============================================
// DEFAULT EMITTER CONFIG
// ============================================
var DEFAULT_CONFIG = {
    name: "untitled",
    size: { min: 2, max: 4 }, sizeOverLifetime: { start: 1.0, end: 1.0 }, sizeCurve: "linear",
    scaleX: 1.0, scaleY: 1.0,
    speed: { min: 30, max: 80 }, lifetime: { min: 0.4, max: 1.2 },
    colorStart: "#ff6600", colorMid: "#ff4400", colorEnd: "#ff2200", colorMidPoint: 0.5, colorCurve: "linear",
    fadeOut: true, opacityCurve: "linear",
    gravity: -40, spread: 60, spawnRate: 15, direction: 270,
    shape: "square", damping: 0, speedCurve: "linear",
    burstMode: false, burstCount: 10, burstRepeat: false, burstRate: 5, burstDuration: 1.0,
    faceVelocity: false, dithering: 0, glow: false, glowIntensity: 8,
};

// ============================================
// STARTER TEMPLATES
// ============================================
var STARTER_TEMPLATES = [
    { name: "campfire_sparks", size: { min: 1, max: 3 }, sizeOverLifetime: { start: 1.0, end: 0.3 }, sizeCurve: "easeIn", scaleX: 1, scaleY: 1,
        speed: { min: 40, max: 100 }, lifetime: { min: 0.3, max: 0.9 }, colorStart: "#ffee88", colorMid: "#ffaa00", colorEnd: "#ff2200", colorMidPoint: 0.3, colorCurve: "linear",
        fadeOut: true, opacityCurve: "easeIn", gravity: -60, spread: 30, spawnRate: 25, direction: 270, shape: "square", damping: 0.5, speedCurve: "linear",
        burstMode: false, burstCount: 10, burstRepeat: false, burstRate: 5, burstDuration: 1, faceVelocity: false, dithering: 0, glow: true, glowIntensity: 6 },
    { name: "smoke_puff", size: { min: 3, max: 8 }, sizeOverLifetime: { start: 0.5, end: 1.5 }, sizeCurve: "easeOut", scaleX: 1.2, scaleY: 1,
        speed: { min: 10, max: 30 }, lifetime: { min: 1, max: 2.5 }, colorStart: "#999999", colorMid: "#666666", colorEnd: "#333333", colorMidPoint: 0.5, colorCurve: "easeInOut",
        fadeOut: true, opacityCurve: "quickOut", gravity: -15, spread: 40, spawnRate: 8, direction: 270, shape: "circle", damping: 1, speedCurve: "easeOut",
        burstMode: false, burstCount: 10, burstRepeat: false, burstRate: 5, burstDuration: 1, faceVelocity: false, dithering: 0.3, glow: false, glowIntensity: 8 },
    { name: "forge_embers", size: { min: 1, max: 2 }, sizeOverLifetime: { start: 1, end: 0 }, sizeCurve: "easeIn", scaleX: 1, scaleY: 1,
        speed: { min: 60, max: 150 }, lifetime: { min: 0.2, max: 0.6 }, colorStart: "#ffffff", colorMid: "#ffaa00", colorEnd: "#ff4400", colorMidPoint: 0.4, colorCurve: "linear",
        fadeOut: true, opacityCurve: "linear", gravity: -20, spread: 90, spawnRate: 40, direction: 270, shape: "triangle", damping: 0.3, speedCurve: "linear",
        burstMode: false, burstCount: 10, burstRepeat: false, burstRate: 5, burstDuration: 1, faceVelocity: true, dithering: 0, glow: true, glowIntensity: 4 },
    { name: "anvil_strike", size: { min: 1, max: 3 }, sizeOverLifetime: { start: 1, end: 0.2 }, sizeCurve: "easeIn", scaleX: 1.5, scaleY: 0.5,
        speed: { min: 80, max: 200 }, lifetime: { min: 0.15, max: 0.5 }, colorStart: "#ffffff", colorMid: "#ffdd44", colorEnd: "#ff6600", colorMidPoint: 0.25, colorCurve: "quickIn",
        fadeOut: true, opacityCurve: "quickOut", gravity: 50, spread: 180, spawnRate: 0, direction: 270, shape: "square", damping: 2, speedCurve: "easeIn",
        burstMode: true, burstCount: 30, burstRepeat: true, burstRate: 10, burstDuration: 0.5, faceVelocity: true, dithering: 0, glow: true, glowIntensity: 10 },
    { name: "magic_wisp", size: { min: 2, max: 4 }, sizeOverLifetime: { start: 0.8, end: 1.2 }, sizeCurve: "waveCurve", scaleX: 2, scaleY: 0.6,
        speed: { min: 15, max: 40 }, lifetime: { min: 0.8, max: 1.8 }, colorStart: "#88ffff", colorMid: "#4488ff", colorEnd: "#8844ff", colorMidPoint: 0.5, colorCurve: "easeInOut",
        fadeOut: true, opacityCurve: "pulse", gravity: -10, spread: 60, spawnRate: 12, direction: 270, shape: "wave", damping: 0.8, speedCurve: "easeOut",
        burstMode: false, burstCount: 10, burstRepeat: false, burstRate: 5, burstDuration: 1, faceVelocity: true, dithering: 0.15, glow: true, glowIntensity: 12 },
    { name: "dark_slash", size: { min: 2, max: 5 }, sizeOverLifetime: { start: 1, end: 0 }, sizeCurve: "easeIn", scaleX: 0.6, scaleY: 1.5,
        speed: { min: 50, max: 120 }, lifetime: { min: 0.2, max: 0.5 }, colorStart: "#cc88ff", colorMid: "#6633aa", colorEnd: "#220044", colorMidPoint: 0.4, colorCurve: "easeOut",
        fadeOut: true, opacityCurve: "quickOut", gravity: 0, spread: 20, spawnRate: 0, direction: 270, shape: "halfmoon", damping: 1.5, speedCurve: "easeIn",
        burstMode: true, burstCount: 15, burstRepeat: false, burstRate: 5, burstDuration: 1, faceVelocity: true, dithering: 0, glow: true, glowIntensity: 15 },
    { name: "basic_circle", size: { min: 20, max: 20 }, sizeOverLifetime: { start: 1, end: 1 }, sizeCurve: "linear", scaleX: 1, scaleY: 1,
        speed: { min: 0, max: 0 }, lifetime: { min: 2, max: 2 }, colorStart: "#ffffff", colorMid: "#ffffff", colorEnd: "#ffffff", colorMidPoint: 0.5, colorCurve: "linear",
        fadeOut: false, opacityCurve: "linear", gravity: 0, spread: 0, spawnRate: 1, direction: 270, shape: "circle", damping: 0, speedCurve: "linear",
        burstMode: false, burstCount: 1, burstRepeat: false, burstRate: 1, burstDuration: 1, faceVelocity: false, dithering: 0, glow: false, glowIntensity: 8 },
];

// ============================================
// PARAM DEFINITIONS TABLE
// ============================================
var PARAM_DEFS = [
    { key: "name", label: "Name", type: "text", group: "identity" },
    { key: "burstMode", label: "Burst Mode", type: "toggle", group: "emission" },
    { key: "burstCount", label: "Burst Count", type: "slider", min: 1, max: 200, step: 1, group: "emission", showIf: "burstMode" },
    { key: "burstRepeat", label: "Burst Repeat", type: "toggle", group: "emission", showIf: "burstMode" },
    { key: "burstRate", label: "Bursts/sec", type: "slider", min: 1, max: 30, step: 1, group: "emission", showIf: "burstRepeat" },
    { key: "burstDuration", label: "Burst Dur (s)", type: "slider", min: 0.1, max: 10, step: 0.1, group: "emission", showIf: "burstRepeat" },
    { key: "spawnRate", label: "Spawn Rate", type: "slider", min: 0, max: 100, step: 1, group: "emission", hideIf: "burstMode" },
    { key: "size.min", label: "Size Min", type: "slider", min: 1, max: 100, step: 1, group: "size" },
    { key: "size.max", label: "Size Max", type: "slider", min: 1, max: 100, step: 1, group: "size" },
    { key: "sizeOverLifetime.start", label: "Size Start \u00D7", type: "slider", min: 0, max: 3, step: 0.1, group: "size" },
    { key: "sizeOverLifetime.end", label: "Size End \u00D7", type: "slider", min: 0, max: 3, step: 0.1, group: "size" },
    { key: "sizeCurve", label: "Size Curve", type: "curve", group: "size" },
    { key: "scaleX", label: "Scale X", type: "slider", min: 0.1, max: 4, step: 0.1, group: "size" },
    { key: "scaleY", label: "Scale Y", type: "slider", min: 0.1, max: 4, step: 0.1, group: "size" },
    { key: "speed.min", label: "Speed Min", type: "slider", min: 0, max: 300, step: 5, group: "motion" },
    { key: "speed.max", label: "Speed Max", type: "slider", min: 0, max: 300, step: 5, group: "motion" },
    { key: "speedCurve", label: "Speed Curve", type: "curve", group: "motion" },
    { key: "lifetime.min", label: "Life Min (s)", type: "slider", min: 0.1, max: 5, step: 0.1, group: "motion" },
    { key: "lifetime.max", label: "Life Max (s)", type: "slider", min: 0.1, max: 5, step: 0.1, group: "motion" },
    { key: "direction", label: "Direction (\u00B0)", type: "slider", min: 0, max: 360, step: 1, group: "motion" },
    { key: "spread", label: "Spread (\u00B0)", type: "slider", min: 0, max: 180, step: 1, group: "motion" },
    { key: "gravity", label: "Gravity", type: "slider", min: -200, max: 200, step: 5, group: "motion" },
    { key: "damping", label: "Damping", type: "slider", min: 0, max: 5, step: 0.1, group: "motion" },
    { key: "faceVelocity", label: "Face Velocity", type: "toggle", group: "motion" },
    { key: "colorStart", label: "Color Start", type: "color", group: "appearance" },
    { key: "colorMid", label: "Color Mid", type: "color", group: "appearance" },
    { key: "colorEnd", label: "Color End", type: "color", group: "appearance" },
    { key: "colorMidPoint", label: "Mid Point", type: "slider", min: 0.05, max: 0.95, step: 0.05, group: "appearance" },
    { key: "colorCurve", label: "Color Curve", type: "curve", group: "appearance" },
    { key: "fadeOut", label: "Fade Out", type: "toggle", group: "appearance" },
    { key: "opacityCurve", label: "Opacity Curve", type: "curve", group: "appearance" },
    { key: "shape", label: "Shape", type: "select", options: SHAPE_LIST, group: "appearance" },
    { key: "dithering", label: "Dithering", type: "slider", min: 0, max: 1, step: 0.05, group: "appearance" },
    { key: "glow", label: "Glow", type: "toggle", group: "appearance" },
    { key: "glowIntensity", label: "Glow Size", type: "slider", min: 2, max: 30, step: 1, group: "appearance", showIf: "glow" },
];

// ============================================
// HELPERS
// ============================================
function lerp(a, b, t) { return a + (b - a) * t; }
function randRange(min, max) { return min + Math.random() * (max - min); }
function degToRad(deg) { return (deg * Math.PI) / 180; }
function hexToRgb(hex) { return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) }; }
function lerpColor(c1, c2, t) { return { r: Math.round(lerp(c1.r, c2.r, t)), g: Math.round(lerp(c1.g, c2.g, t)), b: Math.round(lerp(c1.b, c2.b, t)) }; }

function getColorAtLifetime(t, config) {
    var ct = evaluateCurve(config.colorCurve || "linear", t);
    var cStart = hexToRgb(config.colorStart); var cMid = hexToRgb(config.colorMid); var cEnd = hexToRgb(config.colorEnd);
    var mid = config.colorMidPoint;
    if (ct <= mid) { return lerpColor(cStart, cMid, mid > 0 ? ct / mid : 0); }
    return lerpColor(cMid, cEnd, mid < 1 ? (ct - mid) / (1 - mid) : 1);
}

function getNestedValue(obj, path) { var parts = path.split("."); var val = obj; for (var i = 0; i < parts.length; i++) val = val[parts[i]]; return val; }
function setNestedValue(obj, path, value) { var parts = path.split("."); var clone = JSON.parse(JSON.stringify(obj)); var target = clone; for (var i = 0; i < parts.length - 1; i++) target = target[parts[i]]; target[parts[parts.length - 1]] = value; return clone; }
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }
var nextEmitterId = 1;
function makeEmitterId() { return "emitter_" + (nextEmitterId++); }

// ============================================
// PARTICLE ENGINE
// ============================================
function createParticle(emitterX, emitterY, config) {
    var dirRad = degToRad(config.direction); var spreadRad = degToRad(config.spread);
    var angle = dirRad + randRange(-spreadRad / 2, spreadRad / 2);
    var speed = randRange(config.speed.min, config.speed.max);
    var lifetime = randRange(config.lifetime.min, config.lifetime.max);
    var size = Math.round(randRange(config.size.min, config.size.max));
    return { x: emitterX, y: emitterY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        lifetime: lifetime, maxLifetime: lifetime, baseSize: size, baseSpeed: speed, alive: true };
}

function updateParticle(p, dt, config) {
    var t = 1 - p.lifetime / p.maxLifetime;
    // Speed curve: scale velocity
    var speedMult = evaluateCurve(config.speedCurve || "linear", 1 - t); // 1-t so full speed at start
    var vxScaled = p.vx * speedMult; var vyScaled = p.vy * speedMult;
    if (config.damping > 0) { var df = Math.max(0, 1 - config.damping * dt); p.vx *= df; p.vy *= df; }
    p.vy -= config.gravity * dt;
    p.x += vxScaled * dt; p.y += vyScaled * dt;
    p.lifetime -= dt;
    if (p.lifetime <= 0) p.alive = false;
}

// Offscreen canvas for pixel-level dithering
var ditherCanvas = null;
var ditherCtx = null;
function getDitherCanvas(w, h) {
    if (!ditherCanvas || ditherCanvas.width < w || ditherCanvas.height < h) {
        ditherCanvas = document.createElement("canvas");
        ditherCanvas.width = Math.max(w, 128); ditherCanvas.height = Math.max(h, 128);
        ditherCtx = ditherCanvas.getContext("2d");
    }
    return { canvas: ditherCanvas, ctx: ditherCtx };
}

function drawParticle(ctx, p, config) {
    var t = 1 - p.lifetime / p.maxLifetime;
    var col = getColorAtLifetime(t, config);
    var rawAlpha = config.fadeOut ? (1 - t) : 1;
    var alpha = evaluateCurve(config.opacityCurve || "linear", rawAlpha);
    var sizeCurvedT = evaluateCurve(config.sizeCurve || "linear", t);
    var sizeScale = lerp(config.sizeOverLifetime.start, config.sizeOverLifetime.end, sizeCurvedT);
    var baseSize = Math.max(1, Math.round(p.baseSize * sizeScale));
    var w = Math.max(1, Math.round(baseSize * (config.scaleX || 1)));
    var h = Math.max(1, Math.round(baseSize * (config.scaleY || 1)));
    var px = Math.round(p.x); var py = Math.round(p.y);
    var colorStr = "rgba(" + col.r + "," + col.g + "," + col.b + "," + alpha.toFixed(2) + ")";
    var dither = config.dithering || 0;

    // If dithering, draw to offscreen then punch holes
    if (dither > 0 && w > 0 && h > 0) {
        var margin = (config.glow ? (config.glowIntensity || 8) * 2 : 0);
        var bw = w + margin * 2 + 4; var bh = h + margin * 2 + 4;
        var dc = getDitherCanvas(bw, bh);
        dc.ctx.clearRect(0, 0, bw, bh);
        dc.ctx.save();
        dc.ctx.translate(bw / 2, bh / 2);
        if (config.glow) { dc.ctx.shadowColor = "rgba(" + col.r + "," + col.g + "," + col.b + "," + (alpha * 0.6).toFixed(2) + ")"; dc.ctx.shadowBlur = config.glowIntensity || 8; }
        dc.ctx.fillStyle = colorStr; dc.ctx.strokeStyle = colorStr;
        var shape = config.shape || "square";
        if (shape === "circle") { dc.ctx.beginPath(); dc.ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); dc.ctx.fill(); }
        else if (shape === "triangle") { dc.ctx.beginPath(); dc.ctx.moveTo(0, -h / 2); dc.ctx.lineTo(-w / 2, h / 2); dc.ctx.lineTo(w / 2, h / 2); dc.ctx.closePath(); dc.ctx.fill(); }
        else if (shape === "wave") { dc.ctx.lineWidth = Math.max(1, Math.round(baseSize * 0.4)); dc.ctx.lineCap = "round"; dc.ctx.beginPath(); for (var wi = 0; wi <= 6; wi++) { var fx = -w / 2 + (w / 6) * wi; var fy = Math.sin((wi / 6) * Math.PI * 2) * (h / 2); if (wi === 0) dc.ctx.moveTo(fx, fy); else dc.ctx.lineTo(fx, fy); } dc.ctx.stroke(); }
        else if (shape === "halfmoon") { dc.ctx.beginPath(); dc.ctx.arc(0, 0, w / 2, -Math.PI / 2, Math.PI / 2, false); dc.ctx.arc(-w * 0.15, 0, w / 2.8, Math.PI / 2, -Math.PI / 2, true); dc.ctx.closePath(); dc.ctx.fill(); }
        else { dc.ctx.fillRect(-w / 2, -h / 2, w, h); }
        dc.ctx.shadowColor = "transparent"; dc.ctx.shadowBlur = 0;
        dc.ctx.restore();
        // Punch out random pixels
        var imgData = dc.ctx.getImageData(0, 0, bw, bh);
        var data = imgData.data;
        for (var di = 3; di < data.length; di += 4) {
            if (data[di] > 0 && Math.random() < dither) { data[di] = 0; }
        }
        dc.ctx.putImageData(imgData, 0, 0);
        // Draw to main canvas
        ctx.save();
        ctx.translate(px, py);
        if (config.faceVelocity) ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.drawImage(dc.canvas, 0, 0, bw, bh, -bw / 2, -bh / 2, bw, bh);
        ctx.restore();
        return;
    }

    // Non-dithered path (unchanged)
    ctx.save(); ctx.translate(px, py);
    if (config.faceVelocity) ctx.rotate(Math.atan2(p.vy, p.vx));
    if (config.glow) { ctx.shadowColor = "rgba(" + col.r + "," + col.g + "," + col.b + "," + (alpha * 0.6).toFixed(2) + ")"; ctx.shadowBlur = config.glowIntensity || 8; }
    ctx.fillStyle = colorStr;
    var shape2 = config.shape || "square";
    if (shape2 === "circle") { ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
    else if (shape2 === "triangle") { ctx.beginPath(); ctx.moveTo(0, -h / 2); ctx.lineTo(-w / 2, h / 2); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill(); }
    else if (shape2 === "wave") { ctx.strokeStyle = colorStr; ctx.lineWidth = Math.max(1, Math.round(baseSize * 0.4)); ctx.lineCap = "round"; ctx.beginPath(); for (var i = 0; i <= 6; i++) { var fx2 = -w / 2 + (w / 6) * i; var fy2 = Math.sin((i / 6) * Math.PI * 2) * (h / 2); if (i === 0) ctx.moveTo(fx2, fy2); else ctx.lineTo(fx2, fy2); } ctx.stroke(); }
    else if (shape2 === "halfmoon") { ctx.beginPath(); ctx.arc(0, 0, w / 2, -Math.PI / 2, Math.PI / 2, false); ctx.arc(-w * 0.15, 0, w / 2.8, Math.PI / 2, -Math.PI / 2, true); ctx.closePath(); ctx.fill(); }
    else { ctx.fillRect(-w / 2, -h / 2, w, h); }
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.restore();
}

function drawGrid(ctx, w, h, panX, panY) {
    ctx.strokeStyle = GRID_COLOR; ctx.lineWidth = 1;
    // Draw from center, offset by pan
    var cx = w / 2 + panX; var cy = h / 2 + panY;
    var startX = cx % GRID_SIZE; var startY = cy % GRID_SIZE;
    for (var x = startX; x < w; x += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
    for (var y = startY; y < h; y += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
    // Center crosshair
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
}

function drawEmitterHandle(ctx, x, y, handleColor, selected, label) {
    var s = EMITTER_HANDLE_SIZE;
    if (selected) { ctx.shadowColor = handleColor; ctx.shadowBlur = 10; }
    ctx.strokeStyle = handleColor; ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(x - s / 2, y - s / 2, s, s);
    ctx.fillStyle = selected ? handleColor + "55" : handleColor + "22";
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
    ctx.strokeStyle = handleColor + (selected ? "cc" : "66"); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.stroke();
    if (label) { ctx.font = "9px monospace"; ctx.fillStyle = handleColor; ctx.textAlign = "center"; ctx.fillText(label, x, y - s - 4); }
}

// Mini curve preview for the panel
function drawCurvePreview(curveName) {
    var points = [];
    for (var i = 0; i <= 20; i++) {
        var t = i / 20;
        points.push({ x: t, y: evaluateCurve(curveName, t) });
    }
    return points;
}

// ============================================
// STYLES (compact)
// ============================================
var S = {
    container: { display: "flex", width: "100%", height: "100vh", background: "#0d0d0d", fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace", color: "#ccc", fontSize: "12px", overflow: "hidden" },
    leftPanel: { width: LIBRARY_WIDTH, background: "#0a0a0a", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", overflowY: "auto" },
    libHeader: { padding: "12px 12px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#f59e0b", borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", position: "sticky", top: 0, zIndex: 2 },
    tplItem: { padding: "8px 12px", borderBottom: "1px solid #141414", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" },
    tplName: { fontSize: "11px", letterSpacing: "0.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
    tplActions: { display: "flex", gap: 4, flexShrink: 0, marginLeft: 6 },
    tplBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "11px", padding: "2px 4px", borderRadius: 3, lineHeight: 1 },
    addBtn: { margin: "8px 12px", padding: "8px", background: "#1a1a1a", color: "#00ffaa", border: "1px dashed #333", fontSize: "10px", fontFamily: "inherit", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer", borderRadius: 4, textAlign: "center" },
    emItem: { padding: "6px 12px", borderBottom: "1px solid #141414", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" },
    emDot: { width: 8, height: 8, borderRadius: "50%", marginRight: 8, flexShrink: 0 },
    emLabel: { fontSize: "10px", letterSpacing: "0.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
    emPos: { fontSize: "9px", color: "#555", marginLeft: 4, flexShrink: 0 },
    canvasWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", background: "#0a0a0a" },
    canvas: { border: "1px solid #1a1a1a", cursor: "crosshair", imageRendering: "pixelated" },
    statusBar: { position: "absolute", bottom: 8, left: 8, color: "#555", fontSize: "10px", userSelect: "none" },
    posLabel: { color: "#555", fontSize: "10px", textAlign: "center", marginTop: 4 },
    panel: { width: PANEL_WIDTH, background: "#111", borderLeft: "1px solid #1a1a1a", overflowY: "auto", display: "flex", flexDirection: "column" },
    panelHeader: { padding: "12px 14px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#00ffaa", borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", position: "sticky", top: 0, zIndex: 2 },
    section: { padding: "10px 14px", borderBottom: "1px solid #1a1a1a" },
    secTitle: { fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px", color: "#666", marginBottom: 8 },
    row: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 },
    label: { color: "#888", fontSize: "11px", whiteSpace: "nowrap", minWidth: 90 },
    val: { color: "#00ffaa", fontSize: "11px", fontWeight: 600, minWidth: 36, textAlign: "right" },
    slider: { flex: 1, height: 4, appearance: "none", WebkitAppearance: "none", background: "#222", borderRadius: 2, outline: "none", cursor: "pointer", accentColor: "#00ffaa" },
    textIn: { background: "#1a1a1a", border: "1px solid #333", color: "#fff", padding: "4px 8px", fontSize: "11px", fontFamily: "inherit", borderRadius: 3, flex: 1, outline: "none" },
    colorIn: { width: 32, height: 22, border: "1px solid #333", background: "none", cursor: "pointer", padding: 0, borderRadius: 3 },
    toggle: { width: 36, height: 18, borderRadius: 9, cursor: "pointer", border: "none", position: "relative" },
    knob: { width: 14, height: 14, borderRadius: 7, background: "#fff", position: "absolute", top: 2, transition: "left 0.15s" },
    select: { background: "#1a1a1a", border: "1px solid #333", color: "#fff", padding: "4px 8px", fontSize: "11px", fontFamily: "inherit", borderRadius: 3, cursor: "pointer", outline: "none" },
    expBtn: { width: "100%", padding: "10px", background: "#00ffaa", color: "#0d0d0d", border: "none", fontWeight: 700, fontSize: "11px", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "1.5px", cursor: "pointer", borderRadius: 3, marginTop: 4 },
    burstBtn: { width: "100%", padding: "10px", background: "#ff6b6b", color: "#fff", border: "none", fontWeight: 700, fontSize: "11px", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "1.5px", cursor: "pointer", borderRadius: 3, marginTop: 4 },
    rstBtn: { width: "100%", padding: "8px", background: "transparent", color: "#666", border: "1px solid #333", fontWeight: 600, fontSize: "10px", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "1px", cursor: "pointer", borderRadius: 3, marginTop: 4 },
    expArea: { width: "100%", background: "#0a0a0a", border: "1px solid #333", color: "#00ffaa", fontFamily: "inherit", fontSize: "10px", padding: 8, borderRadius: 3, resize: "vertical", minHeight: 80, marginTop: 8, outline: "none", boxSizing: "border-box" },
    noSel: { padding: "30px 14px", textAlign: "center", color: "#444", fontSize: "11px", letterSpacing: "1px" },
    tplSelect: { background: "#1a1a1a", border: "1px solid #333", color: "#fff", padding: "4px 8px", fontSize: "11px", fontFamily: "inherit", borderRadius: 3, cursor: "pointer", outline: "none", width: "100%" },
    gradBar: { height: 12, borderRadius: 3, border: "1px solid #333", marginBottom: 8 },
    cb: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "11px", color: "#888", marginBottom: 4, userSelect: "none" },
    cbIn: { accentColor: "#00ffaa", width: 14, height: 14, cursor: "pointer" },
    tlBar: { width: "100%", height: TIMELINE_HEIGHT, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 4, position: "relative", overflow: "hidden", marginTop: 6, cursor: "pointer" },
    tlHead: { position: "absolute", top: 0, bottom: 0, width: 2, background: "#00ffaa", zIndex: 3, pointerEvents: "none" },
    // Curve preview
    curveSelect: { background: "#1a1a1a", border: "1px solid #333", color: "#fff", padding: "3px 6px", fontSize: "10px", fontFamily: "inherit", borderRadius: 3, cursor: "pointer", outline: "none", flex: 1 },
    curvePreview: { width: 50, height: 20, border: "1px solid #333", borderRadius: 2, marginLeft: 6, flexShrink: 0 },
};

// ============================================
// COMPONENT
// ============================================
function ParticleEditor() {
    var canvasRef = useRef(null); var lastTimeRef = useRef(null); var animFrameRef = useRef(null); var draggingIdRef = useRef(null);
    var [templates, setTemplates] = useState(STARTER_TEMPLATES.map(deepClone));
    var [activeTemplateIndex, setActiveTemplateIndex] = useState(null);
    var [unsavedChanges, setUnsavedChanges] = useState(false);
    var [emitters, setEmitters] = useState([]); var [selectedEmitterId, setSelectedEmitterId] = useState(null);
    var emittersRef = useRef(emitters);
    var [particleCount, setParticleCount] = useState(0); var [paused, setPaused] = useState(false);
    var [showExport, setShowExport] = useState(false); var [exportJSON, setExportJSON] = useState(""); var [showHelp, setShowHelp] = useState(false);
    var [showGrid, setShowGrid] = useState(true); var [showHandles, setShowHandles] = useState(true);
    var [bgBrightness, setBgBrightness] = useState(0); var [zoom, setZoom] = useState(1);
    var [panX, setPanX] = useState(0); var [panY, setPanY] = useState(0);
    var [useTimeline, setUseTimeline] = useState(false); var [systemDuration, setSystemDuration] = useState(DEFAULT_SYSTEM_DURATION);
    var [systemLoop, setSystemLoop] = useState(true); var [systemTime, setSystemTime] = useState(0);
    var systemTimeRef = useRef(0); var prevSystemTimeRef = useRef(0);
    var panningRef = useRef(false); var panStartRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

    var pausedRef = useRef(paused); var selectedEmitterIdRef = useRef(selectedEmitterId);
    var useTimelineRef = useRef(useTimeline); var systemDurationRef = useRef(systemDuration); var systemLoopRef = useRef(systemLoop);
    var showGridRef = useRef(showGrid); var showHandlesRef = useRef(showHandles);
    var bgBrightnessRef = useRef(bgBrightness); var zoomRef = useRef(zoom);
    var panXRef = useRef(panX); var panYRef = useRef(panY);

    useEffect(function() { emittersRef.current = emitters; }, [emitters]);
    useEffect(function() { pausedRef.current = paused; }, [paused]);
    useEffect(function() { selectedEmitterIdRef.current = selectedEmitterId; }, [selectedEmitterId]);
    useEffect(function() { useTimelineRef.current = useTimeline; }, [useTimeline]);
    useEffect(function() { systemDurationRef.current = systemDuration; }, [systemDuration]);
    useEffect(function() { systemLoopRef.current = systemLoop; }, [systemLoop]);
    useEffect(function() { showGridRef.current = showGrid; }, [showGrid]);
    useEffect(function() { showHandlesRef.current = showHandles; }, [showHandles]);
    useEffect(function() { bgBrightnessRef.current = bgBrightness; }, [bgBrightness]);
    useEffect(function() { zoomRef.current = zoom; }, [zoom]);
    useEffect(function() { panXRef.current = panX; }, [panX]);
    useEffect(function() { panYRef.current = panY; }, [panY]);

    var selectedEmitter = null;
    for (var i = 0; i < emitters.length; i++) { if (emitters[i].id === selectedEmitterId) { selectedEmitter = emitters[i]; break; } }

    // All action functions (same as before, compressed)
    function handleLoadTemplate(idx) { setActiveTemplateIndex(idx); }
    function handleSaveTemplate() { if (activeTemplateIndex === null || !selectedEmitter) return; setTemplates(function(p) { var n = p.map(deepClone); n[activeTemplateIndex] = deepClone(selectedEmitter.config); return n; }); setUnsavedChanges(false); }
    function handleSaveAsNew() { if (!selectedEmitter) return; var t = deepClone(selectedEmitter.config); t.name += "_copy"; setTemplates(function(p) { return p.map(deepClone).concat([t]); }); }
    function handleDupTpl(idx) { var d = deepClone(templates[idx]); d.name += "_copy"; setTemplates(function(p) { return p.map(deepClone).concat([d]); }); }
    function handleDelTpl(idx) { setTemplates(function(p) { return p.filter(function(_, i) { return i !== idx; }); }); if (activeTemplateIndex === idx) setActiveTemplateIndex(null); else if (activeTemplateIndex > idx) setActiveTemplateIndex(activeTemplateIndex - 1); }
    function handleNewTpl() { var t = deepClone(DEFAULT_CONFIG); t.name = "new_template"; setTemplates(function(p) { return p.map(deepClone).concat([t]); }); }
    function handleAddEmitter() {
        var ti = activeTemplateIndex !== null ? activeTemplateIndex : 0; if (!templates.length) return;
        var tpl = templates[ti] || templates[0]; var id = makeEmitterId(); var color = EMITTER_COLORS[emitters.length % EMITTER_COLORS.length];
        // Emitters spawn at center of canvas (which is 0,0 in our coordinate system = CANVAS_WIDTH/2, CANVAS_HEIGHT/2)
        var newEm = { id: id, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, config: deepClone(tpl), particles: [], spawnAcc: 0, handleColor: color, startTime: 0, emitterLoop: true, emitterDuration: 2.0, hasFiredBurst: false, burstAcc: 0, burstElapsed: 0, emitterElapsed: 0 };
        setEmitters(function(p) { return p.concat([newEm]); }); setSelectedEmitterId(id);
    }
    function handleDelEmitter(id) { setEmitters(function(p) { return p.filter(function(e) { return e.id !== id; }); }); if (selectedEmitterId === id) setSelectedEmitterId(null); }
    function handleSelEmitter(id) { setSelectedEmitterId(id); }
    function handleApplyTpl(idx) { if (!selectedEmitterId) return; var tpl = templates[idx]; if (!tpl) return; setEmitters(function(p) { return p.map(function(e) { return e.id === selectedEmitterId ? Object.assign({}, e, { config: deepClone(tpl), particles: [], spawnAcc: 0, hasFiredBurst: false, burstAcc: 0, burstElapsed: 0, emitterElapsed: 0 }) : e; }); }); }
    function handleBurst() { if (!selectedEmitter) return; var cfg = selectedEmitter.config; setEmitters(function(p) { return p.map(function(e) { if (e.id !== selectedEmitterId) return e; var np = e.particles.slice(); for (var b = 0; b < (cfg.burstCount || 10); b++) { if (np.length < MAX_PARTICLES) np.push(createParticle(e.x, e.y, cfg)); } return Object.assign({}, e, { particles: np, burstAcc: cfg.burstRepeat ? 0 : e.burstAcc, burstElapsed: cfg.burstRepeat ? 0 : e.burstElapsed, hasFiredBurst: cfg.burstRepeat ? false : e.hasFiredBurst }); }); }); }
    function handleEmStartTime(v) { if (!selectedEmitterId) return; setEmitters(function(p) { return p.map(function(e) { return e.id === selectedEmitterId ? Object.assign({}, e, { startTime: v }) : e; }); }); }
    function handleEmLoop(v) { if (!selectedEmitterId) return; setEmitters(function(p) { return p.map(function(e) { return e.id === selectedEmitterId ? Object.assign({}, e, { emitterLoop: v }) : e; }); }); }
    function handleEmDuration(v) { if (!selectedEmitterId) return; setEmitters(function(p) { return p.map(function(e) { return e.id === selectedEmitterId ? Object.assign({}, e, { emitterDuration: v }) : e; }); }); }
    function handleParamChange(key, value) { if (!selectedEmitterId) return; setEmitters(function(p) { return p.map(function(e) { return e.id === selectedEmitterId ? Object.assign({}, e, { config: setNestedValue(e.config, key, value) }) : e; }); }); setUnsavedChanges(true); }
    function handleRestartTL() { systemTimeRef.current = 0; prevSystemTimeRef.current = 0; setSystemTime(0); setEmitters(function(p) { return p.map(function(e) { return Object.assign({}, e, { particles: [], spawnAcc: 0, hasFiredBurst: false, burstAcc: 0, burstElapsed: 0, emitterElapsed: 0 }); }); }); }

    // ---- MAIN LOOP ----
    var tick = useCallback(function(timestamp) {
        var canvas = canvasRef.current; if (!canvas) return; var ctx = canvas.getContext("2d");
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        var dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05); lastTimeRef.current = timestamp;
        var allEm = emittersRef.current; var selId = selectedEmitterIdRef.current;
        var tlActive = useTimelineRef.current; var sysDur = systemDurationRef.current; var sysLoop = systemLoopRef.current;
        var z = zoomRef.current; var px = panXRef.current; var py = panYRef.current;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        var bg = bgBrightnessRef.current;
        if (bg > 0) { var bv = Math.round(bg * 255); ctx.fillStyle = "rgb(" + bv + "," + bv + "," + bv + ")"; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }

        ctx.save();
        // Apply zoom centered, then pan
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.scale(z, z);
        ctx.translate(-CANVAS_WIDTH / 2 + px, -CANVAS_HEIGHT / 2 + py);

        if (showGridRef.current) drawGrid(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0);

        var sysTime = systemTimeRef.current;
        if (!pausedRef.current && tlActive) {
            sysTime += dt;
            if (sysTime >= sysDur) {
                if (sysLoop) { sysTime = sysTime % sysDur; for (var r = 0; r < allEm.length; r++) { allEm[r].hasFiredBurst = false; allEm[r].burstAcc = 0; allEm[r].burstElapsed = 0; allEm[r].emitterElapsed = 0; } }
                else { sysTime = sysDur; }
            }
            prevSystemTimeRef.current = systemTimeRef.current; systemTimeRef.current = sysTime;
        }

        var totalP = 0;
        for (var i = 0; i < allEm.length; i++) {
            var em = allEm[i]; var cfg = em.config; var parts = em.particles; var active = true;

            // Track emitter elapsed time
            if (!em.emitterElapsed) em.emitterElapsed = 0;
            if (!pausedRef.current && active) em.emitterElapsed += dt;

            if (tlActive) {
                if (sysTime < (em.startTime || 0)) active = false;
                if (!sysLoop && sysTime >= sysDur) active = false;
                if (active && !em.emitterLoop && cfg.burstMode && !cfg.burstRepeat && em.hasFiredBurst) active = false;
                if (active && !em.emitterLoop && cfg.burstMode && cfg.burstRepeat && em.burstElapsed >= (cfg.burstDuration || 1)) active = false;
            }
            // Emitter duration check (only when not looping)
            if (active && !em.emitterLoop && em.emitterDuration > 0) {
                var emElapsed = tlActive ? (sysTime - (em.startTime || 0)) : em.emitterElapsed;
                if (emElapsed > em.emitterDuration) active = false;
            }
            if (!pausedRef.current && active) {
                if (cfg.burstMode) {
                    if (cfg.burstRepeat) {
                        if (em.burstElapsed < (cfg.burstDuration || 1)) { em.burstElapsed += dt; var iv = 1 / (cfg.burstRate || 5); em.burstAcc += dt; while (em.burstAcc >= iv && em.burstElapsed <= (cfg.burstDuration || 1)) { em.burstAcc -= iv; for (var b = 0; b < (cfg.burstCount || 10); b++) { if (totalP + parts.length < MAX_PARTICLES) parts.push(createParticle(em.x, em.y, cfg)); } } em.hasFiredBurst = true; }
                    } else { if (tlActive && !em.hasFiredBurst && sysTime >= (em.startTime || 0)) { for (var b2 = 0; b2 < (cfg.burstCount || 10); b2++) { if (totalP + parts.length < MAX_PARTICLES) parts.push(createParticle(em.x, em.y, cfg)); } em.hasFiredBurst = true; } }
                } else { em.spawnAcc += cfg.spawnRate * dt; var sp = Math.floor(em.spawnAcc); em.spawnAcc -= sp; for (var s = 0; s < sp; s++) { if (totalP + parts.length < MAX_PARTICLES) parts.push(createParticle(em.x, em.y, cfg)); } }
            }
            if (!pausedRef.current) { for (var j = parts.length - 1; j >= 0; j--) { updateParticle(parts[j], dt, cfg); if (!parts[j].alive) parts.splice(j, 1); } }
            for (var k = 0; k < parts.length; k++) drawParticle(ctx, parts[k], cfg);
            totalP += parts.length;
        }
        if (showHandlesRef.current) { for (var h = 0; h < allEm.length; h++) { var e = allEm[h]; drawEmitterHandle(ctx, e.x, e.y, e.handleColor, e.id === selId, e.config.name); } }
        ctx.restore();

        setParticleCount(totalP);
        if (tlActive) setSystemTime(sysTime);
        animFrameRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(function() { animFrameRef.current = requestAnimationFrame(tick); return function() { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); }; }, [tick]);

    // ---- MOUSE ----
    function handleMouseDown(e) {
        // Middle click = pan
        if (e.button === 1) { e.preventDefault(); panningRef.current = true; panStartRef.current = { x: e.clientX, y: e.clientY, px: panX, py: panY }; return; }
        if (e.button !== 0) return;
        var rect = canvasRef.current.getBoundingClientRect();
        var z = zoom; var mx = (e.clientX - rect.left - CANVAS_WIDTH / 2) / z + CANVAS_WIDTH / 2 - panX; var my = (e.clientY - rect.top - CANVAS_HEIGHT / 2) / z + CANVAS_HEIGHT / 2 - panY;
        for (var i = emitters.length - 1; i >= 0; i--) {
            var em = emitters[i];
            if (Math.abs(mx - em.x) < EMITTER_HANDLE_SIZE / z && Math.abs(my - em.y) < EMITTER_HANDLE_SIZE / z) { draggingIdRef.current = em.id; setSelectedEmitterId(em.id); return; }
        }
        setSelectedEmitterId(null);
    }
    function handleMouseMove(e) {
        if (panningRef.current) {
            var dx = (e.clientX - panStartRef.current.x) / zoom; var dy = (e.clientY - panStartRef.current.y) / zoom;
            setPanX(panStartRef.current.px + dx); setPanY(panStartRef.current.py + dy); return;
        }
        if (!draggingIdRef.current) return;
        var rect = canvasRef.current.getBoundingClientRect(); var z = zoom;
        var mx = (e.clientX - rect.left - CANVAS_WIDTH / 2) / z + CANVAS_WIDTH / 2 - panX;
        var my = (e.clientY - rect.top - CANVAS_HEIGHT / 2) / z + CANVAS_HEIGHT / 2 - panY;
        setEmitters(function(prev) { return prev.map(function(em) { return em.id === draggingIdRef.current ? Object.assign({}, em, { x: Math.round(mx), y: Math.round(my) }) : em; }); });
    }
    function handleMouseUp(e) { if (e && e.button === 1) panningRef.current = false; draggingIdRef.current = null; }
    // Prevent context menu on middle click
    function handleContextMenu(e) { if (e.button === 1) e.preventDefault(); }

    // ---- EXPORT ----
    function cfgExport(cfg) {
        return { name: cfg.name, size: cfg.size, sizeOverLifetime: cfg.sizeOverLifetime, sizeCurve: cfg.sizeCurve, scaleX: cfg.scaleX, scaleY: cfg.scaleY,
            speed: cfg.speed, lifetime: cfg.lifetime, speedCurve: cfg.speedCurve,
            colorStart: cfg.colorStart, colorMid: cfg.colorMid, colorEnd: cfg.colorEnd, colorMidPoint: cfg.colorMidPoint, colorCurve: cfg.colorCurve,
            fadeOut: cfg.fadeOut, opacityCurve: cfg.opacityCurve, gravity: cfg.gravity, spread: cfg.spread, spawnRate: cfg.spawnRate, direction: cfg.direction,
            shape: cfg.shape, damping: cfg.damping, burstMode: cfg.burstMode, burstCount: cfg.burstCount, burstRepeat: cfg.burstRepeat, burstRate: cfg.burstRate, burstDuration: cfg.burstDuration,
            faceVelocity: cfg.faceVelocity, dithering: cfg.dithering, glow: cfg.glow, glowIntensity: cfg.glowIntensity };
    }
    function handleExportScene() {
        var sc = { systemDuration: systemDuration, systemLoop: systemLoop, useTimeline: useTimeline, templates: templates.map(cfgExport),
            emitters: emitters.map(function(em) { return { id: em.id, position: { x: em.x, y: em.y }, startTime: em.startTime, emitterLoop: em.emitterLoop, emitterDuration: em.emitterDuration, config: cfgExport(em.config) }; }) };
        setExportJSON(JSON.stringify(sc, null, 2)); setShowExport(true);
    }
    function handleExportSel() { if (!selectedEmitter) return; var o = cfgExport(selectedEmitter.config); o.position = { x: selectedEmitter.x, y: selectedEmitter.y }; o.startTime = selectedEmitter.startTime; o.emitterLoop = selectedEmitter.emitterLoop; o.emitterDuration = selectedEmitter.emitterDuration; setExportJSON(JSON.stringify(o, null, 2)); setShowExport(true); }
    function handleClearScene() { setEmitters([]); setSelectedEmitterId(null); setShowExport(false); }
    function handleCopy() { navigator.clipboard.writeText(exportJSON); }

    // ---- RENDER HELPERS ----
    function shouldShow(def, cfg) { if (def.showIf && !cfg[def.showIf]) return false; if (def.hideIf && cfg[def.hideIf]) return false; return true; }

    function CurvePreviewSVG(props) {
        var pts = drawCurvePreview(props.curve);
        var d = "M " + pts.map(function(p) { return (p.x * 48 + 1) + " " + ((1 - p.y) * 18 + 1); }).join(" L ");
        return (<svg width={50} height={20} style={S.curvePreview}><path d={d} stroke="#00ffaa" strokeWidth={1.5} fill="none" /></svg>);
    }

    function renderParam(def) {
        if (!selectedEmitter) return null; if (!shouldShow(def, selectedEmitter.config)) return null;
        var val = getNestedValue(selectedEmitter.config, def.key);
        if (def.type === "text") return (<div key={def.key} style={S.row}><span style={S.label}>{def.label}</span><input style={S.textIn} value={val} onChange={function(e) { handleParamChange(def.key, e.target.value); }} /></div>);
        if (def.type === "slider") return (<div key={def.key} style={S.row}><span style={S.label}>{def.label}</span><input type="range" style={S.slider} min={def.min} max={def.max} step={def.step} value={val} onChange={function(e) { handleParamChange(def.key, def.step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value)); }} /><span style={S.val}>{val}</span></div>);
        if (def.type === "color") return (<div key={def.key} style={S.row}><span style={S.label}>{def.label}</span><input type="color" style={S.colorIn} value={val} onChange={function(e) { handleParamChange(def.key, e.target.value); }} /><span style={S.val}>{val}</span></div>);
        if (def.type === "toggle") return (<div key={def.key} style={S.row}><span style={S.label}>{def.label}</span><button style={{ ...S.toggle, background: val ? "#00ffaa" : "#333" }} onClick={function() { handleParamChange(def.key, !val); }}><div style={{ ...S.knob, left: val ? 20 : 2 }} /></button></div>);
        if (def.type === "select") return (<div key={def.key} style={S.row}><span style={S.label}>{def.label}</span><select style={S.select} value={val} onChange={function(e) { handleParamChange(def.key, e.target.value); }}>{def.options.map(function(o) { return <option key={o} value={o}>{o}</option>; })}</select></div>);
        if (def.type === "curve") return (<div key={def.key} style={S.row}><span style={S.label}>{def.label}</span><select style={S.curveSelect} value={val || "linear"} onChange={function(e) { handleParamChange(def.key, e.target.value); }}>{CURVE_NAMES.map(function(c) { return <option key={c} value={c}>{CURVE_LABELS[c]}</option>; })}</select><CurvePreviewSVG curve={val || "linear"} /></div>);
        return null;
    }
    function renderGroup(g) { return PARAM_DEFS.filter(function(d) { return d.group === g; }).map(renderParam); }
    function renderColorPreview() { if (!selectedEmitter) return null; var c = selectedEmitter.config; return <div style={{ ...S.gradBar, background: "linear-gradient(to right, " + c.colorStart + ", " + c.colorMid + " " + Math.round(c.colorMidPoint * 100) + "%, " + c.colorEnd + ")" }} />; }
    function renderTimeline() {
        var pct = systemDuration > 0 ? (systemTime / systemDuration) * 100 : 0;
        return (<div style={S.tlBar} onClick={function(e) { var rect = e.currentTarget.getBoundingClientRect(); var t = ((e.clientX - rect.left) / rect.width) * systemDuration; systemTimeRef.current = Math.max(0, Math.min(systemDuration, t)); prevSystemTimeRef.current = systemTimeRef.current; setSystemTime(systemTimeRef.current); setEmitters(function(p) { return p.map(function(em) { return Object.assign({}, em, { hasFiredBurst: false, burstAcc: 0, burstElapsed: 0, emitterElapsed: 0 }); }); }); }}>
            {emitters.map(function(em) { var sp = systemDuration > 0 ? ((em.startTime || 0) / systemDuration) * 100 : 0; return <div key={em.id} style={{ position: "absolute", top: 2, height: TIMELINE_HEIGHT - 4, left: sp + "%", width: 4, background: em.handleColor, borderRadius: 2, opacity: 0.5, pointerEvents: "none" }} />; })}
            <div style={{ ...S.tlHead, left: pct + "%" }} /><div style={{ position: "absolute", bottom: 2, right: 4, fontSize: "9px", color: "#555", pointerEvents: "none" }}>{systemTime.toFixed(2)}s / {systemDuration.toFixed(1)}s</div>
        </div>);
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div style={S.container}>
            <div style={S.leftPanel}>
                <div style={S.libHeader}>Templates ({templates.length})</div>
                {templates.map(function(tpl, idx) { var a = idx === activeTemplateIndex; return (
                    <div key={"t" + idx} style={{ ...S.tplItem, background: a ? "#1a1a1a" : "transparent", borderLeft: a ? "3px solid #f59e0b" : "3px solid transparent" }} onClick={function() { handleLoadTemplate(idx); }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: tpl.colorStart, marginRight: 8, flexShrink: 0 }} />
                        <span style={{ ...S.tplName, color: a ? "#f59e0b" : "#aaa" }}>{tpl.name}</span>
                        <div style={S.tplActions}><button style={{ ...S.tplBtn, color: "#888" }} onClick={function(e) { e.stopPropagation(); handleDupTpl(idx); }}>{"\u2398"}</button><button style={{ ...S.tplBtn, color: "#f44" }} onClick={function(e) { e.stopPropagation(); handleDelTpl(idx); }}>{"\u2715"}</button></div>
                    </div>); })}
                <button style={S.addBtn} onClick={handleNewTpl}>+ New Template</button>
                <button style={{ ...S.addBtn, color: "#00ffaa", borderColor: "#00ffaa44", background: "#0d1a14" }} onClick={handleAddEmitter}>+ Add Emitter to Scene</button>
                <div style={{ ...S.libHeader, color: "#00ffaa" }}>Scene ({emitters.length})</div>
                {emitters.map(function(em) { var sel = em.id === selectedEmitterId; return (
                    <div key={em.id} style={{ ...S.emItem, background: sel ? "#1a1a1a" : "transparent", borderLeft: "3px solid " + (sel ? em.handleColor : "transparent") }} onClick={function() { handleSelEmitter(em.id); }}>
                        <div style={{ ...S.emDot, background: em.handleColor }} /><span style={{ ...S.emLabel, color: sel ? em.handleColor : "#aaa" }}>{em.config.name}</span>
                        <span style={S.emPos}>({em.x},{em.y})</span><button style={{ ...S.tplBtn, color: "#f44", marginLeft: 4 }} onClick={function(e) { e.stopPropagation(); handleDelEmitter(em.id); }}>{"\u2715"}</button>
                    </div>); })}
                {emitters.length === 0 && <div style={{ padding: 12, color: "#333", fontSize: "10px", textAlign: "center" }}>No emitters yet.</div>}
            </div>

            <div style={S.canvasWrap}>
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={S.canvas}
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onContextMenu={handleContextMenu} />
                <div style={S.posLabel}>{selectedEmitter ? selectedEmitter.config.name + " (" + selectedEmitter.x + ", " + selectedEmitter.y + ")" : "Middle-click drag to pan"}</div>
                <div style={S.statusBar}>Particles: {particleCount} / {MAX_PARTICLES}{" | Emitters: " + emitters.length}{paused ? " | PAUSED" : ""}</div>
                <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 12 }}>
                    <label style={S.cb}><input type="checkbox" checked={showGrid} onChange={function() { setShowGrid(!showGrid); }} style={S.cbIn} />Grid</label>
                    <label style={S.cb}><input type="checkbox" checked={showHandles} onChange={function() { setShowHandles(!showHandles); }} style={S.cbIn} />Handles</label>
                </div>
                <div style={{ position: "absolute", top: 8, left: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: "9px", color: "#555", width: 24 }}>BG</span><input type="range" min={0} max={1} step={0.05} value={bgBrightness} onChange={function(e) { setBgBrightness(parseFloat(e.target.value)); }} style={{ width: 80, height: 3, accentColor: "#888", cursor: "pointer" }} /></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: "9px", color: "#555", width: 24 }}>Zoom</span><input type="range" min={0.25} max={4} step={0.25} value={zoom} onChange={function(e) { setZoom(parseFloat(e.target.value)); }} style={{ width: 80, height: 3, accentColor: "#00ffaa", cursor: "pointer" }} /><span style={{ fontSize: "9px", color: "#555" }}>{zoom.toFixed(2)}x</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><button onClick={function() { setPanX(0); setPanY(0); }} style={{ fontSize: "8px", color: "#555", background: "none", border: "1px solid #333", borderRadius: 3, padding: "2px 6px", cursor: "pointer", fontFamily: "inherit" }}>Reset Pan</button></div>
                </div>
            </div>

            <div style={S.panel}>
                <div style={S.panelHeader}>
                    <span>{selectedEmitter ? selectedEmitter.config.name : "Particle Editor"}{unsavedChanges && selectedEmitter && <span style={{ color: "#f59e0b", marginLeft: 8, fontSize: "9px" }}>{"\u25CF"} EDITED</span>}</span>
                    <span style={{ float: "right", display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ cursor: "pointer", color: "#555", fontSize: "12px", fontWeight: "bold" }} onClick={function() { setShowHelp(true); }}>?</span>
                        <span style={{ cursor: "pointer", color: paused ? "#f44" : "#00ffaa" }} onClick={function() { setPaused(!paused); }}>{paused ? "\u25B6 PLAY" : "\u23F8 PAUSE"}</span>
                    </span>
                </div>

                <div style={S.section}><div style={S.secTitle}>Timeline</div>
                    <div style={S.row}><span style={S.label}>Enable Timeline</span><button style={{ ...S.toggle, background: useTimeline ? "#00ffaa" : "#333" }} onClick={function() { setUseTimeline(!useTimeline); }}><div style={{ ...S.knob, left: useTimeline ? 20 : 2 }} /></button></div>
                    {useTimeline && (<><div style={S.row}><span style={S.label}>Duration (s)</span><input type="range" style={S.slider} min={0.5} max={10} step={0.1} value={systemDuration} onChange={function(e) { setSystemDuration(parseFloat(e.target.value)); }} /><span style={S.val}>{systemDuration.toFixed(1)}</span></div>
                        <div style={S.row}><span style={S.label}>System Loop</span><button style={{ ...S.toggle, background: systemLoop ? "#00ffaa" : "#333" }} onClick={function() { setSystemLoop(!systemLoop); }}><div style={{ ...S.knob, left: systemLoop ? 20 : 2 }} /></button></div>
                        {renderTimeline()}<button style={{ ...S.rstBtn, marginTop: 6, color: "#00ffaa", borderColor: "#00ffaa44" }} onClick={handleRestartTL}>Restart Timeline</button></>)}
                </div>

                {selectedEmitter ? (<>
                    {useTimeline && (<div style={S.section}><div style={S.secTitle}>Emitter Timing</div>
                        <div style={S.row}><span style={S.label}>Start Time (s)</span><input type="range" style={S.slider} min={0} max={systemDuration} step={0.05} value={selectedEmitter.startTime || 0} onChange={function(e) { handleEmStartTime(parseFloat(e.target.value)); }} /><span style={S.val}>{(selectedEmitter.startTime || 0).toFixed(2)}</span></div>
                    </div>)}

                    <div style={S.section}><div style={S.secTitle}>Emitter Lifetime</div>
                        <div style={S.row}><span style={S.label}>Emitter Loop</span><button style={{ ...S.toggle, background: selectedEmitter.emitterLoop ? "#00ffaa" : "#333" }} onClick={function() { handleEmLoop(!selectedEmitter.emitterLoop); }}><div style={{ ...S.knob, left: selectedEmitter.emitterLoop ? 20 : 2 }} /></button></div>
                        {!selectedEmitter.emitterLoop && (
                            <div style={S.row}><span style={S.label}>Duration (s)</span><input type="range" style={S.slider} min={0.1} max={10} step={0.1} value={selectedEmitter.emitterDuration || 2} onChange={function(e) { handleEmDuration(parseFloat(e.target.value)); }} /><span style={S.val}>{(selectedEmitter.emitterDuration || 2).toFixed(1)}</span></div>
                        )}
                    </div>
                    <div style={S.section}><div style={S.secTitle}>Apply Template</div><select style={S.tplSelect} value="" onChange={function(e) { var idx = parseInt(e.target.value); if (!isNaN(idx)) handleApplyTpl(idx); }}><option value="" disabled>Select a template...</option>{templates.map(function(t, i) { return <option key={i} value={i}>{t.name}</option>; })}</select></div>
                    <div style={S.section}><div style={S.secTitle}>Identity</div>{renderGroup("identity")}</div>
                    <div style={S.section}><div style={S.secTitle}>Emission</div>{renderGroup("emission")}
                        {selectedEmitter.config.burstMode && !useTimeline && <button style={S.burstBtn} onClick={handleBurst}>{"\u26A1"} Fire Burst</button>}
                        {selectedEmitter.config.burstMode && useTimeline && <div style={{ fontSize: "10px", color: "#555", marginTop: 4 }}>Bursts auto-fire at start time.</div>}
                    </div>
                    <div style={S.section}><div style={S.secTitle}>Size</div>{renderGroup("size")}</div>
                    <div style={S.section}><div style={S.secTitle}>Motion</div>{renderGroup("motion")}</div>
                    <div style={S.section}><div style={S.secTitle}>Appearance</div>{renderColorPreview()}{renderGroup("appearance")}</div>
                    <div style={S.section}><div style={S.secTitle}>Save</div>
                        {activeTemplateIndex !== null && <button style={S.expBtn} onClick={handleSaveTemplate}>Save to "{templates[activeTemplateIndex] ? templates[activeTemplateIndex].name : ""}"</button>}
                        <button style={{ ...S.rstBtn, color: "#00ffaa", borderColor: "#00ffaa44" }} onClick={handleSaveAsNew}>Save as New Template</button>
                    </div>
                </>) : <div style={S.noSel}>Select an emitter to edit, or add one from the left panel.</div>}

                <div style={S.section}><div style={S.secTitle}>Export</div>
                    {selectedEmitter && <button style={S.expBtn} onClick={handleExportSel}>Export Selected</button>}
                    <button style={{ ...S.expBtn, background: "#f59e0b", marginTop: 4 }} onClick={handleExportScene}>Export Full Scene</button>
                    <button style={S.rstBtn} onClick={handleClearScene}>Clear Scene</button>
                    {showExport && (<div><textarea style={S.expArea} value={exportJSON} readOnly rows={10} /><button style={{ ...S.rstBtn, marginTop: 4, color: "#00ffaa", borderColor: "#00ffaa" }} onClick={handleCopy}>Copy to Clipboard</button></div>)}
                </div>
            </div>

            {showHelp && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace" }} onClick={function(e) { if (e.target === e.currentTarget) setShowHelp(false); }}>
                    <div style={{ background: "#111", border: "1px solid #333", borderRadius: 8, padding: "24px 28px", maxWidth: 520, maxHeight: "80vh", overflowY: "auto", color: "#ccc", fontSize: "12px", lineHeight: 1.7 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <span style={{ fontSize: "13px", fontWeight: 700, color: "#00ffaa", letterSpacing: 2, textTransform: "uppercase" }}>How To Use</span>
                            <button onClick={function() { setShowHelp(false); }} style={{ background: "#222", border: "1px solid #333", color: "#888", padding: "4px 10px", cursor: "pointer", borderRadius: 4, fontFamily: "inherit", fontSize: "11px" }}>Close</button>
                        </div>
                        <div style={{ color: "#f59e0b", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>TEMPLATES</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>Reusable particle presets. Click to highlight, then "+ Add Emitter" to place it. Duplicate/delete with row buttons.</div>
                        <div style={{ color: "#00ffaa", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>CANVAS</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>Left-click handles to select and drag. Middle-click drag to pan. Grid/handle checkboxes top-right. BG brightness, zoom, and reset pan controls top-left. Emitters spawn at grid center.</div>
                        <div style={{ color: "#ff6b6b", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>SHAPES</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>Square, Circle, Triangle, Wave (sine squiggle), Half Moon. Scale X/Y to stretch. Face Velocity rotates particles toward movement direction.</div>
                        <div style={{ color: "#a29bfe", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>CURVES</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>Apply easing curves to Size, Opacity, Color, and Speed over lifetime. Linear (default), Ease In/Out, Quick In/Out, Pulse (bell), and Wave (oscillate). Each shows a mini preview of the curve shape.</div>
                        <div style={{ color: "#ff6b6b", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>BURST MODE</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>Single or repeating bursts. Burst Repeat fires X particles at Y/sec for Z seconds. With timeline, bursts auto-fire at start time.</div>
                        <div style={{ color: "#a29bfe", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>VISUAL EFFECTS</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>Dithering: grainy dissolve. Glow: soft bloom behind particles.</div>
                        <div style={{ color: "#a29bfe", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>TIMELINE</div>
                        <div style={{ marginBottom: 12, color: "#999" }}>Choreograph multi-emitter effects with duration, loop, and per-emitter start times.</div>
                        <div style={{ color: "#f59e0b", fontWeight: 600, marginBottom: 4, fontSize: "11px", letterSpacing: 1 }}>EXPORTING</div>
                        <div style={{ marginBottom: 4, color: "#999" }}>Export Selected or Full Scene as JSON. Copy and paste to Claude to build into the game.</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ParticleEditor;