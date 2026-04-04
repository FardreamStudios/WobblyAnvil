// ============================================================
// starfallBeam.js — Fairy's Starfall Beam (Special Skill)
//
// First special skill implementation. Uses the takeover protocol
// defined in SpecialSkillSystemSpec.md.
//
// This file IS the skill — config + controller in one object.
// The director looks up this object via BattleSkills.getSkill(),
// detects skillType "special", and hands control to activate().
//
// LIFECYCLE:
//   Director calls activate(bridge) → skill scripts its sequence
//   Skill calls bridge.release()    → director resumes turn flow
//   Director calls abort(reason)    → skill cleans up visuals
//
// OWNS: Internal sequencing, timing, visual cleanup on abort.
// DOES NOT OWN: Game state, KO handling, cam lifecycle, turn
//   order, wave transitions. All go through bridge or director.
//
// STATUS: Step-by-step rebuild.
//         Currently: cam enter → skill name → aim QTE → log result → release.
//         Next: beam VFX + damage ticks.
// ============================================================

// ============================================================
// SKILL CONSTANTS (tuning values unique to this skill)
// ============================================================

var STARFALL = {
    // Sequence timing
    chargeHoldMs:       800,    // hold in charge pose before cam
    skillNameHoldMs:    1200,   // how long name banner stays up
    ignitionMs:         150,    // time per frame during 0→1→2→3 ignition
    frameLoopMs:        200,    // toggle speed for frames 2↔3 during beam
    windFrameMs:        150,    // time per frame during wind-down reverse
    releaseHoldMs:      1000,   // pause after wind-down before releasing to director

    // Loop structure: 1 round = 1 aim ring + 10 damage rings
    loopCount:          1,
    dmgRingsPerLoop:    10,
    loopPauseMs:        500,    // pause between loops

    // Damage tuning
    beamBaseDamage:     5,      // base damage per damage ring
    missDmgMult:        0.25,   // damage multiplier when damage ring is missed

    // Aim ring — sets damage multiplier for the 10 rings that follow
    aimQte:  {
        type:             "chalkboard",
        rings:            1,
        speeds:           [1.4],
        delays:           [150],
        shrinkDurationMs: 500,
        zoneBonus:        0.20,
        targetRadius:     24,
        ringStartRadius:  70,
        label:            "AIM!",
        beats:            [{ check: "ring", damage: 0, atkAnim: null, tgtReact: null, shake: null, sfx: null }],
        _difficulty:      { hitZone: 0.35, perfectZone: 0.15, damageMap: {} },
    },

    // Damage ring — bonus damage checks, no fail-out
    dmgQte:  {
        type:             "chalkboard",
        rings:            1,
        speeds:           [1.0],
        delays:           [0],
        shrinkDurationMs: 325,
        zoneBonus:        0.20,
        targetRadius:     24,
        ringStartRadius:  70,
        label:            "Focus!",
        beats:            [{ check: "ring", damage: 0, atkAnim: null, tgtReact: null, shake: null, sfx: null }],
        _difficulty:      { hitZone: 0.40, perfectZone: 0.18, damageMap: {} },
    },
};

// ============================================================
// INTERNAL STATE
//
// Tracks where the skill is in its sequence so abort() knows
// what to clean up. Reset on each activation.
// ============================================================

var _bridge       = null;   // bridge handle from director
var _casterId     = null;   // who's casting
var _targetId     = null;   // current target
var _damageTimer  = null;   // interval handle for damage tick loop
var _frameTimer   = null;   // interval handle for 2↔3 frame loop
var _aimMult      = 1.0;    // accuracy multiplier from aim QTE
var _beamActive   = false;  // is beam VFX currently on
var _released     = false;  // prevent double-release

// ============================================================
// ACTIVATE — Director calls this when the caster's turn arrives
//            and they have a charged Starfall Beam ready.
//
// Skeleton: validates target, holds briefly, releases.
// Full sequence (steps 7–11) replaces the body below.
// ============================================================

