import { BaseApi } from '../../shared/infrastructure/base-api.js';
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js';

function coordinatesAvailable(value) {
    return Number.isFinite(value?.latitude) && Math.abs(value.latitude) <= 90
        && Number.isFinite(value?.longitude) && Math.abs(value.longitude) <= 180;
}

function distanceMeters(from, to) {
    const radians = degrees => degrees * Math.PI / 180;
    const deltaLatitude = radians(to.latitude - from.latitude);
    const deltaLongitude = radians(to.longitude - from.longitude);
    const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(radians(from.latitude))
        * Math.cos(radians(to.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}

/** JSON Server adapter. Mock delivery projection moves to server services with backend integration. */
export class NotificationsApi extends BaseApi {
    constructor() {
        super();
        this.notifications = new BaseEndpoint(this, import.meta.env.VITE_NOTIFICATIONS_ENDPOINT_PATH);
        this.preferences = new BaseEndpoint(this, import.meta.env.VITE_NOTIFICATION_PREFERENCES_ENDPOINT_PATH);
        this.businesses = new BaseEndpoint(this, import.meta.env.VITE_BUSINESSES_ENDPOINT_PATH);
        this.alerts = new BaseEndpoint(this, import.meta.env.VITE_ALERTS_ENDPOINT_PATH);
    }

    getNotifications(userId) {
        return this.http.get(this.notifications.endpointPath, { params: { recipientUserId: userId } });
    }
    getPreferences(userId) { return this.preferences.getById(encodeURIComponent(userId)); }
    updatePreferences(userId, changes) {
        return this.http.patch(`${this.preferences.endpointPath}/${encodeURIComponent(userId)}`, changes);
    }
    markAsRead(id, readAt) {
        return this.http.patch(`${this.notifications.endpointPath}/${encodeURIComponent(id)}`, { readAt });
    }
    async createNearbyNotification(resource) {
        try { return await this.notifications.create(resource); }
        catch (error) {
            // A deterministic ID prevents duplicate delivery across tabs sharing the mock.
            if (![409, 500].includes(error.response?.status)) throw error;
            return this.notifications.getById(encodeURIComponent(resource.id));
        }
    }

    /** Consumes only public resource DTOs; no entities or stores from other contexts. */
    async getDeliverySnapshot(businessId) {
        const [businessResponse, alertsResponse] = await Promise.all([
            this.businesses.getById(encodeURIComponent(businessId)).catch(error => {
                if (error.response?.status === 404) return { data: null };
                throw error;
            }),
            this.http.get(this.alerts.endpointPath, { params: { status: 'active' } }),
        ]);
        if (!Array.isArray(alertsResponse.data)) throw new Error('Invalid alert projection.');
        const business = businessResponse.data;
        const center = coordinatesAvailable(business) && String(business.id) === String(businessId)
            ? { businessId, name: typeof business.name === 'string' ? business.name : '', latitude: business.latitude, longitude: business.longitude }
            : null;
        const candidates = alertsResponse.data.filter(alert => alert.status === 'active' && alert.id != null)
            .map(alert => ({ id: alert.id, distanceMeters: center && coordinatesAvailable(alert) ? distanceMeters(center, alert) : null }));
        return { center, candidates };
    }
}
