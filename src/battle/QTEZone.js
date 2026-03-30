// ============================================================
// QTEZone.js — overlay placeholder for QTE ring display
//
// Extracted from BattleView.js. Pure component.
// Props: visible, isDefense, isLeftHanded
// ============================================================

function QTEZone(props) {
    var visible = props.visible;
    var isDefense = props.isDefense;
    var isLeft = props.isLeftHanded;

    var cls = "battle-qte" + (visible ? " battle-qte--visible" : "");
    var ringCls = "battle-qte__ring" + (isDefense ? " battle-qte__ring--defense" : "");

    var posStyle = isLeft
        ? { left: "var(--battle-actions-w)", right: "var(--battle-open-w)" }
        : { left: "var(--battle-open-w)", right: "var(--battle-actions-w)" };

    return (
        <div className={cls} style={posStyle}>
            <div className={ringCls}>TAP</div>
            <span className="battle-qte__label">{isDefense ? "defense qte" : "attack qte"}</span>
        </div>
    );
}

export default QTEZone;