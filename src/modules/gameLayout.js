// ============================================================
// gameLayout.js — Wobbly Anvil Layout Module
// Fixed CSS grid shell for the game screen.
// All regions are locked in place — content scrolls inside them.
// Replaces ScaleWrapper for the game view.
// ============================================================

// --- Layout CSS (injected once) ---

var LAYOUT_CSS = "\n  .game-shell {\n    width: 100vw;\n    height: 100vh;\n    display: grid;\n    grid-template-rows: auto 1fr auto;\n    grid-template-columns: 225px 1fr 190px;\n    grid-template-areas:\n      \"header  header  header\"\n      \"left    center  right\"\n      \"footer  footer  footer\";\n    background: #1a1209;\n    font-family: monospace;\n    color: #f0e6c8;\n    overflow: hidden;\n    position: relative;\n  }\n  .game-header {\n    grid-area: header;\n    background: #0f0b06;\n    border-bottom: 1px solid #3d2e0f;\n    padding: 8px 14px;\n    overflow: hidden;\n  }\n  .game-left {\n    grid-area: left;\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    padding: 8px 4px 8px 10px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    justify-content: flex-start;\n  }\n  .game-center {\n    grid-area: center;\n    display: flex;\n    flex-direction: column;\n    gap: 6px;\n    padding: 8px 10px;\n    overflow-y: auto;\n    overflow-x: hidden;\n    position: relative;\n  }\n  .game-right {\n    grid-area: right;\n    padding: 8px 10px 8px 0;\n    overflow-y: auto;\n    overflow-x: hidden;\n  }\n  .game-footer {\n    grid-area: footer;\n    background: #0f0b06;\n    border-top: 1px solid #3d2e0f;\n    padding: 8px 16px;\n    display: flex;\n    gap: 10px;\n    align-items: center;\n    overflow: hidden;\n  }\n  .game-left::-webkit-scrollbar,\n  .game-center::-webkit-scrollbar,\n  .game-right::-webkit-scrollbar {\n    width: 6px;\n  }\n  .game-left::-webkit-scrollbar-track,\n  .game-center::-webkit-scrollbar-track,\n  .game-right::-webkit-scrollbar-track {\n    background: #0a0704;\n    border-radius: 3px;\n  }\n  .game-left::-webkit-scrollbar-thumb,\n  .game-center::-webkit-scrollbar-thumb,\n  .game-right::-webkit-scrollbar-thumb {\n    background: #3d2e0f;\n    border-radius: 3px;\n  }\n";// --- Layout Components ---

function GameShell({ className, children }) {
    return (
        <div className={"game-shell" + (className ? " " + className : "")}>
            <style>{LAYOUT_CSS}</style>
            {children}
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
    GameShell: GameShell,
    GameHeader: GameHeader,
    GameLeft: GameLeft,
    GameCenter: GameCenter,
    GameRight: GameRight,
    GameFooter: GameFooter,
};

export default GameLayout;