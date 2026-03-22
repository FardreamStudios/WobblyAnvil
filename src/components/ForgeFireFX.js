// ============================================================
// ForgeFireFX.js — Wobbly Anvil Pixel Fire Effect
// 16-bit style fire VFX for the forge hearth.
//
// Three layers (back to front):
//   1. Ground glow (flat coal bed ellipse)
//   2. Fire core (two overlapping pulsing ovals, pyramid shape)
//   3. Spark particles (pixel embers rising upward)
//
// Plus a CSS radial glow for ambient light on surroundings.
//
// Startup: flare-up effect — scales from nothing, flashes
// bright, then settles to steady state.
//
// Props:
//   active  — boolean, shows/hides the effect
//   config  — optional overrides from constants
// ============================================================

import { useEffect, useRef } from "react";
import GameConstants from "../modules/constants.js";

var FIRE_FX = GameConstants.FIRE_FX;

// ============================================================
// Component
// ============================================================

function ForgeFireFX(props) {
    var active = props.active;
    var FIRE_FX = props.config || GameConstants.FIRE_FX;

    var bgRef = useRef(null);
    var fgRef = useRef(null);
    var glowRef = useRef(null);
    var wrapRef = useRef(null);
    var animRef = useRef(null);
    var stateRef = useRef(null);

    useEffect(function() {
        if (!active) {
            if (animRef.current) {
                cancelAnimationFrame(animRef.current);
                animRef.current = null;
            }
            stateRef.current = null;
            // Clear canvases
            if (bgRef.current) {
                var ctx = bgRef.current.getContext("2d");
                ctx.clearRect(0, 0, bgRef.current.width, bgRef.current.height);
            }
            if (fgRef.current) {
                var ctx2 = fgRef.current.getContext("2d");
                ctx2.clearRect(0, 0, fgRef.current.width, fgRef.current.height);
            }
            if (glowRef.current) {
                glowRef.current.style.background = "transparent";
            }
            return;
        }

        // --- Config ---
        var W = FIRE_FX.canvasW;
        var H = FIRE_FX.canvasH;
        var cx = W / 2;
        var baseY = H - 2;
        var coreRX = FIRE_FX.coalRX;
        var coreRY = FIRE_FX.coalRY;
        var spawnRadius = FIRE_FX.spawnRadius;
        var MAX_P = FIRE_FX.maxParticles;
        var ovals = [
            { cy: H - 7, rx: FIRE_FX.ovalMainRX, ry: FIRE_FX.ovalMainRY, baseHeat: 235, midHeat: 170 },
            { cy: H - 14, rx: FIRE_FX.ovalTopRX, ry: FIRE_FX.ovalTopRY, baseHeat: 245, midHeat: 190 },
        ];

        // --- Init canvases ---
        var bgCanvas = bgRef.current;
        var fgCanvas = fgRef.current;
        if (!bgCanvas || !fgCanvas) return;
        bgCanvas.width = W;
        bgCanvas.height = H;
        fgCanvas.width = W;
        fgCanvas.height = H;
        var bgCtx = bgCanvas.getContext("2d");
        var fgCtx = fgCanvas.getContext("2d");
        var bgImg = bgCtx.createImageData(W, H);
        var fgImg = fgCtx.createImageData(W, H);

        // --- Palette ---
        var palette = [];
        for (var i = 0; i < 256; i++) {
            var r, g, b;
            if (i < 40) { r = 80 + i * 2; g = 0; b = 0; }
            else if (i < 100) { r = 160 + (i - 40) * 1.6; g = (i - 40) * 1.8; b = 0; }
            else if (i < 180) { r = 255; g = 108 + (i - 100) * 1.8; b = 0; }
            else if (i < 230) { r = 255; g = 252; b = (i - 180) * 5; }
            else { r = 255; g = 255; b = Math.min(255, 250); }
            palette.push([Math.min(255, r), Math.min(255, g), Math.min(255, b)]);
        }

        // --- Wobble tables ---
        var wobbles = [[], []];
        for (var w = 0; w < 2; w++) {
            for (var j = 0; j < 32; j++) {
                wobbles[w].push({
                    phase: Math.random() * Math.PI * 2,
                    speed: (w === 0 ? 0.8 : 1.0) + Math.random() * 1.5,
                    amp: (w === 0 ? 0.8 : 0.6) + Math.random() * 1.2,
                });
            }
        }

        // --- State ---
        var particles = [];
        var glowPhase = 0;
        var globePhase = 0;
        var corePhase = 0;

        // --- Flare state ---
        var flareTime = 0;
        var FLARE_RAMP = FIRE_FX.flareRampFrames;    // frames to scale up
        var FLARE_FLASH = FIRE_FX.flareFlashFrames;   // frames of bright flash
        var FLARE_SETTLE = FIRE_FX.flareSettleFrames;  // frames to settle to normal
        var FLARE_TOTAL = FLARE_RAMP + FLARE_FLASH + FLARE_SETTLE;

        function getFlareScale() {
            if (flareTime >= FLARE_TOTAL) return 1.0;
            if (flareTime < FLARE_RAMP) {
                var t = flareTime / FLARE_RAMP;
                return t * t; // ease-in
            }
            return 1.0;
        }

        function getFlareBrightness() {
            if (flareTime >= FLARE_TOTAL) return 1.0;
            if (flareTime < FLARE_RAMP) return 1.0;
            var flashStart = FLARE_RAMP;
            var flashEnd = FLARE_RAMP + FLARE_FLASH;
            if (flareTime < flashEnd) {
                var t = (flareTime - flashStart) / FLARE_FLASH;
                return 1.0 + 0.8 * (1.0 - t); // bright flash fading
            }
            var settleT = (flareTime - flashEnd) / FLARE_SETTLE;
            return 1.0 + 0.2 * (1.0 - settleT); // gentle settle
        }

        // --- Spawn ---
        function spawn(scale) {
            var offsetX = (Math.random() - 0.5) * spawnRadius * 2 * scale;
            var speed = (0.15 + Math.random() * 0.3) * scale;
            var drift = -offsetX * 0.003;
            var life = 50 + Math.floor(Math.random() * 60);
            particles.push({
                x: cx + offsetX,
                y: ovals[0].cy + (Math.random() - 0.5) * 4,
                vx: drift + (Math.random() - 0.5) * 0.08,
                vy: -(speed),
                life: life, maxLife: life,
                heat: 200 + Math.floor(Math.random() * 55),
                size: Math.random() < 0.5 ? 3 : 2,
            });
        }

        // --- Helpers ---
        function setBgPixelMax(px, py, r, g, b, a) {
            if (px < 0 || px >= W || py < 0 || py >= H) return;
            var idx = (py * W + px) * 4;
            if (a > bgImg.data[idx + 3]) {
                bgImg.data[idx] = r;
                bgImg.data[idx + 1] = g;
                bgImg.data[idx + 2] = b;
                bgImg.data[idx + 3] = a;
            }
        }

        function drawOval(o, wobbleTable, gPulse, gPulse2, scale, brightness) {
            var srx = o.rx * scale;
            var sry = o.ry * scale;
            if (srx < 1 || sry < 1) return;
            for (var py = o.cy - sry - 2; py <= o.cy + sry + 2; py++) {
                for (var px = cx - srx - 2; px <= cx + srx + 2; px++) {
                    if (px < 0 || px >= W || py < 0 || py >= H) continue;
                    var dx = px - cx;
                    var dy = py - o.cy;
                    var normDx = dx / srx;
                    var normDy = dy / sry;
                    var baseAngle = Math.atan2(normDy, normDx);
                    var baseDist = Math.sqrt(normDx * normDx + normDy * normDy);
                    var wi = Math.floor(((baseAngle + Math.PI) / (Math.PI * 2)) * wobbleTable.length);
                    var wob = wobbleTable[wi % wobbleTable.length];
                    var wobbleMult = 1 + (wob.amp / srx) * Math.sin(wob.phase + globePhase * wob.speed);
                    var dist = baseDist / wobbleMult;
                    if (dist > 1.0) continue;
                    var intensity;
                    if (dist < 0.35) {
                        intensity = Math.floor(o.baseHeat + 20 * gPulse);
                    } else if (dist < 0.65) {
                        var t = (dist - 0.35) / 0.3;
                        intensity = Math.floor((o.baseHeat + 20 * gPulse) * (1 - t) + (o.midHeat + 40 * gPulse2) * t);
                    } else {
                        var t2 = (dist - 0.65) / 0.35;
                        intensity = Math.floor((o.midHeat + 40 * gPulse2) * (1 - t2));
                    }
                    intensity = Math.floor(intensity * brightness);
                    intensity += Math.floor((Math.random() - 0.5) * 10);
                    intensity = Math.max(0, Math.min(255, intensity));
                    var alpha = dist < 0.5 ? 255 : Math.floor(255 * (1 - (dist - 0.5) / 0.5));
                    alpha = Math.max(0, Math.min(255, Math.floor(alpha * gPulse * scale)));
                    var c = palette[intensity];
                    setBgPixelMax(px, py, c[0], c[1], c[2], alpha);
                }
            }
        }

        // --- Main loop ---
        function step() {
            flareTime++;
            var scale = getFlareScale();
            var brightness = getFlareBrightness();

            // Spawn — more during flare flash
            var spawnCount = 2 + Math.floor(Math.random() * 3);
            if (flareTime < FLARE_RAMP + FLARE_FLASH) {
                spawnCount = Math.floor(spawnCount * (1 + brightness * 0.5));
            }
            for (var s = 0; s < spawnCount; s++) {
                if (particles.length < MAX_P) spawn(scale);
            }

            // Clear buffers
            for (var idx = 0; idx < W * H * 4; idx += 4) {
                bgImg.data[idx] = 0; bgImg.data[idx + 1] = 0; bgImg.data[idx + 2] = 0; bgImg.data[idx + 3] = 0;
                fgImg.data[idx] = 0; fgImg.data[idx + 1] = 0; fgImg.data[idx + 2] = 0; fgImg.data[idx + 3] = 0;
            }

            // Coal bed
            corePhase += 0.05;
            var cPulse = 0.7 + 0.3 * Math.sin(corePhase);
            var scaledCoreRX = coreRX * scale;
            var scaledCoreRY = coreRY * scale;
            for (var py = baseY - scaledCoreRY - 1; py <= baseY + scaledCoreRY + 1; py++) {
                for (var px = cx - scaledCoreRX - 1; px <= cx + scaledCoreRX + 1; px++) {
                    if (px < 0 || px >= W || py < 0 || py >= H) continue;
                    var ddx = (px - cx) / scaledCoreRX;
                    var ddy = (py - baseY) / scaledCoreRY;
                    var dist = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (dist > 1.0) continue;
                    var fade = 1.0 - dist;
                    var cIntensity = Math.floor((100 + 80 * cPulse) * fade * brightness);
                    cIntensity += Math.floor((Math.random() - 0.5) * 15);
                    cIntensity = Math.max(0, Math.min(255, cIntensity));
                    var cAlpha = Math.floor(220 * fade * scale);
                    var cc = palette[cIntensity];
                    setBgPixelMax(px, py, cc[0], cc[1], cc[2], cAlpha);
                }
            }

            // Ovals
            globePhase += 0.04;
            var gPulse = 0.8 + 0.2 * Math.sin(globePhase);
            var gPulse2 = 0.85 + 0.15 * Math.sin(globePhase * 1.6 + 1.0);
            drawOval(ovals[0], wobbles[0], gPulse, gPulse2, scale, brightness);
            drawOval(ovals[1], wobbles[1], gPulse, gPulse2, scale, brightness);

            bgCtx.clearRect(0, 0, W, H);
            bgCtx.putImageData(bgImg, 0, 0);

            // Particles
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.x += p.vx + (Math.random() - 0.5) * 0.15;
                p.y += p.vy;
                p.life--;
                var lifeRatio = p.life / p.maxLife;
                var heat = Math.floor(p.heat * lifeRatio * brightness);
                var pAlpha = Math.min(255, Math.floor(255 * lifeRatio * 1.5));
                if (p.life <= 0) { particles.splice(i, 1); continue; }
                var ppx = Math.floor(p.x);
                var ppy = Math.floor(p.y);
                if (ppx < 0 || ppx >= W || ppy < 0 || ppy >= H) { particles.splice(i, 1); continue; }
                var pc = palette[Math.min(255, Math.max(0, heat))];
                var sz = p.size;
                for (var sy = 0; sy < sz; sy++) {
                    for (var sx = 0; sx < sz; sx++) {
                        var dx = ppx + sx, dy = ppy + sy;
                        if (dx < 0 || dx >= W || dy < 0 || dy >= H) continue;
                        var edgeFade = (sx === 0 || sx === sz - 1 || sy === 0 || sy === sz - 1) && sz > 2 ? 0.6 : 1.0;
                        var a = Math.floor(pAlpha * edgeFade);
                        var fi = (dy * W + dx) * 4;
                        if (a > fgImg.data[fi + 3]) {
                            fgImg.data[fi] = pc[0]; fgImg.data[fi + 1] = pc[1]; fgImg.data[fi + 2] = pc[2]; fgImg.data[fi + 3] = a;
                        }
                    }
                }
            }

            fgCtx.clearRect(0, 0, W, H);
            fgCtx.putImageData(fgImg, 0, 0);

            // Glow
            glowPhase += 0.04;
            var flicker = (0.3 + 0.15 * Math.sin(glowPhase) + 0.05 * Math.sin(glowPhase * 3.7) + 0.03 * Math.sin(glowPhase * 7.3)) * scale * brightness;
            var glowR = Math.floor(255 * flicker);
            var glowG = Math.floor(140 * flicker);
            var glowB = Math.floor(30 * flicker);
            if (glowRef.current) {
                glowRef.current.style.background = "radial-gradient(ellipse 60% 50%, rgba(" + glowR + "," + glowG + "," + glowB + ",0.4) 0%, rgba(" + glowR + "," + glowG + "," + glowB + ",0.12) 40%, transparent 70%)";
            }

            animRef.current = requestAnimationFrame(step);
        }

        animRef.current = requestAnimationFrame(step);

        return function() {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [active]);

    if (!active) return null;

    var displayW = FIRE_FX.displayW;
    var displayH = FIRE_FX.displayH;

    return (
        <div ref={wrapRef} style={{
            position: "absolute",
            left: FIRE_FX.posLeft,
            top: FIRE_FX.posTop,
            width: displayW,
            height: displayH,
            pointerEvents: "none",
            zIndex: FIRE_FX.zIndex,
        }}>
            <div ref={glowRef} style={{
                position: "absolute",
                width: displayW + 40,
                height: displayH + 40,
                left: -20,
                top: -20,
                pointerEvents: "none",
            }} />
            <canvas ref={bgRef} style={{
                imageRendering: "pixelated",
                position: "absolute",
                width: displayW,
                height: displayH,
                left: 0,
                top: 0,
            }} />
            <canvas ref={fgRef} style={{
                imageRendering: "pixelated",
                position: "absolute",
                width: displayW,
                height: displayH,
                left: 0,
                top: 0,
            }} />
        </div>
    );
}

export default ForgeFireFX;