// ============================================================
// HowToPlay.js — Wobbly Anvil Generic Tutorial Renderer
// Data-driven: reads any howToPlayData-shaped array and
// renders section tabs + card pagination. Add a section by
// adding data, not code.
//
// VISUAL SLOT: Cards with a `visual` field get a visual
// mounted above the text via HowToPlayVisual. Currently
// supports: "image", "spritesheet", "fx". Extend the switch
// in HowToPlayVisual to add new visual types.
//
// PORTABLE: Depends on React, theme.js, and widgets.js only.
// Does not import game logic, state hooks, or constants.
// ============================================================

import { useState, useEffect } from "react";
import THEME from "../config/theme.js";
import HOW_TO_PLAY_SECTIONS from "../config/howToPlayData.js";

// ============================================================
// LOCALSTORAGE PROGRESS
// Tracks which sections the player has fully read.
// ============================================================

var STORAGE_KEY = "wobbly_anvil_htp_progress";

function loadProgress() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveProgress(progress) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) { /* silent */ }
}

// ============================================================
// VISUAL SLOT
// Renders spritesheet, image, or FX above card text.
// Extend this switch to support new visual types.
// Returns null if no visual or unknown type.
// ============================================================

function HowToPlayVisual(props) {
    var visual = props.visual;
    if (!visual) return null;

    if (visual.type === "image") {
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: THEME.spacing.md,
            }}>
                <img
                    src={visual.src}
                    alt=""
                    style={{
                        width: visual.width || 120,
                        height: visual.height || "auto",
                        imageRendering: visual.pixelated ? "pixelated" : "auto",
                        borderRadius: THEME.radius.sm,
                    }}
                />
            </div>
        );
    }

    // Future: spritesheet and fx types
    // if (visual.type === "spritesheet") { ... mount SpriteSheet component ... }
    // if (visual.type === "fx") { ... mount canvas FX layer ... }

    return null;
}

// ============================================================
// SECTION TAB
// Single tab button in the section strip.
// ============================================================

function SectionTab(props) {
    var active = props.active;
    var seen = props.seen;
    return (
        <button
            onClick={props.onClick}
            style={{
                background: active ? THEME.colors.bgHighlight : THEME.colors.bgWarm,
                border: "1px solid " + (active ? THEME.colors.gold : THEME.colors.borderMid),
                borderRadius: THEME.radius.md,
                color: active ? THEME.colors.gold : seen ? THEME.colors.textLabel : THEME.colors.textDim,
                padding: "6px 10px",
                cursor: "pointer",
                fontFamily: THEME.fonts.body,
                fontWeight: active ? "bold" : "normal",
                fontSize: THEME.fontSize.xs,
                letterSpacing: THEME.letterSpacing.normal,
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: THEME.spacing.xs,
                flexShrink: 0,
                transition: "border-color 0.2s, color 0.2s",
            }}
        >
            <span style={{ fontSize: THEME.fontSize.md }}>{props.icon}</span>
            <span>{props.title}</span>
            {seen && <span style={{ fontSize: THEME.fontSize.xxs, color: THEME.colors.green }}>{"\u2713"}</span>}
        </button>
    );
}

// ============================================================
// CARD RENDERER
// Single card with optional visual slot + text lines.
// ============================================================

