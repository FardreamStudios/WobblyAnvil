// ============================================================
// BattleResultsScreen.js — Full overlay showing outcome + stats
//
// Extracted from BattleView.js. Pure component.
// Props: result (BattleResult object), onContinue (callback)
// ============================================================

import { useState, useEffect } from "react";
import BattleConstants from "./battleConstants.js";
import "./BattleResultsScreen.css";

var RESULTS_SCREEN = BattleConstants.RESULTS_SCREEN;

function BattleResultsScreen(props) {
    var result = props.result;
    var onContinue = props.onContinue;
    var [visible, setVisible] = useState(false);

    // Trigger entrance animation after mount
    useEffect(function() {
        var id = setTimeout(function() { setVisible(true); }, 30);
        return function() { clearTimeout(id); };
    }, []);

    if (!result) return null;

    var outcome = result.outcome;
    var stats = result.stats || {};
    var isKO = outcome === "ko";
    var isFled = outcome === "fled";

    var badgeLabel = isKO ? RESULTS_SCREEN.koLabel
        : isFled ? RESULTS_SCREEN.fledLabel
            : RESULTS_SCREEN.victoryLabel;

    var badgeColor = isKO ? RESULTS_SCREEN.koColor
        : isFled ? RESULTS_SCREEN.fledColor
            : RESULTS_SCREEN.victoryColor;

    var statRows = [
        { label: "Damage Dealt",     value: stats.damageDealt || 0 },
        { label: "Damage Taken",     value: stats.damageTaken || 0 },
        { label: "Enemies Defeated", value: stats.enemiesDefeated || 0 },
        { label: "Items Used",       value: stats.itemsUsed ? stats.itemsUsed.length : 0 },
    ];

    if (stats.overkillDealt > 0) {
        statRows.push({ label: "Overkill Dealt", value: stats.overkillDealt });
    }

    return (
        <div className={"battle-results " + (visible ? "battle-results--visible" : "")}>
            <div className="battle-results__card">
                {/* Outcome Badge */}
                <div className="battle-results__badge" style={{ color: badgeColor, borderColor: badgeColor }}>
                    {badgeLabel}
                </div>

                {/* Loot Section */}
                <div className="battle-results__section">
                    <div className="battle-results__section-title">LOOT</div>
                    {isKO ? (
                        <div className="battle-results__loot-lost">{RESULTS_SCREEN.lootLostLabel}</div>
                    ) : result.loot && result.loot.length > 0 ? (
                        result.loot.map(function(item, i) {
                            return <div key={i} className="battle-results__loot-item">{item.name} x{item.qty}</div>;
                        })
                    ) : (
                        <div className="battle-results__loot-empty">No loot this time</div>
                    )}
                </div>

                {/* Stats Section */}
                <div className="battle-results__section">
                    <div className="battle-results__section-title">BATTLE STATS</div>
                    {statRows.map(function(row, i) {
                        return (
                            <div key={i} className="battle-results__stat-row">
                                <span className="battle-results__stat-label">{row.label}</span>
                                <span className="battle-results__stat-value">{row.value}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Continue Button */}
                <button className="battle-results__continue" style={{ borderColor: badgeColor, color: badgeColor }} onClick={onContinue}>
                    {RESULTS_SCREEN.continueLabel}
                </button>
            </div>
        </div>
    );
}

export default BattleResultsScreen;