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
// Self-contained: no host imports, no singletons.
// Uses battleBus for internal event routing (ATB ready, etc.).
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
import BattleConstants from "./config/battleConstants.js";
import BattleSkills from "./config/battleSkills.js";
import BattleEngagement from "./systems/battleEngagement.js";
import BattleSFX from "./systems/battleSFX.js";
import BattleStateModule from "./battleState.js";
import QTERunnerModule from "./components/QTERunner.js";
import ChalkboardModule from "./components/Chalkboard.js";
import BattleCharacterModule from "./components/BattleCharacter.js";
import BattleResultsScreen from "./components/BattleResultsScreen.js";
import DevControls from "./components/DevControls.js";
import TurnOrderStrip from "./components/TurnOrderStrip.js";
import ActionMenu from "./components/ActionMenu.js";
import ItemSubmenu from "./components/ItemSubmenu.js";
import SkillSubmenu from "./components/SkillSubmenu.js";
import ComicPanel from "./components/ComicPanel.js";
import ActionCamInfoPanel from "./components/ActionCamInfoPanel.js";
import BattleAI from "./systems/battleAI.js";
import DefenseTiming from "./systems/defenseTiming.js";
import GestureRecognition from "./systems/gestureRecognition.js";
import BattleBus from "./battleBus.js";
import BATTLE_TAGS from "./battleTags.js";
import useBattleTurnLoop from "./hooks/useBattleTurnLoop.js";
import PlaybackManager from "./managers/battlePlaybackManager.js";
import BattleHelpers from "./systems/battleHelpers.js";
import "./BattleView.css";

var QTERunner = QTERunnerModule.QTERunner;
var BattleCharacter = BattleCharacterModule.BattleCharacter;
var DamageNumber = BattleCharacterModule.DamageNumber;

var PHASES = BattleConstants.BATTLE_PHASES;
var ACTION_CAM = BattleConstants.ACTION_CAM;
var EXCHANGE = BattleConstants.EXCHANGE;
var ENGAGEMENT = BattleConstants.ENGAGEMENT;
var LAYOUT = BattleConstants.LAYOUT;
var STAGE = BattleConstants.STAGE;
var BATTLE_SLOTS = BattleConstants.BATTLE_SLOTS;
var ACTION_CAM_SLOTS = BattleConstants.ACTION_CAM_SLOTS;
var BATTLE_SPRITES = BattleConstants.BATTLE_SPRITES;
var CHOREOGRAPHY = BattleConstants.CHOREOGRAPHY;
var TEST_PARTY = BattleConstants.TEST_PARTY;
var TEST_WAVES = BattleConstants.TEST_WAVES;
var BATTLE_END = BattleConstants.BATTLE_END;
var COMBO = BattleConstants.COMBO;
var WAVE_TRANSITION = BattleConstants.WAVE_TRANSITION;
var DEFENSE_TIMING = BattleConstants.DEFENSE_TIMING;

// ============================================================
// COMIC PANEL LINES — fairy speech per phase
// ============================================================
var COMIC_LINES = {};
COMIC_LINES[PHASES.ACTION_CAM_IN]      = "Let's get 'em!";
COMIC_LINES[PHASES.CAM_SWING_QTE]      = "Show 'em what you've got!";
COMIC_LINES[PHASES.CAM_SWING_PLAYBACK] = "Here it comes!";
COMIC_LINES[PHASES.CAM_RESOLVE]        = "Nice swing!";
COMIC_LINES[PHASES.CAM_COUNTER_PROMPT] = "Counter time!";
COMIC_LINES[PHASES.ACTION_CAM_OUT]     = "Not bad!";

// ============================================================
// CSS Custom Properties — driven from STAGE + LAYOUT constants
// Applied as inline style on .battle-root
// ============================================================
var PUB = process.env.PUBLIC_URL || "";
var ROOT_VARS = {
    "--battle-actions-w":   LAYOUT.actionsW,
    "--battle-sprite-size": LAYOUT.spriteSize,
    "--battle-scene-bg":    "url(" + PUB + "/images/scenes/waSceneSewer.png)",
};

// ============================================================
// Stage scaling helper — computes uniform scale to fit viewport
// ============================================================
function useStageScale(stageRef) {
    var [scale, setScale] = useState(1);

    useEffect(function() {
        function measure() {
            if (!stageRef.current) return;
            var parent = stageRef.current.parentElement;
            if (!parent) return;
            var pw = parent.clientWidth;
            var ph = parent.clientHeight;
            var sx = pw / STAGE.designW;
            var sy = ph / STAGE.designH;
            setScale(Math.min(sx, sy));
        }
        measure();
        window.addEventListener("resize", measure);
        return function() { window.removeEventListener("resize", measure); };
    }, [stageRef]);

    return scale;
}

// ============================================================
// BattleView — Root Layout
// ============================================================

