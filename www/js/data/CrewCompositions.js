/**
 * CrewCompositions.js
 * Detailed crew labor/equipment breakdowns for all CREW_DATA entries.
 *
 * Generated: 2026-03-06
 * Purpose: Addresses Audit Issue #1 (Labor vs Equipment Cost Split).
 *          Provides data for Crew.fromDetailedData() to populate
 *          laborComponents and equipmentComponents arrays.
 *
 * Rate basis:
 *   Labor: Fully burdened open-shop rates (base + benefits + payroll taxes).
 *          Upper Midwest, 2025 dollars. Excludes WC/GL (in IndirectCosts).
 *   Equipment: Ownership + Operating cost/hr (Blue Book / CAT methodology).
 *
 * Sources:
 *   - WI Davis-Bacon WI20240010 (Sep 2024) for prevailing wage reference
 *   - LIUNA Wisconsin Heavy/Highway rates (Jun 2025) for classifications
 *   - FHWA Blue Book methodology for equipment O&O
 *   - Company CREW_DATA composites as reconciliation targets
 *
 * Source rank: 4 (first-principles / derived from composites + industry data)
 *
 * NOTE: These are DERIVED estimates (Source Rank 4). To upgrade to Rank 1-2,
 * export HeavyBid Category 1 (Labor) and Category 8 (Equipment) resource
 * lists which contain actual company payroll and equipment fleet costs.
 */

// Labor classification reference (informational; not consumed by calc engine)
const LABOR_CLASSIFICATIONS = Object.freeze({
    FOREMAN:  { label: 'Working Foreman',                 baseWage: 34.00, burdenPct: 0.53 },
    OPER_HVY: { label: 'Heavy Equipment Operator',        baseWage: 30.00, burdenPct: 0.53 },
    OPER_LT:  { label: 'Light Equipment Operator',        baseWage: 25.00, burdenPct: 0.52 },
    LAB_BIT:  { label: 'Bituminous Laborer (Raker/Lute)', baseWage: 18.50, burdenPct: 0.51 },
    LABORER:  { label: 'General Laborer',                 baseWage: 20.00, burdenPct: 0.50 },
    FLAGGER:  { label: 'Flagger / Traffic Control',       baseWage: 23.00, burdenPct: 0.52 },
});

