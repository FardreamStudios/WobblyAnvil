// ============================================================
// useForgeState.js — Wobbly Anvil Forge State Hook
// Owns: WIP weapon, weapon/material selection, phase,
//       quality, stress, session tracking, QTE feedback.
// ============================================================

import { useState, useEffect } from "react";
import GameConstants from "../modules/constants.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

var PHASES = GameConstants.PHASES;
var MATS = GameConstants.MATS;

function useForgeState() {
    var [wipWeapon, setWipWeapon] = useState(null);
    var [wKey, setWKey] = useState("dagger");
    var [matKey, setMatKey] = useState(Object.keys(MATS)[0]);
    var [phase, setPhase] = useState(PHASES.IDLE);
    var [qualScore, setQualScore] = useState(0);
    var [stress, setStress] = useState(0);
    var [forgeSess, setForgeSess] = useState(0);
    var [bonusStrikes, setBonusStrikes] = useState(0);
    var [sessResult, setSessResult] = useState(null);
    var [forgeBubble, setForgeBubble] = useState(null);
    var [qteFlash, setQteFlash] = useState(null);
    var [strikesLeft, setStrikesLeft] = useState(0);
    var [isSandbox, setIsSandbox] = useState(false);

    // --- Bus: Reset on New Game ---
    useEffect(function() {
        function onNewGame() {
            setWipWeapon(null); setWKey("dagger"); setMatKey(Object.keys(MATS)[0]);
            setPhase(PHASES.IDLE); setQualScore(0); setStress(0); setForgeSess(0);
            setBonusStrikes(0); setSessResult(null); setForgeBubble(null);
            setQteFlash(null); setStrikesLeft(0);
            setIsSandbox(false);
        }
        GameplayEventBus.on(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
        return function() { GameplayEventBus.off(EVENT_TAGS.GAME_SESSION_NEW, onNewGame); };
    }, []);

    return {
        wipWeapon: wipWeapon,
        setWipWeapon: setWipWeapon,
        wKey: wKey,
        setWKey: setWKey,
        matKey: matKey,
        setMatKey: setMatKey,
        phase: phase,
        setPhase: setPhase,
        qualScore: qualScore,
        setQualScore: setQualScore,
        stress: stress,
        setStress: setStress,
        forgeSess: forgeSess,
        setForgeSess: setForgeSess,
        bonusStrikes: bonusStrikes,
        setBonusStrikes: setBonusStrikes,
        sessResult: sessResult,
        setSessResult: setSessResult,
        forgeBubble: forgeBubble,
        setForgeBubble: setForgeBubble,
        qteFlash: qteFlash,
        setQteFlash: setQteFlash,
        strikesLeft: strikesLeft,
        setStrikesLeft: setStrikesLeft,
        isSandbox: isSandbox,
        setIsSandbox: setIsSandbox,
    };
}

export default useForgeState;