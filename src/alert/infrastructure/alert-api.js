import { BaseApi } from '../../shared/infrastructure/base-api.js';
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js';

const alertsEndpointPath = import.meta.env.VITE_ALERTS_ENDPOINT_PATH || 'alerts';
const alertPreferencesEndpointPath = import.meta.env.VITE_ALERT_PREFERENCES_ENDPOINT_PATH || 'alertPreferences';

/** HTTP adapter for the Alert bounded context. */
export class AlertApi extends BaseApi {
    #alertsEndpoint;
    #alertPreferencesEndpoint;

    constructor() {
        super();
        this.#alertsEndpoint = new BaseEndpoint(this, alertsEndpointPath);
        this.#alertPreferencesEndpoint = new BaseEndpoint(this, alertPreferencesEndpointPath);
    }

    getAlerts() {
        return this.#alertsEndpoint.getAll();
    }

    createAlert(resource) {
        return this.#alertsEndpoint.create(resource);
    }

    updateAlert(resource) {
        return this.#alertsEndpoint.update(resource.id, resource);
    }

    getAlertPreferences() {
        return this.#alertPreferencesEndpoint.getAll();
    }

    createAlertPreferences(resource) {
        return this.#alertPreferencesEndpoint.create(resource);
    }

    updateAlertPreferences(resource) {
        return this.#alertPreferencesEndpoint.update(resource.id, resource);
    }
}
