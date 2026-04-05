// ============================================================
// Block C — Node Map View (pure)
// NodeMapView.js
//
// Pure presentational. Renders the node graph as SVG lines
// (connections) + absolutely-positioned divs (nodes).
//
// Props:
//   nodeMap       — the full graph config
//   currentNodeId — which node the player is on
//   visitedNodes  — array of visited node ids
//   onSelectNode  — callback(nodeId) on click
//
// Visual states per node:
//   current   — highlighted yellow, pulsing
//   available — glowing, clickable (in current's connectsTo)
//   visited   — dim, non-clickable
//   locked    — grey, non-clickable (default)
//
// V1 styling: placeholder inline styles.
// ============================================================

import React from "react";

// --- Style constants ---
var STYLE_ROOT = {
    position:   "fixed",
    inset:      0,
    background: "#0f0a08",
    color:      "#e8d7b8",
    fontFamily: "monospace",
    overflow:   "hidden",
    userSelect: "none"
};

var STYLE_TITLE = {
    position:      "absolute",
    top:           "2%",
    left:          0,
    right:         0,
    textAlign:     "center",
    fontSize:      "1.5rem",
    fontWeight:    "bold",
    letterSpacing: "0.15em",
    color:         "#d0a040",
    opacity:       0.9
};

var STYLE_MAP_AREA = {
    position: "absolute",
    top:      "8%",
    left:     "5%",
    right:    "5%",
    bottom:   "4%"
};

var STYLE_SVG = {
    position:      "absolute",
    inset:         0,
    width:         "100%",
    height:        "100%",
    pointerEvents: "none"
};

var STYLE_NODE_BASE = {
    position:      "absolute",
    transform:     "translate(-50%, -50%)",
    padding:       "10px 14px",
    minWidth:      "110px",
    textAlign:     "center",
    border:        "2px solid #6a5030",
    borderRadius:  "6px",
    background:    "rgba(40, 28, 16, 0.85)",
    color:         "#b0a080",
    fontSize:      "0.75rem",
    fontWeight:    "bold",
    cursor:        "default",
    transition:    "all 0.2s ease"
};

var STYLE_NODE_CURRENT = {
    border:     "3px solid #f0c060",
    background: "rgba(90, 60, 20, 0.95)",
    color:      "#ffffff",
    boxShadow:  "0 0 24px rgba(240, 192, 96, 0.8)"
};

var STYLE_NODE_AVAILABLE = {
    border:     "2px solid #90d070",
    background: "rgba(40, 70, 30, 0.85)",
    color:      "#d0ffb0",
    cursor:     "pointer",
    boxShadow:  "0 0 14px rgba(144, 208, 112, 0.45)"
};

var STYLE_NODE_VISITED = {
    border:     "2px solid #4a3820",
    background: "rgba(25, 18, 10, 0.7)",
    color:      "#6a5838",
    opacity:    0.6
};

// ============================================================
// Type → label text
// ============================================================
var TYPE_BADGES = {
    entrance: "START",
    battle:   "BATTLE",
    event:    "EVENT",
    boss:     "BOSS",
    exit:     "ESCAPE"
};

// ============================================================
// Component
// ============================================================

function NodeMapView(props) {
    var nodeMap       = props.nodeMap;
    var currentNodeId = props.currentNodeId;
    var visitedNodes  = props.visitedNodes || [];
    var onSelectNode  = props.onSelectNode;

    if (!nodeMap) {
        return React.createElement(
            "div",
            { style: STYLE_ROOT },
            React.createElement("div", { style: STYLE_TITLE }, "(no node map loaded)")
        );
    }

    // --- Build lookup for lines ---
    var nodeLookup = {};
    nodeMap.nodes.forEach(function(n) { nodeLookup[n.id] = n; });

    var currentNode = nodeLookup[currentNodeId] || null;
    var availableIds = currentNode ? currentNode.connectsTo : [];

    function isVisited(id) {
        return visitedNodes.indexOf(id) !== -1;
    }
    function isAvailable(id) {
        return availableIds.indexOf(id) !== -1;
    }

    // --- Render connection lines (SVG) ---
    function renderLines() {
        var lines = [];
        nodeMap.nodes.forEach(function(node) {
            node.connectsTo.forEach(function(targetId) {
                var target = nodeLookup[targetId];
                if (!target) return;
                var isActive = (node.id === currentNodeId) || (targetId === currentNodeId);
                var stroke   = isActive ? "#f0c060" : "#4a3820";
                var width    = isActive ? 3 : 2;
                lines.push(React.createElement("line", {
                    key:         node.id + "->" + targetId,
                    x1:          (node.position.x * 100) + "%",
                    y1:          (node.position.y * 100) + "%",
                    x2:          (target.position.x * 100) + "%",
                    y2:          (target.position.y * 100) + "%",
                    stroke:      stroke,
                    strokeWidth: width,
                    strokeDasharray: isActive ? "none" : "6,4",
                    opacity:     isActive ? 0.9 : 0.5
                }));
            });
        });
        return React.createElement("svg", { style: STYLE_SVG }, lines);
    }

    // --- Render a single node ---
    function renderNode(node) {
        var style = Object.assign({}, STYLE_NODE_BASE, {
            left: (node.position.x * 100) + "%",
            top:  (node.position.y * 100) + "%"
        });

        var clickable = false;
        if (node.id === currentNodeId) {
            style = Object.assign(style, STYLE_NODE_CURRENT);
        } else if (isAvailable(node.id)) {
            style = Object.assign(style, STYLE_NODE_AVAILABLE);
            clickable = true;
        } else if (isVisited(node.id)) {
            style = Object.assign(style, STYLE_NODE_VISITED);
        }
        // else: locked (base styling)

        function handleClick() {
            if (!clickable) return;
            if (onSelectNode) onSelectNode(node.id);
        }

        var badge = TYPE_BADGES[node.type] || node.type.toUpperCase();

        return React.createElement(
            "div",
            { key: node.id, style: style, onClick: handleClick },
            React.createElement(
                "div",
                { style: { fontSize: "0.65rem", opacity: 0.8, marginBottom: "3px" } },
                badge
            ),
            React.createElement("div", null, node.label)
        );
    }

    return React.createElement(
        "div",
        { style: STYLE_ROOT },
        React.createElement("div", { style: STYLE_TITLE }, "JUNKYARD"),
        React.createElement(
            "div",
            { style: STYLE_MAP_AREA },
            renderLines(),
            nodeMap.nodes.map(renderNode)
        )
    );
}

// ============================================================
// Export
// ============================================================

var NodeMapViewModule = {
    NodeMapView: NodeMapView
};

export default NodeMapViewModule;