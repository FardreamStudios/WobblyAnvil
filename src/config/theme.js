// ============================================================
// theme.js — Wobbly Anvil Visual Token System
// Single source of truth for all colors, fonts, sizes, and
// layout constants. Zero logic. Zero React. Pure data.
//
// USAGE:
//   import THEME from "./theme.js";
//   var bg = THEME.colors.bgDeep;
//   var font = THEME.fonts.heading;
//   var pad = THEME.spacing.md;
//
// PORTABLE: Copy this file into any project. No dependencies.
// ============================================================

var THEME = {

    // ==========================================================
    // COLORS
    // Sorted dark → light for backgrounds, then semantic accents.
    // ==========================================================
    colors: {
        // --- Backgrounds (dark → light) ---
        bgDeep:       "#0a0704",   // Deepest void, outer shell
        bgDark:       "#0f0b06",   // Bar fill interiors, inner wells
        bgMid:        "#120e08",   // Drawers, popups, sub-panels
        bgWarm:       "#141009",   // Default button background
        bgPanel:      "#16100a",   // Banner, bottom bar, header
        bgSurface:    "#1e160d",   // Main surface / center area
        bgHighlight:  "#2a1f0a",   // Empty pips, active press, dividers
        bgPlayerRow:  "#1a1500",   // Player highlight row (leaderboard)
        bgDanger:     "#1a0505",   // Danger button background

        // --- Borders (dark → light) ---
        borderDark:   "#1a1209",   // Disabled borders
        borderMid:    "#2a1f0a",   // Inner borders, sub-panels
        borderLight:  "#3d2e0f",   // Standard panel borders

        // --- Text (dim → bright) ---
        textMuted:    "#4a3c2c",   // Dismiss labels, hints
        textDim:      "#5a4a38",   // Secondary info ("owned", "units")
        textLabel:    "#8a7a64",   // Section labels, icons, muted UI
        textBody:     "#c8b89a",   // Body text, descriptions
        textLight:    "#f0e6c8",   // Primary values, weapon names, day

        // --- Accents ---
        gold:         "#f59e0b",   // Primary accent — gold, currency, tabs
        goldBright:   "#fbbf24",   // Rank-up, warm highlights
        goldPale:     "#facc15",   // Masterwork tier, upgrade flash

        green:        "#4ade80",   // Success, easy, good, calm
        blue:         "#60a5fa",   // Info actions, resume, quench btn
        red:          "#ef4444",   // Danger, critical, fail, destroy
        orange:       "#fb923c",   // Warning, strained, late-night
        purple:       "#c084fc",   // Events, royal quests
        indigo:       "#818cf8",   // Very rare materials
        lilac:        "#d8b4fe",   // Common tier weapon color
        cyan:         "#00ffe5",   // Mythic tier

        // --- Semantic Shortcuts ---
        success:      "#4ade80",
        warning:      "#fbbf24",
        danger:       "#ef4444",
        info:         "#60a5fa",
        disabled:     "#4a3c2c",

        // --- Overlays ---
        backdrop:     "rgba(0, 0, 0, 0.55)",    // Drawer backdrop
        backdropHeavy:"rgba(0, 0, 0, 0.7)",     // Modal backdrop
        backdropDeep: "rgba(10, 7, 4, 0.92)",   // Portrait overlay
        actionStripBg:"rgba(5, 3, 1, 0.15)",    // Action strip tint
    },

    // ==========================================================
    // FONTS
    // ==========================================================
    fonts: {
        heading:  "'Cinzel', serif",              // Banner, headers, section labels
        body:     "'Josefin Sans', sans-serif",    // Body text, data, buttons
        mono:     "monospace",                     // +/- buttons, counters
        system:   "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    },

    // ==========================================================
    // FONT SIZES
    // Named scale from xs → xxl.
    // ==========================================================
    fontSize: {
        xxs:  8,    // Tiny labels ("SHELF EMPTY", stam label)
        xs:   9,    // Section headers, button text
        sm:  11,    // Body values, small data
        md:  12,    // Standard info, descriptions
        lg:  13,    // Buttons, shop prices, options
        xl:  14,    // Panel headers, emphasis
        xxl: 16,    // Icons, larger emphasis
        h3:  18,    // Difficulty numbers, stress
        h2:  22,    // Big numbers (level, day)
        h1:  24,    // Toast title, modal header
        hero:26,    // Quality score display
        giant:64,   // Toast icon
    },

    // ==========================================================
    // SPACING
    // Consistent gaps, padding, margins.
    // ==========================================================
    spacing: {
        xxs:  2,
        xs:   4,
        sm:   6,
        md:   8,
        lg:  12,
        xl:  16,
        xxl: 20,
        xxxl:24,
        modal:36,   // Modal inner padding top/bottom
        modalSide:44,// Modal inner padding left/right
    },

    // ==========================================================
    // BORDER RADIUS
    // ==========================================================
    radius: {
        xs:   2,    // Pips, tiny elements
        sm:   3,    // Small buttons, scrollbar
        md:   6,    // Standard panels, buttons
        lg:   8,    // Modals, larger panels
        xl:  12,    // Options modal, game-over
        xxl: 14,    // Forge bubble
        pill: 20,   // Toast border radius
    },

    // ==========================================================
    // BORDERS
    // Pre-composed border strings for common patterns.
    // ==========================================================
    borders: {
        thin:     "1px solid #3d2e0f",   // Standard panel border
        thinMid:  "1px solid #2a1f0a",   // Inner / sub-panel border
        thinDark: "1px solid #1a1209",   // Disabled border
        accent:   "2px solid #f59e0b",   // Gold accent border
        heavy:    "2px solid #3d2e0f",   // Heavier standard border
        modal:    "2px solid #2a1f0a",   // Modal border
        toast:    "4px solid",           // Toast (append color dynamically)
        danger:   "2px solid #ef4444",   // Danger border
        info:     "2px solid #60a5fa",   // Info / resume border
    },

    // ==========================================================
    // SHADOWS
    // ==========================================================
    shadows: {
        popup:    "0 4px 16px rgba(0,0,0,0.9)",
        modal:    "0 8px 32px rgba(0,0,0,0.9)",
        toast:    "0 24px 80px rgba(0,0,0,0.99)",
        drawer:   "4px 0 20px rgba(0,0,0,0.8)",
        drawerR:  "-4px 0 20px rgba(0,0,0,0.8)",
        forgeBubble: "0 8px 28px rgba(0,0,0,0.97)",
    },

    // ==========================================================
    // TRANSITIONS
    // ==========================================================
    transitions: {
        fast:     "0.12s",
        normal:   "0.2s ease",
        medium:   "0.4s",
    },

    // ==========================================================
    // LAYOUT
    // Fixed dimensions used across desktop and mobile.
    // ==========================================================
    layout: {
        // Desktop
        designWidth:    1100,
        designHeight:   820,
        mobileBreak:    900,
        colW:           170,
        qteW:           480,

        // Mobile
        bannerH:        32,
        bottomBarH:     40,
        actionStripW:   100,
        drawerW:        160,
        drawerTabW:     20,
        drawerTabH:     48,
        shelfIconSize:  26,

        // Shared
        barHeightSm:    5,
        barHeightMd:    10,
        pipSize:        14,
        pipSizeSm:      8,
        pipSizeTiny:    10,
    },

    // ==========================================================
    // LETTER SPACING
    // ==========================================================
    letterSpacing: {
        tight:  1,
        normal: 2,
        wide:   3,
    },

    // ==========================================================
    // Z-INDEX LAYERS
    // Centralized z-index scale to prevent stacking conflicts.
    // ==========================================================
    z: {
        scene:      0,
        props:      2,
        ui:        10,
        forgeBubble:60,
        drawerTab:  85,
        backdrop:   90,
        drawer:     95,
        fxCanvas:  100,
        shelfPopup:200,
        options:   400,
        toast:    9999,
        portrait: 9999,
    },
};

export default THEME;