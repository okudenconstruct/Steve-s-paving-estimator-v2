// ============================================
// Tier 5.1 — Risk Register
// Identified risks with probability and impact
// ============================================

export const RiskType = Object.freeze({
    SCOPE: 'scope',
    PRODUCTION: 'production',
    PRICING: 'pricing',
    SCHEDULE: 'schedule',
    EXTERNAL: 'external'
});

export class RiskItem {
    /**
     * @param {Object} params
     * @param {string} params.id - Unique ID
     * @param {string} params.description - Risk description
     * @param {number} params.probability - 0.0 to 1.0
     * @param {number} params.impactMin - $ minimum impact
     * @param {number} params.impactMostLikely - $ most likely impact
     * @param {number} params.impactMax - $ maximum impact
     * @param {string[]} [params.affectedWBS] - WBS codes affected
     * @param {string} [params.riskType] - RiskType value
     */
    constructor({ id, description, probability, impactMin, impactMostLikely, impactMax, affectedWBS = [], riskType = RiskType.SCOPE }) {
        this.id = id;
        this.description = description;
        this.probability = probability;
        this.impactMin = impactMin;
        this.impactMostLikely = impactMostLikely;
        this.impactMax = impactMax;
        this.affectedWBS = affectedWBS;
        this.riskType = riskType;
    }

    /**
     * Expected value = probability × most likely impact.
     */
    get expectedValue() {
        return this.probability * this.impactMostLikely;
    }

    toJSON() {
        return { ...this };
    }

    static fromJSON(data) {
        return new RiskItem(data);
    }
}

export class RiskRegister {
    constructor(risks = []) {
        this.risks = risks;
    }

    addRisk(risk) {
        this.risks.push(risk);
    }

    removeRisk(id) {
        this.risks = this.risks.filter(r => r.id !== id);
    }

    /**
     * Total expected value of all identified risks.
     */
    get totalExpectedValue() {
        return this.risks.reduce((sum, r) => sum + r.expectedValue, 0);
    }

    /**
     * Risks grouped by type.
     */
    get byType() {
        const grouped = {};
        for (const r of this.risks) {
            if (!grouped[r.riskType]) grouped[r.riskType] = [];
            grouped[r.riskType].push(r);
        }
        return grouped;
    }

    toJSON() {
        return { risks: this.risks.map(r => r.toJSON()) };
    }

    static fromJSON(data) {
        return new RiskRegister((data.risks || []).map(r => RiskItem.fromJSON(r)));
    }
}
