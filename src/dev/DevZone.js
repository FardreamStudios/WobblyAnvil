// ============================================================
// DevZone.js — Dev Tool: Inspectable Zone Wrapper
// Tooltips collect into a shared container that positions
// itself based on cursor quadrant — stack grows away from
// the nearest screen edges.
//
// Architecture:
//   TooltipProvider — wraps the viewer, owns the portal
//   DevZone        — registers tooltip data on hover/click
//   TooltipStack   — renders all active tooltips in one group
//
// Props (DevZone):
//   name, file, location, data, color, depth, style, row
// ============================================================

import { useState, useRef, useEffect, createContext, useContext, useCallback } from "react";
import { createPortal } from "react-dom";
import THEME from "../config/theme.js";

// --- Depth visual config ---
var DEPTH_CONFIG = [
    { scale: 1.0,  opacity: 1.0,  borderWidth: 2 },
    { scale: 0.95, opacity: 0.82, borderWidth: 1.5 },
    { scale: 0.90, opacity: 0.65, borderWidth: 1 },
    { scale: 0.85, opacity: 0.50, borderWidth: 1 },
];

function getDepthConfig(depth) {
    var d = Math.min(depth || 0, DEPTH_CONFIG.length - 1);
    return DEPTH_CONFIG[d];
}

// --- Reverse-lookup maps for theme tokens ---
var TOKEN_MAPS = {};

function buildTokenMaps() {
    if (TOKEN_MAPS.built) return;
    TOKEN_MAPS.colors = {};
    TOKEN_MAPS.fontSize = {};
    TOKEN_MAPS.spacing = {};
    TOKEN_MAPS.radius = {};
    TOKEN_MAPS.borders = {};
    TOKEN_MAPS.fonts = {};
    TOKEN_MAPS.shadows = {};
    TOKEN_MAPS.layout = {};

    var sections = ["colors", "fontSize", "spacing", "radius", "borders", "fonts", "shadows", "layout"];
    for (var s = 0; s < sections.length; s++) {
        var section = sections[s];
        var obj = THEME[section];
        if (!obj) continue;
        var keys = Object.keys(obj);
        for (var k = 0; k < keys.length; k++) {
            var val = obj[keys[k]];
            if (typeof val === "string" || typeof val === "number") {
                TOKEN_MAPS[section][String(val)] = section + "." + keys[k];
            }
        }
    }
    TOKEN_MAPS.built = true;
}

function resolveToken(value) {
    buildTokenMaps();
    var str = String(value);
    var sections = ["colors", "fontSize", "spacing", "radius", "borders", "fonts", "shadows", "layout"];
    for (var s = 0; s < sections.length; s++) {
        var match = TOKEN_MAPS[sections[s]][str];
        if (match) return match;
    }
    return null;
}

function formatValue(val) {
    if (val === undefined || val === null) return "\u2014";
    if (typeof val === "number") return val + "px";
    return String(val);
}

// ============================================================
// TOOLTIP CONTEXT
// Shared state: which zones are hovered, cursor position
// ============================================================

var TooltipCtx = createContext(null);

function TooltipProvider(props) {
    var [activeZones, setActiveZones] = useState({});
    var [lockedZones, setLockedZones] = useState({});
    var [cursor, setCursor] = useState({ x: 0, y: 0 });

    var register = useCallback(function(id, zoneData) {
        setActiveZones(function(prev) {
            var next = Object.assign({}, prev);
            next[id] = zoneData;
            return next;
        });
    }, []);

    var unregister = useCallback(function(id) {
        setActiveZones(function(prev) {
            var next = Object.assign({}, prev);
            delete next[id];
            return next;
        });
    }, []);

    var toggleLock = useCallback(function(id, zoneData) {
        setLockedZones(function(prev) {
            var next = Object.assign({}, prev);
            if (next[id]) {
                delete next[id];
            } else {
                next[id] = zoneData;
            }
            return next;
        });
    }, []);

    var clearLocks = useCallback(function() {
        setLockedZones({});
    }, []);

    var updateCursor = useCallback(function(x, y) {
        setCursor({ x: x, y: y });
    }, []);

    var value = {
        activeZones: activeZones,
        lockedZones: lockedZones,
        cursor: cursor,
        register: register,
        unregister: unregister,
        toggleLock: toggleLock,
        clearLocks: clearLocks,
        updateCursor: updateCursor,
    };

    return (
        <TooltipCtx.Provider value={value}>
            {props.children}
            <TooltipStack />
        </TooltipCtx.Provider>
    );
}

