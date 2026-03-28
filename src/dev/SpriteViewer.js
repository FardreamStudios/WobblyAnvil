// ============================================================
// SpriteViewer.js — Dev Tool: Sprite Animation Viewer/Editor
// Tests sprite sheet animations using the exact same rendering
// approach as the in-game SpriteSheet component (CSS bg-position
// stepping on a div). Dev-only — never included in production.
//
// Access: localhost:3000/dev/sprite-viewer
//
// Features:
//   - Load any PNG sprite sheet
//   - Auto-slice frames from sheet dimensions
//   - Manual override for frameWidth/frameHeight/colCount
//   - Custom frame sequence (e.g. "1,2,3,2,1")
//   - FPS slider, play/pause/step controls
//   - Zoom slider (1x-8x)
//   - Background brightness slider (black ↔ white)
//   - Toggleable grid overlay
//   - Loop toggle
//   - imageRendering toggle (auto vs pixelated)
//   - Export block matching SpriteSheet component props
// ============================================================

import { useState, useEffect, useRef } from "react";

// ============================================================
// CONSTANTS
// ============================================================
var DEFAULT_FPS = 8;
var MIN_FPS = 1;
var MAX_FPS = 30;
var DEFAULT_ZOOM = 1;
var MIN_ZOOM = 0.05;
var MAX_ZOOM = 8;
var DEFAULT_BG_BRIGHTNESS = 0;
var GRID_SIZE = 32;
var GRID_COLOR_LIGHT = "rgba(255,255,255,0.07)";
var GRID_COLOR_DARK = "rgba(0,0,0,0.15)";
var CHECKER_SIZE = 8;

// ============================================================
// STYLES
// ============================================================
var S = {
    shell: {
        width: "100%", minHeight: "100vh",
        background: "#0a0a0a", color: "#ccc",
        fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace",
        fontSize: "11px", display: "flex", flexDirection: "row",
    },
    panel: {
        width: 280, minWidth: 280, maxWidth: 280,
        background: "#111", borderRight: "1px solid #333",
        overflowY: "auto", padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 6,
    },
    sandbox: {
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", position: "relative",
    },
    sandboxInner: {
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "center", overflow: "hidden",
        position: "relative",
    },
    strip: {
        height: 80, minHeight: 80,
        borderTop: "1px solid #333", background: "#0d0d0d",
        display: "flex", alignItems: "center",
        overflowX: "auto", overflowY: "hidden",
        gap: 4, padding: "0 12px",
    },
    sec: {
        borderBottom: "1px solid #222", paddingBottom: 8, marginBottom: 2,
    },
    secTitle: {
        fontSize: "10px", fontWeight: 700, color: "#f59e0b",
        letterSpacing: 2, textTransform: "uppercase", marginBottom: 6,
    },
    row: {
        display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
    },
    label: {
        color: "#888", fontSize: "10px", minWidth: 70, flexShrink: 0,
    },
    input: {
        flex: 1, background: "#0a0a0a", border: "1px solid #333",
        color: "#fff", padding: "4px 6px", fontSize: "10px",
        fontFamily: "inherit", borderRadius: 3, outline: "none",
        boxSizing: "border-box",
    },
    slider: {
        flex: 1, accentColor: "#f59e0b", cursor: "pointer",
    },
    btn: {
        padding: "8px 12px", background: "#00ffaa", color: "#0d0d0d",
        border: "none", fontWeight: 700, fontSize: "10px",
        fontFamily: "inherit", textTransform: "uppercase",
        letterSpacing: 1.5, cursor: "pointer", borderRadius: 3,
        textAlign: "center",
    },
    btnSm: {
        padding: "6px 10px", background: "#1a1a1a", color: "#ccc",
        border: "1px solid #333", fontWeight: 600, fontSize: "10px",
        fontFamily: "inherit", cursor: "pointer", borderRadius: 3,
        textAlign: "center", flex: 1,
    },
    btnActive: {
        background: "#f59e0b", color: "#0d0d0d", border: "1px solid #f59e0b",
    },
    cb: {
        display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        fontSize: "10px", color: "#888", marginBottom: 4, userSelect: "none",
    },
    cbi: {
        accentColor: "#00ffaa", width: 14, height: 14, cursor: "pointer",
    },
    stepBtn: {
        width: 24, height: 24, background: "#1a1a1a", color: "#ccc",
        border: "1px solid #333", borderRadius: 3, cursor: "pointer",
        fontSize: "13px", fontWeight: 700, fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, padding: 0, lineHeight: 1,
    },
    ea: {
        width: "100%", background: "#0a0a0a", border: "1px solid #333",
        color: "#00ffaa", fontFamily: "inherit", fontSize: "10px",
        padding: 8, borderRadius: 3, resize: "vertical", minHeight: 60,
        outline: "none", boxSizing: "border-box",
    },
    info: {
        color: "#555", fontSize: "10px", marginBottom: 4,
    },
};

