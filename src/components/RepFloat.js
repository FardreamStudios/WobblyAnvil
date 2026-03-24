// ============================================================
// RepFloat.js — Wobbly Anvil Reputation Float Indicator
// Always visible on mobile. Press-and-hold for tooltip.
// Extracted from mobileLayout.js.
// ============================================================

import { useState, useEffect, useRef } from "react";
import THEME from "../config/theme.js";
import usePressHold from "../hooks/usePressHold.js";

var T = THEME;

function RepFloat(props) {
    var reputation = props.reputation;
    var isLeftHanded = props.isLeftHanded;

    var btnRef = useRef(null);
    var popRef = useRef(null);
    var dismissTimer = useRef(null);
    var [showPop, setShowPop] = useState(false);
    var [holding, setHolding] = useState(false);

    // Auto-dismiss after 3s on tap (not hold)
    useEffect(function() {
        if (showPop && !holding) {
            dismissTimer.current = setTimeout(function() {
                setShowPop(false);
            }, 3000);
            return function() { clearTimeout(dismissTimer.current); };
        }
    }, [showPop, holding]);

    var press = usePressHold({
        onClick: function() { setHolding(false); setShowPop(true); },
        onHold: function() { setHolding(true); setShowPop(true); },
        disabled: false,
    });

    // On hold release — start the 3s dismiss
    useEffect(function() {
        if (!holding) return;
        function onUp() { setHolding(false); }
        document.addEventListener("touchend", onUp);
        document.addEventListener("mouseup", onUp);
        return function() {
            document.removeEventListener("touchend", onUp);
            document.removeEventListener("mouseup", onUp);
        };
    }, [holding]);

    // Dismiss on outside tap
    useEffect(function() {
        if (!showPop) return;
        function dismiss(e) {
            if (popRef.current && !popRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)) {
                setShowPop(false);
                setHolding(false);
            }
        }
        document.addEventListener("touchstart", dismiss);
        document.addEventListener("mousedown", dismiss);
        return function() {
            document.removeEventListener("touchstart", dismiss);
            document.removeEventListener("mousedown", dismiss);
        };
    }, [showPop]);

    var rep = reputation || 0;
    var color = rep >= 7 ? "#22c55e" : rep >= 4 ? "#fb923c" : rep >= 2 ? "#ef4444" : "#7f1d1d";
    var status = rep >= 7 ? "ROYAL FAVOUR" : rep >= 4 ? "KING GROWS WARY" : rep >= 2 ? "ARREST IMMINENT" : "EXECUTION IMMINENT";

    return (
        <div ref={btnRef} {...press.handlers} style={{
            position: "absolute",
            top: "2%",
            left: isLeftHanded ? "auto" : "2%",
            right: isLeftHanded ? "2%" : "auto",
            zIndex: 10000,
            width: 160,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            cursor: "pointer",
        }}>
            {/* 10 pips — position-colored like desktop */}
            <div style={{ display: "flex", gap: 3, width: "100%" }}>
                {Array.from({ length: 10 }).map(function(_, i) {
                    var filled = i < rep;
                    var pipColor = i < 3 ? "#ef4444" : i < 6 ? "#fb923c" : i < 8 ? "#4ade80" : "#22c55e";
                    return <div key={i} style={{
                        flex: 1, height: 16, borderRadius: 2,
                        background: filled ? pipColor : "#1a1209",
                        border: "1px solid " + (filled ? pipColor : "#5a4a38"),
                        boxShadow: filled ? "0 0 6px " + pipColor + "88, inset 0 0 4px " + pipColor + "44" : "none",
                        transition: "background 0.2s, box-shadow 0.2s",
                    }} />;
                })}
            </div>
            {/* Status text */}
            <div className={rep <= 1 ? "blink" : ""} style={{
                fontSize: 7, color: color, letterSpacing: 1, fontWeight: "bold",
                fontFamily: "'Cinzel', serif", textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                textAlign: "center", whiteSpace: "nowrap",
            }}>{status}</div>

            {/* Tooltip popover */}
            {showPop && (
                <div ref={popRef} style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: isLeftHanded ? "auto" : 0,
                    right: isLeftHanded ? 0 : "auto",
                    background: "#0a0704",
                    border: "1px solid #ef444455",
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: 9,
                    color: "#c8b89a",
                    lineHeight: 1.7,
                    zIndex: 10000,
                    width: 190,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.95)",
                    pointerEvents: "auto",
                }}>
                    <div style={{ color: "#ef4444", fontWeight: "bold", marginBottom: 4, fontFamily: "'Cinzel', serif" }}>THE KING'S FAVOUR</div>
                    <span style={{ color: "#22c55e" }}>7-10</span>: Royal favour<br />
                    <span style={{ color: "#fb923c" }}>4-6</span>: King grows wary<br />
                    <span style={{ color: "#ef4444" }}>2-3</span>: Arrest imminent<br />
                    <span style={{ color: "#7f1d1d" }}>1</span>: Execution imminent<br /><br />
                    <span style={{ color: "#ef4444", fontWeight: "bold" }}>HIT ZERO AND THE KING'S GUARDS PAY YOU A VISIT.</span>
                </div>
            )}
        </div>
    );
}

export default RepFloat;