import { NotificationPreferences } from '../domain/model/notification-preferences.entity.js';

export class NotificationPreferencesAssembler {
    static toDomain(resource) {
        if (!resource || typeof resource.userId !== 'string' || typeof resource.businessId !== 'string'
            || typeof resource.nearbyAlertsEnabled !== 'boolean' || typeof resource.nearbyRadiusMeters !== 'number') {
            throw new Error('Invalid notification preferences resource.');
        }
        const preferences = new NotificationPreferences(resource);
        if (!preferences.isValid) throw new Error('Invalid notification preferences.');
        return preferences;
    }

    static toChanges(preferences) {
        return { nearbyAlertsEnabled: preferences.nearbyAlertsEnabled, nearbyRadiusMeters: preferences.nearbyRadiusMeters,
            updatedAt: new Date().toISOString() };
    }
}
