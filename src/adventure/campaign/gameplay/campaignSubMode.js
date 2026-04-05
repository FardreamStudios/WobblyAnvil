// ============================================================
// Block B — Campaign Sub-Mode (gameplay)
// campaignSubMode.js
//
// Implements the strict sub-mode contract:
//   { id, onEnter, onExit, getView }
//
// Role: top-level location selector. Shown when the player
// enters adventure mode and when they return from a run.
//
// CAMPAIGN-SELECT: handleSelectLocation drives the transition
// from campaign map into a location's node map.
// ============================================================

import React from "react";
import CampaignMapDataModule from "../config/campaignMapData.js";
import CampaignMapViewModule from "../view/CampaignMapView.js";

var CAMPAIGN_LOCATIONS = CampaignMapDataModule.CAMPAIGN_LOCATIONS;
var CampaignMapView = CampaignMapViewModule.CampaignMapView;

// ============================================================
// Contract methods
// ============================================================

function onEnter(ctx) {
    // Returning from a run → clear stale run state.
    ctx.dispatch.setCurrentLocation(null);
    ctx.dispatch.setCurrentNode(null);
    ctx.dispatch.setRunActive(false);
    ctx.dispatch.setLastNodeResult(null);
    console.log("[campaignSubMode] Entered campaign map");
}

function onExit(ctx) {
    // V1 no-op.
}

function getView(ctx) {
    function handleSelectLocation(locationId) {
        // CAMPAIGN-SELECT
        ctx.dispatch.setCurrentLocation(locationId);
        ctx.dispatch.setRunActive(true);
        ctx.switchTo("map");
    }

    function handleExit() {
        ctx.exitAdventure();
    }

    return React.createElement(CampaignMapView, {
        locations:         CAMPAIGN_LOCATIONS,
        onSelectLocation:  handleSelectLocation,
        onExit:            handleExit
    });
}

// ============================================================
// Export (SM-CONTRACT shape)
// ============================================================

var campaignSubMode = {
    id:       "campaign",
    onEnter:  onEnter,
    onExit:   onExit,
    getView:  getView
};

export default campaignSubMode;