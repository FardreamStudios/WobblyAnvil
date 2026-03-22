// ============================================================
// useDayVM.js — Wobbly Anvil Day ViewModel Hook
// Owns: advanceTime, waitHour, buildDayQueue, doSleep, sleep.
// Consumes: useDayState + cross-domain deps passed in.
// Returns: Action handlers for time progression and day cycle.
// ============================================================

import GameConstants from "../modules/constants.js";
import GameEvents from "../modules/events.js";

var TAG_COLORS = GameConstants.TAG_COLORS;
var STARTING_GOLD = GameConstants.STARTING_GOLD;
var BASE_STAMINA = GameConstants.BASE_STAMINA;
var BASE_DAILY_CUSTOMERS = GameConstants.BASE_DAILY_CUSTOMERS;
var WAKE_HOUR = GameConstants.WAKE_HOUR;

var rollDailyEvent = GameEvents.rollDailyEvent;
var generateRoyalQuest = GameEvents.generateRoyalQuest;

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
    var applyEvent = deps.applyEvent;
    var applyMystery = deps.applyMystery;
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
    var reputation = deps.reputation;
    var advanceTime = deps.advanceTime;

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
            else { var r = ev.effect({ gold: state.gold || STARTING_GOLD, inv: state.inv || { bronze: 10, iron: 4 }, hour: WAKE_HOUR, stamina: state.stamina || BASE_STAMINA, finished: state.finished || [] }); setTimeout(function() { applyEvent(r); }, 150); }
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
        if (pendingMystery && pendingMystery.severity) { applyMystery(doSleep); return; }
        doSleep();
    }

    return {
        waitHour: waitHour,
        buildDayQueue: buildDayQueue,
        doSleep: doSleep,
        sleep: sleep,
    };
}

export default useDayVM;