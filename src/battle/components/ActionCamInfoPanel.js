// ============================================================
// ActionCamInfoPanel.js — attacker vs target HUD in action cam
//
// Extracted from BattleView.js. Pure component.
// Props: visible, isLeftHanded, attacker, target, atbValues
// ============================================================

import BattleConstants from "../config/battleConstants.js";

var ATB = BattleConstants.ATB;

function ActionCamInfoPanel(props) {
    var visible = props.visible;
    var isLeft = props.isLeftHanded;
    var baseCls = "action-cam-info" + (visible ? " action-cam-info--visible" : "");
    var atbVals = props.atbValues || {};
    var maxPips = ATB.pipsPerCombatant;

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

    // Build pip dots for a combatant
    function renderPips(cId, isParty) {
        var entry = atbVals[cId] || { filledPips: 0 };
        var dots = [];
        for (var i = 0; i < maxPips; i++) {
            var filled = i < entry.filledPips;
            var cls = "action-cam-info__pip" + (filled ? (isParty ? " action-cam-info__pip--party" : " action-cam-info__pip--enemy") : "");
            dots.push(<span className={cls} key={i} />);
        }
        return <div className="action-cam-info__pips">{dots}</div>;
    }

    return (
        <>
            <div className={baseCls + " action-cam-info--left action-cam-info__side--" + (leftIsParty ? "atk" : "tgt")}>
                <span className="action-cam-info__name">{leftData.name}</span>
                <div className="action-cam-info__hp-bg">
                    <div className={"battle-hp-fill " + (leftIsParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy")} style={{ width: leftHp + "%" }} />
                </div>
                <span className="action-cam-info__hp-text">{leftData.currentHP + "/" + leftData.maxHP}</span>
                {renderPips(leftData.id, leftIsParty)}
            </div>
            <div className={baseCls + " action-cam-info--right action-cam-info__side--" + (rightIsParty ? "atk" : "tgt")}>
                <span className="action-cam-info__name">{rightData.name}</span>
                <div className="action-cam-info__hp-bg">
                    <div className={"battle-hp-fill " + (rightIsParty ? "battle-hp-fill--party" : "battle-hp-fill--enemy")} style={{ width: rightHp + "%" }} />
                </div>
                <span className="action-cam-info__hp-text">{rightData.currentHP + "/" + rightData.maxHP}</span>
                {renderPips(rightData.id, rightIsParty)}
            </div>
        </>
    );
}

export default ActionCamInfoPanel;