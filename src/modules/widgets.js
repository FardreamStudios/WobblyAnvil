// ============================================================
// widgets.js — Wobbly Anvil Base Widget System
// Composable building blocks: Box, Label, Strip, Btn.
// All defaults read from theme.js. Props override defaults.
// Like UMG widget blueprints — views compose these, never
// define raw styles inline.
//
// USAGE:
//   import W from "./widgets.js";
//   <W.Box pad="md" bg="bgPanel" border="thin" row>
//     <W.Label size="xs" color="textLabel">QUALITY</W.Label>
//     <W.Label size="h2" color="gold" bold>98</W.Label>
//   </W.Box>
//
// PORTABLE: Only depends on React + theme.js.
// ============================================================

import THEME from "./theme.js";

// ============================================================
// HELPERS
// Resolve shorthand tokens into actual CSS values.
// ============================================================

function resolveColor(token) {
    if (!token) return undefined;
    if (token.charAt(0) === "#" || token.indexOf("rgb") === 0 || token === "transparent" || token === "none") return token;
    return THEME.colors[token] || token;
}

function resolveSpacing(token) {
    if (token === undefined || token === null) return undefined;
    if (typeof token === "number") return token;
    return THEME.spacing[token] !== undefined ? THEME.spacing[token] : token;
}

function resolveFontSize(token) {
    if (token === undefined || token === null) return undefined;
    if (typeof token === "number") return token;
    return THEME.fontSize[token] !== undefined ? THEME.fontSize[token] : token;
}

function resolveRadius(token) {
    if (token === undefined || token === null) return undefined;
    if (typeof token === "number") return token;
    return THEME.radius[token] !== undefined ? THEME.radius[token] : token;
}

function resolveBorder(token) {
    if (!token) return undefined;
    if (token === "none") return "none";
    return THEME.borders[token] || token;
}

function resolveShadow(token) {
    if (!token) return undefined;
    return THEME.shadows[token] || token;
}

function resolveFont(token) {
    if (!token) return undefined;
    return THEME.fonts[token] || token;
}

function resolveZ(token) {
    if (token === undefined || token === null) return undefined;
    if (typeof token === "number") return token;
    return THEME.z[token] !== undefined ? THEME.z[token] : token;
}

// ============================================================
// BOX
// Generic container. Flex column by default, row with `row`.
// All visual props resolve through theme tokens.
//
// Props:
//   row        — flex-direction: row (default: column)
//   w, h       — width, height (number = px, string = as-is)
//   pad        — padding (theme spacing token or number)
//   gap        — gap (theme spacing token or number)
//   bg         — background (theme color token or raw)
//   border     — border (theme border token or raw)
//   radius     — borderRadius (theme radius token or number)
//   shadow     — boxShadow (theme shadow token or raw)
//   z          — zIndex (theme z token or number)
//   center     — align + justify center
//   flex       — flex shorthand (number or string)
//   overflow   — overflow
//   relative   — position: relative
//   absolute   — position: absolute
//   onClick    — click handler
//   style      — raw style merge (escape hatch)
//   className  — CSS class pass-through
// ============================================================

