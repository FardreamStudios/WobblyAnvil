// ============================================================
// battleState.js — Mutable Battle Runtime State
//
// Factory function: createBattleState(partyArray, enemyArray)
// Returns a plain mutable object with methods to read/write
// combatant state during a battle. BattleView holds this in
// a ref and calls methods directly.
//
// Owns: HP, items, KO status, buffs, used-item tracking.
// Does NOT own: ATB (BattleATB), phase (BattleView state),
//   animation/choreography (BattleView).
//
// No React imports. No singletons. No bus. Portable.
// ============================================================

// --- Item Effect Applicators ---
// Each key matches an effect.type from BATTLE_ITEMS.
// Returns a description string for logging/observer.
var EFFECT_HANDLERS = {
    heal: function(state, userId, targetId, effect) {
        var c = state.combatants[targetId];
        if (!c || c.ko) return null;
        var before = c.currentHP;
        c.currentHP = Math.min(c.maxHP, c.currentHP + effect.value);
        var actual = c.currentHP - before;
        return c.name + " healed " + actual + " HP";
    },
    buff: function(state, userId, targetId, effect) {
        var c = state.combatants[targetId];
        if (!c || c.ko) return null;
        // Buffs stored as array on combatant — { stat, value, turnsLeft }
        c.buffs.push({ stat: effect.stat, value: effect.value, turnsLeft: effect.turns || 2 });
        return c.name + " gained +" + effect.value + " " + effect.stat;
    },
    debuff_enemy: function(state, userId, targetId, effect) {
        var c = state.combatants[targetId];
        if (!c || c.ko) return null;
        c.buffs.push({ stat: effect.stat, value: -effect.value, turnsLeft: effect.turns || 2 });
        return c.name + " got -" + effect.value + " " + effect.stat;
    },
    damage: function(state, userId, targetId, effect) {
        var c = state.combatants[targetId];
        if (!c || c.ko) return null;
        var before = c.currentHP;
        c.currentHP = Math.max(0, c.currentHP - effect.value);
        var actual = before - c.currentHP;
        if (c.currentHP <= 0) c.ko = true;
        return c.name + " took " + actual + " damage";
    },
};

// ============================================================
// Factory
// ============================================================

