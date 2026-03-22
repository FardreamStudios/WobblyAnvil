// ============================================================
// useGameMode.js — Wobbly Anvil GameMode React Hook Wrapper
// Bridges the pure JS GameMode core to React's rendering layer.
//
// OWNS:
//   GameMode initialization (init + sub-mode registration)
//   Bus subscriptions that sync GameMode state → React state
//   Reactive values for components (day, dayPhase, activeMode)
//
// DOES NOT OWN:
//   Game rules (gameMode.js owns those)
//   Sub-mode internals (forgeMode.js, etc. own those)
//   State mutations (state hooks own those)
//
// UE ANALOGY: The Blueprint GameMode wrapper. gameMode.js is
// the C++ base class; this hook is the project-level Blueprint
// that connects it to the world (React).
//
// USAGE:
//   var gm = useGameMode({ bus: GameplayEventBus });
//   gm.day        // reactive day number
//   gm.dayPhase   // reactive day phase string
//   gm.activeMode // reactive sub-mode id or null
//   gm.startDay(n)
//   gm.sleep(hour)
//   gm.enterMode("forge")
//   gm.exitMode()
//
// REPLACES: D-Lite ForgeMode.onEnter stopgap in App.js.
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import GameMode from "../gameMode/gameMode.js";
import ForgeMode from "../gameMode/forgeMode.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

// ============================================================
// Hook
// ============================================================

function useGameMode(deps) {
    var bus = (deps && deps.bus) || GameplayEventBus;
    var stateProvider = deps && deps.stateProvider || null;
    var abilityManager = deps && deps.abilityManager || null;

    // --- React state mirrors of GameMode internals ---
    var [day, setDay] = useState(0);
    var [dayPhase, setDayPhase] = useState("idle");
    var [activeMode, setActiveMode] = useState(null);
    var [isGameOver, setIsGameOver] = useState(false);

    // --- Init guard ---
    var initialized = useRef(false);

    // --- Initialize GameMode + register sub-modes (once) ---
    useEffect(function() {
        if (initialized.current) return;
        initialized.current = true;

        GameMode.init(bus, stateProvider, abilityManager);
        GameMode.registerSubMode(ForgeMode);

        // Enter forge as default mode (current game only has forge)
        GameMode.enterMode("forge");

        return function() {
            GameMode.reset();
            initialized.current = false;
        };
    }, []);

    // --- Bus subscriptions: sync GameMode state → React ---
    useEffect(function() {
        function onDayStart(payload) {
            setDay(payload.day || 0);
            setDayPhase("morning");
        }
        function onShopOpen() {
            setDayPhase("open");
        }
        function onLateStart() {
            setDayPhase("late");
        }
        function onSleepStart() {
            setDayPhase("sleeping");
        }
        function onDayEnd() {
            setDayPhase("idle");
        }
        function onModeForgeEnter() {
            setActiveMode("forge");
        }
        function onModeForgeExit() {
            setActiveMode(null);
        }
        function onGameOver() {
            setIsGameOver(true);
        }
        function onNewGame() {
            setDay(0);
            setDayPhase("idle");
            setActiveMode(null);
            setIsGameOver(false);
        }

        bus.on(EVENT_TAGS.DAY_CYCLE_START, onDayStart);
        bus.on(EVENT_TAGS.DAY_SHOP_OPEN, onShopOpen);
        bus.on(EVENT_TAGS.DAY_LATE_START, onLateStart);
        bus.on(EVENT_TAGS.DAY_SLEEP_START, onSleepStart);
        bus.on(EVENT_TAGS.DAY_CYCLE_END, onDayEnd);
        bus.on(EVENT_TAGS.MODE_FORGE_ENTER, onModeForgeEnter);
        bus.on(EVENT_TAGS.MODE_FORGE_EXIT, onModeForgeExit);
        bus.on(EVENT_TAGS.GAME_SESSION_OVER, onGameOver);
        bus.on(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);

        return function() {
            bus.off(EVENT_TAGS.DAY_CYCLE_START, onDayStart);
            bus.off(EVENT_TAGS.DAY_SHOP_OPEN, onShopOpen);
            bus.off(EVENT_TAGS.DAY_LATE_START, onLateStart);
            bus.off(EVENT_TAGS.DAY_SLEEP_START, onSleepStart);
            bus.off(EVENT_TAGS.DAY_CYCLE_END, onDayEnd);
            bus.off(EVENT_TAGS.MODE_FORGE_ENTER, onModeForgeEnter);
            bus.off(EVENT_TAGS.MODE_FORGE_EXIT, onModeForgeExit);
            bus.off(EVENT_TAGS.GAME_SESSION_OVER, onGameOver);
            bus.off(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
        };
    }, [bus]);

    // --- Action wrappers (stable refs for consumers) ---
    var startDay = useCallback(function(dayNumber) {
        GameMode.startDay(dayNumber);
    }, []);

    var triggerLate = useCallback(function() {
        GameMode.triggerLate();
    }, []);

    var sleep = useCallback(function(sleepHour) {
        GameMode.sleep(sleepHour);
    }, []);

    var enterMode = useCallback(function(modeId) {
        return GameMode.enterMode(modeId);
    }, []);

    var exitMode = useCallback(function() {
        GameMode.exitMode();
    }, []);

    var triggerGameOver = useCallback(function(reason) {
        GameMode.triggerGameOver(reason);
    }, []);

    var newGame = useCallback(function() {
        GameMode.newGame();
        // Re-enter forge as default
        GameMode.enterMode("forge");
    }, []);

    // ============================================================
    // Return — reactive state + action wrappers
    // ============================================================

    return {
        // --- Reactive State ---
        day: day,
        dayPhase: dayPhase,
        activeMode: activeMode,
        isGameOver: isGameOver,

        // --- Actions ---
        startDay: startDay,
        triggerLate: triggerLate,
        sleep: sleep,
        enterMode: enterMode,
        exitMode: exitMode,
        triggerGameOver: triggerGameOver,
        newGame: newGame,

        // --- Direct access (escape hatch for edge cases) ---
        core: GameMode,
    };
}

export default useGameMode;