function Box(props) {
    var style = {
        display: "flex",
        flexDirection: props.row ? "row" : "column",
    };

    if (props.w !== undefined) style.width = typeof props.w === "number" ? props.w : props.w;
    if (props.h !== undefined) style.height = typeof props.h === "number" ? props.h : props.h;
    if (props.pad !== undefined) style.padding = resolveSpacing(props.pad);
    if (props.gap !== undefined) style.gap = resolveSpacing(props.gap);
    if (props.bg) style.background = resolveColor(props.bg);
    if (props.border) style.border = resolveBorder(props.border);
    if (props.radius !== undefined) style.borderRadius = resolveRadius(props.radius);
    if (props.shadow) style.boxShadow = resolveShadow(props.shadow);
    if (props.z !== undefined) style.zIndex = resolveZ(props.z);
    if (props.flex !== undefined) style.flex = props.flex;
    if (props.overflow) style.overflow = props.overflow;
    if (props.relative) style.position = "relative";
    if (props.absolute) style.position = "absolute";
    if (props.shrink === false) style.flexShrink = 0;
    if (props.shrink === true || typeof props.shrink === "number") style.flexShrink = props.shrink === true ? 1 : props.shrink;
    if (props.grow !== undefined) style.flexGrow = typeof props.grow === "boolean" ? (props.grow ? 1 : 0) : props.grow;
    if (props.wrap) style.flexWrap = "wrap";

    if (props.center) {
        style.alignItems = "center";
        style.justifyContent = "center";
    }
    if (props.align) style.alignItems = props.align;
    if (props.justify) style.justifyContent = props.justify;

    // Merge raw style last (escape hatch)
    if (props.style) {
        var keys = Object.keys(props.style);
        for (var i = 0; i < keys.length; i++) {
            style[keys[i]] = props.style[keys[i]];
        }
    }

    return (
        <div
            className={props.className || undefined}
            style={style}
            onClick={props.onClick || undefined}
        >
            {props.children}
        </div>
    );
}

// ============================================================
// LABEL
// Text element with theme-aware sizing and color.
//
// Props:
//   size       — fontSize (theme fontSize token or number)
//   color      — color (theme color token or raw)
//   font       — fontFamily (theme font token or raw)
//   bold       — fontWeight: bold
//   weight     — explicit fontWeight
//   spacing    — letterSpacing (theme letterSpacing token or num)
//   upper      — textTransform: uppercase
//   align      — textAlign
//   line       — lineHeight
//   mono       — shortcut for font="mono"
//   nowrap     — whiteSpace: nowrap + overflow ellipsis
//   style      — raw style merge
// ============================================================

function Label(props) {
    var style = {};

    style.fontSize = resolveFontSize(props.size) || THEME.fontSize.md;
    style.color = resolveColor(props.color) || THEME.colors.textBody;

    if (props.font) style.fontFamily = resolveFont(props.font);
    if (props.mono) style.fontFamily = THEME.fonts.mono;
    if (props.bold) style.fontWeight = "bold";
    if (props.weight) style.fontWeight = props.weight;
    if (props.spacing !== undefined) {
        style.letterSpacing = THEME.letterSpacing[props.spacing] !== undefined
            ? THEME.letterSpacing[props.spacing]
            : props.spacing;
    }
    if (props.upper) style.textTransform = "uppercase";
    if (props.align) style.textAlign = props.align;
    if (props.line) style.lineHeight = props.line;
    if (props.nowrap) {
        style.whiteSpace = "nowrap";
        style.overflow = "hidden";
        style.textOverflow = "ellipsis";
    }

    if (props.style) {
        var keys = Object.keys(props.style);
        for (var i = 0; i < keys.length; i++) {
            style[keys[i]] = props.style[keys[i]];
        }
    }

    return <span style={style}>{props.children}</span>;
}

// ============================================================
// STRIP
// Horizontal row of items with sensible defaults.
// Shortcut for Box with row + align center.
//
// Props: Same as Box, defaults to row + align center.
// ============================================================

function Strip(props) {
    return (
        <Box
            row
            align={props.align || "center"}
            gap={props.gap !== undefined ? props.gap : "sm"}
            pad={props.pad}
            bg={props.bg}
            border={props.border}
            radius={props.radius}
            shadow={props.shadow}
            w={props.w}
            h={props.h}
            z={props.z}
            flex={props.flex}
            overflow={props.overflow}
            relative={props.relative}
            absolute={props.absolute}
            shrink={props.shrink}
            grow={props.grow}
            wrap={props.wrap}
            center={props.center}
            justify={props.justify}
            onClick={props.onClick}
            style={props.style}
            className={props.className}
        >
            {props.children}
        </Box>
    );
}

