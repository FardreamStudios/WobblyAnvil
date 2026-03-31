// ============================================================
// SkillSubmenu.js — scrollable skill picker for in-cam attacks
//
// Mirrors ItemSubmenu.js pattern. Pure component.
// Props: skills (array of skill objects from BattleSkills),
//        onSelect(skillId), onClose(), visible, isInCam
// ============================================================

function SkillSubmenu(props) {
    var visible = props.visible;
    var skills = props.skills || [];
    var onSelect = props.onSelect;
    var onClose = props.onClose;
    var isInCam = props.isInCam;
    var availablePips = props.availablePips || 0;

    if (!visible) return null;

    var baseCls = "battle-skill-submenu" + (isInCam ? " battle-skill-submenu--in-cam" : "");

    return (
        <div className={baseCls}>
            <div className="battle-skill-submenu__header">
                <span className="battle-skill-submenu__title">SKILLS</span>
                <button className="battle-skill-submenu__close" onClick={onClose}>{"\u2715"}</button>
            </div>
            <div className="battle-skill-submenu__list">
                {skills.length === 0 && (
                    <div className="battle-skill-submenu__empty">No skills</div>
                )}
                {skills.map(function(skill) {
                    var cost = skill.pipCost || 1;
                    var cantAfford = cost > availablePips;
                    var cls = "battle-skill-submenu__row" + (cantAfford ? " battle-skill-submenu__row--disabled" : "");
                    return (
                        <button
                            key={skill.id}
                            className={cls}
                            disabled={cantAfford}
                            onClick={function() { if (!cantAfford && onSelect) onSelect(skill.id); }}
                        >
                            <span className="battle-skill-submenu__name">{skill.name}</span>
                            <span className="battle-skill-submenu__cost">{cost + " pip" + (cost > 1 ? "s" : "")}</span>
                            <span className="battle-skill-submenu__rings">{skill.rings + " hit"}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default SkillSubmenu;