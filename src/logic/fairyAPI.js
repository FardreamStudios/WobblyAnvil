// ============================================================
// fairyAPI.js — Wobbly Anvil Fairy LLM Client
//
// Fetch wrapper for Cloudflare Worker proxy.
// Sends game state + system prompt, gets a single fairy line.
// Falls back to gibberlese on any failure (timeout, network,
// bad response). Fallback is indistinguishable from normal
// fairy behavior — players already see gibberlese in rotation.
//
// DOES NOT hold API keys. The Cloudflare Worker owns those.
//
// PORTABLE: Pure JS. No React. Uses fetch API.
// ============================================================

import FAIRY_CONFIG     from "../config/fairyConfig.js";
import FairyPersonality from "../config/fairyPersonality.js";

// ============================================================
// GIBBERLESE FALLBACK
// ============================================================

function _pickGibberlese() {
    var pool = FairyPersonality.DIALOGUE.gibberlese;
    if (!pool || pool.length === 0) return "blergh.";
    return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================
// RESPONSE VALIDATION
// ============================================================

function _sanitize(text) {
    if (!text || typeof text !== "string") return null;

    // Strip any markdown, emojis, or formatting the model might sneak in
    var clean = text
        .replace(/[*_~`#>]/g, "")
        .replace(/\n/g, " ")
        .trim()
        .toLowerCase();

    if (clean.length === 0) return null;

    // Enforce word limit
    var words = clean.split(/\s+/);
    if (words.length > FAIRY_CONFIG.maxResponseWords) {
        clean = words.slice(0, FAIRY_CONFIG.maxResponseWords).join(" ");
    }

    return clean;
}

// ============================================================
// MOCK MODE — dev/testing, no network calls
// ============================================================

function _mockRequest() {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve(_pickGibberlese());
        }, FAIRY_CONFIG.mockDelayMs);
    });
}

// ============================================================
// LIVE MODE — call Cloudflare Worker
// ============================================================

function _liveRequest(systemPrompt, gameState) {
    var url = FAIRY_CONFIG.workerUrl;
    if (!url) {
        console.warn("[FairyAPI] No workerUrl configured. Falling back.");
        return Promise.resolve(_pickGibberlese());
    }

    // Build the request body — worker forwards to Anthropic API
    var body = JSON.stringify({
        system: systemPrompt,
        state:  gameState,
    });

    // Race fetch against timeout
    var controller = new AbortController();
    var timeoutId = setTimeout(function() {
        controller.abort();
    }, FAIRY_CONFIG.requestTimeoutMs);

    return fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    body,
        signal:  controller.signal,
    })
        .then(function(res) {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
        })
        .then(function(data) {
            // Expect { line: "fairy dialogue here" }
            var line = _sanitize(data && data.line);
            return line || _pickGibberlese();
        })
        .catch(function(err) {
            clearTimeout(timeoutId);
            console.warn("[FairyAPI] Request failed:", err.message);
            return _pickGibberlese();
        });
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Request a contextual fairy line from the LLM.
 * Always resolves — never rejects. Returns gibberlese on any failure.
 *
 * @param {Object} gameState — snapshot of current game state
 * @returns {Promise<string>} — fairy dialogue line
 */
function requestLine(gameState) {
    if (!FAIRY_CONFIG.enabled) {
        return Promise.resolve(_pickGibberlese());
    }

    if (FAIRY_CONFIG.mode === "mock") {
        return _mockRequest();
    }

    return _liveRequest(FairyPersonality.SYSTEM_PROMPT, gameState);
}

var FairyAPI = {
    requestLine: requestLine,
};

export default FairyAPI;