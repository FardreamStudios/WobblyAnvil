// ============================================================
// morningAbilityFactory.js — Wobbly Anvil Morning Ability Factory
// Takes a data-table row and returns a valid ability definition
// for AbilityManager.register().
//
// Handles: weighted variant pick, bus emission, toast display,
//          persistent modifiers, and endWhen conditions.
// Does NOT handle: complex VFX sequences, custom state logic,
// or anything that needs bespoke code. Those stay as individual
// ability files (mystery, reactive, etc.).
//
// DATA TABLE ROW SHAPE:
//   {
//     id:            "festival",
//     chance:        0.12,              // activation probability
//     icon:          "🎉",
//     color:         "#fbbf24",         // toast color
//     tags:          ["event", "buff"], // ability tags for query
//     scope:         "day",             // "day" | "permanent" | "manual"
//     requiresMats:  false,             // skip if player has no materials
//     requiresGold:  false,             // skip if player has no gold
//     condition:     null,              // optional fn(state) → bool
//     toastDuration: 4000,             // optional override
//     variants: [
//       {
//         title:   "Town Festival",
//         desc:    "Extra customers today! +3 visits.",
//         weight:  35,
//         effects: [
//           { tag: "ECONOMY_EARN_GOLD", payload: { extraCustomers: 3 } },
//         ],
//       },
//     ],
//
//     // --- PERSISTENT MODIFIER SUPPORT (optional) ---
//     modifiers: [                      // registered on activate, auto-removed on end
//       { attribute: "heatPerfectZone", operation: "multiply", value: 1.5 },
//     ],
//     endWhen: {                        // bus-driven end condition
//       tag: "ECONOMY_WEAPON_SOLD",     // EVENT_TAGS key or raw tag string
//       condition: null,                // optional fn(payload, ctx) → bool
//     },
//     // (onEndToast removed — modifier effects communicated via morning event toast)
//
//     // --- PER-VARIANT MODIFIERS (optional) ---
//     // If a variant has a .modifiers array, it overrides row-level modifiers.
//     // Use for per-severity scaling (e.g. backpain: mild=1.5x, bad=2x, severe=2.5x).
//   }
//
// EFFECTS:
//   Each effect is { tag, payload } where tag is an EVENT_TAGS key.
//   Payload can contain:
//     - Static values: { extraCustomers: 3 }
//     - "$randMat" string: replaced at runtime with a random mat key
//     - "$ownedMat" string: replaced with a random OWNED mat key
//     - "$matName" string: replaced with resolved material name
//     - Function values: fn(state) called at activation time
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

import EVENT_TAGS from "../../config/eventTags.js";
import GameConstants from "../../modules/constants.js";

var MATS = GameConstants.MATS;

// ============================================================
// HELPERS
// ============================================================

function weightedPick(items, weightKey) {
    var total = 0;
    for (var i = 0; i < items.length; i++) total += (items[i][weightKey] || 1);
    var roll = Math.random() * total;
    var cumulative = 0;
    for (var j = 0; j < items.length; j++) {
        cumulative += (items[j][weightKey] || 1);
        if (roll < cumulative) return items[j];
    }
    return items[0];
}

function randMatKey() {
    var keys = Object.keys(MATS);
    return keys[Math.floor(Math.random() * keys.length)];
}

function randomOwnedMat(inv) {
    var owned = Object.keys(MATS).filter(function(k) { return (inv[k] || 0) > 0; });
    if (!owned.length) return null;
    return owned[Math.floor(Math.random() * owned.length)];
}

function hasAnyMats(inv) {
    return Object.keys(MATS).some(function(k) { return (inv[k] || 0) > 0; });
}

// --- Resolve dynamic tokens in a payload object ---
function resolvePayload(raw, matKey, state) {
    var resolved = {};
    var keys = Object.keys(raw);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = raw[k];
        if (typeof v === "function") {
            resolved[k] = v(state);
        } else if (v === "$randMat") {
            resolved[k] = matKey || randMatKey();
        } else if (v === "$ownedMat") {
            resolved[k] = matKey;
        } else if (v === "$matName") {
            resolved[k] = matKey && MATS[matKey] ? MATS[matKey].name : "unknown";
        } else if (k === "qtyPercent" && matKey && state.inv) {
            // Convert percentage to actual qty: negative = loss
            var current = state.inv[matKey] || 0;
            var absLoss = Math.ceil(current * Math.abs(v));
            resolved.qty = v < 0 ? -absLoss : absLoss;
            // Don't emit qtyPercent itself — replace with qty
        } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
            // Recurse one level for nested objects (e.g. matDiscount)
            resolved[k] = resolvePayload(v, matKey, state);
        } else {
            resolved[k] = v;
        }
    }
    return resolved;
}

// --- Resolve tokens in a description string ---
function resolveDesc(desc, matKey, resolvedPayload) {
    if (!desc) return "";
    var result = desc;
    if (matKey && MATS[matKey]) {
        result = result.replace(/\$matName/g, MATS[matKey].name);
    }
    return result;
}

