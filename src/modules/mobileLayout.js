// ============================================================
// mobileLayout.js — Wobbly Anvil Mobile Layout
// Full-viewport mobile shell (100vw × 100vh, no scaling).
// Mirrorable 3-column layout: data | center | buttons.
// Handedness prop flips the columns via flex-direction.
// Phase-aware: buttons swap based on game phase.
// Non-destructive: desktop layout is unaffected.
// ============================================================

import { useState, useEffect, useRef } from "react";

// --- Mobile CSS ---
var MOBILE_CSS = "\n html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; } .mobile-shell {\n    width: 100vw;\n    height: 100%;\n    display: flex;\n    flex-direction: column;\n    background: #1e160d;\n    font-family: monospace;\n    color: #f0e6c8;\n    overflow: hidden;\n    position: relative;\n  }\n  .mobile-banner {\n    display: flex;\n    align-items: center;\n    height: 32px;\n    padding: 0 8px;\n    background: #16100a;\n    border-bottom: 1px solid #3d2e0f;\n    flex-shrink: 0;\n  }\n  .mobile-middle {\n    flex: 1;\n    display: flex;\n    overflow: hidden;\n    position: relative;\n  }\n  .mobile-data-strip {\n    width: 100px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    padding: 4px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    flex-shrink: 0;\n  }\n  .mobile-center {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    position: relative;\n    overflow: hidden;\n  }\n  .mobile-action-strip {\n    width: 100px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    padding: 4px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    flex-shrink: 0;\n  }\n  .mobile-bottom-bar {\n    height: 40px;\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    padding: 0 8px;\n    background: #16100a;\n    border-top: 1px solid #3d2e0f;\n    flex-shrink: 0;\n  }\n  .mobile-bottom-panel {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    background: #120e08;\n    border: 1px solid #2a1f0a;\n    border-radius: 6px;\n    padding: 3px 8px;\n    height: 32px;\n  }\n  .mobile-shelf-icon {\n    width: 26px;\n    height: 26px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: #1e160d;\n    border: 1px solid #3d2e0f;\n    border-radius: 4px;\n    font-size: 14px;\n    cursor: pointer;\n    flex-shrink: 0;\n    position: relative;\n  }\n  .mobile-shelf-icon:active {\n    background: #2a1f0a;\n  }\n  .mobile-shelf-popup {\n    position: absolute;\n    bottom: 44px;\n    background: #120e08;\n    border: 2px solid #f59e0b;\n    border-radius: 8px;\n    padding: 10px 12px;\n    min-width: 140px;\n    z-index: 200;\n    box-shadow: 0 4px 16px rgba(0,0,0,0.9);\n  }\n  .mobile-data-strip::-webkit-scrollbar,\n  .mobile-action-strip::-webkit-scrollbar {\n    width: 3px;\n  }\n  .mobile-data-strip::-webkit-scrollbar-thumb,\n  .mobile-action-strip::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 2px;\n  }\n";

// --- Fullscreen helpers ---

function isFullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}

function requestFullscreen(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
}

function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
}

// --- Weapon emoji picker (by weapon key) ---
var WEAPON_ICONS = {
    dagger: "\uD83D\uDDE1",
    shortsword: "\u2694",
    axe: "\uD83E\uDE93",
    longsword: "\u2694",
    mace: "\uD83D\uDD28",
    warhammer: "\uD83D\uDD28",
    greatsword: "\u2694",
    halberd: "\uD83D\uDD31",
    katana: "\uD83D\uDDE1",
    claymore: "\u2694",
};

function weaponIcon(wKey) {
    return WEAPON_ICONS[wKey] || "\u2694";
}

// --- Mobile Action Button ---

