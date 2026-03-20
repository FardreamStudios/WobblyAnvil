// ============================================================
// musicData.js — Wobbly Anvil Music Data Module
// Track definitions, melody/bass arrays, rhythm constants,
// beat grid generation, chord analysis, dynamics.
// The "sheet music library" — no playback, no audio context.
// ============================================================

// --- Rhythm QTE Layout Constants ---
var RHYTHM_HIT_WINDOW = 10;
var RHYTHM_PERFECT_WINDOW = 5;
var RHYTHM_SCROLL_PX_PER_MS = 0.14;
var RHYTHM_TRACK_W = 800;
var RHYTHM_HIT_X = 150;

// --- Dynamics (musical volume markings) ---
var DYNAMICS = [
    { label: "pp", multiplier: 0.15 },
    { label: "p",  multiplier: 0.30 },
    { label: "mp", multiplier: 0.45 },
    { label: "mf", multiplier: 0.60 },
    { label: "f",  multiplier: 0.75 },
    { label: "ff", multiplier: 0.90 },
];

function getDynamicVolume(label) {
    var dynamic = DYNAMICS.find(function(d) { return d.label === label; });
    return dynamic ? dynamic.multiplier : 0.60;
}

// --- Track Tempo & Note Durations ---
var BPM = 75;
var QUARTER = 60 / BPM;
var HALF = QUARTER * 2;
var EIGHTH = QUARTER / 2;
var SIXTEENTH = QUARTER / 4;
var DOTTED_QUARTER = QUARTER * 1.5;

// --- Melody (QTE track) ---
var MELODY = [
    [[220, 262, 330], QUARTER], [0, EIGHTH], [[220, 262, 330, 247], EIGHTH],
    [[220, 262, 330], QUARTER], [0, EIGHTH], [[247, 294, 349], EIGHTH],
    [[330, 392, 494], QUARTER], [0, EIGHTH], [[330, 392, 494], EIGHTH],
    [[220, 262, 330, 392], QUARTER], [0, EIGHTH], [[220, 262, 330, 392], EIGHTH],
    [[175, 220, 262], HALF], [0, EIGHTH], [[196, 247, 294], DOTTED_QUARTER],
    [[294, 349, 440, 524], EIGHTH], [[349, 440, 524], EIGHTH],
    [[330, 392, 494], EIGHTH], [[247, 294, 349], EIGHTH],
    [[349, 440, 524, 659], EIGHTH], [[392, 494, 587], EIGHTH],
    [[392, 494, 587, 349], EIGHTH], [[220, 262, 330, 392], EIGHTH],
    [[220, 262, 330], QUARTER], [0, EIGHTH], [[220, 262, 330, 247], EIGHTH],
    [[220, 262, 330], QUARTER], [0, EIGHTH], [[247, 294, 349], EIGHTH],
    [[330, 392, 494], QUARTER], [0, EIGHTH], [[330, 392, 494], EIGHTH],
    [[220, 262, 330, 392], QUARTER], [0, EIGHTH], [[220, 262, 330, 392], EIGHTH],
    [[175, 220, 262], HALF], [0, EIGHTH], [[196, 247, 294], DOTTED_QUARTER],
    [[349, 440, 524, 659], QUARTER], [0, EIGHTH], [[392, 494, 587], EIGHTH],
    [[220, 262, 330, 392], QUARTER], [0, HALF],
    [[220, 262, 330], HALF], [[175, 220, 262], HALF],
];

// --- Bass Line ---
var BASS_A = 55;
var BASS_B = 73;
var BASS_C = 82;
var BASS_D = 87;
var BASS_E = 98;

