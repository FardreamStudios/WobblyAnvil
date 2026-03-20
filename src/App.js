import { useState, useEffect, useRef, useCallback } from "react";

var QTE_COLS=42,QTE_FLASH_MS=700,QTE_W=480,COL_W=170,STRESS_MAX=3,HAMMER_WIN=10,QUENCH_WIN=10;
var PRESSURE_PER_DAY=0.7,MAX_PRESSURE=15,PRESSURE_SPIKE_CHANCE=0.25,PRESSURE_SPIKE_MAX=2;
var WAKE_HOUR=8,BASE_DAILY_CUSTOMERS=2,STARTING_GOLD=250,BASE_STAMINA=5,MAT_DESTROY_RECOVERY=0.5,MAT_SCRAP_RECOVERY=0.25,REST_HOUR_LIMIT=99,MAX_HOUR=30;

var HEAT_TIERS=[
  {id:"perfect",label:"PERFECT HEAT",bonusStrikes:2,color:"#fbbf24"},
  {id:"good",   label:"GOOD HEAT",   bonusStrikes:1,color:"#4ade80"},
  {id:"warm",   label:"WARM HEAT",   bonusStrikes:0,color:"#fbbf24"},
  {id:"poor",   label:"POOR HEAT",   bonusStrikes:0,color:"#f87171"},
  {id:"over",   label:"OVERHEAT!",   bonusStrikes:0,color:"#fb923c"},
];
var HAMMER_TIERS=[
  {label:"PERFECT!",sfxKey:"perfect",pctOfHalf:0.15,pts:12},
  {label:"GREAT",   sfxKey:"great",  pctOfHalf:0.45,pts:8},
  {label:"GOOD",    sfxKey:"good",   pctOfHalf:1.0, pts:5},
  {label:"MISS",    sfxKey:"miss",   pctOfHalf:999, pts:-5},
];
var PHASES={IDLE:"idle",SELECT:"select",SELECT_MAT:"select_mat",HEAT:"heat",HAMMER:"hammer",SESS_RESULT:"sess_result",QUENCH:"quench"};
var SMITH_RANKS=[
  {name:"Apprentice Smith",threshold:0},{name:"Journeyman Smith",threshold:150},
  {name:"Skilled Smith",threshold:400},{name:"Artisan Smith",threshold:900},
  {name:"Expert Smith",threshold:2000},{name:"Master Smith",threshold:4000},
  {name:"Grand Master Smith",threshold:8000},{name:"Legendary Smith I",threshold:15000},
  {name:"Legendary Smith II",threshold:25000},{name:"Legendary Smith III",threshold:40000},
  {name:"Legendary Smith IV",threshold:60000},{name:"Legendary Smith V",threshold:90000},
];
var TIERS=[
  {label:"Scrap",      scoreMin:0,   scoreMax:10,  color:"#a0a0a0", weaponColor:"#a0a0a0", valueMultiplier:0.1, qualityGainRate:1.0,  reputationReward:1, reputationPenalty:1, xpMultiplier:0.5},
  {label:"Rubbish",    scoreMin:11,  scoreMax:20,  color:"#4ade80", weaponColor:"#a0a0a0", valueMultiplier:0.5, qualityGainRate:0.95, reputationReward:1, reputationPenalty:1, xpMultiplier:0.8},
  {label:"Poor",       scoreMin:21,  scoreMax:35,  color:"#60a5fa", weaponColor:"#a0a0a0", valueMultiplier:1.0, qualityGainRate:0.90, reputationReward:1, reputationPenalty:1, xpMultiplier:1.0},
  {label:"Common",     scoreMin:40,  scoreMax:55,  color:"#d8b4fe", weaponColor:"#4ade80", valueMultiplier:1.5, qualityGainRate:0.80, reputationReward:1, reputationPenalty:1, xpMultiplier:1.5},
  {label:"Fine",       scoreMin:60,  scoreMax:70,  color:"#7c3aed", weaponColor:"#60a5fa", valueMultiplier:2.2, qualityGainRate:0.60, reputationReward:2, reputationPenalty:2, xpMultiplier:2.0},
  {label:"Refined",    scoreMin:74,  scoreMax:82,  color:"#facc15", weaponColor:"#7c3aed", valueMultiplier:3.0, qualityGainRate:0.35, reputationReward:2, reputationPenalty:2, xpMultiplier:2.5},
  {label:"Masterwork", scoreMin:83,  scoreMax:92,  color:"#f97316", weaponColor:"#facc15", valueMultiplier:3.8, qualityGainRate:0.18, reputationReward:3, reputationPenalty:3, xpMultiplier:3.5},
  {label:"Legendary",  scoreMin:93,  scoreMax:98,  color:"#ef4444", weaponColor:"#ef4444", valueMultiplier:4.5, qualityGainRate:0.12, reputationReward:3, reputationPenalty:3, xpMultiplier:4.5},
  {label:"Mythic",     scoreMin:99,  scoreMax:100, color:"#00ffe5", weaponColor:"#00ffe5", valueMultiplier:5.0, qualityGainRate:0.08, reputationReward:4, reputationPenalty:4, xpMultiplier:6.0},
];
var WEAPONS={
  dagger:    {name:"Dagger",    difficulty:1,matCost:2,unitVal:15, tier:1,bpCost:30,priceBonus:0},
  shortsword:{name:"Shortsword",difficulty:2,matCost:3,unitVal:20, tier:1,bpCost:30,priceBonus:0},
  axe:       {name:"Axe",       difficulty:2,matCost:3,unitVal:22, tier:1,bpCost:30,priceBonus:5},
  mace:      {name:"Mace",      difficulty:3,matCost:3,unitVal:28, tier:1,bpCost:30,priceBonus:10},
  sword:     {name:"Sword",     difficulty:3,matCost:4,unitVal:30, tier:2,bpCost:120,priceBonus:5},
  cutlass:   {name:"Cutlass",   difficulty:3,matCost:4,unitVal:32, tier:2,bpCost:120,priceBonus:10},
  rapier:    {name:"Rapier",    difficulty:4,matCost:4,unitVal:40, tier:2,bpCost:120,priceBonus:15},
  scimitar:  {name:"Scimitar",  difficulty:4,matCost:4,unitVal:38, tier:2,bpCost:120,priceBonus:20},
  broadsword:{name:"Broadsword",difficulty:5,matCost:5,unitVal:48, tier:3,bpCost:300,priceBonus:15},
  battleaxe: {name:"Battle Axe",difficulty:5,matCost:5,unitVal:45, tier:3,bpCost:300,priceBonus:20},
  warhammer: {name:"War Hammer",difficulty:6,matCost:5,unitVal:55, tier:3,bpCost:300,priceBonus:25},
  longsword: {name:"Longsword", difficulty:6,matCost:6,unitVal:58, tier:3,bpCost:300,priceBonus:20},
  halberd:   {name:"Halberd",   difficulty:7,matCost:7,unitVal:68, tier:4,bpCost:1000,priceBonus:15},
  greatsword:{name:"Greatsword",difficulty:7,matCost:8,unitVal:72, tier:4,bpCost:1000,priceBonus:10},
  greataxe:  {name:"Great Axe", difficulty:8,matCost:8,unitVal:85, tier:4,bpCost:1000,priceBonus:15},
  katana:    {name:"Katana",    difficulty:9,matCost:6,unitVal:100,tier:4,bpCost:1000,priceBonus:40},
};
var MATS={
  bronze:    {name:"Bronze",    price:5,  color:"#a0a0a0",valMult:0.6,label:"Common",   diffMod:-1},
  iron:      {name:"Iron",      price:10, color:"#a0a0a0",valMult:1.0,label:"Common",   diffMod:0},
  steel:     {name:"Steel",     price:20, color:"#4ade80",valMult:2.0,label:"Uncommon", diffMod:1},
  damascus:  {name:"Damascus",  price:32, color:"#60a5fa",valMult:3.0,label:"Rare",     diffMod:2},
  titanium:  {name:"Titanium",  price:45, color:"#60a5fa",valMult:3.5,label:"Rare",     diffMod:3},
  iridium:   {name:"Iridium",   price:55, color:"#818cf8",valMult:4.5,label:"Very Rare",diffMod:4},
  tungsten:  {name:"Tungsten",  price:70, color:"#818cf8",valMult:5.5,label:"Very Rare",diffMod:5},
  mithril:   {name:"Mithril",   price:90, color:"#fbbf24",valMult:6.5,label:"Legendary",diffMod:6},
  orichalcum:{name:"Orichalcum",price:120,color:"#ef4444",valMult:8.0,label:"Mythic",   diffMod:8},
};
var UPGRADE_COLORS=["#a0a0a0","#4ade80","#60a5fa","#818cf8","#d8b4fe","#facc15","#f97316","#ef4444","#00ffe5"];
var STATS_DEF={brawn:0,precision:0,technique:0,silverTongue:0};
var STAT_META={
  brawn:       {label:"Brawn",        desc:"Each point adds +1 max stamina."},
  precision:   {label:"Precision",    desc:"Slows needle in all QTEs. Stacks with forge/anvil/quench upgrade bonuses."},
  technique:   {label:"Technique",    desc:"Increases hammer strike points. Stacks with hammer upgrade bonus."},
  silverTongue:{label:"Silver Tongue",desc:"Each point raises the customer's maximum offer by 10%."},
};
var UPGRADES={
  anvil:[
    {name:"Basic Anvil",     cost:0,   desc:"No hammering QTE speed bonus."},
    {name:"Reinforced Anvil",cost:80,  desc:"+1 hammering QTE speed bonus."},
    {name:"Master's Anvil",  cost:600, desc:"+2 hammering QTE speed bonus."},
    {name:"Legendary Anvil", cost:3000,desc:"+3 hammering QTE speed bonus."},
  ],
  hammer:[
    {name:"Iron Hammer",    cost:0,   desc:"No strike multiplier bonus."},
    {name:"Steel Hammer",   cost:100, desc:"+1 strike multiplier bonus."},
    {name:"Balanced Hammer",cost:700, desc:"+2 strike multiplier bonus."},
    {name:"Master's Hammer",cost:3500,desc:"+3 strike multiplier bonus."},
  ],
  forge:[
    {name:"Clay Forge",  cost:0,   desc:"No heating QTE speed bonus."},
    {name:"Stone Forge", cost:90,  desc:"+1 heating QTE speed bonus."},
    {name:"Brick Forge", cost:650, desc:"+2 heating QTE speed bonus."},
    {name:"Dragon Forge",cost:3200,desc:"+3 heating QTE speed bonus."},
  ],
  quench:[
    {name:"Water Bucket",cost:0,   desc:"No quenching QTE speed bonus."},
    {name:"Oil Bath",    cost:120, desc:"+1 quenching QTE speed bonus."},
    {name:"Large Tank",  cost:800, desc:"+2 quenching QTE speed bonus."},
    {name:"Cryo Chamber",cost:4000,desc:"+3 quenching QTE speed bonus."},
  ],
  furnace:[
    {name:"Clay Furnace",        cost:0,      desc:"Normalize loss: 18-28%."},
    {name:"Stone Furnace",       cost:80,     desc:"Normalize loss: 16-25%."},
    {name:"Brick Furnace",       cost:600,    desc:"Normalize loss: 14-22%."},
    {name:"Iron Furnace",        cost:3000,   desc:"Normalize loss: 12-19%."},
    {name:"Steel Furnace",       cost:8000,   desc:"Normalize loss: 11-17%."},
    {name:"Obsidian Furnace",    cost:18000,  desc:"Normalize loss: 10-15%."},
    {name:"Runic Furnace",       cost:35000,  desc:"Normalize loss: 9-13%."},
    {name:"Dragonstone Furnace", cost:65000,  desc:"Normalize loss: 8-11%."},
    {name:"Eternal Furnace",     cost:110000, desc:"Normalize loss: 7-9%."},
  ],
};
var _tFine=TIERS.find(function(t){return t.label==="Fine";}).scoreMin;
var _tPoor=TIERS.find(function(t){return t.label==="Poor";}).scoreMin;
var _tRefined=TIERS.find(function(t){return t.label==="Refined";}).scoreMin;
var CUST_TYPES=[
  {id:"adventurer",name:"Nervous Adventurer",icon:"⚔",minQ:0,       bLo:0.55,bHi:0.75, pat:4,greet:["First dungeon tomorrow.","Something pointy please.","Any payment plans?"]},
  {id:"wizard",    name:"Arcane Wizard",     icon:"🧙",minQ:_tFine,  bLo:1.0, bHi:1.30, pat:3,greet:["I require only the finest.","Ordinary steel bores me.","Impress me, smith."]},
  {id:"knight",    name:"Town Knight",       icon:"🛡",minQ:0,       bLo:0.80,bHi:1.05, pat:4,greet:["Something befitting a knight.","Polish matters as much as edge.","Make it worthy."]},
  {id:"goblin",    name:"Goblin Merchant",   icon:"👺",minQ:0,       bLo:0.40,bHi:0.55, pat:2,greet:["Goblin pay fair. Maybe.","Goblin not picky.","You sell, goblin buy."]},
  {id:"guard",     name:"Town Guard",        icon:"🏰",minQ:0,       bLo:0.65,bHi:0.85, pat:3,greet:["Won't break on me, right?","Budget's tight this month.","Just needs to be reliable."]},
  {id:"noble",     name:"Visiting Noble",    icon:"👑",minQ:_tFine,  bLo:1.10,bHi:1.45, pat:2,greet:["I hear you supply the crown.","Only the finest will do.","Quality above all else."]},
  {id:"bounty",    name:"Bounty Hunter",     icon:"🏹",minQ:0,       bLo:0.85,bHi:1.10, pat:3,greet:["Make it quick, I'm on a contract.","Needs to hold up in a fight.","No frills, just reliable."]},
  {id:"courier",   name:"Royal Courier",     icon:"📯",minQ:_tRefined,bLo:1.30,bHi:1.70, pat:2,greet:["The crown expects nothing but the best.","I have coin. Do you have quality?","Impress me or I ride on."]},
  {id:"merchant",  name:"Traveling Merchant",icon:"🧳",minQ:0,       bLo:0.70,bHi:0.90, pat:4,greet:["I've bought blades in a dozen cities.","I can wait. I'm patient.","Let's find a number we both like."]},
  {id:"dwarf",     name:"Dwarven Smith",     icon:"⛏️",minQ:_tPoor,  bLo:0.90,bHi:1.15, pat:4,greet:["Decent work. For a human.","I know my craft. Don't try to fool me.","I'll pay fair for fair quality."]},
  {id:"pirate",    name:"Pirate",            icon:"🏴‍☠️",minQ:0,       bLo:0.75,bHi:1.0,  pat:3,greet:["Arrr, I need something fierce.","Don't cross me on price, smith.","Make it sharp and we'll get along."]},
  {id:"elf",       name:"Elven Ranger",      icon:"🧝",minQ:_tFine,  bLo:0.95,bHi:1.25, pat:3,greet:["Craftsmanship matters more than price.","I've carried the same blade for a century.","This had better be worth the trip."]},
];
var MOODS=[
  {label:"Generous", icon:"😊",mult:1.0},{label:"Neutral",  icon:"😐",mult:0.8},
  {label:"Impatient",icon:"😤",mult:0.6},{label:"Impressed",icon:"🤩",mult:1.25},
];
var ROYAL_NAMES=["The King's Steward","Lord Commander Aldric","Royal Armourer","Queen's Champion","The High Marshal","Crown Treasurer","Grand Inquisitor"];
var TAG_COLORS={HAZARD:"#ef4444",EVENT:"#c084fc",MARKET:"#4ade80",MERCHANT:"#fbbf24",QUIET:"#8a7a64"};
var EPITAPHS=[
  {threshold:75000, text:"A legend for the ages. The king had him killed out of jealousy."},
  {threshold:40000, text:"The finest blade in the kingdom. Shame about the politics."},
  {threshold:20000, text:"Forged steel that outlasted kings. The king did not appreciate the irony."},
  {threshold:10000, text:"A master smith. Died as he lived — owing the crown nothing."},
  {threshold:4000,  text:"Good with a hammer. Less good with royalty."},
  {threshold:1500,  text:"Showed real promise. The headsman showed up first."},
  {threshold:500,   text:"Made a few decent blades. The rats got the rest."},
  {threshold:100,   text:"Barely had time to light the forge."},
  {threshold:0,     text:"The anvil was wobbly. So was the plan."},
];
var FAKE_SMITHS=[
  {name:"Aldric the Undying",   gold:91200},{name:"Marta Ironforge",    gold:63400},
  {name:"The Silent Hammer",    gold:41800},{name:"Brother Caius",       gold:27600},
  {name:"Lady Vex of the North",gold:16900},{name:"Gorm Splitstone",     gold:8800},
  {name:"Thessaly Bright",      gold:4300}, {name:"One-Arm Dunric",      gold:2100},
  {name:"Young Pip",            gold:890},  {name:"The Nameless One",     gold:380},
];
var LATE_TOASTS=[
  {msg:"IT'S PAST MIDNIGHT\nYou can't take any more actions today. Get some sleep.",icon:"🌙",color:"#fb923c"},
  {msg:"THE FORGE GROWS COLD\nMidnight has passed. Rest now, smith.",icon:"🌙",color:"#fb923c"},
];

function rand(a,b){return a+Math.random()*(b-a);}
function randi(a,b){return Math.floor(rand(a,b+1));}
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function getQ(s){return TIERS.slice().reverse().find(function(t){return s>=t.scoreMin;})||TIERS[0];}
function fmtTime(h){var hh=Math.floor(h)%24,mm=Math.round((h%1)*60);return (hh%12||12)+":"+(mm<10?"0":"")+mm+(hh>=12?"pm":"am");}
function randMatKey(){var keys=Object.keys(MATS);return keys[Math.floor(Math.random()*keys.length)];}
function qualVal(wKey,matKey,score,upg){
  var w=WEAPONS[wKey],m=MATS[matKey]||MATS.bronze;
  var uB=(upg.anvil+upg.hammer+upg.forge+upg.quench)*2;
  var base=w.matCost*m.price+(w.priceBonus||0);
  var calculated=Math.round(base*getQ(score).valueMultiplier*(1+uB/100));
  var matFloor=w.matCost*m.price;
  return Math.max(calculated,matFloor);
}
function weightedPick(items,weights){
  var total=0;for(var i=0;i<weights.length;i++)total+=weights[i];
  var r=Math.random()*total,cum=0;
  for(var i=0;i<items.length;i++){cum+=weights[i];if(r<cum)return items[i];}
  return items[0];
}
function refVal(wKey){var commonMin=TIERS.find(function(t){return t.label==="Common";}).scoreMin;return qualVal(wKey,'iron',commonMin,{anvil:0,hammer:0,forge:0,quench:0,furnace:0});}
function xpForLevel(l){return Math.floor(40*Math.pow(1.15,l-1));}
function getSmithRank(t){var r=SMITH_RANKS[0];for(var i=0;i<SMITH_RANKS.length;i++){if(t>=SMITH_RANKS[i].threshold)r=SMITH_RANKS[i];}return r;}
function getNextRank(t){for(var i=0;i<SMITH_RANKS.length;i++){if(t<SMITH_RANKS[i].threshold)return SMITH_RANKS[i];}return null;}
function qualGainMult(score){return getQ(score).qualityGainRate;}
function calcSpeedMult(ep,ed){return clamp(1.0-(ep-ed)*0.1,0.7,1.3);}
function calcStrikeMult(et,ed){return clamp(1.0+(et-ed)*0.1,0.7,1.5);}
function posToCol(pos){return Math.round(clamp(pos,0,100)/100*(QTE_COLS-1));}
function colToPos(col){return col/(QTE_COLS-1)*100;}
function calcHeatResult(pos,winLo,winHi){
  var col=posToCol(pos),sLo=posToCol(winLo),sHi=posToCol(winHi),sPk=Math.round((sLo+sHi)/2);
  if(col===sPk)return HEAT_TIERS[0];
  if(col>=sLo&&col<=sHi)return HEAT_TIERS[1];
  if(col>=Math.round(sLo*0.55))return HEAT_TIERS[2];
  return HEAT_TIERS[3];
}
function calcHammerResult(pos){
  var dist=Math.abs(colToPos(posToCol(pos))-50);
  for(var i=0;i<HAMMER_TIERS.length;i++){if(dist<=HAMMER_WIN*HAMMER_TIERS[i].pctOfHalf)return HAMMER_TIERS[i];}
  return HAMMER_TIERS[HAMMER_TIERS.length-1];
}
function canAffordTime(hour,cost){return hour+cost<=MAX_HOUR;}

