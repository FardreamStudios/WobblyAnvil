// ============================================================
// desktopLayout.js — Wobbly Anvil Desktop Layout
// Extracted from App.js. Pure view — receives all state and
// callbacks via props, renders the desktop game UI.
// Mirrors how mobileLayout.js works for the mobile branch.
// ============================================================

import GameConstants from "./constants.js";
import GameUtils from "./utilities.js";
import UIComponents from "./uiComponents.js";
import ForgeComponents from "./forgeComponents.js";
import GamePanels from "./gamePanels.js";
import RhythmQTEModule from "./rhythmQTE.js";
import GameLayout from "./gameLayout.js";
import SceneSystem from "./sceneSystem.js";
import DevBanner from "../components/DevBanner.js";
import ForgeFireFX from "../components/ForgeFireFX.js";

// --- Destructure Constants ---
var PHASES = GameConstants.PHASES;
var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var TAG_COLORS = GameConstants.TAG_COLORS;
var COL_W = GameConstants.COL_W;
var STRESS_MAX = GameConstants.STRESS_MAX;
var BALANCE = GameConstants.BALANCE;
var UPGRADES = GameConstants.UPGRADES;

// --- Destructure Utilities ---
var getQualityTier = GameUtils.getQualityTier;
var referenceValue = GameUtils.referenceValue;
var formatTime = GameUtils.formatTime;

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

// --- Destructure Rhythm QTE ---
var RhythmQTE = RhythmQTEModule.RhythmQTE;

// --- Destructure Layout ---
var GameShell = GameLayout.GameShell;
var GameHeader = GameLayout.GameHeader;
var GameLeft = GameLayout.GameLeft;
var GameCenter = GameLayout.GameCenter;
var GameRight = GameLayout.GameRight;
var GameFooter = GameLayout.GameFooter;

// ============================================================
// Desktop Layout Component
// ============================================================

