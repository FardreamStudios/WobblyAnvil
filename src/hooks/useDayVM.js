// ============================================================
// useDayVM.js — Wobbly Anvil Day ViewModel Hook
// Owns: advanceTime, waitHour, buildDayQueue, doSleep, sleep.
// Consumes: useDayState + cross-domain deps passed in.
// Returns: Action handlers for time progression and day cycle.
//
// GEB-5: applyEvent replaced with DynamicEvents.applyEventResult.
//         applyMystery replaced with DynamicEvents.mysteryGood/Bad.
//         SFX placed at call site until Gameplay Cue system (CUE-1).
// ============================================================

import GameConstants from "../modules/constants.js";
import GameUtils from "../modules/utilities.js";
import GameEvents from "../modules/events.js";
import GameplayEventBus from "../logic/gameplayEventBus.js";
import DynamicEvents from "../logic/dynamicEvents.js";

var TAG_COLORS = GameConstants.TAG_COLORS;
var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var CUST_TYPES = GameConstants.CUST_TYPES;
var STARTING_GOLD = GameConstants.STARTING_GOLD;
var BASE_STAMINA = GameConstants.BASE_STAMINA;
var BASE_DAILY_CUSTOMERS = GameConstants.BASE_DAILY_CUSTOMERS;
var WAKE_HOUR = GameConstants.WAKE_HOUR;

var rollDailyEvent = GameEvents.rollDailyEvent;
var generateRoyalQuest = GameEvents.generateRoyalQuest;

var randInt = GameUtils.randInt;
var weightedPick = GameUtils.weightedPick;
var getQualityTier = GameUtils.getQualityTier;

