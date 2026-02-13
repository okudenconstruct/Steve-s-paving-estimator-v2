// ============================================
// Tier 3 — CPM Scheduler
// Critical Path Method: forward pass, backward pass, float calculation
// ============================================

import { DependencyType } from '../models/Activity.js';

export class Scheduler {
    /**
     * @param {import('../models/Activity.js').Activity[]} activities - Activities with dependencies
     */
    constructor(activities) {
        this.activities = activities;
        // Results map: activityId → { earlyStart, earlyFinish, lateStart, lateFinish, totalFloat, freeFloat }
        this.results = new Map();
    }

    /**
     * Run full CPM analysis.
     */
    run() {
        if (this.activities.length === 0) return;

        // Initialize results
        for (const a of this.activities) {
            this.results.set(a.id, {
                earlyStart: 0,
                earlyFinish: 0,
                lateStart: 0,
                lateFinish: 0,
                totalFloat: 0,
                freeFloat: 0
            });
        }

        this._forwardPass();
        this._backwardPass();
        this._calculateFloat();
    }

    /**
     * Forward pass: calculate Early Start (ES) and Early Finish (EF).
     * ES = max(EF of all predecessors, accounting for dependency type and lag)
     * EF = ES + Duration
     */
    _forwardPass() {
        const sorted = this._topologicalSort();

        for (const activity of sorted) {
            const r = this.results.get(activity.id);
            let es = 0;

            for (const dep of activity.dependencies) {
                const predResult = this.results.get(dep.predecessorId);
                if (!predResult) continue;

                const lag = dep.lag || 0;

                switch (dep.type || DependencyType.FS) {
                    case DependencyType.FS:
                        es = Math.max(es, predResult.earlyFinish + lag);
                        break;
                    case DependencyType.SS:
                        es = Math.max(es, predResult.earlyStart + lag);
                        break;
                    case DependencyType.FF:
                        // EF must be >= pred.EF + lag, so ES >= pred.EF + lag - duration
                        es = Math.max(es, predResult.earlyFinish + lag - activity.duration);
                        break;
                    case DependencyType.SF:
                        // EF must be >= pred.ES + lag, so ES >= pred.ES + lag - duration
                        es = Math.max(es, predResult.earlyStart + lag - activity.duration);
                        break;
                }
            }

            r.earlyStart = Math.max(0, es);
            r.earlyFinish = r.earlyStart + activity.duration;
        }
    }

    /**
     * Backward pass: calculate Late Start (LS) and Late Finish (LF).
     * LF = min(LS of all successors, accounting for dependency type and lag)
     * LS = LF - Duration
     */
    _backwardPass() {
        const projectEnd = this.projectDuration;
        const sorted = this._topologicalSort().reverse();

        // Initialize all LF to project end
        for (const activity of this.activities) {
            const r = this.results.get(activity.id);
            r.lateFinish = projectEnd;
            r.lateStart = projectEnd - activity.duration;
        }

        // Build successor map
        const successors = new Map();
        for (const activity of this.activities) {
            for (const dep of activity.dependencies) {
                if (!successors.has(dep.predecessorId)) {
                    successors.set(dep.predecessorId, []);
                }
                successors.get(dep.predecessorId).push({
                    activity,
                    type: dep.type || DependencyType.FS,
                    lag: dep.lag || 0
                });
            }
        }

        for (const activity of sorted) {
            const r = this.results.get(activity.id);
            const succs = successors.get(activity.id) || [];

            if (succs.length > 0) {
                let lf = projectEnd;

                for (const succ of succs) {
                    const succResult = this.results.get(succ.activity.id);

                    switch (succ.type) {
                        case DependencyType.FS:
                            lf = Math.min(lf, succResult.lateStart - succ.lag);
                            break;
                        case DependencyType.SS:
                            lf = Math.min(lf, succResult.lateStart - succ.lag + activity.duration);
                            break;
                        case DependencyType.FF:
                            lf = Math.min(lf, succResult.lateFinish - succ.lag);
                            break;
                        case DependencyType.SF:
                            lf = Math.min(lf, succResult.lateFinish - succ.lag + activity.duration);
                            break;
                    }
                }

                r.lateFinish = lf;
                r.lateStart = lf - activity.duration;
            }
        }
    }

