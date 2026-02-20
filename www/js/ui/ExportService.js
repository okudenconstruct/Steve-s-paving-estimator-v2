// ============================================
// Export Service v4.0
// Quick, Full, JSON, Print — 4 export modes
// ============================================

export class ExportService {

    // ---- Mode 1: Quick Export (clipboard-friendly summary) ----

    static generateQuickReport(estimate, results, settings = {}) {
        const fc = (v) => '$' + Math.round(v).toLocaleString('en-US');
        const fn = (v, d = 1) => Number(v).toFixed(d);
        const projectName = estimate.projectName || 'Unnamed Project';
        const mode = estimate.jobMode === 'roadway' ? 'Roadway' : 'Parking Lot';

        let lines = [
            `PAVING ESTIMATE — ${projectName}`,
            `Mode: ${mode} | ${new Date().toLocaleDateString()}`,
            `=========================================`,
            '',
        ];

        // Active activities only
        for (const ar of results.activities) {
            if (ar.duration <= 0) continue;
            lines.push(`${ar.description}: ${fn(ar.grossQuantity, 0)} ${ar.quantityUOM} | ${fn(ar.duration)}d | ${fc(ar.directCost)}`);
        }

        lines.push('');
        lines.push(`Direct Cost:   ${fc(results.directCostTotal)}`);
        if (results.clusterResults?.totalMobAndSafety > 0) {
            lines.push(`Mob + Safety:  ${fc(results.clusterResults.totalMobAndSafety)}`);
        }
        lines.push(`BID PRICE:     ${fc(results.totalEstimatedCost)}`);

        if (results.calendarDuration) {
            lines.push(`Calendar:      ${results.calendarDuration.totalDays} days (${results.calendarDuration.workDays} work + ${results.calendarDuration.weatherDays} weather)`);
        }

        if (results.confidenceScore) {
            lines.push(`Confidence:    ${(results.confidenceScore.composite * 100).toFixed(0)}% ${results.confidenceScore.descriptor}`);
        }

        return lines.join('\n');
    }

    // ---- Mode 2: Full Export (detailed text report) ----

    static generateFullReport(estimate, results, settings = {}) {
        const projectName = estimate.projectName || 'Unnamed Project';
        const fuelIndex = settings.fuelIndex || 'Not specified';
        const acIndex = settings.acIndex || 'Not specified';
        const mode = estimate.jobMode === 'roadway' ? 'Roadway' : 'Parking Lot';

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
            if (ar.equipmentCost > 0) activityLines += `\n  Equipment: ${fc(ar.equipmentCost)}`;
            if (ar.materialCost > 0) activityLines += `\n  Material: ${fc(ar.materialCost)}`;
            if (ar.truckingCost > 0) activityLines += `\n  Trucking: ${fc(ar.truckingCost)}`;
            if (ar.mobilizationCost > 0) activityLines += `\n  Mobilization: ${fc(ar.mobilizationCost)}`;
            if (ar.unitCost > 0) activityLines += `\n  Unit Cost: $${ar.unitCost.toFixed(2)}/SY`;
            activityLines += '\n';
        }

        // Unit check section
        let unitCheckLines = '';
        if (results.unitChecks && results.unitChecks.length > 0) {
            unitCheckLines = '\nUNIT COST REASONABLENESS CHECK\n------------------------------';
            for (const c of results.unitChecks) {
                unitCheckLines += `\n  ${c.description}: $${c.unitCost.toFixed(2)}/SY [${c.status.replace('_', ' ')}] (P25: $${c.p25.toFixed(2)}, Med: $${c.median.toFixed(2)}, P75: $${c.p75.toFixed(2)})`;
            }
            unitCheckLines += '\n';
        }

