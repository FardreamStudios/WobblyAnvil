// ============================================================
// gamePanels.js — Wobbly Anvil Game Panels Module
// Game-specific panels with light logic: stats, forge info,
// reputation, customer haggling, materials, shop, game over.
// ============================================================

import { useState, useEffect, useRef } from "react";
import GameConstants from "./constants.js";
import GameUtils from "./utilities.js";
import UIComponents from "./uiComponents.js";

var MATS = GameConstants.MATS;
var WEAPONS = GameConstants.WEAPONS;
var TIERS = GameConstants.TIERS;
var STAT_META = GameConstants.STAT_META;
var UPGRADES = GameConstants.UPGRADES;
var UPGRADE_COLORS = GameConstants.UPGRADE_COLORS;
var MOODS = GameConstants.MOODS;
var EPITAPHS = GameConstants.EPITAPHS;
var FAKE_SMITHS = GameConstants.FAKE_SMITHS;

var rand = GameUtils.rand;
var randInt = GameUtils.randInt;
var getQualityTier = GameUtils.getQualityTier;
var qualityValue = GameUtils.qualityValue;
var getSmithRank = GameUtils.getSmithRank;
var getNextRank = GameUtils.getNextRank;

var Panel = UIComponents.Panel;
var Row = UIComponents.Row;
var SectionLabel = UIComponents.SectionLabel;
var InfoRow = UIComponents.InfoRow;
var Badge = UIComponents.Badge;
var Pips = UIComponents.Pips;
var ActionBtn = UIComponents.ActionBtn;
var DangerBtn = UIComponents.DangerBtn;

// --- Stat Panel ---

function StatPanel({ stats, points, onAllocate, sfx, locked }) {
    var [hovered, setHovered] = useState(null);
    return (
        <Panel>
            <Row style={{ marginBottom: 6 }}>
                <SectionLabel color="#f59e0b">STATS</SectionLabel>
                <div style={{ fontSize: 9, color: "#4ade80", background: "#0a2a0a", border: "1px solid #4ade8055", borderRadius: 4, padding: "1px 6px", visibility: points > 0 ? "visible" : "hidden" }}>
                    {points} PT{points > 1 ? "S" : ""}
                </div>
            </Row>
            {Object.entries(stats).map(function(entry) {
                var key = entry[0], value = entry[1];
                var cost = value < 3 ? 1 : value < 6 ? 2 : 3;
                var canAfford = points >= cost;
                return (
                    <div key={key} style={{ marginBottom: 6, position: "relative" }}>
                        <Row onMouseEnter={function() { setHovered(key); }} onMouseLeave={function() { setHovered(null); }} style={{ cursor: "default" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, color: hovered === key ? "#f59e0b" : "#c8b89a", letterSpacing: 1 }}>
                                    {STAT_META[key].label.toUpperCase()}{hovered === key ? " i" : ""}
                                </div>
                                <Pips count={10} filled={value} filledColor="#f59e0b" size={8} />
                            </div>
                            <button
                                onClick={canAfford && !locked ? function() { if (sfx) sfx.click(); onAllocate(key); } : null}
                                style={{
                                    background: "#2a1f0a", border: "1px solid " + (canAfford && !locked ? "#f59e0b" : "#3d2e0f"),
                                    borderRadius: 4, color: canAfford && !locked ? "#f59e0b" : "#4a3c2c",
                                    padding: "2px 7px", fontSize: 9, cursor: canAfford && !locked ? "pointer" : "default",
                                    letterSpacing: 1, fontFamily: "monospace", marginLeft: 6,
                                    visibility: points > 0 && !locked ? "visible" : "hidden",
                                }}
                            >
                                {cost}pt
                            </button>
                        </Row>
                        {hovered === key && (
                            <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 4, background: "#0a0704", border: "1px solid #f59e0b55", borderRadius: 6, padding: "7px 9px", fontSize: 9, color: "#c8b89a", lineHeight: 1.6, zIndex: 99, width: 170, boxShadow: "0 4px 12px rgba(0,0,0,0.9)" }}>
                                <div style={{ color: "#f59e0b", fontWeight: "bold", marginBottom: 3 }}>{STAT_META[key].label.toUpperCase()}</div>
                                {STAT_META[key].desc}
                                <div style={{ marginTop: 4, color: "#8a7a64", fontSize: 8 }}>Current: {value} · Next costs: {cost}pt</div>
                            </div>
                        )}
                    </div>
                );
            })}
        </Panel>
    );
}