function useDayVM(deps) {
    // --- Unpack dependencies from App.js ---
    var dayState = deps.dayState;
    var economy = deps.economy;
    var quest = deps.quest;
    var mystery = deps.mystery;
    var sfx = deps.sfx;
    var addToast = deps.addToast;
    var setToastQueue = deps.setToastQueue;
    var setActiveToast = deps.setActiveToast;
    var trySpawnCustomer = deps.trySpawnCustomer;
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
    var setCustVisitsToday = economy.setCustVisitsToday;
    var setMaxCustToday = economy.setMaxCustToday;

    // --- Quest state ---
    var royalQuest = quest.royalQuest, setRoyalQuest = quest.setRoyalQuest;
    var questNum = quest.questNum, setQuestNum = quest.setQuestNum;
    var setMEvent = quest.setMEvent;
    var hasSoldWeapon = quest.hasSoldWeapon;
    var setPromoteUses = quest.setPromoteUses;

    // --- Mystery state ---
    var pendingMystery = mystery.pendingMystery, setPendingMystery = mystery.setPendingMystery;

    // --- Read values passed in ---
    var unlockedBP = deps.unlockedBP;
    var setUnlockedBP = deps.setUnlockedBP;
    var setInv = economy.setInv;
    var reputation = deps.reputation;
    var advanceTime = deps.advanceTime;
    var level = deps.level;

    // --- Quest state (promote) ---
    var setActiveCustomer = quest.setActiveCustomer;

    // --- Time Helpers ---
    function waitHour() {
        sfx.click(); advanceTime(2, undefined, false);
        setStamina(function(s) { return Math.min(maxStam, s + 1); });
    }

    // --- Day Cycle ---
    function buildDayQueue(newDay, state, pendingQuestNum) {
        var ev = rollDailyEvent(state); setMEvent(ev);
        if (ev && ev.effect) {
            if (ev.id === "mystery" && ev.severity) { if (!pendingMystery) setTimeout(function() { setPendingMystery({ effect: ev.effect, severity: ev.severity }); }, 150); }
            else {
                var r = ev.effect({ gold: state.gold || STARTING_GOLD, inv: state.inv || { bronze: 10, iron: 4 }, hour: WAKE_HOUR, stamina: state.stamina || BASE_STAMINA, finished: state.finished || [] });
                setTimeout(function() { DynamicEvents.applyEventResult(GameplayEventBus, r); }, 150);
            }
        }
        var queue = [];
        queue.push({ id: "gm_" + newDay, msg: "DAY " + newDay + "\nGood morning, blacksmith.", icon: "", color: "#f59e0b" });
        if (ev && ev.id !== "slow" && ev.id !== "mystery") queue.push({ id: "ev_" + newDay, msg: ev.title + "\n" + ev.desc, icon: ev.icon, color: TAG_COLORS[ev.variantTag || ev.tag] || "#f59e0b" });
        if (pendingQuestNum != null) {
            var bp = state.unlockedBP || ["dagger", "shortsword", "axe"];
            var q2 = generateRoyalQuest(pendingQuestNum, bp, newDay, state.reputation || 4);
            if (q2) {
                setRoyalQuest(q2); setQuestNum(pendingQuestNum); sfx.royal();
                queue.push({ id: "rq_" + newDay, msg: q2.name + "\nDemands " + q2.minQualityLabel + "+ " + q2.materialRequired.toUpperCase() + " " + q2.weaponName + (q2.qty > 1 ? " x" + q2.qty : "") + " by Day " + q2.deadline, icon: "", color: "#f59e0b" });
            }
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
                changeRep(-royalQuest.reputationLoss);
                resolutionToast = { msg: "Quest Overdue!\n-" + royalQuest.reputationLoss + " reputation", icon: "", color: "#ef4444" };
                spawnQuestNum = questNum + 1;
            }
            setRoyalQuest(null);
        }
        setLateToastShown(false); setDay(newDay); setHour(WAKE_HOUR); setStamina(ns);
        setCustVisitsToday(0); setMaxCustToday(BASE_DAILY_CUSTOMERS); setForcedExhaustion(false);
        setPriceBonus(1.0); setPriceDebuff(1.0); setMatDiscount(null); setGlobalMatMult(1.0);
        setGuaranteedCustomers(false); setPromoteUses(0);
        sfx.setMode("idle");
        forgeOnSleep();
        setActiveToast(null); sfx.resetDay(); sfx.setMode("idle");
        setTimeout(function() {
            var state = { gold: gold, inv: inv, finished: finished, hasSoldWeapon: hasSoldWeapon, lastSleepHour: hour, stamina: ns, unlockedBP: unlockedBP, reputation: reputation };
            var dayQueue = buildDayQueue(newDay, state, spawnQuestNum);
            var fullQueue = resolutionToast ? [{ id: "res_" + newDay, msg: resolutionToast.msg, icon: resolutionToast.icon, color: resolutionToast.color }].concat(dayQueue) : dayQueue;
            setToastQueue(fullQueue);
            setTimeout(function() { trySpawnCustomer(9, finished); }, 600);
        }, 300);
    }

    function sleep() {
        if (pendingMystery && pendingMystery.severity) {
            // --- Mystery fires before sleep, then doSleep runs after 7s ---
            var snapshot = { gold: gold, inv: inv, finished: finished };
            setPendingMystery(null);
            if (pendingMystery.severity === "good") {
                GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_GOOD, {});
                DynamicEvents.mysteryGood(GameplayEventBus, snapshot);
            } else {
                GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_BAD, {});
                DynamicEvents.mysteryBad(GameplayEventBus, snapshot, false);
            }
            setTimeout(doSleep, 7000);
            return;
        }
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
        var items = finished;
        var shuffled = CUST_TYPES.slice().sort(function() { return Math.random() - 0.5; });
        shuffled.some(function(ct) {
            var match = items.find(function(w) { return getQualityTier(w.score).scoreMin >= ct.minQuality || ct.minQuality === 0; });
            if (match) { setActiveCustomer({ type: ct, weapon: match }); setCustVisitsToday(function(v) { return v + 1; }); sfx.doorbell(); return true; }
            return false;
        });
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