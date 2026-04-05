# Wobbly Anvil — Decrees & Reign-Wide Design Jam

## Purpose of this doc

Companion to `AdventureModeJam.md`, `WorldBuildingJam.md`, `ForgeSessionJam.md`, `MetaProgressionJam.md`, and `InRunDesignJam.md`. Earlier jams defined the structure of a reign, the soul of the smith, the cozy time window, the meta progression layer, and the in-run economy. This doc defines **the tactical unit of the reign (decrees), the shape of the reign arc, and the narrative layer that sits on top of both (events)**.

No code. No spec. Jam transcript style. Reasoning preserved alongside decisions.

Read the five preceding docs first. This doc assumes their decisions are locked.

---

## The Framing Problem We Were Solving

Decrees have been the building block of every previous jam but were never defined as a design object. "Decrees escalate" was asserted but never mechanized. Reign-wide content was hinted at but never designed. This jam addresses all three.

Three blocks, in order:

- **Block A — The Decree.** What a decree is as a design object, including decree types, the king's voice, binary outcomes, and the extraction mechanic.
- **Block B — Reign Arc via Decree Escalation.** How decrees change character across a reign, the pressure curve that outpaces player growth, the king as difficulty lever, and how reigns end.
- **Block C — Events.** Multi-decree narrative events that shape reigns, reveal worldbuilding, and give the player meaningful branching choices.

---

# Block A — The Decree

## What a Decree Is

A decree is the tactical unit of a reign. It's what the king commands, what the player prepares for during cozy time, and what the player resolves through an adventure. A decree is both a **design object** (data the game generates) and a **narrative moment** (the king's voice, delivered to the player).

## The Decree's Components

| Component | What It Is | Who Sets It |
|---|---|---|
| **Objective** | What the player must accomplish | Rolled from the decree type pool |
| **Location** | Where the adventure takes place | Rolled from the unlocked locations pool |
| **Difficulty tier** | How hard this specific decree is | Set by escalation curve (reign phase) |
| **Hour budget** | How long cozy time is before the decree is due | Scaled to difficulty |
| **Decree stakes** | Reputation on failure, king-trust on success | Scaled by difficulty + king temper |
| **Reward pool** | What the 3 reward options could be on completion | Weighted by location + spirit themes |
| **King's voice** | How the decree is presented narratively | Modulated by the king's temper |
| **Event flags** | Any active reign event modifiers | Set by any active reign event |

## Decree Types — Objective and Generator Instruction

Decree types are dual-purpose: they define what the player is doing AND they instruct the map and combat systems to generate different adventure shapes. Same underlying systems, different mission feel per type.

| Type | What the Player Does | Map Generator Instruction | Combat Flavor |
|---|---|---|---|
| **Slay** | Kill a specific target | Target is deep in the map — normal routing | Boss-shaped final node |
| **Retrieve** | Recover an item | Item is hidden deep — routing matters | Normal combat |
| **Defend** | Hold a point | Map collapses to a defense zone | Wave-based combat at the hold point |
| **Escort** | Move an NPC safely to a destination | Two-phase map: find the target, then backtrack with escort | Escort AI in combat, new pressure type |
| **Investigate** | Find information or resolve a mystery | Map has narrative talk-to-NPC nodes hidden among combat nodes | Normal combat with dialogue beats |
| **Survive** | Reach extract point against rising pressure | Timer-based map, enemies spawn as time passes | Scaling combat; extract is the win condition |

**Six decree types as v1 ambition, with fewer likely to ship in prototype.** Each type asks a *different question* of the player — if two types ask the same question, one is redundant.

### Notes on Specific Types

- **Survive inverts extract logic.** In normal decrees, extract is a bailout that fails the decree. In Survive, extract point *is* the objective — reaching it successfully completes the decree. This is a powerful inversion that repurposes existing systems.
- **Escort is structurally the most complex.** It requires a find-phase and a backtrack-phase, which may need map features that don't exist yet. Likely not v1.
- **Investigate depends on the dialogue system** (see Block C) for its talk-to-NPC nodes.
- **Defend and Survive both lean on wave combat**, which the existing combat system should handle with minor adjustments.

## The King's Voice — How Decrees Are Delivered

A decree isn't a quest card. It's the king speaking. Decree presentation is one of the main ways the king becomes a character in the player's head.

Every decree has four beats in its presentation:

