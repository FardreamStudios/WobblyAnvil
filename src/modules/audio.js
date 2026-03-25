// ============================================================
// audio.js — Wobbly Anvil Audio Module
// Web Audio engine: tone generation, noise, SFX, music playback.
// Exposes useAudio React hook that returns the AudioSystem API.
// Zero game logic. Zero UI.
// ============================================================

import { useRef } from "react";
import GameMusicData from "./musicData.js";

var MELODY = GameMusicData.MELODY;
var BASS = GameMusicData.BASS;
var RHYTHM_SCROLL_PX_PER_MS = GameMusicData.RHYTHM_SCROLL_PX_PER_MS;
var RHYTHM_TRACK_W = GameMusicData.RHYTHM_TRACK_W;
var RHYTHM_HIT_X = GameMusicData.RHYTHM_HIT_X;

// --- Note duration constants (seconds, based on idle BPM ~82) ---
var QUARTER = 0.73;
var HALF = 1.46;
var EIGHTH = 0.37;
var SIXTEENTH = 0.18;
var DOTTED_QUARTER = 1.10;

// --- Idle Shop Melodies ---
var IDLE_MELODIES = [
    [[392, QUARTER], [440, QUARTER], [494, DOTTED_QUARTER], [440, EIGHTH], [392, HALF], [294, QUARTER], [392, QUARTER], [440, HALF], [0, QUARTER]],
    [[659, QUARTER], [587, EIGHTH], [494, EIGHTH], [440, HALF], [0, EIGHTH], [494, QUARTER], [587, QUARTER], [659, DOTTED_QUARTER], [587, EIGHTH], [494, HALF]],
    [[587, QUARTER], [494, QUARTER], [392, DOTTED_QUARTER], [440, EIGHTH], [494, HALF], [392, QUARTER], [440, QUARTER], [494, HALF], [392, HALF]],
    [[196, HALF], [247, QUARTER], [294, QUARTER], [330, DOTTED_QUARTER], [294, EIGHTH], [247, QUARTER], [196, HALF], [0, QUARTER]],
];

// --- Forge Loop Chord Data ---
var CHORD_D = [147, 110, 220];
var CHORD_F = [175, 131, 262];
var PHASE_1A = [175, 131, 262];
var PHASE_1B = [207, 155, 311];
var PHASE_1C = [165, 124, 247];
var PHASE_2A = [208, 156, 311];
var PHASE_2B = [247, 185, 370];
var PHASE_2C = [196, 147, 294];

var FORGE_LOOP = [
    [CHORD_D, EIGHTH], [0, SIXTEENTH], [CHORD_D, EIGHTH], [0, SIXTEENTH], [CHORD_D, EIGHTH], [0, SIXTEENTH], [CHORD_D, EIGHTH], [0, SIXTEENTH],
    [CHORD_D, EIGHTH], [0, SIXTEENTH], [CHORD_D, EIGHTH], [0, SIXTEENTH], [CHORD_D, EIGHTH], [0, SIXTEENTH], [CHORD_D, EIGHTH], [0, SIXTEENTH],
    [PHASE_1A, EIGHTH], [0, SIXTEENTH], [PHASE_1A, EIGHTH], [0, SIXTEENTH], [PHASE_1A, EIGHTH], [0, SIXTEENTH],
    [PHASE_1B, EIGHTH], [0, SIXTEENTH], [PHASE_1B, EIGHTH], [0, SIXTEENTH], [PHASE_1B, EIGHTH], [0, SIXTEENTH],
    [PHASE_1C, EIGHTH], [0, SIXTEENTH], [PHASE_1C, EIGHTH], [0, SIXTEENTH], [PHASE_1C, EIGHTH], [0, SIXTEENTH],
    [CHORD_F, EIGHTH], [0, SIXTEENTH], [CHORD_F, EIGHTH], [0, SIXTEENTH], [CHORD_F, EIGHTH], [0, SIXTEENTH], [CHORD_F, EIGHTH], [0, SIXTEENTH],
    [CHORD_F, EIGHTH], [0, SIXTEENTH], [CHORD_F, EIGHTH], [0, SIXTEENTH], [CHORD_F, EIGHTH], [0, SIXTEENTH], [CHORD_F, EIGHTH], [0, SIXTEENTH],
    [PHASE_2A, EIGHTH], [0, SIXTEENTH], [PHASE_2A, EIGHTH], [0, SIXTEENTH], [PHASE_2A, EIGHTH], [0, SIXTEENTH],
    [PHASE_2B, EIGHTH], [0, SIXTEENTH], [PHASE_2B, EIGHTH], [0, SIXTEENTH], [PHASE_2B, EIGHTH], [0, SIXTEENTH],
    [PHASE_2C, EIGHTH], [0, SIXTEENTH], [PHASE_2C, EIGHTH], [0, SIXTEENTH], [PHASE_2C, EIGHTH], [0, SIXTEENTH],
];

