// ============================================
// Paving Trade Defaults
// Default resources, crews, production rates, activities, WBS, and dependencies
// All values are data (not code) per Tier 6.4
// ============================================

import { Resource, ResourceType, SourceRank } from '../models/Resource.js';
import { ProductionRate } from '../models/ProductionRate.js';
import { Crew } from '../models/Crew.js';
import { ProductivityFactor } from '../models/ProductivityFactor.js';
import { Quantity } from '../models/Quantity.js';
import { Activity, DependencyType, DependencySource } from '../models/Activity.js';
import { WorkPackage } from '../models/WorkPackage.js';
import { RiskItem, RiskType } from '../models/RiskRegister.js';
import { CONSTANTS } from './constants.js';

// ============================================
// PRODUCTION RATE OPTIONS
// Dropdown values matching current app
// ============================================

export const RATE_OPTIONS = {
    excavation: [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1300, 1500, 2000],
    fine_grading: [500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 8000],
    dga_base: [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 1000, 1200],
    milling: [500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 14000, 18000, 25000],
    paving_base: [500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 8000],
    paving_surface: [500, 750, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 8000]
};

// ============================================
// CREW SIZE OPTIONS
// Dropdown values matching current app
// ============================================

export const CREW_SIZE_OPTIONS = {
    excavation: [1, 2, 3, 4, 5, 6, 8, 10],
    fine_grading: [1, 2, 3, 4, 5, 6],
    dga_base: [1, 2, 3, 4, 5, 6, 8, 10],
    milling: [2, 3, 4, 5, 6, 8, 10],
    paving_base: [2, 3, 4, 5, 6, 8, 10, 12],
    paving_surface: [2, 3, 4, 5, 6, 8, 10, 12]
};

export const DEFAULT_CREW_SIZES = {
    excavation: 3,
    fine_grading: 2,
    dga_base: 3,
    milling: 4,
    paving_base: 6,
    paving_surface: 6
};

// ============================================
// WASTE FACTOR OPTIONS
// ============================================

export const WASTE_FACTOR_OPTIONS = {
    asphalt: [
        { value: 1.05, label: '5%' },
        { value: 1.07, label: '7%' },
        { value: 1.10, label: '10%' }
    ],
    aggregate: [
        { value: 1.05, label: '5%' },
        { value: 1.07, label: '7%' },
        { value: 1.10, label: '10%' }
    ]
};

export const SWELL_FACTOR_OPTIONS = [
    { value: 1.15, label: '15%' },
    { value: 1.25, label: '25%' },
    { value: 1.35, label: '35%' }
];

export const EFFICIENCY_OPTIONS = [
    { value: 1.00, label: '100%' },
    { value: 0.90, label: '90%' },
    { value: 0.85, label: '85%' }
];

// ============================================
// DUAL-MODE PRODUCTION RATES (SY/day)
// Parking Lot: from historical production data medians
// Roadway: from WisDOT Production Rate Table
// ============================================

export const PRODUCTION_RATES = {
    parking_lot: {
        excavation:     150,
        fine_grading:  3500,
        dga_base:      2500,
        milling:       3300,
        paving_base:   1200,
        paving_surface: 3500,
        tack_coat:     5000,
    },
    roadway: {
        excavation:     300,
        fine_grading:  8000,
        dga_base:      4000,
        milling:      14000,
        paving_base:   3500,
        paving_surface: 6000,
        tack_coat:    10000,
    }
};

// ============================================
// HISTORICAL BENCHMARKS
// Excavation & DGA: $/CY (volume-driven, depth-independent)
// All others: $/SY (area-driven)
// Historical bid data for parking lot
// WisDOT FY2024 Average Unit Price List for roadway
// ============================================

