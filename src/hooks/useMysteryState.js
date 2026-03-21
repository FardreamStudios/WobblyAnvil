// ============================================================
// useMysteryState.js — Wobbly Anvil Mystery & Scene State Hook
// Owns: pending mystery events, VFX shakes/vignettes,
//       active scene, character action overrides, prop overrides.
// ============================================================

import { useState, useRef } from "react";

function useMysteryState() {
    // --- Mystery Events ---
    var [pendingMystery, setPendingMystery] = useState(null);
    var [goodEventUsed, setGoodEventUsed] = useState(false);
    var [mysteryPending, setMysteryPending] = useState(false);
    var [mysteryShake, setMysteryShake] = useState(false);
    var [weaponShake, setWeaponShake] = useState(false);
    var [mysteryVignette, setMysteryVignette] = useState(null);
    var [mysteryVignetteOpacity, setMysteryVignetteOpacity] = useState(1);

    // --- Scene ---
    var [activeScene, setActiveScene] = useState("forge");
    var [sceneActionOverride, setSceneActionOverride] = useState(null);
    var [propOverrides, setPropOverrides] = useState({});
    var fxRef = useRef(null);

    return {
        // Mystery
        pendingMystery: pendingMystery,
        setPendingMystery: setPendingMystery,
        goodEventUsed: goodEventUsed,
        setGoodEventUsed: setGoodEventUsed,
        mysteryPending: mysteryPending,
        setMysteryPending: setMysteryPending,
        mysteryShake: mysteryShake,
        setMysteryShake: setMysteryShake,
        weaponShake: weaponShake,
        setWeaponShake: setWeaponShake,
        mysteryVignette: mysteryVignette,
        setMysteryVignette: setMysteryVignette,
        mysteryVignetteOpacity: mysteryVignetteOpacity,
        setMysteryVignetteOpacity: setMysteryVignetteOpacity,

        // Scene
        activeScene: activeScene,
        setActiveScene: setActiveScene,
        sceneActionOverride: sceneActionOverride,
        setSceneActionOverride: setSceneActionOverride,
        propOverrides: propOverrides,
        setPropOverrides: setPropOverrides,
        fxRef: fxRef,
    };
}

export default useMysteryState;