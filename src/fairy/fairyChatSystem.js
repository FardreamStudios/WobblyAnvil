// ============================================================
// fairyChatSystem.js — Fairy Chat System
//
// Pure JS singleton. Owns conversation state, speech-to-text,
// idle timeout, and API dispatch. No React. No DOM rendering.
//
// LIFECYCLE:
//   init(config)      — store bus + state provider
//   destroy()         — teardown
//   openChat()        — chat session started
//   closeChat()       — manual or idle-timeout dismiss
//   sendMessage(text) — send player text to LLM
//   startListening()  — begin speech recognition (hold)
//   stopListening()   — end speech recognition (release)
//
// COMMUNICATION:
//   Emits UI bus tags for state changes:
//     UI_FAIRY_CHAT_OPEN      — chat session started
//     UI_FAIRY_CHAT_CLOSE     — chat session ended
//     UI_FAIRY_CHAT_SPEAK     — fairy has a line { line }
//     UI_FAIRY_CHAT_LISTENING — mic state { active }
//     UI_FAIRY_CHAT_WAITING   — waiting for API { active }
//   Talks to FairyAPI for LLM calls.
//   Controller owns fairy presentation — subscribes to SPEAK.
//
// PORTABLE: Pure JS. No React. Uses Web Speech API.
// ============================================================

import FAIRY_CONFIG     from "./fairyConfig.js";
import FairyAPI         from "./fairyAPI.js";
import FairyPersonality from "./fairyPersonality.js";
import FairyPositions   from "./fairyPositions.js";
import EVENT_TAGS       from "../config/eventTags.js";
import MobileInfra      from "../hooks/useMobileInfra.js";

// ============================================================
// INTERNAL STATE
// ============================================================

var _initialized = false;
var _bus = null;                 // GameplayEventBus ref
var _stateProvider = null;       // fn() → game state

// --- Conversation ---
var _history = [];               // [ { role: "user"|"fairy", text: "..." }, ... ]
var _chatOpen = false;
var _lastApiCallMs = 0;

// --- Idle Timeout ---
var _idleTimer = null;

// --- Speech Recognition ---
var _recognition = null;
var _listening = false;
var _speechSupported = false;

// ============================================================
// SPEECH RECOGNITION SETUP
// ============================================================

function _initSpeech() {
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        _speechSupported = false;
        console.log("[FairyChatSystem] Speech recognition not supported.");
        return;
    }

    _speechSupported = true;
    _recognition = new SpeechRecognition();
    _recognition.continuous = false;
    _recognition.interimResults = false;
    _recognition.lang = "en-US";
    _recognition.maxAlternatives = 1;

    _recognition.onresult = function(event) {
        var transcript = "";
        for (var i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        transcript = transcript.trim();
        _listening = false;
        MobileInfra.clearPermissionPending();
        if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, { active: false });

        // Auto-send if we got something
        if (transcript.length > 0) {
            sendMessage(transcript);
        }
    };

    _recognition.onerror = function(event) {
        console.warn("[FairyChatSystem] Speech error:", event.error);
        _listening = false;
        MobileInfra.clearPermissionPending();
        if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, { active: false });
    };

    _recognition.onend = function() {
        var wasListening = _listening;
        _listening = false;
        MobileInfra.clearPermissionPending();
        if (wasListening && _bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, { active: false });
    };
}

// ============================================================
// IDLE TIMEOUT
// ============================================================

function _resetIdleTimer() {
    if (_idleTimer) {
        clearTimeout(_idleTimer);
        _idleTimer = null;
    }

    if (!_chatOpen) return;

    _idleTimer = setTimeout(function() {
        _idleTimer = null;
        closeChat();
    }, FAIRY_CONFIG.chatIdleTimeoutMs);
}

function _clearIdleTimer() {
    if (_idleTimer) {
        clearTimeout(_idleTimer);
        _idleTimer = null;
    }
}

// ============================================================
// BUBBLE SPLITTING
// Splits long responses at sentence boundaries into chunks
// that fit comfortably in the speech bubble. Each chunk is
// emitted as a separate UI_FAIRY_CHAT_SPEAK with a stagger.
// ============================================================

var _splitTimers = [];

function _clearSplitTimers() {
    for (var i = 0; i < _splitTimers.length; i++) {
        clearTimeout(_splitTimers[i]);
    }
    _splitTimers = [];
}

/**
 * Split a line into bubble-sized chunks.
 * Tries sentence boundaries first (. ? !), falls back to word count.
 */
