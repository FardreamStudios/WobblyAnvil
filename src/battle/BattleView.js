// ============================================================
// BattleView.js — Battle Layout Shell (Landscape)
//
// Two-panel landscape split for ATB combat.
// Scene panel (visual, no input) + Action panel (all input).
// Handedness-aware: panels flip sides based on config.
//
// This is the empty shell — no battle logic, no ATB, no QTE.
// Content will be added as subsystems are built.
//
// Props:
//   handedness — "left" | "right" (flips panel sides)
//   onExit — callback to leave battle and return to idle
//   zoneName — display name of current zone (e.g. "Dumpster Row")
//   waveLabel — display string (e.g. "Wave 1/3")
//
// UE ANALOGY: The UMG layout widget for the battle HUD.
//   Content widgets mount inside it. It owns positioning only.
// ============================================================

var PANEL_SCENE_PCT = 55;
var PANEL_ACTION_PCT = 45;

// ============================================================
// Scene Panel — Left (or Right if left-handed)
// Visual only. No touch input.
// ============================================================

function ScenePanel(props) {
    return (
        <div style={{
            width: PANEL_SCENE_PCT + "%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            background: "#0d0b08",
            borderRight: props.side === "left" ? "1px solid #2a1f0a" : "none",
            borderLeft: props.side === "right" ? "1px solid #2a1f0a" : "none",
        }}>
            {/* Zone name */}
            <div style={{
                position: "absolute",
                top: "3%",
                left: "50%",
                transform: "translateX(-50%)",
                fontFamily: "monospace",
                fontSize: "clamp(10px, 2vw, 14px)",
                letterSpacing: 2,
                color: "#8a7a64",
                textTransform: "uppercase",
            }}>
                {props.zoneName || "UNKNOWN ZONE"}
            </div>

            {/* Enemy placeholder */}
            <div style={{
                position: "absolute",
                top: "15%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "30%",
                aspectRatio: "1",
                border: "1px dashed #3d2e0f",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: "clamp(9px, 1.5vw, 12px)",
                color: "#5a4a34",
            }}>
                ENEMY
            </div>

            {/* Enemy HP placeholder */}
            <div style={{
                position: "absolute",
                top: "58%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "40%",
                height: 8,
                borderRadius: 4,
                background: "#1a1408",
                border: "1px solid #2a1f0a",
                overflow: "hidden",
            }}>
                <div style={{
                    width: "70%",
                    height: "100%",
                    background: "#E24B4A",
                    borderRadius: 4,
                }} />
            </div>

            {/* Player placeholder */}
            <div style={{
                position: "absolute",
                bottom: "25%",
                left: "15%",
                width: "12%",
                aspectRatio: "3/4",
                border: "1px dashed #3d2e0f",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "monospace",
                fontSize: "clamp(8px, 1.2vw, 10px)",
                color: "#5a4a34",
            }}>
                YOU
            </div>

            {/* Speech lane */}
            <div style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "20%",
                display: "flex",
                alignItems: "center",
                padding: "0 4%",
                gap: "3%",
                background: "rgba(5, 3, 1, 0.4)",
            }}>
                <div style={{
                    fontFamily: "monospace",
                    fontSize: "clamp(9px, 1.5vw, 12px)",
                    color: "#5a4a34",
                    fontStyle: "italic",
                }}>
                    Speech lane — party bubbles appear here
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Action Panel — Right (or Left if left-handed)
// All input happens here.
// ============================================================