// ============================================================
// TOOLTIP STACK — single portal, all tooltips in one container
// ============================================================

function TooltipStack() {
    var ctx = useContext(TooltipCtx);
    var stackRef = useRef(null);

    // Merge active (hovered) and locked zones, locked takes priority
    var allZones = Object.assign({}, ctx.activeZones, ctx.lockedZones);
    var zoneIds = Object.keys(allZones);

    if (zoneIds.length === 0) return null;

    // Sort by depth so parent renders first
    var sorted = zoneIds.map(function(id) { return allZones[id]; })
        .sort(function(a, b) { return (a.depth || 0) - (b.depth || 0); });

    // Quadrant detection — grow away from nearest edges
    var cx = ctx.cursor.x;
    var cy = ctx.cursor.y;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var rightSpace = vw - cx;
    var leftSpace = cx;
    var bottomSpace = vh - cy;
    var topSpace = cy;

    // Pick horizontal anchor
    var growRight = rightSpace >= leftSpace;
    // Pick vertical anchor
    var growDown = bottomSpace >= topSpace;

    // Position the stack container
    var stackStyle = {
        position: "fixed",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        pointerEvents: "none",
        maxWidth: Math.min(380, (growRight ? rightSpace : leftSpace) - 20),
        maxHeight: Math.min(vh - 40, (growDown ? bottomSpace : topSpace) - 20),
        overflowY: "auto",
        overflowX: "hidden",
    };

    // Anchor position
    if (growRight) {
        stackStyle.left = cx + 20;
    } else {
        stackStyle.right = vw - cx + 12;
    }
    if (growDown) {
        stackStyle.top = cy + 16;
    } else {
        stackStyle.bottom = vh - cy + 8;
    }

    return createPortal(
        <div ref={stackRef} style={stackStyle}>
            {sorted.map(function(zone, i) {
                return <TooltipContent key={zone.id || i} name={zone.name} file={zone.file}
                                       location={zone.location} data={zone.data} depth={zone.depth} />;
            })}
        </div>,
        document.body
    );
}

// ============================================================
// TOOLTIP CONTENT — single tooltip card
// ============================================================

