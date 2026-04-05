// ============================================================
// Block F — AdventureGameMode (top-level wiring)
// AdventureGameMode.js
//
// The ONLY adventure file App.js imports. Everything else is
// internal to src/adventure/.
//
// Responsibilities:
//   1. Instantiate shared state via useAdventureGameState
//   2. Hold the sub-mode registry (campaign, map, battle, event)
//   3. Build the ctx object passed to every sub-mode method
//   4. Fire onEnter/onExit lifecycle hooks on id changes
//   5. Render the active sub-mode's getView(ctx)
//
// Named code blocks:
//   AGM-REGISTRY  — the { campaign, map, battle, event } map
//   AGM-CONTEXT   — the ctx object built each render
//   AGM-SWITCHER  — the switchTo closure
//   AGM-LIFECYCLE — the useEffect firing onEnter/onExit
//
// Props:
//   sfx        — audio hook (pass-through to sub-modes)
//   handedness — "left" | "right" UI preference
//   onExit     — callback to return to main menu
// ============================================================

import React, { useEffect, useRef } from "react";
import useAdventureGameState from "./hooks/useAdventureGameState.js";
import campaignSubMode from "./campaign/gameplay/campaignSubMode.js";
import mapSubMode from "./map/gameplay/mapSubMode.js";
import battleSubMode from "./battle/gameplay/battleSubMode.js";
import eventSubMode from "./event/gameplay/eventSubMode.js";

// ============================================================
// AGM-REGISTRY — sub-mode map keyed by id
// ============================================================
var SUB_MODE_REGISTRY = {
    campaign: campaignSubMode,
    map:      mapSubMode,
    battle:   battleSubMode,
    event:    eventSubMode
};

// ============================================================
// Component
// ============================================================
function AdventureGameMode(props) {
    var sfx        = props.sfx;
    var handedness = props.handedness;
    var onExit     = props.onExit;

    // --- Shared state ---
    var adventure = useAdventureGameState();
    var state     = adventure.state;

    // --- Track previous sub-mode id across renders ---
    // Used by AGM-LIFECYCLE to know when to fire onExit/onEnter.
    var prevSubModeIdRef = useRef(null);

    // --- Latest ctx kept in a ref so lifecycle hooks see current state ---
    // The ctx object itself is rebuilt every render (see below);
    // we also mirror it into a ref so the useEffect body can
    // read the most recent values without re-running on every
    // state change (we only want to run on sub-mode transitions).
    var ctxRef = useRef(null);

    // ============================================================
    // AGM-SWITCHER
    // ============================================================
    function switchTo(subModeId) {
        adventure.setCurrentSubMode(subModeId);
    }

    function exitAdventure() {
        adventure.resetRun();
        if (onExit) onExit();
    }

    // ============================================================
    // AGM-CONTEXT — rebuilt every render so sub-modes always see
    // fresh state/dispatch. Sub-modes must not cache ctx across
    // renders; they receive it per-call.
    // ============================================================
    var ctx = {
        adventureState: state,
        dispatch: {
            setCurrentSubMode:  adventure.setCurrentSubMode,
            setCurrentLocation: adventure.setCurrentLocation,
            setCurrentNode:     adventure.setCurrentNode,
            markNodeVisited:    adventure.markNodeVisited,
            setRunActive:       adventure.setRunActive,
            setLastNodeResult:  adventure.setLastNodeResult,
            resetRun:           adventure.resetRun
        },
        switchTo:       switchTo,
        exitAdventure:  exitAdventure,
        sfx:            sfx,
        handedness:     handedness
    };
    ctxRef.current = ctx;

    // ============================================================
    // AGM-LIFECYCLE — fires onExit on previous + onEnter on new
    // whenever currentSubModeId changes. Also fires onEnter for
    // the initial sub-mode on first mount (prev is null).
    // ============================================================
    useEffect(function() {
        var currentId = state.currentSubModeId;
        var prevId    = prevSubModeIdRef.current;
        if (currentId === prevId) return;

        var liveCtx = ctxRef.current;

        // Exit the old one (if any)
        if (prevId) {
            var prevModule = SUB_MODE_REGISTRY[prevId];
            if (prevModule && typeof prevModule.onExit === "function") {
                prevModule.onExit(liveCtx);
            }
        }

        // Enter the new one
        var nextModule = SUB_MODE_REGISTRY[currentId];
        if (nextModule && typeof nextModule.onEnter === "function") {
            nextModule.onEnter(liveCtx);
        }

        prevSubModeIdRef.current = currentId;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.currentSubModeId]);

    // ============================================================
    // Render the active sub-mode's view
    // ============================================================
    var activeModule = SUB_MODE_REGISTRY[state.currentSubModeId];
    if (!activeModule) {
        console.warn("[AdventureGameMode] No sub-mode for id:", state.currentSubModeId);
        return null;
    }
    return activeModule.getView(ctx);
}

// ============================================================
// Plugin-style API — matches project export pattern
// ============================================================
var AdventureGameModeModule = {
    AdventureGameMode: AdventureGameMode
};

export default AdventureGameModeModule;