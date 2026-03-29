// ============================================================
// EventBanner.js — Wobbly Anvil Daily Event Banner
// Tap = show description for 3s. Hold = stays until release.
// Extracted from mobileLayout.js.
// ============================================================

import { useState, useEffect, useRef } from "react";
import THEME from "../config/theme.js";
import usePressHold from "../hooks/usePressHold.js";

var T = THEME;

function EventBanner(props) {
    var mEvent = props.mEvent;

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

    var evtColor = mEvent.color || T.colors.gold;

    return (
        <div ref={btnRef} {...press.handlers} style={{
            position: "absolute",
            top: "1.5%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: T.z.eventBanner,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(0,0,0,0.60)",
            border: "1px solid " + evtColor + "55",
            borderRadius: T.radius.md,
            padding: "4px 16px",
            cursor: "pointer",
        }}>
            <span style={{ fontFamily: "'Cinzel', serif", color: evtColor, fontSize: mEvent.fontSize || 13, letterSpacing: 1, fontWeight: "bold", textShadow: "0 1px 3px rgba(0,0,0,0.9)", whiteSpace: "normal" }}>{mEvent.title || "Daily Event"}</span>

            {/* Tooltip popover */}
            {showPop && mEvent.desc && (
                <div ref={popRef} style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: T.colors.bgMid,
                    border: "1px solid " + evtColor + "55",
                    borderRadius: T.radius.lg,
                    padding: "10px 14px",
                    boxShadow: "0 6px 24px rgba(0,0,0,0.85)",
                    fontFamily: T.fonts.body,
                    fontSize: T.fontSize.md,
                    color: T.colors.textBody,
                    lineHeight: 1.5,
                    whiteSpace: "nowrap",
                    zIndex: T.z.options,
                    pointerEvents: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}>
                    {/* Arrow nub */}
                    <div style={{
                        position: "absolute",
                        top: -6,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 0, height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderBottom: "6px solid " + T.colors.bgMid,
                    }} />
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{mEvent.icon || "\u2728"}</span>
                    <span>{mEvent.desc}</span>
                </div>
            )}
        </div>
    );
}

export default EventBanner;