    /**
     * Calculate Total Float and Free Float.
     */
    _calculateFloat() {
        // Build successor map for free float
        const successors = new Map();
        for (const activity of this.activities) {
            for (const dep of activity.dependencies) {
                if (!successors.has(dep.predecessorId)) {
                    successors.set(dep.predecessorId, []);
                }
                successors.get(dep.predecessorId).push(activity);
            }
        }

        for (const activity of this.activities) {
            const r = this.results.get(activity.id);

            // Total Float = LS - ES (or LF - EF)
            r.totalFloat = r.lateStart - r.earlyStart;

            // Free Float = min(ES of successors) - EF of this activity
            const succs = successors.get(activity.id) || [];
            if (succs.length > 0) {
                const minSuccES = Math.min(...succs.map(s => this.results.get(s.id).earlyStart));
                r.freeFloat = minSuccES - r.earlyFinish;
            } else {
                r.freeFloat = this.projectDuration - r.earlyFinish;
            }
        }
    }

    /**
     * Topological sort of activities based on dependencies.
     * Uses Kahn's algorithm.
     */
    _topologicalSort() {
        const inDegree = new Map();
        const adjList = new Map();

        for (const a of this.activities) {
            inDegree.set(a.id, 0);
            adjList.set(a.id, []);
        }

        for (const a of this.activities) {
            for (const dep of a.dependencies) {
                if (adjList.has(dep.predecessorId)) {
                    adjList.get(dep.predecessorId).push(a.id);
                    inDegree.set(a.id, (inDegree.get(a.id) || 0) + 1);
                }
            }
        }

        const queue = [];
        for (const [id, degree] of inDegree) {
            if (degree === 0) queue.push(id);
        }

        const sorted = [];
        const activityMap = new Map(this.activities.map(a => [a.id, a]));

        while (queue.length > 0) {
            const id = queue.shift();
            sorted.push(activityMap.get(id));

            for (const succId of (adjList.get(id) || [])) {
                const newDegree = inDegree.get(succId) - 1;
                inDegree.set(succId, newDegree);
                if (newDegree === 0) queue.push(succId);
            }
        }

        // If sorted doesn't include all activities, there's a cycle — return activities as-is
        if (sorted.length !== this.activities.length) {
            console.warn('Dependency cycle detected — returning unsorted activities');
            return [...this.activities];
        }

        return sorted;
    }

    /**
     * Project duration = max Early Finish across all activities.
     * Rubric Axiom 4: Duration derived from CPM, never assumed.
     */
    get projectDuration() {
        let maxEF = 0;
        for (const r of this.results.values()) {
            maxEF = Math.max(maxEF, r.earlyFinish);
        }
        return maxEF;
    }

    /**
     * Critical path = activities with zero total float.
     */
    get criticalPath() {
        const critical = [];
        for (const activity of this.activities) {
            const r = this.results.get(activity.id);
            if (r && Math.abs(r.totalFloat) < 0.001 && activity.duration > 0) {
                critical.push(activity.id);
            }
        }
        return critical;
    }

    /**
     * Near-critical activities (float < threshold).
     */
    getNearCritical(floatThreshold = 1.0) {
        const nearCritical = [];
        for (const activity of this.activities) {
            const r = this.results.get(activity.id);
            if (r && r.totalFloat > 0 && r.totalFloat <= floatThreshold && activity.duration > 0) {
                nearCritical.push(activity.id);
            }
        }
        return nearCritical;
    }

    /**
     * Get schedule data for Gantt chart rendering.
     */
    getGanttData() {
        return this.activities
            .filter(a => a.duration > 0)
            .map(a => {
                const r = this.results.get(a.id);
                return {
                    id: a.id,
                    description: a.description,
                    duration: a.duration,
                    earlyStart: r.earlyStart,
                    earlyFinish: r.earlyFinish,
                    totalFloat: r.totalFloat,
                    isCritical: this.criticalPath.includes(a.id),
                    colorClass: a.colorClass
                };
            })
            .sort((a, b) => a.earlyStart - b.earlyStart);
    }
}
