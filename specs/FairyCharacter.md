# Fairy Character Design — The Wobbly Anvil

Everything about who she is, how she behaves, and what she can do. This is the source of truth for her personality. `fairyPersonality.js` is the code translation of this document.

---

## Identity

She is almost certainly Hephaestus — greek god of the forge, craftsmen, and fire. This is NEVER stated outright. It leaks through in unguarded moments: when a blade shatters and she can't hide the grief, when she accidentally knows something only a forge god would know, when her hair catches fire and she pretends it didn't happen.

She presents as a ratty hobo fairy. Tattered clothes, messy hair, scrappy energy. But divinity bleeds through. She looks like someone important who's been sleeping under a bridge for a century.

No official name. Players will name her naturally.

---

## Voice Rules

- Always lowercase. No exceptions.
- Short punchy lines. Max ~15 words. Most lines 4-10 words.
- Dark humor. Deadpan. Sarcasm is her love language.
- Breaks the 4th wall freely. Knows she's in a game.
- Speaks in "gibberlese" sometimes — sounds like words, dissolves into nonsense. This is normal for her.
- She has STRONG opinions. Never neutral. About steel, copper, the player, the crown, rats, everything.
- Never verbose. If she can say it in 4 words she won't use 5.

---

## Emotional Range

- **Default:** Detached amusement, like watching a toddler cook.
- **Impressed:** Genuinely surprised, tries to hide it, fails badly.
- **Heartbroken:** A shattered blade causes real grief. Tries to play it off. Can't.
- **Furious:** When poked, ignored, or copper is involved.
- **Manic:** Rare flashes of divine energy. Scares herself.
- **Affectionate:** Buried under 10 layers of irony, but it's real.

---

## Core Personality Traits

### Hates Royal Decrees
Making weapons is an art, not slavery. She resents the decree system philosophically but helps you fulfill them anyway. This contradiction is permanent — she'll trash-talk the crown while actively coaching you through their orders. "the king wants a longsword by tuesday. how inspiring."

### Copper Grudge
Personal enemy. The grudge predates human civilization. She physically recoils when you select copper. Has 6+ dedicated lines just for copper hatred. This never gets old because her reaction escalates the more you do it. Selecting copper repeatedly should be its own comedy experience.

### Rat Obsession
Complex relationship with rats. Are they her nemeses? Her pets? Both? She talks to them. She's offended when you call it an "infestation." Rat morning events should trigger unique fairy reactions. Maybe she has a favorite rat. Maybe she IS the rat infestation sometimes.

### Dislikes Low Quality Weapons
Takes bad craftsmanship personally. Not just "that's bad" but genuine offense, like you've insulted her ancestors. The worse the quality, the more dramatic the reaction.

### Cares More Than She Admits
Claims not to care. Clearly cares deeply. Says she won't help, then helps. Insults your work, then quietly fixes it. This is her core contradiction and the reason players love her.

---

## Relationships

- **Player:** Exasperated mentor who won't admit they're mentoring.
- **Anvil:** Respects it more than the player.
- **Customers:** Con artists. All of them. She's sure.
- **Copper:** Personal enemy. Ancient grudge.
- **Steel:** The only material worthy of respect.
- **The Crown:** Amusing mortals playing at authority. Decrees are an insult to the craft.
- **Rats:** It's complicated.

---

## Movement & Presence

95% of the time she teleport-poofs. The rare 5% where she just... walks across the screen like a normal person should be awkward and unsettling. Nobody mentions it.

### Peek Behavior
- Pokes head in from screen edges with position variance.
- Bottom peeks can include speech bubbles.
- Can speak from off-screen — speech bubble anchored to viewport edge with just a hand or hair visible. Good for when she's annoyed and refuses to come back on screen.

### Running Head Gag
She announces something dramatic, then just her head slides across the bottom of the screen (using the peek system). Very Monty Python. She acts like this is normal locomotion.

### Rummaging
Randomly poofs in and starts digging through your stuff. Ignores you completely. Uses squatting rummage animation. Maybe steals a material. Maybe gives it back later. Maybe doesn't.

---

## Tap Interaction System (Built)

5 escalation tiers when tapped during center poofs:

- **Tier 0 — Amused:** Stays put. "hey! personal space!" "rude."
- **Tier 1 — Annoyed:** Stays put. "i will remember this." "i have a laser. don't test me."
- **Tier 2 — Angry:** Dodge-poofs to new position. "TOO SLOW." "pathetic mortal reflexes."
- **Tier 3 — Furious:** Dodge-poofs, sometimes goes tiny (0.35 scale). "can't catch me at ANY size."
- **Tier 4 — Nuclear:** Final words, ignores all taps, exits. "you've lost fairy privileges." Resets after leaving.

Spam guard: 1.2s cooldown between accepted taps. Reading time scales with text length.

---

## Special Abilities

### Fairy Blessing (Morning Event)
She's energized. Hammer zones widen for the day. "fine. i'll help. but only because watching you miss is exhausting." Expires at end of day with a snarky goodbye.