function createBattleState(partyArray, enemyArray) {

    // --- Internal keyed map of all combatants ---
    var combatants = {};
    var partyIds = [];
    var enemyIds = [];

    partyArray.forEach(function(c) {
        partyIds.push(c.id);
        combatants[c.id] = buildCombatant(c, true);
    });

    enemyArray.forEach(function(c) {
        enemyIds.push(c.id);
        combatants[c.id] = buildCombatant(c, false);
    });

    // --- Tracking arrays for result deltas ---
    var itemsUsed = [];     // { userId, itemId, targetId, effect }
    var damageDealt = 0;
    var damageTaken = 0;
    var enemiesDefeated = 0;
    var overkillDealt = 0;
    var overkillTaken = 0;

    // ============================================================
    // Build a runtime combatant from config data
    // ============================================================
    function buildCombatant(cfg, isParty) {
        // Deep-copy items so mutations don't touch config
        var items = [];
        if (cfg.items && cfg.items.length > 0) {
            cfg.items.forEach(function(item) {
                items.push({
                    id:          item.id,
                    name:        item.name,
                    icon:        item.icon || null,
                    description: item.description || "",
                    effect:      Object.assign({}, item.effect),
                    qty:         item.qty || 1,
                });
            });
        }

        return {
            // Identity (immutable during battle)
            id:            cfg.id,
            name:          cfg.name,
            spriteKey:       cfg.spriteKey || null,
            attackSpriteKey: cfg.attackSpriteKey || null,
            isParty:       isParty,

            // Stats (base — buffs applied on read)
            maxHP:         cfg.maxHP,
            currentHP:     cfg.currentHP != null ? cfg.currentHP : cfg.maxHP,
            attackPower:   cfg.attackPower || 0,
            defensePower:  cfg.defensePower || 0,
            atbSpeed:      cfg.atbSpeed || 1.0,
            skills:        cfg.skills ? cfg.skills.slice() : [],

            // Mutable runtime
            ko:            false,
            items:         items,
            buffs:         [],   // { stat, value, turnsLeft }

            // Special skill flags (see SpecialSkillSystemSpec.md)
            chargingSkill: null,   // null or { skillId, targetId } while channeling
            canDefend:     true,   // false during channeling — all incoming attacks deal full damage
        };
    }

    // ============================================================
    // READ — Snapshot for React rendering
    // ============================================================

    // Returns a plain object copy suitable for React state.
    // Shallow copy of each combatant — enough for render diffing.
    function snapshot() {
        var out = {};
        for (var id in combatants) {
            if (combatants.hasOwnProperty(id)) {
                var c = combatants[id];
                out[id] = Object.assign({}, c, {
                    items: c.items.slice(),
                    buffs: c.buffs.slice(),
                });
            }
        }
        return out;
    }

    // Get a single combatant (direct mutable reference — use carefully)
    function get(id) {
        return combatants[id] || null;
    }

    // Get all party ids (preserves original order)
    function getPartyIds()  { return partyIds.slice(); }
    function getEnemyIds()  { return enemyIds.slice(); }

    // Convenience: is this id on the party side?
    function isPartyId(id) {
        var c = combatants[id];
        return c ? c.isParty : false;
    }

    // Effective stat with buffs applied
    function getEffectiveStat(id, statName) {
        var c = combatants[id];
        if (!c) return 0;
        var base = c[statName] || 0;
        var bonus = 0;
        c.buffs.forEach(function(b) {
            if (b.stat === statName) bonus += b.value;
        });
        return Math.max(0, base + bonus);
    }

    // ============================================================
    // WRITE — Mutators
    // ============================================================

    function applyDamage(targetId, amount, fromParty) {
        var c = combatants[targetId];
        if (!c) return { actual: 0, overkill: 0, killed: false };

        // Already KO'd — all damage is overkill
        if (c.ko) {
            var ok = Math.max(0, amount);
            if (fromParty) { overkillDealt += ok; } else { overkillTaken += ok; }
            return { actual: 0, overkill: ok, killed: false };
        }

        var hpBefore = c.currentHP;
        var actual = Math.min(hpBefore, Math.max(0, amount));
        var overkill = Math.max(0, amount - hpBefore);
        c.currentHP = hpBefore - actual;

        var killed = false;
        if (c.currentHP <= 0) {
            c.currentHP = 0;
            c.ko = true;
            killed = true;
            if (!c.isParty) enemiesDefeated++;
        }

        // Track totals
        if (fromParty) {
            damageDealt += actual;
            overkillDealt += overkill;
        } else {
            damageTaken += actual;
            overkillTaken += overkill;
        }
        return { actual: actual, overkill: overkill, killed: killed };
    }

    function applyHeal(targetId, amount) {
        var c = combatants[targetId];
        if (!c || c.ko) return 0;
        var before = c.currentHP;
        c.currentHP = Math.min(c.maxHP, c.currentHP + amount);
        return c.currentHP - before;
    }

    // Use an item from a combatant's inventory.
    // Returns { success, message, effect } or null if failed.
    function useItem(userId, itemId, targetId) {
        var user = combatants[userId];
        if (!user) return null;

        // Find item in user's inventory
        var itemEntry = null;
        for (var i = 0; i < user.items.length; i++) {
            if (user.items[i].id === itemId && user.items[i].qty > 0) {
                itemEntry = user.items[i];
                break;
            }
        }
        if (!itemEntry) return null;

        // Resolve target — default to self for heals/buffs, or targeted enemy for debuff/damage
        var effectTarget = targetId || userId;
        var effect = itemEntry.effect;

        // Apply effect
        var handler = EFFECT_HANDLERS[effect.type];
        if (!handler) {
            console.warn("[battleState] Unknown effect type: " + effect.type);
            return null;
        }

        var message = handler({ combatants: combatants }, userId, effectTarget, effect);
        if (message === null) return null;

        // Deduct quantity
        itemEntry.qty -= 1;

        // Track for result deltas
        itemsUsed.push({
            userId:   userId,
            itemId:   itemId,
            targetId: effectTarget,
            effect:   Object.assign({}, effect),
        });

        return {
            success: true,
            message: message,
            effect:  effect,
            targetId: effectTarget,
        };
    }

    // Replace current enemies with a new wave's enemy array.
    // Removes old enemy combatants, registers new ones.
    // Party state and stats tracking are preserved.
    function replaceEnemies(newEnemyArray) {
        // Remove old enemies from combatants map
        for (var i = 0; i < enemyIds.length; i++) {
            delete combatants[enemyIds[i]];
        }
        enemyIds = [];

        // Register new enemies
        newEnemyArray.forEach(function(c) {
            enemyIds.push(c.id);
            combatants[c.id] = buildCombatant(c, false);
        });
    }

    // Check if all party or all enemies are KO'd
    function isPartyWiped() {
        for (var i = 0; i < partyIds.length; i++) {
            if (!combatants[partyIds[i]].ko) return false;
        }
        return true;
    }

    function isEnemyWiped() {
        for (var i = 0; i < enemyIds.length; i++) {
            if (!combatants[enemyIds[i]].ko) return false;
        }
        return true;
    }

    // Tick buff durations (call at end of a combatant's formation turn)
    function tickBuffs(combatantId) {
        var c = combatants[combatantId];
        if (!c) return;
        c.buffs = c.buffs.filter(function(b) {
            b.turnsLeft -= 1;
            return b.turnsLeft > 0;
        });
    }

    // Clear all defend-applied buffs (stat === "defensePower" with sentinel turns).
    // Called when a combatant's ATB fills — defend lasts "until your next turn".
    function clearDefendBuffs(combatantId) {
        var c = combatants[combatantId];
        if (!c) return;
        c.buffs = c.buffs.filter(function(b) {
            return b.stat !== "defensePower";
        });
    }

    // ============================================================
    // SPECIAL SKILL FLAGS
    // ============================================================

    // Begin channeling — sets chargingSkill and disables defense
    function beginCharging(combatantId, skillId, targetId) {
        var c = combatants[combatantId];
        if (!c) return;
        c.chargingSkill = { skillId: skillId, targetId: targetId };
        c.canDefend = false;
    }

    // Clear all special skill state — called by director on RESUME or ABORT
    function clearCharging(combatantId) {
        var c = combatants[combatantId];
        if (!c) return;
        c.chargingSkill = null;
        c.canDefend = true;
    }

    // Check if a combatant is currently channeling
    function isCharging(combatantId) {
        var c = combatants[combatantId];
        return c ? c.chargingSkill !== null : false;
    }

    // ============================================================
    // RESULT — Build BattleResult deltas
    // ============================================================

    function buildResult(outcome) {
        var partyDeltas = {};
        partyIds.forEach(function(id) {
            var c = combatants[id];
            partyDeltas[id] = {
                hpLost:    c.maxHP - c.currentHP,  // delta from starting max (config had currentHP)
                ko:        c.ko,
                itemsUsed: itemsUsed.filter(function(u) { return u.userId === id; }),
            };
        });

        return {
            outcome:         outcome,  // "victory" | "fled" | "ko"
            loot:            [],       // populated by loot system later
            partyDeltas:     partyDeltas,
            stats: {
                damageDealt:     damageDealt,
                damageTaken:     damageTaken,
                overkillDealt:   overkillDealt,
                overkillTaken:   overkillTaken,
                enemiesDefeated: enemiesDefeated,
                itemsUsed:       itemsUsed.slice(),
            },
        };
    }

    // ============================================================
    // Public API
    // ============================================================
    return {
        // Read
        snapshot:        snapshot,
        get:             get,
        getPartyIds:     getPartyIds,
        getEnemyIds:     getEnemyIds,
        isPartyId:       isPartyId,
        getEffectiveStat: getEffectiveStat,

        // Write
        applyDamage:     applyDamage,
        applyHeal:       applyHeal,
        useItem:         useItem,
        tickBuffs:       tickBuffs,
        clearDefendBuffs: clearDefendBuffs,
        replaceEnemies:  replaceEnemies,

        // Special skill flags
        beginCharging:   beginCharging,
        clearCharging:   clearCharging,
        isCharging:      isCharging,

        // Checks
        isPartyWiped:    isPartyWiped,
        isEnemyWiped:    isEnemyWiped,

        // Result
        buildResult:     buildResult,
    };
}

// ============================================================
// Export
// ============================================================
var BattleState = {
    createBattleState: createBattleState,
};

export default BattleState;