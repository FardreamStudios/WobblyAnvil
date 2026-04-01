// ============================================================
// useBattleATBLoop.js — ATB Tick Loop Hook
//
// Extracted from BattleView.js. Runs the ATB fill loop via
// requestAnimationFrame. When a combatant's pips fill, emits
// BATTLE:ATB:READY on the battle bus.
//
// OWNS: RAF loop, tick timing, ready-check dispatch.
// DOES NOT OWN: Phase state, turn routing, AI decisions.
//
// Usage:
//   useBattleATBLoop({
//       bus:          battleBus,
//       running:      atbRunning,
//       frozen:       atbFrozen,
//       combatants:   allCombatantConfigs,
//       bState:       battleStateRef.current,
//       atbModule:    BattleATB,
//       atbValuesRef: atbValuesRef,
//       setAtbValues: setAtbValues,
//   });
//
// The hook does NOT set phase or turnOwnerId — it emits
// ATB_READY on the bus and the subscriber (BattleView or
// a future turn manager) handles routing.
// ============================================================

import { useEffect, useRef } from "react";
import BATTLE_TAGS from "../battleTags.js";

function useBattleATBLoop(opts) {
    var bus       = opts.bus;
    var running   = opts.running;
    var frozen    = opts.frozen;
    var combatants = opts.combatants;   // config array (TEST_PARTY + currentEnemies)
    var bState    = opts.bState;        // mutable battle state instance
    var atbModule = opts.atbModule;     // BattleATB module
    var atbValuesRef = opts.atbValuesRef;
    var setAtbValues = opts.setAtbValues;

    // Keep latest values in refs so the RAF closure reads current data
    var runningRef = useRef(running);
    var frozenRef  = useRef(frozen);
    var combatantsRef = useRef(combatants);
    runningRef.current  = running;
    frozenRef.current   = frozen;
    combatantsRef.current = combatants;

    // Track ready ID across frames without triggering re-render
    var readyIdRef = useRef(null);

    useEffect(function() {
        if (!running) return;
        var lastTime = 0;
        var rafId = null;

        function tick(ts) {
            if (!runningRef.current) return;
            if (!lastTime) { lastTime = ts; rafId = requestAnimationFrame(tick); return; }
            var dt = (ts - lastTime) / 1000;
            lastTime = ts;
            if (dt > 0.1) dt = 0.1; // cap delta to prevent spiral

            setAtbValues(function(prev) {
                // Filter out KO'd combatants — dead don't charge ATB
                var liveCombatants = combatantsRef.current.filter(function(c) {
                    var s = bState.get(c.id);
                    return !s || !s.ko;
                });
                var result = atbModule.tick(dt, prev, liveCombatants, frozenRef.current);
                if (result.readyId) {
                    readyIdRef.current = result.readyId;
                }
                return result.nextState;
            });

            if (readyIdRef.current) {
                var whoIsReady = readyIdRef.current;
                readyIdRef.current = null;

                // Skip KO'd combatants
                var readyState = bState.get(whoIsReady);
                if (readyState && readyState.ko) {
                    rafId = requestAnimationFrame(tick);
                    return;
                }

                // Emit on bus — subscriber handles phase/turn routing
                if (bus) {
                    bus.emit(BATTLE_TAGS.ATB_READY, { combatantId: whoIsReady });
                }
                return;
            }

            rafId = requestAnimationFrame(tick);
        }

        rafId = requestAnimationFrame(tick);
        return function() { if (rafId) cancelAnimationFrame(rafId); };
    }, [running]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ============================================================
// Export
// ============================================================
export default useBattleATBLoop;