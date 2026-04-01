// ============================================================
// ATBGaugeStrip.js — ATB pip gauges for all combatants
//
// Extracted from BattleView.js. Pure component.
// Props: combatants (array with _isParty, _pips), hidden (bool)
// ============================================================

import BattleConstants from "../config/battleConstants.js";

var ATB = BattleConstants.ATB;

function ATBGaugeStrip(props) {
    var hidden = props.hidden;
    var cls = "battle-atb" + (hidden ? " battle-atb--hidden" : "");
    var maxPips = ATB.pipsPerCombatant;

    return (
        <div className={cls}>
            {props.combatants.map(function(c) {
                var isParty = c._isParty;
                var pips = c._pips || { filledPips: 0, currentFill: 0 };
                var isReady = pips.filledPips >= maxPips;
                var barCls = "battle-atb__bar-bg" + (isReady ? " battle-atb__bar-bg--ready" : "");
                var fillColorCls = isParty ? "battle-atb__pip--party" : "battle-atb__pip--enemy";

                var segments = [];
                for (var i = 0; i < maxPips; i++) {
                    var segCls = "battle-atb__pip";
                    var fillPct = 0;

                    if (i < pips.filledPips) {
                        segCls += " battle-atb__pip--full";
                        fillPct = 100;
                    } else if (i === pips.filledPips) {
                        fillPct = Math.round(pips.currentFill * 100);
                    }

                    segments.push(
                        <div className={segCls + " " + fillColorCls} key={i}>
                            <div
                                className="battle-atb__pip-fill"
                                style={{ width: fillPct + "%" }}
                            />
                        </div>
                    );
                }

                return (
                    <div className="battle-atb__row" key={c.id}>
                        <span className="battle-atb__label">{c.name}</span>
                        <div className={barCls}>
                            {segments}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ATBGaugeStrip;