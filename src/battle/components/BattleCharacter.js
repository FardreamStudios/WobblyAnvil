// ============================================================
// BattleCharacter.js — Fighter card, sprite renderer, damage pop
//
// Extracted from BattleView.js. Contains:
//   BattleSprite   — animated spritesheet or static image
//   BattleCharacter — single fighter card with choreo wrapper
//   DamageNumber   — floating pop text, self-destructs via CSS
//
// All three are pure presentational components.
// ============================================================

import { useRef, useState, useEffect, useCallback } from "react";
import BattleConstants from "../config/battleConstants.js";

var ACTION_CAM_SLOTS = BattleConstants.ACTION_CAM_SLOTS;
var LAYOUT = BattleConstants.LAYOUT;
var STAGE = BattleConstants.STAGE;
var BATTLE_SPRITES = BattleConstants.BATTLE_SPRITES;
var PHASES = BattleConstants.BATTLE_PHASES;

// ============================================================
// BattleSprite — animated spritesheet or static image
//
// Props:
//   spriteKey    — string key into BATTLE_SPRITES config
//   frame        — (optional) manual frame override, bypasses autoFrame
//   spriteRef    — (optional) ref forwarded to the sprite div
//   onComplete   — (optional) callback fired when "once"/"reverse" anim finishes
//
// Sprite config fields (in BATTLE_SPRITES):
//   playMode     — "loop" (default), "once", "reverse"
//                   "loop": wraps to loopFrom (or 0) at end, forever
//                   "once": plays 0→last, holds last frame, fires onComplete
//                   "reverse": plays last→0, holds frame 0, fires onComplete
//                   "manual": use fps:0, parent controls via frame prop
//   loopFrom     — (optional) frame to wrap to instead of 0 in loop mode
// ============================================================

function BattleSprite(props) {
    var cfg = BATTLE_SPRITES[props.spriteKey];

    // --- Hooks must run unconditionally (Rules of Hooks) ---
    var initFrame = (cfg && cfg.playMode === "reverse") ? Math.max(0, cfg.frames - 1) : 0;
    var [autoFrame, setAutoFrame] = useState(initFrame);
    var spriteKeyRef = useRef(props.spriteKey);
    var completeFiredRef = useRef(false);

    // Reset frame on spriteKey change (e.g. idle → attack swap)
    if (props.spriteKey !== spriteKeyRef.current) {
        spriteKeyRef.current = props.spriteKey;
        completeFiredRef.current = false;
        var newCfg = BATTLE_SPRITES[props.spriteKey];
        var startFrame = (newCfg && newCfg.playMode === "reverse") ? Math.max(0, newCfg.frames - 1) : 0;
        setAutoFrame(startFrame);
    }

    useEffect(function() {
        if (!cfg || cfg.frames <= 1 || !cfg.fps || cfg.fps <= 0) return;
        var ms = Math.round(1000 / cfg.fps);
        var totalFrames = cfg.frames;
        var mode = cfg.playMode || "loop";
        var loopStart = cfg.loopFrom || 0;

        var id = setInterval(function() {
            setAutoFrame(function(f) {
                if (mode === "once") {
                    // Play forward, hold last frame
                    return f < totalFrames - 1 ? f + 1 : f;
                }
                if (mode === "reverse") {
                    // Play backward, hold frame 0
                    return f > 0 ? f - 1 : f;
                }
                // "loop" (default) — wrap to loopFrom at end
                var next = f + 1;
                return next >= totalFrames ? loopStart : next;
            });
        }, ms);
        return function() { clearInterval(id); };
    }, [props.spriteKey]);

    // --- Completion callback for "once" and "reverse" modes ---
    useEffect(function() {
        if (!cfg || completeFiredRef.current) return;
        var mode = cfg.playMode || "loop";
        if (mode === "once" && autoFrame >= cfg.frames - 1) {
            completeFiredRef.current = true;
            if (props.onComplete) props.onComplete();
        }
        if (mode === "reverse" && autoFrame <= 0) {
            completeFiredRef.current = true;
            if (props.onComplete) props.onComplete();
        }
    }, [autoFrame, props.spriteKey]);

    if (!cfg) return null;

    var PUB = process.env.PUBLIC_URL || "";
    var src = PUB + cfg.sheet;
    var size = LAYOUT.spriteSize;

    // Static image (single frame only)
    if (cfg.frames <= 1) {
        return (
            <div ref={props.spriteRef || null} className="normal-cam-char__sprite" style={{
                width: size, height: size,
                backgroundImage: "url(" + src + ")",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                imageRendering: "auto",
            }} />
        );
    }

    // Animated spritesheet — percentage-based positioning
    var frames = cfg.frames;
    var cols = cfg.cols || frames;
    var frame = (props.frame != null) ? props.frame : autoFrame;
    var col = frame % cols;
    var row = Math.floor(frame / cols);
    var totalRows = Math.ceil(frames / cols);
    var bgX = cols > 1 ? (col * (100 / (cols - 1))) : 0;
    var bgY = totalRows > 1 ? (row * (100 / (totalRows - 1))) : 0;

    return (
        <div ref={props.spriteRef || null} className="normal-cam-char__sprite" style={{
            width: size, height: size,
            backgroundImage: "url(" + src + ")",
            backgroundPosition: bgX + "% " + bgY + "%",
            backgroundRepeat: "no-repeat",
            backgroundSize: (cols * 100) + "% " + (totalRows * 100) + "%",
            imageRendering: "auto",
        }} />
    );
}

