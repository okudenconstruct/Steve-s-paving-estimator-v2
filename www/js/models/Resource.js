// ============================================
// Tier 0.1 — Resource Unit
// The singular entity that performs or enables work
// ============================================

export const ResourceType = Object.freeze({
    LABOR: 'labor',
    EQUIPMENT: 'equipment',
    MATERIAL: 'material',
    SUBCONTRACT: 'subcontract'
});

// Production rate source hierarchy (Tier 0.2)
export const SourceRank = Object.freeze({
    COMPANY_HISTORICAL: 1,
    PUBLISHED_DATABASE: 2,
    MANUFACTURER_DATA: 3,
    FIRST_PRINCIPLES: 4,
    ANALOGOUS: 5
});

export class Resource {
    /**
     * @param {Object} params
     * @param {string} params.id - Unique identifier (e.g., "L-001")
     * @param {string} params.name - Display name (e.g., "Paver Operator")
     * @param {string} params.type - ResourceType enum value
     * @param {string} params.unitId - UOM id for cost rate (e.g., "HR", "TON")
     * @param {number} params.costRate - Cost per unit (fully burdened for labor)
     * @param {Object} [params.costStructure] - Breakdown of costRate
     * @param {string} [params.source] - Source of cost data
     * @param {number} [params.sourceRank] - SourceRank enum value
     */
    constructor({ id, name, type, unitId, costRate, costStructure = null, source = '', sourceRank = SourceRank.COMPANY_HISTORICAL }) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.unitId = unitId;
        this.costRate = costRate;
        this.costStructure = costStructure;
        this.source = source;
        this.sourceRank = sourceRank;
    }

    /**
     * Create a copy with optional overrides.
     * Override tracking: returns an object with isOverride flag.
     */
    withOverride(overrides, reason = '') {
        const overridden = new Resource({ ...this, ...overrides });
        overridden._isOverride = true;
        overridden._overrideReason = reason;
        overridden._originalRate = this.costRate;
        return overridden;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            unitId: this.unitId,
            costRate: this.costRate,
            costStructure: this.costStructure,
            source: this.source,
            sourceRank: this.sourceRank
        };
    }

    static fromJSON(data) {
        return new Resource(data);
    }
}
