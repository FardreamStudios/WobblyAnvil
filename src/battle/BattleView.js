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
// Exchange: manual button-driven. Two ATK buttons in-cam —
//   one for player side, one for enemy side. Enabled when it's
//   that side's turn. Press to trigger swing → QTE → resolve.
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
import BattleSkills from "./battleSkills.js";
import BattleATB from "./battleATB.js";
import BattleSFX from "./battleSFX.js";
import QTERunnerModule from "./QTERunner.js";
import "./BattleView.css";

var QTERunner = QTERunnerModule.QTERunner;

var PHASES = BattleConstants.BATTLE_PHASES;
var ACTION_CAM = BattleConstants.ACTION_CAM;
var EXCHANGE = BattleConstants.EXCHANGE;
var ACTIONS = BattleConstants.ACTIONS;
var LAYOUT = BattleConstants.LAYOUT;
var BATTLE_SPRITES = BattleConstants.BATTLE_SPRITES;
var ATB = BattleConstants.ATB;
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
COMIC_LINES[PHASES.CAM_TELEGRAPH]    = "Watch out!";
COMIC_LINES[PHASES.CAM_SWING]        = "Nail the timing!";
COMIC_LINES[PHASES.CAM_RESOLVE]      = "Nice swing!";
COMIC_LINES[PHASES.ACTION_CAM_OUT]   = "Not bad!";

