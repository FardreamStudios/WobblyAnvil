// ============================================================
// MicPrompt.js — First-load Microphone Permission Prompt
//
// Shows before the game starts to collect mic permission
// BEFORE fullscreen engages. This prevents the browser's
// permission dialog from breaking fullscreen mid-game.
//
// If permission is already granted (returning player),
// auto-skips with no visible UI.
//
// PORTABLE: No game logic. Pure permission utility.
// ============================================================

import { useState, useEffect } from "react";

// --- Check if mic permission is already granted via Permissions API ---
function _checkExistingPermission() {
    if (!navigator.permissions || !navigator.permissions.query) {
        return Promise.resolve("unknown");
    }
    return navigator.permissions.query({ name: "microphone" })
        .then(function(result) { return result.state; }) // "granted" | "denied" | "prompt"
        .catch(function() { return "unknown"; });
}

// --- Request mic access, immediately release the stream ---
function _requestMicAccess() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return Promise.resolve(false);
    }
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(function(stream) {
            // Got permission — release the stream immediately, we don't need it yet
            stream.getTracks().forEach(function(track) { track.stop(); });
            return true;
        })
        .catch(function() {
            return false;
        });
}

// ============================================================
// MicPrompt Component
// ============================================================

function MicPrompt(props) {
    var onComplete = props.onComplete; // fn(granted: boolean)
    var [checking, setChecking] = useState(true);
    var [visible, setVisible] = useState(false);
    var [requesting, setRequesting] = useState(false);

    // On mount, check if permission is already granted
    useEffect(function() {
        _checkExistingPermission().then(function(state) {
            if (state === "granted") {
                // Already have permission — skip prompt entirely
                onComplete(true);
            } else if (state === "denied") {
                // Previously denied — skip prompt, go text-only
                onComplete(false);
            } else {
                // "prompt" or "unknown" — show the UI
                setChecking(false);
                setVisible(true);
            }
        });
    }, []);

    function handleAllow() {
        if (requesting) return;
        setRequesting(true);
        _requestMicAccess().then(function(granted) {
            onComplete(granted);
        });
    }

    function handleSkip() {
        onComplete(false);
    }

    // Still checking permissions API — render nothing
    if (checking || !visible) return null;

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#0a0704",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Josefin Sans', 'Segoe UI', sans-serif",
            color: "#f0e6c8",
            padding: 24,
            textAlign: "center",
        }}>
            {/* Icon */}
            <div style={{ fontSize: 48, marginBottom: 16 }}>{"\uD83C\uDF99\uFE0F"}</div>

            {/* Title */}
            <div style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#f59e0b",
                letterSpacing: 2,
                marginBottom: 12,
                textTransform: "uppercase",
                fontFamily: "'Cinzel', serif",
            }}>
                Voice Chat
            </div>

            {/* Description */}
            <div style={{
                fontSize: 14,
                color: "#c8b89a",
                maxWidth: 280,
                lineHeight: 1.6,
                marginBottom: 28,
            }}>
                You can use your microphone to talk to characters in-game.
                Allow mic access for the best experience, or skip to use text chat instead.
            </div>

            {/* Allow button */}
            <button
                onClick={handleAllow}
                disabled={requesting}
                style={{
                    background: requesting ? "#1a1408" : "#2a1f0a",
                    border: "2px solid #f59e0b",
                    borderRadius: 10,
                    color: "#f59e0b",
                    padding: "14px 48px",
                    fontSize: 15,
                    cursor: requesting ? "wait" : "pointer",
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    fontFamily: "'Cinzel', serif",
                    fontWeight: "bold",
                    marginBottom: 16,
                    opacity: requesting ? 0.6 : 1,
                    transition: "opacity 0.2s",
                }}
            >
                {requesting ? "Waiting..." : "Allow Mic"}
            </button>

            {/* Skip link */}
            <div
                onClick={handleSkip}
                style={{
                    fontSize: 12,
                    color: "#5a4a38",
                    cursor: "pointer",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    padding: "8px 16px",
                }}
            >
                Skip — use text chat
            </div>
        </div>
    );
}

export default MicPrompt;