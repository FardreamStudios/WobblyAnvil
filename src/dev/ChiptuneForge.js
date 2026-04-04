// ============================================================
// ChiptuneForge.js — Multi-Track Chiptune SFX Designer
//
// Dev-only tool for designing procedural 16-bit audio.
// Multi-track layering, record & snap sequencer, loop mode,
// echo/delay, ADSR envelopes, hold-loop preview.
//
// Route: /dev/chiptune-forge
//
// Exports: JSON (for audio.js integration) or WAV (16-bit).
//
// USAGE:
//   import ChiptuneForge from "./ChiptuneForge.js";
//   <ChiptuneForge />
//
// No game dependencies — fully standalone.
// ============================================================

import { useState, useRef, useEffect, useMemo } from "react";
import "./ChiptuneForge.css";

// --- COLORS ---
var C = {
    bg: "#0a0a0a", panel: "#111611", border: "#1a2e1a",
    accent: "#30ff60", accentDim: "#1a8a35", accentGlow: "rgba(48,255,96,0.15)",
    text: "#c0e8c8", textDim: "#5a8a65", red: "#cc3030",
    playhead: "#ff4040", keyWhite: "#1a2a1a", keyBlack: "#080c08",
    keyActive: "rgba(48,255,96,0.3)"
};

var TRACK_COLORS = ["#30ff60", "#40c8ff", "#ff6040", "#ffcc30", "#c060ff", "#ff60c0"];
var TRACK_GLOWS = [
    "rgba(48,255,96,0.6)", "rgba(64,200,255,0.6)", "rgba(255,96,64,0.6)",
    "rgba(255,204,48,0.6)", "rgba(192,96,255,0.6)", "rgba(255,96,192,0.6)"
];

// --- TOOLTIPS ---
var TIPS = {
    wave: "Base waveform. Square=chiptune, Tri=soft bass, Saw=buzzy, Sine=pure, Noise=perc/FX",
    duty: "Pulse width for square. Lower=nasal, 0.5=full square",
    pitch: "Base frequency Hz. Lower=deeper, higher=brighter",
    detune: "Shifts pitch slightly in cents. Adds thickness",
    sweep: "Pitch slide over duration. Positive=rises, negative=falls",
    volume: "Overall loudness", duration: "Sound length in seconds",
    attack: "Fade-in speed. Short=punchy, long=swell",
    decay: "Speed volume drops from peak to sustain",
    sustain: "Hold level after decay. 0=percussive, 1=full hold",
    release: "Fade-out length after note ends",
    filterType: "Lowpass=warmer, Highpass=thinner, Bandpass=isolates a band",
    cutoff: "Where the filter starts cutting", filterQ: "Resonance sharpness at cutoff",
    vibRate: "Vibrato speed", vibDepth: "Vibrato amount in cents",
    delayTime: "Echo gap in seconds", delayFeedback: "Echo repeat count",
    delayMix: "Echo loudness. 0=dry, 1=full wet",
    loop: "Crossfades tail into head for seamless looping",
    snap: "Quantize notes to nearest grid line",
    bpm: "Tempo — affects grid spacing", gridDiv: "Snap resolution",
    timelineDur: "Timeline length in seconds",
    hold: "Press and hold to hear the sound loop continuously",
};

