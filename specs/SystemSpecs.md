# Wobbly Anvil — Architecture Specs

Each spec below covers one system or module. Format: what it does, why we need it, when it's used, current status.

---

## SPEC: GameplayEventBus

**File:** `src/logic/gameplayEventBus.js`  
**Status:** ✅ Stable — No changes planned

**What it does:** Singleton pub/sub message bus. Systems emit tagged events, other systems subscribe and react. Synchronous broadcast — all listeners fire immediately on emit.

**API:** `on(tag, handler)`, `off(tag, handler)`, `emit(tag, payload)`, `reset()`

**Why we need it:** Decouples systems. The forge doesn't need to know about the audio system — it emits `FX_HAMMER_HIT` and whoever's listening handles it. Keeps dependencies one-directional.

**When it's used:** Every frame of gameplay. Every system either emits or subscribes (most do both). It's the nervous system of the whole game.

**UE Analogy:** Gameplay Message Subsystem.

---

## SPEC: Event Tags

**File:** `src/config/eventTags.js`  
**Status:** ✅ Stable — Grows as new systems are added

**What it does:** Named string constants for every bus tag. Single source of truth — no magic strings anywhere in the codebase.

**Format:** `event.<system>.<verb>.<target>` (e.g., `ECONOMY_EARN_GOLD`, `FX_HAMMER_HIT`)

**Why we need it:** Without this, a typo in a tag string silently breaks a subscription with no error. Named constants catch that at import time.

**When it's used:** Imported by every file that touches the bus.

---

## SPEC: FX Cue System

**File:** `src/systems/fxCue/fxCueSubSystem.js`  
**Status:** ✅ Stable — Add new cues as needed

**What it does:** UE Gameplay Cue pattern. Pure JS singleton with init/destroy lifecycle. Contains an array of `{ tag, execute }` cue objects. On init, subscribes to every cue's bus tag and routes payloads to the matching cue's `execute` function. Cue functions receive sfx, fxRef, payload, and sceneFxRef.

**Why we need it:** Separates "what happened" from "how it sounds/looks." The forge emits `FX_SHATTER` — it doesn't know or care that this plays a shatter SFX. Presentation is owned entirely by cues.

**When it's used:** Always active. Fires on every gameplay event that has a presentation component (SFX, particles, screen effects).

**UE Analogy:** Gameplay Cue Manager + individual GameplayCue actors.

**Growth rule:** If the cues array exceeds 500 lines, split into domain files (forgeCues.js, economyCues.js) and import into the subsystem.

---

## SPEC: Constants

**File:** `src/modules/constants.js`  
**Status:** ✅ Stable — Single source of truth for all game data

**What it does:** Every game tuning value, data table, and named constant. Weapons, materials, tiers, upgrade costs, balance values, customer types, smith ranks, etc. Zero logic, zero side effects.

**Why we need it:** If a designer wants to tweak dagger damage or bronze price, there's exactly one place to look. No hunting through logic files for hardcoded numbers.

**When it's used:** Imported by almost every file.

**Upcoming:** QTE-specific data (tier tables, color ramp, QTE layout values, speed tuning) will be extracted to `qteConstants.js` (DES-2). constants.js will re-export through GameConstants for backward compatibility.

**UE Analogy:** Data Tables + Project Settings.

---

## SPEC: Theme

**File:** `src/config/theme.js`  
**Status:** ✅ Stable

**What it does:** All visual tokens — colors, fonts, sizes, spacing, border radii, breakpoints. Zero logic, zero React. Pure data object.

**Why we need it:** No magic color hex codes or font sizes scattered through components. Change `THEME.colors.gold` once and it updates everywhere.

**When it's used:** Imported by every view and UI component.

**UE Analogy:** UMG Style asset / UI Theme.

---

## SPEC: Utilities

**File:** `src/modules/utilities.js`  
**Status:** ✅ Stable

**What it does:** Pure helper functions — math (rand, randInt, clamp), quality calculations (getQualityTier, qualityValue), QTE math (calcHeatResult, calcHammerResult), formatting (formatTime), smith rank lookup. No React, no state, no side effects.

