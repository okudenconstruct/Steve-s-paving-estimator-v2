// ============================================
// Job Analysis Engine
// Deterministic rule-based observations with flags
// ============================================

import { BENCHMARKS, QTY_RANGES, CREW_DATA, CREW_THRESHOLDS } from '../data/paving-defaults.js';
import { MATERIAL_PRICES } from '../data/constants.js';
import { _getUnitCostStatus } from './Confidence.js';

/**
 * Generate analysis observations for the estimate.
 * @param {Object} snapshot
 * @param {Array} snapshot.activities - Activity results with unitCost, grossQuantity, etc.
 * @param {string} snapshot.jobMode - 'parking_lot' | 'roadway'
 * @param {Object} snapshot.clusterResults - From ClusterEngine
 * @param {Object} snapshot.scopeAssumptions - { [id]: 'included'|'excluded'|'na' }
 * @param {number} snapshot.totalHMATons - Total HMA tonnage
 * @returns {Array<{ id, activity, flag, status, message, reasons }>}
 */
export function generateAnalysis(snapshot) {
    const observations = [];
    const { activities, jobMode, clusterResults, scopeAssumptions, totalHMATons } = snapshot;
    const benchmarks = BENCHMARKS[jobMode] || BENCHMARKS.parking_lot;
    const qtyRanges = QTY_RANGES[jobMode] || QTY_RANGES.parking_lot;
    const activeActivities = activities.filter(a => a.duration > 0);

    let obsId = 1;
    const add = (activity, flag, status, message, reasons = []) => {
        observations.push({ id: obsId++, activity, flag, status, message, reasons });
    };

    // ---- Per-activity rules ----
    for (const a of activeActivities) {
        const bm = benchmarks[a.activityType];
        const range = qtyRanges[a.activityType];

        // Rule 1: Quantity vs typical range
        if (range && a.grossQuantity) {
            const qtyUnit = range.unit || 'SY';
            if (a.grossQuantity < range.low) {
                add(a.activityType, 'SMALL_QTY', 'INFO',
                    `${a.description}: Quantity ${a.grossQuantity.toLocaleString()} ${qtyUnit} is below typical range (${range.low.toLocaleString()}-${range.high.toLocaleString()} ${qtyUnit}).`,
                    ['Crew may be oversized for scope', 'Consider minimum shift billing impact']);
            }
            if (a.grossQuantity > range.high) {
                add(a.activityType, 'LARGE_QTY', 'INFO',
                    `${a.description}: Quantity ${a.grossQuantity.toLocaleString()} ${qtyUnit} exceeds typical range (max ${range.high.toLocaleString()} ${qtyUnit}).`,
                    ['May require phasing or multiple mobilizations', 'Verify production rate achievable at this scale']);
            }
        }

        // Rule 2: Unit cost vs benchmark (enhanced with component diagnosis — Issue 6)
        if (bm && a.unitCost && a.unitCost > 0) {
            const uom = bm.unit || 'SY';
            const status = _getUnitCostStatus(a.unitCost, bm);
            const reasons = [];

            if (status === 'VERY_HIGH' || status === 'HIGH') {
                reasons.push(`Benchmark ${status === 'VERY_HIGH' ? 'median' : 'range'}: ${status === 'VERY_HIGH' ? `$${bm.median.toFixed(2)}/${uom} (n=${bm.n})` : `$${bm.p25.toFixed(2)}-$${bm.p75.toFixed(2)}/${uom}`}`);
                // Diagnose dominant cost component
                reasons.push(..._diagnoseCostDrivers(a, uom, 'high'));
                add(a.activityType, 'UNIT_COST', status === 'VERY_HIGH' ? 'WARNING' : 'INFO',
                    `${a.description}: Unit cost $${a.unitCost.toFixed(2)}/${uom} is ${status === 'VERY_HIGH' ? 'significantly ' : ''}above P75 ($${bm.p75.toFixed(2)}).`,
                    reasons);
            } else if (status === 'VERY_LOW' || status === 'LOW') {
                reasons.push(`Benchmark ${status === 'VERY_LOW' ? 'median' : 'range'}: ${status === 'VERY_LOW' ? `$${bm.median.toFixed(2)}/${uom} (n=${bm.n})` : `$${bm.p25.toFixed(2)}-$${bm.p75.toFixed(2)}/${uom}`}`);
                // Diagnose missing or low components
                reasons.push(..._diagnoseCostDrivers(a, uom, 'low'));
                add(a.activityType, 'UNIT_COST', status === 'VERY_LOW' ? 'WARNING' : 'INFO',
                    `${a.description}: Unit cost $${a.unitCost.toFixed(2)}/${uom} is ${status === 'VERY_LOW' ? 'significantly ' : ''}below P25 ($${bm.p25.toFixed(2)}).`,
                    reasons);
            }
        }

        // Rule 3: Minimum shift utilization
        if (a.threeTier && a.threeTier.standard) {
            const stdHours = a.threeTier.standard.rawHours;
            if (stdHours > 0 && stdHours < 3.5) {
                add(a.activityType, 'MIN_SHIFT', 'INFO',
                    `${a.description}: Only ${stdHours.toFixed(1)} hours of work but crew billed for minimum 4-hour shift.`,
                    ['Consider combining with adjacent activity', 'Minimum shift billing adds overhead']);
            }
        }

        // Rule 4: Crew size vs job size mismatch
        if (a.crewCode && a.grossQuantity) {
            const thresholds = CREW_THRESHOLDS[a.activityType] || CREW_THRESHOLDS.paving;
            if (thresholds && a.crewAutoSelected === false) {
                const recommended = thresholds.find(t => a.grossQuantity <= t.maxSY);
                if (recommended && recommended.crew !== a.crewCode) {
                    const recData = CREW_DATA[recommended.crew];
                    const curData = CREW_DATA[a.crewCode];
                    if (recData && curData && curData.people < recData.people) {
                        add(a.activityType, 'CREW_UNDERSIZED', 'WARNING',
                            `${a.description}: Using ${a.crewCode} (${curData.people} people) but ${recommended.crew} (${recData.people} people) recommended for ${a.grossQuantity.toLocaleString()} SY.`,
                            ['Smaller crew will extend duration', 'May impact schedule and indirect costs']);
                    }
                }
            }
        }
    }

    // ---- Cross-activity rules ----

    // Rule 5: COMBO crew detection
    if (clusterResults && clusterResults.isCombo) {
        const hasCombo = activeActivities.some(a => a.crewCode === 'COMBO');
        if (!hasCombo) {
            add('global', 'COMBO_AVAILABLE', 'INFO',
                'Milling and paving both active — COMBO crew ($564.28/hr) may be more efficient than separate ML7 + paving crews.',
                ['COMBO crew shares equipment between milling and paving', 'Reduces mobilization to single deployment']);
        }
    }

    // Rule 6: Overtime alert
    for (const a of activeActivities) {
        if (a.threeTier && a.threeTier.standard) {
            const opt = a.threeTier.standard.optimized;
            if (opt && opt.shiftBase > 10) {
                add(a.activityType, 'OVERTIME', 'INFO',
                    `${a.description}: Optimized to ${opt.shiftBase}-hour shifts. Overtime rules may apply.`,
                    ['Verify OT rate impact on crew cost', 'Check local labor agreement']);
            }
        }
    }

    // Rule 7: Roadway safety crew reminder
    if (jobMode === 'roadway') {
        if (!clusterResults || clusterResults.safetyCost <= 0) {
            add('global', 'SAFETY_MISSING', 'WARNING',
                'Roadway mode active but no safety/traffic control crew cost included.',
                ['WisDOT requires traffic control for roadway work', 'Consider adding safety/traffic control crew']);
        }
    }

    // Rule 8: Plant opening fee for small tonnage
    if (totalHMATons && totalHMATons > 0 && totalHMATons < 100) {
        add('global', 'PLANT_OPENING', 'INFO',
            `Total HMA tonnage (${totalHMATons.toFixed(0)} tons) is low — plant opening fee of $${MATERIAL_PRICES.plant_open_weekday.toLocaleString()} may apply.`,
            ['HMA plants charge opening fees for small orders', 'Consider silo dump ($400) if available']);
    }

    // Rule 9: Mobilization cost sanity check
    if (clusterResults && clusterResults.totalMobCost > 0) {
        const directTotal = activeActivities.reduce((sum, a) => sum + (a.directCost || 0), 0);
        if (directTotal > 0) {
            const mobPct = clusterResults.totalMobCost / directTotal;
            if (mobPct > 0.15) {
                add('global', 'MOB_HIGH', 'WARNING',
                    `Mobilization at ${(mobPct * 100).toFixed(1)}% of direct cost — unusually high.`,
                    ['Typical range: 3-10% of direct cost', 'Check travel hours and number of deployments']);
            }
        }
    }

    // Rule 10: Pattern detection — all activities trending same direction
    const unitCostStatuses = activeActivities
        .filter(a => a.unitCost > 0 && benchmarks[a.activityType])
        .map(a => _getUnitCostStatus(a.unitCost, benchmarks[a.activityType]));

    if (unitCostStatuses.length >= 3) {
        const highCount = unitCostStatuses.filter(s => s === 'HIGH' || s === 'VERY_HIGH').length;
        const lowCount = unitCostStatuses.filter(s => s === 'LOW' || s === 'VERY_LOW').length;

        if (highCount >= 3) {
            add('global', 'SYSTEMIC_HIGH', 'WARNING',
                `${highCount} of ${unitCostStatuses.length} activities have unit costs above benchmark P75.`,
                ['Systemic high pricing may indicate crew rate or productivity factor issue', 'Or may reflect legitimate site conditions']);
        }
        if (lowCount >= 3) {
            add('global', 'SYSTEMIC_LOW', 'WARNING',
                `${lowCount} of ${unitCostStatuses.length} activities have unit costs below benchmark P25.`,
                ['Systemic low pricing may indicate missing cost components', 'Verify all materials and mobilization included']);
        }
    }

    // Rule 11: Missing trucking for activities that need it
    for (const a of activeActivities) {
        if (['excavation', 'dga_base', 'milling', 'paving_base', 'paving_surface'].includes(a.activityType)) {
            if (a.truckingCost === 0 && a.grossQuantity > 0) {
                add(a.activityType, 'NO_TRUCKING', 'INFO',
                    `${a.description}: No trucking cost — cycle time not set.`,
                    ['Enter a cycle time to include material hauling costs']);
            }
        }
    }

    // Rule 12: Fee/Profit bounds (Issue 4)
    if (snapshot.feeProfitPct !== undefined) {
        const pct = snapshot.feeProfitPct;
        if (pct > 25) {
            add('global', 'FEE_HIGH', 'WARNING',
                `Fee/Profit markup at ${pct}% — above typical paving range (8-20%).`,
                ['High markup may reduce competitiveness in bid scenarios',
                 'Verify overhead allocation is not double-counted in GC items']);
        } else if (pct > 0 && pct < 5) {
            add('global', 'FEE_LOW', 'INFO',
                `Fee/Profit markup at ${pct}% — below typical paving range (8-20%).`,
                ['Low markup may indicate self-performed or cost-plus work',
                 'Verify home office overhead is covered separately']);
        }
    }

    return observations;
}

