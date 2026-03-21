// ============================================================
// DevBanner.js — Dev-only version overlay
// Shows build version in bottom-right corner.
// Auto-hidden when BUILD_INFO.env !== "dev".
//
// USAGE: Drop <DevBanner /> anywhere in your root render.
//   import DevBanner from "../components/DevBanner.js";
//   Then at the end of your return: <DevBanner />
// ============================================================

import BUILD_INFO from "../config/buildInfo.js";

function DevBanner() {
    if (BUILD_INFO.env !== "dev") return null;

    return (
        <div style={{
            position: "fixed",
            bottom: 2,
            right: 4,
            fontSize: 9,
            color: "#ef4444",
            fontFamily: "monospace",
            letterSpacing: 1,
            opacity: 0.7,
            pointerEvents: "none",
            zIndex: 99999,
        }}>
            {"v" + BUILD_INFO.version}
        </div>
    );
}

export default DevBanner;