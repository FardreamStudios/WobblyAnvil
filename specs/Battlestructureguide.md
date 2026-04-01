# Battle Folder Restructure — Execution Guide

**Date:** 2026-04-01
**Risk:** LOW — path changes only, zero logic changes
**Prerequisite:** All three new files created (battleBus.js, battleTags.js, hooks/useBattleATBLoop.js)

---

## Step 1: Create Folders

```
src/battle/config/
src/battle/managers/
src/battle/hooks/
src/battle/components/
src/battle/systems/
```

---

## Step 2: Move Files

### → config/ (pure data, no logic)
| File | From | To |
|------|------|----|
| battleConstants.js | src/battle/ | src/battle/config/ |
| battleSkills.js | src/battle/ | src/battle/config/ |
| battleLayout.js | src/battle/ | src/battle/config/ |

### → components/ (React display components)
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

### → systems/ (pure JS, no React)
| File | From | To |
|------|------|----|
| battleAI.js | src/battle/ | src/battle/systems/ |
| battleATB.js | src/battle/ | src/battle/systems/ |
| battleSFX.js | src/battle/ | src/battle/systems/ |
| defenseTiming.js | src/battle/ | src/battle/systems/ |
| gestureRecognition.js | src/battle/ | src/battle/systems/ |

### Stays at top level (unchanged)
- BattleView.js
- BattleView.css
- BattleTransition.js
- battleState.js
- battleBus.js (NEW)
- battleTags.js (NEW)

---

## Step 3: Update Imports

### 3A. battleConstants.js (now in config/)

**Internal import — battleLayout moved to same folder:**
```
OLD:  import BattleLayout from "./battleLayout.js";
NEW:  import BattleLayout from "./battleLayout.js";
```
*No change needed — they're in the same folder (config/).*

### 3B. QTERunner.js (now in components/)

```
OLD:  import CircleTimingQTEModule from "../modules/circleTimingQTE.js";
NEW:  import CircleTimingQTEModule from "../../modules/circleTimingQTE.js";

OLD:  import ChalkboardModule from "./Chalkboard.js";
NEW:  import ChalkboardModule from "./Chalkboard.js";
```
*Chalkboard stays same folder (both in components/). circleTimingQTE goes up one more level.*

```
OLD:  import BattleSFX from "./battleSFX.js";
NEW:  import BattleSFX from "../systems/battleSFX.js";
```

### 3C. BattleView.js (stays at top level)

Replace the entire import block (lines 30–48):

```
OLD:
import BattleConstants from "./battleConstants.js";
import BattleSkills from "./battleSkills.js";
import BattleATB from "./battleATB.js";
import BattleSFX from "./battleSFX.js";
import BattleStateModule from "./battleState.js";
import QTERunnerModule from "./QTERunner.js";
import ChalkboardModule from "./Chalkboard.js";
import BattleCharacterModule from "./BattleCharacter.js";
import BattleResultsScreen from "./BattleResultsScreen.js";
import DevControls from "./DevControls.js";
import ATBGaugeStrip from "./ATBGaugeStrip.js";
import ActionMenu from "./ActionMenu.js";
import ItemSubmenu from "./ItemSubmenu.js";
import SkillSubmenu from "./SkillSubmenu.js";
import ComicPanel from "./ComicPanel.js";
import ActionCamInfoPanel from "./ActionCamInfoPanel.js";
import BattleAI from "./battleAI.js";
import DefenseTiming from "./defenseTiming.js";
import GestureRecognition from "./gestureRecognition.js";
import "./BattleView.css";

NEW:
import BattleConstants from "./config/battleConstants.js";
import BattleSkills from "./config/battleSkills.js";
import BattleATB from "./systems/battleATB.js";
import BattleSFX from "./systems/battleSFX.js";
import BattleStateModule from "./battleState.js";
import QTERunnerModule from "./components/QTERunner.js";
import ChalkboardModule from "./components/Chalkboard.js";
import BattleCharacterModule from "./components/BattleCharacter.js";
import BattleResultsScreen from "./components/BattleResultsScreen.js";
import DevControls from "./components/DevControls.js";
import ATBGaugeStrip from "./components/ATBGaugeStrip.js";
import ActionMenu from "./components/ActionMenu.js";
import ItemSubmenu from "./components/ItemSubmenu.js";
import SkillSubmenu from "./components/SkillSubmenu.js";
import ComicPanel from "./components/ComicPanel.js";
import ActionCamInfoPanel from "./components/ActionCamInfoPanel.js";
import BattleAI from "./systems/battleAI.js";
import DefenseTiming from "./systems/defenseTiming.js";
import GestureRecognition from "./systems/gestureRecognition.js";
import "./BattleView.css";
```

