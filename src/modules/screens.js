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

var SectionLabel = UIComponents.SectionLabel;

var PUB = process.env.PUBLIC_URL || "";
var MENU_BG = PUB + "/images/menu/menuBg.png";

// --- Main Menu ---
// Background image: drop a dark atmospheric image at /images/menu/menuBg.png
// Falls back to solid dark if image is missing. Vignette overlay ensures
// text readability regardless of art.

function MainMenu({ onStart, sfx, audioReady, onAudioWarmup }) {
    var [flicker, setFlicker] = useState(false);
    var [showHtp, setShowHtp] = useState(false);
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

                {/* Title */}
                <div style={{ textAlign: "center" }}>
                    <img src={PUB + "/images/icons/waIconCrown.png"} alt="" style={{ width: 64, height: "auto", imageRendering: "pixelated", marginBottom: 12 }} />
                    <SectionLabel color="#5a4a38" style={{ fontSize: 11, letterSpacing: 4, marginBottom: 8 }}>YEAR OF THE IRON CROWN</SectionLabel>
                    <div style={{ fontSize: 42, color: "#f59e0b", fontWeight: "bold", letterSpacing: 5, marginBottom: 4, textShadow: "0 2px 12px rgba(245,158,11,0.3)" }}>THE WOBBLY ANVIL</div>
                    <SectionLabel style={{ letterSpacing: 3 }}>A ROYAL BLACKSMITH'S TALE</SectionLabel>
                </div>

                {/* Fairy idle animation — fixed position, free from layout */}
                <FairyAnimInstance />

                {/* Buttons — visible only after audio warmup */}
                {audioReady ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                        <button onClick={function() { sfx.click(); onStart(); }} style={{ background: "#2a1f0a", border: "3px solid #f59e0b", borderRadius: 10, color: "#f59e0b", padding: "16px 80px", fontSize: 18, cursor: "pointer", letterSpacing: 4, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", opacity: flicker ? 1 : 0.82, transition: "opacity 0.4s", textShadow: "0 1px 6px rgba(245,158,11,0.2)" }}>BEGIN JOURNEY</button>
                        <button onClick={function() { sfx.click(); openHtp(); }} style={{ background: "rgba(20,16,9,0.8)", border: "2px solid " + (flashing ? "#f59e0b" : "#3d2e0f"), borderRadius: 8, color: flashing ? "#f59e0b" : "#5a4a38", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", transition: "border-color 0.4s, color 0.4s", display: "flex", alignItems: "center", gap: 6 }}><img src={PUB + "/images/icons/waIconExclamation.png"} alt="" style={{ width: 14, height: "auto", imageRendering: "pixelated", opacity: flashing ? 1 : 0.5 }} /> HOW TO PLAY</button>
                    </div>
                ) : (
                    <div style={{ marginTop: 16, fontSize: 13, letterSpacing: 4, color: pulse ? "#f59e0b" : "#5a4a38", transition: "color 0.4s", fontWeight: "bold", cursor: "pointer" }}>{"\u2014 CLICK ANYWHERE TO ENTER \u2014"}</div>
                )}
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