function activate(bridge) {
    _bridge      = bridge;
    _released    = false;
    _beamActive  = false;
    _damageTimer = null;
    _frameTimer  = null;
    _aimMult     = 1.0;

    // Read charge info — director stored casterId and targetId
    // when the player declared the skill.
    _casterId = bridge.getCurrentTurnId();
    _targetId = bridge.getFlag(_casterId, "chargingSkill")
        ? bridge.getFlag(_casterId, "chargingSkill").targetId
        : null;

    console.log("[StarfallBeam] ACTIVATE — caster:", _casterId, "target:", _targetId);

    // ----------------------------------------------------------
    // Step 1 — Validate target
    // ----------------------------------------------------------
    if (!_targetId || !bridge.isAlive(_targetId)) {
        var newTarget = bridge.getNextTarget("enemy");
        if (!newTarget) {
            console.log("[StarfallBeam] No valid targets — releasing");
            _doRelease();
            return;
        }
        console.log("[StarfallBeam] Retarget:", _targetId, "→", newTarget);
        _targetId = newTarget;
    }

    // ----------------------------------------------------------
    // Step 2 — Enter cam → skill name → aim QTE → release
    // (Director handles cam exit after release)
    // ----------------------------------------------------------
    console.log("[StarfallBeam] Entering cam");
    bridge.enterCam(_casterId, _targetId, { slot: "ranged" }).then(function() {
        if (_released) return;
        console.log("[StarfallBeam] Cam entered — showing skill name");

        bridge.showSkillName("STARFALL BEAM");

        setTimeout(function() {
            if (_released) return;

            // Step 3 — Ignition: play frames 0→1→2→3
            console.log("[StarfallBeam] Ignition");
            bridge.setSpriteFrame(_casterId, 0);
            setTimeout(function() {
                if (_released) return;
                bridge.setSpriteFrame(_casterId, 1);
                setTimeout(function() {
                    if (_released) return;
                    bridge.setSpriteFrame(_casterId, 2);
                    setTimeout(function() {
                        if (_released) return;
                        bridge.setSpriteFrame(_casterId, 3);

                        // Step 4 — Loop frames 2↔3
                        var loopFrame = 3;
                        _frameTimer = setInterval(function() {
                            if (_released) return;
                            loopFrame = loopFrame === 2 ? 3 : 2;
                            bridge.setSpriteFrame(_casterId, loopFrame);
                        }, STARFALL.frameLoopMs);

                        // Step 5 — Run 3 beam loops
                        _runBeamLoops(bridge);

                    }, STARFALL.ignitionMs);
                }, STARFALL.ignitionMs);
            }, STARFALL.ignitionMs);
        }, STARFALL.skillNameHoldMs);
    });
}

// ============================================================
// ABORT — Director calls this to forcefully end the skill.
//
// Reasons: "casterKO", "waveEnd", "flee"
//
// Clean up ONLY visual state the skill explicitly set.
// Director handles game state, cam exit, flag clearing.
// ============================================================

function abort(reason) {
    console.log("[StarfallBeam] ABORT — reason:", reason);
    _released = true;  // block any pending async from calling release

    // Stop damage tick loop if running
    if (_damageTimer) {
        clearInterval(_damageTimer);
        _damageTimer = null;
    }

    // Stop beam VFX if active
    if (_beamActive && _bridge) {
        _bridge.stopVFX("beam_connect");
        _beamActive = false;
    }

    // Stop frame loop
    if (_frameTimer) { clearInterval(_frameTimer); _frameTimer = null; }
    // Clear charge shake choreo + sprite override
    if (_bridge && _casterId) {
        _bridge.clearChoreo(_casterId);
        _bridge.setSpriteKey(_casterId, null); // clear override → back to default
    }

    // Null out internal refs
    _bridge    = null;
    _casterId  = null;
    _targetId  = null;
}

// ============================================================
// ON TICK — Director forwards game events during takeover.
//
// Events: "casterDamaged", "targetKO", "turnOrderAdvanced"
// Skill decides how to react.
// ============================================================

function onTick(event, payload) {
    console.log("[StarfallBeam] onTick:", event, payload);

    if (event === "targetKO") {
        // Target died from our damage. Try to retarget.
        if (_bridge) {
            var newTarget = _bridge.getNextTarget("enemy");
            if (newTarget) {
                console.log("[StarfallBeam] Target KO — retarget:", _targetId, "→", newTarget);
                _targetId = newTarget;
                // In full build: redirect beam VFX to new target
            } else {
                // All enemies dead — release. Director will detect
                // the wipe and handle wave/victory flow.
                console.log("[StarfallBeam] Target KO — no enemies left, releasing");
                _doRelease();
            }
        }
    }

    // "casterDamaged" — could interrupt charge in future.
    // V1: no interruption, skill continues.
}

// ============================================================
// INTERNAL — 3-loop beam sequence
//
// Each loop: 1 aim ring (sets damage multiplier) + 5 damage
// rings (hit = full dmg, miss = reduced dmg).
// Loop 1 aim can't fail. Loop 2+ aim miss = cancel skill.
// ============================================================

function _readTier(results) {
    return (results && results.length > 0) ? results[0].tier : "miss";
}

function _tierToMult(tier) {
    if (tier === "perfect") return 1.5;
    if (tier === "good")    return 1.0;
    return 0.25;
}

