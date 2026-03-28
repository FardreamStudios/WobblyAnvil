// ============================================================
// useMobileInfra.js — Wobbly Anvil Mobile Infrastructure
// Fullscreen management, wake lock, viewport detection,
// orientation persistence. Extracted from mobileLayout.js.
//
// PORTABLE: No game logic. Pure mobile platform utilities.
// ============================================================

import { useState, useEffect, useRef } from "react";

// --- Design aspect ratio for portrait scale-to-fit ---
var LANDSCAPE_MIN_RATIO = 1.3;

// ============================================================
// FULLSCREEN HELPERS
// ============================================================

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

// --- Shared mutable ref for user-initiated fullscreen exit ---
var userExitedFullscreen = { current: false };

// ============================================================
// WAKE LOCK HOOK
// ============================================================

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

// ============================================================
// FULLSCREEN STATE HOOK
// ============================================================

function useFullscreenState() {
    var [isFull, setIsFull] = useState(isFullscreenActive);

    useEffect(function() {
        function sync() { setIsFull(isFullscreenActive()); }
        // Standard fullscreen events
        document.addEventListener("fullscreenchange", sync);
        document.addEventListener("webkitfullscreenchange", sync);
        document.addEventListener("mozfullscreenchange", sync);
        document.addEventListener("MSFullscreenChange", sync);
        // Fallback: permission dialogs can silently exit fullscreen
        // without firing fullscreenchange on some mobile browsers.
        document.addEventListener("visibilitychange", sync);
        window.addEventListener("focus", sync);
        window.addEventListener("resize", sync);
        return function() {
            document.removeEventListener("fullscreenchange", sync);
            document.removeEventListener("webkitfullscreenchange", sync);
            document.removeEventListener("mozfullscreenchange", sync);
            document.removeEventListener("MSFullscreenChange", sync);
            document.removeEventListener("visibilitychange", sync);
            window.removeEventListener("focus", sync);
            window.removeEventListener("resize", sync);
        };
    }, []);

    return isFull;
}

// ============================================================
// VIEWPORT INFO HOOK
// ============================================================

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

// ============================================================
// FULLSCREEN PERSISTENCE HOOK
// ============================================================

function useFullscreenPersistence(isFull) {
    var wasFull = useRef(false);
    var restoreArmed = useRef(false);

    // One-shot tap-to-restore: arms when fullscreen drops unexpectedly.
    // Next user tap anywhere re-enters fullscreen (real gesture = browser allows it).
    useEffect(function() {
        function onTapRestore() {
            if (!restoreArmed.current) return;
            if (isFullscreenActive()) { _disarmRestore(); return; }
            if (userExitedFullscreen.current) { _disarmRestore(); return; }
            restoreArmed.current = false;
            requestFullscreen(document.documentElement);
            // Keep listeners alive briefly — if requestFullscreen fails silently,
            // next tap will try again. Clean up after success.
            setTimeout(_disarmRestore, 500);
        }
        function _disarmRestore() {
            restoreArmed.current = false;
            document.removeEventListener("touchstart", onTapRestore, true);
            document.removeEventListener("click", onTapRestore, true);
        }
        function _armRestore() {
            if (restoreArmed.current) return;
            restoreArmed.current = true;
            // Capture phase so it fires before any button handlers
            document.addEventListener("touchstart", onTapRestore, true);
            document.addEventListener("click", onTapRestore, true);
        }

        // Expose arm/disarm on the ref so other effects can use them
        restoreArmed._arm = _armRestore;
        restoreArmed._disarm = _disarmRestore;

        return _disarmRestore;
    }, []);

    useEffect(function() {
        if (isFull) {
            wasFull.current = true;
            userExitedFullscreen.current = false;
            // If we're back in fullscreen, disarm restore listener
            if (restoreArmed._disarm) restoreArmed._disarm();
        }
        if (!isFull && wasFull.current && !userExitedFullscreen.current) {
            // Fullscreen dropped unexpectedly — try auto-restore first,
            // then arm tap-to-restore as fallback (covers permission dialog case
            // where auto-restore fails due to missing user gesture).
            var timer = setTimeout(function() {
                if (!isFullscreenActive() && !userExitedFullscreen.current) {
                    requestFullscreen(document.documentElement);
                    // If that fails (no gesture), arm tap restore
                    setTimeout(function() {
                        if (!isFullscreenActive() && !userExitedFullscreen.current) {
                            if (restoreArmed._arm) restoreArmed._arm();
                        }
                    }, 300);
                }
            }, 300);
            return function() { clearTimeout(timer); };
        }
    }, [isFull]);

    // Recovery: when app regains focus after a permission dialog
    // (or any system interruption), attempt to re-enter fullscreen.
    // If auto attempt fails, arm tap-to-restore.
    useEffect(function() {
        function onFocusRecovery() {
            if (!wasFull.current) return;
            if (userExitedFullscreen.current) return;
            if (isFullscreenActive()) return;
            setTimeout(function() {
                if (!isFullscreenActive() && !userExitedFullscreen.current) {
                    requestFullscreen(document.documentElement);
                }
            }, 400);
            // Fallback: arm tap restore in case auto fails
            setTimeout(function() {
                if (!isFullscreenActive() && !userExitedFullscreen.current) {
                    if (restoreArmed._arm) restoreArmed._arm();
                }
            }, 800);
        }
        function onVisChange() {
            if (document.visibilityState === "visible") onFocusRecovery();
        }
        document.addEventListener("visibilitychange", onVisChange);
        window.addEventListener("focus", onFocusRecovery);
        return function() {
            document.removeEventListener("visibilitychange", onVisChange);
            window.removeEventListener("focus", onFocusRecovery);
        };
    }, []);

    useEffect(function() {
        function onOrientationChange() {
            setTimeout(function() {
                var w = window.innerWidth, h = window.innerHeight;
                var isLandscape = w > h;
                if (isLandscape && !isFullscreenActive()) {
                    // Rotating to landscape is an intentional "I want to play" gesture.
                    // Always fullscreen, even if user previously tapped X.
                    userExitedFullscreen.current = false;
                    requestFullscreen(document.documentElement);
                }
            }, 500);
        }
        window.addEventListener("orientationchange", onOrientationChange);
        return function() { window.removeEventListener("orientationchange", onOrientationChange); };
    }, []);
}

// ============================================================
// Plugin-style API
// ============================================================
var MobileInfra = {
    LANDSCAPE_MIN_RATIO: LANDSCAPE_MIN_RATIO,
    isFullscreenActive: isFullscreenActive,
    requestFullscreen: requestFullscreen,
    exitFullscreen: exitFullscreen,
    userExitedFullscreen: userExitedFullscreen,
    useWakeLock: useWakeLock,
    useFullscreenState: useFullscreenState,
    useViewportInfo: useViewportInfo,
    useFullscreenPersistence: useFullscreenPersistence,
};

export default MobileInfra;