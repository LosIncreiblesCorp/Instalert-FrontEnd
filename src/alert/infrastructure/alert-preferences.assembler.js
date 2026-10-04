import { AlertPreferences } from '../domain/model/alert-preferences.entity.js';

/** Maps Alert preference API resources to and from domain entities. */
export class AlertPreferencesAssembler {
    static toEntityFromResource(resource) {
        return new AlertPreferences({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Alert preferences API returned ${response.status} ${response.statusText}.`);
        }

        const resources = Array.isArray(response.data) ? response.data : response.data?.alertPreferences ?? [];
        return resources.map((resource) => this.toEntityFromResource(resource));
    }

    static toEntityFromResponse(response) {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Alert preferences API returned ${response.status} ${response.statusText}.`);
        }
        return this.toEntityFromResource(response.data);
    }

    static toResourceFromEntity(entity) {
        const resource = {
            employeeId: entity.employeeId,
            panicGracePeriodSeconds: entity.panicGracePeriodSeconds,
        };
        if (entity.id !== null && entity.id !== undefined) resource.id = entity.id;
        return resource;
    }
}
