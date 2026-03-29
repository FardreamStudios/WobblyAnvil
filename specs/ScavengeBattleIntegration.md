# Scavenge Battle — Integration Guide

## New Files (drop these in)

| File | Location |
|------|----------|
| `ScavengeMenu.js` | `src/battle/ScavengeMenu.js` |
| `BattleView.js` | `src/battle/BattleView.js` |

---

## Edits to App.js

### Edit 1: Add imports (near top, with other imports)

**Add after the other module imports:**

```js
import ScavengeMenuModule from "./battle/ScavengeMenu.js";
import BattleViewModule from "./battle/BattleView.js";

var ScavengeMenu = ScavengeMenuModule.ScavengeMenu;
var BattleView = BattleViewModule.BattleView;
```

### Edit 2: Add scavenge mode state (near other useState calls)

**Add after the existing state declarations (near showShop, showMaterials, etc.):**

```js
var [scavengeMode, setScavengeMode] = useState(null); // null | "menu" | "battle"
```

### Edit 3: Replace onScavenge callbacks in BOTH mobile and desktop layout props

**Find the two places where `onScavenge={scavenge}` is passed to layouts.**

Currently they look like:
```js
onScavenge={scavenge}
```

**Replace both with:**
```js
onScavenge={function() { sfx.click(); setScavengeMode("menu"); }}
```

This makes tapping Scavenge open the menu instead of doing the instant roll.

### Edit 4: Add ScavengeMenu + BattleView rendering

**Add BEFORE the `<FairyAnimInstance>` line in the mobile render block (and a matching block in the desktop render if desired).**

The simplest approach: render these as overlay layers inside the existing layout, gated on `scavengeMode`:

```jsx
{/* Scavenge Menu Overlay */}
{scavengeMode === "menu" && (
    <ScavengeMenu
        onQuickScavenge={function() { setScavengeMode(null); scavenge(); }}
        onExtendedScavenge={function() { setScavengeMode("battle"); }}
        onCancel={function() { setScavengeMode(null); }}
        handedness={handedness}
    />
)}

{/* Battle View — replaces entire game UI when active */}
{scavengeMode === "battle" && (
    <BattleView
        handedness={handedness}
        onExit={function() { setScavengeMode(null); }}
        zoneName="Back Alley"
        waveLabel="Wave 1/2"
    />
)}
```

**Where exactly to put this:**

For mobile: inside the `<MobileShell>` return, right before `</MobileShell>` close or right after the main middle content div. The `ScavengeMenu` uses `position: absolute; inset: 0` so it overlays the game.

For desktop: same pattern, inside the `<DesktopLayout>` return. OR — simpler for now — render it at the App.js level above both layouts:

```jsx
// RIGHT BEFORE the isMobile ternary that picks layout:
if (scavengeMode === "battle") {
    return (
        <>
            <BattleView
                handedness={handedness}
                onExit={function() { setScavengeMode(null); }}
                zoneName="Back Alley"
                waveLabel="Wave 1/2"
            />
        </>
    );
}

if (scavengeMode === "menu") {
    // Render menu as overlay on top of the normal game
    // (handled inside the layout render — see above)
}
```

The cleanest approach for V1: **render BattleView at the App.js level as a full replacement**, and render ScavengeMenu as an overlay inside the normal layout.

### Recommended App.js Pattern

```jsx
// --- Full-screen battle mode (replaces everything) ---
if (scavengeMode === "battle") {
    return (
        <BattleView
            handedness={handedness}
            onExit={function() { setScavengeMode(null); }}
            zoneName="Back Alley"
            waveLabel="Wave 1/2"
        />
    );
}

// --- Normal game render (with scavenge menu overlay) ---
// ... existing mobile/desktop layout code ...
// Add ScavengeMenu overlay inside the layout (see Edit 4 above)
```

---

## NO changes needed to:

- `useDayVM.js` — `scavenge()` stays as-is (it becomes the "quick" path)
- `useInputRouter.js` — scavenge gate stays as-is
- `mobileLayout.js` — no changes (receives onScavenge via props as before)
- `desktopLayout.js` — no changes
- Any other existing file

---

## Summary

| Change | File | Risk |
|--------|------|------|
| New file | `src/battle/ScavengeMenu.js` | LOW — standalone |
| New file | `src/battle/BattleView.js` | LOW — standalone |
| Import + state + callback swap + render gate | `App.js` | LOW — additive, no existing logic modified |

Total: 2 new files, 4 small edits to App.js. Zero changes to existing systems.

---

## Testing

1. Tap Scavenge → should see Quick/Extended menu overlay
2. Tap Quick → old scavenge behavior (random loot toast)
3. Tap Extended → full-screen battle layout replaces game
4. Tap Flee in battle → returns to normal game
5. Tap Cancel on menu → returns to idle
6. Toggle handedness → battle layout panels should flip