import { BaseApi } from '../../shared/infrastructure/base-api.js';
import { currentApiContext, requireBusinessId } from '../../shared/infrastructure/api-context.js';

/** Explicit Alert commands; status, identity and timestamps are assigned by the server. */
export class AlertApi extends BaseApi {
    async getAlerts() {
        const businessId = requireBusinessId();
        const data = [];
        for (let page = 1; ; page++) {
            const response = await this.http.get('alerts', { params: { businessId, page, pageSize: 100 } });
            if (!Array.isArray(response.data)) throw new Error('alerts.workflow.errors.invalidResponse');
            data.push(...response.data);
            if (response.data.length < 100) return { ...response, data };
        }
    }
    getAlert(id) { return this.http.get(`alerts/${encodeURIComponent(id)}`); }
    preparePanic(location) { return this.http.post('alerts/panic-preparations', { businessId: requireBusinessId(), ...location }); }
    confirmPanic(preparationToken, location) { return this.http.post('alerts/panic', { preparationToken, ...location }); }
    resolvePanic(id) { return this.http.post(`alerts/${encodeURIComponent(id)}/resolution`); }
    updateLocation(id, location) { return this.http.put(`alerts/${encodeURIComponent(id)}/location`, location); }
    savePanicDraft(id, details) { return this.http.put(`alerts/${encodeURIComponent(id)}/report-draft`, details); }
    completePanicReport(id) { return this.http.post(`alerts/${encodeURIComponent(id)}/report-completion`); }
    createReport(kind, details) { return this.http.post('alerts/reports', { businessId: requireBusinessId(), kind, ...details }); }
    getAlertPreferences() { return this.http.get(`alert-preferences/${encodeURIComponent(currentApiContext().userId)}`); }
    saveGracePeriod(panicGracePeriodSeconds) {
        return this.http.put(`alert-preferences/${encodeURIComponent(currentApiContext().userId)}`, { panicGracePeriodSeconds });
    }
}
