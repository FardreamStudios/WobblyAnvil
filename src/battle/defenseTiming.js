// ============================================================
// defenseTiming.js — Defense Timing Module (Pure JS)
//
// Tracks strike anchor timestamps and resolves player defensive
// input (brace/dodge) against timing windows. No React, no DOM,
// no rendering — pure timing math.
//
// BOUNDARY CONTRACT:
//   init(config)                  — pass DEFENSE_TIMING constants
//   recordStrikeAnchor()          — call when strike class applied
//   checkInput(inputType, ts?)    — returns { tier, mult } or null
//   resetBeat()                   — clear state for next beat
//   isLocked()                    — true if input is gated
//   destroy()                     — teardown
//
// INPUT RULES:
//   - One input per beat. After tap/swipe registers OR the
//     defense window closes, input is locked.
//   - Input cooldown lasts until resetBeat() is called
//     (i.e. next beat's telegraph begins). No mashing.
//
// TIMING:
//   All windows are ±ms centered on the strike anchor.
//   Brace (tap):  perfect ±bracePerfectMs, good ±braceGoodMs
//   Dodge (swipe): pass ±dodgePassMs
//   Outside all windows = fail (full damage).
//
// UE ANALOGY: Pure function library — no actor, no component.
//   Called by the battle controller during defense phases.
// ============================================================

var _config = null;
var _strikeAnchor = null;   // performance.now() timestamp
var _locked = false;        // true after input consumed or window closed
var _beatActive = false;    // true between recordStrikeAnchor and resetBeat

// ============================================================
// init — Pass DEFENSE_TIMING constants from battleConstants
// ============================================================
function init(config) {
    _config = config;
    _strikeAnchor = null;
    _locked = false;
    _beatActive = false;
}

// ============================================================
// recordStrikeAnchor — Call at the exact moment the enemy's
// strike lunge snaps forward (strike class applied).
// ============================================================
function recordStrikeAnchor(timestamp) {
    _strikeAnchor = timestamp || performance.now();
    _locked = false;
    _beatActive = true;
}

// ============================================================
// checkInput — Resolve a player defensive input against the
// current strike anchor.
//
// inputType: "tap" (brace) or "swipe" (dodge)
// timestamp: optional, defaults to performance.now()
//
// Returns:
//   { tier: "perfect"|"good"|"pass"|"fail", mult: number }
//   or null if input is locked (cooldown active / no anchor)
// ============================================================
function checkInput(inputType, timestamp) {
    if (!_config) return null;
    if (_locked) return null;
    if (!_beatActive) return null;
    if (_strikeAnchor === null) return null;

    var ts = timestamp || performance.now();
    var delta = Math.abs(ts - _strikeAnchor);

    // Lock input — one per beat
    _locked = true;

    if (inputType === "tap") {
        // --- BRACE ---
        if (delta <= _config.bracePerfectMs) {
            return { tier: "perfect", mult: _config.bracePerfectMult };
        }
        if (delta <= _config.braceGoodMs) {
            return { tier: "good", mult: _config.braceGoodMult };
        }
        // Outside brace window = fail
        return { tier: "fail", mult: _config.failMult };

    } else if (inputType === "swipe") {
        // --- DODGE ---
        if (delta <= _config.dodgePassMs) {
            return { tier: "pass", mult: _config.dodgePassMult };
        }
        // Outside dodge window = fail
        return { tier: "fail", mult: _config.failMult };
    }

    // Unknown input type
    return { tier: "fail", mult: _config.failMult };
}

// ============================================================
// checkNoInput — Call when the defense window expires with no
// player input. Returns fail result and locks the beat.
// ============================================================
function checkNoInput() {
    if (!_config) return null;
    if (_locked) return null;

    _locked = true;
    return { tier: "fail", mult: _config.failMult };
}

// ============================================================
// resetBeat — Clear state for the next beat. Call when the
// next beat's telegraph begins (unlocks input).
// ============================================================
function resetBeat() {
    _strikeAnchor = null;
    _locked = false;
    _beatActive = false;
}

// ============================================================
// isLocked — True if input is currently gated (already
// consumed this beat, or no active beat).
// ============================================================
function isLocked() {
    return _locked || !_beatActive;
}

// ============================================================
// getTimeSinceAnchor — Returns ms since last strike anchor,
// or null if no anchor recorded. Useful for debug overlay.
// ============================================================
function getTimeSinceAnchor() {
    if (_strikeAnchor === null) return null;
    return performance.now() - _strikeAnchor;
}

// ============================================================
// destroy — Full teardown
// ============================================================
function destroy() {
    _config = null;
    _strikeAnchor = null;
    _locked = false;
    _beatActive = false;
}

// ============================================================
// Export — singleton with init/destroy pattern (*SubSystem naming)
// ============================================================
var DefenseTiming = {
    init:                init,
    recordStrikeAnchor:  recordStrikeAnchor,
    checkInput:          checkInput,
    checkNoInput:        checkNoInput,
    resetBeat:           resetBeat,
    isLocked:            isLocked,
    getTimeSinceAnchor:  getTimeSinceAnchor,
    destroy:             destroy,
};

export default DefenseTiming;