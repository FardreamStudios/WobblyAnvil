// ============================================================
// useAmbientAudio.js — Wobbly Anvil Ambient Audio Layer
// Manages file-based ambient music + fire SFX channels.
// Runs independently from the procedural audio system.
//
// Uses HTML Audio elements (not Web Audio decodeAudioData)
// for maximum format compatibility.
//
// Channels:
//   ambient    — quiet background loop (fades out during forge)
//   fireLoop   — looping fire crackle (fades in/out with forge)
//   fireBurst  — one-shot fire startup (no fade)
//   hammerPing — random ping from pool, timing deviation (forge only)
//
// Pattern: consumes isForging boolean, handles all transitions
// internally. Views don't touch this — it's pure side-effect.
// ============================================================

import { useEffect, useRef } from "react";
import GameConstants from "../modules/constants.js";

var AMBIENT = GameConstants.AMBIENT_AUDIO;

// --- Resolve base path from current page URL ---
// Handles subpaths like /WobblyAnvil on both dev and GitHub Pages
var _base = (process.env.PUBLIC_URL || "");
function audioPath(filename) {
    return _base + "/audio/" + filename;
}

// --- Fade interval rate (ms) ---
var FADE_STEP_MS = 30;

// ============================================================
// Helper: fade an Audio element's volume over duration
// ============================================================
function fadeVolume(audio, targetVol, durationMs, callback) {
    if (!audio) { if (callback) callback(); return; }

    var steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
    var startVol = audio.volume;
    var delta = (targetVol - startVol) / steps;
    var step = 0;

    var interval = setInterval(function() {
        step++;
        if (step >= steps) {
            audio.volume = Math.max(0, Math.min(1, targetVol));
            clearInterval(interval);
            if (callback) callback();
            return;
        }
        audio.volume = Math.max(0, Math.min(1, startVol + delta * step));
    }, FADE_STEP_MS);

    return interval;
}

// ============================================================
// Hook
// ============================================================

