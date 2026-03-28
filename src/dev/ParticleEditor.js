// ============================================================
// ParticleEditor.js — Pixel Particle System Editor
// localhost:3000/dev/particle-editor
//
// System: always has duration + mode (loop/burst)
// Emitter Loop: tied to system, continuous spawn rate
// Emitter Burst Instant: fires all particles at once at start time
// Emitter Burst Duration: spawns at rate over lifetime, with activations
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================
// CONSTANTS
// ============================================
var CW=800,CH=500,PW=320,LW=210,SYS_W=200,MAX_P=3000,HS=14,GS=20;
var GRID_COL="rgba(255,255,255,0.04)";
var EM_COLS=["#00ffaa","#ff6b6b","#4ecdc4","#ffe66d","#a29bfe","#fd79a8","#00cec9","#fab1a0"];
var TL_H=60;
var SHAPES=["square","circle","triangle","wave","halfmoon"];
var SPAWN_SHAPES=["point","line","circle","ring","rect"];

var CURVES=["none","flat","rampUp","rampDown","easeIn","easeOut","easeInOut","quickIn","quickOut","pulse","waveCurve"];
var CURVE_LBL={none:"None",flat:"Flat",rampUp:"Ramp Up",rampDown:"Ramp Down",easeIn:"Ease In",easeOut:"Ease Out",easeInOut:"Ease In-Out",quickIn:"Quick In",quickOut:"Quick Out",pulse:"Pulse",waveCurve:"Wave"};

var PALETTES=[
    {name:"PICO-8",colors:["#000000","#1d2b53","#7e2553","#008751","#ab5236","#5f574f","#c2c3c7","#fff1e8","#ff004d","#ffa300","#ffec27","#00e436","#29adff","#83769c","#ff77a8","#ffccaa"]},
    {name:"Sweetie 16",colors:["#1a1c2c","#5d275d","#b13e53","#ef7d57","#ffcd75","#a7f070","#38b764","#257179","#29366f","#3b5dc9","#41a6f6","#73eff7","#f4f4f4","#94b0c2","#566c86","#333c57"]},
    {name:"Endesga 32",colors:["#be4a2f","#d77643","#ead4aa","#e4a672","#b86f50","#733e39","#3e2731","#a22633","#e43b44","#f77622","#feae34","#fee761","#63c74d","#3e8948","#265c42","#193c3e","#124e89","#0099db","#2ce8f5","#ffffff","#c0cbdc","#8b9bb4","#5a6988","#3a4466","#262b44","#181425","#ff0044","#68386c","#b55088","#f6757a","#e8b796","#c28569"]},
    {name:"DB32",colors:["#000000","#222034","#45283c","#663931","#8f563b","#df7126","#d9a066","#eec39a","#fbf236","#99e550","#6abe30","#37946e","#4b692f","#524b24","#323c39","#3f3f74","#306082","#5b6ee1","#639bff","#5fcde4","#cbdbfc","#ffffff","#9badb7","#847e87","#696a6a","#595652","#76428a","#ac3232","#d95763","#d77bba","#8f974a","#8a6f30"]},
    {name:"Resurrect 64",colors:["#2e222f","#3e3546","#625565","#966c6c","#ab947a","#694f62","#7f708a","#9babb2","#c7dcd0","#ffffff","#6e2727","#b33831","#ea4f36","#f57d4a","#ae2334","#e83b3b","#fb6b1d","#f79617","#f9c22b","#7a3045","#9e4539","#cd683d","#e6904e","#fbb954","#4c3e24","#676633","#a2a947","#d5e04b","#fbff86","#165a4c","#239063","#1ebc73","#91db69","#cddf6c","#313638","#374e4a","#547e64","#92a984","#b2ba90","#0b5e65","#0b8a8f","#0eaf9b","#30e1b9","#8ff8e2","#323353","#484a77","#4d65b4","#4d9be6","#8fd3ff","#45293f","#6b3e75","#905ea9","#a884f3","#eaaded","#753c54","#a24b6f","#cf657f","#ed8099","#831c5d","#c32454","#f04f78","#f68181","#fca790","#fdcbb0"]},
    {name:"NES",colors:["#000000","#fcfcfc","#f8f8f8","#bcbcbc","#7c7c7c","#a4e4fc","#3cbcfc","#0078f8","#0000fc","#b8b8f8","#6888fc","#0058f8","#0000bc","#d8b8f8","#9878f8","#6844fc","#4428bc","#f8b8f8","#f878f8","#d800cc","#940084","#f8a4c0","#f85898","#e40058","#a80020","#f0d0b0","#f87858","#f83800","#a81000","#fce0a8","#fca044","#e45c10","#881400","#f8d878","#f8b800","#ac7c00","#503000","#d8f878","#b8f818","#00b800","#007800","#b8f8b8","#58d854","#00a800","#006800","#b8f8d8","#58f898","#00a844","#005800","#00fcfc","#00e8d8","#008888","#004058"]},
];

function evalCurve(name,t,intensity){
    if(!name||name==="none")return 1;
    var c=Math.max(0,Math.min(1,t));var raw;
    switch(name){
        case "rampUp":raw=c;break;case "rampDown":raw=1-c;break;
        case "easeIn":raw=c*c;break;case "easeOut":raw=1-(1-c)*(1-c);break;
        case "easeInOut":raw=c<0.5?2*c*c:1-Math.pow(-2*c+2,2)/2;break;
        case "quickIn":raw=c<0.15?c/0.15:1;break;case "quickOut":raw=c>0.85?(1-c)/0.15:1;break;
        case "pulse":raw=Math.sin(c*Math.PI);break;case "waveCurve":raw=(Math.cos(c*Math.PI*2)+1)/2;break;
        default:raw=1;
    }
    var inten=intensity!==undefined?intensity:1;
    return 1+(raw-1)*inten;
}

// ============================================
// DEFAULT PARTICLE CONFIG
// ============================================
var DEF_PCFG={
    name:"untitled",
    size:{min:2,max:4},sizeOverLifetime:{start:1,end:1},sizeCurve:"none",sizeCurveInt:1,scaleX:1,scaleY:1,
    speed:{min:30,max:80},speedCurve:"none",speedCurveInt:1,
    lifetime:{min:0.4,max:1.2},
    colorStart:"#ff6600",colorMid:"#ff4400",colorEnd:"#ff2200",colorMidPoint:0.5,colorCurve:"none",colorCurveInt:1,
    fadeOut:true,opacityCurve:"none",opacityCurveInt:1,
    gravity:-40,spread:60,direction:270,shape:"square",waveFreq:1,damping:0,
    faceVelocity:false,radialBurst:false,biasX:0,biasY:0,rotation:false,rotStart:0,rotRandom:0,rotSpeed:0,
    spawnShape:"point",spawnWidth:40,spawnHeight:40,spawnRadius:20,spawnAngle:0,
    vortex:false,vortexWidth:30,vortexHeight:10,vortexSpeed:2,vortexPhaseRand:true,
    ditherAmount:0,ditherDepth:2,glow:false,glowIntensity:8,
};

// ============================================
// STARTER TEMPLATES
// ============================================
var STARTERS=[
    {name:"campfire_sparks",size:{min:1,max:3},sizeOverLifetime:{start:1,end:0.3},sizeCurve:"easeIn",sizeCurveInt:1,scaleX:1,scaleY:1,speed:{min:40,max:100},speedCurve:"none",speedCurveInt:1,lifetime:{min:0.3,max:0.9},colorStart:"#ffee88",colorMid:"#ffaa00",colorEnd:"#ff2200",colorMidPoint:0.3,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"rampDown",opacityCurveInt:1,gravity:-60,spread:30,direction:270,shape:"square",waveFreq:1,damping:0.5,faceVelocity:false,radialBurst:false,biasX:0,biasY:0,rotation:false,rotStart:0,rotRandom:0,rotSpeed:0,spawnShape:"point",spawnWidth:40,spawnHeight:40,spawnRadius:20,spawnAngle:0,vortex:false,vortexWidth:30,vortexHeight:10,vortexSpeed:2,vortexPhaseRand:true,ditherAmount:0,ditherDepth:2,glow:true,glowIntensity:6},
    {name:"smoke_puff",size:{min:3,max:8},sizeOverLifetime:{start:0.5,end:1.5},sizeCurve:"easeOut",sizeCurveInt:1,scaleX:1.2,scaleY:1,speed:{min:10,max:30},speedCurve:"easeOut",speedCurveInt:1,lifetime:{min:1,max:2.5},colorStart:"#999999",colorMid:"#666666",colorEnd:"#333333",colorMidPoint:0.5,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"quickOut",opacityCurveInt:1,gravity:-15,spread:40,direction:270,shape:"circle",waveFreq:1,damping:1,faceVelocity:false,radialBurst:false,biasX:0,biasY:0,rotation:false,rotStart:0,rotRandom:360,rotSpeed:0,spawnShape:"point",spawnWidth:40,spawnHeight:40,spawnRadius:20,spawnAngle:0,vortex:false,vortexWidth:30,vortexHeight:10,vortexSpeed:2,vortexPhaseRand:true,ditherAmount:0.3,ditherDepth:3,glow:false,glowIntensity:8},
    {name:"forge_embers",size:{min:1,max:2},sizeOverLifetime:{start:1,end:0},sizeCurve:"easeIn",sizeCurveInt:1,scaleX:1,scaleY:1,speed:{min:60,max:150},speedCurve:"none",speedCurveInt:1,lifetime:{min:0.2,max:0.6},colorStart:"#ffffff",colorMid:"#ffaa00",colorEnd:"#ff4400",colorMidPoint:0.4,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"none",opacityCurveInt:1,gravity:-20,spread:90,direction:270,shape:"triangle",waveFreq:1,damping:0.3,faceVelocity:true,radialBurst:false,biasX:0,biasY:0,rotation:false,rotStart:0,rotRandom:0,rotSpeed:0,spawnShape:"point",spawnWidth:40,spawnHeight:40,spawnRadius:20,spawnAngle:0,vortex:false,vortexWidth:30,vortexHeight:10,vortexSpeed:2,vortexPhaseRand:true,ditherAmount:0,ditherDepth:2,glow:true,glowIntensity:4},
    {name:"anvil_strike",size:{min:1,max:3},sizeOverLifetime:{start:1,end:0.2},sizeCurve:"easeIn",sizeCurveInt:1,scaleX:1.5,scaleY:0.5,speed:{min:80,max:200},speedCurve:"easeIn",speedCurveInt:1,lifetime:{min:0.15,max:0.5},colorStart:"#ffffff",colorMid:"#ffdd44",colorEnd:"#ff6600",colorMidPoint:0.25,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"quickOut",opacityCurveInt:1,gravity:50,spread:180,direction:270,shape:"square",waveFreq:1,damping:2,faceVelocity:true,radialBurst:true,biasX:0,biasY:-60,rotation:false,rotStart:0,rotRandom:0,rotSpeed:0,spawnShape:"line",spawnWidth:60,spawnHeight:40,spawnRadius:20,spawnAngle:0,vortex:false,vortexWidth:30,vortexHeight:10,vortexSpeed:2,vortexPhaseRand:true,ditherAmount:0,ditherDepth:2,glow:true,glowIntensity:10},
    {name:"magic_wisp",size:{min:2,max:4},sizeOverLifetime:{start:0.8,end:1.2},sizeCurve:"waveCurve",sizeCurveInt:1,scaleX:2,scaleY:0.6,speed:{min:15,max:40},speedCurve:"easeOut",speedCurveInt:1,lifetime:{min:0.8,max:1.8},colorStart:"#88ffff",colorMid:"#4488ff",colorEnd:"#8844ff",colorMidPoint:0.5,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"pulse",opacityCurveInt:1,gravity:-10,spread:60,direction:270,shape:"wave",waveFreq:2,damping:0.8,faceVelocity:true,radialBurst:false,biasX:0,biasY:0,rotation:false,rotStart:0,rotRandom:0,rotSpeed:0,spawnShape:"circle",spawnWidth:40,spawnHeight:40,spawnRadius:15,spawnAngle:0,vortex:false,vortexWidth:30,vortexHeight:10,vortexSpeed:2,vortexPhaseRand:true,ditherAmount:0.15,ditherDepth:2,glow:true,glowIntensity:12},
    {name:"basic_circle",size:{min:20,max:20},sizeOverLifetime:{start:1,end:1},sizeCurve:"none",sizeCurveInt:1,scaleX:1,scaleY:1,speed:{min:0,max:0},speedCurve:"none",speedCurveInt:1,lifetime:{min:2,max:2},colorStart:"#ffffff",colorMid:"#ffffff",colorEnd:"#ffffff",colorMidPoint:0.5,colorCurve:"none",colorCurveInt:1,fadeOut:false,opacityCurve:"none",opacityCurveInt:1,gravity:0,spread:0,direction:270,shape:"circle",waveFreq:1,damping:0,faceVelocity:false,radialBurst:false,biasX:0,biasY:0,rotation:false,rotStart:0,rotRandom:0,rotSpeed:0,spawnShape:"point",spawnWidth:40,spawnHeight:40,spawnRadius:20,spawnAngle:0,vortex:false,vortexWidth:30,vortexHeight:10,vortexSpeed:2,vortexPhaseRand:true,ditherAmount:0,ditherDepth:2,glow:false,glowIntensity:8},
];

