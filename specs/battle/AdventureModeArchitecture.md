# Adventure Mode V1 — Architecture Document

**Status:** 📝 DESIGN LOCKED — not yet executed
**Scope:** V1 standup — Campaign Map → Junkyard Node Map → Battle/Event → Return
**Depends on:** BattleView (existing), BattleTransition (existing), AdventureButton (existing)
**Related specs:** `Adventuremodespec.md`, `GameModeArchitecture.md`, `SystemSpecs.md`

---

## Table of Contents

1. Purpose & Scope
2. Design Principles
3. Folder Structure
4. Sub-Mode Contract
5. Shared State Hook
6. AdventureGameMode (Top-Level Wiring)
7. Campaign Sub-Mode
8. Map Sub-Mode
9. Battle Sub-Mode
10. Event Sub-Mode
11. App.js Integration
12. Data Flow Diagram
13. Execution Plan (Named Blocks)
14. Deferred to V2+
15. Key Code Block Names (Reference)

---

## 1. Purpose & Scope

Stand up a minimal but clean adventure loop that proves the architecture before we invest in content. V1 is structural — no HP, no loot, no rewards, no decrees. Just navigation.

### V1 Loop

```
Main Menu
    ↓ (Adventure button, unlocked)
Campaign Map (1 hotspot: Junkyard)
    ↓ (click Junkyard)
Node Map (hand-authored 6-node Junkyard layout)
    ↓ (traverse nodes)
Battle / Event / Boss (resolves, returns to map)
    ↓ (boss killed OR death)
Campaign Map (return)
```

### V1 Scope

**Includes:**
- Campaign map screen with Junkyard hotspot
- Hand-authored Junkyard node graph (6 nodes)
- Node traversal with current position tracking
- Battle nodes wrapping existing `BattleView` + `BattleTransition`
- One hardcoded random event with 2-choice dialogue
- Boss node (reuses battle wrapper, flagged as boss)
- Exit-to-campaign flow on boss kill or death

**Excludes (deferred):**
- HP, stamina, or any run-wide resources
- Loot, rewards, equipment drops
- Decrees / quest integration
- Multiple locations (Goblin Mines, Haunted Armory)
- Flee / retreat mechanics
- Extraction stakes / weapon loss
- Forge site node (field forge)
- Polish: transitions, animations, art

---

## 2. Design Principles

This architecture follows the project's UE-style philosophy from `Architecture.md`:

- **Self-contained feature.** Everything lives under `src/adventure/`. App.js knows only that adventure mode exists — it does not route between adventure screens.
- **Sub-modes as plugins.** Each phase of the adventure (campaign, map, battle, event) is a self-contained sub-mode with a standard contract. Adding the forge sub-mode later is drop-in.
- **Strict interface contract.** Every sub-mode exports the same shape. Predictability over brevity. Empty no-op functions are acceptable and expected.
- **One source of truth for shared state.** `useAdventureGameState` hook owns all run-wide state. Sub-modes read from it and dispatch updates through it. Never reach into each other's state.
- **Data tables, not literals.** Location definitions, node graphs, and event encounters live in `config/` files as array-of-objects. No magic numbers or strings in sub-mode logic.
- **View layer is pure.** Views receive props and render. Sub-mode gameplay files own all decisions.
- **Battle system is untouched.** The adventure battle sub-mode is a thin wrapper around existing `BattleView` — it does not modify or reach into the battle internals.

---

## 3. Folder Structure

