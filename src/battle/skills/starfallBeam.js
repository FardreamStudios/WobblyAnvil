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
// STATUS: Step 11 — Full beam sequence wired.
//         Cam enter → aim QTE → beam VFX → damage ticks →
//         sustain round 1 → gate QTE → sustain round 2 → wind-down → release.
//         Step 12 (polish) remaining: timing, juice, sound, tuning.
// ============================================================

// ============================================================
// SKILL CONSTANTS (tuning values unique to this skill)
// ============================================================

var STARFALL = {
    // Sequence timing
    chargeHoldMs:       800,    // hold in charge pose before cam (skeleton: before release)
    skillNameHoldMs:    1200,   // how long name banner stays up
    aimQteParams:       {                   // single-ring aim QTE — fast, tight
        type:             "circle_timing",
        rings:            1,
        speeds:           [1.8],
        delays:           [0],
        shrinkDurationMs: 600,
        zoneBonus:        0.20,
        targetRadius:     24,
        ringStartRadius:  70,
        label:            "AIM!",
        beats:            [{ check: "ring", damage: 0, atkAnim: null, tgtReact: null, shake: null, sfx: null }],
    },
    beamTickMs:         120,    // damage tick interval during beam
    beamBaseDamage:     1,      // per-tick base damage (multiplied by aim accuracy)
    windDownMs:         200,    // reverse anim speed

    // Sustain QTE configs
    sustainRound1:  { type: "sustain_tap", count: 5,  intervalMs: 280, failEnds: true },
    sustainRound2:  { type: "sustain_tap", count: 10, intervalMs: 240, failEnds: true },
    gateQteParams:  {                   // circle ring between sustain rounds
        type:             "circle_timing",
        rings:            1,
        speeds:           [2.0],
        delays:           [0],
        shrinkDurationMs: 500,
        zoneBonus:        0.15,
        targetRadius:     22,
        ringStartRadius:  70,
        label:            "HOLD!",
        beats:            [{ check: "ring", damage: 0, atkAnim: null, tgtReact: null, shake: null, sfx: null }],
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
        // Retarget to next alive enemy
        var newTarget = bridge.getNextTarget("enemy");
        if (!newTarget) {
            // No targets — release early (wave-end should abort first,
            // but this is a safety net).
            console.log("[StarfallBeam] No valid targets — releasing");
            _doRelease();
            return;
        }
        console.log("[StarfallBeam] Retarget:", _targetId, "→", newTarget);
        _targetId = newTarget;
    }

    // ----------------------------------------------------------
    // Step 2 — Enter cam + aim QTE
    //
    // Sequence: enter cam (ranged slot) → skill name banner →
    // wait for name display → aim QTE → store accuracy.
    // Beam VFX + sustain QTEs added in steps 9–11.
    // ----------------------------------------------------------

    bridge.enterCam(_casterId, _targetId, { slot: "ranged" }).then(function() {
        if (_released) return;

        // Show skill name banner
        bridge.showSkillName("STARFALL BEAM");
        console.log("[StarfallBeam] Skill name shown, holding", STARFALL.skillNameHoldMs, "ms");

        setTimeout(function() {
            if (_released) return;

            // Run aim QTE — single fast ring
            console.log("[StarfallBeam] Starting aim QTE");
            bridge.runQTE(STARFALL.aimQteParams).then(function(results) {
                if (_released) return;

                // Extract accuracy from QTE result
                // Shape may vary — handle defensively, tune during testing
                var accuracy = 0.5;
                if (results && results.length > 0) {
                    var r = results[0];
                    if (r.accuracy != null) { accuracy = r.accuracy; }
                    else if (r.tier === "perfect") { accuracy = 1.0; }
                    else if (r.tier === "good")    { accuracy = 0.75; }
                    else if (r.tier === "miss")    { accuracy = 0.25; }
                }
                _aimMult = accuracy;
                console.log("[StarfallBeam] Aim QTE complete — accuracy:", _aimMult);

                // --------------------------------------------------
                // Step 3 — Beam ignition
                // --------------------------------------------------
                _beamActive = true;
                bridge.startVFX("beam_connect", { from: _casterId, to: _targetId });
                console.log("[StarfallBeam] Beam ignited — starting damage ticks");

                // Start damage tick loop
                _damageTimer = setInterval(function() {
                    if (_released || !_bridge) {
                        clearInterval(_damageTimer);
                        _damageTimer = null;
                        return;
                    }
                    var dmg = Math.max(1, Math.round(STARFALL.beamBaseDamage * _aimMult));
                    _bridge.dealDamage(_targetId, dmg);
                }, STARFALL.beamTickMs);

                // --------------------------------------------------
                // Step 4 — Sustain QTE round 1
                // --------------------------------------------------
                bridge.runQTE(STARFALL.sustainRound1).then(function(r1) {
                    if (_released) return;
                    if (!_isQteSuccess(r1)) {
                        console.log("[StarfallBeam] Round 1 failed — wind down");
                        _windDown();
                        return;
                    }
                    console.log("[StarfallBeam] Round 1 passed — gate QTE");

                    // --------------------------------------------------
                    // Step 5 — Gate QTE (circle ring between rounds)
                    // --------------------------------------------------
                    bridge.runQTE(STARFALL.gateQteParams).then(function(gateR) {
                        if (_released) return;
                        if (!_isQteSuccess(gateR)) {
                            console.log("[StarfallBeam] Gate failed — wind down");
                            _windDown();
                            return;
                        }
                        console.log("[StarfallBeam] Gate passed — round 2");

                        // --------------------------------------------------
                        // Step 6 — Sustain QTE round 2
                        // --------------------------------------------------
                        bridge.runQTE(STARFALL.sustainRound2).then(function(r2) {
                            if (_released) return;
                            console.log("[StarfallBeam] Round 2 done (success:", _isQteSuccess(r2), ") — wind down");
                            _windDown();
                        });
                    });
                });
            });
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

    // Clear charge shake choreo
    if (_bridge && _casterId) {
        _bridge.clearChoreo(_casterId);
        _bridge.setSpriteKey(_casterId, "fairyCombatIdle");
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
// INTERNAL — QTE result checker (handles both sustain_tap and
// circle_timing result formats)
// ============================================================

function _isQteSuccess(results) {
    if (!results || results.length === 0) return false;
    var r = results[0];
    if (r.succeeded != null) return r.succeeded;
    if (r.tier === "perfect" || r.tier === "good") return true;
    return false;
}

// ============================================================
// INTERNAL — Beam wind-down (stop VFX, pause, then release)
// ============================================================

function _windDown() {
    console.log("[StarfallBeam] Wind-down");
    // Stop damage ticks
    if (_damageTimer) { clearInterval(_damageTimer); _damageTimer = null; }
    // Stop beam VFX
    if (_beamActive && _bridge) { _bridge.stopVFX("beam_connect"); _beamActive = false; }
    // Clear charge shake
    if (_bridge && _casterId) { _bridge.clearChoreo(_casterId); }
    // Pause for visual wind-down, then release
    setTimeout(function() {
        if (_released) return;
        _doRelease();
    }, STARFALL.windDownMs);
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
    if (_beamActive && _bridge) {
        _bridge.stopVFX("beam_connect");
        _beamActive = false;
    }
    if (_bridge && _casterId) {
        _bridge.clearChoreo(_casterId);
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

    // --- Controller (called by director during takeover) ---
    activate:        activate,
    abort:           abort,
    onTick:          onTick,
};

export default StarfallBeam;