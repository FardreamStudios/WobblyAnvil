// ============================================================
// AdventureButton.js — Locked Adventure Mode Entry
//
// Shows a locked button on the main menu. Tap to reveal
// inline code input. Correct code unlocks for session.
// Wrong code shakes the input. Unlocked tap fires callback.
//
// Props:
//   onEnterAdventure — called when unlocked button is tapped
//   sfx              — sound effect hook (click)
// ============================================================

import { useState, useRef } from "react";
import AdventureGate from "../config/adventureGate.js";

function AdventureButton(props) {
    var onEnterAdventure = props.onEnterAdventure;
    var sfx = props.sfx;

    var [unlocked, setUnlocked] = useState(false);
    var [showInput, setShowInput] = useState(false);
    var [codeValue, setCodeValue] = useState("");
    var [shaking, setShaking] = useState(false);
    var inputRef = useRef(null);

    function handleLockedTap() {
        if (sfx) sfx.click();
        setShowInput(true);
        setTimeout(function() {
            if (inputRef.current) inputRef.current.focus();
        }, 50);
    }

    function handleSubmit() {
        var match = AdventureGate.validateCode(codeValue);
        if (match) {
            if (sfx) sfx.click();
            setUnlocked(true);
            setShowInput(false);
            setCodeValue("");
        } else {
            setShaking(true);
            setTimeout(function() { setShaking(false); }, 500);
        }
    }

    function handleKeyDown(e) {
        if (e.key === "Enter") handleSubmit();
    }

    function handleUnlockedTap() {
        if (sfx) sfx.click();
        if (onEnterAdventure) onEnterAdventure();
    }

    // --- Styles ---
    var btnBase = {
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: "bold",
        letterSpacing: 3,
        textTransform: "uppercase",
        borderRadius: 8,
        cursor: "pointer",
        padding: "8px 24px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "border-color 0.4s, color 0.4s, background 0.4s",
    };

    var lockedStyle = Object.assign({}, btnBase, {
        background: "rgba(20,16,9,0.8)",
        border: "2px solid #3d2e0f",
        color: "#5a4a38",
    });

    var unlockedStyle = Object.assign({}, btnBase, {
        background: "#2a1f0a",
        border: "2px solid #f59e0b",
        color: "#f59e0b",
        textShadow: "0 1px 6px rgba(245,158,11,0.2)",
    });

    var inputWrapStyle = {
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 6,
        animation: shaking ? "adventureShake 0.4s ease" : "none",
    };

    var inputStyle = {
        fontFamily: "monospace",
        fontSize: 12,
        background: "#141009",
        border: "1px solid " + (shaking ? "#ef4444" : "#3d2e0f"),
        borderRadius: 4,
        color: "#f0e6c8",
        padding: "6px 10px",
        outline: "none",
        letterSpacing: 1,
        width: 180,
        transition: "border-color 0.3s",
    };

    var goBtnStyle = {
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: "bold",
        letterSpacing: 2,
        textTransform: "uppercase",
        background: "#2a1f0a",
        border: "1px solid #5a4a38",
        borderRadius: 4,
        color: "#c8b89a",
        padding: "6px 12px",
        cursor: "pointer",
    };

    // Inline keyframe for shake — injected once
    var shakeCSS = "@keyframes adventureShake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }";

    if (unlocked) {
        return (
            <button onClick={handleUnlockedTap} style={unlockedStyle}>
                ADVENTURE
            </button>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <style>{shakeCSS}</style>
            <button onClick={handleLockedTap} style={lockedStyle}>
                {"\uD83D\uDD12"} ADVENTURE
            </button>
            {showInput && (
                <div style={inputWrapStyle}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={codeValue}
                        onChange={function(e) { setCodeValue(e.target.value); }}
                        onKeyDown={handleKeyDown}
                        placeholder="enter code"
                        style={inputStyle}
                        autoComplete="off"
                        autoCapitalize="off"
                    />
                    <button onClick={handleSubmit} style={goBtnStyle}>GO</button>
                </div>
            )}
        </div>
    );
}

export default AdventureButton;