function _splitIntoBubbles(line) {
    var threshold = FAIRY_CONFIG.chatBubbleSplitWords || 12;
    var words = line.split(/\s+/);
    if (words.length <= threshold) return [line];

    // Split at sentence boundaries
    var sentences = line.split(/(?<=[.!?])\s+/);
    var chunks = [];
    var current = "";

    for (var i = 0; i < sentences.length; i++) {
        var candidate = current.length > 0 ? current + " " + sentences[i] : sentences[i];
        var candidateWords = candidate.split(/\s+/).length;

        if (candidateWords > threshold && current.length > 0) {
            // Current chunk is full — push it and start new
            chunks.push(current.trim());
            current = sentences[i];
        } else {
            current = candidate;
        }
    }
    if (current.trim().length > 0) {
        chunks.push(current.trim());
    }

    // Safety: if any chunk is still too long (no sentence breaks),
    // hard-split at word count
    var final = [];
    for (var c = 0; c < chunks.length; c++) {
        var cWords = chunks[c].split(/\s+/);
        if (cWords.length <= threshold + 4) {
            final.push(chunks[c]);
        } else {
            // Hard split
            for (var w = 0; w < cWords.length; w += threshold) {
                final.push(cWords.slice(w, w + threshold).join(" "));
            }
        }
    }

    return final.length > 0 ? final : [line];
}

// ============================================================
// ACTION PARSING
// Scans LLM response for [MOVE:spotId] tags.
// Strips action from display text. Returns parsed action.
// ============================================================

var _ACTION_RE = /\[MOVE:([a-z_]+)\]/i;
var _GIVE_RE = /\[GIVE:gold\]/i;

/**
 * Fuzzy-match an LLM spot id against the registry.
 * LLMs drop underscores (e.g. "farleft" instead of "far_left").
 * Strips underscores from both sides before comparing.
 * Returns the canonical registry id, or null if no match.
 */
function _fuzzyMatchSpot(rawSpot) {
    var validSpots = FairyPositions.listSpots("forge");
    var stripped = rawSpot.replace(/_/g, "");

    // Exact match first (fast path)
    for (var i = 0; i < validSpots.length; i++) {
        if (validSpots[i] === rawSpot) return validSpots[i];
    }

    // Fuzzy match — compare without underscores
    for (var j = 0; j < validSpots.length; j++) {
        if (validSpots[j].replace(/_/g, "") === stripped) {
            console.log("[FairyChatSystem] Fuzzy-matched spot:", rawSpot, "→", validSpots[j]);
            return validSpots[j];
        }
    }

    return null;
}

/**
 * Parse and strip action tags from an LLM response.
 * Supports [MOVE:spot_id] and [GIVE:gold]. Both can appear in same response.
 * @param {string} line — raw LLM response
 * @returns {{ text: string, action: Object|null, gift: Object|null }}
 */
function _parseActions(line) {
    var action = null;
    var gift = null;
    var cleanText = line;

    // Parse MOVE
    var moveMatch = _ACTION_RE.exec(cleanText);
    if (moveMatch) {
        cleanText = cleanText.replace(moveMatch[0], "").trim();
        var spotId = _fuzzyMatchSpot(moveMatch[1].toLowerCase());
        if (spotId) {
            action = { type: "move", spot: spotId };
        } else {
            console.warn("[FairyChatSystem] LLM requested invalid spot:", moveMatch[1]);
        }
    }

    // Parse GIVE
    var giveMatch = _GIVE_RE.exec(cleanText);
    if (giveMatch) {
        cleanText = cleanText.replace(giveMatch[0], "").trim();
        gift = { type: "gold", amount: 50 };
    }

    return {
        text: cleanText,
        action: action,
        gift: gift,
    };
}

// ============================================================
// GREETING
// ============================================================

function _pickGreeting() {
    var pool = FairyPersonality.DIALOGUE.idle;
    if (!pool || pool.length === 0) return "what do you want.";
    return pool[Math.floor(Math.random() * pool.length)];
}

// ============================================================
// LIFECYCLE
// ============================================================

function init(config) {
    if (_initialized) {
        console.warn("[FairyChatSystem] Already initialized.");
        return;
    }

    _bus           = config.bus            || null;
    _stateProvider = config.stateProvider   || function() { return {}; };

    _initSpeech();
    _initialized = true;
}

function destroy() {
    closeChat();
    if (_recognition) {
        try { _recognition.abort(); } catch (e) {}
        _recognition = null;
    }
    _bus = null;
    _stateProvider = null;
    _history = [];
    _initialized = false;
    _speechSupported = false;
}

// ============================================================
// CHAT OPEN / CLOSE
// ============================================================

function openChat() {
    if (!_initialized || !FAIRY_CONFIG.chatEnabled) return;
    if (_chatOpen) return;

    _chatOpen = true;
    if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_OPEN);

    // Fairy greeting
    var greeting = _pickGreeting();
    _history.push({ role: "fairy", text: greeting });
    if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_SPEAK, { line: greeting });

    _resetIdleTimer();
}

function closeChat() {
    if (!_chatOpen) return;

    _chatOpen = false;
    _clearIdleTimer();
    _clearSplitTimers();

    if (_listening) {
        stopListening();
    }

    if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_CLOSE);
    // History is NOT cleared — persists for the session
}

function isOpen() {
    return _chatOpen;
}

// ============================================================
// SEND MESSAGE
// ============================================================

