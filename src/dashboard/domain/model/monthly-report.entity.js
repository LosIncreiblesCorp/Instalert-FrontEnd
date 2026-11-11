import { DashboardSummary } from './dashboard-summary.entity.js';

function freezeSnapshot(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freezeSnapshot); Object.freeze(value); }
    return value;
}

/** A saved report is an immutable snapshot of the requested inclusive date range. */
export class MonthlyReport {
    constructor({ id, businessId, startDate, endDate, cutoffAt, generatedAt, generationSource, generatedByUserId, summary, schemaVersion }) {
        const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
            && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
        if (typeof id !== 'string' || !id || typeof businessId !== 'string' || !businessId
            || !validDate(startDate) || !validDate(endDate) || startDate > endDate
            || !Number.isFinite(Date.parse(cutoffAt)) || !Number.isFinite(Date.parse(generatedAt))
            || Date.parse(generatedAt) < Date.parse(cutoffAt) || generationSource !== 'manual' || schemaVersion !== 2
            || typeof generatedByUserId !== 'string' || !generatedByUserId || !(summary instanceof DashboardSummary)
            || summary.role !== 'administrator' || summary.businessId !== businessId || summary.period.kind !== 'range'
            || Date.parse(summary.period.start) !== Date.parse(startDate + 'T00:00:00-05:00')
            || Date.parse(summary.period.end) !== Date.parse(cutoffAt)
            || Date.parse(cutoffAt) < Date.parse(summary.period.start)
            || Date.parse(cutoffAt) > Date.parse(endDate + 'T00:00:00-05:00') + 86400000) throw new Error('Invalid saved report.');
        Object.assign(this, { id, businessId, startDate, endDate, cutoffAt, generatedAt, generationSource, generatedByUserId,
            periodStart: summary.period.start, periodEnd: summary.period.end, summary, schemaVersion });
        freezeSnapshot(this);
    }
}
