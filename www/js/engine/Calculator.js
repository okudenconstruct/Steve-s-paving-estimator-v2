// ============================================
// Calculation Engine
// Bottom-up cost derivation with schedule integration
// Tier 6.2 — Full recalculation propagation
// ============================================

import { Scheduler } from './Scheduler.js';

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

        // ---- Phase 1: Activity-level calculations ----
        // Each activity self-calculates its derived values from its primitives.
        // (The Activity class getters handle this via quantity, crew, rate, productivity.)
        // We just need to calculate trucking (which depends on external trucking rate).
        const truckingResults = new Map();
        for (const activity of activities) {
            truckingResults.set(activity.id, activity.calculateTrucking(truckingRate));
        }

        // ---- Phase 2: Schedule (CPM) ----
        // Axiom 4: Project duration derived from CPM, never assumed.
        const scheduler = new Scheduler(activities);
        scheduler.run();

        const projectDuration = scheduler.projectDuration;
        const criticalPath = scheduler.criticalPath;
        const ganttData = scheduler.getGanttData();

        // ---- Phase 3: Aggregate costs ----
        let totalLaborCost = 0;
        let totalEquipmentCost = 0;
        let totalMaterialCost = 0;
        let totalTruckingCost = 0;
        let totalMobilizationCost = 0;
        let totalTruckHours = 0;
        let totalActivityDays = 0;

        const activityResults = [];

        for (const activity of activities) {
            const trk = truckingResults.get(activity.id);

            const result = {
                id: activity.id,
                description: activity.description,
                activityType: activity.activityType,
                wbsCode: activity.wbsCode,
                colorClass: activity.colorClass,

                // Quantity
                netQuantity: activity.quantity?.netQuantity || 0,
                grossQuantity: activity.quantity?.grossQuantity || 0,
                quantityUOM: activity.quantity?.uomId || '',

                // Production
                referenceRate: activity.productionRate?.outputQty || 0,
                productivityFactor: activity.productivityFactor?.composite || 1,
                adjustedRate: activity.adjustedProductionRate,
                duration: activity.duration,

                // Crew
                crewSize: activity.crew?.totalHeadcount || 0,
                crewHourlyCost: activity.crew?.hourlyCost || 0,

                // Costs
                laborCost: activity.laborCost,
                equipmentCost: activity.equipmentCost,
                materialCost: activity.materialCost,
                mobilizationCost: activity.mobilizationCost,
                truckingCost: trk.truckCost,
                directCost: activity.directCost + trk.truckCost,

                // Trucking detail
                trucks: trk.trucks,
                truckHours: trk.truckHours,

                // Schedule
                earlyStart: scheduler.results.get(activity.id)?.earlyStart || 0,
                earlyFinish: scheduler.results.get(activity.id)?.earlyFinish || 0,
                totalFloat: scheduler.results.get(activity.id)?.totalFloat || 0,
                isCritical: criticalPath.includes(activity.id),

                // Labor hours
                laborHours: activity.laborHours
            };

            activityResults.push(result);

            totalLaborCost += result.laborCost;
            totalEquipmentCost += result.equipmentCost;
            totalMaterialCost += result.materialCost;
            totalTruckingCost += result.truckingCost;
            totalMobilizationCost += result.mobilizationCost;
            totalTruckHours += result.truckHours;
            totalActivityDays += result.duration;
        }

        const directCostTotal = totalLaborCost + totalEquipmentCost + totalMaterialCost +
            totalTruckingCost + totalMobilizationCost;

        // ---- Phase 4: Indirect costs (uses projectDuration from CPM) ----
        // Axiom 5: Time-dependent costs use concurrent schedule, not sum of durations.
        const laborCostForIndirect = totalLaborCost + totalEquipmentCost; // crew costs
        const indirectResults = estimate.indirectCosts.calculate(
            directCostTotal,
            laborCostForIndirect,
            projectDuration
        );

        // ---- Phase 5: Final totals ----
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

            // Indirect & markups
            ...indirectResults,

            // Timestamp
            calculatedAt: new Date().toISOString()
        };

        // Store results on the estimate
        estimate.results = results;

        return results;
    }
}
