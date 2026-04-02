// ============================================================
// useBattleTurnLoop.js — Initiative-Driven Turn Loop Hook
//
// Replaces useBattleATBLoop.js. No RAF tick. Instead:
//   1. On mount (or wave start): roll initiative → fixed turn order
//   2. On "advance": move to next living combatant, earn AP, emit TURN_START
//   3. On TURN_END bus event: advance to next
//
// OWNS: Turn order state, turn index, AP earn on turn start,
//       dead-skip logic, wave reroll.
// DOES NOT OWN: Phase state, action resolution, cam lifecycle.
//
// Usage:
//   var turnLoop = useBattleTurnLoop({
//       bus:             battleBus,
//       running:         boolean,          // false = paused (cam active, ending, etc.)
//       combatants:      allCombatantConfigs,
//       bState:          battleStateRef.current,
//       engagement:      BattleEngagement,
//       engagementConfig: BattleConstants.ENGAGEMENT,
//       apState:         apState,
//       setApState:      setApState,
//   });
//
//   turnLoop.turnOrder       — current initiative order [id, ...]
//   turnLoop.turnIndex       — current position in order
//   turnLoop.currentTurnId   — id of combatant whose turn it is (or null)
//   turnLoop.advance()       — manually advance to next turn
//   turnLoop.reroll(combatants) — reroll initiative (wave transition)
//   turnLoop.reset()         — full reset (dev)
//
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import BATTLE_TAGS from "../battleTags.js";

function useBattleTurnLoop(opts) {
    var bus              = opts.bus;
    var running          = opts.running;
    var combatants       = opts.combatants;
    var bState           = opts.bState;
    var engagement       = opts.engagement;
    var engagementConfig = opts.engagementConfig;
    var apState          = opts.apState;
    var setApState       = opts.setApState;

    // --- Turn order state ---
    // Starts empty — call start() to roll initiative and begin.
    var [turnOrder, setTurnOrder] = useState([]);
    var [turnIndex, setTurnIndex] = useState(-1); // -1 = not started
    var [currentTurnId, setCurrentTurnId] = useState(null);

    // Refs for callbacks to read latest values without re-subscribing
    var turnOrderRef = useRef(turnOrder);
    var turnIndexRef = useRef(turnIndex);
    var runningRef = useRef(running);
    var apStateRef = useRef(apState);
    turnOrderRef.current = turnOrder;
    turnIndexRef.current = turnIndex;
    runningRef.current = running;
    apStateRef.current = apState;

    // --- Explicit start — called by BattleView when player presses Start ---
    var hasStartedRef = useRef(false);
    var start = useCallback(function() {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        var order = engagement.rollInitiative(combatants, engagementConfig.INITIATIVE_VARIANCE);
        setTurnOrder(order);
        turnOrderRef.current = order;

        bus.emit(BATTLE_TAGS.INITIATIVE_ROLLED, { turnOrder: order });

        // Start first turn
        startTurnAt(order, 0);
    }, [bus, engagement, engagementConfig, combatants]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Core: start a turn at a given index ---
    function startTurnAt(order, idx) {
        var id = order[idx];
        if (!id) return;

        // Skip dead combatants
        var state = bState.get(id);
        if (state && state.ko) {
            var nextIdx = engagement.advanceTurn(order, idx, function(cid) {
                var s = bState.get(cid);
                return !s || !s.ko;
            });
            if (nextIdx === -1) return; // everyone dead
            startTurnAt(order, nextIdx);
            return;
        }

        setTurnIndex(idx);
        turnIndexRef.current = idx;
        setCurrentTurnId(id);

        // Earn AP for this combatant — compute synchronously so ref
        // is current before TURN_START fires and BattleView reads it.
        var combatant = null;
        for (var i = 0; i < combatants.length; i++) {
            if (combatants[i].id === id) { combatant = combatants[i]; break; }
        }
        var speed = combatant ? combatant.speed : 1;

        var prevAP = apStateRef.current;
        var nextAP = engagement.earnAP(prevAP, id, speed, engagementConfig);
        apStateRef.current = nextAP;
        setApState(nextAP);

        var earned = engagement.getAP(nextAP, id) - engagement.getAP(prevAP, id);
        bus.emit(BATTLE_TAGS.AP_EARNED, {
            combatantId: id,
            amount: earned,
            newTotal: engagement.getAP(nextAP, id),
        });

        // Clear defend buffs — they last "until your next turn"
        bState.clearDefendBuffs(id);

        // Emit turn start — AP ref is already updated
        var isParty = bState.isPartyId(id);
        bus.emit(BATTLE_TAGS.TURN_START, {
            combatantId: id,
            turnIndex: idx,
            isParty: isParty,
        });
    }

    // --- Advance to next turn ---
    var advance = useCallback(function() {
        var order = turnOrderRef.current;
        var idx = turnIndexRef.current;

        var nextIdx = engagement.advanceTurn(order, idx, function(cid) {
            var s = bState.get(cid);
            return !s || !s.ko;
        });

        if (nextIdx === -1) return; // everyone dead

        // Emit turn end for current combatant
        var currentId = order[idx];
        if (currentId) {
            bus.emit(BATTLE_TAGS.TURN_END, { combatantId: currentId });
        }

        startTurnAt(order, nextIdx);
    }, [bus, bState, engagement]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Listen for TURN_END on bus to auto-advance ---
    useEffect(function() {
        function onTurnEnd() {
            console.log("[TurnLoop] TURN_END received, runningRef=" + runningRef.current);
            if (!runningRef.current) {
                console.warn("[TurnLoop] BLOCKED — runningRef is false, not advancing");
                return;
            }
            // Small delay so state settles before next turn
            setTimeout(function() {
                console.log("[TurnLoop] setTimeout fired, runningRef=" + runningRef.current);
                if (runningRef.current) {
                    console.log("[TurnLoop] advancing to next turn");
                    advance();
                } else {
                    console.warn("[TurnLoop] BLOCKED on second check — runningRef went false");
                }
            }, 50);
        }

        bus.on(BATTLE_TAGS.TURN_END, onTurnEnd);
        return function() { bus.off(BATTLE_TAGS.TURN_END, onTurnEnd); };
    }, [bus, advance]);

    // --- Reroll initiative (wave transition) ---
    var reroll = useCallback(function(newCombatants) {
        var order = engagement.rollInitiative(
            newCombatants,
            engagementConfig.INITIATIVE_VARIANCE
        );
        setTurnOrder(order);
        turnOrderRef.current = order;
        setTurnIndex(-1);
        turnIndexRef.current = -1;
        setCurrentTurnId(null);

        bus.emit(BATTLE_TAGS.INITIATIVE_ROLLED, { turnOrder: order });

        // Start first turn of new wave
        startTurnAt(order, 0);
    }, [bus, engagement, engagementConfig]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Full reset (dev) ---
    var reset = useCallback(function() {
        hasStartedRef.current = false;
        setTurnOrder([]);
        turnOrderRef.current = [];
        setTurnIndex(-1);
        turnIndexRef.current = -1;
        setCurrentTurnId(null);
    }, []);

    return {
        turnOrder: turnOrder,
        turnIndex: turnIndex,
        currentTurnId: currentTurnId,
        start: start,
        advance: advance,
        reroll: reroll,
        reset: reset,
    };
}

export default useBattleTurnLoop;