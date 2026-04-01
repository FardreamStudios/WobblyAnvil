# Battle Folder Restructure — Execution Guide

**Date:** 2026-04-01
**Last updated:** 2026-04-01 (post Turn 5)

---

## Extraction Log

| Turn | What Extracted | From | To | Lines Moved | Risk |
|------|---------------|------|----|-------------|------|
| 1 | Folder restructure + 3 new files | — | config/, components/, systems/, hooks/ | 0 (path only) | LOW |
| 2 | ATB tick loop → hook + bus subscriber | BattleView.js | hooks/useBattleATBLoop.js | ~70 | MEDIUM |
| 3 | Playback sequencing (offense + defense + finishSwing) | BattleView.js | managers/battlePlaybackManager.js | ~250 | MEDIUM |
| 4 | Combat hit resolution (applyDefenseOutcome, resolveHitOnReceiver, ring QTE unification) | BattleView.js | managers/battlePlaybackManager.js | ~165 | MEDIUM |
| 5 | Target pickers | BattleView.js | systems/battleHelpers.js | ~15 | LOW |

**BattleView.js: 2161 → 1698 lines (−463, −21%)**

---

## Final Structure (post Turn 5)

```
src/battle/
├── BattleView.js              (1698 lines — view controller)
├── BattleView.css
├── BattleTransition.js
├── battleState.js
├── battleBus.js               ★ per-battle event bus factory
├── battleTags.js              ★ 40+ bus event tag constants
│
├── config/
│   ├── battleConstants.js
│   ├── battleSkills.js
│   └── battleLayout.js
│
├── managers/
│   └── battlePlaybackManager.js  ★ beat sequencing + hit resolution
│
├── hooks/
│   └── useBattleATBLoop.js       ★ ATB tick loop + ATB_READY emit
│
├── components/
│   ├── BattleCharacter.js
│   ├── BattleResultsScreen.js
│   ├── ActionMenu.js
│   ├── ActionCamInfoPanel.js
│   ├── ATBGaugeStrip.js
│   ├── ComicPanel.js
│   ├── ItemSubmenu.js
│   ├── SkillSubmenu.js
│   ├── DevControls.js
│   ├── Chalkboard.js
│   └── QTERunner.js
│
└── systems/
    ├── battleAI.js
    ├── battleATB.js
    ├── battleSFX.js
    ├── battleHelpers.js          ★ pure target picker utilities
    ├── defenseTiming.js
    └── gestureRecognition.js
```

---

## Bus Architecture

**battleBus.js** creates a fresh event bus per battle (created on mount, destroyed on unmount). All extracted modules emit events on this bus instead of calling React state setters directly. BattleView subscribes to these events and drives React state.

**Key bus flows:**

```
useBattleATBLoop
  → emits ATB_READY({ combatantId })
  → BattleView subscriber: clear defend buffs, route to ACTION_SELECT or AI

PlaybackManager.runOffense / runDefense
  → emits ANIM_SET, ANIM_CLEAR, FLASH, SHAKE, SPAWN_DAMAGE, BEAT_RESOLVE
  → emits BEAT_TELEGRAPH (defense path — triggers CSS telegraph-sync)
  → emits BEAT_DEFENSE_WINDOW (opens/closes defense input callback)
  → emits SWING_COMPLETE
  → BattleView subscribers: map to setAnimState, setFlashId, setShakeLevel,
    spawnDmgAt, bumpState, setPhase(CAM_RESOLVE), advanceOrCamOut

PlaybackManager.resolveDefenseHit / resolveOffenseHit
  → same bus events as above (used by ring QTE path per-beat)
```

---

## BattleView.js Anatomy (~1698 lines)

What remains in BattleView is the **view controller layer** — bespoke wiring that connects extracted systems to React state. By the architecture guide's rule ("keep it bespoke when only one component uses it"), this code belongs here.

### Section Map

| Lines (approx) | Section | What It Does |
|----------------|---------|-------------|
| 1–55 | Imports | Config, systems, components, managers, hooks, bus |
| 56–97 | Constants & CSS vars | Destructure BattleConstants, comic lines, root CSS vars |
| 98–125 | useStageScale | Viewport scaling hook (local, not extracted — single consumer) |
| 126–210 | State declarations | All useState/useRef: phase, targets, ATB, anim, damage, menus, refs |
| 210–275 | Slot map + resting rects | Stage-space position mapping per wave, snapshot on cam enter |
| 275–320 | ATB hook + ATB_READY sub | useBattleATBLoop call + bus subscriber for turn routing |
| 320–400 | Playback bus subscribers | 9 subscribers mapping manager events → React state setters |
| 400–470 | Helpers | isPartyId, stagePos, spawnDamageNumber, spawnDmgAt, spawnSkillName |
| 470–530 | Dev handlers | Toggle ATB, fill pips, full reset |
| 530–570 | QTE callbacks | handleQTERingStart (CSS sync), handleQTEComplete |
| 570–625 | handleQTERingResult | Ring QTE per-beat resolution (delegates to PlaybackManager) |
| 625–710 | Defense input handlers | Scene touch/click → DefenseTiming → defenseInputResolveRef |
| 710–875 | Exchange lifecycle | startExchange, handleCamATK, doCamSwing, enemy auto-swing effect |
| 875–980 | Exchange routing | advanceOrCamOut, handleCamRelent, handleCamPass, camOut, swapSides |
| 980–1000 | Battle end | triggerBattleEnd, wave transition |
| 1000–1060 | Wave transition | startWaveTransition — swap enemies, banner, resume ATB |
| 1060–1100 | Formation actions | handleAction router, target pickers (delegated to BattleHelpers) |
| 1100–1200 | Action handlers | handleDefend, handleFlee, deductPip, endFormationTurn, endAction |
| 1200–1320 | Item system | handleItemUse (target resolution + apply + feedback), handleItemClose |
| 1320–1400 | In-cam buttons | handleCamATKButton, handleSkillSelect, handleCamItem, handleCamDefend |
| 1400–1450 | In-cam button state | Derived booleans for ATK/RELENT/PASS enable/disable |
| 1450–1698 | Render | JSX: stage, characters, action cam, UI panels, menus, QTE overlay |

