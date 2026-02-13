// ============================================
// Tier 1 — Work Activity
// The fundamental estimating object
// ============================================

import { CONSTANTS } from '../data/constants.js';

/**
 * Dependency relationship types (Tier 3.1)
 */
export const DependencyType = Object.freeze({
    FS: 'FS',   // Finish-to-Start (default, most common)
    SS: 'SS',   // Start-to-Start
    FF: 'FF',   // Finish-to-Finish
    SF: 'SF'    // Start-to-Finish (rare)
});

export const DependencySource = Object.freeze({
    PHYSICAL: 'physical',           // Inherent to the work (hard constraint)
    RESOURCE: 'resource',           // Imposed by resource scarcity (soft)
    PREFERENTIAL: 'preferential'    // Management decision (soft)
});

export class Activity {
    /**
     * @param {Object} params
     * @param {string} params.id - Unique activity ID (e.g., "EXC-001")
     * @param {string} params.description - Plain-language scope statement
     * @param {string} params.wbsCode - Position in WBS hierarchy (e.g., "01.01")
     * @param {string} params.activityType - Type key for defaults lookup
     * @param {import('./Quantity.js').Quantity} params.quantity - Measured scope
     * @param {import('./Crew.js').Crew} params.crew - Resource assembly
     * @param {import('./ProductionRate.js').ProductionRate} params.productionRate - Output rate
     * @param {import('./ProductivityFactor.js').ProductivityFactor} params.productivityFactor - Condition adjustments
     * @param {Array} [params.materialResources] - [{ resource: Resource, quantityPerOutputUnit: number }]
     * @param {Object} [params.mobilization] - { included: boolean, cost: number }
     * @param {Object} [params.trucking] - { cycleTime: number, truckCapacityUOMId, truckCapacity, efficiency }
     * @param {Array} [params.dependencies] - [{ predecessorId, type, lag, source }]
     * @param {string} [params.colorClass] - UI color class (e.g., "red", "blue")
     */
    constructor({
        id, description, wbsCode, activityType,
        quantity, crew, productionRate, productivityFactor,
        materialResources = [],
        mobilization = { included: false, cost: 0 },
        trucking = null,
        dependencies = [],
        colorClass = ''
    }) {
        this.id = id;
        this.description = description;
        this.wbsCode = wbsCode;
        this.activityType = activityType;
        this.quantity = quantity;
        this.crew = crew;
        this.productionRate = productionRate;
        this.productivityFactor = productivityFactor;
        this.materialResources = materialResources;
        this.mobilization = mobilization;
        this.trucking = trucking;
        this.dependencies = dependencies;
        this.colorClass = colorClass;

        // Calculated results (populated by Calculator)
        this._results = null;
    }

    // ---- Derived values (Tier 1.1 table) ----

    /**
     * Adjusted production rate = reference rate × composite productivity factor.
     */
    get adjustedProductionRate() {
        if (!this.productionRate) return 0;
        return this.productionRate.outputQty * this.productivityFactor.composite;
    }

    /**
     * Duration in days = grossQuantity / adjustedProductionRate.
     * Rubric: Duration = Quantity / (Adjusted Production Rate × Crew Count)
     * Here crew count is 1 (rate is already per crew).
     */
    get duration() {
        if (!this.adjustedProductionRate || !this.quantity) return 0;
        const raw = this.quantity.grossQuantity / this.adjustedProductionRate;
        // Round to nearest 0.5 day (matches current app behavior)
        return Math.ceil(raw * 2) / 2;
    }

    /**
     * Labor hours = duration × hours/day × crew headcount.
     */
    get laborHours() {
        return this.duration * CONSTANTS.WORKDAY_HOURS * this.crew.totalHeadcount;
    }

    /**
     * Labor cost = duration × crew labor cost per day.
     */
    get laborCost() {
        return this.duration * this.crew.laborCostPerDay(CONSTANTS.WORKDAY_HOURS);
    }

    /**
     * Equipment cost = duration × crew equipment cost per day.
     */
    get equipmentCost() {
        return this.duration * this.crew.equipmentCostPerDay(CONSTANTS.WORKDAY_HOURS);
    }