**Why we need it:** Reusable math and formatting shared across logic files, hooks, and components. Portable — could drop into any JS project.

**When it's used:** Imported by logic files, VM hooks, and some view components.

**UE Analogy:** Blueprint Function Library.

---

## SPEC: Events (Legacy) — REPLACED

**File:** `src/modules/events.js`  
**Status:** ❌ REPLACED by DES-1 Ability System (M-1 thru M-10 complete)

**What it did:** Defined the EVENTS array (all daily event types with weighted variants), `rollDailyEvent()` roller, and `generateRoyalQuest()` generator.

**Replaced by:** Individual ability files in `src/systems/ability/morning/`. Morning roll now handled by `AbilityManager.rollMorning()`. `generateRoyalQuest` preserved in `src/logic/`.

**Action:** Delete from disk if still present.

---

## SPEC: Dynamic Events (Legacy) — REPLACED

**File:** `src/logic/dynamicEvents.js`  
**Status:** ❌ REPLACED by DES-1 Ability System (M-1 thru M-10 complete)

**What it did:** Three functions: `mysteryGood` (divine visitor VFX + rewards), `mysteryBad` (shadow attack VFX + damage), `applyEventResult` (translates event snapshot objects into bus emissions).

**Replaced by:** `src/systems/ability/morning/mysteryVisitorAbility.js` and `src/systems/ability/morning/mysteryShadowAbility.js`. Each ability emits its own tags directly — no translation layer needed.

**Action:** Delete from disk if still present.

---

## SPEC: Audio System

**File:** `src/modules/audio.js`  
**Status:** ✅ Functional — Needs review

**What it does:** Web Audio API synthesizer. Generates all SFX procedurally (no audio files). Also plays procedural background music with two modes (idle melody, forge rhythm). Exposes `useAudio()` hook that returns the API object.

**API:** `sfx.click()`, `sfx.hammer(quality)`, `sfx.coin()`, `sfx.shatter()`, `sfx.setSfxVol(v)`, `sfx.setMusicVol(v)`, etc.

**Why we need it:** Zero external audio assets. Everything is generated at runtime — keeps the build tiny and the game self-contained.

**When it's used:** Called by FX cues (via bus), directly by some UI interactions (button clicks), and music modes triggered by phase changes.

**Review note:** Music mode switching is currently triggered from App.js. Should be driven by bus tags now that GameMode owns phase management.

---

## SPEC: App.js (Wiring Layer)

**File:** `src/App.js`  
**Status:** ⚠️ PARTIALLY SHRUNK — GameMode, Ability System, CustomerSubSystem, GameplayAnalyticsSubSystem, FXCueSubSystem all wired in. Toast plumbing still inside.

**What it does:** Instantiates all state hooks, all VM hooks, wires dependencies, and renders the layout (mobile or desktop). All subsystems initialized here via useEffect with init/destroy lifecycle.

**Remaining extraction:** Toast queue management. After that, App.js should approach the target of ~100 lines of pure wiring.

**Target:** <100 lines — instantiate systems, connect them, render. Nothing else.

---

## SPEC: State Hooks (Model Layer)

**Files:**
- `src/hooks/useEconomyState.js` — gold, inventory, finished weapons, market modifiers
- `src/hooks/useDayState.js` — day counter, hour, stamina, exhaustion, game over
- `src/hooks/usePlayerState.js` — reputation, level, XP, stats, upgrades, blueprints
- `src/hooks/useForgeState.js` — WIP weapon, phase, quality, stress, session data, QTE state
- `src/hooks/useQuestState.js` — royal quest, active customer, morning event, promote uses
- `src/hooks/useUIState.js` — screen, modals, toasts, handedness, volume

**Status:** ✅ Stable

**Removed:** `useMysteryState.js` — replaced by ability instances managing their own state (DES-1 M-10). Delete from disk if still present.

**What they do:** Each hook owns one domain's raw state and mutations. Bus subscriptions for incoming events are wired in useEffect. Returns state + setters.

**Why we need them:** MVVM Model layer. Keeps state ownership clear — economy state never leaks into forge state. Each hook is the single source of truth for its domain.