export const BENCHMARKS = {
    parking_lot: {
        excavation:     { p25: 12.00, median: 18.00, p75: 28.00, n: 19,  basis: 'empirical', unit: 'CY' },
        fine_grading:   { p25:  0.77, median:  0.92, p75:  1.12, n: 507, basis: 'empirical', unit: 'SY' },
        dga_base:       { p25: 35.00, median: 50.00, p75: 70.00, n: 103, basis: 'empirical', unit: 'CY' },
        milling:        { p25:  2.95, median:  3.64, p75:  4.58, n: 516, basis: 'empirical', unit: 'SY' },
        paving_base:    { p25: 22.31, median: 28.10, p75: 35.26, n: 162, basis: 'empirical', unit: 'SY' },
        paving_surface: { p25: 10.30, median: 11.09, p75: 12.25, n: 163, basis: 'empirical', unit: 'SY' },
        tack_coat:      { p25:  0.15, median:  0.22, p75:  0.35, n: 0,   basis: 'derived',   unit: 'SY' },
    },
    roadway: {
        excavation:     { p25:  8.00, median: 12.00, p75: 20.00, n: 0, basis: 'derived', unit: 'CY' },
        fine_grading:   { p25:  0.60, median:  0.85, p75:  1.20, n: 0, basis: 'derived', unit: 'SY' },
        dga_base:       { p25: 30.00, median: 42.00, p75: 60.00, n: 0, basis: 'derived', unit: 'CY' },
        milling:        { p25:  1.50, median:  1.82, p75:  2.50, n: 0, basis: 'derived', unit: 'SY' },
        paving_base:    { p25:  8.00, median: 11.50, p75: 16.00, n: 0, basis: 'derived', unit: 'SY' },
        paving_surface: { p25:  6.00, median:  8.50, p75: 12.00, n: 0, basis: 'derived', unit: 'SY' },
        tack_coat:      { p25:  0.10, median:  0.18, p75:  0.30, n: 0, basis: 'derived', unit: 'SY' },
    }
};

// ============================================
// QUANTITY RANGES (SY) — typical job sizes
// ============================================

export const QTY_RANGES = {
    parking_lot: {
        excavation:     { low:   50, high:  2000 },
        fine_grading:   { low:  500, high: 15000 },
        dga_base:       { low:  200, high: 12000 },
        milling:        { low:  500, high: 20000 },
        paving_base:    { low:  200, high: 12000 },
        paving_surface: { low:  500, high: 25000 },
        tack_coat:      { low:  500, high: 25000 },
    },
    roadway: {
        excavation:     { low:  200, high: 10000 },
        fine_grading:   { low: 2000, high: 50000 },
        dga_base:       { low: 1000, high: 30000 },
        milling:        { low: 2000, high: 80000 },
        paving_base:    { low: 1000, high: 30000 },
        paving_surface: { low: 2000, high: 80000 },
        tack_coat:      { low: 2000, high: 80000 },
    }
};

// ============================================
// RATE CONFIDENCE — per-activity production rate reliability
// band: ± percentage, score: 0-1 base confidence
// ============================================

export const RATE_CONFIDENCE = {
    excavation:     { band: 35, score: 0.65 },
    fine_grading:   { band: 15, score: 0.85 },
    dga_base:       { band: 25, score: 0.75 },
    milling:        { band: 15, score: 0.85 },
    paving_base:    { band: 20, score: 0.80 },
    paving_surface: { band: 15, score: 0.85 },
    tack_coat:      { band: 10, score: 0.90 },
};

// ============================================
// CREW DATA — standard paving crew compositions
// ============================================

export const CREW_DATA = {
    BHOEX:  { rate: 203.65, people: 3,  desc: 'Backhoe Excavation',      activities: ['excavation'] },
    DGAFG:  { rate: 241.00, people: 4,  desc: 'DGA/Fine Grade w/ Grader', activities: ['fine_grading', 'dga_base'] },
    DGAST:  { rate: 184.00, people: 4,  desc: 'DGA/Fine Grade w/ Dozer',  activities: ['fine_grading', 'dga_base'] },
    FLEX3:  { rate: 200.78, people: 3,  desc: 'Flex Pave Crew 3-Man',     activities: ['paving_base', 'paving_surface'] },
    FLEX5:  { rate: 271.48, people: 5,  desc: 'Flex Pave Crew 5-Man',     activities: ['paving_base', 'paving_surface'] },
    PV8:    { rate: 400.75, people: 8,  desc: 'Paving Crew 8-Man',        activities: ['paving_base', 'paving_surface'] },
    PV10:   { rate: 471.85, people: 10, desc: 'Paving Crew 10-Man',       activities: ['paving_base', 'paving_surface'] },
    ML7:    { rate: 648.83, people: 8,  desc: 'Milling Crew 7ft',         activities: ['milling'] },
    COMBO:  { rate: 564.28, people: 11, desc: 'Mill + Pave Combo',        activities: ['milling', 'paving_base', 'paving_surface'] },
    TACK:   { rate:  61.35, people: 1,  desc: 'Tack Coat',                activities: ['tack_coat'] },
    MOBL:   { rate: 297.25, people: 2,  desc: 'Mobilization (2 Lowboys)', activities: [] },
    MOBS:   { rate: 188.73, people: 1,  desc: 'Mobilization (1 Lowboy)',  activities: [] },
    SAFE:   { rate: 130.39, people: 1,  desc: 'Safety / Traffic Control', activities: [] },
};

