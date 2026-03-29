# Battle Transition — Edit Guide

## Overview
4 files edited, 1 new file. All edits use unique content anchors.

---

## FILE 1: `src/modules/constants.js`

### Edit 1A — Add BATTLE_TRANSITION config (after AMBIENT_AUDIO block)

**FIND this anchor:**
```
// --- Fire VFX Config ---
var FIRE_FX = {
```

**INSERT BEFORE that line:**
```
// --- Battle Transition Config ---
var BATTLE_TRANSITION = {
    gridW:          160,        // pixel grid columns (lower = chunkier)
    gridH:          90,         // pixel grid rows
    dissolveMs:     400,        // wipe-in duration (pixels cover screen)
    holdMs:         400,        // solid color hold with flash text
    resolveMs:      400,        // wipe-out duration (pixels clear)
    flashText:      "BATTLE!",  // text during hold (null = skip)
    flashFontSize:  "clamp(18px, 5vw, 32px)",
    flashColor:     "#f59e0b",
    pixelColor:     "#0a0704",  // dissolve pixel color (matches battle bg)
    fanfareDelayMs: 100,        // delay before battle fanfare plays
};

```

### Edit 1B — Add BATTLE_TRANSITION to GameConstants export

**FIND this anchor:**
```
    // Ambient Audio
    AMBIENT_AUDIO: AMBIENT_AUDIO,
```

**INSERT AFTER that line:**
```

    // Battle Transition
    BATTLE_TRANSITION: BATTLE_TRANSITION,
```

---

## FILE 2: `src/modules/audio.js`

### Edit 2A — Add "battle" to setMode (silent mode — just stops music)

**FIND this anchor:**
```
                if (mode === "forge") {
                    loopMusic("forge", FORGE_LOOP, 0.12);
                }
            }, 500);
```

**REPLACE WITH:**
```
                if (mode === "forge") {
                    loopMusic("forge", FORGE_LOOP, 0.12);
                }
                // "battle" mode: music already stopped by stopMusic() above.
                // Battle will own its own music in V2.
            }, 500);
```

### Edit 2B — Add battleFanfare SFX (after gameover function)

**FIND this anchor:**
```
            gameover: function() {
                [220, 196, 174, 130].forEach(function(f, i) {
                    setTimeout(function() { tone(f, "sawtooth", 0.45, 0.25); }, i * 220);
                });
            },
```

**INSERT AFTER that closing `},`:**
```

            battleFanfare: function() {
                // Punchy rising burst — three ascending power chords + impact noise
                tone(220, "sawtooth", 0.15, 0.20);
                tone(165, "sawtooth", 0.15, 0.12);
                setTimeout(function() {
                    tone(294, "sawtooth", 0.15, 0.22);
                    tone(220, "sawtooth", 0.15, 0.14);
                }, 100);
                setTimeout(function() {
                    tone(392, "sawtooth", 0.25, 0.25);
                    tone(294, "sawtooth", 0.25, 0.16);
                    noise(0.3, 0.18, 300);
                }, 200);
                // Final impact hit
                setTimeout(function() {
                    tone(147, "square", 0.4, 0.20);
                    noise(0.15, 0.25, 150);
                }, 350);
            },
```

---

## FILE 3: `src/hooks/useAmbientAudio.js`

### Edit 3A — Add `suspended` prop to deps destructure

**FIND this anchor:**
```
function useAmbientAudio(deps) {
    var isForging = deps.isForging;
    var muted     = deps.muted;
```

**REPLACE WITH:**
```
function useAmbientAudio(deps) {
    var isForging  = deps.isForging;
    var muted      = deps.muted;
    var suspended  = deps.suspended || false;
```

### Edit 3B — Add suspendedRef tracking (after sfxVolRef line)

**FIND this anchor:**
```
    var sfxVolRef     = useRef(sfxVol); // tracks slider value for use in closures
    var fadeTimers     = useRef([]);     // active fade intervals

    mutedRef.current = muted;
    sfxVolRef.current = sfxVol;
```

**REPLACE WITH:**
```
    var sfxVolRef      = useRef(sfxVol); // tracks slider value for use in closures
    var suspendedRef   = useRef(false);
    var fadeTimers     = useRef([]);     // active fade intervals

    mutedRef.current = muted;
    sfxVolRef.current = sfxVol;
    suspendedRef.current = suspended;
```

### Edit 3C — Add suspend/resume useEffect (before the cleanup useEffect)

**FIND this anchor:**
```
    // --- Cleanup on unmount ---
    useEffect(function() {
        return function() {
            clearFades();
            stopHammerLoop();
```

**INSERT BEFORE that block:**
```
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

```

### Edit 3D — Guard forge transitions when suspended

**FIND this anchor (in the isForging useEffect):**
```
    // --- React to forge state changes ---
    useEffect(function() {
        if (!startedRef.current) return;
        if (mutedRef.current) return;
```

**REPLACE WITH:**
```
    // --- React to forge state changes ---
    useEffect(function() {
        if (!startedRef.current) return;
        if (mutedRef.current) return;
        if (suspendedRef.current) return;
```

### Edit 3E — Add suspendAll / resumeAll to public API