function useAmbientAudio(deps) {
    var isForging  = deps.isForging;
    var muted      = deps.muted;
    var suspended  = deps.suspended || false;
    var sfxVol    = deps.sfxVol !== undefined ? deps.sfxVol : 1;

    var ambientRef    = useRef(null);   // Audio element
    var fireLoopRef   = useRef(null);   // Audio element
    var fireBurstRef  = useRef(null);   // Audio element
    var hammerPoolRef = useRef([]);     // Array of Audio elements (one per hammer file)
    var hammerTimerRef = useRef(null);  // setTimeout id for next hammer ping
    var startedRef    = useRef(false);
    var forgingRef    = useRef(false);
    var mutedRef      = useRef(false);
    var sfxVolRef     = useRef(sfxVol); // tracks slider value for use in closures
    var suspendedRef  = useRef(false);
    var fadeTimers     = useRef([]);     // active fade intervals

    mutedRef.current = muted;
    sfxVolRef.current = sfxVol;
    suspendedRef.current = suspended;

    // --- Cancel all active fades ---
    function clearFades() {
        for (var i = 0; i < fadeTimers.current.length; i++) {
            clearInterval(fadeTimers.current[i]);
        }
        fadeTimers.current = [];
    }

    // --- Track a fade timer ---
    function trackFade(timer) {
        if (timer) fadeTimers.current.push(timer);
    }

    // --- Create and preload an Audio element ---
    function createAudio(path, loop) {
        var audio = new Audio(path);
        audio.loop = loop;
        audio.volume = 0;
        audio.preload = "auto";
        return audio;
    }

    // --- Init audio elements (once) ---
    function initAudio() {
        if (!ambientRef.current) {
            ambientRef.current = createAudio(audioPath(AMBIENT.ambientFile), true);
        }
        if (!fireLoopRef.current) {
            fireLoopRef.current = createAudio(audioPath(AMBIENT.fireLoopFile), true);
        }
        if (!fireBurstRef.current) {
            fireBurstRef.current = createAudio(audioPath(AMBIENT.fireBurstFile), false);
        }
        if (hammerPoolRef.current.length === 0 && AMBIENT.hammerFiles) {
            hammerPoolRef.current = AMBIENT.hammerFiles.map(function(f) {
                return createAudio(audioPath(f), false);
            });
        }
    }

    // --- Start ambient (first user interaction) ---
    function startAmbient() {
        if (startedRef.current) return;
        if (mutedRef.current) return;
        startedRef.current = true;

        initAudio();

        var ambient = ambientRef.current;
        ambient.volume = 0;
        ambient.play().catch(function() {});
        trackFade(fadeVolume(ambient, AMBIENT.ambientVol * sfxVolRef.current, AMBIENT.fadeInSec * 1000));
    }

    // --- Hammer ambient loop ---
    function startHammerLoop() {
        if (!AMBIENT.hammerFiles || AMBIENT.hammerFiles.length === 0) return;
        stopHammerLoop();

        function scheduleNext() {
            var deviation = (Math.random() * 2 - 1) * AMBIENT.hammerDeviationMs;
            var delay = AMBIENT.hammerIntervalMs + deviation;
            hammerTimerRef.current = setTimeout(function() {
                if (!forgingRef.current || mutedRef.current) return;
                // Pick random file from pool
                var pool = hammerPoolRef.current;
                if (pool.length === 0) return;
                var audio = pool[Math.floor(Math.random() * pool.length)];
                audio.currentTime = 0;
                audio.volume = AMBIENT.hammerVol * sfxVolRef.current;
                audio.play().catch(function() {});
                scheduleNext();
            }, Math.max(200, delay));
        }

        // Initial delay before first ping (half interval + deviation)
        var firstDelay = (AMBIENT.hammerIntervalMs * 0.5) + (Math.random() * AMBIENT.hammerDeviationMs);
        hammerTimerRef.current = setTimeout(function() {
            if (!forgingRef.current || mutedRef.current) return;
            var pool = hammerPoolRef.current;
            if (pool.length === 0) return;
            var audio = pool[Math.floor(Math.random() * pool.length)];
            audio.currentTime = 0;
            audio.volume = AMBIENT.hammerVol * sfxVolRef.current;
            audio.play().catch(function() {});
            scheduleNext();
        }, Math.max(200, firstDelay));
    }

    function stopHammerLoop() {
        if (hammerTimerRef.current) {
            clearTimeout(hammerTimerRef.current);
            hammerTimerRef.current = null;
        }
    }

    // --- Transition: idle → forge ---
    function enterForge() {
        clearFades();

        // Fade out ambient
        var ambient = ambientRef.current;
        if (ambient) {
            trackFade(fadeVolume(ambient, 0, AMBIENT.fadeOutSec * 1000, function() {
                ambient.pause();
            }));
        }

        // Fire burst (immediate, no fade)
        var burst = fireBurstRef.current;
        if (burst) {
            burst.currentTime = 0;
            burst.volume = AMBIENT.fireBurstVol * sfxVolRef.current;
            burst.play().catch(function() {});
        }

        // Fire loop (fade in)
        var fireLoop = fireLoopRef.current;
        if (fireLoop) {
            fireLoop.currentTime = 0;
            fireLoop.volume = 0;
            fireLoop.play().catch(function() {});
            trackFade(fadeVolume(fireLoop, AMBIENT.fireLoopVol * sfxVolRef.current, AMBIENT.fadeInSec * 1000));
        }

        // Hammer ambient ping loop
        startHammerLoop();
    }

    // --- Transition: forge → idle ---
    function exitForge() {
        clearFades();
        stopHammerLoop();

        // Fade out fire loop
        var fireLoop = fireLoopRef.current;
        if (fireLoop) {
            trackFade(fadeVolume(fireLoop, 0, AMBIENT.fadeOutSec * 1000, function() {
                fireLoop.pause();
            }));
        }

        // Fade ambient back in
        var ambient = ambientRef.current;
        if (ambient && !mutedRef.current) {
            ambient.play().catch(function() {});
            trackFade(fadeVolume(ambient, AMBIENT.ambientVol * sfxVolRef.current, AMBIENT.fadeInSec * 1000));
        }
    }

    // --- React to forge state changes ---
    useEffect(function() {
        if (!startedRef.current) return;
        if (mutedRef.current) return;
        if (suspendedRef.current) return;

        if (isForging && !forgingRef.current) {
            forgingRef.current = true;
            enterForge();
        } else if (!isForging && forgingRef.current) {
            forgingRef.current = false;
            exitForge();
        }
    }, [isForging]);

    // --- React to mute changes ---
    useEffect(function() {
        if (muted) {
            clearFades();
            stopHammerLoop();
            if (ambientRef.current) { ambientRef.current.pause(); ambientRef.current.volume = 0; }
            if (fireLoopRef.current) { fireLoopRef.current.pause(); fireLoopRef.current.volume = 0; }
            startedRef.current = false;
            forgingRef.current = false;
        }
    }, [muted]);

    // --- React to sfxVol slider changes (live update playing elements) ---
    useEffect(function() {
        if (!startedRef.current || mutedRef.current) return;
        if (forgingRef.current) {
            // During forge: fire loop is playing, ambient is paused
            if (fireLoopRef.current && !fireLoopRef.current.paused) {
                fireLoopRef.current.volume = AMBIENT.fireLoopVol * sfxVol;
            }
        } else {
            // Idle: ambient is playing, fire is paused
            if (ambientRef.current && !ambientRef.current.paused) {
                ambientRef.current.volume = AMBIENT.ambientVol * sfxVol;
            }
        }
    }, [sfxVol]);

    // --- React to suspended state (battle transition) ---
    useEffect(function() {
        if (!startedRef.current) return;

        if (suspended) {
            clearFades();
            stopHammerLoop();
            // Fade everything out quickly
            if (ambientRef.current && !ambientRef.current.paused) {
                trackFade(fadeVolume(ambientRef.current, 0, 300, function() {
                    ambientRef.current.pause();
                }));
            }
            if (fireLoopRef.current && !fireLoopRef.current.paused) {
                trackFade(fadeVolume(fireLoopRef.current, 0, 300, function() {
                    fireLoopRef.current.pause();
                }));
            }
        } else if (!mutedRef.current) {
            // Restore based on current forge state
            if (forgingRef.current) {
                if (fireLoopRef.current) {
                    fireLoopRef.current.play().catch(function() {});
                    trackFade(fadeVolume(fireLoopRef.current, AMBIENT.fireLoopVol * sfxVolRef.current, AMBIENT.fadeInSec * 1000));
                }
                startHammerLoop();
            } else {
                if (ambientRef.current) {
                    ambientRef.current.play().catch(function() {});
                    trackFade(fadeVolume(ambientRef.current, AMBIENT.ambientVol * sfxVolRef.current, AMBIENT.fadeInSec * 1000));
                }
            }
        }
    }, [suspended]);

    // --- Cleanup on unmount ---
    useEffect(function() {
        return function() {
            clearFades();
            stopHammerLoop();
            if (ambientRef.current) { ambientRef.current.pause(); ambientRef.current = null; }
            if (fireLoopRef.current) { fireLoopRef.current.pause(); fireLoopRef.current = null; }
            if (fireBurstRef.current) { fireBurstRef.current.pause(); fireBurstRef.current = null; }
            hammerPoolRef.current.forEach(function(a) { a.pause(); });
            hammerPoolRef.current = [];
        };
    }, []);

    // --- Public API ---
    return {
        startAmbient: startAmbient,
        // suspended prop handles suspend/resume reactively.
        // These are exposed for imperative use if needed.
        suspendAll: function() {
            clearFades();
            stopHammerLoop();
            if (ambientRef.current) { ambientRef.current.pause(); ambientRef.current.volume = 0; }
            if (fireLoopRef.current) { fireLoopRef.current.pause(); fireLoopRef.current.volume = 0; }
        },
        resumeAll: function() {
            if (mutedRef.current) return;
            if (forgingRef.current) {
                if (fireLoopRef.current) {
                    fireLoopRef.current.volume = AMBIENT.fireLoopVol * sfxVolRef.current;
                    fireLoopRef.current.play().catch(function() {});
                }
                startHammerLoop();
            } else {
                if (ambientRef.current) {
                    ambientRef.current.volume = AMBIENT.ambientVol * sfxVolRef.current;
                    ambientRef.current.play().catch(function() {});
                }
            }
        },
    };
}

export default useAmbientAudio;