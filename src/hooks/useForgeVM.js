// ============================================================
// useForgeVM.js — Wobbly Anvil Forge ViewModel Hook
// Owns: All forge logic (QTE handlers, session flow, weapon
//       finishing, WIP management), forge-specific refs,
//       and forge-derived display values.
// Consumes: useForgeState + ForgeMode (phase authority) +
//           cross-domain deps passed in.
// Phase writes go through ForgeMode.transitionTo() first
// (validation + bus emission), then sync React via setPhase().
// Returns: Action handlers + display-ready props.
// ============================================================

import { useRef, useEffect, useCallback } from "react";
import GameConstants from "../modules/constants.js";
import GameUtils from "../modules/utilities.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";
import MysteryLogic from "../logic/mysteryLogic.js";
import ForgeMode from "../gameMode/forgeMode.js";
import AbilityManager from "../systems/ability/abilitySubSystem.js";

// --- Constants ---
var PHASES = GameConstants.PHASES;
var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var HEAT_TIERS = GameConstants.HEAT_TIERS;
var HAMMER_TIERS = GameConstants.HAMMER_TIERS;
var QUENCH_TIERS = GameConstants.QUENCH_TIERS;
var BALANCE = GameConstants.BALANCE;
var QTE_FLASH_MS = GameConstants.QTE_FLASH_MS;
var STRESS_MAX = GameConstants.STRESS_MAX;
var MAT_DESTROY_RECOVERY = GameConstants.MAT_DESTROY_RECOVERY;
var MAT_SCRAP_RECOVERY = GameConstants.MAT_SCRAP_RECOVERY;
var BASE_STAMINA = GameConstants.BASE_STAMINA;

// --- Utilities ---
var rand = GameUtils.rand;
var randInt = GameUtils.randInt;
var clamp = GameUtils.clamp;
var getQualityTier = GameUtils.getQualityTier;
var qualityValue = GameUtils.qualityValue;
var calcSpeedMultiplier = GameUtils.calcSpeedMultiplier;
var calcStrikeMultiplier = GameUtils.calcStrikeMultiplier;
var calcQteResult = GameUtils.calcQteResult;
var qualityGainMultiplier = GameUtils.qualityGainMultiplier;
var randScrapToast = GameUtils.randScrapToast;

// --- Heat gameplay mapping (tier.id → bonus strikes) ---
var HEAT_STRIKE_MAP = { perfect: 2, great: 1, good: 0, poor: 0, bad: 0 };

// --- Hammer gameplay mapping (tier.id → quality points) ---
var HAMMER_POINTS_MAP = { perfect: 12, great: 8, good: 5, poor: -3, bad: -5 };

// ============================================================
// Hook
// ============================================================

