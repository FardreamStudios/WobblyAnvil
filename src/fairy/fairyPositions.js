// ============================================================
// fairyPositions.js — Fairy Position Registry
//
// 2D nav mesh for fairy movement. Per-scene depth maps with
// continuous scale/z formula + named spots as bookmarks.
// UI targets for overlay mode. Edge peeks for viewport entries.
//
// Pure data + pure functions. No React, no state.
// Pawn is the sole consumer — caches and invalidates as needed.
//
// Two rendering layers:
//   SCENE AVATAR — inside GameCenter, participates in prop z-order
//   UI OVERLAY   — portal to body, viewport coords, always on top
// ============================================================

// ============================================================
// DEPTH FORMULA
// Continuous scale + z from any y-position in a scene.
//
//   scale = scaleFar + (scaleNear - scaleFar) * t^curve
//   z     = zBase + (zTop - zBase) * t
//   t     = clamp((y - yFar) / (yNear - yFar), 0, 1)
//
// Tunable knobs per scene:
//   yFar / yNear    — y% range of the depth field
//   scaleFar / scaleNear — sprite size at extremes
//   curve           — 1.0 = linear, >1 = grows faster near front
//   zBase / zTop    — z-index range
// ============================================================

function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

function resolveDepth(depthCurve, y) {
    var t = clamp01((y - depthCurve.yFar) / (depthCurve.yNear - depthCurve.yFar));
    var curved = Math.pow(t, depthCurve.curve);
    var scale = depthCurve.scaleFar + (depthCurve.scaleNear - depthCurve.scaleFar) * curved;
    var z = Math.round(depthCurve.zBase + (depthCurve.zTop - depthCurve.zBase) * t);
    return { scale: scale, z: z, t: t };
}

// ============================================================
// FORGE SCENE MAP
//
// Background layers (current + planned):
//   z:0  — background image (single layer, future split)
//   z:1  — smith character
//   z:2  — anvil prop
//   z:3  — scene FX canvas
//   z:5+ — foreground wall edges [future split]
//
// Fairy depth range z:0–6 lets her slot between any layers.
// ============================================================

var FORGE_MAP = {

    // --- Depth curve (7 tunable knobs) ---
    depthCurve: {
        yFar: 30,           // y% where "far away" starts
        yNear: 90,          // y% where "closest" is
        scaleFar: 0.3,      // fairy size at far back
        scaleNear: 1.0,     // fairy size up close
        curve: 1.0,         // 1.0=linear, >1=grows faster near front
        zBase: 0,           // lowest z (at yFar)
        zTop: 6,            // highest z (at yNear)
    },

    // --- Named spots (smart objects / POIs) ---
    // Each references a y-position; scale + z derived from depth curve.
    // scaleOverride: set explicitly to bypass formula (comedic effect, etc.)
    spots: [
        { id: "doorway",       x: 15,  y: 45,  label: "background doorway" },
        { id: "back_shelf",    x: 80,  y: 35,  label: "high shelf in back" },
        { id: "forge_mouth",   x: 55,  y: 70,  label: "next to forge opening" },
        { id: "near_anvil",    x: 38,  y: 80,  label: "beside the anvil" },
        { id: "center_floor",  x: 50,  y: 75,  label: "open floor center" },
        { id: "far_left",      x: 10,  y: 40,  label: "far left back wall" },
        { id: "far_right",     x: 90,  y: 40,  label: "far right back wall" },
        { id: "front_left",    x: 15,  y: 88,  label: "front left corner" },
        { id: "front_right",   x: 85,  y: 88,  label: "front right corner" },
    ],

    // --- Roam zones (simple bounds, fairy wanders freely inside) ---
    // Depth is derived from y at each random point within the zone.
    roamZones: [
        { id: "floor_open",  minX: 20, maxX: 70, minY: 68, maxY: 85, label: "open floor area" },
        { id: "back_wall",   minX: 10, maxX: 85, minY: 35, maxY: 52, label: "back wall area" },
    ],

    // --- Dodge paths (entry → exit corridors) ---
    // Fairy dashes along these. Occlusion handled by scene layer z-ordering.
    // At mid_back depth (~y:45), fairy z sits between outdoor bg and forge wall.
    dodgePaths: [
        {
            id: "doorway_dash",
            y: 45,
            entry: { x: -5 },
            exit:  { x: 105 },
            label: "run past doorway opening — occluded by wall layers",
        },
        {
            id: "foreground_dash",
            y: 88,
            entry: { x: -10 },
            exit:  { x: 110 },
            label: "sprint across foreground",
        },
    ],

    // --- Restricted areas (fairy avoids these) ---
    // Checked by isRestricted() before placing fairy.
    restricted: [
        { id: "anvil_body",  minX: 28, maxX: 46, minY: 75, maxY: 100, label: "anvil prop area" },
        { id: "forge_fire",  minX: 46, maxX: 66, minY: 58, maxY: 80,  label: "forge fire area" },
    ],
};

