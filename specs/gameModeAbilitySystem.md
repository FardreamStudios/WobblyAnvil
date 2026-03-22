DES-1: GameMode + Ability System Architecture Spec
Status: DRAFT v2 — Open Questions Resolved
Author: Claude (Design Jam with Director)
Date: March 22, 2026
Scope: Full audit — system design, migration plan, new content roadmap

1. Executive Summary
   Two new systems replace the legacy event roller and centralize game flow:

GameMode — Owns the macro game loop (day cycle, phase transitions, win/loss, sub-mode switching). Replaces the ~200 lines of orchestration logic currently spread across App.js and useDayVM. Pure JS core (like a C++ UGameMode) with a thin React hook wrapper (like its Blueprint counterpart) that bridges it to the rendering layer.
Ability Manager — A reactive system where gameplay abilities watch the bus for triggers, self-activate when conditions are met, run behavior, and self-terminate. Replaces events.js and dynamicEvents.js. Abilities declare modifier operations (add, multiply, override, etc.) on game attributes — same pattern as UE Gameplay Effects.

Together they eliminate the monolithic morning roll, decouple "what happens" from "why it happens," and open the door for new activity modes (fishing, trading, etc.) without touching core wiring.

2. System Overview
   ┌──────────────────────────────────────────────────────┐
   │  App.js  (~30-40 lines)                              │
   │  Instantiates GameMode, renders current view         │
   ├──────────────────────────────────────────────────────┤
   │  GameMode  (pure JS core + useGameMode hook wrapper) │
   │  Owns: Day lifecycle, sub-mode switching,            │
   │        win/loss, game-level bus emissions             │
   │                                                      │
   │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐     │
   │  │ Forge Mode  │  │ Shop Mode   │  │ Fish Mode│     │
   │  │ (QTE loop)  │  │ (buy/sell)  │  │ (future) │     │
   │  └─────────────┘  └─────────────┘  └──────────┘     │
   ├──────────────────────────────────────────────────────┤
   │  Ability Manager                                     │
   │  Watches bus → activates abilities → manages lifecycle│
   │  Resolves modifiers: override → multiply → add → clamp│
   │                                                      │
   │  ┌───────────┐ ┌───────────┐ ┌───────────┐          │
   │  │ Festival  │ │ Curse     │ │ Hot Streak│          │
   │  │ (1-shot)  │ │ (persist) │ │ (persist) │          │
   │  └───────────┘ └───────────┘ └───────────┘          │
   ├──────────────────────────────────────────────────────┤
   │  GameplayEventBus  (unchanged — pub/sub backbone)    │
   ├──────────────────────────────────────────────────────┤
   │  State Hooks  (unchanged — own domain state)         │
   │  useEconomyState │ useDayState │ useForgeState │ ... │
   ├──────────────────────────────────────────────────────┤
   │  VM Hooks  (unchanged — transform state → view)      │
   │  useForgeVM │ useEconomyVM │ usePlayerVM │ ...       │
   └──────────────────────────────────────────────────────┘
   Key principle: GameMode and Ability Manager communicate exclusively through the bus. Neither directly calls the other. GameMode emits lifecycle tags (DAY_NEW, DAY_END, MODE_ENTER, MODE_EXIT). Abilities react to those tags plus any other gameplay tags they care about.

3. GameMode
   3.1 Architecture Pattern
   GameMode follows the same split as UE:

gameMode.js (pure JS) = The C++ UGameMode base class. Owns day lifecycle, sub-mode switching, win/loss rules. Talks only through the bus. Zero React imports. Portable and testable — could run in a Node terminal with no UI.
useGameMode.js (React hook) = The Blueprint wrapper. Instantiates the pure JS GameMode, feeds it current React state, and exposes its outputs as React-friendly values for components to render. This is the bridge between game rules and pixels on screen.

