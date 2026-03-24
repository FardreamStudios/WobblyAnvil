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
import W from "../components/widgets.js";
import THEME from "../config/theme.js";
import ForgeFireFX from "../components/ForgeFireFX.js";
import GameConstants from "./constants.js";
import usePressHold from "../hooks/usePressHold.js";

// --- Design aspect ratio for portrait scale-to-fit ---
var LANDSCAPE_MIN_RATIO = 1.3; // width/height — below this we're in portrait territory

// --- Mobile Button Icon Paths ---
var PUB = process.env.PUBLIC_URL || "";
var IC = {
    sleep: PUB + "/images/icons/waIconBed.png",
    rest: PUB + "/images/icons/waIconHourglass.png",
    promote: PUB + "/images/icons/waIconHorn.png",
    scavenge: PUB + "/images/icons/waIconTrashcan.png",
    shop: PUB + "/images/icons/waIconShop.png",
    forge: PUB + "/images/icons/waIconHammer.png",
    scrap: PUB + "/images/icons/waIconTrashcan.png",
    bag: PUB + "/images/icons/waIconBag.png",
    decree: PUB + "/images/icons/waIconPennant.png",
    leave: PUB + "/images/icons/waIconDoor1.png",
    normalize: PUB + "/images/icons/waIconFire.png",
    quench: PUB + "/images/icons/waIconSword.png",
    sidebar: PUB + "/images/ui/waSideBar.png",
};

// --- Mobile CSS ---
var MOBILE_CSS = "\n @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Josefin+Sans:wght@400;600;700&display=swap');\n html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; -webkit-tap-highlight-color: transparent; } .mobile-shell {\n    width: 100vw;\n    display: flex;\n    flex-direction: column;\n    background: #1e160d;\n    font-family: 'Josefin Sans', sans-serif;\n    color: #f0e6c8;\n    overflow: hidden;\n    position: relative;\n    padding-left: env(safe-area-inset-left);\n    padding-right: env(safe-area-inset-right);\n    padding-top: env(safe-area-inset-top);\n    padding-bottom: env(safe-area-inset-bottom);\n    box-sizing: border-box;\n  }\n  .mobile-banner {\n    display: flex;\n    align-items: center;\n    height: 32px;\n    padding: 0 8px;\n    background: #16100a;\n    border-bottom: 1px solid #3d2e0f;\n    flex-shrink: 0;\n    font-family: 'Cinzel', serif;\n  }\n  .mobile-middle {\n    flex: 1;\n    display: flex;\n    overflow: hidden;\n    position: relative;\n  }\n  .mobile-center {\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    position: relative;\n    overflow: hidden;\n    background: #1e160d;\n  }\n  .mobile-action-strip {\n    width: 100%;\n    height: 100%;\n    display: flex;\n    flex-direction: column;\n    gap: 0;\n    padding: 0;\n    overflow: hidden;\n    flex-shrink: 0;\n    background: transparent;\n    position: relative;\n    z-index: 2;\n  }\n  .mobile-action-strip-qte {\n    background: transparent;\n  }\n  .mobile-bottom-bar {\n    height: 40px;\n    display: flex;\n    align-items: center;\n    gap: 6px;\n    padding: 0 8px;\n    background: #16100a;\n    border-top: 1px solid #3d2e0f;\n    flex-shrink: 0;\n    font-family: 'Josefin Sans', sans-serif;\n  }\n  .mobile-bottom-panel {\n    display: flex;\n    align-items: center;\n    gap: 8px;\n    background: #120e08;\n    border: 1px solid #2a1f0a;\n    border-radius: 6px;\n    padding: 3px 8px;\n    height: 32px;\n  }\n  .mobile-shelf-icon {\n    width: 36px;\n    height: 36px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: #1e160d;\n    border: 1px solid #3d2e0f;\n    border-radius: 4px;\n    font-size: 18px;\n    cursor: pointer;\n    flex-shrink: 0;\n    position: relative;\n  }\n  .mobile-shelf-icon:active {\n    background: #2a1f0a;\n  }\n  .mobile-shelf-popup {\n    position: absolute;\n    bottom: 44px;\n    background: #120e08;\n    border: 2px solid #f59e0b;\n    border-radius: 8px;\n    padding: 10px 12px;\n    min-width: 140px;\n    z-index: 200;\n    box-shadow: 0 4px 16px rgba(0,0,0,0.9);\n    font-family: 'Josefin Sans', sans-serif;\n  }\n  .mobile-action-strip::-webkit-scrollbar {\n    width: 3px;\n  }\n  .mobile-action-strip::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 2px;\n  }\n  .mobile-drawer-backdrop {\n    position: absolute;\n    inset: 0;\n    z-index: 90;\n    background: rgba(0, 0, 0, 0.55);\n  }\n  .mobile-drawer {\n    position: absolute;\n    top: 0;\n    bottom: 0;\n    width: 240px;\n    z-index: 95;\n    background: rgba(18, 14, 8, 0.55);\n    backdrop-filter: blur(4px);\n    -webkit-backdrop-filter: blur(4px);\n    border-right: 1px solid #3d2e0f;\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    padding: 8px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    box-shadow: 4px 0 20px rgba(0,0,0,0.8);\n    transition: transform 0.2s ease;\n  }\n  .mobile-drawer-left {\n    left: 0;\n    border-right: 1px solid #3d2e0f;\n    border-left: none;\n  }\n  .mobile-drawer-right {\n    right: 0;\n    left: auto;\n    border-left: 1px solid #3d2e0f;\n    border-right: none;\n    box-shadow: -4px 0 20px rgba(0,0,0,0.8);\n  }\n  .mobile-drawer::-webkit-scrollbar {\n    width: 3px;\n  }\n  .mobile-drawer::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 2px;\n  }\n  .mobile-drawer-tab {\n    position: absolute;\n    top: 50%;\n    transform: translateY(-50%);\n    z-index: 85;\n    width: 20px;\n    height: 48px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: #16100a;\n    border: 1px solid #3d2e0f;\n    cursor: pointer;\n    font-size: 12px;\n    color: #8a7a64;\n  }\n  .mobile-drawer-tab-left {\n    left: 0;\n    border-radius: 0 6px 6px 0;\n    border-left: none;\n  }\n  .mobile-drawer-tab-right {\n    right: 0;\n    left: auto;\n    border-radius: 6px 0 0 6px;\n    border-right: none;\n  }\n  .mobile-drawer-tab:active {\n    background: #2a1f0a;\n  }\n  .mobile-drawer-forge {\n    width: 160px;\n  }\n  .mobile-portrait-overlay {\n    position: fixed;\n    inset: 0;\n    z-index: 9999;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    justify-content: center;\n    background: rgba(10, 7, 4, 0.92);\n    pointer-events: none;\n    font-family: 'Cinzel', serif;\n  }\n  @keyframes rotateHint {\n    0%, 100% { transform: rotate(0deg); }\n    25% { transform: rotate(-20deg); }\n    75% { transform: rotate(20deg); }\n  }\n  .rotate-hint-icon {\n    font-size: 48px;\n    animation: rotateHint 2s ease-in-out infinite;\n    margin-bottom: 16px;\n  }\n  @keyframes decreeGlow {\n    0%, 100% { filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.3)) drop-shadow(0 0 2px rgba(0,0,0,0.6)); }\n    50% { filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.8)) drop-shadow(0 0 20px rgba(245, 158, 11, 0.4)) drop-shadow(0 0 2px rgba(0,0,0,0.6)); }\n  }\n  .decree-glow-img {\n    animation: decreeGlow 1.8s ease-in-out infinite;\n  }\n  .action-icon-glow {\n    filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.25)) drop-shadow(0 0 3px rgba(251, 146, 60, 0.2)) drop-shadow(0 0 1px rgba(0,0,0,0.6));\n  }\n  @keyframes decreeUrgent {\n    0%, 100% { filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.4)) drop-shadow(0 0 2px rgba(0,0,0,0.6)); }\n    50% { filter: drop-shadow(0 0 16px rgba(239, 68, 68, 1.0)) drop-shadow(0 0 30px rgba(239, 68, 68, 0.6)) drop-shadow(0 0 2px rgba(0,0,0,0.6)); }\n  }\n  .decree-urgent-img {\n    animation: decreeUrgent 0.9s ease-in-out infinite;\n  }\n";
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
            setTimeout(function() {
                var w = window.innerWidth, h = window.innerHeight;
                var isLandscape = w > h;
                if (isLandscape && !isFullscreenActive() && !userExitedFullscreen.current) {
                    requestFullscreen(document.documentElement);
                }
            }, 500);
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