// ============================================================
// SCENE MAP REGISTRY
// Add new scenes here as art lands.
// ============================================================

var FAIRY_SCENE_MAPS = {
    forge: FORGE_MAP,
    // shop: SHOP_MAP,
    // fishing: FISHING_MAP,
};

// ============================================================
// UI TARGETS (scene-independent, overlay layer)
// Resolved at runtime from data-fairy-target DOM attributes.
// Offset in px — nudges the fairy near the element, not on it.
// ============================================================

var UI_TARGETS = [
    { id: "gold",       selector: '[data-fairy-target="gold"]',       offset: { x: 0,   y: -20 } },
    { id: "stamina",    selector: '[data-fairy-target="stamina"]',    offset: { x: 0,   y: -20 } },
    { id: "qte",        selector: '[data-fairy-target="qte"]',        offset: { x: 0,   y: -30 } },
    { id: "customer",   selector: '[data-fairy-target="customer"]',   offset: { x: -20, y: 0 } },
    { id: "stats",      selector: '[data-fairy-target="stats"]',      offset: { x: 20,  y: 0 } },
    { id: "rep",        selector: '[data-fairy-target="rep"]',        offset: { x: 0,   y: 120 } },
    { id: "forge_info", selector: '[data-fairy-target="forge_info"]', offset: { x: 20,  y: 0 } },
    { id: "scene",      selector: '[data-fairy-target="scene"]',      offset: { x: 0,   y: 0 } },
];

// ============================================================
// EDGE PEEKS (viewport %, overlay layer)
// Migrated from FairyAnim.js. Used for peek-in animations.
// from = off-screen start, to = peeked-in position.
// variance = random offset along the edge each time.
// ============================================================

var EDGE_PEEKS = [
    { id: "bottom", from: { x: 50, y: 115 }, to: { x: 50, y: 93 },  rot: 0,    variance: { axis: "x", range: 15 } },
    { id: "top",    from: { x: 50, y: -15 }, to: { x: 50, y: 7 },   rot: 180,  variance: { axis: "x", range: 15 } },
    { id: "left",   from: { x: -15, y: 50 }, to: { x: 7, y: 50 },   rot: 90,   variance: { axis: "y", range: 12 } },
    { id: "right",      from: { x: 115, y: 50 }, to: { x: 93, y: 50 },  rot: -90,  variance: { axis: "y", range: 12 } },
    { id: "talk_close", from: { x: 70, y: 115 }, to: { x: 70, y: 82 },  rot: 0,    variance: { axis: "x", range: 5 } },
];

// ============================================================
// RESOLVER FUNCTIONS
// Pure — no state, no caching. Pawn wraps these with caching.
// ============================================================

/**
 * Get scale + z for any y-position in a scene.
 * Returns { scale, z, t } where t is 0–1 depth fraction.
 */
function getDepthAt(sceneId, y) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    if (!map) return { scale: 1.0, z: 3, t: 0.5 };
    return resolveDepth(map.depthCurve, y);
}

/**
 * Get a named spot with its resolved depth values.
 * Returns { id, x, y, scale, z, label } or null.
 */
function getSpot(sceneId, spotId) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    if (!map) return null;

    for (var i = 0; i < map.spots.length; i++) {
        var spot = map.spots[i];
        if (spot.id === spotId) {
            var depth = spot.scaleOverride
                ? { scale: spot.scaleOverride, z: resolveDepth(map.depthCurve, spot.y).z, t: 0 }
                : resolveDepth(map.depthCurve, spot.y);
            return {
                id: spot.id,
                x: spot.x,
                y: spot.y,
                scale: depth.scale,
                z: depth.z,
                label: spot.label,
            };
        }
    }
    return null;
}

/**
 * Pick a random point inside a roam zone.
 * Returns { x, y, scale, z } or null.
 */