### 3D. App.js (imports battle files from outside)

```
OLD:  import BattleViewModule from "./battle/BattleView.js";
NEW:  import BattleViewModule from "./battle/BattleView.js";
```
*No change — BattleView stays at top level.*

```
OLD:  import BattleTransitionModule from "./battle/BattleTransition.js";
NEW:  import BattleTransitionModule from "./battle/BattleTransition.js";
```
*No change — BattleTransition stays at top level.*

```
OLD:  import BattleConstants from "./battle/battleConstants.js";
NEW:  import BattleConstants from "./battle/config/battleConstants.js";
```

### 3E. Any component that imports battleConstants directly

Check each moved component file. If it has:
```
import BattleConstants from "./battleConstants.js";
```
Update to:
```
import BattleConstants from "../config/battleConstants.js";
```

**Known files that likely import battleConstants:**
- BattleCharacter.js → `../config/battleConstants.js`
- ActionCamInfoPanel.js → `../config/battleConstants.js`
- ATBGaugeStrip.js → `../config/battleConstants.js`
- ActionMenu.js → `../config/battleConstants.js`
- BattleResultsScreen.js → `../config/battleConstants.js`
- DevControls.js → `../config/battleConstants.js`
- Chalkboard.js → `../config/battleConstants.js`

**Known files that likely import battleSkills:**
- Chalkboard.js → `../config/battleSkills.js`
- SkillSubmenu.js → `../config/battleSkills.js`

**Known files in systems/ that import from config/:**
- battleAI.js → `../config/battleSkills.js` (if it imports skills)
- battleATB.js → `../config/battleConstants.js` (if it imports ATB config)

### 3F. BattleTransition.js (stays at top level)

If it imports battleConstants:
```
OLD:  import BattleConstants from "./battleConstants.js";
NEW:  import BattleConstants from "./config/battleConstants.js";
```

---

## Step 4: Verify

After all moves and import updates:
1. `npm start` — should compile with zero errors
2. Enter a battle — should play identically
3. `grep -r '"./battleConstants.js"' src/battle/` — should only match files IN config/
4. `grep -r '"./battleSFX.js"' src/battle/` — should only match files IN systems/

---

## New Files Summary (already created)

| File | Location | Purpose |
|------|----------|---------|
| battleBus.js | src/battle/ | Event bus factory (new instance per battle) |
| battleTags.js | src/battle/ | All bus event tag constants |
| useBattleATBLoop.js | src/battle/hooks/ | ATB tick loop hook (not wired yet — Turn 2) |

---

## Final Structure

```
src/battle/
├── BattleView.js
├── BattleView.css
├── BattleTransition.js
├── battleState.js
├── battleBus.js           ★ NEW
├── battleTags.js          ★ NEW
│
├── config/
│   ├── battleConstants.js
│   ├── battleSkills.js
│   └── battleLayout.js
│
├── managers/              (empty — populated in Turns 2-5)
│
├── hooks/
│   └── useBattleATBLoop.js  ★ NEW
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
    ├── defenseTiming.js
    └── gestureRecognition.js
```