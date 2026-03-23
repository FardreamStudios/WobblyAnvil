// ============================================================
// useQuestState.js — Wobbly Anvil Quest & Customer State Hook
// Owns: royal quests, daily events, active customer,
//       sell tracking, promote usage.
// ============================================================

import { useState, useEffect } from "react";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";

function useQuestState() {
    // --- Quests & Events ---
    var [royalQuest, setRoyalQuest] = useState(null);
    var [questNum, setQuestNum] = useState(0);
    var [mEvent, setMEvent] = useState(null);

    // --- Customer ---
    var [activeCustomer, setActiveCustomer] = useState(null);
    var [hasSoldWeapon, setHasSoldWeapon] = useState(false);
    var [promoteUses, setPromoteUses] = useState(0);

    // --- Bus: Reset on New Game ---
    useEffect(function() {
        function onNewGame() {
            setRoyalQuest(null); setQuestNum(0); setMEvent(null);
            setActiveCustomer(null); setHasSoldWeapon(false); setPromoteUses(0);
        }
        function onMorningEvent(payload) {
            setMEvent(payload);
        }
        function onDayStart() {
            setMEvent(null);
        }
        GameplayEventBus.on(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
        GameplayEventBus.on(EVENT_TAGS.DAY_MORNING_EVENT_DISPLAY, onMorningEvent);
        GameplayEventBus.on(EVENT_TAGS.DAY_CYCLE_START, onDayStart);
        return function() {
            GameplayEventBus.off(EVENT_TAGS.GAME_SESSION_NEW, onNewGame);
            GameplayEventBus.off(EVENT_TAGS.DAY_MORNING_EVENT_DISPLAY, onMorningEvent);
            GameplayEventBus.off(EVENT_TAGS.DAY_CYCLE_START, onDayStart);
        };
    }, []);

    return {
        royalQuest: royalQuest,
        setRoyalQuest: setRoyalQuest,
        questNum: questNum,
        setQuestNum: setQuestNum,
        mEvent: mEvent,
        setMEvent: setMEvent,
        activeCustomer: activeCustomer,
        setActiveCustomer: setActiveCustomer,
        hasSoldWeapon: hasSoldWeapon,
        setHasSoldWeapon: setHasSoldWeapon,
        promoteUses: promoteUses,
        setPromoteUses: setPromoteUses,
    };
}

export default useQuestState;