function MobileBtn({ icon, label, onClick, disabled, color, danger }) {
    var textColor = disabled ? "#2a1f0a" : danger ? "#ef4444" : color || "#f59e0b";
    var borderColor = disabled ? "#1a1209" : danger ? "#ef4444" : color || "#f59e0b";
    var bg = disabled ? "#0a0704" : danger ? "#1a0505" : "#141009";
    return (
        <button onClick={disabled ? null : onClick} disabled={disabled} style={{
            background: bg,
            border: "1px solid " + borderColor,
            borderRadius: 6,
            color: textColor,
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "monospace",
            fontWeight: "bold",
            fontSize: 9,
            letterSpacing: 1,
            textTransform: "uppercase",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: "6px 4px",
            width: "100%",
        }}>
            {icon && <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>}
            <span>{label}</span>
        </button>
    );
}

// --- Shelf Icon with popup ---

function ShelfItem({ item, index }) {
    var [showPopup, setShowPopup] = useState(false);

    return (
        <div className="mobile-shelf-icon" onClick={function(e) { e.stopPropagation(); setShowPopup(function(s) { return !s; }); }}>
            <span>{weaponIcon(item.wKey)}</span>
            {showPopup && (
                <div className="mobile-shelf-popup" onClick={function(e) { e.stopPropagation(); }} style={{ left: "50%", transform: "translateX(-50%)" }}>
                    <div style={{ fontSize: 10, color: item.color || "#f59e0b", letterSpacing: 1, fontWeight: "bold", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 9, color: "#c8b89a", marginBottom: 2 }}>{item.wName}</div>
                    <div style={{ fontSize: 9, color: "#8a7a64", marginBottom: 3 }}>{item.matName || ""}</div>
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: "bold" }}>~{item.val}g</div>
                    <div style={{ fontSize: 7, color: "#4a3c2c", marginTop: 4, letterSpacing: 1 }}>TAP OUTSIDE TO CLOSE</div>
                </div>
            )}
        </div>
    );
}

// --- Mobile Shell (full viewport, no scaling) ---

function MobileShell({ className, children }) {
    return (
        <div className={"mobile-shell" + (className ? " " + className : "")}>
            <style>{MOBILE_CSS}</style>
            {children}
        </div>
    );
}

// --- Mobile Layout ---

