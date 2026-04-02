// ============================================================
// battleDirector.js — Battle GameMode / Director
//
// The single authority for "what happens next" in combat.
// Owns: sequencer, turn order, AP state, exchange lifecycle,
//       AI calls, win/loss, wave transitions.
//
// Does NOT own: rendering, visual state, input capture, bus
//   subscriptions for visual events, choreography, defense
//   input handling. Those stay in BattleView.
//
// Pure JS — no React imports. Talks to BattleView through
// a bridge object (bag of callbacks passed on creation).
//
// UE Analogy: GameMode + PlayerController brain.
//
// Usage:
//   var director = createBattleDirector(bridge, config);
//   director.start();               // player presses Start
//   director.onPlayerAction(...);   // player picks an action
//   director.getApState();          // view reads for rendering
//   director.destroy();             // cleanup on unmount
//
// ============================================================

import BattleConstants from "../config/battleConstants.js";

var PHASES         = BattleConstants.BATTLE_PHASES;
var ENGAGEMENT     = BattleConstants.ENGAGEMENT;
var ACTION_CAM     = BattleConstants.ACTION_CAM;
var EXCHANGE       = BattleConstants.EXCHANGE;
var CHOREOGRAPHY   = BattleConstants.CHOREOGRAPHY;
var DEFENSE_TIMING = BattleConstants.DEFENSE_TIMING;
var BATTLE_END     = BattleConstants.BATTLE_END;
var WAVE_TRANSITION = BattleConstants.WAVE_TRANSITION;

// ============================================================
// Timing — director-owned delays (tunable here, move to
// battleConstants.js once values are playtested)
// ============================================================
var DIRECTOR_TIMING = {
    skillNameHoldMs:    2000,   // show skill name before swing starts
    breathingPauseMs:   400,    // gap between turns for readability
    wavePauseMs:        600,    // extra pause after wave banner clears
    counterDelayMs:     300,    // brief beat before counter swing
};

// ============================================================
// Sequencer — private step-queue runner
//
// A queue of functions. Each receives done(). Call done() to
// advance. Nothing runs until the previous step finishes.
//
// enqueue(step)     — add to end
// prepend(steps[])  — insert array at front (for counter inject)
// start()           — kick off the queue
// clear()           — empty the queue (current step still finishes)
// ============================================================
function createSequencer() {
    var queue = [];

    function runNext() {
        if (queue.length === 0) return;
        var step = queue.shift();
        step(function done() { runNext(); });
    }

    return {
        enqueue: function(step) { queue.push(step); },
        prepend: function(steps) { queue = steps.concat(queue); },
        start:   function() { runNext(); },
        clear:   function() { queue = []; },
    };
}