var EVENTS=[
  {id:"slow",icon:"💤",tag:"QUIET",variants:[{title:"Slow Morning",desc:"Nothing special today.",effect:null}]},
  {id:"festival",icon:"🎉",tag:"EVENT",variants:[
      {title:"Small Gathering",   desc:"A few extra visitors! +2 visits.",     effect:function(s){return Object.assign({},s,{extraCustomers:2});}},
      {title:"Town Festival",     desc:"Extra customers today! +3 visits.",    effect:function(s){return Object.assign({},s,{extraCustomers:3});}},
      {title:"Grand Celebration", desc:"The whole town is out! +5 visits.",    effect:function(s){return Object.assign({},s,{extraCustomers:5});}},
    ]},
  {id:"merchant",icon:"⚒",tag:"MERCHANT",variants:[
      (function(){var k=randMatKey();return {title:"Material Windfall",desc:"A merchant gifts you 2 "+MATS[k].name+".",effect:function(s){var inv=Object.assign({},s.inv);inv[k]=(inv[k]||0)+2;return Object.assign({},s,{inv:inv});}};}()),
      (function(){var k=randMatKey();return {title:"Material Discount",desc:MATS[k].name+" at half price today.",effect:function(s){return Object.assign({},s,{matDiscount:{key:k,mult:0.5}});}};}()),
      (function(){var k=randMatKey();return {title:"Generous Merchant",desc:"A merchant gifts you 5 "+MATS[k].name+"!",effect:function(s){var inv=Object.assign({},s.inv);inv[k]=(inv[k]||0)+5;return Object.assign({},s,{inv:inv});}};}()),
    ]},
  {id:"rival",icon:"😠",tag:"MARKET",variants:[
      {title:"Rival Grumbles",  desc:"A rival smith undercuts you. Weapon sell prices -15% today.", effect:function(s){return Object.assign({},s,{priceDebuff:0.85});}},
      {title:"Rival Undercuts", desc:"A rival smith undercuts you. Weapon sell prices -25% today.", effect:function(s){return Object.assign({},s,{priceDebuff:0.75});}},
      {title:"Rival Price War", desc:"Market chaos. All weapon sell prices -40% today.",            effect:function(s){return Object.assign({},s,{priceDebuff:0.60});}},
    ]},
  {id:"backpain",icon:"🤕",tag:"HAZARD",variants:[
      {title:"Mild Ache",   desc:"Slight discomfort. Sessions cost 4hr.",      effect:function(s){return Object.assign({},s,{forcedExhaustion:true});}},
      {title:"Bad Back",    desc:"All sessions cost 4hr today.",               effect:function(s){return Object.assign({},s,{forcedExhaustion:true});}},
      {title:"Thrown Back", desc:"Sessions cost 4hr and you lose 1 stamina.",  effect:function(s){return Object.assign({},s,{forcedExhaustion:true,stamina:Math.max(1,s.stamina-1)});}},
    ]},
  {id:"rat",icon:"🐀",tag:"HAZARD",variants:[
      {title:"Mouse in the Larder",desc:"DYNAMIC",effect:function(s){var om=Object.keys(MATS).filter(function(k){return (s.inv[k]||0)>0;});if(!om.length)return s;var k=om[Math.floor(Math.random()*om.length)];var inv=Object.assign({},s.inv);inv[k]=Math.max(0,(inv[k]||0)-1);return Object.assign({},s,{inv:inv,_evDesc:"A mouse got in. Lost 1 "+MATS[k].name+"."});}},
      {title:"Rat in the Larder",  desc:"DYNAMIC",effect:function(s){var om=Object.keys(MATS).filter(function(k){return (s.inv[k]||0)>0;});if(!om.length)return s;var k=om[Math.floor(Math.random()*om.length)];var inv=Object.assign({},s.inv);inv[k]=Math.max(0,(inv[k]||0)-3);return Object.assign({},s,{inv:inv,_evDesc:"Lost 3 "+MATS[k].name+"."});}},
      {title:"Rat Infestation",    desc:"DYNAMIC",effect:function(s){var om=Object.keys(MATS).filter(function(k){return (s.inv[k]||0)>0;});if(!om.length)return s;var k=om[Math.floor(Math.random()*om.length)];var inv=Object.assign({},s.inv);inv[k]=Math.max(0,(inv[k]||0)-6);return Object.assign({},s,{inv:inv,_evDesc:"They got everywhere. Lost 6 "+MATS[k].name+"."});}},
    ]},
  {id:"fire",icon:"🔥",tag:"HAZARD",variants:[
      {title:"Ember Scare",   desc:"Quick to put out. Lose 2 hours and 5% gold.",    effect:function(s){return Object.assign({},s,{hour:s.hour+2,goldDelta:-Math.floor(s.gold*0.05)});}},
      {title:"Small Fire",    desc:"Lose 4 hours and 10% of your gold.",              effect:function(s){return Object.assign({},s,{hour:s.hour+4,goldDelta:-Math.floor(s.gold*0.10)});}},
      {title:"Workshop Fire", desc:"Serious damage. Lose 8 hours and 20% of gold.",  effect:function(s){return Object.assign({},s,{hour:s.hour+8,goldDelta:-Math.floor(s.gold*0.20)});}},
    ]},
  {id:"mom",icon:"👩",tag:"EVENT",variants:[
      {title:"Mom Pops In",    desc:"Brief visit. -2hr.",                            effect:function(s){return Object.assign({},s,{hour:s.hour+2});}},
      {title:"Mom Visits",     desc:"She reorganizes everything. -3hr -1 stam.",    effect:function(s){return Object.assign({},s,{hour:s.hour+3,stamina:Math.max(1,s.stamina-1)});}},
      {title:"Mom Stays Over", desc:"She rearranges the whole forge. -4hr -2 stam.",effect:function(s){return Object.assign({},s,{hour:s.hour+4,stamina:Math.max(1,s.stamina-2)});}},
    ]},
  {id:"taxman",icon:"💰",tag:"HAZARD",variants:[
      {title:"Minor Tax",      desc:"A small levy. Lose 25% of your gold.",   effect:function(s){return Object.assign({},s,{goldDelta:-Math.floor(s.gold*0.25)});}},
      {title:"Tax Collector",  desc:"Royal tax takes 33% of your gold.",      effect:function(s){return Object.assign({},s,{goldDelta:-Math.floor(s.gold*0.33)});}},
      {title:"Heavy Taxation", desc:"The crown demands half your gold.",       effect:function(s){return Object.assign({},s,{goldDelta:-Math.floor(s.gold*0.50)});}},
    ]},
  {id:"apprentice",icon:"👦",tag:"EVENT",variants:[
      {title:"Helpful Lad",        desc:"+1 stamina today.", effect:function(s){return Object.assign({},s,{stamina:s.stamina+1});}},
      {title:"Helpful Apprentice", desc:"+2 stamina today.", effect:function(s){return Object.assign({},s,{stamina:s.stamina+2});}},
      {title:"Eager Apprentice",   desc:"+3 stamina today!", effect:function(s){return Object.assign({},s,{stamina:s.stamina+3});}},
    ]},
  {id:"bonanza",icon:"💎",tag:"MERCHANT",variants:[
      {title:"Good Market Day",  desc:"Weapons sell for 25% more today.",    effect:function(s){return Object.assign({},s,{priceBonus:1.25});}},
      {title:"Merchant Bonanza", desc:"All weapons sell for 50% more today.",effect:function(s){return Object.assign({},s,{priceBonus:1.5});}},
      {title:"Buying Frenzy",    desc:"Weapons sell for double today!",       effect:function(s){return Object.assign({},s,{priceBonus:2.0});}},
    ]},
  {id:"flood",icon:"🌊",tag:"HAZARD",variants:[
      {title:"Flash Flood",  desc:"Water seeps in everywhere. Lose 3 hours and 10% gold.",         effect:function(s){return Object.assign({},s,{hour:s.hour+3,goldDelta:-Math.floor(s.gold*0.10)});}},
      {title:"Hurricane",    desc:"The street is a river. Lose 6 hours and 15% of your gold.",      effect:function(s){return Object.assign({},s,{hour:s.hour+6,goldDelta:-Math.floor(s.gold*0.15)});}},
      {title:"Tsunami",      desc:"Catastrophic flooding. Lose 12 hours and 20% of your gold.",     effect:function(s){return Object.assign({},s,{hour:s.hour+12,goldDelta:-Math.floor(s.gold*0.20)});}},
    ]},
  {id:"drought",icon:"☀",tag:"MARKET",vWeights:[40,30,20,10],variants:[
      {title:"Material Shortage", tag:"HAZARD",desc:"Supplies are running low. All material prices up 10% today.",  effect:function(s){return Object.assign({},s,{globalMatMult:1.10});}},
      {title:"Trade Disruption",  tag:"HAZARD",desc:"Trade routes are blocked. All material prices up 20% today.", effect:function(s){return Object.assign({},s,{globalMatMult:1.20});}},
      {title:"Market Collapse",   tag:"HAZARD",desc:"The markets are in chaos. All material prices up 30% today.",  effect:function(s){return Object.assign({},s,{globalMatMult:1.30});}},
      {title:"Great Famine",      tag:"HAZARD",desc:"All trade has ceased. All material prices up 50% today.",      effect:function(s){return Object.assign({},s,{globalMatMult:1.50});}},
    ]},
  {id:"commission",icon:"🏰",tag:"EVENT",variants:[
      {title:"Small Commission", desc:"A guard pre-pays 15g for a weapon.", effect:function(s){return Object.assign({},s,{goldDelta:15});}},
      {title:"Guard Commission", desc:"A guard pre-pays 30g for a weapon.", effect:function(s){return Object.assign({},s,{goldDelta:30});}},
      {title:"Knight Commission",desc:"A knight pre-pays 50g for a blade!",  effect:function(s){return Object.assign({},s,{goldDelta:50});}},
    ]},
  {id:"curse",icon:"💀",tag:"HAZARD",variants:[
      {title:"Mild Rust",       desc:"DYNAMIC",effect:function(s){var om=Object.keys(MATS).filter(function(k){return (s.inv[k]||0)>0;});if(!om.length)return s;var k=om[Math.floor(Math.random()*om.length)];var inv=Object.assign({},s.inv);inv[k]=Math.floor((inv[k]||0)*0.75);return Object.assign({},s,{inv:inv,_evDesc:"Some "+MATS[k].name+" spoiled. Lost 25%."});}},
      {title:"Cursed Shipment", desc:"DYNAMIC",effect:function(s){var om=Object.keys(MATS).filter(function(k){return (s.inv[k]||0)>0;});if(!om.length)return s;var k=om[Math.floor(Math.random()*om.length)];var inv=Object.assign({},s.inv);inv[k]=Math.floor((inv[k]||0)/2);return Object.assign({},s,{inv:inv,_evDesc:"Your "+MATS[k].name+" rusts. Lost half."});}},
      {title:"Heavy Curse",     desc:"DYNAMIC",effect:function(s){var om=Object.keys(MATS).filter(function(k){return (s.inv[k]||0)>0;});if(!om.length)return s;var k=om[Math.floor(Math.random()*om.length)];var inv=Object.assign({},s.inv);inv[k]=0;return Object.assign({},s,{inv:inv,_evDesc:"All your "+MATS[k].name+" turns to dust!"});}},
    ]},
  {id:"viral",icon:"🌟",tag:"EVENT",variants:[
      {title:"You Went Viral",desc:"You went viral on the medieval internet. Customers flood in all day.",effect:function(s){return Object.assign({},s,{guaranteedCustomers:true});}},
    ]},
  {id:"mystery",icon:"🌑",tag:"EVENT",vWeights:[60,15,25],flavorDescs:["The forge feels watched today...","It is eerily quiet this morning.","Something unseen lingers in the air.","The shadows seem deeper than usual."],variants:[
      {title:"The Quiet",   severity:null,  effect:null},
      {title:"The Visitor", severity:"good",effect:function(s){
          var matKey=Math.random()<0.5?"mithril":"orichalcum";
          var qty=Math.floor(Math.random()*2)+5;
          var inv=Object.assign({},s.inv);inv[matKey]=(inv[matKey]||0)+qty;
          return Object.assign({},s,{inv:inv,repDelta:1,_mysteryMat:matKey,_mysteryMatQty:qty});
        }},
      {title:"The Shadow",  severity:"bad", effect:function(s){
          var matKeys=Object.keys(MATS);
          var owned=matKeys.filter(function(k){return (s.inv[k]||0)>0;});
          var worstKey=owned.length?owned.reduce(function(a,b){return (s.inv[a]||0)*(MATS[a].price||1)>(s.inv[b]||0)*(MATS[b].price||1)?a:b;}):null;
          var inv=Object.assign({},s.inv);
          if(worstKey)inv[worstKey]=0;
          var goldDelta=-Math.floor(s.gold*rand(0.15,0.20));
          var finishedLost=s.finished&&s.finished.length>0;
          var newFinished=finishedLost?s.finished.slice(1):s.finished;
          return Object.assign({},s,{inv:inv,goldDelta:goldDelta,finished:newFinished,repDelta:-1,_mysteryMat:worstKey,_mysteryWipDestroyed:true,_mysteryGoldLost:-goldDelta,_mysteryWeaponLost:finishedLost?s.finished[0]:null});
        }},
    ]},
];

function buildEvents(state){
  var ownedMats=Object.keys(MATS).filter(function(k){return (state.inv[k]||0)>0;});
  var hasMats=ownedMats.length>0;
  var pool=EVENTS.filter(function(ev){
    if(!hasMats&&(ev.id==="rat"||ev.id==="curse"||ev.id==="drought"))return false;
    return true;
  }).map(function(ev){return {id:ev.id,icon:ev.icon,tag:ev.tag,variants:ev.variants,weight:ev.id==="mystery"?3:ev.id==="slow"?3:1,vWeights:ev.vWeights||null,flavorDescs:ev.flavorDescs||null};});
  if(state.hasSoldWeapon)pool.push({id:"returned",icon:"🐉",tag:"EVENT",variants:[{title:"Returned Sword",desc:"Customer returned a sword. Lose 10% of your gold.",effect:function(s){return Object.assign({},s,{goldDelta:-Math.floor(s.gold*0.10)});}}],weight:1});
  if(state.finished&&state.finished.length>0)pool.push({id:"thief",icon:"🦹",tag:"HAZARD",variants:[{title:"Thief!",desc:"One weapon stolen!",effect:function(s){if(!s.finished||!s.finished.length)return s;return Object.assign({},s,{finished:s.finished.slice(1)});}}],weight:1});
  if(state.lastSleepHour>2)pool.push({id:"hangover",icon:"🥴",tag:"HAZARD",variants:[{title:"Rough Morning",desc:"Stamina -2.",effect:function(s){return Object.assign({},s,{stamina:Math.max(1,s.stamina-2)});}}],weight:1});
  var ev=weightedPick(pool,pool.map(function(e){return e.weight;}));
  var vWeights=ev.vWeights||ev.variants.map(function(_,i){return i===0?50:i===1?30:20;}).slice(0,ev.variants.length);
  var v=weightedPick(ev.variants,vWeights);
  var state2={gold:state.gold||STARTING_GOLD,inv:state.inv||{bronze:10,iron:4},hour:WAKE_HOUR,stamina:state.stamina||BASE_STAMINA,finished:state.finished||[]};
  var r=v.effect?v.effect(state2):null;
  var desc=ev.flavorDescs?ev.flavorDescs[Math.floor(Math.random()*ev.flavorDescs.length)]:(r&&r._evDesc?r._evDesc:v.desc);
  return {id:ev.id,icon:ev.icon,tag:ev.tag,variantTag:v.tag||null,title:v.title,desc:desc,effect:v.effect,severity:v.severity||null};
}

function genRoyalQuest(questNum,unlockedBP,currentDay,reputation){
  currentDay=currentDay||1;reputation=reputation||4;
  var bp=unlockedBP||["dagger","shortsword","axe"];
  if(currentDay===1){
    var d1=Object.entries(WEAPONS).filter(function(e){return e[1].tier===1&&bp.includes(e[0]);});
    if(!d1.length)d1=Object.entries(WEAPONS).filter(function(e){return e[1].tier===1;});
    var d1p=d1[Math.floor(Math.random()*d1.length)];
    var d1Tier=TIERS.find(function(t){return t.label==="Common";});
    return {id:Date.now(),num:questNum,name:ROYAL_NAMES[questNum%ROYAL_NAMES.length],wKey:d1p[0],wName:d1p[1].name,minQ:d1Tier.scoreMin,minQLbl:d1Tier.label,matReq:"bronze",reward:qualVal(d1p[0],'bronze',d1Tier.scoreMin,{anvil:0,hammer:0,forge:0,quench:0,furnace:0}),repGain:d1Tier.reputationReward,repLoss:d1Tier.reputationPenalty,deadline:currentDay+1,fulfilled:false,fulfilledQty:0,qty:1,blueprintLocked:false};
  }
  var spike=Math.random()<PRESSURE_SPIKE_CHANCE?rand(1,PRESSURE_SPIKE_MAX):0;
  var pressure=clamp(currentDay*PRESSURE_PER_DAY+spike+rand(-0.5,0.5),0,MAX_PRESSURE);
  var normalizedPressure=clamp(pressure/MAX_PRESSURE,0,1);
  var curvedPressure=Math.sqrt(normalizedPressure);
  var matKeys=Object.keys(MATS);
  var matIdx=clamp(Math.floor(curvedPressure*matKeys.length+rand(-1,1)),0,matKeys.length-1);
  var matReq=matKeys[matIdx];
  var targetDiff=clamp(Math.round(curvedPressure*8+rand(-0.5,0.5))+1,1,9);
  targetDiff=Math.min(targetDiff,Math.floor(currentDay/2)+2);
  var repDiffBonus=reputation>=9?2:reputation>=7?1:reputation>=5?Math.random()<0.5?1:0:0;
  var repQBonus=reputation>=9?1:reputation>=7?Math.random()<0.5?1:0:0;
  targetDiff=clamp(targetDiff+repDiffBonus,1,9);
  var eligible=Object.entries(WEAPONS).filter(function(e){return Math.abs(e[1].difficulty-targetDiff)<=1;});
  if(!eligible.length)eligible=Object.entries(WEAPONS).sort(function(a,b){return Math.abs(a[1].difficulty-targetDiff)-Math.abs(b[1].difficulty-targetDiff);}).slice(0,3);
  var pick=eligible[Math.floor(Math.random()*eligible.length)],wKey=pick[0],w=pick[1];
  var questTiers=TIERS.filter(function(t){return t.scoreMin>0;});
  var commonIdx=questTiers.findIndex(function(t){return t.label==="Common";});
  var qIdx=clamp(Math.floor(curvedPressure*questTiers.length+rand(-1,0.8))+repQBonus,commonIdx,questTiers.length-1);
  var questTier=questTiers[qIdx];
  var repGain=questTier.reputationReward,repLoss=questTier.reputationPenalty;
  var reward=qualVal(wKey,matReq,questTier.scoreMin,{anvil:0,hammer:0,forge:0,quench:0,furnace:0});
  var qtyRoll=Math.random();
  var qty=currentDay>=16?(qtyRoll<0.4?1:qtyRoll<0.8?2:3):currentDay>=9?(qtyRoll<0.7?1:2):1;
  return {id:Date.now(),num:questNum,name:ROYAL_NAMES[questNum%ROYAL_NAMES.length],wKey:wKey,wName:w.name,minQ:questTier.scoreMin,minQLbl:questTier.label,matReq:matReq,reward:Math.round(reward*rand(0.7,0.9)),repGain:repGain,repLoss:qty>1?repLoss+1:repLoss,deadline:currentDay+randi(1,2)+(qty-1),fulfilled:false,fulfilledQty:0,qty:qty,blueprintLocked:!bp.includes(wKey)};
}

var DYNAMICS=[
  {label:"pp",mult:0.15},
  {label:"p", mult:0.30},
  {label:"mp",mult:0.45},
  {label:"mf",mult:0.60},
  {label:"f", mult:0.75},
  {label:"ff",mult:0.90},
];
function getDynVol(label){var d=DYNAMICS.find(function(x){return x.label===label;});return d?d.mult:0.60;}

var BPM=75;
var _Q=60/BPM,_H=_Q*2,_E=_Q/2,_S=_Q/4,_Dq=_Q*1.5;
var MELODY=[
  [[220,262,330],_Q],[0,_E],[[220,262,330,247],_E],
  [[220,262,330],_Q],[0,_E],[[247,294,349],_E],
  [[330,392,494],_Q],[0,_E],[[330,392,494],_E],
  [[220,262,330,392],_Q],[0,_E],[[220,262,330,392],_E],
  [[175,220,262],_H],[0,_E],[[196,247,294],_Dq],
  [[294,349,440,524],_E],[[349,440,524],_E],
  [[330,392,494],_E],[[247,294,349],_E],
  [[349,440,524,659],_E],[[392,494,587],_E],
  [[392,494,587,349],_E],[[220,262,330,392],_E],
  [[220,262,330],_Q],[0,_E],[[220,262,330,247],_E],
  [[220,262,330],_Q],[0,_E],[[247,294,349],_E],
  [[330,392,494],_Q],[0,_E],[[330,392,494],_E],
  [[220,262,330,392],_Q],[0,_E],[[220,262,330,392],_E],
  [[175,220,262],_H],[0,_E],[[196,247,294],_Dq],
  [[349,440,524,659],_Q],[0,_E],[[392,494,587],_E],
  [[220,262,330,392],_Q],[0,_H],
  [[220,262,330],_H],[[175,220,262],_H],
];
var _B1=55,_B2=73,_B3=82,_B4=87,_B5=98;
var BASS=[
  [_B1,_Q],[_B1,_Q],[_B1,_Q],[_B1,_Q],
  [_B2,_Q],[_B2,_Q],[_B2,_Q],[_B2,_Q],
  [_B1,_Q],[0,_E],[_B1,_Q],[0,_E],
  [_B3,_E],[_B3,_E],[_B2,_E],[_B4,_E],[_B4,_Q],[_B5,_Q],
  [_B1,_Q],[_B1,_Q],[_B1,_Q],[_B1,_Q],
  [_B2,_Q],[_B2,_Q],[_B2,_Q],[_B2,_Q],
  [_B1,_Q],[0,_E],[_B1,_Q],[0,_E],
  [_B4,_Q],[0,_E],[_B4,_E],[_B5,_Q],[_B1,_Q],
  [_B1,_H],[_B1,_H],
];
var MELODY_TYPES=[
  "hammer",null,"hammer","hammer",null,"hammer","hammer",null,"hammer","hammer",null,"hammer","fire",null,"fire",
  "hammer","hammer","hammer","hammer","fire","hammer","hammer","fire",
  "hammer",null,"hammer","hammer",null,"hammer","hammer",null,"hammer","hammer",null,"hammer","fire",null,"fire",
  "fire",null,"hammer","hammer",null,"fire","fire",
];
var HITS=(function(){var hits=[],t=0;MELODY.forEach(function(entry,i){var type=MELODY_TYPES[i];if(type)hits.push([type,t,entry[1]]);t+=entry[1];});return hits;}());
var QTE_TRACK_DURATION=MELODY.reduce(function(s,n){return s+n[1];},0);
var RHYTHM_DURATION=Math.ceil(QTE_TRACK_DURATION*1000)+2000;
var RHYTHM_HIT_WINDOW=10,RHYTHM_PERFECT_WINDOW=5,RHYTHM_SCROLL_PX_PER_MS=0.14,RHYTHM_TRACK_W=800,RHYTHM_HIT_X=150;

function generateRhythmNotes(speed){
  speed=speed||1.0;
  return HITS.map(function(h,i){
    var type=h[0],beatSec=h[1],dur=h[2],isHold=type==="fire";
    return {id:i,type:type,holdMs:isHold?Math.round((dur*1000*0.7)/speed):0,spawnMs:(beatSec*1000)/speed,dynamic:h[3]||null,dynamicEnd:h[4]||null,hit:false,missed:false,headHit:false,holdSuccess:false};
  });
}

function useAudio(){
  var A=useRef(null);
  if(!A.current){
    var _mode="off",_timer=null,_modeTimer=null,_ctx=null,_gainNode=null,_sfxGain=null,_musicGain=null,_idleMelIdx=0,_idlePlayed=false,_activeNodes=[];
    var Q=0.73,H=1.46,E=0.37,S=0.18,Dq=1.10;
    var IDLE_MELS=[
      [[392,Q],[440,Q],[494,Dq],[440,E],[392,H],[294,Q],[392,Q],[440,H],[0,Q]],
      [[659,Q],[587,E],[494,E],[440,H],[0,E],[494,Q],[587,Q],[659,Dq],[587,E],[494,H]],
      [[587,Q],[494,Q],[392,Dq],[440,E],[494,H],[392,Q],[440,Q],[494,H],[392,H]],
      [[196,H],[247,Q],[294,Q],[330,Dq],[294,E],[247,Q],[196,H],[0,Q]],
    ];
    var CHUNKD=[147,110,220],CHUNKF=[175,131,262];
    var PH1A=[175,131,262],PH1B=[207,155,311],PH1C=[165,124,247];
    var PH2A=[208,156,311],PH2B=[247,185,370],PH2C=[196,147,294];
    var FORGE=[
      [CHUNKD,E],[0,S],[CHUNKD,E],[0,S],[CHUNKD,E],[0,S],[CHUNKD,E],[0,S],
      [CHUNKD,E],[0,S],[CHUNKD,E],[0,S],[CHUNKD,E],[0,S],[CHUNKD,E],[0,S],
      [PH1A,E],[0,S],[PH1A,E],[0,S],[PH1A,E],[0,S],
      [PH1B,E],[0,S],[PH1B,E],[0,S],[PH1B,E],[0,S],
      [PH1C,E],[0,S],[PH1C,E],[0,S],[PH1C,E],[0,S],
      [CHUNKF,E],[0,S],[CHUNKF,E],[0,S],[CHUNKF,E],[0,S],[CHUNKF,E],[0,S],
      [CHUNKF,E],[0,S],[CHUNKF,E],[0,S],[CHUNKF,E],[0,S],[CHUNKF,E],[0,S],
      [PH2A,E],[0,S],[PH2A,E],[0,S],[PH2A,E],[0,S],
      [PH2B,E],[0,S],[PH2B,E],[0,S],[PH2B,E],[0,S],
      [PH2C,E],[0,S],[PH2C,E],[0,S],[PH2C,E],[0,S],
    ];
    function getCtx(){try{if(!_ctx){_ctx=new(window.AudioContext||window.webkitAudioContext)();_gainNode=_ctx.createGain();_gainNode.gain.setValueAtTime(2.5,0);_gainNode.connect(_ctx.destination);_sfxGain=_ctx.createGain();_sfxGain.gain.setValueAtTime(0.25,0);_sfxGain.connect(_gainNode);_musicGain=_ctx.createGain();_musicGain.gain.setValueAtTime(0.45*0.25,0);_musicGain.connect(_gainNode);}if(_ctx.state==="suspended")_ctx.resume();return _ctx;}catch(e){return null;}}
    function stopMusic(){clearTimeout(_timer);_activeNodes.forEach(function(o){try{o.stop();}catch(e){}});_activeNodes=[];}
    function tone(f,t,d,v,delay){if(v===undefined)v=0.25;if(delay===undefined)delay=0;try{var c=getCtx();if(!c)return;var o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(_sfxGain);o.type=t;o.frequency.setValueAtTime(f,c.currentTime+delay);g.gain.setValueAtTime(0,c.currentTime+delay);g.gain.linearRampToValueAtTime(v,c.currentTime+delay+0.01);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+delay+d);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+d);}catch(e){}}
    function noise(d,v,f){if(v===undefined)v=0.12;if(f===undefined)f=800;try{var c=getCtx();if(!c)return;var buf=c.createBuffer(1,c.sampleRate*d,c.sampleRate),dd=buf.getChannelData(0);for(var i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;var src=c.createBufferSource(),fi=c.createBiquadFilter(),g=c.createGain();fi.type="bandpass";fi.frequency.value=f;src.buffer=buf;src.connect(fi);fi.connect(g);g.connect(_sfxGain);g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);src.start();src.stop(c.currentTime+d);}catch(e){}}
    function playNotes(notes,vol){var c=getCtx();if(!c)return;var t=c.currentTime;for(var i=0;i<notes.length;i++){(function(note,startTime){var f=note[0],d=note[1],atk=note[2]!==undefined?note[2]:0.01;var freqs=Array.isArray(f)?f:[f];freqs.forEach(function(freq){if(freq===0)return;try{var o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(_musicGain);o.type="triangle";o.frequency.setValueAtTime(freq,startTime);g.gain.setValueAtTime(0,startTime);g.gain.linearRampToValueAtTime(vol,startTime+atk);g.gain.exponentialRampToValueAtTime(0.001,startTime+d*0.75);o.start(startTime);o.stop(startTime+d);_activeNodes.push(o);o.onended=function(){_activeNodes=_activeNodes.filter(function(x){return x!==o;});};}catch(e){}});})(notes[i],t);t+=notes[i][1];}}
    function noteDur(notes){return notes.reduce(function(s,n){return s+n[1];},0);}
    function playIdleOnce(){if(_mode!=="idle")return;playNotes(IDLE_MELS[_idleMelIdx%IDLE_MELS.length],0.055);}
    function tick(mode,notes,vol){if(_mode!==mode)return;stopMusic();playNotes(notes,vol);_timer=setTimeout(function(){tick(mode,notes,vol);},noteDur(notes)*1000+20);}
    function setMode(mode){if(_mode===mode)return;stopMusic();clearTimeout(_modeTimer);_mode=mode;_modeTimer=setTimeout(function(){if(_mode!==mode)return;if(mode==="idle"&&!A.current.idleMuted&&!_idlePlayed){_idlePlayed=true;_idleMelIdx=(_idleMelIdx+1)%IDLE_MELS.length;playIdleOnce();}if(mode==="forge"&&!A.current.forgeMuted)tick("forge",FORGE,0.12);},500);}
    A.current={
      setMode,idleMuted:false,forgeMuted:false,
      resetDay:function(){_idlePlayed=false;if(_mode==="idle"&&!A.current.idleMuted){stopMusic();_idleMelIdx=(_idleMelIdx+1)%IDLE_MELS.length;_idlePlayed=true;setTimeout(playIdleOnce,500);}},
      warmup:function(){getCtx();},
      setSfxVol:function(v){getCtx();if(_sfxGain)_sfxGain.gain.setValueAtTime(v,_ctx.currentTime);},
      setMusicVol:function(v){getCtx();if(_musicGain)_musicGain.gain.setValueAtTime(v*0.45,_ctx.currentTime);},
      fanfare:function(){var c=getCtx();if(!c)return;var bpm=120,q=60/bpm,h=q*2,f=q;var notes=[{f:261,start:0,dur:h},{f:261,start:q,dur:h},{f:261,start:q*2,dur:h},{f:349,start:q*2+f*0.5,dur:h},{f:440,start:q*4,dur:h},{f:523,start:q*5,dur:h},{f:440,start:q*6,dur:h},{f:523,start:q*6+f*0.5,dur:h*2}];var t=c.currentTime+0.05;notes.forEach(function(n){try{var o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(_sfxGain);o.type="sine";o.frequency.setValueAtTime(n.f,t+n.start);g.gain.setValueAtTime(0,t+n.start);g.gain.linearRampToValueAtTime(0.22,t+n.start+0.04);g.gain.exponentialRampToValueAtTime(0.001,t+n.start+n.dur);o.start(t+n.start);o.stop(t+n.start+n.dur+0.05);}catch(e){}try{var o2=c.createOscillator(),g2=c.createGain();o2.connect(g2);g2.connect(_sfxGain);o2.type="triangle";o2.frequency.setValueAtTime(n.f,t+n.start);g2.gain.setValueAtTime(0,t+n.start);g2.gain.linearRampToValueAtTime(0.08,t+n.start+0.06);g2.gain.exponentialRampToValueAtTime(0.001,t+n.start+n.dur);o2.start(t+n.start);o2.stop(t+n.start+n.dur+0.05);}catch(e){}});},
      click:function(){tone(900,"square",0.03,0.07);},
      heat:function(q){if(q==="poor"||q==="over"){tone(120,"square",0.08,0.12);noise(0.1,0.06,200);return;}var f1=q==="perfect"?880:q==="good"?660:520;var f2=q==="perfect"?1100:q==="good"?825:650;tone(f1,"sine",0.30,0.18);tone(f2,"sine",0.30*0.75,0.10);},
      hammer:function(q){if(q==="miss"){tone(120,"square",0.08,0.12);noise(0.1,0.06,200);return;}var f1=q==="perfect"?880:q==="great"?660:520;var f2=q==="perfect"?1100:q==="great"?825:650;var dur=q==="perfect"?0.55:0.30;tone(f1,"sine",dur,0.18);tone(f2,"sine",dur*0.75,0.10);},
      perfect:function(){tone(880,"sine",0.35,0.18);tone(1100,"sine",0.25,0.1);},
      quench:function(){noise(0.7,0.2,1200);tone(180,"sine",0.5,0.07);},
      quenchFail:function(){tone(100,"sawtooth",0.35,0.25);noise(0.35,0.2,150);},
      shatter:function(){noise(0.5,0.35,400);tone(80,"sawtooth",0.3,0.25);},
      doorbell:function(){tone(660,"sine",0.14,0.16);tone(550,"sine",0.18,0.12,0.14);},
      coin:function(){tone(1200,"sine",0.09,0.16);tone(1000,"sine",0.14,0.12,0.08);},
      mysteryGood:function(){var c=getCtx();if(!c)return;var t=c.currentTime;var chords=[[261,329,392,440,523,659],[349,440,523,659,698,880],[261,329,392,523,659]];var times=[0,1.8,3.4];var durs=[2.4,2.4,2.0];chords.forEach(function(chord,ci){var start=t+times[ci],dur=durs[ci];chord.forEach(function(freq){[0,2.5].forEach(function(detune){try{var o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.setValueAtTime(freq*(1+detune*0.0003),start);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(0.06,start+0.6);g.gain.linearRampToValueAtTime(0.04,start+dur*0.7);g.gain.linearRampToValueAtTime(0,start+dur);o.connect(g);g.connect(_sfxGain);o.start(start);o.stop(start+dur);}catch(e){}});});});},
      dragonFlyby:function(){try{var c=getCtx();if(!c)return;var dur=6.0;var buf=c.createBuffer(1,c.sampleRate*dur,c.sampleRate),dd=buf.getChannelData(0);for(var i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;var src=c.createBufferSource();src.buffer=buf;var fi=c.createBiquadFilter();fi.type="lowpass";fi.frequency.value=120;fi.Q.value=2.0;var g=c.createGain();g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(0.5,c.currentTime+0.12);g.gain.linearRampToValueAtTime(0.35,c.currentTime+dur*0.6);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);src.connect(fi);fi.connect(g);g.connect(_sfxGain);src.start();src.stop(c.currentTime+dur);}catch(e){}},
      fireTornado:function(){try{var c=getCtx();if(!c)return;var dur=5.5;var buf=c.createBuffer(1,c.sampleRate*dur,c.sampleRate),dd=buf.getChannelData(0);for(var i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;var src=c.createBufferSource();src.buffer=buf;var fi=c.createBiquadFilter();fi.type="bandpass";fi.frequency.setValueAtTime(200,c.currentTime);fi.frequency.linearRampToValueAtTime(600,c.currentTime+dur);fi.Q.value=0.8;var fi2=c.createBiquadFilter();fi2.type="highpass";fi2.frequency.value=120;var g=c.createGain();g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(0.7,c.currentTime+0.08);g.gain.linearRampToValueAtTime(0.5,c.currentTime+dur*0.6);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);src.connect(fi);fi.connect(fi2);fi2.connect(g);g.connect(_sfxGain);src.start();src.stop(c.currentTime+dur);}catch(e){}},
      coinLoss:function(){tone(600,"sine",0.09,0.16);tone(500,"sine",0.14,0.12,0.08);},
      levelup:function(){[440,550,660,880].forEach(function(f,i){tone(f,"sine",0.18,0.16,i*0.08);});},
      gameover:function(){[220,196,174,130].forEach(function(f,i){setTimeout(function(){tone(f,"sawtooth",0.45,0.25);},i*220);});},
      royal:function(){tone(440,"sine",0.12,0.16);tone(550,"sine",0.12,0.16,0.11);tone(660,"sine",0.16,0.18,0.22);},
      playTrack:function(speed){
        var c=getCtx();if(!c)return;speed=speed||1.0;var vol=0.10;
        var scrollSpeed=RHYTHM_SCROLL_PX_PER_MS*speed;
        var travelMs=(RHYTHM_TRACK_W-RHYTHM_HIT_X)/scrollSpeed;
        var musicStart=c.currentTime+travelMs/1000;
        var t=musicStart;
        MELODY.forEach(function(entry){var freqs=entry[0],dur=entry[1]/speed;var fArr=Array.isArray(freqs)?freqs:(freqs?[freqs]:[]);fArr.forEach(function(freq){if(!freq)return;try{var o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.015);g.gain.exponentialRampToValueAtTime(0.001,t+dur*0.8);o.connect(g);g.connect(_musicGain);o.start(t);o.stop(t+dur);_activeNodes.push(o);o.onended=function(){_activeNodes=_activeNodes.filter(function(x){return x!==o;});};}catch(e){}});t+=dur;});
        var bt=musicStart;
        BASS.forEach(function(entry){var freq=entry[0],dur=entry[1]/speed;if(freq){try{var o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.setValueAtTime(freq,bt);g.gain.setValueAtTime(0,bt);g.gain.linearRampToValueAtTime(0.45,bt+0.015);g.gain.exponentialRampToValueAtTime(0.001,bt+Math.min(dur*0.5,0.25));o.connect(g);g.connect(_musicGain);o.start(bt);o.stop(bt+dur);_activeNodes.push(o);o.onended=function(){_activeNodes=_activeNodes.filter(function(x){return x!==o;});};}catch(e){}}bt+=dur;});
      },
      tone:tone,
      stopQteMusic:function(){stopMusic();},
      getCurrentRootFreq:function(elapsedMs,speed){speed=speed||1.0;var t=0;for(var i=0;i<MELODY.length;i++){var dur=(MELODY[i][1]*1000)/speed;if(elapsedMs<t+dur){var freqs=MELODY[i][0];return Array.isArray(freqs)?freqs[0]:freqs;}t+=dur;}return null;},
      toast:function(){tone(550,"sine",0.09,0.14);tone(660,"sine",0.11,0.14,0.09);},
    };
  }
  return A.current;
}