function TooltipContent(props) {
    var name = props.name;
    var file = props.file;
    var location = props.location;
    var data = props.data;
    var depth = props.depth || 0;
    var dc = getDepthConfig(depth);

    var T = THEME;
    var rows = [];

    if (data) {
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var val = data[key];
            var token = resolveToken(val);
            rows.push({ key: key, value: formatValue(val), token: token });
        }
    }

    return (
        <div style={{
            background: T.colors.bgDeep,
            border: depth === 0 ? "2px solid " + T.colors.gold : "1px solid " + T.colors.borderLight,
            borderRadius: 8,
            padding: "10px 14px",
            minWidth: 240,
            fontFamily: T.fonts.body,
            boxShadow: "0 6px 24px rgba(0,0,0,0.95)",
            pointerEvents: "none",
            opacity: dc.opacity,
            transform: "scale(" + dc.scale + ")",
            transformOrigin: "top left",
        }}>
            {depth > 0 && (
                <div style={{ fontSize: 10, color: T.colors.textMuted, letterSpacing: 1, marginBottom: 3 }}>
                    {"\u2514 DEPTH " + depth}
                </div>
            )}

            <div style={{
                fontSize: 14, color: T.colors.gold, fontWeight: "bold",
                letterSpacing: 2, fontFamily: T.fonts.heading, marginBottom: 6,
            }}>{name}</div>

            <div style={{ height: 1, background: T.colors.borderLight, margin: "5px 0" }} />

            {rows.map(function(row, idx) {
                return (
                    <div key={idx} style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "baseline", gap: 12, padding: "2px 0",
                    }}>
                        <span style={{ fontSize: 12, color: T.colors.textLabel, letterSpacing: 1, fontWeight: "bold", flexShrink: 0 }}>
                            {row.key}
                        </span>
                        <span style={{ fontSize: 12, color: T.colors.textLight, textAlign: "right" }}>
                            {row.value}
                            {row.token && (
                                <span style={{ color: T.colors.gold, marginLeft: 6, fontSize: 10 }}>
                                    ({row.token})
                                </span>
                            )}
                        </span>
                    </div>
                );
            })}

            {(file || location) && (
                <>
                    <div style={{ height: 1, background: T.colors.borderLight, margin: "5px 0" }} />
                    <div style={{ fontSize: 11, color: T.colors.blue, letterSpacing: 1 }}>
                        FILE: {file || "\u2014"}
                    </div>
                    {location && (
                        <div style={{ fontSize: 11, color: T.colors.textDim, letterSpacing: 1, marginTop: 2 }}>
                            {location}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ============================================================
// DEVZONE — wrapper component
// ============================================================

var zoneCounter = 0;

function DevZone(props) {
    var name = props.name;
    var file = props.file;
    var location = props.location;
    var data = props.data;
    var color = props.color || THEME.colors.gold;
    var depth = props.depth || 0;
    var style = props.style || {};
    var row = props.row;
    var children = props.children;

    var dc = getDepthConfig(depth);
    var ctx = useContext(TooltipCtx);
    var idRef = useRef("dz_" + (++zoneCounter));
    var wrapperRef = useRef(null);
    var [hovered, setHovered] = useState(false);
    var [locked, setLocked] = useState(false);

    var zoneData = {
        id: idRef.current,
        name: name,
        file: file,
        location: location,
        data: data,
        depth: depth,
    };

    function handleMouseEnter(e) {
        e.stopPropagation();
        setHovered(true);
        if (ctx) ctx.register(idRef.current, zoneData);
    }

    function handleMouseLeave(e) {
        e.stopPropagation();
        setHovered(false);
        if (ctx) ctx.unregister(idRef.current);
    }

    function handleMouseMove(e) {
        if (ctx) ctx.updateCursor(e.clientX, e.clientY);
    }

    function handleClick(e) {
        e.stopPropagation();
        var newLocked = !locked;
        setLocked(newLocked);
        if (ctx) ctx.toggleLock(idRef.current, zoneData);
    }

    // Clean up on unmount
    useEffect(function() {
        var id = idRef.current;
        return function() {
            if (ctx) {
                ctx.unregister(id);
            }
        };
    }, []);

    // Click outside to clear all locks
    useEffect(function() {
        if (!locked) return;
        function handleOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setLocked(false);
                if (ctx) ctx.clearLocks();
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return function() { document.removeEventListener("mousedown", handleOutside); };
    }, [locked]);

    var showHighlight = hovered || locked;

    var borderStyle = showHighlight
        ? dc.borderWidth + "px solid " + color
        : "1px dashed " + color + "44";

    var wrapperStyle = Object.assign({
        position: "relative",
        border: borderStyle,
        borderRadius: THEME.radius.md,
        display: "flex",
        flexDirection: row ? "row" : "column",
        overflow: "visible",
        cursor: "pointer",
        transition: "border 0.15s",
    }, style);

    return (
        <div
            ref={wrapperRef}
            style={wrapperStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
        >
            <div style={{
                position: "absolute", top: 0, left: 0, zIndex: 10,
                background: showHighlight ? color + "44" : color + "18",
                padding: "1px 6px", borderRadius: "0 0 4px 0",
                fontSize: depth === 0 ? 9 : 8,
                fontFamily: THEME.fonts.body,
                color: color, letterSpacing: 1, fontWeight: "bold",
                textTransform: "uppercase", whiteSpace: "nowrap",
                pointerEvents: "none",
                transition: "background 0.15s",
                opacity: showHighlight ? 1 : dc.opacity,
            }}>
                {name}
            </div>

            {children}
        </div>
    );
}

// ============================================================
// EXPORTS
// ============================================================

export default DevZone;
export { TooltipProvider };