// ============================================================
// BTN
// Themed button. Resolves all visual props from theme.
//
// Props:
//   label      — button text
//   icon       — emoji/unicode icon (rendered before label)
//   imgSrc     — image icon source (rendered before label)
//   imgSize    — image icon size (default 40)
//   color      — text + border color (theme token or raw)
//   bg         — background (theme token or raw, auto default)
//   size       — fontSize (theme token, default "xs")
//   font       — fontFamily (theme token, default "body")
//   pad        — padding (theme token or number)
//   radius     — borderRadius (theme token, default "md")
//   bold       — fontWeight: bold (default true)
//   upper      — textTransform: uppercase (default true)
//   spacing    — letterSpacing (theme token, default "normal")
//   disabled   — disabled state
//   danger     — danger style shortcut
//   onClick    — click handler
//   flex       — flex shorthand
//   w, h       — width, height
//   style      — raw style merge
//   className  — CSS class pass-through
// ============================================================

function Btn(props) {
    var disabled = props.disabled;
    var danger = props.danger;
    var hasImg = !!props.imgSrc;

    // Resolve color
    var baseColor = danger ? THEME.colors.red : resolveColor(props.color) || THEME.colors.gold;
    var textColor = disabled ? THEME.colors.disabled : baseColor;
    var borderColor = disabled ? THEME.colors.borderDark : (danger ? THEME.colors.red : baseColor);

    // Background
    var bg = hasImg ? "transparent"
        : resolveColor(props.bg) || (disabled ? THEME.colors.bgDeep : danger ? THEME.colors.bgDanger : THEME.colors.bgWarm);

    // Icon filter for images
    var iconFilter = disabled
        ? "brightness(0.3)"
        : "drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000) drop-shadow(0 0 2px rgba(0,0,0,0.6))";

    var style = {
        background: bg,
        border: "1px solid " + borderColor,
        borderRadius: resolveRadius(props.radius) || THEME.radius.md,
        color: textColor,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: resolveFont(props.font) || THEME.fonts.body,
        fontWeight: props.bold === false ? "normal" : "bold",
        fontSize: resolveFontSize(props.size) || THEME.fontSize.xs,
        letterSpacing: THEME.letterSpacing[props.spacing] !== undefined
            ? THEME.letterSpacing[props.spacing]
            : (props.spacing || THEME.letterSpacing.normal),
        textTransform: props.upper === false ? "none" : "uppercase",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: THEME.spacing.xxs,
        padding: resolveSpacing(props.pad) || "4px 4px",
    };

    if (props.w !== undefined) style.width = typeof props.w === "number" ? props.w : props.w;
    if (props.h !== undefined) style.height = typeof props.h === "number" ? props.h : props.h;
    if (props.flex !== undefined) style.flex = props.flex;

    if (props.style) {
        var keys = Object.keys(props.style);
        for (var i = 0; i < keys.length; i++) {
            style[keys[i]] = props.style[keys[i]];
        }
    }

    return (
        <button
            onClick={disabled ? undefined : props.onClick}
            disabled={disabled}
            className={props.className || undefined}
            style={style}
        >
            {props.imgSrc && (
                <img
                    src={props.imgSrc}
                    alt={props.label || ""}
                    style={{
                        width: props.imgSize || 40,
                        height: props.imgSize || 40,
                        objectFit: "contain",
                        filter: iconFilter,
                    }}
                />
            )}
            {!props.imgSrc && props.icon && (
                <span style={{ fontSize: THEME.fontSize.xxl, lineHeight: 1 }}>{props.icon}</span>
            )}
            {!props.imgSrc && props.label && <span>{props.label}</span>}
            {props.children}
        </button>
    );
}

// ============================================================
// Plugin-style API
// ============================================================
var Widgets = {
    // Components
    Box: Box,
    Label: Label,
    Strip: Strip,
    Btn: Btn,

    // Resolvers (exposed for edge cases in views)
    resolveColor: resolveColor,
    resolveSpacing: resolveSpacing,
    resolveFontSize: resolveFontSize,
    resolveRadius: resolveRadius,
    resolveBorder: resolveBorder,
    resolveShadow: resolveShadow,
    resolveFont: resolveFont,
    resolveZ: resolveZ,
};

export default Widgets;