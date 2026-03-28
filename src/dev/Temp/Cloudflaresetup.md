# Cloudflare Worker Setup — Wobbly Anvil Fairy LLM Proxy

## What This Is

The fairy chat system needs a server to call the Anthropic API. GitHub Pages is static — no server, no secrets. A Cloudflare Worker acts as a middleman: the game sends chat requests to the worker, the worker forwards them to Anthropic's API using your secret key, and returns the fairy's response.

The worker runs 24/7 on Cloudflare's servers. Free tier covers 100,000 requests/day.

---

## Architecture

```
Player taps fairy chat button
  → Game sends POST to Cloudflare Worker
    → Worker adds API key, forwards to Anthropic
      → Claude returns fairy dialogue
    → Worker returns { line: "..." } to game
  → Fairy speech bubble shows the line
```

---

## Prerequisites

- **Node.js** installed (check: `node --version`)
- **Anthropic account** with API key (https://console.anthropic.com)
- **Cloudflare account** (free — https://dash.cloudflare.com/sign-up)

---

## Step 1: Install Wrangler

Wrangler is Cloudflare's CLI tool for managing Workers.

```
npm install -g wrangler
```

Verify: `wrangler --version`

---

## Step 2: Login to Cloudflare

```
wrangler login
```

Opens browser for authentication. Authorize when prompted.

---

## Step 3: Create Worker Project

Create a folder **outside** the Wobbly Anvil project:

```
mkdir wobbly-fairy-worker
cd wobbly-fairy-worker
```

Place two files in this folder:

- `fairy-worker.js` — the worker code (from `src/dev/Temp/tempFairyWorker.txt`)
- `wrangler.toml` — the config file (from `src/dev/Temp/tempFairyWrangler.txt`)

---

## Step 4: Deploy the Worker

From the worker project folder:

```
wrangler deploy
```

First time it will ask you to register a workers.dev subdomain. Pick a short lowercase name (e.g. `fardream`). This becomes part of your worker URL.

The deploy prints your worker URL:

```
https://wobbly-anvil-fairy.YOURNAME.workers.dev
```

Save this URL — you need it for the game config.

---

## Step 5: Set API Key Secret

```
wrangler secret put ANTHROPIC_API_KEY
```

Paste your Anthropic API key when prompted (it won't show on screen — that's normal). Hit Enter.

The key is stored encrypted on Cloudflare. It never appears in your code or reaches the browser.

---

## Step 6: Lock CORS

Edit `wrangler.toml` and change:

```toml
[vars]
ALLOWED_ORIGIN = "https://fardreamstudios.github.io"
```

Redeploy:

```
wrangler deploy
```

This ensures only your game domain can call the worker.

---

## Step 7: Wire Into the Game

Edit `src/fairy/fairyConfig.js`:

```js
mode: "live",
workerUrl: "https://wobbly-anvil-fairy.YOURNAME.workers.dev",
```

Deploy the game: `npm run deploy`

---

## Security Notes

- **API key** is stored encrypted on Cloudflare — never in game code, never sent to browser
- **CORS lock** means only your domain can call the worker
- **Set a spending limit** on your Anthropic account (console.anthropic.com → Billing → Limits) to cap costs
- **Worker URL** is safe to store in code — it's just an endpoint, not a secret
- **Haiku model** is used for fairy chat — extremely cheap for short responses

---

## Maintenance

The worker runs 24/7 with zero maintenance. You only need Wrangler again to:

- **Update worker code:** Edit `fairy-worker.js`, run `wrangler deploy`
- **Rotate API key:** Run `wrangler secret put ANTHROPIC_API_KEY` with new key
- **Check logs:** `wrangler tail` (live stream of worker requests)
- **Take it down:** `wrangler delete` (removes the worker entirely)

---

## File Locations

| File | Location |
|------|----------|
| Worker code | `F:\WranglerWorkers\wobbly-fairy-worker\fairy-worker.js` |
| Worker config | `F:\WranglerWorkers\wobbly-fairy-worker\wrangler.toml` |
| Game API client | `src/fairy/fairyAPI.js` |
| Game config | `src/fairy/fairyConfig.js` |
| Worker template | `src/dev/Temp/tempFairyWorker.txt` |
| Config template | `src/dev/Temp/tempFairyWrangler.txt` |

---

## Costs

| Item | Cost |
|------|------|
| Cloudflare Workers free tier | $0 (100k requests/day) |
| Anthropic Haiku per fairy response (~15 words) | ~$0.0001 |
| Estimated 1000 chat messages/month | ~$0.10 |