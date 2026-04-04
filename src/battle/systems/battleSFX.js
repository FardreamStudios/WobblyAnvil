// ============================================================
// battleSFX.js — Battle Sound Effects (Procedural, SNES Style)
//
// 16-bit RPG-style synthesized SFX using Web Audio API.
// Uses FM synthesis, resonant filter sweeps, bit crushing,
// musical intervals, and vibrato LFOs — inspired by Chrono
// Trigger, FF6, Secret of Mana, Zelda ALttP.
//
// Routes through the host game's SFX gain node for volume
// respect. Falls back to standalone context if no host audio.
//
// Usage:
//   BattleSFX.init(audioAPI)   — pass game's audio ref (optional)
//   BattleSFX.hit()            — bit-crushed thwack
//   BattleSFX.block()          — FM metallic clang
//   BattleSFX.impact()         — cinematic chest-thump
//   BattleSFX.ko()             — dramatic minor cascade
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

// ============================================================
// Basic Primitives
// ============================================================

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
// SNES-Style Primitives
// ============================================================

// FM SYNTH — carrier modulated by modulator. Produces bell/metallic tones.
// ratio = mod freq relative to carrier (2 = octave, 1.41 = metallic, 3.5 = bell)
// index = modulation depth (higher = more overtones)
function _fmTone(carrierFreq, ratio, index, duration, volume, delay, carrierType) {
    if (volume === undefined) volume = 0.20;
    if (delay === undefined) delay = 0;
    if (carrierType === undefined) carrierType = "sine";
    try {
        var ctx = _ensureContext();
        if (!ctx) return;
        var t0 = ctx.currentTime + delay;

        var carrier = ctx.createOscillator();
        var modulator = ctx.createOscillator();
        var modGain = ctx.createGain();
        var outGain = ctx.createGain();

        carrier.type = carrierType;
        modulator.type = "sine";
        carrier.frequency.setValueAtTime(carrierFreq, t0);
        modulator.frequency.setValueAtTime(carrierFreq * ratio, t0);

        // Mod index decays — bell-like envelope on overtones
        modGain.gain.setValueAtTime(carrierFreq * index, t0);
        modGain.gain.exponentialRampToValueAtTime(0.01, t0 + duration * 0.6);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(outGain);
        outGain.connect(_sfxGain);

        // Percussive envelope — fast attack, exponential decay
        outGain.gain.setValueAtTime(0, t0);
        outGain.gain.linearRampToValueAtTime(volume, t0 + 0.005);
        outGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        modulator.start(t0);
        carrier.start(t0);
        modulator.stop(t0 + duration);
        carrier.stop(t0 + duration);
    } catch (e) {}
}

// PORTAMENTO TONE — glides from one pitch to another (musical bend)
function _portTone(fromFreq, toFreq, glideMs, type, duration, volume, delay) {
    if (volume === undefined) volume = 0.20;
    if (delay === undefined) delay = 0;
    try {
        var ctx = _ensureContext();
        if (!ctx) return;
        var t0 = ctx.currentTime + delay;

        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(fromFreq, t0);
        osc.frequency.exponentialRampToValueAtTime(toFreq, t0 + glideMs / 1000);
        osc.connect(gain);
        gain.connect(_sfxGain);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
        osc.start(t0);
        osc.stop(t0 + duration);
    } catch (e) {}
}

// VIBRATO TONE — oscillator with LFO-modulated frequency (expressive pitch wobble)
function _vibTone(frequency, type, duration, volume, vibRate, vibDepth, delay) {
    if (volume === undefined) volume = 0.20;
    if (vibRate === undefined) vibRate = 6;
    if (vibDepth === undefined) vibDepth = 8;
    if (delay === undefined) delay = 0;
    try {
        var ctx = _ensureContext();
        if (!ctx) return;
        var t0 = ctx.currentTime + delay;

        var osc = ctx.createOscillator();
        var lfo = ctx.createOscillator();
        var lfoGain = ctx.createGain();
        var outGain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, t0);
        lfo.frequency.setValueAtTime(vibRate, t0);
        lfoGain.gain.setValueAtTime(vibDepth, t0);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(outGain);
        outGain.connect(_sfxGain);

        outGain.gain.setValueAtTime(0, t0);
        outGain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
        outGain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.start(t0);
        lfo.start(t0);
        osc.stop(t0 + duration);
        lfo.stop(t0 + duration);
    } catch (e) {}
}