// ============================================
// CREW AUTO-SELECTION THRESHOLDS (total job SY)
// ============================================

export const CREW_THRESHOLDS = {
    paving: [
        { maxSY:   200,      crew: 'FLEX3' },
        { maxSY:  1000,      crew: 'FLEX5' },
        { maxSY:  5000,      crew: 'PV8' },
        { maxSY: Infinity,   crew: 'PV10' },
    ],
    milling: [
        { maxSY: Infinity,   crew: 'ML7' },
    ],
    excavation: [
        { maxSY: Infinity,   crew: 'BHOEX' },
    ],
    fine_grading: [
        { maxSY: Infinity,   crew: 'DGAFG' },
    ],
    dga_base: [
        { maxSY: Infinity,   crew: 'DGAFG' },
    ],
    tack_coat: [
        { maxSY: Infinity,   crew: 'TACK' },
    ],
};

// ============================================
// CREW CLUSTERS — shared mobilization groupings
// ============================================

export const CREW_CLUSTERS = {
    earthwork: {
        activities: ['excavation', 'fine_grading', 'dga_base'],
        mobCrew: 'MOBS',
        desc: 'Earthwork',
    },
    milling: {
        activities: ['milling'],
        mobCrew: 'MOBL',
        desc: 'Milling',
    },
    paving: {
        activities: ['paving_base', 'paving_surface', 'tack_coat'],
        mobCrew: 'MOBL',
        desc: 'Paving',
    },
    combo: {
        activities: ['milling', 'paving_base', 'paving_surface', 'tack_coat'],
        mobCrew: 'MOBL',
        desc: 'Mill + Pave Combo',
    },
};

// ============================================
// SCOPE EXCLUSIONS/ASSUMPTIONS CHECKLIST
// ============================================

export const SCOPE_ITEMS = [
    { id: 'sawcutting',      name: 'Sawcutting',                        default: 'included' },
    { id: 'barricading',     name: 'Barricading / Coning',              default: 'included' },
    { id: 'hauling',         name: 'Material Hauling & Delivery',       default: 'included' },
    { id: 'traffic_control', name: 'Traffic Control (Flagging/MOT)',    default: 'excluded' },
    { id: 'permits',         name: 'Permits & Fees',                    default: 'excluded' },
    { id: 'survey',          name: 'Survey / Layout / Staking',         default: 'excluded' },
    { id: 'testing',         name: 'Quality Testing / Nuclear Gauge',   default: 'excluded' },
    { id: 'disposal',        name: 'Off-site Disposal',                 default: 'excluded' },
    { id: 'premium',         name: 'Night / Weekend Premium',           default: 'excluded' },
    { id: 'temp_markings',   name: 'Temporary Pavement Markings',       default: 'excluded' },
    { id: 'concrete',        name: 'Concrete Work (Curb/Sidewalk)',     default: 'excluded' },
    { id: 'landscaping',     name: 'Landscaping Restoration',           default: 'excluded' },
    { id: 'utilities',       name: 'Utility Adjustments',               default: 'excluded' },
    { id: 'geotextile',      name: 'Geotextile / Fabric',              default: 'excluded' },
];

// ============================================
// CONFIDENCE WEIGHTS
// ============================================

export const CONFIDENCE_WEIGHTS = {
    productionReliability: 0.35,
    benchmarkAlignment:    0.30,
    scopeDefinition:       0.20,
    dataQuality:           0.15,
};

// ============================================
// THREE-TIER MULTIPLIERS
// ============================================

export const TIER_MULTIPLIERS = {
    conservative: 0.80,
    standard:     1.00,
    aggressive:   1.20,
};

// ============================================
// DEFAULT PAVING DEPENDENCIES
// Standard paving sequence (Tier 3.1)
// ============================================

export const DEFAULT_DEPENDENCIES = {
    'FG-001': [
        { predecessorId: 'EXC-001', type: DependencyType.FS, lag: 0, source: DependencySource.PHYSICAL }
    ],
    'DGA-001': [
        { predecessorId: 'FG-001', type: DependencyType.FS, lag: 0, source: DependencySource.PHYSICAL }
    ],
    'PAVE-001': [
        { predecessorId: 'DGA-001', type: DependencyType.FS, lag: 0, source: DependencySource.PHYSICAL },
        { predecessorId: 'MILL-001', type: DependencyType.FS, lag: 0, source: DependencySource.PHYSICAL }
    ],
    'TACK-001': [
        { predecessorId: 'PAVE-001', type: DependencyType.FS, lag: 0, source: DependencySource.PHYSICAL }
    ],
    'PAVE-002': [
        { predecessorId: 'TACK-001', type: DependencyType.FS, lag: 0, source: DependencySource.PHYSICAL }
    ]
};

