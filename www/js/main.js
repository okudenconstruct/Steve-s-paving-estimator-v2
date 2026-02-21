// ============================================
// Main Application Controller
// Wires UI events to models/engine, replaces old calculateAll()
// ============================================

import { CONSTANTS } from './data/constants.js';
import { Resource, ResourceType } from './models/Resource.js';
import { ProductionRate } from './models/ProductionRate.js';
import { Quantity } from './models/Quantity.js';
import { TimeUnit } from './models/TimeUnit.js';
import { Crew } from './models/Crew.js';
import { ProductivityFactor } from './models/ProductivityFactor.js';
import { Activity, DependencyType } from './models/Activity.js';
import { WorkPackage } from './models/WorkPackage.js';
import { IndirectCosts } from './models/IndirectCosts.js';
import { RiskRegister } from './models/RiskRegister.js';
import { Estimate } from './models/Estimate.js';
import { Calculator } from './engine/Calculator.js';
import { Validator } from './validation/Validator.js';
import { EstimateStore } from './storage/EstimateStore.js';
import { Renderer } from './ui/Renderer.js';
import { ExportService } from './ui/ExportService.js';
import { ACTIVITY_CONFIG, DEFAULT_DEPENDENCIES, RATE_OPTIONS, DEFAULT_CREW_SIZES, SCOPE_ITEMS, CREW_DATA, CREW_THRESHOLDS, PRODUCTION_RATES, BENCHMARKS } from './data/paving-defaults.js';
import { MATERIAL_PRICES } from './data/constants.js';
import { calculateConfidence, _getUnitCostStatus } from './engine/Confidence.js';
import { generateAnalysis } from './engine/AnalysisEngine.js';

// ---- Global state ----
let estimate = null;
let currentJobMode = 'parking_lot';
const calculator = new Calculator();
const validator = new Validator();
const store = new EstimateStore();

// ---- DOM Helpers ----
function getVal(id) {
    return parseFloat(document.getElementById(id)?.value) || 0;
}

function getTextVal(id) {
    return document.getElementById(id)?.value || '';
}

function isChecked(id) {
    return document.getElementById(id)?.checked || false;
}

// ---- Build Estimate from UI Inputs ----

