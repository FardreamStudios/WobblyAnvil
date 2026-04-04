// ============================================================
// battlePlaybackManager.js — Beat-by-Beat Playback Sequencer
//
// Owns the timing chains for both player offense (post-Chalkboard
// playback) and enemy offense (animation-read defense). Emits
// bus events for every visual effect — BattleView subscribes to
// drive React state.
//
// OWNS: Beat iteration, setTimeout chains, damage calc, combo
//       tracking, defense window lifecycle.
// DOES NOT OWN: React state, phase transitions, exchange
//       lifecycle (camOut, swapSides, advanceOrCamOut).
//
// Usage:
//   PlaybackManager.runOffense(bus, ctx);
//   PlaybackManager.runDefense(bus, ctx);
//
// Context shape (ctx):
//   {
//     skill, difficulty, swingerId, receiverId,
//     resultsArray,          // offense only — Chalkboard output
//     bState, BattleSkills, BattleSFX, DefenseTiming,
//     CHOREOGRAPHY, DEFENSE_TIMING, BATTLE_END,
//     comboCounter, summaryDmg, camExchange,
//     isPartyId,             // fn(id) → bool
//     onFinished,            // callback when all beats done
//   }
//
// No React imports. No state setters. Pure JS + bus events.
// ============================================================

import BATTLE_TAGS from "../battleTags.js";

// ============================================================
// OFFENSE PLAYBACK — Player swings, Chalkboard results drive
// damage tiers. Beat-by-beat wind-up → strike → resolve.
// ============================================================

function runOffense(bus, ctx) {
    var skill       = ctx.skill;
    var difficulty  = ctx.difficulty;
    var swingerId   = ctx.swingerId;
    var receiverId  = ctx.receiverId;
    var resultsArray = ctx.resultsArray;
    var bState      = ctx.bState;
    var BattleSkills = ctx.BattleSkills;
    var BattleSFX   = ctx.BattleSFX;
    var CHOREOGRAPHY = ctx.CHOREOGRAPHY;
    var BATTLE_END  = ctx.BATTLE_END;
    var comboCounter = ctx.comboCounter;
    var summaryDmg  = ctx.summaryDmg;

    var beats = skill.beats || [];
    var damageMap = difficulty.damageMap || { perfect: 1.5, good: 1.0, miss: 0.0 };
    var beatIndex = 0;

    function playNextBeat() {
        if (beatIndex >= beats.length) {
            _finishSwing(bus, ctx);
            return;
        }

        var beat = BattleSkills.resolveBeat(beats[beatIndex]);
        var result = resultsArray[beatIndex] || { tier: "miss" };
        var tier = result.tier || "miss";
        var mult = damageMap[tier] != null ? damageMap[tier] : 1.0;
        var isLastBeat = beatIndex === beats.length - 1;
        var dmgColor = "#f59e0b"; // gold for player offense

        // --- WIND-UP ---
        bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: swingerId, animName: "wind_up" });

        setTimeout(function() {
            BattleSFX.swing();
            if (tier === "miss") {
                // --- WHIFF: short lunge, no damage ---
                bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: swingerId, animName: "strike" });
                if (BattleSFX.whiff) BattleSFX.whiff();
                bus.emit(BATTLE_TAGS.SPAWN_DAMAGE, { combatantId: receiverId, value: "MISS", color: "#888888" });

                setTimeout(function() {
                    bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: swingerId });
                    if (!isLastBeat) bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: receiverId });
                    beatIndex++;
                    setTimeout(playNextBeat, 80);
                }, CHOREOGRAPHY.strikeMs);

            } else {
                // --- HIT: strike + damage ---
                setTimeout(function() {
                    bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: swingerId, animName: "strike" });

                    // SFX
                    if (beat.sfx) {
                        if (BattleSFX[beat.sfx]) BattleSFX[beat.sfx]();
                        else BattleSFX.hit();
                    }

                    // Calculate damage
                    var baseDmg = beat.damage;
                    var finalDmg = Math.round(baseDmg * mult);

                    // Combo multiplier
                    comboCounter.playerCombo += 1;
                    var comboCount = comboCounter.playerCombo;
                    if (beat.comboMultiplier != null && beat.comboMultiplier > 0) {
                        var priorHits = Math.max(0, comboCount - 1);
                        if (priorHits > 0) {
                            finalDmg = Math.round(finalDmg * (1 + beat.comboMultiplier * priorHits));
                        }
                    }

                    // Apply damage
                    var dmgResult = bState.applyDamage(receiverId, finalDmg, true);
                    bus.emit(BATTLE_TAGS.BEAT_RESOLVE, {
                        tier: tier, damage: finalDmg, receiverId: receiverId,
                        beatIndex: beatIndex, isLastBeat: isLastBeat,
                    });
                    summaryDmg.total += finalDmg;
                    summaryDmg.color = dmgColor;

                    // Hit reaction on receiver
                    var recState = bState.get(receiverId);
                    var isReceiverKO = recState && recState.ko;

                    setTimeout(function() {
                        bus.emit(BATTLE_TAGS.FLASH, { combatantId: receiverId });
                        if (isReceiverKO && isLastBeat) {
                            bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: "ko" });
                        } else if (isReceiverKO) {
                            bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: "hit" });
                        } else if (beat.tgtReact) {
                            bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: beat.tgtReact });
                        }

                        // Shake — tier-upgraded for perfect
                        var shakeVal = beat.shake;
                        if (tier === "perfect" && shakeVal) {
                            var shakeUpgrade = { light: "medium", medium: "heavy", heavy: "ko" };
                            shakeVal = shakeUpgrade[shakeVal] || shakeVal;
                        }
                        if (shakeVal && !isReceiverKO) {
                            bus.emit(BATTLE_TAGS.SHAKE, { level: shakeVal });
                        }

                        // Per-beat damage number — color by tier
                        var tierColor = tier === "perfect" ? "#ffd700" : "#ffffff";
                        bus.emit(BATTLE_TAGS.SPAWN_DAMAGE, { combatantId: receiverId, value: finalDmg, color: tierColor });
                    }, 60);

                    // Return swinger to idle, clear receiver after hit settles
                    setTimeout(function() {
                        bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: swingerId });
                        var recState2 = bState.get(receiverId);
                        var keepAnim = recState2 && recState2.ko && isLastBeat;
                        if (!keepAnim) bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: receiverId });
                        beatIndex++;
                        setTimeout(playNextBeat, 80);
                    }, CHOREOGRAPHY.strikeMs + CHOREOGRAPHY.hitMs);

                }, CHOREOGRAPHY.strikeMs);
            }
        }, CHOREOGRAPHY.windUpMs);
    }

    // Start first beat
    playNextBeat();
}


