// ============================================================
// mobileLayout.js — Wobbly Anvil Mobile Layout
// Full-viewport mobile shell (100vw × 100vh, no scaling).
// Mirrorable 3-column layout: data | center | buttons.
// Handedness prop flips the columns via flex-direction.
// Phase-aware: buttons swap based on game phase.
// Non-destructive: desktop layout is unaffected.
//
// Mobile infrastructure:
//   - Portrait mode: scale-to-fit at landscape aspect ratio
//   - Fullscreen persistence on rotation
//   - Wake lock to prevent screen sleep
//   - Delta-time aware (QTE fix is in forgeComponents)
//
// Fonts:
//   - Cinzel: banner, headers, section labels
//   - Josefin Sans: body text, data values, buttons
// ============================================================

import { useState, useEffect, useRef } from "react";

// --- Design aspect ratio for portrait scale-to-fit ---
var LANDSCAPE_MIN_RATIO = 1.3; // width/height — below this we're in portrait territory

// --- Mobile Button Icon Paths ---
var IC = {
    sleep: "/images/icons/waIconBed.png",
    rest: "/images/icons/waIconHourglass.png",
    promote: "/images/icons/waIconHorn.png",
    scavenge: "/images/icons/waIconTrashcan.png",
    shop: "/images/icons/waIconShop.png",
    forge: "/images/icons/waIconHammer.png",
    scrap: "/images/icons/waIconTrashcan.png",
};

// --- Mobile CSS ---
var MOBILE_CSS = "\n @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Josefin+Sans:wght@400;600;700&display=swap');\n html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; } .mobile-shell {\n    width: 100vw;\n    display: flex;\n    flex-direction: column;\n    background: #1e160d;\n    font-family: 'Josefin Sans', sans-serif;\n    color: #f0e6c8;\n    overflow: hidden;\n    position: relative;\n  }\n  .mobile-banner {\n    display: flex;\n    align-items: center;\n    height: 32px;\n    padding: 0 8px;\n    background: #16100a;\n    border-bottom: 1px solid #3d2e0f;\n    flex-shrink: 0;\n    font-family: 'Cinzel', serif;\n  }\n  .mobile-middle {\n    flex: 1;\n    display: flex;\n    overflow: hidden;\n    position: relative;\n  }\n  .mobile-data-strip {\n    width: 100px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    padding: 4px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    flex-shrink: 0;\n    transition: background 0.2s ease;\n  }\n  .mobile-data-strip-qte {\n    background: rgba(5, 3, 1, 0.7);\n  }\n  .mobile-center {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    position: relative;\n    overflow: hidden;\n  }\n  .mobile-action-strip {\n    width: 100px;\n    display: flex;\n    flex-direction: column;\n    gap: 4px;\n    padding: 4px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    flex-shrink: 0;\n    transition: background 0.2s ease;\n  }\n  .mobile-action-strip-qte {\n    background: rgba(5, 3, 1, 0.7);\n  }\n  .mobile-bottom-bar {\n    height: 40px;\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    padding: 0 8px;\n    background: #16100a;\n    border-top: 1px solid #3d2e0f;\n    flex-shrink: 0;\n    font-family: 'Josefin Sans', sans-serif;\n  }\n  .mobile-bottom-panel {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    background: #120e08;\n    border: 1px solid #2a1f0a;\n    border-radius: 6px;\n    padding: 3px 8px;\n    height: 32px;\n  }\n  .mobile-shelf-icon {\n    width: 26px;\n    height: 26px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: #1e160d;\n    border: 1px solid #3d2e0f;\n    border-radius: 4px;\n    font-size: 14px;\n    cursor: pointer;\n    flex-shrink: 0;\n    position: relative;\n  }\n  .mobile-shelf-icon:active {\n    background: #2a1f0a;\n  }\n  .mobile-shelf-popup {\n    position: absolute;\n    bottom: 44px;\n    background: #120e08;\n    border: 2px solid #f59e0b;\n    border-radius: 8px;\n    padding: 10px 12px;\n    min-width: 140px;\n    z-index: 200;\n    box-shadow: 0 4px 16px rgba(0,0,0,0.9);\n    font-family: 'Josefin Sans', sans-serif;\n  }\n  .mobile-data-strip::-webkit-scrollbar,\n  .mobile-action-strip::-webkit-scrollbar {\n    width: 3px;\n  }\n  .mobile-data-strip::-webkit-scrollbar-thumb,\n  .mobile-action-strip::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 2px;\n  }\n  .mobile-portrait-overlay {\n    position: fixed;\n    inset: 0;\n    z-index: 9999;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    background: rgba(10, 7, 4, 0.92);\n    pointer-events: none;\n    font-family: 'Cinzel', serif;\n  }\n  @keyframes rotateHint {\n    0%, 100% { transform: rotate(0deg); }\n    25% { transform: rotate(-20deg); }\n    75% { transform: rotate(20deg); }\n  }\n  .rotate-hint-icon {\n    font-size: 48px;\n    animation: rotateHint 2s ease-in-out infinite;\n    margin-bottom: 16px;\n  }\n";

