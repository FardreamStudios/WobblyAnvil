// ============================================================
// App.js — Wobbly Anvil Game Brain
// State management, game logic, render tree.
// All data, utilities, components, and systems imported from modules.
// ============================================================

import { useEffect, useRef, useCallback } from "react";

// --- Module Imports ---
import GameConstants from "./modules/constants.js";
import GameUtils from "./modules/utilities.js";
import MysteryLogic from "./logic/mysteryLogic.js";
import AudioSystem from "./modules/audio.js";
import UIComponents from "./modules/uiComponents.js";
import ForgeComponents from "./modules/forgeComponents.js";
import GamePanels from "./modules/gamePanels.js";
import Screens from "./modules/screens.js";
import RhythmQTEModule from "./modules/rhythmQTE.js";
import GameLayout from "./modules/gameLayout.js";
import SceneSystem from "./modules/sceneSystem.js";
import MobileLayoutModule from "./modules/mobileLayout.js";
import DesktopLayoutModule from "./modules/desktopLayout.js";
import DevBanner from "./components/DevBanner.js";
import GameplayEventBus from "./logic/gameplayEventBus.js";
import EVENT_TAGS from "./config/eventTags.js";
import AbilityManager from "./abilities/abilityManager.js";

// --- State Hooks ---
import useUIState from "./hooks/useUIState.js";
import useGameMode from "./hooks/useGameMode.js";
import useEconomyState from "./hooks/useEconomyState.js";
import useDayState from "./hooks/useDayState.js";
import usePlayerState from "./hooks/usePlayerState.js";
import useForgeState from "./hooks/useForgeState.js";
import useForgeVM from "./hooks/useForgeVM.js";
import usePlayerVM from "./hooks/usePlayerVM.js";
import useEconomyVM from "./hooks/useEconomyVM.js";
import useDayVM from "./hooks/useDayVM.js";
import useQuestState from "./hooks/useQuestState.js";
import useVFXState from "./hooks/useVFXState.js";
import useFXCues from "./hooks/useFXCues.js";
import useInputRouter from "./hooks/useInputRouter.js";
import useShopVM from "./hooks/useShopVM.js";
import useAmbientAudio from "./hooks/useAmbientAudio.js";

// --- Destructure Constants ---
var PHASES = GameConstants.PHASES;
var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
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
var BALANCE = GameConstants.BALANCE;

