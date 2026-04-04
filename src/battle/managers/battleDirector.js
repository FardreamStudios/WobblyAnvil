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
import BATTLE_TAGS from "../battleTags.js";

var PHASES         = BattleConstants.BATTLE_PHASES;
var ENGAGEMENT     = BattleConstants.ENGAGEMENT;
var ACTION_CAM     = BattleConstants.ACTION_CAM;
var EXCHANGE       = BattleConstants.EXCHANGE;
var CHOREOGRAPHY   = BattleConstants.CHOREOGRAPHY;
var DEFENSE_TIMING = BattleConstants.DEFENSE_TIMING;
var BATTLE_END     = BattleConstants.BATTLE_END;
var WAVE_TRANSITION = BattleConstants.WAVE_TRANSITION;
var ENEMY_AI       = BattleConstants.ENEMY_AI;

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
        if (queue.length === 0) { console.log("[Sequencer] queue empty — idle"); return; }
        console.log("[Sequencer] running step, remaining:", queue.length);
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
    var pendingCamChainDone  = null; // in-cam chain prompt step

    // Special skill takeover state (see SpecialSkillSystemSpec.md)
    var activeSkill         = null;   // skill controller object (has activate/abort/onTick)
    var activeSkillBridge   = null;   // skill bridge instance (disabled on abort)
    var activeSkillCasterId = null;   // combatant currently executing a special skill
    var pendingSkillDone    = null;   // sequencer done() callback parked during takeover
    var chargingLoopHandle  = null;   // { stop() } for charge hum SFX during declare→activate

    // In-cam chaining state (player multi-action cam session)
    var camSession = {
        active:      false,
        actionsUsed: 0,
        initiatorId: null,
        targetId:    null,
    };

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
    // TURN ORDER MANIPULATION
    // ============================================================

    // Push a combatant N slots back in turn order.
    // Used when declaring a delayed/special skill.
    function pushTurnBack(id, slots) {
        var idx = turnOrder.indexOf(id);
        console.log("[Director] pushTurnBack — id:", id, "slots:", slots, "currentIdx:", idx, "turnIndex:", turnIndex, "orderBefore:", turnOrder.slice());
        if (idx === -1) return;
        turnOrder.splice(idx, 1);
        console.log("[Director] pushTurnBack — after remove:", turnOrder.slice());
        var newIdx = Math.min(idx + slots, turnOrder.length);
        turnOrder.splice(newIdx, 0, id);
        console.log("[Director] pushTurnBack — after insert at", newIdx, ":", turnOrder.slice());
        bridge.onTurnOrderChanged(turnOrder);
    }

    // ============================================================
    // SKILL BRIDGE FACTORY (SpecialSkillSystemSpec §3)
    //
    // Builds a controlled facade the director passes to a special
    // skill on ACTIVATE.  Every method guards against use after
    // ABORT (no-ops silently).  The director calls _abort() to
    // disable the bridge and _isAborted() to query it.
    //
    // Promise-returning methods (enterCam, exitCam, runQTE) let
    // the skill await them in its own async sequence.
    // ============================================================

    function createSkillBridge(casterId, targetId) {
        var aborted = false;

        // --------------------------------------------------
        // Combat State
        // --------------------------------------------------

        function getTarget(id) {
            if (aborted) return null;
            var c = bState.get(id);
            return c ? Object.assign({}, c) : null;
        }

        function isAlive(id) {
            if (aborted) return false;
            var c = bState.get(id);
            return c ? !c.ko : false;
        }

        function skillDealDamage(tid, amount) {
            if (aborted) return { newHP: 0, isKO: false };
            var result = bState.applyDamage(tid, amount);
            bridge.spawnDamageNumber(tid, String(result.actual), "#f59e0b");
            bridge.bumpState();

            // --- Hit reactions (match playback manager visual feedback) ---
            bus.emit(BATTLE_TAGS.FLASH, { combatantId: tid });
            if (BattleSFX && BattleSFX.hit) BattleSFX.hit();
            if (result.killed) {
                bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: tid, animName: "ko" });
                bus.emit(BATTLE_TAGS.SHAKE, { level: "ko" });
                if (BattleSFX && BattleSFX.ko) BattleSFX.ko();
            } else {
                bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: tid, animName: "hit" });
                bus.emit(BATTLE_TAGS.SHAKE, { level: "light" });
                setTimeout(function() {
                    bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: tid });
                }, CHOREOGRAPHY.hitMs || 200);
            }

            // Wipe check — if triggered, schedule abort on next
            // microtask so the skill's current call stack finishes
            // before the director takes over.
            var wipe = checkWipe();
            if (wipe) {
                aborted = true;
                var reason = wipe === "ko" ? "casterKO" : "waveEnd";
                Promise.resolve().then(function() {
                    abortActiveSkill(reason);
                });
            }

            var after = bState.get(tid);
            return { newHP: after ? after.currentHP : 0, isKO: result.killed };
        }

        function skillSpawnDamageNumber(id, val, color) {
            if (aborted) return;
            bridge.spawnDamageNumber(id, val, color);
        }

        // Whitelist of flags the skill is allowed to touch
        var ALLOWED_FLAGS = { canDefend: true, canAct: true };

        function setFlag(id, flag, val) {
            if (aborted) return;
            if (!ALLOWED_FLAGS[flag]) {
                console.warn("[SkillBridge] setFlag blocked — not whitelisted:", flag);
                return;
            }
            var c = bState.get(id);
            if (c) c[flag] = val;
        }

        function getFlag(id, flag) {
            var c = bState.get(id);
            return c ? c[flag] : undefined;
        }

        function skillBumpState() {
            if (aborted) return;
            bridge.bumpState();
        }

        // --------------------------------------------------
        // Turn Order
        // --------------------------------------------------

        function skillPushTurnBack(id, slots) {
            if (aborted) return;
            pushTurnBack(id, slots);
        }

        function skillGetCurrentTurnId() {
            return currentTurnId;
        }

        function getNextTarget(side) {
            if (aborted) return null;
            var ids = side === "enemy" ? bState.getEnemyIds() : bState.getPartyIds();
            for (var i = 0; i < ids.length; i++) {
                var c = bState.get(ids[i]);
                if (c && !c.ko) return ids[i];
            }
            return null;
        }

        // --------------------------------------------------
        // Action Cam (promise-based)
        // --------------------------------------------------

        function enterCam(attackerId, tid, opts) {
            if (aborted) return Promise.resolve();
            return new Promise(function(resolve) {
                bridge.setCamExchange(attackerId, tid, opts);
                bridge.setTargetId(tid);  // sync React state so BattleCharacter shows the target
                bridge.setPhase(PHASES.ACTION_CAM_IN);
                BattleSFX.engage();
                setTimeout(resolve, ACTION_CAM.transitionInMs);
            });
        }

        function exitCam() {
            if (aborted) return Promise.resolve();
            return new Promise(function(resolve) {
                bridge.setPhase(PHASES.CAM_EXIT_SLIDE);
                setTimeout(function() {
                    bridge.onCamOut();
                    bridge.setPhase(PHASES.ACTION_CAM_OUT);
                    setTimeout(resolve, ACTION_CAM.transitionOutMs);
                }, ACTION_CAM.exitSlideMs);
            });
        }

        function showSkillName(text) {
            if (aborted) return;
            var color = isPlayerCombatant(casterId) ? "#60a5fa" : "#ef4444";
            bridge.spawnSkillName(text, casterId, color);
        }

        // --------------------------------------------------
        // Sprite & Anim
        //
        // setChoreo / clearChoreo go through the existing bus
        // events that BattleView already subscribes to.
        // setSpriteKey / setSpriteFrame route through the View
        // Bridge to update spriteOverrides state in BattleView.
        // --------------------------------------------------

        function setChoreo(id, cls) {
            if (aborted) return;
            bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: id, animName: cls });
        }

        function clearChoreo(id) {
            if (aborted) return;
            bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: id });
        }

        function setSpriteKey(id, key) {
            if (aborted) return;
            bridge.setSpriteKey(id, key);
        }

        function setSpriteFrame(id, frame) {
            if (aborted) return;
            bridge.setSpriteFrame(id, frame);
        }

        // --------------------------------------------------
        // QTE (promise-based)
        // --------------------------------------------------

        function runQTE(config) {
            if (aborted) return Promise.resolve({ accuracy: 0, succeeded: false });
            return new Promise(function(resolve) {
                bridge.setPhase(PHASES.CAM_SWING_QTE);
                bridge.activateQTE(config, function(resultsArray) {
                    bridge.setPhase(PHASES.CAM_SWING_PLAYBACK);
                    resolve(resultsArray);
                });
            });
        }

        // --------------------------------------------------
        // VFX — routed to View Bridge
        // --------------------------------------------------

        function startVFX(id, opts) {
            if (aborted) return;
            bridge.startVFX(id, opts);
        }

        function stopVFX(id) {
            if (aborted) return;
            bridge.stopVFX(id);
        }

        // --------------------------------------------------
        // Lifecycle
        // --------------------------------------------------

        function release() {
            if (aborted) return;
            releaseSkill();
        }

        // --------------------------------------------------
        // Bridge object
        // --------------------------------------------------

        return {
            // Combat State
            getTarget:          getTarget,
            isAlive:            isAlive,
            dealDamage:         skillDealDamage,
            spawnDamageNumber:  skillSpawnDamageNumber,
            setFlag:            setFlag,
            getFlag:            getFlag,
            bumpState:          skillBumpState,

            // Turn Order
            pushTurnBack:       skillPushTurnBack,
            getCurrentTurnId:   skillGetCurrentTurnId,
            getNextTarget:      getNextTarget,

            // Action Cam
            enterCam:           enterCam,
            exitCam:            exitCam,
            showSkillName:      showSkillName,

            // Sprite & Anim
            setChoreo:          setChoreo,
            clearChoreo:        clearChoreo,
            setSpriteKey:       setSpriteKey,
            setSpriteFrame:     setSpriteFrame,

            // QTE
            runQTE:             runQTE,

            // VFX
            startVFX:           startVFX,
            stopVFX:            stopVFX,

            // SFX
            sfx:                BattleSFX,
            stopChargeLoop:     function() {
                if (chargingLoopHandle) { chargingLoopHandle.stop(); chargingLoopHandle = null; }
            },

            // Lifecycle
            release:            release,

            // Internal — director only
            _abort:             function() { aborted = true; },
            _isAborted:         function() { return aborted; },
        };
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
        console.log("[Director] advanceToNextTurn — turnIndex:", turnIndex, "turnOrder:", turnOrder.slice(), "order[turnIndex]:", turnOrder[turnIndex]);
        var nextIdx = BattleEngagement.advanceTurn(
            turnOrder, turnIndex,
            function(id) {
                var s = bState.get(id);
                return !s || !s.ko;
            }
        );

        console.log("[Director] advanceTurn returned nextIdx:", nextIdx, "→ id:", turnOrder[nextIdx]);

        if (nextIdx === -1) {
            // Everyone dead — shouldn't happen (wipe check should catch first)
            console.warn("[Director] advanceTurn returned -1 — no living combatants!");
            return;
        }

        turnIndex = nextIdx;
        currentTurnId = turnOrder[turnIndex];
        console.log("[Director] next turn → idx:", nextIdx, "id:", currentTurnId);
        enqueueTurn(currentTurnId);
    }

    // ============================================================
    // TURN ROUTING
    // ============================================================

    function enqueueTurn(id) {
        if (destroyed) { console.warn("[Director] enqueueTurn blocked — destroyed"); return; }

        console.log("[Director] enqueueTurn:", id, "isCharging:", bState.isCharging(id), "turnIndex:", turnIndex, "turnOrder:", turnOrder.slice());

        // --- Special skill takeover: charging combatant's turn has arrived ---
        if (bState.isCharging(id)) {
            console.log("[Director] enqueueTurn:", id, "→ CHARGING — activating special skill");
            enqueueSpecialSkillActivation(id);
            return;
        }

        var isPlayer = isPlayerCombatant(id);
        console.log("[Director] enqueueTurn:", id, isPlayer ? "PLAYER" : "ENEMY");

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
    // SPECIAL SKILL TAKEOVER (SpecialSkillSystemSpec §5)
    //
    // When a charging combatant's turn arrives, the director
    // builds a skill bridge, parks the sequencer, and hands
    // control to the skill's activate() method.
    //
    // The sequencer stays parked until releaseSkill() (RESUME)
    // or abortActiveSkill() (ABORT) is called.
    // ============================================================

    function enqueueSpecialSkillActivation(id) {
        // Single step — parks until skill calls bridge.release()
        seq.enqueue(function(done) {
            var chargeInfo = bState.get(id).chargingSkill;
            if (!chargeInfo) {
                console.warn("[Director] enqueueSpecialSkillActivation — no chargingSkill on:", id);
                advanceToNextTurn();
                done();
                return;
            }

            var skill = BattleSkills.getSkill(chargeInfo.skillId);
            if (!skill || typeof skill.activate !== "function") {
                console.warn("[Director] enqueueSpecialSkillActivation — skill missing activate():", chargeInfo.skillId);
                bState.clearCharging(id);
                bridge.bumpState();
                advanceToNextTurn();
                done();
                return;
            }

            // Build the skill bridge
            var skillBridge = createSkillBridge(id, chargeInfo.targetId);

            // Store takeover state
            activeSkill         = skill;
            activeSkillBridge   = skillBridge;
            activeSkillCasterId = id;
            pendingSkillDone    = done;  // parked — skill owns control now

            currentTurnId = id;
            bridge.setTurnOwnerId(id);

            console.log("[Director] SPECIAL SKILL ACTIVATE:", skill.id || chargeInfo.skillId, "caster:", id);

            // Charge loop SFX stays running — skill calls bridge.stopChargeLoop()
            // when it's ready to transition (e.g. after aim QTE, before beam SFX).

            skill.activate(skillBridge);
            // Sequencer is now parked. Skill runs async via bridge.
        });
    }

    // ----------------------------------------------------------
    // RESUME — skill calls bridge.release() when done
    // ----------------------------------------------------------

    function releaseSkill() {
        if (!activeSkill) {
            console.warn("[Director] releaseSkill called with no active skill");
            return;
        }

        var casterId = activeSkillCasterId;
        console.log("[Director] SPECIAL SKILL RESUME — caster:", casterId);

        // Clear charging flags on combatant
        bState.clearCharging(casterId);
        bridge.bumpState();

        // Clear internal takeover state
        var doneFn = pendingSkillDone;
        activeSkill         = null;
        activeSkillBridge   = null;
        activeSkillCasterId = null;
        pendingSkillDone    = null;

        // Enqueue post-release cleanup:
        // cam out (if skill entered cam) → wipe check → advance

        // Cam out — safe to call even if cam isn't active,
        // the phases just no-op visually
        enqueueCamOut({ setTurnActive: false, clearTarget: true });

        // Breathing pause
        seq.enqueue(function(d) {
            setTimeout(d, DIRECTOR_TIMING.breathingPauseMs);
        });

        // Wipe check + advance
        seq.enqueue(function(d) {
            var wipe = checkWipe();
            if (wipe) {
                seq.clear();
                if (wipe === "ko") { enqueueBattleEnd("ko"); }
                else if (wipe === "victory") { enqueueBattleEnd("victory"); }
                else if (wipe === "waveComplete") { enqueueWaveTransition(); }
            } else {
                advanceToNextTurn();
            }
            d();
        });

        // Unpark the sequencer — runs the steps we just enqueued
        if (doneFn) doneFn();
    }

    // ----------------------------------------------------------
    // ABORT — director forcefully ends the skill
    //
    // Reasons: "casterKO", "waveEnd", "flee"
    // Called from wipe checks or external events.
    // ----------------------------------------------------------

    function abortActiveSkill(reason) {
        if (!activeSkill) return;

        var casterId = activeSkillCasterId;
        console.log("[Director] SPECIAL SKILL ABORT — reason:", reason, "caster:", casterId);

        // 1. Disable the bridge (all future calls no-op)
        if (activeSkillBridge) activeSkillBridge._abort();

        // Stop charge SFX if still running
        if (chargingLoopHandle) { chargingLoopHandle.stop(); chargingLoopHandle = null; }
        bridge.stopVFX("beam_connect");
        if (typeof activeSkill.abort === "function") {
            activeSkill.abort(reason);
        }

        // 3. Clear charging flags
        bState.clearCharging(casterId);
        bridge.bumpState();

        // 4. Clear internal takeover state
        var doneFn = pendingSkillDone;
        activeSkill         = null;
        activeSkillBridge   = null;
        activeSkillCasterId = null;
        pendingSkillDone    = null;

        // 5. Enqueue cleanup based on abort reason
        enqueueCamOut({ setTurnActive: false, clearTarget: true });

        if (reason === "casterKO") {
            // Director handles KO anim + continue
            seq.enqueue(function(d) {
                var wipe = checkWipe();
                if (wipe === "ko") { seq.clear(); enqueueBattleEnd("ko"); }
                else { advanceToNextTurn(); }
                d();
            });
        } else if (reason === "waveEnd") {
            seq.enqueue(function(d) {
                var wipe = checkWipe();
                if (wipe === "victory") { seq.clear(); enqueueBattleEnd("victory"); }
                else if (wipe === "waveComplete") { seq.clear(); enqueueWaveTransition(); }
                else { advanceToNextTurn(); }
                d();
            });
        } else {
            // Generic — just advance
            seq.enqueue(function(d) { advanceToNextTurn(); d(); });
        }

        // 6. Unpark the sequencer
        if (doneFn) doneFn();
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
            console.log("[Director] → setPhase TURN_ACTIVE for:", id);
            currentTurnId = id;
            bridge.setTurnOwnerId(id);
            bridge.setPhase(PHASES.TURN_ACTIVE);
            BattleSFX.turnStart();
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

            // --- Special skill: declare charge, push back, end turn ---
            if (skill.skillType === "special" && typeof skill.activate === "function") {
                console.log("[Director] SPECIAL SKILL DECLARE:", skill.id || skillId, "caster:", id, "target:", targetId);
                console.log("[Director] DECLARE — turnIndex BEFORE:", turnIndex, "turnOrder BEFORE:", turnOrder.slice());
                var delaySlots = skill.delaySlots || 1;

                // Set charging flags on combatant state
                bState.beginCharging(id, skillId, targetId);
                bridge.bumpState();

                // Save caster's old position before push
                var casterOldIdx = turnOrder.indexOf(id);

                // Push caster back in turn order
                pushTurnBack(id, delaySlots);

                // Adjust turnIndex — after push, the combatant that slid into
                // the caster's old slot should go next. advanceTurn starts at
                // turnIndex+1, so set turnIndex to (oldIdx - 1) with wrap.
                // This ensures advanceTurn lands on the combatant at oldIdx.
                var len = turnOrder.length;
                console.log("[Director] DECLARE — casterOldIdx:", casterOldIdx, "turnIndex BEFORE adjust:", turnIndex);
                turnIndex = (casterOldIdx - 1 + len) % len;
                console.log("[Director] DECLARE — turnIndex AFTER adjust:", turnIndex, "turnOrder NOW:", turnOrder.slice());

                // Apply charge_shake choreo for visual feedback
                bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: id, animName: "charge_shake" });

                // Swap sprite to charge pose (frame 0 of beam sheet)
                if (skill.chargeSpriteKey) {
                    bridge.setSpriteKey(id, skill.chargeSpriteKey);
                    bridge.setSpriteFrame(id, skill.chargeFrame || 0);
                }

                // Charge SFX — one-shot burst + quiet hum loop during formation wait
                BattleSFX.chargeStart();
                if (chargingLoopHandle) { chargingLoopHandle.stop(); }
                chargingLoopHandle = BattleSFX.chargeLoop();

                // Charge glow VFX — pulsing ball at fairy's hands during charge wait
                bridge.startVFX("beam_connect", {
                    from: id, to: targetId,
                    fromOffsetToward: 80, fromOffsetY: 0,
                    chargeOnly: true,
                });

                // End turn — next in line goes. When turn order reaches
                // this combatant's new position, enqueueTurn will detect
                // the charging flag and call skill.activate(bridge).
                seq.enqueue(function(d) {
                    console.log("[Director] DECLARE — advanceToNextTurn step running. turnIndex:", turnIndex, "turnOrder:", turnOrder.slice());
                    advanceToNextTurn();
                    d();
                });
                done();
                return;
            }

            var maxCamActions = ENGAGEMENT.MAX_ENGAGEMENT_ACTIONS || 1;

            if (maxCamActions <= 1) {
                // Single exchange — return to formation after if AP remains
                enqueueExchange(id, targetId, skill);
                seq.enqueue(function(d) { maybeChainOrAdvance(id, d); });
            } else {
                // Multi-action cam session — stay in cam until relent/exhausted
                camSession.active = true;
                camSession.actionsUsed = 1;
                camSession.initiatorId = id;
                camSession.targetId = targetId;

                // Cam in
                seq.enqueue(function(d) {
                    console.log("[Cam] === PLAYER CAM SESSION START ===", id, "→", targetId);
                    bridge.setCamExchange(id, targetId);
                    bridge.setPhase(PHASES.ACTION_CAM_IN);
                    BattleSFX.engage();
                    setTimeout(d, ACTION_CAM.transitionInMs);
                });

                // Swing + wipe + counter
                enqueueSwingSteps(id, targetId, skill, false);
                seq.enqueue(makeWipeCheckStep());
                seq.enqueue(makeCounterCheckStep(id, targetId));

                // Chain decision
                seq.enqueue(makePlayerChainStep());

                // Cam out (reached when chain ends)
                enqueueCamOut();

                // Breathing pause
                seq.enqueue(function(d) {
                    setTimeout(d, DIRECTOR_TIMING.breathingPauseMs);
                });

                // Back to formation — may still have AP for non-attack actions
                seq.enqueue(function(d) {
                    camSession.active = false;
                    maybeChainOrAdvance(id, d);
                });
            }
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
    // Enemies don't use AP for attacks. They get N actions per
    // turn (actionsPerTurn config) with weighted skill selection.
    // All actions play inside a single cam session.
    // If a skill's apCost >= ENEMY_AI.SUPER_THRESHOLD, it ends
    // the turn early. If the target dies mid-chain, bail to cam out.
    // ============================================================

    function enqueueEnemyTurn(id) {
        // Brief pause so player can see whose turn it is
        seq.enqueue(function(done) {
            console.log("[Director] → enemy turn for:", id, "— 2s pause");
            currentTurnId = id;
            bridge.setTurnOwnerId(id);
            bridge.setPhase(PHASES.TURN_ACTIVE);
            BattleSFX.turnStart();
            setTimeout(done, 2000);
        });

        // AI planning + cam session — all enqueued from one decision step
        seq.enqueue(function(done) {
            console.log("[Director] → enemy AI planning for:", id);

            var combatantData = bState.get(id);
            var config = getCombatantConfig(id);

            // Merge runtime data with AI config fields
            var aiData = Object.assign({}, combatantData, {
                actionsPerTurn: config ? config.actionsPerTurn : 1,
                skillWeights:   config ? config.skillWeights : null,
            });

            var superThreshold = ENEMY_AI ? ENEMY_AI.SUPER_THRESHOLD : 35;
            var actions = BattleAI.planTurn(
                aiData, bState, BattleSkills.getSkill, superThreshold
            );

            if (!actions || actions.length === 0) {
                // Can't act — skip to next turn
                seq.enqueue(function(d) { advanceToNextTurn(); d(); });
                done();
                return;
            }

            var targetId = actions[0].targetId;
            bridge.setTargetId(targetId);

            // --- CAM IN (once for entire chain) ---
            seq.enqueue(function(d) {
                console.log("[Cam] === ENEMY CHAIN START ===", id, "→", targetId, actions.length, "action(s)");
                bridge.setCamExchange(id, targetId);
                bridge.setPhase(PHASES.ACTION_CAM_IN);
                BattleSFX.engage();
                setTimeout(d, ACTION_CAM.transitionInMs);
            });

            // --- ENQUEUE EACH ACTION ---
            for (var i = 0; i < actions.length; i++) {
                (function(actionIndex) {
                    var action = actions[actionIndex];
                    var skill = BattleSkills.getSkill(action.skillId);
                    if (!skill) return;

                    // Alive gate (after first action) — check BOTH swinger and target
                    if (actionIndex > 0) {
                        seq.enqueue(function(d) {
                            // Swinger died (e.g. from player counter) — bail
                            var swinger = bState.get(id);
                            if (!swinger || swinger.ko) {
                                console.log("[Cam] ENEMY CHAIN — swinger dead after action", actionIndex, ", bailing");
                                seq.clear();
                                enqueueCamOut();
                                seq.enqueue(function(dd) {
                                    setTimeout(dd, DIRECTOR_TIMING.breathingPauseMs);
                                });
                                seq.enqueue(function(dd) { advanceToNextTurn(); dd(); });
                                d();
                                return;
                            }
                            var tgt = bState.get(targetId);
                            if (!tgt || tgt.ko) {
                                console.log("[Cam] ENEMY CHAIN — target dead after action", actionIndex, ", bailing");
                                seq.clear();
                                // Cam out → breathing pause → advance
                                enqueueCamOut();
                                seq.enqueue(function(dd) {
                                    setTimeout(dd, DIRECTOR_TIMING.breathingPauseMs);
                                });
                                seq.enqueue(function(dd) { advanceToNextTurn(); dd(); });
                            }
                            d();
                        });
                    }

                    // Swing steps (skill name → QTE/defense → playback)
                    enqueueSwingSteps(id, targetId, skill, false);

                    // Wipe check after each swing
                    seq.enqueue(makeWipeCheckStep());

                    // Counter check after each swing
                    seq.enqueue(makeCounterCheckStep(id, targetId));

                })(i);
            }

            // --- CAM OUT (once after all actions) ---
            enqueueCamOut();

            // --- BREATHING PAUSE ---
            seq.enqueue(function(d) {
                setTimeout(d, DIRECTOR_TIMING.breathingPauseMs);
            });

            // --- ADVANCE TO NEXT TURN ---
            seq.enqueue(function(d) { advanceToNextTurn(); d(); });

            done();
        });
    }

    // ============================================================
    // CAM OUT HELPER — exit slide → zoom out → optional TURN_ACTIVE
    // opts.setTurnActive (default true) — set phase to TURN_ACTIVE after zoom
    // opts.clearTarget   (default true) — clear targetId after zoom
    // ============================================================

    function enqueueCamOut(opts) {
        var setTurnActive = !opts || opts.setTurnActive !== false;
        var clearTarget   = !opts || opts.clearTarget !== false;

        // Step 1: horizontal slide off-screen
        seq.enqueue(function(done) {
            bridge.setPhase(PHASES.CAM_EXIT_SLIDE);
            setTimeout(function() {
                bridge.onCamOut();
                done();
            }, ACTION_CAM.exitSlideMs);
        });

        // Step 2: camera zooms back to formation
        seq.enqueue(function(done) {
            bridge.setPhase(PHASES.ACTION_CAM_OUT);
            setTimeout(function() {
                if (clearTarget) bridge.setTargetId(null);
                if (setTurnActive) bridge.setPhase(PHASES.TURN_ACTIVE);
                done();
            }, ACTION_CAM.transitionOutMs);
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
        var _t0 = 0;

        // --- CAM IN ---
        seq.enqueue(function(done) {
            _t0 = performance.now();
            console.log("[Cam] === EXCHANGE START ===", initiatorId, "→", targetId, "skill:", skill.id || skill.name);
            console.log("[Cam] CAM_IN  phase set, waiting", ACTION_CAM.transitionInMs, "ms");
            bridge.setCamExchange(initiatorId, targetId);
            bridge.setPhase(PHASES.ACTION_CAM_IN);
            BattleSFX.engage();
            setTimeout(function() {
                console.log("[Cam] CAM_IN  done  +" + Math.round(performance.now() - _t0) + "ms");
                done();
            }, ACTION_CAM.transitionInMs);
        });

        // --- INITIATOR SWING ---
        enqueueSwingSteps(initiatorId, targetId, skill, false);

        // --- WIPE CHECK (after initiator swing) ---
        seq.enqueue(makeWipeCheckStep());

        // --- COUNTER CHECK ---
        seq.enqueue(makeCounterCheckStep(initiatorId, targetId));

        // --- CAM OUT ---
        enqueueCamOut();

        // --- BREATHING PAUSE ---
        seq.enqueue(function(done) {
            console.log("[Cam] BREATHING PAUSE", DIRECTOR_TIMING.breathingPauseMs, "ms");
            setTimeout(function() {
                console.log("[Cam] === EXCHANGE END ===  total:", Math.round(performance.now() - _t0) + "ms");
                done();
            }, DIRECTOR_TIMING.breathingPauseMs);
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
        var _label = (isCounter ? "COUNTER " : "") + (swingerIsPlayer ? "PLAYER" : "ENEMY");

        // --- Reset per-swing tracking ---
        seq.enqueue(function(done) {
            console.log("[Cam] SWING RESET (" + _label + ") swinger:", swingerId, "→", receiverId);
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
            console.log("[Cam] SKILL_NAME '" + (skill.name || skill.id) + "' hold:", DIRECTOR_TIMING.skillNameHoldMs + "ms");
            bridge.spawnSkillName(skill.name || skill.id, swingerId, color);
            setTimeout(done, DIRECTOR_TIMING.skillNameHoldMs);
        });

        if (swingerIsPlayer) {
            // --- PLAYER OFFENSE: Chalkboard QTE → Playback ---

            // QTE phase
            seq.enqueue(function(done) {
                console.log("[Cam] QTE START (" + _label + ") phase → CAM_SWING_QTE");
                var _qteStart = performance.now();
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
                    console.log("[Cam] QTE DONE (" + _label + ") results:", resultsArray.length, "beats, took", Math.round(performance.now() - _qteStart) + "ms → PLAYBACK");
                    bridge.setPhase(PHASES.CAM_SWING_PLAYBACK);

                    var ctx = buildPlaybackContext(skill, swingerId, receiverId);
                    ctx.difficulty = diff;
                    ctx.resultsArray = resultsArray;

                    var _pbStart = performance.now();
                    bridge.runOffensePlayback(ctx, function onPlaybackDone() {
                        console.log("[Cam] OFFENSE PLAYBACK DONE (" + _label + ") took", Math.round(performance.now() - _pbStart) + "ms");
                        done();
                    });
                });
            });

        } else {
            // --- ENEMY OFFENSE: Animation-read defense ---

            seq.enqueue(function(done) {
                console.log("[Cam] DEFENSE PLAYBACK START (" + _label + ") phase → CAM_SWING_PLAYBACK");
                var _pbStart = performance.now();
                bridge.setPhase(PHASES.CAM_SWING_PLAYBACK);
                var ctx = buildPlaybackContext(skill, swingerId, receiverId);

                bridge.runDefensePlayback(ctx, function onPlaybackDone() {
                    console.log("[Cam] DEFENSE PLAYBACK DONE (" + _label + ") took", Math.round(performance.now() - _pbStart) + "ms");
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
            if (!result) { console.log("[Cam] WIPE CHECK → clear"); done(); return; }
            console.log("[Cam] WIPE CHECK → " + result + " — clearing queue");

            // Wipe detected — clear remaining exchange steps
            seq.clear();

            if (result === "ko") {
                enqueueBattleEnd("ko");
            } else if (result === "victory") {
                enqueueBattleEnd("victory");
            } else if (result === "waveComplete") {
                // Cam out first, then wave transition
                enqueueCamOut({ setTurnActive: false });
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
            if (!respState || respState.ko) { console.log("[Cam] COUNTER CHECK → responder dead, skip"); done(); return; }

            // Charging a special skill — can't counter
            if (respState.canDefend === false) { console.log("[Cam] COUNTER CHECK → canDefend=false, skip"); done(); return; }

            // Can afford counter?
            var counterCost = ENGAGEMENT.AP_COST_COUNTER;
            if (!canAfford(responderId, counterCost)) { console.log("[Cam] COUNTER CHECK → can't afford (" + counterCost + " AP), skip"); done(); return; }

            var responderIsPlayer = isPlayerCombatant(responderId);
            console.log("[Cam] COUNTER CHECK →", responderIsPlayer ? "PLAYER prompt" : "AI auto-counter", "cost:", counterCost);

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
        console.log("[Cam] COUNTER INJECT:", counterId, "→", targetId, "cost:", counterCost);
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
    // PLAYER CHAIN CHECK STEP (factory)
    //
    // After a player exchange in a multi-action cam session:
    // can the player chain another attack?
    // If yes → CAM_CHAIN_PROMPT phase, park for input.
    // If no → fall through to cam out.
    // ============================================================

    function makePlayerChainStep() {
        return function(done) {
            if (!camSession.active) { done(); return; }

            var id = camSession.initiatorId;
            var tid = camSession.targetId;
            var maxActions = ENGAGEMENT.MAX_ENGAGEMENT_ACTIONS || 1;

            // Target dead?
            var tgt = bState.get(tid);
            if (!tgt || tgt.ko) {
                console.log("[Cam] CHAIN CHECK → target dead, exiting cam");
                done(); return;
            }

            // Max actions hit?
            if (camSession.actionsUsed >= maxActions) {
                console.log("[Cam] CHAIN CHECK → max actions reached (" + maxActions + ")");
                done(); return;
            }

            // Any skill affordable?
            var cfg = getCombatantConfig(id);
            var hasAffordable = false;
            if (cfg && cfg.skills) {
                for (var i = 0; i < cfg.skills.length; i++) {
                    var sk = BattleSkills.getSkill(cfg.skills[i]);
                    if (sk && canAfford(id, sk.apCost || 25)) { hasAffordable = true; break; }
                }
            }
            if (!hasAffordable) {
                console.log("[Cam] CHAIN CHECK → no affordable skills");
                done(); return;
            }

            // All conditions met — show chain prompt, park
            console.log("[Cam] CHAIN CHECK → offering chain prompt (actions:", camSession.actionsUsed + "/" + maxActions + ")");
            pendingCamChainDone = done;
            bridge.showCamChainPrompt(id);
        };
    }

    // Inject chain swing steps at front of queue (before cam out).
    // Player-only — always offense QTE path.
    function injectChainSwing(skillId) {
        var id = camSession.initiatorId;
        var tid = camSession.targetId;
        var skill = BattleSkills.getSkill(skillId);
        if (!skill) return;

        var apCost = skill.apCost || 25;
        if (!canAfford(id, apCost)) {
            bridge.spawnDamageNumber(id, "NO AP", "#ef4444");
            // Re-park on the chain prompt
            pendingCamChainDone = pendingCamChainDone; // already set
            return false;
        }

        spendAP(id, apCost);
        camSession.actionsUsed++;

        var steps = [];

        // Reset per-swing tracking
        steps.push(function(done) {
            comboCounter.playerCombo = 0;
            summaryDmg.total = 0;
            summaryDmg.color = "#f59e0b";
            summaryDmg.receiverId = tid;
            done();
        });

        // Skill name
        steps.push(function(done) {
            bridge.spawnSkillName(skill.name || skill.id, id, "#60a5fa");
            setTimeout(done, DIRECTOR_TIMING.skillNameHoldMs);
        });

        // QTE → playback (player offense)
        steps.push(function(done) {
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
                    return { unblockable: resolved.unblockable || false, finisher: resolved.finisher || false };
                });
            }

            var qteConfig = Object.assign({}, skill, {
                type: "chalkboard", beatVisuals: beatVisuals, _difficulty: diff,
            });

            bridge.activateQTE(qteConfig, function(resultsArray) {
                bridge.setPhase(PHASES.CAM_SWING_PLAYBACK);
                var ctx = buildPlaybackContext(skill, id, tid);
                ctx.difficulty = diff;
                ctx.resultsArray = resultsArray;
                bridge.runOffensePlayback(ctx, function() { done(); });
            });
        });

        // Wipe check
        steps.push(makeWipeCheckStep());

        // Counter check
        steps.push(makeCounterCheckStep(id, tid));

        // Next chain check
        steps.push(makePlayerChainStep());

        seq.prepend(steps);
        return true;
    }

    // ============================================================
    // PLAYER CAM CHAIN INPUT
    // ============================================================

    function onPlayerCamChain(skillId) {
        if (!pendingCamChainDone) return;
        var done = pendingCamChainDone;
        pendingCamChainDone = null;

        var success = injectChainSwing(skillId);
        if (success === false) {
            // AP check failed — re-park
            pendingCamChainDone = done;
            return;
        }
        done();
    }

    function onPlayerCamRelent() {
        if (!pendingCamChainDone) return;
        var done = pendingCamChainDone;
        pendingCamChainDone = null;
        console.log("[Cam] PLAYER RELENT — exiting cam session");
        // Fall through to cam out (next in queue)
        done();
    }

    // ============================================================
    // WAVE TRANSITION
    // ============================================================

    function enqueueWaveTransition() {
        // Banner
        seq.enqueue(function(done) {
            console.log("[Cam] WAVE TRANSITION — banner for", (WAVE_TRANSITION ? WAVE_TRANSITION.bannerMs : 2000) + "ms");
            bridge.setPhase(PHASES.WAVE_TRANSITION);
            setTimeout(done, WAVE_TRANSITION ? WAVE_TRANSITION.bannerMs : 2000);
        });

        // Swap enemies + reset state
        seq.enqueue(function(done) {
            waveIndex += 1;
            console.log("[Cam] WAVE SWAP → wave", waveIndex);
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

        // Reroll initiative — exclude KO'd party members
        seq.enqueue(function(done) {
            var livingParty = party.filter(function(p) {
                var s = bState.get(p.id);
                return s && !s.ko;
            });
            var allCombatants = livingParty.concat(currentEnemies);
            turnOrder = BattleEngagement.rollInitiative(
                allCombatants, ENGAGEMENT.INITIATIVE_VARIANCE
            );
            turnIndex = -1;
            console.log("[Cam] WAVE INITIATIVE rerolled:", turnOrder);
            bridge.onTurnOrderChanged(turnOrder);
            done();
        });

        // Breathing pause for player to read the new field
        seq.enqueue(function(done) {
            console.log("[Cam] WAVE PAUSE", DIRECTOR_TIMING.wavePauseMs + "ms");
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
            console.log("[Cam] BATTLE END — outcome:", outcome, "hold:", (BATTLE_END ? BATTLE_END.koHoldMs : 1500) + "ms");
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
            console.log("[Cam] BATTLE RESULT delivered:", outcome);
            bridge.onBattleEnd(result);
            done();
        });
    }

    // ============================================================
    // PUBLIC API
    // ============================================================

    function start() {
        if (destroyed) { console.warn("[Director] start() blocked — destroyed"); return; }
        console.log("[Director] start() called");

        // Init AP — everyone starts at 0
        apState = BattleEngagement.initAPState(
            getAllCombatants(), ENGAGEMENT.AP_MAX
        );
        console.log("[Director] AP initialized:", Object.keys(apState));
        bridge.onAPChanged(apState);

        // Roll initiative
        turnOrder = BattleEngagement.rollInitiative(
            getAllCombatants(), ENGAGEMENT.INITIATIVE_VARIANCE
        );
        console.log("[Director] Initiative rolled:", turnOrder);
        bridge.onTurnOrderChanged(turnOrder);

        // Start first turn
        turnIndex = -1;
        advanceToNextTurn();
        console.log("[Director] seq.start() — queue should be loaded");
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

    function reset(newBState) {
        seq.clear();
        if (newBState) bState = newBState;
        apState = {};
        turnOrder = [];
        turnIndex = -1;
        waveIndex = 0;
        currentTurnId = null;
        currentEnemies = waves[0] || [];
        pendingPlayerDone = null;
        pendingCounterDone = null;
        pendingCamChainDone = null;
        // Special skill takeover cleanup
        if (activeSkillBridge) activeSkillBridge._abort();
        if (chargingLoopHandle) { chargingLoopHandle.stop(); chargingLoopHandle = null; }
        bridge.stopVFX("beam_connect");
        activeSkill = null;
        activeSkillBridge = null;
        activeSkillCasterId = null;
        pendingSkillDone = null;
        camSession.active = false;
        camSession.actionsUsed = 0;
        camSession.initiatorId = null;
        camSession.targetId = null;
        destroyed = false;
        bridge.setPhase(PHASES.INTRO);
        bridge.setTurnOwnerId(null);
        bridge.setTargetId(null);
    }

    function destroy() {
        seq.clear();
        destroyed = true;
        pendingPlayerDone = null;
        pendingCounterDone = null;
        pendingCamChainDone = null;
        // Special skill takeover cleanup
        if (activeSkillBridge) activeSkillBridge._abort();
        if (chargingLoopHandle) { chargingLoopHandle.stop(); chargingLoopHandle = null; }
        bridge.stopVFX("beam_connect");
        activeSkill = null;
        activeSkillBridge = null;
        activeSkillCasterId = null;
        pendingSkillDone = null;
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
        onPlayerCamChain:           onPlayerCamChain,
        onPlayerCamRelent:          onPlayerCamRelent,

        // Getters (view reads for rendering)
        getApState:                 getApState,
        getTurnOrder:               getTurnOrder,
        getTurnIndex:               getTurnIndex,
        getCurrentTurnId:           getCurrentTurnId,
        getWaveIndex:               getWaveIndex,

        // AP management (view needs for dodge gate)
        canAfford:                  canAfford,
        spendAP:                    spendAP,

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