If we ever port to a different renderer (React Native, canvas, etc.), gameMode.js comes unchanged. Only the hook wrapper gets rewritten.
3.2 What It Owns
ResponsibilityCurrently lives inMoves to GameModeDay counter, new day sequenceuseDayVM.buildDayQueueYesSleep / wake cycleuseDayVM.doSleepYesPhase transitions (idle → select → heat → ...)App.js + useForgeVMDelegated to sub-modesCustomer spawning decisionsApp.js.trySpawnCustomerYes (timing), sub-mode (display)Game over / win conditionsScattered (App.js, usePlayerVM)YesSub-mode entry/exitImplicit in phase changesExplicit APIMorning event rollevents.js.rollDailyEventEliminated — replaced by bus emissions that abilities react to
3.3 Day Lifecycle (Bus Emissions)
GameMode emits these tags at each stage of the day. Abilities and other systems subscribe to the ones they care about.
GAME.DAY.START          → { day: 5, hour: 8 }
GAME.DAY.MORNING_PHASE  → { day: 5 }           // abilities check activation
GAME.DAY.OPEN           → { day: 5, hour: 9 }  // customers can arrive
GAME.DAY.LATE           → { day: 5, hour: 22 }  // late-night warnings
GAME.DAY.SLEEP          → { day: 5, hour: 26, sleepHour: 2 }
GAME.DAY.END            → { day: 5 }            // ability manager: endAll("day")

GAME.MODE.ENTER         → { mode: "forge", subMode: true }
GAME.MODE.EXIT          → { mode: "forge" }
GAME.OVER               → { reason: "reputation", day: 12 }
GAME.NEW                → {}                    // fresh game, full reset
3.4 Sub-Mode Contract
Every sub-mode (forge, shop, future fishing, etc.) implements this interface:
{
id:          "forge",
canEnter:    function(gameState) → boolean,   // stamina > 0, has materials, etc.
onEnter:     function(bus) → void,            // emit MODE.ENTER, set up mode state
onExit:      function(bus) → void,            // emit MODE.EXIT, clean up
getPhase:    function() → string,             // current internal phase
getView:     function() → string,             // which view component to render
}
Sub-modes are registered with GameMode. GameMode delegates phase management to the active sub-mode. Views ask GameMode "what should I render?" and get a view key back.
3.5 File Location
src/
├── gameMode/
│   ├── gameMode.js         # Core GameMode (pure JS) — day lifecycle, sub-mode switching
│   ├── useGameMode.js      # React hook wrapper — bridges pure JS to rendering layer
│   ├── forgeMode.js        # Forge sub-mode (QTE flow)
│   ├── shopMode.js         # Shop sub-mode (buy/sell)
│   └── idleMode.js         # Default idle sub-mode (rest, promote, scavenge)

4. Ability Manager
   4.1 Lifecycle Phases
   REGISTERED → WATCHING → ACTIVE → ENDING → DEAD
   │           │         │        │
   │           │         │        └─ Removed from manager, GC'd
   │           │         └─ Running behavior, may subscribe to more tags
   │           └─ Listening for activation trigger on bus
   └─ Definition loaded, not yet watching (cold storage)
   PhaseWhat happensBus interactionRegisteredDefinition loaded into manager at startupNoneWatchingManager subscribes to ability's trigger tagon(trigger, checkActivation)ActiveonActivate fires, ability runs its behaviorEmits tags, may subscribe to end-condition tagsEndingonEnd fires, cleans up effectsEmits cleanup tags, all subscriptions removedDeadInstance removed from active listNothing
   4.2 Manager API
   javascriptvar AbilityManager = {
   // --- Setup ---
   register:      function(abilityDef),           // add definition to registry
   registerAll:   function(abilityDefsArray),      // bulk register
   startWatching: function(),                      // subscribe all registered triggers to bus

   // --- Lifecycle ---
   activate:      function(id, payload),           // manually activate by id
   endAbility:    function(instanceId),            // end a specific running instance
   endAll:        function(scope),                 // end all active ("day" = day-scoped, "all" = everything)

   // --- Query ---
   isActive:      function(id) → boolean,          // is this ability currently running?
   getActive:     function() → array,              // list all active instances
   hasTag:        function(tag) → boolean,         // any active ability with this tag?
   getModifiers:  function(attribute) → array,     // all active modifiers for an attribute
   resolveValue:  function(attribute, base) → num, // apply modifier stack to a base value

   // --- Diagnostics ---
   // Logs warning if active count exceeds 10 — signals design sprawl

   // --- Cleanup ---
   reset:         function(),                      // full reset (new game)
   };
   4.3 Modifier System (Gameplay Effect Operations)
   Abilities declare modifiers — operations on game attributes. When multiple abilities affect the same attribute, modifiers resolve in a fixed order, same as UE Gameplay Effects:
   Resolution order: Override → Multiply → Add → Clamp
   OperationBehaviorExampleoverrideReplaces base value entirelyHeat zone = 50% (ignores upgrades)multiplyMultiplier on current value1.3x gold earnedaddFlat addition/subtraction+2 extra customers, -1 staminaset_minFloor clamp (applied last)Stamina can't drop below 2set_maxCeiling clamp (applied last)Max customers capped at 3
   How it works in practice:
   javascript// Ability declares modifiers in onActivate:
   onActivate: function(ctx) {
   ctx.manager.addModifier({
   source:    "blessing_of_flame",     // ability id (for cleanup)
   attribute: "heatPerfectZone",       // what it affects
   operation: "multiply",              // how it affects it
   value:     1.5,                     // by how much
   });
   },