function buildEstimateFromUI() {
    // Global settings
    const complexityVal = getVal('complexityModifier');
    const asphaltWaste = getVal('asphaltWaste');
    const aggregateWaste = getVal('aggregateWaste');
    const swellFactor = getVal('swellFactor');
    const truckEfficiency = getVal('truckingEfficiency');
    const tackAppRate = getVal('tackAppRate') || 0.05;

    // Rates from config panel
    const rates = {
        rate95HMA: getVal('rate95HMA'),
        rate19HMA: getVal('rate19HMA'),
        rateDGA: getVal('rateDGA'),
        rateTack: getVal('rateTack'),
        rateTrucking: getVal('rateTrucking'),
        rateCrewExc: getVal('rateCrewExc'),
        rateCrewFG: getVal('rateCrewFG'),
        rateCrewDGA: getVal('rateCrewDGA'),
        rateCrewMill: getVal('rateCrewMill'),
        rateCrewBase: getVal('rateCrewBase'),
        rateCrewSurf: getVal('rateCrewSurf'),
        mobExc: getVal('mobExc'),
        mobFG: getVal('mobFG'),
        mobDGA: getVal('mobDGA'),
        mobMill: getVal('mobMill'),
        mobBase: getVal('mobBase'),
        mobSurf: getVal('mobSurf')
    };

    // Material resources
    const mat95HMA = new Resource({ id: 'M-001', name: '9.5mm HMA', type: ResourceType.MATERIAL, unitId: 'TON', costRate: rates.rate95HMA });
    const mat19HMA = new Resource({ id: 'M-002', name: '19mm HMA', type: ResourceType.MATERIAL, unitId: 'TON', costRate: rates.rate19HMA });
    const matDGA = new Resource({ id: 'M-003', name: 'DGA', type: ResourceType.MATERIAL, unitId: 'TON', costRate: rates.rateDGA });
    const matTack = new Resource({ id: 'M-004', name: 'Tack Coat', type: ResourceType.MATERIAL, unitId: 'GAL', costRate: rates.rateTack });

    // Productivity factor from complexity dropdown
    const productivity = ProductivityFactor.fromCompositeValue(complexityVal);

    // Build each activity from UI inputs
    const activities = [];

    // v4.0: Determine total job SY for crew auto-selection
    // Use the largest paving/milling area as the sizing driver
    const totalJobSY = Math.max(
        getVal('millingArea') || 0,
        getVal('baseArea') || 0,
        getVal('surfaceArea') || 0,
        getVal('excavationArea') || 0,
        getVal('dgaArea') || 0,
        getVal('fineGradingArea') || 0
    );

    // v4.0: Detect if COMBO crew should be used (milling + paving both active)
    const activeTypes = new Set();
    if (getVal('millingArea') > 0) activeTypes.add('milling');
    if (getVal('baseArea') > 0) activeTypes.add('paving_base');
    if (getVal('surfaceArea') > 0) activeTypes.add('paving_surface');
    if (getVal('excavationArea') > 0) activeTypes.add('excavation');
    if (getVal('fineGradingArea') > 0) activeTypes.add('fine_grading');
    if (getVal('dgaArea') > 0) activeTypes.add('dga_base');
    const useCombo = Crew.detectCombo(activeTypes);

    /**
     * v4.0: Smart crew selection — uses CREW_DATA auto-select when the user
     * hasn't entered a manual crew rate; falls back to fromComposite when they have.
     */
    function selectCrew(activityType, manualRate, manualHeadcount, fallbackId, fallbackName) {
        // If the user entered a manual crew rate, respect it
        if (manualRate > 0) {
            return Crew.fromComposite(fallbackId, fallbackName, manualRate, manualHeadcount);
        }
        // For milling/paving when COMBO is detected, use the COMBO crew
        if (useCombo && (activityType === 'milling' || activityType === 'paving_base' || activityType === 'paving_surface')) {
            const comboData = CREW_DATA['COMBO'];
            if (comboData) return Crew.fromCrewData('COMBO', comboData);
        }
        // Auto-select based on job size
        const result = Crew.autoSelect(totalJobSY, activityType, CREW_THRESHOLDS, CREW_DATA);
        if (result) return result.crew;
        // Ultimate fallback
        return Crew.fromComposite(fallbackId, fallbackName, manualRate, manualHeadcount);
    }

    // --- Excavation ---
    const excArea = getVal('excavationArea');
    const excDepth = getVal('excavationDepth');
    const excCycle = getVal('excavationCycle');
    const excRateVal = getVal('excavationRate');
    const excCrewSize = getVal('excCrewSize');

    const excConfig = ACTIVITY_CONFIG.excavation;
    const excQuantityData = excConfig.quantityCalc(excArea, excDepth, 1.0, swellFactor);

    const excActivity = new Activity({
        id: excConfig.id,
        description: excConfig.description,
        wbsCode: excConfig.wbsCode,
        activityType: 'excavation',
        colorClass: excConfig.colorClass,
        quantity: new Quantity({ netQuantity: excQuantityData.netQuantity, uomId: 'CY', wasteFactor: 1.0, method: 'area×depth÷324', inputs: { area: excArea, depth: excDepth } }),
        crew: selectCrew('excavation', rates.rateCrewExc, excCrewSize, 'C-EXC', 'Excavation Crew'),
        productionRate: excRateVal ? new ProductionRate({ id: 'PR-EXC', activityType: 'excavation', outputQty: excRateVal, outputUOMId: 'CY', source: 'User selected' }) : new ProductionRate({ id: 'PR-EXC', activityType: 'excavation', outputQty: 0, outputUOMId: 'CY' }),
        productivityFactor: productivity,
        mobilization: { included: isChecked('excMob'), cost: rates.mobExc },
        trucking: excCycle ? { cycleTime: excCycle, truckCapacity: CONSTANTS.TRUCK_CY, efficiency: truckEfficiency } : null,
        dependencies: DEFAULT_DEPENDENCIES['EXC-001'] || []
    });
    // Attach extra data for rendering (tonnage, loose CY, etc.)
    excActivity._extra = { bankCY: excQuantityData.netQuantity, looseCY: excQuantityData.looseCY, tons: excQuantityData.tons };
    // Override trucking quantity to use loose CY
    if (excActivity.trucking) {
        excActivity._truckingQuantityOverride = excQuantityData.looseCY;
    }
    activities.push(excActivity);

    // --- Fine Grading ---
    const fgArea = getVal('fineGradingArea');
    const fgRateVal = getVal('fineGradingRate');
    const fgCrewSize = getVal('fgCrewSize');

    const fgActivity = new Activity({
        id: 'FG-001',
        description: 'Fine Grading',
        wbsCode: '01.02',
        activityType: 'fine_grading',
        colorClass: 'purple',
        quantity: new Quantity({ netQuantity: fgArea, uomId: 'SY', wasteFactor: 1.0, method: 'direct area', inputs: { area: fgArea } }),
        crew: selectCrew('fine_grading', rates.rateCrewFG, fgCrewSize, 'C-FG', 'Fine Grading Crew'),
        productionRate: fgRateVal ? new ProductionRate({ id: 'PR-FG', activityType: 'fine_grading', outputQty: fgRateVal, outputUOMId: 'SY' }) : new ProductionRate({ id: 'PR-FG', activityType: 'fine_grading', outputQty: 0, outputUOMId: 'SY' }),
        productivityFactor: productivity,
        mobilization: { included: isChecked('fgMob'), cost: rates.mobFG },
        dependencies: DEFAULT_DEPENDENCIES['FG-001'] || []
    });
    activities.push(fgActivity);

    // --- DGA Base ---
    const dgaArea = getVal('dgaArea');
    const dgaDepth = getVal('dgaDepth');
    const dgaCycle = getVal('dgaCycle');
    const dgaRateVal = getVal('dgaRate');
    const dgaCrewSize = getVal('dgaCrewSize');

    const dgaQuantityData = ACTIVITY_CONFIG.dga_base.quantityCalc(dgaArea, dgaDepth, aggregateWaste);

    const dgaActivity = new Activity({
        id: 'DGA-001',
        description: 'DGA Base',
        wbsCode: '02.01',
        activityType: 'dga_base',
        colorClass: 'yellow',
        quantity: new Quantity({ netQuantity: dgaQuantityData.netQuantity, uomId: 'CY', wasteFactor: 1.0, method: 'area×depth÷324', inputs: { area: dgaArea, depth: dgaDepth } }),
        crew: selectCrew('dga_base', rates.rateCrewDGA, dgaCrewSize, 'C-DGA', 'DGA Crew'),
        productionRate: dgaRateVal ? new ProductionRate({ id: 'PR-DGA', activityType: 'dga_base', outputQty: dgaRateVal, outputUOMId: 'CY' }) : new ProductionRate({ id: 'PR-DGA', activityType: 'dga_base', outputQty: 0, outputUOMId: 'CY' }),
        productivityFactor: productivity,
        materialResources: [{ resource: matDGA, quantityPerOutputUnit: CONSTANTS.DGA_DENSITY * aggregateWaste }],
        mobilization: { included: isChecked('dgaMob'), cost: rates.mobDGA },
        trucking: dgaCycle ? { cycleTime: dgaCycle, truckCapacity: CONSTANTS.TRUCK_CY, efficiency: truckEfficiency } : null,
        dependencies: DEFAULT_DEPENDENCIES['DGA-001'] || []
    });
    dgaActivity._extra = { cy: dgaQuantityData.netQuantity, tons: dgaQuantityData.tons, tonsWithWaste: dgaQuantityData.tonsWithWaste };
    activities.push(dgaActivity);

    // --- Milling ---
    const millArea = getVal('millingArea');
    const millDepth = getVal('millingDepth');
    const millCycle = getVal('millingCycle');
    const millRateVal = getVal('millingRate');
    const millCrewSize = getVal('millCrewSize');

    const millQuantityData = ACTIVITY_CONFIG.milling.quantityCalc(millArea, millDepth);

    const millActivity = new Activity({
        id: 'MILL-001',
        description: 'Milling',
        wbsCode: '03.01',
        activityType: 'milling',
        colorClass: 'pink',
        quantity: new Quantity({ netQuantity: millArea, uomId: 'SY', wasteFactor: 1.0, method: 'direct area', inputs: { area: millArea, depth: millDepth } }),
        crew: selectCrew('milling', rates.rateCrewMill, millCrewSize, 'C-MILL', 'Milling Crew'),
        productionRate: millRateVal ? new ProductionRate({ id: 'PR-MILL', activityType: 'milling', outputQty: millRateVal, outputUOMId: 'SY' }) : new ProductionRate({ id: 'PR-MILL', activityType: 'milling', outputQty: 0, outputUOMId: 'SY' }),
        productivityFactor: productivity,
        mobilization: { included: isChecked('millMob'), cost: rates.mobMill },
        trucking: millCycle ? { cycleTime: millCycle, truckCapacity: CONSTANTS.TRUCK_TONS, efficiency: truckEfficiency } : null,
        dependencies: DEFAULT_DEPENDENCIES['MILL-001'] || []
    });
    millActivity._extra = { rapTons: millQuantityData.rapTons };
    // Trucking for milling uses RAP tons, not SY
    if (millActivity.trucking) {
        millActivity._truckingQuantityOverride = millQuantityData.rapTons;
    }
    activities.push(millActivity);

    // --- Base Course (19mm HMA) ---
    const baseArea = getVal('baseArea');
    const baseDepth = getVal('baseDepth');
    const baseCycle = getVal('baseCycle');
    const baseRateVal = getVal('baseRate');
    const baseCrewSize = getVal('baseCrewSize');

    const baseQuantityData = ACTIVITY_CONFIG.paving_base.quantityCalc(baseArea, baseDepth, asphaltWaste);

    const baseActivity = new Activity({
        id: 'PAVE-001',
        description: '19mm Base Course',
        wbsCode: '04.01',
        activityType: 'paving_base',
        colorClass: 'blue',
        quantity: new Quantity({ netQuantity: baseArea, uomId: 'SY', wasteFactor: 1.0, method: 'direct area (rate in SY/day)', inputs: { area: baseArea, depth: baseDepth } }),
        crew: selectCrew('paving_base', rates.rateCrewBase, baseCrewSize, 'C-PAVE-B', 'Paving Crew (Base)'),
        productionRate: baseRateVal ? new ProductionRate({ id: 'PR-BASE', activityType: 'paving_base', outputQty: baseRateVal, outputUOMId: 'SY' }) : new ProductionRate({ id: 'PR-BASE', activityType: 'paving_base', outputQty: 0, outputUOMId: 'SY' }),
        productivityFactor: productivity,
        materialResources: [{ resource: mat19HMA, quantityPerOutputUnit: baseDepth * CONSTANTS.HMA_FACTOR * asphaltWaste }],
        mobilization: { included: isChecked('baseMob'), cost: rates.mobBase },
        trucking: baseCycle ? { cycleTime: baseCycle, truckCapacity: CONSTANTS.TRUCK_TONS, efficiency: truckEfficiency } : null,
        dependencies: DEFAULT_DEPENDENCIES['PAVE-001'] || []
    });
    baseActivity._extra = { tons: baseQuantityData.tons, tonsWithWaste: baseQuantityData.tonsWithWaste };
    // Trucking for paving uses tons with waste
    if (baseActivity.trucking) {
        baseActivity._truckingQuantityOverride = baseQuantityData.tonsWithWaste;
    }
    activities.push(baseActivity);

    // --- Surface Course (9.5mm HMA) ---
    const surfArea = getVal('surfaceArea');
    const surfDepth = getVal('surfaceDepth');
    const surfCycle = getVal('surfaceCycle');
    const surfRateVal = getVal('surfaceRate');
    const surfCrewSize = getVal('surfCrewSize');

    const surfQuantityData = ACTIVITY_CONFIG.paving_surface.quantityCalc(surfArea, surfDepth, asphaltWaste);

    const surfActivity = new Activity({
        id: 'PAVE-002',
        description: '9.5mm Surface Course',
        wbsCode: '04.03',
        activityType: 'paving_surface',
        colorClass: 'green',
        quantity: new Quantity({ netQuantity: surfArea, uomId: 'SY', wasteFactor: 1.0, method: 'direct area (rate in SY/day)', inputs: { area: surfArea, depth: surfDepth } }),
        crew: selectCrew('paving_surface', rates.rateCrewSurf, surfCrewSize, 'C-PAVE-S', 'Paving Crew (Surface)'),
        productionRate: surfRateVal ? new ProductionRate({ id: 'PR-SURF', activityType: 'paving_surface', outputQty: surfRateVal, outputUOMId: 'SY' }) : new ProductionRate({ id: 'PR-SURF', activityType: 'paving_surface', outputQty: 0, outputUOMId: 'SY' }),
        productivityFactor: productivity,
        materialResources: [{ resource: mat95HMA, quantityPerOutputUnit: surfDepth * CONSTANTS.HMA_FACTOR * asphaltWaste }],
        mobilization: { included: isChecked('surfMob'), cost: rates.mobSurf },
        trucking: surfCycle ? { cycleTime: surfCycle, truckCapacity: CONSTANTS.TRUCK_TONS, efficiency: truckEfficiency } : null,
        dependencies: DEFAULT_DEPENDENCIES['PAVE-002'] || []
    });
    surfActivity._extra = { tons: surfQuantityData.tons, tonsWithWaste: surfQuantityData.tonsWithWaste };
    if (surfActivity.trucking) {
        surfActivity._truckingQuantityOverride = surfQuantityData.tonsWithWaste;
    }
    activities.push(surfActivity);

    // --- Tack Coat ---
    let tackArea = getVal('tackArea');
    if (!tackArea && surfArea) {
        tackArea = surfArea;
        Renderer.setInputVal('tackArea', surfArea);
    }
    const tackQuantityData = ACTIVITY_CONFIG.tack_coat.quantityCalc(tackArea, 0, 0, 0, tackAppRate);

    const tackActivity = new Activity({
        id: 'TACK-001',
        description: 'Tack Coat',
        wbsCode: '04.02',
        activityType: 'tack_coat',
        colorClass: 'teal',
        quantity: new Quantity({ netQuantity: tackArea, uomId: 'SY', wasteFactor: 1.0, inputs: { area: tackArea, tackAppRate } }),
        crew: selectCrew('tack_coat', 0, 0, 'C-TACK', 'Tack Crew'),
        productionRate: new ProductionRate({ id: 'PR-TACK', activityType: 'tack_coat', outputQty: 0, outputUOMId: 'SY' }),
        productivityFactor: new ProductivityFactor(),
        materialResources: [{ resource: matTack, quantityPerOutputUnit: tackAppRate }],
        mobilization: { included: false, cost: 0 },
        dependencies: DEFAULT_DEPENDENCIES['TACK-001'] || []
    });
    tackActivity._extra = { gallons: tackQuantityData.gallons };
    activities.push(tackActivity);

    // Tack coat display
    document.getElementById('tackRateDisplay').value = tackAppRate;
    Renderer.setVal('tackGallons', tackQuantityData.gallons);
    Renderer.setVal('tackCost', Renderer.formatCurrency(tackQuantityData.gallons * rates.rateTack));

    // Build estimate
    const indirectCosts = new IndirectCosts({
        feeProfitPct: getVal('markupPercent') || 15,
        generalConditions: {
            superintendentPerDay: getVal('gcSuperPerDay') || 0,
            fieldOfficePerDay: getVal('gcFieldOfficePerDay') || 0,
            tempFacilitiesPerDay: getVal('gcTempFacPerDay') || 0,
            tempConstructionLump: 0,
            tempConstructionPerDay: 0,
            smallToolsPct: getVal('gcSmallToolsPct') || 0,
            safetyPpePct: getVal('gcSafetyPct') || 0,
            qcTestingLump: getVal('gcQcLump') || 0,
            cleanupLump: getVal('gcCleanupLump') || 0
        },
        homeOfficeOverheadPct: getVal('homeOfficeOhPct') || 0,
        bondsInsurance: {
            bondRatePct: getVal('bondRatePct') || 0,
            glInsurancePct: getVal('glInsurancePct') || 0,
            wcRatePct: getVal('wcRatePct') || 0,
            permitFeesLump: getVal('permitFeesLump') || 0,
            prevailingWageLump: getVal('prevailingWageLump') || 0
        },
        contingency: {
            estimateClass: { id: 3, label: 'Class 3' },
            identifiedRisksTotal: 0,
            unidentifiedAllowancePct: getVal('contingencyPct') || 0,
            manualOverride: null
        }
    });

    // v4.0: Collect scope assumptions
    const scopeAssumptions = {};
    for (const item of SCOPE_ITEMS) {
        const el = document.querySelector(`input[name="scope_${item.id}"]:checked`);
        scopeAssumptions[item.id] = el ? el.value : item.default;
    }

    // v4.0: Collect reviewer notes
    const reviewerNotes = {
        general: getTextVal('noteGeneral'),
        pricing: getTextVal('notePricing'),
        schedule: getTextVal('noteSchedule'),
        risk: getTextVal('noteRisk'),
    };

    estimate = new Estimate({
        projectName: getTextVal('projectName'),
        activities,
        indirectCosts,
        projectSettings: {
            complexityVal, asphaltWaste, aggregateWaste, swellFactor, truckEfficiency, tackAppRate,
            fuelIndex: getTextVal('fuelIndex'),
            acIndex: getTextVal('acIndex')
        },
        // v4.0 additions
        jobMode: currentJobMode,
        shiftSettings: {
            stdShift: getVal('stdShift') || 8,
            maxShift: getVal('maxShift') || 12,
        },
        weatherDays: getVal('weatherDays') || 2,
        travelHours: getVal('travelHours') || 1,
        clusterMode: isChecked('clusterMode'),
        scopeAssumptions,
        reviewerNotes,
    });

    return estimate;
}