// --- PRESETS ---
var PRESETS = [
    { name: "Hammer Hit", wave: "square", duty: 0.5, attack: 0.005, decay: 0.08, sustain: 0.0, release: 0.05, pitch: 220, detune: 0, vibRate: 0, vibDepth: 0, filterType: "lowpass", filterFreq: 3000, filterQ: 1, pitchSweep: -200, gain: 0.7, duration: 0.2, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Coin Pickup", wave: "square", duty: 0.25, attack: 0.001, decay: 0.06, sustain: 0.0, release: 0.04, pitch: 880, detune: 0, vibRate: 0, vibDepth: 0, filterType: "lowpass", filterFreq: 8000, filterQ: 0.5, pitchSweep: 400, gain: 0.5, duration: 0.15, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Menu Click", wave: "sine", duty: 0.5, attack: 0.001, decay: 0.04, sustain: 0.0, release: 0.02, pitch: 660, detune: 0, vibRate: 0, vibDepth: 0, filterType: "lowpass", filterFreq: 6000, filterQ: 1, pitchSweep: 0, gain: 0.4, duration: 0.1, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Shatter", wave: "noise", duty: 0.5, attack: 0.001, decay: 0.3, sustain: 0.05, release: 0.2, pitch: 440, detune: 0, vibRate: 0, vibDepth: 0, filterType: "highpass", filterFreq: 2000, filterQ: 3, pitchSweep: 0, gain: 0.6, duration: 0.6, delayTime: 0.08, delayFeedback: 0.3, delayMix: 0.25 },
    { name: "Fanfare", wave: "square", duty: 0.25, attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3, pitch: 523, detune: 0, vibRate: 5, vibDepth: 8, filterType: "lowpass", filterFreq: 5000, filterQ: 1, pitchSweep: 0, gain: 0.5, duration: 0.6, delayTime: 0.15, delayFeedback: 0.4, delayMix: 0.3 },
    { name: "Bass Thud", wave: "triangle", duty: 0.5, attack: 0.005, decay: 0.15, sustain: 0.0, release: 0.1, pitch: 80, detune: 0, vibRate: 0, vibDepth: 0, filterType: "lowpass", filterFreq: 400, filterQ: 2, pitchSweep: -40, gain: 0.8, duration: 0.3, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Laser Zap", wave: "sawtooth", duty: 0.5, attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.05, pitch: 1200, detune: 0, vibRate: 0, vibDepth: 0, filterType: "lowpass", filterFreq: 6000, filterQ: 4, pitchSweep: -1000, gain: 0.45, duration: 0.25, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Power Up", wave: "square", duty: 0.125, attack: 0.01, decay: 0.05, sustain: 0.4, release: 0.3, pitch: 330, detune: 0, vibRate: 6, vibDepth: 15, filterType: "lowpass", filterFreq: 4000, filterQ: 2, pitchSweep: 600, gain: 0.5, duration: 0.5, delayTime: 0.1, delayFeedback: 0.3, delayMix: 0.2 },
    { name: "Block / Parry", wave: "square", duty: 0.5, attack: 0.001, decay: 0.05, sustain: 0.0, release: 0.03, pitch: 500, detune: 30, vibRate: 0, vibDepth: 0, filterType: "bandpass", filterFreq: 2500, filterQ: 5, pitchSweep: 100, gain: 0.6, duration: 0.12, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Heal Chime", wave: "sine", duty: 0.5, attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.5, pitch: 700, detune: 0, vibRate: 4, vibDepth: 5, filterType: "lowpass", filterFreq: 7000, filterQ: 0.5, pitchSweep: 200, gain: 0.4, duration: 0.8, delayTime: 0.2, delayFeedback: 0.5, delayMix: 0.35 },
    { name: "Damage Hit", wave: "sawtooth", duty: 0.5, attack: 0.001, decay: 0.1, sustain: 0.0, release: 0.06, pitch: 150, detune: 20, vibRate: 0, vibDepth: 0, filterType: "lowpass", filterFreq: 1500, filterQ: 3, pitchSweep: -80, gain: 0.7, duration: 0.2, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Death KO", wave: "sawtooth", duty: 0.5, attack: 0.005, decay: 0.4, sustain: 0.0, release: 0.3, pitch: 200, detune: 40, vibRate: 3, vibDepth: 20, filterType: "lowpass", filterFreq: 800, filterQ: 2, pitchSweep: -180, gain: 0.75, duration: 0.8, delayTime: 0.12, delayFeedback: 0.35, delayMix: 0.2 },
    { name: "Ambient Drone", wave: "triangle", duty: 0.5, attack: 0.3, decay: 0.2, sustain: 0.7, release: 0.4, pitch: 110, detune: 5, vibRate: 2, vibDepth: 8, filterType: "lowpass", filterFreq: 1200, filterQ: 3, pitchSweep: 0, gain: 0.45, duration: 2.0, delayTime: 0.3, delayFeedback: 0.6, delayMix: 0.4 },
    { name: "UI Hover", wave: "sine", duty: 0.5, attack: 0.001, decay: 0.03, sustain: 0.0, release: 0.02, pitch: 1100, detune: 0, vibRate: 0, vibDepth: 0, filterType: "lowpass", filterFreq: 8000, filterQ: 0.5, pitchSweep: 0, gain: 0.25, duration: 0.06, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Explosion Crack", wave: "noise", duty: 0.5, attack: 0.001, decay: 0.06, sustain: 0.0, release: 0.04, pitch: 800, detune: 0, vibRate: 0, vibDepth: 0, filterType: "bandpass", filterFreq: 3000, filterQ: 2, pitchSweep: 0, gain: 0.8, duration: 0.12, delayTime: 0, delayFeedback: 0, delayMix: 0 },
    { name: "Explosion Rumble", wave: "triangle", duty: 0.5, attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.6, pitch: 55, detune: 10, vibRate: 3, vibDepth: 12, filterType: "lowpass", filterFreq: 300, filterQ: 3, pitchSweep: -30, gain: 0.7, duration: 1.2, delayTime: 0.08, delayFeedback: 0.25, delayMix: 0.2 },
];

var DEFAULT_SOUND = PRESETS[0];

// --- NOTE HELPERS ---
var NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
function noteToFreq(n, o) { return 440 * Math.pow(2, ((o+1)*12+n-69)/12); }

// ============================================================
// AUDIO ENGINE — Procedural Web Audio synth
// ============================================================

function createEngine() {
    var ctx = null, masterGain = null;

    function ensure() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.6;
            masterGain.connect(ctx.destination);
        }
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    function voice(c, snd, freq, t0, dur, out) {
        var t1 = t0 + dur, src;
        if (snd.wave === "noise") {
            var bl = Math.ceil(c.sampleRate * dur);
            var bf = c.createBuffer(1, bl, c.sampleRate);
            var dd = bf.getChannelData(0);
            for (var i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
            src = c.createBufferSource(); src.buffer = bf;
        } else {
            src = c.createOscillator(); src.type = snd.wave;
            src.frequency.setValueAtTime(freq, t0);
            if (snd.pitchSweep) src.frequency.linearRampToValueAtTime(Math.max(20, freq + snd.pitchSweep), t1);
            if (snd.detune) src.detune.value = snd.detune;
            if (snd.vibRate > 0 && snd.vibDepth > 0) {
                var lfo = c.createOscillator(), lg = c.createGain();
                lfo.frequency.value = snd.vibRate; lg.gain.value = snd.vibDepth;
                lfo.connect(lg); lg.connect(src.frequency);
                lfo.start(t0); lfo.stop(t1 + 0.1);
            }
        }
        // ADSR
        var eg = c.createGain();
        eg.gain.setValueAtTime(0, t0);
        eg.gain.linearRampToValueAtTime(snd.gain, t0 + snd.attack);
        eg.gain.linearRampToValueAtTime(snd.sustain * snd.gain, t0 + snd.attack + snd.decay);
        var rs = t1 - snd.release;
        if (rs > t0 + snd.attack + snd.decay) eg.gain.setValueAtTime(snd.sustain * snd.gain, rs);
        eg.gain.linearRampToValueAtTime(0.001, t1);
        // Filter
        var flt = c.createBiquadFilter();
        flt.type = snd.filterType; flt.frequency.value = snd.filterFreq; flt.Q.value = snd.filterQ;
        src.connect(flt); flt.connect(eg);
        // Delay / Echo
        if (snd.delayTime > 0 && snd.delayMix > 0) {
            var dry = c.createGain(); dry.gain.value = 1;
            var wet = c.createGain(); wet.gain.value = snd.delayMix;
            var del = c.createDelay(2); del.delayTime.value = snd.delayTime;
            var fb = c.createGain(); fb.gain.value = Math.min(snd.delayFeedback, 0.9);
            eg.connect(dry); dry.connect(out);
            eg.connect(del); del.connect(wet); wet.connect(out);
            del.connect(fb); fb.connect(del);
        } else { eg.connect(out); }
        src.start(t0); src.stop(t1 + 0.5 + snd.delayTime * 4);
        return src;
    }

    function play(snd, freq, dur) {
        var c = ensure();
        return voice(c, snd, freq, c.currentTime, dur || snd.duration || 0.3, masterGain);
    }

    // Hold loop — repeats sound continuously
    var holdInterval = null;
    function holdStart(snd) {
        holdStop();
        var c = ensure();
        var dur = snd.duration || 0.3;
        voice(c, snd, snd.pitch, c.currentTime, dur, masterGain);
        holdInterval = setInterval(function () {
            try { voice(c, snd, snd.pitch, c.currentTime, dur, masterGain); } catch(e) {}
        }, dur * 1000);
    }
    function holdStop() {
        if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
    }

    function renderWav(tracks, totalDur, loopMode) {
        var sr = 44100, renderDur = totalDur + 1.5;
        var samples = Math.ceil(sr * renderDur);
        var off = new OfflineAudioContext(1, samples, sr);
        var master = off.createGain(); master.gain.value = 0.6; master.connect(off.destination);
        var hasSolo = tracks.some(function (t) { return t.solo; });
        tracks.forEach(function (tr) {
            if (tr.muted) return;
            if (hasSolo && !tr.solo) return;
            var startT = tr.startTime || 0;
            if (tr.notes.length > 0) {
                tr.notes.forEach(function (n) {
                    voice(off, tr.sound, n.freq, startT + n.time, n.duration || tr.sound.duration || 0.3, master);
                });
            } else {
                voice(off, tr.sound, tr.sound.pitch, startT, tr.sound.duration || 0.3, master);
            }
        });
        return off.startRendering().then(function (buf) {
            var ch = buf.getChannelData(0);
            var use = Math.min(ch.length, Math.ceil(sr * totalDur));
            var fin = new Float32Array(use);
            for (var i = 0; i < use; i++) fin[i] = ch[i];
            if (loopMode) {
                var fl = Math.min(Math.floor(use * 0.1), Math.floor(sr * 0.15));
                for (var f = 0; f < fl; f++) {
                    var t = f / fl;
                    fin[f] = fin[f] * t + fin[use - fl + f] * (1 - t);
                    fin[use - fl + f] *= t;
                }
            }
            var wl = 44 + fin.length * 2, ab = new ArrayBuffer(wl), v = new DataView(ab);
            function ws(o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
            ws(0,"RIFF"); v.setUint32(4,wl-8,true); ws(8,"WAVE"); ws(12,"fmt ");
            v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
            v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true);
            v.setUint16(34,16,true); ws(36,"data"); v.setUint32(40,fin.length*2,true);
            for (var s = 0; s < fin.length; s++) v.setInt16(44+s*2, Math.max(-1,Math.min(1,fin[s]))*32767, true);
            return new Blob([ab], { type: "audio/wav" });
        });
    }

    return { play: play, voice: voice, ensure: ensure, holdStart: holdStart, holdStop: holdStop, renderWav: renderWav };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// --- Track factory ---
var trackIdCounter = 0;
function makeTrack(colorIdx) {
    trackIdCounter++;
    return {
        id: trackIdCounter, name: "Track " + trackIdCounter,
        colorIdx: colorIdx !== undefined ? colorIdx : (trackIdCounter - 1) % 6,
        sound: Object.assign({}, PRESETS[0]), notes: [], muted: false, solo: false,
        startTime: 0
    };
}

// --- Collapsible section ---
function Section(props) {
    var open = props.open, onToggle = props.onToggle, label = props.label, color = props.color;
    var triColor = open ? (color || C.accent) : C.accentDim;
    var triGlow = open ? "0 0 6px " + (color || C.accent) + ", 0 0 12px " + (color || "rgba(48,255,96,0.3)") : "0 0 4px " + C.accentDim;
    return (
        <div style={{ borderBottom: "1px solid " + C.border }}>
            <div onClick={onToggle} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", cursor: "pointer", userSelect: "none",
                background: open ? "rgba(48,255,96,0.04)" : "transparent"
            }}>
                <span style={{
                    fontSize: 9, color: triColor, transition: "transform 0.2s, color 0.2s, filter 0.2s",
                    transform: open ? "rotate(90deg)" : "rotate(0)", display: "inline-block",
                    filter: "drop-shadow(" + triGlow + ")", lineHeight: 1
                }}>▶</span>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: color || C.textDim, flex: 1 }}>{label}</span>
            </div>
            {open && <div style={{ padding: "3px 10px 6px" }}>{props.children}</div>}
        </div>
    );
}

// --- Tooltip ---
function Tip(props) {
    var ref = useRef(null);
    var [show, setShow] = useState(false);
    var [pos, setPos] = useState({ x: 0, y: 0 });
    return (
        <div ref={ref} style={{ position: "relative", display: "inline-flex", width: "100%", ...props.style }}
             onMouseEnter={function (e) { var r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.left + r.width/2, y: r.top }); setShow(true); }}
             onMouseLeave={function () { setShow(false); }}>
            {props.children}
            {show && props.tip && (
                <div style={{
                    position: "fixed", left: Math.min(pos.x, window.innerWidth - 220), top: pos.y - 6,
                    transform: "translateX(-50%) translateY(-100%)",
                    background: "#0d1a0d", color: C.text, border: "1px solid " + C.accentDim,
                    padding: "6px 10px", borderRadius: 4, fontSize: 11, lineHeight: 1.4,
                    maxWidth: 220, zIndex: 9999, pointerEvents: "none",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.7)"
                }}>{props.tip}
                    <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%) rotate(45deg)",
                        width: 8, height: 8, background: "#0d1a0d", borderRight: "1px solid " + C.accentDim, borderBottom: "1px solid " + C.accentDim }} />
                </div>
            )}
        </div>
    );
}

