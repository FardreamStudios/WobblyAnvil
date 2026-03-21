# Wobbly Anvil — Architecture Guide

## Philosophy

Build this like a portable UE project. Every piece of code should answer one question: **"Is this reusable tech, or bespoke logic for this feature?"**

- **Reusable tech** → goes in a shared file (hook, utility, widget, config). Named generically. Imported wherever needed.
- **Bespoke logic** → lives in the feature file that owns it. Named specifically. Not extracted until a second consumer exists.

We don't fight React — we work *with* it. No over-abstraction, no premature optimization. But when something clearly wants to be its own module (used twice, configurable, or domain-independent), we split it out immediately. Think of it like UE plugins and function libraries: decoupled, portable, composable.

---

## Pattern: MVVM (Model → ViewModel → View)

| Layer | UE Analogy | React Implementation | Owns |
|-------|-----------|----------------------|------|
| **Model** | Game Instance / Subsystems | Custom hooks per domain (`useForgeState`, `useEconomyState`, `useDayState`, `useQuestState`) | Raw state + mutations |
| **ViewModel** | Player Controller / HUD ViewModel | Derived hooks (`useForgeVM`, `useShopVM`) | Transforms raw state → display-ready props |
| **View** | UMG Widgets | Pure components — receive props, zero logic | Rendering only |
| **Input** | Input Mapping Context | `useInputRouter` hook | All can-do / disabled checks, single source of truth |
| **Wiring** | Game Mode | `App.js` (~50 lines) | Connects layers, nothing else |

---

## File Structure

```
src/
├── hooks/          # State hooks, VM hooks, input router
├── components/     # Widgets, views, layouts
├── logic/          # Pure functions — no React, no state
├── config/         # Game data tables, theme, constants
└── App.js          # Thin wiring only
```

### hooks/ — "Subsystems & Controllers"
- **State hooks** (`useForgeState.js`, `useEconomyState.js`, etc.) — own domain state and mutations. Like UE subsystems.
- **VM hooks** (`useForgeVM.js`, `useShopVM.js`) — consume state hooks, output display-ready props. Like HUD ViewModels.
- **`useInputRouter.js`** — single source of truth for what the player can/can't do right now. Every button's disabled state traces back here.

### components/ — "UMG Widgets & Screens"
- **`widgets.js`** — base components (Box, Label, Strip, Btn) with sensible defaults from theme. Like UE's base UMG widget classes.
- **Views** (`forgeView.js`, `shopView.js`) — compose widgets into screens. Pure — props in, JSX out.
- **Layouts** (`mobileLayout.js`, `desktopLayout.js`) — responsive shells.
- CSS lives in separate `.css` files per module. No style objects in JS.

### logic/ — "Function Libraries"
- **`forgeLogic.js`** — crafting calculations, QTE resolution, quality rolls.
- **`economyLogic.js`** — pricing, buy/sell math, reputation effects.
- **`eventLogic.js`** — random events, quest generation, day transitions.
- All **pure functions**. No React imports, no hooks, no side effects. Portable and testable — could drop into any JS project.

### config/ — "Data Tables & Project Settings"
- **`constants.js`** — game data in array-of-objects tables. Single source of truth for items, recipes, costs, thresholds.
- **`theme.js`** — all colors, sizes, fonts, spacing, layout breakpoints. No magic numbers anywhere else.

---

## Widget System — "UMG Inheritance"

Base widgets define sensible defaults pulled from `theme.js`. Props override defaults.

```
Box   — container (flex, padding, gap, bg, border)
Label — text (size, weight, color, align)
Strip — horizontal row of items (gap, justify)
Btn   — clickable (bg, hover, disabled state, size)
```

Views compose these — never define raw inline styles. Think of it like UMG widget blueprints: you inherit defaults, override what you need, and the visual language stays consistent without effort.

---

## Decision Rules

**Extract to a shared file when:**
- A second consumer exists (or is obviously coming)
- The logic is domain-independent (math, formatting, validation)
- It's configurable and the config should live in one place

**Keep it bespoke when:**
- Only one component uses it
- It's tightly coupled to a specific UI or game moment
- Extracting it would just move complexity sideways

**File size target:** <500 lines per file. If a file is growing past that, it's probably doing two jobs — split it.

---

## Constants & Data

All game tuning values live in `constants.js` as named variables or array-of-objects tables. Nothing hardcoded in logic or components.

If you're typing a number or string literal in a logic/component file, ask: "Would a designer want to tweak this?" If yes → it belongs in config.