// ============================================
// PARTICLE PARAM DEFS
// ============================================
var P_DEFS=[
    {key:"name",label:"Name",type:"text",group:"identity"},
    {key:"lifetime.min",label:"Life Min (s)",type:"slider",min:0.1,max:5,step:0.1,group:"lifetime"},
    {key:"lifetime.max",label:"Life Max (s)",type:"slider",min:0.1,max:5,step:0.1,group:"lifetime"},
    {key:"size.min",label:"Size Min",type:"slider",min:1,max:100,step:1,group:"size"},
    {key:"size.max",label:"Size Max",type:"slider",min:1,max:100,step:1,group:"size"},
    {type:"sublabel",label:"Over Lifetime",group:"size"},
    {key:"sizeOverLifetime.start",label:"Start \u00D7",type:"slider",min:0,max:3,step:0.1,group:"size"},
    {key:"sizeOverLifetime.end",label:"End \u00D7",type:"slider",min:0,max:3,step:0.1,group:"size"},
    {key:"sizeCurve",label:"Curve",type:"curve",group:"size"},
    {key:"sizeCurveInt",label:"Curve \u00D7",type:"slider",min:0,max:2,step:0.1,group:"size",showIfNotNone:"sizeCurve"},
    {type:"sublabel",label:"Scale",group:"size"},
    {key:"scaleX",label:"Scale X",type:"slider",min:0.1,max:4,step:0.1,group:"size"},
    {key:"scaleY",label:"Scale Y",type:"slider",min:0.1,max:4,step:0.1,group:"size"},
    {key:"colorStart",label:"Start",type:"color",group:"color"},
    {key:"colorMid",label:"Mid",type:"color",group:"color"},
    {key:"colorEnd",label:"End",type:"color",group:"color"},
    {key:"colorMidPoint",label:"Mid Point",type:"slider",min:0.05,max:0.95,step:0.05,group:"color"},
    {type:"sublabel",label:"Over Lifetime",group:"color"},
    {key:"colorCurve",label:"Curve",type:"curve",group:"color"},
    {key:"colorCurveInt",label:"Curve \u00D7",type:"slider",min:0,max:2,step:0.1,group:"color",showIfNotNone:"colorCurve"},
    {key:"fadeOut",label:"Fade Out",type:"toggle",group:"opacity"},
    {key:"opacityCurve",label:"Fade Curve",type:"curve",group:"opacity"},
    {key:"opacityCurveInt",label:"Fade Curve \u00D7",type:"slider",min:0,max:2,step:0.1,group:"opacity",showIfNotNone:"opacityCurve"},
    {key:"direction",label:"Direction (\u00B0)",type:"slider",min:0,max:360,step:1,group:"motion"},
    {key:"speed.min",label:"Speed Min",type:"slider",min:0,max:300,step:5,group:"motion"},
    {key:"speed.max",label:"Speed Max",type:"slider",min:0,max:300,step:5,group:"motion"},
    {type:"sublabel",label:"Speed Over Lifetime",group:"motion"},
    {key:"speedCurve",label:"Curve",type:"curve",group:"motion"},
    {key:"speedCurveInt",label:"Curve \u00D7",type:"slider",min:0,max:2,step:0.1,group:"motion",showIfNotNone:"speedCurve"},
    {type:"sublabel",label:"Forces",group:"motion"},
    {key:"gravity",label:"Gravity",type:"slider",min:-200,max:200,step:5,group:"motion"},
    {key:"damping",label:"Damping",type:"slider",min:0,max:5,step:0.1,group:"motion"},
    {key:"faceVelocity",label:"Face Velocity",type:"toggle",group:"motion"},
    {key:"spread",label:"Spread (\u00B0)",type:"slider",min:0,max:180,step:1,group:"distribution"},
    {type:"sublabel",label:"Radial Burst",group:"distribution"},
    {key:"radialBurst",label:"Radial Burst",type:"toggle",group:"distribution"},
    {key:"biasX",label:"Bias X",type:"slider",min:-100,max:100,step:5,group:"distribution",showIf:"radialBurst"},
    {key:"biasY",label:"Bias Y",type:"slider",min:-100,max:100,step:5,group:"distribution",showIf:"radialBurst"},
    {type:"sublabel",label:"Vortex",group:"distribution"},
    {key:"vortex",label:"Vortex",type:"toggle",group:"distribution"},
    {key:"vortexWidth",label:"Width (px)",type:"slider",min:1,max:200,step:1,group:"distribution",showIf:"vortex"},
    {key:"vortexHeight",label:"Height (px)",type:"slider",min:0,max:100,step:1,group:"distribution",showIf:"vortex"},
    {key:"vortexSpeed",label:"Speed (cyc/s)",type:"slider",min:0.1,max:10,step:0.1,group:"distribution",showIf:"vortex"},
    {key:"vortexPhaseRand",label:"Phase Random",type:"toggle",group:"distribution",showIf:"vortex"},
    {key:"rotation",label:"Rotation",type:"toggle",group:"rotation"},
    {key:"rotStart",label:"Start (\u00B0)",type:"slider",min:0,max:360,step:1,group:"rotation",showIf:"rotation"},
    {key:"rotRandom",label:"Random (\u00B1\u00B0)",type:"slider",min:0,max:360,step:1,group:"rotation",showIf:"rotation"},
    {key:"rotSpeed",label:"Spin (\u00B0/s)",type:"slider",min:-360,max:360,step:5,group:"rotation",showIf:"rotation"},
    {key:"spawnShape",label:"Shape",type:"select",options:SPAWN_SHAPES,group:"spawn"},
    {key:"spawnWidth",label:"Width",type:"slider",min:1,max:200,step:1,group:"spawn",showIfVal:{key:"spawnShape",val:["line","rect"]}},
    {key:"spawnHeight",label:"Height",type:"slider",min:1,max:200,step:1,group:"spawn",showIfVal:{key:"spawnShape",val:"rect"}},
    {key:"spawnRadius",label:"Radius",type:"slider",min:1,max:200,step:1,group:"spawn",showIfVal:{key:"spawnShape",val:["circle","ring"]}},
    {key:"spawnAngle",label:"Angle (\u00B0)",type:"slider",min:0,max:360,step:1,group:"spawn",showIfVal:{key:"spawnShape",val:"line"}},
    {key:"shape",label:"Shape",type:"select",options:SHAPES,group:"effects"},
    {key:"waveFreq",label:"Wave Cycles",type:"slider",min:1,max:8,step:1,group:"effects",showIfVal:{key:"shape",val:"wave"}},
    {type:"sublabel",label:"Dithering",group:"effects"},
    {key:"ditherAmount",label:"Amount",type:"slider",min:0,max:1,step:0.05,group:"effects"},
    {key:"ditherDepth",label:"Depth (px)",type:"slider",min:1,max:10,step:1,group:"effects",showIf:"ditherAmount"},
    {type:"sublabel",label:"Glow",group:"effects"},
    {key:"glow",label:"Glow",type:"toggle",group:"effects"},
    {key:"glowIntensity",label:"Size",type:"slider",min:2,max:30,step:1,group:"effects",showIf:"glow"},
];

