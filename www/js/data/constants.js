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
