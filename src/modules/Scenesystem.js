// ============================================================
// sceneSystem.js — Wobbly Anvil Scene System
// Layered scene renderer with sprite animation, character
// positioning, and canvas FX overlay.
// Data-driven — add/remove/reorder layers via config arrays.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// SCENE LAYER CONFIG
// Each layer is an object in this array. Add layers freely.
// Layers render in z order (lowest first).
// ============================================================

var SCENE_LAYERS = [
    {
        id: "background",
        type: "static",              // "static" | "spritesheet" | "canvas"
        src: "/images/waForgeScene.png",
        z: 0,
        size: "cover",               // "cover" | "contain" | { width, height }
        position: { x: "50%", y: "50%" },
        anchor: "center",            // "center" | "bottom-center" | "top-left" etc.
        opacity: 1.0,
        imageRendering: "auto",      // "auto" | "pixelated"
        // Phase-based brightness: { phaseKey: brightness }
        // Unlisted phases default to "default"
        brightness: {
            default: 0.25,
            HEAT: 1.0,
            HAMMER: 1.0,
            QUENCH: 0.5,
            SESS_RESULT: 0.4,
            SELECT: 0.25,
            SELECT_MAT: 0.25,
        },
    },
    // -- EXAMPLE: Anvil layer (uncomment when asset ready) --
    // {
    //     id: "anvil",
    //     type: "static",
    //     src: "/images/waAnvil.png",
    //     z: 2,
    //     size: { width: 120, height: 100 },
    //     position: { x: "50%", y: "75%" },
    //     anchor: "bottom-center",
    //     opacity: 1.0,
    //     imageRendering: "pixelated",
    //     brightness: { default: 0.8, HEAT: 1.0, HAMMER: 1.0 },
    // },
    // -- EXAMPLE: Weapon on anvil (uncomment when asset ready) --
    // {
    //     id: "weapon",
    //     type: "static",
    //     src: null,  // set dynamically via overrides based on wKey
    //     z: 3,
    //     size: { width: 64, height: 32 },
    //     position: { x: "50%", y: "68%" },
    //     anchor: "center",
    //     opacity: 1.0,
    //     imageRendering: "pixelated",
    //     brightness: { default: 1.0 },
    // },
    // -- EXAMPLE: Canvas FX overlay (uncomment when ready) --
    // {
    //     id: "fx",
    //     type: "canvas",
    //     z: 10,
    // },
];

// ============================================================
// CHARACTER CONFIG
// Defines actions (animation states) and positions.
// ============================================================

var CHARACTER_CONFIG = {
    id: "smith",
    z: 1,
    imageRendering: "auto",        // "auto" | "pixelated"

    // Default state
    defaultAction: "idle",

    // Action definitions — one per animation state
    actions: {
        idle: {
            sheet: "/images/smithIdle.png",
            frames: 1,
            fps: 1,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "none",           // "none" | "translate" | "authored"
            position: { x: "50%", y: "80%" },
            scale: 1.0,
            anchor: "bottom-center",
        },
        hammering: {
            sheet: "/images/smithHammer.png",
            frames: 4,
            fps: 8,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "none",
            position: { x: "50%", y: "80%" },
            scale: 1.0,
            anchor: "bottom-center",
        },
        quenching: {
            sheet: "/images/smithQuench.png",
            frames: 4,
            fps: 6,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "none",
            position: { x: "50%", y: "80%" },
            scale: 1.0,
            anchor: "bottom-center",
        },
        walkToCounter: {
            sheet: "/images/smithWalk.png",
            frames: 4,
            fps: 8,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "translate",      // CSS moves the root
            position: { x: "80%", y: "75%" },
            scale: 0.9,
            anchor: "bottom-center",
            transitionDuration: 0.8,    // seconds
            transitionEasing: "ease-in-out",
            onComplete: "idleCounter",  // action to switch to on arrival
        },
        walkToForge: {
            sheet: "/images/smithWalk.png",
            frames: 4,
            fps: 8,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "translate",
            position: { x: "50%", y: "80%" },
            scale: 1.0,
            anchor: "bottom-center",
            transitionDuration: 0.8,
            transitionEasing: "ease-in-out",
            onComplete: "idle",
        },
        idleCounter: {
            sheet: "/images/smithIdle.png",
            frames: 1,
            fps: 1,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "none",
            position: { x: "80%", y: "75%" },
            scale: 0.9,
            anchor: "bottom-center",
        },
        walkToSleep: {
            sheet: "/images/smithWalk.png",
            frames: 4,
            fps: 6,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "translate",
            position: { x: "20%", y: "40%" },
            scale: 0.6,
            anchor: "bottom-center",
            transitionDuration: 1.2,
            transitionEasing: "ease-in",
            onComplete: "sleeping",
        },
        sleeping: {
            sheet: "/images/smithSleep.png",
            frames: 2,
            fps: 2,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "none",
            position: { x: "20%", y: "40%" },
            scale: 0.6,
            anchor: "bottom-center",
        },
        // -- EXAMPLE: Authored movement (weird/special) --
        // stumble: {
        //     sheet: "/images/smithStumble.png",
        //     frames: 12,
        //     fps: 12,
        //     frameWidth: 128,   // wider frames contain positional movement
        //     frameHeight: 96,
        //     loop: false,
        //     movement: "authored",  // root stays put, sheet has the motion
        //     position: { x: "50%", y: "80%" },
        //     scale: 1.0,
        //     anchor: "bottom-center",
        //     onComplete: "idle",
        // },
    },
};

