// ============================================================
// Block C — Junkyard Node Map (MAP-GRAPH)
// junkyardNodeMap.js
//
// Hand-authored 6-node graph for V1 Junkyard.
// Nodes are array-of-objects with explicit connectsTo arrays.
//
// Layout (approx positions, normalized 0-1):
//
//                [ j1 ] entrance
//                   |
//                [ j2 ] battle
//                /      \
//             [ j3 ]   [ j4 ]
//             event    battle
//                \      /
//                [ j5 ] boss
//                   |
//                [ j6 ] exit
//
// Node types & what they trigger:
//   entrance — starting marker, auto-visited
//   battle   — switches to battle sub-mode (normal)
//   event    — switches to event sub-mode (uses encounterId)
//   boss     — switches to battle sub-mode (boss flag)
//   exit     — completes the run, returns to campaign map
// ============================================================

var JUNKYARD_NODE_MAP = {
    id:          "junkyardNodeMap",
    locationId:  "junkyard",
    startNodeId: "j1",
    nodes: [
        {
            id:         "j1",
            type:       "entrance",
            label:      "Junkyard Entrance",
            position:   { x: 0.5, y: 0.1 },
            connectsTo: ["j2"]
        },
        {
            id:         "j2",
            type:       "battle",
            label:      "Scrap Heap",
            position:   { x: 0.5, y: 0.3 },
            connectsTo: ["j3", "j4"]
        },
        {
            id:          "j3",
            type:        "event",
            label:       "Strange Traveler",
            position:    { x: 0.3, y: 0.5 },
            connectsTo:  ["j5"],
            encounterId: "goblin_dagger"
        },
        {
            id:         "j4",
            type:       "battle",
            label:      "Rust Pile",
            position:   { x: 0.7, y: 0.5 },
            connectsTo: ["j5"]
        },
        {
            id:         "j5",
            type:       "boss",
            label:      "Rust Golem",
            position:   { x: 0.5, y: 0.75 },
            connectsTo: ["j6"]
        },
        {
            id:         "j6",
            type:       "exit",
            label:      "Escape",
            position:   { x: 0.5, y: 0.92 },
            connectsTo: []
        }
    ]
};

// ============================================================
// Registry — lookup by nodeMapId (scales when more locations exist)
// ============================================================

var NODE_MAPS = {
    junkyardNodeMap: JUNKYARD_NODE_MAP
};

function getNodeMapById(id) {
    return NODE_MAPS[id] || null;
}

function getNodeById(nodeMap, nodeId) {
    if (!nodeMap) return null;
    for (var i = 0; i < nodeMap.nodes.length; i++) {
        if (nodeMap.nodes[i].id === nodeId) return nodeMap.nodes[i];
    }
    return null;
}

var JunkyardNodeMap = {
    JUNKYARD_NODE_MAP: JUNKYARD_NODE_MAP,
    NODE_MAPS:         NODE_MAPS,
    getNodeMapById:    getNodeMapById,
    getNodeById:       getNodeById
};

export default JunkyardNodeMap;