### What Could Still Be Extracted (Future)

These are not blocked — just lower priority than feature work:

| Candidate | Blocker | Effort |
|-----------|---------|--------|
| Exchange lifecycle (startExchange → camOut) | Touches 7+ state setters, 5+ refs. Would need full phase-change bus-ification or massive context arg. | HIGH |
| Formation action handlers (handleDefend, handleFlee, handleItemUse) | Coupled to UI state (menus, target selection, phase routing). | MEDIUM-HIGH |
| Defense input handlers | Coupled to defenseActiveRef, defenseTouchStartRef, DefenseTiming. Small. | LOW but tiny win |
| doCamSwing QTE/playback dispatch | Bridges QTE activation + PlaybackManager. Tightly wired to both. | HIGH |

**Recommendation:** Further extractions require bus-ifying phase transitions (setPhase as bus emit). That's essentially the Engagement System rework — better to do it as part of that feature rather than as a standalone refactor.

---

## Key Files Reference

| File | Layer | Owns |
|------|-------|------|
| battleBus.js | Infrastructure | Per-battle event bus factory. create/destroy lifecycle. |
| battleTags.js | Infrastructure | All BATTLE:* event tag constants. Single source of truth. |
| useBattleATBLoop.js | Hook | RAF tick loop, ATB fill, ATB_READY emit. No phase/turn logic. |
| battlePlaybackManager.js | Manager | Beat-by-beat offense/defense sequencing. Defense outcome resolution. All visual feedback via bus events. |
| battleHelpers.js | System | Pure target picker utilities (pickFirstLivingEnemy, etc). |
| battleState.js | Model | Mutable combatant data (HP, items, KO, buffs). bState.get/snapshot/applyDamage. |
| battleAI.js | System | Enemy decision-making. pickAction(combatantState, bState). |
| battleATB.js | System | ATB math: tick, initState, reset, checkReady, fillAll. |
| battleSFX.js | System | Sound effect triggers. Stateless. |
| defenseTiming.js | System | Defense window timing: init, resetBeat, recordStrikeAnchor, checkInput. |
| BattleView.js | View Controller | Phase state machine, exchange lifecycle, formation actions, render. |

---

## Import Map (BattleView.js)

```
BattleView.js imports:
  config/    → battleConstants, battleSkills
  systems/   → battleATB, battleSFX, battleAI, defenseTiming, gestureRecognition, battleHelpers
  components/→ QTERunner, Chalkboard, BattleCharacter, BattleResultsScreen,
               DevControls, ATBGaugeStrip, ActionMenu, ItemSubmenu,
               SkillSubmenu, ComicPanel, ActionCamInfoPanel
  managers/  → battlePlaybackManager
  hooks/     → useBattleATBLoop
  top-level  → battleState, battleBus, battleTags
```

---

## Steps 1–4: Original Restructure Guide

*(Preserved below for reference — all steps completed in Turn 1)*

### Step 1: Create Folders

```
src/battle/config/
src/battle/managers/
src/battle/hooks/
src/battle/components/
src/battle/systems/
```

### Step 2: Move Files

#### → config/ (pure data, no logic)
| File | From | To |
|------|------|----|
| battleConstants.js | src/battle/ | src/battle/config/ |
| battleSkills.js | src/battle/ | src/battle/config/ |
| battleLayout.js | src/battle/ | src/battle/config/ |

#### → components/ (React display components)
| File | From | To |
|------|------|----|
| BattleCharacter.js | src/battle/ | src/battle/components/ |
| BattleResultsScreen.js | src/battle/ | src/battle/components/ |
| ActionMenu.js | src/battle/ | src/battle/components/ |
| ActionCamInfoPanel.js | src/battle/ | src/battle/components/ |
| ATBGaugeStrip.js | src/battle/ | src/battle/components/ |
| ComicPanel.js | src/battle/ | src/battle/components/ |
| ItemSubmenu.js | src/battle/ | src/battle/components/ |
| SkillSubmenu.js | src/battle/ | src/battle/components/ |
| DevControls.js | src/battle/ | src/battle/components/ |
| Chalkboard.js | src/battle/ | src/battle/components/ |
| QTERunner.js | src/battle/ | src/battle/components/ |

#### → systems/ (pure JS, no React)
| File | From | To |
|------|------|----|
| battleAI.js | src/battle/ | src/battle/systems/ |
| battleATB.js | src/battle/ | src/battle/systems/ |
| battleSFX.js | src/battle/ | src/battle/systems/ |
| defenseTiming.js | src/battle/ | src/battle/systems/ |
| gestureRecognition.js | src/battle/ | src/battle/systems/ |

#### Stays at top level (unchanged)
- BattleView.js
- BattleView.css
- BattleTransition.js
- battleState.js
- battleBus.js
- battleTags.js

### Step 3: Import Updates

All import paths updated in Turn 1. See extraction log above.

### Step 4: Verify

After all moves and import updates:
1. `npm start` — should compile with zero errors
2. Enter a battle — should play identically
3. `grep -r '"./battleConstants.js"' src/battle/` — should only match files IN config/
4. `grep -r '"./battleSFX.js"' src/battle/` — should only match files IN systems/