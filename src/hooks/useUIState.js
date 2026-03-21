// ============================================================
// useUIState.js — Wobbly Anvil UI State Hook
// Owns: screen navigation, modal toggles, settings, toasts.
// Pattern: returns flat object of state values + setters.
// App.js destructures what it needs.
// ============================================================

import { useState } from "react";

function useUIState() {
    // --- Screen & Navigation ---
    var [screen, setScreen] = useState("splash");
    var [showShop, setShowShop] = useState(false);
    var [showMaterials, setShowMaterials] = useState(false);
    var [showGiveUp, setShowGiveUp] = useState(false);
    var [showOptions, setShowOptions] = useState(false);
    var [showRhythmTest, setShowRhythmTest] = useState(false);

    // --- Settings ---
    var [handedness, setHandedness] = useState("right");
    var [sfxVol, setSfxVol] = useState(0.25);
    var [musicVol, setMusicVol] = useState(0.25);

    // --- Toast System ---
    var [toasts, setToasts] = useState([]);
    var [toastQueue, setToastQueue] = useState([]);
    var [activeToast, setActiveToast] = useState(null);

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