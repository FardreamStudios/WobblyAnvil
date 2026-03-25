// ============================================================
// howToPlayData.js — Wobbly Anvil How to Play Content
// Data-driven tutorial sections. Renderer reads this array
// and builds the UI generically — add a section by adding
// an object, not code.
//
// CARD SHAPE:
//   title    — card heading (short)
//   lines    — array of short text strings (1–3 per card)
//   icon     — optional emoji displayed beside title
//   visual   — optional { type, ...config } for spritesheet
//              or canvas FX slot. Renderer mounts the visual
//              above card text. null = text-only card.
//
// VISUAL TYPES (rendered by HowToPlayVisual):
//   { type: "spritesheet", sheet: "path", frames: N,
//     frameWidth: N, frameHeight: N, fps: N, loop: bool }
//   { type: "fx", fx: "fxName", ...params }
//   { type: "image", src: "path", width: N, height: N }
//
// SECTION SHAPE:
//   id       — unique string key (used for localStorage progress)
//   title    — tab label
//   icon     — tab emoji
//   cards    — array of card objects
//
// RULES:
//   - Keep card text short. "What is this? What does it do?"
//   - No numbers, no deep mechanics.
//   - Teach how to get started, not how to master.
//   - Use game language (heat, hammer, quench — not "phase 1").
// ============================================================

var HOW_TO_PLAY_SECTIONS = [
    {
        id: "forge",
        title: "The Forge",
        icon: "\uD83D\uDD25",
        cards: [
            {
                title: "Your Workshop",
                icon: null,
                lines: [
                    "You are the Royal Blacksmith. Your job is to forge weapons and sell them.",
                    "Each weapon goes through three steps: Heat, Hammer, and Quench.",
                    "How well you do at each step decides the quality of the blade.",
                ],
                visual: { type: "image", src: "/images/icons/waIconHammer.png", width: 64, pixelated: true },
            },
        ],
    },
    {
        id: "heat",
        title: "Heating",
        icon: "\uD83D\uDD25",
        cards: [
            {
                title: "Heat the Metal",
                icon: null,
                lines: [
                    "A bar appears with a moving needle. Tap when the needle is in the sweet spot.",
                    "Hitting the center gives you more hammer strikes. Missing gives you fewer.",
                    "Better equipment slows the needle down, giving you more time.",
                ],
                visual: { type: "image", src: "/images/icons/waIconFire.png", width: 64, pixelated: true },
            },
        ],
    },
    {
        id: "hammer",
        title: "Hammering",
        icon: "\uD83D\uDD28",
        cards: [
            {
                title: "Shape the Blade",
                icon: null,
                lines: [
                    "Tap when the needle is near the center. Closer to center means better quality.",
                    "You get a few strikes — each one adds or removes quality depending on accuracy.",
                ],
                visual: { type: "image", src: "/images/icons/waIconHammer.png", width: 64, pixelated: true },
            },
            {
                title: "Stress & Sessions",
                icon: null,
                lines: [
                    "Each hammering session adds stress to the weapon. Too much stress and it can shatter.",
                    "Use Normalize to ease the stress and keep forging safely. Or quench early with what you have.",
                ],
                visual: { type: "image", src: "/images/icons/waIconFire.png", width: 64, pixelated: true },
            },
        ],
    },
    {
        id: "quench",
        title: "Quenching",
        icon: "\uD83D\uDCA7",
        cards: [
            {
                title: "Finish the Weapon",
                icon: null,
                lines: [
                    "The final step. Tap when the needle hits the sweet spot to lock in quality.",
                    "A good quench adds a bonus. A bad one loses quality. Miss completely and the weapon is destroyed.",
                ],
                visual: { type: "image", src: "/images/icons/waIconSword1.png", width: 64, pixelated: true },
            },
        ],
    },
    {
        id: "customers",
        title: "Customers",
        icon: "\uD83D\uDC64",
        cards: [
            {
                title: "Selling Your Work",
                icon: null,
                lines: [
                    "Customers visit your shop daily — adventurers, knights, nobles.",
                    "They make an offer based on the weapon's quality. You can haggle for more or accept.",
                ],
                visual: { type: "image", src: "/images/icons/waIconShop.png", width: 64, pixelated: true },
            },
            {
                title: "Royal Decrees",
                icon: null,
                lines: [
                    "The crown may send orders for specific weapons. These pay well but have deadlines.",
                    "Missing a decree costs your reputation. Lose all your reputation and it's game over.",
                ],
                visual: { type: "image", src: "/images/icons/waIconCrown.png", width: 64, pixelated: true },
            },
        ],
    },
    {
        id: "shop",
        title: "The Shop",
        icon: "\uD83D\uDED2",
        cards: [
            {
                title: "Materials & Upgrades",
                icon: null,
                lines: [
                    "Open the Market to buy materials and unlock new weapon blueprints.",
                    "Upgrade your forge, anvil, hammer, and quench tank to improve your forging.",
                ],
                visual: { type: "image", src: "/images/icons/waIconBag.png", width: 64, pixelated: true },
            },
        ],
    },
    {
        id: "day",
        title: "Your Day",
        icon: "\u2600\uFE0F",
        cards: [
            {
                title: "Time & Stamina",
                icon: null,
                lines: [
                    "Every action costs time — forging, resting, promoting. The day ends when you sleep.",
                    "Stamina limits how many forge sessions you can do. Rest to recover, or sleep to start fresh.",
                    "Once midnight passes, you can only sleep. Plan ahead.",
                ],
                visual: { type: "image", src: "/images/icons/waIconHourglass.png", width: 64, pixelated: true },
            },
        ],
    },
];

export default HOW_TO_PLAY_SECTIONS;