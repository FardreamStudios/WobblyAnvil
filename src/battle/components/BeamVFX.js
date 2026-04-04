// ============================================================
// BeamVFX.js — 16-bit Pixel Beam Connector
//
// Canvas-based beam drawn between two stage-space points.
// Rendered at 1/4 resolution with image-rendering: pixelated
// for authentic SNES-era look.
//
// Layers: dark purple edge → purple → bright purple → white center
// Animated energy chunks travel from→to. Flares at both ends.
//
// Props:
//   from: { x, y } — stage-space origin (caster hands)
//   to:   { x, y } — stage-space target (enemy hit point)
//
// Rendered inside battle-stage-shake container.
// Shares 960×540 stage-space coordinate system.
// ============================================================

import { useRef, useEffect } from "react";

// --- Resolution ---
var SCALE = 4;              // stage pixels per canvas pixel
var CW = 960 / SCALE;      // 240 canvas pixels wide
var CH = 540 / SCALE;       // 135 canvas pixels tall

// --- Color Palette (purple / white, 16-bit) ---
var COL_WHITE       = "rgba(255,255,255,";
var COL_BRIGHT_PURP = "rgba(220,180,255,";
var COL_MID_PURP    = "rgba(168,85,247,";
var COL_DARK_PURP   = "rgba(107,33,168,";
var COL_DEEP_PURP   = "rgba(74,26,122,";

// Cross-section profile: offset from center → color string + base alpha
// Drawn symmetrically (center once, rest mirrored)
var PROFILE = [
    { dist: 0, col: COL_WHITE,       alpha: 1.0  },
    { dist: 1, col: COL_BRIGHT_PURP, alpha: 0.95 },
    { dist: 2, col: COL_MID_PURP,    alpha: 0.80 },
    { dist: 3, col: COL_DARK_PURP,   alpha: 0.55 },
];

// Outer glow ring (drawn behind, wider, softer)
var GLOW_PROFILE = [
    { dist: 4, col: COL_DEEP_PURP, alpha: 0.30 },
    { dist: 5, col: COL_DEEP_PURP, alpha: 0.12 },
];

// --- Animation Tuning ---
var WAVE_SPEED    = 7.0;    // energy chunk travel speed
var WAVE_FREQ     = 10.0;   // how many energy peaks along beam
var PULSE_SPEED   = 5.0;    // overall beam breathing speed
var PULSE_AMOUNT  = 0.15;   // how much width varies from pulse
var WAVE_AMOUNT   = 0.35;   // extra width at energy peaks
var FLARE_SPEED   = 4.0;    // flare pulse speed
var PARTICLE_COUNT = 12;    // spark particles floating around beam

// --- Particle Pool (seeded once, updated each frame) ---
function seedParticles(count) {
    var particles = [];
    for (var i = 0; i < count; i++) {
        particles.push({
            t:     Math.random(),           // position along beam 0→1
            drift: (Math.random() - 0.5) * 2, // perpendicular drift direction
            speed: 0.3 + Math.random() * 0.7, // travel speed multiplier
            phase: Math.random() * Math.PI * 2, // flicker phase
            dist:  3 + Math.random() * 4,      // distance from beam center
        });
    }
    return particles;
}

// ============================================================
// Component
// ============================================================