var BASS = [
    [BASS_A, QUARTER], [BASS_A, QUARTER], [BASS_A, QUARTER], [BASS_A, QUARTER],
    [BASS_B, QUARTER], [BASS_B, QUARTER], [BASS_B, QUARTER], [BASS_B, QUARTER],
    [BASS_A, QUARTER], [0, EIGHTH], [BASS_A, QUARTER], [0, EIGHTH],
    [BASS_C, EIGHTH], [BASS_C, EIGHTH], [BASS_B, EIGHTH], [BASS_D, EIGHTH], [BASS_D, QUARTER], [BASS_E, QUARTER],
    [BASS_A, QUARTER], [BASS_A, QUARTER], [BASS_A, QUARTER], [BASS_A, QUARTER],
    [BASS_B, QUARTER], [BASS_B, QUARTER], [BASS_B, QUARTER], [BASS_B, QUARTER],
    [BASS_A, QUARTER], [0, EIGHTH], [BASS_A, QUARTER], [0, EIGHTH],
    [BASS_D, QUARTER], [0, EIGHTH], [BASS_D, EIGHTH], [BASS_E, QUARTER], [BASS_A, QUARTER],
    [BASS_A, HALF], [BASS_A, HALF],
];

// --- Melody Hit Types (maps each melody entry to a QTE note type) ---
var MELODY_TYPES = [
    "hammer", null, "hammer", "hammer", null, "hammer", "hammer", null, "hammer", "hammer", null, "hammer", "fire", null, "fire",
    "hammer", "hammer", "hammer", "hammer", "fire", "hammer", "hammer", "fire",
    "hammer", null, "hammer", "hammer", null, "hammer", "hammer", null, "hammer", "hammer", null, "hammer", "fire", null, "fire",
    "fire", null, "hammer", "hammer", null, "fire", "fire",
];

// --- Derived: Hit Timings ---
var HITS = (function() {
    var hits = [];
    var time = 0;
    MELODY.forEach(function(entry, index) {
        var type = MELODY_TYPES[index];
        if (type) hits.push([type, time, entry[1]]);
        time += entry[1];
    });
    return hits;
}());

// --- Derived: Track Durations ---
var QTE_TRACK_DURATION = MELODY.reduce(function(sum, note) { return sum + note[1]; }, 0);
var RHYTHM_DURATION = Math.ceil(QTE_TRACK_DURATION * 1000) + 2000;

// --- Track Registry ---
var TRACKS = [{
    id: "forge_anthem",
    name: "The Forge Anthem",
    bpm: BPM,
    beatsPerBar: 4,
    timeSigLabel: "4/4",
    melody: MELODY,
    bass: BASS,
    hits: HITS,
    melodyTypes: MELODY_TYPES,
    trackDuration: QTE_TRACK_DURATION,
    rhythmDuration: RHYTHM_DURATION,
}];

// --- Rhythm Note Generator ---

function generateRhythmNotes(speed) {
    speed = speed || 1.0;
    return HITS.map(function(hit, index) {
        var type = hit[0];
        var beatSec = hit[1];
        var duration = hit[2];
        var isHold = type === "fire";
        return {
            id: index,
            type: type,
            holdMs: isHold ? Math.round((duration * 1000 * 0.7) / speed) : 0,
            spawnMs: (beatSec * 1000) / speed,
            dynamic: hit[3] || null,
            dynamicEnd: hit[4] || null,
            hit: false,
            missed: false,
            headHit: false,
            holdSuccess: false,
        };
    });
}

// --- Music Theory Helpers ---

var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function frequencyToNote(frequency) {
    if (!frequency || frequency <= 0) return null;
    var semitones = 12 * Math.log2(frequency / 440);
    var midi = Math.round(semitones) + 69;
    var name = NOTE_NAMES[((midi % 12) + 12) % 12];
    var octave = Math.floor(midi / 12) - 1;
    return { name: name, octave: octave, midi: midi, full: name + octave };
}

