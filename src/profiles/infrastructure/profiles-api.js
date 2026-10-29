import { BaseApi } from '../../shared/infrastructure/base-api.js';
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js';

/** Mock resources use explicit IDs until IAM provides an authenticated current-user API. */
export class ProfilesApi extends BaseApi {
    constructor() {
        super();
        this.profilesEndpoint = new BaseEndpoint(this, import.meta.env.VITE_USER_PROFILES_ENDPOINT_PATH);
        this.preferencesEndpoint = new BaseEndpoint(this, import.meta.env.VITE_USER_PREFERENCES_ENDPOINT_PATH);
    }

    getProfile(userId) { return this.profilesEndpoint.getById(userId); }
    getPreferences(userId) { return this.preferencesEndpoint.getById(userId); }
    updateProfile(userId, changes) { return this.http.patch(`${this.profilesEndpoint.endpointPath}/${userId}`, changes); }
    updatePreferences(userId, changes) { return this.http.patch(`${this.preferencesEndpoint.endpointPath}/${userId}`, changes); }
}
