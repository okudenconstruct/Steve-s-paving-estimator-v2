// ============================================
// Tier 5.3 — Estimate Validation
// Automated checks against rubric axioms and industry norms
// v4.0: Added benchmark, quantity range, crew, mob, and roadway checks
// ============================================

import { BENCHMARKS, QTY_RANGES } from '../data/paving-defaults.js';

export class Validator {
    /**
     * Run all validation checks against calculation results.
     * @param {Object} results - From Calculator.calculate()
     * @param {import('../models/Estimate.js').Estimate} estimate
     * @returns {Array} [{level, check, message, axiom}]
     */
    validate(results, estimate) {
        const warnings = [];

        if (!results || results.directCostTotal === 0) return warnings;

        // ---- 1. Parametric cross-checks (Tier 5.3.1) ----
        this._checkParametric(results, estimate, warnings);

        // ---- 2. Ratio analysis (Tier 5.3.3) ----
        this._checkRatios(results, warnings);

        // ---- 3. Scope completeness (Tier 5.3.4) ----
        this._checkScopeCompleteness(results, estimate, warnings);

        // ---- 4. Unit cost reasonableness (Tier 5.3.5) ----
        this._checkUnitCosts(results, estimate, warnings);

        // ---- 5. Schedule-cost consistency (Tier 5.3.6) ----
        this._checkScheduleConsistency(results, warnings);

        // ---- 6. Axiom violations ----
        this._checkAxioms(results, estimate, warnings);

        // ---- 7. Benchmark alignment (v4.0) ----
        this._checkBenchmarks(results, estimate, warnings);

        // ---- 8. Quantity ranges (v4.0) ----
        this._checkQuantityRanges(results, estimate, warnings);

        // ---- 9. Crew mismatch (v4.0) ----
        this._checkCrewMismatch(results, warnings);

        // ---- 10. Mobilization sanity (v4.0) ----
        this._checkMobilization(results, warnings);

        // ---- 11. Roadway mode checks (v4.0) ----
        this._checkRoadwayMode(results, estimate, warnings);

        return warnings;
    }

    _checkParametric(results, estimate, warnings) {
        // Cost per SY check for paving
        const pavedActivities = results.activities.filter(a =>
            ['paving_base', 'paving_surface'].includes(a.activityType)
        );
        const maxPavedArea = Math.max(0, ...pavedActivities.map(a => a.netQuantity));

        if (maxPavedArea > 0) {
            const costPerSY = results.totalEstimatedCost / maxPavedArea;
            if (costPerSY < 3) {
                warnings.push({
                    level: 'warning', check: 'parametric',
                    message: `Cost/SY of $${costPerSY.toFixed(2)} is unusually low (< $3/SY). Check rates and quantities.`,
                    axiom: null
                });
            }
            if (costPerSY > 80) {
                warnings.push({
                    level: 'warning', check: 'parametric',
                    message: `Cost/SY of $${costPerSY.toFixed(2)} is unusually high (> $80/SY). Verify scope and pricing.`,
                    axiom: null
                });
            }
        }
    }

    _checkRatios(results, warnings) {
        const dc = results.directCostTotal;
        if (dc <= 0) return;

        // Material ratio
        const matPct = results.totalMaterialCost / dc;
        if (matPct > 0 && (matPct < 0.20 || matPct > 0.70)) {
            warnings.push({
                level: 'info', check: 'ratio',
                message: `Materials at ${(matPct * 100).toFixed(1)}% of direct cost. Typical paving range: 20-70%.`,
                axiom: null
            });
        }

        // Labor ratio
        const laborPct = (results.totalLaborCost + results.totalEquipmentCost) / dc;
        if (laborPct > 0 && (laborPct < 0.10 || laborPct > 0.50)) {
            warnings.push({
                level: 'info', check: 'ratio',
                message: `Labor+Equipment at ${(laborPct * 100).toFixed(1)}% of direct cost. Typical: 10-50%.`,
                axiom: null
            });
        }

        // Trucking ratio
        const truckPct = results.totalTruckingCost / dc;
        if (truckPct > 0.35) {
            warnings.push({
                level: 'warning', check: 'ratio',
                message: `Trucking at ${(truckPct * 100).toFixed(1)}% of direct cost. This is unusually high (> 35%).`,
                axiom: null
            });
        }
    }