// ============================================================
// DEFENSE PLAYBACK — Enemy attacks, player defends by reading
// choreography and tapping (brace) or swiping (dodge).
// Per beat: telegraph → strike anchor → defense window → resolve.
// ============================================================

function runDefense(bus, ctx) {
    var skill       = ctx.skill;
    var swingerId   = ctx.swingerId;
    var receiverId  = ctx.receiverId;
    var bState      = ctx.bState;
    var BattleSkills = ctx.BattleSkills;
    var BattleSFX   = ctx.BattleSFX;
    var DefenseTiming = ctx.DefenseTiming;
    var CHOREOGRAPHY = ctx.CHOREOGRAPHY;
    var DEFENSE_TIMING = ctx.DEFENSE_TIMING;
    var BATTLE_END  = ctx.BATTLE_END;
    var comboCounter = ctx.comboCounter;
    var summaryDmg  = ctx.summaryDmg;

    var beats = skill.beats || [];
    var beatIndex = 0;
    var dmgColor = "#ef4444"; // red for enemy damage on party

    function playDefenseBeat() {
        if (beatIndex >= beats.length) {
            // All beats done
            bus.emit(BATTLE_TAGS.BEAT_DEFENSE_WINDOW, { receiverId: receiverId, open: false });
            DefenseTiming.destroy();
            _finishSwing(bus, ctx);
            return;
        }

        var beat = BattleSkills.resolveBeat(beats[beatIndex]);
        var isLastBeat = beatIndex === beats.length - 1;
        var beatResolved = false;

        // Reset defense timing for this beat
        DefenseTiming.resetBeat();

        // --- TELEGRAPH: enemy wind-up ---
        BattleSFX.telegraph();
        bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: swingerId, animName: "telegraph" });
        bus.emit(BATTLE_TAGS.BEAT_TELEGRAPH, {
            swingerId: swingerId, beatIndex: beatIndex,
            telegraphMs: CHOREOGRAPHY.telegraphMs,
        });

        setTimeout(function() {
            // --- STRIKE: lunge forward, record anchor ---
            bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: swingerId, animName: "strike" });
            BattleSFX.swing();
            DefenseTiming.recordStrikeAnchor();

            // Play beat SFX after short delay so swing whoosh registers first
            setTimeout(function() {
                if (beat.sfx) {
                    if (BattleSFX[beat.sfx]) BattleSFX[beat.sfx]();
                    else BattleSFX.hit();
                }
            }, 80);

            // If receiver can't defend (e.g. charging a special skill), auto-fail immediately
            var recCheck = bState.get(receiverId);
            if (recCheck && recCheck.canDefend === false) {
                beatResolved = true;
                _applyDefenseOutcome(
                    bus, ctx, "fail", DEFENSE_TIMING.failMult,
                    "no_defend", beat, swingerId, receiverId, dmgColor, isLastBeat, advanceBeat
                );
                return;
            }

            // Notify BattleView defense window is open — it wires defenseInputResolveRef
            bus.emit(BATTLE_TAGS.BEAT_DEFENSE_WINDOW, {
                receiverId: receiverId,
                beatIndex: beatIndex,
                open: true,
                resolve: function(result, inputType) {
                    if (beatResolved) return;
                    beatResolved = true;
                    _applyDefenseOutcome(bus, ctx, result.tier, result.mult, inputType, beat, swingerId, receiverId, dmgColor, isLastBeat, advanceBeat);
                },
            });

            // Defense window timeout — if no input, auto-fail
            var windowMs = Math.max(
                DEFENSE_TIMING.braceGoodMs,
                DEFENSE_TIMING.dodgePassMs
            );
            setTimeout(function() {
                if (beatResolved) return;
                beatResolved = true;
                var failResult = DefenseTiming.checkNoInput();
                _applyDefenseOutcome(
                    bus, ctx,
                    failResult ? failResult.tier : "fail",
                    failResult ? failResult.mult : DEFENSE_TIMING.failMult,
                    "auto_miss", beat, swingerId, receiverId, dmgColor, isLastBeat, advanceBeat
                );
            }, windowMs + 50);

        }, CHOREOGRAPHY.telegraphMs);

        function advanceBeat() {
            setTimeout(function() {
                var recState = bState.get(receiverId);
                var keepKO = recState && recState.ko && (beatIndex === beats.length - 1);
                bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: swingerId });
                if (!keepKO) bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: receiverId });
                beatIndex++;
                setTimeout(playDefenseBeat, 80);
            }, CHOREOGRAPHY.hitMs);
        }
    }

    // Start first beat
    playDefenseBeat();
}


