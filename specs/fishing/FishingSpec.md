# Wobbly Anvil — Fishing System Spec: "Gone Fishin'"

**Status:** 📝 DESIGN DRAFT  
**Type:** Standalone game mode with own progression  
**Depends on:** GameMode system (DES-1), Bus/Event system, Economy hooks

---

## 1. Core Identity

A full-day side activity. Pure fun — no obligation, no pressure. You go to the pond, fish, enjoy the environment, and come home with food buffs and trophies. The environment is a major character — each location has its own mood, hazards, wildlife, and fish pool.

Side-view presentation. Left side of screen controls the rod. Right side controls the reel. It should *feel* like fishing — cast, wait, react, fight, land.

---

## 2. Day Integration

- Accessible from the morning phase — "Go Fishing" as an alternative to forging
- Costs the entire day — no forging, no shop, no customers
- Returns at end of day with cooked meals, trophies, catalog progress, fishing XP
- Stamina is not consumed (you're relaxing) — but hazards can end your trip early

---

## 3. Separate Economy: Scales

Fishing has its own currency called **Scales** (working name).

| Rule | Detail |
|------|--------|
| Earned by | Selling fish to the local fishmonger at the pond |
| Spent on | Gear, bait, boat upgrades, cooking ingredients — all at fishing locations |
| Converts to gold? | **No.** Scales do not become gold. Gold does not become Scales. |
| Persists between trips? | **Yes.** Your Scales balance carries over. |
| Shared across locations? | **Yes.** Scales are universal across all fishing spots. |

This keeps fishing self-sustaining and prevents it from breaking the forge economy. You fish → sell catch for Scales → buy better gear → catch better fish.

---

## 4. What Comes Home / What Stays

### Comes Home With You

| Item | Notes |
|------|-------|
| Cooked meals | Limited carry slots. Provide temporary buffs for forging/battle. |
| Trophy fish | Record-breakers. Mount on shop wall for cosmetic + small passive rep bonus. |
| Catalog progress | Permanent. Species discovered, size records. |
| Fishing rank XP | Permanent. Unlocks locations and gear tiers. |

### Stays at the Pond

| Item | Notes |
|------|-------|
| Raw fish | Sell or cook before leaving. **Fish rot if not used — they do not persist between trips.** |
| Scales | Your fishing wallet. Persists between trips. |
| All gear | Stored at the pond. You pick it up when you arrive. |
| Boat + upgrades | Docked at the location. |
| Cooking station | Located at each fishing camp. |

---

## 5. Session Flow

```
MORNING → Player chooses "Go Fishing" → Travel transition

ARRIVE AT LOCATION
  ├── Gear up at Tackle Box (loadout screen)
  ├── Buy/upgrade gear from shop (Scales)
  ├── Head to water (shore or boat)

FISHING SESSION
  ├── Cast → Wait → Bite → Hook → Fight → Land → Catch (repeat)
  ├── Hazards layer on top of fishing (concurrent, not interrupting)
  ├── Fairy ambient companion
  └── "Death" (hazard failure) = trip ends early, keep catches so far

END OF SESSION (timer/event limit reached, player chooses to leave, or "death")
  ├── Back at fishing camp
  ├── Sell raw fish → earn Scales
  ├── Cook fish (fish + 1 ingredient) → meals with buffs
  ├── Mount trophy fish (if record-breaker)
  └── Travel home

EVENING → Back at shop with meals + trophies + XP
```

---

## 6. Locations

Three locations, each with shore fishing + deep water zone (boat required).

| Location | Vibe | Shore Fish | Deep Water Fish | Hazards | Unlock |
|----------|------|------------|----------------|---------|--------|
| **Millpond** | Calm, lily pads, frogs, dragonflies | Bluegill, Catfish, Perch | Bass, Pike | Mosquitoes, Snapping Turtle | Default — always available |
| **River** | Moving water, rocks, forest canopy | Trout, Salmon, Crayfish | Sturgeon, Eel | Bears (shore), Rapids (boat) | Fishing Rank 3 (TBD) |
| **Coast** | Ocean, waves, seabirds, mangroves | Flounder, Sea Bass, Crab | Tuna, Swordfish, Marlin | Crocs (mangrove shore), Sharks (deep) | Fishing Rank 6 (TBD) |

Each location has its own dock, shop, cooking station, and fish pool.

---

## 7. Boat System

- **Purchase:** Modest base cost in Scales. Available at each location's shop once unlocked.
- **What it does:** Unlocks deep water zones within a location. Different fish pool, different hazards.
- **Boat flow:**
    1. Player is on shore fishing normally
    2. Chooses "Take Boat Out"
    3. Transition: character rows/motors out, screen scrolls to the right
    4. New scene: deep water. Different fish pool, different hazards
    5. Can return to shore anytime
- **Upgrades (big Scale sinks):**
    - Engine upgrade (faster travel, repositioning)
    - Hull upgrade (more stable — harder to capsize from shark bumps)
    - Fish finder (shows fish shadow silhouettes in the water — preview what's below before casting)

---

## 8. Tackle Box — Loadout Screen

Opens like an equipment/inventory screen. Visual: an open tackle box with compartments.

**Four fixed slots:**

| Slot | What Goes Here |
|------|---------------|
| **Rod** | Determines cast distance, sensitivity (bite signal clarity), fight control |
| **Line** | Weight affects strength (snap resistance) vs stealth (heavier = fewer bites). Length affects cast range + slack during fights. |
| **Setup** | Jig or Bobber. Determines wait-phase interaction style. |
| **Bait** | Determines which fish species are attracted. Cheap bait = common fish. Rare bait = rare fish. |

- Equipped gear shown in slots
- Owned but unequipped gear visible in inventory below
- Swap gear before heading to water
- All gear stored at the pond — does not travel home with you

---

## 9. Gear Tiers

Unlocked by fishing rank. Purchased with Scales at the location shop.

| Tier | Rod | Line | Bait | Boat | Rank Unlock |
|------|-----|------|------|------|-------------|
| **Starter** | Bamboo rod (short cast, low control) | Thin line (snaps easy) | Worms (common fish only) | None — shore only | Default |
| **Mid** | Oak rod (better cast + sensitivity) | Braided line (stronger) | Minnows, Insects (mid-tier fish) | Rowboat (slow, small deep water area) | Rank 2–4 (TBD) |
| **High** | Steel rod (long cast, great control) | Wire line (very strong) | Specialty lures (rare fish) | Motorboat (full deep water, faster) | Rank 5–8 (TBD) |

---

## 10. Fishing Rank

- XP earned per catch, scaled by fish rarity + size
- Rank thresholds unlock gear tiers at the shop + new locations
- **No passive perks.** No hidden bonuses. Your power comes from gear. Your skill comes from you.
- Visible rank bar on the fishing HUD

---

## 11. Fishing Phases — Detailed

Side-view. Left side = rod controls. Right side = reel controls.

### Phase 1: CAST

**Gesture: Back-swipe → Hold → Forward flick**

1. **Pull back** — swipe down/back on left side. Rod bends back visually.
2. **Hold** — longer hold = more power. Visual: rod bend increases, subtle power indicator. Capped at max.
3. **Flick forward** — swipe up/forward with directional aim. Angle of flick = where line lands on the water.
4. **Release** — line flies out, bobber/jig splashes down at target location.

**What matters:**
- Power = distance (how far across the water)
- Angle = horizontal position (aim left, center, right)
- You can cast ANYWHERE on the water — every spot can catch fish

### Bubble Hotspots

- Bubbles appear periodically at random positions on the water surface
- Visual: cluster of rising bubbles, subtle at first, gets more active
- Each hotspot lasts 8–15 seconds, then fades and reappears elsewhere
- Landing your cast on or near bubbles = faster bites + higher rarity rolls

| Cast Accuracy | Bite Speed | Rarity Bonus |
|---------------|-----------|--------------|
| **On the bubbles** | Fast (2–4 sec) | Big rarity boost — chance at rare species |
| **Near bubbles** (close miss) | Medium (4–8 sec) | Small rarity boost |
| **Anywhere else** | Normal (6–15 sec) | Base odds from location fish table |

No cast should ever leave you waiting too long. Worst case ~15 seconds. Bubbles reward attentive players without punishing casual casters.

### Phase 2: WAIT

After casting, the line is in the water.

**Bobber setup (passive):**
- Bobber sits on surface. Watch for dips.
- 1–3 fake nibbles (small visual dip, no sound cue) before the real bite
- Ambient vibes — water ripples, bugs, birds, fairy floating around
- Hazards can trigger during wait

**Jig setup (active):**
- Player taps left side to twitch the jig — active lure work
- Fish are attracted by the twitching motion
- Better bite rate than bobber at the same spot if you work it consistently
- Reward for extra effort: faster bites + slightly better rarity
- Hazards still layer on top

### Phase 3: BITE

**Bobber:** Real bite = hard pull + sound cue + bobber yanks under water. Tap to set hook within the timing window.
- Too early (reacted to a fake nibble) = fish spooked, re-cast
- Too late = fish gone, re-cast

**Jig:** Fish strikes mid-twitch. Feel resistance feedback (vibration on mobile, visual rod bend). Tap-and-hold to set hook. No fake nibbles, but reaction window is tighter since you're already actively tapping.

### Phase 4: HOOK SET

Quick reaction QTE immediately after detecting the bite — ring shrink or sharp pull-back gesture.

| Hook Quality | Effect on Fight |
|-------------|----------------|
| **Perfect** | Solid hook. Fish fight stamina starts lower. Tension thresholds more forgiving. |
| **Good** | Normal hook. Standard fight parameters. |
| **Weak** | Barely hooked. Fish can shake free easier. Tension thresholds tighter. |

### Phase 5: FIGHT

**The main event.** Tug-of-war between player and fish.

**Left hand (rod):** Drag up/down to control rod angle. Affects tension — pulling up increases tension (reels fish closer but risks snap), lowering rod releases tension (gives fish slack but loses progress).

**Right hand (reel):** Circular gesture to reel in. Speed of gesture = reel speed. Stop gesture = let line slack out.

**Line Tension Meter — Core Mechanic:**

| Zone | State | What to Do |
|------|-------|-----------|
| **Green** | Safe. Fish is tired. | Reel freely. Pull it in. |
| **Yellow** | Tension rising. | Slow down reeling. Lower rod angle. Caution. |
| **Red** | DANGER. Line about to snap. | STOP reeling. Drop rod. Let the fish run. |

- If tension stays in red too long → **line snaps**, fish lost
- If you're too passive for too long → **fish escapes** (stamina recovers, eventually shakes hook)
- Fish has a **stamina bar** that depletes as you fight. Depleted stamina = fish stops pulling, easy reel-in to landing phase.

**Fish AI behaviors (species-specific, complex from day one):**
- **Dart** — fish bolts left or right. Tension spikes if you don't counter-angle the rod.
- **Dive** — fish goes deep. Sustained tension increase. Hold steady, don't reel.
- **Thrash** — rapid tension spikes. Stop reeling, ride it out.
- **Run** — fish swims away fast. Line length matters — short line = less room before snap.
- **Surface** — fish jumps. Brief tension drop, then spike on re-entry. Chance to shake hook if weak hook set.

Rarer/larger fish = more aggressive patterns + longer fights + more stamina.

### Phase 6: LAND

Fish is close to shore/boat. One final well-timed action — timing tap + last reel burst.

- **Success:** Fish caught. Proceed to catch screen.
- **Miss:** Fish gets a second wind — partial stamina restored, back to FIGHT phase. Only one retry before fish escapes.

### Phase 7: CATCH

Result screen. Fish species revealed, size rolled, catalog entry updated. Player sees the fish, its stats, and whether it's a new record.

---

## 12. Hazard System

Hazards layer on top of fishing — they do NOT interrupt an active fishing sequence. You might be mid-fight with a fish AND swatting mosquitoes.

**"Death" = trip ends early.** You don't literally die. You get knocked out of the fishing session and return to camp with whatever you caught so far.

### Hazard Table

| Hazard | Where | Trigger | QTE to Survive | Failure = |
|--------|-------|---------|---------------|-----------|
| **Mosquitoes** | All locations | Ambient timer — swarm builds gradually | Tap to swat. Ignore too long = overwhelmed | Trip ends ("bit to shreds, heading home") |
| **Big fish yank** | During fight with large fish | Line tension spikes into deep red | Release tension (drop rod) in time | Pulled into water. Trip ends. |
| **Off balance** | During fight with large fish | Fish pulls too hard, balance feedback on screen | Counter-lean gesture or release line | Fall in. Trip ends. |
| **Snapping Turtle** | Millpond shore | Bubbles near feet → turtle lunges | Reaction tap — jump back | Bitten. Trip ends. |
| **Bear** | River shore | Rustling bushes → bear appears | Stay still QTE (don't move/tap for X seconds) | Scared off by bear. Trip ends. |
| **Croc** | Coast mangrove shore | Bubbles near shore → croc slides in | Reaction QTE — dodge/jump | Eaten. Trip ends. |
| **Shark** | Coast deep water (boat) | Bubbles near boat → bump | Brace QTE — hold steady | Fall overboard → swim-back phase |
| **Overboard (shark)** | After failed shark QTE | In the water, shark circling | NES-style rapid tap to swim back to boat | Shark catches you. Trip ends. |

### Mosquito Details
- Not a one-shot event — builds over time as ambient annoyance
- Small mosquito icons appear at screen edges, buzzing in
- Tap them to swat. Each swat buys time.
- If you ignore them completely, they overwhelm you after a threshold
- Creates multitasking tension: you're fishing AND swatting

---

## 13. Cooking System

Located at fishing camp. Simple recipe system.

**Recipe = Fish + One Ingredient**

- Ingredients purchased from the pond shopkeeper for Scales
- Each valid combo produces a specific named meal with a specific buff
- Unknown/experimental combos produce "Mystery Stew" with a random minor buff
- Recipes are discovered by cooking them — catalog tracks all discovered recipes

### Meal Carry Limit

- Limited carry slots for bringing meals home (exact number TBD — 3–5 range)
- Forces a choice: which buffs do I need most right now?
- Carry capacity could be tied to tackle box upgrade (TBD)

### Buff Types (Examples)

| Buff Category | Example Effect |
|--------------|---------------|
| Stamina restore | Recover X stamina points at start of next forge day |
| Strike bonus | +1 bonus forge strike for next session |
| QTE speed | QTE needle moves slightly slower for next forge session |
| Reputation boost | Small rep bonus on next weapon sold |
| XP bonus | Bonus XP on next forge completion |

Buffs are temporary — single use, consumed on next relevant action.

---

## 14. Trophy Fish

- When you catch a fish that beats your personal size record for that species, it's flagged as a trophy candidate
- At end of session, you can choose to mount it on your shop wall
- Shop wall displays: fish species, size, location caught
- Cosmetic + small passive reputation bonus (customers impressed by trophies)
- Trophy collection is part of the catalog/completionist layer

---

## 15. Fish Catalog

Collectible log tracking:

- Every species discovered (with silhouettes for undiscovered)
- Size records per species (personal best)
- Location where each species was caught
- Bait preference hints (unlocked after catching X of that species?)
- Total species count / completion percentage

---

## 16. Fairy at the Pond

She tags along. Ambient companion energy — not intrusive.

Perches on a rock, floats on a lily pad, sits on the boat railing. Comments on:

- Big catches ("THAT'S A MONSTER!")
- Near-misses ("Oh no, it got away...")
- Hazard warnings ("Watch out — bubbles!")
- Long dry spells ("...maybe try different bait?")
- New records ("That's your biggest trout yet!")
- Rare species ("I've never seen one of THOSE before!")
- Environmental flavor ("Beautiful day for fishing...")

Uses the same fairy controller pipeline — bus-driven reactive triggers scoped to fishing event tags.

---

## 17. Controls Summary

Side-view. Split screen controls.

| Phase | Left Side (Rod) | Right Side (Reel) |
|-------|-----------------|-------------------|
| **CAST** | Back-swipe → hold → forward flick with aim | — |
| **WAIT (Bobber)** | — (watch and wait) | — |
| **WAIT (Jig)** | Tap to twitch lure | — |
| **BITE** | Tap to react to bite | — |
| **HOOK** | Pull-back gesture or ring QTE | — |
| **FIGHT** | Drag up/down for rod angle / tension | Circular gesture to reel. Speed = reel speed. Stop = slack. |
| **LAND** | Final timing tap | Last reel burst |
| **CATCH** | — | — |
| **Hazards** | Varies (tap to swat, reaction taps, hold still) | Varies |

---

## 18. Architecture

```
src/fishing/
├── fishingConstants.js     — fish table, gear table, location table, tension config, rank thresholds
├── fishingLogic.js         — pure functions: tension calc, fish AI tick, catch scoring, hazard timers
├── useFishingState.js      — state hook: phase, gear, tension, fish stamina, catalog, haul, Scales
├── useFishingVM.js         — viewmodel: display-ready props for view
├── FishingView.js          — side-view scene, split controls, HUD, environment art
├── fishingHazards.js       — hazard definitions, QTE configs per hazard type
├── fishingCatalog.js       — fish species data, size ranges, bait preferences, location pools
├── fishingCooking.js       — recipe table, ingredient list, buff definitions
└── TackleBox.js            — loadout/equip screen component
```

Bus integration:
- `FISHING_MODE_ENTER` / `FISHING_MODE_EXIT` — mode transitions
- `FISHING_CAST`, `FISHING_BITE`, `FISHING_HOOK`, `FISHING_FIGHT_TICK`, `FISHING_LAND`, `FISHING_CATCH` — phase events
- `FISHING_HAZARD_TRIGGER`, `FISHING_HAZARD_RESULT` — hazard events
- `FISHING_SELL`, `FISHING_COOK` — economy events
- Fairy controller listens to fishing bus tags for reactive commentary

---

## 19. Open Questions (TBD — Playtest)

| Question | Status | Notes |
|----------|--------|-------|
| Session length — timer or event-count? | TBD | Real-time minutes vs "X casts per trip" |
| Exact carry slot count for meals | TBD | 3–5 range. Upgradeable? |
| Fishing rank thresholds | TBD | XP per rank, how many ranks total |
| Specific fish stats (weight ranges, rarity weights) | TBD | Need fish table |
| Specific gear stats (cast distance values, line strength values) | TBD | Need gear table |
| Cooking recipe table | TBD | Fish + ingredient combos and resulting buffs |
| Ingredient list and prices | TBD | What the shopkeeper sells |
| Boat upgrade costs | TBD | Base modest, upgrades expensive |
| Hazard frequency tuning | TBD | How often each hazard triggers per session |
| Bear QTE — "stay still" on mobile | TBD | How does "don't touch the screen" read as a QTE? Timer overlay? |
| Fish finder upgrade — how much info? | TBD | Shadow silhouettes? Species hints? Just "fish nearby" indicator? |
| Trophy wall — max display slots? | TBD | Unlimited or fixed wall space? |
| Mystery Stew buff pool | TBD | What random buffs can it give? |

---

*This spec will be expanded as systems are designed in detail. Fish tables, gear tables, recipe tables, and tuning values will be added as separate sections or companion files.*