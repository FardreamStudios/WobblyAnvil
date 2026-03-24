// ============================================================
// sceneSystem.js — Wobbly Anvil Scene System
// Data-driven layered scene renderer.
//
// ARCHITECTURE:
//   Scene = 1 background + N props (static or animated)
//   Character = independent entity with action state machine
//   FX = canvas overlay for particles
//
// All visuals configured via data. No code changes to add
// scenes, props, characters, or effects.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// SCENES CONFIG
// Each scene has a background and an array of props.
// Props have a rootPosition (home) and can be moved at runtime.
// Switch scenes by changing one string.
// ============================================================

var SCENES = {
    forge: {
        id: "forge",
        background: {
            src: "/images/waForgeScene.png",
            imageRendering: "auto",
            brightness: {
                default: 0.5,
                HEAT: 1.0,
                HAMMER: 1.0,
                QUENCH: 0.7,
                SESS_RESULT: 0.6,
                SELECT: 0.5,
                SELECT_MAT: 0.5,
            },
        },
        props: [
            {
                id: "anvil",
                type: "static",
                src: "/images/waAnvil.png",
                z: 2,
                rootPosition: { x: "35%", y: "105%" },
                size: { width: 170, height: 170 },
                anchor: "bottom-center",
                opacity: 1.0,
                imageRendering: "auto",
                brightness: { default: 0.6, HEAT: 1.0, HAMMER: 1.0, QUENCH: 0.8, SESS_RESULT: 0.6 },
            },
        ],
    },
    // -- EXAMPLE: Shop scene --
    // shop: {
    //     id: "shop",
    //     background: {
    //         src: "/images/waShopDistrict.png",
    //         imageRendering: "auto",
    //         brightness: { default: 0.8 },
    //     },
    //     props: [
    //         {
    //             id: "stall",
    //             type: "static",
    //             src: "/images/waStall.png",
    //             z: 1,
    //             rootPosition: { x: "60%", y: "80%" },
    //             size: { width: 140, height: 100 },
    //             anchor: "bottom-center",
    //             opacity: 1.0,
    //             brightness: { default: 1.0 },
    //         },
    //     ],
    // },
};

// ============================================================
// PHASE → CHARACTER ACTION MAP
// Maps game phase to character animation action.
// Override from App.js with overrideAction for special cases.
// ============================================================

var PHASE_ACTION_MAP = {
    IDLE: "idle",
    SELECT: "idle",
    SELECT_MAT: "idle",
    HEAT: "hammering",
    HAMMER: "hammering",
    QUENCH: "quenching",
    SESS_RESULT: "hammering",
};

// ============================================================
// PROP VISIBILITY CONFIG
// Controls which props are visible per phase.
// If a prop id is not listed, it's always visible.
// ============================================================

var PROP_VISIBILITY = {
    // Example: hide weapon prop when idle
    // weapon: { IDLE: false, SELECT: false, SELECT_MAT: false, default: true },
};

// ============================================================
// CHARACTER CONFIG
// Action state machine for the smith character.
// Each action: spritesheet config + position + movement mode.
// ============================================================

