# Wobbly Anvil — Fairy Palette & Krita Guide

Source: Combat Idle sprite sheet (canonical palette)

---

## Canonical Palette

### Hair

| Level | Hex | RGB |
|---|---|---|
| Highlight | `#3d3e56` | 61, 62, 86 |
| Base | `#1f1e30` | 31, 30, 48 |
| Shadow | `#11111d` | 17, 17, 29 |

### Cape

| Level | Hex | RGB |
|---|---|---|
| Highlight | `#616d8e` | 97, 109, 142 |
| Base | `#4f5273` | 79, 82, 115 |
| Shadow | `#3d3e56` | 61, 62, 86 |

### Tunic

| Level | Hex | RGB |
|---|---|---|
| Highlight | `#fbf1e3` | 251, 241, 227 |
| Base | `#dbd0c7` | 219, 208, 199 |
| Shadow | `#c3b8b5` | 195, 184, 181 |

### Skin

| Level | Hex | RGB |
|---|---|---|
| Highlight | `#fccd8d` | 252, 205, 141 |
| Base | `#dd9357` | 221, 147, 87 |
| Shadow | `#c47f3d` | 196, 127, 61 |

### Feet / Dirt / Rat

| Level | Hex | RGB |
|---|---|---|
| Highlight | `#a2602f` | 162, 96, 47 |
| Base | `#7d4326` | 125, 67, 38 |
| Shadow | `#512b19` | 81, 43, 25 |

### Outline

| Level | Hex | RGB |
|---|---|---|
| Base | `#260d06` | 38, 13, 6 |

> Note: Hair highlight and Cape shadow share `#3d3e56` — they blend naturally. Outline is warm dark brown, not pure black — this gives the FFT-style soft look.

**Total: 19 swatches**

---

## Color Correction Techniques

These methods fix AI generation drift without destroying the painterly blending between values.

### HSV Adjustment (Best for Most Fixes)

Use when a whole material area drifted to the wrong color family (e.g. skin went too orange/warm).

1. Select the drifted area (use Select by Color Range or paint a mask)
2. Filter → Adjust → HSV/HSL Adjustment
3. Shift Hue to move the color family toward canonical values
4. Nudge Saturation down if AI oversaturated
5. Tweak Lightness if needed
6. All internal blending and gradients are preserved

### Eyedropper + Manual Paint (Spot Fixes)

Use for small patches where a few pixels are clearly the wrong color.

1. Eyedropper the correct color from a good area or from this palette
2. Paint over the bad pixels with a hard brush at full opacity
3. Good for fixing stray warm pixels in cool areas or vice versa

### Curves Filter — Per Channel (Tonal Shifts)

Use when the whole sprite is shifted (e.g. everything slightly too warm).

1. Filter → Adjust → Curves
2. Switch to individual R, G, B channels
3. Pull down the Red curve slightly to cool everything off (or push Blue up)
4. Preview in real time — small moves go a long way

### Select by Color Range (Isolating Materials)

Useful before applying any of the above to only one material.

1. Select → Select by Color Range
2. Click a sample pixel in the material you want to fix
3. Adjust Fuzziness slider until the selection covers that material's full value range but doesn't bleed into other areas
4. Apply your correction only to the selection

---

## Krita Setup

### Creating the Palette

1. Open the Palette docker: Settings → Dockers → Palette
2. Click the small icon at the bottom-left of the docker to create a new palette
3. Name it `WA_Fairy`
4. For each color in the table above:
    - Type the hex value into the foreground color selector (click the foreground color square)
    - Click "Add to Palette" in the Palette docker
    - Right-click the swatch to rename it (e.g. `Skin - Base`, `Hair - Shadow`)
5. The palette auto-saves to your Krita resources and is available in every file

### Where Palettes Live

- Palettes are engine-level, not file-level
- Settings → Manage Resources → Open Resource Folder → `palettes/` subfolder
- Saved as `.kpl` files — available across all projects

### Using the Palette as a Reference (Recommended Workflow)

Keep the Palette docker visible while working. Use the palette swatches as a visual reference to check what color family an area should be — don't lock brush painting to it.

- Eyedropper from the palette swatch to get the canonical base color
- Use that as your starting point for HSV Adjustment or manual painting
- This preserves the AI-generated blending while keeping colors on-brand

### Snap to Palette (Use Sparingly)

Only turn this on for hard corrections where you want to force exact values.

1. Select your `WA_Fairy` palette in the Palette docker
2. In Brush Settings, enable "Snap to palette" under Color
3. Any brush stroke will round to the nearest palette swatch
4. **Warning:** This kills smooth gradients — only use for outline touch-ups or flat fill areas