function BattleView(props) {
    var onExit = props.onExit;
    var handedness = props.handedness || "right";
    var zoneName = props.zoneName || "UNKNOWN ZONE";
    var isLeftHanded = handedness === "left";

    // --- Wave tracking ---
    var waveIndexRef = useRef(0);
    var [waveIndex, setWaveIndex] = useState(0);
    var totalWaves = TEST_WAVES.length;
    var currentEnemies = TEST_WAVES[waveIndex] || TEST_WAVES[0];
    var currentEnemiesRef = useRef(currentEnemies);
    currentEnemiesRef.current = currentEnemies;
    var waveLabel = "Wave " + (waveIndex + 1) + "/" + totalWaves;

    // --- State ---
    var [phase, setPhase] = useState(PHASES.TURN_ACTIVE);
    var [targetId, setTargetId] = useState(null);
    var [turnOwnerId, setTurnOwnerId] = useState(null);
    var [attackerId] = useState(TEST_PARTY[0].id);
    var [turnLoopRunning, setTurnLoopRunning] = useState(true);
    var [shakeLevel, setShakeLevel] = useState(null);
    var [flashId, setFlashId] = useState(null);
    var [animState, setAnimState] = useState({});
    var [damageNumbers, setDamageNumbers] = useState([]);
    var dmgKeyRef = useRef(0);
    var [skillNameLabel, setSkillNameLabel] = useState(null);
    var skillNameTimerRef = useRef(null);
    var skillNameKeyRef = useRef(0);
    var [qteConfig, setQteConfig] = useState(null);
    var qteKeyRef = useRef(0);
    var qteResolveRef = useRef(null);

    // --- Single source of truth for player-initiated selection ---
    // All player taps route here. System/AI changes use setTargetId directly.
    function selectTarget(id) {
        setTargetId(id);
        if (id != null) BattleSFX.select();
    }

    // --- AP state (replaces ATB pip state) ---
    var [apState, setApState] = useState(function() {
        return BattleEngagement.initAPState(TEST_PARTY.concat(currentEnemies), ENGAGEMENT.AP_MAX);
    });
    var apStateRef = useRef(apState);
    apStateRef.current = apState;

    // --- In-cam exchange state ---
    var camExchangeRef = useRef(null);

    // --- Battle State (mutable combatant data: HP, items, KO, buffs) ---
    var battleStateRef = useRef(null);
    if (!battleStateRef.current) {
        battleStateRef.current = BattleStateModule.createBattleState(TEST_PARTY, currentEnemies);
    }
    var bState = battleStateRef.current;

    // --- Battle Bus (per-battle event bus, created/destroyed with component) ---
    var battleBusRef = useRef(null);
    if (!battleBusRef.current) {
        battleBusRef.current = BattleBus.createBattleBus();
    }
    var bus = battleBusRef.current;
    useEffect(function() {
        return function() {
            if (battleBusRef.current) battleBusRef.current.destroy();
        };
    }, []);

    // --- Reactive snapshot — bump to trigger re-render after mutations ---
    var [stateVersion, setStateVersion] = useState(0);
    function bumpState() { setStateVersion(function(v) { return v + 1; }); }

    // --- Combo counter — tracks consecutive hits within a single combo ---
    // playerCombo: hits landed by player in current offensive combo
    // enemyUnblocked: hits enemy landed that player failed to brace/dodge
    var comboCounterRef = useRef({ playerCombo: 0, enemyUnblocked: 0 });
    var summaryDmgRef = useRef({ total: 0, color: "#f59e0b", receiverId: null });
    var playbackResultsRef = useRef(null); // Chalkboard results array for CAM_SWING_PLAYBACK
    var defenseActiveRef = useRef(false); // true during enemy CAM_SWING_PLAYBACK (defense windows open)
    var defenseTouchStartRef = useRef(null); // { x, y } for swipe detection on scene zone

    // --- Item submenu state ---
    // context: "formation" (out of cam) or "in-cam" (during exchange)
    var [itemMenuOpen, setItemMenuOpen] = useState(false);
    var itemMenuContextRef = useRef("formation");
    // --- Skill submenu state ---
    var [skillMenuOpen, setSkillMenuOpen] = useState(false);
    var selectedSkillRef = useRef(null);
    var [battleResult, setBattleResult] = useState(null);

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
    var stageRef = useRef(null);
    var stageScale = useStageScale(stageRef);
    var [sceneRect, setSceneRect] = useState(null);
    var restingRectsRef = useRef({});

    // Build slot map: combatant id → { x, y } stage-space position
    var slotMapRef = useRef({});
    useEffect(function() {
        var map = {};
        var spriteW = STAGE.spriteSize;
        currentEnemies.forEach(function(e, idx) {
            var slots = BATTLE_SLOTS.enemy.front;
            var slot = slots[idx] || slots[slots.length - 1];
            map[e.id] = { cx: slot.x, cy: slot.y };
        });
        TEST_PARTY.forEach(function(p, idx) {
            var slots = BATTLE_SLOTS.party.front;
            var slot = slots[idx] || slots[slots.length - 1];
            map[p.id] = { cx: slot.x, cy: slot.y };
        });
        slotMapRef.current = map;
    }, [waveIndex]);

    // Snapshot resting positions when entering action cam
    // Now uses stage-space slot positions instead of DOM measurement
    useEffect(function() {
        var entering = phase === PHASES.ACTION_CAM_IN;
        if (!entering) {
            if (phase === PHASES.TURN_ACTIVE || phase === PHASES.ACTION_CAM_OUT) {
                restingRectsRef.current = {};
                setSceneRect(null);
            }
            return;
        }
        // Stage-space "sceneRect" — fixed dimensions, no DOM measurement needed
        setSceneRect({ width: STAGE.designW, height: STAGE.designH, left: 0, top: 0 });
        restingRectsRef.current = Object.assign({}, slotMapRef.current);
    }, [phase]);

    // --- Turn loop (replaces ATB tick loop) ---
    var turnLoop = useBattleTurnLoop({
        bus:              bus,
        running:          turnLoopRunning,
        combatants:       TEST_PARTY.concat(currentEnemiesRef.current),
        bState:           bState,
        engagement:       BattleEngagement,
        engagementConfig: ENGAGEMENT,
        apState:          apState,
        setApState:       setApState,
    });

    // --- TURN_START subscriber — routes combatant to formation turn or AI action ---
    useEffect(function() {
        function onTurnStart(payload) {
            var whosTurn = payload.combatantId;

            // Skip KO'd combatants — safety check (loop should already skip)
            var turnState = bState.get(whosTurn);
            if (turnState && turnState.ko) return;

            bumpState();
            setTurnOwnerId(whosTurn);

            if (payload.isParty) {
                setPhase(PHASES.TURN_ACTIVE);
                setTurnLoopRunning(false);
            } else {
                setTurnLoopRunning(false);
                // AI picks target + skill
                var aiDecision = BattleAI.pickAction(bState.get(whosTurn), bState, apStateRef.current, BattleSkills.getSkill);
                if (!aiDecision) {
                    // AI can't act — end turn
                    endFormationTurn();
                    return;
                }
                setTargetId(aiDecision.targetId);
                startExchange(whosTurn, aiDecision.targetId, aiDecision.skillId);
            }
        }

        bus.on(BATTLE_TAGS.TURN_START, onTurnStart);
        return function() { bus.off(BATTLE_TAGS.TURN_START, onTurnStart); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Playback bus subscribers — map manager events to React state ---
    useEffect(function() {
        function onAnimSet(p) {
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); n[p.combatantId] = p.animName; return n;
            });
        }
        function onAnimClear(p) {
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); delete n[p.combatantId]; return n;
            });
        }
        function onFlash(p) {
            setFlashId(p.combatantId);
            setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
        }
        function onShake(p) {
            setShakeLevel(null);
            requestAnimationFrame(function() { setShakeLevel(p.level); });
        }
        function onSpawnDamage(p) {
            spawnDmgAt(p.combatantId, p.value, p.color, p.yOffset);
        }
        function onBeatResolve() {
            bumpState();
        }
        function onSwingComplete(p) {
            setPhase(PHASES.CAM_RESOLVE);
            playbackResultsRef.current = null;
            defenseActiveRef.current = false;
            defenseInputResolveRef.current = null;
            setTimeout(function() {
                handlePostSwing();
            }, EXCHANGE.resolveHoldMs);
        }
        function onDefenseWindow(p) {
            if (p.open) {
                defenseInputResolveRef.current = p.resolve;
            } else {
                defenseActiveRef.current = false;
                defenseInputResolveRef.current = null;
            }
        }
        function onBeatTelegraph(p) {
            // Drive CSS telegraph-sync class on the swinger's choreography element
            var el = combatantRefs.current[p.swingerId];
            if (el) {
                var choreoEl = el.querySelector(".normal-cam-char__choreo");
                if (choreoEl) {
                    choreoEl.style.setProperty("--telegraph-duration", p.telegraphMs + "ms");
                    choreoEl.classList.remove("normal-cam-char__choreo--telegraph-sync");
                    void choreoEl.offsetWidth; // reflow
                    choreoEl.classList.add("normal-cam-char__choreo--telegraph-sync");
                }
            }
        }

        bus.on(BATTLE_TAGS.ANIM_SET, onAnimSet);
        bus.on(BATTLE_TAGS.ANIM_CLEAR, onAnimClear);
        bus.on(BATTLE_TAGS.FLASH, onFlash);
        bus.on(BATTLE_TAGS.SHAKE, onShake);
        bus.on(BATTLE_TAGS.SPAWN_DAMAGE, onSpawnDamage);
        bus.on(BATTLE_TAGS.BEAT_RESOLVE, onBeatResolve);
        bus.on(BATTLE_TAGS.SWING_COMPLETE, onSwingComplete);
        bus.on(BATTLE_TAGS.BEAT_DEFENSE_WINDOW, onDefenseWindow);
        bus.on(BATTLE_TAGS.BEAT_TELEGRAPH, onBeatTelegraph);
        return function() {
            bus.off(BATTLE_TAGS.ANIM_SET, onAnimSet);
            bus.off(BATTLE_TAGS.ANIM_CLEAR, onAnimClear);
            bus.off(BATTLE_TAGS.FLASH, onFlash);
            bus.off(BATTLE_TAGS.SHAKE, onShake);
            bus.off(BATTLE_TAGS.SPAWN_DAMAGE, onSpawnDamage);
            bus.off(BATTLE_TAGS.BEAT_RESOLVE, onBeatResolve);
            bus.off(BATTLE_TAGS.SWING_COMPLETE, onSwingComplete);
            bus.off(BATTLE_TAGS.BEAT_DEFENSE_WINDOW, onDefenseWindow);
            bus.off(BATTLE_TAGS.BEAT_TELEGRAPH, onBeatTelegraph);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Helpers ---
    var isActionCam = phase === PHASES.ACTION_CAM_IN || phase === PHASES.CAM_SWING_QTE
        || phase === PHASES.CAM_SWING_PLAYBACK || phase === PHASES.CAM_RESOLVE
        || phase === PHASES.CAM_COUNTER_PROMPT;
    var showQTE = phase === PHASES.CAM_SWING_QTE;
    var showComic = isActionCam;
    var showSpark = phase === PHASES.CAM_RESOLVE;

    var comicLine = COMIC_LINES[phase] || "...";

    var activeAtkId = turnOwnerId || attackerId;

    // --- Combatant map: built from battleState (mutable HP/items) + AP ---
    var bSnap = bState.snapshot();
    var combatantMap = {};
    var allIds = bState.getPartyIds().concat(bState.getEnemyIds());
    allIds.forEach(function(id) {
        var c = bSnap[id];
        var ap = apState[id] || { current: 0, max: ENGAGEMENT.AP_MAX };
        combatantMap[id] = Object.assign({}, c, { _isParty: c.isParty, _ap: ap });
    });

    function isPartyId(id) { return bState.isPartyId(id); }

    var attackerData = combatantMap[activeAtkId] || null;
    var targetData = combatantMap[targetId] || null;

    // Flat array for gauge strip (preserves render order: party then enemy)
    var allCombatants = TEST_PARTY.map(function(c) { return combatantMap[c.id]; })
        .concat(currentEnemies.map(function(c) { return combatantMap[c.id]; }));

    var makeRefSetter = useCallback(function(id) {
        return function(el) {
            combatantRefs.current[id] = el;
        };
    }, []);

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

    // Stage-space position helper — returns { x, y } center of a combatant
    // Action-cam-aware: returns engagement position when combatant is in cam
    function stagePos(combatantId) {
        if (isActionCam && (combatantId === activeAtkId || combatantId === targetId)) {
            var cx = ACTION_CAM_SLOTS.centerX;
            var cy = ACTION_CAM_SLOTS.centerY;
            var gap = ACTION_CAM_SLOTS.gap;
            var isCombatantParty = isPartyId(combatantId);
            var destX = isCombatantParty
                ? (isLeftHanded ? (cx - gap) : (cx + gap))
                : (isLeftHanded ? (cx + gap) : (cx - gap));
            return { x: destX, y: cy };
        }
        var slot = slotMapRef.current[combatantId];
        if (slot) return { x: slot.cx, y: slot.cy };
        return { x: STAGE.designW / 2, y: STAGE.designH / 2 };
    }

    // Convenience: spawn damage number at a combatant's stage position
    function spawnDmgAt(combatantId, value, color, yOffset) {
        var pos = stagePos(combatantId);
        spawnDamageNumber(value, pos.x, pos.y + (yOffset || 0), color);
    }

    // Spawn a skill name label above a combatant sprite
    function spawnSkillName(skillName, combatantId, color) {
        var pos = stagePos(combatantId);
        clearTimeout(skillNameTimerRef.current);
        var key = ++skillNameKeyRef.current;
        setSkillNameLabel({
            key: key,
            text: skillName,
            x: pos.x,
            y: pos.y - STAGE.spriteSize / 2 - 10,
            color: color || "#e0d8c8",
        });
        skillNameTimerRef.current = setTimeout(function() {
            setSkillNameLabel(null);
        }, 2000);
    }

    // ============================================================
    // DEV HANDLERS
    // ============================================================
    function handleDevAdvanceTurn() { turnLoop.advance(); }
    function handleDevFillAP() {
        setApState(function(prev) {
            var next = {};
            for (var key in prev) {
                if (prev.hasOwnProperty(key)) {
                    next[key] = { current: prev[key].max, max: prev[key].max };
                }
            }
            return next;
        });
    }
    function handleDevReset() {
        // Reset wave tracking
        waveIndexRef.current = 0;
        setWaveIndex(0);
        var wave0 = TEST_WAVES[0];
        // Re-create battle state from scratch
        battleStateRef.current = BattleStateModule.createBattleState(TEST_PARTY, wave0);
        bumpState();
        // Reset all transient UI state
        setPhase(PHASES.TURN_ACTIVE);
        setTurnLoopRunning(false);
        setApState(BattleEngagement.initAPState(TEST_PARTY.concat(wave0), ENGAGEMENT.AP_MAX));
        turnLoop.reset();
        setTargetId(null);
        setTurnOwnerId(null);
        setAnimState({});
        setShakeLevel(null);
        setFlashId(null);
        setDamageNumbers([]);
        setQteConfig(null);
        setItemMenuOpen(false);
        setSkillMenuOpen(false);
        selectedSkillRef.current = null;
        setBattleResult(null);
        camExchangeRef.current = null;
        comboCounterRef.current = { playerCombo: 0, enemyUnblocked: 0 };
        summaryDmgRef.current = { total: 0, color: "#f59e0b", receiverId: null };
        defenseActiveRef.current = false;
        defenseInputResolveRef.current = null;
        DefenseTiming.destroy();
    }

    // ============================================================
    // QTE RING START — sync enemy telegraph anim to ring shrink
    // Fires when each ring begins shrinking. If swinger is enemy,
    // apply telegraph-sync anim with duration matching the ring.
    // ============================================================
    function handleQTERingStart(index, durationMs) {
        var cam = camExchangeRef.current;
        if (!cam) return;

        var swinger = cam.getSwingerId();
        var swingerIsEnemy = !isPartyId(swinger);

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

    function handleQTERingResult(index, hit, inputType) {
        var cam = camExchangeRef.current;
        if (!cam) return;

        var swinger = cam.getSwingerId();
        var receiver = cam.getReceiverId();

        var skill = cam.skill;
        var beat = skill && skill.beats && skill.beats[index]
            ? BattleSkills.resolveBeat(skill.beats[index])
            : null;

        if (!beat) {
            console.warn("[BattleView] No beat data for ring " + index);
            return;
        }

        var swingerIsEnemy = !isPartyId(swinger);
        var receiverIsParty = isPartyId(receiver);
        var dmgColor = receiverIsParty ? "#ef4444" : "#f59e0b";
        var isLastBeat = skill && skill.beats ? (index === skill.beats.length - 1) : true;

        // Shared context for per-beat resolvers
        var ringCtx = {
            bState: bState, BattleSFX: BattleSFX, CHOREOGRAPHY: CHOREOGRAPHY,
            DEFENSE_TIMING: DEFENSE_TIMING, BATTLE_END: BATTLE_END,
            comboCounter: comboCounterRef.current, summaryDmg: summaryDmgRef.current,
        };

        if (swingerIsEnemy) {
            // Enemy swings at player — SFX + defense resolution via manager
            if (beat.sfx) BattleSFX[beat.sfx] ? BattleSFX[beat.sfx]() : BattleSFX.hit();
            PlaybackManager.resolveDefenseHit(bus, ringCtx, hit, inputType, beat, swinger, receiver, dmgColor, isLastBeat, null);

            // Clear receiver anim after hit settles (swinger stays in telegraph-sync)
            setTimeout(function() {
                var recState = bState.get(receiver);
                var keepAnim = recState && recState.ko && isLastBeat;
                if (!keepAnim) bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: receiver });
            }, 260);
        } else {
            // Player swings at enemy — offense resolution via manager
            PlaybackManager.resolveOffenseHit(bus, ringCtx, hit, beat, swinger, receiver, dmgColor, isLastBeat);
        }
    }

    // ============================================================
    // DEFENSE INPUT — Scene zone touch/click handlers
    // Active only during enemy CAM_SWING_PLAYBACK (defenseActiveRef).
    // Classifies tap vs swipe, routes to DefenseTiming.checkInput().
    // ============================================================
    var SWIPE_MIN_PX = 30;

    function handleSceneTouchStart(e) {
        if (!defenseActiveRef.current) return;
        var t = e.touches[0];
        defenseTouchStartRef.current = { x: t.clientX, y: t.clientY };
    }

    function handleSceneTouchEnd(e) {
        // Defense active — classify tap vs swipe for defense input
        if (defenseActiveRef.current) {
            if (DefenseTiming.isLocked()) return;

            var start = defenseTouchStartRef.current;
            var t = e.changedTouches[0];
            var endPt = { x: t.clientX, y: t.clientY };
            defenseTouchStartRef.current = null;

            if (!start) {
                defenseInputResolve("tap");
                return;
            }

            var dx = endPt.x - start.x;
            var dy = endPt.y - start.y;
            var dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= SWIPE_MIN_PX) {
                defenseInputResolve("swipe");
            } else {
                defenseInputResolve("tap");
            }
            return;
        }
        // Not in action cam — tap empty space deselects
        if (!isActionCam) {
            setTargetId(null);
        }
    }

    function handleSceneClick() {
        // Defense active — desktop fallback, click = tap
        if (defenseActiveRef.current) {
            if (DefenseTiming.isLocked()) return;
            defenseInputResolve("tap");
            return;
        }
        // Not in action cam — tap empty space deselects
        if (!isActionCam) {
            setTargetId(null);
        }
    }

    // defenseInputResolve is set by PlaybackManager via BEAT_DEFENSE_WINDOW bus event
    var defenseInputResolveRef = useRef(null);
    function defenseInputResolve(inputType) {
        var result = DefenseTiming.checkInput(inputType);
        if (!result) return; // locked or no anchor
        if (defenseInputResolveRef.current) {
            defenseInputResolveRef.current(result, inputType);
        }
    }

    // ============================================================
    // QTE ACTIVATOR
    // ============================================================
    function activateQTE(config, onResolve) {
        qteKeyRef.current += 1;
        qteResolveRef.current = onResolve;
        setQteConfig(Object.assign({}, config, { _key: qteKeyRef.current }));
    }

    // ============================================================
    // IN-CAM EXCHANGE — One Trade Model
    //
    // Flow:
    //   startExchange(initiatorId, responderId, skillId)
    //     → cam in → doCamSwing (initiator attacks)
    //     → resolve → handlePostSwing:
    //       if responder alive + can afford counter → CAM_COUNTER_PROMPT
    //       else → cam out
    //     if counter accepted → doCamSwing (responder attacks)
    //       → resolve → cam out (always, one counter max)
    // ============================================================

    function startExchange(initiatorId, responderId, skillId) {
        console.log("[CAM-ID] startExchange initiator=" + initiatorId + " responder=" + responderId);

        // Resolve skill for initiator
        var skill = BattleSkills.getSkill(skillId);
        if (!skill) {
            skill = BattleSkills.getSkill(
                combatantMap[initiatorId] && combatantMap[initiatorId].skills
                    ? combatantMap[initiatorId].skills[0]
                    : null
            );
        }
        if (!skill) {
            console.warn("[BattleView] No skill for " + initiatorId + ", skipping");
            endFormationTurn();
            return;
        }

        // Deduct skill AP cost
        var apCost = skill.apCost || 25;
        setApState(function(prev) {
            var next = BattleEngagement.spendAP(prev, initiatorId, apCost);
            apStateRef.current = next;
            bus.emit(BATTLE_TAGS.AP_SPENT, {
                combatantId: initiatorId,
                cost: apCost,
                newTotal: BattleEngagement.getAP(next, initiatorId),
            });
            return next;
        });

        var ex = {
            initiatorId: initiatorId,
            responderId: responderId,
            swinger: "initiator",   // "initiator" | "responder"
            isCounter: false,       // true when responder is countering
            skill: skill,
            counterSkill: null,     // set if counter accepted
            getSwingerId: function() { return ex.swinger === "initiator" ? ex.initiatorId : ex.responderId; },
            getReceiverId: function() { return ex.swinger === "initiator" ? ex.responderId : ex.initiatorId; },
        };
        camExchangeRef.current = ex;

        setPhase(PHASES.ACTION_CAM_IN);
        setTurnLoopRunning(false);

        setTimeout(function() {
            doCamSwing(initiatorId, responderId, skill);
        }, ACTION_CAM.transitionInMs);
    }

    function doCamSwing(swingerId, receiverId, skill) {
        console.log("[CAM-ID] doCamSwing swinger=" + swingerId + " receiver=" + receiverId + " skill=" + skill.name);
        // Reset combo counters for this swing sequence
        var swingerIsPlayer = isPartyId(swingerId);
        if (swingerIsPlayer) {
            comboCounterRef.current.playerCombo = 0;
        } else {
            comboCounterRef.current.enemyUnblocked = 0;
        }
        summaryDmgRef.current = { total: 0, color: "#f59e0b", receiverId: receiverId };

        // Stash current skill on exchange object for QTE callbacks
        var cam = camExchangeRef.current;
        if (cam) cam.skill = skill;

        // Build per-ring visual hints for the QTE plugin (unblockable tells, finisher sizing)
        var beatVisuals = null;
        if (skill.beats) {
            beatVisuals = skill.beats.map(function(b) {
                var resolved = BattleSkills.resolveBeat(b);
                return {
                    unblockable: resolved.unblockable || false,
                    finisher: resolved.finisher || false,
                };
            });
        }

        // Shared context for PlaybackManager
        var playbackCtx = {
            skill: skill, swingerId: swingerId, receiverId: receiverId,
            bState: bState, BattleSkills: BattleSkills, BattleSFX: BattleSFX,
            DefenseTiming: DefenseTiming, CHOREOGRAPHY: CHOREOGRAPHY,
            DEFENSE_TIMING: DEFENSE_TIMING, BATTLE_END: BATTLE_END,
            comboCounter: comboCounterRef.current, summaryDmg: summaryDmgRef.current,
            camExchange: camExchangeRef.current, isPartyId: isPartyId,
        };

        if (swingerIsPlayer) {
            // ======== PLAYER OFFENSE: Front-loaded Chalkboard → Playback ========
            setPhase(PHASES.CAM_SWING_QTE);
            spawnSkillName(skill.name || skill.id, swingerId, "#60a5fa");

            // Resolve difficulty for damage map during playback
            var diff = ChalkboardModule.resolveDifficulty(
                skill.difficulty || "normal",
                { hitZone: skill.hitZone, perfectZone: skill.perfectZone, damageMap: skill.damageMap }
            );

            var chalkboardConfig = Object.assign({}, skill, {
                type: "chalkboard",
                beatVisuals: beatVisuals,
                _difficulty: diff,
            });

            // Hold 2s for skill name display before QTE starts (matches enemy path)
            setTimeout(function() {
                activateQTE(chalkboardConfig, function onChalkboardDone(resultsArray) {
                    // Store results for playback driver
                    playbackResultsRef.current = resultsArray;
                    setQteConfig(null);
                    setPhase(PHASES.CAM_SWING_PLAYBACK);
                    PlaybackManager.runOffense(bus, Object.assign({}, playbackCtx, {
                        difficulty: diff,
                        resultsArray: resultsArray,
                    }));
                });
            }, 2000);

        } else {
            // ======== ENEMY OFFENSE: Animation-read defense (Step 9) ========
            // No QTE rings. Choreography plays beat-by-beat with defense windows.
            setPhase(PHASES.CAM_SWING_PLAYBACK);
            spawnSkillName(skill.name || skill.id, swingerId, "#ef4444");

            // Hold for skill name display before first beat
            setTimeout(function() {
                console.log("[CAM-ID] defensePlayback starting (post-delay) swinger=" + swingerId + " receiver=" + receiverId);
                DefenseTiming.init(DEFENSE_TIMING);
                defenseActiveRef.current = true;
                PlaybackManager.runDefense(bus, playbackCtx);
            }, 2000);
        }
    }

    // ============================================================
    // PLAYBACK — handled by PlaybackManager (managers/battlePlaybackManager.js)
    // Emits bus events for anims/shake/flash/damage; subscribers above drive React state.
    // Legacy ring QTE path in handleQTERingResult still uses inline logic.
    // ============================================================
    // ============================================================
    // POST-SWING — One-trade logic: counter prompt or cam out
    // ============================================================
    function handlePostSwing() {
        // --- POST-SWING WIPE CHECK ---
        if (bState.isPartyWiped()) {
            triggerBattleEnd("ko");
            return;
        }
        if (bState.isEnemyWiped()) {
            if (waveIndexRef.current < totalWaves - 1) {
                camOut();
                setTimeout(function() {
                    startWaveTransition();
                }, ACTION_CAM.transitionOutMs + 100);
            } else {
                triggerBattleEnd("victory");
            }
            return;
        }

        var cam = camExchangeRef.current;
        if (!cam) { camOut(); return; }

        // If this was already a counter, cam out — one counter max
        if (cam.isCounter) {
            camOut();
            return;
        }

        // Check if responder can counter
        var responderId = cam.responderId;
        var responderState = bState.get(responderId);
        if (responderState && responderState.ko) {
            camOut();
            return;
        }

        var counterCost = ENGAGEMENT.AP_COST_COUNTER;
        var canCounter = BattleEngagement.canAfford(apStateRef.current, responderId, counterCost);

        if (!canCounter) {
            camOut();
            return;
        }

        // Show counter prompt
        var responderIsParty = isPartyId(responderId);
        bus.emit(BATTLE_TAGS.COUNTER_PROMPT, {
            responderId: responderId,
            cost: counterCost,
            canAfford: true,
        });

        if (responderIsParty) {
            // Player decides — show counter prompt UI
            setPhase(PHASES.CAM_COUNTER_PROMPT);
        } else {
            // AI always counters if affordable (V1 simple behavior)
            setPhase(PHASES.CAM_COUNTER_PROMPT);
            setTimeout(function() {
                handleCounterAccept();
            }, EXCHANGE.counterDelayMs);
        }
    }

    // --- Counter prompt handlers ---
    function handleCounterAccept() {
        var cam = camExchangeRef.current;
        if (!cam) return;

        var responderId = cam.responderId;
        var counterCost = ENGAGEMENT.AP_COST_COUNTER;

        // Deduct counter AP
        setApState(function(prev) {
            var next = BattleEngagement.spendAP(prev, responderId, counterCost);
            apStateRef.current = next;
            bus.emit(BATTLE_TAGS.AP_SPENT, {
                combatantId: responderId,
                cost: counterCost,
                newTotal: BattleEngagement.getAP(next, responderId),
            });
            return next;
        });

        bus.emit(BATTLE_TAGS.COUNTER_ACCEPTED, { responderId: responderId });

        // Swap to responder's swing
        cam.swinger = "responder";
        cam.isCounter = true;

        // Resolve responder's skill (use their first skill for V1)
        var responderData = combatantMap[responderId];
        var counterSkillId = responderData && responderData.skills ? responderData.skills[0] : null;
        var counterSkill = BattleSkills.getSkill(counterSkillId);
        if (!counterSkill) {
            camOut();
            return;
        }
        cam.counterSkill = counterSkill;

        doCamSwing(responderId, cam.initiatorId, counterSkill);
    }

    function handleCounterDecline() {
        var cam = camExchangeRef.current;
        if (!cam) return;

        bus.emit(BATTLE_TAGS.COUNTER_DECLINED, { responderId: cam.responderId });
        camOut();
    }

    function camOut() {
        setPhase(PHASES.ACTION_CAM_OUT);

        setTimeout(function() {
            // Preserve KO anims for dead combatants
            setAnimState(function(prev) {
                var kept = {};
                for (var key in prev) {
                    if (prev.hasOwnProperty(key) && prev[key] === "ko") {
                        kept[key] = "ko";
                    }
                }
                return kept;
            });
            camExchangeRef.current = null;
            setTurnOwnerId(null);

            // End the current combatant's turn — turn loop advances
            endFormationTurn();
        }, ACTION_CAM.transitionOutMs);
    }

    // ============================================================
    // BATTLE END — wipe detected, freeze everything, hold, exit
    // ============================================================
    function triggerBattleEnd(outcome) {
        setPhase(PHASES.BATTLE_ENDING);
        setTurnLoopRunning(false);
        camExchangeRef.current = null;

        setTimeout(function() {
            var result = bState.buildResult(outcome);
            console.log("[BattleView] Battle ended:", outcome, result);
            setBattleResult(result);
        }, BATTLE_END.koHoldMs);
    }

    // ============================================================
    // WAVE TRANSITION — swap enemies, reroll initiative, resume
    // ============================================================
    function startWaveTransition() {
        var nextIndex = waveIndexRef.current + 1;
        var nextEnemies = TEST_WAVES[nextIndex];
        if (!nextEnemies) return;

        setPhase(PHASES.WAVE_TRANSITION);
        setTurnLoopRunning(false);

        setTimeout(function() {
            waveIndexRef.current = nextIndex;
            setWaveIndex(nextIndex);

            bState.replaceEnemies(nextEnemies);
            bumpState();

            // Merge AP state — party keeps AP, new enemies start at 0
            var partyIds = bState.getPartyIds();
            var mergedAP = BattleEngagement.mergeAPState(
                apStateRef.current, nextEnemies, ENGAGEMENT.AP_MAX, partyIds
            );
            setApState(mergedAP);
            apStateRef.current = mergedAP;

            // Clear visual state
            setAnimState({});
            setDamageNumbers([]);
            setShakeLevel(null);
            setFlashId(null);
            camExchangeRef.current = null;
            setTargetId(null);
            setTurnOwnerId(null);

            // Reroll initiative for new wave and resume
            var allCombatantsNew = TEST_PARTY.concat(nextEnemies);
            turnLoop.reroll(allCombatantsNew);
            setTurnLoopRunning(true);
        }, WAVE_TRANSITION.bannerMs);
    }

    // ============================================================
    // RESULTS — Continue button exits battle
    // ============================================================
    function handleResultsContinue() {
        if (onExit) onExit(battleResult);
    }

    function handleAction(actionId) {
        var userId = activeAtkId;

        if (actionId === "attack") {
            // Open skill picker — player chooses skill, then picks target
            if (userId === "smith") {
                setItemMenuOpen(false);
                setSkillMenuOpen(true);
            } else {
                // AI-controlled party — auto-select first skill
                var autoSkill = combatantMap[userId] && combatantMap[userId].skills
                    ? combatantMap[userId].skills[0] : null;
                if (autoSkill) {
                    selectedSkillRef.current = autoSkill;
                    handleSkillConfirm();
                }
            }
        } else if (actionId === "item") {
            // Check AP
            if (!BattleEngagement.canAfford(apStateRef.current, userId, ENGAGEMENT.AP_COST_ITEM)) return;
            itemMenuContextRef.current = "formation";
            setItemMenuOpen(true);
        } else if (actionId === "defend") {
            handleDefend(userId);
        } else if (actionId === "flee") {
            handleFlee(userId);
        } else if (actionId === "wait") {
            // Free action — end turn, keep AP, earn more next turn
            endFormationTurn();
        }
    }

    // --- Target pickers ---
    // --- Target pickers (delegated to battleHelpers) ---
    function pickFirstLivingEnemy() {
        return BattleHelpers.pickFirstLivingEnemy(bState, currentEnemiesRef.current);
    }
    function pickFirstLivingAlly() {
        return BattleHelpers.pickFirstLivingAlly(bState, TEST_PARTY);
    }
    function pickRandomLivingPartyMember() {
        return BattleHelpers.pickRandomLivingPartyMember(bState, TEST_PARTY);
    }

    // ============================================================
    // DEFEND — formation only, costs AP
    // Grants +defensePower buff until this combatant's next turn.
    // ============================================================
    function handleDefend(userId) {
        var cost = ENGAGEMENT.AP_COST_DEFEND;
        if (!BattleEngagement.canAfford(apStateRef.current, userId, cost)) return;

        // Deduct AP
        spendAP(userId, cost);

        // Apply buff via battleState
        var DEFEND_BUFF = BattleConstants.DEFEND_BUFF;
        bState.get(userId).buffs.push({
            stat:      DEFEND_BUFF.stat,
            value:     DEFEND_BUFF.value,
            turnsLeft: DEFEND_BUFF.turns,
        });
        bumpState();

        // Visual feedback
        spawnDmgAt(userId, "DEF UP", "#4ade80");

        // Stay in formation turn — player can chain more actions
    }

    // ============================================================
    // FLEE — formation only, costs AP. High commitment.
    // Roll chance. Success = exit. Fail = AP spent, turn over.
    // ============================================================
    function handleFlee(userId) {
        var cost = ENGAGEMENT.AP_COST_FLEE;
        if (!BattleEngagement.canAfford(apStateRef.current, userId, cost)) return;

        spendAP(userId, cost);

        var roll = Math.random();
        if (roll < ENGAGEMENT.FLEE_BASE_CHANCE) {
            spawnDmgAt(userId, "FLED!", "#4ade80");
            setTimeout(function() {
                triggerBattleEnd("fled");
            }, 400);
        } else {
            spawnDmgAt(userId, "FAIL", "#ef4444");
            endFormationTurn();
        }
    }

    // ============================================================
    // AP SPEND HELPER — deducts AP and emits bus event
    // ============================================================
    function spendAP(combatantId, cost) {
        setApState(function(prev) {
            var next = BattleEngagement.spendAP(prev, combatantId, cost);
            apStateRef.current = next;
            bus.emit(BATTLE_TAGS.AP_SPENT, {
                combatantId: combatantId,
                cost: cost,
                newTotal: BattleEngagement.getAP(next, combatantId),
            });
            return next;
        });
    }

    // ============================================================
    // GATE: endFormationTurn — emits TURN_END, turn loop advances
    // Single source of truth for "formation turn is over."
    // ============================================================
    function endFormationTurn() {
        var currentId = turnOwnerId;
        setTurnOwnerId(null);
        setTurnLoopRunning(true);
        // Turn loop listens for TURN_END and auto-advances
        if (currentId) {
            bus.emit(BATTLE_TAGS.TURN_END, { combatantId: currentId });
        }
    }

    // ============================================================
    // ITEM USE — formation only, costs AP
    // ============================================================
    function handleItemUse(itemId) {
        var userId = activeAtkId;
        if (!userId) return;

        var cost = ENGAGEMENT.AP_COST_ITEM;
        if (!BattleEngagement.canAfford(apStateRef.current, userId, cost)) {
            setItemMenuOpen(false);
            return;
        }

        // Determine target
        var userItems = bState.get(userId);
        if (!userItems) return;
        var itemEntry = null;
        for (var i = 0; i < userItems.items.length; i++) {
            if (userItems.items[i].id === itemId) { itemEntry = userItems.items[i]; break; }
        }
        if (!itemEntry || itemEntry.qty <= 0) return;

        var effectTarget = userId;
        if (itemEntry.effect.type === "damage" || itemEntry.effect.type === "debuff_enemy") {
            var tgtState = targetId ? bState.get(targetId) : null;
            var tgtValid = tgtState && !tgtState.ko && !bState.isPartyId(targetId);
            if (!tgtValid) {
                setItemMenuOpen(false);
                return;
            }
            effectTarget = targetId;
        } else if (itemEntry.effect.type === "heal" || itemEntry.effect.type === "buff") {
            var allyState = targetId ? bState.get(targetId) : null;
            var allyValid = allyState && !allyState.ko && bState.isPartyId(targetId);
            if (allyValid) {
                effectTarget = targetId;
            }
        }

        var result = bState.useItem(userId, itemId, effectTarget);
        if (!result || !result.success) return;

        // Deduct AP
        spendAP(userId, cost);

        // Spawn feedback number
        var feedbackText = result.effect.type === "heal" ? ("+" + result.effect.value) :
            result.effect.type === "damage" ? result.effect.value :
                result.effect.type === "buff" ? ("\u2B06" + result.effect.stat.replace("Power", "")) :
                    ("\u2B07" + result.effect.stat.replace("Power", ""));
        var feedbackColor = result.effect.type === "heal" ? "#4ade80" :
            result.effect.type === "damage" ? "#ef4444" :
                result.effect.type === "buff" ? "#60a5fa" : "#f59e0b";

        spawnDmgAt(result.targetId, feedbackText, feedbackColor);
        setItemMenuOpen(false);
        bumpState();

        // Stay in formation turn — player can chain more actions
    }

    function handleItemClose() {
        setItemMenuOpen(false);
    }

    // Player picked a skill from the formation skill submenu
    function handleSkillSelect(skillId) {
        selectedSkillRef.current = skillId;
        setSkillMenuOpen(false);
        // Now player needs to select a target — stay in TURN_ACTIVE
    }

    // Player confirms attack after selecting skill + target
    function handleSkillConfirm() {
        var userId = activeAtkId;
        var skillId = selectedSkillRef.current;
        if (!skillId) return;

        var skill = BattleSkills.getSkill(skillId);
        if (!skill) return;

        var apCost = skill.apCost || 25;
        if (!BattleEngagement.canAfford(apStateRef.current, userId, apCost)) {
            spawnDmgAt(userId, "NO AP", "#ef4444");
            return;
        }

        // Validate: need a living enemy selected
        var atkTarget = targetId;
        var atkState = atkTarget ? bState.get(atkTarget) : null;
        var atkValid = atkState && !atkState.ko && !bState.isPartyId(atkTarget);
        if (!atkValid) return;

        selectedSkillRef.current = null;
        startExchange(userId, atkTarget, skillId);
    }

    function handleSkillClose() {
        setSkillMenuOpen(false);
        selectedSkillRef.current = null;
    }

    // --- Counter prompt state ---
    var showCounterPrompt = phase === PHASES.CAM_COUNTER_PROMPT;
    var counterResponderId = camExchangeRef.current ? camExchangeRef.current.responderId : null;
    var counterResponderIsParty = counterResponderId ? isPartyId(counterResponderId) : false;

    // --- Render ---
    var stageCls = "battle-stage";
    var shakeCls = "battle-stage-shake" + (shakeLevel ? " battle-stage--shake-" + shakeLevel : "");
    // Action cam zooms the stage (camera zoom), centering on engagement area
    var camZoom = isActionCam ? ACTION_CAM.activeScale : 1;
    var totalScale = stageScale * camZoom;
    // Engagement center is below stage center — compensate so it stays at screen center
    var engOffsetY = ACTION_CAM_SLOTS.centerY - STAGE.designH / 2; // 310 - 270 = 40
    var panY = isActionCam ? (engOffsetY * totalScale) : 0;
    var stageStyle = {
        width: STAGE.designW + "px",
        height: STAGE.designH + "px",
        transform: "translate(-50%, calc(-50% - " + panY + "px)) scale(" + totalScale + ")",
    };

    // Slot assignment helper — maps combatant index to a slot position
    function getSlot(side, row, idx) {
        var slots = BATTLE_SLOTS[side][row];
        return slots[idx] || slots[slots.length - 1];
    }

    return (
        <div className={"battle-root" + (isActionCam ? " battle-root--cam" : "")} style={ROOT_VARS}>

            {/* === STAGE — fixed-ratio character arena, centered === */}
            <div
                className={stageCls}
                ref={function(el) { stageRef.current = el; sceneRef.current = el; }}
                style={stageStyle}
            >
                <div
                    className={shakeCls}
                    onAnimationEnd={function() { setShakeLevel(null); }}
                    onTouchStart={handleSceneTouchStart}
                    onTouchEnd={handleSceneTouchEnd}
                    onClick={handleSceneClick}
                >
                    {/* Enemy formation — absolute positioned */}
                    {currentEnemies.map(function(e, idx) {
                        var slot = getSlot("enemy", "front", idx);
                        return (
                            <BattleCharacter
                                key={e.id}
                                data={combatantMap[e.id] || e}
                                isParty={false}
                                index={idx}
                                phase={phase}
                                attackerId={activeAtkId}
                                targetId={targetId}
                                selectedId={targetId}
                                turnOwnerId={turnOwnerId}
                                sceneRect={isActionCam ? sceneRect : null}
                                restingRects={restingRectsRef.current}
                                setRef={makeRefSetter(e.id)}
                                onClick={function() { if (!isActionCam) selectTarget(e.id); }}
                                spriteFrame={spriteFrame}
                                flashId={flashId}
                                animState={animState}
                                isLeftHanded={isLeftHanded}
                                slotX={slot.x}
                                slotY={slot.y}
                            />
                        );
                    })}

                    {/* Party formation — absolute positioned */}
                    {TEST_PARTY.map(function(p, idx) {
                        var slot = getSlot("party", "front", idx);
                        return (
                            <BattleCharacter
                                key={p.id}
                                data={combatantMap[p.id] || p}
                                isParty={true}
                                index={idx}
                                phase={phase}
                                attackerId={activeAtkId}
                                targetId={targetId}
                                selectedId={targetId}
                                turnOwnerId={turnOwnerId}
                                sceneRect={isActionCam ? sceneRect : null}
                                restingRects={restingRectsRef.current}
                                setRef={makeRefSetter(p.id)}
                                onClick={function() { if (!isActionCam) selectTarget(p.id); }}
                                spriteFrame={spriteFrame}
                                flashId={flashId}
                                animState={animState}
                                isLeftHanded={isLeftHanded}
                                slotX={slot.x}
                                slotY={slot.y}
                            />
                        );
                    })}

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

                    {/* Skill name label */}
                    {skillNameLabel && (
                        <div
                            key={"skn-" + skillNameLabel.key}
                            className="action-cam-skill-name"
                            style={{
                                left: skillNameLabel.x,
                                top: skillNameLabel.y,
                                color: skillNameLabel.color,
                            }}
                        >
                            {skillNameLabel.text}
                        </div>
                    )}
                </div>
            </div>

            {/* === OVERLAY LAYER — UI anchored to viewport edges === */}

            {/* Zone + wave labels */}
            <span className="battle-scene-zoneName">{zoneName}</span>
            <span className="battle-scene-waveLabel">{waveLabel}</span>

            {/* Action cam info panels */}
            <ActionCamInfoPanel
                visible={isActionCam}
                attacker={attackerData}
                target={targetData}
                isLeftHanded={isLeftHanded}
                apState={apState}
            />

            {/* === COUNTER PROMPT — shown after initiator's swing === */}
            {showCounterPrompt && counterResponderIsParty && (
                <div className="battle-counter-prompt">
                    <span className="battle-counter-prompt__label">
                        {"Counter? (" + ENGAGEMENT.AP_COST_COUNTER + " AP)"}
                    </span>
                    <button
                        className="battle-counter-prompt__btn battle-counter-prompt__btn--yes"
                        onClick={handleCounterAccept}
                    >
                        YES
                    </button>
                    <button
                        className="battle-counter-prompt__btn battle-counter-prompt__btn--no"
                        onClick={handleCounterDecline}
                    >
                        NO
                    </button>
                </div>
            )}

            {/* === BOTTOM OVERLAY — Turn Order + Action Menu === */}
            <div className="battle-overlay-bottom">

                {/* Turn order strip — initiative queue with AP bars */}
                <TurnOrderStrip
                    turnOrder={turnLoop.turnOrder}
                    turnIndex={turnLoop.turnIndex}
                    apState={apState}
                    combatantMap={combatantMap}
                    hidden={isActionCam}
                />

                {/* Action menu — right side (flippable) */}
                <ActionMenu
                    hidden={isActionCam}
                    onAction={handleAction}
                    isLeftHanded={isLeftHanded}
                    apState={apState}
                    activeId={activeAtkId}
                />

                {/* Comic panel */}
                <ComicPanel
                    visible={showComic}
                    sprite={null}
                    name={TEST_PARTY[1].name}
                    line={comicLine}
                    isLeftHanded={isLeftHanded}
                />
            </div>

            {/* === VIEWPORT-LEVEL UI — above all stacking contexts === */}

            {/* Item submenu — formation only */}
            <ItemSubmenu
                visible={itemMenuOpen}
                items={itemMenuOpen ? (function() {
                    var c = bState.get(activeAtkId);
                    return c ? c.items : [];
                })() : []}
                onUse={handleItemUse}
                onClose={handleItemClose}
                isInCam={false}
            />

            {/* Skill submenu — formation: pick skill, then pick target, then confirm */}
            <SkillSubmenu
                visible={skillMenuOpen}
                skills={skillMenuOpen ? (function() {
                    var cData = combatantMap[activeAtkId];
                    if (!cData || !cData.skills) return [];
                    return cData.skills.map(function(sId) {
                        return BattleSkills.getSkill(sId);
                    }).filter(Boolean);
                })() : []}
                availableAP={skillMenuOpen ? BattleEngagement.getAP(apState, activeAtkId) : 0}
                onSelect={handleSkillSelect}
                onClose={handleSkillClose}
                isInCam={false}
            />

            {/* QTE zone */}
            {showQTE && (
                <div className={"battle-qte battle-qte--visible"}>
                    <QTERunner
                        qteConfig={qteConfig}
                        onComplete={handleQTEComplete}
                        onRingResult={handleQTERingResult}
                        onRingStart={handleQTERingStart}
                    />
                </div>
            )}

            {/* === CINEMATIC BLACKOUT === */}
            <div className={"battle-blackout" + (isActionCam ? " battle-blackout--active" : "")} />

            {/* === WAVE TRANSITION BANNER === */}
            {phase === PHASES.WAVE_TRANSITION && (
                <div className="battle-wave-banner">
                    <span className="battle-wave-banner__text">
                        {"Wave " + (waveIndexRef.current + 2) + "/" + totalWaves}
                    </span>
                </div>
            )}

            {/* === RESULTS SCREEN === */}
            {battleResult && (
                <BattleResultsScreen
                    result={battleResult}
                    onContinue={handleResultsContinue}
                />
            )}

            {/* === DEV CONTROLS === */}
            <DevControls
                phase={phase}
                turnLoopRunning={turnLoopRunning}
                onAdvanceTurn={handleDevAdvanceTurn}
                onFillAP={handleDevFillAP}
                onReset={handleDevReset}
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