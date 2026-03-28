// ============================================================
// mobileLayout.js — Wobbly Anvil Mobile Layout
// Full-viewport mobile shell (100vw × 100vh, no scaling).
// Mirrorable 3-column layout: data | center | buttons.
// Handedness prop flips the columns via flex-direction.
// Phase-aware: buttons swap based on game phase.
// Non-destructive: desktop layout is unaffected.
//
// Components extracted to separate files:
//   MobileBtn      → src/components/MobileBtn.js
//   DecreeBtn      → src/components/DecreeBtn.js
//   EventBanner    → src/components/EventBanner.js
//   RepFloat       → src/components/RepFloat.js
//   Mobile infra   → src/hooks/useMobileInfra.js
//   Icon catalog   → src/config/mobileIcons.js
//
// Fonts:
//   - Cinzel: banner, headers, section labels
//   - Josefin Sans: body text, data values, buttons
// ============================================================

import { useState, useEffect, useRef } from "react";
import W from "../components/widgets.js";
import THEME from "../config/theme.js";
import ForgeFireFX from "../components/ForgeFireFX.js";
import GameConstants from "./constants.js";

// --- Extracted components ---
import MobileBtn from "../components/MobileBtn.js";
import DecreeBtn from "../components/DecreeBtn.js";
import EventBanner from "../components/EventBanner.js";
import RepFloat from "../components/RepFloat.js";
import MobileIcons from "../config/mobileIcons.js";
import MobileInfra from "../hooks/useMobileInfra.js";

var IC = MobileIcons.IC;
var isFullscreenActive = MobileInfra.isFullscreenActive;
var requestFullscreen = MobileInfra.requestFullscreen;
var exitFullscreen = MobileInfra.exitFullscreen;
var userExitedFullscreen = MobileInfra.userExitedFullscreen;
var useWakeLock = MobileInfra.useWakeLock;
var useFullscreenState = MobileInfra.useFullscreenState;
var useViewportInfo = MobileInfra.useViewportInfo;
var useFullscreenPersistence = MobileInfra.useFullscreenPersistence;

