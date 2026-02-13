// ============================================
// Top-Level Estimate Container
// Version-tracked project estimate with all tiers
// ============================================

import { TimeUnit } from './TimeUnit.js';
import { IndirectCosts } from './IndirectCosts.js';
import { RiskRegister } from './RiskRegister.js';

export class Estimate {
    /**
     * @param {Object} params
     * @param {string} [params.id] - Unique estimate ID
     * @param {string} [params.projectName] - Project name
     * @param {number} [params.version] - Revision number
     * @param {import('./Activity.js').Activity[]} [params.activities] - All activities
     * @param {import('./WorkPackage.js').WorkPackage[]} [params.workPackages] - WBS groupings
     * @param {TimeUnit} [params.timeUnit] - Work calendar config
     * @param {IndirectCosts} [params.indirectCosts] - Tier 4 costs
     * @param {RiskRegister} [params.riskRegister] - Tier 5 risks
     * @param {Object} [params.projectSettings] - Global settings
     * @param {Object} [params.rateLibrary] - Resource/rate library references
     */
    constructor({
        id = null,
        projectName = '',
        version = 1,
        activities = [],
        workPackages = [],
        timeUnit = new TimeUnit(),
        indirectCosts = new IndirectCosts(),
        riskRegister = new RiskRegister(),
        projectSettings = {},
        rateLibrary = {}
    } = {}) {
        this.id = id || this._generateId();
        this.projectName = projectName;
        this.version = version;
        this.createdAt = new Date().toISOString();
        this.lastModified = this.createdAt;
        this.revisionHistory = [];

        this.activities = activities;
        this.workPackages = workPackages;
        this.timeUnit = timeUnit;
        this.indirectCosts = indirectCosts;
        this.riskRegister = riskRegister;
        this.projectSettings = projectSettings;
        this.rateLibrary = rateLibrary;

        // Calculated results (populated by Calculator)
        this.results = null;
    }

    _generateId() {
        return 'est_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    // ---- Activity access ----

    /**
     * Get all activities across all work packages, or standalone activities.
     */
    get allActivities() {
        return this.activities;
    }

    /**
     * Find activity by ID.
     */
    getActivity(id) {
        return this.activities.find(a => a.id === id) || null;
    }

    // ---- Aggregate cost getters (from activity-level calculations) ----

    get totalDirectCost() {
        return this.activities.reduce((sum, a) => sum + a.directCost, 0);
    }

    get totalLaborCost() {
        return this.activities.reduce((sum, a) => sum + a.laborCost, 0);
    }

    get totalEquipmentCost() {
        return this.activities.reduce((sum, a) => sum + a.equipmentCost, 0);
    }

    get totalMaterialCost() {
        return this.activities.reduce((sum, a) => sum + a.materialCost, 0);
    }

    get totalMobilizationCost() {
        return this.activities.reduce((sum, a) => sum + a.mobilizationCost, 0);
    }

    /**
     * Sum of all activity durations (NOT project duration).
     * Project duration comes from scheduler (Axiom 4).
     */
    get totalActivityDays() {
        return this.activities.reduce((sum, a) => sum + a.duration, 0);
    }

    // ---- Confidence / Completeness ----

    /**
     * Estimate completeness: what fraction of expected paving activities have work?
     */
    get completeness() {
        const expectedTypes = ['excavation', 'fine_grading', 'dga_base', 'milling', 'paving_base', 'paving_surface', 'tack_coat'];
        const present = expectedTypes.filter(type =>
            this.activities.some(a => a.activityType === type && a.duration > 0)
        );
        return { present: present.length, expected: expectedTypes.length, types: present };
    }

    /**
     * Get confidence level description.
     */
    get confidenceLevel() {
        const cls = this.indirectCosts.contingency.estimateClass;
        return cls ? cls.label : 'Not specified';
    }

    toJSON() {
        return {
            id: this.id,
            projectName: this.projectName,
            version: this.version,
            createdAt: this.createdAt,
            lastModified: this.lastModified,
            revisionHistory: this.revisionHistory,
            activities: this.activities.map(a => a.toJSON()),
            workPackages: this.workPackages.map(wp => wp.toJSON()),
            timeUnit: this.timeUnit.toJSON(),
            indirectCosts: this.indirectCosts.toJSON(),
            riskRegister: this.riskRegister.toJSON(),
            projectSettings: this.projectSettings,
            rateLibrary: this.rateLibrary
        };
    }
}