// --- Fullscreen helpers ---

function isFullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}

function requestFullscreen(el) {
    var promise = null;
    if (el.requestFullscreen) promise = el.requestFullscreen();
    else if (el.webkitRequestFullscreen) promise = el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) promise = el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) promise = el.msRequestFullscreen();
    if (promise && promise.then) {
        promise.then(function() {
            try {
                if (window.screen.orientation && window.screen.orientation.lock) {
                    window.screen.orientation.lock("landscape").catch(function() {});
                }
            } catch (e) {}
        }).catch(function() {});
    }
    return promise;
}

function exitFullscreen() {
    try {
        if (window.screen.orientation && window.screen.orientation.unlock) {
            window.screen.orientation.unlock();
        }
    } catch (e) {}
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
}

// --- Wake Lock helper ---

function useWakeLock() {
    var wakeLockRef = useRef(null);

    useEffect(function() {
        var released = false;

        function acquireLock() {
            if (released) return;
            if (!navigator.wakeLock) return;
            navigator.wakeLock.request("screen").then(function(lock) {
                if (released) { lock.release(); return; }
                wakeLockRef.current = lock;
                lock.addEventListener("release", function() {
                    wakeLockRef.current = null;
                    if (!released && document.visibilityState === "visible") {
                        setTimeout(acquireLock, 100);
                    }
                });
            }).catch(function() {});
        }

        function onVisChange() {
            if (document.visibilityState === "visible" && !wakeLockRef.current && !released) {
                acquireLock();
            }
        }

        acquireLock();
        document.addEventListener("visibilitychange", onVisChange);

        return function() {
            released = true;
            document.removeEventListener("visibilitychange", onVisChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(function() {});
                wakeLockRef.current = null;
            }
        };
    }, []);
}

// --- Fullscreen state hook ---

function useFullscreenState() {
    var [isFull, setIsFull] = useState(isFullscreenActive);

    useEffect(function() {
        function sync() { setIsFull(isFullscreenActive()); }
        document.addEventListener("fullscreenchange", sync);
        document.addEventListener("webkitfullscreenchange", sync);
        document.addEventListener("mozfullscreenchange", sync);
        document.addEventListener("MSFullscreenChange", sync);
        return function() {
            document.removeEventListener("fullscreenchange", sync);
            document.removeEventListener("webkitfullscreenchange", sync);
            document.removeEventListener("mozfullscreenchange", sync);
            document.removeEventListener("MSFullscreenChange", sync);
        };
    }, []);

    return isFull;
}

// --- Orientation / viewport hook ---