**When they're used:** Instantiated once in App.js, passed to VM hooks.

**UE Analogy:** Game Instance Subsystems (EconomySubsystem, DaySubsystem, etc.).

---

## SPEC: ViewModel Hooks (ViewModel Layer)

**Files:**
- `src/hooks/useForgeVM.js` — QTE handlers, session flow, weapon finishing, derived forge values
- `src/hooks/useEconomyVM.js` — earn/spend gold, sell/refuse customer, bus subscriptions for economy events
- `src/hooks/usePlayerVM.js` — XP gain, rep change, stat allocation, level-up logic
- `src/hooks/useDayVM.js` — time advancement, day queue, sleep cycle, morning events
- `src/hooks/useShopVM.js` — buy materials, buy upgrades, buy blueprints, sell materials

**Status:** ✅ Stable (useDayVM scheduled for refactor when GameMode takes over)

**What they do:** Consume state hooks + cross-domain deps, transform raw state into action handlers and display-ready props. Views receive these — zero logic in the render tree.

**Why we need them:** MVVM ViewModel layer. A view never calls `setGold(gold - cost)` directly. It calls `shopVM.onBuy(mat, qty, price)` and the VM handles validation, SFX, bus emissions, and state mutations.

**When they're used:** Instantiated in App.js after state hooks, passed to views.

**UE Analogy:** HUD ViewModels / Player Controller.

---

## SPEC: Input Router

**File:** `src/hooks/useInputRouter.js`  
**Status:** ✅ Stable

**What it does:** Single source of truth for every button's disabled state. Consumes raw state (hour, stamina, stress, phase, active customer, etc.) and returns a flat object of named action gates: `{ disabled: bool, redirectToRest: bool }`.

**Why we need it:** Before this existed, disabled logic was scattered across 20+ inline ternaries in the render tree. Now every button reads `input.forge.disabled` and the logic lives in one place.

**When it's used:** Called once in App.js, result passed to views. Views read `input.<action>.disabled` for every interactive element.

**UE Analogy:** Input Mapping Context with activation conditions.

---

## SPEC: UI Components (Widget Library)

**File:** `src/modules/uiComponents.js`  
**Status:** ✅ Stable

**What it does:** Base widget components with sensible defaults from theme: Panel, Row, SectionLabel, InfoRow, Badge, Bar, Pips, ActionBtn, DangerBtn, Tooltip, Toast, GoldPop, ScaleWrapper.

**Why we need it:** Consistent visual language. No one-off styled divs. A Panel always looks like a Panel. An ActionBtn always has the right disabled styling.

**When it's used:** Imported by every view and panel component.

**UE Analogy:** Base UMG widget classes (UButton, UTextBlock, UBorder, etc.).

---

## SPEC: Forge Components

**File:** `src/modules/forgeComponents.js`  
**Status:** ⚠️ SCHEDULED FOR SPLIT — QTE System extraction (DES-2)

**What it does:** QTE-specific UI components — the QTEPanel (oscillating bar, hit zones, strike pips, flash feedback).

**Why it's separate from uiComponents:** QTE components are forge-specific, not reusable base widgets. They know about heat tiers, hammer zones, and quench timing.

**When it's used:** Rendered inside forge view when QTE phases are active.

**Upcoming:** Bar sweep visuals + needle animation will be extracted into `barSweepQTE.js` as a QTE plugin. forgeComponents.js will retain any forge-specific non-QTE UI (or be deleted if empty). See QTE System spec.

---

## SPEC: Game Panels

**File:** `src/modules/gamePanels.js`  
**Status:** ✅ Functional — Large file, may need splitting

**What it does:** Game-specific compound panels: StatPanel, ForgeInfoPanel, RepPanel, CustomerPanel, MaterialsModal, ShopModal, GameOverScreen. These are more than base widgets — they have light domain logic (formatting, conditional rendering based on game state).

**Why we need it:** Separates panel composition from layout. The layout files (mobile/desktop) import panels and position them — they don't own the panel internals.

