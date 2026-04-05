// ============================================================
// Block C — Map Sub-Mode (gameplay)
// mapSubMode.js
//
// Implements the strict sub-mode contract.
// Role: node graph traversal within a location.
//
// MAP-TRAVERSAL : handleNodeClick — validates + branches on type
// MAP-RESULT    : onEnter reads lastNodeResult and handles return
//                 from battle/event sub-modes
//
// V1 inter-submode handoff:
//   - Pending encounter id for event nodes is stored on a
//     module-level var (mapPendingEncounterId). The event
//     sub-mode reads it on enter. This keeps the shared state
//     hook lean; when we add more inter-submode data in V2
//     it'll move into useAdventureGameState.
//   - Boss/normal battle flag stored similarly
//     (mapPendingBossFlag).
// ============================================================

import React from "react";
import JunkyardNodeMapModule from "../config/junkyardNodeMap.js";
import NodeMapViewModule from "../view/NodeMapView.js";

var getNodeMapById = JunkyardNodeMapModule.getNodeMapById;
var getNodeById    = JunkyardNodeMapModule.getNodeById;
var NodeMapView    = NodeMapViewModule.NodeMapView;

// ============================================================
// Module-level handoff vars (V1 bridge between sub-modes)
// ============================================================

var mapPendingEncounterId = null;
var mapPendingBossFlag    = false;
var mapLoadedNodeMap      = null;  // cached reference to current location's node map

// Public getters so other sub-modes can read without importing private state.
function getPendingEncounterId() {
    return mapPendingEncounterId;
}
function clearPendingEncounterId() {
    mapPendingEncounterId = null;
}
function getPendingBossFlag() {
    return mapPendingBossFlag;
}
function clearPendingBossFlag() {
    mapPendingBossFlag = false;
}

// ============================================================
// Location → nodeMapId resolution
// V1 hardcodes the single location. Expansion: look up via
// campaignMapData.CAMPAIGN_LOCATIONS by currentLocation.
// ============================================================

function resolveNodeMapIdForLocation(locationId) {
    if (locationId === "junkyard") return "junkyardNodeMap";
    return null;
}

// ============================================================
// Contract methods
// ============================================================

function onEnter(ctx) {
    var locationId = ctx.adventureState.currentLocation;
    var nodeMapId  = resolveNodeMapIdForLocation(locationId);
    var nodeMap    = getNodeMapById(nodeMapId);

    if (!nodeMap) {
        console.warn("[mapSubMode] No node map for location:", locationId);
        ctx.switchTo("campaign");
        return;
    }

    mapLoadedNodeMap = nodeMap;

    var lastResult = ctx.adventureState.lastNodeResult;

    // MAP-RESULT: handle return from a child sub-mode.
    if (lastResult === "victory" || lastResult === "eventResolved") {
        // Mark current node visited, stay on map for next selection.
        var currentId = ctx.adventureState.currentNodeId;
        if (currentId) {
            ctx.dispatch.markNodeVisited(currentId);
        }
        ctx.dispatch.setLastNodeResult(null);
        console.log("[mapSubMode] Returned to map after " + lastResult);
        return;
    }

    if (lastResult === "defeat") {
        console.log("[mapSubMode] Run ended in defeat");
        ctx.dispatch.setLastNodeResult(null);
        ctx.dispatch.resetRun();
        ctx.switchTo("campaign");
        return;
    }

    // Fresh entry (no lastResult) → initialize to start node.
    if (!ctx.adventureState.currentNodeId) {
        ctx.dispatch.setCurrentNode(nodeMap.startNodeId);
        ctx.dispatch.markNodeVisited(nodeMap.startNodeId);
        console.log("[mapSubMode] Entered node map, start node:", nodeMap.startNodeId);
    }
}

function onExit(ctx) {
    // V1 no-op.
}

function getView(ctx) {
    var nodeMap = mapLoadedNodeMap || getNodeMapById(
        resolveNodeMapIdForLocation(ctx.adventureState.currentLocation)
    );

    function handleNodeClick(nodeId) {
        // MAP-TRAVERSAL
        if (!nodeMap) return;

        var currentId   = ctx.adventureState.currentNodeId;
        var currentNode = getNodeById(nodeMap, currentId);
        if (!currentNode) return;

        // Validate connection — can only move to connected nodes.
        if (currentNode.connectsTo.indexOf(nodeId) === -1) {
            console.log("[mapSubMode] Node not reachable from current:", nodeId);
            return;
        }

        var targetNode = getNodeById(nodeMap, nodeId);
        if (!targetNode) return;

        // Move the player marker.
        ctx.dispatch.setCurrentNode(nodeId);

        // Branch on type.
        if (targetNode.type === "battle") {
            mapPendingBossFlag = false;
            ctx.switchTo("battle");
            return;
        }
        if (targetNode.type === "boss") {
            mapPendingBossFlag = true;
            ctx.switchTo("battle");
            return;
        }
        if (targetNode.type === "event") {
            mapPendingEncounterId = targetNode.encounterId || null;
            ctx.switchTo("event");
            return;
        }
        if (targetNode.type === "exit") {
            ctx.dispatch.markNodeVisited(nodeId);
            ctx.dispatch.resetRun();
            ctx.switchTo("campaign");
            return;
        }
        // entrance / unknown — just mark visited
        ctx.dispatch.markNodeVisited(nodeId);
    }

    return React.createElement(NodeMapView, {
        nodeMap:        nodeMap,
        currentNodeId:  ctx.adventureState.currentNodeId,
        visitedNodes:   ctx.adventureState.visitedNodes,
        onSelectNode:   handleNodeClick
    });
}

// ============================================================
// Export (SM-CONTRACT + handoff getters)
// ============================================================

var mapSubMode = {
    id:       "map",
    onEnter:  onEnter,
    onExit:   onExit,
    getView:  getView,

    // Handoff accessors for other sub-modes (event, battle)
    getPendingEncounterId:   getPendingEncounterId,
    clearPendingEncounterId: clearPendingEncounterId,
    getPendingBossFlag:      getPendingBossFlag,
    clearPendingBossFlag:    clearPendingBossFlag
};

export default mapSubMode;