var CHARACTER_CONFIG = {
    id: "smith",
    z: 1,
    imageRendering: "auto",
    defaultAction: "idle",
    visiblePhases: ["HEAT", "HAMMER", "QUENCH", "SESS_RESULT", "SELECT", "SELECT_MAT"],
    fadeDuration: 0.6,

    actions: {
        idle: {
            sheet: "/images/smithIdle.png",
            frames: 1,
            fps: 1,
            frameWidth: 64,
            frameHeight: 96,
            loop: true,
            movement: "none",
            position: { x: "50%", y: "80%" },
            scale: 1.0,
            anchor: "bottom-center",
        },
        hammering: {
            sheet: "/images/anim/waSmithForgeSpriteSheetSS.png",
            frames: 4,
            fps: 7,
            frameWidth: 380,
            frameHeight: 380,
            colCount: 4,
            loop: true,
            movement: "none",
            position: { x: "42%", y: "109%" },
            scale: 0.55,
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
            movement: "translate",
            position: { x: "80%", y: "75%" },
            scale: 0.9,
            anchor: "bottom-center",
            transitionDuration: 0.8,
            transitionEasing: "ease-in-out",
            onComplete: "idleCounter",
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
        //     frameWidth: 128,
        //     frameHeight: 96,
        //     loop: false,
        //     movement: "authored",
        //     position: { x: "50%", y: "80%" },
        //     scale: 1.0,
        //     anchor: "bottom-center",
        //     onComplete: "idle",
        // },
    },
};

// ============================================================
// SCENE STATE RESOLVER
// Single function — takes game state, returns everything the
// scene component needs. Call from App.js, pass result as props.
// ============================================================

function resolveSceneState(options) {
    var phase = (options.phase || "IDLE").toUpperCase();
    var sceneName = options.scene || "forge";
    var overrideAction = options.overrideAction || null;
    var propOverrides = options.propOverrides || {};

    // Resolve scene
    var scene = SCENES[sceneName] || SCENES.forge;

    // Resolve character action
    var characterAction = overrideAction || PHASE_ACTION_MAP[phase] || "idle";

    // Resolve prop visibility per phase
    var resolvedPropOverrides = {};
    var propIds = Object.keys(PROP_VISIBILITY);
    for (var i = 0; i < propIds.length; i++) {
        var pid = propIds[i];
        var vis = PROP_VISIBILITY[pid];
        var phaseVis = vis[phase] !== undefined ? vis[phase] : (vis.default !== undefined ? vis.default : true);
        if (!phaseVis) {
            resolvedPropOverrides[pid] = Object.assign({}, propOverrides[pid] || {}, { visible: false });
        }
    }

    var finalPropOverrides = Object.assign({}, propOverrides, resolvedPropOverrides);

    return {
        scene: sceneName,
        phase: phase,
        characterAction: characterAction,
        propOverrides: finalPropOverrides,
    };
}

// ============================================================
// HELPERS
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

function resolvePublicUrl(path) {
    if (!path) return null;
    return process.env.PUBLIC_URL + path;
}

function resolveBrightness(brightnessConfig, phase) {
    if (!brightnessConfig) return 1.0;
    return brightnessConfig[phase] !== undefined ? brightnessConfig[phase] : (brightnessConfig.default !== undefined ? brightnessConfig.default : 1.0);
}

// ============================================================
// BACKGROUND COMPONENT
// Renders the scene background as a cover image.
// ============================================================

function Background({ config, phase }) {
    if (!config || !config.src) return null;
    var brightness = resolveBrightness(config.brightness, phase);

    return (
        <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            filter: "brightness(" + brightness + ")",
            transition: "filter 0.4s",
            overflow: "hidden",
            pointerEvents: "none",
        }}>
            <img
                src={resolvePublicUrl(config.src)}
                alt=""
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    display: "block",
                    imageRendering: config.imageRendering || "auto",
                }}
            />
        </div>
    );
}

// ============================================================
// SPRITESHEET COMPONENT
// CSS background-position stepping animation.
// Supports loop and one-shot modes.
// ============================================================

function SpriteSheet({ sheet, frames, fps, frameWidth, frameHeight, loop, imageRendering, onComplete, colCount }) {
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

    var cols = colCount || frames;
    var col = frame % cols;
    var row = Math.floor(frame / cols);
    var bgX = -(col * frameWidth);
    var bgY = -(row * frameHeight);
    var totalRows = Math.ceil(frames / cols);

    return (
        <div style={{
            width: frameWidth,
            height: frameHeight,
            backgroundImage: "url(" + resolvePublicUrl(sheet) + ")",
            backgroundPosition: bgX + "px " + bgY + "px",
            backgroundRepeat: "no-repeat",
            backgroundSize: (frameWidth * cols) + "px " + (frameHeight * totalRows) + "px",
            imageRendering: imageRendering || "auto",
        }} />
    );
}