**Review note:** This file is likely approaching the 500-line limit. May need splitting into individual panel files if it grows further.

---

## SPEC: Scene System

**File:** `src/modules/sceneSystem.js`  
**Status:** ✅ Stable

**What it does:** Data-driven scene renderer. Defines scenes (background, props, character) as config objects. `resolveSceneState` maps current game phase to character action, prop visibility, and scene selection. `SceneStage` component renders the result. Includes SpriteSheet animation, CanvasFXLayer, and prop positioning system.

**Why we need it:** Decouples visual scene from game logic. Game logic says "phase is HAMMER" — scene system knows that means the smith is hammering and the anvil prop is visible. Adding a new scene (shop interior, fishing dock) is config, not code.

**When it's used:** Always visible — the main game viewport.

**UE Analogy:** Level Blueprint + Sequencer for cinematics.

---

## SPEC: Layouts (Mobile + Desktop)

**Files:** `src/modules/mobileLayout.js`, `src/modules/desktopLayout.js`  
**Status:** ✅ Stable

**What they do:** Responsive view shells. Each receives all state and callbacks via props and renders the full game UI for its platform. Pure views — zero state ownership.

**Why we need both:** Mobile and desktop have fundamentally different layouts (stacked vs. multi-column). Sharing one layout with breakpoint hacks would be worse than having two clean files.

**When they're used:** App.js checks `useLayoutMode()` and renders one or the other.

**UE Analogy:** Platform-specific UMG layouts.

---

## SPEC: Game Layout

**File:** `src/modules/gameLayout.js`  
**Status:** ✅ Stable

**What it does:** Structural layout primitives: GameShell (scaling container), GameHeader, GameLeft, GameCenter, GameRight, GameFooter. Also owns `useLayoutMode()` hook (mobile vs desktop detection) and design dimensions.

**Why we need it:** Layout structure is shared between mobile and desktop even though the content differs. These primitives provide the responsive grid skeleton.

---

## SPEC: Screens

**File:** `src/modules/screens.js`  
**Status:** ✅ Stable

**What it does:** Non-gameplay full-screen views: SplashScreen and MainMenu. These are shown before the game loop starts.

**When it's used:** App.js renders these based on `ui.screen` state before switching to the game layout.

---

## SPEC: Rhythm QTE

**File:** `src/modules/rhythmQTE.js`  
**Status:** ⚠️ SCHEDULED FOR PLUGIN CONVERSION — QTE System (DES-2)

**What it does:** Self-contained rhythm-based QTE minigame. Has its own timing system, hit detection, scoring, and visual feedback. Currently accessible from the debug menu as a test mode.

**Why it's separate:** It's a complete sub-system that will become a QTE plugin under the new QTE System. Already has the right shape — self-contained component with its own input/output.

**Upcoming:** Will gain an `onComplete(result)` callback interface to conform to the QTE plugin contract. See QTE System spec.

---

## SPEC: QTE Constants

**File (planned):** `src/config/qteConstants.js`  
**Status:** 🔵 PLANNED — DES-2

**What it does:** Single source of truth for all QTE tuning data. Owns tier tables (HEAT_TIERS, HAMMER_TIERS, QUENCH_TIERS), shared color ramp (QTE_COLOR_RAMP), layout values (QTE_COLS, QTE_W, QTE_FLASH_MS), and QTE speed tuning (heat/hammer/quench speed base + range values currently in BALANCE).

**Why we need it:** QTE data is consumed by multiple independent plugins and the QTE Runner. It doesn't belong in the main constants file alongside weapons, materials, and economy data. Extracting it keeps constants.js focused on game-wide data and gives QTE plugins a clean import target.

**Backward compatibility:** constants.js re-exports qteConstants through GameConstants so existing consumers don't break. New QTE code imports from qteConstants directly.

**When it's used:** Imported by every QTE plugin, the QTE Runner, and any system that needs tier table references (forgeVM result handlers, FX cues).

**UE Analogy:** A dedicated Data Table asset for the QTE subsystem.

---

## SPEC: QTE System

