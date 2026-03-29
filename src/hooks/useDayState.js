// ============================================================
// useDayState.js — Wobbly Anvil Day/Time State Hook
// Owns: day counter, hour, stamina, game over.
// Bus: subscribes to DAY_ADVANCE_HOUR, DAY_SET_STAMINA.
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
    var [lateToastShown, setLateToastShown] = useState(false);
    var [gameOver, setGameOver] = useState(false);

    // --- Bus: Day Subscriptions ---
    var busAdvanceHour = useCallback(function(payload) {
        if (payload.hour !== undefined) setHour(payload.hour);
        else if (payload.hours !== undefined) setHour(function(h) { return h + payload.hours; });
    }, []);

    var busSetStamina = useCallback(function(payload) {
        if (payload.stamina !== undefined) setStamina(payload.stamina);
        else if (payload.delta !== undefined) setStamina(function(s) { return Math.max(0, s + payload.delta); });
    }, []);

    useEffect(function() {
        GameplayEventBus.on(EVENT_TAGS.DAY_ADVANCE_HOUR, busAdvanceHour);
        GameplayEventBus.on(EVENT_TAGS.DAY_SET_STAMINA, busSetStamina);
        return function() {
            GameplayEventBus.off(EVENT_TAGS.DAY_ADVANCE_HOUR, busAdvanceHour);
            GameplayEventBus.off(EVENT_TAGS.DAY_SET_STAMINA, busSetStamina);
        };
    }, [busAdvanceHour, busSetStamina]);

    // --- Bus: Reset on New Game ---
    useEffect(function() {
        function onNewGame() {
            setDay(1); setHour(WAKE_HOUR); setStamina(BASE_STAMINA);
            setLateToastShown(false); setGameOver(false);
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
        lateToastShown: lateToastShown,
        setLateToastShown: setLateToastShown,
        gameOver: gameOver,
        setGameOver: setGameOver,
    };
}

export default useDayState;