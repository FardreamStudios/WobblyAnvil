# Wobbly Anvil — Unreal Engine Transition Notes

## Core Concept: Fixed Camera as UI Layout Engine

The foundation of the UE version is a fixed orthographic-style camera pointed at a black background level. This camera never moves. Instead of placing UI elements manually in UMG with pixel offsets or percentages, character pawns are physically placed in 3D world space in front of the camera. Their position in the world becomes their position on screen automatically.

**Project World to Screen** converts each pawn's world location into a 2D screen coordinate. UMG widgets — health bars, name tags, status icons — read those coordinates and pin themselves to the right spot automatically. Moving a character in the scene moves all their UI with them. Aspect ratio differences are handled by the camera's projection math, not by manually repositioning anything.

This replaces the CSS layout wrestling from React. The 3D scene is the layout system.

---

## Scene Stack

The visual presentation is three layers:

1. **3D Scene** — black background level, fixed camera, character pawns placed strategically in world space
2. **World-pinned UI** — health bars, name tags, status indicators driven by Project World to Screen
3. **HUD overlay** — battle menu, dialogue boxes, action options, QTE prompts — standard flat UMG sitting on top of everything

The HUD layer has no awareness of world space. It just displays information. The scene layer handles positioning.

---

## Characters and Sprites

Characters are 2D sprite images — hand drawn or exported from Blender — displayed as UMG image elements. No real-time 3D rendering of characters. The pawn exists in world space as an invisible positional anchor. The visible character is a widget image that follows that anchor via world to screen.

Sprite animations are driven by a **flipbook system** built on the Animation Blueprint and Montage pipeline below.

---

## Animation System

### The Architecture

Each character has a minimal skeleton — just enough bones to run an Animation Blueprint. The skeleton has no visible mesh. It exists purely to run montage logic.

A UMG image widget displays the current sprite frame. The Anim BP reads a curve value and outputs a frame index. The widget reads that frame index and displays the correct frame from the sprite sheet.

### Anim BP Responsibilities

The Animation Blueprint owns passive character states:

- Idle loop
- Hit react
- Death
- Passive states — guarding, exhausted, kneeling

These are state machine states in the Anim BP. Transitions are driven by gameplay variables set by the ability system.

### Montage Responsibilities

Anything triggered by a game event — attacks, special moves, QTE results — is played as a montage from gameplay code. The montage is built on a base 1-second empty animation stretched with play rate as needed.

Each montage has a **curve track** that outputs a float frame index value. Named sections inside the montage define animation states — Idle, Attack, Hit, Death. Jump To Section and looping sections handle state transitions, leveraging the built-in montage system rather than building a custom controller.

### Sprite Sheet Display

The widget image uses a material that offsets UVs based on the current frame index. The curve value from the montage is rounded to an integer, mapped to a grid position on the sprite sheet, and passed to the material as a scalar parameter. Frame rate feel is controlled by how many keyframes are authored in the curve — stepped keys give the chunky 16-bit look.

---

## UI Theming

**Common UI plugin** is the theming foundation. Button styles, text styles, and color palettes are defined as data assets. Every widget pulls from those assets. Changing a style asset updates every instance automatically — single source of truth.

The 16-bit look comes entirely from the assets fed into Common UI:

- Pixel art border textures for panels and buttons
- Bitmap or chunky pixel font
- Saturated color palette defined in style assets

Common UI does not care what the textures look like. It just applies them consistently. The visual style is an art direction decision, not an engine limitation.

---

## QTE System

QTEs live in the HUD layer as UMG widgets. The core grading logic applies to all QTE types:

**Directional Swipe**
Touch points are recorded as a vector array from touch begin to touch end. On touch end, the X delta and Y delta are compared. If X dominates by the required ratio the direction is valid. Simultaneously a timeline drives the fill animation — the moment the fill completes is the grade window. Both direction and timing must pass for a successful result.

**Ring Tap**
A shrinking ring animates via a timeline from large scale down to a target ring size. The timeline value is the ground truth. On tap, the current timeline value is read and compared against perfect and good threshold ranges defined as named constants. No shape math needed — just a single float comparison.

All QTE results fire **Gameplay Cues** via GAS, which drive visual and audio feedback. Thresholds for perfect, good, and miss windows are named constants at the top of the relevant Blueprint — tunable without touching logic.

---

## Audio

MetaSounds replaces WebAudio. Procedural 16-bit style audio is built in the MetaSounds node editor. Pre-made audio files import as standard assets. A custom **Editor Utility Widget** mirrors the web dev tool used during Wobbly development — it exposes MetaSound parameters visually inside the editor so audio can be designed and previewed without leaving Unreal.

---

## LLM Companion

The opt-in companion feature connects to the existing Cloudflare Worker already set up for Wobbly. The Worker holds the Anthropic API key and proxies requests. The Unreal game sends player input to the Worker endpoint over HTTP, receives the response, and displays it in a companion dialogue widget. No API key ships inside the game binary. The backend infrastructure is already in place and requires no changes.