// ============================================================
// HELPERS
// ============================================================
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function parseSequence(str, frameCount) {
    if (!str || !str.trim()) return null;
    var parts = str.split(",");
    var seq = [];
    for (var i = 0; i < parts.length; i++) {
        var n = parseInt(parts[i].trim(), 10);
        if (!isNaN(n) && n >= 0 && n < frameCount) {
            seq.push(n);
        }
    }
    return seq.length > 0 ? seq : null;
}

function makeCheckerboard(size, brightness) {
    var bg = Math.round(brightness * 255);
    var alt = clamp(bg + (brightness > 0.5 ? -20 : 20), 0, 255);
    return "repeating-conic-gradient(rgb(" + alt + "," + alt + "," + alt + ") 0% 25%, " +
        "rgb(" + bg + "," + bg + "," + bg + ") 0% 50%) 0 0 / " +
        (size * 2) + "px " + (size * 2) + "px";
}

function makeGrid(size, brightness) {
    var lineColor = brightness > 0.5 ? GRID_COLOR_DARK : GRID_COLOR_LIGHT;
    return "repeating-linear-gradient(0deg, transparent, transparent " + (size - 1) + "px, " + lineColor + " " + (size - 1) + "px, " + lineColor + " " + size + "px)," +
        "repeating-linear-gradient(90deg, transparent, transparent " + (size - 1) + "px, " + lineColor + " " + (size - 1) + "px, " + lineColor + " " + size + "px)";
}

function buildExportConfig(state) {
    var cfg = {
        sheet: state.fileName || "\"<path>\"",
        frames: state.frames,
        fps: state.fps,
        frameWidth: state.frameW,
        frameHeight: state.frameH,
    };
    if (state.colCount !== state.frames) {
        cfg.colCount = state.colCount;
    }
    cfg.loop = state.loop;
    if (state.imageRendering !== "auto") {
        cfg.imageRendering = state.imageRendering;
    }
    return JSON.stringify(cfg, null, 2);
}

