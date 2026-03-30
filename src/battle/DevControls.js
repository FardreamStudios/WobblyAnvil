// ============================================================
// DevControls.js — Battle dev overlay (streamlined)
//
// Four buttons: Fight/Pause ATB, Fill Pips, Reset, Exit
// Plus phase badge for debugging.
//
// Gated by _DEV_CONTROLS flag — returns null when false.
// ============================================================

import BattleConstants from "./battleConstants.js";
import "./DevControls.css";

var PHASES = BattleConstants.BATTLE_PHASES;

// ============================================================
// PHASE DISPLAY LABELS
// ============================================================
var PHASE_LABELS = {};
PHASE_LABELS[PHASES.ATB_RUNNING]     = "ATB RUNNING";
PHASE_LABELS[PHASES.ACTION_SELECT]   = "ACTION SELECT";
PHASE_LABELS[PHASES.ACTION_CAM_IN]   = "ACTION CAM IN";
PHASE_LABELS[PHASES.CAM_TURN_START]  = "CAM TURN";
PHASE_LABELS[PHASES.CAM_WAIT_ACTION] = "CAM WAIT";
PHASE_LABELS[PHASES.CAM_TELEGRAPH]   = "TELEGRAPH";
PHASE_LABELS[PHASES.CAM_SWING]       = "SWING";
PHASE_LABELS[PHASES.CAM_RESOLVE]     = "RESOLVE";
PHASE_LABELS[PHASES.ACTION_CAM_OUT]  = "CAM OUT";
PHASE_LABELS[PHASES.BATTLE_ENDING]   = "BATTLE END";

// ============================================================
// DEV FLAG — show dev controls overlay
// ============================================================
var _DEV_CONTROLS = true;

function DevControls(props) {
        if (!_DEV_CONTROLS) return null;

        return (
            <div className="battle-dev">
                    <button className="battle-dev__btn" onClick={props.onToggleATB}>
                            {props.atbRunning ? "Pause" : "Fight"}
                    </button>
                    <button className="battle-dev__btn" onClick={props.onFillPips}>Fill Pips</button>
                    <button className="battle-dev__btn" onClick={props.onReset}>Reset</button>
                    <button className="battle-dev__btn" onClick={props.onExit}>Exit</button>
                    <span className="battle-dev__badge">{PHASE_LABELS[props.phase] || props.phase}</span>
            </div>
        );
}

export default DevControls;