// ============================================
// HELPERS
// ============================================
function lerp(a,b,t){return a+(b-a)*t;}function rr(a,b){return a+Math.random()*(b-a);}function d2r(d){return d*Math.PI/180;}
function h2rgb(h){var x=h.replace("#","");if(x.length===3)x=x[0]+x[0]+x[1]+x[1]+x[2]+x[2];return{r:parseInt(x.slice(0,2),16),g:parseInt(x.slice(2,4),16),b:parseInt(x.slice(4,6),16)};}
function lc(a,b,t){return{r:Math.round(lerp(a.r,b.r,t)),g:Math.round(lerp(a.g,b.g,t)),b:Math.round(lerp(a.b,b.b,t))};}
function colAt(t,cfg){var ct=evalCurve(cfg.colorCurve||"none",t,cfg.colorCurveInt);var s=h2rgb(cfg.colorStart),m=h2rgb(cfg.colorMid),e=h2rgb(cfg.colorEnd);var mp=cfg.colorMidPoint;if(ct<=mp)return lc(s,m,mp>0?ct/mp:0);return lc(m,e,mp<1?(ct-mp)/(1-mp):1);}
function gv(o,p){var a=p.split(".");var v=o;for(var i=0;i<a.length;i++)v=v[a[i]];return v;}
function sv(o,p,val){var a=p.split(".");var c=JSON.parse(JSON.stringify(o));var t=c;for(var i=0;i<a.length-1;i++)t=t[a[i]];t[a[a.length-1]]=val;return c;}
function dc(o){return JSON.parse(JSON.stringify(o));}
var nid=1;function mid(){return"em_"+(nid++);}
// Safe startTime getter — treats 0 as valid, not falsy
function getST(em){return em.startTime !== undefined ? em.startTime : 0;}

function snapToPal(hex,palIdx){
    if(palIdx<0||palIdx>=PALETTES.length)return hex;
    var src=h2rgb(hex),cols=PALETTES[palIdx].colors,best=cols[0],bestD=Infinity;
    for(var i=0;i<cols.length;i++){var c=h2rgb(cols[i]);var d=(src.r-c.r)*(src.r-c.r)+(src.g-c.g)*(src.g-c.g)+(src.b-c.b)*(src.b-c.b);if(d<bestD){bestD=d;best=cols[i];}}
    return best;
}

// ============================================
// PARTICLE ENGINE
// ============================================
function mkP(x,y,cfg){
    var dr=d2r(cfg.direction),sr=d2r(cfg.spread),a=dr+rr(-sr/2,sr/2),sp=rr(cfg.speed.min,cfg.speed.max);
    if(cfg.radialBurst){
        a=Math.random()*Math.PI*2;
        var bx=(cfg.biasX||0)/100,by=(cfg.biasY||0)/100;var bLen=Math.sqrt(bx*bx+by*by);
        if(bLen>0){var dx=Math.cos(a),dy=Math.sin(a);var dot=dx*bx/bLen+dy*by/bLen;sp*=Math.max(0.1,1+dot*bLen);}
    }
    var ox=0,oy=0,ss=cfg.spawnShape||"point";
    if(ss==="line"){var la=d2r(cfg.spawnAngle||0),lw=cfg.spawnWidth||40,lt=rr(-0.5,0.5)*lw;ox=Math.cos(la)*lt;oy=Math.sin(la)*lt;}
    else if(ss==="circle"){var cr=Math.random()*(cfg.spawnRadius||20),ca=Math.random()*Math.PI*2;ox=Math.cos(ca)*cr;oy=Math.sin(ca)*cr;}
    else if(ss==="ring"){var ra2=Math.random()*Math.PI*2,rr2=cfg.spawnRadius||20;ox=Math.cos(ra2)*rr2;oy=Math.sin(ra2)*rr2;}
    else if(ss==="rect"){ox=rr(-0.5,0.5)*(cfg.spawnWidth||40);oy=rr(-0.5,0.5)*(cfg.spawnHeight||40);}
    var rot=0;if(cfg.rotation){rot=d2r(cfg.rotStart||0)+rr(-1,1)*d2r((cfg.rotRandom||0)/2);}
    var vPhase=0;if(cfg.vortex){vPhase=cfg.vortexPhaseRand?Math.random()*Math.PI*2:0;}
    var p={x:x+ox,y:y+oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rr(cfg.lifetime.min,cfg.lifetime.max),maxLife:0,sz:Math.round(rr(cfg.size.min,cfg.size.max)),rot:rot,vPhase:vPhase,vAge:0,alive:true};
    p.maxLife=p.life;return p;
}
function updP(p,dt,cfg){
    var t=1-p.life/p.maxLife;var sm=evalCurve(cfg.speedCurve||"none",1-t,cfg.speedCurveInt);
    if(cfg.damping>0){var df=Math.max(0,1-cfg.damping*dt);p.vx*=df;p.vy*=df;}
    p.vy-=cfg.gravity*dt;p.x+=p.vx*sm*dt;p.y+=p.vy*sm*dt;
    if(cfg.vortex){var vs=cfg.vortexSpeed||2,vw=cfg.vortexWidth||30,vh=cfg.vortexHeight||10;var angle=p.vAge*vs*Math.PI*2+p.vPhase;var prevAngle=(p.vAge-dt)*vs*Math.PI*2+p.vPhase;p.x+=(Math.sin(angle)-Math.sin(prevAngle))*vw;p.y+=(Math.cos(angle*2)-Math.cos(prevAngle*2))*vh;p.vAge+=dt;}
    if(cfg.rotation&&cfg.rotSpeed)p.rot+=d2r(cfg.rotSpeed)*dt;
    p.life-=dt;if(p.life<=0)p.alive=false;
}
var _dc2=null,_dx2=null;
function getDC(w,h){if(!_dc2||_dc2.width<w||_dc2.height<h){_dc2=document.createElement("canvas");_dc2.width=Math.max(w,128);_dc2.height=Math.max(h,128);_dx2=_dc2.getContext("2d");}return{c:_dc2,x:_dx2};}
function drawP(ctx,p,cfg){
    var t=1-p.life/p.maxLife;var col=colAt(t,cfg);
    var ra=cfg.fadeOut?(1-t):1;var alpha=evalCurve(cfg.opacityCurve||"none",ra,cfg.opacityCurveInt);
    var st=evalCurve(cfg.sizeCurve||"none",t,cfg.sizeCurveInt);var ss=lerp(cfg.sizeOverLifetime.start,cfg.sizeOverLifetime.end,st);
    var bs=Math.max(1,Math.round(p.sz*ss));var w=Math.max(1,Math.round(bs*(cfg.scaleX||1)));var h=Math.max(1,Math.round(bs*(cfg.scaleY||1)));
    var cs="rgba("+col.r+","+col.g+","+col.b+","+alpha.toFixed(2)+")";
    var dith=cfg.ditherAmount||0;var dithDep=cfg.ditherDepth||2;var sh=cfg.shape||"square";
    function DS(cx,fw,fh){
        cx.fillStyle=cs;cx.strokeStyle=cs;
        if(sh==="circle"){cx.beginPath();cx.ellipse(0,0,fw/2,fh/2,0,0,Math.PI*2);cx.fill();}
        else if(sh==="triangle"){cx.beginPath();cx.moveTo(0,-fh/2);cx.lineTo(-fw/2,fh/2);cx.lineTo(fw/2,fh/2);cx.closePath();cx.fill();}
        else if(sh==="wave"){var wf=cfg.waveFreq||1;var wSegs=6*wf;cx.lineWidth=Math.max(1,Math.round(bs*0.4));cx.lineCap="round";cx.beginPath();for(var i=0;i<=wSegs;i++){var fx=-fw/2+(fw/wSegs)*i,fy=Math.sin((i/wSegs)*Math.PI*2*wf)*(fh/2);if(i===0)cx.moveTo(fx,fy);else cx.lineTo(fx,fy);}cx.stroke();}
        else if(sh==="halfmoon"){cx.beginPath();cx.arc(0,0,fw/2,-Math.PI/2,Math.PI/2,false);cx.arc(-fw*0.15,0,fw/2.8,Math.PI/2,-Math.PI/2,true);cx.closePath();cx.fill();}
        else{cx.fillRect(-fw/2,-fh/2,fw,fh);}
    }
    if(dith>0&&w>0&&h>0){
        var mg=cfg.glow?(cfg.glowIntensity||8)*2:0;var bw=w+mg*2+4,bh=h+mg*2+4;var d=getDC(bw,bh);
        d.x.clearRect(0,0,bw,bh);d.x.save();d.x.translate(bw/2,bh/2);
        if(cfg.glow){d.x.shadowColor="rgba("+col.r+","+col.g+","+col.b+","+(alpha*0.6).toFixed(2)+")";d.x.shadowBlur=cfg.glowIntensity||8;}
        DS(d.x,w,h);d.x.shadowColor="transparent";d.x.shadowBlur=0;d.x.restore();
        var id=d.x.getImageData(0,0,bw,bh);var dd=id.data;
        var distMap=new Uint8Array(bw*bh);var maxDist=dithDep;
        for(var dy=0;dy<bh;dy++){for(var dx=0;dx<bw;dx++){var di=(dy*bw+dx)*4;if(dd[di+3]===0){distMap[dy*bw+dx]=0;continue;}var isEdge=false;if(dx===0||dy===0||dx===bw-1||dy===bh-1){isEdge=true;}else{if(dd[((dy-1)*bw+dx)*4+3]===0||dd[((dy+1)*bw+dx)*4+3]===0||dd[(dy*bw+dx-1)*4+3]===0||dd[(dy*bw+dx+1)*4+3]===0)isEdge=true;}distMap[dy*bw+dx]=isEdge?1:255;}}
        for(var dist=2;dist<=maxDist;dist++){for(var dy2=0;dy2<bh;dy2++){for(var dx2=0;dx2<bw;dx2++){if(distMap[dy2*bw+dx2]!==255)continue;var hasNeighbor=false;if(dy2>0&&distMap[(dy2-1)*bw+dx2]===dist-1)hasNeighbor=true;if(dy2<bh-1&&distMap[(dy2+1)*bw+dx2]===dist-1)hasNeighbor=true;if(dx2>0&&distMap[dy2*bw+dx2-1]===dist-1)hasNeighbor=true;if(dx2<bw-1&&distMap[dy2*bw+dx2+1]===dist-1)hasNeighbor=true;if(hasNeighbor)distMap[dy2*bw+dx2]=dist;}}}
        for(var di2=0;di2<bw*bh;di2++){var edgeDist=distMap[di2];if(edgeDist===0||edgeDist===255)continue;if(edgeDist>maxDist)continue;var falloff=1-(edgeDist-1)/maxDist;var prob=dith*falloff;if(Math.random()<prob)dd[di2*4+3]=0;}
        d.x.putImageData(id,0,0);ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));
        if(cfg.faceVelocity)ctx.rotate(Math.atan2(p.vy,p.vx));else if(cfg.rotation)ctx.rotate(p.rot);
        ctx.drawImage(d.c,0,0,bw,bh,-bw/2,-bh/2,bw,bh);ctx.restore();return;
    }
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));
    if(cfg.faceVelocity)ctx.rotate(Math.atan2(p.vy,p.vx));else if(cfg.rotation)ctx.rotate(p.rot);
    if(cfg.glow){ctx.shadowColor="rgba("+col.r+","+col.g+","+col.b+","+(alpha*0.6).toFixed(2)+")";ctx.shadowBlur=cfg.glowIntensity||8;}
    DS(ctx,w,h);ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.restore();
}
function drawGrid(ctx,w,h){
    ctx.strokeStyle=GRID_COL;ctx.lineWidth=1;var cx=w/2,cy=h/2;
    for(var x=cx%GS;x<w;x+=GS){ctx.beginPath();ctx.moveTo(x+0.5,0);ctx.lineTo(x+0.5,h);ctx.stroke();}
    for(var y=cy%GS;y<h;y+=GS){ctx.beginPath();ctx.moveTo(0,y+0.5);ctx.lineTo(w,y+0.5);ctx.stroke();}
    ctx.strokeStyle="rgba(255,255,255,0.1)";ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.stroke();
}
function drawHandle(ctx,x,y,col,sel,lbl){
    var s=HS;if(sel){ctx.shadowColor=col;ctx.shadowBlur=10;}
    ctx.strokeStyle=col;ctx.lineWidth=sel?2:1;ctx.strokeRect(x-s/2,y-s/2,s,s);ctx.fillStyle=sel?col+"55":col+"22";ctx.fillRect(x-s/2,y-s/2,s,s);
    ctx.shadowColor="transparent";ctx.shadowBlur=0;ctx.strokeStyle=col+(sel?"cc":"66");ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,y-s);ctx.lineTo(x,y+s);ctx.moveTo(x-s,y);ctx.lineTo(x+s,y);ctx.stroke();
    if(lbl){ctx.font="9px monospace";ctx.fillStyle=col;ctx.textAlign="center";ctx.fillText(lbl,x,y-s-4);}
}

