// ============================================
// Tier 1.2 — Productivity Factor Model
// Composite multiplier adjusting reference rate to actual conditions
// ============================================

/**
 * Standard modifier categories per the rubric.
 * Each is a multiplier where 1.0 = reference conditions.
 */
export const MODIFIER_DEFINITIONS = [
    { key: 'siteAccess',       label: 'Site Access / Congestion',    min: 0.50, max: 1.00, default: 1.00, description: 'Physical constraints on workspace, staging, maneuverability' },
    { key: 'weather',          label: 'Weather / Climate',           min: 0.60, max: 1.00, default: 1.00, description: 'Temperature, precipitation, wind, daylight' },
    { key: 'terrain',          label: 'Altitude / Terrain',          min: 0.70, max: 1.00, default: 1.00, description: 'Elevation effects, slope/grade conditions' },
    { key: 'specComplexity',   label: 'Specification Complexity',    min: 0.60, max: 1.00, default: 1.00, description: 'Tolerance requirements, inspection intensity, rework' },
    { key: 'learningCurve',    label: 'Repetition / Learning Curve', min: 1.00, max: 1.20, default: 1.00, description: 'Improvement from repeated identical operations' },
    { key: 'overtimeShift',    label: 'Overtime / Shift Inefficiency', min: 0.75, max: 1.00, default: 1.00, description: 'Degradation for extended shifts, night work, sustained OT' },
    { key: 'crewExperience',   label: 'Crew Skill / Experience',     min: 0.70, max: 1.15, default: 1.00, description: 'Crew capability relative to reference assumption' },
    { key: 'materialHandling', label: 'Material Handling Distance',  min: 0.70, max: 1.00, default: 1.00, description: 'Extra time for material transport beyond reference' },
    { key: 'regulatorySafety', label: 'Regulatory / Safety Overhead', min: 0.60, max: 1.00, default: 1.00, description: 'Confined space, hot work, traffic control, environmental' },
    { key: 'tradeStacking',    label: 'Trade Stacking / Concurrent', min: 0.60, max: 1.00, default: 1.00, description: 'Efficiency loss from multiple trades sharing workspace' }
];

/**
 * Pre-configured presets that map to the current app's complexity dropdown.
 * Each preset sets modifiers to produce the target composite value.
 */
export const PRODUCTIVITY_PRESETS = {
    roadway: {
        label: 'Roadway (1.0×)',
        description: 'Full highway production rates, open access',
        modifiers: {}  // All defaults (1.0)
    },
    simple: {
        label: 'Simple (0.85×)',
        description: 'Large retail lots, open areas, few obstacles',
        modifiers: { siteAccess: 0.92, specComplexity: 0.92 }  // 0.92 × 0.92 ≈ 0.85
    },
    standard: {
        label: 'Standard (0.70×)',
        description: 'Typical commercial parking lots',
        modifiers: { siteAccess: 0.85, specComplexity: 0.82 }  // 0.85 × 0.82 ≈ 0.70
    },
    complex: {
        label: 'Complex (0.55×)',
        description: 'Dense obstacles, tight spaces, heavy constraints',
        modifiers: { siteAccess: 0.75, specComplexity: 0.73 }  // 0.75 × 0.73 ≈ 0.55
    }
};

export class ProductivityFactor {
    /**
     * @param {Object} [modifiers] - Key-value pairs of modifier adjustments
     * @param {Object} [bases] - Key-value pairs of documented basis for each modifier
     * @param {string} [presetKey] - Which preset was used, if any
     */
    constructor(modifiers = {}, bases = {}, presetKey = null) {
        for (const def of MODIFIER_DEFINITIONS) {
            this[def.key] = modifiers[def.key] ?? def.default;
        }
        this.bases = bases;
        this.presetKey = presetKey;
    }

    /**
     * Composite productivity factor = product of all modifiers.
     * Rubric: Productivity Factor = Π (Condition Modifier_i) for i = 1 to n
     */
    get composite() {
        let product = 1.0;
        for (const def of MODIFIER_DEFINITIONS) {
            product *= this[def.key];
        }
        return product;
    }

    /**
     * Whether any modifier deviates from its default.
     */
    get isCustom() {
        return MODIFIER_DEFINITIONS.some(def => this[def.key] !== def.default);
    }

    /**
     * Get all non-default modifiers for display.
     */
    get activeModifiers() {
        return MODIFIER_DEFINITIONS
            .filter(def => this[def.key] !== def.default)
            .map(def => ({
                ...def,
                value: this[def.key],
                basis: this.bases[def.key] || ''
            }));
    }

    /**
     * Create from a preset key.
     */
    static fromPreset(presetKey) {
        const preset = PRODUCTIVITY_PRESETS[presetKey];
        if (!preset) return new ProductivityFactor();
        return new ProductivityFactor(preset.modifiers, {}, presetKey);
    }

    /**
     * Create from a single composite value (backward compatibility).
     * Maps the value to siteAccess × specComplexity approximation.
     */
    static fromCompositeValue(value) {
        // Find matching preset
        for (const [key, preset] of Object.entries(PRODUCTIVITY_PRESETS)) {
            const pf = new ProductivityFactor(preset.modifiers);
            if (Math.abs(pf.composite - value) < 0.02) {
                return ProductivityFactor.fromPreset(key);
            }
        }
        // Custom: split evenly between siteAccess and specComplexity
        const root = Math.sqrt(value);
        return new ProductivityFactor(
            { siteAccess: root, specComplexity: root },
            { siteAccess: 'Derived from composite value', specComplexity: 'Derived from composite value' },
            null
        );
    }

    toJSON() {
        const modifiers = {};
        for (const def of MODIFIER_DEFINITIONS) {
            modifiers[def.key] = this[def.key];
        }
        return { modifiers, bases: this.bases, presetKey: this.presetKey };
    }

    static fromJSON(data) {
        return new ProductivityFactor(data.modifiers, data.bases, data.presetKey);
    }
}
