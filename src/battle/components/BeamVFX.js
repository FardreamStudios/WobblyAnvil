// ============================================================
// BeamVFX.js — 16-bit Pixel Beam Connector + Charge Glow
//
// Canvas-based beam drawn between two stage-space points.
// Rendered at 1/4 resolution with image-rendering: pixelated
// for authentic SNES-era look.
//
// Two modes (controlled by chargeOnly prop via ref — no remount):
//   chargeOnly=true  → pulsing glow ball at origin only (charge phase)
//   chargeOnly=false → full beam + glow balls at both endpoints
//
// Props:
//   from:       { x, y } — stage-space origin (caster hands)
//   to:         { x, y } — stage-space target (enemy hit point)
//   chargeOnly: boolean  — true = glow ball only, false = full beam
//
// Rendered inside battle-stage-shake container.
// Shares 960×540 stage-space coordinate system.
// ============================================================

import { useRef, useEffect } from "react";

// --- Resolution ---
var SCALE = 4;
var CW = 960 / SCALE;
var CH = 540 / SCALE;

// --- Color Palette (purple / white, 16-bit) ---
var COL_WHITE       = "rgba(255,255,255,";
var COL_BRIGHT_PURP = "rgba(220,180,255,";
var COL_MID_PURP    = "rgba(168,85,247,";
var COL_DARK_PURP   = "rgba(107,33,168,";
var COL_DEEP_PURP   = "rgba(74,26,122,";

// Beam cross-section profile
var PROFILE = [
    { dist: 0, col: COL_WHITE,       alpha: 1.0  },
    { dist: 1, col: COL_BRIGHT_PURP, alpha: 0.95 },
    { dist: 2, col: COL_MID_PURP,    alpha: 0.80 },
    { dist: 3, col: COL_DARK_PURP,   alpha: 0.55 },
];

// Outer beam glow
var GLOW_PROFILE = [
    { dist: 4, col: COL_DEEP_PURP, alpha: 0.30 },
    { dist: 5, col: COL_DEEP_PURP, alpha: 0.12 },
];

// --- Animation Tuning ---
var WAVE_SPEED    = 7.0;
var WAVE_FREQ     = 10.0;
var PULSE_SPEED   = 5.0;
var PULSE_AMOUNT  = 0.15;
var WAVE_AMOUNT   = 0.35;
var FLARE_SPEED   = 4.0;
var PARTICLE_COUNT = 12;

// --- Glow Ball Tuning ---
var GLOW_PULSE_SPEED  = 3.5;
var GLOW_ORIGIN_SIZE  = 7;     // origin glow radius (canvas px)
var GLOW_IMPACT_SIZE  = 6;     // impact glow radius (canvas px)
var GLOW_CHARGE_SIZE  = 13;    // charge-only glow radius (bigger)
var GLOW_SPARK_COUNT  = 8;     // orbiting sparks during charge

// --- Particle Pool ---
function seedParticles(count) {
    var particles = [];
    for (var i = 0; i < count; i++) {
        particles.push({
            t:     Math.random(),
            drift: (Math.random() - 0.5) * 2,
            speed: 0.3 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2,
            dist:  3 + Math.random() * 4,
        });
    }
    return particles;
}

// --- Charge Glow Spark Pool ---
function seedGlowSparks(count) {
    var sparks = [];
    for (var i = 0; i < count; i++) {
        sparks.push({
            angle:  (Math.PI * 2 / count) * i,
            dist:   5 + Math.random() * 6,
            speed:  0.4 + Math.random() * 0.8,
            phase:  Math.random() * Math.PI * 2,
        });
    }
    return sparks;
}

// ============================================================
// Component
// ============================================================