**FIND this anchor:**
```
    // --- Public API ---
    return {
        startAmbient: startAmbient,
    };
```

**REPLACE WITH:**
```
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
```

---

## FILE 4: `src/App.js`

### Edit 4A — Import BattleTransition

**FIND this anchor:**
```
import BattleViewModule from "./battle/BattleView.js";

var ScavengeMenu = ScavengeMenuModule.ScavengeMenu;
var BattleView = BattleViewModule.BattleView;
```

**REPLACE WITH:**
```
import BattleViewModule from "./battle/BattleView.js";
import BattleTransitionModule from "./battle/BattleTransition.js";

var ScavengeMenu = ScavengeMenuModule.ScavengeMenu;
var BattleView = BattleViewModule.BattleView;
var BattleTransition = BattleTransitionModule.BattleTransition;
var BATTLE_TRANSITION = GameConstants.BATTLE_TRANSITION;
```

### Edit 4B — Add `suspended` prop to useAmbientAudio call

You need to find where `useAmbientAudio` is called in App.js. It will look something like:

```
var ambient = useAmbientAudio({ isForging: isForging, muted: muted, sfxVol: sfxVol });
```

**REPLACE WITH:**
```
var isBattleActive = scavengeMode === "transition" || scavengeMode === "battle" || scavengeMode === "battle_mounting" || scavengeMode === "transition_out";
var ambient = useAmbientAudio({ isForging: isForging, muted: muted, sfxVol: sfxVol, suspended: isBattleActive });
```

### Edit 4C — Add sfx.setMode("battle") and restore on exit

**FIND the Extended Scavenge handler:**
```
onExtendedScavenge={function() { setScavengeMode("battle"); }}
```

**REPLACE WITH:**
```
onExtendedScavenge={function() { sfx.setMode("battle"); setScavengeMode("transition"); }}
```

### Edit 4D — Replace the battle render gate

**FIND this anchor:**
```
  // ============================================================
  // SCAVENGE BATTLE — Full-screen takeover
  // ============================================================
  if (scavengeMode === "battle") {
    return (
        <BattleView
            handedness={handedness}
            onExit={function() { setScavengeMode(null); }}
            zoneName="Back Alley"
            waveLabel="Wave 1/2"
        />
    );
  }
```

**REPLACE WITH:**
```
  // ============================================================
  // SCAVENGE BATTLE — Full-screen takeover with transition
  // ============================================================
  if (scavengeMode === "transition") {
    return (
        <>
            <BattleTransition
                config={BATTLE_TRANSITION}
                sfx={sfx}
                onMidpoint={function() { setScavengeMode("battle_mounting"); }}
                onComplete={function() { setScavengeMode("battle"); }}
            />
        </>
    );
  }
  if (scavengeMode === "battle_mounting") {
    return (
        <>
            <BattleView
                handedness={handedness}
                onExit={function() { setScavengeMode("transition_out"); }}
                zoneName="Back Alley"
                waveLabel="Wave 1/2"
            />
            <BattleTransition
                config={BATTLE_TRANSITION}
                sfx={sfx}
                onMidpoint={function() { setScavengeMode("battle_mounting"); }}
                onComplete={function() { setScavengeMode("battle"); }}
            />
        </>
    );
  }
  if (scavengeMode === "battle") {
    return (
        <BattleView
            handedness={handedness}
            onExit={function() { setScavengeMode("transition_out"); }}
            zoneName="Back Alley"
            waveLabel="Wave 1/2"
        />
    );
  }
  if (scavengeMode === "transition_out") {
    return (
        <>
            <BattleTransition
                config={Object.assign({}, BATTLE_TRANSITION, { flashText: null, fanfareDelayMs: -1 })}
                reverse={true}
                onMidpoint={function() { setScavengeMode("exiting"); }}
                onComplete={function() { sfx.setMode("idle"); setScavengeMode(null); }}
            />
        </>
    );
  }
  if (scavengeMode === "exiting") {
    return (
        <>
            <BattleTransition
                config={Object.assign({}, BATTLE_TRANSITION, { flashText: null, fanfareDelayMs: -1 })}
                reverse={true}
                onMidpoint={function() {}}
                onComplete={function() { sfx.setMode("idle"); setScavengeMode(null); }}
            />
        </>
    );
  }
```

### Edit 4E — Duplicate for desktop render path

The same `scavengeMode === "menu"` block exists in the desktop render. Find it and apply the same `onExtendedScavenge` change (Edit 4C) there too.

---

## NOTES

### ScavengeMode flow:
```
null → "menu" → "transition" → "battle_mounting" → "battle" → "transition_out" → "exiting" → null
                  ↑ dissolve in    ↑ BV mounts        ↑ playing    ↑ dissolve out     ↑ game restores
                  ↑ fanfare plays  ↑ transition covers              ↑ no fanfare
                  ↑ ambient fades  ↑ until complete                  ↑ idle mode restores
```

### Portrait mode fix (DEFERRED):
BattleView currently bypasses MobileShell. Fix separately — wrap battle states in MobileShell in a follow-up task. Noted in handoff.

### What's NOT touched:
- No tutorial code paths affected
- No bus tags added
- No existing component behavior changed
- Battle system portability preserved (BattleTransition is host-side, not inside battle/)