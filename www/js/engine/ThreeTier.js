// ============================================
// Three-Tier Production Model
// Conservative (80%) / Standard (100%) / Aggressive (120%)
// ============================================

import { TIER_MULTIPLIERS } from '../data/paving-defaults.js';
import { optimizeShifts } from './ShiftOptimizer.js';

/**
 * Calculate three-tier production durations for an activity.
 * @param {number} grossQty - Gross quantity (SY, CY, etc.)
 * @param {number} prodPerDay - Base production rate per day
 * @param {number} productivityFactor - Composite productivity multiplier
 * @param {number} stdShift - Standard shift hours (e.g., 8)
 * @param {number} maxShift - Maximum shift hours (e.g., 12)
 * @returns {{ conservative: Object, standard: Object, aggressive: Object }}
 */
export function calcThreeTier(grossQty, prodPerDay, productivityFactor, stdShift = 8, maxShift = 12) {
    if (!grossQty || !prodPerDay || prodPerDay <= 0) {
        const empty = { rawDays: 0, rawHours: 0, optimized: { hours: 0, days: 0, hustle: false } };
        return { conservative: empty, standard: empty, aggressive: empty };
    }

    const result = {};

    for (const [tier, mult] of Object.entries(TIER_MULTIPLIERS)) {
        const adjustedRate = prodPerDay * productivityFactor * mult;
        const rawDays = grossQty / adjustedRate;
        const rawHours = rawDays * stdShift;

        const optimized = optimizeShifts(rawHours, stdShift, maxShift);

        result[tier] = {
            multiplier: mult,
            adjustedRate,
            rawDays,
            rawHours,
            optimized,
        };
    }

    return result;
}