**Files (planned):**
- `src/config/qteConstants.js` — tier tables, color ramp, layout values, speed tuning
- `src/components/QTERunner.js` — mounts the active QTE plugin, emits result tags
- `src/modules/barSweepQTE.js` — bar sweep plugin (extracted from forgeComponents.js)
- `src/modules/rhythmQTE.js` — rhythm plugin (existing, gains onComplete interface)

**Status:** 🔵 PLANNED — DES-2

**What it does:** Turns QTEs into black box transactions. A requester sends a config (which QTE type, which tier table, speed, modifiers). The system runs the interaction. A result tag comes back on the bus. The requester never knows how the QTE works visually. The QTE never knows what the result will be used for.

**Why we need it:** Today the bar sweep QTE is wired directly into forgeVM — refs, click routing, animation hooks, and scoring all live there. Adding a second QTE type (rhythm) means threading another code path through forgeVM. A third type makes it worse. The QTE System decouples the interaction from the consumer so new QTE types drop in without touching forge code.

**Architecture:**

**QTE Runner** — A single component that sits where QTEPanel currently lives in the layout. Receives the active QTE config. Mounts the correct plugin. When the plugin calls `onComplete(result)`, the Runner emits a `QTE_RESULT` tag on the bus with `{ phase, tier, position }`. When no QTE is active, renders nothing. This is the only new boundary crossing — it replaces the direct QTEPanel mount in layout files.

**QTE Plugins** — Each is a self-contained component that:
- Receives a config object (tier table, speed, modifiers, type-specific settings)
- Runs its own animation and interaction loop internally
- Calls `onComplete({ tier, position })` when the player acts
- Owns zero gameplay knowledge — doesn't know about quality, strikes, or stress

**Plugin contract:** Each plugin receives `{ config, onComplete }` as props. Config contains tierTable, speedMult, modifierScale, and type-specific settings. Plugin calls `onComplete({ tier, position })` when the player acts — tier is the full tier object from the table.

**Result handling** — Stays in useForgeVM. The handlers (`handleHeatFire`, `handleHammerFire`, `handleQuenchFire`) are forge gameplay logic, not QTE logic. They receive a tier result from the bus instead of computing it from a raw position. The `onForgeClick` routing, `qtePosRef`, and `qteProcessing` refs move into the bar sweep plugin.

**Bus flow:** ForgeVM sets phase → QTE Runner sees config → mounts plugin. Player interacts → plugin calls onComplete. QTE Runner emits QTE_RESULT with phase, tier, and position. ForgeVM listener catches QTE_RESULT → runs the phase-specific handler.

**What moves, what stays:**

| Thing | Today | After |
|-------|-------|-------|
| Needle animation + bar rendering | forgeComponents.js | barSweepQTE.js (plugin) |
| Rhythm QTE | rhythmQTE.js | Same file — gains onComplete interface |
| Click → tier lookup | useForgeVM | Moves into barSweepQTE plugin |
| Tier → gameplay effect | useForgeVM | Stays — listens for QTE_RESULT tag |
| `onForgeClick` routing | useForgeVM | Removed — each plugin handles its own input |
| `qtePosRef`, `qteProcessing` refs | useForgeVM | Move into barSweepQTE (internal state) |
| QTEPanel mount in layouts | App.js / desktopLayout.js | Replaced with QTERunner (same slot) |
| Tier tables + color ramp | constants.js | Extracted to qteConstants.js, re-exported through GameConstants |
| `calcQteResult` | utilities.js | Stays — barSweepQTE imports it |

**What this enables:**
- New QTE type: write a component, register it in the Runner, point a forge phase config at it. Done.
- Non-forge consumers: quests, shop haggling, or any system can request a QTE by emitting a start config and listening for QTE_RESULT. No forge coupling.
- Mix and match: heat could be bar sweep, hammer could be rhythm, quench could be something new. Each phase just declares its QTE type.

**What this does NOT change:**
- Forge gameplay logic (quality, strikes, stress, shatter) stays in forgeVM
- Scene system, FX cues, audio — all untouched
- Layout structure — QTERunner drops into the same slot QTEPanel occupies today

