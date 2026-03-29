// ============================================================
// ScavengeMenu.js — Scavenge Choice Overlay
//
// Shown when player taps Scavenge from idle.
// Two options: Quick Scavenge (old random roll) or
// Extended Scavenge (enters battle mode).
//
// Pure view — receives callbacks, owns zero state.
// Lives in src/battle/ because it's the entry point
// to the battle system.
//
// Props:
//   onQuickScavenge — fires old random roll + closes menu
//   onExtendedScavenge — enters battle mode
//   onCancel — closes menu, returns to idle
//   handedness — "left" | "right" (button positioning)
//   staminaCost — stamina cost shown for extended (display only)
//   hourCost — hour cost shown for extended (display only)
// ============================================================

function ScavengeMenu(props) {
    var onQuick = props.onQuickScavenge;
    var onExtended = props.onExtendedScavenge;
    var onCancel = props.onCancel;
    var hand = props.handedness || "right";
    var staminaCost = props.staminaCost || 2;
    var hourCost = props.hourCost || 2;

    var menuStyle = {
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 50,
        background: "rgba(5, 3, 1, 0.85)",
    };

    var titleStyle = {
        fontFamily: "monospace",
        fontSize: "clamp(14px, 3vw, 20px)",
        fontWeight: "bold",
        letterSpacing: 2,
        color: "#f59e0b",
        textTransform: "uppercase",
        marginBottom: 8,
    };

    var btnBase = {
        fontFamily: "monospace",
        fontSize: "clamp(12px, 2.5vw, 16px)",
        fontWeight: "bold",
        letterSpacing: 1,
        textTransform: "uppercase",
        border: "2px solid",
        borderRadius: 8,
        padding: "12px 28px",
        cursor: "pointer",
        minWidth: 200,
        textAlign: "center",
    };

    var quickStyle = Object.assign({}, btnBase, {
        background: "#141009",
        borderColor: "#8a7a64",
        color: "#c8b89a",
    });

    var extendedStyle = Object.assign({}, btnBase, {
        background: "#2a1f0a",
        borderColor: "#f59e0b",
        color: "#f59e0b",
    });

    var cancelStyle = Object.assign({}, btnBase, {
        background: "transparent",
        borderColor: "#3d2e0f",
        color: "#8a7a64",
        padding: "8px 20px",
        minWidth: 120,
        fontSize: "clamp(10px, 2vw, 13px)",
    });

    var costStyle = {
        fontFamily: "monospace",
        fontSize: "clamp(9px, 1.8vw, 11px)",
        color: "#8a7a64",
        marginTop: 4,
    };

    return (
        <div style={menuStyle}>
            <div style={titleStyle}>SCAVENGE</div>

            <button
                onClick={onQuick}
                style={quickStyle}
            >
                Quick Scavenge
                <div style={costStyle}>1 stamina · 1 hour · low reward</div>
            </button>

            <button
                onClick={onExtended}
                style={extendedStyle}
            >
                Extended Scavenge
                <div style={Object.assign({}, costStyle, { color: "#f59e0b" })}>
                    {staminaCost} stamina · {hourCost} hours · high reward
                </div>
            </button>

            <button
                onClick={onCancel}
                style={cancelStyle}
            >
                Cancel
            </button>
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var ScavengeMenuModule = {
    ScavengeMenu: ScavengeMenu,
};

export default ScavengeMenuModule;