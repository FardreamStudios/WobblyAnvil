// ============================================================
// HUDViewer.js — Dev Tool: Mobile HUD Layout Viewer
// Interactive layout reference for the mobile game HUD.
// All data imported from real source files.
// Dev-only — never included in production builds.
//
// Access: localhost:3000/dev/hud-viewer
// ============================================================

import { useState } from "react";
import THEME from "../config/theme.js";
import GameConstants from "../modules/constants.js";
import DevZone, { TooltipProvider } from "./DevZone.js";

var T = THEME;

var PHASE_LIST = ["idle", "select", "select_mat", "heat", "hammer", "sess_result", "quench"];

var IDLE_BUTTONS = [
    { icon: "\uD83D\uDCA4", label: "SLEEP", location: "App.js \u2192 sleep()" },
    { icon: "\u23F3", label: "REST", location: "App.js \u2192 waitHour()" },
    { icon: "\uD83D\uDCE3", label: "PROMOTE", location: "App.js \u2192 promote()" },
    { icon: "\uD83D\uDDD1", label: "SCAVENGE", location: "App.js \u2192 scavenge()" },
    { icon: "\uD83D\uDED2", label: "SHOP", location: "App.js \u2192 setShowShop()" },
    { icon: "\u2692\uFE0F", label: "FORGE", location: "App.js \u2192 confirmSelect()" },
];

var FORGING_BUTTONS = [
    { icon: "\u2692\uFE0F", label: "FORGE", location: "App.js \u2192 attemptForge()" },
    { icon: "\u2696", label: "NORM", location: "App.js \u2192 normalize()" },
    { icon: "\uD83D\uDCA7", label: "QUENCH", location: "App.js \u2192 setPhase(QUENCH)" },
    { icon: "\uD83D\uDDD1", label: "SCRAP", location: "App.js \u2192 scrapWeapon()" },
    { icon: "\u23F8", label: "LEAVE", location: "App.js \u2192 resetForge()" },
];

var SELECT_BUTTONS = [
    { icon: "\u2694\uFE0F", label: "WEAPON", location: "App.js \u2192 weapon select UI" },
    { icon: "\u2699", label: "OPTIONS", location: "App.js \u2192 setShowOptions()" },
];

var QTE_LABELS = {
    heat: "CLICK TO PULL FROM FORGE",
    hammer: "CLICK TO STRIKE",
    quench: "CLICK TO QUENCH",
};

// ============================================================
// MOCK BUTTON
// ============================================================