// ---- Custom trucking calculation that handles overrides ----

function calculateWithTruckingOverrides(est, truckingRate) {
    // The standard Calculator uses Activity.calculateTrucking which uses quantity.grossQuantity.
    // For paving, trucking uses different quantities (loose CY for exc, tons for HMA/milling).
    // We handle this by patching the trucking results after calculation.

    const results = calculator.calculate(est, truckingRate);
    const benchmarks = BENCHMARKS[est.jobMode] || BENCHMARKS.parking_lot;

    // Patch trucking for activities with overrides
    for (const ar of results.activities) {
        const activity = est.getActivity(ar.id);
        if (!activity) continue;

        if (activity._truckingQuantityOverride && activity.trucking) {
            const t = activity.trucking;
            const totalQty = activity._truckingQuantityOverride;
            const duration = ar.duration;

            if (duration > 0 && totalQty > 0) {
                const dailyQty = totalQty / duration;
                const loadsPerDay = dailyQty / t.truckCapacity;
                const efficiency = t.efficiency || 0.90;
                const trucks = Math.ceil((loadsPerDay * t.cycleTime) / (CONSTANTS.WORKDAY_MINUTES * efficiency));
                const truckHours = Math.ceil(trucks * duration * CONSTANTS.WORKDAY_HOURS);
                const truckCost = truckHours * truckingRate;

                // Update results
                results.totalTruckingCost += (truckCost - ar.truckingCost);
                results.totalTruckHours += (truckHours - ar.truckHours);
                ar.trucks = trucks;
                ar.truckHours = truckHours;
                ar.truckingCost = truckCost;
                ar.directCost = ar.laborCost + ar.equipmentCost + ar.materialCost + ar.mobilizationCost + ar.truckingCost;

                // Recalculate unit cost with corrected trucking
                // Use CY denominator for excavation/DGA, SY for all others
                const bm = benchmarks[activity.activityType];
                const useCY = bm && bm.unit === 'CY';
                const denom = useCY ? ar.grossQuantity : (activity.quantity?.inputs?.area || ar.grossQuantity);
                const prodCost = ar.laborCost + ar.equipmentCost + ar.materialCost + ar.truckingCost;
                ar.unitCost = denom > 0 ? prodCost / denom : 0;
                ar.unitCostUOM = useCY ? 'CY' : 'SY';
            }
        }

        // Attach _extra for renderer
        ar._extra = activity._extra;
    }

    // Recalculate direct cost total
    results.directCostTotal = results.activities.reduce((sum, ar) =>
        sum + ar.laborCost + ar.equipmentCost + ar.materialCost + ar.mobilizationCost + ar.truckingCost, 0);

    // Recalculate indirect costs with corrected direct cost
    const laborCostForIndirect = results.totalLaborCost + results.totalEquipmentCost;
    const indirectResults = est.indirectCosts.calculate(
        results.directCostTotal, laborCostForIndirect, results.projectDuration
    );
    Object.assign(results, indirectResults);

    // Recalculate unit checks with corrected unit costs
    results.unitChecks = results.activities
        .filter(a => a.duration > 0 && a.unitCost > 0)
        .map(a => {
            const bm = benchmarks[a.activityType];
            if (!bm) return null;
            const status = _getUnitCostStatus(a.unitCost, bm);
            return {
                activityType: a.activityType,
                description: a.description,
                unitCost: a.unitCost,
                unitCostUOM: a.unitCostUOM || 'SY',
                p25: bm.p25,
                median: bm.median,
                p75: bm.p75,
                n: bm.n,
                basis: bm.basis,
                unit: bm.unit || 'SY',
                status,
            };
        })
        .filter(Boolean);

    // Recalculate confidence with corrected unit costs
    results.confidenceScore = calculateConfidence({
        activities: results.activities,
        jobMode: est.jobMode,
    });
    est.confidenceScore = results.confidenceScore;

    // Recalculate analysis with corrected data
    results.analysisResults = generateAnalysis({
        activities: results.activities,
        jobMode: est.jobMode,
        clusterResults: results.clusterResults,
        scopeAssumptions: est.scopeAssumptions,
        totalHMATons: results.totalHMATons,
    });
    est.analysisResults = results.analysisResults;

    // Validation
    results.validationWarnings = validator.validate(results, est);

    return results;
}

