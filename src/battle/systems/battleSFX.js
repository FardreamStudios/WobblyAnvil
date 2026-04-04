// ============================================================
// battleSFX.js — Battle Sound Effects (Procedural)
//
// Old-school RPG-style synthesized SFX using Web Audio API.
// Routes through the host game's SFX gain node for volume
// respect. Falls back to standalone context if no host audio.
//
// Usage:
//   BattleSFX.init(audioAPI)   — pass game's audio ref (optional)
//   BattleSFX.hit()            — punchy thwack
//   BattleSFX.block()          — metallic clang
//   BattleSFX.impact()         — low rumble (screen shake)
//   BattleSFX.ko()             — dramatic death boom
//
// All functions are safe to call without init — they no-op
// silently if audio isn't available (browser policy, etc).
// ============================================================

var _ctx = null;
var _sfxGain = null;
var _hostAudio = null;

// --- Init / Context ---

function _ensureContext() {
    if (_ctx) return _ctx;

    // Try host audio system first
    if (_hostAudio) {
        try {
            _ctx = _hostAudio.getContext();
            _sfxGain = _hostAudio.getSfxGain();
            return _ctx;
        } catch (e) { /* fall through to standalone */ }
    }

    // Standalone fallback
    try {
        _ctx = new (window.AudioContext || window.webkitAudioContext)();
        _sfxGain = _ctx.createGain();
        _sfxGain.gain.setValueAtTime(0.25, 0);
        _sfxGain.connect(_ctx.destination);
        if (_ctx.state === "suspended") _ctx.resume();
        return _ctx;
    } catch (e) {
        return null;
    }
}

// --- Primitives (mirror audio.js patterns) ---

function _tone(frequency, type, duration, volume, delay) {
    if (volume === undefined) volume = 0.25;
    if (delay === undefined) delay = 0;
    try {
        var ctx = _ensureContext();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(_sfxGain);
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + delay + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
    } catch (e) {}
}

