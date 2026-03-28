// ============================================================
// fairyAPI.js — Wobbly Anvil Fairy LLM Client
//
// Two modes:
//   requestLine(gameState)  — single reactive line (existing)
//   requestChat(message, history, gameState) — conversational
//
// Fetch wrapper for Cloudflare Worker proxy.
// Falls back to gibberlese on any failure.
//
// DOES NOT hold API keys. The Cloudflare Worker owns those.
//
// PORTABLE: Pure JS. No React. Uses fetch API.
// ============================================================

import FAIRY_CONFIG     from "./fairyConfig.js";
import FairyPersonality from "./fairyPersonality.js";

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

    var clean = text
        .replace(/[*_~`#>]/g, "")
        .replace(/\n/g, " ")
        .trim()
        .toLowerCase();

    if (clean.length === 0) return null;

    var words = clean.split(/\s+/);
    if (words.length > FAIRY_CONFIG.maxResponseWords) {
        clean = words.slice(0, FAIRY_CONFIG.maxResponseWords).join(" ");
    }

    return clean;
}

// ============================================================
// MOCK MODE
// ============================================================

function _mockRequest() {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve(_pickGibberlese());
        }, FAIRY_CONFIG.mockDelayMs);
    });
}

function _mockChat(message) {
    // In mock mode, return a sassy mock response
    var mockResponses = [
        "yeah yeah, i heard you.",
        "that's a bold question for someone who uses copper.",
        "i'm thinking... no. next question.",
        "you want my advice? stop talking.",
        "florpna gleek shunta.",
        "interesting. wrong, but interesting.",
        "ask me something i care about.",
        "i was napping. what do you want.",
    ];
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve(mockResponses[Math.floor(Math.random() * mockResponses.length)]);
        }, FAIRY_CONFIG.mockDelayMs);
    });
}

// ============================================================
// LIVE MODE — single reactive line (existing)
// ============================================================

function _liveRequest(systemPrompt, gameState) {
    var url = FAIRY_CONFIG.workerUrl;
    if (!url) {
        console.warn("[FairyAPI] No workerUrl configured. Falling back.");
        return Promise.resolve(_pickGibberlese());
    }

    var body = JSON.stringify({
        type:   "reactive",
        system: systemPrompt,
        state:  gameState,
    });

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
// LIVE MODE — conversational chat
// ============================================================

function _liveChatRequest(message, history, gameState) {
    var url = FAIRY_CONFIG.workerUrl;
    if (!url) {
        console.warn("[FairyAPI] No workerUrl configured. Falling back.");
        return Promise.resolve(_pickGibberlese());
    }

    // Build conversation messages for the API
    // history = [ { role: "user", text: "..." }, { role: "fairy", text: "..." }, ... ]
    var recentHistory = history.slice(-FAIRY_CONFIG.chatSendHistory * 2);

    var body = JSON.stringify({
        type:    "chat",
        system:  FairyPersonality.SYSTEM_PROMPT,
        state:   gameState,
        history: recentHistory,
        message: message,
        model:   FAIRY_CONFIG.chatModel,
    });

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
            var line = _sanitize(data && data.line);
            return line || _pickGibberlese();
        })
        .catch(function(err) {
            clearTimeout(timeoutId);
            console.warn("[FairyAPI] Chat request failed:", err.message);
            return _pickGibberlese();
        });
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Request a contextual fairy line (reactive triggers).
 * Always resolves — never rejects.
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

/**
 * Request a conversational fairy response.
 * @param {string} message   — player's message
 * @param {Array}  history   — recent conversation [ { role, text }, ... ]
 * @param {Object} gameState — current game state snapshot
 * @returns {Promise<string>} — fairy dialogue line
 */
function requestChat(message, history, gameState) {
    if (!FAIRY_CONFIG.enabled || !FAIRY_CONFIG.chatEnabled) {
        return Promise.resolve(_pickGibberlese());
    }
    if (FAIRY_CONFIG.mode === "mock") {
        return _mockChat(message);
    }
    return _liveChatRequest(message, history, gameState);
}

var FairyAPI = {
    requestLine:  requestLine,
    requestChat:  requestChat,
};

export default FairyAPI;