// --- Resolve endWhen tag (EVENT_TAGS key or raw string) ---
function resolveEndWhenTag(tagKey) {
    return EVENT_TAGS[tagKey] || tagKey;
}

// ============================================================
// FACTORY
// ============================================================

function createMorningAbility(row) {
    // Pre-resolve endWhen if present
    var endWhenDef = null;
    if (row.endWhen && row.endWhen.tag) {
        endWhenDef = {
            tag:       resolveEndWhenTag(row.endWhen.tag),
            condition: row.endWhen.condition || null,
        };
    }

    return {
        // --- Identity ---
        id:        row.id,
        tags:      row.tags || ["event"],
        scope:     row.scope || "day",
        stackable: false,

        // --- Morning Roll (used by AbilityManager.rollMorning) ---
        morningPool: true,
        chance:      row.chance || 0.10,

        // --- Activation ---
        trigger:   null,   // morning abilities are rolled, not self-activating

        canActivate: function(payload, manager, state) {
            // Condition guards only — probability is handled by rollMorning weighted pick
            if (row.requiresMats && (!state.inv || !hasAnyMats(state.inv))) return false;
            if (row.requiresGold && (!state.gold || state.gold <= 0)) return false;
            if (row.condition && !row.condition(state)) return false;
            return true;
        },

        // --- Behavior ---
        onActivate: function(ctx) {
            var variant = row.variants.length === 1
                ? row.variants[0]
                : weightedPick(row.variants, "weight");

            // Resolve material key if any effect needs it
            var matKey = null;
            var needsRandMat = false;
            var needsOwnedMat = false;
            for (var e = 0; e < (variant.effects || []).length; e++) {
                var p = variant.effects[e].payload || {};
                var vals = Object.keys(p).map(function(k) { return p[k]; });
                for (var v = 0; v < vals.length; v++) {
                    if (vals[v] === "$randMat" || vals[v] === "$matName") needsRandMat = true;
                    if (vals[v] === "$ownedMat") needsOwnedMat = true;
                    // Check nested objects too
                    if (typeof vals[v] === "object" && vals[v] !== null) {
                        var subVals = Object.keys(vals[v]).map(function(sk) { return vals[v][sk]; });
                        for (var sv = 0; sv < subVals.length; sv++) {
                            if (subVals[sv] === "$randMat" || subVals[sv] === "$matName") needsRandMat = true;
                            if (subVals[sv] === "$ownedMat") needsOwnedMat = true;
                        }
                    }
                }
            }
            // Also check desc for tokens
            if (variant.desc && variant.desc.indexOf("$matName") !== -1) {
                needsRandMat = true;
                needsOwnedMat = needsOwnedMat || row.requiresMats;
            }

            if (needsOwnedMat) {
                matKey = randomOwnedMat(ctx.state.inv || {});
                if (!matKey) return; // bail — no owned mats
            } else if (needsRandMat) {
                matKey = randMatKey();
            }

            // Emit all effects
            var effects = variant.effects || [];
            for (var i = 0; i < effects.length; i++) {
                var tagKey = effects[i].tag;
                var tag = EVENT_TAGS[tagKey] || tagKey;
                var payload = effects[i].payload
                    ? resolvePayload(effects[i].payload, matKey, ctx.state)
                    : {};
                ctx.bus.emit(tag, payload);
            }

            // Register modifiers (persistent abilities)
            // Variant-level modifiers override row-level (e.g. per-severity backpain)
            var modifiers = variant.modifiers || row.modifiers || [];
            for (var m = 0; m < modifiers.length; m++) {
                ctx.manager.addModifier({
                    source:    ctx.instanceId,
                    attribute: modifiers[m].attribute,
                    operation: modifiers[m].operation,
                    value:     modifiers[m].value,
                });
            }

            // Toast (buffered — drained by buildDayQueue for sequencing)
            var desc = resolveDesc(variant.desc, matKey);
            ctx.manager.queueToast({
                msg: variant.title.toUpperCase() + "\n" + desc,
                icon: row.icon || "",
                color: row.color || "#fbbf24",
                duration: row.toastDuration || 4000,
            });

            // Event bar display — derive category tag from row.tags
            var displayTag = "EVENT";
            var rowTags = row.tags || [];
            for (var t = 0; t < rowTags.length; t++) {
                if (rowTags[t] !== "event") { displayTag = rowTags[t].toUpperCase(); break; }
            }
            ctx.bus.emit(EVENT_TAGS.DAY_MORNING_EVENT_DISPLAY, {
                id: row.id,
                icon: row.icon || "",
                title: variant.title,
                desc: desc,
                tag: displayTag,
                color: row.color || "#fbbf24",
            });
        },

        // --- End ---
        endWhen:  endWhenDef,
        duration: row.duration || null,

        onEnd: null,
    };
}

export default createMorningAbility;