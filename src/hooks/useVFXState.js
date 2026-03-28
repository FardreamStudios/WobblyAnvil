// ============================================================
// useVFXState.js — Wobbly Anvil VFX & Scene State Hook
// Owns: VFX shakes/vignettes, UI lock state,
//       active scene, character action overrides, prop overrides,
//       FX canvas ref.
// Bus: subscribes to vfx.shake.mystery, vfx.shake.weapon,
//      vfx.set.vignette, ui.set.lock.
//
// Extracted from useMysteryState.js during M-10 cleanup.
// Mystery event state (pendingMystery, goodEventUsed) moved
// to useQuestState where it belongs thematically.
// ============================================================

import { useState, useRef, useEffect } from "react";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

function useVFXState() {
    // --- VFX ---
    var [mysteryPending, setMysteryPending] = useState(false);
    var [mysteryShake, setMysteryShake] = useState(false);
    var [weaponShake, setWeaponShake] = useState(false);
    var [mysteryVignette, setMysteryVignette] = useState(null);
    var [mysteryVignetteOpacity, setMysteryVignetteOpacity] = useState(1);

    // --- Scene ---
    var [activeScene, setActiveScene] = useState("forge");
    var [sceneActionOverride, setSceneActionOverride] = useState(null);
    var [propOverrides, setPropOverrides] = useState({});
    var [tutorialHighlight, setTutorialHighlight] = useState(null);
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
        function onHighlight(payload) { setTutorialHighlight(payload.target || null); }

        GameplayEventBus.on(EVENT_TAGS.VFX_SHAKE_MYSTERY, onShakeMystery);
        GameplayEventBus.on(EVENT_TAGS.VFX_SHAKE_WEAPON, onShakeWeapon);
        GameplayEventBus.on(EVENT_TAGS.VFX_SET_VIGNETTE, onVignette);
        GameplayEventBus.on(EVENT_TAGS.UI_SET_LOCK, onLock);
        GameplayEventBus.on(EVENT_TAGS.UI_TUTORIAL_HIGHLIGHT, onHighlight);
        return function() {
            GameplayEventBus.off(EVENT_TAGS.VFX_SHAKE_MYSTERY, onShakeMystery);
            GameplayEventBus.off(EVENT_TAGS.VFX_SHAKE_WEAPON, onShakeWeapon);
            GameplayEventBus.off(EVENT_TAGS.VFX_SET_VIGNETTE, onVignette);
            GameplayEventBus.off(EVENT_TAGS.UI_SET_LOCK, onLock);
            GameplayEventBus.off(EVENT_TAGS.UI_TUTORIAL_HIGHLIGHT, onHighlight);
        };
    }, []);

    // --- Bus: Reset on New Game ---
    useEffect(function() {
        function onNewGame() {
            setMysteryPending(false);
            setMysteryShake(false); setWeaponShake(false);
            setMysteryVignette(null); setMysteryVignetteOpacity(1);
            setActiveScene("forge"); setSceneActionOverride(null); setPropOverrides({});
            setTutorialHighlight(null);
        }
        GameplayEventBus.on(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
        return function() { GameplayEventBus.off(EVENT_TAGS.GAME_SESSION_NEW, onNewGame); };
    }, []);

    return {
        // VFX
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
        tutorialHighlight: tutorialHighlight,
        fxRef: fxRef,
    };
}

export default useVFXState;