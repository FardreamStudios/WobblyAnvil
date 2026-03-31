// ============================================================
// adventureGate.js — Adventure Mode Access Codes
//
// Array of access keys. Each has a code string and a label
// so you know who has which code. Add/remove entries to
// control access. Session-only unlock — no persistence.
// ============================================================

var ADVENTURE_KEYS = [
    { code: "campbelladventure2026", label: "Campbell" },
];

/**
 * Check if an entered code matches any active key.
 * Returns the matching key object, or null.
 */
function validateCode(input) {
    var trimmed = (input || "").trim().toLowerCase();
    for (var i = 0; i < ADVENTURE_KEYS.length; i++) {
        if (ADVENTURE_KEYS[i].code.toLowerCase() === trimmed) {
            return ADVENTURE_KEYS[i];
        }
    }
    return null;
}

var AdventureGate = {
    ADVENTURE_KEYS: ADVENTURE_KEYS,
    validateCode: validateCode,
};

export default AdventureGate;