// ============================================================
// SelectionBrackets — measures the sprite DOM node via
// ResizeObserver and renders a real div with corner brackets
// that always matches the sprite's painted bounds.
// Props: spriteRef, color, visible
// ============================================================

var BRACKET_PAD = 4;   // px padding around sprite
var BRACKET_SIZE = 10;  // corner line length
var BRACKET_THICK = 2;  // line thickness

function SelectionBrackets(props) {
    var spriteRef = props.spriteRef;
    var color = props.color || "#4ade80";
    var visible = props.visible;

    var sizeRef = useRef({ w: 0, h: 0 });
    var _forceUpdate = useState(0)[1];

    useEffect(function() {
        var el = spriteRef.current;
        if (!el) return;

        function measure() {
            var w = el.offsetWidth;
            var h = el.offsetHeight;
            if (w !== sizeRef.current.w || h !== sizeRef.current.h) {
                sizeRef.current = { w: w, h: h };
                _forceUpdate(function(n) { return n + 1; });
            }
        }

        measure();

        var ro = new ResizeObserver(measure);
        ro.observe(el);
        return function() { ro.disconnect(); };
    }, [spriteRef, _forceUpdate]);

    if (!visible || sizeRef.current.w === 0) return null;

    var w = sizeRef.current.w + BRACKET_PAD * 2;
    var h = sizeRef.current.h + BRACKET_PAD * 2;

    // Overlay on top of sprite — __visual is position:relative,
    // so inset positioning centers brackets around the sprite.
    var style = {
        position: "absolute",
        width: w + "px",
        height: h + "px",
        top: (-BRACKET_PAD) + "px",
        left: (-BRACKET_PAD) + "px",
        pointerEvents: "none",
        zIndex: 3,
    };

    // Four corner brackets as small absolute divs
    var corners = [
        { top: 0, left: 0, borderTop: BRACKET_THICK + "px solid " + color, borderLeft: BRACKET_THICK + "px solid " + color },
        { top: 0, right: 0, borderTop: BRACKET_THICK + "px solid " + color, borderRight: BRACKET_THICK + "px solid " + color },
        { bottom: 0, left: 0, borderBottom: BRACKET_THICK + "px solid " + color, borderLeft: BRACKET_THICK + "px solid " + color },
        { bottom: 0, right: 0, borderBottom: BRACKET_THICK + "px solid " + color, borderRight: BRACKET_THICK + "px solid " + color },
    ];

    return (
        <div style={style}>
            {corners.map(function(c, i) {
                return <div key={i} style={Object.assign({
                    position: "absolute",
                    width: BRACKET_SIZE + "px",
                    height: BRACKET_SIZE + "px",
                    borderRadius: "2px",
                }, c)} />;
            })}
        </div>
    );
}

// ============================================================
// TurnStartFX — pixel sparkle burst on turn start
// Spawns 8 small pixel particles from bracket corners.
// One-shot: mounts, animates, auto-hides via CSS.
// Props: spriteRef, color, isParty
// ============================================================

var PARTICLE_COUNT = 8;
var PARTICLE_SIZE = 3;   // px — small pixel dot

// Fixed directions: 2 per corner (diagonal + orthogonal)
var PARTICLE_DIRS = [
    { dx: -1, dy: -1 }, { dx: -1, dy:  0 },   // top-left
    { dx:  1, dy: -1 }, { dx:  1, dy:  0 },   // top-right
    { dx: -1, dy:  1 }, { dx: -1, dy:  0 },   // bottom-left
    { dx:  1, dy:  1 }, { dx:  1, dy:  0 },   // bottom-right
];

