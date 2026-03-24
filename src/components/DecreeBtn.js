// ============================================================
// DecreeBtn.js — Wobbly Anvil Decree Scroll Button
// Tap = show decree for 3s. Hold = stays until release.
// Extracted from mobileLayout.js.
// ============================================================

import { useState, useEffect, useRef } from "react";
import THEME from "../config/theme.js";
import GameConstants from "../modules/constants.js";
import MobileIcons from "../config/mobileIcons.js";
import usePressHold from "../hooks/usePressHold.js";

var T = THEME;
var MATS = GameConstants.MATS;
var IC = MobileIcons.IC;

function DecreeBtn(props) {
    var quest = props.quest;
    var questNum = props.questNum;

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
        onClick: function() {
            setHolding(false);
            setShowPop(true);
        },
        onHold: function() {
            setHolding(true);
            setShowPop(true);
        },
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

    // Popover position — side-aware
    function getPopStyle() {
        if (!btnRef.current) return {};
        var rect = btnRef.current.getBoundingClientRect();
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var midX = rect.left + rect.width / 2;
        var goLeft = midX > vw / 2;
        var popW = 220;
        var popH = 180;
        var margin = 8;

        var style = {
            position: "fixed",
            zIndex: 9999,
            width: popW,
            maxHeight: vh - margin * 2,
            overflowY: "hidden",
        };

        if (goLeft) {
            style.right = vw - rect.left + 6;
        } else {
            style.left = rect.right + 6;
        }

        var centerY = rect.top + rect.height / 2 - popH / 2;
        style.top = Math.max(margin, Math.min(centerY, vh - popH - margin));

        return style;
    }

    // Arrow nub
    function getArrowStyle() {
        if (!btnRef.current) return {};
        var rect = btnRef.current.getBoundingClientRect();
        var vw = window.innerWidth;
        var midX = rect.left + rect.width / 2;
        var goLeft = midX > vw / 2;
        var arrowSize = 6;

        var base = {
            position: "absolute",
            width: 0, height: 0,
            borderTop: arrowSize + "px solid transparent",
            borderBottom: arrowSize + "px solid transparent",
            top: "50%",
            transform: "translateY(-50%)",
        };

        if (goLeft) {
            base.right = -arrowSize;
            base.borderLeft = arrowSize + "px solid " + T.colors.borderLight;
        } else {
            base.left = -arrowSize;
            base.borderRight = arrowSize + "px solid " + T.colors.borderLight;
        }
        return base;
    }

    var matData = MATS[quest.materialRequired] || {};
    var matColor = matData.color || "#a0a0a0";
    var fulfilled = quest.fulfilled;
    var accentColor = fulfilled ? T.colors.green : T.colors.gold;

    // Due tomorrow glow check
    var dueSoon = !fulfilled && quest.deadline && quest.deadline <= (quest._currentDay || 999) + 1;
    var glowClass = dueSoon ? "decree-urgent-img" : "decree-glow-img";

    return (
        <div ref={btnRef} style={{ position: "relative", width: "100%", height: "100%", flex: 1 }}>
            <button {...press.handlers} style={{
                background: "transparent",
                border: "none",
                borderRadius: 0,
                color: accentColor,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                width: "100%",
                height: "100%",
                WebkitUserSelect: "none",
                userSelect: "none",
            }}>
                <img src={IC.decree} alt="Decree" draggable={false} className={glowClass} style={{ width: "90%", height: "90%", objectFit: "contain", pointerEvents: "none" }} />
            </button>

            {showPop && (
                <div ref={popRef} style={Object.assign({}, getPopStyle(), {
                    background: T.colors.bgMid,
                    border: "1px solid " + accentColor + "55",
                    borderRadius: T.radius.lg,
                    padding: "12px 14px",
                    boxShadow: "0 6px 24px rgba(0,0,0,0.85)",
                    fontFamily: T.fonts.body,
                    lineHeight: 1.6,
                })}>
                    <div style={getArrowStyle()} />
                    {/* Header */}
                    <div style={{ fontSize: T.fontSize.xl, color: accentColor, fontWeight: "bold", letterSpacing: 1, marginBottom: 6 }}>
                        {fulfilled ? "DECREE FULFILLED" : "ROYAL DECREE #" + ((questNum || 0) + 1)}
                    </div>
                    {/* From */}
                    <div style={{ fontSize: T.fontSize.md, color: T.colors.textDim, marginBottom: 4 }}>
                        From: <span style={{ color: T.colors.textBody, fontWeight: "bold" }}>{quest.name}</span>
                    </div>
                    {/* Demand */}
                    <div style={{ fontSize: T.fontSize.xl, color: T.colors.textLight, fontWeight: "bold", marginBottom: 6 }}>
                        {quest.minQualityLabel}+ <span style={{ color: matColor }}>{quest.materialRequired.toUpperCase()}</span>{" "}
                        {quest.qty > 1 && <span style={{ color: T.colors.gold }}>x{quest.qty} </span>}
                        {quest.weaponName}
                    </div>
                    {/* Progress */}
                    {quest.qty > 1 && (
                        <div style={{ fontSize: T.fontSize.md, color: fulfilled ? T.colors.green : T.colors.textDim, marginBottom: 4 }}>
                            Delivered: {quest.fulfilledQty || 0}/{quest.qty}
                        </div>
                    )}
                    {/* Deadline */}
                    <div style={{ fontSize: T.fontSize.md, color: T.colors.textDim, marginBottom: 6 }}>
                        Due: <span style={{ color: accentColor, fontWeight: "bold" }}>Day {quest.deadline}</span>
                    </div>
                    {/* Rewards / Penalty */}
                    <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ flex: 1, background: T.colors.bgDark, border: "1px solid " + T.colors.green + "33", borderRadius: T.radius.sm, padding: "4px 6px" }}>
                            <div style={{ fontSize: T.fontSize.md, color: T.colors.green, fontWeight: "bold" }}>+{quest.reward}g +{quest.reputationGain} rep</div>
                        </div>
                        <div style={{ flex: 1, background: T.colors.bgDark, border: "1px solid " + T.colors.red + "33", borderRadius: T.radius.sm, padding: "4px 6px" }}>
                            <div style={{ fontSize: T.fontSize.md, color: T.colors.red, fontWeight: "bold" }}>-{quest.reputationLoss} rep</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DecreeBtn;