// --- Forge Info Panel ---

function ForgeInfoPanel({ upgrades }) {
    return (
        <Panel style={{ flex: 1 }}>
            <SectionLabel color="#f59e0b" style={{ marginBottom: 8 }}>FORGE</SectionLabel>
            {[["anvil", "Anvil"], ["hammer", "Hammer"], ["forge", "Forge"], ["quench", "Quench"], ["furnace", "Furnace"]].map(function(pair) {
                var key = pair[0], label = pair[1];
                var level = upgrades[key];
                var upgrade = UPGRADES[key][level];
                return (
                    <div key={key} style={{ marginBottom: 8 }}>
                        <SectionLabel>{label}</SectionLabel>
                        <div style={{ fontSize: 12, color: UPGRADE_COLORS[level], marginTop: 2 }}>{upgrade.name}</div>
                    </div>
                );
            })}
        </Panel>
    );
}

// --- Reputation Panel ---

function RepPanel({ reputation }) {
    var [hovered, setHovered] = useState(false);
    var color = reputation >= 7 ? "#22c55e" : reputation >= 4 ? "#fb923c" : reputation >= 2 ? "#ef4444" : "#7f1d1d";
    var status = reputation >= 7 ? "Royal Favour" : reputation >= 4 ? "King Grows Wary" : reputation >= 2 ? "Arrest Imminent" : "EXECUTION IMMINENT";
    return (
        <Panel color={color} style={{ position: "relative", cursor: "default" }} onMouseEnter={function() { setHovered(true); }} onMouseLeave={function() { setHovered(false); }}>
            <SectionLabel style={{ marginBottom: 4 }}>REPUTATION {hovered ? "i" : ""}</SectionLabel>
            <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                {Array.from({ length: 10 }).map(function(_, i) {
                    var filled = i < reputation;
                    var pipColor = i < 3 ? "#ef4444" : i < 6 ? "#fb923c" : i < 8 ? "#4ade80" : "#22c55e";
                    return <div key={i} style={{ flex: 1, height: 14, borderRadius: 3, background: filled ? pipColor : "#1a1209", border: "1px solid " + (filled ? pipColor + "88" : "#2a1f0a"), transition: "background 0.2s" }} />;
                })}
            </div>
            <div className={reputation <= 1 ? "blink" : ""} style={{ fontSize: 8, color: color, letterSpacing: 1 }}>{status.toUpperCase()}</div>
            {hovered && (
                <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 4, background: "#0a0704", border: "1px solid #ef444455", borderRadius: 6, padding: "8px 10px", fontSize: 9, color: "#c8b89a", lineHeight: 1.7, zIndex: 99, width: 190, boxShadow: "0 4px 16px rgba(0,0,0,0.95)" }}>
                    <div style={{ color: "#ef4444", fontWeight: "bold", marginBottom: 4 }}>THE KING'S FAVOR</div>
                    <span style={{ color: "#22c55e" }}>7-10</span>: Royal favour<br />
                    <span style={{ color: "#fb923c" }}>4-6</span>: King grows wary<br />
                    <span style={{ color: "#ef4444" }}>2-3</span>: Arrest imminent<br />
                    <span style={{ color: "#7f1d1d" }}>1</span>: Execution imminent<br /><br />
                    <span style={{ color: "#ef4444", fontWeight: "bold" }}>REP 0 = EXECUTED.</span>
                </div>
            )}
        </Panel>
    );
}

// --- Customer Panel (with haggle logic) ---

