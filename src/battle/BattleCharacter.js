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

import BattleConstants from "./battleConstants.js";

var PHASES = BattleConstants.BATTLE_PHASES;
var ACTION_CAM = BattleConstants.ACTION_CAM;
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
            <div className="normal-cam-char__sprite" style={{
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
        <div className="normal-cam-char__sprite" style={{
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

    var cls = "normal-cam-char";
    if (isParty) cls += " normal-cam-char--party";
    if (!isParty) cls += " normal-cam-char--enemy-idle";
    if (isDimmed) cls += " action-cam-char--dimmed";
    if (isAttacker) cls += " action-cam-char--attacker";
    if (isTarget) cls += " action-cam-char--target";
    if (isTurnOwner) cls += " battle-char--turn-owner";
    if (isSelected && !isTurnOwner) cls += " battle-char--selected";

    // Absolute positioning from slot config (stage-space pixels)
    var spriteW = parseInt(LAYOUT.spriteSize) || 52;
    var style = {
        position: "absolute",
        left: (props.slotX - spriteW / 2) + "px",
        top: (props.slotY - spriteW / 2) + "px",
    };

    if (!isParty && props.index != null) {
        style["--bob-delay"] = (props.index * -0.8) + "s";
    }

    // Action cam slide — translate from slot to center stage
    if ((isAttacker || isTarget) && props.sceneRect && props.restingRects) {
        var sr = props.sceneRect;
        var cx = sr.width / 2;
        var cy = sr.height / 2 + sr.height * 0.18;
        var cached = props.restingRects[c.id];
        if (cached) {
            var gap = sr.width * 0.08;
            var partySide = props.isLeftHanded ? (cx - gap) : (cx + gap);
            var enemySide = props.isLeftHanded ? (cx + gap) : (cx - gap);
            var destX = isParty ? partySide : enemySide;
            var dx = destX - cached.cx;
            var dy = cy - cached.cy;
            style.transform = "translate(" + dx + "px, " + dy + "px) scale(" + ACTION_CAM.activeScale + ")";
            style.zIndex = 10;
        }
    }

    var hpPct = c.maxHP > 0 ? Math.round(c.currentHP / c.maxHP * 100) : 0;
    var fillCls = "battle-hp-fill " + (isParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy");

    // Choreography: build __inner class + direction CSS var
    var innerCls = "normal-cam-char__choreo";
    if (props.flashId === c.id) innerCls += " normal-cam-char__choreo--flash";
    var myAnim = props.animState && props.animState[c.id];
    if (myAnim) {
        innerCls += " normal-cam-char__choreo--" + myAnim;
    }
    var innerStyle = { "--choreo-dir": isParty ? "1" : "-1" };

    return (
        <div
            className={cls}
            style={style}
            ref={props.setRef}
            onClick={props.onClick}
        >
            <div className={innerCls} style={innerStyle}>
                <BattleSprite spriteKey={c.spriteKey} frame={props.spriteFrame} />
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