function useViewportInfo() {
    var [info, setInfo] = useState(function() {
        var w = window.innerWidth, h = window.innerHeight;
        return { width: w, height: h, isPortrait: w / h < LANDSCAPE_MIN_RATIO };
    });

    useEffect(function() {
        function update() {
            var w = window.innerWidth, h = window.innerHeight;
            setInfo({ width: w, height: h, isPortrait: w / h < LANDSCAPE_MIN_RATIO });
        }

        window.addEventListener("resize", update);
        window.addEventListener("orientationchange", function() {
            setTimeout(update, 150);
            setTimeout(update, 400);
        });
        update();
        return function() {
            window.removeEventListener("resize", update);
        };
    }, []);

    return info;
}

// --- Fullscreen re-entry on rotation ---

var userExitedFullscreen = { current: false };

function useFullscreenPersistence(isFull) {
    var wasFull = useRef(false);

    useEffect(function() {
        if (isFull) {
            wasFull.current = true;
            userExitedFullscreen.current = false;
        }
        if (!isFull && wasFull.current && !userExitedFullscreen.current) {
            var timer = setTimeout(function() {
                if (!isFullscreenActive() && !userExitedFullscreen.current) {
                    requestFullscreen(document.documentElement);
                }
            }, 300);
            return function() { clearTimeout(timer); };
        }
    }, [isFull]);

    useEffect(function() {
        function onOrientationChange() {
            if (wasFull.current && !isFullscreenActive() && !userExitedFullscreen.current) {
                setTimeout(function() {
                    requestFullscreen(document.documentElement);
                }, 500);
            }
        }
        window.addEventListener("orientationchange", onOrientationChange);
        return function() { window.removeEventListener("orientationchange", onOrientationChange); };
    }, []);
}

// --- Weapon emoji picker (by weapon key) ---
var WEAPON_ICONS = {
    dagger: "\uD83D\uDDE1",
    shortsword: "\u2694",
    axe: "\uD83E\uDE93",
    longsword: "\u2694",
    mace: "\uD83D\uDD28",
    warhammer: "\uD83D\uDD28",
    greatsword: "\u2694",
    halberd: "\uD83D\uDD31",
    katana: "\uD83D\uDDE1",
    claymore: "\u2694",
};

function weaponIcon(wKey) {
    return WEAPON_ICONS[wKey] || "\u2694";
}

// --- Mobile Action Button ---

function MobileBtn({ icon, imgSrc, label, onClick, disabled, color, danger }) {
    var textColor = disabled ? "#2a1f0a" : danger ? "#ef4444" : color || "#f59e0b";
    var borderColor = disabled ? "#1a1209" : danger ? "#ef4444" : color || "#f59e0b";
    var bg = disabled ? "#0a0704" : danger ? "#1a0505" : "#141009";
    return (
        <button onClick={disabled ? null : onClick} disabled={disabled} style={{
            background: bg,
            border: "1px solid " + borderColor,
            borderRadius: 6,
            color: textColor,
            cursor: disabled ? "not-allowed" : "pointer",
            fontFamily: "'Josefin Sans', sans-serif",
            fontWeight: "bold",
            fontSize: 9,
            letterSpacing: 1,
            textTransform: "uppercase",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            padding: "4px 4px",
            width: "100%",
            height: "100%",
            flex: 1,
        }}>
            {imgSrc && <img src={imgSrc} alt={label || ""} style={{ width: 28, height: 28, objectFit: "contain", opacity: disabled ? 0.3 : 1 }} />}
            {!imgSrc && icon && <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>}
            {!imgSrc && label && <span>{label}</span>}
        </button>
    );
}

// --- Shelf Icon with popup ---

