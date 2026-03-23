// ============================================================
// useUIState.js — Wobbly Anvil UI State Hook
// Owns: screen navigation, modal toggles, settings, toasts.
// Bus: subscribes to UI_ADD_TOAST (owns toast state).
// Pattern: returns flat object of state values + setters.
// App.js destructures what it needs.
// ============================================================

import { useState, useEffect } from "react";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

function useUIState() {
    // --- Screen & Navigation ---
    var [screen, setScreen] = useState("splash");
    var [showShop, setShowShop] = useState(false);
    var [showMaterials, setShowMaterials] = useState(false);
    var [showGiveUp, setShowGiveUp] = useState(false);
    var [showOptions, setShowOptions] = useState(false);
    var [showRhythmTest, setShowRhythmTest] = useState(false);

    // --- Settings (persisted via localStorage) ---
    var _saved = (function() {
        try { var raw = localStorage.getItem("wobbly_anvil_settings"); return raw ? JSON.parse(raw) : {}; } catch(e) { return {}; }
    })();
    var [handedness, setHandedness] = useState(_saved.handedness || "right");
    var [sfxVol, setSfxVol] = useState(typeof _saved.sfxVol === "number" ? _saved.sfxVol : 0.25);
    var [musicVol, setMusicVol] = useState(typeof _saved.musicVol === "number" ? _saved.musicVol : 0.25);

    // --- Persist settings on change ---
    useEffect(function() {
        try { localStorage.setItem("wobbly_anvil_settings", JSON.stringify({ handedness: handedness, sfxVol: sfxVol, musicVol: musicVol })); } catch(e) {}
    }, [handedness, sfxVol, musicVol]);

    // --- Toast System ---
    var [toasts, setToasts] = useState([]);
    var [toastQueue, setToastQueue] = useState([]);
    var [activeToast, setActiveToast] = useState(null);

    // --- Bus: Toast Subscription ---
    useEffect(function() {
        function onAddToast(payload) {
            setToasts(function(t) {
                return t.concat([{
                    id: Date.now() + Math.random(),
                    msg: payload.msg,
                    icon: payload.icon,
                    color: payload.color,
                    duration: payload.duration || null,
                    locked: payload.locked || false,
                }]);
            });
        }
        GameplayEventBus.on(EVENT_TAGS.UI_ADD_TOAST, onAddToast);
        return function() { GameplayEventBus.off(EVENT_TAGS.UI_ADD_TOAST, onAddToast); };
    }, []);

    // --- Bus: Reset on New Game ---
    useEffect(function() {
        function onNewGame() {
            setShowShop(false); setShowMaterials(false); setShowGiveUp(false);
            setShowOptions(false); setShowRhythmTest(false);
            setToasts([]); setToastQueue([]); setActiveToast(null);
        }
        GameplayEventBus.on(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
        return function() { GameplayEventBus.off(EVENT_TAGS.GAME_SESSION_NEW, onNewGame); };
    }, []);

    return {
        // Screen
        screen: screen,
        setScreen: setScreen,
        showShop: showShop,
        setShowShop: setShowShop,
        showMaterials: showMaterials,
        setShowMaterials: setShowMaterials,
        showGiveUp: showGiveUp,
        setShowGiveUp: setShowGiveUp,
        showOptions: showOptions,
        setShowOptions: setShowOptions,
        showRhythmTest: showRhythmTest,
        setShowRhythmTest: setShowRhythmTest,

        // Settings
        handedness: handedness,
        setHandedness: setHandedness,
        sfxVol: sfxVol,
        setSfxVol: setSfxVol,
        musicVol: musicVol,
        setMusicVol: setMusicVol,

        // Toasts
        toasts: toasts,
        setToasts: setToasts,
        toastQueue: toastQueue,
        setToastQueue: setToastQueue,
        activeToast: activeToast,
        setActiveToast: setActiveToast,
    };
}

export default useUIState;