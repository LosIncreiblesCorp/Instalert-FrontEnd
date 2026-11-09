import { NotificationPreferences } from '../domain/model/notification-preferences.entity.js';

export class NotificationPreferencesAssembler {
    static toDomain(resource) {
        if (!resource || typeof resource.userId !== 'string' || !resource.userId || typeof resource.businessId !== 'string' || !resource.businessId
            || typeof resource.nearbyAlertsEnabled !== 'boolean' || typeof resource.nearbyRadiusMeters !== 'number') {
            throw new Error('notifications.errors.invalidResponse');
        }
        const preferences = new NotificationPreferences(resource);
        if (!preferences.isValid) throw new Error('notifications.errors.invalidResponse');
        return preferences;
    }

    static toChanges(preferences) {
        return { nearbyAlertsEnabled: preferences.nearbyAlertsEnabled, nearbyRadiusMeters: preferences.nearbyRadiusMeters };
    }
}
