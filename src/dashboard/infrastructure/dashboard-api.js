import { BaseApi } from '../../shared/infrastructure/base-api.js';

/** Dashboard owns these projections; the browser does not recompute source records. */
export class DashboardApi extends BaseApi {
    path(businessId) { return `businesses/${encodeURIComponent(businessId)}`; }
    getSummary(businessId, radiusMeters = 500) { return this.http.get(this.path(businessId) + '/dashboard', { params: { radiusMeters } }); }
    getReports(businessId) { return this.http.get(this.path(businessId) + '/reports'); }
    getReport(businessId, id) { return this.http.get(this.path(businessId) + '/reports/' + encodeURIComponent(id)); }
    generateReport(businessId, startDate, endDate) { return this.http.post(this.path(businessId) + '/reports', { startDate, endDate }); }
}