function BeamVFX(props) {
    var from = props.from;
    var to   = props.to;

    var canvasRef    = useRef(null);
    var rafRef       = useRef(null);
    var startRef     = useRef(null);
    var particlesRef = useRef(null);

    useEffect(function() {
        var canvas = canvasRef.current;
        if (!canvas || !from || !to) return;

        var ctx = canvas.getContext("2d");
        startRef.current = performance.now();

        // Seed particles once
        if (!particlesRef.current) {
            particlesRef.current = seedParticles(PARTICLE_COUNT);
        }

        // Pre-compute beam geometry (canvas-space)
        var fx = from.x / SCALE;
        var fy = from.y / SCALE;
        var tx = to.x / SCALE;
        var ty = to.y / SCALE;
        var dx = tx - fx;
        var dy = ty - fy;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;

        var nx = dx / len;   // beam direction (normalized)
        var ny = dy / len;
        var px = -ny;        // perpendicular
        var py = nx;

        function draw(time) {
            var elapsed = (time - startRef.current) / 1000;
            ctx.clearRect(0, 0, CW, CH);

            // Global pulse (beam breathing)
            var pulse = Math.sin(elapsed * PULSE_SPEED) * PULSE_AMOUNT + 1.0;

            // --- PASS 1: Outer glow ---
            for (var d = 0; d <= len; d += 1) {
                var t = d / len;
                var bx = fx + nx * d;
                var by = fy + ny * d;

                var wave = Math.sin(t * WAVE_FREQ - elapsed * WAVE_SPEED) * 0.5 + 0.5;
                var widthMult = pulse + wave * WAVE_AMOUNT;

                for (var gi = 0; gi < GLOW_PROFILE.length; gi++) {
                    var gp = GLOW_PROFILE[gi];
                    var gr = Math.round(gp.dist * widthMult);
                    var ga = gp.alpha * (0.6 + wave * 0.4);
                    ctx.fillStyle = gp.col + ga + ")";

                    ctx.fillRect(Math.round(bx + px * gr), Math.round(by + py * gr), 1, 1);
                    ctx.fillRect(Math.round(bx - px * gr), Math.round(by - py * gr), 1, 1);
                }
            }

            // --- PASS 2: Core beam ---
            for (d = 0; d <= len; d += 1) {
                var t2 = d / len;
                var bx2 = fx + nx * d;
                var by2 = fy + ny * d;

                var wave2 = Math.sin(t2 * WAVE_FREQ - elapsed * WAVE_SPEED) * 0.5 + 0.5;
                var widthMult2 = pulse + wave2 * WAVE_AMOUNT;

                for (var pi = 0; pi < PROFILE.length; pi++) {
                    var pp = PROFILE[pi];
                    var pr = Math.round(pp.dist * widthMult2);
                    var pa = pp.alpha * (0.75 + wave2 * 0.25);
                    ctx.fillStyle = pp.col + pa + ")";

                    if (pp.dist === 0) {
                        // Center pixel — draw once
                        ctx.fillRect(Math.round(bx2), Math.round(by2), 1, 1);
                    } else {
                        // Symmetric pair
                        ctx.fillRect(Math.round(bx2 + px * pr), Math.round(by2 + py * pr), 1, 1);
                        ctx.fillRect(Math.round(bx2 - px * pr), Math.round(by2 - py * pr), 1, 1);
                    }
                }
            }

            // --- PASS 3: Energy chunks (brighter traveling blobs) ---
            var chunkCount = 3;
            for (var ci = 0; ci < chunkCount; ci++) {
                var chunkT = ((elapsed * 0.8 + ci / chunkCount) % 1.0);
                var chunkD = chunkT * len;
                var cx = fx + nx * chunkD;
                var cy = fy + ny * chunkD;
                var chunkBright = Math.sin(chunkT * Math.PI); // fade at endpoints

                // Draw a bright 3×3 cross
                ctx.fillStyle = COL_WHITE + (0.9 * chunkBright) + ")";
                ctx.fillRect(Math.round(cx), Math.round(cy), 1, 1);
                ctx.fillStyle = COL_BRIGHT_PURP + (0.7 * chunkBright) + ")";
                ctx.fillRect(Math.round(cx + px), Math.round(cy + py), 1, 1);
                ctx.fillRect(Math.round(cx - px), Math.round(cy - py), 1, 1);
                ctx.fillRect(Math.round(cx + nx), Math.round(cy + ny), 1, 1);
                ctx.fillRect(Math.round(cx - nx), Math.round(cy - ny), 1, 1);
            }

            // --- PASS 4: Endpoint flares ---
            drawFlare(ctx, fx, fy, elapsed, 4, px, py); // origin (fairy hands)
            drawFlare(ctx, tx, ty, elapsed, 5, px, py); // impact (enemy)

            // --- PASS 5: Floating spark particles ---
            var parts = particlesRef.current;
            for (var si = 0; si < parts.length; si++) {
                var sp = parts[si];
                // Advance particle along beam
                sp.t = (sp.t + sp.speed * 0.012) % 1.0;
                var sd = sp.t * len;
                var spx = fx + nx * sd + px * sp.dist * sp.drift;
                var spy = fy + ny * sd + py * sp.dist * sp.drift;
                var sparkAlpha = (Math.sin(elapsed * 8 + sp.phase) * 0.5 + 0.5) * 0.7;

                ctx.fillStyle = COL_BRIGHT_PURP + sparkAlpha + ")";
                ctx.fillRect(Math.round(spx), Math.round(spy), 1, 1);
            }

            rafRef.current = requestAnimationFrame(draw);
        }

        rafRef.current = requestAnimationFrame(draw);

        return function() {
            cancelAnimationFrame(rafRef.current);
        };
    }, [from && from.x, from && from.y, to && to.x, to && to.y]);

    if (!from || !to) return null;

    return (
        <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 50,
                imageRendering: "pixelated",
            }}
        />
    );
}

// ============================================================
// Flare — pulsing pixel starburst at beam endpoints
// ============================================================

function drawFlare(ctx, x, y, elapsed, size, px, py) {
    var flicker = Math.sin(elapsed * FLARE_SPEED) * 0.3 + 0.7;
    var nx = py;  // beam direction (perpendicular of perpendicular)
    var ny = -px;

    // Center — white hot
    ctx.fillStyle = COL_WHITE + (1.0 * flicker) + ")";
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);

    // Inner ring — bright purple
    ctx.fillStyle = COL_BRIGHT_PURP + (0.85 * flicker) + ")";
    for (var r = 1; r <= Math.ceil(size * 0.5); r++) {
        ctx.fillRect(Math.round(x + px * r), Math.round(y + py * r), 1, 1);
        ctx.fillRect(Math.round(x - px * r), Math.round(y - py * r), 1, 1);
        ctx.fillRect(Math.round(x + nx * r), Math.round(y + ny * r), 1, 1);
        ctx.fillRect(Math.round(x - nx * r), Math.round(y - ny * r), 1, 1);
    }

    // Outer ring — mid purple, lower alpha
    ctx.fillStyle = COL_MID_PURP + (0.45 * flicker) + ")";
    for (var r2 = Math.ceil(size * 0.5) + 1; r2 <= size; r2++) {
        ctx.fillRect(Math.round(x + px * r2), Math.round(y + py * r2), 1, 1);
        ctx.fillRect(Math.round(x - px * r2), Math.round(y - py * r2), 1, 1);
        ctx.fillRect(Math.round(x + nx * r2), Math.round(y + ny * r2), 1, 1);
        ctx.fillRect(Math.round(x - nx * r2), Math.round(y - ny * r2), 1, 1);
    }
}

export default BeamVFX;