// Consuming system asks for resolved value:
var baseZone = BALANCE.heatWinHi - BALANCE.heatWinLo;       // e.g. 8
var resolvedZone = AbilityManager.resolveValue("heatPerfectZone", baseZone);
// If "Blessing of Flame" (multiply 1.5) is active: 8 * 1.5 = 12
// If "Cursed Forge" (multiply 0.7) is also active: 8 * 1.5 * 0.7 = 8.4
// Multipliers stack multiplicatively. Overrides would replace base entirely.
On cleanup: When an ability ends, its modifiers are automatically removed by the manager (matched by source id). No manual cleanup needed in onEnd for modifiers.
4.4 Ability Definition Shape
Each ability is a single JS file exporting one definition object:
javascript// src/abilities/festival.js
import EVENT_TAGS from "../config/eventTags.js";

var FestivalAbility = {
// --- Identity ---
id:          "festival",                       // unique key
tags:        ["event", "buff", "customers"],   // category tags for filtering
scope:       "day",                            // "day" = auto-ended on DAY.END
// "permanent" = persists across days
// "manual" = only ended explicitly
stackable:   false,                            // can multiple instances run?

    // --- Activation ---
    trigger:     "GAME.DAY.MORNING_PHASE",         // bus tag that wakes this up
                                                   // null = manual activation only
    
    canActivate: function(payload, manager, state) {
        // Gets LIVE state — not a stale snapshot
        // Guard — should this fire?
        return Math.random() < 0.15;
    },

    // --- Behavior ---
    onActivate:  function(ctx) {
        // ctx = { bus, payload, manager, endSelf, state }
        var extra = ctx.payload.variant || 3;
        ctx.bus.emit(EVENT_TAGS.ECONOMY_EXTRA_CUSTOMERS, { extra: extra });
        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg: "TOWN FESTIVAL\nExtra customers today! +" + extra + " visits.",
            icon: "🎉", color: "#fbbf24", duration: 4000,
        });
        // Fire-and-forget: no endWhen, scope "day" handles cleanup
    },

    // --- End Conditions ---
    endWhen:     null,                             // bus tag + condition for self-termination
                                                   // null = no self-termination (scope handles it)
                                                   // Example: { tag: "ECONOMY.SELL", condition: fn }
    
    duration:    null,                             // auto-end after N ms (null = no timer)

    // --- Cleanup ---
    onEnd:       function(ctx) {
        // Reverse non-modifier effects, emit cleanup tags
        // Modifiers are auto-removed by manager — no need to clean those here
    },
};

