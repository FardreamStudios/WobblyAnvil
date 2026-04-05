// ============================================================
// Block E — Battle Sub-Mode (gameplay)
// battleSubMode.js
//
// Thin wrapper around BattleView + BattleTransition. The only
// sub-mode without its own view file — the wrapper is small
// enough to live alongside the contract export.
//
// BATTLE-WRAPPER : internal phased React component that owns
// local useState for the transitionIn → battle → transitionOut
// flow. getView returns this component so phase state can live
// in React rather than module-level globals.
//
// V1 assumption: player never loses. BattleView's onExit is
// treated as victory. Real defeat handling comes later.
// ============================================================

import React, { useState, useEffect } from "react";
import BattleViewModule from "../../../battle/BattleView.js";
import BattleTransitionModule from "../../../battle/BattleTransition.js";
import BattleConstants from "../../../battle/config/battleConstants.js";
import AdventureBattleConfigModule from "../config/adventureBattleConfig.js";
import mapSubMode from "../../map/gameplay/mapSubMode.js";

var BattleView       = BattleViewModule.BattleView;
var BattleTransition = BattleTransitionModule.BattleTransition;
var BATTLE_TRANSITION = BattleConstants.BATTLE_TRANSITION;
var buildBattleConfig = AdventureBattleConfigModule.buildBattleConfig;

// ============================================================
// BATTLE-WRAPPER — internal phased component
// ============================================================
// Phases:
//   "transitionIn"  → render BattleTransition forward, then enter battle
//   "battle"        → render BattleView; its onExit moves us to transitionOut
//   "transitionOut" → render BattleTransition reverse, then return to map
// ============================================================

function BattleSubModeView(props) {
    var ctx = props.ctx;

    // Resolve config on mount (stable for the lifetime of this wrapper).
    var [config]  = useState(function() {
        return buildBattleConfig({ isBoss: mapSubMode.getPendingBossFlag() });
    });
    var [phase, setPhase] = useState("transitionIn");

    // Clear the pending boss flag once the config has been built.
    useEffect(function() {
        mapSubMode.clearPendingBossFlag();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- transitionIn ---
    if (phase === "transitionIn") {
        return React.createElement(
            React.Fragment,
            null,
            React.createElement(BattleView, {
                handedness: ctx.handedness,
                onExit:     function() { setPhase("transitionOut"); },
                zoneName:   config.zoneName,
                waveLabel:  config.waveLabel
            }),
            React.createElement(BattleTransition, {
                config:     BATTLE_TRANSITION,
                sfx:        ctx.sfx,
                onMidpoint: function() {},
                onComplete: function() { setPhase("battle"); }
            })
        );
    }

    // --- battle ---
    if (phase === "battle") {
        return React.createElement(BattleView, {
            handedness: ctx.handedness,
            onExit:     function() { setPhase("transitionOut"); },
            zoneName:   config.zoneName,
            waveLabel:  config.waveLabel
        });
    }

    // --- transitionOut ---
    if (phase === "transitionOut") {
        var reverseConfig = Object.assign({}, BATTLE_TRANSITION, {
            flashText:       null,
            fanfareDelayMs:  -1
        });
        return React.createElement(BattleTransition, {
            config:     reverseConfig,
            reverse:    true,
            sfx:        ctx.sfx,
            onMidpoint: function() {
                if (ctx.sfx && ctx.sfx.setMode) ctx.sfx.setMode("idle");
            },
            onComplete: function() {
                // V1: BattleView onExit == victory.
                ctx.dispatch.setLastNodeResult("victory");
                ctx.switchTo("map");
            }
        });
    }

    return null;
}

// ============================================================
// Contract methods
// ============================================================

function onEnter(ctx) {
    if (ctx.sfx && ctx.sfx.setMode) {
        ctx.sfx.setMode("battle");
    }
    console.log("[battleSubMode] Entering battle (boss=" +
        mapSubMode.getPendingBossFlag() + ")");
}

function onExit(ctx) {
    if (ctx.sfx && ctx.sfx.setMode) {
        ctx.sfx.setMode("idle");
    }
}

function getView(ctx) {
    return React.createElement(BattleSubModeView, { ctx: ctx });
}

// ============================================================
// Export (SM-CONTRACT)
// ============================================================

var battleSubMode = {
    id:       "battle",
    onEnter:  onEnter,
    onExit:   onExit,
    getView:  getView
};

export default battleSubMode;