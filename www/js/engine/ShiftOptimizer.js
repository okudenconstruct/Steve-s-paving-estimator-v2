// ============================================
// Shift Buffer Zone Optimizer
// Snap raw hours to billable shift increments with hustle detection
// ============================================

import { SHIFT_CONSTANTS } from '../data/constants.js';

/**
 * Snap a single day's hours to the nearest billing increment.
 * If overshoot is within HUSTLE_THRESHOLD, snap DOWN (crew hustles).
 * @param {number} hours - Raw hours for one day
 * @param {number} stdShift - Standard shift (e.g., 8)
 * @returns {{ hours: number, hustle: boolean, hustleAmount: number }}
 */
export function snapWithHustle(hours, stdShift = 8) {
    if (hours <= 0) return { hours: 0, hustle: false, hustleAmount: 0 };

    const increments = SHIFT_CONSTANTS.BILLING_INCREMENTS;
    const threshold = SHIFT_CONSTANTS.HUSTLE_THRESHOLD;

    // Find the smallest increment that fits
    for (const inc of increments) {
        if (hours <= inc) {
            return { hours: inc, hustle: false, hustleAmount: 0 };
        }
        // Check hustle: if we're just slightly over this increment
        if (hours > inc && hours <= inc + threshold) {
            return { hours: inc, hustle: true, hustleAmount: hours - inc };
        }
    }

    // Exceeds max increment — round up to nearest increment above max
    const maxInc = increments[increments.length - 1];
    const snapped = Math.ceil(hours / maxInc) * maxInc;
    return { hours: snapped, hustle: false, hustleAmount: 0 };
}

/**
 * Optimize a multi-day work scope into billable shifts.
 * Tries standard and extended shift patterns, picks minimum billed hours.
 * @param {number} rawHours - Total raw hours of work
 * @param {number} stdShift - Standard shift (e.g., 8)
 * @param {number} maxShift - Max allowed shift (e.g., 12)
 * @param {number} [minDays=1] - Minimum number of days
 * @returns {{ hours: number, days: number, hustle: boolean, hustleAmount: number, shiftBase: number }}
 */
export function optimizeShifts(rawHours, stdShift = 8, maxShift = 12, minDays = 1) {
    if (rawHours <= 0) {
        return { hours: 0, days: 0, hustle: false, hustleAmount: 0, shiftBase: stdShift };
    }

    const candidates = [];

    // Try standard shift base
    candidates.push(_buildCandidate(rawHours, stdShift));

    // Try max shift base if different
    if (maxShift !== stdShift) {
        candidates.push(_buildCandidate(rawHours, maxShift));
    }

    // Enforce minimum days
    for (const c of candidates) {
        if (c.days < minDays) {
            c.days = minDays;
            // Redistribute hours across min days
            const hoursPerDay = rawHours / minDays;
            const snapped = snapWithHustle(hoursPerDay, stdShift);
            c.hours = snapped.hours * minDays;
            c.hustle = snapped.hustle;
            c.hustleAmount = snapped.hustleAmount;
        }
    }

    // Pick the candidate with minimum total billed hours
    candidates.sort((a, b) => a.hours - b.hours);
    return candidates[0];
}

/**
 * Build a shift optimization candidate for a given shift base.
 */
function _buildCandidate(rawHours, shiftBase) {
    const fullDays = Math.floor(rawHours / shiftBase);
    const remainder = rawHours - (fullDays * shiftBase);

    if (remainder <= 0 && fullDays > 0) {
        return {
            hours: fullDays * shiftBase,
            days: fullDays,
            hustle: false,
            hustleAmount: 0,
            shiftBase,
        };
    }

    if (fullDays === 0) {
        // Less than one full day
        const snapped = snapWithHustle(remainder, shiftBase);
        return {
            hours: snapped.hours,
            days: 1,
            hustle: snapped.hustle,
            hustleAmount: snapped.hustleAmount,
            shiftBase,
        };
    }

    // Full days + remainder
    // Option A: absorb remainder into last day (extend it)
    const lastDayHours = shiftBase + remainder;
    const lastDaySnapped = snapWithHustle(lastDayHours, shiftBase);

    // Option B: add a separate partial day
    const partialSnapped = snapWithHustle(remainder, shiftBase);

    const optionA_total = (fullDays - 1) * shiftBase + lastDaySnapped.hours;
    const optionA_days = fullDays;

    const optionB_total = fullDays * shiftBase + partialSnapped.hours;
    const optionB_days = fullDays + 1;

    if (optionA_total <= optionB_total) {
        return {
            hours: optionA_total,
            days: optionA_days,
            hustle: lastDaySnapped.hustle,
            hustleAmount: lastDaySnapped.hustleAmount,
            shiftBase,
        };
    }

    return {
        hours: optionB_total,
        days: optionB_days,
        hustle: partialSnapped.hustle,
        hustleAmount: partialSnapped.hustleAmount,
        shiftBase,
    };
}
