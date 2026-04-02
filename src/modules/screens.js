// ============================================================
// screens.js — Wobbly Anvil Screens Module
// Full-screen views: main menu with FTUE.
// Pure display, no game state.
// ============================================================

import { useState, useEffect } from "react";
import GameConstants from "./constants.js";
import UIComponents from "./uiComponents.js";
import HowToPlay from "../components/HowToPlay.js";
import FairyAnimInstance from "../fairy/FairyAnimInstance";
import AdventureButton from "../components/AdventureButton.js";

var SectionLabel = UIComponents.SectionLabel;

var PUB = process.env.PUBLIC_URL || "";
var MENU_BG = PUB + "/images/menu/menuBg.png";

// --- Leaderboard Panel (overlay on main menu) ---

function LeaderboardPanel(props) {
    var entries = props.entries || [];
    var onClose = props.onClose;
    var sfx = props.sfx;

    // Sort by gold descending, take top 10
    var sorted = entries.slice().sort(function(a, b) { return b.gold - a.gold; }).slice(0, 10);

    return (
        <div onClick={function() { if (sfx) sfx.click(); onClose(); }} style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(10, 7, 4, 0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
        }}>
            <div onClick={function(e) { e.stopPropagation(); }} style={{
                width: "min(420px, 90vw)",
                maxHeight: "80vh",
                overflowY: "auto",
                background: "#0c0905",
                border: "2px solid #3d2e0f",
                borderRadius: 12,
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
            }}>
                <SectionLabel color="#f59e0b" style={{ fontSize: 14, letterSpacing: 5 }}>LEADERBOARD</SectionLabel>

                {sorted.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#5a4a38", letterSpacing: 2 }}>NO ENTRIES YET</div>
                ) : (
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
                        {sorted.map(function(entry, i) {
                            var isReal = entry.isReal;
                            var nameColor = isReal ? "#f59e0b" : "#5a4a38";
                            var goldColor = isReal ? "#fbbf24" : "#8a7a64";
                            var rankColor = i === 0 ? "#fbbf24" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#5a4a38";
                            return (
                                <div key={i} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "8px 12px",
                                    background: isReal ? "rgba(245, 158, 11, 0.06)" : "transparent",
                                    borderRadius: 6,
                                    border: isReal ? "1px solid rgba(245, 158, 11, 0.15)" : "1px solid transparent",
                                }}>
                                    <div style={{ width: 24, fontSize: 13, fontWeight: "bold", color: rankColor, textAlign: "center" }}>{i + 1}</div>
                                    <div style={{ flex: 1, fontSize: 13, color: nameColor, fontWeight: isReal ? "bold" : "normal", letterSpacing: 1 }}>{entry.name}</div>
                                    <div style={{ fontSize: 13, color: goldColor, fontWeight: "bold", letterSpacing: 1 }}>{entry.gold}g</div>
                                    {isReal && entry.day ? (
                                        <div style={{ fontSize: 10, color: "#5a4a38", letterSpacing: 1 }}>D{entry.day}</div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}

                <button onClick={function() { if (sfx) sfx.click(); onClose(); }} style={{
                    background: "#2a1f0a",
                    border: "2px solid #3d2e0f",
                    borderRadius: 8,
                    color: "#5a4a38",
                    padding: "8px 32px",
                    fontSize: 12,
                    cursor: "pointer",
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    marginTop: 4,
                }}>CLOSE</button>
            </div>
        </div>
    );
}

// --- Main Menu ---
// Background image: drop a dark atmospheric image at /images/menu/menuBg.png
// Falls back to solid dark if image is missing. Vignette overlay ensures
// text readability regardless of art.

function MainMenu({ onStart, onEnterAdventure, sfx, audioReady, onAudioWarmup, leaderboardEntries }) {
    var [flicker, setFlicker] = useState(false);
    var [showHtp, setShowHtp] = useState(false);
    var [showLeaderboard, setShowLeaderboard] = useState(false);
    var [flashing, setFlashing] = useState(false);
    var [pulse, setPulse] = useState(false);

    useEffect(function() {
        var interval = setInterval(function() { setFlicker(function(f) { return !f; }); }, 1800);
        var flashTimer = setTimeout(function() { setFlashing(true); }, 3000);
        return function() { clearInterval(interval); clearTimeout(flashTimer); };
    }, []);

    // Pulse for "click anywhere" prompt when audio not ready
    useEffect(function() {
        if (audioReady) return;
        var interval = setInterval(function() { setPulse(function(p) { return !p; }); }, 1100);
        return function() { clearInterval(interval); };
    }, [audioReady]);

    function openHtp() { setFlashing(false); setShowHtp(true); }

    return (
        <div onClick={!audioReady ? onAudioWarmup : undefined} style={{
            background: "#0a0704",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "monospace",
            color: "#f0e6c8",
            position: "relative",
            overflow: "hidden",
            cursor: !audioReady ? "pointer" : "default",
            userSelect: !audioReady ? "none" : "auto",
        }}>

            {/* Background image layer */}
            <div style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "url(" + MENU_BG + ")",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                opacity: 0.35,
            }} />

            {/* Vignette overlay — darkens edges, keeps center readable */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(ellipse at center, transparent 30%, #0a0704 85%)",
            }} />

            {/* Content — sits above bg layers */}
            <div style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 28,
                padding: "28px 32px",
            }}>

                {/* How to Play Overlay */}
                {showHtp && <HowToPlay onClose={function() { setShowHtp(false); }} sfx={sfx} />}

                {/* Leaderboard Overlay */}
                {showLeaderboard && <LeaderboardPanel entries={leaderboardEntries || []} onClose={function() { setShowLeaderboard(false); }} sfx={sfx} />}

                {/* Title */}
                <div style={{ textAlign: "center" }}>
                    <img src={PUB + "/images/icons/waIconCrown.png"} alt="" style={{ width: 64, height: "auto", imageRendering: "pixelated", marginBottom: 12 }} />
                    <SectionLabel color="#5a4a38" style={{ fontSize: 11, letterSpacing: 4, marginBottom: 8 }}>YEAR OF THE IRON CROWN</SectionLabel>
                    <div style={{ fontSize: 42, color: "#f59e0b", fontWeight: "bold", letterSpacing: 5, marginBottom: 4, textShadow: "0 2px 12px rgba(245,158,11,0.3)" }}>THE WOBBLY ANVIL</div>
                    <SectionLabel style={{ letterSpacing: 3 }}>A ROYAL BLACKSMITH'S TALE</SectionLabel>
                </div>

                {/* Fairy idle animation — fixed position, free from layout */}
                <FairyAnimInstance />

                {/* Buttons — fixed-height zone prevents layout shift on audio warmup */}
                <div style={{ minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {audioReady ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                            <button onClick={function() { sfx.click(); onStart(); }} style={{ background: "#2a1f0a", border: "3px solid #f59e0b", borderRadius: 10, color: "#f59e0b", padding: "16px 80px", fontSize: 18, cursor: "pointer", letterSpacing: 4, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", opacity: flicker ? 1 : 0.82, transition: "opacity 0.4s", textShadow: "0 1px 6px rgba(245,158,11,0.2)" }}>BEGIN JOURNEY</button>
                            <button onClick={function() { sfx.click(); openHtp(); }} style={{ background: "rgba(20,16,9,0.8)", border: "2px solid " + (flashing ? "#f59e0b" : "#3d2e0f"), borderRadius: 8, color: flashing ? "#f59e0b" : "#5a4a38", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", transition: "border-color 0.4s, color 0.4s", display: "flex", alignItems: "center", gap: 6 }}><img src={PUB + "/images/icons/waIconExclamation.png"} alt="" style={{ width: 14, height: "auto", imageRendering: "pixelated", opacity: flashing ? 1 : 0.5 }} /> HOW TO PLAY</button>
                            <button onClick={function() { sfx.click(); setShowLeaderboard(true); }} style={{ background: "rgba(20,16,9,0.8)", border: "2px solid #f59e0b", borderRadius: 8, color: "#f59e0b", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", transition: "border-color 0.4s, color 0.4s" }}>LEADERBOARD</button>
                            <div style={{ marginTop: 8 }}><AdventureButton onEnterAdventure={onEnterAdventure} sfx={sfx} /></div>
                        </div>
                    ) : (
                        <div style={{ fontSize: 13, letterSpacing: 4, color: pulse ? "#f59e0b" : "#5a4a38", transition: "color 0.4s", fontWeight: "bold", cursor: "pointer" }}>{"\u2014 CLICK ANYWHERE TO ENTER \u2014"}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var Screens = {
    MainMenu: MainMenu,
};

export default Screens;