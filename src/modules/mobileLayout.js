// ============================================================
// mobileLayout.js — Wobbly Anvil Mobile Layout
// Landscape-oriented mobile shell (850×390 design size).
// Mirrorable 3-column layout: data | center | buttons.
// Handedness prop flips the columns via flex-direction.
// Phase-aware: buttons swap based on game phase.
// Non-destructive: desktop layout is unaffected.
// ============================================================

import { useState, useEffect, useRef } from "react";

// --- Mobile design dimensions ---
var MOBILE_WIDTH = 850;
var MOBILE_HEIGHT = 390;

// --- Mobile CSS ---
var MOBILE_CSS = "\n  .mobile-shell-outer {\n    width: 100vw;\n    height: 100vh;\n    overflow: hidden;\n    background: #0a0704;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n  }\n  .mobile-shell {\n    width: " + MOBILE_WIDTH + "px;\n    height: " + MOBILE_HEIGHT + "px;\n    display: flex;\n    flex-direction: column;\n    background: #1a1209;\n    font-family: monospace;\n    color: #f0e6c8;\n    overflow: hidden;\n    position: relative;\n    transform-origin: center center;\n    flex-shrink: 0;\n  }\n  .mobile-banner {\n    display: flex;\n    align-items: center;\n    height: 32px;\n    padding: 0 8px;\n    background: #0f0b06;\n    border-bottom: 1px solid #3d2e0f;\n    flex-shrink: 0;\n  }\n  .mobile-middle {\n    flex: 1;\n    display: flex;\n    overflow: hidden;\n    position: relative;\n  }\n  .mobile-data-strip {\n    width: 100px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    padding: 4px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    flex-shrink: 0;\n  }\n  .mobile-center {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    position: relative;\n    overflow: hidden;\n  }\n  .mobile-action-strip {\n    width: 100px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    padding: 4px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    flex-shrink: 0;\n  }\n  .mobile-bottom-bar {\n    height: 36px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 12px;\n    padding: 0 12px;\n    background: #0f0b06;\n    border-top: 1px solid #3d2e0f;\n    flex-shrink: 0;\n  }\n  .mobile-data-strip::-webkit-scrollbar,\n  .mobile-action-strip::-webkit-scrollbar {\n    width: 3px;\n  }\n  .mobile-data-strip::-webkit-scrollbar-thumb,\n  .mobile-action-strip::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 2px;\n  }\n";

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

// --- Mobile Shell ---

function MobileShell({ className, children }) {
    var [scale, setScale] = useState(1);
    var outerRef = useRef(null);

    useEffect(function() {
        var outer = outerRef.current;
        if (!outer) return;

        function recalc() {
            var vw = outer.clientWidth;
            var vh = outer.clientHeight;
            var scaleX = vw / MOBILE_WIDTH;
            var scaleY = vh / MOBILE_HEIGHT;
            setScale(Math.min(scaleX, scaleY));
        }

        recalc();
        var observer = new ResizeObserver(recalc);
        observer.observe(outer);
        return function() { observer.disconnect(); };
    }, []);

    return (
        <div ref={outerRef} className="mobile-shell-outer">
            <style>{MOBILE_CSS}</style>
            <div
                className={"mobile-shell" + (className ? " " + className : "")}
                style={{ transform: "scale(" + scale + ")" }}
            >
                {children}
            </div>
        </div>
    );
}

// --- Mobile Layout ---
// Receives all game state and renders the mobile-specific arrangement.
// handedness: "right" (default) or "left" — flips data/action strips.