// ============================================================
// PHASE DISPLAY LABELS
// ============================================================
var PHASE_LABELS = {};
PHASE_LABELS[PHASES.ATB_RUNNING]     = "ATB RUNNING";
PHASE_LABELS[PHASES.ACTION_SELECT]   = "ACTION SELECT";
PHASE_LABELS[PHASES.ACTION_CAM_IN]   = "ACTION CAM IN";
PHASE_LABELS[PHASES.CAM_TURN_START]  = "CAM TURN";
PHASE_LABELS[PHASES.CAM_WAIT_ACTION] = "CAM WAIT";
PHASE_LABELS[PHASES.CAM_TELEGRAPH]   = "TELEGRAPH";
PHASE_LABELS[PHASES.CAM_SWING]       = "SWING";
PHASE_LABELS[PHASES.CAM_RESOLVE]     = "RESOLVE";
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
    var maxPips = ATB.pipsPerCombatant;

    return (
        <div className={cls}>
            {props.combatants.map(function(c) {
                var isParty = c._isParty;
                var pips = c._pips || { filledPips: 0, currentFill: 0 };
                var isReady = pips.filledPips >= maxPips;
                var barCls = "battle-atb__bar-bg" + (isReady ? " battle-atb__bar-bg--ready" : "");
                var fillColorCls = isParty ? "battle-atb__pip--party" : "battle-atb__pip--enemy";

                var segments = [];
                for (var i = 0; i < maxPips; i++) {
                    var segCls = "battle-atb__pip";
                    var fillPct = 0;

                    if (i < pips.filledPips) {
                        segCls += " battle-atb__pip--full";
                        fillPct = 100;
                    } else if (i === pips.filledPips) {
                        fillPct = Math.round(pips.currentFill * 100);
                    }

                    segments.push(
                        <div className={segCls + " " + fillColorCls} key={i}>
                            <div
                                className="battle-atb__pip-fill"
                                style={{ width: fillPct + "%" }}
                            />
                        </div>
                    );
                }

                return (
                    <div className="battle-atb__row" key={c.id}>
                        <span className="battle-atb__label">{c.name}</span>
                        <div className={barCls}>
                            {segments}
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
            <button
                className={"battle-dev__btn" + (isCamIn ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSetPhase(isCamIn ? PHASES.ATB_RUNNING : PHASES.ACTION_CAM_IN); }}
            >{isCamIn ? "Cam Out" : "Cam In"}</button>
            <div className="battle-dev__sep" />

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

            <button className="battle-dev__btn" onClick={function() { props.onAtkSeq(props.attackerId, props.targetId); }}>Atk→Tgt</button>
            <button className="battle-dev__btn" onClick={function() { props.onAtkSeq(props.targetId, props.attackerId); }}>Tgt→Atk</button>
            <button className="battle-dev__btn" onClick={function() { props.onKO(props.targetId); }}>KO Tgt</button>
            <button className="battle-dev__btn" onClick={function() { props.onExchange(); }}>Exchange</button>
            <div className="battle-dev__sep" />

            <button
                className={"battle-dev__btn" + (!props.spriteOverride ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSpriteOverride(null); }}
            >Idle</button>
            <button
                className={"battle-dev__btn" + (props.spriteOverride === "fairyCombatKnockdown" ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSpriteOverride("fairyCombatKnockdown"); }}
            >Knockdown</button>
            <div className="battle-dev__sep" />

            <button
                className={"battle-dev__btn" + (props.comicOn ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onToggleComic(); }}
            >Comic</button>
            <div className="battle-dev__sep" />

            <button className="battle-dev__btn" onClick={props.onToggleATB}>
                {props.atbRunning ? "Pause ATB" : "Run ATB"}
            </button>
            <button className="battle-dev__btn" onClick={props.onFillPips}>Fill Pips</button>
            <button className="battle-dev__btn" onClick={props.onExit}>Exit</button>

            <span className="battle-dev__badge">{PHASE_LABELS[props.phase] || props.phase}</span>
        </div>
    );
}

// ============================================================
// Action Cam HUD — attacker vs target info in bottom zone
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

    var atkIsParty = TEST_PARTY.some(function(p) { return p.id === attacker.id; });

    var partyData  = atkIsParty ? attacker : target;
    var enemyData  = atkIsParty ? target : attacker;
    var partyHp    = atkIsParty ? atkHp : tgtHp;
    var enemyHp    = atkIsParty ? tgtHp : atkHp;

    var leftData  = isLeft ? partyData : enemyData;
    var rightData = isLeft ? enemyData : partyData;
    var leftHp    = isLeft ? partyHp : enemyHp;
    var rightHp   = isLeft ? enemyHp : partyHp;
    var leftIsParty  = isLeft ? true : false;
    var rightIsParty = isLeft ? false : true;

    return (
        <>
            <div className={baseCls + " action-cam-info--left action-cam-info__side--" + (leftIsParty ? "atk" : "tgt")}>
                <span className="action-cam-info__name">{leftData.name}</span>
                <div className="action-cam-info__hp-bg">
                    <div className={"battle-hp-fill " + (leftIsParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy")} style={{ width: leftHp + "%" }} />
                </div>
                <span className="action-cam-info__hp-text">{leftData.currentHP + "/" + leftData.maxHP}</span>
            </div>
            <div className={baseCls + " action-cam-info--right action-cam-info__side--" + (rightIsParty ? "atk" : "tgt")}>
                <span className="action-cam-info__name">{rightData.name}</span>
                <div className="action-cam-info__hp-bg">
                    <div className={"battle-hp-fill " + (rightIsParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy")} style={{ width: rightHp + "%" }} />
                </div>
                <span className="action-cam-info__hp-text">{rightData.currentHP + "/" + rightData.maxHP}</span>
            </div>
        </>
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
    var [turnOwnerId, setTurnOwnerId] = useState(null);
    var [attackerId] = useState(TEST_PARTY[0].id);
    var [atbRunning, setAtbRunning] = useState(false);
    var [shakeLevel, setShakeLevel] = useState(null);
    var [flashId, setFlashId] = useState(null);
    var [devSpriteOverride, setDevSpriteOverride] = useState(null);
    var [animState, setAnimState] = useState({});
    var [devShowComic, setDevShowComic] = useState(false);
    var [damageNumbers, setDamageNumbers] = useState([]);
    var dmgKeyRef = useRef(0);
    var [qteConfig, setQteConfig] = useState(null);
    var qteKeyRef = useRef(0);
    var qteResolveRef = useRef(null);
    var qteContextRef = useRef(null);
    var readyIdRef = useRef(null);
    var atbValuesRef = useRef(null);

    // --- In-cam exchange state ---
    var camExchangeRef = useRef(null);
    var [atbValues, setAtbValues] = useState(function() {
        return BattleATB.initState(TEST_PARTY.concat(TEST_ENEMIES));
    });
    atbValuesRef.current = atbValues;

    // --- Sprite animation frame ---
    var [spriteFrame, setSpriteFrame] = useState(0);
    useEffect(function() {
        var fps = BATTLE_SPRITES.fairyIdle.fps || 1;
        var ms = Math.round(1000 / fps);
        var frames = BATTLE_SPRITES.fairyIdle.frames || 1;
        var id = setInterval(function() {
            setSpriteFrame(function(f) { return (f + 1) % frames; });
        }, ms);
        return function() { clearInterval(id); };
    }, []);

    // --- Refs for combatant elements ---
    var combatantRefs = useRef({});
    var sceneRef = useRef(null);
    var [sceneRect, setSceneRect] = useState(null);
    var restingRectsRef = useRef({});

    // Snapshot resting positions when entering action cam
    useEffect(function() {
        var entering = phase === PHASES.ACTION_CAM_IN;
        if (!entering) {
            if (phase === PHASES.ATB_RUNNING || phase === PHASES.ACTION_CAM_OUT) {
                restingRectsRef.current = {};
                setSceneRect(null);
            }
            return;
        }
        requestAnimationFrame(function() {
            if (!sceneRef.current) return;
            var sr = sceneRef.current.getBoundingClientRect();
            setSceneRect(sr);
            var rects = {};
            var allIds = TEST_PARTY.concat(TEST_ENEMIES);
            for (var i = 0; i < allIds.length; i++) {
                var cId = allIds[i].id;
                var el = combatantRefs.current[cId];
                if (el) {
                    var r = el.getBoundingClientRect();
                    rects[cId] = {
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
        var tickCombatants = TEST_PARTY.concat(TEST_ENEMIES);

        function tick(ts) {
            if (!atbRunningRef.current) return;
            if (!lastTime) { lastTime = ts; rafId = requestAnimationFrame(tick); return; }
            var dt = (ts - lastTime) / 1000;
            lastTime = ts;
            if (dt > 0.1) dt = 0.1;

            setAtbValues(function(prev) {
                var result = BattleATB.tick(dt, prev, tickCombatants, atbFrozenRef.current);
                if (result.readyId) {
                    readyIdRef.current = result.readyId;
                }
                return result.nextState;
            });

            if (readyIdRef.current) {
                var whoIsReady = readyIdRef.current;
                readyIdRef.current = null;

                var isPartyMember = TEST_PARTY.some(function(p) { return p.id === whoIsReady; });
                setTurnOwnerId(whoIsReady);

                if (isPartyMember) {
                    setPhase(PHASES.ACTION_SELECT);
                    setAtbRunning(false);
                } else {
                    setAtbRunning(false);
                    var enemyTgt = TEST_PARTY[0].id;
                    setTargetId(enemyTgt);
                    startExchange(whoIsReady, enemyTgt);
                }
                return;
            }

            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);
        return function() { if (rafId) cancelAnimationFrame(rafId); };
    }, [atbRunning]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Helpers ---
    var isActionCam = phase !== PHASES.ATB_RUNNING && phase !== PHASES.ACTION_SELECT && phase !== PHASES.ACTION_CAM_OUT;
    var showQTE = phase === PHASES.CAM_SWING;
    var showComic = isActionCam || devShowComic;
    var showSpark = phase === PHASES.CAM_RESOLVE;

    var comicLine = devShowComic ? "[DEV] Comic panel test" : (COMIC_LINES[phase] || "...");

    var activeAtkId = turnOwnerId || attackerId;
    var allData = TEST_PARTY.concat(TEST_ENEMIES);
    var attackerData = allData.find(function(c) { return c.id === activeAtkId; }) || null;
    var targetData = allData.find(function(c) { return c.id === targetId; }) || null;

    var makeRefSetter = useCallback(function(id) {
        return function(el) {
            combatantRefs.current[id] = el;
        };
    }, []);

    // Build combatant list with pip data for gauge strip
    var allCombatants = [];
    TEST_PARTY.forEach(function(c) {
        var pips = atbValues[c.id] || { filledPips: 0, currentFill: 0 };
        allCombatants.push(Object.assign({}, c, { _isParty: true, _pips: pips }));
    });
    TEST_ENEMIES.forEach(function(c) {
        var pips = atbValues[c.id] || { filledPips: 0, currentFill: 0 };
        allCombatants.push(Object.assign({}, c, { _isParty: false, _pips: pips }));
    });

    // ============================================================
    // DAMAGE NUMBER SPAWNER
    // ============================================================
    function spawnDamageNumber(value, x, y, color) {
        var key = ++dmgKeyRef.current;
        var entry = { key: key, value: value, x: x, y: y, color: color };
        setDamageNumbers(function(prev) { return prev.concat(entry); });
        setTimeout(function() {
            setDamageNumbers(function(prev) { return prev.filter(function(d) { return d.key !== key; }); });
        }, CHOREOGRAPHY.dmgPopMs);
    }

    // ============================================================
    // DEV HANDLERS
    // ============================================================
    function handleDevSetPhase(p) { setPhase(p); }
    function handleDevSetTarget(id) { setTargetId(id); }
    function handleDevToggleATB() { setAtbRunning(function(v) { return !v; }); }
    function handleDevFillPips() {
        setAtbValues(function(prev) { return BattleATB.fillAll(prev, attackerId); });
    }
    function handleDevHit(id) {
        setFlashId(id);
        setAnimState(function(prev) { var n = Object.assign({}, prev); n[id] = "hit"; return n; });
        BattleSFX.impact();
        setShakeLevel(null);
        requestAnimationFrame(function() { setShakeLevel("medium"); });
        setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[id]; return n; });
        }, CHOREOGRAPHY.hitMs);
        var el = combatantRefs.current[id];
        var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
        if (el && sr) {
            var r = el.getBoundingClientRect();
            var hitCx = r.left - sr.left + r.width / 2;
            var hitCy = r.top - sr.top;
            var val = Math.floor(Math.random() * 25) + 3;
            var isPartyHit = TEST_PARTY.some(function(p) { return p.id === id; });
            spawnDamageNumber(val, hitCx, hitCy, isPartyHit ? "#ef4444" : "#f59e0b");
        }
    }
    function handleDevAtkSequence(atkId, tgtId) {
        var isEnemy = TEST_ENEMIES.some(function(e) { return e.id === atkId; });
        var tOff = 0;
        if (isEnemy) {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "telegraph"; return n; });
            tOff = CHOREOGRAPHY.telegraphMs;
        }

        var t1 = tOff + CHOREOGRAPHY.windUpMs;
        var t2 = t1 + CHOREOGRAPHY.strikeMs;
        var t3 = t2 + CHOREOGRAPHY.returnMs;

        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "wind_up"; return n; });
        }, tOff);

        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "strike"; return n; });
            handleDevHit(tgtId);
        }, t1);

        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); n[atkId] = "return"; return n; });
        }, t2);

        setTimeout(function() {
            setAnimState(function(prev) { var n = Object.assign({}, prev); delete n[atkId]; return n; });
        }, t3);
    }
    function handleDevKO(id) {
        setShakeLevel("ko");
        BattleSFX.ko();
        setAnimState(function(prev) { var n = Object.assign({}, prev); n[id] = "ko"; return n; });
    }

    // ============================================================
    // QTE RING START — sync enemy telegraph anim to ring shrink
    // Fires when each ring begins shrinking. If swinger is enemy,
    // apply telegraph-sync anim with duration matching the ring.
    // ============================================================
    function handleQTERingStart(index, durationMs) {
        var ctx = qteContextRef.current;
        if (!ctx) return;

        var swinger = ctx.swingerId;
        var swingerIsEnemy = TEST_ENEMIES.some(function(e) { return e.id === swinger; });

        // Pick the right sync anim class based on faction
        var syncClass = swingerIsEnemy ? "telegraph-sync" : "windup-sync";

        setAnimState(function(prev) {
            var n = Object.assign({}, prev);
            n[swinger] = syncClass;
            return n;
        });

        // Set CSS var for ring duration + force anim restart
        var el = combatantRefs.current[swinger];
        if (el) {
            var choreoEl = el.querySelector(".normal-cam-char__choreo");
            if (choreoEl) {
                choreoEl.style.setProperty("--telegraph-duration", durationMs + "ms");
                choreoEl.classList.remove("normal-cam-char__choreo--" + syncClass);
                void choreoEl.offsetWidth; // reflow
                choreoEl.classList.add("normal-cam-char__choreo--" + syncClass);
            }
        }
    }

    // ============================================================
    // QTE CALLBACKS
    // ============================================================
    function handleQTEComplete(result) {
        setQteConfig(null);
        if (qteResolveRef.current) {
            qteResolveRef.current(result);
            qteResolveRef.current = null;
        }
    }

    function handleQTERingResult(index, hit) {
        var ctx = qteContextRef.current;
        if (!ctx) return;

        var swinger = ctx.swingerId;
        var receiver = ctx.receiverId;

        var skill = ctx.skill;
        var beat = skill && skill.beats && skill.beats[index]
            ? BattleSkills.resolveBeat(skill.beats[index])
            : null;

        if (!beat) {
            console.warn("[BattleView] No beat data for ring " + index);
            return;
        }

        var swingerIsEnemy = TEST_ENEMIES.some(function(e) { return e.id === swinger; });
        var receiverIsParty = TEST_PARTY.some(function(p) { return p.id === receiver; });
        var dmgColor = receiverIsParty ? "#ef4444" : "#f59e0b";

        if (swingerIsEnemy) {
            // Swinger telegraph-sync is driven by onRingStart — don't touch it.
            // Just play SFX + resolve hit on receiver.
            if (beat.sfx) BattleSFX[beat.sfx] ? BattleSFX[beat.sfx]() : BattleSFX.hit();
            resolveHitOnReceiver(hit, beat, swinger, receiver, dmgColor);

            // Clear receiver anim after hit settles (swinger stays in telegraph-sync)
            setTimeout(function() {
                setAnimState(function(prev) {
                    var n = Object.assign({}, prev); delete n[receiver]; return n;
                });
            }, 260);
        } else {
            // Player swings — windup-sync is driven by onRingStart, don't touch swinger anim.
            // Just play SFX + resolve hit on receiver.
            if (hit) {
                if (beat.sfx) BattleSFX[beat.sfx] ? BattleSFX[beat.sfx]() : BattleSFX.hit();
                setTimeout(function() {
                    if (beat.tgtReact) {
                        setFlashId(receiver);
                        setAnimState(function(prev) {
                            var n = Object.assign({}, prev); n[receiver] = beat.tgtReact; return n;
                        });
                    }
                    if (beat.shake) {
                        setShakeLevel(null);
                        requestAnimationFrame(function() { setShakeLevel(beat.shake); });
                    }
                    var el = combatantRefs.current[receiver];
                    var sr2 = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                    if (el && sr2) {
                        var r2 = el.getBoundingClientRect();
                        spawnDamageNumber(beat.damage, r2.left - sr2.left + r2.width / 2, r2.top - sr2.top, dmgColor);
                    }
                    setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
                }, 60);
                // Clear receiver anim after hit settles (swinger stays in windup-sync)
                setTimeout(function() {
                    setAnimState(function(prev) {
                        var n = Object.assign({}, prev); delete n[receiver]; return n;
                    });
                }, 260);
            } else {
                // Whiff — SFX miss, damage number, don't touch swinger
                var el2 = combatantRefs.current[receiver];
                var sr3 = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                if (el2 && sr3) {
                    var r3 = el2.getBoundingClientRect();
                    spawnDamageNumber("MISS", r3.left - sr3.left + r3.width / 2, r3.top - sr3.top, "#888888");
                }
            }
        }
    }

    function resolveHitOnReceiver(hit, beat, swinger, receiver, dmgColor) {
        if (hit) {
            var blocked = beat.blockable !== false;
            if (blocked) {
                var blockDmg = Math.round(beat.damage * (beat.blockMult || 0.3));
                setAnimState(function(prev) {
                    var n = Object.assign({}, prev); n[receiver] = "brace"; return n;
                });
                BattleSFX.block();
                var el = combatantRefs.current[receiver];
                var sr4 = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                if (el && sr4) {
                    var r4 = el.getBoundingClientRect();
                    spawnDamageNumber(blockDmg, r4.left - sr4.left + r4.width / 2, r4.top - sr4.top, "#60a5fa");
                }
            } else {
                applyFullHit(beat, receiver, dmgColor);
            }
        } else {
            applyFullHit(beat, receiver, dmgColor);
        }
    }

    function applyFullHit(beat, receiver, dmgColor) {
        setFlashId(receiver);
        setAnimState(function(prev) {
            var n = Object.assign({}, prev); n[receiver] = "hit"; return n;
        });
        if (beat.shake) {
            setShakeLevel(null);
            requestAnimationFrame(function() { setShakeLevel(beat.shake); });
        }
        var el = combatantRefs.current[receiver];
        var sr5 = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
        if (el && sr5) {
            var r5 = el.getBoundingClientRect();
            spawnDamageNumber(beat.damage, r5.left - sr5.left + r5.width / 2, r5.top - sr5.top, dmgColor);
        }
        setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
    }

    // ============================================================
    // QTE ACTIVATOR
    // ============================================================
    function activateQTE(config, onResolve, context) {
        qteKeyRef.current += 1;
        qteResolveRef.current = onResolve;
        qteContextRef.current = context || null;
        setQteConfig(Object.assign({}, config, { _key: qteKeyRef.current }));
    }

    // ============================================================
    // IN-CAM EXCHANGE — Manual Button-Driven Turn Loop
    //
    // Flow:
    //   startExchange(initiatorId, responderId)
    //     → cam in → CAM_WAIT_ACTION (initiator's ATK button lights up)
    //
    //   handleCamATK()  [player presses the lit button]
    //     → telegraph/wind-up → QTE → resolve
    //     → swap sides → CAM_WAIT_ACTION (other button lights up)
    //     → after 2 swings: cam out
    // ============================================================

    function startExchange(initiatorId, responderId) {
        camExchangeRef.current = {
            initiatorId: initiatorId,
            responderId: responderId,
            swingCount: 0,
            currentSwingerId: initiatorId,
            currentReceiverId: responderId,
        };

        setPhase(PHASES.ACTION_CAM_IN);
        setAtbRunning(false);

        setTimeout(function() {
            setPhase(PHASES.CAM_WAIT_ACTION);
        }, ACTION_CAM.transitionInMs);
    }

    function handleCamATK() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;

        var swingerId = cam.currentSwingerId;
        var receiverId = cam.currentReceiverId;

        var swingerData = allData.find(function(c) { return c.id === swingerId; });
        var skill = BattleSkills.getSkill(swingerData && swingerData.skills ? swingerData.skills[0] : null);

        if (!skill) {
            console.warn("[BattleView] No skill for " + swingerId + ", skipping");
            cam.swingCount += 1;
            advanceOrCamOut();
            return;
        }

        // Both sides go straight to QTE. Enemy telegraph is now driven
        // by onRingStart synced to ring shrink — no pre-QTE delay needed.
        doCamSwing(swingerId, receiverId, skill);
    }

    function doCamSwing(swingerId, receiverId, skill) {
        setPhase(PHASES.CAM_SWING);

        activateQTE(skill, function onQTEDone(result) {
            var cam = camExchangeRef.current;
            if (cam) cam.swingCount += 1;

            setPhase(PHASES.CAM_RESOLVE);

            setAnimState(function(prev) {
                var n = Object.assign({}, prev);
                delete n[swingerId];
                delete n[receiverId];
                return n;
            });

            setTimeout(function() {
                advanceOrCamOut();
            }, EXCHANGE.resolveHoldMs);
        }, { swingerId: swingerId, receiverId: receiverId, skill: skill });
    }

    function advanceOrCamOut() {
        var cam = camExchangeRef.current;
        if (!cam) { camOut(); return; }

        if (cam.swingCount >= 2) {
            camOut();
        } else {
            var nextSwinger = cam.currentReceiverId;
            var nextReceiver = cam.currentSwingerId;
            cam.currentSwingerId = nextSwinger;
            cam.currentReceiverId = nextReceiver;
            setPhase(PHASES.CAM_WAIT_ACTION);
        }
    }

    function camOut() {
        setPhase(PHASES.ACTION_CAM_OUT);
        var cam = camExchangeRef.current;
        var initiatorId = cam ? cam.initiatorId : null;

        setTimeout(function() {
            setAnimState({});
            camExchangeRef.current = null;

            var resetState = initiatorId
                ? BattleATB.reset(atbValuesRef.current, initiatorId)
                : atbValuesRef.current;
            setAtbValues(resetState);
            setTurnOwnerId(null);
            setTargetId(TEST_ENEMIES[0].id);

            var checkCombatants = TEST_PARTY.concat(TEST_ENEMIES);
            var alreadyReady = BattleATB.checkReady(resetState, checkCombatants);

            if (alreadyReady) {
                var isPartyMember = TEST_PARTY.some(function(p) { return p.id === alreadyReady; });
                setTurnOwnerId(alreadyReady);

                if (isPartyMember) {
                    setPhase(PHASES.ACTION_SELECT);
                } else {
                    var enemyTgt = TEST_PARTY[0].id;
                    setTargetId(enemyTgt);
                    setPhase(PHASES.ATB_RUNNING);
                    startExchange(alreadyReady, enemyTgt);
                }
            } else {
                setPhase(PHASES.ATB_RUNNING);
                setAtbRunning(true);
            }
        }, ACTION_CAM.transitionOutMs);
    }

    function handleDevFullExchange() {
        var atkId = turnOwnerId || attackerId;
        startExchange(atkId, targetId);
    }

    function handleAction(actionId) {
        if (actionId === "flee" && onExit) {
            onExit();
        } else if (actionId === "attack") {
            var atkId = turnOwnerId || attackerId;
            startExchange(atkId, targetId);
        }
    }

    // ============================================================
    // IN-CAM ATK BUTTON STATE
    // ============================================================
    var camWaiting = phase === PHASES.CAM_WAIT_ACTION;
    var cam = camExchangeRef.current;
    var camSwingerId = cam ? cam.currentSwingerId : null;
    var camSwingerIsParty = camSwingerId ? TEST_PARTY.some(function(p) { return p.id === camSwingerId; }) : false;
    var camSwingerIsEnemy = camSwingerId ? TEST_ENEMIES.some(function(e) { return e.id === camSwingerId; }) : false;

    var playerAtkEnabled = camWaiting && camSwingerIsParty;
    var enemyAtkEnabled  = camWaiting && camSwingerIsEnemy;

    // --- Render ---
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
                                attackerId={activeAtkId}
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
                                attackerId={activeAtkId}
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

            {/* Action cam info panels */}
            <ActionCamInfoPanel
                visible={isActionCam}
                attacker={attackerData}
                target={targetData}
                isLeftHanded={isLeftHanded}
            />

            {/* === IN-CAM ATK BUTTONS — floating overlay === */}
            {isActionCam && (
                <div className="battle-cam-atk-buttons">
                    <button
                        className={"battle-cam-atk-btn battle-cam-atk-btn--enemy" + (enemyAtkEnabled ? " battle-cam-atk-btn--active" : "")}
                        disabled={!enemyAtkEnabled}
                        onClick={handleCamATK}
                    >
                        ENEMY ATK
                    </button>
                    <button
                        className={"battle-cam-atk-btn battle-cam-atk-btn--player" + (playerAtkEnabled ? " battle-cam-atk-btn--active" : "")}
                        disabled={!playerAtkEnabled}
                        onClick={handleCamATK}
                    >
                        PLAYER ATK
                    </button>
                </div>
            )}

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

                {/* QTE zone */}
                {showQTE && (
                    <div
                        className={"battle-qte battle-qte--visible"}
                        style={isLeftHanded
                            ? { left: "var(--battle-actions-w)", right: "var(--battle-open-w)" }
                            : { left: "var(--battle-open-w)", right: "var(--battle-actions-w)" }
                        }
                    >
                        <QTERunner
                            qteConfig={qteConfig}
                            onComplete={handleQTEComplete}
                            onRingResult={handleQTERingResult}
                            onRingStart={handleQTERingStart}
                        />
                    </div>
                )}

                {/* Comic panel */}
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
                attackerId={activeAtkId}
                enemies={TEST_ENEMIES}
                atbRunning={atbRunning}
                spriteOverride={devSpriteOverride}
                onSetPhase={handleDevSetPhase}
                onSetTarget={handleDevSetTarget}
                onToggleATB={handleDevToggleATB}
                onFillPips={handleDevFillPips}
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