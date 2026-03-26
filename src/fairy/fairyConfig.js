// ============================================================
// fairyConfig.js — Wobbly Anvil Fairy LLM Configuration
//
// Environment switching for fairy API calls.
// Dev mode returns mock responses (free, instant).
// Production mode calls Cloudflare Worker (holds API key).
//
// PORTABLE: Pure JS. No React. No DOM.
// ============================================================

var FAIRY_CONFIG = {

    // --- Mode ---
    // "mock"  — dev mode, returns gibberlese after fake delay
    // "live"  — production, calls Cloudflare Worker
    mode: "mock",

    // --- Production Worker URL ---
    // Set this to your deployed Cloudflare Worker URL.
    // The worker holds the Anthropic API key — never expose it client-side.
    workerUrl: "",

    // --- Timeouts ---
    requestTimeoutMs: 4000,     // max wait for API response
    mockDelayMs:      800,      // fake latency in mock mode

    // --- Limits ---
    maxResponseWords: 15,       // truncate if API returns more than this
    maxRetries:       0,        // retries on failure (0 = no retry, just fallback)

    // --- Feature Gate ---
    enabled: true,              // master switch — false = never call API, always static
};

export default FAIRY_CONFIG;