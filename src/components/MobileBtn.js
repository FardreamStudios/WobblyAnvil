// ============================================================
// MobileBtn.js — Wobbly Anvil Mobile Action Button
// Tap = onClick. Hold = popover tooltip. Press glow on img.
// Extracted from mobileLayout.js.
// ============================================================

import { useState, useEffect, useRef } from "react";
import THEME from "../config/theme.js";
import usePressHold from "../hooks/usePressHold.js";

var T = THEME;

function MobileBtn(props) {
    var icon = props.icon;
    var iconSize = props.iconSize;
    var imgSrc = props.imgSrc;
    var imgSize = props.imgSize;
    var label = props.label;
    var onClick = props.onClick;
    var disabled = props.disabled;
    var color = props.color;
    var danger = props.danger;
    var holdContent = props.holdContent;

    var btnRef = useRef(null);
    var popRef = useRef(null);
    var [showPop, setShowPop] = useState(false);
    var [isPressed, setIsPressed] = useState(false);

    // --- Press-hold gesture ---
    var hasHold = !!holdContent;
    var press = usePressHold({
        onClick: (!disabled && onClick) ? onClick : null,
        onHold: hasHold ? function() { setShowPop(true); } : null,
        disabled: disabled,
    });

    // --- Dismiss popover on release or outside tap ---
    useEffect(function() {
        if (!showPop) return;
        function dismissOutside(e) {
            if (popRef.current && !popRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)) {
                setShowPop(false);
            }
        }
        function dismissRelease() { setShowPop(false); }
        document.addEventListener("touchstart", dismissOutside);
        document.addEventListener("mousedown", dismissOutside);
        document.addEventListener("touchend", dismissRelease);
        document.addEventListener("mouseup", dismissRelease);
        return function() {
            document.removeEventListener("touchstart", dismissOutside);
            document.removeEventListener("mousedown", dismissOutside);
            document.removeEventListener("touchend", dismissRelease);
            document.removeEventListener("mouseup", dismissRelease);
        };
    }, [showPop]);

    // --- Compute popover position ---
    function getPopStyle() {
        if (!btnRef.current) return {};
        var rect = btnRef.current.getBoundingClientRect();
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var midX = rect.left + rect.width / 2;
        var goLeft = midX > vw / 2;
        var popW = 180;
        var popH = 120;
        var margin = 8;

        var style = {
            position: "fixed",
            zIndex: 9999,
            width: popW,
            overflow: "visible",
        };

        if (goLeft) {
            style.right = vw - rect.left + 6;
        } else {
            style.left = rect.right + 6;
        }

        var centerY = rect.top + rect.height / 2 - popH / 2;
        var clampedY = Math.max(margin, Math.min(centerY, vh - popH - margin));
        style.top = clampedY;

        return style;
    }

    // --- Arrow nub style ---
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

    var textColor = disabled ? T.colors.bgHighlight : danger ? T.colors.red : color || T.colors.gold;
    var hasImg = !!imgSrc;
    var iconFilter = disabled ? "brightness(0.3)" : "drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000) drop-shadow(0 0 2px rgba(0,0,0,0.6))";

    var btnProps = hasHold ? press.handlers : { onClick: disabled ? null : onClick };

    // --- Press glow handlers ---
    var glowOn = function() { if (!disabled) setIsPressed(true); };
    var glowOff = function() { setIsPressed(false); };
    var pressGlow = !disabled && isPressed;

    return (
        <div ref={btnRef} onTouchStart={glowOn} onTouchEnd={glowOff} onTouchCancel={glowOff} onMouseDown={glowOn} onMouseUp={glowOff} onMouseLeave={glowOff} style={{ position: "relative", width: "100%", height: "100%", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button {...btnProps} disabled={disabled} style={{
                background: "transparent",
                border: "none",
                borderRadius: 8,
                color: textColor,
                cursor: disabled ? "not-allowed" : "pointer",
                fontFamily: T.fonts.body,
                fontWeight: "bold",
                fontSize: T.fontSize.xs,
                letterSpacing: T.letterSpacing.tight,
                textTransform: "uppercase",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: T.spacing.xxs,
                padding: 0,
                width: imgSrc ? (imgSize || 65) : "100%",
                height: imgSrc ? (imgSize || 65) : "100%",
                transition: "opacity 0.1s ease",
                opacity: disabled ? 0.3 : 1,
                WebkitUserSelect: "none",
                userSelect: "none",
            }}>
                {imgSrc && <img src={imgSrc} alt={label || ""} draggable={false} className={pressGlow ? "" : "action-icon-glow"} style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", filter: pressGlow ? "drop-shadow(0 0 6px rgba(255,255,255,0.7)) drop-shadow(0 0 12px rgba(255,255,255,0.35))" : iconFilter, transition: "filter 0.1s ease" }} />}
                {!imgSrc && icon && <span style={{ fontSize: iconSize || T.fontSize.xxl, lineHeight: 1, pointerEvents: "none" }}>{icon}</span>}
                {!imgSrc && label && <span style={{ pointerEvents: "none" }}>{label}</span>}
            </button>

            {/* Hold popover */}
            {showPop && holdContent && (
                <div ref={popRef} style={Object.assign({}, getPopStyle(), {
                    background: T.colors.bgMid,
                    border: "1px solid " + T.colors.borderLight,
                    borderRadius: T.radius.lg,
                    padding: "10px 12px",
                    boxShadow: T.shadows.heavy || "0 6px 24px rgba(0,0,0,0.85)",
                    color: T.colors.textBody,
                    fontSize: T.fontSize.xl,
                    fontFamily: T.fonts.body,
                    lineHeight: 1.5,
                })}>
                    <div style={getArrowStyle()} />
                    {typeof holdContent === "function" ? holdContent() : holdContent}
                </div>
            )}
        </div>
    );
}

export default MobileBtn;