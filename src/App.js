// ============================================================
// App.js — Wobbly Anvil Game Brain
// State management, game logic, render tree.
// All data, utilities, components, and systems imported from modules.
// ============================================================

import { useEffect, useRef, useState } from "react";

// --- Module Imports ---
import GameConstants from "./modules/constants.js";
import GameUtils from "./modules/utilities.js";
import MysteryLogic from "./logic/mysteryLogic.js";
import AudioSystem from "./modules/audio.js";
import UIComponents from "./modules/uiComponents.js";
import ForgeComponents from "./modules/forgeComponents.js";
import GamePanels from "./modules/gamePanels.js";
import Screens from "./modules/screens.js";
import GameLayout from "./modules/gameLayout.js";
import SceneSystem from "./modules/sceneSystem.js";
import MobileLayoutModule from "./modules/mobileLayout.js";
import DesktopLayoutModule from "./modules/desktopLayout.js";
import DevBanner from "./components/DevBanner.js";
import DevRouter from "./dev/DevRouter.js";
import GameplayEventBus from "./logic/gameplayEventBus.js";
import EVENT_TAGS from "./config/eventTags.js";
import AbilityManager from "./systems/ability/abilitySubSystem.js";
import CustomerSubSystem from "./systems/customer/customerSubSystem.js";
import FairyController from "./fairy/fairyController.js";
import FairyPawn from "./fairy/fairyPawn.js";
import useFairyChatVM   from "./fairy/useFairyChatVM.js";
import ForgeMode from "./gameMode/forgeMode.js";

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
import FXCueSubSystem from "./systems/fxCue/fxCueSubSystem.js";
import useInputRouter from "./hooks/useInputRouter.js";
import useShopVM from "./hooks/useShopVM.js";
import useAmbientAudio from "./hooks/useAmbientAudio.js";
import useLeaderboard from "./hooks/useLeaderboard.js";
import GameplayAnalyticsSubSystem from "./systems/analytics/gameplayAnalyticsSubSystem.js";
import ANALYTICS_CONFIG from "./config/analyticsConfig.js";
import FairyAnimInstance from "./fairy/FairyAnimInstance";
import MicPrompt from "./components/MicPrompt.js";
import FairyChatSystem from "./fairy/fairyChatSystem.js";
import ScavengeMenuModule from "./modules/ScavengeMenu.js";
import BattleViewModule from "./battle/BattleView.js";

var ScavengeMenu = ScavengeMenuModule.ScavengeMenu;
var BattleView = BattleViewModule.BattleView;

// --- Destructure Constants ---
var PHASES = GameConstants.PHASES;
var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var LATE_TOASTS = GameConstants.LATE_TOASTS;
var STARTING_GOLD = GameConstants.STARTING_GOLD;
var BASE_STAMINA = GameConstants.BASE_STAMINA;
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
var SectionLabel = UIComponents.SectionLabel;
var Row = UIComponents.Row;
var DangerBtn = UIComponents.DangerBtn;
var Toast = UIComponents.Toast;
var ScaleWrapper = UIComponents.ScaleWrapper;

// --- Destructure Scene System ---
var SceneStage = SceneSystem.SceneStage;
var resolveSceneState = SceneSystem.resolveSceneState;

// --- Destructure Forge Components ---
var QTEPanel = ForgeComponents.QTEPanel;

// --- Destructure Game Panels ---
var CustomerPanel = GamePanels.CustomerPanel;
var MaterialsModal = GamePanels.MaterialsModal;
var ShopModal = GamePanels.ShopModal;
var GameOverScreen = GamePanels.GameOverScreen;

// --- Destructure Screens ---
var MainMenu = Screens.MainMenu;