// ---- Main Calculate Function ----

function calculateAll() {
    const est = buildEstimateFromUI();
    const truckingRate = getVal('rateTrucking');
    const results = calculateWithTruckingOverrides(est, truckingRate);
    Renderer.renderResults(results, est);
}

// ---- UI Event Handlers ----

function autoCalcCheck() {
    if (isChecked('autoCalc')) {
        calculateAll();
    }
}

function convertSfToSy() {
    const sf = getVal('sqFeetInput');
    document.getElementById('sqYardsResult').value = sf ? (sf / 9).toFixed(2) : '0';
}

function togglePanel(btn, contentId) {
    btn.classList.toggle('open');
    document.getElementById(contentId).classList.toggle('open');
}

function saveRates() {
    const rates = {};
    const rateIds = [
        'rate95HMA', 'rate19HMA', 'rateDGA', 'rateTack', 'tackAppRate',
        'fuelIndex', 'acIndex', 'rateTrucking',
        'rateCrewExc', 'rateCrewFG', 'rateCrewDGA', 'rateCrewMill', 'rateCrewBase', 'rateCrewSurf',
        'mobExc', 'mobFG', 'mobDGA', 'mobMill', 'mobBase', 'mobSurf'
    ];
    for (const id of rateIds) {
        const el = document.getElementById(id);
        if (el) rates[id] = el.value;
    }

    // Also save v4.0 settings
    const settings = {
        jobMode: currentJobMode,
        stdShift: getVal('stdShift') || 8,
        maxShift: getVal('maxShift') || 12,
        weatherDays: getVal('weatherDays'),
        travelHours: getVal('travelHours'),
        clusterMode: isChecked('clusterMode'),
    };

    const ratesSaved = store.saveRatesLegacy(rates);
    store.saveSettings(settings);

    if (ratesSaved) {
        Renderer.showToast('Rates & settings saved!');
    } else {
        Renderer.showToast('Unable to save — storage may be full');
    }
}