// --- Mobile CSS ---
var MOBILE_CSS = "\n @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Josefin+Sans:wght@400;600;700&display=swap');\n html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; -webkit-tap-highlight-color: transparent; } .mobile-shell {\n    width: 100vw;\n    display: flex;\n    flex-direction: column;\n    background: #1e160d;\n    font-family: 'Josefin Sans', sans-serif;\n    color: #f0e6c8;\n    overflow: hidden;\n    position: relative;\n    padding-left: env(safe-area-inset-left);\n    padding-right: env(safe-area-inset-right);\n    padding-top: env(safe-area-inset-top);\n    padding-bottom: env(safe-area-inset-bottom);\n    box-sizing: border-box;\n  }\n  .mobile-banner {\n    display: flex;\n    align-items: center;\n    height: 32px;\n    padding: 0 8px;\n    background: #16100a;\n    border-bottom: 1px solid #3d2e0f;\n    flex-shrink: 0;\n    font-family: 'Cinzel', serif;\n  }\n  .mobile-middle {\n    flex: 1;\n    display: flex;\n    overflow: hidden;\n    position: relative;\n  }\n  .mobile-center {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    position: relative;\n    overflow: hidden;\n    background: #1e160d;\n  }\n  .mobile-action-strip {\n    width: 100%;\n    height: 100%;\n    display: flex;\n    flex-direction: column;\n    gap: 0;\n    padding: 0;\n    overflow: hidden;\n    flex-shrink: 0;\n    background: transparent;\n    position: relative;\n    z-index: 2;\n  }\n  .mobile-action-strip-qte {\n    background: transparent;\n  }\n  .mobile-bottom-bar {\n    height: 40px;\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    padding: 0 8px;\n    background: #16100a;\n    border-top: 1px solid #3d2e0f;\n    flex-shrink: 0;\n    font-family: 'Josefin Sans', sans-serif;\n  }\n  .mobile-bottom-panel {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    background: #120e08;\n    border: 1px solid #2a1f0a;\n    border-radius: 6px;\n    padding: 3px 8px;\n    height: 32px;\n  }\n  .mobile-shelf-icon {\n    width: 36px;\n    height: 36px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: transparent;\n    border: none;\n    border-radius: 4px;\n    font-size: 18px;\n    cursor: pointer;\n    flex-shrink: 0;\n    position: relative;\n  }\n  .mobile-shelf-icon:active {\n    background: rgba(42, 31, 10, 0.5);\n  }\n  .mobile-shelf-popup {\n    position: absolute;\n    bottom: 44px;\n    background: #120e08;\n    border: 2px solid #f59e0b;\n    border-radius: 8px;\n    padding: 10px 12px;\n    min-width: 140px;\n    z-index: 80;\n    box-shadow: 0 4px 16px rgba(0,0,0,0.9);\n    font-family: 'Josefin Sans', sans-serif;\n  }\n  .mobile-action-strip::-webkit-scrollbar {\n    width: 3px;\n  }\n  .mobile-action-strip::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 2px;\n  }\n  .mobile-drawer-backdrop {\n    position: absolute;\n    inset: 0;\n    z-index: 90;\n    background: rgba(0, 0, 0, 0.55);\n  }\n  .mobile-drawer {\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    width: 240px;\n    z-index: 95;\n    background: rgba(18, 14, 8, 0.55);\n    backdrop-filter: blur(4px);\n    -webkit-backdrop-filter: blur(4px);\n    border-right: 1px solid #3d2e0f;\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    padding: 8px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    box-shadow: 4px 0 20px rgba(0,0,0,0.8);\n    transition: transform 0.2s ease;\n  }\n  .mobile-drawer-left {\n    left: 0;\n    border-right: 1px solid #3d2e0f;\n    border-left: none;\n  }\n  .mobile-drawer-right {\n    right: 0;\n    left: auto;\n    border-left: 1px solid #3d2e0f;\n    border-right: none;\n    box-shadow: -4px 0 20px rgba(0,0,0,0.8);\n  }\n  .mobile-drawer::-webkit-scrollbar {\n    width: 3px;\n  }\n  .mobile-drawer::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 2px;\n  }\n  .mobile-drawer-tab {\n    position: absolute;\n    top: 50%;\n    transform: translateY(-50%);\n    z-index: 85;\n    width: 20px;\n    height: 48px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: #16100a;\n    border: 1px solid #3d2e0f;\n    cursor: pointer;\n    font-size: 12px;\n    color: #8a7a64;\n  }\n  .mobile-drawer-tab-left {\n    left: 0;\n    border-radius: 0 6px 6px 0;\n    border-left: none;\n  }\n  .mobile-drawer-tab-right {\n    right: 0;\n    left: auto;\n    border-radius: 6px 0 0 6px;\n    border-right: none;\n  }\n  .mobile-drawer-tab:active {\n    background: #2a1f0a;\n  }\n  .mobile-drawer-forge {\n    width: 160px;\n  }\n  .mobile-portrait-overlay {\n    position: fixed;\n    inset: 0;\n    z-index: 500;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    background: rgba(10, 7, 4, 0.92);\n    pointer-events: none;\n    font-family: 'Cinzel', serif;\n  }\n  @keyframes rotateHint {\n    0%, 100% { transform: rotate(0deg); }\n    25% { transform: rotate(-20deg); }\n    75% { transform: rotate(20deg); }\n  }\n  .rotate-hint-icon {\n    font-size: 48px;\n    animation: rotateHint 2s ease-in-out infinite;\n    margin-bottom: 16px;\n  }\n  @keyframes decreeGlow {\n    0%, 100% { filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.3)) drop-shadow(0 0 2px rgba(0,0,0,0.6)); }\n    50% { filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.8)) drop-shadow(0 0 20px rgba(245, 158, 11, 0.4)) drop-shadow(0 0 2px rgba(0,0,0,0.6)); }\n  }\n  .decree-glow-img {\n    animation: decreeGlow 1.8s ease-in-out infinite;\n  }\n  .action-icon-glow {\n    filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.25)) drop-shadow(0 0 3px rgba(251, 146, 60, 0.2)) drop-shadow(0 0 1px rgba(0,0,0,0.6));\n  }\n  @keyframes decreeUrgent {\n    0%, 100% { filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.4)) drop-shadow(0 0 2px rgba(0,0,0,0.6)); }\n    50% { filter: drop-shadow(0 0 16px rgba(239, 68, 68, 1.0)) drop-shadow(0 0 30px rgba(239, 68, 68, 0.6)) drop-shadow(0 0 2px rgba(0,0,0,0.6)); }\n  }\n  .decree-urgent-img {\n    animation: decreeUrgent 0.9s ease-in-out infinite;\n  }\n  @keyframes weaponShake {\n    0% { transform: translate(0,0); }\n    20% { transform: translate(-4px,2px); }\n    40% { transform: translate(4px,-2px); }\n    60% { transform: translate(-2px,2px); }\n    80% { transform: translate(2px,-1px); }\n    100% { transform: translate(0,0); }\n  }\n  .weapon-shake { animation: weaponShake 0.35s ease-out forwards; }\n  @keyframes mysteryShake {\n    0% { transform: translate(0,0); }\n    5% { transform: translate(-10px,5px); }\n    10% { transform: translate(10px,-5px); }\n    15% { transform: translate(-9px,8px); }\n    20% { transform: translate(9px,-7px); }\n    25% { transform: translate(-8px,6px); }\n    30% { transform: translate(8px,-6px); }\n    38% { transform: translate(-5px,4px); }\n    46% { transform: translate(5px,-4px); }\n    54% { transform: translate(-3px,3px); }\n    62% { transform: translate(3px,-2px); }\n    72% { transform: translate(-2px,2px); }\n    82% { transform: translate(2px,-1px); }\n    92% { transform: translate(-1px,1px); }\n    100% { transform: translate(0,0); }\n  }\n  .mystery-shake { animation: mysteryShake 3.5s ease-out forwards; }\n";