function _noise(duration, volume, frequency) {
    if (volume === undefined) volume = 0.12;
    if (frequency === undefined) frequency = 800;
    try {
        var ctx = _ensureContext();
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

function _sweep(startFreq, endFreq, type, duration, volume, delay) {
    if (volume === undefined) volume = 0.20;
    if (delay === undefined) delay = 0;
    try {
        var ctx = _ensureContext();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(_sfxGain);
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + delay + duration);
        gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
    } catch (e) {}
}

// ============================================================
// SFX Functions — Old School RPG Style
// ============================================================

// Hit — sharp square wave pop + noise crack (like FF6 physical hit)
function hit() {
    _tone(200, "square", 0.06, 0.22);
    _tone(400, "square", 0.04, 0.15, 0.01);
    _noise(0.08, 0.18, 1200);
}

// Block — metallic high-freq ping + short clang (shield parry)
function block() {
    _tone(800, "square", 0.05, 0.16);
    _tone(1200, "sine", 0.08, 0.12, 0.02);
    _tone(600, "triangle", 0.10, 0.08, 0.01);
    _noise(0.04, 0.08, 2000);
}

// Impact — low rumble for screen shake moments
function impact() {
    _sweep(120, 40, "sawtooth", 0.25, 0.20);
    _noise(0.20, 0.14, 150);
    _tone(60, "sine", 0.30, 0.12);
}

// KO — descending boom + noise burst + final thud (dramatic death)
function ko() {
    _sweep(300, 60, "sawtooth", 0.35, 0.25);
    _noise(0.30, 0.25, 400);
    _tone(80, "sine", 0.40, 0.18, 0.05);
    _tone(40, "sine", 0.50, 0.10, 0.15);
    _noise(0.15, 0.12, 100);
}

// Brace Perfect — crisp metallic parry clang (sharper, higher than block)
function bracePerfect() {
    _tone(1000, "square", 0.04, 0.20);
    _tone(1600, "sine", 0.06, 0.16, 0.01);
    _tone(800, "triangle", 0.08, 0.10, 0.02);
    _noise(0.03, 0.10, 3000);
}

// Dodge — quick whoosh (noise burst through bandpass, fast decay)
function dodge() {
    _sweep(600, 200, "sawtooth", 0.12, 0.14);
    _noise(0.10, 0.10, 1000);
}

// Telegraph — rising tension tone before enemy strike (anticipation cue)
function telegraph() {
    _sweep(200, 500, "sine", 0.30, 0.10);
    _sweep(250, 600, "triangle", 0.25, 0.06, 0.05);
}

// QTE Perfect — bright chime/ding (high, clean, rewarding)
function qtePerfect() {
    _tone(1400, "sine", 0.08, 0.18);
    _tone(2100, "sine", 0.12, 0.12, 0.03);
    _tone(1800, "triangle", 0.06, 0.08, 0.01);
}

// QTE Good — softer mid-tone tap/click (acceptable, not celebratory)
function qteGood() {
    _tone(800, "sine", 0.06, 0.14);
    _tone(600, "triangle", 0.04, 0.06, 0.01);
}

// QTE Miss — dull low thud/buzz (flat negative feedback)
function qteMiss() {
    _tone(150, "square", 0.08, 0.12);
    _noise(0.06, 0.08, 300);
}

// Select — light UI tick (short, clean, non-intrusive)
function select() {
    _tone(1100, "sine", 0.04, 0.10);
    _tone(1400, "sine", 0.03, 0.06, 0.02);
}

// Turn Start — FF6 ATB-fill "pip-pip" (two ascending square pips, snappy)
function turnStart() {
    _tone(880, "square", 0.06, 0.14);
    _tone(1175, "square", 0.08, 0.14, 0.06);
}

// Invalid — short low buzz (wrong target, can't do that)
function invalid() {
    _tone(180, "square", 0.08, 0.14);
    _tone(120, "square", 0.06, 0.10, 0.04);
}

// Engage — subtle bass whomp for action cam zoom-in (not obnoxious on repeat)
function engage() {
    _sweep(200, 50, "sine", 0.18, 0.18);
    _tone(80, "square", 0.10, 0.10);
    _noise(0.10, 0.10, 200);
}

// Swing — quick attack whoosh (lighter than dodge, plays on wind-up)
function swing() {
    _sweep(800, 300, "sawtooth", 0.10, 0.14);
    _noise(0.08, 0.10, 1500);
}

// ============================================================
// Loop Primitive — creates looping oscillator(s), returns
// { stop() } handle. stop() fades out over fadeMs then
// disconnects all nodes. Safe to call stop() multiple times.
// ============================================================

function _loopTone(layers, fadeMs) {
    if (fadeMs === undefined) fadeMs = 150;
    try {
        var ctx = _ensureContext();
        if (!ctx) return { stop: function() {} };

        var nodes = [];
        var masterGain = ctx.createGain();
        masterGain.connect(_sfxGain);

        for (var i = 0; i < layers.length; i++) {
            var L = layers[i];
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = L.type || "sine";
            osc.frequency.setValueAtTime(L.freq, ctx.currentTime);
            if (L.detune) osc.detune.setValueAtTime(L.detune, ctx.currentTime);
            gain.gain.setValueAtTime(L.vol || 0.05, ctx.currentTime);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            nodes.push({ osc: osc, gain: gain });
        }

        var stopped = false;
        return {
            stop: function() {
                if (stopped) return;
                stopped = true;
                var now = ctx.currentTime;
                for (var j = 0; j < nodes.length; j++) {
                    nodes[j].gain.gain.setValueAtTime(nodes[j].gain.gain.value, now);
                    nodes[j].gain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
                    nodes[j].osc.stop(now + fadeMs / 1000 + 0.05);
                }
            }
        };
    } catch (e) {
        return { stop: function() {} };
    }
}

// ============================================================
// Starfall SFX
// ============================================================

// Charge Start — ethereal rising sweep (one-shot, plays on declare)
function chargeStart() {
    _sweep(300, 900, "sine", 0.35, 0.08);
    _sweep(350, 1000, "triangle", 0.30, 0.05, 0.05);
    _tone(600, "sine", 0.20, 0.04, 0.15);
}

// Charge Loop — quiet magical hum (looping, plays during charge wait)
// Returns { stop() } handle. Caller must stop on ignition or abort.
function chargeLoop() {
    return _loopTone([
        { freq: 220, type: "sine",     vol: 0.03 },
        { freq: 331, type: "triangle", vol: 0.02, detune: 5 },
    ], 200);
}

// Beam Loop — sustained energy drone (looping, plays during active beam)
// Returns { stop() } handle. Caller must stop on wind-down or abort.
function beamLoop() {
    return _loopTone([
        { freq: 150, type: "sawtooth", vol: 0.04 },
        { freq: 301, type: "sine",     vol: 0.03, detune: 8 },
        { freq: 450, type: "triangle", vol: 0.02 },
    ], 150);
}

// ============================================================
// API
// ============================================================

var BattleSFX = {
    init: function(audioAPI) {
        _hostAudio = audioAPI || null;
        // Reset so next call picks up the new host
        _ctx = null;
        _sfxGain = null;
    },
    hit: hit,
    block: block,
    bracePerfect: bracePerfect,
    dodge: dodge,
    telegraph: telegraph,
    impact: impact,
    ko: ko,
    qtePerfect: qtePerfect,
    qteGood: qteGood,
    qteMiss: qteMiss,
    select: select,
    turnStart: turnStart,
    invalid: invalid,
    engage: engage,
    swing: swing,
    chargeStart: chargeStart,
    chargeLoop: chargeLoop,
    beamLoop: beamLoop,
};

export default BattleSFX;