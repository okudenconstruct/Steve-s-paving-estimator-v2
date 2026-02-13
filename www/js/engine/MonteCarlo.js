// ============================================
// Tier 5.2 — Monte Carlo Simulation
// Probabilistic cost estimating engine
// ============================================

export class MonteCarlo {
    /**
     * @param {number} [iterations=1000] - Number of simulation iterations
     */
    constructor(iterations = 1000) {
        this.iterations = iterations;
    }

    /**
     * Sample from a PERT-Beta distribution.
     * PERT uses a modified beta distribution: mode is weighted 4× in the mean.
     * @param {number} min - Minimum value
     * @param {number} mostLikely - Most likely value
     * @param {number} max - Maximum value
     * @returns {number} Sampled value
     */
    samplePERT(min, mostLikely, max) {
        if (min === max) return min;
        if (min >= max) return mostLikely;

        // PERT mean and standard deviation
        const mean = (min + 4 * mostLikely + max) / 6;
        const sd = (max - min) / 6;

        // Approximate PERT with triangular distribution (simpler, adequate for this use)
        // Triangular: uses inverse CDF method
        const u = Math.random();
        const fc = (mostLikely - min) / (max - min);

        if (u < fc) {
            return min + Math.sqrt(u * (max - min) * (mostLikely - min));
        } else {
            return max - Math.sqrt((1 - u) * (max - min) * (max - mostLikely));
        }
    }

    /**
     * Run Monte Carlo simulation on an estimate.
     * @param {Object} params
     * @param {number} params.baseEstimate - Base (most likely) total cost
     * @param {Array} params.variables - [{ name, min, mostLikely, max, weight }]
     *   weight = fraction of base estimate this variable represents
     * @returns {Object} Simulation results
     */
    run({ baseEstimate, variables }) {
        const results = [];

        for (let i = 0; i < this.iterations; i++) {
            let totalCost = 0;

            for (const v of variables) {
                const sampled = this.samplePERT(v.min, v.mostLikely, v.max);
                // Scale: sampled / mostLikely gives the ratio, applied to the variable's share of cost
                const ratio = v.mostLikely > 0 ? sampled / v.mostLikely : 1;
                totalCost += (v.weight * baseEstimate) * ratio;
            }

            results.push(totalCost);
        }

        return this._analyze(results);
    }

    /**
     * Analyze simulation results.
     * @param {number[]} results - Array of simulated total costs
     * @returns {Object} Statistical analysis
     */
    _analyze(results) {
        results.sort((a, b) => a - b);
        const n = results.length;

        const mean = results.reduce((a, b) => a + b, 0) / n;
        const variance = results.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        return {
            iterations: n,
            min: results[0],
            max: results[n - 1],
            mean: Math.round(mean),
            stdDev: Math.round(stdDev),
            p10: Math.round(results[Math.floor(n * 0.10)]),
            p25: Math.round(results[Math.floor(n * 0.25)]),
            p50: Math.round(results[Math.floor(n * 0.50)]),
            p75: Math.round(results[Math.floor(n * 0.75)]),
            p80: Math.round(results[Math.floor(n * 0.80)]),
            p90: Math.round(results[Math.floor(n * 0.90)]),
            p95: Math.round(results[Math.floor(n * 0.95)]),
            distribution: results
        };
    }

    /**
     * Generate a histogram from simulation results for charting.
     * @param {number[]} distribution - Sorted array of results
     * @param {number} [bins=20] - Number of histogram bins
     * @returns {Array} [{binStart, binEnd, count, frequency}]
     */
    static histogram(distribution, bins = 20) {
        if (distribution.length === 0) return [];

        const min = distribution[0];
        const max = distribution[distribution.length - 1];
        const binWidth = (max - min) / bins;

        const histogram = [];
        for (let i = 0; i < bins; i++) {
            histogram.push({
                binStart: min + i * binWidth,
                binEnd: min + (i + 1) * binWidth,
                count: 0,
                frequency: 0
            });
        }

        for (const val of distribution) {
            const binIndex = Math.min(Math.floor((val - min) / binWidth), bins - 1);
            histogram[binIndex].count++;
        }

        const total = distribution.length;
        for (const bin of histogram) {
            bin.frequency = bin.count / total;
        }

        return histogram;
    }
}
