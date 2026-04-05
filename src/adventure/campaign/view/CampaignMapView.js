// ============================================================
// Block B — Campaign Map View (pure)
// CampaignMapView.js
//
// Pure presentational component. Renders the campaign map
// background + clickable location hotspots + exit button.
//
// Props:
//   locations        — array from campaignMapData
//   onSelectLocation — callback(locationId)
//   onExit           — callback to return to main menu
//
// Zero logic. No useState, no useEffect. Props in, JSX out.
//
// V1 styling: placeholder inline styles. Art and CSS come later.
// ============================================================

import React from "react";

// --- Style constants (placeholder — swap for theme/CSS later) ---
var STYLE_ROOT = {
    position:       "fixed",
    inset:          0,
    background:     "#1a1410",
    color:          "#e8d7b8",
    fontFamily:     "monospace",
    overflow:       "hidden",
    userSelect:     "none"
};

var STYLE_TITLE = {
    position:       "absolute",
    top:            "4%",
    left:           0,
    right:          0,
    textAlign:      "center",
    fontSize:       "2.5rem",
    fontWeight:     "bold",
    letterSpacing:  "0.2em",
    color:          "#f0c060",
    textShadow:     "0 0 12px rgba(240, 192, 96, 0.5)"
};

var STYLE_SUBTITLE = {
    position:       "absolute",
    top:            "12%",
    left:           0,
    right:          0,
    textAlign:      "center",
    fontSize:       "1rem",
    opacity:        0.6,
    letterSpacing:  "0.1em"
};

var STYLE_MAP_AREA = {
    position:       "absolute",
    top:            "18%",
    left:           "5%",
    right:          "5%",
    bottom:         "12%",
    border:         "2px dashed #4a3820",
    borderRadius:   "8px",
    background:     "rgba(40, 28, 16, 0.4)"
};

var STYLE_HOTSPOT_BASE = {
    position:       "absolute",
    transform:      "translate(-50%, -50%)",
    padding:        "16px 24px",
    border:         "2px solid #8a6a30",
    borderRadius:   "6px",
    background:     "rgba(70, 45, 20, 0.85)",
    color:          "#f0c060",
    fontSize:       "1.1rem",
    fontWeight:     "bold",
    cursor:         "pointer",
    textAlign:      "center",
    minWidth:       "140px",
    boxShadow:      "0 0 16px rgba(240, 192, 96, 0.25)"
};

var STYLE_HOTSPOT_LOCKED = {
    border:         "2px solid #3a3020",
    background:     "rgba(30, 24, 16, 0.7)",
    color:          "#5a4a30",
    cursor:         "not-allowed",
    boxShadow:      "none",
    opacity:        0.5
};

var STYLE_EXIT_BTN = {
    position:       "absolute",
    bottom:         "3%",
    left:           "50%",
    transform:      "translateX(-50%)",
    padding:        "10px 28px",
    background:     "#3a1a1a",
    border:         "2px solid #7a3030",
    color:          "#e0a0a0",
    fontFamily:     "monospace",
    fontSize:       "0.9rem",
    letterSpacing:  "0.15em",
    cursor:         "pointer",
    borderRadius:   "4px"
};

// ============================================================
// Component
// ============================================================

function CampaignMapView(props) {
    var locations        = props.locations || [];
    var onSelectLocation = props.onSelectLocation;
    var onExit           = props.onExit;

    function renderHotspot(loc) {
        var style = Object.assign({}, STYLE_HOTSPOT_BASE, {
            left: (loc.position.x * 100) + "%",
            top:  (loc.position.y * 100) + "%"
        });
        if (!loc.unlocked) {
            style = Object.assign(style, STYLE_HOTSPOT_LOCKED);
        }

        function handleClick() {
            if (!loc.unlocked) return;
            if (onSelectLocation) onSelectLocation(loc.id);
        }

        return React.createElement(
            "div",
            { key: loc.id, style: style, onClick: handleClick },
            React.createElement("div", null, loc.label.toUpperCase()),
            React.createElement(
                "div",
                { style: { fontSize: "0.7rem", opacity: 0.7, marginTop: "4px", fontWeight: "normal" } },
                loc.unlocked ? loc.description : "LOCKED"
            )
        );
    }

    return React.createElement(
        "div",
        { style: STYLE_ROOT },
        React.createElement("div", { style: STYLE_TITLE }, "CAMPAIGN MAP"),
        React.createElement("div", { style: STYLE_SUBTITLE }, "Select a location to begin"),
        React.createElement(
            "div",
            { style: STYLE_MAP_AREA },
            locations.map(renderHotspot)
        ),
        React.createElement(
            "button",
            { style: STYLE_EXIT_BTN, onClick: onExit },
            "EXIT TO MENU"
        )
    );
}

// ============================================================
// Export
// ============================================================

var CampaignMapViewModule = {
    CampaignMapView: CampaignMapView
};

export default CampaignMapViewModule;