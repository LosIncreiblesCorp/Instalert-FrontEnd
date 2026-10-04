export const DEFAULT_PANIC_GRACE_PERIOD_SECONDS = 5;
export const MIN_PANIC_GRACE_PERIOD_SECONDS = 1;
export const MAX_PANIC_GRACE_PERIOD_SECONDS = 60;

/** Alert preferences belonging to one employee in the Alert bounded context. */
export class AlertPreferences {
    constructor({
        id = null,
        employeeId = '',
        panicGracePeriodSeconds = DEFAULT_PANIC_GRACE_PERIOD_SECONDS,
    } = {}) {
        this.id = id;
        this.employeeId = employeeId;
        this.panicGracePeriodSeconds = AlertPreferences.validateGracePeriod(panicGracePeriodSeconds);
    }

    static validateGracePeriod(value) {
        const seconds = Number(value);
        if (!Number.isInteger(seconds)
            || seconds < MIN_PANIC_GRACE_PERIOD_SECONDS
            || seconds > MAX_PANIC_GRACE_PERIOD_SECONDS) {
            throw new RangeError(
                `Panic grace period must be an integer from ${MIN_PANIC_GRACE_PERIOD_SECONDS} to ${MAX_PANIC_GRACE_PERIOD_SECONDS} seconds.`,
            );
        }
        return seconds;
    }
}
