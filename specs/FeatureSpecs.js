# Wobbly Anvil — Feature Specs

Each spec below covers a gameplay or UX feature. Format: what it does, how it works, personality/feel, technical notes.

    For architecture and system-level specs, see `SystemSpecs.md`.

---

## SPEC: Fairy Helper System

**Files (planned):**
- `src/modules/fairyHelper.js` — Core logic, state machine, trigger registry, persistence
- `src/modules/fairyRenderer.js` — Sprite rendering, speech bubbles, FX laser, animations
- `src/config/fairyPersonality.js` — All dialogue, reactions, commentary (personality lives here, separate from logic)
- `src/config/fairyTriggers.js` — Contextual trigger definitions (what she teaches, when, conditions)

**Status:** 🔵 PLANNED — DES-3

### What it does

A persistent helper character ("Fairy" — placeholder name) who lives in the game world as an interactive companion. Three roles: FTUE guide for new players, contextual helper for returning players, and ambient personality/commentator. Can be toggled on/off at any time.

### Why we need it

The game has interconnected systems (forging, economy, QTEs, customers, quests) and no onboarding. New players don't know where to start. Traditional text tutorials kill the vibe. Fairy teaches by pointing at things and reacting to what the player does — not by lecturing.

### How she works

**Contextual triggers, not scripted sequence.** She doesn't run a fixed tutorial. She has a checklist of things to teach and reacts to what the player is doing right now. First time opening the shop? She appears and points at materials. First forge session? She points at the bar. Works even if the player explores in an unexpected order.

**Fairy laser.** Her primary teaching tool. A visible FX beam bound to her that shoots across to whatever she's explaining — like a laser pointer. Points at UI elements, buttons, panels. Does not affect menus or gameplay. The laser is how she "speaks" about game objects without needing words for everything.

**Escalation when ignored.** If the player doesn't interact with what she's pointing at:
    1. Patient pointing — laser on target, gentle bobbing
2. Bigger laser — more insistent, maybe a little sparkle burst
3. Flustered — upset animation, stops lasering for a while
    4. Dramatic exit — lowers out of scene slowly, peeks eyes back up, then disappears

After 3 dramatic exits on the same topic, she drops it permanently and moves on. She never blocks progress.

**Player can interact with her directly.** She is tappable/clickable at all times:
    - Tap once during QTE: she yelps and scoots away slightly
- Tap again: she gets completely out of the way
- This pattern applies everywhere — she's always interactable, always reactive

**QTE behavior.** She can be in the way during QTEs on purpose. QTEs gain a pause feature so she can explain things mid-action. But she yields to player taps (see above).

**Persistence.** Remembers what she's taught across sessions (localStorage). Returning players don't get re-explained. She picks up where she left off or just hangs out. Save data wipe = she acts like it's the first meeting again.

**Toggle.** On/off toggle lives in the options menu. When dismissed manually she says "i'll be in the options menu." The toggle controls all three roles (FTUE, helper, commentator) — off means fully off, not just quiet.

### Screen presence

**Default position:** Bottom-right, equal distance from center and screen edge. Small enough to not compete with gameplay.

**Can appear anywhere** if animations support it — pops up near the thing she's explaining, then returns to home position.

**Mobile:** Must not compete for tap space during active gameplay. Yields on tap (see interaction above).

### First encounter

She appears very briefly on the main menu on first launch — fast enough to cause intrigue. Points at the "How to Play" button and the toggle area. Flies away. This is the hook — players notice her before they know what she is.

    She also very briefly appears inside the How to Play tutorial screens (see below) to build curiosity, but she does not walk through the whole thing.

### Relationship to How to Play

The How to Play menu (see separate spec below) is the static reference. Fairy is the live guide. They complement each other — How to Play is what you read, Fairy is what happens while you play. She may reference the How to Play menu ("that thing i showed you? it's in there if you forget").

---

### Personality (lives in `fairyPersonality.js`)

All personality data — dialogue lines, reaction text, commentary — is separated from logic. This keeps the character tunable without touching code. Personality could be swapped or extended without changing fairyHelper.js.

**Voice:** Funny, cute, bipolar. Leans into dark humor. Breaks the 4th wall freely. Speaks only in lowercase. Not verbose — short punchy lines.

**Gibberish speech audio.** She speaks in "gibberlese" — unintelligible vocalizations synced to her speech bubbles. Grunts, squeaks, muttering. Audio feedback for talking, not actual words. TBD on exact vocalization style.

**Speech bubbles.** Cartoon-style, matching game aesthetics. Small, positioned near her sprite. Text appears in lowercase.

**Visual.** Pixel art character with minimal spritesheet animations. Idle bob, point, flustered, dramatic exit, peek, yelp, laser cast. Keep the frame count low — personality comes from timing and context, not animation complexity.

**Character design.** Cute anime girl with dark hair. Presents as a ratty hobo — tattered clothes, messy hair, scrappy energy. But there's a faint undercurrent of divinity that bleeds through in quiet moments. She looks like someone important who's been sleeping under a bridge for a century.