function MobileBtn({ icon, iconSize, imgSrc, imgSize, label, onClick, disabled, color, danger, holdContent }) {
    var T = THEME;
    var btnRef = useRef(null);
    var popRef = useRef(null);
    var [showPop, setShowPop] = useState(false);

    // --- Press-hold gesture ---
    var hasHold = !!holdContent;
    var press = usePressHold({
        onClick: (!disabled && onClick) ? onClick : null,
        onHold: hasHold ? function() { setShowPop(true); } : null,
        disabled: disabled,
    });

    // --- Dismiss popover on release or outside tap ---
    useEffect(function() {
        if (!showPop) return;
        function dismissOutside(e) {
            if (popRef.current && !popRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)) {
                setShowPop(false);
            }
        }
        function dismissRelease() { setShowPop(false); }
        document.addEventListener("touchstart", dismissOutside);
        document.addEventListener("mousedown", dismissOutside);
        document.addEventListener("touchend", dismissRelease);
        document.addEventListener("mouseup", dismissRelease);
        return function() {
            document.removeEventListener("touchstart", dismissOutside);
            document.removeEventListener("mousedown", dismissOutside);
            document.removeEventListener("touchend", dismissRelease);
            document.removeEventListener("mouseup", dismissRelease);
        };
    }, [showPop]);

    // --- Compute popover position ---
    function getPopStyle() {
        if (!btnRef.current) return {};
        var rect = btnRef.current.getBoundingClientRect();
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var midX = rect.left + rect.width / 2;
        var goLeft = midX > vw / 2;
        var popW = 180;
        var popH = 120; // estimate — CSS will auto-size
        var margin = 8;

        var style = {
            position: "fixed",
            zIndex: 9999,
            width: popW,
            overflow: "visible",
        };

        // Horizontal
        if (goLeft) {
            style.right = vw - rect.left + 6;
        } else {
            style.left = rect.right + 6;
        }

        // Vertical — center on button, clamp to edges
        var centerY = rect.top + rect.height / 2 - popH / 2;
        var clampedY = Math.max(margin, Math.min(centerY, vh - popH - margin));
        style.top = clampedY;

        return style;
    }

    // --- Arrow nub style ---
    function getArrowStyle() {
        if (!btnRef.current) return {};
        var rect = btnRef.current.getBoundingClientRect();
        var vw = window.innerWidth;
        var midX = rect.left + rect.width / 2;
        var goLeft = midX > vw / 2;
        var arrowSize = 6;

        var base = {
            position: "absolute",
            width: 0, height: 0,
            borderTop: arrowSize + "px solid transparent",
            borderBottom: arrowSize + "px solid transparent",
            top: "50%",
            transform: "translateY(-50%)",
        };

        if (goLeft) {
            // Arrow points right
            base.right = -arrowSize;
            base.borderLeft = arrowSize + "px solid " + T.colors.borderLight;
        } else {
            // Arrow points left
            base.left = -arrowSize;
            base.borderRight = arrowSize + "px solid " + T.colors.borderLight;
        }
        return base;
    }

    var textColor = disabled ? T.colors.bgHighlight : danger ? T.colors.red : color || T.colors.gold;
    var hasImg = !!imgSrc;
    var borderColor = disabled ? T.colors.borderDark : danger ? T.colors.red : T.colors.gold;
    var bgColor = disabled ? T.colors.bgDeep : danger ? T.colors.bgDanger : T.colors.bgWarm;
    var iconFilter = disabled ? "brightness(0.3)" : "drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000) drop-shadow(0 0 2px rgba(0,0,0,0.6))";

    // If holdContent exists, use press handlers instead of plain onClick
    var btnProps = hasHold ? press.handlers : { onClick: disabled ? null : onClick };

    return (
        <div ref={btnRef} style={{ position: "relative", width: "100%", height: "100%", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button {...btnProps} disabled={disabled} style={{
                background: "transparent",
                border: "none",
                borderRadius: 0,
                color: textColor,
                cursor: disabled ? "not-allowed" : "pointer",
                fontFamily: T.fonts.body,
                fontWeight: "bold",
                fontSize: T.fontSize.xs,
                letterSpacing: T.letterSpacing.tight,
                textTransform: "uppercase",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: T.spacing.xxs,
                padding: 0,
                width: imgSrc ? (imgSize || 65) : "100%",
                height: imgSrc ? (imgSize || 65) : "100%",
                transition: "opacity 0.1s ease",
                opacity: disabled ? 0.3 : 1,
                WebkitUserSelect: "none",
                userSelect: "none",
            }}>
                {imgSrc && <img src={imgSrc} alt={label || ""} draggable={false} className="action-icon-glow" style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />}
                {!imgSrc && icon && <span style={{ fontSize: iconSize || T.fontSize.xxl, lineHeight: 1, pointerEvents: "none" }}>{icon}</span>}
                {!imgSrc && label && <span style={{ pointerEvents: "none" }}>{label}</span>}
            </button>

            {/* Hold popover */}
            {showPop && holdContent && (
                <div ref={popRef} style={Object.assign({}, getPopStyle(), {
                    background: T.colors.bgMid,
                    border: "1px solid " + T.colors.borderLight,
                    borderRadius: T.radius.lg,
                    padding: "10px 12px",
                    boxShadow: T.shadows.heavy || "0 6px 24px rgba(0,0,0,0.85)",
                    color: T.colors.textBody,
                    fontSize: T.fontSize.xl,
                    fontFamily: T.fonts.body,
                    lineHeight: 1.5,
                })}>
                    <div style={getArrowStyle()} />
                    {typeof holdContent === "function" ? holdContent() : holdContent}
                </div>
            )}
        </div>
    );
}

// --- Decree Scroll Button ---
// Tap = show decree for 3s. Hold = stays until release.
// Only rendered when royalQuest is active.

function DecreeBtn({ quest, questNum }) {
    var T = THEME;
    var MATS = GameConstants.MATS;
    var btnRef = useRef(null);
    var popRef = useRef(null);
    var dismissTimer = useRef(null);
    var [showPop, setShowPop] = useState(false);
    var [holding, setHolding] = useState(false);

    // Auto-dismiss after 3s on tap (not hold)
    useEffect(function() {
        if (showPop && !holding) {
            dismissTimer.current = setTimeout(function() {
                setShowPop(false);
            }, 3000);
            return function() { clearTimeout(dismissTimer.current); };
        }
    }, [showPop, holding]);

    var press = usePressHold({
        onClick: function() {
            setHolding(false);
            setShowPop(true);
        },
        onHold: function() {
            setHolding(true);
            setShowPop(true);
        },
        disabled: false,
    });

    // On hold release — start the 3s dismiss
    useEffect(function() {
        if (!holding) return;
        function onUp() { setHolding(false); }
        document.addEventListener("touchend", onUp);
        document.addEventListener("mouseup", onUp);
        return function() {
            document.removeEventListener("touchend", onUp);
            document.removeEventListener("mouseup", onUp);
        };
    }, [holding]);

    // Dismiss on outside tap
    useEffect(function() {
        if (!showPop) return;
        function dismiss(e) {
            if (popRef.current && !popRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)) {
                setShowPop(false);
                setHolding(false);
            }
        }
        document.addEventListener("touchstart", dismiss);
        document.addEventListener("mousedown", dismiss);
        return function() {
            document.removeEventListener("touchstart", dismiss);
            document.removeEventListener("mousedown", dismiss);
        };
    }, [showPop]);

    // Popover position — side-aware like MobileBtn
    function getPopStyle() {
        if (!btnRef.current) return {};
        var rect = btnRef.current.getBoundingClientRect();
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var midX = rect.left + rect.width / 2;
        var goLeft = midX > vw / 2;
        var popW = 220;
        var popH = 180;
        var margin = 8;

        var style = {
            position: "fixed",
            zIndex: 9999,
            width: popW,
            maxHeight: vh - margin * 2,
            overflowY: "hidden",
        };

        if (goLeft) {
            style.right = vw - rect.left + 6;
        } else {
            style.left = rect.right + 6;
        }

        var centerY = rect.top + rect.height / 2 - popH / 2;
        style.top = Math.max(margin, Math.min(centerY, vh - popH - margin));

        return style;
    }

    // Arrow nub — mirrors MobileBtn pattern
    function getArrowStyle() {
        if (!btnRef.current) return {};
        var rect = btnRef.current.getBoundingClientRect();
        var vw = window.innerWidth;
        var midX = rect.left + rect.width / 2;
        var goLeft = midX > vw / 2;
        var arrowSize = 6;

        var base = {
            position: "absolute",
            width: 0, height: 0,
            borderTop: arrowSize + "px solid transparent",
            borderBottom: arrowSize + "px solid transparent",
            top: "50%",
            transform: "translateY(-50%)",
        };

        if (goLeft) {
            base.right = -arrowSize;
            base.borderLeft = arrowSize + "px solid " + T.colors.borderLight;
        } else {
            base.left = -arrowSize;
            base.borderRight = arrowSize + "px solid " + T.colors.borderLight;
        }
        return base;
    }

    var matData = MATS[quest.materialRequired] || {};
    var matColor = matData.color || "#a0a0a0";
    var fulfilled = quest.fulfilled;
    var accentColor = fulfilled ? T.colors.green : T.colors.gold;
    var borderGlow = fulfilled ? T.colors.green + "66" : T.colors.gold + "66";
    var iconFilter = "drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000) drop-shadow(0 0 2px rgba(0,0,0,0.6))";

    // Due tomorrow glow check
    var dueSoon = !fulfilled && quest.deadline && quest.deadline <= (quest._currentDay || 999) + 1;
    var glowClass = dueSoon ? "decree-urgent-img" : "decree-glow-img";

    return (
        <div ref={btnRef} style={{ position: "relative", width: "100%", height: "100%", flex: 1 }}>
            <button {...press.handlers} style={{
                background: "transparent",
                border: "none",
                borderRadius: 0,
                color: accentColor,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                width: "100%",
                height: "100%",
                WebkitUserSelect: "none",
                userSelect: "none",
            }}>
                <img src={IC.decree} alt="Decree" draggable={false} className={glowClass} style={{ width: "90%", height: "90%", objectFit: "contain", pointerEvents: "none" }} />
            </button>

            {showPop && (
                <div ref={popRef} style={Object.assign({}, getPopStyle(), {
                    background: T.colors.bgMid,
                    border: "1px solid " + accentColor + "55",
                    borderRadius: T.radius.lg,
                    padding: "12px 14px",
                    boxShadow: "0 6px 24px rgba(0,0,0,0.85)",
                    fontFamily: T.fonts.body,
                    lineHeight: 1.6,
                })}>
                    <div style={getArrowStyle()} />
                    {/* Header */}
                    <div style={{ fontSize: T.fontSize.xl, color: accentColor, fontWeight: "bold", letterSpacing: 1, marginBottom: 6 }}>
                        {fulfilled ? "DECREE FULFILLED" : "ROYAL DECREE #" + ((questNum || 0) + 1)}
                    </div>
                    {/* From */}
                    <div style={{ fontSize: T.fontSize.md, color: T.colors.textDim, marginBottom: 4 }}>
                        From: <span style={{ color: T.colors.textBody, fontWeight: "bold" }}>{quest.name}</span>
                    </div>
                    {/* Demand */}
                    <div style={{ fontSize: T.fontSize.xl, color: T.colors.textLight, fontWeight: "bold", marginBottom: 6 }}>
                        {quest.minQualityLabel}+ <span style={{ color: matColor }}>{quest.materialRequired.toUpperCase()}</span>{" "}
                        {quest.qty > 1 && <span style={{ color: T.colors.gold }}>x{quest.qty} </span>}
                        {quest.weaponName}
                    </div>
                    {/* Progress */}
                    {quest.qty > 1 && (
                        <div style={{ fontSize: T.fontSize.md, color: fulfilled ? T.colors.green : T.colors.textDim, marginBottom: 4 }}>
                            Delivered: {quest.fulfilledQty || 0}/{quest.qty}
                        </div>
                    )}
                    {/* Deadline */}
                    <div style={{ fontSize: T.fontSize.md, color: T.colors.textDim, marginBottom: 6 }}>
                        Due: <span style={{ color: accentColor, fontWeight: "bold" }}>Day {quest.deadline}</span>
                    </div>
                    {/* Rewards / Penalty */}
                    <div style={{ display: "flex", gap: 6 }}>
                        <div style={{ flex: 1, background: T.colors.bgDark, border: "1px solid " + T.colors.green + "33", borderRadius: T.radius.sm, padding: "4px 6px" }}>
                            <div style={{ fontSize: T.fontSize.md, color: T.colors.green, fontWeight: "bold" }}>+{quest.reward}g +{quest.reputationGain} rep</div>
                        </div>
                        <div style={{ flex: 1, background: T.colors.bgDark, border: "1px solid " + T.colors.red + "33", borderRadius: T.radius.sm, padding: "4px 6px" }}>
                            <div style={{ fontSize: T.fontSize.md, color: T.colors.red, fontWeight: "bold" }}>-{quest.reputationLoss} rep</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
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

function MobileBottomBar(props) {
    var finished = props.finished || [];
    var T = THEME;
    return (
        <W.Strip className="mobile-bottom-bar" gap="sm" pad="md" h={T.layout.bottomBarH}
                 bg="bgPanel" style={{ borderTop: T.borders.thin, flexShrink: 0, fontFamily: T.fonts.body }}>

            {/* Time panel */}
            <W.Strip className="mobile-bottom-panel" gap="md" pad="md" h={32}
                     bg="bgMid" border="thinMid" radius="md">
                <W.Label size="sm" color={props.timeColor || T.colors.green} bold>
                    {props.timeLabel || "8:00AM"}
                </W.Label>
                <div style={{
                    width: 60, height: T.layout.barHeightSm,
                    background: T.colors.bgDeep, borderRadius: T.radius.sm,
                    overflow: "hidden", border: T.borders.thinMid,
                }}>
                    <div style={{
                        height: "100%",
                        width: (props.timePct || 100) + "%",
                        background: props.timeColor || T.colors.green,
                        borderRadius: T.radius.sm,
                    }} />
                </div>
            </W.Strip>

            {/* Stamina panel */}
            <W.Strip className="mobile-bottom-panel" gap="md" pad="md" h={32}
                     bg="bgMid" border="thinMid" radius="md">
                <W.Label size="xxs" color="textLabel" spacing="tight" font="heading">STAM</W.Label>
                <W.Label size="sm" color={props.staminaColor || T.colors.gold} bold>
                    {props.stamina || 0}/{props.maxStam || 5}
                </W.Label>
                <div style={{
                    width: 50, height: T.layout.barHeightSm,
                    background: T.colors.bgDeep, borderRadius: T.radius.sm,
                    overflow: "hidden", border: T.borders.thinMid,
                }}>
                    <div style={{
                        height: "100%",
                        width: (props.staminaPct || 100) + "%",
                        background: props.staminaColor || T.colors.gold,
                        borderRadius: T.radius.sm,
                    }} />
                </div>
            </W.Strip>

            {/* Shelf panel */}
            <W.Strip className="mobile-bottom-panel" gap="xs"
                     style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden" }}
                     bg="bgMid" border="thinMid" radius="md" pad="md" h={32}>
                {finished.length === 0 && (
                    <W.Label size="xxs" color="borderLight" spacing="tight">SHELF EMPTY</W.Label>
                )}
                {finished.map(function(w, i) {
                    return <ShelfItem key={w.id} item={w} index={i} />;
                })}
            </W.Strip>

            {/* Gold display */}
            <W.Label size={21} color="gold" bold font="heading" style={{ flexShrink: 0 }}>
                {props.gold || 0}g
            </W.Label>

            {/* Options gear button */}
            <W.Btn onClick={props.onOptions} icon={"\u2699"}
                   color="textLabel" bg="bgWarm" size={20} radius="md"
                   w={32} h={32} bold={false} upper={false}
                   style={{ padding: 0, flexShrink: 0, border: T.borders.thin }} />

            {/* Fullscreen toggle */}
            <W.Btn onClick={props.onToggleFullscreen} icon={props.isFull ? "\u2716" : "\u26F6"}
                   color="textLabel" bg="bgWarm" size={16} radius="md"
                   w={32} h={32} bold={false} upper={false}
                   style={{ padding: 0, flexShrink: 0, border: T.borders.thin }} />
        </W.Strip>
    );
}

// --- Mobile Layout ---

function MobileLayout(props) {
    var T = THEME;
    var handedness = props.handedness || "right";
    var isLeftHanded = handedness === "left";
    var phase = props.phase || "idle";
    var isForging = phase !== "idle" && phase !== "select" && phase !== "select_mat";
    var isQTEActive = phase === "heat" || phase === "hammer" || phase === "quench";
    // True for ANY non-idle phase — used for drawer auto-open and content switching
    var isInForgeFlow = phase !== "idle";
    var isFull = useFullscreenState();
    var finished = props.finished || [];

    // --- Drawer state ---
    var [drawerOpen, setDrawerOpen] = useState(false);

    // Auto-open when entering any forge phase, auto-close when returning to idle
    var prevInForgeFlow = useRef(false);
    useEffect(function() {
        if (isInForgeFlow && !prevInForgeFlow.current) {
            setDrawerOpen(true);
        }
        if (!isInForgeFlow && prevInForgeFlow.current) {
            setDrawerOpen(false);
        }
        prevInForgeFlow.current = isInForgeFlow;
    }, [isInForgeFlow]);

// Drawer content — switches based on forge flow vs idle
    // --- Helper: desktop-style info row (label left, value right) ---
    function DrawerRow(rProps) {
        return (
            <W.Strip justify="space-between" gap="xs" style={{ minHeight: 20 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">{rProps.label}</W.Label>
                <W.Label size={rProps.size || "xl"} color={rProps.color || "gold"} bold style={{ textAlign: "right" }}>{rProps.value}</W.Label>
            </W.Strip>
        );
    }

    var drawerContent = isInForgeFlow ? (
        <W.Box gap="md" style={{ padding: "4px 0" }}>
            <W.Strip gap="xs" center style={{ marginBottom: 4 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">LV</W.Label>
                <W.Label size="h2" color="gold" bold font="heading">{props.level || 1}</W.Label>
                <W.Label size="xl" color="goldBright" bold font="heading" style={{ marginLeft: 8 }}>{props.rankName || ""}</W.Label>
            </W.Strip>
            <W.Divider />
            <DrawerRow label="MATERIAL" value={props.matName || ""} color={props.matColor || "#a0a0a0"} />
            <DrawerRow label="WEAPON" value={props.weaponName || ""} color="textLight" />
            <W.Divider />
            <DrawerRow label="SPEED" value={props.speedLabel || "NORMAL"} color={props.speedColor || T.colors.gold} />
            <DrawerRow label="STRIKES" value={props.strikeLabel || "STEADY"} color={props.strikeColor || T.colors.gold} />
            <DrawerRow label="EFF. DIFF" value={(props.effDiff || 0) + (props.matDiffMod > 0 ? " (+" + props.matDiffMod + ")" : "")} color={props.diffColor || T.colors.goldBright} />
            <W.Divider />
            <W.Strip justify="space-between" gap="xs" style={{ minHeight: 20 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">QUALITY</W.Label>
                <W.Strip gap="xs">
                    <W.Label size="xl" color={props.qualityColor || "gold"} bold>{props.qualityLabel || ""}</W.Label>
                    <W.Label size="xl" color={props.qualityColor || "gold"} bold>{props.qualScore || 0}</W.Label>
                </W.Strip>
            </W.Strip>
            <W.Strip justify="space-between" gap="xs" style={{ minHeight: 20 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">STRESS</W.Label>
                <W.Strip gap="xs" center>
                    <W.PipRow count={3} filled={props.stressFilled || 0} color={props.stressColor || T.colors.green} size={10} />
                    <W.Label size="xl" color={props.stressColor || T.colors.green} bold>{props.stressLabel || "CALM"}</W.Label>
                </W.Strip>
            </W.Strip>
        </W.Box>
    ) : (
        <W.Box gap="sm" style={{ padding: "4px 0" }}>
            <W.Strip gap="xs" center style={{ marginBottom: 4 }}>
                <W.Label size="md" color="textLabel" spacing="tight" bold font="heading">LV</W.Label>
                <W.Label size="h2" color="gold" bold font="heading">{props.level || 1}</W.Label>
                <W.Label size="xl" color="goldBright" bold font="heading" style={{ marginLeft: 8 }}>{props.rankName || ""}</W.Label>
            </W.Strip>
            <W.Divider />
            <W.Label size="sm" color="textLabel" spacing="tight" align="center" font="heading">REP</W.Label>
            <W.PipRow count={8} filled={props.reputation || 0} color={props.repColor || T.colors.orange} wrap center style={{ marginTop: 2 }} />
            {props.stats && (
                <W.Box gap="sm" style={{ marginTop: 8, borderTop: T.borders.thinMid, paddingTop: 8 }}>
                    {[["BRN", "brawn", T.colors.gold], ["PRC", "precision", T.colors.blue], ["TEC", "technique", T.colors.green], ["SLV", "silverTongue", T.colors.purple]].map(function(s) {
                        return (
                            <W.Box key={s[0]}>
                                <W.Label size="xs" color={s[2]} spacing="tight" bold font="heading" style={{ marginBottom: 2 }}>{s[0]}</W.Label>
                                <W.PipRow count={8} filled={props.stats[s[1]] || 0} color={s[2]} />
                            </W.Box>
                        );
                    })}
                    {(props.statPoints || 0) > 0 && (
                        <W.Label size="xs" color="gold" align="center" spacing="tight" bold style={{ marginTop: 2 }}>+{props.statPoints} PTS</W.Label>
                    )}
                </W.Box>
            )}
        </W.Box>
    );

    // Drawer side classes
    var drawerSide = isLeftHanded ? "right" : "left";
    var drawerSideClass = "mobile-drawer mobile-drawer-" + drawerSide + (isInForgeFlow ? " mobile-drawer-forge" : "");
    var tabSideClass = "mobile-drawer-tab mobile-drawer-tab-" + drawerSide;
    var tabArrow = isLeftHanded ? (drawerOpen ? "\u25B6" : "\u25C0") : (drawerOpen ? "\u25C0" : "\u25B6");

    // Drawer + tab + backdrop assembly
    var drawer = (
        <>
            {/* Tab — hidden during any forge flow (drawer is forced open) */}
            {!isInForgeFlow && (
                <div className={tabSideClass} onClick={function() { setDrawerOpen(function(o) { return !o; }); }}>
                    {tabArrow}
                </div>
            )}
            {/* Backdrop — tap to close (only in idle when manually opened) */}
            {drawerOpen && !isInForgeFlow && (
                <div className="mobile-drawer-backdrop" onClick={function() { setDrawerOpen(false); }} />
            )}
            {/* Drawer panel */}
            {drawerOpen && (
                <div className={drawerSideClass}>
                    {drawerContent}
                </div>
            )}
        </>
    );

    // --- Action strip ---
    var actionStripClass = "mobile-action-strip" + (isQTEActive ? " mobile-action-strip-qte" : "");
    var col1Nudge = isLeftHanded ? { paddingRight: "10%" } : { paddingLeft: "10%" };
    var col1Style = { flex: 1.3, display: "flex", flexDirection: "column", gap: "0.8vh", justifyContent: "center", alignItems: "center" };
    Object.assign(col1Style, col1Nudge);
    var bowlDirection = isLeftHanded ? "row-reverse" : "row";
    var actionStrip = (
        <div className={actionStripClass} style={{ height: "100%", padding: "2vh 4px", gap: "1.5vh", overflow: "hidden" }}>
            {isForging && phase === "sess_result" ? (
                <div style={{ flex: 1, display: "flex", gap: "1.5vh", flexDirection: bowlDirection }}>
                    {/* Left column — 2 bigger buttons */}
                    <div style={col1Style}>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.forge} onClick={props.onForge} disabled={props.forgeDisabled} holdContent="Heat and strike again to improve quality" imgSize={79} /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.quench} onClick={props.onQuench} disabled={props.quenchDisabled} holdContent="Finish the weapon — lock in your work" imgSize={79} /></div>
                    </div>
                    {/* Right column — 3 smaller buttons */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.normalize} onClick={props.onNormalize} disabled={props.normalizeDisabled} color="#60a5fa" holdContent="Reduce stress at the cost of some quality" /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.scrap} onClick={props.onScrap} color="#8a7a64" holdContent="Destroy this weapon and recover the material" /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.leave} onClick={props.onLeave} color="#60a5fa" holdContent="Walk away — weapon stays on the anvil" /></div>
                    </div>
                </div>
            ) : isQTEActive ? (
                <div style={{ flex: 1, display: "flex", gap: "1.5vh", flexDirection: bowlDirection, visibility: "hidden", pointerEvents: "none" }}>
                    <div style={col1Style}>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.sleep} /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.rest} /></div>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.scavenge} /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.shop} /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.bag} /></div>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, display: "flex", gap: "1.5vh", flexDirection: bowlDirection }}>
                    {/* Left column — 2 bigger buttons */}
                    <div style={col1Style}>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.sleep} onClick={props.onSleep} disabled={props.sleepDisabled} holdContent="End the day and rest until morning" imgSize={79} /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.rest} onClick={props.onRest} disabled={props.restDisabled} holdContent="Wait one hour, recover some stamina" imgSize={79} /></div>
                    </div>
                    {/* Right column — 3 smaller buttons */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5vh" }}>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.scavenge} onClick={props.onScavenge} disabled={props.scavengeDisabled} holdContent="Search the scrapyard for free materials" /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.shop} onClick={props.onShop} disabled={props.shopDisabled} holdContent="Browse weapons, materials, and upgrades" /></div>
                        <div style={{ flex: 1, display: "flex" }}><MobileBtn imgSrc={IC.bag} onClick={props.onMats} disabled={props.matsDisabled} holdContent="Check your material stockpile" /></div>
                    </div>
                </div>
            )}
            {/* Utility row — options + fullscreen, always visible, tappable during QTE */}
            <div style={{ flex: 0.6, display: "flex", gap: "1.5vh", flexShrink: 0, maxHeight: "10vh", pointerEvents: "auto", justifyContent: isLeftHanded ? "flex-start" : "flex-end" }}>
                <div style={{ display: "flex", width: 40 }}>
                    <MobileBtn icon={"\u2699"} iconSize={32} onClick={props.onOptions} />
                </div>
                <div style={{ display: "flex", width: 40 }}>
                    <MobileBtn icon={isFull ? "\u2716" : "\u26F6"} iconSize={32} onClick={function() {
                        if (isFull) { userExitedFullscreen.current = true; exitFullscreen(); }
                        else { userExitedFullscreen.current = false; requestFullscreen(document.documentElement); }
                    }} />
                </div>
            </div>
        </div>
    );

    // --- Decree float (left of sidebar, between rest and sleep height) ---
    var decreeFloat = props.royalQuest && !isForging && !isQTEActive ? (
        <div style={{
            position: "absolute",
            top: "6%",
            left: isLeftHanded ? "auto" : "6%",
            right: isLeftHanded ? "6%" : "auto",
            zIndex: T.z.ui + 1,
            width: 78,
            height: 78,
        }}>
            <DecreeBtn quest={Object.assign({}, props.royalQuest, { _currentDay: props.day || 1 })} questNum={props.questNum} />
        </div>
    ) : null;

    // --- Center content ---
    var forgeBtnPos = { position: "absolute", top: "55%", left: "50%", transform: "translate(-50%, -50%)", zIndex: T.z.ui };
    var center = (
        <div className="mobile-center" onClick={isQTEActive ? props.onForgeClick : null} onTouchStart={isQTEActive ? function(e) { e.preventDefault(); props.onForgeClick(); } : null} style={{ cursor: isQTEActive ? "pointer" : "default" }}>
            {props.overlay}
            {props.scene}
            {props.forgeUI}
            <ForgeFireFX active={isForging} config={GameConstants.FIRE_FX_MOBILE} />

            {/* Begin Forge button — idle, no WIP, centered at bottom */}
            {phase === "idle" && !props.hasWip && (
                <W.Btn label="BEGIN FORGING" onClick={props.onBeginForge} disabled={props.beginForgeDisabled}
                       color="gold" font="heading" size="xl" radius="lg" spacing="normal"
                       style={Object.assign({}, forgeBtnPos, { padding: "10px 28px", whiteSpace: "nowrap" })} />
            )}

            {/* Resume WIP button — idle with WIP */}
            {phase === "idle" && props.hasWip && (
                <W.Strip gap="md" style={forgeBtnPos}>
                    <W.Btn label="RESUME" onClick={props.onResumeWip} disabled={props.resumeWipDisabled}
                           color="blue" bg={props.resumeWipDisabled ? "bgDeep" : "#0a1a2a"}
                           font="heading" size="lg" radius="lg" spacing="normal"
                           style={{ padding: "10px 20px" }} />
                    <W.Btn label="SCRAP" onClick={props.onScrapWip}
                           color="textLabel" bg="bgWarm" font="heading" size="lg" radius="lg" spacing="normal"
                           style={{ padding: "10px 16px", border: T.borders.heavy }} />
                </W.Strip>
            )}
        </div>
    );

    // --- Assemble ---
    var middleDirection = isLeftHanded ? "row-reverse" : "row";
    var barBoxStyle = {
        background: "rgba(0,0,0,0.50)",
        border: "1px solid " + T.colors.borderDark,
        borderRadius: T.radius.md,
        pointerEvents: "none",
    };

    return (
        <MobileShell className={props.className}>
            <div className="mobile-middle" style={{ flexDirection: middleDirection }}>
                {center}
                {decreeFloat}
                {/* Daily Event bar — always visible when mEvent exists, top-most */}
                {props.mEvent && (
                    <div style={{
                        position: "absolute",
                        top: "1.5%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: T.z.ui + 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(0,0,0,0.60)",
                        border: "1px solid " + (props.mEvent.color || T.colors.gold) + "55",
                        borderRadius: T.radius.md,
                        padding: "3px 14px",
                        pointerEvents: "none",
                        maxWidth: "60%",
                    }}>
                        <span style={{ fontSize: 14, lineHeight: 1 }}>{props.mEvent.icon || "\u2728"}</span>
                        <span style={{ fontFamily: "'Cinzel', serif", color: props.mEvent.color || T.colors.gold, fontSize: 11, letterSpacing: 1, fontWeight: "bold", textShadow: "0 1px 3px rgba(0,0,0,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{props.mEvent.msg || "Daily Event"}</span>
                    </div>
                )}
                {/* DAY label — below event bar */}
                <div style={{
                    position: "absolute",
                    top: props.mEvent ? "7%" : "2%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: T.z.ui + 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: barBoxStyle.background,
                    border: barBoxStyle.border,
                    borderRadius: barBoxStyle.borderRadius,
                    padding: "4px 14px",
                    pointerEvents: "none",
                }}>
                    <span style={{ fontFamily: "'Cinzel', serif", color: T.colors.textLabel, fontSize: 18, letterSpacing: 2, fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.9)", lineHeight: 1 }}>DAY</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 28, color: T.colors.textLight, fontWeight: "bold", textShadow: "0 1px 4px rgba(0,0,0,0.9)", lineHeight: 1 }}>{props.day || 1}</span>
                </div>

                {/* --- Shelf icons — separated above time+stamina --- */}
                {finished.length > 0 && (
                    <div style={{
                        position: "absolute",
                        bottom: "14%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: T.z.ui + 3,
                        display: "flex",
                        gap: 6,
                        pointerEvents: "auto",
                    }}>
                        {finished.map(function(w, i) {
                            return <ShelfItem key={w.id} item={w} index={i} />;
                        })}
                    </div>
                )}

                {/* --- Time + Stamina — center bottom, 45% width, bigger text --- */}
                <div style={{
                    position: "absolute",
                    bottom: "2%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    zIndex: T.z.ui + 2,
                    width: "45%",
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    padding: "4px 14px",
                    background: barBoxStyle.background,
                    border: barBoxStyle.border,
                    borderRadius: barBoxStyle.borderRadius,
                    pointerEvents: "none",
                }}>
                    {/* Time bar */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <W.Label size="xs" color="textLabel" spacing="tight" bold font="heading" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>TIME</W.Label>
                        <div style={{ width: "100%", height: 10, background: T.colors.bgDeep, borderRadius: T.radius.sm, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: (props.timePct || 0) + "%", background: props.timeColor || T.colors.green, borderRadius: T.radius.sm, transition: "width 0.3s" }} />
                        </div>
                        <W.Label size="xs" color={props.timeColor || T.colors.green} bold style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{props.timeLabel || "8:00AM"}</W.Label>
                    </div>
                    {/* Stamina bar */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <W.Label size="xs" color="textLabel" spacing="tight" bold font="heading" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>STAM</W.Label>
                        <div style={{ width: "100%", height: 10, background: T.colors.bgDeep, borderRadius: T.radius.sm, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: (props.staminaPct || 0) + "%", background: props.staminaColor || T.colors.gold, borderRadius: T.radius.sm, transition: "width 0.3s" }} />
                        </div>
                        <W.Label size="xs" color={props.staminaColor || T.colors.gold} bold style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{(props.stamina || 0) + "/" + (props.maxStam || 5)}</W.Label>
                    </div>
                </div>

                {/* --- Gold — bottom left (flips for left-handed) --- */}
                <div style={{
                    position: "absolute",
                    bottom: "2%",
                    left: isLeftHanded ? "auto" : "2%",
                    right: isLeftHanded ? "2%" : "auto",
                    zIndex: T.z.ui + 2,
                    display: "flex",
                    alignItems: "center",
                    padding: "4px 12px",
                    background: barBoxStyle.background,
                    border: barBoxStyle.border,
                    borderRadius: barBoxStyle.borderRadius,
                    pointerEvents: "none",
                }}>
                    <W.Label size={21} color="gold" bold font="heading" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>{props.gold || 0}g</W.Label>
                </div>

                {/* Sidebar background image — free-floating, not clipped by action strip */}
                <img src={IC.sidebar} alt="" draggable={false} style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    right: isLeftHanded ? "auto" : 0,
                    left: isLeftHanded ? 0 : "auto",
                    height: "100%",
                    width: 340,
                    objectFit: "cover",
                    opacity: .8,
                    transform: isLeftHanded ? "scaleX(-1)" : "none",
                    pointerEvents: "none",
                    zIndex: T.z.ui - 1,
                }} />
                {/* Action strip — absolute overlay, passes clicks during QTE */}
                <div style={{
                    position: "absolute",
                    top: 0,
                    bottom: "3%",
                    right: isLeftHanded ? "auto" : "3%",
                    left: isLeftHanded ? "3%" : "auto",
                    width: 200,
                    display: "flex",
                    flexDirection: "column",
                    zIndex: T.z.ui,
                    background: "transparent",
                    pointerEvents: isQTEActive ? "none" : "auto",
                }}>
                    {actionStrip}
                </div>
                {drawer}
            </div>
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
    requestFullscreen: requestFullscreen,
    isFullscreenActive: isFullscreenActive,
};

export default MobileLayoutModule;