function getRandomRoamPoint(sceneId, zoneId) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    if (!map) return null;

    for (var i = 0; i < map.roamZones.length; i++) {
        var zone = map.roamZones[i];
        if (zone.id === zoneId) {
            var x = zone.minX + Math.random() * (zone.maxX - zone.minX);
            var y = zone.minY + Math.random() * (zone.maxY - zone.minY);

            // Reject if inside a restricted area — try up to 5 times
            for (var attempt = 0; attempt < 5; attempt++) {
                if (!isRestricted(sceneId, x, y)) break;
                x = zone.minX + Math.random() * (zone.maxX - zone.minX);
                y = zone.minY + Math.random() * (zone.maxY - zone.minY);
            }

            var depth = resolveDepth(map.depthCurve, y);
            return { x: x, y: y, scale: depth.scale, z: depth.z };
        }
    }
    return null;
}

/**
 * Get a dodge path definition with resolved depth.
 * Returns { id, y, entry, exit, scale, z, label } or null.
 */
function getDodgePath(sceneId, pathId) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    if (!map) return null;

    for (var i = 0; i < (map.dodgePaths || []).length; i++) {
        var path = map.dodgePaths[i];
        if (path.id === pathId) {
            var depth = resolveDepth(map.depthCurve, path.y);
            return {
                id: path.id,
                y: path.y,
                entry: path.entry,
                exit: path.exit,
                scale: depth.scale,
                z: depth.z,
                label: path.label,
            };
        }
    }
    return null;
}

/**
 * Check if a point overlaps any restricted area in a scene.
 */
function isRestricted(sceneId, x, y) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    if (!map) return false;

    for (var i = 0; i < (map.restricted || []).length; i++) {
        var r = map.restricted[i];
        if (x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY) {
            return true;
        }
    }
    return false;
}

/**
 * Resolve a UI target from DOM. Returns viewport coordinates.
 * Returns { x, y } in viewport px or null if element not found.
 * Pawn calls this and converts to its overlay coordinate space.
 */
function resolveUITarget(targetId) {
    for (var i = 0; i < UI_TARGETS.length; i++) {
        var target = UI_TARGETS[i];
        if (target.id === targetId) {
            var el = document.querySelector(target.selector);
            if (!el) return null;
            var rect = el.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2 + target.offset.x,
                y: rect.top + rect.height / 2 + target.offset.y,
            };
        }
    }
    return null;
}

/**
 * Get an edge peek definition with random variance applied.
 * Returns { from: {x,y}, to: {x,y}, rot } or null.
 */
function getEdgePeek(peekId) {
    for (var i = 0; i < EDGE_PEEKS.length; i++) {
        var peek = EDGE_PEEKS[i];
        if (peek.id === peekId) {
            var v = peek.variance;
            var offset = (Math.random() - 0.5) * 2 * v.range;
            var from = { x: peek.from.x, y: peek.from.y };
            var to = { x: peek.to.x, y: peek.to.y };

            if (v.axis === "x") {
                from.x += offset;
                to.x += offset;
            } else {
                from.y += offset;
                to.y += offset;
            }

            return { from: from, to: to, rot: peek.rot };
        }
    }
    return null;
}

/**
 * Get the depth curve config for a scene (for debug/tuning).
 */
function getDepthCurve(sceneId) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    return map ? map.depthCurve : null;
}

/**
 * List all spot IDs in a scene.
 */
function listSpots(sceneId) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    if (!map) return [];
    return map.spots.map(function(s) { return s.id; });
}

/**
 * List all roam zone IDs in a scene.
 */
function listRoamZones(sceneId) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    if (!map) return [];
    return map.roamZones.map(function(z) { return z.id; });
}

/**
 * List all dodge path IDs in a scene.
 */
function listDodgePaths(sceneId) {
    var map = FAIRY_SCENE_MAPS[sceneId];
    if (!map) return [];
    return (map.dodgePaths || []).map(function(p) { return p.id; });
}

// ============================================================
// EXPORTS
// ============================================================

var FairyPositions = {
    // Data (direct access for debug/tuning)
    FAIRY_SCENE_MAPS: FAIRY_SCENE_MAPS,
    UI_TARGETS: UI_TARGETS,
    EDGE_PEEKS: EDGE_PEEKS,

    // Resolvers
    getDepthAt: getDepthAt,
    getSpot: getSpot,
    getRandomRoamPoint: getRandomRoamPoint,
    getDodgePath: getDodgePath,
    isRestricted: isRestricted,
    resolveUITarget: resolveUITarget,
    getEdgePeek: getEdgePeek,
    getDepthCurve: getDepthCurve,

    // Listing helpers
    listSpots: listSpots,
    listRoamZones: listRoamZones,
    listDodgePaths: listDodgePaths,
};

export default FairyPositions;