// ============================================================
// uiComponents.js — Wobbly Anvil UI Components Module
// Pure display components: layout, buttons, bars, tooltips, toasts.
// Zero game logic. Zero state management (except internal display state).
// ============================================================

import { useState, useEffect, useRef } from "react";
import GameUtils from "./utilities.js";

var clamp = GameUtils.clamp;

// --- Toast Visibility Context (shared between Tooltip and Toast) ---
var ToastContext = { active: false };

// --- Layout Components ---

function Panel({ color, style, children, onMouseEnter, onMouseLeave }) {
    var borderColor = color ? color + "44" : "#3d2e0f";
    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={Object.assign({}, {
                background: "#0f0b06",
                border: "1px solid " + borderColor,
                borderRadius: 8,
                padding: "10px 12px",
            }, style)}
        >
            {children}
        </div>
    );
}

function Row({ style, center, children, onMouseEnter, onMouseLeave }) {
    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={Object.assign({}, {
                display: "flex",
                alignItems: "center",
                justifyContent: center ? "center" : "space-between",
            }, style)}
        >
            {children}
        </div>
    );
}

function SectionLabel({ color, style, children }) {
    return (
        <div style={Object.assign({}, {
            fontSize: 9,
            color: color || "#8a7a64",
            letterSpacing: 2,
            textTransform: "uppercase",
        }, style)}>
            {children}
        </div>
    );
}

function InfoRow({ label, value, color, labelStyle, valueStyle }) {
    return (
        <Row style={{ marginBottom: 5 }}>
            <SectionLabel style={labelStyle}>{label}</SectionLabel>
            <span style={Object.assign({}, {
                fontSize: 12,
                color: color || "#f0e6c8",
                fontWeight: "bold",
            }, valueStyle)}>
        {value}
      </span>
        </Row>
    );
}

// --- Display Components ---

function Badge({ value, label, color, size }) {
    var fontSize = size || 20;
    return (
        <div style={{
            border: "2px solid " + color,
            borderRadius: 6,
            padding: "3px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "#0a0704",
        }}>
            {label && <SectionLabel color={color}>{label}</SectionLabel>}
            <span style={{ fontSize: fontSize, color: color, fontWeight: "bold", lineHeight: 1 }}>{value}</span>
        </div>
    );
}

function Bar({ value, max, color, h, instant }) {
    var maxValue = max || 100;
    var height = h || 10;
    return (
        <div style={{
            height: height,
            background: "#0f0b06",
            borderRadius: height / 2,
            overflow: "hidden",
            border: "1px solid #2a1f0a",
        }}>
            <div style={{
                height: "100%",
                width: clamp((value / maxValue) * 100, 0, 100) + "%",
                background: color,
                borderRadius: height / 2,
                transition: instant ? "none" : "width 0.12s",
            }} />
        </div>
    );
}

function Pips({ count, filled, filledColor, emptyColor, size }) {
    var pipSize = size || 14;
    return (
        <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: count }).map(function(_, i) {
                var fc = typeof filledColor === "function" ? filledColor(i) : filledColor || "#f59e0b";
                return (
                    <div key={i} style={{
                        width: pipSize,
                        height: pipSize,
                        borderRadius: 3,
                        background: i < filled ? fc : (emptyColor || "#2a1f0a"),
                        border: "2px solid " + (i < filled ? fc + "88" : "#3d2e0f"),
                        transition: "background 0.15s",
                    }} />
                );
            })}
        </div>
    );
}

function GoldPop({ amount, onDone }) {
    var [visible, setVisible] = useState(true);
    useEffect(function() {
        var timer = setTimeout(function() {
            setVisible(false);
            setTimeout(onDone, 400);
        }, 1200);
        return function() { clearTimeout(timer); };
    }, []);
    if (!visible) return null;
    var positive = amount > 0;
    return (
        <div style={{
            position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
            zIndex: 500, pointerEvents: "none", fontFamily: "monospace",
            fontSize: 18, fontWeight: "bold",
            color: positive ? "#4ade80" : "#ef4444",
            textShadow: "0 2px 8px rgba(0,0,0,0.9)",
            letterSpacing: 2, whiteSpace: "nowrap",
        }}>
            {positive ? "+" : ""}{amount}g
        </div>
    );
}

// --- Button Components ---

function ActionBtn({ onClick, disabled, color, bg, className, small, width, height, style, children }) {
    var textColor = color || (disabled ? "#4a3c2c" : "#f59e0b");
    var bgColor = bg || (disabled ? "#0a0704" : "#2a1f0a");
    var borderColor = disabled ? "#2a1f0a" : (color || "#f59e0b");
    return (
        <button
            onClick={disabled ? null : onClick}
            disabled={disabled}
            className={className || ""}
            style={Object.assign({}, {
                background: bgColor,
                border: "2px solid " + borderColor,
                borderRadius: 8,
                color: textColor,
                padding: small ? "6px 12px" : "10px 16px",
                fontSize: small ? 11 : 13,
                cursor: disabled ? "not-allowed" : "pointer",
                letterSpacing: 2,
                textTransform: "uppercase",
                fontFamily: "monospace",
                fontWeight: "bold",
                width: width || "auto",
                height: height || "auto",
            }, style)}
        >
            {children}
        </button>
    );
}

