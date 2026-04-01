// ============================================================
// ItemSubmenu.js — scrollable item list with qty, tap to use
//
// Extracted from BattleView.js. Pure component.
// Props: items (array), onUse(itemId), onClose(), visible, isInCam
// ============================================================

function ItemSubmenu(props) {
    var visible = props.visible;
    var items = props.items || [];
    var onUse = props.onUse;
    var onClose = props.onClose;
    var isInCam = props.isInCam;

    if (!visible) return null;

    var hasItems = false;
    for (var i = 0; i < items.length; i++) {
        if (items[i].qty > 0) { hasItems = true; break; }
    }

    var baseCls = "battle-item-submenu" + (isInCam ? " battle-item-submenu--in-cam" : "");

    return (
        <div className={baseCls}>
            <div className="battle-item-submenu__header">
                <span className="battle-item-submenu__title">ITEMS</span>
                <button className="battle-item-submenu__close" onClick={onClose}>{"\u2715"}</button>
            </div>
            <div className="battle-item-submenu__list">
                {!hasItems && (
                    <div className="battle-item-submenu__empty">No items</div>
                )}
                {items.map(function(item) {
                    var empty = item.qty <= 0;
                    var cls = "battle-item-submenu__row" + (empty ? " battle-item-submenu__row--empty" : "");
                    return (
                        <button
                            key={item.id}
                            className={cls}
                            disabled={empty}
                            onClick={function() { if (!empty && onUse) onUse(item.id); }}
                        >
                            <span className="battle-item-submenu__icon">{item.icon || "\uD83D\uDCE6"}</span>
                            <span className="battle-item-submenu__name">{item.name}</span>
                            <span className="battle-item-submenu__desc">{item.description}</span>
                            <span className="battle-item-submenu__qty">{"x" + item.qty}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default ItemSubmenu;