// ============================================================
// DEFENSE OUTCOME — Shared hit resolution for defense path.
// Handles dodge, brace (perfect/good), and full hit branches.
// ============================================================

function _applyDefenseOutcome(bus, ctx, tier, mult, inputType, beat, swingerId, receiverId, dmgColor, isLastBeat, onDone) {
    var bState      = ctx.bState;
    var BattleSFX   = ctx.BattleSFX;
    var CHOREOGRAPHY = ctx.CHOREOGRAPHY;
    var DEFENSE_TIMING = ctx.DEFENSE_TIMING;
    var BATTLE_END  = ctx.BATTLE_END;
    var comboCounter = ctx.comboCounter;
    var summaryDmg  = ctx.summaryDmg;

    console.log("[PlaybackMgr] applyDefenseOutcome tier=" + tier + " swinger=" + swingerId + " receiver=" + receiverId + " lastBeat=" + isLastBeat);

    // --- KO guard — receiver already dead → overkill ---
    var recCheck = bState.get(receiverId);
    if (recCheck && recCheck.ko) {
        comboCounter.enemyUnblocked += 1;
        var overkillDmg = Math.round(beat.damage * mult);
        bState.applyDamage(receiverId, overkillDmg, false);
        bus.emit(BATTLE_TAGS.BEAT_RESOLVE, {
            tier: tier, damage: overkillDmg, receiverId: receiverId, isLastBeat: isLastBeat,
        });
        summaryDmg.total += overkillDmg;
        summaryDmg.color = dmgColor;
        bus.emit(BATTLE_TAGS.FLASH, { combatantId: receiverId });
        bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: isLastBeat ? "ko" : "hit" });
        if (onDone) onDone();
        return;
    }

    // --- DODGE (swipe + pass + dodgeable) ---
    if (tier === "pass" && inputType === "swipe" && beat.dodgeable !== false) {
        bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: "dodge" });
        BattleSFX.dodge();
        summaryDmg.color = "#4ade80";
        bus.emit(BATTLE_TAGS.SPAWN_DAMAGE, { combatantId: receiverId, value: "DODGE", color: "#4ade80", yOffset: -30 });
        if (onDone) onDone();
        return;
    }

    // --- BRACE (tap + blockable + not unblockable) ---
    if ((tier === "perfect" || tier === "good") && inputType === "tap" && beat.blockable !== false && !beat.unblockable) {
        var blockDmg = Math.round(beat.damage * mult);
        var isPerfect = (tier === "perfect");

        // Anim: perfect gets stronger visual, good gets standard brace
        bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: isPerfect ? "brace-perfect" : "brace" });

        // Attacker flinch on perfect brace
        if (isPerfect) {
            bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: swingerId, animName: "flinch" });
            setTimeout(function() {
                bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: swingerId });
            }, 180);
        }

        // SFX: crisp parry for perfect, softer block for good
        if (isPerfect) { BattleSFX.bracePerfect(); } else { BattleSFX.block(); }

        var braceResult = bState.applyDamage(receiverId, blockDmg, false);
        bus.emit(BATTLE_TAGS.BEAT_RESOLVE, {
            tier: tier, damage: blockDmg, receiverId: receiverId, isLastBeat: isLastBeat,
        });
        summaryDmg.total += blockDmg;
        summaryDmg.color = "#60a5fa";

        // Damage number + tier label
        bus.emit(BATTLE_TAGS.SPAWN_DAMAGE, { combatantId: receiverId, value: blockDmg, color: "#60a5fa" });
        var braceLabel = isPerfect ? "PERFECT!" : "BLOCK";
        var braceLabelColor = isPerfect ? "#ffd700" : "#60a5fa";
        bus.emit(BATTLE_TAGS.SPAWN_DAMAGE, { combatantId: receiverId, value: braceLabel, color: braceLabelColor, yOffset: -30 });

        if (braceResult.killed && isLastBeat) {
            bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: "ko" });
        }
        bus.emit(BATTLE_TAGS.FLASH, { combatantId: receiverId });
        if (onDone) onDone();
        return;
    }

    // --- FULL HIT (fail, wrong input, unblockable, auto_miss) ---
    comboCounter.enemyUnblocked += 1;
    var fullDmg = Math.round(beat.damage * DEFENSE_TIMING.failMult);

    if (beat.comboMultiplier != null && beat.comboMultiplier > 0) {
        var priorUnblocked = Math.max(0, comboCounter.enemyUnblocked - 1);
        if (priorUnblocked > 0) {
            fullDmg = Math.round(fullDmg * (1 + beat.comboMultiplier * priorUnblocked));
        }
    }

    var hitResult = bState.applyDamage(receiverId, fullDmg, false);
    bus.emit(BATTLE_TAGS.BEAT_RESOLVE, {
        tier: tier, damage: fullDmg, receiverId: receiverId, isLastBeat: isLastBeat,
    });
    summaryDmg.total += fullDmg;
    summaryDmg.color = dmgColor;

    bus.emit(BATTLE_TAGS.FLASH, { combatantId: receiverId });
    BattleSFX.hit();

    // Damage number
    bus.emit(BATTLE_TAGS.SPAWN_DAMAGE, { combatantId: receiverId, value: fullDmg, color: dmgColor });

    var recState = bState.get(receiverId);
    var isKO = recState && recState.ko;
    if (isKO && isLastBeat) {
        bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: "ko" });
    } else {
        bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: "hit" });
        if (beat.shake) {
            bus.emit(BATTLE_TAGS.SHAKE, { level: beat.shake });
        }
    }

    if (onDone) onDone();
}


