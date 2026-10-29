/** General application preferences; notification delivery preferences belong to Notifications. */
export class UserPreferences {
    constructor({ userId, locale = 'en_US', updatedAt = null } = {}) {
        this.userId = userId;
        this.locale = locale;
        this.updatedAt = updatedAt;
    }

    get isValid() { return ['en_US', 'es_419'].includes(this.locale); }
}
