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
import PlaybackManager from "./managers/battlePlaybackManager.js";
import BattleDirectorModule from "./managers/battleDirector.js";
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
var CHOREO_DISTANCES = BattleConstants.CHOREO_DISTANCES;

// ============================================================
// COMIC PANEL LINES — fairy speech per phase
// ============================================================
var COMIC_LINES = {};
COMIC_LINES[PHASES.ACTION_CAM_IN]      = "Let's get 'em!";
COMIC_LINES[PHASES.CAM_SWING_QTE]      = "Show 'em what you've got!";
COMIC_LINES[PHASES.CAM_SWING_PLAYBACK] = "Here it comes!";
COMIC_LINES[PHASES.CAM_RESOLVE]        = "Nice swing!";
COMIC_LINES[PHASES.CAM_COUNTER_PROMPT] = "Counter time!";
COMIC_LINES[PHASES.CAM_CHAIN_PROMPT]   = "Keep going!";
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
    "--choreo-lunge":       CHOREO_DISTANCES.lungePx + "px",
    "--choreo-knockback":   CHOREO_DISTANCES.knockbackPx + "px",
    "--choreo-dodge":       CHOREO_DISTANCES.dodgePx + "px",
    "--choreo-flinch":      CHOREO_DISTANCES.flinchPx + "px",
    "--choreo-windup":      CHOREO_DISTANCES.windUpPx + "px",
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
    var [phase, setPhase] = useState(PHASES.INTRO);
    var [targetId, setTargetId] = useState(null);
    var [turnOwnerId, setTurnOwnerId] = useState(null);
    var [attackerId] = useState(TEST_PARTY[0].id);
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
    // When a skill is pending, only valid targets are accepted.
    function selectTarget(id) {
        console.log("[selectTarget] id=" + id + " pendingSkill=" + selectedSkillRef.current);
        if (selectedSkillRef.current) {
            // Skill pending — validate target
            var skill = BattleSkills.getSkill(selectedSkillRef.current);
            if (!isValidTarget(id, skill)) {
                console.log("[selectTarget] REJECTED — invalid target for skill");
                BattleSFX.invalid();
                return;
            }
        }
        setTargetId(id);
        if (id != null) BattleSFX.select();
        console.log("[selectTarget] target set to " + id);
    }

    // Check if a combatant is a valid target for a given skill
    function isValidTarget(id, skill) {
        if (!id) return false;
        var c = bState.get(id);
        if (!c || c.ko) return false;
        // Attack skills target enemies; future: heal/buff target allies
        var targetsEnemy = !skill || !skill.targetAlly;
        if (targetsEnemy) return !bState.isPartyId(id);
        return bState.isPartyId(id);
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
            if (directorRef.current) { directorRef.current.destroy(); directorRef.current = null; }
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

    // --- Counter decision callback ref (for counter prompt UI → Director) ---
    var counterDecisionRef = useRef(null);

    // ============================================================
    // BATTLE DIRECTOR — the brain. Owns sequencer, turns, AP, flow.
    // Created once, held in ref. Bridge = bag of callbacks to poke React.
    // ============================================================
    var directorRef = useRef(null);
    if (!directorRef.current) {
        directorRef.current = BattleDirectorModule.createBattleDirector({
            // --- Instant state setters ---
            setPhase:           setPhase,
            setTurnOwnerId:     setTurnOwnerId,
            setTargetId:        setTargetId,
            bumpState:          bumpState,
            onAPChanged:        function(ap) { setApState(ap); },
            onTurnOrderChanged: function() { bumpState(); }, // re-render to pick up new order
            setWaveIndex:       function(idx) { waveIndexRef.current = idx; setWaveIndex(idx); },

            // --- Fire-and-forget visuals ---
            spawnDamageNumber:  function(id, val, color) { spawnDmgAt(id, val, color); },
            spawnSkillName:     function(name, id, color) { spawnSkillName(name, id, color); },

            // --- Async: QTE ---
            activateQTE:        function(config, onComplete) { activateQTE(config, onComplete); },

            // --- Async: Playback (wraps PlaybackManager + cleanup) ---
            runOffensePlayback: function(ctx, onComplete) {
                // Track cam participants for stagePos
                camExchangeRef.current = { initiatorId: ctx.swingerId, responderId: ctx.receiverId };
                ctx.onFinished = function() {
                    setPhase(PHASES.CAM_RESOLVE);
                    setTimeout(onComplete, EXCHANGE.resolveHoldMs);
                };
                PlaybackManager.runOffense(bus, ctx);
            },
            runDefensePlayback: function(ctx, onComplete) {
                camExchangeRef.current = { initiatorId: ctx.swingerId, responderId: ctx.receiverId };
                DefenseTiming.init(DEFENSE_TIMING);
                defenseActiveRef.current = true;
                ctx.onFinished = function() {
                    defenseActiveRef.current = false;
                    defenseInputResolveRef.current = null;
                    setPhase(PHASES.CAM_RESOLVE);
                    setTimeout(onComplete, EXCHANGE.resolveHoldMs);
                };
                PlaybackManager.runDefense(bus, ctx);
            },

            // --- Async: Counter prompt ---
            showCounterPrompt: function(responderId, cost, onDecision) {
                counterDecisionRef.current = onDecision;
                setPhase(PHASES.CAM_COUNTER_PROMPT);
            },

            // --- Async: Chain prompt (player multi-action cam) ---
            showCamChainPrompt: function(initiatorId) {
                setPhase(PHASES.CAM_CHAIN_PROMPT);
            },

            // --- Item menu ---
            openItemMenu: function() {
                itemMenuContextRef.current = "formation";
                setItemMenuOpen(true);
            },

            // --- Visual cleanup (wave transition) ---
            clearVisualState: function() {
                setAnimState({});
                setDamageNumbers([]);
                setShakeLevel(null);
                setFlashId(null);
                camExchangeRef.current = null;
            },

            // --- Cam exchange tracking (who's in the action cam) ---
            setCamExchange: function(initiatorId, responderId) {
                camExchangeRef.current = { initiatorId: initiatorId, responderId: responderId };
            },

            // --- Cam lifecycle helpers ---
            onCamOut: function() {
                // Preserve KO anims, clear everything else
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
            },

            // --- Battle end ---
            onBattleEnd: function(result) { setBattleResult(result); },
        }, {
            party:              TEST_PARTY,
            waves:              TEST_WAVES,
            bState:             bState,
            bus:                bus,
            BattleEngagement:   BattleEngagement,
            BattleAI:           BattleAI,
            BattleSkills:       BattleSkills,
            BattleSFX:          BattleSFX,
            DefenseTiming:      DefenseTiming,
            PlaybackManager:    PlaybackManager,
            ChalkboardModule:   ChalkboardModule,
        });
    }
    var director = directorRef.current;

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
            // Director handles flow via onFinished callback.
            // Just clean up playback state here.
            playbackResultsRef.current = null;
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
        || phase === PHASES.CAM_COUNTER_PROMPT || phase === PHASES.CAM_CHAIN_PROMPT
        || phase === PHASES.ACTION_CAM_OUT;
    var isIntro = phase === PHASES.INTRO;
    var showQTE = phase === PHASES.CAM_SWING_QTE;
    var showComic = isActionCam;

    var comicLine = COMIC_LINES[phase] || "...";

    var activeAtkId = turnOwnerId || null;

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
    // Uses camExchangeRef (ref) instead of isActionCam (render-time value)
    // so setTimeout callbacks in playback manager get the correct position
    function stagePos(combatantId) {
        var cam = camExchangeRef.current;
        if (cam && (combatantId === cam.initiatorId || combatantId === cam.responderId)) {
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
        spawnDamageNumber(value, pos.x - 10, pos.y - 25 + (yOffset || 0), color);
    }

    // Spawn a skill name label above a combatant sprite
    function spawnSkillName(skillName, combatantId, color) {
        var pos = stagePos(combatantId);
        clearTimeout(skillNameTimerRef.current);
        var key = ++skillNameKeyRef.current;
        setSkillNameLabel({
            key: key,
            text: skillName,
            x: pos.x - 10,
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
    function handleDevFillAP() {
        director.fillAllAP();
    }
    function handleDevReset() {
        director.reset();
        // Re-create battle state from scratch
        waveIndexRef.current = 0;
        setWaveIndex(0);
        var wave0 = TEST_WAVES[0];
        battleStateRef.current = BattleStateModule.createBattleState(TEST_PARTY, wave0);
        bumpState();
        setQteConfig(null);
        setItemMenuOpen(false);
        setSkillMenuOpen(false);
        selectedSkillRef.current = null;
        setChainSkillMenuOpen(false);
        chainSelectedSkillRef.current = null;
        setBattleResult(null);
        camExchangeRef.current = null;
        defenseActiveRef.current = false;
        defenseInputResolveRef.current = null;
        DefenseTiming.destroy();
    }

    // ============================================================
    // START BATTLE — from INTRO phase, Director takes over
    // ============================================================
    function handleStartBattle() {
        if (phase !== PHASES.INTRO) return;
        director.start();
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
        console.log("[Defense] touchStart — defense active");
        var t = e.touches[0];
        defenseTouchStartRef.current = { x: t.clientX, y: t.clientY };
    }

    function handleSceneTouchEnd(e) {
        // Defense active — classify tap vs swipe for defense input
        if (defenseActiveRef.current) {
            console.log("[Defense] touchEnd — defense active, locked:", DefenseTiming.isLocked());
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
        // Not in action cam — tap empty space
        if (!isActionCam) {
            // Check if touch landed on a combatant (has closest battle character parent)
            var touchTarget = e.target;
            var hitCombatant = touchTarget && touchTarget.closest && touchTarget.closest(".normal-cam-char");
            if (hitCombatant) {
                console.log("[sceneTouchEnd] hit combatant — skipping deselect");
                return;
            }

            console.log("[sceneTouchEnd] empty space tap — deselecting");
            if (selectedSkillRef.current) {
                // Cancel pending skill + close submenu
                selectedSkillRef.current = null;
                setSkillMenuOpen(false);
                setTargetId(null);
                bumpState();
            } else {
                setTargetId(null);
            }
        }
    }

    function handleSceneClick(e) {
        // Defense active — desktop fallback, click = tap
        if (defenseActiveRef.current) {
            if (DefenseTiming.isLocked()) return;
            defenseInputResolve("tap");
            return;
        }
        // Not in action cam — tap empty space
        if (!isActionCam) {
            var hitCombatant = e.target && e.target.closest && e.target.closest(".normal-cam-char");
            if (hitCombatant) {
                console.log("[sceneClick] hit combatant — skipping deselect");
                return;
            }

            console.log("[sceneClick] empty space click — deselecting");
            if (selectedSkillRef.current) {
                selectedSkillRef.current = null;
                setSkillMenuOpen(false);
                setTargetId(null);
                bumpState();
            } else {
                setTargetId(null);
            }
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
    // EXCHANGE LIFECYCLE — owned by Director.
    // Director calls bridge.runOffensePlayback / runDefensePlayback.
    // BattleView just renders phase state and handles defense input.
    // ============================================================
    // --- Counter prompt handlers — thin pass-through to Director ---
    function handleCounterAccept() {
        BattleSFX.select();
        setPhase(PHASES.CAM_RESOLVE);
        if (counterDecisionRef.current) {
            counterDecisionRef.current(true);
            counterDecisionRef.current = null;
        }
    }

    function handleCounterDecline() {
        BattleSFX.select();
        setPhase(PHASES.CAM_RESOLVE);
        if (counterDecisionRef.current) {
            counterDecisionRef.current(false);
            counterDecisionRef.current = null;
        }
    }

    // ============================================================
    // IN-CAM CHAIN — player multi-action cam session
    // ============================================================
    var [chainSkillMenuOpen, setChainSkillMenuOpen] = useState(false);
    var chainSelectedSkillRef = useRef(null);

    function handleChainAttack() {
        BattleSFX.select();
        // Open skill submenu inside cam
        setChainSkillMenuOpen(true);
    }

    function handleChainRelent() {
        BattleSFX.select();
        setPhase(PHASES.CAM_RESOLVE);
        setChainSkillMenuOpen(false);
        chainSelectedSkillRef.current = null;
        director.onPlayerCamRelent();
    }

    function handleChainSkillSelect(skillId) {
        // Same skill tapped again — confirm
        if (chainSelectedSkillRef.current === skillId) {
            handleChainSkillConfirm(skillId);
            return;
        }
        chainSelectedSkillRef.current = skillId;
        bumpState();
    }

    function handleChainSkillConfirm(skillId) {
        var sid = skillId || chainSelectedSkillRef.current;
        if (!sid) return;
        chainSelectedSkillRef.current = null;
        setChainSkillMenuOpen(false);
        director.onPlayerCamChain(sid);
    }

    function handleChainSkillClose() {
        setChainSkillMenuOpen(false);
        chainSelectedSkillRef.current = null;
    }

    // ============================================================
    // BATTLE END + WAVE TRANSITION — owned by Director
    // ============================================================

    // ============================================================
    // RESULTS — Continue button exits battle
    // ============================================================
    function handleResultsContinue() {
        if (onExit) onExit(battleResult);
    }

    function handleAction(actionId) {
        var userId = activeAtkId;

        if (actionId === "attack") {
            // Open skill picker — Director doesn't handle this UI flow
            setItemMenuOpen(false);
            setSkillMenuOpen(true);
        } else if (actionId === "item") {
            // Director validates AP, opens item menu via bridge
            director.onPlayerAction("item", null, null);
        } else if (actionId === "defend") {
            director.onPlayerAction("defend", null, null);
        } else if (actionId === "flee") {
            director.onPlayerAction("flee", null, null);
        } else if (actionId === "wait") {
            selectedSkillRef.current = null;
            setSkillMenuOpen(false);
            director.onPlayerAction("wait", null, null);
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
    // DEFEND / FLEE / AP SPEND / TURN END — owned by Director
    // ============================================================

    // ============================================================
    // ITEM USE — formation only. BattleView handles the UI + item
    // resolution, then signals Director that item was used.
    // ============================================================
    function handleItemUse(itemId) {
        var userId = activeAtkId;
        if (!userId) return;

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

        // Signal Director — item was used successfully
        director.onPlayerItemUsed(true);
    }

    function handleItemClose() {
        setItemMenuOpen(false);
        // Signal Director — item cancelled
        director.onPlayerItemUsed(false);
    }

    // Player tapped a skill in the submenu
    function handleSkillSelect(skillId) {
        console.log("[handleSkillSelect] skillId=" + skillId + " current pending=" + selectedSkillRef.current + " targetId=" + targetId);
        // Same skill tapped again — confirm and execute
        if (selectedSkillRef.current === skillId) {
            console.log("[handleSkillSelect] same skill tapped — confirming");
            handleSkillConfirm();
            return;
        }
        // Different skill (or first pick) — set pending
        selectedSkillRef.current = skillId;
        var skill = BattleSkills.getSkill(skillId);
        var targetsEnemy = !skill || !skill.targetAlly;

        // Keep existing target if it's valid for this skill
        if (targetId && isValidTarget(targetId, skill)) {
            console.log("[handleSkillSelect] keeping existing target " + targetId);
            bumpState();
            return;
        }

        // No valid target selected — auto-pick first
        var autoTarget = targetsEnemy ? pickFirstLivingEnemy() : pickFirstLivingAlly();
        console.log("[handleSkillSelect] auto-picked target " + autoTarget);
        if (autoTarget) {
            setTargetId(autoTarget);
            BattleSFX.select();
        }
        bumpState();
    }

    // Player confirms attack after selecting skill + target
    function handleSkillConfirm() {
        var skillId = selectedSkillRef.current;
        if (!skillId) return;

        var atkTarget = targetId;
        if (!atkTarget) return;

        selectedSkillRef.current = null;
        setSkillMenuOpen(false);
        director.onPlayerAction("attack", skillId, atkTarget);
    }

    function handleSkillClose() {
        setSkillMenuOpen(false);
        selectedSkillRef.current = null;
    }

    // --- Counter prompt state ---
    var showCounterPrompt = phase === PHASES.CAM_COUNTER_PROMPT;
    var counterResponderId = camExchangeRef.current ? camExchangeRef.current.responderId : null;
    var counterResponderIsParty = counterResponderId ? isPartyId(counterResponderId) : false;

    // --- Chain prompt state (player multi-action cam) ---
    var showChainPrompt = phase === PHASES.CAM_CHAIN_PROMPT;

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

    // BG zoom — match stage zoom so background moves with camera
    var bgFocusX = (ACTION_CAM_SLOTS.centerX / STAGE.designW * 100);
    var bgFocusY = (ACTION_CAM_SLOTS.centerY / STAGE.designH * 100);
    var rootStyle = Object.assign({}, ROOT_VARS, {
        backgroundSize: isActionCam ? (camZoom * 100) + "%" : "cover",
        backgroundPosition: isActionCam ? bgFocusX + "% " + bgFocusY + "%" : "center",
    });

    return (
        <div className={"battle-root" + (isActionCam ? " battle-root--cam" : "")} style={rootStyle}>

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
                                isActionCam={isActionCam}
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
                                isActionCam={isActionCam}
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
                                left: skillNameLabel.x + "px",
                                top: skillNameLabel.y + "px",
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

            {/* === BOTTOM OVERLAY — Turn Order + Decision Slot + Comic === */}
            <div className={"battle-overlay-bottom" + ((showCounterPrompt || showChainPrompt) ? " battle-overlay-bottom--counter" : "")}>

                {/* Turn order strip — initiative queue with AP bars */}
                <TurnOrderStrip
                    turnOrder={director.getTurnOrder()}
                    turnIndex={director.getTurnIndex()}
                    apState={apState}
                    combatantMap={combatantMap}
                    hidden={isActionCam || isIntro}
                />

                {/* === RIGHT DECISION SLOT — mutually exclusive === */}
                {showCounterPrompt && counterResponderIsParty ? (
                    <div className="battle-counter-prompt">
                        <button
                            className="battle-counter-prompt__btn battle-counter-prompt__btn--counter"
                            onClick={handleCounterAccept}
                        >
                            <span className="battle-counter-prompt__btn-label">COUNTER</span>
                            <span className="battle-counter-prompt__btn-cost">{ENGAGEMENT.AP_COST_COUNTER + " AP"}</span>
                        </button>
                        <button
                            className="battle-counter-prompt__btn battle-counter-prompt__btn--pass"
                            onClick={handleCounterDecline}
                        >
                            <span className="battle-counter-prompt__btn-label">PASS</span>
                        </button>
                    </div>
                ) : showChainPrompt ? (
                    chainSkillMenuOpen ? (
                        <div className="battle-right-slot">
                            <SkillSubmenu
                                visible={true}
                                skills={(function() {
                                    var cData = combatantMap[activeAtkId];
                                    if (!cData || !cData.skills) return [];
                                    return cData.skills.map(function(sId) {
                                        return BattleSkills.getSkill(sId);
                                    }).filter(Boolean);
                                })()}
                                availableAP={BattleEngagement.getAP(apState, activeAtkId)}
                                pendingSkillId={chainSelectedSkillRef.current}
                                onSelect={handleChainSkillSelect}
                                onClose={handleChainSkillClose}
                                isInCam={true}
                            />
                            <button
                                className="battle-chain-relent-btn"
                                onClick={handleChainRelent}
                            >
                                RELENT
                            </button>
                        </div>
                    ) : (
                        <div className="battle-counter-prompt">
                            <button
                                className="battle-counter-prompt__btn battle-counter-prompt__btn--counter"
                                onClick={handleChainAttack}
                            >
                                <span className="battle-counter-prompt__btn-label">ATK</span>
                            </button>
                            <button
                                className="battle-counter-prompt__btn battle-counter-prompt__btn--pass"
                                onClick={handleChainRelent}
                            >
                                <span className="battle-counter-prompt__btn-label">RELENT</span>
                            </button>
                        </div>
                    )
                ) : itemMenuOpen ? (
                    <ItemSubmenu
                        visible={true}
                        items={(function() {
                            var c = bState.get(activeAtkId);
                            return c ? c.items : [];
                        })()}
                        onUse={handleItemUse}
                        onClose={handleItemClose}
                        isInCam={false}
                    />
                ) : skillMenuOpen ? (
                    <div className="battle-right-slot">
                        {selectedSkillRef.current && (
                            <div className="battle-pick-target-prompt">
                                <span className="battle-pick-target-prompt__text">PICK TARGET</span>
                            </div>
                        )}
                        <SkillSubmenu
                            visible={true}
                            skills={(function() {
                                var cData = combatantMap[activeAtkId];
                                if (!cData || !cData.skills) return [];
                                return cData.skills.map(function(sId) {
                                    return BattleSkills.getSkill(sId);
                                }).filter(Boolean);
                            })()}
                            availableAP={BattleEngagement.getAP(apState, activeAtkId)}
                            pendingSkillId={selectedSkillRef.current}
                            onSelect={handleSkillSelect}
                            onClose={handleSkillClose}
                            isInCam={false}
                        />
                    </div>
                ) : !isActionCam && !isIntro ? (
                    <ActionMenu
                        hidden={false}
                        onAction={handleAction}
                        isLeftHanded={isLeftHanded}
                        apState={apState}
                        activeId={activeAtkId}
                    />
                ) : null}

                {/* Comic panel — visible during action cam */}
                <ComicPanel
                    visible={showComic}
                    sprite={null}
                    name={TEST_PARTY[1].name}
                    line={comicLine}
                    isLeftHanded={isLeftHanded}
                />
            </div>

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
                onStart={handleStartBattle}
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