    _checkScopeCompleteness(results, estimate, warnings) {
        // Axiom 3: Collective Exhaustion — all expected scope must appear
        const completeness = estimate.completeness;
        if (completeness.present < completeness.expected && completeness.present > 0) {
            const missing = ['excavation', 'fine_grading', 'dga_base', 'milling', 'paving_base', 'paving_surface', 'tack_coat']
                .filter(t => !completeness.types.includes(t))
                .map(t => t.replace(/_/g, ' '));

            warnings.push({
                level: 'info', check: 'scope',
                message: `${completeness.present} of ${completeness.expected} standard paving activities estimated. Not included: ${missing.join(', ')}. Verify these are intentionally excluded.`,
                axiom: 3
            });
        }
    }

    _checkUnitCosts(results, estimate, warnings) {
        // Check production rates against known ranges
        for (const ar of results.activities) {
            if (ar.duration <= 0) continue;

            if (ar.activityType === 'excavation' && ar.referenceRate > 0) {
                if (ar.referenceRate > 2000) {
                    warnings.push({
                        level: 'warning', check: 'unit_cost',
                        message: `Excavation rate of ${ar.referenceRate} CY/day exceeds typical max (1,300 CY/day per WisDOT). Verify.`,
                        axiom: 6
                    });
                }
            }

            if (ar.activityType === 'milling' && ar.referenceRate > 0) {
                if (ar.referenceRate > 30000) {
                    warnings.push({
                        level: 'warning', check: 'unit_cost',
                        message: `Milling rate of ${ar.referenceRate} SY/day exceeds typical max (25,000 SY/day). Verify.`,
                        axiom: 6
                    });
                }
            }
        }
    }

    _checkScheduleConsistency(results, warnings) {
        // Axiom 4: Duration derived from CPM
        if (results.projectDuration > 0 && results.totalActivityDays > 0) {
            const concurrencyBenefit = results.totalActivityDays - results.projectDuration;
            if (concurrencyBenefit > 0) {
                warnings.push({
                    level: 'info', check: 'schedule',
                    message: `Schedule concurrency saves ${concurrencyBenefit.toFixed(1)} days (${results.totalActivityDays.toFixed(1)} activity days → ${results.projectDuration.toFixed(1)} project days).`,
                    axiom: 4
                });
            }
        }

        // Check if any activities are missing cycle times but need trucking
        for (const ar of results.activities) {
            if (ar.duration > 0 && ar.trucks === 0 && ['excavation', 'dga_base', 'milling', 'paving_base', 'paving_surface'].includes(ar.activityType)) {
                // Only warn if there's material that needs transport
                if (ar.grossQuantity > 0) {
                    warnings.push({
                        level: 'warning', check: 'trucking',
                        message: `${ar.description}: No trucking calculated. Enter a cycle time to include trucking costs.`,
                        axiom: null
                    });
                }
            }
        }
    }

    _checkAxioms(results, estimate, warnings) {
        // Axiom 7: Uncertainty acknowledgment
        const hasRisks = estimate.riskRegister.risks.length > 0;
        const hasContingency = results.totalContingency > 0;
        if (!hasRisks && !hasContingency) {
            warnings.push({
                level: 'info', check: 'uncertainty',
                message: 'No contingency or risk items defined. Every estimate carries uncertainty (Axiom 7).',
                axiom: 7
            });
        }
    }