function TurnStartFX(props) {
    var spriteRef = props.spriteRef;
    var color = props.color || "#f0e6c8";

    var sizeRef = useRef({ w: 0, h: 0 });
    var [ready, setReady] = useState(false);

    useEffect(function() {
        var el = spriteRef.current;
        if (!el) return;
        sizeRef.current = { w: el.offsetWidth, h: el.offsetHeight };
        setReady(true);
    }, [spriteRef]);

    if (!ready || sizeRef.current.w === 0) return null;

    var w = sizeRef.current.w + BRACKET_PAD * 2;
    var h = sizeRef.current.h + BRACKET_PAD * 2;

    // Corner origins (relative to bracket container)
    var origins = [
        { x: 0, y: 0 }, { x: 0, y: 0 },           // top-left x2
        { x: w, y: 0 }, { x: w, y: 0 },             // top-right x2
        { x: 0, y: h }, { x: 0, y: h },             // bottom-left x2
        { x: w, y: h }, { x: w, y: h },             // bottom-right x2
    ];

    var containerStyle = {
        position: "absolute",
        width: w + "px",
        height: h + "px",
        top: (-BRACKET_PAD) + "px",
        left: (-BRACKET_PAD) + "px",
        pointerEvents: "none",
        zIndex: 4,
    };

    return (
        <div style={containerStyle}>
            {origins.map(function(origin, i) {
                var dir = PARTICLE_DIRS[i];
                var dist = 12 + (i % 2) * 8;  // 12px or 20px travel
                var style = {
                    position: "absolute",
                    left: origin.x + "px",
                    top: origin.y + "px",
                    width: PARTICLE_SIZE + "px",
                    height: PARTICLE_SIZE + "px",
                    background: color,
                    "--px-dx": (dir.dx * dist) + "px",
                    "--px-dy": (dir.dy * dist) + "px",
                    animationDelay: (i % 2) * 40 + "ms",
                };
                return <div key={i} className="battle-turn-particle" style={style} />;
            })}
        </div>
    );
}

// ============================================================
// BattleCharacter — single fighter card
// ============================================================

