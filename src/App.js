// ============================================================
// App.js — Wobbly Anvil Game Brain
// State management, game logic, render tree.
// All data, utilities, components, and systems imported from modules.
// ============================================================

import { useEffect, useRef, useCallback } from "react";

// --- Module Imports ---
import GameConstants from "./modules/constants.js";
import GameUtils from "./modules/utilities.js";
import GameEvents from "./modules/events.js";
import AudioSystem from "./modules/audio.js";
import UIComponents from "./modules/uiComponents.js";
import ForgeComponents from "./modules/forgeComponents.js";
import GamePanels from "./modules/gamePanels.js";
import Screens from "./modules/screens.js";
import RhythmQTEModule from "./modules/rhythmQTE.js";
import GameLayout from "./modules/gameLayout.js";
import SceneSystem from "./modules/sceneSystem.js";
import MobileLayoutModule from "./modules/mobileLayout.js";
import DevBanner from "./components/DevBanner.js";

// --- State Hooks ---
import useUIState from "./hooks/useUIState.js";
import useEconomyState from "./hooks/useEconomyState.js";
import useDayState from "./hooks/useDayState.js";
import usePlayerState from "./hooks/usePlayerState.js";
import useForgeState from "./hooks/useForgeState.js";
import useForgeVM from "./hooks/useForgeVM.js";
import usePlayerVM from "./hooks/usePlayerVM.js";
import useEconomyVM from "./hooks/useEconomyVM.js";
import useDayVM from "./hooks/useDayVM.js";
import useQuestState from "./hooks/useQuestState.js";
import useMysteryState from "./hooks/useMysteryState.js";
import useInputRouter from "./hooks/useInputRouter.js";

// --- Destructure Constants ---
var PHASES = GameConstants.PHASES;
var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var UPGRADES = GameConstants.UPGRADES;
var CUST_TYPES = GameConstants.CUST_TYPES;
var STATS_DEF = GameConstants.STATS_DEF;
var TAG_COLORS = GameConstants.TAG_COLORS;
var LATE_TOASTS = GameConstants.LATE_TOASTS;
var COL_W = GameConstants.COL_W;
var STRESS_MAX = GameConstants.STRESS_MAX;
var STARTING_GOLD = GameConstants.STARTING_GOLD;
var BASE_STAMINA = GameConstants.BASE_STAMINA;
var BASE_DAILY_CUSTOMERS = GameConstants.BASE_DAILY_CUSTOMERS;
var WAKE_HOUR = GameConstants.WAKE_HOUR;
var MAT_SCRAP_RECOVERY = GameConstants.MAT_SCRAP_RECOVERY;
var BALANCE = GameConstants.BALANCE;

// --- Destructure Utilities ---
var randInt = GameUtils.randInt;
var weightedPick = GameUtils.weightedPick;
var getQualityTier = GameUtils.getQualityTier;
var referenceValue = GameUtils.referenceValue;
var getSmithRank = GameUtils.getSmithRank;
var getNextRank = GameUtils.getNextRank;
var formatTime = GameUtils.formatTime;

// --- Destructure Events ---
var EVENTS = GameEvents.EVENTS;

// --- Destructure Audio ---
var useAudio = AudioSystem.useAudio;

// --- Destructure UI Components ---
var Panel = UIComponents.Panel;
var Row = UIComponents.Row;
var SectionLabel = UIComponents.SectionLabel;
var InfoRow = UIComponents.InfoRow;
var Bar = UIComponents.Bar;
var Pips = UIComponents.Pips;
var ActionBtn = UIComponents.ActionBtn;
var DangerBtn = UIComponents.DangerBtn;
var Tooltip = UIComponents.Tooltip;
var Toast = UIComponents.Toast;
var GoldPop = UIComponents.GoldPop;
var ScaleWrapper = UIComponents.ScaleWrapper;

// --- Destructure Scene System ---
var SceneStage = SceneSystem.SceneStage;
var resolveSceneState = SceneSystem.resolveSceneState;

// --- Destructure Forge Components ---
var QTEPanel = ForgeComponents.QTEPanel;

// --- Destructure Game Panels ---
var StatPanel = GamePanels.StatPanel;
var ForgeInfoPanel = GamePanels.ForgeInfoPanel;
var RepPanel = GamePanels.RepPanel;
var CustomerPanel = GamePanels.CustomerPanel;
var MaterialsModal = GamePanels.MaterialsModal;
var ShopModal = GamePanels.ShopModal;
var GameOverScreen = GamePanels.GameOverScreen;

// --- Destructure Screens ---
var SplashScreen = Screens.SplashScreen;
var MainMenu = Screens.MainMenu;

// --- Destructure Rhythm QTE ---
var RhythmQTE = RhythmQTEModule.RhythmQTE;

// --- Destructure Layout ---
var GameShell = GameLayout.GameShell;
var GameHeader = GameLayout.GameHeader;
var GameLeft = GameLayout.GameLeft;
var GameCenter = GameLayout.GameCenter;
var GameRight = GameLayout.GameRight;
var GameFooter = GameLayout.GameFooter;
var useLayoutMode = GameLayout.useLayoutMode;

// --- Destructure Mobile Layout ---
var MobileLayout = MobileLayoutModule.MobileLayout;

// ============================================================
// Main App Component
// ============================================================

