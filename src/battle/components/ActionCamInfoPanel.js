// ============================================================
// ActionCamInfoPanel.js — attacker vs target HUD in action cam
//
// Extracted from BattleView.js. Pure component.
// Props: visible, isLeftHanded, attacker, target, apState
// ============================================================

import BattleConstants from "../config/battleConstants.js";

var ENGAGEMENT = BattleConstants.ENGAGEMENT;

function ActionCamInfoPanel(props) {
    var visible = props.visible;
    var isLeft = props.isLeftHanded;
    var baseCls = "action-cam-info" + (visible ? " action-cam-info--visible" : "");
    var apState = props.apState || {};

    var attacker = props.attacker;
    var target = props.target;
    if (!attacker || !target) return null;

    var atkHp = attacker.maxHP > 0 ? Math.round(attacker.currentHP / attacker.maxHP * 100) : 0;
    var tgtHp = target.maxHP > 0 ? Math.round(target.currentHP / target.maxHP * 100) : 0;

    var atkIsParty = attacker._isParty;

    var partyData  = atkIsParty ? attacker : target;
    var enemyData  = atkIsParty ? target : attacker;
    var partyHp    = atkIsParty ? atkHp : tgtHp;
    var enemyHp    = atkIsParty ? tgtHp : atkHp;

    var leftData  = isLeft ? partyData : enemyData;
    var rightData = isLeft ? enemyData : partyData;
    var leftHp    = isLeft ? partyHp : enemyHp;
    var rightHp   = isLeft ? enemyHp : partyHp;
    var leftIsParty  = isLeft ? true : false;
    var rightIsParty = isLeft ? false : true;

    // Build AP bar for a combatant
    function renderAPBar(cId, isParty) {
        var entry = apState[cId] || { current: 0, max: ENGAGEMENT.AP_MAX };
        var pct = entry.max > 0 ? Math.round(entry.current / entry.max * 100) : 0;
        var fillCls = "action-cam-info__ap-fill" + (isParty ? " action-cam-info__ap-fill--party" : " action-cam-info__ap-fill--enemy");

        return (
            <div className="action-cam-info__ap-bg">
                <div className={fillCls} style={{ width: pct + "%" }} />
                <span className="action-cam-info__ap-text">{entry.current}</span>
            </div>
        );
    }

    return (
        <>
            <div className={baseCls + " action-cam-info--left action-cam-info__side--" + (leftIsParty ? "atk" : "tgt")}>
                <span className="action-cam-info__name">{leftData.name}</span>
                <div className="action-cam-info__hp-bg">
                    <div className={"battle-hp-fill " + (leftIsParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy")} style={{ width: leftHp + "%" }} />
                </div>
                <span className="action-cam-info__hp-text">{leftData.currentHP + "/" + leftData.maxHP}</span>
                {renderAPBar(leftData.id, leftIsParty)}
            </div>
            <div className={baseCls + " action-cam-info--right action-cam-info__side--" + (rightIsParty ? "atk" : "tgt")}>
                <span className="action-cam-info__name">{rightData.name}</span>
                <div className="action-cam-info__hp-bg">
                    <div className={"battle-hp-fill " + (rightIsParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy")} style={{ width: rightHp + "%" }} />
                </div>
                <span className="action-cam-info__hp-text">{rightData.currentHP + "/" + rightData.maxHP}</span>
                {renderAPBar(rightData.id, rightIsParty)}
            </div>
        </>
    );
}

export default ActionCamInfoPanel;