// ============================================
// DEFAULT WBS STRUCTURE
// ============================================

export const DEFAULT_WBS = [
    {
        id: 'WP-EARTH',
        name: 'Earthwork',
        wbsCode: '01',
        activityIds: ['EXC-001', 'FG-001'],
        inclusions: ['Removal of existing subgrade material', 'Fine grading to design elevations'],
        exclusions: ['Rock excavation', 'Dewatering', 'Erosion control'],
        interfaces: ['Grading follows excavation; DGA follows grading'],
        assumptions: ['Common earth — no rock', 'Dry conditions', 'Material disposed off-site']
    },
    {
        id: 'WP-AGG',
        name: 'Aggregate Base',
        wbsCode: '02',
        activityIds: ['DGA-001'],
        inclusions: ['DGA base placement and compaction'],
        exclusions: ['Geotextile fabric', 'Underdrain'],
        interfaces: ['Follows earthwork; precedes paving'],
        assumptions: ['Material from local quarry', 'Compaction to 95% standard Proctor']
    },
    {
        id: 'WP-MILL',
        name: 'Milling',
        wbsCode: '03',
        activityIds: ['MILL-001'],
        inclusions: ['Cold milling of existing asphalt surface'],
        exclusions: ['Full-depth removal', 'Concrete removal'],
        interfaces: ['Independent of earthwork chain; precedes paving'],
        assumptions: ['RAP hauled to designated stockpile', 'Milling depth as specified']
    },
    {
        id: 'WP-PAVE',
        name: 'Asphalt Paving',
        wbsCode: '04',
        activityIds: ['PAVE-001', 'TACK-001', 'PAVE-002'],
        inclusions: ['Base course paving', 'Tack coat application', 'Surface course paving'],
        exclusions: ['Pavement markings', 'Curb and gutter'],
        interfaces: ['Follows milling and aggregate base; final scope item'],
        assumptions: ['HMA from approved plant within cycle time distance', 'Minimum paving temperature met']
    }
];

// ============================================
// ACTIVITY CONFIGURATION MAP
// Maps activity type keys to their properties
// ============================================

