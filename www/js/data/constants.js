// ============================================
// Material & Conversion Constants
// Paving-specific physical constants with sources
// ============================================

export const CONSTANTS = {
    // Material densities
    HMA_DENSITY: 145,           // lbs/ft³ — compacted HMA (Asphalt Institute)
    DGA_DENSITY: 1.9,           // tons/CY — compacted DGA (Industry standard)
    SOIL_DENSITY: 1.5,          // tons/CY — excavated soil (Caterpillar handbook)
    RAP_DENSITY: 130,           // lbs/ft³ — loose RAP (FHWA)

    // Truck capacities
    TRUCK_CY: 16,               // Cubic yards per tri-axle dump truck (dirt/aggregate)
    TRUCK_TONS: 22,             // Tons per tri-axle dump truck (HMA/material)

    // Work day
    WORKDAY_HOURS: 8,           // Standard work hours per shift
    WORKDAY_MINUTES: 480,       // Minutes per 8-hour shift

    // Conversion factors
    HMA_FACTOR: 0.0575,         // tons per SY-inch (derived: 145 lbs/ft³ × 9ft²/SY × 1in/12 ÷ 2000 lbs/ton)
    RAP_FACTOR: 0.04875,        // tons per SY-inch (derived: 130 lbs/ft³ × 9ft²/SY × 1in/12 ÷ 2000 lbs/ton)
    CY_PER_SY_INCH: 1 / 324,   // CY = SY × inches ÷ 324 (derived: 9ft²/SY × 1in/12 ÷ 27ft³/CY)
    SF_PER_SY: 9                // Square feet per square yard
};

// ============================================
// Material Prices (regional supplier quotes, Jan 2025)
// ============================================

export const MATERIAL_PRICES = {
    // HMA mix prices (AC base $553 + freight $3.18)
    hma_9_5_64:     61.06,  // $/TON — 9.5mm-64 Surface Course
    hma_19_64:      58.06,  // $/TON — 19mm-64 Base Course
    hma_9_5_76:     68.41,  // $/TON — 9.5mm-76 polymer modified surface
    hma_19_76:      65.41,  // $/TON — 19mm-76 polymer modified base
    hma_12_5_64:    59.06,  // $/TON — 12.5mm-64
    hma_25_64:      55.06,  // $/TON — 25mm-64

    // Aggregate
    dga:            20.25,  // $/TON — Dense Graded Aggregate
    dga_rap:        14.00,  // $/TON — DGA/RAP blend

    // Tack coat
    tack_std:        3.75,  // $/GAL — standard tack
    tack_64:         4.25,  // $/GAL — 64-22 tack
    tack_76:         6.50,  // $/GAL — 76-22 tack

    // Disposal
    disposal_asphalt:   7.50,  // $/TON — broken asphalt
    disposal_concrete:  7.50,  // $/TON — broken concrete
    disposal_mixed:    25.00,  // $/TON — mixed debris

    // Consumables
    milling_teeth:      0.15,  // $/SY — milling teeth wear

    // Plant opening fees
    plant_open_weekday: 1500,  // $ — Mon-Sat
    plant_open_sunday:  3500,  // $ — Sunday
    plant_open_silo:     400,  // $ — silo dump
};

// ============================================
// Shift Optimization Constants
// ============================================

export const SHIFT_CONSTANTS = {
    BILLING_INCREMENTS: [4, 6, 8, 10, 12],
    HUSTLE_THRESHOLD: 0.5,  // hours — snap down if overshoot ≤ this
    MIN_SHIFT: 4,
    MAX_SHIFT: 12,
};

// Source documentation for auditability (Tier 6.3)
export const CONSTANT_SOURCES = {
    HMA_DENSITY:  { value: 145, unit: 'lbs/ft³', source: 'Asphalt Institute', note: 'Compacted HMA, varies 140-150 by mix design' },
    DGA_DENSITY:  { value: 1.9, unit: 'tons/CY', source: 'Industry standard', note: 'Compacted, varies 1.8-2.0 by gradation' },
    SOIL_DENSITY: { value: 1.5, unit: 'tons/CY', source: 'Caterpillar Performance Handbook', note: 'Common earth, varies 1.3-1.8 by type' },
    RAP_DENSITY:  { value: 130, unit: 'lbs/ft³', source: 'FHWA', note: 'Loose millings, varies 120-140' },
    TRUCK_CY:     { value: 16, unit: 'CY', source: 'Industry standard', note: 'Tri-axle dump, heaped' },
    TRUCK_TONS:   { value: 22, unit: 'tons', source: 'Industry standard', note: 'Tri-axle dump, legal gross weight' },
    HMA_FACTOR:   { value: 0.0575, unit: 'tons/SY-in', source: 'Derived from HMA_DENSITY', note: '145×9/12/2000' },
    RAP_FACTOR:   { value: 0.04875, unit: 'tons/SY-in', source: 'Derived from RAP_DENSITY', note: '130×9/12/2000' }
};