// ============================================================
// ANCHOR HELPER
// Converts anchor name to CSS transform-origin + translate
// ============================================================

function anchorTransform(anchor) {
    switch (anchor) {
        case "center": return "translate(-50%, -50%)";
        case "bottom-center": return "translate(-50%, -100%)";
        case "top-center": return "translate(-50%, 0%)";
        case "top-left": return "translate(0%, 0%)";
        case "bottom-left": return "translate(0%, -100%)";
        case "top-right": return "translate(-100%, 0%)";
        case "bottom-right": return "translate(-100%, -100%)";
        default: return "translate(-50%, -50%)";
    }
}

// ============================================================
// STATIC LAYER COMPONENT
// Renders a single image layer (background, anvil, etc.)
// ============================================================

function StaticLayer({ layer, phase, overrides }) {
    var config = Object.assign({}, layer, overrides || {});
    if (!config.src) return null;

    // Resolve brightness for current phase
    var br = config.brightness || {};
    var brightness = br[phase] !== undefined ? br[phase] : (br.default !== undefined ? br.default : 1.0);

    // Resolve size
    var isCover = config.size === "cover";
    var isContain = config.size === "contain";
    var sizeStyle = {};
    if (isCover || isContain) {
        sizeStyle = {
            width: "100%",
            height: "100%",
            objectFit: isCover ? "cover" : "contain",
            objectPosition: "center",
        };
    } else if (config.size && typeof config.size === "object") {
        sizeStyle = {
            width: config.size.width,
            height: config.size.height,
        };
    }

    // Resolve position
    var pos = config.position || { x: "50%", y: "50%" };
    var anchorXform = anchorTransform(config.anchor || "center");

    // Cover mode: fill entire container
    if (isCover || isContain) {
        return (
            <div style={{
                position: "absolute",
                inset: 0,
                zIndex: config.z || 0,
                opacity: config.opacity !== undefined ? config.opacity : 1,
                filter: "brightness(" + brightness + ")",
                transition: "filter 0.4s, opacity 0.4s",
                overflow: "hidden",
                pointerEvents: "none",
            }}>
                <img
                    src={(typeof process !== "undefined" && process.env && process.env.PUBLIC_URL ? process.env.PUBLIC_URL : "") + config.src}
                    alt=""
                    style={Object.assign({}, sizeStyle, {
                        display: "block",
                        imageRendering: config.imageRendering || "auto",
                    })}
                />
            </div>
        );
    }

    // Positioned mode: placed at x/y with anchor
    return (
        <div style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: anchorXform + (config.scale ? " scale(" + config.scale + ")" : ""),
            zIndex: config.z || 0,
            opacity: config.opacity !== undefined ? config.opacity : 1,
            filter: "brightness(" + brightness + ")",
            transition: "filter 0.4s, opacity 0.4s",
            pointerEvents: "none",
        }}>
            <img
                src={(typeof process !== "undefined" && process.env && process.env.PUBLIC_URL ? process.env.PUBLIC_URL : "") + config.src}
                alt=""
                style={Object.assign({}, sizeStyle, {
                    display: "block",
                    imageRendering: config.imageRendering || "auto",
                })}
            />
        </div>
    );
}

// ============================================================
// SPRITESHEET COMPONENT
// CSS background-position stepping animation.
// Supports loop and one-shot. Calls onComplete for one-shots.
// ============================================================

