// ============================================
// Unit of Measure Definitions
// Tier 6.1 — UOM consistency enforcement
// ============================================

export const UOM = {
    // Area
    SY: { id: 'SY', name: 'Square Yards', dimension: 'area', abbrev: 'SY' },
    SF: { id: 'SF', name: 'Square Feet', dimension: 'area', abbrev: 'SF' },

    // Volume
    CY: { id: 'CY', name: 'Cubic Yards', dimension: 'volume', abbrev: 'CY' },
    GAL: { id: 'GAL', name: 'Gallons', dimension: 'volume', abbrev: 'gal' },

    // Mass
    TON: { id: 'TON', name: 'Tons', dimension: 'mass', abbrev: 'ton' },
    LB: { id: 'LB', name: 'Pounds', dimension: 'mass', abbrev: 'lb' },

    // Length
    IN: { id: 'IN', name: 'Inches', dimension: 'length', abbrev: 'in' },
    FT: { id: 'FT', name: 'Feet', dimension: 'length', abbrev: 'ft' },

    // Time
    HR: { id: 'HR', name: 'Hours', dimension: 'time', abbrev: 'hr' },
    DAY: { id: 'DAY', name: 'Days', dimension: 'time', abbrev: 'day' },
    MIN: { id: 'MIN', name: 'Minutes', dimension: 'time', abbrev: 'min' },

    // Count / Lump
    EA: { id: 'EA', name: 'Each', dimension: 'count', abbrev: 'ea' },
    LS: { id: 'LS', name: 'Lump Sum', dimension: 'cost', abbrev: 'LS' }
};

/**
 * Check if a quantity UOM is compatible with a production rate output UOM.
 * They must be the same UOM for direct division (quantity / rate = time).
 */
export function checkUOMCompatibility(quantityUOM, rateOutputUOM) {
    return quantityUOM.id === rateOutputUOM.id;
}

/**
 * Get a UOM by its string ID.
 */
export function getUOM(id) {
    return UOM[id] || null;
}
