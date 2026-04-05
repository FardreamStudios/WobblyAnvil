// ============================================================
// Block D — Event Encounters (EVENT-TABLE)
// eventEncounters.js
//
// Array-of-objects table. V1 has one hardcoded encounter.
// Outcomes are console.log only — no state changes in V1.
//
// Expansion: add reward/debuff/flag fields to `choices[n]`
// when real outcome effects land.
//
// Field definitions:
//   id      — unique encounter id (referenced by node.encounterId)
//   title   — panel heading
//   body    — flavor text shown above choices
//   choices — array of { id, label, outcomeLog [, futureFields] }
// ============================================================

var EVENT_ENCOUNTERS = [
    {
        id:    "goblin_dagger",
        title: "Strange Traveler",
        body:  "A ragged goblin sits by a fire, poking at a rusty dagger. He looks up as you approach.",
        choices: [
            {
                id:         "repair",
                label:      "Offer to repair it",
                outcomeLog: "Player offered to repair the goblin's dagger."
                // Future: reward, relationshipFlag, questUnlock, etc.
            },
            {
                id:         "force",
                label:      "Take it by force",
                outcomeLog: "Player took the dagger by force."
                // Future: item grant, reputation penalty, etc.
            }
        ]
    }
];

// --- Lookup helper ---
function getEncounterById(id) {
    for (var i = 0; i < EVENT_ENCOUNTERS.length; i++) {
        if (EVENT_ENCOUNTERS[i].id === id) return EVENT_ENCOUNTERS[i];
    }
    return null;
}

var EventEncounters = {
    EVENT_ENCOUNTERS:  EVENT_ENCOUNTERS,
    getEncounterById:  getEncounterById
};

export default EventEncounters;