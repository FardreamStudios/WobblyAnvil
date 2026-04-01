// ============================================================
// ActionMenu.js — 2x2 formation action grid
//
// Extracted from BattleView.js. Pure component.
// Props:
//   hidden     (bool)   — hide during action cam
//   onAction   (fn)     — callback(actionId)
//   apState    (object) — full AP state map from battleEngagement
//   activeId   (string) — combatantId of whose turn it is
//   isLeftHanded (bool) — flips menu side
// ============================================================

import BattleConstants from "../config/battleConstants.js";
import BattleEngagement from "../systems/battleEngagement.js";

var ACTIONS = BattleConstants.ACTIONS;
var ENGAGEMENT = BattleConstants.ENGAGEMENT;

// Map action ids to their AP cost. ATK opens skill picker (cost is per-skill).
var ACTION_AP_COSTS = {
    attack:  null,
    defend:  ENGAGEMENT.AP_COST_DEFEND,
    item:    ENGAGEMENT.AP_COST_ITEM,
    flee:    ENGAGEMENT.AP_COST_FLEE,
    wait:    0,
};

function ActionMenu(props) {
    var hidden = props.hidden;
    var apState = props.apState;
    var activeId = props.activeId;
    var currentAP = (apState && activeId) ? BattleEngagement.getAP(apState, activeId) : 0;

    var cls = "battle-actions" + (hidden ? " battle-actions--hidden" : "");

    return (
        <div className={cls}>
            {ACTIONS.map(function(a) {
                var cost = ACTION_AP_COSTS[a.id];
                var cantAfford = cost !== null && cost > currentAP;
                var costLabel = cost === null ? "" : cost === 0 ? "" : cost + "";

                return (
                    <button
                        key={a.id}
                        className={"battle-action-btn" + (cantAfford ? " battle-action-btn--disabled" : "")}
                        style={{ color: a.color, borderColor: a.color + "44", background: a.bg }}
                        disabled={cantAfford}
                        onClick={function() { if (!cantAfford && props.onAction) props.onAction(a.id); }}
                    >
                        <span className="battle-action-btn__label">{a.label}</span>
                        {costLabel ? <span className="battle-action-btn__cost">{costLabel}</span> : null}
                    </button>
                );
            })}
        </div>
    );
}

export default ActionMenu;