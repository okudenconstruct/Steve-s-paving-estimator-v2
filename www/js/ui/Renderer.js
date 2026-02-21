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

        // ---- v4.0 panels ----
        Renderer._renderConfidence(results.confidenceScore);
        Renderer._renderUnitChecks(results.unitChecks);
        Renderer._renderAnalysis(results.analysisResults);
        Renderer._renderMobSafety(results.clusterResults);
        Renderer._renderCalendar(results.calendarDuration);
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

    // ---- v4.0 Render Methods ----

    static _renderConfidence(conf) {
        const panel = document.getElementById('confidencePanel');
        if (!panel || !conf || conf.composite === 0) { if (panel) panel.style.display = 'none'; return; }

        panel.style.display = 'block';
        const badge = document.getElementById('confidenceBadge');
        if (badge) {
            badge.textContent = `${(conf.composite * 100).toFixed(0)}% ${conf.descriptor}`;
            badge.className = 'confidence-badge conf-' + conf.descriptor.toLowerCase().replace('-', '');
        }

        const bars = [
            { id: 'Prod', score: conf.prodReliability?.score },
            { id: 'Bench', score: conf.benchAlignment?.score },
            { id: 'Scope', score: conf.scopeDefinition?.score },
            { id: 'Data', score: conf.dataQuality?.score },
        ];
        for (const b of bars) {
            const fill = document.getElementById(`confBar${b.id}`);
            const label = document.getElementById(`confScore${b.id}`);
            if (fill) fill.style.width = `${(b.score || 0) * 100}%`;
            if (label) label.textContent = `${((b.score || 0) * 100).toFixed(0)}%`;
        }
    }

    static _renderUnitChecks(checks) {
        const panel = document.getElementById('unitCheckPanel');
        const tbody = document.getElementById('unitCheckBody');
        if (!panel || !tbody) return;

        if (!checks || checks.length === 0) { panel.style.display = 'none'; return; }

        panel.style.display = 'block';
        tbody.innerHTML = '';
        const fc = Renderer.formatCurrency;

        for (const c of checks) {
            const tr = document.createElement('tr');
            tr.className = 'uc-' + c.status.toLowerCase().replace('_', '-');
            const uom = c.unit || 'SY';
            tr.innerHTML = `
                <td>${c.description}</td>
                <td>$${c.unitCost.toFixed(2)}/${uom}</td>
                <td>${c.p25.toFixed(2)}</td>
                <td>${c.median.toFixed(2)}</td>
                <td>${c.p75.toFixed(2)}</td>
                <td>${c.n}</td>
                <td><span class="uc-badge uc-${c.status.toLowerCase().replace('_', '-')}">${c.status.replace('_', ' ')}</span></td>
            `;
            tbody.appendChild(tr);
        }
    }

    static _renderAnalysis(observations) {
        const panel = document.getElementById('analysisPanel');
        const list = document.getElementById('analysisList');
        if (!panel || !list) return;

        if (!observations || observations.length === 0) { panel.style.display = 'none'; return; }

        panel.style.display = 'block';
        list.innerHTML = '';

        for (const obs of observations) {
            const card = document.createElement('div');
            card.className = `analysis-card analysis-${obs.status.toLowerCase()}`;

            const icon = obs.status === 'WARNING' ? '⚠' : 'ℹ';
            let html = `<div class="analysis-header"><span class="analysis-icon">${icon}</span><span class="analysis-msg">${obs.message}</span></div>`;

            if (obs.reasons && obs.reasons.length > 0) {
                html += '<ul class="analysis-reasons">';
                for (const r of obs.reasons) html += `<li>${r}</li>`;
                html += '</ul>';
            }

            card.innerHTML = html;
            list.appendChild(card);
        }
    }

    static _renderMobSafety(clusterResults) {
        const panel = document.getElementById('mobSafetyPanel');
        if (!panel) return;

        if (!clusterResults || clusterResults.clusters.length === 0) { panel.style.display = 'none'; return; }

        panel.style.display = 'block';
        const fc = Renderer.formatCurrency;
        const sv = Renderer.setVal;

        // Table body
        const tbody = document.getElementById('mobTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            for (const c of clusterResults.clusters) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${c.desc}</td>
                    <td>${c.activities.join(', ').replace(/_/g, ' ')}</td>
                    <td>${c.mobCrew}</td>
                    <td>${c.trips || 2}</td>
                    <td>${c.travelHours || 0}h</td>
                    <td>${fc(c.mobCost)}</td>
                `;
                tbody.appendChild(tr);
            }
        }

        sv('mobTotalDisplay', fc(clusterResults.totalMobCost || 0));

        const safetyLine = document.getElementById('safetyLine');
        if (safetyLine) {
            if (clusterResults.safetyCost > 0) {
                safetyLine.style.display = 'flex';
                sv('safetyTotalDisplay', fc(clusterResults.safetyCost));
            } else {
                safetyLine.style.display = 'none';
            }
        }

        sv('mobSafetyTotalDisplay', fc(clusterResults.totalMobAndSafety || 0));
    }

    static _renderCalendar(cal) {
        const panel = document.getElementById('calendarPanel');
        if (!panel) return;

        if (!cal || cal.totalDays === 0) { panel.style.display = 'none'; return; }

        panel.style.display = 'block';
        const sv = Renderer.setVal;
        sv('calWorkDays', cal.workDays);
        sv('calWeatherDays', cal.weatherDays);
        sv('calTotalDays', cal.totalDays);

        const timeline = document.getElementById('calendarTimeline');
        if (!timeline) return;
        timeline.innerHTML = '';

        for (const day of cal.timeline) {
            const block = document.createElement('div');
            block.className = `cal-day cal-${day.type}`;
            block.title = day.type === 'weather' ? `Day ${day.day}: Weather contingency` :
                `Day ${day.day}: ${day.activities.map(a => a.description).join(', ')}`;

            const label = document.createElement('span');
            label.className = 'cal-day-label';
            label.textContent = day.day;
            block.appendChild(label);

            if (day.activities.length > 0) {
                for (const a of day.activities) {
                    const dot = document.createElement('span');
                    dot.className = `cal-dot ${a.colorClass}`;
                    block.appendChild(dot);
                }
            }

            timeline.appendChild(block);
        }
    }
}