function _runBeamLoops(bridge) {
    var loopIndex = 0;

    function runLoop() {
        if (_released) return;
        if (loopIndex >= STARFALL.loopCount) {
            console.log("[StarfallBeam] All loops complete");
            if (_frameTimer) { clearInterval(_frameTimer); _frameTimer = null; }
            _windDown();
            return;
        }

        var currentLoop = loopIndex;
        loopIndex++;
        console.log("[StarfallBeam] Loop", currentLoop + 1, "— aim ring");

        // --- Aim ring ---
        bridge.runQTE(STARFALL.aimQte).then(function(results) {
            if (_released) return;

            var tier = _readTier(results);
            _aimMult = _tierToMult(tier);
            console.log("[StarfallBeam] Loop", currentLoop + 1, "aim:", tier, "mult:", _aimMult);

            // Loop 2+ : miss aim = cancel
            if (currentLoop > 0 && tier === "miss") {
                console.log("[StarfallBeam] Aim miss on loop", currentLoop + 1, "— cancelling");
                if (_frameTimer) { clearInterval(_frameTimer); _frameTimer = null; }
                _windDown();
                return;
            }

            // --- 5 damage rings ---
            var dmgIndex = 0;

            function runDmgRing() {
                if (_released) return;
                if (dmgIndex >= STARFALL.dmgRingsPerLoop) {
                    console.log("[StarfallBeam] Loop", currentLoop + 1, "damage rings complete");
                    // Pause between loops (skip after last)
                    if (loopIndex < STARFALL.loopCount) {
                        setTimeout(runLoop, STARFALL.loopPauseMs);
                    } else {
                        runLoop();
                    }
                    return;
                }

                bridge.runQTE(STARFALL.dmgQte).then(function(dmgResults) {
                    if (_released) return;
                    dmgIndex++;

                    var dmgTier = _readTier(dmgResults);
                    var dmg;
                    if (dmgTier === "miss") {
                        dmg = Math.max(1, Math.round(STARFALL.beamBaseDamage * _aimMult * STARFALL.missDmgMult));
                    } else {
                        dmg = Math.max(1, Math.round(STARFALL.beamBaseDamage * _aimMult));
                    }

                    console.log("[StarfallBeam] Dmg ring", dmgIndex, "→", dmgTier, "dmg:", dmg);

                    if (_targetId && bridge.isAlive(_targetId)) {
                        bridge.dealDamage(_targetId, dmg);
                    }

                    runDmgRing();
                });
            }

            runDmgRing();
        });
    }

    runLoop();
}

// ============================================================
// INTERNAL — Beam wind-down (stop VFX, pause, then release)
// ============================================================

function _windDown() {
    console.log("[StarfallBeam] Wind-down");
    // Stop damage ticks
    if (_damageTimer) { clearInterval(_damageTimer); _damageTimer = null; }
    // Stop frame loop
    if (_frameTimer) { clearInterval(_frameTimer); _frameTimer = null; }
    // Stop beam VFX
    if (_beamActive && _bridge) { _bridge.stopVFX("beam_connect"); _beamActive = false; }
    // Clear charge shake
    if (_bridge && _casterId) { _bridge.clearChoreo(_casterId); }

    // Reverse sprite: current → 1 → 0 → back to idle
    if (_bridge && _casterId) {
        _bridge.setSpriteFrame(_casterId, 1);
        setTimeout(function() {
            if (_released || !_bridge) return;
            _bridge.setSpriteFrame(_casterId, 0);
            setTimeout(function() {
                if (_released || !_bridge) return;
                _bridge.setSpriteKey(_casterId, null); // clear override → back to idle
                setTimeout(function() {
                    if (_released) return;
                    _doRelease();
                }, STARFALL.releaseHoldMs);
            }, STARFALL.windFrameMs);
        }, STARFALL.windFrameMs);
    } else {
        // Fallback — no bridge, just release
        setTimeout(function() {
            if (_released) return;
            _doRelease();
        }, STARFALL.releaseHoldMs);
    }
}

// ============================================================
// INTERNAL — safe release wrapper (prevents double-call)
// ============================================================

function _doRelease() {
    if (_released) return;
    _released = true;

    // Clean up any visual state the skill set
    if (_damageTimer) {
        clearInterval(_damageTimer);
        _damageTimer = null;
    }
    if (_frameTimer) {
        clearInterval(_frameTimer);
        _frameTimer = null;
    }
    if (_beamActive && _bridge) {
        _bridge.stopVFX("beam_connect");
        _beamActive = false;
    }
    if (_bridge && _casterId) {
        _bridge.clearChoreo(_casterId);
        _bridge.setSpriteKey(_casterId, null); // clear override → back to default
    }

    // Hand control back to director
    if (_bridge) {
        _bridge.release();
    }

    _bridge   = null;
    _casterId = null;
    _targetId = null;
}

// ============================================================
// SKILL DEFINITION — config + controller in one object.
//
// Registered in battleSkills.js PLAYER_SKILLS table.
// Director detects skillType "special" + activate() method
// and routes to the takeover protocol.
// ============================================================

var StarfallBeam = {
    // --- Config (read by director, UI, skill menu) ---
    id:              "starfall_beam",
    name:            "Starfall Beam",
    apCost:          40,
    skillType:       "special",
    delaySlots:      1,
    counterAllowed:  false,
    chargeSpriteKey: "fairyCombatBeam",
    chargeFrame:     0,

    // --- Controller (called by director during takeover) ---
    activate:        activate,
    abort:           abort,
    onTick:          onTick,
};

export default StarfallBeam;