// --- Portrait overlay hint ---

function PortraitOverlay() {
    return (
        <div className="mobile-portrait-overlay">
            <div className="rotate-hint-icon">{"\uD83D\uDCF1"}</div>
            <div style={{ fontSize: 14, color: "#f59e0b", letterSpacing: 2, fontWeight: "bold", textAlign: "center" }}>ROTATE YOUR DEVICE</div>
            <div style={{ fontSize: 10, color: "#8a7a64", letterSpacing: 1, marginTop: 8, textAlign: "center", maxWidth: 220, lineHeight: 1.6 }}>Wobbly Anvil is designed for landscape mode</div>
        </div>
    );
}

// --- Mobile Shell (full viewport, portrait-aware) ---

function MobileShell(props) {
    var viewport = useViewportInfo();
    var isFull = useFullscreenState();

    useWakeLock();
    useFullscreenPersistence(isFull);

    var isPortrait = viewport.isPortrait;
    var shellHeight = viewport.height;
    var shellWidth = viewport.width;

    var portraitScale = 1;
    var portraitWidth = shellWidth;
    var portraitHeight = shellHeight;
    if (isPortrait) {
        var effectiveW = Math.max(shellWidth, shellHeight);
        var effectiveH = Math.min(shellWidth, shellHeight);
        var scaleX = shellWidth / effectiveW;
        var scaleY = shellHeight / effectiveH;
        portraitScale = Math.min(scaleX, scaleY);
        portraitWidth = effectiveW;
        portraitHeight = effectiveH;
    }

    var shellStyle = isPortrait ? {
        height: portraitHeight + "px",
        width: portraitWidth + "px",
        transform: "scale(" + portraitScale + ")",
        transformOrigin: "top left",
    } : {
        height: shellHeight + "px",
    };

    return (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0a0704", position: "relative" }}>
            <style>{MOBILE_CSS}</style>
            <div className="mobile-shell"
                 style={shellStyle}>
                <div className={props.className || ""}
                     style={{ width: "100%", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    {props.children}
                </div>
            </div>
            {isPortrait && <PortraitOverlay />}
        </div>
    );
}

// --- Shelf Icon with popup ---

function ShelfItem(props) {
    var item = props.item;
    var [showPopup, setShowPopup] = useState(false);
    var ref = useRef(null);

    useEffect(function() {
        if (!showPopup) return;
        function handleTap(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setShowPopup(false);
            }
        }
        document.addEventListener("touchstart", handleTap);
        document.addEventListener("mousedown", handleTap);
        return function() {
            document.removeEventListener("touchstart", handleTap);
            document.removeEventListener("mousedown", handleTap);
        };
    }, [showPopup]);

    return (
        <div ref={ref} className="mobile-shelf-icon" onClick={function(e) { e.stopPropagation(); setShowPopup(function(s) { return !s; }); }}
             style={ showPopup ? { background: "#2a1f0a", borderColor: "#f59e0b" } : undefined }>
            <img src={process.env.PUBLIC_URL + "/images/icons/waIconShield1.png"} alt="" draggable={false} style={{ width: "80%", height: "80%", objectFit: "contain", pointerEvents: "none" }} />
            {showPopup && (
                <div className="mobile-shelf-popup" onClick={function(e) { e.stopPropagation(); }} style={{ right: 0, left: "auto" }}>
                    <div style={{ fontSize: 10, color: item.color || "#f59e0b", letterSpacing: 1, fontWeight: "bold", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 9, color: "#c8b89a", marginBottom: 2 }}>{item.wName}</div>
                    <div style={{ fontSize: 9, color: "#8a7a64", marginBottom: 3 }}>{item.matName || ""}</div>
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: "bold" }}>~{item.val}g</div>
                </div>
            )}
        </div>
    );
}

// --- Mobile Bottom Bar ---

