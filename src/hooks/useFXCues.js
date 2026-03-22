// ============================================================
// useFXCues.js — Wobbly Anvil FX Cue Router
// Subscribes to all tags in the FX Cue Registry and calls
// each cue's execute(sfx, fxRef, payload) when fired.
//
// UE ANALOGY: GameplayCueManager — dumb plumbing that routes
// tags to self-contained cue objects. Knows nothing about
// what any cue actually does.
//
// WIRING: Called once in App.js with sfx + fxRef.
//   useFXCues({ sfx: sfx, fxRef: fxRef });
//
// ADDING CUES: Add to fxCueRegistry.js — this file never
// needs to change.
// ============================================================

import { useEffect, useRef } from "react";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import FX_CUES from "../config/fxCueRegistry.js";

function useFXCues(deps) {
    var sfx = deps.sfx;
    var fxRef = deps.fxRef;

    // Keep stable refs so subscriptions don't churn
    var sfxRef = useRef(sfx);
    sfxRef.current = sfx;
    var fxRefRef = useRef(fxRef);
    fxRefRef.current = fxRef;

    useEffect(function() {
        // Build handler for each registered cue
        var handlers = FX_CUES.map(function(cue) {
            var handler = function(payload) {
                cue.execute(sfxRef.current, fxRefRef.current, payload || {});
            };
            GameplayEventBus.on(cue.tag, handler);
            return { tag: cue.tag, handler: handler };
        });

        // Cleanup all subscriptions
        return function() {
            for (var i = 0; i < handlers.length; i++) {
                GameplayEventBus.off(handlers[i].tag, handlers[i].handler);
            }
        };
    }, []); // Empty deps — refs keep it current without re-subscribing
}

export default useFXCues;