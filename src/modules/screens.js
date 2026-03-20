// ============================================================
// screens.js — Wobbly Anvil Screens Module
// Full-screen views: splash screen, main menu with FTUE.
// Pure display, no game state.
// ============================================================

import { useState, useEffect } from "react";
import GameConstants from "./constants.js";
import UIComponents from "./uiComponents.js";

var FTUE_TOASTS = GameConstants.FTUE_TOASTS;
var SectionLabel = UIComponents.SectionLabel;

// --- Splash Screen ---

function SplashScreen({ onEnter }) {
    var [pulse, setPulse] = useState(false);
    useEffect(function() {
        var interval = setInterval(function() { setPulse(function(p) { return !p; }); }, 1100);
        return function() { clearInterval(interval); };
    }, []);
    return (
        <div onClick={onEnter} style={{ width: "100%", height: "100%", background: "#0a0704", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: "monospace", userSelect: "none", gap: 24 }}>
            <div style={{ display: "flex", gap: 16, fontSize: 48 }}>{"\u2692\uFE0F\uD83D\uDD25\u2694\uFE0F"}</div>
            <div style={{ fontSize: 42, color: "#f59e0b", fontWeight: "bold", letterSpacing: 5, textAlign: "center" }}>THE WOBBLY ANVIL</div>
            <SectionLabel style={{ letterSpacing: 4, fontSize: 10 }}>A ROYAL BLACKSMITH'S TALE</SectionLabel>
            <div style={{ marginTop: 32, fontSize: 13, letterSpacing: 4, color: pulse ? "#f59e0b" : "#5a4a38", transition: "color 0.4s", fontWeight: "bold" }}>{"\u2014 CLICK ANYWHERE TO ENTER \u2014"}</div>
        </div>
    );
}

// --- Main Menu ---