export default function App() {
  var sfx = useAudio();
  var isMobile = useLayoutMode();

  // --- State Hooks ---
  var ui = useUIState();
  var economy = useEconomyState();
  var dayState = useDayState();
  var player = usePlayerState();
  var forge = useForgeState();
  var quest = useQuestState();
  var mystery = useMysteryState();

  // --- UI State (from useUIState) ---
  var screen = ui.screen, setScreen = ui.setScreen;
  var showShop = ui.showShop, setShowShop = ui.setShowShop;
  var showMaterials = ui.showMaterials, setShowMaterials = ui.setShowMaterials;
  var showGiveUp = ui.showGiveUp, setShowGiveUp = ui.setShowGiveUp;
  var showOptions = ui.showOptions, setShowOptions = ui.setShowOptions;
  var showRhythmTest = ui.showRhythmTest, setShowRhythmTest = ui.setShowRhythmTest;
  var handedness = ui.handedness, setHandedness = ui.setHandedness;
  var sfxVol = ui.sfxVol, setSfxVol = ui.setSfxVol;
  var musicVol = ui.musicVol, setMusicVol = ui.setMusicVol;

  // --- Toast State (from useUIState) ---
  var toasts = ui.toasts, setToasts = ui.setToasts;
  var toastQueue = ui.toastQueue, setToastQueue = ui.setToastQueue;
  var activeToast = ui.activeToast, setActiveToast = ui.setActiveToast;

  // --- Economy State (from useEconomyState) ---
  var gold = economy.gold, setGold = economy.setGold;
  var totalGoldEarned = economy.totalGoldEarned, setTotalGoldEarned = economy.setTotalGoldEarned;
  var goldPops = economy.goldPops, setGoldPops = economy.setGoldPops;
  var inv = economy.inv, setInv = economy.setInv;
  var finished = economy.finished, setFinished = economy.setFinished;
  var priceBonus = economy.priceBonus, setPriceBonus = economy.setPriceBonus;
  var priceDebuff = economy.priceDebuff, setPriceDebuff = economy.setPriceDebuff;
  var matDiscount = economy.matDiscount, setMatDiscount = economy.setMatDiscount;
  var globalMatMult = economy.globalMatMult, setGlobalMatMult = economy.setGlobalMatMult;
  var guaranteedCustomers = economy.guaranteedCustomers, setGuaranteedCustomers = economy.setGuaranteedCustomers;
  var custVisitsToday = economy.custVisitsToday, setCustVisitsToday = economy.setCustVisitsToday;
  var maxCustToday = economy.maxCustToday, setMaxCustToday = economy.setMaxCustToday;

  // --- Day State (from useDayState) ---
  var day = dayState.day, setDay = dayState.setDay;
  var hour = dayState.hour, setHour = dayState.setHour;
  var stamina = dayState.stamina, setStamina = dayState.setStamina;
  var forcedExhaustion = dayState.forcedExhaustion, setForcedExhaustion = dayState.setForcedExhaustion;
  var lateToastShown = dayState.lateToastShown, setLateToastShown = dayState.setLateToastShown;
  var gameOver = dayState.gameOver, setGameOver = dayState.setGameOver;

  // --- Quest State (from useQuestState) ---
  var activeCustomer = quest.activeCustomer, setActiveCustomer = quest.setActiveCustomer;
  var hasSoldWeapon = quest.hasSoldWeapon, setHasSoldWeapon = quest.setHasSoldWeapon;

  // --- Market State (already destructured above from useEconomyState) ---

  // --- Player State (from usePlayerState) ---
  var reputation = player.reputation, setReputation = player.setReputation;
  var level = player.level, setLevel = player.setLevel;
  var xp = player.xp, setXp = player.setXp;
  var statPoints = player.statPoints, setStatPoints = player.setStatPoints;
  var stats = player.stats, setStats = player.setStats;
  var upgrades = player.upgrades, setUpgrades = player.setUpgrades;
  var unlockedBP = player.unlockedBP, setUnlockedBP = player.setUnlockedBP;

  // --- Quest State (from useQuestState) ---
  var royalQuest = quest.royalQuest, setRoyalQuest = quest.setRoyalQuest;
  var questNum = quest.questNum, setQuestNum = quest.setQuestNum;
  var mEvent = quest.mEvent, setMEvent = quest.setMEvent;
  var promoteUses = quest.promoteUses, setPromoteUses = quest.setPromoteUses;

  // --- Forge State (from useForgeState) ---
  var wipWeapon = forge.wipWeapon, setWipWeapon = forge.setWipWeapon;
  var wKey = forge.wKey, setWKey = forge.setWKey;
  var matKey = forge.matKey, setMatKey = forge.setMatKey;
  var phase = forge.phase, setPhase = forge.setPhase;
  var qualScore = forge.qualScore, setQualScore = forge.setQualScore;
  var stress = forge.stress, setStress = forge.setStress;
  var setForgeSess = forge.setForgeSess;
  var bonusStrikes = forge.bonusStrikes, setBonusStrikes = forge.setBonusStrikes;
  var sessResult = forge.sessResult, setSessResult = forge.setSessResult;
  var forgeBubble = forge.forgeBubble, setForgeBubble = forge.setForgeBubble;
  var qteFlash = forge.qteFlash, setQteFlash = forge.setQteFlash;
  var strikesLeft = forge.strikesLeft, setStrikesLeft = forge.setStrikesLeft;

  // --- Mystery State (from useMysteryState) ---
  var pendingMystery = mystery.pendingMystery, setPendingMystery = mystery.setPendingMystery;
  var goodEventUsed = mystery.goodEventUsed, setGoodEventUsed = mystery.setGoodEventUsed;
  var mysteryPending = mystery.mysteryPending, setMysteryPending = mystery.setMysteryPending;
  var mysteryShake = mystery.mysteryShake, setMysteryShake = mystery.setMysteryShake;
  var weaponShake = mystery.weaponShake, setWeaponShake = mystery.setWeaponShake;
  var mysteryVignette = mystery.mysteryVignette, setMysteryVignette = mystery.setMysteryVignette;
  var mysteryVignetteOpacity = mystery.mysteryVignetteOpacity, setMysteryVignetteOpacity = mystery.setMysteryVignetteOpacity;

  // --- Scene State (from useMysteryState) ---
  var activeScene = mystery.activeScene, setActiveScene = mystery.setActiveScene;
  var sceneActionOverride = mystery.sceneActionOverride, setSceneActionOverride = mystery.setSceneActionOverride;
  var propOverrides = mystery.propOverrides, setPropOverrides = mystery.setPropOverrides;
  var fxRef = mystery.fxRef;

  // --- Late Night Toast ---
  useEffect(function() {
    if (hour >= 24 && !lateToastShown && screen === "game") {
      setLateToastShown(true);
      var lt = LATE_TOASTS[Math.floor(Math.random() * LATE_TOASTS.length)];
      addToast(lt.msg, lt.icon, lt.color);
    }
  }, [hour]);

  // --- Refs ---
  var finishedRef = useRef(finished);
  var custVisRef = useRef(custVisitsToday);
  var maxCustRef = useRef(maxCustToday);
  var guaranteedCustomersRef = useRef(false);
  var phaseRef = useRef(phase);
  var royalQuestRef = useRef(royalQuest);
  var gameStarted = useRef(false);

  // Keep refs current
  guaranteedCustomersRef.current = guaranteedCustomers;
  finishedRef.current = finished;
  custVisRef.current = custVisitsToday;
  maxCustRef.current = maxCustToday;
  phaseRef.current = phase;
  royalQuestRef.current = royalQuest;


  // --- Toast System ---
  useEffect(function() {
    if (activeToast || toastQueue.length === 0) return;
    var next = toastQueue[0];
    setToastQueue(function(q) { return q.slice(1); });
    setActiveToast(next);
    if (next.color === "#ef4444") sfx.quenchFail();
    else if (next.color === "#c084fc") sfx.royal();
    else if (next.color === "#4ade80" || next.color === "#fbbf24" || next.color === "#f59e0b") sfx.toast();
  }, [toastQueue, activeToast]);

  function onActiveToastDone() { setActiveToast(null); }
  function addToast(msg, icon, color, duration, locked) { setToasts(function(t) { return t.concat([{ id: Date.now() + Math.random(), msg: msg, icon: icon, color: color, duration: duration || null, locked: locked || false }]); }); }
  function removeToast(id) { setToasts(function(t) { return t.filter(function(x) { return x.id !== id; }); }); }

  // --- Event Application ---
  // --- Event Application ---
  function applyEvent(r) {
    if (!r) return;
    if (r.goldDelta !== undefined && r.goldDelta !== 0) { if (r.goldDelta > 0) { sfx.coin(); earnGold(r.goldDelta); } else { sfx.quenchFail(); spendGold(-r.goldDelta); } }
    if (r.inv !== undefined) setInv(r.inv);
    if (r.hour !== undefined) setHour(r.hour);
    if (r.stamina !== undefined) setStamina(r.stamina);
    if (r.finished !== undefined) setFinished(r.finished);
    if (r.forcedExhaustion) setForcedExhaustion(true);
    if (r.priceBonus) setPriceBonus(r.priceBonus);
    if (r.priceDebuff) setPriceDebuff(r.priceDebuff);
    if (r.matDiscount) setMatDiscount(r.matDiscount);
    if (r.globalMatMult) setGlobalMatMult(r.globalMatMult);
    if (r.guaranteedCustomers) setGuaranteedCustomers(true);
    if (r.extraCustomers) setMaxCustToday(BASE_DAILY_CUSTOMERS + r.extraCustomers);
  }

  // --- Mystery Events ---
  function applyMystery(onComplete, wasForging) {
    if (!pendingMystery || !pendingMystery.severity) { setPendingMystery(null); if (onComplete) onComplete(); return; }
    var pm = pendingMystery; setPendingMystery(null); setMysteryPending(true); setMysteryShake(true);
    setMysteryVignette(pm.severity === "good" ? "#fbbf24" : "#ef4444");
    setTimeout(function() { setMysteryShake(false); }, 3500);
    if (pm.severity === "good") {
      sfx.mysteryGood();
      var rGood = pm.effect({ gold: gold, inv: inv, hour: hour, stamina: stamina, finished: finished });
      if (rGood.repDelta) changeRep(rGood.repDelta, 7000);
      gainXp(Math.round(xp * 0.10));
      var matName = rGood._mysteryMat ? (MATS[rGood._mysteryMat] && MATS[rGood._mysteryMat].name) || rGood._mysteryMat : "";
      addToast("A DIVINE PRESENCE\nA luminous figure drifted through the forge and vanished. It left " + rGood._mysteryMatQty + " " + matName + ". +1 rep.", "\uD83C\uDF1F", "#fbbf24", 5500, true);
      applyEvent(rGood);
    } else {
      sfx.fireTornado(); sfx.dragonFlyby();
      var rBad = pm.effect({ gold: gold, inv: inv, hour: hour, stamina: stamina, finished: finished });
      if (rBad.repDelta) changeRep(rBad.repDelta, 7000);
      loseXp(Math.round(xp * 0.15));
      var lostMatName = rBad._mysteryMat ? (MATS[rBad._mysteryMat] && MATS[rBad._mysteryMat].name) || rBad._mysteryMat : "materials";
      var wipLine = wasForging ? (" Your " + WEAPONS[wKey].name + " was destroyed.") : "";
      var weaponLine = rBad._mysteryWeaponLost ? (" A " + rBad._mysteryWeaponLost.wName + " was reduced to cinders.") : "";
      var goldLine = rBad._mysteryGoldLost ? " -" + rBad._mysteryGoldLost + "g." : "";
      if (wasForging) { setInv(function(i) { var n = Object.assign({}, i); n[matKey] = (n[matKey] || 0) + Math.floor(WEAPONS[wKey].materialCost * MAT_SCRAP_RECOVERY); return n; }); setWipWeapon(null); }
      var matLine = rBad._mysteryMat ? (" Your " + lostMatName + " is ash.") : "";
      addToast("A DRAGON DESCENDS\nA shadow of scales and fire tore through the forge." + matLine + " -1 rep." + goldLine + wipLine + weaponLine, "\uD83D\uDC80", "#ef4444", 5500, true);
      applyEvent(rBad);
    }
    setTimeout(function() { setMysteryVignetteOpacity(0); }, 5000);
    setTimeout(function() { setTimeout(function() { setMysteryVignette(null); setMysteryVignetteOpacity(1); }, 1500); setMysteryPending(false); if (onComplete) onComplete(); }, 7000);
  }

  // --- Customer System ---
  var trySpawnCustomer = useCallback(function(newHour, nf) {
    var items = nf || finishedRef.current;
    if (!items.length || custVisRef.current >= maxCustRef.current) return;
    if (newHour < 9 || newHour > 21) return;
    if (phaseRef.current !== PHASES.IDLE && phaseRef.current !== PHASES.SESS_RESULT) return;
    if (!guaranteedCustomersRef.current && Math.random() > 0.42) return;
    var shuffled = CUST_TYPES.slice().sort(function() { return Math.random() - 0.5; });
    shuffled.some(function(ct) {
      var match = items.find(function(w) { return getQualityTier(w.score).scoreMin >= ct.minQuality || ct.minQuality === 0; });
      if (match) { setActiveCustomer({ type: ct, weapon: match }); setCustVisitsToday(function(v) { return v + 1; }); sfx.doorbell(); return true; }
      return false;
    });
  }, [sfx]);


  // --- Time & Actions ---
  function advanceTime(hrs, nf, useStam) {
    setHour(function(h) { var next = h + hrs; setTimeout(function() { trySpawnCustomer(next, nf); }, 200); return next; });
    if (useStam) { setStamina(function(s) { return Math.max(0, s - 1); }); gainXp(6); }
  }
  function promote() {
    sfx.click(); advanceTime(1, undefined, true); setPromoteUses(function(p) { return p + 1; });
    var items = finishedRef.current;
    var shuffled = CUST_TYPES.slice().sort(function() { return Math.random() - 0.5; });
    shuffled.some(function(ct) {
      var match = items.find(function(w) { return getQualityTier(w.score).scoreMin >= ct.minQuality || ct.minQuality === 0; });
      if (match) { setActiveCustomer({ type: ct, weapon: match }); setCustVisitsToday(function(v) { return v + 1; }); sfx.doorbell(); return true; }
      return false;
    });
  }

  // --- Player ViewModel ---
  var playerVM = usePlayerVM({
    player: player, sfx: sfx,
    setStamina: setStamina, setGameOver: setGameOver,
    gameOver: gameOver
  });
  var gainXp = playerVM.gainXp, loseXp = playerVM.loseXp, changeRep = playerVM.changeRep, allocateStat = playerVM.allocateStat;
  var xpNeeded = playerVM.xpNeeded;

  // --- Economy ViewModel ---
  var economyVM = useEconomyVM({
    economy: economy, quest: quest, sfx: sfx,
    addToast: addToast, trySpawnCustomer: trySpawnCustomer, hour: hour
  });
  var earnGold = economyVM.earnGold, spendGold = economyVM.spendGold, popGold = economyVM.popGold, removeGoldPop = economyVM.removeGoldPop, handleSell = economyVM.handleSell, handleRefuse = economyVM.handleRefuse;

  // --- Forge ViewModel ---
  var forgeVM = useForgeVM({
    forge: forge, sfx: sfx, addToast: addToast, advanceTime: advanceTime,
    spendGold: spendGold, gainXp: gainXp, applyMystery: applyMystery,
    trySpawnCustomer: trySpawnCustomer, setInv: setInv, setFinished: setFinished,
    setRoyalQuest: setRoyalQuest, setWeaponShake: setWeaponShake,
    gold: gold, inv: inv, finished: finished, hour: hour, stamina: stamina,
    forcedExhaustion: forcedExhaustion, stats: stats, upgrades: upgrades,
    pendingMystery: pendingMystery, royalQuestRef: royalQuestRef
  });
  var takeBreak = forgeVM.takeBreak, resumeWip = forgeVM.resumeWip, scrapWip = forgeVM.scrapWip, scrapWeapon = forgeVM.scrapWeapon, confirmSelect = forgeVM.confirmSelect, onForgeClick = forgeVM.onForgeClick, handleAutoFire = forgeVM.handleAutoFire, attemptForge = forgeVM.attemptForge, doNormalize = forgeVM.doNormalize;
  var weapon = forgeVM.weapon, matData = forgeVM.matData, matDiffMod = forgeVM.matDiffMod, effDiff = forgeVM.effDiff, isExhausted = forgeVM.isExhausted, sessCost = forgeVM.sessCost, maxStam = forgeVM.maxStam;
  var heatWinLo = forgeVM.heatWinLo, heatWinHi = forgeVM.heatWinHi, heatSpeedMult = forgeVM.heatSpeedMult, hammerSpeedMult = forgeVM.hammerSpeedMult, quenchSpeedMult = forgeVM.quenchSpeedMult;
  var strikeMult = forgeVM.strikeMult, activeSpeedMult = forgeVM.activeSpeedMult, speedLabel = forgeVM.speedLabel, speedColor = forgeVM.speedColor;
  var strikeLabel = forgeVM.strikeLabel, strikeColor = forgeVM.strikeColor, stressColor = forgeVM.stressColor, stressLabel2 = forgeVM.stressLabel2;
  var showBars = forgeVM.showBars, isQTEActive = forgeVM.isQTEActive, isForging = forgeVM.isForging, diffColor = forgeVM.diffColor;
  var qtePosRef = forgeVM.qtePosRef, qteProcessing = forgeVM.qteProcessing;

  // --- Input Router ---
  var input = useInputRouter({
    hour: hour, stamina: stamina, stress: stress, sessCost: sessCost,
    isQTEActive: isQTEActive, isForging: isForging,
    activeCustomer: activeCustomer, toastQueue: toastQueue, activeToast: activeToast,
    mysteryPending: mysteryPending, finished: finished, promoteUses: promoteUses,
    gold: gold, inv: inv, matKey: matKey, weapon: weapon, buyPrice: MATS[matKey] ? MATS[matKey].price * Math.max(0, (weapon ? weapon.materialCost : 0) - (inv[matKey] || 0)) : 0
  });
  var isLocked = input.isLocked;
  var dayVM = useDayVM({
    dayState: dayState, economy: economy, quest: quest, mystery: mystery,
    sfx: sfx, addToast: addToast, setToastQueue: setToastQueue, setActiveToast: setActiveToast,
    trySpawnCustomer: trySpawnCustomer, earnGold: earnGold, changeRep: changeRep,
    forgeOnSleep: forgeVM.onSleep, applyEvent: applyEvent, applyMystery: applyMystery,
    maxStam: maxStam, advanceTime: advanceTime, unlockedBP: unlockedBP, reputation: reputation
  });
  var waitHour = dayVM.waitHour, buildDayQueue = dayVM.buildDayQueue, doSleep = dayVM.doSleep, sleep = dayVM.sleep;

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


  // --- Game Init ---
  useEffect(function() {
    if (screen !== "game" || gameStarted.current) return;
    gameStarted.current = true;
    var state = { gold: STARTING_GOLD, inv: { bronze: 10, iron: 4, steel: 0, damascus: 0, titanium: 0, iridium: 0, tungsten: 0, mithril: 0, orichalcum: 0 }, finished: [], hasSoldWeapon: false, lastSleepHour: 0, stamina: BASE_STAMINA, unlockedBP: ["dagger", "shortsword", "axe"], reputation: 4 };
    setActiveToast(null); sfx.setMode("idle");
    setTimeout(function() { setToastQueue(buildDayQueue(1, state, 0)); }, 300);
  }, [screen]);
  useEffect(function() { return function() { sfx.setMode("off"); }; }, []);

  // --- Reset ---
  function resetGame() {
    sfx.setMode("off"); gameStarted.current = false; forgeVM.resetForgeState();
    setScreen("splash"); setShowShop(false); setShowMaterials(false); setShowGiveUp(false); setShowOptions(false);
    setToasts([]); setToastQueue([]); setActiveToast(null); setGameOver(false); setActiveCustomer(null);
    setGold(STARTING_GOLD); setTotalGoldEarned(0); setInv({ bronze: 10, iron: 4, steel: 0, damascus: 0, titanium: 0, iridium: 0, tungsten: 0, mithril: 0, orichalcum: 0 });
    setFinished([]); setDay(1); setHour(WAKE_HOUR); setStamina(BASE_STAMINA); setForcedExhaustion(false); setLateToastShown(false);
    setPriceBonus(1.0); setPriceDebuff(1.0); setMatDiscount(null); setGlobalMatMult(1.0); setGuaranteedCustomers(false); setCustVisitsToday(0); setMaxCustToday(BASE_DAILY_CUSTOMERS); setReputation(4);
    setLevel(1); setXp(0); setStatPoints(0); setStats(Object.assign({}, STATS_DEF)); setUpgrades({ anvil: 0, hammer: 0, forge: 0, quench: 0, furnace: 0 }); setUnlockedBP(["dagger", "shortsword", "axe"]);
    setRoyalQuest(null); setQuestNum(0); setMEvent(null); setHasSoldWeapon(false); setPromoteUses(0);
    setWipWeapon(null); setWKey("dagger"); setMatKey(Object.keys(MATS)[0]); setPhase(PHASES.IDLE);
    setQualScore(0); setStress(0); setForgeSess(0); setBonusStrikes(0); setSessResult(null); setForgeBubble(null); setQteFlash(null); setStrikesLeft(0);
    setPendingMystery(null); setGoodEventUsed(false); setMysteryPending(false); setMysteryShake(false); setWeaponShake(false); setMysteryVignette(null); setMysteryVignetteOpacity(1); setGoldPops([]);
    setActiveScene("forge"); setSceneActionOverride(null); setPropOverrides({});
  }

  // --- Derived Display Values ---
  var hourPct = Math.min(100, Math.max(0, 100 - ((hour - WAKE_HOUR) / 16) * 100));
  var timeColor = hour < 18 ? "#4ade80" : hour < 21 ? "#fbbf24" : hour < 24 ? "#fb923c" : "#ef4444";
  var timeBarPct = hour >= 24 ? 100 : hourPct;
  var timeBarClass = hour >= 24 ? "blink-slow" : "";
  var smithRank = getSmithRank(totalGoldEarned);
  var nextRank = getNextRank(totalGoldEarned);

  // ============================================================
  // RENDER
  // ============================================================

  if (gameOver) return <ScaleWrapper><GameOverScreen day={day} gold={gold} totalGoldEarned={totalGoldEarned} onReset={resetGame} /></ScaleWrapper>;
  if (screen === "splash") return <ScaleWrapper><SplashScreen onEnter={function() { sfx.warmup(); setTimeout(function() { sfx.fanfare(); }, 80); setScreen("menu"); }} /></ScaleWrapper>;
  if (screen === "menu") return <ScaleWrapper><MainMenu onStart={function() { setScreen("game"); }} sfx={sfx} /></ScaleWrapper>;

  // ============================================================
  // MOBILE RENDER BRANCH
  // ============================================================
  if (isMobile) {
    // --- Build scene for center zone ---
    var mobileScene = (function() {
      var ss = resolveSceneState({ phase: phase, scene: activeScene, overrideAction: sceneActionOverride, propOverrides: propOverrides });
      return <SceneStage scene={ss.scene} phase={ss.phase} characterAction={ss.characterAction} onCharacterActionComplete={function(nextAction) { setSceneActionOverride(nextAction); }} propOverrides={ss.propOverrides} fxRef={fxRef} />;
    })();

    // --- Build QTE + forge UI for center zone ---
    var mobileForgeUI = (
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "5%", gap: 4, width: "100%", flex: 1, paddingLeft: handedness === "left" ? 0 : 160, paddingRight: handedness === "left" ? 160 : 0, boxSizing: "border-box" }}>
          {/* Forge bubble */}
          {forgeBubble && (
              <div onClick={function(e) { e.stopPropagation(); setForgeBubble(null); }} style={{ position: "absolute", top: 4, right: 4, zIndex: 60, background: "#0c0905", border: "2px solid " + forgeBubble.color, borderRadius: 10, padding: "10px 12px", width: 120, boxShadow: "0 4px 16px rgba(0,0,0,0.97)", cursor: "pointer", fontSize: 9 }}>
                <div style={{ fontSize: 9, color: forgeBubble.color, letterSpacing: 1, fontWeight: "bold", marginBottom: 4 }}>{forgeBubble.title}</div>
                {forgeBubble.lines.map(function(l, i) { return <div key={i} style={{ fontSize: 10, color: l.color || "#c8b89a", lineHeight: 1.6, fontWeight: l.bold ? "bold" : "normal" }}>{l.text}</div>; })}
              </div>
          )}

          {/* QTE dark box — quality/stress bars + QTE needle */}
          {(showBars || isQTEActive) && (
              <div style={{ width: "100%", maxWidth: 400, background: "rgba(8,5,2,0.88)", border: "1px solid #2a1f0a", borderRadius: 10, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                {showBars && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1 }}>QUALITY</span>
                        <span style={{ fontSize: 10, color: getQualityTier(qualScore).weaponColor, fontWeight: "bold" }}>{getQualityTier(qualScore).label} ({qualScore})</span>
                      </div>
                      <Bar value={qualScore} max={100} color={getQualityTier(qualScore).weaponColor} h={8} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                        <span style={{ fontSize: 8, color: "#8a7a64", letterSpacing: 1 }}>STRESS</span>
                        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                          <Pips count={STRESS_MAX} filled={stress} filledColor={stressColor} size={12} />
                          <span style={{ color: stressColor, fontWeight: "bold", fontSize: 9 }}>{stressLabel2}</span>
                        </div>
                      </div>
                    </div>
                )}
                <QTEPanel phase={phase} heatWinLo={heatWinLo} heatWinHi={heatWinHi} flash={qteFlash} strikesLeft={strikesLeft} strikesTotal={BALANCE.baseStrikes + bonusStrikes} heatSpeedMult={heatSpeedMult} hammerSpeedMult={hammerSpeedMult} quenchSpeedMult={quenchSpeedMult} posRef={qtePosRef} processingRef={qteProcessing} onAutoFire={handleAutoFire} />
              </div>
          )}

          {/* QTEPanel when NOT in dark box (non-QTE forge phases that still need it) */}
          {!showBars && !isQTEActive && (
              <QTEPanel phase={phase} heatWinLo={heatWinLo} heatWinHi={heatWinHi} flash={qteFlash} strikesLeft={strikesLeft} strikesTotal={BALANCE.baseStrikes + bonusStrikes} heatSpeedMult={heatSpeedMult} hammerSpeedMult={hammerSpeedMult} quenchSpeedMult={quenchSpeedMult} posRef={qtePosRef} processingRef={qteProcessing} onAutoFire={handleAutoFire} />
          )}

          {/* MOBILE WEAPON SELECT */}
          {phase === PHASES.SELECT && (
              <div style={{ position: "absolute", top: 0, bottom: 0, right: handedness === "left" ? 160 : 0, left: handedness === "left" ? 0 : 160, zIndex: 30, background: "rgba(10,7,4,0.95)", display: "flex", flexDirection: "column", alignItems: "center", padding: 10, overflow: "hidden" }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: "#f59e0b", fontWeight: "bold", marginBottom: 6 }}>CHOOSE WEAPON</div>
                {/* Selected weapon info */}
                <div style={{ display: "flex", gap: 10, marginBottom: 8, width: "100%", maxWidth: 400 }}>
                  <div style={{ flex: 1, background: "#120e08", border: "1px solid #f59e0b44", borderRadius: 6, padding: "6px 8px" }}>
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: "bold", marginBottom: 4 }}>{WEAPONS[wKey].name.toUpperCase()}</div>
                    <div style={{ fontSize: 9, color: "#8a7a64" }}>COST <span style={{ color: "#c8b89a" }}>{WEAPONS[wKey].materialCost} units</span></div>
                    <div style={{ fontSize: 9, color: "#8a7a64" }}>SELL <span style={{ color: "#f59e0b" }}>~{referenceValue(wKey)}g</span></div>
                  </div>
                  <div style={{ width: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#120e08", border: "1px solid #f59e0b44", borderRadius: 6 }}>
                    <div style={{ fontSize: 7, color: "#8a7a64", letterSpacing: 1 }}>DIFF</div>
                    <div style={{ fontSize: 20, color: WEAPONS[wKey].difficulty <= 3 ? "#4ade80" : WEAPONS[wKey].difficulty <= 6 ? "#fbbf24" : WEAPONS[wKey].difficulty <= 8 ? "#fb923c" : "#ef4444", fontWeight: "bold" }}>{WEAPONS[wKey].difficulty}</div>
                  </div>
                </div>
                {/* Weapon list */}
                <div style={{ flex: 1, width: "100%", maxWidth: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.keys(WEAPONS).filter(function(k) { return unlockedBP.includes(k); }).map(function(k) {
                    var w = WEAPONS[k], isQ = !!(royalQuest && !royalQuest.fulfilled && royalQuest.weaponKey === k), isSel = wKey === k;
                    return (
                        <div key={k} onClick={function() { sfx.click(); setWKey(k); }} style={{ border: "1px solid " + (isSel ? "#f59e0b" : "#2a1f0a"), borderRadius: 5, padding: "7px 10px", cursor: "pointer", background: isSel ? "#2a1f0a" : "#0a0704", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: isSel ? "#f59e0b" : "#f0e6c8", letterSpacing: 1 }}>{w.name.toUpperCase()}</span>
                            {isQ && <span style={{ fontSize: 9, background: "#f59e0b", color: "#0a0704", borderRadius: 3, padding: "1px 5px", fontWeight: "bold" }}>QUEST</span>}
                          </div>
                          <span style={{ fontSize: 9, color: "#8a7a64" }}>D{w.difficulty}</span>
                        </div>
                    );
                  })}
                </div>
                {/* Buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={function() { sfx.click(); setPhase(PHASES.SELECT_MAT); }} disabled={stamina <= 0 || input.isLocked} style={{ background: "#2a1f0a", border: "2px solid #f59e0b", borderRadius: 6, color: "#f59e0b", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}>NEXT</button>
                  <button onClick={function() { sfx.click(); setPhase(PHASES.IDLE); }} style={{ background: "#141009", border: "2px solid #3d2e0f", borderRadius: 6, color: "#8a7a64", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}>CANCEL</button>
                </div>
              </div>
          )}

          {/* MOBILE MATERIAL SELECT */}
          {phase === PHASES.SELECT_MAT && (
              <div style={{ position: "absolute", top: 0, bottom: 0, right: handedness === "left" ? 160 : 0, left: handedness === "left" ? 0 : 160, zIndex: 30, background: "rgba(10,7,4,0.95)", display: "flex", flexDirection: "column", alignItems: "center", padding: 10, overflow: "hidden" }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: "#f59e0b", fontWeight: "bold", marginBottom: 4 }}>CHOOSE MATERIAL</div>
                <div style={{ fontSize: 9, color: "#8a7a64", marginBottom: 6 }}>{weapon.name} needs {weapon.materialCost} units</div>
                {/* Selected material info */}
                <div style={{ display: "flex", gap: 10, marginBottom: 8, width: "100%", maxWidth: 400 }}>
                  <div style={{ flex: 1, background: "#120e08", border: "1px solid " + MATS[matKey].color + "44", borderRadius: 6, padding: "6px 8px" }}>
                    <div style={{ fontSize: 11, color: MATS[matKey].color, fontWeight: "bold", marginBottom: 4 }}>{MATS[matKey].name.toUpperCase()}</div>
                    <div style={{ fontSize: 9, color: "#8a7a64" }}>STOCK <span style={{ color: (inv[matKey] || 0) >= weapon.materialCost ? "#4ade80" : "#ef4444" }}>{inv[matKey] || 0} units</span></div>
                    <div style={{ fontSize: 9, color: "#8a7a64" }}>VALUE <span style={{ color: "#c8b89a" }}>x{MATS[matKey].valueMultiplier}</span></div>
                  </div>
                  <div style={{ width: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#120e08", border: "1px solid " + MATS[matKey].color + "44", borderRadius: 6 }}>
                    <div style={{ fontSize: 7, color: "#8a7a64", letterSpacing: 1 }}>+DIFF</div>
                    <div style={{ fontSize: 20, color: MATS[matKey].difficultyModifier < 0 ? "#4ade80" : MATS[matKey].difficultyModifier === 0 ? "#c8b89a" : MATS[matKey].difficultyModifier <= 3 ? "#fbbf24" : "#fb923c", fontWeight: "bold" }}>{MATS[matKey].difficultyModifier > 0 ? "+" : ""}{MATS[matKey].difficultyModifier}</div>
                  </div>
                </div>
                {/* Material list */}
                <div style={{ flex: 1, width: "100%", maxWidth: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(MATS).map(function(e) {
                    var k = e[0], m = e[1], have = inv[k] || 0, enough = have >= weapon.materialCost;
                    var isQ = !!(royalQuest && !royalQuest.fulfilled && royalQuest.materialRequired === k);
                    var isSel = matKey === k, needed = Math.max(0, weapon.materialCost - have), buyPrice = MATS[k].price * needed, canBuy = needed > 0 && gold >= buyPrice;
                    var canSelect = enough || canBuy;
                    return (
                        <div key={k} onClick={canSelect ? function() { sfx.click(); setMatKey(k); } : null} style={{ border: "1px solid " + (isSel ? "#f59e0b" : canSelect ? "#2a1f0a" : "#1a1209"), borderRadius: 5, padding: "7px 10px", cursor: canSelect ? "pointer" : "not-allowed", background: isSel ? "#2a1f0a" : "#0a0704", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: canSelect ? 1 : 0.4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: isSel ? m.color : canSelect ? m.color : "#3d2e0f", letterSpacing: 1, fontWeight: "bold" }}>{m.name.toUpperCase()}</span>
                            {isQ && <span style={{ fontSize: 9, background: "#f59e0b", color: "#0a0704", borderRadius: 3, padding: "1px 5px", fontWeight: "bold" }}>QUEST</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 9, color: "#8a7a64" }}>{have}/{weapon.materialCost}</span>
                            {needed > 0 && <span style={{ fontSize: 9, color: canBuy ? "#f59e0b" : "#ef4444", fontWeight: "bold" }}>{canBuy ? needed + "x" + MATS[k].price + "g" : "NO GOLD"}</span>}
                          </div>
                        </div>
                    );
                  })}
                </div>
                {/* Buttons */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {(function() {
                    var canConfirm = !input.confirmSelect.disabled;
                    return <button onClick={canConfirm ? function() { sfx.click(); confirmSelect(); } : null} disabled={!canConfirm} style={{ background: canConfirm ? "#2a1f0a" : "#0a0704", border: "2px solid " + (canConfirm ? "#f59e0b" : "#1a1209"), borderRadius: 6, color: canConfirm ? "#f59e0b" : "#2a1f0a", padding: "8px 24px", fontSize: 12, cursor: canConfirm ? "pointer" : "not-allowed", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}>CONFIRM</button>;
                  })()}
                  <button onClick={function() { sfx.click(); setPhase(PHASES.SELECT); }} style={{ background: "#141009", border: "2px solid #3d2e0f", borderRadius: 6, color: "#8a7a64", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}>BACK</button>
                </div>
              </div>
          )}
        </div>
    );

    // --- Build overlay (toasts, customer) ---
    var mobileOverlay = (
        <>
          {toasts.map(function(t) { return <Toast key={t.id} msg={t.msg} icon={t.icon} color={t.color} duration={t.duration} locked={t.locked} onDone={function() { removeToast(t.id); }} />; })}
          {activeToast && <Toast key={activeToast.id} msg={activeToast.msg} icon={activeToast.icon} color={activeToast.color} duration={activeToast.duration} locked={activeToast.locked} onDone={onActiveToastDone} />}
          {activeCustomer && <CustomerPanel customer={activeCustomer} weapon={activeCustomer.weapon} onSell={function(price) { handleSell(price, activeCustomer.weapon.id); }} onRefuse={handleRefuse} silverTongue={stats.silverTongue} priceBonus={priceBonus} priceDebuff={priceDebuff} sfx={sfx} />}
        </>
    );

    return (
        <>
          {showShop && <ShopModal gold={gold} inv={inv} upgrades={upgrades} unlockedBP={unlockedBP} matDiscount={matDiscount} globalMatMult={globalMatMult} royalQuest={royalQuest} sfx={sfx} onClose={function() { setShowShop(false); }} onBuy={function(mat, qty, price) { sfx.click(); var c = price * qty; if (gold < c) return; sfx.coin(); spendGold(c); setInv(function(i) { var n = Object.assign({}, i); n[mat] = (n[mat] || 0) + qty; return n; }); }} onUpgrade={function(cat) { sfx.click(); var nl = upgrades[cat] + 1, u = UPGRADES[cat][nl]; if (!u || gold < u.cost) return; spendGold(u.cost); setUpgrades(function(u2) { var n = Object.assign({}, u2); n[cat] = nl; return n; }); }} onBuyBP={function(k, cost) { sfx.click(); if (gold < cost) return; spendGold(cost); setUnlockedBP(function(u) { return u.concat([k]); }); }} onPromote={function() { promote(); }}
                                  promoteDisabled={input.promote.disabled || stamina <= 0}
                                  promoteUses={promoteUses}
                                  maxPromoteUses={BALANCE.maxPromoteUses}
                                  finishedCount={finished.length} />}
          {showMaterials && <MaterialsModal inv={inv} sfx={sfx} onClose={function() { sfx.click(); setShowMaterials(false); }} onSell={function(mat, qty) { sfx.coin(); var price = Math.floor(MATS[mat].price / 2) * qty; setInv(function(i) { var n = Object.assign({}, i); n[mat] = Math.max(0, (n[mat] || 0) - qty); return n; }); earnGold(price); }} />}
          <MobileLayout
              handedness={handedness}
              phase={phase}

              /* Banner props */
              level={level}
              gold={gold}
              day={day}
              royalQuest={royalQuest}

              /* Data strip props — forging */
              qualScore={qualScore}
              qualityColor={getQualityTier(qualScore).weaponColor}
              stressColor={stressColor}
              stressLabel={stressLabel2}
              weaponName={weapon.name}
              matName={matData.name}
              matColor={matData.color}
              effDiff={effDiff}
              diffColor={diffColor}

              /* Data strip props — idle */
              reputation={reputation}
              repColor={reputation >= 7 ? "#4ade80" : reputation >= 4 ? "#fb923c" : "#ef4444"}
              rankName={smithRank.name}
              finished={finished}
              stats={stats}
              statPoints={statPoints}

              /* Action strip callbacks — forging (sess_result) */
              onForge={function() { sfx.click(); attemptForge(); }}
              forgeDisabled={input.forge.disabled}
              onNormalize={function() { sfx.click(); doNormalize(); }}
              normalizeDisabled={input.normalize.disabled}
              onQuench={function() { sfx.click(); setPhase(PHASES.QUENCH); }}
              quenchDisabled={input.quench.disabled}
              onScrap={function() { sfx.click(); scrapWeapon(); }}
              onLeave={function() { sfx.click(); takeBreak(); }}

              /* Action strip callbacks — idle */
              onSleep={function() { sfx.click(); sleep(); }}
              sleepDisabled={input.sleep.disabled}
              onRest={waitHour}
              restDisabled={input.rest.disabled}
              onPromote={promote}
              promoteDisabled={input.promote.disabled}
              onScavenge={scavenge}
              scavengeDisabled={input.scavenge.disabled}
              onShop={function() { sfx.click(); setShowShop(true); }}
              shopDisabled={input.shop.disabled}
              onMats={function() { sfx.click(); setShowMaterials(true); }}
              matsDisabled={input.mats.disabled}

              /* Options button */
              onOptions={function() { sfx.click(); setShowOptions(true); }}

              /* Begin forge / WIP props */
              hasWip={!!wipWeapon}
              onBeginForge={function() { sfx.click(); setPhase(PHASES.SELECT); }}
              beginForgeDisabled={input.beginForge.disabled}
              onResumeWip={function() { resumeWip(); }}
              resumeWipDisabled={input.resumeWip.disabled}
              onScrapWip={function() { scrapWip(); }}

              /* Center zone content */
              scene={mobileScene}
              forgeUI={mobileForgeUI}
              overlay={mobileOverlay}
              onForgeClick={onForgeClick}

              /* Bottom bar props */
              timeLabel={formatTime(hour)}
              timeColor={timeColor}
              timePct={timeBarPct}
              stamina={stamina}
              maxStam={maxStam}
              staminaColor={isExhausted ? "#ef4444" : "#f59e0b"}
              staminaPct={Math.round((stamina / maxStam) * 100)}
              onToggleHand={function() { setHandedness(function(h) { return h === "right" ? "left" : "right"; }); }}
          />
          {showOptions && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Josefin Sans', sans-serif" }} onClick={function(e) { if (e.target === e.currentTarget) setShowOptions(false); }}>
            <div style={{ padding: "24px 28px", width: 300, maxHeight: "80vh", overflowY: "auto", background: "#0f0b06", border: "2px solid #2a1f0a", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.9)" }}>
              <Row style={{ marginBottom: 16 }}><div style={{ fontSize: 14, color: "#f59e0b", letterSpacing: 3, fontFamily: "'Cinzel', serif" }}>OPTIONS</div><button onClick={function() { setShowOptions(false); }} style={{ background: "#2a1f0a", border: "1px solid #3d2e0f", borderRadius: 5, color: "#f59e0b", padding: "4px 10px", cursor: "pointer", fontFamily: "'Josefin Sans', sans-serif", fontSize: 13 }}>X</button></Row>
              <div style={{ borderTop: "1px solid #2a1f0a", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <SectionLabel>LAYOUT</SectionLabel><label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 12, color: "#c8b89a", letterSpacing: 1, userSelect: "none" }}>Left-Handed Mode<input type="checkbox" checked={handedness === "left"} onChange={function() { setHandedness(function(h) { return h === "right" ? "left" : "right"; }); }} style={{ accentColor: "#f59e0b", width: 15, height: 15, cursor: "pointer" }} /></label><div style={{ borderTop: "1px solid #2a1f0a", marginTop: 12, paddingTop: 12 }} />
                <SectionLabel>AUDIO</SectionLabel>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#c8b89a", letterSpacing: 1, userSelect: "none" }}>SFX<input type="range" min="0" max="1" step="0.05" value={sfxVol} onChange={function(e) { var v = parseFloat(e.target.value); setSfxVol(v); sfx.setSfxVol(v); }} style={{ width: 120, accentColor: "#f59e0b", cursor: "pointer" }} /></label>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#c8b89a", letterSpacing: 1, userSelect: "none" }}>MUSIC<input type="range" min="0" max="1" step="0.05" value={musicVol} onChange={function(e) { var v = parseFloat(e.target.value); setMusicVol(v); sfx.setMusicVol(v); }} style={{ width: 120, accentColor: "#f59e0b", cursor: "pointer" }} /></label>
              </div>
              <div style={{ borderTop: "1px solid #2a1f0a", paddingTop: 14, marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <SectionLabel style={{ marginBottom: 4 }}>DANGER ZONE</SectionLabel>
                <DangerBtn onClick={function() { setShowOptions(false); setShowGiveUp(true); }}>Give Up</DangerBtn>
              </div>
            </div>
          </div>)}
          <DevBanner />
        </>
    );
  }

  // ============================================================
  // DESKTOP RENDER (unchanged below this line)
  // ============================================================

  return (
      <>
        {showShop && <ShopModal gold={gold} inv={inv} upgrades={upgrades} unlockedBP={unlockedBP} matDiscount={matDiscount} globalMatMult={globalMatMult} royalQuest={royalQuest} sfx={sfx} onClose={function() { setShowShop(false); }} onBuy={function(mat, qty, price) { sfx.click(); var c = price * qty; if (gold < c) return; sfx.coin(); spendGold(c); setInv(function(i) { var n = Object.assign({}, i); n[mat] = (n[mat] || 0) + qty; return n; }); }} onUpgrade={function(cat) { sfx.click(); var nl = upgrades[cat] + 1, u = UPGRADES[cat][nl]; if (!u || gold < u.cost) return; spendGold(u.cost); setUpgrades(function(u2) { var n = Object.assign({}, u2); n[cat] = nl; return n; }); }} onBuyBP={function(k, cost) { sfx.click(); if (gold < cost) return; spendGold(cost); setUnlockedBP(function(u) { return u.concat([k]); }); }} onPromote={function() { promote(); }}
                                promoteDisabled={input.promote.disabled || stamina <= 0}
                                promoteUses={promoteUses}
                                maxPromoteUses={BALANCE.maxPromoteUses}
                                finishedCount={finished.length} />}
        {showMaterials && <MaterialsModal inv={inv} sfx={sfx} onClose={function() { sfx.click(); setShowMaterials(false); }} onSell={function(mat, qty) { sfx.coin(); var price = Math.floor(MATS[mat].price / 2) * qty; setInv(function(i) { var n = Object.assign({}, i); n[mat] = Math.max(0, (n[mat] || 0) - qty); return n; }); earnGold(price); }} />}
        {showGiveUp && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center" }}><Panel color="#ef4444" style={{ padding: "24px", textAlign: "center", maxWidth: 280 }}><div style={{ fontSize: 13, color: "#ef4444", letterSpacing: 2, marginBottom: 8 }}>GIVE UP?</div><div style={{ fontSize: 10, color: "#c8b89a", marginBottom: 16, lineHeight: 1.7 }}>The king will not be pleased.</div><Row center={true} style={{ gap: 8 }}><DangerBtn onClick={function() { setShowGiveUp(false); setGameOver(true); }}>Yes, Give Up</DangerBtn><ActionBtn onClick={function() { setShowGiveUp(false); }} color="#8a7a64" bg="#141009">Cancel</ActionBtn></Row></Panel></div>}
        <GameShell className={(mysteryShake ? "mystery-shake" : "") + " " + (weaponShake ? "weapon-shake" : "")}>
          {mysteryVignette && <div style={{ position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none", background: "radial-gradient(ellipse at center, transparent 20%, " + mysteryVignette + "cc 100%)", opacity: mysteryVignetteOpacity, transition: "opacity 1.5s" }} />}
          <style>{`
            @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes blinkSlow{0%,100%{opacity:1}50%{opacity:0.15}}@keyframes goldPop{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-60px)}}
            .blink{animation:blink 0.9s step-start infinite}.blink-slow{animation:blinkSlow 1.6s ease-in-out infinite}.blink-fast{animation:blink 0.45s step-start infinite}
            @keyframes hammerHit{0%{transform:translateY(-50%) scale(1);opacity:1}100%{transform:translateY(calc(-50% - 24px)) scale(0);opacity:0}}.hammer-hit{animation:hammerHit 0.2s ease-out forwards;}
            @keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-32px)}}
            @keyframes weaponShake{0%{transform:translate(0,0)}20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-2px,2px)}80%{transform:translate(2px,-1px)}100%{transform:translate(0,0)}}.weapon-shake{animation:weaponShake 0.35s ease-out forwards;}
            @keyframes mysteryShake{0%{transform:translate(0,0)}5%{transform:translate(-10px,5px)}10%{transform:translate(10px,-5px)}15%{transform:translate(-9px,8px)}20%{transform:translate(9px,-7px)}25%{transform:translate(-8px,6px)}30%{transform:translate(8px,-6px)}38%{transform:translate(-5px,4px)}46%{transform:translate(5px,-4px)}54%{transform:translate(-3px,3px)}62%{transform:translate(3px,-2px)}72%{transform:translate(-2px,2px)}82%{transform:translate(2px,-1px)}92%{transform:translate(-1px,1px)}100%{transform:translate(0,0)}}.mystery-shake{animation:mysteryShake 3.5s ease-out forwards;}
          `}</style>

          {/* HEADER */}
          <GameHeader>
            <div style={{ textAlign: "center", marginBottom: 6, position: "relative" }}>
              <div style={{ fontSize: 14, fontWeight: "bold", color: "#f59e0b", letterSpacing: 3 }}>THE WOBBLY ANVIL</div>
              <SectionLabel style={{ letterSpacing: 2 }}>ROYAL BLACKSMITH</SectionLabel>
              <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", lineHeight: 1 }}><div style={{ fontSize: 11, color: "#8a7a64", letterSpacing: 2, textAlign: "right", marginBottom: 2 }}>DAY</div><div style={{ fontSize: 32, color: "#f0e6c8", fontWeight: "bold", lineHeight: 1, textAlign: "right" }}>{day}</div></div>
            </div>
            <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
              <div style={{ width: COL_W, flexShrink: 0, marginRight: 8, alignSelf: "stretch", display: "flex" }}>
                <Tooltip title="SMITH RANK" text="Your rank grows as you earn gold. Sell better weapons for faster progression." below={true}>
                  <div style={{ flex: 1, background: "#0a0704", border: "1px solid #f59e0b44", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "default", boxSizing: "border-box" }}>
                    <SectionLabel style={{ marginBottom: 5 }}>SMITH RANK</SectionLabel>
                    <div style={{ fontSize: 14, color: "#fbbf24", fontWeight: "bold", letterSpacing: 1, lineHeight: 1.3 }}>{smithRank.name.toUpperCase()}</div>
                    {nextRank && <div style={{ marginTop: 8 }}><div style={{ height: 7, background: "#1a1209", borderRadius: 3, overflow: "hidden", border: "1px solid #2a1f0a" }}><div style={{ height: "100%", background: "#f59e0b", borderRadius: 3, width: Math.round((totalGoldEarned - smithRank.threshold) / (nextRank.threshold - smithRank.threshold) * 100) + "%" }} /></div><SectionLabel style={{ marginTop: 3 }}>NEXT: {nextRank.name.toUpperCase()}</SectionLabel></div>}
                    {!nextRank && <div style={{ fontSize: 10, color: "#fbbf24", letterSpacing: 1, marginTop: 4 }}>MAX RANK</div>}
                  </div>
                </Tooltip>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ background: "#0a0704", border: "2px solid " + (royalQuest ? (royalQuest.fulfilled ? "#4ade8066" : "#f59e0b55") : "#2a1f0a"), borderRadius: 8, padding: "12px 16px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140, maxHeight: 140, overflow: "hidden" }}>
                  {royalQuest ? (royalQuest.fulfilled ? (<>
                    <Row style={{ marginBottom: 4 }}><div style={{ fontSize: 13, color: "#4ade80", letterSpacing: 1, fontWeight: "bold" }}>DECREE FULFILLED</div><div style={{ textAlign: "right" }}><SectionLabel>DUE</SectionLabel><div style={{ fontSize: 18, color: "#4ade80", fontWeight: "bold", lineHeight: 1 }}>DAY {royalQuest.deadline}</div></div></Row>
                    <div style={{ fontSize: 13, color: "#4ade80", fontWeight: "bold", marginBottom: 4 }}>{royalQuest.weaponName} DELIVERED</div>
                    <div style={{ fontSize: 10, color: "#8a7a64" }}>Awaiting reward from <span style={{ color: "#c8b89a", fontWeight: "bold" }}>{royalQuest.name}</span> — +{royalQuest.reward}g +{royalQuest.reputationGain} rep on sleep</div>
                  </>) : (<>
                    <Row style={{ marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ fontSize: 13, color: "#f59e0b", letterSpacing: 1, fontWeight: "bold" }}>ROYAL DECREE #{questNum + 1}</div>{royalQuest.deadline === day + 1 && <span className="blink-slow" style={{ fontSize: 10, color: "#ef4444", fontWeight: "bold", letterSpacing: 1 }}>DUE TOMORROW</span>}</div>
                      <div style={{ textAlign: "right" }}><SectionLabel>DUE</SectionLabel><div style={{ fontSize: 18, color: "#f59e0b", fontWeight: "bold", lineHeight: 1 }}>DAY {royalQuest.deadline}</div></div>
                    </Row>
                    <div style={{ fontSize: 11, color: "#8a7a64", marginBottom: 6 }}>From: <span style={{ color: "#c8b89a", fontWeight: "bold" }}>{royalQuest.name}</span></div>
                    <div style={{ fontSize: 14, color: "#f0e6c8", marginBottom: 8, fontWeight: "bold" }}><span style={{ color: getQualityTier(royalQuest.minQuality).weaponColor }}>{royalQuest.minQualityLabel}+</span>{" "}<span style={{ color: (MATS[royalQuest.materialRequired] && MATS[royalQuest.materialRequired].color) || "#a0a0a0" }}>{royalQuest.materialRequired.toUpperCase()}</span>{" "}{royalQuest.qty > 1 && <span style={{ color: "#f59e0b" }}>x{royalQuest.qty} </span>}{royalQuest.weaponName}{!unlockedBP.includes(royalQuest.weaponKey) && <span style={{ fontSize: 10, color: "#fb923c", marginLeft: 8 }}>NO BLUEPRINT</span>}{royalQuest.qty > 1 && <span style={{ fontSize: 11, color: "#4ade80", marginLeft: 8 }}>({royalQuest.fulfilledQty || 0}/{royalQuest.qty} delivered)</span>}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1, background: "#0a1a0a", border: "1px solid #4ade8033", borderRadius: 6, padding: "5px 8px" }}><div style={{ fontSize: 12, color: "#4ade80", fontWeight: "bold" }}>+{royalQuest.reward}g · +{royalQuest.reputationGain} rep</div></div>
                      <div style={{ flex: 1, background: "#1a0a0a", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 8px" }}><div style={{ fontSize: 12, color: "#ef4444", fontWeight: "bold" }}>-{royalQuest.reputationLoss} rep on fail</div></div>
                    </div>
                  </>)) : (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><SectionLabel>AWAITING ROYAL DECREE</SectionLabel></div>)}
                </div>
              </div>
            </div>
          </GameHeader>

          {/* LEFT SIDEBAR */}
          <GameLeft>
            <Tooltip title="LEVEL" text="Earn XP by forging and selling. Each level up grants a stat point." below={true}>
              <Panel style={{ cursor: "default" }}><SectionLabel style={{ marginBottom: 1 }}>LEVEL</SectionLabel><div style={{ fontSize: 22, color: "#f59e0b", fontWeight: "bold", lineHeight: 1 }}>{level}</div><div style={{ fontSize: 8, color: "#8a7a64", marginTop: 4, marginBottom: 2 }}>XP {xp}/{xpNeeded}</div><Bar value={xp} max={xpNeeded} color="#c084fc" h={6} /></Panel>
            </Tooltip>
            <RepPanel reputation={reputation} />
            <StatPanel stats={stats} points={statPoints} onAllocate={allocateStat} sfx={sfx} locked={input.statAlloc.disabled} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}><ForgeInfoPanel upgrades={upgrades} /></div>
          </GameLeft>

          {/* CENTER */}
          <GameCenter>
            {toasts.map(function(t) { return <Toast key={t.id} msg={t.msg} icon={t.icon} color={t.color} duration={t.duration} locked={t.locked} onDone={function() { removeToast(t.id); }} />; })}
            {activeToast && <Toast key={activeToast.id} msg={activeToast.msg} icon={activeToast.icon} color={activeToast.color} duration={activeToast.duration} locked={activeToast.locked} onDone={onActiveToastDone} />}

            {/* EVENT BAR */}
            <div style={{ background: "#0a0704", border: "2px solid " + (mEvent && mEvent.id !== "slow" ? "#f59e0b55" : "#2a1f0a"), borderRadius: 8, padding: "10px 12px", display: "flex", gap: 12, alignItems: "flex-start", minHeight: 60, maxHeight: 60, overflow: "hidden" }}>
              {mEvent && mEvent.id !== "slow" ? (<><span style={{ fontSize: 26, flexShrink: 0, lineHeight: 1 }}>{mEvent.icon}</span><div style={{ flex: 1 }}><Row style={{ marginBottom: 4 }}><div style={{ fontSize: 12, color: "#f59e0b", letterSpacing: 2, fontWeight: "bold" }}>{mEvent.title.toUpperCase()}</div><div style={{ fontSize: 8, color: TAG_COLORS[mEvent.tag] || "#f59e0b", background: "#0a0704", border: "1px solid " + (TAG_COLORS[mEvent.tag] || "#f59e0b") + "44", borderRadius: 4, padding: "1px 6px", letterSpacing: 2 }}>{mEvent.tag}</div></Row><div style={{ fontSize: 11, color: "#c8b89a", lineHeight: 1.6 }}>{mEvent.desc}</div></div></>) : (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}><SectionLabel>QUIET DAY</SectionLabel></div>)}
            </div>

            {/* TIME & STAMINA */}
            <Panel style={{ padding: "10px 16px" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ flex: 1 }}><Row center={true} style={{ gap: 8, marginBottom: 4 }}><SectionLabel>TIME</SectionLabel><div style={{ fontSize: 18, color: timeColor, fontWeight: "bold", lineHeight: 1 }}>{formatTime(hour)}</div></Row><div className={timeBarClass}><Bar value={timeBarPct} max={100} color={timeColor} h={10} instant={hour >= 24} /></div></div>
                <div style={{ width: 1, alignSelf: "stretch", background: "#2a1f0a" }} />
                <div style={{ flex: 1 }}><Row center={true} style={{ gap: 8, marginBottom: 4 }}><SectionLabel>STAMINA</SectionLabel><div style={{ fontSize: 18, color: "#f59e0b", fontWeight: "bold", lineHeight: 1 }}>{stamina}<span style={{ fontSize: 11, color: "#5a4a38" }}>/{maxStam}</span></div></Row><Bar value={stamina} max={maxStam} color={isExhausted ? "#ef4444" : "#f59e0b"} h={10} /></div>
              </div>
            </Panel>

            {/* CUSTOMER */}
            {activeCustomer && <CustomerPanel customer={activeCustomer} weapon={activeCustomer.weapon} onSell={function(price) { handleSell(price, activeCustomer.weapon.id); }} onRefuse={handleRefuse} silverTongue={stats.silverTongue} priceBonus={priceBonus} priceDebuff={priceDebuff} sfx={sfx} />}

            {/* FORGE AREA */}
            {!activeCustomer && (
                <div onClick={onForgeClick} style={{ background: "#0f0b06", border: "1px solid #3d2e0f", borderRadius: 10, padding: "12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", cursor: isQTEActive ? "pointer" : "default", flex: 1, minHeight: 280, overflow: "hidden" }}>
                  {/* SCENE */}
                  {(function() { var ss = resolveSceneState({ phase: phase, scene: activeScene, overrideAction: sceneActionOverride, propOverrides: propOverrides }); return <SceneStage scene={ss.scene} phase={ss.phase} characterAction={ss.characterAction} onCharacterActionComplete={function(nextAction) { setSceneActionOverride(nextAction); }} propOverrides={ss.propOverrides} fxRef={fxRef} />; })()}

                  {/* UI LAYER */}
                  <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4, width: "100%", flex: 1 }}>
                    {forgeBubble && (<div onClick={function(e) { e.stopPropagation(); setForgeBubble(null); }} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", zIndex: 60, background: "#0c0905", border: "3px solid " + forgeBubble.color, borderRadius: 14, padding: "20px 22px", width: 180, boxShadow: "0 8px 28px rgba(0,0,0,0.97)", cursor: "pointer" }}><div style={{ fontSize: 13, color: forgeBubble.color, letterSpacing: 2, fontWeight: "bold", marginBottom: 10 }}>{forgeBubble.title}</div>{forgeBubble.lines.map(function(l, i) { return <div key={i} style={{ fontSize: 14, color: l.color || "#c8b89a", lineHeight: 1.8, fontWeight: l.bold ? "bold" : "normal" }}>{l.text}</div>; })}<div style={{ fontSize: 8, color: "#4a3c2c", marginTop: 8, letterSpacing: 1 }}>CLICK TO DISMISS</div></div>)}

                    {/* FORGE STATS OVERLAY */}
                    {(phase !== PHASES.IDLE && phase !== PHASES.SELECT && phase !== PHASES.SELECT_MAT && qualScore > 0) && (
                        <Panel style={{ position: "absolute", top: 10, left: 10, width: 160 }}>
                          {[["MATERIAL", matData.name, matData.color, 14], ["WEAPON", weapon.name, "#f0e6c8", 14], ["EFF. DIFF", effDiff + (matDiffMod > 0 ? " (+" + matDiffMod + ")" : ""), "#c8b89a", 22], ["QTE SPEED", speedLabel, speedColor, 14], ["STRIKE POWER", strikeLabel, strikeColor, 14]].map(function(r) { return <div key={r[0]} style={{ marginBottom: 8 }}><SectionLabel>{r[0]}</SectionLabel><div style={{ fontSize: r[3], color: r[2], fontWeight: "bold", letterSpacing: 1 }}>{r[1]}</div></div>; })}
                        </Panel>
                    )}

                    {showBars && (<div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 5 }}>
                      <Row><SectionLabel>QUALITY</SectionLabel><span style={{ fontSize: 12, color: getQualityTier(qualScore).weaponColor, fontWeight: "bold" }}>{getQualityTier(qualScore).label} ({qualScore})</span></Row>
                      <Bar value={qualScore} max={100} color={getQualityTier(qualScore).weaponColor} h={12} />
                      <Row style={{ marginTop: 4 }}><SectionLabel>STRESS</SectionLabel><div style={{ display: "flex", gap: 5, alignItems: "center" }}><Pips count={STRESS_MAX} filled={stress} filledColor={stressColor} size={18} /><span style={{ color: stressColor, fontWeight: "bold", marginLeft: 4, fontSize: 12 }}>{stressLabel2}</span></div></Row>
                    </div>)}

                    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                      {/* IDLE STATE */}
                      {phase === PHASES.IDLE && (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 400 }}>
                        {wipWeapon ? (
                            <div style={{ width: "100%", background: "#0a0704", border: "2px solid #60a5fa", borderRadius: 12, padding: "18px 20px" }}>
                              <div style={{ fontSize: 12, color: "#60a5fa", letterSpacing: 2, fontWeight: "bold", marginBottom: 12 }}>WORK IN PROGRESS</div>
                              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                                {[["WEAPON", WEAPONS[wipWeapon.wKey].name, "#f0e6c8"], ["MATERIAL", (MATS[wipWeapon.matKey] && MATS[wipWeapon.matKey].name) || "Bronze", (MATS[wipWeapon.matKey] && MATS[wipWeapon.matKey].color) || "#a0a0a0"], ["QUALITY", "" + wipWeapon.qualScore, getQualityTier(wipWeapon.qualScore).color], ["STRESS", wipWeapon.stress + "/" + STRESS_MAX, wipWeapon.stress >= STRESS_MAX ? "#ef4444" : wipWeapon.stress >= STRESS_MAX - 1 ? "#fb923c" : "#4ade80"]].map(function(r) { return <div key={r[0]} style={{ flex: 1 }}><SectionLabel style={{ marginBottom: 3 }}>{r[0]}</SectionLabel><div style={{ fontSize: 13, color: r[2], fontWeight: "bold" }}>{r[1]}</div></div>; })}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={function(e) { e.stopPropagation(); resumeWip(); }} disabled={input.resumeWip.disabled} style={{ flex: 2, background: "#0a1a2a", border: "2px solid #60a5fa", borderRadius: 8, color: "#60a5fa", padding: "10px 0", fontSize: 13, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Resume</button>
                                <button onClick={function(e) { e.stopPropagation(); scrapWip(); }} style={{ flex: 1, background: "#141009", border: "2px solid #3d2e0f", borderRadius: 8, color: "#8a7a64", padding: "10px 0", fontSize: 13, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Scrap</button>
                              </div>
                              {stamina <= 0 && <div style={{ fontSize: 10, color: "#fb923c", letterSpacing: 1, textAlign: "center", marginTop: 6 }}>EXHAUSTED — REST BEFORE RESUMING</div>}
                            </div>
                        ) : (
                            <><div style={{ fontSize: 16, letterSpacing: 3, color: "#f59e0b", fontWeight: "bold" }}>FORGE READY</div><SectionLabel>{isExhausted ? "EXHAUSTED — 4HR/SESSION" : "2HR/SESSION"}</SectionLabel>
                              <button onClick={input.beginForge.redirectToRest ? waitHour : input.beginForge.disabled ? null : function(e) { e.stopPropagation(); sfx.click(); setPhase(PHASES.SELECT); }} disabled={input.beginForge.disabled} style={{ background: "#2a1f0a", border: "2px solid #f59e0b", borderRadius: 8, color: "#f59e0b", padding: "14px 40px", fontSize: 18, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", position: "relative" }}><span style={{ opacity: input.beginForge.redirectToRest ? 0.65 : 1 }}>Begin Forging</span>{input.beginForge.redirectToRest && <span className="blink-slow" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, pointerEvents: "none", zIndex: 2 }}>{"\u23F3"}</span>}</button></>
                        )}
                      </div>)}

                      {/* WEAPON SELECT */}
                      {phase === PHASES.SELECT && (<div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", width: "80%" }}>
                        <Panel style={{ width: 155, flexShrink: 0, border: "2px solid #f59e0b66", display: "flex", flexDirection: "column" }}>
                          <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: "bold", letterSpacing: 1, marginBottom: 8 }}>{WEAPONS[wKey].name.toUpperCase()}</div>
                          {[["MAT COST", WEAPONS[wKey].materialCost + " units", "#c8b89a"], ["BASE SELL", "~" + referenceValue(wKey) + "g", "#f59e0b"]].map(function(r) { return <InfoRow key={r[0]} label={r[0]} value={r[1]} color={r[2]} />; })}
                          <div style={{ marginTop: 6, borderTop: "1px solid #2a1f0a", paddingTop: 6, textAlign: "center" }}><SectionLabel style={{ marginBottom: 3, textAlign: "center" }}>DIFFICULTY</SectionLabel><div style={{ fontSize: 26, color: WEAPONS[wKey].difficulty <= 3 ? "#4ade80" : WEAPONS[wKey].difficulty <= 6 ? "#fbbf24" : WEAPONS[wKey].difficulty <= 8 ? "#fb923c" : "#ef4444", fontWeight: "bold", lineHeight: 1, textAlign: "center" }}>{WEAPONS[wKey].difficulty}</div></div>
                        </Panel>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, letterSpacing: 3, color: "#f59e0b", fontWeight: "bold" }}>CHOOSE WEAPON</div>
                          <div style={{ width: "100%", maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                            {Object.keys(WEAPONS).filter(function(k) { return unlockedBP.includes(k); }).map(function(k) { var w = WEAPONS[k], isQ = !!(royalQuest && !royalQuest.fulfilled && royalQuest.weaponKey === k), isSel = wKey === k; return (<div key={k} ref={isSel ? function(el) { if (el) el.scrollIntoView({ block: "nearest" }); } : null} onClick={function(e) { e.stopPropagation(); sfx.click(); setWKey(k); }} style={{ border: "2px solid " + (isSel ? "#f59e0b" : "#3d2e0f"), borderRadius: 6, padding: "8px 10px", cursor: "pointer", background: isSel ? "#2a1f0a" : "#0a0704", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ fontSize: 13, color: isSel ? "#f59e0b" : "#f0e6c8", letterSpacing: 1 }}>{w.name.toUpperCase()}</div>{isQ && <span style={{ fontSize: 11, background: "#f59e0b", color: "#0a0704", borderRadius: 4, padding: "1px 6px", fontWeight: "bold" }}>QUEST</span>}</div></div>); })}
                          </div>
                          <div style={{ display: "flex", gap: 5 }}><ActionBtn onClick={function() { sfx.click(); setPhase(PHASES.SELECT_MAT); }} disabled={stamina <= 0} small={true}>Next</ActionBtn><ActionBtn onClick={function() { sfx.click(); setPhase(PHASES.IDLE); }} color="#8a7a64" bg="#141009" small={true}>Cancel</ActionBtn></div>
                        </div>
                      </div>)}

                      {/* MATERIAL SELECT */}
                      {phase === PHASES.SELECT_MAT && (<div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", width: "80%" }}>
                        <Panel style={{ width: 155, flexShrink: 0, border: "2px solid " + MATS[matKey].color + "66" }}>
                          <div style={{ fontSize: 12, color: MATS[matKey].color, fontWeight: "bold", letterSpacing: 1, marginBottom: 8 }}>{MATS[matKey].name.toUpperCase()}</div>
                          {[["IN STOCK", (inv[matKey] || 0) + " units"], ["VALUE MULT", "x" + MATS[matKey].valueMultiplier]].map(function(r) { var vc = r[0] === "IN STOCK" ? ((inv[matKey] || 0) >= weapon.materialCost ? "#4ade80" : "#ef4444") : "#c8b89a"; return <InfoRow key={r[0]} label={r[0]} value={r[1]} color={vc} />; })}
                          <div style={{ marginTop: 6, borderTop: "1px solid #2a1f0a", paddingTop: 6, textAlign: "center" }}><SectionLabel style={{ marginBottom: 3, display: "flex", justifyContent: "center" }}>DIFF MOD</SectionLabel><div style={{ fontSize: 26, color: MATS[matKey].difficultyModifier < 0 ? "#4ade80" : MATS[matKey].difficultyModifier === 0 ? "#c8b89a" : MATS[matKey].difficultyModifier <= 3 ? "#fbbf24" : MATS[matKey].difficultyModifier <= 5 ? "#fb923c" : "#ef4444", fontWeight: "bold", lineHeight: 1, textAlign: "center" }}>{MATS[matKey].difficultyModifier > 0 ? "+" : ""}{MATS[matKey].difficultyModifier}</div></div>
                        </Panel>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, letterSpacing: 3, color: "#f59e0b", fontWeight: "bold" }}>CHOOSE MATERIAL</div>
                          <SectionLabel>{weapon.name} needs {weapon.materialCost} units</SectionLabel>
                          <div style={{ width: "100%", maxHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                            {Object.entries(MATS).map(function(e) { var k = e[0], m = e[1], have = (inv[k] || 0), enough = have >= weapon.materialCost; var isQ = !!(royalQuest && !royalQuest.fulfilled && royalQuest.materialRequired === k); var isSel = matKey === k, needed = Math.max(0, weapon.materialCost - have), buyPrice = MATS[k].price * needed, canBuy = needed > 0 && gold >= buyPrice; var canSelect = enough || canBuy; return (<div key={k} onClick={canSelect ? function(e) { e.stopPropagation(); sfx.click(); setMatKey(k); } : null} style={{ border: "2px solid " + (isSel ? "#f59e0b" : canSelect ? "#3d2e0f" : "#2a1f0a"), borderRadius: 6, padding: "8px 10px", cursor: canSelect ? "pointer" : "not-allowed", background: isSel ? "#2a1f0a" : "#0a0704", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ fontSize: 13, color: isSel ? m.color : canSelect ? m.color : "#3d2e0f", letterSpacing: 1, fontWeight: "bold" }}>{m.name.toUpperCase()}</div>{isQ && <span style={{ fontSize: 11, background: "#f59e0b", color: "#0a0704", borderRadius: 4, padding: "1px 6px", fontWeight: "bold" }}>QUEST</span>}</div>{needed > 0 && <span className={!canBuy ? "blink-slow" : ""} style={{ fontSize: 10, color: canBuy ? (isSel ? "#fbbf24" : "#f59e0b") : "#ef4444", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", whiteSpace: "nowrap" }}>{canBuy ? "COSTS " + buyPrice + "g" : "CAN'T AFFORD"}</span>}</div>); })}
                          </div>
                          <div style={{ display: "flex", gap: 5 }}><ActionBtn onClick={function() { sfx.click(); confirmSelect(); }} disabled={input.confirmSelect.disabled} small={true}>Confirm</ActionBtn><ActionBtn onClick={function() { sfx.click(); setPhase(PHASES.SELECT); }} color="#8a7a64" bg="#141009" small={true}>Back</ActionBtn></div>
                        </div>
                      </div>)}

                      {/* QTE */}
                      <QTEPanel phase={phase} heatWinLo={heatWinLo} heatWinHi={heatWinHi} flash={qteFlash} strikesLeft={strikesLeft} strikesTotal={BALANCE.baseStrikes + bonusStrikes} heatSpeedMult={heatSpeedMult} hammerSpeedMult={hammerSpeedMult} quenchSpeedMult={quenchSpeedMult} posRef={qtePosRef} processingRef={qteProcessing} onAutoFire={handleAutoFire} />

                      {/* SESSION RESULT */}
                      {phase === PHASES.SESS_RESULT && sessResult && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, width: "80%", marginTop: 4 }}>
                              {(function() { var s = sessResult.ns; var dis = input.forge.disabled; var needRest = input.forge.redirectToRest; var borderCol = dis ? "#2a1f0a" : s >= STRESS_MAX ? "#ef4444" : s >= STRESS_MAX - 1 ? "#fb923c" : "#f59e0b"; var textCol = dis ? "#4a3c2c" : s >= STRESS_MAX ? "#ef4444" : s >= STRESS_MAX - 1 ? "#fb923c" : "#f59e0b"; var bg = dis ? "#0a0704" : s >= STRESS_MAX ? "#1a0505" : s >= STRESS_MAX - 1 ? "#1a0e05" : "#2a1f0a"; return <button onClick={dis ? null : needRest ? waitHour : function(e) { e.stopPropagation(); sfx.click(); attemptForge(); }} disabled={dis} style={{ background: bg, border: "2px solid " + borderCol, borderRadius: 8, color: textCol, padding: "8px", fontSize: 11, cursor: dis ? "not-allowed" : "pointer", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", position: "relative" }}><span style={{ opacity: needRest ? 0.65 : 1 }}>FORGE</span>{needRest && <span className="blink-slow" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, pointerEvents: "none", zIndex: 2 }}>{"\u23F3"}</span>}{!needRest && s >= STRESS_MAX - 1 && <span className="blink-fast" style={{ fontSize: 10, color: s >= STRESS_MAX ? "#ef4444" : "#fb923c", position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }}>{s >= STRESS_MAX ? Math.round(BALANCE.shatterChanceMax * 100) + "%" : Math.round(BALANCE.shatterChanceHigh * 100) + "%"} BREAK</span>}</button>; })()}
                              <button disabled={input.normalize.disabled} onClick={function(e) { e.stopPropagation(); sfx.click(); doNormalize(); }} style={{ background: input.normalize.disabled ? "#0a0704" : "#0a1a2a", border: "2px solid " + (input.normalize.disabled ? "#2a1f0a" : "#60a5fa"), borderRadius: 8, color: input.normalize.disabled ? "#4a3c2c" : "#60a5fa", padding: "8px 4px", fontSize: 11, cursor: input.normalize.disabled ? "not-allowed" : "pointer", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Normalize</button>
                              <button onClick={input.quench.redirectToRest ? waitHour : input.quench.disabled ? null : function(e) { e.stopPropagation(); sfx.click(); setPhase(PHASES.QUENCH); }} disabled={input.quench.disabled} style={{ background: input.quench.disabled ? "#0a0704" : "#2a1f0a", border: "2px solid " + (input.quench.disabled ? "#2a1f0a" : "#f59e0b"), borderRadius: 8, color: input.quench.disabled ? "#4a3c2c" : "#f59e0b", padding: "8px 4px", fontSize: 11, cursor: input.quench.disabled ? "not-allowed" : "pointer", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", position: "relative" }}>
                                <span style={{ opacity: input.quench.redirectToRest ? 0.65 : 1 }}>Quench</span>
                                {input.quench.redirectToRest && <span className="blink-slow" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, pointerEvents: "none", zIndex: 2 }}>{"\u23F3"}</span>}
                              </button>
                              <button onClick={function(e) { e.stopPropagation(); sfx.click(); scrapWeapon(); }} style={{ background: "#141009", border: "2px solid #3d2e0f", borderRadius: 8, color: "#8a7a64", padding: "8px 4px", fontSize: 11, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Scrap</button>
                              <button onClick={function(e) { e.stopPropagation(); sfx.click(); takeBreak(); }} style={{ background: "#141009", border: "2px solid #60a5fa", borderRadius: 8, color: "#60a5fa", padding: "8px 4px", fontSize: 11, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold", gridColumn: "span 2" }}>Leave Forging</button>
                            </div>
                          </div>
                      )}
                    </div>
                  </div>
                </div>
            )}
          </GameCenter>

          {/* RIGHT SIDEBAR */}
          <GameRight>
            <Panel style={{ border: "1px solid #2a1f0a", display: "flex", flexDirection: "column", height: "100%" }}>
              <SectionLabel style={{ marginBottom: 8 }}>FOR SALE</SectionLabel>
              <div style={{ overflowY: "auto", flex: 1, maxHeight: 300 }}>
                {finished.length === 0 && <SectionLabel color="#4a3c2c" style={{ lineHeight: 1.6 }}>Nothing on the shelf.</SectionLabel>}
                {finished.map(function(w) { return (<div key={w.id} style={{ background: "#1a1209", border: "1px solid " + w.color + "44", borderRadius: 6, padding: "7px 9px", marginBottom: 6 }}><div style={{ fontSize: 11, color: w.color, letterSpacing: 1, fontWeight: "bold" }}>{w.label.toUpperCase()}</div><div style={{ fontSize: 10, color: (MATS[w.matKey] && MATS[w.matKey].color) || "#a0a0a0" }}>{(MATS[w.matKey] && MATS[w.matKey].name) || "Bronze"}</div><div style={{ fontSize: 11, color: "#c8b89a", marginTop: 2 }}>{w.wName}</div><div style={{ fontSize: 13, color: "#f59e0b", fontWeight: "bold", marginTop: 3 }}>~{w.val}g</div></div>); })}
              </div>
            </Panel>
          </GameRight>

          {/* BOTTOM BAR */}
          <GameFooter>
            <div style={{ display: "flex", gap: 5, flexShrink: 0, height: 80 }}>
              {[["\uD83D\uDCA4", "Sleep", function() { sfx.click(); sleep(); }, input.sleep.disabled, input.sleep.redirectToRest], ["\u23F3", "Rest", waitHour, input.rest.disabled, input.rest.redirectToRest], ["\uD83D\uDCE3", "Promote", promote, input.promote.disabled, input.promote.redirectToRest], ["\uD83D\uDDD1", "Scavenge", scavenge, input.scavenge.disabled, input.scavenge.redirectToRest]].map(function(b) {
                var icon = b[0], label = b[1], fn = b[2], dis = b[3], needRest = b[4];
                var finalFn = needRest ? waitHour : fn;
                return (<button key={label} onClick={dis ? null : finalFn} disabled={dis} style={{ background: dis ? "#0a0704" : "#141009", border: "1px solid " + (dis ? "#1a1209" : "#2a1f0a"), borderRadius: 7, color: dis ? "#2a1f0a" : "#8a7a64", cursor: dis ? "not-allowed" : "pointer", fontFamily: "monospace", fontWeight: "bold", fontSize: 11, letterSpacing: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, height: "100%", width: 72, padding: 0, position: "relative" }}>
                  <span style={{ opacity: needRest ? 0.65 : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><span style={{ fontSize: 18 }}>{icon}</span><span>{label.toUpperCase()}</span></span>
                  {needRest && <span className="blink-slow" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, pointerEvents: "none", zIndex: 2 }}>{"\u23F3"}</span>}
                </button>);
              })}
            </div>
            <div style={{ width: 1, alignSelf: "stretch", background: "#2a1f0a", flexShrink: 0, margin: "0 8px" }} />
            <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-start" }}>
              <ActionBtn onClick={function() { sfx.click(); setShowShop(function(s) { return !s; }); }} disabled={input.shop.disabled} style={{ height: 80, padding: "0 18px", fontSize: 14, flexShrink: 0 }}>{"\uD83D\uDED2"} Shop</ActionBtn>
              <button onClick={input.mats.disabled ? null : function() { sfx.click(); setShowMaterials(function(s) { return !s; }); }} disabled={input.mats.disabled} style={{ height: 80, padding: "0 14px", fontSize: 12, flexShrink: 0, background: "#0f0b06", border: "1px solid " + (input.mats.disabled ? "#1a1209" : "#3d2e0f"), borderRadius: 8, color: input.mats.disabled ? "#2a1f0a" : "#5a4a38", cursor: input.mats.disabled ? "not-allowed" : "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>{"\u2697"} Mats</button>
              <Panel style={{ padding: "8px 18px", minWidth: 80, textAlign: "center", position: "relative" }}>
                <SectionLabel style={{ marginBottom: 4 }}>GOLD</SectionLabel>
                <div style={{ fontSize: 28, color: "#f59e0b", fontWeight: "bold", lineHeight: 1 }}>{gold}g</div>
                {goldPops.map(function(p) { return <GoldPop key={p.id} amount={p.amount} onDone={function() { removeGoldPop(p.id); }} />; })}
              </Panel>
            </div>
            <div style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "center", padding: "0 8px" }}>
              {[["SFX", sfxVol, function(e) { var v = parseFloat(e.target.value); setSfxVol(v); sfx.setSfxVol(v); }], ["MUS", musicVol, function(e) { var v = parseFloat(e.target.value); setMusicVol(v); sfx.setMusicVol(v); }]].map(function(r) { return (<label key={r[0]} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#f0e6c8", letterSpacing: 2, fontFamily: "monospace", fontWeight: "bold" }}>{r[0]}<input type="range" min="0" max="1" step="0.05" value={r[1]} onChange={r[2]} style={{ width: 72, accentColor: "#f59e0b", cursor: "pointer" }} /></label>); })}
            </div>
            <button onClick={function() { sfx.click(); setShowOptions(true); }} style={{ background: "#141009", border: "1px solid #2a1f0a", borderRadius: 7, color: "#8a7a64", cursor: "pointer", fontFamily: "monospace", fontWeight: "bold", fontSize: 11, letterSpacing: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, height: 80, padding: "0 14px", flexShrink: 0 }}><span style={{ fontSize: 18 }}>{"\u2699"}</span><span>OPTIONS</span></button>
          </GameFooter>
        </GameShell>
        {showRhythmTest && <RhythmQTE sfx={sfx} onClose={function() { setShowRhythmTest(false); }} />}
        {showOptions && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function(e) { if (e.target === e.currentTarget) setShowOptions(false); }}>
          <Panel style={{ padding: "24px 28px", width: 300, maxHeight: "60vh", overflowY: "auto" }}>
            <Row style={{ marginBottom: 16 }}><div style={{ fontSize: 14, color: "#f59e0b", letterSpacing: 3 }}>OPTIONS</div><button onClick={function() { setShowOptions(false); }} style={{ background: "#2a1f0a", border: "1px solid #3d2e0f", borderRadius: 5, color: "#f59e0b", padding: "4px 10px", cursor: "pointer", fontFamily: "monospace", fontSize: 13 }}>X</button></Row>
            <div style={{ borderTop: "1px solid #2a1f0a", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionLabel>AUDIO</SectionLabel>
              {[["Shop Music", true, function(e) { sfx.idleMuted = !e.target.checked; }], ["Forge Music", true, function(e) { sfx.forgeMuted = !e.target.checked; }]].map(function(r) { return (<label key={r[0]} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 12, color: "#c8b89a", letterSpacing: 1, userSelect: "none" }}>{r[0]}<input type="checkbox" defaultChecked={r[1]} onChange={r[2]} style={{ accentColor: "#f59e0b", width: 15, height: 15, cursor: "pointer" }} /></label>); })}
            </div>
            <div style={{ borderTop: "1px solid #2a1f0a", paddingTop: 14, marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <SectionLabel style={{ marginBottom: 4 }}>DANGER ZONE</SectionLabel>
              <DangerBtn onClick={function() { setShowOptions(false); setShowGiveUp(true); }}>Give Up</DangerBtn>
            </div>
            <div style={{ borderTop: "1px solid #2a1f0a", paddingTop: 14, marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <SectionLabel style={{ marginBottom: 4 }}>DEBUG</SectionLabel>
              <button onClick={function() { if (goodEventUsed || day > 1) return; var mv = EVENTS.find(function(e) { return e.id === "mystery"; }); if (mv) { setPendingMystery({ severity: "good", effect: mv.variants[1].effect }); setGoodEventUsed(true); } setShowOptions(false); }} disabled={goodEventUsed || day > 1} style={{ background: goodEventUsed || day > 1 ? "#0a0704" : "#1a1500", border: "2px solid " + (goodEventUsed || day > 1 ? "#3d2e0f" : "#fbbf24"), borderRadius: 8, color: goodEventUsed || day > 1 ? "#4a3c2c" : "#fbbf24", padding: "10px 16px", fontSize: 13, cursor: goodEventUsed || day > 1 ? "not-allowed" : "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>{goodEventUsed ? "Good Event Used" : day > 1 ? "Day 1 Only" : "Force Good Event"}</button>
              <button onClick={function() { var mv = EVENTS.find(function(e) { return e.id === "mystery"; }); if (mv) setPendingMystery({ severity: "bad", effect: mv.variants[2].effect }); setShowOptions(false); }} style={{ background: "#1a0505", border: "2px solid #ef4444", borderRadius: 8, color: "#ef4444", padding: "10px 16px", fontSize: 13, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Force Dark Event</button>
              <button onClick={function() { earnGold(10000); setShowOptions(false); }} style={{ background: "#0a1a0a", border: "2px solid #4ade80", borderRadius: 8, color: "#4ade80", padding: "10px 16px", fontSize: 13, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Grant 10,000g</button>
              <button onClick={function() { setStamina(function(s) { return Math.max(0, s - 1); }); }} style={{ background: "#1a0a1a", border: "2px solid #818cf8", borderRadius: 8, color: "#818cf8", padding: "10px 16px", fontSize: 13, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Spend 1 Stamina</button>
              <button onClick={function() { setShowRhythmTest(true); setShowOptions(false); }} style={{ background: "#0a1a1a", border: "2px solid #00ffe5", borderRadius: 8, color: "#00ffe5", padding: "10px 16px", fontSize: 13, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>QTE Test</button>
            </div>
          </Panel>
        </div>)}
        <DevBanner />
      </>
  );
}