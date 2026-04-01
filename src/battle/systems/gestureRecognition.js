// ============================================================
// gestureRecognition.js — Gesture Recognition Utility
//
// Pure JS. Stateless helper functions. Zero dependencies.
// Used by the Chalkboard component for swipe and circle
// check types. Portable — drop into any JS project.
//
// API:
//   classifySwipeDirection(dx, dy) → "up"/"down"/"left"/"right" or null
//   isDirectionMatch(actual, expected) → boolean
//   isCircleGesture(points) → boolean
//
// UE Analogy: Input classification utility (like an input
// action mapping that resolves raw touch into game actions).
// ============================================================

// --- Config ---
var SWIPE_TOLERANCE_DEG = 45;   // ±degrees from cardinal axis
var CIRCLE_MIN_ARC_DEG = 270;   // minimum arc coverage for valid circle
var CIRCLE_MIN_POINTS = 8;      // minimum sample points for circle check

// ============================================================
// classifySwipeDirection
//
// Given a displacement vector (dx, dy), returns the cardinal
// direction if the angle falls within ±SWIPE_TOLERANCE_DEG
// of a cardinal axis. Returns null if ambiguous or zero-length.
//
// Coordinate system: +x = right, +y = down (screen coords).
// ============================================================
function classifySwipeDirection(dx, dy) {
    if (dx === 0 && dy === 0) return null;

    // atan2 gives angle in radians, -PI to PI
    // Convert to degrees: 0° = right, 90° = down, -90° = up
    var angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    var tolerance = SWIPE_TOLERANCE_DEG;

    // Right: -tolerance to +tolerance
    if (angleDeg >= -tolerance && angleDeg <= tolerance) return "right";

    // Left: ±180 zone
    if (angleDeg >= (180 - tolerance) || angleDeg <= -(180 - tolerance)) return "left";

    // Down: 90 ± tolerance
    if (angleDeg >= (90 - tolerance) && angleDeg <= (90 + tolerance)) return "down";

    // Up: -90 ± tolerance
    if (angleDeg >= -(90 + tolerance) && angleDeg <= -(90 - tolerance)) return "up";

    return null;
}

// ============================================================
// isDirectionMatch
//
// Returns true if actual direction matches expected.
// Both should be "up"/"down"/"left"/"right" or null.
// null actual always returns false.
// ============================================================
function isDirectionMatch(actual, expected) {
    if (!actual || !expected) return false;
    return actual === expected;
}

// ============================================================
// isCircleGesture
//
// Given an array of {x, y} points (touch/mouse samples),
// checks whether the path traces a sufficient arc to count
// as a circle gesture. Uses angular coverage around the
// centroid — must sweep ≥ CIRCLE_MIN_ARC_DEG.
//
// Algorithm:
//   1. Compute centroid of all points.
//   2. For each point, compute angle from centroid.
//   3. Quantize angles into 1° buckets (0–359).
//   4. Count how many unique degree buckets are covered.
//   5. If coverage ≥ CIRCLE_MIN_ARC_DEG → valid circle.
//
// Returns false for too few points or degenerate paths.
// ============================================================
function isCircleGesture(points) {
    if (!points || points.length < CIRCLE_MIN_POINTS) return false;

    // Step 1: Centroid
    var cx = 0;
    var cy = 0;
    for (var i = 0; i < points.length; i++) {
        cx += points[i].x;
        cy += points[i].y;
    }
    cx /= points.length;
    cy /= points.length;

    // Step 2 + 3: Compute angles, fill bucket set
    var buckets = {};
    for (var j = 0; j < points.length; j++) {
        var dx = points[j].x - cx;
        var dy = points[j].y - cy;

        // Skip points at centroid (zero-length vector)
        if (dx === 0 && dy === 0) continue;

        var angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
        // Normalize to 0–359
        var bucket = Math.floor(((angleDeg % 360) + 360) % 360);
        buckets[bucket] = true;
    }

    // Step 4: Count covered degrees
    var coveredDegrees = Object.keys(buckets).length;

    // Step 5: Check threshold
    return coveredDegrees >= CIRCLE_MIN_ARC_DEG;
}

// ============================================================
// Export
// ============================================================
var GestureRecognition = {
    classifySwipeDirection: classifySwipeDirection,
    isDirectionMatch:       isDirectionMatch,
    isCircleGesture:        isCircleGesture,
    // Exposed for testing / tuning override
    SWIPE_TOLERANCE_DEG:    SWIPE_TOLERANCE_DEG,
    CIRCLE_MIN_ARC_DEG:     CIRCLE_MIN_ARC_DEG,
    CIRCLE_MIN_POINTS:      CIRCLE_MIN_POINTS,
};

export default GestureRecognition;