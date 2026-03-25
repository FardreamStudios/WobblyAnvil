// ============================================================
// HowToPlay.js — Wobbly Anvil Generic Tutorial Renderer
// Data-driven: reads any howToPlayData-shaped array and
// renders section tabs + card content. Add a section by
// adding data, not code.
//
// LAYOUT RULES:
//   - Fixed % panel (88vw x 65vh capped), never exceeds viewport
//   - No scrollbars anywhere
//   - Tabs in 2 rows (4 top, rest bottom, both centered)
//   - Content area is fixed — text reads like a book
//   - Lines reveal one at a time (tap/click to advance)
//   - Visual slot above text for future spritesheet/FX
//
// PORTABLE: Depends on React, theme.js only.
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
                marginBottom: THEME.spacing.sm,
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
                background: active ? THEME.colors.bgHighlight : "transparent",
                border: "1px solid " + (active ? THEME.colors.gold : THEME.colors.borderMid),
                borderRadius: THEME.radius.md,
                color: active ? THEME.colors.gold : seen ? THEME.colors.textLabel : THEME.colors.textDim,
                padding: "5px 9px",
                cursor: "pointer",
                fontFamily: THEME.fonts.body,
                fontWeight: active ? "bold" : "normal",
                fontSize: THEME.fontSize.xxs,
                letterSpacing: THEME.letterSpacing.tight,
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 3,
                flexShrink: 0,
                transition: "border-color 0.2s, color 0.2s",
            }}
        >
            <span style={{ fontSize: THEME.fontSize.sm }}>{props.icon}</span>
            <span>{props.title}</span>
            {seen && <span style={{ fontSize: 7, color: THEME.colors.green }}>{"\u2713"}</span>}
        </button>
    );
}

// ============================================================
// TAB GRID
// 2 rows: first 4 tabs top row, remaining bottom row.
// Both rows centered.
// ============================================================

