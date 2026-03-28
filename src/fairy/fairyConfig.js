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
    mode: "live",

    // --- Production Worker URL ---
    // Set this to your deployed Cloudflare Worker URL.
    // The worker holds the Anthropic API key — never expose it client-side.
    workerUrl: "https://wobbly-anvil-fairy.wobblyforge.workers.dev/",

    // --- Timeouts ---
    requestTimeoutMs: 6000,     // max wait for API response (chat needs more than reactive)
    mockDelayMs:      800,      // fake latency in mock mode

    // --- Limits (reactive one-liners) ---
    maxResponseWords: 15,       // truncate if API returns more than this
    maxRetries:       0,        // retries on failure (0 = no retry, just fallback)

    // --- Feature Gate ---
    enabled: true,              // master switch — false = never call API, always static

    // --- Chat System ---
    chatEnabled: true,          // master gate for fairy chat feature (button visibility + system)
    chatIdleTimeoutMs: 30000,   // 30s — fairy poofs out after no player input
    chatDebounceMs: 2000,       // min time between API calls
    chatMaxHistory: 15,         // max exchanges stored in local memory
    chatSendHistory: 4,         // exchanges sent per API call (keep small for free tier)
    chatModel: "claude-haiku-4-5-20251001",  // cheapest/fastest for one-liners
    chatMaxTokens: 100,         // token budget for chat responses (1-2 sentences)
    chatMaxResponseWords: 30,   // word truncation limit for chat (vs 15 for reactive)
    chatBubbleSplitWords: 12,   // split long responses into multiple bubbles at this word count
    chatBubbleDelayMs: 4500,    // ms between staggered chat bubbles
};

export default FAIRY_CONFIG;