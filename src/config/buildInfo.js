// ============================================================
// buildInfo.js — Wobbly Anvil Build Metadata
// Single source of truth for version and environment.
// Zero logic. Zero React. Pure data.
//
// Bump `version` every deploy during dev.
// Set `env` to "prod" for release builds to hide dev UI.
// ============================================================

var BUILD_INFO = {
    version: "0.14.0",
    env: "dev",
};

export default BUILD_INFO;