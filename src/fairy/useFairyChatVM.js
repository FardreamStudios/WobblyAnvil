// ============================================================
// useFairyChatVM.js — Fairy Chat ViewModel
//
// Subscribes to fairy chat UI bus tags and exposes React state
// for layout components. No fairy logic — just state bridging.
//
// BUS → REACT:
//   UI_FAIRY_CHAT_OPEN        → fairyChatOpen = true
//   UI_FAIRY_CHAT_CLOSE       → all state resets
//   UI_FAIRY_CHAT_LISTENING   → fairyChatListening
//   UI_FAIRY_CHAT_WAITING     → fairyChatWaiting
//   UI_FAIRY_CHAT_TEXT_TOGGLE  → fairyChatTextOpen toggles
//
// USAGE:
//   var chatVM = useFairyChatVM(bus);
//   <MobileLayout {...chatVM} />
// ============================================================

import { useState, useEffect, useCallback } from "react";
import EVENT_TAGS  from "../config/eventTags.js";
import FAIRY_CONFIG from "./fairyConfig.js";

function useFairyChatVM(bus) {
    var [fairyChatOpen, setFairyChatOpen]         = useState(false);
    var [fairyChatTextOpen, setFairyChatTextOpen] = useState(false);
    var [fairyChatListening, setFairyChatListening] = useState(false);
    var [fairyChatWaiting, setFairyChatWaiting]   = useState(false);

    useEffect(function() {
        if (!bus) return;

        function onOpen()  { setFairyChatOpen(true); }
        function onClose() {
            setFairyChatOpen(false);
            setFairyChatTextOpen(false);
            setFairyChatListening(false);
            setFairyChatWaiting(false);
        }
        function onListening(payload) { setFairyChatListening(payload && payload.active); }
        function onWaiting(payload)   { setFairyChatWaiting(payload && payload.active); }
        function onTextToggle()       { setFairyChatTextOpen(function(prev) { return !prev; }); }

        bus.on(EVENT_TAGS.UI_FAIRY_CHAT_OPEN, onOpen);
        bus.on(EVENT_TAGS.UI_FAIRY_CHAT_CLOSE, onClose);
        bus.on(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, onListening);
        bus.on(EVENT_TAGS.UI_FAIRY_CHAT_WAITING, onWaiting);
        bus.on(EVENT_TAGS.UI_FAIRY_CHAT_TEXT_TOGGLE, onTextToggle);

        return function() {
            bus.off(EVENT_TAGS.UI_FAIRY_CHAT_OPEN, onOpen);
            bus.off(EVENT_TAGS.UI_FAIRY_CHAT_CLOSE, onClose);
            bus.off(EVENT_TAGS.UI_FAIRY_CHAT_LISTENING, onListening);
            bus.off(EVENT_TAGS.UI_FAIRY_CHAT_WAITING, onWaiting);
            bus.off(EVENT_TAGS.UI_FAIRY_CHAT_TEXT_TOGGLE, onTextToggle);
        };
    }, [bus]);

    // Thin bus emitter wrappers for layout props
    var onFairyChatTap = useCallback(function() {
        if (bus) bus.emit(EVENT_TAGS.FAIRY_CHAT_TAP);
    }, [bus]);

    var onFairyChatHoldStart = useCallback(function() {
        if (bus) bus.emit(EVENT_TAGS.FAIRY_CHAT_HOLD_START);
    }, [bus]);

    var onFairyChatHoldEnd = useCallback(function() {
        if (bus) bus.emit(EVENT_TAGS.FAIRY_CHAT_HOLD_END);
    }, [bus]);

    var onFairyChatSend = useCallback(function(text) {
        if (bus) bus.emit(EVENT_TAGS.FAIRY_CHAT_SEND, { text: text });
    }, [bus]);

    return {
        // State for layout
        chatEnabled:         FAIRY_CONFIG.chatEnabled,
        fairyChatOpen:       fairyChatOpen,
        fairyChatTextOpen:   fairyChatTextOpen,
        fairyChatListening:  fairyChatListening,
        fairyChatWaiting:    fairyChatWaiting,
        // Bus emitter wrappers for layout event handlers
        onFairyChatTap:      onFairyChatTap,
        onFairyChatHoldStart: onFairyChatHoldStart,
        onFairyChatHoldEnd:  onFairyChatHoldEnd,
        onFairyChatSend:     onFairyChatSend,
    };
}

export default useFairyChatVM;