```
src/adventure/
├── AdventureGameMode.js              # Top-level wiring, sub-mode registry + switcher
│
├── hooks/
│   └── useAdventureGameState.js      # Shared state hook (current location, node, run status)
│
├── campaign/                         # Sub-mode: campaign map (location select)
│   ├── config/
│   │   └── campaignMapData.js        # Location definitions (Junkyard for V1)
│   ├── gameplay/
│   │   └── campaignSubMode.js        # Sub-mode module (contract-compliant)
│   └── view/
│       └── CampaignMapView.js        # Pure view: map background + hotspot buttons
│
├── map/                              # Sub-mode: node map (traversal within a location)
│   ├── config/
│   │   └── junkyardNodeMap.js        # Hand-authored node graph
│   ├── gameplay/
│   │   └── mapSubMode.js             # Sub-mode module
│   └── view/
│       └── NodeMapView.js            # Pure view: node graph + current marker
│
├── battle/                           # Sub-mode: adventure battle wrapper
│   ├── config/
│   │   └── adventureBattleConfig.js  # Battle config builder (TEST_PARTY + TEST_WAVES)
│   └── gameplay/
│       └── battleSubMode.js          # Wraps existing BattleView + BattleTransition
│
└── event/                            # Sub-mode: random event dialogue
    ├── config/
    │   └── eventEncounters.js        # Hardcoded encounter data
    ├── gameplay/
    │   └── eventSubMode.js           # Sub-mode module
    └── view/
        └── EventNodeView.js          # Pure view: dialogue modal with choices
```

### Why this structure

- **Mirrors UE plugin pattern.** Each sub-mode is a self-contained folder with clear config/logic/view separation.
- **Scalable.** When we add forge, mine, merchant, rest, or elite sub-modes later, they slot in as sibling folders. No refactoring required.
- **Discoverable.** To understand how battle nodes work, a dev opens `src/adventure/battle/` and sees everything relevant.
- **Testable.** Config files are pure data, gameplay files are pure logic, views are pure render. Each layer can be swapped independently.

### Forge sub-mode (deferred)

Forge is intentionally omitted from V1. When we build field forge (mid-run anvil), we add `src/adventure/forge/` following the identical pattern. No changes to the registry architecture.

---

## 4. Sub-Mode Contract

Every sub-mode file exports a module object with the following **exact shape**:

```
{
    id: "campaign",                    // String identifier, matches folder name
    onEnter: function(ctx) { ... },    // Called when sub-mode becomes active
    onExit: function(ctx) { ... },     // Called when sub-mode is switched away
    getView: function(ctx) { ... }     // Returns JSX for this sub-mode
}
```

### Contract field definitions

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Unique identifier. Used by `switchTo()` to look up the sub-mode in the registry. |
| `onEnter(ctx)` | function | Called exactly once when the sub-mode becomes active. Use for setup — sfx mode changes, state initialization, logging. Can be a no-op. |
| `onExit(ctx)` | function | Called exactly once when the sub-mode is switched away. Use for cleanup — clearing timers, resetting transient UI state. Can be a no-op. |
| `getView(ctx)` | function | Returns the JSX tree for this sub-mode. Called every render. Must be pure — no side effects, no state mutations. |

### The `ctx` object

Every contract method receives the same context object:

```
ctx = {
    adventureState: { ... },    // Current state from useAdventureGameState
    dispatch: function(...),    // State updater from useAdventureGameState
    switchTo: function(id),     // Switch to another sub-mode by id
    exitAdventure: function(),  // Exit adventure mode entirely (back to main menu)
    sfx: { ... },               // Audio hook (for sound effects)
    handedness: "left" | "right" // UI preference, passed through for BattleView
}
```

The context is built once in `AdventureGameMode.js` and passed identically to every sub-mode method. Sub-modes pick what they need — they never reach outside ctx.

### Why strict

**Pros:**
- **Predictable.** Every sub-mode looks the same. New devs (or future-you) know exactly where to look.
- **Swappable.** AdventureGameMode treats all sub-modes identically — no special cases or `if (subMode.onEnter)` checks.
- **Easy to scaffold.** Adding a new sub-mode is copy an existing folder, rename, fill in the blanks.
- **Refactor-safe.** If we later add a new contract method (e.g. `onTick`), we add it to every sub-mode in one pass.

**Cons:**
- **Some no-op functions.** Not every sub-mode needs all four methods. That's fine — `onExit: function() {}` is one line and costs nothing.

---

## 5. Shared State Hook

**File:** `src/adventure/hooks/useAdventureGameState.js`

### Purpose

Single source of truth for adventure-wide state. Parallel to `useDayState` and `useForgeState` in the simulator — owns the "game instance" data for an adventure run.

### V1 state shape

```
{
    currentSubModeId: "campaign",         // Which sub-mode is active
    currentLocation: null,                // "junkyard" | null (null on campaign map)
    currentNodeId: null,                  // Node id within current location, null if not in map
    visitedNodes: [],                     // Array of node ids already traversed
    runActive: false,                     // True once player enters a location
    lastNodeResult: null                  // "victory" | "defeat" | "eventResolved" | null
}
```

