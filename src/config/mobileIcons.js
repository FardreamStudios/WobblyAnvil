// ============================================================
// mobileIcons.js — Wobbly Anvil Mobile Icon Catalog
// Icon paths and weapon emoji mappings for mobile UI.
// Extracted from mobileLayout.js.
// ============================================================

var PUB = process.env.PUBLIC_URL || "";

var IC = {
    sleep: PUB + "/images/icons/waIconBed.png",
    rest: PUB + "/images/icons/waIconHourglass.png",
    promote: PUB + "/images/icons/waIconHorn.png",
    scavenge: PUB + "/images/icons/waIconTrashcan.png",
    shop: PUB + "/images/icons/waIconShop.png",
    forge: PUB + "/images/icons/waIconHammer.png",
    scrap: PUB + "/images/icons/waIconTrashcan.png",
    bag: PUB + "/images/icons/waIconBag.png",
    decree: PUB + "/images/icons/waIconPennant.png",
    leave: PUB + "/images/icons/waIconDoor1.png",
    normalize: PUB + "/images/icons/waIconFire.png",
    quench: PUB + "/images/icons/waIconSword1.png",
    sidebar: PUB + "/images/ui/waSideBar.png",
};

var WEAPON_ICONS = {
    dagger: "\uD83D\uDDE1",
    shortsword: "\u2694",
    axe: "\uD83E\uDE93",
    longsword: "\u2694",
    mace: "\uD83D\uDD28",
    warhammer: "\uD83D\uDD28",
    greatsword: "\u2694",
    halberd: "\uD83D\uDD31",
    katana: "\uD83D\uDDE1",
    claymore: "\u2694",
};

function weaponIcon(wKey) {
    return WEAPON_ICONS[wKey] || "\u2694";
}

var MobileIcons = {
    IC: IC,
    WEAPON_ICONS: WEAPON_ICONS,
    weaponIcon: weaponIcon,
};

export default MobileIcons;