// --- Slider ---
function Slider(props) {
    var min = props.min !== undefined ? props.min : 0, max = props.max !== undefined ? props.max : 1;
    var step = props.step || 0.01, unit = props.unit || "";
    var dv = step >= 1 ? Math.round(props.value) : props.value.toFixed(step < 0.01 ? 3 : 2);
    return (
        <Tip tip={props.tip}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1, width: "100%" }}>
                <span style={{ width: 52, fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: 0.6, flexShrink: 0 }}>{props.label}</span>
                <input type="range" min={min} max={max} step={step} value={props.value}
                       onChange={function (e) { props.onChange(parseFloat(e.target.value)); }}
                       style={{ flex: 1, accentColor: C.accent, height: 3 }} />
                <span style={{ width: 42, fontSize: 9, color: C.text, textAlign: "right", fontFamily: "monospace" }}>{dv}{unit}</span>
            </div>
        </Tip>
    );
}

// --- ADSR visual ---
function ADSRVis(props) {
    var a=props.a, d=props.d, s=props.s, r=props.r, w=160, h=40;
    var tot=a+d+0.15+r, sc=w/tot;
    var x1=a*sc, x2=x1+d*sc, x3=x2+0.15*sc, sY=h-s*h;
    var p="M 0 "+h+" L "+x1.toFixed(1)+" 2 L "+x2.toFixed(1)+" "+sY.toFixed(1)+" L "+x3.toFixed(1)+" "+sY.toFixed(1)+" L "+w+" "+h;
    return (
        <svg width={w} height={h} style={{ display: "block", margin: "2px 0 6px" }}>
            <path d={p} fill="none" stroke={C.accent} strokeWidth="1.5" />
            <path d={p+" Z"} fill={C.accentGlow} />
        </svg>
    );
}

// ============================================================
// SHARED STYLE HELPERS
// ============================================================

