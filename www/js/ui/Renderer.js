// ============================================
// UI Renderer
// DOM update orchestration — reads calculation results and updates all display elements
// ============================================

export class Renderer {

    // ---- Utility ----

    static setVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    static setInputVal(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    static formatCurrency(val) {
        return '$' + Math.round(val).toLocaleString('en-US');
    }

    static showWarning(id, show) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('show', show);
    }

    static setInputWarning(id, warn) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('input-warning', warn);
    }

    static showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    // ---- Main render method ----

    /**
     * Update all DOM elements from calculation results.
     * This replaces the second half of the old calculateAll() function.
     */
    static renderResults(results, estimate) {
        const fc = Renderer.formatCurrency;
        const sv = Renderer.setVal;

        // ---- Activity-level outputs ----
        for (const ar of results.activities) {
            Renderer._renderActivityOutputs(ar);
        }

        // ---- Tack coat outputs ----
        const tackResult = results.activities.find(a => a.activityType === 'tack_coat');
        if (tackResult && tackResult._extra) {
            sv('tackGallons', tackResult._extra.gallons || 0);
            sv('tackCost', fc(tackResult.materialCost));
        }

        // ---- Production Summary ----
        sv('totalDays', results.projectDuration.toFixed(1));
        sv('totalTruckHrs', Math.round(results.totalTruckHours));

        // Compute material totals from activity extras
        let totalHMA = 0, totalDGA = 0, totalExcCY = 0, totalRAP = 0;
        for (const ar of results.activities) {
            if (!ar._extra) continue;
            if (ar.activityType === 'paving_base' || ar.activityType === 'paving_surface') {
                totalHMA += ar._extra.tonsWithWaste || 0;
            }
            if (ar.activityType === 'dga_base') {
                totalDGA += ar._extra.tonsWithWaste || 0;
            }
            if (ar.activityType === 'excavation') {
                totalExcCY += ar._extra.bankCY || 0;
            }
            if (ar.activityType === 'milling') {
                totalRAP += ar._extra.rapTons || 0;
            }
        }
        sv('totalHMA', Math.round(totalHMA));
        sv('totalDGA', Math.round(totalDGA));
        sv('totalExcCY', Math.round(totalExcCY));
        sv('totalRAP', Math.round(totalRAP));

        // ---- Schedule Summary ----
        Renderer._renderSchedule(results);

        // ---- Cost Summary ----
        Renderer._renderCostSummary(results, estimate);

        // ---- Validation ----
        Renderer._renderValidation(results.validationWarnings || []);
    }

    static _renderActivityOutputs(ar) {
        const fc = Renderer.formatCurrency;
        const sv = Renderer.setVal;
        const ex = ar._extra || {};

        switch (ar.activityType) {
            case 'excavation':
                sv('excBankCY', ex.bankCY || 0);
                sv('excLooseCY', ex.looseCY || 0);
                sv('excTons', ex.tons || 0);
                sv('excDays', ar.duration);
                sv('excTrucks', ar.trucks);
                sv('excTruckHrs', ar.truckHours);
                sv('excLaborCost', fc(ar.laborCost));
                sv('excTruckCost', fc(ar.truckingCost));
                Renderer.showWarning('excCycleWarn', ar.duration > 0 && ar.trucks === 0);
                Renderer.setInputWarning('excavationCycle', ar.duration > 0 && ar.trucks === 0);
                break;

            case 'fine_grading':
                sv('fgDays', ar.duration);
                sv('fgLaborCost', fc(ar.laborCost));
                break;

            case 'dga_base':
                sv('dgaCY', ex.cy || 0);
                sv('dgaTons', ex.tons || 0);
                sv('dgaTonsWaste', ex.tonsWithWaste || 0);
                sv('dgaDays', ar.duration);
                sv('dgaTrucks', ar.trucks);
                sv('dgaTruckHrs', ar.truckHours);
                sv('dgaMatCost', fc(ar.materialCost));
                sv('dgaLaborCost', fc(ar.laborCost));
                sv('dgaTruckCost', fc(ar.truckingCost));
                Renderer.showWarning('dgaCycleWarn', ar.duration > 0 && ar.trucks === 0);
                Renderer.setInputWarning('dgaCycle', ar.duration > 0 && ar.trucks === 0);
                break;

            case 'milling':
                sv('millTons', ex.rapTons || 0);
                sv('millDays', ar.duration);
                sv('millTrucks', ar.trucks);
                sv('millTruckHrs', ar.truckHours);
                sv('millLaborCost', fc(ar.laborCost));
                sv('millTruckCost', fc(ar.truckingCost));
                Renderer.showWarning('millCycleWarn', ar.duration > 0 && ar.trucks === 0);
                Renderer.setInputWarning('millingCycle', ar.duration > 0 && ar.trucks === 0);
                break;

            case 'paving_base':
                sv('baseTons', ex.tons || 0);
                sv('baseTonsWaste', ex.tonsWithWaste || 0);
                sv('baseDays', ar.duration);
                sv('baseTrucks', ar.trucks);
                sv('baseTruckHrs', ar.truckHours);
                sv('baseMatCost', fc(ar.materialCost));
                sv('baseLaborCost', fc(ar.laborCost));
                sv('baseTruckCost', fc(ar.truckingCost));
                Renderer.showWarning('baseCycleWarn', ar.duration > 0 && ar.trucks === 0);
                Renderer.setInputWarning('baseCycle', ar.duration > 0 && ar.trucks === 0);
                break;

            case 'paving_surface':
                sv('surfTons', ex.tons || 0);
                sv('surfTonsWaste', ex.tonsWithWaste || 0);
                sv('surfDays', ar.duration);
                sv('surfTrucks', ar.trucks);
                sv('surfTruckHrs', ar.truckHours);
                sv('surfMatCost', fc(ar.materialCost));
                sv('surfLaborCost', fc(ar.laborCost));
                sv('surfTruckCost', fc(ar.truckingCost));
                Renderer.showWarning('surfCycleWarn', ar.duration > 0 && ar.trucks === 0);
                Renderer.setInputWarning('surfaceCycle', ar.duration > 0 && ar.trucks === 0);
                break;
        }
    }

    static _renderSchedule(results) {
        const sv = Renderer.setVal;
        const fc = Renderer.formatCurrency;

        sv('projectDuration', results.projectDuration.toFixed(1));
        sv('activityDaysTotal', results.totalActivityDays.toFixed(1));
        sv('concurrencySaving', Math.max(0, results.totalActivityDays - results.projectDuration).toFixed(1));
        sv('criticalPathDisplay', results.criticalPath.length > 0 ?
            results.criticalPath.map(id => {
                const a = results.activities.find(ar => ar.id === id);
                return a ? a.description : id;
            }).join(' → ') : 'None');

        // Gantt chart
        Renderer._renderGantt(results.ganttData, results.projectDuration);
    }

    static _renderGantt(ganttData, projectDuration) {
        const container = document.getElementById('ganttContainer');
        if (!container || !ganttData || projectDuration <= 0) return;

        container.innerHTML = '';

        for (const item of ganttData) {
            const row = document.createElement('div');
            row.className = 'gantt-row';

            const label = document.createElement('div');
            label.className = 'gantt-label';
            label.textContent = item.description;

            const track = document.createElement('div');
            track.className = 'gantt-track';

            const bar = document.createElement('div');
            bar.className = 'gantt-bar ' + (item.isCritical ? 'critical' : 'normal');
            bar.style.left = ((item.earlyStart / projectDuration) * 100) + '%';
            bar.style.width = ((item.duration / projectDuration) * 100) + '%';
            bar.textContent = item.duration.toFixed(1) + 'd';
            bar.title = `${item.description}: Day ${item.earlyStart.toFixed(1)} to ${item.earlyFinish.toFixed(1)} (Float: ${item.totalFloat.toFixed(1)}d)`;

            track.appendChild(bar);
            row.appendChild(label);
            row.appendChild(track);
            container.appendChild(row);
        }
    }

    static _renderCostSummary(results, estimate) {
        const fc = Renderer.formatCurrency;
        const sv = Renderer.setVal;

        // Materials by activity
        for (const ar of results.activities) {
            if (ar.activityType === 'paving_surface') sv('cost95HMA', fc(ar.materialCost));
            if (ar.activityType === 'paving_base') sv('cost19HMA', fc(ar.materialCost));
            if (ar.activityType === 'dga_base') sv('costDGAMat', fc(ar.materialCost));
            if (ar.activityType === 'tack_coat') sv('costTack', fc(ar.materialCost));
        }
        sv('subtotalMaterials', fc(results.totalMaterialCost));

        // Labor by activity
        const laborMap = { excavation: 'costLaborExc', fine_grading: 'costLaborFG', dga_base: 'costLaborDGA', milling: 'costLaborMill', paving_base: 'costLaborBase', paving_surface: 'costLaborSurf' };
        for (const ar of results.activities) {
            if (laborMap[ar.activityType]) sv(laborMap[ar.activityType], fc(ar.laborCost));
        }
        sv('subtotalLabor', fc(results.totalLaborCost + results.totalEquipmentCost));

        // Trucking by activity
        const truckMap = { excavation: 'costTruckExc', dga_base: 'costTruckDGA', milling: 'costTruckMill', paving_base: 'costTruckBase', paving_surface: 'costTruckSurf' };
        for (const ar of results.activities) {
            if (truckMap[ar.activityType]) sv(truckMap[ar.activityType], fc(ar.truckingCost));
        }
        sv('subtotalTrucking', fc(results.totalTruckingCost));

        // Mobilization by activity
        const mobMap = { excavation: 'costMobExc', fine_grading: 'costMobFG', dga_base: 'costMobDGA', milling: 'costMobMill', paving_base: 'costMobBase', paving_surface: 'costMobSurf' };
        for (const ar of results.activities) {
            if (mobMap[ar.activityType]) sv(mobMap[ar.activityType], fc(ar.mobilizationCost));
        }
        sv('subtotalMob', fc(results.totalMobilizationCost));

        // Totals
        sv('directCostTotal', fc(results.directCostTotal));

        // Indirect costs
        sv('gcTotalDisplay', fc(results.gcTotal));
        sv('totalFieldCostDisplay', fc(results.totalFieldCost));
        sv('homeOfficeDisplay', fc(results.homeOfficeOverhead));
        sv('feeProfitDisplay', fc(results.feeProfit));
        sv('escalationDisplay', fc(results.escalationAmount));
        sv('biTotalDisplay', fc(results.biTotal));
        sv('subtotalBeforeContDisplay', fc(results.subtotalBeforeContingency));
        sv('contingencyDisplay', fc(results.totalContingency));

        // Markup amount (backward compat: fee/profit is the new markup)
        sv('markupAmount', fc(results.feeProfit));

        // Grand total
        sv('bidPrice', fc(results.totalEstimatedCost));

        // Unit costs
        const pavedActivities = results.activities.filter(a =>
            ['paving_base', 'paving_surface'].includes(a.activityType) && a.netQuantity > 0
        );
        const totalPavedSY = Math.max(0, ...pavedActivities.map(a => a.netQuantity), 0);
        let totalHMA = 0;
        for (const ar of results.activities) {
            if (ar._extra && (ar.activityType === 'paving_base' || ar.activityType === 'paving_surface')) {
                totalHMA += ar._extra.tonsWithWaste || 0;
            }
        }

        sv('costPerSY', totalPavedSY > 0 ? fc(Math.round(results.totalEstimatedCost / totalPavedSY)) + '/SY' : '—');
        sv('costPerTon', totalHMA > 0 ? fc(Math.round(results.totalEstimatedCost / totalHMA)) + '/ton' : '—');
        sv('materialsPct', results.directCostTotal > 0 ? (results.totalMaterialCost / results.directCostTotal * 100).toFixed(1) + '%' : '—');
        sv('laborPct', results.directCostTotal > 0 ? ((results.totalLaborCost + results.totalEquipmentCost) / results.directCostTotal * 100).toFixed(1) + '%' : '—');
    }

    static _renderValidation(warnings) {
        const panel = document.getElementById('validationPanel');
        if (!panel) return;

        if (!warnings || warnings.length === 0) {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = 'block';
        panel.innerHTML = '';

        for (const w of warnings) {
            const div = document.createElement('div');
            div.className = 'validation-item ' + w.level;

            const icon = document.createElement('span');
            icon.className = 'icon';
            icon.textContent = w.level === 'warning' ? '⚠' : w.level === 'error' ? '✖' : 'ℹ';

            const msg = document.createElement('span');
            msg.className = 'message';
            msg.textContent = w.message;

            div.appendChild(icon);
            div.appendChild(msg);
            panel.appendChild(div);
        }
    }
}