function MobileLayout(props) {
    var handedness = props.handedness || "right";
    var isLeftHanded = handedness === "left";
    var phase = props.phase || "idle";
    var isForging = phase !== "idle" && phase !== "select" && phase !== "select_mat";
    var isQTEActive = phase === "heat" || phase === "hammer" || phase === "quench";
    var isFull = isFullscreenActive();

    // --- Banner content (yellow zone + blue corners) ---
    var banner = (
        <div className="mobile-banner">
            {/* Blue L — Level/Rank */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: 80, flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1 }}>LV</span>
                <span style={{ fontSize: 14, color: "#f59e0b", fontWeight: "bold" }}>{props.level || 1}</span>
            </div>

            {/* Yellow — Gold + contextual info */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: "bold" }}>{props.gold || 0}g</span>
                {props.royalQuest && !props.royalQuest.fulfilled && (
                    <span style={{ fontSize: 9, color: "#f59e0b", letterSpacing: 1 }}>DECREE DUE DAY {props.royalQuest.deadline}</span>
                )}
            </div>

            {/* Blue R — Day + fullscreen toggle */}
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

    // --- Data strip content (green L / green R depending on hand) ---
    var dataStrip = (
        <div className="mobile-data-strip">
            {isForging ? (
                <>
                    {/* Forge data readouts */}
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
                    {/* Idle data — rep, rank, shelf count */}
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1 }}>REP</div>
                    <div style={{ fontSize: 14, color: props.repColor || "#fb923c", fontWeight: "bold" }}>{props.reputation || 0}/10</div>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, marginTop: 4 }}>RANK</div>
                    <div style={{ fontSize: 9, color: "#fbbf24", fontWeight: "bold" }}>{props.rankName || ""}</div>
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, marginTop: 4 }}>SHELF</div>
                    <div style={{ fontSize: 14, color: "#f0e6c8", fontWeight: "bold" }}>{props.finishedCount || 0}</div>
                </>
            )}
            {/* Purple L — bottom of data strip */}
            <div style={{ marginTop: "auto" }}>
                <MobileBtn icon={"\u2699"} label="OPT" onClick={props.onOptions} />
            </div>
        </div>
    );

    // --- Action strip content (phase-aware buttons) ---
    var actionStrip = (
        <div className="mobile-action-strip">
            {isForging && phase === "sess_result" ? (
                <>
                    {/* Session result actions */}
                    <MobileBtn icon={"\uD83D\uDD25"} label="FORGE" onClick={props.onForge} disabled={props.forgeDisabled} />
                    <MobileBtn icon={"\u2696"} label="NORM" onClick={props.onNormalize} disabled={props.normalizeDisabled} color="#60a5fa" />
                    <MobileBtn icon={"\uD83D\uDCA7"} label="QUENCH" onClick={props.onQuench} disabled={props.quenchDisabled} />
                    <MobileBtn icon={"\uD83D\uDDD1"} label="SCRAP" onClick={props.onScrap} color="#8a7a64" />
                    <MobileBtn icon={"\u23F8"} label="LEAVE" onClick={props.onLeave} color="#60a5fa" />
                </>
            ) : isQTEActive ? (
                <>
                    {/* During QTE — minimal, maybe just leave */}
                    <div style={{ flex: 1 }} />
                    <div style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, textAlign: "center", padding: 4 }}>TAP CENTER TO STRIKE</div>
                </>
            ) : (
                <>
                    {/* Idle actions */}
                    <MobileBtn icon={"\uD83D\uDCA4"} label="SLEEP" onClick={props.onSleep} disabled={props.sleepDisabled} />
                    <MobileBtn icon={"\u23F3"} label="REST" onClick={props.onRest} disabled={props.restDisabled} />
                    <MobileBtn icon={"\uD83D\uDCE3"} label="PROMO" onClick={props.onPromote} disabled={props.promoteDisabled} />
                    <MobileBtn icon={"\uD83D\uDDD1"} label="SCAV" onClick={props.onScavenge} disabled={props.scavengeDisabled} />
                    {/* Purple R — bottom of action strip */}
                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                        <MobileBtn icon={"\uD83D\uDED2"} label="SHOP" onClick={props.onShop} disabled={props.shopDisabled} />
                        <MobileBtn icon={"\u2697"} label="MATS" onClick={props.onMats} disabled={props.matsDisabled} />
                    </div>
                </>
            )}
        </div>
    );

    // --- Center content (red zone — scene + QTE + overlays) ---
    var center = (
        <div className="mobile-center" onClick={isQTEActive ? props.onForgeClick : null} style={{ cursor: isQTEActive ? "pointer" : "default" }}>
            {/* Orange overlay zone — toasts, customer, etc rendered by App.js */}
            {props.overlay}

            {/* Scene background */}
            {props.scene}

            {/* QTE + forge UI rendered by App.js */}
            {props.forgeUI}
        </div>
    );

    // --- Bottom bar (time + stamina, pinned near viewport bottom) ---
    var bottomBar = (
        <div className="mobile-bottom-bar">
            <span style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1 }}>TIME</span>
            <span style={{ fontSize: 13, color: props.timeColor || "#4ade80", fontWeight: "bold" }}>{props.timeLabel || "8:00AM"}</span>
            <div style={{ width: 80, height: 6, background: "#0a0704", borderRadius: 3, overflow: "hidden", border: "1px solid #2a1f0a" }}>
                <div style={{ height: "100%", width: (props.timePct || 100) + "%", background: props.timeColor || "#4ade80", borderRadius: 3 }} />
            </div>
            <div style={{ width: 1, height: 16, background: "#2a1f0a" }} />
            <span style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1 }}>STAM</span>
            <span style={{ fontSize: 13, color: props.staminaColor || "#f59e0b", fontWeight: "bold" }}>{props.stamina || 0}/{props.maxStam || 5}</span>
            <div style={{ width: 80, height: 6, background: "#0a0704", borderRadius: 3, overflow: "hidden", border: "1px solid #2a1f0a" }}>
                <div style={{ height: "100%", width: (props.staminaPct || 100) + "%", background: props.staminaColor || "#f59e0b", borderRadius: 3 }} />
            </div>
            {/* Handedness swap button */}
            <button onClick={props.onToggleHand} style={{
                background: "none", border: "1px solid #3d2e0f", borderRadius: 4,
                color: "#8a7a64", fontSize: 10, padding: "2px 5px", cursor: "pointer",
                fontFamily: "monospace", marginLeft: "auto",
            }}>{isLeftHanded ? "\u21C0" : "\u21BC"}</button>
        </div>
    );

    // --- Assemble with handedness flip ---
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
    MOBILE_WIDTH: MOBILE_WIDTH,
    MOBILE_HEIGHT: MOBILE_HEIGHT,
    MobileLayout: MobileLayout,
    MobileShell: MobileShell,
    MobileBtn: MobileBtn,
};

export default MobileLayoutModule;