function useForgeVM(deps) {
    // --- Unpack dependencies from App.js ---
    var forge = deps.forge;
    var sfx = deps.sfx;
    var addToast = deps.addToast;
    var advanceTime = deps.advanceTime;
    var spendGold = deps.spendGold;
    var gainXp = deps.gainXp;
    // (GEB-5: applyMystery removed — mystery events now fire via bus)
    // (DES-1.1: setInv/setFinished removed — all inventory mutations route through bus)
    var setRoyalQuest = deps.setRoyalQuest;
    var setWeaponShake = deps.setWeaponShake;

    // --- Read-only state from other domains ---
    var gold = deps.gold;
    var inv = deps.inv;
    var finished = deps.finished;
    var stamina = deps.stamina;
    var stats = deps.stats;
    var upgrades = deps.upgrades;
    var pendingMystery = deps.pendingMystery;
    var royalQuestRef = deps.royalQuestRef;

    // --- Forge state (from useForgeState) ---
    var wipWeapon = forge.wipWeapon, setWipWeapon = forge.setWipWeapon;
    var wKey = forge.wKey, setWKey = forge.setWKey;
    var matKey = forge.matKey, setMatKey = forge.setMatKey;
    var phase = forge.phase, setPhase = forge.setPhase;
    var qualScore = forge.qualScore, setQualScore = forge.setQualScore;
    var stress = forge.stress, setStress = forge.setStress;
    var forgeSess = forge.forgeSess, setForgeSess = forge.setForgeSess;
    var setBonusStrikes = forge.setBonusStrikes;
    var sessResult = forge.sessResult, setSessResult = forge.setSessResult;
    var setForgeBubble = forge.setForgeBubble;
    var setQteFlash = forge.setQteFlash;
    var strikesLeft = forge.strikesLeft, setStrikesLeft = forge.setStrikesLeft;
    var isSandbox = forge.isSandbox;

    // --- Forge-owned refs ---
    var qteProcessing = useRef(false);
    var qtePosRef = useRef(0);
    var qualRef = useRef(0);
    var stressRef = useRef(0);
    var sessionStartQual = useRef(0);
    var fbTimerRef = useRef(null);
    var qteClickTime = useRef(0);

    // --- QTE Diagnostic Logger ---
    function qteLog(phase, event, extra) {
        var now = performance.now();
        var delta = qteClickTime.current ? Math.round(now - qteClickTime.current) : 0;
        if (delta > 100 || event === "CLICK") {
            console.log("[QTE:" + phase + "] " + event + " | delta=" + delta + "ms" + (extra ? " | " + extra : ""));
        }
    }

    // --- Derived Values ---
    var weapon = WEAPONS[wKey] || WEAPONS.dagger;
    var matData = MATS[matKey] || MATS.bronze;
    var matDiffMod = matData.difficultyModifier;
    var effDiff = weapon.difficulty + matDiffMod;
    var isExhausted = stamina <= 0;
    var sessCost = Math.round(AbilityManager.resolveValue("forgeCostMult", 1.0) * BALANCE.sessCostNormal);
    var maxStam = Math.max(1, AbilityManager.resolveValue("maxStamina", BASE_STAMINA + stats.brawn));
    // heatPerfectZone modifier scales PERFECT + GREAT zone widths in HEAT_TIERS
    var heatModifierScale = AbilityManager.resolveValue("heatPerfectZone", 1.0);
    var heatSpeedMult = calcSpeedMultiplier(stats.precision + upgrades.forge, effDiff);
    var hammerSpeedMult = calcSpeedMultiplier(stats.precision + upgrades.anvil, effDiff);
    var quenchSpeedMult = calcSpeedMultiplier(stats.precision + upgrades.quench, effDiff);
    var strikeMult = calcStrikeMultiplier(stats.technique + upgrades.hammer, effDiff);
    var activeSpeedMult = phase === PHASES.HEAT ? heatSpeedMult : phase === PHASES.QUENCH ? quenchSpeedMult : hammerSpeedMult;
    var speedLabel = activeSpeedMult < 0.95 ? "EASY" : activeSpeedMult > 1.05 ? "HARD" : "NORMAL";
    var speedColor = activeSpeedMult < 0.95 ? "#4ade80" : activeSpeedMult > 1.05 ? "#ef4444" : "#f59e0b";
    var strikeLabel = strikeMult > 1.05 ? "PRECISE" : strikeMult < 0.95 ? "CLUMSY" : "STEADY";
    var strikeColor = strikeMult > 1.05 ? "#4ade80" : strikeMult < 0.95 ? "#ef4444" : "#f59e0b";
    var stressColor = stress === 0 ? "#4ade80" : stress === 1 ? "#fbbf24" : stress === 2 ? "#fb923c" : "#ef4444";
    var stressLabel2 = stress === 0 ? "CALM" : stress === 1 ? "TENSE" : stress === 2 ? "STRAINED" : "CRITICAL";
    var showBars = qualScore > 0 && phase !== PHASES.SELECT && phase !== PHASES.SELECT_MAT && phase !== PHASES.IDLE;
    var isQTEActive = phase === PHASES.HEAT || phase === PHASES.HAMMER || phase === PHASES.QUENCH;
    var isForging = phase !== PHASES.IDLE && phase !== PHASES.SELECT && phase !== PHASES.SELECT_MAT;
    var diffColor = effDiff <= 3 ? "#4ade80" : effDiff <= 6 ? "#fbbf24" : effDiff <= 8 ? "#fb923c" : "#ef4444";

    // ============================================================
    // Forge Logic Functions
    // ============================================================

    function triggerWeaponShake() { setWeaponShake(true); setTimeout(function() { setWeaponShake(false); }, 350); }

    function showForgeBubbleFn(title, lines, color) {
        clearTimeout(fbTimerRef.current);
        setForgeBubble({ title: title, lines: lines, color: color });
        fbTimerRef.current = setTimeout(function() { setForgeBubble(null); }, 5000);
    }

    function resetForge() {
        qteProcessing.current = false; sfx.setMode("idle");
        setForgeBubble(null); setQteFlash(null);
        ForgeMode.transitionTo(PHASES.IDLE); setPhase(PHASES.IDLE);
        setQualScore(0); setStress(0); setForgeSess(0); setSessResult(null);
        stressRef.current = 0; qualRef.current = 0;
    }

    // --- Fairy Rescue: shatter interception ---
    // Pending cleanup stored as ref so accept/decline handlers can run it
    var pendingShatterCleanup = useRef(null);

    /**
     * Unified shatter handler. Snapshots weapon state, emits FX,
     * then asks fairy controller for a rescue. If fairy declines
     * (or isn't available), cleanup runs immediately via bus reply.
     * If fairy accepts, weapon is restored from snapshot.
     *
     * @param {object} opts - optional overrides
     *   opts.msg    — toast message (default "WEAPON SHATTERED")
     *   opts.inline — true if called inside a setTimeout (quench paths)
     *                 where resetForge can't be used because extra state
     *                 was already cleared by the caller
     *   opts.extraCleanup — fn() to run on decline (for quench paths
     *                       that clear stress/qual/sess manually)
     */
    function handleShatter(opts) {
        opts = opts || {};
        var msg = opts.msg || "WEAPON SHATTERED\n50% materials recovered.";

        // 1. Snapshot weapon state BEFORE any destruction
        var snapshot = {
            wKey: wKey,
            matKey: matKey,
            qualScore: qualRef.current,
            stress: stressRef.current,
            forgeSess: forgeSess,
            sessResult: sessResult,
        };

        // 2. FX + shake (always immediate — player sees the drama)
        GameplayEventBus.emit(EVENT_TAGS.FX_SHATTER, {});
        triggerWeaponShake();

        // 3. Store the cleanup that runs if fairy declines (or can't help)
        pendingShatterCleanup.current = function() {
            GameplayEventBus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, {
                key: matKey,
                qty: Math.ceil(weapon.materialCost * MAT_DESTROY_RECOVERY),
            });
            addToast(msg, "", "#ef4444");
            if (opts.extraCleanup) {
                opts.extraCleanup();
            } else {
                resetForge();
            }
        };

        // 4. Lock forge UI while fairy resolves
        ForgeMode.transitionTo(PHASES.FAIRY_RESCUE); setPhase(PHASES.FAIRY_RESCUE);

        // 5. Ask fairy controller — it will emit ACCEPT or DECLINE
        GameplayEventBus.emit(EVENT_TAGS.FAIRY_RESCUE_OFFER, { snapshot: snapshot });
    }

    /** Fairy accepted rescue — restore weapon from snapshot */
    function onRescueAccept(payload) {
        pendingShatterCleanup.current = null;
        var snap = payload && payload.snapshot;
        if (!snap) { resetForge(); return; }

        // Restore forge state to pre-shatter
        qualRef.current = snap.qualScore;
        stressRef.current = snap.stress;
        setQualScore(snap.qualScore);
        setStress(snap.stress);
        setForgeSess(snap.forgeSess);
        setSessResult(snap.sessResult || null);
        setQteFlash(null);
        setForgeBubble(null);
        qteProcessing.current = false;

        // Resume at session result so player can continue forging
        ForgeMode.transitionTo(PHASES.SESS_RESULT);
        setPhase(PHASES.SESS_RESULT);
        addToast("The fairy caught your weapon!", "", "#c89aff");
    }

    /** Fairy declined rescue — run the stored shatter cleanup */
    function onRescueDecline() {
        var cleanup = pendingShatterCleanup.current;
        pendingShatterCleanup.current = null;
        if (cleanup) cleanup();
    }

    function takeBreak() {
        setWipWeapon({ wKey: wKey, matKey: matKey, qualScore: qualRef.current, stress: stressRef.current, forgeSess: forgeSess, sessResult: sessResult });
        qteProcessing.current = false; sfx.setMode("idle");
        setForgeBubble(null); setQteFlash(null);
        ForgeMode.transitionTo(PHASES.IDLE); setPhase(PHASES.IDLE);
        setSessResult(null);
    }

    function resumeWip() {
        if (!wipWeapon) return;
        sfx.click(); setWKey(wipWeapon.wKey); setMatKey(wipWeapon.matKey);
        qualRef.current = wipWeapon.qualScore; stressRef.current = wipWeapon.stress;
        setQualScore(wipWeapon.qualScore); setStress(wipWeapon.stress);
        setForgeSess(wipWeapon.forgeSess); setSessResult(wipWeapon.sessResult || null);
        setQteFlash(null); setForgeBubble(null); qteProcessing.current = false;
        setWipWeapon(null);
        ForgeMode.forcePhase(PHASES.SESS_RESULT); setPhase(PHASES.SESS_RESULT);
        sfx.setMode("forge");
    }

    function scrapWip() {
        if (!wipWeapon) return;
        sfx.click();
        GameplayEventBus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, { key: wipWeapon.matKey, qty: Math.floor(WEAPONS[wipWeapon.wKey].materialCost * MAT_SCRAP_RECOVERY) });
        addToast(randScrapToast(), "", "#a0a0a0");
        setWipWeapon(null);
    }

    function scrapWeapon() {
        GameplayEventBus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, { key: matKey, qty: Math.floor(weapon.materialCost * MAT_SCRAP_RECOVERY) });
        addToast(randScrapToast(), "", "#a0a0a0");
        resetForge();
    }

    function confirmSelect() {
        if (!isSandbox) {
            if (stamina <= 0) return;
            var have = inv[matKey] || 0, needed = Math.max(0, weapon.materialCost - have), buyPrice = MATS[matKey].price * needed;
            if (have < weapon.materialCost && gold < buyPrice) return;
            if (needed > 0) spendGold(buyPrice);
            GameplayEventBus.emit(EVENT_TAGS.ECONOMY_ADD_MATERIAL, { key: matKey, qty: needed - weapon.materialCost });
        }
        qualRef.current = 20; stressRef.current = 0; setQualScore(20); setStress(0);
        setForgeSess(0); setSessResult(null); setQteFlash(null); qteProcessing.current = false;
        ForgeMode.transitionTo(PHASES.HEAT); setPhase(PHASES.HEAT);
        sfx.setMode("forge");
    }

    function onForgeClick() {
        if (!isQTEActive || qteProcessing.current) return;
        qteProcessing.current = true;
        qteClickTime.current = performance.now();
        var pos = qtePosRef.current;
        if (phase === PHASES.HEAT) { qteLog("HEAT", "CLICK", "pos=" + pos); handleHeatFire(pos, false); }
        else if (phase === PHASES.HAMMER) { qteLog("HAMMER", "CLICK", "pos=" + pos); handleHammerFire(pos); }
        else if (phase === PHASES.QUENCH) { qteLog("QUENCH", "CLICK", "pos=" + pos); handleQuenchFire(pos); }
    }

    // Sandbox resolve — skips processingRef guard since freeze already set it
    function sandboxResolveQte() {
        console.log("[ForgeVM] sandboxResolveQte CALLED — phase=" + phase + " isQTEActive=" + isQTEActive + " processingRef=" + qteProcessing.current);
        if (!isQTEActive) return;
        var pos = qtePosRef.current;
        console.log("[ForgeVM] sandboxResolveQte FIRING — pos=" + pos);
        if (phase === PHASES.HEAT) { handleHeatFire(pos, false); }
        else if (phase === PHASES.HAMMER) { handleHammerFire(pos); }
        else if (phase === PHASES.QUENCH) { handleQuenchFire(pos); }
    }

    function handleAutoFire(pos) {
        if (qteProcessing.current) return;
        qteProcessing.current = true;
        handleHeatFire(pos, true);
    }

    function handleHeatFire(pos, isAuto) {
        var tier = calcQteResult(pos, HEAT_TIERS, isAuto ? undefined : heatModifierScale);
        if (isAuto) tier = HEAT_TIERS.tiers[HEAT_TIERS.tiers.length - 1]; // auto-fire = worst tier
        if (!isAuto) GameplayEventBus.emit(EVENT_TAGS.FX_HEAT_RESULT, { quality: tier.id });
        setQteFlash(tier.label);
        var bs = HEAT_STRIKE_MAP[tier.id] || 0, strikeTotal = isSandbox ? 1 : BALANCE.baseStrikes + bs;
        showForgeBubbleFn("HEAT RESULT", [{ text: strikeTotal + " strikes", color: bs > 0 ? "#4ade80" : tier.id === "poor" || tier.id === "bad" ? "#f87171" : "#c8b89a", bold: true }], tier.color);
        setTimeout(function() { qteLog("HEAT", "RESULT", "tier=" + tier.id + " flashMs=" + QTE_FLASH_MS); setQteFlash(null); qteProcessing.current = false; setBonusStrikes(bs); setStrikesLeft(strikeTotal); sessionStartQual.current = qualRef.current; ForgeMode.transitionTo(PHASES.HAMMER); setPhase(PHASES.HAMMER); }, QTE_FLASH_MS);
    }

    function handleHammerFire(pos) {
        var tier = calcQteResult(pos, HAMMER_TIERS); GameplayEventBus.emit(EVENT_TAGS.FX_HAMMER_HIT, { quality: tier.id });
        var rawPts = HAMMER_POINTS_MAP[tier.id] || 0, actualDelta = rawPts < 0 ? rawPts : Math.round(rawPts * strikeMult * qualityGainMultiplier(qualRef.current) * AbilityManager.resolveValue("qualityGainRate", 1.0));
        var newQ = clamp(qualRef.current + actualDelta, 0, 100); qualRef.current = newQ; setQualScore(newQ);
        var newL = strikesLeft - 1; setStrikesLeft(newL);
        setQteFlash(tier.label + " " + (actualDelta >= 0 ? "+" : "") + actualDelta);
        setTimeout(function() {
            qteLog("HAMMER", "RESULT", "pts=" + actualDelta + " newQ=" + newQ + " flashMs=" + QTE_FLASH_MS);
            setQteFlash(null); qteProcessing.current = false;
            if (newQ <= 0) { handleShatter(); return; }
            if (newL <= 0) finishHammerSession();
        }, QTE_FLASH_MS);
    }

    function finishHammerSession() {
        var delta = qualRef.current - sessionStartQual.current;
        var ns = Math.min(STRESS_MAX, stressRef.current + 1), nq = qualRef.current;
        stressRef.current = ns; setStress(ns); setForgeSess(forgeSess + 1);
        if (!isSandbox) advanceTime(sessCost, undefined, true);
        var q = getQualityTier(nq);
        setSessResult({ delta: delta, nq: nq, quality: q, ns: ns, sessions: forgeSess + 1 });
        showForgeBubbleFn("HAMMER RESULT", [{ text: (delta >= 0 ? "+" : "") + delta + " quality", color: delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#c8b89a", bold: true }], delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : "#c8b89a");
        if (pendingMystery && pendingMystery.severity && Math.random() < 0.5) { takeBreak(); var snapshot = { gold: gold, inv: inv, finished: finished }; if (pendingMystery.severity === "good") { GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_GOOD, {}); MysteryLogic.mysteryGood(GameplayEventBus, snapshot); } else { GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_BAD, {}); MysteryLogic.mysteryBad(GameplayEventBus, snapshot, true); } return; }
        ForgeMode.transitionTo(PHASES.SESS_RESULT); setPhase(PHASES.SESS_RESULT);
    }

    function attemptForge() {
        if (stress >= STRESS_MAX - 1) {
            var chance = stress >= STRESS_MAX ? BALANCE.shatterChanceMax : BALANCE.shatterChanceHigh;
            if (Math.random() < chance) { handleShatter(); return; }
        }
        ForgeMode.transitionTo(PHASES.HEAT); setPhase(PHASES.HEAT);
    }

    function doNormalize() {
        var loLoss = BALANCE.normalizeLossLo[upgrades.furnace];
        var hiLoss = BALANCE.normalizeLossHi[upgrades.furnace];
        var lossPct = rand(loLoss, hiLoss), oldQ = qualRef.current;
        var nq = Math.max(0, Math.floor(oldQ * (1 - lossPct))), ns = Math.max(0, stressRef.current - 1);
        stressRef.current = ns; qualRef.current = nq; setStress(ns); setQualScore(nq); advanceTime(2, undefined, false);
        setSessResult({ delta: nq - oldQ, nq: nq, quality: getQualityTier(nq), ns: ns, sessions: forgeSess });
        showForgeBubbleFn("NORMALIZE", [{ text: (nq - oldQ) + " quality", color: "#f87171", bold: true }, { text: "-1 stress", color: "#60a5fa", bold: true }], "#60a5fa");
        if (pendingMystery && pendingMystery.severity) { takeBreak(); var snapshot = { gold: gold, inv: inv, finished: finished }; if (pendingMystery.severity === "good") { GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_GOOD, {}); MysteryLogic.mysteryGood(GameplayEventBus, snapshot); } else { GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_BAD, {}); MysteryLogic.mysteryBad(GameplayEventBus, snapshot, true); } return; }
        ForgeMode.transitionTo(PHASES.SESS_RESULT); setPhase(PHASES.SESS_RESULT);
    }

    function finishWeapon(nq) {
        // Sandbox: discard weapon, no XP, no quest, no shelf, no toast
        if (isSandbox) {
            sfx.setMode("idle");
            stressRef.current = 0; qualRef.current = 0; setQualScore(0); setStress(0); setForgeSess(0); setSessResult(null); setForgeBubble(null);
            ForgeMode.transitionTo(PHASES.IDLE); setPhase(PHASES.IDLE);
            return;
        }

        var q = getQualityTier(nq), val = qualityValue(wKey, matKey, nq, upgrades);
        var item = { wKey: wKey, wName: weapon.name, matKey: matKey, score: nq, id: Date.now(), label: q.label, val: val, color: q.weaponColor };
        gainXp(Math.round((BALANCE.finishXpBase + weapon.difficulty * BALANCE.finishXpPerDiff) * getQualityTier(nq).xpMultiplier));
        sfx.setMode("idle");

        var rq = royalQuestRef.current, isQuestDelivery = false, questComplete = false, deliveredSoFar = 0, questQty = 1;
        if (rq && !rq.fulfilled) {
            var matOk = matKey === rq.materialRequired;
            if (wKey === rq.weaponKey && nq >= rq.minQuality && matOk) {
                isQuestDelivery = true; questQty = rq.qty || 1; deliveredSoFar = (rq.fulfilledQty || 0) + 1;
                var nowFulfilled = deliveredSoFar >= questQty; questComplete = nowFulfilled;
                setRoyalQuest(function(r) { return Object.assign({}, r, { fulfilledQty: deliveredSoFar, fulfilled: nowFulfilled }); });
                GameplayEventBus.emit(EVENT_TAGS.FX_ROYAL_DECREE, {});
            }
        }
        if (!isQuestDelivery) { GameplayEventBus.emit(EVENT_TAGS.ECONOMY_SET_INVENTORY, { addFinished: item }); }
        var toastMsg = isQuestDelivery ? (questComplete ? "DECREE FULFILLED\n" + q.label + " " + weapon.name : "DELIVERED " + deliveredSoFar + "/" + questQty + "\n" + q.label + " " + weapon.name) : q.label.toUpperCase() + " " + weapon.name + "\n~" + val + "g added to shelf";
        addToast(toastMsg, "", questComplete ? "#4ade80" : isQuestDelivery ? "#f59e0b" : q.weaponColor);
        GameplayEventBus.emit(EVENT_TAGS.FORGE_SESSION_COMPLETE, { quality: nq, weaponKey: wKey, matKey: matKey });
        stressRef.current = 0; qualRef.current = 0; setQualScore(0); setStress(0); setForgeSess(0); setSessResult(null); setForgeBubble(null);
        ForgeMode.transitionTo(PHASES.IDLE); setPhase(PHASES.IDLE);
    }

    function handleQuenchFire(pos) {
        var tier = calcQteResult(pos, QUENCH_TIERS);
        var isSuccess = tier.id === "perfect" || tier.id === "great" || tier.id === "good" || tier.id === "poor";
        if (isSuccess) GameplayEventBus.emit(EVENT_TAGS.FX_QUENCH_SUCCESS, {}); else GameplayEventBus.emit(EVENT_TAGS.FX_QUENCH_FAIL, {});
        setQteFlash(tier.label);
        setTimeout(function() {
            qteLog("QUENCH", "RESULT", "tier=" + tier.id + " flashMs=" + QTE_FLASH_MS);
            setQteFlash(null); qteProcessing.current = false;
            if (tier.id === "perfect") { var nq = clamp(qualRef.current + 5, 0, 100); qualRef.current = nq; if (!isSandbox) advanceTime(sessCost, undefined, true); finishWeapon(nq); }
            else if (tier.id === "great") { var nq2 = clamp(qualRef.current, 0, 100); qualRef.current = nq2; if (!isSandbox) advanceTime(sessCost, undefined, true); finishWeapon(nq2); }
            else if (tier.id === "good") { var nq3 = clamp(qualRef.current, 0, 100); qualRef.current = nq3; if (!isSandbox) advanceTime(sessCost, undefined, true); finishWeapon(nq3); }
            else if (tier.id === "poor") {
                var loss = randInt(10, 20), nq4 = clamp(qualRef.current - loss, 0, 100); qualRef.current = nq4; if (!isSandbox) advanceTime(sessCost, undefined, true);
                if (nq4 <= 0) { handleShatter({ msg: "WEAPON DESTROYED\n50% materials recovered.", extraCleanup: function() { stressRef.current = 0; qualRef.current = 0; setQualScore(0); setStress(0); setForgeSess(0); setSessResult(null); setForgeBubble(null); ForgeMode.transitionTo(PHASES.IDLE); setPhase(PHASES.IDLE); } }); }
                else finishWeapon(nq4);
            } else { handleShatter({ msg: "WEAPON DESTROYED\n50% materials recovered.", extraCleanup: function() { stressRef.current = 0; qualRef.current = 0; setQualScore(0); setStress(0); setForgeSess(0); setSessResult(null); setForgeBubble(null); ForgeMode.transitionTo(PHASES.IDLE); setPhase(PHASES.IDLE); } }); }
        }, QTE_FLASH_MS);
    }

    // --- Reset helper (called by App.js resetGame) ---
    function resetForgeState() {
        qteProcessing.current = false; qualRef.current = 0; stressRef.current = 0;
    }

    // --- Sleep helper (called by App.js doSleep) ---
    function onSleep() {
        if (isForging && qualRef.current > 0) takeBreak();
        else { setForgeBubble(null); setQteFlash(null); qteProcessing.current = false; }
    }

    // --- Bus: Forge Subscriptions ---
    var busDestroyWip = useCallback(function() {
        if (!wipWeapon && phase === PHASES.IDLE) return;
        setWipWeapon(null);
        qteProcessing.current = false;
        sfx.setMode("idle");
        setForgeBubble(null);
        setQteFlash(null);
        ForgeMode.transitionTo(PHASES.IDLE); setPhase(PHASES.IDLE);
        setQualScore(0);
        setStress(0);
        setForgeSess(0);
        setSessResult(null);
        stressRef.current = 0;
        qualRef.current = 0;
    }, [wipWeapon, phase]);

    useEffect(function() {
        GameplayEventBus.on(EVENT_TAGS.FORGE_DESTROY_WIP, busDestroyWip);
        return function() { GameplayEventBus.off(EVENT_TAGS.FORGE_DESTROY_WIP, busDestroyWip); };
    }, [busDestroyWip]);

    // --- Bus: Reset React phase when GameMode exits forge (e.g. sleep) ---
    useEffect(function() {
        function onForgeExit() {
            qteProcessing.current = false;
            sfx.setMode("idle");
            setForgeBubble(null);
            setQteFlash(null);
            setPhase(PHASES.IDLE);
        }
        GameplayEventBus.on(EVENT_TAGS.MODE_FORGE_EXIT, onForgeExit);
        return function() { GameplayEventBus.off(EVENT_TAGS.MODE_FORGE_EXIT, onForgeExit); };
    }, []);

    // --- Bus: Fairy Rescue accept/decline ---
    useEffect(function() {
        GameplayEventBus.on(EVENT_TAGS.FAIRY_RESCUE_ACCEPT, onRescueAccept);
        GameplayEventBus.on(EVENT_TAGS.FAIRY_RESCUE_DECLINE, onRescueDecline);
        return function() {
            GameplayEventBus.off(EVENT_TAGS.FAIRY_RESCUE_ACCEPT, onRescueAccept);
            GameplayEventBus.off(EVENT_TAGS.FAIRY_RESCUE_DECLINE, onRescueDecline);
        };
    }, []);

    // ============================================================
    // Return — actions + display props
    // ============================================================

    return {
        // --- Actions ---
        takeBreak: takeBreak,
        resumeWip: resumeWip,
        scrapWip: scrapWip,
        scrapWeapon: scrapWeapon,
        confirmSelect: confirmSelect,
        onForgeClick: onForgeClick,
        sandboxResolveQte: sandboxResolveQte,
        handleAutoFire: handleAutoFire,
        attemptForge: attemptForge,
        doNormalize: doNormalize,
        resetForgeState: resetForgeState,
        onSleep: onSleep,

        // --- Display Props ---
        weapon: weapon,
        matData: matData,
        matDiffMod: matDiffMod,
        effDiff: effDiff,
        isExhausted: isExhausted,
        sessCost: sessCost,
        maxStam: maxStam,
        heatModifierScale: heatModifierScale,
        heatSpeedMult: heatSpeedMult,
        hammerSpeedMult: hammerSpeedMult,
        quenchSpeedMult: quenchSpeedMult,
        strikeMult: strikeMult,
        activeSpeedMult: activeSpeedMult,
        speedLabel: speedLabel,
        speedColor: speedColor,
        strikeLabel: strikeLabel,
        strikeColor: strikeColor,
        stressColor: stressColor,
        stressLabel2: stressLabel2,
        showBars: showBars,
        isQTEActive: isQTEActive,
        isForging: isForging,
        diffColor: diffColor,

        // --- Refs (exposed for QTEPanel) ---
        qtePosRef: qtePosRef,
        qteProcessing: qteProcessing,
    };
}

export default useForgeVM;