function qteGradColor(i,lo,hi,cols){
  if(i>=lo&&i<=hi)return "#4ade80";
  var dist=i<lo?lo-i:i-hi,mx=Math.max(lo,cols-1-hi)||1,t=Math.min(1,dist/mx);
  if(t<0.18)return "rgba(160,220,50,0.55)";if(t<0.38)return "rgba(240,175,0,0.55)";if(t<0.62)return "rgba(220,95,0,0.54)";return "rgba(185,35,35,0.5)";
}
function HeatBar({pos,winLo,winHi,frozen}){
  var cols=QTE_COLS,nc=posToCol(pos),sLo=posToCol(winLo),sHi=posToCol(winHi),sPk=Math.round((sLo+sHi)/2),dStart=sHi+1;
  function bg(i){if(i>=dStart)return "rgba("+(190+Math.min(55,(i-dStart)*8))+","+(Math.max(0,35-(i-dStart)*4))+",30,"+(0.5+Math.min(0.4,(i-dStart)*0.06))+")";if(i>=sLo)return i===sPk?"#88ffaa":"#4ade80";var t=i/sLo;if(t<0.3)return "rgba(130,"+Math.round(t/0.3*15)+",0,0.5)";if(t<0.58)return "rgba(200,"+Math.round((t-0.3)/0.28*110)+",0,0.55)";return "rgba(240,"+Math.round(110+(t-0.58)/0.42*145)+",0,0.6)";}
  function h(i){if(i>=dStart)return Math.max(10,22-Math.min(10,(i-dStart)*2));if(i===sPk)return 48;if(i>=sLo&&i<=sHi)return 36;return Math.max(10,Math.round(10+18*(i/sLo)));}
  var cells=[];for(var i=0;i<cols;i++){var isN=i===nc,inS=i>=sLo&&i<=sHi,inD=i>=dStart;cells.push(<div key={i} style={{flex:1,minWidth:0,height:isN?52:h(i),background:isN?(frozen?"#fbbf24":"#fff"):bg(i),border:inS&&!isN?"1px solid #4ade8099":inD&&!isN?"1px solid #ef444455":"1px solid #1a1209"}}/>);}
  return <div style={{userSelect:"none",display:"flex",gap:"2px",alignItems:"flex-end",height:52,width:"100%",overflow:"hidden"}}>{cells}</div>;
}
function PixelBar({pos,winHalf,frozen,lossZone}){
  var cols=QTE_COLS,nc=posToCol(pos),sLo=posToCol(50-winHalf),sHi=posToCol(50+winHalf);
  var pLo=posToCol(50-winHalf*0.15),pHi=posToCol(50+winHalf*0.15);
  var gLo=posToCol(50-winHalf*0.45),gHi=posToCol(50+winHalf*0.45);
  var eLo=posToCol(50-(winHalf+1.2)),eHi=posToCol(50+(winHalf+1.2));
  function h(i){if(i>=pLo&&i<=pHi)return 52;if(i>=gLo&&i<=gHi)return 42;if(i>=sLo&&i<=sHi)return 32;var dist=i<sLo?sLo-i:i-sHi,mx=Math.max(sLo,cols-1-sHi)||1;return Math.max(16,Math.round(28*(1-Math.min(1,dist/mx))));}
  var cells=[];
  for(var i=0;i<cols;i++){var isN=i===nc,inS=i>=sLo&&i<=sHi;var inLoss=lossZone&&((inS&&(i<gLo||i>gHi))||(i>=eLo&&i<sLo)||(i>sHi&&i<=eHi));var inFail=lossZone&&!inS&&(i<eLo||i>eHi);var bg=isN?(frozen?"#fbbf24":"#fff"):inLoss?"#fb923c":inFail?"rgba(185,35,35,0.5)":qteGradColor(i,sLo,sHi,cols);cells.push(<div key={i} style={{flex:1,minWidth:0,height:isN?52:h(i),background:bg,border:inS&&!isN?"1px solid #4ade8077":"1px solid #1a1209"}}/>);}
  return <div style={{userSelect:"none",display:"flex",gap:"2px",alignItems:"flex-end",height:52,width:"100%",overflow:"hidden"}}>{cells}</div>;
}
function QTEPanel({phase,heatWinLo,heatWinHi,flash,strikesLeft,strikesTotal,heatSpeedMult,hammerSpeedMult,quenchSpeedMult,posRef,processingRef,onAutoFire}){
  var [heatPos,setHeatPos]=useState(0);
  var [needlePos,setNeedlePos]=useState(50);
  var [quenchPos,setQuenchPos]=useState(50);
  var heatN=useRef({pos:0,speed:12}),hammerN=useRef({pos:50,dir:1,speed:76}),quenchN=useRef({pos:50,dir:1,speed:52});
  var animId=useRef(null);
  useEffect(function(){
    if(phase!==PHASES.HEAT)return;
    processingRef.current=false;heatN.current={pos:0,speed:(18+Math.random()*4)*heatSpeedMult};setHeatPos(0);posRef.current=0;var done=false;
    var t=setTimeout(function(){function loop(){if(done)return;if(!processingRef.current){var n=heatN.current;n.pos=Math.min(100,n.pos+n.speed*Math.pow(1+n.pos/100,1.8)/60);posRef.current=n.pos;setHeatPos(n.pos);if(n.pos>=100){done=true;onAutoFire(n.pos);return;}}animId.current=requestAnimationFrame(loop);}animId.current=requestAnimationFrame(loop);},800);
    return function(){done=true;cancelAnimationFrame(animId.current);clearTimeout(t);};
  },[phase]);
  useEffect(function(){
    if(phase!==PHASES.HAMMER)return;
    processingRef.current=false;hammerN.current={pos:50,dir:1,speed:(80+Math.random()*20)*hammerSpeedMult};setNeedlePos(50);posRef.current=50;var done=false;
    function loop(){if(done)return;if(!processingRef.current){var n=hammerN.current;n.pos+=n.dir*(n.speed/60);if(n.pos>=100||n.pos<=0)n.dir*=-1;posRef.current=n.pos;setNeedlePos(n.pos);}animId.current=requestAnimationFrame(loop);}
    animId.current=requestAnimationFrame(loop);return function(){done=true;cancelAnimationFrame(animId.current);};
  },[phase]);
  useEffect(function(){
    if(phase!==PHASES.QUENCH)return;
    processingRef.current=false;quenchN.current={pos:50,dir:1,speed:(60+Math.random()*15)*quenchSpeedMult};setQuenchPos(50);posRef.current=50;var done=false;
    function loop(){if(done)return;if(!processingRef.current){var n=quenchN.current;n.pos+=n.dir*(n.speed/60);if(n.pos>=100||n.pos<=0)n.dir*=-1;posRef.current=n.pos;setQuenchPos(n.pos);}animId.current=requestAnimationFrame(loop);}
    animId.current=requestAnimationFrame(loop);return function(){done=true;cancelAnimationFrame(animId.current);};
  },[phase]);
  var isQTE=phase===PHASES.HEAT||phase===PHASES.HAMMER||phase===PHASES.QUENCH;
  if(!isQTE)return null;
  var frozen=!!flash;
  var defLabel=phase===PHASES.HEAT?"CLICK TO PULL FROM FORGE":phase===PHASES.HAMMER?"CLICK TO STRIKE":"CLICK TO QUENCH";
  var flashColor=!flash?"#78614a":(flash.indexOf("PERFECT")>=0||flash==="SUCCESS!"||flash.indexOf("GREAT")>=0||flash.indexOf("GOOD")>=0||flash.indexOf("SOLID")>=0)?"#4ade80":(flash.indexOf("MISS")>=0||flash.indexOf("DESTROY")>=0||flash.indexOf("ROUGH")>=0)?"#f87171":"#fbbf24";
  return(
      <div style={{width:QTE_W,flexShrink:0,display:"flex",flexDirection:"column",gap:4}}>
        <div style={{height:22,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {phase===PHASES.HAMMER?(<div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:11,color:"#f59e0b",letterSpacing:2,fontWeight:"bold",marginRight:6}}>STRIKES</span>{Array.from({length:strikesTotal||3}).map(function(_,i){var used=i>=strikesLeft;return <div key={i} style={{width:16,height:16,borderRadius:3,background:used?"#2a1f0a":"#f59e0b",border:"2px solid "+(used?"#3d2e0f":"#f59e0b"),transition:"background 0.15s"}}/>;})}</div>):(<span style={{fontSize:12,letterSpacing:2,fontWeight:"bold",color:phase===PHASES.QUENCH?"#60a5fa":"#f59e0b",whiteSpace:"nowrap"}}>{phase===PHASES.HEAT?"HEATING — HIT THE GREEN":"QUENCHING — AIM FOR CENTER"}</span>)}
        </div>
        <div style={{height:18,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:13,letterSpacing:2,fontWeight:"bold",color:flashColor,whiteSpace:"nowrap"}}>{flash||defLabel}</span>
        </div>
        <div style={{width:"100%",overflow:"hidden"}}>
          {phase===PHASES.HEAT&&<HeatBar pos={heatPos} winLo={heatWinLo} winHi={heatWinHi} frozen={frozen}/>}
          {phase===PHASES.HAMMER&&<PixelBar pos={needlePos} winHalf={HAMMER_WIN} frozen={frozen}/>}
          {phase===PHASES.QUENCH&&<PixelBar pos={quenchPos} winHalf={QUENCH_WIN} frozen={frozen} lossZone={true}/>}
        </div>
      </div>
  );
}