function MainMenu({ onStart, sfx }) {
    var [flicker, setFlicker] = useState(false);
    var [ftueIndex, setFtueIndex] = useState(null);
    var [flashing, setFlashing] = useState(false);

    useEffect(function() {
        var interval = setInterval(function() { setFlicker(function(f) { return !f; }); }, 1800);
        var flashTimer = setTimeout(function() { setFlashing(true); }, 3000);
        return function() { clearInterval(interval); clearTimeout(flashTimer); };
    }, []);

    function openFtue() { setFlashing(false); setFtueIndex(0); }

    return (
        <div style={{ background: "#0a0704", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "monospace", color: "#f0e6c8", padding: "28px 32px" }}>

            {/* FTUE Overlay */}
            {ftueIndex !== null && (
                <div onClick={function() { setFtueIndex(function(i) { return i + 1 < FTUE_TOASTS.length ? i + 1 : null; }); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <div style={{ background: "#0c0905", border: "4px solid #f59e0b", borderRadius: 20, padding: "36px 44px", width: "min(440px,90%)", display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
                        <div style={{ fontSize: 13, color: "#f59e0b", letterSpacing: 3, fontWeight: "bold" }}>{FTUE_TOASTS[ftueIndex].title}</div>
                        <div style={{ fontSize: 14, color: "#c8b89a", lineHeight: 1.8, whiteSpace: "pre-line" }}>{FTUE_TOASTS[ftueIndex].msg}</div>
                        <div style={{ fontSize: 10, color: "#4a3c2c", letterSpacing: 2 }}>{ftueIndex < FTUE_TOASTS.length - 1 ? "CLICK FOR NEXT" : "CLICK TO CLOSE"} · {ftueIndex + 1}/{FTUE_TOASTS.length}</div>
                    </div>
                </div>
            )}

            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
                <SectionLabel color="#5a4a38" style={{ fontSize: 11, letterSpacing: 4, marginBottom: 8 }}>YEAR OF THE IRON CROWN</SectionLabel>
                <div style={{ fontSize: 36, color: "#f59e0b", fontWeight: "bold", letterSpacing: 4, marginBottom: 4 }}>THE WOBBLY ANVIL</div>
                <SectionLabel style={{ letterSpacing: 3, marginBottom: 14 }}>A ROYAL BLACKSMITH'S TALE</SectionLabel>
                <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 28 }}>{"\uD83D\uDD25\u2692\uFE0F\u2694\uFE0F\uD83D\uDC51\uD83D\uDCB0\uD83D\uDC80"}</div>
            </div>

            {/* Info Panels */}
            <div style={{ display: "flex", gap: 16, alignItems: "stretch", width: "100%", maxWidth: 1000, marginBottom: 20 }}>
                <div style={{ background: "#0f0b06", border: "1px solid #3d2e0f", borderRadius: 12, padding: "16px 18px", flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#f59e0b", letterSpacing: 2, marginBottom: 8 }}>{"\uD83D\uDD28 YOUR ROLE"}</div>
                    {["The previous Royal Blacksmith was executed. You have taken his place.", "Heat metal, hammer it into shape, and plunge it into the quench. Your skill at each step determines the quality of the blade."].map(function(line, j) {
                        return <div key={j} style={{ fontSize: 12, color: "#c8b89a", lineHeight: 1.9, marginBottom: j < 1 ? 8 : 0 }}>{line}</div>;
                    })}
                </div>
                <div style={{ background: "#0f0b06", border: "2px solid #f59e0b", borderRadius: 12, padding: "22px 24px", flex: 1.4, position: "relative", boxShadow: "0 0 24px #f59e0b22" }}>
                    <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#0a0704", padding: "0 10px" }}><span style={{ fontSize: 18 }}>{"\uD83D\uDC51"}</span></div>
                    <div style={{ fontSize: 13, color: "#f59e0b", letterSpacing: 3, marginBottom: 10, fontWeight: "bold", textAlign: "center" }}>SERVE THE CROWN</div>
                    {["The King issues personal orders \u2014 specific weapons of required quality, delivered on time. Fulfill them for gold and royal favour.", "Let your reputation reach zero and the headsman pays a visit."].map(function(line, j) {
                        return <div key={j} style={{ fontSize: 12, color: "#c8b89a", lineHeight: 1.9, marginBottom: j < 1 ? 8 : 0 }}>{line}</div>;
                    })}
                    <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                        <div style={{ flex: 1, background: "#0a1a0a", border: "1px solid #4ade8033", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#4ade80" }}>{"\u2713 Fulfil on time \u2192 gold + rep"}</div>
                        <div style={{ flex: 1, background: "#1a0a0a", border: "1px solid #ef444433", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#ef4444" }}>{"\u2717 Fail \u2192 lose reputation"}</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 10, color: "#ef4444", letterSpacing: 2, textAlign: "center", fontWeight: "bold" }}>REP HITS ZERO {"\u2014"} YOU ARE EXECUTED</div>
                </div>
                <div style={{ background: "#0f0b06", border: "1px solid #3d2e0f", borderRadius: 12, padding: "16px 18px", flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#f59e0b", letterSpacing: 2, marginBottom: 8 }}>{"\uD83D\uDED2 RUN YOUR SHOP"}</div>
                    {["Forge weapons and put them on the shelf. Customers walk in daily \u2014 adventurers, knights, nobles \u2014 each willing to pay based on quality.", "Haggle for a better price or accept the offer. Every coin earned builds your Smith Rank."].map(function(line, j) {
                        return <div key={j} style={{ fontSize: 12, color: "#c8b89a", lineHeight: 1.9, marginBottom: j < 1 ? 8 : 0 }}>{line}</div>;
                    })}
                </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <button onClick={function() { sfx.click(); onStart(); }} style={{ background: "#2a1f0a", border: "3px solid #f59e0b", borderRadius: 10, color: "#f59e0b", padding: "16px 80px", fontSize: 18, cursor: "pointer", letterSpacing: 4, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", opacity: flicker ? 1 : 0.82, transition: "opacity 0.4s" }}>BEGIN JOURNEY</button>
                <button onClick={function() { sfx.click(); openFtue(); }} style={{ background: "#141009", border: "2px solid " + (flashing ? "#f59e0b" : "#3d2e0f"), borderRadius: 8, color: flashing ? "#f59e0b" : "#5a4a38", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", transition: "border-color 0.4s, color 0.4s" }}>? HOW TO PLAY</button>
                <SectionLabel color="#3d2e0f" style={{ letterSpacing: 2 }}>THE FORGE AWAITS</SectionLabel>
            </div>
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var Screens = {
    SplashScreen: SplashScreen,
    MainMenu: MainMenu,
};

export default Screens;