function BattleCharacter(props) {
    var c = props.data;
    var isParty = props.isParty;
    var inActionCam = !!props.isActionCam;

    var isDimmed = inActionCam && c.id !== props.attackerId && c.id !== props.targetId;
    var isAttacker = inActionCam && c.id === props.attackerId;
    var isTarget = inActionCam && c.id === props.targetId;
    var isSelected = !inActionCam && c.id === props.selectedId;
    var isTurnOwner = !inActionCam && c.id === props.turnOwnerId;

    // Sprite ref for bracket measurement
    var spriteElRef = useRef(null);

    // Show brackets: selected (green) or turn owner (parchment), but not during action cam
    var showSelected = isSelected && !isTurnOwner && !isAttacker && !isTarget && !isDimmed;
    var showTurnOwner = isTurnOwner && !isAttacker && !isTarget && !isDimmed;

    // Turn-start FX: detect showTurnOwner rising edge
    var prevTurnOwnerRef = useRef(false);
    var [turnFxKey, setTurnFxKey] = useState(0);
    useEffect(function() {
        if (showTurnOwner && !prevTurnOwnerRef.current) {
            setTurnFxKey(function(k) { return k + 1; });
        }
        prevTurnOwnerRef.current = showTurnOwner;
    }, [showTurnOwner]);

    var isKO = c.ko || (c.currentHP != null && c.currentHP <= 0);

    // Read anim state early — needed for KO class gating and sprite key
    var myAnim = props.animState && props.animState[c.id];

    var cls = "normal-cam-char";
    // Only apply persistent hide when choreo ko animation is NOT playing.
    // During the death anim, choreo--ko handles the fade. After it clears,
    // this class keeps the character hidden on subsequent re-renders.
    if (isKO && myAnim !== "ko") cls += " normal-cam-char--ko";
    if (isParty) cls += " normal-cam-char--party";
    if (!isParty) cls += " normal-cam-char--enemy-idle";
    if (isDimmed) cls += " action-cam-char--dimmed";
    if (isAttacker) cls += " action-cam-char--attacker";
    if (isTarget) cls += " action-cam-char--target";

    // --- ROOT: zero-size anchor positioned at slot center ---
    // Like UE root motion — this point moves, visuals hang off it
    var rootStyle = {
        position: "absolute",
        left: props.slotX + "px",
        top: props.slotY + "px",
    };

    if (!isParty && props.index != null) {
        rootStyle["--bob-delay"] = (props.index * -0.8) + "s";
    }

    // Action cam slide — translate root from slot to engagement position
    var inCam = (isAttacker || isTarget) && props.sceneRect && props.restingRects;
    if (inCam) {
        var cached = props.restingRects[c.id];
        if (cached) {
            var cx = ACTION_CAM_SLOTS.centerX;
            var cy = ACTION_CAM_SLOTS.centerY;
            var gap = ACTION_CAM_SLOTS.gap;
            var partySide = props.isLeftHanded ? (cx - gap) : (cx + gap);
            var enemySide = props.isLeftHanded ? (cx + gap) : (cx - gap);
            var destX = isParty ? partySide : enemySide;
            var dx = destX - cached.cx;
            var dy = cy - cached.cy;

            // Exit slide: push horizontally off-stage from cam position
            if (props.phase === PHASES.CAM_EXIT_SLIDE) {
                var exitDir = isParty ? 1 : -1;
                dx += exitDir * STAGE.designW;
            }

            rootStyle.transform = "translate(" + dx + "px, " + dy + "px)";
            rootStyle.zIndex = 10;
        }
    }

    var hpPct = c.maxHP > 0 ? Math.round(c.currentHP / c.maxHP * 100) : 0;
    var fillCls = "battle-hp-fill " + (isParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy");

    // --- CHOREO layer: lunge/knockback/dodge transforms ---
    var choreoCls = "normal-cam-char__choreo";
    if (props.flashId === c.id) choreoCls += " normal-cam-char__choreo--flash";
    // myAnim already computed above (needed for KO class gating)
    if (myAnim) {
        choreoCls += " normal-cam-char__choreo--" + myAnim;
    }
    var choreoStyle = { "--choreo-dir": isParty ? "1" : "-1" };

    // --- Scale/flip on __visual layer (not sprite — enemy bob overwrites sprite transforms) ---
    var activeSpriteKey = (myAnim === "strike" || myAnim === "wind_up") && c.attackSpriteKey
        ? c.attackSpriteKey : c.spriteKey;

    // Sprite override from special skills (e.g. beam sequence swaps spritesheet)
    var spriteOverride = props.spriteOverride;
    if (spriteOverride) { activeSpriteKey = spriteOverride.key; }

    var spriteCfg = BATTLE_SPRITES[activeSpriteKey];
    var visualXform = [];
    if (spriteCfg && spriteCfg.flipX) visualXform.push("scaleX(-1)");
    if (spriteCfg && spriteCfg.scale && spriteCfg.scale !== 1) visualXform.push("scale(" + spriteCfg.scale + ")");
    var visualStyle = { position: "relative" };
    if (visualXform.length) visualStyle.transform = visualXform.join(" ");

    // Click handler — stopPropagation so stage background tap can deselect
    var handleClick = useCallback(function(e) {
        e.stopPropagation();
        if (isKO) return; // Dead characters are not interactive
        if (props.onClick) props.onClick();
    }, [props.onClick, isKO]);

    return (
        <div
            className={cls}
            style={rootStyle}
            ref={props.setRef}
            onClick={handleClick}
        >
            <div className={choreoCls} style={choreoStyle}>
                <div className="normal-cam-char__visual" style={visualStyle}>
                    <SelectionBrackets
                        spriteRef={spriteElRef}
                        color={showSelected ? "#4ade80" : "#f0e6c8"}
                        visible={showSelected || showTurnOwner}
                    />
                    {turnFxKey > 0 && (
                        <TurnStartFX
                            key={"tfx-" + turnFxKey}
                            spriteRef={spriteElRef}
                            color={isParty ? "#f0e6c8" : "#fb923c"}
                        />
                    )}
                    <BattleSprite spriteKey={activeSpriteKey} frame={
                        spriteOverride ? spriteOverride.frame
                            : (myAnim === "strike") && c.attackSpriteKey ? 1
                                : (myAnim === "wind_up") && c.attackSpriteKey ? 0
                                    : null
                    } spriteRef={spriteElRef} />
                </div>
                <div className={"normal-cam-char__info" + (inActionCam ? " action-cam-char__info--hidden" : "")}>
                    <span className="normal-cam-char__name">{c.name}</span>
                    <div className="battle-hp-bg">
                        <div className={fillCls} style={{ width: hpPct + "%" }} />
                    </div>
                    {c._ap && isParty && (
                        <div className="battle-char-ap-bg">
                            <div
                                className="battle-char-ap-fill battle-char-ap-fill--party"
                                style={{ width: (c._ap.max > 0 ? Math.round(c._ap.current / c._ap.max * 100) : 0) + "%" }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// DamageNumber — floating pop text, self-destructs via CSS anim
// ============================================================

function DamageNumber(props) {
    var isMiss = props.value === "MISS";
    var isCrit = typeof props.value === "number" && props.value >= 20;
    var cls = "action-cam-dmg" + (isCrit ? " action-cam-dmg--crit" : "") + (isMiss ? " action-cam-dmg--miss" : "");

    return (
        <span
            className={cls}
            style={{
                left: props.x + "px",
                top: props.y + "px",
                color: props.color || "#ffffff",
            }}
        >
            {props.value}
        </span>
    );
}

var BattleCharacterModule = {
    BattleCharacter: BattleCharacter,
    BattleSprite: BattleSprite,
    DamageNumber: DamageNumber,
};

export default BattleCharacterModule;