export default FestivalAbility;
4.5 Context Object
Passed to onActivate, onEnd, and endWhen.condition:
javascript{
bus:       GameplayEventBus,          // emit / subscribe
payload:   { ... },                   // whatever triggered this activation
manager:   AbilityManager,            // query other actives, add modifiers, end self
endSelf:   function(),                // shortcut to end this instance
state:     {                          // LIVE read of current game state
gold, inv, finished, hour, day,
stamina, reputation, level, stats,
},
}
State is a live read. canActivate and lifecycle functions receive current game state, not a stale snapshot. This matches UE's pattern where CanActivateAbility() checks the live AttributeSet.
Abilities affect game state by emitting bus tags, never by mutating state directly. This keeps the data flow unidirectional: ability → bus → state hook → re-render. Modifiers are the one exception — they're registered with the manager and resolved on-demand by consuming systems.
4.6 Persistent Abilities (endWhen Example)
javascript// src/abilities/cursedForge.js
var CursedForgeAbility = {
id:       "cursed_forge",
tags:     ["hazard", "debuff", "forge"],
scope:    "manual",                          // lives until end condition
trigger:  "GAME.DAY.MORNING_PHASE",

    canActivate: function(payload, manager, state) {
        return !manager.isActive("cursed_forge") && Math.random() < 0.08;
    },

    onActivate: function(ctx) {
        // Register modifier — auto-removed when ability ends
        ctx.manager.addModifier({
            source:    "cursed_forge",
            attribute: "forgeStaminaCost",
            operation: "add",
            value:     1,
        });
        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg: "CURSED FORGE\nAn unnatural chill. Forging drains extra stamina until you sell a weapon.",
            icon: "💀", color: "#ef4444", duration: 5000,
        });
    },

    endWhen: {
        tag:       "ECONOMY.WEAPON_SOLD",        // watch for this bus tag
        condition: function(payload, ctx) {       // should we end?
            return true;                          // any sale breaks the curse
        },
    },

    onEnd: function(ctx) {
        // Modifier auto-removed — just show feedback
        ctx.bus.emit(EVENT_TAGS.UI_ADD_TOAST, {
            msg: "CURSE LIFTED\nThe forge warms again.",
            icon: "✨", color: "#4ade80", duration: 3000,
        });
    },
};
4.7 Diagnostics
No hard cap on active abilities. Instead, the manager logs a warning when the active count exceeds a threshold (default: 10):
[AbilityManager] WARNING: 12 active abilities — possible design sprawl
Active: festival, cursed_forge, hot_streak, blessing_of_flame, ...
This keeps the system flexible during design while making runaway stacking visible during development. We can add a hard cap later if needed.
4.8 File Structure
src/
├── abilities/
│   ├── abilityManager.js          # Registry, lifecycle engine, modifier resolver, query API
│   │
│   ├── morning/                   # Triggered by GAME.DAY.MORNING_PHASE
│   │   ├── festival.js
│   │   ├── merchantVisit.js
│   │   ├── ratInfestation.js
│   │   ├── fire.js
│   │   ├── weatherEvent.js
│   │   ├── cursedForge.js
│   │   ├── mysteryVisitor.js      # good mystery (VFX sequence)
│   │   └── mysteryShadow.js       # bad mystery (VFX sequence)
│   │
│   ├── reactive/                  # Triggered by gameplay actions
│   │   ├── hotStreak.js           # 3 good forges in a row → buff
│   │   ├── royalAttention.js      # rep threshold → quest frequency up
│   │   └── shameDebuff.js         # quest failed → customer chance down
│   │
│   └── index.js                   # Imports all, exports flat array for registerAll
Adding a new ability: Create a file, export the definition object, add one import line to index.js. No other files touched.

5. Migration Plan
   5.1 What Gets Replaced
   Old File/FunctionReplaced ByCan Delete Afterevents.js — EVENTS arrayIndividual ability files in src/abilities/morning/Yes (keep generateRoyalQuest — move to src/logic/)events.js — rollDailyEventAbility Manager activation via GAME.DAY.MORNING_PHASEYesdynamicEvents.js — mysteryGoodsrc/abilities/morning/mysteryVisitor.jsYesdynamicEvents.js — mysteryBadsrc/abilities/morning/mysteryShadow.jsYesdynamicEvents.js — applyEventResultEach ability emits its own tags directlyYesuseDayVM.js — buildDayQueuegameMode.js — day lifecycleRefactored, not deleteduseDayVM.js — doSleep / sleepgameMode.js — sleep handlerRefactored, not deletedApp.js — orchestration (~200 lines)useGameMode.js hookYes (lines removed)useMysteryState.jsAbility instances manage their own stateYes
   5.2 What Stays Unchanged