function loadRates() {
    const rates = store.loadRatesLegacy();
    if (rates) {
        for (const [key, val] of Object.entries(rates)) {
            const el = document.getElementById(key);
            if (el) el.value = val;
        }
        Renderer.showToast('Rates loaded!');
        autoCalcCheck();
    } else {
        Renderer.showToast('No saved rates found');
    }
}

function clearSavedRates() {
    if (store.clearRatesLegacy()) {
        Renderer.showToast('Saved rates cleared');
    }
}

function resetForm() {
    if (!confirm('Clear all inputs? This cannot be undone.')) return;

    document.querySelectorAll('input[type="number"]:not([id^="rate"]):not([id^="mob"]):not([id="markupPercent"]):not([id="tackAppRate"])').forEach(input => {
        if (!input.readOnly && !input.id.includes('rate') && !input.id.includes('mob') && !input.id.startsWith('gc') && !input.id.startsWith('homeOffice') && !input.id.startsWith('bond') && !input.id.startsWith('gl') && !input.id.startsWith('wc') && !input.id.startsWith('permit') && !input.id.startsWith('prevailing') && !input.id.startsWith('contingency')) {
            input.value = '';
        }
    });
    document.getElementById('projectName').value = '';
    document.getElementById('tackArea').value = '';

    document.querySelectorAll('select').forEach(select => {
        if (!select.id.includes('Modifier') && !select.id.includes('Waste') &&
            !select.id.includes('Swell') && !select.id.includes('Efficiency') &&
            !select.id.includes('CrewSize')) {
            select.selectedIndex = 0;
        }
    });

    calculateAll();
    Renderer.showToast('Form reset');
}