function BeamVFX(props) {
    var from = props.from;
    var to   = props.to;

    var canvasRef      = useRef(null);
    var rafRef         = useRef(null);
    var startRef       = useRef(null);
    var particlesRef   = useRef(null);
    var glowSparksRef  = useRef(null);

    // chargeOnly via ref — animation loop reads live, no remount
    var chargeOnlyRef  = useRef(props.chargeOnly);
    chargeOnlyRef.current = props.chargeOnly;

    useEffect(function() {
        var canvas = canvasRef.current;
        if (!canvas || !from || !to) return;

        var ctx = canvas.getContext("2d");
        startRef.current = performance.now();

        if (!particlesRef.current) {
            particlesRef.current = seedParticles(PARTICLE_COUNT);
        }
        if (!glowSparksRef.current) {
            glowSparksRef.current = seedGlowSparks(GLOW_SPARK_COUNT);
        }

        // Pre-compute beam geometry (canvas-space)
        var fx = from.x / SCALE;
        var fy = from.y / SCALE;
        var tx = to.x / SCALE;
        var ty = to.y / SCALE;
        var ddx = tx - fx;
        var ddy = ty - fy;
        var len = Math.sqrt(ddx * ddx + ddy * ddy);
        if (len < 1) len = 1;

        var nx = ddx / len;
        var ny = ddy / len;
        var px = -ny;
        var py = nx;

        function draw(time) {
            var elapsed = (time - startRef.current) / 1000;
            ctx.clearRect(0, 0, CW, CH);

            if (chargeOnlyRef.current) {
                // ========================================
                // CHARGE-ONLY — glow ball + orbiting sparks
                // ========================================
                drawGlowBall(ctx, fx, fy, elapsed, GLOW_CHARGE_SIZE);

                var sparks = glowSparksRef.current;
                for (var si = 0; si < sparks.length; si++) {
                    var sk = sparks[si];
                    var sAngle = sk.angle + elapsed * sk.speed;
                    var sDist = sk.dist + Math.sin(elapsed * 3 + sk.phase) * 2;
                    var sx = fx + Math.cos(sAngle) * sDist;
                    var sy = fy + Math.sin(sAngle) * sDist;
                    var sAlpha = (Math.sin(elapsed * 6 + sk.phase) * 0.4 + 0.6) * 0.7;
                    ctx.fillStyle = COL_BRIGHT_PURP + sAlpha + ")";
                    ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
                }

            } else {
                // ========================================
                // FULL BEAM — body + chunks + glows + sparks
                // ========================================
                var pulse = Math.sin(elapsed * PULSE_SPEED) * PULSE_AMOUNT + 1.0;

                // --- Outer glow along beam ---
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

                // --- Core beam ---
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
                            ctx.fillRect(Math.round(bx2), Math.round(by2), 1, 1);
                        } else {
                            ctx.fillRect(Math.round(bx2 + px * pr), Math.round(by2 + py * pr), 1, 1);
                            ctx.fillRect(Math.round(bx2 - px * pr), Math.round(by2 - py * pr), 1, 1);
                        }
                    }
                }

                // --- Energy chunks ---
                var chunkCount = 3;
                for (var ci = 0; ci < chunkCount; ci++) {
                    var chunkT = ((elapsed * 0.8 + ci / chunkCount) % 1.0);
                    var chunkD = chunkT * len;
                    var ccx = fx + nx * chunkD;
                    var ccy = fy + ny * chunkD;
                    var chunkBright = Math.sin(chunkT * Math.PI);

                    ctx.fillStyle = COL_WHITE + (0.9 * chunkBright) + ")";
                    ctx.fillRect(Math.round(ccx), Math.round(ccy), 1, 1);
                    ctx.fillStyle = COL_BRIGHT_PURP + (0.7 * chunkBright) + ")";
                    ctx.fillRect(Math.round(ccx + px), Math.round(ccy + py), 1, 1);
                    ctx.fillRect(Math.round(ccx - px), Math.round(ccy - py), 1, 1);
                    ctx.fillRect(Math.round(ccx + nx), Math.round(ccy + ny), 1, 1);
                    ctx.fillRect(Math.round(ccx - nx), Math.round(ccy - ny), 1, 1);
                }

                // --- Glow balls at endpoints ---
                drawGlowBall(ctx, fx, fy, elapsed, GLOW_ORIGIN_SIZE);
                drawGlowBall(ctx, tx, ty, elapsed, GLOW_IMPACT_SIZE);

                // --- Floating spark particles along beam ---
                var parts = particlesRef.current;
                for (var psi = 0; psi < parts.length; psi++) {
                    var sp = parts[psi];
                    sp.t = (sp.t + sp.speed * 0.012) % 1.0;
                    var sd = sp.t * len;
                    var spx = fx + nx * sd + px * sp.dist * sp.drift;
                    var spy = fy + ny * sd + py * sp.dist * sp.drift;
                    var sparkAlpha = (Math.sin(elapsed * 8 + sp.phase) * 0.5 + 0.5) * 0.7;

                    ctx.fillStyle = COL_BRIGHT_PURP + sparkAlpha + ")";
                    ctx.fillRect(Math.round(spx), Math.round(spy), 1, 1);
                }
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
// Glow Ball — pulsing diamond-shaped pixel glow
//
// Concentric rings using Manhattan distance (diamond shape).
// White center → bright purple → mid purple → dark → deep.
// Used for charge glow, hand glow, and impact glow.
// ============================================================

var GLOW_COLORS = [
    { maxDist: 0.15, col: COL_WHITE,       alpha: 1.0  },
    { maxDist: 0.35, col: COL_BRIGHT_PURP, alpha: 0.90 },
    { maxDist: 0.55, col: COL_MID_PURP,    alpha: 0.65 },
    { maxDist: 0.75, col: COL_DARK_PURP,   alpha: 0.40 },
    { maxDist: 1.00, col: COL_DEEP_PURP,   alpha: 0.18 },
];

function drawGlowBall(ctx, cx, cy, elapsed, radius) {
    var pulse = Math.sin(elapsed * GLOW_PULSE_SPEED) * 0.25 + 1.0;
    var r = Math.round(radius * pulse);
    var flicker = Math.sin(elapsed * FLARE_SPEED) * 0.15 + 0.85;

    for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
            var manhattan = Math.abs(dx) + Math.abs(dy);
            if (manhattan > r) continue;

            var normDist = manhattan / r;

            var band = null;
            for (var bi = 0; bi < GLOW_COLORS.length; bi++) {
                if (normDist <= GLOW_COLORS[bi].maxDist) {
                    band = GLOW_COLORS[bi];
                    break;
                }
            }
            if (!band) continue;

            var alpha = band.alpha * flicker * (1.0 - normDist * 0.3);
            ctx.fillStyle = band.col + alpha + ")";
            ctx.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
        }
    }
}

export default BeamVFX;