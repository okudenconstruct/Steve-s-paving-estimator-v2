// ============================================
// Tier 4 — Indirect Costs, Markups, Project-Level Economics
// ============================================

/**
 * AACE Estimate Classification (Tier 4.3)
 */
export const EstimateClass = Object.freeze({
    CLASS_5: { id: 5, label: 'Class 5 — Conceptual', contingencyRange: [0.30, 1.00], defaultContingency: 0.50 },
    CLASS_4: { id: 4, label: 'Class 4 — Schematic', contingencyRange: [0.20, 0.50], defaultContingency: 0.30 },
    CLASS_3: { id: 3, label: 'Class 3 — Design Development', contingencyRange: [0.10, 0.30], defaultContingency: 0.15 },
    CLASS_2: { id: 2, label: 'Class 2 — Detailed', contingencyRange: [0.05, 0.20], defaultContingency: 0.10 },
    CLASS_1: { id: 1, label: 'Class 1 — Check/Bid', contingencyRange: [0.03, 0.10], defaultContingency: 0.05 }
});

export class IndirectCosts {
    constructor({
        // General conditions (4.1.1)
        generalConditions = {
            superintendentPerDay: 0,
            fieldOfficePerDay: 0,
            tempFacilitiesPerDay: 0,
            tempConstructionLump: 0,
            tempConstructionPerDay: 0,
            smallToolsPct: 0,          // % of labor cost
            safetyPpePct: 0,           // % of labor cost
            qcTestingLump: 0,
            cleanupLump: 0
        },
        // Home office overhead (4.1.2)
        homeOfficeOverheadPct = 0,     // % of field cost (direct + GC)
        // Fee / Profit (4.1.3)
        feeProfitPct = 15,             // % (backward compat with current markup%)
        // Escalation (4.2)
        escalation = {
            enabled: false,
            laborRatePerYear: 0,       // % per year
            materialRatePerYear: 0,    // % per year
            timePhased: false
        },
        // Bonds & Insurance (4.4)
        bondsInsurance = {
            bondRatePct: 0,            // % of contract value
            glInsurancePct: 0,         // % of labor cost
            wcRatePct: 0,              // % of labor cost
            permitFeesLump: 0,
            prevailingWageLump: 0
        },
        // Contingency (4.3)
        contingency = {
            estimateClass: EstimateClass.CLASS_3,
            identifiedRisksTotal: 0,        // from Risk Register
            unidentifiedAllowancePct: 0.10, // % of subtotal before contingency
            manualOverride: null            // if set, overrides calculated
        }
    } = {}) {
        this.generalConditions = generalConditions;
        this.homeOfficeOverheadPct = homeOfficeOverheadPct;
        this.feeProfitPct = feeProfitPct;
        this.escalation = escalation;
        this.bondsInsurance = bondsInsurance;
        this.contingency = contingency;
    }

    /**
     * Calculate all indirect cost amounts.
     * @param {number} directCost - Total direct cost
     * @param {number} laborCost - Total labor cost
     * @param {number} projectDurationDays - CPM-derived project duration
     * @returns {Object} Calculated cost breakdown
     */
    calculate(directCost, laborCost, projectDurationDays) {
        const gc = this.generalConditions;

        // General Conditions: time-dependent items use project duration (Axiom 5)
        const gcTimeDep = (gc.superintendentPerDay + gc.fieldOfficePerDay +
            gc.tempFacilitiesPerDay + gc.tempConstructionPerDay) * projectDurationDays;
        const gcFixed = gc.tempConstructionLump + gc.qcTestingLump + gc.cleanupLump;
        const gcPctBased = laborCost * (gc.smallToolsPct / 100 + gc.safetyPpePct / 100);
        const gcTotal = gcTimeDep + gcFixed + gcPctBased;

        // Total field cost
        const totalFieldCost = directCost + gcTotal;

        // Home office overhead
        const homeOfficeOverhead = totalFieldCost * (this.homeOfficeOverheadPct / 100);

        // Fee / Profit
        const feeProfit = (totalFieldCost + homeOfficeOverhead) * (this.feeProfitPct / 100);

        // Escalation (simplified: flat %, not time-phased unless enabled)
        let escalationAmount = 0;
        if (this.escalation.enabled) {
            const projectDurationYears = projectDurationDays / 260; // ~260 work days/year
            const laborEsc = laborCost * (this.escalation.laborRatePerYear / 100) * projectDurationYears;
            const materialEsc = (directCost - laborCost) * (this.escalation.materialRatePerYear / 100) * projectDurationYears;
            escalationAmount = laborEsc + materialEsc;
        }

        // Bonds & Insurance
        const bi = this.bondsInsurance;
        const subtotalForBonds = totalFieldCost + homeOfficeOverhead + feeProfit + escalationAmount;
        const bondsCost = subtotalForBonds * (bi.bondRatePct / 100);
        const insuranceCost = laborCost * (bi.glInsurancePct / 100 + bi.wcRatePct / 100);
        const regulatoryCost = bi.permitFeesLump + bi.prevailingWageLump;
        const biTotal = bondsCost + insuranceCost + regulatoryCost;

        // Subtotal before contingency
        const subtotalBeforeContingency = totalFieldCost + homeOfficeOverhead + feeProfit +
            escalationAmount + biTotal;

        // Contingency
        const ct = this.contingency;
        const unidentifiedAllowance = subtotalBeforeContingency * ct.unidentifiedAllowancePct;
        const totalContingency = ct.manualOverride !== null ?
            ct.manualOverride :
            ct.identifiedRisksTotal + unidentifiedAllowance;

        // Total estimated cost
        const totalEstimatedCost = subtotalBeforeContingency + totalContingency;

        return {
            // General conditions breakdown
            gcTimeDep,
            gcFixed,
            gcPctBased,
            gcTotal,

            // Summary
            totalFieldCost,
            homeOfficeOverhead,
            feeProfit,
            escalationAmount,
            bondsCost,
            insuranceCost,
            regulatoryCost,
            biTotal,
            subtotalBeforeContingency,
            identifiedRisks: ct.identifiedRisksTotal,
            unidentifiedAllowance,
            totalContingency,
            totalEstimatedCost
        };
    }

    toJSON() {
        return {
            generalConditions: { ...this.generalConditions },
            homeOfficeOverheadPct: this.homeOfficeOverheadPct,
            feeProfitPct: this.feeProfitPct,
            escalation: { ...this.escalation },
            bondsInsurance: { ...this.bondsInsurance },
            contingency: {
                estimateClassId: this.contingency.estimateClass.id,
                identifiedRisksTotal: this.contingency.identifiedRisksTotal,
                unidentifiedAllowancePct: this.contingency.unidentifiedAllowancePct,
                manualOverride: this.contingency.manualOverride
            }
        };
    }

    static fromJSON(data) {
        // Resolve estimate class from id
        const classMap = { 5: EstimateClass.CLASS_5, 4: EstimateClass.CLASS_4, 3: EstimateClass.CLASS_3, 2: EstimateClass.CLASS_2, 1: EstimateClass.CLASS_1 };
        if (data.contingency?.estimateClassId) {
            data.contingency.estimateClass = classMap[data.contingency.estimateClassId] || EstimateClass.CLASS_3;
        }
        return new IndirectCosts(data);
    }
}