// ============================================================
// FINISH SWING — Shared post-combo cleanup for both paths.
// Increments swing count, emits SWING_COMPLETE, calls onFinished.
// ============================================================

function _finishSwing(bus, ctx) {
    var swingerId   = ctx.swingerId;
    var receiverId  = ctx.receiverId;
    var bState      = ctx.bState;
    var BattleSFX   = ctx.BattleSFX;
    var camExchange = ctx.camExchange;
    var BATTLE_END  = ctx.BATTLE_END;

    console.log("[PlaybackMgr] finishSwing swinger=" + swingerId + " receiver=" + receiverId);
    if (camExchange) camExchange.swingCount += 1;

    // Check if anyone died during this swing
    var receiverState = bState.get(receiverId);
    var anyKO = receiverState && receiverState.ko;

    // Clean up anim states — preserve KO poses
    var sState = bState.get(swingerId);
    if (!sState || !sState.ko) bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: swingerId });
    if (!receiverState || !receiverState.ko) bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: receiverId });

    // Play KO SFX + shake if someone died during this combo
    if (anyKO) {
        if (BattleSFX.ko) BattleSFX.ko();
        bus.emit(BATTLE_TAGS.SHAKE, { level: "ko" });
    }

    bus.emit(BATTLE_TAGS.SWING_COMPLETE, { swingerId: swingerId, receiverId: receiverId });

    // Caller handles phase transition via onFinished callback
    if (ctx.onFinished) ctx.onFinished();
}


