// ============================================================
// DevControls.js — Battle dev overlay (engagement system)
//
// Buttons: Start (INTRO only), Advance Turn, Fill AP, Reset, Exit
// Plus phase badge for debugging.
//
// Props:
//   phase            — current BATTLE_PHASES value
//   turnLoopRunning  — bool, whether turn loop is active
//   onStart          — fn, start battle (rolls initiative, first turn)
//   onAdvanceTurn    — fn, manually advance to next turn
//   onFillAP         — fn, fill all combatant AP to max
//   onReset          — fn, full battle reset
//   onExit           — fn, leave battle
//
// Gated by _DEV_CONTROLS flag — returns null when false.
// ============================================================

import BattleConstants from "../config/battleConstants.js";
import "./DevControls.css";

var PHASES = BattleConstants.BATTLE_PHASES;

// ============================================================
// PHASE DISPLAY LABELS
// ============================================================
var PHASE_LABELS = {};
PHASE_LABELS[PHASES.INTRO]              = "INTRO";
PHASE_LABELS[PHASES.INITIATIVE_ROLL]    = "INIT ROLL";
PHASE_LABELS[PHASES.TURN_ACTIVE]        = "TURN ACTIVE";
PHASE_LABELS[PHASES.ACTION_CAM_IN]      = "CAM IN";
PHASE_LABELS[PHASES.CAM_SWING_QTE]      = "QTE";
PHASE_LABELS[PHASES.CAM_SWING_PLAYBACK] = "PLAYBACK";
PHASE_LABELS[PHASES.CAM_RESOLVE]        = "RESOLVE";
PHASE_LABELS[PHASES.CAM_COUNTER_PROMPT] = "COUNTER?";
PHASE_LABELS[PHASES.ACTION_CAM_OUT]     = "CAM OUT";
PHASE_LABELS[PHASES.WAVE_TRANSITION]    = "WAVE";
PHASE_LABELS[PHASES.BATTLE_ENDING]      = "BATTLE END";

// ============================================================
// DEV FLAG — show dev controls overlay
// ============================================================
var _DEV_CONTROLS = true;

function DevControls(props) {
    if (!_DEV_CONTROLS) return null;

    var isIntro = props.phase === PHASES.INTRO;

    return (
        <div className="battle-dev">
            {isIntro && (
                <button className="battle-dev__btn battle-dev__btn--start" onClick={props.onStart}>
                    Start Battle
                </button>
            )}
            <button className="battle-dev__btn" onClick={props.onFillAP}>Fill AP</button>
            <button className="battle-dev__btn" onClick={props.onReset}>Reset</button>
            <button className="battle-dev__btn" onClick={props.onExit}>Exit</button>
            <span className="battle-dev__badge">{PHASE_LABELS[props.phase] || props.phase}</span>
        </div>
    );
}

export default DevControls;