// FILTER SWEEP — noise through resonant lowpass for "juicy" analog whooshes
function _filterSweep(startFreq, endFreq, duration, volume, resonance, delay, noiseType) {
    if (volume === undefined) volume = 0.25;
    if (resonance === undefined) resonance = 8;
    if (delay === undefined) delay = 0;
    if (noiseType === undefined) noiseType = "white";
    try {
        var ctx = _ensureContext();
        if (!ctx) return;
        var t0 = ctx.currentTime + delay;

        var buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        var last = 0;
        for (var i = 0; i < data.length; i++) {
            var white = Math.random() * 2 - 1;
            if (noiseType === "pink") {
                last = (last + white * 0.02) * 0.99;
                data[i] = last * 3;
            } else {
                data[i] = white;
            }
        }

        var source = ctx.createBufferSource();
        var filter = ctx.createBiquadFilter();
        var gain = ctx.createGain();
        filter.type = "lowpass";
        filter.Q.setValueAtTime(resonance, t0);
        filter.frequency.setValueAtTime(startFreq, t0);
        filter.frequency.exponentialRampToValueAtTime(Math.max(50, endFreq), t0 + duration);

        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(_sfxGain);
        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
        source.start(t0);
        source.stop(t0 + duration);
    } catch (e) {}
}

// BIT CRUSH CURVE — builds a stepped transfer function for waveshaping
function _makeBitcrushCurve(bits) {
    var samples = 4096;
    var curve = new Float32Array(samples);
    var step = Math.pow(0.5, bits - 1);
    for (var i = 0; i < samples; i++) {
        var x = (i * 2) / samples - 1;
        curve[i] = Math.round(x / step) * step;
    }
    return curve;
}

// BIT-CRUSHED TONE — oscillator through waveshaper for lo-fi grit
function _crushTone(frequency, type, duration, volume, bits, delay) {
    if (volume === undefined) volume = 0.20;
    if (bits === undefined) bits = 4;
    if (delay === undefined) delay = 0;
    try {
        var ctx = _ensureContext();
        if (!ctx) return;
        var t0 = ctx.currentTime + delay;

        var osc = ctx.createOscillator();
        var shaper = ctx.createWaveShaper();
        var gain = ctx.createGain();

        shaper.curve = _makeBitcrushCurve(bits);
        shaper.oversample = "none";

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, t0);
        osc.connect(shaper);
        shaper.connect(gain);
        gain.connect(_sfxGain);

        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(volume, t0 + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
        osc.start(t0);
        osc.stop(t0 + duration);
    } catch (e) {}
}

// ============================================================
// Loop Primitives — return { stop() } handle.
// stop() fades out over fadeMs then disconnects all nodes.
// Safe to call stop() multiple times.
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

// Loop with vibrato — richer sustained drones with per-layer LFO modulation
function _loopVib(layers, fadeMs) {
    if (fadeMs === undefined) fadeMs = 150;
    try {
        var ctx = _ensureContext();
        if (!ctx) return { stop: function() {} };

        var allNodes = [];
        var masterGain = ctx.createGain();
        masterGain.connect(_sfxGain);

        for (var i = 0; i < layers.length; i++) {
            var L = layers[i];
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = L.type || "sine";
            osc.frequency.setValueAtTime(L.freq, ctx.currentTime);
            if (L.detune) osc.detune.setValueAtTime(L.detune, ctx.currentTime);

            // Per-layer vibrato LFO (optional)
            if (L.vibRate) {
                var lfo = ctx.createOscillator();
                var lfoGain = ctx.createGain();
                lfo.frequency.setValueAtTime(L.vibRate, ctx.currentTime);
                lfoGain.gain.setValueAtTime(L.vibDepth || 4, ctx.currentTime);
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start();
                allNodes.push({ lfo: lfo });
            }

            gain.gain.setValueAtTime(L.vol || 0.05, ctx.currentTime);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start();
            allNodes.push({ osc: osc, gain: gain });
        }

        var stopped = false;
        return {
            stop: function() {
                if (stopped) return;
                stopped = true;
                var now = ctx.currentTime;
                for (var j = 0; j < allNodes.length; j++) {
                    var n = allNodes[j];
                    if (n.gain) {
                        n.gain.gain.setValueAtTime(n.gain.gain.value, now);
                        n.gain.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
                        n.osc.stop(now + fadeMs / 1000 + 0.05);
                    } else if (n.lfo) {
                        n.lfo.stop(now + fadeMs / 1000 + 0.05);
                    }
                }
            }
        };
    } catch (e) {
        return { stop: function() {} };
    }
}