### V1 API

```
{
    state: { ... },                       // Current state (above shape)
    setCurrentSubMode: function(id),
    setCurrentLocation: function(id),
    setCurrentNode: function(id),
    markNodeVisited: function(id),
    setRunActive: function(bool),
    setLastNodeResult: function(result),
    resetRun: function()                  // Clear all run state, called on exit or death
}
```

### Expansion rules

**When to add fields:** When a sub-mode needs to share state with another sub-mode.
**When NOT to add fields:** When state is internal to a single sub-mode (e.g. dialogue step index in event sub-mode — that's local React state, not adventure state).

**Fields we'll add later (do NOT add in V1):**
- `playerHP` — when combat damage carries between battles
- `inventory` — when loot drops
- `equippedWeapon` — when forge output feeds adventure
- `activeDecree` — when decree system lands
- `runSeed` — when map generation is procedural

### Architecture notes

- Vanilla React `useState` hook under the hood. No reducers, no contexts (for V1).
- Returned API is stable — functions don't change identity between renders.
- Sub-modes never call `setState` directly. They call named action methods (`setCurrentNode`, etc.) which make intent clear.

---

## 6. AdventureGameMode (Top-Level Wiring)

**File:** `src/adventure/AdventureGameMode.js`

### Purpose

The top-level component that owns the adventure mode lifecycle. It is the ONLY adventure file that App.js knows about. Everything else is internal.

### Responsibilities

1. **Instantiate shared state** via `useAdventureGameState`.
2. **Register all sub-modes** (campaign, map, battle, event) in a local registry.
3. **Build the `ctx` object** once per render, passed to all sub-mode methods.
4. **Run lifecycle hooks.** When `currentSubModeId` changes, call `onExit` on the old sub-mode and `onEnter` on the new one (via React `useEffect`).
5. **Render the active sub-mode's view** by calling `registry[currentSubModeId].getView(ctx)`.
6. **Expose `onExit` callback** to App.js for returning to the main menu.

### Responsibilities it does NOT have

- **No gameplay logic.** Never decides what happens on a node click or a battle outcome. Delegates to sub-modes.
- **No direct state mutation.** All state updates flow through `dispatch`.
- **No view logic.** Does not render any UI elements of its own — it's a pass-through to whichever sub-mode is active.

### Component signature

```
function AdventureGameMode(props) {
    // props: { sfx, handedness, onExit }
    // onExit is called when player leaves adventure mode (back to main menu)
    ...
}
```

### Internal structure (pseudocode)

```
1. Call useAdventureGameState() → get state + dispatch functions
2. Define subModeRegistry = { campaign, map, battle, event }
3. Build ctx object with current state + dispatch + switchTo + sfx
4. useEffect on currentSubModeId change → call onExit/onEnter
5. Return activeSubMode.getView(ctx)
```

### The `switchTo` function

Defined inside AdventureGameMode, closed over the dispatch:

```
function switchTo(subModeId) {
    dispatch.setCurrentSubMode(subModeId);
}
```

When called, React re-renders, the useEffect sees the id change, fires lifecycle hooks, then renders the new view.

### Initial sub-mode

On mount, AdventureGameMode starts in `"campaign"`. The player sees the campaign map. From there, sub-modes switch based on player actions.

---

## 7. Campaign Sub-Mode

**Folder:** `src/adventure/campaign/`
**Role:** Top-level location selector. Shown when player enters adventure mode and when they return from a run.

### campaignMapData.js (config)

Array-of-objects table defining all campaign locations. V1 has one entry.

```
var CAMPAIGN_LOCATIONS = [
    {
        id: "junkyard",
        label: "Junkyard",
        description: "Grimy, comedic. Sentient garbage.",
        unlocked: true,
        position: { x: 0.35, y: 0.55 },   // Normalized 0-1, relative to map background
        nodeMapId: "junkyardNodeMap"       // Which node map to load
    }
    // Future entries: goblinMines, hauntedArmory
];
```

**Expansion:** Adding a new location is appending one object to this array.

### campaignSubMode.js (gameplay)

Implements the strict contract:

- `id: "campaign"`
- `onEnter(ctx)` — clears `currentLocation`, `currentNodeId`, `runActive`. Ensures a clean slate when returning from a run. Logs "Entered campaign map" for V1 debugging.
- `onExit(ctx)` — no-op for V1.
- `getView(ctx)` — returns `<CampaignMapView locations={CAMPAIGN_LOCATIONS} onSelectLocation={handleSelect} />` where `handleSelect` is a local function that:
    1. Calls `ctx.dispatch.setCurrentLocation(locationId)`
    2. Calls `ctx.dispatch.setRunActive(true)`
    3. Calls `ctx.switchTo("map")`

### CampaignMapView.js (view)

Pure presentational component.

**Props:**
- `locations` — array from config
- `onSelectLocation` — callback with location id
- `onExit` — callback to return to main menu (wired from AdventureGameMode's onExit prop)

**Renders:**
- Background image (placeholder for V1 — dark panel with "CAMPAIGN MAP" title)
- Each unlocked location as a clickable hotspot positioned via `location.position`
- Locked locations rendered greyed-out and non-interactive
- "EXIT" button to return to main menu

**No logic.** No useState. No useEffect. Pure props → JSX.

---

## 8. Map Sub-Mode

**Folder:** `src/adventure/map/`
**Role:** Node graph traversal within a single location.

### junkyardNodeMap.js (config)

Hand-authored node graph for V1 Junkyard. Array-of-objects with explicit connections.

```
var JUNKYARD_NODE_MAP = {
    id: "junkyardNodeMap",
    locationId: "junkyard",
    startNodeId: "j1",
    nodes: [
        {
            id: "j1",
            type: "entrance",
            label: "Junkyard Entrance",
            position: { x: 0.5, y: 0.1 },
            connectsTo: ["j2"]
        },
        {
            id: "j2",
            type: "battle",
            label: "Scrap Heap",
            position: { x: 0.5, y: 0.3 },
            connectsTo: ["j3", "j4"]
        },
        {
            id: "j3",
            type: "event",
            label: "Strange Traveler",
            position: { x: 0.3, y: 0.5 },
            connectsTo: ["j5"],
            encounterId: "goblin_dagger"
        },
        {
            id: "j4",
            type: "battle",
            label: "Rust Pile",
            position: { x: 0.7, y: 0.5 },
            connectsTo: ["j5"]
        },
        {
            id: "j5",
            type: "boss",
            label: "Rust Golem",
            position: { x: 0.5, y: 0.75 },
            connectsTo: ["j6"]
        },
        {
            id: "j6",
            type: "exit",
            label: "Escape",
            position: { x: 0.5, y: 0.92 },
            connectsTo: []
        }
    ]
};
```

### Node types (V1)

| Type | Purpose | Sub-mode it triggers |
|---|---|---|
| `entrance` | Starting position, auto-visited on enter | (none — just a marker) |
| `battle` | Standard fight | `battle` sub-mode (normal config) |
| `event` | Dialogue choice | `event` sub-mode |
| `boss` | Harder fight | `battle` sub-mode (boss config) |
| `exit` | Run complete | Returns to campaign map |

### mapSubMode.js (gameplay)

Implements the strict contract:

- `id: "map"`
- `onEnter(ctx)` — loads the node map for `ctx.adventureState.currentLocation`. Sets `currentNodeId` to the map's `startNodeId`. Marks start node as visited.
- `onExit(ctx)` — no-op for V1.
- `getView(ctx)` — returns `<NodeMapView nodeMap={loadedMap} currentNodeId={...} visitedNodes={...} onSelectNode={handleNodeClick} />`

**handleNodeClick(nodeId) logic:**
1. Look up the node in the map.
2. Verify it's connected from the current node (can only move forward).
3. Update `currentNodeId` to the clicked node.
4. Branch on `node.type`:
    - `battle` → store "normal" flag in state, `switchTo("battle")`
    - `event` → store `encounterId` in state, `switchTo("event")`
    - `boss` → store "boss" flag, `switchTo("battle")`
    - `exit` → `switchTo("campaign")` + reset run state
5. The returning sub-mode (on completion) will read `lastNodeResult` and either mark the node visited or trigger failure flow.

### Result handling

When a battle or event sub-mode completes and switches back to `"map"`, the map's `onEnter` re-fires. It reads `ctx.adventureState.lastNodeResult`:

- `"victory"` or `"eventResolved"` → mark current node visited, proceed normally
- `"defeat"` → log death, `switchTo("campaign")`, reset run state

### NodeMapView.js (view)

Pure presentational.

**Props:**
- `nodeMap` — the full graph config
- `currentNodeId` — which node the player is on
- `visitedNodes` — array of visited node ids
- `onSelectNode` — click callback

**Renders:**
- Dark background (placeholder)
- SVG or absolutely-positioned divs for each node, placed via `node.position`
- Lines drawn between nodes based on `connectsTo`
- Visual states: visited (dim), current (highlighted), available (glowing), locked (grey)
- Node icons based on `node.type` (text labels for V1 — "BATTLE", "EVENT", "BOSS", "EXIT")
- Click handlers only on available nodes (nodes connected from current)

---

## 9. Battle Sub-Mode

**Folder:** `src/adventure/battle/`
**Role:** Thin wrapper around existing `BattleView` + `BattleTransition`. Handles entry transition, passes config, handles exit transition, reports outcome back to map.

### adventureBattleConfig.js (config)

Builds the props object passed to `BattleView` based on node type.

```
// Imports TEST_PARTY, TEST_WAVES from src/battle/battleConstants.js

function buildBattleConfig(isBoss) {
    return {
        party: TEST_PARTY,
        waves: TEST_WAVES,
        zoneName: isBoss ? "Rust Golem's Lair" : "Junkyard",
        waveLabel: isBoss ? "BOSS" : "Wave 1/2",
        isBoss: isBoss
        // TODO V2: harder boss waves, real zone data, equipment-driven party
    };
}
```

**V1 approach:** Boss uses the same `TEST_PARTY` and `TEST_WAVES` as regular battles. Only the label differs. TODO comment flags this for future work.

### battleSubMode.js (gameplay)

Implements the strict contract but has NO view file — it composes existing components.

- `id: "battle"`
- `onEnter(ctx)` — sets sfx mode to "battle". Logs "Entering battle (boss=true/false)".
- `onExit(ctx)` — sets sfx mode back to "idle".
- `getView(ctx)` — returns a stateful JSX tree that manages its own internal phase:

**Internal phases (local to battleSubMode's getView):**
1. `"transitionIn"` → renders `<BattleTransition>` forward
2. `"battle"` → renders `<BattleView>` with config built from current node
3. `"transitionOut"` → renders `<BattleTransition>` reverse
4. On transitionOut complete → `ctx.dispatch.setLastNodeResult("victory")` + `ctx.switchTo("map")`

**Phase management:** Since getView is called every render and needs local state, battleSubMode actually returns a small internal React component that owns its own useState for phase. This keeps the contract clean while allowing the wrapper to manage its own transitions.

```
// Rough shape
getView: function(ctx) {
    return <BattleSubModeView ctx={ctx} />;
}
```

Where `BattleSubModeView` is a tiny component defined inside or alongside `battleSubMode.js` that has its own phase useState.

### Defeat handling (V1 minimal)

V1 assumption: player never loses. `BattleView`'s `onExit` is treated as victory. When we add real defeat detection later, we'll add a second callback path.

### Why no view file?

The adventure battle sub-mode doesn't render anything unique — it reuses `BattleView` and `BattleTransition`. Creating a `BattleSubModeView.js` just to wrap those would be ceremony. The tiny internal component lives in `battleSubMode.js` alongside the contract export. If the wrapper grows beyond ~60 lines, we extract it.

---

## 10. Event Sub-Mode

**Folder:** `src/adventure/event/`
**Role:** Hardcoded dialogue encounter with 2 choices. Minimal for V1.

### eventEncounters.js (config)

Array-of-objects table. V1 has one entry.

```
var EVENT_ENCOUNTERS = [
    {
        id: "goblin_dagger",
        title: "Strange Traveler",
        body: "A ragged goblin sits by a fire, poking at a rusty dagger. He looks up as you approach.",
        choices: [
            {
                id: "repair",
                label: "Offer to repair it",
                outcomeLog: "Player offered to repair the goblin's dagger."
            },
            {
                id: "force",
                label: "Take it by force",
                outcomeLog: "Player took the dagger by force."
            }
        ]
    }
];
```

**V1 outcomes:** `console.log(outcomeLog)` only. No state changes, no gold, no loot. The event resolves and returns to the map. Expansion later adds real outcome effects (reward, debuff, unlock flag, etc.) as new fields on the choice object.

### eventSubMode.js (gameplay)

Implements the strict contract:

- `id: "event"`
- `onEnter(ctx)` — reads the encounter id from the current node (stored during map traversal). Loads the encounter from the table. Logs "Entering event: [id]".
- `onExit(ctx)` — no-op.
- `getView(ctx)` — returns `<EventNodeView encounter={loaded} onChoice={handleChoice} />`

**handleChoice(choiceId) logic:**
1. Find the choice in the encounter.
2. `console.log(choice.outcomeLog)`.
3. `ctx.dispatch.setLastNodeResult("eventResolved")`.
4. `ctx.switchTo("map")`.

### EventNodeView.js (view)

Pure presentational modal.

**Props:**
- `encounter` — the loaded encounter object
- `onChoice` — callback with choice id

**Renders:**
- Dimmed background overlay
- Centered panel with `encounter.title` and `encounter.body`
- Two buttons, one per choice in `encounter.choices`
- No close button (must pick a choice)

---

## 11. App.js Integration

### Before

App.js currently handles adventure mode via 5 render branches spanning ~50 lines:

```
if (adventureMode === "transition") { ... }
if (adventureMode === "battle_mounting") { ... }
if (adventureMode === "battle") { ... }
if (adventureMode === "transition_out") { ... }
if (adventureMode === "exiting") { ... }
```

Plus the `adventureMode` useState declaration and the `onEnterAdventure` callback inline in the menu render that sets `setAdventureMode("transition")`.

### After

All 5 render branches removed. Replaced with:

```
var [adventureActive, setAdventureActive] = useState(false);

// ... later in render ...

if (adventureActive) {
    return (
        <AdventureGameMode
            sfx={sfx}
            handedness={handedness}
            onExit={function() { setAdventureActive(false); setScreen("menu"); }}
        />
    );
}
```

And the menu's `onEnterAdventure` callback becomes:

```
onEnterAdventure={function() { setAdventureActive(true); }}
```

### Net change to App.js

- **Removed:** ~50 lines of adventure render branches, `adventureMode` state, old `setAdventureMode` call in menu
- **Added:** ~8 lines — new state, new render branch, new callback
- **Net reduction:** ~42 lines

### What stays untouched

- `AdventureButton.js` — unchanged. Still uses `onEnterAdventure` callback.
- `AdventureGate` (code unlock flow) — unchanged.
- `BattleView`, `BattleTransition` — unchanged. AdventureGameMode composes them through battleSubMode.
- `battleConstants.js` (TEST_PARTY, TEST_WAVES) — unchanged. Read by adventureBattleConfig.

---

## 12. Data Flow Diagram

```
                       ┌─────────────┐
                       │   App.js    │
                       └──────┬──────┘
                              │ (adventureActive === true)
                              ▼
                  ┌─────────────────────┐
                  │ AdventureGameMode   │
                  │  - useAdventureGameState
                  │  - sub-mode registry
                  │  - builds ctx        │
                  │  - calls activeSubMode.getView(ctx)
                  └──────────┬──────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
   ┌───────────┐       ┌───────────┐       ┌───────────┐
   │ campaign  │       │   map     │       │  battle   │       ┌──────────┐
   │ subMode   │       │ subMode   │       │ subMode   │       │  event   │
   └─────┬─────┘       └─────┬─────┘       └─────┬─────┘       │ subMode  │
         │                   │                   │              └────┬─────┘
         ▼                   ▼                   ▼                   ▼
   CampaignMap           NodeMapView        BattleView           EventNode
      View                                 + BattleTrans.           View
         │                   │                   │                   │
         │                   │                   │                   │
         └───────────────────┴───────────────────┴───────────────────┘
                             │
                             ▼
                    ctx.switchTo("...")
                             │
                             ▼
                    (state change)
                             │
                             ▼
              AdventureGameMode re-renders
                             │
                             ▼
                 New sub-mode's getView called
```

### State flow example: clicking Junkyard

1. Player clicks Junkyard hotspot in `CampaignMapView`
2. View calls `onSelectLocation("junkyard")`
3. `campaignSubMode`'s handler runs:
    - `ctx.dispatch.setCurrentLocation("junkyard")`
    - `ctx.dispatch.setRunActive(true)`
    - `ctx.switchTo("map")`
4. `setCurrentSubMode("map")` updates `useAdventureGameState`
5. `AdventureGameMode` re-renders
6. useEffect detects id change → calls `campaignSubMode.onExit(ctx)` then `mapSubMode.onEnter(ctx)`
7. `mapSubMode.onEnter` loads junkyard node map, sets current node to `j1`
8. Render phase: `registry["map"].getView(ctx)` → returns `<NodeMapView .../>`
9. Player sees the Junkyard node map

---

## 13. Execution Plan (Named Blocks)

Detailed for a future session. Each block is atomic and can be verified independently.

### Block A — Shared State Hook (LOW risk)

**Files created (1):**
- `src/adventure/hooks/useAdventureGameState.js`

**Contents:** React hook with state shape from Section 5. Exports stable API functions.

**Verification:** File compiles, no imports broken.

### Block B — Campaign Sub-Mode (LOW risk)

**Files created (3):**
- `src/adventure/campaign/config/campaignMapData.js`
- `src/adventure/campaign/gameplay/campaignSubMode.js`
- `src/adventure/campaign/view/CampaignMapView.js`

**Verification:** Files compile. Sub-mode exports match contract.

### Block C — Map Sub-Mode (LOW risk)

**Files created (3):**
- `src/adventure/map/config/junkyardNodeMap.js`
- `src/adventure/map/gameplay/mapSubMode.js`
- `src/adventure/map/view/NodeMapView.js`

**Verification:** Node graph is valid (all connectsTo reference real ids). Sub-mode matches contract.

### Block D — Event Sub-Mode (LOW risk)

**Files created (3):**
- `src/adventure/event/config/eventEncounters.js`
- `src/adventure/event/gameplay/eventSubMode.js`
- `src/adventure/event/view/EventNodeView.js`

**Verification:** Encounter table is valid. Sub-mode matches contract.

### Block E — Battle Sub-Mode (MEDIUM risk)

**Files created (2):**
- `src/adventure/battle/config/adventureBattleConfig.js`
- `src/adventure/battle/gameplay/battleSubMode.js`

**Risk:** MEDIUM because it imports `BattleView`, `BattleTransition`, `TEST_PARTY`, `TEST_WAVES` from existing paths. Path typos would break compile.

**Verification:** All imports resolve. Internal phase component renders correctly in isolation test.

### Block F — AdventureGameMode Top-Level (MEDIUM risk)

**Files created (1):**
- `src/adventure/AdventureGameMode.js`

**Risk:** MEDIUM because this wires together all sub-modes and the state hook. One wrong import breaks the whole adventure flow.

**Verification:** All sub-mode imports resolve. Registry contains all 4 entries. ctx object has all expected fields. useEffect for lifecycle hooks fires correctly.

### Block G — App.js Integration (MEDIUM risk)

**Files modified (1):**
- `src/App.js`

**Edits (3 str_replace operations):**
1. Replace `var [adventureMode, setAdventureMode] = useState(null);` with `var [adventureActive, setAdventureActive] = useState(false);`
2. Replace the 5 contiguous `if (adventureMode === "...")` render blocks with one early return for `<AdventureGameMode .../>`
3. Update the menu render's `onEnterAdventure` callback from `setAdventureMode("transition")` to `setAdventureActive(true)`

**Risk:** MEDIUM because it touches App.js. Deletion is contiguous but the diff is visible and needs review before committing.

**Verification:** App.js compiles. Menu button triggers new flow. Old back-alley battle test no longer accessible (expected — it's being replaced).

### Recommended split across sessions

| Session | Blocks | Deliverable |
|---|---|---|
| **Session 1** | A, B, C, D, E | All sub-modes + state hook as isolated files. Nothing wired yet. Game still runs unchanged. |
| **Session 2** | F, G | AdventureGameMode wiring + App.js integration. New flow goes live. Old flow deleted. |

**Why split:** If Session 1 has a bug, the old game still works. If Session 2 has a bug, we only debug wiring — gameplay content is already verified. Also keeps each session well under tool budget.

### Total file count

- **New files:** 13
- **Modified files:** 1 (App.js)
- **Total tool calls estimated:** ~18 (13 create_file + 3 str_replace + 2 verification grep)

---

## 14. Deferred to V2+

These are intentionally excluded from V1. They belong to later passes:

| Feature | Why deferred |
|---|---|
| Goblin Mines + Haunted Armory locations | V1 proves the structure with one location. Adding more is a data task, not an architecture task. |
| Forge sub-mode (field anvil) | Needs forge QTE integration. Separate feature. |
| HP / stamina carrying between nodes | Adds state complexity. V1 is nav-only. |
| Loot drops + inventory | Needs equipment system. Out of V1 scope. |
| Decrees / quest integration | Decrees are already speced. V1 doesn't need them to prove the loop. |
| Procedural map generation | Hand-authored is enough for V1. Procedural is a separate system. |
| Multiple event encounters | One hardcoded encounter proves the system. Table expansion is cheap later. |
| Event outcomes that affect state | V1 logs only. Real outcomes need shared state additions. |
| Flee / retreat mechanics | V1 has no defeat state. |
| Extraction stakes / weapon loss | Depends on equipment system. |
| Transition polish between sub-modes | V1 uses existing BattleTransition for battles. Other transitions are instant for now. |
| Smith rank gating for locations | One location, one path. Gating is irrelevant in V1. |

---

## 15. Key Code Block Names (Reference)

For future sessions, we can reference these names without re-explaining:

| Name | Refers to |
|---|---|
| `AGM-CONTEXT` | The ctx object built in AdventureGameMode and passed to every sub-mode method |
| `AGM-REGISTRY` | The sub-mode registry object in AdventureGameMode (`{ campaign, map, battle, event }`) |
| `AGM-LIFECYCLE` | The useEffect that fires onEnter/onExit when currentSubModeId changes |
| `AGM-SWITCHER` | The switchTo function closure inside AdventureGameMode |
| `SM-CONTRACT` | The strict sub-mode shape: id, onEnter, onExit, getView |
| `CAMPAIGN-HOTSPOT` | The Junkyard hotspot button in CampaignMapView |
| `CAMPAIGN-SELECT` | The handleSelectLocation logic in campaignSubMode |
| `MAP-GRAPH` | The junkyardNodeMap.js data structure |
| `MAP-TRAVERSAL` | The handleNodeClick logic in mapSubMode |
| `MAP-RESULT` | The logic in mapSubMode's onEnter that reads lastNodeResult |
| `BATTLE-WRAPPER` | The internal phased component inside battleSubMode that manages transitionIn → battle → transitionOut |
| `BATTLE-CONFIG` | The buildBattleConfig function in adventureBattleConfig.js |
| `EVENT-TABLE` | The EVENT_ENCOUNTERS array in eventEncounters.js |
| `EVENT-CHOICE` | The handleChoice logic in eventSubMode |
| `APP-INTEGRATION` | The App.js early return for AdventureGameMode |

---

## Notes for future sessions

- **Session starter checklist:** Before executing, re-read this doc + `Adventuremodespec.md` + `Architecture.md` for context.
- **Contract compliance:** Every sub-mode must export all four contract fields, even if onEnter/onExit are no-ops.
- **No reaching across sub-modes:** Sub-modes communicate only through shared state (useAdventureGameState) and ctx.switchTo. Never import one sub-mode into another.
- **Keep battleSubMode and BattleView separate concerns:** The sub-mode is a wrapper. BattleView is a black box. If you're tempted to modify BattleView to fit adventure needs, stop and flag it.
- **When adding a new sub-mode later:** Copy an existing sub-mode folder, rename everything, fill in the contract, register it in AdventureGameMode's registry. No other changes needed.