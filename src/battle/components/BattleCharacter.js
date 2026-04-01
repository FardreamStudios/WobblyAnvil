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

var PHASES = BattleConstants.BATTLE_PHASES;
var ACTION_CAM = BattleConstants.ACTION_CAM;
var ACTION_CAM_SLOTS = BattleConstants.ACTION_CAM_SLOTS;
var LAYOUT = BattleConstants.LAYOUT;
var BATTLE_SPRITES = BattleConstants.BATTLE_SPRITES;

// ============================================================
// BattleSprite — animated spritesheet or static image
// Props: spriteKey (string key into BATTLE_SPRITES), frame
// ============================================================

function BattleSprite(props) {
    var cfg = BATTLE_SPRITES[props.spriteKey];
    if (!cfg) return null;

    var PUB = process.env.PUBLIC_URL || "";
    var src = PUB + cfg.sheet;
    var size = LAYOUT.spriteSize;

    // Static image (1 frame or fps=0)
    if (cfg.frames <= 1 || cfg.fps <= 0) {
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
    var frame = props.frame || 0;
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
// BattleCharacter — single fighter card
// ============================================================

function BattleCharacter(props) {
    var c = props.data;
    var isParty = props.isParty;
    var isActive = props.phase !== PHASES.ATB_RUNNING && props.phase !== PHASES.ACTION_SELECT && props.phase !== PHASES.ACTION_CAM_OUT;

    var isDimmed = isActive && c.id !== props.attackerId && c.id !== props.targetId;
    var isAttacker = isActive && c.id === props.attackerId;
    var isTarget = isActive && c.id === props.targetId;
    var isSelected = !isActive && c.id === props.selectedId;
    var isTurnOwner = !isActive && c.id === props.turnOwnerId;

    // Sprite ref for bracket measurement
    var spriteElRef = useRef(null);

    // Show brackets: selected (green) or turn owner (parchment), but not during action cam
    var showSelected = isSelected && !isTurnOwner && !isAttacker && !isTarget && !isDimmed;
    var showTurnOwner = isTurnOwner && !isAttacker && !isTarget && !isDimmed;

    var cls = "normal-cam-char";
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
            rootStyle.transform = "translate(" + dx + "px, " + dy + "px)";
            rootStyle.zIndex = 10;
        }
    }

    var hpPct = c.maxHP > 0 ? Math.round(c.currentHP / c.maxHP * 100) : 0;
    var fillCls = "battle-hp-fill " + (isParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy");

    // --- CHOREO layer: lunge/knockback/dodge transforms ---
    var choreoCls = "normal-cam-char__choreo";
    if (props.flashId === c.id) choreoCls += " normal-cam-char__choreo--flash";
    var myAnim = props.animState && props.animState[c.id];
    if (myAnim) {
        choreoCls += " normal-cam-char__choreo--" + myAnim;
    }
    var choreoStyle = { "--choreo-dir": isParty ? "1" : "-1" };

    // Click handler — stopPropagation so stage background tap can deselect
    var handleClick = useCallback(function(e) {
        e.stopPropagation();
        if (props.onClick) props.onClick();
    }, [props.onClick]);

    return (
        <div
            className={cls}
            style={rootStyle}
            ref={props.setRef}
            onClick={handleClick}
        >
            <div className={choreoCls} style={choreoStyle}>
                <div className="normal-cam-char__visual" style={{ position: "relative" }}>
                    <SelectionBrackets
                        spriteRef={spriteElRef}
                        color={showSelected ? "#4ade80" : "#f0e6c8"}
                        visible={showSelected || showTurnOwner}
                    />
                    <BattleSprite spriteKey={c.spriteKey} frame={props.spriteFrame} spriteRef={spriteElRef} />
                </div>
                <div className={"normal-cam-char__info" + (isActive ? " action-cam-char__info--hidden" : "")}>
                    <span className="normal-cam-char__name">{c.name}</span>
                    <div className="battle-hp-bg">
                        <div className={fillCls} style={{ width: hpPct + "%" }} />
                    </div>
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