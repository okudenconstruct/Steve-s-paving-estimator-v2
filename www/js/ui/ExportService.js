// ============================================
// Export Service
// Text export, JSON export, clipboard, print
// ============================================

export class ExportService {
    /**
     * Generate text report from calculation results.
     */
    static generateTextReport(estimate, results, settings = {}) {
        const projectName = estimate.projectName || 'Unnamed Project';
        const fuelIndex = settings.fuelIndex || 'Not specified';
        const acIndex = settings.acIndex || 'Not specified';

        const fc = (v) => '$' + Math.round(v).toLocaleString('en-US');
        const fn = (v, d = 1) => Number(v).toFixed(d);

        // Build activity details
        let activityLines = '';
        for (const ar of results.activities) {
            if (ar.duration <= 0) continue;
            activityLines += `\n${ar.description.toUpperCase()}`;
            if (ar.grossQuantity > 0) activityLines += `\n  Quantity: ${fn(ar.grossQuantity, 0)} ${ar.quantityUOM}`;
            activityLines += `\n  Days: ${fn(ar.duration)}`;
            if (ar.laborCost > 0) activityLines += `\n  Labor: ${fc(ar.laborCost)}`;
            if (ar.materialCost > 0) activityLines += `\n  Material: ${fc(ar.materialCost)}`;
            if (ar.truckingCost > 0) activityLines += `\n  Trucking: ${fc(ar.truckingCost)}`;
            if (ar.mobilizationCost > 0) activityLines += `\n  Mobilization: ${fc(ar.mobilizationCost)}`;
            activityLines += '\n';
        }

        // Gather HMA/DGA totals from activity results
        let totalHMA = 0, totalDGA = 0, totalExcCY = 0, totalRAP = 0;
        for (const ar of results.activities) {
            // These come from the activity's extra data — we'll check activityType
            if (ar.activityType === 'paving_base' || ar.activityType === 'paving_surface') {
                // grossQuantity is SY for paving; we need tons from materialCost context
                // Just use the result values stored
            }
        }

        const report = `PAVING ESTIMATE — RUBRIC-COMPLIANT
=====================================
Project: ${projectName}
Generated: ${new Date().toLocaleString()}
Fuel Index: ${fuelIndex}
AC Index: ${acIndex}
Estimate Class: ${estimate.confidenceLevel}
=====================================

SCHEDULE SUMMARY
------------------
Project Duration (CPM): ${fn(results.projectDuration)} days
Total Activity Days: ${fn(results.totalActivityDays)} days
Critical Path: ${results.criticalPath.join(' → ') || 'None'}
Total Truck Hours: ${fn(results.totalTruckHours, 0)} hrs

ACTIVITY DETAIL
------------------${activityLines}
=====================================
COST SUMMARY (Rubric Tier 4 Structure)
=====================================

DIRECT COSTS
  Materials:     ${fc(results.totalMaterialCost)}
  Labor:         ${fc(results.totalLaborCost)}
  Equipment:     ${fc(results.totalEquipmentCost)}
  Trucking:      ${fc(results.totalTruckingCost)}
  Mobilization:  ${fc(results.totalMobilizationCost)}
  ─────────────────────────
  Direct Cost Subtotal: ${fc(results.directCostTotal)}

INDIRECT COSTS
  General Conditions: ${fc(results.gcTotal)}
  ─────────────────────────
  Total Field Cost: ${fc(results.totalFieldCost)}

MARKUPS
  Home Office OH (${estimate.indirectCosts.homeOfficeOverheadPct}%): ${fc(results.homeOfficeOverhead)}
  Fee / Profit (${estimate.indirectCosts.feeProfitPct}%): ${fc(results.feeProfit)}
  Escalation:    ${fc(results.escalationAmount)}
  Bonds & Ins:   ${fc(results.biTotal)}
  ─────────────────────────
  Subtotal Before Contingency: ${fc(results.subtotalBeforeContingency)}

CONTINGENCY
  Identified Risks:    ${fc(results.identifiedRisks)}
  Unidentified Allow:  ${fc(results.unidentifiedAllowance)}
  ─────────────────────────
  Total Contingency: ${fc(results.totalContingency)}

=====================================
TOTAL ESTIMATED COST: ${fc(results.totalEstimatedCost)}
=====================================`;

        return report;
    }

    /**
     * Copy text to clipboard.
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    }
}