function btnStyle(bg) {
    return { padding:"4px 10px",fontSize:10,fontWeight:600,letterSpacing:0.5,background:bg,color:C.bg,border:"none",borderRadius:3,cursor:"pointer",textTransform:"uppercase" };
}
function chipBtnStyle(active, color) {
    return { flex:1,padding:"3px 0",fontSize:9,textTransform:"uppercase",letterSpacing:0.4,
        border:"1px solid "+(active ? color||C.accent : C.border),borderRadius:2,
        background:active?"rgba(48,255,96,0.12)":"transparent",
        color:active?color||C.accent:C.textDim,cursor:"pointer",fontWeight:active?600:400 };
}
var TINY_BTN = { width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid "+C.border,borderRadius:2,cursor:"pointer",fontSize:8,fontWeight:700,background:"transparent" };
var SM_BTN = { width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid "+C.border,background:"transparent",color:C.textDim,borderRadius:2,cursor:"pointer",fontSize:13,fontWeight:700 };
var DIVIDER = { height:16,width:1,background:C.border };
var SELECT_STYLE = { background:C.panel,color:C.accent,border:"1px solid "+C.border,padding:"3px 6px",fontSize:10,borderRadius:2,cursor:"pointer" };
var NUM_INPUT = { width:40,background:C.panel,color:C.accent,border:"1px solid "+C.border,padding:"2px 4px",fontSize:10,borderRadius:2,textAlign:"center" };

// ============================================================
// MAIN COMPONENT
// ============================================================

function ChiptuneForge() {
    var eng = useRef(null);
    if (!eng.current) eng.current = createEngine();

    // -- Tracks --
    var [tracks, setTracks] = useState(function () { return [makeTrack(0)]; });
    var [selIdx, setSelIdx] = useState(0);
    var track = tracks[selIdx] || tracks[0];
    var sound = track.sound;

    function setTrackProp(key, val) {
        setTracks(function (prev) {
            var copy = prev.slice();
            var o = {}; o[key] = val;
            copy[selIdx] = Object.assign({}, copy[selIdx], o);
            return copy;
        });
    }
    function updateSound(key, val) {
        setTracks(function (prev) {
            var copy = prev.slice();
            var s = Object.assign({}, copy[selIdx].sound);
            s[key] = val;
            copy[selIdx] = Object.assign({}, copy[selIdx], { sound: s });
            return copy;
        });
    }
    function loadPreset(p) {
        setTracks(function (prev) {
            var copy = prev.slice();
            copy[selIdx] = Object.assign({}, copy[selIdx], { sound: Object.assign({}, p) });
            return copy;
        });
    }
    function addTrack() {
        if (tracks.length >= 6) return;
        setTracks(function (prev) { return prev.concat([makeTrack(prev.length % 6)]); });
        setSelIdx(tracks.length);
    }
    function deleteTrack(idx) {
        if (tracks.length <= 1) return;
        setTracks(function (prev) { var c = prev.slice(); c.splice(idx, 1); return c; });
        if (selIdx >= tracks.length - 1) setSelIdx(Math.max(0, tracks.length - 2));
    }
    function toggleMute(idx) {
        setTracks(function (prev) {
            var c = prev.slice();
            c[idx] = Object.assign({}, c[idx], { muted: !c[idx].muted });
            return c;
        });
    }
    function toggleSolo(idx) {
        setTracks(function (prev) {
            var c = prev.slice();
            var wasSolo = c[idx].solo;
            c = c.map(function (t, i) { return Object.assign({}, t, { solo: i === idx ? !wasSolo : false }); });
            return c;
        });
    }

    // -- Panel states --
    var [panels, setPanels] = useState({ presets: true, wave: true, env: true, filter: true, echo: true, keys: true });
    function togglePanel(k) { setPanels(function (p) { var n = Object.assign({}, p); n[k] = !n[k]; return n; }); }

    // -- Keyboard --
    var [octave, setOctave] = useState(4);
    var [activeKeys, setActiveKeys] = useState({});

    // -- Recording --
    var [isRec, setIsRec] = useState(false);
    var [recCount, setRecCount] = useState(0);
    var recStart = useRef(0);
    var recBuf = useRef([]);

    // -- Keyboard Timeline (per-track note recording + preview) --
    var [keyPlaying, setKeyPlaying] = useState(false);
    var [keyPos, setKeyPos] = useState(0);
    var keyPlayRef = useRef(null);
    var keyScheduledIds = useRef([]);
    var [keyBpm, setKeyBpm] = useState(120);
    var [keySnap, setKeySnap] = useState(8);
    var [keyDur, setKeyDur] = useState(4);
    var [keyLoop, setKeyLoop] = useState(false);

    // -- Mixer Timeline (arrangement + export) --
    var [mixPlaying, setMixPlaying] = useState(false);
    var [mixPos, setMixPos] = useState(0);
    var mixPlayRef = useRef(null);
    var mixScheduledIds = useRef([]);
    var [mixBpm, setMixBpm] = useState(120);
    var [mixDur, setMixDur] = useState(4);
    var [mixLoop, setMixLoop] = useState(false);

    // -- Note drag (keyboard timeline) --
    var [dragIdx, setDragIdx] = useState(-1);
    var dragX0 = useRef(0), dragT0 = useRef(0);
    var tlRef = useRef(null);

    // -- Hold preview --
    var [holding, setHolding] = useState(false);

    // -- Track block drag (timeline) --
    var [blockDragIdx, setBlockDragIdx] = useState(-1);
    var blockDragX0 = useRef(0), blockDragT0 = useRef(0);
    var blockTlRef = useRef(null);

    function setTrackStartTime(idx, t) {
        setTracks(function (prev) {
            var copy = prev.slice();
            copy[idx] = Object.assign({}, copy[idx], { startTime: Math.max(0, t) });
            return copy;
        });
    }

    // -- Note play --
    function handleNoteOn(noteIdx) {
        var freq = noteToFreq(noteIdx, octave);
        eng.current.play(sound, freq, sound.duration || 0.3);
        setActiveKeys(function (p) { var n = Object.assign({}, p); n[noteIdx] = true; return n; });
        if (isRec) {
            var el = (performance.now() - recStart.current) / 1000;
            recBuf.current.push({ note: noteIdx, octave: octave, freq: freq, time: el, duration: sound.duration || 0.3, name: NOTE_NAMES[noteIdx] + octave, trackIdx: selIdx });
            setRecCount(recBuf.current.length);
        }
        setTimeout(function () { setActiveKeys(function (p) { var n = Object.assign({}, p); delete n[noteIdx]; return n; }); }, 180);
    }

    function startRec() { recBuf.current = []; setRecCount(0); setIsRec(true); recStart.current = performance.now(); }
    function stopRec() {
        setIsRec(false);
        if (recBuf.current.length > 0) {
            var newNotes = recBuf.current;
            setTracks(function (prev) {
                var copy = prev.slice();
                copy[selIdx] = Object.assign({}, copy[selIdx], { notes: copy[selIdx].notes.concat(newNotes) });
                return copy;
            });
        }
    }

    function snapToGrid() {
        var bs = (60 / keyBpm) / (keySnap / 4);
        setTracks(function (prev) {
            var copy = prev.slice();
            copy[selIdx] = Object.assign({}, copy[selIdx], {
                notes: copy[selIdx].notes.map(function (n) { return Object.assign({}, n, { time: Math.max(0, Math.round(n.time / bs) * bs) }); })
            });
            return copy;
        });
    }

    // -- Mixer Playback --
    function playMix() {
        if (tracks.length === 0) return;
        stopMix();
        setMixPlaying(true);
        var t0 = performance.now();
        var hasSolo = tracks.some(function (t) { return t.solo; });
        function schedule() {
            tracks.forEach(function (tr) {
                if (tr.muted) return;
                if (hasSolo && !tr.solo) return;
                var startT = tr.startTime || 0;
                if (tr.notes.length > 0) {
                    tr.notes.forEach(function (n) {
                        var id = setTimeout(function () { eng.current.play(tr.sound, n.freq, n.duration); }, (startT + n.time) * 1000);
                        mixScheduledIds.current.push(id);
                    });
                } else {
                    // One-shot: play designed sound once at startTime
                    var id = setTimeout(function () { eng.current.play(tr.sound, tr.sound.pitch, tr.sound.duration || 0.3); }, startT * 1000);
                    mixScheduledIds.current.push(id);
                }
            });
        }
        schedule();
        function tick() {
            var el = (performance.now() - t0) / 1000;
            if (el >= mixDur) {
                if (mixLoop) {
                    mixScheduledIds.current.forEach(function (id) { clearTimeout(id); });
                    mixScheduledIds.current = [];
                    t0 = performance.now();
                    schedule();
                }
                else { setMixPlaying(false); setMixPos(0); return; }
            }
            setMixPos((el % mixDur) / mixDur);
            mixPlayRef.current = requestAnimationFrame(tick);
        }
        mixPlayRef.current = requestAnimationFrame(tick);
    }
    function stopMix() {
        setMixPlaying(false); setMixPos(0);
        if (mixPlayRef.current) cancelAnimationFrame(mixPlayRef.current);
        mixScheduledIds.current.forEach(function (id) { clearTimeout(id); });
        mixScheduledIds.current = [];
    }

    // -- Keyboard Playback (current track only, independent timeline) --
    function playKey() {
        if (track.notes.length === 0) return;
        stopKey();
        setKeyPlaying(true);
        var t0 = performance.now();
        var curTrack = track;
        function schedule() {
            curTrack.notes.forEach(function (n) {
                var id = setTimeout(function () { eng.current.play(curTrack.sound, n.freq, n.duration); }, n.time * 1000);
                keyScheduledIds.current.push(id);
            });
        }
        schedule();
        function tick() {
            var el = (performance.now() - t0) / 1000;
            if (el >= keyDur) {
                if (keyLoop) {
                    keyScheduledIds.current.forEach(function (id) { clearTimeout(id); });
                    keyScheduledIds.current = [];
                    t0 = performance.now();
                    schedule();
                }
                else { setKeyPlaying(false); setKeyPos(0); return; }
            }
            setKeyPos((el % keyDur) / keyDur);
            keyPlayRef.current = requestAnimationFrame(tick);
        }
        keyPlayRef.current = requestAnimationFrame(tick);
    }
    function stopKey() {
        setKeyPlaying(false); setKeyPos(0);
        if (keyPlayRef.current) cancelAnimationFrame(keyPlayRef.current);
        keyScheduledIds.current.forEach(function (id) { clearTimeout(id); });
        keyScheduledIds.current = [];
    }

    // -- Hold preview --
    function onHoldDown() { setHolding(true); eng.current.holdStart(sound); }
    function onHoldUp() { setHolding(false); eng.current.holdStop(); }

    // -- Drag notes --
    function onNoteDrag(e, idx) { e.preventDefault(); e.stopPropagation(); setDragIdx(idx); dragX0.current = e.clientX; dragT0.current = track.notes[idx].time; }
    useEffect(function () {
        if (dragIdx < 0) return;
        function mv(e) {
            if (!tlRef.current) return;
            var r = tlRef.current.getBoundingClientRect();
            var nt = Math.max(0, Math.min(keyDur - 0.05, dragT0.current + ((e.clientX - dragX0.current) / r.width) * keyDur));
            setTracks(function (prev) {
                var copy = prev.slice();
                var notes = copy[selIdx].notes.slice();
                notes[dragIdx] = Object.assign({}, notes[dragIdx], { time: nt });
                copy[selIdx] = Object.assign({}, copy[selIdx], { notes: notes });
                return copy;
            });
        }
        function up() { setDragIdx(-1); }
        window.addEventListener("mousemove", mv);
        window.addEventListener("mouseup", up);
        return function () { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    }, [dragIdx, keyDur, selIdx]);

    // -- Drag track blocks on arrangement timeline --
    function onBlockDrag(e, idx) {
        e.preventDefault(); e.stopPropagation();
        setBlockDragIdx(idx);
        blockDragX0.current = e.clientX;
        blockDragT0.current = tracks[idx].startTime || 0;
    }
    useEffect(function () {
        if (blockDragIdx < 0) return;
        function mv(e) {
            if (!blockTlRef.current) return;
            var r = blockTlRef.current.getBoundingClientRect();
            var nt = Math.max(0, Math.min(mixDur - 0.1, blockDragT0.current + ((e.clientX - blockDragX0.current) / r.width) * mixDur));
            setTrackStartTime(blockDragIdx, nt);
        }
        function up() { setBlockDragIdx(-1); }
        window.addEventListener("mousemove", mv);
        window.addEventListener("mouseup", up);
        return function () { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    }, [blockDragIdx, mixDur]);

    function deleteNote(idx) {
        setTracks(function (prev) {
            var copy = prev.slice();
            var notes = copy[selIdx].notes.slice(); notes.splice(idx, 1);
            copy[selIdx] = Object.assign({}, copy[selIdx], { notes: notes });
            return copy;
        });
    }
    function clearTrackNotes() {
        setTracks(function (prev) {
            var copy = prev.slice();
            copy[selIdx] = Object.assign({}, copy[selIdx], { notes: [] });
            return copy;
        });
    }

    // -- Export --
    function exportWav() {
        eng.current.renderWav(tracks, mixDur, mixLoop).then(function (blob) {
            var url = URL.createObjectURL(blob), a = document.createElement("a");
            a.href = url; a.download = "chiptune.wav"; a.click(); URL.revokeObjectURL(url);
        });
    }
    function exportJSON() {
        var data = {
            bpm: mixBpm, duration: mixDur, loop: mixLoop,
            tracks: tracks.map(function (tr) {
                return { name: tr.name, sound: tr.sound, muted: tr.muted, startTime: tr.startTime || 0,
                    notes: tr.notes.map(function (n) { return { note: n.note, octave: n.octave, time: parseFloat(n.time.toFixed(4)), duration: n.duration, name: n.name }; })
                };
            })
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = "chiptune.json"; a.click(); URL.revokeObjectURL(url);
    }

    // -- Beat markers (per timeline) --
    var keyBeats = useMemo(function () {
        var bd = 60 / keyBpm, m = [];
        for (var t = 0; t < keyDur; t += bd) m.push(t / keyDur);
        return m;
    }, [keyBpm, keyDur]);
    var mixBeats = useMemo(function () {
        var bd = 60 / mixBpm, m = [];
        for (var t = 0; t < mixDur; t += bd) m.push(t / mixDur);
        return m;
    }, [mixBpm, mixDur]);

    // -- All notes across tracks for timeline display --
    var allNotes = useMemo(function () {
        var arr = [];
        var hasSolo = tracks.some(function (t) { return t.solo; });
        tracks.forEach(function (tr, ti) {
            if (tr.muted) return;
            if (hasSolo && !tr.solo) return;
            tr.notes.forEach(function (n, ni) {
                arr.push({ n: n, ni: ni, ti: ti, color: TRACK_COLORS[tr.colorIdx], glow: TRACK_GLOWS[tr.colorIdx], isSel: ti === selIdx });
            });
        });
        return arr;
    }, [tracks, selIdx]);

    // -- Track spans for arrangement timeline --
    var trackSpans = useMemo(function () {
        return tracks.map(function (tr) {
            if (tr.notes.length === 0) return { start: tr.startTime || 0, dur: tr.sound.duration || 0.3 };
            var maxEnd = 0;
            tr.notes.forEach(function (n) {
                var end = n.time + (n.duration || tr.sound.duration || 0.3);
                if (end > maxEnd) maxEnd = end;
            });
            return { start: tr.startTime || 0, dur: maxEnd };
        });
    }, [tracks]);

    var waveOpts = ["square", "triangle", "sawtooth", "sine", "noise"];
    var filtOpts = ["lowpass", "highpass", "bandpass"];
    var whiteKeys = [0,2,4,5,7,9,11,12,14,16,17,19,21,23];
    var blackKeys = [{n:1,p:6.2},{n:3,p:13.5},{n:6,p:34.8},{n:8,p:42},{n:10,p:49.2},{n:1,p:56.4},{n:3,p:63.6},{n:6,p:84.8},{n:8,p:92}];
    var trkColor = TRACK_COLORS[track.colorIdx];


    // ============================================================
    // RENDER
    // ============================================================

    var WAVE_LABELS = { square: "SQR", triangle: "TRI", sawtooth: "SAW", sine: "SIN", noise: "NSE" };

    return (
        <div className="chipforge-root" style={{ background: C.bg, color: C.text, height: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Segoe UI',system-ui,sans-serif", overflow: "hidden" }}>

            {/* ---- HEADER ---- */}
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: C.accent, letterSpacing: 2, textShadow: "0 0 10px rgba(48,255,96,0.3)" }}>CHIPTUNE FORGE</span>
                    <span style={{ fontSize: 9, color: C.textDim, letterSpacing: 1.5 }}>16-BIT SFX</span>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={exportJSON} style={btnStyle(C.accentDim)}>JSON</button>
                    <button onClick={exportWav} style={btnStyle(C.accent)}>WAV</button>
                </div>
            </div>

            {/* ============================================= */}
            {/* TOP SECTION — Tracks Left / Timeline Right    */}
            {/* ============================================= */}
            <div style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid " + C.border, height: 220, minHeight: 180 }}>

                {/* ---- LEFT: Track List + Selected Info ---- */}
                <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid " + C.border, background: C.panel }}>
                    {/* Track list header */}
                    <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid " + C.border }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: 1.5 }}>TRACKS</span>
                        {tracks.length < 6 && (
                            <button onClick={addTrack} style={Object.assign({}, TINY_BTN, { color: C.accent, border: "1px solid " + C.accentDim, fontSize: 12, width: 20, height: 20 })}>+</button>
                        )}
                    </div>

                    {/* Track rows */}
                    <div style={{ flex: 1, overflowY: "auto" }}>
                        {tracks.map(function (tr, i) {
                            var sel = i === selIdx;
                            var tc = TRACK_COLORS[tr.colorIdx];
                            return (
                                <div key={tr.id} onClick={function () { setSelIdx(i); }}
                                     style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", cursor: "pointer",
                                         background: sel ? "rgba(48,255,96,0.06)" : "transparent",
                                         borderLeft: sel ? "3px solid " + tc : "3px solid transparent",
                                         opacity: tr.muted ? 0.4 : 1 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc, flexShrink: 0, boxShadow: sel ? "0 0 6px " + tc : "none" }} />
                                    <span style={{ fontSize: 11, fontWeight: sel ? 700 : 400, color: sel ? tc : C.text, flex: 1, letterSpacing: 0.3 }}>{tr.name}</span>
                                    <button onClick={function (e) { e.stopPropagation(); toggleMute(i); }} title="Mute"
                                            style={Object.assign({}, TINY_BTN, { color: tr.muted ? C.red : C.textDim, background: tr.muted ? "rgba(204,48,48,0.15)" : "transparent", width: 16, height: 16, fontSize: 7 })}>M</button>
                                    <button onClick={function (e) { e.stopPropagation(); toggleSolo(i); }} title="Solo"
                                            style={Object.assign({}, TINY_BTN, { color: tr.solo ? "#ffcc30" : C.textDim, background: tr.solo ? "rgba(255,204,48,0.15)" : "transparent", width: 16, height: 16, fontSize: 7 })}>S</button>
                                    {tracks.length > 1 && (
                                        <button onClick={function (e) { e.stopPropagation(); deleteTrack(i); }} title="Delete"
                                                style={Object.assign({}, TINY_BTN, { color: C.textDim, width: 16, height: 16, fontSize: 7 })}>×</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Selected track summary */}
                    <div style={{ padding: "8px 10px", borderTop: "1px solid " + C.border, background: "rgba(48,255,96,0.03)" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: trkColor, letterSpacing: 1, marginBottom: 3 }}>{track.name}</div>
                        <div style={{ fontSize: 9, color: C.textDim, lineHeight: 1.6 }}>
                            {WAVE_LABELS[sound.wave] || sound.wave} · {Math.round(sound.pitch)}Hz · {sound.duration}s
                            {sound.delayMix > 0 ? " · echo" : ""}
                            {sound.vibDepth > 0 ? " · vib" : ""}
                        </div>
                        <div style={{ fontSize: 9, color: C.textDim }}>{track.notes.length} notes · start {(track.startTime || 0).toFixed(2)}s</div>
                    </div>
                </div>

                {/* ---- RIGHT: Arrangement Timeline ---- */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    {/* Transport bar — MIXER */}
                    <div style={{ padding: "5px 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid " + C.border, flexShrink: 0, flexWrap: "wrap" }}>
                        <button onClick={playMix} disabled={mixPlaying} style={btnStyle(trkColor)}>▶</button>
                        <button onClick={stopMix} style={btnStyle(C.accentDim)}>⏹</button>
                        <div style={DIVIDER} />
                        <span style={{ fontSize: 9, color: C.textDim, fontWeight: 700, letterSpacing: 1 }}>MIX</span>
                        <div style={DIVIDER} />
                        <span style={{ fontSize: 9, color: C.textDim }}>BPM</span>
                        <input type="number" value={mixBpm} min={40} max={300} onChange={function(e){ setMixBpm(Math.max(40,Math.min(300,parseInt(e.target.value)||120))); }} style={NUM_INPUT} />
                        <span style={{ fontSize: 9, color: C.textDim }}>DUR</span>
                        <input type="number" value={mixDur} min={0.5} max={30} step={0.5} onChange={function(e){ setMixDur(Math.max(0.5,Math.min(30,parseFloat(e.target.value)||4))); }} style={NUM_INPUT} />
                        <span style={{ fontSize: 9, color: C.textDim }}>s</span>
                        <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: mixLoop ? C.accent : C.textDim, cursor: "pointer", userSelect: "none" }}>
                            <input type="checkbox" checked={mixLoop} onChange={function(){ setMixLoop(!mixLoop); }} style={{ accentColor: C.accent, cursor: "pointer" }} />LOOP
                        </label>
                        <div style={{ flex: 1 }} />
                        <button onClick={clearTrackNotes} style={Object.assign({}, btnStyle("#441111"), { fontSize: 9 })}>CLEAR</button>
                    </div>

                    {/* Arrangement timeline — track blocks */}
                    <div ref={blockTlRef} style={{ flex: 1, position: "relative", background: "#080c08", overflow: "hidden", minHeight: 0 }}>
                        {/* Beat grid lines */}
                        {mixBeats.map(function (p, i) {
                            return <div key={i} style={{ position: "absolute", left: (p*100)+"%", top: 0, bottom: 0, width: 1, background: i===0 ? C.border : "rgba(26,46,26,0.3)", pointerEvents: "none" }} />;
                        })}

                        {/* Time markers */}
                        {mixBeats.filter(function(_, i) { return i % 4 === 0; }).map(function (p, i) {
                            return <span key={i} style={{ position: "absolute", left: (p*100)+"%", top: 2, fontSize: 8, color: "rgba(90,138,101,0.3)", pointerEvents: "none", transform: "translateX(2px)" }}>{(p * mixDur).toFixed(1)}s</span>;
                        })}

                        {/* Track lane lines */}
                        {tracks.map(function (tr, i) {
                            var laneH = 100 / Math.max(tracks.length, 1);
                            return <div key={"lane-" + tr.id} style={{ position: "absolute", left: 0, right: 0, top: (i * laneH)+"%", height: 1, background: "rgba(26,46,26,0.2)", pointerEvents: "none" }} />;
                        })}

                        {/* Track blocks */}
                        {tracks.map(function (tr, i) {
                            var tc = TRACK_COLORS[tr.colorIdx];
                            var span = trackSpans[i];
                            var laneH = 100 / Math.max(tracks.length, 1);
                            var startP = (span.start / mixDur) * 100;
                            var widthP = Math.max(2, (span.dur / mixDur) * 100);
                            var sel = i === selIdx;
                            if (tr.muted) return null;
                            var r = parseInt(tc.slice(1,3),16), g = parseInt(tc.slice(3,5),16), b = parseInt(tc.slice(5,7),16);
                            return (
                                <div key={"block-" + tr.id}
                                     onMouseDown={function(e){ onBlockDrag(e, i); setSelIdx(i); }}
                                     title={tr.name + " — drag to move start time (" + span.start.toFixed(2) + "s)"}
                                     style={{
                                         position: "absolute", left: startP+"%", width: widthP+"%",
                                         top: (i * laneH + laneH * 0.15)+"%", height: (laneH * 0.7)+"%",
                                         background: sel ? tc : "rgba(" + r + "," + g + "," + b + ",0.4)",
                                         borderRadius: 3, cursor: "grab", display: "flex", alignItems: "center", paddingLeft: 6,
                                         border: sel ? "1px solid " + tc : "1px solid rgba(" + r + "," + g + "," + b + ",0.5)",
                                         boxShadow: sel ? "0 0 8px " + TRACK_GLOWS[tr.colorIdx] : "none",
                                         opacity: sel ? 1 : 0.7, zIndex: sel ? 5 : 2,
                                         transition: "opacity 0.15s"
                                     }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: sel ? C.bg : tc, letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {tr.name} ({tr.notes.length})
                                    </span>
                                </div>
                            );
                        })}

                        {/* Playhead */}
                        {mixPlaying && (
                            <div style={{ position: "absolute", left: (mixPos*100)+"%", top: 0, bottom: 0, width: 2, background: C.playhead, zIndex: 10, pointerEvents: "none", boxShadow: "0 0 8px rgba(255,64,64,0.5)" }} />
                        )}

                        {/* Empty state */}
                        {tracks.every(function (t) { return t.notes.length === 0; }) && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(90,138,101,0.15)", fontSize: 11, letterSpacing: 1, pointerEvents: "none" }}>
                                RECORD NOTES TO SEE TRACKS HERE
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================= */}
            {/* BOTTOM SECTION — Sound Design + Keyboard      */}
            {/* ============================================= */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                <div style={{ flex: 1, overflow: "auto", background: C.panel }}>

                    {/* Sound Preview Bar — always visible at top */}
                    <div style={{ display: "flex", gap: 6, padding: "6px 10px", borderBottom: "1px solid " + C.border, background: "rgba(48,255,96,0.03)", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: trkColor, letterSpacing: 1, flexShrink: 0 }}>SOUND</span>
                        <button onClick={function(){ eng.current.play(sound, sound.pitch, sound.duration || 0.3); }}
                                style={Object.assign({}, btnStyle(trkColor), { flex: 1, padding: "5px 0", fontSize: 10, fontWeight: 700, letterSpacing: 1 })}>
                            ▶ PREVIEW
                        </button>
                        <Tip tip={TIPS.hold} style={{ flex: 1 }}>
                            <button onMouseDown={onHoldDown} onMouseUp={onHoldUp} onMouseLeave={onHoldUp}
                                    onTouchStart={onHoldDown} onTouchEnd={onHoldUp}
                                    style={Object.assign({}, btnStyle(holding ? C.accent : C.accentDim), {
                                        width: "100%", padding: "5px 0", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                                        boxShadow: holding ? "0 0 16px rgba(48,255,96,0.4)" : "none"
                                    })}>
                                {holding ? "◼ RELEASE" : "⟳ HOLD"}
                            </button>
                        </Tip>
                    </div>

                    {/* Sound Designer Panels */}
                    <Section label="PRESETS" open={panels.presets} onToggle={function(){ togglePanel("presets"); }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {PRESETS.map(function (p, i) {
                                return (
                                    <button key={i} onClick={function () { loadPreset(p); }}
                                            style={{ padding: "3px 7px", fontSize: 9, border: "1px solid " + C.border,
                                                background: "transparent", color: C.textDim, borderRadius: 3, cursor: "pointer" }}>
                                        {p.name}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    {/* Two-column grid for sound design panels */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                        <div style={{ borderRight: "1px solid " + C.border }}>
                            <Section label="WAVEFORM & PITCH" open={panels.wave} onToggle={function(){ togglePanel("wave"); }} color={trkColor}>
                                <Tip tip={TIPS.wave}>
                                    <div style={{ display: "flex", gap: 3, marginBottom: 5, width: "100%" }}>
                                        {waveOpts.map(function (w) {
                                            var a = sound.wave === w;
                                            return <button key={w} onClick={function(){ updateSound("wave",w); }}
                                                           style={chipBtnStyle(a, trkColor)}>{w === "sawtooth" ? "saw" : w}</button>;
                                        })}
                                    </div>
                                </Tip>
                                {sound.wave === "square" && <Slider label="Duty" tip={TIPS.duty} value={sound.duty} min={0.05} max={0.5} step={0.01} onChange={function(v){updateSound("duty",v);}} />}
                                <Slider label="Pitch" tip={TIPS.pitch} value={sound.pitch} min={20} max={2000} step={1} unit="Hz" onChange={function(v){updateSound("pitch",v);}} />
                                <Slider label="Detune" tip={TIPS.detune} value={sound.detune} min={-100} max={100} step={1} unit="¢" onChange={function(v){updateSound("detune",v);}} />
                                <Slider label="Sweep" tip={TIPS.sweep} value={sound.pitchSweep} min={-2000} max={2000} step={10} unit="Hz" onChange={function(v){updateSound("pitchSweep",v);}} />
                                <Slider label="Volume" tip={TIPS.volume} value={sound.gain} min={0} max={1} step={0.01} onChange={function(v){updateSound("gain",v);}} />
                                <Slider label="Duration" tip={TIPS.duration} value={sound.duration} min={0.02} max={3} step={0.01} unit="s" onChange={function(v){updateSound("duration",v);}} />
                            </Section>

                            <Section label="FILTER & VIBRATO" open={panels.filter} onToggle={function(){ togglePanel("filter"); }}>
                                <Tip tip={TIPS.filterType}>
                                    <div style={{ display: "flex", gap: 3, marginBottom: 5, width: "100%" }}>
                                        {filtOpts.map(function (f) {
                                            var a = sound.filterType === f;
                                            return <button key={f} onClick={function(){ updateSound("filterType",f); }} style={chipBtnStyle(a, trkColor)}>{f}</button>;
                                        })}
                                    </div>
                                </Tip>
                                <Slider label="Cutoff" tip={TIPS.cutoff} value={sound.filterFreq} min={20} max={10000} step={10} unit="Hz" onChange={function(v){updateSound("filterFreq",v);}} />
                                <Slider label="Q" tip={TIPS.filterQ} value={sound.filterQ} min={0.1} max={20} step={0.1} onChange={function(v){updateSound("filterQ",v);}} />
                                <Slider label="Vib Rate" tip={TIPS.vibRate} value={sound.vibRate} min={0} max={30} step={0.5} unit="Hz" onChange={function(v){updateSound("vibRate",v);}} />
                                <Slider label="Vib Depth" tip={TIPS.vibDepth} value={sound.vibDepth} min={0} max={100} step={1} unit="¢" onChange={function(v){updateSound("vibDepth",v);}} />
                            </Section>
                        </div>

                        <div>
                            <Section label="ENVELOPE (ADSR)" open={panels.env} onToggle={function(){ togglePanel("env"); }}>
                                <ADSRVis a={sound.attack} d={sound.decay} s={sound.sustain} r={sound.release} />
                                <Slider label="Attack" tip={TIPS.attack} value={sound.attack} min={0.001} max={0.5} step={0.001} unit="s" onChange={function(v){updateSound("attack",v);}} />
                                <Slider label="Decay" tip={TIPS.decay} value={sound.decay} min={0.01} max={1} step={0.01} unit="s" onChange={function(v){updateSound("decay",v);}} />
                                <Slider label="Sustain" tip={TIPS.sustain} value={sound.sustain} min={0} max={1} step={0.01} onChange={function(v){updateSound("sustain",v);}} />
                                <Slider label="Release" tip={TIPS.release} value={sound.release} min={0.01} max={2} step={0.01} unit="s" onChange={function(v){updateSound("release",v);}} />
                            </Section>

                            <Section label="ECHO / DELAY" open={panels.echo} onToggle={function(){ togglePanel("echo"); }}>
                                <Slider label="Time" tip={TIPS.delayTime} value={sound.delayTime} min={0} max={1} step={0.01} unit="s" onChange={function(v){updateSound("delayTime",v);}} />
                                <Slider label="Feedback" tip={TIPS.delayFeedback} value={sound.delayFeedback} min={0} max={0.9} step={0.01} onChange={function(v){updateSound("delayFeedback",v);}} />
                                <Slider label="Mix" tip={TIPS.delayMix} value={sound.delayMix} min={0} max={1} step={0.01} onChange={function(v){updateSound("delayMix",v);}} />
                            </Section>
                        </div>
                    </div>

                    {/* Keyboard & Record — collapsible */}
                    <Section label="KEYBOARD & RECORD" open={panels.keys} onToggle={function(){ togglePanel("keys"); }} color={trkColor}>
                        {/* REC */}
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                            {!isRec ? (
                                <button onClick={startRec} style={Object.assign({}, btnStyle(C.red), { fontWeight: 700, padding: "6px 14px" })}>⏺ REC</button>
                            ) : (
                                <button onClick={stopRec} className="chipforge-rec-pulse" style={Object.assign({}, btnStyle(C.red), { fontWeight: 700, padding: "6px 14px" })}>⏹ {recCount}</button>
                            )}
                            <div style={{ flex: 1, fontSize: 9, color: C.textDim, alignSelf: "center", letterSpacing: 0.5 }}>
                                Record notes to {track.name} at its keyboard BPM grid
                            </div>
                        </div>

                        {/* Octave selector */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, letterSpacing: 1 }}>KEYBOARD</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <button onClick={function(){ setOctave(Math.max(1,octave-1)); }} style={SM_BTN}>−</button>
                                <span style={{ fontSize: 11, color: trkColor, fontWeight: 600, minWidth: 40, textAlign: "center" }}>OCT {octave}</span>
                                <button onClick={function(){ setOctave(Math.min(7,octave+1)); }} style={SM_BTN}>+</button>
                            </div>
                        </div>
                        <div style={{ position: "relative", height: 70, userSelect: "none" }}>
                            <div style={{ display: "flex", height: "100%", gap: 1 }}>
                                {whiteKeys.map(function (nv) {
                                    var ni = nv % 12, act = activeKeys[ni];
                                    return (
                                        <div key={nv} onMouseDown={function(){ handleNoteOn(ni); }}
                                             onTouchStart={function(e){ e.preventDefault(); handleNoteOn(ni); }}
                                             style={{
                                                 flex: 1, background: act ? C.keyActive : C.keyWhite,
                                                 border: "1px solid " + (act ? trkColor : C.border), borderRadius: "0 0 3px 3px",
                                                 cursor: "pointer", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 4
                                             }}>
                                            <span style={{ fontSize: 8, color: act ? trkColor : C.textDim }}>{NOTE_NAMES[ni]}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", pointerEvents: "none" }}>
                                {blackKeys.map(function (bk, i) {
                                    var act = activeKeys[bk.n];
                                    return (
                                        <div key={i} onMouseDown={function(){ handleNoteOn(bk.n); }}
                                             onTouchStart={function(e){ e.preventDefault(); handleNoteOn(bk.n); }}
                                             style={{
                                                 position: "absolute", left: bk.p + "%", width: "5%", height: "100%",
                                                 background: act ? trkColor : C.keyBlack,
                                                 border: "1px solid " + (act ? trkColor : "#1a2a1a"),
                                                 borderRadius: "0 0 2px 2px", cursor: "pointer", pointerEvents: "auto"
                                             }} />
                                    );
                                })}
                            </div>
                        </div>
                    </Section>

                    {/* Keyboard Transport + Note Timeline */}
                    <div style={{ padding: "6px 12px 8px" }}>
                        {/* Keyboard transport bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                            <button onClick={playKey} disabled={keyPlaying} style={btnStyle(trkColor)}>▶</button>
                            <button onClick={stopKey} style={btnStyle(C.accentDim)}>⏹</button>
                            <div style={DIVIDER} />
                            <span style={{ fontSize: 9, color: trkColor, fontWeight: 700, letterSpacing: 1 }}>KEY</span>
                            <div style={DIVIDER} />
                            <button onClick={snapToGrid} style={btnStyle(C.accentDim)}>SNAP</button>
                            <select value={keySnap} onChange={function(e){ setKeySnap(parseInt(e.target.value)); }} style={SELECT_STYLE}>
                                <option value={4}>1/4</option><option value={8}>1/8</option><option value={16}>1/16</option><option value={32}>1/32</option>
                            </select>
                            <div style={DIVIDER} />
                            <span style={{ fontSize: 9, color: C.textDim }}>BPM</span>
                            <input type="number" value={keyBpm} min={40} max={300} onChange={function(e){ setKeyBpm(Math.max(40,Math.min(300,parseInt(e.target.value)||120))); }} style={NUM_INPUT} />
                            <span style={{ fontSize: 9, color: C.textDim }}>DUR</span>
                            <input type="number" value={keyDur} min={0.5} max={30} step={0.5} onChange={function(e){ setKeyDur(Math.max(0.5,Math.min(30,parseFloat(e.target.value)||4))); }} style={NUM_INPUT} />
                            <span style={{ fontSize: 9, color: C.textDim }}>s</span>
                            <label style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: keyLoop ? C.accent : C.textDim, cursor: "pointer", userSelect: "none" }}>
                                <input type="checkbox" checked={keyLoop} onChange={function(){ setKeyLoop(!keyLoop); }} style={{ accentColor: C.accent, cursor: "pointer" }} />LOOP
                            </label>
                            <div style={{ flex: 1 }} />
                            <span style={{ fontSize: 9, color: C.textDim }}>
                                {track.notes.length} notes · {track.name}
                            </span>
                        </div>
                        <div ref={tlRef} style={{
                            height: 120, position: "relative", background: "#080c08", borderRadius: 4,
                            border: "1px solid " + C.border, overflow: "hidden", cursor: "crosshair"
                        }}>
                            {keyBeats.map(function (p, i) {
                                return <div key={i} style={{ position: "absolute", left: (p*100)+"%", top: 0, bottom: 0, width: 1, background: i===0 ? C.border : "rgba(26,46,26,0.4)" }} />;
                            })}
                            {["C","D","E","F","G","A","B"].map(function (n, i) {
                                return <span key={n} style={{ position: "absolute", left: 3, top: (i/7*85+5)+"%", fontSize: 8, color: "rgba(90,138,101,0.25)", pointerEvents: "none" }}>{n}</span>;
                            })}
                            {allNotes.map(function (item, idx) {
                                var n = item.n, xP = (n.time / keyDur) * 100, yP = (1-(n.note%12)/12)*80+5;
                                var isCurrent = item.isSel;
                                return (
                                    <div key={idx}
                                         onMouseDown={isCurrent ? function(e){ onNoteDrag(e, item.ni); } : undefined}
                                         onContextMenu={isCurrent ? function(e){ e.preventDefault(); deleteNote(item.ni); } : function(e){ e.preventDefault(); }}
                                         title={n.name + " @ " + n.time.toFixed(3) + "s" + (isCurrent ? " — drag/right-click delete" : "")}
                                         style={{
                                             position: "absolute", left: xP+"%", top: yP+"%",
                                             width: isCurrent ? 20 : 12, height: isCurrent ? 13 : 8,
                                             marginLeft: isCurrent ? -10 : -6, marginTop: isCurrent ? -6 : -4,
                                             background: item.color, borderRadius: 2,
                                             border: isCurrent ? "1px solid " + item.color : "none",
                                             cursor: isCurrent ? "grab" : "default",
                                             opacity: isCurrent ? 1 : 0.5,
                                             display: "flex", alignItems: "center", justifyContent: "center",
                                             fontSize: 7, fontWeight: 700, color: C.bg, zIndex: isCurrent ? 3 : 1,
                                             boxShadow: "0 0 4px " + item.glow
                                         }}>
                                        {isCurrent ? n.name : ""}
                                    </div>
                                );
                            })}
                            {keyPlaying && (
                                <div style={{ position: "absolute", left: (keyPos*100)+"%", top: 0, bottom: 0, width: 2, background: C.playhead, zIndex: 10, pointerEvents: "none", boxShadow: "0 0 8px rgba(255,64,64,0.5)" }} />
                            )}
                            {allNotes.length === 0 && (
                                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(90,138,101,0.2)", fontSize: 12, letterSpacing: 1, pointerEvents: "none" }}>
                                    HIT REC, PLAY SOME NOTES
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default ChiptuneForge;