function exportResults(mode) {
    if (!estimate || !estimate.results) {
        calculateAll();
    }
    const results = estimate?.results;
    if (!results) {
        Renderer.showToast('Calculate first to export');
        return;
    }

    const settings = {
        fuelIndex: getTextVal('fuelIndex'),
        acIndex: getTextVal('acIndex')
    };

    switch (mode) {
        case 'json': {
            const json = ExportService.generateJSONExport(estimate, results);
            const filename = (estimate.projectName || 'estimate').replace(/\s+/g, '_') + '.json';
            ExportService.downloadAsFile(json, filename, 'application/json');
            Renderer.showToast('JSON downloaded!');
            break;
        }
        case 'print':
            ExportService.triggerPrint();
            break;
        case 'quick': {
            const quick = ExportService.generateQuickReport(estimate, results, settings);
            ExportService.copyToClipboard(quick).then(() => {
                Renderer.showToast('Quick summary copied!');
            });
            break;
        }
        case 'full':
        default: {
            const report = ExportService.generateFullReport(estimate, results, settings);
            ExportService.copyToClipboard(report).then(() => {
                Renderer.showToast('Full report copied!');
            });
            break;
        }
    }
}

// ---- v4.0 Job Mode Toggle ----

function setJobMode(mode) {
    currentJobMode = mode;
    document.getElementById('pillParkingLot').classList.toggle('active', mode === 'parking_lot');
    document.getElementById('pillRoadway').classList.toggle('active', mode === 'roadway');
    autoCalcCheck();
}