function MobileLayout(props) {
    var handedness = props.handedness || "right";
    var isLeftHanded = handedness === "left";
    var phase = props.phase || "idle";
    var isForging = phase !== "idle" && phase !== "select" && phase !== "select_mat";
    var isQTEActive = phase === "heat" || phase === "hammer" || phase === "quench";
    var isFull = isFullscreenActive();
    var finished = props.finished || [];

    // Close shelf popups when tapping outside
    function handleShellClick() {
        // popups close themselves via their own state
    }

    // --- Banner content ---
    var banner = (
        <div className="mobile-banner">
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: 80, flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1 }}>LV</span>
                <span style={{ fontSize: 14, color: "#f59e0b", fontWeight: "bold" }}>{props.level || 1}</span>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: "bold" }}>{props.gold || 0}g</span>
                {props.royalQuest && !props.royalQuest.fulfilled && (
                    <span style={{ fontSize: 9, color: "#f59e0b", letterSpacing: 1 }}>DECREE DUE DAY {props.royalQuest.deadline}</span>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1 }}>DAY</span>
                <span style={{ fontSize: 14, color: "#f0e6c8", fontWeight: "bold" }}>{props.day || 1}</span>
                <button onClick={function() { if (isFull) exitFullscreen(); else requestFullscreen(document.documentElement); }} style={{
                    background: "none", border: "1px solid #3d2e0f", borderRadius: 4,
                    color: "#8a7a64", fontSize: 12, padding: "2px 5px", cursor: "pointer",
                    fontFamily: "monospace", marginLeft: 4,
                }}>{isFull ? "\u2716" : "\u26F6"}</button>
            </div>
        </div>
    );

    // --- Data strip ---
    var dataStrip = (
        <div className="mobile-data-strip">
            {isForging ? (
                <>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1 }}>QUALITY</div>
                    <div style={{ fontSize: 14, color: props.qualityColor || "#f59e0b", fontWeight: "bold" }}>{props.qualScore || 0}</div>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, marginTop: 4 }}>STRESS</div>
                    <div style={{ fontSize: 14, color: props.stressColor || "#4ade80", fontWeight: "bold" }}>{props.stressLabel || "CALM"}</div>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, marginTop: 4 }}>WEAPON</div>
                    <div style={{ fontSize: 10, color: "#f0e6c8", fontWeight: "bold" }}>{props.weaponName || ""}</div>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, marginTop: 4 }}>MATERIAL</div>
                    <div style={{ fontSize: 10, color: props.matColor || "#a0a0a0", fontWeight: "bold" }}>{props.matName || ""}</div>
                </>
            ) : (
                <>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1 }}>REP</div>
                    <div style={{ fontSize: 14, color: props.repColor || "#fb923c", fontWeight: "bold" }}>{props.reputation || 0}/10</div>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, marginTop: 4 }}>RANK</div>
                    <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: "bold" }}>{props.rankName || ""}</div>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, marginTop: 4 }}>SHELF</div>
                    <div style={{ fontSize: 14, color: "#f0e6c8", fontWeight: "bold" }}>{finished.length}</div>
                </>
            )}
            <div style={{ marginTop: "auto" }}>
                <MobileBtn icon={"\u2699"} label="OPT" onClick={props.onOptions} />
            </div>
        </div>
    );

    // --- Action strip ---
    var actionStrip = (
        <div className="mobile-action-strip">
            {isForging && phase === "sess_result" ? (
                <>
                    <MobileBtn icon={"\uD83D\uDD25"} label="FORGE" onClick={props.onForge} disabled={props.forgeDisabled} />
                    <MobileBtn icon={"\u2696"} label="NORM" onClick={props.onNormalize} disabled={props.normalizeDisabled} color="#60a5fa" />
                    <MobileBtn icon={"\uD83D\uDCA7"} label="QUENCH" onClick={props.onQuench} disabled={props.quenchDisabled} />
                    <MobileBtn icon={"\uD83D\uDDD1"} label="SCRAP" onClick={props.onScrap} color="#8a7a64" />
                    <MobileBtn icon={"\u23F8"} label="LEAVE" onClick={props.onLeave} color="#60a5fa" />
                </>
            ) : isQTEActive ? (
                <>
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, textAlign: "center", padding: 4 }}>TAP CENTER TO STRIKE</div>
                </>
            ) : (
                <>
                    <MobileBtn icon={"\uD83D\uDCA4"} label="SLEEP" onClick={props.onSleep} disabled={props.sleepDisabled} />
                    <MobileBtn icon={"\u23F3"} label="REST" onClick={props.onRest} disabled={props.restDisabled} />
                    <MobileBtn icon={"\uD83D\uDCE3"} label="PROMO" onClick={props.onPromote} disabled={props.promoteDisabled} />
                    <MobileBtn icon={"\uD83D\uDDD1"} label="SCAV" onClick={props.onScavenge} disabled={props.scavengeDisabled} />
                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                        <MobileBtn icon={"\uD83D\uDED2"} label="SHOP" onClick={props.onShop} disabled={props.shopDisabled} />
                        <MobileBtn icon={"\u2697"} label="MATS" onClick={props.onMats} disabled={props.matsDisabled} />
                    </div>
                </>
            )}
        </div>
    );

    // --- Center content ---
    var center = (
        <div className="mobile-center" onClick={isQTEActive ? props.onForgeClick : null} style={{ cursor: isQTEActive ? "pointer" : "default" }}>
            {props.overlay}
            {props.scene}
            {props.forgeUI}

            {/* Begin Forge button — idle, no WIP, centered at bottom */}
            {phase === "idle" && !props.hasWip && (
                <button onClick={props.onBeginForge} disabled={props.beginForgeDisabled} style={{
                    position: "absolute",
                    bottom: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                    background: props.beginForgeDisabled ? "#0a0704" : "#2a1f0a",
                    border: "2px solid " + (props.beginForgeDisabled ? "#1a1209" : "#f59e0b"),
                    borderRadius: 8,
                    color: props.beginForgeDisabled ? "#2a1f0a" : "#f59e0b",
                    padding: "10px 28px",
                    fontSize: 14,
                    cursor: props.beginForgeDisabled ? "not-allowed" : "pointer",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                }}>BEGIN FORGING</button>
            )}

            {/* Resume WIP button — idle with WIP */}
            {phase === "idle" && props.hasWip && (
                <div style={{
                    position: "absolute",
                    bottom: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                    display: "flex",
                    gap: 8,
                }}>
                    <button onClick={props.onResumeWip} disabled={props.resumeWipDisabled} style={{
                        background: props.resumeWipDisabled ? "#0a0704" : "#0a1a2a",
                        border: "2px solid " + (props.resumeWipDisabled ? "#1a1209" : "#60a5fa"),
                        borderRadius: 8,
                        color: props.resumeWipDisabled ? "#2a1f0a" : "#60a5fa",
                        padding: "10px 20px",
                        fontSize: 13,
                        cursor: props.resumeWipDisabled ? "not-allowed" : "pointer",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                    }}>RESUME</button>
                    <button onClick={props.onScrapWip} style={{
                        background: "#141009",
                        border: "2px solid #3d2e0f",
                        borderRadius: 8,
                        color: "#8a7a64",
                        padding: "10px 16px",
                        fontSize: 13,
                        cursor: "pointer",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        fontFamily: "monospace",
                        fontWeight: "bold",
                    }}>SCRAP</button>
                </div>
            )}
        </div>
    );

    // --- Bottom bar ---
    var bottomBar = (
        <div className="mobile-bottom-bar">
            {/* Time panel */}
            <div className="mobile-bottom-panel">
                <span style={{ fontSize: 11, color: props.timeColor || "#4ade80", fontWeight: "bold" }}>{props.timeLabel || "8:00AM"}</span>
                <div style={{ width: 60, height: 5, background: "#0a0704", borderRadius: 3, overflow: "hidden", border: "1px solid #2a1f0a" }}>
                    <div style={{ height: "100%", width: (props.timePct || 100) + "%", background: props.timeColor || "#4ade80", borderRadius: 3 }} />
                </div>
            </div>

            {/* Stamina panel */}
            <div className="mobile-bottom-panel">
                <span style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1 }}>STAM</span>
                <span style={{ fontSize: 11, color: props.staminaColor || "#f59e0b", fontWeight: "bold" }}>{props.stamina || 0}/{props.maxStam || 5}</span>
                <div style={{ width: 50, height: 5, background: "#0a0704", borderRadius: 3, overflow: "hidden", border: "1px solid #2a1f0a" }}>
                    <div style={{ height: "100%", width: (props.staminaPct || 100) + "%", background: props.staminaColor || "#f59e0b", borderRadius: 3 }} />
                </div>
            </div>

            {/* Shelf icons panel */}
            <div className="mobile-bottom-panel" style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden", gap: 4 }}>
                {finished.length === 0 && (
                    <span style={{ fontSize: 8, color: "#3d2e0f", letterSpacing: 1 }}>SHELF EMPTY</span>
                )}
                {finished.map(function(w, i) {
                    return <ShelfItem key={w.id} item={w} index={i} />;
                })}
            </div>

            {/* Handedness swap */}
            <button onClick={props.onToggleHand} style={{
                background: "none", border: "1px solid #3d2e0f", borderRadius: 4,
                color: "#8a7a64", fontSize: 10, padding: "2px 5px", cursor: "pointer",
                fontFamily: "monospace", flexShrink: 0,
            }}>{isLeftHanded ? "\u21C0" : "\u21BC"}</button>
        </div>
    );

    // --- Assemble ---
    var middleDirection = isLeftHanded ? "row-reverse" : "row";

    return (
        <MobileShell className={props.className}>
            {banner}
            <div className="mobile-middle" style={{ flexDirection: middleDirection }}>
                {dataStrip}
                {center}
                {actionStrip}
            </div>
            {bottomBar}
        </MobileShell>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var MobileLayoutModule = {
    MobileLayout: MobileLayout,
    MobileShell: MobileShell,
    MobileBtn: MobileBtn,
};

export default MobileLayoutModule;