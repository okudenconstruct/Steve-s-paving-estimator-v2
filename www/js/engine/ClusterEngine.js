// ============================================
// Crew Clustering Engine
// Groups co-deployable activities for shared mobilization
// ============================================

import { CREW_CLUSTERS, CREW_DATA } from '../data/paving-defaults.js';

/**
 * Group active activities into mobilization clusters.
 * Auto-detects COMBO (mill + pave both active).
 *
 * @param {Array} activities - [{ activityType, duration, grossQuantity, ... }]
 * @param {string} jobMode - 'parking_lot' | 'roadway'
 * @param {number} travelHours - One-way travel time in hours
 * @returns {{ clusters, mobCosts, safetyCost, totalMobAndSafety }}
 */
export function clusterize(activities, jobMode, travelHours = 1) {
    const activeTypes = new Set(
        activities.filter(a => a.duration > 0).map(a => a.activityType)
    );

    if (activeTypes.size === 0) {
        return { clusters: [], mobCosts: [], safetyCost: 0, totalMobAndSafety: 0 };
    }

    // Auto-detect COMBO: milling + any paving both active
    const hasMillAndPave = activeTypes.has('milling') &&
        (activeTypes.has('paving_base') || activeTypes.has('paving_surface'));

    // Build clusters from definitions
    const clusters = [];
    const assignedActivities = new Set();

    if (hasMillAndPave) {
        // Use combo cluster instead of separate milling + paving
        const comboCluster = _buildCluster('combo', CREW_CLUSTERS.combo, activities, activeTypes);
        if (comboCluster.activities.length > 0) {
            clusters.push(comboCluster);
            comboCluster.activities.forEach(a => assignedActivities.add(a));
        }
    } else {
        // Separate milling and paving clusters
        for (const key of ['milling', 'paving']) {
            const def = CREW_CLUSTERS[key];
            const cluster = _buildCluster(key, def, activities, activeTypes);
            if (cluster.activities.length > 0) {
                clusters.push(cluster);
                cluster.activities.forEach(a => assignedActivities.add(a));
            }
        }
    }

    // Earthwork cluster (only activities not already assigned)
    const earthworkDef = CREW_CLUSTERS.earthwork;
    const earthworkActivities = earthworkDef.activities.filter(
        at => activeTypes.has(at) && !assignedActivities.has(at)
    );
    if (earthworkActivities.length > 0) {
        const cluster = _buildCluster('earthwork', earthworkDef, activities, activeTypes, earthworkActivities);
        clusters.push(cluster);
    }

    // Calculate mobilization costs per cluster
    const mobCosts = clusters.map(cluster => {
        const mobCrewData = CREW_DATA[cluster.mobCrew];
        if (!mobCrewData) return { ...cluster, mobCost: 0 };

        // 2 trips (to site + back) × travel hours × mob crew rate
        const mobCost = 2 * travelHours * mobCrewData.rate;

        return {
            ...cluster,
            mobCrewRate: mobCrewData.rate,
            mobCrewDesc: mobCrewData.desc,
            trips: 2,
            travelHours,
            mobCost,
        };
    });

    // Safety crew — roadway mode only
    let safetyCost = 0;
    if (jobMode === 'roadway') {
        const safeData = CREW_DATA.SAFE;
        if (safeData) {
            // Safety crew works full duration of all active days
            const totalWorkDays = activities
                .filter(a => a.duration > 0)
                .reduce((max, a) => Math.max(max, a.earlyFinish || a.duration), 0);
            const hoursPerDay = 8; // standard shift
            safetyCost = totalWorkDays * hoursPerDay * safeData.rate;
        }
    }

    const totalMobCost = mobCosts.reduce((sum, c) => sum + c.mobCost, 0);

    return {
        clusters: mobCosts,
        totalMobCost,
        safetyCost,
        totalMobAndSafety: totalMobCost + safetyCost,
        isCombo: hasMillAndPave,
    };
}

function _buildCluster(key, def, activities, activeTypes, overrideActivities = null) {
    const clusterActivities = overrideActivities || def.activities.filter(at => activeTypes.has(at));

    const totalDays = activities
        .filter(a => clusterActivities.includes(a.activityType) && a.duration > 0)
        .reduce((sum, a) => sum + a.duration, 0);

    return {
        id: key,
        desc: def.desc,
        mobCrew: def.mobCrew,
        activities: clusterActivities,
        totalDays,
    };
}