// --- Destructure Utilities ---
var getQualityTier = GameUtils.getQualityTier;
var referenceValue = GameUtils.referenceValue;
var getSmithRank = GameUtils.getSmithRank;
var getNextRank = GameUtils.getNextRank;
var formatTime = GameUtils.formatTime;

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
  var vfx = useVFXState();

  // --- GameMode Hook (owns init, sub-mode registration, lifecycle) ---
  var gm = useGameMode({ bus: GameplayEventBus });

  // --- FX Cue Router ---
  useFXCues({ sfx: sfx, fxRef: vfx.fxRef });

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
  var setHasSoldWeapon = quest.setHasSoldWeapon;

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

  // --- Mystery Event Tracking (from useQuestState) ---
  var pendingMystery = quest.pendingMystery, setPendingMystery = quest.setPendingMystery;
  var goodEventUsed = quest.goodEventUsed, setGoodEventUsed = quest.setGoodEventUsed;

  // --- VFX State (from useVFXState) ---
  var mysteryPending = vfx.mysteryPending, setMysteryPending = vfx.setMysteryPending;
  var mysteryShake = vfx.mysteryShake, setMysteryShake = vfx.setMysteryShake;
  var weaponShake = vfx.weaponShake, setWeaponShake = vfx.setWeaponShake;
  var mysteryVignette = vfx.mysteryVignette, setMysteryVignette = vfx.setMysteryVignette;
  var mysteryVignetteOpacity = vfx.mysteryVignetteOpacity, setMysteryVignetteOpacity = vfx.setMysteryVignetteOpacity;

  // --- Scene State (from useVFXState) ---
  var activeScene = vfx.activeScene, setActiveScene = vfx.setActiveScene;
  var sceneActionOverride = vfx.sceneActionOverride, setSceneActionOverride = vfx.setSceneActionOverride;
  var propOverrides = vfx.propOverrides, setPropOverrides = vfx.setPropOverrides;
  var fxRef = vfx.fxRef;

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

  // --- Customer System ---
  var trySpawnCustomer = useCallback(function(newHour, nf) {
    var items = nf || finishedRef.current;
    if (!items.length || custVisRef.current >= maxCustRef.current) return;
    if (newHour < 9 || newHour > 21) return;
    if (phaseRef.current !== PHASES.IDLE && phaseRef.current !== PHASES.SESS_RESULT) return;
    var resolvedChance = AbilityManager.resolveValue("customerChance", 0.42);
    if (!guaranteedCustomersRef.current && Math.random() > resolvedChance) return;    var shuffled = CUST_TYPES.slice().sort(function() { return Math.random() - 0.5; });
    shuffled.some(function(ct) {
      var match = items.find(function(w) { return getQualityTier(w.score).scoreMin >= ct.minQuality || ct.minQuality === 0; });
      if (match) { setActiveCustomer({ type: ct, weapon: match }); setCustVisitsToday(function(v) { return v + 1; }); GameplayEventBus.emit(EVENT_TAGS.FX_DOORBELL, {}); return true; }
      return false;
    });
  }, [sfx]);


  // --- Time & Actions ---
  function advanceTime(hrs, nf, useStam) {
    setHour(function(h) { var next = h + hrs; setTimeout(function() { trySpawnCustomer(next, nf); }, 200); return next; });
    if (useStam) { setStamina(function(s) { return Math.max(0, s - 1); }); gainXp(6); }
  }

  // --- Player ViewModel ---
  var playerVM = usePlayerVM({
    player: player, sfx: sfx,
    setStamina: setStamina, setGameOver: setGameOver,
    gameOver: gameOver
  });
  var gainXp = playerVM.gainXp, changeRep = playerVM.changeRep, allocateStat = playerVM.allocateStat;
  var xpNeeded = playerVM.xpNeeded;

  // --- Economy ViewModel ---
  var economyVM = useEconomyVM({
    economy: economy, quest: quest, sfx: sfx,
    addToast: addToast, trySpawnCustomer: trySpawnCustomer, hour: hour
  });
  var earnGold = economyVM.earnGold, spendGold = economyVM.spendGold, popGold = economyVM.popGold, removeGoldPop = economyVM.removeGoldPop, handleSell = economyVM.handleSell, handleRefuse = economyVM.handleRefuse;

  // --- Shop ViewModel ---
  var shopVM = useShopVM({
    economy: economy, player: player, sfx: sfx,
    earnGold: earnGold, spendGold: spendGold
  });
  var onBuy = shopVM.onBuy, onUpgrade = shopVM.onUpgrade, onBuyBP = shopVM.onBuyBP, onSellMaterial = shopVM.onSellMaterial;

  // --- Forge ViewModel ---
  var forgeVM = useForgeVM({
    forge: forge, sfx: sfx, addToast: addToast, advanceTime: advanceTime,
    spendGold: spendGold, gainXp: gainXp,
    trySpawnCustomer: trySpawnCustomer, setInv: setInv, setFinished: setFinished,
    setRoyalQuest: setRoyalQuest, setWeaponShake: setWeaponShake,
    gold: gold, inv: inv, finished: finished, hour: hour, stamina: stamina,
    forcedExhaustion: forcedExhaustion, stats: stats, upgrades: upgrades,
    pendingMystery: pendingMystery, royalQuestRef: royalQuestRef
  });
  var takeBreak = forgeVM.takeBreak, resumeWip = forgeVM.resumeWip, scrapWip = forgeVM.scrapWip, scrapWeapon = forgeVM.scrapWeapon, confirmSelect = forgeVM.confirmSelect, onForgeClick = forgeVM.onForgeClick, handleAutoFire = forgeVM.handleAutoFire, attemptForge = forgeVM.attemptForge, doNormalize = forgeVM.doNormalize;
  var weapon = forgeVM.weapon, matData = forgeVM.matData, matDiffMod = forgeVM.matDiffMod, effDiff = forgeVM.effDiff, isExhausted = forgeVM.isExhausted, sessCost = forgeVM.sessCost, maxStam = forgeVM.maxStam;
  var heatWinLo = forgeVM.heatWinLo, heatWinHi = forgeVM.heatWinHi, heatSpeedMult = forgeVM.heatSpeedMult, hammerSpeedMult = forgeVM.hammerSpeedMult, quenchSpeedMult = forgeVM.quenchSpeedMult;
  var speedLabel = forgeVM.speedLabel, speedColor = forgeVM.speedColor;
  var strikeLabel = forgeVM.strikeLabel, strikeColor = forgeVM.strikeColor, stressColor = forgeVM.stressColor, stressLabel2 = forgeVM.stressLabel2;
  var showBars = forgeVM.showBars, isQTEActive = forgeVM.isQTEActive, isForging = forgeVM.isForging, diffColor = forgeVM.diffColor;
  var qtePosRef = forgeVM.qtePosRef, qteProcessing = forgeVM.qteProcessing;

  // --- Ambient Audio Layer ---
  var ambient = useAmbientAudio({ isForging: isForging, muted: false });

  // --- Input Router ---
  var input = useInputRouter({
    hour: hour, stamina: stamina, stress: stress, sessCost: sessCost,
    isQTEActive: isQTEActive, isForging: isForging,
    activeCustomer: activeCustomer, toastQueue: toastQueue, activeToast: activeToast,
    mysteryPending: mysteryPending, finished: finished, promoteUses: promoteUses,
    gold: gold, inv: inv, matKey: matKey, weapon: weapon, buyPrice: MATS[matKey] ? MATS[matKey].price * Math.max(0, (weapon ? weapon.materialCost : 0) - (inv[matKey] || 0)) : 0
  });
  var dayVM = useDayVM({
    dayState: dayState, economy: economy, quest: quest, gm: gm,
    sfx: sfx, addToast: addToast, setToastQueue: setToastQueue, setActiveToast: setActiveToast,
    trySpawnCustomer: trySpawnCustomer, earnGold: earnGold, changeRep: changeRep,
    forgeOnSleep: forgeVM.onSleep,
    maxStam: maxStam, advanceTime: advanceTime, unlockedBP: unlockedBP, setUnlockedBP: setUnlockedBP, reputation: reputation,
    level: level
  });
  var waitHour = dayVM.waitHour, buildDayQueue = dayVM.buildDayQueue, sleep = dayVM.sleep;
  var scavenge = dayVM.scavenge, promote = dayVM.promote;


  // --- Game Init ---
  useEffect(function() {
    if (screen !== "game" || gameStarted.current) return;
    gameStarted.current = true;
    var state = { gold: STARTING_GOLD, inv: { bronze: 10, iron: 4, steel: 0, damascus: 0, titanium: 0, iridium: 0, tungsten: 0, mithril: 0, orichalcum: 0 }, finished: [], hasSoldWeapon: false, lastSleepHour: 0, stamina: BASE_STAMINA, unlockedBP: ["dagger", "shortsword", "axe"], reputation: 4 };
    setActiveToast(null); sfx.setMode("idle");
    gm.startDay(1);
    setTimeout(function() { setToastQueue(buildDayQueue(1, state, 0)); }, 300);
  }, [screen]);
  useEffect(function() { return function() { sfx.setMode("off"); }; }, []);

  // --- Reset ---
  function resetGame() {
    sfx.setMode("off"); gameStarted.current = false; forgeVM.resetForgeState(); gm.newGame();
    setScreen("splash");
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
  if (screen === "splash") return <ScaleWrapper><SplashScreen onEnter={function() { sfx.warmup(); ambient.startAmbient(); setTimeout(function() { GameplayEventBus.emit(EVENT_TAGS.FX_FANFARE, {}); }, 80); setScreen("menu"); }} /></ScaleWrapper>;
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
          {showShop && <ShopModal gold={gold} inv={inv} upgrades={upgrades} unlockedBP={unlockedBP} matDiscount={matDiscount} globalMatMult={globalMatMult} royalQuest={royalQuest} sfx={sfx} onClose={function() { setShowShop(false); }} onBuy={onBuy} onUpgrade={onUpgrade} onBuyBP={onBuyBP} onPromote={function() { promote(); }}
                                  promoteDisabled={input.promote.disabled || stamina <= 0}
                                  promoteUses={promoteUses}
                                  maxPromoteUses={BALANCE.maxPromoteUses}
                                  finishedCount={finished.length} />}
          {showMaterials && <MaterialsModal inv={inv} sfx={sfx} onClose={function() { sfx.click(); setShowMaterials(false); }} onSell={onSellMaterial} />}
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
              speedLabel={speedLabel}
              speedColor={speedColor}
              strikeLabel={strikeLabel}
              strikeColor={strikeColor}
              matDiffMod={matDiffMod}

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
  // DESKTOP RENDER
  // ============================================================

  var DesktopLayout = DesktopLayoutModule.DesktopLayout;

  return (
      <DesktopLayout
          sfx={sfx}
          ui={ui}
          economy={economy}
          dayState={dayState}
          player={player}
          quest={quest}
          forge={forge}
          vfx={vfx}
          forgeVM={forgeVM}
          playerVM={playerVM}
          economyVM={{ earnGold: earnGold, spendGold: spendGold, popGold: popGold, removeGoldPop: removeGoldPop, handleSell: handleSell, handleRefuse: handleRefuse, onSellMaterial: onSellMaterial }}
          shopVM={shopVM}
          dayVM={{ waitHour: waitHour, sleep: sleep, scavenge: scavenge, promote: promote }}
          input={input}
          derived={{
            smithRank: smithRank,
            nextRank: nextRank,
            timeColor: timeColor,
            timeBarPct: timeBarPct,
            timeBarClass: timeBarClass,
            totalGoldEarned: totalGoldEarned,
          }}
          onActiveToastDone={onActiveToastDone}
          removeToast={removeToast}
          addToast={addToast}
          setGameOver={setGameOver}
          setStamina={setStamina}
          onDebugGoodEvent={function() { AbilityManager.endAll("day"); setMEvent(null); var snapshot = { gold: gold, inv: inv, finished: finished }; GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_GOOD, {}); MysteryLogic.mysteryGood(GameplayEventBus, snapshot); setGoodEventUsed(true); setPendingMystery({ severity: "good" }); }}
          onDebugBadEvent={function() { AbilityManager.endAll("day"); setMEvent(null); var snapshot = { gold: gold, inv: inv, finished: finished }; GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_BAD, {}); MysteryLogic.mysteryBad(GameplayEventBus, snapshot, false); setPendingMystery({ severity: "bad" }); }}
      />
  );
}