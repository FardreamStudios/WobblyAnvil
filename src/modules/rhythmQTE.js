// ============================================================
// rhythmQTE.js — Wobbly Anvil Rhythm QTE Module
// Self-contained rhythm minigame with scrolling notes,
// hit detection, hold notes, scoring, and visual rendering.
// ============================================================

import { useState, useEffect, useRef } from "react";
import GameMusicData from "./musicData.js";

var RHYTHM_HIT_X = GameMusicData.RHYTHM_HIT_X;
var RHYTHM_HIT_WINDOW = GameMusicData.RHYTHM_HIT_WINDOW;
var RHYTHM_PERFECT_WINDOW = GameMusicData.RHYTHM_PERFECT_WINDOW;
var RHYTHM_SCROLL_PX_PER_MS = GameMusicData.RHYTHM_SCROLL_PX_PER_MS;
var RHYTHM_TRACK_W = GameMusicData.RHYTHM_TRACK_W;
var RHYTHM_DURATION = GameMusicData.RHYTHM_DURATION;
var generateRhythmNotes = GameMusicData.generateRhythmNotes;
var getDynamicVolume = GameMusicData.getDynamicVolume;

// --- RhythmQTE Component ---

function RhythmQTE({ onClose, sfx }) {
    var HITX = RHYTHM_HIT_X;
    var [speed, setSpeed] = useState(1.0);
    var [oneButton, setOneButton] = useState(false);
    var [phase, setPhase] = useState("countdown");
    var [countdown, setCountdown] = useState(3);
    var [notes, setNotes] = useState(function() { return generateRhythmNotes(); });
    var [displayScore, setDisplayScore] = useState(50);
    var [displayCombo, setDisplayCombo] = useState(0);
    var [displayTime, setDisplayTime] = useState(Math.ceil(RHYTHM_DURATION / 1000));
    var [holding, setHolding] = useState(null);
    var [lastMiss, setLastMiss] = useState(null);
    var [floats, setFloats] = useState([]);
    var [elapsed, setElapsed] = useState(0);
    var [rafStarted, setRafStarted] = useState(false);

    var startRef = useRef(null);
    var rafRef = useRef(null);
    var scoreRef = useRef(50);
    var comboRef = useRef(0);
    var elapsedRef = useRef(0);
    var holdingRef = useRef(null);
    var holdActiveRef = useRef(false);
    var lastDisplayedSecRef = useRef(-1);
    var lastMissTimer = useRef(null);
    var matchedRef = useRef(false);
    var deadNotesRef = useRef({});
    var lastPressMsRef = useRef(0);
    var lastReleaseMsRef = useRef(0);
    var scrollSpeed = RHYTHM_SCROLL_PX_PER_MS * speed;

    var buttons = oneButton
        ? [["\u2692\uFE0F", "hammer", "#60a5fa"]]
        : [["\uD83D\uDD28", "hammer", "#60a5fa"], ["\uD83D\uDD25", "bellows", "#f97316"]];

    function getLiveElapsed() { if (!startRef.current) return 0; return performance.now() - startRef.current; }
    function noteX(n, el) { return HITX + (n.spawnMs - el) * scrollSpeed; }
    function holdEndX(n, el) { return HITX + ((n.spawnMs + n.holdMs) - el) * scrollSpeed; }
    function addFloat(text, color) {
        var id = Date.now() + Math.random();
        setFloats(function(f) { return f.concat([{ id: id, text: text, color: color, born: Date.now() }]); });
        setTimeout(function() { setFloats(function(f) { return f.filter(function(x) { return x.id !== id; }); }); }, 500);
    }

    function adjustScore(delta) {
        scoreRef.current = Math.max(0, scoreRef.current + delta);
        setDisplayScore(scoreRef.current);
        if (delta > 0) { comboRef.current++; } else { comboRef.current = 0; }
        setDisplayCombo(comboRef.current);
    }

    function markMiss(label) { setLastMiss(label); }
    function markWrong(label) { setLastMiss(label); }

    function playHitTone(dur, vol, note) {
        var resolvedVol = vol;
        if (note && note.dynamic) {
            var baseVol = getDynamicVolume(note.dynamic);
            if (note.dynamicEnd) {
                var endVol = getDynamicVolume(note.dynamicEnd);
                var noteDurMs = note.holdMs > 0 ? note.holdMs : dur * 1000;
                var noteElapsed = getLiveElapsed() - note.spawnMs;
                var t = noteDurMs > 0 ? Math.max(0, Math.min(1, noteElapsed / noteDurMs)) : 0;
                resolvedVol = baseVol + (endVol - baseVol) * t;
            } else {
                resolvedVol = baseVol;
            }
        }
        var freq = sfx.getCurrentRootFreq(getLiveElapsed(), speed);
        if (freq && freq > 0) { sfx.tone(freq, "sine", dur, resolvedVol); }
        else { sfx.tone(440, "sine", dur, resolvedVol * 0.5); }
    }

    function fullReset() {
        cancelAnimationFrame(rafRef.current);
        if (sfx) sfx.stopQteMusic();
        scoreRef.current = 50; comboRef.current = 0; elapsedRef.current = 0;
        holdingRef.current = null; holdActiveRef.current = false; lastDisplayedSecRef.current = -1; startRef.current = null;
        matchedRef.current = false; deadNotesRef.current = {};
        setPhase("countdown"); setCountdown(3); setNotes(generateRhythmNotes(speed));
        setDisplayScore(50); setDisplayCombo(0); setDisplayTime(Math.ceil(RHYTHM_DURATION / 1000));
        setHolding(null); setLastMiss(null); setFloats([]); setElapsed(0); setRafStarted(false);
    }

    // Miss flash timer
    useEffect(function() {
        if (!lastMiss) return;
        clearTimeout(lastMissTimer.current);
        lastMissTimer.current = setTimeout(function() { setLastMiss(null); }, 600);
        return function() { clearTimeout(lastMissTimer.current); };
    }, [lastMiss]);

    // Music playback sync
    useEffect(function() {
        if (phase === "playing" && sfx) { sfx.setMode("qte"); sfx.playTrack(speed); }
        return function() { if (sfx) sfx.stopQteMusic(); };
    }, [phase]);

    // Cleanup on unmount
    useEffect(function() {
        return function() { if (sfx) { sfx.stopQteMusic(); sfx.setMode("idle"); } };
    }, []);

    // Countdown
    useEffect(function() {
        if (phase !== "countdown") return;
        if (countdown <= 0) { setPhase("playing"); return; }
        var timer = setTimeout(function() { setCountdown(function(c) { return c - 1; }); }, 1000);
        return function() { clearTimeout(timer); };
    }, [phase, countdown]);

    // Main game loop
    useEffect(function() {
        if (phase !== "playing") return;
        var travelMs = (RHYTHM_TRACK_W - HITX) / scrollSpeed;
        var startTime = performance.now() + travelMs;
        startRef.current = startTime;

        function loop() {
            var el = performance.now() - startTime;
            elapsedRef.current = el;
            setElapsed(el);
            setRafStarted(true);
            if (el >= RHYTHM_DURATION) { setPhase("done"); return; }

            var sec = Math.max(0, Math.ceil((RHYTHM_DURATION - el) / 1000));
            if (sec !== lastDisplayedSecRef.current) { lastDisplayedSecRef.current = sec; setDisplayTime(sec); }

            var anyChanged = false;
            setNotes(function(prev) {
                var next = prev.map(function(n) {
                    if (n.hit || n.missed) return n;
                    if (deadNotesRef.current[n.id]) return Object.assign({}, n, { missed: true });

                    var blocked = false;
                    for (var j = 0; j < prev.indexOf(n); j++) {
                        var earlier = prev[j];
                        if (earlier.type === n.type && !earlier.hit && !earlier.missed) { blocked = true; break; }
                    }
                    if (blocked) return n;

                    var nx = noteX(n, el);
                    if (n.holdMs > 0) {
                        if (!n.headHit && nx < HITX - RHYTHM_HIT_WINDOW) {
                            if (holdingRef.current === n.id) { setHolding(null); holdingRef.current = null; holdActiveRef.current = false; }
                            anyChanged = true; adjustScore(-8); markMiss("MISS"); deadNotesRef.current[n.id] = true;
                            return Object.assign({}, n, { missed: true });
                        }
                        var ex = holdEndX(n, el);
                        if (ex < HITX - RHYTHM_HIT_WINDOW) {
                            if (holdingRef.current === n.id) { setHolding(null); holdingRef.current = null; holdActiveRef.current = false; }
                            anyChanged = true; adjustScore(-8); markMiss("MISS"); deadNotesRef.current[n.id] = true;
                            return Object.assign({}, n, { missed: true });
                        }
                    } else {
                        if (nx < HITX - RHYTHM_HIT_WINDOW) {
                            anyChanged = true; adjustScore(-8); markMiss("MISS"); deadNotesRef.current[n.id] = true;
                            return Object.assign({}, n, { missed: true });
                        }
                    }
                    return n;
                });
                return anyChanged ? next : prev;
            });
            rafRef.current = requestAnimationFrame(loop);
        }
        rafRef.current = requestAnimationFrame(loop);
        return function() { cancelAnimationFrame(rafRef.current); };
    }, [phase]);

    // Button press handler
    function pressBtn(type) {
        if (phase !== "playing") return;
        var now = performance.now();
        if (now - lastPressMsRef.current < 50) return;
        lastPressMsRef.current = now;
        var el = getLiveElapsed();
        matchedRef.current = false;

        setNotes(function(prev) {
            var next = prev.slice();
            for (var i = 0; i < next.length; i++) {
                var n = next[i];
                if (n.hit || n.missed || (!oneButton && n.type !== type)) continue;
                if (deadNotesRef.current[n.id]) continue;

                var blocked = false;
                for (var j = 0; j < i; j++) {
                    var pn = next[j];
                    if (pn.type === n.type && !pn.hit && !pn.missed && !deadNotesRef.current[pn.id]) { blocked = true; break; }
                }
                if (blocked) continue;

                var nx = noteX(n, el);
                var dist = Math.abs(nx - HITX);

                // Tap note
                if (n.holdMs === 0 && dist <= RHYTHM_HIT_WINDOW) {
                    var isPerfect = dist <= RHYTHM_PERFECT_WINDOW;
                    adjustScore(isPerfect ? 18 : 10);
                    addFloat(isPerfect ? "PERFECT!" : "HIT!", isPerfect ? "#4ade80" : "#fbbf24");
                    playHitTone(0.12, 0.15, n);
                    deadNotesRef.current[n.id] = true;
                    next[i] = Object.assign({}, n, { hit: true, hitAtMs: el });
                    matchedRef.current = true;
                    break;
                }

                // Hold note start
                if (n.holdMs > 0 && dist <= RHYTHM_HIT_WINDOW) {
                    adjustScore(10);
                    setHolding(n.id); holdingRef.current = n.id; holdActiveRef.current = true;
                    playHitTone(0.08, 0.10, n);
                    addFloat("HOLD!", "#60a5fa");
                    next[i] = Object.assign({}, n, { headHit: true });
                    matchedRef.current = true;
                    break;
                }

                // Hold note missed head
                if (n.holdMs > 0 && nx < HITX - RHYTHM_HIT_WINDOW) {
                    adjustScore(-8); markMiss("MISS"); holdActiveRef.current = false;
                    deadNotesRef.current[n.id] = true;
                    next[i] = Object.assign({}, n, { missed: true });
                    matchedRef.current = true;
                    break;
                }
            }
            if (!matchedRef.current) { adjustScore(-5); markWrong("WRONG"); }
            return matchedRef.current ? next : prev;
        });
    }

    // Button release handler
    function releaseBtn(type) {
        if (phase !== "playing" || holdingRef.current === null) return;
        var now = performance.now();
        if (now - lastReleaseMsRef.current < 50) return;
        lastReleaseMsRef.current = now;
        var hid = holdingRef.current;
        var el = getLiveElapsed();

        setNotes(function(prev) {
            return prev.map(function(n) {
                if (n.id !== hid) return n;
                if (deadNotesRef.current[n.id]) return n;
                var ex = holdEndX(n, el);
                var dist = Math.abs(ex - HITX);
                if (dist <= RHYTHM_HIT_WINDOW) {
                    adjustScore(18);
                    playHitTone(0.18, 0.15, prev.find(function(x) { return x.id === hid; }));
                    addFloat("RELEASE!", "#60a5fa");
                    holdActiveRef.current = false; deadNotesRef.current[n.id] = true;
                    return Object.assign({}, n, { hit: true, holdSuccess: true });
                }
                adjustScore(-8); markWrong("EARLY"); holdActiveRef.current = false; deadNotesRef.current[n.id] = true;
                return Object.assign({}, n, { hit: false, missed: true, headHit: false });
            });
        });
        setHolding(null); holdingRef.current = null;
    }

    function handlePress(type) { pressBtn(type); }
    function handleRelease(type) { releaseBtn(type); }

    var el = elapsed;
    var HIT_ANIM_DURATION = 300;
    var canRender = phase === "done" || (phase === "playing" && rafStarted);

    // Beat markers
    var beatMarkers = [];
    if (canRender) {
        var beatInterval = 60000 / (120 * speed);
        for (var b = 0; b * beatInterval < RHYTHM_DURATION; b++) {
            var bx = HITX + (b * beatInterval - el) * scrollSpeed;
            if (bx > -10 && bx < RHYTHM_TRACK_W + 10) {
                beatMarkers.push({ key: b, x: bx, isBar: b % 4 === 0 });
            }
        }
    }

    // Visible notes
    var vis = canRender ? notes.filter(function(n) {
        if (n.hit && n.holdMs === 0) {
            var age = el - (n.hitAtMs || 0);
            if (age > HIT_ANIM_DURATION) return false;
            return true;
        }
        if (n.spawnMs > el + 250 && n.spawnMs - el > ((RHYTHM_TRACK_W - HITX) / scrollSpeed) * 1000) return false;
        var nx = noteX(n, el);
        var ex = n.holdMs > 0 ? holdEndX(n, el) : nx;
        return Math.max(nx, ex) > -40 && nx < RHYTHM_TRACK_W + 120;
    }) : [];

    // --- Render ---
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: "16px" }}>
            <div style={{ background: "#0f0b06", border: "2px solid #3d2e0f", borderRadius: 16, padding: "16px 20px", width: "min(860px,100%)", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", position: "relative" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "#8a7a64", letterSpacing: 2 }}>RHYTHM QTE TEST</div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 2 }}>QUALITY</div><div style={{ fontSize: 32, color: "#f59e0b", fontWeight: "bold" }}>{displayScore}</div></div>
                    <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 2 }}>TIME</div><div style={{ fontSize: 20, color: displayTime <= 3 ? "#ef4444" : "#f0e6c8", fontWeight: "bold" }}>{displayTime}s</div></div>
                </div>

                {/* Combo */}
                <div style={{ textAlign: "center", height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {displayCombo > 0 && <div style={{ fontSize: 13, color: displayCombo > 4 ? "#4ade80" : "#f59e0b", fontWeight: "bold", letterSpacing: 3 }}>{displayCombo}x COMBO</div>}
                </div>

                {/* Track */}
                <div style={{ position: "relative", width: "100%", maxWidth: RHYTHM_TRACK_W }}>
                    <div style={{ position: "relative", left: 0, right: 0, height: 20, pointerEvents: "none", overflow: "visible" }}>
                        {floats.map(function(fl) {
                            return <div key={fl.id} style={{ position: "absolute", left: HITX + 8, bottom: 0, fontSize: 13, color: fl.color, fontWeight: "bold", letterSpacing: 2, zIndex: 20, pointerEvents: "none", animation: "floatUp 0.5s ease-out forwards" }}>{fl.text}</div>;
                        })}
                    </div>
                    <div style={{ position: "relative", width: "100%", height: 80, background: "#050402", border: "1px solid #2a1f0a", borderRadius: 8, overflow: "hidden" }}>
                        {[150, 300, 450, 600, 750].map(function(x) { return <div key={x} style={{ position: "absolute", left: x, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.04)", zIndex: 1 }} />; })}

                        {phase === "countdown" && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ fontSize: 56, color: "#f59e0b", fontWeight: "bold" }}>{countdown === 0 ? "GO!" : countdown}</div>
                            </div>
                        )}

                        {canRender && phase !== "countdown" && <>
                            {beatMarkers.map(function(bm) {
                                return (
                                    <div key={bm.key} style={{ position: "absolute", left: bm.x, top: 0, bottom: 0, width: 1, background: bm.isBar ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)", zIndex: 2, pointerEvents: "none" }}>
                                        {bm.isBar && <div style={{ position: "absolute", top: 2, left: 2, fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", lineHeight: 1 }}>{Math.floor(bm.key / 4) + 1}</div>}
                                    </div>
                                );
                            })}

                            {vis.map(function(n) {
                                var noteColor = n.type === "hammer" ? "#60a5fa" : "#f97316";
                                var isActiveHold = n.headHit && !n.missed && !n.hit;

                                // Hit animation
                                if (n.hit && n.holdMs === 0) {
                                    var age = el - (n.hitAtMs || 0);
                                    var t = Math.min(age / HIT_ANIM_DURATION, 1);
                                    var scale = 1 - t;
                                    var offsetY = -40 * t;
                                    var offsetX = -30 * t;
                                    return <div key={n.id} style={{ position: "absolute", top: "50%", left: HITX - 16 + offsetX, transform: "translateY(-50%) translateY(" + offsetY + "px) scale(" + scale + ")", fontSize: 30, zIndex: 15, opacity: scale, pointerEvents: "none", lineHeight: 1, filter: "brightness(2)" }}>{n.type === "hammer" ? "\uD83D\uDD28" : "\uD83D\uDD25"}</div>;
                                }

                                var nx = noteX(n, el);

                                // Hold note
                                if (n.holdMs > 0) {
                                    var ex = holdEndX(n, el);
                                    var barLeft = Math.min(nx, ex);
                                    var barWidth = Math.max(0, Math.abs(ex - nx));
                                    var tailInWindow = Math.abs(ex - HITX) <= RHYTHM_HIT_WINDOW && isActiveHold;
                                    return (
                                        <div key={n.id} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
                                            <div style={{ position: "absolute", top: "50%", left: barLeft, transform: "translateY(-50%)", height: 14, width: barWidth, background: noteColor, opacity: isActiveHold ? 0.8 : n.missed ? 0.1 : 0.35, borderRadius: 7, zIndex: 3 }} />
                                            <div style={{ position: "absolute", top: "50%", left: nx - 16, transform: "translateY(-50%)", fontSize: 30, zIndex: 5, opacity: n.missed ? 0.15 : 1, lineHeight: 1, filter: isActiveHold ? "brightness(2)" : "none" }}>{"\uD83D\uDD25"}</div>
                                            <div style={{ position: "absolute", top: "50%", left: ex - 10, transform: "translateY(-50%)", fontSize: 16, zIndex: 5, opacity: n.missed ? 0.1 : 1, lineHeight: 1, filter: tailInWindow ? "brightness(2)" : "none" }}>{"\uD83D\uDD25"}</div>
                                        </div>
                                    );
                                }

                                // Tap note
                                return <div key={n.id} style={{ position: "absolute", top: "50%", left: nx - 16, transform: "translateY(-50%)", fontSize: 30, zIndex: 5, opacity: n.missed ? 0.15 : 1, pointerEvents: "none", lineHeight: 1 }}>{n.type === "hammer" ? "\uD83D\uDD28" : "\uD83D\uDD25"}</div>;
                            })}
                        </>}
                    </div>
                </div>

                {/* Done message */}
                {phase === "done" && <div style={{ fontSize: 13, color: "#c8b89a" }}>COMPLETE {"\u2014"} Final quality: <span style={{ color: "#f59e0b", fontWeight: "bold" }}>{displayScore}</span></div>}

                {/* Controls */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <button onClick={function() { setOneButton(function(v) { return !v; }); }} style={{ background: oneButton ? "#1a1a0a" : "#141009", border: "2px solid " + (oneButton ? "#f59e0b" : "#3d2e0f"), borderRadius: 8, color: oneButton ? "#f59e0b" : "#5a4a38", padding: "6px 18px", fontSize: 11, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>{oneButton ? "SWITCH TO TWO BUTTONS" : "SWITCH TO ONE BUTTON"}</button>
                    <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
                        {buttons.map(function(b) {
                            var isHolding = holding !== null;
                            return (
                                <button key={b[1]}
                                        onMouseDown={function() { handlePress(b[1]); }}
                                        onMouseUp={function() { handleRelease(b[1]); }}
                                        onTouchStart={function(e) { e.preventDefault(); handlePress(b[1]); }}
                                        onTouchEnd={function(e) { e.preventDefault(); handleRelease(b[1]); }}
                                        style={{ width: 80, height: 80, borderRadius: 12, background: isHolding ? b[2] + "44" : "#1a1209", border: "3px solid " + (isHolding ? b[2] : b[2] + "88"), fontSize: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.05s,border-color 0.05s", userSelect: "none" }}
                                >{b[0]}</button>
                            );
                        })}
                    </div>
                </div>

                {/* Speed & Reset */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={function() { setSpeed(function(s) { return Math.max(0.5, parseFloat((s - 0.25).toFixed(2))); }); }} style={{ background: "#141009", border: "1px solid #f59e0b", borderRadius: 6, color: "#f59e0b", padding: "5px 10px", fontSize: 14, cursor: "pointer", fontFamily: "monospace" }}>{"\u2212"}</button>
                    <span style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 2, minWidth: 50, textAlign: "center", fontFamily: "monospace" }}>{speed.toFixed(2)}x</span>
                    <button onClick={function() { setSpeed(function(s) { return Math.min(2.0, parseFloat((s + 0.25).toFixed(2))); }); }} style={{ background: "#141009", border: "1px solid #f59e0b", borderRadius: 6, color: "#f59e0b", padding: "5px 10px", fontSize: 14, cursor: "pointer", fontFamily: "monospace" }}>+</button>
                    <button onClick={fullReset} style={{ background: "#141009", border: "1px solid #f59e0b", borderRadius: 6, color: "#f59e0b", padding: "5px 14px", fontSize: 11, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Restart</button>
                    <button onClick={onClose} style={{ background: "#141009", border: "1px solid #3d2e0f", borderRadius: 6, color: "#5a4a38", padding: "5px 14px", fontSize: 11, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Exit</button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var RhythmQTEModule = {
    RhythmQTE: RhythmQTE,
};

export default RhythmQTEModule;