import { BaseApi } from '../../shared/infrastructure/base-api.js';

/** Personal profile and preferences for the selected demonstration account. */
export class ProfilesApi extends BaseApi {
    getProfile(userId) { return this.http.get(`profiles/${encodeURIComponent(userId)}`); }
    getPreferences(userId) { return this.http.get(`profiles/${encodeURIComponent(userId)}/preferences`); }
    updateProfile(userId, changes) { return this.http.put(`profiles/${encodeURIComponent(userId)}`, changes); }
    updatePreferences(userId, changes) { return this.http.put(`profiles/${encodeURIComponent(userId)}/preferences`, changes); }
}
