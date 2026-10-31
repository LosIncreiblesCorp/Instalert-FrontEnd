import { UserPreferences } from '../domain/model/user-preferences.entity.js';

export class UserPreferencesAssembler {
    static toDomain(resource) {
        if (!resource || typeof resource.userId !== 'string') throw new Error('Invalid preferences resource.');
        const preferences = new UserPreferences(resource);
        if (!preferences.isValid) throw new Error('Unsupported application locale.');
        return preferences;
    }

    static toChanges(preferences) {
        return { locale: preferences.locale, updatedAt: new Date().toISOString() };
    }
}
