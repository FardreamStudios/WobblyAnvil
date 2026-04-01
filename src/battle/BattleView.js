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
import BattleATB from "./systems/battleATB.js";
import BattleSFX from "./systems/battleSFX.js";
import BattleStateModule from "./battleState.js";
import QTERunnerModule from "./components/QTERunner.js";
import ChalkboardModule from "./components/Chalkboard.js";
import BattleCharacterModule from "./components/BattleCharacter.js";
import BattleResultsScreen from "./components/BattleResultsScreen.js";
import DevControls from "./components/DevControls.js";
import ATBGaugeStrip from "./components/ATBGaugeStrip.js";
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
import useBattleATBLoop from "./hooks/useBattleATBLoop.js";
import PlaybackManager from "./managers/battlePlaybackManager.js";
import BattleHelpers from "./systems/battleHelpers.js";
import "./BattleView.css";

var QTERunner = QTERunnerModule.QTERunner;
var BattleCharacter = BattleCharacterModule.BattleCharacter;
var DamageNumber = BattleCharacterModule.DamageNumber;

var PHASES = BattleConstants.BATTLE_PHASES;
var ACTION_CAM = BattleConstants.ACTION_CAM;
var EXCHANGE = BattleConstants.EXCHANGE;
var LAYOUT = BattleConstants.LAYOUT;
var STAGE = BattleConstants.STAGE;
var BATTLE_SLOTS = BattleConstants.BATTLE_SLOTS;
var ACTION_CAM_SLOTS = BattleConstants.ACTION_CAM_SLOTS;
var BATTLE_SPRITES = BattleConstants.BATTLE_SPRITES;
var CHOREOGRAPHY = BattleConstants.CHOREOGRAPHY;
var TEST_PARTY = BattleConstants.TEST_PARTY;
var TEST_WAVES = BattleConstants.TEST_WAVES;
var DEFEND_BUFF = BattleConstants.DEFEND_BUFF;
var FLEE = BattleConstants.FLEE;
var BATTLE_END = BattleConstants.BATTLE_END;
var COMBO = BattleConstants.COMBO;
var WAVE_TRANSITION = BattleConstants.WAVE_TRANSITION;
var DEFENSE_TIMING = BattleConstants.DEFENSE_TIMING;

// ============================================================
// COMIC PANEL LINES — fairy speech per phase
// ============================================================
var COMIC_LINES = {};
COMIC_LINES[PHASES.ACTION_CAM_IN]    = "Let's get 'em!";
COMIC_LINES[PHASES.CAM_TELEGRAPH]    = "Watch out!";
COMIC_LINES[PHASES.CAM_SWING]        = "Nail the timing!";
COMIC_LINES[PHASES.CAM_SWING_QTE]    = "Show 'em what you've got!";
COMIC_LINES[PHASES.CAM_SWING_PLAYBACK] = "Here it comes!";
COMIC_LINES[PHASES.CAM_RESOLVE]      = "Nice swing!";
COMIC_LINES[PHASES.ACTION_CAM_OUT]   = "Not bad!";

