// ============================================
// Calendar Duration
// Day-by-day timeline from CPM schedule with weather contingency
// ============================================

/**
 * Build a calendar timeline from CPM schedule results.
 * @param {Object} scheduleResults - From Scheduler (earlyStart/earlyFinish per activity)
 * @param {Array} activities - Activity results with descriptions and durations
 * @param {number} weatherDays - Weather contingency days to append
 * @returns {{ timeline, workDays, weatherDays, totalDays }}
 */
export function calculateCalendarDuration(scheduleResults, activities, weatherDays = 0) {
    const activeActivities = activities.filter(a => a.duration > 0);

    if (activeActivities.length === 0) {
        return { timeline: [], workDays: 0, weatherDays, totalDays: weatherDays };
    }

    // Build day-by-day timeline from CPM early start/finish
    const projectDuration = Math.max(...activeActivities.map(a => a.earlyFinish || a.duration));
    const timeline = [];

    for (let day = 0; day < Math.ceil(projectDuration); day++) {
        const dayStart = day;
        const dayEnd = day + 1;

        const dayActivities = activeActivities.filter(a => {
            const es = a.earlyStart || 0;
            const ef = a.earlyFinish || a.duration;
            return es < dayEnd && ef > dayStart;
        });

        timeline.push({
            day: day + 1,
            type: 'work',
            activities: dayActivities.map(a => ({
                id: a.id,
                description: a.description,
                activityType: a.activityType,
                colorClass: a.colorClass,
            })),
        });
    }

    // Append weather contingency days
    for (let i = 0; i < weatherDays; i++) {
        timeline.push({
            day: timeline.length + 1,
            type: 'weather',
            activities: [],
        });
    }

    return {
        timeline,
        workDays: Math.ceil(projectDuration),
        weatherDays,
        totalDays: Math.ceil(projectDuration) + weatherDays,
    };
}
