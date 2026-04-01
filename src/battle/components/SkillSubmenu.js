// ============================================================
// SkillSubmenu.js — scrollable skill picker for formation attacks
//
// Mirrors ItemSubmenu.js pattern. Pure component.
// Props: skills (array of skill objects from BattleSkills),
//        onSelect(skillId), onClose(), visible, isInCam,
//        availableAP (number — current AP of active combatant)
// ============================================================

function SkillSubmenu(props) {
    var visible = props.visible;
    var skills = props.skills || [];
    var onSelect = props.onSelect;
    var onClose = props.onClose;
    var isInCam = props.isInCam;
    var availableAP = props.availableAP || 0;
    var pendingSkillId = props.pendingSkillId || null;

    if (!visible) return null;

    var baseCls = "battle-skill-submenu" + (isInCam ? " battle-skill-submenu--in-cam" : "");

    return (
        <div className={baseCls}>
            <div className="battle-skill-submenu__header">
                <span className="battle-skill-submenu__title">SKILLS</span>
                <span className="battle-skill-submenu__ap-label">{availableAP + " AP"}</span>
                <button className="battle-skill-submenu__close" onClick={onClose}>{"\u2715"}</button>
            </div>
            <div className="battle-skill-submenu__list">
                {skills.length === 0 && (
                    <div className="battle-skill-submenu__empty">No skills</div>
                )}
                {skills.map(function(skill) {
                    var cost = skill.apCost || 25;
                    var cantAfford = cost > availableAP;
                    var isPending = skill.id === pendingSkillId;
                    var cls = "battle-skill-submenu__row"
                        + (cantAfford ? " battle-skill-submenu__row--disabled" : "")
                        + (isPending ? " battle-skill-submenu__row--pending" : "");
                    return (
                        <button
                            key={skill.id}
                            className={cls}
                            disabled={cantAfford}
                            onClick={function() { if (!cantAfford && onSelect) onSelect(skill.id); }}
                        >
                            <span className="battle-skill-submenu__name">{skill.name}</span>
                            <span className="battle-skill-submenu__cost">{cost + " AP"}</span>
                            {isPending
                                ? <span className="battle-skill-submenu__confirm">TAP TO CONFIRM</span>
                                : <span className="battle-skill-submenu__rings">{skill.rings + " hit"}</span>
                            }
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default SkillSubmenu;