function ActionPanel(props) {
    var onExit = props.onExit;

    return (
        <div style={{
            width: PANEL_ACTION_PCT + "%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            background: "#0a0804",
            display: "flex",
            flexDirection: "column",
        }}>
            {/* Top: Wave indicator + status bars */}
            <div style={{
                padding: "3% 5% 2%",
                display: "flex",
                flexDirection: "column",
                gap: 6,
            }}>
                {/* Wave label */}
                <div style={{
                    fontFamily: "monospace",
                    fontSize: "clamp(9px, 1.5vw, 12px)",
                    letterSpacing: 2,
                    color: "#8a7a64",
                    textTransform: "uppercase",
                    textAlign: "right",
                }}>
                    {props.waveLabel || "WAVE 1/3"}
                </div>

                {/* Player HP */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                        fontFamily: "monospace",
                        fontSize: "clamp(8px, 1.3vw, 11px)",
                        color: "#8a7a64",
                        minWidth: 24,
                    }}>HP</span>
                    <div style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        background: "#1a1408",
                        border: "1px solid #2a1f0a",
                        overflow: "hidden",
                    }}>
                        <div style={{
                            width: "80%",
                            height: "100%",
                            background: "#1D9E75",
                            borderRadius: 4,
                            transition: "width 300ms",
                        }} />
                    </div>
                </div>

                {/* ATB gauge */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                        fontFamily: "monospace",
                        fontSize: "clamp(8px, 1.3vw, 11px)",
                        color: "#8a7a64",
                        minWidth: 24,
                    }}>ATB</span>
                    <div style={{
                        flex: 1,
                        height: 8,
                        borderRadius: 4,
                        background: "#1a1408",
                        border: "1px solid #2a1f0a",
                        overflow: "hidden",
                    }}>
                        <div style={{
                            width: "0%",
                            height: "100%",
                            background: "#378ADD",
                            borderRadius: 4,
                            transition: "width 100ms",
                        }} />
                    </div>
                </div>
            </div>

            {/* Center: QTE zone (tap target area) */}
            <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
            }}>
                <div style={{
                    width: "60%",
                    aspectRatio: "1",
                    border: "1px dashed #2a1f0a",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "monospace",
                    fontSize: "clamp(9px, 1.5vw, 12px)",
                    color: "#3d2e0f",
                }}>
                    QTE ZONE
                </div>
            </div>

            {/* Bottom: Action buttons */}
            <div style={{
                padding: "2% 5% 4%",
                display: "flex",
                gap: "2%",
            }}>
                {["ATTACK", "DEFEND", "ITEM", "FLEE"].map(function(label) {
                    var colors = {
                        ATTACK: { bg: "#1a1428", border: "#60a5fa", color: "#60a5fa" },
                        DEFEND: { bg: "#0a1a14", border: "#4ade80", color: "#4ade80" },
                        ITEM:   { bg: "#1a1408", border: "#f59e0b", color: "#f59e0b" },
                        FLEE:   { bg: "#141009", border: "#8a7a64", color: "#8a7a64" },
                    };
                    var c = colors[label];
                    return (
                        <button
                            key={label}
                            onClick={label === "FLEE" ? onExit : undefined}
                            style={{
                                flex: 1,
                                background: c.bg,
                                border: "1px solid " + c.border,
                                borderRadius: 6,
                                color: c.color,
                                fontFamily: "monospace",
                                fontSize: "clamp(8px, 1.5vw, 12px)",
                                fontWeight: "bold",
                                letterSpacing: 1,
                                padding: "8px 4px",
                                cursor: "pointer",
                                textTransform: "uppercase",
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================================
// BattleView — Root Layout
// ============================================================

function BattleView(props) {
    var handedness = props.handedness || "right";
    var isLeft = handedness === "left";

    // Scene on the non-dominant side, actions on dominant side
    var sceneSide = isLeft ? "right" : "left";
    var actionSide = isLeft ? "left" : "right";

    return (
        <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: isLeft ? "row-reverse" : "row",
            background: "#0a0704",
            overflow: "hidden",
        }}>
            <ScenePanel
                side={sceneSide}
                zoneName={props.zoneName}
            />
            <ActionPanel
                side={actionSide}
                onExit={props.onExit}
                waveLabel={props.waveLabel}
            />
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var BattleViewModule = {
    BattleView: BattleView,
    ScenePanel: ScenePanel,
    ActionPanel: ActionPanel,
};

export default BattleViewModule;