// ============================================================
// COMPONENT
// ============================================================
function SpriteViewer() {
    // --- Image state ---
    var [imgSrc, setImgSrc] = useState(null);
    var [imgW, setImgW] = useState(0);
    var [imgH, setImgH] = useState(0);
    var [fileName, setFileName] = useState("");

    // --- Frame config ---
    var [frames, setFrames] = useState(1);
    var [frameW, setFrameW] = useState(64);
    var [frameH, setFrameH] = useState(64);
    var [colCount, setColCount] = useState(1);
    var [autoSlice, setAutoSlice] = useState(true);

    // --- Playback ---
    var [fps, setFps] = useState(DEFAULT_FPS);
    var [playing, setPlaying] = useState(false);
    var [loop, setLoop] = useState(true);
    var [currentFrame, setCurrentFrame] = useState(0);
    var [sequenceStr, setSequenceStr] = useState("");
    var frameRef = useRef(0);
    var intervalRef = useRef(null);

    // --- View ---
    var [zoom, setZoom] = useState(DEFAULT_ZOOM);
    var [bgBrightness, setBgBrightness] = useState(DEFAULT_BG_BRIGHTNESS);
    var [showGrid, setShowGrid] = useState(true);
    var [imageRendering, setImageRendering] = useState("pixelated");

    // --- Export ---
    var [showExport, setShowExport] = useState(false);

    // --- Derived ---
    var sequence = parseSequence(sequenceStr, frames);
    var totalSeqFrames = sequence ? sequence.length : frames;

    // --- Auto-slice when frames change ---
    useEffect(function() {
        if (!autoSlice || !imgW || !imgH || frames < 1) return;
        var cols = frames;
        var w = Math.floor(imgW / cols);
        var h = imgH;
        // If calculated width is unreasonably small, try multi-row
        if (w < 4 && frames > 1) {
            var bestCols = Math.ceil(Math.sqrt(frames));
            cols = bestCols;
            w = Math.floor(imgW / cols);
            h = Math.floor(imgH / Math.ceil(frames / cols));
        }
        setFrameW(w);
        setFrameH(h);
        setColCount(cols);
    }, [frames, imgW, imgH, autoSlice]);

    // --- Playback loop ---
    useEffect(function() {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (!playing || totalSeqFrames <= 1) return;

        var msPerFrame = Math.round(1000 / fps);
        intervalRef.current = setInterval(function() {
            var next = frameRef.current + 1;
            if (next >= totalSeqFrames) {
                if (loop) {
                    next = 0;
                } else {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    setPlaying(false);
                    return;
                }
            }
            frameRef.current = next;
            setCurrentFrame(next);
        }, msPerFrame);

        return function() {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [playing, fps, loop, totalSeqFrames]);

    // --- Keep frameRef in sync with state ---
    useEffect(function() { frameRef.current = currentFrame; }, [currentFrame]);

    // --- Resolve actual sprite frame index ---
    var spriteFrame = sequence ? (sequence[currentFrame] || 0) : currentFrame;

    // --- SpriteSheet-identical rendering math ---
    var cols = colCount || frames;
    var col = spriteFrame % cols;
    var row = Math.floor(spriteFrame / cols);
    var bgX = -(col * frameW);
    var bgY = -(row * frameH);
    var totalRows = Math.ceil(frames / cols);

    // --- Handlers ---
    function handleFileChange(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        setFileName(file.name);
        var reader = new FileReader();
        reader.onload = function(ev) {
            var src = ev.target.result;
            var img = new Image();
            img.onload = function() {
                setImgW(img.naturalWidth);
                setImgH(img.naturalHeight);
                setImgSrc(src);
                // Auto-detect: assume single row, square frames
                var detectedFrames = 1;
                var detectedW = img.naturalWidth;
                var detectedH = img.naturalHeight;
                if (img.naturalHeight > 0 && img.naturalWidth > img.naturalHeight) {
                    var guess = Math.round(img.naturalWidth / img.naturalHeight);
                    if (guess >= 1) {
                        detectedFrames = guess;
                        detectedW = Math.floor(img.naturalWidth / guess);
                        detectedH = img.naturalHeight;
                    }
                }
                setFrames(detectedFrames);
                setFrameW(detectedW);
                setFrameH(detectedH);
                setColCount(detectedFrames);
                setCurrentFrame(0);
                frameRef.current = 0;
                setPlaying(false);
                setAutoSlice(true);
                setSequenceStr("");
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    }

    function handleFramesChange(e) {
        var v = parseInt(e.target.value, 10);
        if (isNaN(v) || v < 1) v = 1;
        setFrames(v);
        setCurrentFrame(0);
        frameRef.current = 0;
    }

    function handleFrameWChange(e) {
        var v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v > 0) { setFrameW(v); setAutoSlice(false); }
    }

    function handleFrameHChange(e) {
        var v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v > 0) { setFrameH(v); setAutoSlice(false); }
    }

    function handleColCountChange(e) {
        var v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v > 0) { setColCount(v); setAutoSlice(false); }
    }

    function stepForward() {
        var next = currentFrame + 1;
        if (next >= totalSeqFrames) next = loop ? 0 : totalSeqFrames - 1;
        setCurrentFrame(next);
        frameRef.current = next;
    }

    function stepBack() {
        var prev = currentFrame - 1;
        if (prev < 0) prev = loop ? totalSeqFrames - 1 : 0;
        setCurrentFrame(prev);
        frameRef.current = prev;
    }

    function togglePlay() {
        if (!imgSrc || totalSeqFrames <= 1) return;
        if (!playing && currentFrame >= totalSeqFrames - 1 && !loop) {
            setCurrentFrame(0);
            frameRef.current = 0;
        }
        setPlaying(!playing);
    }

    function handleStripClick(idx) {
        setCurrentFrame(idx);
        frameRef.current = idx;
    }

    // --- Sandbox background ---
    var bgVal = Math.round(bgBrightness * 255);
    var sandboxBg = "rgb(" + bgVal + "," + bgVal + "," + bgVal + ")";

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div style={S.shell}>
            {/* ======== LEFT PANEL ======== */}
            <div style={S.panel}>
                {/* Title */}
                <div style={{ fontSize: 13, color: "#f59e0b", letterSpacing: 3, fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>
                    SPRITE VIEWER
                </div>

                {/* --- File --- */}
                <div style={S.sec}>
                    <div style={S.secTitle}>Source</div>
                    <input
                        type="file" accept=".png,.jpg,.jpeg,.gif,.webp"
                        onChange={handleFileChange}
                        style={Object.assign({}, S.input, { padding: "6px 4px", cursor: "pointer" })}
                    />
                    {imgSrc && (
                        <div style={S.info}>
                            {fileName} — {imgW}×{imgH}
                        </div>
                    )}
                </div>

                {/* --- Frame Config --- */}
                <div style={S.sec}>
                    <div style={S.secTitle}>Frames</div>
                    <div style={S.row}>
                        <span style={S.label}>Count</span>
                        <button style={S.stepBtn} onClick={function() {
                            if (frames > 1) { setFrames(frames - 1); setCurrentFrame(0); frameRef.current = 0; }
                        }}>−</button>
                        <input type="number" min="1" value={frames}
                               onChange={handleFramesChange} style={S.input} />
                        <button style={S.stepBtn} onClick={function() {
                            setFrames(frames + 1); setCurrentFrame(0); frameRef.current = 0;
                        }}>+</button>
                    </div>
                    <div style={S.row}>
                        <span style={S.label}>Width</span>
                        <input type="number" min="1" value={frameW}
                               onChange={handleFrameWChange} style={S.input} />
                    </div>
                    <div style={S.row}>
                        <span style={S.label}>Height</span>
                        <input type="number" min="1" value={frameH}
                               onChange={handleFrameHChange} style={S.input} />
                    </div>
                    <div style={S.row}>
                        <span style={S.label}>Columns</span>
                        <button style={S.stepBtn} onClick={function() {
                            if (colCount > 1) { setColCount(colCount - 1); setAutoSlice(false); }
                        }}>−</button>
                        <input type="number" min="1" value={colCount}
                               onChange={handleColCountChange} style={S.input} />
                        <button style={S.stepBtn} onClick={function() {
                            setColCount(colCount + 1); setAutoSlice(false);
                        }}>+</button>
                    </div>
                    <label style={S.cb}>
                        <input type="checkbox" checked={autoSlice}
                               onChange={function() { setAutoSlice(!autoSlice); }}
                               style={S.cbi} />
                        Auto-slice from count
                    </label>
                </div>

                {/* --- Sequence --- */}
                <div style={S.sec}>
                    <div style={S.secTitle}>Sequence</div>
                    <div style={S.info}>Custom order (0-indexed, comma-separated)</div>
                    <input type="text" value={sequenceStr}
                           onChange={function(e) { setSequenceStr(e.target.value); }}
                           placeholder="e.g. 0,1,2,1,0,3,4,3"
                           style={S.input} />
                    {sequence && (
                        <div style={Object.assign({}, S.info, { color: "#00ffaa" })}>
                            Sequence: {sequence.length} steps
                        </div>
                    )}
                </div>

                {/* --- Playback --- */}
                <div style={S.sec}>
                    <div style={S.secTitle}>Playback</div>
                    <div style={S.row}>
                        <span style={S.label}>FPS ({fps})</span>
                        <input type="range" min={MIN_FPS} max={MAX_FPS} step="1"
                               value={fps}
                               onChange={function(e) { setFps(parseInt(e.target.value, 10)); }}
                               style={S.slider} />
                    </div>
                    <div style={Object.assign({}, S.row, { gap: 4 })}>
                        <button style={S.btnSm} onClick={stepBack}>◀</button>
                        <button style={Object.assign({}, S.btnSm, playing ? S.btnActive : {})}
                                onClick={togglePlay}>
                            {playing ? "PAUSE" : "PLAY"}
                        </button>
                        <button style={S.btnSm} onClick={stepForward}>▶</button>
                    </div>
                    <label style={S.cb}>
                        <input type="checkbox" checked={loop}
                               onChange={function() { setLoop(!loop); }}
                               style={S.cbi} />
                        Loop
                    </label>
                    <div style={S.info}>
                        Frame: {currentFrame} / {totalSeqFrames - 1}
                        {sequence ? " (sprite #" + spriteFrame + ")" : ""}
                    </div>
                </div>

                {/* --- View --- */}
                <div style={S.sec}>
                    <div style={S.secTitle}>View</div>
                    <div style={S.row}>
                        <span style={S.label}>Zoom ({zoom}x)</span>
                        <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="0.05"
                               value={zoom}
                               onChange={function(e) { setZoom(parseFloat(e.target.value)); }}
                               style={S.slider} />
                    </div>
                    <div style={S.row}>
                        <span style={S.label}>BG ({Math.round(bgBrightness * 100)}%)</span>
                        <input type="range" min="0" max="1" step="0.01"
                               value={bgBrightness}
                               onChange={function(e) { setBgBrightness(parseFloat(e.target.value)); }}
                               style={S.slider} />
                    </div>
                    <label style={S.cb}>
                        <input type="checkbox" checked={showGrid}
                               onChange={function() { setShowGrid(!showGrid); }}
                               style={S.cbi} />
                        Show grid
                    </label>
                    <div style={Object.assign({}, S.row, { gap: 4 })}>
                        <button
                            style={Object.assign({}, S.btnSm, imageRendering === "auto" ? S.btnActive : {})}
                            onClick={function() { setImageRendering("auto"); }}>
                            Smooth
                        </button>
                        <button
                            style={Object.assign({}, S.btnSm, imageRendering === "pixelated" ? S.btnActive : {})}
                            onClick={function() { setImageRendering("pixelated"); }}>
                            Pixelated
                        </button>
                    </div>
                </div>

                {/* --- Export --- */}
                <div style={S.sec}>
                    <div style={S.secTitle}>Export</div>
                    <button style={S.btn} onClick={function() { setShowExport(!showExport); }}>
                        {showExport ? "Hide Config" : "Show Config"}
                    </button>
                    {showExport && imgSrc && (
                        <textarea readOnly style={S.ea}
                                  value={buildExportConfig({
                                      fileName: fileName,
                                      frames: frames,
                                      fps: fps,
                                      frameW: frameW,
                                      frameH: frameH,
                                      colCount: colCount,
                                      loop: loop,
                                      imageRendering: imageRendering,
                                  })} />
                    )}
                </div>

                {/* --- Back link --- */}
                <a href="/dev" style={{
                    color: "#60a5fa", fontSize: 10, letterSpacing: 2,
                    textDecoration: "none", textAlign: "center",
                    marginTop: 12,
                }}>
                    ← DEV TOOLS
                </a>
            </div>

            {/* ======== SANDBOX ======== */}
            <div style={S.sandbox}>
                {/* Preview area */}
                <div style={Object.assign({}, S.sandboxInner, {
                    background: sandboxBg,
                })}>
                    {/* Grid overlay */}
                    {showGrid && (
                        <div style={{
                            position: "absolute", inset: 0,
                            backgroundImage: makeGrid(GRID_SIZE, bgBrightness),
                            pointerEvents: "none", zIndex: 1,
                        }} />
                    )}

                    {/* Sprite preview */}
                    {imgSrc ? (
                        <div style={{ position: "relative", zIndex: 2 }}>
                            {/* Checkerboard behind sprite for transparency */}
                            <div style={{
                                width: frameW,
                                height: frameH,
                                background: makeCheckerboard(CHECKER_SIZE, bgBrightness),
                                transform: "scale(" + zoom + ")",
                                transformOrigin: "center center",
                                imageRendering: "pixelated",
                                position: "relative",
                            }}>
                                {/* 1:1 SpriteSheet div */}
                                <div style={{
                                    width: frameW,
                                    height: frameH,
                                    backgroundImage: "url(" + imgSrc + ")",
                                    backgroundPosition: bgX + "px " + bgY + "px",
                                    backgroundRepeat: "no-repeat",
                                    backgroundSize: (frameW * cols) + "px " + (frameH * totalRows) + "px",
                                    imageRendering: imageRendering,
                                }} />
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            color: "#333", fontSize: 14, letterSpacing: 3,
                            textTransform: "uppercase",
                        }}>
                            Load a sprite sheet →
                        </div>
                    )}
                </div>

                {/* ======== FRAME STRIP ======== */}
                <div style={S.strip}>
                    {imgSrc && Array.from({ length: frames }, function(_, i) {
                        var isActive = (sequence ? sequence[currentFrame] === i : currentFrame === i);
                        var inSequence = sequence ? sequence.indexOf(i) >= 0 : true;
                        var sCol = i % cols;
                        var sRow = Math.floor(i / cols);
                        var sBgX = -(sCol * frameW);
                        var sBgY = -(sRow * frameH);

                        // Scale strip thumbnails to fit ~60px height
                        var thumbScale = Math.min(60 / frameH, 60 / frameW, 1);
                        var thumbW = Math.round(frameW * thumbScale);
                        var thumbH = Math.round(frameH * thumbScale);

                        return (
                            <div key={i}
                                 onClick={function() { handleStripClick(i); }}
                                 style={{
                                     display: "flex", flexDirection: "column",
                                     alignItems: "center", gap: 2, cursor: "pointer",
                                     flexShrink: 0, opacity: inSequence ? 1 : 0.3,
                                 }}>
                                <div style={{
                                    width: thumbW, height: thumbH,
                                    border: isActive ? "2px solid #f59e0b" : "1px solid #333",
                                    borderRadius: 2, overflow: "hidden",
                                    background: makeCheckerboard(4, 0.15),
                                }}>
                                    <div style={{
                                        width: frameW, height: frameH,
                                        backgroundImage: "url(" + imgSrc + ")",
                                        backgroundPosition: sBgX + "px " + sBgY + "px",
                                        backgroundRepeat: "no-repeat",
                                        backgroundSize: (frameW * cols) + "px " + (frameH * totalRows) + "px",
                                        imageRendering: imageRendering,
                                        transform: "scale(" + thumbScale + ")",
                                        transformOrigin: "0 0",
                                    }} />
                                </div>
                                <span style={{
                                    fontSize: 8, color: isActive ? "#f59e0b" : "#555",
                                    fontWeight: isActive ? 700 : 400,
                                }}>
                                    {i}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default SpriteViewer;