// ============================================================
// PROP COMPONENT
// Renders a single prop — static image or spritesheet.
// Positioned at rootPosition by default, overridable.
// ============================================================

function Prop({ config, phase, override }) {
    var merged = Object.assign({}, config, override || {});
    if (merged.visible === false) return null;
    if (merged.type === "static" && !merged.src) return null;
    if (merged.type === "spritesheet" && !merged.sheet) return null;

    var pos = merged.position || merged.rootPosition || { x: "50%", y: "50%" };
    var brightness = resolveBrightness(merged.brightness, phase);
    var anchorXform = anchorTransform(merged.anchor || "center");
    var scale = merged.scale !== undefined ? merged.scale : 1.0;

    // Resolve size for static images
    var sizeStyle = {};
    if (merged.size && typeof merged.size === "object") {
        sizeStyle = { width: merged.size.width, height: merged.size.height };
    }

    return (
        <div style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: anchorXform + " scale(" + scale + ")",
            zIndex: merged.z || 1,
            opacity: merged.opacity !== undefined ? merged.opacity : 1,
            filter: "brightness(" + brightness + ")",
            transition: "filter 0.4s, opacity 0.4s, left 0.4s, top 0.4s, transform 0.4s",
            pointerEvents: "none",
        }}>
            {merged.type === "static" && (
                <img
                    src={resolvePublicUrl(merged.src)}
                    alt=""
                    style={Object.assign({}, sizeStyle, {
                        display: "block",
                        imageRendering: merged.imageRendering || "auto",
                    })}
                />
            )}
            {merged.type === "spritesheet" && (
                <SpriteSheet
                    sheet={merged.sheet}
                    frames={merged.frames || 1}
                    fps={merged.fps || 8}
                    frameWidth={merged.frameWidth || 64}
                    frameHeight={merged.frameHeight || 64}
                    loop={merged.loop !== false}
                    imageRendering={merged.imageRendering || "auto"}
                />
            )}
        </div>
    );
}

// ============================================================
// CHARACTER COMPONENT
// Action-driven: plays spritesheet in place, moves via CSS
// transition or authored spritesheet.
// ============================================================

function Character({ config, action, onActionComplete }) {
    var actions = config.actions || {};
    var currentAction = actions[action] || actions[config.defaultAction] || {};
    var prevActionRef = useRef(action);
    var [transitioning, setTransitioning] = useState(false);

    // Handle translate movement on action change
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

    // Handle authored spritesheet completion
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

    var visiblePhases = config.visiblePhases || null;
    var isVisible = !visiblePhases || visiblePhases.indexOf(action) >= 0;
    if (!isVisible && visiblePhases) {
        for (var vp = 0; vp < visiblePhases.length; vp++) {
            var phaseAction = PHASE_ACTION_MAP[visiblePhases[vp]];
            if (phaseAction === action) { isVisible = true; break; }
        }
    }
    var fadeDur = config.fadeDuration || 0.4;
    var opacityStr = isVisible ? 1 : 0;
    var fadeTransition = "opacity " + fadeDur + "s ease-in-out";
    var fullTransition = transitionStr === "none" ? fadeTransition : transitionStr + ", " + fadeTransition;

    return (
        <div style={{
            position: "absolute",
            left: pos.x,
            top: pos.y,
            transform: anchorXform + " scale(" + scale + ")",
            zIndex: config.z || 5,
            transition: fullTransition,
            opacity: opacityStr,
            pointerEvents: "none",
        }}>
            {currentAction.sheet && (
                <SpriteSheet
                    sheet={currentAction.sheet}
                    frames={currentAction.frames || 1}
                    fps={currentAction.fps || 8}
                    frameWidth={currentAction.frameWidth || 64}
                    frameHeight={currentAction.frameHeight || 96}
                    colCount={currentAction.colCount || null}
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
// Transparent overlay for particle effects.
// Trigger effects from game code via fxRef.current.trigger().
// ============================================================

function CanvasFXLayer({ z, fxRef }) {
    var canvasRef = useRef(null);
    var particlesRef = useRef([]);
    var animRef = useRef(null);
    var activeRef = useRef(false);

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
                    life: life, maxLife: life, opacity: 1,
                });
            }
        } else if (effectType === "smoke") {
            for (var j = 0; j < count; j++) {
                var sLife = 0.8 + Math.random() * 1.2;
                newParticles.push({
                    x: cx + (Math.random() - 0.5) * 20, y: cy,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -0.5 - Math.random() * 1,
                    gravity: -0.01,
                    size: 3 + Math.random() * 4,
                    color: opts.color || "#666",
                    life: sLife, maxLife: sLife, opacity: 0.4,
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
                    life: gLife, maxLife: gLife, opacity: 0.6,
                });
            }
        }

        particlesRef.current = particlesRef.current.concat(newParticles);
        startLoop();
    }, []);

    useEffect(function() {
        if (fxRef) fxRef.current = { trigger: triggerEffect };
    }, [triggerEffect]);

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
// SCENE STAGE (Main Component)
// Renders: background → props (sorted by z) → character → FX
// Drop-in replacement for old ForgeScene.
// ============================================================