        // Cluster / mob section
        let mobLines = '';
        if (results.clusterResults && results.clusterResults.clusters.length > 0) {
            mobLines = '\nMOBILIZATION & SAFETY\n---------------------';
            for (const c of results.clusterResults.clusters) {
                mobLines += `\n  ${c.desc}: ${fc(c.mobCost)} (${c.mobCrew}, ${c.trips || 2} trips × ${c.travelHours || 0}h)`;
            }
            mobLines += `\n  Mob Total: ${fc(results.clusterResults.totalMobCost || 0)}`;
            if (results.clusterResults.safetyCost > 0) {
                mobLines += `\n  Safety Crew: ${fc(results.clusterResults.safetyCost)}`;
            }
            mobLines += `\n  Mob + Safety Total: ${fc(results.clusterResults.totalMobAndSafety || 0)}`;
            mobLines += '\n';
        }

        // Analysis section
        let analysisLines = '';
        if (results.analysisResults && results.analysisResults.length > 0) {
            analysisLines = '\nJOB ANALYSIS\n------------';
            for (const obs of results.analysisResults) {
                const icon = obs.status === 'WARNING' ? '[!]' : '[i]';
                analysisLines += `\n  ${icon} ${obs.message}`;
            }
            analysisLines += '\n';
        }

        // Confidence section
        let confLine = '';
        if (results.confidenceScore) {
            const cs = results.confidenceScore;
            confLine = `\nESTIMATE CONFIDENCE: ${(cs.composite * 100).toFixed(0)}% ${cs.descriptor}`;
            confLine += `\n  Production Reliability: ${(cs.prodReliability?.score * 100 || 0).toFixed(0)}%`;
            confLine += `\n  Benchmark Alignment: ${(cs.benchAlignment?.score * 100 || 0).toFixed(0)}%`;
            confLine += `\n  Scope Definition: ${(cs.scopeDefinition?.score * 100 || 0).toFixed(0)}%`;
            confLine += `\n  Data Quality: ${(cs.dataQuality?.score * 100 || 0).toFixed(0)}%\n`;
        }

        // Calendar section
        let calLine = '';
        if (results.calendarDuration) {
            calLine = `\nCALENDAR DURATION: ${results.calendarDuration.totalDays} calendar days`;
            calLine += `\n  Work Days: ${results.calendarDuration.workDays}`;
            calLine += `\n  Weather Contingency: ${results.calendarDuration.weatherDays}\n`;
        }

        // Scope assumptions
        let scopeLines = '';
        if (estimate.scopeAssumptions) {
            const items = Object.entries(estimate.scopeAssumptions);
            const excluded = items.filter(([, v]) => v === 'excluded');
            if (excluded.length > 0) {
                scopeLines = '\nSCOPE EXCLUSIONS\n----------------';
                for (const [key] of excluded) {
                    scopeLines += `\n  - ${key.replace(/_/g, ' ')}`;
                }
                scopeLines += '\n';
            }
        }

        // Reviewer notes
        let noteLines = '';
        if (estimate.reviewerNotes) {
            const notes = Object.entries(estimate.reviewerNotes).filter(([, v]) => v);
            if (notes.length > 0) {
                noteLines = '\nREVIEWER NOTES\n--------------';
                for (const [key, val] of notes) {
                    noteLines += `\n  ${key.toUpperCase()}: ${val}`;
                }
                noteLines += '\n';
            }
        }

