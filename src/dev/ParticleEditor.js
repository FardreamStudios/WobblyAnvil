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
var CW=800,CH=500,PW=320,LW=210,MAX_P=3000,HS=14,GS=20;
var GRID_COL="rgba(255,255,255,0.04)";
var EM_COLS=["#00ffaa","#ff6b6b","#4ecdc4","#ffe66d","#a29bfe","#fd79a8","#00cec9","#fab1a0"];
var TL_H=60;
var SHAPES=["square","circle","triangle","wave","halfmoon"];

// Curves: "none" = no curve (pass-through), "flat" always 1, rest are various easings
var CURVES=["none","flat","rampUp","rampDown","easeIn","easeOut","easeInOut","quickIn","quickOut","pulse","waveCurve"];
var CURVE_LBL={none:"None",flat:"Flat",rampUp:"Ramp Up",rampDown:"Ramp Down",easeIn:"Ease In",easeOut:"Ease Out",easeInOut:"Ease In-Out",quickIn:"Quick In",quickOut:"Quick Out",pulse:"Pulse",waveCurve:"Wave"};

// Pixel art color palettes — hand-picked colors that look good at low resolution
var PALETTES=[
    {name:"PICO-8",colors:["#000000","#1d2b53","#7e2553","#008751","#ab5236","#5f574f","#c2c3c7","#fff1e8","#ff004d","#ffa300","#ffec27","#00e436","#29adff","#83769c","#ff77a8","#ffccaa"]},
    {name:"Sweetie 16",colors:["#1a1c2c","#5d275d","#b13e53","#ef7d57","#ffcd75","#a7f070","#38b764","#257179","#29366f","#3b5dc9","#41a6f6","#73eff7","#f4f4f4","#94b0c2","#566c86","#333c57"]},
    {name:"Endesga 32",colors:["#be4a2f","#d77643","#ead4aa","#e4a672","#b86f50","#733e39","#3e2731","#a22633","#e43b44","#f77622","#feae34","#fee761","#63c74d","#3e8948","#265c42","#193c3e","#124e89","#0099db","#2ce8f5","#ffffff","#c0cbdc","#8b9bb4","#5a6988","#3a4466","#262b44","#181425","#ff0044","#68386c","#b55088","#f6757a","#e8b796","#c28569"]},
    {name:"DB32",colors:["#000000","#222034","#45283c","#663931","#8f563b","#df7126","#d9a066","#eec39a","#fbf236","#99e550","#6abe30","#37946e","#4b692f","#524b24","#323c39","#3f3f74","#306082","#5b6ee1","#639bff","#5fcde4","#cbdbfc","#ffffff","#9badb7","#847e87","#696a6a","#595652","#76428a","#ac3232","#d95763","#d77bba","#8f974a","#8a6f30"]},
    {name:"Resurrect 64",colors:["#2e222f","#3e3546","#625565","#966c6c","#ab947a","#694f62","#7f708a","#9babb2","#c7dcd0","#ffffff","#6e2727","#b33831","#ea4f36","#f57d4a","#ae2334","#e83b3b","#fb6b1d","#f79617","#f9c22b","#7a3045","#9e4539","#cd683d","#e6904e","#fbb954","#4c3e24","#676633","#a2a947","#d5e04b","#fbff86","#165a4c","#239063","#1ebc73","#91db69","#cddf6c","#313638","#374e4a","#547e64","#92a984","#b2ba90","#0b5e65","#0b8a8f","#0eaf9b","#30e1b9","#8ff8e2","#323353","#484a77","#4d65b4","#4d9be6","#8fd3ff","#45293f","#6b3e75","#905ea9","#a884f3","#eaaded","#753c54","#a24b6f","#cf657f","#ed8099","#831c5d","#c32454","#f04f78","#f68181","#fca790","#fdcbb0"]},
    {name:"NES",colors:["#000000","#fcfcfc","#f8f8f8","#bcbcbc","#7c7c7c","#a4e4fc","#3cbcfc","#0078f8","#0000fc","#b8b8f8","#6888fc","#0058f8","#0000bc","#d8b8f8","#9878f8","#6844fc","#4428bc","#f8b8f8","#f878f8","#d800cc","#940084","#f8a4c0","#f85898","#e40058","#a80020","#f0d0b0","#f87858","#f83800","#a81000","#fce0a8","#fca044","#e45c10","#881400","#f8d878","#f8b800","#ac7c00","#503000","#d8f878","#b8f818","#00b800","#007800","#b8f8b8","#58d854","#00a800","#006800","#b8f8d8","#58f898","#00a844","#005800","#00fcfc","#00e8d8","#008888","#004058"]},
];
var PAL_NAMES=PALETTES.map(function(p){return p.name;});