export const ACTIVITY_CONFIG = {
    excavation: {
        id: 'EXC-001',
        description: 'Excavation',
        wbsCode: '01.01',
        colorClass: 'red',
        quantityUOM: 'CY',
        rateUOM: 'CY',
        hasDepth: true,
        hasCycleTime: true,
        hasMaterial: false,
        truckCapacity: CONSTANTS.TRUCK_CY,
        truckCapacityUOM: 'CY',
        quantityCalc: (area, depth, wasteFactor, swellFactor) => {
            const bankCY = area && depth ? Math.ceil(area * depth / 324) : 0;
            const looseCY = Math.ceil(bankCY * swellFactor);
            const tons = Math.ceil(bankCY * CONSTANTS.SOIL_DENSITY);
            return { netQuantity: bankCY, looseCY, tons, uomId: 'CY' };
        },
        // For trucking, use loose CY (what actually goes on the truck)
        truckingQuantityKey: 'looseCY'
    },
    fine_grading: {
        id: 'FG-001',
        description: 'Fine Grading',
        wbsCode: '01.02',
        colorClass: 'purple',
        quantityUOM: 'SY',
        rateUOM: 'SY',
        hasDepth: false,
        hasCycleTime: false,
        hasMaterial: false,
        quantityCalc: (area) => {
            return { netQuantity: area || 0, uomId: 'SY' };
        }
    },
    dga_base: {
        id: 'DGA-001',
        description: 'DGA Base',
        wbsCode: '02.01',
        colorClass: 'yellow',
        quantityUOM: 'CY',
        rateUOM: 'CY',
        hasDepth: true,
        hasCycleTime: true,
        hasMaterial: true,
        materialId: 'M-003',
        truckCapacity: CONSTANTS.TRUCK_CY,
        truckCapacityUOM: 'CY',
        quantityCalc: (area, depth, wasteFactor) => {
            const cy = area && depth ? Math.ceil(area * depth / 324) : 0;
            const tons = Math.ceil(cy * CONSTANTS.DGA_DENSITY);
            const tonsWithWaste = Math.ceil(tons * wasteFactor);
            return { netQuantity: cy, tons, tonsWithWaste, uomId: 'CY', wasteFactor };
        },
        truckingQuantityKey: 'netQuantity'
    },
    milling: {
        id: 'MILL-001',
        description: 'Milling',
        wbsCode: '03.01',
        colorClass: 'pink',
        quantityUOM: 'SY',
        rateUOM: 'SY',
        hasDepth: true,
        hasCycleTime: true,
        hasMaterial: false,
        truckCapacity: CONSTANTS.TRUCK_TONS,
        truckCapacityUOM: 'TON',
        quantityCalc: (area, depth) => {
            const rapTons = area && depth ? Math.ceil(area * depth * CONSTANTS.RAP_FACTOR) : 0;
            return { netQuantity: area || 0, rapTons, uomId: 'SY' };
        },
        truckingQuantityKey: 'rapTons'
    },
    paving_base: {
        id: 'PAVE-001',
        description: '19mm Base Course',
        wbsCode: '04.01',
        colorClass: 'blue',
        quantityUOM: 'SY',
        rateUOM: 'SY',
        hasDepth: true,
        hasCycleTime: true,
        hasMaterial: true,
        materialId: 'M-002',
        truckCapacity: CONSTANTS.TRUCK_TONS,
        truckCapacityUOM: 'TON',
        quantityCalc: (area, depth, wasteFactor) => {
            const tons = area && depth ? Math.ceil(area * depth * CONSTANTS.HMA_FACTOR) : 0;
            const tonsWithWaste = Math.ceil(tons * wasteFactor);
            return { netQuantity: area || 0, tons, tonsWithWaste, uomId: 'SY', wasteFactor };
        },
        truckingQuantityKey: 'tonsWithWaste'
    },
    paving_surface: {
        id: 'PAVE-002',
        description: '9.5mm Surface Course',
        wbsCode: '04.03',
        colorClass: 'green',
        quantityUOM: 'SY',
        rateUOM: 'SY',
        hasDepth: true,
        hasCycleTime: true,
        hasMaterial: true,
        materialId: 'M-001',
        truckCapacity: CONSTANTS.TRUCK_TONS,
        truckCapacityUOM: 'TON',
        quantityCalc: (area, depth, wasteFactor) => {
            const tons = area && depth ? Math.ceil(area * depth * CONSTANTS.HMA_FACTOR) : 0;
            const tonsWithWaste = Math.ceil(tons * wasteFactor);
            return { netQuantity: area || 0, tons, tonsWithWaste, uomId: 'SY', wasteFactor };
        },
        truckingQuantityKey: 'tonsWithWaste'
    },
    tack_coat: {
        id: 'TACK-001',
        description: 'Tack Coat',
        wbsCode: '04.02',
        colorClass: 'teal',
        quantityUOM: 'SY',
        rateUOM: 'SY',
        hasDepth: false,
        hasCycleTime: false,
        hasMaterial: true,
        materialId: 'M-004',
        quantityCalc: (area, _depth, _waste, _swell, tackAppRate) => {
            const gallons = area ? Math.ceil(area * (tackAppRate || 0.05)) : 0;
            return { netQuantity: area || 0, gallons, uomId: 'SY', tackAppRate: tackAppRate || 0.05 };
        }
    }
};

// ============================================
// DEFAULT RISK TEMPLATES
// ============================================

export const DEFAULT_RISK_TEMPLATES = [
    new RiskItem({
        id: 'R-001', description: 'Rock encountered in excavation',
        probability: 0.10, impactMin: 2000, impactMostLikely: 10000, impactMax: 50000,
        affectedWBS: ['01'], riskType: RiskType.SCOPE
    }),
    new RiskItem({
        id: 'R-002', description: 'Weather delays (rain/cold shutdown)',
        probability: 0.20, impactMin: 500, impactMostLikely: 3000, impactMax: 10000,
        affectedWBS: ['01', '02', '03', '04'], riskType: RiskType.SCHEDULE
    }),
    new RiskItem({
        id: 'R-003', description: 'Asphalt material price increase',
        probability: 0.15, impactMin: 1000, impactMostLikely: 5000, impactMax: 15000,
        affectedWBS: ['04'], riskType: RiskType.PRICING
    }),
    new RiskItem({
        id: 'R-004', description: 'Subgrade failure requiring undercut',
        probability: 0.08, impactMin: 5000, impactMostLikely: 15000, impactMax: 40000,
        affectedWBS: ['01', '02'], riskType: RiskType.SCOPE
    }),
    new RiskItem({
        id: 'R-005', description: 'Utility conflict / access restriction',
        probability: 0.12, impactMin: 1000, impactMostLikely: 5000, impactMax: 20000,
        affectedWBS: ['01', '03'], riskType: RiskType.PRODUCTION
    })
];