function CardRenderer(props) {
    var card = props.card;
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: THEME.spacing.md,
        }}>
            {/* Visual slot */}
            <HowToPlayVisual visual={card.visual} />

            {/* Card title */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: THEME.spacing.sm,
            }}>
                {card.icon && <span style={{ fontSize: THEME.fontSize.h3 }}>{card.icon}</span>}
                <span style={{
                    fontSize: THEME.fontSize.lg,
                    color: THEME.colors.gold,
                    fontWeight: "bold",
                    letterSpacing: THEME.letterSpacing.wide,
                    fontFamily: THEME.fonts.body,
                }}>{card.title}</span>
            </div>

            {/* Card text lines */}
            <div style={{ display: "flex", flexDirection: "column", gap: THEME.spacing.sm }}>
                {card.lines.map(function (line, i) {
                    return (
                        <div key={i} style={{
                            fontSize: THEME.fontSize.md,
                            color: THEME.colors.textBody,
                            lineHeight: 1.8,
                            fontFamily: THEME.fonts.body,
                        }}>{line}</div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================================
// HOW TO PLAY — MAIN COMPONENT
// Full-screen overlay. Section tabs + card pagination.
// ============================================================

function HowToPlay(props) {
    var onClose = props.onClose;
    var sfx = props.sfx;
    var sections = HOW_TO_PLAY_SECTIONS;

    var [sectionIndex, setSectionIndex] = useState(0);
    var [cardIndex, setCardIndex] = useState(0);
    var [progress, setProgress] = useState(loadProgress);

    var section = sections[sectionIndex];
    var card = section.cards[cardIndex];
    var isLastCard = cardIndex >= section.cards.length - 1;
    var isLastSection = sectionIndex >= sections.length - 1;
    var totalCards = section.cards.length;

    // Mark section as seen when player reaches last card
    useEffect(function () {
        if (isLastCard && !progress[section.id]) {
            var next = Object.assign({}, progress);
            next[section.id] = true;
            setProgress(next);
            saveProgress(next);
        }
    }, [sectionIndex, cardIndex]);

    function selectSection(idx) {
        if (sfx) sfx.click();
        setSectionIndex(idx);
        setCardIndex(0);
    }

    function nextCard() {
        if (sfx) sfx.click();
        if (!isLastCard) {
            setCardIndex(cardIndex + 1);
        } else if (!isLastSection) {
            setSectionIndex(sectionIndex + 1);
            setCardIndex(0);
        } else {
            onClose();
        }
    }

    function prevCard() {
        if (sfx) sfx.click();
        if (cardIndex > 0) {
            setCardIndex(cardIndex - 1);
        } else if (sectionIndex > 0) {
            var prevSec = sections[sectionIndex - 1];
            setSectionIndex(sectionIndex - 1);
            setCardIndex(prevSec.cards.length - 1);
        }
    }

    var canGoPrev = cardIndex > 0 || sectionIndex > 0;

    return (
        <div
            onClick={function (e) { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: "fixed",
                inset: 0,
                background: THEME.colors.backdropHeavy,
                zIndex: THEME.z.toast,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: THEME.fonts.body,
            }}
        >
            <div style={{
                background: THEME.colors.bgDeep,
                border: THEME.borders.accent,
                borderRadius: THEME.radius.xl,
                padding: "24px 28px",
                width: "min(500px, 92%)",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                gap: THEME.spacing.lg,
                boxShadow: THEME.shadows.modal,
                overflow: "hidden",
            }}>

                {/* Header */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}>
                    <div style={{
                        fontSize: THEME.fontSize.xl,
                        color: THEME.colors.gold,
                        fontWeight: "bold",
                        letterSpacing: THEME.letterSpacing.wide,
                        textTransform: "uppercase",
                    }}>How to Play</div>
                    <button
                        onClick={function () { if (sfx) sfx.click(); onClose(); }}
                        style={{
                            background: THEME.colors.bgHighlight,
                            border: "1px solid " + THEME.colors.borderMid,
                            borderRadius: THEME.radius.sm,
                            color: THEME.colors.gold,
                            padding: "4px 10px",
                            cursor: "pointer",
                            fontFamily: THEME.fonts.body,
                            fontSize: THEME.fontSize.lg,
                            fontWeight: "bold",
                        }}
                    >X</button>
                </div>

                {/* Section Tabs */}
                <div style={{
                    display: "flex",
                    gap: THEME.spacing.xs,
                    overflowX: "auto",
                    paddingBottom: THEME.spacing.xs,
                    flexShrink: 0,
                }}>
                    {sections.map(function (sec, i) {
                        return (
                            <SectionTab
                                key={sec.id}
                                icon={sec.icon}
                                title={sec.title}
                                active={i === sectionIndex}
                                seen={!!progress[sec.id]}
                                onClick={function () { selectSection(i); }}
                            />
                        );
                    })}
                </div>

                {/* Card Content */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "4px 0",
                }}>
                    <CardRenderer card={card} />
                </div>

                {/* Navigation Footer */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexShrink: 0,
                    borderTop: THEME.borders.thinMid,
                    paddingTop: THEME.spacing.lg,
                }}>
                    {/* Back button */}
                    <button
                        onClick={canGoPrev ? prevCard : undefined}
                        style={{
                            background: THEME.colors.bgWarm,
                            border: "1px solid " + (canGoPrev ? THEME.colors.borderLight : THEME.colors.borderDark),
                            borderRadius: THEME.radius.md,
                            color: canGoPrev ? THEME.colors.textBody : THEME.colors.textMuted,
                            padding: "8px 16px",
                            cursor: canGoPrev ? "pointer" : "not-allowed",
                            fontFamily: THEME.fonts.body,
                            fontSize: THEME.fontSize.sm,
                            fontWeight: "bold",
                            letterSpacing: THEME.letterSpacing.normal,
                            textTransform: "uppercase",
                        }}
                    >{"\u2190"} BACK</button>

                    {/* Page indicator */}
                    <div style={{
                        fontSize: THEME.fontSize.xxs,
                        color: THEME.colors.textDim,
                        letterSpacing: THEME.letterSpacing.normal,
                    }}>
                        {section.title.toUpperCase()} · {cardIndex + 1}/{totalCards}
                    </div>

                    {/* Next / Done button */}
                    <button
                        onClick={nextCard}
                        style={{
                            background: THEME.colors.bgWarm,
                            border: "1px solid " + THEME.colors.gold,
                            borderRadius: THEME.radius.md,
                            color: THEME.colors.gold,
                            padding: "8px 16px",
                            cursor: "pointer",
                            fontFamily: THEME.fonts.body,
                            fontSize: THEME.fontSize.sm,
                            fontWeight: "bold",
                            letterSpacing: THEME.letterSpacing.normal,
                            textTransform: "uppercase",
                        }}
                    >{isLastCard && isLastSection ? "DONE" : "NEXT \u2192"}</button>
                </div>
            </div>
        </div>
    );
}

export default HowToPlay;