function evalCurve(name,t,intensity){
    if(!name||name==="none")return 1;
    var c=Math.max(0,Math.min(1,t));var raw;
    switch(name){
        case "rampUp":raw=c;break;
        case "rampDown":raw=1-c;break;
        case "easeIn":raw=c*c;break;
        case "easeOut":raw=1-(1-c)*(1-c);break;
        case "easeInOut":raw=c<0.5?2*c*c:1-Math.pow(-2*c+2,2)/2;break;
        case "quickIn":raw=c<0.15?c/0.15:1;break;
        case "quickOut":raw=c>0.85?(1-c)/0.15:1;break;
        case "pulse":raw=Math.sin(c*Math.PI);break;
        case "waveCurve":raw=(Math.cos(c*Math.PI*2)+1)/2;break;
        default:raw=1; // flat
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
    gravity:-40,spread:60,direction:270,shape:"square",damping:0,
    faceVelocity:false,ditherAmount:0,ditherDepth:2,glow:false,glowIntensity:8,
};

// ============================================
// STARTER TEMPLATES
// ============================================
var STARTERS=[
    {name:"campfire_sparks",size:{min:1,max:3},sizeOverLifetime:{start:1,end:0.3},sizeCurve:"easeIn",sizeCurveInt:1,scaleX:1,scaleY:1,speed:{min:40,max:100},speedCurve:"none",speedCurveInt:1,lifetime:{min:0.3,max:0.9},colorStart:"#ffee88",colorMid:"#ffaa00",colorEnd:"#ff2200",colorMidPoint:0.3,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"rampDown",opacityCurveInt:1,gravity:-60,spread:30,direction:270,shape:"square",damping:0.5,faceVelocity:false,ditherAmount:0,ditherDepth:2,glow:true,glowIntensity:6},
    {name:"smoke_puff",size:{min:3,max:8},sizeOverLifetime:{start:0.5,end:1.5},sizeCurve:"easeOut",sizeCurveInt:1,scaleX:1.2,scaleY:1,speed:{min:10,max:30},speedCurve:"easeOut",speedCurveInt:1,lifetime:{min:1,max:2.5},colorStart:"#999999",colorMid:"#666666",colorEnd:"#333333",colorMidPoint:0.5,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"quickOut",opacityCurveInt:1,gravity:-15,spread:40,direction:270,shape:"circle",damping:1,faceVelocity:false,ditherAmount:0.3,ditherDepth:3,glow:false,glowIntensity:8},
    {name:"forge_embers",size:{min:1,max:2},sizeOverLifetime:{start:1,end:0},sizeCurve:"easeIn",sizeCurveInt:1,scaleX:1,scaleY:1,speed:{min:60,max:150},speedCurve:"none",speedCurveInt:1,lifetime:{min:0.2,max:0.6},colorStart:"#ffffff",colorMid:"#ffaa00",colorEnd:"#ff4400",colorMidPoint:0.4,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"none",opacityCurveInt:1,gravity:-20,spread:90,direction:270,shape:"triangle",damping:0.3,faceVelocity:true,ditherAmount:0,ditherDepth:2,glow:true,glowIntensity:4},
    {name:"anvil_strike",size:{min:1,max:3},sizeOverLifetime:{start:1,end:0.2},sizeCurve:"easeIn",sizeCurveInt:1,scaleX:1.5,scaleY:0.5,speed:{min:80,max:200},speedCurve:"easeIn",speedCurveInt:1,lifetime:{min:0.15,max:0.5},colorStart:"#ffffff",colorMid:"#ffdd44",colorEnd:"#ff6600",colorMidPoint:0.25,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"quickOut",opacityCurveInt:1,gravity:50,spread:180,direction:270,shape:"square",damping:2,faceVelocity:true,ditherAmount:0,ditherDepth:2,glow:true,glowIntensity:10},
    {name:"magic_wisp",size:{min:2,max:4},sizeOverLifetime:{start:0.8,end:1.2},sizeCurve:"waveCurve",sizeCurveInt:1,scaleX:2,scaleY:0.6,speed:{min:15,max:40},speedCurve:"easeOut",speedCurveInt:1,lifetime:{min:0.8,max:1.8},colorStart:"#88ffff",colorMid:"#4488ff",colorEnd:"#8844ff",colorMidPoint:0.5,colorCurve:"none",colorCurveInt:1,fadeOut:true,opacityCurve:"pulse",opacityCurveInt:1,gravity:-10,spread:60,direction:270,shape:"wave",damping:0.8,faceVelocity:true,ditherAmount:0.15,ditherDepth:2,glow:true,glowIntensity:12},
    {name:"basic_circle",size:{min:20,max:20},sizeOverLifetime:{start:1,end:1},sizeCurve:"none",sizeCurveInt:1,scaleX:1,scaleY:1,speed:{min:0,max:0},speedCurve:"none",speedCurveInt:1,lifetime:{min:2,max:2},colorStart:"#ffffff",colorMid:"#ffffff",colorEnd:"#ffffff",colorMidPoint:0.5,colorCurve:"none",colorCurveInt:1,fadeOut:false,opacityCurve:"none",opacityCurveInt:1,gravity:0,spread:0,direction:270,shape:"circle",damping:0,faceVelocity:false,ditherAmount:0,ditherDepth:2,glow:false,glowIntensity:8},
];

// ============================================
// PARTICLE PARAM DEFS
// ============================================
var P_DEFS=[
    {key:"name",label:"Name",type:"text",group:"identity"},
    {key:"size.min",label:"Size Min",type:"slider",min:1,max:100,step:1,group:"size"},
    {key:"size.max",label:"Size Max",type:"slider",min:1,max:100,step:1,group:"size"},
    {key:"sizeOverLifetime.start",label:"Size Start \u00D7",type:"slider",min:0,max:3,step:0.1,group:"size"},
    {key:"sizeOverLifetime.end",label:"Size End \u00D7",type:"slider",min:0,max:3,step:0.1,group:"size"},
    {key:"sizeCurve",label:"Size Curve",type:"curve",group:"size"},
    {key:"sizeCurveInt",label:"Size Curve \u00D7",type:"slider",min:0,max:2,step:0.1,group:"size",showIfNotNone:"sizeCurve"},
    {key:"scaleX",label:"Scale X",type:"slider",min:0.1,max:4,step:0.1,group:"size"},
    {key:"scaleY",label:"Scale Y",type:"slider",min:0.1,max:4,step:0.1,group:"size"},
    {key:"speed.min",label:"Speed Min",type:"slider",min:0,max:300,step:5,group:"motion"},
    {key:"speed.max",label:"Speed Max",type:"slider",min:0,max:300,step:5,group:"motion"},
    {key:"speedCurve",label:"Speed Curve",type:"curve",group:"motion"},
    {key:"speedCurveInt",label:"Speed Curve \u00D7",type:"slider",min:0,max:2,step:0.1,group:"motion",showIfNotNone:"speedCurve"},
    {key:"lifetime.min",label:"Life Min (s)",type:"slider",min:0.1,max:5,step:0.1,group:"motion"},
    {key:"lifetime.max",label:"Life Max (s)",type:"slider",min:0.1,max:5,step:0.1,group:"motion"},
    {key:"direction",label:"Direction (\u00B0)",type:"slider",min:0,max:360,step:1,group:"motion"},
    {key:"spread",label:"Spread (\u00B0)",type:"slider",min:0,max:180,step:1,group:"motion"},
    {key:"gravity",label:"Gravity",type:"slider",min:-200,max:200,step:5,group:"motion"},
    {key:"damping",label:"Damping",type:"slider",min:0,max:5,step:0.1,group:"motion"},
    {key:"faceVelocity",label:"Face Velocity",type:"toggle",group:"motion"},
    {key:"colorStart",label:"Color Start",type:"color",group:"appearance"},
    {key:"colorMid",label:"Color Mid",type:"color",group:"appearance"},
    {key:"colorEnd",label:"Color End",type:"color",group:"appearance"},
    {key:"colorMidPoint",label:"Mid Point",type:"slider",min:0.05,max:0.95,step:0.05,group:"appearance"},
    {key:"colorCurve",label:"Color Curve",type:"curve",group:"appearance"},
    {key:"colorCurveInt",label:"Color Curve \u00D7",type:"slider",min:0,max:2,step:0.1,group:"appearance",showIfNotNone:"colorCurve"},
    {key:"fadeOut",label:"Fade Out",type:"toggle",group:"appearance"},
    {key:"opacityCurve",label:"Opacity Curve",type:"curve",group:"appearance"},
    {key:"opacityCurveInt",label:"Opacity Curve \u00D7",type:"slider",min:0,max:2,step:0.1,group:"appearance",showIfNotNone:"opacityCurve"},
    {key:"shape",label:"Shape",type:"select",options:SHAPES,group:"appearance"},
    {key:"ditherAmount",label:"Dither Amount",type:"slider",min:0,max:1,step:0.05,group:"appearance"},
    {key:"ditherDepth",label:"Dither Depth (px)",type:"slider",min:1,max:10,step:1,group:"appearance",showIf:"ditherAmount"},
    {key:"glow",label:"Glow",type:"toggle",group:"appearance"},
    {key:"glowIntensity",label:"Glow Size",type:"slider",min:2,max:30,step:1,group:"appearance",showIf:"glow"},
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

// Snap a hex color to the nearest color in a palette using RGB distance
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
    var p={x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rr(cfg.lifetime.min,cfg.lifetime.max),maxLife:0,sz:Math.round(rr(cfg.size.min,cfg.size.max)),alive:true};
    p.maxLife=p.life;return p;
}

function updP(p,dt,cfg){
    var t=1-p.life/p.maxLife;var sm=evalCurve(cfg.speedCurve||"none",1-t,cfg.speedCurveInt);
    if(cfg.damping>0){var df=Math.max(0,1-cfg.damping*dt);p.vx*=df;p.vy*=df;}
    p.vy-=cfg.gravity*dt;p.x+=p.vx*sm*dt;p.y+=p.vy*sm*dt;p.life-=dt;if(p.life<=0)p.alive=false;
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
        else if(sh==="wave"){cx.lineWidth=Math.max(1,Math.round(bs*0.4));cx.lineCap="round";cx.beginPath();for(var i=0;i<=6;i++){var fx=-fw/2+(fw/6)*i,fy=Math.sin((i/6)*Math.PI*2)*(fh/2);if(i===0)cx.moveTo(fx,fy);else cx.lineTo(fx,fy);}cx.stroke();}
        else if(sh==="halfmoon"){cx.beginPath();cx.arc(0,0,fw/2,-Math.PI/2,Math.PI/2,false);cx.arc(-fw*0.15,0,fw/2.8,Math.PI/2,-Math.PI/2,true);cx.closePath();cx.fill();}
        else{cx.fillRect(-fw/2,-fh/2,fw,fh);}
    }

    if(dith>0&&w>0&&h>0){
        var mg=cfg.glow?(cfg.glowIntensity||8)*2:0;var bw=w+mg*2+4,bh=h+mg*2+4;var d=getDC(bw,bh);
        d.x.clearRect(0,0,bw,bh);d.x.save();d.x.translate(bw/2,bh/2);
        if(cfg.glow){d.x.shadowColor="rgba("+col.r+","+col.g+","+col.b+","+(alpha*0.6).toFixed(2)+")";d.x.shadowBlur=cfg.glowIntensity||8;}
        DS(d.x,w,h);d.x.shadowColor="transparent";d.x.shadowBlur=0;d.x.restore();
        // Edge-only dithering: build distance-from-edge map, then dither based on depth+amount
        var id=d.x.getImageData(0,0,bw,bh);var dd=id.data;
        // Pass 1: build edge distance map (how far each visible pixel is from nearest transparent neighbor)
        var distMap=new Uint8Array(bw*bh);var maxDist=dithDep;
        // Seed: mark all visible pixels adjacent to transparent as distance 1
        for(var dy=0;dy<bh;dy++){for(var dx=0;dx<bw;dx++){
            var di=(dy*bw+dx)*4;if(dd[di+3]===0){distMap[dy*bw+dx]=0;continue;}
            var isEdge=false;
            if(dx===0||dy===0||dx===bw-1||dy===bh-1){isEdge=true;}
            else{if(dd[((dy-1)*bw+dx)*4+3]===0||dd[((dy+1)*bw+dx)*4+3]===0||dd[(dy*bw+dx-1)*4+3]===0||dd[(dy*bw+dx+1)*4+3]===0)isEdge=true;}
            distMap[dy*bw+dx]=isEdge?1:255;
        }}
        // BFS: propagate distance inward up to maxDist
        for(var dist=2;dist<=maxDist;dist++){for(var dy2=0;dy2<bh;dy2++){for(var dx2=0;dx2<bw;dx2++){
            if(distMap[dy2*bw+dx2]!==255)continue;
            var hasNeighbor=false;
            if(dy2>0&&distMap[(dy2-1)*bw+dx2]===dist-1)hasNeighbor=true;
            if(dy2<bh-1&&distMap[(dy2+1)*bw+dx2]===dist-1)hasNeighbor=true;
            if(dx2>0&&distMap[dy2*bw+dx2-1]===dist-1)hasNeighbor=true;
            if(dx2<bw-1&&distMap[dy2*bw+dx2+1]===dist-1)hasNeighbor=true;
            if(hasNeighbor)distMap[dy2*bw+dx2]=dist;
        }}}
        // Pass 2: dither pixels within depth range — closer to edge = stronger dither
        for(var di2=0;di2<bw*bh;di2++){
            var edgeDist=distMap[di2];if(edgeDist===0||edgeDist===255)continue;
            if(edgeDist>maxDist)continue;
            var falloff=1-(edgeDist-1)/maxDist; // 1.0 at edge, 0.0 at maxDist
            var prob=dith*falloff;
            if(Math.random()<prob)dd[di2*4+3]=0;
        }
        d.x.putImageData(id,0,0);ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));
        if(cfg.faceVelocity)ctx.rotate(Math.atan2(p.vy,p.vx));ctx.drawImage(d.c,0,0,bw,bh,-bw/2,-bh/2,bw,bh);ctx.restore();return;
    }
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));
    if(cfg.faceVelocity)ctx.rotate(Math.atan2(p.vy,p.vx));
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
    lp:{width:LW,background:"#0a0a0a",borderRight:"1px solid #1a1a1a",display:"flex",flexDirection:"column",overflowY:"auto"},
    lh:{padding:"12px",fontSize:"10px",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",color:"#f59e0b",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d",position:"sticky",top:0,zIndex:2},
    ti:{padding:"8px 12px",borderBottom:"1px solid #141414",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"},
    tn:{fontSize:"11px",letterSpacing:"0.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1},
    ta:{display:"flex",gap:4,flexShrink:0,marginLeft:6},
    tb:{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:"11px",padding:"2px 4px",borderRadius:3,lineHeight:1},
    ab:{margin:"8px 12px",padding:"8px",background:"#1a1a1a",color:"#00ffaa",border:"1px dashed #333",fontSize:"10px",fontFamily:"inherit",fontWeight:600,textTransform:"uppercase",letterSpacing:"1px",cursor:"pointer",borderRadius:4,textAlign:"center"},
    ei:{padding:"6px 12px",borderBottom:"1px solid #141414",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"},
    ed:{width:8,height:8,borderRadius:"50%",marginRight:8,flexShrink:0},el:{fontSize:"10px",letterSpacing:"0.5px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1},ep:{fontSize:"9px",color:"#555",marginLeft:4,flexShrink:0},
    cw:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",background:"#0a0a0a"},
    cv:{border:"1px solid #1a1a1a",cursor:"crosshair",imageRendering:"pixelated"},
    sb:{position:"absolute",bottom:8,left:8,color:"#555",fontSize:"10px",userSelect:"none"},
    pl:{color:"#555",fontSize:"10px",textAlign:"center",marginTop:4},
    rp:{width:PW,background:"#111",borderLeft:"1px solid #1a1a1a",overflowY:"auto",display:"flex",flexDirection:"column"},
    ph:{padding:"12px 14px",fontSize:"11px",fontWeight:700,textTransform:"uppercase",letterSpacing:"2px",color:"#00ffaa",borderBottom:"1px solid #1a1a1a",background:"#0d0d0d",position:"sticky",top:0,zIndex:2},
    sec:{padding:"10px 14px",borderBottom:"1px solid #1a1a1a"},
    st:{fontSize:"10px",fontWeight:600,textTransform:"uppercase",letterSpacing:"1.5px",color:"#666",marginBottom:8},
    row:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,gap:8},
    lab:{color:"#888",fontSize:"11px",whiteSpace:"nowrap",minWidth:90},
    val:{color:"#00ffaa",fontSize:"11px",fontWeight:600,minWidth:36,textAlign:"right"},
    sli:{flex:1,height:4,appearance:"none",WebkitAppearance:"none",background:"#222",borderRadius:2,outline:"none",cursor:"pointer",accentColor:"#00ffaa"},
    tin:{background:"#1a1a1a",border:"1px solid #333",color:"#fff",padding:"4px 8px",fontSize:"11px",fontFamily:"inherit",borderRadius:3,flex:1,outline:"none"},
    cin:{width:32,height:22,border:"1px solid #333",background:"none",cursor:"pointer",padding:0,borderRadius:3},
    tog:{width:36,height:18,borderRadius:9,cursor:"pointer",border:"none",position:"relative"},
    knob:{width:14,height:14,borderRadius:7,background:"#fff",position:"absolute",top:2,transition:"left 0.15s"},
    sel2:{background:"#1a1a1a",border:"1px solid #333",color:"#fff",padding:"4px 8px",fontSize:"11px",fontFamily:"inherit",borderRadius:3,cursor:"pointer",outline:"none"},
    btn:{width:"100%",padding:"10px",background:"#00ffaa",color:"#0d0d0d",border:"none",fontWeight:700,fontSize:"11px",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"1.5px",cursor:"pointer",borderRadius:3,marginTop:4},
    bbtn:{width:"100%",padding:"10px",background:"#ff6b6b",color:"#fff",border:"none",fontWeight:700,fontSize:"11px",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"1.5px",cursor:"pointer",borderRadius:3,marginTop:4},
    rbtn:{width:"100%",padding:"8px",background:"transparent",color:"#666",border:"1px solid #333",fontWeight:600,fontSize:"10px",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"1px",cursor:"pointer",borderRadius:3,marginTop:4},
    ea:{width:"100%",background:"#0a0a0a",border:"1px solid #333",color:"#00ffaa",fontFamily:"inherit",fontSize:"10px",padding:8,borderRadius:3,resize:"vertical",minHeight:80,marginTop:8,outline:"none",boxSizing:"border-box"},
    ns:{padding:"30px 14px",textAlign:"center",color:"#444",fontSize:"11px",letterSpacing:"1px"},
    ts:{background:"#1a1a1a",border:"1px solid #333",color:"#fff",padding:"4px 8px",fontSize:"11px",fontFamily:"inherit",borderRadius:3,cursor:"pointer",outline:"none",width:"100%"},
    gb:{height:12,borderRadius:3,border:"1px solid #333",marginBottom:8},
    cb:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"11px",color:"#888",marginBottom:4,userSelect:"none"},
    cbi:{accentColor:"#00ffaa",width:14,height:14,cursor:"pointer"},
    cs:{background:"#1a1a1a",border:"1px solid #333",color:"#fff",padding:"3px 6px",fontSize:"10px",fontFamily:"inherit",borderRadius:3,cursor:"pointer",outline:"none",flex:1},
    cp:{width:50,height:20,border:"1px solid #333",borderRadius:2,marginLeft:6,flexShrink:0},
};

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

    var pausedR=useRef(paused),selIdR=useRef(selId),sysDurR=useRef(sysDur),sysModeR=useRef(sysMode);
    var showGridR=useRef(showGrid),showHR=useRef(showH),bgBR=useRef(bgB),zoomR=useRef(zoom),panXR=useRef(panX),panYR=useRef(panY);
    useEffect(function(){emsRef.current=ems;},[ems]);useEffect(function(){pausedR.current=paused;},[paused]);
    useEffect(function(){selIdR.current=selId;},[selId]);useEffect(function(){sysDurR.current=sysDur;},[sysDur]);
    useEffect(function(){sysModeR.current=sysMode;},[sysMode]);useEffect(function(){showGridR.current=showGrid;},[showGrid]);
    useEffect(function(){showHR.current=showH;},[showH]);useEffect(function(){bgBR.current=bgB;},[bgB]);
    useEffect(function(){zoomR.current=zoom;},[zoom]);useEffect(function(){panXR.current=panX;},[panX]);
    useEffect(function(){panYR.current=panY;},[panY]);

    var selEm=null;for(var i=0;i<ems.length;i++){if(ems[i].id===selId){selEm=ems[i];break;}}

    // ---- TEMPLATES ----
    function loadTpl(i){setActTpl(i);}
    function saveTpl(){if(actTpl===null||!selEm)return;setTpls(function(p){var n=p.map(dc);n[actTpl]=dc(selEm.pcfg);return n;});setDirty(false);}
    function saveNew(){if(!selEm)return;var t=dc(selEm.pcfg);t.name+="_copy";setTpls(function(p){return p.map(dc).concat([t]);});}
    function dupTpl(i){var d2=dc(tpls[i]);d2.name+="_copy";setTpls(function(p){return p.map(dc).concat([d2]);});}
    function delTpl(i){setTpls(function(p){return p.filter(function(_,j){return j!==i;});});if(actTpl===i)setActTpl(null);else if(actTpl>i)setActTpl(actTpl-1);}
    function newTpl(){var t=dc(DEF_PCFG);t.name="new_template";setTpls(function(p){return p.map(dc).concat([t]);});}

    // ---- EMITTERS ----
    // Emitter: { id, x, y, pcfg, handleColor,
    //   type: "loop"|"burst",
    //   -- loop fields: spawnRate
    //   -- burst fields: burstSub: "instant"|"duration", startTime, burstCount,
    //     emDuration, activations, actDelay, spawnRate (for duration sub),
    //   -- runtime: particles[], spawnAcc, actIndex, actElapsed }
    function addEm(){
        var ti=actTpl!==null?actTpl:0;if(!tpls.length)return;
        var tpl=tpls[ti]||tpls[0];var id=mid();var col=EM_COLS[ems.length%EM_COLS.length];
        setEms(function(p){return p.concat([{
            id:id,x:CW/2,y:CH/2,pcfg:dc(tpl),handleColor:col,
            type:"loop",spawnRate:15,
            burstSub:"instant",startTime:0,burstCount:20,emDuration:1,activations:1,burstSpawnRate:30,actDelay:0,
            particles:[],spawnAcc:0,actIndex:0,actElapsed:0,
        }]);});setSelId(id);
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

    function restart(){
        sysTimeRef.current=0;setSysTime(0);
        setEms(function(p){return p.map(function(e){return Object.assign({},e,{particles:[],spawnAcc:0,actIndex:0,actElapsed:0});});});
    }

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
                if(sm==="loop"){
                    st=st%sd;
                    for(var r=0;r<allEm.length;r++){allEm[r].spawnAcc=0;allEm[r].actIndex=0;allEm[r].actElapsed=0;}
                } else {st=sd;}
            }
            sysTimeRef.current=st;
        }

        var totalP=0;
        for(var i=0;i<allEm.length;i++){
            var em=allEm[i],cfg=em.pcfg,parts=em.particles;

            if(!pausedR.current){
                if(em.type==="loop"){
                    // Loop: always active while system runs
                    var loopActive=!(sm==="burst"&&st>=sd);
                    if(loopActive&&em.spawnRate>0){
                        em.spawnAcc+=em.spawnRate*dt;var sp=Math.floor(em.spawnAcc);em.spawnAcc-=sp;
                        for(var s=0;s<sp;s++){if(totalP+parts.length<MAX_P)parts.push(mkP(em.x,em.y,cfg));}
                    }
                } else if(em.burstSub==="instant"){
                    // Burst Instant: fire all at once when system time crosses start time
                    // actIndex 0 = hasn't fired, 1 = fired
                    if(em.actIndex===0&&st>=(em.startTime||0)){
                        for(var bi=0;bi<(em.burstCount||20);bi++){if(totalP+parts.length<MAX_P)parts.push(mkP(em.x,em.y,cfg));}
                        em.actIndex=1;
                    }
                } else {
                    // Burst Duration: spawn at rate over duration, with activations
                    // Each activation runs for the FULL emDuration, stacked sequentially with delay gaps
                    var emStart=em.startTime||0;
                    var actDur=em.emDuration||1;
                    var actTotal=em.activations||1;
                    var actDly=em.actDelay||0;

                    if(em.actIndex<actTotal){
                        var actStart=emStart+em.actIndex*(actDur+actDly);
                        var actEnd=actStart+actDur;

                        if(st>=actStart&&st<actEnd){
                            em.actElapsed+=dt;
                            var rate=em.burstSpawnRate||30;
                            em.spawnAcc+=rate*dt;var sp2=Math.floor(em.spawnAcc);em.spawnAcc-=sp2;
                            for(var sd2=0;sd2<sp2;sd2++){if(totalP+parts.length<MAX_P)parts.push(mkP(em.x,em.y,cfg));}
                        }
                        if(st>=actEnd){
                            em.actIndex++;em.actElapsed=0;em.spawnAcc=0;
                        }
                    }
                }
            }

            // Update existing particles always
            if(!pausedR.current){for(var j=parts.length-1;j>=0;j--){updP(parts[j],dt,cfg);if(!parts[j].alive)parts.splice(j,1);}}
            for(var k=0;k<parts.length;k++)drawP(ctx,parts[k],cfg);
            totalP+=parts.length;
        }

        if(showHR.current){for(var h=0;h<allEm.length;h++){var e=allEm[h];drawHandle(ctx,e.x,e.y,e.handleColor,e.id===sid,e.pcfg.name);}}
        ctx.restore();setPCount(totalP);setSysTime(st);
        afRef.current=requestAnimationFrame(tick);
    },[]);

    useEffect(function(){afRef.current=requestAnimationFrame(tick);return function(){if(afRef.current)cancelAnimationFrame(afRef.current);};},[tick]);

    // ---- MOUSE ----
    function onMD(e){
        if(e.button===1){e.preventDefault();panRef.current=true;panStart.current={x:e.clientX,y:e.clientY,px:panX,py:panY};return;}
        if(e.button!==0)return;var rect=canvasRef.current.getBoundingClientRect();var z2=zoom;
        var mx=(e.clientX-rect.left-CW/2)/z2+CW/2-panX,my=(e.clientY-rect.top-CH/2)/z2+CH/2-panY;
        for(var i=ems.length-1;i>=0;i--){var em=ems[i];if(Math.abs(mx-em.x)<HS/z2&&Math.abs(my-em.y)<HS/z2){dragRef.current=em.id;setSelId(em.id);return;}}
        setSelId(null);
    }
    function onMM(e){
        if(panRef.current){setPanX(panStart.current.px+(e.clientX-panStart.current.x)/zoom);setPanY(panStart.current.py+(e.clientY-panStart.current.y)/zoom);return;}
        if(!dragRef.current)return;var rect=canvasRef.current.getBoundingClientRect();var z2=zoom;
        var mx=(e.clientX-rect.left-CW/2)/z2+CW/2-panX,my=(e.clientY-rect.top-CH/2)/z2+CH/2-panY;
        setEms(function(p){return p.map(function(em){return em.id===dragRef.current?Object.assign({},em,{x:Math.round(mx),y:Math.round(my)}):em;});});
    }
    function onMU(e){if(e&&e.button===1)panRef.current=false;dragRef.current=null;}
    function onCM(e){e.preventDefault();}

    // ---- EXPORT ----
    function cfgExp(cfg){return{name:cfg.name,size:cfg.size,sizeOverLifetime:cfg.sizeOverLifetime,sizeCurve:cfg.sizeCurve,sizeCurveInt:cfg.sizeCurveInt,scaleX:cfg.scaleX,scaleY:cfg.scaleY,speed:cfg.speed,speedCurve:cfg.speedCurve,speedCurveInt:cfg.speedCurveInt,lifetime:cfg.lifetime,colorStart:cfg.colorStart,colorMid:cfg.colorMid,colorEnd:cfg.colorEnd,colorMidPoint:cfg.colorMidPoint,colorCurve:cfg.colorCurve,colorCurveInt:cfg.colorCurveInt,fadeOut:cfg.fadeOut,opacityCurve:cfg.opacityCurve,opacityCurveInt:cfg.opacityCurveInt,gravity:cfg.gravity,spread:cfg.spread,direction:cfg.direction,shape:cfg.shape,damping:cfg.damping,faceVelocity:cfg.faceVelocity,ditherAmount:cfg.ditherAmount,ditherDepth:cfg.ditherDepth,glow:cfg.glow,glowIntensity:cfg.glowIntensity};}
    function expScene(){
        var sc={systemDuration:sysDur,systemMode:sysMode,templates:tpls.map(cfgExp),
            emitters:ems.map(function(em){return{id:em.id,position:{x:em.x,y:em.y},type:em.type,burstSub:em.burstSub,spawnRate:em.spawnRate,burstCount:em.burstCount,burstSpawnRate:em.burstSpawnRate,activations:em.activations,actDelay:em.actDelay,startTime:em.startTime,emitterDuration:em.emDuration,config:cfgExp(em.pcfg)};})};
        setExpJSON(JSON.stringify(sc,null,2));setShowExp(true);
    }
    function expSel(){
        if(!selEm)return;var o=cfgExp(selEm.pcfg);
        Object.assign(o,{position:{x:selEm.x,y:selEm.y},type:selEm.type,burstSub:selEm.burstSub,spawnRate:selEm.spawnRate,burstCount:selEm.burstCount,burstSpawnRate:selEm.burstSpawnRate,activations:selEm.activations,actDelay:selEm.actDelay,startTime:selEm.startTime,emitterDuration:selEm.emDuration});
        setExpJSON(JSON.stringify(o,null,2));setShowExp(true);
    }
    function clearScene(){setEms([]);setSelId(null);setShowExp(false);}
    function cpExp(){navigator.clipboard.writeText(expJSON);}

    // ---- RENDER HELPERS ----
    function CurveSVG(props){var pts=[];for(var i=0;i<=20;i++){var t=i/20;pts.push({x:t,y:evalCurve(props.c,t,props.inten)});}var d="M "+pts.map(function(p){return(p.x*48+1)+" "+(Math.max(0,Math.min(20,(1-p.y)*18+1)));}).join(" L ");return <svg width={50} height={20} style={S.cp}><path d={d} stroke="#00ffaa" strokeWidth={1.5} fill="none"/></svg>;}

    function renderP(def){
        if(!selEm)return null;if(def.showIf&&!selEm.pcfg[def.showIf])return null;if(def.showIfNotNone&&(!selEm.pcfg[def.showIfNotNone]||selEm.pcfg[def.showIfNotNone]==="none"))return null;
        var v=gv(selEm.pcfg,def.key);
        if(def.type==="text")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><input style={S.tin} value={v} onChange={function(e){setPcfg(def.key,e.target.value);}}/></div>;
        if(def.type==="slider")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><input type="range" style={S.sli} min={def.min} max={def.max} step={def.step} value={v} onChange={function(e){setPcfg(def.key,def.step<1?parseFloat(e.target.value):parseInt(e.target.value));}}/><span style={S.val}>{v}</span></div>;
        if(def.type==="color")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><input type="color" style={S.cin} value={v} onChange={function(e){var c=e.target.value;if(palMode)c=snapToPal(c,palIdx);setPcfg(def.key,c);}}/><span style={S.val}>{v}</span></div>;
        if(def.type==="toggle")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><button style={{...S.tog,background:v?"#00ffaa":"#333"}} onClick={function(){setPcfg(def.key,!v);}}><div style={{...S.knob,left:v?20:2}}/></button></div>;
        if(def.type==="select")return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><select style={S.sel2} value={v} onChange={function(e){setPcfg(def.key,e.target.value);}}>{def.options.map(function(o){return <option key={o} value={o}>{o}</option>;})}</select></div>;
        if(def.type==="curve"){var intKey=def.key+"Int";var inten=selEm.pcfg[intKey]!==undefined?selEm.pcfg[intKey]:1;return <div key={def.key} style={S.row}><span style={S.lab}>{def.label}</span><select style={S.cs} value={v||"none"} onChange={function(e){setPcfg(def.key,e.target.value);}}>{CURVES.map(function(c){return <option key={c} value={c}>{CURVE_LBL[c]}</option>;})}</select><CurveSVG c={v||"none"} inten={inten}/></div>;}
        return null;
    }
    function rg(g){return P_DEFS.filter(function(d){return d.group===g;}).map(renderP);}
    function colorPrev(){if(!selEm)return null;var c=selEm.pcfg;return <div style={{...S.gb,background:"linear-gradient(to right,"+c.colorStart+","+c.colorMid+" "+Math.round(c.colorMidPoint*100)+"%,"+c.colorEnd+")"}}/>;}

    // Timeline: shows all emitters as thin horizontal bars, selected one is brighter
    function renderTL(){
        var pct=sysDur>0?(sysTime/sysDur)*100:0;
        var barH=Math.max(6,Math.min(12,Math.floor((TL_H-8)/Math.max(ems.length,1))));
        return <div style={{width:"100%",height:TL_H,background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:4,position:"relative",overflow:"hidden",marginTop:6,cursor:"pointer"}} onClick={function(e){var rect=e.currentTarget.getBoundingClientRect();var t=((e.clientX-rect.left)/rect.width)*sysDur;sysTimeRef.current=Math.max(0,Math.min(sysDur,t));setSysTime(sysTimeRef.current);setEms(function(p){return p.map(function(em){return Object.assign({},em,{spawnAcc:0,actIndex:0,actElapsed:0});});});}}>
            {ems.map(function(em,idx){
                var isSel=em.id===selId;var yOff=4+idx*barH;var opacity=isSel?0.9:0.3;
                if(em.type==="loop"){
                    return <div key={em.id} style={{position:"absolute",top:yOff,height:barH-1,left:0,width:"100%",background:em.handleColor,opacity:opacity,borderRadius:2,pointerEvents:"none"}}/>;
                } else if(em.burstSub==="instant"){
                    var lp=sysDur>0?((em.startTime||0)/sysDur)*100:0;
                    return <div key={em.id} style={{position:"absolute",top:yOff,height:barH-1,left:lp+"%",width:3,background:em.handleColor,opacity:opacity,borderRadius:1,pointerEvents:"none"}}/>;
                } else {
                    // Duration burst: show activation blocks — each is full duration, stacked with delay
                    var blocks=[];var emStart=em.startTime||0;var actDur=em.emDuration||1;var actCount=em.activations||1;var actDly=em.actDelay||0;
                    for(var a=0;a<actCount;a++){
                        var aStart=emStart+a*(actDur+actDly);var lPct=sysDur>0?(aStart/sysDur)*100:0;var wPct=sysDur>0?(actDur/sysDur)*100:0;
                        blocks.push(<div key={em.id+"_"+a} style={{position:"absolute",top:yOff,height:barH-1,left:lPct+"%",width:wPct+"%",background:em.handleColor,opacity:opacity,borderRadius:1,borderRight:a<actCount-1?"1px solid #0a0a0a":"none",pointerEvents:"none",boxSizing:"border-box"}}/>);
                    }
                    return blocks;
                }
            })}
            <div style={{position:"absolute",top:0,bottom:0,width:2,background:"#00ffaa",zIndex:3,pointerEvents:"none",left:pct+"%"}}/>
            <div style={{position:"absolute",bottom:2,right:4,fontSize:"9px",color:"#555",pointerEvents:"none"}}>{sysTime.toFixed(2)}s / {sysDur.toFixed(1)}s</div>
        </div>;
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div style={S.cont}>
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

            <div style={S.rp}>
                <div style={S.ph}>
                    <span>{selEm?selEm.pcfg.name:"Particle Editor"}{dirty&&selEm&&<span style={{color:"#f59e0b",marginLeft:8,fontSize:"9px"}}>{"\u25CF"} EDITED</span>}</span>
                    <span style={{float:"right",display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{cursor:"pointer",color:"#555",fontSize:"12px",fontWeight:"bold"}} onClick={function(){setShowHelp(true);}}>?</span>
                        <span style={{cursor:"pointer",color:paused?"#f44":"#00ffaa"}} onClick={function(){setPaused(!paused);}}>{paused?"\u25B6 PLAY":"\u23F8 PAUSE"}</span>
                    </span>
                </div>

                {/* SYSTEM */}
                <div style={S.sec}><div style={S.st}>System</div>
                    <div style={S.row}><span style={S.lab}>Duration (s)</span><input type="range" style={S.sli} min={0.5} max={10} step={0.1} value={sysDur} onChange={function(e){setSysDur(parseFloat(e.target.value));}}/><span style={S.val}>{sysDur.toFixed(1)}</span></div>
                    <div style={S.row}><span style={S.lab}>Mode</span><button style={{...S.tog,background:sysMode==="loop"?"#00ffaa":"#ff6b6b",width:60}} onClick={function(){setSysMode(sysMode==="loop"?"burst":"loop");}}><span style={{position:"absolute",top:2,left:sysMode==="loop"?4:null,right:sysMode==="burst"?4:null,fontSize:"9px",fontWeight:700,color:"#000"}}>{sysMode==="loop"?"LOOP":"BURST"}</span></button></div>
                    {renderTL()}
                    <button style={{...S.rbtn,marginTop:6,color:"#00ffaa",borderColor:"#00ffaa44"}} onClick={restart}>Restart</button>
                </div>

                {selEm?(<>
                    {/* EMITTER CONFIG */}
                    <div style={S.sec}><div style={S.st}>Emitter Type</div>
                        <div style={S.row}><span style={S.lab}>Type</span><button style={{...S.tog,background:selEm.type==="loop"?"#00ffaa":"#ff6b6b",width:60}} onClick={function(){setEmF("type",selEm.type==="loop"?"burst":"loop");}}><span style={{position:"absolute",top:2,left:selEm.type==="loop"?4:null,right:selEm.type==="burst"?4:null,fontSize:"9px",fontWeight:700,color:"#000"}}>{selEm.type==="loop"?"LOOP":"BURST"}</span></button></div>

                        {selEm.type==="loop"&&(<>
                            <div style={S.row}><span style={S.lab}>Spawn Rate</span><input type="range" style={S.sli} min={0} max={100} step={1} value={selEm.spawnRate} onChange={function(e){setEmF("spawnRate",parseInt(e.target.value));}}/><span style={S.val}>{selEm.spawnRate}</span></div>
                        </>)}

                        {selEm.type==="burst"&&(<>
                            <div style={S.row}><span style={S.lab}>Burst Sub</span><button style={{...S.tog,background:selEm.burstSub==="instant"?"#ffe66d":"#a29bfe",width:70}} onClick={function(){setEmF("burstSub",selEm.burstSub==="instant"?"duration":"instant");}}><span style={{position:"absolute",top:2,left:selEm.burstSub==="instant"?4:null,right:selEm.burstSub==="duration"?4:null,fontSize:"8px",fontWeight:700,color:"#000"}}>{selEm.burstSub==="instant"?"INSTANT":"DURATION"}</span></button></div>

                            <div style={S.row}><span style={S.lab}>Start Time (s)</span><input type="range" style={S.sli} min={0} max={sysDur} step={0.05} value={selEm.startTime||0} onChange={function(e){setEmF("startTime",parseFloat(e.target.value));}}/><span style={S.val}>{(selEm.startTime||0).toFixed(2)}</span></div>

                            {selEm.burstSub==="instant"&&(<>
                                <div style={S.row}><span style={S.lab}>Burst Count</span><input type="range" style={S.sli} min={1} max={200} step={1} value={selEm.burstCount} onChange={function(e){setEmF("burstCount",parseInt(e.target.value));}}/><span style={S.val}>{selEm.burstCount}</span></div>
                                <button style={S.bbtn} onClick={fireBurst}>{"\u26A1"} Fire Burst</button>
                            </>)}

                            {selEm.burstSub==="duration"&&(<>
                                <div style={S.row}><span style={S.lab}>Duration (s)</span><input type="range" style={S.sli} min={0.05} max={10} step={0.05} value={selEm.emDuration||1} onChange={function(e){setEmF("emDuration",parseFloat(e.target.value));}}/><span style={S.val}>{(selEm.emDuration||1).toFixed(2)}</span></div>
                                <div style={S.row}><span style={S.lab}>Activations</span><input type="range" style={S.sli} min={1} max={10} step={1} value={selEm.activations||1} onChange={function(e){setEmF("activations",parseInt(e.target.value));}}/><span style={S.val}>{selEm.activations||1}</span></div>
                                <div style={S.row}><span style={S.lab}>Act. Delay (s)</span><input type="range" style={S.sli} min={0} max={5} step={0.05} value={selEm.actDelay||0} onChange={function(e){setEmF("actDelay",parseFloat(e.target.value));}}/><span style={S.val}>{(selEm.actDelay||0).toFixed(2)}</span></div>
                                <div style={S.row}><span style={S.lab}>Spawn Rate</span><input type="range" style={S.sli} min={1} max={200} step={1} value={selEm.burstSpawnRate||30} onChange={function(e){setEmF("burstSpawnRate",parseInt(e.target.value));}}/><span style={S.val}>{selEm.burstSpawnRate||30}</span></div>
                            </>)}
                        </>)}
                    </div>

                    <div style={S.sec}><div style={S.st}>Apply Template</div><select style={S.ts} value="" onChange={function(e){var idx=parseInt(e.target.value);if(!isNaN(idx))applyTpl(idx);}}><option value="" disabled>Select...</option>{tpls.map(function(t,i){return <option key={i} value={i}>{t.name}</option>;})}</select></div>
                    <div style={S.sec}><div style={S.st}>Identity</div>{rg("identity")}</div>
                    <div style={S.sec}><div style={S.st}>Size</div>{rg("size")}</div>
                    <div style={S.sec}><div style={S.st}>Motion</div>{rg("motion")}</div>
                    <div style={S.sec}><div style={S.st}>Appearance</div>{colorPrev()}
                        {/* Palette mode controls */}
                        <div style={S.row}><span style={S.lab}>Pixel Palette</span><button style={{...S.tog,background:palMode?"#f59e0b":"#333"}} onClick={function(){setPalMode(!palMode);}}><div style={{...S.knob,left:palMode?20:2}}/></button></div>
                        {palMode&&(<>
                            <div style={S.row}><span style={S.lab}>Palette</span><select style={S.sel2} value={palIdx} onChange={function(e){setPalIdx(parseInt(e.target.value));}}>{PALETTES.map(function(p,i){return <option key={i} value={i}>{p.name+" ("+p.colors.length+")"}</option>;})}</select></div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:1,marginBottom:8,padding:"4px 0"}}>{PALETTES[palIdx].colors.map(function(c,ci){return <div key={ci} style={{width:16,height:16,background:c,borderRadius:2,cursor:"pointer",border:"1px solid #333",boxSizing:"border-box"}} title={c} onClick={function(){if(!selEm)return;var keys=["colorStart","colorMid","colorEnd"];var cur=[selEm.pcfg.colorStart,selEm.pcfg.colorMid,selEm.pcfg.colorEnd];var best=0,bestD=Infinity;for(var k=0;k<3;k++){var src=h2rgb(cur[k]),tgt=h2rgb(c);var d2=(src.r-tgt.r)*(src.r-tgt.r)+(src.g-tgt.g)*(src.g-tgt.g)+(src.b-tgt.b)*(src.b-tgt.b);if(d2<bestD){bestD=d2;best=k;}}setPcfg(keys[best],c);}}/>;})}</div>
                            <div style={{display:"flex",gap:4,marginBottom:8}}>
                                <button style={{...S.rbtn,flex:1,marginTop:0,fontSize:"9px",color:"#f59e0b",borderColor:"#f59e0b44"}} onClick={function(){if(!selEm)return;setPcfg("colorStart",snapToPal(selEm.pcfg.colorStart,palIdx));setPcfg("colorMid",snapToPal(selEm.pcfg.colorMid,palIdx));setPcfg("colorEnd",snapToPal(selEm.pcfg.colorEnd,palIdx));}}>Snap All Colors</button>
                            </div>
                        </>)}
                        {rg("appearance")}
                    </div>
                    <div style={S.sec}><div style={S.st}>Save</div>
                        {actTpl!==null&&<button style={S.btn} onClick={saveTpl}>Save to "{tpls[actTpl]?tpls[actTpl].name:""}"</button>}
                        <button style={{...S.rbtn,color:"#00ffaa",borderColor:"#00ffaa44"}} onClick={saveNew}>Save as New Template</button>
                    </div>
                </>):<div style={S.ns}>Select an emitter to edit, or add one.</div>}

                <div style={S.sec}><div style={S.st}>Export</div>
                    {selEm&&<button style={S.btn} onClick={expSel}>Export Selected</button>}
                    <button style={{...S.btn,background:"#f59e0b",marginTop:4}} onClick={expScene}>Export Full Scene</button>
                    <button style={S.rbtn} onClick={clearScene}>Clear Scene</button>
                    {showExp&&<div><textarea style={S.ea} value={expJSON} readOnly rows={10}/><button style={{...S.rbtn,marginTop:4,color:"#00ffaa",borderColor:"#00ffaa"}} onClick={cpExp}>Copy to Clipboard</button></div>}
                </div>
            </div>

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
                    <div style={{marginBottom:12,color:"#999"}}>Spawns particles at Spawn Rate over a Duration starting at Start Time. Each activation runs for the full Duration, stacked back-to-back. If activations push past system lifetime, they get cut off when the system ends or loops.</div>
                    <div style={{color:"#a29bfe",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>CURVES</div>
                    <div style={{marginBottom:12,color:"#999"}}>Flat (default, always 1), Ramp Up (0 to 1), Ramp Down (1 to 0), plus easings, pulse, and wave. Applied to Size, Opacity, Color, Speed over particle lifetime.</div>
                    <div style={{color:"#f59e0b",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>CANVAS</div>
                    <div style={{marginBottom:12,color:"#999"}}>Left-click select/drag. Middle-click pan. BG/Zoom/Grid/Handles controls on the canvas edges.</div>
                    <div style={{color:"#f59e0b",fontWeight:600,marginBottom:4,fontSize:"11px",letterSpacing:1}}>TIMELINE</div>
                    <div style={{marginBottom:4,color:"#999"}}>Shows all emitters as thin bars. Selected emitter highlights brighter. Click to scrub. Loop emitters = full width, Instant = thin mark, Duration = blocks with dividers per activation.</div>
                </div>
            </div>}
        </div>
    );
}

export default ParticleEditor;