function ShelfItem({ item, index }) {
    var [showPopup, setShowPopup] = useState(false);
    var ref = useRef(null);

    useEffect(function() {
        if (!showPopup) return;
        function handleTap(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setShowPopup(false);
            }
        }
        document.addEventListener("touchstart", handleTap);
        document.addEventListener("mousedown", handleTap);
        return function() {
            document.removeEventListener("touchstart", handleTap);
            document.removeEventListener("mousedown", handleTap);
        };
    }, [showPopup]);

    return (
        <div ref={ref} className="mobile-shelf-icon" onClick={function(e) { e.stopPropagation(); setShowPopup(function(s) { return !s; }); }}
             style={ showPopup ? { background: "#2a1f0a", borderColor: "#f59e0b" } : undefined }>
            <span>{weaponIcon(item.wKey)}</span>
            {showPopup && (
                <div className="mobile-shelf-popup" onClick={function(e) { e.stopPropagation(); }} style={{ right: 0, left: "auto" }}>
                    <div style={{ fontSize: 10, color: item.color || "#f59e0b", letterSpacing: 1, fontWeight: "bold", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 9, color: "#c8b89a", marginBottom: 2 }}>{item.wName}</div>
                    <div style={{ fontSize: 9, color: "#8a7a64", marginBottom: 3 }}>{item.matName || ""}</div>
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: "bold" }}>~{item.val}g</div>
                </div>
            )}
        </div>
    );
}

// --- Portrait overlay hint ---

function PortraitOverlay() {
    return (
        <div className="mobile-portrait-overlay">
            <div className="rotate-hint-icon">{"\uD83D\uDCF1"}</div>
            <div style={{ fontSize: 14, color: "#f59e0b", letterSpacing: 2, fontWeight: "bold", textAlign: "center" }}>ROTATE YOUR DEVICE</div>
            <div style={{ fontSize: 10, color: "#8a7a64", letterSpacing: 1, marginTop: 8, textAlign: "center", maxWidth: 220, lineHeight: 1.6 }}>Wobbly Anvil is designed for landscape mode</div>
        </div>
    );
}

// --- Mobile Shell (full viewport, portrait-aware) ---

function MobileShell({ className, children }) {
    var viewport = useViewportInfo();
    var isFull = useFullscreenState();

    useWakeLock();
    useFullscreenPersistence(isFull);

    var isPortrait = viewport.isPortrait;
    var shellHeight = viewport.height;
    var shellWidth = viewport.width;

    var portraitScale = 1;
    var portraitWidth = shellWidth;
    var portraitHeight = shellHeight;
    if (isPortrait) {
        var effectiveW = Math.max(shellWidth, shellHeight);
        var effectiveH = Math.min(shellWidth, shellHeight);
        var scaleX = shellWidth / effectiveW;
        var scaleY = shellHeight / effectiveH;
        portraitScale = Math.min(scaleX, scaleY);
        portraitWidth = effectiveW;
        portraitHeight = effectiveH;
    }

    var shellStyle = isPortrait ? {
        height: portraitHeight + "px",
        width: portraitWidth + "px",
        transform: "scale(" + portraitScale + ")",
        transformOrigin: "top left",
    } : {
        height: shellHeight + "px",
    };

    return (
        <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0a0704", position: "relative" }}>
            <style>{MOBILE_CSS}</style>
            <div className={"mobile-shell" + (className ? " " + className : "")}
                 style={shellStyle}>
                {children}
            </div>
            {isPortrait && <PortraitOverlay />}
        </div>
    );
}

// --- Mobile Layout ---