**Color palette.** Cool-toned to contrast with the game's warm amber/brown palette — muted blues, purples, ashen grays. Should complement the warm tones, not clash. She feels like she belongs in the world but stands apart from it. Her cool tones make her easy to spot without being jarring.

**Divine state.** When excited, agitated, or reacting to something important, divinity breaks through the hobo exterior. Her hair blazes with fire. Her body glows. Divine particle FX flare around her. These moments are brief and surprising — the contrast between ratty hobo and blazing god is the whole joke. The player should think "wait, what IS she?"

**Lore hint.** Possibly Hephaestus — god of the forge, craftsmen, and fire. Fits the blacksmith setting perfectly. Would explain why she knows everything about forging, why she hangs around the shop, and why she gets genuinely upset when the player makes bad weapons. She's slumming it in mortal form but can't fully hide what she is. This is never stated outright — it's implied through visual cues, reactions, and the occasional slip of divine power.

**Sample moments:**
- Dismissed manually: "i'll be in the options menu"
- Ignored repeatedly: anime dark-cloud eyes, "iiiiii'llll be baaaack", slowly lowers out of frame, peeks eyes back up, then gone
- Something very important + being ignored: flashes fairy laser in your face, "pay attention"
- Player taps her during QTE: yelp, scoots away
- Player taps her again: fully retreats
- Player does what she suggested: visibly pleased, little sparkle
- Player does the opposite of what she suggested: flustered, brief pout, recovers

**Commentary role (beyond FTUE).** Even after tutorials are done, if left on she can react to gameplay moments — big sales, shatters, bad QTE streaks, first masterwork. Light ambient commentary, not constant chatter. She's a spectator who can't help herself.

**Future possibility.** Her personality file could be extended or connected to a live personality system. The separation of personality data from logic makes this possible without refactoring.

---

### Technical notes

**Bus integration.** Fairy listens to gameplay tags to know what's happening (phase changes, customer arrivals, sells, shatters). She emits her own FX tags for laser, speech bubble, and animation triggers. She does not emit gameplay tags — she's read-only on the game state.

**State machine.** States: idle, pointing, escalating, flustered, exiting, dismissed, off. Transitions driven by player actions and timeout timers.

**Trigger registry.** Each teachable moment is a trigger definition: condition (first time doing X, specific phase, etc.), what to point at (UI element ID or screen region), dialogue line(s), priority, and whether it's been completed. Stored in fairyTriggers.js as data.

**Render layer.** She renders above game UI but below modals. Her sprite, speech bubble, and laser FX are a single overlay component that mounts in the layout — does not inject into existing component trees.

**UE Analogy.** Tutorial Manager + NPC companion with a Behavior Tree (idle → point → escalate → retreat). Laser is a Niagara beam FX attached to the companion actor.

---

## SPEC: How to Play (Static Tutorial)

**Status:** 🔵 PLANNED — DES-3

### What it does

A "How to Play" button on the main menu that opens a sectioned reference guide. Players click through toast-style cards organized by topic.

### Design rules

- Uses actual game iconography (sprites, colors, UI elements) to build visual familiarity
- Not verbose — "what is this? what does this do?" style
- Teaches how to get started, not how to master the game
- No numbers, no deep mechanics
- Skippable — player can exit at any time
- Progress tracked in localStorage so returning players can pick up where they left off (or skip entirely)

### Sections (draft)

- The Forge — what the anvil does, what phases look like
- Heating / Hammering / Quenching — one card each, show the bar, explain tap timing
- Customers — they show up, they want weapons, you sell to them
- The Shop — buy materials, upgrade your tools
- Your Day — time passes, stamina matters, sleep resets things

### Fairy cameo

Fairy appears very briefly inside the tutorial screens — a quick fly-by or a reaction to a specific card. Builds curiosity about who she is. She does not narrate or walk through the tutorial.

### Technical notes

Toast-style cards reuse existing toast/modal UI patterns. Content lives in a data file (array of sections, each with an array of cards). Rendering is generic — add a section by adding data, not code.

---

## SPEC: QTE Pause Feature

**Status:** 🔵 PLANNED — DES-3 (dependency for Fairy during QTEs)

### What it does

Allows QTEs to be paused mid-action. Needle/notes freeze in place. Overlay dims slightly. Fairy can explain things during the pause. Player taps to resume.

### Why we need it

Fairy needs to be able to teach during QTEs without the player missing their window. Without pause, she either can't appear during the most important part of the game, or she causes the player to fail.

### Rules

- Pause does not affect scoring — needle resumes from exact frozen position
- Visual: slight dim overlay, needle/bar frozen, "TAP TO RESUME" prompt
- Only Fairy can trigger a pause (not player-initiated — this isn't a general pause menu)
- Fairy pause only happens during FTUE triggers (first time seeing a QTE type). After that, she stays out of the way during QTEs.
- Pause auto-resumes after a timeout if player doesn't tap (prevents softlock)

---

*End of feature specs. Add new gameplay and UX feature specs here.*