// ============================================================
// SINGLE-BEAT RESOLVERS — For ring QTE path (per-ring callbacks).
// Same bus-event output as the sequenced playback paths above.
// ============================================================

/**
 * resolveDefenseHit — Enemy swings at player, resolve a single
 * defense beat using the tier/mult from the legacy ring QTE.
 *
 * Converts old hit/inputType to tier/mult, then delegates to
 * _applyDefenseOutcome (bus-driven).
 */
function resolveDefenseHit(bus, ctx, hit, inputType, beat, swingerId, receiverId, dmgColor, isLastBeat, onDone) {
    var DEFENSE_TIMING = ctx.DEFENSE_TIMING;
    var tier, mult;
    if (!hit || inputType === "auto_miss") {
        tier = "fail"; mult = DEFENSE_TIMING.failMult;
    } else if (inputType === "swipe") {
        tier = "pass"; mult = DEFENSE_TIMING.dodgePassMult;
    } else {
        tier = "good"; mult = DEFENSE_TIMING.braceGoodMult;
    }
    _applyDefenseOutcome(bus, ctx, tier, mult, inputType, beat, swingerId, receiverId, dmgColor, isLastBeat, onDone);
}

/**
 * resolveOffenseHit — Player swings at enemy, resolve a single
 * offense beat. Applies damage, emits bus events for visuals.
 *
 * hit: true/false from ring QTE
 * Returns nothing — all feedback via bus events.
 */
function resolveOffenseHit(bus, ctx, hit, beat, swingerId, receiverId, dmgColor, isLastBeat) {
    var bState      = ctx.bState;
    var BattleSFX   = ctx.BattleSFX;
    var CHOREOGRAPHY = ctx.CHOREOGRAPHY;
    var BATTLE_END  = ctx.BATTLE_END;
    var comboCounter = ctx.comboCounter;
    var summaryDmg  = ctx.summaryDmg;

    if (hit) {
        // SFX
        if (beat.sfx) {
            if (BattleSFX[beat.sfx]) BattleSFX[beat.sfx]();
            else BattleSFX.hit();
        }

        // Combo tracking
        comboCounter.playerCombo += 1;

        // Apply damage
        var dmgResult = bState.applyDamage(receiverId, beat.damage, true);
        bus.emit(BATTLE_TAGS.BEAT_RESOLVE, {
            tier: "hit", damage: beat.damage, receiverId: receiverId,
            beatIndex: 0, isLastBeat: isLastBeat,
        });
        summaryDmg.total += beat.damage;
        summaryDmg.color = dmgColor;

        // Delayed visual effects (60ms settle)
        setTimeout(function() {
            var recState = bState.get(receiverId);
            var isReceiverKO = recState && recState.ko;

            if (isReceiverKO && isLastBeat) {
                bus.emit(BATTLE_TAGS.FLASH, { combatantId: receiverId });
                bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: "ko" });
            } else if (isReceiverKO) {
                bus.emit(BATTLE_TAGS.FLASH, { combatantId: receiverId });
                bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: "hit" });
            } else if (beat.tgtReact) {
                bus.emit(BATTLE_TAGS.FLASH, { combatantId: receiverId });
                bus.emit(BATTLE_TAGS.ANIM_SET, { combatantId: receiverId, animName: beat.tgtReact });
            }

            if (beat.shake && !isReceiverKO) {
                bus.emit(BATTLE_TAGS.SHAKE, { level: beat.shake });
            }
        }, 60);

        // Clear receiver anim after settle
        setTimeout(function() {
            var recState2 = bState.get(receiverId);
            var keepAnim = recState2 && recState2.ko && isLastBeat;
            if (!keepAnim) bus.emit(BATTLE_TAGS.ANIM_CLEAR, { combatantId: receiverId });
        }, 260);

    } else {
        // Whiff — MISS label on last beat if entire combo whiffed
        if (isLastBeat && summaryDmg.total === 0) {
            bus.emit(BATTLE_TAGS.SPAWN_DAMAGE, { combatantId: receiverId, value: "MISS", color: "#888888" });
        }
    }
}


// ============================================================
// Export
// ============================================================
var PlaybackManager = {
    runOffense: runOffense,
    runDefense: runDefense,
    resolveDefenseHit: resolveDefenseHit,
    resolveOffenseHit: resolveOffenseHit,
};

export default PlaybackManager;