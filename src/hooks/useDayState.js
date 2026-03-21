// ============================================================
// useDayState.js — Wobbly Anvil Day/Time State Hook
// Owns: day counter, hour, stamina, exhaustion, game over.
// ============================================================

import { useState } from "react";
import GameConstants from "../modules/constants.js";

var BASE_STAMINA = GameConstants.BASE_STAMINA;
var WAKE_HOUR = GameConstants.WAKE_HOUR;

function useDayState() {
    var [day, setDay] = useState(1);
    var [hour, setHour] = useState(WAKE_HOUR);
    var [stamina, setStamina] = useState(BASE_STAMINA);
    var [forcedExhaustion, setForcedExhaustion] = useState(false);
    var [lateToastShown, setLateToastShown] = useState(false);
    var [gameOver, setGameOver] = useState(false);

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