        const report = `PAVING ESTIMATE — RUBRIC-COMPLIANT
=====================================
Project: ${projectName}
Job Mode: ${mode}
Generated: ${new Date().toLocaleString()}
Fuel Index: ${fuelIndex}
AC Index: ${acIndex}
=====================================

SCHEDULE SUMMARY
------------------
Project Duration (CPM): ${fn(results.projectDuration)} days
Total Activity Days: ${fn(results.totalActivityDays)} days
Critical Path: ${results.criticalPath.join(' \u2192 ') || 'None'}
Total Truck Hours: ${fn(results.totalTruckHours, 0)} hrs

ACTIVITY DETAIL
------------------${activityLines}${unitCheckLines}${mobLines}${analysisLines}${confLine}${calLine}${scopeLines}${noteLines}=====================================
COST SUMMARY (Rubric Tier 4 Structure)
=====================================

DIRECT COSTS
  Materials:     ${fc(results.totalMaterialCost)}
  Labor:         ${fc(results.totalLaborCost)}
  Equipment:     ${fc(results.totalEquipmentCost)}
  Trucking:      ${fc(results.totalTruckingCost)}
  Mobilization:  ${fc(results.totalMobilizationCost)}
  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  Direct Cost Subtotal: ${fc(results.directCostTotal)}

INDIRECT COSTS
  General Conditions: ${fc(results.gcTotal)}
  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  Total Field Cost: ${fc(results.totalFieldCost)}

MARKUPS
  Home Office OH (${estimate.indirectCosts.homeOfficeOverheadPct}%): ${fc(results.homeOfficeOverhead)}
  Fee / Profit (${estimate.indirectCosts.feeProfitPct}%): ${fc(results.feeProfit)}
  Escalation:    ${fc(results.escalationAmount)}
  Bonds & Ins:   ${fc(results.biTotal)}
  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  Subtotal Before Contingency: ${fc(results.subtotalBeforeContingency)}

CONTINGENCY
  Identified Risks:    ${fc(results.identifiedRisks)}
  Unidentified Allow:  ${fc(results.unidentifiedAllowance)}
  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  Total Contingency: ${fc(results.totalContingency)}

=====================================
TOTAL ESTIMATED COST: ${fc(results.totalEstimatedCost)}
=====================================`;

        return report;
    }

    // ---- Mode 3: JSON Export ----

    static generateJSONExport(estimate, results) {
        const exportData = {
            meta: {
                version: '4.0',
                exportDate: new Date().toISOString(),
                projectName: estimate.projectName,
                jobMode: estimate.jobMode,
            },
            estimate: estimate.toJSON(),
            results: {
                projectDuration: results.projectDuration,
                totalActivityDays: results.totalActivityDays,
                criticalPath: results.criticalPath,
                directCostTotal: results.directCostTotal,
                totalMaterialCost: results.totalMaterialCost,
                totalLaborCost: results.totalLaborCost,
                totalEquipmentCost: results.totalEquipmentCost,
                totalTruckingCost: results.totalTruckingCost,
                totalMobilizationCost: results.totalMobilizationCost,
                totalEstimatedCost: results.totalEstimatedCost,
                activities: results.activities.map(ar => ({
                    id: ar.id,
                    description: ar.description,
                    activityType: ar.activityType,
                    grossQuantity: ar.grossQuantity,
                    quantityUOM: ar.quantityUOM,
                    duration: ar.duration,
                    laborCost: ar.laborCost,
                    equipmentCost: ar.equipmentCost,
                    materialCost: ar.materialCost,
                    truckingCost: ar.truckingCost,
                    mobilizationCost: ar.mobilizationCost,
                    directCost: ar.directCost,
                    unitCost: ar.unitCost || 0,
                    trucks: ar.trucks,
                    truckHours: ar.truckHours,
                })),
                confidence: results.confidenceScore || null,
                unitChecks: results.unitChecks || [],
                analysis: results.analysisResults || [],
                clusterResults: results.clusterResults || null,
                calendarDuration: results.calendarDuration || null,
                indirects: {
                    gcTotal: results.gcTotal,
                    totalFieldCost: results.totalFieldCost,
                    homeOfficeOverhead: results.homeOfficeOverhead,
                    feeProfit: results.feeProfit,
                    biTotal: results.biTotal,
                    totalContingency: results.totalContingency,
                },
            },
        };

        return JSON.stringify(exportData, null, 2);
    }

    // ---- Mode 4: Print-optimized (triggers window.print) ----

    static triggerPrint() {
        window.print();
    }

    // ---- Backward-compatible alias ----

    static generateTextReport(estimate, results, settings = {}) {
        return ExportService.generateFullReport(estimate, results, settings);
    }

    // ---- Clipboard ----

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

    // ---- Download as file ----

    static downloadAsFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