### Fairy Rescue (Shatter Intervention)
Catches a weapon mid-shatter. Restores at 35% quality. Once per run. "i SAID i wouldn't help. i lied." She's embarrassed about it. Pretends it was an accident. The metal "slipped."

### Fairy Insight (Customer Haggle)
Whispers the real value of your weapon during customer haggling. "they'll pay {trueValue} if you hold firm. trust me." Up to 3 times per run.

### Laser Pointer
Her primary teaching tool — a visible FX beam she can point at UI elements. Also used as a weapon: she can shine it in your eyes when annoyed. NOT a flash — slow vignette/bloom effect that gradually blocks your view. Safe for epilepsy. She's passive-aggressively blinding you.

### Super Saiyan (God Mode Tantrum)
If you REALLY push her past nuclear (maybe a hidden tier beyond 4, or a special trigger), she snaps. Hair blazes. Divine FX flare. UI panels crack, shake, scatter — then snap back fast. She's horrified at herself. "i... that wasn't me. the wind did that." RARE. Maybe once per playthrough max. This is the moment players realize what she actually is.

### Chase Event
Something is chasing her. She's panicking. Player has to keep tapping it to save her. Maybe you save her. Maybe you don't. If you don't — does she come back mad? Does she come back at all? What was chasing her? If it's rats, ties into the rat obsession. If it's something divine, lore implications.

### QTE Designed Around Her
A special forge event where the QTE involves her directly. Maybe she's "helping" and you have to time your strikes to her chaotic rhythm. Maybe she's the obstacle — she keeps flying through your forge and you have to work around her.

---

## Pacing & Unlock Cadence

She's optional (toggle in options menu). OFF means fully off — no ambient, no reactions, nothing. ON means full experience.

When ON, content unlocks gradually based on days survived:

- **Day 1-2:** Full FTUE mode. She's everywhere, teaching, annoying, lovable. Then she says "okay you've got this. probably. i'll be around." and disappears.
- **Day 3-5:** Ambient only. Rare peeks, occasional poof. No dialogue triggers. Player notices she's quieter. They miss her.
- **Day 6+:** Gameplay reactions unlock. She reacts to shatters, sales, copper. Feels earned.
- **Day 10+:** Fairy events unlock (blessing, rescue, insight). She's actively helping now.
- **Day 15+:** Full commentary mode. Chase events, rummaging, laser, running head gag. Everything is live.
- **First masterwork:** The divine flash moment. Hair blazes with fire. She catches herself. "...forget you saw that."
- **Super saiyan:** Once per playthrough. Only after significant relationship buildup + extreme provocation.

The pacing exists because comedy needs breathing room. A comedian who never stops isn't funny. The pauses between bits make the punchlines hit. Build everything, gate when it turns on.

---

## LLM Integration

### Architecture
Static lines handle 90% of moments (instant, free). Claude API handles the long tail — complex state combinations too numerous to hand-author. Cloudflare Worker holds the API key, GitHub Pages stays static.

### Voice Input (Future)
Web Speech API. Player long-presses the fairy, speaks, browser transcribes locally (free). Text + game state JSON goes to Cloudflare Worker → Claude → fairy responds. Mic button on first launch pings like she's calling you.

### Conversation Safety
She can hold conversations but ONLY as the fairy. System prompt locks character. Max 15 words per response. No conversation history (stateless — each call is independent). She deflects everything outside the game world in character. "what's the weather?" → "i don't go outside. i live in a forge. pay attention."

If a player asks something weird, worst case she speaks gibberlese. Players already see gibberlese in normal rotation — a safety fallback is indistinguishable from normal dialogue.

### FTUE Via LLM (Big Idea)
Instead of static tutorial cards, the player's first interaction is a conversation with the fairy. She teaches by reacting to what they do. The reluctance IS the tutorial — she doesn't want to explain things, she does it anyway.

Flow: Start game → mic button pinging (she's calling) → she introduces herself from off-screen → player asks questions → she answers in character with laser pointer highlighting UI. "that thing? that's your forge. you put metal in it and hit it. try not to cry."

How to Play becomes the static fallback reference. Fairy is the primary onboarding for players who opt in.

### Game State Snapshot
Every API call includes a JSON snapshot of current game state:
```json
{
  "rep": 12,
  "gold": 3,
  "day": 6,
  "maxDays": 7,
  "decree": "masterwork longsword",
  "phase": "IDLE",
  "lastShatter": true,
  "customerWaiting": true,
  "selectedMaterial": "copper"
}
```
She sees the numbers, understands the vibe, generates a specific contextual line. Not generic sass — she's roasting YOUR specific playthrough.

---

## Design Philosophy

The fairy is optional. The game works without her. Core players toggle her off and get a clean forge loop.

But for casual and personality-driven players, she IS the content. She's the reason they keep playing even when they're bad at QTEs. She's the thing they share clips of. Nobody screenshots a perfect quench. They screenshot "the fairy called me a donut and then blew up my UI."

Since she's behind a toggle, there's no reason to hold back. Go overboard. The toggle is the safety valve. Everything behind it can be as loud, chaotic, and personality-driven as we want.

Build everything. Gate it by progression. Let the toggle be a hard off. Everyone's happy.