**UE Analogy:** An Ability System for minigames — each QTE type is a Gameplay Ability with its own montage/animation, and the system provides a common activation + result contract.

---

## SPEC: Dev Tools

**Files:** `src/dev/DevRouter.js`, `src/dev/DevZone.js`, `src/dev/HUDViewer.js`  
**Status:** ✅ Functional — Dev only

**What they do:** Development-only tools accessible at `/dev/*` routes. HUDViewer is an interactive reference for the mobile HUD layout — shows button positions, phase states, and layout zones. DevRouter handles routing between dev tools. DevZone provides shared dev UI components.

**Why we need them:** Visual reference for layout work. Not included in production builds.

---

## SPEC: DevBanner

**File:** `src/components/DevBanner.js`  
**Status:** ✅ Stable

**What it does:** Shows a small "DEV BUILD" banner on screen during development. Visual indicator that this is not a production build.

---

## SPEC: CSS Modules

**Files:** `src/index.css` + per-module CSS files  
**Status:** ✅ Stable

**What they do:** All styling lives in CSS files, not JS style objects. Animations (blink, shake, pulse), layout grids, responsive breakpoints, and base element styles.

**Why separate CSS:** Keeps JS files focused on logic and structure. CSS is easier to scan, override, and debug in browser devtools than inline style objects.

---

## SPEC: GameMode

**Files:** `src/gameMode/gameMode.js`, `src/gameMode/useGameMode.js`, `src/gameMode/forgeMode.js`  
**Status:** ✅ LIVE — DES-1 M-2, M-5, M-6, M-7 complete

**What it does:** Owns the macro game loop — day lifecycle (wake → morning → open → late → sleep → next day), sub-mode switching, win/loss conditions, and game-level bus emissions. Pure JS core with a thin React hook wrapper.

**Architecture:** Pure JS core (`gameMode.js`) = C++ UGameMode. React hook wrapper (`useGameMode.js`) = Blueprint that bridges to rendering. Sub-modes implement a standard contract: `canEnter`, `onEnter`, `onExit`, `getPhase`, `getView`.

**Currently registered sub-modes:** forgeMode. Shop and idle modes not yet extracted.

**What it replaced:** Day cycle logic from useDayVM, orchestration from App.js, implicit phase management.

**Remaining work:** Shop and idle sub-modes not yet extracted.

**UE Analogy:** AGameMode (C++ base) + Blueprint GameMode + GameState.

---

## SPEC: Ability Manager

**Files:** `src/systems/ability/abilitySubSystem.js`, `src/systems/ability/index.js`, `src/systems/ability/morning/*.js`, `src/systems/ability/reactive/*.js`  
**Status:** ✅ LIVE — DES-1 M-1, M-3, M-4, M-8, M-9 complete

**What it does:** Reactive gameplay ability system. Abilities are self-contained definitions (one per file) that watch the bus for triggers, self-activate when conditions are met, run behavior (emit bus tags, register modifiers), and self-terminate when end conditions are met or scope expires.

**Morning abilities live:** See `morningEventsTable.js` for full list (13+ data-driven events including festival, merchant_visit, blessing_of_flame, tax_collector, traveling_smith, royal_inspection, cursed_forge, fire, flood, rat_infestation, backpain, mom, slow_morning). Complex morning abilities: mysteryVisitor, mysteryShadow. Morning roll handled by `AbilityManager.rollMorning()`.

**Reactive abilities live:** hotStreak, shameDebuff, royalAttention, momentum, overworked.

**Key features:**
- Lifecycle: Registered → Watching → Active → Ending → Dead
- Modifier system: abilities declare operations (add, multiply, override, set_min, set_max) on game attributes. Resolution order: override → multiply → add → clamp.
- Scoping: "day" (auto-end at day end), "permanent" (persists across days), "manual" (explicit end or endWhen condition).
- Toast buffer: Morning abilities queue toasts via `queueToast()`, flushed by `useDayVM.buildDayQueue`.
- Diagnostics: warning log at 10+ active abilities.