// --- Destructure Layout ---
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
  var [audioReady, setAudioReady] = useState(false);
  var [micChecked, setMicChecked] = useState(false);
  var economy = useEconomyState();
  var dayState = useDayState();
  var player = usePlayerState();
  var forge = useForgeState();
  var quest = useQuestState();
  var vfx = useVFXState();

  // --- Scene-level FX ref (renders behind character, above props) ---
  var sceneFxRef = useRef(null);

  // --- GameMode Hook (owns init, sub-mode registration, lifecycle) ---
  var gm = useGameMode({ bus: GameplayEventBus });

  // --- Gameplay Cue System (routes bus tags → SFX/VFX) ---
  useEffect(function() {
    FXCueSubSystem.init(GameplayEventBus, {
      sfx: sfx,
      fxRef: vfx.fxRef,
      sceneFxRef: sceneFxRef,
    });
    return function() { FXCueSubSystem.destroy(); };
  }, []);

  // --- UI State (from useUIState) ---
  var screen = ui.screen, setScreen = ui.setScreen;
  var showShop = ui.showShop, setShowShop = ui.setShowShop;
  var showMaterials = ui.showMaterials, setShowMaterials = ui.setShowMaterials;
  var setShowGiveUp = ui.setShowGiveUp;
  var showOptions = ui.showOptions, setShowOptions = ui.setShowOptions;
  var handedness = ui.handedness, setHandedness = ui.setHandedness;
  var sfxVol = ui.sfxVol, setSfxVol = ui.setSfxVol;
  var musicVol = ui.musicVol, setMusicVol = ui.setMusicVol;

  // --- Fairy toggle (M-12) ---
  var [fairyEnabled, setFairyEnabled] = useState(function() {
    try { return localStorage.getItem("wa_fairy_enabled") !== "false"; } catch(e) { return true; }
  });

  // --- Scavenge mode (null = normal, "menu" = choice overlay, "battle" = battle view) ---
  var [scavengeMode, setScavengeMode] = useState(null);

  // --- Fairy Chat VM (bus-driven, no App.js logic) ---
  var chatVM = useFairyChatVM(GameplayEventBus);

  // --- Toast State (from useUIState) ---
  var toasts = ui.toasts, setToasts = ui.setToasts;
  var toastQueue = ui.toastQueue, setToastQueue = ui.setToastQueue;
  var activeToast = ui.activeToast, setActiveToast = ui.setActiveToast;

  // --- Economy State (from useEconomyState) ---
  var gold = economy.gold;
  var totalGoldEarned = economy.totalGoldEarned;
  var inv = economy.inv;
  var finished = economy.finished;
  var priceBonus = economy.priceBonus;
  var priceDebuff = economy.priceDebuff;
  var matDiscount = economy.matDiscount;
  var globalMatMult = economy.globalMatMult;

  // --- Day State (from useDayState) ---
  var day = dayState.day;
  var hour = dayState.hour;
  var stamina = dayState.stamina, setStamina = dayState.setStamina;
  var lateToastShown = dayState.lateToastShown, setLateToastShown = dayState.setLateToastShown;
  var gameOver = dayState.gameOver, setGameOver = dayState.setGameOver;

  // --- Quest State (from useQuestState) ---
  var activeCustomer = quest.activeCustomer;

  // --- Market State (already destructured above from useEconomyState) ---

  // --- Player State (from usePlayerState) ---
  var reputation = player.reputation;
  var level = player.level;
  var statPoints = player.statPoints;
  var stats = player.stats;
  var upgrades = player.upgrades;
  var unlockedBP = player.unlockedBP, setUnlockedBP = player.setUnlockedBP;

  // --- Quest State (from useQuestState) ---
  var royalQuest = quest.royalQuest, setRoyalQuest = quest.setRoyalQuest;
  var questNum = quest.questNum;
  var mEvent = quest.mEvent;
  var promoteUses = quest.promoteUses;

  // --- Forge State (from useForgeState) ---
  var wipWeapon = forge.wipWeapon;
  var wKey = forge.wKey, setWKey = forge.setWKey;
  var matKey = forge.matKey, setMatKey = forge.setMatKey;
  var phase = forge.phase, setPhase = forge.setPhase;
  var qualScore = forge.qualScore;
  var stress = forge.stress;
  var bonusStrikes = forge.bonusStrikes;
  var forgeBubble = forge.forgeBubble, setForgeBubble = forge.setForgeBubble;
  var qteFlash = forge.qteFlash;
  var strikesLeft = forge.strikesLeft;

  // --- Mystery Event Tracking (from useQuestState) ---
  var pendingMystery = quest.pendingMystery;

  // --- VFX State (from useVFXState) ---
  var mysteryPending = vfx.mysteryPending;
  var setWeaponShake = vfx.setWeaponShake;

  // --- Scene State (from useVFXState) ---
  var activeScene = vfx.activeScene;
  var sceneActionOverride = vfx.sceneActionOverride, setSceneActionOverride = vfx.setSceneActionOverride;
  var propOverrides = vfx.propOverrides;
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
  var phaseRef = useRef(phase);
  var hourRef = useRef(hour);
  var activeCustomerRef = useRef(activeCustomer);
  var royalQuestRef = useRef(royalQuest);
  var gameStarted = useRef(false);
  var lastReadyDayRef = useRef(0);
  var toastsQueuedRef = useRef(false);

  // --- Fairy Anim ref (Controller → Pawn → AnimInstance chain) ---
  var fairyAnimRef = useRef(null);

  // --- Fairy state provider refs (read by FairyController.stateProvider) ---
  var goldRef = useRef(gold);
  var reputationRef = useRef(reputation);
  var dayRef = useRef(day);
  var matKeyRef = useRef(matKey);
  var wipWeaponRef = useRef(wipWeapon);

  // --- Forge tutorial bridge refs (read by gameAction in FairyController) ---
  var forgeRef = useRef(forge);
  var forgeVMRef = useRef(null);  // set after useForgeVM creates it

  // Keep refs current
  finishedRef.current = finished;
  phaseRef.current = phase;
  hourRef.current = hour;
  activeCustomerRef.current = activeCustomer;
  royalQuestRef.current = royalQuest;
  goldRef.current = gold;
  reputationRef.current = reputation;
  dayRef.current = day;
  matKeyRef.current = matKey;
  wipWeaponRef.current = wipWeapon;
  forgeRef.current = forge;

  // --- Customer Manager Init (pure JS, bus-driven) ---
  useEffect(function() {
    CustomerSubSystem.init(
        GameplayEventBus,
        function() {
          return {
            finished: finishedRef.current,
            phase: phaseRef.current,
            hour: hourRef.current,
            activeCustomer: activeCustomerRef.current,
          };
        },
        AbilityManager
    );
    return function() { CustomerSubSystem.reset(); };
  }, []);

  // --- Run Stats Init (pure JS, bus-driven) ---
  useEffect(function() {
    GameplayAnalyticsSubSystem.init(GameplayEventBus, ANALYTICS_CONFIG);
    return function() { GameplayAnalyticsSubSystem.destroy(); };
  }, []);

  // --- Fairy Helper Init (pure JS, bus-driven) ---
  // Wire: Controller → Pawn → AnimInstance (via ref)
  useEffect(function() {
    FairyPawn.init({
      animRef: fairyAnimRef,
      onPawnEvent: function(type, data) {
        FairyController.onPawnEvent(type, data);
      },
      scene: "forge",
    });

    FairyController.init({
      devSkipPersist: true, // TESTING — remove when done
      bus: GameplayEventBus,
      stateProvider: function() {
        var rq = royalQuestRef.current;
        var wip = wipWeaponRef.current;
        var mk = matKeyRef.current;
        return {
          gold:             goldRef.current,
          rep:              reputationRef.current,
          day:              dayRef.current,
          hour:             hourRef.current,
          phase:            phaseRef.current,
          selectedMaterial: mk,
          materialName:     mk && MATS[mk] ? MATS[mk].name : null,
          weaponName:       wip ? wip.name : null,
          activeDecree:     !!(rq && !rq.fulfilled),
          daysLeft:         rq ? rq.daysLeft : null,
          totalForges:      GameplayAnalyticsSubSystem.getStats().forgeSessions,
        };
      },
      onCommand: function(cmd) {
        FairyPawn.handleCommand(cmd);
      },
      gameAction: function(name, params) {
        var f = forgeRef.current;
        var vm = forgeVMRef.current;
        console.log("[GameAction] " + name, params || "");
        switch (name) {
          case "enter_sandbox":
            f.setIsSandbox(true);
            break;
          case "exit_sandbox":
            f.setIsSandbox(false);
            f.setQualScore(0); f.setStress(0); f.setForgeSess(0);
            f.setSessResult(null); f.setForgeBubble(null); f.setQteFlash(null);
            f.setWipWeapon(null);
            forgeVM.qteProcessing.current = false;
            sfx.setMode("idle");
            ForgeMode.transitionTo(PHASES.IDLE);
            f.setPhase(PHASES.IDLE);
            break;
          case "begin_forge":
            ForgeMode.transitionTo(PHASES.SELECT);
            f.setPhase(PHASES.SELECT);
            break;
          case "select_weapon":
            if (params && params.key) f.setWKey(params.key);
            ForgeMode.transitionTo(PHASES.SELECT_MAT);
            f.setPhase(PHASES.SELECT_MAT);
            break;
          case "select_material":
            if (params && params.key) f.setMatKey(params.key);
            break;
          case "confirm_select":
            if (vm) vm.confirmSelect();
            break;
          case "resolve_qte":
            console.log("[GameAction] resolve_qte — vm exists:", !!vm, "vm.sandboxResolveQte exists:", !!(vm && vm.sandboxResolveQte));
            if (vm) vm.sandboxResolveQte();
            break;
          case "quench":
            ForgeMode.transitionTo(PHASES.QUENCH);
            f.setPhase(PHASES.QUENCH);
            break;
          default:
            console.warn("[GameAction] Unknown action: " + name);
        }
      },
    });


    return function() {
      FairyController.destroy();
      FairyPawn.destroy();
    };
  }, []);

  // --- Leaderboard ---
  var leaderboard = useLeaderboard();


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

  // --- Day Ready (toast drain → GameMode.markReady) ---
  useEffect(function() {
    if (screen !== "game") return;
    if (!toastsQueuedRef.current) return;
    if (activeToast || toastQueue.length > 0) return;
    if (day <= 0 || day === lastReadyDayRef.current) return;
    lastReadyDayRef.current = day;
    gm.core.markReady();
  }, [activeToast, toastQueue, day, screen]);

  // --- Customer System ---
  // Customer spawning now handled by CustomerSubSystem (src/systems/customer/customerSubSystem.js).
  // It listens to DAY_ADVANCE_HOUR, ECONOMY_WEAPON_SOLD, CUSTOMER_REFUSE,
  // CUSTOMER_WALKOUT, and day lifecycle tags. No spawn logic in App.js.


  // --- Time & Actions ---
  function advanceTime(hrs, nf, useStam) {
    var newHour = hour + hrs;
    GameplayEventBus.emit(EVENT_TAGS.DAY_ADVANCE_HOUR, { hour: newHour });
    if (useStam) { setStamina(function(s) { return Math.max(0, s - 1); }); gainXp(6); }
  }

  // --- Player ViewModel ---
  var playerVM = usePlayerVM({
    player: player, sfx: sfx,
    setStamina: setStamina, setGameOver: setGameOver,
    gameOver: gameOver
  });
  var gainXp = playerVM.gainXp, changeRep = playerVM.changeRep, allocateStat = playerVM.allocateStat;

  // --- Economy ViewModel ---
  var economyVM = useEconomyVM({
    economy: economy, quest: quest, sfx: sfx,
    addToast: addToast
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
    setRoyalQuest: setRoyalQuest, setWeaponShake: setWeaponShake,
    gold: gold, inv: inv, finished: finished, hour: hour, stamina: stamina,
    stats: stats, upgrades: upgrades,
    pendingMystery: pendingMystery, royalQuestRef: royalQuestRef
  });
  var takeBreak = forgeVM.takeBreak, resumeWip = forgeVM.resumeWip, scrapWip = forgeVM.scrapWip, scrapWeapon = forgeVM.scrapWeapon, confirmSelect = forgeVM.confirmSelect, onForgeClick = forgeVM.onForgeClick, handleAutoFire = forgeVM.handleAutoFire, attemptForge = forgeVM.attemptForge, doNormalize = forgeVM.doNormalize;
  var weapon = forgeVM.weapon, matData = forgeVM.matData, matDiffMod = forgeVM.matDiffMod, effDiff = forgeVM.effDiff, isExhausted = forgeVM.isExhausted, sessCost = forgeVM.sessCost, maxStam = forgeVM.maxStam;
  var heatModifierScale = forgeVM.heatModifierScale, heatSpeedMult = forgeVM.heatSpeedMult, hammerSpeedMult = forgeVM.hammerSpeedMult, quenchSpeedMult = forgeVM.quenchSpeedMult;
  var speedLabel = forgeVM.speedLabel, speedColor = forgeVM.speedColor;
  var strikeLabel = forgeVM.strikeLabel, strikeColor = forgeVM.strikeColor, stressColor = forgeVM.stressColor, stressLabel2 = forgeVM.stressLabel2;
  var isQTEActive = forgeVM.isQTEActive, isForging = forgeVM.isForging, diffColor = forgeVM.diffColor;
  var qtePosRef = forgeVM.qtePosRef, qteProcessing = forgeVM.qteProcessing;
  forgeVMRef.current = forgeVM;

  // --- Ambient Audio Layer ---
  var ambient = useAmbientAudio({ isForging: isForging, muted: false, sfxVol: sfxVol });

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
    earnGold: earnGold, changeRep: changeRep,
    forgeOnSleep: forgeVM.onSleep,
    maxStam: maxStam, advanceTime: advanceTime, unlockedBP: unlockedBP, setUnlockedBP: setUnlockedBP, reputation: reputation,
    level: level, toastsQueuedRef: toastsQueuedRef
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
    setToastQueue(buildDayQueue(1, state, 0));
    toastsQueuedRef.current = true;
  }, [screen]);
  useEffect(function() { return function() { sfx.setMode("off"); }; }, []);

  // --- Reset ---
  function resetGame() {
    sfx.setMode("off"); gameStarted.current = false; forgeVM.resetForgeState(); gm.newGame(); FairyController.reset(); FairyPawn.cancelCue(); toastsQueuedRef.current = false; lastReadyDayRef.current = 0;
    setScreen("menu"); setAudioReady(false);
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

  // Dev tools route — bypass game rendering (hooks already called above)
  if (window.location.pathname.startsWith("/dev")) {
    return <DevRouter />;
  }

  // --- Mic permission prompt (before any fullscreen) ---
  if (!micChecked) return <MicPrompt onComplete={function(granted) {
    if (!granted) FairyChatSystem.disableSpeech();
    setMicChecked(true);
  }} />;

  if (gameOver) return <ScaleWrapper key="sw"><GameOverScreen day={day} gold={gold} totalGoldEarned={totalGoldEarned} onReset={resetGame} leaderboardEntries={leaderboard.entries} copied={leaderboard.copied} runStats={GameplayAnalyticsSubSystem.getStats()} onCopyScore={function(name) { leaderboard.copyScore(name, { day: day, gold: gold, totalGoldEarned: totalGoldEarned, reputation: reputation, level: level }, GameplayAnalyticsSubSystem.getStats()); }} /></ScaleWrapper>;
  if (screen === "menu") return <ScaleWrapper key="sw"><MainMenu audioReady={audioReady} onAudioWarmup={function() { sfx.warmup(); sfx.setSfxVol(sfxVol); sfx.setMusicVol(musicVol); ambient.startAmbient(); setTimeout(function() { GameplayEventBus.emit(EVENT_TAGS.FX_FANFARE, {}); }, 80); setAudioReady(true); }} onStart={function() { setScreen("game"); }} sfx={sfx} /></ScaleWrapper>;

  // ============================================================
  // SCAVENGE BATTLE — Full-screen takeover
  // ============================================================
  if (scavengeMode === "battle") {
    return (
        <BattleView
            handedness={handedness}
            onExit={function() { setScavengeMode(null); }}
            zoneName="Back Alley"
            waveLabel="Wave 1/2"
        />
    );
  }

  // ============================================================
  // FAIRY CHAT OVERLAY (shared by mobile + desktop)
  // ============================================================
  // MOBILE RENDER BRANCH
  // ============================================================
  if (isMobile) {
    // --- Build scene for center zone ---
    var mobileScene = (function() {
      var ss = resolveSceneState({ phase: phase, scene: activeScene, overrideAction: sceneActionOverride, propOverrides: propOverrides });
      return <SceneStage scene={ss.scene} phase={ss.phase} characterAction={ss.characterAction} onCharacterActionComplete={function(nextAction) { setSceneActionOverride(nextAction); }} propOverrides={ss.propOverrides} fxRef={fxRef} sceneFxRef={sceneFxRef} />;
    })();

    // --- Build QTE + forge UI for center zone ---
    var mobileForgeUI = (
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: "5%", gap: 4, width: "100%", flex: 1, boxSizing: "border-box", pointerEvents: forge.isSandbox ? "none" : "auto" }}>
          {/* Forge bubble */}
          {forgeBubble && (
              <div onClick={function(e) { e.stopPropagation(); setForgeBubble(null); }} style={{ position: "absolute", top: "20%", left: "65%", transform: "translateX(-50%)", zIndex: 60, background: "#0c0905", border: "2px solid " + forgeBubble.color, borderRadius: 10, padding: "10px 12px", width: 120, boxShadow: "0 4px 16px rgba(0,0,0,0.97)", cursor: "pointer", fontSize: 9 }}>
                <div style={{ fontSize: 9, color: forgeBubble.color, letterSpacing: 1, fontWeight: "bold", marginBottom: 4 }}>{forgeBubble.title}</div>
                {forgeBubble.lines.map(function(l, i) { return <div key={i} style={{ fontSize: 10, color: l.color || "#c8b89a", lineHeight: 1.6, fontWeight: l.bold ? "bold" : "normal" }}>{l.text}</div>; })}
              </div>
          )}

          {/* QTE dark box — only during active QTE phases */}
          {isQTEActive && (
              <div style={{ width: "100%", maxWidth: 400, background: "rgba(8,5,2,0.88)", border: "1px solid #2a1f0a", borderRadius: 10, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
                <QTEPanel phase={phase} modifierScale={heatModifierScale} flash={qteFlash} strikesLeft={strikesLeft} strikesTotal={BALANCE.baseStrikes + bonusStrikes} heatSpeedMult={heatSpeedMult} hammerSpeedMult={hammerSpeedMult} quenchSpeedMult={quenchSpeedMult} posRef={qtePosRef} processingRef={qteProcessing} onAutoFire={handleAutoFire} isSandbox={forge.isSandbox} qualScore={qualScore} qualityLabel={getQualityTier(qualScore).label} qualityColor={getQualityTier(qualScore).weaponColor} />
              </div>
          )}

          {/* QTEPanel when NOT in dark box (non-QTE forge phases that still need it) */}
          {!isQTEActive && (
              <QTEPanel phase={phase} modifierScale={heatModifierScale} flash={qteFlash} strikesLeft={strikesLeft} strikesTotal={BALANCE.baseStrikes + bonusStrikes} heatSpeedMult={heatSpeedMult} hammerSpeedMult={hammerSpeedMult} quenchSpeedMult={quenchSpeedMult} posRef={qtePosRef} processingRef={qteProcessing} onAutoFire={handleAutoFire} isSandbox={forge.isSandbox} qualScore={qualScore} qualityLabel={getQualityTier(qualScore).label} qualityColor={getQualityTier(qualScore).weaponColor} />
          )}

          {/* MOBILE WEAPON SELECT */}
          {phase === PHASES.SELECT && (
              <div data-fairy-target="weapon_select_panel" style={{ position: "absolute", top: "15%", bottom: "15%", right: handedness === "left" ? "28%" : "22%", left: handedness === "left" ? "22%" : "28%", zIndex: 30, background: "rgba(10,7,4,0.95)", display: "flex", flexDirection: "column", alignItems: "center", padding: 10, overflow: "hidden" }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: "#f59e0b", fontWeight: "bold", marginBottom: 2 }}>CHOOSE WEAPON</div>
                <div style={{ fontSize: 9, color: "#8a7a64", marginBottom: 6 }}>Requires {WEAPONS[wKey].materialCost} units</div>
                {/* Weapon list */}
                <div style={{ flex: 1, width: "100%", maxWidth: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.keys(WEAPONS).filter(function(k) { return unlockedBP.includes(k); }).map(function(k) {
                    var w = WEAPONS[k], isQ = !!(royalQuest && !royalQuest.fulfilled && royalQuest.weaponKey === k), isSel = wKey === k;
                    var dc = w.difficulty <= 3 ? "#4ade80" : w.difficulty <= 6 ? "#fbbf24" : w.difficulty <= 8 ? "#fb923c" : "#ef4444";
                    return (
                        <div key={k} onClick={function() { sfx.click(); setWKey(k); }} style={{ border: "1px solid " + (isSel ? "#f59e0b" : "#2a1f0a"), borderRadius: 5, padding: "7px 10px", cursor: "pointer", background: isSel ? "#2a1f0a" : "#0a0704", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, color: isSel ? "#f59e0b" : "#f0e6c8", letterSpacing: 1 }}>{w.name.toUpperCase()}</span>
                            {isQ && <span style={{ fontSize: 9, background: "#f59e0b", color: "#0a0704", borderRadius: 3, padding: "1px 5px", fontWeight: "bold" }}>QUEST</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 9, color: "#c8b89a", background: "#1a1209", borderRadius: 3, padding: "2px 6px", fontWeight: "bold" }}>{"Value " + w.baseValue}</span>
                            <span style={{ fontSize: 9, color: "#0a0704", background: dc, borderRadius: 3, padding: "2px 6px", fontWeight: "bold", minWidth: 20, textAlign: "center" }}>{"Diff " + w.difficulty}</span>
                          </div>
                        </div>
                    );
                  })}
                </div>
                {/* Buttons */}
                <div style={{ position: "relative", width: "100%", maxWidth: 400, marginTop: 8, height: 40 }}>
                  <button onClick={function() { sfx.click(); setPhase(PHASES.IDLE); }} style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", background: "#141009", border: "2px solid #3d2e0f", borderRadius: 6, color: "#8a7a64", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}>CANCEL</button>
                  <button onClick={function() { sfx.click(); setPhase(PHASES.SELECT_MAT); }} disabled={stamina <= 0 || input.isLocked} style={{ position: "absolute", right: handedness === "left" ? "auto" : 0, left: handedness === "left" ? 0 : "auto", background: "#2a1f0a", border: "2px solid #f59e0b", borderRadius: 6, color: "#f59e0b", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}>NEXT</button>
                </div>
              </div>
          )}

          {/* MOBILE MATERIAL SELECT */}
          {phase === PHASES.SELECT_MAT && (function() {
            var matHave = inv[matKey] || 0;
            var matNeed = weapon.materialCost;
            var matShort = Math.max(0, matNeed - matHave);
            var matBuyTotal = matShort * MATS[matKey].price;
            var canAffordBuy = gold >= matBuyTotal;
            var stockColor = matHave >= matNeed ? "#4ade80" : "#ef4444";
            return (
                <div data-fairy-target="mat_select_panel" style={{ position: "absolute", top: "15%", bottom: "15%", right: handedness === "left" ? "28%" : "22%", left: handedness === "left" ? "22%" : "28%", zIndex: 30, background: "rgba(10,7,4,0.95)", display: "flex", flexDirection: "column", alignItems: "center", padding: 10, overflow: "hidden" }}>
                  <div style={{ fontSize: 12, letterSpacing: 2, color: "#f59e0b", fontWeight: "bold", marginBottom: 2 }}>CHOOSE MATERIAL</div>
                  <div style={{ fontSize: 9, color: "#8a7a64", marginBottom: 6 }}>{weapon.name} needs {matNeed} units — <span style={{ color: stockColor }}>{matHave} in stock</span></div>
                  {/* Material list */}
                  <div style={{ flex: 1, width: "100%", maxWidth: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {Object.entries(MATS).map(function(e) {
                      var k = e[0], m = e[1], have = inv[k] || 0, enough = have >= weapon.materialCost;
                      var isQ = !!(royalQuest && !royalQuest.fulfilled && royalQuest.materialRequired === k);
                      var isSel = matKey === k, needed = Math.max(0, weapon.materialCost - have), buyPrice = MATS[k].price * needed, canBuy = needed > 0 && gold >= buyPrice;
                      var canSelect = enough || canBuy;
                      var dm = m.difficultyModifier;
                      var dmc = dm < 0 ? "#4ade80" : dm === 0 ? "#c8b89a" : dm <= 3 ? "#fbbf24" : "#fb923c";
                      return (
                          <div key={k} onClick={canSelect ? function() { sfx.click(); setMatKey(k); } : null} style={{ border: "1px solid " + (isSel ? "#f59e0b" : canSelect ? "#2a1f0a" : "#1a1209"), borderRadius: 5, padding: "7px 10px", cursor: canSelect ? "pointer" : "not-allowed", background: isSel ? "#2a1f0a" : "#0a0704", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: canSelect ? 1 : 0.4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 11, color: isSel ? m.color : canSelect ? m.color : "#3d2e0f", letterSpacing: 1, fontWeight: "bold" }}>{m.name.toUpperCase()}</span>
                              {isQ && <span style={{ fontSize: 9, background: "#f59e0b", color: "#0a0704", borderRadius: 3, padding: "1px 5px", fontWeight: "bold" }}>QUEST</span>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 9, color: "#c8b89a", background: "#1a1209", borderRadius: 3, padding: "2px 6px", fontWeight: "bold" }}>{"Value x" + m.valueMultiplier}</span>
                              <span style={{ fontSize: 9, color: "#0a0704", background: dmc, borderRadius: 3, padding: "2px 6px", fontWeight: "bold", minWidth: 20, textAlign: "center" }}>{"Diff " + (dm > 0 ? "+" : "") + dm}</span>
                            </div>
                          </div>
                      );
                    })}
                  </div>
                  {/* Buy materials — always reserves space, only visible when short */}
                  <div style={{ width: "100%", maxWidth: 400, height: 32, marginTop: 4, display: "flex", justifyContent: "center" }}>
                    {matShort > 0 && (
                        <button onClick={canAffordBuy ? function() { sfx.click(); onBuy(matKey, matShort, MATS[matKey].price); } : null} disabled={!canAffordBuy} style={{ background: canAffordBuy ? "#1a1500" : "#0a0704", border: "1px solid " + (canAffordBuy ? "#f59e0b" : "#1a1209"), borderRadius: 6, color: canAffordBuy ? "#f59e0b" : "#4a3c2c", padding: "4px 16px", fontSize: 10, cursor: canAffordBuy ? "pointer" : "not-allowed", letterSpacing: 1, fontFamily: "'Josefin Sans', sans-serif", fontWeight: "bold" }}>{"BUY " + matShort + " " + MATS[matKey].name.toUpperCase() + " \u2014 " + matBuyTotal + "g"}</button>
                    )}
                  </div>
                  {/* Buttons */}
                  <div style={{ position: "relative", width: "100%", maxWidth: 400, marginTop: 4, height: 40 }}>
                    <button onClick={function() { sfx.click(); setPhase(PHASES.SELECT); }} style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", background: "#141009", border: "2px solid #3d2e0f", borderRadius: 6, color: "#8a7a64", padding: "8px 24px", fontSize: 12, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}>BACK</button>
                    {(function() {
                      var canConfirm = !input.confirmSelect.disabled;
                      return <button data-fairy-target="btn_confirm" onClick={canConfirm ? function() { sfx.click(); confirmSelect(); } : null} disabled={!canConfirm} style={{ position: "absolute", right: handedness === "left" ? "auto" : 0, left: handedness === "left" ? 0 : "auto", background: canConfirm ? "#2a1f0a" : "#0a0704", border: "2px solid " + (canConfirm ? "#f59e0b" : "#1a1209"), borderRadius: 6, color: canConfirm ? "#f59e0b" : "#2a1f0a", padding: "8px 24px", fontSize: 12, cursor: canConfirm ? "pointer" : "not-allowed", letterSpacing: 1, fontFamily: "monospace", fontWeight: "bold", textTransform: "uppercase" }}>CONFIRM</button>;
                    })()}
                  </div>
                </div>
            );
          })()}
        </div>
    );

    // --- Build overlay (toasts, customer) ---
    var mobileOverlay = (
        <>
          {toasts.map(function(t) { return <Toast key={t.id} msg={t.msg} icon={t.icon} color={t.color} duration={t.duration} locked={t.locked} onDone={function() { removeToast(t.id); }} />; })}
          {activeToast && <Toast key={activeToast.id} msg={activeToast.msg} icon={activeToast.icon} color={activeToast.color} duration={activeToast.duration} locked={activeToast.locked} onDone={onActiveToastDone} />}
          {activeCustomer && (
              <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", pointerEvents: "auto" }}>
                <div style={{ width: "min(420px, 92%)", maxHeight: "90%" }}>
                  <CustomerPanel customer={activeCustomer} weapon={activeCustomer.weapon} onSell={function(price) { handleSell(price, activeCustomer.weapon.id); }} onRefuse={handleRefuse} silverTongue={stats.silverTongue} priceBonus={priceBonus} priceDebuff={priceDebuff} sfx={sfx} />
                </div>
              </div>
          )}
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
              questNum={questNum}
              mEvent={mEvent}

              /* Data strip props — forging */
              qualScore={qualScore}
              qualityColor={getQualityTier(qualScore).weaponColor}
              qualityLabel={getQualityTier(qualScore).label}
              stressColor={stressColor}
              stressLabel={stressLabel2}
              stressFilled={stress}
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
              upgrades={upgrades}
              onAllocate={function(k) { sfx.click(); allocateStat(k); }}
              statLocked={input.statAlloc.disabled}
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
              noStamina={input.noStamina}
              onPromote={promote}
              promoteDisabled={input.promote.disabled}
              onScavenge={function() { sfx.click(); setScavengeMode("menu"); }}
              scavengeDisabled={input.scavenge.disabled}
              onShop={function() { sfx.click(); setShowShop(true); }}
              shopDisabled={input.shop.disabled}
              onMats={function() { sfx.click(); setShowMaterials(true); }}
              matsDisabled={input.mats.disabled}

              /* Options button */
              onOptions={function() { sfx.click(); setShowOptions(true); }}

              /* Tutorial highlight */
              tutorialHighlight={vfx.tutorialHighlight}

              /* Begin forge / WIP props */
              hasWip={!!wipWeapon}
              onBeginForge={function() {
                sfx.click();
                if (FairyController.shouldStartForgeTutorial()) {
                  FairyController.startForgeTutorial();
                  return;
                }
                setPhase(PHASES.SELECT);
              }}
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
              {...chatVM}
          />
          {showOptions && (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Josefin Sans', sans-serif" }} onClick={function(e) { if (e.target === e.currentTarget) setShowOptions(false); }}>
            <div style={{ padding: "24px 28px", width: 300, maxHeight: "80vh", overflowY: "auto", background: "#0f0b06", border: "2px solid #2a1f0a", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.9)" }}>
              <Row style={{ marginBottom: 16 }}><div style={{ fontSize: 14, color: "#f59e0b", letterSpacing: 3, fontFamily: "'Cinzel', serif" }}>OPTIONS</div><button onClick={function() { setShowOptions(false); }} style={{ background: "#2a1f0a", border: "1px solid #3d2e0f", borderRadius: 5, color: "#f59e0b", padding: "4px 10px", cursor: "pointer", fontFamily: "'Josefin Sans', sans-serif", fontSize: 13 }}>X</button></Row>
              <div style={{ borderTop: "1px solid #2a1f0a", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <SectionLabel>LAYOUT</SectionLabel><label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 12, color: "#c8b89a", letterSpacing: 1, userSelect: "none" }}>Left-Handed Mode<input type="checkbox" checked={handedness === "left"} onChange={function() { setHandedness(function(h) { return h === "right" ? "left" : "right"; }); }} style={{ accentColor: "#f59e0b", width: 15, height: 15, cursor: "pointer" }} /></label><div style={{ borderTop: "1px solid #2a1f0a", marginTop: 12, paddingTop: 12 }} />
                <SectionLabel>AUDIO</SectionLabel>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#c8b89a", letterSpacing: 1, userSelect: "none" }}>SFX<input type="range" min="0" max="1" step="0.05" value={sfxVol} onChange={function(e) { var v = parseFloat(e.target.value); setSfxVol(v); sfx.setSfxVol(v); }} style={{ width: 120, accentColor: "#f59e0b", cursor: "pointer" }} /></label>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#c8b89a", letterSpacing: 1, userSelect: "none" }}>MUSIC<input type="range" min="0" max="1" step="0.05" value={musicVol} onChange={function(e) { var v = parseFloat(e.target.value); setMusicVol(v); sfx.setMusicVol(v); }} style={{ width: 120, accentColor: "#f59e0b", cursor: "pointer" }} /></label>
                <div style={{ borderTop: "1px solid #2a1f0a", marginTop: 12, paddingTop: 12 }} />
                <SectionLabel>FAIRY</SectionLabel>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 12, color: "#c8b89a", letterSpacing: 1, userSelect: "none" }}>Fairy Helper<input type="checkbox" checked={fairyEnabled} onChange={function() { var next = !fairyEnabled; setFairyEnabled(next); FairyController.setEnabled(next); }} style={{ accentColor: "#f59e0b", width: 15, height: 15, cursor: "pointer" }} /></label>
              </div>
              <div style={{ borderTop: "1px solid #2a1f0a", paddingTop: 14, marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <SectionLabel style={{ marginBottom: 4 }}>DANGER ZONE</SectionLabel>
                <DangerBtn onClick={function() { setShowOptions(false); setShowGiveUp(true); }}>Give Up</DangerBtn>
              </div>
            </div>
          </div>)}
          {scavengeMode === "menu" && (
              <ScavengeMenu
                  onQuickScavenge={function() { setScavengeMode(null); scavenge(); }}
                  onExtendedScavenge={function() { setScavengeMode("battle"); }}
                  onCancel={function() { setScavengeMode(null); }}
                  handedness={handedness}
              />
          )}
          <FairyAnimInstance sfx={sfx} ref={fairyAnimRef} getDodgeSpot={FairyPawn.getDodgeSpot} onTapExit={FairyPawn.onTapExit} onTapDodge={FairyPawn.onTapDodge} onTutorialTap={FairyPawn.onTutorialTap} onChoiceSelect={FairyPawn.onChoiceSelect} onChatTap={function() { GameplayEventBus.emit(EVENT_TAGS.FAIRY_CHAT_DISMISS); }} />
          <DevBanner />
        </>
    );
  }


  // ============================================================
  // DESKTOP RENDER
  // ============================================================

  var DesktopLayout = DesktopLayoutModule.DesktopLayout;

  return (
      <>
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
            dayVM={{ waitHour: waitHour, sleep: sleep, scavenge: function() { sfx.click(); setScavengeMode("menu"); }, promote: promote }}
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
            sceneFxRef={sceneFxRef}
            onDebugGoodEvent={function() { AbilityManager.endAll("day"); quest.setMEvent(null); var snapshot = { gold: gold, inv: inv, finished: finished }; GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_GOOD, {}); MysteryLogic.mysteryGood(GameplayEventBus, snapshot); quest.setGoodEventUsed(true); quest.setPendingMystery({ severity: "good" }); }}
            onDebugBadEvent={function() { AbilityManager.endAll("day"); quest.setMEvent(null); var snapshot = { gold: gold, inv: inv, finished: finished }; GameplayEventBus.emit(EVENT_TAGS.FX_MYSTERY_BAD, {}); MysteryLogic.mysteryBad(GameplayEventBus, snapshot, false); quest.setPendingMystery({ severity: "bad" }); }}
            onBeginForge={function() {
              sfx.click();
              if (FairyController.shouldStartForgeTutorial()) {
                FairyController.startForgeTutorial();
                return;
              }
              setPhase(PHASES.SELECT);
            }}
            fairyEnabled={fairyEnabled}
            onFairyToggle={function(val) { setFairyEnabled(val); FairyController.setEnabled(val); }}
            {...chatVM}
        />
        {scavengeMode === "menu" && (
            <ScavengeMenu
                onQuickScavenge={function() { setScavengeMode(null); scavenge(); }}
                onExtendedScavenge={function() { setScavengeMode("battle"); }}
                onCancel={function() { setScavengeMode(null); }}
                handedness={handedness}
            />
        )}
        <FairyAnimInstance sfx={sfx} ref={fairyAnimRef} getDodgeSpot={FairyPawn.getDodgeSpot} onTapExit={FairyPawn.onTapExit} onTapDodge={FairyPawn.onTapDodge} onTutorialTap={FairyPawn.onTutorialTap} onChoiceSelect={FairyPawn.onChoiceSelect} onChatTap={function() { GameplayEventBus.emit(EVENT_TAGS.FAIRY_CHAT_DISMISS); }} />
      </>
  );
}