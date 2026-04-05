// ============================================================
// Block D — Event Sub-Mode (gameplay)
// eventSubMode.js
//
// Implements the strict sub-mode contract.
// Role: hardcoded dialogue encounter with 2 choices.
//
// EVENT-CHOICE : handleChoice logs outcome, sets lastNodeResult,
//                switches back to map sub-mode.
//
// V1 handoff: reads pending encounterId from mapSubMode's
// module-level getter. See mapSubMode's handoff comment for
// why this isn't in shared state yet.
// ============================================================

import React from "react";
import EventEncountersModule from "../config/eventEncounters.js";
import EventNodeViewModule from "../view/EventNodeView.js";
import mapSubMode from "../../map/gameplay/mapSubMode.js";

var getEncounterById = EventEncountersModule.getEncounterById;
var EventNodeView    = EventNodeViewModule.EventNodeView;

// --- Module-level cache for current encounter ---
// Populated in onEnter, read in getView. Cleared in onExit.
var currentEncounter = null;

// ============================================================
// Contract methods
// ============================================================

function onEnter(ctx) {
    var encounterId = mapSubMode.getPendingEncounterId();

    if (!encounterId) {
        console.warn("[eventSubMode] No pending encounter id — returning to map");
        ctx.dispatch.setLastNodeResult("eventResolved");
        ctx.switchTo("map");
        return;
    }

    var encounter = getEncounterById(encounterId);
    if (!encounter) {
        console.warn("[eventSubMode] Encounter not found:", encounterId);
        ctx.dispatch.setLastNodeResult("eventResolved");
        ctx.switchTo("map");
        return;
    }

    currentEncounter = encounter;
    mapSubMode.clearPendingEncounterId();
    console.log("[eventSubMode] Entering event:", encounterId);
}

function onExit(ctx) {
    currentEncounter = null;
}

function getView(ctx) {
    function handleChoice(choiceId) {
        // EVENT-CHOICE
        if (!currentEncounter) return;

        var choice = null;
        for (var i = 0; i < currentEncounter.choices.length; i++) {
            if (currentEncounter.choices[i].id === choiceId) {
                choice = currentEncounter.choices[i];
                break;
            }
        }

        if (!choice) {
            console.warn("[eventSubMode] Unknown choice id:", choiceId);
            return;
        }

        console.log("[eventSubMode] " + choice.outcomeLog);
        ctx.dispatch.setLastNodeResult("eventResolved");
        ctx.switchTo("map");
    }

    return React.createElement(EventNodeView, {
        encounter: currentEncounter,
        onChoice:  handleChoice
    });
}

// ============================================================
// Export (SM-CONTRACT)
// ============================================================

var eventSubMode = {
    id:       "event",
    onEnter:  onEnter,
    onExit:   onExit,
    getView:  getView
};

export default eventSubMode;