// ============================================================
// useAudio Hook — returns the AudioSystem API object
// ============================================================

function useAudio() {
    var audioRef = useRef(null);

    if (!audioRef.current) {
        var _mode = "off";
        var _timer = null;
        var _modeTimer = null;
        var _ctx = null;
        var _gainNode = null;
        var _sfxGain = null;
        var _musicGain = null;
        var _idleMelodyIndex = 0;
        var _idlePlayed = false;
        var _activeNodes = [];

        // --- Audio Context Setup ---

        function getContext() {
            try {
                if (!_ctx) {
                    _ctx = new (window.AudioContext || window.webkitAudioContext)();
                    _gainNode = _ctx.createGain();
                    _gainNode.gain.setValueAtTime(1.5, 0);
                    _gainNode.connect(_ctx.destination);
                    _sfxGain = _ctx.createGain();
                    _sfxGain.gain.setValueAtTime(0.25, 0);
                    _sfxGain.connect(_gainNode);
                    _musicGain = _ctx.createGain();
                    _musicGain.gain.setValueAtTime(0.45 * 0.25, 0);
                    _musicGain.connect(_gainNode);
                }
                if (_ctx.state === "suspended") _ctx.resume();
                return _ctx;
            } catch (e) {
                return null;
            }
        }

        // --- Core Audio Primitives ---

        function stopMusic() {
            clearTimeout(_timer);
            _activeNodes.forEach(function(node) { try { node.stop(); } catch (e) {} });
            _activeNodes = [];
        }

        function tone(frequency, type, duration, volume, delay) {
            if (volume === undefined) volume = 0.25;
            if (delay === undefined) delay = 0;
            try {
                var ctx = getContext();
                if (!ctx) return;
                var oscillator = ctx.createOscillator();
                var gain = ctx.createGain();
                oscillator.connect(gain);
                gain.connect(_sfxGain);
                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
                gain.gain.setValueAtTime(0, ctx.currentTime + delay);
                gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
                oscillator.start(ctx.currentTime + delay);
                oscillator.stop(ctx.currentTime + delay + duration);
            } catch (e) {}
        }

        function noise(duration, volume, frequency) {
            if (volume === undefined) volume = 0.12;
            if (frequency === undefined) frequency = 800;
            try {
                var ctx = getContext();
                if (!ctx) return;
                var buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
                var data = buffer.getChannelData(0);
                for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
                var source = ctx.createBufferSource();
                var filter = ctx.createBiquadFilter();
                var gain = ctx.createGain();
                filter.type = "bandpass";
                filter.frequency.value = frequency;
                source.buffer = buffer;
                source.connect(filter);
                filter.connect(gain);
                gain.connect(_sfxGain);
                gain.gain.setValueAtTime(volume, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                source.start();
                source.stop(ctx.currentTime + duration);
            } catch (e) {}
        }

        // --- Music Playback ---

        function playNotes(notes, volume) {
            var ctx = getContext();
            if (!ctx) return;
            var time = ctx.currentTime;
            for (var i = 0; i < notes.length; i++) {
                (function(note, startTime) {
                    var freq = note[0];
                    var dur = note[1];
                    var attack = note[2] !== undefined ? note[2] : 0.01;
                    var freqs = Array.isArray(freq) ? freq : [freq];
                    freqs.forEach(function(f) {
                        if (f === 0) return;
                        try {
                            var osc = ctx.createOscillator();
                            var gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(_musicGain);
                            osc.type = "triangle";
                            osc.frequency.setValueAtTime(f, startTime);
                            gain.gain.setValueAtTime(0, startTime);
                            gain.gain.linearRampToValueAtTime(volume, startTime + attack);
                            gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur * 0.75);
                            osc.start(startTime);
                            osc.stop(startTime + dur);
                            _activeNodes.push(osc);
                            osc.onended = function() { _activeNodes = _activeNodes.filter(function(x) { return x !== osc; }); };
                        } catch (e) {}
                    });
                })(notes[i], time);
                time += notes[i][1];
            }
        }

        function noteDuration(notes) {
            return notes.reduce(function(sum, note) { return sum + note[1]; }, 0);
        }

        function playIdleOnce() {
            if (_mode !== "idle") return;
            playNotes(IDLE_MELODIES[_idleMelodyIndex % IDLE_MELODIES.length], 0.055);
        }

        function loopMusic(mode, notes, volume) {
            if (_mode !== mode) return;
            stopMusic();
            playNotes(notes, volume);
            _timer = setTimeout(function() { loopMusic(mode, notes, volume); }, noteDuration(notes) * 1000 + 20);
        }

        function setMode(mode) {
            if (_mode === mode) return;
            stopMusic();
            clearTimeout(_modeTimer);
            _mode = mode;
            _modeTimer = setTimeout(function() {
                if (_mode !== mode) return;
                if (mode === "idle" && !_idlePlayed) {
                    _idlePlayed = true;
                    _idleMelodyIndex = (_idleMelodyIndex + 1) % IDLE_MELODIES.length;
                    playIdleOnce();
                }
                if (mode === "forge") {
                    loopMusic("forge", FORGE_LOOP, 0.12);
                }
            }, 500);
        }

        // --- Build the API Object ---

        audioRef.current = {
            // Mode control
            setMode: setMode,

            // Day reset
            resetDay: function() {
                _idlePlayed = false;
                if (_mode === "idle") {
                    stopMusic();
                    _idleMelodyIndex = (_idleMelodyIndex + 1) % IDLE_MELODIES.length;
                    _idlePlayed = true;
                    setTimeout(playIdleOnce, 500);
                }
            },

            // Context warmup (call on first user interaction)
            warmup: function() { getContext(); },

            // Volume controls
            setSfxVol: function(volume) {
                getContext();
                if (_sfxGain) _sfxGain.gain.setValueAtTime(volume, _ctx.currentTime);
            },
            setMusicVol: function(volume) {
                getContext();
                if (_musicGain) _musicGain.gain.setValueAtTime(volume * 0.45, _ctx.currentTime);
            },

            // --- SFX ---
            click: function() { tone(900, "square", 0.03, 0.07); },

            heat: function(quality) {
                if (quality === "poor" || quality === "bad") { tone(120, "square", 0.08, 0.12); noise(0.1, 0.06, 200); return; }
                var f1 = quality === "perfect" ? 880 : quality === "great" ? 660 : 520;
                var f2 = quality === "perfect" ? 1100 : quality === "great" ? 825 : 650;
                tone(f1, "sine", 0.30, 0.18);
                tone(f2, "sine", 0.30 * 0.75, 0.10);
            },

            hammer: function(quality) {
                if (quality === "miss") { tone(120, "square", 0.08, 0.12); noise(0.1, 0.06, 200); return; }
                var f1 = quality === "perfect" ? 880 : quality === "great" ? 660 : 520;
                var f2 = quality === "perfect" ? 1100 : quality === "great" ? 825 : 650;
                var dur = quality === "perfect" ? 0.55 : 0.30;
                tone(f1, "sine", dur, 0.18);
                tone(f2, "sine", dur * 0.75, 0.10);
            },

            perfect: function() { tone(880, "sine", 0.35, 0.18); tone(1100, "sine", 0.25, 0.1); },
            quench: function() { noise(0.7, 0.2, 1200); tone(180, "sine", 0.5, 0.07); },
            quenchFail: function() { tone(100, "sawtooth", 0.35, 0.25); noise(0.35, 0.2, 150); },
            shatter: function() { noise(0.5, 0.35, 400); tone(80, "sawtooth", 0.3, 0.25); },
            doorbell: function() { tone(660, "sine", 0.14, 0.16); tone(550, "sine", 0.18, 0.12, 0.14); },
            coin: function() { tone(1200, "sine", 0.09, 0.16); tone(1000, "sine", 0.14, 0.12, 0.08); },
            coinLoss: function() { tone(600, "sine", 0.09, 0.16); tone(500, "sine", 0.14, 0.12, 0.08); },
            toast: function() { tone(550, "sine", 0.09, 0.14); tone(660, "sine", 0.11, 0.14, 0.09); },
            royal: function() { tone(440, "sine", 0.12, 0.16); tone(550, "sine", 0.12, 0.16, 0.11); tone(660, "sine", 0.16, 0.18, 0.22); },

            levelup: function() {
                [440, 550, 660, 880].forEach(function(f, i) { tone(f, "sine", 0.18, 0.16, i * 0.08); });
            },

            gameover: function() {
                [220, 196, 174, 130].forEach(function(f, i) {
                    setTimeout(function() { tone(f, "sawtooth", 0.45, 0.25); }, i * 220);
                });
            },

            fanfare: function() {
                var ctx = getContext();
                if (!ctx) return;
                var bpm = 120, q = 60 / bpm, h = q * 2;
                var notes = [
                    { f: 261, start: 0, dur: h },          { f: 261, start: q, dur: h },
                    { f: 261, start: q * 2, dur: h },       { f: 349, start: q * 2 + q * 0.5, dur: h },
                    { f: 440, start: q * 4, dur: h },        { f: 523, start: q * 5, dur: h },
                    { f: 440, start: q * 6, dur: h },        { f: 523, start: q * 6 + q * 0.5, dur: h * 2 },
                ];
                var t = ctx.currentTime + 0.05;
                notes.forEach(function(n) {
                    try {
                        var osc = ctx.createOscillator(), gain = ctx.createGain();
                        osc.connect(gain); gain.connect(_sfxGain); osc.type = "sine";
                        osc.frequency.setValueAtTime(n.f, t + n.start);
                        gain.gain.setValueAtTime(0, t + n.start);
                        gain.gain.linearRampToValueAtTime(0.22, t + n.start + 0.04);
                        gain.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
                        osc.start(t + n.start); osc.stop(t + n.start + n.dur + 0.05);
                    } catch (e) {}
                    try {
                        var osc2 = ctx.createOscillator(), gain2 = ctx.createGain();
                        osc2.connect(gain2); gain2.connect(_sfxGain); osc2.type = "triangle";
                        osc2.frequency.setValueAtTime(n.f, t + n.start);
                        gain2.gain.setValueAtTime(0, t + n.start);
                        gain2.gain.linearRampToValueAtTime(0.08, t + n.start + 0.06);
                        gain2.gain.exponentialRampToValueAtTime(0.001, t + n.start + n.dur);
                        osc2.start(t + n.start); osc2.stop(t + n.start + n.dur + 0.05);
                    } catch (e) {}
                });
            },

            mysteryGood: function() {
                var ctx = getContext();
                if (!ctx) return;
                var t = ctx.currentTime;
                var chords = [[261, 329, 392, 440, 523, 659], [349, 440, 523, 659, 698, 880], [261, 329, 392, 523, 659]];
                var times = [0, 1.8, 3.4];
                var durs = [2.4, 2.4, 2.0];
                chords.forEach(function(chord, ci) {
                    var start = t + times[ci], dur = durs[ci];
                    chord.forEach(function(freq) {
                        [0, 2.5].forEach(function(detune) {
                            try {
                                var osc = ctx.createOscillator(), gain = ctx.createGain();
                                osc.type = "sine";
                                osc.frequency.setValueAtTime(freq * (1 + detune * 0.0003), start);
                                gain.gain.setValueAtTime(0, start);
                                gain.gain.linearRampToValueAtTime(0.06, start + 0.6);
                                gain.gain.linearRampToValueAtTime(0.04, start + dur * 0.7);
                                gain.gain.linearRampToValueAtTime(0, start + dur);
                                osc.connect(gain); gain.connect(_sfxGain);
                                osc.start(start); osc.stop(start + dur);
                            } catch (e) {}
                        });
                    });
                });
            },

            dragonFlyby: function() {
                try {
                    var ctx = getContext();
                    if (!ctx) return;
                    var dur = 6.0;
                    var buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
                    var data = buffer.getChannelData(0);
                    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
                    var source = ctx.createBufferSource();
                    source.buffer = buffer;
                    var filter = ctx.createBiquadFilter();
                    filter.type = "lowpass"; filter.frequency.value = 120; filter.Q.value = 2.0;
                    var gain = ctx.createGain();
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.12);
                    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + dur * 0.6);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
                    source.connect(filter); filter.connect(gain); gain.connect(_sfxGain);
                    source.start(); source.stop(ctx.currentTime + dur);
                } catch (e) {}
            },

            fireTornado: function() {
                try {
                    var ctx = getContext();
                    if (!ctx) return;
                    var dur = 5.5;
                    var buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
                    var data = buffer.getChannelData(0);
                    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
                    var source = ctx.createBufferSource();
                    source.buffer = buffer;
                    var filter1 = ctx.createBiquadFilter();
                    filter1.type = "bandpass";
                    filter1.frequency.setValueAtTime(200, ctx.currentTime);
                    filter1.frequency.linearRampToValueAtTime(600, ctx.currentTime + dur);
                    filter1.Q.value = 0.8;
                    var filter2 = ctx.createBiquadFilter();
                    filter2.type = "highpass"; filter2.frequency.value = 120;
                    var gain = ctx.createGain();
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 0.08);
                    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + dur * 0.6);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
                    source.connect(filter1); filter1.connect(filter2); filter2.connect(gain); gain.connect(_sfxGain);
                    source.start(); source.stop(ctx.currentTime + dur);
                } catch (e) {}
            },

            // --- QTE Music Playback ---
            playTrack: function(speed) {
                var ctx = getContext();
                if (!ctx) return;
                speed = speed || 1.0;
                var volume = 0.10;
                var scrollSpeed = RHYTHM_SCROLL_PX_PER_MS * speed;
                var travelMs = (RHYTHM_TRACK_W - RHYTHM_HIT_X) / scrollSpeed;
                var musicStart = ctx.currentTime + travelMs / 1000;

                // Melody
                var melodyTime = musicStart;
                MELODY.forEach(function(entry) {
                    var freqs = entry[0], dur = entry[1] / speed;
                    var freqArray = Array.isArray(freqs) ? freqs : (freqs ? [freqs] : []);
                    freqArray.forEach(function(freq) {
                        if (!freq) return;
                        try {
                            var osc = ctx.createOscillator(), gain = ctx.createGain();
                            osc.type = "triangle";
                            osc.frequency.setValueAtTime(freq, melodyTime);
                            gain.gain.setValueAtTime(0, melodyTime);
                            gain.gain.linearRampToValueAtTime(volume, melodyTime + 0.015);
                            gain.gain.exponentialRampToValueAtTime(0.001, melodyTime + dur * 0.8);
                            osc.connect(gain); gain.connect(_musicGain);
                            osc.start(melodyTime); osc.stop(melodyTime + dur);
                            _activeNodes.push(osc);
                            osc.onended = function() { _activeNodes = _activeNodes.filter(function(x) { return x !== osc; }); };
                        } catch (e) {}
                    });
                    melodyTime += dur;
                });

                // Bass
                var bassTime = musicStart;
                BASS.forEach(function(entry) {
                    var freq = entry[0], dur = entry[1] / speed;
                    if (freq) {
                        try {
                            var osc = ctx.createOscillator(), gain = ctx.createGain();
                            osc.type = "sine";
                            osc.frequency.setValueAtTime(freq, bassTime);
                            gain.gain.setValueAtTime(0, bassTime);
                            gain.gain.linearRampToValueAtTime(0.45, bassTime + 0.015);
                            gain.gain.exponentialRampToValueAtTime(0.001, bassTime + Math.min(dur * 0.5, 0.25));
                            osc.connect(gain); gain.connect(_musicGain);
                            osc.start(bassTime); osc.stop(bassTime + dur);
                            _activeNodes.push(osc);
                            osc.onended = function() { _activeNodes = _activeNodes.filter(function(x) { return x !== osc; }); };
                        } catch (e) {}
                    }
                    bassTime += dur;
                });
            },

            // Expose tone for rhythm QTE hit sounds
            tone: tone,

            stopQteMusic: function() { stopMusic(); },

            getCurrentRootFreq: function(elapsedMs, speed) {
                speed = speed || 1.0;
                var time = 0;
                for (var i = 0; i < MELODY.length; i++) {
                    var dur = (MELODY[i][1] * 1000) / speed;
                    if (elapsedMs < time + dur) {
                        var freqs = MELODY[i][0];
                        return Array.isArray(freqs) ? freqs[0] : freqs;
                    }
                    time += dur;
                }
                return null;
            },
        };
    }

    return audioRef.current;
}

// ============================================================
// Plugin-style API — single export
// ============================================================
var AudioSystem = {
    useAudio: useAudio,
};

export default AudioSystem;