**Modifier attributes currently wired (non-exhaustive):** `heatPerfectZone`, `materialPrice`, `customerChance`, `repGain`, `maxStamina`. See individual ability files and `morningEventsTable.js` for full modifier declarations.

**Architecture:** Each ability is a single JS file exporting a definition object. `index.js` collects all definitions for bulk registration. Adding a new ability = one file + one import line.

**UE Analogy:** Gameplay Ability System (GAS) — Abilities + Gameplay Effects + Modifier system.

**Replaced:** events.js (EVENTS array, rollDailyEvent), dynamicEvents.js (mysteryGood, mysteryBad, applyEventResult), useMysteryState.js.

---

## SPEC: Persistence & Leaderboard (Planned — DES-1)

**Files (planned):** Save/load utility (TBD), `public/data/leaderboard.json`  
**Status:** 🔵 PLANNED — Spec in `architecture/DES-1_GameMode_AbilitySystem.md` Section 7

**What it does:** Two separate features:
1. **localStorage settings** — saves SFX/music volume, mute toggles, user preferences between sessions. Read on load, write on change.
2. **Static leaderboard** — manually curated JSON file in the repo. Game over screen has a "Copy Score" button that serializes run stats + checksum to clipboard as base64. Director verifies and adds to leaderboard.json. Game fetches and displays on load.

**Why we need it:** Settings persistence is basic UX — nobody wants to re-adjust volume every session. Leaderboard gives testers visibility and motivation during dev.

**Anti-cheat:** Lightweight checksum (stats + build salt). Casual deterrent — stops hand-editing the base64 string. Not bulletproof against source-reading, which is fine for dev/test.

**Future:** Full game state save/load (gold, inventory, day, active abilities) designed into the system but built later.

---

## SPEC: Gameplay Analytics SubSystem

**Files:** `src/systems/analytics/gameplayAnalyticsSubSystem.js`, `src/config/analyticsConfig.js`  
**Status:** ✅ LIVE

**What it does:** Config-driven run statistics tracker. Pure JS singleton. Takes a table of stat definitions at init — each defines a bus tag to listen to, an accumulation mode (count, sum, max), and an optional payload field. The subsystem subscribes, accumulates, freezes on game over, and resets on new game. `getStats()` returns a snapshot.

**Why we need it:** The leaderboard and game over screen need run stats. Keeping the tracker generic means adding a new stat is one line in the config table — no subsystem code changes.

**Config:** `analyticsConfig.js` defines resetTag, freezeTag, and the stats array. All game-specific knowledge lives there.

**Consumer:** `useLeaderboard.js` reads `getStats()` for the score payload. `gamePanels.js` displays stats on the game over screen (received as props from App.js).

**UE Analogy:** Analytics subsystem driven by a data table.

---

## SPEC: Customer SubSystem

**File:** `src/systems/customer/customerSubSystem.js`  
**Status:** ✅ LIVE — DES-1.1

**What it does:** Pure JS singleton that owns the full customer lifecycle — spawn decisions, active customer tracking, daily visit caps, and cleanup. Communicates exclusively through the bus. Zero React.

**Why we need it:** Customer spawning was previously scattered across App.js with no single owner, causing the orphaned `activeCustomer` lockup bug. CustomerSubSystem centralizes the lifecycle.

**Communication:** Listens to DAY_ADVANCE_HOUR, DAY_CYCLE_START, DAY_CYCLE_END, ECONOMY_WEAPON_SOLD, CUSTOMER_REFUSE, CUSTOMER_WALKOUT, CUSTOMER_PROMOTE, GAME_SESSION_NEW. Emits CUSTOMER_SPAWN, CUSTOMER_CLEAR, FX_DOORBELL.

**Spawn guards:** Hour range (9–21), no active customer, visits < daily max, phase is IDLE or SESS_RESULT, random roll against `resolveValue("customerChance", 0.42)`.

**UE Analogy:** A subsystem dedicated to NPC spawning — listens to GameMode's phase broadcasts.

---

*End of architecture specs. Systems marked ❌ have been replaced (delete from disk if still present). For gameplay and UX feature specs (Fairy Helper, How to Play, etc.), see `FeatureSpecs.md`.*