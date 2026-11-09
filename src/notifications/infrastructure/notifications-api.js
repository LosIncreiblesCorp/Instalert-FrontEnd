import { BaseApi } from '../../shared/infrastructure/base-api.js';

/** The server determines recipients, distance and delivery time. */
export class NotificationsApi extends BaseApi {
    getNotifications(businessId, page = 1, pageSize = 100) {
        return this.http.get('notifications', { params: { businessId, page, pageSize } });
    }
    getPreferences(userId, businessId) {
        return this.http.get(`notification-preferences/${encodeURIComponent(userId)}`, { params: { businessId } });
    }
    updatePreferences(userId, businessId, changes) {
        return this.http.put(`notification-preferences/${encodeURIComponent(userId)}`, changes, { params: { businessId } });
    }
    markAsRead(id) { return this.http.post(`notifications/${encodeURIComponent(id)}/reading`); }
}