- **The king's opening** — framing why this is being asked
- **The objective** — what must happen, in the king's language (not system language)
- **The stakes** — what the king says will happen on success or failure
- **The king's mood beat** — one line of character color reflecting his current temper

The king's temper (set by the player at reign start — see Block B) modulates all four. A patient king frames decrees with context. A cruel king gives orders with threats attached. A desperate king begs in disguise. A distracted king is erratic and inconsistent.

**The king's temper is the UI of decrees.** That's why he's more than flavor — his voice is the wrapper every decree comes in.

## Difficulty Signaling at Intake

When a decree arrives, the player assesses it before committing cozy time to preparation. Six visible signals:

| Signal | What It Tells the Player |
|---|---|
| **Location tier** | Heartland / Frontier / Edge / Beyond — immediate difficulty read |
| **Objective type** | Some types are harder than others depending on your build |
| **Hour budget** | Less time = harder decree |
| **Reputation stake** | Higher stake = king expects this to be hard |
| **King's framing** | His mood tells you how he feels about sending you |
| **Event flags** | Any active reign events affecting this decree |

All six are visible at intake, before the cozy time clock starts. No hidden difficulty. The player assesses, then chooses how much cozy time to invest.

**Balance note:** difficulty signaling shouldn't over-telegraph. The player sees the *tier* and reads the *king's mood*, but doesn't see exact enemy stats or node-by-node difficulty. Some fog is healthy.

## Binary Outcomes — Decrees Hit Hard

Decrees are binary: **success or failure.** There is no partial credit on reputation. This was an explicit decision — partial outcomes create a floaty reputation state where every decree becomes a math problem about acceptable loss, and the pressure fantasy requires decrees to *land*.

## Extraction — A Controlled Failure

Extraction still exists as a mechanic, but in the binary model it is **a controlled failure, not a middle outcome.**

When you extract, you are choosing to fail the decree on purpose because the alternative is dying. The king sees the same outcome as any other failure. The reputation hit is the same. The *only* thing extraction saves is what you gathered during the adventure itself.

### The Failure Hierarchy

| Outcome | King Sees | Reputation | Adventure Gains | Meta Unlocks | Feel |
|---|---|---|---|---|---|
| **Success** | Pass | Safe | Kept | Possible | "I delivered." |
| **Extract** | Fail | Burned (full hit) | **Kept** | Possible | "I ate it. But I got something." |
| **Death** | Fail | Burned (full hit) | **Lost** | **Possibly lost** | "I have nothing. And I'm afraid." |

### The Core Principle

> Every adventure has the potential to be productive, even a failed one — unless you die. Death is the only outcome that truly wastes the player's time.

This is the load-bearing insight of Block A. Extraction gives players consolation for near-misses through the **items economy**, not the reputation economy. You ate the rep hit, but maybe you got out with a cool new piece of armor, a new NPC unlocked, a new material, or a new location hint. The reign is still moving forward, even if the decree didn't.

Death is different. Death loses the items, the rep, and possibly the meta unlocks you would have banked. Death is pure waste. **Death is the thing to fear.**

## Fight-For-Your-Life Moments

Locations, decree types, and events can all **remove extraction availability** from an adventure. When extract points are absent, the player is in a fight they cannot walk away from.

Examples of when extraction can be removed:

- A **Survive decree** where extraction *is* the objective — failing to reach it means dying
- A **node trap** that seals off extract routes
- A **boss-shaped Slay decree** where the boss blocks the only path back
- **Late-tier locations** (Edge, Beyond) where extract points are rare, fake, or hidden
- **Event-modified decrees** that remove extraction for narrative reasons

The player should not always know when extraction is about to be removed. Sometimes they do (a Survive decree is telegraphed). Sometimes they don't (a node trap is a surprise). The unpredictability is what makes every adventure carry quiet tension: *am I still able to leave?*

This is a major tool for the game's pressure. It takes the safety valve away, and in its absence the player discovers what the pressure fantasy actually feels like.

---

## Block A — Summary of Locked Decisions

- Decrees are the tactical unit of a reign, with 8 data components
- Six decree types: Slay, Retrieve, Defend, Escort, Investigate, Survive
- Decree types double as map and combat generator instructions
- The king delivers decrees in a four-beat presentation, modulated by his temper
- The king's temper is the UI of decrees, not just flavor
- Difficulty is signaled at intake across six visible channels
- Decrees are binary: success or failure. No partial rep credit.
- Extraction is a controlled failure that preserves adventure gains but burns full reputation
- Death is the only outcome that loses adventure gains
- Extraction can be removed by locations, decree types, or events — creating fight-for-your-life moments

