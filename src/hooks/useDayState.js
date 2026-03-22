// ============================================================
// useDayState.js — Wobbly Anvil Day/Time State Hook
// Owns: day counter, hour, stamina, exhaustion, game over.
// Bus: subscribes to DAY_ADVANCE_HOUR, DAY_SET_STAMINA,
//      DAY_FORCE_EXHAUSTION.
// ============================================================

import { useState, useEffect, useCallback } from "react";
import GameConstants from "../modules/constants.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

var BASE_STAMINA = GameConstants.BASE_STAMINA;
var WAKE_HOUR = GameConstants.WAKE_HOUR;

function useDayState() {
    var [day, setDay] = useState(1);
    var [hour, setHour] = useState(WAKE_HOUR);
    var [stamina, setStamina] = useState(BASE_STAMINA);
    var [forcedExhaustion, setForcedExhaustion] = useState(false);
    var [lateToastShown, setLateToastShown] = useState(false);
    var [gameOver, setGameOver] = useState(false);

    // --- Bus: Day Subscriptions ---
    var busAdvanceHour = useCallback(function(payload) {
        if (payload.hour !== undefined) setHour(payload.hour);
    }, []);

    var busSetStamina = useCallback(function(payload) {
        if (payload.stamina !== undefined) setStamina(payload.stamina);
    }, []);

    var busForceExhaustion = useCallback(function() {
        setForcedExhaustion(true);
    }, []);

    useEffect(function() {
        GameplayEventBus.on(EVENT_TAGS.DAY_ADVANCE_HOUR, busAdvanceHour);
        GameplayEventBus.on(EVENT_TAGS.DAY_SET_STAMINA, busSetStamina);
        GameplayEventBus.on(EVENT_TAGS.DAY_FORCE_EXHAUSTION, busForceExhaustion);
        return function() {
            GameplayEventBus.off(EVENT_TAGS.DAY_ADVANCE_HOUR, busAdvanceHour);
            GameplayEventBus.off(EVENT_TAGS.DAY_SET_STAMINA, busSetStamina);
            GameplayEventBus.off(EVENT_TAGS.DAY_FORCE_EXHAUSTION, busForceExhaustion);
        };
    }, [busAdvanceHour, busSetStamina, busForceExhaustion]);

    // --- Bus: Reset on New Game ---
    useEffect(function() {
        function onNewGame() {
            setDay(1); setHour(WAKE_HOUR); setStamina(BASE_STAMINA);
            setForcedExhaustion(false); setLateToastShown(false); setGameOver(false);
        }
        GameplayEventBus.on(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
        return function() { GameplayEventBus.off(EVENT_TAGS.GAME_SESSION_NEW, onNewGame); };
    }, []);

    return {
        day: day,
        setDay: setDay,
        hour: hour,
        setHour: setHour,
        stamina: stamina,
        setStamina: setStamina,
        forcedExhaustion: forcedExhaustion,
        setForcedExhaustion: setForcedExhaustion,
        lateToastShown: lateToastShown,
        setLateToastShown: setLateToastShown,
        gameOver: gameOver,
        setGameOver: setGameOver,
    };
}

export default useDayState;