// ============================================================
// useDayVM.js — Wobbly Anvil Day ViewModel Hook
// Owns: advanceTime, waitHour, buildDayQueue, doSleep, sleep.
// Consumes: useDayState + cross-domain deps passed in.
// Returns: Action handlers for time progression and day cycle.
//
// Morning events are now handled by AbilityManager.rollMorning()
// called from GameMode.startDay(). This file only builds the
// structural toast queue (good morning + royal quest).
// ============================================================

import GameConstants from "../modules/constants.js";
import GameUtils from "../modules/utilities.js";
import QuestLogic from "../logic/questLogic.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import EVENT_TAGS from "../config/eventTags.js";
import AbilityManager from "../systems/ability/abilitySubSystem.js";

var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var WAKE_HOUR = GameConstants.WAKE_HOUR;

var generateRoyalQuest = QuestLogic.generateRoyalQuest;

var randInt = GameUtils.randInt;
var weightedPick = GameUtils.weightedPick;

function useDayVM(deps) {
    // --- Unpack dependencies from App.js ---
    var dayState = deps.dayState;
    var economy = deps.economy;
    var quest = deps.quest;
    var sfx = deps.sfx;
    var addToast = deps.addToast;
    var setToastQueue = deps.setToastQueue;
    var setActiveToast = deps.setActiveToast;
    var gm = deps.gm;
    var earnGold = deps.earnGold;
    var changeRep = deps.changeRep;
    var forgeOnSleep = deps.forgeOnSleep;
    var maxStam = deps.maxStam;

    // --- Day state ---
    var day = dayState.day, setDay = dayState.setDay;
    var hour = dayState.hour, setHour = dayState.setHour;
    var setStamina = dayState.setStamina;
    var setForcedExhaustion = dayState.setForcedExhaustion;
    var setLateToastShown = dayState.setLateToastShown;

    // --- Economy state (modifier resets) ---
    var gold = economy.gold;
    var inv = economy.inv;
    var finished = economy.finished;
    var setPriceBonus = economy.setPriceBonus;
    var setPriceDebuff = economy.setPriceDebuff;
    var setMatDiscount = economy.setMatDiscount;
    var setGlobalMatMult = economy.setGlobalMatMult;
    var setGuaranteedCustomers = economy.setGuaranteedCustomers;

    // --- Quest state ---
    var royalQuest = quest.royalQuest, setRoyalQuest = quest.setRoyalQuest;
    var questNum = quest.questNum, setQuestNum = quest.setQuestNum;
    var hasSoldWeapon = quest.hasSoldWeapon;
    var setPromoteUses = quest.setPromoteUses;

    // --- Read values passed in ---
    var unlockedBP = deps.unlockedBP;
    var setUnlockedBP = deps.setUnlockedBP;
    var setInv = economy.setInv;
    var reputation = deps.reputation;
    var advanceTime = deps.advanceTime;
    var level = deps.level;

    // --- Quest state (promote) ---
    // setActiveCustomer removed — promote now emits CUSTOMER_SPAWN via bus

    // --- Time Helpers ---
    function waitHour() {
        sfx.click(); advanceTime(2, undefined, false);
        setStamina(function(s) { return Math.min(maxStam, s + 1); });
    }

    // --- Day Cycle ---
    function buildDayQueue(newDay, state, pendingQuestNum) {
        // Morning events now handled by AbilityManager.rollMorning()
        // called from GameMode.startDay(). This just builds structural toasts.
        var queue = [];
        queue.push({ id: "gm_" + newDay, msg: "DAY " + newDay + "\nGood morning, blacksmith.", icon: "", color: "#f59e0b" });
        if (pendingQuestNum != null) {
            var bp = state.unlockedBP || ["dagger", "shortsword", "axe"];
            var q2 = generateRoyalQuest(pendingQuestNum, bp, newDay, state.reputation || 4);
            if (q2) {
                setRoyalQuest(q2); setQuestNum(pendingQuestNum); sfx.royal();
                queue.push({ id: "rq_" + newDay, msg: q2.name + "\nDemands " + q2.minQualityLabel + "+ " + q2.materialRequired.toUpperCase() + " " + q2.weaponName + (q2.qty > 1 ? " x" + q2.qty : "") + " by Day " + q2.deadline, icon: "", color: "#f59e0b" });
            }
        }
        // Append any morning ability toasts (buffered by AbilityManager)
        var abilityToasts = AbilityManager.flushToasts();
        for (var a = 0; a < abilityToasts.length; a++) {
            queue.push(abilityToasts[a]);
        }
        return queue;
    }

    function doSleep() {
        var late = Math.max(0, hour - 24), ns = Math.max(1, maxStam - Math.floor(late)), newDay = day + 1;
        var resolutionToast = null, spawnQuestNum = null;
        if (royalQuest && newDay >= royalQuest.deadline) {
            if (royalQuest.fulfilled) {
                var rqR = royalQuest.reward, rqRep = royalQuest.reputationGain;
                earnGold(rqR); changeRep(rqRep);
                resolutionToast = { msg: "DECREE COMPLETE\n+" + rqR + "g +" + rqRep + " rep", icon: "", color: "#f59e0b" };
                spawnQuestNum = questNum + 1;
            } else {
                GameplayEventBus.emit(EVENT_TAGS.QUEST_FAILED, { questId: royalQuest.id, reputationLoss: royalQuest.reputationLoss });
                changeRep(-royalQuest.reputationLoss);
                resolutionToast = { msg: "Quest Overdue!\n-" + royalQuest.reputationLoss + " reputation", icon: "", color: "#ef4444" };
                spawnQuestNum = questNum + 1;
            }
            setRoyalQuest(null);
        }
        setLateToastShown(false); setDay(newDay); setHour(WAKE_HOUR); setStamina(ns);
        setForcedExhaustion(false);
        setPriceBonus(1.0); setPriceDebuff(1.0); setMatDiscount(null); setGlobalMatMult(1.0);
        setGuaranteedCustomers(false); setPromoteUses(0);
        sfx.setMode("idle");
        forgeOnSleep();
        setActiveToast(null); sfx.resetDay(); sfx.setMode("idle");
        // --- Notify GameMode: end current day, start new one ---
        gm.sleep(hour);
        gm.startDay(newDay);
        setTimeout(function() {
            var state = { gold: gold, inv: inv, finished: finished, hasSoldWeapon: hasSoldWeapon, lastSleepHour: hour, stamina: ns, unlockedBP: unlockedBP, reputation: reputation };
            var dayQueue = buildDayQueue(newDay, state, spawnQuestNum);
            var fullQueue = resolutionToast ? [{ id: "res_" + newDay, msg: resolutionToast.msg, icon: resolutionToast.icon, color: resolutionToast.color }].concat(dayQueue) : dayQueue;
            setToastQueue(fullQueue);
        }, 300);
    }

    function sleep() {
        // Mystery deferral now handled by mysteryVisitor/mysteryShadow
        // abilities — they listen for DAY_SLEEP_START and fire their
        // own VFX sequence. We just go straight to doSleep.
        doSleep();
    }

    // --- Scavenge (DAY-1) ---
    function scavenge() {
        sfx.click(); advanceTime(1, undefined, true);
        var matKeys = Object.keys(MATS);
        var matWeights = matKeys.map(function(_, i) { return Math.max(1, matKeys.length - i); });
        var randMat = function() { return weightedPick(matKeys, matWeights); };
        var addMat = function() { var k = randMat(); setInv(function(i) { var n = Object.assign({}, i); n[k] = (n[k] || 0) + 1; return n; }); return k; };
        var goldReward = function() { return randInt(5, 5 + Math.floor(level / 2) * 10); };
        var roll = Math.random();
        if (roll < 0.05) {
            var m = addMat(); var g = goldReward(); earnGold(g);
            var locked = Object.keys(WEAPONS).filter(function(k) { return !unlockedBP.includes(k); });
            if (locked.length) { var bp = locked[Math.floor(Math.random() * locked.length)]; setUnlockedBP(function(u) { return u.concat([bp]); }); setTimeout(function() { addToast("JACKPOT!\n" + g + "g \u00B7 1 " + MATS[m].name + " \u00B7 " + WEAPONS[bp].name + " blueprint", "", "#fbbf24"); }, 200); }
            else { setTimeout(function() { addToast("JACKPOT!\n" + g + "g \u00B7 1 " + MATS[m].name, "", "#fbbf24"); }, 200); }
        } else if (roll < 0.25) { var m1 = addMat(); var m2 = addMat(); setTimeout(function() { addToast("SCAVENGED!\n1 " + MATS[m1].name + " \u00B7 1 " + MATS[m2].name, "", "#a0a0a0"); }, 200); }
        else if (roll < 0.45) { var g2 = goldReward(); earnGold(g2); setTimeout(function() { addToast("SCAVENGED!\nFound " + g2 + "g", "", "#f59e0b"); }, 200); }
        else { var m3 = addMat(); setTimeout(function() { addToast("SCAVENGED!\nFound 1 " + MATS[m3].name, "", "#a0a0a0"); }, 200); }
    }

    // --- Promote (DAY-2) ---
    function promote() {
        sfx.click(); advanceTime(1, undefined, true); setPromoteUses(function(p) { return p + 1; });
        // Delegate to CustomerManager — it owns spawn decisions
        GameplayEventBus.emit(EVENT_TAGS.CUSTOMER_PROMOTE, {});
    }

    return {
        waitHour: waitHour,
        buildDayQueue: buildDayQueue,
        doSleep: doSleep,
        sleep: sleep,
        scavenge: scavenge,
        promote: promote,
    };
}

export default useDayVM;