GameplayEventBus — backbone, no changes needed
eventTags.js — grows with new tags, nothing removed
State hooks (useEconomyState, useDayState, etc.) — still own domain state
VM hooks (useForgeVM, useEconomyVM, etc.) — still transform state → view props
FX Cue system — still fires on bus tags, no changes
Views and widgets — pure components, unaffected

5.3 Build Order
PhaseTaskDepends OnRiskM-1Build abilityManager.js core (register, activate, end, query, modifier resolver)NothingLOWM-2Build gameMode.js core (day lifecycle, sub-mode API)M-1MEDIUMM-3Migrate 2-3 simple morning abilities (festival, merchant, rat)M-1LOWM-4Migrate mystery abilities (visitor, shadow) — validates VFX choreographyM-1MEDIUMM-5Build forgeMode.js sub-mode — extract QTE flow from useForgeVMM-2HIGHM-6Build useGameMode.js hook — connect GameMode to ReactM-2, M-5MEDIUMM-7Wire into App.js — replace orchestration with useGameModeM-6HIGHM-8Migrate remaining morning abilitiesM-1LOWM-9Build first reactive abilities (hot streak, shame debuff)M-1LOWM-10Delete legacy files (events.js, dynamicEvents.js, useMysteryState)M-7, M-8LOW
Recommended split: M-1 through M-4 in first sprint (ability system works standalone). M-5 through M-7 in second sprint (GameMode takes over). M-8 through M-10 cleanup.

6. New Ability Ideas (Post-Migration Content)
   6.1 Morning Abilities (Expand Existing Pool)
   AbilityTypeModifier OperationDescriptionTax Collector1-shotadd (gold, negative)Lose 10-25% gold. Higher rep = lower tax.Traveling SmithPersist (day)multiply (customerChance, 0.5)Competing smith in town. Customer chance halved until day end.Blessing of FlamePersist (day)multiply (heatPerfectZone, 1.5)All heat QTEs have wider perfect zone today.Supply Caravan1-shotmultiply (materialPrice, 0.7)Random material prices drop 30% today.Royal InspectionPersist (until sale)multiply (repGain, 2.0)Next weapon sold earns double rep. Ends after first sale.
   6.2 Reactive Abilities (New Category)
   AbilityTriggerEnd ConditionModifierDescriptionHot Streak3x FORGE_SESSION_COMPLETE with quality > 50Any session below 30 qualitymultiply (qualityGainRate, 1.15)+15% quality gain rate while active.ShameQUEST_FAILEDNext successful salemultiply (customerChance, 0.5)Customer spawn chance -50%.Royal AttentionPLAYER_REP crosses 8Rep drops below 7multiply (questFrequency, 1.5)Royal quests appear more frequently.Momentum5 weapons sold in one dayDay endmultiply (goldEarned, 1.1) stackingEach subsequent sale earns +10% gold.OverworkedStamina hits 0 during forgeSleepadd (maxStamina, -1)Next day starts with -1 max stamina.
   6.3 Future Sub-Mode Abilities
   AbilitySub-ModeDescriptionLucky CastFishingRare catch chance doubled for 3 casts.Haggle MasterTradingBuy prices reduced 15% for current shop visit.Apprentice HelpForgeAuto-completes heat phase at "Good" tier.

7. Persistence & Leaderboard
   7.1 localStorage — Settings Only (For Now)
   What we save now:

SFX volume, music volume, mute toggles
Any user preferences (future: key bindings, UI scale)

How: JSON blob in localStorage under a namespaced key (wobbly_anvil_settings). Read on game load, write on change.
Full game state save/load (gold, inventory, day, active abilities, etc.) is designed into the system but built later. The ability manager and GameMode should be serializable from day one — getActive() returns data that can be JSON-stringified, and activate(id, payload) can restore from saved data.
7.2 Leaderboard — Static JSON + Copy-to-Clipboard
No server needed. The leaderboard is a manually curated JSON file in the repo.
Flow:

