// ============================================
// Estimate Storage v4.0
// localStorage CRUD with versioning (Tier 6.1)
// ============================================

const STORAGE_KEYS = {
    RATES: 'pavingCalcRates',           // Legacy rate storage key (backward compat)
    ESTIMATES: 'pavingCalcEstimates',    // Estimate index
    ESTIMATE_PREFIX: 'pavingCalcEst_',   // Per-estimate data
    RATE_LIBRARY: 'pavingCalcRateLib',   // Master rate library
    SETTINGS: 'pavingCalcSettings',      // v4.0 job mode, shift, etc.
};

export class EstimateStore {

    // ---- Rate Library (backward-compatible with current app) ----

    /**
     * Save rates in the legacy format (backward compatible).
     */
    saveRatesLegacy(rates) {
        try {
            localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(rates));
            return true;
        } catch (e) {
            console.warn('Failed to save rates:', e);
            return false;
        }
    }

    /**
     * Load rates from legacy format.
     */
    loadRatesLegacy() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.RATES);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Failed to load rates:', e);
            return null;
        }
    }

    /**
     * Clear legacy saved rates.
     */
    clearRatesLegacy() {
        try {
            localStorage.removeItem(STORAGE_KEYS.RATES);
            return true;
        } catch (e) {
            return false;
        }
    }

    // ---- v4.0 Settings Persistence ----

    /**
     * Save v4.0 settings (job mode, shift, weather, travel, cluster mode).
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.warn('Failed to save settings:', e);
            return false;
        }
    }

    /**
     * Load v4.0 settings.
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Failed to load settings:', e);
            return null;
        }
    }

    // ---- Estimate CRUD ----

    /**
     * Save an estimate (creates new version).
     */
    saveEstimate(estimate) {
        try {
            // Increment version
            estimate.version = (estimate.version || 0) + 1;
            estimate.lastModified = new Date().toISOString();

            // Add to revision history
            if (!estimate.revisionHistory) estimate.revisionHistory = [];
            estimate.revisionHistory.push({
                version: estimate.version,
                timestamp: estimate.lastModified
            });

            // Save estimate data
            const key = STORAGE_KEYS.ESTIMATE_PREFIX + estimate.id;
            localStorage.setItem(key, JSON.stringify(estimate.toJSON()));

            // Update index
            this._updateIndex(estimate);

            return true;
        } catch (e) {
            console.warn('Failed to save estimate:', e);
            return false;
        }
    }

    /**
     * Load an estimate by ID.
     */
    loadEstimate(estimateId) {
        try {
            const key = STORAGE_KEYS.ESTIMATE_PREFIX + estimateId;
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.warn('Failed to load estimate:', e);
            return null;
        }
    }

    /**
     * Delete an estimate.
     */
    deleteEstimate(estimateId) {
        try {
            const key = STORAGE_KEYS.ESTIMATE_PREFIX + estimateId;
            localStorage.removeItem(key);
            this._removeFromIndex(estimateId);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * List all saved estimates (metadata only).
     */
    listEstimates() {
        try {
            const index = localStorage.getItem(STORAGE_KEYS.ESTIMATES);
            return index ? JSON.parse(index) : [];
        } catch (e) {
            return [];
        }
    }

    // ---- Export / Import ----

    /**
     * Export estimate as JSON string (for file download or clipboard).
     */
    exportJSON(estimateId) {
        const data = this.loadEstimate(estimateId);
        return data ? JSON.stringify(data, null, 2) : null;
    }

    /**
     * Import estimate from JSON string.
     * Returns the parsed data (caller must reconstruct Estimate object).
     */
    importJSON(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn('Failed to parse estimate JSON:', e);
            return null;
        }
    }

    // ---- Storage management ----

    /**
     * Get approximate storage usage in bytes.
     */
    getStorageUsage() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('pavingCalc')) {
                total += localStorage.getItem(key).length * 2; // UTF-16
            }
        }
        return { used: total, limit: 5 * 1024 * 1024, percentage: (total / (5 * 1024 * 1024)) * 100 };
    }

    // ---- Internal ----

    _updateIndex(estimate) {
        const index = this.listEstimates();
        const existing = index.findIndex(e => e.id === estimate.id);

        const meta = {
            id: estimate.id,
            projectName: estimate.projectName,
            version: estimate.version,
            lastModified: estimate.lastModified,
            createdAt: estimate.createdAt,
            jobMode: estimate.jobMode || 'parking_lot',
        };

        if (existing >= 0) {
            index[existing] = meta;
        } else {
            index.push(meta);
        }

        localStorage.setItem(STORAGE_KEYS.ESTIMATES, JSON.stringify(index));
    }

    _removeFromIndex(estimateId) {
        const index = this.listEstimates().filter(e => e.id !== estimateId);
        localStorage.setItem(STORAGE_KEYS.ESTIMATES, JSON.stringify(index));
    }
}
