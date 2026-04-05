// ============================================================
// Block A — Shared State Hook
// useAdventureGameState.js
//
// Single source of truth for adventure-wide state.
// Parallel to useDayState / useForgeState in the simulator.
//
// Sub-modes read from `state` and dispatch changes via named
// action methods (setCurrentNode, setRunActive, etc.) — they
// never call setState directly.
//
// V1 state shape:
//   currentSubModeId : "campaign" | "map" | "battle" | "event"
//   currentLocation  : string | null  (e.g. "junkyard")
//   currentNodeId    : string | null  (e.g. "j1")
//   visitedNodes     : array of node ids
//   runActive        : bool  (true once a location is entered)
//   lastNodeResult   : "victory" | "defeat" | "eventResolved" | null
//
// Expansion fields (DO NOT add in V1):
//   playerHP, inventory, equippedWeapon, activeDecree, runSeed
// ============================================================

import { useState, useCallback } from "react";

// --- Initial state constants (single source of truth) ---
var INITIAL_SUB_MODE  = "campaign";
var INITIAL_LOCATION  = null;
var INITIAL_NODE_ID   = null;
var INITIAL_VISITED   = [];
var INITIAL_RUN_ACTIVE = false;
var INITIAL_LAST_RESULT = null;

function buildInitialState() {
    return {
        currentSubModeId: INITIAL_SUB_MODE,
        currentLocation:  INITIAL_LOCATION,
        currentNodeId:    INITIAL_NODE_ID,
        visitedNodes:     INITIAL_VISITED.slice(),
        runActive:        INITIAL_RUN_ACTIVE,
        lastNodeResult:   INITIAL_LAST_RESULT
    };
}

function useAdventureGameState() {
    var [state, setState] = useState(buildInitialState);

    // --- Named action methods ---
    // All wrapped in useCallback so identity is stable across renders.

    var setCurrentSubMode = useCallback(function(id) {
        setState(function(prev) {
            if (prev.currentSubModeId === id) return prev;
            return Object.assign({}, prev, { currentSubModeId: id });
        });
    }, []);

    var setCurrentLocation = useCallback(function(locationId) {
        setState(function(prev) {
            return Object.assign({}, prev, { currentLocation: locationId });
        });
    }, []);

    var setCurrentNode = useCallback(function(nodeId) {
        setState(function(prev) {
            return Object.assign({}, prev, { currentNodeId: nodeId });
        });
    }, []);

    var markNodeVisited = useCallback(function(nodeId) {
        setState(function(prev) {
            if (prev.visitedNodes.indexOf(nodeId) !== -1) return prev;
            var nextVisited = prev.visitedNodes.slice();
            nextVisited.push(nodeId);
            return Object.assign({}, prev, { visitedNodes: nextVisited });
        });
    }, []);

    var setRunActive = useCallback(function(isActive) {
        setState(function(prev) {
            return Object.assign({}, prev, { runActive: !!isActive });
        });
    }, []);

    var setLastNodeResult = useCallback(function(result) {
        setState(function(prev) {
            return Object.assign({}, prev, { lastNodeResult: result });
        });
    }, []);

    var resetRun = useCallback(function() {
        setState(function(prev) {
            // Preserve currentSubModeId so caller controls transitions.
            return Object.assign(buildInitialState(), {
                currentSubModeId: prev.currentSubModeId
            });
        });
    }, []);

    return {
        state: state,
        setCurrentSubMode:  setCurrentSubMode,
        setCurrentLocation: setCurrentLocation,
        setCurrentNode:     setCurrentNode,
        markNodeVisited:    markNodeVisited,
        setRunActive:       setRunActive,
        setLastNodeResult:  setLastNodeResult,
        resetRun:           resetRun
    };
}

export default useAdventureGameState;