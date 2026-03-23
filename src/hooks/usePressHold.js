// ============================================================
// usePressHold.js — Wobbly Anvil Press-Hold Gesture Hook
// Reusable hook: detects tap vs hold on any element.
// Tap (<100ms) fires onClick. Hold (>=100ms) fires onHold.
// Cancels on drag (>10px). Blocks context menu during hold.
//
// USAGE:
//   var press = usePressHold({ onClick: fn, onHold: fn });
//   <button {...press.handlers}>LABEL</button>
//   // press.isHolding — true while held past threshold
//
// PORTABLE: No game logic. Pure gesture detection.
// ============================================================

import { useState, useRef, useCallback } from "react";

var HOLD_THRESHOLD_MS = 400;
var DRAG_TOLERANCE_PX = 10;

function usePressHold(opts) {
    var onClick = opts.onClick;
    var onHold = opts.onHold;
    var disabled = opts.disabled;

    var holdTimerRef = useRef(null);
    var startPosRef = useRef(null);
    var heldRef = useRef(false);
    var activeRef = useRef(false);
    var [isHolding, setIsHolding] = useState(false);

    function cleanup() {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        activeRef.current = false;
        heldRef.current = false;
        setIsHolding(false);
    }

    function startPress(x, y) {
        if (disabled) return;
        startPosRef.current = { x: x, y: y };
        heldRef.current = false;
        activeRef.current = true;

        holdTimerRef.current = setTimeout(function() {
            if (!activeRef.current) return;
            heldRef.current = true;
            setIsHolding(true);
            if (onHold) onHold();
        }, HOLD_THRESHOLD_MS);
    }

    function movePress(x, y) {
        if (!activeRef.current || !startPosRef.current) return;
        var dx = x - startPosRef.current.x;
        var dy = y - startPosRef.current.y;
        if (Math.abs(dx) > DRAG_TOLERANCE_PX || Math.abs(dy) > DRAG_TOLERANCE_PX) {
            cleanup();
        }
    }

    function endPress() {
        if (!activeRef.current) return;
        var wasHeld = heldRef.current;
        cleanup();
        if (!wasHeld && onClick) {
            onClick();
        }
    }

    // --- Touch handlers ---
    var onTouchStart = useCallback(function(e) {
        var t = e.touches[0];
        startPress(t.clientX, t.clientY);
    }, [disabled, onClick, onHold]);

    var onTouchMove = useCallback(function(e) {
        var t = e.touches[0];
        movePress(t.clientX, t.clientY);
    }, []);

    var onTouchEnd = useCallback(function(e) {
        endPress();
    }, [onClick, onHold]);

    // --- Mouse handlers (desktop fallback) ---
    var onMouseDown = useCallback(function(e) {
        if (e.button !== 0) return;
        startPress(e.clientX, e.clientY);
    }, [disabled, onClick, onHold]);

    var onMouseMove = useCallback(function(e) {
        movePress(e.clientX, e.clientY);
    }, []);

    var onMouseUp = useCallback(function(e) {
        endPress();
    }, [onClick, onHold]);

    var onMouseLeave = useCallback(function() {
        if (activeRef.current) cleanup();
    }, []);

    // --- Block context menu on long-press ---
    var onContextMenu = useCallback(function(e) {
        if (onHold) e.preventDefault();
    }, [onHold]);

    return {
        isHolding: isHolding,
        handlers: {
            onTouchStart: onTouchStart,
            onTouchMove: onTouchMove,
            onTouchEnd: onTouchEnd,
            onMouseDown: onMouseDown,
            onMouseMove: onMouseMove,
            onMouseUp: onMouseUp,
            onMouseLeave: onMouseLeave,
            onContextMenu: onContextMenu,
        },
    };
}

export default usePressHold;