function MobileLayout(props) {
    var handedness = props.handedness || "right";
    var isLeftHanded = handedness === "left";
    var phase = props.phase || "idle";
    var isForging = phase !== "idle" && phase !== "select" && phase !== "select_mat";
    var isQTEActive = phase === "heat" || phase === "hammer" || phase === "quench";
    var isFull = useFullscreenState();
    var finished = props.finished || [];

    // --- Banner content ---
    var banner = (
        <div className="mobile-banner">
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingLeft: "4vw" }}>
                <span style={{ fontSize: 15, color: "#8a7a64", letterSpacing: 1, fontWeight: "bold" }}>LV</span>
                <span style={{ fontSize: 22, color: "#f59e0b", fontWeight: "bold" }}>{props.level || 1}</span>
                <span style={{ fontSize: 16, color: "#fbbf24", fontWeight: "bold", marginLeft: "3vw" }}>{props.rankName || ""}</span>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                {props.royalQuest && !props.royalQuest.fulfilled && (
                    <span style={{ fontSize: 17, color: "#f59e0b", letterSpacing: 1, fontWeight: "bold" }}>DECREE DUE DAY {props.royalQuest.deadline}</span>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, paddingRight: 4 }}>
                <span style={{ fontSize: 15, color: "#8a7a64", letterSpacing: 1, fontWeight: "bold" }}>DAY</span>
                <span style={{ fontSize: 22, color: "#f0e6c8", fontWeight: "bold" }}>{props.day || 1}</span>
                <button onClick={function() { if (isFull) { userExitedFullscreen.current = true; exitFullscreen(); } else { userExitedFullscreen.current = false; requestFullscreen(document.documentElement); } }} style={{
                    background: "none", border: "1px solid #3d2e0f", borderRadius: 4,
                    color: "#8a7a64", fontSize: 12, padding: "2px 5px", cursor: "pointer",
                    fontFamily: "'Cinzel', serif", marginLeft: 4,
                }}>{isFull ? "\u2716" : "\u26F6"}</button>
            </div>
        </div>
    );

    // --- Data strip ---
    var dataStripClass = "mobile-data-strip" + (isQTEActive ? " mobile-data-strip-qte" : "");
    var dataStrip = (
        <div className={dataStripClass}>
            {isForging ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "4px 0" }}>
                    {/* Quality — big and prominent at top */}
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1, fontFamily: "'Cinzel', serif" }}>QUALITY</div>
                        <div style={{ fontSize: 22, color: props.qualityColor || "#f59e0b", fontWeight: "bold" }}>{props.qualScore || 0}</div>
                    </div>
                    <div style={{ width: "80%", height: 1, background: "#2a1f0a" }} />
                    {/* Stress */}
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1, fontFamily: "'Cinzel', serif" }}>STRESS</div>
                        <div style={{ fontSize: 13, color: props.stressColor || "#4ade80", fontWeight: "bold" }}>{props.stressLabel || "CALM"}</div>
                    </div>
                    <div style={{ width: "80%", height: 1, background: "#2a1f0a" }} />
                    {/* Material */}
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1, fontFamily: "'Cinzel', serif" }}>MATERIAL</div>
                        <div style={{ fontSize: 11, color: props.matColor || "#a0a0a0", fontWeight: "bold" }}>{props.matName || ""}</div>
                    </div>
                    {/* Weapon */}
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1, fontFamily: "'Cinzel', serif" }}>WEAPON</div>
                        <div style={{ fontSize: 11, color: "#f0e6c8", fontWeight: "bold" }}>{props.weaponName || ""}</div>
                    </div>
                    {/* Difficulty */}
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1, fontFamily: "'Cinzel', serif" }}>DIFFICULTY</div>
                        <div style={{ fontSize: 16, color: props.diffColor || "#fbbf24", fontWeight: "bold" }}>{props.effDiff || 0}</div>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ fontSize: 10, color: "#8a7a64", letterSpacing: 1, textAlign: "center", fontFamily: "'Cinzel', serif" }}>REP</div>
                    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 1, marginTop: 2 }}>
                        {Array.from({ length: 8 }).map(function(_, i) {
                            var filled = i < (props.reputation || 0);
                            return <div key={i} style={{
                                width: 7, height: 7, borderRadius: 1,
                                background: filled ? (props.repColor || "#fb923c") : "#2a1f0a",
                                border: "1px solid " + (filled ? (props.repColor || "#fb923c") : "#3d2e0f"),
                            }} />;
                        })}
                    </div>
                    {props.stats && (
                        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid #2a1f0a", paddingTop: 6 }}>
                            {[["BRN", "brawn", "#f59e0b"], ["PRC", "precision", "#60a5fa"], ["TEC", "technique", "#4ade80"], ["SLV", "silverTongue", "#c084fc"]].map(function(s) {
                                var val = props.stats[s[1]] || 0;
                                return (
                                    <div key={s[0]}>
                                        <div style={{ fontSize: 8, color: s[2], letterSpacing: 1, fontWeight: "bold", marginBottom: 1, fontFamily: "'Cinzel', serif" }}>{s[0]}</div>
                                        <div style={{ display: "flex", flexDirection: "row", gap: 1 }}>
                                            {Array.from({ length: 8 }).map(function(_, i) {
                                                var filled = i < val;
                                                return <div key={i} style={{
                                                    width: 7, height: 7, borderRadius: 1,
                                                    background: filled ? s[2] : "#2a1f0a",
                                                    border: "1px solid " + (filled ? s[2] : "#3d2e0f"),
                                                }} />;
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                            {(props.statPoints || 0) > 0 && (
                                <div style={{ fontSize: 8, color: "#f59e0b", textAlign: "center", letterSpacing: 1, marginTop: 2, fontWeight: "bold" }}>+{props.statPoints} PTS</div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );

    // --- Action strip ---
    var actionStripClass = "mobile-action-strip" + (isQTEActive ? " mobile-action-strip-qte" : "");
    var actionStrip = (
        <div className={actionStripClass} style={{ justifyContent: "stretch" }}>
            {isForging && phase === "sess_result" ? (
                <>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.forge} onClick={props.onForge} disabled={props.forgeDisabled} /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn icon={"\u2696"} label="NORM" onClick={props.onNormalize} disabled={props.normalizeDisabled} color="#60a5fa" /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn icon={"\uD83D\uDCA7"} label="QUENCH" onClick={props.onQuench} disabled={props.quenchDisabled} /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.scrap} onClick={props.onScrap} color="#8a7a64" /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn icon={"\u23F8"} label="LEAVE" onClick={props.onLeave} color="#60a5fa" /></div>
                </>
            ) : isQTEActive ? (
                <div style={{ flex: 1 }} />
            ) : (
                <>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.sleep} onClick={props.onSleep} disabled={props.sleepDisabled} /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.rest} onClick={props.onRest} disabled={props.restDisabled} /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.promote} onClick={props.onPromote} disabled={props.promoteDisabled} /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.scavenge} onClick={props.onScavenge} disabled={props.scavengeDisabled} /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.shop} onClick={props.onShop} disabled={props.shopDisabled} /></div>
                    <div style={{ flex: 1, display: "flex" }}><MobileBtn icon={"\u2697"} label="MATS" onClick={props.onMats} disabled={props.matsDisabled} /></div>
                </>
            )}
        </div>
    );

    // --- Center content ---
    var center = (
        <div className="mobile-center" onClick={isQTEActive ? props.onForgeClick : null} style={{ cursor: isQTEActive ? "pointer" : "default" }}>
            {props.overlay}
            {props.scene}
            {props.forgeUI}

            {/* Begin Forge button — idle, no WIP, centered at bottom */}
            {phase === "idle" && !props.hasWip && (
                <button onClick={props.onBeginForge} disabled={props.beginForgeDisabled} style={{
                    position: "absolute",
                    bottom: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                    background: props.beginForgeDisabled ? "#0a0704" : "#2a1f0a",
                    border: "2px solid " + (props.beginForgeDisabled ? "#1a1209" : "#f59e0b"),
                    borderRadius: 8,
                    color: props.beginForgeDisabled ? "#2a1f0a" : "#f59e0b",
                    padding: "10px 28px",
                    fontSize: 14,
                    cursor: props.beginForgeDisabled ? "not-allowed" : "pointer",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    fontFamily: "'Cinzel', serif",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                }}>BEGIN FORGING</button>
            )}

            {/* Resume WIP button — idle with WIP */}
            {phase === "idle" && props.hasWip && (
                <div style={{
                    position: "absolute",
                    bottom: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: 20,
                    display: "flex",
                    gap: 8,
                }}>
                    <button onClick={props.onResumeWip} disabled={props.resumeWipDisabled} style={{
                        background: props.resumeWipDisabled ? "#0a0704" : "#0a1a2a",
                        border: "2px solid " + (props.resumeWipDisabled ? "#1a1209" : "#60a5fa"),
                        borderRadius: 8,
                        color: props.resumeWipDisabled ? "#2a1f0a" : "#60a5fa",
                        padding: "10px 20px",
                        fontSize: 13,
                        cursor: props.resumeWipDisabled ? "not-allowed" : "pointer",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        fontFamily: "'Cinzel', serif",
                        fontWeight: "bold",
                    }}>RESUME</button>
                    <button onClick={props.onScrapWip} style={{
                        background: "#141009",
                        border: "2px solid #3d2e0f",
                        borderRadius: 8,
                        color: "#8a7a64",
                        padding: "10px 16px",
                        fontSize: 13,
                        cursor: "pointer",
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        fontFamily: "'Cinzel', serif",
                        fontWeight: "bold",
                    }}>SCRAP</button>
                </div>
            )}
        </div>
    );

    // --- Bottom bar ---
    var bottomBar = (
        <div className="mobile-bottom-bar">
            <div className="mobile-bottom-panel">
                <span style={{ fontSize: 11, color: props.timeColor || "#4ade80", fontWeight: "bold" }}>{props.timeLabel || "8:00AM"}</span>
                <div style={{ width: 60, height: 5, background: "#0a0704", borderRadius: 3, overflow: "hidden", border: "1px solid #2a1f0a" }}>
                    <div style={{ height: "100%", width: (props.timePct || 100) + "%", background: props.timeColor || "#4ade80", borderRadius: 3 }} />
                </div>
            </div>

            <div className="mobile-bottom-panel">
                <span style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1, fontFamily: "'Cinzel', serif" }}>STAM</span>
                <span style={{ fontSize: 11, color: props.staminaColor || "#f59e0b", fontWeight: "bold" }}>{props.stamina || 0}/{props.maxStam || 5}</span>
                <div style={{ width: 50, height: 5, background: "#0a0704", borderRadius: 3, overflow: "hidden", border: "1px solid #2a1f0a" }}>
                    <div style={{ height: "100%", width: (props.staminaPct || 100) + "%", background: props.staminaColor || "#f59e0b", borderRadius: 3 }} />
                </div>
            </div>

            <div className="mobile-bottom-panel" style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden", gap: 4 }}>
                {finished.length === 0 && (
                    <span style={{ fontSize: 8, color: "#3d2e0f", letterSpacing: 1 }}>SHELF EMPTY</span>
                )}
                {finished.map(function(w, i) {
                    return <ShelfItem key={w.id} item={w} index={i} />;
                })}
            </div>

            <span style={{ fontSize: 21, color: "#f59e0b", fontWeight: "bold", flexShrink: 0, fontFamily: "'Cinzel', serif" }}>{props.gold || 0}g</span>

            <button onClick={props.onOptions} style={{
                background: "#141009", border: "1px solid #3d2e0f", borderRadius: 6,
                color: "#8a7a64", fontSize: 20, cursor: "pointer",
                flexShrink: 0, width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 0,
            }}>{"\u2699"}</button>
        </div>
    );

    // --- Assemble ---
    var middleDirection = isLeftHanded ? "row-reverse" : "row";

    return (
        <MobileShell className={props.className}>
            {banner}
            <div className="mobile-middle" style={{ flexDirection: middleDirection }}>
                {dataStrip}
                {center}
                {actionStrip}
            </div>
            {bottomBar}
        </MobileShell>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var MobileLayoutModule = {
    MobileLayout: MobileLayout,
    MobileShell: MobileShell,
    MobileBtn: MobileBtn,
};

export default MobileLayoutModule;