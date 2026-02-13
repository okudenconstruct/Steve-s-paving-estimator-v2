// ============================================
// Tier 2 — Work Package & WBS Aggregation
// Hierarchical grouping of activities
// ============================================

export class WorkPackage {
    /**
     * @param {Object} params
     * @param {string} params.id - Unique identifier
     * @param {string} params.name - Display name (e.g., "Earthwork")
     * @param {string} params.wbsCode - WBS code (e.g., "01")
     * @param {import('./Activity.js').Activity[]} [params.activities] - Child activities
     * @param {string[]} [params.inclusions] - Explicit scope inclusions
     * @param {string[]} [params.exclusions] - Explicit scope exclusions
     * @param {string[]} [params.interfaces] - Hand-off points with other packages
     * @param {string[]} [params.assumptions] - Conditions under which estimate is valid
     */
    constructor({
        id, name, wbsCode,
        activities = [],
        inclusions = [],
        exclusions = [],
        interfaces = [],
        assumptions = []
    }) {
        this.id = id;
        this.name = name;
        this.wbsCode = wbsCode;
        this.activities = activities;
        this.inclusions = inclusions;
        this.exclusions = exclusions;
        this.interfaces = interfaces;
        this.assumptions = assumptions;
    }

    /**
     * Direct cost = sum of all activity direct costs.
     */
    get directCost() {
        return this.activities.reduce((sum, a) => sum + a.directCost, 0);
    }

    /**
     * Labor cost subtotal.
     */
    get laborCost() {
        return this.activities.reduce((sum, a) => sum + a.laborCost, 0);
    }

    /**
     * Equipment cost subtotal.
     */
    get equipmentCost() {
        return this.activities.reduce((sum, a) => sum + a.equipmentCost, 0);
    }

    /**
     * Material cost subtotal.
     */
    get materialCost() {
        return this.activities.reduce((sum, a) => sum + a.materialCost, 0);
    }

    /**
     * Sum of activity durations (NOT project duration — that comes from scheduler).
     */
    get totalActivityDays() {
        return this.activities.reduce((sum, a) => sum + a.duration, 0);
    }

    /**
     * Check if this package has any estimated activities.
     */
    get hasWork() {
        return this.activities.some(a => a.duration > 0);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            wbsCode: this.wbsCode,
            activityIds: this.activities.map(a => a.id),
            inclusions: this.inclusions,
            exclusions: this.exclusions,
            interfaces: this.interfaces,
            assumptions: this.assumptions
        };
    }
}