/**
 * Diagnose which cost component is driving unit cost variance.
 * Returns actionable corrective text based on dominant component.
 * @param {Object} a - Activity result with laborCost, equipmentCost, materialCost, truckingCost, grossQuantity
 * @param {string} uom - Unit of measure (SY or CY)
 * @param {string} direction - 'high' or 'low'
 * @returns {string[]} Corrective reasons
 */
function _diagnoseCostDrivers(a, uom, direction) {
    const reasons = [];
    const qty = a.grossQuantity || 0;
    if (qty <= 0) return reasons;

    const components = [
        { name: 'Labor', cost: a.laborCost || 0, perUnit: (a.laborCost || 0) / qty },
        { name: 'Equipment', cost: a.equipmentCost || 0, perUnit: (a.equipmentCost || 0) / qty },
        { name: 'Material', cost: a.materialCost || 0, perUnit: (a.materialCost || 0) / qty },
        { name: 'Trucking', cost: a.truckingCost || 0, perUnit: (a.truckingCost || 0) / qty },
    ];

    const totalCost = components.reduce((s, c) => s + c.cost, 0);
    if (totalCost <= 0) return reasons;

    if (direction === 'high') {
        // Find the dominant component
        const sorted = [...components].sort((a, b) => b.perUnit - a.perUnit);
        const dominant = sorted[0];
        const pct = (dominant.cost / totalCost * 100).toFixed(0);

        const corrective = {
            'Labor': `consider a larger crew to reduce duration, or verify crew rate ($${a.crewHourlyCost?.toFixed(2) || '?'}/hr)`,
            'Equipment': 'check equipment ownership cost assumptions',
            'Material': 'verify current material unit pricing against market',
            'Trucking': 'review cycle time and haul distance — reduce trips or increase truck capacity',
        };

        reasons.push(`${dominant.name} is largest component at $${dominant.perUnit.toFixed(2)}/${uom} (${pct}% of production cost) — ${corrective[dominant.name] || 'review assumptions'}`);
    } else {
        // Check for missing components ($0)
        const missing = components.filter(c => c.cost === 0 && c.name !== 'Equipment');
        if (missing.length > 0) {
            const names = missing.map(c => c.name.toLowerCase()).join(', ');
            reasons.push(`No ${names} cost included — verify scope completeness`);
        } else {
            // All present but low — systemic issue
            reasons.push('All cost components present but below benchmark — verify crew rate and production rate assumptions');
        }
    }

    return reasons;
}
