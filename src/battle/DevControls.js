// ============================================================
// DevControls.js — Battle dev overlay (phase stepping, target
//   selection, choreography sequences, sprite overrides)
//
// Extracted from BattleView.js. Pure component.
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
// DEV FLAG — show phase controls overlay
// ============================================================
var _DEV_CONTROLS = true;

function DevControls(props) {
    if (!_DEV_CONTROLS) return null;

    var isCamIn = props.phase !== PHASES.ATB_RUNNING && props.phase !== PHASES.ACTION_SELECT && props.phase !== PHASES.ACTION_CAM_OUT;

    return (
        <div className="battle-dev">
            <button
                className={"battle-dev__btn" + (isCamIn ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSetPhase(isCamIn ? PHASES.ATB_RUNNING : PHASES.ACTION_CAM_IN); }}
            >{isCamIn ? "Cam Out" : "Cam In"}</button>
            <div className="battle-dev__sep" />

            {props.enemies.map(function(e) {
                var active = e.id === props.targetId;
                var cls = "battle-dev__btn" + (active ? " battle-dev__btn--active" : "");
                return (
                    <button key={e.id} className={cls} onClick={function() { props.onSetTarget(e.id); }}>
                        {"vs " + e.name}
                    </button>
                );
            })}
            <div className="battle-dev__sep" />

            <button className="battle-dev__btn" onClick={function() { props.onAtkSeq(props.attackerId, props.targetId); }}>Atk→Tgt</button>
            <button className="battle-dev__btn" onClick={function() { props.onAtkSeq(props.targetId, props.attackerId); }}>Tgt→Atk</button>
            <button className="battle-dev__btn" onClick={function() { props.onKO(props.targetId); }}>KO Tgt</button>
            <button className="battle-dev__btn" onClick={function() { props.onExchange(); }}>Exchange</button>
            <div className="battle-dev__sep" />

            <button
                className={"battle-dev__btn" + (!props.spriteOverride ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSpriteOverride(null); }}
            >Idle</button>
            <button
                className={"battle-dev__btn" + (props.spriteOverride === "fairyCombatKnockdown" ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onSpriteOverride("fairyCombatKnockdown"); }}
            >Knockdown</button>
            <div className="battle-dev__sep" />

            <button
                className={"battle-dev__btn" + (props.comicOn ? " battle-dev__btn--active" : "")}
                onClick={function() { props.onToggleComic(); }}
            >Comic</button>
            <div className="battle-dev__sep" />

            <button className="battle-dev__btn" onClick={props.onToggleATB}>
                {props.atbRunning ? "Pause ATB" : "Run ATB"}
            </button>
            <button className="battle-dev__btn" onClick={props.onFillPips}>Fill Pips</button>
            <button className="battle-dev__btn" onClick={props.onExit}>Exit</button>

            <span className="battle-dev__badge">{PHASE_LABELS[props.phase] || props.phase}</span>
        </div>
    );
}

export default DevControls;