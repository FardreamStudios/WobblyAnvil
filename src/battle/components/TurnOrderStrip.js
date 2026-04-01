// ============================================================
// TurnOrderStrip.js — Initiative turn order display
//
// Shows combatant portraits in initiative sequence.
// Highlights the active combatant. Shows AP bar per entry.
// Replaces ATBGaugeStrip.js.
//
// Props:
//   turnOrder     — array of combatant ids in initiative order
//   turnIndex     — current index in turnOrder (-1 = not started)
//   apState       — AP state map from battleEngagement
//   combatantMap  — keyed object { id: { id, name, _isParty, ... } }
//   hidden        — bool, hide during action cam
// ============================================================

import BattleConstants from "../config/battleConstants.js";

var ENGAGEMENT = BattleConstants.ENGAGEMENT;

function TurnOrderStrip(props) {
    var turnOrder = props.turnOrder || [];
    var turnIndex = props.turnIndex;
    var apState = props.apState || {};
    var combatantMap = props.combatantMap || {};
    var hidden = props.hidden;

    var cls = "battle-turn-order" + (hidden ? " battle-turn-order--hidden" : "");

    return (
        <div className={cls}>
            {turnOrder.map(function(id, idx) {
                var c = combatantMap[id];
                if (!c) return null;

                var isActive = idx === turnIndex;
                var isParty = c._isParty;
                var ap = apState[id] || { current: 0, max: ENGAGEMENT.AP_MAX };
                var apPct = ap.max > 0 ? Math.round(ap.current / ap.max * 100) : 0;
                var isKO = c.currentHP != null && c.currentHP <= 0;

                var entryCls = "battle-turn-order__entry"
                    + (isActive ? " battle-turn-order__entry--active" : "")
                    + (isParty ? " battle-turn-order__entry--party" : " battle-turn-order__entry--enemy")
                    + (isKO ? " battle-turn-order__entry--ko" : "");

                // First letter of name as portrait placeholder
                var initial = c.name ? c.name.charAt(0).toUpperCase() : "?";

                return (
                    <div className={entryCls} key={id + "-" + idx}>
                        <div className="battle-turn-order__portrait">
                            <span className="battle-turn-order__initial">{initial}</span>
                        </div>
                        <div className="battle-turn-order__ap-bg">
                            <div
                                className={"battle-turn-order__ap-fill" + (isParty ? " battle-turn-order__ap-fill--party" : " battle-turn-order__ap-fill--enemy")}
                                style={{ width: apPct + "%" }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default TurnOrderStrip;