function CustomerPanel({ customer, weapon, onSell, onRefuse, silverTongue, priceBonus, priceDebuff, sfx }) {
    var shelfValue = weapon.val || qualityValue(weapon.wKey, weapon.matKey || "bronze", weapon.score, { anvil: 0, hammer: 0, forge: 0, quench: 0, furnace: 0 });
    var budgetRef = useRef(Math.round(shelfValue * rand(customer.type.budgetLow, customer.type.budgetHigh)));
    var moodRef = useRef(MOODS[randInt(0, weapon.score >= TIERS[8].scoreMin ? 3 : weapon.score >= TIERS[4].scoreMin ? 2 : 1)]);
    var mood = moodRef.current;
    var maxOffer = Math.round(budgetRef.current * mood.mult * (1 + silverTongue * 0.10) * (priceBonus || 1.0) * (priceDebuff || 1.0));
    var openingOfferRef = useRef(Math.round(maxOffer * rand(0.6, 0.75)));
    var [offer, setOffer] = useState(openingOfferRef.current);
    var step = Math.max(1, Math.floor(shelfValue * 0.05));
    var [myPrice, setMyPrice] = useState(Math.round(shelfValue * 1.5));
    var priceAtOffer = myPrice <= offer;
    var [round, setRound] = useState(0);
    var [msg, setMsg] = useState(customer.type.greet[randInt(0, customer.type.greet.length - 1)]);
    var [done, setDone] = useState(false);
    var [walkedOut, setWalkedOut] = useState(false);
    var qualityTier = getQualityTier(weapon.score);

    function lower() {
        var newPrice = Math.max(offer, myPrice - step);
        setMyPrice(newPrice);
        if (newPrice <= offer) setDone(true);
    }

    function makeOffer() {
        if (done) return;
        var newRound = round + 1;
        setRound(newRound);
        if (myPrice <= maxOffer) {
            setOffer(myPrice); setDone(true); setMsg("...fine. You drive a hard bargain.");
        } else if (newRound >= customer.type.patience) {
            setWalkedOut(true); setMsg("I've had enough. Good day.");
        } else {
            var tooHigh = myPrice > maxOffer * 1.2;
            var impatient = newRound >= customer.type.patience - 1;
            if (tooHigh && impatient) {
                var drop = Math.round(offer * rand(0.10, 0.20));
                var newOffer2 = Math.max(1, offer - drop);
                setOffer(newOffer2); setMsg("You're wasting my time. I'm lowering my offer.");
            } else {
                var bump = Math.round((maxOffer - offer) * rand(0.25, 0.5));
                var newOffer = Math.min(maxOffer, offer + bump);
                setOffer(newOffer);
                setMsg(newOffer >= myPrice ? "Alright, you've got a deal." : bump > step * 2 ? "I can go up a bit. How's that?" : "That's the best I can do.");
                if (newOffer >= myPrice) setDone(true);
            }
        }
    }

    return (
        <div style={{ background: "#0a0704", border: "2px solid " + qualityTier.weaponColor + "66", borderRadius: 12, padding: "20px 24px", marginBottom: 6 }}>
            <Row style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 36, lineHeight: 1 }}>{customer.type.icon}</div>
                    <div>
                        <div style={{ fontSize: 16, color: "#f59e0b", letterSpacing: 2, fontWeight: "bold" }}>{customer.type.name.toUpperCase()}</div>
                        <div style={{ fontSize: 11, color: "#8a7a64", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                            {mood.icon} {mood.label} · <span style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 1 }}>PATIENCE</span>
                            <Pips count={customer.type.patience} filled={customer.type.patience - round} filledColor={walkedOut ? "#ef4444" : round >= customer.type.patience - 1 ? "#fb923c" : "#4ade80"} emptyColor="#2a1f0a" size={10} />
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: "right", background: "#0f0b06", border: "1px solid " + qualityTier.weaponColor + "44", borderRadius: 8, padding: "8px 14px" }}>
                    <SectionLabel style={{ marginBottom: 3 }}>WANTS TO BUY</SectionLabel>
                    <div style={{ fontSize: 14, color: qualityTier.weaponColor, fontWeight: "bold" }}>{qualityTier.label} {(MATS[weapon.matKey] && MATS[weapon.matKey].name) || "Bronze"} {WEAPONS[weapon.wKey] && WEAPONS[weapon.wKey].name}</div>
                </div>
            </Row>
            <div style={{ background: "#141009", border: "1px solid #3d2e0f", borderRadius: 10, padding: "14px 18px", marginBottom: 16, fontSize: 14, color: "#f0e6c8", fontStyle: "italic", lineHeight: 1.6 }}>"{msg}"</div>
            <div style={{ display: "flex", gap: 12, alignItems: "stretch", marginBottom: 16 }}>
                <div style={{ flex: 1, background: "#0a1a0a", border: "1px solid #4ade8033", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                    <SectionLabel style={{ marginBottom: 6 }}>THEIR OFFER</SectionLabel>
                    <div style={{ fontSize: 28, color: "#4ade80", fontWeight: "bold" }}>{offer}g</div>
                </div>
                <div style={{ flex: 1, background: "#1a1209", border: "1px solid #f59e0b33", borderRadius: 8, padding: "12px 16px", textAlign: "center" }}>
                    <SectionLabel style={{ marginBottom: 6 }}>YOUR PRICE</SectionLabel>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <button onClick={function() { if (!done) lower(); }} disabled={done || priceAtOffer} style={{ background: "#2a1f0a", border: "1px solid " + (done || priceAtOffer ? "#3d2e0f" : "#f59e0b"), borderRadius: 4, color: done || priceAtOffer ? "#4a3c2c" : "#f59e0b", width: 28, height: 28, fontSize: 16, cursor: done || priceAtOffer ? "not-allowed" : "pointer", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                        <span style={{ fontSize: 28, color: "#f59e0b", fontWeight: "bold", minWidth: 60, textAlign: "center" }}>{myPrice}g</span>
                    </div>
                </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                <button onClick={function() { onSell(offer); }} disabled={offer <= 0} style={{ flex: 2, background: offer <= 0 ? "#0a0704" : "#0a1a0a", border: "2px solid " + (offer <= 0 ? "#2a1f0a" : "#4ade80"), borderRadius: 8, color: offer <= 0 ? "#4a3c2c" : "#4ade80", padding: "12px 0", fontSize: 14, cursor: offer <= 0 ? "not-allowed" : "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Accept {offer}g</button>
                <button onClick={function() { if (!done && !walkedOut) { sfx.click(); makeOffer(); } }} disabled={done || walkedOut} style={{ flex: 2, background: done || walkedOut ? "#0a0704" : "#1a1209", border: "2px solid " + (done || walkedOut ? "#2a1f0a" : "#f59e0b"), borderRadius: 8, color: done || walkedOut ? "#4a3c2c" : "#f59e0b", padding: "12px 0", fontSize: 14, cursor: done || walkedOut ? "not-allowed" : "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Offer {myPrice}g</button>
                <button onClick={function() { sfx.click(); onRefuse(); }} style={{ flex: 1, background: "#1a0505", border: "2px solid #ef444466", borderRadius: 8, color: "#ef4444", padding: "12px 0", fontSize: 14, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>Decline</button>
            </div>
        </div>
    );
}

// --- Materials Modal ---

function MaterialsModal({ inv, onClose, onSell, sfx }) {
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: "#0f0b06", border: "1px solid #3d2e0f", borderRadius: 12, padding: "20px", width: "min(500px,90vw)" }}>
                <Row style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 16, color: "#f59e0b", letterSpacing: 3 }}>MATERIALS</div>
                    <button onClick={onClose} style={{ background: "#2a1f0a", border: "1px solid #3d2e0f", borderRadius: 5, color: "#f59e0b", padding: "5px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: 14 }}>X</button>
                </Row>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {Object.entries(MATS).map(function(entry) {
                        var key = entry[0], mat = entry[1], qty = inv[key] || 0, sellPrice = Math.floor(mat.price / 2);
                        return (
                            <div key={key} style={{ background: "#1a1209", border: "1px solid " + (qty > 0 ? mat.color + "66" : "#2a1f0a"), borderRadius: 8, padding: "10px 12px" }}>
                                <div style={{ fontSize: 11, color: mat.color, fontWeight: "bold", letterSpacing: 1, marginBottom: 6 }}>{mat.name.toUpperCase()}</div>
                                <div style={{ fontSize: 26, color: qty > 0 ? "#f0e6c8" : "#2a1f0a", fontWeight: "bold", lineHeight: 1, marginBottom: 6, textAlign: "center" }}>{qty}</div>
                                {qty > 0 && <ActionBtn onClick={function() { if (sfx) sfx.click(); onSell(key, 1); }} small={true} style={{ width: "100%", textAlign: "center" }}>Sell {sellPrice}g</ActionBtn>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// --- Shop Modal ---

function ShopModal({ gold, inv, upgrades, unlockedBP, matDiscount, globalMatMult, royalQuest, onBuy, onUpgrade, onBuyBP, onClose, sfx }) {
    var [tab, setTab] = useState("materials");
    var [amounts, setAmounts] = useState(Object.fromEntries(Object.keys(MATS).map(function(k) { return [k, 1]; })));
    var matPrices = Object.fromEntries(Object.entries(MATS).map(function(entry) {
        var key = entry[0], basePrice = MATS[key].price;
        var price = matDiscount && matDiscount.key === key ? Math.round(basePrice * matDiscount.mult) : basePrice;
        price = Math.round(price * (globalMatMult || 1.0));
        return [key, price];
    }));
    var tierColors = ["#a0a0a0", "#60a5fa", "#4ade80", "#c084fc"];

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: "#0f0b06", border: "1px solid #3d2e0f", borderRadius: 12, width: "min(680px,95vw)", height: "min(560px,85vh)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Row style={{ padding: "16px 20px", borderBottom: "1px solid #2a1f0a" }}>
                    <div style={{ fontSize: 18, color: "#f59e0b", letterSpacing: 3 }}>MARKET</div>
                    <Row style={{ gap: 8 }}>
                        <span style={{ fontSize: 16, color: "#f59e0b", fontWeight: "bold" }}>{gold}g</span>
                        <button onClick={function() { if (sfx) sfx.click(); onClose(); }} style={{ background: "#2a1f0a", border: "1px solid #3d2e0f", borderRadius: 5, color: "#f59e0b", padding: "5px 12px", cursor: "pointer", fontFamily: "monospace", fontSize: 14 }}>X</button>
                    </Row>
                </Row>
                <div style={{ display: "flex", borderBottom: "1px solid #2a1f0a" }}>
                    {[["materials", "Materials"], ["blueprints", "Blueprints"], ["upgrades", "Upgrades"]].map(function(pair) {
                        var key = pair[0], label = pair[1];
                        return <div key={key} onClick={function() { if (sfx) sfx.click(); setTab(key); }} style={{ flex: 1, padding: "12px", textAlign: "center", fontSize: 13, letterSpacing: 2, cursor: "pointer", color: tab === key ? "#f59e0b" : "#8a7a64", borderBottom: tab === key ? "3px solid #f59e0b" : "3px solid transparent" }}>{label.toUpperCase()}</div>;
                    })}
                </div>
                <div style={{ overflowY: "auto", padding: "16px 18px", flex: 1 }}>
                    {tab === "materials" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {Object.entries(MATS).map(function(entry) {
                                var key = entry[0], mat = entry[1], price = matPrices[key];
                                var isDiscounted = matDiscount && matDiscount.key === key && matDiscount.mult < 1;
                                var maxAfford = Math.floor(gold / price);
                                return (
                                    <Panel key={key} style={{ padding: "12px 14px" }}>
                                        <Row>
                                            <div>
                                                <div style={{ fontSize: 13, color: mat.color, letterSpacing: 1, fontWeight: "bold", marginBottom: 3 }}>
                                                    {mat.name.toUpperCase()}{isDiscounted && <span style={{ fontSize: 10, color: "#4ade80", marginLeft: 8 }}>DISCOUNTED</span>}
                                                </div>
                                                <div style={{ fontSize: 18, color: "#f0e6c8", fontWeight: "bold" }}>{inv[key] || 0} <span style={{ fontSize: 11, color: "#5a4a38", fontWeight: "normal" }}>owned</span></div>
                                            </div>
                                            <Row style={{ gap: 6 }}>
                                                <button onClick={function() { sfx.click(); setAmounts(function(a) { var n = Object.assign({}, a); n[key] = Math.max(1, a[key] - 1); return n; }); }} style={{ background: "#2a1f0a", border: "2px solid #f59e0b", borderRadius: 6, color: "#f59e0b", width: 28, height: 28, fontSize: 16, cursor: "pointer", fontFamily: "monospace", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                                                <span style={{ fontSize: 15, color: "#f59e0b", width: 28, textAlign: "center", fontWeight: "bold", display: "inline-block" }}>{amounts[key]}</span>
                                                <button onClick={function() { sfx.click(); setAmounts(function(a) { var n = Object.assign({}, a); n[key] = Math.min(Math.max(1, maxAfford), a[key] + 1); return n; }); }} style={{ background: "#2a1f0a", border: "2px solid #f59e0b", borderRadius: 6, color: "#f59e0b", width: 28, height: 28, fontSize: 16, cursor: "pointer", fontFamily: "monospace", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                                                <ActionBtn onClick={function() { onBuy(key, amounts[key], price); }} disabled={gold < price || maxAfford === 0} style={{ width: 90, textAlign: "center" }} small={true}>Buy {price * amounts[key]}g</ActionBtn>
                                            </Row>
                                        </Row>
                                    </Panel>
                                );
                            })}
                        </div>
                    )}
                    {tab === "blueprints" && (
                        <div>
                            {[1, 2, 3, 4].map(function(tier) {
                                return (
                                    <div key={tier} style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: tierColors[tier - 1], letterSpacing: 2, marginBottom: 8, borderBottom: "1px solid " + tierColors[tier - 1] + "33", paddingBottom: 6 }}>TIER {tier}</div>
                                        {Object.entries(WEAPONS).filter(function(e) { return e[1].tier === tier; }).map(function(entry) {
                                            var key = entry[0], weapon = entry[1];
                                            var owned = unlockedBP.includes(key);
                                            var bpCost = weapon.blueprintCost;
                                            var diffColor = weapon.difficulty <= 2 ? "#a0a0a0" : weapon.difficulty <= 4 ? "#4ade80" : weapon.difficulty <= 6 ? "#60a5fa" : weapon.difficulty <= 7 ? "#818cf8" : weapon.difficulty <= 8 ? "#fbbf24" : "#ef4444";
                                            return (
                                                <Panel key={key} color={owned ? "#4ade80" : null} style={{ marginBottom: 8, padding: "12px 14px" }}>
                                                    <Row>
                                                        <Row style={{ gap: 10, flex: 1, alignItems: "center", justifyContent: "flex-start" }}>
                                                            <Badge value={weapon.difficulty} label="DIFF" color={diffColor} />
                                                            <div>
                                                                <div style={{ fontSize: 13, color: owned ? "#4ade80" : "#f0e6c8", letterSpacing: 1, fontWeight: "bold", marginBottom: 4 }}>
                                                                    {weapon.name.toUpperCase()}
                                                                    {royalQuest && !royalQuest.fulfilled && royalQuest.weaponKey === key && <span style={{ fontSize: 11, background: "#f59e0b", color: "#0a0704", borderRadius: 4, padding: "1px 6px", fontWeight: "bold", marginLeft: 6 }}>QUEST</span>}
                                                                </div>
                                                                <Row style={{ gap: 8 }}><SectionLabel>{weapon.materialCost} mat</SectionLabel></Row>
                                                            </div>
                                                        </Row>
                                                        {owned ? <span style={{ fontSize: 14, color: "#4ade80" }}>OWNED</span> : <ActionBtn onClick={function() { onBuyBP(key, bpCost); }} disabled={gold < bpCost} small={true}>{bpCost}g</ActionBtn>}
                                                    </Row>
                                                </Panel>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {tab === "upgrades" && (
                        <div>
                            {[["forge", "Forge - Heat QTE Speed"], ["anvil", "Anvil - Hammer QTE Speed"], ["hammer", "Hammer - Strike Multiplier"], ["quench", "Quench - Quench QTE Speed"], ["furnace", "Furnace - Normalize Penalty"]].map(function(pair) {
                                var category = pair[0], label = pair[1];
                                var currentLevel = upgrades[category];
                                var chain = UPGRADES[category];
                                return (
                                    <div key={category} style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: "#f59e0b", letterSpacing: 2, marginBottom: 8, borderBottom: "1px solid #2a1f0a", paddingBottom: 6 }}>{label.toUpperCase()}</div>
                                        {chain.map(function(upgrade, index) {
                                            var owned = index <= currentLevel;
                                            var next = index === currentLevel + 1;
                                            var locked = index > currentLevel + 1;
                                            return (
                                                <Panel key={index} color={owned ? "#4ade80" : next ? "#f59e0b" : null} style={{ marginBottom: 6, opacity: locked ? 0.4 : 1, padding: "12px 14px" }}>
                                                    <Row>
                                                        <div>
                                                            <div style={{ fontSize: 13, color: owned ? "#4ade80" : next ? "#f0e6c8" : "#8a7a64", letterSpacing: 1, fontWeight: "bold" }}>{upgrade.name.toUpperCase()}</div>
                                                            <div style={{ fontSize: 11, color: "#8a7a64", marginTop: 3 }}>{upgrade.desc}</div>
                                                        </div>
                                                        {owned && index > 0 && <span style={{ fontSize: 14, color: "#4ade80" }}>OK</span>}
                                                        {index === 0 && <SectionLabel>BASE</SectionLabel>}
                                                        {next && <ActionBtn onClick={function() { onUpgrade(category); }} disabled={gold < upgrade.cost} small={true}>{upgrade.cost}g</ActionBtn>}
                                                        {locked && <SectionLabel color="#3d2e0f">LOCKED</SectionLabel>}
                                                    </Row>
                                                </Panel>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Game Over Screen ---

function GameOverScreen({ day, gold, totalGoldEarned, onReset }) {
    var rank = getSmithRank(totalGoldEarned);
    var next = getNextRank(totalGoldEarned);
    var rankPercent = next ? Math.round((totalGoldEarned - rank.threshold) / (next.threshold - rank.threshold) * 100) : 100;
    var playerEntry = { name: "You", gold: totalGoldEarned, isPlayer: true };
    var merged = FAKE_SMITHS.concat([playerEntry]).sort(function(a, b) { return b.gold - a.gold; });
    var top10 = merged.slice(0, 10);
    var playerPlaced = top10.some(function(e) { return e.isPlayer; });

    return (
        <div style={{ width: "100%", minHeight: "100vh", background: "#0a0704", display: "flex", alignItems: "flex-start", justifyContent: "center", fontFamily: "monospace", overflowY: "auto" }}>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: "min(780px,96vw)", padding: "32px 16px 40px" }}>
                <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 12 }}>{"\uD83D\uDC80"}</div>
                <SectionLabel color="#ef444466" style={{ fontSize: 11, letterSpacing: 6, marginBottom: 6 }}>BY ORDER OF THE CROWN</SectionLabel>
                <div style={{ fontSize: 38, color: "#ef4444", fontWeight: "bold", letterSpacing: 5, marginBottom: 4 }}>EXECUTED</div>
                <SectionLabel style={{ letterSpacing: 3, marginBottom: 28 }}>THE KING HAS LOST HIS PATIENCE</SectionLabel>
                <div style={{ width: "100%", display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 20 }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                        <Panel color="#f59e0b" style={{ padding: "18px 20px" }}>
                            <SectionLabel color="#8a7a64" style={{ letterSpacing: 3, marginBottom: 6 }}>FINAL SMITH RANK</SectionLabel>
                            <div style={{ fontSize: 22, color: "#fbbf24", fontWeight: "bold", letterSpacing: 2, marginBottom: 4 }}>{rank.name.toUpperCase()}</div>
                            <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 10 }}>Total earned: <span style={{ fontWeight: "bold", color: "#fbbf24" }}>{totalGoldEarned}g</span></div>
                            {next ? (
                                <>
                                    <div style={{ height: 8, background: "#1a1209", borderRadius: 4, overflow: "hidden", border: "1px solid #2a1f0a", marginBottom: 4 }}>
                                        <div style={{ height: "100%", width: rankPercent + "%", background: "linear-gradient(90deg,#f59e0b,#fbbf24)", borderRadius: 4 }} />
                                    </div>
                                    <SectionLabel>{rankPercent}% toward {next.name.toUpperCase()}</SectionLabel>
                                </>
                            ) : (
                                <div style={{ fontSize: 11, color: "#fbbf24", letterSpacing: 2 }}>LEGENDARY STATUS ACHIEVED</div>
                            )}
                        </Panel>
                        <Panel style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                            {[["DAYS SURVIVED", day, "#f59e0b"], ["GOLD ON HAND", gold + "g", "#fbbf24"], ["TOTAL GOLD EARNED", totalGoldEarned + "g", "#4ade80"]].map(function(row) {
                                return <div key={row[0]} style={{ borderBottom: "1px solid #1a1209", paddingBottom: 8 }}><InfoRow label={row[0]} value={row[1]} color={row[2]} /></div>;
                            })}
                            <InfoRow label="EPITAPH" color="#c8b89a" valueStyle={{ fontStyle: "italic", fontSize: 10, maxWidth: 180, textAlign: "right" }} value={(EPITAPHS.find(function(e) { return totalGoldEarned >= e.threshold; }) || EPITAPHS[EPITAPHS.length - 1]).text} />
                        </Panel>
                    </div>
                    <Panel style={{ flex: 1, padding: "14px 16px" }}>
                        <SectionLabel color="#f59e0b" style={{ letterSpacing: 3, marginBottom: 12 }}>HALL OF SMITHS</SectionLabel>
                        {top10.map(function(entry, i) {
                            var isPlayer = entry.isPlayer;
                            var entryRank = getSmithRank(entry.gold);
                            var medalColor = i === 0 ? "#fbbf24" : i === 1 ? "#a0a0a0" : i === 2 ? "#fb923c" : "#3d2e0f";
                            return (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: isPlayer ? "#1a1500" : "#0a0704", border: "1px solid " + (isPlayer ? "#f59e0b" : "#2a1f0a"), borderRadius: 7, padding: "7px 10px", marginBottom: 5 }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 4, background: medalColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold", color: i < 3 ? "#0a0704" : "#8a7a64", flexShrink: 0 }}>{i + 1}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, color: isPlayer ? "#fbbf24" : "#f0e6c8", fontWeight: isPlayer ? "bold" : "normal", letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isPlayer ? "YOU" : entry.name}</div>
                                        <SectionLabel>{entryRank.name}</SectionLabel>
                                    </div>
                                    <div style={{ fontSize: 13, color: isPlayer ? "#fbbf24" : "#f59e0b", fontWeight: "bold", flexShrink: 0 }}>{entry.gold.toLocaleString()}g</div>
                                </div>
                            );
                        })}
                        {!playerPlaced && (
                            <div style={{ marginTop: 8, borderTop: "1px solid #2a1f0a", paddingTop: 8 }}>
                                <SectionLabel style={{ marginBottom: 5, textAlign: "center" }}>YOUR RUN</SectionLabel>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a1500", border: "1px solid #f59e0b", borderRadius: 7, padding: "7px 10px" }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#2a1f0a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: "bold", color: "#8a7a64", flexShrink: 0 }}>{merged.findIndex(function(e) { return e.isPlayer; }) + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, color: "#fbbf24", fontWeight: "bold", letterSpacing: 1 }}>YOU</div>
                                        <SectionLabel color="#f59e0b">{rank.name}</SectionLabel>
                                    </div>
                                    <div style={{ fontSize: 13, color: "#fbbf24", fontWeight: "bold" }}>{totalGoldEarned.toLocaleString()}g</div>
                                </div>
                            </div>
                        )}
                    </Panel>
                </div>
                <DangerBtn onClick={onReset}>Try Again</DangerBtn>
            </div>
        </div>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var GamePanels = {
    StatPanel: StatPanel,
    ForgeInfoPanel: ForgeInfoPanel,
    RepPanel: RepPanel,
    CustomerPanel: CustomerPanel,
    MaterialsModal: MaterialsModal,
    ShopModal: ShopModal,
    GameOverScreen: GameOverScreen,
};

export default GamePanels;