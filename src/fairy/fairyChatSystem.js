// ============================================================
// fairyChatSystem.js — Fairy Chat System
//
// Pure JS singleton. Owns conversation state, speech-to-text,
// idle timeout, and API dispatch. No React. No DOM rendering.
//
// LIFECYCLE:
//   init(config)      — store callbacks + state provider
//   destroy()         — teardown
//   openChat()        — player pressed the chat button
//   closeChat()       — manual or idle-timeout dismiss
//   sendMessage(text) — send player text to LLM
//   startListening()  — begin speech recognition (hold)
//   stopListening()   — end speech recognition (release)
//
// CALLBACKS (injected via init):
//   onFairySpeak(line)       — fairy has a line to display
//   onChatOpen()             — UI should show chat state
//   onChatClose()            — UI should hide chat state
//   onListeningStart()       — mic is active
//   onListeningEnd(text)     — mic stopped, transcript ready
//   onWaiting()              — waiting for API response
//   stateProvider()          — fn() → game state snapshot
//
// COMMUNICATION:
//   Talks to FairyAPI for LLM calls.
//   Does NOT talk to pawn/controller — App.js bridges.
//
// PORTABLE: Pure JS. No React. Uses Web Speech API.
// ============================================================

import FAIRY_CONFIG     from "./fairyConfig.js";
import FairyAPI         from "./fairyAPI.js";
import FairyPersonality from "./fairyPersonality.js";

// ============================================================
// INTERNAL STATE
// ============================================================

var _initialized = false;
var _stateProvider = null;       // fn() → game state
var _onFairySpeak = null;        // fn(line) — display fairy speech
var _onChatOpen = null;          // fn() — UI open
var _onChatClose = null;         // fn() — UI close
var _onListeningStart = null;    // fn()
var _onListeningEnd = null;      // fn(transcript)
var _onWaiting = null;           // fn() — show loading state

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
        if (_onListeningEnd) _onListeningEnd(transcript);

        // Auto-send if we got something
        if (transcript.length > 0) {
            sendMessage(transcript);
        }
    };

    _recognition.onerror = function(event) {
        console.warn("[FairyChatSystem] Speech error:", event.error);
        _listening = false;
        if (_onListeningEnd) _onListeningEnd("");
    };

    _recognition.onend = function() {
        var wasListening = _listening;
        _listening = false;
        // Safety: ensure listening state clears even if onresult never fired (silence/abort)
        if (wasListening && _onListeningEnd) _onListeningEnd("");
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

    _stateProvider     = config.stateProvider     || function() { return {}; };
    _onFairySpeak      = config.onFairySpeak      || null;
    _onChatOpen        = config.onChatOpen        || null;
    _onChatClose       = config.onChatClose       || null;
    _onListeningStart  = config.onListeningStart  || null;
    _onListeningEnd    = config.onListeningEnd    || null;
    _onWaiting         = config.onWaiting         || null;

    _initSpeech();
    _initialized = true;
}

function destroy() {
    closeChat();
    if (_recognition) {
        try { _recognition.abort(); } catch (e) {}
        _recognition = null;
    }
    _stateProvider = null;
    _onFairySpeak = null;
    _onChatOpen = null;
    _onChatClose = null;
    _onListeningStart = null;
    _onListeningEnd = null;
    _onWaiting = null;
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
    if (_onChatOpen) _onChatOpen();

    // Fairy greeting
    var greeting = _pickGreeting();
    _history.push({ role: "fairy", text: greeting });
    if (_onFairySpeak) _onFairySpeak(greeting);

    _resetIdleTimer();
}

function closeChat() {
    if (!_chatOpen) return;

    _chatOpen = false;
    _clearIdleTimer();

    if (_listening) {
        stopListening();
    }

    if (_onChatClose) _onChatClose();
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
    if (_onWaiting) _onWaiting();

    // Get game state snapshot
    var gameState = _stateProvider ? _stateProvider() : {};

    // Call API
    FairyAPI.requestChat(text, _history, gameState).then(function(line) {
        if (!_chatOpen) return; // closed while waiting

        _history.push({ role: "fairy", text: line });
        _trimHistory();

        if (_onFairySpeak) _onFairySpeak(line);
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
    if (_onListeningStart) _onListeningStart();

    try {
        _recognition.start();
    } catch (e) {
        console.warn("[FairyChatSystem] Failed to start recognition:", e.message);
        _listening = false;
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
    if (_onListeningEnd) _onListeningEnd("");
    // onresult handler will fire sendMessage if transcript is non-empty
    // Reset idle timer in case no transcript comes back
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