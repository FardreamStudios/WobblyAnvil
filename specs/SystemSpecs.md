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

**Files:** `src/config/fxCueRegistry.js`, `src/hooks/useFXCues.js`  
**Status:** ✅ Stable — Add new cues as needed

**What it does:** UE Gameplay Cue pattern. The registry is an array of `{ tag, execute }` objects. `useFXCues` subscribes to every tag on mount and routes payloads to the matching cue's `execute` function.

**Why we need it:** Separates "what happened" from "how it sounds/looks." The forge emits `FX_SHATTER` — it doesn't know or care that this plays a shatter SFX. Presentation is owned entirely by cues.

**When it's used:** Always active. Fires on every gameplay event that has a presentation component (SFX, particles, screen effects).

**UE Analogy:** Gameplay Cue Manager + individual GameplayCue actors.

**Growth rule:** If fxCueRegistry.js exceeds 500 lines, split into domain files (forgeCues.js, economyCues.js) and re-export.

---

## SPEC: Constants

**File:** `src/modules/constants.js`  
**Status:** ✅ Stable — Single source of truth for all game data

**What it does:** Every game tuning value, data table, and named constant. Weapons, materials, tiers, upgrade costs, QTE parameters, balance values, customer types, smith ranks, etc. Zero logic, zero side effects.

**Why we need it:** If a designer wants to tweak dagger damage or bronze price, there's exactly one place to look. No hunting through logic files for hardcoded numbers.

**When it's used:** Imported by almost every file.

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

## SPEC: Events (Legacy)

**File:** `src/modules/events.js`  
**Status:** ⚠️ SCHEDULED FOR REPLACEMENT — See DES-1 spec

**What it does:** Defines the EVENTS array (all daily event types with weighted variants), `rollDailyEvent()` roller, and `generateRoyalQuest()` generator.

**Why it exists:** Original event system — picks a random morning event and applies its effect. Works but tightly couples event selection with effect execution.

**What's replacing it:** DES-1 Ability System. Individual ability files replace the EVENTS array. Bus-reactive activation replaces the morning roller. `generateRoyalQuest` will be preserved — moved to `src/logic/`.

**When it's used:** Called once per day by `useDayVM.buildDayQueue`.

---

## SPEC: Dynamic Events (Legacy)

**File:** `src/logic/dynamicEvents.js`  
**Status:** ⚠️ SCHEDULED FOR REPLACEMENT — See DES-1 spec

**What it does:** Three functions: `mysteryGood` (divine visitor VFX + rewards), `mysteryBad` (shadow attack VFX + damage), `applyEventResult` (translates event snapshot objects into bus emissions).

**Why it exists:** Bridge between old snapshot-based events and the new bus. Mystery events speak bus-native. Regular events still return snapshots that `applyEventResult` translates.

**What's replacing it:** DES-1 Ability System. Mystery events become individual ability files. `applyEventResult` eliminated — each ability emits its own tags directly.

---

## SPEC: Audio System

**File:** `src/modules/audio.js`  
**Status:** ✅ Functional — Needs review

**What it does:** Web Audio API synthesizer. Generates all SFX procedurally (no audio files). Also plays procedural background music with two modes (idle melody, forge rhythm). Exposes `useAudio()` hook that returns the API object.

**API:** `sfx.click()`, `sfx.hammer(quality)`, `sfx.coin()`, `sfx.shatter()`, `sfx.setSfxVol(v)`, `sfx.setMusicVol(v)`, etc.

**Why we need it:** Zero external audio assets. Everything is generated at runtime — keeps the build tiny and the game self-contained.

**When it's used:** Called by FX cues (via bus), directly by some UI interactions (button clicks), and music modes triggered by phase changes.

**Review note:** Music mode switching is currently triggered from App.js. Should eventually be driven by bus tags when GameMode takes over phase management.

---

## SPEC: App.js (Wiring Layer)

**File:** `src/App.js`  
**Status:** ⚠️ TOO LARGE — ~697 lines, target is <100 after GameMode extraction

**What it does:** Currently the game brain. Instantiates all state hooks, all VM hooks, wires dependencies between them, owns customer spawning, time advancement, toast management, and renders the layout (mobile or desktop).

**Why it's a problem:** It does too many jobs. Orchestration logic, toast plumbing, customer spawning, and view selection are all tangled together. The file should be pure wiring — instantiate systems, connect them, render.

**What's replacing the bulk:** DES-1 GameMode takes over orchestration (day cycle, customer spawning, phase management). App.js shrinks to ~30-40 lines of hook instantiation + layout rendering.

---

## SPEC: State Hooks (Model Layer)