// ============================================================
// SFX Functions — 16-bit SNES Style
// ============================================================

// Hit — bit-crushed sub thump + mid crack + resonant filter crack (FF6 physical hit vibe)
function hit() {
    _crushTone(120, "square", 0.06, 0.22, 3);
    _crushTone(240, "square", 0.04, 0.14, 4, 0.005);
    _filterSweep(4000, 300, 0.08, 0.25, 6);
    _noise(0.03, 0.10, 3500);
}

// Block — FM metallic bell clang with shimmer edge (shield parry)
function block() {
    _fmTone(880, 1.41, 3, 0.15, 0.22);
    _fmTone(1320, 2, 2, 0.10, 0.14, 0.01);
    _fmTone(440, 1.41, 4, 0.20, 0.10, 0.005, "triangle");
    _filterSweep(6000, 800, 0.06, 0.12, 10);
}

// Impact — cinematic chest-thump boom (FF6 Ultima vibe)
function impact() {
    _crushTone(45, "sine", 0.45, 0.30, 6);
    _portTone(180, 35, 200, "sawtooth", 0.30, 0.22);
    _filterSweep(800, 60, 0.25, 0.20, 12, 0, "pink");
    _crushTone(90, "square", 0.12, 0.14, 4, 0.02);
    _noise(0.08, 0.08, 100);
}

// KO — descending A minor arpeggio + cascade + final thud (dramatic death)
function ko() {
    // A minor descending: A5, E5, C5, A4, E4, A3
    _fmTone(880, 2, 3, 0.20, 0.22, 0);
    _fmTone(659, 2, 3, 0.25, 0.22, 0.08);
    _fmTone(523, 2, 3, 0.30, 0.22, 0.16);
    _fmTone(440, 2, 3, 0.35, 0.22, 0.24);
    _fmTone(329, 2, 3, 0.40, 0.22, 0.32);
    _fmTone(220, 2, 3, 0.50, 0.22, 0.40);
    // Underlying boom
    _crushTone(55, "sine", 0.70, 0.20, 4, 0.05);
    _filterSweep(2000, 80, 0.60, 0.16, 8, 0.10, "pink");
    // Final thud
    _tone(40, "sine", 0.30, 0.12, 0.55);
}

// Brace Perfect — triumphant C major chord bell (C-E-G-C FM bells)
function bracePerfect() {
    _fmTone(1046, 3.5, 2, 0.18, 0.18);           // C6
    _fmTone(1318, 3.5, 2, 0.18, 0.16, 0.015);    // E6
    _fmTone(1568, 3.5, 2, 0.20, 0.14, 0.03);     // G6
    _fmTone(2093, 3.5, 1.5, 0.12, 0.08, 0.05);   // C7 high sparkle
    _filterSweep(8000, 2000, 0.06, 0.10, 8);     // shimmer top
}

// Dodge — snappy high-pitched dash whoosh with pitched edge
function dodge() {
    _filterSweep(6000, 300, 0.09, 0.22, 9);
    _portTone(1400, 200, 70, "triangle", 0.08, 0.10);
}

// Telegraph — dissonant rising minor 2nd (horror movie tension)
function telegraph() {
    _vibTone(220, "triangle", 0.32, 0.10, 8, 10);
    _vibTone(233, "sine", 0.30, 0.06, 7, 8, 0.02);
    _portTone(180, 480, 280, "sine", 0.32, 0.08, 0.05);
    _filterSweep(400, 1200, 0.28, 0.06, 6, 0.08);
}

// QTE Perfect — ascending C major arpeggio bell cascade (Zelda chest vibe)
function qtePerfect() {
    _fmTone(1046, 3.5, 2, 0.10, 0.18);           // C6
    _fmTone(1318, 3.5, 2, 0.10, 0.18, 0.04);     // E6
    _fmTone(1568, 3.5, 2, 0.12, 0.18, 0.08);     // G6
    _fmTone(2093, 3.5, 1.5, 0.16, 0.16, 0.12);   // C7
    _fmTone(2637, 3.5, 1, 0.10, 0.08, 0.16);     // E7 sparkle
}