function SceneStage({ scene, phase, characterAction, onCharacterActionComplete, propOverrides, fxRef }) {
    var sceneConfig = SCENES[scene] || SCENES.forge;

    // Build sorted props with overrides
    var props = (sceneConfig.props || []).map(function(prop) {
        var override = propOverrides && propOverrides[prop.id];
        var merged = override ? Object.assign({}, prop, override) : prop;
        // Default position to rootPosition if no override
        if (!override || !override.position) {
            merged.position = merged.position || merged.rootPosition;
        }
        return merged;
    }).sort(function(a, b) { return (a.z || 0) - (b.z || 0); });

    return (
        <div style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            borderRadius: "inherit",
            pointerEvents: "none",
        }}>
            {/* Background */}
            <Background config={sceneConfig.background} phase={phase} />

            {/* Props */}
            {props.map(function(prop) {
                return <Prop key={prop.id} config={prop} phase={phase} />;
            })}

            {/* Character */}
            <Character
                config={CHARACTER_CONFIG}
                action={characterAction || CHARACTER_CONFIG.defaultAction}
                onActionComplete={onCharacterActionComplete}
            />

            {/* FX Canvas (always top) */}
            <CanvasFXLayer z={100} fxRef={fxRef} />
        </div>
    );
}

// ============================================================
// PROP HELPERS
// Use from App.js to move props or reset them to root.
// ============================================================

function getPropRootPosition(sceneName, propId) {
    var scene = SCENES[sceneName] || SCENES.forge;
    var prop = (scene.props || []).find(function(p) { return p.id === propId; });
    return prop ? prop.rootPosition : null;
}

function buildPropOverride(propId, overrides) {
    var result = {};
    result[propId] = overrides;
    return result;
}

// ============================================================
// Plugin-style API
// ============================================================
var SceneSystem = {
    // Config (editable)
    SCENES: SCENES,
    CHARACTER_CONFIG: CHARACTER_CONFIG,
    PHASE_ACTION_MAP: PHASE_ACTION_MAP,
    PROP_VISIBILITY: PROP_VISIBILITY,

    // Resolver
    resolveSceneState: resolveSceneState,

    // Components
    SceneStage: SceneStage,
    Background: Background,
    Prop: Prop,
    SpriteSheet: SpriteSheet,
    Character: Character,
    CanvasFXLayer: CanvasFXLayer,

    // Helpers
    anchorTransform: anchorTransform,
    getPropRootPosition: getPropRootPosition,
    buildPropOverride: buildPropOverride,
};

export default SceneSystem;