    _checkBenchmarks(results, estimate, warnings) {
        const benchmarks = BENCHMARKS[estimate.jobMode] || BENCHMARKS.parking_lot;

        for (const ar of results.activities) {
            if (ar.duration <= 0 || !ar.unitCost) continue;
            const bm = benchmarks[ar.activityType];
            if (!bm) continue;

            const uom = bm.unit || 'SY';
            if (ar.unitCost > bm.p75 * 1.5) {
                warnings.push({
                    level: 'warning', check: 'benchmark',
                    message: `${ar.description}: $${ar.unitCost.toFixed(2)}/${uom} is significantly above P75 ($${bm.p75.toFixed(2)}).`,
                    axiom: null
                });
            } else if (ar.unitCost < bm.p25 * 0.5) {
                warnings.push({
                    level: 'warning', check: 'benchmark',
                    message: `${ar.description}: $${ar.unitCost.toFixed(2)}/${uom} is significantly below P25 ($${bm.p25.toFixed(2)}).`,
                    axiom: null
                });
            }
        }
    }

    _checkQuantityRanges(results, estimate, warnings) {
        const ranges = QTY_RANGES[estimate.jobMode] || QTY_RANGES.parking_lot;

        for (const ar of results.activities) {
            if (ar.duration <= 0) continue;
            const range = ranges[ar.activityType];
            if (!range) continue;

            if (ar.grossQuantity < range.low) {
                warnings.push({
                    level: 'info', check: 'qty_range',
                    message: `${ar.description}: ${ar.grossQuantity.toLocaleString()} is below typical ${estimate.jobMode.replace('_', ' ')} range (${range.low.toLocaleString()}-${range.high.toLocaleString()}).`,
                    axiom: null
                });
            }
            if (ar.grossQuantity > range.high) {
                warnings.push({
                    level: 'info', check: 'qty_range',
                    message: `${ar.description}: ${ar.grossQuantity.toLocaleString()} exceeds typical ${estimate.jobMode.replace('_', ' ')} range (max ${range.high.toLocaleString()}).`,
                    axiom: null
                });
            }
        }
    }

    _checkCrewMismatch(results, warnings) {
        for (const ar of results.activities) {
            if (ar.duration <= 0 || ar.crewAutoSelected !== false) continue;
            // Manual override — just note it
            warnings.push({
                level: 'info', check: 'crew',
                message: `${ar.description}: Crew manually set to ${ar.crewCode || 'custom'} (auto-selection overridden).`,
                axiom: null
            });
        }
    }

    _checkMobilization(results, warnings) {
        if (!results.clusterResults || !results.clusterResults.totalMobCost) return;

        const dc = results.directCostTotal;
        if (dc <= 0) return;

        const mobPct = results.clusterResults.totalMobCost / dc;
        if (mobPct > 0.15) {
            warnings.push({
                level: 'warning', check: 'mobilization',
                message: `Mobilization at ${(mobPct * 100).toFixed(1)}% of direct cost (typical: 3-10%). Check travel hours.`,
                axiom: null
            });
        }
    }

    _checkRoadwayMode(results, estimate, warnings) {
        if (estimate.jobMode !== 'roadway') return;

        // Check for safety crew
        if (!results.clusterResults || results.clusterResults.safetyCost <= 0) {
            warnings.push({
                level: 'warning', check: 'roadway',
                message: 'Roadway mode active but no safety/TC crew cost included.',
                axiom: null
            });
        }

        // Check for parking-lot-scale quantities on roadway
        const parkingRanges = QTY_RANGES.parking_lot;
        for (const ar of results.activities) {
            if (ar.duration <= 0) continue;
            const range = parkingRanges[ar.activityType];
            if (range && ar.grossQuantity > 0 && ar.grossQuantity < range.low) {
                warnings.push({
                    level: 'info', check: 'roadway',
                    message: `${ar.description}: Quantity (${ar.grossQuantity.toLocaleString()}) seems small for roadway work. Verify job mode.`,
                    axiom: null
                });
            }
        }
    }
}