function MobileBottomBar(props) {
    var finished = props.finished || [];
    var T = THEME;
    return (
        <W.Strip className="mobile-bottom-bar" gap="sm" pad="md" h={T.layout.bottomBarH}
                 bg="bgPanel" style={{ borderTop: T.borders.thin, flexShrink: 0, fontFamily: T.fonts.body }}>
            <W.Strip className="mobile-bottom-panel" gap="md" pad="md" h={32}
                     bg="bgMid" border="thinMid" radius="md">
                <W.Label size="sm" color={props.timeColor || T.colors.green} bold>
                    {props.timeLabel || "8:00AM"}
                </W.Label>
                <div style={{ width: 60, height: T.layout.barHeightSm, background: T.colors.bgDeep, borderRadius: T.radius.sm, overflow: "hidden", border: T.borders.thinMid }}>
                    <div style={{ height: "100%", width: (props.timePct || 100) + "%", background: props.timeColor || T.colors.green, borderRadius: T.radius.sm }} />
                </div>
            </W.Strip>
            <W.Strip className="mobile-bottom-panel" gap="md" pad="md" h={32}
                     bg="bgMid" border="thinMid" radius="md">
                <W.Label size="xxs" color="textLabel" spacing="tight" font="heading">STAM</W.Label>
                <W.Label size="sm" color={props.staminaColor || T.colors.gold} bold>
                    {props.stamina || 0}/{props.maxStam || 5}
                </W.Label>
                <div style={{ width: 50, height: T.layout.barHeightSm, background: T.colors.bgDeep, borderRadius: T.radius.sm, overflow: "hidden", border: T.borders.thinMid }}>
                    <div style={{ height: "100%", width: (props.staminaPct || 100) + "%", background: props.staminaColor || T.colors.gold, borderRadius: T.radius.sm }} />
                </div>
            </W.Strip>
            <W.Strip className="mobile-bottom-panel" gap="xs"
                     style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden" }}
                     bg="bgMid" border="thinMid" radius="md" pad="md" h={32}>
                {finished.length === 0 && (
                    <W.Label size="xxs" color="borderLight" spacing="tight">SHELF EMPTY</W.Label>
                )}
                {finished.map(function(w) {
                    return <ShelfItem key={w.id} item={w} />;
                })}
            </W.Strip>
            <div data-fairy-target="gold-portrait" style={{ flexShrink: 0 }}><W.Label size={21} color="gold" bold font="heading">
                {props.gold || 0}g
            </W.Label></div>
            <W.Btn onClick={props.onOptions} icon={"\u2699"}
                   color="textLabel" bg="bgWarm" size={20} radius="md"
                   w={32} h={32} bold={false} upper={false}
                   style={{ padding: 0, flexShrink: 0, border: THEME.borders.thin }} />
            <W.Btn onClick={props.onToggleFullscreen} icon={props.isFull ? "\u2716" : "\u26F6"}
                   color="textLabel" bg="bgWarm" size={16} radius="md"
                   w={32} h={32} bold={false} upper={false}
                   style={{ padding: 0, flexShrink: 0, border: THEME.borders.thin }} />
        </W.Strip>
    );
}

// --- Mobile Layout ---