// QTE Good — two-note perfect fifth confirm (G5 + D6, warm satisfied)
function qteGood() {
    _fmTone(784, 3, 2, 0.10, 0.18);
    _fmTone(1175, 3, 1.5, 0.12, 0.12, 0.02);
}

// QTE Miss — descending bit-crushed minor third (clearly wrong)
function qteMiss() {
    _crushTone(330, "square", 0.08, 0.14, 3);
    _crushTone(275, "square", 0.10, 0.12, 3, 0.04);
    _noise(0.06, 0.06, 200);
}

// Select — crisp pitched blip with upward bend (UI tick)
function select() {
    _portTone(900, 1400, 20, "sine", 0.04, 0.14);
    _fmTone(1800, 2, 1, 0.03, 0.08, 0.01);
}

// Turn Start — ascending G major arpeggio flourish (FF ATB ready)
function turnStart() {
    _fmTone(784, 2.5, 1.5, 0.05, 0.16);          // G5
    _fmTone(988, 2.5, 1.5, 0.05, 0.16, 0.04);    // B5
    _fmTone(1175, 2.5, 1.5, 0.06, 0.16, 0.08);   // D6
    _fmTone(1568, 2.5, 1.2, 0.08, 0.14, 0.12);   // G6
}

// Invalid — descending diminished buzz (wrong action)
function invalid() {
    _crushTone(220, "sawtooth", 0.08, 0.18, 2);
    _crushTone(156, "sawtooth", 0.10, 0.14, 2, 0.04);
    _noise(0.06, 0.08, 150);
}

// Engage — cinematic bass drop + filter sweep (cam zoom-in)
function engage() {
    _portTone(400, 50, 150, "sawtooth", 0.22, 0.24);
    _crushTone(50, "sine", 0.25, 0.20, 4);
    _filterSweep(4000, 200, 0.20, 0.16, 10);
    _fmTone(80, 2, 2, 0.18, 0.10, 0.03);
}

// Swing — snappy pitched whoosh with resonant filter sweep
function swing() {
    _filterSweep(5000, 500, 0.10, 0.24, 10);
    _portTone(1200, 300, 80, "sawtooth", 0.09, 0.10);
}

// ============================================================
// Starfall SFX
// ============================================================

// Charge Start — ethereal magical rise with bell at peak (Chrono Trigger spell)
function chargeStart() {
    _portTone(200, 1400, 400, "sine", 0.45, 0.10);
    _portTone(300, 1600, 400, "triangle", 0.42, 0.06, 0.02);
    _filterSweep(500, 6000, 0.40, 0.12, 10, 0);
    // Bells at peak
    _fmTone(1568, 3.5, 2, 0.20, 0.12, 0.35);     // G6
    _fmTone(2093, 3.5, 1.5, 0.15, 0.08, 0.38);   // C7
    _fmTone(2637, 3.5, 1, 0.12, 0.05, 0.42);     // E7
}

// Charge Loop — rich magical hum with slow vibrato + harmonic stack
// Returns { stop() } handle. Caller must stop on ignition or abort.
function chargeLoop() {
    return _loopVib([
        { freq: 220, type: "sine",     vol: 0.030, vibRate: 3.5, vibDepth: 3 },
        { freq: 330, type: "triangle", vol: 0.022, detune: 5, vibRate: 4, vibDepth: 2 },
        { freq: 440, type: "sine",     vol: 0.016, detune: -3 },
        { freq: 660, type: "sine",     vol: 0.010, detune: 7, vibRate: 5, vibDepth: 4 },
    ], 200);
}

// Beam Loop — sustained power drone with chorus + vibrato
// Returns { stop() } handle. Caller must stop on wind-down or abort.
function beamLoop() {
    return _loopVib([
        { freq: 110, type: "sawtooth", vol: 0.045 },
        { freq: 165, type: "sawtooth", vol: 0.035, detune: 8 },
        { freq: 220, type: "sine",     vol: 0.030, detune: -5, vibRate: 5, vibDepth: 3 },
        { freq: 330, type: "triangle", vol: 0.022, detune: 10 },
        { freq: 440, type: "sine",     vol: 0.015, detune: -7, vibRate: 6, vibDepth: 4 },
        { freq: 660, type: "sine",     vol: 0.010, detune: 4 },
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