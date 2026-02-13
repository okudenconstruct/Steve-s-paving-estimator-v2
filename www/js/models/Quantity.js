// ============================================
// Tier 0.3 — Quantity
// Measured scope of work with waste/contingency
// ============================================

export class Quantity {
    /**
     * @param {Object} params
     * @param {number} params.netQuantity - In-place quantity from takeoff
     * @param {string} params.uomId - Unit of measure ID
     * @param {number} [params.wasteFactor=1.0] - Waste/overrun multiplier (e.g., 1.07 for 7%)
     * @param {number} [params.designContingency=1.0] - Design contingency multiplier
     * @param {string} [params.method] - Derivation method (e.g., "area×depth÷324")
     * @param {Object} [params.inputs] - Raw inputs used to derive netQuantity
     */
    constructor({ netQuantity, uomId, wasteFactor = 1.0, designContingency = 1.0, method = '', inputs = {} }) {
        this.netQuantity = netQuantity;
        this.uomId = uomId;
        this.wasteFactor = wasteFactor;
        this.designContingency = designContingency;
        this.method = method;
        this.inputs = inputs;
    }

    /**
     * Gross quantity = net × waste × design contingency
     */
    get grossQuantity() {
        return this.netQuantity * this.wasteFactor * this.designContingency;
    }

    /**
     * Derivation trace for auditability (Tier 6.3)
     */
    get derivation() {
        return {
            formula: 'netQuantity × wasteFactor × designContingency',
            values: {
                netQuantity: this.netQuantity,
                wasteFactor: this.wasteFactor,
                designContingency: this.designContingency
            },
            result: this.grossQuantity,
            method: this.method,
            inputs: this.inputs
        };
    }

    toJSON() {
        return {
            netQuantity: this.netQuantity,
            uomId: this.uomId,
            wasteFactor: this.wasteFactor,
            designContingency: this.designContingency,
            method: this.method,
            inputs: this.inputs
        };
    }

    static fromJSON(data) {
        return new Quantity(data);
    }
}
