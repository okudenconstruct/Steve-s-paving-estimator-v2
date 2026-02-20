// ============================================
// Estimate Confidence System
// Four-component weighted confidence scoring
// ============================================

import { CONFIDENCE_WEIGHTS, RATE_CONFIDENCE, BENCHMARKS, QTY_RANGES } from '../data/paving-defaults.js';

/**
 * Calculate estimate confidence score.
 * @param {Object} snapshot - { activities: [{ activityType, unitCost, grossQuantity, duration }], jobMode }
 * @returns {{ prodReliability, benchAlignment, scopeDefinition, dataQuality, composite, descriptor, details }}
 */
export function calculateConfidence(snapshot) {
    const { activities, jobMode } = snapshot;
    const activeActivities = activities.filter(a => a.duration > 0);

    if (activeActivities.length === 0) {
        return _emptyResult();
    }

    const benchmarks = BENCHMARKS[jobMode] || BENCHMARKS.parking_lot;
    const qtyRanges = QTY_RANGES[jobMode] || QTY_RANGES.parking_lot;

    // 1. Production Reliability (35%) — weighted avg of RATE_CONFIDENCE scores
    const prodReliability = _calcProductionReliability(activeActivities);

    // 2. Benchmark Alignment (30%) — unit cost within P25-P75 range
    const benchAlignment = _calcBenchmarkAlignment(activeActivities, benchmarks);

    // 3. Scope Definition (20%) — quantities within typical ranges
    const scopeDefinition = _calcScopeDefinition(activeActivities, qtyRanges);

    // 4. Data Quality (15%) — sample size scoring
    const dataQuality = _calcDataQuality(activeActivities, benchmarks);

    // Composite weighted score
    const composite =
        prodReliability.score * CONFIDENCE_WEIGHTS.productionReliability +
        benchAlignment.score * CONFIDENCE_WEIGHTS.benchmarkAlignment +
        scopeDefinition.score * CONFIDENCE_WEIGHTS.scopeDefinition +
        dataQuality.score * CONFIDENCE_WEIGHTS.dataQuality;

    const descriptor = _getDescriptor(composite);

    return {
        prodReliability,
        benchAlignment,
        scopeDefinition,
        dataQuality,
        composite,
        descriptor,
    };
}

function _calcProductionReliability(activities) {
    let totalWeight = 0;
    let weightedScore = 0;
    const details = [];

    for (const a of activities) {
        const conf = RATE_CONFIDENCE[a.activityType];
        if (!conf) continue;
        const weight = a.directCost || 1;
        weightedScore += conf.score * weight;
        totalWeight += weight;
        details.push({ activity: a.activityType, score: conf.score, band: conf.band });
    }

    const score = totalWeight > 0 ? weightedScore / totalWeight : 0.5;
    return { score, details };
}

function _calcBenchmarkAlignment(activities, benchmarks) {
    let inRange = 0;
    let total = 0;
    const details = [];

    for (const a of activities) {
        const bm = benchmarks[a.activityType];
        if (!bm || !a.unitCost || a.unitCost <= 0) continue;

        total++;
        const status = _getUnitCostStatus(a.unitCost, bm);
        if (status === 'IN_RANGE') inRange++;
        details.push({
            activity: a.activityType,
            unitCost: a.unitCost,
            p25: bm.p25,
            median: bm.median,
            p75: bm.p75,
            status,
        });
    }

    const score = total > 0 ? inRange / total : 0.5;
    return { score, inRange, total, details };
}

function _calcScopeDefinition(activities, qtyRanges) {
    let inRange = 0;
    let total = 0;
    const details = [];

    for (const a of activities) {
        const range = qtyRanges[a.activityType];
        if (!range || !a.grossQuantity) continue;

        total++;
        const within = a.grossQuantity >= range.low && a.grossQuantity <= range.high;
        if (within) inRange++;
        details.push({
            activity: a.activityType,
            qty: a.grossQuantity,
            low: range.low,
            high: range.high,
            within,
        });
    }

    const score = total > 0 ? inRange / total : 0.5;
    return { score, inRange, total, details };
}

function _calcDataQuality(activities, benchmarks) {
    let totalScore = 0;
    let count = 0;
    const details = [];

    for (const a of activities) {
        const bm = benchmarks[a.activityType];
        if (!bm) continue;

        count++;
        const n = bm.n || 0;
        let score;
        if (n >= 30)      score = 1.0;
        else if (n >= 15) score = 0.8;
        else if (n >= 5)  score = 0.6;
        else if (n > 0)   score = 0.4;
        else              score = 0.2;

        totalScore += score;
        details.push({ activity: a.activityType, n, score, basis: bm.basis });
    }

    const score = count > 0 ? totalScore / count : 0.2;
    return { score, details };
}

/**
 * Get unit cost status relative to benchmark.
 */
export function _getUnitCostStatus(unitCost, benchmark) {
    if (unitCost >= benchmark.p25 && unitCost <= benchmark.p75) return 'IN_RANGE';
    if (unitCost < benchmark.p25 * 0.5)  return 'VERY_LOW';
    if (unitCost < benchmark.p25)         return 'LOW';
    if (unitCost > benchmark.p75 * 1.5)  return 'VERY_HIGH';
    if (unitCost > benchmark.p75)         return 'HIGH';
    return 'IN_RANGE';
}

function _getDescriptor(composite) {
    if (composite >= 0.80) return 'HIGH';
    if (composite >= 0.65) return 'MOD-HIGH';
    if (composite >= 0.50) return 'MODERATE';
    return 'LOW';
}

function _emptyResult() {
    const empty = { score: 0, details: [] };
    return {
        prodReliability: empty,
        benchAlignment: { ...empty, inRange: 0, total: 0 },
        scopeDefinition: { ...empty, inRange: 0, total: 0 },
        dataQuality: empty,
        composite: 0,
        descriptor: 'LOW',
    };
}
