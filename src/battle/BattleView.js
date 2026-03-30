// ============================================================
// BattleView.js — Battle Layout (Four-Zone Landscape)
//
// Four-zone layout:
//   TOP    (~65%) = Scene — enemy formation left, party right
//   BOT-L  (16vw) = Open real estate (buffs, status, fairy)
//   BOT-C  (flex) = ATB gauges (all combatants)
//   BOT-R  (18vw) = Action menu (2x2 grid)
//
// Action camera: combatants translate to center stage,
//   inactive dim, ATB/actions hide, QTE zone + comic panel show.
//
// Exchange: attack QTE → resolve → counter → defense QTE →
//   resolve → cam out. Sequenced via phase state machine.
//
// Self-contained: no host imports, no bus, no singletons.
// Uses test data from battleConstants for dev/prototype.
//
// Props:
//   handedness — "left" | "right" (flips action menu side)
//   onExit     — callback to leave battle
//   zoneName   — display name of current zone
//   waveLabel  — display string (e.g. "Wave 1/3")
//
// Export shape preserved: BattleViewModule.BattleView
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import BattleConstants from "./battleConstants.js";
import BattleSFX from "./battleSFX.js";
import "./BattleView.css";

var PHASES = BattleConstants.BATTLE_PHASES;
var ACTION_CAM = BattleConstants.ACTION_CAM;
var EXCHANGE = BattleConstants.EXCHANGE;
var ACTIONS = BattleConstants.ACTIONS;
var LAYOUT = BattleConstants.LAYOUT;
var BATTLE_SPRITES = BattleConstants.BATTLE_SPRITES;
var CHOREOGRAPHY = BattleConstants.CHOREOGRAPHY;
var TEST_PARTY = BattleConstants.TEST_PARTY;
var TEST_ENEMIES = BattleConstants.TEST_ENEMIES;

// ============================================================
// DEV FLAG — show phase controls overlay
// ============================================================
var _DEV_CONTROLS = true;

// ============================================================
// COMIC PANEL LINES — fairy speech per phase
// ============================================================
var COMIC_LINES = {};
COMIC_LINES[PHASES.ACTION_CAM_IN]    = "Let's get 'em!";
COMIC_LINES[PHASES.QTE_ACTIVE]       = "Nail the timing!";
COMIC_LINES[PHASES.RESOLVING]        = "Nice swing!";
COMIC_LINES[PHASES.ENEMY_TELEGRAPH]  = "Watch out!";
COMIC_LINES[PHASES.DEFENSE_QTE]      = "Block it! Block!";
COMIC_LINES[PHASES.ACTION_CAM_OUT]   = "Not bad!";

// ============================================================
// PHASE DISPLAY LABELS
// ============================================================
var PHASE_LABELS = {};
PHASE_LABELS[PHASES.ATB_RUNNING]     = "ATB RUNNING";
PHASE_LABELS[PHASES.ACTION_SELECT]   = "ACTION SELECT";
PHASE_LABELS[PHASES.ACTION_CAM_IN]   = "ACTION CAM IN";
PHASE_LABELS[PHASES.QTE_ACTIVE]      = "ATTACK QTE";
PHASE_LABELS[PHASES.RESOLVING]       = "RESOLVING";
PHASE_LABELS[PHASES.ENEMY_TELEGRAPH] = "COUNTER";
PHASE_LABELS[PHASES.DEFENSE_QTE]     = "DEFENSE QTE";
PHASE_LABELS[PHASES.ACTION_CAM_OUT]  = "CAM OUT";

// ============================================================
// CSS Custom Properties — driven from LAYOUT constants
// Applied as inline style on .battle-root
// ============================================================
var LAYOUT_VARS = {
    "--battle-open-w":      LAYOUT.openW,
    "--battle-actions-w":   LAYOUT.actionsW,
    "--battle-scene-flex":  LAYOUT.sceneFlex,
    "--battle-bottom-flex": LAYOUT.bottomFlex,
    "--battle-card-min-w":  LAYOUT.cardMinW,
    "--battle-hp-w":        LAYOUT.hpBarW,
    "--battle-atb-bar-h":   LAYOUT.atbBarH,
    "--battle-atb-label-w": LAYOUT.atbLabelW,
    "--battle-sprite-size": LAYOUT.spriteSize,
};

