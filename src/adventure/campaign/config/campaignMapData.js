// ============================================================
// Block B — Campaign Map Data
// campaignMapData.js
//
// Array-of-objects table defining all campaign locations.
// V1: one entry (Junkyard).
//
// Adding a new location = append one object to this array.
// No other file needs to change (except creating its node map).
//
// Field definitions:
//   id          — unique string identifier
//   label       — display name
//   description — flavor text (shown on hover / selection)
//   unlocked    — bool; locked locations render greyed-out
//   position    — normalized 0-1 coords over the map background
//   nodeMapId   — which node map to load when this location is entered
// ============================================================

var CAMPAIGN_LOCATIONS = [
    {
        id:          "junkyard",
        label:       "Junkyard",
        description: "Grimy, comedic. Sentient garbage.",
        unlocked:    true,
        position:    { x: 0.35, y: 0.55 },
        nodeMapId:   "junkyardNodeMap"
    }
    // Future entries: goblinMines, hauntedArmory
];

var CampaignMapData = {
    CAMPAIGN_LOCATIONS: CAMPAIGN_LOCATIONS
};

export default CampaignMapData;