    /**
     * Material cost = sum of (grossQuantity × materialQuantityPerUnit × materialRate).
     */
    get materialCost() {
        let total = 0;
        for (const mr of this.materialResources) {
            total += this.quantity.grossQuantity * mr.quantityPerOutputUnit * mr.resource.costRate;
        }
        return total;
    }

    /**
     * Mobilization cost (if included and activity has work).
     */
    get mobilizationCost() {
        if (!this.mobilization.included || this.duration <= 0) return 0;
        return this.mobilization.cost;
    }

    // ---- Trucking calculations ----

    /**
     * Calculate trucking requirements.
     * Returns { trucks, truckHours, truckCost } or null if no trucking.
     */
    calculateTrucking(truckingRate = 0) {
        if (!this.trucking || !this.trucking.cycleTime || this.duration <= 0) {
            return { trucks: 0, truckHours: 0, truckCost: 0 };
        }

        const t = this.trucking;
        const totalQuantity = this.quantity.grossQuantity;
        const dailyQuantity = totalQuantity / this.duration;

        // Loads per day based on truck capacity
        const loadsPerDay = dailyQuantity / t.truckCapacity;

        // Trucks needed = (loads × cycle time) / (workday minutes × efficiency)
        const efficiency = t.efficiency || 0.90;
        const trucks = Math.ceil((loadsPerDay * t.cycleTime) / (CONSTANTS.WORKDAY_MINUTES * efficiency));

        // Truck hours = trucks × days × hours/day
        const truckHours = Math.ceil(trucks * this.duration * CONSTANTS.WORKDAY_HOURS);

        // Truck cost
        const truckCost = truckHours * truckingRate;

        return { trucks, truckHours, truckCost, loadsPerDay, dailyQuantity };
    }

    /**
     * Total direct cost for this activity.
     * Rubric Axiom 1: Every cost derives from quantity × rate × time.
     */
    get directCost() {
        return this.laborCost + this.equipmentCost + this.materialCost + this.mobilizationCost;
    }

    /**
     * Full derivation trace for auditability (Tier 6.3).
     */
    get derivation() {
        return {
            adjustedProductionRate: {
                formula: 'productionRate × productivityFactor.composite',
                values: {
                    productionRate: this.productionRate?.outputQty,
                    productivityComposite: this.productivityFactor?.composite
                },
                result: this.adjustedProductionRate
            },
            duration: {
                formula: 'grossQuantity / adjustedProductionRate (rounded to 0.5)',
                values: {
                    grossQuantity: this.quantity?.grossQuantity,
                    adjustedProductionRate: this.adjustedProductionRate
                },
                result: this.duration
            },
            laborCost: {
                formula: 'duration × crewCostPerDay',
                values: {
                    duration: this.duration,
                    crewCostPerDay: this.crew?.costPerDay(CONSTANTS.WORKDAY_HOURS)
                },
                result: this.laborCost
            },
            materialCost: {
                formula: 'Σ(grossQuantity × qtyPerUnit × unitRate)',
                items: this.materialResources.map(mr => ({
                    material: mr.resource.name,
                    grossQty: this.quantity?.grossQuantity,
                    qtyPerUnit: mr.quantityPerOutputUnit,
                    rate: mr.resource.costRate,
                    subtotal: (this.quantity?.grossQuantity || 0) * mr.quantityPerOutputUnit * mr.resource.costRate
                })),
                result: this.materialCost
            }
        };
    }

    toJSON() {
        return {
            id: this.id,
            description: this.description,
            wbsCode: this.wbsCode,
            activityType: this.activityType,
            quantity: this.quantity?.toJSON(),
            crew: this.crew?.toJSON(),
            productionRate: this.productionRate?.toJSON(),
            productivityFactor: this.productivityFactor?.toJSON(),
            materialResources: this.materialResources.map(mr => ({
                resourceId: mr.resource.id,
                quantityPerOutputUnit: mr.quantityPerOutputUnit
            })),
            mobilization: this.mobilization,
            trucking: this.trucking,
            dependencies: this.dependencies,
            colorClass: this.colorClass
        };
    }
}
