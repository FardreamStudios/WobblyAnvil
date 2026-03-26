// ============================================================
// morningEventsTable.js — Wobbly Anvil Morning Event Data Table
// Array-of-objects config. Each row becomes an ability via
// morningAbilityFactory.js. No logic here — pure data.
//
// ROW SHAPE: See morningAbilityFactory.js header.
//
// ADDING AN EVENT:
//   1. Add a row to MORNING_EVENTS below
//   2. That's it. Factory + index.js handle the rest.
//
// COMPLEX EVENTS (VFX sequences, custom state logic, reactive
// triggers) should NOT go here — make an individual ability
// file instead.
//
// Replaces: events.js → EVENTS array (simple morning events)
// ============================================================

var MORNING_EVENTS = [

    // --- QUIET ---
    {
        id: "slow_morning",
        chance: 0.12,
        icon: "\uD83D\uDCA4",
        color: "#8a7a64",
        tags: ["event", "quiet"],
        variants: [
            { title: "Slow Morning", desc: "Nothing special today.", weight: 100, effects: [] },
        ],
    },

    // --- FESTIVAL (extra customers) ---
    {
        id: "festival",
        chance: 0.06,
        icon: "\uD83C\uDF89",
        color: "#fbbf24",
        tags: ["event", "buff", "customers"],
        variants: [
            { title: "Small Gathering",   desc: "A few extra visitors! +2 visits.",  weight: 50, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { extraCustomers: 2 } }] },
            { title: "Town Festival",     desc: "Extra customers today! +3 visits.", weight: 35, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { extraCustomers: 3 } }] },
            { title: "Grand Celebration", desc: "The whole town is out! +5 visits.", weight: 15, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { extraCustomers: 5 } }] },
        ],
    },

    // --- MERCHANT (gift materials) ---
    {
        id: "merchant_visit",
        chance: 0.07,
        icon: "\u2692",
        color: "#4ade80",
        tags: ["event", "buff", "materials"],
        variants: [
            { title: "Material Windfall", desc: "A merchant gifts you 2 $matName.",  weight: 50, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { key: "$randMat", qty: 2 } }] },
            { title: "Material Discount", desc: "$matName at half price today!",     weight: 30, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { matDiscount: { key: "$randMat", mult: 0.5 } } }] },
            { title: "Generous Merchant", desc: "A merchant gifts you 5 $matName!",  weight: 20, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { key: "$randMat", qty: 5 } }] },
        ],
    },

    // --- RAT (lose materials) ---
    {
        id: "rat_infestation",
        chance: 0.06,
        icon: "\uD83D\uDC00",
        color: "#fb923c",
        tags: ["event", "hazard", "materials"],
        requiresMats: true,
        variants: [
            { title: "Mouse in the Larder", desc: "A mouse got in. Lost 1 $matName.",       weight: 50, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { key: "$ownedMat", qty: -1 } }] },
            { title: "Rat in the Larder",   desc: "Rats got in. Lost 3 $matName.",          weight: 35, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { key: "$ownedMat", qty: -3 } }] },
            { title: "Rat Infestation",     desc: "They got everywhere. Lost 6 $matName.",  weight: 15, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { key: "$ownedMat", qty: -6 } }] },
        ],
    },

    // --- RIVAL (sell price debuff) ---
    {
        id: "rival",
        chance: 0.06,
        icon: "\uD83D\uDE20",
        color: "#ef4444",
        tags: ["event", "debuff", "market"],
        variants: [
            { title: "Rival Grumbles",  desc: "A rival smith undercuts you. Sell prices -15% today.", weight: 50, effects: [{ tag: "ECONOMY_SPEND_GOLD", payload: { priceDebuff: 0.85 } }] },
            { title: "Rival Undercuts", desc: "Weapon sell prices -25% today.",                       weight: 35, effects: [{ tag: "ECONOMY_SPEND_GOLD", payload: { priceDebuff: 0.75 } }] },
            { title: "Rival Price War", desc: "Market chaos. All sell prices -40% today.",             weight: 15, effects: [{ tag: "ECONOMY_SPEND_GOLD", payload: { priceDebuff: 0.60 } }] },
        ],
    },

    // --- BACKPAIN (forge cost multiplier, per-variant severity) ---
    {
        id: "backpain",
        chance: 0.04,
        icon: "\uD83E\uDD15",
        color: "#fb923c",
        tags: ["event", "hazard", "stamina"],
        scope: "day",
        variants: [
            { title: "Mild Ache",   desc: "Slight discomfort. Forge sessions cost 3hr today.",   weight: 50, effects: [], modifiers: [{ attribute: "forgeCostMult", operation: "multiply", value: 1.5 }] },
            { title: "Bad Back",    desc: "All forge sessions cost 4hr today.",                  weight: 35, effects: [], modifiers: [{ attribute: "forgeCostMult", operation: "multiply", value: 2.0 }] },
            { title: "Thrown Back", desc: "Forge sessions cost 5hr and -1 stamina.",             weight: 15, effects: [{ tag: "DAY_SET_STAMINA", payload: { delta: -1 } }], modifiers: [{ attribute: "forgeCostMult", operation: "multiply", value: 2.5 }] },
        ],
    },

    // --- APPRENTICE (bonus stamina) ---
    {
        id: "apprentice",
        chance: 0.07,
        icon: "\uD83D\uDC66",
        color: "#4ade80",
        tags: ["event", "buff", "stamina"],
        variants: [
            { title: "Helpful Lad",        desc: "+1 stamina today.", weight: 50, effects: [{ tag: "DAY_SET_STAMINA", payload: { delta: 1 } }] },
            { title: "Helpful Apprentice", desc: "+2 stamina today.", weight: 35, effects: [{ tag: "DAY_SET_STAMINA", payload: { delta: 2 } }] },
            { title: "Eager Apprentice",   desc: "+3 stamina today!", weight: 15, effects: [{ tag: "DAY_SET_STAMINA", payload: { delta: 3 } }] },
        ],
    },

    // --- BONANZA (sell price buff) ---
    {
        id: "bonanza",
        chance: 0.06,
        icon: "\uD83D\uDC8E",
        color: "#4ade80",
        tags: ["event", "buff", "market"],
        variants: [
            { title: "Good Market Day",  desc: "Weapons sell for 25% more today.",     weight: 50, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { priceBonus: 1.25 } }] },
            { title: "Merchant Bonanza", desc: "All weapons sell for 50% more today.", weight: 35, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { priceBonus: 1.5 } }] },
            { title: "Buying Frenzy",    desc: "Weapons sell for double today!",        weight: 15, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { priceBonus: 2.0 } }] },
        ],
    },

    // --- COMMISSION (free gold) ---
    {
        id: "commission",
        chance: 0.04,
        icon: "\uD83C\uDFF0",
        color: "#4ade80",
        tags: ["event", "buff", "gold"],
        variants: [
            { title: "Small Commission",  desc: "A guard pre-pays 15g for a weapon.", weight: 50, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { amount: 15 } }] },
            { title: "Guard Commission",  desc: "A guard pre-pays 30g for a weapon.", weight: 35, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { amount: 30 } }] },
            { title: "Knight Commission", desc: "A knight pre-pays 50g for a blade!", weight: 15, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { amount: 50 } }] },
        ],
    },

    // --- TAXMAN (lose gold) ---
    {
        id: "taxman",
        chance: 0.04,
        icon: "\uD83D\uDCB0",
        color: "#ef4444",
        tags: ["event", "hazard", "gold"],
        requiresGold: true,
        variants: [
            { title: "Minor Tax",      desc: "A small levy. Lose 25% of your gold.",  weight: 50, effects: [{ tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.25); } } }] },
            { title: "Tax Collector",  desc: "Royal tax takes 33% of your gold.",     weight: 35, effects: [{ tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.33); } } }] },
            { title: "Heavy Taxation", desc: "The crown demands half your gold.",      weight: 15, effects: [{ tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.50); } } }] },
        ],
    },

    // --- MOM (lose hours + stamina) ---
    {
        id: "mom",
        chance: 0.04,
        icon: "\uD83D\uDC69",
        color: "#fb923c",
        tags: ["event", "hazard", "time"],
        variants: [
            { title: "Mom Pops In",    desc: "Brief visit. -2hr.",                             weight: 50, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 2 } }] },
            { title: "Mom Visits",     desc: "She reorganizes everything. -3hr -1 stam.",     weight: 35, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 3 } }, { tag: "DAY_SET_STAMINA", payload: { delta: -1 } }] },
            { title: "Mom Stays Over", desc: "She rearranges the whole forge. -4hr -2 stam.", weight: 15, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 4 } }, { tag: "DAY_SET_STAMINA", payload: { delta: -2 } }] },
        ],
    },

    // --- FIRE (lose hours + gold) ---
    {
        id: "fire",
        chance: 0.03,
        icon: "\uD83D\uDD25",
        color: "#ef4444",
        tags: ["event", "hazard", "gold", "time"],
        requiresGold: true,
        variants: [
            { title: "Ember Scare",   desc: "Quick to put out. -2hr and 5% gold.",    weight: 50, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 2 } }, { tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.05); } } }] },
            { title: "Small Fire",    desc: "Lose 4 hours and 10% gold.",              weight: 35, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 4 } }, { tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.10); } } }] },
            { title: "Workshop Fire", desc: "Serious damage. -8hr and 20% gold.",      weight: 15, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 8 } }, { tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.20); } } }] },
        ],
    },

    // --- FLOOD (lose hours + gold) ---
    {
        id: "flood",
        chance: 0.03,
        icon: "\uD83C\uDF0A",
        color: "#60a5fa",
        tags: ["event", "hazard", "gold", "time"],
        requiresGold: true,
        variants: [
            { title: "Flash Flood", desc: "Water seeps in. -3hr and 10% gold.",          weight: 50, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 3 } }, { tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.10); } } }] },
            { title: "Hurricane",   desc: "The street is a river. -6hr and 15% gold.",   weight: 35, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 6 } }, { tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.15); } } }] },
            { title: "Tsunami",     desc: "Catastrophic flooding. -12hr and 20% gold.",  weight: 15, effects: [{ tag: "DAY_ADVANCE_HOUR", payload: { hours: 12 } }, { tag: "ECONOMY_SPEND_GOLD", payload: { amount: function(s) { return Math.floor((s.gold || 0) * 0.20); } } }] },
        ],
    },

    // --- DROUGHT (material price increase) ---
    {
        id: "drought",
        chance: 0.05,
        icon: "\u2600",
        color: "#fb923c",
        tags: ["event", "debuff", "market"],
        variants: [
            { title: "Material Shortage", desc: "Supplies low. Material prices +10% today.",   weight: 40, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { globalMatMult: 1.10 } }] },
            { title: "Trade Disruption",  desc: "Routes blocked. Material prices +20% today.", weight: 30, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { globalMatMult: 1.20 } }] },
            { title: "Market Collapse",   desc: "Markets in chaos. Prices +30% today.",        weight: 20, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { globalMatMult: 1.30 } }] },
            { title: "Great Famine",      desc: "All trade ceased. Prices +50% today.",         weight: 10, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { globalMatMult: 1.50 } }] },
        ],
    },

    // --- CURSE (lose portion of materials) ---
    {
        id: "curse",
        chance: 0.04,
        icon: "\uD83D\uDC80",
        color: "#ef4444",
        tags: ["event", "hazard", "materials"],
        requiresMats: true,
        variants: [
            { title: "Mild Rust",       desc: "Some $matName spoiled. Lost 25%.",        weight: 50, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { key: "$ownedMat", qtyPercent: -0.25 } }] },
            { title: "Cursed Shipment", desc: "Your $matName rusts. Lost half.",          weight: 35, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { key: "$ownedMat", qtyPercent: -0.50 } }] },
            { title: "Heavy Curse",     desc: "All your $matName turns to dust!",         weight: 15, effects: [{ tag: "ECONOMY_ADD_MATERIAL", payload: { key: "$ownedMat", qtyPercent: -1.0 } }] },
        ],
    },

    // --- VIRAL (guaranteed customers all day) ---
    {
        id: "viral",
        chance: 0.02,
        icon: "\uD83C\uDF1F",
        color: "#fbbf24",
        tags: ["event", "buff", "customers"],
        variants: [
            { title: "You Went Viral", desc: "Medieval internet fame. Customers flood in all day.", weight: 100, effects: [{ tag: "ECONOMY_EARN_GOLD", payload: { guaranteedCustomers: true } }] },
        ],
    },

    // ============================================================
    // PERSISTENT MODIFIER ABILITIES
    // These use the factory's modifier + endWhen support.
    // They stay active and affect game math until ended.
    // ============================================================

    // --- BLESSING OF FLAME (wider heat perfect zone all day) ---
    {
        id: "blessing_of_flame",
        chance: 0.05,
        icon: "\uD83D\uDD25",
        color: "#f59e0b",
        tags: ["event", "buff", "forge"],
        scope: "day",
        variants: [
            { title: "Blessing of Flame", desc: "The forge burns true. Heat perfect zone +50% today.", weight: 100, effects: [] },
        ],
        modifiers: [
            { attribute: "heatPerfectZone", operation: "multiply", value: 1.5 },
        ],
    },

    // --- SUPPLY CARAVAN (material prices drop 30% all day) ---
    {
        id: "supply_caravan",
        chance: 0.04,
        icon: "\uD83D\uDED2",
        color: "#4ade80",
        tags: ["event", "buff", "market"],
        scope: "day",
        variants: [
            { title: "Supply Caravan", desc: "A caravan rolls in. Material prices -30% today.", weight: 100, effects: [] },
        ],
        modifiers: [
            { attribute: "materialPrice", operation: "multiply", value: 0.7 },
        ],
    },

    // --- TRAVELING SMITH (customer chance halved all day) ---
    {
        id: "traveling_smith",
        chance: 0.04,
        icon: "\u2694",
        color: "#ef4444",
        tags: ["event", "debuff", "customers"],
        scope: "day",
        variants: [
            { title: "Traveling Smith", desc: "A rival smith is in town. Customer chance halved today.", weight: 100, effects: [] },
        ],
        modifiers: [
            { attribute: "customerChance", operation: "multiply", value: 0.5 },
        ],
    },

    // --- ROYAL INSPECTION (double rep gain until next sale) ---
    {
        id: "royal_inspection",
        chance: 0.04,
        icon: "\uD83D\uDC51",
        color: "#a78bfa",
        tags: ["event", "buff", "reputation"],
        scope: "manual",
        variants: [
            { title: "Royal Inspection", desc: "A royal inspector watches. Next sale earns double reputation.", weight: 100, effects: [] },
        ],
        modifiers: [
            { attribute: "repGain", operation: "multiply", value: 2.0 },
        ],
        endWhen: {
            tag: "ECONOMY_EARN_GOLD",
        },
    },

];

export default MORNING_EVENTS;