// ============================================================
// BattleDirector
// ============================================================
function createBattleDirector(bridge, config) {

    // --- Unpack config (systems + data) ---
    var party             = config.party;          // array of party combatant configs
    var waves             = config.waves;          // array of enemy arrays per wave
    var bState            = config.bState;         // mutable battle state (HP, items, KO, buffs)
    var bus               = config.bus;            // battle bus (for playback visual events only)
    var BattleEngagement  = config.BattleEngagement;
    var BattleAI          = config.BattleAI;
    var BattleSkills      = config.BattleSkills;
    var BattleSFX         = config.BattleSFX;
    var DefenseTiming     = config.DefenseTiming;
    var PlaybackManager   = config.PlaybackManager;
    var ChalkboardModule  = config.ChalkboardModule;

    // --- Sequencer (private) ---
    var seq = createSequencer();

    // --- Internal state ---
    var apState         = {};       // { [id]: { current, max } }
    var turnOrder       = [];       // [id, id, ...] initiative sequence
    var turnIndex       = -1;       // position in turnOrder
    var waveIndex       = 0;        // current wave
    var currentTurnId   = null;     // whose turn it is
    var currentEnemies  = waves[0] || [];
    var destroyed       = false;

    // Player input gates — stored resolve callbacks
    var pendingPlayerDone    = null; // formation wait step
    var pendingCounterDone   = null; // counter prompt step

    // Per-swing tracking (reset each swing)
    var comboCounter = { playerCombo: 0, enemyUnblocked: 0 };
    var summaryDmg   = { total: 0, color: "#f59e0b", receiverId: null };

    // ============================================================
    // HELPERS
    // ============================================================

    function isPlayerCombatant(id) {
        return bState.isPartyId(id);
    }

    function getAllCombatants() {
        return party.concat(currentEnemies);
    }

    // Look up static combatant config (skills, speed, name)
    // from party or current enemies array.
    function getCombatantConfig(id) {
        var all = getAllCombatants();
        for (var i = 0; i < all.length; i++) {
            if (all[i].id === id) return all[i];
        }
        return null;
    }

    // ============================================================
    // AP MANAGEMENT
    // (Director owns AP state directly — no stale ref problem)
    // ============================================================

    function earnAP(id) {
        var cfg = getCombatantConfig(id);
        var speed = cfg ? cfg.speed : 1;
        apState = BattleEngagement.earnAP(apState, id, speed, ENGAGEMENT);
        bridge.onAPChanged(apState);
    }

    function spendAP(id, cost) {
        apState = BattleEngagement.spendAP(apState, id, cost);
        bridge.onAPChanged(apState);
    }

    function canAfford(id, cost) {
        return BattleEngagement.canAfford(apState, id, cost);
    }

    function getAP(id) {
        return BattleEngagement.getAP(apState, id);
    }

    // ============================================================
    // WIPE CHECK
    // Returns: "ko" | "victory" | "waveComplete" | null
    // ============================================================

    function checkWipe() {
        if (bState.isPartyWiped()) return "ko";
        if (bState.isEnemyWiped()) {
            if (waveIndex < waves.length - 1) return "waveComplete";
            return "victory";
        }
        return null;
    }

    // ============================================================
    // TURN ADVANCEMENT
    // ============================================================

    function advanceToNextTurn() {
        var nextIdx = BattleEngagement.advanceTurn(
            turnOrder, turnIndex,
            function(id) {
                var s = bState.get(id);
                return !s || !s.ko;
            }
        );

        if (nextIdx === -1) {
            // Everyone dead — shouldn't happen (wipe check should catch first)
            return;
        }

        turnIndex = nextIdx;
        currentTurnId = turnOrder[turnIndex];
        enqueueTurn(currentTurnId);
    }

    // ============================================================
    // TURN ROUTING
    // ============================================================

    function enqueueTurn(id) {
        if (destroyed) return;

        var isPlayer = isPlayerCombatant(id);

        // --- Earn AP ---
        seq.enqueue(function(done) {
            earnAP(id);
            done();
        });

        // --- Clear defend buffs from last round ---
        seq.enqueue(function(done) {
            bState.clearDefendBuffs(id);
            done();
        });

        if (isPlayer) {
            enqueuePlayerTurn(id);
        } else {
            enqueueEnemyTurn(id);
        }
    }

    // ============================================================
    // PLAYER TURN
    //
    // Sets phase to TURN_ACTIVE and waits. Player acts via
    // director.onPlayerAction(). Can chain formation actions
    // (defend, item) until they commit (attack, flee, wait)
    // or run out of AP.
    // ============================================================

    function enqueuePlayerTurn(id) {
        // Show formation UI
        seq.enqueue(function(done) {
            currentTurnId = id;
            bridge.setTurnOwnerId(id);
            bridge.setPhase(PHASES.TURN_ACTIVE);
            done();
        });

        // Wait for player input
        enqueuePlayerWait();
    }

    function enqueuePlayerWait() {
        seq.enqueue(function(done) {
            // Park here. onPlayerAction() will call done.
            pendingPlayerDone = done;
        });
    }

    // Called by BattleView when player picks a formation action.
    function processPlayerAction(actionId, skillId, targetId) {
        if (!pendingPlayerDone) return;

        var done = pendingPlayerDone;
        pendingPlayerDone = null;
        var id = currentTurnId;

        if (actionId === "wait") {
            // Free — end turn, keep AP
            seq.enqueue(function(d) { advanceToNextTurn(); d(); });
            done();
            return;
        }

        if (actionId === "defend") {
            var defCost = ENGAGEMENT.AP_COST_DEFEND;
            if (!canAfford(id, defCost)) { rejectAction(done); return; }
            spendAP(id, defCost);
            bState.applyDefendBuff(id);
            bridge.spawnDamageNumber(id, "DEF+", "#4ade80");
            bridge.bumpState();
            maybeChainOrAdvance(id, done);
            return;
        }

        if (actionId === "item") {
            var itemCost = ENGAGEMENT.AP_COST_ITEM;
            if (!canAfford(id, itemCost)) { rejectAction(done); return; }
            // Item application is handled by BattleView (it knows which
            // item, target resolution, inventory UI). Director just
            // validates AP. BattleView calls onPlayerItemUsed() after.
            bridge.openItemMenu(id, itemCost);
            // Re-park — wait for item completion or cancel
            pendingPlayerDone = done;
            return;
        }

        if (actionId === "flee") {
            var fleeCost = ENGAGEMENT.AP_COST_FLEE;
            if (!canAfford(id, fleeCost)) { rejectAction(done); return; }
            spendAP(id, fleeCost);
            var success = Math.random() < ENGAGEMENT.FLEE_BASE_CHANCE;
            if (success) {
                seq.enqueue(function(d) { enqueueBattleEnd("fled"); d(); });
            } else {
                bridge.spawnDamageNumber(id, "FAIL", "#ef4444");
                // Turn over on failed flee
                seq.enqueue(function(d) { advanceToNextTurn(); d(); });
            }
            done();
            return;
        }

        if (actionId === "attack") {
            // Validate skill + AP
            var skill = BattleSkills.getSkill(skillId);
            if (!skill) { rejectAction(done); return; }
            var apCost = skill.apCost || 25;
            if (!canAfford(id, apCost)) {
                bridge.spawnDamageNumber(id, "NO AP", "#ef4444");
                pendingPlayerDone = done; // re-park, let player pick again
                return;
            }
            // Validate target
            var tgt = bState.get(targetId);
            if (!tgt || tgt.ko) { rejectAction(done); return; }

            spendAP(id, apCost);
            enqueueExchange(id, targetId, skill);
            // After exchange, advance to next turn
            seq.enqueue(function(d) { advanceToNextTurn(); d(); });
            done();
            return;
        }

        // Unknown action — re-park
        pendingPlayerDone = done;
    }

    // Player can't afford or invalid — re-park and wait
    function rejectAction(done) {
        BattleSFX.invalid();
        pendingPlayerDone = done;
    }

    // After a non-committing action: if AP remains, wait again.
    // If 0 AP, end turn.
    function maybeChainOrAdvance(id, done) {
        if (getAP(id) > 0) {
            enqueuePlayerWait();
        } else {
            seq.enqueue(function(d) { advanceToNextTurn(); d(); });
        }
        done();
    }

    // Called by BattleView after an item is used (or cancelled).
    function onPlayerItemUsed(success) {
        if (!pendingPlayerDone) return;

        var done = pendingPlayerDone;
        pendingPlayerDone = null;
        var id = currentTurnId;

        if (success) {
            spendAP(id, ENGAGEMENT.AP_COST_ITEM);
            bridge.bumpState();
        }
        maybeChainOrAdvance(id, done);
    }

    // ============================================================
    // ENEMY TURN
    //
    // Fully automatic. Earn AP → AI picks action → exchange.
    // No waiting, no input — just sequenced steps.
    // ============================================================

    function enqueueEnemyTurn(id) {
        seq.enqueue(function(done) {
            currentTurnId = id;
            bridge.setTurnOwnerId(id);

            // AI decision — reads director's own apState (never stale)
            var combatantData = bState.get(id);
            var aiDecision = BattleAI.pickAction(
                combatantData, bState, apState, BattleSkills.getSkill
            );

            if (!aiDecision) {
                // Can't act — skip to next turn
                seq.enqueue(function(d) { advanceToNextTurn(); d(); });
                done();
                return;
            }

            var skill = BattleSkills.getSkill(aiDecision.skillId);
            if (!skill) {
                seq.enqueue(function(d) { advanceToNextTurn(); d(); });
                done();
                return;
            }

            var apCost = skill.apCost || 25;
            spendAP(id, apCost);
            bridge.setTargetId(aiDecision.targetId);

            enqueueExchange(id, aiDecision.targetId, skill);
            seq.enqueue(function(d) { advanceToNextTurn(); d(); });
            done();
        });
    }

    // ============================================================
    // EXCHANGE — One Trade (the full action cam sequence)
    //
    // Cam in → skill name → swing → wipe check →
    //   counter check (may inject counter swing) →
    //   cam out → breathing pause
    // ============================================================

    function enqueueExchange(initiatorId, targetId, skill) {

        // --- CAM IN ---
        seq.enqueue(function(done) {
            bridge.setPhase(PHASES.ACTION_CAM_IN);
            setTimeout(done, ACTION_CAM.transitionInMs);
        });

        // --- INITIATOR SWING ---
        enqueueSwingSteps(initiatorId, targetId, skill, false);

        // --- WIPE CHECK (after initiator swing) ---
        seq.enqueue(makeWipeCheckStep());

        // --- COUNTER CHECK ---
        seq.enqueue(makeCounterCheckStep(initiatorId, targetId));

        // --- CAM OUT ---
        seq.enqueue(function(done) {
            bridge.setPhase(PHASES.ACTION_CAM_OUT);
            setTimeout(function() {
                // Clean up cam state
                bridge.setTargetId(null);
                bridge.setPhase(PHASES.TURN_ACTIVE);
                done();
            }, ACTION_CAM.transitionOutMs);
        });

        // --- BREATHING PAUSE ---
        seq.enqueue(function(done) {
            setTimeout(done, DIRECTOR_TIMING.breathingPauseMs);
        });
    }

    // ============================================================
    // SWING STEPS — builds QTE + playback (or defense playback)
    //
    // Player attacking: skill name → QTE phase → playback phase
    // Enemy attacking:  skill name → defense playback phase
    // ============================================================

    function enqueueSwingSteps(swingerId, receiverId, skill, isCounter) {
        var swingerIsPlayer = isPlayerCombatant(swingerId);

        // --- Reset per-swing tracking ---
        seq.enqueue(function(done) {
            if (swingerIsPlayer) {
                comboCounter.playerCombo = 0;
            } else {
                comboCounter.enemyUnblocked = 0;
            }
            summaryDmg.total = 0;
            summaryDmg.color = "#f59e0b";
            summaryDmg.receiverId = receiverId;
            done();
        });

        // --- SKILL NAME LABEL ---
        seq.enqueue(function(done) {
            var color = swingerIsPlayer ? "#60a5fa" : "#ef4444";
            bridge.spawnSkillName(skill.name || skill.id, swingerId, color);
            setTimeout(done, DIRECTOR_TIMING.skillNameHoldMs);
        });

        if (swingerIsPlayer) {
            // --- PLAYER OFFENSE: Chalkboard QTE → Playback ---

            // QTE phase
            seq.enqueue(function(done) {
                bridge.setPhase(PHASES.CAM_SWING_QTE);

                var diff = ChalkboardModule
                    ? ChalkboardModule.resolveDifficulty(
                        skill.difficulty || "normal",
                        { hitZone: skill.hitZone, perfectZone: skill.perfectZone, damageMap: skill.damageMap }
                    )
                    : null;

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

                var qteConfig = Object.assign({}, skill, {
                    type: "chalkboard",
                    beatVisuals: beatVisuals,
                    _difficulty: diff,
                });

                bridge.activateQTE(qteConfig, function onQTEDone(resultsArray) {
                    // QTE complete — transition to playback
                    bridge.setPhase(PHASES.CAM_SWING_PLAYBACK);

                    var ctx = buildPlaybackContext(skill, swingerId, receiverId);
                    ctx.difficulty = diff;
                    ctx.resultsArray = resultsArray;

                    bridge.runOffensePlayback(ctx, function onPlaybackDone() {
                        done();
                    });
                });
            });

        } else {
            // --- ENEMY OFFENSE: Animation-read defense ---

            seq.enqueue(function(done) {
                bridge.setPhase(PHASES.CAM_SWING_PLAYBACK);
                var ctx = buildPlaybackContext(skill, swingerId, receiverId);

                bridge.runDefensePlayback(ctx, function onPlaybackDone() {
                    done();
                });
            });
        }
    }

    // Build the context object that PlaybackManager expects
    function buildPlaybackContext(skill, swingerId, receiverId) {
        return {
            skill:          skill,
            swingerId:      swingerId,
            receiverId:     receiverId,
            bState:         bState,
            BattleSkills:   BattleSkills,
            BattleSFX:      BattleSFX,
            DefenseTiming:  DefenseTiming,
            CHOREOGRAPHY:   CHOREOGRAPHY,
            DEFENSE_TIMING: DEFENSE_TIMING,
            BATTLE_END:     BATTLE_END,
            comboCounter:   comboCounter,
            summaryDmg:     summaryDmg,
            isPartyId:      isPlayerCombatant,
        };
    }

    // ============================================================
    // WIPE CHECK STEP (factory — returns a step function)
    //
    // If wipe detected: clears queue, enqueues end/wave, continues.
    // If no wipe: passes through.
    // ============================================================

    function makeWipeCheckStep() {
        return function(done) {
            var result = checkWipe();
            if (!result) { done(); return; }

            // Wipe detected — clear remaining exchange steps
            seq.clear();

            if (result === "ko") {
                enqueueBattleEnd("ko");
            } else if (result === "victory") {
                enqueueBattleEnd("victory");
            } else if (result === "waveComplete") {
                // Cam out first, then wave transition
                seq.enqueue(function(d) {
                    bridge.setPhase(PHASES.ACTION_CAM_OUT);
                    setTimeout(function() {
                        bridge.setTargetId(null);
                        d();
                    }, ACTION_CAM.transitionOutMs);
                });
                enqueueWaveTransition();
            }

            done(); // triggers runNext → processes the new steps
        };
    }

    // ============================================================
    // COUNTER CHECK STEP (factory)
    //
    // After initiator swings: can responder counter?
    // If yes → inject counter swing steps before cam out.
    // If no → pass through to cam out.
    // ============================================================

    function makeCounterCheckStep(initiatorId, responderId) {
        return function(done) {
            // Responder dead?
            var respState = bState.get(responderId);
            if (!respState || respState.ko) { done(); return; }

            // Can afford counter?
            var counterCost = ENGAGEMENT.AP_COST_COUNTER;
            if (!canAfford(responderId, counterCost)) { done(); return; }

            var responderIsPlayer = isPlayerCombatant(responderId);

            if (responderIsPlayer) {
                // Show prompt — wait for player decision
                bridge.showCounterPrompt(responderId, counterCost, function onDecision(accepted) {
                    if (!accepted) { done(); return; }
                    injectCounterSwing(responderId, initiatorId, counterCost);
                    done();
                });
            } else {
                // AI always counters if affordable (V1)
                setTimeout(function() {
                    injectCounterSwing(responderId, initiatorId, counterCost);
                    done();
                }, DIRECTOR_TIMING.counterDelayMs);
            }
        };
    }

    // Inject counter swing steps at the front of the queue
    // (before cam out that's already enqueued).
    function injectCounterSwing(counterId, targetId, counterCost) {
        spendAP(counterId, counterCost);

        var counterData = bState.get(counterId);
        var counterSkillId = counterData && counterData.skills
            ? counterData.skills[0] : null;
        var counterSkill = BattleSkills.getSkill(counterSkillId);
        if (!counterSkill) return; // can't counter without a skill

        // Build counter steps and prepend them
        var steps = [];

        // Brief delay before counter starts
        steps.push(function(done) {
            setTimeout(done, DIRECTOR_TIMING.counterDelayMs);
        });

        // We can't use enqueueSwingSteps here because it calls
        // seq.enqueue (appends). We need to build the steps array
        // and prepend. So we build them inline.

        var swingerIsPlayer = isPlayerCombatant(counterId);

        // Reset per-swing tracking
        steps.push(function(done) {
            if (swingerIsPlayer) {
                comboCounter.playerCombo = 0;
            } else {
                comboCounter.enemyUnblocked = 0;
            }
            summaryDmg.total = 0;
            summaryDmg.color = "#f59e0b";
            summaryDmg.receiverId = targetId;
            done();
        });

        // Skill name
        steps.push(function(done) {
            var color = swingerIsPlayer ? "#60a5fa" : "#ef4444";
            bridge.spawnSkillName(counterSkill.name || counterSkill.id, counterId, color);
            setTimeout(done, DIRECTOR_TIMING.skillNameHoldMs);
        });

        // Swing (QTE or defense)
        if (swingerIsPlayer) {
            steps.push(function(done) {
                bridge.setPhase(PHASES.CAM_SWING_QTE);

                var diff = ChalkboardModule
                    ? ChalkboardModule.resolveDifficulty(
                        counterSkill.difficulty || "normal",
                        { hitZone: counterSkill.hitZone, perfectZone: counterSkill.perfectZone, damageMap: counterSkill.damageMap }
                    )
                    : null;

                var beatVisuals = null;
                if (counterSkill.beats) {
                    beatVisuals = counterSkill.beats.map(function(b) {
                        var resolved = BattleSkills.resolveBeat(b);
                        return { unblockable: resolved.unblockable || false, finisher: resolved.finisher || false };
                    });
                }

                var qteConfig = Object.assign({}, counterSkill, {
                    type: "chalkboard", beatVisuals: beatVisuals, _difficulty: diff,
                });

                bridge.activateQTE(qteConfig, function(resultsArray) {
                    bridge.setPhase(PHASES.CAM_SWING_PLAYBACK);
                    var ctx = buildPlaybackContext(counterSkill, counterId, targetId);
                    ctx.difficulty = diff;
                    ctx.resultsArray = resultsArray;
                    bridge.runOffensePlayback(ctx, function() { done(); });
                });
            });
        } else {
            steps.push(function(done) {
                bridge.setPhase(PHASES.CAM_SWING_PLAYBACK);
                var ctx = buildPlaybackContext(counterSkill, counterId, targetId);
                bridge.runDefensePlayback(ctx, function() { done(); });
            });
        }

        // Wipe check after counter
        steps.push(makeWipeCheckStep());

        seq.prepend(steps);
    }

    // ============================================================
    // WAVE TRANSITION
    // ============================================================

    function enqueueWaveTransition() {
        // Banner
        seq.enqueue(function(done) {
            bridge.setPhase(PHASES.WAVE_TRANSITION);
            setTimeout(done, WAVE_TRANSITION ? WAVE_TRANSITION.bannerMs : 2000);
        });

        // Swap enemies + reset state
        seq.enqueue(function(done) {
            waveIndex += 1;
            currentEnemies = waves[waveIndex] || [];

            bState.replaceEnemies(currentEnemies);
            bridge.setWaveIndex(waveIndex);

            // Merge AP — party keeps, new enemies at 0
            var partyIds = bState.getPartyIds();
            apState = BattleEngagement.mergeAPState(
                apState, currentEnemies, ENGAGEMENT.AP_MAX, partyIds
            );
            bridge.onAPChanged(apState);

            // Clear visual state
            bridge.clearVisualState();
            bridge.bumpState();

            done();
        });

        // Reroll initiative
        seq.enqueue(function(done) {
            var allCombatants = party.concat(currentEnemies);
            turnOrder = BattleEngagement.rollInitiative(
                allCombatants, ENGAGEMENT.INITIATIVE_VARIANCE
            );
            turnIndex = -1;
            bridge.onTurnOrderChanged(turnOrder);
            done();
        });

        // Breathing pause for player to read the new field
        seq.enqueue(function(done) {
            setTimeout(done, DIRECTOR_TIMING.wavePauseMs);
        });

        // Start first turn of new wave
        seq.enqueue(function(done) {
            advanceToNextTurn();
            done();
        });
    }

    // ============================================================
    // BATTLE END
    // ============================================================

    function enqueueBattleEnd(outcome) {
        seq.enqueue(function(done) {
            bridge.setPhase(PHASES.BATTLE_ENDING);
            done();
        });

        // Dramatic hold
        seq.enqueue(function(done) {
            setTimeout(done, BATTLE_END ? BATTLE_END.koHoldMs : 1500);
        });

        // Build and deliver result
        seq.enqueue(function(done) {
            var result = bState.buildResult(outcome);
            bridge.onBattleEnd(result);
            done();
        });
    }

    // ============================================================
    // PUBLIC API
    // ============================================================

    function start() {
        if (destroyed) return;

        // Init AP — everyone starts at 0
        apState = BattleEngagement.initAPState(
            getAllCombatants(), ENGAGEMENT.AP_MAX
        );
        bridge.onAPChanged(apState);

        // Roll initiative
        turnOrder = BattleEngagement.rollInitiative(
            getAllCombatants(), ENGAGEMENT.INITIATIVE_VARIANCE
        );
        bridge.onTurnOrderChanged(turnOrder);

        // Start first turn
        turnIndex = -1;
        advanceToNextTurn();
        seq.start();
    }

    function onPlayerAction(actionId, skillId, targetId) {
        processPlayerAction(actionId, skillId, targetId);
    }

    function onPlayerCounterDecision(accepted) {
        // Bridge's showCounterPrompt stores its own callback.
        // This is a convenience passthrough if BattleView needs it.
        // The actual wiring goes through the onDecision callback
        // in makeCounterCheckStep → bridge.showCounterPrompt.
    }

    // ============================================================
    // GETTERS (BattleView reads for rendering)
    // ============================================================

    function getApState()       { return apState; }
    function getTurnOrder()     { return turnOrder; }
    function getTurnIndex()     { return turnIndex; }
    function getCurrentTurnId() { return currentTurnId; }
    function getWaveIndex()     { return waveIndex; }

    // ============================================================
    // DEV CONTROLS
    // ============================================================

    function fillAllAP() {
        var all = getAllCombatants();
        for (var i = 0; i < all.length; i++) {
            var entry = apState[all[i].id];
            if (entry) {
                apState[all[i].id] = { current: entry.max, max: entry.max };
            }
        }
        apState = Object.assign({}, apState); // fresh ref for React
        bridge.onAPChanged(apState);
    }

    function reset() {
        seq.clear();
        apState = {};
        turnOrder = [];
        turnIndex = -1;
        waveIndex = 0;
        currentTurnId = null;
        currentEnemies = waves[0] || [];
        pendingPlayerDone = null;
        pendingCounterDone = null;
        bridge.setPhase(PHASES.INTRO);
        bridge.setTurnOwnerId(null);
        bridge.setTargetId(null);
    }

    function destroy() {
        seq.clear();
        destroyed = true;
        pendingPlayerDone = null;
        pendingCounterDone = null;
    }

    // ============================================================
    // RETURN — public API surface
    // ============================================================

    return {
        // Lifecycle
        start:                      start,
        destroy:                    destroy,
        reset:                      reset,

        // Player input
        onPlayerAction:             onPlayerAction,
        onPlayerItemUsed:           onPlayerItemUsed,
        onPlayerCounterDecision:    onPlayerCounterDecision,

        // Getters (view reads for rendering)
        getApState:                 getApState,
        getTurnOrder:               getTurnOrder,
        getTurnIndex:               getTurnIndex,
        getCurrentTurnId:           getCurrentTurnId,
        getWaveIndex:               getWaveIndex,

        // Dev
        fillAllAP:                  fillAllAP,
    };
}

// ============================================================
// Export
// ============================================================
var BattleDirectorModule = {
    createBattleDirector: createBattleDirector,
};

export default BattleDirectorModule;