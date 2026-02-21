// ============================================
// Calculation Engine v4.0
// Bottom-up cost derivation with schedule integration
// Tier 6.2 — Full recalculation propagation
// Expanded to 11-phase pipeline
// ============================================

import { Scheduler } from './Scheduler.js';
import { calcThreeTier } from './ThreeTier.js';
import { clusterize } from './ClusterEngine.js';
import { calculateConfidence } from './Confidence.js';
import { generateAnalysis } from './AnalysisEngine.js';
import { calculateCalendarDuration } from './CalendarDuration.js';
import { MATERIAL_PRICES } from '../data/constants.js';
import { BENCHMARKS } from '../data/paving-defaults.js';

export class Calculator {
    /**
     * Run full estimate calculation.
     * Enforces Tier 6.2: bottom-up integrity, schedule-awareness, recalculation propagation.
     *
     * @param {import('../models/Estimate.js').Estimate} estimate
     * @param {number} truckingRate - $/hr for trucking (from rate config)
     * @returns {Object} Complete calculation results
     */
    calculate(estimate, truckingRate = 0) {
        const activities = estimate.allActivities;
        const { stdShift, maxShift } = estimate.shiftSettings;

        // ---- Phase 1: Activity-level calculations ----
        const truckingResults = new Map();
        for (const activity of activities) {
            truckingResults.set(activity.id, activity.calculateTrucking(truckingRate));
        }

        // ---- Phase 2: Three-tier production ----
        for (const activity of activities) {
            if (activity.duration > 0) {
                activity.threeTier = calcThreeTier(
                    activity.quantity?.grossQuantity || 0,
                    activity.productionRate?.outputQty || 0,
                    activity.productivityFactor?.composite || 1,
                    stdShift,
                    maxShift
                );
            }
        }

        // ---- Phase 3: Schedule (CPM) ----
        // Axiom 4: Project duration derived from CPM, never assumed.
        const scheduler = new Scheduler(activities);
        scheduler.run();

        const projectDuration = scheduler.projectDuration;
        const criticalPath = scheduler.criticalPath;
        const ganttData = scheduler.getGanttData();

        // ---- Phase 4: Aggregate costs ----
        let totalLaborCost = 0;
        let totalEquipmentCost = 0;
        let totalMaterialCost = 0;
        let totalTruckingCost = 0;
        let totalMobilizationCost = 0;
        let totalTruckHours = 0;
        let totalActivityDays = 0;
        let totalHMATons = 0;

        const activityResults = [];

        for (const activity of activities) {
            const trk = truckingResults.get(activity.id);

            // Compute unit cost for benchmarking
            // Excavation & DGA: $/CY (volume-driven, depth-independent)
            // All others: $/SY (area-driven)
            // Exclude mobilization (lump sum, not per-unit production cost)
            const grossQty = activity.quantity?.grossQuantity || 0;
            const benchmarks = BENCHMARKS[estimate.jobMode] || BENCHMARKS.parking_lot;
            const bm = benchmarks[activity.activityType];
            const useCY = bm && bm.unit === 'CY';
            const unitDenominator = useCY ? grossQty : (activity.quantity?.inputs?.area || grossQty);
            const productionCost = activity.laborCost + activity.equipmentCost + activity.materialCost + trk.truckCost;
            const actDirectCost = activity.directCost + trk.truckCost;
            const unitCost = unitDenominator > 0 ? productionCost / unitDenominator : 0;
            const unitCostUOM = useCY ? 'CY' : 'SY';

            const result = {
                id: activity.id,
                description: activity.description,
                activityType: activity.activityType,
                wbsCode: activity.wbsCode,
                colorClass: activity.colorClass,

                // Quantity
                netQuantity: activity.quantity?.netQuantity || 0,
                grossQuantity: grossQty,
                quantityUOM: activity.quantity?.uomId || '',

                // Production
                referenceRate: activity.productionRate?.outputQty || 0,
                productivityFactor: activity.productivityFactor?.composite || 1,
                adjustedRate: activity.adjustedProductionRate,
                duration: activity.duration,

                // Crew
                crewSize: activity.crew?.totalHeadcount || 0,
                crewHourlyCost: activity.crew?.hourlyCost || 0,
                crewCode: activity.crewCode,
                crewAutoSelected: activity.crewAutoSelected,

                // Costs
                laborCost: activity.laborCost,
                equipmentCost: activity.equipmentCost,
                materialCost: activity.materialCost,
                mobilizationCost: activity.mobilizationCost,
                truckingCost: trk.truckCost,
                directCost: actDirectCost,
                unitCost,
                unitCostUOM,

                // Trucking detail
                trucks: trk.trucks,
                truckHours: trk.truckHours,

                // Schedule
                earlyStart: scheduler.results.get(activity.id)?.earlyStart || 0,
                earlyFinish: scheduler.results.get(activity.id)?.earlyFinish || 0,
                totalFloat: scheduler.results.get(activity.id)?.totalFloat || 0,
                isCritical: criticalPath.includes(activity.id),

                // Labor hours
                laborHours: activity.laborHours,

                // Three-tier
                threeTier: activity.threeTier,

                // Material breakdown (v4.0)
                materialBreakdown: activity.materialBreakdown,

                // Reviewer note
                reviewerNote: activity.reviewerNote || '',
            };

            activityResults.push(result);

            totalLaborCost += result.laborCost;
            totalEquipmentCost += result.equipmentCost;
            totalMaterialCost += result.materialCost;
            totalTruckingCost += result.truckingCost;
            totalMobilizationCost += result.mobilizationCost;
            totalTruckHours += result.truckHours;
            totalActivityDays += result.duration;

            // Track HMA tonnage for plant opening fee check
            if (['paving_base', 'paving_surface'].includes(activity.activityType)) {
                const qtyData = activity.quantity;
                if (qtyData && qtyData._derivedQuantities?.tonsWithWaste) {
                    totalHMATons += qtyData._derivedQuantities.tonsWithWaste;
                }
            }
        }

        const directCostTotal = totalLaborCost + totalEquipmentCost + totalMaterialCost +
            totalTruckingCost + totalMobilizationCost;

        // ---- Phase 5: Clustering + Mobilization + Safety ----
        let clusterResults = null;
        if (estimate.clusterMode) {
            clusterResults = clusterize(
                activityResults,
                estimate.jobMode,
                estimate.travelHours
            );
            estimate.clusterResults = clusterResults;
        }

        // ---- Phase 6: Indirect costs (uses projectDuration from CPM) ----
        // Axiom 5: Time-dependent costs use concurrent schedule, not sum of durations.
        const laborCostForIndirect = totalLaborCost + totalEquipmentCost;
        const indirectResults = estimate.indirectCosts.calculate(
            directCostTotal,
            laborCostForIndirect,
            projectDuration
        );

        // ---- Phase 7: Confidence scoring ----
        const confidenceSnapshot = {
            activities: activityResults,
            jobMode: estimate.jobMode,
        };
        const confidenceScore = calculateConfidence(confidenceSnapshot);
        estimate.confidenceScore = confidenceScore;

        // ---- Phase 8: Unit cost reasonableness check ----
        const benchmarks = BENCHMARKS[estimate.jobMode] || BENCHMARKS.parking_lot;
        const unitChecks = activityResults
            .filter(a => a.duration > 0 && a.unitCost > 0)
            .map(a => {
                const bm = benchmarks[a.activityType];
                if (!bm) return null;
                let status = 'IN_RANGE';
                if (a.unitCost < bm.p25 * 0.5)       status = 'VERY_LOW';
                else if (a.unitCost < bm.p25)          status = 'LOW';
                else if (a.unitCost > bm.p75 * 1.5)   status = 'VERY_HIGH';
                else if (a.unitCost > bm.p75)          status = 'HIGH';
                return {
                    activityType: a.activityType,
                    description: a.description,
                    unitCost: a.unitCost,
                    unitCostUOM: a.unitCostUOM || 'SY',
                    p25: bm.p25,
                    median: bm.median,
                    p75: bm.p75,
                    n: bm.n,
                    basis: bm.basis,
                    unit: bm.unit || 'SY',
                    status,
                };
            })
            .filter(Boolean);

        // ---- Phase 9: Job analysis ----
        const analysisResults = generateAnalysis({
            activities: activityResults,
            jobMode: estimate.jobMode,
            clusterResults,
            scopeAssumptions: estimate.scopeAssumptions,
            totalHMATons,
        });
        estimate.analysisResults = analysisResults;

        // ---- Phase 10: Calendar duration ----
        const calendarDuration = calculateCalendarDuration(
            Object.fromEntries(scheduler.results),
            activityResults,
            estimate.weatherDays
        );
        estimate.calendarDuration = calendarDuration;

        // ---- Phase 11: Final totals ----
        const mobAndSafety = clusterResults ? clusterResults.totalMobAndSafety : 0;

        const results = {
            // Activity detail
            activities: activityResults,

            // Schedule
            projectDuration,
            totalActivityDays,
            criticalPath,
            ganttData,
            scheduleResults: Object.fromEntries(scheduler.results),

            // Cost aggregates
            totalLaborCost,
            totalEquipmentCost,
            totalMaterialCost,
            totalTruckingCost,
            totalMobilizationCost,
            totalTruckHours,
            directCostTotal,
            totalHMATons,

            // Mobilization & Safety (v4.0)
            clusterResults,
            mobAndSafety,

            // Indirect & markups
            ...indirectResults,

            // Confidence & Analysis (v4.0)
            confidenceScore,
            unitChecks,
            analysisResults,

            // Calendar (v4.0)
            calendarDuration,

            // Timestamp
            calculatedAt: new Date().toISOString()
        };

        // Store results on the estimate
        estimate.results = results;

        return results;
    }
}
