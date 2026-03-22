// ============================================================
// gameplayEventBus.js — Wobbly Anvil Gameplay Event Bus
// Singleton pub/sub. Pure JS — no React, no dependencies.
//
// API:
//   on(tag, handler)   — subscribe to a tag
//   off(tag, handler)  — unsubscribe from a tag
//   emit(tag, payload) — synchronous broadcast to all listeners
//   reset()            — clear all subscriptions (new game / game over)
//
// Tag format: event.<system>.<verb>.<target>
// See eventTags.js for the full vocabulary.
//
// PORTABLE: Drop into any JS project. Zero coupling.
// ============================================================

var listeners = {};

function on(tag, handler) {
    if (!listeners[tag]) listeners[tag] = [];
    listeners[tag].push(handler);
}

function off(tag, handler) {
    if (!listeners[tag]) return;
    listeners[tag] = listeners[tag].filter(function(h) {
        return h !== handler;
    });
}

function emit(tag, payload) {
    var list = listeners[tag];
    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
        list[i](payload);
    }
}

function reset() {
    listeners = {};
}

var GameplayEventBus = {
    on: on,
    off: off,
    emit: emit,
    reset: reset,
};

export default GameplayEventBus;