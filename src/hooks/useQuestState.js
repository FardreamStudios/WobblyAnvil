// ============================================================
// useQuestState.js — Wobbly Anvil Quest & Customer State Hook
// Owns: royal quests, daily events, active customer,
//       sell tracking, promote usage.
// ============================================================

import { useState } from "react";

function useQuestState() {
    // --- Quests & Events ---
    var [royalQuest, setRoyalQuest] = useState(null);
    var [questNum, setQuestNum] = useState(0);
    var [mEvent, setMEvent] = useState(null);

    // --- Customer ---
    var [activeCustomer, setActiveCustomer] = useState(null);
    var [hasSoldWeapon, setHasSoldWeapon] = useState(false);
    var [promoteUses, setPromoteUses] = useState(0);

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