function MobileLayout(props) {
    var T = THEME;
    var handedness = props.handedness || "right";
    var isLeftHanded = handedness === "left";
    var phase = props.phase || "idle";
    var isForging = phase !== "idle" && phase !== "select" && phase !== "select_mat";
    var isQTEActive = phase === "heat" || phase === "hammer" || phase === "quench";
    var isInForgeFlow = phase !== "idle";
    var isFull = useFullscreenState();
    var finished = props.finished || [];

    // --- Drawer state ---
    var [drawerOpen, setDrawerOpen] = useState(false);
    var [heldStat, setHeldStat] = useState(null);

    var prevInForgeFlow = useRef(false);
    useEffect(function() {
        if (isInForgeFlow && !prevInForgeFlow.current) {
            setDrawerOpen(true);
        }
        if (!isInForgeFlow && prevInForgeFlow.current) {
            setDrawerOpen(false);
        }
        prevInForgeFlow.current = isInForgeFlow;
    }, [isInForgeFlow]);

    // --- Helper: desktop-style info row ---
    function DrawerRow(rProps) {
        return (
            <W.Strip justify="space-between" gap="xs" style={{ minHeight: 20 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">{rProps.label}</W.Label>
                <W.Label size={rProps.size || "xl"} color={rProps.color || "gold"} bold style={{ textAlign: "right" }}>{rProps.value}</W.Label>
            </W.Strip>
        );
    }

    var drawerContent = isInForgeFlow ? (
        <W.Box gap="md" style={{ padding: "4px 0" }}>
            <W.Strip gap="xs" center style={{ marginBottom: 4 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">LV</W.Label>
                <W.Label size="h2" color="gold" bold font="heading">{props.level || 1}</W.Label>
                <W.Label size="xl" color="goldBright" bold font="heading" style={{ marginLeft: 8 }}>{props.rankName || ""}</W.Label>
            </W.Strip>
            <W.Divider />
            <DrawerRow label="MATERIAL" value={props.matName || ""} color={props.matColor || "#a0a0a0"} />
            <DrawerRow label="WEAPON" value={props.weaponName || ""} color="textLight" />
            <W.Divider />
            <DrawerRow label="SPEED" value={props.speedLabel || "NORMAL"} color={props.speedColor || T.colors.gold} />
            <DrawerRow label="STRIKES" value={props.strikeLabel || "STEADY"} color={props.strikeColor || T.colors.gold} />
            <DrawerRow label="EFF. DIFF" value={(props.effDiff || 0) + (props.matDiffMod > 0 ? " (+" + props.matDiffMod + ")" : "")} color={props.diffColor || T.colors.goldBright} />
            <W.Divider />
            <W.Strip justify="space-between" gap="xs" style={{ minHeight: 20 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">QUALITY</W.Label>
                <W.Strip gap="xs">
                    <W.Label size="xl" color={props.qualityColor || "gold"} bold>{props.qualityLabel || ""}</W.Label>
                    <W.Label size="xl" color={props.qualityColor || "gold"} bold>{props.qualScore || 0}</W.Label>
                </W.Strip>
            </W.Strip>
            <W.Strip justify="space-between" gap="xs" style={{ minHeight: 20 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">STRESS</W.Label>
                <W.Strip gap="xs" center>
                    <W.PipRow count={3} filled={props.stressFilled || 0} color={props.stressColor || T.colors.green} size={10} />
                    <W.Label size="xl" color={props.stressColor || T.colors.green} bold>{props.stressLabel || "CALM"}</W.Label>
                </W.Strip>
            </W.Strip>
        </W.Box>
    ) : (
        <W.Box gap="sm" style={{ padding: "4px 0" }}>
            <W.Strip gap="xs" center style={{ marginBottom: 4 }}>
                <W.Label size="xl" color="textLabel" spacing="tight" bold font="heading">LV</W.Label>
                <W.Label size="h2" color="gold" bold font="heading">{props.level || 1}</W.Label>
                <W.Label size="h3" color="goldBright" bold font="heading" style={{ marginLeft: 8 }}>{props.rankName || ""}</W.Label>
            </W.Strip>
            <W.Divider />
            {props.stats && (
                <W.Box gap="md" style={{ alignItems: "center" }}>
                    {[["BRAWN", "brawn", T.colors.gold], ["PRECISION", "precision", T.colors.blue], ["TECHNIQUE", "technique", T.colors.green], ["SILVER TONGUE", "silverTongue", T.colors.purple]].map(function(s) {
                        var statKey = s[1];
                        var value = props.stats[statKey] || 0;
                        var cost = value < 3 ? 1 : value < 6 ? 2 : 3;
                        var points = props.statPoints || 0;
                        var canAfford = points >= cost;
                        var locked = props.statLocked;
                        var meta = GameConstants.STAT_META[statKey];
                        var isHeld = heldStat === statKey;
                        var showBtn = points > 0 && !locked;
                        return (
                            <W.Box key={s[0]} style={{ position: "relative", width: "100%" }}>
                                <W.Strip justify="space-between" gap="xs" center
                                         style={{ cursor: "pointer", paddingRight: 4 }}
                                         onClick={function() { setHeldStat(function(h) { return h === statKey ? null : statKey; }); }}>
                                    <W.Label size="lg" color={s[2]} spacing="tight" bold font="heading">{s[0]}</W.Label>
                                    <button onClick={function(e) { e.stopPropagation(); if (canAfford && props.onAllocate) props.onAllocate(statKey); }} style={{
                                        background: "#2a1f0a", border: "1px solid " + (canAfford ? "#f59e0b" : "#3d2e0f"),
                                        borderRadius: 4, color: canAfford ? "#f59e0b" : "#4a3c2c",
                                        padding: "2px 8px", fontSize: 11, cursor: canAfford ? "pointer" : "default",
                                        letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold",
                                        flexShrink: 0, visibility: showBtn ? "visible" : "hidden",
                                    }}>{cost}pt</button>
                                </W.Strip>
                                <W.PipRow count={10} filled={value} color={s[2]} size={14} />
                                {isHeld && meta && (
                                    <div style={{
                                        position: "absolute", left: 0, right: 0, top: "100%",
                                        background: "#0a0704", border: "1px solid " + s[2] + "55",
                                        borderRadius: 6, padding: "6px 10px", marginTop: 2,
                                        fontSize: 11, color: "#c8b89a", lineHeight: 1.5,
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.9)",
                                        zIndex: T.z.shelfPopup,
                                    }}>
                                        <div style={{ color: s[2], fontWeight: "bold", marginBottom: 2, fontSize: 10 }}>{meta.label.toUpperCase()}</div>
                                        {meta.desc}
                                        <div style={{ marginTop: 3, color: "#8a7a64", fontSize: 9 }}>Level {value} · Next: {cost}pt</div>
                                    </div>
                                )}
                            </W.Box>
                        );
                    })}
                </W.Box>
            )}
            <W.Divider />
            <W.Label size="xl" color="gold" spacing="tight" bold font="heading" align="center" style={{ marginBottom: 2 }}>FORGE UPGRADES</W.Label>
            {props.upgrades && [["anvil", "Anvil"], ["hammer", "Hammer"], ["forge", "Forge"], ["quench", "Quench"], ["furnace", "Furnace"]].map(function(pair) {
                var key = pair[0], label = pair[1];
                var lvl = (props.upgrades[key] || 0);
                var upgradeData = GameConstants.UPGRADES[key][lvl];
                var upgradeColor = GameConstants.UPGRADE_COLORS[lvl] || "#a0a0a0";
                return (
                    <W.Strip key={key} justify="space-between" gap="xs" style={{ minHeight: 22 }}>
                        <W.Label size="lg" color="textLabel" spacing="tight" bold font="heading">{label.toUpperCase()}</W.Label>
                        <W.Label size="lg" color={upgradeColor} bold style={{ textAlign: "right" }}>{upgradeData ? upgradeData.name : "\u2014"}</W.Label>
                    </W.Strip>
                );
            })}
        </W.Box>
    );

    // Drawer side classes
    var drawerSide = isLeftHanded ? "right" : "left";
    var drawerSideClass = "mobile-drawer mobile-drawer-" + drawerSide + (isInForgeFlow ? " mobile-drawer-forge" : "");
    var tabSideClass = "mobile-drawer-tab mobile-drawer-tab-" + drawerSide;
    var tabArrow = isLeftHanded ? (drawerOpen ? "\u25B6" : "\u25C0") : (drawerOpen ? "\u25C0" : "\u25B6");

    var drawer = (
        <>
            {!isInForgeFlow && (
                <div className={tabSideClass} onClick={function() { setDrawerOpen(function(o) { return !o; }); }}>
                    {tabArrow}
                </div>
            )}
            {drawerOpen && !isInForgeFlow && (
                <div className="mobile-drawer-backdrop" onClick={function() { setDrawerOpen(false); }} />
            )}
            {drawerOpen && (
                <div className={drawerSideClass} data-fairy-target="forge_info">
                    {drawerContent}
                </div>
            )}
        </>
    );

    // --- Action strip ---
    var actionStripClass = "mobile-action-strip" + (isQTEActive ? " mobile-action-strip-qte" : "");
    var col1Nudge = isLeftHanded ? { paddingRight: "10%" } : { paddingLeft: "10%" };
    var col1Style = { flex: 1.3, display: "flex", flexDirection: "column", gap: "8vh", justifyContent: "center", alignItems: "center" };
    Object.assign(col1Style, col1Nudge);
    var bowlDirection = isLeftHanded ? "row-reverse" : "row";
    var actionStrip = (
        <div className={actionStripClass} data-fairy-target="btn_area" style={{ height: "100%", padding: "2vh 4px", gap: "1.5vh", overflow: "hidden", pointerEvents: props.tutorialHighlight ? "none" : "auto" }}>
            {isForging && phase === "sess_result" ? (
                <div style={{ flex: 1, display: "flex", gap: "1.5vh", flexDirection: bowlDirection }}>
                    <div style={col1Style}>
                        <div data-fairy-target="btn_forge_again" style={{ display: "flex" }}><MobileBtn imgSrc={IC.forge} onClick={props.onForge} disabled={props.forgeDisabled} holdContent="Heat and strike again to improve quality" imgSize={79} /></div>
                        <div data-fairy-target="btn_quench" style={{ display: "flex" }}><MobileBtn imgSrc={IC.quench} onClick={props.onQuench} disabled={props.quenchDisabled} holdContent="Finish the weapon and lock in your work" imgSize={79} /></div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                        <div data-fairy-target="btn_normalize" style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.normalize} onClick={props.onNormalize} disabled={props.normalizeDisabled} color="#60a5fa" holdContent="Reduce stress at the cost of some quality" /></div>
                        <div data-fairy-target="btn_scrap" style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.scrap} onClick={props.onScrap} color="#8a7a64" holdContent="Destroy this weapon and recover the material" /></div>
                        <div data-fairy-target="btn_leave" style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.leave} onClick={props.onLeave} color="#60a5fa" holdContent="Walk away, weapon stays on the anvil" /></div>
                    </div>
                </div>
            ) : isQTEActive ? (
                <div style={{ flex: 1, display: "flex", gap: "1.5vh", flexDirection: bowlDirection, visibility: "hidden", pointerEvents: "none" }}>
                    <div style={col1Style}>
                        <div style={{ display: "flex" }}><MobileBtn imgSrc={IC.sleep} /></div>
                        <div style={{ display: "flex" }}><MobileBtn imgSrc={IC.rest} /></div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.scavenge} /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.shop} /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.bag} /></div>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, display: "flex", gap: "1.5vh", flexDirection: bowlDirection }}>
                    <div style={col1Style}>
                        <div data-fairy-target="btn_sleep" style={{ display: "flex" }}><MobileBtn imgSrc={IC.sleep} onClick={props.onSleep} disabled={props.sleepDisabled} holdContent="End the day and rest until morning" imgSize={79} /></div>
                        <div data-fairy-target="btn_rest" style={{ display: "flex" }}><MobileBtn imgSrc={IC.rest} onClick={props.onRest} disabled={props.restDisabled} holdContent="Wait one hour, recover some stamina" imgSize={79} /></div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                        <div data-fairy-target="btn_scavenge" style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.scavenge} onClick={props.onScavenge} disabled={props.scavengeDisabled} holdContent="Search the scrapyard for free materials" /></div>
                        <div data-fairy-target="btn_shop" style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.shop} onClick={props.onShop} disabled={props.shopDisabled} holdContent="Browse weapons, materials, and upgrades" /></div>
                        <div data-fairy-target="btn_mats" style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.bag} onClick={props.onMats} disabled={props.matsDisabled} holdContent="Check your material stockpile" /></div>
                    </div>
                </div>
            )}
            {/* Utility row */}
            <div style={{ flex: 0.6, display: "flex", flexDirection: isLeftHanded ? "row-reverse" : "row", gap: "1.5vh", flexShrink: 0, maxHeight: "10vh", pointerEvents: "auto", justifyContent: isLeftHanded ? "flex-start" : "flex-end" }}>
                <div style={{ display: "flex", width: 40 }}>
                    <MobileBtn icon={"\u2699"} iconSize={32} onClick={props.onOptions} />
                </div>
                <div style={{ display: "flex", width: 40 }}>
                    <MobileBtn icon={isFull ? "\u2716" : "\u26F6"} iconSize={32} onClick={function() {
                        if (isFull) { userExitedFullscreen.current = true; exitFullscreen(); }
                        else { userExitedFullscreen.current = false; requestFullscreen(document.documentElement); }
                    }} />
                </div>
            </div>
        </div>
    );

    // --- Decree float ---
    var decreeFloat = props.royalQuest && !isForging && !isQTEActive ? (
        <div style={{
            position: "absolute",
            top: "9%",
            left: isLeftHanded ? "auto" : "6%",
            right: isLeftHanded ? "6%" : "auto",
            zIndex: T.z.decreeFloat,
            width: 78,
            height: 78,
        }}>
            <DecreeBtn quest={Object.assign({}, props.royalQuest, { _currentDay: props.day || 1 })} questNum={props.questNum} />
        </div>
    ) : null;

    // --- Rep float ---
    var repFloat = (
        <RepFloat reputation={props.reputation} isLeftHanded={isLeftHanded} />
    );

    // --- Notification badge ---
    var hasStatPoints = !isForging && !isQTEActive && (props.statPoints || 0) > 0;
    var notifyBadge = hasStatPoints ? (
        <img src={process.env.PUBLIC_URL + "/images/icons/waIconExclamation.png"} alt="!" onClick={function() { setDrawerOpen(true); }} style={{
            position: "absolute",
            top: "calc(50% - 36px)",
            left: isLeftHanded ? "auto" : 21,
            right: isLeftHanded ? 21 : "auto",
            zIndex: T.z.drawerTab + 1,
            width: 22,
            height: 22,
            cursor: "pointer",
            filter: "drop-shadow(0 0 6px rgba(74, 222, 128, 0.6))",
        }} />
    ) : null;

    // --- Center content ---
    var forgeBtnPos = { position: "absolute", top: "55%", left: "50%", transform: "translate(-50%, -50%)", zIndex: T.z.ui };
    var center = (
        <div className="mobile-center" data-fairy-target="scene" onClick={isQTEActive ? props.onForgeClick : null} onTouchStart={isQTEActive ? function(e) { e.preventDefault(); props.onForgeClick(); } : null} style={{ cursor: isQTEActive ? "pointer" : "default" }}>
            {props.overlay}
            {props.scene}
            {props.forgeUI}
            <ForgeFireFX active={isForging} config={GameConstants.FIRE_FX_MOBILE} />

            {phase === "idle" && !props.hasWip && (
                <W.Btn data-fairy-target="btn_forge_start" label="BEGIN FORGING" onClick={props.onBeginForge} disabled={props.beginForgeDisabled}
                       color="gold" font="heading" size="xl" radius="lg" spacing="normal"
                       style={Object.assign({}, forgeBtnPos, { padding: "10px 28px", whiteSpace: "nowrap" })} />
            )}

            {phase === "idle" && props.hasWip && (
                <W.Strip gap="md" style={forgeBtnPos}>
                    <W.Btn label="RESUME" onClick={props.onResumeWip} disabled={props.resumeWipDisabled}
                           color="blue" bg={props.resumeWipDisabled ? "bgDeep" : "#0a1a2a"}
                           font="heading" size="lg" radius="lg" spacing="normal"
                           style={{ padding: "10px 20px" }} />
                    <W.Btn label="SCRAP" onClick={props.onScrapWip}
                           color="textLabel" bg="bgWarm" font="heading" size="lg" radius="lg" spacing="normal"
                           style={{ padding: "10px 16px", border: T.borders.heavy }} />
                </W.Strip>
            )}
        </div>
    );

    // --- Assemble ---
    var middleDirection = isLeftHanded ? "row-reverse" : "row";
    var barBoxStyle = {
        background: "rgba(0,0,0,0.50)",
        border: "1px solid " + T.colors.borderDark,
        borderRadius: T.radius.md,
        pointerEvents: "none",
    };

    return (
        <MobileShell className={props.className}>
            <div className="mobile-middle" style={{ flexDirection: middleDirection }}>
                {center}
                {decreeFloat}
                {repFloat}
                {notifyBadge}
                {props.mEvent && !isForging && (
                    <EventBanner mEvent={props.mEvent} />
                )}
                {isForging && props.royalQuest && !props.royalQuest.fulfilled && (
                    <EventBanner mEvent={{ icon: "\uD83D\uDCDC", title: props.royalQuest.weaponName + " needed", desc: props.royalQuest.minQualityLabel + "+ " + props.royalQuest.materialRequired.toUpperCase(), color: "#f59e0b", fontSize: 16 }} />
                )}
                {isForging && (!props.royalQuest || props.royalQuest.fulfilled) && props.mEvent && (
                    <EventBanner mEvent={props.mEvent} />
                )}
                {/* DAY label */}
                <div style={{
                    position: "absolute",
                    bottom: "2%",
                    left: isLeftHanded ? "auto" : "2%",
                    right: isLeftHanded ? "2%" : "auto",
                    zIndex: T.z.ui + 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: barBoxStyle.background,
                    border: barBoxStyle.border,
                    borderRadius: barBoxStyle.borderRadius,
                    padding: "4px 14px",
                    pointerEvents: "none",
                }}>
                    <span style={{ fontFamily: "'Cinzel', serif", color: T.colors.textLabel, fontSize: 18, letterSpacing: 2, fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.9)", lineHeight: 1 }}>DAY</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 28, color: T.colors.textLight, fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.9)", lineHeight: 1 }}>{props.day || 1}</span>
                </div>

                {/* Shelf icons */}
                {finished.length > 0 && !isForging && !isQTEActive && (
                    <div style={{
                        position: "absolute",
                        bottom: "14%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: T.z.ui + 3,
                        display: "flex",
                        gap: 6,
                        pointerEvents: "auto",
                    }}>
                        {finished.map(function(w) {
                            return <ShelfItem key={w.id} item={w} />;
                        })}
                    </div>
                )}

                {/* Time + Stamina */}
                {!isForging && !isQTEActive && <div data-fairy-target="stamina" style={{
                    position: "absolute",
                    bottom: "2%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: T.z.ui + 2,
                    width: "45%",
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    padding: "4px 14px",
                    background: barBoxStyle.background,
                    border: barBoxStyle.border,
                    borderRadius: barBoxStyle.borderRadius,
                    pointerEvents: "none",
                }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <W.Label size="xs" color="textLabel" spacing="tight" bold font="heading" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>TIME</W.Label>
                        <div style={{ width: "100%", height: 10, background: T.colors.bgDeep, borderRadius: T.radius.sm, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: (props.timePct || 0) + "%", background: props.timeColor || T.colors.green, borderRadius: T.radius.sm, transition: "width 0.3s" }} />
                        </div>
                        <W.Label size="xs" color={props.timeColor || T.colors.green} bold style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{props.timeLabel || "8:00AM"}</W.Label>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <W.Label size="xs" color="textLabel" spacing="tight" bold font="heading" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>STAM</W.Label>
                        <div style={{ width: "100%", height: 10, background: T.colors.bgDeep, borderRadius: T.radius.sm, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: (props.staminaPct || 0) + "%", background: props.staminaColor || T.colors.gold, borderRadius: T.radius.sm, transition: "width 0.3s" }} />
                        </div>
                        <W.Label size="xs" color={props.staminaColor || T.colors.gold} bold style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{(props.stamina || 0) + "/" + (props.maxStam || 5)}</W.Label>
                    </div>
                </div>}

                {/* Gold */}
                <div data-fairy-target="gold" style={{
                    position: "absolute",
                    bottom: "2%",
                    left: isLeftHanded ? "auto" : "14%",
                    right: isLeftHanded ? "14%" : "auto",
                    zIndex: T.z.ui + 2,
                    display: "flex",
                    alignItems: "center",
                    padding: "4px 12px",
                    background: barBoxStyle.background,
                    border: barBoxStyle.border,
                    borderRadius: barBoxStyle.borderRadius,
                    pointerEvents: "none",
                }}>
                    <W.Label size={21} color="gold" bold font="heading" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{props.gold || 0}g</W.Label>
                </div>

                {/* Sidebar background */}
                <img src={IC.sidebar} alt="" draggable={false} style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: isLeftHanded ? "auto" : 0,
                    left: isLeftHanded ? 0 : "auto",
                    height: "100%",
                    width: 340,
                    objectFit: "cover",
                    opacity: .8,
                    transform: isLeftHanded ? "scaleX(-1)" : "none",
                    pointerEvents: "none",
                    zIndex: T.z.ui - 1,
                }} />
                {/* Action strip */}
                <div style={{
                    position: "absolute",
                    top: 0,
                    bottom: "3%",
                    right: isLeftHanded ? "auto" : "3%",
                    left: isLeftHanded ? "3%" : "auto",
                    width: 200,
                    display: "flex",
                    flexDirection: "column",
                    zIndex: T.z.ui,
                    background: "transparent",
                    pointerEvents: isQTEActive ? "none" : "auto",
                }}>
                    {actionStrip}
                </div>
                {drawer}
            </div>
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
    requestFullscreen: requestFullscreen,
    isFullscreenActive: isFullscreenActive,
    userExitedFullscreen: userExitedFullscreen,
};

export default MobileLayoutModule;