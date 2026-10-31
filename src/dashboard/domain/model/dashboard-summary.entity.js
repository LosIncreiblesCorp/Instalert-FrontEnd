export const dashboardTimeZone = 'America/Lima';
const dayMilliseconds = 86400000;

export function dashboardDateKey(value) {
    if (value === null || value === undefined) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: dashboardTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = type => parts.find(item => item.type === type).value;
    return part('year') + '-' + part('month') + '-' + part('day');
}

export function dashboardMonthBounds(month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '') || Number(month.slice(0, 4)) < 2000 || Number(month.slice(0, 4)) > 9998) throw new Error('Invalid report month.');
    const [year, number] = month.split('-').map(Number);
    const nextMonth = number === 12 ? (year + 1) + '-01' : year + '-' + String(number + 1).padStart(2, '0');
    return { start: new Date(month + '-01T00:00:00-05:00').toISOString(), end: new Date(nextMonth + '-01T00:00:00-05:00').toISOString() };
}

/** Query periods are explicit and independent of notification delivery preferences. */
export function createDashboardPeriod(kind = '30d', month = dashboardDateKey(Date.now()).slice(0, 7), now = Date.now()) {
    if (!Number.isFinite(now) || !['7d', '30d', 'month', 'year'].includes(kind)) throw new Error('Invalid dashboard query.');
    let start, end, previousStart, previousEnd;
    if (kind === 'month' || kind === 'year') {
        const monthBounds = dashboardMonthBounds(month);
        const year = Number(month.slice(0, 4));
        const bounds = kind === 'year' ? { start: new Date(year + '-01-01T00:00:00-05:00').toISOString(), end: new Date((year + 1) + '-01-01T00:00:00-05:00').toISOString() } : monthBounds;
        start = Date.parse(bounds.start);
        if (start > now) throw new Error('Future dashboard period.');
        end = Math.min(Date.parse(bounds.end), now);
        const previousMonth = dashboardDateKey(start - dayMilliseconds).slice(0, 7);
        const previousBounds = { start: new Date((kind === 'year' ? (year - 1) + '-01' : previousMonth) + '-01T00:00:00-05:00').toISOString(), end: bounds.start };
        previousStart = Date.parse(previousBounds.start);
        previousEnd = end < Date.parse(bounds.end) ? Math.min(Date.parse(previousBounds.end), previousStart + end - start) : Date.parse(previousBounds.end);
    } else {
        end = now;
        start = end - (kind === '7d' ? 7 : 30) * dayMilliseconds;
        previousEnd = start;
        previousStart = start - (end - start);
    }
    return { kind, month: kind === 'month' ? month : null, year: kind === 'year' ? Number(month.slice(0, 4)) : null, start: new Date(start).toISOString(), end: new Date(end).toISOString(), previousStart: new Date(previousStart).toISOString(), previousEnd: new Date(previousEnd).toISOString(), timeZone: dashboardTimeZone };
}

/** Dashboard-owned read projection. Source records remain in their original contexts. */
export class DashboardSummary {
    constructor({ role, businessId, userId = null, businessName = '', period, radiusMeters, refreshedAt, metrics, staff = null, subscription = null,
        daily = null, categories = null, statuses = null, hourly = null, riskCounts = null, riskZones = null, activity = null, warnings = [] }) {
        Object.assign(this, { role, businessId, userId, businessName, period, radiusMeters, refreshedAt, metrics, staff, subscription,
            daily, categories, statuses, hourly, riskCounts, riskZones, activity, warnings });
    }
    get reportChangePercent() {
        const { reports, previousReports } = this.metrics;
        return reports !== null && previousReports > 0 ? Math.round((reports - previousReports) / previousReports * 100) : null;
    }
    get reservedSeats() { return this.staff && this.staff.active !== null && this.staff.pending !== null ? this.staff.active + this.staff.pending : null; }
    get seatUsagePercent() { return this.reservedSeats !== null && this.staff.limit > 0 ? Math.round(this.reservedSeats / this.staff.limit * 100) : null; }
}