var ToastContext={active:false};
function Panel({color,style,children,onMouseEnter,onMouseLeave}){var bc=color?color+"44":"#3d2e0f";return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={Object.assign({},{background:"#0f0b06",border:"1px solid "+bc,borderRadius:8,padding:"10px 12px"},style)}>{children}</div>;}
function Row({style,center,children,onMouseEnter,onMouseLeave}){return <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={Object.assign({},{display:"flex",alignItems:"center",justifyContent:center?"center":"space-between"},style)}>{children}</div>;}
function SectionLabel({color,style,children}){return <div style={Object.assign({},{fontSize:9,color:color||"#8a7a64",letterSpacing:2,textTransform:"uppercase"},style)}>{children}</div>;}
function InfoRow({label,value,color,labelStyle,valueStyle}){return(<Row style={{marginBottom:5}}><SectionLabel style={labelStyle}>{label}</SectionLabel><span style={Object.assign({},{fontSize:12,color:color||"#f0e6c8",fontWeight:"bold"},valueStyle)}>{value}</span></Row>);}
function Badge({value,label,color,size}){var fs=size||20;return(<div style={{border:"2px solid "+color,borderRadius:6,padding:"3px 10px",display:"flex",flexDirection:"column",alignItems:"center",background:"#0a0704"}}>{label&&<SectionLabel color={color}>{label}</SectionLabel>}<span style={{fontSize:fs,color:color,fontWeight:"bold",lineHeight:1}}>{value}</span></div>);}
function ActionBtn({onClick,disabled,color,bg,className,small,width,height,style,children}){
  var c=color||(disabled?"#4a3c2c":"#f59e0b"),b=bg||(disabled?"#0a0704":"#2a1f0a"),bc=disabled?"#2a1f0a":(color||"#f59e0b");
  return(<button onClick={disabled?null:onClick} disabled={disabled} className={className||""} style={Object.assign({},{background:b,border:"2px solid "+bc,borderRadius:8,color:c,padding:small?"6px 12px":"10px 16px",fontSize:small?11:13,cursor:disabled?"not-allowed":"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold",width:width||"auto",height:height||"auto"},style)}>{children}</button>);
}
function DangerBtn({onClick,disabled,style,children}){return(<button onClick={disabled?null:onClick} disabled={disabled} style={Object.assign({},{background:"#1a0505",border:"2px solid "+(disabled?"#2a1f0a":"#ef4444"),borderRadius:8,color:disabled?"#4a3c2c":"#ef4444",padding:"10px 16px",fontSize:13,cursor:disabled?"not-allowed":"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"},style)}>{children}</button>);}
function Bar({value,max,color,h,instant}){var mx=max||100,hh=h||10;return(<div style={{height:hh,background:"#0f0b06",borderRadius:hh/2,overflow:"hidden",border:"1px solid #2a1f0a"}}><div style={{height:"100%",width:clamp((value/mx)*100,0,100)+"%",background:color,borderRadius:hh/2,transition:instant?"none":"width 0.12s"}}/></div>);}
function Pips({count,filled,filledColor,emptyColor,size}){var sz=size||14;return(<div style={{display:"flex",gap:4}}>{Array.from({length:count}).map(function(_,i){var fc=typeof filledColor==="function"?filledColor(i):filledColor||"#f59e0b";return <div key={i} style={{width:sz,height:sz,borderRadius:3,background:i<filled?fc:(emptyColor||"#2a1f0a"),border:"2px solid "+(i<filled?fc+"88":"#3d2e0f"),transition:"background 0.15s"}}/>;})}</div>);}
function Tooltip({title,text,below,children}){
  var [show,setShow]=useState(false);
  var tipStyle=below?{position:"absolute",top:"calc(100% + 8px)",left:0}:{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)"};
  return(<div style={{position:"relative",display:"flex",flexDirection:"column",flex:1}} onMouseEnter={function(){setShow(true);}} onMouseLeave={function(){setShow(false);}}>
    {children}
    {show&&!ToastContext.active&&(<div style={Object.assign({},tipStyle,{background:"#0a0704",border:"1px solid #f59e0b66",borderRadius:10,padding:"14px 16px",fontSize:12,color:"#c8b89a",lineHeight:1.8,zIndex:300,width:260,boxShadow:"0 6px 20px rgba(0,0,0,0.97)",pointerEvents:"none",whiteSpace:"normal"})}>{title&&<div style={{color:"#f59e0b",fontWeight:"bold",letterSpacing:2,marginBottom:8,fontSize:12}}>{title}</div>}{text}</div>)}
  </div>);
}
function Toast({msg,icon,color,onDone,duration,locked}){
  var [vis,setVis]=useState(true);
  ToastContext.active=vis;
  useEffect(function(){ToastContext.active=true;var t=setTimeout(function(){setVis(false);ToastContext.active=false;setTimeout(onDone,400);},(duration||4500));return function(){clearTimeout(t);ToastContext.active=false;};},[]);
  if(!vis)return null;
  var lines=msg.split("\n");
  return(<div onClick={locked?null:function(){setVis(false);setTimeout(onDone,200);}} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:9999,cursor:locked?"default":"pointer",width:"min(400px,90%)",pointerEvents:"auto"}}>
    <div style={{background:"#0c0905",border:"4px solid "+color,borderRadius:20,padding:"36px 44px",boxShadow:"0 24px 80px rgba(0,0,0,0.99)",display:"flex",flexDirection:"column",alignItems:"center",gap:20,textAlign:"center"}}>
      <span style={{fontSize:64,lineHeight:1}}>{icon}</span>
      <div style={{fontSize:24,color:color,fontWeight:"bold",letterSpacing:3,lineHeight:1.3}}>{lines[0]}</div>
      {lines[1]&&<div style={{fontSize:16,color:"#c8b89a",lineHeight:1.6}}>{lines[1]}</div>}
      {!locked&&<div style={{fontSize:10,color:"#4a3c2c",letterSpacing:2}}>CLICK TO DISMISS</div>}
    </div>
  </div>);
}
function ForgeScene({phase}){
  var fi=(phase===PHASES.HEAT||phase===PHASES.HAMMER)?1.0:0.18;
  return(<div style={{width:320,height:180,margin:"0 auto",filter:"brightness("+(0.3+fi*0.7)+")",transition:"filter 0.4s"}}>
    <img src={process.env.PUBLIC_URL + "/images/wobblyanvil.png"} width="320" height="180" style={{display:"block",imageRendering:"pixelated"}} />
  </div>);
}
function StatPanel({stats,points,onAllocate,sfx,locked}){
  var [hov,setHov]=useState(null);
  return(<Panel>
    <Row style={{marginBottom:6}}><SectionLabel color="#f59e0b">STATS</SectionLabel><div style={{fontSize:9,color:"#4ade80",background:"#0a2a0a",border:"1px solid #4ade8055",borderRadius:4,padding:"1px 6px",visibility:points>0?"visible":"hidden"}}>{points} PT{points>1?"S":""}</div></Row>
    {Object.entries(stats).map(function(e){
      var k=e[0],v=e[1],cost=v<3?1:v<6?2:3,canAfford=points>=cost;
      return(<div key={k} style={{marginBottom:6,position:"relative"}}>
        <Row onMouseEnter={function(){setHov(k);}} onMouseLeave={function(){setHov(null);}} style={{cursor:"default"}}>
          <div style={{flex:1}}><div style={{fontSize:11,color:hov===k?"#f59e0b":"#c8b89a",letterSpacing:1}}>{STAT_META[k].label.toUpperCase()}{hov===k?" i":""}</div><Pips count={10} filled={v} filledColor="#f59e0b" size={8}/></div>
          <button onClick={canAfford&&!locked?function(){if(sfx)sfx.click();onAllocate(k);}:null} style={{background:"#2a1f0a",border:"1px solid "+(canAfford&&!locked?"#f59e0b":"#3d2e0f"),borderRadius:4,color:canAfford&&!locked?"#f59e0b":"#4a3c2c",padding:"2px 7px",fontSize:9,cursor:canAfford&&!locked?"pointer":"default",letterSpacing:1,fontFamily:"monospace",marginLeft:6,visibility:points>0&&!locked?"visible":"hidden"}}>{cost}pt</button>
        </Row>
        {hov===k&&<div style={{position:"absolute",left:0,top:"100%",marginTop:4,background:"#0a0704",border:"1px solid #f59e0b55",borderRadius:6,padding:"7px 9px",fontSize:9,color:"#c8b89a",lineHeight:1.6,zIndex:99,width:170,boxShadow:"0 4px 12px rgba(0,0,0,0.9)"}}><div style={{color:"#f59e0b",fontWeight:"bold",marginBottom:3}}>{STAT_META[k].label.toUpperCase()}</div>{STAT_META[k].desc}<div style={{marginTop:4,color:"#8a7a64",fontSize:8}}>Current: {v} · Next costs: {cost}pt</div></div>}
      </div>);
    })}
  </Panel>);
}
function ForgeInfoPanel({upgrades}){
  return(<Panel><SectionLabel color="#f59e0b" style={{marginBottom:8}}>FORGE</SectionLabel>
    {[["anvil","Anvil"],["hammer","Hammer"],["forge","Forge"],["quench","Quench"],["furnace","Furnace"]].map(function(p){var k=p[0],l=p[1],lvl=upgrades[k],upg=UPGRADES[k][lvl];return(<div key={k} style={{marginBottom:8}}><SectionLabel>{l}</SectionLabel><div style={{fontSize:12,color:UPGRADE_COLORS[lvl],marginTop:2}}>{upg.name}</div></div>);})}
  </Panel>);
}
function RepPanel({reputation}){
  var [hov,setHov]=useState(false);
  var color=reputation>=7?"#22c55e":reputation>=4?"#fb923c":reputation>=2?"#ef4444":"#7f1d1d";
  var status=reputation>=7?"Royal Favour":reputation>=4?"King Grows Wary":reputation>=2?"Arrest Imminent":"EXECUTION IMMINENT";
  return(<Panel color={color} style={{position:"relative",cursor:"default"}} onMouseEnter={function(){setHov(true);}} onMouseLeave={function(){setHov(false);}}>
    <SectionLabel style={{marginBottom:4}}>REPUTATION {hov?"i":""}</SectionLabel>
    <div style={{display:"flex",gap:4,marginBottom:5}}>{Array.from({length:10}).map(function(_,i){var f=i<reputation,pc=i<3?"#ef4444":i<6?"#fb923c":i<8?"#4ade80":"#22c55e";return <div key={i} style={{flex:1,height:14,borderRadius:3,background:f?pc:"#1a1209",border:"1px solid "+(f?pc+"88":"#2a1f0a"),transition:"background 0.2s"}}/>;})}</div>
    <div className={reputation<=1?"blink":""} style={{fontSize:8,color:color,letterSpacing:1}}>{status.toUpperCase()}</div>
    {hov&&<div style={{position:"absolute",left:0,top:"100%",marginTop:4,background:"#0a0704",border:"1px solid #ef444455",borderRadius:6,padding:"8px 10px",fontSize:9,color:"#c8b89a",lineHeight:1.7,zIndex:99,width:190,boxShadow:"0 4px 16px rgba(0,0,0,0.95)"}}><div style={{color:"#ef4444",fontWeight:"bold",marginBottom:4}}>THE KING'S FAVOR</div><span style={{color:"#22c55e"}}>7-10</span>: Royal favour<br/><span style={{color:"#fb923c"}}>4-6</span>: King grows wary<br/><span style={{color:"#ef4444"}}>2-3</span>: Arrest imminent<br/><span style={{color:"#7f1d1d"}}>1</span>: Execution imminent<br/><br/><span style={{color:"#ef4444",fontWeight:"bold"}}>REP 0 = EXECUTED.</span></div>}
  </Panel>);
}
function CustomerPanel({customer,weapon,onSell,onRefuse,silverTongue,priceBonus,priceDebuff,sfx}){
  var shelfVal=weapon.val||qualVal(weapon.wKey,weapon.matKey||"bronze",weapon.score,{anvil:0,hammer:0,forge:0,quench:0,furnace:0});
  var budRef=useRef(Math.round(shelfVal*rand(customer.type.bLo,customer.type.bHi)));
  var moodRef=useRef(MOODS[randi(0,weapon.score>=TIERS[8].scoreMin?3:weapon.score>=TIERS[4].scoreMin?2:1)]);
  var mood=moodRef.current,maxOffer=Math.round(budRef.current*mood.mult*(1+silverTongue*0.10)*(priceBonus||1.0)*(priceDebuff||1.0));
  var openingOffer=useRef(Math.round(maxOffer*rand(0.6,0.75)));
  var [offer,setOffer]=useState(openingOffer.current);
  var step=Math.max(1,Math.floor(shelfVal*0.05));
  var [myPrice,setMyPrice]=useState(Math.round(shelfVal*1.5));
  var priceAtOffer=myPrice<=offer;
  var [round,setRound]=useState(0);
  var [msg,setMsg]=useState(customer.type.greet[randi(0,customer.type.greet.length-1)]);
  var [done,setDone]=useState(false);
  var [walkedOut,setWalkedOut]=useState(false);
  var q=getQ(weapon.score);
  function lower(){var np=Math.max(offer,myPrice-step);setMyPrice(np);if(np<=offer)setDone(true);}
  function makeOffer(){
    if(done)return;var newRound=round+1;setRound(newRound);
    if(myPrice<=maxOffer){setOffer(myPrice);setDone(true);setMsg("...fine. You drive a hard bargain.");}
    else if(newRound>=customer.type.pat){setWalkedOut(true);setMsg("I've had enough. Good day.");}
    else{
      var tooHigh=myPrice>maxOffer*1.2,impatient=newRound>=customer.type.pat-1;
      if(tooHigh&&impatient){var drop=Math.round(offer*rand(0.10,0.20));var newOffer2=Math.max(1,offer-drop);setOffer(newOffer2);setMsg("You're wasting my time. I'm lowering my offer.");}
      else{var bump=Math.round((maxOffer-offer)*rand(0.25,0.5));var newOffer=Math.min(maxOffer,offer+bump);setOffer(newOffer);setMsg(newOffer>=myPrice?"Alright, you've got a deal.":bump>step*2?"I can go up a bit. How's that?":"That's the best I can do.");if(newOffer>=myPrice)setDone(true);}
    }
  }
  return(<div style={{background:"#0a0704",border:"2px solid "+q.weaponColor+"66",borderRadius:12,padding:"20px 24px",marginBottom:6}}>
    <Row style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{fontSize:36,lineHeight:1}}>{customer.type.icon}</div>
        <div>
          <div style={{fontSize:16,color:"#f59e0b",letterSpacing:2,fontWeight:"bold"}}>{customer.type.name.toUpperCase()}</div>
          <div style={{fontSize:11,color:"#8a7a64",marginTop:3,display:"flex",alignItems:"center",gap:6}}>{mood.icon} {mood.label} · <span style={{fontSize:9,color:"#8a7a64",letterSpacing:1}}>PATIENCE</span><Pips count={customer.type.pat} filled={customer.type.pat-round} filledColor={walkedOut?"#ef4444":round>=customer.type.pat-1?"#fb923c":"#4ade80"} emptyColor="#2a1f0a" size={10}/></div>
        </div>
      </div>
      <div style={{textAlign:"right",background:"#0f0b06",border:"1px solid "+q.weaponColor+"44",borderRadius:8,padding:"8px 14px"}}>
        <SectionLabel style={{marginBottom:3}}>WANTS TO BUY</SectionLabel>
        <div style={{fontSize:14,color:q.weaponColor,fontWeight:"bold"}}>{q.label} {(MATS[weapon.matKey]&&MATS[weapon.matKey].name)||"Bronze"} {WEAPONS[weapon.wKey]&&WEAPONS[weapon.wKey].name}</div>
      </div>
    </Row>
    <div style={{background:"#141009",border:"1px solid #3d2e0f",borderRadius:10,padding:"14px 18px",marginBottom:16,fontSize:14,color:"#f0e6c8",fontStyle:"italic",lineHeight:1.6}}>"{msg}"</div>
    <div style={{display:"flex",gap:12,alignItems:"stretch",marginBottom:16}}>
      <div style={{flex:1,background:"#0a1a0a",border:"1px solid #4ade8033",borderRadius:8,padding:"12px 16px",textAlign:"center"}}><SectionLabel style={{marginBottom:6}}>THEIR OFFER</SectionLabel><div style={{fontSize:28,color:"#4ade80",fontWeight:"bold"}}>{offer}g</div></div>
      <div style={{flex:1,background:"#1a1209",border:"1px solid #f59e0b33",borderRadius:8,padding:"12px 16px",textAlign:"center"}}>
        <SectionLabel style={{marginBottom:6}}>YOUR PRICE</SectionLabel>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <button onClick={function(){if(!done)lower();}} disabled={done||priceAtOffer} style={{background:"#2a1f0a",border:"1px solid "+(done||priceAtOffer?"#3d2e0f":"#f59e0b"),borderRadius:4,color:done||priceAtOffer?"#4a3c2c":"#f59e0b",width:28,height:28,fontSize:16,cursor:done||priceAtOffer?"not-allowed":"pointer",fontFamily:"monospace",display:"flex",alignItems:"center",justifyContent:"center"}}>-</button>
          <span style={{fontSize:28,color:"#f59e0b",fontWeight:"bold",minWidth:60,textAlign:"center"}}>{myPrice}g</span>
        </div>
      </div>
    </div>
    <div style={{display:"flex",gap:8}}>
      <button onClick={function(){onSell(offer);}} disabled={offer<=0} style={{flex:2,background:offer<=0?"#0a0704":"#0a1a0a",border:"2px solid "+(offer<=0?"#2a1f0a":"#4ade80"),borderRadius:8,color:offer<=0?"#4a3c2c":"#4ade80",padding:"12px 0",fontSize:14,cursor:offer<=0?"not-allowed":"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Accept {offer}g</button>
      <button onClick={function(){if(!done&&!walkedOut){sfx.click();makeOffer();}}} disabled={done||walkedOut} style={{flex:2,background:done||walkedOut?"#0a0704":"#1a1209",border:"2px solid "+(done||walkedOut?"#2a1f0a":"#f59e0b"),borderRadius:8,color:done||walkedOut?"#4a3c2c":"#f59e0b",padding:"12px 0",fontSize:14,cursor:done||walkedOut?"not-allowed":"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Offer {myPrice}g</button>
      <button onClick={function(){sfx.click();onRefuse();}} style={{flex:1,background:"#1a0505",border:"2px solid #ef444466",borderRadius:8,color:"#ef4444",padding:"12px 0",fontSize:14,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Decline</button>
    </div>
  </div>);
}
function GoldPop({amount,onDone}){
  var [vis,setVis]=useState(true);
  useEffect(function(){var t=setTimeout(function(){setVis(false);setTimeout(onDone,400);},1200);return function(){clearTimeout(t);};},[]);
  if(!vis)return null;
  var positive=amount>0;
  return(<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",zIndex:500,pointerEvents:"none",fontFamily:"monospace",fontSize:18,fontWeight:"bold",color:positive?"#4ade80":"#ef4444",textShadow:"0 2px 8px rgba(0,0,0,0.9)",letterSpacing:2,whiteSpace:"nowrap"}}>{positive?"+":""}{amount}g</div>);
}
function MaterialsModal({inv,onClose,onSell,sfx}){
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={function(e){if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"#0f0b06",border:"1px solid #3d2e0f",borderRadius:12,padding:"20px",width:"min(500px,90vw)"}}>
      <Row style={{marginBottom:16}}><div style={{fontSize:16,color:"#f59e0b",letterSpacing:3}}>MATERIALS</div><button onClick={onClose} style={{background:"#2a1f0a",border:"1px solid #3d2e0f",borderRadius:5,color:"#f59e0b",padding:"5px 12px",cursor:"pointer",fontFamily:"monospace",fontSize:14}}>X</button></Row>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {Object.entries(MATS).map(function(e){var k=e[0],m=e[1],qty=inv[k]||0,sellPrice=Math.floor(m.price/2);return(<div key={k} style={{background:"#1a1209",border:"1px solid "+(qty>0?m.color+"66":"#2a1f0a"),borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:11,color:m.color,fontWeight:"bold",letterSpacing:1,marginBottom:6}}>{m.name.toUpperCase()}</div><div style={{fontSize:26,color:qty>0?"#f0e6c8":"#2a1f0a",fontWeight:"bold",lineHeight:1,marginBottom:6,textAlign:"center"}}>{qty}</div>{qty>0&&<ActionBtn onClick={function(){if(sfx)sfx.click();onSell(k,1);}} small={true} style={{width:"100%",textAlign:"center"}}>Sell {sellPrice}g</ActionBtn>}</div>);})}
      </div>
    </div>
  </div>);
}
function ShopModal({gold,inv,upgrades,unlockedBP,matDiscount,globalMatMult,royalQuest,onBuy,onUpgrade,onBuyBP,onClose,sfx}){
  var [tab,setTab]=useState("materials");
  var [amt,setAmt]=useState(Object.fromEntries(Object.keys(MATS).map(function(k){return [k,1];})));
  var matP=Object.fromEntries(Object.entries(MATS).map(function(e){var k=e[0],baseP=MATS[k].price;var p=matDiscount&&matDiscount.key===k?Math.round(baseP*matDiscount.mult):baseP;p=Math.round(p*(globalMatMult||1.0));return [k,p];}));
  var tC=["#a0a0a0","#60a5fa","#4ade80","#c084fc"];
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={function(e){if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"#0f0b06",border:"1px solid #3d2e0f",borderRadius:12,width:"min(680px,95vw)",height:"min(560px,85vh)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <Row style={{padding:"16px 20px",borderBottom:"1px solid #2a1f0a"}}><div style={{fontSize:18,color:"#f59e0b",letterSpacing:3}}>MARKET</div><Row style={{gap:8}}><span style={{fontSize:16,color:"#f59e0b",fontWeight:"bold"}}>{gold}g</span><button onClick={function(){if(sfx)sfx.click();onClose();}} style={{background:"#2a1f0a",border:"1px solid #3d2e0f",borderRadius:5,color:"#f59e0b",padding:"5px 12px",cursor:"pointer",fontFamily:"monospace",fontSize:14}}>X</button></Row></Row>
      <div style={{display:"flex",borderBottom:"1px solid #2a1f0a"}}>{[["materials","Materials"],["blueprints","Blueprints"],["upgrades","Upgrades"]].map(function(p){var k=p[0],l=p[1];return <div key={k} onClick={function(){if(sfx)sfx.click();setTab(k);}} style={{flex:1,padding:"12px",textAlign:"center",fontSize:13,letterSpacing:2,cursor:"pointer",color:tab===k?"#f59e0b":"#8a7a64",borderBottom:tab===k?"3px solid #f59e0b":"3px solid transparent"}}>{l.toUpperCase()}</div>;})}</div>
      <div style={{overflowY:"auto",padding:"16px 18px",flex:1}}>
        {tab==="materials"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>{Object.entries(MATS).map(function(e){var k=e[0],m=e[1],p=matP[k],isD=matDiscount&&matDiscount.key===k&&matDiscount.mult<1,maxAfford=Math.floor(gold/p);return(<Panel key={k} style={{padding:"12px 14px"}}><Row><div><div style={{fontSize:13,color:m.color,letterSpacing:1,fontWeight:"bold",marginBottom:3}}>{m.name.toUpperCase()}{isD&&<span style={{fontSize:10,color:"#4ade80",marginLeft:8}}>DISCOUNTED</span>}</div><div style={{fontSize:18,color:"#f0e6c8",fontWeight:"bold"}}>{inv[k]||0} <span style={{fontSize:11,color:"#5a4a38",fontWeight:"normal"}}>owned</span></div></div><Row style={{gap:6}}><button onClick={function(){sfx.click();setAmt(function(a){var n=Object.assign({},a);n[k]=Math.max(1,a[k]-1);return n;});}} style={{background:"#2a1f0a",border:"2px solid #f59e0b",borderRadius:6,color:"#f59e0b",width:28,height:28,fontSize:16,cursor:"pointer",fontFamily:"monospace",fontWeight:"bold",display:"flex",alignItems:"center",justifyContent:"center"}}>-</button><span style={{fontSize:15,color:"#f59e0b",width:28,textAlign:"center",fontWeight:"bold",display:"inline-block"}}>{amt[k]}</span><button onClick={function(){sfx.click();setAmt(function(a){var n=Object.assign({},a);n[k]=Math.min(Math.max(1,maxAfford),a[k]+1);return n;});}} style={{background:"#2a1f0a",border:"2px solid #f59e0b",borderRadius:6,color:"#f59e0b",width:28,height:28,fontSize:16,cursor:"pointer",fontFamily:"monospace",fontWeight:"bold",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button><ActionBtn onClick={function(){onBuy(k,amt[k],p);}} disabled={gold<p||maxAfford===0} style={{width:90,textAlign:"center"}} small={true}>Buy {p*amt[k]}g</ActionBtn></Row></Row></Panel>);})}</div>)}
        {tab==="blueprints"&&(<div>{[1,2,3,4].map(function(tier){return(<div key={tier} style={{marginBottom:16}}><div style={{fontSize:12,color:tC[tier-1],letterSpacing:2,marginBottom:8,borderBottom:"1px solid "+tC[tier-1]+"33",paddingBottom:6}}>TIER {tier}</div>{Object.entries(WEAPONS).filter(function(e){return e[1].tier===tier;}).map(function(e){var k=e[0],w=e[1],owned=unlockedBP.includes(k),bpC=w.bpCost;var diffColor=w.difficulty<=2?"#a0a0a0":w.difficulty<=4?"#4ade80":w.difficulty<=6?"#60a5fa":w.difficulty<=7?"#818cf8":w.difficulty<=8?"#fbbf24":"#ef4444";return(<Panel key={k} color={owned?"#4ade80":null} style={{marginBottom:8,padding:"12px 14px"}}><Row><Row style={{gap:10,flex:1,alignItems:"center",justifyContent:"flex-start"}}><Badge value={w.difficulty} label="DIFF" color={diffColor}/><div><div style={{fontSize:13,color:owned?"#4ade80":"#f0e6c8",letterSpacing:1,fontWeight:"bold",marginBottom:4}}>{w.name.toUpperCase()}{royalQuest&&!royalQuest.fulfilled&&royalQuest.wKey===k&&<span style={{fontSize:11,background:"#f59e0b",color:"#0a0704",borderRadius:4,padding:"1px 6px",fontWeight:"bold",marginLeft:6}}>QUEST</span>}</div><Row style={{gap:8}}><SectionLabel>{w.matCost} mat</SectionLabel></Row></div></Row>{owned?<span style={{fontSize:14,color:"#4ade80"}}>OWNED</span>:<ActionBtn onClick={function(){onBuyBP(k,bpC);}} disabled={gold<bpC} small={true}>{bpC}g</ActionBtn>}</Row></Panel>);})}</div>);})}</div>)}
        {tab==="upgrades"&&(<div>{[["forge","Forge - Heat QTE Speed"],["anvil","Anvil - Hammer QTE Speed"],["hammer","Hammer - Strike Multiplier"],["quench","Quench - Quench QTE Speed"],["furnace","Furnace - Normalize Penalty"]].map(function(p){var cat=p[0],label=p[1],cur=upgrades[cat],chain=UPGRADES[cat];return(<div key={cat} style={{marginBottom:16}}><div style={{fontSize:12,color:"#f59e0b",letterSpacing:2,marginBottom:8,borderBottom:"1px solid #2a1f0a",paddingBottom:6}}>{label.toUpperCase()}</div>{chain.map(function(u,i){var owned=i<=cur,next=i===cur+1,locked=i>cur+1;return(<Panel key={i} color={owned?"#4ade80":next?"#f59e0b":null} style={{marginBottom:6,opacity:locked?0.4:1,padding:"12px 14px"}}><Row><div><div style={{fontSize:13,color:owned?"#4ade80":next?"#f0e6c8":"#8a7a64",letterSpacing:1,fontWeight:"bold"}}>{u.name.toUpperCase()}</div><div style={{fontSize:11,color:"#8a7a64",marginTop:3}}>{u.desc}</div></div>{owned&&i>0&&<span style={{fontSize:14,color:"#4ade80"}}>OK</span>}{i===0&&<SectionLabel>BASE</SectionLabel>}{next&&<ActionBtn onClick={function(){onUpgrade(cat);}} disabled={gold<u.cost} small={true}>{u.cost}g</ActionBtn>}{locked&&<SectionLabel color="#3d2e0f">LOCKED</SectionLabel>}</Row></Panel>);})}</div>);})}</div>)}
      </div>
    </div>
  </div>);
}
function GameOver({day,gold,totalGoldEarned,onReset}){
  var rank=getSmithRank(totalGoldEarned),next=getNextRank(totalGoldEarned);
  var rankPct=next?Math.round((totalGoldEarned-rank.threshold)/(next.threshold-rank.threshold)*100):100;
  var playerEntry={name:"You",gold:totalGoldEarned,isPlayer:true};
  var merged=FAKE_SMITHS.concat([playerEntry]).sort(function(a,b){return b.gold-a.gold;});
  var top10=merged.slice(0,10),playerPlaced=top10.some(function(e){return e.isPlayer;});
  return(<div style={{width:"100%",minHeight:"100vh",background:"#0a0704",display:"flex",alignItems:"flex-start",justifyContent:"center",fontFamily:"monospace",overflowY:"auto"}}>
    <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",width:"min(780px,96vw)",padding:"32px 16px 40px"}}>
      <div style={{fontSize:72,lineHeight:1,marginBottom:12}}>💀</div>
      <SectionLabel color="#ef444466" style={{fontSize:11,letterSpacing:6,marginBottom:6}}>BY ORDER OF THE CROWN</SectionLabel>
      <div style={{fontSize:38,color:"#ef4444",fontWeight:"bold",letterSpacing:5,marginBottom:4}}>EXECUTED</div>
      <SectionLabel style={{letterSpacing:3,marginBottom:28}}>THE KING HAS LOST HIS PATIENCE</SectionLabel>
      <div style={{width:"100%",display:"flex",gap:14,alignItems:"flex-start",marginBottom:20}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
          <Panel color="#f59e0b" style={{padding:"18px 20px"}}>
            <SectionLabel color="#8a7a64" style={{letterSpacing:3,marginBottom:6}}>FINAL SMITH RANK</SectionLabel>
            <div style={{fontSize:22,color:"#fbbf24",fontWeight:"bold",letterSpacing:2,marginBottom:4}}>{rank.name.toUpperCase()}</div>
            <div style={{fontSize:11,color:"#f59e0b",marginBottom:10}}>Total earned: <span style={{fontWeight:"bold",color:"#fbbf24"}}>{totalGoldEarned}g</span></div>
            {next?(<><div style={{height:8,background:"#1a1209",borderRadius:4,overflow:"hidden",border:"1px solid #2a1f0a",marginBottom:4}}><div style={{height:"100%",width:rankPct+"%",background:"linear-gradient(90deg,#f59e0b,#fbbf24)",borderRadius:4}}/></div><SectionLabel>{rankPct}% toward {next.name.toUpperCase()}</SectionLabel></>):(<div style={{fontSize:11,color:"#fbbf24",letterSpacing:2}}>LEGENDARY STATUS ACHIEVED</div>)}
          </Panel>
          <Panel style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:10}}>
            {[["DAYS SURVIVED",day,"#f59e0b"],["GOLD ON HAND",gold+"g","#fbbf24"],["TOTAL GOLD EARNED",totalGoldEarned+"g","#4ade80"]].map(function(r){return(<div key={r[0]} style={{borderBottom:"1px solid #1a1209",paddingBottom:8}}><InfoRow label={r[0]} value={r[1]} color={r[2]}/></div>);})}
            <InfoRow label="EPITAPH" color="#c8b89a" valueStyle={{fontStyle:"italic",fontSize:10,maxWidth:180,textAlign:"right"}} value={(EPITAPHS.find(function(e){return totalGoldEarned>=e.threshold;})||EPITAPHS[EPITAPHS.length-1]).text}/>
          </Panel>
        </div>
        <Panel style={{flex:1,padding:"14px 16px"}}>
          <SectionLabel color="#f59e0b" style={{letterSpacing:3,marginBottom:12}}>HALL OF SMITHS</SectionLabel>
          {top10.map(function(entry,i){var isP=entry.isPlayer,r=getSmithRank(entry.gold),medalColor=i===0?"#fbbf24":i===1?"#a0a0a0":i===2?"#fb923c":"#3d2e0f";return(<div key={i} style={{display:"flex",alignItems:"center",gap:8,background:isP?"#1a1500":"#0a0704",border:"1px solid "+(isP?"#f59e0b":"#2a1f0a"),borderRadius:7,padding:"7px 10px",marginBottom:5}}><div style={{width:20,height:20,borderRadius:4,background:medalColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:"bold",color:i<3?"#0a0704":"#8a7a64",flexShrink:0}}>{i+1}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:isP?"#fbbf24":"#f0e6c8",fontWeight:isP?"bold":"normal",letterSpacing:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{isP?"YOU":entry.name}</div><SectionLabel>{r.name}</SectionLabel></div><div style={{fontSize:13,color:isP?"#fbbf24":"#f59e0b",fontWeight:"bold",flexShrink:0}}>{entry.gold.toLocaleString()}g</div></div>);})}
          {!playerPlaced&&(<div style={{marginTop:8,borderTop:"1px solid #2a1f0a",paddingTop:8}}><SectionLabel style={{marginBottom:5,textAlign:"center"}}>YOUR RUN</SectionLabel><div style={{display:"flex",alignItems:"center",gap:8,background:"#1a1500",border:"1px solid #f59e0b",borderRadius:7,padding:"7px 10px"}}><div style={{width:20,height:20,borderRadius:4,background:"#2a1f0a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:"bold",color:"#8a7a64",flexShrink:0}}>{merged.findIndex(function(e){return e.isPlayer;})+1}</div><div style={{flex:1}}><div style={{fontSize:12,color:"#fbbf24",fontWeight:"bold",letterSpacing:1}}>YOU</div><SectionLabel color="#f59e0b">{rank.name}</SectionLabel></div><div style={{fontSize:13,color:"#fbbf24",fontWeight:"bold"}}>{totalGoldEarned.toLocaleString()}g</div></div></div>)}
        </Panel>
      </div>
      <DangerBtn onClick={onReset}>Try Again</DangerBtn>
    </div>
  </div>);
}
function ScaleWrapper({children}){
  var DESIGN_W=1100;var [scale,setScale]=useState(1);var containerRef=useRef(null),innerRef=useRef(null);
  useEffect(function(){var outer=containerRef.current,inner=innerRef.current;if(!outer||!inner)return;function recalc(){var ow=outer.clientWidth,oh=outer.clientHeight,ih=inner.scrollHeight||820,s=Math.min(ow/DESIGN_W,oh/ih,1.5);setScale(s);}var ro=new ResizeObserver(recalc);ro.observe(outer);ro.observe(inner);recalc();return function(){ro.disconnect();};},[]);
  return(<div ref={containerRef} style={{width:"100%",height:"100vh",overflow:"hidden",background:"#0a0704",display:"flex",alignItems:"center",justifyContent:"center"}}><div ref={innerRef} style={{width:DESIGN_W,transformOrigin:"center center",transform:"scale("+scale+")",flexShrink:0}}>{children}</div></div>);
}
function SplashScreen({onEnter}){
  var [pulse,setPulse]=useState(false);
  useEffect(function(){var iv=setInterval(function(){setPulse(function(p){return !p;});},1100);return function(){clearInterval(iv);};},[]);
  return(<div onClick={onEnter} style={{width:"100%",height:"100%",background:"#0a0704",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",fontFamily:"monospace",userSelect:"none",gap:24}}>
    <div style={{display:"flex",gap:16,fontSize:48}}>⚒️🔥⚔️</div>
    <div style={{fontSize:42,color:"#f59e0b",fontWeight:"bold",letterSpacing:5,textAlign:"center"}}>THE WOBBLY ANVIL</div>
    <SectionLabel style={{letterSpacing:4,fontSize:10}}>A ROYAL BLACKSMITH'S TALE</SectionLabel>
    <div style={{marginTop:32,fontSize:13,letterSpacing:4,color:pulse?"#f59e0b":"#5a4a38",transition:"color 0.4s",fontWeight:"bold"}}>— CLICK ANYWHERE TO ENTER —</div>
  </div>);
}
var FTUE_TOASTS=[
  {title:"TIME & STAMINA",msg:"Every action costs hours — forging, resting, promoting. Sleep ends the day and starts a new one.\n\nOnce the clock passes midnight you can no longer take any actions except Sleep. Plan your day accordingly.\n\nStamina limits how many forge sessions you can do. When you run out, you must Rest or Sleep before you can forge again."},
  {title:"THE FORGE",msg:"Forging has three steps: Heat, Hammer, Quench. Each is a quick-time event where you click at the right moment.\n\nYour stats and equipment upgrades affect how fast the needle moves. Better gear = more forgiving timing."},
  {title:"HEATING",msg:"Click when the needle is in the green zone. Hit the peak for bonus hammer strikes. Miss the zone entirely and you get fewer hits.\n\nThe bar moves faster for harder weapons and materials. Precision stat and Forge upgrade slow it down."},
  {title:"HAMMERING",msg:"Click when the needle is near center. PERFECT gives the most quality, GOOD gives some, MISS loses quality.\n\nYou get 3-5 strikes depending on your heat result. Technique stat and Hammer upgrade increase your points per hit."},
  {title:"STRESS & SESSIONS",msg:"Each hammer session adds one stress pip. At max stress there is a chance the weapon shatters.\n\nUse Normalize to trade some quality for reduced stress, letting you keep forging. Or just Quench early with what you have."},
  {title:"QUENCHING",msg:"The final step. Three tiers: center = +5 quality, middle band = no change, outer edge = quality loss. Miss entirely and the weapon is destroyed.\n\nA Furnace upgrade reduces normalize quality loss."},
  {title:"SELLING",msg:"Customers visit daily and offer to buy whatever is on your shelf. You can counter their offer or accept.\n\nRoyal Decrees pay big bonuses but missing the deadline costs reputation. Hit zero reputation and it is game over."},
  {title:"THE MARKET",msg:"The Shop button opens the Market where you can buy materials, unlock weapon blueprints, and upgrade your equipment.\n\nUpgrades to your Forge, Anvil, Hammer, Quench, and Furnace improve your forging capabilities."},
  {title:"OPTIONS & SOUND",msg:"The Options button lets you toggle background music and adjust volume for SFX and music separately.\n\nIf the music is not your thing, turn it off in there."},
];
function MainMenu({onStart,sfx}){
  var [flicker,setFlicker]=useState(false);var [ftueIdx,setFtueIdx]=useState(null);var [flashing,setFlashing]=useState(false);
  useEffect(function(){var iv=setInterval(function(){setFlicker(function(f){return !f;});},1800);var ft=setTimeout(function(){setFlashing(true);},3000);return function(){clearInterval(iv);clearTimeout(ft);};},[]);
  function openFtue(){setFlashing(false);setFtueIdx(0);}
  return(<div style={{background:"#0a0704",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"monospace",color:"#f0e6c8",padding:"28px 32px"}}>
    {ftueIdx!==null&&(<div onClick={function(){setFtueIdx(function(i){return i+1<FTUE_TOASTS.length?i+1:null;});}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><div style={{background:"#0c0905",border:"4px solid #f59e0b",borderRadius:20,padding:"36px 44px",width:"min(440px,90%)",display:"flex",flexDirection:"column",gap:16,textAlign:"center"}}><div style={{fontSize:13,color:"#f59e0b",letterSpacing:3,fontWeight:"bold"}}>{FTUE_TOASTS[ftueIdx].title}</div><div style={{fontSize:14,color:"#c8b89a",lineHeight:1.8,whiteSpace:"pre-line"}}>{FTUE_TOASTS[ftueIdx].msg}</div><div style={{fontSize:10,color:"#4a3c2c",letterSpacing:2}}>{ftueIdx<FTUE_TOASTS.length-1?"CLICK FOR NEXT":"CLICK TO CLOSE"} · {ftueIdx+1}/{FTUE_TOASTS.length}</div></div></div>)}
    <div style={{textAlign:"center",marginBottom:24}}><SectionLabel color="#5a4a38" style={{fontSize:11,letterSpacing:4,marginBottom:8}}>YEAR OF THE IRON CROWN</SectionLabel><div style={{fontSize:36,color:"#f59e0b",fontWeight:"bold",letterSpacing:4,marginBottom:4}}>THE WOBBLY ANVIL</div><SectionLabel style={{letterSpacing:3,marginBottom:14}}>A ROYAL BLACKSMITH'S TALE</SectionLabel><div style={{display:"flex",justifyContent:"center",gap:18,fontSize:28}}>🔥⚒️⚔️👑💰💀</div></div>
    <div style={{display:"flex",gap:16,alignItems:"stretch",width:"100%",maxWidth:1000,marginBottom:20}}>
      <div style={{background:"#0f0b06",border:"1px solid #3d2e0f",borderRadius:12,padding:"16px 18px",flex:1}}><div style={{fontSize:12,color:"#f59e0b",letterSpacing:2,marginBottom:8}}>🔨 YOUR ROLE</div>{["The previous Royal Blacksmith was executed. You have taken his place.","Heat metal, hammer it into shape, and plunge it into the quench. Your skill at each step determines the quality of the blade."].map(function(l,j){return <div key={j} style={{fontSize:12,color:"#c8b89a",lineHeight:1.9,marginBottom:j<1?8:0}}>{l}</div>;})}</div>
      <div style={{background:"#0f0b06",border:"2px solid #f59e0b",borderRadius:12,padding:"22px 24px",flex:1.4,position:"relative",boxShadow:"0 0 24px #f59e0b22"}}><div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:"#0a0704",padding:"0 10px"}}><span style={{fontSize:18}}>👑</span></div><div style={{fontSize:13,color:"#f59e0b",letterSpacing:3,marginBottom:10,fontWeight:"bold",textAlign:"center"}}>SERVE THE CROWN</div>{["The King issues personal orders — specific weapons of required quality, delivered on time. Fulfill them for gold and royal favour.","Let your reputation reach zero and the headsman pays a visit."].map(function(l,j){return <div key={j} style={{fontSize:12,color:"#c8b89a",lineHeight:1.9,marginBottom:j<1?8:0}}>{l}</div>;})} <div style={{marginTop:14,display:"flex",gap:8}}><div style={{flex:1,background:"#0a1a0a",border:"1px solid #4ade8033",borderRadius:6,padding:"6px 10px",fontSize:11,color:"#4ade80"}}>✓ Fulfil on time → gold + rep</div><div style={{flex:1,background:"#1a0a0a",border:"1px solid #ef444433",borderRadius:6,padding:"6px 10px",fontSize:11,color:"#ef4444"}}>✗ Fail → lose reputation</div></div><div style={{marginTop:8,fontSize:10,color:"#ef4444",letterSpacing:2,textAlign:"center",fontWeight:"bold"}}>REP HITS ZERO — YOU ARE EXECUTED</div></div>
      <div style={{background:"#0f0b06",border:"1px solid #3d2e0f",borderRadius:12,padding:"16px 18px",flex:1}}><div style={{fontSize:12,color:"#f59e0b",letterSpacing:2,marginBottom:8}}>🛒 RUN YOUR SHOP</div>{["Forge weapons and put them on the shelf. Customers walk in daily — adventurers, knights, nobles — each willing to pay based on quality.","Haggle for a better price or accept the offer. Every coin earned builds your Smith Rank."].map(function(l,j){return <div key={j} style={{fontSize:12,color:"#c8b89a",lineHeight:1.9,marginBottom:j<1?8:0}}>{l}</div>;})}</div>
    </div>
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <button onClick={function(){sfx.click();onStart();}} style={{background:"#2a1f0a",border:"3px solid #f59e0b",borderRadius:10,color:"#f59e0b",padding:"16px 80px",fontSize:18,cursor:"pointer",letterSpacing:4,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold",opacity:flicker?1:0.82,transition:"opacity 0.4s"}}>BEGIN JOURNEY</button>
      <button onClick={function(){sfx.click();openFtue();}} style={{background:"#141009",border:"2px solid "+(flashing?"#f59e0b":"#3d2e0f"),borderRadius:8,color:flashing?"#f59e0b":"#5a4a38",padding:"8px 24px",fontSize:12,cursor:"pointer",letterSpacing:3,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold",transition:"border-color 0.4s, color 0.4s"}}>? HOW TO PLAY</button>
      <SectionLabel color="#3d2e0f" style={{letterSpacing:2}}>THE FORGE AWAITS</SectionLabel>
    </div>
  </div>);
}

var SCRAP_TOASTS=["BACK TO THE PILE\nAt least the rats will be warm.","INTO THE SCRAP BIN\nA noble end for a wobbly blade.","ABANDONED\nThe metal will not miss you.","SCRAPPED\nNot every blade was meant to be."];
function randScrapToast(){return SCRAP_TOASTS[Math.floor(Math.random()*SCRAP_TOASTS.length)];}

var TRACKS = [{
  id: "forge_anthem",
  name: "The Forge Anthem",
  bpm: BPM,
  beatsPerBar: 4,
  timeSigLabel: "4/4",
  melody: MELODY,
  bass: BASS,
  hits: HITS,
  melodyTypes: MELODY_TYPES,
  trackDuration: QTE_TRACK_DURATION,
  rhythmDuration: RHYTHM_DURATION,
}];

var NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

function freqToNote(freq) {
  if (!freq || freq <= 0) return null;
  var semitones = 12 * Math.log2(freq / 440);
  var midi = Math.round(semitones) + 69;
  var name = NOTE_NAMES[((midi % 12) + 12) % 12];
  var octave = Math.floor(midi / 12) - 1;
  return { name: name, octave: octave, midi: midi, full: name + octave };
}

function freqsToChord(freqs) {
  if (!freqs || !Array.isArray(freqs) || freqs.length === 0) return null;
  var filtered = freqs.filter(function(f) { return f && f > 0; });
  if (filtered.length === 0) return null;
  var notes = filtered.map(freqToNote).filter(Boolean);
  if (notes.length === 0) return null;
  var seen = {};
  var unique = [];
  for (var i = 0; i < notes.length; i++) {
    if (!seen[notes[i].name]) { seen[notes[i].name] = true; unique.push(notes[i]); }
  }
  if (unique.length === 1) return unique[0].name;
  var sorted = unique.slice().sort(function(a, b) { return a.midi - b.midi; });
  var root = sorted[0];
  var intervals = [];
  for (var j = 1; j < sorted.length; j++) { intervals.push(((sorted[j].midi - root.midi) % 12 + 12) % 12); }
  intervals.sort(function(a, b) { return a - b; });
  var has = function(n) { return intervals.indexOf(n) >= 0; };
  var r = root.name;
  if (has(4) && has(7) && has(11)) return r + "maj7";
  if (has(3) && has(7) && has(10)) return r + "m7";
  if (has(4) && has(7) && has(10)) return r + "7";
  if (has(4) && has(7) && !has(10) && !has(11)) return r;
  if (has(3) && has(7) && !has(10) && !has(11)) return r + "m";
  if (has(3) && has(6)) return r + "dim";
  if (has(4) && has(8)) return r + "aug";
  if (has(5) && has(7) && !has(3) && !has(4)) return r + "sus4";
  if (has(2) && has(7) && !has(3) && !has(4)) return r + "sus2";
  if (intervals.length === 1 && has(7)) return r + "5";
  if (has(4) && has(7) && has(2)) return r + "add9";
  return unique.map(function(n) { return n.name; }).join("/");
}

function generateBeatGrid(track, speed) {
  speed = speed || 1.0;
  var beatMs = (60 / track.bpm * 1000) / speed;
  var totalMs = track.rhythmDuration;
  var beats = [];
  var beatIndex = 0;
  var t = 0;
  while (t < totalMs) {
    beats.push({ ms: t, isBarStart: (beatIndex % track.beatsPerBar) === 0, beatIndex: beatIndex });
    t += beatMs;
    beatIndex++;
  }
  return beats;
}

function generateChordTimeline(track, speed) {
  speed = speed || 1.0;
  var timeline = [];
  var t = 0;
  for (var i = 0; i < track.melody.length; i++) {
    var entry = track.melody[i];
    var freqs = entry[0];
    var dur = entry[1];
    if (freqs && freqs !== 0) {
      var chord = Array.isArray(freqs) ? freqsToChord(freqs) : freqToNote(freqs);
      if (chord) {
        var label = typeof chord === "object" ? chord.full : chord;
        if (timeline.length === 0 || timeline[timeline.length - 1].label !== label) {
          timeline.push({ ms: (t * 1000) / speed, label: label });
        }
      }
    }
    t += dur;
  }
  return timeline;
}

function RhythmQTE({onClose, sfx}) {
  var HITX = RHYTHM_HIT_X;
  var [speed, setSpeed] = useState(1.0);
  var [oneButton, setOneButton] = useState(false);
  var [phase, setPhase] = useState("countdown");
  var [countdown, setCountdown] = useState(3);
  var [notes, setNotes] = useState(function () { return generateRhythmNotes(); });
  var [displayScore, setDisplayScore] = useState(50);
  var [displayCombo, setDisplayCombo] = useState(0);
  var [displayTime, setDisplayTime] = useState(Math.ceil(RHYTHM_DURATION / 1000));
  var [holding, setHolding] = useState(null);
  var [lastMiss, setLastMiss] = useState(null);
  var [floats, setFloats] = useState([]);
  var [elapsed, setElapsed] = useState(0);
  var [rafStarted, setRafStarted] = useState(false);

  var startRef = useRef(null);
  var rafRef = useRef(null);
  var scoreRef = useRef(50);
  var comboRef = useRef(0);
  var elapsedRef = useRef(0);
  var holdingRef = useRef(null);
  var holdActiveRef = useRef(false);
  var lastDisplayedSecRef = useRef(-1);
  var lastMissTimer = useRef(null);
  var matchedRef = useRef(false);
  var deadNotesRef = useRef({});
  var lastPressMsRef = useRef(0);
  var lastReleaseMsRef = useRef(0);
  var scrollSpeed = RHYTHM_SCROLL_PX_PER_MS * speed;

  var buttons = oneButton
      ? [["⚒️", "hammer", "#60a5fa"]]
      : [["🔨", "hammer", "#60a5fa"], ["🔥", "bellows", "#f97316"]];

  function getLiveElapsed() { if (!startRef.current) return 0; return performance.now() - startRef.current; }
  function noteX(n, el) { return HITX + (n.spawnMs - el) * scrollSpeed; }
  function holdEndX(n, el) { return HITX + ((n.spawnMs + n.holdMs) - el) * scrollSpeed; }
  function addFloat(text, color) { var id = Date.now() + Math.random(); setFloats(function (f) { return f.concat([{ id: id, text: text, color: color, born: Date.now() }]); }); setTimeout(function () { setFloats(function (f) { return f.filter(function (x) { return x.id !== id; }); }); }, 500); }

  function adjustScore(delta) {
    scoreRef.current = Math.max(0, scoreRef.current + delta);
    setDisplayScore(scoreRef.current);
    if (delta > 0) { comboRef.current++; } else { comboRef.current = 0; }
    setDisplayCombo(comboRef.current);
  }

  function markMiss(label) { setLastMiss(label); }
  function markWrong(label) { setLastMiss(label); }

  function playHitTone(dur, vol, note) {
    var resolvedVol = vol;
    if (note && note.dynamic) {
      var baseVol = getDynVol(note.dynamic);
      if (note.dynamicEnd) {
        var endVol = getDynVol(note.dynamicEnd);
        var noteDurMs = note.holdMs > 0 ? note.holdMs : dur * 1000;
        var elapsed = getLiveElapsed() - note.spawnMs;
        var t = noteDurMs > 0 ? Math.max(0, Math.min(1, elapsed / noteDurMs)) : 0;
        resolvedVol = baseVol + (endVol - baseVol) * t;
      } else {
        resolvedVol = baseVol;
      }
    }
    var freq = sfx.getCurrentRootFreq(getLiveElapsed(), speed);
    if (freq && freq > 0) { sfx.tone(freq, "sine", dur, resolvedVol); }
    else { sfx.tone(440, "sine", dur, resolvedVol * 0.5); }
  }
  function fullReset() {
    cancelAnimationFrame(rafRef.current);
    if (sfx) sfx.stopQteMusic();
    scoreRef.current = 50; comboRef.current = 0; elapsedRef.current = 0;
    holdingRef.current = null; holdActiveRef.current = false; lastDisplayedSecRef.current = -1; startRef.current = null;
    matchedRef.current = false; deadNotesRef.current = {};
    setPhase("countdown"); setCountdown(3); setNotes(generateRhythmNotes(speed));
    setDisplayScore(50); setDisplayCombo(0); setDisplayTime(Math.ceil(RHYTHM_DURATION / 1000));
    setHolding(null); setLastMiss(null); setFloats([]); setElapsed(0); setRafStarted(false);
  }
  useEffect(function () { if (!lastMiss) return; clearTimeout(lastMissTimer.current); lastMissTimer.current = setTimeout(function () { setLastMiss(null); }, 600); return function () { clearTimeout(lastMissTimer.current); }; }, [lastMiss]);
  useEffect(function () { if (phase === "playing" && sfx) { sfx.setMode("qte"); sfx.playTrack(speed); } return function () { if (sfx) sfx.stopQteMusic(); }; }, [phase]);
  useEffect(function () { return function () { if (sfx) { sfx.stopQteMusic(); sfx.setMode("idle"); } }; }, []);
  useEffect(function () { if (phase !== "countdown") return; if (countdown <= 0) { setPhase("playing"); return; } var t = setTimeout(function () { setCountdown(function (c) { return c - 1; }); }, 1000); return function () { clearTimeout(t); }; }, [phase, countdown]);
  useEffect(function () {
    if (phase !== "playing") return;
    var travelMs = (RHYTHM_TRACK_W - HITX) / scrollSpeed;
    var startTime = performance.now() + travelMs;
    startRef.current = startTime;
    function loop() {
      var el = performance.now() - startTime;
      elapsedRef.current = el;
      setElapsed(el);
      setRafStarted(true);
      if (el >= RHYTHM_DURATION) { setPhase("done"); return; }
      var sec = Math.max(0, Math.ceil((RHYTHM_DURATION - el) / 1000));
      if (sec !== lastDisplayedSecRef.current) { lastDisplayedSecRef.current = sec; setDisplayTime(sec); }
      var anyChanged = false;
      setNotes(function (prev) {
        var next = prev.map(function (n) {
          if (n.hit || n.missed) return n;
          if (deadNotesRef.current[n.id]) return Object.assign({}, n, { missed: true });

          var blocked = false;
          for (var j = 0; j < prev.indexOf(n); j++) {
            var earlier = prev[j];
            if (earlier.type === n.type && !earlier.hit && !earlier.missed) { blocked = true; break; }
          }
          if (blocked) return n;

          var nx = noteX(n, el);
          if (n.holdMs > 0) {
            if (!n.headHit && nx < HITX - RHYTHM_HIT_WINDOW) {
              if (holdingRef.current === n.id) { setHolding(null); holdingRef.current = null; holdActiveRef.current = false; }
              anyChanged = true; adjustScore(-8); markMiss("MISS"); deadNotesRef.current[n.id] = true;
              return Object.assign({}, n, { missed: true });
            }
            var ex = holdEndX(n, el);
            if (ex < HITX - RHYTHM_HIT_WINDOW) {
              if (holdingRef.current === n.id) { setHolding(null); holdingRef.current = null; holdActiveRef.current = false; }
              anyChanged = true; adjustScore(-8); markMiss("MISS"); deadNotesRef.current[n.id] = true;
              return Object.assign({}, n, { missed: true });
            }
          } else {
            if (nx < HITX - RHYTHM_HIT_WINDOW) { anyChanged = true; adjustScore(-8); markMiss("MISS"); deadNotesRef.current[n.id] = true; return Object.assign({}, n, { missed: true }); }
          }
          return n;
        });
        return anyChanged ? next : prev;
      });
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return function () { cancelAnimationFrame(rafRef.current); };
  }, [phase]);
  function pressBtn(type) {
    if (phase !== "playing") return;
    var now = performance.now();
    if (now - lastPressMsRef.current < 50) return;
    lastPressMsRef.current = now;
    var el = getLiveElapsed();
    matchedRef.current = false;
    setNotes(function (prev) {
      var next = prev.slice();
      for (var i = 0; i < next.length; i++) {
        var n = next[i];
        if (n.hit || n.missed || (!oneButton && n.type !== type)) continue;
        if (deadNotesRef.current[n.id]) continue;

        var blocked = false;
        for (var j = 0; j < i; j++) {
          var pn = next[j];
          if (pn.type === n.type && !pn.hit && !pn.missed && !deadNotesRef.current[pn.id]) { blocked = true; break; }
        }
        if (blocked) continue;

        var nx = noteX(n, el);
        var dist = Math.abs(nx - HITX);
        if (n.holdMs === 0 && dist <= RHYTHM_HIT_WINDOW) {
          var isPerfect = dist <= RHYTHM_PERFECT_WINDOW;
          adjustScore(isPerfect ? 18 : 10);
          addFloat(isPerfect ? "PERFECT!" : "HIT!", isPerfect ? "#4ade80" : "#fbbf24");
          playHitTone(0.12, 0.15, n);
          deadNotesRef.current[n.id] = true;
          next[i] = Object.assign({}, n, { hit: true, hitAtMs: el });
          matchedRef.current = true;
          break;
        }
        if (n.holdMs > 0 && dist <= RHYTHM_HIT_WINDOW) {
          adjustScore(10);
          setHolding(n.id);
          holdingRef.current = n.id;
          holdActiveRef.current = true;
          playHitTone(0.08, 0.10, n);
          addFloat("HOLD!", "#60a5fa");
          next[i] = Object.assign({}, n, { headHit: true });
          matchedRef.current = true;
          break;
        }
        if (n.holdMs > 0 && nx < HITX - RHYTHM_HIT_WINDOW) {
          adjustScore(-8);
          markMiss("MISS");
          holdActiveRef.current = false;
          deadNotesRef.current[n.id] = true;
          next[i] = Object.assign({}, n, { missed: true });
          matchedRef.current = true;
          break;
        }
      }
      if (!matchedRef.current) { adjustScore(-5); markWrong("WRONG"); }
      return matchedRef.current ? next : prev;
    });
  }

  function releaseBtn(type) {
    if (phase !== "playing" || holdingRef.current === null) return;
    var now = performance.now();
    if (now - lastReleaseMsRef.current < 50) return;
    lastReleaseMsRef.current = now;
    var hid = holdingRef.current;
    var el = getLiveElapsed();
    setNotes(function (prev) {
      return prev.map(function (n) {
        if (n.id !== hid) return n;
        if (deadNotesRef.current[n.id]) return n;
        var ex = holdEndX(n, el);
        var dist = Math.abs(ex - HITX);
        if (dist <= RHYTHM_HIT_WINDOW) { adjustScore(18); playHitTone(0.18, 0.15, prev.find(function(x){return x.id===hid;})); addFloat("RELEASE!", "#60a5fa"); holdActiveRef.current = false; deadNotesRef.current[n.id] = true; return Object.assign({}, n, { hit: true, holdSuccess: true }); }
        adjustScore(-8); markWrong("EARLY"); holdActiveRef.current = false; deadNotesRef.current[n.id] = true;
        return Object.assign({}, n, { hit: false, missed: true, headHit: false });
      });
    });
    setHolding(null); holdingRef.current = null;
  }

  function handlePress(type) { pressBtn(type); }
  function handleRelease(type) { releaseBtn(type); }
  var el = elapsed;
  var HIT_ANIM_DURATION = 300;
  var canRender = phase === "done" || (phase === "playing" && rafStarted);

  var beatMarkers = [];
  if (canRender) {
    var beatInterval = 60000 / (120 * speed);
    for (var b = 0; b * beatInterval < RHYTHM_DURATION; b++) {
      var bx = HITX + (b * beatInterval - el) * scrollSpeed;
      if (bx > -10 && bx < RHYTHM_TRACK_W + 10) {
        beatMarkers.push({ key: b, x: bx, isBar: b % 4 === 0 });
      }
    }
  }

  var vis = canRender ? notes.filter(function (n) {
    if (n.hit && n.holdMs === 0) {
      var age = el - (n.hitAtMs || 0);
      if (age > HIT_ANIM_DURATION) return false;
      return true;
    }
    if (n.spawnMs > el + 250 && n.spawnMs - el > ((RHYTHM_TRACK_W - HITX) / scrollSpeed) * 1000) return false;
    var nx = noteX(n, el); var ex = n.holdMs > 0 ? holdEndX(n, el) : nx;
    return Math.max(nx, ex) > -40 && nx < RHYTHM_TRACK_W + 120;
  }) : [];

  return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", padding: "16px" }}>
        <div style={{ background: "#0f0b06", border: "2px solid #3d2e0f", borderRadius: 16, padding: "16px 20px", width: "min(860px,100%)", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#8a7a64", letterSpacing: 2 }}>RHYTHM QTE TEST</div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 2 }}>QUALITY</div><div style={{ fontSize: 32, color: "#f59e0b", fontWeight: "bold" }}>{displayScore}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: "#8a7a64", letterSpacing: 2 }}>TIME</div><div style={{ fontSize: 20, color: displayTime <= 3 ? "#ef4444" : "#f0e6c8", fontWeight: "bold" }}>{displayTime}s</div></div>
          </div>
          <div style={{ textAlign: "center", height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {displayCombo > 0 && <div style={{ fontSize: 13, color: displayCombo > 4 ? "#4ade80" : "#f59e0b", fontWeight: "bold", letterSpacing: 3 }}>{displayCombo}x COMBO</div>}
          </div>
          <div style={{ position: "relative", width: "100%", maxWidth: RHYTHM_TRACK_W }}>
            <div style={{ position: "relative", left: 0, right: 0, height: 20, pointerEvents: "none", overflow: "visible" }}>
              {floats.map(function (fl) { return (<div key={fl.id} style={{ position: "absolute", left: HITX + 8, bottom: 0, fontSize: 13, color: fl.color, fontWeight: "bold", letterSpacing: 2, zIndex: 20, pointerEvents: "none", animation: "floatUp 0.5s ease-out forwards" }}>{fl.text}</div>); })}
            </div>
            <div style={{ position: "relative", width: "100%", height: 80, background: "#050402", border: "1px solid #2a1f0a", borderRadius: 8, overflow: "hidden" }}>
              {[150, 300, 450, 600, 750].map(function (x) { return (<div key={x} style={{ position: "absolute", left: x, top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.04)", zIndex: 1 }} />); })}
              {phase === "countdown" && (<div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 56, color: "#f59e0b", fontWeight: "bold" }}>{countdown === 0 ? "GO!" : countdown}</div></div>)}
              {canRender && phase !== "countdown" && <>

                {canRender && beatMarkers.map(function(bm) {
                  return (<div key={bm.key} style={{ position: "absolute", left: bm.x, top: 0, bottom: 0, width: bm.isBar ? 1 : 1, background: bm.isBar ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)", zIndex: 2, pointerEvents: "none" }}>
                    {bm.isBar && <div style={{ position: "absolute", top: 2, left: 2, fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", lineHeight: 1 }}>{Math.floor(bm.key/4)+1}</div>}
                  </div>);
                })}
                {vis.map(function (n) {
                  var noteColor = n.type === "hammer" ? "#60a5fa" : "#f97316";
                  var isActiveHold = n.headHit && !n.missed && !n.hit;
                  if (n.hit && n.holdMs === 0) {
                    var age = el - (n.hitAtMs || 0);
                    var t = Math.min(age / HIT_ANIM_DURATION, 1);
                    var scale = 1 - t;
                    var offsetY = -40 * t;
                    var offsetX = -30 * t;
                    return (<div key={n.id} style={{ position: "absolute", top: "50%", left: HITX - 16 + offsetX, transform: "translateY(-50%) translateY(" + offsetY + "px) scale(" + scale + ")", fontSize: 30, zIndex: 15, opacity: scale, pointerEvents: "none", lineHeight: 1, filter: "brightness(2)" }}>{n.type === "hammer" ? "🔨" : "🔥"}</div>);
                  }
                  var nx = noteX(n, el);
                  if (n.holdMs > 0) {
                    var ex = holdEndX(n, el); var barL = Math.min(nx, ex); var barW = Math.max(0, Math.abs(ex - nx)); var tailInWindow = Math.abs(ex - HITX) <= RHYTHM_HIT_WINDOW && isActiveHold;
                    return (<div key={n.id} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
                      <div style={{ position: "absolute", top: "50%", left: barL, transform: "translateY(-50%)", height: 14, width: barW, background: noteColor, opacity: isActiveHold ? 0.8 : n.missed ? 0.1 : 0.35, borderRadius: 7, zIndex: 3 }} />
                      <div style={{ position: "absolute", top: "50%", left: nx - 16, transform: "translateY(-50%)", fontSize: 30, zIndex: 5, opacity: n.missed ? 0.15 : 1, lineHeight: 1, filter: isActiveHold ? "brightness(2)" : "none" }}>🔥</div>
                      <div style={{ position: "absolute", top: "50%", left: ex - 10, transform: "translateY(-50%)", fontSize: 16, zIndex: 5, opacity: n.missed ? 0.1 : 1, lineHeight: 1, filter: tailInWindow ? "brightness(2)" : "none" }}>🔥</div>
                    </div>);
                  }
                  return (<div key={n.id} style={{ position: "absolute", top: "50%", left: nx - 16, transform: "translateY(-50%)", fontSize: 30, zIndex: 5, opacity: n.missed ? 0.15 : 1, pointerEvents: "none", lineHeight: 1 }}>{n.type === "hammer" ? "🔨" : "🔥"}</div>);
                })}
              </>}
            </div>
          </div>
          {phase === "done" && (<div style={{ fontSize: 13, color: "#c8b89a" }}>COMPLETE — Final quality: <span style={{ color: "#f59e0b", fontWeight: "bold" }}>{displayScore}</span></div>)}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <button onClick={function () { setOneButton(function (v) { return !v; }); }} style={{ background: oneButton ? "#1a1a0a" : "#141009", border: "2px solid " + (oneButton ? "#f59e0b" : "#3d2e0f"), borderRadius: 8, color: oneButton ? "#f59e0b" : "#5a4a38", padding: "6px 18px", fontSize: 11, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace", fontWeight: "bold" }}>{oneButton ? "SWITCH TO TWO BUTTONS" : "SWITCH TO ONE BUTTON"}</button>
            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              {buttons.map(function (b) {
                var isH = holding !== null;
                return (<button key={b[1]} onMouseDown={function () { handlePress(b[1]); }} onMouseUp={function () { handleRelease(b[1]); }} onTouchStart={function (e) { e.preventDefault(); handlePress(b[1]); }} onTouchEnd={function (e) { e.preventDefault(); handleRelease(b[1]); }} style={{ width: 80, height: 80, borderRadius: 12, background: isH ? b[2] + "44" : "#1a1209", border: "3px solid " + (isH ? b[2] : b[2] + "88"), fontSize: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.05s,border-color 0.05s", userSelect: "none" }}>{b[0]}</button>);
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={function () { setSpeed(function (s) { return Math.max(0.5, parseFloat((s - 0.25).toFixed(2))); }); }} style={{ background: "#141009", border: "1px solid #f59e0b", borderRadius: 6, color: "#f59e0b", padding: "5px 10px", fontSize: 14, cursor: "pointer", fontFamily: "monospace" }}>−</button>
            <span style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 2, minWidth: 50, textAlign: "center", fontFamily: "monospace" }}>{speed.toFixed(2)}x</span>
            <button onClick={function () { setSpeed(function (s) { return Math.min(2.0, parseFloat((s + 0.25).toFixed(2))); }); }} style={{ background: "#141009", border: "1px solid #f59e0b", borderRadius: 6, color: "#f59e0b", padding: "5px 10px", fontSize: 14, cursor: "pointer", fontFamily: "monospace" }}>+</button>
            <button onClick={fullReset} style={{ background: "#141009", border: "1px solid #f59e0b", borderRadius: 6, color: "#f59e0b", padding: "5px 14px", fontSize: 11, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Restart</button>
            <button onClick={onClose} style={{ background: "#141009", border: "1px solid #3d2e0f", borderRadius: 6, color: "#5a4a38", padding: "5px 14px", fontSize: 11, cursor: "pointer", letterSpacing: 2, textTransform: "uppercase", fontFamily: "monospace" }}>Exit</button>
          </div>

        </div>
      </div>
  );
}

export default function App(){
  var sfx=useAudio();
  var [screen,setScreen]=useState("splash");var [showShop,setShowShop]=useState(false);var [showMaterials,setShowMaterials]=useState(false);var [showGiveUp,setShowGiveUp]=useState(false);var [showOptions,setShowOptions]=useState(false);
  var [toasts,setToasts]=useState([]);var [toastQueue,setToastQueue]=useState([]);var [activeToast,setActiveToast]=useState(null);var [gameOver,setGameOver]=useState(false);
  var [activeCustomer,setActiveCustomer]=useState(null);var [gold,setGold]=useState(STARTING_GOLD);var [totalGoldEarned,setTotalGoldEarned]=useState(0);
  var [inv,setInv]=useState({bronze:10,iron:4,steel:0,damascus:0,titanium:0,iridium:0,tungsten:0,mithril:0,orichalcum:0});
  var [finished,setFinished]=useState([]);var [day,setDay]=useState(1);var [hour,setHour]=useState(WAKE_HOUR);var [stamina,setStamina]=useState(BASE_STAMINA);
  var [forcedExhaustion,setForcedExhaustion]=useState(false);var [lastSleepHour,setLastSleepHour]=useState(0);var [priceBonus,setPriceBonus]=useState(1.0);var [priceDebuff,setPriceDebuff]=useState(1.0);
  var [matDiscount,setMatDiscount]=useState(null);var [globalMatMult,setGlobalMatMult]=useState(1.0);var [guaranteedCustomers,setGuaranteedCustomers]=useState(false);
  var [custVisitsToday,setCustVisitsToday]=useState(0);var [maxCustToday,setMaxCustToday]=useState(BASE_DAILY_CUSTOMERS);var [reputation,setReputation]=useState(4);
  var [level,setLevel]=useState(1);var [xp,setXp]=useState(0);var [statPoints,setStatPoints]=useState(0);var [stats,setStats]=useState(Object.assign({},STATS_DEF));
  var [upgrades,setUpgrades]=useState({anvil:0,hammer:0,forge:0,quench:0,furnace:0});var [unlockedBP,setUnlockedBP]=useState(["dagger","shortsword","axe"]);
  var [royalQuest,setRoyalQuest]=useState(null);var [questNum,setQuestNum]=useState(0);var [mEvent,setMEvent]=useState(null);var [hasSoldWeapon,setHasSoldWeapon]=useState(false);var [promoteUses,setPromoteUses]=useState(0);
  var [wipWeapon,setWipWeapon]=useState(null);var [wKey,setWKey]=useState("dagger");var [matKey,setMatKey]=useState(Object.keys(MATS)[0]);
  var [phase,setPhase]=useState(PHASES.IDLE);var [qualScore,setQualScore]=useState(0);var [stress,setStress]=useState(0);var [forgeSess,setForgeSess]=useState(0);var [bonusStrikes,setBonusStrikes]=useState(0);
  var [sessResult,setSessResult]=useState(null);var [forgeBubble,setForgeBubble]=useState(null);var [qteFlash,setQteFlash]=useState(null);var [strikesLeft,setStrikesLeft]=useState(0);
  var [pendingMystery,setPendingMystery]=useState(null);var [goodEventUsed,setGoodEventUsed]=useState(false);var [mysteryPending,setMysteryPending]=useState(false);
  var [mysteryShake,setMysteryShake]=useState(false);var [weaponShake,setWeaponShake]=useState(false);var [mysteryVignette,setMysteryVignette]=useState(null);var [mysteryVignetteOpacity,setMysteryVignetteOpacity]=useState(1);
  var [showRhythmTest,setShowRhythmTest]=useState(false);var [goldPops,setGoldPops]=useState([]);var [lateToastShown,setLateToastShown]=useState(false);

  useEffect(function(){if(hour>=24&&!lateToastShown&&screen==="game"){setLateToastShown(true);var lt=LATE_TOASTS[Math.floor(Math.random()*LATE_TOASTS.length)];addToast(lt.msg,lt.icon,lt.color);}},[hour]);

  var qteProcessing=useRef(false),qtePosRef=useRef(0);
  var qualRef=useRef(0),stressRef=useRef(0),sessionStartQual=useRef(0);
  var finishedRef=useRef(finished),custVisRef=useRef(custVisitsToday),maxCustRef=useRef(maxCustToday);
  var guaranteedCustomersRef=useRef(false);guaranteedCustomersRef.current=guaranteedCustomers;
  var phaseRef=useRef(phase),royalQuestRef=useRef(royalQuest),fbTimerRef=useRef(null),gameStarted=useRef(false);
  finishedRef.current=finished;custVisRef.current=custVisitsToday;maxCustRef.current=maxCustToday;phaseRef.current=phase;royalQuestRef.current=royalQuest;

  var weapon=WEAPONS[wKey]||WEAPONS.dagger,matData=MATS[matKey]||MATS.bronze,matDiffMod=matData.diffMod;
  var effDiff=weapon.difficulty+matDiffMod;
  var isExhausted=stamina<=0||forcedExhaustion,sessCost=isExhausted?4:2,maxStam=BASE_STAMINA+stats.brawn;
  var heatWinLo=80,heatWinHi=88;
  var heatSpeedMult=calcSpeedMult(stats.precision+upgrades.forge,effDiff);
  var hammerSpeedMult=calcSpeedMult(stats.precision+upgrades.anvil,effDiff);
  var quenchSpeedMult=calcSpeedMult(stats.precision+upgrades.quench,effDiff);
  var strikeMult=calcStrikeMult(stats.technique+upgrades.hammer,effDiff);
  var activeSpeedMult=phase===PHASES.HEAT?heatSpeedMult:phase===PHASES.QUENCH?quenchSpeedMult:hammerSpeedMult;
  var speedLabel=activeSpeedMult<0.95?"EASY":activeSpeedMult>1.05?"HARD":"NORMAL";
  var speedColor=activeSpeedMult<0.95?"#4ade80":activeSpeedMult>1.05?"#ef4444":"#f59e0b";
  var strikeLabel=strikeMult>1.05?"PRECISE":strikeMult<0.95?"CLUMSY":"STEADY";
  var strikeColor=strikeMult>1.05?"#4ade80":strikeMult<0.95?"#ef4444":"#f59e0b";
  var stressColor=stress===0?"#4ade80":stress===1?"#fbbf24":stress===2?"#fb923c":"#ef4444";
  var stressLabel2=stress===0?"CALM":stress===1?"TENSE":stress===2?"STRAINED":"CRITICAL";
  var showBars=qualScore>0&&phase!==PHASES.SELECT&&phase!==PHASES.SELECT_MAT&&phase!==PHASES.IDLE;
  var isQTEActive=phase===PHASES.HEAT||phase===PHASES.HAMMER||phase===PHASES.QUENCH;
  var isForging=phase!==PHASES.IDLE&&phase!==PHASES.SELECT&&phase!==PHASES.SELECT_MAT;
  var isLocked=isQTEActive||!!activeCustomer||toastQueue.length>0||!!activeToast||mysteryPending;

  function popGold(amount){setGoldPops(function(p){return p.concat([{id:Date.now()+Math.random(),amount:amount}]);});}
  function removeGoldPop(id){setGoldPops(function(p){return p.filter(function(x){return x.id!==id;});});}

  function resetGame(){
    sfx.setMode("off");gameStarted.current=false;qteProcessing.current=false;qualRef.current=0;stressRef.current=0;
    setScreen("splash");setShowShop(false);setShowMaterials(false);setShowGiveUp(false);setShowOptions(false);
    setToasts([]);setToastQueue([]);setActiveToast(null);setGameOver(false);setActiveCustomer(null);
    setGold(STARTING_GOLD);setTotalGoldEarned(0);setInv({bronze:10,iron:4,steel:0,damascus:0,titanium:0,iridium:0,tungsten:0,mithril:0,orichalcum:0});
    setFinished([]);setDay(1);setHour(WAKE_HOUR);setStamina(BASE_STAMINA);setForcedExhaustion(false);setLastSleepHour(0);setLateToastShown(false);
    setPriceBonus(1.0);setPriceDebuff(1.0);setMatDiscount(null);setGlobalMatMult(1.0);setGuaranteedCustomers(false);setCustVisitsToday(0);setMaxCustToday(BASE_DAILY_CUSTOMERS);setReputation(4);
    setLevel(1);setXp(0);setStatPoints(0);setStats(Object.assign({},STATS_DEF));setUpgrades({anvil:0,hammer:0,forge:0,quench:0,furnace:0});setUnlockedBP(["dagger","shortsword","axe"]);
    setRoyalQuest(null);setQuestNum(0);setMEvent(null);setHasSoldWeapon(false);setPromoteUses(0);
    setWipWeapon(null);setWKey("dagger");setMatKey(Object.keys(MATS)[0]);setPhase(PHASES.IDLE);
    setQualScore(0);setStress(0);setForgeSess(0);setBonusStrikes(0);setSessResult(null);setForgeBubble(null);setQteFlash(null);setStrikesLeft(0);
    setPendingMystery(null);setGoodEventUsed(false);setMysteryPending(false);setMysteryShake(false);setWeaponShake(false);setMysteryVignette(null);setMysteryVignetteOpacity(1);setGoldPops([]);
  }

  useEffect(function(){if(activeToast||toastQueue.length===0)return;var next=toastQueue[0];setToastQueue(function(q){return q.slice(1);});setActiveToast(next);if(next.color==="#ef4444")sfx.quenchFail();else if(next.color==="#c084fc")sfx.royal();else if(next.color==="#4ade80"||next.color==="#fbbf24"||next.color==="#f59e0b")sfx.toast();},[toastQueue,activeToast]);
  function onActiveToastDone(){setActiveToast(null);}
  function addToast(msg,icon,color,duration,locked){setToasts(function(t){return t.concat([{id:Date.now()+Math.random(),msg:msg,icon:icon,color:color,duration:duration||null,locked:locked||false}]);});}
  function removeToast(id){setToasts(function(t){return t.filter(function(x){return x.id!==id;});});}

  function earnGold(amount){if(amount===0)return;popGold(amount);sfx.coin();setGold(function(g){return g+amount;});setTotalGoldEarned(function(t){var nt=t+amount,or=getSmithRank(t),nr=getSmithRank(nt);if(nr.name!==or.name){sfx.levelup();setTimeout(function(){addToast("RANK UP!\n"+nr.name,"","#fbbf24");},100);}return nt;});}
  function spendGold(amount){if(amount===0)return;popGold(-amount);sfx.coinLoss();setGold(function(g){return g-amount;});}
  function statCost(currentLevel){return currentLevel<3?1:currentLevel<6?2:3;}
  function allocateStat(k){var cost=statCost(stats[k]);if(statPoints<cost)return;setStats(function(s){var n=Object.assign({},s);n[k]=s[k]+1;return n;});setStatPoints(function(p){return p-cost;});if(k==="brawn")setStamina(function(s){return s+1;});}
  var gainXp=useCallback(function(amount){setXp(function(prev){var cur=prev+amount,lv=level,pts=0;while(cur>=xpForLevel(lv)){cur-=xpForLevel(lv);lv++;pts++;}if(pts>0){setLevel(lv);setStatPoints(function(p){return p+pts;});sfx.levelup();}return cur;});},[level,sfx]);
  function loseXp(amount){setXp(function(prev){return Math.max(0,prev-amount);});}
  var changeRep=useCallback(function(delta,delay){if(gameOver)return;setReputation(function(r){var nr=Math.max(0,Math.min(10,r+delta));if(nr<=0){setTimeout(function(){sfx.gameover();setTimeout(function(){setGameOver(true);},2600);},(delay||0));}return nr;});},[sfx,gameOver]);

  function applyEvent(r){
    if(!r)return;
    if(r.goldDelta!==undefined&&r.goldDelta!==0){if(r.goldDelta>0){sfx.coin();earnGold(r.goldDelta);}else{sfx.quenchFail();spendGold(-r.goldDelta);}}
    if(r.inv!==undefined)setInv(r.inv);if(r.hour!==undefined)setHour(r.hour);if(r.stamina!==undefined)setStamina(r.stamina);
    if(r.finished!==undefined)setFinished(r.finished);if(r.forcedExhaustion)setForcedExhaustion(true);
    if(r.priceBonus)setPriceBonus(r.priceBonus);if(r.priceDebuff)setPriceDebuff(r.priceDebuff);if(r.matDiscount)setMatDiscount(r.matDiscount);if(r.globalMatMult)setGlobalMatMult(r.globalMatMult);if(r.guaranteedCustomers)setGuaranteedCustomers(true);if(r.extraCustomers)setMaxCustToday(BASE_DAILY_CUSTOMERS+r.extraCustomers);
  }

  function applyMystery(onComplete,wasForging){
    if(!pendingMystery||!pendingMystery.severity){setPendingMystery(null);if(onComplete)onComplete();return;}
    var pm=pendingMystery;setPendingMystery(null);setMysteryPending(true);setMysteryShake(true);setMysteryVignette(pm.severity==="good"?"#fbbf24":"#ef4444");
    setTimeout(function(){setMysteryShake(false);},3500);
    if(pm.severity==="good"){
      sfx.mysteryGood();var rGood=pm.effect({gold:gold,inv:inv,hour:hour,stamina:stamina,finished:finished});if(rGood.repDelta)changeRep(rGood.repDelta,7000);gainXp(Math.round(xp*0.10));
      var matName=rGood._mysteryMat?(MATS[rGood._mysteryMat]&&MATS[rGood._mysteryMat].name)||rGood._mysteryMat:"";
      addToast("A DIVINE PRESENCE\nA luminous figure drifted through the forge and vanished. It left "+rGood._mysteryMatQty+" "+matName+". +1 rep.","🌟","#fbbf24",5500,true);applyEvent(rGood);
    } else {
      sfx.fireTornado();sfx.dragonFlyby();var rBad=pm.effect({gold:gold,inv:inv,hour:hour,stamina:stamina,finished:finished});if(rBad.repDelta)changeRep(rBad.repDelta,7000);loseXp(Math.round(xp*0.15));
      var lostMatName=rBad._mysteryMat?(MATS[rBad._mysteryMat]&&MATS[rBad._mysteryMat].name)||rBad._mysteryMat:"materials";
      var wipLine=wasForging?(" Your "+WEAPONS[wKey].name+" was destroyed."):"";var weaponLine=rBad._mysteryWeaponLost?(" A "+rBad._mysteryWeaponLost.wName+" was reduced to cinders."):"";var goldLine=rBad._mysteryGoldLost?" -"+rBad._mysteryGoldLost+"g.":"";
      if(wasForging){setInv(function(i){var n=Object.assign({},i);n[matKey]=(n[matKey]||0)+Math.floor(WEAPONS[wKey].matCost*MAT_SCRAP_RECOVERY);return n;});setWipWeapon(null);}
      var matLine=rBad._mysteryMat?(" Your "+lostMatName+" is ash."):"";
      addToast("A DRAGON DESCENDS\nA shadow of scales and fire tore through the forge."+matLine+" -1 rep."+goldLine+wipLine+weaponLine,"💀","#ef4444",5500,true);applyEvent(rBad);
    }
    setTimeout(function(){setMysteryVignetteOpacity(0);},5000);setTimeout(function(){setTimeout(function(){setMysteryVignette(null);setMysteryVignetteOpacity(1);},1500);setMysteryPending(false);if(onComplete)onComplete();},7000);
  }

  var trySpawnCustomer=useCallback(function(newHour,nf){
    var items=nf||finishedRef.current;if(!items.length||custVisRef.current>=maxCustRef.current)return;if(newHour<9||newHour>21)return;if(phaseRef.current!==PHASES.IDLE&&phaseRef.current!==PHASES.SESS_RESULT)return;if(!guaranteedCustomersRef.current&&Math.random()>0.42)return;
    var shuffled=CUST_TYPES.slice().sort(function(){return Math.random()-0.5;});for(var i=0;i<shuffled.length;i++){var ct=shuffled[i],match=items.find(function(w){return getQ(w.score).scoreMin>=ct.minQ||ct.minQ===0;});if(match){setActiveCustomer({type:ct,weapon:match});setCustVisitsToday(function(v){return v+1;});sfx.doorbell();return;}}
  },[sfx]);

  function handleSell(price,weaponId){earnGold(price);setFinished(function(f){var nf=f.filter(function(w){return w.id!==weaponId;});setTimeout(function(){trySpawnCustomer(hour,nf);},500);return nf;});setHasSoldWeapon(true);setActiveCustomer(null);setTimeout(function(){addToast("SOLD!\n+"+price+"g","","#4ade80");sfx.toast();},100);}
  function handleRefuse(){setActiveCustomer(null);}
  function advanceTime(hrs,nf,useStam){if(hrs===undefined)hrs=sessCost;setHour(function(h){var next=h+hrs;setTimeout(function(){trySpawnCustomer(next,nf);},200);return next;});if(useStam){setStamina(function(s){return Math.max(0,s-1);});gainXp(6);}}
  function waitHour(){sfx.click();advanceTime(2,undefined,false);setStamina(function(s){return Math.min(maxStam,s+1);});}
  function promote(){sfx.click();advanceTime(1,undefined,true);setPromoteUses(function(p){return p+1;});var items=finishedRef.current;var shuffled=CUST_TYPES.slice().sort(function(){return Math.random()-0.5;});for(var i=0;i<shuffled.length;i++){var ct=shuffled[i],match=items.find(function(w){return getQ(w.score).scoreMin>=ct.minQ||ct.minQ===0;});if(match){setActiveCustomer({type:ct,weapon:match});setCustVisitsToday(function(v){return v+1;});sfx.doorbell();return;}}}
  function scavenge(){
    sfx.click();advanceTime(1,undefined,true);var matKeys=Object.keys(MATS);var matWeights=matKeys.map(function(_,i){return Math.max(1,matKeys.length-i);});var randMat=function(){return weightedPick(matKeys,matWeights);};var addMat=function(){var k=randMat();setInv(function(i){var n=Object.assign({},i);n[k]=(n[k]||0)+1;return n;});return k;};var goldReward=function(){return randi(5,5+Math.floor(level/2)*10);};var roll=Math.random();
    if(roll<0.05){var m=addMat();var g=goldReward();earnGold(g);var locked=Object.keys(WEAPONS).filter(function(k){return !unlockedBP.includes(k);});if(locked.length){var bp=locked[Math.floor(Math.random()*locked.length)];setUnlockedBP(function(u){return u.concat([bp]);});setTimeout(function(){addToast("JACKPOT!\n"+g+"g · 1 "+MATS[m].name+" · "+WEAPONS[bp].name+" blueprint","","#fbbf24");},200);}else{setTimeout(function(){addToast("JACKPOT!\n"+g+"g · 1 "+MATS[m].name,"","#fbbf24");},200);}}
    else if(roll<0.25){var m1=addMat();var m2=addMat();setTimeout(function(){addToast("SCAVENGED!\n1 "+MATS[m1].name+" · 1 "+MATS[m2].name,"","#a0a0a0");},200);}
    else if(roll<0.45){var g2=goldReward();earnGold(g2);setTimeout(function(){addToast("SCAVENGED!\nFound "+g2+"g","","#f59e0b");},200);}
    else{var m3=addMat();setTimeout(function(){addToast("SCAVENGED!\nFound 1 "+MATS[m3].name,"","#a0a0a0");},200);}
  }

  function buildDayQueue(newDay,state,pendingQuestNum){
    var ev=buildEvents(state);setMEvent(ev);
    if(ev&&ev.effect){if(ev.id==="mystery"&&ev.severity){if(!pendingMystery)setTimeout(function(){setPendingMystery({effect:ev.effect,severity:ev.severity});},150);}else{var r=ev.effect({gold:state.gold||STARTING_GOLD,inv:state.inv||{bronze:10,iron:4},hour:WAKE_HOUR,stamina:state.stamina||BASE_STAMINA,finished:state.finished||[]});setTimeout(function(){applyEvent(r);},150);}}
    var queue=[];queue.push({id:"gm_"+newDay,msg:"DAY "+newDay+"\nGood morning, blacksmith.",icon:"",color:"#f59e0b"});
    if(ev&&ev.id!=="slow"&&ev.id!=="mystery")queue.push({id:"ev_"+newDay,msg:ev.title+"\n"+ev.desc,icon:ev.icon,color:TAG_COLORS[ev.variantTag||ev.tag]||"#f59e0b"});
    if(pendingQuestNum!=null){var bp=state.unlockedBP||["dagger","shortsword","axe"],q2=genRoyalQuest(pendingQuestNum,bp,newDay,state.reputation||4);if(q2){setRoyalQuest(q2);setQuestNum(pendingQuestNum);sfx.royal();queue.push({id:"rq_"+newDay,msg:q2.name+"\nDemands "+q2.minQLbl+"+ "+q2.matReq.toUpperCase()+" "+q2.wName+(q2.qty>1?" x"+q2.qty:"")+" by Day "+q2.deadline,icon:"",color:"#f59e0b"});}}
    return queue;
  }

  function doSleep(){
    var late=Math.max(0,hour-24),ns=Math.max(1,maxStam-Math.floor(late)),newDay=day+1;
    var resolutionToast=null,spawnQuestNum=null;
    if(royalQuest&&newDay>=royalQuest.deadline){if(royalQuest.fulfilled){var rqR=royalQuest.reward,rqRep=royalQuest.repGain;earnGold(rqR);changeRep(rqRep);resolutionToast={msg:"DECREE COMPLETE\n+"+rqR+"g +"+rqRep+" rep",icon:"",color:"#f59e0b"};spawnQuestNum=questNum+1;}else{changeRep(-royalQuest.repLoss);resolutionToast={msg:"Quest Overdue!\n-"+royalQuest.repLoss+" reputation",icon:"",color:"#ef4444"};spawnQuestNum=questNum+1;}setRoyalQuest(null);}
    setLateToastShown(false);setDay(newDay);setHour(WAKE_HOUR);setStamina(ns);setCustVisitsToday(0);setMaxCustToday(BASE_DAILY_CUSTOMERS);setForcedExhaustion(false);setPriceBonus(1.0);setPriceDebuff(1.0);setMatDiscount(null);setGlobalMatMult(1.0);setGuaranteedCustomers(false);setPromoteUses(0);
    sfx.setMode("idle");if(isForging&&qualRef.current>0)takeBreak();else{setForgeBubble(null);setQteFlash(null);qteProcessing.current=false;}
    setActiveToast(null);sfx.resetDay();sfx.setMode("idle");
    setTimeout(function(){var state={gold:gold,inv:inv,finished:finished,hasSoldWeapon:hasSoldWeapon,lastSleepHour:hour,stamina:ns,unlockedBP:unlockedBP,reputation:reputation};var dayQueue=buildDayQueue(newDay,state,spawnQuestNum);var fullQueue=resolutionToast?[{id:"res_"+newDay,msg:resolutionToast.msg,icon:resolutionToast.icon,color:resolutionToast.color}].concat(dayQueue):dayQueue;setToastQueue(fullQueue);setTimeout(function(){trySpawnCustomer(9,finished);},600);},300);
  }
  function sleep(){if(pendingMystery&&pendingMystery.severity){applyMystery(doSleep);return;}doSleep();}
  function takeBreak(){setWipWeapon({wKey:wKey,matKey:matKey,qualScore:qualRef.current,stress:stressRef.current,forgeSess:forgeSess,sessResult:sessResult});qteProcessing.current=false;sfx.setMode("idle");setForgeBubble(null);setQteFlash(null);setPhase(PHASES.IDLE);setSessResult(null);}
  function resumeWip(){if(!wipWeapon)return;sfx.click();setWKey(wipWeapon.wKey);setMatKey(wipWeapon.matKey);qualRef.current=wipWeapon.qualScore;stressRef.current=wipWeapon.stress;setQualScore(wipWeapon.qualScore);setStress(wipWeapon.stress);setForgeSess(wipWeapon.forgeSess);setSessResult(wipWeapon.sessResult||null);setQteFlash(null);setForgeBubble(null);qteProcessing.current=false;setWipWeapon(null);setPhase(PHASES.SESS_RESULT);sfx.setMode("forge");}
  function scrapWip(){if(!wipWeapon)return;sfx.click();setInv(function(i){var n=Object.assign({},i),w=WEAPONS[wipWeapon.wKey];n[wipWeapon.matKey]=(n[wipWeapon.matKey]||0)+Math.floor(w.matCost*MAT_SCRAP_RECOVERY);return n;});addToast(randScrapToast(),"","#a0a0a0");setWipWeapon(null);}
  function triggerWeaponShake(){setWeaponShake(true);setTimeout(function(){setWeaponShake(false);},350);}
  function resetForge(){qteProcessing.current=false;sfx.setMode("idle");setForgeBubble(null);setQteFlash(null);setPhase(PHASES.IDLE);setQualScore(0);setStress(0);setForgeSess(0);setSessResult(null);stressRef.current=0;qualRef.current=0;}
  function scrapWeapon(){setInv(function(i){var n=Object.assign({},i);n[matKey]=(n[matKey]||0)+Math.floor(weapon.matCost*MAT_SCRAP_RECOVERY);return n;});addToast(randScrapToast(),"","#a0a0a0");resetForge();}
  function showForgeBubble(title,lines,color){clearTimeout(fbTimerRef.current);setForgeBubble({title:title,lines:lines,color:color});fbTimerRef.current=setTimeout(function(){setForgeBubble(null);},5000);}
  function confirmSelect(){
    if(stamina<=0)return;var have=inv[matKey]||0,needed=Math.max(0,weapon.matCost-have),buyPrice=MATS[matKey].price*needed;if(have<weapon.matCost&&gold<buyPrice)return;if(needed>0)spendGold(buyPrice);
    setInv(function(i){var n=Object.assign({},i);n[matKey]=(n[matKey]||0)+needed-weapon.matCost;return n;});qualRef.current=20;stressRef.current=0;setQualScore(20);setStress(0);setForgeSess(0);setSessResult(null);setQteFlash(null);qteProcessing.current=false;setPhase(PHASES.HEAT);sfx.setMode("forge");
  }
  function onForgeClick(){if(!isQTEActive||qteProcessing.current)return;qteProcessing.current=true;var pos=qtePosRef.current;if(phase===PHASES.HEAT)handleHeatFire(pos,false);else if(phase===PHASES.HAMMER)handleHammerFire(pos);else if(phase===PHASES.QUENCH)handleQuenchFire(pos);}
  function handleAutoFire(pos){if(qteProcessing.current)return;qteProcessing.current=true;handleHeatFire(pos,true);}
  function handleHeatFire(pos,isAuto){
    var tier=isAuto?HEAT_TIERS[4]:calcHeatResult(pos,heatWinLo,heatWinHi);if(!isAuto)sfx.heat(tier.id);setQteFlash(tier.label);
    var bs=tier.bonusStrikes,strikeTotal=3+bs;showForgeBubble("HEAT RESULT",[{text:strikeTotal+" strikes",color:bs>0?"#4ade80":tier.id==="poor"?"#f87171":"#c8b89a",bold:true}],tier.color);
    setTimeout(function(){setQteFlash(null);qteProcessing.current=false;setBonusStrikes(bs);setStrikesLeft(strikeTotal);sessionStartQual.current=qualRef.current;setPhase(PHASES.HAMMER);},QTE_FLASH_MS);
  }
  function handleHammerFire(pos){
    var tier=calcHammerResult(pos);sfx.hammer(tier.sfxKey);var rawPts=tier.pts,actualDelta=rawPts<0?rawPts:Math.round(rawPts*strikeMult*qualGainMult(qualRef.current));var newQ=clamp(qualRef.current+actualDelta,0,100);qualRef.current=newQ;setQualScore(newQ);var newL=strikesLeft-1;setStrikesLeft(newL);
    setQteFlash(tier.label+" "+(actualDelta>=0?"+":"")+actualDelta);
    setTimeout(function(){setQteFlash(null);qteProcessing.current=false;if(newQ<=0){sfx.shatter();triggerWeaponShake();setInv(function(i){var n=Object.assign({},i);n[matKey]=(n[matKey]||0)+Math.ceil(weapon.matCost*MAT_DESTROY_RECOVERY);return n;});addToast("WEAPON SHATTERED\n50% materials recovered.","","#ef4444");resetForge();return;}if(newL<=0)finishHammerSession();},QTE_FLASH_MS);
  }
  function finishHammerSession(){
    var delta=qualRef.current-sessionStartQual.current;var ns=Math.min(STRESS_MAX,stressRef.current+1),nq=qualRef.current;stressRef.current=ns;setStress(ns);setForgeSess(forgeSess+1);advanceTime(sessCost,undefined,true);
    var q=getQ(nq);setSessResult({delta:delta,nq:nq,quality:q,ns:ns,sessions:forgeSess+1});showForgeBubble("HAMMER RESULT",[{text:(delta>=0?"+":"")+delta+" quality",color:delta>0?"#4ade80":delta<0?"#f87171":"#c8b89a",bold:true}],delta>0?"#4ade80":delta<0?"#f87171":"#c8b89a");
    if(pendingMystery&&pendingMystery.severity&&Math.random()<0.5){takeBreak();applyMystery(function(){},true);return;}setPhase(PHASES.SESS_RESULT);
  }
  function attemptForge(){
    if(stress>=STRESS_MAX-1){var chance=stress>=STRESS_MAX?0.50:0.33;if(Math.random()<chance){sfx.shatter();triggerWeaponShake();setInv(function(i){var n=Object.assign({},i);n[matKey]=(n[matKey]||0)+Math.ceil(weapon.matCost*MAT_DESTROY_RECOVERY);return n;});addToast("WEAPON SHATTERED\n50% materials recovered.","","#ef4444");resetForge();return;}}setPhase(PHASES.HEAT);
  }
  function doNormalize(){
    var loLoss=[0.18,0.16,0.14,0.12,0.11,0.10,0.09,0.08,0.07][upgrades.furnace];var hiLoss=[0.28,0.25,0.22,0.19,0.17,0.15,0.13,0.11,0.09][upgrades.furnace];var lossPct=rand(loLoss,hiLoss),oldQ=qualRef.current;var nq=Math.max(0,Math.floor(oldQ*(1-lossPct))),ns=Math.max(0,stressRef.current-1);stressRef.current=ns;qualRef.current=nq;setStress(ns);setQualScore(nq);advanceTime(2,undefined,false);
    setSessResult({delta:nq-oldQ,nq:nq,quality:getQ(nq),ns:ns,sessions:forgeSess});showForgeBubble("NORMALIZE",[{text:(nq-oldQ)+" quality",color:"#f87171",bold:true},{text:"-1 stress",color:"#60a5fa",bold:true}],"#60a5fa");if(pendingMystery&&pendingMystery.severity){takeBreak();applyMystery(function(){});return;}setPhase(PHASES.SESS_RESULT);
  }
  function finishWeapon(nq){
    var q=getQ(nq),val=qualVal(wKey,matKey,nq,upgrades);var item={wKey:wKey,wName:weapon.name,matKey:matKey,score:nq,id:Date.now(),label:q.label,val:val,color:q.weaponColor};gainXp(Math.round((15+weapon.difficulty*5)*getQ(nq).xpMultiplier));sfx.setMode("idle");
    var rq=royalQuestRef.current,isQuestDelivery=false,questComplete=false,deliveredSoFar=0,questQty=1;
    if(rq&&!rq.fulfilled){var matOk=matKey===rq.matReq;if(wKey===rq.wKey&&nq>=rq.minQ&&matOk){isQuestDelivery=true;questQty=rq.qty||1;deliveredSoFar=(rq.fulfilledQty||0)+1;var nowFulfilled=deliveredSoFar>=questQty;questComplete=nowFulfilled;setRoyalQuest(function(r){return Object.assign({},r,{fulfilledQty:deliveredSoFar,fulfilled:nowFulfilled});});sfx.royal();}}
    var nf=finished;if(!isQuestDelivery){nf=finished.concat([item]);setFinished(nf);}
    var toastMsg=isQuestDelivery?(questComplete?"DECREE FULFILLED\n"+q.label+" "+weapon.name:"DELIVERED "+deliveredSoFar+"/"+questQty+"\n"+q.label+" "+weapon.name):q.label.toUpperCase()+" "+weapon.name+"\n~"+val+"g added to shelf";
    addToast(toastMsg,"",questComplete?"#4ade80":isQuestDelivery?"#f59e0b":q.weaponColor);
    stressRef.current=0;qualRef.current=0;setQualScore(0);setStress(0);setForgeSess(0);setSessResult(null);setForgeBubble(null);setPhase(PHASES.IDLE);if(!isQuestDelivery)setTimeout(function(){trySpawnCustomer(hour,nf);},400);
  }
  function handleQuenchFire(pos){
    var dist=Math.abs(colToPos(posToCol(pos))-50);var perfect=dist<=QUENCH_WIN*0.15,good=!perfect&&dist<=QUENCH_WIN*0.45,poor=!perfect&&!good&&dist<=QUENCH_WIN+1.2;
    sfx.click();if(perfect||good||poor)sfx.quench();else sfx.quenchFail();var flashLabel=perfect?"PERFECT! +5":good?"SOLID — NO CHANGE":poor?"ROUGH — QUALITY LOSS":"MISS - DESTROYED";setQteFlash(flashLabel);
    setTimeout(function(){
      setQteFlash(null);qteProcessing.current=false;
      if(perfect){var nq=clamp(qualRef.current+5,0,100);qualRef.current=nq;advanceTime(sessCost,undefined,true);finishWeapon(nq);}
      else if(good){var nq2=clamp(qualRef.current,0,100);qualRef.current=nq2;advanceTime(sessCost,undefined,true);finishWeapon(nq2);}
      else if(poor){var loss=randi(10,20),nq3=clamp(qualRef.current-loss,0,100);qualRef.current=nq3;advanceTime(sessCost,undefined,true);if(nq3<=0){sfx.shatter();triggerWeaponShake();setInv(function(i){var n=Object.assign({},i);n[matKey]=(n[matKey]||0)+Math.ceil(weapon.matCost*MAT_DESTROY_RECOVERY);return n;});addToast("WEAPON DESTROYED\n50% materials recovered.","","#ef4444");stressRef.current=0;qualRef.current=0;setQualScore(0);setStress(0);setForgeSess(0);setSessResult(null);setForgeBubble(null);setPhase(PHASES.IDLE);}else finishWeapon(nq3);}
      else{sfx.shatter();triggerWeaponShake();setInv(function(i){var n=Object.assign({},i);n[matKey]=(n[matKey]||0)+Math.ceil(weapon.matCost*MAT_DESTROY_RECOVERY);return n;});addToast("WEAPON DESTROYED\n50% materials recovered.","","#ef4444");stressRef.current=0;qualRef.current=0;setQualScore(0);setStress(0);setForgeSess(0);setSessResult(null);setForgeBubble(null);setPhase(PHASES.IDLE);}
    },QTE_FLASH_MS);
  }

  useEffect(function(){
    if(screen!=="game"||gameStarted.current)return;gameStarted.current=true;
    var state={gold:STARTING_GOLD,inv:{bronze:10,iron:4,steel:0,damascus:0,titanium:0,iridium:0,tungsten:0,mithril:0,orichalcum:0},finished:[],hasSoldWeapon:false,lastSleepHour:0,stamina:BASE_STAMINA,unlockedBP:["dagger","shortsword","axe"],reputation:4};
    setActiveToast(null);sfx.setMode("idle");setTimeout(function(){setToastQueue(buildDayQueue(1,state,0));},300);
  },[screen]);
  useEffect(function(){return function(){sfx.setMode("off");};},[]);

  var hourPct=Math.min(100,Math.max(0,100-((hour-WAKE_HOUR)/16)*100)),timeColor=hour<18?"#4ade80":hour<21?"#fbbf24":hour<24?"#fb923c":"#ef4444";
  var timeBarPct=hour>=24?100:hourPct;var timeBarClass=hour>=24?"blink-slow":"";
  var xpNeeded=xpForLevel(level),smithRank=getSmithRank(totalGoldEarned),nextRank=getNextRank(totalGoldEarned);

  if(gameOver)return <ScaleWrapper><GameOver day={day} gold={gold} totalGoldEarned={totalGoldEarned} onReset={resetGame}/></ScaleWrapper>;
  if(screen==="splash")return <ScaleWrapper><SplashScreen onEnter={function(){sfx.warmup();setTimeout(function(){sfx.fanfare();},80);setScreen("menu");}}/></ScaleWrapper>;
  if(screen==="menu")return <ScaleWrapper><MainMenu onStart={function(){setScreen("game");}} sfx={sfx}/></ScaleWrapper>;

  return(
      <>
        {showShop&&<ShopModal gold={gold} inv={inv} upgrades={upgrades} unlockedBP={unlockedBP} matDiscount={matDiscount} globalMatMult={globalMatMult} royalQuest={royalQuest} sfx={sfx} onClose={function(){setShowShop(false);}} onBuy={function(mat,qty,price){sfx.click();var c=price*qty;if(gold<c)return;sfx.coin();spendGold(c);setInv(function(i){var n=Object.assign({},i);n[mat]=(n[mat]||0)+qty;return n;});}} onUpgrade={function(cat){sfx.click();var nl=upgrades[cat]+1,u=UPGRADES[cat][nl];if(!u||gold<u.cost)return;spendGold(u.cost);setUpgrades(function(u2){var n=Object.assign({},u2);n[cat]=nl;return n;});}} onBuyBP={function(k,cost){sfx.click();if(gold<cost)return;spendGold(cost);setUnlockedBP(function(u){return u.concat([k]);});}}/>}
        {showMaterials&&<MaterialsModal inv={inv} sfx={sfx} onClose={function(){sfx.click();setShowMaterials(false);}} onSell={function(mat,qty){sfx.coin();var price=Math.floor(MATS[mat].price/2)*qty;setInv(function(i){var n=Object.assign({},i);n[mat]=Math.max(0,(n[mat]||0)-qty);return n;});earnGold(price);}}/>}
        {showGiveUp&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center"}}><Panel color="#ef4444" style={{padding:"24px",textAlign:"center",maxWidth:280}}><div style={{fontSize:13,color:"#ef4444",letterSpacing:2,marginBottom:8}}>GIVE UP?</div><div style={{fontSize:10,color:"#c8b89a",marginBottom:16,lineHeight:1.7}}>The king will not be pleased.</div><Row center={true} style={{gap:8}}><DangerBtn onClick={function(){setShowGiveUp(false);setGameOver(true);}}>Yes, Give Up</DangerBtn><ActionBtn onClick={function(){setShowGiveUp(false);}} color="#8a7a64" bg="#141009">Cancel</ActionBtn></Row></Panel></div>}
        <ScaleWrapper>
          <div className={(mysteryShake?"mystery-shake":"")+" "+(weaponShake?"weapon-shake":"")} style={{background:"#1a1209",fontFamily:"monospace",color:"#f0e6c8",position:"relative",display:"flex",flexDirection:"column"}}>
            {mysteryVignette&&<div style={{position:"fixed",inset:0,zIndex:9998,pointerEvents:"none",background:"radial-gradient(ellipse at center, transparent 20%, "+mysteryVignette+"cc 100%)",opacity:mysteryVignetteOpacity,transition:"opacity 1.5s"}}/>}
            <style>{`
            ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#0a0704;border-radius:3px}::-webkit-scrollbar-thumb{background:#3d2e0f;border-radius:3px}
            @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes blinkSlow{0%,100%{opacity:1}50%{opacity:0.15}}@keyframes goldPop{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-60px)}}
            .blink{animation:blink 0.9s step-start infinite}.blink-slow{animation:blinkSlow 1.6s ease-in-out infinite}.blink-fast{animation:blink 0.45s step-start infinite}
            @keyframes hammerHit{0%{transform:translateY(-50%) scale(1);opacity:1}100%{transform:translateY(calc(-50% - 24px)) scale(0);opacity:0}}.hammer-hit{animation:hammerHit 0.2s ease-out forwards;}
            @keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-32px)}}
            @keyframes weaponShake{0%{transform:translate(0,0)}20%{transform:translate(-4px,2px)}40%{transform:translate(4px,-2px)}60%{transform:translate(-2px,2px)}80%{transform:translate(2px,-1px)}100%{transform:translate(0,0)}}.weapon-shake{animation:weaponShake 0.35s ease-out forwards;}
            @keyframes mysteryShake{0%{transform:translate(0,0)}5%{transform:translate(-10px,5px)}10%{transform:translate(10px,-5px)}15%{transform:translate(-9px,8px)}20%{transform:translate(9px,-7px)}25%{transform:translate(-8px,6px)}30%{transform:translate(8px,-6px)}38%{transform:translate(-5px,4px)}46%{transform:translate(5px,-4px)}54%{transform:translate(-3px,3px)}62%{transform:translate(3px,-2px)}72%{transform:translate(-2px,2px)}82%{transform:translate(2px,-1px)}92%{transform:translate(-1px,1px)}100%{transform:translate(0,0)}}.mystery-shake{animation:mysteryShake 3.5s ease-out forwards;}
          `}</style>

            <div style={{background:"#0f0b06",borderBottom:"1px solid #3d2e0f",padding:"8px 14px"}}>
              <div style={{textAlign:"center",marginBottom:6,position:"relative"}}>
                <div style={{fontSize:14,fontWeight:"bold",color:"#f59e0b",letterSpacing:3}}>THE WOBBLY ANVIL</div>
                <SectionLabel style={{letterSpacing:2}}>ROYAL BLACKSMITH</SectionLabel>
                <div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",lineHeight:1}}><div style={{fontSize:11,color:"#8a7a64",letterSpacing:2,textAlign:"right",marginBottom:2}}>DAY</div><div style={{fontSize:32,color:"#f0e6c8",fontWeight:"bold",lineHeight:1,textAlign:"right"}}>{day}</div></div>
              </div>
              <div style={{display:"flex",gap:0,alignItems:"stretch"}}>
                <div style={{width:COL_W,flexShrink:0,marginRight:8,alignSelf:"stretch",display:"flex"}}>
                  <Tooltip title="SMITH RANK" text="Your rank grows as you earn gold. Sell better weapons for faster progression." below={true}>
                    <div style={{flex:1,background:"#0a0704",border:"1px solid #f59e0b44",borderRadius:8,padding:"10px 12px",display:"flex",flexDirection:"column",justifyContent:"space-between",cursor:"default",boxSizing:"border-box"}}>
                      <SectionLabel style={{marginBottom:5}}>SMITH RANK</SectionLabel>
                      <div style={{fontSize:14,color:"#fbbf24",fontWeight:"bold",letterSpacing:1,lineHeight:1.3}}>{smithRank.name.toUpperCase()}</div>
                      {nextRank&&<div style={{marginTop:8}}><div style={{height:7,background:"#1a1209",borderRadius:3,overflow:"hidden",border:"1px solid #2a1f0a"}}><div style={{height:"100%",background:"#f59e0b",borderRadius:3,width:Math.round((totalGoldEarned-smithRank.threshold)/(nextRank.threshold-smithRank.threshold)*100)+"%"}}/></div><SectionLabel style={{marginTop:3}}>NEXT: {nextRank.name.toUpperCase()}</SectionLabel></div>}
                      {!nextRank&&<div style={{fontSize:10,color:"#fbbf24",letterSpacing:1,marginTop:4}}>MAX RANK</div>}
                    </div>
                  </Tooltip>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{background:"#0a0704",border:"2px solid "+(royalQuest?(royalQuest.fulfilled?"#4ade8066":"#f59e0b55"):"#2a1f0a"),borderRadius:8,padding:"12px 16px",display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:140,maxHeight:140,overflow:"hidden"}}>
                    {royalQuest?(royalQuest.fulfilled?(<>
                      <Row style={{marginBottom:4}}><div style={{fontSize:13,color:"#4ade80",letterSpacing:1,fontWeight:"bold"}}>DECREE FULFILLED</div><div style={{textAlign:"right"}}><SectionLabel>DUE</SectionLabel><div style={{fontSize:18,color:"#4ade80",fontWeight:"bold",lineHeight:1}}>DAY {royalQuest.deadline}</div></div></Row>
                      <div style={{fontSize:13,color:"#4ade80",fontWeight:"bold",marginBottom:4}}>{royalQuest.wName} DELIVERED</div>
                      <div style={{fontSize:10,color:"#8a7a64"}}>Awaiting reward from <span style={{color:"#c8b89a",fontWeight:"bold"}}>{royalQuest.name}</span> — +{royalQuest.reward}g +{royalQuest.repGain} rep on sleep</div>
                    </>):(<>
                      <Row style={{marginBottom:4}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:13,color:"#f59e0b",letterSpacing:1,fontWeight:"bold"}}>ROYAL DECREE #{questNum+1}</div>{royalQuest.deadline===day+1&&<span className="blink-slow" style={{fontSize:10,color:"#ef4444",fontWeight:"bold",letterSpacing:1}}>DUE TOMORROW</span>}</div>
                        <div style={{textAlign:"right"}}><SectionLabel>DUE</SectionLabel><div style={{fontSize:18,color:"#f59e0b",fontWeight:"bold",lineHeight:1}}>DAY {royalQuest.deadline}</div></div>
                      </Row>
                      <div style={{fontSize:11,color:"#8a7a64",marginBottom:6}}>From: <span style={{color:"#c8b89a",fontWeight:"bold"}}>{royalQuest.name}</span></div>
                      <div style={{fontSize:14,color:"#f0e6c8",marginBottom:8,fontWeight:"bold"}}><span style={{color:getQ(royalQuest.minQ).weaponColor}}>{royalQuest.minQLbl}+</span>{" "}<span style={{color:(MATS[royalQuest.matReq]&&MATS[royalQuest.matReq].color)||"#a0a0a0"}}>{royalQuest.matReq.toUpperCase()}</span>{" "}{royalQuest.qty>1&&<span style={{color:"#f59e0b"}}>x{royalQuest.qty} </span>}{royalQuest.wName}{!unlockedBP.includes(royalQuest.wKey)&&<span style={{fontSize:10,color:"#fb923c",marginLeft:8}}>NO BLUEPRINT</span>}{royalQuest.qty>1&&<span style={{fontSize:11,color:"#4ade80",marginLeft:8}}>({royalQuest.fulfilledQty||0}/{royalQuest.qty} delivered)</span>}</div>
                      <div style={{display:"flex",gap:8}}>
                        <div style={{flex:1,background:"#0a1a0a",border:"1px solid #4ade8033",borderRadius:6,padding:"5px 8px"}}><div style={{fontSize:12,color:"#4ade80",fontWeight:"bold"}}>+{royalQuest.reward}g · +{royalQuest.repGain} rep</div></div>
                        <div style={{flex:1,background:"#1a0a0a",border:"1px solid #ef444433",borderRadius:6,padding:"5px 8px"}}><div style={{fontSize:12,color:"#ef4444",fontWeight:"bold"}}>-{royalQuest.repLoss} rep on fail</div></div>
                      </div>
                    </>)):(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><SectionLabel>AWAITING ROYAL DECREE</SectionLabel></div>)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{display:"flex",padding:"8px 10px",gap:0,alignItems:"stretch",flex:1}}>
              <div style={{width:COL_W,flexShrink:0,marginRight:8,display:"flex",flexDirection:"column",gap:6}}>
                <Tooltip title="LEVEL" text="Earn XP by forging and selling. Each level up grants a stat point." below={true}>
                  <Panel style={{cursor:"default"}}><SectionLabel style={{marginBottom:1}}>LEVEL</SectionLabel><div style={{fontSize:22,color:"#f59e0b",fontWeight:"bold",lineHeight:1}}>{level}</div><div style={{fontSize:8,color:"#8a7a64",marginTop:4,marginBottom:2}}>XP {xp}/{xpNeeded}</div><Bar value={xp} max={xpNeeded} color="#c084fc" h={6}/></Panel>
                </Tooltip>
                <RepPanel reputation={reputation}/>
                <StatPanel stats={stats} points={statPoints} onAllocate={allocateStat} sfx={sfx} locked={isLocked||isForging}/>
                <ForgeInfoPanel upgrades={upgrades}/>
              </div>

              <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6,alignSelf:"stretch",position:"relative"}}>
                {toasts.map(function(t){return <Toast key={t.id} msg={t.msg} icon={t.icon} color={t.color} duration={t.duration} locked={t.locked} onDone={function(){removeToast(t.id);}}/>;  })}
                {activeToast&&<Toast key={activeToast.id} msg={activeToast.msg} icon={activeToast.icon} color={activeToast.color} duration={activeToast.duration} locked={activeToast.locked} onDone={onActiveToastDone}/>}

                <div style={{background:"#0a0704",border:"2px solid "+(mEvent&&mEvent.id!=="slow"?"#f59e0b55":"#2a1f0a"),borderRadius:8,padding:"10px 12px",display:"flex",gap:12,alignItems:"flex-start",minHeight:60,maxHeight:60,overflow:"hidden"}}>
                  {mEvent&&mEvent.id!=="slow"?(<><span style={{fontSize:26,flexShrink:0,lineHeight:1}}>{mEvent.icon}</span><div style={{flex:1}}><Row style={{marginBottom:4}}><div style={{fontSize:12,color:"#f59e0b",letterSpacing:2,fontWeight:"bold"}}>{mEvent.title.toUpperCase()}</div><div style={{fontSize:8,color:TAG_COLORS[mEvent.tag]||"#f59e0b",background:"#0a0704",border:"1px solid "+(TAG_COLORS[mEvent.tag]||"#f59e0b")+"44",borderRadius:4,padding:"1px 6px",letterSpacing:2}}>{mEvent.tag}</div></Row><div style={{fontSize:11,color:"#c8b89a",lineHeight:1.6}}>{mEvent.desc}</div></div></>):(<div style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%"}}><SectionLabel>QUIET DAY</SectionLabel></div>)}
                </div>

                <Panel style={{padding:"10px 16px"}}>
                  <div style={{display:"flex",gap:16,alignItems:"center"}}>
                    <div style={{flex:1}}><Row center={true} style={{gap:8,marginBottom:4}}><SectionLabel>TIME</SectionLabel><div style={{fontSize:18,color:timeColor,fontWeight:"bold",lineHeight:1}}>{fmtTime(hour)}</div></Row><div className={timeBarClass}><Bar value={timeBarPct} max={100} color={timeColor} h={10} instant={hour>=24}/></div></div>
                    <div style={{width:1,alignSelf:"stretch",background:"#2a1f0a"}}/>
                    <div style={{flex:1}}><Row center={true} style={{gap:8,marginBottom:4}}><SectionLabel>STAMINA</SectionLabel><div style={{fontSize:18,color:"#f59e0b",fontWeight:"bold",lineHeight:1}}>{stamina}<span style={{fontSize:11,color:"#5a4a38"}}>/{maxStam}</span></div></Row><Bar value={stamina} max={maxStam} color={isExhausted?"#ef4444":"#f59e0b"} h={10}/></div>
                  </div>
                </Panel>

                {activeCustomer&&<CustomerPanel customer={activeCustomer} weapon={activeCustomer.weapon} onSell={function(price){handleSell(price,activeCustomer.weapon.id);}} onRefuse={handleRefuse} silverTongue={stats.silverTongue} priceBonus={priceBonus} priceDebuff={priceDebuff} sfx={sfx}/>}

                {!activeCustomer&&(
                    <div onClick={onForgeClick} style={{background:"#0f0b06",border:"1px solid #3d2e0f",borderRadius:10,padding:"12px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,position:"relative",cursor:isQTEActive?"pointer":"default",flex:1}}>
                      {forgeBubble&&(<div onClick={function(e){e.stopPropagation();setForgeBubble(null);}} style={{position:"absolute",top:"50%",right:10,transform:"translateY(-50%)",zIndex:60,background:"#0c0905",border:"3px solid "+forgeBubble.color,borderRadius:14,padding:"20px 22px",width:180,boxShadow:"0 8px 28px rgba(0,0,0,0.97)",cursor:"pointer"}}><div style={{fontSize:13,color:forgeBubble.color,letterSpacing:2,fontWeight:"bold",marginBottom:10}}>{forgeBubble.title}</div>{forgeBubble.lines.map(function(l,i){return <div key={i} style={{fontSize:14,color:l.color||"#c8b89a",lineHeight:1.8,fontWeight:l.bold?"bold":"normal"}}>{l.text}</div>;})}<div style={{fontSize:8,color:"#4a3c2c",marginTop:8,letterSpacing:1}}>CLICK TO DISMISS</div></div>)}

                      {(phase!==PHASES.IDLE&&phase!==PHASES.SELECT&&phase!==PHASES.SELECT_MAT&&qualScore>0)&&(
                          <Panel style={{position:"absolute",top:10,left:10,width:160}}>
                            {[["MATERIAL",matData.name,matData.color,14],["WEAPON",weapon.name,"#f0e6c8",14],["EFF. DIFF",effDiff+(matDiffMod>0?" (+"+matDiffMod+")":""),"#c8b89a",22],["QTE SPEED",speedLabel,speedColor,14],["STRIKE POWER",strikeLabel,strikeColor,14]].map(function(r){return <div key={r[0]} style={{marginBottom:8}}><SectionLabel>{r[0]}</SectionLabel><div style={{fontSize:r[3],color:r[2],fontWeight:"bold",letterSpacing:1}}>{r[1]}</div></div>;})}
                          </Panel>
                      )}

                      {phase!==PHASES.IDLE&&<ForgeScene phase={phase}/>}

                      {showBars&&(<div style={{width:"100%",maxWidth:300,display:"flex",flexDirection:"column",gap:5}}>
                        <Row><SectionLabel>QUALITY</SectionLabel><span style={{fontSize:12,color:getQ(qualScore).weaponColor,fontWeight:"bold"}}>{getQ(qualScore).label} ({qualScore})</span></Row>
                        <Bar value={qualScore} max={100} color={getQ(qualScore).weaponColor} h={12}/>
                        <Row style={{marginTop:4}}><SectionLabel>STRESS</SectionLabel><div style={{display:"flex",gap:5,alignItems:"center"}}><Pips count={STRESS_MAX} filled={stress} filledColor={stressColor} size={18}/><span style={{color:stressColor,fontWeight:"bold",marginLeft:4,fontSize:12}}>{stressLabel2}</span></div></Row>
                      </div>)}

                      <div style={{width:"100%",flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
                        {phase===PHASES.IDLE&&(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,width:"100%",maxWidth:400}}>
                          {wipWeapon?(
                              <div style={{width:"100%",background:"#0a0704",border:"2px solid #60a5fa",borderRadius:12,padding:"18px 20px"}}>
                                <div style={{fontSize:12,color:"#60a5fa",letterSpacing:2,fontWeight:"bold",marginBottom:12}}>WORK IN PROGRESS</div>
                                <div style={{display:"flex",gap:12,marginBottom:14}}>
                                  {[["WEAPON",WEAPONS[wipWeapon.wKey].name,"#f0e6c8"],["MATERIAL",(MATS[wipWeapon.matKey]&&MATS[wipWeapon.matKey].name)||"Bronze",(MATS[wipWeapon.matKey]&&MATS[wipWeapon.matKey].color)||"#a0a0a0"],["QUALITY",""+wipWeapon.qualScore,getQ(wipWeapon.qualScore).color],["STRESS",wipWeapon.stress+"/"+STRESS_MAX,wipWeapon.stress>=STRESS_MAX?"#ef4444":wipWeapon.stress>=STRESS_MAX-1?"#fb923c":"#4ade80"]].map(function(r){return <div key={r[0]} style={{flex:1}}><SectionLabel style={{marginBottom:3}}>{r[0]}</SectionLabel><div style={{fontSize:13,color:r[2],fontWeight:"bold"}}>{r[1]}</div></div>;})}
                                </div>
                                <div style={{display:"flex",gap:8}}>
                                  <button onClick={function(e){e.stopPropagation();resumeWip();}} disabled={isLocked||!canAffordTime(hour,sessCost)} style={{flex:2,background:"#0a1a2a",border:"2px solid #60a5fa",borderRadius:8,color:"#60a5fa",padding:"10px 0",fontSize:13,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Resume</button>
                                  <button onClick={function(e){e.stopPropagation();scrapWip();}} style={{flex:1,background:"#141009",border:"2px solid #3d2e0f",borderRadius:8,color:"#8a7a64",padding:"10px 0",fontSize:13,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Scrap</button>
                                </div>
                                {stamina<=0&&<div style={{fontSize:10,color:"#fb923c",letterSpacing:1,textAlign:"center",marginTop:6}}>EXHAUSTED — REST BEFORE RESUMING</div>}
                              </div>
                          ):(
                              <><div style={{fontSize:16,letterSpacing:3,color:"#f59e0b",fontWeight:"bold"}}>FORGE READY</div><SectionLabel>{isExhausted?"EXHAUSTED — 4HR/SESSION":"2HR/SESSION"}</SectionLabel>
                                <button onClick={stamina<=0&&canAffordTime(hour,2)?waitHour:(isLocked||!canAffordTime(hour,sessCost))?null:function(e){e.stopPropagation();sfx.click();setPhase(PHASES.SELECT);}} disabled={isLocked||(!canAffordTime(hour,sessCost)&&!(stamina<=0&&canAffordTime(hour,2)))} style={{background:"#2a1f0a",border:"2px solid #f59e0b",borderRadius:8,color:"#f59e0b",padding:"14px 40px",fontSize:18,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold",position:"relative"}}><span style={{opacity:stamina<=0&&canAffordTime(hour,2)?0.65:1}}>Begin Forging</span>{stamina<=0&&canAffordTime(hour,2)&&<span className="blink-slow" style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,pointerEvents:"none",zIndex:2}}>⏳</span>}</button></>
                          )}
                        </div>)}

                        {phase===PHASES.SELECT&&(<div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"center",width:"80%"}}>
                          <Panel style={{width:155,flexShrink:0,border:"2px solid #f59e0b66",display:"flex",flexDirection:"column"}}>
                            <div style={{fontSize:12,color:"#f59e0b",fontWeight:"bold",letterSpacing:1,marginBottom:8}}>{WEAPONS[wKey].name.toUpperCase()}</div>
                            {[["MAT COST",WEAPONS[wKey].matCost+" units","#c8b89a"],["BASE SELL","~"+refVal(wKey)+"g","#f59e0b"]].map(function(r){return <InfoRow key={r[0]} label={r[0]} value={r[1]} color={r[2]}/>;  })}
                            <div style={{marginTop:6,borderTop:"1px solid #2a1f0a",paddingTop:6,textAlign:"center"}}><SectionLabel style={{marginBottom:3,textAlign:"center"}}>DIFFICULTY</SectionLabel><div style={{fontSize:26,color:WEAPONS[wKey].difficulty<=3?"#4ade80":WEAPONS[wKey].difficulty<=6?"#fbbf24":WEAPONS[wKey].difficulty<=8?"#fb923c":"#ef4444",fontWeight:"bold",lineHeight:1,textAlign:"center"}}>{WEAPONS[wKey].difficulty}</div></div>
                          </Panel>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                            <div style={{fontSize:14,letterSpacing:3,color:"#f59e0b",fontWeight:"bold"}}>CHOOSE WEAPON</div>
                            <div style={{width:"100%",maxHeight:160,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
                              {Object.keys(WEAPONS).filter(function(k){return unlockedBP.includes(k);}).map(function(k){var w=WEAPONS[k],isQ=!!(royalQuest&&!royalQuest.fulfilled&&royalQuest.wKey===k),isSel=wKey===k;return(<div key={k} ref={isSel?function(el){if(el)el.scrollIntoView({block:"nearest"});}:null} onClick={function(e){e.stopPropagation();sfx.click();setWKey(k);}} style={{border:"2px solid "+(isSel?"#f59e0b":"#3d2e0f"),borderRadius:6,padding:"8px 10px",cursor:"pointer",background:isSel?"#2a1f0a":"#0a0704",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{fontSize:13,color:isSel?"#f59e0b":"#f0e6c8",letterSpacing:1}}>{w.name.toUpperCase()}</div>{isQ&&<span style={{fontSize:11,background:"#f59e0b",color:"#0a0704",borderRadius:4,padding:"1px 6px",fontWeight:"bold"}}>QUEST</span>}</div></div>);})}
                            </div>
                            <div style={{display:"flex",gap:5}}><ActionBtn onClick={function(){sfx.click();setPhase(PHASES.SELECT_MAT);}} disabled={stamina<=0} small={true}>Next</ActionBtn><ActionBtn onClick={function(){sfx.click();setPhase(PHASES.IDLE);}} color="#8a7a64" bg="#141009" small={true}>Cancel</ActionBtn></div>
                          </div>
                        </div>)}

                        {phase===PHASES.SELECT_MAT&&(<div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"center",width:"80%"}}>
                          <Panel style={{width:155,flexShrink:0,border:"2px solid "+MATS[matKey].color+"66"}}>
                            <div style={{fontSize:12,color:MATS[matKey].color,fontWeight:"bold",letterSpacing:1,marginBottom:8}}>{MATS[matKey].name.toUpperCase()}</div>
                            {[["IN STOCK",(inv[matKey]||0)+" units"],["VALUE MULT","x"+MATS[matKey].valMult]].map(function(r){var vc=r[0]==="IN STOCK"?((inv[matKey]||0)>=weapon.matCost?"#4ade80":"#ef4444"):"#c8b89a";return <InfoRow key={r[0]} label={r[0]} value={r[1]} color={vc}/>;  })}
                            <div style={{marginTop:6,borderTop:"1px solid #2a1f0a",paddingTop:6,textAlign:"center"}}><SectionLabel style={{marginBottom:3,display:"flex",justifyContent:"center"}}>DIFF MOD</SectionLabel><div style={{fontSize:26,color:MATS[matKey].diffMod<0?"#4ade80":MATS[matKey].diffMod===0?"#c8b89a":MATS[matKey].diffMod<=3?"#fbbf24":MATS[matKey].diffMod<=5?"#fb923c":"#ef4444",fontWeight:"bold",lineHeight:1,textAlign:"center"}}>{MATS[matKey].diffMod>0?"+":""}{MATS[matKey].diffMod}</div></div>
                          </Panel>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                            <div style={{fontSize:14,letterSpacing:3,color:"#f59e0b",fontWeight:"bold"}}>CHOOSE MATERIAL</div>
                            <SectionLabel>{weapon.name} needs {weapon.matCost} units</SectionLabel>
                            <div style={{width:"100%",maxHeight:160,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
                              {Object.entries(MATS).map(function(e){var k=e[0],m=e[1],have=(inv[k]||0),enough=have>=weapon.matCost;var isQ=!!(royalQuest&&!royalQuest.fulfilled&&royalQuest.matReq===k);var isSel=matKey===k,needed=Math.max(0,weapon.matCost-have),buyPrice=MATS[k].price*needed,canBuy=needed>0&&gold>=buyPrice;var canSelect=enough||canBuy;return(<div key={k} onClick={canSelect?function(e){e.stopPropagation();sfx.click();setMatKey(k);}:null} style={{border:"2px solid "+(isSel?"#f59e0b":canSelect?"#3d2e0f":"#2a1f0a"),borderRadius:6,padding:"8px 10px",cursor:canSelect?"pointer":"not-allowed",background:isSel?"#2a1f0a":"#0a0704",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{fontSize:13,color:isSel?m.color:canSelect?m.color:"#3d2e0f",letterSpacing:1,fontWeight:"bold"}}>{m.name.toUpperCase()}</div>{isQ&&<span style={{fontSize:11,background:"#f59e0b",color:"#0a0704",borderRadius:4,padding:"1px 6px",fontWeight:"bold"}}>QUEST</span>}</div>{needed>0&&<span className={!canBuy?"blink-slow":""} style={{fontSize:10,color:canBuy?(isSel?"#fbbf24":"#f59e0b"):"#ef4444",letterSpacing:1,fontFamily:"monospace",fontWeight:"bold",whiteSpace:"nowrap"}}>{canBuy?"COSTS "+buyPrice+"g":"CAN'T AFFORD"}</span>}</div>);})}
                            </div>
                            <div style={{display:"flex",gap:5}}><ActionBtn onClick={function(){sfx.click();confirmSelect();}} disabled={(inv[matKey]||0)<weapon.matCost&&gold<MATS[matKey].price*Math.max(0,weapon.matCost-(inv[matKey]||0))||stamina<=0||!canAffordTime(hour,sessCost)} small={true}>Confirm</ActionBtn><ActionBtn onClick={function(){sfx.click();setPhase(PHASES.SELECT);}} color="#8a7a64" bg="#141009" small={true}>Back</ActionBtn></div>
                          </div>
                        </div>)}

                        <QTEPanel phase={phase} heatWinLo={heatWinLo} heatWinHi={heatWinHi} flash={qteFlash} strikesLeft={strikesLeft} strikesTotal={3+bonusStrikes} heatSpeedMult={heatSpeedMult} hammerSpeedMult={hammerSpeedMult} quenchSpeedMult={quenchSpeedMult} posRef={qtePosRef} processingRef={qteProcessing} onAutoFire={handleAutoFire}/>

                        {phase===PHASES.SESS_RESULT&&sessResult&&(
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:"100%"}}>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,width:"80%",marginTop:4}}>
                                {(function(){var noStam=stamina<=0,noTime=!canAffordTime(hour,sessCost),s=sessResult.ns;var needRest=noStam&&canAffordTime(hour,2);var dis=isLocked||(noStam&&!canAffordTime(hour,2))||noTime;var borderCol=dis?"#2a1f0a":s>=STRESS_MAX?"#ef4444":s>=STRESS_MAX-1?"#fb923c":"#f59e0b";var textCol=dis?"#4a3c2c":s>=STRESS_MAX?"#ef4444":s>=STRESS_MAX-1?"#fb923c":"#f59e0b";var bg=dis?"#0a0704":s>=STRESS_MAX?"#1a0505":s>=STRESS_MAX-1?"#1a0e05":"#2a1f0a";return <button onClick={dis?null:needRest?waitHour:function(e){e.stopPropagation();sfx.click();attemptForge();}} disabled={dis} style={{background:bg,border:"2px solid "+borderCol,borderRadius:8,color:textCol,padding:"8px",fontSize:11,cursor:dis?"not-allowed":"pointer",letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold",position:"relative"}}><span style={{opacity:needRest?0.65:1}}>FORGE</span>{needRest&&<span className="blink-slow" style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,pointerEvents:"none",zIndex:2}}>⏳</span>}{!needRest&&s>=STRESS_MAX-1&&<span className="blink-fast" style={{fontSize:10,color:s>=STRESS_MAX?"#ef4444":"#fb923c",position:"absolute",right:6,top:"50%",transform:"translateY(-50%)"}}>{s>=STRESS_MAX?"50%":"33%"} BREAK</span>}</button>;})()}
                                <button disabled={stress<=0||!canAffordTime(hour,2)} onClick={function(e){e.stopPropagation();sfx.click();doNormalize();}} style={{background:stress<=0||!canAffordTime(hour,2)?"#0a0704":"#0a1a2a",border:"2px solid "+(stress<=0||!canAffordTime(hour,2)?"#2a1f0a":"#60a5fa"),borderRadius:8,color:stress<=0||!canAffordTime(hour,2)?"#4a3c2c":"#60a5fa",padding:"8px 4px",fontSize:11,cursor:stress<=0||!canAffordTime(hour,2)?"not-allowed":"pointer",letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Normalize</button>
                                <button onClick={stamina<=0&&canAffordTime(hour,2)?waitHour:(stamina<=0||!canAffordTime(hour,sessCost))?null:function(e){e.stopPropagation();sfx.click();setPhase(PHASES.QUENCH);}} disabled={stamina<=0&&!canAffordTime(hour,2)||!canAffordTime(hour,sessCost)&&stamina>0} style={{background:stamina<=0&&!canAffordTime(hour,2)||!canAffordTime(hour,sessCost)?"#0a0704":"#2a1f0a",border:"2px solid "+(stamina<=0&&!canAffordTime(hour,2)||!canAffordTime(hour,sessCost)?"#2a1f0a":"#f59e0b"),borderRadius:8,color:stamina<=0&&!canAffordTime(hour,2)||!canAffordTime(hour,sessCost)?"#4a3c2c":"#f59e0b",padding:"8px 4px",fontSize:11,cursor:stamina<=0&&!canAffordTime(hour,2)||!canAffordTime(hour,sessCost)?"not-allowed":"pointer",letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold",position:"relative"}}>
                                  <span style={{opacity:stamina<=0&&canAffordTime(hour,2)?0.65:1}}>Quench</span>
                                  {stamina<=0&&canAffordTime(hour,2)&&<span className="blink-slow" style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,pointerEvents:"none",zIndex:2}}>⏳</span>}
                                </button>
                                <button onClick={function(e){e.stopPropagation();sfx.click();scrapWeapon();}} style={{background:"#141009",border:"2px solid #3d2e0f",borderRadius:8,color:"#8a7a64",padding:"8px 4px",fontSize:11,cursor:"pointer",letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Scrap</button>
                                <button onClick={function(e){e.stopPropagation();sfx.click();takeBreak();}} style={{background:"#141009",border:"2px solid #60a5fa",borderRadius:8,color:"#60a5fa",padding:"8px 4px",fontSize:11,cursor:"pointer",letterSpacing:1,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold",gridColumn:"span 2"}}>Leave Forging</button>
                              </div>
                            </div>
                        )}
                      </div>
                    </div>
                )}
              </div>

              <div style={{width:COL_W,flexShrink:0,marginLeft:8}}>
                <Panel style={{border:"1px solid #2a1f0a",display:"flex",flexDirection:"column"}}>
                  <SectionLabel style={{marginBottom:8}}>FOR SALE</SectionLabel>
                  <div style={{overflowY:"auto",flex:1,maxHeight:300}}>
                    {finished.length===0&&<SectionLabel color="#4a3c2c" style={{lineHeight:1.6}}>Nothing on the shelf.</SectionLabel>}
                    {finished.map(function(w){return(<div key={w.id} style={{background:"#1a1209",border:"1px solid "+w.color+"44",borderRadius:6,padding:"7px 9px",marginBottom:6}}><div style={{fontSize:11,color:w.color,letterSpacing:1,fontWeight:"bold"}}>{w.label.toUpperCase()}</div><div style={{fontSize:10,color:(MATS[w.matKey]&&MATS[w.matKey].color)||"#a0a0a0"}}>{(MATS[w.matKey]&&MATS[w.matKey].name)||"Bronze"}</div><div style={{fontSize:11,color:"#c8b89a",marginTop:2}}>{w.wName}</div><div style={{fontSize:13,color:"#f59e0b",fontWeight:"bold",marginTop:3}}>~{w.val}g</div></div>);})}
                  </div>
                </Panel>
              </div>
            </div>

            <div style={{background:"#0f0b06",borderTop:"1px solid #3d2e0f",padding:"8px 16px",display:"flex",gap:10,alignItems:"center"}}>
              <div style={{display:"flex",gap:5,flexShrink:0,height:80}}>
                {[["💤","Sleep",function(){sfx.click();sleep();},isLocked,false],["⏳","Rest",waitHour,isLocked||hour>=REST_HOUR_LIMIT||!canAffordTime(hour,2),false],["📣","Promote",promote,isLocked||hour>=24||finished.length===0||promoteUses>=3||!canAffordTime(hour,1),true],["🗑","Scavenge",scavenge,isLocked||hour>=24||!canAffordTime(hour,1),true]].map(function(b){
                  var icon=b[0],label=b[1],fn=b[2],dis=b[3],usesStam=b[4];
                  var needRest=usesStam&&stamina<=0&&canAffordTime(hour,2);
                  var finalDis=dis||(usesStam&&stamina<=0&&!canAffordTime(hour,2));
                  var finalFn=needRest?waitHour:fn;
                  return(<button key={label} onClick={finalDis?null:finalFn} disabled={finalDis} style={{background:finalDis?"#0a0704":"#141009",border:"1px solid "+(finalDis?"#1a1209":"#2a1f0a"),borderRadius:7,color:finalDis?"#2a1f0a":"#8a7a64",cursor:finalDis?"not-allowed":"pointer",fontFamily:"monospace",fontWeight:"bold",fontSize:11,letterSpacing:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,height:"100%",width:72,padding:0,position:"relative"}}>
                    <span style={{opacity:needRest?0.65:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><span style={{fontSize:18}}>{icon}</span><span>{label.toUpperCase()}</span></span>
                    {needRest&&<span className="blink-slow" style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,pointerEvents:"none",zIndex:2}}>⏳</span>}
                  </button>);
                })}
              </div>
              <div style={{width:1,alignSelf:"stretch",background:"#2a1f0a",flexShrink:0,margin:"0 8px"}}/>
              <div style={{flex:1,display:"flex",gap:8,alignItems:"center",justifyContent:"flex-start"}}>
                <ActionBtn onClick={function(){sfx.click();setShowShop(function(s){return !s;});}} disabled={isLocked} style={{height:80,padding:"0 18px",fontSize:14,flexShrink:0}}>🛒 Shop</ActionBtn>
                <button onClick={isLocked?null:function(){sfx.click();setShowMaterials(function(s){return !s;});}} disabled={isLocked} style={{height:80,padding:"0 14px",fontSize:12,flexShrink:0,background:"#0f0b06",border:"1px solid "+(isLocked?"#1a1209":"#3d2e0f"),borderRadius:8,color:isLocked?"#2a1f0a":"#5a4a38",cursor:isLocked?"not-allowed":"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>⚗ Mats</button>
                <Panel style={{padding:"8px 18px",minWidth:80,textAlign:"center",position:"relative"}}>
                  <SectionLabel style={{marginBottom:4}}>GOLD</SectionLabel>
                  <div style={{fontSize:28,color:"#f59e0b",fontWeight:"bold",lineHeight:1}}>{gold}g</div>
                  {goldPops.map(function(p){return <GoldPop key={p.id} amount={p.amount} onDone={function(){removeGoldPop(p.id);}}/>;  })}
                </Panel>
              </div>
              <div style={{display:"flex",flexDirection:"row",gap:12,alignItems:"center",padding:"0 8px"}}>
                {[["SFX",0.25,function(e){sfx.setSfxVol(parseFloat(e.target.value));}],["MUS",0.25,function(e){sfx.setMusicVol(parseFloat(e.target.value));}]].map(function(r){return(<label key={r[0]} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#f0e6c8",letterSpacing:2,fontFamily:"monospace",fontWeight:"bold"}}>{r[0]}<input type="range" min="0" max="1" step="0.05" defaultValue={r[1]} onChange={r[2]} style={{width:72,accentColor:"#f59e0b",cursor:"pointer"}}/></label>);})}
              </div>
              <button onClick={function(){sfx.click();setShowOptions(true);}} style={{background:"#141009",border:"1px solid #2a1f0a",borderRadius:7,color:"#8a7a64",cursor:"pointer",fontFamily:"monospace",fontWeight:"bold",fontSize:11,letterSpacing:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,height:80,padding:"0 14px",flexShrink:0}}><span style={{fontSize:18}}>⚙</span><span>OPTIONS</span></button>
            </div>
          </div>
        </ScaleWrapper>
        {showRhythmTest&&<RhythmQTE sfx={sfx} onClose={function(){setShowRhythmTest(false);}}/>}
        {showOptions&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={function(e){if(e.target===e.currentTarget)setShowOptions(false);}}>
          <Panel style={{padding:"24px 28px",width:300,maxHeight:"60vh",overflowY:"auto"}}>
            <Row style={{marginBottom:16}}><div style={{fontSize:14,color:"#f59e0b",letterSpacing:3}}>OPTIONS</div><button onClick={function(){setShowOptions(false);}} style={{background:"#2a1f0a",border:"1px solid #3d2e0f",borderRadius:5,color:"#f59e0b",padding:"4px 10px",cursor:"pointer",fontFamily:"monospace",fontSize:13}}>X</button></Row>
            <div style={{borderTop:"1px solid #2a1f0a",paddingTop:14,display:"flex",flexDirection:"column",gap:12}}>
              <SectionLabel>AUDIO</SectionLabel>
              {[["Shop Music",true,function(e){sfx.idleMuted=!e.target.checked;}],["Forge Music",true,function(e){sfx.forgeMuted=!e.target.checked;}]].map(function(r){return(<label key={r[0]} style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",fontSize:12,color:"#c8b89a",letterSpacing:1,userSelect:"none"}}>{r[0]}<input type="checkbox" defaultChecked={r[1]} onChange={r[2]} style={{accentColor:"#f59e0b",width:15,height:15,cursor:"pointer"}}/></label>);})}
            </div>
            <div style={{borderTop:"1px solid #2a1f0a",paddingTop:14,marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
              <SectionLabel style={{marginBottom:4}}>DANGER ZONE</SectionLabel>
              <DangerBtn onClick={function(){setShowOptions(false);setShowGiveUp(true);}}>Give Up</DangerBtn>
            </div>
            <div style={{borderTop:"1px solid #2a1f0a",paddingTop:14,marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
              <SectionLabel style={{marginBottom:4}}>DEBUG</SectionLabel>
              <button onClick={function(){if(goodEventUsed||day>1)return;var mv=EVENTS.find(function(e){return e.id==="mystery";});if(mv){setPendingMystery({severity:"good",effect:mv.variants[1].effect});setGoodEventUsed(true);}setShowOptions(false);}} disabled={goodEventUsed||day>1} style={{background:goodEventUsed||day>1?"#0a0704":"#1a1500",border:"2px solid "+(goodEventUsed||day>1?"#3d2e0f":"#fbbf24"),borderRadius:8,color:goodEventUsed||day>1?"#4a3c2c":"#fbbf24",padding:"10px 16px",fontSize:13,cursor:goodEventUsed||day>1?"not-allowed":"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>{goodEventUsed?"Good Event Used":day>1?"Day 1 Only":"Force Good Event"}</button>
              <button onClick={function(){var mv=EVENTS.find(function(e){return e.id==="mystery";});if(mv)setPendingMystery({severity:"bad",effect:mv.variants[2].effect});setShowOptions(false);}} style={{background:"#1a0505",border:"2px solid #ef4444",borderRadius:8,color:"#ef4444",padding:"10px 16px",fontSize:13,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Force Dark Event</button>
              <button onClick={function(){earnGold(10000);setShowOptions(false);}} style={{background:"#0a1a0a",border:"2px solid #4ade80",borderRadius:8,color:"#4ade80",padding:"10px 16px",fontSize:13,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Grant 10,000g</button>
              <button onClick={function(){setStamina(function(s){return Math.max(0,s-1);});}} style={{background:"#1a0a1a",border:"2px solid #818cf8",borderRadius:8,color:"#818cf8",padding:"10px 16px",fontSize:13,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>Spend 1 Stamina</button>
              <button onClick={function(){setShowRhythmTest(true);setShowOptions(false);}} style={{background:"#0a1a1a",border:"2px solid #00ffe5",borderRadius:8,color:"#00ffe5",padding:"10px 16px",fontSize:13,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",fontFamily:"monospace",fontWeight:"bold"}}>QTE Test</button>
            </div>
          </Panel>
        </div>)}
      </>
  );
}