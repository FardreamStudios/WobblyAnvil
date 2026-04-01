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
import BattleStateModule from "./battleState.js";
import QTERunnerModule from "./QTERunner.js";
import ChalkboardModule from "./Chalkboard.js";
import BattleCharacterModule from "./BattleCharacter.js";
import BattleResultsScreen from "./BattleResultsScreen.js";
import DevControls from "./DevControls.js";
import ATBGaugeStrip from "./ATBGaugeStrip.js";
import ActionMenu from "./ActionMenu.js";
import ItemSubmenu from "./ItemSubmenu.js";
import SkillSubmenu from "./SkillSubmenu.js";
import ComicPanel from "./ComicPanel.js";
import ActionCamInfoPanel from "./ActionCamInfoPanel.js";
import BattleAI from "./battleAI.js";
import DefenseTiming from "./defenseTiming.js";
import GestureRecognition from "./gestureRecognition.js";
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
    var [targetId, setTargetId] = useState(currentEnemies[0].id);
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
    var readyIdRef = useRef(null);
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
        var tickCombatants = TEST_PARTY.concat(currentEnemiesRef.current);

        function tick(ts) {
            if (!atbRunningRef.current) return;
            if (!lastTime) { lastTime = ts; rafId = requestAnimationFrame(tick); return; }
            var dt = (ts - lastTime) / 1000;
            lastTime = ts;
            if (dt > 0.1) dt = 0.1;

            setAtbValues(function(prev) {
                // Filter out KO'd combatants — dead don't charge ATB
                var liveCombatants = tickCombatants.filter(function(c) {
                    var s = bState.get(c.id);
                    return !s || !s.ko;
                });
                var result = BattleATB.tick(dt, prev, liveCombatants, atbFrozenRef.current);
                if (result.readyId) {
                    readyIdRef.current = result.readyId;
                }
                return result.nextState;
            });

            if (readyIdRef.current) {
                var whoIsReady = readyIdRef.current;
                readyIdRef.current = null;

                // Skip KO'd combatants — they can't take turns
                var readyState = bState.get(whoIsReady);
                if (readyState && readyState.ko) {
                    rafId = requestAnimationFrame(tick);
                    return;
                }

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
                    if (!aiDecision) { rafId = requestAnimationFrame(tick); return; }
                    setTargetId(aiDecision.targetId);
                    startExchange(whoIsReady, aiDecision.targetId, aiDecision.skillId);
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
    function stagePos(combatantId) {
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
        setTargetId(wave0[0].id);
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

    // --- Summary damage number spawner (called on last beat) ---
    function spawnSummaryDamage() {
        // V1: summary damage numbers disabled — too noisy during combat
        // Refs still tracked for potential V2 use
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

        if (swingerIsEnemy) {
            // Swinger telegraph-sync is driven by onRingStart — don't touch it.
            // Just play SFX + resolve hit on receiver.
            if (beat.sfx) BattleSFX[beat.sfx] ? BattleSFX[beat.sfx]() : BattleSFX.hit();
            resolveHitOnReceiver(hit, beat, swinger, receiver, dmgColor, isLastBeat, inputType);

            // Spawn summary on last beat
            if (isLastBeat) spawnSummaryDamage();

            // Clear receiver anim after hit settles (swinger stays in telegraph-sync)
            // Preserve KO anim only on last beat — otherwise reset to neutral
            setTimeout(function() {
                var recState = bState.get(receiver);
                var keepAnim = recState && recState.ko && isLastBeat;
                if (!keepAnim) {
                    setAnimState(function(prev) {
                        var n = Object.assign({}, prev); delete n[receiver]; return n;
                    });
                }
            }, 260);
        } else {
            // Player swings — windup-sync is driven by onRingStart, don't touch swinger anim.
            // Just play SFX + resolve hit on receiver.
            if (hit) {
                if (beat.sfx) BattleSFX[beat.sfx] ? BattleSFX[beat.sfx]() : BattleSFX.hit();
                // Increment player combo counter
                comboCounterRef.current.playerCombo += 1;
                var comboCount = comboCounterRef.current.playerCombo;
                // Apply damage to mutable state
                var dmgResult = bState.applyDamage(receiver, beat.damage, true);
                bumpState();
                // Accumulate for summary
                summaryDmgRef.current.total += beat.damage;
                summaryDmgRef.current.color = dmgColor;
                setTimeout(function() {
                    var recState = bState.get(receiver);
                    var isReceiverKO = recState && recState.ko;

                    // Last beat + receiver dead (killed now or earlier) = KO react
                    // Any other beat = hit react (or tgtReact if alive)
                    if (isReceiverKO && isLastBeat) {
                        setFlashId(receiver);
                        setAnimState(function(prev) {
                            var n = Object.assign({}, prev); n[receiver] = "ko"; return n;
                        });
                    } else if (isReceiverKO) {
                        // Dead but not last beat — hit react
                        setFlashId(receiver);
                        setAnimState(function(prev) {
                            var n = Object.assign({}, prev); n[receiver] = "hit"; return n;
                        });
                    } else if (beat.tgtReact) {
                        setFlashId(receiver);
                        setAnimState(function(prev) {
                            var n = Object.assign({}, prev); n[receiver] = beat.tgtReact; return n;
                        });
                    }
                    if (beat.shake && !isReceiverKO) {
                        setShakeLevel(null);
                        requestAnimationFrame(function() { setShakeLevel(beat.shake); });
                    }
                    // Spawn summary on last beat only (currently no-op, reserved for V2)
                    if (isLastBeat) {
                        spawnSummaryDamage();
                    }
                    // Overkill number (still per-beat — overkill is a moment, not a summary)
                    if (dmgResult.overkill > 0) {
                        spawnDmgAt(receiver, "+" + dmgResult.overkill + " OVERKILL", BATTLE_END.overkillColor, -20);
                    }
                    setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
                }, 60);
                // Clear receiver anim after hit settles (swinger stays in windup-sync)
                // Preserve KO anim only on last beat — otherwise reset to neutral
                setTimeout(function() {
                    var recState2 = bState.get(receiver);
                    var keepAnim2 = recState2 && recState2.ko && isLastBeat;
                    if (!keepAnim2) {
                        setAnimState(function(prev) {
                            var n = Object.assign({}, prev); delete n[receiver]; return n;
                        });
                    }
                }, 260);
            } else {
                // Whiff — no damage number per beat, accumulate 0
                // (summary will show whatever was accumulated from prior hits)
                if (isLastBeat) {
                    spawnSummaryDamage();
                    // Show MISS if entire combo whiffed
                    if (summaryDmgRef.current.total === 0) {
                        spawnDmgAt(receiver, "MISS", "#888888");
                    }
                }
            }
        }
    }

    // ============================================================
    // SHARED DEFENSE OUTCOME — single function for all defense feedback.
    // Called by both legacy (handleQTERingResult) and new (resolveDefenseBeatResult) paths.
    //
    //   tier:     "perfect" | "good" | "pass" | "fail"
    //   mult:     damage multiplier for this tier
    //   inputType: "tap" | "swipe" | "auto_miss"
    //   beat:     resolved beat object
    //   swingerId / receiverId: combatant IDs
    //   dmgColor: hex color for damage numbers
    //   isLastBeat: boolean
    //   onDone:   callback after outcome applied (optional, e.g. advanceBeat)
    // ============================================================
    function applyDefenseOutcome(tier, mult, inputType, beat, swingerId, receiverId, dmgColor, isLastBeat, onDone) {
        console.log("[CAM-ID] applyDefenseOutcome tier=" + tier + " swinger=" + swingerId + " receiver=" + receiverId + " lastBeat=" + isLastBeat);
        // --- KO guard — receiver already dead → overkill ---
        var recCheck = bState.get(receiverId);
        if (recCheck && recCheck.ko) {
            comboCounterRef.current.enemyUnblocked += 1;
            var overkillDmg = Math.round(beat.damage * mult);
            bState.applyDamage(receiverId, overkillDmg, false);
            bumpState();
            summaryDmgRef.current.total += overkillDmg;
            summaryDmgRef.current.color = dmgColor;
            setFlashId(receiverId);
            setAnimState(function(prev) {
                var n = Object.assign({}, prev);
                n[receiverId] = isLastBeat ? "ko" : "hit";
                return n;
            });
            setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
            if (onDone) onDone();
            return;
        }

        // --- DODGE (swipe + pass + dodgeable) ---
        if (tier === "pass" && inputType === "swipe" && beat.dodgeable !== false) {
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); n[receiverId] = "dodge"; return n;
            });
            BattleSFX.dodge();
            summaryDmgRef.current.color = "#4ade80";
            // Spawn "DODGE" label
            _spawnTierLabel(receiverId, "DODGE", "#4ade80", -30);
            if (onDone) onDone();
            return;
        }

        // --- BRACE (tap + blockable + not unblockable) ---
        if ((tier === "perfect" || tier === "good") && inputType === "tap" && beat.blockable !== false && !beat.unblockable) {
            var blockDmg = Math.round(beat.damage * mult);
            var isPerfect = (tier === "perfect");

            // Anim: perfect gets stronger visual, good gets standard brace
            setAnimState(function(prev) {
                var n = Object.assign({}, prev);
                n[receiverId] = isPerfect ? "brace-perfect" : "brace";
                return n;
            });

            // Attacker flinch on perfect brace
            if (isPerfect) {
                setAnimState(function(prev) {
                    var n = Object.assign({}, prev); n[swingerId] = "flinch"; return n;
                });
                setTimeout(function() {
                    setAnimState(function(prev) {
                        var n = Object.assign({}, prev); delete n[swingerId]; return n;
                    });
                }, 180);
            }

            // SFX: crisp parry for perfect, softer block for good
            if (isPerfect) { BattleSFX.bracePerfect(); } else { BattleSFX.block(); }

            var braceResult = bState.applyDamage(receiverId, blockDmg, false);
            bumpState();
            summaryDmgRef.current.total += blockDmg;
            summaryDmgRef.current.color = "#60a5fa";

            if (braceResult.overkill > 0) {
                _spawnTierLabel(receiverId, "+" + braceResult.overkill + " OVERKILL", BATTLE_END.overkillColor, -20);
            }

            // Tier label
            var braceLabel = isPerfect ? "PERFECT!" : "BLOCK";
            var braceLabelColor = isPerfect ? "#ffd700" : "#60a5fa";
            _spawnTierLabel(receiverId, braceLabel, braceLabelColor, -30);

            if (braceResult.killed && isLastBeat) {
                setAnimState(function(prev) {
                    var n = Object.assign({}, prev); n[receiverId] = "ko"; return n;
                });
            }
            setFlashId(receiverId);
            setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
            if (onDone) onDone();
            return;
        }

        // --- FULL HIT (fail, wrong input, unblockable, auto_miss) ---
        comboCounterRef.current.enemyUnblocked += 1;
        var fullDmg = Math.round(beat.damage * DEFENSE_TIMING.failMult);

        if (beat.comboMultiplier != null && beat.comboMultiplier > 0) {
            var priorUnblocked = Math.max(0, comboCounterRef.current.enemyUnblocked - 1);
            if (priorUnblocked > 0) {
                fullDmg = Math.round(fullDmg * (1 + beat.comboMultiplier * priorUnblocked));
            }
        }

        var hitResult = bState.applyDamage(receiverId, fullDmg, false);
        bumpState();
        summaryDmgRef.current.total += fullDmg;
        summaryDmgRef.current.color = dmgColor;

        setFlashId(receiverId);
        BattleSFX.hit();

        var recState = bState.get(receiverId);
        var isKO = recState && recState.ko;
        if (isKO && isLastBeat) {
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); n[receiverId] = "ko"; return n;
            });
        } else {
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); n[receiverId] = "hit"; return n;
            });
            if (beat.shake) {
                setShakeLevel(null);
                requestAnimationFrame(function() { setShakeLevel(beat.shake); });
            }
        }

        if (hitResult.overkill > 0) {
            _spawnTierLabel(receiverId, "+" + hitResult.overkill + " OVERKILL", BATTLE_END.overkillColor, -20);
        }
        setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
        if (onDone) onDone();
    }

    // Helper — spawn a positioned damage/label number on a combatant
    function _spawnTierLabel(combatantId, text, color, yOffset) {
        spawnDmgAt(combatantId, text, color, yOffset);
    }

    // --- Legacy wrapper — converts old hit/inputType to tier/mult, delegates to shared ---
    function resolveHitOnReceiver(hit, beat, swinger, receiver, dmgColor, isLastBeat, inputType) {
        var tier, mult;
        if (!hit || inputType === "auto_miss") {
            tier = "fail"; mult = DEFENSE_TIMING.failMult;
        } else if (inputType === "swipe") {
            tier = "pass"; mult = DEFENSE_TIMING.dodgePassMult;
        } else {
            // tap — we don't have precise timing in the old path, treat as "good"
            tier = "good"; mult = DEFENSE_TIMING.braceGoodMult;
        }
        applyDefenseOutcome(tier, mult, inputType, beat, swinger, receiver, dmgColor, isLastBeat, null);
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
        if (!defenseActiveRef.current) return;
        if (DefenseTiming.isLocked()) return;

        var start = defenseTouchStartRef.current;
        var t = e.changedTouches[0];
        var endPt = { x: t.clientX, y: t.clientY };
        defenseTouchStartRef.current = null;

        if (!start) {
            // No start recorded — treat as tap
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
    }

    function handleSceneClick() {
        // Desktop fallback — click = tap
        if (!defenseActiveRef.current) return;
        if (DefenseTiming.isLocked()) return;
        defenseInputResolve("tap");
    }

    // defenseInputResolve is set by runDefensePlayback per-beat
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
                    runPlayback(resultsArray, skill, diff, swingerId, receiverId);
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
                runDefensePlayback(skill, swingerId, receiverId);
            }, 2000);
        }
    }

    // ============================================================
    // PLAYBACK DRIVER — Iterates results array, plays choreography
    // beat-by-beat with damage, anims, shake, SFX, damage numbers.
    // Called after Chalkboard completes (CAM_SWING_PLAYBACK phase).
    // ============================================================
    function runPlayback(resultsArray, skill, difficulty, swingerId, receiverId) {
        var beats = skill.beats || [];
        var damageMap = difficulty.damageMap || { perfect: 1.5, good: 1.0, miss: 0.0 };
        var beatIndex = 0;

        function playNextBeat() {
            if (beatIndex >= beats.length) {
                // All beats done — spawn summary (no-op V1), transition to resolve
                spawnSummaryDamage();
                finishSwing(swingerId, receiverId);
                return;
            }

            var beat = BattleSkills.resolveBeat(beats[beatIndex]);
            var result = resultsArray[beatIndex] || { tier: "miss" };
            var tier = result.tier || "miss";
            var mult = damageMap[tier] != null ? damageMap[tier] : 1.0;
            var isLastBeat = beatIndex === beats.length - 1;
            var dmgColor = "#f59e0b"; // gold for player offense

            // --- WIND-UP ---
            setAnimState(function(prev) {
                var n = Object.assign({}, prev);
                n[swingerId] = "wind_up";
                return n;
            });

            setTimeout(function() {
                if (tier === "miss") {
                    // --- WHIFF: short lunge, no damage ---
                    setAnimState(function(prev) {
                        var n = Object.assign({}, prev);
                        n[swingerId] = "strike";
                        return n;
                    });
                    if (BattleSFX.whiff) BattleSFX.whiff();
                    // Spawn per-beat MISS indicator
                    spawnDmgAt(receiverId, "MISS", "#888888");

                    setTimeout(function() {
                        // Return to idle
                        setAnimState(function(prev) {
                            var n = Object.assign({}, prev);
                            delete n[swingerId];
                            if (!isLastBeat) delete n[receiverId];
                            return n;
                        });
                        beatIndex++;
                        setTimeout(playNextBeat, 80);
                    }, CHOREOGRAPHY.strikeMs);

                } else {
                    // --- HIT: strike + damage ---
                    setTimeout(function() {
                        setAnimState(function(prev) {
                            var n = Object.assign({}, prev);
                            n[swingerId] = "strike";
                            return n;
                        });

                        // SFX
                        if (beat.sfx) BattleSFX[beat.sfx] ? BattleSFX[beat.sfx]() : BattleSFX.hit();

                        // Calculate damage
                        var baseDmg = beat.damage;
                        var finalDmg = Math.round(baseDmg * mult);

                        // Combo multiplier
                        comboCounterRef.current.playerCombo += 1;
                        var comboCount = comboCounterRef.current.playerCombo;
                        if (beat.comboMultiplier != null && beat.comboMultiplier > 0) {
                            var priorHits = Math.max(0, comboCount - 1);
                            if (priorHits > 0) {
                                finalDmg = Math.round(finalDmg * (1 + beat.comboMultiplier * priorHits));
                            }
                        }

                        // Apply damage
                        var dmgResult = bState.applyDamage(receiverId, finalDmg, true);
                        bumpState();
                        summaryDmgRef.current.total += finalDmg;
                        summaryDmgRef.current.color = dmgColor;

                        // Hit reaction on receiver
                        var recState = bState.get(receiverId);
                        var isReceiverKO = recState && recState.ko;

                        setTimeout(function() {
                            setFlashId(receiverId);
                            if (isReceiverKO && isLastBeat) {
                                setAnimState(function(prev) {
                                    var n = Object.assign({}, prev); n[receiverId] = "ko"; return n;
                                });
                            } else if (isReceiverKO) {
                                setAnimState(function(prev) {
                                    var n = Object.assign({}, prev); n[receiverId] = "hit"; return n;
                                });
                            } else if (beat.tgtReact) {
                                setAnimState(function(prev) {
                                    var n = Object.assign({}, prev); n[receiverId] = beat.tgtReact; return n;
                                });
                            }

                            // Shake — tier-upgraded for perfect
                            var shakeLevel = beat.shake;
                            if (tier === "perfect" && shakeLevel) {
                                var shakeUpgrade = { light: "medium", medium: "heavy", heavy: "ko" };
                                shakeLevel = shakeUpgrade[shakeLevel] || shakeLevel;
                            }
                            if (shakeLevel && !isReceiverKO) {
                                setShakeLevel(null);
                                requestAnimationFrame(function() { setShakeLevel(shakeLevel); });
                            }

                            // Per-beat damage number — color by tier
                            var tierColor = tier === "perfect" ? "#ffd700" : "#ffffff";
                            spawnDmgAt(receiverId, finalDmg, tierColor);

                            // Overkill
                            if (dmgResult.overkill > 0) {
                                spawnDmgAt(receiverId, "+" + dmgResult.overkill + " OVERKILL", BATTLE_END.overkillColor, -20);
                            }

                            setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
                        }, 60);

                        // Return swinger to idle, clear receiver after hit settles
                        setTimeout(function() {
                            setAnimState(function(prev) {
                                var n = Object.assign({}, prev);
                                delete n[swingerId];
                                var recState2 = bState.get(receiverId);
                                var keepAnim = recState2 && recState2.ko && isLastBeat;
                                if (!keepAnim) delete n[receiverId];
                                return n;
                            });
                            beatIndex++;
                            setTimeout(playNextBeat, 80);
                        }, CHOREOGRAPHY.strikeMs + CHOREOGRAPHY.hitMs);

                    }, CHOREOGRAPHY.strikeMs);
                }
            }, CHOREOGRAPHY.windUpMs);
        }

        // Start first beat
        playNextBeat();
    }

    // ============================================================
    // DEFENSE PLAYBACK — Enemy attacks, player defends by reading
    // choreography and tapping (brace) or swiping (dodge).
    // Per beat: telegraph → strike anchor → defense window → resolve.
    // ============================================================
    function runDefensePlayback(skill, swingerId, receiverId) {
        var beats = skill.beats || [];
        var beatIndex = 0;
        var dmgColor = "#ef4444"; // red for enemy damage on party

        function playDefenseBeat() {
            if (beatIndex >= beats.length) {
                // All beats done
                spawnSummaryDamage();
                defenseActiveRef.current = false;
                defenseInputResolveRef.current = null;
                DefenseTiming.destroy();
                finishSwing(swingerId, receiverId);
                return;
            }

            var beat = BattleSkills.resolveBeat(beats[beatIndex]);
            var isLastBeat = beatIndex === beats.length - 1;
            var beatResolved = false;

            // Reset defense timing for this beat
            DefenseTiming.resetBeat();

            // --- TELEGRAPH: enemy wind-up ---
            BattleSFX.telegraph();
            setAnimState(function(prev) {
                var n = Object.assign({}, prev);
                n[swingerId] = "telegraph";
                return n;
            });

            // Set telegraph CSS duration
            var telEl = combatantRefs.current[swingerId];
            if (telEl) {
                var choreoEl = telEl.querySelector(".normal-cam-char__choreo");
                if (choreoEl) {
                    choreoEl.style.setProperty("--telegraph-duration", CHOREOGRAPHY.telegraphMs + "ms");
                    choreoEl.classList.remove("normal-cam-char__choreo--telegraph-sync");
                    void choreoEl.offsetWidth;
                    choreoEl.classList.add("normal-cam-char__choreo--telegraph-sync");
                }
            }

            setTimeout(function() {
                // --- STRIKE: lunge forward, record anchor ---
                setAnimState(function(prev) {
                    var n = Object.assign({}, prev);
                    n[swingerId] = "strike";
                    return n;
                });

                // Record strike anchor for defense timing
                DefenseTiming.recordStrikeAnchor();

                // Play SFX
                if (beat.sfx) {
                    if (BattleSFX[beat.sfx]) BattleSFX[beat.sfx]();
                    else BattleSFX.hit();
                }

                // Set up per-beat defense input callback
                defenseInputResolveRef.current = function(result, inputType) {
                    if (beatResolved) return;
                    beatResolved = true;
                    resolveDefenseBeatResult(result, inputType, beat, swingerId, receiverId, dmgColor, isLastBeat);
                };

                // Defense window timeout — if no input, auto-fail
                var windowMs = Math.max(
                    DEFENSE_TIMING.braceGoodMs,
                    DEFENSE_TIMING.dodgePassMs
                );
                setTimeout(function() {
                    if (beatResolved) return;
                    beatResolved = true;
                    var failResult = DefenseTiming.checkNoInput();
                    resolveDefenseBeatResult(
                        failResult || { tier: "fail", mult: DEFENSE_TIMING.failMult },
                        "auto_miss", beat, swingerId, receiverId, dmgColor, isLastBeat
                    );
                }, windowMs + 50); // small buffer past the window edge

            }, CHOREOGRAPHY.telegraphMs);

            // --- After beat resolves, advance to next ---
            function resolveDefenseBeatResult(result, inputType, bt, sw, rec, color, last) {
                applyDefenseOutcome(result.tier, result.mult, inputType, bt, sw, rec, color, last, advanceBeat);
            }

            function advanceBeat() {
                // Clear anims after settling, advance
                setTimeout(function() {
                    var recState = bState.get(receiverId);
                    var keepKO = recState && recState.ko && (beatIndex === beats.length - 1);
                    setAnimState(function(prev) {
                        var n = Object.assign({}, prev);
                        delete n[swingerId];
                        if (!keepKO) delete n[receiverId];
                        return n;
                    });
                    beatIndex++;
                    setTimeout(playDefenseBeat, 80);
                }, CHOREOGRAPHY.hitMs);
            }
        }

        // Start first beat
        playDefenseBeat();
    }

    // ============================================================
    // FINISH SWING — shared post-combo cleanup for both paths
    // ============================================================
    function finishSwing(swingerId, receiverId) {
        console.log("[CAM-ID] finishSwing swinger=" + swingerId + " receiver=" + receiverId);
        var cam = camExchangeRef.current;
        if (cam) cam.swingCount += 1;

        setPhase(PHASES.CAM_RESOLVE);
        playbackResultsRef.current = null;
        defenseActiveRef.current = false;
        defenseInputResolveRef.current = null;

        // --- Post-combo: check if anyone died during this swing ---
        var receiverState = bState.get(receiverId);
        var anyKO = receiverState && receiverState.ko;

        // Clean up anim states — preserve KO poses
        setAnimState(function(prev) {
            var n = Object.assign({}, prev);
            var sState = bState.get(swingerId);
            if (!sState || !sState.ko) delete n[swingerId];
            if (!receiverState || !receiverState.ko) delete n[receiverId];
            return n;
        });

        // Play KO SFX + shake if someone died during this combo
        if (anyKO) {
            if (BattleSFX.ko) BattleSFX.ko();
            setShakeLevel(null);
            requestAnimationFrame(function() { setShakeLevel("ko"); });
        }

        setTimeout(function() {
            advanceOrCamOut();
        }, EXCHANGE.resolveHoldMs);
    }

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

            // Auto-select first living enemy in new wave
            setTargetId(nextEnemies[0].id);
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
                // Auto-select first living enemy
                var picked = pickFirstLivingEnemy();
                if (picked) setTargetId(picked);
                return; // don't fire — player must press ATK again
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
    function pickFirstLivingEnemy() {
        for (var i = 0; i < currentEnemiesRef.current.length; i++) {
            var s = bState.get(currentEnemiesRef.current[i].id);
            if (s && !s.ko) return currentEnemiesRef.current[i].id;
        }
        return null;
    }

    function pickFirstLivingAlly() {
        for (var i = 0; i < TEST_PARTY.length; i++) {
            var s = bState.get(TEST_PARTY[i].id);
            if (s && !s.ko) return TEST_PARTY[i].id;
        }
        return null;
    }

    function pickRandomLivingPartyMember() {
        var living = [];
        for (var i = 0; i < TEST_PARTY.length; i++) {
            var s = bState.get(TEST_PARTY[i].id);
            if (s && !s.ko) living.push(TEST_PARTY[i].id);
        }
        if (living.length === 0) return null;
        return living[Math.floor(Math.random() * living.length)];
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
                    var picked = pickFirstLivingEnemy();
                    if (picked) setTargetId(picked);
                    setItemMenuOpen(false);
                    return; // don't fire — selection updated, player retries
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
    var stageCls = "battle-stage" + (shakeLevel ? " battle-stage--shake-" + shakeLevel : "");
    var stageStyle = {
        width: STAGE.designW + "px",
        height: STAGE.designH + "px",
        transform: "translate(-50%, -50%) scale(" + stageScale + ")",
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
                            onClick={function() { if (!isActionCam) setTargetId(e.id); }}
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
                            onClick={function() { if (!isActionCam) setTargetId(p.id); }}
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