// ============================================
// Tier 0.4 — Time Unit
// Work calendar configuration
// ============================================

export class TimeUnit {
    /**
     * @param {Object} [params]
     * @param {number} [params.hoursPerShift=8] - Work hours per shift
     * @param {number} [params.shiftsPerDay=1] - Shifts per work day
     * @param {number} [params.workDaysPerWeek=5] - Work days per week
     * @param {number} [params.calendarToWorkDayFactor] - Calendar days to work days conversion
     * @param {Object} [params.seasonalWindow] - { startMonth, endMonth } (1-12)
     * @param {string} [params.notes]
     */
    constructor({
        hoursPerShift = 8,
        shiftsPerDay = 1,
        workDaysPerWeek = 5,
        calendarToWorkDayFactor = null,
        seasonalWindow = null,
        notes = ''
    } = {}) {
        this.hoursPerShift = hoursPerShift;
        this.shiftsPerDay = shiftsPerDay;
        this.workDaysPerWeek = workDaysPerWeek;
        this.calendarToWorkDayFactor = calendarToWorkDayFactor ?? (workDaysPerWeek / 7);
        this.seasonalWindow = seasonalWindow;
        this.notes = notes;
    }

    get minutesPerShift() {
        return this.hoursPerShift * 60;
    }

    get hoursPerDay() {
        return this.hoursPerShift * this.shiftsPerDay;
    }

    /**
     * Convert work days to calendar days.
     */
    workToCalendarDays(workDays) {
        return workDays / this.calendarToWorkDayFactor;
    }

    /**
     * Convert calendar days to work days.
     */
    calendarToWorkDays(calendarDays) {
        return calendarDays * this.calendarToWorkDayFactor;
    }

    toJSON() {
        return {
            hoursPerShift: this.hoursPerShift,
            shiftsPerDay: this.shiftsPerDay,
            workDaysPerWeek: this.workDaysPerWeek,
            calendarToWorkDayFactor: this.calendarToWorkDayFactor,
            seasonalWindow: this.seasonalWindow,
            notes: this.notes
        };
    }

    static fromJSON(data) {
        return new TimeUnit(data);
    }
}