**Files:**
- `src/hooks/useEconomyState.js` — gold, inventory, finished weapons, market modifiers
- `src/hooks/useDayState.js` — day counter, hour, stamina, exhaustion, game over
- `src/hooks/usePlayerState.js` — reputation, level, XP, stats, upgrades, blueprints
- `src/hooks/useForgeState.js` — WIP weapon, phase, quality, stress, session data, QTE state
- `src/hooks/useQuestState.js` — royal quest, active customer, morning event, promote uses
- `src/hooks/useMysteryState.js` — pending mystery, FX refs, good event tracking
- `src/hooks/useUIState.js` — screen, modals, toasts, handedness, volume

**Status:** ✅ Stable (except useMysteryState — scheduled for removal in DES-1)

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
**Status:** ✅ Stable

**What it does:** QTE-specific UI components — the QTEPanel (oscillating bar, hit zones, strike pips, flash feedback).

**Why it's separate from uiComponents:** QTE components are forge-specific, not reusable base widgets. They know about heat tiers, hammer zones, and quench timing.

**When it's used:** Rendered inside forge view when QTE phases are active.

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
**Status:** ✅ Stable — Standalone module

**What it does:** Self-contained rhythm-based QTE minigame. Has its own timing system, hit detection, scoring, and visual feedback. Currently accessible from the debug menu as a test mode.

**Why it's separate:** It's a complete sub-system that could become a forge sub-mode or a separate activity mode. Keeping it isolated means it's ready to plug in when needed.

**Future:** Likely becomes a forge sub-mode under GameMode, or a standalone activity mode.

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

## SPEC: GameMode (Planned — DES-1)

**Files (planned):** `src/gameMode/gameMode.js`, `src/gameMode/useGameMode.js`, `src/gameMode/forgeMode.js`, `src/gameMode/shopMode.js`, `src/gameMode/idleMode.js`  
**Status:** 🔵 PLANNED — Full spec in `architecture/DES-1_GameMode_AbilitySystem.md`

**What it does:** Owns the macro game loop — day lifecycle (wake → morning → open → late → sleep → next day), sub-mode switching (forge, shop, future activities), win/loss conditions, and game-level bus emissions. Pure JS core with a thin React hook wrapper.

**Why we need it:** App.js currently owns ~200 lines of orchestration logic (day cycling, customer spawning, phase management, sleep sequence). This is game *rules*, not wiring — it belongs in a dedicated system. GameMode also enables adding new activity modes (fishing, trading) without touching core wiring.

**When it's used:** Always active. It's the top-level game loop that everything else runs inside.

**Architecture:** Pure JS core (`gameMode.js`) = C++ UGameMode. React hook wrapper (`useGameMode.js`) = Blueprint that bridges to rendering. Sub-modes implement a standard contract: `canEnter`, `onEnter`, `onExit`, `getPhase`, `getView`.

**UE Analogy:** AGameMode (C++ base) + Blueprint GameMode + GameState.

**Replaces:** Day cycle logic in useDayVM, orchestration in App.js, implicit phase management.

---

## SPEC: Ability Manager (Planned — DES-1)

**Files (planned):** `src/abilities/abilityManager.js`, `src/abilities/index.js`, `src/abilities/morning/*.js`, `src/abilities/reactive/*.js`  
**Status:** 🔵 PLANNED — Full spec in `architecture/DES-1_GameMode_AbilitySystem.md`

**What it does:** Reactive gameplay ability system. Abilities are self-contained definitions (one per file) that watch the bus for triggers, self-activate when conditions are met, run behavior (emit bus tags, register modifiers), and self-terminate when end conditions are met or scope expires.

**Why we need it:** The current event system (events.js) is a monolithic roller that couples "pick an event" with "do the event." Abilities decouple these — any system can trigger an ability, and abilities affect game state through the bus without knowing who's listening. This also enables persistent effects ("cursed forge until you sell a weapon") and reactive gameplay ("3 good forges in a row triggers a buff").

**When it's used:** Always active. The manager watches the bus from game start. Abilities activate and deactivate throughout gameplay based on triggers from any system (day cycle, forge, economy, player actions).

**Key features:**
- Lifecycle: Registered → Watching → Active → Ending → Dead
- Modifier system: abilities declare operations (add, multiply, override, set_min, set_max) on game attributes. Resolution order: override → multiply → add → clamp.
- Scoping: "day" (auto-end at day end), "permanent" (persists across days), "manual" (explicit end or endWhen condition).
- Diagnostics: warning log at 10+ active abilities.

**Architecture:** Each ability is a single JS file exporting a definition object. `index.js` collects all definitions for bulk registration. Adding a new ability = one file + one import line.

**UE Analogy:** Gameplay Ability System (GAS) — Abilities + Gameplay Effects + Modifier system.

**Replaces:** events.js (EVENTS array, rollDailyEvent), dynamicEvents.js (mysteryGood, mysteryBad, applyEventResult), useMysteryState.js.

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

*End of architecture audit. Systems marked ⚠️ have active replacement plans in DES-1. Systems marked 🔵 are planned builds.*