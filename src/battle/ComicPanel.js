// ============================================================
// ComicPanel.js — fairy portrait + speech bubble
//
// Extracted from BattleView.js. Pure component.
// Props: visible, isLeftHanded, sprite, name, line
// ============================================================

function ComicPanel(props) {
    var visible = props.visible;
    var isLeft = props.isLeftHanded;
    var cls = "battle-comic" + (visible ? " battle-comic--visible" : "");

    var posStyle = isLeft
        ? { left: 0, right: "auto" }
        : { right: 0, left: "auto" };

    return (
        <div className={cls} style={posStyle}>
            <div className="battle-comic__portrait">{props.sprite || "\uD83E\uDDDA"}</div>
            <div className="battle-comic__name">{props.name || "FAIRY"}</div>
            <div className="battle-comic__bubble">{props.line || "..."}</div>
        </div>
    );
}

export default ComicPanel;