// ============================================
// STYLES
// ============================================
var S={
    cont:{display:"flex",width:"100%",height:"100vh",background:"#0d0d0d",fontFamily:"'JetBrains Mono','Fira Code','Consolas',monospace",color:"#ccc",fontSize:"12px",overflow:"hidden"},
    lp:{width:LW,background:"#0a0a0a",borderRight:"1px solid #1a1a1a",display:"flex",flexDirection:"column",overflowY:"auto",flexShrink:0},
    sp:{width:SYS_W,background:"#0e0e0e",borderRight:"1px solid #1a1a1a",display:"flex",flexDirection:"column",overflowY:"auto",flexShrink:0},
    lh:{padding:"12px",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",color:"#f59e0b",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d",position:"sticky",top:0,zIndex:2},
    ti:{padding:"8px 12px",borderBottom:"1px solid #141414",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"},
    tn:{fontSize:"11px",letterSpacing:"0.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1},
    ta:{display:"flex",gap:4,flexShrink:0,marginLeft:6},
    tb:{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:"11px",padding:"2px 4px",borderRadius:3,lineHeight:1},
    ab:{margin:"8px 12px",padding:"8px",background:"#1a1a1a",color:"#00ffaa",border:"1px dashed #333",fontSize:"10px",fontFamily:"inherit",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",cursor:"pointer",borderRadius:4,textAlign:"center"},
    ei:{padding:"6px 12px",borderBottom:"1px solid #141414",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"},
    ed:{width:8,height:8,borderRadius:"50%",marginRight:8,flexShrink:0},el:{fontSize:"10px",letterSpacing:"0.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1},ep:{fontSize:"9px",color:"#555",marginLeft:4,flexShrink:0},
    cw:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",background:"#0a0a0a",minWidth:0},
    cv:{border:"1px solid #1a1a1a",cursor:"crosshair",imageRendering:"pixelated"},
    sb:{position:"absolute",bottom:8,left:8,color:"#555",fontSize:"10px",userSelect:"none"},
    pl:{color:"#555",fontSize:"10px",textAlign:"center",marginTop:4},
    rp:{width:PW,background:"#111",borderLeft:"1px solid #1a1a1a",overflowY:"auto",display:"flex",flexDirection:"column",flexShrink:0},
    ph:{padding:"12px 14px",fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",color:"#00ffaa",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d",position:"sticky",top:0,zIndex:2},
    sec:{padding:"10px 14px",borderBottom:"1px solid #1a1a1a"},
    st:{fontSize:"10px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1.5px",color:"#666",marginBottom:8},
    row:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,gap:8},
    lab:{color:"#888",fontSize:"11px",whiteSpace:"nowrap",minWidth:70},
    val:{color:"#00ffaa",fontSize:"11px",fontWeight:600,minWidth:36,textAlign:"right"},
    sli:{flex:1,height:4,appearance:"none",WebkitAppearance:"none",background:"#222",borderRadius:2,outline:"none",cursor:"pointer",accentColor:"#00ffaa"},
    tin:{background:"#1a1a1a",border:"1px solid #333",color:"#fff",padding:"4px 8px",fontSize:"11px",fontFamily:"inherit",borderRadius:3,flex:1,outline:"none"},
    cin:{width:32,height:22,border:"1px solid #333",background:"none",cursor:"pointer",padding:0,borderRadius:3},
    tog:{height:18,borderRadius:9,cursor:"pointer",border:"none",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"},
    knob:{width:14,height:14,borderRadius:7,background:"#fff",position:"absolute",top:2,transition:"left 0.15s"},
    sel2:{background:"#1a1a1a",border:"1px solid #333",color:"#fff",padding:"4px 8px",fontSize:"11px",fontFamily:"inherit",borderRadius:3,cursor:"pointer",outline:"none"},
    btn:{width:"100%",padding:"10px",background:"#00ffaa",color:"#0d0d0d",border:"none",fontWeight:700,fontSize:"11px",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"1.5px",cursor:"pointer",borderRadius:3,marginTop:4,textAlign:"center"},
    bbtn:{width:"100%",padding:"10px",background:"#ff6b6b",color:"#fff",border:"none",fontWeight:700,fontSize:"11px",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"1.5px",cursor:"pointer",borderRadius:3,marginTop:4,textAlign:"center"},
    rbtn:{width:"100%",padding:"8px",background:"transparent",color:"#666",border:"1px solid #333",fontWeight:600,fontSize:"10px",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"1px",cursor:"pointer",borderRadius:3,marginTop:4,textAlign:"center"},
    ea:{width:"100%",background:"#0a0a0a",border:"1px solid #333",color:"#00ffaa",fontFamily:"inherit",fontSize:"10px",padding:8,borderRadius:3,resize:"vertical",minHeight:80,marginTop:8,outline:"none",boxSizing:"border-box"},
    ns:{padding:"30px 14px",textAlign:"center",color:"#444",fontSize:"11px",letterSpacing:"1px"},
    ts:{background:"#1a1a1a",border:"1px solid #333",color:"#fff",padding:"4px 8px",fontSize:"11px",fontFamily:"inherit",borderRadius:3,cursor:"pointer",outline:"none",width:"100%"},
    gb:{height:12,borderRadius:3,border:"1px solid #333",marginBottom:8},
    cb:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"11px",color:"#888",marginBottom:4,userSelect:"none"},
    cbi:{accentColor:"#00ffaa",width:14,height:14,cursor:"pointer"},
    cs:{background:"#1a1a1a",border:"1px solid #333",color:"#fff",padding:"3px 6px",fontSize:"10px",fontFamily:"inherit",borderRadius:3,cursor:"pointer",outline:"none",flex:1},
    cp:{width:50,height:20,border:"1px solid #333",borderRadius:2,marginLeft:6,flexShrink:0},
};

// All dropdown sections default to closed
var DEFAULT_COLLAPSED={identity:true,lifetime:true,size:true,color:true,opacity:true,motion:true,distribution:true,rotation:true,spawn:true,effects:true,system:false};

// ============================================
// COMPONENT
// ============================================
function ParticleEditor(){
    var canvasRef=useRef(null),ltRef=useRef(null),afRef=useRef(null),dragRef=useRef(null);
    var [tpls,setTpls]=useState(STARTERS.map(dc));var [actTpl,setActTpl]=useState(null);var [dirty,setDirty]=useState(false);
    var [sysDur,setSysDur]=useState(2.0);var [sysMode,setSysMode]=useState("loop");
    var [sysTime,setSysTime]=useState(0);var sysTimeRef=useRef(0);
    var [ems,setEms]=useState([]);var [selId,setSelId]=useState(null);var emsRef=useRef(ems);
    var [pCount,setPCount]=useState(0);var [paused,setPaused]=useState(false);
    var [showExp,setShowExp]=useState(false);var [expJSON,setExpJSON]=useState("");var [showHelp,setShowHelp]=useState(false);
    var [showGrid,setShowGrid]=useState(true);var [showH,setShowH]=useState(true);
    var [bgB,setBgB]=useState(0);var [zoom,setZoom]=useState(1);
    var [panX,setPanX]=useState(0);var [panY,setPanY]=useState(0);
    var panRef=useRef(false),panStart=useRef({x:0,y:0,px:0,py:0});
    var [palMode,setPalMode]=useState(false);var [palIdx,setPalIdx]=useState(0);
    var [palPickKey,setPalPickKey]=useState(null);
    var [collapsed,setCollapsed]=useState(DEFAULT_COLLAPSED);

    var pausedR=useRef(paused),selIdR=useRef(selId),sysDurR=useRef(sysDur),sysModeR=useRef(sysMode);
    var showGridR=useRef(showGrid),showHR=useRef(showH),bgBR=useRef(bgB),zoomR=useRef(zoom),panXR=useRef(panX),panYR=useRef(panY);
    useEffect(function(){emsRef.current=ems;},[ems]);useEffect(function(){pausedR.current=paused;},[paused]);
    useEffect(function(){selIdR.current=selId;},[selId]);useEffect(function(){sysDurR.current=sysDur;},[sysDur]);
    useEffect(function(){sysModeR.current=sysMode;},[sysMode]);useEffect(function(){showGridR.current=showGrid;},[showGrid]);
    useEffect(function(){showHR.current=showH;},[showH]);useEffect(function(){bgBR.current=bgB;},[bgB]);
    useEffect(function(){zoomR.current=zoom;},[zoom]);useEffect(function(){panXR.current=panX;},[panX]);
    useEffect(function(){panYR.current=panY;},[panY]);

    // BUG FIX: Reset emitter firing state when sysDur or sysMode changes
    useEffect(function(){
        sysTimeRef.current=0;setSysTime(0);
        setEms(function(p){return p.map(function(e){return Object.assign({},e,{spawnAcc:0,actIndex:0,actElapsed:0});});});
    },[sysDur,sysMode]);

    var selEm=null;for(var i=0;i<ems.length;i++){if(ems[i].id===selId){selEm=ems[i];break;}}

    // ---- TEMPLATES ----
    function loadTpl(i){setActTpl(i);}
    function saveTpl(){if(actTpl===null||!selEm)return;setTpls(function(p){var n=p.map(dc);n[actTpl]=dc(selEm.pcfg);return n;});setDirty(false);}
    function saveNew(){if(!selEm)return;var t=dc(selEm.pcfg);t.name+="_copy";setTpls(function(p){return p.map(dc).concat([t]);});}
    function dupTpl(i){var d2=dc(tpls[i]);d2.name+="_copy";setTpls(function(p){return p.map(dc).concat([d2]);});}
    function delTpl(i){setTpls(function(p){return p.filter(function(_,j){return j!==i;});});if(actTpl===i)setActTpl(null);else if(actTpl>i)setActTpl(actTpl-1);}
    function newTpl(){var t=dc(DEF_PCFG);t.name="new_template";setTpls(function(p){return p.map(dc).concat([t]);});}

    // ---- EMITTERS ----
    function addEm(){
        var ti=actTpl!==null?actTpl:0;if(!tpls.length)return;
        var tpl=tpls[ti]||tpls[0];var id=mid();var col=EM_COLS[ems.length%EM_COLS.length];
        setEms(function(p){return p.concat([{id:id,x:CW/2,y:CH/2,pcfg:dc(tpl),handleColor:col,type:"loop",spawnRate:15,burstSub:"instant",startTime:0,burstCount:20,emDuration:1,activations:1,burstSpawnRate:30,actDelay:0,particles:[],spawnAcc:0,actIndex:0,actElapsed:0}]);});setSelId(id);
    }
    function delEm(id){setEms(function(p){return p.filter(function(e){return e.id!==id;});});if(selId===id)setSelId(null);}
    function applyTpl(idx){if(!selId)return;var t=tpls[idx];if(!t)return;setEms(function(p){return p.map(function(e){return e.id===selId?Object.assign({},e,{pcfg:dc(t),particles:[],spawnAcc:0,actIndex:0,actElapsed:0}):e;});});}
    function fireBurst(){
        if(!selEm)return;setEms(function(p){return p.map(function(e){
            if(e.id!==selId)return e;var np=e.particles.slice();
            for(var b=0;b<(e.burstCount||20);b++){if(np.length<MAX_P)np.push(mkP(e.x,e.y,e.pcfg));}
            return Object.assign({},e,{particles:np});
        });});
    }
    function setEmF(f,v){if(!selId)return;setEms(function(p){return p.map(function(e){if(e.id!==selId)return e;var n={};n[f]=v;return Object.assign({},e,n);});});}
    function setPcfg(k,v){if(!selId)return;setEms(function(p){return p.map(function(e){return e.id===selId?Object.assign({},e,{pcfg:sv(e.pcfg,k,v)}):e;});});setDirty(true);}
    function restart(){sysTimeRef.current=0;setSysTime(0);setEms(function(p){return p.map(function(e){return Object.assign({},e,{particles:[],spawnAcc:0,actIndex:0,actElapsed:0});});});}

    // ---- MAIN LOOP ----
    var tick=useCallback(function(ts){
        var cv=canvasRef.current;if(!cv)return;var ctx=cv.getContext("2d");
        if(!ltRef.current)ltRef.current=ts;var dt=Math.min((ts-ltRef.current)/1000,0.05);ltRef.current=ts;
        var allEm=emsRef.current,sid=selIdR.current,sd=sysDurR.current,sm=sysModeR.current;
        var z=zoomR.current,px=panXR.current,py=panYR.current;
        ctx.clearRect(0,0,CW,CH);
        var bg=bgBR.current;if(bg>0){var bv=Math.round(bg*255);ctx.fillStyle="rgb("+bv+","+bv+","+bv+")";ctx.fillRect(0,0,CW,CH);}
        ctx.save();ctx.translate(CW/2,CH/2);ctx.scale(z,z);ctx.translate(-CW/2+px,-CH/2+py);
        if(showGridR.current)drawGrid(ctx,CW,CH);
        var st=sysTimeRef.current;
        if(!pausedR.current){
            st+=dt;
            if(st>=sd){
                if(sm==="loop"){st=st%sd;for(var r=0;r<allEm.length;r++){allEm[r].spawnAcc=0;allEm[r].actIndex=0;allEm[r].actElapsed=0;}}
                else{st=sd;}
            }
            sysTimeRef.current=st;
        }
        var totalP=0;
        for(var i=0;i<allEm.length;i++){
            var em=allEm[i],cfg=em.pcfg,parts=em.particles;
            if(!pausedR.current){
                if(em.type==="loop"){
                    var loopActive=!(sm==="burst"&&st>=sd);
                    if(loopActive&&em.spawnRate>0){em.spawnAcc+=em.spawnRate*dt;var sp=Math.floor(em.spawnAcc);em.spawnAcc-=sp;for(var s=0;s<sp;s++){if(totalP+parts.length<MAX_P)parts.push(mkP(em.x,em.y,cfg));}}
                } else if(em.burstSub==="instant"){
                    if(em.actIndex===0&&st>=getST(em)){for(var bi=0;bi<(em.burstCount||20);bi++){if(totalP+parts.length<MAX_P)parts.push(mkP(em.x,em.y,cfg));}em.actIndex=1;}
                } else {
                    var emStart=getST(em);var actDur=em.emDuration||1;var actTotal=em.activations||1;var actDly=em.actDelay||0;
                    if(em.actIndex<actTotal){var actStart=emStart+em.actIndex*(actDur+actDly);var actEnd=actStart+actDur;
                        if(st>=actStart&&st<actEnd){em.actElapsed+=dt;var rate=em.burstSpawnRate||30;em.spawnAcc+=rate*dt;var sp2=Math.floor(em.spawnAcc);em.spawnAcc-=sp2;for(var sd2=0;sd2<sp2;sd2++){if(totalP+parts.length<MAX_P)parts.push(mkP(em.x,em.y,cfg));}}
                        if(st>=actEnd){em.actIndex++;em.actElapsed=0;em.spawnAcc=0;}
                    }
                }
            }
            if(!pausedR.current){for(var j=parts.length-1;j>=0;j--){updP(parts[j],dt,cfg);if(!parts[j].alive)parts.splice(j,1);}}
            for(var k=0;k<parts.length;k++)drawP(ctx,parts[k],cfg);
            totalP+=parts.length;
        }
        if(showHR.current){for(var h=0;h<allEm.length;h++){var e=allEm[h];var sc=e.pcfg.spawnShape||"point",isSel2=e.id===sid;
            if(sc!=="point"){ctx.save();ctx.strokeStyle=e.handleColor+(isSel2?"55":"22");ctx.lineWidth=1;ctx.setLineDash([3,3]);
                if(sc==="line"){var la=d2r(e.pcfg.spawnAngle||0),lw=(e.pcfg.spawnWidth||40)/2;ctx.beginPath();ctx.moveTo(e.x-Math.cos(la)*lw,e.y-Math.sin(la)*lw);ctx.lineTo(e.x+Math.cos(la)*lw,e.y+Math.sin(la)*lw);ctx.stroke();}
                else if(sc==="circle"||sc==="ring"){ctx.beginPath();ctx.ellipse(e.x,e.y,e.pcfg.spawnRadius||20,e.pcfg.spawnRadius||20,0,0,Math.PI*2);ctx.stroke();}
                else if(sc==="rect"){var rw=(e.pcfg.spawnWidth||40)/2,rh=(e.pcfg.spawnHeight||40)/2;ctx.strokeRect(e.x-rw,e.y-rh,rw*2,rh*2);}
                ctx.setLineDash([]);ctx.restore();}
            drawHandle(ctx,e.x,e.y,e.handleColor,isSel2,e.pcfg.name);
        }}
        ctx.restore();setPCount(totalP);setSysTime(st);
        afRef.current=requestAnimationFrame(tick);
    },[]);
    useEffect(function(){afRef.current=requestAnimationFrame(tick);return function(){if(afRef.current)cancelAnimationFrame(afRef.current);};},[tick]);

    // ---- MOUSE ----
    function onMD(e){if(e.button===1){e.preventDefault();panRef.current=true;panStart.current={x:e.clientX,y:e.clientY,px:panX,py:panY};return;}if(e.button!==0)return;var rect=canvasRef.current.getBoundingClientRect();var z2=zoom;var mx=(e.clientX-rect.left-CW/2)/z2+CW/2-panX,my=(e.clientY-rect.top-CH/2)/z2+CH/2-panY;for(var i=ems.length-1;i>=0;i--){var em=ems[i];if(Math.abs(mx-em.x)<HS/z2&&Math.abs(my-em.y)<HS/z2){dragRef.current=em.id;setSelId(em.id);return;}}setSelId(null);}
    function onMM(e){if(panRef.current){setPanX(panStart.current.px+(e.clientX-panStart.current.x)/zoom);setPanY(panStart.current.py+(e.clientY-panStart.current.y)/zoom);return;}if(!dragRef.current)return;var rect=canvasRef.current.getBoundingClientRect();var z2=zoom;var mx=(e.clientX-rect.left-CW/2)/z2+CW/2-panX,my=(e.clientY-rect.top-CH/2)/z2+CH/2-panY;setEms(function(p){return p.map(function(em){return em.id===dragRef.current?Object.assign({},em,{x:Math.round(mx),y:Math.round(my)}):em;});});}
    function onMU(e){if(e&&e.button===1)panRef.current=false;dragRef.current=null;}
    function onCM(e){e.preventDefault();}

    // ---- EXPORT ----
    function cfgExp(cfg){return{name:cfg.name,size:cfg.size,sizeOverLifetime:cfg.sizeOverLifetime,sizeCurve:cfg.sizeCurve,sizeCurveInt:cfg.sizeCurveInt,scaleX:cfg.scaleX,scaleY:cfg.scaleY,speed:cfg.speed,speedCurve:cfg.speedCurve,speedCurveInt:cfg.speedCurveInt,lifetime:cfg.lifetime,colorStart:cfg.colorStart,colorMid:cfg.colorMid,colorEnd:cfg.colorEnd,colorMidPoint:cfg.colorMidPoint,colorCurve:cfg.colorCurve,colorCurveInt:cfg.colorCurveInt,fadeOut:cfg.fadeOut,opacityCurve:cfg.opacityCurve,opacityCurveInt:cfg.opacityCurveInt,gravity:cfg.gravity,spread:cfg.spread,direction:cfg.direction,shape:cfg.shape,waveFreq:cfg.waveFreq,damping:cfg.damping,faceVelocity:cfg.faceVelocity,radialBurst:cfg.radialBurst,biasX:cfg.biasX,biasY:cfg.biasY,rotation:cfg.rotation,rotStart:cfg.rotStart,rotRandom:cfg.rotRandom,rotSpeed:cfg.rotSpeed,spawnShape:cfg.spawnShape,spawnWidth:cfg.spawnWidth,spawnHeight:cfg.spawnHeight,spawnRadius:cfg.spawnRadius,spawnAngle:cfg.spawnAngle,vortex:cfg.vortex,vortexWidth:cfg.vortexWidth,vortexHeight:cfg.vortexHeight,vortexSpeed:cfg.vortexSpeed,vortexPhaseRand:cfg.vortexPhaseRand,ditherAmount:cfg.ditherAmount,ditherDepth:cfg.ditherDepth,glow:cfg.glow,glowIntensity:cfg.glowIntensity};}
    function expScene(){var sc={systemDuration:sysDur,systemMode:sysMode,templates:tpls.map(cfgExp),emitters:ems.map(function(em){return{id:em.id,position:{x:em.x,y:em.y},type:em.type,burstSub:em.burstSub,spawnRate:em.spawnRate,burstCount:em.burstCount,burstSpawnRate:em.burstSpawnRate,activations:em.activations,actDelay:em.actDelay,startTime:em.startTime,emitterDuration:em.emDuration,config:cfgExp(em.pcfg)};})};setExpJSON(JSON.stringify(sc,null,2));setShowExp(true);}
    function expSel(){if(!selEm)return;var o=cfgExp(selEm.pcfg);Object.assign(o,{position:{x:selEm.x,y:selEm.y},type:selEm.type,burstSub:selEm.burstSub,spawnRate:selEm.spawnRate,burstCount:selEm.burstCount,burstSpawnRate:selEm.burstSpawnRate,activations:selEm.activations,actDelay:selEm.actDelay,startTime:selEm.startTime,emitterDuration:selEm.emDuration});setExpJSON(JSON.stringify(o,null,2));setShowExp(true);}
    function clearScene(){setEms([]);setSelId(null);setShowExp(false);}
    function cpExp(){navigator.clipboard.writeText(expJSON);}

    // ---- RENDER HELPERS ----
    function CurveSVG(props){var pts=[];for(var i=0;i<=20;i++){var t=i/20;pts.push({x:t,y:evalCurve(props.c,t,props.inten)});}var d="M "+pts.map(function(p){return(p.x*48+1)+" "+(Math.max(0,Math.min(20,(1-p.y)*18+1)));}).join(" L ");return <svg width={50} height={20} style={S.cp}><path d={d} stroke="#00ffaa" strokeWidth={1.5} fill="none"/></svg>;}
    function renderP(def,idx){
        if(def.type==="sublabel")return <div key={"sl_"+idx} style={{fontSize:"9px",color:"#555",letterSpacing:"1px",textTransform:"uppercase",marginTop:8,marginBottom:4,borderTop:"1px solid #1a1a1a",paddingTop:6}}>{def.label}</div>;
        if(!selEm)return null;if(def.showIf&&!selEm.pcfg[def.showIf])return null;if(def.showIfNotNone&&(!selEm.pcfg[def.showIfNotNone]||selEm.pcfg[def.showIfNotNone]==="none"))return null;if(def.showIfVal){var siv=selEm.pcfg[def.showIfVal.key];var sivMatch=Array.isArray(def.showIfVal.val)?def.showIfVal.val.indexOf(siv)!==-1:siv===def.showIfVal.val;if(!sivMatch)return null;}
        var v=gv(selEm.pcfg,def.key);
        if(def.type==="text")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><input style={S.tin} value={v} onChange={function(e){setPcfg(def.key,e.target.value);}}/></div>;
        if(def.type==="slider")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><input type="range" style={S.sli} min={def.min} max={def.max} step={def.step} value={v} onChange={function(e){setPcfg(def.key,def.step<1?parseFloat(e.target.value):parseInt(e.target.value));}}/><span style={S.val}>{v}</span></div>;
        if(def.type==="color"){
            if(palMode){
                var isOpen=palPickKey===def.key;
                return <div key={def.key} style={{...S.row,position:"relative",flexWrap:"wrap"}}>
                    <span style={S.lab}>{def.label}</span>
                    <div style={{width:32,height:22,background:v,border:isOpen?"2px solid #00e5ff":"1px solid #333",borderRadius:3,cursor:"pointer",boxSizing:"border-box"}} onClick={function(){setPalPickKey(isOpen?null:def.key);}}/>
                    <span style={S.val}>{v}</span>
                    {isOpen&&<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:100,background:"#1a1a1a",border:"1px solid #333",borderRadius:4,padding:6,marginTop:2,display:"flex",flexWrap:"wrap",gap:2}}>
                        {PALETTES[palIdx].colors.map(function(c,ci){return <div key={ci} style={{width:20,height:20,background:c,borderRadius:2,cursor:"pointer",border:c===v?"2px solid #fff":"1px solid #333",boxSizing:"border-box"}} onClick={function(){setPcfg(def.key,c);setPalPickKey(null);}}/>;})}</div>}
                </div>;
            }
            return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><input type="color" style={S.cin} value={v} onChange={function(e){setPcfg(def.key,e.target.value);}}/><span style={S.val}>{v}</span></div>;
        }
        if(def.type==="toggle")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><button style={{...S.tog,background:v?"#00ffaa":"#333",width:36}} onClick={function(){setPcfg(def.key,!v);}}><div style={{...S.knob,left:v?20:2}}/></button></div>;
        if(def.type==="select")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><select style={S.sel2} value={v} onChange={function(e){setPcfg(def.key,e.target.value);}}>{def.options.map(function(o){return <option key={o} value={o}>{o}</option>;})}</select></div>;
        if(def.type==="curve"){var intKey=def.key+"Int";var inten=selEm.pcfg[intKey]!==undefined?selEm.pcfg[intKey]:1;return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><select style={S.cs} value={v||"none"} onChange={function(e){setPcfg(def.key,e.target.value);}}>{CURVES.map(function(c){return <option key={c} value={c}>{CURVE_LBL[c]}</option>;})}</select><CurveSVG c={v||"none"} inten={inten}/></div>;}
        return null;
    }
    function rg(g){return P_DEFS.filter(function(d){return d.group===g;}).map(function(d,i){return renderP(d,i);});}
    function togSec(name){setCollapsed(function(p){var n=Object.assign({},p);n[name]=!n[name];return n;});}
    function sec(name,label,children,color){
        var isOpen=!collapsed[name];
        return <div key={name} style={{borderBottom:"2px solid #2a2a2a"}}>
            <div style={{...S.st,padding:"10px 14px",marginBottom:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",userSelect:"none",borderLeft:isOpen?"3px solid #00e5ff":"3px solid transparent"}} onClick={function(){togSec(name);}}>
                <span style={color?{color:color}:null}>{label}</span>
                <span style={{fontSize:"9px",color:"#00e5ff",transform:isOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.15s"}}>{"\u25B6"}</span>
            </div>
            {isOpen&&<div style={{padding:"0 14px 10px"}}>{children}</div>}
        </div>;
    }
    function colorPrev(){if(!selEm)return null;var c=selEm.pcfg;return <div style={{...S.gb,background:"linear-gradient(to right,"+c.colorStart+","+c.colorMid+" "+Math.round(c.colorMidPoint*100)+"%,"+c.colorEnd+")"}}/>;}
    function renderTL(){
        var pct=sysDur>0?(sysTime/sysDur)*100:0;
        var barH=Math.max(6,Math.min(12,Math.floor((TL_H-8)/Math.max(ems.length,1))));
        return <div style={{width:"100%",height:TL_H,background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:4,position:"relative",overflow:"hidden",cursor:"pointer"}} onClick={function(e){var rect=e.currentTarget.getBoundingClientRect();var t=((e.clientX-rect.left)/rect.width)*sysDur;sysTimeRef.current=Math.max(0,Math.min(sysDur,t));setSysTime(sysTimeRef.current);setEms(function(p){return p.map(function(em){return Object.assign({},em,{spawnAcc:0,actIndex:0,actElapsed:0});});});}}>
            {ems.map(function(em,idx){
                var isSel=em.id===selId;var yOff=4+idx*barH;var opacity=isSel?0.9:0.3;
                if(em.type==="loop"){return <div key={em.id} style={{position:"absolute",top:yOff,height:barH-1,left:0,width:"100%",background:em.handleColor,opacity:opacity,borderRadius:2,pointerEvents:"none"}}/>;}
                else if(em.burstSub==="instant"){var lp=sysDur>0?(getST(em)/sysDur)*100:0;return <div key={em.id} style={{position:"absolute",top:yOff,height:barH-1,left:lp+"%",width:3,background:em.handleColor,opacity:opacity,borderRadius:1,pointerEvents:"none"}}/>;}
                else{var blocks=[];var emStart=getST(em);var actDur=em.emDuration||1;var actCount=em.activations||1;var actDly=em.actDelay||0;for(var a=0;a<actCount;a++){var aStart=emStart+a*(actDur+actDly);var lPct=sysDur>0?(aStart/sysDur)*100:0;var wPct=sysDur>0?(actDur/sysDur)*100:0;blocks.push(<div key={em.id+"_"+a} style={{position:"absolute",top:yOff,height:barH-1,left:lPct+"%",width:wPct+"%",background:em.handleColor,opacity:opacity,borderRadius:1,borderRight:a<actCount-1?"1px solid #0a0a0a":"none",pointerEvents:"none",boxSizing:"border-box"}}/>);}return blocks;}
            })}
            <div style={{position:"absolute",top:0,bottom:0,width:2,background:"#00ffaa",zIndex:3,pointerEvents:"none",left:pct+"%"}}/>
            <div style={{position:"absolute",bottom:2,right:4,fontSize:"9px",color:"#555",pointerEvents:"none"}}>{sysTime.toFixed(2)}s / {sysDur.toFixed(1)}s</div>
        </div>;
    }
    // Toggle button helper — centered text via flexbox, no absolute positioning
    function togBtn(label,isOn,onClick,bgOn,bgOff,w){
        return <button style={{...S.tog,background:isOn?(bgOn||"#00ffaa"):(bgOff||"#ff6b6b"),width:w||60}} onClick={onClick}>
            <span style={{fontSize:"9px",fontWeight:700,color:"#000",pointerEvents:"none",lineHeight:1}}>{label}</span>
        </button>;
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div style={S.cont}>
            {/* LEFT — Templates + Scene list */}
            <div style={S.lp}>
                <div style={S.lh}>Templates ({tpls.length})</div>
                {tpls.map(function(t,idx){var a=idx===actTpl;return(
                    <div key={"t"+idx} style={{...S.ti,background:a?"#1a1a1a":"transparent",borderLeft:a?"3px solid #f59e0b":"3px solid transparent"}} onClick={function(){loadTpl(idx);}}>
                        <div style={{width:10,height:10,borderRadius:2,background:t.colorStart,marginRight:8,flexShrink:0}}/><span style={{...S.tn,color:a?"#f59e0b":"#aaa"}}>{t.name}</span>
                        <div style={S.ta}><button style={{...S.tb,color:"#888"}} onClick={function(e){e.stopPropagation();dupTpl(idx);}}>{"\u2398"}</button><button style={{...S.tb,color:"#f44"}} onClick={function(e){e.stopPropagation();delTpl(idx);}}>{"\u2715"}</button></div>
                    </div>);})}
                <button style={S.ab} onClick={newTpl}>+ New Template</button>
                <button style={{...S.ab,color:"#00ffaa",borderColor:"#00ffaa44",background:"#0d1a14"}} onClick={addEm}>+ Add Emitter</button>
                <div style={{...S.lh,color:"#00ffaa"}}>Scene ({ems.length})</div>
                {ems.map(function(em){var s=em.id===selId;var typeLabel=em.type==="loop"?"\u221E":em.burstSub==="instant"?"B":"BD";return(
                    <div key={em.id} style={{...S.ei,background:s?"#1a1a1a":"transparent",borderLeft:"3px solid "+(s?em.handleColor:"transparent")}} onClick={function(){setSelId(em.id);}}>
                        <div style={{...S.ed,background:em.handleColor}}/><span style={{...S.el,color:s?em.handleColor:"#aaa"}}>{em.pcfg.name}</span>
                        <span style={{fontSize:"8px",color:em.type==="loop"?"#00ffaa":"#ff6b6b",marginLeft:4}}>{typeLabel}</span>
                        <span style={S.ep}>({em.x},{em.y})</span>
                        <button style={{...S.tb,color:"#f44",marginLeft:4}} onClick={function(e){e.stopPropagation();delEm(em.id);}}>{"\u2715"}</button>
                    </div>);})}
                {ems.length===0&&<div style={{padding:12,color:"#333",fontSize:"10px",textAlign:"center"}}>No emitters yet.</div>}
            </div>

            {/* SYSTEM — own column */}
            <div style={S.sp}>
                <div style={{...S.lh,color:"#f59e0b"}}>System</div>
                {sec("system","Settings",<>
                    <div style={S.row}><span style={S.lab}>Duration</span><input type="range" style={S.sli} min={0.5} max={10} step={0.1} value={sysDur} onChange={function(e){setSysDur(parseFloat(e.target.value));}}/><span style={S.val}>{sysDur.toFixed(1)}s</span></div>
                    <div style={S.row}><span style={S.lab}>Mode</span>{togBtn(sysMode==="loop"?"LOOP":"BURST",sysMode==="loop",function(){setSysMode(sysMode==="loop"?"burst":"loop");})}</div>
                </>,"#f59e0b")}
                <div style={{padding:"10px 14px"}}>{renderTL()}</div>
                <div style={{padding:"0 14px 10px",display:"flex",gap:6}}>
                    <button style={{...S.rbtn,marginTop:0,flex:1,color:paused?"#f44":"#00ffaa",borderColor:paused?"#f4444444":"#00ffaa44"}} onClick={function(){setPaused(!paused);}}>{paused?"\u25B6 PLAY":"\u23F8 PAUSE"}</button>
                    <button style={{...S.rbtn,marginTop:0,flex:1,color:"#f59e0b",borderColor:"#f59e0b44"}} onClick={restart}>{"\u21BB"} RESTART</button>
                </div>
            </div>

            {/* CANVAS */}
            <div style={S.cw}>
                <canvas ref={canvasRef} width={CW} height={CH} style={S.cv} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onContextMenu={onCM}/>
                <div style={S.pl}>{selEm?selEm.pcfg.name+" ("+selEm.x+","+selEm.y+")":"Middle-click to pan"}</div>
                <div style={S.sb}>Particles: {pCount}/{MAX_P} | {ems.length} emitters{paused?" | PAUSED":""}</div>
                <div style={{position:"absolute",top:8,right:8,display:"flex",gap:12}}>
                    <label style={S.cb}><input type="checkbox" checked={showGrid} onChange={function(){setShowGrid(!showGrid);}} style={S.cbi}/>Grid</label>
                    <label style={S.cb}><input type="checkbox" checked={showH} onChange={function(){setShowH(!showH);}} style={S.cbi}/>Handles</label>
                </div>
                <div style={{position:"absolute",top:8,left:8,display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:"9px",color:"#555",width:24}}>BG</span><input type="range" min={0} max={1} step={0.05} value={bgB} onChange={function(e){setBgB(parseFloat(e.target.value));}} style={{width:80,height:3,accentColor:"#888",cursor:"pointer"}}/></div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:"9px",color:"#555",width:24}}>Zoom</span><input type="range" min={0.25} max={4} step={0.25} value={zoom} onChange={function(e){setZoom(parseFloat(e.target.value));}} style={{width:80,height:3,accentColor:"#00ffaa",cursor:"pointer"}}/><span style={{fontSize:"9px",color:"#555"}}>{zoom.toFixed(2)}x</span></div>
                    <button onClick={function(){setPanX(0);setPanY(0);}} style={{fontSize:"8px",color:"#555",background:"none",border:"1px solid #333",borderRadius:3,padding:"2px 6px",cursor:"pointer",fontFamily:"inherit"}}>Reset Pan</button>
                </div>
            </div>

            {/* RIGHT — Emitter properties */}
            <div style={S.rp}>
                <div style={S.ph}>
                    <span>{selEm?selEm.pcfg.name:"Particle Editor"}{dirty&&selEm&&<span style={{color:"#f59e0b",marginLeft:8,fontSize:"9px"}}>{"\u25CF"} EDITED</span>}</span>
                    <span style={{float:"right",display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{cursor:"pointer",color:"#555",fontSize:"12px",fontWeight:"bold"}} onClick={function(){setShowHelp(true);}}>?</span>
                    </span>
                </div>
                {/* RESTART + PLAY/PAUSE — easy access at top of emitter panel */}
                <div style={{padding:"6px 14px",borderBottom:"1px solid #1a1a1a",display:"flex",gap:6}}>
                    <button style={{...S.rbtn,marginTop:0,flex:1,color:"#f59e0b",borderColor:"#f59e0b44"}} onClick={restart}>{"\u21BB"} RESTART</button>
                    <button style={{...S.rbtn,marginTop:0,flex:1,color:paused?"#f44":"#00ffaa",borderColor:paused?"#f4444444":"#00ffaa44"}} onClick={function(){setPaused(!paused);}}>{paused?"\u25B6 PLAY":"\u23F8 PAUSE"}</button>
                </div>
                {selEm?(<>
                    <div style={S.sec}><div style={S.st}>Emitter Type</div>
                        <div style={S.row}><span style={S.lab}>Type</span>{togBtn(selEm.type==="loop"?"LOOP":"BURST",selEm.type==="loop",function(){setEmF("type",selEm.type==="loop"?"burst":"loop");})}</div>
                        {selEm.type==="loop"&&(<><div style={S.row}><span style={S.lab}>Spawn Rate</span><input type="range" style={S.sli} min={0} max={100} step={1} value={selEm.spawnRate} onChange={function(e){setEmF("spawnRate",parseInt(e.target.value));}}/><span style={S.val}>{selEm.spawnRate}</span></div></>)}
                        {selEm.type==="burst"&&(<>
                            <div style={S.row}><span style={S.lab}>Burst Sub</span>{togBtn(selEm.burstSub==="instant"?"INSTANT":"DURATION",selEm.burstSub==="instant",function(){setEmF("burstSub",selEm.burstSub==="instant"?"duration":"instant");},"#ffe66d","#a29bfe",70)}</div>
                            <div style={S.row}><span style={S.lab}>Start Time</span><input type="range" style={S.sli} min={0} max={sysDur} step={0.05} value={getST(selEm)} onChange={function(e){setEmF("startTime",parseFloat(e.target.value));}}/><span style={S.val}>{getST(selEm).toFixed(2)}s</span></div>
                            {selEm.burstSub==="instant"&&(<><div style={S.row}><span style={S.lab}>Count</span><input type="range" style={S.sli} min={1} max={200} step={1} value={selEm.burstCount} onChange={function(e){setEmF("burstCount",parseInt(e.target.value));}}/><span style={S.val}>{selEm.burstCount}</span></div><button style={S.bbtn} onClick={fireBurst}>{"\u26A1"} Fire Burst</button></>)}
                            {selEm.burstSub==="duration"&&(<>
                                <div style={S.row}><span style={S.lab}>Duration</span><input type="range" style={S.sli} min={0.05} max={10} step={0.05} value={selEm.emDuration||1} onChange={function(e){setEmF("emDuration",parseFloat(e.target.value));}}/><span style={S.val}>{(selEm.emDuration||1).toFixed(2)}s</span></div>
                                <div style={S.row}><span style={S.lab}>Activations</span><input type="range" style={S.sli} min={1} max={10} step={1} value={selEm.activations||1} onChange={function(e){setEmF("activations",parseInt(e.target.value));}}/><span style={S.val}>{selEm.activations||1}</span></div>
                                <div style={S.row}><span style={S.lab}>Act. Delay</span><input type="range" style={S.sli} min={0} max={5} step={0.05} value={selEm.actDelay||0} onChange={function(e){setEmF("actDelay",parseFloat(e.target.value));}}/><span style={S.val}>{(selEm.actDelay||0).toFixed(2)}s</span></div>
                                <div style={S.row}><span style={S.lab}>Spawn Rate</span><input type="range" style={S.sli} min={1} max={200} step={1} value={selEm.burstSpawnRate||30} onChange={function(e){setEmF("burstSpawnRate",parseInt(e.target.value));}}/><span style={S.val}>{selEm.burstSpawnRate||30}</span></div>
                            </>)}
                        </>)}
                    </div>
                    <div style={S.sec}><div style={S.st}>Apply Template</div><select style={S.ts} value="" onChange={function(e){var idx=parseInt(e.target.value);if(!isNaN(idx))applyTpl(idx);}}><option value="" disabled>Select...</option>{tpls.map(function(t,i){return <option key={i} value={i}>{t.name}</option>;})}</select></div>
                    {sec("identity","Identity",rg("identity"))}
                    {sec("lifetime","Lifetime",rg("lifetime"),"#f59e0b")}
                    {sec("size","Size",rg("size"))}
                    {sec("color","Color",<>{colorPrev()}<div style={S.row}><span style={S.lab}>Pixel Palette</span><button style={{...S.tog,background:palMode?"#f59e0b":"#333",width:36}} onClick={function(){setPalMode(!palMode);}}><div style={{...S.knob,left:palMode?20:2}}/></button></div>
                        {palMode&&(<><div style={S.row}><span style={S.lab}>Palette</span><select style={S.sel2} value={palIdx} onChange={function(e){setPalIdx(parseInt(e.target.value));}}>{PALETTES.map(function(p,i){return <option key={i} value={i}>{p.name+" ("+p.colors.length+")"}</option>;})}</select></div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:1,marginBottom:8,padding:"4px 0"}}>{PALETTES[palIdx].colors.map(function(c,ci){return <div key={ci} style={{width:16,height:16,background:c,borderRadius:2,cursor:"pointer",border:"1px solid #333",boxSizing:"border-box"}} title={c} onClick={function(){if(!selEm)return;var keys=["colorStart","colorMid","colorEnd"];var cur=[selEm.pcfg.colorStart,selEm.pcfg.colorMid,selEm.pcfg.colorEnd];var best=0,bestD=Infinity;for(var k=0;k<3;k++){var src=h2rgb(cur[k]),tgt=h2rgb(c);var d2=(src.r-tgt.r)*(src.r-tgt.r)+(src.g-tgt.g)*(src.g-tgt.g)+(src.b-tgt.b)*(src.b-tgt.b);if(d2<bestD){bestD=d2;best=k;}}setPcfg(keys[best],c);}}/>;})}</div>
                            <div style={{display:"flex",gap:4,marginBottom:8}}><button style={{...S.rbtn,flex:1,marginTop:0,fontSize:"9px",color:"#f59e0b",borderColor:"#f59e0b44"}} onClick={function(){if(!selEm)return;setPcfg("colorStart",snapToPal(selEm.pcfg.colorStart,palIdx));setPcfg("colorMid",snapToPal(selEm.pcfg.colorMid,palIdx));setPcfg("colorEnd",snapToPal(selEm.pcfg.colorEnd,palIdx));}}>Snap All Colors</button></div>
                        </>)}{rg("color")}</>)}
                    {sec("opacity","Opacity",rg("opacity"))}
                    {sec("motion","Motion",rg("motion"))}
                    {sec("distribution","Spread & Distribution",rg("distribution"))}
                    {sec("rotation","Rotation",rg("rotation"))}
                    {sec("spawn","Spawn Area",rg("spawn"))}
                    {sec("effects","Shape & Effects",rg("effects"))}
                    <div style={S.sec}>
                        {actTpl!==null&&<button style={S.btn} onClick={saveTpl}>Save to "{selEm?selEm.pcfg.name:"template"}"</button>}
                        <button style={{...S.rbtn,color:"#00ffaa",borderColor:"#00ffaa44"}} onClick={saveNew}>Save as New Template</button>
                    </div>
                </>):<div style={S.ns}>Select an emitter to edit, or add one.</div>}
                <div style={S.sec}><div style={S.st}>Export</div>
                    {selEm&&<button style={S.btn} onClick={expSel}>Export Selected</button>}
                    <button style={{...S.btn,background:"#f59e0b",marginTop:4}} onClick={expScene}>Export Full Scene</button>
                    <button style={S.rbtn} onClick={clearScene}>Clear Scene</button>
                </div>
            </div>

            {showExp&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono','Fira Code','Consolas',monospace"}} onClick={function(e){if(e.target===e.currentTarget)setShowExp(false);}}>
                <div style={{background:"#111",border:"1px solid #333",borderRadius:8,padding:"24px 28px",width:520,maxHeight:"80vh",display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:"13px",fontWeight:700,color:"#00ffaa",letterSpacing:2,textTransform:"uppercase"}}>Export JSON</span>
                        <button onClick={function(){setShowExp(false);}} style={{background:"#222",border:"1px solid #333",color:"#888",padding:"4px 10px",cursor:"pointer",borderRadius:4,fontFamily:"inherit",fontSize:"11px"}}>Close</button>
                    </div>
                    <textarea style={{...S.ea,flex:1,minHeight:200,marginTop:0}} value={expJSON} readOnly/>
                    <button style={{...S.btn,marginTop:0}} onClick={function(){cpExp();}}>{"\uD83D\uDCCB"} Copy to Clipboard</button>
                </div>
            </div>}

            {showHelp&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'JetBrains Mono','Fira Code','Consolas',monospace"}} onClick={function(e){if(e.target===e.currentTarget)setShowHelp(false);}}>
                <div style={{background:"#111",border:"1px solid #333",borderRadius:8,padding:"24px 28px",maxWidth:520,maxHeight:"80vh",overflowY:"auto",color:"#ccc",fontSize:"12px",lineHeight:1.7}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><span style={{fontSize:"13px",fontWeight:700,color:"#00ffaa",letterSpacing:2,textTransform:"uppercase"}}>How To Use</span><button onClick={function(){setShowHelp(false);}} style={{background:"#222",border:"1px solid #333",color:"#888",padding:"4px 10px",cursor:"pointer",borderRadius:4,fontFamily:"inherit",fontSize:"11px"}}>Close</button></div>
                    <div style={{color:"#f59e0b",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>SYSTEM</div>
                    <div style={{marginBottom:12,color:"#999"}}>Set duration and mode (Loop repeats, Burst plays once). Timeline always visible.</div>
                    <div style={{color:"#00ffaa",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>LOOP EMITTER</div>
                    <div style={{marginBottom:12,color:"#999"}}>Tied to system lifetime. Spawns continuously at Spawn Rate. Shown as full-width bar on timeline.</div>
                    <div style={{color:"#ff6b6b",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>BURST EMITTER — INSTANT</div>
                    <div style={{marginBottom:12,color:"#999"}}>Fires all particles at once at Start Time. Set Burst Count for how many. Shown as thin mark on timeline.</div>
                    <div style={{color:"#a29bfe",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>BURST EMITTER — DURATION</div>
                    <div style={{marginBottom:12,color:"#999"}}>Spawns particles at Spawn Rate over a Duration starting at Start Time. Each activation runs for the full Duration, stacked back-to-back with optional Delay between them.</div>
                    <div style={{color:"#a29bfe",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>CURVES</div>
                    <div style={{marginBottom:12,color:"#999"}}>None = no curve (uses base values). Flat (always 1), Ramp Up/Down, easings, pulse, wave. Intensity slider scales the curve effect.</div>
                    <div style={{color:"#00ffaa",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>ROTATION</div>
                    <div style={{marginBottom:12,color:"#999"}}>Toggle on to enable. Start sets base angle, Random adds variation, Spin rotates over lifetime.</div>
                    <div style={{color:"#00ffaa",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>SPAWN AREA</div>
                    <div style={{marginBottom:12,color:"#999"}}>Controls where particles appear. Point, Line, Circle, Ring, or Rect.</div>
                    <div style={{color:"#00ffaa",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>VORTEX</div>
                    <div style={{marginBottom:12,color:"#999"}}>Spiraling figure-8 motion. Width/Height/Speed/Phase Random.</div>
                    <div style={{color:"#00ffaa",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>RADIAL BURST</div>
                    <div style={{marginBottom:12,color:"#999"}}>360° emission with directional bias.</div>
                    <div style={{color:"#f59e0b",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>CANVAS</div>
                    <div style={{marginBottom:12,color:"#999"}}>Left-click select/drag. Middle-click pan.</div>
                    <div style={{color:"#f59e0b",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>TIMELINE</div>
                    <div style={{marginBottom:4,color:"#999"}}>Click to scrub. Loop = full bar, Instant = mark, Duration = blocks.</div>
                </div>
            </div>}
        </div>
    );
}

export default ParticleEditor;