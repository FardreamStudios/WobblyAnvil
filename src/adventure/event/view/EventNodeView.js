// ============================================================
// Block D — Event Node View (pure)
// EventNodeView.js
//
// Pure presentational modal. Dimmed background + centered
// panel with title, body, and one button per choice.
//
// Props:
//   encounter — the loaded encounter object (or null)
//   onChoice  — callback(choiceId)
//
// No close button — player must pick a choice.
// ============================================================

import React from "react";

// --- Style constants ---
var STYLE_OVERLAY = {
    position:       "fixed",
    inset:          0,
    background:     "rgba(5, 3, 2, 0.88)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontFamily:     "monospace",
    color:          "#e8d7b8",
    userSelect:     "none"
};

var STYLE_PANEL = {
    width:        "min(560px, 90vw)",
    padding:      "32px 36px",
    background:   "#1f1610",
    border:       "3px solid #8a6a30",
    borderRadius: "10px",
    boxShadow:    "0 0 40px rgba(240, 192, 96, 0.3)",
    textAlign:    "center"
};

var STYLE_TITLE = {
    fontSize:      "1.6rem",
    fontWeight:    "bold",
    color:         "#f0c060",
    marginBottom:  "16px",
    letterSpacing: "0.1em"
};

var STYLE_BODY = {
    fontSize:     "1rem",
    lineHeight:   1.6,
    marginBottom: "28px",
    color:        "#c8b890",
    fontStyle:    "italic"
};

var STYLE_CHOICES = {
    display:       "flex",
    flexDirection: "column",
    gap:           "12px"
};

var STYLE_CHOICE_BTN = {
    padding:       "14px 20px",
    background:    "#3a2818",
    border:        "2px solid #8a6a30",
    color:         "#f0c060",
    fontFamily:    "monospace",
    fontSize:      "0.95rem",
    fontWeight:    "bold",
    cursor:        "pointer",
    borderRadius:  "6px",
    letterSpacing: "0.05em",
    textAlign:     "center"
};

// ============================================================
// Component
// ============================================================

function EventNodeView(props) {
    var encounter = props.encounter;
    var onChoice  = props.onChoice;

    if (!encounter) {
        return React.createElement(
            "div",
            { style: STYLE_OVERLAY },
            React.createElement(
                "div",
                { style: STYLE_PANEL },
                React.createElement("div", { style: STYLE_TITLE }, "(loading encounter...)")
            )
        );
    }

    function renderChoice(choice) {
        function handleClick() {
            if (onChoice) onChoice(choice.id);
        }
        return React.createElement(
            "button",
            { key: choice.id, style: STYLE_CHOICE_BTN, onClick: handleClick },
            choice.label
        );
    }

    return React.createElement(
        "div",
        { style: STYLE_OVERLAY },
        React.createElement(
            "div",
            { style: STYLE_PANEL },
            React.createElement("div", { style: STYLE_TITLE }, encounter.title),
            React.createElement("div", { style: STYLE_BODY }, encounter.body),
            React.createElement(
                "div",
                { style: STYLE_CHOICES },
                (encounter.choices || []).map(renderChoice)
            )
        )
    );
}

// ============================================================
// Export
// ============================================================

var EventNodeViewModule = {
    EventNodeView: EventNodeView
};

export default EventNodeViewModule;