---

# Block B — Reign Arc via Decree Escalation

## The Shape of Escalation

Decrees escalate in difficulty until the player fails. This is the mechanical spine of the reign arc — not a scripted emotional curve, but a **pressure curve that eventually outpaces the player's growth**. The moment of failure is when the curve wins.

## The Seven Escalation Axes

Escalation happens along multiple axes. Not all at once — the art is in which knobs turn when.

| Axis | What It Does | Player Feels |
|---|---|---|
| **Location tier** | King sends you further from home | "He trusts me with the dangerous places now." |
| **Objective complexity** | Harder decree types enter the rotation | "These are harder missions." |
| **Enemy scaling** | Enemies get meaner, more varied | "The fights are harder." |
| **Hour budget compression** | Less cozy time per decree | "I can't prepare enough." |
| **Reputation stakes** | Bigger rep cost on failure | "I can't afford to fail this one." |
| **Extract availability** | Fewer safe bails | "There's no backing out." |
| **Event pressure** | Active events compound difficulty | "The world itself is pushing back." |

## The Four Phases of a Reign

A reign has four phases, each defined by which axes are escalating and how hard.

### Phase 1 — Audition (Decrees 1–3ish)

- **Location:** Heartland only
- **Objectives:** Simple types — Slay, Retrieve
- **Enemy scaling:** Low
- **Hour budget:** Generous
- **Rep stakes:** Moderate (a failure hurts but doesn't end you)
- **Extract:** Always available
- **Events:** Usually none active yet

The king is testing you. Decrees are small because *you're untested*, not because the game is holding your hand. This is where the prodigy learns their weapon, discovers their forging vocabulary, and finds their footing.

### Phase 2 — Trust (Decrees 4–8ish)

- **Location:** Frontier opens up
- **Objectives:** Types expand — Defend, Investigate enter rotation
- **Enemy scaling:** Moderate, varied
- **Hour budget:** Still reasonable
- **Rep stakes:** Real — a failed decree here *counts*
- **Extract:** Mostly available
- **Events:** First events may trigger

The king starts trusting you with real work. This is the best phase of the reign — the player has tools, the weapon is growing, decrees are interesting, failure is possible but recoverable. This is where players live the fantasy.

### Phase 3 — Strain (Decrees 9–13ish)

- **Location:** Edge opens up
- **Objectives:** All types in rotation, including Escort and Survive
- **Enemy scaling:** High, location-specific
- **Hour budget:** Tightening
- **Rep stakes:** Heavy — failures really bite
- **Extract:** Sometimes restricted
- **Events:** Events may be active

The king is pushing. Decrees are starting to exceed what the player's current weapon and equipment can reliably handle. The player is leaning on everything — their best forge upgrades, their best armor, their best consumables. They're still surviving, but they feel the walls closing in.

### Phase 4 — End (Decrees 14+)

- **Location:** Beyond may appear
- **Objectives:** Brutal combinations, often event-modified
- **Enemy scaling:** Beyond player's ceiling
- **Hour budget:** Painful
- **Rep stakes:** One or two failures ends the reign
- **Extract:** Often removed or unreliable
- **Events:** Late-reign events can be reign-defining

The king has run out of easier smiths. He sends *you*, knowing what he's asking. Most reigns end here. The player either pushes through their ceiling and the reign continues (becoming legendary), or they fail and the reign ends with dignity.

**Phase numbers are sketches.** A bad reign might end in Audition. A great reign might last past Phase 4 into territory no one has seen. The phases are *shapes*, not lengths.

## Pull, Not Push

A subtle but important design principle:

> **The king pulls the player forward. He does not push them.**

- **Push** is a scaling system: "You survived long enough, so the game gets harder."
- **Pull** is a character beat: "You've proven yourself, so the king asks for more."

Push is punishment. Pull is trust disguised as danger. Even the late-reign brutality has the shape of an earned weight, not persecution. The king might say: *"You handled the raiders at Hollowmere. I need someone I can send into the Edge."* That's a compliment disguised as a death sentence. And that's what makes the arc emotional.

Every decree the king issues in late reign should sound like trust, not harassment.

## Kings as Pre-Reign Choice (Difficulty Lever)

Kings are a **player choice at the loadout screen**, not a random reign roll. Picking a king sets the reign's difficulty curve and personality.

**Why this is better than random kings:**

- It gives players agency over pacing. A new player picks Patient for a long audition. A veteran picks Cruel to skip to the harder content.
- It replaces traditional difficulty settings. No "Easy / Normal / Hard" menu — you pick a king, and the king *is* the difficulty, wrapped in character.
- It makes kings unlockable, turning king choice into another meta track alongside difficulty selection.
- Every reign has a pre-committed personality. The player knows what shape the reign will have, and picks accordingly.
- Same content plays wildly different across different kings. Roguelite variety doesn't suffer — it's amplified.

### The King Tempers

Four initial tempers, each modulating escalation differently:

| Temper | Escalation Style | Feel |
|---|---|---|
| **Patient** | Slow ramp. More decrees per phase. Player gets more chances to grow. Reigns feel long and arc-shaped. | Generous, reflective. The starting king. |
| **Cruel** | Fast ramp. Fewer early decrees. Late pressure hits sooner. | Vicious, compressed. For players who want the tension immediately. |
| **Desperate** | Erratic ramp. May throw Phase 3 decrees in Phase 1 because the kingdom is burning. | Chaotic, thematic. The kingdom is in crisis. |
| **Distracted** | Uneven ramp. Easy decrees mixed with sudden spikes. Player can't settle into a rhythm. | Unpredictable. |

The temper roll gives one meta-progression variable massive variation with no new systems.

### The Loadout Is Now Four Picks

The loadout screen has expanded:

| Slot | What You Pick | Purpose |
|---|---|---|
| **King** | 1 king from unlocked pool | Sets difficulty curve and reign personality |
| **Forms** | 1–2 weapon archetypes | What you build |
| **Forge Upgrades** | 3–5 upgrades | How you build |
| **Spirit Themes** | 1–2 themes | What you find |

The king is the *first* decision — it sets the frame the other three picks sit inside. A Cruel king reign pushes you toward forge upgrades that ramp fast. A Patient king reign lets you pick exploration-focused upgrades because you'll have time.

### Kings as a Meta Track

Kings are now a new meta track. The full meta picture:

| Track | Type | Unlock Source |
|---|---|---|
| Forms | Loadout pick | Mastery |
| Forge Upgrades | Loadout pick | Milestones |
| Spirit Themes | Loadout pick | Encounters |
| **Kings** | **Loadout pick** | **Reign progression under specific other kings** |
| NPCs | Emergent | Encounter actions |
| Locations | Emergent | Discovery |
| Equipment Pool | Emergent | First discovery |

### Kings Unlock Each Other

King unlocks form a small tree. Some kings only unlock while serving specific other kings. Example (illustrative):

- **Patient** is the starting king
- **Cruel** unlocks by reaching Phase 3 under Patient
- **Desperate** unlocks by reaching Phase 4 under Cruel (not Patient)
- **Distracted** might unlock by dying in a specific scene under any king

**Why this structure is strong:**

- It turns king progression into a mini-puzzle. "I wonder what unlocks under Desperate..."
- It gives each king its own progression lane, not just a difficulty level
- Unlocking the hardest king requires playing through the others first — you earn it by climbing
- Veteran players have a long-tail chase ("I've never unlocked the fifth king")
- The king tree can branch, so different players might unlock different kings in different orders

Starting pool is small (probably just Patient) and the branching unlock tree fills in across many reigns.

## Reign Endings — The Prodigy's Story

Reign endings are **outside the king's purview**. The game doesn't end with the king pronouncing judgment. The game ends with *the prodigy's story*, and the king's involvement varies.

> **Reign-end is the prodigy's story, not the king's verdict.**

### Reign-End Scenes

A reign that ends through reputation zero plays a scene determined by what happened during the reign. Sketch of possible scenes (illustrative, not locked content):

| Scene | When It Happens | Feel |
|---|---|---|
| **Execution** | Terrible failure late in a Cruel king's reign | The worst possible ending. Grim. Rare. |
| **Exile** | Failure after some success — the king sends you away | Bittersweet. You survived but lost everything. |
| **Quiet Escape** | You and the fairy slip away before the king can act | "Live to fight another day." |
| **Mercy** | Patient or distracted king lets you live. Maybe demotes you, maybe forgets. | Melancholy. You were small enough to forgive. |
| **Disappearance** | You and the fairy vanish. No one knows where. | Mysterious. Leaves doors open. |
| **Happily Ever After** | Friends help you escape to something quiet | Rare, earned, beautiful. The peaceful ending. |

The scene is determined by what happened during the reign — did you make friends, did the fairy trust you, did you reach Phase 4, did you make specific choices during events, which king were you serving.

### Why This Framing Is Generous

- **Every reign gets its own ending moment.** Not a game over screen. A scene.
- **Meta progression during the reign matters to the ending.** Unlocking an NPC changes what's possible at reign-end. Making friends gives you someone to escape with.
- **The king's personality is honored without overriding the prodigy's.** A Cruel king's reign-end is more likely to go badly. A Patient king's reign-end might just... let you go.
- **The prodigy's story gets dignity even in failure.** Players can look back at a reign and remember how it *ended*, not just that it ended.

### Adventure Death Gets a Different Scene

Adventure death is the exception. It doesn't get a story-shaped scene — it gets a **punctuation scene**: fast, brutal, red and black.

| Aspect | Reign-End Scene | Death Scene |
|---|---|---|
| **Length** | Longer, scripted beat | Fast, brutal |
| **Mood** | Melancholic, earned, sometimes beautiful | Harsh, final |
| **Palette** | Depends on scene | Red and black |
| **Fairy's role** | Present, reactive, sometimes central | Silent or absent, grieving in private |
| **What it conveys** | "Here's what this reign was" | "You died. That's it." |

**The asymmetry is intentional.** Reign-end scenes honor the prodigy's journey. Death scenes honor the *loss* of it. Both are scenes. Only one is a story. The player learns to recognize the palette instantly — red and black means this reign didn't deserve a story, because the prodigy didn't live to tell it.

This is how death feels different from reputation-zero endings without any new mechanics. Death is the only end-state without narrative consolation.

---

## Block B — Summary of Locked Decisions

- Four reign phases: Audition, Trust, Strain, End
- Escalation happens across seven axes, tuned per phase
- Escalation is pull, not push — the king asks for more because you earned it
- Kings are a pre-reign loadout pick, replacing traditional difficulty selection
- Four king tempers: Patient, Cruel, Desperate, Distracted
- Kings are the 7th meta track with conditional unlock paths (a small tree)
- Loadout is now four picks: King, Forms, Forge Upgrades, Spirit Themes
- Reign-end is the prodigy's story, not the king's verdict
- Six possible reign-end scene types determined by what happened in the reign
- Adventure death gets a distinct short scene: fast, brutal, red and black
- The fairy is present in reign-end scenes, silent in death scenes

---

# Block C — Events

## What Events Actually Are

Events are **the narrative and worldbuilding layer of the game**. They are the reason two reigns with the same decrees feel like different stories.

Earlier in the jam, events were framed as "multi-decree global modifiers with narrative flavor." That framing was wrong. Events are the opposite:

> **Events are narrative moments with mechanical consequences — not mechanical modifiers with narrative wrappers.**

Events are the game's chance to:

- Tell stories about the world
- Give the player meaningful choices that branch
- Reveal worldbuilding organically through play instead of lore dumps
- Create memorable moments players talk about after the fact
- Introduce new characters with personality and voice

The mechanical modifiers still matter. They're what makes an event *felt*. But they exist to support the narrative, not replace it.

## The Core Principles

### 1. One Event at a Time, Maximum

Not "up to two." One. Events are special, and overlapping them dilutes both.

### 2. Events Are Rare

Not every reign has an event. Some reigns are just decrees and escalation, and that's correct. Events are the reigns players remember, and scarcity is what makes them matter. Rough feel: maybe 40–60% of reigns have an event. Quiet reigns are the baseline that makes eventful reigns feel like gifts.

### 3. Events Are the Narrative Showcase

Events are where the game's voice lives. Every event should feel like **a short story the player is inside of**, not a modifier with flavor text.

### 4. Events Have Meaningful Mechanical Weight

The mechanical modifiers are how the story is *felt* through play. A plague event that just reduces heal effectiveness is a debuff. A plague event where you meet a doctor, hear about the sickness, choose whether to help or exploit, and watch the kingdom respond — *that's* an event, and the heal reduction is the weight behind it.

## The Design Rule

> **Every event must give the player meaningful choices, reveal worldbuilding, and leave the reign different from how it would have gone without it.**

If an event is just modifiers — no choices, no lore, no lasting change — it's not an event. It's weather. Weather is fine to have elsewhere. Events must earn the name.

## The Dialogue Layer

Events work through **interactive dialogue with branching choices**. This is the mechanical backbone of how events function.

- **Event triggers surface as dialogue moments.** You meet someone, something happens, the game pauses, and you're given choices.
- **Choices branch.** Different choices lead to different outcomes, and some outcomes trigger events that reshape the rest of the reign.
- **Not every dialogue triggers an event.** Most are flavor, NPC interactions, or small decisions. Event-triggering dialogues are rare.
- **The player learns the pattern over time.** After several reigns, players start to recognize when a dialogue feels weighty. That recognition becomes part of the fun — "oh, this is one of *those* moments."

## The Anatomy of an Event

| Component | What It Is |
|---|---|
| **Narrative seed** | The opening scene — usually a dialogue moment, encounter, or arrival |
| **Branching structure** | The choices the player can make during the seed, and what each leads to |
| **Trigger path** | Which branch actually starts the event (some branches may end it there) |
| **World state change** | What the event is, now that it's started |
| **Global modifiers** | Mechanical changes that make the event *felt* during play |
| **Ongoing moments** | Additional dialogue or encounters during the event that develop it |
| **Resolution** | How the event ends — sometimes player-driven, sometimes automatic |
| **Aftermath** | What the world remembers after the event ends |

## How Events Are Triggered

Multiple trigger types:

| Trigger Type | Example |
|---|---|
| **Random roll** | Phase entry rolls a chance for a random event |
| **King-specific** | Desperate kings trigger crisis events more often |
| **Phase-specific** | Omens are more likely late-reign |
| **Player action** | A dungeon encounter dialogue where the player's choice starts the event |
| **Meta-unlocked** | Some events only exist after the player has unlocked them through prior discoveries |
| **Location-linked** | Certain locations carry latent events that may trigger when visited |

The blend is important. Some events you cause. Some happen to you. That mix is what makes events feel like *weather with agency* rather than scripted beats or pure randomness.

## Four Event Roles

Events serve different emotional functions. v1 content should ideally include at least one of each role:

| Role | What It Does | Feel |
|---|---|---|
| **Problem** | Something bad is happening — the player can fight it or endure it | "There's a crisis I can choose to engage with." |
| **Pressure** | Stacks intensity on top of reign escalation | "The reign just got harder." |
| **Gift** | A brief window of abundance and texture | "Something good came through." |
| **Mystery** | Something to notice, nothing required | "Something strange is going on." |

Four roles, four different emotional beats. A reign that runs a Problem event, then a Gift, then a Mystery feels like *a story*.

## Example Events (Illustrative Only, Narrative-First)

### The Stranger in the Dungeon — A Trigger Event

A **Problem/Pressure** event. Short narrative moment during a normal adventure that branches into a larger event.

**Seed:** Mid-adventure, in a decree's node map, a hidden node contains a person who shouldn't be there. Maybe a foreigner, maybe wounded, maybe just *wrong*.

**Dialogue branches:**

- *Help them* → they give you information, possibly unlock an NPC, no event triggered
- *Demand answers* → tense dialogue, branches further — maybe peace, maybe conflict
- *Attack them* → combat triggers, killing them starts the **War** event
- *Ignore them and leave* → nothing happens. But the dungeon felt different now. Flagged as a missed moment.

**If the War starts:** the reign shifts. The king's voice becomes more desperate. Slay and Defend decrees become common. Certain locations become war zones. Hours tighten. The player is in a war they caused, and they know it.

**Aftermath:** depending on how the war resolves, the kingdom changes. An NPC might die. A location might be altered for future reigns. Or: peace returns and the player carries the weight of what they started.

**Why this works as a showcase:** it's a *choice*. A real one. The player had agency, they picked, and the world responded massively. That's the kind of moment players never forget.

### The Old Smith — A Character Event

A **Mystery** event about worldbuilding and the fairy.

**Seed:** An old traveling smith arrives at the forge during cozy time. He knows the fairy. He calls her by a name the prodigy has never heard.

**Dialogue branches:**

- *Let him talk* → he shares stories about his reign long ago, reveals fragments of lore, hints at the fairy's nature without saying anything directly
- *Push for details* → the fairy interrupts, gets angry, drives him off
- *Ask about her name* → she shuts it down hard, with consequences for the player's relationship with her
- *Learn his craft* → unlock a specific forge upgrade or technique

**Modifiers during event:** the old smith stays at the forge for 2–3 decrees. He offers commentary on decrees, materials, the king. His presence subtly changes forge options — a new upgrade available, different market inventory because he brought goods.

**Aftermath:** he leaves. The fairy is quieter for the rest of the reign. If the player pushed her hard, she's colder. If they were respectful, she's almost warm for a little while.

**Why this works:** pure worldbuilding. No combat or war required. A conversation that reveals character and lore, with modifiers that are quiet but emotionally weighted. This is the event a player thinks about later.

### The Traveling Circus — A Gift Event

A **Gift** event that's pure flavor and texture.

**Seed:** A caravan arrives at the market. Odd people. Odd wares. Something off.

**Dialogue branches:**

- *Browse normally* → access to strange inventory, rare trinkets, unusual consumables
- *Engage with the fortune teller* → a dialogue that might hint at future reigns, or unlock a rare NPC, or be cryptic nonsense
- *Challenge the strongman* → a combat minigame, reward for winning
- *Investigate the back of the caravan* → a secret, something weird, maybe a rare discovery

**Modifiers during event:** market inventory is transformed. Mystical merchant guaranteed to visit. Some weird consumables only available during the circus.

**Aftermath:** they leave. Some players who engaged deeply might have unlocked something. Some players who browsed normally just got good shopping.

**Why this works:** a *gift* to the player that's also a story. No pressure, no stakes, just a strange event that made this reign feel different.

### The Plague — A Problem Event

A **Problem** event with a clear optional resolution path.

**Seed:** A courier arrives at the forge with news — sickness is spreading. The king acknowledges it in his next decree.

**Dialogue branches:** (during subsequent cozy times and encounters)

- *Investigate the source* → unlocks a special Investigate decree that can end the event
- *Stockpile heals* → no special action, just ride it out
- *Ignore it* → the event runs its full duration
- *Help a specific NPC* → unlocks the plague doctor as a recurring NPC

**Modifiers during event:** markets have reduced inventory. Heal effectiveness is reduced. Some NPCs are sick and unavailable. Some locations add infected enemy variants.

**Duration:** 3–5 decrees, or until the Investigate decree is completed.

**Resolution:** natural expiration, OR early resolution via the Investigate decree (rewarded with rare discovery and plague doctor NPC unlock).

**Aftermath:** if full-length, some NPCs remain unavailable. If early-resolved, the plague doctor joins the player's unlocked NPC pool.

**Why this works:** it's a crisis the player can engage with or endure. Either choice is valid. The event produces a real story either way.

## Events and Meta Progression

Events intersect with meta progression in multiple ways:

- **Discovering a new event type can be a meta unlock.** First time you experience the Plague, it enters your "events that might happen" pool for future reigns.
- **Events can reward meta unlocks on completion.** Ending the Plague early by completing the Investigate unlocks the plague doctor NPC.
- **Rare events are long-tail content.** Players who have played 50 reigns might finally see an event tied to some obscure condition they never triggered before.
- **Events interact with all other meta tracks.** The Plague references NPCs. The Circus references the merchant. The War references locations. Events tie the other meta tracks together into stories.

## Events as Texture

This is the value events produce, stated plainly:

> **Events are the reason players remember reigns by their stories, not their numbers.**

Without events, reigns are sequences of decrees under a king. Variety comes from meta unlocks and rolls. With events, reigns become *narratives*. "The reign where the plague broke out in Phase 2." "The reign where a fair came through and I finally saw the merchant carry a rare trinket." "The reign where I attacked a stranger in a dungeon and started a war that lasted six decrees."

Players don't remember reigns by their phase numbers. They remember them by their events.

## Scope Honesty

Events are the biggest remaining design system in the game and will take the most writing. Some honest notes:

- **Dialogue system.** Already exists in prototype form, doesn't need to be built from scratch. This is what makes events implementable without massive new infrastructure.
- **Writing burden is real.** Each event needs multiple dialogue branches, narrative beats, and possibly character voices. Writing is the main cost of events, not engineering.
- **v1 should ship one event, fully realized.** Rather than five events half-done. That one event becomes the template for all future events. Good candidate: a character-focused event like The Old Smith, since it doesn't require new combat or map features and showcases the dialogue system at its best.
- **Events should be designed in parallel with prototyping**, not after. Every time another system is prototyped, consider how events could interact with it.

---

## Block C — Summary of Locked Decisions

- Events are the narrative and worldbuilding layer, not a modifier system with flavor
- One event maximum active at a time
- Events are rare — not every reign has one
- Events must give meaningful choices, reveal worldbuilding, and change the reign
- Events work through the existing dialogue system with branching choices
- Event anatomy: seed, branches, trigger path, world state change, modifiers, ongoing moments, resolution, aftermath
- Four event roles: Problem, Pressure, Gift, Mystery
- Events can be triggered randomly, by player action, by meta unlocks, or by location
- Events intersect with all other meta tracks and can unlock NPCs, locations, and other events
- v1 ships one fully-realized event as a template

---

## Open Questions Across the Whole Jam

Things touched on but not fully locked.

1. **Phase length tuning.** The "3 decrees per phase" shape is a sketch. Real pacing needs playtesting.
2. **Escalation axis priorities.** Which axes turn at which phases under which kings needs tuning passes.
3. **King tempers beyond the four.** A fifth or sixth king temper might exist. Needs design work later.
4. **King unlock tree specifics.** The branching tree is sketched, not designed.
5. **Reign-end scene specifics.** Scene list is illustrative. Real scenes need writing and trigger logic.
6. **Death scene consistency.** Is it a single universal scene, or are there variants based on how you died?
7. **Event frequency tuning.** "40–60% of reigns have an event" is a guess.
8. **Aftermath persistence scope.** Does aftermath last only the current reign, or can it carry across reigns? v1 is likely current-reign only.
9. **Decree type prototype priority.** Which decree types ship in v1 vs. later.
10. **Whether the map system supports all six decree types.** Escort and Investigate may need map features that don't exist yet.

---

## What This Jam Adds to the Design

Pulling back — what this doc gives us that we didn't have before:

- **A fully-defined decree.** Eight components, six types, binary outcomes, extraction-as-controlled-failure, fight-for-your-life moments.
- **A clear reign arc.** Four phases, seven escalation axes, pull-not-push framing, failure as inevitable pressure outpacing growth.
- **Kings as the difficulty lever.** Player-picked, meta-unlockable, shaping the whole reign's personality.
- **Reign endings that honor the prodigy.** Scenes outside the king's purview. Six reign-end scene types plus one punctuation death scene.
- **Events as the narrative layer.** Not weather. Short stories the player lives inside of, with meaningful branching choices and lasting consequences.
- **The dialogue system formally entering the design.** It already exists; events make it central.
- **A complete picture of how a reign feels.** From loadout pick to final scene, every moment of a reign now has a design intention behind it.

The game now has its structure (Adventure Mode), its soul (Worldbuilding), its cozy time (Forge Session), its meta layer (Meta Progression), its in-run texture (In-Run Design), and its tactical/arc/narrative layer (this doc).

The big remaining design holes are the craft verbs (Combine and Break-and-Rebuild mechanics), the loadout screen UI, and the specific content catalogs. Everything else is now drawn.

---

## Summary of All Locked Decisions in This Jam

For quick reference:

- Decrees have 8 components and six types (Slay, Retrieve, Defend, Escort, Investigate, Survive)
- Decree types are also map/combat generator instructions
- Decrees are delivered by the king's voice in a four-beat presentation
- Decrees are binary: success or fail, no partial rep credit
- Extraction is controlled failure — preserves adventure gains, burns full reputation
- Death is the only outcome that loses adventure gains — the thing to fear
- Extract can be removed to create fight-for-your-life moments
- Reigns have four phases: Audition, Trust, Strain, End
- Escalation across seven axes, tuned per phase
- Escalation is pull, not push
- Kings are player-picked at the loadout screen, replacing difficulty settings
- Four king tempers: Patient, Cruel, Desperate, Distracted
- Kings are the 7th meta track with conditional unlock paths
- Loadout is four picks: King, Forms, Forge Upgrades, Spirit Themes
- Reign-end is the prodigy's story, not the king's verdict
- Six reign-end scene types + one distinct death scene (fast, brutal, red and black)
- Events are narrative moments with mechanical consequences, not the other way around
- One event maximum at a time
- Events must have meaningful choices, worldbuilding, and lasting change
- Events work through the existing dialogue system
- Four event roles: Problem, Pressure, Gift, Mystery
- Events intersect with every other meta track
- v1 ships with one fully-realized event as a template