// ============================================================
// CSS Custom Properties — driven from STAGE + LAYOUT constants
// Applied as inline style on .battle-root
// ============================================================
var PUB = process.env.PUBLIC_URL || "";
var ROOT_VARS = {
    "--battle-actions-w":   LAYOUT.actionsW,
    "--battle-atb-bar-h":   LAYOUT.atbBarH,
    "--battle-atb-label-w": LAYOUT.atbLabelW,
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
    var [phase, setPhase] = useState(PHASES.ATB_RUNNING);
    var [swapTrigger, setSwapTrigger] = useState(0);
    var [targetId, setTargetId] = useState(null);
    var [turnOwnerId, setTurnOwnerId] = useState(null);
    var [attackerId] = useState(TEST_PARTY[0].id);
    var [atbRunning, setAtbRunning] = useState(true);
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
    var atbValuesRef = useRef(null);

    // --- In-cam exchange state ---
    var camExchangeRef = useRef(null);
    var [atbValues, setAtbValues] = useState(function() {
        return BattleATB.initState(TEST_PARTY.concat(currentEnemies));
    });
    atbValuesRef.current = atbValues;

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
            if (phase === PHASES.ATB_RUNNING || phase === PHASES.ACTION_CAM_OUT) {
                restingRectsRef.current = {};
                setSceneRect(null);
            }
            return;
        }
        // Stage-space "sceneRect" — fixed dimensions, no DOM measurement needed
        setSceneRect({ width: STAGE.designW, height: STAGE.designH, left: 0, top: 0 });
        restingRectsRef.current = Object.assign({}, slotMapRef.current);
    }, [phase]);

    // --- ATB tick loop (extracted to hook) ---
    var atbFrozen = phase !== PHASES.ATB_RUNNING;

    useBattleATBLoop({
        bus:          bus,
        running:      atbRunning,
        frozen:       atbFrozen,
        combatants:   TEST_PARTY.concat(currentEnemiesRef.current),
        bState:       bState,
        atbModule:    BattleATB,
        atbValuesRef: atbValuesRef,
        setAtbValues: setAtbValues,
    });

    // --- ATB_READY subscriber — routes ready combatant to turn start ---
    useEffect(function() {
        function onATBReady(payload) {
            var whoIsReady = payload.combatantId;

            // Skip KO'd combatants — they can't take turns
            var readyState = bState.get(whoIsReady);
            if (readyState && readyState.ko) return;

            // Clear defend buffs — they last "until your next turn"
            bState.clearDefendBuffs(whoIsReady);
            bumpState();

            var isPartyMember = isPartyId(whoIsReady);
            setTurnOwnerId(whoIsReady);

            if (isPartyMember) {
                setPhase(PHASES.ACTION_SELECT);
                setAtbRunning(false);
            } else {
                setAtbRunning(false);
                // AI picks target + skill
                var aiDecision = BattleAI.pickAction(bState.get(whoIsReady), bState);
                if (!aiDecision) return;
                setTargetId(aiDecision.targetId);
                startExchange(whoIsReady, aiDecision.targetId, aiDecision.skillId);
            }
        }

        bus.on(BATTLE_TAGS.ATB_READY, onATBReady);
        return function() { bus.off(BATTLE_TAGS.ATB_READY, onATBReady); };
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
                advanceOrCamOut();
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
    var isActionCam = phase !== PHASES.ATB_RUNNING && phase !== PHASES.ACTION_SELECT && phase !== PHASES.ACTION_CAM_OUT;
    var showQTE = phase === PHASES.CAM_SWING_QTE;
    var showComic = isActionCam;
    var showSpark = phase === PHASES.CAM_RESOLVE;

    var comicLine = COMIC_LINES[phase] || "...";

    var activeAtkId = turnOwnerId || attackerId;

    // --- Combatant map: built from battleState (mutable HP/items) + ATB pips ---
    var bSnap = bState.snapshot();
    var combatantMap = {};
    var allIds = bState.getPartyIds().concat(bState.getEnemyIds());
    allIds.forEach(function(id) {
        var c = bSnap[id];
        var pips = atbValues[id] || { filledPips: 0, currentFill: 0 };
        combatantMap[id] = Object.assign({}, c, { _isParty: c.isParty, _pips: pips });
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
    function handleDevToggleATB() { setAtbRunning(function(v) { return !v; }); }
    function handleDevFillPips() {
        setAtbValues(function(prev) { return BattleATB.fillAll(prev, attackerId); });
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
        setPhase(PHASES.ATB_RUNNING);
        setAtbRunning(false);
        setAtbValues(BattleATB.initState(TEST_PARTY.concat(wave0)));
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

    function startExchange(initiatorId, responderId, skillId) {
        console.log("[CAM-ID] startExchange initiator=" + initiatorId + " responder=" + responderId);
        var ex = {
            initiatorId: initiatorId,
            responderId: responderId,
            swinger: "initiator",   // "initiator" | "responder"
            swingCount: 0,
            aiSkillId: skillId || null,
            skill: null,            // set by doCamSwing when a swing starts
            getSwingerId: function() { return ex.swinger === "initiator" ? ex.initiatorId : ex.responderId; },
            getReceiverId: function() { return ex.swinger === "initiator" ? ex.responderId : ex.initiatorId; },
        };
        camExchangeRef.current = ex;

        setPhase(PHASES.ACTION_CAM_IN);
        setAtbRunning(false);

        setTimeout(function() {
            setPhase(PHASES.CAM_WAIT_ACTION);
        }, ACTION_CAM.transitionInMs);
    }

    // --- Enemy auto-swing: when it's an enemy's turn in-cam, fire automatically ---
    useEffect(function() {
        if (phase !== PHASES.CAM_WAIT_ACTION) return;
        var cam = camExchangeRef.current;
        if (!cam) return;
        var swingerId = cam.getSwingerId();
        if (isPartyId(swingerId)) return; // player turn — wait for button press

        var timerId = setTimeout(function() {
            handleCamATK();
        }, EXCHANGE.counterDelayMs);

        return function() { clearTimeout(timerId); };
    }, [phase, swapTrigger]);

    function handleCamATK() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;

        var swingerId = cam.getSwingerId();
        var receiverId = cam.getReceiverId();
        console.log("[CAM-ID] handleCamATK swinger=" + swingerId + " receiver=" + receiverId + " swing#=" + cam.swingCount);

        // --- Resolve skill first so we know pip cost ---
        var swingerData = combatantMap[swingerId];
        var skillId = null;
        if (cam.aiSkillId && !isPartyId(swingerId)) {
            // Enemy: use AI-selected skill, then pick fresh for next swing
            skillId = cam.aiSkillId;
            var nextAI = BattleAI.pickAction(swingerData, bState);
            cam.aiSkillId = nextAI ? nextAI.skillId : null;
        } else {
            // Party: use player-selected skill (or first skill for AI-controlled party)
            if (selectedSkillRef.current) {
                skillId = selectedSkillRef.current;
                selectedSkillRef.current = null;
            } else {
                skillId = swingerData && swingerData.skills ? swingerData.skills[0] : null;
            }
        }
        var skill = BattleSkills.getSkill(skillId);

        if (!skill) {
            console.warn("[BattleView] No skill for " + swingerId + ", skipping");
            advanceOrCamOut();
            return;
        }

        // --- Deduct pip cost (default 1 if not specified) ---
        var cost = skill.pipCost || 1;
        for (var p = 0; p < cost; p++) {
            deductPip(swingerId);
        }

        doCamSwing(swingerId, receiverId, skill);
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
    function advanceOrCamOut() {
        // --- POST-COMBO WIPE CHECK ---
        if (bState.isPartyWiped()) {
            triggerBattleEnd("ko");
            return;
        }
        if (bState.isEnemyWiped()) {
            // More waves remaining? Transition. Otherwise victory.
            if (waveIndexRef.current < totalWaves - 1) {
                camOut();
                // Small delay so cam-out completes before banner
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

        // Swap to other side's turn — gate handles KO + pip checks
        swapSides();
    }

    // RELENT — initiator forfeits remaining turns, exits action cam (free)
    function handleCamRelent() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;
        camOut();
    }

    // PASS — responder gives up their turn, control returns to other side
    function handleCamPass() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;

        // Gate handles swap + KO/pip checks
        swapSides();
    }

    function camOut() {
        setPhase(PHASES.ACTION_CAM_OUT);
        var cam = camExchangeRef.current;
        var initiatorId = cam ? cam.initiatorId : null;

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

            var resetState = initiatorId
                ? BattleATB.reset(atbValuesRef.current, initiatorId)
                : atbValuesRef.current;
            setAtbValues(resetState);
            setTurnOwnerId(null);

            var checkCombatants = TEST_PARTY.concat(currentEnemiesRef.current);
            var alreadyReady = BattleATB.checkReady(resetState, checkCombatants);

            // Skip KO'd combatants that happen to have full pips
            if (alreadyReady) {
                var readyC = bState.get(alreadyReady);
                if (readyC && readyC.ko) alreadyReady = null;
            }

            if (alreadyReady) {
                var isPartyMember = isPartyId(alreadyReady);
                setTurnOwnerId(alreadyReady);

                if (isPartyMember) {
                    setPhase(PHASES.ACTION_SELECT);
                } else {
                    // AI picks target + skill
                    var aiDecision2 = BattleAI.pickAction(bState.get(alreadyReady), bState);
                    if (aiDecision2) {
                        setTargetId(aiDecision2.targetId);
                        setPhase(PHASES.ATB_RUNNING);
                        startExchange(alreadyReady, aiDecision2.targetId, aiDecision2.skillId);
                    } else {
                        setPhase(PHASES.ATB_RUNNING);
                        setAtbRunning(true);
                    }
                }
            } else {
                setPhase(PHASES.ATB_RUNNING);
                setAtbRunning(true);
            }
        }, ACTION_CAM.transitionOutMs);
    }

    // ============================================================
    // BATTLE END — wipe detected, freeze everything, hold, exit
    // ============================================================
    function triggerBattleEnd(outcome) {
        setPhase(PHASES.BATTLE_ENDING);
        setAtbRunning(false);
        camExchangeRef.current = null;

        // Hold for KO anim to play, then show results screen
        setTimeout(function() {
            var result = bState.buildResult(outcome);
            console.log("[BattleView] Battle ended:", outcome, result);
            setBattleResult(result);
        }, BATTLE_END.koHoldMs);
    }

    // ============================================================
    // WAVE TRANSITION — swap enemies, show banner, resume ATB
    // ============================================================
    function startWaveTransition() {
        var nextIndex = waveIndexRef.current + 1;
        var nextEnemies = TEST_WAVES[nextIndex];
        if (!nextEnemies) return;

        setPhase(PHASES.WAVE_TRANSITION);
        setAtbRunning(false);

        // After banner display time, swap enemies and resume
        setTimeout(function() {
            // Update wave tracking
            waveIndexRef.current = nextIndex;
            setWaveIndex(nextIndex);

            // Swap enemies in battle state
            bState.replaceEnemies(nextEnemies);
            bumpState();

            // Reinit ATB — party keeps current values, new enemies start fresh
            var freshEnemyAtb = BattleATB.initState(nextEnemies);
            setAtbValues(function(prev) {
                var merged = {};
                // Preserve party ATB
                for (var id in prev) {
                    if (prev.hasOwnProperty(id) && bState.isPartyId(id)) {
                        merged[id] = prev[id];
                    }
                }
                // Add fresh enemy ATB
                for (var eid in freshEnemyAtb) {
                    if (freshEnemyAtb.hasOwnProperty(eid)) {
                        merged[eid] = freshEnemyAtb[eid];
                    }
                }
                return merged;
            });

            // Clear visual state from previous wave
            setAnimState({});
            setDamageNumbers([]);
            setShakeLevel(null);
            setFlashId(null);
            camExchangeRef.current = null;

            // No auto-select — player picks target in new wave
            setTargetId(null);
            setTurnOwnerId(null);

            // Resume battle
            setPhase(PHASES.ATB_RUNNING);
            setAtbRunning(true);
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
            // Validate: need a living enemy selected
            var atkTarget = targetId;
            var atkState = atkTarget ? bState.get(atkTarget) : null;
            var atkValid = atkState && !atkState.ko && !bState.isPartyId(atkTarget);
            if (!atkValid) {
                return; // no valid target — player must select one first
            }
            startExchange(userId, atkTarget);
        } else if (actionId === "item") {
            itemMenuContextRef.current = "formation";
            setItemMenuOpen(true);
        } else if (actionId === "defend") {
            handleDefend(userId, "formation");
        } else if (actionId === "flee") {
            handleFlee(userId);
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
    // DEFEND — formation or in-cam, costs 1 pip, instant
    // Grants +defensePower buff until this combatant's ATB fills again.
    // ============================================================
    function handleDefend(userId, context) {
        deductPip(userId);

        // Apply buff via battleState
        bState.get(userId).buffs.push({
            stat:      DEFEND_BUFF.stat,
            value:     DEFEND_BUFF.value,
            turnsLeft: DEFEND_BUFF.turns,
        });
        bumpState();

        // Visual feedback
        spawnDmgAt(userId, "DEF UP", "#4ade80");

        // Post-use flow — gate handles both contexts
        endAction(userId, context);
    }

    // In-cam DEF button handler
    function handleCamDefend() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;
        handleDefend(cam.getSwingerId(), "in-cam");
    }

    // ============================================================
    // FLEE — formation only, costs ALL 3 pips (entire turn)
    // Roll chance. Success = exit. Fail = turn over.
    // ============================================================
    function handleFlee(userId) {
        // Drain all pips
        var entry = atbValuesRef.current[userId];
        var pipCount = entry ? entry.filledPips : 0;
        for (var p = 0; p < pipCount; p++) {
            deductPip(userId);
        }

        var roll = Math.random();
        if (roll < FLEE.baseChance) {
            // Success
            spawnDmgAt(userId, "FLED!", "#4ade80");
            setTimeout(function() {
                triggerBattleEnd("fled");
            }, 400);
        } else {
            // Fail — turn is over (all pips spent)
            spawnDmgAt(userId, "FAIL", "#ef4444");
            endFormationTurn();
        }
    }

    // ============================================================
    // ITEM USE — shared logic for formation + in-cam
    // ============================================================

    // Helper: deduct 1 pip from a combatant's ATB
    function deductPip(combatantId) {
        // Build updated ATB state synchronously so callers can
        // read atbValuesRef.current immediately after.
        var prev = atbValuesRef.current;
        var entry = prev[combatantId];
        if (!entry || entry.filledPips <= 0) return;
        var next = {};
        for (var key in prev) {
            if (prev.hasOwnProperty(key)) {
                next[key] = key === combatantId
                    ? { filledPips: entry.filledPips - 1, currentFill: 0 }
                    : prev[key];
            }
        }
        atbValuesRef.current = next;
        setAtbValues(next);
    }

    // ============================================================
    // GATE: endFormationTurn — clears turn, resumes ATB
    // Single source of truth for "formation turn is over."
    // ============================================================
    function endFormationTurn() {
        setTurnOwnerId(null);
        setPhase(PHASES.ATB_RUNNING);
        setAtbRunning(true);
    }

    // ============================================================
    // GATE: swapSides — flip exchange turn to the other combatant.
    // KO check + pip check → camOut() if can't continue.
    // Single source of truth for "pass turn inside action cam."
    // ============================================================
    function swapSides() {
        var cam = camExchangeRef.current;
        if (!cam) { camOut(); return; }

        // Flip turn
        cam.swinger = cam.swinger === "initiator" ? "responder" : "initiator";
        var nextSwingerId = cam.getSwingerId();

        // KO'd combatants can't act
        var nextSwingerState = bState.get(nextSwingerId);
        if (nextSwingerState && nextSwingerState.ko) {
            camOut();
            return;
        }

        // No pips = can't act
        var nextPips = atbValuesRef.current[nextSwingerId];
        if (!nextPips || nextPips.filledPips <= 0) {
            camOut();
        } else {
            setSwapTrigger(function(v) { return v + 1; });
            setPhase(PHASES.CAM_WAIT_ACTION);
        }
    }

    // ============================================================
    // GATE: endAction — called after any action resolves.
    // Routes to swapSides (in-cam) or pip-check (formation).
    // ============================================================
    function endAction(combatantId, context) {
        if (context === "in-cam") {
            swapSides();
        } else {
            var remaining = atbValuesRef.current[combatantId];
            if (!remaining || remaining.filledPips <= 0) {
                endFormationTurn();
            }
            // else stay in ACTION_SELECT — player can chain more actions
        }
    }

    function handleItemUse(itemId) {
        var context = itemMenuContextRef.current;
        var userId = context === "in-cam"
            ? (camExchangeRef.current ? camExchangeRef.current.getSwingerId() : null)
            : activeAtkId;

        if (!userId) return;

        // Determine target — heals/buffs target self, debuff/damage targets enemy
        var userItems = bState.get(userId);
        if (!userItems) return;
        var itemEntry = null;
        for (var i = 0; i < userItems.items.length; i++) {
            if (userItems.items[i].id === itemId) { itemEntry = userItems.items[i]; break; }
        }
        if (!itemEntry || itemEntry.qty <= 0) return;

        var effectTarget = userId;
        if (itemEntry.effect.type === "damage" || itemEntry.effect.type === "debuff_enemy") {
            if (context === "in-cam" && camExchangeRef.current) {
                effectTarget = camExchangeRef.current.getReceiverId();
            } else {
                // Validate: need a living enemy selected
                var tgtState = targetId ? bState.get(targetId) : null;
                var tgtValid = tgtState && !tgtState.ko && !bState.isPartyId(targetId);
                if (!tgtValid) {
                    setItemMenuOpen(false);
                    return; // no valid target — player must select one first
                }
                effectTarget = targetId;
            }
        } else if (itemEntry.effect.type === "heal" || itemEntry.effect.type === "buff") {
            if (context !== "in-cam") {
                // Validate: need a living ally selected
                var allyState = targetId ? bState.get(targetId) : null;
                var allyValid = allyState && !allyState.ko && bState.isPartyId(targetId);
                if (allyValid) {
                    effectTarget = targetId;
                } else {
                    // Default to self (the user)
                    effectTarget = userId;
                }
            }
        }

        // Apply via battleState
        var result = bState.useItem(userId, itemId, effectTarget);
        if (!result || !result.success) return;

        // Deduct pip
        deductPip(userId);

        // Spawn feedback number
        var feedbackText = result.effect.type === "heal" ? ("+" + result.effect.value) :
            result.effect.type === "damage" ? result.effect.value :
                result.effect.type === "buff" ? ("\u2B06" + result.effect.stat.replace("Power", "")) :
                    ("\u2B07" + result.effect.stat.replace("Power", ""));
        var feedbackColor = result.effect.type === "heal" ? "#4ade80" :
            result.effect.type === "damage" ? "#ef4444" :
                result.effect.type === "buff" ? "#60a5fa" : "#f59e0b";

        spawnDmgAt(result.targetId, feedbackText, feedbackColor);

        // Close submenu
        setItemMenuOpen(false);
        bumpState();

        // Post-use flow — gate handles both contexts
        endAction(userId, context);
    }

    function handleItemClose() {
        setItemMenuOpen(false);
    }

    // In-cam ATK button — opens skill picker for player, fires directly for AI
    function handleCamATKButton() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;
        var swingerId = cam.getSwingerId();
        // Only show skill picker for the player character (smith)
        if (isPartyId(swingerId) && swingerId === "smith") {
            setItemMenuOpen(false);
            setSkillMenuOpen(true);
        } else {
            // AI-controlled party members (fairy) — fire directly
            handleCamATK();
        }
    }

    // Player picked a skill from the submenu
    function handleSkillSelect(skillId) {
        selectedSkillRef.current = skillId;
        setSkillMenuOpen(false);
        handleCamATK();
    }

    function handleSkillClose() {
        setSkillMenuOpen(false);
    }

    // In-cam ITEM button handler
    function handleCamItem() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;
        itemMenuContextRef.current = "in-cam";
        setSkillMenuOpen(false);
        setItemMenuOpen(true);
    }

    // ============================================================
    // IN-CAM BUTTON STATE — Initiator vs Responder
    // Initiator: ATK + RELENT. Responder: ATK + PASS.
    // ============================================================
    var camWaiting = phase === PHASES.CAM_WAIT_ACTION;
    var cam = camExchangeRef.current;
    var camSwingerId = cam ? cam.getSwingerId() : null;
    var camInitiatorId = cam ? cam.initiatorId : null;
    var camIsInitiatorTurn = camSwingerId && camSwingerId === camInitiatorId;
    var camSwingerIsParty = camSwingerId ? isPartyId(camSwingerId) : false;
    var camSwingerIsEnemy = camSwingerId ? !isPartyId(camSwingerId) : false;

    // ATK enabled if waiting and it's this side's turn and they have pips
    var swingerPips = camSwingerId ? (atbValues[camSwingerId] || { filledPips: 0 }).filledPips : 0;
    var playerAtkEnabled = camWaiting && camSwingerIsParty && swingerPips > 0;
    var enemyAtkEnabled  = camWaiting && camSwingerIsEnemy && swingerPips > 0;

    // RELENT: only for initiator's turn
    var playerRelentEnabled = camWaiting && camSwingerIsParty && camIsInitiatorTurn;
    var enemyRelentEnabled  = camWaiting && camSwingerIsEnemy && camIsInitiatorTurn;

    // PASS: only for responder's turn
    var playerPassEnabled = camWaiting && camSwingerIsParty && !camIsInitiatorTurn;
    var enemyPassEnabled  = camWaiting && camSwingerIsEnemy && !camIsInitiatorTurn;

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
                atbValues={atbValues}
            />

            {/* === IN-CAM ACTION BUTTONS — grouped by side === */}
            {isActionCam && (
                <div className="battle-cam-atk-buttons">
                    {/* Enemy side (left) */}
                    <div className="battle-cam-atk-group">
                        <button
                            className={"battle-cam-atk-btn battle-cam-atk-btn--enemy" + (enemyAtkEnabled ? " battle-cam-atk-btn--active" : "")}
                            disabled={!enemyAtkEnabled}
                            onClick={handleCamATK}
                        >
                            ENEMY ATK
                        </button>
                        {enemyRelentEnabled && (
                            <button
                                className="battle-cam-sec-btn battle-cam-sec-btn--relent"
                                onClick={handleCamRelent}
                            >
                                RELENT
                            </button>
                        )}
                        {enemyPassEnabled && (
                            <button
                                className="battle-cam-sec-btn battle-cam-sec-btn--pass"
                                onClick={handleCamPass}
                            >
                                PASS
                            </button>
                        )}
                    </div>

                    {/* Player side (right) */}
                    <div className="battle-cam-atk-group">
                        <button
                            className={"battle-cam-atk-btn battle-cam-atk-btn--player" + (playerAtkEnabled ? " battle-cam-atk-btn--active" : "")}
                            disabled={!playerAtkEnabled}
                            onClick={handleCamATKButton}
                        >
                            PLAYER ATK
                        </button>
                        {playerRelentEnabled && (
                            <button
                                className="battle-cam-sec-btn battle-cam-sec-btn--relent"
                                onClick={handleCamRelent}
                            >
                                RELENT
                            </button>
                        )}
                        {playerPassEnabled && (
                            <button
                                className="battle-cam-sec-btn battle-cam-sec-btn--pass"
                                onClick={handleCamPass}
                            >
                                PASS
                            </button>
                        )}
                        {(playerAtkEnabled || playerRelentEnabled || playerPassEnabled) && (
                            <button
                                className="battle-cam-sec-btn battle-cam-sec-btn--defend"
                                onClick={handleCamDefend}
                            >
                                DEF
                            </button>
                        )}
                        {(playerAtkEnabled || playerRelentEnabled || playerPassEnabled) && (
                            <button
                                className="battle-cam-sec-btn battle-cam-sec-btn--item"
                                onClick={handleCamItem}
                            >
                                ITEM
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* === BOTTOM OVERLAY — ATB + Action Menu === */}
            <div className="battle-overlay-bottom">

                {/* ATB gauges — left side */}
                <ATBGaugeStrip
                    combatants={allCombatants}
                    hidden={isActionCam}
                />

                {/* Action menu — right side (flippable) */}
                <ActionMenu
                    hidden={isActionCam}
                    onAction={handleAction}
                    isLeftHanded={isLeftHanded}
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

            {/* Item submenu */}
            <ItemSubmenu
                visible={itemMenuOpen}
                items={itemMenuOpen ? (function() {
                    var uid = itemMenuContextRef.current === "in-cam"
                        ? (camExchangeRef.current ? camExchangeRef.current.getSwingerId() : null)
                        : activeAtkId;
                    var c = uid ? bState.get(uid) : null;
                    return c ? c.items : [];
                })() : []}
                onUse={handleItemUse}
                onClose={handleItemClose}
                isInCam={itemMenuContextRef.current === "in-cam"}
            />

            {/* Skill submenu */}
            <SkillSubmenu
                visible={skillMenuOpen}
                skills={skillMenuOpen ? (function() {
                    var cam = camExchangeRef.current;
                    var uid = cam ? cam.getSwingerId() : null;
                    var cData = uid ? combatantMap[uid] : null;
                    if (!cData || !cData.skills) return [];
                    return cData.skills.map(function(sId) {
                        return BattleSkills.getSkill(sId);
                    }).filter(Boolean);
                })() : []}
                availablePips={skillMenuOpen ? (function() {
                    var cam = camExchangeRef.current;
                    var uid = cam ? cam.getSwingerId() : null;
                    var entry = uid ? atbValues[uid] : null;
                    return entry ? entry.filledPips : 0;
                })() : 0}
                onSelect={handleSkillSelect}
                onClose={handleSkillClose}
                isInCam={true}
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
                atbRunning={atbRunning}
                onToggleATB={handleDevToggleATB}
                onFillPips={handleDevFillPips}
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