function TabGrid(props) {
    var sections = props.sections;
    var sectionIndex = props.sectionIndex;
    var progress = props.progress;
    var onSelect = props.onSelect;

    var topRow = sections.slice(0, 4);
    var bottomRow = sections.slice(4);

    function renderRow(items, startIdx) {
        return (
            <div style={{
                display: "flex",
                justifyContent: "center",
                gap: THEME.spacing.xs,
                flexWrap: "nowrap",
            }}>
                {items.map(function (sec, i) {
                    var globalIdx = startIdx + i;
                    return (
                        <SectionTab
                            key={sec.id}
                            icon={sec.icon}
                            title={sec.title}
                            active={globalIdx === sectionIndex}
                            seen={!!progress[sec.id]}
                            onClick={function () { onSelect(globalIdx); }}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: THEME.spacing.xxs,
            flexShrink: 0,
        }}>
            {renderRow(topRow, 0)}
            {bottomRow.length > 0 && renderRow(bottomRow, 4)}
        </div>
    );
}

// ============================================================
// HOW TO PLAY — MAIN COMPONENT
// Fixed-size overlay. Tabs + book-style line reading.
//
// Reading model:
//   - Each card has a title + array of lines
//   - Lines reveal one at a time on click/tap
//   - After all lines revealed, next click advances to
//     next card or next section
//   - Back goes to previous line, then previous card
// ============================================================

function HowToPlay(props) {
    var onClose = props.onClose;
    var sfx = props.sfx;
    var sections = HOW_TO_PLAY_SECTIONS;

    var [sectionIndex, setSectionIndex] = useState(0);
    var [cardIndex, setCardIndex] = useState(0);
    var [lineIndex, setLineIndex] = useState(0);
    var [progress, setProgress] = useState(loadProgress);

    var section = sections[sectionIndex];
    var card = section.cards[cardIndex];
    var totalLines = card.lines.length;
    var allLinesShown = lineIndex >= totalLines - 1;
    var isLastCard = cardIndex >= section.cards.length - 1;
    var isLastSection = sectionIndex >= sections.length - 1;

    // Mark section as seen when player reaches last line of last card
    useEffect(function () {
        if (allLinesShown && isLastCard && !progress[section.id]) {
            var next = Object.assign({}, progress);
            next[section.id] = true;
            setProgress(next);
            saveProgress(next);
        }
    }, [sectionIndex, cardIndex, lineIndex]);

    function selectSection(idx) {
        if (sfx) sfx.click();
        setSectionIndex(idx);
        setCardIndex(0);
        setLineIndex(0);
    }

    function advance() {
        if (sfx) sfx.click();
        if (!allLinesShown) {
            setLineIndex(lineIndex + 1);
            return;
        }
        if (!isLastCard) {
            setCardIndex(cardIndex + 1);
            setLineIndex(0);
            return;
        }
        if (!isLastSection) {
            setSectionIndex(sectionIndex + 1);
            setCardIndex(0);
            setLineIndex(0);
            return;
        }
        onClose();
    }

    function goBack() {
        if (sfx) sfx.click();
        if (lineIndex > 0) {
            setLineIndex(lineIndex - 1);
            return;
        }
        if (cardIndex > 0) {
            var prevCard = section.cards[cardIndex - 1];
            setCardIndex(cardIndex - 1);
            setLineIndex(prevCard.lines.length - 1);
            return;
        }
        if (sectionIndex > 0) {
            var prevSec = sections[sectionIndex - 1];
            var lastCard = prevSec.cards[prevSec.cards.length - 1];
            setSectionIndex(sectionIndex - 1);
            setCardIndex(prevSec.cards.length - 1);
            setLineIndex(lastCard.lines.length - 1);
            return;
        }
    }

    var canGoBack = lineIndex > 0 || cardIndex > 0 || sectionIndex > 0;

    var promptText;
    if (!allLinesShown) {
        promptText = "TAP TO CONTINUE";
    } else if (!isLastCard || !isLastSection) {
        promptText = "TAP FOR NEXT";
    } else {
        promptText = "TAP TO CLOSE";
    }

    var cardProgress = section.cards.length > 1
        ? (cardIndex + 1) + "/" + section.cards.length
        : null;

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
            <div
                onClick={function (e) { e.stopPropagation(); }}
                style={{
                    background: THEME.colors.bgDeep,
                    border: THEME.borders.accent,
                    borderRadius: THEME.radius.xl,
                    width: "min(500px, 88vw)",
                    height: "min(420px, 65vh)",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: THEME.shadows.modal,
                    overflow: "hidden",
                    padding: "18px 22px",
                    gap: THEME.spacing.md,
                }}
            >

                {/* Header — title + close */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexShrink: 0,
                }}>
                    <div style={{
                        fontSize: THEME.fontSize.lg,
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
                            padding: "3px 9px",
                            cursor: "pointer",
                            fontFamily: THEME.fonts.body,
                            fontSize: THEME.fontSize.md,
                            fontWeight: "bold",
                        }}
                    >X</button>
                </div>

                {/* Section Tabs — 2 rows, 4 top / 3 bottom, centered */}
                <TabGrid
                    sections={sections}
                    sectionIndex={sectionIndex}
                    progress={progress}
                    onSelect={selectSection}
                />

                {/* Divider */}
                <div style={{ borderTop: THEME.borders.thinMid, flexShrink: 0 }} />

                {/* Content Area — fixed, no scroll, click to advance */}
                <div
                    onClick={advance}
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "row",
                        cursor: "pointer",
                        userSelect: "none",
                        overflow: "hidden",
                        gap: THEME.spacing.xl,
                    }}
                >
                    {/* Left — big icon + visual slot */}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        width: 80,
                    }}>
                        <HowToPlayVisual visual={card.visual} />
                        {card.icon && !card.visual && (
                            <span style={{ fontSize: 48, lineHeight: 1 }}>{card.icon}</span>
                        )}
                    </div>

                    {/* Right — title + lines */}
                    <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        overflow: "hidden",
                        gap: THEME.spacing.md,
                    }}>
                        {/* Card title */}
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: THEME.spacing.sm,
                            flexShrink: 0,
                        }}>
                            <span style={{
                                fontSize: THEME.fontSize.xl,
                                color: THEME.colors.gold,
                                fontWeight: "bold",
                                letterSpacing: THEME.letterSpacing.wide,
                            }}>{card.title}</span>
                            {cardProgress && (
                                <span style={{
                                    fontSize: THEME.fontSize.xs,
                                    color: THEME.colors.textDim,
                                    marginLeft: "auto",
                                }}>{cardProgress}</span>
                            )}
                        </div>

                        {/* Lines — revealed one at a time, book-style */}
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: THEME.spacing.md,
                        }}>
                            {card.lines.map(function (line, i) {
                                if (i > lineIndex) return null;
                                return (
                                    <div key={i} style={{
                                        fontSize: THEME.fontSize.xl,
                                        color: i === lineIndex ? THEME.colors.textBody : THEME.colors.textLabel,
                                        lineHeight: 1.7,
                                        transition: "color 0.3s",
                                    }}>
                                        {line}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer — back + prompt */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexShrink: 0,
                    borderTop: THEME.borders.thinMid,
                    paddingTop: THEME.spacing.md,
                }}>
                    <button
                        onClick={canGoBack ? goBack : undefined}
                        style={{
                            background: "transparent",
                            border: "1px solid " + (canGoBack ? THEME.colors.borderLight : THEME.colors.borderDark),
                            borderRadius: THEME.radius.md,
                            color: canGoBack ? THEME.colors.textLabel : THEME.colors.textMuted,
                            padding: "5px 12px",
                            cursor: canGoBack ? "pointer" : "not-allowed",
                            fontFamily: THEME.fonts.body,
                            fontSize: THEME.fontSize.xxs,
                            fontWeight: "bold",
                            letterSpacing: THEME.letterSpacing.tight,
                            textTransform: "uppercase",
                        }}
                    >{"\u2190"} BACK</button>

                    <div style={{
                        fontSize: THEME.fontSize.xs,
                        color: THEME.colors.textDim,
                        letterSpacing: THEME.letterSpacing.normal,
                    }}>
                        {promptText}
                    </div>

                    {/* Spacer to keep prompt centered */}
                    <div style={{ minWidth: 60 }} />
                </div>
            </div>
        </div>
    );
}

export default HowToPlay;