Game over screen shows a "📋 Copy Score" button
Button serializes the run stats into a base64-encoded payload and copies to clipboard
Tester sends the payload to the director (Discord, text, etc.)
Director runs a verify script (decodes, checks checksum)
If valid, director adds entry to public/data/leaderboard.json and pushes
Game fetches leaderboard.json on load and displays top scores

Score payload contents:

Run ID (timestamp-based)
Final stats: day reached, gold, weapons forged, best weapon quality, reputation, level
Lightweight checksum: hash of stats concatenated with a salt embedded in the build
Game version string (so we know which build the score came from)

Anti-cheat level: Casual deterrent only. Stops someone from editing the base64 string by hand. Anyone who reads the source can find the salt — that's fine for a dev/test leaderboard. True anti-cheat would need a server.
Leaderboard JSON shape:
json[
{
"name": "PlayerName",
"day": 14,
"gold": 2340,
"weaponsForged": 23,
"bestQuality": 87,
"reputation": 9,
"level": 6,
"version": "0.4.2",
"date": "2026-03-22"
}
]
File location: public/data/leaderboard.json — served as a static asset by GitHub Pages, fetched on game load.

8. Resolved Design Decisions
   These were open questions in v1, now resolved:
   #QuestionDecisionRationale1Conflict resolution — what happens when two abilities affect the same attribute?Abilities declare modifier operations (override, multiply, add, set_min, set_max). Resolution order: override → multiply → add → clamp. Same as UE Gameplay Effects.Gives each ability explicit control over how it affects a value. No ambiguity.2State snapshot freshness — does canActivate see live state or stale?Live state. canActivate receives current game state, same as UE's CanActivateAbility() checking the live AttributeSet.Stale checks could activate abilities based on outdated conditions. Live is cheap since hooks already expose current values.3Max active abilities — hard cap?No cap. Warning log at 10+ active abilities to flag design sprawl during dev.Keeps the system flexible. A cap would be an arbitrary design constraint we'd fight against. The warning catches mistakes without limiting intentional stacking.4Persistence across sessionslocalStorage for settings only (now). Full game state save/load designed but built later. Ability manager and GameMode built to be serializable from day one.Browser refresh = lost game is acceptable for dev/test. Save/load is a feature, not a prerequisite.5GameMode architecturePure JS core (gameMode.js) + thin React hook wrapper (useGameMode.js). Core is like a C++ UGameMode — portable, testable, zero React coupling. Hook is the Blueprint wrapper that bridges to the rendering layer.Same pattern as GameplayEventBus. Keeps game logic portable. If we ever change renderers, only the hook wrapper changes.

9. New Ability Ideas (Post-Migration Content)
   (Moved from Section 6 for cleaner flow — content unchanged, see Section 6 above)

10. Glossary
    TermDefinitionAbilityA self-contained gameplay effect with lifecycle (activate → run → end). Replaces "event" in the old system. Like a UE Gameplay Ability.ModifierAn operation (add, multiply, override, clamp) that an ability applies to a game attribute. Like a UE Gameplay Effect modifier. Resolved in fixed order when multiple abilities stack.GameModeThe macro game loop owner. Decides what phase the game is in and what sub-modes are available. Pure JS core + React hook wrapper. Like UE's AGameMode (C++ base) + Blueprint (project wrapper).Sub-ModeA scoped activity context (forge, shop, fish) that runs within GameMode. Owns its own phase machine.TriggerA bus tag that an ability watches for. When emitted, the ability's canActivate guard is checked.ScopeHow long an ability lives: "day" (auto-ends at DAY.END), "permanent" (persists across days), "manual" (explicit end or endWhen only).Fire-and-forgetAn ability that does its work in onActivate and has no ongoing modifiers or state. Scope "day" cleans it up.Persistent abilityAn ability with endWhen and/or active modifiers — it lives until its end condition is met or it's manually killed.Context (ctx)The object passed to ability lifecycle functions: bus, payload, manager reference, endSelf shortcut, live state read.Score payloadBase64-encoded JSON blob containing run stats + checksum. Copied to clipboard on game over for manual leaderboard submission.

End of DES-1 Spec v2 — Awaiting Final Review