function MockBtn(props) {
    var icon = props.icon;
    var label = props.label;
    var color = props.color;
    var disabled = props.disabled;
    var c = disabled ? T.colors.disabled : (color || T.colors.gold);
    var bg = disabled ? T.colors.bgDeep : T.colors.bgWarm;
    return (
        <div style={{
            background: bg, border: "1px solid " + c + "88",
            borderRadius: T.radius.md,
            color: c, fontSize: T.fontSize.xs,
            fontFamily: T.fonts.body, fontWeight: "bold",
            letterSpacing: 1, textTransform: "uppercase",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 2, flex: 1, minHeight: 0, padding: "2px 4px",
            opacity: disabled ? 0.4 : 1,
        }}>
            <span style={{ fontSize: T.fontSize.xxl, lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
        </div>
    );
}

// ============================================================
// MAIN VIEWER
// ============================================================

export default function HUDViewer() {
    var [phase, setPhase] = useState("idle");
    var [hand, setHand] = useState("right");
    var [drawerOpen, setDrawerOpen] = useState(false);
    var [aspect, setAspect] = useState("20 / 9");

    var ASPECT_OPTIONS = [
        { label: "20:9", value: "20 / 9", desc: "PHONE" },
        { label: "16:9", value: "16 / 9", desc: "WIDE" },
        { label: "16:10", value: "16 / 10", desc: "TABLET" },
    ];

    var isLeftHanded = hand === "left";
    var isForging = phase !== "idle" && phase !== "select" && phase !== "select_mat";
    var isQTE = phase === "heat" || phase === "hammer" || phase === "quench";
    var isSessResult = phase === "sess_result";
    var isSelect = phase === "select" || phase === "select_mat";
    var drawerAutoOpen = isForging || isSessResult || isQTE;
    var showDrawer = drawerAutoOpen || drawerOpen;

    var stripButtons;
    if (isQTE) {
        stripButtons = [];
    } else if (isSessResult) {
        stripButtons = FORGING_BUTTONS;
    } else if (isSelect) {
        stripButtons = SELECT_BUTTONS;
    } else {
        stripButtons = IDLE_BUTTONS;
    }

    var drawerLabel = (isForging || isQTE || isSessResult)
        ? "FORGE STATS"
        : isSelect ? "WEAPON SELECT" : "IDLE INFO";

    var middleDirection = isLeftHanded ? "row-reverse" : "row";

    return (
        <TooltipProvider>
            <div style={{
                width: "100%", minHeight: "100vh",
                background: T.colors.bgDeep,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                fontFamily: T.fonts.body, color: T.colors.textLight,
                padding: 20, gap: 16, boxSizing: "border-box",
            }}>
                <style>{"@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Josefin+Sans:wght@400;600;700&display=swap');"}</style>

                {/* TITLE */}
                <div style={{ fontFamily: T.fonts.heading, fontSize: 18, color: T.colors.gold, letterSpacing: 4, fontWeight: "bold" }}>
                    MOBILE HUD LAYOUT VIEWER
                </div>
                <div style={{ fontSize: 10, color: T.colors.textLabel, letterSpacing: 2 }}>
                    HOVER FOR LAYOUT DATA \u2014 CLICK TO LOCK TOOLTIP \u2014 SHOWS FILE + LOCATION
                </div>

                {/* CONTROLS */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                    {/* Phase Selector */}
                    <div style={{
                        display: "flex", gap: 4, alignItems: "center",
                        background: T.colors.bgDark, border: T.borders.thin,
                        borderRadius: T.radius.lg, padding: "4px 8px",
                    }}>
                        <span style={{ fontSize: 9, color: T.colors.textLabel, letterSpacing: 2, marginRight: 4 }}>PHASE</span>
                        {PHASE_LIST.map(function(p) {
                            var active = p === phase;
                            var isQTEPhase = p === "heat" || p === "hammer" || p === "quench";
                            var phaseColor = isQTEPhase ? T.colors.orange : p === "sess_result" ? T.colors.green : T.colors.gold;
                            return (
                                <button key={p} onClick={function() { setPhase(p); setDrawerOpen(false); }} style={{
                                    background: active ? phaseColor + "33" : "transparent",
                                    border: active ? "1px solid " + phaseColor : "1px solid transparent",
                                    borderRadius: 4, padding: "2px 6px",
                                    color: active ? phaseColor : T.colors.textDim,
                                    fontSize: 8, fontFamily: T.fonts.body,
                                    fontWeight: "bold", letterSpacing: 1,
                                    textTransform: "uppercase", cursor: "pointer",
                                }}>
                                    {p.replace("_", " ")}
                                </button>
                            );
                        })}
                    </div>

                    {/* Handedness Toggle */}
                    <div style={{
                        display: "flex", gap: 4, alignItems: "center",
                        background: T.colors.bgDark, border: T.borders.thin,
                        borderRadius: T.radius.lg, padding: "4px 8px",
                    }}>
                        <span style={{ fontSize: 9, color: T.colors.textLabel, letterSpacing: 2, marginRight: 4 }}>HAND</span>
                        {["left", "right"].map(function(h) {
                            var active = h === hand;
                            return (
                                <button key={h} onClick={function() { setHand(h); }} style={{
                                    background: active ? T.colors.blue + "33" : "transparent",
                                    border: active ? "1px solid " + T.colors.blue : "1px solid transparent",
                                    borderRadius: 4, padding: "2px 8px",
                                    color: active ? T.colors.blue : T.colors.textDim,
                                    fontSize: 8, fontFamily: T.fonts.body,
                                    fontWeight: "bold", letterSpacing: 1,
                                    textTransform: "uppercase", cursor: "pointer",
                                }}>
                                    {h}
                                </button>
                            );
                        })}
                    </div>

                    {/* Aspect Ratio Toggle */}
                    <div style={{
                        display: "flex", gap: 4, alignItems: "center",
                        background: T.colors.bgDark, border: T.borders.thin,
                        borderRadius: T.radius.lg, padding: "4px 8px",
                    }}>
                        <span style={{ fontSize: 9, color: T.colors.textLabel, letterSpacing: 2, marginRight: 4 }}>RATIO</span>
                        {ASPECT_OPTIONS.map(function(opt) {
                            var active = opt.value === aspect;
                            return (
                                <button key={opt.value} onClick={function() { setAspect(opt.value); }} style={{
                                    background: active ? T.colors.green + "33" : "transparent",
                                    border: active ? "1px solid " + T.colors.green : "1px solid transparent",
                                    borderRadius: 4, padding: "2px 6px",
                                    color: active ? T.colors.green : T.colors.textDim,
                                    fontSize: 8, fontFamily: T.fonts.body,
                                    fontWeight: "bold", letterSpacing: 1,
                                    textTransform: "uppercase", cursor: "pointer",
                                }}>
                                    {opt.label} <span style={{ fontSize: 7, opacity: 0.7 }}>{opt.desc}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                {/* HUD MOCKUP */}
                {/* ============================================================ */}
                <div style={{
                    width: "75%", aspectRatio: aspect, maxHeight: "calc(100vh - 140px)",
                    background: T.colors.bgSurface,
                    border: T.borders.accent, borderRadius: T.radius.lg,
                    display: "flex", flexDirection: "column",
                    position: "relative",
                    boxShadow: T.shadows.modal,
                }}>

                    {/* === BANNER === */}
                    <DevZone name="Banner" depth={0} color={T.colors.purple}
                             file="mobileLayout.js" location="MobileLayout \u2192 banner"
                             data={{
                                 height: T.layout.bannerH,
                                 flexShrink: 0,
                                 flexDirection: "row",
                                 alignItems: "center",
                                 background: T.colors.bgPanel,
                                 borderBottom: T.borders.thin,
                                 padding: "0 8px",
                                 gap: T.spacing.md,
                                 font: T.fonts.heading,
                             }}
                             style={{
                                 height: T.layout.bannerH, flexShrink: 0,
                                 background: T.colors.bgPanel,
                                 borderBottom: T.borders.thin,
                                 flexDirection: "row", alignItems: "center",
                                 padding: "0 8px", gap: 8,
                             }} row>

                        {/* Left — Level + Rank */}
                        <DevZone name="LV + Rank" depth={1} color={T.colors.goldBright}
                                 file="mobileLayout.js" location="MobileLayout \u2192 banner \u2192 left Strip"
                                 data={{ flexShrink: 0, gap: T.spacing.xs, paddingLeft: "4vw", font: T.fonts.heading }}
                                 style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0, paddingLeft: 8 }} row>
                            <span style={{ fontSize: T.fontSize.sm, color: T.colors.textLabel, fontFamily: T.fonts.heading, fontWeight: "bold", letterSpacing: 1 }}>LV</span>
                            <span style={{ fontSize: T.fontSize.h2, color: T.colors.gold, fontFamily: T.fonts.heading, fontWeight: "bold" }}>5</span>
                            <span style={{ fontSize: T.fontSize.xxl, color: T.colors.goldBright, fontFamily: T.fonts.heading, fontWeight: "bold", marginLeft: 8 }}>Artisan Smith</span>
                        </DevZone>

                        {/* Center — Decree */}
                        <DevZone name="Decree" depth={1} color={T.colors.gold}
                                 file="mobileLayout.js" location="MobileLayout \u2192 banner \u2192 center Strip"
                                 data={{ flex: 1, justifyContent: "center", fontSize: T.fontSize.xl, font: T.fonts.heading }}
                                 style={{ flex: 1, display: "flex", justifyContent: "center" }} row>
                            <span style={{ fontSize: T.fontSize.xl, color: T.colors.gold, fontFamily: T.fonts.heading, fontWeight: "bold", letterSpacing: 1 }}>DECREE DUE DAY 12</span>
                        </DevZone>

                        {/* Right — Day + Fullscreen */}
                        <DevZone name="Day + FS" depth={1} color={T.colors.textLight}
                                 file="mobileLayout.js" location="MobileLayout \u2192 banner \u2192 right Strip"
                                 data={{ flexShrink: 0, gap: T.spacing.xs, font: T.fonts.heading }}
                                 style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }} row>
                            <span style={{ fontSize: T.fontSize.sm, color: T.colors.textLabel, fontFamily: T.fonts.heading, fontWeight: "bold", letterSpacing: 1 }}>DAY</span>
                            <span style={{ fontSize: T.fontSize.h2, color: T.colors.textLight, fontFamily: T.fonts.heading, fontWeight: "bold" }}>8</span>
                            <div style={{ background: "none", border: T.borders.thin, borderRadius: T.radius.sm, color: T.colors.textLabel, fontSize: T.fontSize.md, padding: "2px 5px", fontFamily: T.fonts.heading, marginLeft: 4 }}>{"\u26F6"}</div>
                        </DevZone>
                    </DevZone>

                    {/* === MIDDLE ROW === */}
                    <div style={{ flex: 1, display: "flex", flexDirection: middleDirection, position: "relative" }}>

                        {/* DRAWER — before center so row-reverse puts it opposite action strip */}
                        {showDrawer && (
                            <DevZone name="Drawer" depth={0} color={T.colors.blue}
                                     file="mobileLayout.js" location="MobileLayout \u2192 drawer (mobile-drawer)"
                                     data={{
                                         width: T.layout.drawerW,
                                         flexShrink: 0,
                                         flexDirection: "column",
                                         background: T.colors.bgMid,
                                         gap: T.spacing.sm,
                                         padding: T.spacing.md,
                                         border: isLeftHanded ? "borderRight: thin" : "borderLeft: thin",
                                         boxShadow: isLeftHanded ? T.shadows.drawerR : T.shadows.drawer,
                                         zIndex: T.z.drawer,
                                     }}
                                     style={{
                                         width: T.layout.drawerW, flexShrink: 0,
                                         background: T.colors.bgMid,
                                         borderLeft: isLeftHanded ? T.borders.thin : "none",
                                         borderRight: isLeftHanded ? "none" : T.borders.thin,
                                         gap: 6, padding: 8,
                                         boxShadow: isLeftHanded ? T.shadows.drawerR : T.shadows.drawer,
                                     }}>
                                <div style={{ height: 10 }} />
                                <span style={{ fontSize: 9, color: T.colors.blue, letterSpacing: 2, fontWeight: "bold", fontFamily: T.fonts.heading }}>{drawerLabel}</span>

                                {drawerAutoOpen ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                                        {[
                                            { label: "QUALITY", value: "67", color: T.colors.green },
                                            { label: "STRESS", value: "TENSE", color: T.colors.goldBright },
                                            { label: "WEAPON", value: "Longsword", color: T.colors.textLight },
                                            { label: "MATERIAL", value: "Steel", color: "#b0c4de" },
                                            { label: "DIFFICULTY", value: "5", color: T.colors.goldBright },
                                            { label: "SPEED", value: "NORMAL", color: T.colors.gold },
                                            { label: "STRIKES", value: "STEADY", color: T.colors.gold },
                                        ].map(function(row, i) {
                                            return (
                                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontSize: 8, color: T.colors.textLabel, letterSpacing: 1, fontWeight: "bold" }}>{row.label}</span>
                                                    <span style={{ fontSize: 10, color: row.color, fontWeight: "bold" }}>{row.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                                        {[
                                            { label: "REPUTATION", value: "7", color: T.colors.green },
                                            { label: "RANK", value: "Artisan", color: T.colors.goldBright },
                                            { label: "GOLD", value: "847g", color: T.colors.gold },
                                            { label: "STAMINA", value: "3/5", color: T.colors.gold },
                                            { label: "PRESSURE", value: "LOW", color: T.colors.green },
                                        ].map(function(row, i) {
                                            return (
                                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontSize: 8, color: T.colors.textLabel, letterSpacing: 1, fontWeight: "bold" }}>{row.label}</span>
                                                    <span style={{ fontSize: 10, color: row.color, fontWeight: "bold" }}>{row.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </DevZone>
                        )}

                        {/* CENTER / SCENE */}
                        <DevZone name="Center / Scene" depth={0} color={T.colors.green}
                                 file="mobileLayout.js" location="MobileLayout \u2192 mobile-center"
                                 data={{
                                     flex: 1,
                                     flexDirection: "column",
                                     alignItems: "center",
                                     justifyContent: "center",
                                     background: T.colors.bgSurface,
                                     overflow: "hidden",
                                 }}
                                 style={{ flex: 1, background: T.colors.bgSurface, alignItems: "center", justifyContent: "center" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 20 }}>
                                <span style={{ fontSize: 40 }}>{"\u2692\uFE0F"}</span>
                                <span style={{ fontSize: 10, color: T.colors.textLabel, letterSpacing: 2 }}>SCENE AREA</span>
                                <span style={{ fontSize: 9, color: T.colors.textMuted, letterSpacing: 1 }}>Character + Anvil + Background</span>
                                {isQTE && (
                                    <div style={{ marginTop: 8, padding: "6px 16px", background: T.colors.orange + "22", border: "1px solid " + T.colors.orange + "66", borderRadius: T.radius.md }}>
                                        <span style={{ fontSize: 10, color: T.colors.orange, letterSpacing: 2, fontWeight: "bold" }}>{QTE_LABELS[phase]}</span>
                                    </div>
                                )}
                                {(isForging || isSessResult) && (
                                    <div style={{ marginTop: 4, padding: "4px 12px", background: T.colors.bgDark, border: T.borders.thin, borderRadius: 14 }}>
                                        <span style={{ fontSize: 9, color: T.colors.textBody, letterSpacing: 1 }}>FORGE BUBBLE OVERLAY</span>
                                    </div>
                                )}
                            </div>
                        </DevZone>

                        {/* ACTION STRIP */}
                        <DevZone name="Action Strip" depth={0} color={T.colors.orange}
                                 file="mobileLayout.js" location="MobileLayout \u2192 actionStrip"
                                 data={{
                                     width: T.layout.actionStripW,
                                     flexShrink: 0,
                                     flexDirection: "column",
                                     gap: T.spacing.xs,
                                     padding: T.spacing.xs,
                                     background: T.colors.actionStripBg,
                                 }}
                                 style={{ width: T.layout.actionStripW, flexShrink: 0, background: T.colors.actionStripBg, gap: 4, padding: 4 }}>
                            <div style={{ height: 14 }} />
                            {isQTE ? (
                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
                                    <span style={{ fontSize: 28 }}>{"\uD83C\uDFAF"}</span>
                                    <span style={{ fontSize: 8, color: T.colors.orange, letterSpacing: 1, textAlign: "center", fontWeight: "bold" }}>QTE ACTIVE</span>
                                    <span style={{ fontSize: 8, color: T.colors.textDim, letterSpacing: 1, textAlign: "center" }}>Strip hidden</span>
                                </div>
                            ) : (
                                stripButtons.map(function(btn, i) {
                                    return (
                                        <DevZone key={i} name={btn.label} depth={1} color={T.colors.orange}
                                                 file="mobileLayout.js" location={btn.location}
                                                 data={{
                                                     component: "MobileBtn",
                                                     icon: btn.icon,
                                                     background: T.colors.bgWarm,
                                                     border: T.colors.gold,
                                                     font: T.fonts.body,
                                                     fontSize: T.fontSize.xs,
                                                 }}
                                                 style={{ flex: 1, minHeight: 0 }}>
                                            <MockBtn icon={btn.icon} label={btn.label} />
                                        </DevZone>
                                    );
                                })
                            )}
                        </DevZone>

                        {/* DRAWER TAB */}
                        {!drawerAutoOpen && (
                            <div onClick={function() { setDrawerOpen(function(o) { return !o; }); }} style={{
                                position: "absolute",
                                top: "50%", transform: "translateY(-50%)",
                                [isLeftHanded ? "right" : "left"]: 0,
                                width: T.layout.drawerTabW,
                                height: T.layout.drawerTabH,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: T.colors.bgPanel,
                                border: T.borders.thin,
                                borderRadius: isLeftHanded ? "6px 0 0 6px" : "0 6px 6px 0",
                                fontSize: 12, color: T.colors.textLabel,
                                zIndex: T.z.drawerTab, cursor: "pointer",
                            }}>
                                {isLeftHanded
                                    ? (drawerOpen ? "\u25B6" : "\u25C0")
                                    : (drawerOpen ? "\u25C0" : "\u25B6")}
                            </div>
                        )}
                    </div>

                    {/* === BOTTOM BAR === */}
                    <DevZone name="Bottom Bar" depth={0} color={T.colors.purple}
                             file="mobileLayout.js" location="MobileLayout \u2192 MobileBottomBar"
                             data={{
                                 height: T.layout.bottomBarH,
                                 flexShrink: 0,
                                 flexDirection: "row",
                                 alignItems: "center",
                                 background: T.colors.bgPanel,
                                 borderTop: T.borders.thin,
                                 gap: T.spacing.sm,
                                 padding: "0 8px",
                                 font: T.fonts.body,
                             }}
                             style={{
                                 height: 48, flexShrink: 0,
                                 background: T.colors.bgPanel, borderTop: T.borders.thin,
                                 flexDirection: "row", alignItems: "center",
                                 padding: "0 8px", gap: 6,
                             }} row>

                        {/* Time Panel */}
                        <DevZone name="Time" depth={1} color={T.colors.green}
                                 file="mobileLayout.js" location="MobileBottomBar \u2192 time panel"
                                 data={{ flexDirection: "row", gap: T.spacing.md, height: 32, background: T.colors.bgMid, border: T.borders.thinMid, radius: T.radius.md, barWidth: 60, barHeight: T.layout.barHeightSm }}
                                 style={{ flexDirection: "row", alignItems: "center", gap: 6, background: T.colors.bgMid, border: T.borders.thinMid, borderRadius: T.radius.md, padding: "3px 8px", height: 28 }} row>
                            <span style={{ fontSize: T.fontSize.sm, color: T.colors.green, fontWeight: "bold" }}>10:00AM</span>
                            <div style={{ width: 50, height: T.layout.barHeightSm, background: T.colors.bgDeep, borderRadius: T.radius.sm, overflow: "hidden", border: T.borders.thinMid }}>
                                <div style={{ height: "100%", width: "62%", background: T.colors.green, borderRadius: T.radius.sm }} />
                            </div>
                        </DevZone>

                        {/* Stamina Panel */}
                        <DevZone name="Stamina" depth={1} color={T.colors.gold}
                                 file="mobileLayout.js" location="MobileBottomBar \u2192 stamina panel"
                                 data={{ flexDirection: "row", gap: T.spacing.md, height: 32, background: T.colors.bgMid, border: T.borders.thinMid, barWidth: 50, barHeight: T.layout.barHeightSm }}
                                 style={{ flexDirection: "row", alignItems: "center", gap: 4, background: T.colors.bgMid, border: T.borders.thinMid, borderRadius: T.radius.md, padding: "3px 8px", height: 28 }} row>
                            <span style={{ fontSize: T.fontSize.xxs, color: T.colors.textLabel, letterSpacing: 1, fontFamily: T.fonts.heading, fontWeight: "bold" }}>STAM</span>
                            <span style={{ fontSize: T.fontSize.sm, color: T.colors.gold, fontWeight: "bold" }}>3/5</span>
                            <div style={{ width: 40, height: T.layout.barHeightSm, background: T.colors.bgDeep, borderRadius: T.radius.sm, overflow: "hidden", border: T.borders.thinMid }}>
                                <div style={{ height: "100%", width: "60%", background: T.colors.gold, borderRadius: T.radius.sm }} />
                            </div>
                        </DevZone>

                        {/* Shelf Panel */}
                        <DevZone name="Shelf" depth={1} color={T.colors.goldBright}
                                 file="mobileLayout.js" location="MobileBottomBar \u2192 shelf panel"
                                 data={{ flex: 1, flexDirection: "row", gap: T.spacing.xs, height: 32, background: T.colors.bgMid, iconSize: T.layout.shelfIconSize, overflowX: "auto" }}
                                 style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 4, background: T.colors.bgMid, border: T.borders.thinMid, borderRadius: T.radius.md, padding: "3px 8px", height: 28, overflowX: "auto" }} row>
                            {["\u2694\uFE0F", "\uD83D\uDDE1\uFE0F", "\uD83D\uDD31"].map(function(icon, i) {
                                return (
                                    <div key={i} style={{
                                        width: T.layout.shelfIconSize, height: T.layout.shelfIconSize,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: T.colors.bgSurface, border: T.borders.thin,
                                        borderRadius: 4, fontSize: 12, flexShrink: 0,
                                    }}>{icon}</div>
                                );
                            })}
                        </DevZone>

                        {/* Gold */}
                        <DevZone name="Gold" depth={1} color={T.colors.gold}
                                 file="mobileLayout.js" location="MobileBottomBar \u2192 gold Label"
                                 data={{ fontSize: 21, font: T.fonts.heading, color: T.colors.gold, flexShrink: 0 }}
                                 style={{ flexShrink: 0, display: "flex", alignItems: "center" }} row>
                            <span style={{ fontSize: 18, color: T.colors.gold, fontWeight: "bold", fontFamily: T.fonts.heading }}>847g</span>
                        </DevZone>

                        {/* Options Gear */}
                        <DevZone name="Options" depth={1} color={T.colors.textLabel}
                                 file="mobileLayout.js" location="MobileBottomBar \u2192 options Btn"
                                 data={{ width: 32, height: 32, background: T.colors.bgWarm, border: T.borders.thin, radius: T.radius.md, fontSize: 20 }}
                                 style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: T.colors.bgWarm, border: T.borders.thin, borderRadius: T.radius.md, fontSize: 16, color: T.colors.textLabel, flexShrink: 0 }} row>
                            {"\u2699"}
                        </DevZone>
                    </DevZone>
                </div>

                {/* LEGEND + PHASE INFO — compact bar at bottom */}
                <div style={{
                    display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "center",
                    padding: "6px 16px", background: T.colors.bgDark, border: T.borders.thin, borderRadius: T.radius.lg,
                    flexShrink: 0,
                }}>
                    {[
                        { color: T.colors.purple, label: "Banner/Bar" },
                        { color: T.colors.green, label: "Scene" },
                        { color: T.colors.orange, label: "Strip" },
                        { color: T.colors.blue, label: "Drawer" },
                        { color: T.colors.gold, label: "Sub" },
                    ].map(function(item, i) {
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color + "44", border: "1px dashed " + item.color + "66" }} />
                                <span style={{ fontSize: 8, color: item.color, letterSpacing: 1, fontWeight: "bold" }}>{item.label}</span>
                            </div>
                        );
                    })}
                    <span style={{ fontSize: 8, color: T.colors.textDim, letterSpacing: 1, marginLeft: 8 }}>
                    {phase === "idle" && "IDLE \u2014 Sleep, Rest, Promote, Scavenge, Shop, Forge"}
                        {phase === "select" && "SELECT \u2014 Weapon selection"}
                        {phase === "select_mat" && "SELECT MAT \u2014 Material selection"}
                        {phase === "heat" && "HEAT \u2014 QTE active, drawer auto-open"}
                        {phase === "hammer" && "HAMMER \u2014 QTE active, strike pips"}
                        {phase === "sess_result" && "SESS RESULT \u2014 Forge/Norm/Quench/Scrap/Leave"}
                        {phase === "quench" && "QUENCH \u2014 Final QTE, drawer open"}
                </span>
                </div>
            </div>
        </TooltipProvider>
    );
}