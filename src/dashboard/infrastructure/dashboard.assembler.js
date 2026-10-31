import { DashboardSummary, dashboardTimeZone } from '../domain/model/dashboard-summary.entity.js';
import { MonthlyReport } from '../domain/model/monthly-report.entity.js';

const metricKeys = ['activeAlerts', 'pendingReports', 'reports', 'previousReports', 'nearbyIncidents', 'unreadNotifications', 'invalidLocationReports', 'undatedReports'];
const warningKeys = ['alerts', 'members', 'invitations', 'geography', 'subscription', 'notifications', 'scope', 'location', 'classification'];
const count = value => value === null || (Number.isInteger(value) && value >= 0);
const identifier = value => (typeof value === 'string' && value.trim() !== '') || (typeof value === 'number' && Number.isFinite(value));
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
function requireValue(condition) { if (!condition) throw new Error('Invalid dashboard resource.'); }
function series(value) {
    if (value === null) return null;
    requireValue(Array.isArray(value));
    const keys = new Set();
    return value.map(item => {
        requireValue(item && typeof item.key === 'string' && item.key.length > 0 && item.key.length <= 100 && Number.isInteger(item.value) && item.value >= 0 && !keys.has(item.key));
        keys.add(item.key);
        return { key: item.key, value: item.value };
    });
}

/** Whitelists Dashboard DTOs without importing any source context's private model. */
export class DashboardAssembler {
    static toSummary(resource) {
        requireValue(resource && ['administrator', 'employee'].includes(resource.role) && typeof resource.businessId === 'string' && resource.businessId
            && (resource.userId === null || typeof resource.userId === 'string') && (resource.role !== 'employee' || resource.userId)
            && typeof resource.businessName === 'string' && timestamp(resource.refreshedAt) && [100, 500, 1000].includes(resource.radiusMeters));
        const period = resource.period;
        requireValue(period && ['7d', '30d', 'month', 'year'].includes(period.kind) && period.timeZone === dashboardTimeZone
            && [period.start, period.end, period.previousStart, period.previousEnd].every(timestamp)
            && Date.parse(period.start) <= Date.parse(period.end) && Date.parse(period.previousStart) <= Date.parse(period.previousEnd)
            && Date.parse(period.previousEnd) <= Date.parse(period.start));
        requireValue(period.kind !== 'year' || (Number.isInteger(period.year) && period.year >= 2000 && period.year <= 9998
            && period.start === new Date(period.year + '-01-01T00:00:00-05:00').toISOString()
            && Date.parse(period.end) <= Date.parse((period.year + 1) + '-01-01T00:00:00-05:00')));
        requireValue(resource.metrics && metricKeys.every(key => count(resource.metrics[key])));
        const metrics = Object.fromEntries(metricKeys.map(key => [key, resource.metrics[key]]));
        metrics.localRiskLevel = ['low', 'medium', 'high'].includes(resource.metrics.localRiskLevel) ? resource.metrics.localRiskLevel : null;
        let staff = null;
        if (resource.staff !== null) {
            requireValue(resource.role === 'administrator' && resource.staff && ['active', 'pending', 'limit', 'available'].every(key => count(resource.staff[key]))
                && (resource.staff.overCapacity === null || typeof resource.staff.overCapacity === 'boolean'));
            staff = Object.fromEntries(['active', 'pending', 'limit', 'available', 'overCapacity'].map(key => [key, resource.staff[key]]));
        }
        let subscription = null;
        if (resource.subscription !== null) {
            const item = resource.subscription;
            requireValue(resource.role === 'administrator' && item && (item.name === null || typeof item.name === 'string')
                && typeof item.status === 'string' && (item.currentPeriodEnd === null || timestamp(item.currentPeriodEnd)) && typeof item.cancelAtPeriodEnd === 'boolean');
            subscription = { name: item.name, status: item.status, currentPeriodEnd: item.currentPeriodEnd, cancelAtPeriodEnd: item.cancelAtPeriodEnd };
        }
        const riskZones = resource.riskZones === null ? null : resource.riskZones?.map(item => {
            requireValue(item && identifier(item.id) && typeof item.name === 'string' && count(item.incidentCount));
            return { id: item.id, name: item.name, riskLevel: ['low', 'medium', 'high'].includes(item.riskLevel) ? item.riskLevel : null, incidentCount: item.incidentCount };
        });
        requireValue(riskZones === null || Array.isArray(riskZones));
        const activity = resource.activity === null ? null : resource.activity?.map(item => {
            requireValue(item && identifier(item.id) && typeof item.kind === 'string' && typeof item.status === 'string' && typeof item.category === 'string'
                && (item.registeredAt === null || timestamp(item.registeredAt)));
            return { id: item.id, kind: item.kind, status: item.status, category: item.category, registeredAt: item.registeredAt };
        });
        requireValue(activity === null || Array.isArray(activity));
        requireValue(Array.isArray(resource.warnings) && resource.warnings.every(key => warningKeys.includes(key)));
        const daily = series(resource.daily), categories = series(resource.categories), statuses = series(resource.statuses), hourly = series(resource.hourly), riskCounts = series(resource.riskCounts);
        requireValue(daily === null || daily.every(item => /^\d{4}-\d{2}-\d{2}$/.test(item.key) && timestamp(item.key + 'T00:00:00Z')));
        requireValue(hourly === null || hourly.every(item => /^(0[0-9]|1[0-9]|2[0-3])$/.test(item.key)));
        requireValue(riskCounts === null || riskCounts.every(item => ['low', 'medium', 'high', 'unknown'].includes(item.key)));
        for (const rows of [daily, categories, statuses, hourly]) if (rows !== null && metrics.reports !== null) requireValue(rows.reduce((sum, item) => sum + item.value, 0) === metrics.reports);
        if (riskCounts !== null && metrics.nearbyIncidents !== null) requireValue(riskCounts.reduce((sum, item) => sum + item.value, 0) === metrics.nearbyIncidents);
        if (staff && [staff.active, staff.pending, staff.limit, staff.available].every(value => value !== null)) {
            requireValue(staff.available === Math.max(0, staff.limit - staff.active - staff.pending) && staff.overCapacity === (staff.active + staff.pending > staff.limit));
        }
        return new DashboardSummary({ role: resource.role, businessId: resource.businessId, userId: resource.userId, businessName: resource.businessName,
            period: { kind: period.kind, month: period.month ?? null, year: period.year ?? null, start: period.start, end: period.end, previousStart: period.previousStart, previousEnd: period.previousEnd, timeZone: period.timeZone },
            radiusMeters: resource.radiusMeters, refreshedAt: resource.refreshedAt, metrics, staff, subscription, daily,
            categories, statuses, hourly, riskCounts, riskZones, activity, warnings: [...new Set(resource.warnings)] });
    }
    static toMonthlyReport(resource) {
        requireValue(resource && identifier(resource.id));
        return new MonthlyReport({ id: resource.id, businessId: resource.businessId, month: resource.month, generatedAt: resource.generatedAt,
            generationSource: resource.generationSource, generatedByUserId: resource.generatedByUserId ?? null,
            schemaVersion: resource.schemaVersion, summary: this.toSummary(resource.summary) });
    }
    static toMonthlyReportList(resources) {
        requireValue(Array.isArray(resources));
        const periods = new Set(), ids = new Set();
        return resources.map(resource => {
            const report = this.toMonthlyReport(resource), key = report.businessId + ':' + report.month;
            requireValue(!periods.has(key) && !ids.has(String(report.id)));
            periods.add(key); ids.add(String(report.id));
            return report;
        }).sort((a, b) => b.month.localeCompare(a.month));
    }
}
