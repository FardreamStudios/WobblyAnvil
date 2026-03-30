// ============================================================
// ActionMenu.js — 2x2 formation action grid
//
// Extracted from BattleView.js. Pure component.
// Props: hidden (bool), onAction (callback)
// ============================================================

import BattleConstants from "./battleConstants.js";

var ACTIONS = BattleConstants.ACTIONS;

function ActionMenu(props) {
    var hidden = props.hidden;
    var cls = "battle-actions" + (hidden ? " battle-actions--hidden" : "");

    return (
        <div className={cls}>
            {ACTIONS.map(function(a) {
                return (
                    <button
                        key={a.id}
                        className="battle-action-btn"
                        style={{ color: a.color, borderColor: a.color + "44", background: a.bg }}
                        onClick={function() { if (props.onAction) props.onAction(a.id); }}
                    >
                        {a.label}
                    </button>
                );
            })}
        </div>
    );
}

export default ActionMenu;