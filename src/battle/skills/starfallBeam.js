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
// STATUS: Skeleton — proves declare → charge → activate → release.
//         Full beam sequence (cam, QTE, VFX) added in steps 7–11.
// ============================================================

// ============================================================
// SKILL CONSTANTS (tuning values unique to this skill)
// ============================================================

var STARFALL = {
    // Sequence timing
    chargeHoldMs:       800,    // hold in charge pose before cam (skeleton: before release)
    skillNameHoldMs:    1200,   // how long name banner stays up
    aimQteParams:       null,   // filled in step 8 — circle QTE config
    beamTickMs:         120,    // damage tick interval during beam
    beamBaseDamage:     1,      // per-tick base damage (multiplied by aim accuracy)
    windDownMs:         200,    // reverse anim speed

    // Sustain QTE configs (filled in step 10)
    sustainRound1:      { count: 5,  intervalMs: 280, failEnds: true },
    sustainRound2:      { count: 10, intervalMs: 240, failEnds: true },
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
    // Step 2 — Charge hold (skeleton: brief delay then release)
    //
    // In the full build, this is where we:
    //   - Enter cam (step 8: bridge.enterCam)
    //   - Show skill name
    //   - Run aim QTE (step 8: bridge.runQTE)
    //   - Ignite beam (step 9: bridge.startVFX)
    //   - Run sustain QTEs + damage ticks (steps 10–11)
    //   - Wind down
    //
    // For now: hold in charge pose, then release to prove
    // the full lifecycle works end-to-end.
    // ----------------------------------------------------------

    setTimeout(function() {
        if (_released) return;  // abort may have fired during hold
        console.log("[StarfallBeam] Charge hold complete — releasing");
        _doRelease();
    }, STARFALL.chargeHoldMs);
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