function SpriteSheet({ sheet, frames, fps, frameWidth, frameHeight, loop, imageRendering, onComplete }) {
    var [frame, setFrame] = useState(0);
    var frameRef = useRef(0);
    var intervalRef = useRef(null);

    useEffect(function() {
        frameRef.current = 0;
        setFrame(0);
        if (frames <= 1) return;

        var msPerFrame = Math.round(1000 / (fps || 8));
        intervalRef.current = setInterval(function() {
            var next = frameRef.current + 1;
            if (next >= frames) {
                if (loop) {
                    next = 0;
                } else {
                    clearInterval(intervalRef.current);
                    if (onComplete) onComplete();
                    return;
                }
            }
            frameRef.current = next;
            setFrame(next);
        }, msPerFrame);

        return function() { clearInterval(intervalRef.current); };
    }, [sheet, frames, fps, loop]);

    var bgX = -(frame * frameWidth);
    var publicUrl = (typeof process !== "undefined" && process.env && process.env.PUBLIC_URL ? process.env.PUBLIC_URL : "");

    return (
        <div style={{
            width: frameWidth,
            height: frameHeight,
            backgroundImage: "url(" + publicUrl + sheet + ")",
            backgroundPosition: bgX + "px 0px",
            backgroundRepeat: "no-repeat",
            backgroundSize: (frameWidth * frames) + "px " + frameHeight + "px",
            imageRendering: imageRendering || "auto",
        }} />
    );
}

// ============================================================
// CHARACTER COMPONENT
// Manages action state, position transitions, sprite playback.
// Controlled via "action" prop from parent.
// ============================================================

function Character({ config, action, onActionComplete }) {
    var actions = config.actions || {};
    var currentAction = actions[action] || actions[config.defaultAction] || {};
    var prevActionRef = useRef(action);
    var [transitioning, setTransitioning] = useState(false);

    // Detect action change for translate movement
    useEffect(function() {
        if (action === prevActionRef.current) return;
        prevActionRef.current = action;

        if (currentAction.movement === "translate" && currentAction.transitionDuration) {
            setTransitioning(true);
            var timer = setTimeout(function() {
                setTransitioning(false);
                if (currentAction.onComplete && onActionComplete) {
                    onActionComplete(currentAction.onComplete);
                }
            }, currentAction.transitionDuration * 1000);
            return function() { clearTimeout(timer); };
        }
    }, [action]);

    // Handle one-shot sprite completion (for "authored" movement)
    function handleSpriteComplete() {
        if (currentAction.onComplete && onActionComplete) {
            onActionComplete(currentAction.onComplete);
        }
    }

    var pos = currentAction.position || { x: "50%", y: "50%" };
    var scale = currentAction.scale !== undefined ? currentAction.scale : 1.0;
    var anchorXform = anchorTransform(currentAction.anchor || "bottom-center");
    var hasTransition = currentAction.movement === "translate" && currentAction.transitionDuration;
    var transitionStr = hasTransition
        ? "left " + currentAction.transitionDuration + "s " + (currentAction.transitionEasing || "ease-in-out") +
        ", top " + currentAction.transitionDuration + "s " + (currentAction.transitionEasing || "ease-in-out") +
        ", transform " + currentAction.transitionDuration + "s " + (currentAction.transitionEasing || "ease-in-out")
        : "none";

    return (
        <div style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: anchorXform + " scale(" + scale + ")",
            zIndex: config.z || 1,
            transition: transitionStr,
            pointerEvents: "none",
        }}>
            {currentAction.sheet && (
                <SpriteSheet
                    sheet={currentAction.sheet}
                    frames={currentAction.frames || 1}
                    fps={currentAction.fps || 8}
                    frameWidth={currentAction.frameWidth || 64}
                    frameHeight={currentAction.frameHeight || 96}
                    loop={currentAction.loop !== false}
                    imageRendering={config.imageRendering || "auto"}
                    onComplete={currentAction.movement === "authored" ? handleSpriteComplete : null}
                />
            )}
        </div>
    );
}

// ============================================================
// CANVAS FX LAYER
// Transparent overlay for particle effects, sparks, glow.
// Exposes triggerEffect via ref callback.
// ============================================================

