// ============================================
// Tier 0.2 — Production Rate
// Empirically-derived output per crew per time unit
// ============================================

import { SourceRank } from './Resource.js';

export class ProductionRate {
    /**
     * @param {Object} params
     * @param {string} params.id - Unique identifier
     * @param {string} params.activityType - Activity type key (e.g., "excavation")
     * @param {number} params.outputQty - Output quantity (e.g., 600)
     * @param {string} params.outputUOMId - UOM id of output (e.g., "CY", "SY")
     * @param {number} [params.perResourceCount=1] - Per how many crews/resources
     * @param {string} [params.perTimeUnitId="DAY"] - Time unit for rate
     * @param {Object} [params.referenceConditions] - Baseline conditions
     * @param {string} [params.source] - Source citation
     * @param {number} [params.sourceRank] - SourceRank value
     * @param {number} [params.rangeMin] - Low end of range (for Monte Carlo)
     * @param {number} [params.rangeMax] - High end of range (for Monte Carlo)
     */
    constructor({
        id, activityType, outputQty, outputUOMId,
        perResourceCount = 1, perTimeUnitId = 'DAY',
        referenceConditions = {}, source = '', sourceRank = SourceRank.PUBLISHED_DATABASE,
        rangeMin = null, rangeMax = null
    }) {
        this.id = id;
        this.activityType = activityType;
        this.outputQty = outputQty;
        this.outputUOMId = outputUOMId;
        this.perResourceCount = perResourceCount;
        this.perTimeUnitId = perTimeUnitId;
        this.referenceConditions = referenceConditions;
        this.source = source;
        this.sourceRank = sourceRank;
        this.rangeMin = rangeMin;
        this.rangeMax = rangeMax;
    }

    /**
     * Get the rate label for display (e.g., "600 CY/day")
     */
    get label() {
        return `${this.outputQty} ${this.outputUOMId}/${this.perTimeUnitId}`;
    }

    toJSON() {
        return { ...this };
    }

    static fromJSON(data) {
        return new ProductionRate(data);
    }
}