function sendMessage(text) {
    if (!_initialized || !_chatOpen) return;
    if (!text || text.trim().length === 0) return;

    text = text.trim();

    // Debounce
    var now = Date.now();
    if (now - _lastApiCallMs < FAIRY_CONFIG.chatDebounceMs) {
        console.log("[FairyChatSystem] Debounced. Try again in a moment.");
        return;
    }
    _lastApiCallMs = now;

    // Pause idle timer while waiting for response
    _clearIdleTimer();

    // Add to history
    _history.push({ role: "user", text: text });
    _trimHistory();

    // Show waiting state
    if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_WAITING, { active: true });

    // Get game state snapshot
    var gameState = _stateProvider ? _stateProvider() : {};

    // Inject random obsession nudge — keeps personality front-of-mind per turn
    var nudges = FairyPersonality.OBSESSION_NUDGES;
    if (nudges && nudges.length > 0) {
        gameState.obsessionNudge = nudges[Math.floor(Math.random() * nudges.length)];
    }

    // Call API — send history WITHOUT the message we just pushed,
    // because fairyAPI also sends body.message separately.
    // Without this, the player's message appears twice.
    var historyForApi = _history.slice(0, _history.length - 1);

    // Call API
    FairyAPI.requestChat(text, historyForApi, gameState).then(function(line) {
        if (!_chatOpen) return; // closed while waiting

        // Parse action tags before storing/displaying
        var parsed = _parseActions(line);
        var displayText = parsed.text;
        var action = parsed.action;
        var gift = parsed.gift;

        // Store the clean text (no action tags) in history
        _history.push({ role: "fairy", text: displayText });
        _trimHistory();

        if (_bus) {
            _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_WAITING, { active: false });

            // Split long responses into multiple bubbles
            var bubbles = _splitIntoBubbles(displayText);
            _clearSplitTimers();

            // Emit first bubble immediately — attach action to first bubble only
            var hasMore = bubbles.length > 1;
            _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_SPEAK, { line: bubbles[0], action: action || null, gift: gift || null, hasMore: hasMore });

            // Stagger remaining bubbles (no action on subsequent bubbles)
            var delay = FAIRY_CONFIG.chatBubbleDelayMs || 2800;
            for (var b = 1; b < bubbles.length; b++) {
                (function(idx, isLast) {
                    var t = setTimeout(function() {
                        if (!_chatOpen) return;
                        if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_SPEAK, { line: bubbles[idx], hasMore: !isLast });
                    }, delay * idx);
                    _splitTimers.push(t);
                })(b, b === bubbles.length - 1);
            }
        }
        _resetIdleTimer();
    });
}

// ============================================================
// SPEECH RECOGNITION
// ============================================================

function startListening() {
    if (!_initialized || !_chatOpen || !_speechSupported) return;
    if (_listening) return;

    // Pause idle timer while mic is active
    _clearIdleTimer();

    _listening = true;
    if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, { active: true });

    try {
        // Signal fullscreen recovery to pause — mic permission dialog exits fullscreen
        MobileInfra.permissionPending.current = true;
        _recognition.start();
    } catch (e) {
        console.warn("[FairyChatSystem] Failed to start recognition:", e.message);
        _listening = false;
        MobileInfra.clearPermissionPending();
        if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, { active: false });
        _resetIdleTimer();
    }
}

function stopListening() {
    if (!_listening || !_recognition) return;

    try {
        _recognition.stop();
    } catch (e) {
        console.warn("[FairyChatSystem] Failed to stop recognition:", e.message);
    }
    _listening = false;
    if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, { active: false });
    _resetIdleTimer();
}

function isListening() {
    return _listening;
}

function isSpeechSupported() {
    return _speechSupported;
}

/**
 * Permanently disable speech for this session.
 * Called when player skips or denies mic permission at startup.
 */
function disableSpeech() {
    _speechSupported = false;
    if (_recognition) {
        try { _recognition.abort(); } catch (e) {}
        _recognition = null;
    }
    _listening = false;
}

// ============================================================
// HISTORY MANAGEMENT
// ============================================================

function _trimHistory() {
    var max = FAIRY_CONFIG.chatMaxHistory * 2; // each exchange = 2 entries
    if (_history.length > max) {
        _history = _history.slice(_history.length - max);
    }
}

function getHistory() {
    return _history.slice();
}

function clearHistory() {
    _history = [];
}

// ============================================================
// PUBLIC API
// ============================================================

var FairyChatSystem = {
    // Lifecycle
    init:    init,
    destroy: destroy,

    // Chat control
    openChat:    openChat,
    closeChat:   closeChat,
    isOpen:      isOpen,
    sendMessage: sendMessage,

    // Speech
    startListening:   startListening,
    stopListening:    stopListening,
    isListening:      isListening,
    isSpeechSupported: isSpeechSupported,
    disableSpeech:    disableSpeech,

    // History
    getHistory:   getHistory,
    clearHistory: clearHistory,
};

export default FairyChatSystem;