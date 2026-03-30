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
import BattleCharacterModule from "./BattleCharacter.js";
import BattleResultsScreen from "./BattleResultsScreen.js";
import DevControls from "./DevControls.js";
import ATBGaugeStrip from "./ATBGaugeStrip.js";
import ActionMenu from "./ActionMenu.js";
import ItemSubmenu from "./ItemSubmenu.js";
import QTEZone from "./QTEZone.js";
import ComicPanel from "./ComicPanel.js";
import ActionCamInfoPanel from "./ActionCamInfoPanel.js";
import "./BattleView.css";

var QTERunner = QTERunnerModule.QTERunner;
var BattleCharacter = BattleCharacterModule.BattleCharacter;
var DamageNumber = BattleCharacterModule.DamageNumber;

var PHASES = BattleConstants.BATTLE_PHASES;
var ACTION_CAM = BattleConstants.ACTION_CAM;
var EXCHANGE = BattleConstants.EXCHANGE;
var LAYOUT = BattleConstants.LAYOUT;
var BATTLE_SPRITES = BattleConstants.BATTLE_SPRITES;
var CHOREOGRAPHY = BattleConstants.CHOREOGRAPHY;
var TEST_PARTY = BattleConstants.TEST_PARTY;
var TEST_ENEMIES = BattleConstants.TEST_ENEMIES;
var DEFEND_BUFF = BattleConstants.DEFEND_BUFF;
var FLEE = BattleConstants.FLEE;
var BATTLE_END = BattleConstants.BATTLE_END;
var COMBO = BattleConstants.COMBO;

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
    var [animState, setAnimState] = useState({});
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

    // --- Battle State (mutable combatant data: HP, items, KO, buffs) ---
    var battleStateRef = useRef(null);
    if (!battleStateRef.current) {
        battleStateRef.current = BattleStateModule.createBattleState(TEST_PARTY, TEST_ENEMIES);
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

    // --- Item submenu state ---
    // context: "formation" (out of cam) or "in-cam" (during exchange)
    var [itemMenuOpen, setItemMenuOpen] = useState(false);
    var itemMenuContextRef = useRef("formation");
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
                    // Target random living party member
                    var enemyTgt = pickRandomLivingPartyMember();
                    if (!enemyTgt) { rafId = requestAnimationFrame(tick); return; } // all dead, ATB keeps ticking until wipe caught
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
        .concat(TEST_ENEMIES.map(function(c) { return combatantMap[c.id]; }));

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

    // ============================================================
    // DEV HANDLERS
    // ============================================================
    function handleDevToggleATB() { setAtbRunning(function(v) { return !v; }); }
    function handleDevFillPips() {
        setAtbValues(function(prev) { return BattleATB.fillAll(prev, attackerId); });
    }
    function handleDevReset() {
        // Re-create battle state from scratch
        battleStateRef.current = BattleStateModule.createBattleState(TEST_PARTY, TEST_ENEMIES);
        bumpState();
        // Reset all transient UI state
        setPhase(PHASES.ATB_RUNNING);
        setAtbRunning(false);
        setAtbValues(BattleATB.initState(TEST_PARTY.concat(TEST_ENEMIES)));
        setTargetId(TEST_ENEMIES[0].id);
        setTurnOwnerId(null);
        setAnimState({});
        setShakeLevel(null);
        setFlashId(null);
        setDamageNumbers([]);
        setQteConfig(null);
        setItemMenuOpen(false);
        setBattleResult(null);
        camExchangeRef.current = null;
        comboCounterRef.current = { playerCombo: 0, enemyUnblocked: 0 };
        summaryDmgRef.current = { total: 0, color: "#f59e0b", receiverId: null };
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
        var sum = summaryDmgRef.current;
        if (sum.total <= 0 || !sum.receiverId) return;
        var el = combatantRefs.current[sum.receiverId];
        var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
        if (el && sr) {
            var r = el.getBoundingClientRect();
            spawnDamageNumber(sum.total, r.left - sr.left + r.width / 2, r.top - sr.top, sum.color);
        }
    }

    function handleQTERingResult(index, hit, inputType) {
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
                    // Spawn summary + combo counter on last beat only
                    if (isLastBeat) {
                        spawnSummaryDamage();
                        if (comboCount > 1) {
                            var elR = combatantRefs.current[receiver];
                            var srR = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                            if (elR && srR) {
                                var rR = elR.getBoundingClientRect();
                                spawnDamageNumber("\u00d7" + comboCount, rR.left - srR.left + rR.width / 2, rR.top - srR.top + COMBO.counterOffsetY, COMBO.counterColor);
                            }
                        }
                    }
                    // Overkill number (still per-beat — overkill is a moment, not a summary)
                    if (dmgResult.overkill > 0) {
                        var elO = combatantRefs.current[receiver];
                        var srO = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                        if (elO && srO) {
                            var rO = elO.getBoundingClientRect();
                            spawnDamageNumber("+" + dmgResult.overkill + " OVERKILL", rO.left - srO.left + rO.width / 2, rO.top - srO.top - 20, BATTLE_END.overkillColor);
                        }
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
                        var el2 = combatantRefs.current[receiver];
                        var sr3 = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                        if (el2 && sr3) {
                            var r3 = el2.getBoundingClientRect();
                            spawnDamageNumber("MISS", r3.left - sr3.left + r3.width / 2, r3.top - sr3.top, "#888888");
                        }
                    }
                }
            }
        }
    }

    function resolveHitOnReceiver(hit, beat, swinger, receiver, dmgColor, isLastBeat, inputType) {
        // KO guard — if receiver already dead, skip brace/dodge, apply overkill damage
        var recCheck = bState.get(receiver);
        if (recCheck && recCheck.ko) {
            comboCounterRef.current.enemyUnblocked += 1;
            var ctx = qteContextRef.current;
            var fromParty = ctx && ctx.swingerId ? isPartyId(ctx.swingerId) : false;
            var baseDmg = beat.damage;
            var finalDmg = baseDmg;
            if (beat.comboMultiplier != null && beat.comboMultiplier > 0) {
                var priorUnblocked = Math.max(0, comboCounterRef.current.enemyUnblocked - 1);
                if (priorUnblocked > 0) {
                    finalDmg = Math.round(baseDmg * (1 + beat.comboMultiplier * priorUnblocked));
                }
            }
            var dmgResult = bState.applyDamage(receiver, finalDmg, fromParty);
            bumpState();
            // Accumulate for summary
            summaryDmgRef.current.total += finalDmg;
            summaryDmgRef.current.color = dmgColor;
            setFlashId(receiver);
            // Last beat = KO react, otherwise hit react
            setAnimState(function(prev) {
                var n = Object.assign({}, prev);
                n[receiver] = isLastBeat ? "ko" : "hit";
                return n;
            });
            if (dmgResult.overkill > 0) {
                var el = combatantRefs.current[receiver];
                var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                if (el && sr) {
                    var r = el.getBoundingClientRect();
                    spawnDamageNumber("+" + dmgResult.overkill + " OVERKILL", r.left - sr.left + r.width / 2, r.top - sr.top - 20, BATTLE_END.overkillColor);
                }
            }
            setTimeout(function() { setFlashId(null); }, CHOREOGRAPHY.flashMs);
            return;
        }

        // --- Defense decision matrix ---
        // hit=true means player acted in the QTE window.
        // inputType tells us HOW they acted: "tap", "swipe", or "auto_miss"
        //
        // swipe + dodgeable        → DODGE  (0 damage)
        // tap   + blockable        → BRACE  (×0.25 damage)
        // tap   + unblockable      → FULL HIT (can't block this)
        // swipe + !dodgeable       → FULL HIT (can't dodge this)
        // auto_miss                → FULL HIT
        // !hit (missed window)     → FULL HIT

        if (hit && inputType === "swipe" && beat.dodgeable !== false) {
            // --- DODGE --- zero damage, fast lateral shift
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); n[receiver] = "dodge"; return n;
            });
            BattleSFX.block(); // reuse block SFX for now
            // Accumulate 0 for summary (dodge = no damage taken)
            summaryDmgRef.current.color = "#4ade80";
        } else if (hit && inputType === "tap" && beat.blockable !== false) {
            // --- BRACE --- reduced damage ×0.25
            var blockDmg = Math.round(beat.damage * 0.25);
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); n[receiver] = "brace"; return n;
            });
            BattleSFX.block();
            var ctx2 = qteContextRef.current;
            var fromParty2 = ctx2 && ctx2.swingerId ? isPartyId(ctx2.swingerId) : false;
            var dmgResult2 = bState.applyDamage(receiver, blockDmg, fromParty2);
            bumpState();
            // Accumulate for summary
            summaryDmgRef.current.total += blockDmg;
            summaryDmgRef.current.color = "#60a5fa";
            if (dmgResult2.overkill > 0) {
                var el2 = combatantRefs.current[receiver];
                var sr4 = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
                if (el2 && sr4) {
                    var r4 = el2.getBoundingClientRect();
                    spawnDamageNumber("+" + dmgResult2.overkill + " OVERKILL", r4.left - sr4.left + r4.width / 2, r4.top - sr4.top - 20, BATTLE_END.overkillColor);
                }
            }
            // Brace kill — last beat shows KO, otherwise stays in brace
            if (dmgResult2.killed && isLastBeat) {
                setAnimState(function(prev) {
                    var n = Object.assign({}, prev); n[receiver] = "ko"; return n;
                });
            }
        } else {
            // --- FULL HIT --- missed, wrong input for this beat, or auto_miss
            comboCounterRef.current.enemyUnblocked += 1;
            applyFullHit(beat, receiver, dmgColor, isLastBeat);
        }
    }

    function applyFullHit(beat, receiver, dmgColor, isLastBeat) {
        // Compute final damage — apply comboMultiplier if present
        var baseDmg = beat.damage;
        var finalDmg = baseDmg;
        if (beat.comboMultiplier != null && beat.comboMultiplier > 0) {
            var unblockedCount = comboCounterRef.current.enemyUnblocked;
            var priorUnblocked = Math.max(0, unblockedCount - 1);
            if (priorUnblocked > 0) {
                finalDmg = Math.round(baseDmg * (1 + beat.comboMultiplier * priorUnblocked));
            }
        }

        // Apply damage to mutable state first
        var ctx = qteContextRef.current;
        var fromParty = ctx && ctx.swingerId ? isPartyId(ctx.swingerId) : false;
        var dmgResult = bState.applyDamage(receiver, finalDmg, fromParty);
        bumpState();
        // Accumulate for summary
        summaryDmgRef.current.total += finalDmg;
        summaryDmgRef.current.color = dmgColor;

        setFlashId(receiver);

        // Last beat + killed (now or earlier) = KO react, otherwise hit react
        var recState = bState.get(receiver);
        var isReceiverKO = recState && recState.ko;
        if (isReceiverKO && isLastBeat) {
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); n[receiver] = "ko"; return n;
            });
        } else {
            setAnimState(function(prev) {
                var n = Object.assign({}, prev); n[receiver] = "hit"; return n;
            });
            if (beat.shake) {
                setShakeLevel(null);
                requestAnimationFrame(function() { setShakeLevel(beat.shake); });
            }
        }

        // Overkill still spawns per-beat (it's a moment, not a summary)
        if (dmgResult.overkill > 0) {
            var el = combatantRefs.current[receiver];
            var sr5 = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
            if (el && sr5) {
                var r5 = el.getBoundingClientRect();
                spawnDamageNumber("+" + dmgResult.overkill + " OVERKILL", r5.left - sr5.left + r5.width / 2, r5.top - sr5.top - 20, BATTLE_END.overkillColor);
            }
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

        // Deduct 1 pip from swinger
        setAtbValues(function(prev) {
            var entry = prev[swingerId];
            if (!entry || entry.filledPips <= 0) return prev;
            var next = {};
            for (var key in prev) {
                if (prev.hasOwnProperty(key)) {
                    next[key] = key === swingerId
                        ? { filledPips: entry.filledPips - 1, currentFill: 0 }
                        : prev[key];
                }
            }
            return next;
        });

        var swingerData = combatantMap[swingerId];
        var skill = BattleSkills.getSkill(swingerData && swingerData.skills ? swingerData.skills[0] : null);

        if (!skill) {
            console.warn("[BattleView] No skill for " + swingerId + ", skipping");
            advanceOrCamOut();
            return;
        }

        doCamSwing(swingerId, receiverId, skill);
    }

    function doCamSwing(swingerId, receiverId, skill) {
        setPhase(PHASES.CAM_SWING);

        // Reset combo counters for this swing sequence
        var swingerIsPlayer = isPartyId(swingerId);
        if (swingerIsPlayer) {
            comboCounterRef.current.playerCombo = 0;
        } else {
            comboCounterRef.current.enemyUnblocked = 0;
        }
        summaryDmgRef.current = { total: 0, color: "#f59e0b", receiverId: receiverId };

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

        var qteSkill = beatVisuals ? Object.assign({}, skill, { beatVisuals: beatVisuals }) : skill;

        activateQTE(qteSkill, function onQTEDone(result) {
            var cam = camExchangeRef.current;
            if (cam) cam.swingCount += 1;

            setPhase(PHASES.CAM_RESOLVE);

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
        }, { swingerId: swingerId, receiverId: receiverId, skill: skill });
    }

    function advanceOrCamOut() {
        // --- POST-COMBO WIPE CHECK ---
        if (bState.isEnemyWiped() || bState.isPartyWiped()) {
            var outcome = bState.isEnemyWiped() ? "victory" : "ko";
            triggerBattleEnd(outcome);
            return;
        }

        var cam = camExchangeRef.current;
        if (!cam) { camOut(); return; }

        // Swap to other side's turn
        var nextSwinger = cam.currentReceiverId;
        var nextReceiver = cam.currentSwingerId;
        cam.currentSwingerId = nextSwinger;
        cam.currentReceiverId = nextReceiver;

        // If next swinger is KO'd, they can't act — cam out
        var nextSwingerState = bState.get(nextSwinger);
        if (nextSwingerState && nextSwingerState.ko) {
            camOut();
            return;
        }

        // Check if next swinger has pips — if not, cam out
        var nextPips = atbValuesRef.current[nextSwinger];
        if (!nextPips || nextPips.filledPips <= 0) {
            camOut();
        } else {
            setPhase(PHASES.CAM_WAIT_ACTION);
        }
    }

    // RELENT — initiator forfeits remaining turns, exits action cam (free)
    function handleCamRelent() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;
        camOut();
    }

    // PASS — responder gives up their turn, control returns to initiator
    function handleCamPass() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;

        // Swap back to initiator
        var nextSwinger = cam.currentReceiverId;
        var nextReceiver = cam.currentSwingerId;
        cam.currentSwingerId = nextSwinger;
        cam.currentReceiverId = nextReceiver;

        // Check if initiator has pips
        var initPips = atbValuesRef.current[nextSwinger];
        if (!initPips || initPips.filledPips <= 0) {
            camOut();
        } else {
            setPhase(PHASES.CAM_WAIT_ACTION);
        }
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

            var checkCombatants = TEST_PARTY.concat(TEST_ENEMIES);
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
                    // Target random living party member
                    var enemyTgt2 = pickRandomLivingPartyMember();
                    if (enemyTgt2) {
                        setTargetId(enemyTgt2);
                        setPhase(PHASES.ATB_RUNNING);
                        startExchange(alreadyReady, enemyTgt2);
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
    // RESULTS — Continue button exits battle
    // ============================================================
    function handleResultsContinue() {
        if (onExit) onExit(battleResult);
    }

    function handleAction(actionId) {
        var userId = turnOwnerId || attackerId;

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
        for (var i = 0; i < TEST_ENEMIES.length; i++) {
            var s = bState.get(TEST_ENEMIES[i].id);
            if (s && !s.ko) return TEST_ENEMIES[i].id;
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
        var el = combatantRefs.current[userId];
        var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
        if (el && sr) {
            var r = el.getBoundingClientRect();
            spawnDamageNumber("DEF UP", r.left - sr.left + r.width / 2, r.top - sr.top, "#4ade80");
        }

        // Post-use flow
        if (context === "in-cam") {
            var cam = camExchangeRef.current;
            if (cam) {
                var nextSwinger = cam.currentReceiverId;
                var nextReceiver = cam.currentSwingerId;
                cam.currentSwingerId = nextSwinger;
                cam.currentReceiverId = nextReceiver;

                var nextPips = atbValuesRef.current[nextSwinger];
                if (!nextPips || nextPips.filledPips <= 0) {
                    camOut();
                } else {
                    setPhase(PHASES.CAM_WAIT_ACTION);
                }
            }
        } else {
            var remaining = atbValuesRef.current[userId];
            if (!remaining || remaining.filledPips <= 0) {
                setTurnOwnerId(null);
                setPhase(PHASES.ATB_RUNNING);
                setAtbRunning(true);
            }
        }
    }

    // In-cam DEF button handler
    function handleCamDefend() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;
        handleDefend(cam.currentSwingerId, "in-cam");
    }

    // ============================================================
    // FLEE — formation only, costs ALL 3 pips (entire turn)
    // Roll chance. Success = exit. Fail = turn over.
    // ============================================================
    function handleFlee(userId) {
        // Drain all pips
        var prev = atbValuesRef.current;
        var next = {};
        for (var key in prev) {
            if (prev.hasOwnProperty(key)) {
                next[key] = key === userId
                    ? { filledPips: 0, currentFill: 0 }
                    : prev[key];
            }
        }
        atbValuesRef.current = next;
        setAtbValues(next);

        var roll = Math.random();
        if (roll < FLEE.baseChance) {
            // Success
            var el = combatantRefs.current[userId];
            var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
            if (el && sr) {
                var r = el.getBoundingClientRect();
                spawnDamageNumber("FLED!", r.left - sr.left + r.width / 2, r.top - sr.top, "#4ade80");
            }
            setTimeout(function() {
                triggerBattleEnd("fled");
            }, 400);
        } else {
            // Fail — turn is over (all pips spent)
            var el2 = combatantRefs.current[userId];
            var sr2 = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
            if (el2 && sr2) {
                var r2 = el2.getBoundingClientRect();
                spawnDamageNumber("FAIL", r2.left - sr2.left + r2.width / 2, r2.top - sr2.top, "#ef4444");
            }
            setTurnOwnerId(null);
            setPhase(PHASES.ATB_RUNNING);
            setAtbRunning(true);
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

    function handleItemUse(itemId) {
        var context = itemMenuContextRef.current;
        var userId = context === "in-cam"
            ? (camExchangeRef.current ? camExchangeRef.current.currentSwingerId : null)
            : (turnOwnerId || attackerId);

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
                effectTarget = camExchangeRef.current.currentReceiverId;
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

        var el = combatantRefs.current[result.targetId];
        var sr = sceneRef.current ? sceneRef.current.getBoundingClientRect() : null;
        if (el && sr) {
            var r = el.getBoundingClientRect();
            spawnDamageNumber(feedbackText, r.left - sr.left + r.width / 2, r.top - sr.top, feedbackColor);
        }

        // Close submenu
        setItemMenuOpen(false);
        bumpState();

        // Post-use flow depends on context
        if (context === "in-cam") {
            // In-cam: swap sides or cam out if no pips
            var cam = camExchangeRef.current;
            if (cam) {
                var nextSwinger = cam.currentReceiverId;
                var nextReceiver = cam.currentSwingerId;
                cam.currentSwingerId = nextSwinger;
                cam.currentReceiverId = nextReceiver;

                var nextPips = atbValuesRef.current[nextSwinger];
                if (!nextPips || nextPips.filledPips <= 0) {
                    camOut();
                } else {
                    setPhase(PHASES.CAM_WAIT_ACTION);
                }
            }
        } else {
            // Formation: check remaining pips — if 0, end turn
            var remaining = atbValuesRef.current[userId];
            if (!remaining || remaining.filledPips <= 0) {
                setTurnOwnerId(null);
                setPhase(PHASES.ATB_RUNNING);
                setAtbRunning(true);
            }
            // else stay in ACTION_SELECT, player can chain more actions
        }
    }

    function handleItemClose() {
        setItemMenuOpen(false);
    }

    // In-cam ITEM button handler
    function handleCamItem() {
        var cam = camExchangeRef.current;
        if (!cam) return;
        if (phase !== PHASES.CAM_WAIT_ACTION) return;
        itemMenuContextRef.current = "in-cam";
        setItemMenuOpen(true);
    }

    // ============================================================
    // IN-CAM BUTTON STATE — Initiator vs Responder
    // Initiator: ATK + RELENT. Responder: ATK + PASS.
    // ============================================================
    var camWaiting = phase === PHASES.CAM_WAIT_ACTION;
    var cam = camExchangeRef.current;
    var camSwingerId = cam ? cam.currentSwingerId : null;
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
                                data={combatantMap[p.id] || p}
                                isParty={true}
                                phase={phase}
                                attackerId={activeAtkId}
                                targetId={targetId}
                                selectedId={targetId}
                                turnOwnerId={turnOwnerId}
                                sceneRect={isActionCam ? sceneRect : null}
                                restingRects={restingRectsRef.current}
                                setRef={makeRefSetter(p.id)}
                                onClick={function() { setTargetId(p.id); }}
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
                            onClick={handleCamATK}
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

                {/* Item submenu — overlays action menu zone */}
                <ItemSubmenu
                    visible={itemMenuOpen}
                    items={itemMenuOpen ? (function() {
                        var uid = itemMenuContextRef.current === "in-cam"
                            ? (camExchangeRef.current ? camExchangeRef.current.currentSwingerId : null)
                            : (turnOwnerId || attackerId);
                        var c = uid ? bState.get(uid) : null;
                        return c ? c.items : [];
                    })() : []}
                    onUse={handleItemUse}
                    onClose={handleItemClose}
                    isInCam={itemMenuContextRef.current === "in-cam"}
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