// ============================================================
// BattleSprite — animated spritesheet or static image
// Props: spriteKey (string key into BATTLE_SPRITES)
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

    var cls = "normal-cam-char";
    if (isParty) cls += " normal-cam-char--party";
    if (!isParty) cls += " normal-cam-char--enemy-idle";
    if (isDimmed) cls += " action-cam-char--dimmed";
    if (isAttacker) cls += " action-cam-char--attacker";
    if (isTarget) cls += " action-cam-char--target";

    // Compute slide transform for action cam
    var style = {};
    if (!isParty && props.index != null) {
        style["--bob-delay"] = (props.index * -0.8) + "s";
    }
    if ((isAttacker || isTarget) && props.sceneRect && props.restingRects) {
        var sr = props.sceneRect;
        var cx = sr.width / 2;
        var cy = sr.height / 2;
        var cached = props.restingRects[c.id];
        if (cached) {
            var gap = sr.width * 0.08;
            // Normal: attacker (party) on right, target (enemy) on left
            // Left-handed: flipped
            var atkSide = props.isLeftHanded ? (cx - gap) : (cx + gap);
            var tgtSide = props.isLeftHanded ? (cx + gap) : (cx - gap);
            var destX = isAttacker ? atkSide : tgtSide;
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
    // Party lunges left (toward enemy on left side), enemy lunges right
    var innerStyle = { "--choreo-dir": isParty ? "1" : "-1" };

    return (
        <div
            className={cls}
            style={style}
            ref={props.setRef}
            onClick={props.onClick}
        >
            <div className={innerCls} style={innerStyle}>
                <BattleSprite spriteKey={props.spriteOverride || c.spriteKey} frame={props.spriteFrame} />
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
// ATB Gauge Strip
// ============================================================

function ATBGaugeStrip(props) {
    var hidden = props.hidden;
    var cls = "battle-atb" + (hidden ? " battle-atb--hidden" : "");

    return (
        <div className={cls}>
            {props.combatants.map(function(c) {
                var isParty = c._isParty;
                var fillCls = "battle-atb__bar-fill " + (isParty ? "battle-atb__bar-fill--party" : "battle-atb__bar-fill--enemy");
                return (
                    <div className="battle-atb__row" key={c.id}>
                        <span className="battle-atb__label">{c.name}</span>
                        <div className="battle-atb__bar-bg">
                            <div className={fillCls} style={{ width: (c._atb || 0) + "%" }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================
// Action Menu — 2x2 grid
// ============================================================

function ActionMenu(props) {
    var hidden = props.hidden;
    var cls = "battle-actions" + (hidden ? " battle-actions--hidden" : "");

    return (
        <div className={cls}>
            {ACTIONS.map(function(a) {
                return (
                    <button
                        key={a.id}
                        className="battle-action-btn"
                        style={{ color: a.color, borderColor: a.color + "44", background: a.bg }}
                        onClick={function() { if (props.onAction) props.onAction(a.id); }}
                    >
                        {a.label}
                    </button>
                );
            })}
        </div>
    );
}

// ============================================================
// QTE Zone — overlay placeholder
// ============================================================

function QTEZone(props) {
    var visible = props.visible;
    var isDefense = props.isDefense;
    var isLeft = props.isLeftHanded;

    var cls = "battle-qte" + (visible ? " battle-qte--visible" : "");
    var ringCls = "battle-qte__ring" + (isDefense ? " battle-qte__ring--defense" : "");

    // Position between the two side zones — flips with handedness
    var posStyle = isLeft
        ? { left: "var(--battle-actions-w)", right: "var(--battle-open-w)" }
        : { left: "var(--battle-open-w)", right: "var(--battle-actions-w)" };

    return (
        <div className={cls} style={posStyle}>
            <div className={ringCls}>TAP</div>
            <span className="battle-qte__label">{isDefense ? "defense qte" : "attack qte"}</span>
        </div>
    );
}

// ============================================================
// Comic Panel — fairy portrait + speech bubble
// ============================================================

function ComicPanel(props) {
    var visible = props.visible;
    var isLeft = props.isLeftHanded;
    var cls = "battle-comic" + (visible ? " battle-comic--visible" : "");

    // Sits on the action-menu side — flips with handedness
    var posStyle = isLeft
        ? { left: 0, right: "auto" }
        : { right: 0, left: "auto" };

    return (
        <div className={cls} style={posStyle}>
            <div className="battle-comic__portrait">{props.sprite || "\uD83E\uDDDA"}</div>
            <div className="battle-comic__name">{props.name || "FAIRY"}</div>
            <div className="battle-comic__bubble">{props.line || "..."}</div>
        </div>
    );
}

// ============================================================
// Dev Controls — phase stepping overlay
// ============================================================

function DevControls(props) {
    if (!_DEV_CONTROLS) return null;

    var isCamIn = props.phase !== PHASES.ATB_RUNNING && props.phase !== PHASES.ACTION_SELECT && props.phase !== PHASES.ACTION_CAM_OUT;

    return (
        <div className="battle-dev">
            {/* --- Camera --- */}
            <button
                className={"battle-dev__btn" + (isCamIn ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSetPhase(isCamIn ? PHASES.ATB_RUNNING : PHASES.ACTION_CAM_IN); }}
            >{isCamIn ? "Cam Out" : "Cam In"}</button>
            <div className="battle-dev__sep" />

            {/* --- Target --- */}
            {props.enemies.map(function(e) {
                var active = e.id === props.targetId;
                var cls = "battle-dev__btn" + (active ? " battle-dev__btn--active" : "");
                return (
                    <button key={e.id} className={cls} onClick={function() { props.onSetTarget(e.id); }}>
                        {"vs " + e.name}
                    </button>
                );
            })}
            <div className="battle-dev__sep" />

            {/* --- Sequences --- */}
            <button className="battle-dev__btn" onClick={function() { props.onAtkSeq(props.attackerId, props.targetId); }}>Atk→Tgt</button>
            <button className="battle-dev__btn" onClick={function() { props.onAtkSeq(props.targetId, props.attackerId); }}>Tgt→Atk</button>
            <button className="battle-dev__btn" onClick={function() { props.onKO(props.targetId); }}>KO Tgt</button>
            <button className="battle-dev__btn" onClick={function() { props.onExchange(); }}>Exchange</button>
            <div className="battle-dev__sep" />

            {/* --- Sprite --- */}
            <button
                className={"battle-dev__btn" + (!props.spriteOverride ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSpriteOverride(null); }}
            >Idle</button>
            <button
                className={"battle-dev__btn" + (props.spriteOverride === "fairyCombatKnockdown" ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSpriteOverride("fairyCombatKnockdown"); }}
            >Knockdown</button>
            <div className="battle-dev__sep" />

            {/* --- Panels --- */}
            <button
                className={"battle-dev__btn" + (props.comicOn ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onToggleComic(); }}
            >Comic</button>
            <div className="battle-dev__sep" />

            {/* --- Misc --- */}
            <button className="battle-dev__btn" onClick={props.onToggleATB}>
                {props.atbRunning ? "Pause ATB" : "Run ATB"}
            </button>
            <button className="battle-dev__btn" onClick={props.onExit}>Exit</button>

            {/* --- Phase badge --- */}
            <span className="battle-dev__badge">{PHASE_LABELS[props.phase] || props.phase}</span>
        </div>
    );
}

// ============================================================
// Action Cam HUD — attacker vs target info in bottom zone
// Shows during action cam phases, replaces in-scene info
// ============================================================

function ActionCamInfoPanel(props) {
    var visible = props.visible;
    var isLeft = props.isLeftHanded;
    var baseCls = "action-cam-info" + (visible ? " action-cam-info--visible" : "");

    var attacker = props.attacker;
    var target = props.target;
    if (!attacker || !target) return null;

    var atkHp = attacker.maxHP > 0 ? Math.round(attacker.currentHP / attacker.maxHP * 100) : 0;
    var tgtHp = target.maxHP > 0 ? Math.round(target.currentHP / target.maxHP * 100) : 0;

    // Normal: target (enemy) left, attacker (party) right. Flipped when left-handed.
    var leftData  = isLeft ? attacker : target;
    var rightData = isLeft ? target : attacker;
    var leftHp    = isLeft ? atkHp : tgtHp;
    var rightHp   = isLeft ? tgtHp : atkHp;
    var leftSide  = isLeft ? "atk" : "tgt";
    var rightSide = isLeft ? "tgt" : "atk";

    return (
        <>
            <div className={baseCls + " action-cam-info--left action-cam-info__side--" + leftSide}>
                <span className="action-cam-info__name">{leftData.name}</span>
                <div className="action-cam-info__hp-bg">
                    <div className={"battle-hp-fill " + (leftSide === "atk" ? "battle-hp-fill--party" : "battle-hp-fill--enemy")} style={{ width: leftHp + "%" }} />
                </div>
                <span className="action-cam-info__hp-text">{leftData.currentHP + "/" + leftData.maxHP}</span>
            </div>
            <div className={baseCls + " action-cam-info--right action-cam-info__side--" + rightSide}>
                <span className="action-cam-info__name">{rightData.name}</span>
                <div className="action-cam-info__hp-bg">
                    <div className={"battle-hp-fill " + (rightSide === "atk" ? "battle-hp-fill--party" : "battle-hp-fill--enemy")} style={{ width: rightHp + "%" }} />
                </div>
                <span className="action-cam-info__hp-text">{rightData.currentHP + "/" + rightData.maxHP}</span>
            </div>
        </>
    );
}

// ============================================================
// DamageNumber — floating pop text, self-destructs via CSS anim
// Props: value (number|string), x (px), y (px), color (hex)
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

// ============================================================
// BattleView — Root Layout
// ============================================================

function BattleView(props) {
    var onExit = props.onExit;
    var handedness = props.handedness || "right";
    var zoneName = props.zoneName || "UNKNOWN ZONE";
    var waveLabel = props.waveLabel || "WAVE 1/3";
    var isLeftHanded = handedness === "left";

    // --- State ---
    var [phase, setPhase] = useState(PHASES.ATB_RUNNING);
    var [targetId, setTargetId] = useState(TEST_ENEMIES[0].id);
    var [attackerId] = useState(TEST_PARTY[0].id);
    var [atbRunning, setAtbRunning] = useState(false);
    var [shakeLevel, setShakeLevel] = useState(null);
    var [flashId, setFlashId] = useState(null);
    var [devSpriteOverride, setDevSpriteOverride] = useState(null);
    var [animState, setAnimState] = useState({}); // { combatantId: "strike"|"hit"|"wind_up"|"return" }
    var [devShowComic, setDevShowComic] = useState(false);
    var [damageNumbers, setDamageNumbers] = useState([]);
    var dmgKeyRef = useRef(0);
    var [atbValues, setAtbValues] = useState(function() {
        var v = {};
        TEST_PARTY.forEach(function(c) { v[c.id] = 0; });
        TEST_ENEMIES.forEach(function(c) { v[c.id] = 0; });
        return v;
    });

    // --- Sprite animation frame (shared tick for all animated combatants) ---
    var [spriteFrame, setSpriteFrame] = useState(0);
    useEffect(function() {
        // Use the fairy idle fps as the global battle sprite tick
        var fps = BATTLE_SPRITES.fairyIdle.fps || 1;
        var ms = Math.round(1000 / fps);
        var frames = BATTLE_SPRITES.fairyIdle.frames || 1;
        var id = setInterval(function() {
            setSpriteFrame(function(f) { return (f + 1) % frames; });
        }, ms);
        return function() { clearInterval(id); };
    }, []);

    // --- Refs for combatant elements (for position calc) ---
    var combatantRefs = useRef({});
    var sceneRef = useRef(null);
    var [sceneRect, setSceneRect] = useState(null);
    var restingRectsRef = useRef({});   // cached pre-transform positions

    // Snapshot resting positions ONCE when entering action cam.
    // Reads getBoundingClientRect before any transform is applied,
    // then holds those values for the entire action cam sequence.
    useEffect(function() {
        var entering = phase === PHASES.ACTION_CAM_IN;
        if (!entering) {
            // Leaving action cam — clear cached rects
            if (phase === PHASES.ATB_RUNNING || phase === PHASES.ACTION_CAM_OUT) {
                restingRectsRef.current = {};
                setSceneRect(null);
            }
            return;
        }
        // Use rAF to ensure DOM is laid out before reading
        requestAnimationFrame(function() {
            if (!sceneRef.current) return;
            var sr = sceneRef.current.getBoundingClientRect();
            setSceneRect(sr);
            var rects = {};
            var allIds = TEST_PARTY.concat(TEST_ENEMIES);
            for (var i = 0; i < allIds.length; i++) {
                var id = allIds[i].id;
                var el = combatantRefs.current[id];
                if (el) {
                    var r = el.getBoundingClientRect();
                    rects[id] = {
                        cx: r.left - sr.left + r.width / 2,
                        cy: r.top - sr.top + r.height / 2,
                    };
                }
            }
            restingRectsRef.current = rects;
        });
    }, [phase]);

    // --- ATB tick loop ---
    var atbFrozen = phase !== PHASES.ATB_RUNNING;
    var atbRunningRef = useRef(atbRunning);
    var atbFrozenRef = useRef(atbFrozen);
    atbRunningRef.current = atbRunning;
    atbFrozenRef.current = atbFrozen;

    useEffect(function() {
        if (!atbRunning) return;
        var lastTime = 0;
        var rafId = null;

        function tick(ts) {
            if (!atbRunningRef.current) return;
            if (!lastTime) { lastTime = ts; rafId = requestAnimationFrame(tick); return; }
            var dt = (ts - lastTime) / 1000;
            lastTime = ts;
            if (dt > 0.1) dt = 0.1;

            if (!atbFrozenRef.current) {
                setAtbValues(function(prev) {
                    var next = {};
                    var allCombatants = TEST_PARTY.concat(TEST_ENEMIES);
                    for (var i = 0; i < allCombatants.length; i++) {
                        var c = allCombatants[i];
                        var val = (prev[c.id] || 0) + c.atbSpeed * dt * 100;
                        if (val >= 100) val = 0;
                        next[c.id] = val;
                    }
                    return next;
                });
            }
            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);
        return function() { if (rafId) cancelAnimationFrame(rafId); };
    }, [atbRunning]);

    // --- Helpers ---
    var isActionCam = phase !== PHASES.ATB_RUNNING && phase !== PHASES.ACTION_SELECT && phase !== PHASES.ACTION_CAM_OUT;
    var showQTE = phase === PHASES.QTE_ACTIVE || phase === PHASES.DEFENSE_QTE;
    var isDefenseQTE = phase === PHASES.DEFENSE_QTE;
    var showComic = isActionCam || devShowComic;
    var showSpark = phase === PHASES.RESOLVING;

    var comicLine = devShowComic ? "[DEV] Comic panel test" : (COMIC_LINES[phase] || "...");

    // Lookup active combatant data for action cam HUD
    var allData = TEST_PARTY.concat(TEST_ENEMIES);
    var attackerData = allData.find(function(c) { return c.id === attackerId; }) || null;
    var targetData = allData.find(function(c) { return c.id === targetId; }) || null;

    // Make combatant ref setter
    var makeRefSetter = useCallback(function(id) {
        return function(el) {
            combatantRefs.current[id] = el;
        };
    }, []);

    // Build combatant list with ATB values for gauge strip
    var allCombatants = [];
    TEST_PARTY.forEach(function(c) {
        allCombatants.push(Object.assign({}, c, { _isParty: true, _atb: Math.round(atbValues[c.id] || 0) }));
    });
    TEST_ENEMIES.forEach(function(c) {
        allCombatants.push(Object.assign({}, c, { _isParty: false, _atb: Math.round(atbValues[c.id] || 0) }));
    });

    // --- Dev handlers ---
    function spawnDamageNumber(value, x, y, color) {
        var key = ++dmgKeyRef.current;
        var entry = { key: key, value: value, x: x, y: y, color: color };
        setDamageNumbers(function(prev) { return prev.concat(entry); });
        setTimeout(function() {
            setDamageNumbers(function(prev) { return prev.filter(function(d) { return d.key !== key; }); });
        }, CHOREOGRAPHY.dmgPopMs);
    }
    function handleDevSetPhase(p) { setPhase(p); }
    function handleDevSetTarget(id) {
        setTargetId(id);
    }
    function handleDevToggleATB() { setAtbRunning(function(v) { return !v; }); }
    function handleDevFlash(id) {
        setFlashId(id);
        BattleSFX.hit();
        setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
    }
    function handleDevStrike(id) {
        setAnimState(function(prev) { var n = Object.assign({}, prev); n[id] = "strike"; return n; });
        BattleSFX.hit();
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[id]; return n; });
        }, CHOREOGRAPHY.strikeMs);
    }
    function handleDevHit(id) {
        // Full hit combo: flash + knockback + shake + SFX + damage number
        setFlashId(id);
        setAnimState(function(prev) { var n = Object.assign({}, prev); n[id] = "hit"; return n; });
        BattleSFX.impact();
        setShakeLevel(null);
        requestAnimationFrame(function() { setShakeLevel("medium"); });
        setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[id]; return n; });
        }, CHOREOGRAPHY.hitMs);
        // Damage number at combatant position
        var el = combatantRefs.current[id];
        var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
        if (el && sr) {
            var r = el.getBoundingClientRect();
            var cx = r.left - sr.left + r.width / 2;
            var cy = r.top - sr.top;
            var val = Math.floor(Math.random() * 25) + 3;
            var isPartyHit = TEST_PARTY.some(function(p) { return p.id === id; });
            spawnDamageNumber(val, cx, cy, isPartyHit ? "#ef4444" : "#f59e0b");
        }
    }
    function handleDevWindUp(id) {
        setAnimState(function(prev) { var n = Object.assign({}, prev); n[id] = "wind_up"; return n; });
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[id]; return n; });
        }, CHOREOGRAPHY.windUpMs);
    }
    function handleDevReturn(id) {
        setAnimState(function(prev) { var n = Object.assign({}, prev); n[id] = "return"; return n; });
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[id]; return n; });
        }, CHOREOGRAPHY.returnMs);
    }
    function handleDevAtkSequence(atkId, tgtId) {
        // If attacker is an enemy, prepend telegraph beat
        var isEnemy = TEST_ENEMIES.some(function(e) { return e.id === atkId; });
        var tOff = 0;
        if (isEnemy) {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "telegraph"; return n; });
            tOff = CHOREOGRAPHY.telegraphMs;
        }

        // WindUp → Strike + Hit → Return → Clear
        var t1 = tOff + CHOREOGRAPHY.windUpMs;
        var t2 = t1 + CHOREOGRAPHY.strikeMs;
        var t3 = t2 + CHOREOGRAPHY.returnMs;

        // Wind-up attacker
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "wind_up"; return n; });
        }, tOff);

        // Strike attacker + full hit combo on target
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "strike"; return n; });
            handleDevHit(tgtId);
        }, t1);

        // Return attacker
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "return"; return n; });
        }, t2);

        // Clear attacker
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[atkId]; return n; });
        }, t3);
    }

    function handleDevKO(id) {
        // KO shake + SFX + anim state
        setShakeLevel("ko");
        BattleSFX.ko();
        setAnimState(function(prev) { var n = Object.assign({}, prev); n[id] = "ko"; return n; });
    }

    // ============================================================
    // FULL EXCHANGE SEQUENCER (dev/prototype)
    // Plays the complete exchange choreography with timed auto-advance.
    // Simulates QTE results — real QTE callbacks replace the pauses later.
    //
    // Timeline:
    //   ACTION_CAM_IN  → wind_up
    //   (QTE pause)    → RESOLVING player attack
    //   ENEMY_TELEGRAPH → (defense pause) → RESOLVING enemy counter
    //   ACTION_CAM_OUT → ATB_RUNNING
    // ============================================================
    function handleDevFullExchange() {
        var atkId = attackerId;
        var tgtId = targetId;

        // Simulated QTE results
        var atkDmg = Math.floor(Math.random() * 25) + 5;
        var defDmg = Math.floor(Math.random() * 15) + 3;

        // Accumulating timeline offset
        var t = 0;

        // ---- PHASE 1: ACTION_CAM_IN (350ms) ----
        setPhase(PHASES.ACTION_CAM_IN);
        setAtbRunning(false);

        // Wind-up attacker after slide completes
        t += 350;
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "wind_up"; return n; });
        }, t);

        // ---- PHASE 2: QTE_ACTIVE (simulated 800ms hold) ----
        t += 50; // brief gap after wind_up starts
        setTimeout(function() {
            setPhase(PHASES.QTE_ACTIVE);
        }, t);

        t += 800; // simulated QTE duration

        // ---- PHASE 3: RESOLVING — Player Attack (500ms) ----
        setTimeout(function() {
            setPhase(PHASES.RESOLVING);

            // Strike attacker
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "strike"; return n; });
            BattleSFX.hit();

            // Hit combo on target at +80ms
            setTimeout(function() {
                setFlashId(tgtId);
                setAnimState(function(prev) { var n = Object.assign({}, prev); n[tgtId] = "hit"; return n; });
                BattleSFX.impact();
                setShakeLevel(null);
                requestAnimationFrame(function() { setShakeLevel("heavy"); });

                // Damage number at target position
                var el = combatantRefs.current[tgtId];
                var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                if (el && sr) {
                    var r = el.getBoundingClientRect();
                    var cx = r.left - sr.left + r.width / 2;
                    var cy = r.top - sr.top;
                    spawnDamageNumber(atkDmg, cx, cy, "#f59e0b");
                }

                // Clear flash
                setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
            }, 80);

            // Return attacker at +250ms
            setTimeout(function() {
                setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "return"; return n; });
            }, 250);

            // Clear target knockback at +300ms
            setTimeout(function() {
                setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[tgtId]; return n; });
            }, 300);

            // Clear attacker at +400ms
            setTimeout(function() {
                setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[atkId]; return n; });
            }, 400);
        }, t);

        // ---- PHASE 4: ENEMY_TELEGRAPH (300ms) ----
        t += 500; // after player resolve completes
        setTimeout(function() {
            setPhase(PHASES.ENEMY_TELEGRAPH);
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[tgtId] = "telegraph"; return n; });
        }, t);

        // ---- PHASE 5: DEFENSE_QTE (simulated 600ms hold) ----
        t += CHOREOGRAPHY.telegraphMs;
        setTimeout(function() {
            setPhase(PHASES.DEFENSE_QTE);
            // Enemy holds end-of-telegraph pose (forwards fill keeps it)
        }, t);

        t += 600; // simulated defense QTE duration

        // ---- PHASE 6: RESOLVING — Enemy Counter (500ms) ----
        setTimeout(function() {
            setPhase(PHASES.RESOLVING);

            // Enemy strikes
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[tgtId] = "strike"; return n; });
            BattleSFX.hit();

            // Hit combo on party member at +80ms
            setTimeout(function() {
                setFlashId(atkId);
                setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "hit"; return n; });
                BattleSFX.impact();
                setShakeLevel(null);
                requestAnimationFrame(function() { setShakeLevel("medium"); });

                // Damage number at attacker position
                var el = combatantRefs.current[atkId];
                var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                if (el && sr) {
                    var r = el.getBoundingClientRect();
                    var cx = r.left - sr.left + r.width / 2;
                    var cy = r.top - sr.top;
                    spawnDamageNumber(defDmg, cx, cy, "#ef4444");
                }

                // Clear flash
                setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
            }, 80);

            // Return enemy at +250ms
            setTimeout(function() {
                setAnimState(function(prev) { var n = Object.assign({}, prev); n[tgtId] = "return"; return n; });
            }, 250);

            // Clear party knockback at +300ms
            setTimeout(function() {
                setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[atkId]; return n; });
            }, 300);

            // Clear enemy at +400ms
            setTimeout(function() {
                setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[tgtId]; return n; });
            }, 400);
        }, t);

        // ---- PHASE 7: ACTION_CAM_OUT (350ms) ----
        t += 500; // after enemy resolve completes
        setTimeout(function() {
            setPhase(PHASES.ACTION_CAM_OUT);
        }, t);

        // ---- BACK TO ATB ----
        t += 350;
        setTimeout(function() {
            setPhase(PHASES.ATB_RUNNING);
            setAnimState({});
            setAtbRunning(true);
        }, t);
    }

    // --- Action handler ---
    function handleAction(actionId) {
        if (actionId === "flee" && onExit) {
            onExit();
        } else if (actionId === "attack") {
            setPhase(PHASES.ACTION_CAM_IN);
        }
    }

    // --- Render ---
    // Bottom zone order: right-handed = open|ATB|actions, left-handed = actions|ATB|open
    var bottomStyle = isLeftHanded ? { flexDirection: "row-reverse" } : {};

    var sceneCls = "battle-scene" + (shakeLevel ? " battle-scene--shake-" + shakeLevel : "");

    return (
        <div className="battle-root" style={LAYOUT_VARS}>
            {/* === SCENE ZONE === */}
            <div
                className={sceneCls}
                ref={sceneRef}
                onAnimationEnd={function() { setShakeLevel(null); }}
            >
                <span className="battle-scene-zoneName">{zoneName}</span>
                <span className="battle-scene-waveLabel">{waveLabel}</span>

                {/* Enemy formation (left) */}
                <div className="battle-formation battle-formation--enemy">
                    {TEST_ENEMIES.map(function(e, idx) {
                        return (
                            <BattleCharacter
                                key={e.id}
                                data={e}
                                isParty={false}
                                index={idx}
                                phase={phase}
                                attackerId={attackerId}
                                targetId={targetId}
                                sceneRect={isActionCam ? sceneRect : null}
                                restingRects={restingRectsRef.current}
                                setRef={makeRefSetter(e.id)}
                                onClick={function() { setTargetId(e.id); }}
                                spriteFrame={spriteFrame}
                                flashId={flashId}
                                animState={animState}
                                isLeftHanded={isLeftHanded}
                            />
                        );
                    })}
                </div>

                {/* Party formation (right) */}
                <div className="battle-formation battle-formation--party">
                    {TEST_PARTY.map(function(p) {
                        return (
                            <BattleCharacter
                                key={p.id}
                                data={p}
                                isParty={true}
                                spriteOverride={devSpriteOverride}
                                phase={phase}
                                attackerId={attackerId}
                                targetId={targetId}
                                sceneRect={isActionCam ? sceneRect : null}
                                restingRects={restingRectsRef.current}
                                setRef={makeRefSetter(p.id)}
                                spriteFrame={spriteFrame}
                                flashId={flashId}
                                animState={animState}
                                isLeftHanded={isLeftHanded}
                            />
                        );
                    })}
                </div>

                {/* Clash spark */}
                <span className={"battle-spark" + (showSpark ? " battle-spark--visible" : "")}>
                    {"\u2694\uFE0F"}
                </span>

                {/* Action cam pixel frame */}
                <div className={"battle-cam-frame" + (isActionCam ? " battle-cam-frame--visible" : "")} />

                {/* Damage numbers */}
                {damageNumbers.map(function(d) {
                    return <DamageNumber key={d.key} value={d.value} x={d.x} y={d.y} color={d.color} />;
                })}
            </div>

            {/* Action cam info — pinned to scene edges, lives outside
                shake container so screen shake doesn't rattle the panels */}
            <ActionCamInfoPanel
                visible={isActionCam}
                attacker={attackerData}
                target={targetData}
                isLeftHanded={isLeftHanded}
            />

            {/* === BOTTOM ZONE === */}
            <div className="battle-bottom" style={bottomStyle}>

                {/* Open real estate */}
                <div className="battle-open">
                    <span className="battle-open__label">open real estate</span>
                    <span className="battle-open__label">buffs / status</span>
                </div>

                {/* ATB gauges */}
                <ATBGaugeStrip
                    combatants={allCombatants}
                    hidden={isActionCam}
                />

                {/* Action menu */}
                <ActionMenu
                    hidden={isActionCam}
                    onAction={handleAction}
                />

                {/* QTE zone overlay */}
                <QTEZone visible={showQTE} isDefense={isDefenseQTE} isLeftHanded={isLeftHanded} />

                {/* Comic panel (replaces action zone visually during action cam) */}
                <ComicPanel
                    visible={showComic}
                    sprite={null}
                    name={TEST_PARTY[1].name}
                    line={comicLine}
                    isLeftHanded={isLeftHanded}
                />
            </div>

            {/* === DEV CONTROLS === */}
            <DevControls
                phase={phase}
                targetId={targetId}
                attackerId={attackerId}
                enemies={TEST_ENEMIES}
                atbRunning={atbRunning}
                spriteOverride={devSpriteOverride}
                onSetPhase={handleDevSetPhase}
                onSetTarget={handleDevSetTarget}
                onToggleATB={handleDevToggleATB}
                onSpriteOverride={setDevSpriteOverride}
                onAtkSeq={handleDevAtkSequence}
                onKO={handleDevKO}
                onExchange={handleDevFullExchange}
                comicOn={devShowComic}
                onToggleComic={function() { setDevShowComic(function(v) { return !v; }); }}
                onExit={onExit}
            />
        </div>
    );
}

// ============================================================
// Plugin-style API — same export shape as original
// ============================================================
var BattleViewModule = {
    BattleView: BattleView,
};

export default BattleViewModule;