const CREW_COMPOSITIONS = Object.freeze({

    BHOEX: Object.freeze({
        crewCode: 'BHOEX',
        description: 'Backhoe Excavation',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Backhoe Operator', classification: 'OPER_HVY', rate: 48.00, count: 1 }),
            Object.freeze({ name: 'Laborer', classification: 'LABORER', rate: 30.00, count: 2 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Backhoe (Cat 320F class, ~50,000 lb)', code: 'EQ-BH320', rate: 72.0, count: 1 }),
            Object.freeze({ name: 'Plate Compactor / Support Equip', code: 'EQ-MISC', rate: 23.65, count: 1 }),
        ]),
        totalRate: 203.65,
        laborRate: 108.00,
        equipmentRate: 95.65,
        people: 3,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    DGAFG: Object.freeze({
        crewCode: 'DGAFG',
        description: 'DGA/Fine Grade w/ Grader',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Grader Operator', classification: 'OPER_HVY', rate: 48.00, count: 1 }),
            Object.freeze({ name: 'Laborer', classification: 'LABORER', rate: 30.00, count: 2 }),
            Object.freeze({ name: 'Roller Operator', classification: 'OPER_LT', rate: 35.00, count: 1 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Motor Grader (Cat 120 class)', code: 'EQ-GRD120', rate: 62.0, count: 1 }),
            Object.freeze({ name: 'Vibratory Roller (10-ton SD)', code: 'EQ-VRL10', rate: 28.0, count: 1 }),
            Object.freeze({ name: 'Grade Checker / Misc Tools', code: 'EQ-MISC', rate: 8.0, count: 1 }),
        ]),
        totalRate: 241.00,
        laborRate: 143.00,
        equipmentRate: 98.00,
        people: 4,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    DGAST: Object.freeze({
        crewCode: 'DGAST',
        description: 'DGA/Fine Grade w/ Dozer',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Dozer Operator', classification: 'OPER_HVY', rate: 44.00, count: 1 }),
            Object.freeze({ name: 'Laborer', classification: 'LABORER', rate: 26.00, count: 2 }),
            Object.freeze({ name: 'Roller Operator', classification: 'OPER_LT', rate: 30.00, count: 1 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Dozer (Cat D5 class)', code: 'EQ-DZR5', rate: 40.0, count: 1 }),
            Object.freeze({ name: 'Vibratory Roller (SM, 5-ton)', code: 'EQ-VRL5', rate: 18.0, count: 1 }),
        ]),
        totalRate: 184.00,
        laborRate: 126.00,
        equipmentRate: 58.00,
        people: 4,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    FLEX3: Object.freeze({
        crewCode: 'FLEX3',
        description: 'Flex Pave Crew 3-Man',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Paver Operator', classification: 'OPER_HVY', rate: 46.00, count: 1 }),
            Object.freeze({ name: 'Laborer/Raker', classification: 'LAB_BIT', rate: 30.00, count: 2 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Mini Paver (Cat AP455 class)', code: 'EQ-MPAV', rate: 52.0, count: 1 }),
            Object.freeze({ name: 'Small Roller (3-ton SD)', code: 'EQ-SRL3', rate: 22.0, count: 1 }),
            Object.freeze({ name: 'Hand Tools / Misc', code: 'EQ-MISC', rate: 20.78, count: 1 }),
        ]),
        totalRate: 200.78,
        laborRate: 106.00,
        equipmentRate: 94.78,
        people: 3,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    FLEX5: Object.freeze({
        crewCode: 'FLEX5',
        description: 'Flex Pave Crew 5-Man',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Paver Operator', classification: 'OPER_HVY', rate: 46.00, count: 1 }),
            Object.freeze({ name: 'Screed Operator', classification: 'OPER_LT', rate: 38.00, count: 1 }),
            Object.freeze({ name: 'Laborer/Raker', classification: 'LAB_BIT', rate: 28.00, count: 3 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Paver (Cat AP500 class)', code: 'EQ-PAV500', rate: 60.0, count: 1 }),
            Object.freeze({ name: 'Steel Wheel Roller (8-ton DD)', code: 'EQ-SWR8', rate: 25.48, count: 1 }),
            Object.freeze({ name: 'Hand Tools / Misc', code: 'EQ-MISC', rate: 18.0, count: 1 }),
        ]),
        totalRate: 271.48,
        laborRate: 168.00,
        equipmentRate: 103.48,
        people: 5,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    PV8: Object.freeze({
        crewCode: 'PV8',
        description: 'Paving Crew 8-Man',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Foreman', classification: 'FOREMAN', rate: 52.00, count: 1 }),
            Object.freeze({ name: 'Paver Operator', classification: 'OPER_HVY', rate: 46.00, count: 1 }),
            Object.freeze({ name: 'Laborer/Raker', classification: 'LAB_BIT', rate: 28.00, count: 6 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Paver (Cat AP1055 class)', code: 'EQ-PAV1055', rate: 80.0, count: 1 }),
            Object.freeze({ name: 'Steel Wheel Roller (12-ton DD)', code: 'EQ-SWR12', rate: 30.75, count: 1 }),
            Object.freeze({ name: 'Pneumatic Roller (9-wheel)', code: 'EQ-PR9', rate: 24.0, count: 1 }),
        ]),
        totalRate: 400.75,
        laborRate: 266.00,
        equipmentRate: 134.75,
        people: 8,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    PV10: Object.freeze({
        crewCode: 'PV10',
        description: 'Paving Crew 10-Man',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Foreman', classification: 'FOREMAN', rate: 52.00, count: 1 }),
            Object.freeze({ name: 'Paver Operator', classification: 'OPER_HVY', rate: 46.00, count: 1 }),
            Object.freeze({ name: 'Screed Operator', classification: 'OPER_LT', rate: 44.00, count: 1 }),
            Object.freeze({ name: 'Laborer/Raker', classification: 'LAB_BIT', rate: 28.00, count: 7 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Paver (Cat AP1055 class)', code: 'EQ-PAV1055', rate: 80.0, count: 1 }),
            Object.freeze({ name: 'Steel Wheel Roller (12-ton DD)', code: 'EQ-SWR12', rate: 28.0, count: 1 }),
            Object.freeze({ name: 'Pneumatic Roller (9-wheel)', code: 'EQ-PR9', rate: 25.85, count: 1 }),
        ]),
        totalRate: 471.85,
        laborRate: 338.00,
        equipmentRate: 133.85,
        people: 10,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    ML7: Object.freeze({
        crewCode: 'ML7',
        description: 'Milling Crew 7ft',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Foreman', classification: 'FOREMAN', rate: 52.00, count: 1 }),
            Object.freeze({ name: 'Mill Operator', classification: 'OPER_HVY', rate: 50.00, count: 1 }),
            Object.freeze({ name: 'Laborer', classification: 'LABORER', rate: 28.00, count: 5 }),
            Object.freeze({ name: 'Skid Steer Operator', classification: 'OPER_LT', rate: 38.00, count: 1 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Cold Milling Machine (7ft, Wirtgen W210 class)', code: 'EQ-MILL7', rate: 285.0, count: 1 }),
            Object.freeze({ name: 'Skid Steer Loader', code: 'EQ-SSL', rate: 32.0, count: 1 }),
            Object.freeze({ name: 'Street Sweeper', code: 'EQ-SWP', rate: 51.83, count: 1 }),
        ]),
        totalRate: 648.83,
        laborRate: 280.00,
        equipmentRate: 368.83,
        people: 8,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    COMBO: Object.freeze({
        crewCode: 'COMBO',
        description: 'Mill + Pave Combo',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Foreman', classification: 'FOREMAN', rate: 50.00, count: 1 }),
            Object.freeze({ name: 'Mill Operator', classification: 'OPER_HVY', rate: 48.00, count: 1 }),
            Object.freeze({ name: 'Paver Operator', classification: 'OPER_HVY', rate: 46.00, count: 1 }),
            Object.freeze({ name: 'Laborer/Raker', classification: 'LAB_BIT', rate: 26.00, count: 8 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Cold Milling Machine (4ft, Wirtgen W150 class)', code: 'EQ-MILL4', rate: 105.0, count: 1 }),
            Object.freeze({ name: 'Paver (Cat AP500 class)', code: 'EQ-PAV500', rate: 58.0, count: 1 }),
            Object.freeze({ name: 'Steel Wheel Roller (10-ton DD)', code: 'EQ-SWR10', rate: 25.28, count: 1 }),
            Object.freeze({ name: 'Sweeper (tow-behind)', code: 'EQ-SWPT', rate: 24.0, count: 1 }),
        ]),
        totalRate: 564.28,
        laborRate: 352.00,
        equipmentRate: 212.28,
        people: 11,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    TACK: Object.freeze({
        crewCode: 'TACK',
        description: 'Tack Coat',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Distributor Operator', classification: 'OPER_LT', rate: 40.00, count: 1 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Tack Distributor Truck', code: 'EQ-TDIST', rate: 21.35, count: 1 }),
        ]),
        totalRate: 61.35,
        laborRate: 40.00,
        equipmentRate: 21.35,
        people: 1,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    MOBL: Object.freeze({
        crewCode: 'MOBL',
        description: 'Mobilization (2 Lowboys)',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Lowboy Operator', classification: 'OPER_HVY', rate: 46.00, count: 2 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Lowboy Trailer + Tractor (heavy)', code: 'EQ-LBOY', rate: 102.625, count: 2 }),
        ]),
        totalRate: 297.25,
        laborRate: 92.00,
        equipmentRate: 205.25,
        people: 2,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    MOBS: Object.freeze({
        crewCode: 'MOBS',
        description: 'Mobilization (1 Lowboy)',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Lowboy Operator', classification: 'OPER_HVY', rate: 46.00, count: 1 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Lowboy Trailer + Tractor (heavy-haul)', code: 'EQ-LBOYH', rate: 142.73, count: 1 }),
        ]),
        totalRate: 188.73,
        laborRate: 46.00,
        equipmentRate: 142.73,
        people: 1,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),

    SAFE: Object.freeze({
        crewCode: 'SAFE',
        description: 'Safety / Traffic Control',
        laborComponents: Object.freeze([
            Object.freeze({ name: 'Flagger / TCP', classification: 'FLAGGER', rate: 35.00, count: 1 }),
        ]),
        equipmentComponents: Object.freeze([
            Object.freeze({ name: 'Arrow Board (truck-mounted)', code: 'EQ-ARB', rate: 25.0, count: 1 }),
            Object.freeze({ name: 'Work Truck w/ TMA Crash Cushion', code: 'EQ-TMA', rate: 50.39, count: 1 }),
            Object.freeze({ name: 'Signs / Cones / Channelizers', code: 'EQ-TCSIGN', rate: 20.0, count: 1 }),
        ]),
        totalRate: 130.39,
        laborRate: 35.00,
        equipmentRate: 95.39,
        people: 1,
        source: 'Derived from CREW_DATA composite + industry references',
        sourceRank: 4,
    }),
});

export { CREW_COMPOSITIONS, LABOR_CLASSIFICATIONS };