function DesktopLayout(props) {
    var sfx = props.sfx;
    var ui = props.ui;
    var economy = props.economy;
    var dayState = props.dayState;
    var player = props.player;
    var quest = props.quest;
    var forge = props.forge;
    var mystery = props.mystery;
    var forgeVM = props.forgeVM;
    var playerVM = props.playerVM;
    var economyVM = props.economyVM;
    var shopVM = props.shopVM;
    var dayVM = props.dayVM;
    var input = props.input;
    var derived = props.derived;

    // --- UI State ---
    var showShop = ui.showShop, setShowShop = ui.setShowShop;
    var showMaterials = ui.showMaterials, setShowMaterials = ui.setShowMaterials;
    var showGiveUp = ui.showGiveUp, setShowGiveUp = ui.setShowGiveUp;
    var showOptions = ui.showOptions, setShowOptions = ui.setShowOptions;
    var showRhythmTest = ui.showRhythmTest, setShowRhythmTest = ui.setShowRhythmTest;
    var sfxVol = ui.sfxVol, setSfxVol = ui.setSfxVol;
    var musicVol = ui.musicVol, setMusicVol = ui.setMusicVol;
    var toasts = ui.toasts;
    var activeToast = ui.activeToast;

    // --- Economy State ---
    var gold = economy.gold;
    var inv = economy.inv;
    var finished = economy.finished;
    var priceBonus = economy.priceBonus;
    var priceDebuff = economy.priceDebuff;
    var matDiscount = economy.matDiscount;
    var globalMatMult = economy.globalMatMult;
    var goldPops = economy.goldPops;

    // --- Day State ---
    var day = dayState.day;
    var hour = dayState.hour;
    var stamina = dayState.stamina;

    // --- Player State ---
    var reputation = player.reputation;
    var level = player.level;
    var xp = player.xp;
    var statPoints = player.statPoints;
    var stats = player.stats;
    var upgrades = player.upgrades;
    var unlockedBP = player.unlockedBP;

    // --- Quest State ---
    var activeCustomer = quest.activeCustomer;
    var royalQuest = quest.royalQuest;
    var questNum = quest.questNum;
    var mEvent = quest.mEvent;
    var promoteUses = quest.promoteUses;

    // --- Forge State ---
    var phase = forge.phase, setPhase = forge.setPhase;
    var qualScore = forge.qualScore;
    var stress = forge.stress;
    var bonusStrikes = forge.bonusStrikes;
    var sessResult = forge.sessResult;
    var forgeBubble = forge.forgeBubble, setForgeBubble = forge.setForgeBubble;
    var qteFlash = forge.qteFlash;
    var strikesLeft = forge.strikesLeft;
    var wKey = forge.wKey, setWKey = forge.setWKey;
    var matKey = forge.matKey, setMatKey = forge.setMatKey;
    var wipWeapon = forge.wipWeapon;

    // --- Mystery State ---
    var pendingMystery = mystery.pendingMystery;
    var goodEventUsed = mystery.goodEventUsed;
    var mysteryShake = mystery.mysteryShake;
    var weaponShake = mystery.weaponShake;
    var mysteryVignette = mystery.mysteryVignette;
    var mysteryVignetteOpacity = mystery.mysteryVignetteOpacity;
    var activeScene = mystery.activeScene;
    var sceneActionOverride = mystery.sceneActionOverride, setSceneActionOverride = mystery.setSceneActionOverride;
    var propOverrides = mystery.propOverrides;
    var fxRef = mystery.fxRef;

    // --- ForgeVM ---
    var weapon = forgeVM.weapon;
    var matData = forgeVM.matData;
    var matDiffMod = forgeVM.matDiffMod;
    var effDiff = forgeVM.effDiff;
    var isExhausted = forgeVM.isExhausted;
    var maxStam = forgeVM.maxStam;
    var heatWinLo = forgeVM.heatWinLo, heatWinHi = forgeVM.heatWinHi;
    var heatSpeedMult = forgeVM.heatSpeedMult, hammerSpeedMult = forgeVM.hammerSpeedMult, quenchSpeedMult = forgeVM.quenchSpeedMult;
    var speedLabel = forgeVM.speedLabel, speedColor = forgeVM.speedColor;
    var strikeLabel = forgeVM.strikeLabel, strikeColor = forgeVM.strikeColor;
    var stressColor = forgeVM.stressColor, stressLabel2 = forgeVM.stressLabel2;
    var showBars = forgeVM.showBars, isQTEActive = forgeVM.isQTEActive, diffColor = forgeVM.diffColor;
    var qtePosRef = forgeVM.qtePosRef, qteProcessing = forgeVM.qteProcessing;
    var onForgeClick = forgeVM.onForgeClick;
    var scrapWip = forgeVM.scrapWip;
    var confirmSelect = forgeVM.confirmSelect;
    var attemptForge = forgeVM.attemptForge;
    var doNormalize = forgeVM.doNormalize;
    var takeBreak = forgeVM.takeBreak;
    var resumeWip = forgeVM.resumeWip;
    var scrapWeapon = forgeVM.scrapWeapon;
    var handleAutoFire = forgeVM.handleAutoFire;
    var sessCost = forgeVM.sessCost;

    // --- PlayerVM ---
    var allocateStat = playerVM.allocateStat;
    var xpNeeded = playerVM.xpNeeded;

    // --- EconomyVM ---
    var earnGold = economyVM.earnGold;
    var handleSell = economyVM.handleSell;
    var handleRefuse = economyVM.handleRefuse;
    var removeGoldPop = economyVM.removeGoldPop;
    var onSellMaterial = economyVM.onSellMaterial;

    // --- ShopVM ---
    var onBuy = shopVM.onBuy;
    var onUpgrade = shopVM.onUpgrade;
    var onBuyBP = shopVM.onBuyBP;

    // --- DayVM ---
    var waitHour = dayVM.waitHour;
    var sleep = dayVM.sleep;
    var scavenge = dayVM.scavenge;
    var promote = dayVM.promote;

    // --- Derived ---
    var smithRank = derived.smithRank;
    var nextRank = derived.nextRank;
    var timeColor = derived.timeColor;
    var timeBarPct = derived.timeBarPct;
    var timeBarClass = derived.timeBarClass;
    var totalGoldEarned = derived.totalGoldEarned;

    // --- Callbacks from props ---
    var onActiveToastDone = props.onActiveToastDone;
    var removeToast = props.removeToast;
    var addToast = props.addToast;
    var setGameOver = props.setGameOver;
    var setPendingMystery = props.setPendingMystery;
    var setGoodEventUsed = props.setGoodEventUsed;
    var setStamina = props.setStamina;
    var setSetShowGiveUp = setShowGiveUp;

    // --- Local refs ---
    var EVENTS = props.EVENTS;

    return (
        <>
            {showShop && <ShopModal gold={gold} inv={inv} upgrades={upgrades} unlockedBP={unlockedBP} matDiscount={matDiscount} globalMatMult={globalMatMult} royalQuest={royalQuest} sfx={sfx} onClose={function() { setShowShop(false); }} onBuy={onBuy} onUpgrade={onUpgrade} onBuyBP={onBuyBP} onPromote={function() { promote(); }}
                                    promoteDisabled={input.promote.disabled || stamina <= 0}
                                    promoteUses={promoteUses}
                                    maxPromoteUses={BALANCE.maxPromoteUses}
                                    finishedCount={finished.length} />}
            {showMaterials && <MaterialsModal inv={inv} sfx={sfx} onClose={function() { sfx.click(); setShowMaterials(false); }} onSell={onSellMaterial} />}
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
                    <div style={{ textAlign: "center", marginBottom: 3, position: "relative" }}>
                        <div style={{ fontSize: 12, fontWeight: "bold", color: "#f59e0b", letterSpacing: 3 }}>THE WOBBLY ANVIL</div>
                        <SectionLabel style={{ letterSpacing: 2 }}>ROYAL BLACKSMITH</SectionLabel>
                        <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", lineHeight: 1 }}><div style={{ fontSize: 10, color: "#8a7a64", letterSpacing: 2, textAlign: "right", marginBottom: 2 }}>DAY</div><div style={{ fontSize: 26, color: "#f0e6c8", fontWeight: "bold", lineHeight: 1, textAlign: "right" }}>{day}</div></div>
                    </div>
                    <div style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
                        <div style={{ width: COL_W, flexShrink: 0, marginRight: 8, alignSelf: "stretch", display: "flex" }}>
                            <Tooltip title="SMITH RANK" text="Your rank grows as you earn gold. Sell better weapons for faster progression." below={true}>
                                <div style={{ flex: 1, background: "#0a0704", border: "1px solid #f59e0b44", borderRadius: 8, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: "default", boxSizing: "border-box" }}>
                                    <SectionLabel style={{ marginBottom: 3 }}>SMITH RANK</SectionLabel>
                                    <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: "bold", letterSpacing: 1, lineHeight: 1.3 }}>{smithRank.name.toUpperCase()}</div>
                                    {nextRank && <div style={{ marginTop: 5 }}><div style={{ height: 5, background: "#1a1209", borderRadius: 3, overflow: "hidden", border: "1px solid #2a1f0a" }}><div style={{ height: "100%", background: "#f59e0b", borderRadius: 3, width: Math.round((totalGoldEarned - smithRank.threshold) / (nextRank.threshold - smithRank.threshold) * 100) + "%" }} /></div><SectionLabel style={{ marginTop: 2 }}>NEXT: {nextRank.name.toUpperCase()}</SectionLabel></div>}
                                    {!nextRank && <div style={{ fontSize: 10, color: "#fbbf24", letterSpacing: 1, marginTop: 4 }}>MAX RANK</div>}
                                </div>
                            </Tooltip>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ background: "#0a0704", border: "2px solid " + (royalQuest ? (royalQuest.fulfilled ? "#4ade8066" : "#f59e0b55") : "#2a1f0a"), borderRadius: 8, padding: "8px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 110, maxHeight: 110, overflow: "hidden" }}>
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
<ForgeFireFX active={forgeVM.isForging} />

                            {/* UI LAYER */}
                            <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 4, width: "100%", flex: 1 }}>
                                {forgeBubble && (<div onClick={function(e) { e.stopPropagation(); setForgeBubble(null); }} style={{ position: "absolute", top: "50%", right: 10, transform: "translateY(-50%)", zIndex: 60, background: "#0c0905", border: "3px solid " + forgeBubble.color, borderRadius: 14, padding: "20px 22px", width: 180, boxShadow: "0 8px 28px rgba(0,0,0,0.97)", cursor: "pointer" }}><div style={{ fontSize: 13, color: forgeBubble.color, letterSpacing: 2, fontWeight: "bold", marginBottom: 10 }}>{forgeBubble.title}</div>{forgeBubble.lines.map(function(l, i) { return <div key={i} style={{ fontSize: 14, color: l.color || "#c8b89a", lineHeight: 1.8, fontWeight: l.bold ? "bold" : "normal" }}>{l.text}</div>; })}<div style={{ fontSize: 8, color: "#4a3c2c", marginTop: 8, letterSpacing: 1 }}>CLICK TO DISMISS</div></div>)}

                                {/* FORGE STATS OVERLAY */}
                                {(phase !== PHASES.IDLE && phase !== PHASES.SELECT && phase !== PHASES.SELECT_MAT && qualScore > 0) && (
                                    <Panel style={{ position: "absolute", top: 10, left: 10, width: 160 }}>
                                        <Row style={{ marginBottom: 3 }}><SectionLabel>MATERIAL</SectionLabel><span style={{ fontSize: 14, color: matData.color, fontWeight: "bold" }}>{matData.name}</span></Row>
                                        <Row style={{ marginBottom: 3 }}><SectionLabel>WEAPON</SectionLabel><span style={{ fontSize: 14, color: "#f0e6c8", fontWeight: "bold" }}>{weapon.name}</span></Row>
                                        <Row style={{ marginBottom: 3 }}><SectionLabel>SPEED</SectionLabel><span style={{ fontSize: 12, color: speedColor, fontWeight: "bold" }}>{speedLabel}</span></Row>
                                        <Row style={{ marginBottom: 3 }}><SectionLabel>STRIKES</SectionLabel><span style={{ fontSize: 12, color: strikeColor, fontWeight: "bold" }}>{strikeLabel}</span></Row>
                                        <Row style={{ marginTop: 4 }}><SectionLabel>EFF. DIFF</SectionLabel><span style={{ fontSize: 14, color: diffColor, fontWeight: "bold" }}>{effDiff}{matDiffMod > 0 ? " (+" + matDiffMod + " mat)" : ""}</span></Row>
                                        <Row style={{ marginTop: 4 }}><SectionLabel>QUALITY</SectionLabel><span style={{ fontSize: 14, color: getQualityTier(qualScore).weaponColor, fontWeight: "bold" }}>{getQualityTier(qualScore).label} ({qualScore})</span></Row>
                                        <Bar value={qualScore} max={100} color={getQualityTier(qualScore).weaponColor} h={6} />
                                        <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 4 }}><SectionLabel>STRESS</SectionLabel><Pips count={STRESS_MAX} filled={stress} filledColor={stressColor} size={14} /></div>
                                    </Panel>
                                )}

                                {/* IDLE STATE */}
                                {phase === PHASES.IDLE && !activeCustomer && (
                                    <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 400 }}>
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
                                        </div>
                                    </div>
                                )}

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
                                <div style={{ background: (phase === "heat" || phase === "hammer" || phase === "quench" || phase === "HEAT" || phase === "HAMMER" || phase === "QUENCH") ? "rgba(5, 3, 1, 0.85)" : "transparent", borderRadius: 8, padding: (phase === "heat" || phase === "hammer" || phase === "quench" || phase === "HEAT" || phase === "HAMMER" || phase === "QUENCH") ? "10px 14px" : 0, width: "100%", maxWidth: 500, boxSizing: "border-box", transition: "background 0.3s, padding 0.3s" }}>
                                    <QTEPanel phase={phase} heatWinLo={heatWinLo} heatWinHi={heatWinHi} flash={qteFlash} strikesLeft={strikesLeft} strikesTotal={BALANCE.baseStrikes + bonusStrikes} heatSpeedMult={heatSpeedMult} hammerSpeedMult={hammerSpeedMult} quenchSpeedMult={quenchSpeedMult} posRef={qtePosRef} processingRef={qteProcessing} onAutoFire={handleAutoFire} />
                                </div>

                                {/* SESSION RESULT */}
                                {phase === PHASES.SESS_RESULT && sessResult && (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, width: "60%", marginTop: 4 }}>
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

// ============================================================
// Plugin-style API
// ============================================================
var DesktopLayoutModule = {
    DesktopLayout: DesktopLayout,
};

export default DesktopLayoutModule;