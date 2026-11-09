import { AlertPreferences } from '../domain/model/alert-preferences.entity.js';

/** Personal preferences are a single resource, not a collection. */
export class AlertPreferencesAssembler {
    static toEntityFromResponse(response) {
        const resource = response.data;
        if (!resource || typeof resource.userId !== 'string' || resource.userId !== resource.employeeId) {
            throw new Error('alerts.workflow.errors.invalidResponse');
        }
        return new AlertPreferences(resource);
    }
}
