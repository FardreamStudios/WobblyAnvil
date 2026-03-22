// ============================================================
// useMysteryState.js — Wobbly Anvil Mystery & Scene State Hook
// Owns: pending mystery events, VFX shakes/vignettes,
//       active scene, character action overrides, prop overrides.
// Bus: subscribes to vfx.shake.mystery, vfx.shake.weapon,
//      vfx.set.vignette, ui.set.lock.
// ============================================================

import { useState, useRef, useEffect } from "react";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

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

    // --- Bus: VFX & Lock Subscriptions ---
    useEffect(function() {
        function onShakeMystery(payload) { setMysteryShake(payload.active); }
        function onShakeWeapon(payload) { setWeaponShake(payload.active); }
        function onVignette(payload) {
            setMysteryVignette(payload.color);
            if (payload.opacity !== undefined) setMysteryVignetteOpacity(payload.opacity);
        }
        function onLock(payload) { setMysteryPending(payload.locked); }

        GameplayEventBus.on(EVENT_TAGS.VFX_SHAKE_MYSTERY, onShakeMystery);
        GameplayEventBus.on(EVENT_TAGS.VFX_SHAKE_WEAPON, onShakeWeapon);
        GameplayEventBus.on(EVENT_TAGS.VFX_SET_VIGNETTE, onVignette);
        GameplayEventBus.on(EVENT_TAGS.UI_SET_LOCK, onLock);
        return function() {
            GameplayEventBus.off(EVENT_TAGS.VFX_SHAKE_MYSTERY, onShakeMystery);
            GameplayEventBus.off(EVENT_TAGS.VFX_SHAKE_WEAPON, onShakeWeapon);
            GameplayEventBus.off(EVENT_TAGS.VFX_SET_VIGNETTE, onVignette);
            GameplayEventBus.off(EVENT_TAGS.UI_SET_LOCK, onLock);
        };
    }, []);

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