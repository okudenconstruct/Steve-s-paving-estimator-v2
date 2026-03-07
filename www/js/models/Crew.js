// ============================================
// Tier 1.3 — Crew Composition
// Named, reusable resource assembly
// ============================================

import { Resource, ResourceType, SourceRank } from './Resource.js';

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

    /**
     * Create a crew from a CREW_DATA entry.
     * @param {string} code - Crew code (e.g., "PV8")
     * @param {Object} crewData - { rate, people, desc }
     */
    static fromCrewData(code, crewData) {
        const crew = new Crew({
            id: `C-${code}`,
            name: crewData.desc,
            compositeRate: crewData.rate,
        });
        crew._headcount = crewData.people;
        return crew;
    }

    /**
     * Create a detailed crew from a CREW_COMPOSITIONS entry.
     * Populates laborComponents and equipmentComponents with Resource objects,
     * enabling the labor/equipment cost split.
     *
     * @param {string} code - Crew code (e.g., "PV8")
     * @param {Object} comp - CREW_COMPOSITIONS entry
     * @returns {Crew}
     */
    static fromDetailedData(code, comp) {
        const laborComponents = comp.laborComponents.map((lc, i) => ({
            resource: new Resource({
                id: `L-${code}-${i}`,
                name: lc.name,
                type: ResourceType.LABOR,
                unitId: 'HR',
                costRate: lc.rate,
                source: comp.source || '',
                sourceRank: comp.sourceRank || SourceRank.FIRST_PRINCIPLES,
            }),
            count: lc.count,
        }));

        const equipmentComponents = comp.equipmentComponents.map((ec, i) => ({
            resource: new Resource({
                id: ec.code || `E-${code}-${i}`,
                name: ec.name,
                type: ResourceType.EQUIPMENT,
                unitId: 'HR',
                costRate: ec.rate,
                source: comp.source || '',
                sourceRank: comp.sourceRank || SourceRank.FIRST_PRINCIPLES,
            }),
            count: ec.count,
        }));

        const crew = new Crew({
            id: `C-${code}`,
            name: comp.description,
            laborComponents,
            equipmentComponents,
        });
        crew._headcount = comp.people;
        return crew;
    }

    /**
     * Auto-select crew based on job size (SY) and activity type.
     * Prefers detailed compositions when available (for labor/equipment split).
     *
     * @param {number} totalSY - Total job size in SY
     * @param {string} activityType - Activity type key
     * @param {Object} thresholds - CREW_THRESHOLDS
     * @param {Object} crewData - CREW_DATA (composite rates)
     * @param {Object} [compositions] - CREW_COMPOSITIONS (detailed breakdowns)
     * @returns {{ code: string, crew: Crew } | null}
     */
    static autoSelect(totalSY, activityType, thresholds, crewData, compositions = null) {
        const tiers = thresholds[activityType] || thresholds.paving;
        if (!tiers) return null;

        for (const tier of tiers) {
            if (totalSY <= tier.maxSY) {
                // Prefer detailed composition if available
                if (compositions && compositions[tier.crew]) {
                    return {
                        code: tier.crew,
                        crew: Crew.fromDetailedData(tier.crew, compositions[tier.crew]),
                    };
                }
                // Fallback to composite rate
                const data = crewData[tier.crew];
                if (data) {
                    return {
                        code: tier.crew,
                        crew: Crew.fromCrewData(tier.crew, data),
                    };
                }
            }
        }
        return null;
    }

    /**
     * Detect if COMBO crew should be used (mill + pave both active).
     * @param {Set<string>} activeTypes - Set of active activity types
     * @returns {boolean}
     */
    static detectCombo(activeTypes) {
        return activeTypes.has('milling') &&
            (activeTypes.has('paving_base') || activeTypes.has('paving_surface'));
    }
}