// ---- v4.0 Scope Grid Initialization ----

function initScopeGrid() {
    const grid = document.getElementById('scopeGrid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const item of SCOPE_ITEMS) {
        const row = document.createElement('div');
        row.className = 'scope-row';

        const label = document.createElement('span');
        label.className = 'scope-label';
        label.textContent = item.name;

        const pills = document.createElement('div');
        pills.className = 'scope-pills';

        for (const val of ['included', 'excluded', 'na']) {
            const id = `scope_${item.id}_${val}`;
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `scope_${item.id}`;
            input.id = id;
            input.value = val;
            if (val === item.default) input.checked = true;

            const lbl = document.createElement('label');
            lbl.htmlFor = id;
            lbl.className = `scope-pill scope-${val}`;
            lbl.textContent = val === 'na' ? 'N/A' : val.charAt(0).toUpperCase() + val.slice(1);

            pills.appendChild(input);
            pills.appendChild(lbl);
        }

        row.appendChild(label);
        row.appendChild(pills);
        grid.appendChild(row);
    }
}

function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    if (menu) menu.classList.toggle('open');
}

// Close export menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('exportMenu');
    const dropdown = e.target.closest('.export-dropdown');
    if (menu && !dropdown) menu.classList.remove('open');
});

// ---- Expose functions to HTML onclick handlers ----
window.calculateAll = calculateAll;
window.autoCalcCheck = autoCalcCheck;
window.convertSfToSy = convertSfToSy;
window.togglePanel = togglePanel;
window.saveRates = saveRates;
window.loadRates = loadRates;
window.clearSavedRates = clearSavedRates;
window.resetForm = resetForm;
window.exportResults = exportResults;
window.toggleExportMenu = toggleExportMenu;
window.setJobMode = setJobMode;

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', function () {
    // Load saved rates (backward compatible)
    const rates = store.loadRatesLegacy();
    if (rates) {
        for (const [key, val] of Object.entries(rates)) {
            const el = document.getElementById(key);
            if (el) el.value = val;
        }
    }

    // Load v4.0 settings
    const savedSettings = store.loadSettings();
    if (savedSettings) {
        if (savedSettings.jobMode) setJobMode(savedSettings.jobMode);
        if (savedSettings.stdShift) document.getElementById('stdShift').value = savedSettings.stdShift;
        if (savedSettings.maxShift) document.getElementById('maxShift').value = savedSettings.maxShift;
        if (savedSettings.weatherDays != null) document.getElementById('weatherDays').value = savedSettings.weatherDays;
        if (savedSettings.travelHours != null) document.getElementById('travelHours').value = savedSettings.travelHours;
        if (savedSettings.clusterMode != null) document.getElementById('clusterMode').checked = savedSettings.clusterMode;
    }

    // Initialize scope grid
    initScopeGrid();
});
