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
import EVENT_TAGS       from "../config/eventTags.js";

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
        if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, { active: false });

        // Auto-send if we got something
        if (transcript.length > 0) {
            sendMessage(transcript);
        }
    };

    _recognition.onerror = function(event) {
        console.warn("[FairyChatSystem] Speech error:", event.error);
        _listening = false;
        if (_bus) _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, { active: false });
    };

    _recognition.onend = function() {
        var wasListening = _listening;
        _listening = false;
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

    // Call API — send history WITHOUT the message we just pushed,
    // because fairyAPI also sends body.message separately.
    // Without this, the player's message appears twice.
    var historyForApi = _history.slice(0, _history.length - 1);

    // Call API
    FairyAPI.requestChat(text, historyForApi, gameState).then(function(line) {
        if (!_chatOpen) return; // closed while waiting

        _history.push({ role: "fairy", text: line });
        _trimHistory();

        if (_bus) {
            _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_WAITING, { active: false });
            _bus.emit(EVENT_TAGS.UI_FAIRY_CHAT_SPEAK, { line: line });
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
        _recognition.start();
    } catch (e) {
        console.warn("[FairyChatSystem] Failed to start recognition:", e.message);
        _listening = false;
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

    // History
    getHistory:   getHistory,
    clearHistory: clearHistory,
};

export default FairyChatSystem;