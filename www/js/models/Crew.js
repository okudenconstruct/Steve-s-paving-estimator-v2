// ============================================
// Tier 1.3 — Crew Composition
// Named, reusable resource assembly
// ============================================

export class Crew {
    /**
     * @param {Object} params
     * @param {string} params.id - Unique crew ID (e.g., "C-EXC-01")
     * @param {string} params.name - Display name (e.g., "Excavation Crew")
     * @param {Array} [params.laborComponents] - [{ resource: Resource, count: number }]
     * @param {Array} [params.equipmentComponents] - [{ resource: Resource, count: number }]
     * @param {number} [params.compositeRate] - Shortcut: single $/hr for entire crew (backward compat)
     */
    constructor({ id, name, laborComponents = [], equipmentComponents = [], compositeRate = null }) {
        this.id = id;
        this.name = name;
        this.laborComponents = laborComponents;
        this.equipmentComponents = equipmentComponents;
        this._compositeRate = compositeRate;
    }

    /**
     * Whether this crew uses detailed component breakdown or a simple composite rate.
     */
    get isDetailed() {
        return this.laborComponents.length > 0 || this.equipmentComponents.length > 0;
    }

    /**
     * Total hourly cost of all labor components.
     */
    get laborCostPerHour() {
        if (!this.isDetailed) return this._compositeRate || 0;
        return this.laborComponents.reduce((sum, lc) => sum + (lc.resource.costRate * lc.count), 0);
    }

    /**
     * Total hourly cost of all equipment components.
     */
    get equipmentCostPerHour() {
        if (!this.isDetailed) return 0;
        return this.equipmentComponents.reduce((sum, ec) => sum + (ec.resource.costRate * ec.count), 0);
    }

    /**
     * Total hourly cost (labor + equipment).
     */
    get hourlyCost() {
        if (!this.isDetailed && this._compositeRate !== null) {
            return this._compositeRate;
        }
        return this.laborCostPerHour + this.equipmentCostPerHour;
    }

    /**
     * Cost per day (uses 8-hour default; override with TimeUnit for non-standard shifts).
     */
    costPerDay(hoursPerDay = 8) {
        return this.hourlyCost * hoursPerDay;
    }

    /**
     * Labor cost per day.
     */
    laborCostPerDay(hoursPerDay = 8) {
        return this.laborCostPerHour * hoursPerDay;
    }

    /**
     * Equipment cost per day.
     */
    equipmentCostPerDay(hoursPerDay = 8) {
        return this.equipmentCostPerHour * hoursPerDay;
    }

    /**
     * Total headcount (labor only).
     */
    get totalHeadcount() {
        if (!this.isDetailed) return this._headcount || 1;
        return this.laborComponents.reduce((sum, lc) => sum + lc.count, 0);
    }

    /**
     * Set headcount for simple (non-detailed) crews.
     */
    set headcount(val) {
        this._headcount = val;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            laborComponents: this.laborComponents.map(lc => ({
                resourceId: lc.resource.id,
                count: lc.count
            })),
            equipmentComponents: this.equipmentComponents.map(ec => ({
                resourceId: ec.resource.id,
                count: ec.count
            })),
            compositeRate: this._compositeRate,
            headcount: this._headcount
        };
    }

    /**
     * Create a simple crew from a composite rate and headcount.
     * Backward-compatible with current app's single-rate approach.
     */
    static fromComposite(id, name, compositeRate, headcount) {
        const crew = new Crew({ id, name, compositeRate });
        crew._headcount = headcount;
        return crew;
    }
}