function DangerBtn({ onClick, disabled, style, children }) {
    return (
        <button
            onClick={disabled ? null : onClick}
            disabled={disabled}
            style={Object.assign({}, {
                background: "#1a0505",
                border: "2px solid " + (disabled ? "#2a1f0a" : "#ef4444"),
                borderRadius: 8,
                color: disabled ? "#4a3c2c" : "#ef4444",
                padding: "10px 16px",
                fontSize: 13,
                cursor: disabled ? "not-allowed" : "pointer",
                letterSpacing: 2,
                textTransform: "uppercase",
                fontFamily: "monospace",
                fontWeight: "bold",
            }, style)}
        >
            {children}
        </button>
    );
}

// --- Tooltip ---

function Tooltip({ title, text, below, children }) {
    var [show, setShow] = useState(false);
    var tipStyle = below
        ? { position: "absolute", top: "calc(100% + 8px)", left: 0 }
        : { position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };
    return (
        <div
            style={{ position: "relative", display: "flex", flexDirection: "column", flex: "none" }}
            onMouseEnter={function() { setShow(true); }}
            onMouseLeave={function() { setShow(false); }}
        >
            {children}
            {show && !ToastContext.active && (
                <div style={Object.assign({}, tipStyle, {
                    background: "#0a0704",
                    border: "1px solid #f59e0b66",
                    borderRadius: 10,
                    padding: "14px 16px",
                    fontSize: 12,
                    color: "#c8b89a",
                    lineHeight: 1.8,
                    zIndex: 300,
                    width: 260,
                    boxShadow: "0 6px 20px rgba(0,0,0,0.97)",
                    pointerEvents: "none",
                    whiteSpace: "normal",
                })}>
                    {title && <div style={{ color: "#f59e0b", fontWeight: "bold", letterSpacing: 2, marginBottom: 8, fontSize: 12 }}>{title}</div>}
                    {text}
                </div>
            )}
        </div>
    );
}

// --- Toast ---

function Toast({ msg, icon, color, onDone, duration, locked }) {
    var [visible, setVisible] = useState(true);
    ToastContext.active = visible;
    useEffect(function() {
        ToastContext.active = true;
        var timer = setTimeout(function() {
            setVisible(false);
            ToastContext.active = false;
            setTimeout(onDone, 400);
        }, duration || 4500);
        return function() { clearTimeout(timer); ToastContext.active = false; };
    }, []);
    if (!visible) return null;
    var lines = msg.split("\n");
    return (
        <div
            onClick={locked ? null : function() { setVisible(false); setTimeout(onDone, 200); }}
            style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)", zIndex: 9999,
                cursor: locked ? "default" : "pointer",
                width: "min(400px,90%)", pointerEvents: "auto",
            }}
        >
            <div style={{
                background: "#0c0905",
                border: "4px solid " + color,
                borderRadius: 20,
                padding: "36px 44px",
                boxShadow: "0 24px 80px rgba(0,0,0,0.99)",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 20, textAlign: "center",
            }}>
                <span style={{ fontSize: 64, lineHeight: 1 }}>{icon}</span>
                <div style={{ fontSize: 24, color: color, fontWeight: "bold", letterSpacing: 3, lineHeight: 1.3 }}>{lines[0]}</div>
                {lines[1] && <div style={{ fontSize: 16, color: "#c8b89a", lineHeight: 1.6 }}>{lines[1]}</div>}
                {!locked && <div style={{ fontSize: 10, color: "#4a3c2c", letterSpacing: 2 }}>CLICK TO DISMISS</div>}
            </div>
        </div>
    );
}

// --- Scale Wrapper (responsive scaling container) ---

function ScaleWrapper({ children }) {
    var DESIGN_WIDTH = 1100;
    var [scale, setScale] = useState(1);
    var containerRef = useRef(null);
    var innerRef = useRef(null);
    useEffect(function() {
        var outer = containerRef.current;
        var inner = innerRef.current;
        if (!outer || !inner) return;
        function recalc() {
            var outerWidth = outer.clientWidth;
            var outerHeight = outer.clientHeight;
            var innerHeight = inner.scrollHeight || 820;
            var newScale = Math.min(outerWidth / DESIGN_WIDTH, outerHeight / innerHeight, 1.5);
            setScale(newScale);
        }
        var observer = new ResizeObserver(recalc);
        observer.observe(outer);
        observer.observe(inner);
        recalc();
        return function() { observer.disconnect(); };
    }, []);
    return (
        <div ref={containerRef} style={{
            width: "100%", height: "100vh", overflow: "hidden",
            background: "#0a0704", display: "flex",
            alignItems: "center", justifyContent: "center",
        }}>
            <div ref={innerRef} style={{
                width: DESIGN_WIDTH,
                transformOrigin: "center center",
                transform: "scale(" + scale + ")",
                flexShrink: 0,
            }}>
                {children}
            </div>
        </div>
    );
}

// ============================================================
// Plugin-style API — single export, one entry point
// ============================================================
var UIComponents = {
    // Context
    ToastContext: ToastContext,

    // Layout
    Panel: Panel,
    Row: Row,
    SectionLabel: SectionLabel,
    InfoRow: InfoRow,

    // Display
    Badge: Badge,
    Bar: Bar,
    Pips: Pips,
    GoldPop: GoldPop,

    // Buttons
    ActionBtn: ActionBtn,
    DangerBtn: DangerBtn,

    // Overlays
    Tooltip: Tooltip,
    Toast: Toast,

    // Scene
    ScaleWrapper: ScaleWrapper,
};

export default UIComponents;