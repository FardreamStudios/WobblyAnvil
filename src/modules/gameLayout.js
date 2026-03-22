// ============================================================
// gameLayout.js — Wobbly Anvil Layout Module
// Fixed CSS grid shell for the game screen.
// All regions are locked in place — content scrolls inside them.
// GameShell scales to fit any viewport while maintaining
// design proportions. Works on ultrawide, mobile, everything.
//
// Mobile detection: exports useLayoutMode hook. When mobile is
// detected, the consumer (App.js) renders MobileLayout instead.
// Desktop path is completely unchanged.
// ============================================================

import { useState, useEffect, useRef } from "react";

// --- Design dimensions ---
var DESIGN_WIDTH = 1200;
var DESIGN_HEIGHT = 820;
var MOBILE_BREAKPOINT = 1024;

// --- Layout CSS (injected once) ---

var LAYOUT_CSS = "\n  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Josefin+Sans:wght@400;600;700&display=swap');\n  .game-shell-outer {\n    width: 100vw;\n    height: 100vh;\n    overflow: hidden;\n    background: #0a0704;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n  }\n  .game-shell {\n    width: " + DESIGN_WIDTH + "px;\n    height: " + DESIGN_HEIGHT + "px;\n    display: grid;\n    grid-template-rows: auto 1fr auto;\n    grid-template-columns: 210px 1fr 165px;\n    grid-template-areas:\n      \"header  header  header\"\n      \"left    center  right\"\n      \"footer  footer  footer\";\n    background: #1a1209;\n    font-family: 'Josefin Sans', sans-serif;\n    color: #f0e6c8;\n    overflow: hidden;\n    position: relative;\n    transform-origin: center center;\n    flex-shrink: 0;\n  }\n  .game-header {\n    grid-area: header;\n    background: #0f0b06;\n    border-bottom: 1px solid #3d2e0f;\n    padding: 6px 14px;\n    overflow: hidden;\n    font-family: 'Cinzel', serif;\n  }\n  .game-left {\n    grid-area: left;\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    padding: 8px 4px 8px 10px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    justify-content: flex-start;\n  }\n  .game-center {\n    grid-area: center;\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    padding: 8px 10px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    position: relative;\n  }\n  .game-right {\n    grid-area: right;\n    padding: 8px 10px 8px 0;\n    overflow-y: auto;\n    overflow-x: hidden;\n  }\n  .game-footer {\n    grid-area: footer;\n    background: #0f0b06;\n    border-top: 1px solid #3d2e0f;\n    padding: 8px 16px;\n    display: flex;\n    gap: 10px;\n    align-items: center;\n    overflow: hidden;\n    font-family: 'Josefin Sans', sans-serif;\n  }\n  .game-left::-webkit-scrollbar,\n  .game-center::-webkit-scrollbar,\n  .game-right::-webkit-scrollbar {\n    width: 6px;\n  }\n  .game-left::-webkit-scrollbar-track,\n  .game-center::-webkit-scrollbar-track,\n  .game-right::-webkit-scrollbar-track {\n    background: #0a0704;\n    border-radius: 3px;\n  }\n  .game-left::-webkit-scrollbar-thumb,\n  .game-center::-webkit-scrollbar-thumb,\n  .game-right::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 3px;\n  }\n";

// --- Mobile detection hook ---

function isTouchDevice() {
    return typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
}

function useLayoutMode() {
    var [isMobile, setIsMobile] = useState(function() {
        return typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT && isTouchDevice();
    });

    useEffect(function() {
        function check() {
            setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT && isTouchDevice());
        }
        window.addEventListener("resize", check);
        return function() { window.removeEventListener("resize", check); };
    }, []);

    return isMobile;
}

// --- Desktop Layout Components (unchanged) ---

function GameShell({ className, children }) {
    var [scale, setScale] = useState(1);
    var outerRef = useRef(null);

    useEffect(function() {
        var outer = outerRef.current;
        if (!outer) return;

        function recalc() {
            var vw = outer.clientWidth;
            var vh = outer.clientHeight;
            var scaleX = vw / DESIGN_WIDTH;
            var scaleY = vh / DESIGN_HEIGHT;
            setScale(Math.min(scaleX, scaleY));
        }

        recalc();
        var observer = new ResizeObserver(recalc);
        observer.observe(outer);
        return function() { observer.disconnect(); };
    }, []);

    return (
        <div ref={outerRef} className="game-shell-outer">
            <style>{LAYOUT_CSS}</style>
            <div
                className={"game-shell" + (className ? " " + className : "")}
                style={{ transform: "scale(" + scale + ")" }}
            >
                {children}
            </div>
        </div>
    );
}

function GameHeader({ children }) {
    return <div className="game-header">{children}</div>;
}

function GameLeft({ children }) {
    return <div className="game-left">{children}</div>;
}

function GameCenter({ children, style }) {
    return <div className="game-center" style={style}>{children}</div>;
}

function GameRight({ children }) {
    return <div className="game-right">{children}</div>;
}

function GameFooter({ children }) {
    return <div className="game-footer">{children}</div>;
}

// ============================================================
// Plugin-style API
// ============================================================
var GameLayout = {
    DESIGN_WIDTH: DESIGN_WIDTH,
    DESIGN_HEIGHT: DESIGN_HEIGHT,
    MOBILE_BREAKPOINT: MOBILE_BREAKPOINT,
    useLayoutMode: useLayoutMode,
    GameShell: GameShell,
    GameHeader: GameHeader,
    GameLeft: GameLeft,
    GameCenter: GameCenter,
    GameRight: GameRight,
    GameFooter: GameFooter,
};

export default GameLayout;