function CanvasFXLayer({ z, fxRef }) {
    var canvasRef = useRef(null);
    var particlesRef = useRef([]);
    var animRef = useRef(null);
    var activeRef = useRef(false);

    // Particle loop
    function startLoop() {
        if (activeRef.current) return;
        activeRef.current = true;
        function loop() {
            var canvas = canvasRef.current;
            if (!canvas) { activeRef.current = false; return; }
            var ctx = canvas.getContext("2d");
            var w = canvas.width, h = canvas.height;
            ctx.clearRect(0, 0, w, h);

            var alive = [];
            for (var i = 0; i < particlesRef.current.length; i++) {
                var p = particlesRef.current[i];
                p.life -= 1 / 60;
                if (p.life <= 0) continue;
                p.x += p.vx;
                p.y += p.vy;
                p.vy += (p.gravity || 0);
                var alpha = Math.min(1, p.life / (p.maxLife * 0.3));
                ctx.globalAlpha = alpha * (p.opacity || 1);
                ctx.fillStyle = p.color || "#f59e0b";
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
                ctx.fill();
                alive.push(p);
            }
            ctx.globalAlpha = 1;
            particlesRef.current = alive;

            if (alive.length > 0) {
                animRef.current = requestAnimationFrame(loop);
            } else {
                activeRef.current = false;
            }
        }
        animRef.current = requestAnimationFrame(loop);
    }

    // Trigger an effect — called from game code via ref
    var triggerEffect = useCallback(function(effectType, options) {
        var canvas = canvasRef.current;
        if (!canvas) return;
        var opts = options || {};
        var cx = opts.x || canvas.width / 2;
        var cy = opts.y || canvas.height / 2;
        var count = opts.count || 20;
        var newParticles = [];

        if (effectType === "sparks") {
            for (var i = 0; i < count; i++) {
                var angle = Math.random() * Math.PI * 2;
                var speed = 1 + Math.random() * 3;
                var life = 0.3 + Math.random() * 0.6;
                newParticles.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1,
                    gravity: 0.08,
                    size: 1 + Math.random() * 2.5,
                    color: opts.color || "#f59e0b",
                    life: life,
                    maxLife: life,
                    opacity: 1,
                });
            }
        } else if (effectType === "smoke") {
            for (var j = 0; j < count; j++) {
                var sLife = 0.8 + Math.random() * 1.2;
                newParticles.push({
                    x: cx + (Math.random() - 0.5) * 20,
                    y: cy,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -0.5 - Math.random() * 1,
                    gravity: -0.01,
                    size: 3 + Math.random() * 4,
                    color: opts.color || "#666",
                    life: sLife,
                    maxLife: sLife,
                    opacity: 0.4,
                });
            }
        } else if (effectType === "glow") {
            for (var k = 0; k < count; k++) {
                var gLife = 0.5 + Math.random() * 0.8;
                newParticles.push({
                    x: cx + (Math.random() - 0.5) * 30,
                    y: cy + (Math.random() - 0.5) * 10,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: -0.3 - Math.random() * 0.5,
                    gravity: 0,
                    size: 2 + Math.random() * 3,
                    color: opts.color || "#fbbf24",
                    life: gLife,
                    maxLife: gLife,
                    opacity: 0.6,
                });
            }
        }

        particlesRef.current = particlesRef.current.concat(newParticles);
        startLoop();
    }, []);

    // Expose trigger to parent via ref
    useEffect(function() {
        if (fxRef) fxRef.current = { trigger: triggerEffect };
    }, [triggerEffect]);

    // Resize canvas to container
    useEffect(function() {
        var canvas = canvasRef.current;
        if (!canvas) return;
        function resize() {
            var parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }
        }
        resize();
        var observer = new ResizeObserver(resize);
        if (canvas.parentElement) observer.observe(canvas.parentElement);
        return function() { observer.disconnect(); cancelAnimationFrame(animRef.current); };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                inset: 0,
                zIndex: z || 10,
                pointerEvents: "none",
            }}
        />
    );
}

// ============================================================
// FORGE SCENE (Main Stage Component)
// Renders all layers, character, and FX canvas.
// Drop-in replacement for old ForgeScene.
// ============================================================

function ForgeSceneLayered({ phase, characterAction, onCharacterActionComplete, layerOverrides, fxRef, visible }) {
    if (visible === false) return null;

    // Merge layer overrides
    var layers = SCENE_LAYERS.map(function(layer) {
        var override = layerOverrides && layerOverrides[layer.id];
        return override ? Object.assign({}, layer, override) : layer;
    }).sort(function(a, b) { return (a.z || 0) - (b.z || 0); });

    return (
        <div style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderRadius: "inherit",
            pointerEvents: "none",
        }}>
            {/* Render layers */}
            {layers.map(function(layer) {
                if (layer.type === "canvas") {
                    return <CanvasFXLayer key={layer.id} z={layer.z} fxRef={fxRef} />;
                }
                if (layer.type === "static") {
                    return <StaticLayer key={layer.id} layer={layer} phase={phase} />;
                }
                // Spritesheet layers (non-character) could go here
                return null;
            })}

            {/* Character layer */}
            <Character
                config={CHARACTER_CONFIG}
                action={characterAction || CHARACTER_CONFIG.defaultAction}
                onActionComplete={onCharacterActionComplete}
            />

            {/* FX canvas (always present, renders on top) */}
            <CanvasFXLayer z={100} fxRef={fxRef} />
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var SceneSystem = {
    // Config (editable)
    SCENE_LAYERS: SCENE_LAYERS,
    CHARACTER_CONFIG: CHARACTER_CONFIG,

    // Components
    StaticLayer: StaticLayer,
    SpriteSheet: SpriteSheet,
    Character: Character,
    CanvasFXLayer: CanvasFXLayer,
    ForgeSceneLayered: ForgeSceneLayered,

    // Helpers
    anchorTransform: anchorTransform,
};

export default SceneSystem;