function frequenciesToChord(frequencies) {
    if (!frequencies || !Array.isArray(frequencies) || frequencies.length === 0) return null;
    var filtered = frequencies.filter(function(f) { return f && f > 0; });
    if (filtered.length === 0) return null;
    var notes = filtered.map(frequencyToNote).filter(Boolean);
    if (notes.length === 0) return null;

    var seen = {};
    var unique = [];
    for (var i = 0; i < notes.length; i++) {
        if (!seen[notes[i].name]) { seen[notes[i].name] = true; unique.push(notes[i]); }
    }
    if (unique.length === 1) return unique[0].name;

    var sorted = unique.slice().sort(function(a, b) { return a.midi - b.midi; });
    var root = sorted[0];
    var intervals = [];
    for (var j = 1; j < sorted.length; j++) {
        intervals.push(((sorted[j].midi - root.midi) % 12 + 12) % 12);
    }
    intervals.sort(function(a, b) { return a - b; });

    var has = function(n) { return intervals.indexOf(n) >= 0; };
    var rootName = root.name;

    if (has(4) && has(7) && has(11)) return rootName + "maj7";
    if (has(3) && has(7) && has(10)) return rootName + "m7";
    if (has(4) && has(7) && has(10)) return rootName + "7";
    if (has(4) && has(7) && !has(10) && !has(11)) return rootName;
    if (has(3) && has(7) && !has(10) && !has(11)) return rootName + "m";
    if (has(3) && has(6)) return rootName + "dim";
    if (has(4) && has(8)) return rootName + "aug";
    if (has(5) && has(7) && !has(3) && !has(4)) return rootName + "sus4";
    if (has(2) && has(7) && !has(3) && !has(4)) return rootName + "sus2";
    if (intervals.length === 1 && has(7)) return rootName + "5";
    if (has(4) && has(7) && has(2)) return rootName + "add9";
    return unique.map(function(n) { return n.name; }).join("/");
}

// --- Beat Grid & Chord Timeline Generators ---

function generateBeatGrid(track, speed) {
    speed = speed || 1.0;
    var beatMs = (60 / track.bpm * 1000) / speed;
    var totalMs = track.rhythmDuration;
    var beats = [];
    var beatIndex = 0;
    var time = 0;
    while (time < totalMs) {
        beats.push({ ms: time, isBarStart: (beatIndex % track.beatsPerBar) === 0, beatIndex: beatIndex });
        time += beatMs;
        beatIndex++;
    }
    return beats;
}

function generateChordTimeline(track, speed) {
    speed = speed || 1.0;
    var timeline = [];
    var time = 0;
    for (var i = 0; i < track.melody.length; i++) {
        var entry = track.melody[i];
        var freqs = entry[0];
        var dur = entry[1];
        if (freqs && freqs !== 0) {
            var chord = Array.isArray(freqs) ? frequenciesToChord(freqs) : frequencyToNote(freqs);
            if (chord) {
                var label = typeof chord === "object" ? chord.full : chord;
                if (timeline.length === 0 || timeline[timeline.length - 1].label !== label) {
                    timeline.push({ ms: (time * 1000) / speed, label: label });
                }
            }
        }
        time += dur;
    }
    return timeline;
}

// ============================================================
// Plugin-style API — single export, one entry point
// ============================================================
var GameMusicData = {
    // Layout constants
    RHYTHM_HIT_WINDOW: RHYTHM_HIT_WINDOW,
    RHYTHM_PERFECT_WINDOW: RHYTHM_PERFECT_WINDOW,
    RHYTHM_SCROLL_PX_PER_MS: RHYTHM_SCROLL_PX_PER_MS,
    RHYTHM_TRACK_W: RHYTHM_TRACK_W,
    RHYTHM_HIT_X: RHYTHM_HIT_X,

    // Dynamics
    DYNAMICS: DYNAMICS,
    getDynamicVolume: getDynamicVolume,

    // Track data
    BPM: BPM,
    MELODY: MELODY,
    BASS: BASS,
    MELODY_TYPES: MELODY_TYPES,
    HITS: HITS,
    QTE_TRACK_DURATION: QTE_TRACK_DURATION,
    RHYTHM_DURATION: RHYTHM_DURATION,
    TRACKS: TRACKS,

    // Generators
    generateRhythmNotes: generateRhythmNotes,
    generateBeatGrid: generateBeatGrid,
    generateChordTimeline: generateChordTimeline,

    // Music theory
    NOTE_NAMES: NOTE_NAMES,
    frequencyToNote: frequencyToNote,
    frequenciesToChord: frequenciesToChord,
};

export default GameMusicData;