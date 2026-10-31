import { DashboardSummary, dashboardMonthBounds } from './dashboard-summary.entity.js';

function freezeSnapshot(value) {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(freezeSnapshot);
        Object.freeze(value);
    }
    return value;
}

/** Immutable report snapshot received from the reporting service. Scheduling belongs to backend. */
export class MonthlyReport {
    constructor({ id, businessId, month, generatedAt, generationSource, generatedByUserId = null, summary, schemaVersion = 1 }) {
        const bounds = dashboardMonthBounds(month);
        if (id == null || !String(id).trim() || typeof businessId !== 'string' || !businessId
            || !Number.isFinite(Date.parse(generatedAt)) || Date.parse(generatedAt) < Date.parse(bounds.end)
            || !['scheduled', 'manual'].includes(generationSource) || schemaVersion !== 1
            || (generationSource === 'manual' && (typeof generatedByUserId !== 'string' || !generatedByUserId))
            || !(summary instanceof DashboardSummary) || summary.role !== 'administrator' || summary.businessId !== businessId
            || summary.period.kind !== 'month' || summary.period.month !== month || summary.period.start !== bounds.start || summary.period.end !== bounds.end
            || Date.parse(summary.refreshedAt) < Date.parse(bounds.end) || Date.parse(summary.refreshedAt) > Date.parse(generatedAt)) {
            throw new Error('Invalid monthly report snapshot.');
        }
        Object.assign(this, { id, businessId, month, periodStart: bounds.start, periodEnd: bounds.end, generatedAt, generationSource,
            generatedByUserId, summary, schemaVersion });
        freezeSnapshot(this);
    }
}
